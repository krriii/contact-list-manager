const CACHE_NAME = 'contact-list-manager-v1';
const API_CACHE_NAME = 'contact-list-api-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json'
];

// Install service worker and cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      }),
      caches.open(API_CACHE_NAME).then(cache => {
        console.log('Opened API cache');
        return cache;
      })
    ])
  );
});

// Activate service worker and clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event handler for offline functionality
self.addEventListener('fetch', event => {
  // Handle API requests
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      handleApiRequest(event.request)
    );
  } else {
    // Handle static resources
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            return response;
          }
          return fetch(event.request).then(response => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            return response;
          });
        })
    );
  }
});

// Handle API requests with offline support
async function handleApiRequest(request) {
  const apiCache = await caches.open(API_CACHE_NAME);
  
  // Try to get from cache first
  const cachedResponse = await apiCache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    // Try network request
    const response = await fetch(request);
    const responseToCache = response.clone();
    await apiCache.put(request, responseToCache);
    return response;
  } catch (error) {
    // If offline, return cached response if available
    if (cachedResponse) {
      return cachedResponse;
    }
    // If no cached response, return error response
    return new Response(JSON.stringify({ error: 'Offline mode - No cached data available' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 