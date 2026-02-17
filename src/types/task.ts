export type TaskStatus = "todo" | "inprogress" | "done";

export interface TaskDto {
    id: string;
    userId: string;
    title: string;
    description: string;
    status: TaskStatus;
    totalFocusedTime: number;
    order: number;
    isArchived: boolean;
    isDaily: boolean;
    lastResetDate: string;
    createdAt: string;
    updatedAt: string;
}

export interface TaskCreateInput {
    title: string;
    description: string;
    status: TaskStatus;
    isDaily?: boolean;
}

export interface TaskUpdateInput {
    title: string;
    description: string;
    isDaily?: boolean;
}
