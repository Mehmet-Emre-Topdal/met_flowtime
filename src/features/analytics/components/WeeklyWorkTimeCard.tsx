import React from 'react';
import { useTranslation } from 'react-i18next';
import { WeeklyWorkTimeResult } from '@/types/analytics';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import AnalyticsCard from './AnalyticsCard';

interface Props {
    data: WeeklyWorkTimeResult;
    weekOffset: number;
    onPrev: () => void;
    onNext: () => void;
}

const WeeklyWorkTimeCard: React.FC<Props> = ({ data, weekOffset, onPrev, onNext }) => {
    const { t } = useTranslation();

    const chartData = data.days.map(d => ({
        day: t(`analytics.weeklyWorkTime.days.${d.dayLabel}`),
        minutes: d.totalMinutes,
    }));

    const maxMinutes = Math.max(...chartData.map(d => d.minutes), 1);

    const formatMinutes = (mins: number) => {
        if (mins >= 60) {
            const h = Math.floor(mins / 60);
            const m = mins % 60;
            return m > 0 ? `${h}${t('analytics.weeklyWorkTime.h')} ${m}${t('analytics.weeklyWorkTime.min')}` : `${h}${t('analytics.weeklyWorkTime.h')}`;
        }
        return `${mins}${t('analytics.weeklyWorkTime.min')}`;
    };

    const weekTotalFormatted = formatMinutes(data.weekTotalMinutes);

    return (
        <AnalyticsCard
            title={t('analytics.weeklyWorkTime.title')}
            tooltip={t('analytics.weeklyWorkTime.tooltip')}
            icon="pi-calendar"
            hasEnoughData={true}
        >
            <div className="analytics-weekly-work">
                {/* Week Navigation */}
                <div className="analytics-weekly-work__nav">
                    <button
                        className="analytics-weekly-work__nav-btn"
                        onClick={onPrev}
                        title={t('analytics.weeklyWorkTime.prevWeek')}
                    >
                        <i className="pi pi-chevron-left" />
                    </button>
                    <span className="analytics-weekly-work__nav-label">
                        {data.weekLabel}
                    </span>
                    <button
                        className="analytics-weekly-work__nav-btn"
                        onClick={onNext}
                        disabled={weekOffset >= 0}
                        title={t('analytics.weeklyWorkTime.nextWeek')}
                    >
                        <i className="pi pi-chevron-right" />
                    </button>
                </div>

                <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} barCategoryGap="20%">
                        <XAxis
                            dataKey="day"
                            tick={{ fill: 'var(--muted)', fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fill: 'var(--muted)', fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            width={35}
                            tickFormatter={(v: number) => v >= 60 ? `${Math.floor(v / 60)}h` : `${v}`}
                        />
                        <Tooltip
                            contentStyle={{
                                background: '#2E2E2E',
                                border: '1px solid #3D3D3D',
                                borderRadius: 8,
                                fontSize: 12,
                            }}
                            itemStyle={{ color: '#F0F0F0' }}
                            labelStyle={{ color: '#F0F0F0' }}
                            formatter={(value: number | undefined) => [formatMinutes(value ?? 0), t('analytics.weeklyWorkTime.workTime')]}
                            cursor={{ fill: 'var(--border)', opacity: 0.3 }}
                        />
                        <Bar dataKey="minutes" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.minutes > 0 ? 'var(--accent)' : 'var(--border)'}
                                    fillOpacity={entry.minutes > 0 ? 0.5 + (entry.minutes / maxMinutes) * 0.5 : 0.3}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>

                <div className="analytics-weekly-work__summary">
                    <span className="analytics-weekly-work__total-label">
                        {t('analytics.weeklyWorkTime.weekTotal')}
                    </span>
                    <span className="analytics-weekly-work__total-value">
                        {weekTotalFormatted}
                    </span>
                </div>
            </div>
        </AnalyticsCard>
    );
};

export default WeeklyWorkTimeCard;
