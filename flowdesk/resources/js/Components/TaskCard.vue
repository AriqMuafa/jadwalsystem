<script setup>
import { ref, computed, onUnmounted } from 'vue';
import { useTaskStore } from '../Stores/useTaskStore';

const props = defineProps({
  task: { type: Object, required: true },
});

const store = useTaskStore();

const quickMoveLabels = { pending: 'Pending', today: 'Hari Ini', on_progress: 'On Progress', done: 'Selesai' };
const quickMoveTargets = (task) => ['pending', 'today', 'on_progress', 'done'].filter((c) => c !== task.column_status);

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

// --- Due Date Logic ---
const dateStatus = computed(() => {
  if (!props.task.due_date) return null;
  const due = new Date(props.task.due_date).getTime();
  const now = new Date().getTime();
  const diffHours = (due - now) / (1000 * 60 * 60);

  if (diffHours < 0) return 'overdue'; // Terlambat
  if (diffHours <= 24) return 'warning'; // Kurang dari 24 Jam
  return 'safe';
});
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
    @dragstart="store.onDragStart(task.id)"
    @dragend="store.onDragEnd"
    @click="store.toggleSelection(task.id)"
  >
    <div class="flex items-start justify-between gap-2 mb-2">
      <p class="text-sm font-medium leading-snug flex-1" :class="task.column_status === 'done' ? 'line-through text-ink-muted' : ''">
        {{ task.title }}
      </p>
      <button
        class="shrink-0 w-5 h-5 flex items-center justify-center text-sand-300 hover:text-rose transition-colors mt-0.5"
        title="Hapus"
        @click.stop="store.deleteTask(task.id)"
      >
        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="2" y1="2" x2="11" y2="11" />
          <line x1="11" y1="2" x2="2" y2="11" />
        </svg>
      </button>
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
    </div>

    <div class="flex items-center justify-between mt-2 pt-2 border-t border-sand-100">
      <div class="flex items-center gap-2">
        <button 
          v-if="task.column_status !== 'done'"
          @click.stop="toggleTimer" 
          class="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
          :class="isPlaying ? 'bg-rose/10 text-rose' : 'bg-sand-100 text-ink hover:bg-sand-200'"
          :title="isPlaying ? 'Jeda' : 'Mulai'"
        >
          <svg v-if="isPlaying" width="10" height="10" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          <svg v-else width="10" height="10" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </button>
        <span class="text-xs font-mono font-medium" :class="isPlaying ? 'text-rose' : 'text-ink-muted'">
          {{ formattedTime }}
        </span>
      </div>

      <div v-if="task.due_date" class="text-[10px] font-medium px-2 py-0.5 rounded"
           :class="{
             'bg-rose/10 text-rose': dateStatus === 'overdue',
             'bg-amber/15 text-amber': dateStatus === 'warning',
             'bg-sand-100 text-ink-muted': dateStatus === 'safe'
           }">
        <span v-if="dateStatus === 'overdue'">Terlambat</span>
        <span v-else-if="dateStatus === 'warning'">H-1</span>
        <span v-else>Tenggat Diatur</span>
      </div>
    </div>
    <div class="flex flex-wrap gap-1 md:hidden">
      <button
        v-for="target in quickMoveTargets(task)"
        :key="target"
        class="qm-btn"
        @click.stop="store.moveTask(task.id, target)"
      >
        → {{ quickMoveLabels[target] }}
      </button>
    </div>
  </div>
</template>
