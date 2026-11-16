<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { UserAccount, UserRole, formatUserRole } from '../types';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Building2, 
  Leaf, 
  Lock,
  CheckCircle2,
  AlertCircle,
  Camera,
  Upload,
  Trash2,
  Edit3,
  Layers,
  ChevronDown,
  ShieldCheck,
  Check,
  Crop,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  X,
  Move,
  Eye,
  EyeOff
} from 'lucide-vue-next';
import {
  ORGANIZATION_OPTIONS,
  detectAccountParentOrgAndRole,
  getUserActualOrg,
  getUserParentOrg,
  isUserInSubOrg,
  getAccountDisplayRole,
  getUserAssignedRoles,
  formatRoleLabel
} from '../utils/organizationUtils';
import { changeCurrentUserPassword, isCustomAvatarUrl } from '../services/auth';
import { uploadStoredFile, deleteStoredFile } from '../services/fileService';

const props = defineProps<{
  isOpen: boolean;
  currentUser?: UserAccount | null;
  isSaving?: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'logout'): void;
  (e: 'updateProfile', updatedData: Partial<UserAccount>): void;
  (e: 'switchRole', newRole: UserRole): void;
}>();

const handleRoleClick = (role: UserRole) => {
  const currentRole = props.currentUser?.activeRole || props.currentUser?.role;
  if (role === currentRole) return;
  emit('switchRole', role);
  emit('close');
};

// Editing state: false = View mode (Image 3), true = Edit mode (Images 4 & 5)
const isEditing = ref(false);

// Active Tab in Edit Mode: 'info' | 'security'
const activeTab = ref<'info' | 'security'>('info');

// Avatar state
const avatarPreview = ref<string>('');
const hasCustomAvatar = computed(() => isCustomAvatarUrl(avatarPreview.value));
const avatarFileInputRef = ref<HTMLInputElement | null>(null);
const isUploadingAvatar = ref(false);
const uploadMessage = ref<{ text: string; type: 'success' | 'error' } | null>(null);

const extractAvatarFileId = (url?: string | null): string | null => {
  if (!url || typeof url !== 'string') return null;
  const match = url.trim().match(/^\/api\/files\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
};
let uploadMessageTimer: ReturnType<typeof setTimeout> | null = null;

const setUploadBanner = (text: string, type: 'success' | 'error') => {
  if (uploadMessageTimer) {
    clearTimeout(uploadMessageTimer);
    uploadMessageTimer = null;
  }
  uploadMessage.value = { text, type };
  uploadMessageTimer = setTimeout(() => {
    uploadMessage.value = null;
  }, 3500);
};

// Profile Form State
const profileForm = reactive({
  firstName: '',
  lastName: '',
  email: '',
  organization: '',
  subOrg: '',
  selectedRole: '',
  customRole: '',
  isActive: true,
  bio: ''
});

const isAdminUser = computed(() => {
  const role = (props.currentUser?.role || '').toLowerCase();
  const org = (props.currentUser?.orgId || '').toUpperCase();
  return (
    props.currentUser?.role === 'ROLE_ADMIN' ||
    props.currentUser?.role === 'SysAd' ||
    props.currentUser?.role === 'System Administrator' ||
    props.currentUser?.displayRole === 'SysAd' ||
    props.currentUser?.selectedRole === 'SysAd' ||
    org === 'ADMIN' ||
    props.currentUser?.email === 'admin@msunaawan.edu.ph' ||
    props.currentUser?.email === 'hazelanne.mapula@msunaawan.edu.ph' ||
    role.includes('admin')
  );
});

// Organization, Sub-organization and Role display computeds (Read-only institutional details)
const selectedOrgConfig = computed(() => 
  ORGANIZATION_OPTIONS.find(o => o.value === profileForm.organization || o.orgId === profileForm.organization)
);

const hasSubOrgs = computed(() => {
  if (isAdminUser.value) return false;
  return Boolean(selectedOrgConfig.value?.subOrgs && selectedOrgConfig.value.subOrgs.length > 0);
});

const displayOrgName = computed(() => {
  if (isAdminUser.value) {
    return 'Not Affiliated';
  }
  return selectedOrgConfig.value?.label || profileForm.organization || getUserParentOrg(props.currentUser);
});

const displaySubOrgName = computed(() => {
  if (isAdminUser.value) return 'None';
  if (selectedOrgConfig.value?.subOrgs) {
    const matched = selectedOrgConfig.value.subOrgs.find(s => s.value === profileForm.subOrg);
    if (matched) return matched.label;
  }
  if (profileForm.subOrg) return profileForm.subOrg;
  if (hasSubOrgs.value) {
    return `${profileForm.organization} (Executive Council / College-wide)`;
  }
  return 'None';
});

const displayRoleName = computed(() => {
  if (isAdminUser.value) {
    return 'SysAd';
  }
  if (profileForm.selectedRole === 'Others' && profileForm.customRole) {
    return profileForm.customRole;
  }
  return getAccountDisplayRole(props.currentUser) || profileForm.selectedRole || 'Officer';
});

// Security Form State (Image 5)
const securityForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
});

// Password visibility toggles (Security tab)
const showCurrentPassword = ref(false);
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);

const securityError = ref('');
const securitySuccess = ref('');

