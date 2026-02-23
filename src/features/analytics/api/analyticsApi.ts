import { baseApi } from "@/store/api/baseApi";
import { AnalyticsResult } from "@/types/analytics";

export const analyticsApi = baseApi.injectEndpoints({
    overrideExisting: true,
    endpoints: (builder) => ({

        getAnalytics: builder.query<AnalyticsResult, { weekOffset?: number }>({
            query: ({ weekOffset = 0 }) => `analytics?weekOffset=${weekOffset}`,
            providesTags: ["Analytics"],
        }),

    }),
});

export const { useGetAnalyticsQuery } = analyticsApi;
