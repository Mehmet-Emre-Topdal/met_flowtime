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
            summary: 'Chronicle Updated',
            detail: msg,
            life: 3000,
            className: 'custom-toast'
        });
    };

    const showError = (msg: string) => {
        toast.current?.show({
            severity: 'error',
            summary: 'Inscription Failed',
            detail: msg,
            life: 4000
        });
    };

    const handleQuickAdd = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        console.log('Quick Ekleme tetiklendi', { userId: user?.uid, title: quickTitle });

        if (!user?.uid) {
            console.warn('Ekleme iptal: Kullanıcı kimliği bulunamadı.');
            showError('User identity not found in the archives.');
            return;
        }
        if (!quickTitle.trim()) {
            console.warn('Ekleme iptal: Başlık boş bırakılamaz.');
            return;
        }

        try {
            await createTask({
                userId: user.uid,
                task: { title: quickTitle, description: '', status: 'todo' },
                order: tasks.length
            }).unwrap();

            showSuccess('New directive inscribed on the parchment.');
            setQuickTitle('');
        } catch (err: any) {
            console.error("Quick add failed:", err);
            showError(err.message || 'The library archives are currently unreachable.');
        }
    };

    const handleAdvancedAdd = async () => {
        console.log('Advanced Ekleme tetiklendi', { userId: user?.uid, task: advancedTask });

        if (!user?.uid) {
            console.warn('Advanced Ekleme iptal: Kullanıcı kimliği bulunamadı.');
            showError('User identity not found in the archives.');
            return;
        }
        if (!advancedTask.title.trim()) {
            console.warn('Advanced Ekleme iptal: Başlık boş bırakılamaz.');
            return;
        }

        try {
            await createTask({
                userId: user.uid,
                task: advancedTask,
                order: tasks.length
            }).unwrap();

            showSuccess('Mission blueprint successfully archived.');
            setAdvancedTask({ title: '', description: '', status: 'todo' });
            setIsAdvancedOpen(false);
        } catch (err: any) {
            console.error("Advanced add failed:", err);
            showError(err.message || 'Failed to archive the mission blueprint.');
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col gap-4">
            <Toast ref={toast} position="bottom-right" />

            <div className={`flex flex-col md:flex-row items-center gap-3 bg-[#1e1e1e]/60 p-2 rounded-2xl border border-[#d4af3720] backdrop-blur-md shadow-xl transition-all hover:border-[#d4af3740] ${isLoading ? 'opacity-70' : ''}`}>
                <form onSubmit={handleQuickAdd} className="flex-1 flex items-center gap-3 px-2 w-full">
                    <InputText
                        value={quickTitle}
                        onChange={(e) => setQuickTitle(e.target.value)}
                        placeholder="Inscribe a new directive..."
                        disabled={isLoading}
                        className="flex-1 bg-transparent border-none text-[#fffdd0] placeholder-[#c5a059]/30 font-serif text-lg focus:ring-0 disabled:opacity-50"
                    />
                    <Button
                        icon="pi pi-plus"
                        loading={isLoading}
                        onClick={handleQuickAdd}
                        disabled={!quickTitle.trim() || isLoading}
                        className="p-button-rounded p-button-text text-[#c5a059] hover:bg-[#c5a059]/10"
                        tooltip="Quick Inscribe"
                    />
                </form>

                <div className="h-8 w-px bg-[#d4af3710] hidden md:block"></div>

                <Button
                    label="Advanced Design"
                    icon="pi pi-external-link"
                    onClick={() => setIsAdvancedOpen(true)}
                    disabled={isLoading}
                    className="p-button-text p-button-sm text-[#c5a059]/60 hover:text-[#c5a059] font-sans uppercase tracking-[0.2em] text-[9px] px-4"
                />
            </div>

            {isError && (
                <p className="text-red-400 text-[10px] uppercase tracking-widest text-center animate-pulse">
                    Chronicle Error: {(error as any)?.message || 'Archive Unreachable'}
                </p>
            )}

            <Dialog
                header="Mission Blueprint"
                visible={isAdvancedOpen}
                onHide={() => !isLoading && setIsAdvancedOpen(false)}
                className="w-full max-w-lg bg-[#1e1e1e] border border-[#d4af3740] shadow-2xl"
                closable={!isLoading}
                pt={{
                    header: { className: 'bg-[#1e1e1e] text-[#fffdd0] font-serif border-b border-[#d4af3710] p-6' },
                    content: { className: 'p-6 bg-[#1e1e1e]' },
                    footer: { className: 'p-6 bg-[#1e1e1e] border-t border-[#d4af3710]' }
                }}
                footer={
                    <div className="flex justify-end gap-3">
                        <Button label="Discard" onClick={() => setIsAdvancedOpen(false)} disabled={isLoading} className="p-button-text text-[#c5a059]/40 hover:text-[#c5a059]" />
                        <Button label="Inscribe Blueprint" loading={isLoading} onClick={handleAdvancedAdd} disabled={isLoading || !advancedTask.title.trim()} className="bg-[#c5a059] text-[#0f172a] font-serif px-6 rounded-lg" />
                    </div>
                }
            >
                <div className="flex flex-col gap-6 mt-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] text-[#c5a059] uppercase tracking-[0.3em] font-bold">Directive Title</label>
                        <InputText
                            value={advancedTask.title}
                            onChange={(e) => setAdvancedTask({ ...advancedTask, title: e.target.value })}
                            disabled={isLoading}
                            className="bg-[#0f172a]/40 border-[#d4af3720] text-[#fffdd0] focus:border-[#d4af37] disabled:opacity-50"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] text-[#c5a059] uppercase tracking-[0.3em] font-bold">Elaboration</label>
                        <InputTextarea
                            value={advancedTask.description}
                            onChange={(e) => setAdvancedTask({ ...advancedTask, description: e.target.value })}
                            rows={4}
                            disabled={isLoading}
                            className="bg-[#0f172a]/40 border-[#d4af3720] text-[#fffdd0] focus:border-[#d4af37] disabled:opacity-50"
                        />
                    </div>
                </div>
            </Dialog>

            <style jsx global>{`
                .p-inputtext:focus, .p-inputtextarea:focus {
                    box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.1) !important;
                }
                .custom-toast .p-toast-message {
                    background: #1e1e1e !important;
                    border: 1px solid rgba(212, 175, 55, 0.2) !important;
                    color: #fffdd0 !important;
                }
                .custom-toast .p-toast-message-success .p-toast-message-icon {
                    color: #c5a059 !important;
                }
            `}</style>
        </div>
    );
};

export default TaskQuickAdd;
