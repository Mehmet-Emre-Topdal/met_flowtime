import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppSelector } from '@/hooks/storeHooks';
import { useTranslation } from 'react-i18next';
import { ChatMessage } from '@/types/assistant';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
    useGetChatHistoryQuery,
    useSaveChatHistoryMutation,
    useDeleteChatHistoryMutation,
    useSendChatMessageMutation,
} from '../api/assistantApi';

interface RtkError {
    status?: number;
    data?: { reply?: string };
}

const AssistantChat: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAppSelector(state => state.auth);

    const [isOpen, setIsOpen] = useState(false);
    // null = no local changes yet, fall back to persisted history
    const [sessionMessages, setSessionMessages] = useState<ChatMessage[] | null>(null);
    const [sessionSummary, setSessionSummary] = useState<string | null | undefined>(undefined);
    const [inputValue, setInputValue] = useState('');
    const [hasWelcomed, setHasWelcomed] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const { data: chatHistory, isFetching: historyFetching } = useGetChatHistoryQuery(
        undefined,
        { skip: !user?.uid }
    );
    const [triggerSave] = useSaveChatHistoryMutation();
    const [triggerDelete] = useDeleteChatHistoryMutation();
    const [triggerSend, { isLoading: isSending }] = useSendChatMessageMutation();

    // Prefer local session state; fall back to persisted history — no useEffect sync needed
    const messages: ChatMessage[] = sessionMessages ?? chatHistory?.messages ?? [];
    const conversationSummary: string | null =
        sessionSummary !== undefined ? sessionSummary : (chatHistory?.summary ?? null);

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

    const sendMessage = async (message?: string) => {
        if (!user?.uid) return;

        try {
            const data = await triggerSend({
                conversationHistory: messages,
                conversationSummary,
                ...(message ? { message } : {}),
            }).unwrap();

            setSessionMessages(data.updatedHistory);
            setSessionSummary(data.updatedSummary);
            triggerSave({ messages: data.updatedHistory, summary: data.updatedSummary });
        } catch (error) {
            const rtkError = error as RtkError;
            if (rtkError?.status === 429) {
                const limitMsg: ChatMessage = {
                    role: 'assistant',
                    content: rtkError.data?.reply || t('assistant.rateLimitReached'),
                    timestamp: new Date().toISOString(),
                };
                setSessionMessages(prev => {
                    const updated = [...(prev ?? messages), limitMsg];
                    triggerSave({ messages: updated, summary: conversationSummary });
                    return updated;
                });
            } else {
                const errMsg: ChatMessage = {
                    role: 'assistant',
                    content: t('assistant.error'),
                    timestamp: new Date().toISOString(),
                };
                setSessionMessages(prev => [...(prev ?? messages), errMsg]);
            }
        }
    };

    const handleOpen = async () => {
        setIsOpen(true);
        const hasMessages = (chatHistory?.messages?.length ?? 0) > 0 || hasWelcomed;
        if (!hasMessages && !historyFetching) {
            setHasWelcomed(true);
            await sendMessage();
        }
    };

    const handleSend = async () => {
        const trimmed = inputValue.trim();
        if (!trimmed || isSending) return;

        const userMessage: ChatMessage = {
            role: 'user',
            content: trimmed,
            timestamp: new Date().toISOString(),
        };
        setSessionMessages([...messages, userMessage]);
        setInputValue('');
        await sendMessage(trimmed);
    };

    const handleClear = async () => {
        await triggerDelete().unwrap();
        setSessionMessages([]);
        setSessionSummary(null);
        setHasWelcomed(false);
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

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="assistant-panel"
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    >
                        <div className="assistant-panel__header">
                            <div className="assistant-panel__header-info">
                                <div className="assistant-panel__avatar">
                                    <i className="pi pi-sparkles" />
                                </div>
                                <div>
                                    <h3 className="assistant-panel__title">{t('assistant.title')}</h3>
                                    <span className="assistant-panel__status">
                                        {isSending ? t('assistant.thinking') : t('assistant.online')}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {messages.length > 0 && (
                                    <button
                                        className="assistant-panel__clear"
                                        onClick={handleClear}
                                        aria-label="Clear chat"
                                    >
                                        <i className="pi pi-trash" />
                                    </button>
                                )}
                                <button
                                    className="assistant-panel__close"
                                    onClick={() => setIsOpen(false)}
                                    aria-label="Close"
                                >
                                    <i className="pi pi-chevron-right" />
                                </button>
                            </div>
                        </div>

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

                            {isSending && (
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

                        <div className="assistant-panel__input-area">
                            <input
                                ref={inputRef}
                                type="text"
                                className="assistant-panel__input"
                                value={inputValue}
                                onChange={e => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={t('assistant.placeholder')}
                                disabled={isSending}
                            />
                            <button
                                className="assistant-panel__send"
                                onClick={handleSend}
                                disabled={!inputValue.trim() || isSending}
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
