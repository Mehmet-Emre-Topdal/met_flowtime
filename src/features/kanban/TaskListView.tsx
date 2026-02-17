import React, { useState, useRef, useEffect } from 'react';
import {
    useGetTasksQuery,
    useUpdateTaskStatusMutation,
    useCreateTaskMutation,
    useUpdateTaskMutation,
    useArchiveTaskMutation,
} from './api/tasksApi';
import { useAppSelector, useAppDispatch } from '@/hooks/storeHooks';
import { setSelectedTaskId } from './slices/taskSlice';
import { TaskDto, TaskStatus } from '@/types/task';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';

const TaskListView = () => {
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);
    const { selectedTaskId } = useAppSelector((state) => state.task);
    const { data: tasks = [], isLoading } = useGetTasksQuery(user?.uid || '', { skip: !user?.uid });

    const [updateTaskStatus] = useUpdateTaskStatusMutation();
    const [createTask] = useCreateTaskMutation();
    const [updateTask] = useUpdateTaskMutation();
    const [archiveTask] = useArchiveTaskMutation();

    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [newTask, setNewTask] = useState({ title: '', description: '', status: 'todo' as TaskStatus });
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editingTask, setEditingTask] = useState<{ id: string; title: string; description: string } | null>(null);
    const [statusDropdownTaskId, setStatusDropdownTaskId] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!statusDropdownTaskId) return;
        const handleClick = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setStatusDropdownTaskId(null);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [statusDropdownTaskId]);

    const handleTaskClick = (taskId: string) => {
        dispatch(setSelectedTaskId(taskId === selectedTaskId ? null : taskId));
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'done': return 'pi pi-check-circle text-emerald-500';
            case 'inprogress': return 'pi pi-spinner pi-spin text-[#6366f1]';
            default: return 'pi pi-circle text-[#3f3f46]';
        }
    };

    const getStatusSeverity = (status: string): "success" | "warning" | "secondary" => {
        switch (status) {
            case 'done': return 'success';
            case 'inprogress': return 'warning';
            default: return 'secondary';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'done': return 'DONE';
            case 'inprogress': return 'IN PROGRESS';
            default: return 'TO DO';
        }
    };

    const statusOptions: { value: string; label: string; icon: string; color: string }[] = [
        { value: 'todo', label: 'To Do', icon: 'pi pi-circle', color: 'text-[#71717a]' },
        { value: 'inprogress', label: 'In Progress', icon: 'pi pi-spinner', color: 'text-[#6366f1]' },
        { value: 'done', label: 'Done', icon: 'pi pi-check-circle', color: 'text-emerald-500' },
    ];

    const handleStatusSelect = async (taskId: string, newStatus: string) => {
        setStatusDropdownTaskId(null);
        try {
            await updateTaskStatus({ taskId, status: newStatus }).unwrap();
        } catch (err) {
            console.error('Status update failed:', err);
        }
    };

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

    if (isLoading) return null;

    const statusPriority: Record<string, number> = { inprogress: 0, todo: 1, done: 2 };
    const sortedTasks = [...tasks].sort(
        (a, b) => (statusPriority[a.status] ?? 1) - (statusPriority[b.status] ?? 1)
    );

    return (
        <div className="flex flex-col gap-4 w-full max-w-4xl mx-auto py-6">
            <ConfirmDialog />

            <header className="flex justify-between items-center p-5 rounded-xl border border-[#27272a] bg-[#18181b]">
                <div className="flex flex-col gap-0.5">
                    <h3 className="text-base font-semibold text-[#fafafa]">Tasks</h3>
                    <p className="text-xs text-[#71717a]">All your tasks, sorted by status</p>
                </div>
                <Button
                    label="New Task"
                    icon="pi pi-plus"
                    onClick={() => setShowCreateDialog(true)}
                    className="p-button-sm bg-[#6366f1] border-none text-white hover:bg-[#4f46e5] px-4 py-2 rounded-lg text-xs font-medium"
                />
            </header>

            <div className="flex flex-col gap-1.5">
                {sortedTasks.map((task) => (
                    <div
                        key={task.id}
                        onClick={() => handleTaskClick(task.id)}
                        className={`flex items-center justify-between p-3.5 rounded-lg border transition-all duration-200 cursor-pointer group
                            ${selectedTaskId === task.id
                                ? 'bg-[#6366f1]/5 border-[#6366f1]/30'
                                : 'bg-[#18181b] border-[#27272a] hover:border-[#3f3f46]'}`}
                    >
                        <div className="flex items-center gap-3.5">
                            <i className={getStatusIcon(task.status)}></i>
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2.5">
                                    <span className={`text-sm font-medium transition-colors
                                        ${selectedTaskId === task.id ? 'text-[#fafafa]' : 'text-[#a1a1aa] group-hover:text-[#fafafa]'}`}>
                                        {task.title}
                                    </span>
                                    <div className="relative">
                                        <Tag
                                            value={getStatusLabel(task.status)}
                                            severity={getStatusSeverity(task.status)}
                                            className="text-[8px] tracking-wide px-2 py-0.5 rounded font-medium border border-current bg-transparent opacity-50 cursor-pointer hover:opacity-100 transition-opacity"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setStatusDropdownTaskId(
                                                    statusDropdownTaskId === task.id ? null : task.id
                                                );
                                            }}
                                        />
                                        {statusDropdownTaskId === task.id && (
                                            <div
                                                ref={dropdownRef}
                                                className="absolute left-0 top-full mt-1 z-50 bg-[#18181b] border border-[#27272a] rounded-lg overflow-hidden min-w-[140px] animate-dropdown-in"
                                            >
                                                {statusOptions.map((opt) => (
                                                    <button
                                                        key={opt.value}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleStatusSelect(task.id, opt.value);
                                                        }}
                                                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors
                                                            ${task.status === opt.value
                                                                ? 'bg-[#27272a] text-[#fafafa]'
                                                                : 'text-[#a1a1aa] hover:bg-[#27272a] hover:text-[#fafafa]'
                                                            }`}
                                                    >
                                                        <i className={`${opt.icon} text-[10px] ${opt.color}`} />
                                                        <span>{opt.label}</span>
                                                        {task.status === opt.value && (
                                                            <i className="pi pi-check text-[8px] text-[#6366f1] ml-auto" />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-[#71717a]">{task.totalFocusedTime}m focused</span>
                                </div>
                                {task.description && (
                                    <p className="text-xs text-[#71717a]/70 mt-1 leading-relaxed">
                                        {task.description.length > 80
                                            ? `${task.description.slice(0, 80)}...`
                                            : task.description}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleEditTask(task); }}
                                    className="w-7 h-7 flex items-center justify-center rounded bg-[#27272a] hover:bg-[#3f3f46] text-[#71717a] hover:text-[#fafafa] transition-colors"
                                    title="Edit"
                                >
                                    <i className="pi pi-pencil text-xs" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleArchiveTask(task); }}
                                    className="w-7 h-7 flex items-center justify-center rounded bg-[#27272a] hover:bg-red-500/20 text-[#71717a] hover:text-red-400 transition-colors"
                                    title="Archive"
                                >
                                    <i className="pi pi-trash text-xs" />
                                </button>
                            </div>

                            {selectedTaskId === task.id && (
                                <div className="flex items-center gap-1.5 ml-2">
                                    <span className="text-[10px] text-[#6366f1] font-medium">Focusing</span>
                                    <i className="pi pi-bolt text-[#6366f1] text-xs"></i>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {tasks.length === 0 && (
                <div className="text-center py-16 bg-[#18181b] rounded-xl border border-dashed border-[#27272a]">
                    <p className="text-sm text-[#71717a]">No tasks yet. Add one above to get started.</p>
                </div>
            )}

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

export default TaskListView;
