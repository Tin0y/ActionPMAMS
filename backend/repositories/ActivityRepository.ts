import { Activity } from '../../src/types';
import { INITIAL_ACTIVITIES } from '../../src/data/initialData';
import { query, executeRawSql, sqlEscape } from '../database';

export class ActivityRepository {
  private activities: Map<string, Activity> = new Map();
  private isLoaded = false;

  constructor() {
    this.seedDefaults();
    this.loadFromDatabase().catch(err => {
      console.warn('[ActivityRepository] Failed initial DB load, using defaults:', err.message);
    });
  }

  private seedDefaults() {
    for (const act of INITIAL_ACTIVITIES) {
      const cloned: Activity = JSON.parse(JSON.stringify(act));
      this.activities.set(cloned.id, cloned);
    }
  }

  public async loadFromDatabase(): Promise<void> {
    try {
      const rows = await query<any>(`
        SELECT 
          app_activity_id as id,
          title,
          category,
          venue,
          schedule_start::text as "scheduleStart",
          schedule_end::text as "scheduleEnd",
          schedule_start::text as date,
          target_participants as "targetParticipants",
          status,
          progress,
          org_id_code as "orgId",
          fiscal_year as "fiscalYear",
          target_outputs as "targetOutputs",
          key_performance_indicators as "keyPerformanceIndicators",
          budget::float as budget,
          allocated_budget::float as "allocatedBudget",
          expenses::float as expenses,
          source,
          workflow_status as "workflowStatus",
          approval_stage as "approvalStage",
          timeline,
          design_form as "designForm",
          accomplishment_form as "accomplishmentForm",
          financial_plan as "financialPlan"
        FROM apmams.activities
        ORDER BY activity_id ASC;
      `);

      if (rows && rows.length > 0) {
        for (const row of rows) {
          const existing = this.activities.get(row.id) || {} as Activity;
          this.activities.set(row.id, {
            ...existing,
            ...row,
            id: row.id || existing.id,
            title: row.title || existing.title,
            orgId: row.orgId || existing.orgId,
            fiscalYear: row.fiscalYear || existing.fiscalYear,
            status: row.status || existing.status,
            budget: Number(row.budget ?? existing.budget ?? 0),
            amount: Number(row.budget ?? existing.budget ?? 0),
            totalBudget: Number(row.allocatedBudget ?? existing.totalBudget ?? row.budget ?? 0),
            timeline: row.timeline || existing.timeline || []
          });
        }
        this.isLoaded = true;
        console.log(`[ActivityRepository] Loaded ${rows.length} activities from PostgreSQL.`);
      }
    } catch (err: any) {
      console.warn('[ActivityRepository] loadFromDatabase error:', err.message);
    }
  }

  public findAll(filter?: { orgId?: string; fiscalYear?: string; status?: string }): Activity[] {
    let list = Array.from(this.activities.values());
    if (filter?.orgId && filter.orgId !== 'ALL') {
      list = list.filter(a => a.orgId.toUpperCase() === filter.orgId!.toUpperCase());
    }
    if (filter?.fiscalYear) {
      list = list.filter(a => a.fiscalYear === filter.fiscalYear);
    }
    if (filter?.status) {
      list = list.filter(a => a.status === filter.status);
    }
    return list;
  }

  public findById(id: string): Activity | undefined {
    return this.activities.get(id);
  }

