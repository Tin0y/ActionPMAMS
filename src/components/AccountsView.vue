<script setup lang="ts">
import { ref, computed } from 'vue';
import { UserAccount, UserRole, OrgId, Activity, formatUserRole } from '../types';
import {
  Users,
  UserPlus,
  Search,
  Eye,
  EyeOff,
  Edit3,
  Power,
  PowerOff,
  X,
  Save,
  Building2,
  Mail,
  Lock,
  ShieldCheck,
  User,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Clock,
  ChevronDown,
  Layers,
  FileText
} from 'lucide-vue-next';
import { ORGANIZATIONS } from '../data/initialData';

const props = withDefaults(
  defineProps<{
    accounts: UserAccount[];
    activities?: Activity[];
  }>(),
  {
    activities: () => []
  }
);

const emit = defineEmits<{
  (e: 'createAccount', account: Omit<UserAccount, 'id' | 'createdDate'>): void;
  (e: 'updateAccount', account: UserAccount): void;
  (e: 'toggleAccountStatus', accountId: string): void;
  (e: 'ensureOsdAccount'): void;
  (e: 'switchUser', account: UserAccount): void;
  (e: 'showToast', title: string, message?: string, type?: 'success' | 'info' | 'warning'): void;
}>();

import {
  SubOrgOption,
  OrgOptionConfig,
  ORGANIZATION_OPTIONS,
  resolveAccountSystemDetails,
  detectAccountParentOrgAndRole,
  getUserActualOrg,
  getUserParentOrg,
  isUserInSubOrg,
  getAccountDisplayRole
} from '../utils/organizationUtils';

const universityOffices = computed(() => ORGANIZATION_OPTIONS.filter(o => o.category === 'office'));
const studentOrganizations = computed(() => ORGANIZATION_OPTIONS.filter(o => o.category === 'student_org'));

const searchQuery = ref('');
const selectedRoleFilter = ref<'ALL' | 'OSD' | 'DEAN' | 'ADVISER' | 'ORG' | 'ADMIN'>('ALL');

// Modals
const isCreateModalOpen = ref(false);
const editingAccount = ref<UserAccount | null>(null);
const viewingAccount = ref<UserAccount | null>(null);

// Password visibility toggles
const showCreatePassword = ref(false);
const showCreateConfirmPassword = ref(false);
const showViewPassword = ref(false);

// Form for create
const createForm = ref<{
  firstName: string;
  lastName: string;
  email: string;
  organization: string;
  subOrg: string;
  selectedRole: string;
  customRole: string;
  isActive: boolean;
  password: string;
  confirmPassword: string;
  agreedToTerms: boolean;
}>({
  firstName: '',
  lastName: '',
  email: '',
  organization: '',
  subOrg: '',
  selectedRole: '',
  customRole: '',
  isActive: true,
  password: '',
  confirmPassword: '',
  agreedToTerms: false
});

const createErrors = ref<Record<string, string>>({});

const createSelectedOrgConfig = computed(() => ORGANIZATION_OPTIONS.find(o => o.value === createForm.value.organization));
const createAvailableSubOrgs = computed(() => createSelectedOrgConfig.value?.subOrgs || []);
const createHasSubOrgs = computed(() => createAvailableSubOrgs.value.length > 0);
const createAvailableRoles = computed(() => createSelectedOrgConfig.value?.roles || []);
const createIsRoleDisabled = computed(() => !createForm.value.organization);
const createIsOthersRole = computed(() => createForm.value.selectedRole === 'Others');

const handleCreateOrgChange = () => {
  createForm.value.subOrg = '';
  createForm.value.selectedRole = '';
  createForm.value.customRole = '';
  delete createErrors.value.organization;
  delete createErrors.value.subOrg;
  delete createErrors.value.selectedRole;
  delete createErrors.value.customRole;
};

const handleCreateRoleChange = () => {
  if (createForm.value.selectedRole !== 'Others') {
    createForm.value.customRole = '';
  }
  delete createErrors.value.selectedRole;
  delete createErrors.value.customRole;
};

const handleOpenCreate = () => {
  createForm.value = {
    firstName: '',
    lastName: '',
    email: '',
    organization: '',
    subOrg: '',
    selectedRole: '',
    customRole: '',
    isActive: true,
    password: '',
    confirmPassword: '',
    agreedToTerms: false
  };
  createErrors.value = {};
  showCreatePassword.value = false;
  showCreateConfirmPassword.value = false;
  isCreateModalOpen.value = true;
};

const handleSaveCreate = () => {
  const errs: Record<string, string> = {};
  if (!createForm.value.firstName.trim()) errs.firstName = 'First Name is required.';
  if (!createForm.value.lastName.trim()) errs.lastName = 'Last Name is required.';
  if (!createForm.value.email.trim()) {
    errs.email = 'Email Address is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.value.email.trim())) {
    errs.email = 'Please provide a valid email address.';
  }
  if (!createForm.value.organization) {
    errs.organization = 'Please select an Organization / Office.';
  }
  if (createHasSubOrgs.value && !createForm.value.subOrg) {
    errs.subOrg = 'Please select a Sub-Organization.';
  }
  if (!createForm.value.selectedRole) {
    errs.selectedRole = 'Please select a Role.';
  }
  if (createIsOthersRole.value && !createForm.value.customRole.trim()) {
    errs.customRole = 'Please specify the custom role.';
  }
  if (!createForm.value.password.trim()) {
    errs.password = 'Password is required.';
  }
  if (createForm.value.password !== createForm.value.confirmPassword) {
    errs.confirmPassword = 'Passwords do not match.';
  }
  if (!createForm.value.agreedToTerms) {
    errs.terms = 'You must agree to the Terms of Service.';
  }

  createErrors.value = errs;
  if (Object.keys(errs).length > 0) {
    emit('showToast', 'Validation Error', 'Please complete all required fields.', 'warning');
    return;
  }

  const details = resolveAccountSystemDetails(
    createForm.value.organization,
    createForm.value.selectedRole,
    createForm.value.customRole
  );

  const selectedParentOrg = createForm.value.organization;
  const rawSubOrg = createHasSubOrgs.value ? createForm.value.subOrg : undefined;
  const isDirectParent = !rawSubOrg || rawSubOrg === selectedParentOrg;
  const actualOrg = isDirectParent ? selectedParentOrg : rawSubOrg;
  const subOrg = isDirectParent ? undefined : rawSubOrg;

  const fullName = `${createForm.value.firstName.trim()} ${createForm.value.lastName.trim()}`;
  emit('createAccount', {
    firstName: createForm.value.firstName.trim(),
    lastName: createForm.value.lastName.trim(),
    name: fullName,
    email: createForm.value.email.trim(),
    parentOrg: selectedParentOrg,
    actualOrg,
    subOrg,
    selectedRole: createForm.value.selectedRole,
    customRole: createIsOthersRole.value ? createForm.value.customRole.trim() : undefined,
    displayRole: details.displayRole,
    role: details.systemRole,
    orgId: details.orgId,
    orgName: details.orgName,
    collegeId: details.collegeId,
    organizationType: details.organizationType,
    isActive: createForm.value.isActive,
    password: createForm.value.password,
    avatar: (createForm.value.firstName.trim()[0] + createForm.value.lastName.trim()[0]).toUpperCase()
  });

  isCreateModalOpen.value = false;
};

