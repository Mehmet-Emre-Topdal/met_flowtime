import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    calcDailyFlowWaves,
    calcDepthScore,
    calcFocusDensity,
    calcResistancePoint,
    calcEarnedFreedom,
    calcNaturalFlowWindow,
    calcFlowStreak,
    calcTaskFlowHarmony,
    calcWarmupPhase,
} from './analyticsCalculations';
import { FlowSession } from '@/types/session';
import { TaskDto } from '@/types/task';

// ─── Test Helpers ───────────────────────────────────────────

/** Create a FlowSession with sensible defaults */
function makeSession(overrides: Partial<FlowSession> & { startedAt: string }): FlowSession {
    const start = new Date(overrides.startedAt);
    const durationSeconds = overrides.durationSeconds ?? 1800; // default 30min
    const end = overrides.endedAt
        ? overrides.endedAt
        : new Date(start.getTime() + durationSeconds * 1000).toISOString();

    return {
        id: overrides.id ?? `session-${Math.random().toString(36).slice(2, 8)}`,
        userId: overrides.userId ?? 'test-user',
        startedAt: overrides.startedAt,
        endedAt: end,
        durationSeconds,
        breakDurationSeconds: overrides.breakDurationSeconds ?? 300,
        taskId: overrides.taskId ?? null,
        createdAt: overrides.createdAt ?? start.toISOString(),
    };
}

/** Generate N sessions at a fixed hour on distinct recent days */
function makeSessionsAtHour(count: number, hour: number, durationSeconds = 1800): FlowSession[] {
    const sessions: FlowSession[] = [];
    for (let i = 0; i < count; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(hour, 0, 0, 0);
        sessions.push(makeSession({ startedAt: d.toISOString(), durationSeconds }));
    }
    return sessions;
}

/** Generate sessions spread across today */
function makeTodaySessions(count: number, durationSeconds = 1800, gapMinutes = 10): FlowSession[] {
    const sessions: FlowSession[] = [];
    const today = new Date();
    today.setHours(9, 0, 0, 0);
    for (let i = 0; i < count; i++) {
        const start = new Date(today.getTime() + i * (durationSeconds * 1000 + gapMinutes * 60 * 1000));
        sessions.push(makeSession({ startedAt: start.toISOString(), durationSeconds }));
    }
    return sessions;
}

/** Generate sessions over multiple days */
function makeMultiDaySessions(days: number, sessionsPerDay: number, durationSeconds = 1800): FlowSession[] {
    const sessions: FlowSession[] = [];
    for (let day = 0; day < days; day++) {
        for (let i = 0; i < sessionsPerDay; i++) {
            const d = new Date();
            d.setDate(d.getDate() - day);
            d.setHours(9 + i * 2, 0, 0, 0);
            sessions.push(makeSession({ startedAt: d.toISOString(), durationSeconds }));
        }
    }
    return sessions;
}

// ═══════════════════════════════════════════════════════════
//  1. Daily Flow Waves
// ═══════════════════════════════════════════════════════════

