import type { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth } from '@/lib/firebase-admin';
import { callGemini, callGeminiWithHistory, callGeminiWithTools, Type } from '@/lib/gemini';
import type { Tool } from '@/lib/gemini';
import { checkRateLimit, incrementUsage } from '@/features/assistant/utils/rateLimit';
import {
    toolGetSessionsSummary,
    toolGetTopTasks,
    toolGetHourlyDistribution,
    toolComparePeriods,
    toolGetStreak,
    toolGetWeekdayStats,
    toolGetResistancePoint,
    toolGetLongestSession,
    toolGetWarmupDuration,
    toolGetTaskFocusByName,
    toolGetCompletedTasks,
} from '@/features/assistant/utils/metricFunctions';
import { ChatMessage, ChatResponse } from '@/types/assistant';

// ─── Tool Declarations ───────────────────────────────────────

const ASSISTANT_TOOLS: Tool[] = [{
    functionDeclarations: [
        {
            name: 'get_sessions_summary',
            description: 'Belirli bir tarih aralığındaki odak oturumlarının özetini döndürür. Toplam süre, oturum sayısı, ortalama süre ve dağılım bilgisi içerir.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    startDate: { type: Type.STRING, description: 'Başlangıç tarihi YYYY-MM-DD formatında. Örnek: 2025-01-01' },
                    endDate: { type: Type.STRING, description: 'Bitiş tarihi YYYY-MM-DD formatında. Örnek: 2025-01-20' },
                },
                required: ['startDate', 'endDate'],
            },
        },
        {
            name: 'get_top_tasks',
            description: 'Belirli tarih aralığında görevleri odaklanma süresine göre sıralar. Her görev için totalFocusMinutes, sessionCount ve averageSessionMinutes döner. "En verimli görev" sorusunda averageSessionMinutes yüksek olanı seç. "En az odaklanılan" veya "ihmal edilen" görev sorularında order=asc kullan.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    startDate: { type: Type.STRING, description: 'Başlangıç tarihi YYYY-MM-DD' },
                    endDate: { type: Type.STRING, description: 'Bitiş tarihi YYYY-MM-DD' },
                    limit: { type: Type.NUMBER, description: 'Kaç görev dönsün. Sorudaki sayıyı kullan: "en çok/en az odaklandığım görev" → 1, "en çok zaman harcadığım 5 görev" → 5, "7 görev listele" → 7, sayı belirtilmemişse → 3' },
                    order: { type: Type.STRING, description: '"desc" = en çok odaklanılan, "asc" = en az odaklanılan' },
                },
                required: ['startDate', 'endDate', 'limit'],
            },
        },
        {
            name: 'get_hourly_distribution',
            description: 'Günün hangi saatlerinde daha verimli çalışıldığını gösterir.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    startDate: { type: Type.STRING, description: 'Başlangıç tarihi YYYY-MM-DD' },
                    endDate: { type: Type.STRING, description: 'Bitiş tarihi YYYY-MM-DD' },
                },
                required: ['startDate', 'endDate'],
            },
        },
        {
            name: 'compare_periods',
            description: 'İki farklı zaman dilimini karşılaştırır. Örneğin bu ay ile geçen ayı karşılaştırmak için kullan.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    period1Start: { type: Type.STRING, description: 'Birinci dönem başlangıç tarihi YYYY-MM-DD' },
                    period1End: { type: Type.STRING, description: 'Birinci dönem bitiş tarihi YYYY-MM-DD' },
                    period2Start: { type: Type.STRING, description: 'İkinci dönem başlangıç tarihi YYYY-MM-DD' },
                    period2End: { type: Type.STRING, description: 'İkinci dönem bitiş tarihi YYYY-MM-DD' },
                },
                required: ['period1Start', 'period1End', 'period2Start', 'period2End'],
            },
        },
        {
            name: 'get_streak',
            description: 'Kullanıcının mevcut akış serisini ve kişisel rekor serisini döndürür.',
            parameters: {
                type: Type.OBJECT,
                properties: {},
                required: [],
            },
        },
        {
            name: 'get_weekday_stats',
            description: 'Haftanın günlerine göre odaklanma dağılımını döndürür. Hangi günler daha verimli sorularında kullan.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    startDate: { type: Type.STRING, description: 'Başlangıç tarihi YYYY-MM-DD' },
                    endDate: { type: Type.STRING, description: 'Bitiş tarihi YYYY-MM-DD' },
                },
                required: ['startDate', 'endDate'],
            },
        },
        {
            name: 'get_resistance_point',
            description: 'Kullanıcının doğal oturum süresi tatlı noktasını döndürür. Kaç dakikada takılıp kaldığını, tipik oturum uzunluğunu gösterir.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    startDate: { type: Type.STRING, description: 'Başlangıç tarihi YYYY-MM-DD' },
                    endDate: { type: Type.STRING, description: 'Bitiş tarihi YYYY-MM-DD' },
                },
                required: ['startDate', 'endDate'],
            },
        },
        {
            name: 'get_longest_session',
            description: 'Belirli tarih aralığındaki en uzun odak oturumunu ve tarihini döndürür.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    startDate: { type: Type.STRING, description: 'Başlangıç tarihi YYYY-MM-DD' },
                    endDate: { type: Type.STRING, description: 'Bitiş tarihi YYYY-MM-DD' },
                },
                required: ['startDate', 'endDate'],
            },
        },
        {
            name: 'get_warmup_duration',
            description: 'Kullanıcının verimli oturumlara (20+ dakika) ulaşmak için geçirdiği ortalama ısınma süresini döndürür.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    startDate: { type: Type.STRING, description: 'Başlangıç tarihi YYYY-MM-DD' },
                    endDate: { type: Type.STRING, description: 'Bitiş tarihi YYYY-MM-DD' },
                },
                required: ['startDate', 'endDate'],
            },
        },
        {
            name: 'get_task_focus_by_name',
            description: 'Belirli bir görevin adına göre o göreve harcanan odaklanma süresini döndürür. "X görevine ne kadar çalıştım?", "Dün X üzerinde ne kadar vakit geçirdim?" sorularında kullan. Kısmi ad eşleşmesi desteklenir.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    taskName: { type: Type.STRING, description: 'Aranacak görev adı veya bir kısmı' },
                    startDate: { type: Type.STRING, description: 'Başlangıç tarihi YYYY-MM-DD' },
                    endDate: { type: Type.STRING, description: 'Bitiş tarihi YYYY-MM-DD' },
                },
                required: ['taskName', 'startDate', 'endDate'],
            },
        },
        {
            name: 'get_completed_tasks',
            description: 'Belirli tarih aralığında tamamlanan (done statüsüne taşınan) görevleri listeler. "Bugün hangi görevleri bitirdim?", "Bu hafta tamamladığım görevler neler?" sorularında kullan.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    startDate: { type: Type.STRING, description: 'Başlangıç tarihi YYYY-MM-DD' },
                    endDate: { type: Type.STRING, description: 'Bitiş tarihi YYYY-MM-DD' },
                },
                required: ['startDate', 'endDate'],
            },
        },
    ],
}];

