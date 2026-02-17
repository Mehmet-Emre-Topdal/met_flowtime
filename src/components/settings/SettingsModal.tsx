import React, { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputNumber } from 'primereact/inputnumber';
import { useAppSelector, useAppDispatch } from '@/hooks/storeHooks';
import { updateConfig } from '@/features/timer/slices/timerSlice';
import { UserConfig, FlowtimeInterval } from '@/types/config';

interface SettingsModalProps {
    visible: boolean;
    onHide: () => void;
}

const SettingsModal = ({ visible, onHide }: SettingsModalProps) => {
    const dispatch = useAppDispatch();
    const { config } = useAppSelector((state) => state.timer);
    const [localConfig, setLocalConfig] = useState<UserConfig>(config);

    // Dialog açılırken config'i yeniden yükle
    useEffect(() => {
        if (visible) setLocalConfig(config);
    }, [visible, config]);

    /**
     * Sadece sınır değerlerini ve break'leri düzenliyoruz.
     * Aralıklar birbirine bağlı: bir öncekinin max'ı = bir sonrakinin min'i.
     * İlk min her zaman 0, son max her zaman ∞.
     */
    const handleBoundaryChange = (index: number, value: number) => {
        // index: sınır noktası indeksi (0 = ilk aralık ile ikinci aralık arasındaki sınır)
        // intervals.length - 1 tane sınır noktası var
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
        // Son aralığı ikiye böl: mevcut min'den +10 noktasında
        const splitPoint = lastInterval.min + 10;

        // Mevcut son aralığın max'ını splitPoint yap
        intervals[intervals.length - 1] = { ...lastInterval, max: splitPoint };

        // Yeni son aralık ekle (splitPoint → ∞)
        intervals.push({ min: splitPoint, max: 999, break: lastInterval.break + 5 });

        setLocalConfig({ ...localConfig, intervals });
    };

    const removeInterval = (index: number) => {
        if (localConfig.intervals.length <= 2) return; // En az 2 aralık olmalı
        const intervals = [...localConfig.intervals];

        if (index === 0) {
            // İlk aralık silinirse, ikincinin min'i 0 olur
            intervals[1] = { ...intervals[1], min: 0 };
        } else if (index === intervals.length - 1) {
            // Son aralık silinirse, öncekinin max'ı ∞ olur
            intervals[index - 1] = { ...intervals[index - 1], max: 999 };
        } else {
            // Ortadaki bir aralık silinirse, öncekinin max'ı sonrakinin min'i ile birleşir
            intervals[index - 1] = { ...intervals[index - 1], max: intervals[index + 1].min };
        }

        intervals.splice(index, 1);
        setLocalConfig({ ...localConfig, intervals });
    };

    const handleSave = () => {
        dispatch(updateConfig(localConfig));
        onHide();
    };

    const formatRange = (interval: FlowtimeInterval, index: number, total: number) => {
        const minLabel = index === 0 ? '0' : `${interval.min}`;
        const maxLabel = index === total - 1 ? '∞' : `${interval.max}`;
        return `${minLabel} – ${maxLabel} min`;
    };

    return (
        <Dialog
            header="Chronicle Settings"
            visible={visible}
            onHide={onHide}
            className="w-full max-w-2xl bg-[#1e1e1e]/90 backdrop-blur-xl border border-[#c5a059]/30"
            pt={{
                header: { className: 'bg-transparent text-[#fffdd0] font-serif border-b border-[#c5a059]/10 p-6' },
                content: { className: 'p-6 bg-transparent' },
                footer: { className: 'p-6 bg-transparent border-t border-[#c5a059]/10' }
            }}
            footer={
                <div className="flex justify-end gap-4">
                    <Button label="Discard" onClick={onHide} className="p-button-text text-[#c5a059]/50 hover:text-[#c5a059]" />
                    <Button label="Apply Changes" onClick={handleSave} className="bg-[#c5a059] text-[#0f172a] font-serif px-6 rounded-lg" />
                </div>
            }
        >
            <div className="flex flex-col gap-8 mt-4">
                <header>
                    <h4 className="text-[10px] text-[#c5a059] uppercase tracking-[0.3em] mb-2">Flow Intervals</h4>
                    <p className="text-xs text-[#c5a059]/50 font-sans italic">Calibrate the duration of your focus and matching restoration periods.</p>
                </header>

                <div className="flex flex-col gap-3">
                    {/* Header */}
                    <div className="grid grid-cols-[1fr_1fr_auto] gap-4 text-[10px] text-[#c5a059]/40 uppercase tracking-widest px-4 mb-1">
                        <span>Focus Range</span>
                        <span className="text-center">Break Duration</span>
                        <span className="w-8"></span>
                    </div>

                    {localConfig.intervals.map((interval, index) => (
                        <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-3 items-center bg-[#0f172a]/30 p-3 rounded-xl border border-[#c5a059]/5 px-4 transition-all hover:bg-[#c5a059]/5 group">
                            {/* Bağlı aralık gösterimi */}
                            <div className="flex items-center gap-2">
                                {/* Min — ilk aralıkta "0" sabit */}
                                <span className="text-[#fffdd0]/50 font-serif text-base min-w-[2rem] text-right">
                                    {index === 0 ? '0' : interval.min}
                                </span>
                                <span className="text-[#c5a059]/20 text-xs">–</span>
                                {/* Max — son aralıkta "∞" sabit, diğerlerinde düzenlenebilir */}
                                {index === localConfig.intervals.length - 1 ? (
                                    <span className="text-[#fffdd0]/50 font-serif text-base">∞</span>
                                ) : (
                                    <InputNumber
                                        value={interval.max}
                                        onValueChange={(e) => handleBoundaryChange(index, e.value || 0)}
                                        className="settings-input-compact"
                                        inputClassName="bg-transparent border-none text-[#fffdd0] w-full text-center font-serif text-base"
                                        suffix=" m"
                                        min={interval.min + 1}
                                    />
                                )}
                            </div>

                            {/* Break süresi */}
                            <div className="flex justify-center">
                                <div className="bg-[#c5a059]/10 rounded-lg px-3 py-1 border border-[#c5a059]/20 group-hover:bg-[#c5a059]/20 transition-colors">
                                    <InputNumber
                                        value={interval.break}
                                        onValueChange={(e) => handleBreakChange(index, e.value || 0)}
                                        className="settings-input-compact"
                                        inputClassName="bg-transparent border-none text-[#c5a059] w-full text-center font-bold font-serif text-base"
                                        suffix=" m"
                                        min={1}
                                    />
                                </div>
                            </div>

                            {/* Silme butonu */}
                            <button
                                onClick={() => removeInterval(index)}
                                disabled={localConfig.intervals.length <= 2}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400/30 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                                title="Remove interval"
                            >
                                <i className="pi pi-times text-[10px]" />
                            </button>
                        </div>
                    ))}

                    {/* Aralık ekleme butonu */}
                    <button
                        onClick={addInterval}
                        className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-[#c5a059]/15 text-[#c5a059]/30 hover:border-[#c5a059]/40 hover:text-[#c5a059]/60 hover:bg-[#c5a059]/5 transition-all"
                    >
                        <i className="pi pi-plus text-[10px]" />
                        <span className="text-[10px] uppercase tracking-widest">Add Interval</span>
                    </button>
                </div>
            </div>

            <style jsx global>{`
                .settings-input-compact .p-inputnumber-input {
                    padding: 0.25rem 0.5rem !important;
                    border: 1px solid rgba(197, 160, 89, 0.05) !important;
                    border-radius: 6px !important;
                    transition: all 0.2s;
                }
                .settings-input-compact .p-inputnumber-input:focus {
                    border-color: rgba(197, 160, 89, 0.4) !important;
                    background: rgba(197, 160, 89, 0.05) !important;
                    outline: none !important;
                }
            `}</style>
        </Dialog>
    );
};

export default SettingsModal;
