import React, { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from 'primereact/tooltip';

interface AnalyticsCardProps {
    title: string;
    icon: string;
    tooltip?: string;
    hasEnoughData: boolean;
    children: React.ReactNode;
}

const AnalyticsCard: React.FC<AnalyticsCardProps> = ({ title, icon, tooltip, hasEnoughData, children }) => {
    const { t } = useTranslation();
    const tooltipId = useId().replace(/:/g, '');

    return (
        <div className="analytics-card">
            <div className="analytics-card__header">
                <i className={`pi ${icon} analytics-card__icon`} />
                <h3 className="analytics-card__title">{title}</h3>
                {tooltip && (
                    <>
                        <i
                            className={`pi pi-question-circle analytics-card__help tooltip-${tooltipId}`}
                            data-pr-tooltip={tooltip}
                            data-pr-position="top"
                        />
                        <Tooltip
                            target={`.tooltip-${tooltipId}`}
                            style={{ maxWidth: '280px', fontSize: '0.72rem' }}
                        />
                    </>
                )}
            </div>
            <div className="analytics-card__body">
                {hasEnoughData ? children : (
                    <div className="analytics-card__empty">
                        <i className="pi pi-info-circle" />
                        <span>{t('analytics.notEnoughData')}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnalyticsCard;
