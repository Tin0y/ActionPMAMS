import { executeRawSql, queryRow, sqlEscape } from './database';
import { 
  ORGANIZATIONS, 
  INITIAL_USER_ACCOUNTS, 
  INITIAL_ACTION_PLAN_FOLDERS, 
  INITIAL_ACTIVITIES 
} from '../src/data/initialData';

export async function initPostgresDatabase(): Promise<void> {
  console.log('[PostgreSQL] Initializing and validating schema "apmams" in database "APMaMS"...');

  // 1. Schema DDL migrations (ensure all columns exist)
  const ddl = `
    SET search_path = apmams, public;

    -- Roles
    INSERT INTO apmams.roles (role_name) VALUES
      ('ROLE_ADMIN'),
      ('ROLE_OSD'),
      ('ROLE_DEAN'),
      ('ROLE_ADVISER'),
      ('ROLE_OVCSAS'),
      ('ROLE_ORGANIZATION'),
      ('ROLE_PRESIDENT'),
      ('ROLE_TREASURER'),
      ('System Administrator'),
      ('OSD Officer'),
      ('College Dean'),
      ('Faculty Adviser')
    ON CONFLICT (role_name) DO NOTHING;

    -- Update check constraints to support Draft and DEFERRED
    ALTER TABLE apmams.activities DROP CONSTRAINT IF EXISTS activities_status_check;
    ALTER TABLE apmams.activities ADD CONSTRAINT activities_status_check CHECK (
      status::text = ANY (ARRAY['Pending', 'Approved', 'Rejected', 'Draft', 'DEFERRED', 'DEFERRED FOR REVISION', 'Completed', 'IN_PROGRESS']::text[])
    );

    ALTER TABLE apmams.approvals DROP CONSTRAINT IF EXISTS approvals_status_check;
    ALTER TABLE apmams.approvals ADD CONSTRAINT approvals_status_check CHECK (
      status::text = ANY (ARRAY['Pending', 'Approved', 'Rejected', 'Deferred', 'Revision Requested']::text[])
    );

    -- Organizations
    ALTER TABLE apmams.organizations ADD COLUMN IF NOT EXISTS acronym varchar(50);
    ALTER TABLE apmams.organizations ADD COLUMN IF NOT EXISTS org_code varchar(50);
    ALTER TABLE apmams.organizations ADD COLUMN IF NOT EXISTS org_type varchar(50) DEFAULT 'COLLEGE';
    ALTER TABLE apmams.organizations ADD COLUMN IF NOT EXISTS president varchar(100);
    ALTER TABLE apmams.organizations ADD COLUMN IF NOT EXISTS email varchar(150);
    ALTER TABLE apmams.organizations ADD COLUMN IF NOT EXISTS registered_number varchar(100);
    ALTER TABLE apmams.organizations ADD COLUMN IF NOT EXISTS sub_orgs jsonb DEFAULT '[]'::jsonb;
    ALTER TABLE apmams.organizations ADD COLUMN IF NOT EXISTS nature varchar(255);
    ALTER TABLE apmams.organizations ADD COLUMN IF NOT EXISTS status varchar(50) DEFAULT 'Active';
    ALTER TABLE apmams.organizations ADD COLUMN IF NOT EXISTS date_of_application varchar(50);
    ALTER TABLE apmams.organizations ADD COLUMN IF NOT EXISTS member_count integer DEFAULT 0;
    ALTER TABLE apmams.organizations ADD COLUMN IF NOT EXISTS attachment_count integer DEFAULT 0;
    ALTER TABLE apmams.organizations ADD COLUMN IF NOT EXISTS color varchar(50);
    ALTER TABLE apmams.organizations ADD COLUMN IF NOT EXISTS faculty_adviser varchar(150);
    ALTER TABLE apmams.organizations ADD COLUMN IF NOT EXISTS office_location varchar(255);
    ALTER TABLE apmams.organizations ADD COLUMN IF NOT EXISTS objectives jsonb DEFAULT '[]'::jsonb;
    ALTER TABLE apmams.organizations ADD COLUMN IF NOT EXISTS members_list jsonb DEFAULT '[]'::jsonb;
    ALTER TABLE apmams.organizations ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;
    ALTER TABLE apmams.organizations DROP CONSTRAINT IF EXISTS uq_organizations_acronym;
    ALTER TABLE apmams.organizations ADD CONSTRAINT uq_organizations_acronym UNIQUE (acronym);

    -- Users
    ALTER TABLE apmams.users ADD COLUMN IF NOT EXISTS app_user_id varchar(50);
    ALTER TABLE apmams.users ADD COLUMN IF NOT EXISTS org_id_code varchar(50);
    ALTER TABLE apmams.users ADD COLUMN IF NOT EXISTS role_code varchar(50);
    ALTER TABLE apmams.users ADD COLUMN IF NOT EXISTS display_role varchar(100);
    ALTER TABLE apmams.users ADD COLUMN IF NOT EXISTS parent_org varchar(100);
    ALTER TABLE apmams.users ADD COLUMN IF NOT EXISTS actual_org varchar(100);
    ALTER TABLE apmams.users ADD COLUMN IF NOT EXISTS avatar varchar(100);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_app_user_id ON apmams.users(app_user_id) WHERE app_user_id IS NOT NULL;

    -- Action Plans
    ALTER TABLE apmams.action_plans ADD COLUMN IF NOT EXISTS folder_id varchar(50);
    ALTER TABLE apmams.action_plans ADD COLUMN IF NOT EXISTS org_id_code varchar(50);
    ALTER TABLE apmams.action_plans ADD COLUMN IF NOT EXISTS fiscal_year varchar(20);
    ALTER TABLE apmams.action_plans ADD COLUMN IF NOT EXISTS status varchar(50) DEFAULT 'Pending';
    ALTER TABLE apmams.action_plans ADD COLUMN IF NOT EXISTS total_activities integer DEFAULT 0;
    ALTER TABLE apmams.action_plans ADD COLUMN IF NOT EXISTS approved_count integer DEFAULT 0;
    ALTER TABLE apmams.action_plans ADD COLUMN IF NOT EXISTS pending_count integer DEFAULT 0;
    ALTER TABLE apmams.action_plans ADD COLUMN IF NOT EXISTS theme varchar(255);
    ALTER TABLE apmams.action_plans ADD COLUMN IF NOT EXISTS submission_deadline varchar(50);
    ALTER TABLE apmams.action_plans ADD COLUMN IF NOT EXISTS total_budget numeric DEFAULT 0;
    ALTER TABLE apmams.action_plans ADD COLUMN IF NOT EXISTS folder_number varchar(50);
    ALTER TABLE apmams.action_plans ADD COLUMN IF NOT EXISTS signatories jsonb DEFAULT '[]'::jsonb;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_action_plans_folder_id ON apmams.action_plans(folder_id) WHERE folder_id IS NOT NULL;

    -- Activities
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS app_activity_id varchar(50);
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS org_id_code varchar(50);
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS fiscal_year varchar(20);
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS target_outputs text;
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS key_performance_indicators text;
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS budget numeric DEFAULT 0;
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS allocated_budget numeric DEFAULT 0;
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS expenses numeric DEFAULT 0;
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS source varchar(50) DEFAULT 'ACTION_PLAN';
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS workflow_status varchar(50) DEFAULT 'DRAFT';
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS approval_stage varchar(150);
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS timeline jsonb DEFAULT '[]'::jsonb;
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS design_form jsonb;
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS accomplishment_form jsonb;
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS financial_plan jsonb;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_activities_app_id ON apmams.activities(app_activity_id) WHERE app_activity_id IS NOT NULL;
  `;

  await executeRawSql(ddl);

  // 2. Synchronize organizations into apmams.organizations
  console.log('[PostgreSQL] Synchronizing organizations into apmams.organizations...');
  for (const org of ORGANIZATIONS) {
    const subOrgs = (org as any).subOrgs || [];
    const sql = `
      INSERT INTO apmams.organizations (
        organization_name, acronym, org_code, description, president, email, registered_number, sub_orgs,
        nature, status, date_of_application, member_count, attachment_count, color, faculty_adviser, office_location,
        objectives, members_list, attachments
      ) VALUES (
        ${sqlEscape(org.name)},
        ${sqlEscape(org.id)},
        ${sqlEscape(org.id)},
        ${sqlEscape(org.description || org.nature || '')},
        ${sqlEscape(org.president || '')},
        ${sqlEscape(`${org.id.toLowerCase()}@msun.edu.ph`)},
        ${sqlEscape(org.registeredNumber || '')},
        ${sqlEscape(subOrgs)},
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
      ) ON CONFLICT (acronym) DO UPDATE SET
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
    await executeRawSql(sql);
  }

  // 3. Check if users need seeding
  const userCountRow = await queryRow<{ count: string }>('SELECT count(*) as count FROM apmams.users');
  const userCount = parseInt(userCountRow?.count || '0', 10);

  if (userCount === 0) {
    console.log('[PostgreSQL] Seeding user accounts into apmams.users...');
    for (const user of INITIAL_USER_ACCOUNTS) {
      const orgRow = await queryRow<{ organization_id: number }>(
        `SELECT organization_id FROM apmams.organizations WHERE acronym = ${sqlEscape(user.orgId)} LIMIT 1`
      );
      const roleRow = await queryRow<{ role_id: number }>(
        `SELECT role_id FROM apmams.roles WHERE role_name = ${sqlEscape(user.role)} OR role_name = 'ROLE_ORGANIZATION' LIMIT 1`
      );

      const orgIdVal = orgRow ? orgRow.organization_id : 'NULL';
      const roleIdVal = roleRow ? roleRow.role_id : 1;

      const sql = `
        INSERT INTO apmams.users (
          organization_id, role_id, first_name, last_name, email, is_active,
          app_user_id, org_id_code, role_code, display_role, parent_org, actual_org, avatar
        ) VALUES (
          ${orgIdVal},
          ${roleIdVal},
          ${sqlEscape(user.firstName || user.name.split(' ')[0])},
          ${sqlEscape(user.lastName || user.name.split(' ').slice(1).join(' ') || '')},
          ${sqlEscape(user.email)},
          ${user.isActive !== false ? 'TRUE' : 'FALSE'},
          ${sqlEscape(user.id)},
          ${sqlEscape(user.orgId)},
          ${sqlEscape(user.role)},
          ${sqlEscape(user.displayRole || user.role)},
          ${sqlEscape(user.parentOrg || '')},
          ${sqlEscape(user.actualOrg || '')},
          ${sqlEscape(user.avatar || '')}
        ) ON CONFLICT (email) DO UPDATE SET
          display_role = EXCLUDED.display_role,
          role_code = EXCLUDED.role_code,
          parent_org = EXCLUDED.parent_org,
          actual_org = EXCLUDED.actual_org;
      `;
      await executeRawSql(sql);
    }
  }

  // 4. Check if action plan folders need seeding
  const planCountRow = await queryRow<{ count: string }>('SELECT count(*) as count FROM apmams.action_plans');
  const planCount = parseInt(planCountRow?.count || '0', 10);

  if (planCount === 0) {
    console.log('[PostgreSQL] Seeding action plan folders into apmams.action_plans...');
    const defaultUserRow = await queryRow<{ user_id: number }>('SELECT user_id FROM apmams.users LIMIT 1');
    const defaultUserId = defaultUserRow ? defaultUserRow.user_id : 1;

    for (const folder of INITIAL_ACTION_PLAN_FOLDERS) {
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
          ${defaultUserId},
          ${sqlEscape(folder.id)},
          ${sqlEscape(folder.fiscalYear)},
          ${sqlEscape(folder.status)},
          ${folder.totalActivitiesCount || 0},
          ${folder.allocatedBudget || 0},
          ${folder.approvedCount || 0},
          ${folder.pendingCount || 0},
          ${sqlEscape(folder.theme || '')},
          ${sqlEscape(folder.submissionDeadline || '')}
        ) ON CONFLICT (folder_id) DO UPDATE SET
          title = EXCLUDED.title,
          status = EXCLUDED.status,
          total_activities = EXCLUDED.total_activities,
          total_budget = EXCLUDED.total_budget,
          approved_count = EXCLUDED.approved_count,
          pending_count = EXCLUDED.pending_count,
          theme = EXCLUDED.theme,
          submission_deadline = EXCLUDED.submission_deadline;
      `;
      await executeRawSql(sql);
    }
  }

  // 5. Check if activities need seeding
  const actCountRow = await queryRow<{ count: string }>('SELECT count(*) as count FROM apmams.activities');
  const actCount = parseInt(actCountRow?.count || '0', 10);

  if (actCount === 0) {
    console.log('[PostgreSQL] Seeding activities into apmams.activities and activity_financials...');
    const defaultUserRow = await queryRow<{ user_id: number }>('SELECT user_id FROM apmams.users LIMIT 1');
    const defaultUserId = defaultUserRow ? defaultUserRow.user_id : 1;

    for (const act of INITIAL_ACTIVITIES) {
      const actAny = act as any;
      const orgRow = await queryRow<{ organization_id: number }>(
        `SELECT organization_id FROM apmams.organizations WHERE acronym = ${sqlEscape(act.orgId)} LIMIT 1`
      );
      const planRow = await queryRow<{ action_plan_id: number }>(
        `SELECT action_plan_id FROM apmams.action_plans WHERE fiscal_year = ${sqlEscape(act.fiscalYear)} LIMIT 1`
      );

      const orgIdVal = orgRow ? orgRow.organization_id : 1;
      const planIdVal = planRow ? planRow.action_plan_id : 1;

      const startDate = act.startDate || actAny.scheduleStart || actAny.date || '2026-06-01';
      const endDate = act.endDate || actAny.scheduleEnd || actAny.date || startDate;
      const category = act.strategicPillar || actAny.category || 'Institutional Development';
      const targetOutputs = act.expectedOutput || actAny.targetOutputs || '';
      const kpis = act.kpiOutcome || actAny.keyPerformanceIndicators || '';
      const budget = act.budget || act.amount || 0;
      const allocatedBudget = act.totalBudget || actAny.allocatedBudget || budget;
      const expenses = actAny.expenses || 0;

      const sql = `
        INSERT INTO apmams.activities (
          action_plan_id, organization_id, title, category, venue, schedule_start, schedule_end,
          target_participants, status, progress, created_by,
          app_activity_id, org_id_code, fiscal_year, target_outputs, key_performance_indicators,
          budget, allocated_budget, expenses, source, workflow_status, approval_stage, timeline,
          design_form, accomplishment_form, financial_plan
        ) VALUES (
          ${planIdVal},
          ${orgIdVal},
          ${sqlEscape(act.title)},
          ${sqlEscape(category)},
          ${sqlEscape(act.venue || 'MSU Naawan Campus')},
          ${sqlEscape(startDate)},
          ${sqlEscape(endDate)},
          ${act.targetParticipants || 50},
          ${sqlEscape(act.status || 'Pending')},
          ${act.status === 'Approved' ? 100 : 25},
          ${defaultUserId},
          ${sqlEscape(act.id)},
          ${sqlEscape(act.orgId)},
          ${sqlEscape(act.fiscalYear || '2026')},
          ${sqlEscape(targetOutputs)},
          ${sqlEscape(kpis)},
          ${budget},
          ${allocatedBudget},
          ${expenses},
          ${sqlEscape(act.source || 'ACTION_PLAN')},
          ${sqlEscape(act.workflowStatus || 'DRAFT')},
          ${sqlEscape(act.approvalStage || 'Stage 1: Organization Submission')},
          ${sqlEscape(act.timeline || [])},
          ${sqlEscape(act.designForm || null)},
          ${sqlEscape(act.accomplishmentForm || null)},
          ${sqlEscape(actAny.financialPlan || null)}
        ) ON CONFLICT DO NOTHING;
      `;
      await executeRawSql(sql);

      // Seed corresponding activity_financials
      const insertedAct = await queryRow<{ activity_id: number }>(
        `SELECT activity_id FROM apmams.activities WHERE app_activity_id = ${sqlEscape(act.id)} LIMIT 1`
      );
      if (insertedAct) {
        await executeRawSql(`
          INSERT INTO apmams.activity_financials (
            activity_id, estimated_budget, actual_expense, funding_source, financial_status
          ) VALUES (
            ${insertedAct.activity_id},
            ${budget},
            ${expenses},
            'Student Activity Fund',
            ${sqlEscape(act.status || 'Pending')}
          ) ON CONFLICT DO NOTHING;
        `);
      }
    }
  }

  console.log('[PostgreSQL] Database "APMaMS" schema "apmams" synchronized successfully!');
}
