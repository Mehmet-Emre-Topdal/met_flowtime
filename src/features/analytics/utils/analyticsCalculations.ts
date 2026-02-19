import { FlowSession } from '@/types/session';
import { TaskDto } from '@/types/task';
import {
    DailyFlowWavesResult,
    DepthScoreResult,
    FocusDensityResult,
    FocusDensityLabel,
    ResistancePointResult,
    EarnedFreedomResult,
    NaturalFlowWindowResult,
    FlowWindowBucket,
    FlowStreakResult,
    TaskFlowHarmonyResult,
    WarmupPhaseResult,
    HourlySlot,
    FlowZoneLabel,
} from '@/types/analytics';

// ─── Helpers ────────────────────────────────────────────────

const getDateString = (iso: string): string => iso.slice(0, 10);
const getHour = (iso: string): number => new Date(iso).getHours();
const getDurationMinutes = (s: FlowSession): number => s.durationSeconds / 60;

const daysAgo = (days: number): Date => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - days);
    return d;
};

const todayStr = (): string => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const getDepthMultiplier = (durationMinutes: number): number => {
    if (durationMinutes < 25) return 0.5;
    if (durationMinutes <= 50) return 1;
    return 1.25;
};

const calcSessionDepthScore = (s: FlowSession): number => {
    const mins = getDurationMinutes(s);
    return mins * getDepthMultiplier(mins);
};