// Form for edit
const editForm = ref<{
  firstName: string;
  lastName: string;
  email: string;
  organization: string;
  subOrg: string;
  selectedRole: string;
  customRole: string;
  isActive: boolean;
}>({
  firstName: '',
  lastName: '',
  email: '',
  organization: '',
  subOrg: '',
  selectedRole: '',
  customRole: '',
  isActive: true
});

const editErrors = ref<Record<string, string>>({});

const editSelectedOrgConfig = computed(() => ORGANIZATION_OPTIONS.find(o => o.value === editForm.value.organization));
const editAvailableSubOrgs = computed(() => editSelectedOrgConfig.value?.subOrgs || []);
const editHasSubOrgs = computed(() => editAvailableSubOrgs.value.length > 0);
const editAvailableRoles = computed(() => editSelectedOrgConfig.value?.roles || []);
const editIsRoleDisabled = computed(() => !editForm.value.organization);
const editIsOthersRole = computed(() => editForm.value.selectedRole === 'Others');

const handleEditOrgChange = () => {
  editForm.value.subOrg = '';
  editForm.value.selectedRole = '';
  editForm.value.customRole = '';
  delete editErrors.value.organization;
  delete editErrors.value.subOrg;
  delete editErrors.value.selectedRole;
  delete editErrors.value.customRole;
};

const handleEditRoleChange = () => {
  if (editForm.value.selectedRole !== 'Others') {
    editForm.value.customRole = '';
  }
  delete editErrors.value.selectedRole;
  delete editErrors.value.customRole;
};

const handleOpenEdit = (acc: UserAccount) => {
  editingAccount.value = JSON.parse(JSON.stringify(acc));
  const detected = detectAccountParentOrgAndRole(acc);
  editForm.value = {
    firstName: acc.firstName || (acc.name ? acc.name.split(' ')[0] : ''),
    lastName: acc.lastName || (acc.name ? acc.name.split(' ').slice(1).join(' ') : ''),
    email: acc.email,
    organization: detected.parentOrg,
    subOrg: detected.subOrg,
    selectedRole: detected.selectedRole,
    customRole: detected.customRole,
    isActive: acc.isActive
  };
  editErrors.value = {};
};

const handleSaveEdit = () => {
  if (!editingAccount.value) return;

  const errs: Record<string, string> = {};
  if (!editForm.value.firstName.trim()) errs.firstName = 'First Name is required.';
  if (!editForm.value.lastName.trim()) errs.lastName = 'Last Name is required.';
  if (!editForm.value.email.trim()) {
    errs.email = 'Email Address is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.value.email.trim())) {
    errs.email = 'Please provide a valid email address.';
  }
  if (!editForm.value.organization) {
    errs.organization = 'Please select an Organization / Office.';
  }
  if (editHasSubOrgs.value && !editForm.value.subOrg) {
    errs.subOrg = 'Please select a Sub-Organization.';
  }
  if (!editForm.value.selectedRole) {
    errs.selectedRole = 'Please select a Role.';
  }
  if (editIsOthersRole.value && !editForm.value.customRole.trim()) {
    errs.customRole = 'Please specify the custom role.';
  }

  editErrors.value = errs;
  if (Object.keys(errs).length > 0) {
    emit('showToast', 'Validation Error', 'Please complete all required fields.', 'warning');
    return;
  }

  const details = resolveAccountSystemDetails(
    editForm.value.organization,
    editForm.value.selectedRole,
    editForm.value.customRole
  );

  const selectedParentOrg = editForm.value.organization;
  const rawSubOrg = editHasSubOrgs.value ? editForm.value.subOrg : undefined;
  const isDirectParent = !rawSubOrg || rawSubOrg === selectedParentOrg;
  const actualOrg = isDirectParent ? selectedParentOrg : rawSubOrg;
  const subOrg = isDirectParent ? undefined : rawSubOrg;

  const fullName = `${editForm.value.firstName.trim()} ${editForm.value.lastName.trim()}`;
  const updated: UserAccount = {
    ...editingAccount.value,
    firstName: editForm.value.firstName.trim(),
    lastName: editForm.value.lastName.trim(),
    name: fullName,
    email: editForm.value.email.trim(),
    parentOrg: selectedParentOrg,
    actualOrg,
    subOrg,
    selectedRole: editForm.value.selectedRole,
    customRole: editIsOthersRole.value ? editForm.value.customRole.trim() : undefined,
    displayRole: details.displayRole,
    role: details.systemRole,
    orgId: details.orgId,
    orgName: details.orgName,
    collegeId: details.collegeId,
    organizationType: details.organizationType,
    isActive: editForm.value.isActive,
    avatar: (editForm.value.firstName.trim()[0] + editForm.value.lastName.trim()[0]).toUpperCase()
  };

  emit('updateAccount', updated);
  editingAccount.value = null;
};

