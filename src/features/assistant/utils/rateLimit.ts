const DAILY_LIMIT = 20;

interface UsageEntry {
    count: number;
    date: string;
}

// In-memory store — resets on server restart
const usageMap = new Map<string, UsageEntry>();

function getTodayKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
    const today = getTodayKey();
    const entry = usageMap.get(userId);

    if (!entry || entry.date !== today) {
        return { allowed: true, remaining: DAILY_LIMIT };
    }

    const remaining = Math.max(0, DAILY_LIMIT - entry.count);
    return { allowed: entry.count < DAILY_LIMIT, remaining };
}

export function incrementUsage(userId: string): void {
    const today = getTodayKey();
    const entry = usageMap.get(userId);

    if (!entry || entry.date !== today) {
        usageMap.set(userId, { count: 1, date: today });
    } else {
        entry.count += 1;
    }
}
