import { Activity, ActivityDesignForm } from '../types';
import { isSameOrg } from './organizationUtils';

export type ConflictSeverity = 'red' | 'yellow' | 'blue';
export type ConflictType = 'confirmed_conflict' | 'potential_conflict' | 'similar_activity';

export interface ConflictItem {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  title: string;
  message: string;
  conflictingActivityId: string;
  conflictingActivityTitle: string;
  conflictingOrgId: string;
  conflictingOrgName?: string;
  conflictingDate: string;
  conflictingTime?: string;
  conflictingVenue: string;
  conflictingStatus: string;
  isDadReservation?: boolean;
  suggestedAction: string;
  similarityScore?: number;
}

export interface ActivityConflictSummary {
  hasConfirmedConflict: boolean;
  hasPotentialConflict: boolean;
  hasSimilarActivity: boolean;
  conflicts: ConflictItem[];
  primaryConflict?: ConflictItem;
}

export interface VenueTimeSlot {
  timeRange: string;
  startTime: string;
  endTime: string;
  organization: string;
  activityId?: string;
  activityTitle?: string;
  status: 'Available' | 'Tentatively Reserved' | 'Confirmed Reservation' | 'Unavailable';
  isDad?: boolean;
}

export interface VenueAvailabilityCheckResult {
  venue: string;
  date: string;
  overallStatus: 'Available' | 'Tentatively Reserved' | 'Confirmed Reservation' | 'Unavailable';
  slots: VenueTimeSlot[];
  reservationsCount: number;
}

/**
 * Normalizes venue names for robust matching
 */
