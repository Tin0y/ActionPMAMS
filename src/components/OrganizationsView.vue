<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { OrgId, StudentOrganization, OrganizationMember, OrganizationAttachment, Activity, UserAccount } from '../types';
import { 
  Building2, 
  Users, 
  Search, 
  Mail, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  CalendarRange, 
  Settings, 
  X, 
  Edit3, 
  Save,
  Plus,
  Trash2,
  Paperclip,
  FileText,
  Info,
  Calendar,
  FileSpreadsheet,
  Check,
  AlertCircle,
  AlertTriangle,
  Power,
  PowerOff,
  Phone,
  UserPlus,
  Eye,
  Loader2,
  ExternalLink
} from 'lucide-vue-next';
import { ORGANIZATIONS, INITIAL_ORGANIZATIONS, ORG_COLORS, getOrgTheme, INITIAL_USER_ACCOUNTS } from '../data/initialData';
import OrgBadge from './OrgBadge.vue';
import OrganizationProfileModal from './OrganizationProfileModal.vue';
import { getOptionLabelsByCategory } from '../services/optionsService';
import QuickAddOptionButton from './QuickAddOptionButton.vue';
import { saveOrganizationToDb, subscribeToOrganizations, notifyOrganizationsUpdated, type Unsubscribe } from '../services/db';
import { uploadStoredFile, deleteStoredFile, isImageAttachment } from '../services/fileService';
import { isSameOrg, generateAutoUsernameAndEmail } from '../utils/organizationUtils';

const props = withDefaults(
  defineProps<{
    showManageButton?: boolean;
    activities?: Activity[];
    organizations?: StudentOrganization[];
    currentUser?: UserAccount | null;
  }>(),
  {
    showManageButton: false,
    activities: () => [],
    organizations: () => [],
    currentUser: null
  }
);

const emit = defineEmits<{
  (e: 'selectOrg', orgId: OrgId): void;
  (e: 'showToast', title: string, message?: string, type?: 'success' | 'info' | 'warning'): void;
}>();

const searchQuery = ref('');
const managingOrg = ref<StudentOrganization | null>(null);
const selectedProfileOrg = ref<StudentOrganization | null>(null);

// Authenticated user resolution
const effectiveUser = computed<UserAccount | null>(() => {
  return props.currentUser || null;
});

const getOrgMemberCount = (org: StudentOrganization): number =>
  Array.isArray(org.membersList) ? org.membersList.length : Math.max(0, Number(org.memberCount ?? 0));

const getOrgAttachmentCount = (org: StudentOrganization): number =>
  Array.isArray(org.attachments) ? org.attachments.length : Math.max(0, Number(org.attachmentCount ?? 0));

// Organization-based access control based on authenticated user's assigned organization ID
const canUserAccessOrg = (orgId: string): boolean => {
  const user = effectiveUser.value;
  if (!user) return false;
  const role = user.activeRole || user.role;
  if (role === 'ROLE_ADMIN' || role === 'System Administrator' || role === 'ROLE_OSD' || role === 'ROLE_OVCSAS' || props.showManageButton) {
    return true;
  }
  if (role === 'ROLE_DEAN') {
    const college = user.collegeId || user.orgId || '';
    return Boolean(college) && isSameOrg(college, orgId);
  }
  if (!user.orgId || user.orgId === 'ALL' || user.orgId === 'ADMIN' || user.orgId === 'COLLEGE') {
    return false;
  }
  return isSameOrg(user.orgId, orgId);
};

// Standard Nature of Organization categories
const NATURE_OPTIONS = [
  'Academic & Student Governance',
  'Apex Student Government & Institutional Representation',
  'Academic & Information Technology Student Council',
  'Environmental, Marine & Fisheries Science Society',
  'Education & Social Sciences Student Council',
  'Socio-Civic & Community Outreach',
  'Campus Journalism & Student Publication',
  'Graduating Class & Senior Student Society',
  'Cultural, Music & Performing Arts',
  'Technology, Innovation & Robotics Club',
  'Sports, Athletics & Recreation',
  'Special Interest & Research Society'
];

const dynamicOrgCategories = getOptionLabelsByCategory('org_category');
const allNatureOptions = computed(() => {
  return dynamicOrgCategories.value.length > 0 ? dynamicOrgCategories.value : NATURE_OPTIONS;
});

// Reactive list of organizations with local storage persistence
const loadInitialOrganizations = (): StudentOrganization[] => {
  if (props.organizations && props.organizations.length > 0) {
    return JSON.parse(JSON.stringify(props.organizations));
  }
  try {
    const saved = localStorage.getItem('msun_student_organizations');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    // ignore
  }
  return JSON.parse(JSON.stringify(INITIAL_ORGANIZATIONS));
};

const organizationsList = ref<StudentOrganization[]>(loadInitialOrganizations());

const loadOrganizations = () => {
  if (props.organizations && props.organizations.length > 0) {
    organizationsList.value = JSON.parse(JSON.stringify(props.organizations));
    return;
  }
  try {
    const saved = localStorage.getItem('msun_student_organizations');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        organizationsList.value = parsed;
        return;
      }
    }
  } catch (e) {
    // ignore
  }
  organizationsList.value = JSON.parse(JSON.stringify(INITIAL_ORGANIZATIONS));
  try {
    localStorage.setItem('msun_student_organizations', JSON.stringify(organizationsList.value));
  } catch {
    // ignore
  }
};

watch(
  () => props.organizations,
  (newOrgs) => {
    if (Array.isArray(newOrgs)) {
      organizationsList.value = JSON.parse(JSON.stringify(newOrgs));
    }
  }
);

watch(
  () => props.currentUser,
  () => {
    loadOrganizations();
  }
);

let orgsUnsubscribe: Unsubscribe | null = null;
onMounted(() => {
  try {
    orgsUnsubscribe = subscribeToOrganizations((data) => {
      if (Array.isArray(data)) {
        organizationsList.value = JSON.parse(JSON.stringify(data));
      }
    });
  } catch (err) {
    console.warn('Could not subscribe to organizations in firestore:', err);
  }
});

onUnmounted(() => {
  if (orgsUnsubscribe) {
    orgsUnsubscribe();
  }
});

const persistOrganizations = () => {
  try {
    if (Array.isArray(organizationsList.value)) {
      localStorage.setItem('msun_student_organizations', JSON.stringify(organizationsList.value));
      notifyOrganizationsUpdated();
    }
  } catch (e) {
    // ignore
  }
};

// Deactivation modal state for Organizations
const deactivatingOrg = ref<StudentOrganization | null>(null);
const orgPendingActivities = ref<Activity[]>([]);

const getActivePendingActivitiesForOrg = (org: StudentOrganization): Activity[] => {
  if (!props.activities || props.activities.length === 0) return [];
  return props.activities.filter(act => {
    if (act.orgId !== org.id) return false;
    const isCompleted = act.status === 'COMPLETED' || act.accomplishmentForm?.isCompleted === true;
    return !isCompleted;
  });
};

// Toggle status (Active / Inactive) with pending activities check
const toggleOrgStatus = (org: StudentOrganization) => {
  const currentStatus = org.status || 'Active';
  if (currentStatus === 'Active') {
    // Prompt first before deactivating!
    deactivatingOrg.value = org;
    orgPendingActivities.value = getActivePendingActivitiesForOrg(org);
  } else {
    // Activating organization directly
    applyOrgStatusChange(org, 'Active');
  }
};

const applyOrgStatusChange = (org: StudentOrganization, newStatus: 'Active' | 'Inactive') => {
  org.status = newStatus;
  
  const target = organizationsList.value.find(o => o.id === org.id);
  if (target) {
    target.status = newStatus;
  }
  if (managingOrg.value && managingOrg.value.id === org.id) {
    managingOrg.value.status = newStatus;
  }
  
  persistOrganizations();

  saveOrganizationToDb(target || org).catch((err) => {
    console.warn('Failed to update organization in Firestore:', err);
  });

  emit(
    'showToast',
    newStatus === 'Active' ? 'Organization Activated' : 'Organization Deactivated',
    newStatus === 'Active'
      ? `${org.name} (${org.acronym}) is now active and accredited for student activities.`
      : `${org.name} (${org.acronym}) has been deactivated. Proposals and operations are suspended.`,
    newStatus === 'Active' ? 'success' : 'warning'
  );
};

const confirmDeactivateOrg = () => {
  if (deactivatingOrg.value) {
    applyOrgStatusChange(deactivatingOrg.value, 'Inactive');
    deactivatingOrg.value = null;
    orgPendingActivities.value = [];
  }
};

const cancelDeactivateOrg = () => {
  deactivatingOrg.value = null;
  orgPendingActivities.value = [];
};

// Manage modal helper states
const manageOrgErrors = ref<Record<string, string>>({});
const newObjectiveText = ref('');
const fileInputRef = ref<HTMLInputElement | null>(null);

const triggerFileInput = () => {
  fileInputRef.value?.click();
};

const MEMBER_NAME_MAX_LENGTH = 40;
const MEMBER_CONTACT_MAX_LENGTH = 20;

const sanitizeContactInput = (value: string): string =>
  value.replace(/\D/g, '').slice(0, MEMBER_CONTACT_MAX_LENGTH);

const sanitizeMemberNameInput = (value: string): string =>
  value.slice(0, MEMBER_NAME_MAX_LENGTH);

