import React from 'react';
import { useTranslation } from 'react-i18next';
import { FlowStreakResult } from '@/types/analytics';
import AnalyticsCard from './AnalyticsCard';

interface Props {
    data: FlowStreakResult;
}

const FlowStreakCard: React.FC<Props> = ({ data }) => {
    const { t } = useTranslation();

    return (
        <AnalyticsCard
            title={t('analytics.flowStreak.title')}
            tooltip={t('analytics.flowStreak.tooltip')}
            icon="pi-sparkles"
            hasEnoughData={data.hasEnoughData}
        >
            <div className="analytics-streak">
                <div className="analytics-streak__stats">
                    <div className="analytics-streak__stat">
                        <span className="analytics-streak__number">{data.currentStreak}</span>
                        <span className="analytics-streak__label">{t('analytics.flowStreak.current')}</span>
                    </div>
                    <div className="analytics-streak__divider" />
                    <div className="analytics-streak__stat">
                        <span className="analytics-streak__number analytics-streak__number--record">{data.recordStreak}</span>
                        <span className="analytics-streak__label">{t('analytics.flowStreak.record')}</span>
                    </div>
                </div>

                <div className="analytics-streak__calendar">
                    {data.last30Days.map((day, i) => (
                        <div
                            key={day.date}
                            className={`analytics-streak__dot ${day.filled ? 'analytics-streak__dot--filled' : ''}`}
                            title={day.date}
                        />
                    ))}
                </div>
                <span className="analytics-streak__days-label">
                    {t('analytics.flowStreak.days')}
                </span>
            </div>
        </AnalyticsCard>
    );
};

export default FlowStreakCard;
