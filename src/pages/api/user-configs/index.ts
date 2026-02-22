import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/lib/firebase-admin';
import { verifyToken } from '@/lib/api-auth';
import type { UserConfig } from '@/types/config';

async function handleGet(userId: string, res: NextApiResponse) {
    const docSnap = await adminDb.collection('userConfigs').doc(userId).get();

    if (!docSnap.exists) {
        return res.status(200).json({ config: null });
    }

    return res.status(200).json({ config: docSnap.data() as UserConfig });
}

async function handlePut(userId: string, req: NextApiRequest, res: NextApiResponse) {
    const config = req.body as UserConfig;

    if (!config?.intervals?.length) {
        return res.status(400).json({ error: 'intervals are required' });
    }

    await adminDb.collection('userConfigs').doc(userId).set(config, { merge: true });

    return res.status(200).json({ success: true });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const userId = await verifyToken(req, res);
    if (!userId) return;

    try {
        if (req.method === 'GET') return await handleGet(userId, res);
        if (req.method === 'PUT') return await handlePut(userId, req, res);
        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('[/api/user-configs]', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
