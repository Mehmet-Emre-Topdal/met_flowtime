import React, { useState } from 'react';
import {
    useGetTasksQuery,
    useUpdateTaskStatusMutation,
    useCreateTaskMutation,
    useUpdateTaskMutation,
    useArchiveTaskMutation,
    tasksApi,
} from './api/tasksApi';
import { useAppSelector, useAppDispatch } from '@/hooks/storeHooks';
import { setSelectedTaskId } from './slices/taskSlice';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Checkbox } from 'primereact/checkbox';
import { Tooltip } from 'primereact/tooltip';
import { TaskDto, TaskStatus } from '@/types/task';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
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
    arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToWindowEdges, snapCenterToCursor } from '@dnd-kit/modifiers';

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
                className={`relative p-3.5 rounded-lg cursor-grab active:cursor-grabbing border bg-[#18181b] group transition-colors overflow-hidden
                    ${isSelected ? 'border-[#6366f1]' : 'border-[#27272a] hover:border-[#3f3f46]'}`}
                onClick={onClick}
            >
                <div className="absolute top-2.5 right-2.5 flex gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity z-20">
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        className="w-6 h-6 flex items-center justify-center rounded bg-[#27272a] hover:bg-[#3f3f46] text-[#a1a1aa] hover:text-[#fafafa] transition-colors"
                        title={t("common.edit")}
                    >
                        <i className="pi pi-pencil text-[10px]" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onArchive(); }}
                        className="w-6 h-6 flex items-center justify-center rounded bg-[#27272a] hover:bg-red-500/20 text-[#a1a1aa] hover:text-red-400 transition-colors"
                        title={t("common.delete")}
                    >
                        <i className="pi pi-trash text-[10px]" />
                    </button>
                </div>

                <div className="flex items-center gap-2 mb-1 overflow-hidden">
                    <h5 className="text-[#fafafa] text-sm leading-tight select-none pr-14 font-medium truncate">
                        {task.title}
                    </h5>
                    {task.isDaily && (
                        <span className="text-[9px] text-[#818cf8] border border-[#6366f1]/30 bg-[#6366f1]/5 rounded px-1.5 py-0.5 font-semibold uppercase tracking-wider shrink-0">
                            {t("tasks.daily")}
                        </span>
                    )}
                </div>
                {task.description && (
                    <p className="text-xs text-[#71717a]/70 mt-1 leading-relaxed select-none overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {task.description}
                    </p>
                )}
                <div className="flex items-center gap-1.5 text-[10px] text-[#71717a] mt-2">
                    <i className="pi pi-clock text-[9px]" />
                    <span>{task.totalFocusedTime} {t("tasks.focused")}</span>
                </div>
            </div>
        </div>
    );
};

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
            className={`flex flex-col gap-3 p-4 rounded-xl border min-h-[400px] transition-colors duration-200
                ${isOver
                    ? 'bg-[#6366f1]/5 border-[#6366f1]/30'
                    : 'bg-[#09090b] border-[#27272a]'
                }`}
        >
            <div className="flex items-center justify-between pb-3 mb-1">
                <h4 className="text-sm font-medium text-[#a1a1aa] uppercase tracking-wider">{label}</h4>
                <span className="text-[10px] bg-[#27272a] text-[#71717a] px-2 py-0.5 rounded-md font-medium">
                    {count}
                </span>
            </div>
            <div className="flex flex-col gap-2.5 flex-1">{children}</div>
        </div>
    );
};

interface KanbanBoardProps {
    filterDaily: boolean;
}

