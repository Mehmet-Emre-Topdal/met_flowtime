import type { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth } from '@/lib/firebase-admin';

export async function verifyToken(
    req: NextApiRequest,
    res: NextApiResponse
): Promise<string | null> {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return null;
    }
    try {
        const token = authHeader.split('Bearer ')[1];
        const decoded = await adminAuth.verifyIdToken(token);
        return decoded.uid;
    } catch {
        res.status(401).json({ error: 'Invalid token' });
        return null;
    }
}
