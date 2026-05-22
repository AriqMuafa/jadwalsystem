<script setup>
import { computed, ref, watch } from 'vue';
import { useTaskStore } from '../Stores/useTaskStore';

const props = defineProps({
  variant: { type: String, default: 'desktop' },
  defaultColumn: { type: String, default: 'pending' },
});

const emit = defineEmits(['submitted']);

const store = useTaskStore();
const title = ref('');
const category = ref('Kerja');
const priority = ref('medium');
const column = ref(props.defaultColumn);
const dueDate = ref('');

const predictedETA = ref(null);
const autoTags = ref([]);

// Fungsi yang berjalan setiap kali user mengetik judul tugas
watch(title, (newTitle) => {
  const trimmed = newTitle.trim();
  if (!trimmed) {
    autoTags.value = [];
    predictedETA.value = null;
    return;
  }

  // 1. Logika Auto Tagging yang sudah ada sebelumnya
  const tags = [];
  const lower = trimmed.toLowerCase();
  if (lower.includes('urgent') || lower.includes('segera') || lower.includes('darurat')) {
    priority.value = 'high';
    tags.push('High Priority');
  }
  if (lower.includes('bug') || lower.includes('error') || lower.includes('fix')) {
    priority.value = 'high';
    tags.push('Bug');
  }
  if (lower.includes('meeting') || lower.includes('rapat')) {
    tags.push('Meeting');
  }
  if (lower.includes('belajar') || lower.includes('course')) {
    tags.push('Belajar');
  }
  autoTags.value = tags;

  // 2. INJEKSI BARU: Smart Date Parsing (NLP)
  const parsedDate = store.parseNaturalDate(trimmed);
  if (parsedDate) {
    dueDate.value = parsedDate;
  }

  // 3. INJEKSI BARU: Estimasi ETA Berdasarkan Histori
  const etaSeconds = store.predictETA(trimmed, tags);
  if (etaSeconds) {
    if (etaSeconds < 60) {
      predictedETA.value = `${etaSeconds} detik`;
    } else {
      predictedETA.value = `${Math.round(etaSeconds / 60)} menit`;
    }
  } else {
    predictedETA.value = null;
  }
});

const tagClass = (tag) => store.tagBadgeClass(tag);

const submit = () => {
  const trimmed = title.value.trim();
  if (!trimmed) return;

  const { tags } = store.computeAutoTags(trimmed);

  store.createTask({
    title: trimmed,
    category: category.value,
    priority: priority.value,
    column_status: props.variant === 'desktop' ? 'pending' : column.value,
    tags,
    time_spent: 0,
    due_date: dueDate.value || null,
  });

  title.value = '';
  dueDate.value = '';
  autoTags.value = [];
  if (props.variant === 'modal') emit('submitted');
};

const desktopSelectBg = "background-image:url('data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" width=\"12\" height=\"8\" fill=\"none\"%3E%3Cpath d=\"M1 1l5 5 5-5\" stroke=\"%236b6460%22 stroke-width=\"1.5\" stroke-linecap=\"round\"/%3E%3C/svg%3E');background-repeat:no-repeat;background-position:right 10px center;";
</script>