const syncUserData = () => {
  if (props.currentUser) {
    const parts = (props.currentUser.name || '').split(' ');
    profileForm.firstName = props.currentUser.firstName || parts[0] || '';
    profileForm.lastName = props.currentUser.lastName || parts.slice(1).join(' ') || '';
    profileForm.email = props.currentUser.email || '';
    profileForm.isActive = props.currentUser.isActive !== false;
    profileForm.bio = props.currentUser.bio || '';
    avatarPreview.value = isCustomAvatarUrl(props.currentUser.avatar) ? props.currentUser.avatar! : '';

    if (isAdminUser.value) {
      profileForm.organization = 'Not Affiliated';
      profileForm.subOrg = '';
      profileForm.selectedRole = 'SysAd';
      profileForm.customRole = '';
    } else {
      // Detect organization, sub-organization, and role matching how the account was created
      const detected = detectAccountParentOrgAndRole(props.currentUser);
      profileForm.organization = detected.parentOrg;
      profileForm.subOrg = detected.subOrg;
      profileForm.selectedRole = detected.selectedRole;
      profileForm.customRole = detected.customRole;
    }
  }
};

// Photo Cropper & Adjuster State (must be declared before immediate watchers referencing isCropperOpen)
const isCropperOpen = ref(false);
const cropSourceImage = ref<HTMLImageElement | null>(null);
const cropperCanvasRef = ref<HTMLCanvasElement | null>(null);
const zoom = ref(1.0);
const rotation = ref(0);
const panX = ref(0);
const panY = ref(0);
const isDragging = ref(false);
const dragStart = ref({ x: 0, y: 0 });

watch(
  () => props.currentUser,
  (nextUser, prevUser) => {
    if (!nextUser) return;
    if (isCropperOpen.value) return;
    if (isEditing.value && prevUser && nextUser.id === prevUser.id) {
      avatarPreview.value = isCustomAvatarUrl(nextUser.avatar) ? nextUser.avatar! : '';
      return;
    }
    syncUserData();
  },
  { immediate: true }
);

watch(
  () => props.isSaving,
  (saving, wasSaving) => {
    if (wasSaving && !saving && props.currentUser && !isCropperOpen.value) {
      avatarPreview.value = isCustomAvatarUrl(props.currentUser.avatar) ? props.currentUser.avatar! : '';
    }
  }
);

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      isEditing.value = false;
      activeTab.value = 'info';
      syncUserData();
      securityError.value = '';
      securitySuccess.value = '';
      uploadMessage.value = null;
    }
  }
);

const handleOpenEdit = () => {
  syncUserData();
  isEditing.value = true;
  activeTab.value = 'info';
  securityError.value = '';
  securitySuccess.value = '';
  showCurrentPassword.value = false;
  showNewPassword.value = false;
  showConfirmPassword.value = false;
};

const handleCancelEdit = () => {
  syncUserData();
  isEditing.value = false;
  securityError.value = '';
  securitySuccess.value = '';
  showCurrentPassword.value = false;
  showNewPassword.value = false;
  showConfirmPassword.value = false;
};

const triggerAvatarUpload = () => {
  avatarFileInputRef.value?.click();
};

const drawCropperCanvas = () => {
  const canvas = cropperCanvasRef.value;
  if (!canvas || !cropSourceImage.value) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const size = canvas.width; // 300
  ctx.clearRect(0, 0, size, size);

  ctx.save();
  ctx.translate(size / 2 + panX.value, size / 2 + panY.value);
  ctx.rotate((rotation.value * Math.PI) / 180);
  ctx.scale(zoom.value, zoom.value);

  const img = cropSourceImage.value;
  const baseScale = Math.max(size / img.width, size / img.height);
  const w = img.width * baseScale;
  const h = img.height * baseScale;

  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
};

watch([zoom, rotation, panX, panY], () => {
  if (isCropperOpen.value) {
    drawCropperCanvas();
  }
});

const handleMouseDown = (e: MouseEvent) => {
  isDragging.value = true;
  dragStart.value = { x: e.clientX - panX.value, y: e.clientY - panY.value };
};

const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value) return;
  panX.value = e.clientX - dragStart.value.x;
  panY.value = e.clientY - dragStart.value.y;
  drawCropperCanvas();
};

const handleMouseUp = () => {
  isDragging.value = false;
};

const handleTouchStart = (e: TouchEvent) => {
  if (e.touches.length === 1) {
    isDragging.value = true;
    dragStart.value = {
      x: e.touches[0].clientX - panX.value,
      y: e.touches[0].clientY - panY.value
    };
  }
};

const handleTouchMove = (e: TouchEvent) => {
  if (!isDragging.value || e.touches.length !== 1) return;
  panX.value = e.touches[0].clientX - dragStart.value.x;
  panY.value = e.touches[0].clientY - dragStart.value.y;
  drawCropperCanvas();
};

const handleTouchEnd = () => {
  isDragging.value = false;
};

const handleWheel = (e: WheelEvent) => {
  e.preventDefault();
  const delta = e.deltaY < 0 ? 0.08 : -0.08;
  zoom.value = Math.min(3.0, Math.max(0.6, Number((zoom.value + delta).toFixed(2))));
  drawCropperCanvas();
};

const handleRotate = () => {
  rotation.value = (rotation.value + 90) % 360;
  drawCropperCanvas();
};

