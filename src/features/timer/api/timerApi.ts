import { baseApi } from "@/store/api/baseApi";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { UserConfig } from "@/types/config";

export const timerApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getUserConfig: builder.query<UserConfig | null, string>({
            queryFn: async (uid) => {
                try {
                    const docRef = doc(db, "userConfigs", uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        return { data: docSnap.data() as UserConfig };
                    }
                    return { data: null };
                } catch (error: any) {
                    return { error: { status: "CUSTOM_ERROR", error: error.message } };
                }
            },
            providesTags: ["TimerConfig"],
        }),
        updateUserConfig: builder.mutation<void, { uid: string; config: UserConfig }>({
            queryFn: async ({ uid, config }) => {
                try {
                    const docRef = doc(db, "userConfigs", uid);
                    await setDoc(docRef, config, { merge: true });
                    return { data: undefined };
                } catch (error: any) {
                    return { error: { status: "CUSTOM_ERROR", error: error.message } };
                }
            },
            invalidatesTags: ["TimerConfig"],
        }),
    }),
});

export const { useGetUserConfigQuery, useUpdateUserConfigMutation } = timerApi;