// ─── Tool Executor ───────────────────────────────────────────

async function executeToolCall(name: string, args: Record<string, unknown>, userId: string): Promise<unknown> {
    console.log('[Chat API] Executing tool:', name, 'args:', JSON.stringify(args));

    switch (name) {
        case 'get_sessions_summary': {
            const { startDate, endDate } = args as { startDate: string; endDate: string };
            return toolGetSessionsSummary(userId, startDate, endDate);
        }
        case 'get_top_tasks': {
            const { startDate, endDate, limit, order = 'desc' } = args as { startDate: string; endDate: string; limit: number; order?: 'asc' | 'desc' };
            return toolGetTopTasks(userId, startDate, endDate, Number(limit), order);
        }
        case 'get_hourly_distribution': {
            const { startDate, endDate } = args as { startDate: string; endDate: string };
            return toolGetHourlyDistribution(userId, startDate, endDate);
        }
        case 'compare_periods': {
            const { period1Start, period1End, period2Start, period2End } = args as {
                period1Start: string; period1End: string;
                period2Start: string; period2End: string;
            };
            return toolComparePeriods(userId, period1Start, period1End, period2Start, period2End);
        }
        case 'get_streak':
            return toolGetStreak(userId);
        case 'get_resistance_point': {
            const { startDate, endDate } = args as { startDate: string; endDate: string };
            return toolGetResistancePoint(userId, startDate, endDate);
        }
        case 'get_longest_session': {
            const { startDate, endDate } = args as { startDate: string; endDate: string };
            return toolGetLongestSession(userId, startDate, endDate);
        }
        case 'get_warmup_duration': {
            const { startDate, endDate } = args as { startDate: string; endDate: string };
            return toolGetWarmupDuration(userId, startDate, endDate);
        }
        case 'get_weekday_stats': {
            const { startDate, endDate } = args as { startDate: string; endDate: string };
            return toolGetWeekdayStats(userId, startDate, endDate);
        }
        case 'get_task_focus_by_name': {
            const { taskName, startDate, endDate } = args as { taskName: string; startDate: string; endDate: string };
            return toolGetTaskFocusByName(userId, taskName, startDate, endDate);
        }
        case 'get_completed_tasks': {
            const { startDate, endDate } = args as { startDate: string; endDate: string };
            return toolGetCompletedTasks(userId, startDate, endDate);
        }
        default:
            return { error: `Unknown tool: ${name}` };
    }
}

// ─── System Prompt ───────────────────────────────────────────

const SUMMARY_PROMPT = `Aşağıdaki konuşmayı 3-4 cümleyle özetle.
Kullanıcının sorduğu önemli konuları ve verilen tavsiyeleri koru.
Sadece özeti yaz, başka hiçbir şey ekleme.`;

