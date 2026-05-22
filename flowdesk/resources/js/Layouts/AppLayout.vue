<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useTaskStore } from '../Stores/useTaskStore';
import MiniCalendar from '../Components/MiniCalendar.vue';
import TaskForm from '../Components/TaskForm.vue';

const store = useTaskStore();
const isOffcanvasOpen = ref(false);
const isModalOpen = ref(false);

const categories = computed(() => store.categories);
const priorities = [
  { val: 'high', label: 'Tinggi' },
  { val: 'medium', label: 'Sedang' },
  { val: 'low', label: 'Rendah' },
];

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
};

onMounted(() => {
  handleResize();
  window.addEventListener('resize', handleResize);
  document.addEventListener('keydown', closeOnEscape);
  document.addEventListener('keydown', handleGlobalKeydown); 
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  document.removeEventListener('keydown', closeOnEscape);
  document.removeEventListener('keydown', handleGlobalKeydown); 
});
</script>

<template>
  <div class="min-h-screen">
    <!-- Mobile Header -->
    <header class="md:hidden flex items-center justify-between px-4 py-3 bg-sand-50 border-b border-sand-200 sticky top-0 z-30">
      <button aria-label="Menu" class="p-2 rounded-lg hover:bg-sand-100 transition-colors" @click="openOffCanvas">
        <svg width="22" height="22" fill="none" stroke="#1a1714" stroke-width="2" stroke-linecap="round">
          <line x1="3" y1="6" x2="19" y2="6" />
          <line x1="3" y1="11" x2="19" y2="11" />
          <line x1="3" y1="16" x2="19" y2="16" />
        </svg>
      </button>
      <span class="font-display text-xl tracking-tight">Flowdesk</span>
      <div class="w-9"></div>
    </header>

    <!-- Off-canvas Backdrop -->
    <div
      id="offcanvas-backdrop"
      class="fixed inset-0 bg-ink/40 z-40 md:hidden"
      :class="isOffcanvasOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'"
      @click="closeOffCanvas"
    ></div>

    <!-- Off-canvas Sidebar -->
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
        <div class="mb-6">
          <div class="bg-white rounded-xl border border-sand-200 p-4 shadow-card">
            <MiniCalendar :tasks="store.tasks" />
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

    <!-- Desktop Header -->
    <div class="hidden md:flex items-center justify-between px-8 py-4 border-b border-sand-200 bg-sand-50 sticky top-0 z-20">
      <div class="flex items-center gap-3">
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
      <div class="hidden md:flex items-center gap-2 ml-auto relative">
          
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
              <li><span class="bg-sand-800 px-1 py-0.5 rounded mr-1 text-sand-100">Click</span> Pilih kartu (Massal)</li>
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

    <!-- Main Layout -->
    <div class="flex h-[calc(100vh-57px)] md:h-[calc(100vh-65px)] overflow-hidden">
      <aside id="sidebar" class="hidden md:flex flex-col w-64 lg:w-72 border-r border-sand-200 bg-sand-50 overflow-y-auto shrink-0 p-5 gap-6">
        <div class="mb-6">
          <div class="bg-white rounded-xl border border-sand-200 p-4 shadow-card">
            <MiniCalendar :tasks="store.tasks" />
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

    <!-- FAB (Mobile) -->
    <button
      id="fab"
      class="md:hidden fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-ink text-sand-50 shadow-fab flex items-center justify-center text-2xl leading-none select-none"
      aria-label="Tambah Tugas"
      @click="openModal"
    >
      <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
        <line x1="11" y1="4" x2="11" y2="18" />
        <line x1="4" y1="11" x2="18" y2="11" />
      </svg>
    </button>

    <!-- Modal (Mobile) -->
    <div
      id="modal-backdrop"
      class="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-ink/40 p-4"
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
</template>
