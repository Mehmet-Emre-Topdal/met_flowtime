import { adminDb } from '@/lib/firebase-admin';

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
    taskTitle: string | null;
    userId: string;
}

interface ParsedSession {
    startedAt: Date;
    endedAt: Date;
    durationSeconds: number;
    breakDurationSeconds: number;
    taskId: string | null;
    taskTitle: string | null;
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
            taskTitle: data.taskTitle || null,
        };
    });
}

// ─── Calculation Helpers ────────────────────────────────────

function getDurationMinutes(s: ParsedSession): number {
    return s.durationSeconds / 60;
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
        dailyScores[dateKey] = (dailyScores[dateKey] || 0) + getDurationMinutes(s);
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

    const taskAggregates: Record<string, { title: string; totalMinutes: number; count: number }> = {};
    taggedSessions.forEach(s => {
        if (!s.taskId) return;
        const title = taskTitles[s.taskId] || 'Unknown';
        if (!taskAggregates[s.taskId]) {
            taskAggregates[s.taskId] = { title, totalMinutes: 0, count: 0 };
        }
        taskAggregates[s.taskId].totalMinutes += getDurationMinutes(s);
        taskAggregates[s.taskId].count++;
    });

    const items = Object.values(taskAggregates)
        .map(agg => ({
            taskTitle: agg.title,
            totalFocusMinutes: Math.round(agg.totalMinutes),
            sessionCount: agg.count,
        }))
        .sort((a, b) => b.totalFocusMinutes - a.totalFocusMinutes)
        .slice(0, 10);

    return { items, hasEnoughData: true };
}

// ─── Date-Range Session Fetcher ─────────────────────────────

async function fetchSessionsByRange(userId: string, startDate: string, endDate: string): Promise<ParsedSession[]> {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const snapshot = await adminDb.collection('sessions')
        .where('userId', '==', userId)
        .where('startedAt', '>=', start.toISOString())
        .where('startedAt', '<=', end.toISOString())
        .orderBy('startedAt', 'desc')
        .get();

    return snapshot.docs.map(doc => {
        const data = doc.data() as SessionDoc;
        return {
            startedAt: parseTimestamp(data.startedAt),
            endedAt: parseTimestamp(data.endedAt),
            durationSeconds: data.durationSeconds,
            breakDurationSeconds: data.breakDurationSeconds || 0,
            taskId: data.taskId || null,
            taskTitle: data.taskTitle || null,
        };
    });
}

// ─── Tool Functions ─────────────────────────────────────────

export async function toolGetSessionsSummary(userId: string, startDate: string, endDate: string) {
    const sessions = await fetchSessionsByRange(userId, startDate, endDate);
    const totalFocusMinutes = Math.round(sessions.reduce((sum, s) => sum + getDurationMinutes(s), 0));
    const averageMinutes = sessions.length > 0
        ? Math.round((totalFocusMinutes / sessions.length) * 10) / 10
        : 0;

    const buckets = { under_15min: 0, '15_to_25min': 0, '25_to_45min': 0, '45_to_60min': 0, '60_to_90min': 0, over_90min: 0 };
    sessions.forEach(s => {
        const mins = getDurationMinutes(s);
        if (mins < 15) buckets.under_15min++;
        else if (mins < 25) buckets['15_to_25min']++;
        else if (mins < 45) buckets['25_to_45min']++;
        else if (mins < 60) buckets['45_to_60min']++;
        else if (mins < 90) buckets['60_to_90min']++;
        else buckets.over_90min++;
    });

    return { sessionCount: sessions.length, totalFocusMinutes, averageSessionMinutes: averageMinutes, distribution: buckets };
}

