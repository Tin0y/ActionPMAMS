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
import { isCollegeOrg } from '../data/initialData';
import { 
  printDadDocument, 
  downloadDadAsPdf, 
  downloadDadAsHtml,
  downloadDadAsDocx,
  resolveDadPreparedBySignatory
} from '../utils/dadExport';
import { getDadControlNo } from '../utils/dadSignatories';
import DadDocumentModal from './DadDocumentModal.vue';
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
  Check,
  Printer,
  Download,
  Loader2,
  FileDown,
  Eye
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
  participantsText: '',
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
      const resolvedSig = resolveDadPreparedBySignatory(act, existing);

      form.value = {
        activityTitle: existing?.activityTitle || act.programActivity || act.title || '',
        controlNumber: (existing?.controlNumber && !existing.controlNumber.includes('ACCOM-REV') && !existing.controlNumber.includes('001-2025-REV00')) ? existing.controlNumber : getDadControlNo(act, existing),
        officeCode: existing?.officeCode || `OVCSAS-OSD-${act.orgId || 'SSC'}`,
        datePrepared: existing?.datePrepared || today,
        unitCollege: existing?.unitCollege || act.orgId || 'Supreme Student Council',
        venue: existing?.venue || act.venue || 'Multi-Purpose Gymnasium Hall A',
        department: existing?.department || 'Bachelor of Science in Information Technology',
        proposedBudget: existing?.proposedBudget ?? act.budget ?? 1500,
        resultCode: existing?.resultCode || 'OPCR-2027-001',
        budgetSource: existing?.budgetSource || act.fundSource || `${act.orgId || 'SSC'}-SEC Fund`,
        dateImplementation: existing?.dateImplementation || act.startDate || today,
        includedInPdsPlan: existing?.includedInPdsPlan || '',
        includedInPdsYear: (existing?.includedInPdsYear && existing.includedInPdsYear !== '2027') ? existing.includedInPdsYear : '',
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
              { name: 'Joshua Paul Mendoza', position: 'CBIT SEC President' },
              { name: 'Faculty Adviser', position: 'Official Advisor' }
            ],
        participantsText: existing?.participantsText || (
          existing?.participants?.length
            ? existing.participants.map(p => (typeof p === 'string' ? p : (p.name ? `${p.name} (${p.position})` : ''))).filter(Boolean).join(', ')
            : 'All bona fide student members, student leaders, and faculty advisers.'
        ),

        budgetaryRequirements: existing?.budgetaryRequirements?.length 
          ? [...existing.budgetaryRequirements] 
          : [
              { item: 'Logistics & Venue Set', particulars: 'Stage backdrop, banners, sound system setup', amount: 1000, budgetSource: `${act.orgId || 'SSC'}-SEC Fund` },
              { item: 'Certificates & Refreshments', particulars: 'Glossy certificate paper & snacks for guest advisers', amount: 500, budgetSource: `${act.orgId || 'SSC'}-SEC Fund` }
            ],

        activityType: existing?.activityType || 'In-Campus',
        
        venueRows: existing?.venueRows?.length 
          ? existing.venueRows.map(v => ({ ...v, signatureStatus: v.signatureStatus || '' }))
          : [
              { venue: act.venue || 'Multi-Purpose Hall', specifiedDate: act.startDate || today, duration: '8:00 AM - 5:00 PM', remarks: 'Reserved & Cleared', signatureStatus: '' }
            ],

        campusFacilities: existing?.campusFacilities?.length 
          ? existing.campusFacilities.map(f => ({ ...f, signatureStatus: f.signatureStatus || '' }))
          : [
              { quantity: 150, description: 'Monoblock Chairs & Audio System', duration: '8:00 AM - 5:00 PM', remarks: 'Good Operating Condition', signatureStatus: '' }
            ],

        sdgsAchieved: existing?.sdgsAchieved?.length 
          ? [...existing.sdgsAchieved] 
          : ['SDG 4 - Quality Education', 'SDG 16 - Peace, Justice and Strong Institutions'],

        attachmentFiles: existing?.attachmentFiles?.length ? [...existing.attachmentFiles] : [],
        taggedColleges: existing?.taggedColleges?.length 
          ? [...existing.taggedColleges] 
          : ['Supreme Student Council', 'College of Business and Information Technology'],

        submittedBy: existing?.submittedBy || resolvedSig.name,
        submittedByRole: resolvedSig.role,
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

