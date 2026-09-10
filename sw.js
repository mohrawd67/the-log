const CACHE_NAME = "the-log-v3";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./the%20log%20icon.png",
  "./the%20log%20intro.mp4",
  "./THE%20LOG%201.css",
  "./THE%20LOG%202.css",
  "./THE%20LOG%203.css",
  "./THE%20LOG%204.css",
  "./THE%20LOG%205.css",
  "./THE%20LOG%206.js",
  "./THE%20LOG%207.js",
  "./THE%20LOG%208.js",
  "./THE%20LOG%209.js",
  "./THE%20LOG%2010.js",
  "./THE%20LOG%2011.js",
  "./THE%20LOH%2014.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      return response;
    }))
  );
});
