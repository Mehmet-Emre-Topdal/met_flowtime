import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/lib/firebase-admin';
import { verifyToken } from '@/lib/api-auth';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { FlowSession, FlowSessionCreateInput } from '@/types/session';

const toISO = (val: Timestamp | string | undefined): string => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    return val.toDate().toISOString();
};

async function handleGet(userId: string, req: NextApiRequest, res: NextApiResponse) {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

    let queryRef = adminDb
        .collection('sessions')
        .where('userId', '==', userId)
        .orderBy('startedAt', 'desc');

    if (startDate) {
        queryRef = queryRef.where('startedAt', '>=', startDate) as typeof queryRef;
    }
    if (endDate) {
        queryRef = queryRef.where('startedAt', '<=', endDate + 'T23:59:59.999Z') as typeof queryRef;
    }

    const snapshot = await queryRef.get();

    const sessions: FlowSession[] = snapshot.docs.map(d => {
        const data = d.data();
        return {
            id: d.id,
            userId: data.userId,
            startedAt: toISO(data.startedAt),
            endedAt: toISO(data.endedAt),
            durationSeconds: data.durationSeconds,
            breakDurationSeconds: data.breakDurationSeconds,
            taskId: data.taskId ?? null,
            taskTitle: data.taskTitle ?? null,
            createdAt: toISO(data.createdAt),
        };
    });

    return res.status(200).json({ sessions });
}

async function handlePost(userId: string, req: NextApiRequest, res: NextApiResponse) {
    const input = req.body as FlowSessionCreateInput;

    if (!input.startedAt || !input.endedAt) {
        return res.status(400).json({ error: 'startedAt and endedAt are required' });
    }

    const docRef = await adminDb.collection('sessions').add({
        ...input,
        userId,
        createdAt: FieldValue.serverTimestamp(),
    });

    return res.status(201).json({ success: true, id: docRef.id });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const userId = await verifyToken(req, res);
    if (!userId) return;

    try {
        if (req.method === 'GET') return await handleGet(userId, req, res);
        if (req.method === 'POST') return await handlePost(userId, req, res);
        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('[/api/sessions]', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
