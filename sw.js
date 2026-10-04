// Service worker. Sovellus ja kasvitiedot haetaan verkosta ensin, jotta päivitykset
// näkyvät heti, ja ilman verkkoa ne tulevat välimuistista. Kasvikuvat eivät muutu,
// joten ne otetaan välimuistista ensin ja ladataan vain kerran.

const APP = 'perenna-app-v1';
const IMAGES = 'perenna-kuvat-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin === location.origin) e.respondWith(networkFirst(req));
  else if (req.destination === 'image') e.respondWith(cacheFirst(req));
});

async function networkFirst(req) {
  const cache = await caches.open(APP);
  try {
    const res = await fetch(req);
    if (res.ok) {
      await cache.put(req, res.clone());
      // Poistetaan saman tiedoston vanhat ?v=N-versiot
      const { pathname, href } = new URL(req.url);
      for (const key of await cache.keys()) {
        const url = new URL(key.url);
        if (url.pathname === pathname && url.href !== href) cache.delete(key);
      }
    }
    return res;
  } catch {
    return (await cache.match(req)) ?? Response.error();
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(IMAGES);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  // Ristiinlinkitetyt kuvat ovat läpinäkymättömiä (status 0), mutta kelpaavat välimuistiin
  if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
  return res;
}
