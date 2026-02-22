import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/lib/firebase-admin';
import { verifyToken } from '@/lib/api-auth';
import { FieldValue } from 'firebase-admin/firestore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const userId = await verifyToken(req, res);
    if (!userId) return;

    const taskId = req.query.id as string;

    try {
        const taskRef = adminDb.collection('tasks').doc(taskId);
        const snap = await taskRef.get();

        if (!snap.exists || snap.data()?.userId !== userId) {
            return res.status(404).json({ error: 'Task not found' });
        }

        await taskRef.update({
            isArchived: true,
            updatedAt: FieldValue.serverTimestamp(),
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('[/api/tasks/[id]/archive]', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
