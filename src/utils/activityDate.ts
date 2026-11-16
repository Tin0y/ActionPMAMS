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

export interface MonthCalendarDay {
  day: number;
  isoDate: string;
  weekday: number; // 0 (Sun) - 6 (Sat)
  weekIndex: number; // 1 (1-7), 2 (8-14), 3 (15-21), 4 (22-28), 5 (29-31)
}

export interface MonthCalendarGrid {
  year: number;
  month: number; // 1-12
  monthName: string;
  shortMonthName: string;
  firstWeekday: number; // 0-6
  daysInMonth: number;
  days: MonthCalendarDay[];
}

export function getTargetYearFromFiscalYear(fiscalYear?: string): number {
  const yearDigits = fiscalYear?.match(/\d{4}/)?.[0];
  return yearDigits ? Number(yearDigits) : new Date().getFullYear();
}

export function getMonthCalendarWeekIndex(day: number): number {
  return Math.min(5, Math.ceil(Math.max(1, day) / 7));
}

function getWeekOrdinalLabel(weekIndex: number): string {
  switch (weekIndex) {
    case 1:
      return '1st';
    case 2:
      return '2nd';
    case 3:
      return '3rd';
    case 4:
      return '4th';
    default:
      return 'Last';
  }
}

export function buildMonthCalendarGrid(
  monthLabel?: string,
  fiscalYear?: string
): MonthCalendarGrid | null {
  const monthNum = getMonthNumberFromLabel(monthLabel);
  if (!monthNum) return null;

  const yearNum = getTargetYearFromFiscalYear(fiscalYear);
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
  const firstWeekday = new Date(yearNum, monthNum - 1, 1).getDay();
  const monthName = MONTH_NAMES[monthNum - 1];
  const shortMonthName = monthName.slice(0, 3);

  const days: MonthCalendarDay[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const isoDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const weekday = (firstWeekday + day - 1) % 7;
    days.push({
      day,
      isoDate,
      weekday,
      weekIndex: getMonthCalendarWeekIndex(day)
    });
  }

  return {
    year: yearNum,
    month: monthNum,
    monthName,
    shortMonthName,
    firstWeekday,
    daysInMonth,
    days
  };
}

/**
 * Formats selected YYYY-MM-DD dates within a chosen month into a concise
 * Action Plan Week summary label plus normalized startDate / endDate.
 * Examples:
 * - [2027-11-05] -> "1st Week (Nov 5)"
 * - [2027-11-03, 2027-11-04, 2027-11-05] -> "1st Week (Nov 3–5)"
 * - [2027-11-05, 2027-11-12] -> "1st–2nd Week (Nov 5, 12)"
 */
export function formatWeekSummaryFromDates(
  isoDates: string[],
  monthLabel?: string,
  fiscalYear?: string
): { weekLabel: string; startDate: string; endDate: string; sortedDates: string[] } {
  const normalized = Array.from(
    new Set(
      (isoDates || [])
        .map(d => extractIsoDate(d))
        .filter(Boolean)
    )
  ).sort();

  if (normalized.length === 0) {
    return { weekLabel: '', startDate: '', endDate: '', sortedDates: [] };
  }

  const targetMonthNum = getMonthNumberFromLabel(monthLabel) || Number(normalized[0].slice(5, 7));
  const targetYear = normalized[0].slice(0, 4) || String(getTargetYearFromFiscalYear(fiscalYear));
  const filtered = normalized.filter(d => Number(d.slice(5, 7)) === targetMonthNum && d.startsWith(targetYear));
  const finalDates = filtered.length > 0 ? filtered : normalized;

  const yearNum = Number(finalDates[0].slice(0, 4));
  const monthNum = Number(finalDates[0].slice(5, 7));
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
  const shortMonthName = (MONTH_NAMES[monthNum - 1] || 'Month').slice(0, 3);

  const dayNumbers = Array.from(new Set(finalDates.map(d => Number(d.slice(8, 10))))).sort((a, b) => a - b);
  const minWeek = getMonthCalendarWeekIndex(dayNumbers[0]);
  const maxWeek = getMonthCalendarWeekIndex(dayNumbers[dayNumbers.length - 1]);

  let weekPrefix = '';
  if (dayNumbers.length >= daysInMonth) {
    weekPrefix = 'Entire Month';
  } else if (minWeek === maxWeek) {
    weekPrefix = `${getWeekOrdinalLabel(minWeek)} Week`;
  } else {
    weekPrefix = `${getWeekOrdinalLabel(minWeek)}–${getWeekOrdinalLabel(maxWeek)} Week`;
  }

  // Group contiguous days into compact ranges like "3–5, 10"
  const spans: string[] = [];
  let rangeStart = dayNumbers[0];
  let rangeEnd = dayNumbers[0];
  for (let i = 1; i < dayNumbers.length; i++) {
    const cur = dayNumbers[i];
    if (cur === rangeEnd + 1) {
      rangeEnd = cur;
    } else {
      spans.push(rangeStart === rangeEnd ? String(rangeStart) : `${rangeStart}–${rangeEnd}`);
      rangeStart = cur;
      rangeEnd = cur;
    }
  }
  spans.push(rangeStart === rangeEnd ? String(rangeStart) : `${rangeStart}–${rangeEnd}`);

  let weekLabel = `${weekPrefix} (${shortMonthName} ${spans.join(', ')})`;
  if (weekLabel.length > 50) {
    weekLabel = `${weekPrefix} (${shortMonthName} ${dayNumbers[0]}–${dayNumbers[dayNumbers.length - 1]}, ${dayNumbers.length}d)`;
  }

  return {
    weekLabel,
    startDate: finalDates[0],
    endDate: finalDates[finalDates.length - 1],
    sortedDates: finalDates
  };
}

