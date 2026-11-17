import { ref, computed } from 'vue';
import { SystemDropdownOption, SystemOptionCategory, Activity, StudentOrganization } from '../types';
import { INITIAL_DROPDOWN_OPTIONS } from '../data/initialData';

const LS_SYSTEM_OPTIONS = 'msun_system_dropdown_options';

// Sanitize legacy or removed options (e.g. OSA is no longer part of the system)
function sanitizeOptionList(list: SystemDropdownOption[]): SystemDropdownOption[] {
  return list.filter(o => {
    if (!o) return false;
    if (o.id === 'opt_off_3') return false;
    if ((o.value || '').trim().toUpperCase() === 'OSA') return false;
    if ((o.label || '').trim().toUpperCase() === 'OSA') return false;
    return true;
  });
}

// Read from LocalStorage or initialize with defaults
const LS_WEEK_SEED_FLAG = 'msun_options_seed_timeframe_week_v1';

function ensureSeededCategories(list: SystemDropdownOption[]): { options: SystemDropdownOption[]; changed: boolean } {
  const result = [...list];
  let changed = false;

  const hasWeekOptions = result.some(o => o.category === 'timeframe_week');
  let alreadyMigrated = false;
  if (typeof localStorage !== 'undefined') {
    try {
      alreadyMigrated = localStorage.getItem(LS_WEEK_SEED_FLAG) === '1';
    } catch {}
  }

  if (!hasWeekOptions && !alreadyMigrated) {
    const weekSeeds = INITIAL_DROPDOWN_OPTIONS.filter(o => o.category === 'timeframe_week');
    const existingIds = new Set(result.map(o => o.id));
    weekSeeds.forEach(seed => {
      if (!existingIds.has(seed.id)) {
        result.push({ ...seed });
        changed = true;
      }
    });
  }

  if ((hasWeekOptions || changed) && !alreadyMigrated && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(LS_WEEK_SEED_FLAG, '1');
    } catch {}
  }

  // Ensure activity_type defaults (especially Off-Campus) are seeded if missing
  const actSeeds = INITIAL_DROPDOWN_OPTIONS.filter(o => o.category === 'activity_type');
  const existingIds = new Set(result.map(o => o.id));
  const existingActValues = new Set(result.filter(o => o.category === 'activity_type').map(o => (o.value || '').trim().toLowerCase()));
  actSeeds.forEach(seed => {
    if (!existingIds.has(seed.id) && !existingActValues.has((seed.value || '').trim().toLowerCase())) {
      result.push({ ...seed });
      changed = true;
    }
  });

  return { options: result, changed };
}

function loadInitialOptions(): SystemDropdownOption[] {
  try {
    const raw = localStorage.getItem(LS_SYSTEM_OPTIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const sanitized = sanitizeOptionList(parsed);
        const { options, changed } = ensureSeededCategories(sanitized);
        if (changed) {
          try {
            localStorage.setItem(LS_SYSTEM_OPTIONS, JSON.stringify(options));
          } catch {}
        }
        return options;
      }
    }
  } catch (err) {
    console.warn('[OptionsService] Error loading localStorage options:', err);
  }
  return sanitizeOptionList([...INITIAL_DROPDOWN_OPTIONS]);
}

// Global reactive state of options
export const systemOptions = ref<SystemDropdownOption[]>(loadInitialOptions());
export const isOptionsBackendSynced = ref<boolean>(true);

// Ensure clean state in localStorage on startup
try {
  systemOptions.value = sanitizeOptionList(systemOptions.value);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(LS_SYSTEM_OPTIONS, JSON.stringify(systemOptions.value));
  }
} catch (e) {
  // Ignore in SSR/testing
}

// Persist to LocalStorage
function persistOptions() {
  try {
    systemOptions.value = sanitizeOptionList(systemOptions.value);
    localStorage.setItem(LS_SYSTEM_OPTIONS, JSON.stringify(systemOptions.value));
  } catch (err) {
    console.warn('[OptionsService] Error saving to localStorage:', err);
  }
}

// Fetch from API in background on startup
export async function syncOptionsWithBackend(): Promise<void> {
  try {
    const res = await fetch('/api/options', { credentials: 'include', cache: 'no-store' });
    if (res.ok) {
      isOptionsBackendSynced.value = true;
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const sanitized = sanitizeOptionList(json.data);
        const { options } = ensureSeededCategories(sanitized);
        systemOptions.value = options;
        persistOptions();
      }
    } else if (res.status === 404 || res.status === 502 || res.status === 503) {
      isOptionsBackendSynced.value = false;
    }
  } catch (err) {
    // Backend offline / Vite dev mode, LocalStorage handles it seamlessly
    if (err instanceof TypeError) {
      isOptionsBackendSynced.value = false;
    }
  }
}

