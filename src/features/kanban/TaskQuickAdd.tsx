import React, { useState, useRef } from 'react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import { Toast } from 'primereact/toast';
import { useCreateTaskMutation, useGetTasksQuery } from './api/tasksApi';
import { useAppSelector } from '@/hooks/storeHooks';
import { TaskCreateInput } from '@/types/task';

const TaskQuickAdd = () => {
    const toast = useRef<Toast>(null);
    const { user } = useAppSelector((state) => state.auth);
    const { data: tasks = [] } = useGetTasksQuery(user?.uid || '', { skip: !user?.uid });
    const [createTask, { isLoading, isError, error }] = useCreateTaskMutation();

    const [quickTitle, setQuickTitle] = useState('');
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
    const [advancedTask, setAdvancedTask] = useState<TaskCreateInput>({
        title: '',
        description: '',
        status: 'todo'
    });

    const showSuccess = (msg: string) => {
        toast.current?.show({
            severity: 'success',
            summary: 'Task Created',
            detail: msg,
            life: 3000,
            className: 'custom-toast'
        });
    };

    const showError = (msg: string) => {
        toast.current?.show({
            severity: 'error',
            summary: 'Error',
            detail: msg,
            life: 4000
        });
    };

    const handleQuickAdd = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!user?.uid) {
            showError('Authentication required.');
            return;
        }
        if (!quickTitle.trim()) return;

        try {
            await createTask({
                userId: user.uid,
                task: { title: quickTitle, description: '', status: 'todo' },
                order: tasks.length
            }).unwrap();

            showSuccess('Task added successfully.');
            setQuickTitle('');
        } catch (err: any) {
            showError(err.message || 'Failed to create task.');
        }
    };

    const handleAdvancedAdd = async () => {
        if (!user?.uid) {
            showError('Authentication required.');
            return;
        }
        if (!advancedTask.title.trim()) return;

        try {
            await createTask({
                userId: user.uid,
                task: advancedTask,
                order: tasks.length
            }).unwrap();

            showSuccess('Task created successfully.');
            setAdvancedTask({ title: '', description: '', status: 'todo' });
            setIsAdvancedOpen(false);
        } catch (err: any) {
            showError(err.message || 'Failed to create task.');
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col gap-3">
            <Toast ref={toast} position="bottom-right" />

            <div className={`flex flex-col md:flex-row items-center gap-2 bg-[#18181b] p-2 rounded-lg border border-[#27272a] transition-colors hover:border-[#3f3f46] ${isLoading ? 'opacity-70' : ''}`}>
                <form onSubmit={handleQuickAdd} className="flex-1 flex items-center gap-2 px-2 w-full">
                    <InputText
                        value={quickTitle}
                        onChange={(e) => setQuickTitle(e.target.value)}
                        placeholder="Add a new task..."
                        disabled={isLoading}
                        className="flex-1 bg-transparent border-none text-[#fafafa] placeholder-[#71717a] text-sm focus:ring-0 disabled:opacity-50"
                    />
                    <Button
                        icon="pi pi-plus"
                        loading={isLoading}
                        onClick={handleQuickAdd}
                        disabled={!quickTitle.trim() || isLoading}
                        className="p-button-rounded p-button-text text-[#6366f1] hover:bg-[#6366f1]/10"
                        tooltip="Quick add"
                    />
                </form>

                <div className="h-6 w-px bg-[#27272a] hidden md:block"></div>

                <Button
                    label="Details"
                    icon="pi pi-external-link"
                    onClick={() => setIsAdvancedOpen(true)}
                    disabled={isLoading}
                    className="p-button-text p-button-sm text-[#71717a] hover:text-[#a1a1aa] text-xs px-3"
                />
            </div>

            {isError && (
                <p className="text-red-400 text-xs text-center">
                    Error: {(error as any)?.message || 'Something went wrong'}
                </p>
            )}

            <Dialog
                header="Create Task"
                visible={isAdvancedOpen}
                onHide={() => !isLoading && setIsAdvancedOpen(false)}
                className="w-full max-w-lg bg-[#18181b] border border-[#27272a]"
                closable={!isLoading}
                pt={{
                    header: { className: 'bg-[#18181b] text-[#fafafa] border-b border-[#27272a] p-5' },
                    content: { className: 'p-5 bg-[#18181b]' },
                    footer: { className: 'p-5 bg-[#18181b] border-t border-[#27272a]' }
                }}
                footer={
                    <div className="flex justify-end gap-3">
                        <Button label="Cancel" onClick={() => setIsAdvancedOpen(false)} disabled={isLoading} className="p-button-text text-[#71717a] hover:text-[#a1a1aa]" />
                        <Button label="Create" loading={isLoading} onClick={handleAdvancedAdd} disabled={isLoading || !advancedTask.title.trim()} className="bg-[#6366f1] border-none text-white px-5 rounded-lg hover:bg-[#4f46e5]" />
                    </div>
                }
            >
                <div className="flex flex-col gap-5 mt-2">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-[#71717a] font-medium">Title</label>
                        <InputText
                            value={advancedTask.title}
                            onChange={(e) => setAdvancedTask({ ...advancedTask, title: e.target.value })}
                            disabled={isLoading}
                            className="bg-[#09090b] border-[#27272a] text-[#fafafa] focus:border-[#6366f1] disabled:opacity-50"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-[#71717a] font-medium">Description</label>
                        <InputTextarea
                            value={advancedTask.description}
                            onChange={(e) => setAdvancedTask({ ...advancedTask, description: e.target.value })}
                            rows={4}
                            disabled={isLoading}
                            className="bg-[#09090b] border-[#27272a] text-[#fafafa] focus:border-[#6366f1] disabled:opacity-50"
                        />
                    </div>
                </div>
            </Dialog>

            <style jsx global>{`
                .p-inputtext:focus, .p-inputtextarea:focus {
                    box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.3) !important;
                }
                .custom-toast .p-toast-message {
                    background: #18181b !important;
                    border: 1px solid #27272a !important;
                    color: #fafafa !important;
                }
                .custom-toast .p-toast-message-success .p-toast-message-icon {
                    color: #6366f1 !important;
                }
            `}</style>
        </div>
    );
};

export default TaskQuickAdd;
