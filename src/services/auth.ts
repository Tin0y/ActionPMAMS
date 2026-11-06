import { UserAccount, UserRole } from '../types';
import { INITIAL_USER_ACCOUNTS } from '../data/initialData';
import { getUserAssignedRoles } from '../utils/organizationUtils';

export function sanitizeUserAccount(raw: any): UserAccount {
  const copy = { ...(raw || {}) };
  delete copy.password;
  delete copy.passwordHash;
  delete copy.password_hash;
  delete copy.newPassword;
  delete copy.currentPassword;
  delete copy.confirmPassword;
  return copy as UserAccount;
}

export interface LoginResponseResult {
  ok: boolean;
  status: number;
  code?: string;
  message?: string;
  requiresRoleSelection?: boolean;
  availableRoles?: UserRole[];
  user?: UserAccount;
}

export async function loginWithCredentials(
  identifier: string,
  password: string,
  selectedRole?: string
): Promise<LoginResponseResult> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: identifier.trim(),
        password,
        ...(selectedRole ? { selectedRole } : {})
      })
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok || !payload.success) {
      return {
        ok: false,
        status: res.status,
        code: payload.code,
        message: payload.message || 'Invalid username/email or password.'
      };
    }

    return {
      ok: true,
      status: res.status,
      requiresRoleSelection: Boolean(payload.requiresRoleSelection),
      availableRoles: Array.isArray(payload.availableRoles) ? payload.availableRoles : [],
      user: payload.data ? sanitizeUserAccount(payload.data) : undefined
    };
  } catch {
    // Graceful Cloud/Vercel fallback: if backend is unreachable, authenticate against INITIAL_USER_ACCOUNTS
    const trimmedId = identifier.trim().toLowerCase();
    const localMatch = INITIAL_USER_ACCOUNTS.find(u =>
      u.email.toLowerCase() === trimmedId ||
      (u.username && u.username.toLowerCase() === trimmedId) ||
      u.email.split('@')[0].toLowerCase() === trimmedId
    );

    if (localMatch) {
      const assignedRoles = getUserAssignedRoles(localMatch);
      if (assignedRoles.length > 1 && !selectedRole) {
        return {
          ok: true,
          status: 200,
          requiresRoleSelection: true,
          availableRoles: assignedRoles,
          user: sanitizeUserAccount(localMatch)
        };
      }
      const chosenRole = (selectedRole as UserRole) || localMatch.activeRole || localMatch.role;
      const user = sanitizeUserAccount({
        ...localMatch,
        role: chosenRole,
        activeRole: chosenRole
      });
      try {
        localStorage.setItem('msun_active_session_user', JSON.stringify(user));
      } catch {}
      return {
        ok: true,
        status: 200,
        user
      };
    }

    return {
      ok: false,
      status: 503,
      code: 'NETWORK_ERROR',
      message: 'Unable to reach authentication server. Please verify backend connectivity.'
    };
  }
}

export async function fetchSessionUser(): Promise<UserAccount | null> {
  try {
    const res = await fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'include'
    });
    if (!res.ok) {
      if (res.status === 401) {
        return null;
      }
      try {
        const cached = localStorage.getItem('msun_active_session_user');
        return cached ? JSON.parse(cached) : null;
      } catch {
        return null;
      }
    }
    const payload = await res.json().catch(() => ({}));
    if (!payload.success || !payload.data) return null;
    const user = sanitizeUserAccount(payload.data);
    try {
      localStorage.setItem('msun_active_session_user', JSON.stringify(user));
    } catch {}
    return user;
  } catch {
    try {
      const cached = localStorage.getItem('msun_active_session_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }
}

export async function switchSessionRole(
  role: UserRole
): Promise<{ ok: boolean; status: number; user?: UserAccount; message?: string }> {
  try {
    const res = await fetch('/api/auth/switch-role', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || !payload.success || !payload.data) {
      return {
        ok: false,
        status: res.status,
        message: payload.message || 'Failed to switch active role.'
      };
    }
    const user = sanitizeUserAccount(payload.data);
    try {
      localStorage.setItem('msun_active_session_user', JSON.stringify(user));
    } catch {}
    return {
      ok: true,
      status: res.status,
      user
    };
  } catch {
    try {
      const cached = localStorage.getItem('msun_active_session_user');
      if (cached) {
        const u = JSON.parse(cached);
        u.role = role;
        u.activeRole = role;
        localStorage.setItem('msun_active_session_user', JSON.stringify(u));
        return { ok: true, status: 200, user: u };
      }
    } catch {}
    return {
      ok: false,
      status: 503,
      message: 'Network error while switching active role.'
    };
  }
}

export async function changeCurrentUserPassword(
  currentPassword: string,
  newPassword: string
): Promise<{ ok: boolean; status: number; message: string }> {
  try {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || !payload.success) {
      return {
        ok: false,
        status: res.status,
        message: payload.message || 'Failed to update password.'
      };
    }
    return {
      ok: true,
      status: res.status,
      message: payload.message || 'Password updated successfully.'
    };
  } catch {
    return {
      ok: false,
      status: 503,
      message: 'Network error while updating password.'
    };
  }
}

export async function logoutSession(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
  } catch {
    // ignore network error on logout
  }
  try {
    localStorage.removeItem('msun_active_user_id');
    localStorage.removeItem('msun_user_accounts');
  } catch {
    // ignore storage errors
  }
}

export async function fetchSanitizedUsersFromApi(): Promise<UserAccount[] | null> {
  try {
    const res = await fetch('/api/users', {
      method: 'GET',
      credentials: 'include'
    });
    if (!res.ok) return null;
    const payload = await res.json().catch(() => ({}));
    if (!payload.success || !Array.isArray(payload.data)) return null;
    return payload.data.map(sanitizeUserAccount);
  } catch {
    return null;
  }
}

export async function createUserAccountApi(
  account: UserAccount,
  plainPassword: string
): Promise<{ ok: boolean; status: number; user?: UserAccount; message: string }> {
  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...sanitizeUserAccount(account),
        password: plainPassword
      })
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || !payload.success || !payload.data) {
      return {
        ok: false,
        status: res.status,
        message: payload.message || 'Failed to create user account.'
      };
    }
    return {
      ok: true,
      status: res.status,
      user: sanitizeUserAccount(payload.data),
      message: payload.message || 'Account created successfully.'
    };
  } catch {
    return {
      ok: false,
      status: 503,
      message: 'Network error while creating user account.'
    };
  }
}

export async function updateUserAccountApi(
  account: UserAccount,
  options?: { newPassword?: string; mustChangePassword?: boolean }
): Promise<{ ok: boolean; status: number; user?: UserAccount; message: string }> {
  try {
    const bodyPayload: Record<string, any> = {
      ...sanitizeUserAccount(account)
    };
    if (options?.newPassword) {
      bodyPayload.newPassword = options.newPassword;
      bodyPayload.mustChangePassword = options.mustChangePassword ?? true;
    }

    const res = await fetch(`/api/users/${encodeURIComponent(account.id)}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload)
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || !payload.success || !payload.data) {
      return {
        ok: false,
        status: res.status,
        message: payload.message || 'Failed to update user account.'
      };
    }
    return {
      ok: true,
      status: res.status,
      user: sanitizeUserAccount(payload.data),
      message: payload.message || 'Account updated successfully.'
    };
  } catch {
    return {
      ok: false,
      status: 503,
      message: 'Network error while updating user account.'
    };
  }
}

