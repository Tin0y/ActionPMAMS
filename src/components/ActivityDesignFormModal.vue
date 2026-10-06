<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { 
  ActivityDesignForm, 
  Activity, 
  ScheduleItem, 
  ParticipantItem, 
  BudgetItem, 
  VenueRequirementItem, 
  FacilityRequirementItem 
} from '../types';
import { 
  X, 
  FileText, 
  CheckCircle2, 
  Send, 
  Plus, 
  Trash2, 
  ChevronRight, 
  ChevronLeft, 
  Building2, 
  DollarSign, 
  Target, 
  UploadCloud, 
  Info, 
  Calendar, 
  Users, 
  CheckSquare, 
  AlertCircle,
  Minimize2,
  Maximize2,
  Check
} from 'lucide-vue-next';

const props = defineProps<{
  isOpen: boolean;
  activity: Activity | null;
  readOnly?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', form: ActivityDesignForm): void;
}>();

const currentStep = ref(1);
const isMinimized = ref(false);

const ALL_SDGS = [
  'SDG 1 - No Poverty',
  'SDG 2 - Zero Hunger',
  'SDG 3 - Good Health and Well-being',
  'SDG 4 - Quality Education',
  'SDG 5 - Gender Equality',
  'SDG 6 - Clean Water and Sanitation',
  'SDG 7 - Affordable and Clean Energy',
  'SDG 8 - Decent Work and Economic Growth',
  'SDG 9 - Industry, Innovation and Infrastructure',
  'SDG 10 - Reduced Inequalities',
  'SDG 11 - Sustainable Cities and Communities',
  'SDG 12 - Responsible Consumption and Production',
  'SDG 13 - Climate Action',
  'SDG 14 - Life Below Water',
  'SDG 15 - Life on Land',
  'SDG 16 - Peace, Justice and Strong Institutions',
  'SDG 17 - Partnerships for the Goals'
];

const ALL_COLLEGES = [
  'Supreme Student Council',
  'College of Business and Information Technology',
  'College of Environmental and Life Sciences',
  'College of Education and Social Sciences',
  'College of Marine and Fisheries Sciences',
  'KAABAG',
  'The Marine Echo',
  'Senior Student Society'
];

const form = ref<ActivityDesignForm>({
  activityTitle: '',
  controlNumber: '',
  officeCode: '',
  datePrepared: '',
  unitCollege: '',
  venue: '',
  department: '',
  proposedBudget: 0,
  resultCode: '',
  budgetSource: '',
  dateImplementation: '',
  includedInPdsYear: '',
  includedInPdsStatus: 'Yes',
  emailAddress: '',
  durationDays: '1',

  rationale: '',
  objectives: '',
  objectivesList: [''],
  expectedOutput: '',
  expectedOutputsList: [''],

  programOfActivitiesTitle: 'Day 1',
  programOfActivitiesDate: '',
  scheduleItems: [],
  participants: [],
  budgetaryRequirements: [],

  activityType: 'In-Campus',
  venueRows: [],
  campusFacilities: [],
  sdgsAchieved: [],
  attachmentFiles: [],
  taggedColleges: [],

  isCompleted: false
});

watch(
  () => props.activity,
  (act) => {
    if (act) {
      const existing = act.designForm;
      const today = new Date().toISOString().split('T')[0];

      form.value = {
        activityTitle: existing?.activityTitle || act.programActivity || act.title || '',
        controlNumber: existing?.controlNumber || `MSUN-${act.orgId || 'SSC'}-ACCOM-REV`,
        officeCode: existing?.officeCode || `OVCSAS-OSD-${act.orgId || 'SSC'}`,
        datePrepared: existing?.datePrepared || today,
        unitCollege: existing?.unitCollege || act.orgId || 'Supreme Student Council',
        venue: existing?.venue || act.venue || 'Multi-Purpose Gymnasium Hall A',
        department: existing?.department || 'Bachelor of Science in Information Technology',
        proposedBudget: existing?.proposedBudget ?? act.budget ?? 1500,
        resultCode: existing?.resultCode || 'OPCR-2027-001',
        budgetSource: existing?.budgetSource || act.fundSource || `${act.orgId || 'SSC'}-SEC Fund`,
        dateImplementation: existing?.dateImplementation || act.startDate || today,
        includedInPdsYear: existing?.includedInPdsYear || '2027',
        includedInPdsStatus: existing?.includedInPdsStatus || 'Yes',
        emailAddress: existing?.emailAddress || 'studentaffairs@msun.edu.ph',
        durationDays: existing?.durationDays || '1',

        rationale: existing?.rationale || act.description || 'This activity aims to promote student participation, address student concerns, and support student organization activities.',
        objectives: existing?.objectives || act.strategicObjectives || '',
        objectivesList: existing?.objectivesList?.length 
          ? [...existing.objectivesList] 
          : ['Strengthen student involvement and active participation.', 'Encourage open communication between officers and members.'],
        expectedOutput: existing?.expectedOutput || act.expectedOutput || '',
        expectedOutputsList: existing?.expectedOutputsList?.length 
          ? [...existing.expectedOutputsList] 
          : ['Provide student updates regarding organization activities.', 'Document student feedback and recommendations.'],

        programOfActivitiesTitle: existing?.programOfActivitiesTitle || 'Day 1 - General Assembly',
        programOfActivitiesDate: existing?.programOfActivitiesDate || act.startDate || today,
        
        scheduleItems: existing?.scheduleItems?.length 
          ? [...existing.scheduleItems]
          : [
              { dateTime: '08:00 AM - 09:00 AM', activity: 'Registration & Participant Arrival', personInCharge: 'Secretariat Committee' },
              { dateTime: '09:00 AM - 12:00 PM', activity: 'Executive Presentation & Open Floor Discussion', personInCharge: `${act.orgId || 'SSC'} Officers` }
            ],

        participants: existing?.participants?.length 
          ? [...existing.participants] 
          : [
              { name: 'Joshua Paul Mendoza', position: 'CBIT President' },
              { name: 'Faculty Adviser', position: 'Official Advisor' }
            ],

        budgetaryRequirements: existing?.budgetaryRequirements?.length 
          ? [...existing.budgetaryRequirements] 
          : [
              { item: 'Logistics & Venue Set', particulars: 'Stage backdrop, banners, sound system setup', amount: 1000, budgetSource: `${act.orgId || 'SSC'}-SEC Fund` },
              { item: 'Certificates & Refreshments', particulars: 'Glossy certificate paper & snacks for guest advisers', amount: 500, budgetSource: `${act.orgId || 'SSC'}-SEC Fund` }
            ],

        activityType: existing?.activityType || 'In-Campus',
        
        venueRows: existing?.venueRows?.length 
          ? [...existing.venueRows] 
          : [
              { venue: act.venue || 'Multi-Purpose Hall', specifiedDate: act.startDate || today, duration: '8:00 AM - 5:00 PM', remarks: 'Reserved & Cleared', signatureStatus: 'Signed' }
            ],

        campusFacilities: existing?.campusFacilities?.length 
          ? [...existing.campusFacilities] 
          : [
              { quantity: 150, description: 'Monoblock Chairs & Audio System', duration: '8:00 AM - 5:00 PM', remarks: 'Good Operating Condition', signatureStatus: 'Cleared' }
            ],

        sdgsAchieved: existing?.sdgsAchieved?.length 
          ? [...existing.sdgsAchieved] 
          : ['SDG 4 - Quality Education', 'SDG 16 - Peace, Justice and Strong Institutions'],

        attachmentFiles: existing?.attachmentFiles?.length ? [...existing.attachmentFiles] : [],
        taggedColleges: existing?.taggedColleges?.length 
          ? [...existing.taggedColleges] 
          : ['Supreme Student Council', 'College of Business and Information Technology'],

        submittedBy: existing?.submittedBy || act.proposedBy,
        submittedDate: existing?.submittedDate || act.submittedDate,
        isCompleted: existing?.isCompleted ?? false
      };
    }
  },
  { immediate: true }
);

