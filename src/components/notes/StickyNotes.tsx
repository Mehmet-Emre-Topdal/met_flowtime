import React, { useState, useEffect, useRef } from 'react';
import { Tooltip } from 'primereact/tooltip';

const STORAGE_KEY = 'flowtime_quick_notes';

const StickyNotes = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [note, setNote] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Dışına tıklanınca kapat
    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // localStorage'dan yükle
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) setNote(saved);
        } catch {
            // localStorage erişim hatası — sessizce geç
        }
    }, []);

    // Debounced kaydetme — her tuş vuruşunda değil, 400ms duraksama sonrası kaydet
    const handleNoteChange = (value: string) => {
        setNote(value);
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            try {
                localStorage.setItem(STORAGE_KEY, value);
            } catch {
                // quota aşıldıysa sessizce geç
            }
        }, 400);
    };

    // Açıldığında textarea'ya odaklan
    useEffect(() => {
        if (isOpen && textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.selectionStart = textareaRef.current.value.length;
        }
    }, [isOpen]);

    return (
        <div ref={containerRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
            {/* Açık Not Alanı */}
            <div
                className={`transition-all duration-300 ease-out origin-bottom-right
                    ${isOpen
                        ? 'opacity-100 scale-100 translate-y-0'
                        : 'opacity-0 scale-75 translate-y-4 pointer-events-none'
                    }`}
            >
                <div className="w-[320px] bg-[#1e1e1e]/95 backdrop-blur-xl border border-[#c5a059]/20 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[#c5a059]/10">
                        <div className="flex items-center gap-2">
                            <i className="pi pi-bookmark text-[#c5a059] text-xs" />
                            <span className="text-[11px] text-[#c5a059] uppercase tracking-[0.15em] font-semibold">
                                Quick Notes
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Bilgi ikonu */}
                            <i
                                className="pi pi-question-circle text-[#c5a059]/30 hover:text-[#c5a059]/70 text-xs cursor-help transition-colors"
                                id="notes-info-icon"
                            />
                            <Tooltip
                                target="#notes-info-icon"
                                position="left"
                                className="max-w-[240px]"
                                pt={{
                                    text: { className: 'bg-[#1e1e1e] text-[#fffdd0] text-[11px] border border-[#c5a059]/20 p-3 rounded-xl' }
                                }}
                            >
                                <span>
                                    Focus oturumu sırasında aklına gelen fikirleri hızlıca not et.
                                    Notlar tarayıcında saklanır, hesabına bağlı değildir.
                                </span>
                            </Tooltip>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="w-5 h-5 flex items-center justify-center rounded text-[#c5a059]/40 hover:text-[#c5a059] hover:bg-[#c5a059]/10 transition-colors"
                            >
                                <i className="pi pi-minus text-[10px]" />
                            </button>
                        </div>
                    </div>

                    {/* Textarea */}
                    <textarea
                        ref={textareaRef}
                        value={note}
                        onChange={(e) => handleNoteChange(e.target.value)}
                        placeholder="Focus sırasında aklına gelenleri buraya yaz..."
                        className="w-full h-[200px] bg-transparent text-[#fffdd0]/90 text-sm font-sans leading-relaxed p-4 resize-none outline-none placeholder:text-[#c5a059]/20 placeholder:italic"
                        spellCheck={false}
                    />

                    {/* Footer */}
                    <div className="flex items-center justify-between px-4 py-2 border-t border-[#c5a059]/5">
                        <span className="text-[9px] text-[#c5a059]/20 uppercase tracking-widest">
                            {note.length > 0 ? `${note.length} karakter` : 'Boş'}
                        </span>
                        <button
                            onClick={() => {
                                if (note.trim() && confirm('Tüm notları silmek istediğinden emin misin?')) {
                                    handleNoteChange('');
                                }
                            }}
                            className="text-[9px] text-red-400/30 hover:text-red-400/70 uppercase tracking-widest transition-colors"
                        >
                            Temizle
                        </button>
                    </div>
                </div>
            </div>

            {/* FAB Butonu */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`group relative w-12 h-12 rounded-full flex items-center justify-center
                    transition-all duration-300 shadow-lg
                    ${isOpen
                        ? 'bg-[#c5a059] text-[#0f172a] shadow-[#c5a059]/30 rotate-0'
                        : 'bg-[#1e1e1e]/90 border border-[#c5a059]/20 text-[#c5a059] hover:bg-[#c5a059]/10 hover:border-[#c5a059]/40 shadow-black/30'
                    }`}
            >
                <i className={`pi ${isOpen ? 'pi-times' : 'pi-pencil'} text-sm transition-transform duration-300`} />

                {/* Bildirim noktası — not varsa ve kapalıysa */}
                {!isOpen && note.trim().length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#c5a059] rounded-full border-2 border-[#0f172a] animate-pulse" />
                )}
            </button>
        </div>
    );
};

export default StickyNotes;
