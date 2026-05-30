<script setup>
import { computed } from 'vue';
import { useTaskStore } from '../Stores/useTaskStore';
import TaskCard from './TaskCard.vue';

const store = useTaskStore();

const columns = [
  { key: 'pending', label: 'Pending', dot: 'bg-sand-300', wrap: 'border border-sand-200 bg-white/70', badge: 'bg-sand-100 text-ink-muted' },
  { key: 'today', label: 'Hari Ini', dot: 'bg-sage', wrap: 'border border-sage/30 bg-sage-light/30', badge: 'bg-sage/15 text-sage' },
  { key: 'on_progress', label: 'On Progress', dot: 'bg-sky', wrap: 'border border-sky/30 bg-sky-light/30', badge: 'bg-sky/15 text-sky' },
  { key: 'done', label: 'Selesai', dot: 'bg-ink-muted', wrap: 'border border-sand-200 bg-sand-100/40', badge: 'bg-sand-200 text-ink-muted' },
];

const columnTasks = (col) => computed(() => store.filteredByColumn(col));
const isColumnVisible = (col) => (
  store.boardViewMode !== 'tabs'
  || !store.isMobile
  || store.activeTab === col
);
</script>

<template>
  <div
    id="kanban-board"
    class="flex-1 relative"
    :class="store.boardViewMode === 'all' ? 'overflow-y-auto overflow-x-hidden' : 'overflow-x-auto overflow-y-hidden'"
  >
    <div
      class="gap-4 p-4 md:p-6 min-w-0"
      :class="store.boardViewMode === 'all'
        ? 'grid min-h-full grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
        : 'flex h-full w-full md:w-auto'"
    >
      <div
        v-for="col in columns"
        :key="col.key"
        class="kanban-col-wrapper mobile-col flex-col"
        :data-col="col.key"
        :class="[
          isColumnVisible(col.key) ? 'flex' : 'hidden',
          store.boardViewMode === 'scroll' ? 'w-[82vw] min-w-[18rem] md:w-full md:min-w-0 md:flex-1' : 'w-full md:flex-1',
          store.boardViewMode === 'all' ? 'min-h-[24rem]' : ''
        ]"
      >
        <div
          class="kanban-col flex-1 rounded-xl2 flex flex-col overflow-hidden"
          :class="[col.wrap, store.dragOverCol === col.key ? 'drag-over' : '']"
          :data-col="col.key"
        >
          <div class="flex items-center justify-between px-4 py-3" :class="col.key === 'today' ? 'border-b border-sage/20' : 'border-b border-sand-100'">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full inline-block" :class="col.dot"></span>
              <h3 class="font-display text-base tracking-tight">{{ col.label }}</h3>
            </div>
            <span class="text-xs font-medium px-2 py-0.5 rounded-full" :class="col.badge">
              {{ store.filteredByColumn(col.key).length }}
            </span>
          </div>
          <div
            class="drop-zone flex-1 p-3 overflow-y-auto flex flex-col gap-2.5"
            :id="`drop-${col.key}`"
            @dragover.prevent="store.onDragOver(col.key)"
            @drop.prevent="store.onDrop(col.key)"
            @dragleave="store.onDragLeave(col.key)"
          >
            <TaskCard
              v-for="task in store.filteredByColumn(col.key)"
              :key="task.id"
              :task="task"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
