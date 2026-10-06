<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { UserAccount, formatUserRole } from '../types';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Building2, 
  Leaf, 
  CreditCard, 
  Lock,
  CheckCircle2,
  AlertCircle,
  Camera,
  Upload,
  Trash2,
  Edit3
} from 'lucide-vue-next';

const props = defineProps<{
  isOpen: boolean;
  currentUser?: UserAccount | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'logout'): void;
  (e: 'updateProfile', updatedData: Partial<UserAccount>): void;
}>();

// Editing state: false = View mode (Image 3), true = Edit mode (Images 4 & 5)
const isEditing = ref(false);

// Active Tab in Edit Mode: 'info' | 'security'
const activeTab = ref<'info' | 'security'>('info');

// Avatar state
const avatarPreview = ref<string>('');
const avatarFileInputRef = ref<HTMLInputElement | null>(null);
const uploadMessage = ref<{ text: string; type: 'success' | 'error' } | null>(null);

// Profile Form State (Image 4)
const profileForm = reactive({
  firstName: '',
  lastName: '',
  email: '',
  orgName: '',
  role: '',
  isActive: true,
  bio: '',
  idNumber: ''
});

// Security Form State (Image 5)
const securityForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
});

const securityError = ref('');
const securitySuccess = ref('');

const syncUserData = () => {
  if (props.currentUser) {
    const parts = (props.currentUser.name || '').split(' ');
    profileForm.firstName = props.currentUser.firstName || parts[0] || '';
    profileForm.lastName = props.currentUser.lastName || parts.slice(1).join(' ') || '';
    profileForm.email = props.currentUser.email || '';
    profileForm.orgName = props.currentUser.orgName || props.currentUser.orgId || 'College of Business and Information Technology';
    profileForm.role = formatUserRole(props.currentUser.role);
    profileForm.isActive = props.currentUser.isActive !== false;
    profileForm.bio = props.currentUser.bio || '';
    profileForm.idNumber = props.currentUser.idNumber || '2023-0142';
    avatarPreview.value = props.currentUser.avatar || '';
  }
};

watch(
  () => props.currentUser,
  () => {
    syncUserData();
  },
  { immediate: true }
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
};

const handleCancelEdit = () => {
  syncUserData();
  isEditing.value = false;
  securityError.value = '';
  securitySuccess.value = '';
};

const triggerAvatarUpload = () => {
  avatarFileInputRef.value?.click();
};

const handleAvatarFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    uploadMessage.value = { text: 'Please select a valid image file (PNG, JPG, WEBP).', type: 'error' };
    return;
  }

  // Max 5MB
  if (file.size > 5 * 1024 * 1024) {
    uploadMessage.value = { text: 'Image file size must be less than 5MB.', type: 'error' };
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      // Resize to max 300x300 square crop via canvas for fast performance & storage
      const canvas = document.createElement('canvas');
      const size = 300;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Calculate crop aspect ratio (center-crop square)
        const minDim = Math.min(img.width, img.height);
        const startX = (img.width - minDim) / 2;
        const startY = (img.height - minDim) / 2;
        ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        avatarPreview.value = dataUrl;
        
        // Immediately persist to profile
        emit('updateProfile', { avatar: dataUrl });
        uploadMessage.value = { text: 'Profile picture updated successfully!', type: 'success' };
        setTimeout(() => {
          uploadMessage.value = null;
        }, 3000);
      }
    };
    img.src = event.target?.result as string;
  };
  reader.readAsDataURL(file);
  target.value = '';
};

const handleRemoveAvatar = () => {
  avatarPreview.value = '';
  emit('updateProfile', { avatar: '' });
  uploadMessage.value = { text: 'Profile picture removed. Default icon restored.', type: 'success' };
  setTimeout(() => {
    uploadMessage.value = null;
  }, 3000);
};

const handleSaveChanges = () => {
  const fullName = `${profileForm.firstName.trim()} ${profileForm.lastName.trim()}`.trim();
  emit('updateProfile', {
    name: fullName || props.currentUser?.name,
    firstName: profileForm.firstName.trim(),
    lastName: profileForm.lastName.trim(),
    email: profileForm.email.trim(),
    orgName: profileForm.orgName.trim(),
    role: profileForm.role.trim() as any,
    isActive: profileForm.isActive,
    bio: profileForm.bio.trim(),
    idNumber: profileForm.idNumber.trim(),
    avatar: avatarPreview.value
  });
  isEditing.value = false;
};

