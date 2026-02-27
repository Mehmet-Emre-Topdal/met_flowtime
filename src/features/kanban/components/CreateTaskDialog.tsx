import React from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Checkbox } from 'primereact/checkbox';
import { Tooltip } from 'primereact/tooltip';
import { Button } from 'primereact/button';
import { TaskStatus } from '@/types/task';
import { useTranslation } from 'react-i18next';

interface NewTask {
    title: string;
    description: string;
    status: TaskStatus;
    isDaily: boolean;
}

interface CreateTaskDialogProps {
    visible: boolean;
    onHide: () => void;
    newTask: NewTask;
    setNewTask: React.Dispatch<React.SetStateAction<NewTask>>;
    onCreateTask: () => void;
}

const CreateTaskDialog = ({ visible, onHide, newTask, setNewTask, onCreateTask }: CreateTaskDialogProps) => {
    const { t } = useTranslation();

    return (
        <Dialog
            header={t("tasks.newTask")}
            visible={visible}
            onHide={onHide}
            className="w-full max-w-lg bg-[#2E2E2E] border border-[#3D3D3D]"
            pt={{
                header: { className: 'bg-[#2E2E2E] text-[#F0F0F0] border-b border-[#3D3D3D] p-5' },
                content: { className: 'p-5 bg-[#2E2E2E]' },
                footer: { className: 'p-5 bg-[#2E2E2E] border-t border-[#3D3D3D]' },
            }}
        >
            <div className="flex flex-col gap-5 mt-2">
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-[#757575] font-medium">{t("tasks.titleLabel")}</label>
                    <InputText
                        value={newTask.title}
                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && onCreateTask()}
                        className="bg-[#242424] border-[#3D3D3D] text-[#F0F0F0] focus:border-[#34C774]"
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-[#757575] font-medium">{t("tasks.descriptionLabel")}</label>
                    <InputTextarea
                        value={newTask.description}
                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                        rows={3}
                        className="bg-[#242424] border-[#3D3D3D] text-[#F0F0F0] focus:border-[#34C774]"
                    />
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-[#3D3D3D] bg-[#242424]">
                    <Checkbox
                        inputId="kanban-daily-toggle"
                        checked={newTask.isDaily}
                        onChange={(e) => setNewTask({ ...newTask, isDaily: e.checked ?? false })}
                        className="daily-checkbox"
                    />
                    <label htmlFor="kanban-daily-toggle" className="text-xs text-[#9A9A9A] font-medium cursor-pointer select-none">
                        {t("tasks.dailyToggle")}
                    </label>
                    <i
                        className="pi pi-question-circle text-[#353535] hover:text-[#757575] text-xs cursor-help transition-colors ml-auto"
                        id="kanban-daily-tooltip-icon"
                    />
                    <Tooltip
                        target="#kanban-daily-tooltip-icon"
                        position="top"
                        pt={{ text: { className: 'bg-[#2E2E2E] text-[#F0F0F0] text-[11px] border border-[#3D3D3D] p-3 rounded-lg' } }}
                    >
                        {t("tasks.dailyTooltip")}
                    </Tooltip>
                </div>
                <Button
                    label={t("tasks.createTask")}
                    onClick={onCreateTask}
                    className="bg-[#4F8EF7] border-none text-white py-2.5 rounded-lg hover:bg-[#3D77E0] font-medium"
                />
            </div>
        </Dialog>
    );
};

export default CreateTaskDialog;
