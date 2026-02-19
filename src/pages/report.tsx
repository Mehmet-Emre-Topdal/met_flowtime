import React, { useMemo } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useAppSelector } from '@/hooks/storeHooks';
import { useGetSessionsQuery, useSeedSessionsMutation } from '@/features/analytics/api/sessionsApi';
import { useGetTasksQuery } from '@/features/kanban/api/tasksApi';
import { useTranslation } from 'react-i18next';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { generateMockSessions } from '@/features/analytics/utils/mockDataGenerator';
import { useRef } from 'react';

import {
    calcDailyFlowWaves,
    calcFocusDensity,
    calcResistancePoint,
    calcEarnedFreedom,
    calcNaturalFlowWindow,
    calcFlowStreak,
    calcTaskFlowHarmony,
    calcWarmupPhase,
} from '@/features/analytics/utils/analyticsCalculations';

import DailyFlowWaves from '@/features/analytics/components/DailyFlowWaves';
import WeeklyWorkTimeCard from '@/features/analytics/components/WeeklyWorkTimeCard';
import FocusDensityCard from '@/features/analytics/components/FocusDensityCard';
import ResistancePointCard from '@/features/analytics/components/ResistancePointCard';
import EarnedFreedomCard from '@/features/analytics/components/EarnedFreedomCard';
import FlowWindowCard from '@/features/analytics/components/FlowWindowCard';
import FlowStreakCard from '@/features/analytics/components/FlowStreakCard';
import TaskFlowHarmonyCard from '@/features/analytics/components/TaskFlowHarmonyCard';
import WarmupPhaseCard from '@/features/analytics/components/WarmupPhaseCard';

const ReportPage = () => {
    const { t } = useTranslation();
    const toast = useRef<Toast>(null);
    const { user } = useAppSelector(state => state.auth);
    const { data: sessions = [], isLoading: sessionsLoading } = useGetSessionsQuery(user?.uid || '', { skip: !user?.uid });
    const { data: tasks = [] } = useGetTasksQuery(user?.uid || '', { skip: !user?.uid });
    const [seedSessions, { isLoading: isSeeding }] = useSeedSessionsMutation();

    const handleSeed = async () => {
        console.log('Seed button clicked. User:', user?.uid);
        if (!user?.uid) {
            toast.current?.show({ severity: 'error', summary: 'Error', detail: 'User not logged in' });
            return;
        }

        const mockData = generateMockSessions(user.uid);
        console.log('Generated mock data count:', mockData.length);

        try {
            const result = await seedSessions(mockData).unwrap();
            console.log('Seed successful:', result);
            toast.current?.show({
                severity: 'success',
                summary: 'Success',
                detail: `${result.count} test seansı başarıyla eklendi! Sayfa yenileniyor...`
            });
        } catch (err: any) {
            console.error('Failed to seed sessions:', err);
            toast.current?.show({
                severity: 'error',
                summary: 'Hata',
                detail: `Firestore hatası: ${err.message || 'Yetki sorunu olabilir.'}`
            });
        }
    };

    const analytics = useMemo(() => {
        if (sessions.length === 0) return null;
        return {
            flowWaves: calcDailyFlowWaves(sessions),
            focusDensity: calcFocusDensity(sessions),
            resistancePoint: calcResistancePoint(sessions),
            earnedFreedom: calcEarnedFreedom(sessions),
            flowWindow: calcNaturalFlowWindow(sessions),
            flowStreak: calcFlowStreak(sessions),
            taskHarmony: calcTaskFlowHarmony(sessions, tasks),
            warmup: calcWarmupPhase(sessions),
        };
    }, [sessions, tasks]);

    if (sessionsLoading) {
        return (
            <MainLayout>
                <div className="analytics-loading">
                    <ProgressSpinner style={{ width: '40px', height: '40px' }} strokeWidth="4" />
                    <span>{t('analytics.loadingSessions')}</span>
                </div>
            </MainLayout>
        );
    }

    if (!analytics) {
        return (
            <MainLayout>
                <Toast ref={toast} />
                <div className="analytics-empty">
                    <i className="pi pi-chart-bar analytics-empty__icon" />
                    <h2>{t('analytics.title')}</h2>
                    <p>{t('analytics.noSessions')}</p>
                    <Button
                        label={isSeeding ? "Ekleniyor..." : "Test Verisi Oluştur (30 Günlük)"}
                        icon={isSeeding ? "pi pi-spin pi-spinner" : "pi pi-database"}
                        onClick={handleSeed}
                        disabled={isSeeding}
                        className="bg-[#4F8EF7] border-none text-white hover:bg-[#3D77E0] px-6 py-2 rounded-lg text-sm font-medium transition-colors mt-4"
                    />
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <Toast ref={toast} />
            <div className="analytics-page">
                <header className="analytics-page__header">
                    <h1 className="analytics-page__title">{t('analytics.title')}</h1>
                    <p className="analytics-page__subtitle">{t('analytics.subtitle')}</p>
                </header>

                <section className="analytics-page__section">
                    <h2 className="analytics-page__section-title">{t('analytics.primary')}</h2>
                    <div className="analytics-page__grid">
                        <WeeklyWorkTimeCard sessions={sessions} />
                        <DailyFlowWaves data={analytics.flowWaves} />
                        <FocusDensityCard data={analytics.focusDensity} />
                        <ResistancePointCard data={analytics.resistancePoint} />
                        <EarnedFreedomCard data={analytics.earnedFreedom} />
                        <FlowWindowCard data={analytics.flowWindow} />
                        <FlowStreakCard data={analytics.flowStreak} />
                    </div>
                </section>

                <section className="analytics-page__section">
                    <h2 className="analytics-page__section-title">{t('analytics.secondary')}</h2>
                    <div className="analytics-page__grid">
                        <TaskFlowHarmonyCard data={analytics.taskHarmony} />
                        <WarmupPhaseCard data={analytics.warmup} />
                    </div>
                </section>
            </div>
        </MainLayout>
    );
};

export default ReportPage;
