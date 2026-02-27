import { baseApi } from '@/store/api/baseApi';
import { ChatMessage, ChatResponse } from '@/types/assistant';

interface ChatHistoryData {
    messages: ChatMessage[];
    summary: string | null;
}

interface SendMessageArgs {
    conversationHistory: ChatMessage[];
    conversationSummary: string | null;
    message?: string;
}

export const assistantApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getChatHistory: builder.query<ChatHistoryData, void>({
            query: () => 'chat-history',
            providesTags: ['ChatHistory'],
        }),
        saveChatHistory: builder.mutation<void, ChatHistoryData>({
            query: (body) => ({
                url: 'chat-history',
                method: 'PUT',
                body,
            }),
        }),
        deleteChatHistory: builder.mutation<void, void>({
            query: () => ({
                url: 'chat-history',
                method: 'DELETE',
            }),
            invalidatesTags: ['ChatHistory'],
        }),
        sendChatMessage: builder.mutation<ChatResponse, SendMessageArgs>({
            query: (body) => ({
                url: 'assistant/chat',
                method: 'POST',
                body,
            }),
        }),
    }),
});

export const {
    useGetChatHistoryQuery,
    useSaveChatHistoryMutation,
    useDeleteChatHistoryMutation,
    useSendChatMessageMutation,
} = assistantApi;
