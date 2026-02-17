import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';

export const baseApi = createApi({
    reducerPath: 'baseApi',
    baseQuery: fakeBaseQuery(),
    tagTypes: ['Task', 'User', 'Analytics'],
    endpoints: () => ({}),
});