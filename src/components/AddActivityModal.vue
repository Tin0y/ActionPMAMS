<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Activity, OrgId, UserAccount } from '../types';
import { 
  X, 
  CheckCircle2, 
  Building2, 
  Calendar, 
  DollarSign, 
  UserCheck, 
  FileText, 
  Target, 
  Sparkles,
  Info,
  AlertTriangle,
  AlertCircle
} from 'lucide-vue-next';
import { ORGANIZATIONS, getActiveParentOrganizations, isCollegeOrg, getInitialTimelineForActionPlan } from '../data/initialData';
import { getOptionLabelsByCategory, getOptionsByCategory } from '../services/optionsService';
import QuickAddOptionButton from './QuickAddOptionButton.vue';
import { detectActionPlanConflicts, ConflictItem } from '../utils/conflictDetection';

const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    defaultOrgId?: OrgId | 'ALL';
    defaultFiscalYear?: string;
    currentUser?: UserAccount | null;
    allActivities?: Activity[];
  }>(),
  {
    defaultOrgId: 'CBIT',
    defaultFiscalYear: 'Fiscal Year 2027',
    allActivities: () => []
  }
);

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'addActivity', activity: Activity): void;
}>();

// Database-driven dynamic dropdown choices
const dynamicFiscalYears = getOptionLabelsByCategory('fiscal_year');
const dynamicTimeframes = getOptionLabelsByCategory('timeframe');
const dynamicOffices = getOptionsByCategory('office');
const dynamicFundSources = getOptionLabelsByCategory('fund_source');
const dynamicPersons = getOptionLabelsByCategory('person_assigned');
const dynamicVenues = getOptionLabelsByCategory('venue');

// Form Fields matching user request:
// 1. Timeframe
// 2. Programs and Activities
// 3. Strategic Objectives
// 4. Expected Output
// 5. Office
// 6. Line Item Budget
// 7. Amount
// 8. Total Budget
// 9. Fund Source
// 10. Person Assigned
// Proposed Venue for Conflict & Availability Detection

const timeframe = ref('Anytime in January');
const programActivity = ref('');
const strategicObjectives = ref('');
const expectedOutput = ref('');
const office = ref<string>(props.defaultOrgId === 'ALL' ? 'CBIT' : props.defaultOrgId);
const lineItemBudget = ref('Design, materials, water, and faculty snacks.');
const amount = ref<number | ''>(1500);
const totalBudget = ref<number | ''>(1500);
const fundSource = ref('CBIT-SEC Fund');
const personAssigned = ref('CBIT-SEC Officers');
const fiscalYear = ref<string>(props.defaultFiscalYear || 'Fiscal Year 2027');
const venue = ref<string>('MSUN Gymnasium');

// Reactive Action Plan Conflict & Redundancy Detection (Section 2 & 3)
const detectedConflicts = computed<ConflictItem[]>(() => {
  if (!programActivity.value || programActivity.value.trim().length < 3) return [];
  return detectActionPlanConflicts(
    {
      title: programActivity.value.trim(),
      programActivity: programActivity.value.trim(),
      strategicObjectives: strategicObjectives.value.trim(),
      timeframe: timeframe.value.trim(),
      venue: venue.value.trim(),
      orgId: office.value.trim(),
      fiscalYear: fiscalYear.value
    },
    props.allActivities || []
  );
});

const potentialVenueConflicts = computed(() => {
  return detectedConflicts.value.filter(c => c.type === 'potential_conflict' || c.type === 'confirmed_conflict');
});

const similarActivityAlerts = computed(() => {
  return detectedConflicts.value.filter(c => c.type === 'similar_activity');
});

const isOrgUser = computed(() => {
  const role = props.currentUser?.activeRole || props.currentUser?.role;
  return role === 'ROLE_ORGANIZATION';
});

// Sync office and defaults when defaultOrgId changes
watch(
  [() => props.defaultOrgId, isOrgUser],
  ([newOrg, isOrg]) => {
    if (isOrg && props.currentUser?.orgId) {
      office.value = props.currentUser.orgId;
      fundSource.value = `${props.currentUser.orgId}-SEC Fund`;
      personAssigned.value = `${props.currentUser.orgId}-SEC Officers`;
    } else if (newOrg && newOrg !== 'ALL') {
      office.value = newOrg;
      fundSource.value = `${newOrg}-SEC Fund`;
      personAssigned.value = `${newOrg}-SEC Officers`;
    }
  },
  { immediate: true }
);

