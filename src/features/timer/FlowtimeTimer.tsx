import React, { useState, useEffect, useRef } from 'react';
import { Knob } from 'primereact/knob';
import { Button } from 'primereact/button';
import { calculateBreakDuration, formatTime } from '@/utils/timerUtils';
import { useUpdateTaskFocusTimeMutation, useGetTasksQuery } from '@/features/kanban/api/tasksApi';
import { useGetUserConfigQuery } from '@/features/timer/api/timerApi';
import { updateConfig, setLoadedFromFirebase } from '@/features/timer/slices/timerSlice';
import { useAppDispatch, useAppSelector } from '@/hooks/storeHooks';
import { useTranslation } from 'react-i18next';
import { useCreateSessionMutation } from '@/features/analytics/api/sessionsApi';

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
    const [createSession] = useCreateSessionMutation();
    const activeTask = tasks.find(t => t.id === selectedTaskId);

    const [seconds, setSeconds] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [isBreak, setIsBreak] = useState(false);
    const [breakSeconds, setBreakSeconds] = useState(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const breakEndAudio = useRef<HTMLAudioElement | null>(null);
    const sessionStartRef = useRef<Date | null>(null);

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
        if (!sessionStartRef.current) {
            sessionStartRef.current = new Date();
        }
        setIsActive(true);
        setIsBreak(false);
    };

    const pauseTimer = () => {
        setIsActive(false);
    };

    const saveSession = async (focusSeconds: number, breakSecs: number) => {
        if (!user?.uid || focusSeconds < 60) return;
        const now = new Date();
        const startedAt = sessionStartRef.current || new Date(now.getTime() - focusSeconds * 1000);
        try {
            await createSession({
                userId: user.uid,
                startedAt: startedAt.toISOString(),
                endedAt: now.toISOString(),
                durationSeconds: focusSeconds,
                breakDurationSeconds: breakSecs,
                taskId: selectedTaskId || null,
            }).unwrap();
        } catch (err) {
            console.error('Failed to save session:', err);
        }
    };

    const resetTimer = async () => {
        if (seconds >= 60 && !isBreak) {
            await saveSession(seconds, 0);
        }
        setIsActive(false);
        setSeconds(0);
        setBreakSeconds(0);
        setIsBreak(false);
        sessionStartRef.current = null;
    };

    const takeBreak = async () => {
        const duration = Math.round(calculateBreakDuration(seconds, config.intervals));

        if (selectedTaskId && seconds > 0) {
            const minutes = Math.floor(seconds / 60);
            if (minutes > 0) {
                await updateTaskFocusTime({ taskId: selectedTaskId, additionalMinutes: minutes });
            }
        }

        await saveSession(seconds, duration);
        sessionStartRef.current = null;

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

    const accentColor = isBreak ? '#34d399' : '#7c6ff7';
    const accentRingDim = isBreak ? 'rgba(52, 211, 153, 0.1)' : 'rgba(124, 111, 247, 0.1)';

    return (
        <div className="timer-root animate-fade-in">
            {/* Status header */}
            <header className="timer-header">
                <h2 className="timer-header__title">
                    {isBreak ? t("timer.breakTime") : t("timer.focusSession")}
                </h2>

                {activeTask && !isBreak && (
                    <div className="timer-header__task animate-fade-in">
                        <i className="pi pi-tag timer-header__task-icon" />
                        <span className="timer-header__task-name">{activeTask.title}</span>
                    </div>
                )}

                <p className="timer-header__status">
                    {isBreak
                        ? t("timer.rechargingFocus")
                        : isActive
                            ? t("timer.flowActive")
                            : t("timer.readyToFocus")}
                </p>
            </header>

            {/* Knob + time display */}
            <div className="timer-knob-wrapper">
                <div
                    className="timer-knob-glow"
                    style={{ background: `radial-gradient(circle, ${accentRingDim} 0%, transparent 70%)` }}
                />
                <Knob
                    value={knobValue}
                    size={240}
                    min={0}
                    max={isBreak ? 100 : 60}
                    readOnly
                    strokeWidth={4}
                    rangeColor="rgba(255,255,255,0.05)"
                    valueColor={accentColor}
                    textColor="transparent"
                />
                <div className="timer-time-overlay">
                    <span className="timer-time-display">
                        {formatTime(isBreak ? breakSeconds : seconds)}
                    </span>
                    <span className="timer-time-label">
                        {isBreak ? t("timer.remaining") : t("timer.elapsed")}
                    </span>
                </div>
            </div>

            {/* Controls */}
            <div className="timer-controls">
                {!isActive ? (
                    <Button
                        icon="pi pi-play"
                        label={seconds > 0 ? t("timer.resume") : t("timer.start")}
                        onClick={startTimer}
                        className="timer-btn timer-btn--primary"
                    />
                ) : (
                    <>
                        <Button
                            icon="pi pi-pause"
                            onClick={pauseTimer}
                            className="timer-btn timer-btn--icon"
                        />
                        {!isBreak && (
                            <Button
                                icon="pi pi-coffee"
                                label={t("timer.break")}
                                onClick={takeBreak}
                                className="timer-btn timer-btn--break"
                            />
                        )}
                    </>
                )}
                <Button
                    icon="pi pi-refresh"
                    onClick={resetTimer}
                    className="timer-btn timer-btn--ghost"
                />
            </div>
        </div>
    );
};

export default FlowtimeTimer;
