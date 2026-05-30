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

const offlineDbName = 'flowdesk-offline';
const offlineAttachmentStore = 'draft-attachments';
let highlightedDueDateTimer = null;
const storedBoardViewMode = () => {
  if (typeof localStorage === 'undefined') return 'tabs';

  return localStorage.getItem('flowdesk:board-view-mode') || 'tabs';
};

const openOfflineDb = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(offlineDbName, 1);

  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains(offlineAttachmentStore)) {
      db.createObjectStore(offlineAttachmentStore, { keyPath: 'id' });
    }
  };

  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const draftAttachmentPut = async (record) => {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(offlineAttachmentStore, 'readwrite');
    tx.objectStore(offlineAttachmentStore).put(record);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
};

const draftAttachmentGet = async (id) => {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(offlineAttachmentStore, 'readonly');
    const request = tx.objectStore(offlineAttachmentStore).get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
};

const draftAttachmentDelete = async (id) => {
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(offlineAttachmentStore, 'readwrite');
    tx.objectStore(offlineAttachmentStore).delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
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
    boardViewMode: storedBoardViewMode(),
    highlightedDueDate: null,
    detailModalOpen: false,
    selectedTaskDetail: null,
    taskLogs: [],
    taskLogsById: {},
    taskLogsHasMoreById: {},
    taskLogsHasMore: false,
    isLoadingTaskLogs: false,
    isOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
    offlineReadOnly: false,
    activeWorkspace: null,
    offlineDrafts: [],
    offlineQueue: [],
    isSyncingOfflineQueue: false,
    isSyncingOfflineDrafts: false,
    isAutoSyncingOffline: false,
  }),
  getters: {
    activeTasks: (state) => state.tasks.filter((task) => !task.archived_at),
    archivedTasks: (state) => state.tasks.filter((task) => task.archived_at),
    categories: (state) => [...new Set(state.tasks.filter((task) => !task.archived_at).map((t) => t.category))],
    filteredTasks: (state) =>
      state.tasks.filter((t) => {
        if (t.archived_at) return false;
        const catOk = state.activeCategories.length === 0 || state.activeCategories.includes(t.category);
        const priOk = state.activePriorities.length === 0 || state.activePriorities.includes(t.priority);
        return catOk && priOk;
      }),
    tasksByColumn: (state) => (col) => state.tasks.filter((t) => !t.archived_at && t.column_status === col),
    filteredByColumn: (state) => (col) =>
      state.tasks.filter((t) => {
        if (t.archived_at) return false;
        const catOk = state.activeCategories.length === 0 || state.activeCategories.includes(t.category);
        const priOk = state.activePriorities.length === 0 || state.activePriorities.includes(t.priority);
        return catOk && priOk && t.column_status === col;
      }),
    categoryCount: (state) => (cat) => state.tasks.filter((t) => !t.archived_at && t.category === cat).length,
    priorityCount: (state) => (pri) => state.tasks.filter((t) => !t.archived_at && t.priority === pri).length,
    columnCount: (state) => (col) => state.tasks.filter((t) => !t.archived_at && t.column_status === col).length,
    priorityLabel: () => priorityLabel,
    priorityDot: () => priorityDot,
    priorityClass: () => priorityClass,
    catColors: () => catColors,
    pendingOfflineQueue: (state) => state.offlineQueue.filter((action) => action.status !== 'failed'),
    failedOfflineQueue: (state) => state.offlineQueue.filter((action) => action.status === 'failed'),
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
    setOnlineStatus(isOnline) {
      this.isOnline = isOnline;
    },
    setOfflineReadOnly(isReadOnly) {
      this.offlineReadOnly = isReadOnly;
    },
    setActiveWorkspace(workspace) {
      this.activeWorkspace = workspace || null;
      this.loadOfflineDrafts();
      this.loadOfflineQueue();
    },
    draftStorageKey() {
      return this.activeWorkspace?.id ? `flowdesk:offline-drafts:${this.activeWorkspace.id}` : null;
    },
    queueStorageKey() {
      return this.activeWorkspace?.id ? `flowdesk:offline-queue:${this.activeWorkspace.id}` : null;
    },
    loadOfflineDrafts() {
      const key = this.draftStorageKey();
      if (!key) {
        this.offlineDrafts = [];
        return;
      }

      try {
        this.offlineDrafts = JSON.parse(localStorage.getItem(key) || '[]');
      } catch (error) {
        console.warn('Gagal membaca draft offline:', error);
        this.offlineDrafts = [];
      }

      this.mergeOfflineDrafts();
    },
    persistOfflineDrafts() {
      const key = this.draftStorageKey();
      if (!key) return;

      localStorage.setItem(key, JSON.stringify(this.offlineDrafts));
    },
    loadOfflineQueue() {
      const key = this.queueStorageKey();
      if (!key) {
        this.offlineQueue = [];
        return;
      }

      try {
        this.offlineQueue = JSON.parse(localStorage.getItem(key) || '[]');
      } catch (error) {
        console.warn('Gagal membaca antrean offline:', error);
        this.offlineQueue = [];
      }
    },
    applyOfflineQueueEffects() {
      for (const action of this.offlineQueue) {
        if (action.type === 'move') {
          const task = this.tasks.find((item) => item.id === action.task_id);
          if (task) task.column_status = action.payload.column_status;
        }

        if (action.type === 'update') {
          const task = this.tasks.find((item) => item.id === action.task_id);
          if (task) Object.assign(task, action.payload);
        }

        if (action.type === 'delete') {
          this.tasks = this.tasks.filter((task) => task.id !== action.task_id);
        }
      }
    },
    persistOfflineQueue() {
      const key = this.queueStorageKey();
      if (!key) return;

      localStorage.setItem(key, JSON.stringify(this.offlineQueue));
    },
    mergeOfflineDrafts() {
      const withoutDrafts = this.tasks.filter((task) => !task.is_offline_draft);
      this.tasks = [
        ...this.offlineDrafts.map((draft) => ({
          ...draft,
          is_offline_draft: true,
          tags: Array.isArray(draft.tags) ? draft.tags : [],
        })),
        ...withoutDrafts,
      ];
    },
    canMutate() {
      if (this.isOnline) return true;
      alert('Mode offline saat ini hanya untuk melihat workspace pribadi terakhir.');
      return false;
    },
    canCreateOfflineDraft() {
      return !this.isOnline && this.activeWorkspace?.is_personal;
    },
    canQueueOfflineAction() {
      return !this.isOnline && this.activeWorkspace?.is_personal;
    },
    isTaskQueued(taskId) {
      return this.offlineQueue.some((action) => action.task_id === taskId && action.status !== 'failed');
    },
    isTaskQueueFailed(taskId) {
      return this.offlineQueue.some((action) => action.task_id === taskId && action.status === 'failed');
    },
    conflictMessage(error) {
      const status = error?.response?.status;

      if (status === 404) return 'Task sudah tidak ada di server.';
      if (status === 403) return 'Akses task ditolak oleh server.';
      if (status === 422) return 'Data task tidak valid untuk disinkronkan.';
      if (status === 419) return 'Sesi login kedaluwarsa. Login ulang lalu coba sinkron lagi.';
      if (status >= 500) return 'Server bermasalah saat sinkronisasi.';

      return 'Koneksi tidak stabil atau server tidak merespons.';
    },
    enqueueOfflineAction(action) {
      if (action.type === 'move') {
        this.offlineQueue = this.offlineQueue
          .filter((item) => !(item.task_id === action.task_id && item.type === 'move'))
          .filter((item) => !(item.task_id === action.task_id && item.type === 'delete'));
      }

      if (action.type === 'delete') {
        this.offlineQueue = this.offlineQueue.filter((item) => item.task_id !== action.task_id);
      }

      if (action.type === 'update') {
        this.offlineQueue = this.offlineQueue
          .filter((item) => !(item.task_id === action.task_id && item.type === 'update'))
          .filter((item) => !(item.task_id === action.task_id && item.type === 'delete'));
      }

      this.offlineQueue.push({
        id: `queue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        created_at: new Date().toISOString(),
        status: 'pending',
        attempts: 0,
        last_error: null,
        ...action,
      });
      this.persistOfflineQueue();
    },
    retryFailedOfflineQueue() {
      this.offlineQueue = this.offlineQueue.map((action) => (
        action.status === 'failed'
          ? { ...action, status: 'pending', last_error: null }
          : action
      ));
      this.persistOfflineQueue();
      this.syncOfflineQueue();
    },
    discardFailedOfflineQueue() {
      this.offlineQueue = this.offlineQueue.filter((action) => action.status !== 'failed');
      this.persistOfflineQueue();
    },
    setActiveTab(tab) {
      this.activeTab = tab;
    },
    setBoardViewMode(mode) {
      if (!['tabs', 'scroll', 'all'].includes(mode)) return;

      this.boardViewMode = mode;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('flowdesk:board-view-mode', mode);
      }
    },
    taskDateKey(value) {
      if (!value) return null;

      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return null;

      const pad = (num) => String(num).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    },
    highlightDueDate(dateKey) {
      this.highlightedDueDate = dateKey;

      if (highlightedDueDateTimer) {
        clearTimeout(highlightedDueDateTimer);
      }

      highlightedDueDateTimer = setTimeout(() => {
        this.highlightedDueDate = null;
        highlightedDueDateTimer = null;
      }, 5000);
    },
    isTaskDueDateHighlighted(task) {
      return Boolean(this.highlightedDueDate && this.taskDateKey(task?.due_date) === this.highlightedDueDate);
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

    // --- DIPERBAIKI: Mengembalikan Optimistic UI & Error Handling ---
    async createTask(payload, onSuccessCallback) {
      if (!this.isOnline) {
        if (!this.canCreateOfflineDraft()) {
          alert('Workspace tim membutuhkan koneksi internet. Draft offline hanya tersedia untuk workspace pribadi.');
          return;
        }

        const { attachment, ...draftPayload } = payload;
        const draftId = `draft-${Date.now()}`;
        const draft = {
          id: draftId,
          ...draftPayload,
          attachment_path: null,
          file_name: attachment ? attachment.name : draftPayload.file_name,
          attachment_key: attachment ? draftId : null,
          attachment_type: attachment?.type || null,
          attachment_size: attachment?.size || null,
          has_offline_attachment: Boolean(attachment),
          tags: Array.isArray(draftPayload.tags) ? draftPayload.tags : [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (attachment) {
          try {
            await draftAttachmentPut({
              id: draftId,
              blob: attachment,
              name: attachment.name,
              type: attachment.type,
              size: attachment.size,
              created_at: new Date().toISOString(),
            });
          } catch (error) {
            console.error('Gagal menyimpan lampiran offline:', error);
            alert('Lampiran gagal disimpan offline. Draft tetap disimpan tanpa lampiran.');
            draft.file_name = null;
            draft.attachment_key = null;
            draft.attachment_type = null;
            draft.attachment_size = null;
            draft.has_offline_attachment = false;
          }
        }

        this.offlineDrafts.unshift(draft);
        this.persistOfflineDrafts();
        this.mergeOfflineDrafts();

        if (onSuccessCallback) onSuccessCallback();
        return;
      }

      const tempId = `tmp-${Date.now()}`;
      
      // Pisahkan 'attachment' (File Object) dari payload utama
      // Biarkan 'file_name' (String) tetap berada di dalam ...taskData
      const { attachment, ...taskData } = payload; 

      // 1. Optimistic Update: Munculkan tugas di papan (termasuk properti file_name)
      this.tasks.unshift({
        id: tempId,
        ...taskData,
        tags: Array.isArray(taskData.tags) ? taskData.tags : [],
      });

      // 2. Siapkan data bersih untuk dikirim melalui Inertia
      const finalPayload = { ...taskData };
      if (attachment) {
        finalPayload.attachment = attachment;
      }

      router.post('/tasks', finalPayload, {
        preserveScroll: true,
        forceFormData: true,
        onSuccess: () => {
          if (onSuccessCallback) onSuccessCallback();
        },
        onError: (errors) => {
          this.tasks = this.tasks.filter((t) => t.id !== tempId);
          console.error('Error Validasi:', errors);
          alert('Gagal menambahkan tugas.');
        },
      });
    },

    updateTimeSpent(id, seconds) {
      const task = this.tasks.find((t) => t.id === id);
      if (task) {
        task.time_spent = seconds;
      }
    },
    updateTask(id, payload) {
      const task = this.tasks.find((item) => item.id === id);
      if (!task) return;

      const previous = { ...task };
      Object.assign(task, payload, { tags: Array.isArray(payload.tags) ? payload.tags : [] });

      if (this.selectedTaskDetail?.id === id) {
        this.selectedTaskDetail = {
          ...this.selectedTaskDetail,
          ...payload,
          tags: Array.isArray(payload.tags) ? payload.tags : [],
        };
      }

      if (String(id).startsWith('draft-')) {
        this.offlineDrafts = this.offlineDrafts.map((draft) => (
          draft.id === id ? { ...draft, ...payload, updated_at: new Date().toISOString() } : draft
        ));
        this.persistOfflineDrafts();
        return;
      }

      if (!this.isOnline) {
        if (!this.canQueueOfflineAction()) {
          Object.assign(task, previous);
          alert('Workspace tim membutuhkan koneksi internet. Perubahan offline hanya tersedia untuk workspace pribadi.');
          return;
        }

        this.enqueueOfflineAction({
          type: 'update',
          task_id: id,
          payload,
          rollback: { task: previous },
        });
        return;
      }

      router.patch(`/tasks/${id}`, payload, {
        preserveScroll: true,
        onError: (errors) => {
          Object.assign(task, previous);
          if (this.selectedTaskDetail?.id === id) {
            this.selectedTaskDetail = previous;
          }
          console.error('Gagal memperbarui tugas:', errors);
          alert('Gagal memperbarui tugas.');
        },
      });
    },
    moveTask(id, toCol) {
      const task = this.tasks.find((t) => t.id === id);
      if (!task || task.column_status === toCol) return;

      const previous = task.column_status;
      task.column_status = toCol;

      if (String(id).startsWith('draft-')) {
        this.offlineDrafts = this.offlineDrafts.map((draft) => (
          draft.id === id ? { ...draft, column_status: toCol, updated_at: new Date().toISOString() } : draft
        ));
        this.persistOfflineDrafts();
        return;
      }

      if (!this.isOnline) {
        if (!this.canQueueOfflineAction()) {
          task.column_status = previous;
          alert('Workspace tim membutuhkan koneksi internet. Perubahan offline hanya tersedia untuk workspace pribadi.');
          return;
        }

        this.enqueueOfflineAction({
          type: 'move',
          task_id: id,
          payload: { column_status: toCol },
          rollback: { column_status: previous },
        });
        return;
      }

      router.patch(`/tasks/${id}/move`, { column_status: toCol }, {
        preserveScroll: true,
        onError: () => {
          task.column_status = previous;
        },
      });
    },
    deleteTask(id) {
      if (String(id).startsWith('draft-')) {
        draftAttachmentDelete(id).catch((error) => console.warn('Gagal menghapus lampiran draft:', error));
        this.offlineDrafts = this.offlineDrafts.filter((draft) => draft.id !== id);
        this.persistOfflineDrafts();
        this.tasks = this.tasks.filter((task) => task.id !== id);
        return;
      }

      const previous = [...this.tasks];
      this.tasks = this.tasks.filter((t) => t.id !== id);

      if (!this.isOnline) {
        if (!this.canQueueOfflineAction()) {
          this.tasks = previous;
          alert('Workspace tim membutuhkan koneksi internet. Perubahan offline hanya tersedia untuk workspace pribadi.');
          return;
        }

        this.enqueueOfflineAction({
          type: 'delete',
          task_id: id,
          rollback: { task: previous.find((task) => task.id === id) },
        });
        return;
      }

      router.delete(`/tasks/${id}`, {
        preserveScroll: true,
        onError: () => {
          this.tasks = previous;
        },
      });
    },
    archiveTask(id) {
      const task = this.tasks.find((item) => item.id === id);
      if (!task || task.archived_at) return;

      if (String(id).startsWith('draft-')) {
        this.deleteTask(id);
        return;
      }

      if (!this.isOnline) {
        alert('Arsip membutuhkan koneksi internet.');
        return;
      }

      const previous = task.archived_at;
      task.archived_at = new Date().toISOString();
      this.selectedTasks = this.selectedTasks.filter((taskId) => taskId !== id);

      router.patch(`/tasks/${id}/archive`, {}, {
        preserveScroll: true,
        onError: () => {
          task.archived_at = previous;
        },
      });
    },
    restoreTask(id) {
      const task = this.tasks.find((item) => item.id === id);
      if (!task || !task.archived_at) return;

      if (!this.isOnline) {
        alert('Pulihkan arsip membutuhkan koneksi internet.');
        return;
      }

      const previous = task.archived_at;
      task.archived_at = null;

      router.patch(`/tasks/${id}/restore`, {}, {
        preserveScroll: true,
        onError: () => {
          task.archived_at = previous;
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
    async buildOfflineDraftPayload(draft) {
      const {
        id: draftId,
        is_offline_draft,
        created_at,
        updated_at,
        attachment_path,
        attachment_key,
        attachment_type,
        attachment_size,
        has_offline_attachment,
        sync_error,
        file_name,
        ...payload
      } = draft;

      if (has_offline_attachment && attachment_key) {
        const attachmentRecord = await draftAttachmentGet(attachment_key);
        if (!attachmentRecord?.blob) {
          throw new Error('Lampiran draft tidak ditemukan di penyimpanan offline.');
        }

        payload.attachment = new File(
          [attachmentRecord.blob],
          attachmentRecord.name || file_name || 'attachment',
          { type: attachmentRecord.type || attachment_type || 'application/octet-stream' },
        );
        payload.file_name = attachmentRecord.name || file_name;
      }

      return { draftId, payload };
    },
    toFormData(payload) {
      const formData = new FormData();

      Object.entries(payload).forEach(([key, value]) => {
        if (value === undefined || value === null) return;

        if (Array.isArray(value)) {
          value.forEach((item, index) => formData.append(`${key}[${index}]`, item));
          return;
        }

        formData.append(key, value);
      });

      return formData;
    },
    removeOfflineDraft(draftId) {
      this.offlineDrafts = this.offlineDrafts.filter((item) => item.id !== draftId);
      this.persistOfflineDrafts();
      this.tasks = this.tasks.filter((task) => task.id !== draftId);
      draftAttachmentDelete(draftId).catch((error) => console.warn('Gagal menghapus lampiran draft:', error));
    },
    async postOfflineDraft(draft) {
      const { draftId, payload } = await this.buildOfflineDraftPayload(draft);
      await window.axios.post('/tasks', this.toFormData(payload));
      this.removeOfflineDraft(draftId);
    },
    async submitOfflineDraft(id) {
      if (!this.isOnline) {
        alert('Koneksi internet dibutuhkan untuk mengirim draft.');
        return;
      }

      const draft = this.offlineDrafts.find((item) => item.id === id);
      if (!draft) return;

      try {
        await this.postOfflineDraft(draft);
        router.reload({ preserveScroll: true });
      } catch (error) {
        console.error('Gagal mengirim draft offline:', error);
        alert(error?.message || 'Draft belum bisa dikirim. Periksa data tugas lalu coba lagi.');
      }
    },
    async submitAllOfflineDrafts() {
      await this.syncOfflineDrafts();
    },
    async syncOfflineDrafts({ reload = true, showAlert = true } = {}) {
      if (!this.isOnline || this.isSyncingOfflineDrafts || this.offlineDrafts.length === 0) {
        return { synced: 0, failed: [] };
      }

      this.isSyncingOfflineDrafts = true;
      let synced = 0;
      const failed = [];

      for (const draft of [...this.offlineDrafts]) {
        try {
          await this.postOfflineDraft(draft);
          synced += 1;
        } catch (error) {
          console.error('Gagal sinkron draft offline:', error);
          const failedMessage = error?.message || this.conflictMessage(error);
          failed.push({ ...draft, sync_error: failedMessage });
          this.offlineDrafts = this.offlineDrafts.map((item) => (
            item.id === draft.id ? { ...item, sync_error: failedMessage } : item
          ));
          this.persistOfflineDrafts();
        }
      }

      this.isSyncingOfflineDrafts = false;

      if (synced > 0 && reload) {
        router.reload({ preserveScroll: true });
      }

      if (failed.length > 0 && showAlert) {
        alert(`${failed.length} draft offline belum bisa dikirim. Draft tetap tersimpan untuk dicoba lagi.`);
      }

      return { synced, failed };
    },
    async syncOfflineQueue({ reload = true, showAlert = true } = {}) {
      if (!this.isOnline || this.isSyncingOfflineQueue || this.offlineQueue.length === 0) {
        return { synced: 0, failed: [] };
      }

      this.isSyncingOfflineQueue = true;
      let synced = 0;
      const failed = [];

      for (const action of this.offlineQueue.filter((item) => item.status !== 'failed')) {
        try {
          this.offlineQueue = this.offlineQueue.map((item) => (
            item.id === action.id ? { ...item, status: 'syncing', attempts: (item.attempts || 0) + 1 } : item
          ));
          this.persistOfflineQueue();

          if (action.type === 'update') {
            await window.axios.patch(`/tasks/${action.task_id}`, action.payload);
          }

          if (action.type === 'move') {
            await window.axios.patch(`/tasks/${action.task_id}/move`, action.payload);
          }

          if (action.type === 'delete') {
            await window.axios.delete(`/tasks/${action.task_id}`);
          }

          this.offlineQueue = this.offlineQueue.filter((item) => item.id !== action.id);
          this.persistOfflineQueue();
          synced += 1;
        } catch (error) {
          console.error('Gagal sinkron aksi offline:', error);
          const failedAction = {
            ...action,
            status: 'failed',
            attempts: (action.attempts || 0) + 1,
            last_error: this.conflictMessage(error),
            failed_at: new Date().toISOString(),
          };

          this.offlineQueue = this.offlineQueue.map((item) => (
            item.id === action.id ? failedAction : item
          ));
          this.persistOfflineQueue();
          failed.push(failedAction);
        }
      }

      this.isSyncingOfflineQueue = false;

      if (synced > 0 && failed.length === 0 && reload) {
        router.reload({ preserveScroll: true });
      } else if (failed.length > 0 && showAlert) {
        alert(`${failed.length} aksi offline gagal disinkronkan. Periksa banner konflik untuk retry atau hapus antrean.`);
      }

      return { synced, failed };
    },
    async autoSyncOfflineWork() {
      if (!this.isOnline || !this.activeWorkspace?.is_personal || this.isAutoSyncingOffline) return;
      if (this.offlineDrafts.length === 0 && this.pendingOfflineQueue.length === 0) return;

      this.isAutoSyncingOffline = true;

      try {
        const queueResult = await this.syncOfflineQueue({ reload: false, showAlert: false });
        const draftResult = await this.syncOfflineDrafts({ reload: false, showAlert: false });
        const didSync = (queueResult?.synced || 0) > 0 || (draftResult?.synced || 0) > 0;

        if (didSync) {
          router.reload({ preserveScroll: true });
        }
      } finally {
        this.isAutoSyncingOffline = false;
      }
    },
    bulkMove(toCol) {
      this.selectedTasks.forEach((id) => {
        const task = this.tasks.find((t) => t.id === id);
        if (task && task.column_status !== toCol) {
          this.moveTask(id, toCol);
        }
      });
      this.clearSelection();
    },
    bulkDelete() {
      this.selectedTasks.forEach((id) => {
        this.deleteTask(id);
      });
      this.clearSelection();
    },
    parseNaturalDate(text) {
      if (!text) return null;
      const lower = text.toLowerCase();
      let targetDate = new Date();
      let matchFound = false;

      if (lower.includes('hari ini')) {
        matchFound = true;
      } else if (lower.includes('besok')) {
        targetDate.setDate(targetDate.getDate() + 1);
        matchFound = true;
      } else if (lower.includes('lusa')) {
        targetDate.setDate(targetDate.getDate() + 2);
        matchFound = true;
      }

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
        targetDate.setHours(17, 0, 0, 0);
      }

      if (!matchFound) return null;

      const pad = (num) => num.toString().padStart(2, '0');
      return `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}T${pad(targetDate.getHours())}:${pad(targetDate.getMinutes())}`;
    },
    predictETA(title, currentTags = []) {
      const completedTasks = this.tasks.filter(t => t.column_status === 'done' && t.time_spent > 0);
      if (completedTasks.length === 0) return null;

      let totalSeconds = 0;
      let matchCount = 0;
      const inputWords = title.toLowerCase().split(' ').filter(w => w.length > 2);

      completedTasks.forEach(t => {
        let isSimilar = false;
        if (t.tags && t.tags.some(tag => currentTags.includes(tag))) {
          isSimilar = true;
        }
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

      return matchCount > 0 ? Math.round(totalSeconds / matchCount) : null;
    },
    async openDetailModal(task) {
      this.selectedTaskDetail = task;
      this.detailModalOpen = true;
      this.taskLogs = this.taskLogsById[task.id] || [];
      this.taskLogsHasMore = this.taskLogsHasMoreById[task.id] ?? false;
      this.isLoadingTaskLogs = false;
    },
    async fetchTaskLogs(task = this.selectedTaskDetail, { append = false } = {}) {
      if (!task || this.isLoadingTaskLogs) return;
      if (!append && this.taskLogsById[task.id]) {
        this.taskLogs = this.taskLogsById[task.id];
        this.taskLogsHasMore = this.taskLogsHasMoreById[task.id] ?? false;
        return;
      }

      if (String(task.id).startsWith('tmp-') || String(task.id).startsWith('draft-') || !this.isOnline) {
        return;
      }

      this.isLoadingTaskLogs = true;

      try {
        const offset = append ? this.taskLogs.length : 0;
        const response = await window.axios.get(`/tasks/${task.id}/logs`, {
          params: { offset, limit: 10 },
        });
        const logs = Array.isArray(response.data) ? response.data : response.data.logs || [];
        const mergedLogs = append ? [...this.taskLogs, ...logs] : logs;

        this.taskLogs = mergedLogs;
        this.taskLogsHasMore = Array.isArray(response.data) ? false : Boolean(response.data.has_more);
        this.taskLogsById = { ...this.taskLogsById, [task.id]: mergedLogs };
        this.taskLogsHasMoreById = { ...this.taskLogsHasMoreById, [task.id]: this.taskLogsHasMore };
      } catch (error) {
        console.error('Gagal mengambil audit trail:', error);
      } finally {
        this.isLoadingTaskLogs = false;
      }
    },
    closeDetailModal() {
      this.detailModalOpen = false;
      this.selectedTaskDetail = null;
      this.taskLogs = [];
      this.taskLogsHasMore = false;
      this.isLoadingTaskLogs = false;
    },
    initRealtime() {
      // Pastikan Echo sudah tersedia dari bootstrap.js
      if (window.Echo) {
        window.Echo.channel('kanban-board')
          .listen('TaskMoved', (e) => {
            // Cari task di state lokal berdasarkan ID dari Reverb
            const task = this.tasks.find((t) => t.id === e.taskId);
            if (task && task.column_status !== e.columnStatus) {
              // Pindahkan secara reaktif di layar pengguna lain
              task.column_status = e.columnStatus;
            }
          });
      }
    },
  },
});