// When office changes, optionally suggest default fund source & person assigned if empty or default
const onOfficeChange = () => {
  const currentOffice = office.value;
  if (!fundSource.value || fundSource.value.endsWith('-SEC Fund')) {
    fundSource.value = `${currentOffice}-SEC Fund`;
  }
  if (!personAssigned.value || personAssigned.value.endsWith('-SEC Officers')) {
    personAssigned.value = `${currentOffice}-SEC Officers`;
  }
};

// When amount changes, keep total budget synced if desired
const onAmountInput = () => {
  if (amount.value !== '' && (totalBudget.value === '' || totalBudget.value === 0 || totalBudget.value === amount.value)) {
    totalBudget.value = amount.value;
  }
};

// Quick template examples for convenience
const applyExampleTemplate = () => {
  timeframe.value = 'Anytime in January';
  programActivity.value = `2nd Semester: ${office.value} General Assembly`;
  strategicObjectives.value = "It gives students the opportunity to voice their concerns and ask questions following the officers' discussion.";
  expectedOutput.value = "It is expected for the member of the college to actively participate in the event so that they will be informed and to address their concerns.";
  lineItemBudget.value = 'Design, materials, water, and faculty snacks.';
  amount.value = 1500;
  totalBudget.value = 1500;
  fundSource.value = `${office.value}-SEC Fund`;
  personAssigned.value = `${office.value}-SEC Officers`;
};

// Form validation
const isFormValid = computed(() => {
  return (
    timeframe.value.trim().length > 0 &&
    programActivity.value.trim().length >= 3 &&
    strategicObjectives.value.trim().length >= 5 &&
    expectedOutput.value.trim().length >= 5 &&
    office.value.trim().length > 0 &&
    lineItemBudget.value.trim().length > 0 &&
    typeof amount.value === 'number' && amount.value > 0 &&
    typeof totalBudget.value === 'number' && totalBudget.value > 0 &&
    fundSource.value.trim().length > 0 &&
    personAssigned.value.trim().length > 0
  );
});