// Category Configuration Registry
export interface OptionCategoryConfig {
  key: SystemOptionCategory;
  name: string;
  description: string;
  badgeColor: string;
}

const CONSISTENT_CATEGORY_BADGE = 'bg-blue-50 text-blue-800 border-blue-200';

export const OPTION_CATEGORIES: OptionCategoryConfig[] = [
  { key: 'fund_source', name: 'Fund Sources', description: 'Sources of budget and institutional financing', badgeColor: CONSISTENT_CATEGORY_BADGE },
  { key: 'college', name: 'Colleges & Units', description: 'Colleges, executive bodies, and unit designations', badgeColor: CONSISTENT_CATEGORY_BADGE },
  { key: 'office', name: 'Offices & Acronyms', description: 'Administrative office codes and approving units', badgeColor: CONSISTENT_CATEGORY_BADGE },
  { key: 'venue', name: 'Venues & Locations', description: 'Campus venues and reservation sites', badgeColor: CONSISTENT_CATEGORY_BADGE },
  { key: 'department', name: 'Departments & Programs', description: 'Academic and operational departments', badgeColor: CONSISTENT_CATEGORY_BADGE },
  { key: 'activity_type', name: 'Activity Types', description: 'Activity format (In-Campus, Off-Campus, etc.)', badgeColor: CONSISTENT_CATEGORY_BADGE },
  { key: 'person_assigned', name: 'Person Assigned', description: 'Default committees, roles, and lead officers', badgeColor: CONSISTENT_CATEGORY_BADGE },
  { key: 'fiscal_year', name: 'Fiscal Years', description: 'Operational fiscal year labels and targets', badgeColor: CONSISTENT_CATEGORY_BADGE },
  { key: 'org_category', name: 'Organization Categories', description: 'Student organization classifications', badgeColor: CONSISTENT_CATEGORY_BADGE },
  { key: 'timeframe', name: 'Timeframe Months', description: 'Months and semester timing choices', badgeColor: CONSISTENT_CATEGORY_BADGE },
  { key: 'timeframe_week', name: 'Timeframe Weeks', description: 'Weekly and period timing choices for Action Plan', badgeColor: CONSISTENT_CATEGORY_BADGE },
  { key: 'rating', name: 'Accomplishment Ratings', description: 'Performance rating scale for accomplishment forms', badgeColor: CONSISTENT_CATEGORY_BADGE },
  { key: 'other', name: 'Other Configurable Choices', description: 'Miscellaneous system options', badgeColor: CONSISTENT_CATEGORY_BADGE }
];

/**
 * Returns reactive options for a specific category
 */
export function getOptionsByCategory(category: string, activeOnly = false) {
  return computed(() => {
    let list = systemOptions.value.filter(o => o.category === category);
    if (activeOnly) {
      list = list.filter(o => o.isActive !== false);
    }
    return list.sort((a, b) => (a.order - b.order) || a.label.localeCompare(b.label));
  });
}

/**
 * Returns string labels for quick use in datalists or selects
 */
export function getOptionLabelsByCategory(category: string, activeOnly = true) {
  return computed(() => {
    const list = getOptionsByCategory(category, activeOnly).value;
    return list.map(o => o.label);
  });
}

/**
 * Calculate where an option is referenced in existing activities or organizations
 */