// Dynamic Array Handler Functions
const addObjective = () => {
  form.value.objectivesList = [...(form.value.objectivesList || []), ''];
};
const removeObjective = (index: number) => {
  form.value.objectivesList?.splice(index, 1);
};

const addExpectedOutput = () => {
  form.value.expectedOutputsList = [...(form.value.expectedOutputsList || []), ''];
};
const removeExpectedOutput = (index: number) => {
  form.value.expectedOutputsList?.splice(index, 1);
};

const addScheduleItem = () => {
  form.value.scheduleItems?.push({ dateTime: '', activity: '', personInCharge: '' });
};
const removeScheduleItem = (index: number) => {
  form.value.scheduleItems?.splice(index, 1);
};

const addParticipant = () => {
  form.value.participants?.push({ name: '', position: '' });
};
const removeParticipant = (index: number) => {
  form.value.participants?.splice(index, 1);
};

const addBudgetItem = () => {
  form.value.budgetaryRequirements?.push({ item: '', particulars: '', amount: '', budgetSource: '' });
};
const removeBudgetItem = (index: number) => {
  form.value.budgetaryRequirements?.splice(index, 1);
};

const addVenueRow = () => {
  form.value.venueRows?.push({ venue: '', specifiedDate: '', duration: '', remarks: '', signatureStatus: '' });
};
const removeVenueRow = (index: number) => {
  form.value.venueRows?.splice(index, 1);
};

const addFacilityRow = () => {
  form.value.campusFacilities?.push({ quantity: 1, description: '', duration: '', remarks: '', signatureStatus: '' });
};
const removeFacilityRow = (index: number) => {
  form.value.campusFacilities?.splice(index, 1);
};

const toggleSdg = (sdg: string) => {
  const current = form.value.sdgsAchieved || [];
  if (current.includes(sdg)) {
    form.value.sdgsAchieved = current.filter((s) => s !== sdg);
  } else {
    form.value.sdgsAchieved = [...current, sdg];
  }
};

const toggleCollege = (college: string) => {
  const current = form.value.taggedColleges || [];
  if (current.includes(college)) {
    form.value.taggedColleges = current.filter((c) => c !== college);
  } else {
    form.value.taggedColleges = [...current, college];
  }
};

const totalBudgetCalculated = computed(() => {
  if (!form.value.budgetaryRequirements?.length) return Number(form.value.proposedBudget) || 0;
  return form.value.budgetaryRequirements.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
});

const handleSave = () => {
  form.value.isCompleted = true;
  form.value.submittedDate = new Date().toISOString().split('T')[0];
  form.value.objectives = form.value.objectivesList?.filter(Boolean).join('\n') || form.value.objectives;
  form.value.expectedOutput = form.value.expectedOutputsList?.filter(Boolean).join('\n') || form.value.expectedOutput;

  emit('save', { ...form.value });
  emit('close');
};
</script>

