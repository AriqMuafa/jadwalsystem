<script setup>
import { Head, router, useForm } from '@inertiajs/vue3';
import { computed, onMounted, onUnmounted, ref } from 'vue';

const props = defineProps({
  profileUser: { type: Object, required: true },
  workspaces: { type: Array, default: () => [] },
  pendingInvitations: { type: Array, default: () => [] },
});

const workspaceForm = useForm({ name: '' });
const joinForm = useForm({ join_code: '' });
const installPrompt = ref(null);
const isPwaInstalled = ref(false);
const installStatus = ref('');

const canInstallPwa = computed(() => Boolean(installPrompt.value) && !isPwaInstalled.value);
const pwaInstallHint = computed(() => {
  if (isPwaInstalled.value) {
    return 'Flowdesk sudah berjalan sebagai aplikasi di perangkat ini.';
  }

  if (canInstallPwa.value) {
    return 'Pasang Flowdesk ke home screen atau desktop untuk akses lebih cepat.';
  }

  return 'Jika tombol install belum aktif, gunakan menu browser: Install app atau Add to Home Screen.';
});

const isRunningStandalone = () => (
  window.matchMedia?.('(display-mode: standalone)').matches
  || window.navigator.standalone === true
);

const syncInstallState = () => {
  installPrompt.value = window.__flowdeskPwaInstall?.prompt || null;
  isPwaInstalled.value = Boolean(window.__flowdeskPwaInstall?.installed || isRunningStandalone());
};

const handleInstallReady = (event) => {
  installPrompt.value = event.detail?.prompt || window.__flowdeskPwaInstall?.prompt || null;
  installStatus.value = '';
};

const handleInstalled = () => {
  installPrompt.value = null;
  isPwaInstalled.value = true;
  installStatus.value = 'Flowdesk berhasil dipasang.';
};

const installFlowdesk = async () => {
  if (!installPrompt.value) {
    installStatus.value = 'Prompt install belum tersedia dari browser. Coba dari Chrome/Edge, atau pakai menu browser.';
    return;
  }

  installPrompt.value.prompt();
  const result = await installPrompt.value.userChoice;

  if (result?.outcome === 'accepted') {
    handleInstalled();
    return;
  }

  installStatus.value = 'Install dibatalkan. Anda bisa mencoba lagi dari tombol ini atau menu browser.';
};

const createWorkspace = () => {
  if (!workspaceForm.name.trim()) return;
  workspaceForm.post('/workspaces', {
    preserveScroll: true,
    onSuccess: () => workspaceForm.reset(),
  });
};

const acceptInvite = (invitation) => {
  router.post(`/workspace-invitations/${invitation.id}/accept`, {}, { preserveScroll: true });
};

const joinWorkspace = () => {
  if (!joinForm.join_code.trim()) return;
  joinForm.post('/workspaces/join', {
    preserveScroll: true,
    onSuccess: () => joinForm.reset(),
  });
};

onMounted(() => {
  syncInstallState();
  window.addEventListener('flowdesk:pwa-install-ready', handleInstallReady);
  window.addEventListener('flowdesk:pwa-installed', handleInstalled);
  window.addEventListener('appinstalled', handleInstalled);
});

onUnmounted(() => {
  window.removeEventListener('flowdesk:pwa-install-ready', handleInstallReady);
  window.removeEventListener('flowdesk:pwa-installed', handleInstalled);
  window.removeEventListener('appinstalled', handleInstalled);
});
</script>