const filteredAccounts = computed(() => {
  return props.accounts.filter((acc) => {
    const fullName = acc.name || `${acc.firstName || ''} ${acc.lastName || ''}`.trim();
    const q = searchQuery.value.toLowerCase().trim();
    const actualOrg = getUserActualOrg(acc);
    const parentOrg = getUserParentOrg(acc);
    const matchesSearch = !q ||
      fullName.toLowerCase().includes(q) ||
      acc.email.toLowerCase().includes(q) ||
      (acc.orgName && acc.orgName.toLowerCase().includes(q)) ||
      actualOrg.toLowerCase().includes(q) ||
      parentOrg.toLowerCase().includes(q) ||
      (acc.subOrg && acc.subOrg.toLowerCase().includes(q)) ||
      (acc.displayRole && acc.displayRole.toLowerCase().includes(q)) ||
      (acc.customRole && acc.customRole.toLowerCase().includes(q)) ||
      acc.role.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (selectedRoleFilter.value === 'OSD') {
      return acc.role === 'ROLE_OSD' || acc.role === 'OSD Officer' || acc.role === 'OSD Director' || acc.orgId === 'OSD' || parentOrg === 'OSD';
    }
    if (selectedRoleFilter.value === 'DEAN') {
      return acc.role === 'ROLE_DEAN' || acc.role === 'Dean / College Reviewer' || parentOrg === 'College Dean';
    }
    if (selectedRoleFilter.value === 'ADVISER') {
      return acc.role === 'ROLE_ADVISER' || acc.role === 'Faculty Adviser' || acc.selectedRole === 'Adviser' || (acc.displayRole && acc.displayRole.includes('Adviser'));
    }
    if (selectedRoleFilter.value === 'ORG') {
      const isAdv = acc.role === 'ROLE_ADVISER' || acc.role === 'Faculty Adviser' || acc.selectedRole === 'Adviser' || (acc.displayRole && acc.displayRole.includes('Adviser'));
      if (isAdv) return false;
      return acc.role === 'ROLE_ORGANIZATION' || acc.role === 'Org President' || acc.role === 'Org Treasurer' ||
        ['SSC', 'CBIT SEC', 'ELSSA', 'CESS SO', 'FIMSSO', 'KAABAG', 'SenSSo'].includes(parentOrg) ||
        ['SSC', 'CBIT SEC', 'ELSSA', 'CESS SO', 'FIMSSO', 'KAABAG', 'SenSSo'].includes(acc.orgId || '');
    }
    if (selectedRoleFilter.value === 'ADMIN') {
      return acc.role === 'ROLE_ADMIN' || acc.role === 'System Administrator';
    }

    return true;
  });
});

const getInitials = (account: UserAccount) => {
  if (account.firstName && account.lastName) {
    return (account.firstName[0] + account.lastName[0]).toUpperCase();
  }
  const name = account.name || '';
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
};

const getDisplayName = (account: UserAccount) => {
  if (account.firstName || account.lastName) {
    return `${account.firstName || ''} ${account.lastName || ''}`.trim();
  }
  return account.name || '';
};

const getOrgNameById = (id?: string) => {
  if (!id) return 'Unassigned';
  const found = ORGANIZATION_OPTIONS.find(o => o.value === id || o.orgId === id);
  if (found) return found.orgName;
  if (id === 'OSD') return 'Office of Student Development (OSD)';
  if (id === 'OVCSAS') return 'Office of the Vice Chancellor for Student Affairs and Services';
  if (id === 'OC') return 'Office of the Chancellor';
  if (id === 'OSA') return 'Office of Student Affairs';
  if (id === 'ADMIN') return 'Not Affiliated';
  if (id === 'COLLEGE') return 'College / Academic Reviewer';
  const org = ORGANIZATIONS.find((o) => o.id === id);
  return org ? org.name : id;
};

// Deactivation confirmation modal state
const deactivatingAccount = ref<UserAccount | null>(null);
const accountPendingActivities = ref<Activity[]>([]);

const getActivePendingActivitiesForAccount = (acc: UserAccount): Activity[] => {
  if (!props.activities || props.activities.length === 0) return [];
  const userFullName = (acc.name || `${acc.firstName || ''} ${acc.lastName || ''}`).trim().toLowerCase();
  const userOrg = acc.orgId;

  return props.activities.filter((act) => {
    // Is activity associated with this user's organization or user specifically?
    const isUserOrg = userOrg && !['ADMIN', 'OSD', 'OVCSAS', 'OC', 'OSA', 'COLLEGE'].includes(userOrg) && act.orgId === userOrg;
    const isAuthor = 
      (act.proposedBy && act.proposedBy.toLowerCase().includes(userFullName)) ||
      (act.personAssigned && act.personAssigned.toLowerCase().includes(userFullName));

    if (!isUserOrg && !isAuthor) return false;

    // Active pending if not completed
    const isCompleted = act.status === 'COMPLETED' || act.accomplishmentForm?.isCompleted === true;
    return !isCompleted;
  });
};

const handleToggle = (acc: UserAccount) => {
  if (acc.isActive) {
    // Prompt first before deactivating!
    deactivatingAccount.value = acc;
    accountPendingActivities.value = getActivePendingActivitiesForAccount(acc);
  } else {
    // Reactivating account
    emit('toggleAccountStatus', acc.id);
    emit('showToast', 'Account Activated', `${getDisplayName(acc)} has been restored to active status.`, 'success');
  }
};

const confirmDeactivateAccount = () => {
  if (deactivatingAccount.value) {
    const acc = deactivatingAccount.value;
    emit('toggleAccountStatus', acc.id);
    emit('showToast', 'Account Deactivated', `${getDisplayName(acc)} has been deactivated.`, 'warning');
    if (viewingAccount.value && viewingAccount.value.id === acc.id) {
      viewingAccount.value.isActive = false;
    }
    deactivatingAccount.value = null;
    accountPendingActivities.value = [];
  }
};

