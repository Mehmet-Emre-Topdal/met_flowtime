import { FlowtimeInterval } from "@/types/config";

export const calculateBreakDuration = (workSeconds: number, intervals: FlowtimeInterval[]): number => {
    const workMinutes = workSeconds / 60;

    const matchedInterval = intervals.find(
        (interval) => workMinutes >= interval.min && workMinutes < interval.max
    );

    if (matchedInterval) {
        return matchedInterval.break * 60;
    }

    // Fallback to the last interval's break if no match found (exceeds all max values)
    const lastInterval = intervals[intervals.length - 1];
    return lastInterval ? lastInterval.break * 60 : 5 * 60;
};

export const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [
        hours > 0 ? String(hours).padStart(2, '0') : null,
        String(minutes).padStart(2, '0'),
        String(seconds).padStart(2, '0')
    ].filter(Boolean);

    return parts.join(':');
};
