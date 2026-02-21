import { adminDb } from '@/lib/firebase-admin';
import { ResolverOutput, MetricResult } from '@/types/assistant';

// ─── Period Helper ──────────────────────────────────────────

function getPeriodStartDate(period: string): Date | null {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    switch (period) {
        case 'today':
            return now;
        case 'last_7_days': {
            const d = new Date(now);
            d.setDate(d.getDate() - 7);
            return d;
        }
        case 'last_30_days': {
            const d = new Date(now);
            d.setDate(d.getDate() - 30);
            return d;
        }
        case 'last_90_days': {
            const d = new Date(now);
            d.setDate(d.getDate() - 90);
            return d;
        }
        case 'all_time':
            return null;
        default:
            return null;
    }
}

// ─── Firestore Session Fetcher ──────────────────────────────

interface SessionDoc {
    startedAt: FirebaseFirestore.Timestamp | string;
    endedAt: FirebaseFirestore.Timestamp | string;
    durationSeconds: number;
    breakDurationSeconds: number;
    taskId: string | null;
    userId: string;
}

interface ParsedSession {
    startedAt: Date;
    endedAt: Date;
    durationSeconds: number;
    breakDurationSeconds: number;
    taskId: string | null;
}

function parseTimestamp(val: FirebaseFirestore.Timestamp | string): Date {
    if (typeof val === 'string') return new Date(val);
    return val.toDate();
}

async function fetchSessions(userId: string, period: string): Promise<ParsedSession[]> {
    console.log('[Metrics] fetchSessions for user:', userId, 'period:', period);
    const periodStart = getPeriodStartDate(period);

    let q: FirebaseFirestore.Query = adminDb.collection('sessions').where('userId', '==', userId);

    if (periodStart) {
        // startedAt is stored as ISO string in Firestore, so compare with ISO string
        q = q.where('startedAt', '>=', periodStart.toISOString());
        console.log('[Metrics] Filtering from:', periodStart.toISOString());
    }

    q = q.orderBy('startedAt', 'desc');

    const snapshot = await q.get();
    console.log('[Metrics] Found', snapshot.docs.length, 'sessions');

    return snapshot.docs.map(doc => {
        const data = doc.data() as SessionDoc;
        return {
            startedAt: parseTimestamp(data.startedAt),
            endedAt: parseTimestamp(data.endedAt),
            durationSeconds: data.durationSeconds,
            breakDurationSeconds: data.breakDurationSeconds || 0,
            taskId: data.taskId || null,
        };
    });
}

// ─── Calculation Helpers ────────────────────────────────────

function getDurationMinutes(s: ParsedSession): number {
    return s.durationSeconds / 60;
}

function getDepthMultiplier(durationMinutes: number): number {
    if (durationMinutes < 25) return 0.5;
    if (durationMinutes <= 50) return 1;
    return 1.25;
}

function calcSessionDepthScore(s: ParsedSession): number {
    const mins = getDurationMinutes(s);
    return mins * getDepthMultiplier(mins);
}

function getDateString(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDayOfWeek(d: Date): string {
    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    return days[d.getDay()];
}

function medianOf(nums: number[]): number {
    if (nums.length === 0) return 0;
    const sorted = [...nums].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function modeOf(nums: number[]): number {
    if (nums.length === 0) return 0;
    const freq: Record<number, number> = {};
    nums.forEach(n => { freq[n] = (freq[n] || 0) + 1; });
    let maxFreq = 0, modeVal = nums[0];
    for (const [val, count] of Object.entries(freq)) {
        if (count > maxFreq) { maxFreq = count; modeVal = Number(val); }
    }
    return modeVal;
}

// ─── Metric Functions ───────────────────────────────────────

async function getTotalSessions(userId: string, period: string) {
    const sessions = await fetchSessions(userId, period);
    return {
        total: sessions.length,
        totalFocusMinutes: Math.round(sessions.reduce((sum, s) => sum + getDurationMinutes(s), 0)),
    };
}

async function getDailyDepthScores(userId: string, period: string) {
    const sessions = await fetchSessions(userId, period);
    const dailyScores: Record<string, number> = {};
    sessions.forEach(s => {
        const dateKey = getDateString(s.startedAt);
        dailyScores[dateKey] = (dailyScores[dateKey] || 0) + calcSessionDepthScore(s);
    });

    const entries = Object.entries(dailyScores)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, score]) => ({ date, depthScore: Math.round(score * 10) / 10 }));

    const avgScore = entries.length > 0
        ? Math.round((entries.reduce((sum, e) => sum + e.depthScore, 0) / entries.length) * 10) / 10
        : 0;

    return { dailyScores: entries.slice(-30), averageDailyScore: avgScore };
}

