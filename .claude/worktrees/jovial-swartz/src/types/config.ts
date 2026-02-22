export interface FlowtimeInterval {
    min: number;
    max: number;
    break: number;
}

export interface UserConfig {
    intervals: FlowtimeInterval[];
}

export const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2218/2218-preview.mp3';

export const DEFAULT_CONFIG: UserConfig = {
    intervals: [
        { min: 0, max: 25, break: 5 },
        { min: 25, max: 50, break: 10 },
        { min: 50, max: 90, break: 15 },
        { min: 90, max: 999, break: 20 }
    ]
};
