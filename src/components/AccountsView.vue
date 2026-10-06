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
  Clock
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
const newAccountForm = ref<{
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  orgId: OrgId | 'OSD' | 'OVCSAS' | 'OC' | 'OSA' | 'ADMIN' | 'COLLEGE';
  isActive: boolean;
  password: string;
  confirmPassword: string;
  agreedToTerms: boolean;
}>({
  firstName: '',
  lastName: '',
  email: '',
  role: 'ROLE_OSD',
  orgId: 'OSD',
  isActive: true,
  password: '',
  confirmPassword: '',
  agreedToTerms: false
});

export interface RoleOption {
  value: UserRole;
  label: string;
  badge: string;
}

const rolesList: RoleOption[] = [
  { value: 'ROLE_ADMIN', label: 'System Administrator', badge: 'System Administration' },
  { value: 'ROLE_ORGANIZATION', label: 'Student Organization Officer / President', badge: 'Proposal Submitter' },
  { value: 'Org Treasurer', label: 'Student Organization Treasurer', badge: 'Financial Management' },
  { value: 'ROLE_ADVISER', label: 'Faculty Adviser', badge: 'Adviser Review' },
  { value: 'ROLE_DEAN', label: 'College Dean / Academic Reviewer', badge: 'College Endorsement' },
  { value: 'ROLE_OSD', label: 'Office of Student Development (OSD)', badge: 'OSD Reviewer & Approver' },
  { value: 'OSD Director', label: 'OSD Director', badge: 'OSD Reviewer & Approver' },
  { value: 'ROLE_OVCSAS', label: 'OVCSAS Officer (Vice Chancellor for Student Affairs)', badge: 'Executive Endorser' },
  { value: 'ROLE_OC', label: 'Office of the Chancellor (Final Approval)', badge: 'Final Authorization' }
];

