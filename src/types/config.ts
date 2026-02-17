export interface FlowtimeInterval {
    min: number;
    max: number;
    break: number;
}

export interface UserConfig {
    intervals: FlowtimeInterval[];
    soundId: string;
}

export const DEFAULT_CONFIG: UserConfig = {
    intervals: [
        { min: 0, max: 25, break: 5 },
        { min: 25, max: 50, break: 10 },
        { min: 50, max: 90, break: 15 },
        { min: 90, max: 999, break: 20 }
    ],
    soundId: 'bell'
};
