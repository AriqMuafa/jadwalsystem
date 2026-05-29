<script setup>
import { ref, computed, onUnmounted } from 'vue';
import { useTaskStore } from '../Stores/useTaskStore';
import { usePage } from '@inertiajs/vue3'; // Tambahkan baris ini

const props = defineProps({
  task: { type: Object, required: true },
});

const store = useTaskStore();
const page = usePage();
const currentUser = computed(() => page.props.currentUser); // Mengambil dari Inertia global props

const quickMoveLabels = { pending: 'Pending', today: 'Hari Ini', on_progress: 'On Progress', done: 'Selesai' };
const quickMoveTargets = (task) => ['pending', 'today', 'on_progress', 'done'].filter((c) => c !== task.column_status);
const didDrag = ref(false);
const suppressNextClick = ref(false);
const attachmentPreviewOpen = ref(false);
let longPressTimer = null;

// --- Time Tracking Logic ---
const isPlaying = ref(false);
const localTime = ref(props.task.time_spent || 0);
let timerInterval = null;

const toggleTimer = () => {
  if (isPlaying.value) {
    clearInterval(timerInterval);
    isPlaying.value = false;
    store.updateTimeSpent(props.task.id, localTime.value);
  } else {
    isPlaying.value = true;
    timerInterval = setInterval(() => {
      localTime.value++;
    }, 1000);
  }
};

onUnmounted(() => {
  clearLongPressTimer();

  if (timerInterval) {
    clearInterval(timerInterval);
    store.updateTimeSpent(props.task.id, localTime.value);
  }
});

const formattedTime = computed(() => {
  const h = Math.floor(localTime.value / 3600).toString().padStart(2, '0');
  const m = Math.floor((localTime.value % 3600) / 60).toString().padStart(2, '0');
  const s = (localTime.value % 60).toString().padStart(2, '0');
  return localTime.value >= 3600 ? `${h}:${m}:${s}` : `${m}:${s}`;
});

const attachmentUrl = computed(() => {
  if (!props.task.attachment_path || String(props.task.id).startsWith('draft-') || String(props.task.id).startsWith('tmp-')) {
    return null;
  }

  return `/tasks/${props.task.id}/attachment`;
});

const fileExtension = computed(() => {
  const name = props.task.file_name || props.task.attachment_path || '';
  return name.split('.').pop()?.toLowerCase() || '';
});

const isImageAttachment = computed(() => ['jpg', 'jpeg', 'png', 'webp'].includes(fileExtension.value));
const isPdfAttachment = computed(() => fileExtension.value === 'pdf');

const openAttachmentPreview = () => {
  if (!attachmentUrl.value) return;
  attachmentPreviewOpen.value = true;
};

const closeAttachmentPreview = () => {
  attachmentPreviewOpen.value = false;
};

// --- Due Date Logic & Formatter ---
const isSameLocalDay = (a, b) => (
  a.getFullYear() === b.getFullYear()
  && a.getMonth() === b.getMonth()
  && a.getDate() === b.getDate()
);

const dateStatus = computed(() => {
  if (!props.task.due_date) return null;
  const due = new Date(props.task.due_date);
  const now = new Date();
  const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (diffHours < 0) return 'overdue';
  if (isSameLocalDay(due, now)) return 'today';
  if (diffHours <= 24) return 'warning';
  return 'safe';
});

const formatDueDate = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  const datePart = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
  const timePart = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);

  return `${datePart} ${timePart}`;
};

const startOfLocalDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const formatDueRelative = (dateString) => {
  if (!dateString) return null;

  const due = new Date(dateString);
  const now = new Date();
  const dayMs = 1000 * 60 * 60 * 24;
  const diffDays = Math.round((startOfLocalDay(due).getTime() - startOfLocalDay(now).getTime()) / dayMs);

  if (diffDays === 0) {
    return due.getTime() < now.getTime() ? 'Lewat hari ini' : 'Hari ini';
  }

  if (diffDays > 0) {
    return `-${diffDays} hari`;
  }

  return `+${Math.abs(diffDays)} hari lewat`;
};

// Tambahkan di bawah deklarasi variabel time tracking/due date
const creatorName = computed(() => {
  // Jika tugas memiliki objek user dari database, pakai itu.
  if (props.task.user && props.task.user.name) {
    return props.task.user.name;
  }
  // Jika tidak (berarti ini tugas baru dari Optimistic UI), gunakan nama user saat ini
  return currentUser.value ? currentUser.value.name : 'Unknown';
});

function clearLongPressTimer() {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
}

