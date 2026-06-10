// Service Worker — cacher app-shell for offline-brug
const CACHE_NAME = 'mediehylden-v19';

// Udled base-sti automatisk (virker både lokalt og på GitHub Pages)
const BASE = self.location.pathname.replace(/\/sw\.js$/, '');

const STATIC_ASSETS = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/manifest.json',
  BASE + '/css/reset.css',
  BASE + '/css/theme.css',
  BASE + '/css/layout.css',
  BASE + '/css/components.css',
  BASE + '/js/app.js',
  BASE + '/js/router.js',
  BASE + '/js/db.js',
  BASE + '/js/categories.js',
  BASE + '/js/views/home.js',
  BASE + '/js/views/collection.js',
  BASE + '/js/views/form.js',
  BASE + '/js/views/detail.js',
  BASE + '/js/components/toast.js',
  BASE + '/js/components/mediaCard.js',
  BASE + '/js/components/ratingInput.js',
  BASE + '/js/components/imagePicker.js',
  BASE + '/js/components/sortBar.js',
  BASE + '/js/components/categoryRatings.js',
  BASE + '/js/components/trackRatings.js',
  BASE + '/js/components/seasonRatings.js',
  BASE + '/js/utils/scoring.js',
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
