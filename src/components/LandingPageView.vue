<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { 
  UserAccount, 
  UserRole, 
  OrgId, 
  OrganizationType,
  formatUserRole
} from '../types';
import { 
  ORGANIZATIONS, 
  getOrgTheme,
  getActiveParentOrganizations
} from '../data/initialData';
import {
  getUserAssignedRoles,
  dedupeAssignedRoles,
  formatRoleLabel,
  SYSTEM_ASSIGNABLE_ROLES
} from '../utils/organizationUtils';
import {
  loginWithCredentials,
  switchSessionRole,
  logoutSession
} from '../services/auth';
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
  IdCard,
  BarChart3,
  FileSpreadsheet,
  AlertCircle,
  Play,
  Pause,
  Volume2,
  VolumeX
} from 'lucide-vue-next';

const props = defineProps<{
  currentUser?: UserAccount | null;
  userAccounts?: UserAccount[];
}>();

const emit = defineEmits<{
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
    description: 'For institutional review and approval authorities (Faculty Advisers, College Deans, OSD, and OVCSAS).'
  },
  {
    id: 'system_admin',
    title: 'System Administrator',
    icon: ShieldCheck,
    iconBg: 'bg-slate-100 text-slate-700',
    description: 'For ICT Center administrators managing system configurations, users, and annual action plan archives.'
  }
];

// Background Video Controls
const heroVideoRef = ref<HTMLVideoElement | null>(null);
const isVideoPlaying = ref(true);
const isVideoMuted = ref(true);
const isVideoLoaded = ref(false);
type VideoOverlayMode = 'standard' | 'vivid' | 'cinematic';
const videoOverlayMode = ref<VideoOverlayMode>('standard');

const handleVideoLoaded = () => {
  isVideoLoaded.value = true;
};

const toggleVideoPlay = () => {
  if (!heroVideoRef.value) return;
  if (heroVideoRef.value.paused) {
    heroVideoRef.value.play().catch(() => {});
    isVideoPlaying.value = true;
  } else {
    heroVideoRef.value.pause();
    isVideoPlaying.value = false;
  }
};

const toggleVideoMute = () => {
  if (!heroVideoRef.value) return;
  heroVideoRef.value.muted = !heroVideoRef.value.muted;
  isVideoMuted.value = heroVideoRef.value.muted;
};


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

// Modal state for Scenario B: Multiple assigned roles
const isSelectRoleModalOpen = ref(false);
const pendingLoginAccount = ref<UserAccount | null>(null);
const pendingAvailableRoles = ref<UserRole[]>([]);
const isSubmittingLogin = ref(false);

const pendingRoles = computed<UserRole[]>(() => {
  if (pendingAvailableRoles.value.length > 0) {
    return dedupeAssignedRoles(pendingAvailableRoles.value);
  }
  return getUserAssignedRoles(pendingLoginAccount.value);
});

const getRoleDescription = (role: string): string => {
  const match = SYSTEM_ASSIGNABLE_ROLES.find(r => r.role === role);
  if (match) return match.description;
  if (role === 'ROLE_ADMIN') return 'Full administrative control over user accounts and system configuration.';
  if (role === 'ROLE_ORGANIZATION') return 'Student leader access for authoring, submitting, and editing organization action plans.';
  return 'Review, endorse, and approve student organization annual action plans.';
};

const handleConfirmRoleSelection = async (chosenRole: UserRole) => {
  if (!pendingLoginAccount.value || isSubmittingLogin.value) return;
  isSubmittingLogin.value = true;
  loginError.value = '';
  try {
    const result = await switchSessionRole(chosenRole);
    if (!result.ok || !result.user) {
      if (pendingLoginAccount.value) {
        const fallbackUser = {
          ...pendingLoginAccount.value,
          role: chosenRole,
          activeRole: chosenRole
        };
        try {
          localStorage.setItem('msun_active_session_user', JSON.stringify(fallbackUser));
        } catch {}
        isSelectRoleModalOpen.value = false;
        pendingLoginAccount.value = null;
        pendingAvailableRoles.value = [];
        loginPassword.value = '';
        emit('continueAsUser', fallbackUser);
        return;
      }
      loginError.value = result.message || 'Unable to activate selected role.';
      isSelectRoleModalOpen.value = false;
      pendingLoginAccount.value = null;
      pendingAvailableRoles.value = [];
      return;
    }
    isSelectRoleModalOpen.value = false;
    pendingLoginAccount.value = null;
    pendingAvailableRoles.value = [];
    loginPassword.value = '';
    emit('continueAsUser', result.user);
  } finally {
    isSubmittingLogin.value = false;
  }
};