const handleReset = () => {
  zoom.value = 1.0;
  rotation.value = 0;
  panX.value = 0;
  panY.value = 0;
  drawCropperCanvas();
};

const exportCroppedAvatarCanvas = (): HTMLCanvasElement | null => {
  if (!cropSourceImage.value) return null;
  const exportCanvas = document.createElement('canvas');
  const size = 320;
  exportCanvas.width = size;
  exportCanvas.height = size;
  const ctx = exportCanvas.getContext('2d');
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  ctx.save();
  const factor = size / 300;
  ctx.translate((size / 2) + (panX.value * factor), (size / 2) + (panY.value * factor));
  ctx.rotate((rotation.value * Math.PI) / 180);
  ctx.scale(zoom.value * factor, zoom.value * factor);

  const img = cropSourceImage.value;
  const baseScale = Math.max(300 / img.width, 300 / img.height);
  const w = img.width * baseScale;
  const h = img.height * baseScale;

  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();

  return exportCanvas;
};

const canvasToAvatarFile = (canvas: HTMLCanvasElement, fileName: string): Promise<File | null> =>
  new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return resolve(null);
        resolve(new File([blob], fileName, { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.88
    );
  });

const handleApplyCrop = async () => {
  if (isUploadingAvatar.value) return;
  const canvas = exportCroppedAvatarCanvas();
  if (!canvas) {
    setUploadBanner('Unable to process the selected image. Please try another photo.', 'error');
    isCropperOpen.value = false;
    return;
  }

  isUploadingAvatar.value = true;
  const previousFileId = extractAvatarFileId(props.currentUser?.avatar || avatarPreview.value);
  try {
    const file = await canvasToAvatarFile(canvas, `avatar_${props.currentUser?.id || 'user'}.jpg`);
    let finalAvatarUrl = '';
    if (file) {
      const uploaded = await uploadStoredFile(file, {
        scope: 'avatar',
        orgId: props.currentUser?.orgId
      });
      finalAvatarUrl = uploaded.fileUrl;
    } else {
      finalAvatarUrl = canvas.toDataURL('image/jpeg', 0.88);
    }

    if (!finalAvatarUrl) {
      throw new Error('Could not generate uploaded avatar URL.');
    }

    if (previousFileId && extractAvatarFileId(finalAvatarUrl) !== previousFileId) {
      deleteStoredFile(previousFileId);
    }

    avatarPreview.value = finalAvatarUrl;
    emit('updateProfile', { avatar: finalAvatarUrl });
  } catch (err: any) {
    setUploadBanner(err?.message || 'Failed to upload profile photo. Please try again.', 'error');
  } finally {
    isUploadingAvatar.value = false;
    isCropperOpen.value = false;
  }
};

const handleCancelCrop = () => {
  isCropperOpen.value = false;
};

const handleOpenAdjustExisting = () => {
  if (!hasCustomAvatar.value) return;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    cropSourceImage.value = img;
    zoom.value = 1.0;
    rotation.value = 0;
    panX.value = 0;
    panY.value = 0;
    isCropperOpen.value = true;
    setTimeout(drawCropperCanvas, 50);
  };
  img.onerror = () => {
    setUploadBanner('Could not load existing profile photo for adjustment.', 'error');
  };
  img.src = avatarPreview.value;
};

const handleAvatarFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    setUploadBanner('Please select a valid image file (PNG, JPG, WEBP).', 'error');
    return;
  }

  // Max 5MB
  if (file.size > 5 * 1024 * 1024) {
    setUploadBanner('Image file size must be less than 5MB.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onerror = () => {
    setUploadBanner('Failed to read the selected image file.', 'error');
  };
  reader.onload = (event) => {
    const dataUrl = event.target?.result as string;
    if (!dataUrl) return;
    const img = new Image();
    img.onload = () => {
      cropSourceImage.value = img;
      zoom.value = 1.0;
      rotation.value = 0;
      panX.value = 0;
      panY.value = 0;
      isCropperOpen.value = true;
      setTimeout(drawCropperCanvas, 50);
    };
    img.onerror = () => {
      setUploadBanner('Unsupported or corrupted image format. Please use PNG, JPG, or WEBP.', 'error');
    };
    img.src = dataUrl;
  };
  reader.readAsDataURL(file);
  target.value = '';
};

const handleRemoveAvatar = () => {
  const previousFileId = extractAvatarFileId(props.currentUser?.avatar || avatarPreview.value);
  if (previousFileId) {
    deleteStoredFile(previousFileId);
  }
  avatarPreview.value = '';
  emit('updateProfile', { avatar: '' });
};

const handleSaveChanges = () => {
  // Bio and profile photo are editable by the user in Profile Settings
  emit('updateProfile', {
    bio: profileForm.bio.trim(),
    avatar: hasCustomAvatar.value ? avatarPreview.value : ''
  });
  isEditing.value = false;
};

const isUpdatingPassword = ref(false);

