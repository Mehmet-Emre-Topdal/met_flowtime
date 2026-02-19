import React, { useState, useRef } from 'react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import { Toast } from 'primereact/toast';
import { useCreateTaskMutation, useGetTasksQuery } from './api/tasksApi';
import { useAppSelector } from '@/hooks/storeHooks';
import { TaskCreateInput } from '@/types/task';
import { useTranslation } from 'react-i18next';

const TaskQuickAdd = () => {
    const { t } = useTranslation();
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
            summary: t("quickAdd.taskCreated"),
            detail: msg,
            life: 3000,
            className: 'custom-toast'
        });
    };

    const showError = (msg: string) => {
        toast.current?.show({
            severity: 'error',
            summary: t("quickAdd.errorTitle"),
            detail: msg,
            life: 4000
        });
    };

    const handleQuickAdd = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!user?.uid) {
            showError(t("quickAdd.authRequired"));
            return;
        }
        if (!quickTitle.trim()) return;

        try {
            await createTask({
                userId: user.uid,
                task: { title: quickTitle, description: '', status: 'todo' },
                order: tasks.length
            }).unwrap();

            showSuccess(t("quickAdd.taskAddedSuccess"));
            setQuickTitle('');
        } catch (err: any) {
            showError(err.message || t("quickAdd.createFailed"));
        }
    };

    const handleAdvancedAdd = async () => {
        if (!user?.uid) {
            showError(t("quickAdd.authRequired"));
            return;
        }
        if (!advancedTask.title.trim()) return;

        try {
            await createTask({
                userId: user.uid,
                task: advancedTask,
                order: tasks.length
            }).unwrap();

            showSuccess(t("quickAdd.taskCreatedSuccess"));
            setAdvancedTask({ title: '', description: '', status: 'todo' });
            setIsAdvancedOpen(false);
        } catch (err: any) {
            showError(err.message || t("quickAdd.createFailed"));
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col gap-3">
            <Toast ref={toast} position="bottom-right" />

            <div className={`flex flex-col md:flex-row items-center gap-2 bg-[#2E2E2E] p-2 rounded-lg border border-[#3D3D3D] transition-colors hover:border-[#353535] ${isLoading ? 'opacity-70' : ''}`}>
                <form onSubmit={handleQuickAdd} className="flex-1 flex items-center gap-2 px-2 w-full">
                    <InputText
                        value={quickTitle}
                        onChange={(e) => setQuickTitle(e.target.value)}
                        placeholder={t("quickAdd.placeholder")}
                        disabled={isLoading}
                        className="flex-1 bg-transparent border-none text-[#F0F0F0] placeholder-[#757575] text-sm focus:ring-0 disabled:opacity-50"
                    />
                    <Button
                        icon="pi pi-plus"
                        loading={isLoading}
                        onClick={handleQuickAdd}
                        disabled={!quickTitle.trim() || isLoading}
                        className="p-button-rounded p-button-text text-[#4F8EF7] hover:bg-[#4F8EF7]/10"
                        tooltip={t("quickAdd.quickAdd")}
                    />
                </form>

                <div className="h-6 w-px bg-[#3D3D3D] hidden md:block"></div>

                <Button
                    label={t("quickAdd.details")}
                    icon="pi pi-external-link"
                    onClick={() => setIsAdvancedOpen(true)}
                    disabled={isLoading}
                    className="p-button-text p-button-sm text-[#757575] hover:text-[#9A9A9A] text-xs px-3"
                />
            </div>

            {isError && (
                <p className="text-red-400 text-xs text-center">
                    {t("quickAdd.errorTitle")}: {(error as any)?.message || t("quickAdd.createFailed")}
                </p>
            )}

            <Dialog
                header={t("tasks.createTask")}
                visible={isAdvancedOpen}
                onHide={() => !isLoading && setIsAdvancedOpen(false)}
                className="w-full max-w-lg bg-[#2E2E2E] border border-[#3D3D3D]"
                closable={!isLoading}
                pt={{
                    header: { className: 'bg-[#2E2E2E] text-[#F0F0F0] border-b border-[#3D3D3D] p-5' },
                    content: { className: 'p-5 bg-[#2E2E2E]' },
                    footer: { className: 'p-5 bg-[#2E2E2E] border-t border-[#3D3D3D]' }
                }}
                footer={
                    <div className="flex justify-end gap-3">
                        <Button label={t("common.cancel")} onClick={() => setIsAdvancedOpen(false)} disabled={isLoading} className="p-button-text text-[#757575] hover:text-[#9A9A9A]" />
                        <Button label={t("common.create")} loading={isLoading} onClick={handleAdvancedAdd} disabled={isLoading || !advancedTask.title.trim()} className="bg-[#4F8EF7] border-none text-white px-5 rounded-lg hover:bg-[#3D77E0]" />
                    </div>
                }
            >
                <div className="flex flex-col gap-5 mt-2">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-[#757575] font-medium">{t("tasks.titleLabel")}</label>
                        <InputText
                            value={advancedTask.title}
                            onChange={(e) => setAdvancedTask({ ...advancedTask, title: e.target.value })}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdvancedAdd()}
                            disabled={isLoading}
                            className="bg-[#242424] border-[#3D3D3D] text-[#F0F0F0] focus:border-[#34C774] disabled:opacity-50"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-[#757575] font-medium">{t("tasks.descriptionLabel")}</label>
                        <InputTextarea
                            value={advancedTask.description}
                            onChange={(e) => setAdvancedTask({ ...advancedTask, description: e.target.value })}
                            rows={4}
                            disabled={isLoading}
                            className="bg-[#242424] border-[#3D3D3D] text-[#F0F0F0] focus:border-[#34C774] disabled:opacity-50"
                        />
                    </div>
                </div>
            </Dialog>

        </div>
    );
};

export default TaskQuickAdd;
