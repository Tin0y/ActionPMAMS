<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { ActivityAccomplishmentForm, AccomplishmentRow, Activity } from '../types';
import { 
  X, 
  Award, 
  CheckCircle2, 
  Send, 
  ExternalLink, 
  Minimize2, 
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Info,
  Calendar,
  DollarSign,
  Plus,
  Trash2,
  UploadCloud,
  Check,
  FileText,
  Table as TableIcon,
  Image as ImageIcon,
  Paperclip,
  CheckSquare
} from 'lucide-vue-next';

const props = defineProps<{
  isOpen: boolean;
  activity: Activity | null;
  readOnly?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', form: ActivityAccomplishmentForm): void;
}>();

const currentStep = ref<number>(1);
const isMinimized = ref<boolean>(false);

// Form State matching all 4 steps
const form = ref<ActivityAccomplishmentForm>({
  // Step 1: Basic Information
  activityTitle: '',
  controlNumber: '',
  officeCode: 'OVCSAS-OSD-SSC',
  datePrepared: new Date().toISOString().split('T')[0],
  unitCollege: 'Supreme Student Council',
  venue: '',
  department: 'Bachelor of Science in Information Technology',
  proposedBudget: 0,
  resultCode: '',
  budgetSource: 'SSC Special Trust Fund',
  dateOfImplementation: '',
  pdbYear: '2026',
  pdbIncluded: true,
  emailAddress: 'ssc@msun.edu.ph',
  durationDays: 1,
  objectives: ['Objective 1: Ensure successful execution and high student participation'],
  narrativeReport: '',

  // Step 2: Rating & Documentation
  accomplishmentRows: [
    {
      id: '1',
      objective: 'Objective 1: Execute programmed sessions and workshops',
      expectedOutput: '100% participation with complete documentation',
      actualAccomplishment: 'Achieved 100% attendee participation and complete workshop outputs',
      rating: '4 - Outstanding'
    }
  ],
  photoProofDriveLink: 'https://drive.google.com/drive/folders/msun-activity-proofs-2026',
  photoFiles: [],

  // Step 3: Evaluation & Remarks
  summaryOfEvaluations: 'Participants expressed high satisfaction (98% positive rating) regarding speaker domain mastery, venue comfort, and event organization.',
  remarksComments: 'Activity conducted smoothly according to the approved timeline and design guidelines.',
  nextStepsPlanOfAction: 'Standardize equipment pre-testing procedures 2 hours prior to future events.',
  attachments: [],

  // Legacy fallback fields
  actualAttendance: 120,
  attendanceSummary: '120 registered students attended in person.',
  keyOutcomes: 'Successfully executed all programmed sessions.',
  financialLiquidationSummary: 'Fully liquidated with official receipts.',
  challengesAndRecommendations: 'Minor audio setup delay resolved on site.',
  isCompleted: false
});

// Photo & Attachment Upload Handlers (Simulation)
const photoFileInput = ref<HTMLInputElement | null>(null);
const attachmentFileInput = ref<HTMLInputElement | null>(null);

const triggerPhotoUpload = () => photoFileInput.value?.click();
const triggerAttachmentUpload = () => attachmentFileInput.value?.click();

const handlePhotoUpload = (e: Event) => {
  const files = (e.target as HTMLInputElement).files;
  if (!files) return;
  for (let i = 0; i < files.length; i++) {
    form.value.photoFiles = form.value.photoFiles || [];
    form.value.photoFiles.push(files[i].name);
  }
};

const removePhoto = (index: number) => {
  form.value.photoFiles?.splice(index, 1);
};

const handleAttachmentUpload = (e: Event) => {
  const files = (e.target as HTMLInputElement).files;
  if (!files) return;
  for (let i = 0; i < files.length; i++) {
    form.value.attachments = form.value.attachments || [];
    form.value.attachments.push(files[i].name);
  }
};