const handleUpdatePassword = () => {
  securityError.value = '';
  securitySuccess.value = '';

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

  emit('updateProfile', {
    password: securityForm.newPassword
  });

  securitySuccess.value = 'Password successfully updated.';
  securityForm.currentPassword = '';
  securityForm.newPassword = '';
  securityForm.confirmPassword = '';

  setTimeout(() => {
    isEditing.value = false;
    securitySuccess.value = '';
  }, 1200);
};
</script>

<template>
  <div 
    v-if="isOpen" 
    class="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
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
      class="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl p-5 sm:p-8 animate-in fade-in zoom-in-95 duration-150 my-4"
    >
      <!-- Top Title Header with Back Arrow (Image 3) -->
      <div class="mb-6 flex items-start justify-between gap-3">
        <div class="flex items-start gap-3">
          <button 
            @click="emit('close')"
            class="p-2 -ml-2 rounded-xl text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Back to Workspace"
          >
            <ArrowLeft class="w-6 h-6 text-slate-900 stroke-[2.5]" />
          </button>
          <div>
            <h2 class="text-xl sm:text-2xl font-black text-slate-950 tracking-tight leading-tight">
              Profile Settings
            </h2>
            <p class="text-xs sm:text-sm text-slate-500 font-medium">
              Manage your account information, profile picture, and security preferences
            </p>
          </div>
        </div>

        <button
          v-if="isEditing"
          @click="handleCancelEdit"
          class="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
        >
          View Profile
        </button>
      </div>

      <!-- Live upload toast alert if any -->
      <div 
        v-if="uploadMessage"
        class="mb-4 p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150"
        :class="uploadMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'"
      >
        <CheckCircle2 v-if="uploadMessage.type === 'success'" class="w-4 h-4 text-emerald-600 shrink-0" />
        <AlertCircle v-else class="w-4 h-4 text-rose-600 shrink-0" />
        <span>{{ uploadMessage.text }}</span>
      </div>

      <!-- Main Layout: Single Card (Image 3) or Two-Column (Images 4 & 5) -->
      <div 
        class="flex flex-col gap-6"
        :class="isEditing ? 'lg:flex-row lg:items-start' : 'items-center justify-center'"
      >
        <!-- LEFT PROFILE CARD (Matches Image 3) -->
        <div 
          class="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 w-full text-center transition-all"
          :class="isEditing ? 'lg:w-[320px] shrink-0' : 'max-w-md'"
        >
          <!-- Circular Avatar with Hover Camera Upload Action -->
          <div class="relative w-24 h-24 mx-auto mb-2 group">
            <div class="w-24 h-24 rounded-full bg-slate-950 text-white flex items-center justify-center shadow-md ring-4 ring-slate-100 overflow-hidden">
              <img
                v-if="avatarPreview && (avatarPreview.startsWith('data:') || avatarPreview.startsWith('http'))"
                :src="avatarPreview"
                :alt="currentUser?.name || 'User'"
                class="w-full h-full object-cover"
              />
              <User v-else class="w-13 h-13 text-white" />
            </div>

            <!-- Hover overlay button to change photo directly -->
            <button
              type="button"
              @click="triggerAvatarUpload"
              class="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer shadow-md"
              title="Click to upload profile photo"
            >
              <Camera class="w-5 h-5 text-white mb-0.5" />
              <span class="text-[10px] font-bold">Change</span>
            </button>
          </div>

          <!-- Quick Action Buttons for Avatar (Upload / Remove) -->
          <div class="flex items-center justify-center gap-2 mb-4">
            <button
              type="button"
              @click="triggerAvatarUpload"
              class="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2.5 py-1 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              title="Upload new profile picture from your device"
            >
              <Camera class="w-3.5 h-3.5 text-blue-600" />
              <span>{{ avatarPreview ? 'Change Photo' : 'Upload Photo' }}</span>
            </button>

            <button
              v-if="avatarPreview"
              type="button"
              @click="handleRemoveAvatar"
              class="text-[11px] font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
              title="Remove custom profile picture and revert to default silhouette"
            >
              <Trash2 class="w-3 h-3" />
              <span>Remove</span>
            </button>
          </div>

          <!-- Name & Role Title -->
          <h3 class="text-xl font-extrabold text-slate-950">
            {{ currentUser?.name || `${profileForm.firstName} ${profileForm.lastName}` || 'User' }}
          </h3>
          <p class="text-xs sm:text-sm text-slate-500 font-semibold mt-0.5 mb-6">
            {{ formatUserRole(currentUser?.role) }}
          </p>

          <!-- Details List with Icons (Image 3) -->
          <div class="space-y-3.5 text-left text-xs font-bold text-slate-900 mb-8 px-1">
            <!-- Email -->
            <div class="flex items-center gap-3">
              <div class="w-5 h-5 flex items-center justify-center shrink-0">
                <Mail class="w-4 h-4 text-slate-950" />
              </div>
              <span class="truncate font-semibold text-slate-800">{{ currentUser?.email }}</span>
            </div>

            <!-- Organization / College -->
            <div class="flex items-center gap-3">
              <div class="w-5 h-5 flex items-center justify-center shrink-0">
                <Building2 class="w-4 h-4 text-slate-950" />
              </div>
              <span class="truncate font-semibold text-slate-800">
                {{ currentUser?.orgName || currentUser?.orgId || 'College of Business and Information Technology' }}
              </span>
            </div>

            <!-- Status -->
            <div class="flex items-center gap-3">
              <div class="w-5 h-5 flex items-center justify-center shrink-0">
                <Leaf class="w-4 h-4 text-slate-950" />
              </div>
              <span class="font-semibold text-slate-800">{{ currentUser?.isActive ? 'Active' : 'Inactive' }}</span>
            </div>

            <!-- ID Number -->
            <div class="flex items-center gap-3">
              <div class="w-5 h-5 flex items-center justify-center shrink-0">
                <CreditCard class="w-4 h-4 text-slate-950" />
              </div>
              <span class="font-semibold text-slate-800">{{ currentUser?.idNumber || '2023-0142' }}</span>
            </div>
          </div>

          <!-- Action Buttons (Consistent with other primary buttons in the application) -->
          <div class="space-y-2.5">
            <!-- Edit Profile Button: Standard Primary Blue (bg-blue-600 hover:bg-blue-700) -->
            <button
              type="button"
              @click="handleOpenEdit"
              class="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm transition-all shadow-sm hover:shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              <Edit3 class="w-4 h-4" />
              <span>Edit Profile</span>
            </button>

            <!-- Log Out Button -->
            <button
              type="button"
              @click="emit('logout')"
              class="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-sm transition-all cursor-pointer"
            >
              Log Out
            </button>
          </div>
        </div>

        <!-- RIGHT EDIT CARD (Shown when Edit Profile is clicked, Matches Images 4 & 5) -->
        <div 
          v-if="isEditing" 
          class="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex-1 w-full flex flex-col justify-between"
        >
          <!-- Top Tabs (Image 4 & 5) -->
          <div>
            <div class="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
              <button
                type="button"
                @click="activeTab = 'info'"
                class="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                :class="activeTab === 'info' 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'"
              >
                Profile Information
              </button>
              <button
                type="button"
                @click="activeTab = 'security'"
                class="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                :class="activeTab === 'security' 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'"
              >
                Security
              </button>
            </div>

            <!-- TAB 1: PROFILE INFORMATION (Image 4) -->
            <div v-if="activeTab === 'info'" class="space-y-4">
              
              <!-- Avatar Upload Row in Edit Mode -->
              <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-4">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-full bg-slate-950 text-white flex items-center justify-center shrink-0 overflow-hidden shadow-xs ring-2 ring-white">
                    <img
                      v-if="avatarPreview && (avatarPreview.startsWith('data:') || avatarPreview.startsWith('http'))"
                      :src="avatarPreview"
                      alt="Thumbnail"
                      class="w-full h-full object-cover"
                    />
                    <User v-else class="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h5 class="text-xs font-bold text-slate-900">Profile Picture</h5>
                    <p class="text-[11px] text-slate-500">Upload a custom photo for your institutional account</p>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    @click="triggerAvatarUpload"
                    class="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Upload class="w-3.5 h-3.5" />
                    <span>Upload</span>
                  </button>
                  <button
                    v-if="avatarPreview"
                    type="button"
                    @click="handleRemoveAvatar"
                    class="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-600 hover:text-rose-700 font-bold text-xs transition-colors cursor-pointer"
                    title="Remove custom photo"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <!-- First Name & Last Name -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-800 mb-1.5">First Name</label>
                  <input
                    v-model="profileForm.firstName"
                    type="text"
                    placeholder="Enter first name"
                    class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-800 mb-1.5">Last Name</label>
                  <input
                    v-model="profileForm.lastName"
                    type="text"
                    placeholder="Enter last name"
                    class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium"
                  />
                </div>
              </div>

              <!-- Email Address & Organization -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-800 mb-1.5">Email Address</label>
                  <input
                    v-model="profileForm.email"
                    type="email"
                    placeholder="Enter institutional email"
                    class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-800 mb-1.5">Organization / Unit</label>
                  <input
                    v-model="profileForm.orgName"
                    type="text"
                    placeholder="Enter student council or office"
                    class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium"
                  />
                </div>
              </div>

              <!-- Position / Role & ID Number -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-800 mb-1.5">Role / Position</label>
                  <input
                    v-model="profileForm.role"
                    type="text"
                    placeholder="e.g. System Administrator, Org President"
                    class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-800 mb-1.5">Student / Employee ID</label>
                  <input
                    v-model="profileForm.idNumber"
                    type="text"
                    placeholder="e.g. 2023-0142"
                    class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium"
                  />
                </div>
              </div>

              <!-- Bio / Notes -->
              <div>
                <label class="block text-xs font-bold text-slate-800 mb-1.5">Bio / Description</label>
                <textarea
                  v-model="profileForm.bio"
                  rows="3"
                  placeholder="Tell us about your organizational responsibilities..."
                  class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium"
                ></textarea>
              </div>

              <!-- Bottom Action Buttons (Image 4) -->
              <div class="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  @click="handleCancelEdit"
                  class="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  @click="handleSaveChanges"
                  class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold transition-colors shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </div>

            <!-- TAB 2: SECURITY (Image 5) -->
            <div v-else-if="activeTab === 'security'" class="space-y-4">
              <!-- Current Password -->
              <div>
                <label class="block text-xs font-bold text-slate-800 mb-1.5">Current Password</label>
                <input
                  v-model="securityForm.currentPassword"
                  type="password"
                  placeholder="Enter current password"
                  class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium"
                />
              </div>

              <!-- New Password -->
              <div>
                <label class="block text-xs font-bold text-slate-800 mb-1.5">New Password</label>
                <input
                  v-model="securityForm.newPassword"
                  type="password"
                  placeholder="Enter new password"
                  class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium"
                />
              </div>

              <!-- Confirm New Password -->
              <div>
                <label class="block text-xs font-bold text-slate-800 mb-1.5">Confirm New Password</label>
                <input
                  v-model="securityForm.confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium"
                />
              </div>

              <!-- Password Requirements Box (Light Blue Box from Image 5) -->
              <div class="p-4 rounded-xl bg-blue-50/80 border border-blue-100 text-xs text-blue-950 space-y-1.5">
                <p class="font-extrabold text-blue-900">Password Requirements:</p>
                <ul class="space-y-1 text-[11px] text-blue-800 font-medium">
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
              <div v-if="securityError" class="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle class="w-4 h-4 shrink-0" />
                <span>{{ securityError }}</span>
              </div>
              <div v-if="securitySuccess" class="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 class="w-4 h-4 shrink-0" />
                <span>{{ securitySuccess }}</span>
              </div>

              <!-- Bottom Action Buttons (Image 5) -->
              <div class="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  @click="handleCancelEdit"
                  class="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  @click="handleUpdatePassword"
                  class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold transition-colors shadow-xs cursor-pointer"
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
</template>
