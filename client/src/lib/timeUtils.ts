import { parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

// Israel time zone
export const ISRAEL_TIMEZONE = "Asia/Jerusalem";

/**
 * Convert a date to Israel time zone
 */
export function toIsraelTime(date: Date): Date {
  // Create a new date using the formatted timezone string
  const dateStr = formatInTimeZone(
    date,
    ISRAEL_TIMEZONE,
    "yyyy-MM-dd'T'HH:mm:ss.SSS"
  );
  return new Date(dateStr);
}

/**
 * Convert Israel time to UTC
 */
export function fromIsraelTime(date: Date): Date {
  // Get the time zone offset between Israel and UTC
  const israelDate = new Date(date);
  const israelOffset = new Date().getTimezoneOffset();

  // Create a UTC date by adjusting for the time zone difference
  const utcDate = new Date(israelDate.getTime() - israelOffset * 60000);
  return utcDate;
}

/**
 * Format a date in Israel time zone
 */
export function formatInIsraelTime(date: Date, formatStr: string): string {
  return formatInTimeZone(date, ISRAEL_TIMEZONE, formatStr);
}

/**
 * Get current time in Israel
 */
export function getNowInIsrael(): Date {
  return toIsraelTime(new Date());
}

/**
 * Format a single time in Israel time zone
 */
export function formatTimeInIsrael(date: Date): string {
  return formatInTimeZone(date, ISRAEL_TIMEZONE, "h:mm aa");
}

/**
 * Format time range in Israel time zone
 */
export function formatTimeRangeInIsrael(start: Date, end: Date): string {
  return `${formatTimeInIsrael(start)} - ${formatTimeInIsrael(end)}`;
}

/**
 * Format date in Israel time zone
 */
export function formatDateInIsrael(date: Date): string {
  return formatInTimeZone(date, ISRAEL_TIMEZONE, "EEEE, MMMM d, yyyy");
}

/**
 * Check if a date is today in Israel time
 */
export function isToday(date: Date): boolean {
  const now = getNowInIsrael();
  const israelDate = toIsraelTime(date);

  return (
    israelDate.getFullYear() === now.getFullYear() &&
    israelDate.getMonth() === now.getMonth() &&
    israelDate.getDate() === now.getDate()
  );
}

/**
 * Get the day of week index (0-6) for a date in Israel time zone
 */
export function getDayOfWeekInIsrael(date: Date): number {
  const israelDate = toIsraelTime(date);
  return israelDate.getDay();
}

/**
 * Create a Date object at a specific time in Israel time zone
 */
export function createIsraelDate(
  year: number,
  month: number,
  day: number,
  hours = 0,
  minutes = 0,
  seconds = 0,
  ms = 0
): Date {
  // Format date parts to ISO format and parse with the Israel timezone
  const dateStr =
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(
      2,
      "0"
    )}T` +
    `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;

  // Parse using date-fns and apply Israel timezone
  const utcDate = parseISO(dateStr);
  return utcDate;
}
