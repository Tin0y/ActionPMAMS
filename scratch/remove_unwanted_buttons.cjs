const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/components/PlansApprovalsView.vue');
let content = fs.readFileSync(filePath, 'utf8');

function replaceNormalized(src, search, replace) {
  const normSearch = search.replace(/\r\n/g, '\n');
  const normSrc = src.replace(/\r\n/g, '\n');
  if (!normSrc.includes(normSearch)) {
    console.error('Target not found:\n', normSearch.slice(0, 100));
    return src;
  }
  const isCRLF = src.includes('\r\n');
  const updated = normSrc.replace(normSearch, replace.replace(/\r\n/g, '\n'));
  return isCRLF ? updated.replace(/\n/g, '\r\n') : updated;
}

const oldBlock = `            <div class="flex items-center gap-2 flex-wrap">
              <!-- Review Activity in Standard Review Modal -->
              <button
                type="button"
                @click="handleOpenActivityReview(activity)"
                class="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-blue-600 bg-blue-50 text-blue-800 hover:bg-blue-100 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs active:scale-95"
                title="Review activity proposal, line-item budget, and make approval/defer/reject decision"
              >
                <ShieldCheck class="w-3.5 h-3.5 text-blue-700" />
                <span>Review Activity</span>
              </button>

              <button
                @click="handleViewDossier(activity)"
                class="btn-info btn-sm cursor-pointer"
              >
                <Eye class="w-3.5 h-3.5" />
                <span>View DAD Details &amp; History</span>
              </button>

              <!-- Primary Format: Word (.docx) -->
              <button
                type="button"
                @click="handleDownloadDadDocx(activity)"
                :disabled="isDownloadingDocx === activity.id"
                class="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-blue-400 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs active:scale-95"
                title="Download official DAD as editable Word (.docx) document"
              >
                <Loader2 v-if="isDownloadingDocx === activity.id" class="w-3.5 h-3.5 animate-spin" />
                <FileText v-else class="w-3.5 h-3.5" />
                <span>Word (.docx)</span>
              </button>

              <button
                type="button"
                @click="handlePrintDad(activity)"
                class="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs active:scale-95"
                title="Print or view official DAD Form"
              >
                <Printer class="w-3.5 h-3.5 text-blue-900" />
                <span>Print DAD</span>
              </button>

              <button
                type="button"
                @click="handleDownloadDadPdf(activity)"
                class="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs active:scale-95"
                title="Download official DAD Form as PDF"
              >
                <Download class="w-3.5 h-3.5 text-emerald-700" />
                <span class="hidden sm:inline">PDF</span>
              </button>
            </div>`;

const newBlock = `            <div class="flex items-center gap-2 flex-wrap">
              <button
                @click="handleViewDossier(activity)"
                class="btn-info btn-sm cursor-pointer"
              >
                <Eye class="w-3.5 h-3.5" />
                <span>View DAD Details &amp; History</span>
              </button>
            </div>`;

content = replaceNormalized(content, oldBlock, newBlock);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated PlansApprovalsView.vue');