const splitMemberFullName = (fullName?: string): { firstName: string; lastName: string } => {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: sanitizeMemberNameInput(parts[0]), lastName: '' };
  const lastName = parts.pop() || '';
  return {
    firstName: sanitizeMemberNameInput(parts.join(' ')),
    lastName: sanitizeMemberNameInput(lastName)
  };
};

const handleContactKeyDown = (event: KeyboardEvent): void => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const allowedKeys = new Set([
    'Backspace',
    'Delete',
    'Tab',
    'Escape',
    'Enter',
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
    'Home',
    'End'
  ]);
  if (allowedKeys.has(event.key) || /^[0-9]$/.test(event.key)) return;
  event.preventDefault();
};

const syncMemberNameAndEmail = (
  members: OrganizationMember[] | undefined,
  idx: number,
  field: 'firstName' | 'lastName',
  rawValue: string,
  inputEl: HTMLInputElement | null,
  errorBag: Record<string, string>
): void => {
  if (!members || !members[idx]) return;
  const cleaned = sanitizeMemberNameInput(rawValue);
  if (inputEl && inputEl.value !== cleaned) {
    inputEl.value = cleaned;
  }
  const member = members[idx];
  member[field] = cleaned;

  const first = (member.firstName || '').trim();
  const last = (member.lastName || '').trim();
  member.fullName = [first, last].filter(Boolean).join(' ');

  if (first || last) {
    const others = members.filter((_, i) => i !== idx);
    member.email = generateAutoUsernameAndEmail(first, last, others, member.id).email;
  } else {
    member.email = '';
  }

  delete errorBag[`memberName_${idx}`];
  delete errorBag[`memberEmail_${idx}`];
};

const handleMemberContactInput = (
  members: OrganizationMember[] | undefined,
  idx: number,
  rawValue: string,
  inputEl: HTMLInputElement | null,
  errorBag: Record<string, string>
): void => {
  if (!members || !members[idx]) return;
  const cleaned = sanitizeContactInput(rawValue);
  if (inputEl && inputEl.value !== cleaned) {
    inputEl.value = cleaned;
  }
  members[idx].contactNumber = cleaned;
  delete errorBag[`memberContact_${idx}`];
};

const normalizeMembersForEdit = (members: OrganizationMember[] = []): OrganizationMember[] => {
  return members.map((m, idx) => {
    const hasSplit = Boolean((m.firstName || '').trim() || (m.lastName || '').trim());
    const split = hasSplit
      ? {
          firstName: sanitizeMemberNameInput(m.firstName || ''),
          lastName: sanitizeMemberNameInput(m.lastName || '')
        }
      : splitMemberFullName(m.fullName);
    const fullName =
      [split.firstName.trim(), split.lastName.trim()].filter(Boolean).join(' ') ||
      (m.fullName || '').trim();
    const contactNumber = sanitizeContactInput(m.contactNumber || '');
    const email =
      (m.email || '').trim() ||
      (split.firstName || split.lastName
        ? generateAutoUsernameAndEmail(
            split.firstName,
            split.lastName,
            members.filter((_, i) => i !== idx),
            m.id
          ).email
        : '');

    return {
      ...m,
      firstName: split.firstName,
      lastName: split.lastName,
      fullName,
      contactNumber,
      email
    };
  });
};

const normalizeMembersForSave = (members: OrganizationMember[] = []): OrganizationMember[] => {
  const nonEmpty = members.filter(
    m =>
      (m.firstName || '').trim().length > 0 ||
      (m.lastName || '').trim().length > 0 ||
      (m.fullName || '').trim().length > 0 ||
      (m.contactNumber || '').trim().length > 0 ||
      (m.email || '').trim().length > 0
  );

  return nonEmpty.map((m, idx) => {
    const split =
      (m.firstName || '').trim() || (m.lastName || '').trim()
        ? {
            firstName: sanitizeMemberNameInput((m.firstName || '').trim()),
            lastName: sanitizeMemberNameInput((m.lastName || '').trim())
          }
        : splitMemberFullName(m.fullName);
    const first = split.firstName.trim();
    const last = split.lastName.trim();
    const fullName = [first, last].filter(Boolean).join(' ') || (m.fullName || '').trim();
    const contactNumber = sanitizeContactInput(m.contactNumber || '');
    const email =
      (m.email || '').trim() ||
      (first || last
        ? generateAutoUsernameAndEmail(
            first,
            last,
            nonEmpty.filter((_, i) => i !== idx),
            m.id
          ).email
        : '');

    return {
      ...m,
      firstName: first,
      lastName: last,
      fullName,
      contactNumber,
      email
    };
  });
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

const validateOrganizationMembers = (members: OrganizationMember[] | undefined, errs: Record<string, string>) => {
  (members || []).forEach((member, idx) => {
    const first = (member.firstName || '').trim();
    const last = (member.lastName || '').trim();
    const full = (member.fullName || '').trim();
    const contact = (member.contactNumber || '').trim();
    const email = (member.email || '').trim();

    const hasAnyValue = Boolean(first || last || full || contact || email);
    if (hasAnyValue && !first && !last && !full) {
      errs[`memberName_${idx}`] = 'First Name or Last Name is required.';
    }

    if (contact && !/^\d{1,20}$/.test(contact)) {
      errs[`memberContact_${idx}`] = 'Enter numeric digits only (up to 20 digits).';
    }

    if (email) {
      if (email.length > 150 || !EMAIL_REGEX.test(email)) {
        errs[`memberEmail_${idx}`] = 'Enter a valid email address (max 150 characters).';
      }
    }
  });
};

const isUploadingOrgAttachment = ref(false);

const readAttachmentFiles = async (
  files: FileList,
  idPrefix: string,
  targetList: OrganizationAttachment[],
  orgId?: string
): Promise<number> => {
  let uploadedCount = 0;
  isUploadingOrgAttachment.value = true;
  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const uploaded = await uploadStoredFile(file, {
          scope: 'organization',
          orgId: orgId || 'ORG'
        });
        targetList.push({
          id: `${idPrefix}-${Date.now()}-${i}`,
          fileId: uploaded.fileId,
          title: uploaded.fileName,
          type: uploaded.type,
          fileSize: uploaded.fileSize,
          uploadDate: uploaded.uploadDate,
          fileUrl: uploaded.fileUrl,
          mimeType: uploaded.mimeType,
          storageBucket: uploaded.storageBucket,
          storagePath: uploaded.storagePath,
          storageProvider: uploaded.storageProvider
        });
        uploadedCount++;
      } catch (err: any) {
        emit('showToast', 'Upload Failed', `${file.name}: ${err?.message || 'Could not upload file.'}`, 'warning');
      }
    }
  } finally {
    isUploadingOrgAttachment.value = false;
  }
  return uploadedCount;
};

const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (!files || files.length === 0 || !managingOrg.value) return;

  if (!managingOrg.value.attachments) {
    managingOrg.value.attachments = [];
  }

  const count = await readAttachmentFiles(files, 'att', managingOrg.value.attachments, managingOrg.value.id);
  if (count > 0) {
    emit('showToast', 'Files Uploaded', `Uploaded ${count} document${count > 1 ? 's' : ''} to storage.`, 'success');
  }
  target.value = '';
};

// Mandatory Institutional Information Notes Requirements
const REQUIRED_ATTACHMENTS = [
  "Amendments to the constitution and by-laws (CBL) - if there's any",
  "Revision of vision-mission statement (if there's any)",
  "List of current members",
  "Plan of activities & projects with budgetary requirement for the current school year",
  "Financial statement of previous semester and photocopy of bankbook",
  "Accomplishment report of the previous school year"
];

const openProfileModal = (org: StudentOrganization) => {
  selectedProfileOrg.value = org;
};

const filteredOrgs = computed(() => {
  const query = (searchQuery.value || '').toLowerCase().trim();
  return (organizationsList.value || []).filter((org) => {
    if (!org) return false;
    if (org.status === 'Archived') return false;
    if (!query) return true;
    return (
      (org.name || '').toLowerCase().includes(query) ||
      (org.acronym || '').toLowerCase().includes(query) ||
      (org.president || '').toLowerCase().includes(query) ||
      (org.facultyAdviser || '').toLowerCase().includes(query) ||
      (org.registeredNumber || '').toLowerCase().includes(query) ||
      String(getOrgMemberCount(org)).includes(query) ||
      (org.membersList || []).some(m => 
        (m.fullName || m.name || '').toLowerCase().includes(query) ||
        (m.role || m.position || '').toLowerCase().includes(query) ||
        (m.studentId || '').toLowerCase().includes(query)
      ) ||
      (org.officers || []).some(o => 
        (o.name || '').toLowerCase().includes(query) ||
        (o.position || '').toLowerCase().includes(query)
      )
    );
  });
});

const openManageModal = (org: StudentOrganization) => {
  manageOrgErrors.value = {};
  const clone = JSON.parse(JSON.stringify(org)) as StudentOrganization;
  if (!clone.dateOfApplication) {
    clone.dateOfApplication = '2026-01-10';
  }
  if (!clone.objectives || clone.objectives.length === 0) {
    clone.objectives = [
      `Represent and safeguard the welfare, academic interests, and student governance of all member students in ${clone.name}.`,
      `Execute high-impact institutional action plan programs, technical seminars, leadership summits, and community outreach projects aligned with current school year goals.`,
      `Promote transparent financial fiduciary management, democratic decision-making, and active collaboration with university administration.`
    ];
  }
  if (!clone.membersList) {
    clone.membersList = [];
  } else {
    clone.membersList = normalizeMembersForEdit(clone.membersList);
  }
  if (!clone.attachments) {
    clone.attachments = [];
  }
  managingOrg.value = clone;
  newObjectiveText.value = '';
};

