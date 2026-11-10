// @ts-nocheck
import { INITIAL_USER_ACCOUNTS } from '../src/data/initialData';
import { notificationService } from '../src/services/notificationService';
import { Activity, UserAccount } from '../src/types';

// Mock localStorage for Node runtime
const storage = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => storage.get(k) || null,
  setItem: (k: string, v: string) => storage.set(k, v),
  removeItem: (k: string) => storage.delete(k),
  clear: () => storage.clear()
};
(globalThis as any).window = {
  dispatchEvent: () => true
};

const sscOrg = INITIAL_USER_ACCOUNTS.find(u => u.email === 'alchristian.molina@msunaawan.edu.ph')!;
const sscAdviser = INITIAL_USER_ACCOUNTS.find(u => u.email === 'cristykc.patajo@msunaawan.edu.ph')!;
const cbitOrg = INITIAL_USER_ACCOUNTS.find(u => u.email === 'kianchristian.estenzo@msunaawan.edu.ph')!;
const cbitAdviser = INITIAL_USER_ACCOUNTS.find(u => u.email === 'lourenmar.chio@msunaawan.edu.ph')!;
const cbitDean = INITIAL_USER_ACCOUNTS.find(u => u.email === 'enelrad.cuteron@msunaawan.edu.ph')!;
const osdUser = INITIAL_USER_ACCOUNTS.find(u => u.email === 'valesayniel.junio@msunaawan.edu.ph')!;
const ovcsasUser = INITIAL_USER_ACCOUNTS.find(u => u.email === 'jozelmicah.mapula@msunaawan.edu.ph')!;
const adminUser = INITIAL_USER_ACCOUNTS.find(u => u.email === 'hazelanne.mapula@msunaawan.edu.ph')!;

console.log('--- Testing Approver Notification Logical Rules ---');

// Clean start
localStorage.clear();

// Create sample SSC activity
const sscActivity: Activity = {
  id: 'ACT-TEST-SSC-001',
  title: 'SSC Campus Leadership Forum',
  orgId: 'SSC',
  proposedBy: sscOrg.name,
  fiscalYear: 'Fiscal Year 2027',
  budget: 25000,
  organizationType: 'CENTRAL',
  status: 'Draft',
  approvalStatus: 'Draft',
  designForm: { isCompleted: true, submittedDate: '2026-11-09', submittedBy: sscOrg.name } as any,
  timeline: [
    { id: 1, title: 'Stage 1: Organization Submission', role: 'Student Organization Officer', status: 'completed' },
    { id: 2, title: 'Stage 2: Assigned Adviser Review', role: 'Faculty Adviser', status: 'in_progress' },
    { id: 3, title: 'Stage 3: OSD Approval', role: 'Office of Student Development (OSD)', status: 'pending' },
    { id: 4, title: 'Stage 4: OVCSAS Final Approval', role: 'Office of the Vice Chancellor for Student Affairs and Services', status: 'pending' },
    { id: 5, title: 'Stage 5: Accomplishment Report Submission', role: 'Student Organization Officer', status: 'pending' },
    { id: 6, title: 'Stage 6: Adviser Accomplishment Review & Sign-Off', role: 'Faculty Adviser', status: 'pending' }
  ]
};

// 1. Submit proposal
console.log('\n[1] SSC Submits Proposal:');
notificationService.notifyActivitySubmission({ activity: sscActivity, submitter: sscOrg });

const sscAdviserNotifs1 = notificationService.getNotifications(sscAdviser);
const sscOrgNotifs1 = notificationService.getNotifications(sscOrg);
const osdNotifs1 = notificationService.getNotifications(osdUser);
const ovcsasNotifs1 = notificationService.getNotifications(ovcsasUser);
const cbitAdviserNotifs1 = notificationService.getNotifications(cbitAdviser);
const cbitDeanNotifs1 = notificationService.getNotifications(cbitDean);

console.log(`- SSC Adviser notifications count: ${sscAdviserNotifs1.length} (Expected: 1)`);
console.log(`  -> Title: "${sscAdviserNotifs1[0]?.title}"`);
console.log(`- SSC Org notifications count: ${sscOrgNotifs1.length} (Expected: 1)`);
console.log(`  -> Title: "${sscOrgNotifs1[0]?.title}"`);
console.log(`- OSD notifications count: ${osdNotifs1.length} (Expected: 0)`);
console.log(`- OVCSAS notifications count: ${ovcsasNotifs1.length} (Expected: 0)`);
console.log(`- CBIT Adviser count: ${cbitAdviserNotifs1.length} (Expected: 0)`);
console.log(`- CBIT Dean count: ${cbitDeanNotifs1.length} (Expected: 0)`);

