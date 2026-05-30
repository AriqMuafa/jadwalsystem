<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { useTaskStore } from '../Stores/useTaskStore';

const store = useTaskStore();

const task = computed(() => store.selectedTaskDetail);
const activeTab = ref('detail');
const isPdfPreviewOpen = ref(false);
const editForm = reactive({
  title: '',
  category: 'Kerja',
  priority: 'medium',
  column_status: 'pending',
  due_date: '',
});

const statusLabels = {
  pending: 'Pending',
  today: 'Hari Ini',
  on_progress: 'On Progress',
  done: 'Selesai',
};

const statusClasses = {
  pending: 'bg-sand-100 text-ink-muted',
  today: 'bg-sage/15 text-sage',
  on_progress: 'bg-sky/15 text-sky',
  done: 'bg-sand-200 text-ink-muted',
};

const tabs = [
  { id: 'detail', label: 'Detail' },
  { id: 'attachment', label: 'Lampiran' },
  { id: 'history', label: 'Riwayat' },
];

const setActiveTab = (tab) => {
  activeTab.value = tab;
  isPdfPreviewOpen.value = false;

  if (tab === 'history') {
    store.fetchTaskLogs();
  }
};

const attachmentUrl = computed(() => {
  if (!task.value?.attachment_path) return null;
  return `/tasks/${task.value.id}/attachment`;
});
const hasOfflineAttachment = computed(() => task.value?.is_offline_draft && task.value?.has_offline_attachment && task.value?.file_name);

const fileExtension = computed(() => {
  const name = task.value?.file_name || task.value?.attachment_path || '';
  return name.split('.').pop()?.toLowerCase() || '';
});

const isImageAttachment = computed(() => ['jpg', 'jpeg', 'png', 'webp'].includes(fileExtension.value));
const isPdfAttachment = computed(() => fileExtension.value === 'pdf');

const toDateTimeLocal = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const pad = (num) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const datePart = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
  const timePart = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);

  return `${datePart}, ${timePart}`;
};

const formatDuration = (seconds = 0) => {
  const total = Number(seconds) || 0;
  const h = Math.floor(total / 3600).toString().padStart(2, '0');
  const m = Math.floor((total % 3600) / 60).toString().padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return total >= 3600 ? `${h}:${m}:${s}` : `${m}:${s}`;
};

const resetEditForm = () => {
  if (!task.value) return;

  editForm.title = task.value.title || '';
  editForm.category = task.value.category || 'Kerja';
  editForm.priority = task.value.priority || 'medium';
  editForm.column_status = task.value.column_status || 'pending';
  editForm.due_date = toDateTimeLocal(task.value.due_date);
};

const saveTask = () => {
  if (!task.value || !editForm.title.trim()) return;

  const { tags } = store.computeAutoTags(editForm.title.trim());

  store.updateTask(task.value.id, {
    title: editForm.title.trim(),
    category: editForm.category,
    priority: editForm.priority,
    column_status: editForm.column_status,
    tags: tags.length ? tags : (task.value.tags || []),
    time_spent: task.value.time_spent || 0,
    due_date: editForm.due_date || null,
  });
};

watch(task, () => {
  activeTab.value = 'detail';
  isPdfPreviewOpen.value = false;
  resetEditForm();
}, { immediate: true });
</script>