export function countOptionUsage(
  category: string, 
  value: string, 
  activities: Activity[], 
  organizations: StudentOrganization[] = [],
  label?: string
): { count: number; details: string[] } {
  const valNorm = (value || '').trim().toLowerCase();
  const labelNorm = (label || '').trim().toLowerCase();
  if (!valNorm && !labelNorm) return { count: 0, details: [] };

  const matchesExact = (candidate?: string | null): boolean => {
    const norm = (candidate || '').trim().toLowerCase();
    if (!norm) return false;
    return (Boolean(valNorm) && norm === valNorm) || (Boolean(labelNorm) && norm === labelNorm);
  };

  const details: string[] = [];
  let count = 0;

  if (category === 'fund_source') {
    activities.forEach(a => {
      if (matchesExact(a.fundSource) || matchesExact(a.designForm?.budgetSource)) {
        count++;
        if (details.length < 3) details.push(`Activity: "${a.title}"`);
      }
    });
  } else if (category === 'venue') {
    activities.forEach(a => {
      if (matchesExact(a.venue) || matchesExact(a.designForm?.venue)) {
        count++;
        if (details.length < 3) details.push(`Activity: "${a.title}"`);
      }
    });
  } else if (category === 'department') {
    activities.forEach(a => {
      if (matchesExact(a.designForm?.department) || matchesExact(a.accomplishmentForm?.department)) {
        count++;
        if (details.length < 3) details.push(`Activity: "${a.title}"`);
      }
    });
  } else if (category === 'college') {
    activities.forEach(a => {
      if (matchesExact(a.designForm?.unitCollege) || matchesExact(a.accomplishmentForm?.unitCollege)) {
        count++;
        if (details.length < 3) details.push(`Activity: "${a.title}"`);
      }
    });
    organizations.forEach(o => {
      if (matchesExact((o as any).college) || matchesExact(o.name)) {
        count++;
        if (details.length < 3) details.push(`Org: "${o.name}"`);
      }
    });
  } else if (category === 'office') {
    activities.forEach(a => {
      if (matchesExact(a.office) || matchesExact(a.orgId)) {
        count++;
        if (details.length < 3) details.push(`Activity: "${a.title}"`);
      }
    });
    organizations.forEach(o => {
      if (matchesExact(o.acronym) || matchesExact(o.id)) {
        count++;
        if (details.length < 3) details.push(`Org: "${o.acronym}"`);
      }
    });
  } else if (category === 'activity_type') {
    activities.forEach(a => {
      if (matchesExact((a as any).activityType) || matchesExact(a.designForm?.activityType)) {
        count++;
        if (details.length < 3) details.push(`Activity: "${a.title}"`);
      }
    });
  } else if (category === 'person_assigned') {
    activities.forEach(a => {
      if (matchesExact(a.personAssigned)) {
        count++;
        if (details.length < 3) details.push(`Activity: "${a.title}"`);
      }
    });
  } else if (category === 'fiscal_year') {
    activities.forEach(a => {
      if (matchesExact(a.fiscalYear)) {
        count++;
        if (details.length < 3) details.push(`Activity: "${a.title}"`);
      }
    });
  } else if (category === 'org_category') {
    organizations.forEach(o => {
      if (matchesExact((o as any).category) || matchesExact(o.nature)) {
        count++;
        if (details.length < 3) details.push(`Org: "${o.name}"`);
      }
    });
  } else if (category === 'timeframe') {
    activities.forEach(a => {
      if (matchesExact(a.timeframeMonth)) {
        count++;
        if (details.length < 3) details.push(`Activity: "${a.title}"`);
      }
    });
  } else if (category === 'timeframe_week') {
    activities.forEach(a => {
      if (matchesExact(a.timeframeWeek)) {
        count++;
        if (details.length < 3) details.push(`Activity: "${a.title}"`);
      }
    });
  }

  return { count, details };
}

/**
 * Sync an option mutation with the backend REST API when available.
 * Rejects on real backend validation/auth failures so state can roll back;
 * allows offline/static preview fallback when no backend endpoint responds.
 */
async function syncOptionMutation(url: string, init: RequestInit): Promise<void> {
  try {
    const res = await fetch(url, {
      credentials: 'include',
      ...init
    });
    if (res.ok) {
      isOptionsBackendSynced.value = true;
      return;
    }
    if (res.status === 404 || res.status === 502 || res.status === 503) {
      isOptionsBackendSynced.value = false;
      return;
    }
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      message = data?.error || data?.message || message;
    } catch {
      // Ignore JSON parse errors on plain-text error responses
    }
    throw new Error(message);
  } catch (err: any) {
    // Re-throw explicit HTTP rejections, but fall back cleanly if offline/serverless
    if (err instanceof TypeError) {
      isOptionsBackendSynced.value = false;
      console.warn('[OptionsService] Backend unreachable, persisted locally:', err.message);
      return;
    }
    throw err;
  }
}

/**
 * Add or update an option
 */