if (sscAdviserNotifs1.length !== 1 || osdNotifs1.length !== 0 || cbitAdviserNotifs1.length !== 0) {
  throw new Error('FAILED [1]: Notification routing on initial submission failed');
}

// 2. SSC Adviser Endorses (Stage 2 -> Stage 3 OSD)
console.log('\n[2] SSC Adviser Endorses Stage 2:');
sscActivity.timeline![1].status = 'completed';
sscActivity.timeline![2].status = 'in_progress';

notificationService.sendApprovalNotificationAndEmail({
  activity: sscActivity,
  approver: sscAdviser,
  stageName: 'Stage 2: Assigned Adviser Review',
  isFinal: false,
  remarks: 'Endorsed to OSD for guidelines compliance.'
});

const sscAdviserNotifs2 = notificationService.getNotifications(sscAdviser);
const sscOrgNotifs2 = notificationService.getNotifications(sscOrg);
const osdNotifs2 = notificationService.getNotifications(osdUser);
const ovcsasNotifs2 = notificationService.getNotifications(ovcsasUser);

console.log(`- SSC Adviser count: ${sscAdviserNotifs2.length} (Expected: 1, did NOT receive an APPROVAL notice)`);
console.log(`- SSC Org count: ${sscOrgNotifs2.length} (Expected: 2, received Stage 2 approval update)`);
console.log(`  -> Latest Org notif: "${sscOrgNotifs2[0]?.title}"`);
console.log(`- OSD count: ${osdNotifs2.length} (Expected: 1, received Stage 3 submission awaiting endorsement)`);
console.log(`  -> OSD notif: "${osdNotifs2[0]?.title}", stage: "${osdNotifs2[0]?.stageName}"`);
console.log(`- OVCSAS count: ${ovcsasNotifs2.length} (Expected: 0)`);

if (sscAdviserNotifs2.length !== 1 || osdNotifs2.length !== 1 || ovcsasNotifs2.length !== 0) {
  throw new Error('FAILED [2]: Notification routing on Stage 2 endorsement failed');
}

// 3. OSD Approves (Stage 3 -> Stage 4 OVCSAS)
console.log('\n[3] OSD Approves Stage 3:');
sscActivity.timeline![2].status = 'completed';
sscActivity.timeline![3].status = 'in_progress';

notificationService.sendApprovalNotificationAndEmail({
  activity: sscActivity,
  approver: osdUser,
  stageName: 'Stage 3: OSD Approval',
  isFinal: false,
  remarks: 'Guidelines compliant. Forwarded to OVCSAS.'
});

const osdNotifs3 = notificationService.getNotifications(osdUser);
const ovcsasNotifs3 = notificationService.getNotifications(ovcsasUser);
const sscOrgNotifs3 = notificationService.getNotifications(sscOrg);

console.log(`- OSD count: ${osdNotifs3.length} (Expected: 1, did NOT receive an APPROVAL notice)`);
console.log(`- OVCSAS count: ${ovcsasNotifs3.length} (Expected: 1, received Stage 4 submission awaiting endorsement)`);
console.log(`  -> OVCSAS notif: "${ovcsasNotifs3[0]?.title}", stage: "${ovcsasNotifs3[0]?.stageName}"`);
console.log(`- SSC Org count: ${sscOrgNotifs3.length} (Expected: 3, received Stage 3 approval update)`);

if (osdNotifs3.length !== 1 || ovcsasNotifs3.length !== 1) {
  throw new Error('FAILED [3]: Notification routing on Stage 3 OSD approval failed');
}

// 4. Test Mark As Read
console.log('\n[4] Test Mark All As Read for OSD:');
console.log(`- OSD unread count before: ${notificationService.getUnreadNotificationCount(osdUser)}`);
notificationService.markAllNotificationsAsRead(osdUser);
console.log(`- OSD unread count after: ${notificationService.getUnreadNotificationCount(osdUser)} (Expected: 0)`);

if (notificationService.getUnreadNotificationCount(osdUser) !== 0) {
  throw new Error('FAILED [4]: markAllNotificationsAsRead did not clear unread count');
}

