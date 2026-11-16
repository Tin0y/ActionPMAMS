import type { BudgetLineItem } from '../types';

/**
 * Strips numeric quantity × unit cost = total calculation formulas from a
 * line item budget label so only item names remain.
 * Example: "papel: 1 × ₱200.00 = ₱200.00" -> "papel"
 */
export function stripBudgetFormulaSuffix(text: string): string {
  if (!text) return '';
  return text
    .replace(/:\s*\d+(?:\.\d+)?\s*[×x*]\s*(?:₱|PHP\s*)?[\d,]+(?:\.\d+)?\s*=\s*(?:₱|PHP\s*)?[\d,]+(?:\.\d+)?/gi, '')
    .trim();
}

/**
 * Formats an activity's Line Item Budget string using item names/descriptions
 * only, without numeric calculation formulas.
 */
export function formatLineItemBudgetText(
  lineItems?: BudgetLineItem[],
  rawLineItemBudget?: string,
  isZeroBudget?: boolean
): string {
  if (isZeroBudget) {
    return 'N/A (Zero-budget activity)';
  }

  if (Array.isArray(lineItems) && lineItems.length > 0) {
    const names = lineItems
      .map(item => stripBudgetFormulaSuffix(item.description || ''))
      .flatMap(clean => clean.split(/[;\n]+/).map(part => part.trim()))
      .filter(Boolean);
    if (names.length > 0) {
      return names.join(', ');
    }
  }

  if (rawLineItemBudget && rawLineItemBudget.trim()) {
    const parts = rawLineItemBudget
      .split(/[;\n]+/)
      .map(part => stripBudgetFormulaSuffix(part))
      .filter(Boolean);
    if (parts.length > 0) {
      return parts.join(', ');
    }
    return rawLineItemBudget.trim();
  }

  return '';
}