const isCollege = computed(() => isCollegeOrg(props.activity?.orgId));
const isDownloading = ref(false);
const isDadPreviewOpen = ref(false);

const handlePrintDad = () => {
  if (!props.activity) return;
  printDadDocument(props.activity, form.value);
  isDadPreviewOpen.value = true;
};

const handleDownloadPdf = async () => {
  if (!props.activity) return;
  isDownloading.value = true;
  try {
    await downloadDadAsPdf(props.activity, form.value);
  } catch (err) {
    console.error('PDF generation error, falling back to HTML download:', err);
    downloadDadAsHtml(props.activity, form.value);
  } finally {
    isDownloading.value = false;
  }
};

const isDownloadingDocx = ref(false);

const handleDownloadDocx = async () => {
  if (!props.activity) return;
  isDownloadingDocx.value = true;
  try {
    await downloadDadAsDocx(props.activity, form.value);
  } catch (err) {
    console.error('DOCX generation error, falling back to HTML download:', err);
    downloadDadAsHtml(props.activity, form.value);
  } finally {
    isDownloadingDocx.value = false;
  }
};

const handleDownloadDoc = () => {
  if (!props.activity) return;
  downloadDadAsHtml(props.activity, form.value);
};

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
      class="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
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
            <!-- Word (.docx) Primary Format -->
            <button
              @click="handleDownloadDocx"
              :disabled="isDownloadingDocx"
              title="Download official DAD as editable Word (.docx) document"
              class="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Loader2 v-if="isDownloadingDocx" class="w-4 h-4 animate-spin text-blue-400" />
              <FileText v-else class="w-4 h-4 text-blue-400" />
            </button>
            <button
              @click="isDadPreviewOpen = true"
              title="Preview Official DAD Document"
              class="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Eye class="w-4 h-4" />
            </button>
            <button
              @click="handlePrintDad"
              title="Print DAD Form"
              class="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Printer class="w-4 h-4" />
            </button>
            <button
              @click="handleDownloadPdf"
              :disabled="isDownloading"
              title="Download DAD Form (PDF)"
              class="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Loader2 v-if="isDownloading" class="w-4 h-4 animate-spin text-blue-400" />
              <Download v-else class="w-4 h-4" />
            </button>
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
                  placeholder="MSUN-SSC-DAD-_____-2026-REV___"
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

              <!-- Included in the (_____) Year: (_____) -->
              <div>
                <label class="block font-bold text-slate-700 mb-1">Included in the (_____) Year: (_____) *</label>
                <div class="flex items-center gap-4 py-1 flex-wrap">
                  <div class="flex items-center gap-1.5">
                    <span class="text-slate-600 font-semibold text-xs">Plan:</span>
                    <input
                      type="text"
                      v-model="form.includedInPdsPlan"
                      :disabled="readOnly"
                      placeholder="e.g. PDB"
                      class="w-24 px-2 py-1 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900 text-center font-bold text-xs"
                    />
                  </div>
                  <div class="flex items-center gap-1.5">
                    <span class="text-slate-600 font-semibold text-xs">Year:</span>
                    <input
                      type="text"
                      v-model="form.includedInPdsYear"
                      :disabled="readOnly"
                      placeholder="e.g. 2026"
                      class="w-20 px-2 py-1 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900 text-center font-bold text-xs"
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
                      <span class="text-xs font-semibold">Yes</span>
                    </label>
                    <label class="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        value="No"
                        v-model="form.includedInPdsStatus"
                        :disabled="readOnly"
                        class="text-blue-900 focus:ring-blue-900"
                      />
                      <span class="text-xs font-semibold">No</span>
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
                <h4 class="text-base font-extrabold text-slate-900">Program of Activities / Details of Activities</h4>
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

            <!-- Section D: Participants (Inputable text field only) -->
            <div class="space-y-2 pt-2 border-t border-slate-200">
              <div class="flex items-center gap-2 border-b border-slate-200 pb-2">
                <Users class="w-4 h-4 text-blue-900" />
                <h4 class="text-sm font-extrabold text-slate-900">D. Participants *</h4>
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1 text-xs">Target Participants / Target Groups *</label>
                <textarea
                  v-model="form.participantsText"
                  :disabled="readOnly"
                  rows="3"
                  placeholder="Enter participants details (e.g., 120 student leaders and officers from all accredited organizations, faculty advisers, and invited guests)..."
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-slate-50 font-medium text-xs leading-relaxed"
                ></textarea>
                <p class="text-[11px] text-slate-500 italic mt-1">Input description, target groups, or estimated number of participants.</p>
              </div>
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
                      <td class="p-2.5">
                        <input
                          type="text"
                          v-model="vRow.signatureStatus"
                          :disabled="readOnly"
                          placeholder=""
                          class="w-full px-2 py-1 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white text-xs"
                        />
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
                      <td class="p-2.5">
                        <input
                          type="text"
                          v-model="fRow.signatureStatus"
                          :disabled="readOnly"
                          placeholder=""
                          class="w-full px-2 py-1 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white text-xs"
                        />
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
                  <span class="text-slate-500 block text-[11px] mb-1">D. Participants:</span>
                  <p class="text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200/80 whitespace-pre-line">{{ form.participantsText || 'None specified' }}</p>
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

            <!-- Print & Download Official DAD Form Banner -->
            <div class="p-4 bg-blue-50/90 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center shrink-0">
                  <Printer class="w-5 h-5" />
                </div>
                <div>
                  <h5 class="font-extrabold text-blue-950 text-xs sm:text-sm">Print or Download Official DAD Form</h5>
                  <p class="text-[11px] text-blue-800">Print or download the official Detailed Activity Design form with formatted specifications, tables, and blank signature lines.</p>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  @click="handlePrintDad"
                  class="px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  title="Print official DAD form"
                >
                  <Printer class="w-4 h-4" />
                  <span>Print Form</span>
                </button>
                <button
                  type="button"
                  @click="handleDownloadPdf"
                  :disabled="isDownloading"
                  class="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  title="Download DAD as genuine PDF"
                >
                  <Loader2 v-if="isDownloading" class="w-4 h-4 animate-spin" />
                  <Download v-else class="w-4 h-4" />
                  <span>{{ isDownloading ? 'Generating...' : 'Download PDF' }}</span>
                </button>
                <button
                  type="button"
                  @click="handleDownloadDoc"
                  class="p-2 border border-blue-300 bg-white hover:bg-blue-50 text-blue-950 font-bold text-xs rounded-xl shadow-xs flex items-center transition-all cursor-pointer"
                  title="Download as HTML Document"
                >
                  <FileDown class="w-4 h-4" />
                </button>
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
            <!-- Word (.docx) Primary Format Button -->
            <button
              type="button"
              @click="handleDownloadDocx"
              :disabled="isDownloadingDocx"
              class="px-3.5 py-2 rounded-xl text-xs font-bold border border-blue-400 bg-blue-600 text-white hover:bg-blue-500 disabled:bg-blue-400 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-95"
              title="Download official editable Word (.docx) document"
            >
              <Loader2 v-if="isDownloadingDocx" class="w-4 h-4 animate-spin" />
              <FileText v-else class="w-4 h-4" />
              <span>Word (.docx)</span>
            </button>

            <!-- Print DAD Button -->
            <button
              type="button"
              @click="handlePrintDad"
              class="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-95"
              title="Print DAD Form with official university layout"
            >
              <Printer class="w-4 h-4 text-blue-900" />
              <span>Print DAD</span>
            </button>

            <!-- Download PDF Button -->
            <button
              type="button"
              @click="handleDownloadPdf"
              :disabled="isDownloading"
              class="px-3.5 py-2 rounded-xl text-xs font-bold border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-95"
              title="Download DAD Form as PDF"
            >
              <Loader2 v-if="isDownloading" class="w-4 h-4 animate-spin text-emerald-700" />
              <Download v-else class="w-4 h-4 text-emerald-700" />
              <span>{{ isDownloading ? 'Downloading...' : 'Download PDF' }}</span>
            </button>


            <!-- Preview Modal Button -->
            <button
              type="button"
              @click="isDadPreviewOpen = true"
              class="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-95"
              title="Preview official printable document"
            >
              <Eye class="w-4 h-4 text-blue-900" />
              <span class="hidden sm:inline">Preview</span>
            </button>

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

    <!-- ========================================================================= -->
    <!-- PRINTABLE DETAILED ACTIVITY DESIGN (OFFICIAL UNIVERSITY FORMAT)           -->
    <!-- Visible ONLY when printing (media print via #printable-dad-document)       -->
    <!-- ========================================================================= -->
    <div v-if="activity" id="printable-dad-document" class="hidden print:block text-black bg-white">
      <!-- Institutional Header -->
      <div class="text-center pb-3 border-b-2 border-black mb-4">
        <p class="text-[11px] uppercase tracking-wider font-semibold">Republic of the Philippines</p>
        <h1 class="text-base font-extrabold uppercase tracking-wide">MINDANAO STATE UNIVERSITY AT NAAWAN</h1>
        <p class="text-[10px] text-gray-700">9023 Naawan, Misamis Oriental, Philippines</p>
        <p class="text-[11px] font-bold uppercase tracking-wider mt-1 text-blue-950">
          OFFICE OF STUDENT DEVELOPMENT &bull; OFFICE OF THE VICE CHANCELLOR FOR STUDENT AFFAIRS AND SERVICES
        </p>
        <h2 class="text-sm font-black uppercase tracking-wider mt-2 bg-gray-100 py-1 border-y border-black">
          DETAILED ACTIVITY DESIGN (DAD)
        </h2>
      </div>

      <!-- Administrative Specifications (Two Columns Table) -->
      <table class="w-full border-collapse border border-black text-[11px] mb-4">
        <tbody>
          <tr>
            <td class="border border-black p-1.5 font-bold w-1/4 bg-gray-50">ACTIVITY TITLE:</td>
            <td class="border border-black p-1.5 font-semibold w-1/4">{{ form.activityTitle || activity.title }}</td>
            <td class="border border-black p-1.5 font-bold w-1/4 bg-gray-50">OFFICE CODE:</td>
            <td class="border border-black p-1.5 w-1/4">{{ form.officeCode || 'OSD-04' }}</td>
          </tr>
          <tr>
            <td class="border border-black p-1.5 font-bold bg-gray-50">CONTROL NUMBER:</td>
            <td class="border border-black p-1.5">{{ form.controlNumber || getDadControlNo(activity, form) }}</td>
            <td class="border border-black p-1.5 font-bold bg-gray-50">DATE PREPARED:</td>
            <td class="border border-black p-1.5">{{ form.datePrepared || new Date().toISOString().split('T')[0] }}</td>
          </tr>
          <tr>
            <td class="border border-black p-1.5 font-bold bg-gray-50">UNIT / COLLEGE:</td>
            <td class="border border-black p-1.5">{{ form.unitCollege || activity.orgId }}</td>
            <td class="border border-black p-1.5 font-bold bg-gray-50">DEPARTMENT:</td>
            <td class="border border-black p-1.5">{{ form.department || 'Student Organizations' }}</td>
          </tr>
          <tr>
            <td class="border border-black p-1.5 font-bold bg-gray-50">VENUE:</td>
            <td class="border border-black p-1.5">{{ form.venue || activity.venue }}</td>
            <td class="border border-black p-1.5 font-bold bg-gray-50">DATE OF IMPLEMENTATION:</td>
            <td class="border border-black p-1.5">{{ form.dateImplementation || activity.startDate }}</td>
          </tr>
          <tr>
            <td class="border border-black p-1.5 font-bold bg-gray-50">PROPOSED BUDGET:</td>
            <td class="border border-black p-1.5 font-bold">₱{{ totalBudgetCalculated.toLocaleString() }}</td>
            <td class="border border-black p-1.5 font-bold bg-gray-50">RESULT CODE:</td>
            <td class="border border-black p-1.5">{{ form.resultCode || 'OPCR-2027' }}</td>
          </tr>
          <tr>
            <td class="border border-black p-1.5 font-bold bg-gray-50">BUDGET SOURCE:</td>
            <td class="border border-black p-1.5">{{ form.budgetSource || `${activity.orgId} Trust Fund` }}</td>
            <td class="border border-black p-1.5 font-bold bg-gray-50">INCLUDED IN THE (_____) YEAR: (_____):</td>
            <td class="border border-black p-1.5 font-semibold">{{ form.includedInPdsStatus || 'Yes' }} ({{ form.includedInPdsPlan || '_____' }} / {{ form.includedInPdsYear || '_____' }})</td>
          </tr>
          <tr>
            <td class="border border-black p-1.5 font-bold bg-gray-50">EMAIL ADDRESS:</td>
            <td class="border border-black p-1.5">{{ form.emailAddress || 'studentaffairs@msun.edu.ph' }}</td>
            <td class="border border-black p-1.5 font-bold bg-gray-50">DURATION (IN DAYS):</td>
            <td class="border border-black p-1.5">{{ form.durationDays || '1' }} day(s)</td>
          </tr>
        </tbody>
      </table>

      <!-- Section A: RATIONALE -->
      <div class="mb-3">
        <h3 class="text-[11px] font-bold uppercase border-b border-black pb-0.5 mb-1 bg-gray-50 px-1">A. RATIONALE</h3>
        <p class="text-[11px] leading-relaxed text-justify px-1 whitespace-pre-line">{{ form.rationale || activity.description }}</p>
      </div>

      <!-- Section B: OBJECTIVES -->
      <div class="mb-3">
        <h3 class="text-[11px] font-bold uppercase border-b border-black pb-0.5 mb-1 bg-gray-50 px-1">B. OBJECTIVES</h3>
        <ol class="list-decimal list-inside text-[11px] space-y-0.5 px-2">
          <li v-for="(obj, oIdx) in (form.objectivesList?.length ? form.objectivesList : (form.objectives || '').split('\n')).filter(Boolean)" :key="oIdx">
            {{ obj }}
          </li>
        </ol>
      </div>

      <!-- Section C: EXPECTED OUTPUT -->
      <div class="mb-3">
        <h3 class="text-[11px] font-bold uppercase border-b border-black pb-0.5 mb-1 bg-gray-50 px-1">C. EXPECTED OUTPUT</h3>
        <ol class="list-decimal list-inside text-[11px] space-y-0.5 px-2">
          <li v-for="(out, uIdx) in (form.expectedOutputsList?.length ? form.expectedOutputsList : (form.expectedOutput || '').split('\n')).filter(Boolean)" :key="uIdx">
            {{ out }}
          </li>
        </ol>
      </div>

      <!-- Section D: PARTICIPANTS -->
      <div class="mb-3">
        <h3 class="text-[11px] font-bold uppercase border-b border-black pb-0.5 mb-1 bg-gray-50 px-1">D. PARTICIPANTS</h3>
        <p class="text-[11px] leading-relaxed px-1 whitespace-pre-line">{{ form.participantsText || 'All bona fide student members, student leaders, and faculty advisers.' }}</p>
      </div>

      <!-- DETAILS OF ACTIVITIES (SCHEDULE) -->
      <div class="mb-3" v-if="form.scheduleItems && form.scheduleItems.length > 0">
        <h3 class="text-[11px] font-bold uppercase border-b border-black pb-0.5 mb-1 bg-gray-50 px-1">
          PROGRAM OF ACTIVITIES / DETAILS OF ACTIVITIES
        </h3>
        <table class="w-full border-collapse border border-black text-[10px]">
          <thead class="bg-gray-100 font-bold">
            <tr>
              <th class="border border-black p-1 text-left w-1/4">DATE / TIME</th>
              <th class="border border-black p-1 text-left w-1/2">ACTIVITY</th>
              <th class="border border-black p-1 text-left w-1/4">PERSON IN-CHARGE</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(sch, sIdx) in form.scheduleItems" :key="sIdx">
              <td class="border border-black p-1">{{ sch.dateTime }}</td>
              <td class="border border-black p-1">{{ sch.activity }}</td>
              <td class="border border-black p-1">{{ sch.personInCharge }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Section E: BUDGETARY REQUIREMENTS -->
      <div class="mb-3">
        <div class="flex justify-between items-center border-b border-black pb-0.5 mb-1 bg-gray-50 px-1">
          <h3 class="text-[11px] font-bold uppercase">E. BUDGETARY REQUIREMENTS</h3>
          <span class="text-[11px] font-bold">TOTAL: ₱{{ totalBudgetCalculated.toLocaleString() }}</span>
        </div>
        <table class="w-full border-collapse border border-black text-[10px]">
          <thead class="bg-gray-100 font-bold">
            <tr>
              <th class="border border-black p-1 text-left w-1/4">ITEM/S</th>
              <th class="border border-black p-1 text-left w-1/3">PARTICULARS</th>
              <th class="border border-black p-1 text-left w-1/4">BUDGET SOURCE</th>
              <th class="border border-black p-1 text-right w-1/6">AMOUNT (₱)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(b, bIdx) in form.budgetaryRequirements" :key="bIdx">
              <td class="border border-black p-1 font-semibold">{{ b.item }}</td>
              <td class="border border-black p-1">{{ b.particulars }}</td>
              <td class="border border-black p-1">{{ b.budgetSource }}</td>
              <td class="border border-black p-1 text-right font-bold">{{ Number(b.amount).toLocaleString() }}</td>
            </tr>
            <tr class="bg-gray-50 font-bold">
              <td colspan="3" class="border border-black p-1 text-right">TOTAL BUDGETARY REQUIREMENT:</td>
              <td class="border border-black p-1 text-right">₱{{ totalBudgetCalculated.toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Section F: TYPE OF ACTIVITY & VENUES -->
      <div class="mb-3">
        <h3 class="text-[11px] font-bold uppercase border-b border-black pb-0.5 mb-1 bg-gray-50 px-1">
          F. TYPE OF ACTIVITY ({{ form.activityType || 'In-Campus' }}) & VENUE RESERVATIONS
        </h3>
        <table class="w-full border-collapse border border-black text-[10px]">
          <thead class="bg-gray-100 font-bold">
            <tr>
              <th class="border border-black p-1 text-left w-1/4">VENUE</th>
              <th class="border border-black p-1 text-left w-1/5">SPECIFIED DATE</th>
              <th class="border border-black p-1 text-left w-1/6">DURATION</th>
              <th class="border border-black p-1 text-left w-1/5">REMARKS</th>
              <th class="border border-black p-1 text-center w-1/5">SIGNATURE</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(v, vIdx) in form.venueRows" :key="vIdx">
              <td class="border border-black p-1 font-semibold">{{ v.venue }}</td>
              <td class="border border-black p-1">{{ v.specifiedDate }}</td>
              <td class="border border-black p-1">{{ v.duration }}</td>
              <td class="border border-black p-1">{{ v.remarks }}</td>
              <td class="border border-black p-1 text-center h-8">
                <span v-if="v.signatureStatus" class="font-semibold">{{ v.signatureStatus }}</span>
                <span v-else class="block border-b border-gray-400 w-3/4 mx-auto mt-4"></span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Section G: CAMPUS FACILITIES -->
      <div class="mb-3">
        <h3 class="text-[11px] font-bold uppercase border-b border-black pb-0.5 mb-1 bg-gray-50 px-1">
          G. CAMPUS FACILITIES
        </h3>
        <table class="w-full border-collapse border border-black text-[10px]">
          <thead class="bg-gray-100 font-bold">
            <tr>
              <th class="border border-black p-1 text-center w-12">QTY</th>
              <th class="border border-black p-1 text-left w-1/3">DESCRIPTION</th>
              <th class="border border-black p-1 text-left w-1/5">DURATION</th>
              <th class="border border-black p-1 text-left w-1/5">REMARKS</th>
              <th class="border border-black p-1 text-center w-1/5">SIGNATURE</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(f, fIdx) in form.campusFacilities" :key="fIdx">
              <td class="border border-black p-1 text-center font-bold">{{ f.quantity }}</td>
              <td class="border border-black p-1">{{ f.description }}</td>
              <td class="border border-black p-1">{{ f.duration }}</td>
              <td class="border border-black p-1">{{ f.remarks }}</td>
              <td class="border border-black p-1 text-center h-8">
                <span v-if="f.signatureStatus" class="font-semibold">{{ f.signatureStatus }}</span>
                <span v-else class="block border-b border-gray-400 w-3/4 mx-auto mt-4"></span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Section H: SDGs ACHIEVED -->
      <div class="mb-4" v-if="form.sdgsAchieved && form.sdgsAchieved.length > 0">
        <h3 class="text-[11px] font-bold uppercase border-b border-black pb-0.5 mb-1 bg-gray-50 px-1">
          H. SUSTAINABLE DEVELOPMENT GOALS (SDGs) ACHIEVED
        </h3>
        <p class="text-[11px] px-1">{{ form.sdgsAchieved.join(' • ') }}</p>
      </div>

      <!-- SIGNATORY AND APPROVAL ROUTING BLOCK (TERMINATES AT OVCSAS, NO OC!) -->
      <div class="border border-black p-3 mt-4 text-[11px] page-break-inside-avoid">
        <p class="font-bold uppercase tracking-wider text-[10px] text-center border-b border-black pb-1 mb-3">
          INSTITUTIONAL ENDORSEMENT AND APPROVAL ROUTING
        </p>

        <div class="grid grid-cols-2 gap-y-6 gap-x-8 text-center pt-2">
          <!-- 1. Prepared by: Org President -->
          <div>
            <p class="text-[10px] text-gray-600 mb-6 text-left">Prepared by:</p>
            <p class="font-bold border-b border-black pb-0.5 uppercase">{{ form.submittedBy || activity.proposedBy || 'STUDENT LEADER' }}</p>
            <p class="text-[10px] font-semibold text-gray-700">{{ form.submittedByRole || ('President / Head, ' + (form.unitCollege || activity.orgId)) }}</p>
            <p class="text-[9px] text-gray-500">Date: ____________________</p>
          </div>

          <!-- 2. Reviewed by: Faculty Adviser -->
          <div>
            <p class="text-[10px] text-gray-600 mb-6 text-left">Reviewed & Endorsed by:</p>
            <p class="font-bold border-b border-black pb-0.5 uppercase">{{ activity.adviserName || 'FACULTY ADVISER' }}</p>
            <p class="text-[10px] font-semibold text-gray-700">Official Faculty Adviser</p>
            <p class="text-[9px] text-gray-500">Date: ____________________</p>
          </div>

          <!-- 3. College Dean (if College Org) -->
          <div v-if="isCollege">
            <p class="text-[10px] text-gray-600 mb-6 text-left">Endorsed by:</p>
            <p class="font-bold border-b border-black pb-0.5 uppercase">{{ activity.deanName || 'COLLEGE DEAN' }}</p>
            <p class="text-[10px] font-semibold text-gray-700">Dean, {{ form.unitCollege || activity.orgId }}</p>
            <p class="text-[9px] text-gray-500">Date: ____________________</p>
          </div>

          <!-- 4. Recommending Approval: OSD Director -->
          <div :class="!isCollege ? '' : ''">
            <p class="text-[10px] text-gray-600 mb-6 text-left">Recommending Approval:</p>
            <p class="font-bold border-b border-black pb-0.5 uppercase">DIRECTOR, OFFICE OF STUDENT DEVELOPMENT</p>
            <p class="text-[10px] font-semibold text-gray-700">Office of Student Development (OSD)</p>
            <p class="text-[9px] text-gray-500">Date: ____________________</p>
          </div>

          <!-- 5. FINAL APPROVAL: OVCSAS (FULL WIDTH OR CENTERED, TERMINAL APPROVAL) -->
          <div :class="isCollege ? 'col-span-2 max-w-sm mx-auto' : 'col-span-2 max-w-sm mx-auto'">
            <p class="text-[10px] text-gray-600 mb-6 text-left">Approved by:</p>
            <p class="font-bold border-b border-black pb-0.5 uppercase">VICE CHANCELLOR FOR STUDENT AFFAIRS AND SERVICES</p>
            <p class="text-[10px] font-semibold text-gray-700">Office of the Vice Chancellor for Student Affairs and Services (OVCSAS)</p>
            <p class="text-[9px] text-gray-500">Date: ____________________</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Official DAD Document Viewer & Export Modal -->
    <DadDocumentModal
      :is-open="isDadPreviewOpen"
      :activity="activity"
      :form-overrides="form"
      @close="isDadPreviewOpen = false"
    />
  </div>
</template>
