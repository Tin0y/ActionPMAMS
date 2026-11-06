const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/components/NotificationMenu.vue');
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

const oldHeader = `    <!-- Modern Professional Light Header -->
    <div class="px-4 py-3.5 bg-white border-b border-slate-100 flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
          <Bell class="w-4 h-4 text-slate-700" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h3 class="font-bold text-sm text-slate-900 tracking-tight">Notifications</h3>
            <span 
              v-if="unreadCount > 0"
              class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200/70"
            >
              {{ unreadCount }} new
            </span>
          </div>
          <p class="text-[11px] text-slate-400 font-medium leading-none mt-0.5">
            {{ currentUser?.orgId || 'All' }} Updates &amp; Workflows
          </p>
        </div>
      </div>

      <div class="flex items-center gap-1.5">
        <button
          v-if="unreadCount > 0"
          type="button"
          @click="emit('markAllAsRead')"
          class="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
          title="Mark all notifications as read"
        >
          <CheckCheck class="w-3.5 h-3.5" />
          <span>Mark read</span>
        </button>

        <button
          type="button"
          @click="emit('close')"
          class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          title="Close notifications"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>`;

const newHeader = `    <!-- Header: Matching Institutional Inbox Theme -->
    <div class="px-4 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md border border-blue-400/30 shrink-0">
          <Bell class="w-4 h-4 text-white" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h3 class="font-extrabold text-sm text-white tracking-tight">Notifications</h3>
            <span 
              v-if="unreadCount > 0"
              class="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30"
            >
              {{ unreadCount }} new
            </span>
          </div>
          <p class="text-[11px] text-slate-400 font-medium leading-none mt-0.5">
            {{ currentUser?.orgId || 'MSUN' }} Updates & Workflows
          </p>
        </div>
      </div>

      <div class="flex items-center gap-1.5">
        <button
          v-if="unreadCount > 0"
          type="button"
          @click="emit('markAllAsRead')"
          class="text-xs font-bold text-blue-300 hover:text-white px-2.5 py-1 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer border border-blue-400/20"
          title="Mark all notifications as read"
        >
          <CheckCheck class="w-3.5 h-3.5 text-blue-400" />
          <span>Mark read</span>
        </button>

        <button
          type="button"
          @click="emit('close')"
          class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          title="Close notifications"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>`;

content = replaceNormalized(content, oldHeader, newHeader);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated NotificationMenu.vue header to match Inbox!');
