const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/components/AdminActionPlanView.vue');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove monitoring state variables and add getFiscalYearStats
const oldSummaryTarget = `// ============================================================================
// APMAMS UPDATE 6: ALL PROPOSED ACTIVITIES MONITORING DASHBOARD (SYSTEM ADMIN)
// ============================================================================
const monitoringFiscalYear = ref<string>('ALL');
const monitoringOrg = ref<string>('ALL');
const monitoringSearch = ref<string>('');
const monitoringStatus = ref<string>('ALL');
const monitoringStage = ref<string>('ALL');`;

const newSummaryReplacement = `// Summary metrics across all student organization action plans
const getFiscalYearStats = (fyName: string) => {
  const acts = (props.activities || []).filter(a => a.fiscalYear === fyName);
  const total = acts.length;
  const fullyApproved = acts.filter(a => a.approvalStatus === 'Fully Approved' || a.status === 'Approved').length;
  const pending = acts.filter(a => a.approvalStatus === 'Pending Review' || a.approvalStatus === 'Approved at Current Stage' || a.status === 'Pending').length;
  const deferred = acts.filter(a => a.approvalStatus === 'Deferred' || a.status === 'DEFERRED').length;
  const rejected = acts.filter(a => a.approvalStatus === 'Rejected' || a.status === 'Rejected').length;
  const proposedBudget = acts.reduce((sum, a) => sum + (Number(a.budget || a.totalBudget || a.amount) || 0), 0);
  const approvedBudget = acts
    .filter(a => a.approvalStatus === 'Fully Approved' || a.status === 'Approved')
    .reduce((sum, a) => sum + (Number(a.budget || a.totalBudget || a.amount) || 0), 0);
  return { total, fullyApproved, pending, deferred, rejected, proposedBudget, approvedBudget };
};`;

// Also in organizationSummaries, remove monitoringFiscalYear filter
const oldOrgFilter = `    let orgActs = acts.filter(a => isSameOrg(a.orgId, org.id));
    if (monitoringFiscalYear.value !== 'ALL') {
      orgActs = orgActs.filter(a => a.fiscalYear === monitoringFiscalYear.value);
    }`;

const newOrgFilter = `    const orgActs = acts.filter(a => isSameOrg(a.orgId, org.id));`;

// 2. Remove the "All Proposed Activities" mode switcher button
const oldMonitoringBtn = `          <!-- 1. All Proposed Activities Monitoring Dashboard -->
          <button
            type="button"
            @click="currentViewTab = 'monitoring'"
            class="px-3 py-2 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
            :class="currentViewTab === 'monitoring'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'"
          >
            <ShieldCheck class="w-4 h-4" />
            <span>All Proposed Activities</span>
          </button>`;

// Normalize CRLF in our searches
function replaceNormalized(src, search, replace) {
  const normSearch = search.replace(/\r\n/g, '\n');
  const normSrc = src.replace(/\r\n/g, '\n');
  if (!normSrc.includes(normSearch)) {
    console.error('Target not found:\n', normSearch.slice(0, 80));
    return src;
  }
  const isCRLF = src.includes('\r\n');
  const updated = normSrc.replace(normSearch, replace.replace(/\r\n/g, '\n'));
  return isCRLF ? updated.replace(/\n/g, '\r\n') : updated;
}

content = replaceNormalized(content, oldSummaryTarget, newSummaryReplacement);
content = replaceNormalized(content, oldOrgFilter, newOrgFilter);
content = replaceNormalized(content, oldMonitoringBtn, '');

// 3. Remove filteredMonitoringActivities block
const oldFilteredMonitoring = `const filteredMonitoringActivities = computed(() => {
  let list = props.activities || [];

  if (monitoringFiscalYear.value !== 'ALL') {
    list = list.filter(a => a.fiscalYear === monitoringFiscalYear.value);
  }
  if (monitoringOrg.value !== 'ALL') {
    list = list.filter(a => isSameOrg(a.orgId, monitoringOrg.value));
  }
  if (monitoringStatus.value !== 'ALL') {
    list = list.filter(a => (a.approvalStatus || a.status) === monitoringStatus.value);
  }
  if (monitoringStage.value !== 'ALL') {
    list = list.filter(a => a.approvalStageIndex === Number(monitoringStage.value));
  }
  if (monitoringSearch.value.trim()) {
    const q = monitoringSearch.value.trim().toLowerCase();
    list = list.filter(a => 
      (a.title && a.title.toLowerCase().includes(q)) ||
      (a.strategicObjectives && a.strategicObjectives.toLowerCase().includes(q)) ||
      (a.orgId && a.orgId.toLowerCase().includes(q)) ||
      (a.office && a.office.toLowerCase().includes(q))
    );
  }
  return list;
});`;

content = replaceNormalized(content, oldFilteredMonitoring, '');

