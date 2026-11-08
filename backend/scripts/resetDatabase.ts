import { executeRawSql, queryRow, query, sqlEscape } from '../database';
import bcrypt from 'bcryptjs';

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
    roles: ['ROLE_ADMIN', 'ROLE_OSD'],
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
  console.log('[Reset] All activities, plans, logs, and sessions cleared.');

  // 2. Clear all existing users
  await executeRawSql(`DELETE FROM apmams.users;`);
  console.log('[Reset] All old user accounts deleted from apmams.users.');

  // 3. Delete organizations with no accounts created (only keep SSC and CBIT)
  await executeRawSql(`
    DELETE FROM apmams.organizations 
    WHERE acronym NOT IN ('SSC', 'CBIT');
  `);
  console.log('[Reset] Deleted all organizations without accounts. Retained SSC and CBIT.');

  // 4. Update SSC and CBIT organization leadership
  await executeRawSql(`
    UPDATE apmams.organizations
    SET president = 'Al-Christian Molina',
        faculty_adviser = 'Cristy K.C. Patajo'
    WHERE acronym = 'SSC';

    UPDATE apmams.organizations
    SET president = 'Kian Christian Estenzo',
        faculty_adviser = 'Louren Mar Chio'
    WHERE acronym = 'CBIT';
  `);
  console.log('[Reset] Updated SSC and CBIT organization records.');

  // 5. Seed the 8 new user accounts with their specific bcrypt hashes
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

  // 6. Verify database counts
  const users = await executeRawSql(`SELECT user_id, email, username, student_id, role_code FROM apmams.users;`);
  console.log('\n[Reset Result] Current Users in apmams.users:\n' + users);

  const orgs = await executeRawSql(`SELECT organization_id, acronym, organization_name, president, faculty_adviser FROM apmams.organizations;`);
  console.log('\n[Reset Result] Retained Organizations:\n' + orgs);

  const actCount = await queryRow<{ count: string }>('SELECT count(*) as count FROM apmams.activities;');
  console.log('\n[Reset Result] Activities count: ' + actCount?.count);
}

main().catch(err => {
  console.error('[Reset Error]', err);
  process.exit(1);
});