const removeAttachment = (index: number) => {
  form.value.attachments?.splice(index, 1);
};

// Objectives management (Step 1)
const addObjective = () => {
  form.value.objectives = form.value.objectives || [];
  form.value.objectives.push(`Objective ${form.value.objectives.length + 1}`);
};

const removeObjective = (index: number) => {
  if ((form.value.objectives?.length || 0) > 1) {
    form.value.objectives?.splice(index, 1);
  }
};

// Accomplishment Table Rows management (Step 2)
const addAccomplishmentRow = () => {
  form.value.accomplishmentRows = form.value.accomplishmentRows || [];
  const nextNum = form.value.accomplishmentRows.length + 1;
  form.value.accomplishmentRows.push({
    id: String(Date.now()),
    objective: `Objective ${nextNum}`,
    expectedOutput: '',
    actualAccomplishment: '',
    rating: '4 - Outstanding'
  });
};

const removeAccomplishmentRow = (index: number) => {
  if ((form.value.accomplishmentRows?.length || 0) > 1) {
    form.value.accomplishmentRows?.splice(index, 1);
  }
};

// Sync form values when activity prop changes
watch(
  () => props.activity,
  (act) => {
    if (act) {
      const existing = act.accomplishmentForm;
      form.value = {
        activityTitle: existing?.activityTitle || act.title || '',
        controlNumber: existing?.controlNumber || `MSUN-${act.orgId || 'SSC'}-ACCOM-2026-REV`,
        officeCode: existing?.officeCode || 'OVCSAS-OSD-SSC',
        datePrepared: existing?.datePrepared || new Date().toISOString().split('T')[0],
        unitCollege: existing?.unitCollege || 'Supreme Student Council',
        venue: existing?.venue || act.venue || 'Enter venue location',
        department: existing?.department || 'Bachelor of Science in Information Technology',
        proposedBudget: existing?.proposedBudget ?? act.budget ?? 0,
        resultCode: existing?.resultCode || 'OPCR-2026-001',
        budgetSource: existing?.budgetSource || 'SSC Special Trust Fund',
        dateOfImplementation: existing?.dateOfImplementation || act.startDate || new Date().toISOString().split('T')[0],
        pdbYear: existing?.pdbYear || '2026',
        pdbIncluded: existing?.pdbIncluded ?? true,
        emailAddress: existing?.emailAddress || 'ssc@msun.edu.ph',
        durationDays: existing?.durationDays || 1,
        objectives: existing?.objectives?.length ? [...existing.objectives] : [
          `Objective 1: Successfully execute ${act.title || 'the planned activity'}`
        ],
        narrativeReport: existing?.narrativeReport || `The activity "${act.title}" was conducted successfully at ${act.venue} with active participation of students and advisers.`,
        
        accomplishmentRows: existing?.accomplishmentRows?.length ? [...existing.accomplishmentRows] : [
          {
            id: '1',
            objective: `Execute programmed sessions for ${act.title}`,
            expectedOutput: `${act.targetParticipants || 100} Target Participants`,
            actualAccomplishment: `Achieved full participation of ${act.targetParticipants || 100} attendees`,
            rating: '4 - Outstanding'
          }
        ],
        photoProofDriveLink: existing?.photoProofDriveLink || 'https://drive.google.com/drive/folders/msun-activity-proofs-2026',
        photoFiles: existing?.photoFiles ? [...existing.photoFiles] : ['activity_photo_documentation_1.jpg', 'activity_photo_documentation_2.jpg'],
        
        summaryOfEvaluations: existing?.summaryOfEvaluations || 'Participants rated the activity extremely high (98% satisfaction rating across organization, content, and execution).',
        remarksComments: existing?.remarksComments || 'Activity completed smoothly in accordance with institutional guidelines.',
        nextStepsPlanOfAction: existing?.nextStepsPlanOfAction || 'Standardize event preparation checklist for upcoming student activities.',
        attachments: existing?.attachments ? [...existing.attachments] : ['Financial_Liquidation_Receipts.pdf', 'Attendance_Sheet_Signed.pdf'],

        actualAttendance: existing?.actualAttendance || act.targetParticipants || 120,
        attendanceSummary: existing?.attendanceSummary || '120 registered students attended with 100% evaluation completion.',
        keyOutcomes: existing?.keyOutcomes || act.kpiOutcome || 'Successfully executed all programmed sessions.',
        financialLiquidationSummary: existing?.financialLiquidationSummary || `Planned: ₱${(act.budget || 0).toLocaleString()} | Spent: ₱${(act.budget || 0).toLocaleString()}`,
        challengesAndRecommendations: existing?.challengesAndRecommendations || 'No major issues encountered.',
        submittedBy: existing?.submittedBy || act.proposedBy,
        submittedDate: existing?.submittedDate || new Date().toISOString().split('T')[0],
        isCompleted: existing?.isCompleted ?? false
      };
    }
  },
  { immediate: true }
);

