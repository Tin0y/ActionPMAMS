import { executeRawSql, sqlEscape } from '../database';
import type { UserAccount } from '../../src/types';

export interface AuditLogInput {
  actor?: Partial<UserAccount> | null;
  appUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, any> | null;
  ipAddress?: string | null;
}

/**
 * Records an immutable audit trail entry into apmams.audit_logs.
 * Resolves the numeric users.user_id from app_user_id when available.
 */
export async function recordAuditLog(entry: AuditLogInput): Promise<void> {
  const appUserId = (entry.actor?.id || entry.appUserId || '').trim() || null;
  const userLookup = appUserId
    ? `(SELECT user_id FROM apmams.users WHERE app_user_id = ${sqlEscape(appUserId)} LIMIT 1)`
    : 'NULL';

  const sql = `
    INSERT INTO apmams.audit_logs (
      user_id, app_user_id, action, entity_type, entity_id, details, ip_address
    ) VALUES (
      ${userLookup},
      ${appUserId ? sqlEscape(appUserId.slice(0, 50)) : 'NULL'},
      ${sqlEscape(entry.action.slice(0, 150))},
      ${sqlEscape(entry.entityType.slice(0, 100))},
      ${entry.entityId ? sqlEscape(String(entry.entityId).slice(0, 100)) : 'NULL'},
      ${entry.details ? sqlEscape(entry.details) : 'NULL'},
      ${entry.ipAddress ? sqlEscape(String(entry.ipAddress).slice(0, 100)) : 'NULL'}
    );
  `;

  try {
    await executeRawSql(sql);
  } catch (err: any) {
    console.warn('[AuditService] Failed to persist audit log:', err?.message || err);
  }
}