describe('calcDailyFlowWaves', () => {
    it('should return hasEnoughData=false when fewer than 5 sessions', () => {
        const sessions = makeSessionsAtHour(3, 10);
        const result = calcDailyFlowWaves(sessions);
        expect(result.hasEnoughData).toBe(false);
        expect(result.slots).toHaveLength(0);
        expect(result.peakHour).toBeNull();
        expect(result.troughHour).toBeNull();
    });

    it('should return 24 hourly slots with enough data', () => {
        const sessions = makeSessionsAtHour(6, 10);
        const result = calcDailyFlowWaves(sessions);
        expect(result.hasEnoughData).toBe(true);
        expect(result.slots).toHaveLength(24);
    });

    it('should identify the peak hour correctly', () => {
        const sessions = [
            ...makeSessionsAtHour(5, 14, 3600),     // 5 sessions at 14:00, 60 min each
            ...makeSessionsAtHour(2, 8, 600),        // 2 sessions at 08:00, 10 min each
        ];
        const result = calcDailyFlowWaves(sessions);
        expect(result.hasEnoughData).toBe(true);
        expect(result.peakHour).toBe(14);
    });

    it('should identify trough hour as lowest non-zero hour', () => {
        const sessions = [
            ...makeSessionsAtHour(5, 14, 3600),
            ...makeSessionsAtHour(2, 8, 600),
        ];
        const result = calcDailyFlowWaves(sessions);
        expect(result.troughHour).toBe(8);
    });

    it('should label hours as peak, normal, or trough', () => {
        const sessions = [
            ...makeSessionsAtHour(5, 14, 3600),
            ...makeSessionsAtHour(5, 10, 1800),
            ...makeSessionsAtHour(2, 8, 300),
        ];
        const result = calcDailyFlowWaves(sessions);
        const peakSlot = result.slots.find(s => s.hour === 14);
        const troughSlot = result.slots.find(s => s.hour === 8);
        expect(peakSlot?.label).toBe('peak');
        expect(troughSlot?.label).toBe('trough');
    });

    it('should ignore sessions older than 14 days', () => {
        const oldSessions: FlowSession[] = [];
        for (let i = 0; i < 10; i++) {
            const d = new Date();
            d.setDate(d.getDate() - 20 - i);
            d.setHours(10, 0, 0, 0);
            oldSessions.push(makeSession({ startedAt: d.toISOString() }));
        }
        const result = calcDailyFlowWaves(oldSessions);
        expect(result.hasEnoughData).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════
//  2. Depth Score
// ═══════════════════════════════════════════════════════════

describe('calcDepthScore', () => {
    it('should return hasEnoughData=false when no sessions today', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const sessions = [makeSession({ startedAt: yesterday.toISOString() })];
        const result = calcDepthScore(sessions);
        expect(result.hasEnoughData).toBe(false);
        expect(result.todayScore).toBe(0);
    });

    it('should calculate todayScore using depth multiplier', () => {
        // 30 min session → multiplier 1.0 → depth = 30
        const sessions = makeTodaySessions(1, 1800);
        const result = calcDepthScore(sessions);
        expect(result.hasEnoughData).toBe(true);
        expect(result.todayScore).toBe(30); // 30 min * 1.0
    });

    it('should apply 0.5 multiplier for sessions under 25 min', () => {
        // 20 min session → multiplier 0.5 → depth = 10
        const sessions = makeTodaySessions(1, 1200);
        const result = calcDepthScore(sessions);
        expect(result.todayScore).toBe(10); // 20 min * 0.5
    });

    it('should apply 1.25 multiplier for sessions over 50 min', () => {
        // 60 min session → multiplier 1.25 → depth = 75
        const sessions = makeTodaySessions(1, 3600);
        const result = calcDepthScore(sessions);
        expect(result.todayScore).toBe(75); // 60 min * 1.25
    });

    it('should sum multiple today sessions', () => {
        // Two 30-min sessions → 30 + 30 = 60
        const sessions = makeTodaySessions(2, 1800);
        const result = calcDepthScore(sessions);
        expect(result.todayScore).toBe(60);
    });
});

// ═══════════════════════════════════════════════════════════
//  3. Focus Density
// ═══════════════════════════════════════════════════════════

describe('calcFocusDensity', () => {
    it('should return hasEnoughData=false when no sessions today', () => {
        const result = calcFocusDensity([]);
        expect(result.hasEnoughData).toBe(false);
        expect(result.percentage).toBe(0);
    });

    it('should return 100% for a single session', () => {
        const sessions = makeTodaySessions(1, 1800);
        const result = calcFocusDensity(sessions);
        expect(result.hasEnoughData).toBe(true);
        expect(result.percentage).toBe(100);
        expect(result.label).toBe('sharp');
    });

    it('should calculate density based on focus time / total span', () => {
        // 2 sessions of 30 min each with 10 min gap
        // Total focus: 60 min, Total span: 30 + 10 + 30 = 70 min
        // Density: 60/70 ≈ 86%
        const sessions = makeTodaySessions(2, 1800, 10);
        const result = calcFocusDensity(sessions);
        expect(result.hasEnoughData).toBe(true);
        expect(result.percentage).toBeGreaterThanOrEqual(80);
        expect(result.label).toBe('sharp');
    });

    it('should label as scattered_mind when density is low', () => {
        // 2 short sessions with huge gap
        // 5 min + 5 min focus, but 3-hour span
        const today = new Date();
        today.setHours(9, 0, 0, 0);
        const later = new Date(today);
        later.setHours(12, 0, 0, 0);
        const sessions = [
            makeSession({ startedAt: today.toISOString(), durationSeconds: 300 }),      // 5 min
            makeSession({ startedAt: later.toISOString(), durationSeconds: 300 }),       // 5 min
        ];
        const result = calcFocusDensity(sessions);
        // 10 min / 185 min ≈ 5%
        expect(result.label).toBe('scattered_mind');
        expect(result.percentage).toBeLessThan(40);
    });

    it('should label as good for 60-79% density', () => {
        // 2 sessions: 30 min each with 20 min gap
        // Focus: 60 min, Span: 30 + 20 + 30 = 80 min → 75%
        const sessions = makeTodaySessions(2, 1800, 20);
        const result = calcFocusDensity(sessions);
        expect(result.label).toBe('good');
    });
});

// ═══════════════════════════════════════════════════════════
//  4. Resistance Point
// ═══════════════════════════════════════════════════════════

describe('calcResistancePoint', () => {
    it('should return hasEnoughData=false when fewer than 10 sessions', () => {
        const sessions = makeSessionsAtHour(5, 10);
        const result = calcResistancePoint(sessions);
        expect(result.hasEnoughData).toBe(false);
        expect(result.resistanceMinute).toBe(0);
    });

    it('should calculate resistance point from session durations', () => {
        // 15 sessions of 25 minutes → mode = 25, median = 25
        const sessions = makeMultiDaySessions(5, 3, 1500); // 25 min
        const result = calcResistancePoint(sessions);
        expect(result.hasEnoughData).toBe(true);
        expect(result.resistanceMinute).toBe(25);
    });

    it('should prefer median when mode and median differ by >20%', () => {
        // Duration mix: many at 20 min, some at 60 min
        const sessions: FlowSession[] = [];
        // 7 sessions at 20 min (mode = 20)
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(10, 0, 0, 0);
            sessions.push(makeSession({ startedAt: d.toISOString(), durationSeconds: 1200 }));
        }
        // 5 sessions at 60 min
        for (let i = 0; i < 5; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(14, 0, 0, 0);
            sessions.push(makeSession({ startedAt: d.toISOString(), durationSeconds: 3600 }));
        }
        const result = calcResistancePoint(sessions);
        expect(result.hasEnoughData).toBe(true);
        // Median should be between 20 and 60
        expect(result.resistanceMinute).toBeGreaterThan(15);
        expect(result.resistanceMinute).toBeLessThan(65);
    });

    it('should include last 7 days sessions in result', () => {
        const sessions = makeMultiDaySessions(10, 2, 1800);
        const result = calcResistancePoint(sessions);
        expect(result.last7DaysSessions.length).toBeGreaterThan(0);
        result.last7DaysSessions.forEach(s => {
            expect(s.durationMinutes).toBeGreaterThan(0);
            expect(s.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
    });
});

// ═══════════════════════════════════════════════════════════
//  5. Earned Freedom
// ═══════════════════════════════════════════════════════════

describe('calcEarnedFreedom', () => {
    it('should return hasEnoughData=false when no sessions today', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const sessions = [makeSession({ startedAt: yesterday.toISOString() })];
        const result = calcEarnedFreedom(sessions);
        expect(result.hasEnoughData).toBe(false);
    });

    it('should calculate earned = focus / 5', () => {
        // 30 min focus → 6 min earned
        const sessions = makeTodaySessions(1, 1800);
        const result = calcEarnedFreedom(sessions);
        expect(result.hasEnoughData).toBe(true);
        expect(result.earnedMinutes).toBe(6); // 30 / 5 = 6
    });

    it('should calculate used from break seconds', () => {
        // breakDurationSeconds default is 300 (5 min)
        const sessions = makeTodaySessions(1, 1800);
        const result = calcEarnedFreedom(sessions);
        expect(result.usedMinutes).toBe(5); // 300 / 60 = 5
    });

    it('should calculate balance = earned - used', () => {
        const sessions = makeTodaySessions(1, 1800); // 6 earned, 5 used
        const result = calcEarnedFreedom(sessions);
        expect(result.balanceMinutes).toBe(1); // 6 - 5
    });

    it('should accumulate across multiple today sessions', () => {
        // 3 sessions x 30 min → 18 earned, 15 used
        const sessions = makeTodaySessions(3, 1800);
        const result = calcEarnedFreedom(sessions);
        expect(result.earnedMinutes).toBe(18); // 3 * 6
        expect(result.usedMinutes).toBe(15);   // 3 * 5
    });

    it('should calculate weekly totals', () => {
        const sessions = makeMultiDaySessions(5, 2, 1800);
        const result = calcEarnedFreedom(sessions);
        expect(result.weekEarned).toBeGreaterThan(0);
        expect(result.weekUsed).toBeGreaterThan(0);
    });
});

// ═══════════════════════════════════════════════════════════
//  6. Natural Flow Window
// ═══════════════════════════════════════════════════════════

describe('calcNaturalFlowWindow', () => {
    it('should return hasEnoughData=false when fewer than 20 sessions', () => {
        const sessions = makeSessionsAtHour(10, 10);
        const result = calcNaturalFlowWindow(sessions);
        expect(result.hasEnoughData).toBe(false);
    });

    it('should create buckets of 5 min intervals', () => {
        // 25 sessions of 30 min → should fall in bucket 25-30
        const sessions = makeMultiDaySessions(9, 3, 1800);
        const result = calcNaturalFlowWindow(sessions);
        expect(result.hasEnoughData).toBe(true);
        expect(result.buckets.length).toBeGreaterThan(0);
        result.buckets.forEach(b => {
            expect(b.rangeEnd - b.rangeStart).toBe(5);
        });
    });

    it('should mark dominant window', () => {
        const sessions = makeMultiDaySessions(10, 3, 1800); // 30 sessions
        const result = calcNaturalFlowWindow(sessions);
        const dominantBuckets = result.buckets.filter(b => b.isDominant);
        expect(dominantBuckets.length).toBeGreaterThanOrEqual(2);
        expect(dominantBuckets.length).toBeLessThanOrEqual(3);
    });

    it('should calculate median correctly', () => {
        // All sessions 30 min → median = 30
        const sessions = makeMultiDaySessions(10, 3, 1800);
        const result = calcNaturalFlowWindow(sessions);
        expect(result.median).toBe(30);
    });

    it('should set dominantWindowStart and dominantWindowEnd', () => {
        const sessions = makeMultiDaySessions(10, 3, 1800);
        const result = calcNaturalFlowWindow(sessions);
        expect(result.dominantWindowStart).toBeGreaterThanOrEqual(0);
        expect(result.dominantWindowEnd).toBeGreaterThan(result.dominantWindowStart);
    });
});

// ═══════════════════════════════════════════════════════════
//  7. Flow Streak
// ═══════════════════════════════════════════════════════════

describe('calcFlowStreak', () => {
    it('should return hasEnoughData=false when fewer than 3 sessions', () => {
        const sessions = makeTodaySessions(2, 1800);
        const result = calcFlowStreak(sessions);
        expect(result.hasEnoughData).toBe(false);
    });

    it('should return 30-day calendar', () => {
        const sessions = makeMultiDaySessions(10, 2, 1800);
        const result = calcFlowStreak(sessions);
        expect(result.hasEnoughData).toBe(true);
        expect(result.last30Days).toHaveLength(30);
    });

    it('should count consecutive days as streak', () => {
        // 10 consecutive days with sessions
        const sessions = makeMultiDaySessions(10, 2, 1800);
        const result = calcFlowStreak(sessions);
        expect(result.currentStreak).toBeGreaterThan(0);
        expect(result.recordStreak).toBeGreaterThanOrEqual(result.currentStreak);
    });

    it('should fill days above threshold', () => {
        const sessions = makeMultiDaySessions(10, 2, 1800);
        const result = calcFlowStreak(sessions);
        const filledDays = result.last30Days.filter(d => d.filled);
        expect(filledDays.length).toBeGreaterThan(0);
    });

    it('should have date format YYYY-MM-DD', () => {
        const sessions = makeMultiDaySessions(5, 2, 1800);
        const result = calcFlowStreak(sessions);
        result.last30Days.forEach(day => {
            expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
    });
});

// ═══════════════════════════════════════════════════════════
//  8. Task-Flow Harmony
// ═══════════════════════════════════════════════════════════

describe('calcTaskFlowHarmony', () => {
    const tasks: TaskDto[] = [
        { id: 'task-1', userId: 'test-user', title: 'Frontend', status: 'in_progress', focusTime: 0, order: 0, boardId: '', createdAt: '', updatedAt: '' } as unknown as TaskDto,
        { id: 'task-2', userId: 'test-user', title: 'Backend', status: 'in_progress', focusTime: 0, order: 1, boardId: '', createdAt: '', updatedAt: '' } as unknown as TaskDto,
    ];

    it('should return hasEnoughData=false when fewer than 10 tagged sessions', () => {
        const sessions = makeTodaySessions(5, 1800).map(s => ({ ...s, taskId: 'task-1' }));
        const result = calcTaskFlowHarmony(sessions, tasks);
        expect(result.hasEnoughData).toBe(false);
    });

    it('should aggregate sessions by task', () => {
        const sessions: FlowSession[] = [];
        // 6 sessions for task-1
        for (let i = 0; i < 6; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(10, 0, 0, 0);
            sessions.push(makeSession({ startedAt: d.toISOString(), taskId: 'task-1', durationSeconds: 1800 }));
        }
        // 5 sessions for task-2
        for (let i = 0; i < 5; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(14, 0, 0, 0);
            sessions.push(makeSession({ startedAt: d.toISOString(), taskId: 'task-2', durationSeconds: 3600 }));
        }

        const result = calcTaskFlowHarmony(sessions, tasks);
        expect(result.hasEnoughData).toBe(true);
        expect(result.items).toHaveLength(2);

        const frontend = result.items.find(i => i.taskTitle === 'Frontend');
        const backend = result.items.find(i => i.taskTitle === 'Backend');

        expect(frontend?.sessionCount).toBe(6);
        expect(backend?.sessionCount).toBe(5);
        // Backend has 60-min sessions (depth: 60*1.25=75)
        // Frontend has 30-min sessions (depth: 30*1=30)
        expect(backend!.actualDepthMinutes).toBeGreaterThan(frontend!.actualDepthMinutes);
    });

    it('should sort items by depth descending', () => {
        const sessions: FlowSession[] = [];
        for (let i = 0; i < 6; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(10, 0, 0, 0);
            sessions.push(makeSession({ startedAt: d.toISOString(), taskId: 'task-1', durationSeconds: 600 }));
        }
        for (let i = 0; i < 5; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(14, 0, 0, 0);
            sessions.push(makeSession({ startedAt: d.toISOString(), taskId: 'task-2', durationSeconds: 3600 }));
        }
        const result = calcTaskFlowHarmony(sessions, tasks);
        for (let i = 0; i < result.items.length - 1; i++) {
            expect(result.items[i].actualDepthMinutes).toBeGreaterThanOrEqual(result.items[i + 1].actualDepthMinutes);
        }
    });

    it('should limit to 10 items max', () => {
        const manyTasks: TaskDto[] = [];
        const sessions: FlowSession[] = [];
        for (let t = 0; t < 15; t++) {
            manyTasks.push({
                id: `task-${t}`, userId: 'test-user', title: `Task ${t}`,
                status: 'in_progress', focusTime: 0, order: t, boardId: '', createdAt: '', updatedAt: '',
            } as unknown as TaskDto);
            const d = new Date();
            d.setDate(d.getDate() - t);
            d.setHours(10, 0, 0, 0);
            sessions.push(makeSession({ startedAt: d.toISOString(), taskId: `task-${t}`, durationSeconds: 1800 }));
        }
        const result = calcTaskFlowHarmony(sessions, manyTasks);
        // Need at least 10 tagged sessions
        expect(result.items.length).toBeLessThanOrEqual(10);
    });

    it('should ignore sessions without taskId', () => {
        const sessions = makeMultiDaySessions(5, 3); // no taskId
        const result = calcTaskFlowHarmony(sessions, tasks);
        expect(result.hasEnoughData).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════
//  9. Warm-up Phase
// ═══════════════════════════════════════════════════════════

describe('calcWarmupPhase', () => {
    it('should return hasEnoughData=false when fewer than 30 sessions ≥ 20 min', () => {
        const sessions = makeMultiDaySessions(5, 3, 1800); // 15 sessions
        const result = calcWarmupPhase(sessions);
        expect(result.hasEnoughData).toBe(false);
    });

    it('should filter out sessions shorter than 20 min', () => {
        // 40 sessions but all 10 min → none qualify
        const sessions = makeMultiDaySessions(20, 2, 600);
        const result = calcWarmupPhase(sessions);
        expect(result.hasEnoughData).toBe(false);
    });

    it('should calculate avgWarmupMinutes for consistent sessions', () => {
        // 35 sessions of 30 min each → avg = 30, warmup = 30 * 0.22 = 6.6
        const sessions = makeMultiDaySessions(12, 3, 1800);
        const result = calcWarmupPhase(sessions);
        expect(result.hasEnoughData).toBe(true);
        expect(result.avgWarmupMinutes).toBeCloseTo(6.6, 1);
    });

    it('should return hasEnoughData=false for highly variable sessions (cv > 0.6)', () => {
        // Mix of very short (20 min) and very long (90 min) sessions
        const sessions: FlowSession[] = [];
        for (let i = 0; i < 20; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(10, 0, 0, 0);
            sessions.push(makeSession({ startedAt: d.toISOString(), durationSeconds: 1200 })); // 20 min
        }
        for (let i = 0; i < 20; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(14, 0, 0, 0);
            sessions.push(makeSession({ startedAt: d.toISOString(), durationSeconds: 5400 })); // 90 min
        }
        const result = calcWarmupPhase(sessions);
        // CV of [20, 20, ..., 90, 90, ...] is quite high
        // avg = 55, stdDev ≈ 35, cv ≈ 0.636 → should fail
        expect(result.hasEnoughData).toBe(false);
    });

    it('should set changeMinutes when previous month has enough data', () => {
        // We need sessions from both current and previous month (≥ 10 prev month)
        const now = new Date();
        const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

        const sessions: FlowSession[] = [];
        // Current month sessions
        for (let i = 0; i < 20; i++) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            d.setHours(10 + (i % 3), 0, 0, 0);
            sessions.push(makeSession({ startedAt: d.toISOString(), durationSeconds: 1800 }));
        }
        // Previous month sessions  
        for (let i = 0; i < 15; i++) {
            const d = new Date(prevYear, prevMonth, 15 + (i % 10));
            d.setHours(10 + (i % 3), 0, 0, 0);
            sessions.push(makeSession({ startedAt: d.toISOString(), durationSeconds: 1800 }));
        }

        const result = calcWarmupPhase(sessions);
        if (result.hasEnoughData) {
            expect(result.prevMonthWarmup).not.toBeNull();
            expect(result.changeMinutes).not.toBeNull();
        }
    });
});
