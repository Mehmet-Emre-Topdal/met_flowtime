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

// --- 2. Depth Score ---
export interface DepthScoreResult {
    todayScore: number;         // dakika cinsinden ağırlıklı toplam
    lastWeekAvg: number;        // geçen haftanın aynı gün ortalaması
    percentChange: number;      // yüzde fark
    hasEnoughData: boolean;
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

// --- 5. Earned Freedom ---
export interface EarnedFreedomResult {
    earnedMinutes: number;      // bugün kazanılan mola
    usedMinutes: number;        // bugün kullanılan mola
    balanceMinutes: number;     // kalan bakiye
    weekEarned: number;
    weekUsed: number;
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
    actualDepthMinutes: number;
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
