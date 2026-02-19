import React from 'react';
import { useTranslation } from 'react-i18next';

interface AnalyticsCardProps {
    title: string;
    icon: string;
    hasEnoughData: boolean;
    children: React.ReactNode;
}

const AnalyticsCard: React.FC<AnalyticsCardProps> = ({ title, icon, hasEnoughData, children }) => {
    const { t } = useTranslation();

    return (
        <div className="analytics-card">
            <div className="analytics-card__header">
                <i className={`pi ${icon} analytics-card__icon`} />
                <h3 className="analytics-card__title">{title}</h3>
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