// 4. Extract metrics cards and move them into TAB 1 (Fiscal Years)
const metricsCardsBlock = `      <!-- High-Level Action Plan Activity & Budget Summary Metrics Across Fiscal Years -->
      <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Proposed</span>
          <span class="text-xl font-black text-slate-900 mt-1 block">{{ totalProposedAll }}</span>
          <span class="text-[10px] text-slate-400">All submissions</span>
        </div>

        <div class="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <span class="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Fully Approved</span>
          <span class="text-xl font-black text-emerald-700 mt-1 block">{{ totalApprovedAll }}</span>
          <span class="text-[10px] text-emerald-600">Official sanction</span>
        </div>

        <div class="bg-white p-3.5 rounded-xl border border-blue-200 bg-blue-50/20 shadow-2xs">
          <span class="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">Pending Review</span>
          <span class="text-xl font-black text-blue-700 mt-1 block">{{ totalPendingAll }}</span>
          <span class="text-[10px] text-blue-600">In hierarchy</span>
        </div>

        <div class="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs">
          <span class="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Deferred</span>
          <span class="text-xl font-black text-amber-700 mt-1 block">{{ totalDeferredAll }}</span>
          <span class="text-[10px] text-amber-600">Returned for revision</span>
        </div>

        <div class="bg-white p-3.5 rounded-xl border border-rose-200 bg-rose-50/20 shadow-2xs">
          <span class="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">Rejected</span>
          <span class="text-xl font-black text-rose-700 mt-1 block">{{ totalRejectedAll }}</span>
          <span class="text-[10px] text-rose-600">Permanently kept</span>
        </div>

        <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
          <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Proposed Budget</span>
          <span class="text-sm font-black text-slate-900 mt-1 block font-mono truncate" :title="formatCurrency(totalProposedBudgetAll)">
            {{ formatCurrency(totalProposedBudgetAll) }}
          </span>
          <span class="text-[10px] text-slate-400">Total requested</span>
        </div>

        <div class="bg-white p-3.5 rounded-xl border border-emerald-300 bg-emerald-50/40 shadow-2xs col-span-2 sm:col-span-1">
          <span class="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Approved Budget</span>
          <span class="text-sm font-black text-emerald-800 mt-1 block font-mono truncate" :title="formatCurrency(totalApprovedBudgetAll)">
            {{ formatCurrency(totalApprovedBudgetAll) }}
          </span>
          <span class="text-[10px] text-emerald-700 font-bold">Only Fully Approved</span>
        </div>
      </div>`;

// Find and remove TAB 0 entirely: from `<!-- TAB 0: ALL PROPOSED ACTIVITIES MONITORING DASHBOARD -->` to before `<!-- TAB 1: FISCAL YEARS MANAGEMENT -->`
const norm = content.replace(/\r\n/g, '\n');
const tab0Start = norm.indexOf('<!-- ========================================================================= -->\n    <!-- TAB 0: ALL PROPOSED ACTIVITIES MONITORING DASHBOARD');
const tab1Start = norm.indexOf('<!-- ========================================================================= -->\n    <!-- TAB 1: FISCAL YEARS MANAGEMENT');

if (tab0Start !== -1 && tab1Start !== -1) {
  console.log('Found TAB 0 section, removing it...');
  const beforeTab0 = norm.slice(0, tab0Start);
  const fromTab1 = norm.slice(tab1Start);
  
  // In fromTab1, right after `<div v-if="currentViewTab === 'fiscal_years'" class="space-y-5">`, inject metricsCardsBlock
  const fyDiv = '<div v-if="currentViewTab === \'fiscal_years\'" class="space-y-5">';
  const injectedTab1 = fromTab1.replace(fyDiv, fyDiv + '\n' + metricsCardsBlock);
  
  const finalNorm = beforeTab0 + injectedTab1;
  const isCRLF = content.includes('\r\n');
  content = isCRLF ? finalNorm.replace(/\n/g, '\r\n') : finalNorm;
} else {
  console.error('Could not find TAB 0 or TAB 1 markers');
}

// 5. In the fiscal years card, update grid-cols-4 to grid-cols-5 and add the 5th box
const oldFyGrid = `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2">`;
const newFyGrid = `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-2">`;
content = replaceNormalized(content, oldFyGrid, newFyGrid);

const oldOrgsBlock = `<div class="bg-emerald-50/70 border border-emerald-100 rounded-xl p-2.5">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                      Registered Organizations
                    </span>
                    <div class="flex items-baseline gap-1 mt-0.5">
                      <span class="text-base font-black text-emerald-900">
                        {{ ORGANIZATIONS.filter(o => o.id !== 'ADMIN' && o.id !== 'COLLEGE').length }}
                      </span>
                      <span class="text-[11px] text-emerald-700 font-semibold">participating councils</span>
                    </div>
                  </div>`;

const newOrgsBlock = `<div class="bg-emerald-50/70 border border-emerald-100 rounded-xl p-2.5">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                      Registered Organizations
                    </span>
                    <div class="flex items-baseline gap-1 mt-0.5">
                      <span class="text-base font-black text-emerald-900">
                        {{ ORGANIZATIONS.filter(o => o.id !== 'ADMIN' && o.id !== 'COLLEGE').length }}
                      </span>
                      <span class="text-[11px] text-emerald-700 font-semibold">participating councils</span>
                    </div>
                  </div>

                  <div class="bg-indigo-50/70 border border-indigo-100 rounded-xl p-2.5">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
                      Action Plan Activities
                    </span>
                    <div class="flex items-baseline gap-1 mt-0.5">
                      <span class="text-base font-black text-indigo-950">
                        {{ getFiscalYearStats(fy.name).total }}
                      </span>
                      <span class="text-[11px] text-indigo-700 font-semibold">
                        proposals ({{ getFiscalYearStats(fy.name).fullyApproved }} approved)
                      </span>
                    </div>
                    <span class="text-[10px] text-indigo-600 block mt-0.2 font-mono truncate" :title="formatCurrency(getFiscalYearStats(fy.name).approvedBudget)">
                      Approved: {{ formatCurrency(getFiscalYearStats(fy.name).approvedBudget) }}
                    </span>
                  </div>`;

content = replaceNormalized(content, oldOrgsBlock, newOrgsBlock);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated AdminActionPlanView.vue');

