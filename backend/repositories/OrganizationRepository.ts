import { StudentOrganization } from '../../src/types';
import { ORGANIZATIONS, syncGlobalOrganizationsList } from '../../src/data/initialData';
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
          const hasDbMembers = Array.isArray(row.membersList);
          const hasDbAttachments = Array.isArray(row.attachments);
          const membersList = hasDbMembers ? row.membersList : (existing.membersList || []);
          const attachments = hasDbAttachments ? row.attachments : (existing.attachments || []);
          const memberCount = Array.isArray(membersList)
            ? membersList.length
            : Number(row.memberCount ?? existing.memberCount ?? 0);
          const attachmentCount = Array.isArray(attachments)
            ? attachments.length
            : Number(row.attachmentCount ?? existing.attachmentCount ?? 0);

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
            memberCount,
            attachmentCount,
            color: row.color || existing.color || 'blue',
            description: row.description || existing.description,
            president: row.president || existing.president || 'Student President',
            facultyAdviser: row.facultyAdviser || existing.facultyAdviser || 'Faculty Adviser',
            officeLocation: row.officeLocation || existing.officeLocation || 'Campus Office',
            objectives: row.objectives || existing.objectives || [],
            membersList,
            attachments
          });
        }
        this.isLoaded = true;
        syncGlobalOrganizationsList(this.findAll());
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
    const direct = this.orgs.get(id);
    if (direct) return direct;
    const norm = (id || '').trim().toLowerCase();
    for (const org of this.orgs.values()) {
      if (org.id.toLowerCase() === norm || (org.acronym || '').toLowerCase() === norm) {
        return org;
      }
    }
    return undefined;
  }

  public async save(org: StudentOrganization): Promise<StudentOrganization> {
    const membersList = Array.isArray(org.membersList) ? org.membersList : [];
    const attachments = Array.isArray(org.attachments) ? org.attachments : [];
    const normalized: StudentOrganization = {
      ...org,
      membersList,
      attachments,
      memberCount: Array.isArray(org.membersList)
        ? membersList.length
        : Math.max(0, Number(org.memberCount ?? 0)),
      attachmentCount: Array.isArray(org.attachments)
        ? attachments.length
        : Math.max(0, Number(org.attachmentCount ?? 0))
    };

    const previous = this.orgs.get(normalized.id);
    this.orgs.set(normalized.id, { ...normalized });

    const sql = `
      INSERT INTO apmams.organizations (
        organization_name, acronym, org_code, description, president, email, registered_number, sub_orgs,
        nature, status, date_of_application, member_count, attachment_count, color, faculty_adviser, office_location,
        objectives, members_list, attachments
      ) VALUES (
        ${sqlEscape(normalized.name)},
        ${sqlEscape(normalized.id || normalized.acronym)},
        ${sqlEscape(normalized.id || normalized.acronym)},
        ${sqlEscape(normalized.description || '')},
        ${sqlEscape(normalized.president || '')},
        ${sqlEscape((normalized as any).email || `${(normalized.id || 'org').toLowerCase()}@msun.edu.ph`)},
        ${sqlEscape(normalized.registeredNumber || '')},
        ${sqlEscape((normalized as any).subOrgs || [])},
        ${sqlEscape(normalized.nature || 'Academic & Student Governance')},
        ${sqlEscape(normalized.status || 'Active')},
        ${sqlEscape(normalized.dateOfApplication || '2026-01-10')},
        ${normalized.memberCount},
        ${normalized.attachmentCount},
        ${sqlEscape(normalized.color || 'blue')},
        ${sqlEscape(normalized.facultyAdviser || '')},
        ${sqlEscape(normalized.officeLocation || '')},
        ${sqlEscape(normalized.objectives || [])},
        ${sqlEscape(membersList)},
        ${sqlEscape(attachments)}
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

    try {
      await executeRawSql(sql);
      syncGlobalOrganizationsList(this.findAll());
    } catch (err: any) {
      if (previous) {
        this.orgs.set(normalized.id, previous);
      } else {
        this.orgs.delete(normalized.id);
      }
      console.error('[OrganizationRepository] DB save failed:', err.message);
      throw err;
    }

    return { ...normalized };
  }
}

export const organizationRepository = new OrganizationRepository();
