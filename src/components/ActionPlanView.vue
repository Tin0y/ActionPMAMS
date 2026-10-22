<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Activity, OrgId, UserAccount } from '../types';
import { ORGANIZATIONS, getOrgTheme } from '../data/initialData';
import { isSameOrg } from '../utils/organizationUtils';
import OrgBadge from './OrgBadge.vue';
import { 
  UploadCloud, 
  Download, 
  Printer, 
  Building2,
  FileSpreadsheet
} from 'lucide-vue-next';
import { exportActionPlanTableXlsx } from '../utils/actionPlanExcel';

const props = withDefaults(
  defineProps<{
    activities: Activity[];
    selectedOrgFilter?: OrgId | 'ALL';
    currentUser?: UserAccount;
  }>(),
  {
    selectedOrgFilter: 'CBIT'
  }
);

const emit = defineEmits<{
  (e: 'addActivityClick'): void;
  (e: 'importClick'): void;
  (e: 'selectActivity', activity: Activity): void;
  (e: 'toggleStatus', activityId: string): void;
  (e: 'selectOrgFilter', org: OrgId | 'ALL'): void;
}>();

// User's default organization based on login
const userCouncilOrg = computed<OrgId | null>(() => {
  if (props.currentUser?.orgId && props.currentUser.orgId !== 'OSA' && props.currentUser.orgId !== 'ADMIN' && props.currentUser.orgId !== 'COLLEGE') {
    return props.currentUser.orgId as OrgId;
  }
  return null;
});

const getOrgName = (orgId?: OrgId | string | null): string => {
  if (!orgId) return '';
  const org = ORGANIZATIONS.find(o => isSameOrg(o.id, orgId) || isSameOrg(o.acronym, orgId));
  return org ? org.name : orgId;
};

// Currently viewed organization (strictly user's council for student orgs)
const viewedOrg = ref<OrgId | 'ALL'>(
  userCouncilOrg.value || (props.selectedOrgFilter === 'ALL' ? 'ALL' : (props.selectedOrgFilter || 'CBIT'))
);

// Keep in sync with parent prop if not restricted to student org
watch(
  () => [props.selectedOrgFilter, userCouncilOrg.value],
  ([newVal, orgVal]) => {
    if (orgVal) {
      viewedOrg.value = orgVal;
    } else if (newVal) {
      viewedOrg.value = newVal;
    }
  },
  { immediate: true }
);

// Target Fiscal Year (defaults to Fiscal Year 2027 for SENSSO, 2026 for others, user can switch or view All)
const selectedFiscalYear = ref<string>(
  viewedOrg.value && (viewedOrg.value.toUpperCase().includes('SENS') || viewedOrg.value.toUpperCase().includes('SENSO'))
    ? 'Fiscal Year 2027'
    : 'Fiscal Year 2026'
);

watch(
  () => viewedOrg.value,
  (org) => {
    if (org && (org.toUpperCase().includes('SENS') || org.toUpperCase().includes('SENSO'))) {
      selectedFiscalYear.value = 'Fiscal Year 2027';
    }
  }
);

const handleSelectOrg = (org: OrgId | 'ALL') => {
  viewedOrg.value = org;
  emit('selectOrgFilter', org);
};

