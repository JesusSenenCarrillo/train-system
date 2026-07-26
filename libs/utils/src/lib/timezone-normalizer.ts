/**
 * Converts a local Madrid date-time string (e.g. `2024-01-01T08:30:00`) into a UTC ISO string.
 *
 * The input is interpreted as Europe/Madrid local time, then converted to UTC using the
 * offset at that instant. A second iteration is used because the offset itself depends on
 * whether DST is active at the resolved UTC instant.
 *
 * @param value - A local date-time string in `YYYY-MM-DDTHH:MM[:SS]` format.
 * @returns The UTC ISO 8601 representation, or `null` if the input cannot be parsed.
 */
export const toMadridLocalIso = (value: string): string | null => {
    const parsedLocal = parseLocalDateTime(value);
    if (!parsedLocal) {
        return toIso(value);
    }

    const initialGuess = Date.UTC(
        parsedLocal.year,
        parsedLocal.month - 1,
        parsedLocal.day,
        parsedLocal.hour,
        parsedLocal.minute,
        parsedLocal.second,
    );

    let utcMillis = initialGuess - getTimezoneOffsetMillis(initialGuess, 'Europe/Madrid');
    utcMillis = initialGuess - getTimezoneOffsetMillis(utcMillis, 'Europe/Madrid');
    return new Date(utcMillis).toISOString();
}

/**
 * Normalizes an arbitrary date value into a UTC ISO string.
 *
 * Supports Unix timestamps (seconds since epoch) and standard date-time strings.
 *
 * @param value - A date string or Unix timestamp as a string. Optional.
 * @returns The UTC ISO 8601 representation, or `null` if the value is missing or invalid.
 */
export const toIso = (value?: string): string | null => {
    if (!value) {
        return null;
    }
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
        return new Date(parsed * 1000).toISOString();
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Parses a local date-time string into its numeric components.
 *
 * @param value - The date-time string to parse.
 * @returns An object with year, month, day, hour, minute and second, or `null` if the format does not match.
 */
const parseLocalDateTime = (value: string): {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number
} | null => {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) {
        return null;
    }

    return {
        year: Number(match[1]),
        month: Number(match[2]),
        day: Number(match[3]),
        hour: Number(match[4]),
        minute: Number(match[5]),
        second: Number(match[6] ?? '0'),
    };
}

/**
 * Computes the offset in milliseconds between UTC and the given IANA time zone at a specific instant.
 *
 * @param epochMillis - The UTC instant to evaluate, in milliseconds since epoch.
 * @param timeZone - The IANA time zone identifier (e.g. `Europe/Madrid`).
 * @returns The offset in milliseconds that must be subtracted from UTC to obtain local time.
 */
const getTimezoneOffsetMillis = (epochMillis: number, timeZone: string): number => {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).formatToParts(new Date(epochMillis));

    const year = Number(parts.find((part) => part.type === 'year')?.value ?? '1970');
    const month = Number(parts.find((part) => part.type === 'month')?.value ?? '01');
    const day = Number(parts.find((part) => part.type === 'day')?.value ?? '01');
    const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '00');
    const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '00');
    const second = Number(parts.find((part) => part.type === 'second')?.value ?? '00');

    return Date.UTC(year, month - 1, day, hour, minute, second) - epochMillis;
}
