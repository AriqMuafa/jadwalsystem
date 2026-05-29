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
const categoryOptions = [
  { value: 'Kerja', label: 'Kerja' },
  { value: 'Pribadi', label: 'Pribadi' },
  { value: 'Belajar', label: 'Belajar' },
  { value: 'Kesehatan', label: 'Kesehatan' },
];
const priorityOptions = [
  { value: 'medium', label: 'Sedang' },
  { value: 'high', label: 'Tinggi' },
  { value: 'low', label: 'Rendah' },
];
const columnOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'today', label: 'Hari Ini' },
  { value: 'on_progress', label: 'On Progress' },
  { value: 'done', label: 'Selesai' },
];

const fileInputDesktop = ref(null);
const fileInputModal = ref(null);
const selectedFileName = ref('');

const handleFileChange = (e) => {
  const file = e.target.files[0];
  selectedFileName.value = file ? file.name : '';
};

const tagClass = (tag) => store.tagBadgeClass(tag);

const isTodayDate = (value) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const today = new Date();
  return date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate();
};

const resolvedColumn = () => {
  if (isTodayDate(dueDate.value)) return 'today';
  return props.variant === 'desktop' ? 'pending' : column.value;
};

const submit = () => {
  const trimmed = title.value.trim();
  if (!trimmed) return;

  const { tags } = store.computeAutoTags(trimmed);
  const activeFileInput = props.variant === 'desktop' ? fileInputDesktop.value : fileInputModal.value;

  // Kirim data dan sediakan callback onSuccess
  store.createTask({
    title: trimmed,
    category: category.value,
    priority: priority.value,
    column_status: resolvedColumn(),
    tags,
    time_spent: 0,
    due_date: dueDate.value || null,
    attachment: activeFileInput?.files[0] || null, 
    file_name: activeFileInput?.files[0] ? activeFileInput.files[0].name : null,
  }, () => {
    // Callback ini HANYA JALAN jika tugas benar-benar sukses masuk Database
    title.value = '';
    dueDate.value = '';
    autoTags.value = [];
    selectedFileName.value = '';
    if (fileInputDesktop.value) fileInputDesktop.value.value = '';
    if (fileInputModal.value) fileInputModal.value.value = '';
    if (props.variant === 'modal') emit('submitted');
  });
};

watch(title, (newTitle) => {
  const trimmed = newTitle.trim();
  if (!trimmed) {
    autoTags.value = [];
    predictedETA.value = null;
    return;
  }

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

  const parsedDate = store.parseNaturalDate(trimmed);
  if (parsedDate) {
    dueDate.value = parsedDate;
    if (isTodayDate(parsedDate)) column.value = 'today';
  }

  const etaSeconds = store.predictETA(trimmed, tags);
  if (etaSeconds) {
    predictedETA.value = etaSeconds < 60 ? `${etaSeconds} detik` : `${Math.round(etaSeconds / 60)} menit`;
  } else {
    predictedETA.value = null;
  }
});

const desktopSelectBg = "background-image:url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%228%22 fill=%22none%22%3E%3Cpath d=%22M1 1l5 5 5-5%22 stroke=%22%236b6460%22 stroke-width=%221.5%22 stroke-linecap=%22round%22/%3E%3C/svg%3E');background-repeat:no-repeat;background-position:right 12px center;";
const selectControlClass = 'w-full rounded-xl border border-sand-200 bg-white px-3 py-2.5 pr-9 text-sm font-medium text-ink shadow-sm outline-none transition focus:border-ink/30 focus:ring-2 focus:ring-ink/10';
</script>

