import { adminDb } from '@/lib/firebase-admin';

const WARMUP_RATIO = 0.22;
import { median, mode } from '@/utils/statisticsHelpers';
import {
    ParsedSession,
    fetchSessions,
    fetchSessionsByRange,
    getDurationMinutes,
    getDateString,
    getDayOfWeek,
} from './sessionFetcher';

// ─── Internal: Streak Calculation ───────────────────────────

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

    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 90; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const score = dailyScores[getDateString(d)] || 0;
        if (score >= threshold && threshold > 0) currentStreak++;
        else break;
    }

    let recordStreak = 0, tempStreak = 0;
    const allDates = Object.keys(dailyScores).sort();
    if (allDates.length > 0) {
        const iter = new Date(allDates[0]);
        const last = new Date(allDates[allDates.length - 1]);
        while (iter <= last) {
            const score = dailyScores[getDateString(iter)] || 0;
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

// ─── Tool Functions ──────────────────────────────────────────

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
    const modeVal = mode(durations);
    const medianVal = median(durations);
    const diff = Math.abs(modeVal - medianVal) / Math.max(medianVal, 1);
    const resistanceMinute = diff > 0.2 ? Math.round(medianVal) : modeVal;

    return { resistanceMinute, hasEnoughData: true, totalSessionsAnalyzed: sessions.length };
}

export async function toolGetLongestSession(userId: string, startDate: string, endDate: string) {
    const sessions = await fetchSessionsByRange(userId, startDate, endDate);
    if (sessions.length === 0) return { longestMinutes: 0, date: null };

    const longest = sessions.reduce((a, b) => a.durationSeconds > b.durationSeconds ? a : b);
    return {
        longestMinutes: Math.round(getDurationMinutes(longest)),
        date: getDateString(longest.startedAt),
    };
}

export async function toolGetWarmupDuration(userId: string, startDate: string, endDate: string) {
    const sessions = await fetchSessionsByRange(userId, startDate, endDate);
    const successfulSessions = sessions.filter(s => getDurationMinutes(s) >= 20);

    if (successfulSessions.length < 10) return { avgWarmupMinutes: 0, hasEnoughData: false };

    const avg = successfulSessions.reduce((sum, s) => sum + getDurationMinutes(s), 0) / successfulSessions.length;
    return {
        avgWarmupMinutes: Math.round(avg * WARMUP_RATIO * 10) / 10,
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
                : (typeof data.updatedAt === 'string' ? new Date(data.updatedAt) : data.updatedAt.toDate());
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
