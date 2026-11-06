import { FiscalYear, FiscalYearStatus, OrganizationFiscalYearPlan, Activity } from '../../src/types';
import { INITIAL_FISCAL_YEARS, ORGANIZATIONS } from '../../src/data/initialData';
import { query, executeRawSql, sqlEscape } from '../database';
import { isSameOrg } from '../../src/utils/organizationUtils';
import { activityRepository } from './ActivityRepository';
import { actionPlanRepository } from './ActionPlanRepository';

export class FiscalYearRepository {
  private fiscalYears: Map<string, FiscalYear> = new Map();
  private isLoaded = false;

  constructor() {
    this.seedDefaults();
    this.loadFromDatabase().catch(err => {
      console.warn('[FiscalYearRepository] Failed initial DB load, using defaults:', err.message);
    });
  }

  private seedDefaults() {
    for (const fy of INITIAL_FISCAL_YEARS) {
      this.fiscalYears.set(fy.id, { ...fy });
    }
  }

  public async loadFromDatabase(): Promise<void> {
    try {
      const rows = await query<any>(`
        SELECT 
          id,
          name,
          fiscal_year as "fiscalYear",
          start_date::text as "startDate",
          end_date::text as "endDate",
          submission_start_date::text as "submissionStartDate",
          submission_deadline::text as "submissionDeadline",
          status,
          template_id as "templateId",
          period_covered as "periodCovered",
          is_submission_active as "isSubmissionActive",
          published_at::text as "publishedAt",
          notes,
          participating_orgs as "participatingOrgs",
          created_at::text as "createdAt",
          updated_at::text as "updatedAt"
        FROM apmams.fiscal_years
        ORDER BY fiscal_year_id DESC;
      `);

      if (rows && rows.length > 0) {
        for (const row of rows) {
          const existing = this.fiscalYears.get(row.id) || {} as FiscalYear;
          this.fiscalYears.set(row.id, {
            ...existing,
            ...row,
            id: row.id,
            name: row.name || existing.name,
            fiscalYear: row.fiscalYear || existing.fiscalYear,
            startDate: row.startDate || existing.startDate,
            endDate: row.endDate || existing.endDate,
            submissionStartDate: row.submissionStartDate || row.submissionOpenDate || existing.submissionStartDate,
            submissionDeadline: row.submissionDeadline || row.submissionCloseDate || existing.submissionDeadline,
            submissionOpenDate: row.submissionStartDate || row.submissionOpenDate || existing.submissionStartDate,
            submissionCloseDate: row.submissionDeadline || row.submissionCloseDate || existing.submissionDeadline,
            status: (row.status || existing.status || 'Draft') as FiscalYearStatus,
            templateId: row.templateId || existing.templateId || 'TEMPLATE-MSUN-DEFAULT',
            periodCovered: row.periodCovered || existing.periodCovered || `January–December ${row.name?.replace(/\D/g, '') || ''}`,
            isSubmissionActive: Boolean(row.isSubmissionActive),
            publishedAt: row.publishedAt || existing.publishedAt,
            notes: row.notes || existing.notes || '',
            participatingOrgs: Array.isArray(row.participatingOrgs) ? row.participatingOrgs : ['ALL'],
            createdAt: row.createdAt || existing.createdAt || new Date().toISOString(),
            updatedAt: row.updatedAt || existing.updatedAt || new Date().toISOString()
          });
        }
        this.isLoaded = true;
        console.log(`[FiscalYearRepository] Loaded ${rows.length} fiscal years from PostgreSQL.`);
      }
    } catch (err: any) {
      console.warn('[FiscalYearRepository] loadFromDatabase error:', err.message);
    }
  }

  public findAll(): FiscalYear[] {
    return Array.from(this.fiscalYears.values());
  }

  public findById(id: string): FiscalYear | undefined {
    return this.fiscalYears.get(id);
  }

  public save(fy: FiscalYear): FiscalYear {
    const existing = this.fiscalYears.get(fy.id);
    const now = new Date().toISOString();

    const saved: FiscalYear = {
      ...fy,
      submissionStartDate: fy.submissionStartDate || fy.submissionOpenDate || fy.startDate,
      submissionDeadline: fy.submissionDeadline || fy.submissionCloseDate || fy.endDate,
      submissionOpenDate: fy.submissionStartDate || fy.submissionOpenDate || fy.startDate,
      submissionCloseDate: fy.submissionDeadline || fy.submissionCloseDate || fy.endDate,
      periodCovered: fy.periodCovered || `January–December ${fy.name.replace(/\D/g, '')}`,
      updatedAt: now,
      createdAt: fy.createdAt || existing?.createdAt || now
    };

    this.fiscalYears.set(saved.id, saved);

    // Asynchronously persist to PostgreSQL
    const sql = `
      INSERT INTO apmams.fiscal_years (
        id, name, fiscal_year, start_date, end_date, submission_start_date, submission_deadline,
        status, template_id, period_covered, is_submission_active, published_at, notes, participating_orgs,
        updated_at
      ) VALUES (
        ${sqlEscape(saved.id)},
        ${sqlEscape(saved.name)},
        ${sqlEscape(saved.fiscalYear)},
        ${sqlEscape(saved.startDate)},
        ${sqlEscape(saved.endDate)},
        ${sqlEscape(saved.submissionStartDate)},
        ${sqlEscape(saved.submissionDeadline)},
        ${sqlEscape(saved.status)},
        ${sqlEscape(saved.templateId || 'TEMPLATE-MSUN-DEFAULT')},
        ${sqlEscape(saved.periodCovered)},
        ${saved.isSubmissionActive ? 'TRUE' : 'FALSE'},
        ${sqlEscape(saved.publishedAt || now)},
        ${sqlEscape(saved.notes || '')},
        ${sqlEscape(saved.participatingOrgs || ['ALL'])},
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        fiscal_year = EXCLUDED.fiscal_year,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        submission_start_date = EXCLUDED.submission_start_date,
        submission_deadline = EXCLUDED.submission_deadline,
        status = EXCLUDED.status,
        template_id = EXCLUDED.template_id,
        period_covered = EXCLUDED.period_covered,
        is_submission_active = EXCLUDED.is_submission_active,
        notes = EXCLUDED.notes,
        participating_orgs = EXCLUDED.participating_orgs,
        updated_at = NOW();
    `;

    executeRawSql(sql).catch(err => {
      console.warn('[FiscalYearRepository] DB save failed:', err.message);
    });

    return saved;
  }

