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

/* ─── Sortable Card ─── */
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
                className={`relative p-3.5 rounded-lg cursor-grab active:cursor-grabbing border bg-[#18181b] group transition-colors
                    ${isSelected ? 'border-[#6366f1]' : 'border-[#27272a] hover:border-[#3f3f46]'}`}
                onClick={onClick}
            >
                {/* Action Buttons */}
                <div className="absolute top-2.5 right-2.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        className="w-6 h-6 flex items-center justify-center rounded bg-[#27272a] hover:bg-[#3f3f46] text-[#a1a1aa] hover:text-[#fafafa] transition-colors"
                        title="Edit"
                    >
                        <i className="pi pi-pencil text-[10px]" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onArchive(); }}
                        className="w-6 h-6 flex items-center justify-center rounded bg-[#27272a] hover:bg-red-500/20 text-[#a1a1aa] hover:text-red-400 transition-colors"
                        title="Archive"
                    >
                        <i className="pi pi-trash text-[10px]" />
                    </button>
                </div>

                <h5 className="text-[#fafafa] text-sm leading-tight select-none pr-14 font-medium">
                    {task.title}
                </h5>
                {task.description && (
                    <p className="text-xs text-[#71717a]/70 mt-1.5 leading-relaxed select-none pr-14">
                        {task.description.length > 60
                            ? `${task.description.slice(0, 60)}...`
                            : task.description}
                    </p>
                )}
                <div className="flex items-center gap-1.5 text-[10px] text-[#71717a] mt-2">
                    <i className="pi pi-clock text-[9px]" />
                    <span>{task.totalFocusedTime}m focused</span>
                </div>
            </div>
        </div>
    );
};

/* ─── Droppable Column ─── */
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
                <h4 className="text-sm font-medium text-[#a1a1aa]">{label}</h4>
                <span className="text-[10px] bg-[#27272a] text-[#71717a] px-2 py-0.5 rounded-md font-medium">
                    {count}
                </span>
            </div>
            <div className="flex flex-col gap-2.5 flex-1">{children}</div>
        </div>
    );
};

/* ─── Main Board ─── */
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
            message: `"${task.title}" will be archived. Focus data will be preserved.`,
            header: 'Archive Task',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'bg-red-500 text-white border-red-500 px-4 py-2 rounded-lg ml-2',
            rejectClassName: 'border border-[#27272a] text-[#a1a1aa] px-4 py-2 rounded-lg',
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
            <div className="text-[#71717a] text-sm text-center mt-10 animate-pulse">
                Loading tasks...
            </div>
        );
    }

    const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

    return (
        <div className="flex flex-col gap-6 w-full overflow-hidden">
            <ConfirmDialog />

            {/* Header */}
            <header className="flex justify-between items-center p-5 rounded-xl border border-[#27272a] bg-[#18181b]">
                <div className="flex flex-col gap-0.5">
                    <h3 className="text-base font-semibold text-[#fafafa]">Board View</h3>
                    <p className="text-xs text-[#71717a]">
                        Drag tasks between columns to update status
                    </p>
                </div>
                <Button
                    label="New Task"
                    icon="pi pi-plus"
                    onClick={() => setShowCreateDialog(true)}
                    className="p-button-sm bg-[#6366f1] border-none text-white hover:bg-[#4f46e5] px-4 py-2 rounded-lg text-xs font-medium"
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 overflow-hidden">
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
                        <div className="p-3.5 rounded-lg border border-[#6366f1] bg-[#18181b] opacity-90 rotate-1 pointer-events-none w-[250px]">
                            <h5 className="text-[#fafafa] text-sm leading-tight font-medium">
                                {activeTask.title}
                            </h5>
                            <div className="flex items-center gap-1.5 text-[10px] text-[#71717a] mt-2">
                                <i className="pi pi-clock text-[9px]" />
                                <span>{activeTask.totalFocusedTime}m focused</span>
                            </div>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* ─── Create Dialog ─── */}
            <Dialog
                header="New Task"
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
                        <label className="text-xs text-[#71717a] font-medium">Title</label>
                        <InputText
                            value={newTask.title}
                            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                            className="bg-[#09090b] border-[#27272a] text-[#fafafa] focus:border-[#6366f1]"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-[#71717a] font-medium">Description</label>
                        <InputTextarea
                            value={newTask.description}
                            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                            rows={3}
                            className="bg-[#09090b] border-[#27272a] text-[#fafafa] focus:border-[#6366f1]"
                        />
                    </div>
                    <Button
                        label="Create Task"
                        onClick={handleCreateTask}
                        className="bg-[#6366f1] border-none text-white py-2.5 rounded-lg hover:bg-[#4f46e5] font-medium"
                    />
                </div>
            </Dialog>

            {/* ─── Edit Dialog ─── */}
            <Dialog
                header="Edit Task"
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
                            <label className="text-xs text-[#71717a] font-medium">Title</label>
                            <InputText
                                value={editingTask.title}
                                onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                                className="bg-[#09090b] border-[#27272a] text-[#fafafa] focus:border-[#6366f1]"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs text-[#71717a] font-medium">Description</label>
                            <InputTextarea
                                value={editingTask.description}
                                onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                                rows={3}
                                className="bg-[#09090b] border-[#27272a] text-[#fafafa] focus:border-[#6366f1]"
                            />
                        </div>
                        <Button
                            label="Save Changes"
                            icon="pi pi-check"
                            onClick={handleSaveEdit}
                            className="bg-[#6366f1] border-none text-white py-2.5 rounded-lg hover:bg-[#4f46e5] font-medium"
                        />
                    </div>
                )}
            </Dialog>
        </div>
    );
};

export default KanbanBoard;
