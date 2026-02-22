import { baseApi } from "@/store/api/baseApi";
import { TaskDto, TaskCreateInput, TaskUpdateInput } from "@/types/task";

export const tasksApi = baseApi.injectEndpoints({
    overrideExisting: true,
    endpoints: (builder) => ({

        getTasks: builder.query<TaskDto[], string>({
            query: () => 'tasks',
            transformResponse: (response: { tasks: TaskDto[] }) => response.tasks,
            providesTags: ["Task"],
        }),

        createTask: builder.mutation<{ success: boolean; id: string }, { userId: string; task: TaskCreateInput; order: number }>({
            query: ({ task, order }) => ({
                url: 'tasks',
                method: 'POST',
                body: { task, order },
            }),
            invalidatesTags: ["Task"],
        }),

        updateTask: builder.mutation<{ success: boolean }, { taskId: string; updates: TaskUpdateInput }>({
            query: ({ taskId, updates }) => ({
                url: `tasks/${taskId}`,
                method: 'PUT',
                body: updates,
            }),
            async onQueryStarted({ taskId, updates }, { dispatch, queryFulfilled, getState }) {
                const state = getState() as { auth?: { user?: { uid?: string } } };
                const userId = state.auth?.user?.uid;
                if (!userId) return;

                const patchResult = dispatch(
                    tasksApi.util.updateQueryData("getTasks", userId, (draft) => {
                        const task = draft.find(t => t.id === taskId);
                        if (task) {
                            task.title = updates.title;
                            task.description = updates.description;
                            if (updates.isDaily !== undefined) {
                                task.isDaily = updates.isDaily;
                            }
                        }
                    })
                );
                try {
                    await queryFulfilled;
                } catch {
                    patchResult.undo();
                }
            },
            invalidatesTags: ["Task"],
        }),

        updateTaskStatus: builder.mutation<{ success: boolean }, { taskId: string; status: string }>({
            query: ({ taskId, status }) => ({
                url: `tasks/${taskId}`,
                method: 'PUT',
                body: { status },
            }),
            async onQueryStarted({ taskId, status }, { dispatch, queryFulfilled, getState }) {
                const state = getState() as { auth?: { user?: { uid?: string } } };
                const userId = state.auth?.user?.uid;
                if (!userId) return;

                const patchResult = dispatch(
                    tasksApi.util.updateQueryData("getTasks", userId, (draft) => {
                        const task = draft.find(t => t.id === taskId);
                        if (task) {
                            task.status = status as TaskDto["status"];
                            task.completedAt = status === "done" ? new Date().toISOString() : null;
                        }
                    })
                );
                try {
                    await queryFulfilled;
                } catch {
                    patchResult.undo();
                }
            },
            invalidatesTags: ["Task"],
        }),

        archiveTask: builder.mutation<{ success: boolean }, { taskId: string }>({
            query: ({ taskId }) => ({
                url: `tasks/${taskId}/archive`,
                method: 'POST',
            }),
            async onQueryStarted({ taskId }, { dispatch, queryFulfilled, getState }) {
                const state = getState() as { auth?: { user?: { uid?: string } } };
                const userId = state.auth?.user?.uid;
                if (!userId) return;

                const patchResult = dispatch(
                    tasksApi.util.updateQueryData("getTasks", userId, (draft) => {
                        const index = draft.findIndex(t => t.id === taskId);
                        if (index !== -1) {
                            draft.splice(index, 1);
                        }
                    })
                );
                try {
                    await queryFulfilled;
                } catch {
                    patchResult.undo();
                }
            },
            invalidatesTags: ["Task"],
        }),

        updateTaskFocusTime: builder.mutation<{ success: boolean }, { taskId: string; additionalMinutes: number }>({
            query: ({ taskId, additionalMinutes }) => ({
                url: `tasks/${taskId}`,
                method: 'PUT',
                body: { additionalMinutes },
            }),
            invalidatesTags: ["Task"],
        }),

        deleteTask: builder.mutation<{ success: boolean }, { taskId: string }>({
            query: ({ taskId }) => ({
                url: `tasks/${taskId}`,
                method: 'DELETE',
            }),
            invalidatesTags: ["Task"],
        }),

        resetDailyTasks: builder.mutation<{ resetCount: number }, string>({
            query: () => ({
                url: 'tasks/reset-daily',
                method: 'POST',
            }),
            invalidatesTags: ["Task"],
        }),
    }),
});

export const {
    useGetTasksQuery,
    useCreateTaskMutation,
    useUpdateTaskMutation,
    useUpdateTaskStatusMutation,
    useArchiveTaskMutation,
    useUpdateTaskFocusTimeMutation,
    useDeleteTaskMutation,
    useResetDailyTasksMutation,
} = tasksApi;
