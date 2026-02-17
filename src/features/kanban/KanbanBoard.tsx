import React, { useState } from 'react';
import {
    useGetTasksQuery,
    useUpdateTaskStatusMutation,
    useCreateTaskMutation,
    useUpdateTaskMutation,
    useArchiveTaskMutation,
} from './api/tasksApi';
import { useAppSelector, useAppDispatch } from '@/hooks/storeHooks';
import { setSelectedTaskId } from './slices/taskSlice';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { TaskDto, TaskStatus } from '@/types/task';
import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    DragEndEvent,
    DragStartEvent,
    useDroppable,
    rectIntersection,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToWindowEdges, snapCenterToCursor } from '@dnd-kit/modifiers';

/* ─── Sürüklenebilir Kart ─── */
const SortableTaskCard = ({
    task,
    isSelected,
    onClick,
    onEdit,
    onArchive,
}: {
    task: TaskDto;
    isSelected: boolean;
    onClick: () => void;
    onEdit: () => void;
    onArchive: () => void;
}) => {
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
                className={`relative p-4 rounded-xl cursor-grab active:cursor-grabbing border bg-[#1e1e1e]/60 group
                    ${isSelected ? 'border-[#c5a059]' : 'border-[#c5a059]/10 hover:border-[#c5a059]/30'}`}
                onClick={onClick}
            >
                {/* Aksiyon Butonları — hover'da görünür */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        className="w-6 h-6 flex items-center justify-center rounded bg-[#c5a059]/10 hover:bg-[#c5a059]/30 text-[#c5a059] transition-colors"
                        title="Edit"
                    >
                        <i className="pi pi-pencil text-[10px]" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onArchive(); }}
                        className="w-6 h-6 flex items-center justify-center rounded bg-red-500/10 hover:bg-red-500/30 text-red-400 transition-colors"
                        title="Archive"
                    >
                        <i className="pi pi-trash text-[10px]" />
                    </button>
                </div>

                <h5 className="font-serif text-[#fffdd0] text-sm leading-tight select-none pr-14">
                    {task.title}
                </h5>
                <div className="flex items-center gap-2 text-[10px] text-[#c5a059]/60 mt-2">
                    <i className="pi pi-clock text-[9px]" />
                    <span>{task.totalFocusedTime} mins focused</span>
                </div>
            </div>
        </div>
    );
};

/* ─── Bırakılabilir Kolon ─── */
const DroppableColumn = ({
    status,
    label,
    count,
    children,
}: {
    status: string;
    label: string;
    count: number;
    children: React.ReactNode;
}) => {
    const { isOver, setNodeRef } = useDroppable({ id: status });

    return (
        <div
            ref={setNodeRef}
            className={`flex flex-col gap-4 p-4 rounded-2xl border min-h-[400px] transition-colors duration-200
                ${isOver
                    ? 'bg-[#c5a059]/10 border-[#c5a059]/40'
                    : 'bg-[#1e1e1e]/20 border-[#d4af3710]'
                }`}
        >
            <div className="flex items-center justify-between border-b border-[#c5a059]/10 pb-3 mb-2">
                <h4 className="font-serif text-[#c5a059] tracking-wider">{label}</h4>
                <span className="text-[10px] bg-[#c5a059]/10 text-[#c5a059] px-2 py-1 rounded-full">
                    {count}
                </span>
            </div>
            <div className="flex flex-col gap-4 flex-1">{children}</div>
        </div>
    );
};

