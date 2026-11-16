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

  public async save(folder: ActionPlanFolder): Promise<ActionPlanFolder> {
    const previous = this.folders.get(folder.id);
    this.folders.set(folder.id, { ...folder });

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
      ON CONFLICT (folder_id) WHERE folder_id IS NOT NULL DO UPDATE SET
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

    try {
      await executeRawSql(sql);
    } catch (err: any) {
      if (previous) {
        this.folders.set(folder.id, previous);
      } else {
        this.folders.delete(folder.id);
      }
      console.error('[ActionPlanRepository] DB save failed:', err.message);
      throw err;
    }

    return { ...folder };
  }

  public async deleteById(id: string): Promise<boolean> {
    const existing = this.folders.get(id);
    const fyName = existing?.fiscalYear || id;
    const deleted = this.folders.delete(id);

    const sql = `
      DELETE FROM apmams.action_plans 
      WHERE folder_id = ${sqlEscape(id)} OR fiscal_year = ${sqlEscape(fyName)};
    `;
    try {
      await executeRawSql(sql);
    } catch (err: any) {
      if (existing) {
        this.folders.set(id, existing);
      }
      console.error('[ActionPlanRepository] DB delete failed:', err.message);
      throw err;
    }

    return deleted;
  }

  public async deleteByFiscalYear(fyName: string): Promise<boolean> {
    const removed: Array<[string, ActionPlanFolder]> = [];
    for (const [id, f] of Array.from(this.folders.entries())) {
      if (f.fiscalYear === fyName || f.id === `AP-${fyName.replace(/\s+/g, '')}`) {
        removed.push([id, f]);
        this.folders.delete(id);
      }
    }

    const sql = `
      DELETE FROM apmams.action_plans 
      WHERE fiscal_year = ${sqlEscape(fyName)} OR folder_id = ${sqlEscape(`AP-${fyName.replace(/\s+/g, '')}`)};
    `;
    try {
      await executeRawSql(sql);
    } catch (err: any) {
      for (const [id, f] of removed) {
        this.folders.set(id, f);
      }
      console.error('[ActionPlanRepository] DB delete failed:', err.message);
      throw err;
    }

    return removed.length > 0;
  }
}

export const actionPlanRepository = new ActionPlanRepository();