<template>
  <div v-if="isOpen && activity">
    <!-- Minimized Floating Widget -->
    <div
      v-if="isMinimized"
      class="fixed bottom-4 right-4 z-50 bg-slate-900 text-white rounded-2xl shadow-2xl p-4 border border-slate-700/80 flex items-center gap-3.5 max-w-sm w-full animate-in fade-in slide-in-from-bottom-4 duration-200"
    >
      <div class="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
        <FileText class="w-5 h-5" />
      </div>

      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
            Step {{ currentStep }} of 4
          </span>
          <span class="text-[10px] text-slate-400 truncate">{{ activity.id }}</span>
        </div>
        <p class="text-xs font-bold text-white truncate mt-0.5">
          Detailed Activity Design Form
        </p>
      </div>

      <div class="flex items-center gap-1 shrink-0">
        <button
          @click="isMinimized = false"
          title="Restore Form"
          class="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
        >
          <Maximize2 class="w-4 h-4" />
        </button>
        <button
          @click="emit('close')"
          title="Close Form"
          class="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Full Modal Container -->
    <div
      v-else
      class="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
      @click.self="emit('close')"
    >
      <div class="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        
        <!-- Top Modal Header Bar -->
        <div class="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
              <FileText class="w-4 h-4" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                  MSUN Official Form
                </span>
                <span class="text-[11px] text-slate-400">{{ activity.id }}</span>
              </div>
              <h3 class="text-sm sm:text-base font-extrabold text-white leading-tight">
                Detailed Activity Design Form
              </h3>
            </div>
          </div>

          <div class="flex items-center gap-1.5">
            <button
              @click="isMinimized = true"
              title="Minimize Form"
              class="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Minimize2 class="w-4 h-4" />
            </button>
            <button
              @click="emit('close')"
              title="Close Form"
              class="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- 4-Step Stepper Header -->
        <div class="bg-slate-50 border-b border-slate-200/80 px-4 py-3 sm:px-8 shrink-0">
          <div class="flex items-center justify-between max-w-3xl mx-auto relative">
            <!-- Connecting Line Background -->
            <div class="absolute left-6 right-6 top-4 h-0.5 bg-slate-200 -z-0"></div>
            
            <!-- Step 1 Indicator -->
            <button 
              @click="currentStep = 1" 
              class="relative z-10 flex flex-col items-center group cursor-pointer"
            >
              <div 
                class="w-9 h-9 rounded-full flex items-center justify-center transition-all font-bold text-xs shadow-xs"
                :class="currentStep === 1 
                  ? 'bg-blue-900 text-white ring-4 ring-blue-100 scale-105' 
                  : currentStep > 1 
                    ? 'bg-blue-900 text-white' 
                    : 'bg-slate-200 text-slate-500'"
              >
                <Check v-if="currentStep > 1" class="w-4 h-4" />
                <Info v-else class="w-4 h-4" />
              </div>
              <span 
                class="text-[11px] font-bold mt-1.5 transition-colors"
                :class="currentStep === 1 ? 'text-blue-900' : 'text-slate-500'"
              >
                Basic Information
              </span>
            </button>

            <!-- Step 2 Indicator -->
            <button 
              @click="currentStep = 2" 
              class="relative z-10 flex flex-col items-center group cursor-pointer"
            >
              <div 
                class="w-9 h-9 rounded-full flex items-center justify-center transition-all font-bold text-xs shadow-xs"
                :class="currentStep === 2 
                  ? 'bg-blue-900 text-white ring-4 ring-blue-100 scale-105' 
                  : currentStep > 2 
                    ? 'bg-blue-900 text-white' 
                    : 'bg-slate-200 text-slate-500'"
              >
                <Check v-if="currentStep > 2" class="w-4 h-4" />
                <DollarSign v-else class="w-4 h-4" />
              </div>
              <span 
                class="text-[11px] font-bold mt-1.5 transition-colors"
                :class="currentStep === 2 ? 'text-blue-900' : 'text-slate-500'"
              >
                Details & Budgetary
              </span>
            </button>

            <!-- Step 3 Indicator -->
            <button 
              @click="currentStep = 3" 
              class="relative z-10 flex flex-col items-center group cursor-pointer"
            >
              <div 
                class="w-9 h-9 rounded-full flex items-center justify-center transition-all font-bold text-xs shadow-xs"
                :class="currentStep === 3 
                  ? 'bg-blue-900 text-white ring-4 ring-blue-100 scale-105' 
                  : currentStep > 3 
                    ? 'bg-blue-900 text-white' 
                    : 'bg-slate-200 text-slate-500'"
              >
                <Check v-if="currentStep > 3" class="w-4 h-4" />
                <Target v-else class="w-4 h-4" />
              </div>
              <span 
                class="text-[11px] font-bold mt-1.5 transition-colors"
                :class="currentStep === 3 ? 'text-blue-900' : 'text-slate-500'"
              >
                Facilities & Goals
              </span>
            </button>

            <!-- Step 4 Indicator -->
            <button 
              @click="currentStep = 4" 
              class="relative z-10 flex flex-col items-center group cursor-pointer"
            >
              <div 
                class="w-9 h-9 rounded-full flex items-center justify-center transition-all font-bold text-xs shadow-xs"
                :class="currentStep === 4 
                  ? 'bg-blue-900 text-white ring-4 ring-blue-100 scale-105' 
                  : 'bg-slate-200 text-slate-500'"
              >
                <Check class="w-4 h-4" />
              </div>
              <span 
                class="text-[11px] font-bold mt-1.5 transition-colors"
                :class="currentStep === 4 ? 'text-blue-900' : 'text-slate-500'"
              >
                Review & Submit
              </span>
            </button>
          </div>
        </div>

        <!-- Form Body Content Container -->
        <div class="p-5 sm:p-6 overflow-y-auto flex-1 text-slate-800 space-y-6">

          <!-- ==================== STEP 1: BASIC INFORMATION ==================== -->
          <div v-if="currentStep === 1" class="space-y-5 animate-in fade-in duration-200">
            <div class="flex items-center gap-2 border-b border-slate-200 pb-2.5">
              <Info class="w-5 h-5 text-blue-900" />
              <h4 class="text-base font-extrabold text-slate-900">Basic Information</h4>
            </div>

            <!-- Grid Layout -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <!-- Activity Title -->
              <div>
                <label class="block font-bold text-slate-700 mb-1">Activity Title *</label>
                <input
                  type="text"
                  v-model="form.activityTitle"
                  :disabled="readOnly"
                  placeholder="First SSC Regular Meeting"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-slate-50 font-medium"
                />
              </div>

              <!-- Control Number -->
              <div>
                <label class="block font-bold text-slate-700 mb-1">Control Number *</label>
                <input
                  type="text"
                  v-model="form.controlNumber"
                  :disabled="readOnly"
                  placeholder="MSUN-SSC-ACCOM- -REV"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-slate-50 font-medium"
                />
              </div>

              <!-- Office Code -->
              <div>
                <label class="block font-bold text-slate-700 mb-1">Office Code</label>
                <input
                  type="text"
                  v-model="form.officeCode"
                  :disabled="readOnly"
                  placeholder="OVCSAS-OSD-SSC"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-slate-50 font-medium"
                />
              </div>

              <!-- Date Prepared -->
              <div>
                <label class="block font-bold text-slate-700 mb-1">Date Prepared *</label>
                <input
                  type="date"
                  v-model="form.datePrepared"
                  :disabled="readOnly"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-slate-50 font-medium"
                />
              </div>

              <!-- Unit/College -->
              <div>
                <label class="block font-bold text-slate-700 mb-1">Unit/College *</label>
                <select
                  v-model="form.unitCollege"
                  :disabled="readOnly"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-slate-50 font-medium bg-white"
                >
                  <option value="Supreme Student Council">SSC (Supreme Student Council)</option>
                  <option value="College of Business and Information Technology">CBIT (College of Business and Information Technology)</option>
                  <option value="College of Environmental and Life Sciences">CELS (College of Environmental and Life Sciences)</option>
                  <option value="College of Education and Social Sciences">CESS (College of Education and Social Sciences)</option>
                  <option value="College of Marine and Fisheries Sciences">CMFS (College of Marine and Fisheries Sciences)</option>
                  <option value="KAABAG">KAABAG</option>
                  <option value="The Marine Echo">TME (The Marine Echo)</option>
                  <option value="Senior Student Society">SenSo (Senior Student Society)</option>
                </select>
              </div>

              <!-- Venue -->
              <div>
                <label class="block font-bold text-slate-700 mb-1">Venue *</label>
                <input
                  type="text"
                  v-model="form.venue"
                  :disabled="readOnly"
                  placeholder="Enter venue location"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-slate-50 font-medium"
                />
              </div>

              <!-- Department -->
              <div>
                <label class="block font-bold text-slate-700 mb-1">Department *</label>
                <select
                  v-model="form.department"
                  :disabled="readOnly"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-slate-50 font-medium bg-white"
                >
                  <option value="Bachelor of Science in Information Technology">Bachelor of Science in Information Technology</option>
                  <option value="Bachelor of Science in Business Administration">Bachelor of Science in Business Administration</option>
                  <option value="Department of Student Affairs">Department of Student Affairs</option>
                </select>
              </div>

              <!-- Proposed Budget -->
              <div>
                <label class="block font-bold text-slate-700 mb-1">Proposed Budget *</label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₱</span>
                  <input
                    type="number"
                    v-model="form.proposedBudget"
                    :disabled="readOnly"
                    placeholder="Enter amount"
                    class="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-slate-50 font-medium"
                  />
                </div>
              </div>

              <!-- Result Code/OPCR/IPCR Code -->
              <div>
                <label class="block font-bold text-slate-700 mb-1">Result Code/OPCR/IPCR Code *</label>
                <input
                  type="text"
                  v-model="form.resultCode"
                  :disabled="readOnly"
                  placeholder="Enter code"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-slate-50 font-medium"
                />
              </div>

              <!-- Budget Source -->
              <div>
                <label class="block font-bold text-slate-700 mb-1">Budget Source *</label>
                <input
                  type="text"
                  v-model="form.budgetSource"
                  :disabled="readOnly"
                  placeholder="Enter budget source"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-slate-50 font-medium"
                />
              </div>

              <!-- Date of Implementation -->
              <div>
                <label class="block font-bold text-slate-700 mb-1">Date of Implementation *</label>
                <input
                  type="date"
                  v-model="form.dateImplementation"
                  :disabled="readOnly"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-slate-50 font-medium"
                />
              </div>

              <!-- Included in the PDB -->
              <div>
                <label class="block font-bold text-slate-700 mb-1">Included in the *</label>
                <div class="flex items-center gap-4 py-1">
                  <div class="flex items-center gap-1.5">
                    <span class="text-slate-600 font-semibold">Year:</span>
                    <input
                      type="text"
                      v-model="form.includedInPdsYear"
                      :disabled="readOnly"
                      placeholder="2027"
                      class="w-20 px-2 py-1 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900 text-center font-bold"
                    />
                  </div>
                  <div class="flex items-center gap-3">
                    <label class="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        value="Yes"
                        v-model="form.includedInPdsStatus"
                        :disabled="readOnly"
                        class="text-blue-900 focus:ring-blue-900"
                      />
                      <span>Yes</span>
                    </label>
                    <label class="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        value="No"
                        v-model="form.includedInPdsStatus"
                        :disabled="readOnly"
                        class="text-blue-900 focus:ring-blue-900"
                      />
                      <span>No</span>
                    </label>
                  </div>
                </div>
              </div>

              <!-- Email Address -->
              <div>
                <label class="block font-bold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  v-model="form.emailAddress"
                  :disabled="readOnly"
                  placeholder="Enter email address"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-slate-50 font-medium"
                />
              </div>

              <!-- Duration (in days) -->
              <div>
                <label class="block font-bold text-slate-700 mb-1">Duration (in days) *</label>
                <input
                  type="text"
                  v-model="form.durationDays"
                  :disabled="readOnly"
                  placeholder="1"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-slate-50 font-medium"
                />
              </div>
            </div>

            <!-- Section A: Rationale -->
            <div class="text-xs pt-2">
              <label class="block font-bold text-slate-700 mb-1">A. Rationale *</label>
              <textarea
                v-model="form.rationale"
                :disabled="readOnly"
                rows="4"
                placeholder="Provide a detailed description of the activity background and context..."
                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-slate-50 font-medium"
              ></textarea>
              <div class="text-[11px] text-slate-400 mt-1 text-right">
                {{ form.rationale?.length || 0 }}/5000 characters
              </div>
            </div>

            <!-- Section B: Objectives -->
            <div class="space-y-2 text-xs pt-2">
              <label class="block font-bold text-slate-700">B. Objectives *</label>
              <div
                v-for="(obj, idx) in form.objectivesList"
                :key="idx"
                class="flex items-center gap-2 mb-2"
              >
                <input
                  type="text"
                  v-model="form.objectivesList![idx]"
                  :disabled="readOnly"
                  placeholder="Enter objective..."
                  class="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-slate-50 font-medium"
                />
                <button
                  v-if="!readOnly && (form.objectivesList?.length || 0) > 1"
                  @click="removeObjective(idx)"
                  class="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
              <button
                v-if="!readOnly"
                @click="addObjective"
                type="button"
                class="inline-flex items-center gap-1.5 text-xs font-bold text-blue-900 hover:text-blue-700 cursor-pointer pt-1"
              >
                <Plus class="w-4 h-4" />
                <span>Add Objectives</span>
              </button>
            </div>

            <!-- Section C: Expected Output -->
            <div class="space-y-2 text-xs pt-2">
              <label class="block font-bold text-slate-700">C. Expected Output *</label>
              <div
                v-for="(out, idx) in form.expectedOutputsList"
                :key="idx"
                class="flex items-center gap-2 mb-2"
              >
                <input
                  type="text"
                  v-model="form.expectedOutputsList![idx]"
                  :disabled="readOnly"
                  placeholder="Enter expected output..."
                  class="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-slate-50 font-medium"
                />
                <button
                  v-if="!readOnly && (form.expectedOutputsList?.length || 0) > 1"
                  @click="removeExpectedOutput(idx)"
                  class="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
              <button
                v-if="!readOnly"
                @click="addExpectedOutput"
                type="button"
                class="inline-flex items-center gap-1.5 text-xs font-bold text-blue-900 hover:text-blue-700 cursor-pointer pt-1"
              >
                <Plus class="w-4 h-4" />
                <span>Add Expected Output</span>
              </button>
            </div>
          </div>


          <!-- ==================== STEP 2: DETAILS & BUDGETARY ==================== -->
          <div v-else-if="currentStep === 2" class="space-y-6 animate-in fade-in duration-200">
            <!-- Details of Activities Section -->
            <div class="space-y-4">
              <div class="flex items-center gap-2 border-b border-slate-200 pb-2.5">
                <Calendar class="w-5 h-5 text-blue-900" />
                <h4 class="text-base font-extrabold text-slate-900">D. Details of Activities</h4>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label class="block font-bold text-slate-700 mb-1">Program of Activities *</label>
                  <input
                    type="text"
                    v-model="form.programOfActivitiesTitle"
                    :disabled="readOnly"
                    placeholder="e.g. Day 1"
                    class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 font-medium"
                  />
                </div>

                <div>
                  <label class="block font-bold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    v-model="form.programOfActivitiesDate"
                    :disabled="readOnly"
                    class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 font-medium"
                  />
                </div>
              </div>

              <!-- Schedule Items Table -->
              <div class="overflow-x-auto border border-slate-200 rounded-xl">
                <table class="w-full text-xs text-left">
                  <thead class="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th class="p-3 w-1/3">DATE/TIME</th>
                      <th class="p-3 w-1/3">ACTIVITY</th>
                      <th class="p-3 w-1/3">PERSON-IN-CHARGE</th>
                      <th v-if="!readOnly" class="p-3 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-200">
                    <tr v-for="(item, idx) in form.scheduleItems" :key="idx" class="hover:bg-slate-50/50">
                      <td class="p-2.5">
                        <input
                          type="text"
                          v-model="item.dateTime"
                          :disabled="readOnly"
                          placeholder="Time (e.g. 9:00 AM - 12:00 PM)"
                          class="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900"
                        />
                      </td>
                      <td class="p-2.5">
                        <input
                          type="text"
                          v-model="item.activity"
                          :disabled="readOnly"
                          placeholder="Enter Activity Description"
                          class="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900"
                        />
                      </td>
                      <td class="p-2.5">
                        <input
                          type="text"
                          v-model="item.personInCharge"
                          :disabled="readOnly"
                          placeholder="Enter person-in-charge"
                          class="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900"
                        />
                      </td>
                      <td v-if="!readOnly" class="p-2.5 text-center">
                        <button @click="removeScheduleItem(idx)" class="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100 transition-colors">
                          <Trash2 class="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <button
                v-if="!readOnly"
                @click="addScheduleItem"
                type="button"
                class="inline-flex items-center gap-1.5 text-xs font-bold text-blue-900 hover:text-blue-700 cursor-pointer"
              >
                <Plus class="w-4 h-4" />
                <span>Add Schedule Item</span>
              </button>
            </div>

            <!-- Participants Breakdown -->
            <div class="space-y-3 pt-2">
              <label class="block text-xs font-bold text-slate-700">Participants *</label>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div v-for="(part, idx) in form.participants" :key="idx" class="flex gap-2 items-center">
                  <input
                    type="text"
                    v-model="part.name"
                    :disabled="readOnly"
                    placeholder="Enter name"
                    class="w-1/2 px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                  <input
                    type="text"
                    v-model="part.position"
                    :disabled="readOnly"
                    placeholder="Enter position"
                    class="w-1/2 px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                  <button v-if="!readOnly" @click="removeParticipant(idx)" class="p-1 text-slate-400 hover:text-red-500 rounded">
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <button
                v-if="!readOnly"
                @click="addParticipant"
                type="button"
                class="inline-flex items-center gap-1.5 text-xs font-bold text-blue-900 hover:text-blue-700 cursor-pointer"
              >
                <Plus class="w-4 h-4" />
                <span>Add Participants</span>
              </button>
            </div>

            <!-- Budgetary Requirements Section -->
            <div class="space-y-4 pt-4 border-t border-slate-200">
              <div class="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <div class="flex items-center gap-2">
                  <DollarSign class="w-5 h-5 text-blue-900" />
                  <h4 class="text-base font-extrabold text-slate-900">E. Budgetary Requirements</h4>
                </div>
                <div class="text-xs font-bold text-slate-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
                  Total Budget: <strong class="text-emerald-700 font-extrabold">₱{{ totalBudgetCalculated.toLocaleString() }}</strong>
                </div>
              </div>

              <!-- Budget Table -->
              <div class="overflow-x-auto border border-slate-200 rounded-xl">
                <table class="w-full text-xs text-left">
                  <thead class="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th class="p-3 w-1/4">ITEM/S</th>
                      <th class="p-3 w-1/4">PARTICULARS</th>
                      <th class="p-3 w-1/4">AMOUNT</th>
                      <th class="p-3 w-1/4">BUDGET SOURCE</th>
                      <th v-if="!readOnly" class="p-3 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-200">
                    <tr v-for="(bItem, idx) in form.budgetaryRequirements" :key="idx" class="hover:bg-slate-50/50">
                      <td class="p-2.5">
                        <input
                          type="text"
                          v-model="bItem.item"
                          :disabled="readOnly"
                          placeholder="Enter item"
                          class="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900"
                        />
                      </td>
                      <td class="p-2.5">
                        <input
                          type="text"
                          v-model="bItem.particulars"
                          :disabled="readOnly"
                          placeholder="Enter particular name"
                          class="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900"
                        />
                      </td>
                      <td class="p-2.5">
                        <input
                          type="number"
                          v-model="bItem.amount"
                          :disabled="readOnly"
                          placeholder="₱ Enter amount"
                          class="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900 font-bold text-emerald-800"
                        />
                      </td>
                      <td class="p-2.5">
                        <input
                          type="text"
                          v-model="bItem.budgetSource"
                          :disabled="readOnly"
                          placeholder="Enter budget source"
                          class="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900"
                        />
                      </td>
                      <td v-if="!readOnly" class="p-2.5 text-center">
                        <button @click="removeBudgetItem(idx)" class="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100 transition-colors">
                          <Trash2 class="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <button
                v-if="!readOnly"
                @click="addBudgetItem"
                type="button"
                class="inline-flex items-center gap-1.5 text-xs font-bold text-blue-900 hover:text-blue-700 cursor-pointer"
              >
                <Plus class="w-4 h-4" />
                <span>Add Budget Item</span>
              </button>
            </div>
          </div>


          <!-- ==================== STEP 3: FACILITIES & GOALS ==================== -->
          <div v-else-if="currentStep === 3" class="space-y-6 animate-in fade-in duration-200">
            <!-- Type of Activity Section -->
            <div class="space-y-4">
              <div class="flex items-center gap-2 border-b border-slate-200 pb-2.5">
                <Building2 class="w-5 h-5 text-blue-900" />
                <h4 class="text-base font-extrabold text-slate-900">F. Type of Activity & Venues</h4>
              </div>

              <div class="w-full sm:w-1/2 text-xs">
                <label class="block font-bold text-slate-700 mb-1">Activity Type *</label>
                <select
                  v-model="form.activityType"
                  :disabled="readOnly"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white font-bold text-slate-800"
                >
                  <option value="In-Campus">In-Campus</option>
                  <option value="Off-Campus">Off-Campus</option>
                </select>
              </div>

              <p class="text-[11px] text-slate-500 italic">
                Fill-out below for In-Campus Activity venue reservations:
              </p>

              <!-- Venues Table -->
              <div class="overflow-x-auto border border-slate-200 rounded-xl">
                <table class="w-full text-xs text-left">
                  <thead class="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th class="p-3">VENUE</th>
                      <th class="p-3">SPECIFIED DATE</th>
                      <th class="p-3">DURATION</th>
                      <th class="p-3">REMARKS</th>
                      <th class="p-3">SIGNATURE</th>
                      <th v-if="!readOnly" class="p-3 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-200">
                    <tr v-for="(vRow, idx) in form.venueRows" :key="idx" class="hover:bg-slate-50/50">
                      <td class="p-2.5">
                        <input
                          type="text"
                          v-model="vRow.venue"
                          :disabled="readOnly"
                          placeholder="Enter venue location"
                          class="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900"
                        />
                      </td>
                      <td class="p-2.5">
                        <input
                          type="date"
                          v-model="vRow.specifiedDate"
                          :disabled="readOnly"
                          class="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900"
                        />
                      </td>
                      <td class="p-2.5">
                        <input
                          type="text"
                          v-model="vRow.duration"
                          :disabled="readOnly"
                          placeholder="e.g. 1:00PM-4:00PM"
                          class="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900"
                        />
                      </td>
                      <td class="p-2.5">
                        <input
                          type="text"
                          v-model="vRow.remarks"
                          :disabled="readOnly"
                          placeholder="Enter remarks"
                          class="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900"
                        />
                      </td>
                      <td class="p-2.5 text-[11px] text-slate-500">
                        {{ vRow.signatureStatus || 'Signature' }}
                      </td>
                      <td v-if="!readOnly" class="p-2.5 text-center">
                        <button @click="removeVenueRow(idx)" class="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100 transition-colors">
                          <Trash2 class="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <button
                v-if="!readOnly"
                @click="addVenueRow"
                type="button"
                class="inline-flex items-center gap-1.5 text-xs font-bold text-blue-900 hover:text-blue-700 cursor-pointer"
              >
                <Plus class="w-4 h-4" />
                <span>Add Venue Row</span>
              </button>
            </div>

            <!-- Campus Facilities Section -->
            <div class="space-y-4 pt-2">
              <div class="flex items-center gap-2 border-b border-slate-200 pb-2.5">
                <Target class="w-5 h-5 text-blue-900" />
                <h4 class="text-base font-extrabold text-slate-900">G. Campus Facilities</h4>
              </div>

              <div class="overflow-x-auto border border-slate-200 rounded-xl">
                <table class="w-full text-xs text-left">
                  <thead class="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th class="p-3 w-20 text-center">QTY</th>
                      <th class="p-3">DESCRIPTION</th>
                      <th class="p-3">DURATION</th>
                      <th class="p-3">REMARKS</th>
                      <th class="p-3">SIGNATURE</th>
                      <th v-if="!readOnly" class="p-3 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-200">
                    <tr v-for="(fRow, idx) in form.campusFacilities" :key="idx" class="hover:bg-slate-50/50">
                      <td class="p-2.5">
                        <input
                          type="number"
                          v-model="fRow.quantity"
                          :disabled="readOnly"
                          placeholder="0"
                          class="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900 text-center font-bold"
                        />
                      </td>
                      <td class="p-2.5">
                        <input
                          type="text"
                          v-model="fRow.description"
                          :disabled="readOnly"
                          placeholder="Enter description"
                          class="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900"
                        />
                      </td>
                      <td class="p-2.5">
                        <input
                          type="text"
                          v-model="fRow.duration"
                          :disabled="readOnly"
                          placeholder="e.g. 1:00PM-4:00PM"
                          class="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900"
                        />
                      </td>
                      <td class="p-2.5">
                        <input
                          type="text"
                          v-model="fRow.remarks"
                          :disabled="readOnly"
                          placeholder="Enter remarks"
                          class="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900"
                        />
                      </td>
                      <td class="p-2.5 text-[11px] text-slate-500">
                        {{ fRow.signatureStatus || 'Signature' }}
                      </td>
                      <td v-if="!readOnly" class="p-2.5 text-center">
                        <button @click="removeFacilityRow(idx)" class="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100 transition-colors">
                          <Trash2 class="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <button
                v-if="!readOnly"
                @click="addFacilityRow"
                type="button"
                class="inline-flex items-center gap-1.5 text-xs font-bold text-blue-900 hover:text-blue-700 cursor-pointer"
              >
                <Plus class="w-4 h-4" />
                <span>Add Facility Row</span>
              </button>
            </div>

            <!-- SDGs Achieved Section -->
            <div class="space-y-3 pt-2">
              <label class="block text-xs font-bold text-slate-700">H. Sustainable Development Goals Achieved *</label>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-44 overflow-y-auto p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <label
                  v-for="sdg in ALL_SDGS"
                  :key="sdg"
                  class="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:text-slate-900"
                >
                  <input
                    type="checkbox"
                    :checked="form.sdgsAchieved?.includes(sdg)"
                    @change="toggleSdg(sdg)"
                    :disabled="readOnly"
                    class="rounded text-blue-900 focus:ring-blue-900"
                  />
                  <span class="font-medium">{{ sdg }}</span>
                </label>
              </div>
            </div>

            <!-- Tagged Colleges -->
            <div class="space-y-3 pt-2">
              <label class="block text-xs font-bold text-slate-700">Tagged Colleges / Entities</label>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label
                  v-for="college in ALL_COLLEGES"
                  :key="college"
                  class="flex items-center gap-2 text-slate-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    :checked="form.taggedColleges?.includes(college)"
                    @change="toggleCollege(college)"
                    :disabled="readOnly"
                    class="rounded text-blue-900 focus:ring-blue-900"
                  />
                  <span>{{ college }}</span>
                </label>
              </div>
            </div>
          </div>


          <!-- ==================== STEP 4: REVIEW & SUBMIT ==================== -->
          <div v-else-if="currentStep === 4" class="space-y-6 animate-in fade-in duration-200">
            <div class="flex items-center gap-2 border-b border-slate-200 pb-2.5">
              <CheckCircle2 class="w-5 h-5 text-blue-900" />
              <h4 class="text-base font-extrabold text-slate-900">Review & Submit</h4>
            </div>

            <!-- Basic Information Summary Card -->
            <div class="bg-slate-50/80 border border-slate-200/90 rounded-xl p-4 text-xs space-y-3">
              <h5 class="font-bold text-slate-900 border-b border-slate-200 pb-2 flex items-center justify-between">
                <span>Basic Information</span>
                <button @click="currentStep = 1" class="text-blue-900 hover:underline text-[11px]">Edit</button>
              </h5>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-4">
                <div><span class="text-slate-500 block text-[11px]">Activity Title:</span> <strong class="text-slate-900 font-semibold">{{ form.activityTitle }}</strong></div>
                <div><span class="text-slate-500 block text-[11px]">Control Number:</span> <strong class="text-slate-900 font-semibold">{{ form.controlNumber }}</strong></div>
                <div><span class="text-slate-500 block text-[11px]">Office Code:</span> <span class="text-slate-800">{{ form.officeCode }}</span></div>
                <div><span class="text-slate-500 block text-[11px]">Date Prepared:</span> <span class="text-slate-800">{{ form.datePrepared }}</span></div>
                <div><span class="text-slate-500 block text-[11px]">Unit/College:</span> <span class="text-slate-800">{{ form.unitCollege }}</span></div>
                <div><span class="text-slate-500 block text-[11px]">Venue:</span> <span class="text-slate-800">{{ form.venue }}</span></div>
                <div><span class="text-slate-500 block text-[11px]">Proposed Budget:</span> <strong class="text-slate-900 font-bold">₱{{ Number(form.proposedBudget).toLocaleString() }}</strong></div>
                <div><span class="text-slate-500 block text-[11px]">Implementation Date:</span> <span class="text-slate-800">{{ form.dateImplementation }}</span></div>
              </div>

              <div class="pt-2">
                <span class="text-slate-500 block text-[11px] mb-1">A. Rationale:</span>
                <p class="text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200/80 whitespace-pre-line">{{ form.rationale }}</p>
              </div>
            </div>

            <!-- Details & Budgetary Summary Card -->
            <div class="bg-slate-50/80 border border-slate-200/90 rounded-xl p-4 text-xs space-y-3">
              <h5 class="font-bold text-slate-900 border-b border-slate-200 pb-2 flex items-center justify-between">
                <span>Details & Budgetary Requirements</span>
                <button @click="currentStep = 2" class="text-blue-900 hover:underline text-[11px]">Edit</button>
              </h5>

              <div class="space-y-2">
                <span class="text-slate-500 block text-[11px]">Schedule Items ({{ form.scheduleItems?.length || 0 }} items):</span>
                <div class="overflow-x-auto border border-slate-200 rounded-lg bg-white">
                  <table class="w-full text-left text-[11px]">
                    <thead class="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
                      <tr>
                        <th class="p-2">Date/Time</th>
                        <th class="p-2">Activity Description</th>
                        <th class="p-2">Person in Charge</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      <tr v-for="(sch, sIdx) in form.scheduleItems" :key="sIdx">
                        <td class="p-2 font-medium">{{ sch.dateTime }}</td>
                        <td class="p-2 text-slate-600">{{ sch.activity }}</td>
                        <td class="p-2 text-slate-600">{{ sch.personInCharge }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div class="pt-2">
                  <span class="text-slate-500 block text-[11px] mb-1">Budgetary Requirements (Total: ₱{{ totalBudgetCalculated.toLocaleString() }}):</span>
                  <div class="overflow-x-auto border border-slate-200 rounded-lg bg-white">
                    <table class="w-full text-left text-[11px]">
                      <thead class="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
                        <tr>
                          <th class="p-2">Item</th>
                          <th class="p-2">Particulars</th>
                          <th class="p-2">Amount</th>
                          <th class="p-2">Source</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100">
                        <tr v-for="(b, bIdx) in form.budgetaryRequirements" :key="bIdx">
                          <td class="p-2 font-medium">{{ b.item }}</td>
                          <td class="p-2 text-slate-600">{{ b.particulars }}</td>
                          <td class="p-2 font-bold text-emerald-700">₱{{ Number(b.amount).toLocaleString() }}</td>
                          <td class="p-2 text-slate-600">{{ b.budgetSource }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <!-- Facilities & Goals Summary Card -->
            <div class="bg-slate-50/80 border border-slate-200/90 rounded-xl p-4 text-xs space-y-3">
              <h5 class="font-bold text-slate-900 border-b border-slate-200 pb-2 flex items-center justify-between">
                <span>Facilities & SDGs Achieved</span>
                <button @click="currentStep = 3" class="text-blue-900 hover:underline text-[11px]">Edit</button>
              </h5>

              <div class="space-y-2">
                <div><span class="text-slate-500 block text-[11px]">Activity Type & Venue:</span> <strong class="text-slate-800">{{ form.activityType }} - {{ form.venue }}</strong></div>
                <div v-if="form.sdgsAchieved && form.sdgsAchieved.length > 0">
                  <span class="text-slate-500 block text-[11px] mb-1">Tagged SDGs:</span>
                  <div class="flex flex-wrap gap-1">
                    <span v-for="sdg in form.sdgsAchieved" :key="sdg" class="px-2 py-0.5 bg-blue-50 text-blue-900 border border-blue-200 rounded text-[11px] font-semibold">
                      {{ sdg }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Before Submitting Alert Box -->
            <div class="p-4 bg-sky-50 border border-sky-200 rounded-xl text-sky-900 text-xs flex items-start gap-3 shadow-2xs">
              <Info class="w-5 h-5 text-sky-700 shrink-0 mt-0.5" />
              <div class="space-y-1">
                <h6 class="font-extrabold text-sky-950">Before Submitting:</h6>
                <ul class="list-disc list-inside space-y-0.5 text-sky-800 text-[11px]">
                  <li>Review all information for accuracy</li>
                  <li>Ensure all required fields are filled</li>
                  <li>Verify dates and venue availability</li>
                </ul>
              </div>
            </div>
          </div>

        </div>

        <!-- Modal Stepper Footer -->
        <div class="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <!-- Previous Button -->
          <button
            @click="currentStep > 1 ? currentStep-- : emit('close')"
            :disabled="currentStep === 1"
            class="btn-secondary"
          >
            <ChevronLeft class="w-4 h-4" />
            <span>Previous</span>
          </button>

          <!-- Right Action Buttons -->
          <div class="flex items-center gap-2.5">
            <button
              @click="emit('close')"
              class="btn-secondary"
            >
              Cancel
            </button>

            <!-- Next Button for Steps 1-3 -->
            <button
              v-if="currentStep < 4"
              @click="currentStep++"
              class="btn-primary"
            >
              <span>Next</span>
              <ChevronRight class="w-4 h-4" />
            </button>

            <!-- Submit for Approval Button for Step 4 -->
            <button
              v-else-if="!readOnly"
              @click="handleSave"
              class="btn-primary"
            >
              <Send class="w-4 h-4" />
              <span>Submit for Approval</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>