// Dynamic Members Table: Add Row
const addMemberRow = () => {
  if (!managingOrg.value) return;
  if (!managingOrg.value.membersList) {
    managingOrg.value.membersList = [];
  }
  managingOrg.value.membersList.push({
    id: 'mem-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    firstName: '',
    lastName: '',
    fullName: '',
    contactNumber: '',
    email: '',
    role: 'Member'
  });
};

// Dynamic Members Table: Remove Row
const removeMemberRow = (index: number) => {
  if (!managingOrg.value || !managingOrg.value.membersList) return;
  managingOrg.value.membersList.splice(index, 1);
};

// Objectives: Add & Remove
const addObjective = () => {
  if (!managingOrg.value) return;
  if (!managingOrg.value.objectives) {
    managingOrg.value.objectives = [];
  }
  if (newObjectiveText.value.trim()) {
    managingOrg.value.objectives.push(newObjectiveText.value.trim());
    newObjectiveText.value = '';
  } else {
    managingOrg.value.objectives.push('');
  }
};

const removeObjective = (index: number) => {
  if (!managingOrg.value || !managingOrg.value.objectives) return;
  managingOrg.value.objectives.splice(index, 1);
};

// Attachments: Remove
const removeAttachment = (index: number) => {
  if (!managingOrg.value || !managingOrg.value.attachments) return;
  const removed = managingOrg.value.attachments.splice(index, 1);
  if (removed[0]?.fileId) {
    deleteStoredFile(removed[0].fileId);
  }
  emit('showToast', 'Attachment Removed', `Removed ${removed[0]?.title || 'attachment'}.`, 'info');
};

const handleSaveOrg = async () => {
  if (!managingOrg.value) return;

  const errs: Record<string, string> = {};
  const rawName = (managingOrg.value.name || '').trim();
  if (!rawName) {
    errs.name = 'Organization Name is required.';
  } else if (organizationsList.value.some(o => o.id !== managingOrg.value?.id && o.name.toLowerCase() === rawName.toLowerCase())) {
    errs.name = 'An organization with this name already exists.';
  }

  if (!managingOrg.value.registeredNumber?.trim()) {
    errs.registeredNumber = 'Registration Number is required.';
  }

  if (!managingOrg.value.dateOfApplication) {
    errs.dateOfApplication = 'Date of Application is required.';
  }

  if (!managingOrg.value.nature?.trim()) {
    errs.nature = 'Nature of Organization is required.';
  }

  validateOrganizationMembers(managingOrg.value.membersList, errs);

  manageOrgErrors.value = errs;

  if (Object.keys(errs).length > 0) {
    emit('showToast', 'Validation Error', 'Please complete all required fields and fix any invalid member contact or email entries.', 'warning');
    return;
  }

  const cleanedMembers = normalizeMembersForSave(managingOrg.value.membersList || []);
  const cleanedAttachments = managingOrg.value.attachments || [];

  const target = organizationsList.value.find(o => o.id === managingOrg.value?.id);
  if (target) {
    target.name = managingOrg.value.name;
    target.registeredNumber = managingOrg.value.registeredNumber;
    target.dateOfApplication = managingOrg.value.dateOfApplication;
    target.nature = managingOrg.value.nature;
    target.objectives = managingOrg.value.objectives?.filter(o => o.trim().length > 0);
    target.membersList = cleanedMembers;
    target.attachments = cleanedAttachments;
    target.memberCount = cleanedMembers.length;
    target.attachmentCount = cleanedAttachments.length;
    target.status = managingOrg.value.status;
    
    // Update president name from members list if President role exists
    const presMember = cleanedMembers.find(m => (m.role || '').toLowerCase().includes('president'));
    if (presMember && (presMember.fullName || '').trim()) {
      target.president = presMember.fullName.trim();
    }
  }
  persistOrganizations();
  if (target) {
    try {
      await saveOrganizationToDb(target);
    } catch (err: any) {
      emit('showToast', 'Database Save Error', err?.message || 'Failed to save organization updates to PostgreSQL.', 'warning');
      return;
    }
  }
  emit('showToast', 'Organization Profile Updated', `${managingOrg.value.name} (${managingOrg.value.acronym}) compliance information saved.`, 'success');
  managingOrg.value = null;
};

// ==========================================
// CREATE ORGANIZATION STATE & HANDLERS
// ==========================================
const isCreateModalOpen = ref(false);
const isCreatingOrg = ref(false);
const createFileInputRef = ref<HTMLInputElement | null>(null);
const createOrgErrors = ref<Record<string, string>>({});

const createOrgForm = ref<{
  name: string;
  acronym: string;
  registeredNumber: string;
  dateOfApplication: string;
  nature: string;
  objectives: string[];
  newObjectiveText: string;
  membersList: OrganizationMember[];
  attachments: OrganizationAttachment[];
}>({
  name: '',
  acronym: '',
  registeredNumber: '',
  dateOfApplication: new Date().toISOString().split('T')[0],
  nature: 'Academic & Student Governance',
  objectives: [
    'Promote academic excellence, student leadership, and democratic representation across the university.',
    'Formulate and execute semester action plan programs, leadership training, and community initiatives.'
  ],
  newObjectiveText: '',
  membersList: [],
  attachments: []
});

const openCreateModal = () => {
  createOrgErrors.value = {};
  const nextSeq = organizationsList.value.length + 1;
  const seqPadded = nextSeq < 10 ? `00${nextSeq}` : (nextSeq < 100 ? `0${nextSeq}` : `${nextSeq}`);

  createOrgForm.value = {
    name: '',
    acronym: '',
    registeredNumber: `MSUN-SO-2026-${seqPadded}`,
    dateOfApplication: new Date().toISOString().split('T')[0],
    nature: 'Academic & Student Governance',
    objectives: [
      'Promote academic excellence, student leadership, and democratic representation across the university.',
      'Formulate and execute semester action plan programs, leadership training, and community initiatives.'
    ],
    newObjectiveText: '',
    membersList: [
      {
        id: 'mem-c-1',
        firstName: '',
        lastName: '',
        fullName: '',
        contactNumber: '',
        email: '',
        role: 'Member'
      }
    ],
    attachments: []
  };
  isCreateModalOpen.value = true;
};

const addCreateMemberRow = () => {
  createOrgForm.value.membersList.push({
    id: 'mem-c-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    firstName: '',
    lastName: '',
    fullName: '',
    contactNumber: '',
    email: '',
    role: 'Member'
  });
};

const removeCreateMemberRow = (index: number) => {
  createOrgForm.value.membersList.splice(index, 1);
};

const addCreateObjective = () => {
  if (createOrgForm.value.newObjectiveText.trim()) {
    createOrgForm.value.objectives.push(createOrgForm.value.newObjectiveText.trim());
    createOrgForm.value.newObjectiveText = '';
  } else {
    createOrgForm.value.objectives.push('');
  }
};

const removeCreateObjective = (index: number) => {
  createOrgForm.value.objectives.splice(index, 1);
};

const triggerCreateFileInput = () => {
  createFileInputRef.value?.click();
};

const handleCreateFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (!files || files.length === 0) return;

  const tempOrgId = (createOrgForm.value.acronym || 'NEW_ORG').trim().toUpperCase();
  const count = await readAttachmentFiles(files, 'att-c', createOrgForm.value.attachments, tempOrgId);
  if (count > 0) {
    emit('showToast', 'Files Uploaded', `Uploaded ${count} document${count > 1 ? 's' : ''} to storage.`, 'success');
  }
  target.value = '';
};

const removeCreateAttachment = (index: number) => {
  const removed = createOrgForm.value.attachments.splice(index, 1);
  if (removed[0]?.fileId) {
    deleteStoredFile(removed[0].fileId);
  }
  emit('showToast', 'Attachment Removed', `Removed ${removed[0]?.title || 'attachment'}.`, 'info');
};

