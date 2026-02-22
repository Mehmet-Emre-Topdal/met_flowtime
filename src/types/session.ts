export interface FlowSession {
    id: string;
    userId: string;
    startedAt: string;
    endedAt: string;
    durationSeconds: number;
    breakDurationSeconds: number;
    taskId: string | null;
    taskTitle: string | null;
    createdAt: string;
}

export interface FlowSessionCreateInput {
    userId: string;
    startedAt: string;
    endedAt: string;
    durationSeconds: number;
    breakDurationSeconds: number;
    taskId: string | null;
    taskTitle: string | null;
}
