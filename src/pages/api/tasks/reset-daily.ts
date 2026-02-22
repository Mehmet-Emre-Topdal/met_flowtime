import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/lib/firebase-admin';
import { verifyToken } from '@/lib/api-auth';
import { FieldValue } from 'firebase-admin/firestore';

const getTodayDateString = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const userId = await verifyToken(req, res);
    if (!userId) return;

    try {
        const today = getTodayDateString();

        const snapshot = await adminDb
            .collection('tasks')
            .where('userId', '==', userId)
            .where('isDaily', '==', true)
            .where('isArchived', '==', false)
            .get();

        const batch = adminDb.batch();
        let resetCount = 0;

        snapshot.docs.forEach(d => {
            if (d.data().lastResetDate !== today) {
                batch.update(d.ref, {
                    status: 'todo',
                    lastResetDate: today,
                    updatedAt: FieldValue.serverTimestamp(),
                });
                resetCount++;
            }
        });

        if (resetCount > 0) {
            await batch.commit();
        }

        return res.status(200).json({ resetCount });
    } catch (error) {
        console.error('[/api/tasks/reset-daily]', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
