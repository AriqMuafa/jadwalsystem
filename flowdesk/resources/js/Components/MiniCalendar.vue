<script setup>
import { computed } from 'vue';

const props = defineProps({
  tasks: { type: Array, default: () => [] },
});

const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const dayNames = ['M', 'S', 'S', 'R', 'K', 'J', 'S'];

const calendar = computed(() => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = firstDay === 0 ? 6 : firstDay - 1;

  const taskDays = new Set(
    props.tasks
      .filter((t) => t.column_status !== 'done')
      .map(() => Math.floor(Math.random() * daysInMonth) + 1)
  );
  taskDays.add(today);

  return {
    year,
    month,
    today,
    offset,
    daysInMonth,
    taskDays,
  };
});
</script>

<template>
  <div>
    <div class="mb-3">
      <p class="font-display text-base tracking-tight">{{ monthNames[calendar.month] }} {{ calendar.year }}</p>
    </div>
    <div class="grid grid-cols-7 gap-0.5 mb-1">
      <div v-for="d in dayNames" :key="d" class="text-center text-xs text-ink-muted py-0.5">{{ d }}</div>
    </div>
    <div class="grid grid-cols-7 gap-0.5">
      <div v-for="n in calendar.offset" :key="`offset-${n}`"></div>
      <div
        v-for="d in calendar.daysInMonth"
        :key="`day-${d}`"
        class="cal-day text-center text-xs py-1 w-7 h-7 leading-5 mx-auto rounded-full cursor-default"
        :class="{
          today: d === calendar.today,
          'has-task': calendar.taskDays.has(d) && d !== calendar.today,
          'hover:bg-sand-100 transition-colors': d !== calendar.today,
        }"
      >
        {{ d }}
      </div>
    </div>
  </div>
</template>
