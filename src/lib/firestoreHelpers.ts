interface TimestampLike {
    toDate(): Date;
}

export function parseFirestoreTimestamp(val: TimestampLike | string): Date {
    if (typeof val === 'string') return new Date(val);
    return val.toDate();
}
