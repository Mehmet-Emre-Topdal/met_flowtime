import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || '';
console.log('[Gemini] API Key loaded:', apiKey ? `${apiKey.substring(0, 8)}...` : 'MISSING');

const genAI = new GoogleGenAI({ apiKey });

const MODEL = 'gemini-2.5-flash-lite';

// ─── Retry Helper ────────────────────────────────────────────

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 2000): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            const status = error?.status ?? error?.error?.code;
            const isRetryable = status === 503 || status === 429;
            if (isRetryable && attempt < retries) {
                console.warn(`[Gemini] Attempt ${attempt} failed (${status}), retrying in ${delayMs}ms...`);
                await new Promise(res => setTimeout(res, delayMs));
                delayMs *= 2; // exponential backoff
            } else {
                throw error;
            }
        }
    }
    throw new Error('Max retries exceeded');
}

// ─── API Calls ───────────────────────────────────────────────

export async function callGemini(
    systemPrompt: string,
    userMessage: string,
): Promise<string> {
    console.log('[Gemini] callGemini called, model:', MODEL);
    console.log('[Gemini] User message:', userMessage.substring(0, 100));

    return withRetry(async () => {
        const response = await genAI.models.generateContent({
            model: MODEL,
            contents: [{ role: 'user', parts: [{ text: userMessage }] }],
            config: {
                systemInstruction: systemPrompt,
                temperature: 0.7,
                maxOutputTokens: 1024,
            },
        });

        const text = response.text;
        console.log('[Gemini] callGemini response:', text ? text.substring(0, 200) : 'EMPTY');
        if (!text) throw new Error('Empty response from Gemini');
        return text;
    });
}

export async function callGeminiWithHistory(
    systemPrompt: string,
    userMessage: string,
    history: { role: string; content: string }[] = [],
): Promise<string> {
    console.log('[Gemini] callGeminiWithHistory, history length:', history.length);

    return withRetry(async () => {
        const contents = [
            ...history.map(msg => ({
                role: msg.role === 'assistant' ? 'model' as const : 'user' as const,
                parts: [{ text: msg.content }],
            })),
            { role: 'user' as const, parts: [{ text: userMessage }] },
        ];

        const response = await genAI.models.generateContent({
            model: MODEL,
            contents,
            config: {
                systemInstruction: systemPrompt,
                temperature: 0.7,
                maxOutputTokens: 2048,
            },
        });

        const text = response.text;
        console.log('[Gemini] WithHistory response:', text ? text.substring(0, 200) : 'EMPTY');
        if (!text) throw new Error('Empty response from Gemini');
        return text;
    });
}
