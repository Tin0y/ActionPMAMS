// Setup minimal browser polyfills for Node test
if (typeof globalThis.window === 'undefined') {
  const storage: Record<string, string> = {};
  (globalThis as any).window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true
  };
  (globalThis as any).localStorage = {
    getItem: (k: string) => storage[k] || null,
    setItem: (k: string, v: string) => { storage[k] = v; },
    removeItem: (k: string) => { delete storage[k]; },
    clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
  };
}

import { getUserAssignedRoles, dedupeAssignedRoles, normalizeCanonicalRole } from '../src/utils/organizationUtils';
import { notificationService } from '../src/services/notificationService';
import { UserAccount, AppNotification, SentEmail } from '../src/types';
import { workflowService } from '../backend/services/WorkflowService';
import { activityRepository } from '../backend/repositories/ActivityRepository';
import { organizationRepository } from '../backend/repositories/OrganizationRepository';

async function runVerification() {
  console.log('=== VERIFYING FIXES FOR ALL 4 ATTACHED SCREENSHOT ISSUES ===\n');

  let allPassed = true;

  // --------------------------------------------------------------------------
  // ISSUE 1: Redundancy in Role Switcher (Image 1: media_1793720536273_22948f1d.png)
  // --------------------------------------------------------------------------
  console.log('--- Test Issue 1: Role Switcher Redundancy & Deduplication ---');
  const sscUser: UserAccount = {
    id: 'usr-ssc-org',
    name: 'SSC Organization User',
    email: 'ssc.org@msunaawan.edu.ph',
    role: 'ROLE_ORGANIZATION',
    roles: ['ROLE_ORGANIZATION', 'Org President', 'Student Organization Officer'],
    orgId: 'SSC',
    avatar: 'SC',
    isActive: true
  };

  const roles = getUserAssignedRoles(sscUser);
  console.log('Raw user roles had 3 aliases:', sscUser.roles);
  console.log('Deduplicated assigned roles count:', roles.length, 'Roles:', roles);

  if (roles.length === 1 && roles[0] === 'ROLE_ORGANIZATION') {
    console.log('✅ PASS: Issue 1 Resolved. No duplicate Student Organization Officer in assignedRoles.');
  } else {
    console.error('❌ FAIL: Expected exactly 1 canonical role, found:', roles);
    allPassed = false;
  }

  // --------------------------------------------------------------------------
  // ISSUE 2: Backend Connectivity & Authentication (Image 2: media_1793778890375_74d720d1.png)
  // --------------------------------------------------------------------------
  console.log('\n--- Test Issue 2: Backend Connectivity & Auth Endpoint ---');
  try {
    const healthRes = await fetch('http://localhost:3000/api/health');
    const healthData = await healthRes.json();
    if (healthRes.ok && healthData.status === 'UP') {
      console.log('✅ PASS: Backend is healthy and reachable at port 3000 (status: UP).');
    } else {
      console.error('❌ FAIL: Health check failed:', healthData);
      allPassed = false;
    }

    const csrfRes = await fetch('http://localhost:3000/api/auth/csrf-token');
    const csrfData = await csrfRes.json();
    if (csrfRes.ok && csrfData.status === 200) {
      console.log('✅ PASS: CSRF & Auth service is responding to client queries.');
    } else {
      console.error('❌ FAIL: CSRF endpoint failed:', csrfData);
      allPassed = false;
    }
  } catch (err: any) {
    console.error('❌ FAIL: Network connection error to backend:', err.message);
    allPassed = false;
  }

  // --------------------------------------------------------------------------
  // ISSUE 3: Notification & Mailbox Leakage (Image 3: media_1793841096387_0e4b9e70.jpg)
  // --------------------------------------------------------------------------
  console.log('\n--- Test Issue 3: Notification Targeting & Isolation ---');
  const cbitOfficer: UserAccount = {
    id: 'usr-cbit-molina',
    name: 'Al Christian Molina',
    email: 'cbit.org@msunaawan.edu.ph',
    role: 'ROLE_ORGANIZATION',
    roles: ['ROLE_ORGANIZATION'],
    orgId: 'CBIT',
    avatar: 'AM',
    isActive: true
  };

  const cbitAdviser: UserAccount = {
    id: 'usr-cbit-adv',
    name: 'CBIT Adviser',
    email: 'cbit.adviser@msunaawan.edu.ph',
    role: 'ROLE_ADVISER',
    roles: ['ROLE_ADVISER'],
    orgId: 'CBIT',
    avatar: 'CA',
    isActive: true
  };

  // Dispatch a simulated submission notification
  const testActivity = {
    id: 'ACT-TEST-001',
    title: 'Test General Assembly',
    orgId: 'CBIT',
    budget: 5000
  };

  notificationService.notifyActivitySubmission({
    activity: testActivity as any,
    submitter: cbitOfficer
  });

  const officerNotifs = notificationService.getNotifications(cbitOfficer);
  const adviserNotifs = notificationService.getNotifications(cbitAdviser);

  const officerHasAwaitingEndorsement = officerNotifs.some(n => 
    n.title.includes('Awaiting Endorsement') || n.stageName === 'Stage 2: Adviser Review'
  );
  const adviserHasAwaitingEndorsement = adviserNotifs.some(n => 
    n.title.includes('Awaiting Endorsement') || n.stageName === 'Stage 2: Adviser Review'
  );

  if (!officerHasAwaitingEndorsement && adviserHasAwaitingEndorsement) {
    console.log('✅ PASS: Issue 3 Resolved. Student officer does NOT receive endorsement action required notification. Only Adviser receives it.');
  } else {
    console.error('❌ FAIL: Notification targeting leaked:', {
      officerHasAwaitingEndorsement,
      adviserHasAwaitingEndorsement
    });
    allPassed = false;
  }

  const officerEmails = notificationService.getEmails(cbitOfficer);
  const officerHasAdviserEmail = officerEmails.some(e => e.toEmail === 'cbit.adviser@msunaawan.edu.ph');
  if (!officerHasAdviserEmail) {
    console.log('✅ PASS: Issue 3 Resolved. Student officer mailbox does NOT contain emails addressed to the adviser.');
  } else {
    console.error('❌ FAIL: Officer mailbox contains adviser email!');
    allPassed = false;
  }

  // --------------------------------------------------------------------------
  // ISSUE 4: Direct Org Approval / Rejection (Image 4: media_1793843736325_b533d758.png)
  // --------------------------------------------------------------------------
  console.log('\n--- Test Issue 4: Direct Org Approval / Rejection / Draft ---');
  await organizationRepository.loadFromDatabase();
  await activityRepository.loadFromDatabase();

  const cbitActs = activityRepository.findAll({ orgId: 'CBIT' });
  if (cbitActs.length === 0) {
    console.error('❌ FAIL: No CBIT activities found in DB.');
    allPassed = false;
  } else {
    const act = cbitActs[0];
    console.log(`Testing direct decision on activity: "${act.title}" (${act.id})`);

    // 1. Direct Approve by CBIT Org Officer
    const approveResult = workflowService.approveActivity(
      act,
      cbitOfficer,
      'Approved directly by organization officers for FY 2027 action plan.'
    );
    console.log('Approve result status:', approveResult.updatedActivity?.status, 'approvalStatus:', approveResult.updatedActivity?.approvalStatus);

    if (approveResult.success && approveResult.updatedActivity?.status === 'Approved' && approveResult.updatedActivity?.approvalStatus === 'Fully Approved') {
      console.log('✅ PASS: Direct Approval succeeds without requiring DAD or multi-stage routing.');
    } else {
      console.error('❌ FAIL: Status not approved:', approveResult);
      allPassed = false;
    }

    // 2. Direct Reject by CBIT Org Officer
    const rejectResult = workflowService.rejectActivity(
      approveResult.updatedActivity || act,
      cbitOfficer,
      'Activity excluded from action plan.'
    );
    console.log('Reject result status:', rejectResult.updatedActivity?.status, 'approvalStatus:', rejectResult.updatedActivity?.approvalStatus);

    if (rejectResult.success && rejectResult.updatedActivity?.status === 'Rejected' && rejectResult.updatedActivity?.approvalStatus === 'Rejected') {
      console.log('✅ PASS: Direct Rejection succeeds without routing.');
    } else {
      console.error('❌ FAIL: Status not rejected:', rejectResult);
      allPassed = false;
    }

    // 3. Set to Draft by CBIT Org Officer
    const draftResult = workflowService.setToDraft(
      rejectResult.updatedActivity || act,
      cbitOfficer
    );
    console.log('SetToDraft result status:', draftResult.updatedActivity?.status, 'approvalStatus:', draftResult.updatedActivity?.approvalStatus);

    if (draftResult.success && draftResult.updatedActivity?.status === 'Draft' && draftResult.updatedActivity?.approvalStatus === 'Draft') {
      console.log('✅ PASS: Set to Draft succeeds.');
    } else {
      console.error('❌ FAIL: Status not draft:', draftResult);
      allPassed = false;
    }

    // 4. Cross-org isolation: SSC officer trying to approve CBIT activity must be blocked with 403 Forbidden
    const crossOrgResult = workflowService.approveActivity(
      act,
      sscUser,
      'Unauthorized cross-org approval attempt'
    );
    if (!crossOrgResult.success && crossOrgResult.statusCode === 403) {
      console.log('✅ PASS: Cross-organization approval strictly blocked with 403 Forbidden.');
    } else {
      console.error('❌ FAIL: Cross-org approval was NOT blocked properly:', crossOrgResult);
      allPassed = false;
    }
  }

  console.log('\n===============================================================');
  if (allPassed) {
    console.log('🎉 ALL 4 ISSUES ACROSS THE SCREENSHOTS ARE VERIFIED RESOLVED! 🎉');
  } else {
    console.log('❌ SOME TESTS FAILED. PLEASE INSPECT LOGS ABOVE.');
  }
  console.log('===============================================================');
  process.exit(allPassed ? 0 : 1);
}

runVerification().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});