const handleUpdatePassword = async () => {
  if (isUpdatingPassword.value) return;
  securityError.value = '';
  securitySuccess.value = '';

  if (!securityForm.currentPassword) {
    securityError.value = 'Current password is required.';
    return;
  }
  if (!securityForm.newPassword) {
    securityError.value = 'New password cannot be empty.';
    return;
  }
  if (securityForm.newPassword.length < 8) {
    securityError.value = 'Password must be at least 8 characters long.';
    return;
  }
  if (securityForm.newPassword !== securityForm.confirmPassword) {
    securityError.value = 'Passwords do not match.';
    return;
  }
  if (securityForm.newPassword === securityForm.currentPassword) {
    securityError.value = 'New password must be different from your current password.';
    return;
  }

  isUpdatingPassword.value = true;
  try {
    const result = await changeCurrentUserPassword(
      securityForm.currentPassword,
      securityForm.newPassword,
      {
        id: props.currentUser?.id,
        email: props.currentUser?.email,
        studentId: props.currentUser?.studentId,
        username: props.currentUser?.username
      }
    );
    if (!result.ok) {
      securityError.value = result.message || 'Failed to update password.';
      return;
    }

    securitySuccess.value = result.message || 'Password successfully updated.';
    securityForm.currentPassword = '';
    securityForm.newPassword = '';
    securityForm.confirmPassword = '';
    showCurrentPassword.value = false;
    showNewPassword.value = false;
    showConfirmPassword.value = false;

    setTimeout(() => {
      isEditing.value = false;
      securitySuccess.value = '';
    }, 1200);
  } finally {
    isUpdatingPassword.value = false;
  }
};
</script>

