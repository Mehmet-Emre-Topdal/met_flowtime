import React, { useMemo } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useAppSelector } from '@/hooks/storeHooks';
import { useGetSessionsQuery } from '@/features/analytics/api/sessionsApi';
import { useGetTasksQuery } from '@/features/kanban/api/tasksApi';
import { useTranslation } from 'react-i18next';
import { ProgressSpinner } from 'primereact/progressspinner';

import {
    calcDailyFlowWaves,
    calcDepthScore,
    calcFocusDensity,
    calcResistancePoint,
    calcEarnedFreedom,
    calcNaturalFlowWindow,
    calcFlowStreak,
    calcTaskFlowHarmony,
    calcWarmupPhase,
} from '@/features/analytics/utils/analyticsCalculations';

import DailyFlowWaves from '@/features/analytics/components/DailyFlowWaves';
import DepthScoreCard from '@/features/analytics/components/DepthScoreCard';
import FocusDensityCard from '@/features/analytics/components/FocusDensityCard';
import ResistancePointCard from '@/features/analytics/components/ResistancePointCard';
import EarnedFreedomCard from '@/features/analytics/components/EarnedFreedomCard';
import FlowWindowCard from '@/features/analytics/components/FlowWindowCard';
import FlowStreakCard from '@/features/analytics/components/FlowStreakCard';
import TaskFlowHarmonyCard from '@/features/analytics/components/TaskFlowHarmonyCard';
import WarmupPhaseCard from '@/features/analytics/components/WarmupPhaseCard';

const ReportPage = () => {
    const { t } = useTranslation();
    const { user } = useAppSelector(state => state.auth);
    const { data: sessions = [], isLoading: sessionsLoading } = useGetSessionsQuery(user?.uid || '', { skip: !user?.uid });
    const { data: tasks = [] } = useGetTasksQuery(user?.uid || '', { skip: !user?.uid });

    const analytics = useMemo(() => {
        if (sessions.length === 0) return null;
        return {
            flowWaves: calcDailyFlowWaves(sessions),
            depthScore: calcDepthScore(sessions),
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
                <div className="analytics-empty">
                    <i className="pi pi-chart-bar analytics-empty__icon" />
                    <h2>{t('analytics.title')}</h2>
                    <p>{t('analytics.noSessions')}</p>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="analytics-page">
                <header className="analytics-page__header">
                    <h1 className="analytics-page__title">{t('analytics.title')}</h1>
                    <p className="analytics-page__subtitle">{t('analytics.subtitle')}</p>
                </header>

                <section className="analytics-page__section">
                    <h2 className="analytics-page__section-title">{t('analytics.primary')}</h2>
                    <div className="analytics-page__grid">
                        <DailyFlowWaves data={analytics.flowWaves} />
                        <DepthScoreCard data={analytics.depthScore} />
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
