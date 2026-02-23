import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/lib/firebase-admin';
import { verifyToken } from '@/lib/api-auth';
import { FieldValue } from 'firebase-admin/firestore';
import type { ChatMessage } from '@/types/assistant';

async function handleGet(userId: string, res: NextApiResponse) {
    const doc = await adminDb.collection('chatHistory').doc(userId).get();
    if (!doc.exists) {
        return res.status(200).json({ messages: [], summary: null });
    }
    const data = doc.data()!;
    return res.status(200).json({
        messages: data.messages ?? [],
        summary: data.summary ?? null,
    });
}

async function handlePut(userId: string, req: NextApiRequest, res: NextApiResponse) {
    const { messages, summary } = req.body as { messages: ChatMessage[]; summary: string | null };
    await adminDb.collection('chatHistory').doc(userId).set({
        messages,
        summary: summary ?? null,
        updatedAt: FieldValue.serverTimestamp(),
    });
    return res.status(200).json({ success: true });
}

async function handleDelete(userId: string, res: NextApiResponse) {
    await adminDb.collection('chatHistory').doc(userId).delete();
    return res.status(200).json({ success: true });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const userId = await verifyToken(req, res);
    if (!userId) return;

    try {
        if (req.method === 'GET') return await handleGet(userId, res);
        if (req.method === 'PUT') return await handlePut(userId, req, res);
        if (req.method === 'DELETE') return await handleDelete(userId, res);
        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('[/api/chat-history]', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
