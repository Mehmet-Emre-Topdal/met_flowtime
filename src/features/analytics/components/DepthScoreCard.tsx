import React from 'react';
import { useTranslation } from 'react-i18next';
import { DepthScoreResult } from '@/types/analytics';
import AnalyticsCard from './AnalyticsCard';

interface Props {
    data: DepthScoreResult;
}

const DepthScoreCard: React.FC<Props> = ({ data }) => {
    const { t } = useTranslation();

    const getComparisonText = () => {
        if (data.lastWeekAvg === 0) return t('analytics.depthScore.noComparison');
        const percent = Math.abs(data.percentChange);
        return data.percentChange >= 0
            ? t('analytics.depthScore.aboveAvg', { percent })
            : t('analytics.depthScore.belowAvg', { percent });
    };

    return (
        <AnalyticsCard
            title={t('analytics.depthScore.title')}
            tooltip={t('analytics.depthScore.tooltip')}
            icon="pi-bolt"
            hasEnoughData={data.hasEnoughData}
        >
            <div className="analytics-depth">
                <div className="analytics-depth__score">
                    <span className="analytics-depth__number">{data.todayScore}</span>
                    <span className="analytics-depth__unit">{t('analytics.depthScore.min')}</span>
                </div>
                <span className="analytics-depth__label">{t('analytics.depthScore.deepWork')}</span>
                <div className={`analytics-depth__comparison ${data.percentChange >= 0 ? 'analytics-depth__comparison--up' : 'analytics-depth__comparison--down'}`}>
                    <i className={`pi ${data.percentChange >= 0 ? 'pi-arrow-up' : 'pi-arrow-down'}`} />
                    <span>{getComparisonText()}</span>
                </div>
            </div>
        </AnalyticsCard>
    );
};

export default DepthScoreCard;
