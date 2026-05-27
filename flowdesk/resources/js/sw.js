import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, NetworkOnly, StaleWhileRevalidate } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';

const staticAssets = [
  { url: '/offline.html', revision: 'flowdesk-offline-v1' },
  { url: '/icons/flowdesk-192.png', revision: null },
  { url: '/icons/flowdesk-512.png', revision: null },
  { url: '/icons/flowdesk-icon.svg', revision: null },
];

cleanupOutdatedCaches();
precacheAndRoute([...self.__WB_MANIFEST, ...staticAssets]);

registerRoute(
  ({ request }) => request.mode === 'navigate',
  async (options) => {
    try {
      return await new NetworkOnly().handle(options);
    } catch (error) {
      return caches.match('/offline.html');
    }
  },
);

registerRoute(
  ({ request, url }) => request.destination === 'style' || request.destination === 'script' || url.pathname.startsWith('/build/'),
  new StaleWhileRevalidate({
    cacheName: 'flowdesk-static-assets',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 80,
        maxAgeSeconds: 60 * 60 * 24 * 30,
      }),
    ],
  }),
);

registerRoute(
  ({ request }) => request.destination === 'font' || request.destination === 'image',
  new NetworkFirst({
    cacheName: 'flowdesk-public-assets',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 80,
        maxAgeSeconds: 60 * 60 * 24 * 14,
      }),
    ],
  }),
);

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
