import React from 'react';
import { useTranslation } from 'react-i18next';
import { WarmupPhaseResult } from '@/types/analytics';
import AnalyticsCard from './AnalyticsCard';

interface Props {
    data: WarmupPhaseResult;
}

const WarmupPhaseCard: React.FC<Props> = ({ data }) => {
    const { t } = useTranslation();

    return (
        <AnalyticsCard
            title={t('analytics.warmup.title')}
            tooltip={t('analytics.warmup.tooltip')}
            icon="pi-hourglass"
            hasEnoughData={data.hasEnoughData}
        >
            <div className="analytics-warmup">
                <div className="analytics-warmup__main">
                    <span className="analytics-warmup__number">{data.avgWarmupMinutes}</span>
                    <span className="analytics-warmup__unit">min</span>
                </div>
                <p className="analytics-warmup__text">
                    {t('analytics.warmup.avgText', { minutes: data.avgWarmupMinutes })}
                </p>
                {data.changeMinutes !== null && (
                    <p className={`analytics-warmup__change ${data.changeMinutes < 0 ? 'analytics-warmup__change--good' : 'analytics-warmup__change--bad'}`}>
                        <i className={`pi ${data.changeMinutes < 0 ? 'pi-arrow-down' : 'pi-arrow-up'}`} />
                        {data.changeMinutes < 0
                            ? t('analytics.warmup.improved', { minutes: Math.abs(data.changeMinutes) })
                            : t('analytics.warmup.worsened', { minutes: data.changeMinutes })
                        }
                    </p>
                )}
            </div>
        </AnalyticsCard>
    );
};

export default WarmupPhaseCard;