<template>
  <div
    v-if="store.detailModalOpen"
    class="fixed inset-0 z-[110] flex items-center justify-center bg-ink/30 p-4 transition-opacity md:backdrop-blur-sm"
    @click="store.closeDetailModal()"
  >
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-[88vh] overflow-hidden" @click.stop>
      <div class="p-4 border-b border-sand-200 flex items-center justify-between bg-sand-50">
        <div class="min-w-0 pr-4">
          <h3 class="text-sm font-bold text-ink truncate">Detail Tugas</h3>
          <p class="text-[11px] text-ink-muted mt-0.5">Tugas ID: #{{ task?.id }}</p>
        </div>
        <button @click="store.closeDetailModal()" class="text-sand-400 hover:text-rose p-1 transition-colors" title="Tutup">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="border-b border-sand-200 bg-white px-4 py-3">
        <div class="grid grid-cols-3 gap-2 rounded-xl bg-sand-100 p-1">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            class="rounded-lg px-3 py-2 text-sm font-bold transition-colors"
            :class="activeTab === tab.id ? 'bg-white text-ink shadow-sm' : 'text-ink-muted hover:text-ink'"
            @click="setActiveTab(tab.id)"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto">
        <section v-if="activeTab === 'detail'" class="p-5">
          <div class="mb-5">
            <div class="flex flex-wrap items-center gap-2 mb-3">
              <span class="text-xs px-2.5 py-1 rounded-full" :class="store.catColors[task?.category] || 'bg-sand-100 text-ink-muted'">
                {{ task?.category || '-' }}
              </span>
              <span class="text-xs px-2.5 py-1 rounded-full" :class="statusClasses[task?.column_status] || 'bg-sand-100 text-ink-muted'">
                {{ statusLabels[task?.column_status] || task?.column_status || '-' }}
              </span>
              <span class="flex items-center gap-1 text-xs text-ink-muted px-2.5 py-1 rounded-full bg-sand-50">
                <span class="w-1.5 h-1.5 rounded-full inline-block" :class="store.priorityDot[task?.priority]"></span>
                {{ store.priorityLabel[task?.priority] || '-' }}
              </span>
            </div>

            <h4 class="text-xl font-bold text-ink leading-snug">{{ task?.title }}</h4>
            <div class="flex flex-wrap gap-1.5 mt-3">
              <span
                v-for="tag in task?.tags || []"
                :key="tag"
                class="text-xs px-2 py-0.5 rounded-full font-medium"
                :class="store.tagBadgeClass(tag)"
              >
                {{ tag }}
              </span>
            </div>
          </div>

          <form class="mb-5 rounded-xl border border-sand-200 bg-sand-50 p-4" @submit.prevent="saveTask">
            <div class="mb-3 flex items-center justify-between gap-3">
              <h5 class="text-[11px] font-bold text-ink-muted uppercase tracking-wider">Edit Tugas</h5>
              <span v-if="!store.isOnline && store.activeWorkspace?.is_personal" class="rounded-full bg-amber/15 px-2 py-0.5 text-[10px] font-bold text-amber">
                Disimpan lokal
              </span>
            </div>

            <div class="space-y-3">
              <input
                v-model="editForm.title"
                type="text"
                class="w-full rounded-xl border border-sand-200 bg-white px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink/20"
                placeholder="Judul tugas"
              />

              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <select v-model="editForm.category" class="rounded-xl border border-sand-200 bg-white px-3 py-2.5 text-sm text-ink focus:outline-none">
                  <option value="Kerja">Kerja</option>
                  <option value="Pribadi">Pribadi</option>
                  <option value="Belajar">Belajar</option>
                  <option value="Kesehatan">Kesehatan</option>
                </select>

                <select v-model="editForm.priority" class="rounded-xl border border-sand-200 bg-white px-3 py-2.5 text-sm text-ink focus:outline-none">
                  <option value="low">Prioritas Rendah</option>
                  <option value="medium">Prioritas Sedang</option>
                  <option value="high">Prioritas Tinggi</option>
                </select>
              </div>

              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <select v-model="editForm.column_status" class="rounded-xl border border-sand-200 bg-white px-3 py-2.5 text-sm text-ink focus:outline-none">
                  <option value="pending">Pending</option>
                  <option value="today">Hari Ini</option>
                  <option value="on_progress">On Progress</option>
                  <option value="done">Selesai</option>
                </select>

                <input
                  v-model="editForm.due_date"
                  type="datetime-local"
                  class="rounded-xl border border-sand-200 bg-white px-3 py-2.5 text-sm text-ink focus:outline-none"
                />
              </div>

              <button type="submit" class="w-full rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-sand-50 hover:bg-ink-light">
                Simpan Perubahan
              </button>
            </div>
          </form>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div class="rounded-xl border border-sand-200 bg-sand-50 p-3">
              <p class="text-[11px] uppercase tracking-wider text-ink-muted font-bold mb-1">Dibuat Oleh</p>
              <p class="text-sm font-medium text-ink truncate">{{ task?.user?.name || 'Unknown' }}</p>
            </div>
            <div class="rounded-xl border border-sand-200 bg-sand-50 p-3">
              <p class="text-[11px] uppercase tracking-wider text-ink-muted font-bold mb-1">Durasi</p>
              <p class="text-sm font-mono font-medium text-ink">{{ formatDuration(task?.time_spent) }}</p>
            </div>
            <div class="rounded-xl border border-sand-200 bg-sand-50 p-3">
              <p class="text-[11px] uppercase tracking-wider text-ink-muted font-bold mb-1">Tenggat</p>
              <p class="text-sm font-medium text-ink">{{ formatDate(task?.due_date) }}</p>
            </div>
            <div class="rounded-xl border border-sand-200 bg-sand-50 p-3">
              <p class="text-[11px] uppercase tracking-wider text-ink-muted font-bold mb-1">Diperbarui</p>
              <p class="text-sm font-medium text-ink">{{ formatDate(task?.updated_at) }}</p>
            </div>
          </div>
        </section>

        <section v-else-if="activeTab === 'attachment'" class="p-5">
          <h5 class="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-3">Lampiran</h5>

          <div v-if="attachmentUrl" class="rounded-xl border border-sand-200 bg-sand-50 overflow-hidden">
            <div class="px-3 py-2 border-b border-sand-200 flex items-center justify-between gap-3">
              <div class="min-w-0 flex items-center gap-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-ink-muted shrink-0">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
                <span class="text-sm font-medium text-ink truncate">{{ task?.file_name }}</span>
              </div>
              <a :href="attachmentUrl" target="_blank" rel="noopener" class="text-xs font-medium text-sky hover:underline shrink-0">
                Buka
              </a>
            </div>

            <div class="bg-white min-h-[320px] flex items-center justify-center">
              <img
                v-if="isImageAttachment"
                :src="attachmentUrl"
                :alt="task?.file_name"
                class="max-h-[62vh] w-full object-contain bg-white"
                loading="lazy"
              />
              <div v-else-if="isPdfAttachment && !isPdfPreviewOpen" class="p-8 text-center">
                <p class="text-sm font-medium text-ink">PDF siap dipreview</p>
                <p class="text-xs text-ink-muted mt-1">{{ task?.file_name }}</p>
                <button class="mt-4 rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-sand-50" @click="isPdfPreviewOpen = true">
                  Preview PDF
                </button>
              </div>
              <iframe
                v-else-if="isPdfAttachment && isPdfPreviewOpen"
                :src="attachmentUrl"
                class="w-full h-[62vh] bg-white"
                :title="task?.file_name"
                loading="lazy"
              ></iframe>
              <div v-else class="p-8 text-center">
                <p class="text-sm font-medium text-ink">Preview tidak tersedia</p>
                <p class="text-xs text-ink-muted mt-1">{{ task?.file_name }}</p>
              </div>
            </div>
          </div>

          <div v-else-if="hasOfflineAttachment" class="rounded-xl border border-amber/30 bg-amber/10 p-4">
            <p class="text-sm font-medium text-ink">Lampiran tersimpan offline</p>
            <p class="mt-1 text-xs text-ink-muted">{{ task?.file_name }}</p>
            <p class="mt-2 text-xs text-amber">Preview tersedia setelah draft dikirim saat online.</p>
          </div>

          <div v-else class="rounded-xl border border-dashed border-sand-200 bg-sand-50 p-6 text-sm text-ink-muted italic">
            Tidak ada lampiran.
          </div>
        </section>

        <section v-else class="p-5 bg-white">
          <div class="mb-5">
            <h5 class="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-3">Ringkasan Tugas</h5>
            <div class="rounded-xl border border-sand-200 bg-sand-50 p-4 space-y-3">
              <div class="flex items-center justify-between gap-3 text-sm">
                <span class="text-ink-muted">Status</span>
                <span class="font-medium text-ink">{{ statusLabels[task?.column_status] || '-' }}</span>
              </div>
              <div class="flex items-center justify-between gap-3 text-sm">
                <span class="text-ink-muted">Prioritas</span>
                <span class="font-medium text-ink">{{ store.priorityLabel[task?.priority] || '-' }}</span>
              </div>
              <div class="flex items-center justify-between gap-3 text-sm">
                <span class="text-ink-muted">Dibuat</span>
                <span class="font-medium text-ink">{{ formatDate(task?.created_at) }}</span>
              </div>
            </div>
          </div>

          <h5 class="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-4">Audit Trail</h5>

          <div v-if="store.isLoadingTaskLogs" class="text-sm text-sand-400 italic py-4 border-l-2 border-sand-100 pl-4">
            Memuat riwayat...
          </div>

          <div v-else-if="store.taskLogs.length === 0" class="text-sm text-sand-400 italic py-4 border-l-2 border-sand-100 pl-4">
            Belum ada riwayat untuk tugas ini.
          </div>

          <div v-else class="relative border-l-2 border-sand-200 ml-1.5 space-y-5 pb-2">
            <div v-for="log in store.taskLogs" :key="log.id" class="relative pl-5">
              <div class="absolute w-2.5 h-2.5 bg-ink rounded-full -left-[5.5px] top-1 ring-4 ring-white"></div>
              <p class="text-sm text-ink font-medium leading-tight">{{ log.description || log.action }}</p>
              <time class="text-[11px] font-medium text-sand-400 mt-0.5 block">
                {{ formatDate(log.created_at) }}
              </time>
            </div>
          </div>

          <button
            v-if="store.taskLogsHasMore"
            type="button"
            class="mt-5 w-full rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm font-bold text-ink-muted hover:bg-sand-50 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="store.isLoadingTaskLogs"
            @click="store.fetchTaskLogs(undefined, { append: true })"
          >
            {{ store.isLoadingTaskLogs ? 'Memuat...' : 'Muat Riwayat Lagi' }}
          </button>
        </section>
      </div>
    </div>
  </div>
</template>
