import React, { useState, useRef } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useAppSelector } from '@/hooks/storeHooks';
import { useGetAnalyticsQuery } from '@/features/analytics/api/analyticsApi';
import { useSeedSessionsMutation } from '@/features/analytics/api/sessionsApi';
import { useTranslation } from 'react-i18next';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { generateMockSessions } from '@/features/analytics/utils/mockDataGenerator';

import DailyFlowWaves from '@/features/analytics/components/DailyFlowWaves';
import WeeklyWorkTimeCard from '@/features/analytics/components/WeeklyWorkTimeCard';
import ResistancePointCard from '@/features/analytics/components/ResistancePointCard';
import FlowWindowCard from '@/features/analytics/components/FlowWindowCard';
import FlowStreakCard from '@/features/analytics/components/FlowStreakCard';
import WarmupPhaseCard from '@/features/analytics/components/WarmupPhaseCard';
import FocusDensityCard from '@/features/analytics/components/FocusDensityCard';
import TaskFlowHarmonyCard from '@/features/analytics/components/TaskFlowHarmonyCard';
import AssistantChat from '@/features/assistant/components/AssistantChat';

const ReportPage = () => {
    const { t } = useTranslation();
    const toast = useRef<Toast>(null);
    const { user } = useAppSelector(state => state.auth);

    const [weekOffset, setWeekOffset] = useState(0);

    const { data: analytics, isLoading, isFetching } = useGetAnalyticsQuery(
        { weekOffset },
        { skip: !user?.uid },
    );

    const [seedSessions, { isLoading: isSeeding }] = useSeedSessionsMutation();

    const handleSeed = async () => {
        if (!user?.uid) {
            toast.current?.show({ severity: 'error', summary: 'Error', detail: 'User not logged in' });
            return;
        }
        const mockData = generateMockSessions(user.uid);
        try {
            const result = await seedSessions(mockData).unwrap();
            toast.current?.show({
                severity: 'success',
                summary: 'Success',
                detail: `${result.count} test seansı başarıyla eklendi!`,
            });
        } catch (err: any) {
            toast.current?.show({
                severity: 'error',
                summary: 'Hata',
                detail: `Firestore hatası: ${err.message || 'Yetki sorunu olabilir.'}`,
            });
        }
    };

    if (isLoading) {
        return (
            <MainLayout>
                <div className="analytics-loading">
                    <ProgressSpinner style={{ width: '40px', height: '40px' }} strokeWidth="4" />
                    <span>{t('analytics.loadingSessions')}</span>
                </div>
                <AssistantChat />
            </MainLayout>
        );
    }

    if (!analytics || analytics.summary.totalSessions === 0) {
        return (
            <MainLayout>
                <Toast ref={toast} />
                <div className="analytics-empty">
                    <i className="pi pi-chart-bar analytics-empty__icon" />
                    <h2>{t('analytics.title')}</h2>
                    <p>{t('analytics.noSessions')}</p>
                    <Button
                        label={isSeeding ? 'Ekleniyor...' : 'Test Verisi Oluştur (30 Günlük)'}
                        icon={isSeeding ? 'pi pi-spin pi-spinner' : 'pi pi-database'}
                        onClick={handleSeed}
                        disabled={isSeeding}
                        className="bg-[#4F8EF7] border-none text-white hover:bg-[#3D77E0] px-6 py-2 rounded-lg text-sm font-medium transition-colors mt-4"
                    />
                </div>
                <AssistantChat />
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <Toast ref={toast} />
            <div className="analytics-page">
                <header className="analytics-page__header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <h1 className="analytics-page__title">{t('analytics.title')}</h1>
                        {isFetching && (
                            <ProgressSpinner style={{ width: '18px', height: '18px' }} strokeWidth="4" />
                        )}
                    </div>
                    <p className="analytics-page__subtitle">{t('analytics.subtitle')}</p>
                </header>

                <section className="analytics-page__section">
                    <h2 className="analytics-page__section-title">{t('analytics.primary')}</h2>
                    <div className="analytics-page__grid">
                        <WeeklyWorkTimeCard
                            data={analytics.weeklyWorkTime}
                            weekOffset={weekOffset}
                            onPrev={() => setWeekOffset(w => w - 1)}
                            onNext={() => setWeekOffset(w => Math.min(w + 1, 0))}
                        />
                        <DailyFlowWaves data={analytics.dailyFlowWaves} />
                        <FocusDensityCard data={analytics.focusDensity} />
                        <FlowStreakCard data={analytics.flowStreak} />
                    </div>
                </section>

                <section className="analytics-page__section">
                    <h2 className="analytics-page__section-title">{t('analytics.secondary')}</h2>
                    <div className="analytics-page__grid">
                        <ResistancePointCard data={analytics.resistancePoint} />
                        <FlowWindowCard data={analytics.naturalFlowWindow} />
                        <TaskFlowHarmonyCard data={analytics.taskFlowHarmony} />
                        <WarmupPhaseCard data={analytics.warmupPhase} />
                    </div>
                </section>
            </div>
            <AssistantChat />
        </MainLayout>
    );
};

export default ReportPage;