<template>
  <div 
    v-if="isOpen" 
    class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-2.5 sm:p-4 md:p-6"
    @click.self="emit('close')"
  >
    <!-- Hidden native file input for avatar upload -->
    <input
      type="file"
      ref="avatarFileInputRef"
      accept="image/*"
      class="hidden"
      @change="handleAvatarFileChange"
    />

    <div 
      class="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-2xl transition-all duration-200 my-auto flex flex-col max-h-[94vh] sm:max-h-[92vh] w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      :class="isEditing ? 'max-w-4xl lg:max-w-5xl' : 'max-w-md sm:max-w-[460px]'"
    >
      <!-- Top Title Header with Back Arrow (Pinned at top) -->
      <div class="px-5 py-3 sm:py-3.5 border-b border-slate-100 bg-white flex items-center justify-between gap-3 shrink-0">
        <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button 
            @click="emit('close')"
            class="p-1.5 -ml-1 rounded-xl text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            title="Back to Workspace"
          >
            <ArrowLeft class="w-5 h-5 text-slate-900 stroke-[2.5]" />
          </button>
          <div class="min-w-0">
            <h2 class="text-base sm:text-lg font-black text-slate-950 tracking-tight leading-tight truncate">
              Profile Settings
            </h2>
            <p class="text-[11px] text-slate-500 font-medium truncate">
              Manage your account information, profile picture, and security preferences
            </p>
          </div>
        </div>

        <button
          v-if="isEditing"
          @click="handleCancelEdit"
          class="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
        >
          View Profile
        </button>
      </div>

      <!-- Scrollable Modal Body (No scrollbar on full screen; custom scrollbar appears smoothly on resized/short screens) -->
      <div
        class="flex-1 overflow-y-auto custom-scrollbar"
        :class="isEditing ? 'p-4 sm:p-5' : 'p-3.5 sm:p-4'"
      >
        <!-- Live upload toast alert if any -->
        <div 
          v-if="uploadMessage"
          class="mb-3 p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150"
          :class="uploadMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'"
        >
          <CheckCircle2 v-if="uploadMessage.type === 'success'" class="w-4 h-4 text-emerald-600 shrink-0" />
          <AlertCircle v-else class="w-4 h-4 text-rose-600 shrink-0" />
          <span>{{ uploadMessage.text }}</span>
        </div>

        <!-- Main Layout: Single Card (Image 3) or Two-Column (Images 4 & 5) -->
        <div 
          class="flex flex-col gap-4 sm:gap-5"
          :class="isEditing ? 'md:flex-row md:items-start' : 'items-center justify-center'"
        >
          <!-- LEFT PROFILE CARD (Matches Image 3) -->
          <div 
            class="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5 w-full text-center transition-all"
            :class="isEditing ? 'md:w-72 lg:w-80 shrink-0' : 'max-w-md mx-auto'"
          >
            <!-- Circular Avatar with Hover Camera Upload Action -->
            <div class="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-1.5 group">
              <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-950 text-white flex items-center justify-center shadow-md ring-4 ring-slate-100 overflow-hidden">
                <img
                  v-if="hasCustomAvatar"
                  :src="avatarPreview"
                  :alt="currentUser?.name || 'User'"
                  class="w-full h-full object-cover"
                />
                <User v-else class="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>

              <!-- Hover overlay button to change photo directly -->
              <button
                type="button"
                @click="triggerAvatarUpload"
                :disabled="isSaving"
                class="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer shadow-md disabled:cursor-not-allowed"
                title="Click to upload profile photo"
              >
                <Camera class="w-4 h-4 text-white mb-0.5" />
                <span class="text-[9px] font-bold">{{ hasCustomAvatar ? 'Change' : 'Upload' }}</span>
              </button>
            </div>

          <!-- Quick Action Buttons for Avatar (Upload / Adjust / Remove) -->
          <div class="flex items-center justify-center gap-1.5 mb-2.5 flex-wrap">
            <button
              type="button"
              @click="triggerAvatarUpload"
              :disabled="isSaving"
              class="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-0.5 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title="Upload new profile picture from your device"
            >
              <Camera class="w-3 h-3 text-blue-600" />
              <span>{{ hasCustomAvatar ? 'Change Photo' : 'Upload Photo' }}</span>
            </button>

            <button
              v-if="hasCustomAvatar"
              type="button"
              @click="handleOpenAdjustExisting"
              :disabled="isSaving"
              class="text-[11px] font-bold text-slate-700 hover:text-blue-600 hover:bg-blue-50 px-2 py-0.5 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title="Crop and adjust framing of profile photo"
            >
              <Crop class="w-3 h-3 text-slate-500" />
              <span>Adjust</span>
            </button>

            <button
              v-if="hasCustomAvatar"
              type="button"
              @click="handleRemoveAvatar"
              :disabled="isSaving"
              class="text-[11px] font-bold text-rose-600 bg-rose-50/70 border border-rose-200 hover:text-rose-700 hover:bg-rose-100 px-2 py-0.5 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs disabled:opacity-50"
              title="Remove custom profile picture and revert to default silhouette"
            >
              <Trash2 class="w-3 h-3" />
              <span>Remove</span>
            </button>
          </div>

          <!-- Name & Role Title (matches how the account was created) -->
          <h3 class="text-lg sm:text-xl font-extrabold text-slate-950 leading-tight">
            {{ currentUser?.name || `${profileForm.firstName} ${profileForm.lastName}` || 'User' }}
          </h3>
          <p class="text-xs sm:text-sm text-blue-600 font-bold mt-0.5 mb-2">
            {{ getAccountDisplayRole(currentUser) }}
          </p>

          <!-- Bio / Description Section (Rendered in the exact yellow line position between Role and Email) -->
          <div 
            v-if="profileForm.bio || currentUser?.bio" 
            class="mb-3 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 font-medium italic text-center leading-relaxed break-words shadow-2xs"
          >
            "{{ isEditing ? profileForm.bio : (currentUser?.bio || profileForm.bio) }}"
          </div>
          <div 
            v-else-if="isEditing" 
            class="mb-3 px-3 py-1.5 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-[11px] text-slate-400 font-normal italic text-center"
          >
            No bio yet. Type in Bio / Description on the right to preview.
          </div>
          <div v-else class="mb-2"></div>

          <!-- Details List with Icons (Image 3) -->
          <div class="space-y-2 text-left text-xs font-bold text-slate-900 mb-3.5 px-0.5">
            <!-- Email -->
            <div class="flex items-center gap-2.5">
              <div class="w-4 h-4 flex items-center justify-center shrink-0">
                <Mail class="w-3.5 h-3.5 text-slate-950" />
              </div>
              <span class="truncate font-semibold text-slate-800">{{ currentUser?.email }}</span>
            </div>

            <!-- Organization / Sub-Organization (labeled the same as AccountsView) -->
            <div class="flex items-start gap-2.5">
              <div class="w-4 h-4 flex items-center justify-center shrink-0 mt-0.5">
                <Building2 class="w-3.5 h-3.5 text-slate-950" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="truncate font-semibold text-slate-800">
                    {{ getUserActualOrg(currentUser) }}
                  </span>
                  <span 
                    v-if="isUserInSubOrg(currentUser)" 
                    class="text-[9px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded-md shrink-0"
                  >
                    Under: <strong class="text-slate-800">{{ getUserParentOrg(currentUser) }}</strong>
                  </span>
                </div>
                <p 
                  v-if="currentUser?.orgName && !isAdminUser && currentUser.orgName !== getUserActualOrg(currentUser) && currentUser.orgName !== getUserParentOrg(currentUser)" 
                  class="text-[10px] text-slate-400 font-normal truncate mt-0.5"
                >
                  {{ currentUser.orgName }}
                </p>
              </div>
            </div>

            <!-- Status -->
            <div class="flex items-center gap-2.5">
              <div class="w-4 h-4 flex items-center justify-center shrink-0">
                <Leaf class="w-3.5 h-3.5 text-slate-950" />
              </div>
              <span class="font-semibold text-slate-800">{{ currentUser?.isActive ? 'Active' : 'Inactive' }}</span>
            </div>

            <!-- All Assigned Roles & Switcher if multiple -->
            <div v-if="getUserAssignedRoles(currentUser).length > 0" class="pt-1.5 border-t border-slate-100">
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-[9px] font-black uppercase tracking-wider text-slate-500">
                  Assigned Roles ({{ getUserAssignedRoles(currentUser).length }})
                </span>
                <span v-if="getUserAssignedRoles(currentUser).length >= 2" class="text-[9px] font-bold text-blue-600">
                  Click to switch
                </span>
              </div>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="r in getUserAssignedRoles(currentUser)"
                  :key="r"
                  type="button"
                  @click="handleRoleClick(r)"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold border transition-all text-left"
                  :class="(currentUser?.activeRole || currentUser?.role) === r
                    ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-900 cursor-pointer'"
                >
                  <Check v-if="(currentUser?.activeRole || currentUser?.role) === r" class="w-3 h-3 text-white" />
                  <ShieldCheck v-else class="w-3 h-3 text-slate-400" />
                  <span>{{ formatRoleLabel(r) }}</span>
                  <span v-if="(currentUser?.activeRole || currentUser?.role) === r" class="text-[8px] uppercase font-black bg-white/20 px-1 py-0.2 rounded text-white ml-0.5">
                    Active
                  </span>
                </button>
              </div>
            </div>
          </div>

          <!-- Action Buttons (Consistent with other primary buttons in the application) -->
          <div class="space-y-2">
            <!-- Edit Profile Button: Standard Primary Blue (bg-blue-600 hover:bg-blue-700) -->
            <button
              v-if="!isEditing"
              type="button"
              @click="handleOpenEdit"
              class="w-full py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm transition-all shadow-sm hover:shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              <Edit3 class="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>

            <!-- Log Out Button -->
            <button
              type="button"
              @click="emit('logout')"
              class="w-full py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs sm:text-sm transition-all cursor-pointer"
            >
              Log Out
            </button>
          </div>
        </div>

        <!-- RIGHT EDIT CARD (Shown when Edit Profile is clicked, Matches Images 4 & 5) -->
        <div 
          v-if="isEditing" 
          class="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 flex-1 min-w-0 w-full flex flex-col justify-between"
        >
          <!-- Top Tabs (Image 4 & 5) -->
          <div>
            <div class="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2.5">
              <button
                type="button"
                @click="activeTab = 'info'"
                class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                :class="activeTab === 'info' 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'"
              >
                Profile Information
              </button>
              <button
                type="button"
                @click="activeTab = 'security'"
                class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                :class="activeTab === 'security' 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'"
              >
                Security
              </button>
            </div>

            <!-- TAB 1: PROFILE INFORMATION (Image 4) -->
            <div v-if="activeTab === 'info'" class="space-y-2.5 sm:space-y-3">
              
              <!-- Avatar Upload Row in Edit Mode -->
              <div class="p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-950 text-white flex items-center justify-center shrink-0 overflow-hidden shadow-xs ring-2 ring-white">
                    <img
                      v-if="hasCustomAvatar"
                      :src="avatarPreview"
                      alt="Thumbnail"
                      class="w-full h-full object-cover"
                    />
                    <User v-else class="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div class="min-w-0">
                    <h5 class="text-xs font-bold text-slate-900">Profile Picture</h5>
                    <p class="text-[11px] text-slate-500 truncate">Upload a custom photo for your account</p>
                  </div>
                </div>

                <div class="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    @click="triggerAvatarUpload"
                    :disabled="isSaving"
                    class="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                  >
                    <Upload class="w-3.5 h-3.5" />
                    <span>Upload</span>
                  </button>
                  <button
                    v-if="hasCustomAvatar"
                    type="button"
                    @click="handleOpenAdjustExisting"
                    :disabled="isSaving"
                    class="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    title="Crop and adjust photo"
                  >
                    <Crop class="w-3.5 h-3.5 text-slate-500" />
                    <span>Adjust</span>
                  </button>
                  <button
                    v-if="hasCustomAvatar"
                    type="button"
                    @click="handleRemoveAvatar"
                    :disabled="isSaving"
                    class="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 hover:border-rose-300 text-rose-600 hover:text-rose-700 font-bold text-xs transition-colors cursor-pointer inline-flex items-center gap-1 disabled:opacity-50"
                    title="Remove custom photo"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                    <span class="sr-only">Remove photo</span>
                  </button>
                </div>
              </div>

              <!-- First Name & Last Name (Read-only) -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <label class="block text-xs font-bold text-slate-800">First Name</label>
                    <span class="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                      <Lock class="w-2.5 h-2.5" /> Read-only
                    </span>
                  </div>
                  <input
                    :value="profileForm.firstName"
                    type="text"
                    disabled
                    readonly
                    class="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-600 font-medium cursor-not-allowed select-none"
                  />
                </div>
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <label class="block text-xs font-bold text-slate-800">Last Name</label>
                    <span class="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                      <Lock class="w-2.5 h-2.5" /> Read-only
                    </span>
                  </div>
                  <input
                    :value="profileForm.lastName"
                    type="text"
                    disabled
                    readonly
                    class="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-600 font-medium cursor-not-allowed select-none"
                  />
                </div>
              </div>

              <!-- Email Address (Read-only) -->
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="block text-xs font-bold text-slate-800">Email Address</label>
                  <span class="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                    <Lock class="w-2.5 h-2.5" /> Read-only
                  </span>
                </div>
                <input
                  :value="profileForm.email"
                  type="email"
                  disabled
                  readonly
                  class="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-600 font-medium cursor-not-allowed select-none"
                />
              </div>

              <!-- Organization / Office & Sub-Organization (Read-only, matches account creation) -->
              <div :class="hasSubOrgs ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'space-y-3'">
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <label class="block text-xs font-bold text-slate-800">
                      Organization / Office
                    </label>
                    <span class="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                      <Lock class="w-2.5 h-2.5" /> Institutional
                    </span>
                  </div>
                  <div class="relative">
                    <input
                      :value="displayOrgName"
                      type="text"
                      disabled
                      readonly
                      class="w-full px-3 py-1.5 pr-8 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-600 font-medium cursor-not-allowed select-none truncate"
                    />
                    <Lock class="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <!-- Sub-Organization (shown if organization has sub-organizations) -->
                <div v-if="hasSubOrgs">
                  <div class="flex items-center justify-between mb-1">
                    <label class="block text-xs font-bold text-slate-800">
                      Sub-Organization
                    </label>
                    <span class="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                      <Lock class="w-2.5 h-2.5" /> Departmental
                    </span>
                  </div>
                  <div class="relative">
                    <input
                      :value="displaySubOrgName"
                      type="text"
                      disabled
                      readonly
                      class="w-full px-3 py-1.5 pr-8 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-600 font-medium cursor-not-allowed select-none truncate"
                    />
                    <Lock class="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              <!-- Role / Position (Read-only, matches how account was created) -->
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="block text-xs font-bold text-slate-800">
                    Active Role
                  </label>
                  <span class="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                    <Lock class="w-2.5 h-2.5" /> Assigned Position
                  </span>
                </div>
                <div class="relative">
                  <input
                    :value="displayRoleName"
                    type="text"
                    disabled
                    readonly
                    class="w-full px-3 py-1.5 pr-8 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-600 font-medium cursor-not-allowed select-none truncate"
                  />
                  <Lock class="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <!-- All Assigned Roles Badges (Multi-Role Support) -->
              <div v-if="getUserAssignedRoles(currentUser).length > 0">
                <div class="flex items-center justify-between mb-1">
                  <label class="block text-xs font-bold text-slate-800">
                    Assigned Roles ({{ getUserAssignedRoles(currentUser).length }})
                  </label>
                  <span class="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                    <Lock class="w-2.5 h-2.5" /> Admin Managed
                  </span>
                </div>
                <div class="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200">
                  <span
                    v-for="r in getUserAssignedRoles(currentUser)"
                    :key="r"
                    class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-bold border"
                    :class="(currentUser?.activeRole || currentUser?.role) === r
                      ? 'bg-blue-100 text-blue-900 border-blue-300'
                      : 'bg-white text-slate-700 border-slate-200'"
                  >
                    <Check v-if="(currentUser?.activeRole || currentUser?.role) === r" class="w-3 h-3 text-blue-600" />
                    <ShieldCheck v-else class="w-3 h-3 text-slate-400" />
                    <span>{{ formatRoleLabel(r) }}</span>
                    <span v-if="(currentUser?.activeRole || currentUser?.role) === r" class="text-[8px] uppercase font-black bg-blue-200 text-blue-950 px-1 py-0.2 rounded">
                      Active
                    </span>
                  </span>
                </div>
              </div>

              <!-- Bio / Description (Editable by user) -->
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="block text-xs font-bold text-slate-800">Bio / Description</label>
                  <span class="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                    Editable
                  </span>
                </div>
                <textarea
                  v-model="profileForm.bio"
                  rows="2"
                  placeholder="Tell us about your organizational responsibilities..."
                  class="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium transition-all"
                ></textarea>
              </div>

              <!-- Bottom Action Buttons (Image 4) -->
              <div class="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  @click="handleCancelEdit"
                  class="px-4 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  @click="handleSaveChanges"
                  :disabled="isSaving"
                  class="px-5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-extrabold transition-colors shadow-xs cursor-pointer"
                >
                  {{ isSaving ? 'Saving...' : 'Save Changes' }}
                </button>
              </div>
            </div>

            <!-- TAB 2: SECURITY (Image 5) -->
            <div v-else-if="activeTab === 'security'" class="space-y-3">
              <!-- Current Password -->
              <div>
                <label class="block text-xs font-bold text-slate-800 mb-1">Current Password</label>
                <div class="relative">
                  <input
                    v-model="securityForm.currentPassword"
                    :type="showCurrentPassword ? 'text' : 'password'"
                    placeholder="Enter current password"
                    class="w-full px-3 py-1.5 pr-10 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium"
                  />
                  <button
                    type="button"
                    @click="showCurrentPassword = !showCurrentPassword"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer p-0.5"
                    :title="showCurrentPassword ? 'Hide current password' : 'View current password'"
                  >
                    <EyeOff v-if="showCurrentPassword" class="w-4 h-4" />
                    <Eye v-else class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <!-- New Password -->
              <div>
                <label class="block text-xs font-bold text-slate-800 mb-1">New Password</label>
                <div class="relative">
                  <input
                    v-model="securityForm.newPassword"
                    :type="showNewPassword ? 'text' : 'password'"
                    placeholder="Enter new password"
                    class="w-full px-3 py-1.5 pr-10 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium"
                  />
                  <button
                    type="button"
                    @click="showNewPassword = !showNewPassword"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer p-0.5"
                    :title="showNewPassword ? 'Hide new password' : 'View new password'"
                  >
                    <EyeOff v-if="showNewPassword" class="w-4 h-4" />
                    <Eye v-else class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <!-- Confirm New Password -->
              <div>
                <label class="block text-xs font-bold text-slate-800 mb-1">Confirm New Password</label>
                <div class="relative">
                  <input
                    v-model="securityForm.confirmPassword"
                    :type="showConfirmPassword ? 'text' : 'password'"
                    placeholder="Confirm new password"
                    class="w-full px-3 py-1.5 pr-10 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium"
                  />
                  <button
                    type="button"
                    @click="showConfirmPassword = !showConfirmPassword"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer p-0.5"
                    :title="showConfirmPassword ? 'Hide confirm password' : 'View confirm password'"
                  >
                    <EyeOff v-if="showConfirmPassword" class="w-4 h-4" />
                    <Eye v-else class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <!-- Password Requirements Box (Light Blue Box from Image 5) -->
              <div class="p-3 rounded-xl bg-blue-50/80 border border-blue-100 text-xs text-blue-950 space-y-1">
                <p class="font-extrabold text-blue-900 text-xs">Password Requirements:</p>
                <ul class="space-y-0.5 text-[11px] text-blue-800 font-medium">
                  <li class="flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                    <span>At least 8 characters long</span>
                  </li>
                  <li class="flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                    <span>Contains uppercase and lowercase letters</span>
                  </li>
                  <li class="flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                    <span>Contains at least one number</span>
                  </li>
                  <li class="flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                    <span>Contains at least one special character</span>
                  </li>
                </ul>
              </div>

              <!-- Status Messages -->
              <div v-if="securityError" class="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle class="w-4 h-4 shrink-0" />
                <span>{{ securityError }}</span>
              </div>
              <div v-if="securitySuccess" class="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 class="w-4 h-4 shrink-0" />
                <span>{{ securitySuccess }}</span>
              </div>

              <!-- Bottom Action Buttons (Image 5) -->
              <div class="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  @click="handleCancelEdit"
                  class="px-4 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  @click="handleUpdatePassword"
                  class="px-5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold transition-colors shadow-xs cursor-pointer"
                >
                  Update Password
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  </div>

    <!-- Photo Crop / Adjust Sub-Modal -->
    <div 
      v-if="isCropperOpen"
      class="fixed inset-0 z-60 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150 overflow-y-auto"
      @click.self="handleCancelCrop"
    >
      <div class="bg-white rounded-2xl sm:rounded-3xl max-w-sm sm:max-w-md w-full border border-slate-200 shadow-2xl p-4 sm:p-6 animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[94vh] overflow-y-auto custom-scrollbar">
        <!-- Sub-Modal Header -->
        <div class="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Crop class="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 class="text-base font-extrabold text-slate-950 leading-tight">Adjust & Crop Photo</h3>
              <p class="text-[11px] text-slate-500 font-medium">Drag to position, scroll or slide to zoom</p>
            </div>
          </div>
          <button 
            type="button" 
            @click="handleCancelCrop"
            class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Cancel"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Viewport with Interactive Canvas & Circular Overlay Mask -->
        <div 
          class="relative w-[280px] h-[280px] sm:w-[300px] sm:h-[300px] mx-auto overflow-hidden rounded-2xl bg-slate-900 shadow-inner select-none cursor-grab active:cursor-grabbing border border-slate-800"
          @mousedown="handleMouseDown"
          @mousemove="handleMouseMove"
          @mouseup="handleMouseUp"
          @mouseleave="handleMouseUp"
          @touchstart.passive="handleTouchStart"
          @touchmove="handleTouchMove"
          @touchend="handleTouchEnd"
          @wheel.prevent="handleWheel"
        >
          <canvas 
            ref="cropperCanvasRef" 
            width="300" 
            height="300" 
            class="w-full h-full block"
          />
          <!-- Circular Vignette Overlay: outside circle is darkened, circle outline shows avatar boundary -->
          <div 
            class="absolute inset-0 pointer-events-none" 
            style="box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.65); border-radius: 9999px; margin: 15px; border: 2.5px solid rgba(255, 255, 255, 0.9);"
          ></div>
          <div class="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 pointer-events-none">
            <Move class="w-3 h-3" />
            <span>Drag to reposition</span>
          </div>
        </div>

        <!-- Controls: Zoom slider, Zoom buttons, Rotate, Reset -->
        <div class="mt-4 space-y-3">
          <!-- Zoom Row -->
          <div class="flex items-center gap-2.5 px-1">
            <button 
              type="button"
              @click="zoom = Math.max(0.6, Number((zoom - 0.1).toFixed(2)))"
              class="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut class="w-3.5 h-3.5" />
            </button>
            <input 
              type="range"
              v-model.number="zoom"
              min="0.6"
              max="3.0"
              step="0.05"
              class="flex-1 accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
            />
            <button 
              type="button"
              @click="zoom = Math.min(3.0, Number((zoom + 0.1).toFixed(2)))"
              class="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn class="w-3.5 h-3.5" />
            </button>
            <span class="text-xs font-mono font-bold text-slate-600 w-11 text-right">
              {{ Math.round(zoom * 100) }}%
            </span>
          </div>

          <!-- Action Buttons Row (Rotate, Reset, Cancel, Apply) -->
          <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <div class="flex items-center gap-1.5">
              <button 
                type="button"
                @click="handleRotate"
                class="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Rotate 90 degrees clockwise"
              >
                <RotateCw class="w-3.5 h-3.5 text-slate-500" />
                <span>Rotate</span>
              </button>
              <button 
                type="button"
                @click="handleReset"
                class="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Reset adjustments"
              >
                <RefreshCw class="w-3.5 h-3.5 text-slate-500" />
                <span>Reset</span>
              </button>
            </div>

            <div class="flex items-center gap-2">
              <button 
                type="button"
                @click="handleCancelCrop"
                class="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="button"
                @click="handleApplyCrop"
                :disabled="isUploadingAvatar"
                class="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-extrabold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <Check class="w-3.5 h-3.5" />
                <span>{{ isUploadingAvatar ? 'Uploading...' : 'Apply Photo' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