export async function toolGetTopTasks(userId: string, startDate: string, endDate: string, limit: number = 3, order: 'asc' | 'desc' = 'desc') {
    const sessions = await fetchSessionsByRange(userId, startDate, endDate);
    const taggedSessions = sessions.filter(s => s.taskId);

    if (taggedSessions.length === 0) return { items: [], hasEnoughData: false };

    const taskTitles: Record<string, string> = {};
    taggedSessions.forEach(s => {
        if (s.taskId && s.taskTitle) taskTitles[s.taskId] = s.taskTitle;
    });

    const missingIds = [...new Set(taggedSessions.map(s => s.taskId!))].filter(id => !taskTitles[id]);
    for (let i = 0; i < missingIds.length; i += 10) {
        const batch = missingIds.slice(i, i + 10);
        const taskSnap = await adminDb.collection('tasks').where('__name__', 'in', batch).get();
        taskSnap.docs.forEach(doc => {
            taskTitles[doc.id] = (doc.data().title as string) || 'Unknown';
        });
    }

    const aggregates: Record<string, { title: string; totalMinutes: number; count: number }> = {};
    taggedSessions.forEach(s => {
        if (!s.taskId) return;
        const title = taskTitles[s.taskId] || 'Unknown';
        if (!aggregates[s.taskId]) aggregates[s.taskId] = { title, totalMinutes: 0, count: 0 };
        aggregates[s.taskId].totalMinutes += getDurationMinutes(s);
        aggregates[s.taskId].count++;
    });

    const items = Object.values(aggregates)
        .map(a => ({
            taskTitle: a.title,
            totalFocusMinutes: Math.round(a.totalMinutes),
            sessionCount: a.count,
            averageSessionMinutes: Math.round((a.totalMinutes / a.count) * 10) / 10,
        }))
        .sort((a, b) => order === 'asc'
            ? a.totalFocusMinutes - b.totalFocusMinutes
            : b.totalFocusMinutes - a.totalFocusMinutes)
        .slice(0, limit);

    return { items, hasEnoughData: true };
}

export async function toolGetHourlyDistribution(userId: string, startDate: string, endDate: string) {
    const sessions = await fetchSessionsByRange(userId, startDate, endDate);
    const hourTotals: number[] = new Array(24).fill(0);
    const hourCounts: number[] = new Array(24).fill(0);

    sessions.forEach(s => {
        const hour = s.startedAt.getHours();
        hourTotals[hour] += getDurationMinutes(s);
        hourCounts[hour]++;
    });

    const hourData = hourTotals
        .map((totalMinutes, hour) => ({ hour, totalMinutes: Math.round(totalMinutes), sessionCount: hourCounts[hour] }))
        .filter(h => h.totalMinutes > 0)
        .sort((a, b) => b.totalMinutes - a.totalMinutes);

    return { peakHours: hourData.slice(0, 3), allHours: hourData };
}

export async function toolComparePeriods(
    userId: string,
    period1Start: string, period1End: string,
    period2Start: string, period2End: string,
) {
    const [p1, p2] = await Promise.all([
        fetchSessionsByRange(userId, period1Start, period1End),
        fetchSessionsByRange(userId, period2Start, period2End),
    ]);

    const summarize = (sessions: ParsedSession[]) => ({
        sessionCount: sessions.length,
        totalFocusMinutes: Math.round(sessions.reduce((sum, s) => sum + getDurationMinutes(s), 0)),
        averageSessionMinutes: sessions.length > 0
            ? Math.round(sessions.reduce((sum, s) => sum + getDurationMinutes(s), 0) / sessions.length * 10) / 10
            : 0,
    });

    return {
        period1: { startDate: period1Start, endDate: period1End, ...summarize(p1) },
        period2: { startDate: period2Start, endDate: period2End, ...summarize(p2) },
    };
}

export async function toolGetResistancePoint(userId: string, startDate: string, endDate: string) {
    const sessions = await fetchSessionsByRange(userId, startDate, endDate);
    if (sessions.length < 10) return { resistanceMinute: 0, hasEnoughData: false };

    const durations = sessions.map(s => Math.round(getDurationMinutes(s)));
    const modeVal = modeOf(durations);
    const medianVal = medianOf(durations);
    const diff = Math.abs(modeVal - medianVal) / Math.max(medianVal, 1);
    const resistanceMinute = diff > 0.2 ? Math.round(medianVal) : modeVal;

    return { resistanceMinute, hasEnoughData: true, totalSessionsAnalyzed: sessions.length };
}

