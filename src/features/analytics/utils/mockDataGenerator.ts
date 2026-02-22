import { FlowSessionCreateInput } from '@/types/session';

export function generateMockSessions(userId: string): FlowSessionCreateInput[] {
    const sessions: FlowSessionCreateInput[] = [];
    const now = new Date();

    // Generate 30 days of data
    for (let day = 30; day >= 0; day--) {
        const date = new Date(now);
        date.setDate(date.getDate() - day);

        // Random number of sessions per day (2-6)
        const numSessions = 2 + Math.floor(Math.random() * 5);

        // Typical "peak" window 10:00 - 15:00
        for (let i = 0; i < numSessions; i++) {
            const startHour = 8 + Math.floor(Math.random() * 12); // starts between 8 AM and 8 PM
            const sessionStart = new Date(date);
            sessionStart.setHours(startHour, Math.floor(Math.random() * 60), 0);

            // Random duration 15 - 60 mins
            const durationMinutes = 15 + Math.floor(Math.random() * 45);
            const durationSeconds = durationMinutes * 60;

            const sessionEnd = new Date(sessionStart.getTime() + durationSeconds * 1000);

            // Mock break (5-15 mins)
            const breakDurationSeconds = (5 + Math.floor(Math.random() * 10)) * 60;

            sessions.push({
                userId,
                startedAt: sessionStart.toISOString(),
                endedAt: sessionEnd.toISOString(),
                durationSeconds,
                breakDurationSeconds,
                taskId: null,
                taskTitle: null,
            });
        }
    }

    return sessions;
}
