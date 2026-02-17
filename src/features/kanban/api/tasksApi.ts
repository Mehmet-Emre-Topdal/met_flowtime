import { baseApi } from "@/store/api/baseApi";
import { TaskDto, TaskCreateInput, TaskUpdateInput } from "@/types/task";
import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    updateDoc,
    doc,
    serverTimestamp,
    orderBy,
    increment,
    writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const getTodayDateString = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

export const tasksApi = baseApi.injectEndpoints({
    overrideExisting: true,
    endpoints: (builder) => ({

        getTasks: builder.query<TaskDto[], string>({
            async queryFn(userId) {
                if (!userId) return { data: [] };
                try {
                    const tasksRef = collection(db, "tasks");
                    const q = query(
                        tasksRef,
                        where("userId", "==", userId),
                        orderBy("order", "asc")
                    );
                    const querySnapshot = await getDocs(q);
                    const tasks = querySnapshot.docs
                        .map(d => ({ id: d.id, ...d.data() } as TaskDto))
                        .filter(t => !t.isArchived);
                    return { data: tasks };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
            providesTags: ["Task"],
        }),

        createTask: builder.mutation<{ success: boolean; id: string }, { userId: string; task: TaskCreateInput; order: number }>({
            async queryFn({ userId, task, order }) {
                if (!userId) {
                    return { error: "User identity is missing." };
                }
                try {
                    const today = getTodayDateString();
                    const docRef = await addDoc(collection(db, "tasks"), {
                        ...task,
                        userId,
                        order,
                        totalFocusedTime: 0,
                        isArchived: false,
                        isDaily: task.isDaily ?? false,
                        lastResetDate: task.isDaily ? today : "",
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                    });
                    return { data: { success: true, id: docRef.id } };
                } catch (error: any) {
                    let errorMessage = "Failed to create task.";
                    if (error.code === "permission-denied") {
                        errorMessage = "Permission denied.";
                    }
                    return { error: errorMessage };
                }
            },
            invalidatesTags: ["Task"],
        }),

        updateTask: builder.mutation<{ success: boolean }, { taskId: string; updates: TaskUpdateInput }>({
            async queryFn({ taskId, updates }) {
                try {
                    const taskRef = doc(db, "tasks", taskId);
                    await updateDoc(taskRef, {
                        ...updates,
                        updatedAt: serverTimestamp(),
                    });
                    return { data: { success: true } };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
            async onQueryStarted({ taskId, updates }, { dispatch, queryFulfilled, getState }) {
                const state = getState() as any;
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
            async queryFn({ taskId, status }) {
                try {
                    const taskRef = doc(db, "tasks", taskId);
                    await updateDoc(taskRef, {
                        status,
                        updatedAt: serverTimestamp(),
                    });
                    return { data: { success: true } };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
            async onQueryStarted({ taskId, status }, { dispatch, queryFulfilled, getState }) {
                const state = getState() as any;
                const userId = state.auth?.user?.uid;
                if (!userId) return;

                const patchResult = dispatch(
                    tasksApi.util.updateQueryData("getTasks", userId, (draft) => {
                        const task = draft.find(t => t.id === taskId);
                        if (task) {
                            task.status = status as TaskDto["status"];
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
            async queryFn({ taskId }) {
                try {
                    const taskRef = doc(db, "tasks", taskId);
                    await updateDoc(taskRef, {
                        isArchived: true,
                        updatedAt: serverTimestamp(),
                    });
                    return { data: { success: true } };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
            async onQueryStarted({ taskId }, { dispatch, queryFulfilled, getState }) {
                const state = getState() as any;
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
            async queryFn({ taskId, additionalMinutes }) {
                try {
                    const taskRef = doc(db, "tasks", taskId);
                    await updateDoc(taskRef, {
                        totalFocusedTime: increment(additionalMinutes),
                        updatedAt: serverTimestamp(),
                    });
                    return { data: { success: true } };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
            invalidatesTags: ["Task"],
        }),

        resetDailyTasks: builder.mutation<{ resetCount: number }, string>({
            async queryFn(userId) {
                if (!userId) return { data: { resetCount: 0 } };
                try {
                    const today = getTodayDateString();
                    const tasksRef = collection(db, "tasks");
                    const q = query(
                        tasksRef,
                        where("userId", "==", userId),
                        where("isDaily", "==", true),
                        where("isArchived", "==", false)
                    );
                    const snapshot = await getDocs(q);

                    const batch = writeBatch(db);
                    let resetCount = 0;

                    snapshot.docs.forEach((d) => {
                        const data = d.data();
                        if (data.lastResetDate !== today) {
                            batch.update(d.ref, {
                                status: "todo",
                                lastResetDate: today,
                                updatedAt: serverTimestamp(),
                            });
                            resetCount++;
                        }
                    });

                    if (resetCount > 0) {
                        await batch.commit();
                    }

                    return { data: { resetCount } };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
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
    useResetDailyTasksMutation,
} = tasksApi;
