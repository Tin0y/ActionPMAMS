export interface StoredDraft<T> {
  data: T;
  savedAt: string;
}

const DRAFT_PREFIX = 'apmams_draft_v1';

/**
 * Builds a deterministic, user-scoped localStorage key so unsaved form drafts
 * survive browser restarts without colliding across accounts or records.
 */
export function buildDraftKey(
  userId: string | undefined | null,
  formType: string,
  entityId?: string | null
): string {
  const cleanUser = (userId || 'guest').trim().replace(/[^A-Za-z0-9_-]/g, '_');
  const cleanForm = formType.trim().replace(/[^A-Za-z0-9_-]/g, '_');
  const cleanEntity = (entityId || 'default').trim().replace(/[^A-Za-z0-9_-]/g, '_');
  return `${DRAFT_PREFIX}:${cleanUser}:${cleanForm}:${cleanEntity}`;
}

export function loadLocalDraft<T>(key: string): StoredDraft<T> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDraft<T>;
    if (!parsed || typeof parsed !== 'object' || !('data' in parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveLocalDraft<T>(key: string, data: T): string | null {
  const savedAt = new Date().toISOString();
  try {
    const payload: StoredDraft<T> = { data, savedAt };
    localStorage.setItem(key, JSON.stringify(payload));
    return savedAt;
  } catch {
    return null;
  }
}

export function clearLocalDraft(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage access failures
  }
}

export function formatDraftTime(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Creates a debounced auto-save controller that flushes any pending draft
 * synchronously on pagehide / beforeunload so rapid refreshes never drop edits.
 */
export function createDraftAutosaveController<T>(
  getKey: () => string,
  getSnapshot: () => T,
  onSaved?: (savedAt: string) => void,
  delayMs = 500
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let dirty = false;

  const flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (!dirty) return;
    const savedAt = saveLocalDraft(getKey(), getSnapshot());
    dirty = false;
    if (savedAt && onSaved) {
      onSaved(savedAt);
    }
  };

  const schedule = () => {
    dirty = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, delayMs);
  };

  const cancel = () => {
    dirty = false;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const onUnload = () => {
    if (dirty) flush();
  };

  window.addEventListener('beforeunload', onUnload);
  window.addEventListener('pagehide', onUnload);

  const destroy = () => {
    cancel();
    window.removeEventListener('beforeunload', onUnload);
    window.removeEventListener('pagehide', onUnload);
  };

  return { schedule, flush, cancel, destroy };
}
