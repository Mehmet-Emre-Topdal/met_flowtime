import React from 'react';
import { useTranslation } from 'react-i18next';
import { EarnedFreedomResult } from '@/types/analytics';
import AnalyticsCard from './AnalyticsCard';

interface Props {
    data: EarnedFreedomResult;
}

const EarnedFreedomCard: React.FC<Props> = ({ data }) => {
    const { t } = useTranslation();

    const balancePercent = data.earnedMinutes > 0
        ? Math.min(100, Math.round((data.usedMinutes / data.earnedMinutes) * 100))
        : 0;

    return (
        <AnalyticsCard
            title={t('analytics.earnedFreedom.title')}
            icon="pi-sun"
            hasEnoughData={data.hasEnoughData}
        >
            <div className="analytics-freedom">
                <div className="analytics-freedom__balance">
                    <span className="analytics-freedom__number">{data.balanceMinutes}</span>
                    <span className="analytics-freedom__text">
                        {t('analytics.earnedFreedom.balance', { minutes: data.balanceMinutes })}
                    </span>
                </div>

                <div className="analytics-freedom__bar-container">
                    <div className="analytics-freedom__bar">
                        <div
                            className="analytics-freedom__bar-fill"
                            style={{ width: `${balancePercent}%` }}
                        />
                    </div>
                    <div className="analytics-freedom__bar-labels">
                        <span>{data.usedMinutes}m used</span>
                        <span>{data.earnedMinutes}m earned</span>
                    </div>
                </div>

                <p className="analytics-freedom__week">
                    {t('analytics.earnedFreedom.weekSummary', {
                        earned: data.weekEarned,
                        used: data.weekUsed,
                    })}
                </p>
            </div>
        </AnalyticsCard>
    );
};

export default EarnedFreedomCard;
