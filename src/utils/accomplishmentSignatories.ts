export interface SignatoryDetails {
  name: string;
  position: string;
}

export function cleanPersonName(rawName?: string): string {
  if (!rawName) return '';
  return rawName
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/,/g, '')
    .trim()
    .toUpperCase();
}

/**
 * Formats a position title cleanly, preserving uppercase organization acronyms
 */
export function formatPosition(pos: string, defaultOrg: string = 'SSC'): string {
  if (!pos) return `${defaultOrg} President`;
  let trimmed = pos.trim();
  const knownAcronyms = ['SSC', 'CBIT', 'CESS', 'CELS', 'CMFS', 'KAABAG', 'SENSSO', 'TME', 'OSA', 'OSD', 'OVCSAS', 'OME', 'SO'];

  // Check if starts with a known acronym followed by title
  for (const acr of knownAcronyms) {
    const reg = new RegExp(`^${acr}\\s+`, 'i');
    if (reg.test(trimmed)) {
      const remainder = trimmed.replace(reg, '').trim();
      const titleCasedRemainder = remainder
        .split(' ')
        .map(w => {
          const u = w.toUpperCase();
          if (knownAcronyms.includes(u)) return u;
          if (w === '/' || w === '&' || w === '-') return w;
          return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
        })
        .join(' ');
      return `${acr} ${titleCasedRemainder}`;
    }
  }

  // If entirely uppercase and longer than 3 chars, convert non-acronyms to title case
  if (trimmed === trimmed.toUpperCase() && trimmed.length > 3) {
    trimmed = trimmed
      .split(' ')
      .map(w => {
        const u = w.toUpperCase();
        if (knownAcronyms.includes(u)) return u;
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      })
      .join(' ');
  }

  return trimmed;
}

/**
 * Resolves the prepared-by signatory cleanly:
 * - Strips any embedded "(POSITION)" from the name line (e.g. "(SSC PRESIDENT)")
 * - Ensures position is cleanly placed below the name
 * - If position defaults to SenSSo but org is SSC/CBIT/etc, updates to the correct org role
 */
export function resolvePreparedBySignatory(
  formPreparedName?: string,
  formPreparedTitle?: string,
  activityProposedBy?: string,
  activityOrgId?: string
): SignatoryDetails {
  const rawInput = (formPreparedName || activityProposedBy || 'Maria Clarisse Santos').trim();
  
  // Extract role if enclosed in parentheses: e.g. "Maria Clarisse Santos (SSC President)"
  let extractedPosition = '';
  const match = rawInput.match(/\((.*?)\)/);
  if (match && match[1]) {
    extractedPosition = match[1].trim();
  }

  const cleanName = cleanPersonName(rawInput) || 'MARIA CLARISSE SANTOS';
  const org = (activityOrgId || 'SSC').trim().toUpperCase();

  let position = (formPreparedTitle || '').trim();

  // If position was embedded in parentheses in the name, use it
  if (extractedPosition) {
    position = extractedPosition;
  }

  // If position is empty, or has 'SenSSo' when the organization is NOT SenSSo, update to proper org position
  const isSenssoOrg = org.includes('SENSSO');
  if (!position || (!isSenssoOrg && position.toLowerCase().includes('sensso'))) {
    position = `${org} President`;
  }

  return {
    name: cleanName,
    position: formatPosition(position, org)
  };
}

export function resolveReviewedBySignatory(
  formReviewedName?: string,
  formReviewedTitle?: string,
  activityAdviserName?: string,
  activityOrgId?: string
): SignatoryDetails {
  const rawInput = (formReviewedName || activityAdviserName || 'Dinah Kendra A. Lumactad').trim();
  let extractedPosition = '';
  const match = rawInput.match(/\((.*?)\)/);
  if (match && match[1]) {
    extractedPosition = match[1].trim();
  }

  const cleanName = cleanPersonName(rawInput) || 'DINAH KENDRA A. LUMACTAD';
  const org = (activityOrgId || 'SSC').trim().toUpperCase();

  let position = (formReviewedTitle || '').trim();
  if (extractedPosition) {
    position = extractedPosition;
  }

  const isSenssoOrg = org.includes('SENSSO');
  if (!position || (!isSenssoOrg && position.toLowerCase().includes('sensso'))) {
    position = `OSA Coordinator / ${org} Adviser`;
  }

  return {
    name: cleanName,
    position: formatPosition(position, org)
  };
}

export function resolveRecordedBySignatory(
  formRecordedName?: string,
  formRecordedTitle?: string
): SignatoryDetails {
  const rawInput = (formRecordedName || 'Claire Joy Mariquit').trim();
  const cleanName = cleanPersonName(rawInput) || 'CLAIRE JOY MARIQUIT';
  const position = (formRecordedTitle || 'Monitoring and Evaluation Personnel').trim();

  return {
    name: cleanName,
    position: formatPosition(position, 'OME')
  };
}

