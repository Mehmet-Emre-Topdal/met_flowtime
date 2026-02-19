import React from 'react';
import { useTranslation } from 'react-i18next';
import { NaturalFlowWindowResult } from '@/types/analytics';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import AnalyticsCard from './AnalyticsCard';

interface Props {
    data: NaturalFlowWindowResult;
}

const FlowWindowCard: React.FC<Props> = ({ data }) => {
    const { t } = useTranslation();

    const chartData = data.buckets.map(b => ({
        range: `${b.rangeStart}-${b.rangeEnd}`,
        count: b.count,
        isDominant: b.isDominant,
    }));

    return (
        <AnalyticsCard
            title={t('analytics.flowWindow.title')}
            tooltip={t('analytics.flowWindow.tooltip')}
            icon="pi-sliders-v"
            hasEnoughData={data.hasEnoughData}
        >
            <div className="analytics-window">
                <p className="analytics-window__text">
                    {t('analytics.flowWindow.windowText', {
                        start: data.dominantWindowStart,
                        end: data.dominantWindowEnd,
                    })}
                </p>
                <p className="analytics-window__median">
                    {t('analytics.flowWindow.medianText', { median: data.median })}
                </p>

                <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={chartData}>
                        <XAxis
                            dataKey="range"
                            tick={{ fill: '#71717a', fontSize: 9 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis hide />
                        <Tooltip
                            contentStyle={{
                                background: '#18181b',
                                border: '1px solid #27272a',
                                borderRadius: 8,
                                color: '#fafafa',
                                fontSize: 12,
                            }}
                            formatter={(value: number | undefined) => [`${value ?? 0} ${t('analytics.flowWindow.sessions')}`, '']}
                        />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={index}
                                    fill={entry.isDominant ? '#6366f1' : '#3f3f46'}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </AnalyticsCard>
    );
};

export default FlowWindowCard;