// Official Header Text Mapping (matches institutional format in image)
const getOfficialOrgHeader = (orgId: OrgId | 'ALL'): string => {
  switch (orgId) {
    case 'SSC':
      return 'OVCSAS|OSD|OSA: SUPREME STUDENT COUNCIL (SSC)';
    case 'CBIT':
    case 'CBIT SEC':
      return 'OVCSAS|OSD|OSA: COLLEGE OF BUSINESS AND INFORMATION TECHNOLOGY STUDENT EXECUTIVE COUNCIL (CBIT SEC)';
    case 'CELS':
    case 'ELSSA':
      return 'OVCSAS|OSD|OSA: ENVIRONMENT AND LIFE SCIENCES STUDENT ALLIANCE (ELSSA)';
    case 'CESS':
    case 'CESS SO':
      return 'OVCSAS|OSD|OSA: COLLEGE OF EDUCATION AND SOCIAL SCIENCES STUDENT ORGANIZATION (CESS SO)';
    case 'CFMS':
    case 'CMFS':
    case 'FIMSSO':
      return 'OVCSAS|OSD|OSA: FISHERIES AND MARINE SCIENCE STUDENT ORGANIZATION (FIMSSO)';
    case 'KAABAG':
      return 'OVCSAS|OSD|OSA: KAABAG STUDENT PEER FACILITATORS (KAABAG)';
    case 'TME':
      return 'OVCSAS|OSD|OSA: THE MARINE ECHO (TME)';
    case 'SenSo':
    case 'SENSSO':
      return 'OVCSAS|OSD|OSA: SENIOR STUDENTS\' SOCIETY (SenSSo)';
    default:
      return 'OVCSAS|OSD|OSA: CONSOLIDATED INSTITUTIONAL ACTION PLANS - ALL ACCREDITED COUNCILS';
  }
};

// Helpers to extract & fall back for table fields
const getActivityTimeframe = (act: Activity): string => {
  if (act.timeframe) return act.timeframe;
  if (!act.startDate) return 'Anytime in Semester';
  const d = new Date(act.startDate);
  if (isNaN(d.getTime())) return 'Anytime in Semester';
  const monthName = d.toLocaleString('en-US', { month: 'long' });
  return `Anytime in ${monthName}`;
};

const getActivityProgramsAndActivities = (act: Activity): string => {
  return act.programActivity || act.title;
};

const getActivityStrategicObjectives = (act: Activity): string => {
  return act.strategicObjectives || act.description || 'Organize leadership training and student development activities.';
};

const getActivityExpectedOutput = (act: Activity): string => {
  return act.expectedOutput || act.kpiOutcome || 'Student participation and documentation of activity reports.';
};

const getActivityOffice = (act: Activity): string => {
  return act.office || act.orgId;
};

const getActivityLineItemBudget = (act: Activity): string => {
  return act.lineItemBudget || 'Design, materials, logistics, and faculty snacks.';
};

const getActivityAmount = (act: Activity): number => {
  return act.amount ?? act.budget ?? 0;
};

const getActivityTotalBudget = (act: Activity): number => {
  return act.totalBudget ?? act.budget ?? 0;
};

const getActivityFundSource = (act: Activity): string => {
  return act.fundSource || `${act.orgId}-SEC Fund`;
};

const getActivityPersonAssigned = (act: Activity): string => {
  return act.personAssigned || act.proposedBy || `${act.orgId}-SEC Officers`;
};

