import { baseApi } from "@/store/api/baseApi";
import { FlowSession, FlowSessionCreateInput } from "@/types/session";
import {
    collection,
    serverTimestamp,
    writeBatch,
    doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export const sessionsApi = baseApi.injectEndpoints({
    overrideExisting: true,
    endpoints: (builder) => ({

        createSession: builder.mutation<{ success: boolean; id: string }, FlowSessionCreateInput>({
            query: (input) => ({
                url: 'sessions',
                method: 'POST',
                body: input,
            }),
            invalidatesTags: ["Analytics"],
        }),

        seedSessions: builder.mutation<{ success: boolean; count: number }, FlowSessionCreateInput[]>({
            queryFn: async (sessions) => {
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
                } catch (error) {
                    return { error: { status: 'CUSTOM_ERROR', error: String(error) } };
                }
            },
            invalidatesTags: ["Analytics"],
        }),

        getSessions: builder.query<FlowSession[], string>({
            query: () => 'sessions',
            transformResponse: (response: { sessions: FlowSession[] }) => response.sessions,
            providesTags: ["Analytics"],
        }),
    }),
});

export const {
    useCreateSessionMutation,
    useGetSessionsQuery,
    useSeedSessionsMutation,
} = sessionsApi;
