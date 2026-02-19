import { baseApi } from "@/store/api/baseApi";
import { FlowSession, FlowSessionCreateInput } from "@/types/session";
import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    orderBy,
    serverTimestamp,
    Timestamp,
    writeBatch,
    doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export const sessionsApi = baseApi.injectEndpoints({
    overrideExisting: true,
    endpoints: (builder) => ({

        createSession: builder.mutation<{ success: boolean; id: string }, FlowSessionCreateInput>({
            async queryFn(input) {
                try {
                    const docRef = await addDoc(collection(db, "sessions"), {
                        ...input,
                        createdAt: serverTimestamp(),
                    });
                    return { data: { success: true, id: docRef.id } };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
            invalidatesTags: ["Analytics"],
        }),

        seedSessions: builder.mutation<{ success: boolean; count: number }, FlowSessionCreateInput[]>({
            async queryFn(sessions) {
                try {
                    const batch = writeBatch(db);
                    sessions.forEach(s => {
                        const newDocRef = doc(collection(db, "sessions"));
                        batch.set(newDocRef, {
                            ...s,
                            createdAt: serverTimestamp(),
                        });
                    });
                    await batch.commit();
                    return { data: { success: true, count: sessions.length } };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
            invalidatesTags: ["Analytics"],
        }),

        getSessions: builder.query<FlowSession[], string>({
            async queryFn(userId) {
                if (!userId) return { data: [] };
                console.log('Fetching sessions for user:', userId);
                try {
                    const sessionsRef = collection(db, "sessions");
                    const q = query(
                        sessionsRef,
                        where("userId", "==", userId),
                        orderBy("startedAt", "desc")
                    );
                    const snapshot = await getDocs(q);
                    console.log(`Fetched ${snapshot.docs.length} sessions`);
                    const sessions = snapshot.docs.map(d => {
                        const data = d.data();
                        return {
                            id: d.id,
                            userId: data.userId,
                            startedAt: data.startedAt instanceof Timestamp
                                ? data.startedAt.toDate().toISOString()
                                : data.startedAt,
                            endedAt: data.endedAt instanceof Timestamp
                                ? data.endedAt.toDate().toISOString()
                                : data.endedAt,
                            durationSeconds: data.durationSeconds,
                            breakDurationSeconds: data.breakDurationSeconds,
                            taskId: data.taskId || null,
                            createdAt: data.createdAt instanceof Timestamp
                                ? data.createdAt.toDate().toISOString()
                                : data.createdAt || new Date().toISOString(),
                        } as FlowSession;
                    });
                    return { data: sessions };
                } catch (error: any) {
                    console.error('Firestore getSessions error:', error);
                    return { error: error.message };
                }
            },
            providesTags: ["Analytics"],
        }),
    }),
});

export const {
    useCreateSessionMutation,
    useGetSessionsQuery,
    useSeedSessionsMutation,
} = sessionsApi;