<template>
  <form v-if="variant === 'desktop'" id="desktop-form" class="flex gap-2 items-start flex-1 max-w-4xl mx-8" @submit.prevent="submit">
    <div class="flex-1 relative">
      <input
        v-model="title"
        type="text"
        placeholder="Tambah tugas baru... (coba ketik 'urgent')"
        class="w-full px-4 py-2.5 rounded-xl border border-sand-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ink/20 focus:border-ink/40 transition"
      />
      <div class="flex flex-wrap gap-1.5 mt-1.5 min-h-0">
        <span v-for="tag in autoTags" :key="tag" class="text-xs px-2.5 py-0.5 rounded-full font-medium" :class="tagClass(tag)">{{ tag }}</span>
      </div>
      <div v-if="predictedETA" class="text-[11px] text-amber mt-1.5 flex items-center gap-1 animate-pulse absolute top-full left-0 w-full pt-1">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        Saran durasi: <span class="font-bold">{{ predictedETA }}</span>
      </div>
    </div>
    
    <select v-model="category" class="min-w-28 appearance-none" :class="selectControlClass" :style="desktopSelectBg" aria-label="Kategori">
      <option v-for="option in categoryOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
    </select>
    
    <input type="datetime-local" v-model="dueDate" title="Tenggat Waktu" class="px-3 py-2.5 rounded-xl border border-sand-200 bg-white text-sm focus:outline-none text-ink-muted" />
    
    <div class="relative flex items-center gap-2">
      <div v-if="selectedFileName" class="absolute -bottom-6 right-0 text-[10px] font-medium text-ink-muted flex items-center gap-1 bg-sand-100 px-2 py-0.5 rounded-md truncate max-w-[150px] z-10 shadow-sm border border-sand-200">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
        {{ selectedFileName }}
      </div>

      <input type="file" ref="fileInputDesktop" class="hidden" @change="handleFileChange" accept=".jpg,.jpeg,.png,.pdf,.webp" />
      <button type="button" @click="$refs.fileInputDesktop.click()" class="p-2.5 rounded-xl border border-sand-200 bg-white text-ink-muted hover:text-ink hover:bg-sand-100 transition-colors" title="Lampirkan File">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
      </button>

      <button type="submit" class="px-5 py-2.5 rounded-xl bg-ink text-sand-50 text-sm font-medium hover:bg-ink-light transition-colors whitespace-nowrap">
        + Tambah
      </button>
    </div>
  </form>

  <form v-else id="modal-form" class="flex flex-col gap-3 w-full" @submit.prevent="submit">
    <div class="relative">
      <input
        v-model="title"
        type="text"
        placeholder="Nama tugas... (coba 'urgent', 'bug', 'meeting')"
        class="w-full px-4 py-3 rounded-xl border border-sand-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ink/20 focus:border-ink/40 placeholder-sand-400 transition"
      />
      <div class="flex flex-wrap gap-1.5 mt-2 min-h-0">
        <span v-for="tag in autoTags" :key="tag" class="text-xs px-2.5 py-0.5 rounded-full font-medium" :class="tagClass(tag)">{{ tag }}</span>
      </div>
      <div v-if="predictedETA" class="text-[11px] text-amber mt-1 flex items-center gap-1 animate-pulse">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        Saran durasi pengerjaan: <span class="font-bold">{{ predictedETA }}</span>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <label class="group block rounded-2xl border border-sand-200 bg-sand-50 p-2.5 transition focus-within:border-ink/30 focus-within:bg-white focus-within:ring-2 focus-within:ring-ink/10">
        <span class="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-ink-muted">
          <span class="h-1.5 w-1.5 rounded-full bg-sky"></span>
          Kategori
        </span>
        <select v-model="category" class="appearance-none" :class="selectControlClass" :style="desktopSelectBg">
          <option v-for="option in categoryOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </label>
      <label class="group block rounded-2xl border border-sand-200 bg-sand-50 p-2.5 transition focus-within:border-ink/30 focus-within:bg-white focus-within:ring-2 focus-within:ring-ink/10">
        <span class="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-ink-muted">
          <span class="h-1.5 w-1.5 rounded-full bg-amber"></span>
          Prioritas
        </span>
        <select v-model="priority" class="appearance-none" :class="selectControlClass" :style="desktopSelectBg">
          <option v-for="option in priorityOptions" :key="option.value" :value="option.value">Prioritas {{ option.label }}</option>
        </select>
      </label>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <label class="group block rounded-2xl border border-sand-200 bg-sand-50 p-2.5 transition focus-within:border-ink/30 focus-within:bg-white focus-within:ring-2 focus-within:ring-ink/10">
        <span class="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-ink-muted">
          <span class="h-1.5 w-1.5 rounded-full bg-sage"></span>
          Tenggat
        </span>
        <input type="datetime-local" v-model="dueDate" title="Tenggat Waktu" :class="selectControlClass" />
      </label>
      <label class="group block rounded-2xl border border-sand-200 bg-sand-50 p-2.5 transition focus-within:border-ink/30 focus-within:bg-white focus-within:ring-2 focus-within:ring-ink/10">
        <span class="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-ink-muted">
          <span class="h-1.5 w-1.5 rounded-full bg-ink-muted"></span>
          Kolom
        </span>
        <select v-model="column" class="appearance-none" :class="selectControlClass" :style="desktopSelectBg">
          <option v-for="option in columnOptions" :key="option.value" :value="option.value">→ {{ option.label }}</option>
        </select>
      </label>
    </div>

    <div class="flex items-center justify-between gap-3 mt-1 pt-3 border-t border-sand-100">
      <div class="flex items-center gap-2 overflow-hidden flex-1">
        <input type="file" ref="fileInputModal" class="hidden" @change="handleFileChange" accept=".jpg,.jpeg,.png,.pdf,.webp" />
        <button type="button" @click="$refs.fileInputModal.click()" class="p-2.5 shrink-0 rounded-xl border border-sand-200 bg-white text-ink-muted hover:text-ink hover:bg-sand-100 transition-colors" title="Lampirkan File">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
        </button>
        <span v-if="selectedFileName" class="text-xs font-medium text-ink-muted truncate px-2 py-1 bg-sand-100 rounded-md border border-sand-200" title="File terpilih">
          {{ selectedFileName }}
        </span>
        <span v-else class="text-xs text-sand-400 italic">Tidak ada file dipilih (optional)</span>
      </div>
      
      <button type="submit" class="shrink-0 px-6 py-2.5 rounded-xl bg-ink text-sand-50 text-sm font-medium hover:bg-ink-light transition-colors whitespace-nowrap">
        + Tambah Tugas
      </button>
    </div>
  </form>
</template>