/**
 * Extracts explicit YYYY-MM-DD calendar dates when a Week label contains
 * day numbers produced by the calendar picker (e.g. "1st Week (Nov 3–5, 10)").
 * Returns [] for purely ordinal labels like "1st Week" or "3rd-4th Week".
 */
export function extractCalendarDaysFromWeekLabel(
  weekLabel?: string,
  monthLabel?: string,
  fiscalYear?: string
): string[] {
  if (!weekLabel || typeof weekLabel !== 'string') return [];
  const monthNum = getMonthNumberFromLabel(monthLabel);
  if (!monthNum) return [];

  const yearNum = getTargetYearFromFiscalYear(fiscalYear);
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate();

  // Only treat as explicit calendar days when formatted with month text inside
  // parentheses or explicit "<Month> <day>" pattern, not ordinal-only strings.
  const parenMatch = weekLabel.match(/\(([^)]+)\)/);
  const rawSegment = parenMatch
    ? parenMatch[1]
    : (/(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(weekLabel) ? weekLabel : '');
  const daySegment = rawSegment.replace(/\b\d+\s*d(?:ays?)?\b/gi, '');
  if (!daySegment.trim()) return [];

  const daySet = new Set<number>();
  const rangeOrSingleMatches = daySegment.matchAll(/(\d{1,2})\s*(?:[-–—to]+\s*(\d{1,2}))?/gi);
  for (const m of rangeOrSingleMatches) {
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    if (a < 1 || a > daysInMonth) continue;
    const clampedEnd = Math.min(daysInMonth, Math.max(a, b));
    for (let d = a; d <= clampedEnd; d++) {
      daySet.add(d);
    }
  }

  return Array.from(daySet)
    .sort((a, b) => a - b)
    .map(d => `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
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

  const yearNum = getTargetYearFromFiscalYear(fiscalYear);
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate();

  const explicitDays = extractCalendarDaysFromWeekLabel(weekLabel, monthLabel, fiscalYear);
  if (explicitDays.length > 0) {
    return {
      startDate: explicitDays[0],
      endDate: explicitDays[explicitDays.length - 1]
    };
  }

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
  // 2. Determine explicit dates stored on the activity
  const explicitStart =
    extractIsoDate(act.startDate) ||
    extractIsoDate(act.scheduleStart) ||
    extractIsoDate(act.date);
  const explicitEnd =
    extractIsoDate(act.endDate) ||
    extractIsoDate(act.scheduleEnd);

  const effectiveFiscalYear = act.fiscalYear || (explicitStart ? explicitStart.slice(0, 4) : undefined);
  const yearDigits =
    String(effectiveFiscalYear || '').match(/\d{4}/)?.[0] || String(new Date().getFullYear());
  const derived = deriveDateRangeFromTimeframe(
    act.timeframeMonth,
    act.timeframeWeek,
    effectiveFiscalYear
  );

  // 1. Always honor an explicit DAD implementation date when filled out
  const dadDate = extractIsoDate(act.designForm?.dateImplementation);
  if (dadDate) {
    const endDate = explicitEnd && explicitEnd >= dadDate ? explicitEnd : dadDate;
    return { startDate: dadDate, endDate };
  }

  // 3. For Action Plan items without a DAD date, heal legacy placeholder dates (e.g. YYYY-01-15..20 or YYYY-06-01)
  //    or month mismatches so the calendar reflects the org's selected Month + Week while preserving real custom dates.
  const explicitSelectedDates = Array.isArray(act.selectedDates)
    ? act.selectedDates.map(d => extractIsoDate(d)).filter(Boolean).sort()
    : [];
  const targetMonthNum = getMonthNumberFromLabel(act.timeframeMonth);
  if (explicitSelectedDates.length > 0) {
    const matchingMonthDates = targetMonthNum
      ? explicitSelectedDates.filter(d => Number(d.slice(5, 7)) === targetMonthNum)
      : explicitSelectedDates;
    if (matchingMonthDates.length > 0) {
      return {
        startDate: matchingMonthDates[0],
        endDate: matchingMonthDates[matchingMonthDates.length - 1]
      };
    }
  }

  const isPlanRecord = Boolean(act.isActionPlanItem || act.source === 'ACTION_PLAN' || act.timeframeMonth);
  if (isPlanRecord && derived) {
    const hasExplicitCalendarWeek = extractCalendarDaysFromWeekLabel(act.timeframeWeek, act.timeframeMonth, effectiveFiscalYear).length > 0;
    const isOldJanPlaceholder =
      !hasExplicitCalendarWeek &&
      Boolean(targetMonthNum && targetMonthNum !== 1) &&
      explicitStart === `${yearDigits}-01-15` &&
      (!explicitEnd || explicitEnd === `${yearDigits}-01-20` || explicitEnd === `${yearDigits}-01-15`);
    const isOldJunPlaceholder =
      !hasExplicitCalendarWeek &&
      explicitStart === `${yearDigits}-06-01` &&
      (!explicitEnd || explicitEnd === `${yearDigits}-06-01`);
    const explicitMonthNum = explicitStart ? Number(explicitStart.slice(5, 7)) : null;
    const isMonthMismatch = Boolean(targetMonthNum && explicitMonthNum && targetMonthNum !== explicitMonthNum);

    if (!explicitStart || isOldJanPlaceholder || isOldJunPlaceholder || isMonthMismatch || hasExplicitCalendarWeek) {
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
