import React from 'react';
import { useTranslation } from 'react-i18next';
import { TaskFlowHarmonyResult } from '@/types/analytics';
import AnalyticsCard from './AnalyticsCard';

interface Props {
    data: TaskFlowHarmonyResult;
}

const TaskFlowHarmonyCard: React.FC<Props> = ({ data }) => {
    const { t } = useTranslation();

    const maxDepth = Math.max(...data.items.map(i => i.actualDepthMinutes), 1);

    return (
        <AnalyticsCard
            title={t('analytics.taskHarmony.title')}
            icon="pi-objects-column"
            hasEnoughData={data.hasEnoughData}
        >
            <div className="analytics-harmony">
                {data.items.map((item, i) => (
                    <div key={i} className="analytics-harmony__item">
                        <div className="analytics-harmony__info">
                            <span className="analytics-harmony__task">{item.taskTitle}</span>
                            <span className="analytics-harmony__meta">
                                {item.sessionCount} {t('analytics.taskHarmony.sessions')} · {item.actualDepthMinutes} {t('analytics.taskHarmony.depthMin')}
                            </span>
                        </div>
                        <div className="analytics-harmony__bar-wrap">
                            <div
                                className="analytics-harmony__bar"
                                style={{ width: `${(item.actualDepthMinutes / maxDepth) * 100}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </AnalyticsCard>
    );
};

export default TaskFlowHarmonyCard;