const handleCancelRoleSelection = async () => {
  isSelectRoleModalOpen.value = false;
  pendingLoginAccount.value = null;
  pendingAvailableRoles.value = [];
  await logoutSession();
};

const currentYear = new Date().getFullYear();

// Robust scroll manager ensuring proper viewport position across route / step transitions
const scrollToTop = (smooth = true) => {
  const behavior: ScrollBehavior = smooth ? 'smooth' : 'auto';
  const topAnchor = document.getElementById('landing-top');
  if (topAnchor) {
    topAnchor.scrollIntoView({ behavior, block: 'start' });
  }
  window.scrollTo({ top: 0, left: 0, behavior });
  if (document.documentElement) {
    document.documentElement.scrollTo({ top: 0, left: 0, behavior });
    if (!smooth) document.documentElement.scrollTop = 0;
  }
  if (document.body) {
    document.body.scrollTo({ top: 0, left: 0, behavior });
    if (!smooth) document.body.scrollTop = 0;
  }
};

// Step navigation
const handleStartPlanning = () => {
  loginError.value = '';
  loginEmail.value = '';
  loginPassword.value = '';
  const wasNotForm = currentStep.value !== 'information_form';
  currentStep.value = 'information_form';

  // Immediate reset to override any scroll anchoring
  scrollToTop(false);

  // Smooth reset after layout recalculation
  nextTick(() => {
    scrollToTop(true);
    requestAnimationFrame(() => scrollToTop(true));
    if (wasNotForm) {
      setTimeout(() => scrollToTop(true), 80);
    }
  });
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
  scrollToTop(true);
};

