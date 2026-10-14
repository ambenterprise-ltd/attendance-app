/**
 * Date and time formatting utilities for Asia/Karachi timezone.
 * All formatting uses standard Intl API (zero external dependencies).
 */

export const TIMEZONE = 'Asia/Karachi';

/**
 * Returns today's date formatted as YYYY-MM-DD in Asia/Karachi timezone.
 */
export const getTodayKarachiDate = (): string => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
};

/**
 * Returns the first day of the current month (YYYY-MM-01) in Asia/Karachi.
 */
export const getStartOfCurrentMonth = (): string => {
  const today = getTodayKarachiDate();
  const [year, month] = today.split('-');
  return `${year}-${month}-01`;
};

/**
 * Formats an ISO timestamptz string into 12-hour Karachi time (e.g. "09:05:30 AM").
 */
export const formatKarachiTime = (isoString?: string | null): string => {
  if (!isoString) return '--:--';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '--:--';
    return new Intl.DateTimeFormat('en-US', {
      timeZone: TIMEZONE,
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return '--:--';
  }
};

/**
 * Formats a date string into readable Karachi date (e.g. "Oct 15, 2026").
 */
export const formatKarachiDate = (dateString?: string | null): string => {
  if (!dateString) return '--';
  try {
    // If it's YYYY-MM-DD, parse year, month, day to avoid UTC shifts
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        weekday: 'short',
      }).format(date);
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-US', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    }).format(date);
  } catch {
    return dateString;
  }
};

/**
 * Calculates human-readable duration between two timestamps or in seconds.
 * Example: "7h 45m" or "00:45:12"
 */
export const formatDurationSeconds = (totalSeconds: number): string => {
  if (totalSeconds < 0) totalSeconds = 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

/**
 * Formats difference between start and end into "Xh Ym" format.
 */
export const formatDurationHoursMinutes = (
  startIso?: string | null,
  endIso?: string | null
): string => {
  if (!startIso || !endIso) return '--';
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (isNaN(start) || isNaN(end) || end < start) return '--';

  const diffSec = Math.floor((end - start) / 1000);
  const hours = Math.floor(diffSec / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);

  if (hours === 0) {
    return `${minutes}m`;
  }
  return `${hours}h ${minutes}m`;
};

/**
 * Returns the ISO boundary strings for a given YYYY-MM-DD in Asia/Karachi (UTC+5).
 */
export const getKarachiDayBounds = (dateStr?: string) => {
  const d = dateStr || getTodayKarachiDate();
  return {
    startIso: `${d}T00:00:00+05:00`,
    endIso: `${d}T23:59:59.999+05:00`,
  };
};

/**
 * Returns the Monday-to-Sunday week range for a given date in YYYY-MM-DD.
 */
export const getWeekRange = (dateStr: string): { startDate: string; endDate: string } => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day);
  const dayOfWeek = targetDate.getDay(); // 0 is Sunday, 1 is Monday...
  
  // Calculate distance to previous Monday
  const distanceToMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(year, month - 1, day - distanceToMonday);
  const sunday = new Date(year, month - 1, day - distanceToMonday + 6);

  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatYMD = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  return {
    startDate: formatYMD(monday),
    endDate: formatYMD(sunday),
  };
};

/**
 * Returns the start and end date for the entire month of a given date.
 */
export const getMonthRange = (dateStr: string): { startDate: string; endDate: string } => {
  const [year, month] = dateStr.split('-').map(Number);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const startDate = `${year}-${pad(month)}-01`;

  // Last day of month
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${pad(month)}-${pad(lastDay)}`;

  return {
    startDate,
    endDate,
  };
};


