import '../css/app.css';
import './bootstrap'; 

import { createApp, h } from 'vue';
import { createInertiaApp } from '@inertiajs/vue3';
import { createPinia } from 'pinia';
import { registerSW } from 'virtual:pwa-register';

import AppLayout from './Layouts/AppLayout.vue';

const isRunningStandalone = () => (
  window.matchMedia?.('(display-mode: standalone)').matches
  || window.navigator.standalone === true
);

window.__flowdeskPwaInstall = {
  prompt: null,
  installed: isRunningStandalone(),
};

window.addEventListener('beforeinstallprompt', (event) => {
  if (isRunningStandalone()) return;

  event.preventDefault();
  window.__flowdeskPwaInstall.prompt = event;
  window.__flowdeskPwaInstall.installed = false;
  window.dispatchEvent(new CustomEvent('flowdesk:pwa-install-ready', {
    detail: {
      prompt: event,
    },
  }));
});

window.addEventListener('appinstalled', () => {
  window.__flowdeskPwaInstall.prompt = null;
  window.__flowdeskPwaInstall.installed = true;
  window.dispatchEvent(new CustomEvent('flowdesk:pwa-installed'));
});

const updateServiceWorker = registerSW({
  immediate: true,
  onNeedRefresh() {
    window.__flowdeskPwaUpdate = () => updateServiceWorker(true);
    window.dispatchEvent(new CustomEvent('flowdesk:pwa-update-ready', {
      detail: {
        update: window.__flowdeskPwaUpdate,
      },
    }));
  },
  onOfflineReady() {
    window.__flowdeskPwaOfflineReady = true;
    window.dispatchEvent(new CustomEvent('flowdesk:pwa-offline-ready'));
  },
  onRegisteredSW(swUrl) {
    console.info(`Flowdesk PWA registered: ${swUrl}`);
  },
  onRegisterError(error) {
    console.error('Flowdesk PWA registration failed:', error);
  },
});

createInertiaApp({
  resolve: (name) => {
    const pages = import.meta.glob('./Pages/**/*.vue', { eager: true });
    const page = pages[`./Pages/${name}.vue`];
    if (!name.startsWith('Auth/') && page.default.layout === undefined) {
        page.default.layout = page.default.layout || AppLayout;
    }
    return page;
  },
  setup({ el, App, props, plugin }) {
    const pinia = createPinia();

    createApp({ render: () => h(App, props) })
      .use(plugin)
      .use(pinia)
      .mount(el);
  },
});
