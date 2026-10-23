import { StudentOrganization } from '../../src/types';
import { ORGANIZATIONS } from '../../src/data/initialData';
import { query, executeRawSql, sqlEscape } from '../database';

export class OrganizationRepository {
  private orgs: Map<string, StudentOrganization> = new Map();
  private isLoaded = false;

  constructor() {
    this.seedDefaults();
    this.loadFromDatabase().catch(err => {
      console.warn('[OrganizationRepository] Failed initial DB load, using defaults:', err.message);
    });
  }

  private seedDefaults() {
    for (const org of ORGANIZATIONS) {
      this.orgs.set(org.id, { ...org });
    }
  }

  public async loadFromDatabase(): Promise<void> {
    try {
      const rows = await query<any>(`
        SELECT 
          acronym as id,
          organization_name as name,
          acronym,
          org_type as type,
          description,
          president,
          email,
          registered_number as "registeredNumber",
          logo_url as logo,
          sub_orgs as "subOrgs"
        FROM apmams.organizations
        ORDER BY organization_id ASC;
      `);

      if (rows && rows.length > 0) {
        for (const row of rows) {
          const existing = this.orgs.get(row.id) || {} as StudentOrganization;
          this.orgs.set(row.id, {
            ...existing,
            ...row,
            id: row.id || row.acronym,
            name: row.name || existing.name,
            acronym: row.acronym || existing.acronym,
            description: row.description || existing.description,
            president: row.president || existing.president,
            registeredNumber: row.registeredNumber || existing.registeredNumber
          });
        }
        this.isLoaded = true;
        console.log(`[OrganizationRepository] Loaded ${rows.length} organizations from PostgreSQL.`);
      }
    } catch (err: any) {
      console.warn('[OrganizationRepository] loadFromDatabase error:', err.message);
    }
  }

  public findAll(): StudentOrganization[] {
    return Array.from(this.orgs.values());
  }

  public findById(id: string): StudentOrganization | undefined {
    return this.orgs.get(id);
  }

  public save(org: StudentOrganization): StudentOrganization {
    this.orgs.set(org.id, { ...org });

    // Asynchronously persist to PostgreSQL
    const sql = `
      INSERT INTO apmams.organizations (
        organization_name, acronym, org_code, description, president, email, registered_number, sub_orgs
      ) VALUES (
        ${sqlEscape(org.name)},
        ${sqlEscape(org.id || org.acronym)},
        ${sqlEscape(org.id || org.acronym)},
        ${sqlEscape(org.description || '')},
        ${sqlEscape(org.president || '')},
        ${sqlEscape((org as any).email || `${(org.id || 'org').toLowerCase()}@msun.edu.ph`)},
        ${sqlEscape(org.registeredNumber || '')},
        ${sqlEscape((org as any).subOrgs || [])}
      )
      ON CONFLICT (acronym) DO UPDATE SET
        organization_name = EXCLUDED.organization_name,
        description = EXCLUDED.description,
        president = EXCLUDED.president,
        email = EXCLUDED.email,
        registered_number = EXCLUDED.registered_number,
        sub_orgs = EXCLUDED.sub_orgs;
    `;

    executeRawSql(sql).catch(err => {
      console.warn('[OrganizationRepository] DB save failed:', err.message);
    });

    return { ...org };
  }
}

export const organizationRepository = new OrganizationRepository();