  public save(activity: Activity): Activity {
    this.activities.set(activity.id, { ...activity });

    const actAny = activity as any;
    const startDate = activity.startDate || actAny.scheduleStart || actAny.date || '2026-06-01';
    const endDate = activity.endDate || actAny.scheduleEnd || actAny.date || startDate;
    const category = activity.strategicPillar || actAny.category || 'Institutional Development';
    const targetOutputs = activity.expectedOutput || actAny.targetOutputs || '';
    const kpis = activity.kpiOutcome || actAny.keyPerformanceIndicators || '';
    const budget = activity.budget || activity.amount || 0;
    const allocatedBudget = activity.totalBudget || actAny.allocatedBudget || budget;
    const expenses = actAny.expenses || 0;

    // Asynchronously persist to PostgreSQL
    const sql = `
      INSERT INTO apmams.activities (
        action_plan_id, organization_id, title, category, venue, schedule_start, schedule_end,
        target_participants, status, progress, created_by,
        app_activity_id, org_id_code, fiscal_year, target_outputs, key_performance_indicators,
        budget, allocated_budget, expenses, source, workflow_status, approval_stage, timeline,
        design_form, accomplishment_form, financial_plan
      ) VALUES (
        COALESCE((SELECT action_plan_id FROM apmams.action_plans WHERE fiscal_year = ${sqlEscape(activity.fiscalYear)} LIMIT 1), 1),
        COALESCE((SELECT organization_id FROM apmams.organizations WHERE acronym = ${sqlEscape(activity.orgId)} LIMIT 1), 1),
        ${sqlEscape(activity.title)},
        ${sqlEscape(category)},
        ${sqlEscape(activity.venue || 'MSU Naawan Campus')},
        ${sqlEscape(startDate)},
        ${sqlEscape(endDate)},
        ${activity.targetParticipants || 50},
        ${sqlEscape(activity.status || 'Pending')},
        ${activity.status === 'Approved' ? 100 : 25},
        COALESCE((SELECT user_id FROM apmams.users LIMIT 1), 1),
        ${sqlEscape(activity.id)},
        ${sqlEscape(activity.orgId)},
        ${sqlEscape(activity.fiscalYear || '2026')},
        ${sqlEscape(targetOutputs)},
        ${sqlEscape(kpis)},
        ${budget},
        ${allocatedBudget},
        ${expenses},
        ${sqlEscape(activity.source || 'ACTION_PLAN')},
        ${sqlEscape(activity.workflowStatus || 'DRAFT')},
        ${sqlEscape(activity.approvalStage || 'Stage 1: Organization Submission')},
        ${sqlEscape(activity.timeline || [])},
        ${sqlEscape(activity.designForm || null)},
        ${sqlEscape(activity.accomplishmentForm || null)},
        ${sqlEscape(actAny.financialPlan || null)}
      )
      ON CONFLICT (app_activity_id) DO UPDATE SET
        title = EXCLUDED.title,
        category = EXCLUDED.category,
        venue = EXCLUDED.venue,
        schedule_start = EXCLUDED.schedule_start,
        schedule_end = EXCLUDED.schedule_end,
        target_participants = EXCLUDED.target_participants,
        status = EXCLUDED.status,
        progress = EXCLUDED.progress,
        org_id_code = EXCLUDED.org_id_code,
        fiscal_year = EXCLUDED.fiscal_year,
        target_outputs = EXCLUDED.target_outputs,
        key_performance_indicators = EXCLUDED.key_performance_indicators,
        budget = EXCLUDED.budget,
        allocated_budget = EXCLUDED.allocated_budget,
        expenses = EXCLUDED.expenses,
        source = EXCLUDED.source,
        workflow_status = EXCLUDED.workflow_status,
        approval_stage = EXCLUDED.approval_stage,
        timeline = EXCLUDED.timeline,
        design_form = EXCLUDED.design_form,
        accomplishment_form = EXCLUDED.accomplishment_form,
        financial_plan = EXCLUDED.financial_plan;

      -- Update corresponding activity_financials
      INSERT INTO apmams.activity_financials (
        activity_id, estimated_budget, actual_expense, funding_source, financial_status
      ) VALUES (
        (SELECT activity_id FROM apmams.activities WHERE app_activity_id = ${sqlEscape(activity.id)} LIMIT 1),
        ${budget},
        ${expenses},
        'Student Activity Fund',
        ${sqlEscape(activity.status || 'Pending')}
      )
      ON CONFLICT (financial_id) DO UPDATE SET
        estimated_budget = EXCLUDED.estimated_budget,
        actual_expense = EXCLUDED.actual_expense,
        financial_status = EXCLUDED.financial_status;
    `;

    executeRawSql(sql).catch(err => {
      console.warn('[ActivityRepository] DB save failed:', err.message);
    });

    return { ...activity };
  }

  public deleteById(id: string): boolean {
    const deleted = this.activities.delete(id);
    const sql = `DELETE FROM apmams.activities WHERE app_activity_id = ${sqlEscape(id)};`;
    executeRawSql(sql).catch(err => {
      console.warn('[ActivityRepository] DB delete failed:', err.message);
    });
    return deleted;
  }

  public resetAllToStageOne(): Activity[] {
    this.seedDefaults();
    return this.findAll();
  }
}

export const activityRepository = new ActivityRepository();
