/**
 * Dates and times (G-19): stored in UTC, shown in IST (UTC+05:30).
 * Date: "08 Oct 2026". Date-time: "08 Oct 2026, 7:41 PM".
 */
const IST = 'Asia/Kolkata';

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: IST,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: IST,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

export function formatIstDate(date: Date): string {
  return dateFormatter.format(date);
}

export function formatIstDateTime(date: Date): string {
  return `${formatIstDate(date)}, ${timeFormatter.format(date)}`;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}