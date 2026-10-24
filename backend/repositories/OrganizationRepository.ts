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
          sub_orgs as "subOrgs",
          nature,
          status,
          date_of_application as "dateOfApplication",
          member_count as "memberCount",
          attachment_count as "attachmentCount",
          color,
          faculty_adviser as "facultyAdviser",
          office_location as "officeLocation",
          objectives,
          members_list as "membersList",
          attachments
        FROM apmams.organizations
        ORDER BY organization_id ASC;
      `);

      if (rows && rows.length > 0) {
        for (const row of rows) {
          const existing = this.orgs.get(row.id) || this.orgs.get(row.acronym) || {} as StudentOrganization;
          this.orgs.set(row.id, {
            ...existing,
            ...row,
            id: row.id || existing.id,
            name: row.name || existing.name,
            acronym: existing.acronym || row.acronym,
            nature: row.nature || existing.nature || 'Academic & Student Governance',
            status: row.status || existing.status || 'Active',
            registeredNumber: row.registeredNumber || existing.registeredNumber || 'MSUN-SO-2026',
            dateOfApplication: row.dateOfApplication || existing.dateOfApplication || '2026-01-10',
            memberCount: Number(row.memberCount ?? existing.memberCount ?? 50),
            attachmentCount: Number(row.attachmentCount ?? existing.attachmentCount ?? 5),
            color: row.color || existing.color || 'blue',
            description: row.description || existing.description,
            president: row.president || existing.president || 'Student President',
            facultyAdviser: row.facultyAdviser || existing.facultyAdviser || 'Faculty Adviser',
            officeLocation: row.officeLocation || existing.officeLocation || 'Campus Office',
            objectives: row.objectives || existing.objectives || [],
            membersList: row.membersList || existing.membersList || [],
            attachments: row.attachments || existing.attachments || []
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
        organization_name, acronym, org_code, description, president, email, registered_number, sub_orgs,
        nature, status, date_of_application, member_count, attachment_count, color, faculty_adviser, office_location,
        objectives, members_list, attachments
      ) VALUES (
        ${sqlEscape(org.name)},
        ${sqlEscape(org.id || org.acronym)},
        ${sqlEscape(org.id || org.acronym)},
        ${sqlEscape(org.description || '')},
        ${sqlEscape(org.president || '')},
        ${sqlEscape((org as any).email || `${(org.id || 'org').toLowerCase()}@msun.edu.ph`)},
        ${sqlEscape(org.registeredNumber || '')},
        ${sqlEscape((org as any).subOrgs || [])},
        ${sqlEscape(org.nature || 'Academic & Student Governance')},
        ${sqlEscape(org.status || 'Active')},
        ${sqlEscape(org.dateOfApplication || '2026-01-10')},
        ${org.memberCount || 50},
        ${org.attachmentCount || 5},
        ${sqlEscape(org.color || 'blue')},
        ${sqlEscape(org.facultyAdviser || '')},
        ${sqlEscape(org.officeLocation || '')},
        ${sqlEscape(org.objectives || [])},
        ${sqlEscape(org.membersList || [])},
        ${sqlEscape(org.attachments || [])}
      )
      ON CONFLICT (acronym) DO UPDATE SET
        organization_name = EXCLUDED.organization_name,
        description = EXCLUDED.description,
        president = EXCLUDED.president,
        email = EXCLUDED.email,
        registered_number = EXCLUDED.registered_number,
        sub_orgs = EXCLUDED.sub_orgs,
        nature = EXCLUDED.nature,
        status = EXCLUDED.status,
        date_of_application = EXCLUDED.date_of_application,
        member_count = EXCLUDED.member_count,
        attachment_count = EXCLUDED.attachment_count,
        color = EXCLUDED.color,
        faculty_adviser = EXCLUDED.faculty_adviser,
        office_location = EXCLUDED.office_location,
        objectives = EXCLUDED.objectives,
        members_list = EXCLUDED.members_list,
        attachments = EXCLUDED.attachments;
    `;

    executeRawSql(sql).catch(err => {
      console.warn('[OrganizationRepository] DB save failed:', err.message);
    });

    return { ...org };
  }
}

export const organizationRepository = new OrganizationRepository();