const handleSubmit = () => {
  if (!isFormValid.value) return;

  const validOffice = office.value.trim();
  const activeOrgs = getActiveParentOrganizations();
  const validOrgId: OrgId = (activeOrgs.some(o => o.id === validOffice) ? validOffice : (activeOrgs[0]?.id || 'CBIT')) as OrgId;
  const fyNumber = fiscalYear.value.replace(/\D/g, '') || '2027';
  const numAmount = typeof amount.value === 'number' ? amount.value : 1500;
  const numTotalBudget = typeof totalBudget.value === 'number' ? totalBudget.value : numAmount;

  const newActivity: Activity = {
    id: `ACT-${fyNumber}-${validOrgId}-${Math.floor(100 + Math.random() * 900)}`,
    title: programActivity.value.trim(),
    programActivity: programActivity.value.trim(),
    timeframe: timeframe.value.trim(),
    strategicObjectives: strategicObjectives.value.trim(),
    expectedOutput: expectedOutput.value.trim(),
    office: validOffice,
    orgId: validOrgId,
    lineItemBudget: lineItemBudget.value.trim(),
    amount: numAmount,
    totalBudget: numTotalBudget,
    budget: numTotalBudget,
    fundSource: fundSource.value.trim(),
    personAssigned: personAssigned.value.trim(),
    fiscalYear: fiscalYear.value,
    status: 'Draft',
    workflowStatus: 'DRAFT',
    approvalStatus: 'Draft',
    approvalStageIndex: 1,
    approvalStage: isCollegeOrg(validOrgId)
      ? 'Stage 1: College Organization Submission'
      : 'Stage 1: Organization Submission',
    isActionPlanItem: true,
    source: 'ACTION_PLAN',
    timeline: getInitialTimelineForActionPlan(validOrgId),
    submittedDate: new Date().toISOString().split('T')[0],
    description: strategicObjectives.value.trim(),
    proposedBy: personAssigned.value.trim(),
    kpiOutcome: expectedOutput.value.trim(),
    venue: venue.value.trim() || `${validOffice} Session Hall / Multi-Purpose Center`,
    targetParticipants: 150
  };

  emit('addActivity', newActivity);

  // Reset form
  programActivity.value = '';
  strategicObjectives.value = '';
  expectedOutput.value = '';
  emit('close');
};
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
  >
    <div class="bg-white rounded-2xl max-w-3xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 my-6 animate-in fade-in zoom-in-95 duration-200">
      
      <!-- Modal Header -->
      <div class="flex items-start justify-between pb-4 border-b border-slate-100">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="text-[11px] font-black bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-md border border-blue-200">
              Institutional Action Plan Format
            </span>
            <span class="text-xs font-bold text-slate-500">
              OVCSAS | OSD Template
            </span>
          </div>
          <h3 class="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            Add Action Plan Activity
          </h3>
          <p class="text-xs text-slate-500 mt-0.5">
            Complete the 10 official fields for the institutional Action Plan matrix.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="applyExampleTemplate"
            class="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors cursor-pointer"
            title="Auto-fill sample template values matching the official format"
          >
            <Sparkles class="w-3.5 h-3.5" />
            <span>Load Sample</span>
          </button>

          <button
            @click="emit('close')"
            class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Form with the 10 Exact Requested Fields -->
      <form @submit.prevent="handleSubmit" class="mt-4 space-y-4 text-xs">

        <!-- Fiscal Year Context Row -->
        <div class="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
          <div class="flex items-center gap-2">
            <Calendar class="w-4 h-4 text-blue-600" />
            <span class="font-bold text-slate-700">Target Fiscal Year:</span>
          </div>
          <div class="flex items-center gap-1.5">
            <input
              type="text"
              list="addModalFiscalYearList"
              v-model="fiscalYear"
              placeholder="e.g., Fiscal Year 2027"
              class="px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <QuickAddOptionButton
              category="fiscal_year"
              category-name="Fiscal Year"
              :current-user="currentUser"
              @created="(opt) => fiscalYear = opt.label"
              size="sm"
            />
          </div>
          <datalist id="addModalFiscalYearList">
            <option v-for="fy in dynamicFiscalYears" :key="fy" :value="fy">{{ fy }}</option>
          </datalist>
        </div>

        <!-- 1. Timeframe & 5. Office -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <!-- 1. Timeframe -->
          <div>
            <label class="font-bold text-slate-800 block mb-1 flex items-center justify-between">
              <span class="flex items-center gap-1.5">
                <span>1. Timeframe <span class="text-rose-500">*</span></span>
                <QuickAddOptionButton
                  category="timeframe"
                  category-name="Timeframe Month"
                  :current-user="currentUser"
                  @created="(opt) => timeframe = opt.label"
                  size="sm"
                />
              </span>
              <span class="text-[10px] text-slate-400 font-normal">e.g., Anytime in January</span>
            </label>
            <input
              type="text"
              list="addActivityTimeframeList"
              required
              v-model="timeframe"
              placeholder="e.g., Anytime in January / 1st Semester / February 15-20"
              class="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <datalist id="addActivityTimeframeList">
              <option v-for="tf in dynamicTimeframes" :key="tf" :value="tf">{{ tf }}</option>
            </datalist>
          </div>

          <!-- 5. Office -->
          <div>
            <label class="font-bold text-slate-800 block mb-1 flex items-center justify-between">
              <span class="flex items-center gap-1.5">
                <span>5. Office <span class="text-rose-500">*</span></span>
                <QuickAddOptionButton
                  category="office"
                  category-name="Office / Council"
                  :current-user="currentUser"
                  @created="(opt) => office = opt.value || opt.label"
                  size="sm"
                />
              </span>
              <span class="text-[10px] text-slate-400 font-normal">Council / College Acronym</span>
            </label>
            <div class="relative">
              <input
                type="text"
                list="addActivityOfficeList"
                required
                v-model="office"
                @input="onOfficeChange"
                :readonly="isOrgUser"
                placeholder="e.g., CBIT / SSC / CELS"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                :class="{ 'bg-slate-100 cursor-not-allowed text-slate-600': isOrgUser }"
              />
              <datalist id="addActivityOfficeList">
                <option v-for="org in getActiveParentOrganizations()" :key="org.id" :value="org.id">
                  {{ org.acronym }} - {{ org.name }}
                </option>
                <option v-for="dyn in dynamicOffices" :key="dyn.id" :value="dyn.value">
                  {{ dyn.label }}
                </option>
              </datalist>
            </div>
          </div>
        </div>

        <!-- 2. Programs and Activities -->
        <div>
          <label class="font-bold text-slate-800 block mb-1 flex items-center justify-between">
            <span>2. Programs and Activities <span class="text-rose-500">*</span></span>
            <span class="text-[10px] text-slate-400 font-normal">Official Event or Project Title</span>
          </label>
          <input
            type="text"
            required
            v-model="programActivity"
            placeholder="e.g., 2nd Semester: CBIT General Assembly"
            class="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <!-- 3. Strategic Objectives -->
        <div>
          <label class="font-bold text-slate-800 block mb-1 flex items-center justify-between">
            <span>3. Strategic Objectives <span class="text-rose-500">*</span></span>
            <span class="text-[10px] text-slate-400 font-normal">Purpose, strategic direction & goals</span>
          </label>
          <textarea
            rows="2"
            required
            v-model="strategicObjectives"
            placeholder="e.g., It gives students the opportunity to voice their concerns and ask questions following the officers' discussion."
            class="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500"
          ></textarea>
        </div>

        <!-- 4. Expected Output -->
        <div>
          <label class="font-bold text-slate-800 block mb-1 flex items-center justify-between">
            <span>4. Expected Output <span class="text-rose-500">*</span></span>
            <span class="text-[10px] text-slate-400 font-normal">Anticipated deliverables, participation & impact</span>
          </label>
          <textarea
            rows="2"
            required
            v-model="expectedOutput"
            placeholder="e.g., It is expected for the member of the college to actively participate in the event so that they will be informed and to address their concerns."
            class="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500"
          ></textarea>
        </div>

        <!-- 6. Line Item Budget -->
        <div>
          <label class="font-bold text-slate-800 block mb-1 flex items-center justify-between">
            <span>6. Line Item Budget <span class="text-rose-500">*</span></span>
            <span class="text-[10px] text-slate-400 font-normal">Itemized expenditures & supplies</span>
          </label>
          <input
            type="text"
            required
            v-model="lineItemBudget"
            placeholder="e.g., Design, materials, water, and faculty snacks."
            class="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <!-- 7. Amount & 8. Total Budget -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <!-- 7. Amount -->
          <div>
            <label class="font-bold text-slate-800 block mb-1 flex items-center justify-between">
              <span>7. Amount (₱) <span class="text-rose-500">*</span></span>
              <span class="text-[10px] text-slate-400 font-normal">Per-item breakdown</span>
            </label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₱</span>
              <input
                type="number"
                min="0"
                step="50"
                required
                v-model="amount"
                @input="onAmountInput"
                placeholder="1500"
                class="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <!-- 8. Total Budget -->
          <div>
            <label class="font-bold text-slate-800 block mb-1 flex items-center justify-between">
              <span>8. Total Budget (₱) <span class="text-rose-500">*</span></span>
              <span class="text-[10px] text-slate-400 font-normal">Total allocated funding</span>
            </label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₱</span>
              <input
                type="number"
                min="0"
                step="50"
                required
                v-model="totalBudget"
                placeholder="1500"
                class="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <!-- 9. Fund Source & 10. Person Assigned -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <!-- 9. Fund Source -->
          <div>
            <label class="font-bold text-slate-800 block mb-1 flex items-center justify-between">
              <span class="flex items-center gap-1.5">
                <span>9. Fund Source <span class="text-rose-500">*</span></span>
                <QuickAddOptionButton
                  category="fund_source"
                  category-name="Fund Source"
                  :current-user="currentUser"
                  @created="(opt) => fundSource = opt.label"
                  size="sm"
                />
              </span>
              <span class="text-[10px] text-slate-400 font-normal">e.g., CBIT-SEC Fund</span>
            </label>
            <input
              type="text"
              list="addActivityFundSourceList"
              required
              v-model="fundSource"
              placeholder="e.g., CBIT-SEC Fund / Institutional Trust"
              class="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <datalist id="addActivityFundSourceList">
              <option v-for="fs in dynamicFundSources" :key="fs" :value="fs">{{ fs }}</option>
            </datalist>
          </div>

          <!-- 10. Person Assigned -->
          <div>
            <label class="font-bold text-slate-800 block mb-1 flex items-center justify-between">
              <span class="flex items-center gap-1.5">
                <span>10. Person Assigned <span class="text-rose-500">*</span></span>
                <QuickAddOptionButton
                  category="person_assigned"
                  category-name="Person Assigned"
                  :current-user="currentUser"
                  @created="(opt) => personAssigned = opt.label"
                  size="sm"
                />
              </span>
              <span class="text-[10px] text-slate-400 font-normal">Officers / Committee</span>
            </label>
            <input
              type="text"
              list="addActivityPersonList"
              required
              v-model="personAssigned"
              placeholder="e.g., CBIT-SEC Officers / Society Officers"
              class="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <datalist id="addActivityPersonList">
              <option :value="`${office}-SEC Officers`"></option>
              <option v-for="pa in dynamicPersons" :key="pa" :value="pa">{{ pa }}</option>
            </datalist>
          </div>
        </div>

        <!-- Proposed Venue Selection -->
        <div class="bg-slate-50/70 p-3 rounded-xl border border-slate-200">
          <label class="font-bold text-slate-800 block mb-1 flex items-center justify-between">
            <span class="flex items-center gap-1.5">
              <Building2 class="w-3.5 h-3.5 text-blue-600" />
              <span>Proposed Venue (for Schedule & Availability Coordination)</span>
              <QuickAddOptionButton
                category="venue"
                category-name="Venue"
                :current-user="currentUser"
                @created="(opt) => venue = opt.label"
                size="sm"
              />
            </span>
            <span class="text-[10px] text-slate-400 font-normal">Action Plan tentative location</span>
          </label>
          <input
            type="text"
            list="addActivityVenueList"
            v-model="venue"
            placeholder="e.g., MSUN Gymnasium / CBIT Amphitheater"
            class="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <datalist id="addActivityVenueList">
            <option v-for="ven in dynamicVenues" :key="ven" :value="ven">{{ ven }}</option>
          </datalist>
        </div>

        <!-- ==================== REAL-TIME CONFLICT ALERTS (Section 2 & 3) ==================== -->
        <!-- 1. Potential Venue Conflict (Section 2 - Yellow Warning) -->
        <div 
          v-if="potentialVenueConflicts.length > 0"
          class="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs space-y-2 animate-in fade-in duration-200"
        >
          <div class="flex items-center gap-2 text-amber-900 font-black">
            <AlertTriangle class="w-4 h-4 text-amber-600 shrink-0" />
            <span>⚠️ Potential Venue Conflict Detected</span>
          </div>

          <div 
            v-for="c in potentialVenueConflicts" 
            :key="c.id"
            class="bg-white/80 p-2.5 rounded-lg border border-amber-200 text-amber-950 space-y-1"
          >
            <p class="font-bold">
              {{ c.conflictingOrgId }} has proposed an activity at your selected venue during an overlapping schedule:
            </p>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] pt-1 border-t border-amber-100">
              <div>
                <span class="text-slate-500 block">Activity:</span>
                <span class="font-bold text-slate-900 truncate block">{{ c.conflictingActivityTitle }}</span>
              </div>
              <div>
                <span class="text-slate-500 block">Schedule:</span>
                <span class="font-bold text-slate-900 block">{{ c.conflictingDate }}</span>
              </div>
              <div>
                <span class="text-slate-500 block">Venue:</span>
                <span class="font-bold text-slate-900 truncate block">{{ c.conflictingVenue }}</span>
              </div>
              <div>
                <span class="text-slate-500 block">Status:</span>
                <span class="font-bold text-blue-700 block">{{ c.conflictingStatus }}</span>
              </div>
            </div>
          </div>

          <p class="text-[10px] text-amber-700 italic">
            * An Action Plan proposal alone does not establish a venue reservation. Review the conflict and consider another date or venue before filing the DAD form.
          </p>
        </div>

        <!-- 2. Similar Activity Detected (Section 3 - Blue Info) -->
        <div 
          v-if="similarActivityAlerts.length > 0"
          class="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs space-y-2 animate-in fade-in duration-200"
        >
          <div class="flex items-center gap-2 text-blue-900 font-black">
            <Info class="w-4 h-4 text-blue-600 shrink-0" />
            <span>ℹ️ Similar Activity Detected</span>
          </div>

          <div 
            v-for="s in similarActivityAlerts" 
            :key="s.id"
            class="bg-white/80 p-2.5 rounded-lg border border-blue-100 text-blue-950 space-y-1"
          >
            <p class="font-semibold text-blue-900">
              <strong>{{ s.conflictingOrgId }}</strong> has proposed a similar activity ("<em>{{ s.conflictingActivityTitle }}</em>") for the same period.
            </p>
            <p class="text-[11px] text-blue-700">
              Consider coordinating with {{ s.conflictingOrgId }} or conducting a joint campus initiative.
            </p>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div class="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Info class="w-3.5 h-3.5 text-blue-500" />
            <span>All 10 columns map directly to the official OVCSAS | OSD Action Plan table.</span>
          </div>

          <div class="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              @click="emit('close')"
              class="btn-secondary"
            >
              Cancel
            </button>

            <button
              type="submit"
              :disabled="!isFormValid"
              class="btn-primary"
              :title="!isFormValid ? 'Please fill in all 10 required fields' : 'Save and register activity into Action Plan'"
            >
              <CheckCircle2 class="w-4 h-4" />
              <span>Add to Action Plan</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>
