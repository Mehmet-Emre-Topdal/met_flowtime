import React from 'react';
import { useTranslation } from 'react-i18next';
import { FocusDensityResult } from '@/types/analytics';
import AnalyticsCard from './AnalyticsCard';

interface Props {
    data: FocusDensityResult;
}

const FocusDensityCard: React.FC<Props> = ({ data }) => {
    const { t } = useTranslation();

    const labelColors: Record<string, string> = {
        sharp: '#22c55e',
        good: '#6366f1',
        scattered_start: '#f59e0b',
        scattered_mind: '#ef4444',
    };

    const circumference = 2 * Math.PI * 50;
    const offset = circumference - (data.percentage / 100) * circumference;

    return (
        <AnalyticsCard
            title={t('analytics.focusDensity.title')}
            icon="pi-clock"
            hasEnoughData={data.hasEnoughData}
        >
            <div className="analytics-density">
                <div className="analytics-density__ring">
                    <svg viewBox="0 0 120 120" width="120" height="120">
                        <circle cx="60" cy="60" r="50" fill="none" stroke="#27272a" strokeWidth="8" />
                        <circle
                            cx="60" cy="60" r="50" fill="none"
                            stroke={labelColors[data.label]}
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            transform="rotate(-90 60 60)"
                            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                        />
                    </svg>
                    <span className="analytics-density__percent">{data.percentage}%</span>
                </div>
                <span
                    className="analytics-density__label"
                    style={{ color: labelColors[data.label] }}
                >
                    {t(`analytics.focusDensity.${data.label}`)}
                </span>
            </div>
        </AnalyticsCard>
    );
};

export default FocusDensityCard;
