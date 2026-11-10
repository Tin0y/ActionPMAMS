import { UserAccount } from '../../src/types';
import { INITIAL_USER_ACCOUNTS } from '../../src/data/initialData';
import { query, queryRow, executeRawSql, sqlEscape, sqlText } from '../database';
import { dedupeOfficialRoles, normalizeOfficialRole, toPublicUser } from '../services/AuthService';

export class UserRepository {
  private users: Map<string, UserAccount> = new Map();
  private isLoaded = false;

  constructor() {
    this.loadFromDatabase().catch(err => {
      console.warn('[UserRepository] Initial DB load warning:', err.message);
    });
  }

  public async loadFromDatabase(): Promise<void> {
    try {
      const rows = await query<any>(`
        SELECT 
          COALESCE(app_user_id, 'usr-' || user_id::text) as id,
          first_name || ' ' || last_name as name,
          first_name as "firstName",
          last_name as "lastName",
          email,
          avatar,
          bio,
          role_code as role,
          username,
          student_id as "studentId",
          roles,
          org_id_code as "orgId",
          parent_org as "parentOrg",
          actual_org as "actualOrg",
          display_role as "displayRole",
          COALESCE(is_active, true) as "isActive",
          COALESCE(must_change_password, false) as "mustChangePassword"
        FROM apmams.users
        ORDER BY user_id ASC
      `);

      if (rows && rows.length > 0) {
        this.users.clear();
        for (const row of rows) {
          const seedMatch = INITIAL_USER_ACCOUNTS.find(
            u => u.id === row.id || u.email.toLowerCase() === (row.email || '').toLowerCase()
          );

          const rawRoles = (Array.isArray(row.roles) && row.roles.length > 0)
            ? row.roles
            : (row.role ? [row.role] : (seedMatch?.roles || []));
          const dedupedOfficial = dedupeOfficialRoles(rawRoles);
          const parsedRoles = dedupedOfficial.length > 0 ? dedupedOfficial : Array.from(new Set(rawRoles));
          const rawPrimary = row.role || seedMatch?.role || 'ROLE_ORGANIZATION';
          const canonicalPrimary = normalizeOfficialRole(rawPrimary) || parsedRoles[0] || rawPrimary;

          const sanitized = toPublicUser({
            ...(seedMatch ? toPublicUser(seedMatch) : {}),
            ...row,
            id: row.id,
            name: (row.name && row.name.trim()) ? row.name.trim() : (seedMatch?.name || row.email),
            firstName: row.firstName ?? seedMatch?.firstName ?? '',
            lastName: row.lastName ?? seedMatch?.lastName ?? '',
            email: row.email,
            username: row.username || (row.email ? row.email.split('@')[0] : ''),
            studentId: row.studentId || seedMatch?.studentId || '',
            role: canonicalPrimary,
            roles: parsedRoles,
            orgId: row.orgId || seedMatch?.orgId || '',
            orgName: seedMatch?.orgName || row.actualOrg || row.parentOrg || row.orgId || '',
            displayRole: row.displayRole || seedMatch?.displayRole || row.role,
            parentOrg: row.parentOrg || seedMatch?.parentOrg || '',
            actualOrg: row.actualOrg || seedMatch?.actualOrg || '',
            bio: row.bio ?? seedMatch?.bio ?? '',
            isActive: row.isActive !== false,
            mustChangePassword: Boolean(row.mustChangePassword)
          });

          this.users.set(sanitized.id, sanitized);
        }
        this.isLoaded = true;
        console.log(`[UserRepository] Loaded ${rows.length} sanitized users from PostgreSQL.`);
      }
    } catch (err: any) {
      console.warn('[UserRepository] loadFromDatabase error:', err.message);
    }
  }

  public findAll(): UserAccount[] {
    return Array.from(this.users.values()).map(u => toPublicUser(u));
  }

  public findById(id: string): UserAccount | undefined {
    const found = this.users.get(id);
    return found ? toPublicUser(found) : undefined;
  }

  public findByEmail(email: string): UserAccount | undefined {
    const eLower = email.trim().toLowerCase();
    const found = Array.from(this.users.values()).find(u => u.email.toLowerCase() === eLower);
    return found ? toPublicUser(found) : undefined;
  }

