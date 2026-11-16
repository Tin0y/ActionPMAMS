import type { Activity } from '../types';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

/**
 * Normalizes a date-like string into a clean YYYY-MM-DD value if parseable.
 * Returns empty string if input is missing or invalid.
 */
export function extractIsoDate(raw?: unknown): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const monthNum = Number(m);
    const dayNum = Number(d);
    if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
      return `${y}-${m}-${d}`;
    }
  }

  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed)) {
    const dt = new Date(parsed);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return '';
}

/**
 * Resolves a calendar month number (1-12) from a month name or abbreviation.
 */
export function getMonthNumberFromLabel(label?: string): number | null {
  if (!label || typeof label !== 'string') return null;
  const clean = label.trim().toLowerCase();
  if (!clean) return null;

  for (let i = 0; i < MONTH_NAMES.length; i++) {
    const full = MONTH_NAMES[i].toLowerCase();
    if (clean === full || clean.startsWith(full.slice(0, 3))) {
      return i + 1;
    }
  }

  const numMatch = clean.match(/^(\d{1,2})$/);
  if (numMatch) {
    const n = Number(numMatch[1]);
    if (n >= 1 && n <= 12) return n;
  }

  return null;
}

/**
 * Derives representative YYYY-MM-DD start/end dates from Action Plan timeframe
 * fields (month, week, fiscal year) when explicit calendar dates are absent.
 */
export function deriveDateRangeFromTimeframe(
  monthLabel?: string,
  weekLabel?: string,
  fiscalYear?: string
): { startDate: string; endDate: string } | null {
  const monthNum = getMonthNumberFromLabel(monthLabel);
  if (!monthNum) return null;

  const yearDigits = fiscalYear?.match(/\d{4}/)?.[0];
  const yearNum = yearDigits ? Number(yearDigits) : new Date().getFullYear();
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate();

  const weekLower = (weekLabel || '').trim().toLowerCase();
  let startDay = 1;
  let endDay = Math.min(5, daysInMonth);

  if (weekLower.includes('entire')) {
    startDay = 1;
    endDay = daysInMonth;
  } else if (weekLower.includes('1st-2nd') || (weekLower.includes('1st') && weekLower.includes('2nd'))) {
    startDay = 1;
    endDay = Math.min(14, daysInMonth);
  } else if (weekLower.includes('3rd-4th') || (weekLower.includes('3rd') && weekLower.includes('4th'))) {
    startDay = 15;
    endDay = Math.min(28, daysInMonth);
  } else if (weekLower.includes('1st') && weekLower.includes('3rd')) {
    startDay = 1;
    endDay = Math.min(21, daysInMonth);
  } else if (weekLower.includes('2nd')) {
    startDay = 8;
    endDay = Math.min(14, daysInMonth);
  } else if (weekLower.includes('3rd')) {
    startDay = 15;
    endDay = Math.min(21, daysInMonth);
  } else if (weekLower.includes('4th')) {
    startDay = 22;
    endDay = Math.min(28, daysInMonth);
  } else if (weekLower.includes('last') && !weekLower.includes('first')) {
    startDay = Math.max(1, daysInMonth - 6);
    endDay = daysInMonth;
  } else if (weekLower.includes('1st') || weekLower.includes('first')) {
    startDay = 1;
    endDay = Math.min(7, daysInMonth);
  } else if (weekLower) {
    const rangeNums = weekLower.match(/(\d+)/g);
    if (rangeNums && rangeNums.length >= 2) {
      const w1 = Math.max(1, Math.min(4, Number(rangeNums[0])));
      const w2 = Math.max(w1, Math.min(4, Number(rangeNums[1])));
      startDay = (w1 - 1) * 7 + 1;
      endDay = Math.min(w2 * 7, daysInMonth);
    } else if (rangeNums && rangeNums.length === 1) {
      const w = Math.max(1, Math.min(4, Number(rangeNums[0])));
      startDay = (w - 1) * 7 + 1;
      endDay = Math.min(w * 7, daysInMonth);
    }
  }

  const mStr = String(monthNum).padStart(2, '0');
  const sStr = String(startDay).padStart(2, '0');
  const eStr = String(Math.max(startDay, endDay)).padStart(2, '0');

  return {
    startDate: `${yearNum}-${mStr}-${sStr}`,
    endDate: `${yearNum}-${mStr}-${eStr}`
  };
}

/**
 * Resolves guaranteed valid YYYY-MM-DD startDate and endDate for any Activity,
 * bridging DB rows (scheduleStart/scheduleEnd), DAD implementation dates, and
 * Action Plan timeframeMonth/timeframeWeek values.
 */
export function resolveActivityDates(act: Partial<Activity> & Record<string, any>): {
  startDate: string;
  endDate: string;
} {
  const yearDigits = String(act.fiscalYear || '').match(/\d{4}/)?.[0] || String(new Date().getFullYear());
  const derived = deriveDateRangeFromTimeframe(act.timeframeMonth, act.timeframeWeek, act.fiscalYear);

  const dadDate = extractIsoDate(act.designForm?.dateImplementation);
  const explicitStart =
    dadDate ||
    extractIsoDate(act.startDate) ||
    extractIsoDate(act.scheduleStart) ||
    extractIsoDate(act.date);

  const startDate = explicitStart || derived?.startDate || `${yearDigits}-06-01`;

  const explicitEnd =
    extractIsoDate(act.endDate) ||
    extractIsoDate(act.scheduleEnd);

  let endDate = explicitEnd || (!explicitStart && derived ? derived.endDate : '') || startDate;
  if (endDate < startDate) {
    endDate = startDate;
  }

  return { startDate, endDate };
}