const startLongPress = () => {
  if (!store.isMobile) return;

  clearLongPressTimer();
  longPressTimer = setTimeout(() => {
    store.toggleSelection(props.task.id);
    suppressNextClick.value = true;
  }, 500);
};

const cancelLongPress = () => {
  clearLongPressTimer();
};

const handleCardClick = (event) => {
  if (didDrag.value) {
    didDrag.value = false;
    return;
  }

  if (suppressNextClick.value) {
    suppressNextClick.value = false;
    return;
  }

  if (event.shiftKey) {
    store.toggleSelection(props.task.id);
    return;
  }

  store.openDetailModal(props.task);
};

const handleDragEnd = () => {
  store.onDragEnd();
  window.setTimeout(() => {
    didDrag.value = false;
  }, 50);
};

</script>

<template>
  <div
    class="task-card bg-white rounded-xl shadow-card p-3.5 select-none transition-all cursor-pointer"
    :class="[
      store.priorityClass[task.priority], 
      store.selectedTasks.includes(task.id) ? 'ring-2 ring-ink ring-offset-2 scale-[0.98]' : ''
    ]"
    draggable="true"
    :data-id="task.id"
    @dragstart="didDrag = true; store.onDragStart(task.id)"
    @dragend="handleDragEnd"
    @click="handleCardClick"
    @pointerdown="startLongPress"
    @pointerup="cancelLongPress"
    @pointerleave="cancelLongPress"
    @pointercancel="cancelLongPress"
    @contextmenu.prevent
  >
    <!-- BAGIAN BARU: Pembuat Tugas -->
    <div class="flex items-center gap-1.5 mb-2">
      <div class="w-5 h-5 rounded-full bg-sand-200 text-ink flex items-center justify-center text-[10px] font-bold">
        {{ creatorName.charAt(0).toUpperCase() }}
      </div>
      <span class="text-[11px] font-medium text-ink-muted flex-1 truncate">
        {{ task.is_offline_draft ? 'Draft Offline' : creatorName }}
      </span>

      <button
        class="shrink-0 w-5 h-5 flex items-center justify-center text-sand-300 hover:text-rose transition-colors"
        title="Hapus"
        @pointerdown.stop
        @click.stop="store.deleteTask(task.id)"
      >
        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="2" y1="2" x2="11" y2="11" />
          <line x1="11" y1="2" x2="2" y2="11" />
        </svg>
      </button>
    </div>

    <div class="mb-2">
      <p class="text-sm font-medium leading-snug" :class="task.column_status === 'done' ? 'line-through text-ink-muted' : ''">
        {{ task.title }}
      </p>
    </div>

    <div class="flex flex-wrap items-center gap-1.5 mb-2.5">
      <span class="text-xs px-2 py-0.5 rounded-full" :class="store.catColors[task.category] || 'bg-sand-100 text-ink-muted'">
        {{ task.category }}
      </span>
      <span class="flex items-center gap-1 text-xs text-ink-muted">
        <span class="w-1.5 h-1.5 rounded-full inline-block" :class="store.priorityDot[task.priority]"></span>
        {{ store.priorityLabel[task.priority] }}
      </span>
      <span
        v-for="tag in task.tags"
        :key="tag"
        class="text-xs px-2 py-0.5 rounded-full font-medium"
        :class="store.tagBadgeClass(tag)"
      >
        {{ tag }}
      </span>
      <span v-if="task.is_offline_draft" class="text-xs px-2 py-0.5 rounded-full font-medium bg-amber/15 text-amber">
        Belum dikirim
      </span>
      <span v-else-if="store.isTaskQueueFailed(task.id)" class="text-xs px-2 py-0.5 rounded-full font-medium bg-rose/10 text-rose">
        Konflik sync
      </span>
      <span v-else-if="store.isTaskQueued(task.id)" class="text-xs px-2 py-0.5 rounded-full font-medium bg-amber/15 text-amber">
        Menunggu sync
      </span>
    </div>

    <div class="flex items-center justify-between mt-2 pt-2 border-t border-sand-100">
      <div class="flex min-w-0 items-center gap-1.5">
        <button 
          v-if="task.column_status !== 'done'"
          @click.stop="toggleTimer" 
          @pointerdown.stop
          class="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
          :class="isPlaying ? 'bg-rose/10 text-rose' : 'bg-sand-100 text-ink hover:bg-sand-200'"
          :title="isPlaying ? 'Jeda' : 'Mulai'"
        >
          <svg v-if="isPlaying" width="10" height="10" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          <svg v-else width="10" height="10" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </button>
        <span class="text-xs font-mono font-medium ml-1" :class="isPlaying ? 'text-rose' : 'text-ink-muted'">
          {{ formattedTime }}
        </span>
        <span
          v-if="task.due_date"
          class="truncate rounded px-2 py-0.5 text-[10px] font-bold"
          :class="{
            'bg-rose/10 text-rose': dateStatus === 'overdue',
            'bg-sage/15 text-sage': dateStatus === 'today',
            'bg-amber/15 text-amber': dateStatus === 'warning',
            'bg-sand-100 text-ink-muted': dateStatus === 'safe'
          }"
          :title="formatDueDate(task.due_date)"
        >
          {{ formatDueRelative(task.due_date) }}
        </span>
      </div>
    </div>

    <div class="mt-2 pt-2 border-t border-sand-100 flex items-center gap-1.5 text-[11px] font-medium text-ink-muted">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
      </svg>
      <button
        v-if="attachmentUrl"
        type="button"
        class="truncate max-w-[150px] text-left text-sky hover:underline"
        title="Buka lampiran"
        @pointerdown.stop
        @click.stop="openAttachmentPreview"
      >
        {{ task.file_name }}
      </button>
      <span v-else-if="task.file_name" class="truncate max-w-[150px] text-ink" title="Lampiran belum tersedia untuk dibuka">
        {{ task.file_name }}
      </span>
      <span v-else class="italic opacity-70">Tidak ada lampiran</span>
    </div>

    <div v-if="task.is_offline_draft && store.isOnline" class="mt-2 pt-2 border-t border-sand-100">
      <button
        class="w-full rounded-lg bg-ink px-3 py-2 text-xs font-bold text-sand-50 hover:bg-ink-light"
        @pointerdown.stop
        @click.stop="store.submitOfflineDraft(task.id)"
      >
        Kirim Draft
      </button>
    </div>

    <div 
      v-if="task.due_date" 
      class="mt-2 pt-2 border-t border-sand-100 flex items-center gap-1.5 text-[11px] font-medium"
      :class="dateStatus === 'overdue' ? 'text-rose' : 'text-ink-muted'"
      :title="formatDueDate(task.due_date)"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
      <span class="truncate">{{ formatDueDate(task.due_date) }}</span>
    </div>

    <div class="flex flex-wrap gap-1 md:hidden mt-2">
      <button
        v-for="target in quickMoveTargets(task)"
        :key="target"
        class="qm-btn"
        @pointerdown.stop
        @click.stop="store.moveTask(task.id, target)"
      >
        → {{ quickMoveLabels[target] }}
      </button>
    </div>

    <Teleport to="body">
      <div
        v-if="attachmentPreviewOpen"
        class="fixed inset-0 z-[140] flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm md:items-center md:p-4"
        @click="closeAttachmentPreview"
      >
        <div class="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl md:max-w-3xl md:rounded-2xl" @click.stop>
          <div class="flex items-center justify-between gap-3 border-b border-sand-200 bg-sand-50 px-4 py-3">
            <div class="min-w-0">
              <p class="text-xs font-black uppercase tracking-widest text-ink-muted">Lampiran</p>
              <p class="truncate text-sm font-bold text-ink">{{ task.file_name }}</p>
            </div>
            <button class="rounded-lg p-2 text-ink-muted hover:bg-sand-100 hover:text-rose" title="Tutup" @click="closeAttachmentPreview">
              <svg width="19" height="19" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                <line x1="4" y1="4" x2="15" y2="15" />
                <line x1="15" y1="4" x2="4" y2="15" />
              </svg>
            </button>
          </div>

          <div class="flex min-h-[58vh] flex-1 items-center justify-center overflow-auto bg-sand-50">
            <img
              v-if="isImageAttachment"
              :src="attachmentUrl"
              :alt="task.file_name"
              class="max-h-[78vh] w-full object-contain bg-white"
              loading="lazy"
            />
            <iframe
              v-else-if="isPdfAttachment"
              :src="attachmentUrl"
              class="h-[78vh] w-full bg-white"
              :title="task.file_name"
              loading="lazy"
            ></iframe>
            <div v-else class="p-8 text-center">
              <p class="text-sm font-bold text-ink">Preview tidak tersedia</p>
              <p class="mt-1 text-xs text-ink-muted">{{ task.file_name }}</p>
              <a :href="attachmentUrl" target="_blank" rel="noopener" class="mt-4 inline-flex rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-sand-50">
                Buka File
              </a>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