<template>
  <Head title="Profile — Flowdesk" />

  <div class="flex-1 overflow-y-auto bg-sand-50 p-4 md:p-8">
    <div class="max-w-5xl mx-auto">
      <div class="mb-8">
        <p class="text-xs font-semibold uppercase tracking-widest text-ink-muted mb-2">Akun</p>
        <h1 class="font-display text-3xl text-ink">{{ profileUser.name }}</h1>
        <p class="text-sm text-ink-muted mt-1">{{ profileUser.email }}</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-[1fr_0.9fr] gap-5">
        <section class="bg-white border border-sand-200 rounded-2xl p-5 shadow-card">
          <div class="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 class="font-display text-xl">Workspace Anda</h2>
              <p class="text-sm text-ink-muted">Ruang kerja yang Anda miliki atau ikuti.</p>
            </div>
          </div>

          <div class="grid gap-3 mb-5 md:grid-cols-2">
            <form class="flex gap-2" @submit.prevent="createWorkspace">
              <input v-model="workspaceForm.name" type="text" placeholder="Nama workspace baru" class="min-w-0 flex-1 px-4 py-2.5 rounded-xl border border-sand-200 bg-sand-50 text-sm focus:outline-none focus:ring-2 focus:ring-ink/20" />
              <button type="submit" class="px-4 py-2.5 rounded-xl bg-ink text-sand-50 text-sm font-medium">Buat</button>
            </form>
            <form class="flex gap-2" @submit.prevent="joinWorkspace">
              <input v-model="joinForm.join_code" type="text" placeholder="Kode workspace" class="min-w-0 flex-1 px-4 py-2.5 rounded-xl border bg-sand-50 text-sm uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-ink/20" :class="joinForm.errors.join_code ? 'border-rose' : 'border-sand-200'" />
              <button type="submit" class="px-4 py-2.5 rounded-xl border border-sand-200 bg-white text-ink text-sm font-medium">Join</button>
            </form>
          </div>
          <p v-if="joinForm.errors.join_code" class="-mt-3 mb-4 text-xs text-rose">{{ joinForm.errors.join_code }}</p>

          <div class="space-y-2">
            <div v-for="workspace in workspaces" :key="workspace.id" class="rounded-xl border border-sand-200 bg-sand-50 p-4 flex items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="font-medium text-ink truncate">{{ workspace.name }}</p>
                <p class="text-xs text-ink-muted truncate">Owner: {{ workspace.owner?.name || '-' }}</p>
                <p class="text-xs text-ink-muted truncate">Kode: <span class="font-mono tracking-widest text-ink">{{ workspace.join_code || '-' }}</span></p>
              </div>
              <button class="text-xs font-medium text-sky hover:underline" @click="router.post(`/workspaces/${workspace.id}/switch`)">
                Aktifkan
              </button>
            </div>
          </div>
        </section>

        <div class="space-y-5">
          <section class="bg-white border border-sand-200 rounded-2xl p-5 shadow-card">
            <div class="flex items-start gap-3">
              <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink text-sand-50">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 3v12" />
                  <path d="m7 10 5 5 5-5" />
                  <path d="M5 21h14" />
                </svg>
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-semibold uppercase tracking-widest text-ink-muted mb-1">Aplikasi</p>
                <h2 class="font-display text-xl">Install Flowdesk</h2>
                <p class="mt-1 text-sm leading-relaxed text-ink-muted">{{ pwaInstallHint }}</p>
                <div class="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="rounded-xl px-4 py-2.5 text-sm font-bold transition-colors"
                    :class="canInstallPwa ? 'bg-ink text-sand-50 hover:bg-ink-light' : 'border border-sand-200 bg-sand-50 text-ink-muted'"
                    :disabled="isPwaInstalled"
                    @click="installFlowdesk"
                  >
                    {{ isPwaInstalled ? 'Sudah Terinstall' : 'Install Aplikasi' }}
                  </button>
                </div>
                <p v-if="installStatus" class="mt-3 rounded-xl border border-sand-200 bg-sand-50 px-3 py-2 text-xs text-ink-muted">
                  {{ installStatus }}
                </p>
              </div>
            </div>
          </section>

          <section class="bg-white border border-sand-200 rounded-2xl p-5 shadow-card">
            <h2 class="font-display text-xl mb-1">Undangan</h2>
            <p class="text-sm text-ink-muted mb-5">Terima undangan workspace dari tim lain.</p>

            <div v-if="pendingInvitations.length === 0" class="rounded-xl border border-dashed border-sand-200 bg-sand-50 p-6 text-sm text-ink-muted">
              Belum ada undangan.
            </div>

            <div v-else class="space-y-2">
              <div v-for="invitation in pendingInvitations" :key="invitation.id" class="rounded-xl border border-sand-200 bg-sand-50 p-4">
                <p class="font-medium text-ink">{{ invitation.workspace?.name }}</p>
                <p class="text-xs text-ink-muted mt-0.5">Dari {{ invitation.inviter?.name || 'Tim' }}</p>
                <button class="mt-3 px-4 py-2 rounded-xl bg-ink text-sand-50 text-sm font-medium" @click="acceptInvite(invitation)">
                  Terima Undangan
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>
