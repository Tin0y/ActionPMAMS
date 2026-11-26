<script setup lang="ts">
import { ref, watch, onBeforeUnmount, computed } from 'vue';
import JSZip from 'jszip';
import {
  X,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  AlertTriangle
} from 'lucide-vue-next';
import { buildFileActionUrl, isImageAttachment } from '../services/fileService';

const props = defineProps<{
  isOpen: boolean;
  title: string;
  fileUrl: string;
  mimeType?: string;
  fileSize?: string;
  uploadDate?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const isLoading = ref(false);
const errorMessage = ref('');
const previewKind = ref<'image' | 'pdf' | 'text' | 'docx' | 'unsupported'>('unsupported');
const objectUrl = ref('');
const textContent = ref('');
const docxParagraphs = ref<string[]>([]);

const revokeObjectUrl = () => {
  if (objectUrl.value && objectUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(objectUrl.value);
  }
  objectUrl.value = '';
};

const inferKind = (name: string, mime?: string): 'image' | 'pdf' | 'text' | 'docx' | 'unsupported' => {
  const lower = (name || '').toLowerCase();
  const lowerMime = (mime || '').toLowerCase();
  if (isImageAttachment(name, mime)) return 'image';
  if (lower.endsWith('.pdf') || lowerMime === 'application/pdf') return 'pdf';
  if (
    lower.endsWith('.txt') ||
    lower.endsWith('.csv') ||
    lower.endsWith('.json') ||
    lower.endsWith('.md') ||
    lowerMime.startsWith('text/')
  ) {
    return 'text';
  }
  if (
    lower.endsWith('.docx') ||
    lowerMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'docx';
  }
  return 'unsupported';
};

const inferBlobMime = (kind: string, name: string, fallback?: string): string => {
  if (kind === 'pdf') return 'application/pdf';
  if (kind === 'image') {
    const lower = (name || '').toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.gif')) return 'image/gif';
    if (lower.endsWith('.svg')) return 'image/svg+xml';
    return fallback && fallback.startsWith('image/') ? fallback : 'image/jpeg';
  }
  if (kind === 'text') return 'text/plain;charset=utf-8';
  return fallback || 'application/octet-stream';
};

const loadPreview = async () => {
  revokeObjectUrl();
  textContent.value = '';
  docxParagraphs.value = [];
  errorMessage.value = '';

  if (!props.isOpen || !props.fileUrl) return;

  const kind = inferKind(props.title, props.mimeType);
  previewKind.value = kind;

  if (kind === 'unsupported') {
    return;
  }

  isLoading.value = true;
  try {
    const isDataOrBlob = props.fileUrl.startsWith('data:') || props.fileUrl.startsWith('blob:');
    const res = await fetch(props.fileUrl, {
      credentials: isDataOrBlob ? 'omit' : 'include'
    });
    if (!res.ok) {
      throw new Error(`Unable to load file preview (HTTP ${res.status}).`);
    }
    const rawBlob = await res.blob();
    const typedBlob = new Blob([rawBlob], {
      type: inferBlobMime(kind, props.title, rawBlob.type || props.mimeType)
    });

    if (kind === 'text') {
      textContent.value = await typedBlob.text();
    } else if (kind === 'docx') {
      const zip = await JSZip.loadAsync(await typedBlob.arrayBuffer());
      const docXmlFile = zip.file('word/document.xml');
      if (!docXmlFile) {
        throw new Error('Could not read Word document contents.');
      }
      const xmlText = await docXmlFile.async('text');
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
      const paragraphs = Array.from(xmlDoc.getElementsByTagName('w:p'))
        .map(p =>
          Array.from(p.getElementsByTagName('w:t'))
            .map(t => t.textContent || '')
            .join('')
            .trim()
        )
        .filter(Boolean);
      docxParagraphs.value = paragraphs;
    } else {
      objectUrl.value = URL.createObjectURL(typedBlob);
    }
  } catch (err: any) {
    errorMessage.value = err?.message || 'Failed to load file preview.';
  } finally {
    isLoading.value = false;
  }
};

watch(
  () => [props.isOpen, props.fileUrl, props.title],
  () => {
    if (props.isOpen) {
      loadPreview();
    } else {
      revokeObjectUrl();
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  revokeObjectUrl();
});

const downloadHref = computed(() => buildFileActionUrl(props.fileUrl, true));

const triggerDownload = () => {
  if (!props.fileUrl) return;
  const a = document.createElement('a');
  a.href = downloadHref.value;
  a.download = props.title || 'attachment';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-[90] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150"
    @click.self="emit('close')"
  >
    <div class="bg-white rounded-2xl max-w-5xl w-full h-[88vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0 border-b border-slate-800">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-9 h-9 rounded-xl bg-blue-600/90 text-white flex items-center justify-center shrink-0">
            <FileText class="w-4 h-4" />
          </div>
          <div class="min-w-0">
            <h3 class="text-sm font-bold text-white truncate" :title="title">
              {{ title }}
            </h3>
            <p class="text-[11px] text-slate-400 truncate">
              <span v-if="fileSize">{{ fileSize }}</span>
              <span v-if="fileSize && uploadDate"> &bull; </span>
              <span v-if="uploadDate">Uploaded {{ uploadDate }}</span>
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <a
            v-if="objectUrl && (previewKind === 'pdf' || previewKind === 'image')"
            :href="objectUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 inline-flex items-center gap-1.5 transition-colors"
            title="Open preview in a new tab"
          >
            <ExternalLink class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">Open Tab</span>
          </a>
          <button
            type="button"
            @click="triggerDownload"
            class="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download class="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
          <button
            type="button"
            @click="emit('close')"
            class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close preview"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Body -->
      <div class="flex-1 min-h-0 bg-slate-100 flex items-center justify-center overflow-auto p-3 sm:p-5">
        <div v-if="isLoading" class="flex flex-col items-center gap-2 text-slate-600">
          <Loader2 class="w-8 h-8 animate-spin text-blue-600" />
          <span class="text-xs font-semibold">Loading preview...</span>
        </div>

        <div v-else-if="errorMessage" class="max-w-md w-full bg-white rounded-2xl border border-rose-200 p-6 text-center space-y-3 shadow-xs">
          <AlertTriangle class="w-8 h-8 text-rose-500 mx-auto" />
          <p class="text-xs font-bold text-slate-800">{{ errorMessage }}</p>
          <button
            type="button"
            @click="triggerDownload"
            class="btn-primary btn-sm cursor-pointer inline-flex items-center gap-1.5"
          >
            <Download class="w-3.5 h-3.5" />
            <span>Download Instead</span>
          </button>
        </div>

        <img
          v-else-if="previewKind === 'image' && objectUrl"
          :src="objectUrl"
          :alt="title"
          class="max-w-full max-h-full object-contain rounded-xl shadow-md bg-white border border-slate-200"
        />

        <iframe
          v-else-if="previewKind === 'pdf' && objectUrl"
          :src="objectUrl"
          :title="title"
          class="w-full h-full rounded-xl border border-slate-300 bg-white shadow-sm"
        />

        <div
          v-else-if="previewKind === 'text'"
          class="w-full h-full bg-white rounded-xl border border-slate-200 p-5 overflow-auto shadow-xs"
        >
          <pre class="text-xs text-slate-800 font-mono whitespace-pre-wrap break-words">{{ textContent || '(Empty file)' }}</pre>
        </div>

        <div
          v-else-if="previewKind === 'docx'"
          class="w-full h-full bg-white rounded-xl border border-slate-200 p-6 overflow-auto shadow-xs space-y-2.5"
        >
          <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2 mb-3">
            Word Document Text Preview
          </div>
          <p
            v-for="(para, idx) in docxParagraphs"
            :key="idx"
            class="text-xs text-slate-800 leading-relaxed"
          >
            {{ para }}
          </p>
          <p v-if="docxParagraphs.length === 0" class="text-xs italic text-slate-500">
            No readable text paragraphs found in this document. Use Download to view full formatting.
          </p>
        </div>

        <div
          v-else
          class="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-6 text-center space-y-3 shadow-xs"
        >
          <div class="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mx-auto">
            <FileText class="w-6 h-6" />
          </div>
          <div>
            <h4 class="text-sm font-bold text-slate-900 truncate">{{ title }}</h4>
            <p class="text-xs text-slate-500 mt-1">
              In-browser preview is not supported for this file format. You can download it to open locally.
            </p>
          </div>
          <button
            type="button"
            @click="triggerDownload"
            class="btn-primary btn-sm cursor-pointer inline-flex items-center gap-1.5"
          >
            <Download class="w-3.5 h-3.5" />
            <span>Download File</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
