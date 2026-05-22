import { defineStore } from 'pinia';
import { router } from '@inertiajs/vue3';

const tagRules = [
  { keywords: ['urgent', 'segera', 'asap', 'darurat', 'critical', 'kritis'], badge: 'High Priority', priorityOverride: 'high' },
  { keywords: ['bug', 'error', 'fix', 'broken', 'crash', 'issue'], badge: 'Bug', priorityOverride: 'high' },
  { keywords: ['meeting', 'rapat', 'diskusi', 'standup', 'sinkronisasi'], badge: 'Meeting', priorityOverride: null },
  { keywords: ['belajar', 'study', 'kursus', 'course', 'latihan', 'practice'], badge: 'Belajar', priorityOverride: null },
  { keywords: ['deploy', 'release', 'launch', 'production', 'prod'], badge: 'Deploy', priorityOverride: 'high' },
  { keywords: ['design', 'ui', 'ux', 'figma', 'mockup', 'wireframe'], badge: 'Design', priorityOverride: null },
];

const tagColors = {
  'High Priority': 'bg-rose-light text-rose border border-rose/20',
  Bug: 'bg-rose-light text-rose border border-rose/20',
  Meeting: 'bg-sky-light text-sky border border-sky/20',
  Belajar: 'bg-amber-light text-amber border border-amber/20',
  Deploy: 'bg-sage-light text-sage border border-sage/20',
  Design: 'bg-sand-100 text-ink-muted border border-sand-200',
};

const priorityLabel = { high: 'Tinggi', medium: 'Sedang', low: 'Rendah' };
const priorityDot = { high: 'bg-rose', medium: 'bg-amber', low: 'bg-sage' };
const priorityClass = { high: 'priority-high', medium: 'priority-medium', low: 'priority-low' };
const catColors = {
  Kerja: 'bg-sky-light text-sky',
  Pribadi: 'bg-sand-200 text-ink-muted',
  Belajar: 'bg-amber-light text-amber',
  Kesehatan: 'bg-sage-light text-sage',
};