  public findByUsernameOrEmail(identifier: string): UserAccount | undefined {
    const idLower = identifier.trim().toLowerCase();
    const found = Array.from(this.users.values()).find(
      u =>
        u.email.toLowerCase() === idLower ||
        (u.username && u.username.toLowerCase() === idLower)
    );
    return found ? toPublicUser(found) : undefined;
  }

  public async existsDuplicateEmailOrUsername(
    email: string,
    username?: string,
    excludeAppUserId?: string
  ): Promise<{ conflict: boolean; field?: 'email' | 'username' }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = (username || '').trim().toLowerCase();
    const excludeClause = excludeAppUserId
      ? `AND COALESCE(app_user_id, '') <> ${sqlText(excludeAppUserId)}`
      : '';

    const emailMatch = await queryRow<{ user_id: number }>(`
      SELECT user_id FROM apmams.users
      WHERE LOWER(email) = ${sqlText(cleanEmail)} ${excludeClause}
      LIMIT 1
    `);
    if (emailMatch) {
      return { conflict: true, field: 'email' };
    }

    if (cleanUsername) {
      const userMatch = await queryRow<{ user_id: number }>(`
        SELECT user_id FROM apmams.users
        WHERE (
          LOWER(COALESCE(username, '')) = ${sqlText(cleanUsername)}
          OR (COALESCE(username, '') = '' AND LOWER(SPLIT_PART(email, '@', 1)) = ${sqlText(cleanUsername)})
        ) ${excludeClause}
        LIMIT 1
      `);
      if (userMatch) {
        return { conflict: true, field: 'username' };
      }
    }

