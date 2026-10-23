import { ActionPlanFolder } from '../../src/types';
import { INITIAL_ACTION_PLAN_FOLDERS } from '../../src/data/initialData';
import { query, executeRawSql, sqlEscape } from '../database';

export class ActionPlanRepository {
  private folders: Map<string, ActionPlanFolder> = new Map();
  private isLoaded = false;

  constructor() {
    this.seedDefaults();
    this.loadFromDatabase().catch(err => {
      console.warn('[ActionPlanRepository] Failed initial DB load, using defaults:', err.message);
    });
  }

  private seedDefaults() {
    for (const f of INITIAL_ACTION_PLAN_FOLDERS) {
      this.folders.set(f.id, { ...f });
    }
  }

  public async loadFromDatabase(): Promise<void> {
    try {
      const rows = await query<any>(`
        SELECT 
          folder_id as id,
          fiscal_year as "fiscalYear",
          title,
          theme,
          status,
          submission_deadline as "submissionDeadline",
          created_at::text as "createdAt",
          created_by as "createdBy",
          total_activities as "totalActivitiesCount",
          approved_count as "approvedCount",
          pending_count as "pendingCount",
          total_budget::float as "allocatedBudget",
          description
        FROM apmams.action_plans
        ORDER BY action_plan_id ASC;
      `);

      if (rows && rows.length > 0) {
        for (const row of rows) {
          const existing = this.folders.get(row.id) || {} as ActionPlanFolder;
          this.folders.set(row.id, {
            ...existing,
            ...row,
            id: row.id || existing.id,
            fiscalYear: row.fiscalYear || existing.fiscalYear,
            title: row.title || existing.title || `FY ${row.fiscalYear} Action Plan`,
            theme: row.theme || existing.theme,
            status: row.status || existing.status || 'Open',
            submissionDeadline: row.submissionDeadline || existing.submissionDeadline,
            createdAt: row.createdAt || existing.createdAt || '2026-01-01',
            createdBy: row.createdBy || existing.createdBy || 'System Administrator',
            allocatedBudget: Number(row.allocatedBudget ?? existing.allocatedBudget ?? 0),
            totalActivitiesCount: Number(row.totalActivitiesCount ?? existing.totalActivitiesCount ?? 0),
            approvedCount: Number(row.approvedCount ?? existing.approvedCount ?? 0),
            pendingCount: Number(row.pendingCount ?? existing.pendingCount ?? 0),
            description: row.description || existing.description
          });
        }
        this.isLoaded = true;
        console.log(`[ActionPlanRepository] Loaded ${rows.length} action plan folders from PostgreSQL.`);
      }
    } catch (err: any) {
      console.warn('[ActionPlanRepository] loadFromDatabase error:', err.message);
    }
  }

  public findAll(): ActionPlanFolder[] {
    return Array.from(this.folders.values());
  }

  public findById(id: string): ActionPlanFolder | undefined {
    return this.folders.get(id);
  }

  public save(folder: ActionPlanFolder): ActionPlanFolder {
    this.folders.set(folder.id, { ...folder });

    // Asynchronously persist to PostgreSQL
    const sql = `
      INSERT INTO apmams.action_plans (
        organization_id, title, goal, description, academic_year, created_by,
        folder_id, fiscal_year, status, total_activities, total_budget,
        approved_count, pending_count, theme, submission_deadline
      ) VALUES (
        COALESCE((SELECT organization_id FROM apmams.organizations LIMIT 1), 1),
        ${sqlEscape(folder.title)},
        ${sqlEscape(folder.theme || folder.title)},
        ${sqlEscape(folder.description || '')},
        ${sqlEscape(folder.fiscalYear)},
        COALESCE((SELECT user_id FROM apmams.users LIMIT 1), 1),
        ${sqlEscape(folder.id)},
        ${sqlEscape(folder.fiscalYear)},
        ${sqlEscape(folder.status)},
        ${folder.totalActivitiesCount || 0},
        ${folder.allocatedBudget || 0},
        ${folder.approvedCount || 0},
        ${folder.pendingCount || 0},
        ${sqlEscape(folder.theme || '')},
        ${sqlEscape(folder.submissionDeadline || '')}
      )
      ON CONFLICT (folder_id) DO UPDATE SET
        title = EXCLUDED.title,
        status = EXCLUDED.status,
        total_activities = EXCLUDED.total_activities,
        total_budget = EXCLUDED.total_budget,
        approved_count = EXCLUDED.approved_count,
        pending_count = EXCLUDED.pending_count,
        theme = EXCLUDED.theme,
        submission_deadline = EXCLUDED.submission_deadline,
        description = EXCLUDED.description;
    `;

    executeRawSql(sql).catch(err => {
      console.warn('[ActionPlanRepository] DB save failed:', err.message);
    });

    return { ...folder };
  }
}

export const actionPlanRepository = new ActionPlanRepository();
