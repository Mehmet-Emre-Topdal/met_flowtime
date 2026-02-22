export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

export interface ChatRequest {
    message: string;
    conversationHistory: ChatMessage[];
    conversationSummary: string | null;
}

export interface ChatResponse {
    reply: string;
    updatedHistory: ChatMessage[];
    updatedSummary: string | null;
}

