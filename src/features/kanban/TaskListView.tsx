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
import { Checkbox } from 'primereact/checkbox';
import { Tooltip } from 'primereact/tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface TaskListViewProps {
    filterDaily: boolean;
}

const TaskListView = ({ filterDaily }: TaskListViewProps) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);
    const { selectedTaskId } = useAppSelector((state) => state.task);
    const { data: tasks = [], isLoading } = useGetTasksQuery(user?.uid || '', { skip: !user?.uid });

    const [updateTaskStatus] = useUpdateTaskStatusMutation();
    const [createTask] = useCreateTaskMutation();
    const [updateTask] = useUpdateTaskMutation();
    const [archiveTask] = useArchiveTaskMutation();

    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [newTask, setNewTask] = useState({ title: '', description: '', status: 'todo' as TaskStatus, isDaily: false });
    const [hideCompleted, setHideCompleted] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editingTask, setEditingTask] = useState<{ id: string; title: string; description: string; isDaily: boolean } | null>(null);
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
            case 'done': return t("tasks.done");
            case 'inprogress': return t("tasks.inProgress");
            default: return t("tasks.toDo");
        }
    };

    const statusOptions: { value: string; label: string; icon: string; color: string }[] = [
        { value: 'todo', label: t("tasks.toDoShort"), icon: 'pi pi-circle', color: 'text-[#71717a]' },
        { value: 'inprogress', label: t("tasks.inProgressShort"), icon: 'pi pi-spinner', color: 'text-[#6366f1]' },
        { value: 'done', label: t("tasks.doneShort"), icon: 'pi pi-check-circle', color: 'text-emerald-500' },
    ];

    const handleStatusSelect = async (taskId: string, newStatus: string) => {
        setStatusDropdownTaskId(null);
        try {
            await updateTaskStatus({ taskId, status: newStatus }).unwrap();
        } catch (err) {
            console.error(t("tasks.statusUpdateFailed"), err);
        }
    };

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

    if (isLoading) return null;

    const statusPriority: Record<string, number> = { inprogress: 0, todo: 1, done: 2 };
    const filteredTasks = tasks.filter(t => {
        if (filterDaily && !t.isDaily) return false;
        if (hideCompleted && t.status === 'done') return false;
        return true;
    });
    const sortedTasks = [...filteredTasks].sort(
        (a, b) => (statusPriority[a.status] ?? 1) - (statusPriority[b.status] ?? 1)
    );

    return (
        <div className="flex flex-col gap-4 w-full max-w-4xl mx-auto py-6">
            <ConfirmDialog />

            <header className="flex justify-between items-center p-5 rounded-xl border border-[#27272a] bg-[#18181b]">
                <div className="flex flex-col gap-0.5">
                    <h3 className="text-base font-semibold text-[#fafafa]">{t("tasks.tasks")}</h3>
                    <p className="text-xs text-[#71717a]">
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            inputId="hide-completed"
                            checked={hideCompleted}
                            onChange={(e) => setHideCompleted(e.checked ?? false)}
                            className="w-4 h-4 border-[#3f3f46] rounded-sm"
                        />
                        <label htmlFor="hide-completed" className="text-xs text-[#a1a1aa] cursor-pointer hover:text-[#fafafa] transition-colors select-none">
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

            <div className="flex flex-col gap-1.5">
                <AnimatePresence mode="popLayout">
                    {sortedTasks.map((task) => (
                        <motion.div
                            key={task.id}
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div
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
                                            {task.isDaily && (
                                                <span className="text-[9px] text-[#818cf8] border border-[#6366f1]/30 bg-[#6366f1]/5 rounded px-1.5 py-0.5 font-semibold uppercase tracking-wider">
                                                    {t("tasks.daily")}
                                                </span>
                                            )}
                                            <div className="relative">
                                                <Tag
                                                    value={getStatusLabel(task.status)}
                                                    severity={getStatusSeverity(task.status)}
                                                    className="text-[8px] tracking-wide px-2 py-0.5 rounded font-medium border border-current bg-transparent cursor-pointer transition-opacity opacity-100 hover:opacity-75"
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
                                            <span className="text-[10px] text-[#71717a]">{task.totalFocusedTime} {t("tasks.focused")}</span>
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
                                    <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleEditTask(task); }}
                                            className="w-7 h-7 flex items-center justify-center rounded bg-[#27272a] hover:bg-[#3f3f46] text-[#71717a] hover:text-[#fafafa] transition-colors"
                                            title={t("common.edit")}
                                        >
                                            <i className="pi pi-pencil text-xs" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleArchiveTask(task); }}
                                            className="w-7 h-7 flex items-center justify-center rounded bg-[#27272a] hover:bg-red-500/20 text-[#71717a] hover:text-red-400 transition-colors"
                                            title={t("common.delete")}
                                        >
                                            <i className="pi pi-trash text-xs" />
                                        </button>
                                    </div>

                                    {selectedTaskId === task.id && (
                                        <div className="flex items-center gap-1.5 ml-2">
                                            <span className="text-[10px] text-[#6366f1] font-medium">{t("tasks.focusing")}</span>
                                            <i className="pi pi-bolt text-[#6366f1] text-xs"></i>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {
                sortedTasks.length === 0 && (
                    <div className="text-center py-16 bg-[#18181b] rounded-xl border border-dashed border-[#27272a]">
                        <p className="text-sm text-[#71717a]">
                            {filterDaily ? t("tasks.noDailyTasks") : t("tasks.noTasks")}
                        </p>
                    </div>
                )
            }

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
                            inputId="list-daily-toggle"
                            checked={newTask.isDaily}
                            onChange={(e) => setNewTask({ ...newTask, isDaily: e.checked ?? false })}
                            className="daily-checkbox"
                        />
                        <label htmlFor="list-daily-toggle" className="text-xs text-[#a1a1aa] font-medium cursor-pointer select-none">
                            {t("tasks.dailyToggle")}
                        </label>
                        <i
                            className="pi pi-question-circle text-[#3f3f46] hover:text-[#71717a] text-xs cursor-help transition-colors ml-auto"
                            id="list-daily-tooltip-icon"
                        />
                        <Tooltip
                            target="#list-daily-tooltip-icon"
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
                                inputId="list-edit-daily-toggle"
                                checked={editingTask.isDaily}
                                onChange={(e) => setEditingTask({ ...editingTask, isDaily: e.checked ?? false })}
                                className="daily-checkbox"
                            />
                            <label htmlFor="list-edit-daily-toggle" className="text-xs text-[#a1a1aa] font-medium cursor-pointer select-none">
                                {t("tasks.dailyToggle")}
                            </label>
                            <i
                                className="pi pi-question-circle text-[#3f3f46] hover:text-[#71717a] text-xs cursor-help transition-colors ml-auto"
                                id="list-edit-daily-tooltip-icon"
                            />
                            <Tooltip
                                target="#list-edit-daily-tooltip-icon"
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

export default TaskListView;
