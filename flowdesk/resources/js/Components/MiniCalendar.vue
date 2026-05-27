<script setup>
import { computed } from 'vue';

const props = defineProps({
  tasks: { type: Array, default: () => [] },
});

const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const dayNames = ['M', 'S', 'S', 'R', 'K', 'J', 'S'];

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const sameMonth = (date, year, month) => date.getFullYear() === year && date.getMonth() === month;

const priorityOrder = { high: 0, medium: 1, low: 2 };
const priorityDotClass = {
  high: 'bg-rose',
  medium: 'bg-amber',
  low: 'bg-sage',
};

const calendar = computed(() => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = firstDay === 0 ? 6 : firstDay - 1;

  const tasksByDay = new Map();

  props.tasks.forEach((task) => {
    const due = toDate(task.due_date);
    if (!due || !sameMonth(due, year, month)) return;

    const day = due.getDate();
    const existing = tasksByDay.get(day) || [];
    existing.push(task);
    existing.sort((a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9));
    tasksByDay.set(day, existing);
  });

  const dueTasks = [...tasksByDay.values()].flat();
  const openDueTasks = dueTasks.filter((task) => task.column_status !== 'done');
  const overdueCount = openDueTasks.filter((task) => {
    const due = toDate(task.due_date);
    return due && due < now;
  }).length;

  return {
    year,
    month,
    today,
    offset,
    daysInMonth,
    tasksByDay,
    dueCount: dueTasks.length,
    openCount: openDueTasks.length,
    overdueCount,
  };
});

const dayTasks = (day) => calendar.value.tasksByDay.get(day) || [];
const visibleDots = (day) => dayTasks(day).slice(0, 3);
const hiddenCount = (day) => Math.max(dayTasks(day).length - 3, 0);
</script>

<template>
  <div>
    <div class="mb-4 flex items-start justify-between gap-3">
      <div>
        <p class="font-display text-base tracking-tight">{{ monthNames[calendar.month] }} {{ calendar.year }}</p>
        <p class="text-[11px] text-ink-muted mt-0.5">
          {{ calendar.openCount }} tugas aktif bulan ini
        </p>
      </div>
      <span
        class="text-[11px] font-semibold px-2 py-1 rounded-full"
        :class="calendar.overdueCount > 0 ? 'bg-rose/10 text-rose' : 'bg-sage/15 text-sage'"
      >
        {{ calendar.overdueCount > 0 ? `${calendar.overdueCount} telat` : 'Aman' }}
      </span>
    </div>

    <div class="grid grid-cols-7 gap-1 mb-1.5">
      <div v-for="d in dayNames" :key="d" class="text-center text-[11px] font-semibold text-ink-muted py-0.5">
        {{ d }}
      </div>
    </div>

    <div class="grid grid-cols-7 gap-1">
      <div v-for="n in calendar.offset" :key="`offset-${n}`" class="h-8"></div>
      <div
        v-for="d in calendar.daysInMonth"
        :key="`day-${d}`"
        class="cal-day group relative h-8 rounded-lg flex flex-col items-center justify-center cursor-default transition-colors"
        :class="{
          today: d === calendar.today,
          'has-task bg-sand-100/70 hover:bg-sand-200/70': dayTasks(d).length > 0 && d !== calendar.today,
          'hover:bg-sand-100': dayTasks(d).length === 0 && d !== calendar.today,
        }"
        :title="dayTasks(d).length > 0 ? `${dayTasks(d).length} tugas jatuh tempo` : ''"
      >
        <span class="text-xs font-medium leading-none">{{ d }}</span>
        <div v-if="dayTasks(d).length > 0" class="absolute bottom-1 flex items-center justify-center gap-0.5">
          <span
            v-for="task in visibleDots(d)"
            :key="task.id"
            class="w-1 h-1 rounded-full"
            :class="task.column_status === 'done' ? 'bg-sand-300' : priorityDotClass[task.priority] || 'bg-sand-300'"
          ></span>
          <span v-if="hiddenCount(d) > 0" class="text-[8px] leading-none text-ink-muted ml-0.5">+{{ hiddenCount(d) }}</span>
        </div>
      </div>
    </div>

    <div class="mt-4 pt-3 border-t border-sand-100 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-muted">
      <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-rose"></span>Tinggi</span>
      <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-amber"></span>Sedang</span>
      <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-sage"></span>Rendah</span>
      <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-sand-300"></span>Selesai</span>
    </div>
  </div>
</template>
