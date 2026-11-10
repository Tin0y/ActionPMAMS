import { Activity } from '../../src/types';
import { INITIAL_ACTIVITIES, isCollegeOrg, getInitialTimelineForActionPlan, getWorkflowTimelineForOrg } from '../../src/data/initialData';
import { query, executeRawSql, sqlEscape } from '../database';

export class ActivityRepository {
  private activities: Map<string, Activity> = new Map();
  private isLoaded = false;

  constructor() {
    this.seedDefaults();
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
          financial_plan as "financialPlan",
          timeframe_month as "timeframeMonth",
          timeframe_week as "timeframeWeek",
          line_item_budget as "lineItemBudget",
          budget_line_items as "budgetLineItems",
          approval_status as "approvalStatus",
          approval_stage_index as "approvalStageIndex",
          current_approver_role as "currentApproverRole",
          approval_decisions as "approvalDecisions",
          rejection_remarks as "rejectionRemarks",
          rejected_by as "rejectedBy",
          rejected_at as "rejectedAt",
          deferred_remarks as "deferredRemarks",
          COALESCE(is_plan_confirmed, false) as "isPlanConfirmed",
          confirmed_by as "confirmedBy",
          confirmed_at as "confirmedAt",
          action_plan_status as "actionPlanStatus",
          action_plan_decision as "actionPlanDecision",
          version
        FROM apmams.activities
        ORDER BY activity_id ASC;
      `);

      if (rows && rows.length > 0) {
        let normalizedCount = 0;
        for (const row of rows) {
          const existing = this.activities.get(row.id) || ({} as Activity);
          const isHistoricalSeedWithDad =
            row.id?.startsWith('ACT-2026-') &&
            row.id !== 'ACT-2026-012' &&
            Boolean(existing.designForm?.isCompleted);

          const resolvedDesignForm = row.designForm?.isCompleted
            ? row.designForm
            : isHistoricalSeedWithDad
              ? existing.designForm
              : (row.designForm || undefined);

          let merged: Activity = {
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
            designForm: resolvedDesignForm,
            timeline: row.timeline || existing.timeline || [],
            timeframeMonth: row.timeframeMonth || existing.timeframeMonth,
            timeframeWeek: row.timeframeWeek || existing.timeframeWeek,
            lineItemBudget: row.lineItemBudget || existing.lineItemBudget,
            budgetLineItems: row.budgetLineItems || existing.budgetLineItems || [],
            approvalStatus: row.approvalStatus || existing.approvalStatus || (row.status as any),
            approvalStageIndex: row.approvalStageIndex || existing.approvalStageIndex || 1,
            currentApproverRole: row.currentApproverRole || existing.currentApproverRole,
            approvalDecisions: row.approvalDecisions || existing.approvalDecisions || [],
            rejectionRemarks: row.rejectionRemarks || existing.rejectionRemarks,
            rejectedBy: row.rejectedBy || existing.rejectedBy,
            rejectedAt: row.rejectedAt || existing.rejectedAt,
            deferredRemarks: row.deferredRemarks || existing.deferredRemarks,
            actionPlanStatus: row.actionPlanStatus || existing.actionPlanStatus,
            actionPlanDecision: row.actionPlanDecision || existing.actionPlanDecision,
            version: row.version || existing.version || 1
          };

          let needsDbSync = Boolean(!row.designForm?.isCompleted && resolvedDesignForm?.isCompleted);

          // Action Plan tracking:
          const isActionPlanRecord = Boolean(
            merged.isActionPlanItem ||
            merged.source === 'ACTION_PLAN' ||
            merged.isPlanConfirmed !== undefined ||
            merged.id?.startsWith('ACT-2027-') ||
            merged.fiscalYear?.includes('2027')
          );

          if (isActionPlanRecord) {
            merged.isActionPlanItem = true;
            merged.source = 'ACTION_PLAN';
            if (row.actionPlanStatus) {
              merged.actionPlanStatus = row.actionPlanStatus;
            } else if (merged.isPlanConfirmed || merged.status === 'Approved' || merged.approvalStatus === 'Fully Approved') {
              merged.actionPlanStatus = 'Approved';
            } else if (merged.status === 'Rejected' || merged.approvalStatus === 'Rejected') {
              merged.actionPlanStatus = 'Rejected';
            }
          }

          // Enforce rule for DAD workflow: Any activity without a filled-out and submitted DAD form CANNOT advance past Stage 1 and MUST be Draft
          if (
            !merged.designForm?.isCompleted &&
            merged.status !== 'Rejected' &&
            merged.approvalStatus !== 'Rejected' &&
            merged.actionPlanStatus !== 'Rejected'
          ) {
            const expectedStage = isCollegeOrg(merged.orgId)
              ? 'Stage 1: College Organization Submission'
              : 'Stage 1: Organization Submission';
            const timelineInvalid =
              !merged.timeline ||
              merged.timeline.length === 0 ||
              merged.timeline[0]?.status !== 'in_progress' ||
              merged.timeline.some((s, idx) => idx > 0 && s.status !== 'pending');

            if (
              merged.status !== 'Draft' ||
              merged.approvalStatus !== 'Draft' ||
              merged.workflowStatus !== 'DRAFT' ||
              merged.approvalStageIndex !== 1 ||
              merged.approvalStage !== expectedStage ||
              timelineInvalid
            ) {
              merged = {
                ...merged,
                status: 'Draft',
                workflowStatus: 'DRAFT',
                approvalStatus: 'Draft',
                approvalStageIndex: 1,
                approvalStage: expectedStage,
                timeline: getInitialTimelineForActionPlan(merged.orgId)
              };
              needsDbSync = true;
              normalizedCount++;
            }
          } else if (
            merged.designForm?.isCompleted &&
            (merged.approvalStageIndex === undefined || merged.approvalStageIndex <= 1) &&
            merged.status !== 'Rejected' &&
            merged.approvalStatus !== 'Rejected'
          ) {
            merged = {
              ...merged,
              approvalStageIndex: 2,
              status: 'Pending',
              workflowStatus: 'IN_PROGRESS',
              approvalStatus: 'Pending Review',
              approvalStage: 'Stage 2: Assigned Adviser Review',
              currentApproverRole: 'ROLE_ADVISER',
              timeline: getWorkflowTimelineForOrg(merged.orgId, true)
            };
            needsDbSync = true;
            normalizedCount++;
          }

          this.activities.set(merged.id, merged);
          if (needsDbSync) {
            this.save(merged);
          }
        }
        this.isLoaded = true;
        console.log(`[ActivityRepository] Loaded ${rows.length} activities from PostgreSQL (${normalizedCount} normalized to Stage 1 Draft without DAD).`);
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
        design_form, accomplishment_form, financial_plan,
        timeframe_month, timeframe_week, line_item_budget, budget_line_items,
        approval_status, approval_stage_index, current_approver_role,
        approval_decisions, rejection_remarks, rejected_by, rejected_at,
        deferred_remarks, is_plan_confirmed, confirmed_by, confirmed_at,
        action_plan_status, action_plan_decision, version
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
        ${sqlEscape(actAny.financialPlan || null)},
        ${sqlEscape(activity.timeframeMonth || null)},
        ${sqlEscape(activity.timeframeWeek || null)},
        ${sqlEscape(activity.lineItemBudget || null)},
        ${sqlEscape(activity.budgetLineItems || [])},
        ${sqlEscape(activity.approvalStatus || activity.status || 'Draft')},
        ${activity.approvalStageIndex || 1},
        ${sqlEscape(activity.currentApproverRole || null)},
        ${sqlEscape(activity.approvalDecisions || [])},
        ${sqlEscape(activity.rejectionRemarks || null)},
        ${sqlEscape(activity.rejectedBy || null)},
        ${activity.rejectedAt ? sqlEscape(activity.rejectedAt) : 'NULL'},
        ${sqlEscape(activity.deferredRemarks || activity.deferReason || null)},
        ${activity.isPlanConfirmed ? 'TRUE' : 'FALSE'},
        ${sqlEscape(activity.confirmedBy || null)},
        ${activity.confirmedAt ? sqlEscape(activity.confirmedAt) : 'NULL'},
        ${sqlEscape(activity.actionPlanStatus || null)},
        ${sqlEscape(activity.actionPlanDecision || null)},
        ${activity.version || 1}
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
        financial_plan = EXCLUDED.financial_plan,
        timeframe_month = EXCLUDED.timeframe_month,
        timeframe_week = EXCLUDED.timeframe_week,
        line_item_budget = EXCLUDED.line_item_budget,
        budget_line_items = EXCLUDED.budget_line_items,
        approval_status = EXCLUDED.approval_status,
        approval_stage_index = EXCLUDED.approval_stage_index,
        current_approver_role = EXCLUDED.current_approver_role,
        approval_decisions = EXCLUDED.approval_decisions,
        rejection_remarks = EXCLUDED.rejection_remarks,
        rejected_by = EXCLUDED.rejected_by,
        rejected_at = EXCLUDED.rejected_at,
        deferred_remarks = EXCLUDED.deferred_remarks,
        is_plan_confirmed = EXCLUDED.is_plan_confirmed,
        confirmed_by = EXCLUDED.confirmed_by,
        confirmed_at = EXCLUDED.confirmed_at,
        action_plan_status = EXCLUDED.action_plan_status,
        action_plan_decision = EXCLUDED.action_plan_decision,
        version = EXCLUDED.version;

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


  public batchSave(activities: Activity[]): Activity[] {
    const savedList: Activity[] = [];
    for (const act of activities) {
      savedList.push(this.save(act));
    }
    return savedList;
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
