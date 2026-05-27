<script setup>
import { ref } from 'vue';
import { useForm } from '@inertiajs/vue3';

const form = useForm({
  name: '',
  email: '',
  password: '',
});

const mode = ref('login');
const showPassword = ref(false);
const showToast = ref(false);
const toastMessage = ref('');
let toastTimeout = null;

const showToastMessage = (message) => {
  if (toastTimeout) clearTimeout(toastTimeout);

  toastMessage.value = message;
  showToast.value = true;

  toastTimeout = setTimeout(() => {
    showToast.value = false;
    form.clearErrors();
  }, 2500);
};

const showLoginError = () => {
  showToastMessage(mode.value === 'login' ? 'Email atau password salah' : 'Periksa nama, email, atau password.');
};

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const submit = () => {
  const email = form.email.trim();

  if (!email || !isValidEmail(email)) {
    form.setError('email', 'Masukkan alamat email yang valid.');
    showToastMessage('Masukkan alamat email yang valid, misalnya nama@gmail.com');
    return;
  }

  form.post(mode.value === 'login' ? '/login' : '/register', {
    preserveScroll: true,
    onError: showLoginError,
    onFinish: () => {
      form.reset('password');
    }
  });
};
</script>

<template>
  <div class="min-h-screen bg-sand-50 flex items-center justify-center p-4 selection:bg-sand-200">
    <div class="max-w-md w-full bg-white rounded-2xl shadow-card p-8 border border-sand-100 relative overflow-hidden">
      
      <div class="text-center mb-8">
        <h1 class="text-3xl font-serif text-ink tracking-tight mb-2">Flowdesk</h1>
        <p class="text-sand-500 text-sm">{{ mode === 'login' ? 'Masuk untuk melanjutkan ke ruang kerja Anda.' : 'Buat akun dan workspace pertama Anda.' }}</p>
      </div>

      <div class="grid grid-cols-2 gap-1 bg-sand-100 p-1 rounded-xl mb-6">
        <button type="button" class="py-2 rounded-lg text-sm font-medium transition-colors" :class="mode === 'login' ? 'bg-white text-ink shadow-sm' : 'text-ink-muted'" @click="mode = 'login'; form.clearErrors()">
          Masuk
        </button>
        <button type="button" class="py-2 rounded-lg text-sm font-medium transition-colors" :class="mode === 'register' ? 'bg-white text-ink shadow-sm' : 'text-ink-muted'" @click="mode = 'register'; form.clearErrors()">
          Daftar
        </button>
      </div>

      <form class="space-y-5" novalidate @submit.prevent="submit">
        <div v-if="mode === 'register'">
          <label class="block text-sm font-medium text-ink-muted mb-1.5">Nama</label>
          <input 
            type="text" 
            v-model="form.name" 
            required
            class="w-full px-4 py-3 rounded-xl border bg-sand-50/50 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-ink/20 focus:border-ink/40 transition-all"
            :class="form.errors.name ? 'border-rose' : 'border-sand-200'"
            placeholder="Nama Anda"
          >
        </div>

        <div>
          <label class="block text-sm font-medium text-ink-muted mb-1.5">Alamat Email</label>
          <input 
            type="email" 
            v-model="form.email" 
            required
            class="w-full px-4 py-3 rounded-xl border bg-sand-50/50 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-ink/20 focus:border-ink/40 transition-all"
            :class="form.errors.email ? 'border-rose' : 'border-sand-200'"
            placeholder="admin@flowdesk.test"
          >
        </div>

        <div>
          <label class="block text-sm font-medium text-ink-muted mb-1.5">Kata Sandi</label>
          <div class="relative flex items-center">
            <input 
              :type="showPassword ? 'text' : 'password'" 
              v-model="form.password" 
              required
              class="w-full px-4 py-3 pr-12 rounded-xl border border-sand-200 bg-sand-50/50 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-ink/20 focus:border-ink/40 transition-all"
              placeholder="••••••••"
            >
            <button 
              type="button" 
              @click="showPassword = !showPassword"
              class="absolute right-3 p-1 text-sand-400 hover:text-ink transition-colors flex items-center justify-center"
              title="Lihat sandi"
            >
              <svg v-if="!showPassword" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            </button>
          </div>
        </div>

        <button 
          type="submit" 
          :disabled="form.processing"
          class="w-full py-3 mt-4 rounded-xl bg-ink text-sand-50 text-sm font-medium hover:bg-ink-light transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex justify-center"
        >
          <svg v-if="form.processing" class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          <span v-else>{{ mode === 'login' ? 'Masuk ke Flowdesk' : 'Buat Akun' }}</span>
        </button>
      </form>
    </div>
  </div>

  <transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="transform translate-y-4 opacity-0"
    enter-to-class="transform translate-y-0 opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="transform translate-y-0 opacity-100"
    leave-to-class="transform translate-y-4 opacity-0"
  >
    <div 
      v-if="showToast" 
      class="fixed bottom-6 right-6 z-[9999] flex items-center gap-2 bg-rose text-white px-4 py-3 rounded-xl shadow-xl border border-rose-light/20"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span class="text-sm font-medium">{{ toastMessage }}</span>
    </div>
  </transition>
</template>
