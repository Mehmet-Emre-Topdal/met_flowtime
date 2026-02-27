import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/lib/firebase-admin';
import { verifyToken } from '@/lib/api-auth';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { TaskDto, TaskCreateInput } from '@/types/task';
import { parseFirestoreTimestamp } from '@/lib/firestoreHelpers';
import { todayStr } from '@/utils/dateHelpers';

const toISO = (val: Timestamp | string | undefined): string =>
    val ? parseFirestoreTimestamp(val).toISOString() : '';

async function handleGet(userId: string, res: NextApiResponse) {
    const snapshot = await adminDb
        .collection('tasks')
        .where('userId', '==', userId)
        .orderBy('order', 'asc')
        .get();

    const tasks: TaskDto[] = snapshot.docs
        .map(d => {
            const data = d.data();
            return {
                id: d.id,
                userId: data.userId,
                title: data.title,
                description: data.description,
                status: data.status,
                totalFocusedTime: data.totalFocusedTime,
                order: data.order,
                isArchived: data.isArchived,
                isDaily: data.isDaily,
                lastResetDate: data.lastResetDate ?? '',
                createdAt: toISO(data.createdAt),
                updatedAt: toISO(data.updatedAt),
                completedAt: data.completedAt ?? null,
            };
        })
        .filter(t => !t.isArchived);

    return res.status(200).json({ tasks });
}

async function handlePost(userId: string, req: NextApiRequest, res: NextApiResponse) {
    const { task, order } = req.body as { task: TaskCreateInput; order: number };

    if (!task?.title) {
        return res.status(400).json({ error: 'title is required' });
    }

    const today = todayStr();

    const docRef = await adminDb.collection('tasks').add({
        ...task,
        userId,
        order,
        totalFocusedTime: 0,
        isArchived: false,
        isDaily: task.isDaily ?? false,
        lastResetDate: task.isDaily ? today : '',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    });

    return res.status(201).json({ success: true, id: docRef.id });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const userId = await verifyToken(req, res);
    if (!userId) return;

    try {
        if (req.method === 'GET') return await handleGet(userId, res);
        if (req.method === 'POST') return await handlePost(userId, req, res);
        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('[/api/tasks]', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
