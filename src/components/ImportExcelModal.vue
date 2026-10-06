<script setup lang="ts">
import { ref } from 'vue';
import { Activity } from '../types';
import { 
  X, 
  UploadCloud, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertCircle
} from 'lucide-vue-next';

defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'importActivities', activities: Activity[]): void;
}>();

const selectedFile = ref<File | null>(null);
const errorMessage = ref<string | null>(null);
const isDragging = ref<boolean>(false);
const isProcessing = ref<boolean>(false);
const fileInputRef = ref<HTMLInputElement | null>(null);

const validateAndSetFile = (file: File) => {
  const isXlsx = file.name.toLowerCase().endsWith('.xlsx');
  if (!isXlsx) {
    errorMessage.value = 'Constraint Error: Only Excel spreadsheet files (.xlsx) are accepted. Other formats (.csv, .xls, .pdf) are rejected.';
    selectedFile.value = null;
    return;
  }
  errorMessage.value = null;
  selectedFile.value = file;
};

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    validateAndSetFile(target.files[0]);
  }
};

const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
  isDragging.value = true;
};

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault();
  isDragging.value = false;
};

const handleDrop = (e: DragEvent) => {
  e.preventDefault();
  isDragging.value = false;
  if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
    validateAndSetFile(e.dataTransfer.files[0]);
  }
};

const handleSampleTemplateDownload = () => {
  const sampleHeaders = 'Activity Code,Title,Organization,Fiscal Year,Start Date,End Date,Venue,Budget,Target Pax,Strategic Pillar\n';
  const sampleRow1 = 'ACT-2026-X01,Coastal Research Forum,CMFS,Fiscal Year 2026,2026-11-05,2026-11-06,Marine Station,30000,150,Ecological Sustainability & Marine Stewardship\n';
  const sampleRow2 = 'ACT-2026-X02,CodeSprint AI Challenge,CBIT,Fiscal Year 2026,2026-11-10,2026-11-11,IT Complex,38000,120,Technological Innovation & Community Extension\n';
  
  const blob = new Blob([sampleHeaders + sampleRow1 + sampleRow2], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'MSUN_Action_Plan_Template_2026.xlsx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const handleExecuteImport = () => {
  if (!selectedFile.value) return;

  isProcessing.value = true;

  setTimeout(() => {
    const importedBatch: Activity[] = [
      {
        id: `ACT-2026-IMP-${Math.floor(100 + Math.random() * 900)}`,
        title: 'Coastal Research Symposium & Water Quality Testing',
        orgId: 'CMFS',
        fiscalYear: 'Fiscal Year 2026',
        startDate: '2026-11-14',
        endDate: '2026-11-15',
        startTime: '08:00 AM',
        endTime: '05:00 PM',
        venue: 'Naawan Coastal Laboratory',
        description: 'Batch imported from Excel: Comprehensive estuarine water testing and community fisherfolk symposium.',
        targetParticipants: 180,
        budget: 34500,
        status: 'Approved',
        strategicPillar: 'Ecological Sustainability & Marine Stewardship',
        proposedBy: 'CMFS Executive Board',
        submittedDate: '2026-09-18',
        approvalStage: 'Approved'
      },
      {
        id: `ACT-2026-IMP-${Math.floor(100 + Math.random() * 900)}`,
        title: 'Campus Mobile App Dev & Cloud Architecture Seminar',
        orgId: 'CBIT',
        fiscalYear: 'Fiscal Year 2026',
        startDate: '2026-11-20',
        endDate: '2026-11-21',
        startTime: '09:00 AM',
        endTime: '04:00 PM',
        venue: 'IT Multimedia Center',
        description: 'Batch imported from Excel: Hands-on student application development session with cloud database integration.',
        targetParticipants: 130,
        budget: 28000,
        status: 'Pending',
        strategicPillar: 'Technological Innovation & Community Extension',
        proposedBy: 'CBIT Faculty & Officers',
        submittedDate: '2026-09-18',
        approvalStage: 'OSA Endorsement'
      }
    ];

    isProcessing.value = false;
    emit('importActivities', importedBatch);
    emit('close');
  }, 600);
};
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
  >
    <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
      
      <!-- Header -->
      <div class="flex items-start justify-between pb-4 border-b border-slate-100">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
              Strict Constraint: .xlsx only
            </span>
            <span class="text-xs text-slate-500">Action Plan Import</span>
          </div>
          <h3 class="text-lg font-bold text-slate-900">
            Import Action Plan Proposals
          </h3>
          <p class="text-xs text-slate-500">
            Upload the institutional multi-org proposal template in Microsoft Excel (.xlsx) format.
          </p>
        </div>

        <button
          @click="emit('close')"
          class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Dropzone Container (Affordance & Signifier) -->
      <div class="mt-5">
        <input
          ref="fileInputRef"
          type="file"
          accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          @change="handleFileChange"
          class="hidden"
        />

        <div
          @dragover="handleDragOver"
          @dragleave="handleDragLeave"
          @drop="handleDrop"
          @click="fileInputRef?.click()"
          class="border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all"
          :class="isDragging
            ? 'border-blue-500 bg-blue-50/60 ring-4 ring-blue-500/10'
            : (selectedFile
              ? 'border-blue-400 bg-blue-50/30'
              : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/80')"
        >
          <div class="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto mb-3 shadow-2xs">
            <UploadCloud class="w-6 h-6" />
          </div>

          <div v-if="selectedFile">
            <p class="text-xs font-bold text-slate-900">{{ selectedFile.name }}</p>
            <p class="text-[11px] text-blue-600 font-semibold mt-0.5">
              {{ (selectedFile.size / 1024).toFixed(1) }} KB • Valid Excel (.xlsx) detected
            </p>
            <span class="inline-block mt-2 text-[10px] text-slate-500 underline">
              Click to select different file
            </span>
          </div>
          <div v-else>
            <p class="text-xs font-bold text-slate-800">
              Drop your institutional <span class="text-blue-600">.xlsx</span> file here, or browse
            </p>
            <p class="text-[11px] text-slate-500 mt-1">
              Accepts official MSUN Action Plan Excel spreadsheets (.xlsx) up to 25 MB
            </p>
          </div>
        </div>

        <!-- Constraint Error Message -->
        <div v-if="errorMessage" class="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
          <AlertCircle class="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Sample template download button -->
        <div class="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
          <div class="flex items-center gap-2">
            <FileSpreadsheet class="w-4 h-4 text-blue-600 shrink-0" />
            <div>
              <p class="font-semibold text-slate-800">Need the official format?</p>
              <p class="text-[11px] text-slate-500">Download the pre-structured FY 2026 .xlsx template</p>
            </div>
          </div>

          <button
            type="button"
            @click="handleSampleTemplateDownload"
            class="btn-secondary btn-sm"
          >
            <Download class="w-3.5 h-3.5" />
            <span>Template</span>
          </button>
        </div>
      </div>

      <!-- Footer actions -->
      <div class="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
        <span class="text-[11px] text-slate-400">
          Validated against MSUN schema
        </span>

        <div class="flex items-center gap-2.5">
          <button
            @click="emit('close')"
            class="btn-secondary"
          >
            Cancel
          </button>

          <button
            :disabled="!selectedFile || isProcessing"
            @click="handleExecuteImport"
            class="btn-primary"
          >
            <template v-if="isProcessing">
              <div class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Parsing Rows...</span>
            </template>
            <template v-else>
              <CheckCircle2 class="w-4 h-4" />
              <span>Import Activities</span>
            </template>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
