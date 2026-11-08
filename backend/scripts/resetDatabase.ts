import { executeRawSql, queryRow, query, sqlEscape } from '../database';
import bcrypt from 'bcryptjs';
import { ORGANIZATIONS, INITIAL_ACTIVITIES, INITIAL_ACTION_PLAN_FOLDERS } from '../../src/data/initialData';

const ACCOUNTS = [
  {
    id: 'usr-ssc-org',
    studentId: '1020001',
    name: 'Al-Christian Molina',
    firstName: 'Al-Christian',
    lastName: 'Molina',
    email: 'alchristian.molina@msunaawan.edu.ph',
    username: 'alchristian.molina',
    plainPass: 'ssc123',
    role: 'ROLE_ORGANIZATION',
    roles: ['ROLE_ORGANIZATION'],
    displayRole: 'Student Organization Officer',
    orgId: 'SSC',
    parentOrg: 'SSC',
    actualOrg: 'SSC'
  },
  {
    id: 'usr-ssc-adviser',
    studentId: '1020010',
    name: 'Cristy K.C. Patajo',
    firstName: 'Cristy K.C.',
    lastName: 'Patajo',
    email: 'cristykc.patajo@msunaawan.edu.ph',
    username: 'cristykc.patajo',
    plainPass: 'sscadviser123',
    role: 'ROLE_ADVISER',
    roles: ['ROLE_ADVISER'],
    displayRole: 'Organization Adviser',
    orgId: 'SSC',
    parentOrg: 'SSC',
    actualOrg: 'SSC'
  },
  {
    id: 'usr-cbit-org',
    studentId: '1020002',
    name: 'Kian Christian Estenzo',
    firstName: 'Kian Christian',
    lastName: 'Estenzo',
    email: 'kianchristian.estenzo@msunaawan.edu.ph',
    username: 'kianchristian.estenzo',
    plainPass: 'cbit123',
    role: 'ROLE_ORGANIZATION',
    roles: ['ROLE_ORGANIZATION'],
    displayRole: 'Student Organization Officer',
    orgId: 'CBIT',
    parentOrg: 'CBIT',
    actualOrg: 'CBIT'
  },
  {
    id: 'usr-cbit-adviser',
    studentId: '1020011',
    name: 'Louren Mar Chio',
    firstName: 'Louren Mar',
    lastName: 'Chio',
    email: 'lourenmar.chio@msunaawan.edu.ph',
    username: 'lourenmar.chio',
    plainPass: 'cbitadviser123',
    role: 'ROLE_ADVISER',
    roles: ['ROLE_ADVISER'],
    displayRole: 'Organization Adviser',
    orgId: 'CBIT',
    parentOrg: 'CBIT',
    actualOrg: 'CBIT'
  },
  {
    id: 'usr-cbit-dean',
    studentId: '1020012',
    name: 'Dr. Enelrad Cuteron',
    firstName: 'Enelrad',
    lastName: 'Cuteron',
    email: 'enelrad.cuteron@msunaawan.edu.ph',
    username: 'enelrad.cuteron',
    plainPass: 'cbitdean123',
    role: 'ROLE_DEAN',
    roles: ['ROLE_DEAN'],
    displayRole: 'College Dean',
    orgId: 'CBIT',
    parentOrg: 'CBIT',
    actualOrg: 'CBIT'
  },
  {
    id: 'usr-osd-valesay',
    studentId: '1020050',
    name: 'Valesay Niel Junio',
    firstName: 'Valesay Niel',
    lastName: 'Junio',
    email: 'valesayniel.junio@msunaawan.edu.ph',
    username: 'valesayniel.junio',
    plainPass: 'osd123',
    role: 'ROLE_OSD',
    roles: ['ROLE_OSD'],
    displayRole: 'OSD Staff',
    orgId: 'OSD',
    parentOrg: 'OSD',
    actualOrg: 'OSD'
  },
  {
    id: 'usr-ovcsas-jozel',
    studentId: '1020040',
    name: 'Jozel Micah Mapula',
    firstName: 'Jozel Micah',
    lastName: 'Mapula',
    email: 'jozelmicah.mapula@msunaawan.edu.ph',
    username: 'jozelmicah.mapula',
    plainPass: 'ovcsas123',
    role: 'ROLE_OVCSAS',
    roles: ['ROLE_OVCSAS'],
    displayRole: 'OVCSAS Officer',
    orgId: 'OVCSAS',
    parentOrg: 'OVCSAS',
    actualOrg: 'OVCSAS'
  },
  {
    id: 'usr-sysad-hazel',
    studentId: '1020090',
    name: 'Hazel Anne Mapula',
    firstName: 'Hazel Anne',
    lastName: 'Mapula',
    email: 'hazelanne.mapula@msunaawan.edu.ph',
    username: 'hazelanne.mapula',
    plainPass: 'admin123',
    role: 'ROLE_ADMIN',
    roles: ['ROLE_ADMIN'],
    displayRole: 'System Administrator',
    orgId: 'ADMIN',
    parentOrg: 'ADMIN',
    actualOrg: 'ADMIN'
  }
];

