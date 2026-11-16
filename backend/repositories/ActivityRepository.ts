import { Activity } from '../../src/types';
import { INITIAL_ACTIVITIES, isCollegeOrg, getInitialTimelineForActionPlan, getWorkflowTimelineForOrg } from '../../src/data/initialData';
import { canonicalOrgId } from '../../src/utils/organizationUtils';
import { extractCalendarDaysFromWeekLabel, resolveActivityDates } from '../../src/utils/activityDate';
import { query, executeRawSql, sqlEscape, sqlText } from '../database';

function normalizeIsoDate(raw: unknown, fallback = '2026-06-01'): string {
  if (typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const monthNum = Number(m);
    const dayNum = Number(d);
    if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
      return `${y}-${m}-${d}`;
    }
  }
  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString().split('T')[0];
  }
  return fallback;
}

function buildOrgMatchCandidates(orgId: string): string[] {
  const clean = (orgId || '').trim().toUpperCase();
  const canon = canonicalOrgId(orgId).toUpperCase();
  const set = new Set<string>([clean, canon]);
  if (canon === 'CFMS' || clean === 'CMFS') {
    set.add('CFMS');
    set.add('CMFS');
  }
  if (canon === 'SENSSO' || clean === 'SENSO' || clean === 'SENSSO') {
    set.add('SENSO');
    set.add('SENSSO');
  }
  return Array.from(set).filter(Boolean);
}

function mapApprovalDecisionStatus(decision?: string): 'Pending' | 'Approved' | 'Rejected' | 'Deferred' | 'Revision Requested' {
  const upper = (decision || '').toUpperCase();
  if (upper.includes('APPROV') || upper.includes('ENDORS')) return 'Approved';
  if (upper.includes('REJECT')) return 'Rejected';
  if (upper.includes('DEFER')) return 'Deferred';
  if (upper.includes('REVIS') || upper.includes('RETURN')) return 'Revision Requested';
  return 'Pending';
}