async function getWeeklyDepthScore(userId: string) {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - diffToMonday);

    const sessions = await fetchSessions(userId, 'last_7_days');
    const weekSessions = sessions.filter(s => s.startedAt >= monday);

    const totalScore = weekSessions.reduce((sum, s) => sum + calcSessionDepthScore(s), 0);
    const totalMinutes = weekSessions.reduce((sum, s) => sum + getDurationMinutes(s), 0);

    return {
        weeklyDepthScore: Math.round(totalScore * 10) / 10,
        weeklyFocusMinutes: Math.round(totalMinutes),
        sessionCount: weekSessions.length,
    };
}

async function getMonthlyDepthScore(userId: string) {
    const sessions = await fetchSessions(userId, 'last_30_days');
    const totalScore = sessions.reduce((sum, s) => sum + calcSessionDepthScore(s), 0);
    const totalMinutes = sessions.reduce((sum, s) => sum + getDurationMinutes(s), 0);

    return {
        monthlyDepthScore: Math.round(totalScore * 10) / 10,
        monthlyFocusMinutes: Math.round(totalMinutes),
        sessionCount: sessions.length,
    };
}

async function getSessionDurationDistribution(userId: string, period: string) {
    const sessions = await fetchSessions(userId, period);
    const buckets = {
        'under_15min': 0,
        '15_to_25min': 0,
        '25_to_45min': 0,
        '45_to_60min': 0,
        '60_to_90min': 0,
        'over_90min': 0,
    };

    sessions.forEach(s => {
        const mins = getDurationMinutes(s);
        if (mins < 15) buckets['under_15min']++;
        else if (mins < 25) buckets['15_to_25min']++;
        else if (mins < 45) buckets['25_to_45min']++;
        else if (mins < 60) buckets['45_to_60min']++;
        else if (mins < 90) buckets['60_to_90min']++;
        else buckets['over_90min']++;
    });

    return { distribution: buckets, totalSessions: sessions.length };
}

async function getPeakHours(userId: string, period: string) {
    const sessions = await fetchSessions(userId, period);
    const hourTotals: number[] = new Array(24).fill(0);
    const hourCounts: number[] = new Array(24).fill(0);

    sessions.forEach(s => {
        const hour = s.startedAt.getHours();
        hourTotals[hour] += getDurationMinutes(s);
        hourCounts[hour]++;
    });

    const hourData = hourTotals.map((totalMinutes, hour) => ({
        hour,
        totalMinutes: Math.round(totalMinutes),
        sessionCount: hourCounts[hour],
    })).filter(h => h.totalMinutes > 0);

    hourData.sort((a, b) => b.totalMinutes - a.totalMinutes);
    const peakHours = hourData.slice(0, 3);

    return { peakHours, allHours: hourData };
}

async function getCurrentStreak(userId: string) {
    const sessions = await fetchSessions(userId, 'last_90_days');
    if (sessions.length < 3) return { currentStreak: 0, recordStreak: 0 };

    const dailyScores: Record<string, number> = {};
    sessions.forEach(s => {
        const dateKey = getDateString(s.startedAt);
        dailyScores[dateKey] = (dailyScores[dateKey] || 0) + calcSessionDepthScore(s);
    });

    const recentDayScores = Object.values(dailyScores);
    const avgScore = recentDayScores.length > 0
        ? recentDayScores.reduce((a, b) => a + b, 0) / recentDayScores.length
        : 0;
    const threshold = avgScore * 0.5;

    // Current streak from today backwards
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 90; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = getDateString(d);
        const score = dailyScores[dateStr] || 0;
        if (score >= threshold && threshold > 0) currentStreak++;
        else break;
    }

    // Record streak
    let recordStreak = 0, tempStreak = 0;
    const allDates = Object.keys(dailyScores).sort();
    if (allDates.length > 0) {
        const first = new Date(allDates[0]);
        const last = new Date(allDates[allDates.length - 1]);
        const iter = new Date(first);
        while (iter <= last) {
            const ds = getDateString(iter);
            const score = dailyScores[ds] || 0;
            if (score >= threshold && threshold > 0) {
                tempStreak++;
                recordStreak = Math.max(recordStreak, tempStreak);
            } else {
                tempStreak = 0;
            }
            iter.setDate(iter.getDate() + 1);
        }
    }

    return { currentStreak, recordStreak };
}

async function getResistancePoint(userId: string, period: string) {
    const sessions = await fetchSessions(userId, period);
    if (sessions.length < 10) return { resistanceMinute: 0, hasEnoughData: false };

    const durations = sessions.map(s => Math.round(getDurationMinutes(s)));
    const modeVal = modeOf(durations);
    const medianVal = medianOf(durations);
    const diff = Math.abs(modeVal - medianVal) / Math.max(medianVal, 1);
    const resistanceMinute = diff > 0.2 ? Math.round(medianVal) : modeVal;

    return { resistanceMinute, hasEnoughData: true, totalSessionsAnalyzed: sessions.length };
}

