export function median(nums: number[]): number {
    if (nums.length === 0) return 0;
    const sorted = [...nums].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function mode(nums: number[]): number {
    if (nums.length === 0) return 0;
    const freq: Record<number, number> = {};
    nums.forEach(n => { freq[n] = (freq[n] || 0) + 1; });
    let maxFreq = 0, modeVal = nums[0];
    for (const [val, count] of Object.entries(freq)) {
        if (count > maxFreq) { maxFreq = count; modeVal = Number(val); }
    }
    return modeVal;
}
