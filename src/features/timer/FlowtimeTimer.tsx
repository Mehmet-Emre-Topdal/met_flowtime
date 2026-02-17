import React, { useState, useEffect, useRef } from 'react';
import { Knob } from 'primereact/knob';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
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

        // Update task focus time if a task is selected
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

    const timerColor = isBreak ? "#800020" : "#c5a059";

    return (
        <div className="flex flex-col items-center justify-center gap-12 py-10 w-full max-w-2xl mx-auto">
            <header className="text-center flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                    <h2 className="font-serif text-5xl text-[#fffdd0] tracking-tight italic">
                        {isBreak ? "Restoration" : "Deep Immersion"}
                    </h2>
                    <div className="h-[2px] w-24 bg-[#c5a059]/30 mx-auto"></div>
                </div>

                {activeTask && !isBreak && (
                    <div className="flex flex-col items-center gap-1 animate-fade-in">
                        <span className="text-[10px] text-[#c5a059]/50 uppercase tracking-[0.3em]">Currently Refining</span>
                        <p className="font-serif text-[#c5a059] text-xl">{activeTask.title}</p>
                    </div>
                )}

                <p className="text-[#c5a059]/60 font-sans uppercase tracking-[0.5em] text-[10px] font-semibold">
                    {isBreak ? "Recovering focus" : "Flow state active"}
                </p>
            </header>

            <div className="relative group scale-100 md:scale-110">
                <div className="absolute inset-0 rounded-full bg-[#c5a059]/5 blur-3xl group-hover:bg-[#c5a059]/10 transition-all duration-1000"></div>

                <Knob
                    value={knobValue}
                    size={280}
                    min={0}
                    max={isBreak ? 100 : 60}
                    readOnly
                    strokeWidth={3}
                    rangeColor="#1e1e1e"
                    valueColor={timerColor}
                    textColor="transparent"
                />

                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="font-serif text-6xl text-[#fffdd0] tracking-tighter drop-shadow-2xl">
                        {formatTime(isBreak ? breakSeconds : seconds)}
                    </span>
                    <span className="text-[#c5a059]/40 font-sans text-[10px] uppercase tracking-[0.3em] mt-2">
                        {isBreak ? "Remaining" : "Elapsed"}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-6">
                {!isActive ? (
                    <Button
                        icon="pi pi-play"
                        label={seconds > 0 ? "Resume Flow" : "Enter Flow"}
                        onClick={startTimer}
                        className="bg-transparent border-2 border-[#c5a059] text-[#c5a059] hover:bg-[#c5a059] hover:text-[#0f172a] px-10 py-5 rounded-full font-serif text-xl transition-all shadow-xl shadow-[#c5a059]/5"
                    />
                ) : (
                    <>
                        <Button
                            icon="pi pi-pause"
                            onClick={pauseTimer}
                            className="p-button-rounded p-button-outlined border-2 border-[#c5a059]/30 text-[#c5a059]/70 hover:border-[#c5a059] w-20 h-20 transition-all"
                        />
                        {!isBreak && seconds > 60 && (
                            <Button
                                icon="pi pi-coffee"
                                label="Take Break"
                                onClick={takeBreak}
                                className="bg-[#800020] border-none text-white hover:bg-[#a00028] px-10 py-5 rounded-full font-serif text-xl shadow-2xl shadow-[#800020]/20 transition-all"
                            />
                        )}
                    </>
                )}
                <Button
                    icon="pi pi-refresh"
                    onClick={resetTimer}
                    className="p-button-rounded p-button-text text-[#c5a059]/30 hover:text-[#c5a059] w-14 h-14 transition-all"
                />
            </div>

            <Card className="bg-[#1e1e1e]/40 border border-[#c5a059]/10 backdrop-blur-md max-w-md w-full mt-8">
                <div className="flex justify-between items-center text-xs font-sans uppercase tracking-[0.2em] text-[#c5a059]/50">
                    <div className="flex flex-col gap-1 items-center">
                        <span className="text-[#c5a059]">Milestone</span>
                        <span className="text-[#fffdd0]">25m</span>
                    </div>
                    <div className="w-px h-8 bg-[#c5a059]/10"></div>
                    <div className="flex flex-col gap-1 items-center">
                        <span className="text-[#c5a059]">Immersion</span>
                        <span className="text-[#fffdd0]">50m</span>
                    </div>
                    <div className="w-px h-8 bg-[#c5a059]/10"></div>
                    <div className="flex flex-col gap-1 items-center">
                        <span className="text-[#c5a059]">Deep Flow</span>
                        <span className="text-[#fffdd0]">90m</span>
                    </div>
                </div>
            </Card>

            <style jsx global>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.8s ease-out forwards;
                }
                .p-knob-value {
                    transition: stroke-dashoffset 0.5s ease-in-out;
                }
            `}</style>
        </div>
    );
};

export default FlowtimeTimer;
