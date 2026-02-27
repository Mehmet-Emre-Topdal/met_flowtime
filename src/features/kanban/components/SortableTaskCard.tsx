import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskDto } from '@/types/task';
import { useTranslation } from 'react-i18next';

interface SortableTaskCardProps {
    task: TaskDto;
    isSelected: boolean;
    onClick: () => void;
    onEdit: () => void;
    onArchive: () => void;
}

const SortableTaskCard = ({ task, isSelected, onClick, onEdit, onArchive }: SortableTaskCardProps) => {
    const { t } = useTranslation();
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: task.id });

    const style: React.CSSProperties = {
        transform: CSS.Translate.toString(transform),
        transition: isDragging ? 'none' : transition ?? undefined,
        opacity: isDragging ? 0.2 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none">
            <div
                className={`relative p-3.5 rounded-lg cursor-grab active:cursor-grabbing border bg-[#2E2E2E] group transition-colors overflow-hidden
                    ${isSelected ? 'border-[#4F8EF7]' : 'border-[#3D3D3D] hover:border-[#353535]'}`}
                onClick={onClick}
            >
                <div className="absolute top-2 right-2 flex gap-1.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity z-20">
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        className="w-8 h-8 sm:w-7 sm:h-7 lg:w-6 lg:h-6 flex items-center justify-center rounded bg-[#3D3D3D] hover:bg-[#353535] text-[#9A9A9A] hover:text-[#F0F0F0] transition-colors"
                        title={t("common.edit")}
                    >
                        <i className="pi pi-pencil text-xs lg:text-[10px]" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onArchive(); }}
                        className="w-8 h-8 sm:w-7 sm:h-7 lg:w-6 lg:h-6 flex items-center justify-center rounded bg-[#3D3D3D] hover:bg-red-500/20 text-[#9A9A9A] hover:text-red-400 transition-colors"
                        title={t("common.delete")}
                    >
                        <i className="pi pi-trash text-xs lg:text-[10px]" />
                    </button>
                </div>

                <div className="flex items-center gap-2 mb-1 overflow-hidden">
                    <h5 className="text-[#F0F0F0] text-sm leading-tight select-none pr-16 font-medium truncate">
                        {task.title}
                    </h5>
                    {task.isDaily && (
                        <span className="text-[9px] text-[#34C774] border border-[#4F8EF7]/30 bg-[#4F8EF7]/5 rounded px-1.5 py-0.5 font-semibold uppercase tracking-wider shrink-0">
                            {t("tasks.daily")}
                        </span>
                    )}
                </div>
                {task.description && (
                    <p className="text-xs text-[#757575]/70 mt-1 leading-relaxed select-none overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {task.description}
                    </p>
                )}
                <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1.5 text-[10px] text-[#757575]">
                        <i className="pi pi-clock text-[9px]" />
                        <span>{task.totalFocusedTime} {t("tasks.focused")}</span>
                    </div>
                    {isSelected && (
                        <div className="flex items-center gap-1 ml-2 bg-[#4F8EF7]/10 px-1.5 py-0.5 rounded">
                            <span className="text-[9px] text-[#4F8EF7] font-medium">{t("tasks.focusing")}</span>
                            <i className="pi pi-bolt text-[#4F8EF7] text-[9px] animate-pulse"></i>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SortableTaskCard;
