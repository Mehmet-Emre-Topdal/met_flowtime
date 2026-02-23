import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/lib/firebase-admin';
import { verifyToken } from '@/lib/api-auth';
import { Timestamp } from 'firebase-admin/firestore';
import type { FlowSession } from '@/types/session';
import type { TaskDto } from '@/types/task';
import {
    calcDailyFlowWaves,
    calcWeeklyWorkTime,
    calcFocusDensity,
    calcResistancePoint,
    calcNaturalFlowWindow,
    calcFlowStreak,
    calcTaskFlowHarmony,
    calcWarmupPhase,
} from '@/features/analytics/utils/analyticsCalculations';

const toISO = (val: Timestamp | string | undefined): string => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    return val.toDate().toISOString();
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const userId = await verifyToken(req, res);
    if (!userId) return;

    try {
        const weekOffset = parseInt((req.query.weekOffset as string) ?? '0', 10);

        // Fetch sessions
        const sessionsSnap = await adminDb
            .collection('sessions')
            .where('userId', '==', userId)
            .orderBy('startedAt', 'desc')
            .get();

        const sessions: FlowSession[] = sessionsSnap.docs.map(d => {
            const data = d.data();
            return {
                id: d.id,
                userId: data.userId,
                startedAt: toISO(data.startedAt),
                endedAt: toISO(data.endedAt),
                durationSeconds: data.durationSeconds,
                breakDurationSeconds: data.breakDurationSeconds ?? 0,
                taskId: data.taskId ?? null,
                taskTitle: data.taskTitle ?? null,
                createdAt: toISO(data.createdAt),
            };
        });

        // Fetch tasks (for Task-Flow Harmony)
        const tasksSnap = await adminDb
            .collection('tasks')
            .where('userId', '==', userId)
            .get();

        const tasks: TaskDto[] = tasksSnap.docs.map(d => {
            const data = d.data();
            return {
                id: d.id,
                userId: data.userId,
                title: data.title,
                description: data.description ?? '',
                status: data.status,
                totalFocusedTime: data.totalFocusedTime ?? 0,
                order: data.order ?? 0,
                isArchived: data.isArchived ?? false,
                isDaily: data.isDaily ?? false,
                lastResetDate: data.lastResetDate ?? '',
                createdAt: toISO(data.createdAt),
                updatedAt: toISO(data.updatedAt),
                completedAt: data.completedAt ?? null,
            };
        });

        // Run all 9 calculations server-side
        const result = {
            dailyFlowWaves: calcDailyFlowWaves(sessions),
            weeklyWorkTime: calcWeeklyWorkTime(sessions, weekOffset),
            focusDensity: calcFocusDensity(sessions),
            resistancePoint: calcResistancePoint(sessions),
            naturalFlowWindow: calcNaturalFlowWindow(sessions),
            flowStreak: calcFlowStreak(sessions),
            taskFlowHarmony: calcTaskFlowHarmony(sessions, tasks),
            warmupPhase: calcWarmupPhase(sessions),
            // Summary stats for simple display
            summary: {
                totalSessions: sessions.length,
                allTimeMinutes: Math.round(sessions.reduce((acc, s) => acc + s.durationSeconds / 60, 0)),
            },
        };

        return res.status(200).json(result);
    } catch (error) {
        console.error('[/api/analytics]', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
