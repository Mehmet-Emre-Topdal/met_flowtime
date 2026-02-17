export type TaskStatus = "todo" | "inprogress" | "done";

export interface TaskDto {
    id: string;
    userId: string;
    title: string;
    description: string;
    status: TaskStatus;
    totalFocusedTime: number; // in minutes
    order: number;
    isArchived: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface TaskCreateInput {
    title: string;
    description: string;
    status: TaskStatus;
}

export interface TaskUpdateInput {
    title: string;
    description: string;
}