async function main() {
  console.log('[Reset] Starting database purge of old accounts, connected data, and activities...');

  // 1. Delete all activities and dependent activity tables
  await executeRawSql(`
    DELETE FROM apmams.activity_financials;
    DELETE FROM apmams.activity_files;
    DELETE FROM apmams.activity_progress;
    DELETE FROM apmams.activity_requirements;
    DELETE FROM apmams.activity_objectives;
    DELETE FROM apmams.approvals;
    DELETE FROM apmams.calendar_events;
    DELETE FROM apmams.audit_logs;
    DELETE FROM apmams.activities;
    DELETE FROM apmams.action_plans;
    DELETE FROM apmams.user_sessions;
  `);
  console.log('[Reset] All old activities, plans, logs, and sessions cleared.');

  // 2. Clear all existing users
  await executeRawSql(`DELETE FROM apmams.users;`);
  console.log('[Reset] All old user accounts deleted from apmams.users.');

  // 3. Upsert all 7 accredited student organizations
  console.log('[Reset] Synchronizing all 7 recognized student organizations into apmams.organizations...');
  for (const org of ORGANIZATIONS) {
    const subOrgs = (org as any).subOrgs || [];
    await executeRawSql(`
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
    `);
  }
  console.log('[Reset] All 7 accredited organizations synchronized.');

  // 4. Seed the 8 new user accounts with their specific bcrypt hashes
  for (const acc of ACCOUNTS) {
    const hash = await bcrypt.hash(acc.plainPass, 12);
    const orgRow = await queryRow<{ organization_id: number }>(
      `SELECT organization_id FROM apmams.organizations WHERE acronym = ${sqlEscape(acc.orgId)} LIMIT 1`
    );
    const orgIdVal = orgRow ? orgRow.organization_id : 'NULL';

    const roleRow = await queryRow<{ role_id: number }>(
      `SELECT role_id FROM apmams.roles WHERE role_name = ${sqlEscape(acc.role)} LIMIT 1`
    );
    const roleIdVal = roleRow ? roleRow.role_id : 1;

    await executeRawSql(`
      INSERT INTO apmams.users (
        organization_id, role_id, first_name, last_name, email, is_active,
        app_user_id, org_id_code, role_code, display_role, parent_org, actual_org, avatar,
        username, student_id, roles, password_hash, must_change_password
      ) VALUES (
        ${orgIdVal},
        ${roleIdVal},
        ${sqlEscape(acc.firstName)},
        ${sqlEscape(acc.lastName)},
        ${sqlEscape(acc.email)},
        TRUE,
        ${sqlEscape(acc.id)},
        ${sqlEscape(acc.orgId)},
        ${sqlEscape(acc.role)},
        ${sqlEscape(acc.displayRole)},
        ${sqlEscape(acc.parentOrg)},
        ${sqlEscape(acc.actualOrg)},
        ${sqlEscape(acc.firstName.slice(0, 1) + acc.lastName.slice(0, 1))},
        ${sqlEscape(acc.username)},
        ${sqlEscape(acc.studentId)},
        ${sqlEscape(acc.roles)},
        ${sqlEscape(hash)},
        FALSE
      );
    `);
    console.log(`[Reset] Created account: ${acc.email} (${acc.studentId}, role: ${acc.role})`);
  }

  // 5. Seed Action Plan Folders
  const defaultUserRow = await queryRow<{ user_id: number }>('SELECT user_id FROM apmams.users LIMIT 1');
  const defaultUserId = defaultUserRow ? defaultUserRow.user_id : 1;

  for (const folder of INITIAL_ACTION_PLAN_FOLDERS) {
    await executeRawSql(`
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
      );
    `);
  }
  console.log('[Reset] Action plan folders initialized.');

  // 6. Seed the November Activities for SSC and CBIT
  for (const act of INITIAL_ACTIVITIES) {
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

    const startDate = act.startDate || '2026-11-12';
    const endDate = act.endDate || startDate;
    const category = act.strategicPillar || 'Institutional Development';
    const targetOutputs = act.expectedOutput || '';
    const kpis = act.kpiOutcome || '';
    const budget = act.budget || act.amount || 0;
    const allocatedBudget = act.totalBudget || budget;

    await executeRawSql(`
      INSERT INTO apmams.activities (
        action_plan_id, organization_id, title, category, venue, schedule_start, schedule_end,
        target_participants, status, progress, created_by, app_activity_id, org_id_code,
        fiscal_year, target_outputs, key_performance_indicators, budget, allocated_budget, expenses,
        source, workflow_status, approval_stage, timeline, design_form, accomplishment_form,
        timeframe_month, timeframe_week, line_item_budget, approval_status, approval_stage_index
      ) VALUES (
        ${planIdVal},
        ${orgIdVal},
        ${sqlEscape(act.title)},
        ${sqlEscape(category)},
        ${sqlEscape(act.venue)},
        ${sqlEscape(startDate)},
        ${sqlEscape(endDate)},
        ${act.targetParticipants || 100},
        ${sqlEscape(act.status)},
        ${act.status === 'Approved' ? 100 : 25},
        ${defaultUserId},
        ${sqlEscape(act.id)},
        ${sqlEscape(act.orgId)},
        ${sqlEscape(act.fiscalYear)},
        ${sqlEscape(targetOutputs)},
        ${sqlEscape(kpis)},
        ${budget},
        ${allocatedBudget},
        0,
        ${sqlEscape(act.source || 'ACTION_PLAN')},
        ${sqlEscape(act.workflowStatus || (act.status === 'Approved' ? 'COMPLETED' : 'SUBMITTED'))},
        ${sqlEscape(act.approvalStage || 'Stage 2: Adviser Review')},
        ${sqlEscape(act.timeline || [])},
        ${sqlEscape(act.designForm || {})},
        ${sqlEscape(act.accomplishmentForm || {})},
        ${sqlEscape(act.timeframeMonth || 'November')},
        ${sqlEscape(act.timeframeWeek || 'Week 2')},
        ${sqlEscape(act.lineItemBudget || '')},
        ${sqlEscape(act.approvalStatus || (act.status === 'Approved' ? 'Fully Approved' : 'Pending Approval'))},
        ${act.approvalStageIndex || (act.status === 'Approved' ? 4 : 2)}
      );
    `);

    // Insert into activity_financials
    const actRow = await queryRow<{ activity_id: number }>(
      `SELECT activity_id FROM apmams.activities WHERE app_activity_id = ${sqlEscape(act.id)} LIMIT 1`
    );
    if (actRow) {
      await executeRawSql(`
        INSERT INTO apmams.activity_financials (
          activity_id, estimated_budget, actual_expense, funding_source, financial_status
        ) VALUES (
          ${actRow.activity_id},
          ${budget},
          0,
          ${sqlEscape(act.fundSource || 'Trust Fund')},
          ${act.status === 'Approved' ? "'Approved'" : "'Pending'"}
        );
      `);
    }
    console.log(`[Reset] Created activity: ${act.title} (${act.orgId}, Month: ${act.timeframeMonth}, ${act.startDate})`);
  }

  // 7. Verify database contents
  const users = await executeRawSql(`SELECT user_id, email, username, student_id, role_code, roles FROM apmams.users;`);
  console.log('\n[Reset Result] Current Users in apmams.users:\n' + users);

  const orgs = await executeRawSql(`SELECT organization_id, acronym, organization_name, status, president, faculty_adviser FROM apmams.organizations;`);
  console.log('\n[Reset Result] Retained Organizations:\n' + orgs);

  const acts = await executeRawSql(`SELECT activity_id, app_activity_id, org_id_code, title, timeframe_month, schedule_start, status FROM apmams.activities;`);
  console.log('\n[Reset Result] November Activities:\n' + acts);
}

main().catch(err => {
  console.error('[Reset Error]', err);
  process.exit(1);
});
