<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { OrgId, StudentOrganization, OrganizationMember, OrganizationAttachment, Activity } from '../types';
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
  UserPlus
} from 'lucide-vue-next';
import { ORGANIZATIONS, ORG_COLORS, getOrgTheme } from '../data/initialData';
import OrgBadge from './OrgBadge.vue';
import OrganizationProfileModal from './OrganizationProfileModal.vue';
import { saveOrganizationToDb, subscribeToOrganizations } from '../services/db';
import type { Unsubscribe } from 'firebase/firestore';

const props = withDefaults(
  defineProps<{
    showManageButton?: boolean;
    activities?: Activity[];
  }>(),
  {
    showManageButton: false,
    activities: () => []
  }
);

const emit = defineEmits<{
  (e: 'selectOrg', orgId: OrgId): void;
  (e: 'showToast', title: string, message?: string, type?: 'success' | 'info' | 'warning'): void;
}>();

const searchQuery = ref('');
const managingOrg = ref<StudentOrganization | null>(null);
const selectedProfileOrg = ref<StudentOrganization | null>(null);

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

// Reactive list of organizations with local storage persistence
const organizationsList = ref<StudentOrganization[]>([]);

const loadOrganizations = () => {
  try {
    const saved = localStorage.getItem('msun_student_organizations');
    if (saved) {
      organizationsList.value = JSON.parse(saved);
      ORGANIZATIONS.length = 0;
      ORGANIZATIONS.push(...organizationsList.value);
      return;
    }
  } catch (e) {
    // ignore
  }
  organizationsList.value = JSON.parse(JSON.stringify(ORGANIZATIONS));
};

loadOrganizations();

