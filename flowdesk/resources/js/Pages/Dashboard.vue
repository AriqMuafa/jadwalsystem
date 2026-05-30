<script setup>
import { Head } from '@inertiajs/vue3';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'; // Tambahkan 'watch' di sini
import { usePage } from '@inertiajs/vue3';
import { useTaskStore } from '../Stores/useTaskStore';
import KanbanBoard from '../Components/KanbanBoard.vue';
import TaskDetailModal from '@/Components/TaskDetailModal.vue';

const props = defineProps({
  tasks: { type: Array, default: () => [] },
});

const store = useTaskStore();
const page = usePage();
const isOnline = ref(typeof navigator === 'undefined' ? true : navigator.onLine);
const usingOfflineSnapshot = ref(false);
const isArchiveModalOpen = ref(false);
const workspaceContext = computed(() => page.props.workspaceContext || {});
const activeWorkspace = computed(() => workspaceContext.value.active || null);
const snapshotKey = computed(() => activeWorkspace.value?.id ? `flowdesk:personal-workspace:${activeWorkspace.value.id}` : null);
const boardViewModes = [
  { key: 'tabs', label: 'Kolom' },
  { key: 'scroll', label: 'Scroll' },
  { key: 'all', label: 'Semua' },
];

const formatDate = (value) => {
  if (!value) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};

const normalizeTasks = (tasks) => tasks.map((task) => ({
  ...task,
  tags: Array.isArray(task.tags) ? task.tags : [],
}));

const normalizeWorkspace = (workspace) => {
  if (!workspace) return null;

  return {
    id: workspace.id,
    name: workspace.name,
    owner_id: workspace.owner_id,
    join_code: workspace.join_code,
    is_personal: Boolean(workspace.is_personal),
  };
};

const readSnapshot = () => {
  if (!snapshotKey.value) return null;

  try {
    const raw = localStorage.getItem(snapshotKey.value);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Gagal membaca snapshot offline:', error);
    return null;
  }
};

const writeSnapshot = (tasks) => {
  if (!snapshotKey.value || !activeWorkspace.value?.is_personal || !isOnline.value) return;

  try {
    localStorage.setItem(snapshotKey.value, JSON.stringify({
      workspace: normalizeWorkspace(activeWorkspace.value),
      tasks: normalizeTasks(tasks),
      cached_at: new Date().toISOString(),
    }));
  } catch (error) {
    console.warn('Gagal menyimpan snapshot offline:', error);
  }
};

const applyTasks = (tasks) => {
  store.setTasks(tasks);
  store.loadOfflineDrafts();
  store.loadOfflineQueue();
  store.applyOfflineQueueEffects();
  writeSnapshot(tasks);
};

const applyOfflineSnapshot = () => {
  const snapshot = readSnapshot();

  if (!snapshot?.tasks?.length) {
    usingOfflineSnapshot.value = false;
    store.setOfflineReadOnly(false);
    return;
  }

  usingOfflineSnapshot.value = true;
  store.setOfflineReadOnly(true);
  store.setTasks(snapshot.tasks);
  store.loadOfflineDrafts();
  store.loadOfflineQueue();
  store.applyOfflineQueueEffects();
};

const refreshOnlineState = () => {
  isOnline.value = navigator.onLine;
  store.setOnlineStatus(isOnline.value);

  if (!isOnline.value && activeWorkspace.value?.is_personal) {
    applyOfflineSnapshot();
    return;
  }

  usingOfflineSnapshot.value = false;
  store.setOfflineReadOnly(false);

  if (activeWorkspace.value?.is_personal) {
    store.autoSyncOfflineWork();
  }
};

// Memuat data saat halaman pertama kali dibuka
onMounted(() => {
  store.setActiveWorkspace(activeWorkspace.value);
  store.setOnlineStatus(isOnline.value);
  window.addEventListener('online', refreshOnlineState);
  window.addEventListener('offline', refreshOnlineState);
  refreshOnlineState();

  if (!usingOfflineSnapshot.value) {
    applyTasks(props.tasks);
  }
});

onUnmounted(() => {
  window.removeEventListener('online', refreshOnlineState);
  window.removeEventListener('offline', refreshOnlineState);
});

// MEMPERBAIKI ERROR 404: 
// Pantau perubahan dari Inertia (setelah tambah/hapus tugas)
// dan langsung perbarui state agar ID 'tmp-' terganti dengan ID asli dari database.
watch(() => props.tasks, (newTasks) => {
  if (!isOnline.value) return;
  usingOfflineSnapshot.value = false;
  store.setOfflineReadOnly(false);
  applyTasks(newTasks);
}, { deep: true });

