import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  plugins: [
    laravel({
      input: ['resources/css/app.css', 'resources/js/app.js'],
      refresh: true,
    }),
    vue(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'resources/js',
      outDir: 'public',
      filename: 'sw.js',
      scope: '/',
      buildBase: '/',
      registerType: 'autoUpdate',
      includeAssets: ['offline.html', 'icons/flowdesk-192.png', 'icons/flowdesk-512.png', 'icons/flowdesk-icon.svg'],
      manifest: {
        name: 'Flowdesk',
        short_name: 'Flowdesk',
        description: 'Kanban workspace untuk tugas, tim, lampiran, dan chat.',
        theme_color: '#1a1714',
        background_color: '#faf8f4',
        lang: 'id',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/flowdesk-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/flowdesk-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      injectManifest: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  css: {
    postcss: {
      plugins: [
        tailwindcss(),
        autoprefixer(),
      ],
    },
  },
});
