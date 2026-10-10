// Offline shell for Focus. Caches the app's own files only. It never touches other
// origins, so Supabase requests (sign-in, sessions, stats) always go straight to the network.
const CACHE = 'focus-shell-v1'
const SCOPE = self.registration.scope // e.g. https://user.github.io/focus-web/

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([SCOPE, SCOPE + 'manifest.webmanifest', SCOPE + 'favicon.svg', SCOPE + 'icon-192.png']))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || !url.href.startsWith(SCOPE)) return

  if (request.mode === 'navigate') {
    // Network first so a new deploy shows up; fall back to the cached shell offline.
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(SCOPE, copy))
          return response
        })
        .catch(() => caches.match(SCOPE)),
    )
    return
  }

  // Built files have hashed names, so cache first is safe; anything new is stored on first use.
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        }),
    ),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((windows) => {
      if (windows.length > 0) return windows[0].focus()
      return self.clients.openWindow(SCOPE)
    }),
  )
})