export async function saveDropdownOption(opt: Partial<SystemDropdownOption>): Promise<SystemDropdownOption> {
  const label = (opt.label || '').trim();
  const value = (opt.value || opt.label || '').trim();
  const category = (opt.category || 'other').trim() as SystemOptionCategory;

  if (!label) {
    throw new Error('Option name/label is required');
  }

  const existingIdx = opt.id 
    ? systemOptions.value.findIndex(o => o.id === opt.id)
    : -1;

  // Duplicate check for new options in same category
  if (existingIdx === -1) {
    const dup = systemOptions.value.find(
      o => o.category === category && o.label.toLowerCase() === label.toLowerCase()
    );
    if (dup) {
      // If previously deactivated, reactivate it
      if (!dup.isActive) {
        const prevUpdatedAt = dup.updatedAt;
        dup.isActive = true;
        dup.updatedAt = new Date().toISOString();
        try {
          await syncOptionMutation(`/api/options/${dup.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dup)
          });
        } catch (err) {
          dup.isActive = false;
          dup.updatedAt = prevUpdatedAt;
          throw err;
        }
        persistOptions();
        return dup;
      }
      throw new Error(`An option named "${label}" already exists in ${category}.`);
    }
  }

  const now = new Date().toISOString();
  let savedOption: SystemDropdownOption;

  if (existingIdx !== -1) {
    const current = systemOptions.value[existingIdx];
    const snapshot = { ...current };
    savedOption = {
      ...current,
      ...opt,
      id: current.id,
      label,
      value,
      category,
      isSystemProtected: current.isSystemProtected,
      updatedAt: now
    };
    systemOptions.value[existingIdx] = savedOption;

    try {
      await syncOptionMutation(`/api/options/${savedOption.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savedOption)
      });
    } catch (err) {
      systemOptions.value[existingIdx] = snapshot;
      throw err;
    }
  } else {
    const maxOrder = systemOptions.value
      .filter(o => o.category === category)
      .reduce((max, cur) => Math.max(max, cur.order || 0), 0);

    savedOption = {
      id: opt.id || `opt_${category}_${Date.now().toString(36)}`,
      category,
      label,
      value,
      description: opt.description || '',
      order: opt.order ?? (maxOrder + 1),
      isActive: opt.isActive !== false,
      isSystemProtected: Boolean(opt.isSystemProtected),
      metadata: opt.metadata || {},
      createdAt: now,
      updatedAt: now
    };

    systemOptions.value.push(savedOption);

    try {
      await syncOptionMutation('/api/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savedOption)
      });
    } catch (err) {
      const rollbackIdx = systemOptions.value.findIndex(o => o.id === savedOption.id);
      if (rollbackIdx !== -1) systemOptions.value.splice(rollbackIdx, 1);
      throw err;
    }
  }

  persistOptions();
  return savedOption;
}

/**
 * Toggle Active status
 */
export async function toggleDropdownOptionActive(id: string): Promise<SystemDropdownOption | null> {
  const opt = systemOptions.value.find(o => o.id === id);
  if (!opt) return null;

  const prevActive = opt.isActive;
  const prevUpdatedAt = opt.updatedAt;
  opt.isActive = !opt.isActive;
  opt.updatedAt = new Date().toISOString();

  try {
    await syncOptionMutation(`/api/options/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: opt.isActive })
    });
  } catch (err) {
    opt.isActive = prevActive;
    opt.updatedAt = prevUpdatedAt;
    throw err;
  }

  persistOptions();
  return opt;
}

/**
 * Delete option (with protection & usage check)
 */
export async function deleteDropdownOption(
  id: string, 
  activities: Activity[] = [], 
  organizations: StudentOrganization[] = []
): Promise<{ success: boolean; message?: string }> {
  const idx = systemOptions.value.findIndex(o => o.id === id);
  if (idx === -1) return { success: false, message: 'Option not found' };

  const opt = systemOptions.value[idx];

  if (opt.isSystemProtected) {
    return {
      success: false,
      message: `"${opt.label}" is a protected system option and cannot be deleted.`
    };
  }

  const usage = countOptionUsage(opt.category, opt.value, activities, organizations, opt.label);
  if (usage.count > 0) {
    return {
      success: false,
      message: `"${opt.label}" is currently referenced by ${usage.count} record(s) (${usage.details.join(', ')}). To protect historical action plans, please deactivate it instead of deleting.`
    };
  }

  const deletedSnapshot = { ...opt };
  systemOptions.value.splice(idx, 1);

  try {
    await syncOptionMutation(`/api/options/${id}`, { method: 'DELETE' });
  } catch (err: any) {
    systemOptions.value.splice(idx, 0, deletedSnapshot);
    return { success: false, message: err?.message || 'Failed to delete option.' };
  }

  persistOptions();
  return { success: true };
}

/**
 * Reorder options within a category
 */
export async function reorderDropdownOptions(category: string, orderedIds: string[]): Promise<void> {
  const previousOrders = new Map<string, { order: number; updatedAt?: string }>();
  systemOptions.value.forEach(opt => {
    if (opt.category === category) {
      previousOrders.set(opt.id, { order: opt.order, updatedAt: opt.updatedAt });
    }
  });

  orderedIds.forEach((id, idx) => {
    const opt = systemOptions.value.find(o => o.id === id && o.category === category);
    if (opt) {
      opt.order = idx + 1;
      opt.updatedAt = new Date().toISOString();
    }
  });

  try {
    await syncOptionMutation('/api/options/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, orderedIds })
    });
  } catch (err) {
    systemOptions.value.forEach(opt => {
      const prev = previousOrders.get(opt.id);
      if (prev) {
        opt.order = prev.order;
        opt.updatedAt = prev.updatedAt;
      }
    });
    throw err;
  }

  persistOptions();
}

// Automatically sync on initial module import
syncOptionsWithBackend();

