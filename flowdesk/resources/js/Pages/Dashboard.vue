<script setup>
import { Head } from '@inertiajs/vue3';
import { onMounted, watch } from 'vue'; // Tambahkan 'watch' di sini
import { useTaskStore } from '../Stores/useTaskStore';
import KanbanBoard from '../Components/KanbanBoard.vue';

const props = defineProps({
  tasks: { type: Array, default: () => [] },
});

const store = useTaskStore();

// Memuat data saat halaman pertama kali dibuka
onMounted(() => {
  store.setTasks(props.tasks);
});

// MEMPERBAIKI ERROR 404: 
// Pantau perubahan dari Inertia (setelah tambah/hapus tugas)
// dan langsung perbarui state agar ID 'tmp-' terganti dengan ID asli dari database.
watch(() => props.tasks, (newTasks) => {
  store.setTasks(newTasks);
}, { deep: true });
</script>

<template>
  <Head title="Flowdesk — Productivity Planner" />

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
</template>