const cancelDeactivateAccount = () => {
  deactivatingAccount.value = null;
  accountPendingActivities.value = [];
};
</script>


<template>
  <div class="space-y-6">
    <!-- Header Banner -->
    <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
              Identity &amp; Access Management
            </span>
            <span class="text-xs text-slate-500">Mindanao State University at Naawan</span>
          </div>
          <h2 class="text-2xl font-extrabold text-slate-900 tracking-tight">User Accounts</h2>
          <p class="text-sm text-slate-600 mt-1">Manage user accounts, roles, and permissions across the system.</p>
        </div>
        <div class="flex items-center gap-3">
          <button
            id="btn-create-account"
            @click="handleOpenCreate"
            class="btn-primary"
          >
            <UserPlus class="w-4 h-4" />
            <span>Create Account</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Search -->
    <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4">
      <div class="relative w-full">
        <Search class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by user name, institutional email, organization, or role..."
          class="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
        />
      </div>
    </div>

    <!-- User Account Cards -->
    <div class="space-y-3">
      <div
        v-if="filteredAccounts.length === 0"
        class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-12 text-center"
      >
        <Users class="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <h3 class="text-sm font-bold text-slate-800">No User Accounts Found</h3>
        <p class="text-xs text-slate-500 mt-1">Try adjusting your search terms.</p>
      </div>

      <div
        v-for="user in filteredAccounts"
        :key="user.id"
        class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div class="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
          <div class="relative shrink-0">
            <div
              class="w-12 h-12 rounded-2xl font-black text-sm flex items-center justify-center text-white shadow-xs"
              :class="user.isActive ? 'bg-blue-600' : 'bg-slate-400'"
            >
              {{ getInitials(user) }}
            </div>
            <span
              class="w-3.5 h-3.5 rounded-full border-2 border-white absolute -bottom-0.5 -right-0.5"
              :class="user.isActive ? 'bg-emerald-500' : 'bg-slate-400'"
            ></span>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="text-sm font-bold text-slate-900 truncate">{{ getDisplayName(user) }}</h3>
              <span
                class="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                :class="user.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'"
              >{{ user.isActive ? 'Active' : 'Deactivated' }}</span>
              <span class="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md">{{ getAccountDisplayRole(user) }}</span>
            </div>
            <p class="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
              <Mail class="w-3.5 h-3.5 text-slate-400 shrink-0" /><span class="truncate">{{ user.email }}</span>
            </p>
            <p class="text-[11px] text-slate-600 flex items-center gap-1.5 mt-0.5 flex-wrap">
              <Building2 class="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span class="text-slate-500 font-normal">Organization:</span>
              <span class="font-semibold text-slate-800">{{ getUserActualOrg(user) }}</span>
              <span v-if="isUserInSubOrg(user)" class="text-[10px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                Under: <strong class="text-slate-800">{{ getUserParentOrg(user) }}</strong>
              </span>
              <span class="text-slate-400">• Created: {{ user.createdDate }}</span>
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 justify-end">
          <button
            @click="viewingAccount = user"
            class="btn-info btn-sm cursor-pointer"
            title="View User Profile"
          >
            <Eye class="w-3.5 h-3.5" />
            <span>View</span>
          </button>
          <button
            @click="handleOpenEdit(user)"
            class="btn-warning btn-sm cursor-pointer"
            title="Edit User Account"
          >
            <Edit3 class="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>
          <button
            @click="handleToggle(user)"
            class="btn-sm cursor-pointer"
            :class="user.isActive ? 'btn-danger' : 'btn-success'"
            :title="user.isActive ? 'Deactivate this user' : 'Activate this user'"
          >
            <PowerOff v-if="user.isActive" class="w-3.5 h-3.5" />
            <Power v-else class="w-3.5 h-3.5" />
            <span>{{ user.isActive ? 'Deactivate' : 'Activate' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ===================== CREATE ACCOUNT MODAL ===================== -->
    <div
      v-if="isCreateModalOpen"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
      @click.self="isCreateModalOpen = false"
    >
      <div class="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-4 animate-in fade-in zoom-in-95 duration-150">
        <!-- Modal Header -->
        <div class="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
              <UserPlus class="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 class="text-sm font-bold text-white leading-tight">Create Account</h3>
              <p class="text-xs text-slate-400">Fill in the details to provision a new user</p>
            </div>
          </div>
          <button @click="isCreateModalOpen = false" class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"><X class="w-5 h-5" /></button>
        </div>

        <!-- Modal Body -->
        <div class="p-6 space-y-4 overflow-y-auto flex-1">
          <!-- First Name + Last Name -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">First Name <span class="text-rose-500">*</span></label>
              <div class="relative">
                <User class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="create-first-name"
                  v-model="createForm.firstName"
                  type="text"
                  placeholder="e.g. Maria"
                  class="w-full pl-9 pr-3 py-2 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors"
                  :class="createErrors.firstName ? 'border-rose-400 ring-1 ring-rose-200 bg-rose-50/20' : 'border-slate-200'"
                />
              </div>
              <p v-if="createErrors.firstName" class="text-[10px] text-rose-500 mt-1">{{ createErrors.firstName }}</p>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">Last Name <span class="text-rose-500">*</span></label>
              <div class="relative">
                <User class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="create-last-name"
                  v-model="createForm.lastName"
                  type="text"
                  placeholder="e.g. Santos"
                  class="w-full pl-9 pr-3 py-2 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors"
                  :class="createErrors.lastName ? 'border-rose-400 ring-1 ring-rose-200 bg-rose-50/20' : 'border-slate-200'"
                />
              </div>
              <p v-if="createErrors.lastName" class="text-[10px] text-rose-500 mt-1">{{ createErrors.lastName }}</p>
            </div>
          </div>

          <!-- Email -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5">Email Address <span class="text-rose-500">*</span></label>
            <div class="relative">
              <Mail class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="create-email"
                v-model="createForm.email"
                type="email"
                placeholder="e.g. ssc.president@msunaawan.edu.ph"
                class="w-full pl-9 pr-3 py-2 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors"
                :class="createErrors.email ? 'border-rose-400 ring-1 ring-rose-200 bg-rose-50/20' : 'border-slate-200'"
              />
            </div>
            <p v-if="createErrors.email" class="text-[10px] text-rose-500 mt-1">{{ createErrors.email }}</p>
          </div>

          <!-- Organization / Office and Sub-Organization -->
          <div :class="createHasSubOrgs ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'space-y-3'">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                Organization / Office <span class="text-rose-500">*</span>
              </label>
              <div class="relative">
                <Building2 class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  id="create-org"
                  v-model="createForm.organization"
                  @change="handleCreateOrgChange"
                  class="w-full pl-9 pr-8 py-2 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white appearance-none transition-colors"
                  :class="createErrors.organization ? 'border-rose-400 ring-1 ring-rose-200 bg-rose-50/20' : 'border-slate-200'"
                >
                  <option value="" disabled>Select Organization / Office</option>
                  <optgroup label="University Offices">
                    <option
                      v-for="org in universityOffices"
                      :key="org.value"
                      :value="org.value"
                    >
                      {{ org.label }}
                    </option>
                  </optgroup>
                  <optgroup label="Student Organizations">
                    <option
                      v-for="org in studentOrganizations"
                      :key="org.value"
                      :value="org.value"
                    >
                      {{ org.label }}
                    </option>
                  </optgroup>
                </select>
                <ChevronDown class="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <p v-if="createErrors.organization" class="text-[10px] text-rose-500 mt-1">{{ createErrors.organization }}</p>
            </div>

            <!-- Sub-Organization (conditionally rendered immediately after Organization / Office) -->
            <div v-if="createHasSubOrgs">
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                Sub-Organization <span class="text-rose-500">*</span>
              </label>
              <div class="relative">
                <Layers class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  id="create-sub-org"
                  v-model="createForm.subOrg"
                  @change="delete createErrors.subOrg"
                  class="w-full pl-9 pr-8 py-2 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white appearance-none transition-colors"
                  :class="createErrors.subOrg ? 'border-rose-400 ring-1 ring-rose-200 bg-rose-50/20' : 'border-slate-200'"
                >
                  <option value="" disabled>Select Sub-Organization</option>
                  <option
                    v-for="sub in createAvailableSubOrgs"
                    :key="sub.value"
                    :value="sub.value"
                  >
                    {{ sub.label }}
                  </option>
                </select>
                <ChevronDown class="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <p v-if="createErrors.subOrg" class="text-[10px] text-rose-500 mt-1">{{ createErrors.subOrg }}</p>
            </div>
          </div>

          <!-- Role and Specify Role (when Others is selected) -->
          <div :class="createIsOthersRole ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'space-y-3'">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                Role <span class="text-rose-500">*</span>
              </label>
              <div class="relative">
                <ShieldCheck class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  id="create-role"
                  v-model="createForm.selectedRole"
                  :disabled="createIsRoleDisabled"
                  @change="handleCreateRoleChange"
                  class="w-full pl-9 pr-8 py-2 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white appearance-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  :class="createErrors.selectedRole ? 'border-rose-400 ring-1 ring-rose-200 bg-rose-50/20' : 'border-slate-200'"
                >
                  <option value="" disabled>
                    {{ createIsRoleDisabled ? 'Select Organization / Office first' : 'Select Role' }}
                  </option>
                  <option
                    v-for="roleOpt in createAvailableRoles"
                    :key="roleOpt"
                    :value="roleOpt"
                  >
                    {{ roleOpt }}
                  </option>
                </select>
                <ChevronDown class="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <p v-if="createErrors.selectedRole" class="text-[10px] text-rose-500 mt-1">{{ createErrors.selectedRole }}</p>
            </div>

            <!-- Specify Role (conditionally rendered when Others is selected) -->
            <div v-if="createIsOthersRole">
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                Specify Role <span class="text-rose-500">*</span>
              </label>
              <div class="relative">
                <FileText class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="create-specify-role"
                  v-model="createForm.customRole"
                  type="text"
                  placeholder="e.g. Committee Secretary for PPI"
                  @input="delete createErrors.customRole"
                  class="w-full pl-9 pr-3 py-2 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors"
                  :class="createErrors.customRole ? 'border-rose-400 ring-1 ring-rose-200 bg-rose-50/20' : 'border-slate-200'"
                />
              </div>
              <p v-if="createErrors.customRole" class="text-[10px] text-rose-500 mt-1">{{ createErrors.customRole }}</p>
            </div>
          </div>

          <!-- Status -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5">Status <span class="text-rose-500">*</span></label>
            <div class="relative">
              <CheckCircle2 class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select id="create-status" v-model="createForm.isActive" class="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white appearance-none transition-colors">
                <option :value="true">Active</option>
                <option :value="false">Inactive</option>
              </select>
              <ChevronDown class="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <!-- Password -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5">Password <span class="text-rose-500">*</span></label>
            <div class="relative">
              <Lock class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="create-password"
                v-model="createForm.password"
                :type="showCreatePassword ? 'text' : 'password'"
                placeholder="Set a strong password"
                class="w-full pl-9 pr-10 py-2 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors"
                :class="createErrors.password ? 'border-rose-400 ring-1 ring-rose-200 bg-rose-50/20' : 'border-slate-200'"
              />
              <button type="button" @click="showCreatePassword = !showCreatePassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer">
                <EyeOff v-if="showCreatePassword" class="w-3.5 h-3.5" /><Eye v-else class="w-3.5 h-3.5" />
              </button>
            </div>
            <p v-if="createErrors.password" class="text-[10px] text-rose-500 mt-1">{{ createErrors.password }}</p>
          </div>

          <!-- Confirm Password -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5">Confirm Password <span class="text-rose-500">*</span></label>
            <div class="relative">
              <Lock class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="create-confirm-password"
                v-model="createForm.confirmPassword"
                :type="showCreateConfirmPassword ? 'text' : 'password'"
                placeholder="Re-enter password"
                class="w-full pl-9 pr-10 py-2 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors"
                :class="createErrors.confirmPassword ? 'border-rose-400 ring-1 ring-rose-200 bg-rose-50/20' : 'border-slate-200'"
              />
              <button type="button" @click="showCreateConfirmPassword = !showCreateConfirmPassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer">
                <EyeOff v-if="showCreateConfirmPassword" class="w-3.5 h-3.5" /><Eye v-else class="w-3.5 h-3.5" />
              </button>
            </div>
            <p v-if="createErrors.confirmPassword" class="text-[10px] text-rose-500 mt-1">
              {{ createErrors.confirmPassword }}
            </p>
          </div>

          <!-- Terms of Service -->
          <div class="pt-1">
            <label class="flex items-start gap-2.5 cursor-pointer group">
              <input id="create-terms" v-model="createForm.agreedToTerms" @change="delete createErrors.terms" type="checkbox" class="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 shrink-0 cursor-pointer" />
              <span class="text-xs text-slate-600 leading-relaxed group-hover:text-slate-900 transition-colors">
                I agree to the <a href="#" class="text-blue-600 hover:underline font-semibold">Terms of Service</a> and <a href="#" class="text-blue-600 hover:underline font-semibold">Privacy Policy</a>, and confirm that I am affiliated with a recognized student organization at MSUN.
              </span>
            </label>
            <p v-if="createErrors.terms" class="text-[10px] text-rose-500 mt-1">{{ createErrors.terms }}</p>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-2.5 shrink-0">
          <button
            @click="isCreateModalOpen = false"
            class="btn-secondary"
          >
            Cancel
          </button>
          <button
            id="btn-save-create"
            @click="handleSaveCreate"
            class="btn-primary"
          >
            <UserPlus class="w-4 h-4" />
            <span>Create Account</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ===================== EDIT ACCOUNT MODAL ===================== -->
    <div
      v-if="editingAccount"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
      @click.self="editingAccount = null"
    >
      <div class="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-4 animate-in fade-in zoom-in-95 duration-150">
        <!-- Modal Header -->
        <div class="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Edit3 class="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 class="text-sm font-bold text-white leading-tight">Edit User Account</h3>
              <p class="text-xs text-slate-400">{{ editingAccount.id }}</p>
            </div>
          </div>
          <button @click="editingAccount = null" class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"><X class="w-5 h-5" /></button>
        </div>

        <!-- Modal Body -->
        <div class="p-6 space-y-4 overflow-y-auto flex-1">
          <!-- First Name + Last Name -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">First Name <span class="text-rose-500">*</span></label>
              <div class="relative">
                <User class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="edit-first-name"
                  v-model="editForm.firstName"
                  type="text"
                  class="w-full pl-9 pr-3 py-2 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors"
                  :class="editErrors.firstName ? 'border-rose-400 ring-1 ring-rose-200 bg-rose-50/20' : 'border-slate-200'"
                />
              </div>
              <p v-if="editErrors.firstName" class="text-[10px] text-rose-500 mt-1">{{ editErrors.firstName }}</p>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">Last Name <span class="text-rose-500">*</span></label>
              <div class="relative">
                <User class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="edit-last-name"
                  v-model="editForm.lastName"
                  type="text"
                  class="w-full pl-9 pr-3 py-2 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors"
                  :class="editErrors.lastName ? 'border-rose-400 ring-1 ring-rose-200 bg-rose-50/20' : 'border-slate-200'"
                />
              </div>
              <p v-if="editErrors.lastName" class="text-[10px] text-rose-500 mt-1">{{ editErrors.lastName }}</p>
            </div>
          </div>

          <!-- Email -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5">Email Address <span class="text-rose-500">*</span></label>
            <div class="relative">
              <Mail class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="edit-email"
                v-model="editForm.email"
                type="email"
                class="w-full pl-9 pr-3 py-2 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors"
                :class="editErrors.email ? 'border-rose-400 ring-1 ring-rose-200 bg-rose-50/20' : 'border-slate-200'"
              />
            </div>
            <p v-if="editErrors.email" class="text-[10px] text-rose-500 mt-1">{{ editErrors.email }}</p>
          </div>

          <!-- Organization / Office & Sub-Organization -->
          <div :class="editHasSubOrgs ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'space-y-3'">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                Organization / Office <span class="text-rose-500">*</span>
              </label>
              <div class="relative">
                <Building2 class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  id="edit-org"
                  v-model="editForm.organization"
                  @change="handleEditOrgChange"
                  class="w-full pl-9 pr-8 py-2 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white appearance-none transition-colors"
                  :class="editErrors.organization ? 'border-rose-400 ring-1 ring-rose-200 bg-rose-50/20' : 'border-slate-200'"
                >
                  <option value="" disabled>Select Organization / Office</option>
                  <optgroup label="University Offices">
                    <option
                      v-for="org in universityOffices"
                      :key="org.value"
                      :value="org.value"
                    >
                      {{ org.label }}
                    </option>
                  </optgroup>
                  <optgroup label="Student Organizations">
                    <option
                      v-for="org in studentOrganizations"
                      :key="org.value"
                      :value="org.value"
                    >
                      {{ org.label }}
                    </option>
                  </optgroup>
                </select>
                <ChevronDown class="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <p v-if="editErrors.organization" class="text-[10px] text-rose-500 mt-1">{{ editErrors.organization }}</p>
            </div>

            <!-- Sub-Organization (conditionally rendered immediately after Organization / Office) -->
            <div v-if="editHasSubOrgs">
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                Sub-Organization <span class="text-rose-500">*</span>
              </label>
              <div class="relative">
                <Layers class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  id="edit-sub-org"
                  v-model="editForm.subOrg"
                  @change="delete editErrors.subOrg"
                  class="w-full pl-9 pr-8 py-2 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white appearance-none transition-colors"
                  :class="editErrors.subOrg ? 'border-rose-400 ring-1 ring-rose-200 bg-rose-50/20' : 'border-slate-200'"
                >
                  <option value="" disabled>Select Sub-Organization</option>
                  <option
                    v-for="sub in editAvailableSubOrgs"
                    :key="sub.value"
                    :value="sub.value"
                  >
                    {{ sub.label }}
                  </option>
                </select>
                <ChevronDown class="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <p v-if="editErrors.subOrg" class="text-[10px] text-rose-500 mt-1">{{ editErrors.subOrg }}</p>
            </div>
          </div>

          <!-- Role & Specify Role (when Others is selected) -->
          <div :class="editIsOthersRole ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'space-y-3'">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                Role <span class="text-rose-500">*</span>
              </label>
              <div class="relative">
                <ShieldCheck class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  id="edit-role"
                  v-model="editForm.selectedRole"
                  :disabled="editIsRoleDisabled"
                  @change="handleEditRoleChange"
                  class="w-full pl-9 pr-8 py-2 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white appearance-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  :class="editErrors.selectedRole ? 'border-rose-400 ring-1 ring-rose-200 bg-rose-50/20' : 'border-slate-200'"
                >
                  <option value="" disabled>
                    {{ editIsRoleDisabled ? 'Select Organization / Office first' : 'Select Role' }}
                  </option>
                  <option
                    v-for="roleOpt in editAvailableRoles"
                    :key="roleOpt"
                    :value="roleOpt"
                  >
                    {{ roleOpt }}
                  </option>
                </select>
                <ChevronDown class="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <p v-if="editErrors.selectedRole" class="text-[10px] text-rose-500 mt-1">{{ editErrors.selectedRole }}</p>
            </div>

            <!-- Specify Role (conditionally rendered when Others is selected) -->
            <div v-if="editIsOthersRole">
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                Specify Role <span class="text-rose-500">*</span>
              </label>
              <div class="relative">
                <FileText class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="edit-specify-role"
                  v-model="editForm.customRole"
                  type="text"
                  placeholder="e.g. Committee Secretary for PPI"
                  @input="delete editErrors.customRole"
                  class="w-full pl-9 pr-3 py-2 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors"
                  :class="editErrors.customRole ? 'border-rose-400 ring-1 ring-rose-200 bg-rose-50/20' : 'border-slate-200'"
                />
              </div>
              <p v-if="editErrors.customRole" class="text-[10px] text-rose-500 mt-1">{{ editErrors.customRole }}</p>
            </div>
          </div>

          <!-- Status -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5">Status <span class="text-rose-500">*</span></label>
            <div class="relative">
              <CheckCircle2 class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select id="edit-status" v-model="editForm.isActive" class="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white appearance-none transition-colors">
                <option :value="true">Active</option>
                <option :value="false">Inactive</option>
              </select>
              <ChevronDown class="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-2.5 shrink-0">
          <button
            @click="editingAccount = null"
            class="btn-secondary"
          >
            Cancel
          </button>
          <button
            id="btn-save-edit"
            @click="handleSaveEdit"
            class="btn-primary"
          >
            <Save class="w-4 h-4" />
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ===================== VIEW USER PROFILE MODAL ===================== -->
    <div
      v-if="viewingAccount"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 z-50 overflow-y-auto"
      @click.self="viewingAccount = null"
    >
      <div class="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
        <!-- Unified Header matching Admin standard -->
        <div class="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900 text-white">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
              <User class="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 class="text-sm font-bold text-white leading-tight">View User Profile</h3>
              <p class="text-xs text-slate-400">{{ viewingAccount.id }}</p>
            </div>
          </div>
          <button @click="viewingAccount = null" class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="p-6 space-y-4">
          <!-- User Summary Profile Card -->
          <div class="flex items-center gap-3.5 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div
              class="w-12 h-12 rounded-xl font-black text-sm flex items-center justify-center text-white shadow-xs shrink-0"
              :class="viewingAccount.isActive ? 'bg-blue-600' : 'bg-slate-400'"
            >
              {{ getInitials(viewingAccount) }}
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <h4 class="text-sm font-bold text-slate-900 truncate">{{ getDisplayName(viewingAccount) }}</h4>
                <span
                  class="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                  :class="viewingAccount.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'"
                >
                  {{ viewingAccount.isActive ? 'Active' : 'Deactivated' }}
                </span>
                <span class="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md">
                  {{ getAccountDisplayRole(viewingAccount) }}
                </span>
              </div>
              <p class="text-xs text-slate-500 truncate mt-0.5 font-medium flex items-center gap-1.5 flex-wrap">
                <span class="text-slate-500 font-normal">Organization:</span>
                <span class="font-semibold text-slate-800">{{ getUserActualOrg(viewingAccount) }}</span>
                <span v-if="isUserInSubOrg(viewingAccount)" class="text-[10px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                  Under: <strong class="text-slate-800">{{ getUserParentOrg(viewingAccount) }}</strong>
                </span>
              </p>
            </div>
          </div>

          <!-- First Name + Last Name -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">First Name</label>
              <div class="relative">
                <User class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <div class="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-800 font-medium truncate">
                  {{ viewingAccount.firstName || (viewingAccount.name ? viewingAccount.name.split(' ')[0] : '') || '-' }}
                </div>
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">Last Name</label>
              <div class="relative">
                <User class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <div class="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-800 font-medium truncate">
                  {{ viewingAccount.lastName || (viewingAccount.name ? viewingAccount.name.split(' ').slice(1).join(' ') : '') || '-' }}
                </div>
              </div>
            </div>
          </div>

          <!-- Email -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
            <div class="relative">
              <Mail class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <div class="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-800 truncate">
                {{ viewingAccount.email }}
              </div>
            </div>
          </div>

          <!-- Organization / Office + Sub-Organization -->
          <div :class="isUserInSubOrg(viewingAccount) ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'space-y-3'">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">
                {{ isUserInSubOrg(viewingAccount) ? 'Actual Organization' : 'Organization / Office' }}
              </label>
              <div class="relative">
                <Building2 class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <div class="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-800 font-medium truncate">
                  {{ getUserActualOrg(viewingAccount) }}
                </div>
              </div>
            </div>
            <div v-if="isUserInSubOrg(viewingAccount)">
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">Parent Organization</label>
              <div class="relative">
                <Layers class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <div class="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-800 font-medium truncate">
                  {{ getUserParentOrg(viewingAccount) }}
                </div>
              </div>
            </div>
          </div>

          <!-- Role & System Access Level -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">Designation / Role</label>
              <div class="relative">
                <ShieldCheck class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <div class="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-800 font-medium truncate">
                  {{ getAccountDisplayRole(viewingAccount) }}
                </div>
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">System Access Level</label>
              <div class="relative">
                <ShieldCheck class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <div class="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-800 font-medium truncate">
                  {{ viewingAccount.role }}
                </div>
              </div>
            </div>
          </div>

          <!-- Status -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5">Status</label>
            <div class="relative">
              <CheckCircle2 class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <div class="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-800 flex items-center">
                <span
                  class="text-[10px] font-bold px-2.5 py-0.5 rounded-full border"
                  :class="viewingAccount.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'"
                >
                  {{ viewingAccount.isActive ? 'Active' : 'Inactive' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Password -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
            <div class="relative flex items-center">
              <Lock class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <div class="w-full pl-9 pr-10 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-800 tracking-widest truncate">
                {{ showViewPassword ? (viewingAccount.password || '(not set)') : '••••••••' }}
              </div>
              <button
                type="button"
                @click="showViewPassword = !showViewPassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <EyeOff v-if="showViewPassword" class="w-3.5 h-3.5" /><Eye v-else class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div class="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-2.5">
          <button
            @click="handleToggle(viewingAccount)"
            class="btn-sm"
            :class="viewingAccount.isActive ? 'btn-danger' : 'btn-success'"
          >
            <PowerOff v-if="viewingAccount.isActive" class="w-3.5 h-3.5" />
            <Power v-else class="w-3.5 h-3.5" />
            <span>{{ viewingAccount.isActive ? 'Deactivate Account' : 'Activate Account' }}</span>
          </button>
          <div class="flex items-center gap-2">
            <button
              @click="handleOpenEdit(viewingAccount); viewingAccount = null"
              class="btn-warning btn-sm cursor-pointer"
            >
              <Edit3 class="w-3.5 h-3.5" />
              <span>Edit Account</span>
            </button>
            <button
              @click="viewingAccount = null"
              class="btn-secondary btn-sm cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ===================== DEACTIVATION CONFIRMATION MODAL ===================== -->
    <div
      v-if="deactivatingAccount"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
      @click.self="cancelDeactivateAccount"
    >
      <div class="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
        
        <!-- Header -->
        <div 
          class="p-5 border-b flex items-center justify-between"
          :class="accountPendingActivities.length > 0 ? 'bg-amber-500 text-white border-amber-600' : 'bg-slate-900 text-white border-slate-800'"
        >
          <div class="flex items-center gap-3">
            <div 
              class="w-10 h-10 rounded-2xl flex items-center justify-center font-bold shadow-xs shrink-0"
              :class="accountPendingActivities.length > 0 ? 'bg-white/20 text-white' : 'bg-rose-600 text-white'"
            >
              <AlertTriangle v-if="accountPendingActivities.length > 0" class="w-5 h-5 text-white" />
              <PowerOff v-else class="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 class="text-sm font-bold leading-tight">
                {{ accountPendingActivities.length > 0 ? 'Active Activities Detected' : 'Confirm Account Deactivation' }}
              </h3>
              <p class="text-xs opacity-90">
                {{ accountPendingActivities.length > 0 ? 'Review pending initiatives before deactivating' : 'Administrative confirmation required' }}
              </p>
            </div>
          </div>
          <button 
            @click="cancelDeactivateAccount" 
            class="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-black/20 transition-colors cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="p-6 space-y-4">
          <!-- Target Account Info Box -->
          <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
            <div class="w-11 h-11 rounded-2xl bg-slate-900 text-white font-extrabold flex items-center justify-center shrink-0 text-sm">
              {{ getInitials(deactivatingAccount) }}
            </div>
            <div class="min-w-0 flex-1">
              <h4 class="text-sm font-bold text-slate-900 truncate">{{ getDisplayName(deactivatingAccount) }}</h4>
              <p class="text-xs text-slate-500 truncate">{{ formatUserRole(deactivatingAccount) }} &bull; {{ deactivatingAccount.email }}</p>
              <p class="text-[11px] text-blue-700 font-semibold truncate">{{ getOrgNameById(deactivatingAccount.orgId) }}</p>
            </div>
          </div>

          <!-- Pending Activities Warning Section -->
          <div v-if="accountPendingActivities.length > 0" class="space-y-3">
            <div class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertTriangle class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div class="leading-relaxed">
                <strong class="font-bold">Attention:</strong> This account has
                <span class="font-black text-amber-950">{{ accountPendingActivities.length }} active or pending activity proposal(s)</span>
                that have not yet been approved or fully implemented:
              </div>
            </div>

            <!-- List of Pending/Active Activities -->
            <div class="space-y-2 max-h-52 overflow-y-auto pr-1">
              <div
                v-for="act in accountPendingActivities"
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
              ⚠️ Deactivating this account will prevent the user from logging in, editing proposals, or managing workflow requirements.
            </p>
          </div>

          <div v-else class="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-center text-xs text-slate-600">
            <CheckCircle2 class="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
            <p class="font-semibold text-slate-800">No active pending activities linked.</p>
            <p class="text-[11px] text-slate-500 mt-0.5">This user has no incomplete proposals or unresolved tasks in the system.</p>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
          <button
            type="button"
            @click="cancelDeactivateAccount"
            class="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="confirmDeactivateAccount"
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