export function normalizeVenue(v?: string): string {
  if (!v) return '';
  return v
    .toLowerCase()
    .replace(/\b(msun|university|campus|grand|main|hall|center|room|facility)\b/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function areVenuesMatching(v1?: string, v2?: string): boolean {
  if (!v1 || !v2) return false;
  const s1 = v1.trim().toLowerCase();
  const s2 = v2.trim().toLowerCase();
  if (s1 === s2) return true;
  const n1 = normalizeVenue(v1);
  const n2 = normalizeVenue(v2);
  if (!n1 || !n2) return false;
  if (n1 === n2 || n1.includes(n2) || n2.includes(n1)) return true;
  return false;
}

/**
 * Parses time string like "8:00 AM - 5:00 PM" into minutes from midnight [start, end]
 */
export function parseTimeRange(timeStr?: string): { startMinutes: number; endMinutes: number } | null {
  if (!timeStr) return null;
  const clean = timeStr.trim();
  if (!clean || clean.toLowerCase() === 'whole day' || clean.toLowerCase() === '1 day') {
    return { startMinutes: 8 * 60, endMinutes: 17 * 60 }; // 8:00 AM to 5:00 PM
  }

  // Look for separators like '-' or 'to'
  const parts = clean.split(/[-–—]|(?:\bto\b)/i).map(s => s.trim());
  if (parts.length < 2) {
    // Single time specified, assume 2 hours duration
    const single = parseSingleTimeToMinutes(parts[0]);
    if (single !== null) {
      return { startMinutes: single, endMinutes: Math.min(single + 120, 24 * 60) };
    }
    return null;
  }

  const start = parseSingleTimeToMinutes(parts[0]);
  let end = parseSingleTimeToMinutes(parts[1]);

  if (start === null) return null;
  if (end === null) end = Math.min(start + 180, 24 * 60);

  // If end is smaller than start and no AM/PM was specified, assume PM for end
  if (end <= start) {
    if (!parts[1].toLowerCase().includes('am') && !parts[1].toLowerCase().includes('pm')) {
      end += 12 * 60;
    }
  }

  return { startMinutes: start, endMinutes: end };
}

function parseSingleTimeToMinutes(tStr: string): number | null {
  const match = tStr.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = match[3] ? match[3].toLowerCase() : null;

  if (meridiem === 'pm' && hours < 12) hours += 12;
  if (meridiem === 'am' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

export function doTimeIntervalsOverlap(
  rangeA: { startMinutes: number; endMinutes: number } | null,
  rangeB: { startMinutes: number; endMinutes: number } | null
): boolean {
  if (!rangeA || !rangeB) return true; // Conservative fallback: if time is unknown, assume potential overlap
  return Math.max(rangeA.startMinutes, rangeB.startMinutes) < Math.min(rangeA.endMinutes, rangeB.endMinutes);
}

/**
 * Checks date overlap between activities or date strings
 */
export function doDatesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  if (!startA || !startB) return false;
  const eA = endA || startA;
  const eB = endB || startB;
  return startA <= eB && startB <= eA;
}

/**
 * Extracts month from date string (e.g. "2027-03-15" -> "March" or "2027-03")
 */
export function getMonthKey(dateStr?: string, timeframe?: string): string {
  if (dateStr && dateStr.length >= 7) {
    const monthNum = parseInt(dateStr.slice(5, 7), 10);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    if (monthNum >= 1 && monthNum <= 12) return months[monthNum - 1];
  }
  if (timeframe) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    for (const m of months) {
      if (timeframe.toLowerCase().includes(m.toLowerCase())) return m;
    }
  }
  return '';
}

/**
 * Keyword-based text similarity for Activity Redundancy Detection
 */
const STOP_WORDS = new Set([
  'and', 'the', 'of', 'in', 'for', 'to', 'a', 'an', 'at', 'on', 'with', 'by', 'as',
  'msun', 'naawan', 'student', 'students', 'university', 'college', 'council', 'organization',
  'activity', 'program', 'project', 'annual', 'semester', 'academic', 'year', 'regular', 'first',
  'second', '2nd', '1st', 'series', 'part', 'phase', 'conduct', 'implementation'
]);

const SYNONYM_CLUSTERS: Record<string, string[]> = {
  tree: ['tree', 'planting', 'growing', 'green', 'forest', 'forestration', 'reforestation', 'seedling', 'environmental', 'arboretum'],
  clean: ['clean', 'cleanup', 'clean-up', 'coastal', 'beach', 'waste', 'segregation', 'recycling', 'sanitation'],
  leadership: ['leadership', 'summit', 'training', 'officers', 'executive', 'governance', 'parliamentary', 'empowerment'],
  assembly: ['assembly', 'general', 'meeting', 'convocation', 'fellowship', 'gathering', 'session'],
  mental: ['mental', 'health', 'wellness', 'peer', 'listener', 'listening', 'counseling', 'mindfulness', 'psychological'],
  tech: ['tech', 'technology', 'it', 'coding', 'programming', 'hackathon', 'bootcamp', 'cyber', 'cybersecurity', 'software'],
  induction: ['induction', 'orientation', 'onboarding', 'welcome', 'acquaintance', 'induction-ball'],
  sports: ['sports', 'intramurals', 'tournament', 'championship', 'athletic', 'games', 'fitness', 'esports']
};

export function extractMeaningfulKeywords(text?: string): Set<string> {
  if (!text) return new Set();
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOP_WORDS.has(t));
  return new Set(tokens);
}

export function calculateActivitySimilarity(
  actA: { title?: string; strategicObjectives?: string; description?: string },
  actB: { title?: string; strategicObjectives?: string; description?: string }
): { isSimilar: boolean; score: number; matchedKeywords: string[] } {
  const wordsA = extractMeaningfulKeywords(`${actA.title || ''} ${actA.strategicObjectives || ''}`);
  const wordsB = extractMeaningfulKeywords(`${actB.title || ''} ${actB.strategicObjectives || ''}`);

  if (wordsA.size === 0 || wordsB.size === 0) {
    return { isSimilar: false, score: 0, matchedKeywords: [] };
  }

  const directMatches: string[] = [];
  wordsA.forEach(w => {
    if (wordsB.has(w)) directMatches.push(w);
  });

  // Check synonym clusters
  let clusterMatches = 0;
  const foundClusters = new Set<string>();
  for (const [clusterKey, synonyms] of Object.entries(SYNONYM_CLUSTERS)) {
    const hasA = synonyms.some(s => wordsA.has(s));
    const hasB = synonyms.some(s => wordsB.has(s));
    if (hasA && hasB) {
      clusterMatches++;
      foundClusters.add(clusterKey);
      if (!directMatches.includes(clusterKey)) {
        directMatches.push(clusterKey);
      }
    }
  }

  const minLen = Math.min(wordsA.size, wordsB.size);
  const jaccard = directMatches.length / minLen;

  // High confidence if 2+ core keywords match or a high-impact cluster matches with title overlap
  const isSimilar = directMatches.length >= 2 || (clusterMatches >= 1 && jaccard >= 0.25);
  const score = Math.min(1, jaccard + (clusterMatches * 0.2));

  return { isSimilar, score, matchedKeywords: directMatches };
}

/**
 * -------------------------------------------------------------
 * 1. ACTION PLAN CONFLICT & REDUNDANCY DETECTION (Section 2 & 3)
 * -------------------------------------------------------------
 * Evaluates a proposed/edited activity against other organizations' activities.
 */
export function detectActionPlanConflicts(
  target: Partial<Activity>,
  allActivities: Activity[]
): ConflictItem[] {
  const conflicts: ConflictItem[] = [];
  const targetId = target.id || '';
  const targetOrg = target.orgId || '';
  const targetVenue = target.venue || target.designForm?.venue || '';
  const targetStartDate = target.startDate || target.designForm?.dateImplementation || '';
  const targetEndDate = target.endDate || targetStartDate;
  const targetMonth = target.timeframeMonth || getMonthKey(targetStartDate, target.timeframe);
  const targetFiscalYear = target.fiscalYear || 'Fiscal Year 2027';

  for (const act of allActivities) {
    // Skip self and activities from same organization (intra-org conflicts are handled internally)
    if (act.id === targetId || isSameOrg(act.orgId, targetOrg)) continue;
    // Skip deferred or disapproved activities that released their holds
    if (act.status === 'DEFERRED' || act.workflowStatus === 'DISAPPROVED') continue;

    const actVenue = act.venue || act.designForm?.venue || '';
    const actStartDate = act.startDate || act.designForm?.dateImplementation || '';
    const actEndDate = act.endDate || actStartDate;
    const actMonth = act.timeframeMonth || getMonthKey(actStartDate, act.timeframe);
    const actFiscalYear = act.fiscalYear || 'Fiscal Year 2027';

    // Same period check: same fiscal year and either same month or overlapping dates
    const samePeriod = (targetFiscalYear === actFiscalYear) && (
      (targetMonth && actMonth && targetMonth === actMonth) ||
      (targetStartDate && actStartDate && doDatesOverlap(targetStartDate, targetEndDate, actStartDate, actEndDate))
    );

    // --- Check A: Similar Activity / Redundancy (Section 3 - Blue ℹ️) ---
    if (samePeriod) {
      const sim = calculateActivitySimilarity(
        { title: target.title || target.programActivity, strategicObjectives: target.strategicObjectives, description: target.description },
        { title: act.title || act.programActivity, strategicObjectives: act.strategicObjectives, description: act.description }
      );

      if (sim.isSimilar) {
        conflicts.push({
          id: `sim-${act.id}`,
          type: 'similar_activity',
          severity: 'blue',
          title: 'Similar Activity Detected',
          message: `${act.orgId} has proposed a similar activity ("${act.title}") for the same period. Consider coordinating with the organization or conducting a joint activity.`,
          conflictingActivityId: act.id,
          conflictingActivityTitle: act.title,
          conflictingOrgId: act.orgId,
          conflictingDate: act.startDate || actMonth || 'Same Period',
          conflictingTime: act.startTime ? `${act.startTime} - ${act.endTime || ''}` : undefined,
          conflictingVenue: act.venue || 'Campus Venue',
          conflictingStatus: act.status || 'Proposed',
          suggestedAction: 'Reach out to the lead officers of ' + act.orgId + ' to explore synergy or co-hosting a combined campus program.',
          similarityScore: sim.score
        });
      }
    }

    // --- Check B: Venue Overlap / Conflict (Section 2 - Yellow ⚠️ or Red 🚫) ---
    if (targetVenue && actVenue && areVenuesMatching(targetVenue, actVenue)) {
      // Check if dates or timeframes overlap
      const hasExactDates = Boolean(targetStartDate && actStartDate);
      const exactDatesOverlap = hasExactDates && doDatesOverlap(targetStartDate, targetEndDate, actStartDate, actEndDate);
      const monthOverlap = Boolean(targetMonth && actMonth && targetMonth === actMonth);

      if (exactDatesOverlap || monthOverlap) {
        // If it's only a month/week timeframe, flag as potential conflict warning (Yellow)
        const isTimeframeOnly = !hasExactDates || target.timeframeMonth || target.timeframeWeek;
        
        // Check if there is an active DAD reservation on the exact date
        const isActDadActive = Boolean(act.designForm?.isCompleted || (act.timeline && act.timeline.some(s => s.id >= 1 && s.status === 'completed')));

        if (!isTimeframeOnly && exactDatesOverlap && isActDadActive) {
          // Both have exact dates and the existing activity has an active DAD
          conflicts.push({
            id: `conf-dad-${act.id}`,
            type: 'confirmed_conflict',
            severity: 'red',
            title: 'Confirmed Venue Reservation Conflict',
            message: `The selected venue "${targetVenue}" is already reserved by ${act.orgId} for "${act.title}" on ${actStartDate}.`,
            conflictingActivityId: act.id,
            conflictingActivityTitle: act.title,
            conflictingOrgId: act.orgId,
            conflictingDate: actStartDate,
            conflictingTime: act.designForm?.durationDays ? `${act.designForm.durationDays} day(s)` : 'Full Day',
            conflictingVenue: actVenue,
            conflictingStatus: act.status === 'Approved' ? 'Confirmed Reservation' : 'Tentatively Reserved',
            isDadReservation: true,
            suggestedAction: 'Select an alternate venue or adjust your implementation date to avoid collision with ' + act.orgId + '.'
          });
        } else {
          // Action Plan proposal level potential conflict (Yellow Warning)
          conflicts.push({
            id: `pot-conf-${act.id}`,
            type: 'potential_conflict',
            severity: 'yellow',
            title: 'Potential Venue Conflict',
            message: `${act.orgId} has proposed an activity ("${act.title}") at your selected venue during an overlapping schedule (${actStartDate || targetMonth}).`,
            conflictingActivityId: act.id,
            conflictingActivityTitle: act.title,
            conflictingOrgId: act.orgId,
            conflictingDate: actStartDate || targetMonth || 'Target Month',
            conflictingTime: act.startTime ? `${act.startTime} - ${act.endTime || ''}` : 'To be specified in DAD',
            conflictingVenue: actVenue,
            conflictingStatus: act.status || 'Proposed',
            isDadReservation: false,
            suggestedAction: 'Review the proposed schedule. Action Plan proposals do not hold a venue reservation until a DAD form is officially filed.'
          });
        }
      }
    }
  }

  return conflicts;
}

/**
 * -------------------------------------------------------------
 * 2. DAD FORM VENUE CONFLICT DETECTION (Section 4 & 8)
 * -------------------------------------------------------------
 * Validates DAD submission against existing active DAD reservations.
 */
export function detectDadVenueConflicts(
  dadForm: Partial<ActivityDesignForm>,
  currentActivityId: string,
  currentOrgId: string,
  allActivities: Activity[]
): ConflictItem[] {
  const conflicts: ConflictItem[] = [];
  const targetVenue = dadForm.venue || '';
  const targetDate = dadForm.dateImplementation || '';

  // Extract requested time range from duration or venueRows
  let targetTimeRange = parseTimeRange(dadForm.durationDays ? String(dadForm.durationDays) : undefined);
  if (dadForm.venueRows && dadForm.venueRows.length > 0) {
    const v0 = dadForm.venueRows[0];
    if (v0.duration) {
      const parsed = parseTimeRange(v0.duration);
      if (parsed) targetTimeRange = parsed;
    }
  }

  if (!targetVenue || !targetDate) return conflicts;

  for (const act of allActivities) {
    if (act.id === currentActivityId || isSameOrg(act.orgId, currentOrgId)) continue;
    // Disapproved / deferred activities do not hold reservations
    if (act.status === 'DEFERRED' || act.workflowStatus === 'DISAPPROVED') continue;

    // Check if act has an active DAD reservation
    const hasDad = Boolean(
      act.designForm && 
      (act.designForm.isCompleted || act.timeline?.some(s => s.id >= 1 && s.status === 'completed') || act.status === 'Approved')
    );

    if (!hasDad) continue; // Approved Action Plan without active DAD does NOT reserve venue

    const actVenue = act.designForm?.venue || act.venue;
    const actDate = act.designForm?.dateImplementation || act.startDate;

    if (!areVenuesMatching(targetVenue, actVenue)) continue;
    if (targetDate !== actDate) continue; // Not the same implementation date

    // Parse existing DAD's time range
    let actTimeRange = parseTimeRange(act.designForm?.durationDays ? String(act.designForm.durationDays) : undefined);
    if (act.designForm?.venueRows && act.designForm.venueRows.length > 0) {
      const row = act.designForm.venueRows[0];
      if (row.duration) {
        const p = parseTimeRange(row.duration);
        if (p) actTimeRange = p;
      }
    }

    // Check time overlap
    if (doTimeIntervalsOverlap(targetTimeRange, actTimeRange)) {
      const isApproved = act.status === 'Approved' || act.workflowStatus === 'COMPLETED';
      const resStatus = isApproved ? 'Confirmed Reservation' : 'Tentatively Reserved';

      conflicts.push({
        id: `dad-conflict-${act.id}`,
        type: 'confirmed_conflict',
        severity: 'red',
        title: 'Venue Scheduling Conflict',
        message: `The selected venue "${targetVenue}" is already requested by ${act.orgId} during your proposed implementation schedule (${targetDate}${act.designForm?.venueRows?.[0]?.duration ? `, ${act.designForm.venueRows[0].duration}` : ''}).`,
        conflictingActivityId: act.id,
        conflictingActivityTitle: act.title,
        conflictingOrgId: act.orgId,
        conflictingDate: actDate,
        conflictingTime: act.designForm?.venueRows?.[0]?.duration || 'Full Day',
        conflictingVenue: actVenue,
        conflictingStatus: resStatus,
        isDadReservation: true,
        suggestedAction: 'You must select another date or venue, or coordinate an administrative override with the System Administrator.'
      });
    }
  }

  return conflicts;
}

/**
 * -------------------------------------------------------------
 * 3. VENUE AVAILABILITY FILTER (Section 5)
 * -------------------------------------------------------------
 * Calculates time slots and availability status for a venue on a given date.
 */
export function checkVenueAvailability(
  venue: string,
  date: string,
  allActivities: Activity[],
  userTimeRangeStr?: string
): VenueAvailabilityCheckResult {
  if (!venue || !date) {
    return {
      venue: venue || 'Unspecified Venue',
      date: date || '',
      overallStatus: 'Available',
      slots: [],
      reservationsCount: 0
    };
  }

  const matchingActivities = allActivities.filter(act => {
    if (act.status === 'DEFERRED' || act.workflowStatus === 'DISAPPROVED') return false;
    const v = act.designForm?.venue || act.venue;
    const d = act.designForm?.dateImplementation || act.startDate;
    const endD = act.endDate || d;
    return areVenuesMatching(v, venue) && (d <= date && date <= endD);
  });

  const slots: VenueTimeSlot[] = [];

  matchingActivities.forEach(act => {
    const isDadActive = Boolean(
      act.designForm && 
      (act.designForm.isCompleted || act.timeline?.some(s => s.id >= 1 && s.status === 'completed') || act.status === 'Approved')
    );

    const isConfirmed = act.status === 'Approved' || act.workflowStatus === 'COMPLETED';
    const status: VenueTimeSlot['status'] = isConfirmed
      ? 'Confirmed Reservation'
      : (isDadActive ? 'Tentatively Reserved' : 'Tentatively Reserved');

    let timeRange = '8:00 AM - 5:00 PM';
    let startTime = '08:00';
    let endTime = '17:00';

    if (act.designForm?.venueRows?.[0]?.duration) {
      timeRange = act.designForm.venueRows[0].duration;
    } else if (act.startTime && act.endTime) {
      timeRange = `${act.startTime} - ${act.endTime}`;
      startTime = act.startTime;
      endTime = act.endTime;
    }

    slots.push({
      timeRange,
      startTime,
      endTime,
      organization: act.orgId,
      activityId: act.id,
      activityTitle: act.title,
      status,
      isDad: isDadActive
    });
  });

  // Sort slots by time
  slots.sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Determine overall status
  let overallStatus: VenueAvailabilityCheckResult['overallStatus'] = 'Available';

  if (slots.length > 0) {
    const userRange = parseTimeRange(userTimeRangeStr);
    if (userRange) {
      // Check if user's specific requested time conflicts with any slot
      const overlappingSlot = slots.find(s => {
        const sRange = parseTimeRange(s.timeRange);
        return doTimeIntervalsOverlap(userRange, sRange);
      });
      if (overlappingSlot) {
        overallStatus = overlappingSlot.status;
      } else {
        overallStatus = 'Available';
      }
    } else {
      // No specific time entered, overall status reflects most restrictive active reservation
      if (slots.some(s => s.status === 'Confirmed Reservation')) {
        overallStatus = 'Confirmed Reservation';
      } else if (slots.some(s => s.status === 'Tentatively Reserved')) {
        overallStatus = 'Tentatively Reserved';
      }
    }
  }

  return {
    venue,
    date,
    overallStatus,
    slots,
    reservationsCount: slots.length
  };
}

/**
 * -------------------------------------------------------------
 * 4. OVERALL ACTIVITY CONFLICT SUMMARY (Section 6)
 * -------------------------------------------------------------
 * Evaluates an existing activity for badges on the Calendar or Activity views.
 */
export function getActivityConflictSummary(
  activity: Activity,
  allActivities: Activity[]
): ActivityConflictSummary {
  const conflicts = detectActionPlanConflicts(activity, allActivities);
  
  // Also check DAD venue conflicts if activity has a DAD form
  if (activity.designForm) {
    const dadConflicts = detectDadVenueConflicts(
      activity.designForm,
      activity.id,
      activity.orgId,
      allActivities
    );
    conflicts.push(...dadConflicts);
  }

  const hasConfirmedConflict = conflicts.some(c => c.severity === 'red');
  const hasPotentialConflict = conflicts.some(c => c.severity === 'yellow');
  const hasSimilarActivity = conflicts.some(c => c.severity === 'blue');

  // Primary conflict prioritize Red > Yellow > Blue
  const primaryConflict = conflicts.find(c => c.severity === 'red') ||
    conflicts.find(c => c.severity === 'yellow') ||
    conflicts.find(c => c.severity === 'blue');

  return {
    hasConfirmedConflict,
    hasPotentialConflict,
    hasSimilarActivity,
    conflicts,
    primaryConflict
  };
}

