import React, { useState, useEffect, useRef } from 'react';
import { Tooltip } from 'primereact/tooltip';

const STORAGE_KEY = 'flowtime_quick_notes';

const StickyNotes = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [note, setNote] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

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

    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) setNote(saved);
        } catch {
            // silently ignore
        }
    }, []);

    const handleNoteChange = (value: string) => {
        setNote(value);
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            try {
                localStorage.setItem(STORAGE_KEY, value);
            } catch {
                // silently ignore
            }
        }, 400);
    };

    useEffect(() => {
        if (isOpen && textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.selectionStart = textareaRef.current.value.length;
        }
    }, [isOpen]);

    return (
        <div ref={containerRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
            {/* Notes Panel */}
            <div
                className={`transition-all duration-200 ease-out origin-bottom-right
                    ${isOpen
                        ? 'opacity-100 scale-100 translate-y-0'
                        : 'opacity-0 scale-95 translate-y-2 pointer-events-none'
                    }`}
            >
                <div className="w-[300px] bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#27272a]">
                        <div className="flex items-center gap-2">
                            <i className="pi pi-bookmark text-[#6366f1] text-xs" />
                            <span className="text-xs text-[#a1a1aa] font-medium">
                                Quick Notes
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <i
                                className="pi pi-question-circle text-[#3f3f46] hover:text-[#71717a] text-xs cursor-help transition-colors"
                                id="notes-info-icon"
                            />
                            <Tooltip
                                target="#notes-info-icon"
                                position="left"
                                className="max-w-[240px]"
                                pt={{
                                    text: { className: 'bg-[#18181b] text-[#fafafa] text-[11px] border border-[#27272a] p-3 rounded-lg' }
                                }}
                            >
                                <span>
                                    Jot down ideas during your focus session. Notes are stored in your browser, not tied to your account.
                                </span>
                            </Tooltip>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="w-5 h-5 flex items-center justify-center rounded text-[#3f3f46] hover:text-[#a1a1aa] hover:bg-[#27272a] transition-colors"
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
                        placeholder="Write your thoughts here..."
                        className="w-full h-[180px] bg-transparent text-[#fafafa]/90 text-sm leading-relaxed p-4 resize-none outline-none placeholder:text-[#3f3f46]"
                        spellCheck={false}
                    />

                    {/* Footer */}
                    <div className="flex items-center justify-between px-4 py-2 border-t border-[#27272a]">
                        <span className="text-[9px] text-[#3f3f46] tabular-nums">
                            {note.length > 0 ? `${note.length} chars` : 'Empty'}
                        </span>
                        <button
                            onClick={() => {
                                if (note.trim() && confirm('Clear all notes?')) {
                                    handleNoteChange('');
                                }
                            }}
                            className="text-[9px] text-red-400/30 hover:text-red-400 uppercase tracking-wider transition-colors font-medium"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            </div>

            {/* FAB Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative w-11 h-11 rounded-lg flex items-center justify-center
                    transition-all duration-200
                    ${isOpen
                        ? 'bg-[#6366f1] text-white'
                        : 'bg-[#18181b] border border-[#27272a] text-[#71717a] hover:bg-[#27272a] hover:text-[#a1a1aa]'
                    }`}
            >
                <i className={`pi ${isOpen ? 'pi-times' : 'pi-pencil'} text-sm transition-transform duration-200`} />

                {!isOpen && note.trim().length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#6366f1] rounded-full border-2 border-[#09090b]" />
                )}
            </button>
        </div>
    );
};

export default StickyNotes;
