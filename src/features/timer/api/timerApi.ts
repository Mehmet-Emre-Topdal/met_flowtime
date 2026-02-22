import { baseApi } from "@/store/api/baseApi";
import { UserConfig } from "@/types/config";

export const timerApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({

        getUserConfig: builder.query<UserConfig | null, string>({
            query: () => 'user-configs',
            transformResponse: (response: { config: UserConfig | null }) => response.config,
            providesTags: ["TimerConfig"],
        }),

        updateUserConfig: builder.mutation<void, { uid: string; config: UserConfig }>({
            query: ({ config }) => ({
                url: 'user-configs',
                method: 'PUT',
                body: config,
            }),
            invalidatesTags: ["TimerConfig"],
        }),
    }),
});

export const { useGetUserConfigQuery, useUpdateUserConfigMutation } = timerApi;
