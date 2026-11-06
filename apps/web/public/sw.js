// PWA shell cache: hashed /assets/* are cache-first forever; the shell (index,
// manifest, icon) is network-first so a deploy lands on the next open, and offline
// falls back to the last cached shell. /api and the upgrade endpoints stay online.
const VERSION = 'sw-shell-1'
const CORE = ['/', '/manifest.webmanifest', '/icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION)
      await cache.addAll(CORE)
      await self.skipWaiting()
    })()
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name !== VERSION) {
          await caches.delete(name)
        }
      }
      await self.clients.claim()
    })()
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') {
    return
  }
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) {
    return
  }
  // Never cache credentials, session state, or the WebSocket upgrade surface.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/gateway') || url.pathname.startsWith('/client')) {
    return
  }
  if (url.pathname.startsWith('/assets/')) {
    // Content-hashed filenames: a hit is definitionally fresh.
    event.respondWith(
      (async () => {
        const cache = await caches.open(VERSION)
        const hit = await cache.match(request)
        if (hit) {
          return hit
        }
        const response = await fetch(request)
        if (response.ok) {
          cache.put(request, response.clone())
        }
        return response
      })()
    )
    return
  }
  event.respondWith(
    (async () => {
      const cache = await caches.open(VERSION)
      try {
        const response = await fetch(request)
        if (response.ok) {
          cache.put(request, response.clone())
        }
        return response
      } catch {
        const hit = await cache.match(request)
        if (hit) {
          return hit
        }
        // SPA deep links have no file behind them; serve the cached shell.
        const shell = await cache.match('/')
        if (shell) {
          return shell
        }
        throw new Error('offline and neither url nor shell cached')
      }
    })()
  )
})