// 5. Test College Org (CBIT) Workflow
console.log('\n[5] Test College Org (CBIT) Workflow Routing:');
const cbitActivity: Activity = {
  id: 'ACT-TEST-CBIT-001',
  title: 'CBIT Tech Innovation Bootcamp',
  orgId: 'CBIT',
  collegeId: 'CBIT',
  proposedBy: cbitOrg.name,
  fiscalYear: 'Fiscal Year 2027',
  budget: 18000,
  organizationType: 'COLLEGE',
  status: 'Draft',
  approvalStatus: 'Draft',
  designForm: { isCompleted: true, submittedDate: '2026-11-09', submittedBy: cbitOrg.name } as any,
  timeline: [
    { id: 1, title: 'Stage 1: Organization Submission', role: 'Student Organization Officer', status: 'completed' },
    { id: 2, title: 'Stage 2: Assigned Adviser Review', role: 'Faculty Adviser', status: 'in_progress' },
    { id: 3, title: 'Stage 3: College Dean Endorsement', role: 'College Dean', status: 'pending' },
    { id: 4, title: 'Stage 4: OSD Approval', role: 'Office of Student Development (OSD)', status: 'pending' },
    { id: 5, title: 'Stage 5: OVCSAS Final Approval', role: 'Office of the Vice Chancellor for Student Affairs and Services', status: 'pending' },
    { id: 6, title: 'Stage 6: Accomplishment Report Submission', role: 'Student Organization Officer', status: 'pending' },
    { id: 7, title: 'Stage 7: Adviser Accomplishment Review & Sign-Off', role: 'Faculty Adviser', status: 'pending' }
  ]
};

// CBIT proposal submitted
notificationService.notifyActivitySubmission({ activity: cbitActivity, submitter: cbitOrg });

console.log(`- CBIT Adviser count: ${notificationService.getNotifications(cbitAdviser).length} (Expected: 1)`);
console.log(`- SSC Adviser count: ${notificationService.getNotifications(sscAdviser).length} (Expected: 1 - still only SSC)`);
console.log(`- CBIT Dean count: ${notificationService.getNotifications(cbitDean).length} (Expected: 0 - not yet at Dean stage)`);

// CBIT Adviser endorses Stage 2 -> Stage 3 (College Dean)
cbitActivity.timeline![1].status = 'completed';
cbitActivity.timeline![2].status = 'in_progress';

notificationService.sendApprovalNotificationAndEmail({
  activity: cbitActivity,
  approver: cbitAdviser,
  stageName: 'Stage 2: Assigned Adviser Review',
  isFinal: false,
  remarks: 'Endorsed for College Dean review.'
});

const cbitDeanNotifs = notificationService.getNotifications(cbitDean);
console.log(`- CBIT Dean count: ${cbitDeanNotifs.length} (Expected: 1 - received Stage 3 Dean endorsement)`);
console.log(`  -> Dean notif: "${cbitDeanNotifs[0]?.title}", stage: "${cbitDeanNotifs[0]?.stageName}"`);
console.log(`- SSC Adviser count: ${notificationService.getNotifications(sscAdviser).length} (Expected: 1 - untouched)`);

if (cbitDeanNotifs.length !== 1) {
  throw new Error('FAILED [5]: Dean notification failed');
}

// 6. Test Emails Isolation
console.log('\n[6] Test Institutional Emails Isolation:');
const adviserEmails = notificationService.getEmails(sscAdviser);
const osdEmails = notificationService.getEmails(osdUser);
const sscOrgEmails = notificationService.getEmails(sscOrg);

console.log(`- SSC Adviser emails count: ${adviserEmails.length}`);
adviserEmails.forEach(e => console.log(`  -> to: ${e.toEmail}, subject: "${e.subject}"`));
console.log(`- OSD emails count: ${osdEmails.length}`);
osdEmails.forEach(e => console.log(`  -> to: ${e.toEmail}, subject: "${e.subject}"`));

const leakedEmail = adviserEmails.find(e => e.toEmail !== sscAdviser.email);
if (leakedEmail) {
  throw new Error(`FAILED [6]: SSC Adviser received leaked email to ${leakedEmail.toEmail}`);
}

console.log('\n🎉 ALL APPROVER NOTIFICATION TESTS PASSED SUCCESSFULLY! 🎉');

