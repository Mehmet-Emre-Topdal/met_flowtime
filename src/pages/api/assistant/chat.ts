import type { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth } from '@/lib/firebase-admin';
import { callGemini, callGeminiWithHistory } from '@/lib/gemini';
import { fetchMetrics, getWeeklyDepthScore } from '@/features/assistant/utils/metricFunctions';
import { checkRateLimit, incrementUsage } from '@/features/assistant/utils/rateLimit';
import { ChatMessage, ChatResponse, ResolverOutput } from '@/types/assistant';

// ─── System Prompts ─────────────────────────────────────────

const RESOLVER_SYSTEM_PROMPT = `Sen bir veri router'ısın. Kullanıcının sorusunu analiz et ve 
cevaplamak için gereken metrikleri ve zaman aralığını JSON olarak döndür.
Sadece JSON döndür, başka hiçbir şey yazma.

Mevcut metrikler:
- total_sessions
- daily_depth_score
- weekly_depth_score  
- monthly_depth_score
- session_duration_distribution
- peak_hours
- flow_streak
- resistance_point
- focus_density_ratio
- earned_freedom_balance
- depth_score_by_weekday
- session_times_by_weekday
- average_session_duration
- longest_session
- warmup_duration
- task_flow_harmony

Mevcut periyotlar: today, last_7_days, last_30_days, last_90_days, all_time

Çıktı formatı:
{
  "period": "last_30_days",
  "metrics": ["peak_hours", "depth_score_by_weekday"]
}`;

const MAIN_ASSISTANT_PROMPT = `Sen Flowtime uygulamasının yapay zeka odaklanma asistanısın.
Kullanıcının odaklanma ve akış verilerine tam erişimin var.

Flowtime metodolojisini biliyorsun:
- Esneklik: Sabit süre yok, kullanıcı akışta olduğu kadar çalışır
- Amaç: Akış halini ölçmek ve derinleştirmek

Kişiliğin:
- Samimi ve motive edici, arkadaş gibi konuş
- Veriyi sayılarla destekle ama rapor gibi yazma
- Kısa ve net, gereksiz giriş cümleleri yok
- Asla "Yapay zekayım" veya "Verilerine göre" gibi meta cümleler kullanma
- Kullanıcı Flowtime dışı bir şey sorarsa nazikçe odaklanma konusuna yönlendir
- Türkçe yaz`;

const SUMMARY_PROMPT = `Aşağıdaki konuşmayı 3-4 cümleyle özetle. 
Kullanıcının sorduğu önemli konuları ve verilen tavsiyeleri koru.
Sadece özeti yaz, başka hiçbir şey ekleme.`;

// ─── Helpers ────────────────────────────────────────────────

function buildAssistantSystemPrompt(metricsData: Record<string, unknown>, summary: string | null, history: ChatMessage[]): string {
    let prompt = MAIN_ASSISTANT_PROMPT;
    prompt += `\n\nKullanıcı verisi:\n${JSON.stringify(metricsData, null, 2)}`;

    if (summary) {
        prompt += `\n\nÖnceki konuşma özeti:\n${summary}`;
    }

    return prompt;
}

function parseResolverOutput(text: string): ResolverOutput {
    // Extract JSON from response (may contain backticks or extra text)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('Resolver did not return valid JSON');
    }
    const parsed = JSON.parse(jsonMatch[0]);

    // Validate
    const validMetrics = [
        'total_sessions', 'daily_depth_score', 'weekly_depth_score', 'monthly_depth_score',
        'session_duration_distribution', 'peak_hours', 'flow_streak', 'resistance_point',
        'focus_density_ratio', 'earned_freedom_balance', 'depth_score_by_weekday',
        'session_times_by_weekday', 'average_session_duration', 'longest_session',
        'warmup_duration', 'task_flow_harmony',
    ];
    const validPeriods = ['today', 'last_7_days', 'last_30_days', 'last_90_days', 'all_time'];

    const metrics = (parsed.metrics || []).filter((m: string) => validMetrics.includes(m));
    const period = validPeriods.includes(parsed.period) ? parsed.period : 'last_30_days';

    return { period, metrics };
}

// ─── Welcome Message Handler ────────────────────────────────

async function handleWelcome(userId: string): Promise<ChatResponse> {
    console.log('[Chat API] handleWelcome for user:', userId);
    try {
        const weeklyData = await getWeeklyDepthScore(userId);
        console.log('[Chat API] Weekly data:', JSON.stringify(weeklyData));
        const welcomeMessage = weeklyData.sessionCount > 0
            ? `Merhaba! 👋 Bu hafta ${weeklyData.sessionCount} seans yapmışsın ve haftalık derinlik skorun ${weeklyData.weeklyDepthScore}. Odaklanma verilerini birlikte keşfedelim mi?`
            : `Merhaba! 👋 Flowtime verilerini birlikte incelemeye hazırım. Ne merak ediyorsun?`;

        return {
            reply: welcomeMessage,
            updatedHistory: [{
                role: 'assistant',
                content: welcomeMessage,
                timestamp: new Date().toISOString(),
            }],
            updatedSummary: null,
        };
    } catch (error: any) {
        console.error('[Chat API] handleWelcome error:', error?.message || error);
        return {
            reply: 'Merhaba! 👋 Odaklanma verilerini birlikte incelemeye hazırım. Ne merak ediyorsun?',
            updatedHistory: [{
                role: 'assistant',
                content: 'Merhaba! 👋 Odaklanma verilerini birlikte incelemeye hazırım. Ne merak ediyorsun?',
                timestamp: new Date().toISOString(),
            }],
            updatedSummary: null,
        };
    }
}

