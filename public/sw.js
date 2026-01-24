/* V0TV: Service Worker disabled.
 * This stub exists to cleanly remove previously-installed SWs.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        await self.registration.unregister();
      } catch {
        // ignore
      }

      try {
        const clients = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        });
        for (const client of clients) {
          try {
            client.navigate(client.url);
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
    })(),
  );
});

self.addEventListener('fetch', () => {
  // no-op (SW disabled)
});