    return { conflict: false };
  }

  public async existsDuplicateStudentId(
    studentId: string,
    excludeAppUserId?: string
  ): Promise<boolean> {
    const cleanId = studentId.trim();
    if (!cleanId) return false;
    const excludeClause = excludeAppUserId
      ? `AND COALESCE(app_user_id, '') <> ${sqlText(excludeAppUserId)}`
      : '';
    const match = await queryRow<{ user_id: number }>(`
      SELECT user_id FROM apmams.users
      WHERE student_id = ${sqlText(cleanId)} ${excludeClause}
      LIMIT 1
    `);
    return Boolean(match);
  }

  /**
   * Creates a new user account in PostgreSQL with a mandatory bcrypt password hash.
   */
  public async createWithPasswordHash(
    user: UserAccount,
    passwordHash: string,
    mustChangePassword = false
  ): Promise<UserAccount> {
    const rawRoles = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [user.role];
    const deduped = dedupeOfficialRoles(rawRoles);
    const userRoles = deduped.length > 0 ? deduped : Array.from(new Set(rawRoles));
    const canonicalRole = normalizeOfficialRole(user.role) || userRoles[0] || user.role;
    const cleanUser = toPublicUser({
      ...user,
      role: canonicalRole,
      roles: userRoles,
      username: user.username || user.email.split('@')[0],
      studentId: user.studentId || '',
      isActive: user.isActive !== false,
      mustChangePassword
    });

    const firstName = cleanUser.firstName || cleanUser.name.split(' ')[0] || '';
    const lastName = cleanUser.lastName || cleanUser.name.split(' ').slice(1).join(' ') || '';

    const sql = `
      INSERT INTO apmams.users (
        organization_id, role_id, first_name, last_name, email, is_active,
        app_user_id, org_id_code, role_code, display_role, parent_org, actual_org,
        avatar, bio, username, student_id, roles, password_hash, must_change_password, password_updated_at
      ) VALUES (
        (SELECT organization_id FROM apmams.organizations WHERE acronym = ${sqlEscape(cleanUser.orgId)} LIMIT 1),
        COALESCE((SELECT role_id FROM apmams.roles WHERE role_name = ${sqlEscape(cleanUser.role)} LIMIT 1), (SELECT role_id FROM apmams.roles WHERE role_name = 'ROLE_ORGANIZATION' LIMIT 1), 1),
        ${sqlText(firstName)},
        ${sqlText(lastName)},
        ${sqlText(cleanUser.email.trim())},
        ${cleanUser.isActive !== false ? 'TRUE' : 'FALSE'},
        ${sqlText(cleanUser.id)},
        ${sqlText(cleanUser.orgId || '')},
        ${sqlText(cleanUser.role)},
        ${sqlText(cleanUser.displayRole || cleanUser.role)},
        ${sqlText(cleanUser.parentOrg || '')},
        ${sqlText(cleanUser.actualOrg || '')},
        ${sqlText(cleanUser.avatar || '')},
        ${sqlText(cleanUser.bio || '')},
        ${sqlText(cleanUser.username || '')},
        ${sqlText(cleanUser.studentId || '')},
        ${sqlEscape(cleanUser.roles)},
        ${sqlText(passwordHash)},
        ${mustChangePassword ? 'TRUE' : 'FALSE'},
        CURRENT_TIMESTAMP
      );
    `;

    await executeRawSql(sql);
    this.users.set(cleanUser.id, cleanUser);
    return toPublicUser(cleanUser);
  }

  /**
   * Updates an existing user account in PostgreSQL, preserving existing password_hash
   * unless a new bcrypt passwordHash is explicitly supplied.
   */
  public async updateExisting(
    id: string,
    user: UserAccount,
    options?: { newPasswordHash?: string; mustChangePassword?: boolean }
  ): Promise<UserAccount> {
    const rawRoles = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [user.role];
    const deduped = dedupeOfficialRoles(rawRoles);
    const userRoles = deduped.length > 0 ? deduped : Array.from(new Set(rawRoles));
    const canonicalRole = normalizeOfficialRole(user.role) || userRoles[0] || user.role;
    const cleanUser = toPublicUser({
      ...user,
      id,
      role: canonicalRole,
      roles: userRoles,
      username: user.username || user.email.split('@')[0],
      studentId: user.studentId || '',
      isActive: user.isActive !== false,
      mustChangePassword:
        options?.mustChangePassword !== undefined
          ? options.mustChangePassword
          : Boolean(user.mustChangePassword)
    });

    const firstName = cleanUser.firstName || cleanUser.name.split(' ')[0] || '';
    const lastName = cleanUser.lastName || cleanUser.name.split(' ').slice(1).join(' ') || '';

    const passwordSetFragments = options?.newPasswordHash
      ? `,
        password_hash = ${sqlText(options.newPasswordHash)},
        must_change_password = ${options.mustChangePassword ? 'TRUE' : 'FALSE'},
        password_updated_at = CURRENT_TIMESTAMP`
      : '';

    const sql = `
      UPDATE apmams.users
      SET
        organization_id = (SELECT organization_id FROM apmams.organizations WHERE acronym = ${sqlEscape(cleanUser.orgId)} LIMIT 1),
        role_id = COALESCE((SELECT role_id FROM apmams.roles WHERE role_name = ${sqlEscape(cleanUser.role)} LIMIT 1), role_id),
        first_name = ${sqlText(firstName)},
        last_name = ${sqlText(lastName)},
        email = ${sqlText(cleanUser.email.trim())},
        is_active = ${cleanUser.isActive !== false ? 'TRUE' : 'FALSE'},
        org_id_code = ${sqlText(cleanUser.orgId || '')},
        role_code = ${sqlText(cleanUser.role)},
        display_role = ${sqlText(cleanUser.displayRole || cleanUser.role)},
        parent_org = ${sqlText(cleanUser.parentOrg || '')},
        actual_org = ${sqlText(cleanUser.actualOrg || '')},
        avatar = ${sqlText(cleanUser.avatar || '')},
        bio = ${sqlText(cleanUser.bio || '')},
        username = ${sqlText(cleanUser.username || '')},
        student_id = ${sqlText(cleanUser.studentId || '')},
        roles = ${sqlEscape(cleanUser.roles)}${passwordSetFragments}
      WHERE app_user_id = ${sqlText(id)}
         OR user_id::text = ${sqlText(id)}
         OR LOWER(email) = LOWER(${sqlText(cleanUser.email)});
    `;

    await executeRawSql(sql);
    this.users.set(id, cleanUser);
    return toPublicUser(cleanUser);
  }

  public async deleteById(id: string): Promise<boolean> {
    const existed = this.users.delete(id);
    await executeRawSql(`
      DELETE FROM apmams.user_sessions WHERE app_user_id = ${sqlText(id)} OR app_user_id IN (SELECT app_user_id FROM apmams.users WHERE user_id::text = ${sqlText(id)});
      DELETE FROM apmams.audit_logs WHERE user_id IN (SELECT user_id FROM apmams.users WHERE app_user_id = ${sqlText(id)} OR user_id::text = ${sqlText(id)});
      DELETE FROM apmams.users WHERE app_user_id = ${sqlText(id)} OR user_id::text = ${sqlText(id)};
    `);
    return existed;
  }
}

export const userRepository = new UserRepository();
