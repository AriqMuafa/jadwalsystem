<script setup>
import { Head, router, useForm } from '@inertiajs/vue3';

defineOptions({ layout: null });

const props = defineProps({
  currentUser: { type: Object, default: null },
});

const createForm = useForm({ name: '' });
const joinForm = useForm({ join_code: '' });

const createWorkspace = () => {
  if (!createForm.name.trim()) return;
  createForm.post('/workspaces', {
    preserveScroll: true,
    onSuccess: () => createForm.reset(),
  });
};

const joinWorkspace = () => {
  if (!joinForm.join_code.trim()) return;
  joinForm.post('/workspaces/join', {
    preserveScroll: true,
    onSuccess: () => joinForm.reset(),
  });
};

const logout = () => {
  router.post('/logout');
};
</script>

<template>
  <Head title="Mulai Workspace — Flowdesk" />

  <main class="min-h-screen bg-sand-50 px-4 py-6 md:py-10">
    <div class="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col">
      <header class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-sand-50">
            <svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="10" height="11" rx="1" />
              <line x1="6" y1="8" x2="10" y2="8" />
              <line x1="6" y1="11" x2="10" y2="11" />
            </svg>
          </div>
          <span class="font-display text-2xl tracking-tight text-ink">Flowdesk</span>
        </div>
        <div class="flex items-center gap-3">
          <p class="hidden text-sm text-ink-muted sm:block">{{ props.currentUser?.email }}</p>
          <button class="rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm font-medium text-rose hover:bg-rose/10" @click="logout">
            Logout
          </button>
        </div>
      </header>

      <section class="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p class="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-muted">Workspace</p>
          <h1 class="font-display text-4xl leading-tight text-ink md:text-5xl">Pilih ruang kerja sebelum mulai.</h1>
          <p class="mt-4 max-w-xl text-sm leading-6 text-ink-muted">
            Buat workspace untuk proyek baru, atau masukkan kode dari workspace tim agar task, chat, file, dan riwayat kerja tersimpan di ruang yang sama.
          </p>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <form class="rounded-2xl border border-sand-200 bg-white p-5 shadow-card" @submit.prevent="createWorkspace">
            <div class="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-sand-50">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
            <h2 class="font-display text-xl text-ink">Buat Workspace</h2>
            <p class="mt-1 min-h-10 text-sm leading-5 text-ink-muted">Untuk proyek atau tim baru.</p>
            <input
              v-model="createForm.name"
              type="text"
              placeholder="Nama workspace"
              class="mt-5 w-full rounded-xl border bg-sand-50 px-4 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-ink/20"
              :class="createForm.errors.name ? 'border-rose' : 'border-sand-200'"
            />
            <p v-if="createForm.errors.name" class="mt-2 text-xs text-rose">{{ createForm.errors.name }}</p>
            <button
              type="submit"
              class="mt-4 w-full rounded-xl bg-ink px-4 py-3 text-sm font-medium text-sand-50 transition-colors hover:bg-ink-light disabled:opacity-60"
              :disabled="createForm.processing"
            >
              Buat dan Buka
            </button>
          </form>

          <form class="rounded-2xl border border-sand-200 bg-white p-5 shadow-card" @submit.prevent="joinWorkspace">
            <div class="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-sand-100 text-ink">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </div>
            <h2 class="font-display text-xl text-ink">Join Workspace</h2>
            <p class="mt-1 min-h-10 text-sm leading-5 text-ink-muted">Gunakan kode yang dibagikan pemilik workspace.</p>
            <input
              v-model="joinForm.join_code"
              type="text"
              placeholder="Contoh: A1B2C3D4"
              class="mt-5 w-full rounded-xl border bg-sand-50 px-4 py-3 text-sm uppercase tracking-widest text-ink outline-none focus:ring-2 focus:ring-ink/20"
              :class="joinForm.errors.join_code ? 'border-rose' : 'border-sand-200'"
            />
            <p v-if="joinForm.errors.join_code" class="mt-2 text-xs text-rose">{{ joinForm.errors.join_code }}</p>
            <button
              type="submit"
              class="mt-4 w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-sand-100 disabled:opacity-60"
              :disabled="joinForm.processing"
            >
              Join dan Buka
            </button>
          </form>
        </div>
      </section>
    </div>
  </main>
</template>
