import { ActionPlanTemplate } from '../types';

export const TEMPLATE_NAME_MIN_LENGTH = 3;
export const TEMPLATE_NAME_MAX_LENGTH = 120;

/**
 * Normalizes a template name by trimming outer whitespace and collapsing internal runs of whitespace.
 */
export function normalizeTemplateName(name?: string | null): string {
  return String(name || '').trim().replace(/\s+/g, ' ');
}

export interface TemplateNameValidationResult {
  valid: boolean;
  normalizedName: string;
  error?: string;
}

/**
 * Validates that a template name is non-empty, within length bounds, and unique (case-insensitive)
 * among existing templates.
 */
export function validateTemplateName(
  rawName: string | undefined | null,
  existingTemplates: Pick<ActionPlanTemplate, 'id' | 'name'>[],
  excludeTemplateId?: string
): TemplateNameValidationResult {
  const normalizedName = normalizeTemplateName(rawName);

  if (!normalizedName) {
    return { valid: false, normalizedName, error: 'Template Name is required.' };
  }
  if (normalizedName.length < TEMPLATE_NAME_MIN_LENGTH) {
    return {
      valid: false,
      normalizedName,
      error: `Template Name must be at least ${TEMPLATE_NAME_MIN_LENGTH} characters.`
    };
  }
  if (normalizedName.length > TEMPLATE_NAME_MAX_LENGTH) {
    return {
      valid: false,
      normalizedName,
      error: `Template Name must be ${TEMPLATE_NAME_MAX_LENGTH} characters or fewer.`
    };
  }

  const targetKey = normalizedName.toLowerCase();
  const conflict = existingTemplates.find(t => {
    if (excludeTemplateId && t.id === excludeTemplateId) return false;
    return normalizeTemplateName(t.name).toLowerCase() === targetKey;
  });

  if (conflict) {
    return {
      valid: false,
      normalizedName,
      error: `A template named "${conflict.name}" already exists. Please use a distinct name.`
    };
  }

  return { valid: true, normalizedName };
}

/**
 * Generates a unique "Copy of <name>" (or "Copy of <name> (N)") that does not collide
 * with any existing template name.
 */
export function generateUniqueTemplateCopyName(
  sourceName: string,
  existingTemplates: Pick<ActionPlanTemplate, 'id' | 'name'>[]
): string {
  const cleanSource = normalizeTemplateName(sourceName) || 'Template';
  const baseCopy = cleanSource.toLowerCase().startsWith('copy of ')
    ? cleanSource.replace(/\s+\(\d+\)$/, '')
    : `Copy of ${cleanSource}`;

  const existingKeys = new Set(
    existingTemplates.map(t => normalizeTemplateName(t.name).toLowerCase())
  );

  if (!existingKeys.has(baseCopy.toLowerCase())) {
    return baseCopy.slice(0, TEMPLATE_NAME_MAX_LENGTH);
  }

  let counter = 2;
  while (counter < 1000) {
    const suffix = ` (${counter})`;
    const candidate = `${baseCopy.slice(0, TEMPLATE_NAME_MAX_LENGTH - suffix.length)}${suffix}`;
    if (!existingKeys.has(candidate.toLowerCase())) {
      return candidate;
    }
    counter += 1;
  }

  return `${baseCopy.slice(0, TEMPLATE_NAME_MAX_LENGTH - 8)} (${Date.now().toString(36)})`;
}
