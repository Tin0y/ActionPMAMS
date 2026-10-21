import { Activity, ActivityDesignForm } from '../types';
import { ORGANIZATIONS, isOrgMatch } from '../data/initialData';
import { cleanPersonName, formatPosition } from './accomplishmentSignatories';

export interface DadSignatoryDetails {
  name: string;
  role: string;
}

/**
 * Resolves the primary organization acronym for an activity,
 * respecting sub-organizations and official naming standards.
 */
export function resolveDadOrgAcronym(activity: Activity): string {
  const rawId = (activity.orgId || activity.office || '').trim();
  const subOrg = ((activity as any).subOrg || (activity as any).actualOrg || '').trim();

  // If subOrg is present and distinct from parent/college, prioritize it
  if (subOrg && !isOrgMatch(subOrg, rawId)) {
    return subOrg;
  }

  // Match against registered parent organizations
  const matched = ORGANIZATIONS.find(o => 
    isOrgMatch(o.id, rawId) || 
    isOrgMatch(o.acronym, rawId) || 
    o.id.toUpperCase() === rawId.toUpperCase() || 
    o.acronym.toUpperCase() === rawId.toUpperCase()
  );

  if (matched) {
    return matched.acronym;
  }

  // Standard acronym mapping fallbacks
  const upper = rawId.toUpperCase();
  if (upper === 'CBIT' || upper === 'CBIT SEC') return 'CBIT SEC';
  if (upper === 'CELS' || upper === 'ELSSA') return 'ELSSA';
  if (upper === 'CESS' || upper === 'CESS SO') return 'CESS SO';
  if (upper === 'CFMS' || upper === 'CMFS' || upper === 'FIMSSO') return 'FIMSSO';
  if (upper === 'KAABAG') return 'KAABAG';
  if (upper === 'SENSSO' || upper === 'SENSO') return 'SenSSo';
  if (upper === 'SSC') return 'SSC';

  return rawId || 'SSC';
}

/**
 * Resolves the "Prepared by:" signatory name and role for DAD exports, print, and preview.
 * - Extracts clean student name without parentheses
 * - Prevents cross-organization bleed (e.g., displaying "SSC Senator" for CBIT SEC activities)
 * - Identifies organization-specific leadership roles (e.g., "CBIT SEC President", "ELSSA President")
 */
export function resolveDadPreparedBySignatory(
  activity: Activity,
  form?: Partial<ActivityDesignForm>
): DadSignatoryDetails {
  const orgAcronym = resolveDadOrgAcronym(activity);
  const isSscOrg = isOrgMatch(orgAcronym, 'SSC');

  const matchedOrg = ORGANIZATIONS.find(o => 
    isOrgMatch(o.id, activity.orgId) || 
    isOrgMatch(o.acronym, activity.orgId) ||
    isOrgMatch(o.acronym, orgAcronym)
  );

  // 1. Raw name from form or activity
  const rawName = (form?.submittedBy || activity.proposedBy || matchedOrg?.president || 'STUDENT LEADER').trim();

  // 2. Extract potential embedded role from parentheses: e.g. "Joshua Paul Mendoza (President)"
  let extractedPosition = '';
  const parenMatch = rawName.match(/\((.*?)\)/);
  if (parenMatch && parenMatch[1]) {
    extractedPosition = parenMatch[1].trim();
  }

  // 3. Clean person name
  let cleanName = cleanPersonName(rawName);
  if (!cleanName || cleanName === 'STUDENT LEADER') {
    cleanName = cleanPersonName(matchedOrg?.president) || 'STUDENT LEADER';
  }

  // 4. Role resolution
  let role = (form?.submittedByRole || '').trim();

  // Strip legacy buggy fallback (where "SSC Senator" was erroneously hardcoded for other orgs)
  if (role) {
    const isLegacyBuggyFallback = 
      (!isSscOrg && (/^SSC\b/i.test(role) || /Senator/i.test(role))) ||
      role.toLowerCase().includes('senator, planning and development');
    if (isLegacyBuggyFallback) {
      role = '';
    }
  }

  // If no user-specified role, check position extracted from parentheses
  if (!role && extractedPosition) {
    if (isSscOrg || (!extractedPosition.toLowerCase().startsWith('ssc') && !extractedPosition.toLowerCase().includes('senator'))) {
      role = extractedPosition;
    }
  }

  // If still no role, match person with known members in organization roster
  if (!role && matchedOrg?.membersList?.length) {
    const member = matchedOrg.membersList.find(m => {
      const memberClean = cleanPersonName(m.fullName);
      return memberClean === cleanName || cleanName.includes(memberClean) || memberClean.includes(cleanName);
    });
    if (member?.role) {
      role = member.role;
    }
  }

  // If person matches org president
  if (!role && matchedOrg?.president && cleanPersonName(matchedOrg.president) === cleanName) {
    role = 'President';
  }

  // Update legacy abbreviations if present
  if (role.toLowerCase().startsWith('cbit ') && orgAcronym === 'CBIT SEC') {
    role = role.replace(/^cbit\s+/i, 'CBIT SEC ');
  } else if (role.toLowerCase().startsWith('cess ') && orgAcronym === 'CESS SO') {
    role = role.replace(/^cess\s+/i, 'CESS SO ');
  } else if (role.toLowerCase().startsWith('cels ') && orgAcronym === 'ELSSA') {
    role = role.replace(/^cels\s+/i, 'ELSSA ');
  } else if ((role.toLowerCase().startsWith('cfms ') || role.toLowerCase().startsWith('cmfs ')) && orgAcronym === 'FIMSSO') {
    role = role.replace(/^(cfms|cmfs)\s+/i, 'FIMSSO ');
  }

  // If role is empty, default to org president
  if (!role) {
    role = `${orgAcronym} President`;
  } else {
    // If role does not mention the org acronym, prepend orgAcronym
    const cleanRoleUpper = role.toUpperCase();
    if (!cleanRoleUpper.includes(orgAcronym.toUpperCase()) && !cleanRoleUpper.includes('PRESIDENT / HEAD')) {
      role = `${orgAcronym} ${role}`;
    }
    role = formatPosition(role, orgAcronym);
  }

  return {
    name: cleanName,
    role: role
  };
}

