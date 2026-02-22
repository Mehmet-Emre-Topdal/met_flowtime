import React from 'react';
import { useTranslation } from 'react-i18next';
import { ResistancePointResult } from '@/types/analytics';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import AnalyticsCard from './AnalyticsCard';

interface Props {
    data: ResistancePointResult;
}

const ResistancePointCard: React.FC<Props> = ({ data }) => {
    const { t } = useTranslation();

    const chartData = data.last7DaysSessions.map((s, i) => ({
        name: s.date.slice(5),
        duration: s.durationMinutes,
    }));

    return (
        <AnalyticsCard
            title={t('analytics.resistancePoint.title')}
            tooltip={t('analytics.resistancePoint.tooltip')}
            icon="pi-flag"
            hasEnoughData={data.hasEnoughData}
        >
            <div className="analytics-resistance">
                <p className="analytics-resistance__text">
                    {t('analytics.resistancePoint.usuallyAt', { minute: data.resistanceMinute })}
                </p>

                {chartData.length > 0 && (
                    <ResponsiveContainer width="100%" height={140}>
                        <BarChart data={chartData}>
                            <XAxis
                                dataKey="name"
                                tick={{ fill: '#757575', fontSize: 10 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis hide />
                            <Tooltip
                                contentStyle={{
                                    background: '#2E2E2E',
                                    border: '1px solid #3D3D3D',
                                    borderRadius: 8,
                                    color: '#F0F0F0',
                                    fontSize: 12,
                                }}
                                formatter={(value: number | undefined) => [`${value ?? 0} ${t('analytics.resistancePoint.min')}`, '']}
                            />
                            <ReferenceLine y={data.resistanceMinute} stroke="#E05555" strokeDasharray="4 4" strokeOpacity={0.6} />
                            <Bar dataKey="duration" fill="#4F8EF7" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </AnalyticsCard>
    );
};

export default ResistancePointCard;
