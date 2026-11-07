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

    const contentType = res.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
      ? await res.json().catch(() => ({}))
      : {};

    if (!res.ok || !payload.success) {
      // If the backend is active and responded with a recognized credentials error (400, 401, 403, 429)
      if ((res.status === 400 || res.status === 401 || res.status === 403 || res.status === 429) && payload.code) {
        return {
          ok: false,
          status: res.status,
          code: payload.code,
          message: payload.message || 'Invalid username/email or password.'
        };
      }
      // On Vercel static deployments (404 Not Found) or network gateway failures:
      throw new Error('API_UNAVAILABLE');
    }

    return {
      ok: true,
      status: res.status,
      requiresRoleSelection: Boolean(payload.requiresRoleSelection),
      availableRoles: Array.isArray(payload.availableRoles) ? payload.availableRoles : [],
      user: payload.data ? sanitizeUserAccount(payload.data) : undefined
    };
  } catch {
    // Graceful Cloud/Vercel fallback: if backend is unreachable (e.g. Vercel static hosting),
    // authenticate against INITIAL_USER_ACCOUNTS with default institutional passwords.
    const trimmedId = identifier.trim().toLowerCase();
    const cleanPassword = password.trim();

    const pool = (() => {
      try {
        const raw = localStorage.getItem('msun_user_accounts');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const map = new Map<string, UserAccount>();
            INITIAL_USER_ACCOUNTS.forEach(u => map.set(u.id, u));
            parsed.forEach((u: UserAccount) => map.set(u.id, u));
            return Array.from(map.values());
          }
        }
      } catch {}
      return INITIAL_USER_ACCOUNTS;
    })();

    const localMatch = pool.find(u => {
      const studentId = (u.studentId || '').trim().toLowerCase();
      const emailLower = u.email.toLowerCase();
      const userLower = (u.username || '').toLowerCase();
      const prefixLower = emailLower.split('@')[0];
      if (studentId === trimmedId || emailLower === trimmedId || userLower === trimmedId || prefixLower === trimmedId) {
        return true;
      }
      // System Administrator aliases: 'admin', 'sys', 'sysad', 'system', '1021339'
      if ((trimmedId === 'sys' || trimmedId === 'sysad' || trimmedId === 'admin' || trimmedId === 'system' || trimmedId === '1021339') && 
          (u.role === 'ROLE_ADMIN' || u.orgId === 'ADMIN')) {
        return true;
      }
      // CBIT Org aliases: 'cbit.sec', 'cbit'
      if ((trimmedId === 'cbit.sec' || trimmedId === 'cbit') && u.email === 'cbit.org@msunaawan.edu.ph') {
        return true;
      }
      return false;
    });

    if (!localMatch) {
      return {
        ok: false,
        status: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid ID Number, username, or credentials. Please check your details and password.'
      };
    }

    // Default institutional testing password is 'admin123' (also accepts 'password123' or 'Password@2026')
    const isValidPassword = 
      cleanPassword === 'admin123' || 
      cleanPassword === 'password123' || 
      cleanPassword === 'Password@2026';

    if (!isValidPassword) {
      return {
        ok: false,
        status: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid password. Default password is: admin123'
      };
    }

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
      if (res.status === 404 || res.status === 405 || res.status >= 500) {
        throw new Error('API_UNAVAILABLE');
      }
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
    localStorage.removeItem('msun_active_session_user');
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

