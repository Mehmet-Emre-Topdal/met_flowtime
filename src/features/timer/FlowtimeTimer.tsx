import React, { useState, useEffect, useRef } from 'react';
import { Knob } from 'primereact/knob';
import { Button } from 'primereact/button';
import { calculateBreakDuration, formatTime } from '@/utils/timerUtils';
import { useUpdateTaskFocusTimeMutation, useGetTasksQuery } from '@/features/kanban/api/tasksApi';
import { useGetUserConfigQuery } from '@/features/timer/api/timerApi';
import { updateConfig, setLoadedFromFirebase } from '@/features/timer/slices/timerSlice';
import { useAppDispatch, useAppSelector } from '@/hooks/storeHooks';
import { useTranslation } from 'react-i18next';

const FlowtimeTimer = () => {
    const { t } = useTranslation();
    const { user } = useAppSelector((state) => state.auth);
    const { selectedTaskId } = useAppSelector((state) => state.task);
    const { config, isLoadedFromFirebase } = useAppSelector((state) => state.timer);
    const { data: firebaseConfig, isLoading: isConfigLoading } = useGetUserConfigQuery(user?.uid || '', { skip: !user?.uid || isLoadedFromFirebase });
    const { data: tasks = [] } = useGetTasksQuery(user?.uid || '', { skip: !user?.uid });

    const dispatch = useAppDispatch();

    useEffect(() => {
        if (firebaseConfig) {
            dispatch(updateConfig(firebaseConfig));
            dispatch(setLoadedFromFirebase(true));
        }
    }, [firebaseConfig, dispatch]);

    const [updateTaskFocusTime] = useUpdateTaskFocusTimeMutation();
    const activeTask = tasks.find(t => t.id === selectedTaskId);

    const [seconds, setSeconds] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [isBreak, setIsBreak] = useState(false);
    const [breakSeconds, setBreakSeconds] = useState(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const breakEndAudio = useRef<HTMLAudioElement | null>(null);

    const SOUNDS = {
        bell: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
        digital: 'https://assets.mixkit.co/active_storage/sfx/1070/1070-preview.mp3',
        birds: 'https://assets.mixkit.co/active_storage/sfx/139/139-preview.mp3'
    };

    useEffect(() => {
        const audioUrl = SOUNDS[config.soundId as keyof typeof SOUNDS] || SOUNDS.bell;
        const audio = new Audio(audioUrl);
        audio.preload = 'auto';
        breakEndAudio.current = audio;
    }, [config.soundId]);

    const playBell = () => {
        if (breakEndAudio.current) {
            breakEndAudio.current.currentTime = 0;
            breakEndAudio.current.play().catch(err => console.error("Audio play failed:", err));
        }
    };

    const startTimer = () => {
        setIsActive(true);
        setIsBreak(false);
    };

    const pauseTimer = () => {
        setIsActive(false);
    };

    const resetTimer = () => {
        setIsActive(false);
        setSeconds(0);
        setBreakSeconds(0);
        setIsBreak(false);
    };

    const takeBreak = async () => {
        const duration = Math.round(calculateBreakDuration(seconds, config.intervals));

        if (selectedTaskId && seconds > 0) {
            // Only update if at least 1 minute is focused, otherwise just take break
            const minutes = Math.floor(seconds / 60);
            if (minutes > 0) {
                await updateTaskFocusTime({ taskId: selectedTaskId, additionalMinutes: minutes });
            }
        }

        setBreakSeconds(duration);
        setIsBreak(true);
        setIsActive(true);
    };

    useEffect(() => {
        if (isActive) {
            intervalRef.current = setInterval(() => {
                if (isBreak) {
                    setBreakSeconds((prev) => {
                        if (prev <= 1) {
                            setIsActive(false);
                            playBell();
                            return 0;
                        }
                        return prev - 1;
                    });
                } else {
                    setSeconds((prev) => prev + 1);
                }
            }, 1000);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isActive, isBreak, seconds, config.intervals]);

    const knobValue = isBreak
        ? Math.floor((breakSeconds / calculateBreakDuration(seconds, config.intervals)) * 100)
        : (seconds % 60);

    const timerColor = isBreak ? "#ef4444" : "#6366f1";

    return (
        <div className="flex flex-col items-center justify-center gap-10 py-6 w-full max-w-2xl mx-auto">
            <header className="text-center flex flex-col gap-3">
                <h2 className="text-2xl font-semibold text-[#fafafa] tracking-tight">
                    {isBreak ? t("timer.breakTime") : t("timer.focusSession")}
                </h2>

                {activeTask && !isBreak && (
                    <div className="flex items-center gap-2 justify-center animate-fade-in">
                        <span className="text-xs text-[#71717a]">{t("timer.workingOn")}</span>
                        <span className="text-sm text-[#6366f1] font-medium">{activeTask.title}</span>
                    </div>
                )}

                <p className="text-[#71717a] text-xs tracking-wide">
                    {isBreak ? t("timer.rechargingFocus") : isActive ? t("timer.flowActive") : t("timer.readyToFocus")}
                </p>
            </header>

            <div className="relative">
                <Knob
                    value={knobValue}
                    size={240}
                    min={0}
                    max={isBreak ? 100 : 60}
                    readOnly
                    strokeWidth={3}
                    rangeColor="#27272a"
                    valueColor={timerColor}
                    textColor="transparent"
                />

                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-5xl font-semibold text-[#fafafa] tracking-tight tabular-nums">
                        {formatTime(isBreak ? breakSeconds : seconds)}
                    </span>
                    <span className="text-[#71717a] text-[11px] mt-1.5 uppercase tracking-widest">
                        {isBreak ? t("timer.remaining") : t("timer.elapsed")}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {!isActive ? (
                    <Button
                        icon="pi pi-play"
                        label={seconds > 0 ? t("timer.resume") : t("timer.start")}
                        onClick={startTimer}
                        className="bg-[#6366f1] border-none text-white hover:bg-[#4f46e5] px-8 py-3 rounded-lg text-sm font-medium transition-colors"
                    />
                ) : (
                    <>
                        <Button
                            icon="pi pi-pause"
                            onClick={pauseTimer}
                            className="p-button-rounded bg-[#27272a] border-none text-[#a1a1aa] hover:bg-[#3f3f46] hover:text-[#fafafa] w-12 h-12 transition-colors"
                        />
                        {!isBreak && (
                            <Button
                                icon="pi pi-coffee"
                                label={t("timer.break")}
                                onClick={takeBreak}
                                className="bg-[#ef4444] border-none text-white hover:bg-[#dc2626] px-6 py-3 rounded-lg text-sm font-medium transition-colors"
                            />
                        )}
                    </>
                )}
                <Button
                    icon="pi pi-refresh"
                    onClick={resetTimer}
                    className="p-button-rounded p-button-text text-[#71717a] hover:text-[#a1a1aa] w-10 h-10 transition-colors"
                />
            </div>

            <style jsx global>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out forwards;
                }
                .p-knob-value {
                    transition: stroke-dashoffset 0.5s ease-in-out;
                }
            `}</style>
        </div>
    );
};

export default FlowtimeTimer;
