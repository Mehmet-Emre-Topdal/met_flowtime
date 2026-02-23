// --- 1. Daily Flow Waves ---
export type FlowZoneLabel = 'peak' | 'normal' | 'trough';

export interface HourlySlot {
    hour: number;           // 0-23
    totalMinutes: number;   // o saatte toplam odak süresi
    label: FlowZoneLabel;
}

export interface DailyFlowWavesResult {
    slots: HourlySlot[];
    peakHour: number | null;
    troughHour: number | null;
    hasEnoughData: boolean;
}

// --- 2. Weekly Work Time ---
export interface WeeklyWorkDay {
    dayLabel: string;       // Pzt, Sal, ... or Mon, Tue, ...
    date: string;           // YYYY-MM-DD
    totalMinutes: number;
}

export interface WeeklyWorkTimeResult {
    days: WeeklyWorkDay[];
    weekTotalMinutes: number;
    hasEnoughData: boolean;
    weekLabel: string;      // e.g. "10 Feb – 16 Feb"
}

// --- 3. Focus Density ---
export type FocusDensityLabel = 'sharp' | 'good' | 'scattered_start' | 'scattered_mind';

export interface FocusDensityResult {
    percentage: number;
    label: FocusDensityLabel;
    hasEnoughData: boolean;
}

// --- 4. Resistance Point ---
export interface ResistancePointResult {
    resistanceMinute: number;   // mod/medyan dakika
    last7DaysSessions: { date: string; durationMinutes: number }[];
    hasEnoughData: boolean;
}

// --- 6. Natural Flow Window ---
export interface FlowWindowBucket {
    rangeStart: number;  // dakika
    rangeEnd: number;
    count: number;
    isDominant: boolean;
}

export interface NaturalFlowWindowResult {
    buckets: FlowWindowBucket[];
    dominantWindowStart: number;
    dominantWindowEnd: number;
    median: number;
    hasEnoughData: boolean;
}

// --- 7. Flow Streak ---
export interface FlowStreakDay {
    date: string;
    filled: boolean;
}

export interface FlowStreakResult {
    currentStreak: number;
    recordStreak: number;
    last30Days: FlowStreakDay[];
    hasEnoughData: boolean;
}

// --- 8. Task-Flow Harmony ---
export interface TaskFlowItem {
    taskTitle: string;
    estimatedMinutes: number | null;
    totalFocusMinutes: number;
    sessionCount: number;
}

export interface TaskFlowHarmonyResult {
    items: TaskFlowItem[];
    hasEnoughData: boolean;
}

// --- 9. Warm-up Phase ---
export interface WarmupPhaseResult {
    avgWarmupMinutes: number;
    prevMonthWarmup: number | null;
    changeMinutes: number | null;
    hasEnoughData: boolean;
}

// --- Combined API response ---
export interface AnalyticsResult {
    dailyFlowWaves: DailyFlowWavesResult;
    weeklyWorkTime: WeeklyWorkTimeResult;
    focusDensity: FocusDensityResult;
    resistancePoint: ResistancePointResult;
    naturalFlowWindow: NaturalFlowWindowResult;
    flowStreak: FlowStreakResult;
    taskFlowHarmony: TaskFlowHarmonyResult;
    warmupPhase: WarmupPhaseResult;
    summary: {
        totalSessions: number;
        allTimeMinutes: number;
    };
}