/* ─── Ana Board ─── */
const KanbanBoard = () => {
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);
    const { selectedTaskId } = useAppSelector((state) => state.task);
    const { data: tasks = [], isLoading } = useGetTasksQuery(user?.uid || '', {
        skip: !user?.uid,
    });

    const [updateTaskStatus] = useUpdateTaskStatusMutation();
    const [createTask] = useCreateTaskMutation();
    const [updateTask] = useUpdateTaskMutation();
    const [archiveTask] = useArchiveTaskMutation();

    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [newTask, setNewTask] = useState({ title: '', description: '', status: 'todo' as TaskStatus });

    // Edit dialog state
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editingTask, setEditingTask] = useState<{ id: string; title: string; description: string } | null>(null);

    const [activeId, setActiveId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleCreateTask = async () => {
        if (!user?.uid || !newTask.title) return;
        try {
            await createTask({ userId: user.uid, task: newTask, order: tasks.length }).unwrap();
            setShowCreateDialog(false);
            setNewTask({ title: '', description: '', status: 'todo' });
        } catch (e) {
            console.error(e);
        }
    };

    const handleEditTask = (task: TaskDto) => {
        setEditingTask({ id: task.id, title: task.title, description: task.description });
        setShowEditDialog(true);
    };

    const handleSaveEdit = async () => {
        if (!editingTask || !editingTask.title.trim()) return;
        try {
            await updateTask({
                taskId: editingTask.id,
                updates: { title: editingTask.title, description: editingTask.description },
            }).unwrap();
            setShowEditDialog(false);
            setEditingTask(null);
        } catch (e) {
            console.error(e);
        }
    };

    const handleArchiveTask = (task: TaskDto) => {
        confirmDialog({
            message: `"${task.title}" arşivlenecek. Focus verileri korunacak. Devam edilsin mi?`,
            header: 'Görevi Arşivle',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'bg-red-500 text-white border-red-500 px-4 py-2 rounded-lg ml-2',
            rejectClassName: 'border border-[#c5a059]/30 text-[#c5a059] px-4 py-2 rounded-lg',
            accept: async () => {
                try {
                    await archiveTask({ taskId: task.id }).unwrap();
                    if (selectedTaskId === task.id) {
                        dispatch(setSelectedTaskId(null));
                    }
                } catch (e) {
                    console.error(e);
                }
            },
        });
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        if (!over) return;

        const taskId = active.id as string;
        const overId = over.id as string;

        let newStatus: TaskStatus | null = null;
        if (['todo', 'inprogress', 'done'].includes(overId)) {
            newStatus = overId as TaskStatus;
        } else {
            const overTask = tasks.find((t) => t.id === overId);
            if (overTask) newStatus = overTask.status;
        }

        const taskToUpdate = tasks.find((t) => t.id === taskId);
        if (taskToUpdate && newStatus && taskToUpdate.status !== newStatus) {
            try {
                await updateTaskStatus({ taskId, status: newStatus }).unwrap();
            } catch (e) {
                console.error('Status update failed:', e);
            }
        }
    };

    const columns: { label: string; status: TaskStatus }[] = [
        { label: 'To Do', status: 'todo' },
        { label: 'In Progress', status: 'inprogress' },
        { label: 'Done', status: 'done' },
    ];

    if (isLoading) {
        return (
            <div className="text-[#c5a059] font-serif text-center mt-10 tracking-widest animate-pulse">
                Consulting the Records...
            </div>
        );
    }

    const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

    return (
        <div className="flex flex-col gap-8 w-full overflow-hidden">
            <ConfirmDialog />

            {/* Header */}
            <header className="flex justify-between items-center bg-[#1e1e1e]/40 p-6 rounded-2xl border border-[#c5a059]/10 backdrop-blur-md">
                <div className="flex flex-col gap-1">
                    <h3 className="font-serif text-xl text-[#fffdd0]">Active Operations</h3>
                    <p className="text-[10px] text-[#c5a059]/50 uppercase tracking-[0.2em]">
                        Manage your focus directives
                    </p>
                </div>
                <Button
                    label="New Directive"
                    icon="pi pi-plus"
                    onClick={() => setShowCreateDialog(true)}
                    className="p-button-text p-button-sm text-[#c5a059] border border-[#c5a059]/30 hover:bg-[#c5a059]/10 px-4 py-2 rounded-lg"
                />
            </header>

            {/* DnD Board */}
            <DndContext
                sensors={sensors}
                collisionDetection={rectIntersection}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToWindowEdges, snapCenterToCursor]}
            >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
                    {columns.map((col) => {
                        const colTasks = tasks.filter((t) => t.status === col.status);
                        return (
                            <DroppableColumn
                                key={col.status}
                                status={col.status}
                                label={col.label}
                                count={colTasks.length}
                            >
                                <SortableContext
                                    id={col.status}
                                    items={colTasks.map((t) => t.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {colTasks.map((task) => (
                                        <SortableTaskCard
                                            key={task.id}
                                            task={task}
                                            isSelected={selectedTaskId === task.id}
                                            onClick={() =>
                                                dispatch(
                                                    setSelectedTaskId(
                                                        task.id === selectedTaskId ? null : task.id
                                                    )
                                                )
                                            }
                                            onEdit={() => handleEditTask(task)}
                                            onArchive={() => handleArchiveTask(task)}
                                        />
                                    ))}
                                </SortableContext>
                            </DroppableColumn>
                        );
                    })}
                </div>

                <DragOverlay dropAnimation={null}>
                    {activeTask ? (
                        <div className="p-4 rounded-xl border border-[#c5a059] bg-[#1e1e1e] shadow-2xl shadow-[#c5a059]/20 opacity-90 rotate-2 pointer-events-none w-[250px]">
                            <h5 className="font-serif text-[#fffdd0] text-sm leading-tight">
                                {activeTask.title}
                            </h5>
                            <div className="flex items-center gap-2 text-[10px] text-[#c5a059]/60 mt-2">
                                <i className="pi pi-clock text-[9px]" />
                                <span>{activeTask.totalFocusedTime} mins focused</span>
                            </div>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* ─── Create Dialog ─── */}
            <Dialog
                header="New Mission Directive"
                visible={showCreateDialog}
                onHide={() => setShowCreateDialog(false)}
                className="w-full max-w-lg bg-[#1e1e1e]/90 backdrop-blur-xl border border-[#c5a059]/30"
                pt={{
                    header: { className: 'bg-transparent text-[#fffdd0] font-serif border-b border-[#c5a059]/10 p-6' },
                    content: { className: 'p-6 bg-transparent' },
                    footer: { className: 'p-6 bg-transparent border-t border-[#c5a059]/10' },
                }}
            >
                <div className="flex flex-col gap-6 mt-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] text-[#c5a059] uppercase tracking-widest">Directive Title</label>
                        <InputText
                            value={newTask.title}
                            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                            className="bg-[#0f172a]/50 border-[#c5a059]/20 text-[#fffdd0] focus:border-[#c5a059]"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] text-[#c5a059] uppercase tracking-widest">Description</label>
                        <InputTextarea
                            value={newTask.description}
                            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                            rows={3}
                            className="bg-[#0f172a]/50 border-[#c5a059]/20 text-[#fffdd0] focus:border-[#c5a059]"
                        />
                    </div>
                    <Button
                        label="Inscribe Directive"
                        onClick={handleCreateTask}
                        className="bg-[#c5a059] text-[#0f172a] font-serif py-3 rounded-lg hover:bg-[#b59049]"
                    />
                </div>
            </Dialog>

            {/* ─── Edit Dialog ─── */}
            <Dialog
                header="Edit Directive"
                visible={showEditDialog}
                onHide={() => { setShowEditDialog(false); setEditingTask(null); }}
                className="w-full max-w-lg bg-[#1e1e1e]/90 backdrop-blur-xl border border-[#c5a059]/30"
                pt={{
                    header: { className: 'bg-transparent text-[#fffdd0] font-serif border-b border-[#c5a059]/10 p-6' },
                    content: { className: 'p-6 bg-transparent' },
                    footer: { className: 'p-6 bg-transparent border-t border-[#c5a059]/10' },
                }}
            >
                {editingTask && (
                    <div className="flex flex-col gap-6 mt-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] text-[#c5a059] uppercase tracking-widest">Title</label>
                            <InputText
                                value={editingTask.title}
                                onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                                className="bg-[#0f172a]/50 border-[#c5a059]/20 text-[#fffdd0] focus:border-[#c5a059]"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] text-[#c5a059] uppercase tracking-widest">Description</label>
                            <InputTextarea
                                value={editingTask.description}
                                onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                                rows={3}
                                className="bg-[#0f172a]/50 border-[#c5a059]/20 text-[#fffdd0] focus:border-[#c5a059]"
                            />
                        </div>
                        <Button
                            label="Save Changes"
                            icon="pi pi-check"
                            onClick={handleSaveEdit}
                            className="bg-[#c5a059] text-[#0f172a] font-serif py-3 rounded-lg hover:bg-[#b59049]"
                        />
                    </div>
                )}
            </Dialog>
        </div>
    );
};

export default KanbanBoard;