export const useTaskStore = defineStore('tasks', {
  state: () => ({
    tasks: [],
    draggedId: null,
    dragOverCol: null,
    activeCategories: [],
    activePriorities: [],
    activeTab: 'pending',
    isMobile: false,
    selectedTasks: [],
  }),
  getters: {
    categories: (state) => [...new Set(state.tasks.map((t) => t.category))],
    filteredTasks: (state) =>
      state.tasks.filter((t) => {
        const catOk = state.activeCategories.length === 0 || state.activeCategories.includes(t.category);
        const priOk = state.activePriorities.length === 0 || state.activePriorities.includes(t.priority);
        return catOk && priOk;
      }),
    tasksByColumn: (state) => (col) => state.tasks.filter((t) => t.column_status === col),
    filteredByColumn: (state) => (col) =>
      state.tasks.filter((t) => {
        const catOk = state.activeCategories.length === 0 || state.activeCategories.includes(t.category);
        const priOk = state.activePriorities.length === 0 || state.activePriorities.includes(t.priority);
        return catOk && priOk && t.column_status === col;
      }),
    categoryCount: (state) => (cat) => state.tasks.filter((t) => t.category === cat).length,
    priorityCount: (state) => (pri) => state.tasks.filter((t) => t.priority === pri).length,
    columnCount: (state) => (col) => state.tasks.filter((t) => t.column_status === col).length,
    priorityLabel: () => priorityLabel,
    priorityDot: () => priorityDot,
    priorityClass: () => priorityClass,
    catColors: () => catColors,
  },
  actions: {
    setTasks(tasks) {
      this.tasks = tasks.map((t) => ({
        ...t,
        tags: Array.isArray(t.tags) ? t.tags : [],
      }));
    },
    setIsMobile(isMobile) {
      this.isMobile = isMobile;
    },
    setActiveTab(tab) {
      this.activeTab = tab;
    },
    toggleCategory(category, checked) {
      if (checked && !this.activeCategories.includes(category)) {
        this.activeCategories.push(category);
      }
      if (!checked) {
        this.activeCategories = this.activeCategories.filter((c) => c !== category);
      }
    },
    togglePriority(priority, checked) {
      if (checked && !this.activePriorities.includes(priority)) {
        this.activePriorities.push(priority);
      }
      if (!checked) {
        this.activePriorities = this.activePriorities.filter((p) => p !== priority);
      }
    },
    computeAutoTags(text) {
      const lower = text.toLowerCase();
      const matched = [];
      let priorityOverride = null;
      for (const rule of tagRules) {
        if (rule.keywords.some((kw) => lower.includes(kw))) {
          if (!matched.find((m) => m.badge === rule.badge)) {
            matched.push(rule);
            if (rule.priorityOverride && !priorityOverride) priorityOverride = rule.priorityOverride;
          }
        }
      }
      return { tags: matched.map((r) => r.badge), priorityOverride };
    },
    tagBadgeClass(tag) {
      return tagColors[tag] || 'bg-sand-100 text-ink-muted border border-sand-200';
    },
    async createTask(payload) {
      const tempId = `tmp-${Date.now()}`;
      const optimistic = { id: tempId, ...payload };
      this.tasks.unshift(optimistic);

      router.post('/tasks', payload, {
        preserveScroll: true,
        onError: () => {
          this.tasks = this.tasks.filter((t) => t.id !== tempId);
        },
        onSuccess: () => {
          router.reload({ only: ['tasks'] });
        },
      });
    },
    updateTimeSpent(id, seconds) {
      const task = this.tasks.find((t) => t.id === id);
      if (task) {
        task.time_spent = seconds;
        // Opsional: Anda bisa menambahkan router.patch di sini 
        // jika ingin langsung menyimpan durasi ke database secara real-time
      }
    },
    moveTask(id, toCol) {
      const task = this.tasks.find((t) => t.id === id);
      if (!task || task.column_status === toCol) return;

      const previous = task.column_status;
      task.column_status = toCol;

      router.patch(`/tasks/${id}/move`, { column_status: toCol }, {
        preserveScroll: true,
        onError: () => {
          task.column_status = previous;
        },
      });
    },
    deleteTask(id) {
      const previous = [...this.tasks];
      this.tasks = this.tasks.filter((t) => t.id !== id);

      router.delete(`/tasks/${id}`, {
        preserveScroll: true,
        onError: () => {
          this.tasks = previous;
        },
      });
    },
    onDragStart(id) {
      this.draggedId = id;
    },
    onDragEnd() {
      this.draggedId = null;
      this.dragOverCol = null;
    },
    onDragOver(col) {
      this.dragOverCol = col;
    },
    onDragLeave(col) {
      if (this.dragOverCol === col) this.dragOverCol = null;
    },
    onDrop(col) {
      if (!this.draggedId) return;
      this.moveTask(this.draggedId, col);
      this.draggedId = null;
      this.dragOverCol = null;
    },
    toggleSelection(id) {
      const idx = this.selectedTasks.indexOf(id);
      if (idx > -1) {
        this.selectedTasks.splice(idx, 1);
      } else {
        this.selectedTasks.push(id);
      }
    },
    clearSelection() {
      this.selectedTasks = [];
    },
    bulkMove(toCol) {
      this.selectedTasks.forEach((id) => {
        const task = this.tasks.find((t) => t.id === id);
        if (task && task.column_status !== toCol) {
          this.moveTask(id, toCol); // Memanfaatkan fungsi moveTask yang sudah ada
        }
      });
      this.clearSelection();
    },
    bulkDelete() {
      this.selectedTasks.forEach((id) => {
        this.deleteTask(id); // Memanfaatkan fungsi deleteTask yang sudah ada
      });
      this.clearSelection();
    },
    // --- Fitur Cerdas: Deteksi Tanggal Otomatis (NLP Sederhana) ---
    parseNaturalDate(text) {
      if (!text) return null;
      const lower = text.toLowerCase();
      let targetDate = new Date();
      let matchFound = false;

      // 1. Deteksi Hari
      if (lower.includes('hari ini')) {
        matchFound = true;
      } else if (lower.includes('besok')) {
        targetDate.setDate(targetDate.getDate() + 1);
        matchFound = true;
      } else if (lower.includes('lusa')) {
        targetDate.setDate(targetDate.getDate() + 2);
        matchFound = true;
      }

      // 2. Deteksi Waktu/Jam (Contoh: "jam 10 pagi", "jam 17", "jam 4 sore")
      const timeRegex = /jam\s+(\d+)(?:\s+(pagi|siang|sore|malam))?/i;
      const timeMatch = lower.match(timeRegex);

      if (timeMatch) {
        let hours = parseInt(timeMatch[1], 10);
        const period = timeMatch[2];

        if (period) {
          if ((period === 'sore' || period === 'malam' || period === 'siang') && hours < 12) {
            hours += 12;
          }
          if (period === 'pagi' && hours === 12) {
            hours = 0;
          }
        }
        targetDate.setHours(hours, 0, 0, 0);
        matchFound = true;
      } else {
        // Jika tidak ada deteksi jam, set default ke akhir hari kerja (jam 17:00)
        targetDate.setHours(17, 0, 0, 0);
      }

      if (!matchFound) return null;

      // Format ke bentuk YYYY-MM-DDTHH:mm yang diterima oleh input datetime-local
      const pad = (num) => num.toString().padStart(2, '0');
      return `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}T${pad(targetDate.getHours())}:${pad(targetDate.getMinutes())}`;
    },

    // --- Fitur Cerdas: Prediksi ETA Berdasarkan Histori Tugas Serupa ---
    predictETA(title, currentTags = []) {
      // Ambil semua tugas yang sudah berstatus 'done' dan memiliki catatan durasi waktu aktual
      const completedTasks = this.tasks.filter(t => t.column_status === 'done' && t.time_spent > 0);
      if (completedTasks.length === 0) return null;

      let totalSeconds = 0;
      let matchCount = 0;
      const inputWords = title.toLowerCase().split(' ').filter(w => w.length > 2);

      completedTasks.forEach(t => {
        let isSimilar = false;

        // Cek kecocokan berdasarkan kesamaan Tag
        if (t.tags && t.tags.some(tag => currentTags.includes(tag))) {
          isSimilar = true;
        }

        // Cek kecocokan berdasarkan kesamaan kata pada Judul
        if (t.title) {
          const taskWords = t.title.toLowerCase().split(' ');
          if (inputWords.some(word => taskWords.includes(word))) {
            isSimilar = true;
          }
        }

        if (isSimilar) {
          totalSeconds += t.time_spent;
          matchCount++;
        }
      });

      // Jika ada histori yang mirip, kembalikan rata-rata waktunya (dalam detik)
      return matchCount > 0 ? Math.round(totalSeconds / matchCount) : null;
    },
  },
});
