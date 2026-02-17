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
    increment
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export const tasksApi = baseApi.injectEndpoints({
    overrideExisting: true,
    endpoints: (builder) => ({

        /* ─── GET TASKS (arşivlenmemiş olanlar) ─── */
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
                        .map(doc => ({ id: doc.id, ...doc.data() } as TaskDto))
                        .filter(t => !t.isArchived); // soft-deleted olanları gizle
                    return { data: tasks };
                } catch (error: any) {
                    console.error("Firestore Fetch Failed:", error);
                    return { error: error.message };
                }
            },
            providesTags: ["Task"],
        }),

        /* ─── CREATE TASK ─── */
        createTask: builder.mutation<{ success: boolean; id: string }, { userId: string; task: TaskCreateInput; order: number }>({
            async queryFn({ userId, task, order }) {
                if (!userId) {
                    return { error: "User identity is missing. Operation aborted." };
                }
                try {
                    const docRef = await addDoc(collection(db, "tasks"), {
                        ...task,
                        userId,
                        order,
                        totalFocusedTime: 0,
                        isArchived: false,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                    });
                    return { data: { success: true, id: docRef.id } };
                } catch (error: any) {
                    console.error("Firestore Write Failed:", error);
                    let errorMessage = "Archive connection failed.";
                    if (error.code === 'permission-denied') {
                        errorMessage = "Security Rules: You do not have permission to write here.";
                    }
                    return { error: errorMessage };
                }
            },
            invalidatesTags: ["Task"],
        }),

        /* ─── UPDATE TASK (başlık + açıklama düzenleme) ─── */
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
            // Optimistic Update
            async onQueryStarted({ taskId, updates }, { dispatch, queryFulfilled, getState }) {
                // getTasks cache'ini bul ve güncelle
                const state = getState() as any;
                const userId = state.auth?.user?.uid;
                if (!userId) return;

                const patchResult = dispatch(
                    tasksApi.util.updateQueryData('getTasks', userId, (draft) => {
                        const task = draft.find(t => t.id === taskId);
                        if (task) {
                            task.title = updates.title;
                            task.description = updates.description;
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

        /* ─── UPDATE STATUS (optimistic) ─── */
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
            // Optimistic Update
            async onQueryStarted({ taskId, status }, { dispatch, queryFulfilled, getState }) {
                const state = getState() as any;
                const userId = state.auth?.user?.uid;
                if (!userId) return;

                const patchResult = dispatch(
                    tasksApi.util.updateQueryData('getTasks', userId, (draft) => {
                        const task = draft.find(t => t.id === taskId);
                        if (task) {
                            task.status = status as TaskDto['status'];
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

        /* ─── ARCHIVE TASK (soft delete — analitikleri koruyor) ─── */
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
            // Optimistic Update — UI'dan anında kaybolur
            async onQueryStarted({ taskId }, { dispatch, queryFulfilled, getState }) {
                const state = getState() as any;
                const userId = state.auth?.user?.uid;
                if (!userId) return;

                const patchResult = dispatch(
                    tasksApi.util.updateQueryData('getTasks', userId, (draft) => {
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

        /* ─── UPDATE FOCUS TIME ─── */
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
    }),
});

export const {
    useGetTasksQuery,
    useCreateTaskMutation,
    useUpdateTaskMutation,
    useUpdateTaskStatusMutation,
    useArchiveTaskMutation,
    useUpdateTaskFocusTimeMutation
} = tasksApi;
