import { UserAccount } from '../../src/types';
import { INITIAL_USER_ACCOUNTS } from '../../src/data/initialData';
import { query, executeRawSql, sqlEscape } from '../database';

export class UserRepository {
  private users: Map<string, UserAccount> = new Map();
  private isLoaded = false;

  constructor() {
    this.seedDefaults();
    this.loadFromDatabase().catch(err => {
      console.warn('[UserRepository] Failed initial DB load, using defaults:', err.message);
    });
  }

  private seedDefaults() {
    for (const u of INITIAL_USER_ACCOUNTS) {
      this.users.set(u.id, { ...u });
    }
  }

  public async loadFromDatabase(): Promise<void> {
    try {
      const rows = await query<any>(`
        SELECT 
          app_user_id as id,
          first_name || ' ' || last_name as name,
          first_name as "firstName",
          last_name as "lastName",
          email,
          avatar,
          role_code as role,
          org_id_code as "orgId",
          parent_org as "parentOrg",
          actual_org as "actualOrg",
          display_role as "displayRole",
          is_active as "isActive"
        FROM apmams.users
        ORDER BY user_id ASC;
      `);

      if (rows && rows.length > 0) {
        for (const row of rows) {
          const existing = this.users.get(row.id) || {} as UserAccount;
          this.users.set(row.id, {
            ...existing,
            ...row,
            id: row.id || existing.id,
            name: row.name || existing.name,
            email: row.email || existing.email,
            role: row.role || existing.role,
            orgId: row.orgId || existing.orgId,
            displayRole: row.displayRole || existing.displayRole,
            parentOrg: row.parentOrg || existing.parentOrg,
            actualOrg: row.actualOrg || existing.actualOrg,
            isActive: row.isActive !== false
          });
        }
        this.isLoaded = true;
        console.log(`[UserRepository] Loaded ${rows.length} users from PostgreSQL.`);
      }
    } catch (err: any) {
      console.warn('[UserRepository] loadFromDatabase error:', err.message);
    }
  }

  public findAll(): UserAccount[] {
    return Array.from(this.users.values());
  }

  public findById(id: string): UserAccount | undefined {
    return this.users.get(id);
  }

  public findByEmail(email: string): UserAccount | undefined {
    return Array.from(this.users.values()).find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public save(user: UserAccount): UserAccount {
    this.users.set(user.id, { ...user });

    // Asynchronously persist to PostgreSQL
    const sql = `
      INSERT INTO apmams.users (
        organization_id, role_id, first_name, last_name, email, is_active,
        app_user_id, org_id_code, role_code, display_role, parent_org, actual_org, avatar
      ) VALUES (
        (SELECT organization_id FROM apmams.organizations WHERE acronym = ${sqlEscape(user.orgId)} LIMIT 1),
        (SELECT role_id FROM apmams.roles WHERE role_name = ${sqlEscape(user.role)} OR role_name = 'ROLE_ORGANIZATION' LIMIT 1),
        ${sqlEscape(user.firstName || user.name.split(' ')[0])},
        ${sqlEscape(user.lastName || user.name.split(' ').slice(1).join(' ') || '')},
        ${sqlEscape(user.email)},
        ${user.isActive !== false ? 'TRUE' : 'FALSE'},
        ${sqlEscape(user.id)},
        ${sqlEscape(user.orgId)},
        ${sqlEscape(user.role)},
        ${sqlEscape(user.displayRole || user.role)},
        ${sqlEscape(user.parentOrg || '')},
        ${sqlEscape(user.actualOrg || '')},
        ${sqlEscape(user.avatar || '')}
      )
      ON CONFLICT (email) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        is_active = EXCLUDED.is_active,
        app_user_id = EXCLUDED.app_user_id,
        org_id_code = EXCLUDED.org_id_code,
        role_code = EXCLUDED.role_code,
        display_role = EXCLUDED.display_role,
        parent_org = EXCLUDED.parent_org,
        actual_org = EXCLUDED.actual_org,
        avatar = EXCLUDED.avatar;
    `;

    executeRawSql(sql).catch(err => {
      console.warn('[UserRepository] DB save failed:', err.message);
    });

    return { ...user };
  }

  public deleteById(id: string): boolean {
    const deleted = this.users.delete(id);
    const sql = `DELETE FROM apmams.users WHERE app_user_id = ${sqlEscape(id)} OR email = ${sqlEscape(id)};`;
    executeRawSql(sql).catch(err => {
      console.warn('[UserRepository] DB delete failed:', err.message);
    });
    return deleted;
  }
}

export const userRepository = new UserRepository();