const handleScrollToOrganizations = () => {
  loginError.value = '';

  const performScroll = () => {
    const el = document.getElementById('student-organizations');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (currentStep.value !== 'landing') {
    currentStep.value = 'landing';
    nextTick(() => {
      setTimeout(performScroll, 80);
    });
  } else {
    performScroll();
  }
};

const handleBackToLanding = () => {
  loginError.value = '';
  const wasNotLanding = currentStep.value !== 'landing';
  currentStep.value = 'landing';

  // Instant reset first
  scrollToTop(false);

  // Smooth scroll after nextTick when landing DOM is mounted
  nextTick(() => {
    scrollToTop(true);
    requestAnimationFrame(() => scrollToTop(true));
    if (wasNotLanding) {
      setTimeout(() => scrollToTop(true), 80);
    }
  });
};

const handleBackToRoleSelection = () => {
  handleBackToLanding();
};

// Server-side Sign In via /api/auth/login (bcrypt verified; no client fallbacks or auto-onboarding)
const handleSignInAndStartPlanning = async () => {
  if (isSubmittingLogin.value) return;
  loginError.value = '';
  const input = loginEmail.value.trim();

  if (!input) {
    loginError.value = 'Please enter your username or institutional email address.';
    return;
  }
  if (!loginPassword.value) {
    loginError.value = 'Please enter your account password.';
    return;
  }

  isSubmittingLogin.value = true;
  try {
    const result = await loginWithCredentials(input, loginPassword.value);
    if (!result.ok || !result.user) {
      loginError.value = result.message || 'Invalid username/email or password.';
      return;
    }

    if (result.requiresRoleSelection && (result.availableRoles?.length || 0) > 1) {
      pendingLoginAccount.value = result.user;
      pendingAvailableRoles.value = result.availableRoles || [];
      loginPassword.value = '';
      isSelectRoleModalOpen.value = true;
      return;
    }

    loginPassword.value = '';
    emit('continueAsUser', result.user);
  } finally {
    isSubmittingLogin.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900 relative overflow-x-hidden">
    <div id="landing-top" class="absolute top-0 left-0 w-0 h-0 pointer-events-none opacity-0" aria-hidden="true"></div>
    
    <!-- Top University Banner Header (Deep Royal Navy Theme #1b1a69) -->
    <header class="border-b border-[#28277d] bg-[#1b1a69] text-white sticky top-0 z-40 transition-all shadow-md w-full">
      <div class="w-full px-4 sm:px-8 h-16 sm:h-18 flex items-center justify-between gap-4">
        
        <!-- University Brand Lockup (Left aligned) -->
        <div class="flex items-center gap-2.5 sm:gap-3.5 cursor-pointer min-w-0" @click="handleBackToLanding">
          <div class="min-w-0 text-left">
            <div class="flex items-center gap-1.5 sm:gap-2">
              <span class="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-300 truncate">
                <span class="sm:hidden">MSU Naawan</span>
                <span class="hidden sm:inline">Mindanao State University at Naawan</span>
              </span>
            </div>
            <h1 class="text-xs sm:text-base font-extrabold text-white tracking-tight leading-tight truncate">
              <span class="sm:hidden">Action Plan Monitoring & Management System</span>
              <span class="hidden sm:inline">Action Plan Monitoring & Management System</span>
            </h1>
          </div>
        </div>

        <!-- Right: Enter Dashboard if currentUser exists -->
        <div v-if="currentUser" class="flex items-center gap-2 sm:gap-3 shrink-0 ml-1">
          <button 
            @click="handleEnterDashboard"
            class="text-xs font-bold px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95 border border-blue-500/30"
          >
            <span class="hidden sm:inline">Enter Dashboard</span>
            <span class="sm:hidden">Dashboard</span>
            <ArrowRight class="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>
    </header>

    <!-- Stepper Navigation when in Onboarding Flow -->
    <div v-if="currentStep !== 'landing'" class="bg-white border-b border-slate-200 py-2.5 sm:py-3 shadow-2xs">
      <div class="max-w-4xl mx-auto px-3 sm:px-4 flex items-center justify-center text-xs gap-2">
        <div class="flex items-center gap-2 sm:gap-3 font-semibold text-[11px] sm:text-xs">
          <button 
            type="button"
            @click="handleBackToLanding"
            class="text-emerald-700 hover:text-emerald-900 flex items-center gap-1 shrink-0 cursor-pointer font-semibold transition-colors"
            title="Back to Overview"
          >
            <Check class="w-3.5 h-3.5" />
            <span>Overview</span>
          </button>
          <span class="text-slate-300">/</span>

          <div 
            class="flex items-center gap-1.5 transition-colors shrink-0 text-blue-700 font-bold"
          >
            <span 
              class="w-4 h-4 sm:w-5 sm:h-5 rounded-full text-[9px] sm:text-[10px] flex items-center justify-center font-bold bg-blue-600 text-white"
            >2</span>
            <span>Sign In</span>
          </div>
        </div>
      </div>
    </div>

    <!-- MAIN BODY CONTENT -->
    <main class="flex-1 flex flex-col">
      
      <!-- ========================================================================= -->
      <!-- 1. LANDING PAGE -->
      <!-- ========================================================================= -->
      <section v-if="currentStep === 'landing'" class="flex-1 flex flex-col">
        
        <!-- Hero Section with Background Video & Dark Navy Gradient Theme -->
        <div class="relative overflow-hidden pt-16 pb-20 sm:pt-20 sm:pb-28 border-b border-[#28277d] bg-[#1b1a69]">
          
          <!-- Background Video Container -->
          <div class="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0">
            <video
              ref="heroVideoRef"
              autoplay
              loop
              muted
              playsinline
              preload="metadata"
              @loadeddata="handleVideoLoaded"
              class="absolute inset-0 h-full w-full object-cover scale-[1.05] transition-opacity duration-1000"
              :class="isVideoLoaded ? 'opacity-100' : 'opacity-20'"
            >
              <source src="/video/landing-bg.mp4" type="video/mp4" />
            </video>

            <!-- Exact OVCSAS Gradients: Deep Navy & Violet Vignette -->
            <div class="absolute inset-0 bg-gradient-to-b from-[#1b1a69]/85 via-[#1b1a69]/45 to-[#1b1a69]/90"></div>
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,45,113,0.3)_0%,rgba(27,26,105,0.7)_70%,rgba(18,17,70,0.95)_100%)]"></div>
          </div>
          
          <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">

            <!-- Main Heading (Original Title) -->
            <h1 class="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight max-w-4xl mx-auto leading-tight sm:leading-tight">
              Action Plan Monitoring & <br class="hidden sm:block" />
              <span class="bg-gradient-to-r from-blue-300 via-indigo-200 to-sky-300 bg-clip-text text-transparent">
                Management System
              </span>
            </h1>

            <!-- Subtitle (Original Subtitle) -->
            <p class="mt-5 text-base sm:text-lg text-slate-200/90 max-w-2xl mx-auto leading-relaxed font-normal">
              The unified digital platform for recognized student organizations at Mindanao State University at Naawan. Streamline proposal matrix formulation, administrative routing, budget allocation, and accomplishment reporting.
            </p>

            <!-- Prominent CTA Section: ONLY "Start Planning" (Matching Select Role blue button) -->
            <div class="mt-8 flex items-center justify-center">
              <button
                @click="handleStartPlanning"
                class="px-9 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-base shadow-lg shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer ring-4 ring-blue-500/20"
              >
                <span>Start Planning</span>
                <ArrowRight class="w-5 h-5 text-white" />
              </button>
            </div>

            <!-- Key Feature Highlights (Original 3 Cards inside Hero) -->
            <div class="mt-14 pt-10 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
              <div class="p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-lg hover:bg-white/15 transition-all">
                <div class="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-200 flex items-center justify-center mb-3 border border-blue-400/30">
                  <FileSpreadsheet class="w-4 h-4" />
                </div>
                <h4 class="text-xs font-bold text-white">Action Plan Matrix</h4>
                <p class="text-[11px] text-slate-300 mt-1">Official 10-column institutional matrix with line-item budgets.</p>
              </div>

              <div class="p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-lg hover:bg-white/15 transition-all">
                <div class="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-200 flex items-center justify-center mb-3 border border-emerald-400/30">
                  <BarChart3 class="w-4 h-4" />
                </div>
                <h4 class="text-xs font-bold text-white">Budget Tracking</h4>
                <p class="text-[11px] text-slate-300 mt-1">Live allocation, disbursement tracking & liquidation records.</p>
              </div>

              <div class="p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-lg hover:bg-white/15 transition-all">
                <div class="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-200 flex items-center justify-center mb-3 border border-purple-400/30">
                  <CalendarCheck class="w-4 h-4" />
                </div>
                <h4 class="text-xs font-bold text-white">University Schedule</h4>
                <p class="text-[11px] text-slate-300 mt-1">Prevent date overlaps across campus student councils.</p>
              </div>
            </div>

          </div>

          <!-- Video Controls Badge (Floating bottom-right) -->
          <div class="absolute bottom-3 right-3 sm:bottom-5 sm:right-6 z-20 flex items-center gap-1.5 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm text-xs bg-slate-900/80 border border-slate-700/80 text-slate-200">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span class="text-[10px] font-bold uppercase tracking-wider hidden sm:inline text-slate-300">Campus Video</span>
            
            <button
              @click="toggleVideoPlay"
              class="p-1 rounded-full hover:bg-slate-800 text-slate-200 transition-colors cursor-pointer"
              :title="isVideoPlaying ? 'Pause video' : 'Play video'"
            >
              <Pause v-if="isVideoPlaying" class="w-3.5 h-3.5" />
              <Play v-else class="w-3.5 h-3.5" />
            </button>

            <button
              @click="toggleVideoMute"
              class="p-1 rounded-full hover:bg-slate-800 text-slate-200 transition-colors cursor-pointer"
              :title="isVideoMuted ? 'Unmute video' : 'Mute video'"
            >
              <VolumeX v-if="isVideoMuted" class="w-3.5 h-3.5 opacity-60" />
              <Volume2 v-else class="w-3.5 h-3.5 text-blue-400" />
            </button>
          </div>

        </div>

        <!-- Recognized Student Organizations Section (Original Clean Light Design) -->
        <section id="student-organizations" class="py-14 bg-white border-b border-slate-200 scroll-mt-20">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
              <div>
                <span class="text-xs font-black uppercase tracking-wider text-blue-900">Mindanao State University at Naawan</span>
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
                v-for="org in getActiveParentOrganizations()" 
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
      <section v-else-if="currentStep === 'role_selection'" class="flex-1 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        
        <!-- Back Button (Yellow Box in Screenshot) -->
        <div class="mb-4 sm:mb-6">
          <button
            type="button"
            id="back-to-overview-btn"
            @click="handleBackToLanding"
            class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-950 bg-white hover:bg-slate-100 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
            title="Back to Overview"
          >
            <ArrowLeft class="w-4 h-4 text-slate-500 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back</span>
          </button>
        </div>

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
      <!-- 2. SIGN IN FORM (Automatic Role Detection on Login)                      -->
      <!-- ========================================================================= -->
      <section v-else-if="currentStep === 'information_form'" class="flex-1 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-xl mx-auto w-full">
        
        <!-- Back Button to Overview -->
        <div class="mb-4 sm:mb-6">
          <button
            type="button"
            id="back-to-landing-btn"
            @click="handleBackToLanding"
            class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-950 bg-white hover:bg-slate-100 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
            title="Back to Overview"
          >
            <ArrowLeft class="w-4 h-4 text-slate-500 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Overview</span>
          </button>
        </div>

        <!-- Header -->
        <div class="text-center max-w-md mx-auto mb-8">
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-800 mb-2">
            <ShieldCheck class="w-3.5 h-3.5 text-blue-700" />
            <span>Automatic Role Detection</span>
          </div>
          <h2 class="text-2xl sm:text-3xl font-black text-slate-900">
            Sign In to APMMS
          </h2>
          <p class="text-xs sm:text-sm text-slate-500 mt-1">
            Enter your ID number or username and password. The system will automatically detect your assigned role and open your dashboard.
          </p>
        </div>

        <!-- Sign In Card (Clean Light Design) -->
        <div class="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 space-y-6">

          <!-- Form Fields: ID Number / Username & Password -->
          <div class="space-y-4">
            
            <!-- ID Number or Username Input -->
            <div>
              <label class="block text-xs font-bold text-slate-800 mb-1.5">
                ID Number or Username <span class="text-rose-500">*</span>
              </label>
              <div class="relative">
                <IdCard class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  v-model="loginEmail"
                  type="text"
                  placeholder="e.g. 102XXXX or username123"
                  class="w-full pl-10 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-mono font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                />
              </div>
              <p class="text-[10px] text-slate-400 mt-1">Enter your assigned ID number or username to sign in.</p>
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
              @click="handleBackToLanding"
              class="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft class="w-4 h-4" />
              <span>Back to Overview</span>
            </button>

            <button
              type="button"
              :disabled="isSubmittingLogin"
              @click="handleSignInAndStartPlanning"
              class="w-full sm:w-auto px-7 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-extrabold text-xs shadow-md shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 class="w-4 h-4 text-emerald-300" />
              <span>{{ isSubmittingLogin ? 'Verifying...' : 'Sign In & Continue' }}</span>
              <ArrowRight class="w-4 h-4 text-white" />
            </button>
          </div>

        </div>

      </section>

    </main>

    <!-- Institutional Footer (MSUN Navy-Blue, White, and Gold Brand System) -->
    <footer v-if="currentStep === 'landing'" class="border-t border-[#28277d] bg-[#1b1a69] text-white w-full shrink-0">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
        <!-- Two-column main layout on desktop, stacked on mobile -->
        <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 sm:gap-8">
          
          <!-- Section 1: University and System Information (Left Column) -->
          <div class="max-w-xl space-y-1 text-left">
            <span class="text-[11px] font-black uppercase tracking-wider text-amber-300 block leading-tight">
              MINDANAO STATE UNIVERSITY AT NAAWAN
            </span>
            <h3 class="text-sm sm:text-[15px] font-extrabold text-white tracking-tight leading-snug">
              Action Plan Monitoring &amp; Management System
            </h3>
            <p class="text-[11px] sm:text-xs text-slate-300/90 leading-relaxed max-w-lg mt-0.5">
              A centralized platform designed to streamline the submission, approval, monitoring, and management of student organization action plans.
            </p>
          </div>

          <!-- Section 2: Quick Links (Right Column) -->
          <div class="sm:text-right shrink-0">
            <h4 class="text-[11px] font-bold uppercase tracking-wider text-amber-300 mb-1.5 sm:text-right">
              Quick Links
            </h4>
            <ul class="space-y-1 text-xs font-medium text-slate-300 flex flex-col sm:items-end">
              <li>
                <button
                  type="button"
                  @click="handleBackToLanding"
                  class="hover:text-amber-300 transition-colors duration-150 cursor-pointer text-left sm:text-right inline-block py-0.5"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  type="button"
                  @click="handleScrollToOrganizations"
                  class="hover:text-amber-300 transition-colors duration-150 cursor-pointer text-left sm:text-right inline-block py-0.5"
                >
                  Student Organizations
                </button>
              </li>
              <li>
                <button
                  type="button"
                  @click="handleStartPlanning"
                  class="hover:text-amber-300 transition-colors duration-150 cursor-pointer text-left sm:text-right inline-block py-0.5"
                >
                  Sign In
                </button>
              </li>
            </ul>
          </div>

        </div>

        <!-- Section 3: Copyright and Location (Subtle Horizontal Divider) -->
        <div class="mt-3.5 pt-2.5 border-t border-[#28277d]/70 flex flex-col sm:flex-row items-center justify-between gap-1.5 text-[11px] text-slate-400">
          <p class="text-center sm:text-left">
            &copy; {{ currentYear }} Mindanao State University at Naawan. All rights reserved.
          </p>
          <p class="text-center sm:text-right">
            Naawan, Misamis Oriental, Philippines
          </p>
        </div>

      </div>
    </footer>

    <!-- ========================================================================= -->
    <!-- MULTIPLE ROLE SELECTION MODAL (Scenario B: User has >=2 assigned roles)  -->
    <!-- ========================================================================= -->
    <div
      v-if="isSelectRoleModalOpen && pendingLoginAccount"
      class="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      @click.self="handleCancelRoleSelection"
    >
      <div class="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        <!-- University Brand Header -->
        <div class="bg-[#1b1a69] px-6 py-5 text-white flex items-center justify-between border-b border-[#28277d]">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center ring-1 ring-white/20">
              <ShieldCheck class="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 class="text-base font-black tracking-tight leading-none text-white">Select Your Role</h3>
              <p class="text-xs text-blue-200/90 font-medium mt-1">MSUN Action Plan Monitoring System</p>
            </div>
          </div>
          <button
            type="button"
            @click="handleCancelRoleSelection"
            class="text-blue-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer text-xs font-bold"
            title="Cancel"
          >
            ✕
          </button>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-5">
          <!-- User Summary Chip -->
          <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-[#1b1a69] text-white font-bold flex items-center justify-center shrink-0 text-sm">
              {{ pendingLoginAccount.avatar || pendingLoginAccount.name.slice(0, 2) }}
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <p class="font-black text-slate-900 text-sm truncate">{{ pendingLoginAccount.name }}</p>
                <span v-if="pendingLoginAccount.username" class="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                  @{{ pendingLoginAccount.username }}
                </span>
              </div>
              <p class="text-xs text-slate-500 truncate">{{ pendingLoginAccount.email }}</p>
            </div>
          </div>

          <!-- Prompt description -->
          <div>
            <p class="text-xs font-extrabold text-slate-800">
              Multiple roles detected. Which role would you like to use for this session?
            </p>
            <p class="text-[11px] text-slate-500 mt-0.5">
              You can easily switch between your assigned roles at any time from your profile menu.
            </p>
          </div>

          <!-- Role Cards List (Only assigned roles) -->
          <div class="space-y-2.5 max-h-[320px] overflow-y-auto pr-0.5">
            <button
              v-for="role in pendingRoles"
              :key="role"
              type="button"
              @click="handleConfirmRoleSelection(role)"
              class="w-full text-left p-4 rounded-2xl border border-slate-200 bg-white hover:bg-blue-50/70 hover:border-blue-400 hover:shadow-md transition-all group cursor-pointer flex items-center justify-between gap-3"
            >
              <div class="flex items-start gap-3.5 min-w-0">
                <div class="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <ShieldCheck class="w-5 h-5" />
                </div>
                <div class="min-w-0">
                  <h4 class="font-extrabold text-slate-900 group-hover:text-blue-900 text-sm tracking-tight">
                    {{ formatRoleLabel(role) }}
                  </h4>
                  <p class="text-[11px] text-slate-500 group-hover:text-slate-600 leading-snug mt-0.5">
                    {{ getRoleDescription(role) }}
                  </p>
                </div>
              </div>
              <div class="shrink-0 flex items-center text-blue-600 group-hover:translate-x-1 transition-transform">
                <ArrowRight class="w-5 h-5" />
              </div>
            </button>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            @click="handleCancelRoleSelection"
            class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer"
          >
            Back to Sign In
          </button>
          <span class="text-[11px] text-slate-400 font-medium">
            {{ pendingRoles.length }} Assigned Roles Available
          </span>
        </div>
      </div>
    </div>

  </div>
</template>