export async function toolGetLongestSession(userId: string, startDate: string, endDate: string) {
    const sessions = await fetchSessionsByRange(userId, startDate, endDate);
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

export async function toolGetWarmupDuration(userId: string, startDate: string, endDate: string) {
    const sessions = await fetchSessionsByRange(userId, startDate, endDate);
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

export async function toolGetStreak(userId: string) {
    return getCurrentStreak(userId);
}

export async function toolGetTaskFocusByName(userId: string, taskName: string, startDate: string, endDate: string) {
    const sessions = await fetchSessionsByRange(userId, startDate, endDate);
    const normalizedSearch = taskName.toLowerCase().trim();

    const sessionsByTitle = sessions.filter(s =>
        s.taskTitle && s.taskTitle.toLowerCase().includes(normalizedSearch)
    );

    const sessionsWithoutTitle = sessions.filter(s => s.taskId && !s.taskTitle);
    let fallbackSessions: ParsedSession[] = [];

    if (sessionsWithoutTitle.length > 0) {
        const taskIds = [...new Set(sessionsWithoutTitle.map(s => s.taskId!))];
        const matchingTaskIds = new Set<string>();

        for (let i = 0; i < taskIds.length; i += 10) {
            const batch = taskIds.slice(i, i + 10);
            const snap = await adminDb.collection('tasks').where('__name__', 'in', batch).get();
            snap.docs.forEach(doc => {
                const title = (doc.data().title as string) || '';
                if (title.toLowerCase().includes(normalizedSearch)) matchingTaskIds.add(doc.id);
            });
        }

        fallbackSessions = sessionsWithoutTitle.filter(s => s.taskId && matchingTaskIds.has(s.taskId));
    }

    const matchingSessions = [...sessionsByTitle, ...fallbackSessions];
    if (matchingSessions.length === 0) return { found: false, tasks: [], totalFocusMinutes: 0 };

    const aggregates: Record<string, { totalMinutes: number; count: number }> = {};
    matchingSessions.forEach(s => {
        const title = s.taskTitle || taskName;
        if (!aggregates[title]) aggregates[title] = { totalMinutes: 0, count: 0 };
        aggregates[title].totalMinutes += getDurationMinutes(s);
        aggregates[title].count++;
    });

    const tasks = Object.entries(aggregates).map(([title, data]) => ({
        taskTitle: title,
        totalFocusMinutes: Math.round(data.totalMinutes),
        sessionCount: data.count,
    }));

    return {
        found: true,
        tasks,
        totalFocusMinutes: Math.round(matchingSessions.reduce((sum, s) => sum + getDurationMinutes(s), 0)),
    };
}

export async function toolGetCompletedTasks(userId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    interface TaskDoc {
        title: string;
        totalFocusedTime: number;
        completedAt: string | null;
        updatedAt: FirebaseFirestore.Timestamp | string;
    }

    const snapshot = await adminDb.collection('tasks')
        .where('userId', '==', userId)
        .where('status', '==', 'done')
        .get();

    const tasks = snapshot.docs
        .map(doc => {
            const data = doc.data() as TaskDoc;
            const completedAt = data.completedAt
                ? new Date(data.completedAt)
                : parseTimestamp(data.updatedAt);
            return { title: data.title, totalFocusedMinutes: data.totalFocusedTime, completedAt };
        })
        .filter(t => t.completedAt >= start && t.completedAt <= end)
        .map(({ title, totalFocusedMinutes }) => ({ title, totalFocusedMinutes }));

    return { tasks, count: tasks.length };
}

export async function toolGetWeekdayStats(userId: string, startDate: string, endDate: string) {
    const sessions = await fetchSessionsByRange(userId, startDate, endDate);
    const weekdayMinutes: Record<string, number> = {};
    const weekdayCounts: Record<string, number> = {};

    sessions.forEach(s => {
        const day = getDayOfWeek(s.startedAt);
        weekdayMinutes[day] = (weekdayMinutes[day] || 0) + getDurationMinutes(s);
        weekdayCounts[day] = (weekdayCounts[day] || 0) + 1;
    });

    return Object.entries(weekdayMinutes).map(([day, totalMinutes]) => ({
        day,
        totalMinutes: Math.round(totalMinutes),
        sessionCount: weekdayCounts[day],
    }));
}

