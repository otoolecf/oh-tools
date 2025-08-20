// Simple Service Worker for Browser Data Workbench
// Provides basic caching for offline functionality

const CACHE_NAME = 'bdw-cache-v5';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './duckdb-worker-manager.js',
  './duckdb-worker.js',
  './components/bdw-app.js',
  './components/bdw-file-drop.js',
  './components/bdw-schema-card.js',
  './components/bdw-stats-panel.js',
  './components/bdw-export-panel.js',
  './components/bdw-sql-console.js',
  '../global.css',
  '../components/otoolebox-header.js',
  '../components/otoolebox-footer.js',
  '../components/tool-hero.js'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('BDW: Service worker cache opened');
        return cache.addAll(urlsToCache.map(url => {
          return new Request(url, {cache: 'reload'});
        }));
      })
      .catch(error => {
        console.log('BDW: Service worker cache failed:', error);
      })
  );
});

self.addEventListener('fetch', function(event) {
  // Only handle GET requests for same-origin resources
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip node_modules and external resources - ALWAYS let them pass through
  if (event.request.url.includes('node_modules') || 
      event.request.url.includes('chrome-extension') ||
      event.request.url.includes('extensions.duckdb.org') ||
      event.request.url.includes('.wasm') ||
      event.request.url.includes('.mjs')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        
        return fetch(event.request).then(function(response) {
          // Don't cache if not a valid response
          if(!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response as it can only be consumed once
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      }
    )
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('BDW: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});