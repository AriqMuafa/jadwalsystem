<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { router, useForm, usePage } from '@inertiajs/vue3';
import { useTaskStore } from '../Stores/useTaskStore';
import MiniCalendar from '../Components/MiniCalendar.vue';
import TaskForm from '../Components/TaskForm.vue';
import ChatWidget from '../Components/ChatWidget.vue';

const store = useTaskStore();
const page = usePage();
const isOffcanvasOpen = ref(false);
const isModalOpen = ref(false);
const activeChatTask = ref(null);
const inviteEmail = ref('');
const isInviteOpen = ref(false);
const isUserMenuOpen = ref(false);
const isWorkspaceMenuOpen = ref(false);
const isCreateWorkspaceOpen = ref(false);
const workspaceForm = useForm({ name: '' });
const deferredInstallPrompt = ref(null);
const isPwaInstallAvailable = ref(false);
const isPwaUpdateAvailable = ref(false);
const isPwaOfflineReady = ref(false);
const applyPwaUpdate = ref(null);

const workspaceContext = computed(() => page.props.workspaceContext || { all: [], active: null, pendingInvitationCount: 0 });
const currentUser = computed(() => page.props.auth?.user || page.props.currentUser || null);

const categories = computed(() => store.categories);
const priorities = [
  { val: 'high', label: 'Tinggi' },
  { val: 'medium', label: 'Sedang' },
  { val: 'low', label: 'Rendah' },
];

// --- Fitur Jam Real-time ---
const currentTime = ref('');
let clockInterval;

