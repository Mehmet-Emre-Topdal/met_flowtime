import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppSelector } from '@/hooks/storeHooks';
import { useTranslation } from 'react-i18next';
import { auth } from '@/lib/firebase';
import { ChatMessage } from '@/types/assistant';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

// ─── localStorage helpers ─────────────────────────────────────

const STORAGE_KEY = (userId: string) => `flowtime_chat_${userId}`;

interface PersistedChat {
    messages: ChatMessage[];
    summary: string | null;
}

function loadChat(userId: string): PersistedChat {
    try {
        const raw = localStorage.getItem(STORAGE_KEY(userId));
        if (!raw) return { messages: [], summary: null };
        return JSON.parse(raw) as PersistedChat;
    } catch {
        return { messages: [], summary: null };
    }
}

function saveChat(userId: string, messages: ChatMessage[], summary: string | null) {
    try {
        const data: PersistedChat = { messages, summary };
        localStorage.setItem(STORAGE_KEY(userId), JSON.stringify(data));
    } catch {
        // localStorage quota exceeded — silently ignore
    }
}

// ─── Component ───────────────────────────────────────────────

const AssistantChat: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAppSelector(state => state.auth);
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [conversationSummary, setConversationSummary] = useState<string | null>(null);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [hasWelcomed, setHasWelcomed] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Load persisted chat on mount / when user changes
    useEffect(() => {
        if (!user?.uid) return;
        const persisted = loadChat(user.uid);
        if (persisted.messages.length > 0) {
            setMessages(persisted.messages);
            setConversationSummary(persisted.summary);
            setHasWelcomed(true); // don't fire welcome again if history exists
        }
    }, [user?.uid]);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const getAuthToken = async (): Promise<string | null> => {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) return null;
            return await currentUser.getIdToken();
        } catch {
            return null;
        }
    };

    const sendMessage = async (message?: string) => {
        const token = await getAuthToken();
        if (!token || !user?.uid) return;

        const body: Record<string, unknown> = {
            conversationHistory: messages,
            conversationSummary,
        };
        if (message) body.message = message;

        try {
            const res = await fetch('/api/assistant/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });

            if (res.status === 429) {
                const data = await res.json();
                const limitMsg: ChatMessage = {
                    role: 'assistant',
                    content: data.reply || t('assistant.rateLimitReached'),
                    timestamp: new Date().toISOString(),
                };
                setMessages(prev => {
                    const updated = [...prev, limitMsg];
                    saveChat(user.uid!, updated, conversationSummary);
                    return updated;
                });
                return;
            }

            if (!res.ok) throw new Error('API error');

            const data = await res.json();
            setMessages(data.updatedHistory);
            setConversationSummary(data.updatedSummary);
            saveChat(user.uid, data.updatedHistory, data.updatedSummary);
        } catch {
            const errMsg: ChatMessage = {
                role: 'assistant',
                content: t('assistant.error'),
                timestamp: new Date().toISOString(),
            };
            setMessages(prev => [...prev, errMsg]);
        }
    };

    const handleOpen = async () => {
        setIsOpen(true);
        if (!hasWelcomed && messages.length === 0) {
            setIsLoading(true);
            setHasWelcomed(true);
            await sendMessage();
            setIsLoading(false);
        }
    };

    const handleSend = async () => {
        const trimmed = inputValue.trim();
        if (!trimmed || isLoading) return;

        const userMessage: ChatMessage = {
            role: 'user',
            content: trimmed,
            timestamp: new Date().toISOString(),
        };
        setMessages(prev => {
            const updated = [...prev, userMessage];
            if (user?.uid) saveChat(user.uid, updated, conversationSummary);
            return updated;
        });
        setInputValue('');
        setIsLoading(true);

        await sendMessage(trimmed);
        setIsLoading(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const formatTime = (iso: string) => {
        const d = new Date(iso);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    return (
        <>
            {/* FAB — hidden when panel is open (panel header has its own close btn) */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        className="assistant-fab"
                        onClick={handleOpen}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        aria-label={t('assistant.toggle')}
                    >
                        <i className="pi pi-comments" />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Chat Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="assistant-panel"
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    >
                        {/* Header */}
                        <div className="assistant-panel__header">
                            <div className="assistant-panel__header-info">
                                <div className="assistant-panel__avatar">
                                    <i className="pi pi-sparkles" />
                                </div>
                                <div>
                                    <h3 className="assistant-panel__title">{t('assistant.title')}</h3>
                                    <span className="assistant-panel__status">
                                        {isLoading ? t('assistant.thinking') : t('assistant.online')}
                                    </span>
                                </div>
                            </div>
                            <button
                                className="assistant-panel__close"
                                onClick={() => setIsOpen(false)}
                                aria-label="Close"
                            >
                                <i className="pi pi-chevron-right" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="assistant-panel__messages">
                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`assistant-message assistant-message--${msg.role}`}
                                >
                                    {msg.role === 'assistant' && (
                                        <div className="assistant-message__avatar">
                                            <i className="pi pi-sparkles" />
                                        </div>
                                    )}
                                    <div className="assistant-message__bubble">
                                        {msg.role === 'assistant' ? (
                                            <div className="assistant-message__markdown">
                                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                                            </div>
                                        ) : (
                                            <p className="assistant-message__text">{msg.content}</p>
                                        )}
                                        <span className="assistant-message__time">
                                            {formatTime(msg.timestamp)}
                                        </span>
                                    </div>
                                </div>
                            ))}

                            {isLoading && (
                                <div className="assistant-message assistant-message--assistant">
                                    <div className="assistant-message__avatar">
                                        <i className="pi pi-sparkles" />
                                    </div>
                                    <div className="assistant-message__bubble assistant-message__bubble--typing">
                                        <div className="assistant-typing">
                                            <span></span>
                                            <span></span>
                                            <span></span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="assistant-panel__input-area">
                            <input
                                ref={inputRef}
                                type="text"
                                className="assistant-panel__input"
                                value={inputValue}
                                onChange={e => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={t('assistant.placeholder')}
                                disabled={isLoading}
                            />
                            <button
                                className="assistant-panel__send"
                                onClick={handleSend}
                                disabled={!inputValue.trim() || isLoading}
                                aria-label="Send"
                            >
                                <i className="pi pi-send" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default AssistantChat;
