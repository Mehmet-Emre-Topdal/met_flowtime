import { adminDb } from '@/lib/firebase-admin';

// ─── Types ───────────────────────────────────────────────────

interface SessionDoc {
    startedAt: FirebaseFirestore.Timestamp | string;
    endedAt: FirebaseFirestore.Timestamp | string;
    durationSeconds: number;
    breakDurationSeconds: number;
    taskId: string | null;
    taskTitle: string | null;
    userId: string;
}

export interface ParsedSession {
    startedAt: Date;
    endedAt: Date;
    durationSeconds: number;
    breakDurationSeconds: number;
    taskId: string | null;
    taskTitle: string | null;
}

// ─── Session Helpers ─────────────────────────────────────────

export function getDurationMinutes(s: ParsedSession): number {
    return s.durationSeconds / 60;
}

export function getDateString(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getDayOfWeek(d: Date): string {
    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    return days[d.getDay()];
}

// ─── Firestore Queries ───────────────────────────────────────

function parseTimestamp(val: FirebaseFirestore.Timestamp | string): Date {
    if (typeof val === 'string') return new Date(val);
    return val.toDate();
}

function mapDocToSession(doc: FirebaseFirestore.QueryDocumentSnapshot): ParsedSession {
    const data = doc.data() as SessionDoc;
    return {
        startedAt: parseTimestamp(data.startedAt),
        endedAt: parseTimestamp(data.endedAt),
        durationSeconds: data.durationSeconds,
        breakDurationSeconds: data.breakDurationSeconds || 0,
        taskId: data.taskId || null,
        taskTitle: data.taskTitle || null,
    };
}

function getPeriodStartDate(period: string): Date | null {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    switch (period) {
        case 'today': return now;
        case 'last_7_days': { const d = new Date(now); d.setDate(d.getDate() - 7); return d; }
        case 'last_30_days': { const d = new Date(now); d.setDate(d.getDate() - 30); return d; }
        case 'last_90_days': { const d = new Date(now); d.setDate(d.getDate() - 90); return d; }
        default: return null;
    }
}

export async function fetchSessions(userId: string, period: string): Promise<ParsedSession[]> {
    const periodStart = getPeriodStartDate(period);
    let q: FirebaseFirestore.Query = adminDb.collection('sessions').where('userId', '==', userId);
    if (periodStart) {
        q = q.where('startedAt', '>=', periodStart.toISOString());
    }
    q = q.orderBy('startedAt', 'desc');
    const snapshot = await q.get();
    return snapshot.docs.map(mapDocToSession);
}

export async function fetchSessionsByRange(userId: string, startDate: string, endDate: string): Promise<ParsedSession[]> {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const snapshot = await adminDb.collection('sessions')
        .where('userId', '==', userId)
        .where('startedAt', '>=', start.toISOString())
        .where('startedAt', '<=', end.toISOString())
        .orderBy('startedAt', 'desc')
        .get();

    return snapshot.docs.map(mapDocToSession);
}
