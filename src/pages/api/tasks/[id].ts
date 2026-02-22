import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/lib/firebase-admin';
import { verifyToken } from '@/lib/api-auth';
import { FieldValue } from 'firebase-admin/firestore';
import type { TaskStatus } from '@/types/task';

interface TaskUpdateBody {
    title?: string;
    description?: string;
    isDaily?: boolean;
    status?: TaskStatus;
    additionalMinutes?: number;
    order?: number;
}

async function handlePut(userId: string, taskId: string, req: NextApiRequest, res: NextApiResponse) {
    const taskRef = adminDb.collection('tasks').doc(taskId);
    const snap = await taskRef.get();

    if (!snap.exists || snap.data()?.userId !== userId) {
        return res.status(404).json({ error: 'Task not found' });
    }

    const body = req.body as TaskUpdateBody;
    const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };

    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.isDaily !== undefined) updates.isDaily = body.isDaily;
    if (body.order !== undefined) updates.order = body.order;

    if (body.status !== undefined) {
        updates.status = body.status;
        updates.completedAt = body.status === 'done' ? new Date().toISOString() : null;
    }

    if (body.additionalMinutes !== undefined) {
        updates.totalFocusedTime = FieldValue.increment(body.additionalMinutes);
    }

    await taskRef.update(updates);
    return res.status(200).json({ success: true });
}

async function handleDelete(userId: string, taskId: string, res: NextApiResponse) {
    const taskRef = adminDb.collection('tasks').doc(taskId);
    const snap = await taskRef.get();

    if (!snap.exists || snap.data()?.userId !== userId) {
        return res.status(404).json({ error: 'Task not found' });
    }

    await taskRef.delete();
    return res.status(200).json({ success: true });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const userId = await verifyToken(req, res);
    if (!userId) return;

    const taskId = req.query.id as string;

    try {
        if (req.method === 'PUT') return await handlePut(userId, taskId, req, res);
        if (req.method === 'DELETE') return await handleDelete(userId, taskId, res);
        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('[/api/tasks/[id]]', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
