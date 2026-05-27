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
const workspaceContext = computed(() => page.props.workspaceContext || {});
const activeWorkspace = computed(() => workspaceContext.value.active || null);
const snapshotKey = computed(() => activeWorkspace.value?.id ? `flowdesk:personal-workspace:${activeWorkspace.value.id}` : null);

const normalizeTasks = (tasks) => tasks.map((task) => ({
  ...task,
  tags: Array.isArray(task.tags) ? task.tags : [],
}));

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
      workspace: activeWorkspace.value,
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

  <!-- Mobile Tabs -->
  <div class="md:hidden flex gap-1 px-4 pt-3 pb-2">
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
</template>
