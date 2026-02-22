import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlowSession } from '@/types/session';
import { calcWeeklyWorkTime } from '@/features/analytics/utils/analyticsCalculations';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import AnalyticsCard from './AnalyticsCard';

interface Props {
    sessions: FlowSession[];
}

const WeeklyWorkTimeCard: React.FC<Props> = ({ sessions }) => {
    const { t } = useTranslation();
    const [weekOffset, setWeekOffset] = useState(0);

    const data = useMemo(() => calcWeeklyWorkTime(sessions, weekOffset), [sessions, weekOffset]);

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
                        onClick={() => setWeekOffset(prev => prev - 1)}
                        title={t('analytics.weeklyWorkTime.prevWeek')}
                    >
                        <i className="pi pi-chevron-left" />
                    </button>
                    <span className="analytics-weekly-work__nav-label">
                        {data.weekLabel}
                    </span>
                    <button
                        className="analytics-weekly-work__nav-btn"
                        onClick={() => setWeekOffset(prev => prev + 1)}
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
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                borderRadius: 8,
                                color: 'var(--foreground)',
                                fontSize: 12,
                            }}
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
