<script setup lang="ts">
import { ref } from 'vue';
import { 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  RotateCcw, 
  ExternalLink, 
  X, 
  HardDrive, 
  Layers, 
  Users, 
  FolderGit2, 
  Building2 
} from 'lucide-vue-next';
import { 
  dbStatus, 
  dbErrorMessage, 
  lastSyncTime, 
  resetDatabaseToDefaults, 
  initializeDatabaseCollections,
  getDatabaseMetadata 
} from '../services/db';

const props = defineProps<{
  isOpen: boolean;
  activitiesCount: number;
  organizationsCount: number;
  usersCount: number;
  foldersCount: number;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'showToast', title: string, message?: string, type?: 'success' | 'info' | 'warning'): void;
}>();

const isResetting = ref(false);
const isSyncing = ref(false);
const meta = getDatabaseMetadata();

const handleSyncNow = async () => {
  isSyncing.value = true;
  try {
    await initializeDatabaseCollections();
    emit('showToast', 'Database Synced', 'Successfully verified and synchronized all Firestore collections.', 'success');
  } catch (err: unknown) {
    emit('showToast', 'Sync Warning', 'Encountered error during sync: ' + (err instanceof Error ? err.message : String(err)), 'warning');
  } finally {
    isSyncing.value = false;
  }
};

const handleResetToDefaults = async () => {
  if (!confirm('Are you sure you want to reset all Firestore records back to institutional defaults? This will restore original sample activities, organizations, accounts, and folders.')) {
    return;
  }
  isResetting.value = true;
  try {
    await resetDatabaseToDefaults();
    emit('showToast', 'Database Reset', 'All Firestore collections have been restored to initial sample data.', 'success');
  } catch (err: unknown) {
    emit('showToast', 'Reset Failed', 'Could not reset collections: ' + (err instanceof Error ? err.message : String(err)), 'warning');
  } finally {
    isResetting.value = false;
  }
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      
      <!-- Header -->
      <div class="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
            <Database class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-base font-bold tracking-tight">Cloud Database Status</h2>
            <p class="text-xs text-blue-200/80">Firebase Firestore Realtime Engine</p>
          </div>
        </div>
        <button 
          @click="emit('close')" 
          class="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Content Body -->
      <div class="p-6 space-y-5">
        
        <!-- Status Banner -->
        <div 
          class="p-4 rounded-xl border flex items-start gap-3"
          :class="dbStatus === 'connected' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : dbStatus === 'syncing'
            ? 'bg-blue-50 border-blue-200 text-blue-900'
            : dbStatus === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-900'
            : 'bg-amber-50 border-amber-200 text-amber-900'"
        >
          <CheckCircle2 v-if="dbStatus === 'connected'" class="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <RefreshCw v-else-if="dbStatus === 'syncing'" class="w-5 h-5 text-blue-600 animate-spin shrink-0 mt-0.5" />
          <AlertCircle v-else class="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between">
              <p class="font-bold text-sm">
                {{ dbStatus === 'connected' ? 'Firestore Connected & Live' : dbStatus === 'syncing' ? 'Synchronizing with Firestore...' : 'Database Offline / Error' }}
              </p>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-bold"
                :class="dbStatus === 'connected' ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'">
                {{ dbStatus }}
              </span>
            </div>
            <p class="text-xs mt-1 opacity-90">
              {{ dbStatus === 'connected' 
                ? 'All action plans, organizations, accounts, and activities are persistently stored and synchronized in real-time.' 
                : dbErrorMessage || 'Connecting to cloud database instance...' }}
            </p>
            <p v-if="lastSyncTime" class="text-[11px] mt-2 text-slate-500 font-mono">
              Last synced: {{ lastSyncTime.toLocaleTimeString() }} ({{ lastSyncTime.toLocaleDateString() }})
            </p>
          </div>
        </div>

        <!-- Metadata Properties Grid -->
        <div class="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5 text-xs">
          <div class="flex items-center justify-between">
            <span class="text-slate-500 font-medium">Database Engine:</span>
            <span class="font-semibold text-slate-800 flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-amber-500"></span>
              Google Cloud Firestore (NoSQL)
            </span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-slate-500 font-medium">Firebase Project ID:</span>
            <span class="font-mono text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
              {{ meta.projectId }}
            </span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-slate-500 font-medium">Firestore Database ID:</span>
            <span class="font-mono text-[11px] text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 truncate max-w-[280px]">
              {{ meta.databaseId }}
            </span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-slate-500 font-medium">Real-Time Sync Protocol:</span>
            <span class="text-emerald-700 font-semibold flex items-center gap-1">
              Active WebSocket / gRPC snapshot streams
            </span>
          </div>
        </div>

        <!-- Collections Breakdown -->
        <div>
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
            Synchronized Collections
          </h3>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div class="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-2xs">
              <Layers class="w-4 h-4 text-blue-600 mx-auto mb-1" />
              <p class="text-lg font-extrabold text-slate-900">{{ activitiesCount }}</p>
              <p class="text-[11px] text-slate-500 font-medium">Activities</p>
            </div>

            <div class="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-2xs">
              <Building2 class="w-4 h-4 text-emerald-600 mx-auto mb-1" />
              <p class="text-lg font-extrabold text-slate-900">{{ organizationsCount }}</p>
              <p class="text-[11px] text-slate-500 font-medium">Organizations</p>
            </div>

            <div class="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-2xs">
              <Users class="w-4 h-4 text-purple-600 mx-auto mb-1" />
              <p class="text-lg font-extrabold text-slate-900">{{ usersCount }}</p>
              <p class="text-[11px] text-slate-500 font-medium">Accounts</p>
            </div>

            <div class="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-2xs">
              <FolderGit2 class="w-4 h-4 text-amber-600 mx-auto mb-1" />
              <p class="text-lg font-extrabold text-slate-900">{{ foldersCount }}</p>
              <p class="text-[11px] text-slate-500 font-medium">Plan Folders</p>
            </div>
          </div>
        </div>

        <!-- Management Actions -->
        <div class="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            @click="handleResetToDefaults"
            :disabled="isResetting || isSyncing"
            class="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition-colors cursor-pointer disabled:opacity-50"
            title="Reseed Firestore collections with original sample records"
          >
            <RotateCcw class="w-3.5 h-3.5" :class="isResetting ? 'animate-spin' : ''" />
            <span>{{ isResetting ? 'Resetting...' : 'Reset Default Records' }}</span>
          </button>

          <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              @click="handleSyncNow"
              :disabled="isSyncing || isResetting"
              class="w-full sm:w-auto btn-secondary"
            >
              <RefreshCw class="w-3.5 h-3.5" :class="isSyncing ? 'animate-spin' : ''" />
              <span>{{ isSyncing ? 'Syncing...' : 'Sync Firestore Now' }}</span>
            </button>

            <button
              @click="emit('close')"
              class="w-full sm:w-auto btn-primary"
            >
              Close
            </button>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>