const filteredAccounts = computed(() => {
  return props.accounts.filter((acc) => {
    const fullName = acc.name || `${acc.firstName || ''} ${acc.lastName || ''}`.trim();
    const matchesSearch = 
      fullName.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      acc.email.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (acc.orgName && acc.orgName.toLowerCase().includes(searchQuery.value.toLowerCase())) ||
      acc.role.toLowerCase().includes(searchQuery.value.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedRoleFilter.value === 'OSD') {
      return acc.role === 'ROLE_OSD' || acc.role === 'OSD Officer' || acc.role === 'OSD Director' || acc.orgId === 'OSD';
    }
    if (selectedRoleFilter.value === 'DEAN') {
      return acc.role === 'ROLE_DEAN' || acc.role === 'Dean / College Reviewer';
    }
    if (selectedRoleFilter.value === 'ADVISER') {
      return acc.role === 'ROLE_ADVISER' || acc.role === 'Faculty Adviser';
    }
    if (selectedRoleFilter.value === 'ORG') {
      return acc.role === 'ROLE_ORGANIZATION' || acc.role === 'Org President' || acc.role === 'Org Treasurer';
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
  if (id === 'OSD') return 'Office of Student Development (OSD)';
  if (id === 'OVCSAS') return 'Office of the Vice Chancellor for Student Affairs and Services';
  if (id === 'OC') return 'Office of the Chancellor';
  if (id === 'OSA') return 'Office of Student Affairs';
  if (id === 'ADMIN') return 'ICT System Administration Division';
  if (id === 'COLLEGE') return 'College / Academic Reviewer';
  const org = ORGANIZATIONS.find((o) => o.id === id);
  return org ? org.name : id;
};

const handleOpenCreate = () => {
  newAccountForm.value = {
    firstName: '',
    lastName: '',
    email: '',
    role: 'ROLE_OSD',
    orgId: 'OSD',
    isActive: true,
    password: '',
    confirmPassword: '',
    agreedToTerms: false
  };
  showCreatePassword.value = false;
  showCreateConfirmPassword.value = false;
  isCreateModalOpen.value = true;
};

const handleSaveCreate = () => {
  const { firstName, lastName, email, password, confirmPassword, agreedToTerms } = newAccountForm.value;
  if (!firstName.trim() || !lastName.trim()) {
    emit('showToast', 'Validation Error', 'Please provide both First Name and Last Name.', 'warning');
    return;
  }
  if (!email.trim()) {
    emit('showToast', 'Validation Error', 'Please provide a valid email address.', 'warning');
    return;
  }
  if (!password.trim()) {
    emit('showToast', 'Validation Error', 'Please set a password for this account.', 'warning');
    return;
  }
  if (password !== confirmPassword) {
    emit('showToast', 'Validation Error', 'Password and Confirm Password do not match.', 'warning');
    return;
  }
  if (!agreedToTerms) {
    emit('showToast', 'Terms Required', 'You must agree to the Terms of Service before creating the account.', 'warning');
    return;
  }
  const fullName = `${firstName.trim()} ${lastName.trim()}`;
  emit('createAccount', {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    name: fullName,
    email: email.trim(),
    role: newAccountForm.value.role,
    orgId: newAccountForm.value.orgId,
    orgName: getOrgNameById(newAccountForm.value.orgId),
    isActive: newAccountForm.value.isActive,
    password: password,
    avatar: (firstName.trim()[0] + lastName.trim()[0]).toUpperCase()
  });
  isCreateModalOpen.value = false;
};

const handleOpenEdit = (acc: UserAccount) => {
  editingAccount.value = JSON.parse(JSON.stringify(acc));
  if (editingAccount.value && !editingAccount.value.firstName && editingAccount.value.name) {
    const parts = editingAccount.value.name.split(' ');
    editingAccount.value.firstName = parts[0] || '';
    editingAccount.value.lastName = parts.slice(1).join(' ') || '';
  }
};

const handleSaveEdit = () => {
  if (!editingAccount.value) return;
  if (editingAccount.value.firstName || editingAccount.value.lastName) {
    editingAccount.value.name = `${editingAccount.value.firstName || ''} ${editingAccount.value.lastName || ''}`.trim();
    editingAccount.value.avatar = ((editingAccount.value.firstName?.[0] || '') + (editingAccount.value.lastName?.[0] || '')).toUpperCase() || editingAccount.value.avatar;
  }
  editingAccount.value.orgName = getOrgNameById(editingAccount.value.orgId);
  emit('updateAccount', editingAccount.value);
  editingAccount.value = null;
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
              <span class="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md">{{ formatUserRole(user.role) }}</span>
            </div>
            <p class="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
              <Mail class="w-3.5 h-3.5 text-slate-400 shrink-0" /><span class="truncate">{{ user.email }}</span>
            </p>
            <p class="text-[11px] text-slate-600 flex items-center gap-1.5 mt-0.5">
              <Building2 class="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span class="font-medium text-slate-700 truncate">{{ user.orgName }}</span>
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
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 z-50 overflow-y-auto"
      @click.self="isCreateModalOpen = false"
    >
      <div class="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
        <div class="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900 text-white">
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

        <div class="p-6 space-y-4">
          <!-- First Name + Last Name -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">First Name <span class="text-rose-500">*</span></label>
              <div class="relative">
                <User class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input id="create-first-name" v-model="newAccountForm.firstName" type="text" placeholder="e.g. Maria" class="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">Last Name <span class="text-rose-500">*</span></label>
              <div class="relative">
                <User class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input id="create-last-name" v-model="newAccountForm.lastName" type="text" placeholder="e.g. Santos" class="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors" />
              </div>
            </div>
          </div>

          <!-- Email -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5">Email Address <span class="text-rose-500">*</span></label>
            <div class="relative">
              <Mail class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input id="create-email" v-model="newAccountForm.email" type="email" placeholder="e.g. ssc.president@msunaawan.edu.ph" class="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors" />
            </div>
          </div>

          <!-- Organization + Role -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">Organization <span class="text-rose-500">*</span></label>
              <div class="relative">
                <Building2 class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select id="create-org" v-model="newAccountForm.orgId" class="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white appearance-none transition-colors">
                  <option value="OSA">Office of Student Affairs (OSA)</option>
                  <option value="ADMIN">ICT System Administration</option>
                  <option value="COLLEGE">College Academic Deans</option>
                  <option v-for="org in ORGANIZATIONS" :key="org.id" :value="org.id">{{ org.acronym }} - {{ org.name }}</option>
                </select>
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">Role <span class="text-rose-500">*</span></label>
              <div class="relative">
                <ShieldCheck class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select id="create-role" v-model="newAccountForm.role" class="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white appearance-none transition-colors">
                  <option v-for="r in rolesList" :key="r.value" :value="r.value">{{ r.label }}</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Status -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5">Status <span class="text-rose-500">*</span></label>
            <div class="relative">
              <CheckCircle2 class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select id="create-status" v-model="newAccountForm.isActive" class="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white appearance-none transition-colors">
                <option :value="true">Active</option>
                <option :value="false">Inactive</option>
              </select>
            </div>
          </div>

          <!-- Password -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5">Password <span class="text-rose-500">*</span></label>
            <div class="relative">
              <Lock class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="create-password"
                v-model="newAccountForm.password"
                :type="showCreatePassword ? 'text' : 'password'"
                placeholder="Set a strong password"
                class="w-full pl-9 pr-10 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors"
              />
              <button type="button" @click="showCreatePassword = !showCreatePassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer">
                <EyeOff v-if="showCreatePassword" class="w-3.5 h-3.5" /><Eye v-else class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <!-- Confirm Password -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5">Confirm Password <span class="text-rose-500">*</span></label>
            <div class="relative">
              <Lock class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="create-confirm-password"
                v-model="newAccountForm.confirmPassword"
                :type="showCreateConfirmPassword ? 'text' : 'password'"
                placeholder="Re-enter password"
                class="w-full pl-9 pr-10 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors"
                :class="newAccountForm.confirmPassword && newAccountForm.password !== newAccountForm.confirmPassword ? 'border-rose-300' : ''"
              />
              <button type="button" @click="showCreateConfirmPassword = !showCreateConfirmPassword" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer">
                <EyeOff v-if="showCreateConfirmPassword" class="w-3.5 h-3.5" /><Eye v-else class="w-3.5 h-3.5" />
              </button>
            </div>
            <p v-if="newAccountForm.confirmPassword && newAccountForm.password !== newAccountForm.confirmPassword" class="text-[10px] text-rose-500 mt-1">
              Passwords do not match.
            </p>
          </div>

          <!-- Terms of Service -->
          <div class="pt-1">
            <label class="flex items-start gap-2.5 cursor-pointer group">
              <input id="create-terms" v-model="newAccountForm.agreedToTerms" type="checkbox" class="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 shrink-0 cursor-pointer" />
              <span class="text-xs text-slate-600 leading-relaxed group-hover:text-slate-900 transition-colors">
                I agree to the <a href="#" class="text-blue-600 hover:underline font-semibold">Terms of Service</a> and <a href="#" class="text-blue-600 hover:underline font-semibold">Privacy Policy</a>, and confirm that I am affiliated with a recognized student organization at MSUN.
              </span>
            </label>
          </div>
        </div>

        <div class="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-2.5">
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
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 z-50 overflow-y-auto"
      @click.self="editingAccount = null"
    >
      <div class="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
        <div class="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900 text-white">
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

        <div class="p-6 space-y-4">
          <!-- First Name + Last Name -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">First Name</label>
              <div class="relative">
                <User class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input id="edit-first-name" v-model="editingAccount.firstName" type="text" class="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">Last Name</label>
              <div class="relative">
                <User class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input id="edit-last-name" v-model="editingAccount.lastName" type="text" class="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors" />
              </div>
            </div>
          </div>

          <!-- Email -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
            <div class="relative">
              <Mail class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input id="edit-email" v-model="editingAccount.email" type="email" class="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-colors" />
            </div>
          </div>

          <!-- Organization + Role -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">Organization</label>
              <div class="relative">
                <Building2 class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select id="edit-org" v-model="editingAccount.orgId" class="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white appearance-none transition-colors">
                  <option value="OSA">Office of Student Affairs (OSA)</option>
                  <option value="ADMIN">ICT System Administration</option>
                  <option value="COLLEGE">College Academic Deans</option>
                  <option v-for="org in ORGANIZATIONS" :key="org.id" :value="org.id">{{ org.acronym }} - {{ org.name }}</option>
                </select>
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">Role</label>
              <div class="relative">
                <ShieldCheck class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select id="edit-role" v-model="editingAccount.role" class="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white appearance-none transition-colors">
                  <option v-for="r in rolesList" :key="r.value" :value="r.value">{{ r.label }}</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Status -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1.5">Status</label>
            <div class="relative">
              <CheckCircle2 class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select id="edit-status" v-model="editingAccount.isActive" class="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white appearance-none transition-colors">
                <option :value="true">Active</option>
                <option :value="false">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        <div class="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-2.5">
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
                  {{ formatUserRole(viewingAccount.role) }}
                </span>
              </div>
              <p class="text-xs text-slate-500 truncate mt-0.5 font-medium">{{ viewingAccount.orgName }}</p>
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

          <!-- Organization + Role -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">Organization</label>
              <div class="relative">
                <Building2 class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <div class="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-800 font-medium truncate">
                  {{ viewingAccount.orgName }}
                </div>
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1.5">Role</label>
              <div class="relative">
                <ShieldCheck class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <div class="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-800 font-medium truncate">
                  {{ formatUserRole(viewingAccount.role) }}
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
              <p class="text-xs text-slate-500 truncate">{{ formatUserRole(deactivatingAccount.role) }} &bull; {{ deactivatingAccount.email }}</p>
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
