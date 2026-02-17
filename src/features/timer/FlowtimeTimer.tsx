import React, { useState, useEffect, useRef } from 'react';
import { Knob } from 'primereact/knob';
import { Button } from 'primereact/button';
import { calculateBreakDuration, formatTime } from '@/utils/timerUtils';
import { useAppSelector } from '@/hooks/storeHooks';
import { useUpdateTaskFocusTimeMutation, useGetTasksQuery } from '@/features/kanban/api/tasksApi';

const FlowtimeTimer = () => {
    const { user } = useAppSelector((state) => state.auth);
    const { selectedTaskId } = useAppSelector((state) => state.task);
    const { config } = useAppSelector((state) => state.timer);
    const { data: tasks = [] } = useGetTasksQuery(user?.uid || '', { skip: !user?.uid });

    const [updateTaskFocusTime] = useUpdateTaskFocusTimeMutation();
    const activeTask = tasks.find(t => t.id === selectedTaskId);

    const [seconds, setSeconds] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [isBreak, setIsBreak] = useState(false);
    const [breakSeconds, setBreakSeconds] = useState(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

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
        const duration = calculateBreakDuration(seconds, config.intervals);

        if (selectedTaskId && seconds > 60) {
            const minutes = Math.floor(seconds / 60);
            await updateTaskFocusTime({ taskId: selectedTaskId, additionalMinutes: minutes });
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
                    {isBreak ? "Break Time" : "Focus Session"}
                </h2>

                {activeTask && !isBreak && (
                    <div className="flex items-center gap-2 justify-center animate-fade-in">
                        <span className="text-xs text-[#71717a]">Working on</span>
                        <span className="text-sm text-[#6366f1] font-medium">{activeTask.title}</span>
                    </div>
                )}

                <p className="text-[#71717a] text-xs tracking-wide">
                    {isBreak ? "Recharging focus" : isActive ? "Flow state active" : "Ready to focus"}
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
                        {isBreak ? "remaining" : "elapsed"}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {!isActive ? (
                    <Button
                        icon="pi pi-play"
                        label={seconds > 0 ? "Resume" : "Start"}
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
                        {!isBreak && seconds > 60 && (
                            <Button
                                icon="pi pi-coffee"
                                label="Break"
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

            <div className="flex items-center gap-6 px-6 py-3 bg-[#18181b] border border-[#27272a] rounded-lg">
                <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[10px] text-[#71717a] uppercase tracking-wider">Phase 1</span>
                    <span className="text-sm text-[#a1a1aa] font-medium">25m</span>
                </div>
                <div className="w-px h-6 bg-[#27272a]"></div>
                <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[10px] text-[#71717a] uppercase tracking-wider">Phase 2</span>
                    <span className="text-sm text-[#a1a1aa] font-medium">50m</span>
                </div>
                <div className="w-px h-6 bg-[#27272a]"></div>
                <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[10px] text-[#71717a] uppercase tracking-wider">Phase 3</span>
                    <span className="text-sm text-[#a1a1aa] font-medium">90m</span>
                </div>
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