const handleSaveNewOrg = async () => {
  if (isCreatingOrg.value) return;

  const errs: Record<string, string> = {};
  const rawName = createOrgForm.value.name.trim();
  const rawAcronym = createOrgForm.value.acronym.replace(/\s+/g, ' ').trim();

  if (!rawName) {
    errs.name = 'Organization Name is required.';
  } else if (organizationsList.value.some(o => o.name.toLowerCase() === rawName.toLowerCase())) {
    errs.name = 'An organization with this name already exists.';
  }

  if (!rawAcronym) {
    errs.acronym = 'Organization Acronym is required (e.g., SSC, SenSSo).';
  } else if (rawAcronym.length > 50) {
    errs.acronym = 'Acronym must be 50 characters or fewer.';
  } else if (!/[A-Za-z0-9]/.test(rawAcronym)) {
    errs.acronym = 'Acronym must contain letters or numbers.';
  } else if (
    organizationsList.value.some(
      o => (o.acronym || o.id || '').trim().toLowerCase() === rawAcronym.toLowerCase()
    )
  ) {
    errs.acronym = 'An organization with this acronym already exists.';
  }

  if (!createOrgForm.value.registeredNumber.trim()) {
    errs.registeredNumber = 'Registration Number is required.';
  }

  if (!createOrgForm.value.dateOfApplication) {
    errs.dateOfApplication = 'Date of Application is required.';
  }

  if (!createOrgForm.value.nature.trim()) {
    errs.nature = 'Nature of Organization is required.';
  }

  validateOrganizationMembers(createOrgForm.value.membersList, errs);

  createOrgErrors.value = errs;

  if (Object.keys(errs).length > 0) {
    emit('showToast', 'Validation Error', 'Please complete all required fields and fix any invalid member contact or email entries.', 'warning');
    return;
  }

  const acronym = rawAcronym.toUpperCase();

  const validMembers = normalizeMembersForSave(createOrgForm.value.membersList);
  const presMember = validMembers.find(m => (m.role || '').toLowerCase().includes('president')) || validMembers[0];
  const presidentName = presMember ? presMember.fullName.trim() : 'Appointed President';

  const newOrg: StudentOrganization = {
    id: acronym,
    name: rawName,
    acronym,
    nature: createOrgForm.value.nature.trim() || 'Academic Student Organization',
    status: 'Active',
    registeredNumber: createOrgForm.value.registeredNumber.trim(),
    dateOfApplication: createOrgForm.value.dateOfApplication,
    memberCount: validMembers.length,
    attachmentCount: createOrgForm.value.attachments.length,
    color: 'blue',
    description: `Recognized student body under the MSUN Office of Student Development, committed to ${createOrgForm.value.nature.toLowerCase()}.`,
    president: presidentName,
    facultyAdviser: 'Designated Faculty Adviser',
    officeLocation: 'Student Activity Center, Room 204',
    objectives: createOrgForm.value.objectives.filter(o => o.trim().length > 0),
    membersList: validMembers,
    attachments: createOrgForm.value.attachments
  };

  isCreatingOrg.value = true;
  organizationsList.value.unshift(newOrg);
  persistOrganizations();

  try {
    await saveOrganizationToDb(newOrg);
    emit('showToast', 'Organization Created', `"${newOrg.name}" (${newOrg.acronym}) registered successfully.`, 'success');
    isCreateModalOpen.value = false;
  } catch (err: any) {
    organizationsList.value = organizationsList.value.filter(o => o.id !== newOrg.id);
    persistOrganizations();
    emit('showToast', 'Create Failed', err?.message || 'Failed to save organization to database.', 'warning');
  } finally {
    isCreatingOrg.value = false;
  }
};
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
              Institutional Registry
            </span>
          </div>
          <h2 class="page-title flex items-center gap-2">
            <span>Accredited Student Organizations</span>
            <span
              class="info-cue"
              title="Directory of recognized student bodies with approved executive committees, faculty advisers, and Action Plan quotas."
            >
              <Info class="w-3.5 h-3.5" />
            </span>
          </h2>
        </div>

        <!-- System Administrator: Create New Organization Button -->
        <div v-if="showManageButton" class="flex items-center gap-3 shrink-0">
          <button
            @click="openCreateModal"
            class="btn-primary flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 transition-transform"
            title="Create and register a new student organization"
          >
            <Plus class="w-4 h-4" />
            <span>Create Organization</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Search Input -->
    <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4">
      <div class="relative">
        <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Search student councils by name, acronym, president, adviser, registered no. (e.g. MSUN-SO-2026-001), or member..."
          class="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
        />
      </div>
    </div>

    <!-- Grid of Organizations -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div
        v-for="org in filteredOrgs"
        :key="org.id"
        class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 transition-all flex flex-col justify-between hover:border-blue-300 hover:shadow-md group"
      >
        <div>
          <!-- Organization Name & Nature -->
          <div class="flex items-start gap-3.5 mb-3">
            <div class="relative shrink-0">
              <div
                class="w-12 h-12 rounded-xl flex items-center justify-center font-black border shadow-2xs transition-transform duration-200 group-hover:scale-105"
                :class="[
                  getOrgTheme(org.id).badgeBg,
                  getOrgTheme(org.id).badgeBorder,
                  getOrgTheme(org.id).badgeText,
                  (org.acronym || '').length > 4 ? 'text-[11px] tracking-tight px-1' : 'text-xs tracking-wider'
                ]"
              >
                {{ org.acronym || org.id }}
              </div>
              <span
                class="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white shadow-2xs"
                :class="org.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'"
                :title="org.status === 'Active' ? 'Accredited & Active' : 'Deactivated'"
              />
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="text-base font-extrabold text-slate-900 leading-snug">{{ org.name }}</h3>
                <span
                  class="text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0"
                  :class="org.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'"
                >
                  {{ org.status === 'Active' ? 'Active' : 'Deactivated' }}
                </span>
              </div>
              <p class="text-xs font-medium text-slate-500 mt-0.5">
                {{ org.nature || 'Recognized Student Council' }}
              </p>
            </div>
          </div>

          <!-- Standalone Registered Number Container -->
          <div class="p-3 bg-slate-100/80 rounded-xl border border-slate-200/90 flex items-center justify-between my-2.5">
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Registered No.</span>
            <span class="font-extrabold text-xs sm:text-sm text-slate-900">{{ org.registeredNumber || 'MSUN-SO-2026' }}</span>
          </div>

          <!-- Members Count & Attachment Count Grid (Restricted: only shown if user belongs to the organization or has admin permissions) -->
          <div
            v-if="canUserAccessOrg(org.id)"
            class="grid grid-cols-2 gap-3 p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200/90 my-2.5"
          >
            <div>
              <span class="text-xs font-bold text-slate-500 block uppercase tracking-wider">Members Count</span>
              <span class="font-black text-sm sm:text-base text-blue-800 block mt-1">{{ getOrgMemberCount(org).toLocaleString() }}</span>
            </div>

            <div>
              <span class="text-xs font-bold text-slate-500 block uppercase tracking-wider">Attachments</span>
              <span class="font-extrabold text-xs sm:text-sm text-emerald-700 block mt-1">{{ getOrgAttachmentCount(org) }} {{ getOrgAttachmentCount(org) === 1 ? 'File' : 'Files' }}</span>
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="mt-4 pt-3.5 border-t border-slate-100">
          <!-- When System Administrator: Balanced multi-button layout -->
          <div v-if="showManageButton" class="grid grid-cols-3 gap-2">
            <button
              type="button"
              @click="toggleOrgStatus(org)"
              class="btn-sm font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs"
              :class="org.status === 'Active' ? 'btn-danger' : 'btn-success'"
              :title="org.status === 'Active' ? 'Deactivate this organization' : 'Reactivate this organization'"
            >
              <PowerOff v-if="org.status === 'Active'" class="w-3.5 h-3.5 shrink-0" />
              <Power v-else class="w-3.5 h-3.5 shrink-0" />
              <span>{{ org.status === 'Active' ? 'Deactivate' : 'Activate' }}</span>
            </button>

            <button
              @click="openManageModal(org)"
              class="btn-warning btn-sm flex items-center justify-center gap-1.5 cursor-pointer text-xs font-bold"
              title="Manage organization profile and roster"
            >
              <Settings class="w-3.5 h-3.5 shrink-0" />
              <span>Manage</span>
            </button>

            <button
              @click="openProfileModal(org)"
              class="btn-info btn-sm flex items-center justify-center gap-1.5 cursor-pointer text-xs font-bold"
              title="View full organization profile and details"
            >
              <Eye class="w-3.5 h-3.5 shrink-0" />
              <span>View Profile</span>
            </button>
          </div>

          <!-- When regular user or reviewer: View Profile button fits full card width seamlessly, eliminating empty space imbalance -->
          <div v-else>
            <button
              @click="openProfileModal(org)"
              class="btn-info btn-sm w-full py-2 px-4 flex items-center justify-center gap-2 cursor-pointer font-bold text-xs shadow-2xs hover:shadow-xs"
              title="View full organization profile and details"
            >
              <Eye class="w-4 h-4" />
              <span>View Profile</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state when no organizations match query or if list is empty -->
    <div
      v-if="filteredOrgs.length === 0"
      class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-12 text-center my-6"
    >
      <Building2 class="w-12 h-12 text-slate-300 mx-auto mb-3" />
      <h3 class="text-base font-bold text-slate-800">No Organizations Found</h3>
      <p class="text-xs text-slate-500 max-w-sm mx-auto mt-1">
        {{ searchQuery ? 'No organizations match your search query. Try clearing the search box.' : 'No accredited student organizations are currently recorded in the registry.' }}
      </p>
      <button
        v-if="searchQuery"
        type="button"
        @click="searchQuery = ''"
        class="mt-4 px-3.5 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
      >
        Clear Search Filter
      </button>
    </div>

    <!-- Manage Organization Modal (System Administrator) -->
    <div
      v-if="managingOrg"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 overflow-y-auto"
      @click.self="managingOrg = null"
    >
      <div class="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <!-- Modal Top Header -->
        <div class="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div class="flex items-center gap-3">
            <div 
              class="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-sm border border-white/20"
              :class="[
                ORG_COLORS[managingOrg.id]?.badgeBg || 'bg-blue-600',
                ORG_COLORS[managingOrg.id]?.badgeText || 'text-white'
              ]"
            >
              {{ managingOrg.acronym }}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  {{ managingOrg.registeredNumber }}
                </span>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Manage Registry
                </span>
              </div>
              <h3 class="text-base sm:text-lg font-bold text-white leading-tight mt-0.5">
                {{ managingOrg.name }}
              </h3>
            </div>
          </div>

          <button
            @click="managingOrg = null"
            class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Scrollable Modal Body -->
        <div class="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 bg-white">
          
          <!-- 1. ORGANIZATION REGISTRATION DETAILS -->
          <div class="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
            <div class="flex items-center gap-2 border-b border-slate-200/80 pb-2.5">
              <Building2 class="w-4 h-4 text-blue-900" />
              <h4 class="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Organization Registration Details
              </h4>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Organization Name -->
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Organization Name <span class="text-rose-500">*</span>
                </label>
                <input
                  v-model="managingOrg.name"
                  type="text"
                  placeholder="e.g., Supreme Student Council"
                  class="w-full px-3.5 py-2 text-xs sm:text-sm font-semibold border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white shadow-2xs transition-colors"
                  :class="manageOrgErrors.name ? 'border-rose-400 ring-1 ring-rose-200 bg-rose-50/20' : 'border-slate-300'"
                  @input="delete manageOrgErrors.name"
                />
                <p v-if="manageOrgErrors.name" class="text-[10px] text-rose-500 mt-1 font-semibold">{{ manageOrgErrors.name }}</p>
              </div>

              <!-- Registration Number -->
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Registration Number <span class="text-rose-500">*</span>
                </label>
                <input
                  v-model="managingOrg.registeredNumber"
                  type="text"
                  placeholder="e.g., MSUN-SO-2026-001"
                  class="w-full px-3.5 py-2 text-xs sm:text-sm font-bold text-blue-950 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white shadow-2xs transition-colors"
                  :class="manageOrgErrors.registeredNumber ? 'border-rose-400 ring-1 ring-rose-200 bg-rose-50/20' : 'border-slate-300'"
                  @input="delete manageOrgErrors.registeredNumber"
                />
                <p v-if="manageOrgErrors.registeredNumber" class="text-[10px] text-rose-500 mt-1 font-semibold">{{ manageOrgErrors.registeredNumber }}</p>
              </div>

              <!-- Date of Application -->
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Date of Application <span class="text-rose-500">*</span>
                </label>
                <div class="relative">
                  <Calendar class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    v-model="managingOrg.dateOfApplication"
                    type="date"
                    class="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm font-medium border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white shadow-2xs transition-colors"
                    :class="manageOrgErrors.dateOfApplication ? 'border-rose-400 ring-1 ring-rose-200 bg-rose-50/20' : 'border-slate-300'"
                    @input="delete manageOrgErrors.dateOfApplication"
                    @change="delete manageOrgErrors.dateOfApplication"
                  />
                </div>
                <p v-if="manageOrgErrors.dateOfApplication" class="text-[10px] text-rose-500 mt-1 font-semibold">{{ manageOrgErrors.dateOfApplication }}</p>
              </div>

              <!-- Nature of Organization -->
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between gap-2">
                  <span>Nature of Organization <span class="text-rose-500">*</span></span>
                  <QuickAddOptionButton
                    category="org_category"
                    category-name="Organization Category"
                    :current-user="currentUser"
                    @created="(opt) => { if (managingOrg) managingOrg.nature = opt.label; delete manageOrgErrors.nature; }"
                    size="sm"
                  />
                </label>
                <input
                  v-model="managingOrg.nature"
                  type="text"
                  list="manageOrgNatureOptionsList"
                  placeholder="Select or enter Nature / Category"
                  class="w-full px-3.5 py-2 text-xs sm:text-sm font-medium border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white shadow-2xs transition-colors"
                  :class="manageOrgErrors.nature ? 'border-rose-400 ring-1 ring-rose-200 bg-rose-50/20' : 'border-slate-300'"
                  @input="delete manageOrgErrors.nature"
                  @change="delete manageOrgErrors.nature"
                />
                <datalist id="manageOrgNatureOptionsList">
                  <option v-for="opt in allNatureOptions" :key="opt" :value="opt">{{ opt }}</option>
                </datalist>
                <p v-if="manageOrgErrors.nature" class="text-[10px] text-rose-500 mt-1 font-semibold">{{ manageOrgErrors.nature }}</p>
              </div>
            </div>
          </div>

          <!-- 2. OBJECTIVES OF THE ORGANIZATIONS -->
          <div class="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
              <div>
                <h4 class="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  Objectives of the Organizations
                </h4>
                <p class="text-xs text-slate-500 mt-0.5">
                  Institutional goals, student service mandates, and strategic governance priorities.
                </p>
              </div>

              <!-- Section Action Button: Consistent Primary Blue Color -->
              <button
                type="button"
                @click="addObjective"
                class="btn-primary btn-sm cursor-pointer self-start sm:self-auto"
              >
                <Plus class="w-3.5 h-3.5" />
                <span>Add Objective</span>
              </button>
            </div>

            <!-- Objective Items List -->
            <div class="space-y-2.5">
              <div
                v-for="(obj, idx) in managingOrg.objectives"
                :key="idx"
                class="flex items-start gap-2.5 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/90 hover:border-slate-300 transition-all"
              >
                <span class="w-6 h-6 rounded-lg bg-blue-100 text-blue-900 font-black text-xs flex items-center justify-center shrink-0 mt-1 shadow-2xs">
                  {{ idx + 1 }}
                </span>
                <textarea
                  v-model="managingOrg.objectives[idx]"
                  rows="2"
                  class="flex-1 px-3 py-1.5 text-xs text-slate-800 font-medium border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-900 shadow-2xs resize-y"
                  placeholder="State the organizational objective clearly..."
                ></textarea>
                <button
                  type="button"
                  @click="removeObjective(idx)"
                  class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0 mt-0.5"
                  title="Remove Objective"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>

              <div 
                v-if="!managingOrg.objectives || managingOrg.objectives.length === 0"
                class="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200"
              >
                No objectives defined. Click <strong>+ Add Objective</strong> above to state organizational objectives.
              </div>
            </div>
          </div>

          <!-- 3. MEMBERS DIRECTORY (Full Name, Contact Numbers, Email Address) WITH ADD ROW -->
          <div class="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
              <div>
                <div class="flex items-center gap-2">
                  <Users class="w-4 h-4 text-blue-900" />
                  <h4 class="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                    Members (First Name, Last Name, Contact Numbers, Email Address)
                  </h4>
                  <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-900 border border-blue-200">
                    {{ managingOrg.membersList?.length || 0 }} Members
                  </span>
                </div>
                <p class="text-xs text-slate-500 mt-0.5">
                  First Name, Last Name, Contact Numbers, and auto-generated @msunaawan.edu.ph Email Address of officers and members.
                </p>
              </div>

              <!-- Section Action Button: Consistent Primary Blue Color -->
              <button
                type="button"
                @click="addMemberRow"
                class="btn-primary btn-sm cursor-pointer self-start sm:self-auto"
              >
                <Plus class="w-3.5 h-3.5" />
                <span>Add Row</span>
              </button>
            </div>

            <!-- Members Interactive Table -->
            <div class="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div class="overflow-x-auto max-h-72">
                <table class="w-full text-left border-collapse text-xs">
                  <thead class="bg-slate-100/90 text-slate-700 uppercase font-bold sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th class="py-2.5 px-3 w-10 text-center">#</th>
                      <th class="py-2.5 px-3 min-w-[140px]">First Name <span class="text-rose-500">*</span></th>
                      <th class="py-2.5 px-3 min-w-[140px]">Last Name <span class="text-rose-500">*</span></th>
                      <th class="py-2.5 px-3 min-w-[160px]">Contact Numbers <span class="text-rose-500">*</span></th>
                      <th class="py-2.5 px-3 min-w-[210px]">Email Address</th>
                      <th class="py-2.5 px-3 w-14 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 bg-white">
                    <tr
                      v-for="(member, idx) in managingOrg.membersList"
                      :key="member.id || idx"
                      class="hover:bg-slate-50/80 transition-colors"
                    >
                      <td class="py-2 px-3 text-center text-slate-400 font-bold">
                        {{ idx + 1 }}
                      </td>
                      <td class="py-2 px-3 align-top">
                        <input
                          :value="member.firstName"
                          @input="syncMemberNameAndEmail(managingOrg.membersList, idx, 'firstName', ($event.target as HTMLInputElement).value, $event.target as HTMLInputElement, manageOrgErrors)"
                          type="text"
                          maxlength="40"
                          placeholder="e.g., Juan"
                          class="w-full px-2.5 py-1.5 text-xs font-semibold border rounded-lg focus:outline-none focus:ring-2 bg-white"
                          :class="manageOrgErrors[`memberName_${idx}`] ? 'border-rose-500 focus:ring-rose-500 bg-rose-50/30' : 'border-slate-200 focus:ring-blue-900'"
                        />
                        <p v-if="manageOrgErrors[`memberName_${idx}`]" class="mt-1 text-[10px] font-semibold text-rose-600">
                          {{ manageOrgErrors[`memberName_${idx}`] }}
                        </p>
                      </td>
                      <td class="py-2 px-3 align-top">
                        <input
                          :value="member.lastName"
                          @input="syncMemberNameAndEmail(managingOrg.membersList, idx, 'lastName', ($event.target as HTMLInputElement).value, $event.target as HTMLInputElement, manageOrgErrors)"
                          type="text"
                          maxlength="40"
                          placeholder="e.g., Dela Cruz"
                          class="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
                        />
                      </td>
                      <td class="py-2 px-3 align-top">
                        <input
                          :value="member.contactNumber"
                          @keydown="handleContactKeyDown"
                          @input="handleMemberContactInput(managingOrg.membersList, idx, ($event.target as HTMLInputElement).value, $event.target as HTMLInputElement, manageOrgErrors)"
                          type="text"
                          inputmode="numeric"
                          pattern="[0-9]*"
                          maxlength="20"
                          placeholder="e.g., 09171234567"
                          class="w-full px-2.5 py-1.5 text-xs font-medium border rounded-lg focus:outline-none focus:ring-2 bg-white"
                          :class="manageOrgErrors[`memberContact_${idx}`] ? 'border-rose-500 focus:ring-rose-500 bg-rose-50/30' : 'border-slate-200 focus:ring-blue-900'"
                        />
                        <p v-if="manageOrgErrors[`memberContact_${idx}`]" class="mt-1 text-[10px] font-semibold text-rose-600">
                          {{ manageOrgErrors[`memberContact_${idx}`] }}
                        </p>
                      </td>
                      <td class="py-2 px-3 align-top">
                        <input
                          :value="member.email"
                          readonly
                          type="email"
                          maxlength="150"
                          placeholder="firstname.lastname@msunaawan.edu.ph"
                          title="Automatically generated @msunaawan.edu.ph email from First Name and Last Name"
                          class="w-full px-2.5 py-1.5 text-xs font-mono border rounded-lg bg-slate-100/80 text-slate-700 select-all cursor-default focus:outline-none"
                          :class="manageOrgErrors[`memberEmail_${idx}`] ? 'border-rose-500 bg-rose-50/30' : 'border-slate-200'"
                        />
                        <p v-if="manageOrgErrors[`memberEmail_${idx}`]" class="mt-1 text-[10px] font-semibold text-rose-600">
                          {{ manageOrgErrors[`memberEmail_${idx}`] }}
                        </p>
                      </td>
                      <td class="py-2 px-3 text-center">
                        <button
                          type="button"
                          @click="removeMemberRow(idx)"
                          class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Remove Row"
                        >
                          <Trash2 class="w-4 h-4" />
                        </button>
                      </td>
                    </tr>

                    <tr v-if="!managingOrg.membersList || managingOrg.membersList.length === 0">
                      <td colspan="6" class="py-6 text-center text-slate-400 text-xs">
                        No members recorded yet. Click <strong>+ Add Row</strong> above to add member details.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- 4. ATTACHMENT SECTION -->
          <div class="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
              <div>
                <div class="flex items-center gap-2">
                  <Paperclip class="w-4 h-4 text-blue-900" />
                  <h4 class="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                    Attachment
                  </h4>
                  <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {{ managingOrg.attachments?.length || 0 }} Files Attached
                  </span>
                </div>
                <p class="text-xs text-slate-500 mt-0.5">
                  Official CBL, annual financial statements, bankbooks, and accomplishment documentation.
                </p>
              </div>

              <!-- Native hidden file input -->
              <input
                ref="fileInputRef"
                type="file"
                multiple
                accept=".pdf,.docx,.xlsx,.xls,.png,.jpg,.jpeg"
                class="hidden"
                @change="handleFileUpload"
              />

              <!-- Add Attachment Action: Consistent Primary Blue Color -->
              <button
                type="button"
                @click="triggerFileInput"
                :disabled="isUploadingOrgAttachment"
                class="btn-primary btn-sm cursor-pointer self-start sm:self-auto disabled:opacity-60"
              >
                <Loader2 v-if="isUploadingOrgAttachment" class="w-3.5 h-3.5 animate-spin" />
                <Plus v-else class="w-3.5 h-3.5" />
                <span>{{ isUploadingOrgAttachment ? 'Uploading...' : 'Add Attachment' }}</span>
              </button>
            </div>

            <!-- Existing Attached Files Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div
                v-for="(att, idx) in managingOrg.attachments"
                :key="att.id || idx"
                class="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300 transition-all shadow-2xs"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 overflow-hidden">
                    <img
                      v-if="att.fileUrl && isImageAttachment(att.title, att.mimeType)"
                      :src="att.fileUrl"
                      :alt="att.title"
                      class="w-full h-full object-cover"
                    />
                    <Paperclip v-else class="w-4 h-4" />
                  </div>
                  <div class="min-w-0">
                    <p class="text-xs font-bold text-slate-800 truncate" :title="att.title">
                      {{ att.title }}
                    </p>
                    <p class="text-[10px] text-slate-500">
                      {{ att.type }} &bull; {{ att.fileSize }} &bull; {{ att.uploadDate }}
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-1 shrink-0">
                  <a
                    v-if="att.fileUrl"
                    :href="att.fileUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View Attachment"
                  >
                    <ExternalLink class="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    @click="removeAttachment(idx)"
                    class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Remove Attachment"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div 
                v-if="!managingOrg.attachments || managingOrg.attachments.length === 0" 
                class="sm:col-span-2 p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200"
              >
                No documents attached yet. Use the fields above to attach compliance files.
              </div>
            </div>
          </div>

          <!-- 5. INFORMATION NOTES (Moved to the bottom in clean bullet form) -->
          <div class="bg-amber-50/85 border border-amber-200/90 rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs">
            <div class="flex items-center gap-2.5 border-b border-amber-200/70 pb-2.5">
              <div class="w-7 h-7 rounded-lg bg-amber-200 text-amber-900 flex items-center justify-center font-black shrink-0 shadow-2xs">
                <Info class="w-4 h-4" />
              </div>
              <div>
                <h4 class="text-xs sm:text-sm font-extrabold text-amber-950 uppercase tracking-wider">
                  Information Notes
                </h4>
                <p class="text-xs font-bold text-amber-900">
                  Requirements to be attached:
                </p>
              </div>
            </div>

            <!-- Bullet List of Required Attachments -->
            <ul class="space-y-2 text-xs text-slate-800 font-medium pl-1.5 pt-1">
              <li
                v-for="(req, idx) in REQUIRED_ATTACHMENTS"
                :key="idx"
                class="flex items-start gap-2.5 leading-relaxed"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-amber-700 mt-2 shrink-0"></span>
                <span>{{ req }}</span>
              </li>
            </ul>
          </div>

        </div>

        <!-- Modal Bottom Footer -->
        <div class="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <p class="text-[11px] text-slate-500 font-medium hidden sm:block">
            Mindanao State University at Naawan &bull; Office of Student Development Accreditation System
          </p>

          <div class="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <!-- Deactivate / Activate Button in Manage Modal -->
            <button
              v-if="managingOrg"
              type="button"
              @click="toggleOrgStatus(managingOrg)"
              class="btn-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              :class="managingOrg.status === 'Active' ? 'btn-danger' : 'btn-success'"
              :title="managingOrg.status === 'Active' ? 'Deactivate this organization' : 'Reactivate this organization'"
            >
              <PowerOff v-if="managingOrg.status === 'Active'" class="w-3.5 h-3.5" />
              <Power v-else class="w-3.5 h-3.5" />
              <span>{{ managingOrg.status === 'Active' ? 'Deactivate' : 'Activate' }}</span>
            </button>

            <button
              @click="managingOrg = null"
              class="btn-secondary w-full sm:w-auto cursor-pointer"
            >
              Cancel
            </button>
            <button
              @click="handleSaveOrg"
              class="btn-primary w-full sm:w-auto cursor-pointer"
            >
              <Save class="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Organization Modal (System Administrator) -->
    <div
      v-if="isCreateModalOpen"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 overflow-y-auto"
      @click.self="isCreateModalOpen = false"
    >
      <div class="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <!-- Modal Top Header -->
        <div class="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm border border-white/20">
              <Building2 class="w-5 h-5" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  New Organization Record
                </span>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  System Administrator
                </span>
              </div>
              <h3 class="text-lg font-extrabold text-white mt-0.5">
                Create New Organization
              </h3>
            </div>
          </div>

          <button
            @click="isCreateModalOpen = false"
            class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Modal Scrollable Body -->
        <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/50">

          <!-- 1. GENERAL INFORMATION -->
          <div class="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
            <div class="border-b border-slate-200/80 pb-2.5">
              <h4 class="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                1. Organization Information
              </h4>
              <p class="text-xs text-slate-500 mt-0.5">
                Enter official accredited naming, registry registration code, date of application, and institutional nature.
              </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-6 gap-4">
              <!-- Organization Name -->
              <div class="md:col-span-4">
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Organization Name <span class="text-rose-500">*</span>
                </label>
                <input
                  v-model="createOrgForm.name"
                  type="text"
                  placeholder="e.g., Supreme Student Council"
                  class="w-full px-3.5 py-2.5 text-xs font-bold border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-900 transition-colors"
                  :class="createOrgErrors.name ? 'border-rose-400 ring-1 ring-rose-200 bg-rose-50/20' : 'border-slate-300'"
                  @input="delete createOrgErrors.name"
                />
                <p v-if="createOrgErrors.name" class="text-[10px] text-rose-500 mt-1 font-semibold">{{ createOrgErrors.name }}</p>
              </div>

              <!-- Organization Acronym -->
              <div class="md:col-span-2">
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Acronym <span class="text-rose-500">*</span>
                </label>
                <input
                  v-model="createOrgForm.acronym"
                  type="text"
                  maxlength="50"
                  placeholder="e.g., SSC, SenSSo"
                  class="w-full px-3.5 py-2.5 text-xs font-bold uppercase border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-900 transition-colors"
                  :class="createOrgErrors.acronym ? 'border-rose-400 ring-1 ring-rose-200 bg-rose-50/20' : 'border-slate-300'"
                  @input="delete createOrgErrors.acronym"
                />
                <p v-if="createOrgErrors.acronym" class="text-[10px] text-rose-500 mt-1 font-semibold">{{ createOrgErrors.acronym }}</p>
              </div>

              <!-- Registration Number -->
              <div class="md:col-span-3">
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Registration Number <span class="text-rose-500">*</span>
                </label>
                <input
                  v-model="createOrgForm.registeredNumber"
                  type="text"
                  placeholder="e.g., MSUN-SO-2026-009"
                  class="w-full px-3.5 py-2.5 text-xs font-bold border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-900 transition-colors"
                  :class="createOrgErrors.registeredNumber ? 'border-rose-400 ring-1 ring-rose-200 bg-rose-50/20' : 'border-slate-300'"
                  @input="delete createOrgErrors.registeredNumber"
                />
                <p v-if="createOrgErrors.registeredNumber" class="text-[10px] text-rose-500 mt-1 font-semibold">{{ createOrgErrors.registeredNumber }}</p>
              </div>

              <!-- Date of Application -->
              <div class="md:col-span-3">
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Date of Application <span class="text-rose-500">*</span>
                </label>
                <input
                  v-model="createOrgForm.dateOfApplication"
                  type="date"
                  class="w-full px-3.5 py-2.5 text-xs border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-900 transition-colors"
                  :class="createOrgErrors.dateOfApplication ? 'border-rose-400 ring-1 ring-rose-200 bg-rose-50/20' : 'border-slate-300'"
                  @input="delete createOrgErrors.dateOfApplication"
                  @change="delete createOrgErrors.dateOfApplication"
                />
                <p v-if="createOrgErrors.dateOfApplication" class="text-[10px] text-rose-500 mt-1 font-semibold">{{ createOrgErrors.dateOfApplication }}</p>
              </div>

              <!-- Nature of Organization -->
              <div class="md:col-span-6">
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Nature of Organization <span class="text-rose-500">*</span></span>
                  <QuickAddOptionButton
                    category="org_category"
                    category-name="Organization Category"
                    :current-user="currentUser"
                    @created="(opt) => { createOrgForm.nature = opt.label; delete createOrgErrors.nature; }"
                    size="sm"
                  />
                </label>
                <div class="relative">
                  <input
                    type="text"
                    list="orgNatureOptionsList"
                    v-model="createOrgForm.nature"
                    placeholder="Select or enter Nature / Category"
                    class="w-full px-3.5 py-2.5 text-xs border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-900 font-medium transition-colors"
                    :class="createOrgErrors.nature ? 'border-rose-400 ring-1 ring-rose-200 bg-rose-50/20' : 'border-slate-300'"
                    @input="delete createOrgErrors.nature"
                    @change="delete createOrgErrors.nature"
                  />
                  <datalist id="orgNatureOptionsList">
                    <option v-for="opt in allNatureOptions" :key="opt" :value="opt">{{ opt }}</option>
                  </datalist>
                </div>
                <p v-if="createOrgErrors.nature" class="text-[10px] text-rose-500 mt-1 font-semibold">{{ createOrgErrors.nature }}</p>
              </div>
            </div>
          </div>

          <!-- 2. OBJECTIVES OF THE ORGANIZATIONS -->
          <div class="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
            <div class="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
              <div>
                <h4 class="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  2. Objectives of the Organizations
                </h4>
                <p class="text-xs text-slate-500 mt-0.5">
                  Articulate core institutional mandates, student development priorities, and developmental targets.
                </p>
              </div>

              <button
                type="button"
                @click="addCreateObjective"
                class="btn-primary btn-sm cursor-pointer"
              >
                <Plus class="w-3.5 h-3.5" />
                <span>Add Objective</span>
              </button>
            </div>

            <!-- Objectives List -->
            <div class="space-y-2.5">
              <div
                v-for="(_, idx) in createOrgForm.objectives"
                :key="idx"
                class="flex items-start gap-2.5"
              >
                <span class="w-6 h-6 rounded-lg bg-blue-100 text-blue-900 font-bold text-xs flex items-center justify-center shrink-0 mt-2">
                  {{ idx + 1 }}
                </span>
                <textarea
                  v-model="createOrgForm.objectives[idx]"
                  rows="2"
                  placeholder="State an institutional objective for the organization..."
                  class="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                ></textarea>
                <button
                  type="button"
                  @click="removeCreateObjective(idx)"
                  class="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer mt-1"
                  title="Remove Objective"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>

              <div v-if="createOrgForm.objectives.length === 0" class="text-center py-4 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                No objectives added. Click "+ Add Objective" above to add goals.
              </div>
            </div>
          </div>

          <!-- 3. MEMBERS (Full Name, Contact Numbers, Email Address) -->
          <div class="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
              <div>
                <h4 class="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  3. Members (First Name, Last Name, Contact Numbers, Email Address)
                </h4>
                <p class="text-xs text-slate-500 mt-0.5">
                  Provide member rosters with First Name, Last Name, Contact Numbers, and auto-generated @msunaawan.edu.ph Email Address.
                </p>
              </div>

              <button
                type="button"
                @click="addCreateMemberRow"
                class="btn-primary btn-sm cursor-pointer"
              >
                <UserPlus class="w-3.5 h-3.5" />
                <span>Add Row</span>
              </button>
            </div>

            <!-- Members Table -->
            <div class="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                  <thead class="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th class="py-2.5 px-3 w-10 text-center">#</th>
                      <th class="py-2.5 px-3 min-w-[140px]">First Name *</th>
                      <th class="py-2.5 px-3 min-w-[140px]">Last Name *</th>
                      <th class="py-2.5 px-3 min-w-[150px]">Contact Numbers</th>
                      <th class="py-2.5 px-3 min-w-[200px]">Email Address</th>
                      <th class="py-2.5 px-3 w-12 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    <tr
                      v-for="(member, idx) in createOrgForm.membersList"
                      :key="member.id || idx"
                      class="hover:bg-slate-50/60 transition-colors"
                    >
                      <td class="py-2.5 px-3 text-center text-slate-400 font-bold text-xs">
                        {{ idx + 1 }}
                      </td>
                      <td class="py-2 px-3 align-top">
                        <input
                          :value="member.firstName"
                          @input="syncMemberNameAndEmail(createOrgForm.membersList, idx, 'firstName', ($event.target as HTMLInputElement).value, $event.target as HTMLInputElement, createOrgErrors)"
                          type="text"
                          maxlength="40"
                          placeholder="e.g. Maria Clarisse"
                          class="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white focus:outline-none focus:ring-1 font-medium"
                          :class="createOrgErrors[`memberName_${idx}`] ? 'border-rose-500 focus:ring-rose-500 bg-rose-50/30' : 'border-slate-300 focus:ring-blue-900'"
                        />
                        <p v-if="createOrgErrors[`memberName_${idx}`]" class="mt-1 text-[10px] font-semibold text-rose-600">
                          {{ createOrgErrors[`memberName_${idx}`] }}
                        </p>
                      </td>
                      <td class="py-2 px-3 align-top">
                        <input
                          :value="member.lastName"
                          @input="syncMemberNameAndEmail(createOrgForm.membersList, idx, 'lastName', ($event.target as HTMLInputElement).value, $event.target as HTMLInputElement, createOrgErrors)"
                          type="text"
                          maxlength="40"
                          placeholder="e.g. Santos"
                          class="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-900 font-medium"
                        />
                      </td>
                      <td class="py-2 px-3 align-top">
                        <input
                          :value="member.contactNumber"
                          @keydown="handleContactKeyDown"
                          @input="handleMemberContactInput(createOrgForm.membersList, idx, ($event.target as HTMLInputElement).value, $event.target as HTMLInputElement, createOrgErrors)"
                          type="text"
                          inputmode="numeric"
                          pattern="[0-9]*"
                          maxlength="20"
                          placeholder="e.g. 09171234567"
                          class="w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white focus:outline-none focus:ring-1"
                          :class="createOrgErrors[`memberContact_${idx}`] ? 'border-rose-500 focus:ring-rose-500 bg-rose-50/30' : 'border-slate-300 focus:ring-blue-900'"
                        />
                        <p v-if="createOrgErrors[`memberContact_${idx}`]" class="mt-1 text-[10px] font-semibold text-rose-600">
                          {{ createOrgErrors[`memberContact_${idx}`] }}
                        </p>
                      </td>
                      <td class="py-2 px-3 align-top">
                        <input
                          :value="member.email"
                          readonly
                          type="email"
                          maxlength="150"
                          placeholder="firstname.lastname@msunaawan.edu.ph"
                          title="Automatically generated @msunaawan.edu.ph email from First Name and Last Name"
                          class="w-full px-2.5 py-1.5 text-xs font-mono border rounded-lg bg-slate-100/80 text-slate-700 select-all cursor-default focus:outline-none"
                          :class="createOrgErrors[`memberEmail_${idx}`] ? 'border-rose-500 bg-rose-50/30' : 'border-slate-300'"
                        />
                        <p v-if="createOrgErrors[`memberEmail_${idx}`]" class="mt-1 text-[10px] font-semibold text-rose-600">
                          {{ createOrgErrors[`memberEmail_${idx}`] }}
                        </p>
                      </td>
                      <td class="py-2 px-3 text-center">
                        <button
                          type="button"
                          @click="removeCreateMemberRow(idx)"
                          class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Remove Row"
                        >
                          <Trash2 class="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                    <tr v-if="createOrgForm.membersList.length === 0">
                      <td colspan="6" class="py-6 text-center text-slate-400 text-xs">
                        No members added yet. Click <strong>+ Add Row</strong> above to add members.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- 4. ATTACHMENT SECTION -->
          <div class="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
              <div>
                <div class="flex items-center gap-2">
                  <Paperclip class="w-4 h-4 text-blue-900" />
                  <h4 class="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                    4. Attachment
                  </h4>
                  <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {{ createOrgForm.attachments.length }} Files Attached
                  </span>
                </div>
                <p class="text-xs text-slate-500 mt-0.5">
                  Attach verified digital copies of required institutional accreditation documents.
                </p>
              </div>

              <!-- Native hidden file input for create modal -->
              <input
                ref="createFileInputRef"
                type="file"
                multiple
                accept=".pdf,.docx,.xlsx,.xls,.png,.jpg,.jpeg"
                class="hidden"
                @change="handleCreateFileUpload"
              />

              <!-- Add Attachment Button -->
              <button
                type="button"
                @click="triggerCreateFileInput"
                :disabled="isUploadingOrgAttachment"
                class="btn-primary btn-sm cursor-pointer self-start sm:self-auto disabled:opacity-60"
              >
                <Loader2 v-if="isUploadingOrgAttachment" class="w-3.5 h-3.5 animate-spin" />
                <Plus v-else class="w-3.5 h-3.5" />
                <span>{{ isUploadingOrgAttachment ? 'Uploading...' : 'Add Attachment' }}</span>
              </button>
            </div>

            <!-- Existing Attached Files Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div
                v-for="(att, idx) in createOrgForm.attachments"
                :key="att.id || idx"
                class="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300 transition-all shadow-2xs"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 overflow-hidden">
                    <img
                      v-if="att.fileUrl && isImageAttachment(att.title, att.mimeType)"
                      :src="att.fileUrl"
                      :alt="att.title"
                      class="w-full h-full object-cover"
                    />
                    <Paperclip v-else class="w-4 h-4" />
                  </div>
                  <div class="min-w-0">
                    <p class="text-xs font-bold text-slate-800 truncate" :title="att.title">
                      {{ att.title }}
                    </p>
                    <p class="text-[10px] text-slate-500">
                      {{ att.type }} &bull; {{ att.fileSize }} &bull; {{ att.uploadDate }}
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-1 shrink-0">
                  <a
                    v-if="att.fileUrl"
                    :href="att.fileUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View Attachment"
                  >
                    <ExternalLink class="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    @click="removeCreateAttachment(idx)"
                    class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Remove Attachment"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div 
                v-if="createOrgForm.attachments.length === 0" 
                class="sm:col-span-2 p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200"
              >
                No documents attached yet. Click <strong>+ Add Attachment</strong> to select files.
              </div>
            </div>
          </div>

          <!-- 5. INFORMATION NOTES (Requirements to be attached) -->
          <div class="bg-amber-50/85 border border-amber-200/90 rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs">
            <div class="flex items-center gap-2.5 border-b border-amber-200/70 pb-2.5">
              <div class="w-7 h-7 rounded-lg bg-amber-200 text-amber-900 flex items-center justify-center font-black shrink-0 shadow-2xs">
                <Info class="w-4 h-4" />
              </div>
              <div>
                <h4 class="text-xs sm:text-sm font-extrabold text-amber-950 uppercase tracking-wider">
                  Information Notes
                </h4>
                <p class="text-xs font-bold text-amber-900">
                  Requirements to be attached:
                </p>
              </div>
            </div>

            <!-- Bullet List of Required Attachments -->
            <ul class="space-y-2 text-xs text-slate-800 font-medium pl-1.5 pt-1">
              <li
                v-for="(req, idx) in REQUIRED_ATTACHMENTS"
                :key="idx"
                class="flex items-start gap-2.5 leading-relaxed"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-amber-700 mt-2 shrink-0"></span>
                <span>{{ req }}</span>
              </li>
            </ul>
          </div>

        </div>

        <!-- Modal Bottom Footer -->
        <div class="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <p class="text-[11px] text-slate-500 font-medium hidden sm:block">
            Mindanao State University at Naawan &bull; Office of Student Development Accreditation System
          </p>

          <div class="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              @click="isCreateModalOpen = false"
              class="btn-secondary w-full sm:w-auto cursor-pointer"
            >
              Cancel
            </button>
            <button
              @click="handleSaveNewOrg"
              :disabled="isCreatingOrg"
              class="btn-primary w-full sm:w-auto cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus class="w-4 h-4" />
              <span>{{ isCreatingOrg ? 'Creating...' : 'Create Organization' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Organization Profile Modal -->
    <OrganizationProfileModal
      :is-open="!!selectedProfileOrg"
      :organization="selectedProfileOrg"
      :current-user="effectiveUser"
      @close="selectedProfileOrg = null"
      @show-toast="(title, msg, type) => emit('showToast', title, msg, type)"
    />

    <!-- ===================== ORGANIZATION DEACTIVATION CONFIRMATION MODAL ===================== -->
    <div
      v-if="deactivatingOrg"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
      @click.self="cancelDeactivateOrg"
    >
      <div class="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
        
        <!-- Header -->
        <div 
          class="p-5 border-b flex items-center justify-between"
          :class="orgPendingActivities.length > 0 ? 'bg-amber-500 text-white border-amber-600' : 'bg-slate-900 text-white border-slate-800'"
        >
          <div class="flex items-center gap-3">
            <div 
              class="w-10 h-10 rounded-2xl flex items-center justify-center font-bold shadow-xs shrink-0"
              :class="orgPendingActivities.length > 0 ? 'bg-white/20 text-white' : 'bg-rose-600 text-white'"
            >
              <AlertTriangle v-if="orgPendingActivities.length > 0" class="w-5 h-5 text-white" />
              <PowerOff v-else class="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 class="text-sm font-bold leading-tight">
                {{ orgPendingActivities.length > 0 ? 'Active Activities Detected' : 'Confirm Organization Deactivation' }}
              </h3>
              <p class="text-xs opacity-90">
                {{ orgPendingActivities.length > 0 ? 'Review pending council initiatives before deactivating' : 'Administrative confirmation required' }}
              </p>
            </div>
          </div>
          <button 
            @click="cancelDeactivateOrg" 
            class="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-black/20 transition-colors cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="p-6 space-y-4">
          <!-- Target Org Info Box -->
          <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
            <span 
              class="w-11 h-11 rounded-2xl font-black text-sm flex items-center justify-center border shadow-xs shrink-0"
              :class="[
                getOrgTheme(deactivatingOrg.id).badgeBg,
                getOrgTheme(deactivatingOrg.id).badgeText,
                getOrgTheme(deactivatingOrg.id).badgeBorder
              ]"
            >
              {{ deactivatingOrg.acronym }}
            </span>
            <div class="min-w-0 flex-1">
              <h4 class="text-sm font-bold text-slate-900 truncate">{{ deactivatingOrg.name }}</h4>
              <p class="text-xs text-slate-500 truncate">President: {{ deactivatingOrg.president }} &bull; Reg: {{ deactivatingOrg.registeredNumber }}</p>
              <p class="text-[11px] text-slate-600 font-medium truncate">{{ deactivatingOrg.nature }}</p>
            </div>
          </div>

          <!-- Pending Activities Warning Section -->
          <div v-if="orgPendingActivities.length > 0" class="space-y-3">
            <div class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertTriangle class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div class="leading-relaxed">
                <strong class="font-bold">Attention:</strong> This organization currently has
                <span class="font-black text-amber-950">{{ orgPendingActivities.length }} active or pending activity proposal(s)</span>
                that have not yet been approved or fully implemented:
              </div>
            </div>

            <!-- List of Pending/Active Activities -->
            <div class="space-y-2 max-h-52 overflow-y-auto pr-1">
              <div
                v-for="act in orgPendingActivities"
                :key="act.id"
                class="p-3 rounded-xl border border-slate-200 bg-white hover:border-amber-400 transition-colors text-xs"
              >
                <div class="flex items-center justify-between gap-2 mb-1">
                  <span class="font-bold text-slate-900 truncate">{{ act.title }}</span>
                  <span 
                    class="text-[9px] font-extrabold px-2 py-0.5 rounded-full shrink-0"
                    :class="act.status === 'Approved' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'"
                  >
                    {{ act.status }}
                  </span>
                </div>
                <div class="flex items-center justify-between text-[11px] text-slate-500">
                  <span class="flex items-center gap-1">
                    <Calendar class="w-3 h-3 text-slate-400" />
                    <span>{{ act.startDate }}</span>
                  </span>
                  <span class="font-bold text-slate-700">₱{{ (act.budget || 0).toLocaleString() }}</span>
                </div>
              </div>
            </div>

            <p class="text-xs text-rose-700 font-medium leading-relaxed bg-rose-50/70 p-2.5 rounded-xl border border-rose-200">
              ⚠️ Deactivating will freeze this organization's accredited status, block new proposal formulation, and pause workflow routing.
            </p>
          </div>

          <div v-else class="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-center text-xs text-slate-600">
            <CheckCircle2 class="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
            <p class="font-semibold text-slate-800">No active pending activities found.</p>
            <p class="text-[11px] text-slate-500 mt-0.5">This organization has cleared all prior proposals and has no unresolved activities.</p>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
          <button
            type="button"
            @click="cancelDeactivateOrg"
            class="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="confirmDeactivateOrg"
            class="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
          >
            <PowerOff class="w-3.5 h-3.5" />
            <span>Confirm Deactivation</span>
          </button>
        </div>

      </div>
    </div>
  </div>
</template>