  public activate(id: string): FiscalYear | null {
    const existing = this.fiscalYears.get(id);
    if (!existing) return null;

    const activated: FiscalYear = {
      ...existing,
      status: 'Open',
      isSubmissionActive: true,
      updatedAt: new Date().toISOString()
    };

    return this.save(activated);
  }

  public close(id: string, newStatus?: FiscalYearStatus): FiscalYear | null {
    const existing = this.fiscalYears.get(id);
    if (!existing) return null;

    const closed: FiscalYear = {
      ...existing,
      status: newStatus || 'Under Review',
      isSubmissionActive: false,
      updatedAt: new Date().toISOString()
    };

    return this.save(closed);
  }

  public archive(id: string): FiscalYear | null {
    const existing = this.fiscalYears.get(id);
    if (!existing) return null;

    const archived: FiscalYear = {
      ...existing,
      status: 'Archived',
      isSubmissionActive: false,
      updatedAt: new Date().toISOString()
    };

    return this.save(archived);
  }

  /**
   * Automatically organize action plans and activities by registered organization for this fiscal year.
   * Fulfills Requirements 4, 5, 6, 7:
   * - Each organization has Proposed Action Plan, Approved Action Plan, and Deferred/Rejected sections
   * - Only one primary action plan per organization per fiscal year
   */
  public getOrganizationsInFiscalYear(fiscalYearId: string): OrganizationFiscalYearPlan[] {
    const fy = this.fiscalYears.get(fiscalYearId);
    const fyDigits = (fy?.name || fiscalYearId).replace(/\D/g, '') || '2027';

    // All activities across the system
    const allActivities = activityRepository.findAll();
    // Filter activities matching this fiscal year
    const yearActivities = allActivities.filter(act => {
      const actYear = (act.fiscalYear || '').replace(/\D/g, '');
      if (actYear && actYear === fyDigits) return true;
      if (act.startDate && act.startDate.startsWith(fyDigits)) return true;
      return false;
    });

    // All existing folders/plans
    const allFolders = actionPlanRepository.findAll();

    const results: OrganizationFiscalYearPlan[] = ORGANIZATIONS
      .filter(org => org.id && org.id !== 'ADMIN' && org.id !== 'COLLEGE')
      .map(org => {
        const orgActivities = yearActivities.filter(act => isSameOrg(act.orgId, org.id));

        // Group into Proposed, Approved, and Deferred/Rejected
        const proposedActivities = orgActivities.filter(act => {
          const s = (act.status || '').toUpperCase();
          const ws = (act.workflowStatus || '').toUpperCase();
          if (s.includes('DEFERRED') || s.includes('REJECTED')) return false;
          if (s === 'APPROVED' || ws === 'COMPLETED') return false;
          return true; // Pending, Draft, Submitted, For Review
        });

        const approvedActivities = orgActivities.filter(act => {
          const s = (act.status || '').toUpperCase();
          const ws = (act.workflowStatus || '').toUpperCase();
          return s === 'APPROVED' || ws === 'COMPLETED';
        });

        const deferredRejectedActivities = orgActivities.filter(act => {
          const s = (act.status || '').toUpperCase();
          return s.includes('DEFERRED') || s.includes('REJECTED');
        });

        const proposedBudget = proposedActivities.reduce((sum, a) => sum + (a.budget || a.amount || 0), 0);
        const approvedBudget = approvedActivities.reduce((sum, a) => sum + (a.budget || a.amount || 0), 0);
        const totalBudget = orgActivities.reduce((sum, a) => sum + (a.budget || a.amount || 0), 0);

        // Primary Action Plan record
        const primaryPlanId = `AP-${fyDigits}-${org.id}`;
        let status: 'Draft' | 'Submitted' | 'Under Review' | 'Approved' | 'Revision Requested' = 'Draft';
        if (approvedActivities.length > 0 && proposedActivities.length === 0) {
          status = 'Approved';
        } else if (proposedActivities.length > 0) {
          status = 'Under Review';
        }

        const latestDate = orgActivities.reduce((latest, a) => {
          const d = a.submittedDate || a.startDate || '';
          return d > latest ? d : latest;
        }, '');

        return {
          orgId: org.id,
          orgName: org.name,
          category: (org as any).category || org.nature || 'Student Organization',
          fiscalYear: fy?.name || `FY ${fyDigits}`,
          primaryActionPlanId: primaryPlanId,
          version: 1,
          templateId: fy?.templateId || 'TEMPLATE-MSUN-DEFAULT',
          status,
          proposedActivities,
          approvedActivities,
          deferredRejectedActivities,
          totalActivities: orgActivities.length,
          totalBudget,
          proposedBudget,
          approvedBudget,
          submissionDate: latestDate || `${fyDigits}-01-15`,
          signatory: orgActivities[0]?.proposedBy || `${org.id} President`
        };
      });

    return results;
  }
}

export const fiscalYearRepository = new FiscalYearRepository();