const median = (nums: number[]): number => {
    if (nums.length === 0) return 0;
    const sorted = [...nums].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const mode = (nums: number[]): number => {
    if (nums.length === 0) return 0;
    const freq: Record<number, number> = {};
    nums.forEach(n => { freq[n] = (freq[n] || 0) + 1; });
    let maxFreq = 0, modeVal = nums[0];
    for (const [val, count] of Object.entries(freq)) {
        if (count > maxFreq) { maxFreq = count; modeVal = Number(val); }
    }
    return modeVal;
};

// ─── 1. Daily Flow Waves ────────────────────────────────────

export function calcDailyFlowWaves(sessions: FlowSession[]): DailyFlowWavesResult {
    const twoWeeksAgo = daysAgo(14);
    const recent = sessions.filter(s => new Date(s.startedAt) >= twoWeeksAgo);

    if (recent.length < 5) {
        return { slots: [], peakHour: null, troughHour: null, hasEnoughData: false };
    }

    const hourTotals: number[] = new Array(24).fill(0);
    recent.forEach(s => {
        const hour = getHour(s.startedAt);
        hourTotals[hour] += getDurationMinutes(s);
    });

    const nonZeroHours = hourTotals.filter(v => v > 0);
    const avg = nonZeroHours.length > 0 ? nonZeroHours.reduce((a, b) => a + b, 0) / nonZeroHours.length : 0;

    const slots: HourlySlot[] = hourTotals.map((totalMinutes, hour) => {
        let label: FlowZoneLabel = 'normal';
        if (avg > 0) {
            if (totalMinutes > avg * 1.3) label = 'peak';
            else if (totalMinutes < avg * 0.7 && totalMinutes > 0) label = 'trough';
            else if (totalMinutes === 0) label = 'trough';
        }
        return { hour, totalMinutes: Math.round(totalMinutes * 10) / 10, label };
    });

    let peakHour: number | null = null;
    let troughHour: number | null = null;
    let maxMin = 0, minMin = Infinity;

    slots.forEach(s => {
        if (s.totalMinutes > maxMin) { maxMin = s.totalMinutes; peakHour = s.hour; }
        if (s.totalMinutes > 0 && s.totalMinutes < minMin) { minMin = s.totalMinutes; troughHour = s.hour; }
    });

    return { slots, peakHour, troughHour, hasEnoughData: true };
}

// ─── 2. Depth Score ─────────────────────────────────────────

export function calcDepthScore(sessions: FlowSession[]): DepthScoreResult {
    const today = todayStr();
    const todaySessions = sessions.filter(s => getDateString(s.startedAt) === today);

    if (todaySessions.length === 0) {
        return { todayScore: 0, lastWeekAvg: 0, percentChange: 0, hasEnoughData: false };
    }

    const todayScore = todaySessions.reduce((sum, s) => sum + calcSessionDepthScore(s), 0);

    // Last week same day average
    const now = new Date();
    const dayOfWeek = now.getDay();
    const lastWeekSameDays = sessions.filter(s => {
        const d = new Date(s.startedAt);
        return d.getDay() === dayOfWeek && getDateString(s.startedAt) !== today;
    });

    const dayGroups: Record<string, number> = {};
    lastWeekSameDays.forEach(s => {
        const dateKey = getDateString(s.startedAt);
        dayGroups[dateKey] = (dayGroups[dateKey] || 0) + calcSessionDepthScore(s);
    });

    const dayScores = Object.values(dayGroups);
    const lastWeekAvg = dayScores.length > 0 ? dayScores.reduce((a, b) => a + b, 0) / dayScores.length : 0;
    const percentChange = lastWeekAvg > 0 ? ((todayScore - lastWeekAvg) / lastWeekAvg) * 100 : 0;

    return {
        todayScore: Math.round(todayScore),
        lastWeekAvg: Math.round(lastWeekAvg),
        percentChange: Math.round(percentChange),
        hasEnoughData: true,
    };
}

// ─── 3. Focus Density ───────────────────────────────────────

export function calcFocusDensity(sessions: FlowSession[]): FocusDensityResult {
    const today = todayStr();
    const todaySessions = sessions.filter(s => getDateString(s.startedAt) === today);

    if (todaySessions.length < 2) {
        const totalFocusMin = todaySessions.reduce((sum, s) => sum + getDurationMinutes(s), 0);
        return {
            percentage: todaySessions.length === 1 ? 100 : 0,
            label: todaySessions.length === 1 ? 'sharp' : 'scattered_mind',
            hasEnoughData: todaySessions.length > 0,
        };
    }

    // Calculate from first session start to last session end
    const sorted = [...todaySessions].sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
    const firstStart = new Date(sorted[0].startedAt).getTime();
    const lastEnd = new Date(sorted[sorted.length - 1].endedAt).getTime();
    const totalSpanMinutes = (lastEnd - firstStart) / 60000;

    if (totalSpanMinutes <= 0) {
        return { percentage: 100, label: 'sharp', hasEnoughData: true };
    }

    const totalFocusMinutes = todaySessions.reduce((sum, s) => sum + getDurationMinutes(s), 0);
    const percentage = Math.min(100, Math.round((totalFocusMinutes / totalSpanMinutes) * 100));

    let label: FocusDensityLabel;
    if (percentage >= 80) label = 'sharp';
    else if (percentage >= 60) label = 'good';
    else if (percentage >= 40) label = 'scattered_start';
    else label = 'scattered_mind';

    return { percentage, label, hasEnoughData: true };
}

// ─── 4. Resistance Point ────────────────────────────────────

export function calcResistancePoint(sessions: FlowSession[]): ResistancePointResult {
    if (sessions.length < 10) {
        return { resistanceMinute: 0, last7DaysSessions: [], hasEnoughData: false };
    }

    const durations = sessions.map(s => Math.round(getDurationMinutes(s)));
    const modeVal = mode(durations);
    const medianVal = median(durations);

    // Use median if mode and median differ by >20%
    const diff = Math.abs(modeVal - medianVal) / Math.max(medianVal, 1);
    const resistanceMinute = diff > 0.2 ? Math.round(medianVal) : modeVal;

    // Last 7 days session summaries
    const sevenDaysAgo = daysAgo(7);
    const recentSessions = sessions
        .filter(s => new Date(s.startedAt) >= sevenDaysAgo)
        .map(s => ({
            date: getDateString(s.startedAt),
            durationMinutes: Math.round(getDurationMinutes(s)),
        }));

    return { resistanceMinute, last7DaysSessions: recentSessions, hasEnoughData: true };
}

// ─── 5. Earned Freedom ──────────────────────────────────────

export function calcEarnedFreedom(sessions: FlowSession[]): EarnedFreedomResult {
    const today = todayStr();
    const todaySessions = sessions.filter(s => getDateString(s.startedAt) === today);

    const earnedMinutes = todaySessions.reduce((sum, s) => sum + getDurationMinutes(s) / 5, 0);
    const usedMinutes = todaySessions.reduce((sum, s) => sum + s.breakDurationSeconds / 60, 0);

    // Week totals
    const weekStart = daysAgo(7);
    const weekSessions = sessions.filter(s => new Date(s.startedAt) >= weekStart);
    const weekEarned = weekSessions.reduce((sum, s) => sum + getDurationMinutes(s) / 5, 0);
    const weekUsed = weekSessions.reduce((sum, s) => sum + s.breakDurationSeconds / 60, 0);

    return {
        earnedMinutes: Math.round(earnedMinutes),
        usedMinutes: Math.round(usedMinutes),
        balanceMinutes: Math.round(earnedMinutes - usedMinutes),
        weekEarned: Math.round(weekEarned),
        weekUsed: Math.round(weekUsed),
        hasEnoughData: todaySessions.length > 0,
    };
}

// ─── 6. Natural Flow Window ─────────────────────────────────

export function calcNaturalFlowWindow(sessions: FlowSession[]): NaturalFlowWindowResult {
    if (sessions.length < 20) {
        return { buckets: [], dominantWindowStart: 0, dominantWindowEnd: 0, median: 0, hasEnoughData: false };
    }

    const durations = sessions.map(s => getDurationMinutes(s));
    const maxDuration = Math.max(...durations);
    const bucketSize = 5;
    const bucketCount = Math.ceil(maxDuration / bucketSize) + 1;

    const buckets: FlowWindowBucket[] = [];
    for (let i = 0; i < bucketCount && i < 30; i++) {
        const rangeStart = i * bucketSize;
        const rangeEnd = (i + 1) * bucketSize;
        const count = durations.filter(d => d >= rangeStart && d < rangeEnd).length;
        buckets.push({ rangeStart, rangeEnd, count, isDominant: false });
    }

    // Find dominant window: best consecutive 2-3 buckets
    let bestStart = 0, bestSum = 0, bestLen = 2;
    for (let len = 2; len <= 3; len++) {
        for (let i = 0; i <= buckets.length - len; i++) {
            const sum = buckets.slice(i, i + len).reduce((a, b) => a + b.count, 0);
            if (sum > bestSum) { bestSum = sum; bestStart = i; bestLen = len; }
        }
    }

    for (let i = bestStart; i < bestStart + bestLen && i < buckets.length; i++) {
        buckets[i].isDominant = true;
    }

    const dominantWindowStart = bestStart * bucketSize;
    const dominantWindowEnd = (bestStart + bestLen) * bucketSize;
    const med = median(durations);

    return {
        buckets: buckets.filter(b => b.count > 0 || b.isDominant),
        dominantWindowStart,
        dominantWindowEnd,
        median: Math.round(med),
        hasEnoughData: true,
    };
}

// ─── 7. Flow Streak ─────────────────────────────────────────

export function calcFlowStreak(sessions: FlowSession[]): FlowStreakResult {
    if (sessions.length < 3) {
        return { currentStreak: 0, recordStreak: 0, last30Days: [], hasEnoughData: false };
    }

    // Calculate daily depth scores
    const dailyScores: Record<string, number> = {};
    sessions.forEach(s => {
        const dateKey = getDateString(s.startedAt);
        dailyScores[dateKey] = (dailyScores[dateKey] || 0) + calcSessionDepthScore(s);
    });

    // Personalized threshold: 50% of 30-day average
    const thirtyDaysAgo = daysAgo(30);
    const recentDayScores = Object.entries(dailyScores)
        .filter(([date]) => new Date(date) >= thirtyDaysAgo)
        .map(([, score]) => score);

    const avgScore = recentDayScores.length > 0
        ? recentDayScores.reduce((a, b) => a + b, 0) / recentDayScores.length
        : 0;
    const threshold = avgScore * 0.5;

    // Build last 30 days
    const last30Days = [];
    for (let i = 29; i >= 0; i--) {
        const d = daysAgo(i);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const score = dailyScores[dateStr] || 0;
        last30Days.push({ date: dateStr, filled: score >= threshold && threshold > 0 });
    }

    // Current streak (from today backwards)
    let currentStreak = 0;
    for (let i = last30Days.length - 1; i >= 0; i--) {
        if (last30Days[i].filled) currentStreak++;
        else break;
    }

    // Record streak (all time)
    let recordStreak = 0, tempStreak = 0;
    const allDates = Object.keys(dailyScores).sort();
    const allDateSet = new Set(allDates);

    // Iterate all dates
    if (allDates.length > 0) {
        const first = new Date(allDates[0]);
        const last = new Date(allDates[allDates.length - 1]);
        const iter = new Date(first);
        while (iter <= last) {
            const ds = `${iter.getFullYear()}-${String(iter.getMonth() + 1).padStart(2, '0')}-${String(iter.getDate()).padStart(2, '0')}`;
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

    return { currentStreak, recordStreak, last30Days, hasEnoughData: true };
}

// ─── 8. Task-Flow Harmony ───────────────────────────────────

export function calcTaskFlowHarmony(sessions: FlowSession[], tasks: TaskDto[]): TaskFlowHarmonyResult {
    const taggedSessions = sessions.filter(s => s.taskId);

    if (taggedSessions.length < 10) {
        return { items: [], hasEnoughData: false };
    }

    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const taskAggregates: Record<string, { title: string; totalDepth: number; count: number }> = {};

    taggedSessions.forEach(s => {
        if (!s.taskId) return;
        const task = taskMap.get(s.taskId);
        const title = task?.title || 'Unknown';
        if (!taskAggregates[s.taskId]) {
            taskAggregates[s.taskId] = { title, totalDepth: 0, count: 0 };
        }
        taskAggregates[s.taskId].totalDepth += calcSessionDepthScore(s);
        taskAggregates[s.taskId].count += 1;
    });

    const items = Object.values(taskAggregates).map(agg => ({
        taskTitle: agg.title,
        estimatedMinutes: null,
        actualDepthMinutes: Math.round(agg.totalDepth),
        sessionCount: agg.count,
    }));

    items.sort((a, b) => b.actualDepthMinutes - a.actualDepthMinutes);

    return { items: items.slice(0, 10), hasEnoughData: true };
}

// ─── 9. Warm-up Phase ───────────────────────────────────────

export function calcWarmupPhase(sessions: FlowSession[]): WarmupPhaseResult {
    const successfulSessions = sessions.filter(s => getDurationMinutes(s) >= 20);

    if (successfulSessions.length < 30) {
        return { avgWarmupMinutes: 0, prevMonthWarmup: null, changeMinutes: null, hasEnoughData: false };
    }

    // Check standard deviation — if too high, pattern is unreliable
    const durations = successfulSessions.map(s => getDurationMinutes(s));
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const variance = durations.reduce((sum, d) => sum + (d - avg) ** 2, 0) / durations.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / avg; // coefficient of variation

    if (cv > 0.6) {
        return { avgWarmupMinutes: 0, prevMonthWarmup: null, changeMinutes: null, hasEnoughData: false };
    }

    const avgWarmupMinutes = Math.round(avg * 0.22 * 10) / 10;

    // Previous month comparison
    const now = new Date();
    const thisMonth = now.getMonth();
    const prevMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const prevMonthSessions = successfulSessions.filter(s => new Date(s.startedAt).getMonth() === prevMonth);

    let prevMonthWarmup: number | null = null;
    let changeMinutes: number | null = null;
    if (prevMonthSessions.length >= 10) {
        const prevAvg = prevMonthSessions.reduce((sum, s) => sum + getDurationMinutes(s), 0) / prevMonthSessions.length;
        prevMonthWarmup = Math.round(prevAvg * 0.22 * 10) / 10;
        changeMinutes = Math.round((avgWarmupMinutes - prevMonthWarmup) * 10) / 10;
    }

    return { avgWarmupMinutes, prevMonthWarmup, changeMinutes, hasEnoughData: true };
}