// Currency formatter for Philippine Peso (exact format from user image: ₱1,500.00)
const formatCurrency = (val: number): string => {
  return `₱${val.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Filtered activities matching selected organization and fiscal year
// An initiative belongs in the Action Plan if it was imported as an Action Plan proposal, or has been approved
const filteredTableActivities = computed(() => {
  return props.activities.filter((act) => {
    // 1. Belongs to the Action Plan
    const isActionPlanRecord = Boolean(
      act.isActionPlanItem || 
      act.source === 'ACTION_PLAN' || 
      act.status === 'Approved' || 
      act.status === 'APPROVED' || 
      act.workflowStatus === 'COMPLETED'
    );
    if (!isActionPlanRecord) return false;

    // 2. Match organization (using isSameOrg)
    const matchesOrg = viewedOrg.value === 'ALL' || isSameOrg(act.orgId, viewedOrg.value);
    if (!matchesOrg) return false;

    // 3. Match fiscal year (flexible to match "Fiscal Year 2026", "Fiscal Year 2027", or "All Fiscal Years")
    if (selectedFiscalYear.value !== 'ALL' && selectedFiscalYear.value !== 'All Fiscal Years') {
      const fyYearNumber = selectedFiscalYear.value.replace(/\D/g, '');
      const actYearNumber = (act.fiscalYear || '').replace(/\D/g, '');
      const matchesFiscalYear = !fyYearNumber || actYearNumber === fyYearNumber || (act.startDate && act.startDate.startsWith(fyYearNumber));
      if (!matchesFiscalYear) return false;
    }

    return true;
  });
});

// Total budget sum for the current filtered table
const totalAllocatedBudget = computed(() => {
  return filteredTableActivities.value.reduce((sum, act) => sum + getActivityTotalBudget(act), 0);
});

// Total approved initiatives
const approvedActivitiesCount = computed(() => {
  return filteredTableActivities.value.length;
});

// Export table to CSV with UTF-8 BOM
const handleExportCSV = () => {
  const headers = [
    'Timeframe',
    'Programs and Activities',
    'Strategic Objectives',
    'Expected Output',
    'Office',
    'Line Item Budget',
    'Amount',
    'Total Budget',
    'Fund Source',
    'Person Assigned'
  ];

  const escapeCSV = (str: string) => `"${str.replace(/"/g, '""')}"`;

  const rows = filteredTableActivities.value.map(act => [
    escapeCSV(getActivityTimeframe(act)),
    escapeCSV(getActivityProgramsAndActivities(act)),
    escapeCSV(getActivityStrategicObjectives(act)),
    escapeCSV(getActivityExpectedOutput(act)),
    escapeCSV(getActivityOffice(act)),
    escapeCSV(getActivityLineItemBudget(act)),
    escapeCSV(formatCurrency(getActivityAmount(act))),
    escapeCSV(formatCurrency(getActivityTotalBudget(act))),
    escapeCSV(getActivityFundSource(act)),
    escapeCSV(getActivityPersonAssigned(act))
  ]);

  const csvContent = '\uFEFF' + [
    escapeCSV(getOfficialOrgHeader(viewedOrg.value)),
    escapeCSV(`ACTION PLAN FOR THE ${selectedFiscalYear.value.toUpperCase()}`),
    '',
    headers.map(escapeCSV).join(','),
    ...rows.map(r => r.join(','))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `MSUN_Action_Plan_${viewedOrg.value}_${selectedFiscalYear.value.replace(/\s+/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const isExportingXlsx = ref(false);

// Export table to genuine Excel (.xlsx)
const handleExportXLSX = async () => {
  try {
    isExportingXlsx.value = true;
    const orgName = getOfficialOrgHeader(viewedOrg.value);
    const rows = filteredTableActivities.value.map(act => ({
      timeframe: getActivityTimeframe(act),
      programsAndActivities: getActivityProgramsAndActivities(act),
      strategicObjectives: getActivityStrategicObjectives(act),
      expectedOutput: getActivityExpectedOutput(act),
      office: getActivityOffice(act),
      lineItemBudget: getActivityLineItemBudget(act),
      amount: getActivityAmount(act),
      totalBudget: getActivityTotalBudget(act),
      fundSource: getActivityFundSource(act),
      personAssigned: getActivityPersonAssigned(act)
    }));

    const filename = `MSUN_Action_Plan_${viewedOrg.value}_${selectedFiscalYear.value.replace(/\s+/g, '_')}.xlsx`;
    await exportActionPlanTableXlsx(orgName, selectedFiscalYear.value, rows, filename);
  } catch (err) {
    console.error('Failed to export XLSX:', err);
  } finally {
    isExportingXlsx.value = false;
  }
};

// Print action
const handlePrint = () => {
  window.print();
};
</script>

<template>
  <div class="space-y-5">
    <!-- Top Control Bar: Context & Primary Actions -->
    <div class="bg-white rounded-2xl border border-[#E0E7F1] shadow-xs p-5">
      <!-- Title & Context Row -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div class="flex flex-wrap items-center gap-2 mb-1.5">
            <span class="text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
              Action Plan Matrix
            </span>
            
            <!-- Logged-in Council Badge -->
            <span 
              v-if="userCouncilOrg"
              class="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-md border shadow-2xs"
              :class="[
                getOrgTheme(userCouncilOrg).badgeBg,
                getOrgTheme(userCouncilOrg).badgeText,
                getOrgTheme(userCouncilOrg).badgeBorder
              ]"
            >
              <Building2 class="w-3.5 h-3.5 shrink-0" />
              <span>Council: <strong class="font-extrabold">{{ userCouncilOrg }}</strong></span>
            </span>
          </div>

          <div class="flex flex-wrap items-center gap-3 mt-1">
            <h2 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>{{ selectedFiscalYear }} Action Plan</span>
              <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Official Template
              </span>
            </h2>

            <!-- Fiscal Year Dropdown Selector -->
            <div class="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1">
              <label for="fy-selector" class="text-[11px] font-bold text-slate-600">Year:</label>
              <select
                id="fy-selector"
                v-model="selectedFiscalYear"
                class="text-xs font-extrabold text-blue-900 bg-transparent border-none focus:outline-none cursor-pointer"
              >
                <option value="Fiscal Year 2026">Fiscal Year 2026</option>
                <option value="Fiscal Year 2027">Fiscal Year 2027</option>
                <option value="All Fiscal Years">All Fiscal Years</option>
              </select>
            </div>
          </div>
          <p class="text-xs sm:text-sm text-slate-500 mt-1">
            View and track student organization programs and activities for MSUN.
          </p>
        </div>

        <!-- Action Buttons: Print, Export, Import -->
        <div class="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            @click="handlePrint"
            class="btn-secondary"
            title="Print or Save official PDF format"
          >
            <Printer class="w-3.5 h-3.5 text-slate-600" />
            <span class="hidden sm:inline">Print Table</span>
          </button>

          <button
            @click="handleExportXLSX"
            :disabled="isExportingXlsx"
            class="btn-secondary"
            title="Download table in Microsoft Excel (.xlsx) format"
          >
            <div v-if="isExportingXlsx" class="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            <FileSpreadsheet v-else class="w-3.5 h-3.5 text-emerald-600" />
            <span>Export (.xlsx)</span>
          </button>

          <button
            @click="handleExportCSV"
            class="btn-secondary"
            title="Download table in CSV format"
          >
            <Download class="w-3.5 h-3.5 text-slate-600" />
            <span>Export (.csv)</span>
          </button>

          <button
            @click="emit('importClick')"
            class="btn-secondary"
            title="Import Excel spreadsheet (.xlsx)"
          >
            <UploadCloud class="w-3.5 h-3.5 text-blue-600" />
            <span>Import</span>
          </button>
        </div>
      </div>

      <!-- Organization Selection Bar: If student org, lock to user's council -->
      <div v-if="userCouncilOrg" class="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
        <div class="flex items-center gap-2 min-w-0 max-w-full">
          <span class="text-xs font-semibold text-slate-500 shrink-0">Your Council Action Plan:</span>
          <span 
            class="px-3 py-1 rounded-lg text-xs font-bold border shadow-2xs inline-flex items-center gap-1.5 max-w-full overflow-hidden leading-snug"
            :class="[
              getOrgTheme(userCouncilOrg).badgeBg,
              getOrgTheme(userCouncilOrg).badgeText,
              getOrgTheme(userCouncilOrg).badgeBorder
            ]"
          >
            <span class="font-extrabold shrink-0">{{ userCouncilOrg }}</span>
            <span v-if="getOrgName(userCouncilOrg)" class="font-medium opacity-85 text-[11px] truncate max-w-[200px] sm:max-w-md">
              — {{ getOrgName(userCouncilOrg) }}
            </span>
          </span>
        </div>
        <span class="text-[11px] text-slate-500 font-medium bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md shrink-0">
          🔒 Organization Privacy: Only {{ userCouncilOrg }} initiatives are accessible
        </span>
      </div>

      <!-- Organization Selection Bar for Admin / Consolidated View -->
      <div v-else class="mt-4 pt-3.5 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
        <!-- All Councils Button -->
        <button
          type="button"
          @click="handleSelectOrg('ALL')"
          class="px-3.5 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer border"
          :class="viewedOrg === 'ALL'
            ? 'bg-[#0f172a] text-white border-transparent shadow-xs'
            : 'bg-slate-50/70 text-blue-900 border-slate-200/90 hover:bg-blue-50/60 hover:border-blue-200 hover:text-blue-800'"
          title="Consolidated Action Plan across all student organizations"
        >
          All Councils
        </button>

        <!-- Individual Council Buttons with distinct organization color identification -->
        <button
          v-for="org in ORGANIZATIONS"
          :key="org.id"
          type="button"
          @click="handleSelectOrg(org.id)"
          class="px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer border shadow-2xs flex items-center gap-1.5"
          :class="[
            getOrgTheme(org.id).badgeBg,
            getOrgTheme(org.id).badgeText,
            getOrgTheme(org.id).badgeBorder,
            isSameOrg(viewedOrg, org.id)
              ? 'ring-2 ring-slate-900 ring-offset-1 font-black shadow-xs scale-105'
              : 'hover:opacity-90'
          ]"
          :title="`${org.acronym} - ${org.name}`"
        >
          <span>{{ org.acronym }}</span>
        </button>
      </div>
    </div>

    <!-- Official Action Plan Spreadsheet Document Container -->
    <div class="bg-white rounded-2xl border border-[#E0E7F1] shadow-xs overflow-hidden" id="action-plan-print-area">
      <!-- Action Plan Matrix Table (10 Columns, Clean Academic Spreadsheet Styling) -->
      <div class="overflow-x-auto w-full">
        <table class="w-full text-left text-xs border-collapse border border-slate-400 min-w-[1200px]">
          <!-- Table Header Row -->
          <thead>
            <tr class="bg-slate-200 text-slate-900 font-bold border-b border-slate-400 text-center">
              <th class="p-3 border border-slate-400 w-[120px] font-bold text-slate-900">
                Timeframe
              </th>
              <th class="p-3 border border-slate-400 w-[180px] font-bold text-slate-900">
                Programs and Activities
              </th>
              <th class="p-3 border border-slate-400 min-w-[240px] font-bold text-slate-900">
                Strategic Objectives
              </th>
              <th class="p-3 border border-slate-400 min-w-[240px] font-bold text-slate-900">
                Expected Output
              </th>
              <th class="p-3 border border-slate-400 w-[80px] font-bold text-slate-900">
                Office
              </th>
              <th class="p-3 border border-slate-400 min-w-[200px] font-bold text-slate-900">
                Line Item Budget
              </th>
              <th class="p-3 border border-slate-400 w-[110px] font-bold text-slate-900">
                Amount
              </th>
              <th class="p-3 border border-slate-400 w-[110px] font-bold text-slate-900">
                Total Budget
              </th>
              <th class="p-3 border border-slate-400 w-[120px] font-bold text-slate-900">
                Fund Source
              </th>
              <th class="p-3 border border-slate-400 w-[140px] font-bold text-slate-900">
                Person Assigned
              </th>
            </tr>
          </thead>

          <!-- Table Body -->
          <tbody class="divide-y divide-slate-300">
            <template v-if="filteredTableActivities.length > 0">
              <tr
                v-for="act in filteredTableActivities"
                :key="act.id"
                class="hover:bg-slate-50/50 transition-colors"
              >
                <!-- 1. Timeframe (with subtle rose tint like in user image) -->
                <td class="p-3 border border-slate-300 bg-[#fce4ec]/40 text-center text-slate-900 font-medium align-middle">
                  {{ getActivityTimeframe(act) }}
                </td>

                <!-- 2. Programs and Activities (with subtle rose tint like in user image) -->
                <td class="p-3 border border-slate-300 bg-[#fce4ec]/40 text-slate-900 font-bold align-middle">
                  <div>{{ getActivityProgramsAndActivities(act) }}</div>
                </td>

                <!-- 3. Strategic Objectives -->
                <td class="p-3 border border-slate-300 text-slate-800 leading-relaxed align-middle">
                  {{ getActivityStrategicObjectives(act) }}
                </td>

                <!-- 4. Expected Output -->
                <td class="p-3 border border-slate-300 text-slate-800 leading-relaxed align-middle">
                  {{ getActivityExpectedOutput(act) }}
                </td>

                <!-- 5. Office -->
                <td class="p-3 border border-slate-300 text-center align-middle">
                  <OrgBadge :org-id="getActivityOffice(act)" size="xs" />
                </td>

                <!-- 6. Line Item Budget -->
                <td class="p-3 border border-slate-300 text-slate-800 leading-relaxed align-middle">
                  {{ getActivityLineItemBudget(act) }}
                </td>

                <!-- 7. Amount -->
                <td class="p-3 border border-slate-300 text-center font-bold text-slate-900 align-middle">
                  {{ formatCurrency(getActivityAmount(act)) }}
                </td>

                <!-- 8. Total Budget -->
                <td class="p-3 border border-slate-300 text-center font-bold text-slate-900 align-middle">
                  {{ formatCurrency(getActivityTotalBudget(act)) }}
                </td>

                <!-- 9. Fund Source -->
                <td class="p-3 border border-slate-300 text-center text-slate-800 font-medium align-middle">
                  {{ getActivityFundSource(act) }}
                </td>

                <!-- 10. Person Assigned -->
                <td class="p-3 border border-slate-300 text-center text-slate-800 font-medium align-middle">
                  {{ getActivityPersonAssigned(act) }}
                </td>
              </tr>
            </template>

            <!-- Empty State if no records match -->
            <tr v-else>
              <td colspan="10" class="p-12 text-center text-slate-500 bg-slate-50/50">
                <div class="max-w-md mx-auto space-y-3">
                  <Building2 class="w-10 h-10 text-slate-300 mx-auto" />
                  <p class="text-sm font-bold text-slate-700">
                    No Action Plan activities found for {{ viewedOrg === 'ALL' ? 'the selected criteria' : viewedOrg }} in {{ selectedFiscalYear }}
                  </p>
                  <p class="text-xs text-slate-500 leading-relaxed">
                    Activities will appear here automatically once approved through the review workflow or imported via the Action Plan import tool.
                  </p>
                </div>
              </td>
            </tr>
          </tbody>

          <!-- Table Footer: Financial Summation & Metrics Row -->
          <tfoot v-if="filteredTableActivities.length > 0" class="bg-slate-100 font-bold border-t-2 border-slate-400 text-slate-900">
            <tr>
              <td colspan="6" class="p-3 border border-slate-400 text-right uppercase tracking-wider text-xs">
                Total Allocated Action Plan Budget ({{ filteredTableActivities.length }} Approved Initiatives):
              </td>
              <td class="p-3 border border-slate-400 text-center text-xs font-black text-slate-900">
                {{ formatCurrency(totalAllocatedBudget) }}
              </td>
              <td class="p-3 border border-slate-400 text-center text-xs font-black text-blue-800">
                {{ formatCurrency(totalAllocatedBudget) }}
              </td>
              <td colspan="2" class="p-3 border border-slate-400 text-center text-xs text-slate-600">
                MSUN OVCSAS Verified
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media print {
  body * {
    visibility: hidden;
  }
  #action-plan-print-area,
  #action-plan-print-area * {
    visibility: visible;
  }
  #action-plan-print-area {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    border: none;
    box-shadow: none;
  }
}
</style>
