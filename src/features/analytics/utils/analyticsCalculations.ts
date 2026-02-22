import { FlowSession } from '@/types/session';
import { TaskDto } from '@/types/task';
import {
    DailyFlowWavesResult,
    WeeklyWorkTimeResult,
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

// ─── 2. Weekly Work Time ────────────────────────────────────

export function calcWeeklyWorkTime(sessions: FlowSession[], weekOffset: number = 0): WeeklyWorkTimeResult {
    const now = new Date();
    // Get Monday of current week
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - diffToMonday + weekOffset * 7);

    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const weekLabel = `${monday.getDate()} ${monthNames[monday.getMonth()]} – ${sunday.getDate()} ${monthNames[sunday.getMonth()]}`;

    const dayLabels = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

    const days = dayLabels.map((label, i) => {
        const d = new Date(monday);
        d.setDate(d.getDate() + i);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const daySessions = sessions.filter(s => getDateString(s.startedAt) === dateStr);
        const totalMinutes = Math.round(daySessions.reduce((sum, s) => sum + getDurationMinutes(s), 0));
        return { dayLabel: label, date: dateStr, totalMinutes };
    });

    const weekTotalMinutes = days.reduce((sum, d) => sum + d.totalMinutes, 0);
    const hasEnoughData = sessions.some(s => {
        const sDate = new Date(s.startedAt);
        return sDate >= monday && sDate <= sunday;
    });

    return { days, weekTotalMinutes, hasEnoughData, weekLabel };
}

// ─── 3. Focus Density ───────────────────────────────────────

export function calcFocusDensity(sessions: FlowSession[]): FocusDensityResult {
    const today = todayStr();
    const todaySessions = sessions.filter(s => getDateString(s.startedAt) === today);

    if (todaySessions.length === 0) {
        return { percentage: 0, label: 'scattered_mind', hasEnoughData: false };
    }

    if (todaySessions.length === 1) {
        return { percentage: 100, label: 'sharp', hasEnoughData: true };
    }

    // Sort sessions chronologically
    const sorted = [...todaySessions].sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

    // Split into blocks: >30 min gap = new block
    const GAP_THRESHOLD_MS = 30 * 60 * 1000;
    const blocks: FlowSession[][] = [[sorted[0]]];

    for (let i = 1; i < sorted.length; i++) {
        const prevEnd = new Date(sorted[i - 1].endedAt).getTime();
        const currStart = new Date(sorted[i].startedAt).getTime();
        const gap = currStart - prevEnd;

        if (gap > GAP_THRESHOLD_MS) {
            blocks.push([sorted[i]]); // new block
        } else {
            blocks[blocks.length - 1].push(sorted[i]); // same block
        }
    }

    // Calculate density per block, then weighted average by focus time
    let totalWeightedDensity = 0;
    let totalFocusMinutes = 0;

    for (const block of blocks) {
        const blockFocus = block.reduce((sum, s) => sum + getDurationMinutes(s), 0);
        totalFocusMinutes += blockFocus;

        if (block.length === 1) {
            // Single session block = 100% density
            totalWeightedDensity += blockFocus * 100;
        } else {
            const blockStart = new Date(block[0].startedAt).getTime();
            const blockEnd = new Date(block[block.length - 1].endedAt).getTime();
            const blockSpan = (blockEnd - blockStart) / 60000;
            const blockDensity = blockSpan > 0 ? Math.min(100, (blockFocus / blockSpan) * 100) : 100;
            totalWeightedDensity += blockFocus * blockDensity;
        }
    }

    const percentage = totalFocusMinutes > 0 ? Math.round(totalWeightedDensity / totalFocusMinutes) : 0;

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

    // Calculate daily focus minutes
    const dailyScores: Record<string, number> = {};
    sessions.forEach(s => {
        const dateKey = getDateString(s.startedAt);
        dailyScores[dateKey] = (dailyScores[dateKey] || 0) + getDurationMinutes(s);
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
    const taskAggregates: Record<string, { title: string; totalMinutes: number; count: number }> = {};

    taggedSessions.forEach(s => {
        if (!s.taskId) return;
        const task = taskMap.get(s.taskId);
        const title = task?.title || 'Unknown';
        if (!taskAggregates[s.taskId]) {
            taskAggregates[s.taskId] = { title, totalMinutes: 0, count: 0 };
        }
        taskAggregates[s.taskId].totalMinutes += getDurationMinutes(s);
        taskAggregates[s.taskId].count += 1;
    });

    const items = Object.values(taskAggregates).map(agg => ({
        taskTitle: agg.title,
        estimatedMinutes: null,
        totalFocusMinutes: Math.round(agg.totalMinutes),
        sessionCount: agg.count,
    }));

    items.sort((a, b) => b.totalFocusMinutes - a.totalFocusMinutes);

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
