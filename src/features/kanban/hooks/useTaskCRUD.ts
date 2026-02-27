import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { confirmDialog } from 'primereact/confirmdialog';
import {
    useGetTasksQuery,
    useCreateTaskMutation,
    useUpdateTaskMutation,
    useUpdateTaskStatusMutation,
    useArchiveTaskMutation,
} from '../api/tasksApi';
import { useAppSelector, useAppDispatch } from '@/hooks/storeHooks';
import { setSelectedTaskId } from '../slices/taskSlice';
import { TaskDto, TaskStatus } from '@/types/task';

export interface NewTask {
    title: string;
    description: string;
    status: TaskStatus;
    isDaily: boolean;
}

export interface EditingTask {
    id: string;
    title: string;
    description: string;
    isDaily: boolean;
}

export function useTaskCRUD() {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);
    const { selectedTaskId } = useAppSelector((state) => state.task);

    const { data: tasks = [], isLoading } = useGetTasksQuery(user?.uid || '', { skip: !user?.uid });
    const [createTask] = useCreateTaskMutation();
    const [updateTask] = useUpdateTaskMutation();
    const [updateTaskStatus] = useUpdateTaskStatusMutation();
    const [archiveTask] = useArchiveTaskMutation();

    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [newTask, setNewTask] = useState<NewTask>({ title: '', description: '', status: 'todo', isDaily: false });
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editingTask, setEditingTask] = useState<EditingTask | null>(null);

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
            rejectClassName: 'border border-[#3D3D3D] text-[#9A9A9A] px-4 py-2 rounded-lg',
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

    return {
        user,
        tasks,
        isLoading,
        selectedTaskId,
        dispatch,
        updateTask,
        updateTaskStatus,
        showCreateDialog, setShowCreateDialog,
        newTask, setNewTask,
        showEditDialog, setShowEditDialog,
        editingTask, setEditingTask,
        handleCreateTask,
        handleEditTask,
        handleSaveEdit,
        handleArchiveTask,
    };
}
