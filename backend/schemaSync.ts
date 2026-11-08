import { executeRawSql, queryRow, sqlEscape } from './database';
import { 
  ORGANIZATIONS, 
  INITIAL_USER_ACCOUNTS, 
  INITIAL_ACTION_PLAN_FOLDERS, 
  INITIAL_ACTIVITIES,
  INITIAL_FISCAL_YEARS,
  INITIAL_ACTION_PLAN_TEMPLATES,
  INITIAL_DROPDOWN_OPTIONS
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
      status::text = ANY (ARRAY['Pending', 'Approved', 'Rejected', 'Draft', 'DEFERRED', 'DEFERRED FOR REVISION', 'Completed', 'IN_PROGRESS', 'Pending Review', 'Approved at Current Stage', 'Fully Approved']::text[])
    );

    ALTER TABLE apmams.approvals DROP CONSTRAINT IF EXISTS approvals_status_check;
    ALTER TABLE apmams.approvals ADD CONSTRAINT approvals_status_check CHECK (
      status::text = ANY (ARRAY['Pending', 'Approved', 'Rejected', 'Deferred', 'Revision Requested']::text[])
    );

    ALTER TABLE apmams.activity_financials DROP CONSTRAINT IF EXISTS activity_financials_financial_status_check;
    ALTER TABLE apmams.activity_financials ADD CONSTRAINT activity_financials_financial_status_check CHECK (
      financial_status::text = ANY (ARRAY['Pending', 'Approved', 'Rejected', 'Draft', 'DEFERRED', 'DEFERRED FOR REVISION', 'Completed', 'Reconciled', 'Liquidated']::text[])
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
    ALTER TABLE apmams.users ADD COLUMN IF NOT EXISTS username varchar(100);
    ALTER TABLE apmams.users ADD COLUMN IF NOT EXISTS student_id varchar(20);
    ALTER TABLE apmams.users ADD COLUMN IF NOT EXISTS roles jsonb DEFAULT '[]'::jsonb;
    ALTER TABLE apmams.users ADD COLUMN IF NOT EXISTS password_hash text;
    ALTER TABLE apmams.users ALTER COLUMN password_hash DROP NOT NULL;
    ALTER TABLE apmams.users ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;
    ALTER TABLE apmams.users ADD COLUMN IF NOT EXISTS password_updated_at timestamptz;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_app_user_id ON apmams.users(app_user_id) WHERE app_user_id IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_student_id ON apmams.users(student_id) WHERE student_id IS NOT NULL;

    -- Server-Side Authentication Sessions Table
    CREATE TABLE IF NOT EXISTS apmams.user_sessions (
      session_id varchar(128) PRIMARY KEY,
      app_user_id varchar(50) NOT NULL,
      active_role varchar(50) NOT NULL,
      ip_address varchar(100),
      user_agent text,
      created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at timestamptz NOT NULL,
      revoked_at timestamptz,
      last_active_at timestamptz DEFAULT CURRENT_TIMESTAMP
    );
    ALTER TABLE apmams.user_sessions ADD COLUMN IF NOT EXISTS last_active_at timestamptz DEFAULT CURRENT_TIMESTAMP;
    CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON apmams.user_sessions(app_user_id);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON apmams.user_sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_last_active ON apmams.user_sessions(last_active_at);

    -- Action Plan Templates Table
    CREATE TABLE IF NOT EXISTS apmams.action_plan_templates (
      template_id SERIAL PRIMARY KEY,
      id varchar(100) UNIQUE NOT NULL,
      name varchar(255) NOT NULL,
      description text,
      version integer DEFAULT 1,
      is_default boolean DEFAULT false,
      header_title varchar(255) DEFAULT 'PLAN OF ACTIVITIES',
      header_subtitle varchar(255) DEFAULT '[ORGANIZATION NAME]',
      header_color varchar(50) DEFAULT '#800000',
      header_text_color varchar(50) DEFAULT '#FFFFFF',
      sub_header_color varchar(50) DEFAULT '#FCE5CD',
      sub_header_text_color varchar(50) DEFAULT '#1E293B',
      footer_label varchar(255) DEFAULT 'Total Projected Budget (excluding office supplies, allowances and wages)',
      budget_calculation_rule varchar(50) DEFAULT 'SUM_ALL',
      columns jsonb NOT NULL,
      status varchar(50) DEFAULT 'Published',
      allow_text_wrap boolean DEFAULT true,
      show_borders boolean DEFAULT true,
      created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
    );

    -- Fiscal Years Table
    CREATE TABLE IF NOT EXISTS apmams.fiscal_years (
      fiscal_year_id SERIAL PRIMARY KEY,
      id varchar(50) UNIQUE NOT NULL,
      name varchar(100) NOT NULL,
      fiscal_year varchar(20) NOT NULL,
      start_date date NOT NULL,
      end_date date NOT NULL,
      submission_start_date date,
      submission_deadline date,
      status varchar(50) NOT NULL DEFAULT 'Draft',
      template_id varchar(100),
      period_covered varchar(100),
      is_submission_active boolean DEFAULT false,
      published_at timestamptz,
      notes text,
      participating_orgs jsonb DEFAULT '["ALL"]'::jsonb,
      created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
    );

    -- System Dropdown Options Table
    CREATE TABLE IF NOT EXISTS apmams.system_dropdown_options (
      id varchar(100) PRIMARY KEY,
      category varchar(100) NOT NULL,
      label varchar(255) NOT NULL,
      value varchar(255) NOT NULL,
      description text,
      display_order integer DEFAULT 0,
      is_active boolean DEFAULT true,
      is_system_protected boolean DEFAULT false,
      metadata jsonb DEFAULT '{}'::jsonb,
      created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_dropdown_options_cat ON apmams.system_dropdown_options(category, is_active, display_order);

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
    ALTER TABLE apmams.action_plans ADD COLUMN IF NOT EXISTS is_primary boolean DEFAULT true;
    ALTER TABLE apmams.action_plans ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;
    ALTER TABLE apmams.action_plans ADD COLUMN IF NOT EXISTS template_id varchar(100);
    ALTER TABLE apmams.action_plans ADD COLUMN IF NOT EXISTS submitted_at timestamptz;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_action_plans_folder_id ON apmams.action_plans(folder_id) WHERE folder_id IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_action_plans_org_fy_primary ON apmams.action_plans(org_id_code, fiscal_year) WHERE is_primary = true AND org_id_code IS NOT NULL;

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
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS timeframe_month varchar(50);
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS timeframe_week varchar(50);
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS line_item_budget text;
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS budget_line_items jsonb DEFAULT '[]'::jsonb;
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS approval_status varchar(50) DEFAULT 'Draft';
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS approval_stage_index integer DEFAULT 1;
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS current_approver_role varchar(100);
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS approval_decisions jsonb DEFAULT '[]'::jsonb;
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS rejection_remarks text;
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS rejected_by varchar(100);
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS rejected_at timestamptz;
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS deferred_remarks text;
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS is_plan_confirmed boolean DEFAULT false;
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS confirmed_by varchar(100);
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS action_plan_status varchar(50);
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS action_plan_decision varchar(50);
    ALTER TABLE apmams.activities ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;
    ALTER TABLE apmams.activities ALTER COLUMN approval_stage TYPE varchar(150);
    ALTER TABLE apmams.activities ALTER COLUMN fiscal_year TYPE varchar(50);
    ALTER TABLE apmams.activities ALTER COLUMN category TYPE varchar(150);
    ALTER TABLE apmams.activities ALTER COLUMN title TYPE varchar(255);
    ALTER TABLE apmams.activities ALTER COLUMN venue TYPE varchar(255);
    DROP INDEX IF EXISTS apmams.idx_activities_app_id;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_activities_app_id ON apmams.activities(app_activity_id);
  `;

  await executeRawSql(ddl);

  // Purge any residual TME and OSA records from PostgreSQL
  try {
    await executeRawSql(`
      DELETE FROM apmams.activities WHERE org_id_code = 'TME' OR app_activity_id LIKE '%TME%';
      DELETE FROM apmams.users WHERE email LIKE '%tme.%' OR username LIKE '%tme%';
      DELETE FROM apmams.organizations WHERE acronym = 'TME' OR organization_name ILIKE '%Marine Echo%';
      DELETE FROM apmams.system_dropdown_options WHERE id = 'opt_off_3' OR UPPER(value) = 'OSA' OR UPPER(label) = 'OSA';
      DELETE FROM apmams.organizations WHERE acronym = 'OSA' OR organization_name ILIKE '%Office of Student Affairs%';

      -- Ensure sequential display ordering for offices
      UPDATE apmams.system_dropdown_options SET display_order = 3 WHERE id = 'opt_off_4';
      UPDATE apmams.system_dropdown_options SET display_order = 4 WHERE id = 'opt_off_5';
      UPDATE apmams.system_dropdown_options SET display_order = 5 WHERE id = 'opt_off_6';
      UPDATE apmams.system_dropdown_options SET display_order = 6 WHERE id = 'opt_off_7';
      UPDATE apmams.system_dropdown_options SET display_order = 7 WHERE id = 'opt_off_8';
      UPDATE apmams.system_dropdown_options SET display_order = 8 WHERE id = 'opt_off_9';
      UPDATE apmams.system_dropdown_options SET display_order = 9 WHERE id = 'opt_off_10';
    `);
  } catch (err) {
    // Ignore if tables or columns don't exist yet
  }

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

  // 3. Ensure retained organizations in apmams.organizations match ORGANIZATIONS
  await executeRawSql(`
    DELETE FROM apmams.organizations 
    WHERE acronym NOT IN ('SSC', 'CBIT', 'CESS', 'CELS', 'CMFS', 'KAABAG', 'SenSo');
  `);

  const ACCOUNT_BCRYPT_HASHES: Record<string, string> = {
    'alchristian.molina@msunaawan.edu.ph': '$2b$12$XIGL9eTVxwDaLo7hdLoVMO6.a9pEqh8K8ANNlfwrf4I228ZhfwRc2', // ssc123
    'cristykc.patajo@msunaawan.edu.ph': '$2b$12$1oS3t9eCve0.ZPXoSGS6dOLG.USQYwepjdMh1V/RpHCXSOwz1pgzO', // sscadviser123
    'kianchristian.estenzo@msunaawan.edu.ph': '$2b$12$KkqmjJKB7tjI6UtUdVhQtOvvs5W82.z4xFQsqxDLc9UbIs8mwJeX2', // cbit123
    'lourenmar.chio@msunaawan.edu.ph': '$2b$12$BfzHshy6KwKTyws0//r7rOrOU9bQCSzq9L.djE3nZnF1WNL9RNu0G', // cbitadviser123
    'enelrad.cuteron@msunaawan.edu.ph': '$2b$12$yxJV5OKwxlEkTdl7PbSyWO1jTIOvZCoLGuzqZx49ieuwPX11Yr8J2', // cbitdean123
    'valesayniel.junio@msunaawan.edu.ph': '$2b$12$yQtx5Q8g6rDlHtEVZ7Bg0eYcFGrcZ2EE3O3Bw1iNmp.HR1neE8Y7.', // osd123
    'jozelmicah.mapula@msunaawan.edu.ph': '$2b$12$VBKcUbllguzVqSD1mn8xH.OULVy2QFqpT8rxxy6HCMP/8086UWnwi', // ovcsas123
    'hazelanne.mapula@msunaawan.edu.ph': '$2b$12$ivgYrQxPl6Jz/aop1NXjledjaEHV7m1u58Xx1AGC9kQllpkDh.anO' // admin123
  };

  for (const user of INITIAL_USER_ACCOUNTS) {
    const orgRow = await queryRow<{ organization_id: number }>(
      `SELECT organization_id FROM apmams.organizations WHERE acronym = ${sqlEscape(user.orgId)} LIMIT 1`
    );
    const roleRow = await queryRow<{ role_id: number }>(
      `SELECT role_id FROM apmams.roles WHERE role_name = ${sqlEscape(user.role)} OR role_name = 'ROLE_ORGANIZATION' LIMIT 1`
    );

    const orgIdVal = orgRow ? orgRow.organization_id : 'NULL';
    const roleIdVal = roleRow ? roleRow.role_id : 1;
    const seedUsername = user.username || (user.email ? user.email.split('@')[0] : '');
    const seedRoles = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [user.role];
    const passwordHash = ACCOUNT_BCRYPT_HASHES[user.email.toLowerCase()] || '$2b$12$ivgYrQxPl6Jz/aop1NXjledjaEHV7m1u58Xx1AGC9kQllpkDh.anO';

    const sql = `
      INSERT INTO apmams.users (
        organization_id, role_id, first_name, last_name, email, is_active,
        app_user_id, org_id_code, role_code, display_role, parent_org, actual_org, avatar,
        username, student_id, roles, password_hash, must_change_password
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
        ${sqlEscape(user.avatar || '')},
        ${sqlEscape(seedUsername)},
        ${sqlEscape(user.studentId || '')},
        ${sqlEscape(seedRoles)},
        ${sqlEscape(passwordHash)},
        FALSE
      ) ON CONFLICT (email) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        username = EXCLUDED.username,
        student_id = EXCLUDED.student_id,
        role_code = EXCLUDED.role_code,
        display_role = EXCLUDED.display_role,
        org_id_code = EXCLUDED.org_id_code,
        parent_org = EXCLUDED.parent_org,
        actual_org = EXCLUDED.actual_org,
        roles = EXCLUDED.roles,
        password_hash = EXCLUDED.password_hash,
        must_change_password = FALSE;
    `;
    await executeRawSql(sql);
  }

  // Remove any legacy users not in INITIAL_USER_ACCOUNTS
  const validEmails = INITIAL_USER_ACCOUNTS.map(u => sqlEscape(u.email.toLowerCase())).join(', ');
  if (validEmails) {
    await executeRawSql(`DELETE FROM apmams.users WHERE LOWER(email) NOT IN (${validEmails});`);
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
        ) ON CONFLICT (folder_id) WHERE folder_id IS NOT NULL DO UPDATE SET
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
      const yearDigits = act.fiscalYear.replace(/\D/g, '') || '2027';
      const planRow = await queryRow<{ action_plan_id: number }>(
        `SELECT action_plan_id FROM apmams.action_plans WHERE fiscal_year ILIKE ${sqlEscape('%' + yearDigits + '%')} OR folder_id ILIKE ${sqlEscape('%' + yearDigits + '%')} LIMIT 1`
      );

      const fallbackPlan = await queryRow<{ action_plan_id: number }>('SELECT action_plan_id FROM apmams.action_plans ORDER BY action_plan_id DESC LIMIT 1');
      const orgIdVal = orgRow ? orgRow.organization_id : 1;
      const planIdVal = planRow ? planRow.action_plan_id : (fallbackPlan ? fallbackPlan.action_plan_id : 1);

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

  // 6. Action Plan Templates
  console.log('[PostgreSQL] Synchronizing action plan templates into apmams.action_plan_templates...');
  for (const tpl of INITIAL_ACTION_PLAN_TEMPLATES) {
    const sql = `
      INSERT INTO apmams.action_plan_templates (
        id, name, description, version, is_default, header_title, header_subtitle,
        header_color, header_text_color, sub_header_color, sub_header_text_color,
        footer_label, budget_calculation_rule, columns, status, allow_text_wrap, show_borders
      ) VALUES (
        ${sqlEscape(tpl.id)},
        ${sqlEscape(tpl.name)},
        ${sqlEscape(tpl.description || '')},
        ${tpl.version || 1},
        ${tpl.isDefault ? 'TRUE' : 'FALSE'},
        ${sqlEscape(tpl.headerTitle || 'PLAN OF ACTIVITIES')},
        ${sqlEscape(tpl.headerSubTitle || '[ORGANIZATION NAME]')},
        ${sqlEscape(tpl.headerColor || '#800000')},
        ${sqlEscape(tpl.headerTextColor || '#FFFFFF')},
        ${sqlEscape(tpl.subHeaderColor || '#FCE5CD')},
        ${sqlEscape(tpl.subHeaderTextColor || '#1E293B')},
        ${sqlEscape(tpl.footerLabel || '')},
        ${sqlEscape(tpl.budgetCalculationRule || 'SUM_ALL')},
        ${sqlEscape(tpl.columns)},
        ${sqlEscape(tpl.status || 'Published')},
        ${tpl.allowTextWrap !== false ? 'TRUE' : 'FALSE'},
        ${tpl.showBorders !== false ? 'TRUE' : 'FALSE'}
      ) ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        version = EXCLUDED.version,
        is_default = EXCLUDED.is_default,
        header_title = EXCLUDED.header_title,
        header_subtitle = EXCLUDED.header_subtitle,
        header_color = EXCLUDED.header_color,
        header_text_color = EXCLUDED.header_text_color,
        sub_header_color = EXCLUDED.sub_header_color,
        sub_header_text_color = EXCLUDED.sub_header_text_color,
        footer_label = EXCLUDED.footer_label,
        budget_calculation_rule = EXCLUDED.budget_calculation_rule,
        columns = EXCLUDED.columns,
        status = EXCLUDED.status,
        allow_text_wrap = EXCLUDED.allow_text_wrap,
        show_borders = EXCLUDED.show_borders;
    `;
    await executeRawSql(sql);
  }

  // 7. Fiscal Years
  console.log('[PostgreSQL] Synchronizing fiscal years into apmams.fiscal_years...');
  for (const fy of INITIAL_FISCAL_YEARS) {
    const sql = `
      INSERT INTO apmams.fiscal_years (
        id, name, fiscal_year, start_date, end_date, submission_start_date, submission_deadline,
        status, template_id, period_covered, is_submission_active, published_at, notes, participating_orgs
      ) VALUES (
        ${sqlEscape(fy.id)},
        ${sqlEscape(fy.name)},
        ${sqlEscape(fy.fiscalYear)},
        ${sqlEscape(fy.startDate)},
        ${sqlEscape(fy.endDate)},
        ${sqlEscape(fy.submissionStartDate || fy.submissionOpenDate || fy.startDate)},
        ${sqlEscape(fy.submissionDeadline || fy.submissionCloseDate || fy.endDate)},
        ${sqlEscape(fy.status)},
        ${sqlEscape(fy.templateId || 'TEMPLATE-MSUN-DEFAULT')},
        ${sqlEscape(fy.periodCovered || `January–December ${fy.name.replace(/\D/g, '')}`)},
        ${fy.isSubmissionActive ? 'TRUE' : 'FALSE'},
        ${sqlEscape(fy.publishedAt || new Date().toISOString())},
        ${sqlEscape(fy.notes || '')},
        ${sqlEscape(fy.participatingOrgs || ['ALL'])}
      ) ON CONFLICT (id) DO UPDATE SET
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
        participating_orgs = EXCLUDED.participating_orgs;
    `;
    await executeRawSql(sql);
  }

  // 8. System Dropdown Options Seeding
  for (const opt of INITIAL_DROPDOWN_OPTIONS) {
    const sql = `
      INSERT INTO apmams.system_dropdown_options (
        id, category, label, value, description, display_order, is_active, is_system_protected, metadata
      ) VALUES (
        ${sqlEscape(opt.id)},
        ${sqlEscape(opt.category)},
        ${sqlEscape(opt.label)},
        ${sqlEscape(opt.value)},
        ${sqlEscape(opt.description || '')},
        ${opt.order || 0},
        ${opt.isActive !== false ? 'TRUE' : 'FALSE'},
        ${opt.isSystemProtected ? 'TRUE' : 'FALSE'},
        ${sqlEscape(opt.metadata || {})}
      ) ON CONFLICT (id) DO UPDATE SET
        label = EXCLUDED.label,
        value = EXCLUDED.value,
        category = EXCLUDED.category,
        description = EXCLUDED.description,
        is_system_protected = EXCLUDED.is_system_protected;
    `;
    await executeRawSql(sql);
  }

  console.log('[PostgreSQL] Database "APMaMS" schema "apmams" synchronized successfully!');
}