const KanbanBoard = ({ filterDaily }: KanbanBoardProps) => {
    const { t } = useTranslation();
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
    const [newTask, setNewTask] = useState({ title: '', description: '', status: 'todo' as TaskStatus, isDaily: false });
    const [hideCompleted, setHideCompleted] = useState(false);

    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editingTask, setEditingTask] = useState<{ id: string; title: string; description: string; isDaily: boolean } | null>(null);

    const [activeId, setActiveId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const filteredTasks = tasks.filter((t: TaskDto) => {
        if (filterDaily && !t.isDaily) return false;
        if (hideCompleted && t.status === 'done') return false;
        return true;
    });

    const handleCreateTask = async () => {
        if (!user?.uid || !newTask.title) return;
        try {
            await createTask({ userId: user.uid, task: newTask, order: tasks.length }).unwrap();
            setShowCreateDialog(false);
            setNewTask({ title: '', description: '', status: 'todo', isDaily: false });
        } catch (e) {
            console.error(e);
        }
    };

    const handleEditTask = (task: TaskDto) => {
        setEditingTask({ id: task.id, title: task.title, description: task.description, isDaily: task.isDaily });
        setShowEditDialog(true);
    };

    const handleSaveEdit = async () => {
        if (!editingTask || !editingTask.title.trim()) return;
        try {
            await updateTask({
                taskId: editingTask.id,
                updates: { title: editingTask.title, description: editingTask.description, isDaily: editingTask.isDaily },
            }).unwrap();
            setShowEditDialog(false);
            setEditingTask(null);
        } catch (e) {
            console.error(e);
        }
    };

    const handleArchiveTask = (task: TaskDto) => {
        confirmDialog({
            message: `"${task.title}" ${t("tasks.archiveConfirm")}`,
            header: t("tasks.archiveHeader"),
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'bg-red-500 text-white border-red-500 px-4 py-2 rounded-lg ml-2',
            rejectClassName: 'border border-[#27272a] text-[#a1a1aa] px-4 py-2 rounded-lg',
            acceptLabel: t("common.delete"),
            rejectLabel: t("common.cancel"),
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
        const activeTask = tasks.find((t: TaskDto) => t.id === taskId);
        if (!activeTask) return;

        // Determine destination status
        let newStatus: TaskStatus | null = null;
        if (['todo', 'inprogress', 'done'].includes(overId)) {
            newStatus = overId as TaskStatus;
        } else {
            const overTask = tasks.find((t: TaskDto) => t.id === overId);
            if (overTask) newStatus = overTask.status;
        }

        if (!newStatus) return;

        const isSameColumn = activeTask.status === newStatus;
        const columnTasks = tasks
            .filter((t: TaskDto) => t.status === newStatus && !t.isArchived)
            .sort((a: TaskDto, b: TaskDto) => a.order - b.order);

        if (isSameColumn) {
            if (taskId === overId) return;

            const oldIndex = columnTasks.findIndex(t => t.id === taskId);
            const newIndex = columnTasks.findIndex(t => t.id === overId);

            if (oldIndex !== -1 && newIndex !== -1) {
                const movedTasks = arrayMove(columnTasks, oldIndex, newIndex);

                // Calculate new order for the moved task
                let newOrder: number;
                if (newIndex === 0) {
                    newOrder = movedTasks[1].order - 1;
                } else if (newIndex === movedTasks.length - 1) {
                    newOrder = movedTasks[movedTasks.length - 2].order + 1;
                } else {
                    newOrder = (movedTasks[newIndex - 1].order + movedTasks[newIndex + 1].order) / 2;
                }

                if (user?.uid) {
                    const patchResult = dispatch(
                        tasksApi.util.updateQueryData("getTasks", user.uid, (draft: TaskDto[]) => {
                            const task = draft.find(t => t.id === taskId);
                            if (task) {
                                task.order = newOrder;
                                draft.sort((a, b) => a.order - b.order);
                            }
                        })
                    );

                    try {
                        await updateTask({
                            taskId,
                            updates: {
                                ...editingTask, // Use spread if available, but let's be explicit
                                title: activeTask.title,
                                description: activeTask.description,
                                isDaily: activeTask.isDaily,
                                order: newOrder
                            } as any
                        }).unwrap();
                    } catch (e) {
                        patchResult.undo();
                        console.error("Failed to reorder task:", e);
                    }
                }
            }
        } else {
            // Moving to a different column
            const overIndex = ['todo', 'inprogress', 'done'].includes(overId)
                ? columnTasks.length // dropped on column header/empty space
                : columnTasks.findIndex((t: TaskDto) => t.id === overId);

            let newOrder: number;
            if (columnTasks.length === 0) {
                newOrder = 0;
            } else if (overIndex === -1 || overIndex >= columnTasks.length) {
                newOrder = columnTasks[columnTasks.length - 1].order + 1;
            } else if (overIndex === 0) {
                newOrder = columnTasks[0].order - 1;
            } else {
                newOrder = (columnTasks[overIndex - 1].order + columnTasks[overIndex].order) / 2;
            }

            if (user?.uid) {
                const patchResult = dispatch(
                    tasksApi.util.updateQueryData("getTasks", user.uid, (draft: TaskDto[]) => {
                        const task = draft.find(t => t.id === taskId);
                        if (task) {
                            task.status = newStatus;
                            task.order = newOrder;
                            draft.sort((a, b) => a.order - b.order);
                        }
                    })
                );

                try {
                    await updateTask({
                        taskId,
                        updates: {
                            title: activeTask.title,
                            description: activeTask.description,
                            isDaily: activeTask.isDaily,
                            status: newStatus,
                            order: newOrder
                        } as any
                    }).unwrap();
                } catch (e) {
                    patchResult.undo();
                    console.error("Failed to move task to new column:", e);
                }
            }
        }
    };

    const columns: { label: string; status: TaskStatus }[] = [
        { label: t("tasks.toDo"), status: 'todo' },
        { label: t("tasks.inProgress"), status: 'inprogress' },
        ...(hideCompleted ? [] : [{ label: t("tasks.done"), status: 'done' as TaskStatus }]),
    ];

    if (isLoading) {
        return (
            <div className="text-[#71717a] text-sm text-center mt-10 animate-pulse">
                {t("tasks.loadingTasks")}
            </div>
        );
    }

    const activeTask = activeId ? filteredTasks.find((t) => t.id === activeId) : null;

    return (
        <div className="flex flex-col gap-6 w-full overflow-hidden">
            <ConfirmDialog />

            <header className="flex justify-between items-center p-5 rounded-xl border border-[#27272a] bg-[#18181b]">
                <div className="flex flex-col gap-0.5">
                    <h3 className="text-base font-semibold text-[#fafafa]">{t("tasks.boardView")}</h3>
                    <p className="text-xs text-[#71717a]">
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            inputId="hide-completed-kanban"
                            checked={hideCompleted}
                            onChange={(e) => setHideCompleted(e.checked ?? false)}
                            className="w-4 h-4 border-[#3f3f46] rounded-sm"
                        />
                        <label htmlFor="hide-completed-kanban" className="text-xs text-[#a1a1aa] cursor-pointer hover:text-[#fafafa] transition-colors select-none">
                            {t("tasks.hideDoneTasks")}
                        </label>
                    </div>
                    <Button
                        label={t("tasks.newTask")}
                        icon="pi pi-plus"
                        onClick={() => setShowCreateDialog(true)}
                        className="p-button-sm bg-[#6366f1] border-none text-white hover:bg-[#4f46e5] px-4 py-2 rounded-lg text-xs font-medium"
                    />
                </div>
            </header>

            <DndContext
                sensors={sensors}
                collisionDetection={rectIntersection}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToWindowEdges, snapCenterToCursor]}
            >
                <div className={`grid grid-cols-1 ${hideCompleted ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-4 overflow-hidden`}>
                    {columns.map((col) => {
                        const colTasks = filteredTasks.filter((t: TaskDto) => t.status === col.status);
                        return (
                            <DroppableColumn
                                key={col.status}
                                status={col.status}
                                label={col.label}
                                count={colTasks.length}
                            >
                                <SortableContext
                                    id={col.status}
                                    items={colTasks.map((t: TaskDto) => t.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <AnimatePresence mode="popLayout" initial={false}>
                                        {colTasks.map((task) => (
                                            <motion.div
                                                key={task.id}
                                                layout="position"
                                                initial={{ opacity: 0, scale: 0.98 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.98 }}
                                                transition={{
                                                    opacity: { duration: 0.2 },
                                                    layout: { duration: 0.2, ease: "easeInOut" }
                                                }}
                                            >
                                                <SortableTaskCard
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
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </SortableContext>
                            </DroppableColumn>
                        );
                    })}
                </div>

                <DragOverlay dropAnimation={null}>
                    {activeTask ? (
                        <div className="p-3.5 rounded-lg border border-[#6366f1] bg-[#18181b] opacity-90 rotate-1 pointer-events-none w-[250px]">
                            <h5 className="text-[#fafafa] text-sm leading-tight font-medium">
                                {activeTask.title}
                            </h5>
                            <div className="flex items-center gap-1.5 text-[10px] text-[#71717a] mt-2">
                                <i className="pi pi-clock text-[9px]" />
                                <span>{activeTask.totalFocusedTime} {t("tasks.focused")}</span>
                            </div>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            <Dialog
                header={t("tasks.newTask")}
                visible={showCreateDialog}
                onHide={() => setShowCreateDialog(false)}
                className="w-full max-w-lg bg-[#18181b] border border-[#27272a]"
                pt={{
                    header: { className: 'bg-[#18181b] text-[#fafafa] border-b border-[#27272a] p-5' },
                    content: { className: 'p-5 bg-[#18181b]' },
                    footer: { className: 'p-5 bg-[#18181b] border-t border-[#27272a]' },
                }}
            >
                <div className="flex flex-col gap-5 mt-2">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-[#71717a] font-medium">{t("tasks.titleLabel")}</label>
                        <InputText
                            value={newTask.title}
                            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
                            className="bg-[#09090b] border-[#27272a] text-[#fafafa] focus:border-[#6366f1]"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-[#71717a] font-medium">{t("tasks.descriptionLabel")}</label>
                        <InputTextarea
                            value={newTask.description}
                            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                            rows={3}
                            className="bg-[#09090b] border-[#27272a] text-[#fafafa] focus:border-[#6366f1]"
                        />
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-[#27272a] bg-[#09090b]">
                        <Checkbox
                            inputId="kanban-daily-toggle"
                            checked={newTask.isDaily}
                            onChange={(e) => setNewTask({ ...newTask, isDaily: e.checked ?? false })}
                            className="daily-checkbox"
                        />
                        <label htmlFor="kanban-daily-toggle" className="text-xs text-[#a1a1aa] font-medium cursor-pointer select-none">
                            {t("tasks.dailyToggle")}
                        </label>
                        <i
                            className="pi pi-question-circle text-[#3f3f46] hover:text-[#71717a] text-xs cursor-help transition-colors ml-auto"
                            id="kanban-daily-tooltip-icon"
                        />
                        <Tooltip
                            target="#kanban-daily-tooltip-icon"
                            position="top"
                            pt={{ text: { className: 'bg-[#18181b] text-[#fafafa] text-[11px] border border-[#27272a] p-3 rounded-lg' } }}
                        >
                            {t("tasks.dailyTooltip")}
                        </Tooltip>
                    </div>
                    <Button
                        label={t("tasks.createTask")}
                        onClick={handleCreateTask}
                        className="bg-[#6366f1] border-none text-white py-2.5 rounded-lg hover:bg-[#4f46e5] font-medium"
                    />
                </div>
            </Dialog>

            <Dialog
                header={t("tasks.editTask")}
                visible={showEditDialog}
                onHide={() => { setShowEditDialog(false); setEditingTask(null); }}
                className="w-full max-w-lg bg-[#18181b] border border-[#27272a]"
                pt={{
                    header: { className: 'bg-[#18181b] text-[#fafafa] border-b border-[#27272a] p-5' },
                    content: { className: 'p-5 bg-[#18181b]' },
                    footer: { className: 'p-5 bg-[#18181b] border-t border-[#27272a]' },
                }}
            >
                {editingTask && (
                    <div className="flex flex-col gap-5 mt-2">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-[#71717a] font-medium">{t("tasks.titleLabel")}</label>
                            <InputText
                                value={editingTask.title}
                                onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                                className="bg-[#09090b] border-[#27272a] text-[#fafafa] focus:border-[#6366f1]"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-[#71717a] font-medium">{t("tasks.descriptionLabel")}</label>
                            <InputTextarea
                                value={editingTask.description}
                                onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                                rows={3}
                                className="bg-[#09090b] border-[#27272a] text-[#fafafa] focus:border-[#6366f1]"
                            />
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg border border-[#27272a] bg-[#09090b]">
                            <Checkbox
                                inputId="kanban-edit-daily-toggle"
                                checked={editingTask.isDaily}
                                onChange={(e) => setEditingTask({ ...editingTask, isDaily: e.checked ?? false })}
                                className="daily-checkbox"
                            />
                            <label htmlFor="kanban-edit-daily-toggle" className="text-xs text-[#a1a1aa] font-medium cursor-pointer select-none">
                                {t("tasks.dailyToggle")}
                            </label>
                            <i
                                className="pi pi-question-circle text-[#3f3f46] hover:text-[#71717a] text-xs cursor-help transition-colors ml-auto"
                                id="kanban-edit-daily-tooltip-icon"
                            />
                            <Tooltip
                                target="#kanban-edit-daily-tooltip-icon"
                                position="top"
                                pt={{ text: { className: 'bg-[#18181b] text-[#fafafa] text-[11px] border border-[#27272a] p-3 rounded-lg' } }}
                            >
                                {t("tasks.dailyTooltip")}
                            </Tooltip>
                        </div>
                        <Button
                            label={t("tasks.saveChanges")}
                            icon="pi pi-check"
                            onClick={handleSaveEdit}
                            className="bg-[#6366f1] border-none text-white py-2.5 rounded-lg hover:bg-[#4f46e5] font-medium"
                        />
                    </div>
                )}
            </Dialog>
        </div >
    );
};

export default KanbanBoard;
