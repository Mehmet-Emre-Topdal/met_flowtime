import React from 'react';
import { useDroppable } from '@dnd-kit/core';

interface DroppableColumnProps {
    status: string;
    label: string;
    count: number;
    children: React.ReactNode;
}

const DroppableColumn = ({ status, label, count, children }: DroppableColumnProps) => {
    const { isOver, setNodeRef } = useDroppable({ id: status });

    return (
        <div
            ref={setNodeRef}
            className={`flex flex-col gap-3 p-4 rounded-xl border min-h-[400px] transition-colors duration-200
                ${isOver
                    ? 'bg-[#4F8EF7]/5 border-[#4F8EF7]/30'
                    : 'bg-[#242424] border-[#3D3D3D]'
                }`}
        >
            <div className="flex items-center justify-between pb-3 mb-1">
                <h4 className="text-sm font-medium text-[#9A9A9A] uppercase tracking-wider">{label}</h4>
                <span className="text-[10px] bg-[#3D3D3D] text-[#757575] px-2 py-0.5 rounded-md font-medium">
                    {count}
                </span>
            </div>
            <div className="flex flex-col gap-2.5 flex-1">{children}</div>
        </div>
    );
};

export default DroppableColumn;
