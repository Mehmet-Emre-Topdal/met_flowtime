import React, { useState, useRef, useEffect } from 'react';
import {
    useGetTasksQuery,
    useUpdateTaskStatusMutation,
    useUpdateTaskMutation,
    useArchiveTaskMutation,
} from './api/tasksApi';
import { useAppSelector, useAppDispatch } from '@/hooks/storeHooks';
import { setSelectedTaskId } from './slices/taskSlice';
import { TaskDto } from '@/types/task';
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
    const [updateTask] = useUpdateTaskMutation();
    const [archiveTask] = useArchiveTaskMutation();

    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editingTask, setEditingTask] = useState<{ id: string; title: string; description: string } | null>(null);
    const [statusDropdownTaskId, setStatusDropdownTaskId] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Dropdown dışı tıklama
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
            case 'done': return 'pi pi-check-circle text-green-500';
            case 'inprogress': return 'pi pi-spinner pi-spin text-[#c5a059]';
            default: return 'pi pi-circle text-[#c5a059]/30';
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
        { value: 'todo', label: 'To Do', icon: 'pi pi-circle', color: 'text-[#c5a059]/50' },
        { value: 'inprogress', label: 'In Progress', icon: 'pi pi-spinner', color: 'text-[#c5a059]' },
        { value: 'done', label: 'Done', icon: 'pi pi-check-circle', color: 'text-green-500' },
    ];

    const handleStatusSelect = async (taskId: string, newStatus: string) => {
        setStatusDropdownTaskId(null);
        try {
            await updateTaskStatus({ taskId, status: newStatus }).unwrap();
        } catch (err) {
            console.error('Status update failed:', err);
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

    if (isLoading) return null;

    // Sıralama: In Progress → Todo → Done
    const statusPriority: Record<string, number> = { inprogress: 0, todo: 1, done: 2 };
    const sortedTasks = [...tasks].sort(
        (a, b) => (statusPriority[a.status] ?? 1) - (statusPriority[b.status] ?? 1)
    );

    return (
        <div className="flex flex-col gap-4 w-full max-w-4xl mx-auto py-8">
            <ConfirmDialog />

            <div className="flex flex-col gap-1 mb-4 border-b border-[#c5a059]/10 pb-4">
                <h3 className="font-serif text-xl text-[#fffdd0]">Task Transcript</h3>
                <p className="text-[10px] text-[#c5a059]/50 uppercase tracking-[0.2em]">Chronicle of your ongoing directives</p>
            </div>

            <div className="flex flex-col gap-2">
                {sortedTasks.map((task) => (
                    <div
                        key={task.id}
                        onClick={() => handleTaskClick(task.id)}
                        className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 cursor-pointer group
                            ${selectedTaskId === task.id
                                ? 'bg-[#c5a059]/10 border-[#c5a059] shadow-lg shadow-[#c5a059]/5'
                                : 'bg-[#1e1e1e]/40 border-[#c5a059]/10 hover:border-[#c5a059]/30'}`}
                    >
                        <div className="flex items-center gap-4">
                            <i className={getStatusIcon(task.status)}></i>
                            <div className="flex flex-col">
                                <div className="flex items-center gap-3">
                                    <span className={`font-serif text-lg transition-colors
                                        ${selectedTaskId === task.id ? 'text-[#fffdd0]' : 'text-[#fffdd0]/70 group-hover:text-[#fffdd0]'}`}>
                                        {task.title}
                                    </span>
                                    <div className="relative">
                                        <Tag
                                            value={getStatusLabel(task.status)}
                                            severity={getStatusSeverity(task.status)}
                                            className="text-[8px] tracking-[0.1em] px-2 py-0.5 rounded-full font-sans border border-current bg-transparent opacity-60 cursor-pointer hover:opacity-100 transition-opacity"
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
                                                className="absolute left-0 top-full mt-1 z-50 bg-[#1e1e1e] border border-[#c5a059]/20 rounded-xl shadow-xl shadow-black/40 overflow-hidden min-w-[140px] animate-dropdown-in"
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
                                                                ? 'bg-[#c5a059]/15 text-[#fffdd0]'
                                                                : 'text-[#fffdd0]/60 hover:bg-[#c5a059]/10 hover:text-[#fffdd0]'
                                                            }`}
                                                    >
                                                        <i className={`${opt.icon} text-[10px] ${opt.color}`} />
                                                        <span>{opt.label}</span>
                                                        {task.status === opt.value && (
                                                            <i className="pi pi-check text-[8px] text-[#c5a059] ml-auto" />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-[10px] text-[#c5a059]/40 uppercase tracking-widest">{task.totalFocusedTime} mins focused</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleEditTask(task); }}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#c5a059]/10 hover:bg-[#c5a059]/30 text-[#c5a059] transition-colors"
                                    title="Edit"
                                >
                                    <i className="pi pi-pencil text-xs" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleArchiveTask(task); }}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500/30 text-red-400 transition-colors"
                                    title="Archive"
                                >
                                    <i className="pi pi-trash text-xs" />
                                </button>
                            </div>

                            {selectedTaskId === task.id && (
                                <div className="flex items-center gap-2 animate-pulse ml-2">
                                    <span className="text-[10px] text-[#c5a059] uppercase tracking-[0.3em] font-bold">Focusing</span>
                                    <i className="pi pi-bolt text-[#c5a059]"></i>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {tasks.length === 0 && (
                <div className="text-center py-20 bg-[#1e1e1e]/20 rounded-3xl border border-dashed border-[#c5a059]/10">
                    <p className="font-serif text-[#c5a059]/40 italic">No directives inscribed in the archives.</p>
                </div>
            )}

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

export default TaskListView;
