<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Activity } from '../types';
import { 
  X, 
  UploadCloud, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  Link as LinkIcon,
  Globe,
  Sparkles
} from 'lucide-vue-next';
import { 
  downloadActionPlanTemplate, 
  parseActionPlanXlsxFile, 
  fetchAndParseGoogleSheet,
  getOfficialCfmsActivities
} from '../utils/actionPlanExcel';
import { isSameOrg } from '../utils/organizationUtils';

const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    defaultOrgId?: string;
    fiscalYear?: string;
  }>(),
  {
    defaultOrgId: 'SENSSO',
    fiscalYear: 'Fiscal Year 2027'
  }
);

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'importActivities', activities: Activity[]): void;
}>();

const isCfms = computed(() => isSameOrg(props.defaultOrgId, 'CFMS'));
const isSensso = computed(() => isSameOrg(props.defaultOrgId, 'SENSSO'));

const activeTab = ref<'google_sheet' | 'file_upload'>('file_upload');

// Google Sheets import state
const officialSenssoUrl = 'https://docs.google.com/spreadsheets/d/1uPSuwPgyCQcyy88zdVIpS-KOPPPlSQPi/edit?usp=sharing&ouid=116715798361352386251&rtpof=true&sd=true';
const officialCfmsUrl = 'https://docs.google.com/spreadsheets/d/1MdspYgHFLC4cgR3Zk4hurWZhDO12hqF77MXrTUb-rc8/edit?usp=sharing';
const googleSheetUrl = ref<string>('');

// File upload state
const selectedFile = ref<File | null>(null);
const errorMessage = ref<string | null>(null);
const isDragging = ref<boolean>(false);
const isProcessing = ref<boolean>(false);
const fileInputRef = ref<HTMLInputElement | null>(null);
const isDownloadingTemplate = ref<boolean>(false);

watch(
  () => [props.isOpen, props.defaultOrgId],
  ([open, org]) => {
    if (open) {
      errorMessage.value = null;
      selectedFile.value = null;
      if (isSameOrg(org as string, 'CFMS')) {
        googleSheetUrl.value = officialCfmsUrl;
        activeTab.value = 'google_sheet';
      } else if (isSameOrg(org as string, 'SENSSO')) {
        googleSheetUrl.value = officialSenssoUrl;
        activeTab.value = 'google_sheet';
      } else {
        googleSheetUrl.value = '';
        activeTab.value = 'file_upload';
      }
    }
  },
  { immediate: true }
);

const setSenssoPreset = () => {
  googleSheetUrl.value = officialSenssoUrl;
  errorMessage.value = null;
};

const setCfmsPreset = () => {
  googleSheetUrl.value = officialCfmsUrl;
  errorMessage.value = null;
};

const handleLoadOfficialCfmsPreset = () => {
  isProcessing.value = true;
  errorMessage.value = null;
  try {
    const cfmsActivities = getOfficialCfmsActivities(props.fiscalYear || 'Fiscal Year 2027');
    emit('importActivities', cfmsActivities);
    emit('close');
  } catch (err: any) {
    errorMessage.value = err?.message || 'Failed to load official CFMS Action Plan.';
  } finally {
    isProcessing.value = false;
  }
};

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

const handleSampleTemplateDownload = async () => {
  try {
    isDownloadingTemplate.value = true;
    errorMessage.value = null;
    const org = props.defaultOrgId || 'CFMS';
    const fy = props.fiscalYear || 'Fiscal Year 2027';
    const filename = `MSUN_Action_Plan_Template_${org}_${fy.replace(/\s+/g, '_')}.xlsx`;
    await downloadActionPlanTemplate(filename, org, fy);
  } catch (err: any) {
    console.error('Failed to download Excel template:', err);
    errorMessage.value = 'Failed to generate official Excel template. Please try again.';
  } finally {
    isDownloadingTemplate.value = false;
  }
};