async function getFocusDensityRatio(userId: string, period: string) {
    const sessions = await fetchSessions(userId, period);
    const todayStr = getDateString(new Date());
    const todaySessions = sessions.filter(s => getDateString(s.startedAt) === todayStr);

    if (todaySessions.length === 0) return { percentage: 0, label: 'no_data' };
    if (todaySessions.length === 1) return { percentage: 100, label: 'sharp' };

    const sorted = [...todaySessions].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
    const GAP_THRESHOLD_MS = 30 * 60 * 1000;
    const blocks: ParsedSession[][] = [[sorted[0]]];

    for (let i = 1; i < sorted.length; i++) {
        const prevEnd = sorted[i - 1].endedAt.getTime();
        const currStart = sorted[i].startedAt.getTime();
        if (currStart - prevEnd > GAP_THRESHOLD_MS) {
            blocks.push([sorted[i]]);
        } else {
            blocks[blocks.length - 1].push(sorted[i]);
        }
    }

    let totalWeightedDensity = 0;
    let totalFocusMinutes = 0;

    for (const block of blocks) {
        const blockFocus = block.reduce((sum, s) => sum + getDurationMinutes(s), 0);
        totalFocusMinutes += blockFocus;

        if (block.length === 1) {
            totalWeightedDensity += blockFocus * 100;
        } else {
            const blockStart = block[0].startedAt.getTime();
            const blockEnd = block[block.length - 1].endedAt.getTime();
            const blockSpan = (blockEnd - blockStart) / 60000;
            const blockDensity = blockSpan > 0 ? Math.min(100, (blockFocus / blockSpan) * 100) : 100;
            totalWeightedDensity += blockFocus * blockDensity;
        }
    }

    const percentage = totalFocusMinutes > 0 ? Math.round(totalWeightedDensity / totalFocusMinutes) : 0;
    let label: string;
    if (percentage >= 80) label = 'sharp';
    else if (percentage >= 60) label = 'good';
    else if (percentage >= 40) label = 'scattered_start';
    else label = 'scattered_mind';

    return { percentage, label };
}

async function getEarnedFreedomBalance(userId: string) {
    const sessions = await fetchSessions(userId, 'today');
    const earnedMinutes = sessions.reduce((sum, s) => sum + getDurationMinutes(s) / 5, 0);
    const usedMinutes = sessions.reduce((sum, s) => sum + s.breakDurationSeconds / 60, 0);

    const weekSessions = await fetchSessions(userId, 'last_7_days');
    const weekEarned = weekSessions.reduce((sum, s) => sum + getDurationMinutes(s) / 5, 0);
    const weekUsed = weekSessions.reduce((sum, s) => sum + s.breakDurationSeconds / 60, 0);

    return {
        todayEarnedMinutes: Math.round(earnedMinutes),
        todayUsedMinutes: Math.round(usedMinutes),
        todayBalance: Math.round(earnedMinutes - usedMinutes),
        weekEarnedMinutes: Math.round(weekEarned),
        weekUsedMinutes: Math.round(weekUsed),
    };
}

async function getDepthScoreByWeekday(userId: string, period: string) {
    const sessions = await fetchSessions(userId, period);
    const weekdayScores: Record<string, { totalScore: number; count: number }> = {};

    sessions.forEach(s => {
        const day = getDayOfWeek(s.startedAt);
        if (!weekdayScores[day]) weekdayScores[day] = { totalScore: 0, count: 0 };
        weekdayScores[day].totalScore += calcSessionDepthScore(s);
        weekdayScores[day].count++;
    });

    const result = Object.entries(weekdayScores).map(([day, data]) => ({
        day,
        averageDepthScore: Math.round((data.totalScore / data.count) * 10) / 10,
        totalDepthScore: Math.round(data.totalScore * 10) / 10,
        sessionCount: data.count,
    }));

    return result;
}

async function getSessionTimesByWeekday(userId: string, period: string) {
    const sessions = await fetchSessions(userId, period);
    const weekdayMinutes: Record<string, number> = {};

    sessions.forEach(s => {
        const day = getDayOfWeek(s.startedAt);
        weekdayMinutes[day] = (weekdayMinutes[day] || 0) + getDurationMinutes(s);
    });

    return Object.entries(weekdayMinutes).map(([day, totalMinutes]) => ({
        day,
        totalMinutes: Math.round(totalMinutes),
    }));
}

