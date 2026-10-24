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
          username,
          roles,
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
          const parsedRoles = (Array.isArray(row.roles) && row.roles.length > 0) 
            ? row.roles 
            : (existing.roles && existing.roles.length > 0 ? existing.roles : (row.role ? [row.role] : []));

          this.users.set(row.id, {
            ...existing,
            ...row,
            id: row.id || existing.id,
            name: row.name || existing.name,
            email: row.email || existing.email,
            username: row.username || existing.username || (row.email ? row.email.split('@')[0] : ''),
            role: row.role || existing.role,
            roles: parsedRoles,
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

  public findByUsernameOrEmail(identifier: string): UserAccount | undefined {
    const idLower = identifier.trim().toLowerCase();
    return Array.from(this.users.values()).find(u => 
      u.email.toLowerCase() === idLower || 
      (u.username && u.username.toLowerCase() === idLower)
    );
  }

  public save(user: UserAccount): UserAccount {
    const userRoles = (Array.isArray(user.roles) && user.roles.length > 0) ? user.roles : [user.role];
    const userObj: UserAccount = {
      ...user,
      roles: userRoles,
      username: user.username || user.email.split('@')[0]
    };
    this.users.set(user.id, userObj);

    // Asynchronously persist to PostgreSQL
    const sql = `
      INSERT INTO apmams.users (
        organization_id, role_id, first_name, last_name, email, is_active,
        app_user_id, org_id_code, role_code, display_role, parent_org, actual_org, avatar, username, roles
      ) VALUES (
        (SELECT organization_id FROM apmams.organizations WHERE acronym = ${sqlEscape(userObj.orgId)} LIMIT 1),
        (SELECT role_id FROM apmams.roles WHERE role_name = ${sqlEscape(userObj.role)} OR role_name = 'ROLE_ORGANIZATION' LIMIT 1),
        ${sqlEscape(userObj.firstName || userObj.name.split(' ')[0])},
        ${sqlEscape(userObj.lastName || userObj.name.split(' ').slice(1).join(' ') || '')},
        ${sqlEscape(userObj.email)},
        ${userObj.isActive !== false ? 'TRUE' : 'FALSE'},
        ${sqlEscape(userObj.id)},
        ${sqlEscape(userObj.orgId)},
        ${sqlEscape(userObj.role)},
        ${sqlEscape(userObj.displayRole || userObj.role)},
        ${sqlEscape(userObj.parentOrg || '')},
        ${sqlEscape(userObj.actualOrg || '')},
        ${sqlEscape(userObj.avatar || '')},
        ${sqlEscape(userObj.username || '')},
        ${sqlEscape(JSON.stringify(userObj.roles))}::jsonb
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
        avatar = EXCLUDED.avatar,
        username = EXCLUDED.username,
        roles = EXCLUDED.roles;
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
