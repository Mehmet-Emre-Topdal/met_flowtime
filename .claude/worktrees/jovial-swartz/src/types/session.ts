export interface FlowSession {
    id: string;
    userId: string;
    startedAt: string;          // ISO string
    endedAt: string;            // ISO string
    durationSeconds: number;    // toplam odak süresi (saniye)
    breakDurationSeconds: number; // kullanılan mola süresi (saniye)
    taskId: string | null;      // etiketlenen görev (varsa)
    createdAt: string;          // ISO string
}

export interface FlowSessionCreateInput {
    userId: string;
    startedAt: string;
    endedAt: string;
    durationSeconds: number;
    breakDurationSeconds: number;
    taskId: string | null;
}
