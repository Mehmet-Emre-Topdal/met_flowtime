import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { auth } from '@/lib/firebase';

export const baseApi = createApi({
    reducerPath: 'baseApi',
    baseQuery: fetchBaseQuery({
        baseUrl: '/api',
        prepareHeaders: async (headers) => {
            const token = await auth.currentUser?.getIdToken();
            if (token) {
                headers.set('Authorization', `Bearer ${token}`);
            }
            return headers;
        },
    }),
    tagTypes: ['Task', 'User', 'Analytics', 'TimerConfig'],
    endpoints: () => ({}),
});