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
function loadInitialOptions(): SystemDropdownOption[] {
  try {
    const raw = localStorage.getItem(LS_SYSTEM_OPTIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return sanitizeOptionList(parsed);
      }
    }
  } catch (err) {
    console.warn('[OptionsService] Error loading localStorage options:', err);
  }
  return sanitizeOptionList([...INITIAL_DROPDOWN_OPTIONS]);
}

// Global reactive state of options
export const systemOptions = ref<SystemDropdownOption[]>(loadInitialOptions());

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
    const res = await fetch('/api/options', { credentials: 'include' });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        systemOptions.value = sanitizeOptionList(json.data);
        persistOptions();
      }
    }
  } catch (err) {
    // Backend offline / Vite dev mode, LocalStorage handles it seamlessly
  }
}

// Category Configuration Registry
export interface OptionCategoryConfig {
  key: SystemOptionCategory;
  name: string;
  description: string;
  badgeColor: string;
}

export const OPTION_CATEGORIES: OptionCategoryConfig[] = [
  { key: 'fund_source', name: 'Fund Sources', description: 'Sources of budget and institutional financing', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { key: 'college', name: 'Colleges & Units', description: 'Colleges, executive bodies, and unit designations', badgeColor: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'office', name: 'Offices & Acronyms', description: 'Administrative office codes and approving units', badgeColor: 'bg-purple-50 text-purple-700 border-purple-200' },
  { key: 'venue', name: 'Venues & Locations', description: 'Campus venues and reservation sites', badgeColor: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'department', name: 'Departments & Programs', description: 'Academic and operational departments', badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { key: 'activity_type', name: 'Activity Types', description: 'Activity format (In-Campus, Off-Campus, etc.)', badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { key: 'person_assigned', name: 'Person Assigned', description: 'Default committees, roles, and lead officers', badgeColor: 'bg-rose-50 text-rose-700 border-rose-200' },
  { key: 'fiscal_year', name: 'Fiscal Years', description: 'Operational fiscal year labels and targets', badgeColor: 'bg-sky-50 text-sky-700 border-sky-200' },
  { key: 'org_category', name: 'Organization Categories', description: 'Student organization classifications', badgeColor: 'bg-teal-50 text-teal-700 border-teal-200' },
  { key: 'timeframe', name: 'Timeframe Months', description: 'Months and semester timing choices', badgeColor: 'bg-orange-50 text-orange-700 border-orange-200' },
  { key: 'rating', name: 'Accomplishment Ratings', description: 'Performance rating scale for accomplishment forms', badgeColor: 'bg-violet-50 text-violet-700 border-violet-200' },
  { key: 'other', name: 'Other Configurable Choices', description: 'Miscellaneous system options', badgeColor: 'bg-slate-50 text-slate-700 border-slate-200' }
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
  organizations: StudentOrganization[] = []
): { count: number; details: string[] } {
  if (!value) return { count: 0, details: [] };
  const valNorm = value.trim().toLowerCase();
  const details: string[] = [];
  let count = 0;

  if (category === 'fund_source') {
    activities.forEach(a => {
      const fs = (a.fundSource || '').trim().toLowerCase();
      const bFs = (a.designForm?.budgetSource || '').trim().toLowerCase();
      if (fs === valNorm || bFs === valNorm || fs.includes(valNorm) || bFs.includes(valNorm)) {
        count++;
        if (details.length < 3) details.push(`Activity: "${a.title}"`);
      }
    });
  } else if (category === 'venue') {
    activities.forEach(a => {
      const v = (a.venue || a.designForm?.venue || '').trim().toLowerCase();
      if (v === valNorm || v.includes(valNorm)) {
        count++;
        if (details.length < 3) details.push(`Activity: "${a.title}"`);
      }
    });
  } else if (category === 'department') {
    activities.forEach(a => {
      const d = (a.designForm?.department || a.accomplishmentForm?.department || '').trim().toLowerCase();
      if (d === valNorm || d.includes(valNorm)) {
        count++;
        if (details.length < 3) details.push(`Activity: "${a.title}"`);
      }
    });
  } else if (category === 'college') {
    activities.forEach(a => {
      const c = (a.designForm?.unitCollege || a.accomplishmentForm?.unitCollege || '').trim().toLowerCase();
      if (c === valNorm || c.includes(valNorm)) {
        count++;
        if (details.length < 3) details.push(`Activity: "${a.title}"`);
      }
    });
    organizations.forEach(o => {
      const c = ((o as any).college || o.name || '').trim().toLowerCase();
      if (c === valNorm || c.includes(valNorm)) {
        count++;
        if (details.length < 3) details.push(`Org: "${o.name}"`);
      }
    });
  } else if (category === 'office') {
    activities.forEach(a => {
      const off = (a.office || a.orgId || '').trim().toLowerCase();
      if (off === valNorm) {
        count++;
        if (details.length < 3) details.push(`Activity: "${a.title}"`);
      }
    });
    organizations.forEach(o => {
      const off = (o.acronym || o.id || '').trim().toLowerCase();
      if (off === valNorm) {
        count++;
        if (details.length < 3) details.push(`Org: "${o.acronym}"`);
      }
    });
  } else if (category === 'activity_type') {
    activities.forEach(a => {
      const t = ((a as any).activityType || a.designForm?.activityType || '').trim().toLowerCase();
      if (t === valNorm) {
        count++;
        if (details.length < 3) details.push(`Activity: "${a.title}"`);
      }
    });
  } else if (category === 'person_assigned') {
    activities.forEach(a => {
      const p = (a.personAssigned || '').trim().toLowerCase();
      if (p === valNorm || p.includes(valNorm)) {
        count++;
        if (details.length < 3) details.push(`Activity: "${a.title}"`);
      }
    });
  } else if (category === 'fiscal_year') {
    activities.forEach(a => {
      const fy = (a.fiscalYear || '').trim().toLowerCase();
      if (fy === valNorm || fy.includes(valNorm)) {
        count++;
        if (details.length < 3) details.push(`Activity: "${a.title}"`);
      }
    });
  } else if (category === 'org_category') {
    organizations.forEach(o => {
      const cat = ((o as any).category || o.nature || '').trim().toLowerCase();
      if (cat === valNorm || cat.includes(valNorm)) {
        count++;
        if (details.length < 3) details.push(`Org: "${o.name}"`);
      }
    });
  }

  return { count, details };
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
        dup.isActive = true;
        dup.updatedAt = new Date().toISOString();
        persistOptions();
        fetch(`/api/options/${dup.id}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dup)
        }).catch(() => {});
        return dup;
      }
      throw new Error(`An option named "${label}" already exists in ${category}.`);
    }
  }

  const now = new Date().toISOString();
  let savedOption: SystemDropdownOption;

  if (existingIdx !== -1) {
    const current = systemOptions.value[existingIdx];
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

    fetch(`/api/options/${savedOption.id}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(savedOption)
    }).catch(err => console.warn('[OptionsService] API update sync:', err));
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

    fetch('/api/options', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(savedOption)
    }).catch(err => console.warn('[OptionsService] API create sync:', err));
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

  opt.isActive = !opt.isActive;
  opt.updatedAt = new Date().toISOString();
  persistOptions();

  fetch(`/api/options/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive: opt.isActive })
  }).catch(() => {});

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

  const usage = countOptionUsage(opt.category, opt.value, activities, organizations);
  if (usage.count > 0) {
    return {
      success: false,
      message: `"${opt.label}" is currently referenced by ${usage.count} record(s) (${usage.details.join(', ')}). To protect historical action plans, please deactivate it instead of deleting.`
    };
  }

  systemOptions.value.splice(idx, 1);
  persistOptions();

  fetch(`/api/options/${id}`, { method: 'DELETE', credentials: 'include' }).catch(() => {});
  return { success: true };
}

/**
 * Reorder options within a category
 */
export async function reorderDropdownOptions(category: string, orderedIds: string[]): Promise<void> {
  orderedIds.forEach((id, idx) => {
    const opt = systemOptions.value.find(o => o.id === id && o.category === category);
    if (opt) {
      opt.order = idx + 1;
      opt.updatedAt = new Date().toISOString();
    }
  });

  persistOptions();

  fetch('/api/options/reorder', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category, orderedIds })
  }).catch(() => {});
}

// Automatically sync on initial module import
syncOptionsWithBackend();