async function getAverageSessionDuration(userId: string, period: string) {
    const sessions = await fetchSessions(userId, period);
    if (sessions.length === 0) return { averageMinutes: 0, sessionCount: 0 };

    const totalMinutes = sessions.reduce((sum, s) => sum + getDurationMinutes(s), 0);
    return {
        averageMinutes: Math.round((totalMinutes / sessions.length) * 10) / 10,
        sessionCount: sessions.length,
    };
}

async function getLongestSession(userId: string, period: string) {
    const sessions = await fetchSessions(userId, period);
    if (sessions.length === 0) return { longestMinutes: 0, date: null };

    let longest = sessions[0];
    sessions.forEach(s => {
        if (s.durationSeconds > longest.durationSeconds) longest = s;
    });

    return {
        longestMinutes: Math.round(getDurationMinutes(longest)),
        date: getDateString(longest.startedAt),
    };
}

async function getWarmupDuration(userId: string, period: string) {
    const sessions = await fetchSessions(userId, period);
    const successfulSessions = sessions.filter(s => getDurationMinutes(s) >= 20);

    if (successfulSessions.length < 10) return { avgWarmupMinutes: 0, hasEnoughData: false };

    const durations = successfulSessions.map(s => getDurationMinutes(s));
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;

    return {
        avgWarmupMinutes: Math.round(avg * 0.22 * 10) / 10,
        hasEnoughData: true,
        sessionsAnalyzed: successfulSessions.length,
    };
}

async function getTaskFlowHarmony(userId: string, period: string) {
    const sessions = await fetchSessions(userId, period);
    const taggedSessions = sessions.filter(s => s.taskId);

    if (taggedSessions.length < 5) return { items: [], hasEnoughData: false };

    // Fetch tasks for titles
    const taskIds = [...new Set(taggedSessions.map(s => s.taskId!))];
    const taskTitles: Record<string, string> = {};

    // Fetch task titles in batches of 10 (Firestore 'in' query limit)
    for (let i = 0; i < taskIds.length; i += 10) {
        const batch = taskIds.slice(i, i + 10);
        const taskSnap = await adminDb.collection('tasks')
            .where('__name__', 'in', batch)
            .get();
        taskSnap.docs.forEach(doc => {
            taskTitles[doc.id] = (doc.data().title as string) || 'Unknown';
        });
    }

    const taskAggregates: Record<string, { title: string; totalDepth: number; count: number }> = {};
    taggedSessions.forEach(s => {
        if (!s.taskId) return;
        const title = taskTitles[s.taskId] || 'Unknown';
        if (!taskAggregates[s.taskId]) {
            taskAggregates[s.taskId] = { title, totalDepth: 0, count: 0 };
        }
        taskAggregates[s.taskId].totalDepth += calcSessionDepthScore(s);
        taskAggregates[s.taskId].count++;
    });

    const items = Object.values(taskAggregates)
        .map(agg => ({
            taskTitle: agg.title,
            depthScore: Math.round(agg.totalDepth * 10) / 10,
            sessionCount: agg.count,
        }))
        .sort((a, b) => b.depthScore - a.depthScore)
        .slice(0, 10);

    return { items, hasEnoughData: true };
}

// ─── Metric Router ──────────────────────────────────────────

type MetricFunction = (userId: string, period: string) => Promise<unknown>;

const metricFunctions: Record<string, MetricFunction> = {
    total_sessions: getTotalSessions,
    daily_depth_score: getDailyDepthScores,
    weekly_depth_score: (userId) => getWeeklyDepthScore(userId),
    monthly_depth_score: (userId) => getMonthlyDepthScore(userId),
    session_duration_distribution: getSessionDurationDistribution,
    peak_hours: getPeakHours,
    flow_streak: (userId) => getCurrentStreak(userId),
    resistance_point: getResistancePoint,
    focus_density_ratio: getFocusDensityRatio,
    earned_freedom_balance: (userId) => getEarnedFreedomBalance(userId),
    depth_score_by_weekday: getDepthScoreByWeekday,
    session_times_by_weekday: getSessionTimesByWeekday,
    average_session_duration: getAverageSessionDuration,
    longest_session: getLongestSession,
    warmup_duration: getWarmupDuration,
    task_flow_harmony: getTaskFlowHarmony,
};

export async function fetchMetrics(resolverOutput: ResolverOutput, userId: string): Promise<MetricResult> {
    const results = await Promise.all(
        resolverOutput.metrics.map(metric =>
            metricFunctions[metric]?.(userId, resolverOutput.period)
        )
    );

    return Object.fromEntries(
        resolverOutput.metrics.map((metric, i) => [metric, results[i]])
    );
}

// Export getWeeklyDepthScore for the welcome message
export { getWeeklyDepthScore };
