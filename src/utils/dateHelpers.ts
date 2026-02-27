export function getDateString(d: Date | string): string {
    if (typeof d === 'string') return d.slice(0, 10);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function todayStr(): string {
    return getDateString(new Date());
}

// Returns i18n day key matching analytics.weeklyWorkTime.days.* (sun, mon, tue, ...)
export function getDayOfWeek(d: Date): string {
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    return days[d.getDay()];
}