function computeProgressPercent(activity: Activity): number {
  if (typeof (activity as any).progress === 'number') {
    return Math.max(0, Math.min(100, Math.round((activity as any).progress)));
  }
  if (activity.accomplishmentForm?.isCompleted && (activity.status === 'Approved' || activity.approvalStatus === 'Fully Approved')) {
    return 100;
  }
  const timeline = activity.timeline || [];
  if (timeline.length > 0) {
    const completed = timeline.filter(s => s.status === 'completed').length;
    return Math.max(10, Math.min(100, Math.round((completed / timeline.length) * 100)));
  }
  if (activity.status === 'Approved' || activity.approvalStatus === 'Fully Approved') return 100;
  if (activity.designForm?.isCompleted) return 35;
  return 10;
}

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
          (schedule_start AT TIME ZONE 'Asia/Manila')::date::text as "startDate",
          (schedule_end AT TIME ZONE 'Asia/Manila')::date::text as "endDate",
          (schedule_start AT TIME ZONE 'Asia/Manila')::date::text as "scheduleStart",
          (schedule_end AT TIME ZONE 'Asia/Manila')::date::text as "scheduleEnd",
          (schedule_start AT TIME ZONE 'Asia/Manila')::date::text as date,
          target_participants as "targetParticipants",
          status,
          progress,
          org_id_code as "orgId",
          fiscal_year as "fiscalYear",
          target_outputs as "targetOutputs",
          target_outputs as "expectedOutput",
          (
            SELECT string_agg(o.objective_text, E'\n' ORDER BY o.objective_id)
            FROM apmams.activity_objectives o
            WHERE o.activity_id = apmams.activities.activity_id
          ) as "strategicObjectives",
          (
            SELECT f.funding_source
            FROM apmams.activity_financials f
            WHERE f.activity_id = apmams.activities.activity_id
            ORDER BY f.financial_id ASC
            LIMIT 1
          ) as "fundSource",
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

          const resolvedDates = resolveActivityDates({
            ...existing,
            ...row,
            designForm: resolvedDesignForm
          });

          let merged: Activity = {
            ...existing,
            ...row,
            id: row.id || existing.id,
            title: row.title || existing.title || 'Untitled Activity',
            orgId: row.orgId || existing.orgId || 'CBIT',
            venue: row.venue || existing.venue || row.designForm?.venue || 'MSU Naawan Campus',
            description:
              existing.description ||
              row.strategicObjectives ||
              existing.strategicObjectives ||
              row.designForm?.rationale ||
              '',
            proposedBy:
              existing.proposedBy ||
              row.designForm?.preparedByName ||
              `${row.orgId || existing.orgId || 'ORG'} Officer`,
            fiscalYear: row.fiscalYear || existing.fiscalYear,
            startDate: resolvedDates.startDate,
            endDate: resolvedDates.endDate,
            date: resolvedDates.startDate,
            status: row.status || existing.status,
            budget: Number(row.budget ?? existing.budget ?? 0),
            amount: Number(row.budget ?? existing.budget ?? 0),
            totalBudget: Number(row.allocatedBudget ?? existing.totalBudget ?? row.budget ?? 0),
            designForm: resolvedDesignForm,
            timeline: row.timeline || existing.timeline || [],
            timeframeMonth: row.timeframeMonth || existing.timeframeMonth,
            timeframeWeek: row.timeframeWeek || existing.timeframeWeek,
            selectedDates: (
              Array.isArray(existing.selectedDates) && existing.selectedDates.length > 0
                ? existing.selectedDates
                : extractCalendarDaysFromWeekLabel(
                    row.timeframeWeek || existing.timeframeWeek,
                    row.timeframeMonth || existing.timeframeMonth,
                    row.fiscalYear || existing.fiscalYear
                  )
            ),
            strategicObjectives: row.strategicObjectives || existing.strategicObjectives,
            expectedOutput: row.expectedOutput || row.targetOutputs || existing.expectedOutput,
            fundSource: row.fundSource || existing.fundSource,
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
            await this.save(merged);
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

  public async save(activity: Activity, actorUserId?: string): Promise<Activity> {
    const previousSnapshot = this.activities.get(activity.id);
    const toPersist: Activity = { ...activity };
    this.activities.set(toPersist.id, toPersist);

    const actAny = toPersist as any;
    const yearDigits = String(toPersist.fiscalYear || '').match(/\d{4}/)?.[0] || '2027';
    const resolvedDates = resolveActivityDates(toPersist);
    const startDate = resolvedDates.startDate;
    const endDate = resolvedDates.endDate;
    toPersist.startDate = startDate;
    toPersist.endDate = endDate;
    const category = String(toPersist.strategicPillar || actAny.category || 'Institutional Development').slice(0, 150);
    const targetOutputs = toPersist.expectedOutput || actAny.targetOutputs || '';
    const kpis = toPersist.kpiOutcome || actAny.keyPerformanceIndicators || '';
    const budget = Number(toPersist.designForm?.proposedBudget ?? toPersist.budget ?? toPersist.amount ?? 0) || 0;
    const allocatedBudget = Number(toPersist.totalBudget ?? actAny.allocatedBudget ?? budget) || 0;
    const expenses = Number(toPersist.accomplishmentForm?.actualBudget ?? actAny.expenses ?? 0) || 0;
    const progressPercent = computeProgressPercent(toPersist);

    const orgCandidates = buildOrgMatchCandidates(toPersist.orgId);
    const orgMatchSql = orgCandidates.map(c => sqlEscape(c)).join(', ');

    const resolvedActionPlanExpr = `COALESCE(
      (SELECT action_plan_id FROM apmams.action_plans WHERE fiscal_year ILIKE ${sqlEscape('%' + yearDigits + '%')} OR folder_id ILIKE ${sqlEscape('%' + yearDigits + '%')} ORDER BY action_plan_id ASC LIMIT 1),
      (SELECT action_plan_id FROM apmams.action_plans ORDER BY action_plan_id ASC LIMIT 1)
    )`;

    const resolvedOrgExpr = `COALESCE(
      (SELECT organization_id FROM apmams.organizations WHERE UPPER(acronym) IN (${orgMatchSql}) OR UPPER(org_code) IN (${orgMatchSql}) ORDER BY organization_id ASC LIMIT 1),
      (SELECT organization_id FROM apmams.organizations ORDER BY organization_id ASC LIMIT 1)
    )`;

    const resolvedCreatorExpr = actorUserId
      ? `COALESCE((SELECT user_id FROM apmams.users WHERE app_user_id = ${sqlEscape(actorUserId)} LIMIT 1), (SELECT user_id FROM apmams.users ORDER BY user_id ASC LIMIT 1))`
      : `(SELECT user_id FROM apmams.users ORDER BY user_id ASC LIMIT 1)`;

    const fundingSource = String(
      toPersist.accomplishmentForm?.budgetSource ||
      toPersist.designForm?.budgetSource ||
      toPersist.fundSource ||
      'Student Activity Fund'
    ).slice(0, 150);

    const isAccompSubmitted = Boolean(toPersist.accomplishmentForm?.isCompleted);
    const isFullyApproved = toPersist.status === 'Approved' || toPersist.approvalStatus === 'Fully Approved';
    const financialStatus = isAccompSubmitted
      ? (isFullyApproved ? 'Liquidated' : 'Reconciled')
      : String(toPersist.status || 'Draft').slice(0, 50);

    // Connected normalized objectives (Activity / DAD / Accomplishment)
    const objectivesList: string[] = (
      toPersist.designForm?.objectivesList?.filter(Boolean) ||
      toPersist.accomplishmentForm?.objectives?.filter(Boolean) ||
      (toPersist.strategicObjectives ? [toPersist.strategicObjectives] : [])
    )
      .map(s => String(s).trim())
      .filter(Boolean);

    const objectiveInsertsSql = objectivesList.length > 0
      ? `
        DELETE FROM apmams.activity_objectives WHERE activity_id = v_activity_id;
        ${objectivesList.map(obj => `
          INSERT INTO apmams.activity_objectives (activity_id, objective_text, target_indicator)
          VALUES (v_activity_id, ${sqlText(obj)}, ${sqlText(targetOutputs || 'See expected output')});
        `).join('\n')}
      `
      : '';

    // Connected normalized milestone requirements checklist
    const reqItems = [
      { title: 'Detailed Activity Design (DAD) Form', done: Boolean(toPersist.designForm?.isCompleted) },
      { title: 'Scanned Approved DAD', done: Boolean(toPersist.accomplishmentForm?.scannedDadFile) },
      { title: 'Special Order (SO)', done: Boolean(toPersist.accomplishmentForm?.specialOrderFile) },
      { title: 'Attendance Record', done: Boolean(toPersist.accomplishmentForm?.attendanceFile) },
      { title: 'Program Flow', done: Boolean(toPersist.accomplishmentForm?.programFlowFile) },
      { title: 'Accomplishment Report Submission', done: Boolean(toPersist.accomplishmentForm?.isCompleted) }
    ];

    const requirementsSql = `
      DELETE FROM apmams.activity_requirements WHERE activity_id = v_activity_id;
      ${reqItems.map(r => `
        INSERT INTO apmams.activity_requirements (activity_id, title, is_completed, completed_at)
        VALUES (
          v_activity_id,
          ${sqlEscape(r.title)},
          ${r.done ? 'TRUE' : 'FALSE'},
          ${r.done ? 'CURRENT_TIMESTAMP' : 'NULL'}
        );
      `).join('\n')}
    `;

    // Connected normalized approvals (approvalDecisions + workflowHistory decisions)
    const decisions = Array.isArray(toPersist.approvalDecisions) ? toPersist.approvalDecisions : [];
    const approvalsSql = decisions.length > 0
      ? `
        DELETE FROM apmams.approvals WHERE activity_id = v_activity_id;
        ${decisions.map(d => `
          INSERT INTO apmams.approvals (activity_id, approver_id, stage_name, status, remarks, decided_at)
          VALUES (
            v_activity_id,
            ${d.approverId ? `(SELECT user_id FROM apmams.users WHERE app_user_id = ${sqlEscape(d.approverId)} LIMIT 1)` : 'NULL'},
            ${sqlEscape(String(d.stageName || 'Review').slice(0, 150))},
            ${sqlEscape(mapApprovalDecisionStatus(d.decision))},
            ${d.remarks ? sqlText(d.remarks) : 'NULL'},
            ${d.timestamp ? sqlEscape(d.timestamp) : 'CURRENT_TIMESTAMP'}
          );
        `).join('\n')}
      `
      : '';

    // Connected calendar event sync (active scheduled activities)
    const isRejected = toPersist.status === 'Rejected' || toPersist.approvalStatus === 'Rejected';
    const calendarSql = isRejected
      ? `DELETE FROM apmams.calendar_events WHERE activity_id = v_activity_id;`
      : `
        INSERT INTO apmams.calendar_events (activity_id, organization_id, title, start_at, end_at, venue)
        VALUES (
          v_activity_id,
          v_org_id,
          ${sqlText(String(toPersist.title || 'Untitled Activity').slice(0, 255))},
          ${sqlEscape(`${startDate}T08:00:00+08:00`)}::timestamptz,
          ${sqlEscape(`${endDate}T17:00:00+08:00`)}::timestamptz,
          ${sqlText(String(toPersist.venue || toPersist.designForm?.venue || 'MSU Naawan Campus').slice(0, 255))}
        )
        ON CONFLICT (activity_id) WHERE activity_id IS NOT NULL DO UPDATE SET
          organization_id = EXCLUDED.organization_id,
          title = EXCLUDED.title,
          start_at = EXCLUDED.start_at,
          end_at = EXCLUDED.end_at,
          venue = EXCLUDED.venue;
      `;

    const progressRemark = String(toPersist.approvalStage || toPersist.status || 'Draft');

    const sql = `
      BEGIN;
      DO $$
      DECLARE
        v_plan_id bigint;
        v_org_id bigint;
        v_creator_id bigint;
        v_activity_id bigint;
        v_last_pct integer;
        v_last_remark text;
      BEGIN
        v_plan_id := ${resolvedActionPlanExpr};
        v_org_id := ${resolvedOrgExpr};
        v_creator_id := ${resolvedCreatorExpr};

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
          v_plan_id,
          v_org_id,
          ${sqlText(String(toPersist.title || 'Untitled Activity').slice(0, 255))},
          ${sqlEscape(category)},
          ${sqlText(String(toPersist.venue || toPersist.designForm?.venue || 'MSU Naawan Campus').slice(0, 255))},
          ${sqlEscape(startDate)}::date,
          ${sqlEscape(endDate)}::date,
          ${Math.max(0, Math.floor(Number(toPersist.targetParticipants || 50)))},
          ${sqlEscape(String(toPersist.status || 'Draft').slice(0, 50))},
          ${progressPercent},
          v_creator_id,
          ${sqlEscape(toPersist.id.slice(0, 50))},
          ${sqlEscape(String(toPersist.orgId).slice(0, 50))},
          ${sqlEscape(String(toPersist.fiscalYear || `FY ${yearDigits}`).slice(0, 50))},
          ${sqlText(targetOutputs)},
          ${sqlText(kpis)},
          ${budget},
          ${allocatedBudget},
          ${expenses},
          ${sqlEscape(String(toPersist.source || 'ACTION_PLAN').slice(0, 50))},
          ${sqlEscape(String(toPersist.workflowStatus || 'DRAFT').slice(0, 50))},
          ${sqlEscape(String(toPersist.approvalStage || 'Stage 1: Organization Submission').slice(0, 150))},
          ${sqlEscape(toPersist.timeline || [])},
          ${sqlEscape(toPersist.designForm || null)},
          ${sqlEscape(toPersist.accomplishmentForm || null)},
          ${sqlEscape(actAny.financialPlan || null)},
          ${toPersist.timeframeMonth ? sqlEscape(String(toPersist.timeframeMonth).slice(0, 50)) : 'NULL'},
          ${toPersist.timeframeWeek ? sqlEscape(String(toPersist.timeframeWeek).slice(0, 50)) : 'NULL'},
          ${toPersist.lineItemBudget ? sqlText(toPersist.lineItemBudget) : 'NULL'},
          ${sqlEscape(toPersist.budgetLineItems || [])},
          ${sqlEscape(String(toPersist.approvalStatus || toPersist.status || 'Draft').slice(0, 50))},
          ${Math.max(1, Math.floor(Number(toPersist.approvalStageIndex || 1)))},
          ${toPersist.currentApproverRole ? sqlEscape(String(toPersist.currentApproverRole).slice(0, 100)) : 'NULL'},
          ${sqlEscape(toPersist.approvalDecisions || [])},
          ${toPersist.rejectionRemarks ? sqlText(toPersist.rejectionRemarks) : 'NULL'},
          ${toPersist.rejectedBy ? sqlEscape(String(toPersist.rejectedBy).slice(0, 100)) : 'NULL'},
          ${toPersist.rejectedAt ? sqlEscape(toPersist.rejectedAt) : 'NULL'},
          ${(toPersist.deferredRemarks || toPersist.deferReason) ? sqlText(toPersist.deferredRemarks || toPersist.deferReason) : 'NULL'},
          ${toPersist.isPlanConfirmed ? 'TRUE' : 'FALSE'},
          ${toPersist.confirmedBy ? sqlEscape(String(toPersist.confirmedBy).slice(0, 100)) : 'NULL'},
          ${toPersist.confirmedAt ? sqlEscape(toPersist.confirmedAt) : 'NULL'},
          ${toPersist.actionPlanStatus ? sqlEscape(String(toPersist.actionPlanStatus).slice(0, 50)) : 'NULL'},
          ${toPersist.actionPlanDecision ? sqlEscape(String(toPersist.actionPlanDecision).slice(0, 50)) : 'NULL'},
          ${Math.max(1, Math.floor(Number(toPersist.version || 1)))}
        )
        ON CONFLICT (app_activity_id) DO UPDATE SET
          action_plan_id = COALESCE(EXCLUDED.action_plan_id, apmams.activities.action_plan_id),
          organization_id = COALESCE(EXCLUDED.organization_id, apmams.activities.organization_id),
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
          version = EXCLUDED.version,
          updated_at = CURRENT_TIMESTAMP
        RETURNING activity_id INTO v_activity_id;

        -- 1. Sync Financial Record
        INSERT INTO apmams.activity_financials (
          activity_id, estimated_budget, actual_expense, funding_source, financial_status, updated_at
        ) VALUES (
          v_activity_id,
          ${budget},
          ${expenses},
          ${sqlEscape(fundingSource)},
          ${sqlEscape(financialStatus)},
          CURRENT_TIMESTAMP
        )
        ON CONFLICT (activity_id) WHERE activity_id IS NOT NULL DO UPDATE SET
          estimated_budget = EXCLUDED.estimated_budget,
          actual_expense = EXCLUDED.actual_expense,
          funding_source = EXCLUDED.funding_source,
          financial_status = EXCLUDED.financial_status,
          updated_at = CURRENT_TIMESTAMP;

        -- 2. Sync Objectives
        ${objectiveInsertsSql}

        -- 3. Sync Requirements Checklist
        ${requirementsSql}

        -- 4. Sync Workflow Approvals
        ${approvalsSql}

        -- 5. Sync Progress Snapshot when stage/percentage changes
        SELECT progress_percent, remarks INTO v_last_pct, v_last_remark
        FROM apmams.activity_progress
        WHERE activity_id = v_activity_id
        ORDER BY progress_id DESC
        LIMIT 1;

        IF v_last_pct IS DISTINCT FROM ${progressPercent} OR v_last_remark IS DISTINCT FROM ${sqlText(progressRemark)} THEN
          INSERT INTO apmams.activity_progress (activity_id, recorded_by, progress_percent, remarks)
          VALUES (v_activity_id, v_creator_id, ${progressPercent}, ${sqlText(progressRemark)});
        END IF;

        -- 6. Sync Calendar Event
        ${calendarSql}

        -- 7. Update Action Plan summary metrics for the linked folder
        IF v_plan_id IS NOT NULL THEN
          UPDATE apmams.action_plans ap SET
            total_activities = COALESCE((SELECT count(*) FROM apmams.activities a WHERE a.action_plan_id = v_plan_id), 0),
            approved_count = COALESCE((SELECT count(*) FROM apmams.activities a WHERE a.action_plan_id = v_plan_id AND (a.status = 'Approved' OR a.approval_status = 'Fully Approved')), 0),
            pending_count = COALESCE((SELECT count(*) FROM apmams.activities a WHERE a.action_plan_id = v_plan_id AND a.status NOT IN ('Approved', 'Rejected')), 0),
            total_budget = COALESCE((SELECT sum(COALESCE(a.budget, 0)) FROM apmams.activities a WHERE a.action_plan_id = v_plan_id), 0),
            updated_at = CURRENT_TIMESTAMP
          WHERE ap.action_plan_id = v_plan_id;
        END IF;
      END $$;
      COMMIT;
    `;

    try {
      await executeRawSql(sql);
      return { ...toPersist };
    } catch (err: any) {
      // Roll back in-memory cache so memory never diverges from persisted PostgreSQL state
      if (previousSnapshot) {
        this.activities.set(toPersist.id, previousSnapshot);
      } else {
        this.activities.delete(toPersist.id);
      }
      console.error('[ActivityRepository] DB save failed:', err?.message || err);
      throw err;
    }
  }

  public async batchSave(activities: Activity[], actorUserId?: string): Promise<Activity[]> {
    const savedList: Activity[] = [];
    for (const act of activities) {
      const saved = await this.save(act, actorUserId);
      savedList.push(saved);
    }
    return savedList;
  }

  public async deleteById(id: string): Promise<boolean> {
    const existing = this.activities.get(id);
    const deleted = this.activities.delete(id);
    const sql = `
      BEGIN;
      DO $$
      DECLARE
        v_plan_id bigint;
      BEGIN
        SELECT action_plan_id INTO v_plan_id FROM apmams.activities WHERE app_activity_id = ${sqlEscape(id)} LIMIT 1;
        DELETE FROM apmams.activities WHERE app_activity_id = ${sqlEscape(id)};
        IF v_plan_id IS NOT NULL THEN
          UPDATE apmams.action_plans ap SET
            total_activities = COALESCE((SELECT count(*) FROM apmams.activities a WHERE a.action_plan_id = v_plan_id), 0),
            approved_count = COALESCE((SELECT count(*) FROM apmams.activities a WHERE a.action_plan_id = v_plan_id AND (a.status = 'Approved' OR a.approval_status = 'Fully Approved')), 0),
            pending_count = COALESCE((SELECT count(*) FROM apmams.activities a WHERE a.action_plan_id = v_plan_id AND a.status NOT IN ('Approved', 'Rejected')), 0),
            total_budget = COALESCE((SELECT sum(COALESCE(a.budget, 0)) FROM apmams.activities a WHERE a.action_plan_id = v_plan_id), 0),
            updated_at = CURRENT_TIMESTAMP
          WHERE ap.action_plan_id = v_plan_id;
        END IF;
      END $$;
      COMMIT;
    `;
    try {
      await executeRawSql(sql);
      return deleted;
    } catch (err: any) {
      if (existing) this.activities.set(id, existing);
      console.error('[ActivityRepository] DB delete failed:', err?.message || err);
      throw err;
    }
  }

  public resetAllToStageOne(): Activity[] {
    this.seedDefaults();
    return this.findAll();
  }
}

export const activityRepository = new ActivityRepository();
