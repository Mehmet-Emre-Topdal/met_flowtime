import React, { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputNumber } from 'primereact/inputnumber';
import { useAppSelector, useAppDispatch } from '@/hooks/storeHooks';
import { updateConfig } from '@/features/timer/slices/timerSlice';
import { useUpdateUserConfigMutation } from '@/features/timer/api/timerApi';
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
    const { user } = useAppSelector((state) => state.auth);
    const [updateUserConfig, { isLoading: isUpdating }] = useUpdateUserConfigMutation();
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

    const handleSave = async () => {
        dispatch(updateConfig(localConfig));
        if (user?.uid) {
            try {
                await updateUserConfig({ uid: user.uid, config: localConfig }).unwrap();
            } catch (err) {
                console.error("Failed to sync config to Firebase:", err);
            }
        }
        onHide();
    };

    return (
        <Dialog
            header={t("settings.title")}
            visible={visible}
            onHide={onHide}
            className="w-full max-w-2xl bg-[#2E2E2E] border border-[#3D3D3D]"
            pt={{
                header: { className: 'bg-[#2E2E2E] text-[#F0F0F0] border-b border-[#3D3D3D] p-5' },
                content: { className: 'p-5 bg-[#2E2E2E]' },
                footer: { className: 'p-5 bg-[#2E2E2E] border-t border-[#3D3D3D]' }
            }}
            footer={
                <div className="flex justify-end gap-3">
                    <Button label={t("common.cancel")} onClick={onHide} className="p-button-text text-[#757575] hover:text-[#9A9A9A]" />
                    <Button
                        label={isUpdating ? t("common.loading") : t("settings.saveChanges")}
                        onClick={handleSave}
                        disabled={isUpdating}
                        className="bg-[#4F8EF7] border-none text-white px-5 rounded-lg hover:bg-[#3D77E0]"
                    />
                </div>
            }
        >
            <div className="flex flex-col gap-6 mt-2">
                {/* Language Section */}
                <div className="flex flex-col gap-3">
                    <header>
                        <h4 className="text-sm font-medium text-[#F0F0F0] mb-1">{t("settings.language")}</h4>
                        <p className="text-xs text-[#757575]">{t("settings.languageDesc")}</p>
                    </header>
                    <div className="flex gap-2">
                        <button
                            onClick={() => changeLanguage('tr')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-xs font-medium transition-all duration-200
                                ${i18n.language === 'tr'
                                    ? 'bg-[#4F8EF7]/10 border-[#4F8EF7]/30 text-[#4F8EF7]'
                                    : 'bg-transparent border-[#3D3D3D] text-[#757575] hover:border-[#353535] hover:text-[#9A9A9A]'
                                }`}
                        >
                            <span className="text-base">🇹🇷</span>
                            <span>Türkçe</span>
                        </button>
                        <button
                            onClick={() => changeLanguage('en')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-xs font-medium transition-all duration-200
                                ${i18n.language === 'en'
                                    ? 'bg-[#4F8EF7]/10 border-[#4F8EF7]/30 text-[#4F8EF7]'
                                    : 'bg-transparent border-[#3D3D3D] text-[#757575] hover:border-[#353535] hover:text-[#9A9A9A]'
                                }`}
                        >
                            <span className="text-base">🇬🇧</span>
                            <span>English</span>
                        </button>
                    </div>
                </div>

                {/* Sound Section */}
                <div className="flex flex-col gap-3">
                    <header>
                        <h4 className="text-sm font-medium text-[#F0F0F0] mb-1">{t("settings.sound")}</h4>
                        <p className="text-xs text-[#757575]">{t("settings.soundDesc")}</p>
                    </header>
                    <div className="flex flex-wrap gap-2">
                        {['bell', 'digital', 'birds'].map((soundId) => (
                            <button
                                key={soundId}
                                onClick={() => setLocalConfig({ ...localConfig, soundId })}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-xs font-medium transition-all duration-200
                                    ${localConfig.soundId === soundId
                                        ? 'bg-[#4F8EF7]/10 border-[#4F8EF7]/30 text-[#4F8EF7]'
                                        : 'bg-transparent border-[#3D3D3D] text-[#757575] hover:border-[#353535] hover:text-[#9A9A9A]'
                                    }`}
                            >
                                <i className={`pi ${soundId === 'bell' ? 'pi-bell' : soundId === 'digital' ? 'pi-mobile' : 'pi-twitter'} text-sm`} />
                                <span>{t(`settings.sounds.${soundId}`)}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-[#3D3D3D]" />

                {/* Flow Intervals Section */}
                <header>
                    <h4 className="text-sm font-medium text-[#F0F0F0] mb-1">{t("settings.flowIntervals")}</h4>
                    <p className="text-xs text-[#757575]">{t("settings.flowIntervalsDesc")}</p>
                </header>

                <div className="flex flex-col gap-2.5">
                    <div className="grid grid-cols-[1fr_1fr_auto] gap-4 text-[10px] text-[#757575] uppercase tracking-wider px-3 mb-0.5">
                        <span>{t("settings.focusRange")}</span>
                        <span className="text-center">{t("settings.breakDuration")}</span>
                        <span className="w-8"></span>
                    </div>

                    {localConfig.intervals.map((interval, index) => (
                        <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-3 items-center bg-[#242424] p-3 rounded-lg border border-[#3D3D3D] px-3 transition-all hover:border-[#353535] group">
                            <div className="flex items-center gap-2">
                                <span className="text-[#9A9A9A] text-sm min-w-[2rem] text-right tabular-nums">
                                    {index === 0 ? '0' : interval.min}
                                </span>
                                <span className="text-[#353535] text-xs">–</span>
                                {index === localConfig.intervals.length - 1 ? (
                                    <span className="text-[#9A9A9A] text-sm">∞</span>
                                ) : (
                                    <InputNumber
                                        value={interval.max}
                                        onValueChange={(e) => handleBoundaryChange(index, e.value || 0)}
                                        className="settings-input-compact"
                                        inputClassName="bg-transparent border-none text-[#F0F0F0] w-full text-center text-sm"
                                        suffix=" m"
                                        min={interval.min + 0.1}
                                        step={0.1}
                                        minFractionDigits={1}
                                    />
                                )}
                            </div>

                            <div className="flex justify-center">
                                <div className="bg-[#4F8EF7]/10 rounded-md px-3 py-1 border border-[#4F8EF7]/20 group-hover:border-[#4F8EF7]/30 transition-colors">
                                    <InputNumber
                                        value={interval.break}
                                        onValueChange={(e) => handleBreakChange(index, e.value || 0)}
                                        className="settings-input-compact"
                                        inputClassName="bg-transparent border-none text-[#4F8EF7] w-full text-center font-medium text-sm"
                                        suffix=" m"
                                        min={0.1}
                                        step={0.1}
                                        minFractionDigits={1}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={() => removeInterval(index)}
                                disabled={localConfig.intervals.length <= 2}
                                className="w-7 h-7 flex items-center justify-center rounded text-[#757575] hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                                title={t("settings.removeInterval")}
                            >
                                <i className="pi pi-times text-[10px]" />
                            </button>
                        </div>
                    ))}

                    <button
                        onClick={addInterval}
                        className="flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-[#3D3D3D] text-[#757575] hover:border-[#353535] hover:text-[#9A9A9A] hover:bg-[#2E2E2E] transition-all"
                    >
                        <i className="pi pi-plus text-[10px]" />
                        <span className="text-xs font-medium">{t("settings.addInterval")}</span>
                    </button>
                </div>
            </div>

        </Dialog>
    );
};

export default SettingsModal;