watch(activeWorkspace, (workspace) => {
  store.setActiveWorkspace(workspace);
}, { deep: true });
</script>

<template>
  <Head title="Flowdesk — Productivity Planner" />

  <div
    v-if="!isOnline"
    class="mx-4 mt-3 rounded-xl border px-4 py-3 text-sm md:mx-6"
    :class="activeWorkspace?.is_personal && usingOfflineSnapshot ? 'border-amber/30 bg-amber/10 text-amber' : 'border-rose/30 bg-rose/10 text-rose'"
  >
    <span v-if="activeWorkspace?.is_personal && usingOfflineSnapshot">
      Mode offline: menampilkan snapshot terakhir workspace pribadi. Tugas baru disimpan sebagai draft, perpindahan dan hapus task masuk antrean lokal.
    </span>
    <span v-else-if="activeWorkspace?.is_personal">
      Mode offline: belum ada snapshot workspace pribadi yang bisa ditampilkan.
    </span>
    <span v-else>
      Workspace tim membutuhkan koneksi internet. Buka workspace pribadi yang pernah tersimpan untuk akses offline.
    </span>
  </div>

  <div
    v-if="isOnline && activeWorkspace?.is_personal && (store.offlineDrafts.length > 0 || store.offlineQueue.length > 0)"
    class="mx-4 mt-3 flex flex-col gap-3 rounded-xl border px-4 py-3 text-sm md:mx-6 md:flex-row md:items-center md:justify-between"
    :class="store.failedOfflineQueue.length > 0 ? 'border-rose/30 bg-rose/10 text-rose' : 'border-sage/30 bg-sage/10 text-sage'"
  >
    <div class="min-w-0">
      <p class="font-medium">
        <span v-if="store.isAutoSyncingOffline">Auto-sync berjalan...</span>
        <span v-else>
          {{ store.offlineDrafts.length }} draft, {{ store.pendingOfflineQueue.length }} aksi menunggu, {{ store.failedOfflineQueue.length }} konflik.
        </span>
      </p>
      <p v-if="store.failedOfflineQueue.length > 0" class="mt-1 text-xs opacity-80">
        {{ store.failedOfflineQueue[0]?.last_error }}
      </p>
    </div>
    <div class="flex flex-wrap gap-2">
      <button v-if="store.pendingOfflineQueue.length > 0" class="rounded-lg border border-sage/30 bg-white px-4 py-2 text-xs font-bold text-sage disabled:cursor-not-allowed disabled:opacity-60" :disabled="store.isAutoSyncingOffline || store.isSyncingOfflineQueue" @click="store.syncOfflineQueue()">
        {{ store.isSyncingOfflineQueue ? 'Mengirim...' : 'Sinkron Aksi' }}
      </button>
      <button v-if="store.failedOfflineQueue.length > 0" class="rounded-lg border border-rose/30 bg-white px-4 py-2 text-xs font-bold text-rose disabled:cursor-not-allowed disabled:opacity-60" :disabled="store.isAutoSyncingOffline || store.isSyncingOfflineQueue" @click="store.retryFailedOfflineQueue()">
        Retry Konflik
      </button>
      <button v-if="store.failedOfflineQueue.length > 0" class="rounded-lg border border-rose/30 bg-white px-4 py-2 text-xs font-bold text-rose disabled:cursor-not-allowed disabled:opacity-60" :disabled="store.isAutoSyncingOffline" @click="store.discardFailedOfflineQueue()">
        Hapus Konflik
      </button>
      <button v-if="store.offlineDrafts.length > 0" class="rounded-lg bg-ink px-4 py-2 text-xs font-bold text-sand-50 disabled:cursor-not-allowed disabled:opacity-60" :disabled="store.isAutoSyncingOffline || store.isSyncingOfflineDrafts" @click="store.submitAllOfflineDrafts()">
        {{ store.isSyncingOfflineDrafts ? 'Mengirim...' : 'Kirim Draft' }}
      </button>
    </div>
  </div>

  <div class="flex flex-col gap-3 px-4 pt-3 pb-2 md:flex-row md:items-center md:justify-between md:px-6">
    <div class="flex min-w-0 items-center gap-1 rounded-xl border border-sand-200 bg-white p-1 shadow-sm">
      <button
        v-for="mode in boardViewModes"
        :key="mode.key"
        type="button"
        class="rounded-lg px-3 py-2 text-xs font-bold transition-colors md:text-sm"
        :class="store.boardViewMode === mode.key ? 'bg-ink text-sand-50' : 'text-ink-muted hover:bg-sand-100 hover:text-ink'"
        @click="store.setBoardViewMode(mode.key)"
      >
        {{ mode.label }}
      </button>
    </div>

    <button
      type="button"
      class="inline-flex items-center justify-center gap-2 rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm font-bold text-ink-muted shadow-sm transition-colors hover:bg-sand-100 hover:text-ink"
      @click="isArchiveModalOpen = true"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="4" rx="1" />
        <path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" />
        <path d="M10 12h4" />
      </svg>
      Archived
      <span class="rounded-full bg-sand-100 px-2 py-0.5 text-xs text-ink-muted">{{ store.archivedTasks.length }}</span>
    </button>
  </div>

  <!-- Mobile Tabs -->
  <div v-if="store.boardViewMode === 'tabs'" class="md:hidden flex gap-1 px-4 pb-2">
    <button
      class="tab-btn flex-1 py-2 rounded-xl text-sm font-medium text-center"
      :class="store.activeTab === 'pending' ? 'active' : 'bg-sand-100 text-ink'"
      data-col="pending"
      @click="store.setActiveTab('pending')"
    >
      Pending
    </button>
    <button
      class="tab-btn flex-1 py-2 rounded-xl text-sm font-medium text-center"
      :class="store.activeTab === 'today' ? 'active' : 'bg-sand-100 text-ink'"
      data-col="today"
      @click="store.setActiveTab('today')"
    >
      Hari Ini
    </button>
    
    <button
      class="tab-btn flex-1 py-2 rounded-xl text-sm font-medium text-center"
      :class="store.activeTab === 'on_progress' ? 'active' : 'bg-sand-100 text-ink'"
      data-col="on_progress"
      @click="store.setActiveTab('on_progress')"
    >
      On Progress
    </button>

    <button
      class="tab-btn flex-1 py-2 rounded-xl text-sm font-medium text-center"
      :class="store.activeTab === 'done' ? 'active' : 'bg-sand-100 text-ink'"
      data-col="done"
      @click="store.setActiveTab('done')"
    >
      Selesai
    </button>
  </div>

  <KanbanBoard />
  <TaskDetailModal />

  <Teleport to="body">
    <div
      v-if="isArchiveModalOpen"
      class="fixed inset-0 z-[130] flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm md:items-center md:p-4"
      @click="isArchiveModalOpen = false"
    >
      <div class="flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl md:max-w-3xl md:rounded-2xl" @click.stop>
        <div class="flex items-center justify-between gap-3 border-b border-sand-200 bg-sand-50 px-5 py-4">
          <div>
            <p class="text-xs font-black uppercase tracking-widest text-ink-muted">Archived</p>
            <h2 class="font-display text-xl text-ink">Tugas Diarsipkan</h2>
          </div>
          <button
            type="button"
            class="rounded-lg p-2 text-ink-muted hover:bg-sand-100 hover:text-rose"
            title="Tutup"
            @click="isArchiveModalOpen = false"
          >
            <svg width="19" height="19" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
              <line x1="4" y1="4" x2="15" y2="15" />
              <line x1="15" y1="4" x2="4" y2="15" />
            </svg>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-4">
          <div v-if="store.archivedTasks.length === 0" class="rounded-xl border border-dashed border-sand-200 bg-sand-50 p-8 text-center text-sm text-ink-muted">
            Belum ada tugas yang diarsipkan.
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="task in store.archivedTasks"
              :key="task.id"
              class="rounded-xl border border-sand-200 bg-sand-50 p-4"
            >
              <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div class="min-w-0">
                  <p class="truncate text-sm font-bold text-ink">{{ task.title }}</p>
                  <p class="mt-1 text-xs text-ink-muted">
                    {{ task.category }} · {{ store.priorityLabel[task.priority] || task.priority }} · Diarsipkan {{ formatDate(task.archived_at) }}
                  </p>
                </div>
                <div class="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    class="rounded-lg border border-sand-200 bg-white px-3 py-2 text-xs font-bold text-ink-muted hover:bg-sand-100 hover:text-ink"
                    @click="store.restoreTask(task.id)"
                  >
                    Pulihkan
                  </button>
                  <button
                    type="button"
                    class="rounded-lg border border-rose/20 bg-white px-3 py-2 text-xs font-bold text-rose hover:bg-rose/10"
                    @click="store.deleteTask(task.id)"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