<template>
  <form v-if="variant === 'desktop'" id="desktop-form" class="flex gap-2 items-start flex-1 max-w-2xl mx-8" @submit.prevent="submit">
    <div class="flex-1 relative">
      <input
        id="desktop-task-input"
        v-model="title"
        type="text"
        placeholder="Tambah tugas baru... (coba ketik 'urgent' atau 'bug')"
        class="w-full px-4 py-2.5 rounded-xl border border-sand-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ink/20 focus:border-ink/40 placeholder-sand-400 transition"
      />
      <div id="desktop-tags" class="flex flex-wrap gap-1.5 mt-1.5 min-h-0">
        <span v-for="tag in autoTags" :key="tag" class="tag-badge text-xs px-2.5 py-0.5 rounded-full font-medium" :class="tagClass(tag)">
          {{ tag }}
        </span>
      </div>
      <div v-if="predictedETA" class="text-[11px] text-amber mt-1.5 flex items-center gap-1 animate-pulse absolute top-full left-0 w-full pt-1">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
        </svg>
        Saran durasi: <span class="font-bold">{{ predictedETA }}</span> (histori)
      </div>
    </div>
    <select
      id="desktop-category"
      v-model="category"
      class="px-3 py-2.5 rounded-xl border border-sand-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ink/20 text-ink appearance-none pr-7"
      :style="desktopSelectBg"
    >
      <option value="Kerja">Kerja</option>
      <option value="Pribadi">Pribadi</option>
      <option value="Belajar">Belajar</option>
      <option value="Kesehatan">Kesehatan</option>
    </select>
    <select
      id="desktop-priority"
      v-model="priority"
      class="px-3 py-2.5 rounded-xl border border-sand-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ink/20 text-ink appearance-none pr-7"
      :style="desktopSelectBg"
    >
      <option value="medium">Sedang</option>
      <option value="high">Tinggi</option>
      <option value="low">Rendah</option>
    </select>
    <input
      type="datetime-local"
      v-model="dueDate"
      title="Tenggat Waktu"
      class="px-3 py-2.5 rounded-xl border border-sand-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ink/20 text-ink-muted"
    />
    <button type="submit" class="px-5 py-2.5 rounded-xl bg-ink text-sand-50 text-sm font-medium hover:bg-ink-light transition-colors whitespace-nowrap">
      + Tambah
    </button>
  </form>

  <div v-else class="flex flex-col gap-3">
    <input
      id="modal-task-input"
      v-model="title"
      type="text"
      placeholder="Nama tugas... (coba 'urgent', 'bug', 'meeting')"
      class="w-full px-4 py-3 rounded-xl border border-sand-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ink/20 focus:border-ink/40 placeholder-sand-400"
    />
    <div id="modal-tags" class="flex flex-wrap gap-1.5 min-h-0">
      <span v-for="tag in autoTags" :key="tag" class="tag-badge text-xs px-2.5 py-0.5 rounded-full font-medium" :class="tagClass(tag)">
        {{ tag }}
      </span>
    </div>
    <div v-if="predictedETA" class="text-[11px] text-amber flex items-center gap-1 animate-pulse">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
      </svg>
      Saran durasi pengerjaan: <span class="font-bold">{{ predictedETA }}</span> (berdasarkan histori serupa)
    </div>
    <div class="grid grid-cols-2 gap-2">
      <select id="modal-category" v-model="category" class="px-3 py-2.5 rounded-xl border border-sand-200 bg-white text-sm focus:outline-none text-ink">
        <option value="Kerja">Kerja</option>
        <option value="Pribadi">Pribadi</option>
        <option value="Belajar">Belajar</option>
        <option value="Kesehatan">Kesehatan</option>
      </select>
      <select id="modal-priority" v-model="priority" class="px-3 py-2.5 rounded-xl border border-sand-200 bg-white text-sm focus:outline-none text-ink">
        <option value="medium">Prioritas Sedang</option>
        <option value="high">Prioritas Tinggi</option>
        <option value="low">Prioritas Rendah</option>
      </select>
    </div>
    <input 
        type="datetime-local" 
        v-model="dueDate" 
        class="px-3 py-2.5 rounded-xl border border-sand-200 bg-white text-sm focus:outline-none text-ink w-full"
      />
    <select id="modal-column" v-model="column" class="px-3 py-2.5 rounded-xl border border-sand-200 bg-white text-sm focus:outline-none text-ink">
      <option value="pending">→ Pending</option>
      <option value="today">→ Hari Ini</option>
      <option value="on_progress">→ On Progress</option>
      <option value="done">→ Selesai</option>
    </select>
    <button type="button" class="w-full py-3 rounded-xl bg-ink text-sand-50 text-sm font-medium hover:bg-ink-light transition-colors mt-1" @click="submit">
      Tambah Tugas
    </button>
  </div>
</template>
