const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/components/EmailInboxModal.vue');
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

// Remove Sparkles import if not needed
const oldImports = `  Search, 
  Sparkles, 
  Trash2,`;
const newImports = `  Search, 
  Trash2,`;

content = replaceNormalized(content, oldImports, newImports);

// Remove simulate button in header
const oldBtn = `        <div class="flex items-center gap-2">
          <!-- Simulation Button -->
          <button
            type="button"
            @click="emit('simulateApprovalEmail')"
            class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-300 hover:text-white text-xs font-bold transition-colors cursor-pointer border border-slate-700"
            title="Simulate receiving an approval email notification"
          >
            <Sparkles class="w-3.5 h-3.5 text-amber-400" />
            <span>Simulate Approval Email</span>
          </button>

          <button
            type="button"
            @click="emit('close')"
            class="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Close Email Client"
          >
            <X class="w-5 h-5" />
          </button>
        </div>`;

const newBtn = `        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="emit('close')"
            class="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Close Email Client"
          >
            <X class="w-5 h-5" />
          </button>
        </div>`;

content = replaceNormalized(content, oldBtn, newBtn);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated EmailInboxModal.vue');