// ─── Main Handler ───────────────────────────────────────────

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    console.log('[Chat API] ═══════════════════════════════════════');
    console.log('[Chat API] Request received:', req.method);

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Auth
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        console.log('[Chat API] No auth header');
        return res.status(401).json({ error: 'Unauthorized' });
    }

    let userId: string;
    try {
        const token = authHeader.split('Bearer ')[1];
        console.log('[Chat API] Verifying token...');
        const decoded = await adminAuth.verifyIdToken(token);
        userId = decoded.uid;
        console.log('[Chat API] Auth OK, userId:', userId);
    } catch (error: any) {
        console.error('[Chat API] Auth error:', error?.message || error);
        return res.status(401).json({ error: 'Invalid token' });
    }

    const { message, conversationHistory = [], conversationSummary = null } = req.body;
    console.log('[Chat API] Message:', message ? message.substring(0, 100) : 'NONE (welcome)');
    console.log('[Chat API] History length:', conversationHistory.length);

    // Welcome message (no message sent)
    if (!message && conversationHistory.length === 0) {
        console.log('[Chat API] Handling welcome message');
        const welcomeResponse = await handleWelcome(userId);
        return res.status(200).json(welcomeResponse);
    }

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    // Rate limiting
    const { allowed, remaining } = checkRateLimit(userId);
    console.log('[Chat API] Rate limit - allowed:', allowed, 'remaining:', remaining);
    if (!allowed) {
        return res.status(429).json({
            error: 'rate_limit',
            reply: 'Bugünkü asistan limitine ulaştın, yarın devam edebiliriz. 🌙',
            updatedHistory: conversationHistory,
            updatedSummary: conversationSummary,
        });
    }

    try {
        // Stage 1: Intent Resolver
        console.log('[Chat API] ── Stage 1: Intent Resolver ──');
        const resolverRaw = await callGemini(RESOLVER_SYSTEM_PROMPT, message);
        console.log('[Chat API] Resolver raw output:', resolverRaw);

        const resolverOutput = parseResolverOutput(resolverRaw);
        console.log('[Chat API] Parsed resolver output:', JSON.stringify(resolverOutput));

        // Fetch metrics based on resolver output
        console.log('[Chat API] ── Fetching Metrics ──');
        const metricsData = await fetchMetrics(resolverOutput, userId);
        console.log('[Chat API] Metrics fetched OK, keys:', Object.keys(metricsData));

        // Stage 2: Main Assistant
        console.log('[Chat API] ── Stage 2: Main Assistant ──');
        const systemPrompt = buildAssistantSystemPrompt(metricsData, conversationSummary, conversationHistory);

        const historyForLLM = conversationHistory.map((msg: ChatMessage) => ({
            role: msg.role,
            content: msg.content,
        }));

        const assistantReply = await callGeminiWithHistory(systemPrompt, message, historyForLLM);
        console.log('[Chat API] Assistant reply:', assistantReply.substring(0, 200));

        // Update conversation history
        const now = new Date().toISOString();
        const updatedHistory: ChatMessage[] = [
            ...conversationHistory,
            { role: 'user', content: message, timestamp: now },
            { role: 'assistant', content: assistantReply, timestamp: now },
        ];

        // Memory management: sliding window + summary
        let updatedSummary = conversationSummary;
        if (updatedHistory.length > 10) {
            console.log('[Chat API] ── Summarizing old messages ──');
            const oldMessages = updatedHistory.slice(0, updatedHistory.length - 10);
            const oldConversationText = oldMessages
                .map(m => `${m.role === 'user' ? 'Kullanıcı' : 'Asistan'}: ${m.content}`)
                .join('\n');

            const summaryInput = conversationSummary
                ? `Önceki özet: ${conversationSummary}\n\nYeni mesajlar:\n${oldConversationText}`
                : oldConversationText;

            try {
                updatedSummary = await callGemini(SUMMARY_PROMPT, summaryInput);
            } catch {
                // Keep old summary if summarization fails
                console.warn('[Chat API] Summarization failed, keeping old summary');
            }

            // Keep only last 10 messages
            const trimmedHistory = updatedHistory.slice(-10);

            incrementUsage(userId);

            return res.status(200).json({
                reply: assistantReply,
                updatedHistory: trimmedHistory,
                updatedSummary,
            });
        }

        incrementUsage(userId);
        console.log('[Chat API] ── Success ──');

        return res.status(200).json({
            reply: assistantReply,
            updatedHistory,
            updatedSummary,
        });
    } catch (error: any) {
        console.error('[Chat API] ═══ UNHANDLED ERROR ═══');
        console.error('[Chat API] Error name:', error?.name);
        console.error('[Chat API] Error message:', error?.message);
        console.error('[Chat API] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error || {}), 2).substring(0, 1000));
        return res.status(500).json({
            error: 'Internal server error',
            reply: 'Bir hata oluştu, lütfen tekrar dene. 🔄',
            updatedHistory: conversationHistory,
            updatedSummary: conversationSummary,
        });
    }
}
