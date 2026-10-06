<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Activity, OrgId } from '../types';
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
  Info
} from 'lucide-vue-next';
import { ORGANIZATIONS } from '../data/initialData';

const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    defaultOrgId?: OrgId | 'ALL';
    defaultFiscalYear?: string;
  }>(),
  {
    defaultOrgId: 'CBIT',
    defaultFiscalYear: 'Fiscal Year 2027'
  }
);

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'addActivity', activity: Activity): void;
}>();

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

// Sync office and defaults when defaultOrgId changes
watch(
  () => props.defaultOrgId,
  (newOrg) => {
    if (newOrg && newOrg !== 'ALL') {
      office.value = newOrg;
      fundSource.value = `${newOrg}-SEC Fund`;
      personAssigned.value = `${newOrg}-SEC Officers`;
    }
  }
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
  const validOrgId: OrgId = (ORGANIZATIONS.some(o => o.id === validOffice) ? validOffice : 'CBIT') as OrgId;
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
    status: 'Approved',
    approvalStage: 'Approved',
    submittedDate: new Date().toISOString().split('T')[0],
    description: strategicObjectives.value.trim(),
    proposedBy: personAssigned.value.trim(),
    kpiOutcome: expectedOutput.value.trim(),
    venue: `${validOffice} Session Hall / Multi-Purpose Center`,
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
              OVCSAS | OSD | OSA Template
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
          <select
            v-model="fiscalYear"
            class="px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="Fiscal Year 2027">Fiscal Year 2027 (Official Target)</option>
            <option value="Fiscal Year 2026">Fiscal Year 2026</option>
            <option value="Fiscal Year 2025">Fiscal Year 2025</option>
          </select>
        </div>

        <!-- 1. Timeframe & 5. Office -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <!-- 1. Timeframe -->
          <div>
            <label class="font-bold text-slate-800 block mb-1 flex items-center justify-between">
              <span>1. Timeframe <span class="text-rose-500">*</span></span>
              <span class="text-[10px] text-slate-400 font-normal">e.g., Anytime in January</span>
            </label>
            <input
              type="text"
              required
              v-model="timeframe"
              placeholder="e.g., Anytime in January / 1st Semester / February 15-20"
              class="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <!-- 5. Office -->
          <div>
            <label class="font-bold text-slate-800 block mb-1 flex items-center justify-between">
              <span>5. Office <span class="text-rose-500">*</span></span>
              <span class="text-[10px] text-slate-400 font-normal">Council / College Acronym</span>
            </label>
            <div class="relative">
              <select
                v-model="office"
                @change="onOfficeChange"
                class="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option v-for="org in ORGANIZATIONS" :key="org.id" :value="org.id">
                  {{ org.acronym }} - {{ org.name }}
                </option>
              </select>
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
              <span>9. Fund Source <span class="text-rose-500">*</span></span>
              <span class="text-[10px] text-slate-400 font-normal">e.g., CBIT-SEC Fund</span>
            </label>
            <input
              type="text"
              required
              v-model="fundSource"
              placeholder="e.g., CBIT-SEC Fund / Institutional Trust"
              class="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <!-- 10. Person Assigned -->
          <div>
            <label class="font-bold text-slate-800 block mb-1 flex items-center justify-between">
              <span>10. Person Assigned <span class="text-rose-500">*</span></span>
              <span class="text-[10px] text-slate-400 font-normal">Officers / Committee</span>
            </label>
            <input
              type="text"
              required
              v-model="personAssigned"
              placeholder="e.g., CBIT-SEC Officers / Society Officers"
              class="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div class="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Info class="w-3.5 h-3.5 text-blue-500" />
            <span>All 10 columns map directly to the official OVCSAS | OSD | OSA Action Plan table.</span>
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
