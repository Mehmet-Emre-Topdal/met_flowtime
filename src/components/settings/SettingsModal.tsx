import React, { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputNumber } from 'primereact/inputnumber';
import { useAppSelector, useAppDispatch } from '@/hooks/storeHooks';
import { updateConfig } from '@/features/timer/slices/timerSlice';
import { UserConfig, FlowtimeInterval } from '@/types/config';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '@/lib/i18n';

interface SettingsModalProps {
    visible: boolean;
    onHide: () => void;
}

const SettingsModal = ({ visible, onHide }: SettingsModalProps) => {
    const { t, i18n } = useTranslation();
    const dispatch = useAppDispatch();
    const { config } = useAppSelector((state) => state.timer);
    const [localConfig, setLocalConfig] = useState<UserConfig>(config);

    useEffect(() => {
        if (visible) setLocalConfig(config);
    }, [visible, config]);

    const handleBoundaryChange = (index: number, value: number) => {
        const newIntervals = [...localConfig.intervals];
        newIntervals[index] = { ...newIntervals[index], max: value };
        newIntervals[index + 1] = { ...newIntervals[index + 1], min: value };
        setLocalConfig({ ...localConfig, intervals: newIntervals });
    };

    const handleBreakChange = (index: number, value: number) => {
        const newIntervals = [...localConfig.intervals];
        newIntervals[index] = { ...newIntervals[index], break: value };
        setLocalConfig({ ...localConfig, intervals: newIntervals });
    };

    const addInterval = () => {
        const intervals = [...localConfig.intervals];
        const lastInterval = intervals[intervals.length - 1];
        const splitPoint = lastInterval.min + 10;

        intervals[intervals.length - 1] = { ...lastInterval, max: splitPoint };
        intervals.push({ min: splitPoint, max: 999, break: lastInterval.break + 5 });

        setLocalConfig({ ...localConfig, intervals });
    };

    const removeInterval = (index: number) => {
        if (localConfig.intervals.length <= 2) return;
        const intervals = [...localConfig.intervals];

        if (index === 0) {
            intervals[1] = { ...intervals[1], min: 0 };
        } else if (index === intervals.length - 1) {
            intervals[index - 1] = { ...intervals[index - 1], max: 999 };
        } else {
            intervals[index - 1] = { ...intervals[index - 1], max: intervals[index + 1].min };
        }

        intervals.splice(index, 1);
        setLocalConfig({ ...localConfig, intervals });
    };

    const handleSave = () => {
        dispatch(updateConfig(localConfig));
        onHide();
    };

    return (
        <Dialog
            header={t("settings.title")}
            visible={visible}
            onHide={onHide}
            className="w-full max-w-2xl bg-[#18181b] border border-[#27272a]"
            pt={{
                header: { className: 'bg-[#18181b] text-[#fafafa] border-b border-[#27272a] p-5' },
                content: { className: 'p-5 bg-[#18181b]' },
                footer: { className: 'p-5 bg-[#18181b] border-t border-[#27272a]' }
            }}
            footer={
                <div className="flex justify-end gap-3">
                    <Button label={t("common.cancel")} onClick={onHide} className="p-button-text text-[#71717a] hover:text-[#a1a1aa]" />
                    <Button label={t("settings.saveChanges")} onClick={handleSave} className="bg-[#6366f1] border-none text-white px-5 rounded-lg hover:bg-[#4f46e5]" />
                </div>
            }
        >
            <div className="flex flex-col gap-6 mt-2">
                {/* Language Section */}
                <div className="flex flex-col gap-3">
                    <header>
                        <h4 className="text-sm font-medium text-[#fafafa] mb-1">{t("settings.language")}</h4>
                        <p className="text-xs text-[#71717a]">{t("settings.languageDesc")}</p>
                    </header>
                    <div className="flex gap-2">
                        <button
                            onClick={() => changeLanguage('tr')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-xs font-medium transition-all duration-200
                                ${i18n.language === 'tr'
                                    ? 'bg-[#6366f1]/10 border-[#6366f1]/30 text-[#6366f1]'
                                    : 'bg-transparent border-[#27272a] text-[#71717a] hover:border-[#3f3f46] hover:text-[#a1a1aa]'
                                }`}
                        >
                            <span className="text-base">🇹🇷</span>
                            <span>Türkçe</span>
                        </button>
                        <button
                            onClick={() => changeLanguage('en')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-xs font-medium transition-all duration-200
                                ${i18n.language === 'en'
                                    ? 'bg-[#6366f1]/10 border-[#6366f1]/30 text-[#6366f1]'
                                    : 'bg-transparent border-[#27272a] text-[#71717a] hover:border-[#3f3f46] hover:text-[#a1a1aa]'
                                }`}
                        >
                            <span className="text-base">🇬🇧</span>
                            <span>English</span>
                        </button>
                    </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-[#27272a]" />

                {/* Flow Intervals Section */}
                <header>
                    <h4 className="text-sm font-medium text-[#fafafa] mb-1">{t("settings.flowIntervals")}</h4>
                    <p className="text-xs text-[#71717a]">{t("settings.flowIntervalsDesc")}</p>
                </header>

                <div className="flex flex-col gap-2.5">
                    <div className="grid grid-cols-[1fr_1fr_auto] gap-4 text-[10px] text-[#71717a] uppercase tracking-wider px-3 mb-0.5">
                        <span>{t("settings.focusRange")}</span>
                        <span className="text-center">{t("settings.breakDuration")}</span>
                        <span className="w-8"></span>
                    </div>

                    {localConfig.intervals.map((interval, index) => (
                        <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-3 items-center bg-[#09090b] p-3 rounded-lg border border-[#27272a] px-3 transition-all hover:border-[#3f3f46] group">
                            <div className="flex items-center gap-2">
                                <span className="text-[#a1a1aa] text-sm min-w-[2rem] text-right tabular-nums">
                                    {index === 0 ? '0' : interval.min}
                                </span>
                                <span className="text-[#3f3f46] text-xs">–</span>
                                {index === localConfig.intervals.length - 1 ? (
                                    <span className="text-[#a1a1aa] text-sm">∞</span>
                                ) : (
                                    <InputNumber
                                        value={interval.max}
                                        onValueChange={(e) => handleBoundaryChange(index, e.value || 0)}
                                        className="settings-input-compact"
                                        inputClassName="bg-transparent border-none text-[#fafafa] w-full text-center text-sm"
                                        suffix=" m"
                                        min={interval.min + 1}
                                    />
                                )}
                            </div>

                            <div className="flex justify-center">
                                <div className="bg-[#6366f1]/10 rounded-md px-3 py-1 border border-[#6366f1]/20 group-hover:border-[#6366f1]/30 transition-colors">
                                    <InputNumber
                                        value={interval.break}
                                        onValueChange={(e) => handleBreakChange(index, e.value || 0)}
                                        className="settings-input-compact"
                                        inputClassName="bg-transparent border-none text-[#6366f1] w-full text-center font-medium text-sm"
                                        suffix=" m"
                                        min={1}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={() => removeInterval(index)}
                                disabled={localConfig.intervals.length <= 2}
                                className="w-7 h-7 flex items-center justify-center rounded text-[#71717a] hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                                title={t("settings.removeInterval")}
                            >
                                <i className="pi pi-times text-[10px]" />
                            </button>
                        </div>
                    ))}

                    <button
                        onClick={addInterval}
                        className="flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-[#27272a] text-[#71717a] hover:border-[#3f3f46] hover:text-[#a1a1aa] hover:bg-[#18181b] transition-all"
                    >
                        <i className="pi pi-plus text-[10px]" />
                        <span className="text-xs font-medium">{t("settings.addInterval")}</span>
                    </button>
                </div>
            </div>

            <style jsx global>{`
                .settings-input-compact .p-inputnumber-input {
                    padding: 0.25rem 0.5rem !important;
                    border: 1px solid transparent !important;
                    border-radius: 4px !important;
                    transition: all 0.2s;
                }
                .settings-input-compact .p-inputnumber-input:focus {
                    border-color: #6366f1 !important;
                    background: rgba(99, 102, 241, 0.05) !important;
                    outline: none !important;
                }
            `}</style>
        </Dialog>
    );
};

export default SettingsModal;
