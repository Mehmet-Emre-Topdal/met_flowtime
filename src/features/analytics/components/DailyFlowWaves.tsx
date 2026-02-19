import React from 'react';
import { useTranslation } from 'react-i18next';
import { DailyFlowWavesResult } from '@/types/analytics';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import AnalyticsCard from './AnalyticsCard';

interface Props {
    data: DailyFlowWavesResult;
}

const DailyFlowWaves: React.FC<Props> = ({ data }) => {
    const { t } = useTranslation();

    const chartData = data.slots.map(s => ({
        hour: `${String(s.hour).padStart(2, '0')}:00`,
        minutes: s.totalMinutes,
        label: s.label,
    }));

    return (
        <AnalyticsCard
            title={t('analytics.flowWaves.title')}
            icon="pi-chart-line"
            hasEnoughData={data.hasEnoughData}
        >
            <div className="analytics-flow-waves">
                <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="flowGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="hour"
                            tick={{ fill: '#71717a', fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            interval={3}
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
                            formatter={(value: number | undefined) => [`${value ?? 0} ${t('analytics.flowWaves.minutes')}`, '']}
                        />
                        <Area
                            type="monotone"
                            dataKey="minutes"
                            stroke="#6366f1"
                            strokeWidth={2}
                            fill="url(#flowGradient)"
                        />
                    </AreaChart>
                </ResponsiveContainer>

                <div className="analytics-flow-waves__labels">
                    {data.peakHour !== null && (
                        <div className="analytics-flow-waves__badge analytics-flow-waves__badge--peak">
                            <i className="pi pi-arrow-up" />
                            <span>{t('analytics.flowWaves.peakHour')}: {String(data.peakHour).padStart(2, '0')}:00</span>
                        </div>
                    )}
                    {data.troughHour !== null && (
                        <div className="analytics-flow-waves__badge analytics-flow-waves__badge--trough">
                            <i className="pi pi-arrow-down" />
                            <span>{t('analytics.flowWaves.troughHour')}: {String(data.troughHour).padStart(2, '0')}:00</span>
                        </div>
                    )}
                </div>
            </div>
        </AnalyticsCard>
    );
};

export default DailyFlowWaves;