const handleExecuteGoogleSheetImport = async () => {
  if (!googleSheetUrl.value.trim()) {
    errorMessage.value = 'Please provide a valid Google Sheet URL.';
    return;
  }

  isProcessing.value = true;
  errorMessage.value = null;

  try {
    const importedActivities = await fetchAndParseGoogleSheet(
      googleSheetUrl.value.trim(),
      props.defaultOrgId,
      props.fiscalYear
    );
    isProcessing.value = false;
    emit('importActivities', importedActivities);
    emit('close');
  } catch (err: any) {
    isProcessing.value = false;
    errorMessage.value = err?.message || 'Error processing Google Sheet. Ensure the spreadsheet is publicly viewable with link sharing enabled.';
  }
};

const handleExecuteFileImport = async () => {
  if (!selectedFile.value) return;

  isProcessing.value = true;
  errorMessage.value = null;

  try {
    const importedActivities = await parseActionPlanXlsxFile(
      selectedFile.value,
      props.defaultOrgId,
      props.fiscalYear
    );
    isProcessing.value = false;
    emit('importActivities', importedActivities);
    emit('close');
  } catch (err: any) {
    isProcessing.value = false;
    errorMessage.value = err?.message || 'Error processing Excel spreadsheet. Please ensure the file is a valid .xlsx file.';
  }
};
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
  >
    <div class="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto my-auto">
      
      <!-- Header -->
      <div class="flex items-start justify-between pb-4 border-b border-slate-100 gap-2">
        <div class="min-w-0">
          <div class="flex items-center gap-2 mb-1 flex-wrap">
            <span class="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
              Action Plan Integration
            </span>
            <span class="text-xs text-slate-500">{{ defaultOrgId }} • {{ fiscalYear }}</span>
          </div>
          <h3 class="text-base sm:text-lg font-bold text-slate-900">
            Import Action Plan Activities
          </h3>
          <p class="text-xs text-slate-500">
            Load approved or proposed organizational activity matrices directly into MSUN PMAMS.
          </p>
        </div>

        <button
          @click="emit('close')"
          class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- CFMS / FIMSSO Dedicated Preset Card -->
      <div v-if="isCfms" class="mt-4 p-3.5 bg-blue-50/90 border border-blue-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div class="flex items-start gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            <Sparkles class="w-4 h-4" />
          </div>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h4 class="text-xs font-bold text-blue-950">Official CFMS / FIMSSO Action Plan</h4>
              <span class="text-[10px] font-bold bg-blue-200 text-blue-900 px-1.5 py-0.5 rounded">FY 2027 Ready</span>
            </div>
            <p class="text-[11px] text-blue-800 mt-0.5 leading-relaxed">
              Instantly load all 10 approved CFMS activities (₱89,150.00 total) including Pagdunggo 2027, AquaFest, Aquatic Synergy, and coastal initiatives.
            </p>
          </div>
        </div>
        <button
          type="button"
          @click="handleLoadOfficialCfmsPreset"
          :disabled="isProcessing"
          class="w-full sm:w-auto justify-center shrink-0 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <CheckCircle2 class="w-3.5 h-3.5" />
          <span>Load Plan</span>
        </button>
      </div>

      <!-- Import Mode Tabs -->
      <div class="flex items-center gap-2 mt-4 p-1 bg-slate-100 rounded-xl">
        <button
          type="button"
          @click="activeTab = 'file_upload'; errorMessage = null"
          class="flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
          :class="activeTab === 'file_upload' 
            ? 'bg-white text-blue-900 shadow-xs' 
            : 'text-slate-600 hover:text-slate-900'"
        >
          <FileSpreadsheet class="w-4 h-4 text-blue-600" />
          <span>Upload Excel (.xlsx)</span>
        </button>

        <button
          type="button"
          @click="activeTab = 'google_sheet'; errorMessage = null"
          class="flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
          :class="activeTab === 'google_sheet' 
            ? 'bg-white text-blue-900 shadow-xs' 
            : 'text-slate-600 hover:text-slate-900'"
        >
          <Globe class="w-4 h-4 text-emerald-600" />
          <span>Google Sheets Link</span>
        </button>
      </div>

      <!-- Tab 1: Google Sheets URL Import -->
      <div v-if="activeTab === 'google_sheet'" class="mt-4 space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5">
            Google Sheets Spreadsheet Link:
          </label>
          <div class="relative">
            <LinkIcon class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              v-model="googleSheetUrl"
              placeholder="https://docs.google.com/spreadsheets/d/..."
              class="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
            />
          </div>
        </div>

        <!-- Quick preset helper badge for CFMS -->
        <div v-if="isCfms" class="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-1.5 text-xs font-bold text-blue-900">
              <Sparkles class="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>CFMS FY 2027 Official Sheet Ready</span>
            </div>
            <button
              type="button"
              @click="setCfmsPreset"
              class="text-[11px] font-semibold text-blue-700 hover:text-blue-900 underline shrink-0 cursor-pointer"
            >
              Reset to CFMS Link
            </button>
          </div>
          <p class="text-[11px] text-blue-700 mt-1 leading-relaxed">
            Parses all 10 genuine CFMS activities (₱89,150.00 total) with aggregated line items and schedules matching your Google Sheet.
          </p>
        </div>

        <!-- Quick preset helper badge (for SENSSO) -->
        <div v-else-if="isSensso" class="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
              <Sparkles class="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>SENSSO FY 2027 Official Sheet Ready</span>
            </div>
            <button
              type="button"
              @click="setSenssoPreset"
              class="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 underline shrink-0 cursor-pointer"
            >
              Reset to SENSSO Link
            </button>
          </div>
          <p class="text-[11px] text-emerald-700 mt-1 leading-relaxed">
            Parses all 12 genuine activities (₱284,010.00 total) with unsubmitted status so they can be submitted through the required approval stages.
          </p>
        </div>

        <!-- General info for other councils -->
        <div v-else class="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 leading-relaxed">
          Paste any viewable Google Sheet link containing your council's Action Plan matrix. The system will automatically detect the organization, fiscal year, column layout, and schedule.
        </div>

        <!-- Constraint Error Message -->
        <div v-if="errorMessage" class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
          <AlertCircle class="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{{ errorMessage }}</span>
        </div>
      </div>

      <!-- Tab 2: Upload Excel (.xlsx) File -->
      <div v-else class="mt-4">
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
              Supports Google Sheets exports and official MSUN Action Plan templates
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
              <p class="font-semibold text-slate-800">Need the standard format?</p>
              <p class="text-[11px] text-slate-500">Download official MSUN Action Plan Excel template (.xlsx)</p>
            </div>
          </div>

          <button
            type="button"
            :disabled="isDownloadingTemplate"
            @click="handleSampleTemplateDownload"
            class="btn-secondary btn-sm"
          >
            <div v-if="isDownloadingTemplate" class="w-3.5 h-3.5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
            <Download v-else class="w-3.5 h-3.5" />
            <span>{{ isDownloadingTemplate ? 'Generating...' : 'Template' }}</span>
          </button>
        </div>
      </div>

      <!-- Footer actions -->
      <div class="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
        <span class="text-[11px] text-slate-400">
          Automatic Header &amp; Budget Extraction
        </span>

        <div class="flex items-center gap-2.5">
          <button
            @click="emit('close')"
            class="btn-secondary"
          >
            Cancel
          </button>

          <!-- Google Sheet Import Button -->
          <button
            v-if="activeTab === 'google_sheet'"
            :disabled="!googleSheetUrl.trim() || isProcessing"
            @click="handleExecuteGoogleSheetImport"
            class="btn-primary"
          >
            <template v-if="isProcessing">
              <div class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Reading Sheet...</span>
            </template>
            <template v-else>
              <CheckCircle2 class="w-4 h-4" />
              <span>Fetch &amp; Import</span>
            </template>
          </button>

          <!-- File Upload Import Button -->
          <button
            v-else
            :disabled="!selectedFile || isProcessing"
            @click="handleExecuteFileImport"
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
