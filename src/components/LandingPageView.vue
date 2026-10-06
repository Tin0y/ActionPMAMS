<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { 
  UserAccount, 
  UserRole, 
  OrgId, 
  OrganizationType,
  formatUserRole
} from '../types';
import { 
  ORGANIZATIONS, 
  getOrgTheme 
} from '../data/initialData';
import { 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  ShieldCheck, 
  Users, 
  Award, 
  Landmark, 
  Building2, 
  CalendarCheck, 
  Mail, 
  User, 
  ChevronRight, 
  Check, 
  Lock,
  Eye, 
  EyeOff,
  BarChart3,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-vue-next';

const props = defineProps<{
  currentUser?: UserAccount | null;
  userAccounts: UserAccount[];
}>();

const emit = defineEmits<{
  (e: 'completeOnboarding', account: UserAccount): void;
  (e: 'continueAsUser', account: UserAccount): void;
  (e: 'closeLanding'): void;
}>();

// Steps: 'landing' -> 'role_selection' -> 'information_form'
type OnboardingStep = 'landing' | 'role_selection' | 'information_form';
const currentStep = ref<OnboardingStep>('landing');

// Exactly 3 roles:
// 1. 'student_org' (Student Organization)
// 2. 'approver' (Approvers)
// 3. 'system_admin' (System Administrator)
type RoleCategory = 'student_org' | 'approver' | 'system_admin';
const selectedRoleCategory = ref<RoleCategory>('student_org');

interface SimpleRoleOption {
  id: RoleCategory;
  title: string;
  icon: any;
  iconBg: string;
  description: string;
}

const simpleRoleOptions: SimpleRoleOption[] = [
  {
    id: 'student_org',
    title: 'Student Organization',
    icon: Users,
    iconBg: 'bg-blue-100 text-blue-700',
    description: 'For student council officers, presidents, treasurers, and project leads submitting annual action plans.'
  },
  {
    id: 'approver',
    title: 'Approvers',
    icon: Award,
    iconBg: 'bg-amber-100 text-amber-700',
    description: 'For institutional review and approval authorities (Faculty Advisers, College Deans, OSD, OVCSAS, and Chancellor).'
  },
  {
    id: 'system_admin',
    title: 'System Administrator',
    icon: ShieldCheck,
    iconBg: 'bg-slate-100 text-slate-700',
    description: 'For ICT Center administrators managing system configurations, users, and annual action plan archives.'
  }
];

// Login form state (Only Email & Password)
const loginEmail = ref('');
const loginPassword = ref('');
const showPassword = ref(false);
const loginError = ref('');

// Reset state when user logs out or currentUser changes
watch(
  () => props.currentUser,
  (newUser) => {
    if (!newUser) {
      currentStep.value = 'landing';
      loginEmail.value = '';
      loginPassword.value = '';
      loginError.value = '';
    }
  }
);

const currentRoleInfo = computed(() => {
  return simpleRoleOptions.find(r => r.id === selectedRoleCategory.value) || simpleRoleOptions[0];
});

// Real-time recognized account based on typed email
const recognizedAccount = computed(() => {
  if (!loginEmail.value.trim()) return null;
  const q = loginEmail.value.trim().toLowerCase();
  return props.userAccounts.find(a => a.email.toLowerCase() === q);
});

// Step navigation
const handleStartPlanning = () => {
  currentStep.value = 'role_selection';
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const handleEnterDashboard = () => {
  if (props.currentUser) {
    emit('closeLanding');
  } else {
    handleStartPlanning();
  }
};

const handleSelectRole = (roleId: RoleCategory) => {
  selectedRoleCategory.value = roleId;
  loginError.value = '';
  loginEmail.value = '';
  loginPassword.value = '';
  currentStep.value = 'information_form';
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const handleBackToLanding = () => {
  currentStep.value = 'landing';
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const handleBackToRoleSelection = () => {
  currentStep.value = 'role_selection';
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Handle Sign In & Start Planning
const handleSignInAndStartPlanning = () => {
  loginError.value = '';
  const emailInput = loginEmail.value.trim().toLowerCase();

  if (!emailInput) {
    loginError.value = 'Please enter your institutional email address.';
    return;
  }
  if (!emailInput.includes('@')) {
    loginError.value = 'Please enter a valid institutional email address.';
    return;
  }
  if (!loginPassword.value.trim()) {
    loginError.value = 'Please enter your account password.';
    return;
  }

  // Look for account in userAccounts
  const matched = props.userAccounts.find(a => a.email.toLowerCase() === emailInput);

  if (matched) {
    if (matched.password && loginPassword.value.trim() !== matched.password) {
      loginError.value = 'Invalid password for this account. Please try again.';
      return;
    }
    emit('continueAsUser', matched);
    return;
  }

  // If email is not directly found, auto-provision and recognize it seamlessly
  let role: UserRole = 'ROLE_ORGANIZATION';
  let orgId = 'CBIT';
  let orgName = 'College of Business and Information Technology';
  let organizationType: OrganizationType = 'COLLEGE';

  if (selectedRoleCategory.value === 'approver') {
    if (emailInput.includes('osd')) {
      role = 'ROLE_OSD';
      orgId = 'OSD';
      orgName = 'Office of Student Development';
    } else if (emailInput.includes('dean')) {
      role = 'ROLE_DEAN';
      orgId = 'CBIT';
      orgName = 'College Dean Reviewer';
    } else if (emailInput.includes('ovcsas')) {
      role = 'ROLE_OVCSAS';
      orgId = 'OVCSAS';
      orgName = 'Office of the Vice Chancellor';
    } else if (emailInput.includes('chancellor')) {
      role = 'ROLE_OC';
      orgId = 'OC';
      orgName = 'Office of the Chancellor';
    } else {
      role = 'ROLE_ADVISER';
      orgId = 'CBIT';
      orgName = 'Faculty Adviser';
    }
  } else if (selectedRoleCategory.value === 'system_admin') {
    role = 'ROLE_ADMIN';
    orgId = 'ADMIN';
    orgName = 'ICT System Administration';
  } else {
    // Student org
    if (emailInput.includes('ssc')) {
      orgId = 'SSC';
      orgName = 'Supreme Student Council';
      organizationType = 'CENTRAL';
    }
  }

  const prefix = emailInput.split('@')[0].replace(/[._-]/g, ' ');
  const formattedName = prefix
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ') || 'User';

  const newAccount: UserAccount = {
    id: `usr-${orgId.toLowerCase()}-${Date.now().toString().slice(-4)}`,
    name: formattedName,
    firstName: formattedName.split(' ')[0],
    lastName: formattedName.split(' ').slice(1).join(' '),
    email: emailInput,
    avatar: formattedName.slice(0, 2).toUpperCase(),
    isActive: true,
    role: role,
    orgId: orgId,
    orgName: orgName,
    organizationType: organizationType,
    password: loginPassword.value,
    lastActive: 'Active Now',
    createdDate: new Date().toISOString().split('T')[0],
    idNumber: selectedRoleCategory.value === 'student_org' ? '2023-0142' : 'EMP-2109'
  };

  emit('completeOnboarding', newAccount);
};
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900 relative overflow-x-hidden">
    
    <!-- Top University Banner Header (Comfortable Light Design) -->
    <header class="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-40 transition-all shadow-2xs">
      <div class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-2">
        
        <!-- University Brand Lockup -->
        <div class="flex items-center gap-2.5 sm:gap-3.5 cursor-pointer min-w-0" @click="handleBackToLanding">
          <img
            src="/msunlogo.png"
            alt="Mindanao State University at Naawan Seal"
            class="w-9 h-9 sm:w-11 sm:h-11 object-contain shrink-0 drop-shadow-sm hover:scale-105 transition-transform"
          />
          <div class="min-w-0">
            <div class="flex items-center gap-1.5 sm:gap-2">
              <span class="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-800 truncate">
                <span class="sm:hidden">MSU Naawan</span>
                <span class="hidden sm:inline">Mindanao State University</span>
              </span>
              <span class="hidden sm:inline-block text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded font-bold shrink-0">Naawan</span>
            </div>
            <h1 class="text-xs sm:text-base font-extrabold text-slate-900 tracking-tight leading-tight truncate">
              <span class="sm:hidden">Action Plan System</span>
              <span class="hidden sm:inline">Action Plan: Monitoring & Management System</span>
            </h1>
          </div>
        </div>

        <!-- Right: Enter Dashboard if currentUser exists, or Sign In -->
        <div class="flex items-center gap-2 sm:gap-3 shrink-0 ml-1">
          <button 
            v-if="currentUser"
            @click="handleEnterDashboard"
            class="text-xs font-bold px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <span class="hidden sm:inline">Enter Dashboard</span>
            <span class="sm:hidden">Dashboard</span>
            <ArrowRight class="w-3.5 h-3.5" />
          </button>
          <button 
            v-else
            @click="handleStartPlanning"
            class="text-xs font-bold px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <span>Sign In</span>
            <ArrowRight class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>

    <!-- Stepper Navigation when in Onboarding Flow -->
    <div v-if="currentStep !== 'landing'" class="bg-white border-b border-slate-200 py-2.5 sm:py-3 shadow-2xs">
      <div class="max-w-4xl mx-auto px-3 sm:px-4 flex items-center justify-center text-xs gap-2">
        <div class="flex items-center gap-2 sm:gap-3 font-semibold text-[11px] sm:text-xs">
          <span class="text-emerald-700 flex items-center gap-1 shrink-0">
            <Check class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">Overview</span>
          </span>
          <span class="text-slate-300">/</span>

          <div 
            class="flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
            :class="currentStep === 'role_selection' ? 'text-blue-700 font-bold' : 'text-slate-500 hover:text-slate-800'"
            @click="currentStep = 'role_selection'"
          >
            <span 
              class="w-4 h-4 sm:w-5 sm:h-5 rounded-full text-[9px] sm:text-[10px] flex items-center justify-center font-bold"
              :class="currentStep === 'role_selection' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 border border-slate-300'"
            >2</span>
            <span>Role</span>
          </div>
          <span class="text-slate-300">/</span>

          <div 
            class="flex items-center gap-1.5 transition-colors shrink-0"
            :class="currentStep === 'information_form' ? 'text-blue-700 font-bold' : 'text-slate-400'"
          >
            <span 
              class="w-4 h-4 sm:w-5 sm:h-5 rounded-full text-[9px] sm:text-[10px] flex items-center justify-center font-bold"
              :class="currentStep === 'information_form' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400 border border-slate-300'"
            >3</span>
            <span>Sign In</span>
          </div>
        </div>
      </div>
    </div>

    <!-- MAIN BODY CONTENT -->
    <main class="flex-1 flex flex-col">
      
      <!-- ========================================================================= -->
      <!-- 1. LANDING PAGE (Clean Light Design, Comfortable on the Eyes) -->
      <!-- ========================================================================= -->
      <section v-if="currentStep === 'landing'" class="flex-1 flex flex-col">
        
        <!-- Hero Section -->
        <div class="relative overflow-hidden pt-16 pb-20 sm:pt-20 sm:pb-28 border-b border-slate-200 bg-linear-to-b from-white via-slate-50 to-blue-50/20">
          
          <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">

            <!-- Main Heading -->
            <h1 class="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight sm:leading-tight">
              Action Plan Monitoring & <br class="hidden sm:block" />
              <span class="bg-linear-to-r from-blue-700 via-indigo-700 to-amber-700 bg-clip-text text-transparent">
                Management System
              </span>
            </h1>

            <!-- Subtitle -->
            <p class="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal">
              The unified digital platform for recognized student organizations at Mindanao State University at Naawan. Streamline proposal matrix formulation, administrative routing, budget allocation, and accomplishment reporting.
            </p>

            <!-- Prominent CTA Section: ONLY "Start Planning" -->
            <div class="mt-8 flex items-center justify-center">
              <button
                @click="handleStartPlanning"
                class="px-9 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-base shadow-lg shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer"
              >
                <Sparkles class="w-5 h-5 text-amber-300" />
                <span>Start Planning</span>
                <ArrowRight class="w-5 h-5 text-white" />
              </button>
            </div>

            <!-- Key Feature Highlights -->
            <div class="mt-14 pt-10 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
              <div class="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
                <div class="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-3">
                  <FileSpreadsheet class="w-4 h-4" />
                </div>
                <h4 class="text-xs font-bold text-slate-900">Action Plan Matrix</h4>
                <p class="text-[11px] text-slate-500 mt-1">Official 10-column institutional matrix with line-item budgets.</p>
              </div>

              <div class="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
                <div class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                  <BarChart3 class="w-4 h-4" />
                </div>
                <h4 class="text-xs font-bold text-slate-900">Budget Tracking</h4>
                <p class="text-[11px] text-slate-500 mt-1">Live allocation, disbursement tracking & liquidation records.</p>
              </div>

              <div class="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow">
                <div class="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-3">
                  <CalendarCheck class="w-4 h-4" />
                </div>
                <h4 class="text-xs font-bold text-slate-900">University Schedule</h4>
                <p class="text-[11px] text-slate-500 mt-1">Prevent date overlaps across campus student councils.</p>
              </div>
            </div>

          </div>
        </div>

        <!-- Recognized Student Organizations Section -->
        <section class="py-14 bg-white border-b border-slate-200">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
              <div>
                <span class="text-xs font-bold uppercase tracking-wider text-amber-800">Mindanao State University at Naawan</span>
                <h2 class="text-xl sm:text-2xl font-black text-slate-900 mt-1">Recognized Student Organizations</h2>
                <p class="text-xs text-slate-500 mt-1">Academic councils, student government, and university publication units.</p>
              </div>
              <button 
                @click="handleStartPlanning"
                class="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer self-start sm:self-auto"
              >
                <span>Plan for your organization</span>
                <ChevronRight class="w-4 h-4" />
              </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div 
                v-for="org in ORGANIZATIONS" 
                :key="org.id"
                class="p-5 rounded-2xl bg-slate-50/60 border border-slate-200 hover:border-blue-400 hover:bg-white transition-all flex flex-col justify-between group shadow-2xs hover:shadow-xs"
              >
                <div>
                  <div class="flex items-center justify-between">
                    <span 
                      class="text-xs font-extrabold px-2.5 py-1 rounded-lg border uppercase tracking-wider"
                      :class="[
                        getOrgTheme(org.id).badgeBg,
                        getOrgTheme(org.id).badgeText,
                        getOrgTheme(org.id).badgeBorder
                      ]"
                    >
                      {{ org.acronym }}
                    </span>
                    <span class="text-[10px] text-slate-400 font-medium">{{ org.registeredNumber }}</span>
                  </div>
                  <h3 class="text-sm font-bold text-slate-900 mt-3 leading-snug group-hover:text-blue-600 transition-colors">
                    {{ org.name }}
                  </h3>
                  <p class="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {{ org.description }}
                  </p>
                </div>

                <div class="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
                  <span>President: <strong class="text-slate-800">{{ org.president.split(' ')[0] }}</strong></span>
                  <span class="text-emerald-700 font-semibold">Active</span>
                </div>
              </div>
            </div>
          </div>
        </section>

      </section>

      <!-- ========================================================================= -->
      <!-- 2. SIMPLE ROLE SELECTION (3 Clean Light Cards) -->
      <!-- ========================================================================= -->
      <section v-else-if="currentStep === 'role_selection'" class="flex-1 py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        
        <div class="text-center max-w-xl mx-auto mb-10">
          <span class="text-xs font-bold uppercase tracking-wider text-amber-800">Step 2 of 3</span>
          <h2 class="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            Choose Your Role
          </h2>
          <p class="text-xs sm:text-sm text-slate-500 mt-2">
            Select your institutional role to tailor your workspace and sign in.
          </p>
        </div>

        <!-- Simple, Clean 3-Card Grid (Comfortable Light Design) -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div
            v-for="role in simpleRoleOptions"
            :key="role.id"
            @click="handleSelectRole(role.id)"
            class="rounded-2xl border p-6 transition-all cursor-pointer flex flex-col justify-between group relative text-center bg-white shadow-xs hover:shadow-md"
            :class="selectedRoleCategory === role.id 
              ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/20' 
              : 'border-slate-200 hover:border-blue-400'"
          >
            <div>
              <!-- Icon Container -->
              <div 
                class="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4 transition-transform group-hover:scale-105"
                :class="role.iconBg"
              >
                <component :is="role.icon" class="w-7 h-7" />
              </div>

              <!-- Title -->
              <h3 class="text-base font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                {{ role.title }}
              </h3>

              <!-- Description -->
              <p class="text-xs text-slate-500 mt-3 leading-relaxed">
                {{ role.description }}
              </p>
            </div>

            <!-- Bottom Select Button -->
            <div class="mt-6 pt-4 border-t border-slate-100">
              <button 
                type="button"
                class="w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                :class="selectedRoleCategory === role.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 group-hover:bg-blue-600 group-hover:text-white'"
              >
                <span>Select Role</span>
                <ArrowRight class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

      </section>

      <!-- ========================================================================= -->
      <!-- 3. SIGN IN FORM (Only Email & Password; System Auto-Recognizes Account) -->
      <!-- ========================================================================= -->
      <section v-else-if="currentStep === 'information_form'" class="flex-1 py-12 px-4 sm:px-6 lg:px-8 max-w-xl mx-auto w-full">
        
        <!-- Header -->
        <div class="text-center max-w-md mx-auto mb-8">
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-800 mb-2">
            <span>Selected Role:</span>
            <span class="font-extrabold text-blue-900">{{ currentRoleInfo.title }}</span>
          </div>
          <h2 class="text-2xl sm:text-3xl font-black text-slate-900">
            Sign In to Start Planning
          </h2>
          <p class="text-xs sm:text-sm text-slate-500 mt-1">
            Accounts are provisioned by the Administrator. Simply enter your email and password — your organization, position, and permissions are automatically recognized.
          </p>
        </div>

        <!-- Sign In Card (Clean Light Design) -->
        <div class="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-6">

          <!-- Live Recognition Feedback Card -->
          <div 
            v-if="recognizedAccount"
            class="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs"
          >
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                {{ recognizedAccount.avatar || recognizedAccount.name.slice(0, 2) }}
              </div>
              <div class="min-w-0">
                <p class="font-extrabold text-emerald-950 truncate">{{ recognizedAccount.name }}</p>
                <p class="text-[11px] text-emerald-800 truncate">
                  {{ formatUserRole(recognizedAccount.role) }} • {{ recognizedAccount.orgName || recognizedAccount.orgId }}
                </p>
              </div>
            </div>
            <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 shrink-0">
              Recognized
            </span>
          </div>

          <!-- Form Fields: Email & Password ONLY -->
          <div class="space-y-4">
            
            <!-- Email Address Input -->
            <div>
              <label class="block text-xs font-bold text-slate-800 mb-1.5">
                Institutional Email Address <span class="text-rose-500">*</span>
              </label>
              <div class="relative">
                <Mail class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  v-model="loginEmail"
                  type="email"
                  placeholder="e.g. kian.estenzo@msunaawan.edu.ph"
                  class="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                />
              </div>
            </div>

            <!-- Password Input -->
            <div>
              <label class="block text-xs font-bold text-slate-800 mb-1.5">
                Password <span class="text-rose-500">*</span>
              </label>
              <div class="relative">
                <Lock class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  v-model="loginPassword"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="Enter your account password"
                  class="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                  @keyup.enter="handleSignInAndStartPlanning"
                />
                <button 
                  type="button" 
                  @click="showPassword = !showPassword"
                  class="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <EyeOff v-if="showPassword" class="w-4 h-4" />
                  <Eye v-else class="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- Error message if any -->
            <div v-if="loginError" class="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle class="w-4 h-4 shrink-0" />
              <span>{{ loginError }}</span>
            </div>

          </div>

          <!-- Bottom Action Buttons -->
          <div class="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              @click="handleBackToRoleSelection"
              class="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft class="w-4 h-4" />
              <span>Back to Role Selection</span>
            </button>

            <button
              type="button"
              @click="handleSignInAndStartPlanning"
              class="w-full sm:w-auto px-7 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 class="w-4 h-4 text-emerald-300" />
              <span>Sign In & Start Planning</span>
              <ArrowRight class="w-4 h-4 text-white" />
            </button>
          </div>

        </div>

      </section>

    </main>

    <!-- Institutional Footer (Clean Light) -->
    <footer class="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
      <div class="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div class="flex items-center gap-2.5">
          <img
            src="/msunlogo.png"
            alt="Mindanao State University at Naawan"
            class="w-6 h-6 object-contain"
          />
          <span class="font-bold text-slate-800">Mindanao State University at Naawan</span>
        </div>
        <p class="text-[11px] text-slate-500">
          9023 Naawan, Misamis Oriental, Philippines
        </p>
      </div>
    </footer>

  </div>
</template>
