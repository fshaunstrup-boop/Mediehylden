// Service Worker — cacher app-shell for offline-brug
const CACHE_NAME = 'mediehylden-v15';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/reset.css',
  '/css/theme.css',
  '/css/layout.css',
  '/css/components.css',
  '/js/app.js',
  '/js/router.js',
  '/js/db.js',
  '/js/categories.js',
  '/js/views/home.js',
  '/js/views/collection.js',
  '/js/views/form.js',
  '/js/views/detail.js',
  '/js/components/toast.js',
  '/js/components/mediaCard.js',
  '/js/components/ratingInput.js',
  '/js/components/imagePicker.js',
  '/js/components/sortBar.js',
  '/js/components/categoryRatings.js',
  '/js/components/trackRatings.js',
  '/js/components/seasonRatings.js',
  '/js/utils/scoring.js',
];

// Install — cache alle statiske filer
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — ryd gamle caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — cache-first for statiske filer, network-first for billeder
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Kun håndter GET-requests fra samme origin
  if (request.method !== 'GET' || url.origin !== location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // Cache gyldige responses
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});