const updateClock = () => {
  const now = new Date();
  currentTime.value = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const openOffCanvas = () => {
  isOffcanvasOpen.value = true;
};

const closeOffCanvas = () => {
  isOffcanvasOpen.value = false;
};

const openModal = () => {
  isModalOpen.value = true;
  setTimeout(() => {
    const el = document.getElementById('modal-task-input');
    if (el) el.focus();
  }, 100);
};

const closeModal = () => {
  isModalOpen.value = false;
};

const switchWorkspace = (e) => {
  if (e.target.value) router.post(`/workspaces/${e.target.value}/switch`);
};

const switchWorkspaceById = (workspaceId) => {
  if (!workspaceId || workspaceId === workspaceContext.value.active?.id) {
    isWorkspaceMenuOpen.value = false;
    return;
  }

  isWorkspaceMenuOpen.value = false;
  router.post(`/workspaces/${workspaceId}/switch`);
};

const createWorkspace = () => {
  if (!workspaceForm.name.trim()) return;

  workspaceForm.post('/workspaces', {
    preserveScroll: true,
    onSuccess: () => {
      workspaceForm.reset();
      isCreateWorkspaceOpen.value = false;
    },
  });
};

const inviteToWorkspace = () => {
  const workspace = workspaceContext.value.active;
  const email = inviteEmail.value.trim();
  if (!workspace?.id || !email) return;

  router.post(`/workspaces/${workspace.id}/invite`, { email }, {
    preserveScroll: true,
    onSuccess: () => {
      inviteEmail.value = '';
      isInviteOpen.value = false;
    },
  });
};

const logout = () => {
  router.post('/logout');
};

const openProfile = () => {
  isUserMenuOpen.value = false;
  router.visit('/profile');
};

const closeHeaderPopups = () => {
  isInviteOpen.value = false;
  isUserMenuOpen.value = false;
  isWorkspaceMenuOpen.value = false;
  isCreateWorkspaceOpen.value = false;
};

const isRunningStandalone = () => (
  window.matchMedia?.('(display-mode: standalone)').matches
  || window.navigator.standalone === true
);

const handleBeforeInstallPrompt = (e) => {
  if (isRunningStandalone()) return;

  e.preventDefault();
  deferredInstallPrompt.value = e;
  isPwaInstallAvailable.value = true;
};

const installPwa = async () => {
  if (!deferredInstallPrompt.value) return;

  deferredInstallPrompt.value.prompt();
  const result = await deferredInstallPrompt.value.userChoice;

  if (result?.outcome === 'accepted') {
    isPwaInstallAvailable.value = false;
    deferredInstallPrompt.value = null;
  }
};

const dismissPwaInstall = () => {
  isPwaInstallAvailable.value = false;
};

const handlePwaUpdateReady = (e) => {
  isPwaUpdateAvailable.value = true;
  applyPwaUpdate.value = e.detail?.update || null;
};

const updatePwa = () => {
  if (applyPwaUpdate.value) {
    applyPwaUpdate.value();
    return;
  }

  window.location.reload();
};

const dismissPwaUpdate = () => {
  isPwaUpdateAvailable.value = false;
};

const handlePwaOfflineReady = () => {
  isPwaOfflineReady.value = true;
  setTimeout(() => {
    isPwaOfflineReady.value = false;
  }, 5000);
};

const handleCalendarDateSelect = (dateKey) => {
  store.highlightDueDate(dateKey);
  closeOffCanvas();
};

const handleBackdropClick = (e) => {
  if (e.target?.id === 'modal-backdrop') closeModal();
};

const handleResize = () => {
  store.setIsMobile(window.innerWidth < 768);
};

const closeOnEscape = (e) => {
  if (e.key === 'Escape') closeModal();
};

// --- Tooltip Shortcut Hint ---
const showShortcutHint = ref(false);

const triggerShortcutHint = () => {
  showShortcutHint.value = true;
  setTimeout(() => {
    showShortcutHint.value = false;
  }, 4000);
};

const handleGlobalKeydown = (e) => {
  // Abaikan pintasan jika pengguna sedang mengetik di input teks
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

  // Tekan 'N' untuk memunculkan Modal tugas baru
  if (e.key.toLowerCase() === 'n') {
    e.preventDefault();
    openModal();
  }

  // Tekan 'Escape' untuk membatalkan pilihan massal
  if (e.key === 'Escape' && store.selectedTasks.length > 0) {
    store.clearSelection();
  }

  if (e.key === 'Escape') {
    closeHeaderPopups();
  }
};

const handleDocumentPointerDown = (e) => {
  if (!e.target?.closest?.('[data-popup-root]')) {
    closeHeaderPopups();
  }
};

onMounted(() => {
  updateClock();
  clockInterval = setInterval(updateClock, 60000); // Update setiap 1 menit
  handleResize();
  window.addEventListener('resize', handleResize);
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  window.addEventListener('appinstalled', dismissPwaInstall);
  window.addEventListener('flowdesk:pwa-update-ready', handlePwaUpdateReady);
  window.addEventListener('flowdesk:pwa-offline-ready', handlePwaOfflineReady);
  document.addEventListener('pointerdown', handleDocumentPointerDown);
  document.addEventListener('keydown', closeOnEscape);
  document.addEventListener('keydown', handleGlobalKeydown); 

  if (window.__flowdeskPwaUpdate) {
    handlePwaUpdateReady({ detail: { update: window.__flowdeskPwaUpdate } });
  }

  if (window.__flowdeskPwaOfflineReady) {
    handlePwaOfflineReady();
  }
});

onUnmounted(() => {
  clearInterval(clockInterval);
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  window.removeEventListener('appinstalled', dismissPwaInstall);
  window.removeEventListener('flowdesk:pwa-update-ready', handlePwaUpdateReady);
  window.removeEventListener('flowdesk:pwa-offline-ready', handlePwaOfflineReady);
  document.removeEventListener('pointerdown', handleDocumentPointerDown);
  document.removeEventListener('keydown', closeOnEscape);
  document.removeEventListener('keydown', handleGlobalKeydown); 
});
</script>

<template>
  <div class="min-h-screen">
    <header class="md:hidden grid grid-cols-[2.25rem_1fr_2.25rem] items-center gap-2 px-4 py-3 bg-sand-50 border-b border-sand-200 sticky top-0 z-30">
      <button aria-label="Menu" class="p-2 rounded-lg hover:bg-sand-100 transition-colors" @click="openOffCanvas">
        <svg width="22" height="22" fill="none" stroke="#1a1714" stroke-width="2" stroke-linecap="round">
          <line x1="3" y1="6" x2="19" y2="6" />
          <line x1="3" y1="11" x2="19" y2="11" />
          <line x1="3" y1="16" x2="19" y2="16" />
        </svg>
      </button>
      <span class="font-display text-xl tracking-tight text-center leading-none truncate">Flowdesk</span>
      <div class="w-9"></div>
    </header>

    <div
      id="offcanvas-backdrop"
      class="fixed inset-0 bg-ink/40 z-40 md:hidden"
      :class="isOffcanvasOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'"
      @click="closeOffCanvas"
    ></div>

    <div
      id="offcanvas"
      class="fixed top-0 left-0 h-full w-72 bg-sand-50 z-50 shadow-2xl md:hidden overflow-y-auto"
      :class="isOffcanvasOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="flex items-center justify-between px-5 py-4 border-b border-sand-200">
        <span class="font-display text-xl">Flowdesk</span>
        <button class="p-1.5 rounded-lg hover:bg-sand-100 transition-colors" @click="closeOffCanvas">
          <svg width="18" height="18" fill="none" stroke="#1a1714" stroke-width="2" stroke-linecap="round">
            <line x1="4" y1="4" x2="14" y2="14" />
            <line x1="14" y1="4" x2="4" y2="14" />
          </svg>
        </button>
      </div>
      <div class="p-5">
        <div class="mb-6 rounded-xl border border-sand-200 bg-white p-4 shadow-card" data-popup-root>
          <p class="text-xs font-semibold uppercase tracking-widest text-ink-muted mb-3">Workspace</p>
          <div class="flex gap-2">
            <div class="relative min-w-0 flex-1">
              <button
                type="button"
                class="w-full rounded-xl border border-sand-200 bg-sand-50 px-3 py-2 text-left transition-colors hover:bg-sand-100"
                @click="isWorkspaceMenuOpen = !isWorkspaceMenuOpen; isCreateWorkspaceOpen = false"
              >
                <span class="flex items-center gap-2">
                  <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink text-[11px] font-bold text-sand-50">
                    {{ workspaceContext.active?.name?.charAt(0)?.toUpperCase() || 'W' }}
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-medium text-ink">{{ workspaceContext.active?.name || 'Pilih workspace' }}</span>
                    <span class="block truncate text-[10px] font-mono tracking-widest text-ink-muted">{{ workspaceContext.active?.join_code || 'NO CODE' }}</span>
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 text-ink-muted transition-transform" :class="isWorkspaceMenuOpen ? 'rotate-180' : ''">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </button>

              <div
                v-if="isWorkspaceMenuOpen"
                class="absolute left-0 top-12 z-50 w-full rounded-xl border border-sand-200 bg-white p-2 shadow-card"
              >
                <div class="max-h-56 overflow-y-auto pr-1">
                  <button
                    v-for="workspace in workspaceContext.all"
                    :key="workspace.id"
                    type="button"
                    class="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-sand-100"
                    :class="workspace.id === workspaceContext.active?.id ? 'bg-sand-100' : ''"
                    @click="switchWorkspaceById(workspace.id); closeOffCanvas()"
                  >
                    <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink text-[11px] font-bold text-sand-50">
                      {{ workspace.name?.charAt(0)?.toUpperCase() || 'W' }}
                    </span>
                    <span class="min-w-0 flex-1">
                      <span class="block truncate text-sm font-medium text-ink">{{ workspace.name }}</span>
                      <span class="block truncate text-[10px] font-mono tracking-widest text-ink-muted">{{ workspace.join_code || '-' }}</span>
                    </span>
                    <svg v-if="workspace.id === workspaceContext.active?.id" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 text-sage">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <button
              type="button"
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sand-200 bg-sand-50 text-ink-muted hover:text-ink"
              title="Tambah workspace"
              @click="isCreateWorkspaceOpen = !isCreateWorkspaceOpen; isWorkspaceMenuOpen = false"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>

          <form v-if="isCreateWorkspaceOpen" class="mt-3 flex gap-2" @submit.prevent="createWorkspace">
            <input v-model="workspaceForm.name" type="text" placeholder="Nama workspace" class="min-w-0 flex-1 rounded-lg border border-sand-200 bg-sand-50 px-3 py-2 text-sm focus:outline-none" />
            <button class="rounded-lg bg-ink px-3 py-2 text-sm font-medium text-sand-50">Buat</button>
          </form>
          <p v-if="workspaceForm.errors.name" class="mt-2 text-xs text-rose">{{ workspaceForm.errors.name }}</p>

          <div class="grid grid-cols-2 gap-2 mt-3">
            <a
              href="/profile"
              class="relative px-3 py-2 rounded-xl border border-sand-200 text-sm font-medium text-center hover:bg-sand-100 transition-colors"
              @click="closeOffCanvas"
            >
              Profile
              <span v-if="workspaceContext.pendingInvitationCount > 0" class="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-rose text-white text-[10px] font-bold flex items-center justify-center">
                {{ workspaceContext.pendingInvitationCount }}
              </span>
            </a>
            <button
              class="px-3 py-2 rounded-xl border border-sand-200 text-sm font-medium text-rose hover:bg-rose/10 transition-colors"
              @click="logout"
            >
              Logout
            </button>
          </div>
        </div>

        <div class="mb-6">
          <div class="bg-white rounded-xl border border-sand-200 p-4 shadow-card">
            <MiniCalendar :tasks="store.activeTasks" @select-date="handleCalendarDateSelect" />
          </div>
        </div>
        <hr class="border-sand-200 mb-6" />
        <div>
          <div class="mb-5">
            <p class="text-xs font-semibold uppercase tracking-widest text-ink-muted mb-3">Kategori</p>
            <div class="flex flex-col gap-2">
              <label v-for="cat in categories" :key="cat" class="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  class="custom-check w-3.5 h-3.5 rounded"
                  :value="cat"
                  :checked="store.activeCategories.includes(cat)"
                  @change="store.toggleCategory(cat, $event.target.checked)"
                />
                <span class="text-sm group-hover:text-ink transition-colors">{{ cat }}</span>
                <span class="ml-auto text-xs text-ink-muted">{{ store.categoryCount(cat) }}</span>
              </label>
            </div>
          </div>
          <div>
            <p class="text-xs font-semibold uppercase tracking-widest text-ink-muted mb-3">Prioritas</p>
            <div class="flex flex-col gap-2">
              <label v-for="pri in priorities" :key="pri.val" class="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  class="custom-check w-3.5 h-3.5 rounded"
                  :value="pri.val"
                  :checked="store.activePriorities.includes(pri.val)"
                  @change="store.togglePriority(pri.val, $event.target.checked)"
                />
                <span class="flex items-center gap-1.5 text-sm group-hover:text-ink transition-colors">
                  <span class="w-2 h-2 rounded-full inline-block" :class="store.priorityDot[pri.val]"></span>{{ pri.label }}
                </span>
                <span class="ml-auto text-xs text-ink-muted">{{ store.priorityCount(pri.val) }}</span>
              </label>
            </div>
          </div>
        </div>
        <hr class="border-sand-200 my-6" />
        <div>
          <p class="text-xs font-semibold uppercase tracking-widest text-ink-muted mb-3">Ringkasan</p>
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between text-sm">
              <span class="text-ink-muted">Pending</span>
              <span class="font-medium">{{ store.columnCount('pending') }}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-ink-muted">Hari Ini</span>
              <span class="font-medium">{{ store.columnCount('today') }}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-ink-muted">On Progress</span>
              <span class="font-medium">{{ store.columnCount('on_progress') }}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-ink-muted">Selesai</span>
              <span class="font-medium">{{ store.columnCount('done') }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="hidden md:flex items-center justify-between px-8 py-4 border-b border-sand-200 bg-sand-50 sticky top-0 z-20 relative">
      <div class="flex items-center gap-3 z-10">
        <div class="w-8 h-8 rounded-xl bg-ink flex items-center justify-center">
          <svg width="16" height="16" fill="none" stroke="#faf8f4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="10" height="11" rx="1" />
            <line x1="6" y1="8" x2="10" y2="8" />
            <line x1="6" y1="11" x2="10" y2="11" />
            <line x1="6" y1="5.5" x2="10" y2="5.5" />
          </svg>
        </div>
        <span class="font-display text-2xl tracking-tight">Flowdesk</span>
      </div>

      <div class="hidden lg:flex items-center gap-2 ml-6 z-10" data-popup-root>
        <div class="relative">
          <button
            type="button"
            class="h-10 w-72 rounded-xl border border-sand-200 bg-white px-3 text-left shadow-sm transition-colors hover:bg-sand-100"
            @click="isWorkspaceMenuOpen = !isWorkspaceMenuOpen; isCreateWorkspaceOpen = false; isInviteOpen = false"
          >
            <span class="flex items-center gap-3">
              <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink text-[11px] font-bold text-sand-50">
                {{ workspaceContext.active?.name?.charAt(0)?.toUpperCase() || 'W' }}
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-medium text-ink">{{ workspaceContext.active?.name || 'Pilih workspace' }}</span>
                <span class="block truncate text-[10px] font-mono tracking-widest text-ink-muted">{{ workspaceContext.active?.join_code || 'NO CODE' }}</span>
              </span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 text-ink-muted transition-transform" :class="isWorkspaceMenuOpen ? 'rotate-180' : ''">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </button>

          <div
            v-if="isWorkspaceMenuOpen"
            class="absolute left-0 top-12 w-80 rounded-xl border border-sand-200 bg-white p-2 shadow-card z-50"
          >
            <p class="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-ink-muted">Workspace aktif</p>
            <div class="max-h-64 overflow-y-auto pr-1">
              <button
                v-for="workspace in workspaceContext.all"
                :key="workspace.id"
                type="button"
                class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-sand-100"
                :class="workspace.id === workspaceContext.active?.id ? 'bg-sand-100' : ''"
                @click="switchWorkspaceById(workspace.id)"
              >
                <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink text-xs font-bold text-sand-50">
                  {{ workspace.name?.charAt(0)?.toUpperCase() || 'W' }}
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-medium text-ink">{{ workspace.name }}</span>
                  <span class="block truncate text-[10px] font-mono tracking-widest text-ink-muted">{{ workspace.join_code || '-' }}</span>
                </span>
                <svg v-if="workspace.id === workspaceContext.active?.id" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" class="text-sage">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div class="relative">
          <button
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-xl border border-sand-200 bg-white text-ink-muted shadow-sm transition-colors hover:bg-sand-100 hover:text-ink"
            title="Tambah workspace"
            @click="isCreateWorkspaceOpen = !isCreateWorkspaceOpen; isWorkspaceMenuOpen = false; isInviteOpen = false"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <form
            v-if="isCreateWorkspaceOpen"
            class="absolute left-0 top-12 w-72 rounded-xl border border-sand-200 bg-white p-3 shadow-card z-50"
            @submit.prevent="createWorkspace"
          >
            <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">Workspace baru</p>
            <div class="flex gap-2">
              <input v-model="workspaceForm.name" type="text" placeholder="Nama workspace" class="min-w-0 flex-1 rounded-lg border border-sand-200 bg-sand-50 px-3 py-2 text-sm focus:outline-none" />
              <button class="rounded-lg bg-ink px-3 py-2 text-sm font-medium text-sand-50">Buat</button>
            </div>
            <p v-if="workspaceForm.errors.name" class="mt-2 text-xs text-rose">{{ workspaceForm.errors.name }}</p>
          </form>
        </div>

        <button
          class="px-3 py-2 rounded-xl border border-sand-200 bg-white text-sm font-medium text-ink-muted hover:text-ink hover:bg-sand-100 transition-colors"
          @click="isInviteOpen = !isInviteOpen; isWorkspaceMenuOpen = false; isCreateWorkspaceOpen = false"
        >
          Undang
        </button>
        <form
          v-if="isInviteOpen"
          class="absolute top-16 left-80 w-80 bg-white border border-sand-200 rounded-xl shadow-card p-3 z-50"
          @submit.prevent="inviteToWorkspace"
        >
          <p class="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-2">Undang ke workspace</p>
          <div class="mb-3 rounded-lg bg-sand-50 border border-sand-200 px-3 py-2">
            <p class="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">Kode join</p>
            <p class="font-mono text-sm tracking-widest text-ink">{{ workspaceContext.active?.join_code || '-' }}</p>
          </div>
          <div class="flex gap-2">
            <input v-model="inviteEmail" type="email" placeholder="email@domain.com" class="min-w-0 flex-1 px-3 py-2 rounded-lg border border-sand-200 bg-sand-50 text-sm focus:outline-none" />
            <button class="px-3 py-2 rounded-lg bg-ink text-sand-50 text-sm font-medium">Kirim</button>
          </div>
        </form>
      </div>

      <div class="hidden md:flex items-center gap-2 ml-auto relative z-10" data-popup-root>
        <span
          v-if="!store.isOnline"
          class="hidden lg:inline-flex items-center gap-1.5 rounded-full border border-amber/30 bg-amber/10 px-3 py-1.5 text-xs font-bold text-amber"
          title="Mode offline read-only"
        >
          <span class="h-1.5 w-1.5 rounded-full bg-amber"></span>
          Offline
        </span>

        <button
          class="relative w-8 h-8 rounded-full border border-sand-200 bg-white text-ink-muted flex items-center justify-center hover:bg-sand-100 hover:text-ink transition-colors"
          title="Profile"
          @click="isUserMenuOpen = !isUserMenuOpen; isInviteOpen = false; isWorkspaceMenuOpen = false; isCreateWorkspaceOpen = false"
        >
          <span class="text-xs font-bold">{{ currentUser?.name?.charAt(0)?.toUpperCase() || 'U' }}</span>
          <span v-if="workspaceContext.pendingInvitationCount > 0" class="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-rose text-white text-[9px] font-bold flex items-center justify-center">
            {{ workspaceContext.pendingInvitationCount }}
          </span>
        </button>

        <div
          v-if="isUserMenuOpen"
          class="absolute right-12 top-11 w-56 rounded-xl border border-sand-200 bg-white p-2 shadow-card z-50"
        >
          <div class="px-3 py-2 border-b border-sand-100 mb-1">
            <p class="text-sm font-medium text-ink truncate">{{ currentUser?.name || 'User' }}</p>
            <p class="text-xs text-ink-muted truncate">{{ currentUser?.email }}</p>
          </div>
          <button class="relative w-full px-3 py-2 rounded-lg text-left text-sm text-ink-muted hover:bg-sand-100 hover:text-ink transition-colors" @click="openProfile">
            Profile
            <span v-if="workspaceContext.pendingInvitationCount > 0" class="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose px-1 text-[10px] font-bold text-white">
              {{ workspaceContext.pendingInvitationCount }}
            </span>
          </button>
          <button class="w-full px-3 py-2 rounded-lg text-left text-sm text-rose hover:bg-rose/10 transition-colors" @click="logout">
            Logout
          </button>
        </div>
          
        <button 
            @click="triggerShortcutHint"
            class="w-8 h-8 rounded-full border border-sand-200 bg-white text-ink-muted flex items-center justify-center hover:bg-sand-100 hover:text-ink transition-colors"
            title="Lihat Pintasan Keyboard"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </button>

          <div 
            class="absolute top-12 right-0 w-72 bg-ink text-sand-50 text-xs p-3.5 rounded-xl shadow-card transition-all duration-300 z-50 origin-top-right pointer-events-none"
            :class="showShortcutHint ? 'scale-100 opacity-100' : 'scale-95 opacity-0'"
          >
            <p class="font-semibold text-sand-200 border-b border-sand-700 pb-1 mb-1.5 flex items-center gap-1.5">
              Pintasan Cepat:
            </p>
            <ul class="space-y-1 text-[11px] font-mono leading-relaxed mb-3">
              <li><span class="bg-sand-800 px-1 py-0.5 rounded mr-1 text-sand-100">N</span> Buka input tugas baru</li>
              <li><span class="bg-sand-800 px-1 py-0.5 rounded mr-1 text-sand-100">Shift</span> + klik kartu untuk pilih massal</li>
              <li><span class="bg-sand-800 px-1 py-0.5 rounded mr-1 text-sand-100">Hold</span> Tahan kartu di mobile</li>
              <li><span class="bg-sand-800 px-1 py-0.5 rounded mr-1 text-sand-100">Esc</span> Batal pilih massal</li>
            </ul>

            <p class="font-semibold text-sand-200 border-b border-sand-700 pb-1 mb-1.5 flex items-center gap-1.5">
              Ketikan Cerdas:
            </p>
            <ul class="space-y-1.5 text-[11px] leading-relaxed text-sand-100">
              <li>Ketik <span class="text-amber font-mono bg-sand-800 px-1 rounded">besok jam 14</span> untuk isi kalender otomatis.</li>
              <li>Ketik kata kunci tugas lama (cth: <span class="text-amber font-mono bg-sand-800 px-1 rounded">bug</span>) untuk melihat prediksi waktu.</li>
            </ul>
          </div>

          <button 
            @click="openModal" 
            class="bg-ink hover:bg-ink-light text-sand-50 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Tambah
          </button>
          
        </div>
    </div>

    <div class="flex h-[calc(100vh-57px)] md:h-[calc(100vh-65px)] overflow-hidden">
      <aside id="sidebar" class="hidden md:flex flex-col w-64 lg:w-72 border-r border-sand-200 bg-sand-50 overflow-y-auto shrink-0 p-5 gap-6">
        <div class="mb-6">
          <div class="bg-white rounded-xl border border-sand-200 p-4 shadow-card">
            <MiniCalendar :tasks="store.activeTasks" @select-date="handleCalendarDateSelect" />
          </div>
        </div>
        <hr class="border-sand-200" />
        <div>
          <div class="mb-5">
            <p class="text-xs font-semibold uppercase tracking-widest text-ink-muted mb-3">Kategori</p>
            <div class="flex flex-col gap-2">
              <label v-for="cat in categories" :key="cat" class="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  class="custom-check w-3.5 h-3.5 rounded"
                  :value="cat"
                  :checked="store.activeCategories.includes(cat)"
                  @change="store.toggleCategory(cat, $event.target.checked)"
                />
                <span class="text-sm group-hover:text-ink transition-colors">{{ cat }}</span>
                <span class="ml-auto text-xs text-ink-muted">{{ store.categoryCount(cat) }}</span>
              </label>
            </div>
          </div>
          <div>
            <p class="text-xs font-semibold uppercase tracking-widest text-ink-muted mb-3">Prioritas</p>
            <div class="flex flex-col gap-2">
              <label v-for="pri in priorities" :key="pri.val" class="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  class="custom-check w-3.5 h-3.5 rounded"
                  :value="pri.val"
                  :checked="store.activePriorities.includes(pri.val)"
                  @change="store.togglePriority(pri.val, $event.target.checked)"
                />
                <span class="flex items-center gap-1.5 text-sm group-hover:text-ink transition-colors">
                  <span class="w-2 h-2 rounded-full inline-block" :class="store.priorityDot[pri.val]"></span>{{ pri.label }}
                </span>
                <span class="ml-auto text-xs text-ink-muted">{{ store.priorityCount(pri.val) }}</span>
              </label>
            </div>
          </div>
        </div>
        <hr class="border-sand-200" />
        <div>
          <p class="text-xs font-semibold uppercase tracking-widest text-ink-muted mb-3">Ringkasan</p>
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between text-sm">
              <span class="text-ink-muted">Pending</span>
              <span class="font-medium">{{ store.columnCount('pending') }}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-ink-muted">Hari Ini</span>
              <span class="font-medium">{{ store.columnCount('today') }}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-ink-muted">On Progress</span>
              <span class="font-medium">{{ store.columnCount('on_progress') }}</span>
            </div>
            <div class="flex items-center justify-between text-sm">
              <span class="text-ink-muted">Selesai</span>
              <span class="font-medium">{{ store.columnCount('done') }}</span>
            </div>
          </div>
        </div>
      </aside>

      <main class="flex-1 overflow-hidden flex flex-col">
        <slot />
      </main>
    </div>

    <div
      v-if="isPwaInstallAvailable || isPwaUpdateAvailable || isPwaOfflineReady"
      class="fixed left-4 right-4 top-16 z-[90] rounded-2xl border border-sand-200 bg-white/95 p-3 text-ink shadow-2xl backdrop-blur md:left-auto md:right-6 md:top-20 md:w-96"
    >
      <div v-if="isPwaUpdateAvailable" class="flex items-start gap-3">
        <span class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink text-sand-50">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3v6h-6" />
          </svg>
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-bold">Update Flowdesk tersedia</p>
          <p class="mt-0.5 text-xs leading-relaxed text-ink-muted">Muat versi terbaru setelah pekerjaan penting selesai.</p>
          <div class="mt-3 flex gap-2">
            <button class="rounded-lg bg-ink px-3 py-2 text-xs font-bold text-sand-50" @click="updatePwa">
              Update
            </button>
            <button class="rounded-lg border border-sand-200 px-3 py-2 text-xs font-bold text-ink-muted" @click="dismissPwaUpdate">
              Nanti
            </button>
          </div>
        </div>
      </div>

      <div v-else-if="isPwaInstallAvailable" class="flex items-start gap-3">
        <span class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink text-sand-50">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3v12" />
            <path d="m7 10 5 5 5-5" />
            <path d="M5 21h14" />
          </svg>
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-bold">Install Flowdesk</p>
          <p class="mt-0.5 text-xs leading-relaxed text-ink-muted">Buka lebih cepat dari home screen atau desktop.</p>
          <div class="mt-3 flex gap-2">
            <button class="rounded-lg bg-ink px-3 py-2 text-xs font-bold text-sand-50" @click="installPwa">
              Install
            </button>
            <button class="rounded-lg border border-sand-200 px-3 py-2 text-xs font-bold text-ink-muted" @click="dismissPwaInstall">
              Tutup
            </button>
          </div>
        </div>
      </div>

      <div v-else class="flex items-center gap-3">
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sage text-white">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <div class="min-w-0">
          <p class="text-sm font-bold">Flowdesk siap offline</p>
          <p class="mt-0.5 text-xs text-ink-muted">Aset inti aplikasi sudah tersimpan di perangkat ini.</p>
        </div>
      </div>
    </div>

    <button
      id="fab"
      class="md:hidden fixed bottom-24 right-6 z-30 w-14 h-14 rounded-full bg-ink text-sand-50 shadow-fab flex items-center justify-center text-2xl leading-none select-none"
      aria-label="Tambah Tugas"
      @click="openModal"
    >
      <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
        <line x1="11" y1="4" x2="11" y2="18" />
        <line x1="4" y1="11" x2="18" y2="11" />
      </svg>
    </button>

    <div
      id="modal-backdrop"
      class="fixed inset-0 z-[120] flex items-end md:items-center justify-center bg-ink/40 p-4"
      :class="isModalOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'"
      @click="handleBackdropClick"
    >
      <div id="modal-box" class="bg-sand-50 w-full max-w-lg rounded-t-2xl md:rounded-2xl p-6 pb-8 shadow-2xl transition-all duration-200" @click.stop>    <div class="flex items-center justify-between mb-5">
          <h2 class="font-display text-xl">Tugas Baru</h2>
          <button class="p-1.5 rounded-lg hover:bg-sand-100 transition-colors" @click="closeModal">
            <svg width="18" height="18" fill="none" stroke="#1a1714" stroke-width="2" stroke-linecap="round">
              <line x1="4" y1="4" x2="14" y2="14" />
              <line x1="14" y1="4" x2="4" y2="14" />
            </svg>
          </button>
        </div>
        <TaskForm variant="modal" default-column="pending" @submitted="closeModal" />
      </div>
    </div>
  </div>
  <div
    class="fixed right-4 bottom-4 md:right-24 md:bottom-8 z-40 flex items-center gap-2 rounded-full border border-sand-200 bg-white/95 px-4 py-2.5 text-ink shadow-card backdrop-blur transition-all duration-300"
    :class="store.selectedTasks.length > 0 ? 'translate-y-3 opacity-0 pointer-events-none md:translate-y-0 md:opacity-100 md:pointer-events-auto' : 'translate-y-0 opacity-100'"
    aria-label="Jam saat ini"
  >
    <span class="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-sand-50">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 16 14" />
      </svg>
    </span>
    <span class="font-mono text-base font-extrabold leading-none tracking-normal">{{ currentTime }}</span>
    <span class="hidden sm:inline text-[10px] font-black uppercase tracking-widest text-ink-muted">WIB</span>
  </div>
  <div 
      class="fixed bottom-8 left-1/2 -translate-x-1/2 bg-ink text-sand-50 px-6 py-3.5 rounded-full shadow-2xl flex items-center gap-4 z-50 transition-all duration-300 overflow-x-auto max-w-[90vw]"
      :class="store.selectedTasks.length > 0 ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'"
    >
      <span class="text-sm font-medium whitespace-nowrap">{{ store.selectedTasks.length }} dipilih</span>
      <div class="w-px h-4 bg-sand-700 shrink-0"></div>
      
      <button @click="store.bulkMove('pending')" class="shrink-0 text-sm font-medium hover:text-white transition-colors flex items-center gap-1.5" title="Pindah ke Pending">
        <span class="w-2.5 h-2.5 rounded-full bg-sand-300 inline-block"></span>
        Pending
      </button>

      <button @click="store.bulkMove('today')" class="shrink-0 text-sm font-medium hover:text-white transition-colors flex items-center gap-1.5" title="Pindah ke Hari Ini">
        <span class="w-2.5 h-2.5 rounded-full bg-sage inline-block"></span>
        Hari Ini
      </button>

      <button @click="store.bulkMove('on_progress')" class="shrink-0 text-sm font-medium hover:text-white transition-colors flex items-center gap-1.5" title="Pindah ke On Progress">
        <span class="w-2.5 h-2.5 rounded-full bg-sky inline-block"></span>
        On Progress
      </button>
      
      <button @click="store.bulkMove('done')" class="shrink-0 text-sm font-medium hover:text-white transition-colors flex items-center gap-1.5" title="Pindah ke Selesai">
        <span class="w-2.5 h-2.5 rounded-full bg-ink-muted inline-block"></span>
        Selesai
      </button>

      <div class="w-px h-4 bg-sand-700 shrink-0"></div>

      <button @click="store.bulkDelete()" class="shrink-0 text-sm font-medium text-rose hover:text-rose-light transition-colors flex items-center gap-1.5" title="Hapus Massal">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
        </svg>
        Hapus
      </button>
      
      <div class="w-px h-4 bg-sand-700 shrink-0"></div>
      <button @click="store.clearSelection()" class="shrink-0 text-sm text-sand-400 hover:text-sand-50 transition-colors">Batal</button>
    </div>
    <ChatWidget v-show="!isModalOpen && !store.detailModalOpen" :task="activeChatTask" @close="activeChatTask = null" />
</template>