let orgsUnsubscribe: Unsubscribe | null = null;
onMounted(() => {
  try {
    orgsUnsubscribe = subscribeToOrganizations((data) => {
      if (data && data.length > 0) {
        organizationsList.value = data;
        syncMemoryOrganizations();
        persistOrganizations();
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
    localStorage.setItem('msun_student_organizations', JSON.stringify(organizationsList.value));
  } catch (e) {
    // ignore
  }
};

const syncMemoryOrganizations = () => {
  ORGANIZATIONS.length = 0;
  ORGANIZATIONS.push(...organizationsList.value);
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
  syncMemoryOrganizations();

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
const newObjectiveText = ref('');
const fileInputRef = ref<HTMLInputElement | null>(null);

const triggerFileInput = () => {
  fileInputRef.value?.click();
};

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (!files || files.length === 0 || !managingOrg.value) return;

  if (!managingOrg.value.attachments) {
    managingOrg.value.attachments = [];
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = file.name.split('.').pop()?.toUpperCase() || 'PDF';
    const type: 'PDF' | 'XLSX' | 'DOCX' | 'PNG' = 
      ext === 'XLSX' || ext === 'XLS' ? 'XLSX' :
      ext === 'DOCX' || ext === 'DOC' ? 'DOCX' :
      ext === 'PNG' || ext === 'JPG' || ext === 'JPEG' ? 'PNG' : 'PDF';
    
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    const fileSize = `${parseFloat(sizeInMb) < 0.1 ? '0.2' : sizeInMb} MB`;

    managingOrg.value.attachments.push({
      id: 'att-' + Date.now() + '-' + i,
      title: file.name,
      type,
      fileSize,
      uploadDate: new Date().toISOString().split('T')[0]
    });
  }

  emit('showToast', 'Files Attached', `Added ${files.length} document${files.length > 1 ? 's' : ''} to repository.`, 'success');
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
  return organizationsList.value.filter((org) => {
    return (
      org.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      org.acronym.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      org.president.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      org.facultyAdviser.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      org.registeredNumber.toLowerCase().includes(searchQuery.value.toLowerCase())
    );
  });
});

const openManageModal = (org: StudentOrganization) => {
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
  if (!clone.membersList || clone.membersList.length === 0) {
    clone.membersList = [
      {
        id: 'mem-' + Date.now() + '-1',
        fullName: clone.president || 'Student Council President',
        contactNumber: '+63 917 842 1092',
        email: `${(clone.president || 'president').toLowerCase().replace(/[^a-z]/g, '.')}@msun.edu.ph`,
        role: 'President'
      },
      {
        id: 'mem-' + Date.now() + '-2',
        fullName: 'Vice President Internal',
        contactNumber: '+63 918 331 4902',
        email: 'vp.internal@msun.edu.ph',
        role: 'Vice President'
      },
      {
        id: 'mem-' + Date.now() + '-3',
        fullName: 'Secretary General',
        contactNumber: '+63 919 224 8190',
        email: 'secretary@msun.edu.ph',
        role: 'Secretary'
      },
      {
        id: 'mem-' + Date.now() + '-4',
        fullName: 'Treasurer',
        contactNumber: '+63 927 619 4430',
        email: 'treasurer@msun.edu.ph',
        role: 'Treasurer'
      }
    ];
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
    fullName: '',
    contactNumber: '',
    email: ''
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
  emit('showToast', 'Attachment Removed', `Removed ${removed[0]?.title || 'attachment'}.`, 'info');
};

const handleSaveOrg = () => {
  if (!managingOrg.value) return;
  const target = organizationsList.value.find(o => o.id === managingOrg.value?.id);
  if (target) {
    target.name = managingOrg.value.name;
    target.registeredNumber = managingOrg.value.registeredNumber;
    target.dateOfApplication = managingOrg.value.dateOfApplication;
    target.nature = managingOrg.value.nature;
    target.objectives = managingOrg.value.objectives?.filter(o => o.trim().length > 0);
    target.membersList = managingOrg.value.membersList;
    target.attachments = managingOrg.value.attachments;
    target.memberCount = managingOrg.value.membersList?.length || target.memberCount;
    target.attachmentCount = managingOrg.value.attachments?.length || target.attachmentCount;
    target.status = managingOrg.value.status;
    
    // Update president name from members list if President role exists
    const presMember = managingOrg.value.membersList?.find(m => m.role.toLowerCase().includes('president'));
    if (presMember && presMember.fullName.trim()) {
      target.president = presMember.fullName.trim();
    }
  }
  persistOrganizations();
  syncMemoryOrganizations();
  if (target) {
    saveOrganizationToDb(target).catch(err => console.warn('Firestore org save error:', err));
  }
  emit('showToast', 'Organization Profile Updated', `${managingOrg.value.name} (${managingOrg.value.acronym}) compliance information saved.`, 'success');
  managingOrg.value = null;
};

// ==========================================
// CREATE ORGANIZATION STATE & HANDLERS
// ==========================================
const isCreateModalOpen = ref(false);
const createFileInputRef = ref<HTMLInputElement | null>(null);

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

const handleCreateFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (!files || files.length === 0) return;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = file.name.split('.').pop()?.toUpperCase() || 'PDF';
    const type: 'PDF' | 'XLSX' | 'DOCX' | 'PNG' = 
      ext === 'XLSX' || ext === 'XLS' ? 'XLSX' :
      ext === 'DOCX' || ext === 'DOC' ? 'DOCX' :
      ext === 'PNG' || ext === 'JPG' || ext === 'JPEG' ? 'PNG' : 'PDF';
    
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    const fileSize = `${parseFloat(sizeInMb) < 0.1 ? '0.2' : sizeInMb} MB`;

    createOrgForm.value.attachments.push({
      id: 'att-c-' + Date.now() + '-' + i,
      title: file.name,
      type,
      fileSize,
      uploadDate: new Date().toISOString().split('T')[0]
    });
  }

  emit('showToast', 'Files Attached', `Added ${files.length} document${files.length > 1 ? 's' : ''} to repository.`, 'success');
  target.value = '';
};

const removeCreateAttachment = (index: number) => {
  const removed = createOrgForm.value.attachments.splice(index, 1);
  emit('showToast', 'Attachment Removed', `Removed ${removed[0]?.title || 'attachment'}.`, 'info');
};

const handleSaveNewOrg = () => {
  if (!createOrgForm.value.name.trim()) {
    emit('showToast', 'Validation Error', 'Please enter the Organization Name.', 'warning');
    return;
  }
  if (!createOrgForm.value.registeredNumber.trim()) {
    emit('showToast', 'Validation Error', 'Please provide a Registration Number.', 'warning');
    return;
  }
  if (!createOrgForm.value.dateOfApplication) {
    emit('showToast', 'Validation Error', 'Please select Date of Application.', 'warning');
    return;
  }

  const rawName = createOrgForm.value.name.trim();
  let acronym = createOrgForm.value.acronym.trim();
  if (!acronym) {
    const words = rawName.split(/\s+/).filter(w => !['of', 'and', 'the', 'in', 'at', '&'].includes(w.toLowerCase()));
    acronym = words.length > 1 ? words.map(w => w[0].toUpperCase()).join('') : rawName.substring(0, 5).toUpperCase();
  }

  const validMembers = createOrgForm.value.membersList.filter(m => m.fullName.trim().length > 0);
  const presMember = validMembers.find(m => m.role.toLowerCase().includes('president')) || validMembers[0];
  const presidentName = presMember ? presMember.fullName.trim() : 'Appointed President';

  const newId = acronym.replace(/[^A-Za-z0-9]/g, '') || `ORG${Date.now()}`;

  const newOrg: StudentOrganization = {
    id: newId,
    name: rawName,
    acronym,
    nature: createOrgForm.value.nature.trim() || 'Academic Student Organization',
    status: 'Active',
    registeredNumber: createOrgForm.value.registeredNumber.trim(),
    dateOfApplication: createOrgForm.value.dateOfApplication,
    memberCount: validMembers.length > 0 ? validMembers.length : 1,
    attachmentCount: createOrgForm.value.attachments.length,
    color: 'blue',
    description: `Recognized student body under the MSUN Office of Student Affairs, committed to ${createOrgForm.value.nature.toLowerCase()}.`,
    president: presidentName,
    facultyAdviser: 'Designated Faculty Adviser',
    officeLocation: 'Student Activity Center, Room 204',
    objectives: createOrgForm.value.objectives.filter(o => o.trim().length > 0),
    membersList: validMembers.length > 0 ? validMembers : [
      {
        id: 'mem-' + Date.now(),
        fullName: presidentName,
        contactNumber: '+63 917 000 0000',
        email: `${presidentName.toLowerCase().replace(/[^a-z]/g, '.')}@msun.edu.ph`,
        role: 'President'
      }
    ],
    attachments: createOrgForm.value.attachments
  };

  organizationsList.value.unshift(newOrg);
  persistOrganizations();
  syncMemoryOrganizations();

  saveOrganizationToDb(newOrg).catch(err => console.warn('Firestore create org error:', err));

  emit('showToast', 'Organization Created', `"${newOrg.name}" (${newOrg.acronym}) registered successfully.`, 'success');
  isCreateModalOpen.value = false;
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
            <span class="text-xs text-slate-500">Mindanao State University at Naawan</span>
          </div>
          <h2 class="text-2xl font-extrabold text-slate-900 tracking-tight">
            Accredited Student Organizations
          </h2>
          <p class="text-sm text-slate-600 mt-1 max-w-2xl">
            Directory of recognized student bodies with approved executive committees, faculty advisers, and Action Plan quotas.
          </p>
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
          placeholder="Search student councils by name, acronym, president, or adviser..."
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
                  org.acronym.length > 4 ? 'text-[11px] tracking-tight px-1' : 'text-xs tracking-wider'
                ]"
              >
                {{ org.acronym }}
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
                {{ org.nature }}
              </p>
            </div>
          </div>

          <!-- Standalone Registered Number Container -->
          <div class="p-3 bg-slate-100/80 rounded-xl border border-slate-200/90 flex items-center justify-between my-2.5">
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Registered No.</span>
            <span class="font-extrabold text-xs sm:text-sm text-slate-900">{{ org.registeredNumber }}</span>
          </div>

          <!-- Members Count & Attachment Count Grid -->
          <div class="grid grid-cols-2 gap-3 p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200/90 my-2.5">
            <div>
              <span class="text-xs font-bold text-slate-500 block uppercase tracking-wider">Members Count</span>
              <span class="font-black text-sm sm:text-base text-blue-800 block mt-1">{{ org.memberCount.toLocaleString() }}</span>
            </div>

            <div>
              <span class="text-xs font-bold text-slate-500 block uppercase tracking-wider">Attachments</span>
              <span class="font-extrabold text-xs sm:text-sm text-emerald-700 block mt-1">{{ org.attachmentCount || org.attachments?.length || 0 }} Files</span>
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
                  class="w-full px-3.5 py-2 text-xs sm:text-sm font-semibold border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white shadow-2xs"
                />
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
                  class="w-full px-3.5 py-2 text-xs sm:text-sm font-bold text-blue-950 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white shadow-2xs"
                />
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
                    class="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm font-medium border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white shadow-2xs"
                  />
                </div>
              </div>

              <!-- Nature of Organization -->
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nature of Organization <span class="text-rose-500">*</span>
                </label>
                <input
                  v-model="managingOrg.nature"
                  type="text"
                  placeholder="e.g., Apex Student Government & Institutional Representation"
                  class="w-full px-3.5 py-2 text-xs sm:text-sm font-medium border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white shadow-2xs"
                />
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
                    Members (Full Name, Contact Numbers, Email Address)
                  </h4>
                  <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-900 border border-blue-200">
                    {{ managingOrg.membersList?.length || 0 }} Members
                  </span>
                </div>
                <p class="text-xs text-slate-500 mt-0.5">
                  Full Name, Contact Numbers, and Email Address of active officers and registered members.
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
                      <th class="py-2.5 px-3 min-w-[200px]">Full Name <span class="text-rose-500">*</span></th>
                      <th class="py-2.5 px-3 min-w-[170px]">Contact Numbers <span class="text-rose-500">*</span></th>
                      <th class="py-2.5 px-3 min-w-[220px]">Email Address <span class="text-rose-500">*</span></th>
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
                      <td class="py-2 px-3">
                        <input
                          v-model="member.fullName"
                          type="text"
                          placeholder="e.g., Juan Dela Cruz"
                          class="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
                        />
                      </td>
                      <td class="py-2 px-3">
                        <input
                          v-model="member.contactNumber"
                          type="text"
                          placeholder="e.g., +63 917 123 4567"
                          class="w-full px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
                        />
                      </td>
                      <td class="py-2 px-3">
                        <input
                          v-model="member.email"
                          type="email"
                          placeholder="e.g., juan.cruz@msun.edu.ph"
                          class="w-full px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
                        />
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
                      <td colspan="5" class="py-6 text-center text-slate-400 text-xs">
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
                class="btn-primary btn-sm cursor-pointer self-start sm:self-auto"
              >
                <Plus class="w-3.5 h-3.5" />
                <span>Add Attachment</span>
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
                  <div class="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Paperclip class="w-4 h-4" />
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

                <button
                  type="button"
                  @click="removeAttachment(idx)"
                  class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                  title="Remove Attachment"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
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
            Mindanao State University at Naawan &bull; Office of Student Affairs Accreditation System
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

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Organization Name -->
              <div class="md:col-span-2">
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Organization Name <span class="text-rose-500">*</span>
                </label>
                <input
                  v-model="createOrgForm.name"
                  type="text"
                  placeholder="e.g., Association of Computing Machinery (ACM)"
                  class="w-full px-3.5 py-2.5 text-xs font-bold border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <!-- Registration Number -->
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Registration Number <span class="text-rose-500">*</span>
                </label>
                <input
                  v-model="createOrgForm.registeredNumber"
                  type="text"
                  placeholder="e.g., MSUN-SO-2026-009"
                  class="w-full px-3.5 py-2.5 text-xs font-bold border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <!-- Date of Application -->
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Date of Application <span class="text-rose-500">*</span>
                </label>
                <input
                  v-model="createOrgForm.dateOfApplication"
                  type="date"
                  class="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <!-- Nature of Organization -->
              <div class="md:col-span-2">
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nature of Organization <span class="text-rose-500">*</span>
                </label>
                <select
                  v-model="createOrgForm.nature"
                  class="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-900 font-medium"
                >
                  <option v-for="opt in NATURE_OPTIONS" :key="opt" :value="opt">
                    {{ opt }}
                  </option>
                </select>
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
                  3. Members (Full Name, Contact Numbers, Email Address)
                </h4>
                <p class="text-xs text-slate-500 mt-0.5">
                  Provide member rosters including Full Name, Contact Numbers, and Official Email Address.
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
                      <th class="py-2.5 px-3 min-w-[200px]">Full Name *</th>
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
                      <td class="py-2 px-3">
                        <input
                          v-model="member.fullName"
                          type="text"
                          placeholder="e.g. Maria Clarisse Santos"
                          class="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-900 font-medium"
                        />
                      </td>
                      <td class="py-2 px-3">
                        <input
                          v-model="member.contactNumber"
                          type="text"
                          placeholder="e.g. +63 917 123 4567"
                          class="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-900"
                        />
                      </td>
                      <td class="py-2 px-3">
                        <input
                          v-model="member.email"
                          type="email"
                          placeholder="e.g. maria.santos@msun.edu.ph"
                          class="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-900"
                        />
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
                      <td colspan="5" class="py-6 text-center text-slate-400 text-xs">
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
                class="btn-primary btn-sm cursor-pointer self-start sm:self-auto"
              >
                <Plus class="w-3.5 h-3.5" />
                <span>Add Attachment</span>
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
                  <div class="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Paperclip class="w-4 h-4" />
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

                <button
                  type="button"
                  @click="removeCreateAttachment(idx)"
                  class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                  title="Remove Attachment"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
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
            Mindanao State University at Naawan &bull; Office of Student Affairs Accreditation System
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
              class="btn-primary w-full sm:w-auto cursor-pointer"
            >
              <Plus class="w-4 h-4" />
              <span>Create Organization</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Organization Profile Modal -->
    <OrganizationProfileModal
      :is-open="!!selectedProfileOrg"
      :organization="selectedProfileOrg"
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
