import { ActionPlanTemplate } from '../types';

const getTemplateComparableSignature = (tpl: ActionPlanTemplate) => ({
  name: (tpl.name || '').trim(),
  description: tpl.description || '',
  headerTitle: tpl.headerTitle || '',
  headerSubTitle: tpl.headerSubTitle || '',
  headerColor: tpl.headerColor || '#800000',
  headerTextColor: tpl.headerTextColor || '#FFFFFF',
  subHeaderColor: tpl.subHeaderColor || '#FCE5CD',
  subHeaderTextColor: tpl.subHeaderTextColor || '#1E293B',
  footerLabel: tpl.footerLabel || '',
  budgetCalculationRule: tpl.budgetCalculationRule || 'SUM_ALL',
  allowTextWrap: tpl.allowTextWrap !== false,
  showBorders: tpl.showBorders !== false,
  columns: tpl.columns || []
});

/**
 * Returns true when editable template fields or columns differ from the persisted template.
 */
export function hasTemplateEdits(
  edited: ActionPlanTemplate,
  saved?: ActionPlanTemplate | null
): boolean {
  if (!saved) return true;
  return (
    JSON.stringify(getTemplateComparableSignature(edited)) !==
    JSON.stringify(getTemplateComparableSignature(saved))
  );
}

/**
 * Determines whether the Publish Template action should be active.
 * Unpublished templates (Draft/Archived) can always be published; already-Published templates
 * are only publishable if there are unsaved local edits to publish.
 */
export function canPublishTemplateState(
  edited: ActionPlanTemplate,
  saved?: ActionPlanTemplate | null
): boolean {
  if (edited.status !== 'Published') return true;
  if (saved && saved.status !== 'Published') return true;
  return hasTemplateEdits(edited, saved);
}

/**
 * Builds the payload for "Save Template": always saves with status "Draft" without bumping version.
 */
export function buildDraftTemplatePayload(
  edited: ActionPlanTemplate,
  existingSaved?: ActionPlanTemplate | null,
  now: string = new Date().toISOString()
): ActionPlanTemplate {
  const clone: ActionPlanTemplate = JSON.parse(JSON.stringify(edited));
  const version = existingSaved?.version || clone.version || 1;

  return {
    ...clone,
    name: (clone.name || '').trim(),
    version,
    status: 'Draft',
    updatedAt: now
  };
}

/**
 * Builds the payload for "Publish Template": sets status "Published" without bumping version.
 */
export function buildPublishedTemplatePayload(
  edited: ActionPlanTemplate,
  existingSaved?: ActionPlanTemplate | null,
  now: string = new Date().toISOString()
): ActionPlanTemplate {
  const clone: ActionPlanTemplate = JSON.parse(JSON.stringify(edited));
  const version = existingSaved?.version || clone.version || 1;

  return {
    ...clone,
    name: (clone.name || '').trim(),
    version,
    status: 'Published',
    updatedAt: now
  };
}
