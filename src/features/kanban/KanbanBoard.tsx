import React, { useState } from 'react';
import { tasksApi } from './api/tasksApi';
import { Button } from 'primereact/button';
import { ConfirmDialog } from 'primereact/confirmdialog';
import { TaskDto, TaskStatus } from '@/types/task';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Checkbox } from 'primereact/checkbox';
import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    DragEndEvent,
    DragStartEvent,
    rectIntersection,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    arrayMove,
} from '@dnd-kit/sortable';
import { restrictToWindowEdges, snapCenterToCursor } from '@dnd-kit/modifiers';
import SortableTaskCard from './components/SortableTaskCard';
import DroppableColumn from './components/DroppableColumn';
import CreateTaskDialog from './components/CreateTaskDialog';
import EditTaskDialog from './components/EditTaskDialog';
import { useTaskCRUD } from './hooks/useTaskCRUD';
import { setSelectedTaskId } from './slices/taskSlice';

interface KanbanBoardProps {
    filterDaily: boolean;
}

const KanbanBoard = ({ filterDaily }: KanbanBoardProps) => {
    const { t } = useTranslation();
    const {
        user,
        tasks,
        isLoading,
        selectedTaskId,
        dispatch,
        updateTask,
        showCreateDialog, setShowCreateDialog,
        newTask, setNewTask,
        showEditDialog, setShowEditDialog,
        editingTask, setEditingTask,
        handleCreateTask,
        handleEditTask,
        handleSaveEdit,
        handleArchiveTask,
    } = useTaskCRUD();

    const [hideCompleted, setHideCompleted] = useState(false);
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
            <div className="text-[#757575] text-sm text-center mt-10 animate-pulse">
                {t("tasks.loadingTasks")}
            </div>
        );
    }

    const activeTask = activeId ? filteredTasks.find((t) => t.id === activeId) : null;

    return (
        <div className="flex flex-col gap-6 w-full overflow-hidden">
            <ConfirmDialog />

            <header className="flex justify-between items-center p-4 sm:p-5 rounded-xl border border-[#3D3D3D] bg-[#2E2E2E] gap-2">
                <div className="flex flex-col gap-0.5 min-w-0">
                    <h3 className="text-sm sm:text-base font-semibold text-[#F0F0F0] truncate">{t("tasks.boardView")}</h3>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            inputId="hide-completed-kanban"
                            checked={hideCompleted}
                            onChange={(e) => setHideCompleted(e.checked ?? false)}
                            className="w-4 h-4 border-[#353535] rounded-sm"
                        />
                        <label htmlFor="hide-completed-kanban" className="hidden sm:block text-xs text-[#9A9A9A] cursor-pointer hover:text-[#F0F0F0] transition-colors select-none">
                            {t("tasks.hideDoneTasks")}
                        </label>
                    </div>
                    <Button
                        label={t("tasks.newTask")}
                        icon="pi pi-plus"
                        onClick={() => setShowCreateDialog(true)}
                        className="p-button-sm bg-[#4F8EF7] border-none text-white hover:bg-[#3D77E0] px-3 sm:px-4 py-2 rounded-lg text-xs font-medium"
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
                        <div className="p-3.5 rounded-lg border border-[#4F8EF7] bg-[#2E2E2E] opacity-90 rotate-1 pointer-events-none w-[250px]">
                            <h5 className="text-[#F0F0F0] text-sm leading-tight font-medium">
                                {activeTask.title}
                            </h5>
                            <div className="flex items-center gap-1.5 text-[10px] text-[#757575] mt-2">
                                <i className="pi pi-clock text-[9px]" />
                                <span>{activeTask.totalFocusedTime} {t("tasks.focused")}</span>
                            </div>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            <CreateTaskDialog
                visible={showCreateDialog}
                onHide={() => setShowCreateDialog(false)}
                newTask={newTask}
                setNewTask={setNewTask}
                onCreateTask={handleCreateTask}
            />

            <EditTaskDialog
                visible={showEditDialog}
                onHide={() => { setShowEditDialog(false); setEditingTask(null); }}
                editingTask={editingTask}
                setEditingTask={setEditingTask}
                onSaveEdit={handleSaveEdit}
            />
        </div >
    );
};

export default KanbanBoard;
