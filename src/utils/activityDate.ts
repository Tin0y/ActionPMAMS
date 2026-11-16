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
  let startYear = yearNum;
  let startMonth = monthNum;
  let startDay = 1;
  let endDay = Math.min(7, daysInMonth);

  const parseWeekOrdinal = (token: string): number | null => {
    const clean = token.trim().toLowerCase();
    if (clean.includes('1st') || clean.includes('first') || clean === '1') return 1;
    if (clean.includes('2nd') || clean.includes('second') || clean === '2') return 2;
    if (clean.includes('3rd') || clean.includes('third') || clean === '3') return 3;
    if (clean.includes('4th') || clean.includes('fourth') || clean === '4') return 4;
    if (clean.includes('last') || clean.includes('5th') || clean.includes('fifth') || clean === '5') return 5;
    return null;
  };

  if (weekLower.includes('entire')) {
    startDay = 1;
    endDay = daysInMonth;
  } else if (weekLower.includes('last') && (weekLower.includes('first') || weekLower.includes('1st'))) {
    // Spans from the last week of the previous month through the 1st week of the target month
    const prevMonth = monthNum === 1 ? 12 : monthNum - 1;
    const prevYear = monthNum === 1 ? yearNum - 1 : yearNum;
    const prevDays = new Date(prevYear, prevMonth, 0).getDate();
    startYear = prevYear;
    startMonth = prevMonth;
    startDay = Math.max(1, prevDays - 6);
    endDay = Math.min(7, daysInMonth);
  } else if (weekLower) {
    const tokens = weekLower.match(/(?:1st|2nd|3rd|4th|5th|first|second|third|fourth|fifth|last|\d+)/g) || [];
    const ordinals = tokens
      .map(parseWeekOrdinal)
      .filter((n): n is number => n !== null);

    if (ordinals.length >= 2) {
      const wStart = Math.min(ordinals[0], ordinals[1]);
      const wEnd = Math.max(ordinals[0], ordinals[1]);
      startDay = wStart >= 5 ? Math.max(1, daysInMonth - 6) : (wStart - 1) * 7 + 1;
      endDay = wEnd >= 5 ? daysInMonth : Math.min(wEnd * 7, daysInMonth);
    } else if (ordinals.length === 1) {
      const w = ordinals[0];
      if (w >= 5) {
        startDay = Math.max(1, daysInMonth - 6);
        endDay = daysInMonth;
      } else {
        startDay = (w - 1) * 7 + 1;
        endDay = Math.min(w * 7, daysInMonth);
      }
    }
  }

  const startStr = `${startYear}-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
  const endStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

  return {
    startDate: startStr,
    endDate: endStr < startStr ? startStr : endStr
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

  // 1. Always honor an explicit DAD implementation date when filled out
  const dadDate = extractIsoDate(act.designForm?.dateImplementation);
  if (dadDate) {
    const explicitEnd = extractIsoDate(act.endDate) || extractIsoDate(act.scheduleEnd);
    const endDate = explicitEnd && explicitEnd >= dadDate ? explicitEnd : dadDate;
    return { startDate: dadDate, endDate };
  }

  // 2. Determine explicit dates stored on the activity
  const explicitStart =
    extractIsoDate(act.startDate) ||
    extractIsoDate(act.scheduleStart) ||
    extractIsoDate(act.date);
  const explicitEnd =
    extractIsoDate(act.endDate) ||
    extractIsoDate(act.scheduleEnd);

  // 3. For Action Plan items without a DAD date, heal legacy placeholder dates (e.g. YYYY-01-15..20 or YYYY-06-01)
  //    or month mismatches so the calendar reflects the org's selected Month + Week while preserving real custom dates.
  const isPlanRecord = Boolean(act.isActionPlanItem || act.source === 'ACTION_PLAN' || act.timeframeMonth);
  if (isPlanRecord && derived) {
    const isOldJanPlaceholder =
      explicitStart === `${yearDigits}-01-15` &&
      (!explicitEnd || explicitEnd === `${yearDigits}-01-20` || explicitEnd === `${yearDigits}-01-15`);
    const isOldJunPlaceholder =
      explicitStart === `${yearDigits}-06-01` &&
      (!explicitEnd || explicitEnd === `${yearDigits}-06-01`);
    const targetMonthNum = getMonthNumberFromLabel(act.timeframeMonth);
    const explicitMonthNum = explicitStart ? Number(explicitStart.slice(5, 7)) : null;
    const isMonthMismatch = Boolean(targetMonthNum && explicitMonthNum && targetMonthNum !== explicitMonthNum);

    if (!explicitStart || isOldJanPlaceholder || isOldJunPlaceholder || isMonthMismatch) {
      return derived;
    }
  }

  // 4. Otherwise use explicit activity dates or fall back cleanly
  const startDate = explicitStart || derived?.startDate || `${yearDigits}-06-01`;

  let endDate = explicitEnd || (!explicitStart && derived ? derived.endDate : '') || startDate;
  if (endDate < startDate) {
    endDate = startDate;
  }

  return { startDate, endDate };
}