function buildSystemPrompt(summary: string | null): string {
    const today = new Date().toISOString().split('T')[0];

    let prompt = `Sen Flowtime uygulamasının yapay zeka odaklanma asistanısın.
Kullanıcının odaklanma ve akış verilerine araçlar aracılığıyla erişebilirsin.

Flowtime metodolojisini biliyorsun:
- Esneklik: Sabit süre yok, kullanıcı akışta olduğu kadar çalışır
- Amaç: Akış halini ölçmek ve derinleştirmek

Kişiliğin:
- Samimi ve motive edici, arkadaş gibi konuş
- Veriyi sayılarla destekle ama rapor gibi yazma
- Kısa ve net, gereksiz giriş cümleleri yok
- Asla "Yapay zekayım" veya "Verilerine göre" gibi meta cümleler kullanma
- Kullanıcı Flowtime dışı bir şey sorarsa nazikçe odaklanma konusuna yönlendir
- Türkçe yaz

Bugünün tarihi: ${today}

Tarih aralığı kuralları:
- Kullanıcı tarih belirtmezse ve "en uzun", "en çok", "hiç", "tüm zamanlar", "genel" gibi ifadeler kullanırsa: startDate=2020-01-01, endDate=${today}
- "Bu ay" → ayın 1. günü ile ${today}
- "Bu hafta" → haftanın Pazartesi'si ile ${today}
- "Geçen ay" → bir önceki ayın 1. günü ile son günü
- "Son 7 gün" veya "bu hafta" → 7 gün öncesi ile ${today}
- "Son 30 gün" → 30 gün öncesi ile ${today}
- Bir kez belirlediğin tarih aralığını aynı soru için değiştirme; tutarlı kal

Yapabileceklerin:
- Görev bazlı analiz: hangi göreve ne kadar zaman harcandığı, en çok odaklanılan görevler (get_top_tasks)
- En uzun/en kısa oturum, toplam süre, oturum dağılımı (get_longest_session, get_sessions_summary)
- Saatlik ve günlük verimlilik desenleri (get_hourly_distribution, get_weekday_stats)
- İki dönem karşılaştırması (compare_periods)
- Streak ve alışkanlık takibi (get_streak)
- "En verimli görev" sorusunda get_top_tasks kullan; averageSessionMinutes yüksek olan görevi "en verimli" olarak yorumla
- Belirli bir göreve harcanan süre: "X görevine dün ne kadar çalıştım?" → get_task_focus_by_name (kısmi ad eşleşmesi çalışır)
- Tamamlanan görevler: "Bugün hangi görevleri bitirdim?" → get_completed_tasks (updatedAt baz alınır)`;

    if (summary) {
        prompt += `\n\nÖnceki konuşma özeti:\n${summary}`;
    }

    return prompt;
}

// ─── Welcome Message Handler ────────────────────────────────

async function handleWelcome(): Promise<ChatResponse> {
    const welcomeMessage = `Merhaba! 👋 Ben Flowtime yapay zeka asistanıyım. Beni odaklanma verilerini analiz etmek, verimliliğini artırmak ve akış halini derinleştirmek için kullanabilirsin. Ne merak ediyorsun?`;

    return {
        reply: welcomeMessage,
        updatedHistory: [{
            role: 'assistant',
            content: welcomeMessage,
            timestamp: new Date().toISOString(),
        }],
        updatedSummary: null,
    };
}

// ─── Main Handler ───────────────────────────────────────────

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    console.log('[Chat API] ═══════════════════════════════════════');
    console.log('[Chat API] Request received:', req.method);

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

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

    if (!message && conversationHistory.length === 0) {
        console.log('[Chat API] Handling welcome message');
        const welcomeResponse = await handleWelcome();
        return res.status(200).json(welcomeResponse);
    }

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

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
        const systemPrompt = buildSystemPrompt(conversationSummary);

        const historyForLLM = conversationHistory.map((msg: ChatMessage) => ({
            role: msg.role,
            content: msg.content,
        }));

        console.log('[Chat API] ── Calling Gemini with Tools ──');
        const assistantReply = await callGeminiWithTools(
            systemPrompt,
            message,
            historyForLLM,
            ASSISTANT_TOOLS,
            (name, args) => executeToolCall(name, args, userId),
        );
        console.log('[Chat API] Assistant reply:', assistantReply.substring(0, 200));

        const now = new Date().toISOString();
        const updatedHistory: ChatMessage[] = [
            ...conversationHistory,
            { role: 'user', content: message, timestamp: now },
            { role: 'assistant', content: assistantReply, timestamp: now },
        ];

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
                console.warn('[Chat API] Summarization failed, keeping old summary');
            }

            incrementUsage(userId);
            return res.status(200).json({
                reply: assistantReply,
                updatedHistory: updatedHistory.slice(-10),
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