/**
 * Resolves the official DAD Control Number matching MSUN standard:
 * e.g., MSUN-CBIT SEC-DAD-_____-2026-REV___ or MSUN-SSC-DAD-_____-2026-REV___
 * (The sequence number and revision blank are left with underlines for handwriting)
 */
export function getDadControlNo(
  activity?: Activity | null,
  form?: Partial<ActivityDesignForm>
): string {
  // If user provided a specific non-legacy control number, use it
  if (form?.controlNumber && form.controlNumber.trim()) {
    const raw = form.controlNumber.trim();
    // Discard outdated legacy placeholder strings
    if (!raw.includes('ACCOM-REV') && !raw.includes('001-2025-REV00')) {
      return raw;
    }
  }

  const orgAcronym = activity ? resolveDadOrgAcronym(activity) : 'SSC';

  // Extract year from fiscalYear, startDate, dateImplementation, or current year
  let year = '';
  if (activity?.fiscalYear) {
    const yMatch = activity.fiscalYear.match(/\b(20\d\d)\b/);
    if (yMatch) year = yMatch[1];
  }
  if (!year && activity?.startDate) {
    const yMatch = activity.startDate.match(/\b(20\d\d)\b/);
    if (yMatch) year = yMatch[1];
  }
  if (!year && form?.dateImplementation) {
    const yMatch = form.dateImplementation.match(/\b(20\d\d)\b/);
    if (yMatch) year = yMatch[1];
  }
  if (!year) {
    year = String(new Date().getFullYear());
  }

  return `MSUN-${orgAcronym}-DAD-_____-${year}-REV___`;
}

/**
 * Resolves the "Included in the (_____) Year: (_____)" line for DAD documents
 */
export function resolveDadPoeLine(form?: Partial<ActivityDesignForm>): {
  label: string;
  isYes: boolean;
  isNo: boolean;
} {
  const plan = form?.includedInPdsPlan?.trim();
  const rawYear = form?.includedInPdsYear?.trim();
  // If year was legacy hardcoded default '2027', leave it blank for handwriting unless customized
  const year = (rawYear && rawYear !== '2027') ? rawYear : '';

  const planDisplay = plan || '_____';
  const yearDisplay = year || '_____';

  const label = `Included in the (${planDisplay}) Year: (${yearDisplay})`;
  const isYes = form?.includedInPdsStatus !== 'No';
  const isNo = form?.includedInPdsStatus === 'No';

  return { label, isYes, isNo };
}