const handleNext = () => {
  if (currentStep.value < 4) {
    currentStep.value += 1;
  }
};

const handlePrev = () => {
  if (currentStep.value > 1) {
    currentStep.value -= 1;
  }
};

const handleSave = () => {
  form.value.isCompleted = true;
  form.value.submittedDate = new Date().toISOString().split('T')[0];
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
        <Award class="w-5 h-5" />
      </div>

      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
            Step {{ currentStep }} of 4
          </span>
          <span class="text-[10px] text-slate-400 truncate">{{ activity.id }}</span>
        </div>
        <p class="text-xs font-bold text-white truncate mt-0.5">
          Activity Accomplishment Report
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
              <Award class="w-4 h-4" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                  MSUN Official Form
                </span>
                <span class="text-[11px] text-slate-400">{{ activity.id }}</span>
              </div>
              <h3 class="text-sm sm:text-base font-extrabold text-white leading-tight">
                Activity Accomplishment Report
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
                <Calendar v-else class="w-4 h-4" />
              </div>
              <span 
                class="text-[11px] font-bold mt-1.5 transition-colors"
                :class="currentStep === 2 ? 'text-blue-900' : 'text-slate-500'"
              >
                Rating & Documentation
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
                <DollarSign v-else class="w-4 h-4" />
              </div>
              <span 
                class="text-[11px] font-bold mt-1.5 transition-colors"
                :class="currentStep === 3 ? 'text-blue-900' : 'text-slate-500'"
              >
                Evaluation & Remarks
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
                  <option value="Department of Computer Science">Department of Computer Science</option>
                  <option value="Department of Information Systems">Department of Information Systems</option>
                  <option value="Department of Civil Engineering">Department of Civil Engineering</option>
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
                  v-model="form.dateOfImplementation"
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
                      v-model="form.pdbYear"
                      :disabled="readOnly"
                      placeholder="2026"
                      class="w-20 px-2 py-1 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900 text-center font-bold"
                    />
                  </div>
                  <div class="flex items-center gap-3">
                    <label class="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        :value="true"
                        v-model="form.pdbIncluded"
                        :disabled="readOnly"
                        class="text-blue-900 focus:ring-blue-900"
                      />
                      <span>Yes</span>
                    </label>
                    <label class="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        :value="false"
                        v-model="form.pdbIncluded"
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
                  type="number"
                  v-model="form.durationDays"
                  :disabled="readOnly"
                  placeholder="Enter duration"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-slate-50 font-medium"
                />
              </div>
            </div>

            <!-- Dynamic Objectives Section -->
            <div class="space-y-2 text-xs pt-2">
              <label class="block font-bold text-slate-700">Objectives *</label>
              <div 
                v-for="(obj, index) in form.objectives" 
                :key="index"
                class="flex items-center gap-2 mb-2"
              >
                <input
                  type="text"
                  v-model="form.objectives![index]"
                  :disabled="readOnly"
                  :placeholder="`Objective ${index + 1}`"
                  class="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-slate-50 font-medium"
                />
                <button
                  v-if="!readOnly && (form.objectives?.length || 0) > 1"
                  @click="removeObjective(index)"
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

            <!-- Narrative Report -->
            <div class="text-xs pt-2">
              <label class="block font-bold text-slate-700 mb-1">Narrative Report *</label>
              <textarea
                v-model="form.narrativeReport"
                :disabled="readOnly"
                rows="4"
                placeholder="Provide a detailed narrative of the activity implementation"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-slate-50 font-medium"
              ></textarea>
              <div class="text-[11px] text-slate-400 mt-1 text-right">
                {{ form.narrativeReport?.length || 0 }}/5000 characters
              </div>
            </div>
          </div>


          <!-- ==================== STEP 2: RATING & DOCUMENTATION ==================== -->
          <div v-else-if="currentStep === 2" class="space-y-6 animate-in fade-in duration-200">
            <!-- Actual Accomplishment Section -->
            <div class="space-y-4">
              <div class="flex items-center gap-2 border-b border-slate-200 pb-2.5">
                <TableIcon class="w-5 h-5 text-blue-900" />
                <h4 class="text-base font-extrabold text-slate-900">Actual Accomplishment</h4>
              </div>

              <!-- Table -->
              <div class="overflow-x-auto border border-slate-200 rounded-xl">
                <table class="w-full text-xs text-left">
                  <thead class="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th class="p-3 w-1/4">Objective</th>
                      <th class="p-3 w-1/4">Expected Output</th>
                      <th class="p-3 w-1/4">Actual Accomplishment</th>
                      <th class="p-3 w-1/4">Rating (1-4)</th>
                      <th v-if="!readOnly" class="p-3 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-200">
                    <tr 
                      v-for="(row, idx) in form.accomplishmentRows" 
                      :key="row.id || idx"
                      class="hover:bg-slate-50/50"
                    >
                      <td class="p-2.5">
                        <input
                          type="text"
                          v-model="row.objective"
                          :disabled="readOnly"
                          placeholder="Enter objective"
                          class="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900"
                        />
                      </td>
                      <td class="p-2.5">
                        <input
                          type="text"
                          v-model="row.expectedOutput"
                          :disabled="readOnly"
                          placeholder="Expected Output"
                          class="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900"
                        />
                      </td>
                      <td class="p-2.5">
                        <input
                          type="text"
                          v-model="row.actualAccomplishment"
                          :disabled="readOnly"
                          placeholder="Actual Result"
                          class="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900"
                        />
                      </td>
                      <td class="p-2.5">
                        <select
                          v-model="row.rating"
                          :disabled="readOnly"
                          class="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white font-semibold text-slate-800"
                        >
                          <option value="4 - Outstanding">4 - Outstanding (Fully Achieved)</option>
                          <option value="3 - Largely Achieved">3 - Largely Achieved</option>
                          <option value="2 - Partially Achieved">2 - Partially Achieved</option>
                          <option value="1 - Not Achieved">1 - Not Achieved</option>
                        </select>
                      </td>
                      <td v-if="!readOnly" class="p-2.5 text-center">
                        <button
                          @click="removeAccomplishmentRow(idx)"
                          title="Remove Row"
                          class="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100 transition-colors"
                        >
                          <Trash2 class="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Add Row Button & Legend -->
              <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-1">
                <button
                  v-if="!readOnly"
                  @click="addAccomplishmentRow"
                  type="button"
                  class="inline-flex items-center gap-1.5 text-xs font-bold text-blue-900 hover:text-blue-700 cursor-pointer"
                >
                  <Plus class="w-4 h-4" />
                  <span>Add Row</span>
                </button>

                <div class="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 space-y-0.5">
                  <div class="font-bold text-slate-700">Legend:</div>
                  <div class="grid grid-cols-2 gap-x-4 gap-y-0.5">
                    <span>4 - Fully Achieved / Outstanding</span>
                    <span>3 - Largely Achieved</span>
                    <span>2 - Partially Achieved</span>
                    <span>1 - Not Achieved</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Photo Documentation Section -->
            <div class="space-y-4 pt-2">
              <div class="flex items-center gap-2 border-b border-slate-200 pb-2.5">
                <ImageIcon class="w-5 h-5 text-blue-900" />
                <h4 class="text-base font-extrabold text-slate-900">Photo Documentation</h4>
              </div>

              <input
                ref="photoFileInput"
                type="file"
                multiple
                accept="image/*"
                class="hidden"
                @change="handlePhotoUpload"
              />

              <!-- Upload Drag Zone -->
              <div
                @click="triggerPhotoUpload"
                class="border-2 border-dashed border-blue-200 hover:border-blue-500 bg-blue-50/30 hover:bg-blue-50/60 rounded-2xl p-8 text-center cursor-pointer transition-colors"
              >
                <div class="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-xs">
                  <UploadCloud class="w-6 h-6" />
                </div>
                <p class="text-xs font-bold text-slate-800">Click to upload photos</p>
                <p class="text-[11px] text-slate-400 mt-1">PNG, JPG up to 100MB each</p>
              </div>

              <!-- Uploaded Photos List -->
              <div v-if="form.photoFiles && form.photoFiles.length > 0" class="space-y-2">
                <span class="text-xs font-bold text-slate-700">Uploaded Photos:</span>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div
                    v-for="(photo, pIdx) in form.photoFiles"
                    :key="pIdx"
                    class="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <div class="flex items-center gap-2 truncate">
                      <ImageIcon class="w-4 h-4 text-blue-600 shrink-0" />
                      <span class="truncate font-medium text-slate-800">{{ photo }}</span>
                    </div>
                    <button
                      v-if="!readOnly"
                      @click.stop="removePhoto(pIdx)"
                      class="text-slate-400 hover:text-red-500 p-1 rounded"
                    >
                      <X class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>


          <!-- ==================== STEP 3: EVALUATION & REMARKS ==================== -->
          <div v-else-if="currentStep === 3" class="space-y-5 animate-in fade-in duration-200">
            <div class="flex items-center gap-2 border-b border-slate-200 pb-2.5">
              <CheckSquare class="w-5 h-5 text-blue-900" />
              <h4 class="text-base font-extrabold text-slate-900">Evaluations and Remarks</h4>
            </div>

            <!-- Summary of Evaluations -->
            <div class="text-xs space-y-1">
              <label class="block font-bold text-slate-700">Summary of Evaluations *</label>
              <textarea
                v-model="form.summaryOfEvaluations"
                :disabled="readOnly"
                rows="4"
                placeholder="Summarize participants evaluations and feedback"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-slate-50 font-medium"
              ></textarea>
              <div class="text-[11px] text-slate-400 text-right">
                {{ form.summaryOfEvaluations?.length || 0 }}/5000 characters
              </div>
            </div>

            <!-- Remarks/Comments/Suggestion -->
            <div class="text-xs space-y-1">
              <label class="block font-bold text-slate-700">Remarks/Comments/Suggestion:n/a *</label>
              <textarea
                v-model="form.remarksComments"
                :disabled="readOnly"
                rows="4"
                placeholder="Provide remarks, comments, or suggestions"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-slate-50 font-medium"
              ></textarea>
              <div class="text-[11px] text-slate-400 text-right">
                {{ form.remarksComments?.length || 0 }}/5000 characters
              </div>
            </div>

            <!-- Next Steps / Plan of Action -->
            <div class="text-xs space-y-1">
              <label class="block font-bold text-slate-700">Next Steps/ Plan of Action:n/a *</label>
              <textarea
                v-model="form.nextStepsPlanOfAction"
                :disabled="readOnly"
                rows="4"
                placeholder="Outline next steps and action plans"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:bg-slate-50 font-medium"
              ></textarea>
              <div class="text-[11px] text-slate-400 text-right">
                {{ form.nextStepsPlanOfAction?.length || 0 }}/5000 characters
              </div>
            </div>

            <!-- Attachments (Optional) -->
            <div class="text-xs space-y-3 pt-2">
              <label class="block font-bold text-slate-700">Attachments (Optional)</label>

              <input
                ref="attachmentFileInput"
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg"
                class="hidden"
                @change="handleAttachmentUpload"
              />

              <div
                @click="triggerAttachmentUpload"
                class="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/50 hover:bg-slate-50 rounded-2xl p-6 text-center cursor-pointer transition-colors"
              >
                <div class="w-10 h-10 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-xs">
                  <UploadCloud class="w-5 h-5" />
                </div>
                <p class="text-xs font-bold text-slate-800">Click to upload or drag and drop</p>
                <p class="text-[11px] text-slate-400 mt-1">PDF, DOC, DOCX, XLS, XLSX, PNG, JPG (max 10MB)</p>
              </div>

              <!-- Uploaded Attachments List -->
              <div v-if="form.attachments && form.attachments.length > 0" class="space-y-2">
                <span class="text-xs font-bold text-slate-700">Attached Documents:</span>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div
                    v-for="(att, aIdx) in form.attachments"
                    :key="aIdx"
                    class="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <div class="flex items-center gap-2 truncate">
                      <Paperclip class="w-4 h-4 text-blue-600 shrink-0" />
                      <span class="truncate font-medium text-slate-800">{{ att }}</span>
                    </div>
                    <button
                      v-if="!readOnly"
                      @click.stop="removeAttachment(aIdx)"
                      class="text-slate-400 hover:text-red-500 p-1 rounded"
                    >
                      <X class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>


          <!-- ==================== STEP 4: REVIEW & SUBMIT ==================== -->
          <div v-else-if="currentStep === 4" class="space-y-6 animate-in fade-in duration-200">
            <div class="flex items-center gap-2 border-b border-slate-200 pb-2.5">
              <CheckCircle2 class="w-5 h-5 text-blue-900" />
              <h4 class="text-base font-extrabold text-slate-900">Review & Submit</h4>
            </div>

            <!-- Basic Information Summary -->
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
                <div><span class="text-slate-500 block text-[11px]">Department:</span> <span class="text-slate-800">{{ form.department }}</span></div>
                <div><span class="text-slate-500 block text-[11px]">Proposed Budget:</span> <strong class="text-slate-900 font-bold">₱{{ Number(form.proposedBudget).toLocaleString() }}</strong></div>
                <div><span class="text-slate-500 block text-[11px]">Result Code:</span> <span class="text-slate-800">{{ form.resultCode }}</span></div>
                <div><span class="text-slate-500 block text-[11px]">Budget Source:</span> <span class="text-slate-800">{{ form.budgetSource }}</span></div>
                <div><span class="text-slate-500 block text-[11px]">Date of Implementation:</span> <span class="text-slate-800">{{ form.dateOfImplementation }}</span></div>
                <div><span class="text-slate-500 block text-[11px]">Included in the PDB:</span> <span class="text-slate-800">Year: {{ form.pdbYear }}, Status: {{ form.pdbIncluded ? 'Yes' : 'No' }}</span></div>
                <div><span class="text-slate-500 block text-[11px]">Email Address:</span> <span class="text-slate-800">{{ form.emailAddress }}</span></div>
                <div><span class="text-slate-500 block text-[11px]">Duration:</span> <span class="text-slate-800">{{ form.durationDays }} day(s)</span></div>
              </div>

              <!-- Objectives summary -->
              <div class="pt-2">
                <span class="text-slate-500 block text-[11px] mb-1">Objectives:</span>
                <ul class="list-disc list-inside space-y-0.5 text-slate-800">
                  <li v-for="(obj, i) in form.objectives" :key="i">{{ obj }}</li>
                </ul>
              </div>

              <!-- Narrative report summary -->
              <div class="pt-2">
                <span class="text-slate-500 block text-[11px] mb-1">Narrative Report:</span>
                <p class="text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200/80 whitespace-pre-line">{{ form.narrativeReport }}</p>
              </div>
            </div>

            <!-- Rating & Documentation Summary -->
            <div class="bg-slate-50/80 border border-slate-200/90 rounded-xl p-4 text-xs space-y-3">
              <h5 class="font-bold text-slate-900 border-b border-slate-200 pb-2 flex items-center justify-between">
                <span>Rating & Documentation</span>
                <button @click="currentStep = 2" class="text-blue-900 hover:underline text-[11px]">Edit</button>
              </h5>

              <div class="overflow-x-auto border border-slate-200 rounded-lg bg-white">
                <table class="w-full text-left text-[11px]">
                  <thead class="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
                    <tr>
                      <th class="p-2">Objective</th>
                      <th class="p-2">Expected Output</th>
                      <th class="p-2">Actual Accomplishment</th>
                      <th class="p-2">Rating (1-4)</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    <tr v-for="(row, rIdx) in form.accomplishmentRows" :key="rIdx">
                      <td class="p-2 font-medium">{{ row.objective }}</td>
                      <td class="p-2 text-slate-600">{{ row.expectedOutput }}</td>
                      <td class="p-2 text-slate-600">{{ row.actualAccomplishment }}</td>
                      <td class="p-2 font-bold text-blue-900">{{ row.rating }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div v-if="form.photoFiles && form.photoFiles.length > 0" class="pt-1">
                <span class="text-slate-500 block text-[11px] mb-1">Photos Uploaded:</span>
                <div class="flex flex-wrap gap-1.5">
                  <span 
                    v-for="(p, pi) in form.photoFiles" 
                    :key="pi"
                    class="px-2 py-0.5 bg-blue-50 text-blue-800 rounded border border-blue-200 text-[11px]"
                  >
                    📷 {{ p }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Evaluation & Remarks Summary -->
            <div class="bg-slate-50/80 border border-slate-200/90 rounded-xl p-4 text-xs space-y-3">
              <h5 class="font-bold text-slate-900 border-b border-slate-200 pb-2 flex items-center justify-between">
                <span>Evaluation & Remarks</span>
                <button @click="currentStep = 3" class="text-blue-900 hover:underline text-[11px]">Edit</button>
              </h5>

              <div class="space-y-2">
                <div><span class="text-slate-500 block text-[11px]">Summary of Evaluations:</span> <p class="text-slate-800 bg-white p-2 rounded border border-slate-200/80">{{ form.summaryOfEvaluations }}</p></div>
                <div><span class="text-slate-500 block text-[11px]">Remarks/Comments/Suggestion:</span> <p class="text-slate-800 bg-white p-2 rounded border border-slate-200/80">{{ form.remarksComments }}</p></div>
                <div><span class="text-slate-500 block text-[11px]">Next Steps/ Plan of Action:</span> <p class="text-slate-800 bg-white p-2 rounded border border-slate-200/80">{{ form.nextStepsPlanOfAction }}</p></div>
                <div v-if="form.attachments && form.attachments.length > 0">
                  <span class="text-slate-500 block text-[11px] mb-1">Attachments:</span>
                  <div class="flex flex-wrap gap-1.5">
                    <span 
                      v-for="(a, ai) in form.attachments" 
                      :key="ai"
                      class="px-2 py-0.5 bg-slate-100 text-slate-800 rounded border border-slate-200 text-[11px]"
                    >
                      📎 {{ a }}
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
            @click="handlePrev"
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
              @click="handleNext"
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
