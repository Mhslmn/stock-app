const CACHE_NAME = "asset-app-v1";
const STATIC_FILES = [
  "/",
  "/index.html",
  "/style.css",
  "/script.js",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];

// نصب اولیه
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_FILES);
    })
  );
});

// فعال‌سازی
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
});

// واکشی فایل‌های ثابت از کش، بقیه از شبکه
self.addEventListener("fetch", event => {
  if (STATIC_FILES.includes(new URL(event.request.url).pathname)) {
    event.respondWith(
      caches.match(event.request).then(res => res || fetch(event.request))
    );
  } else {
    // بقیه درخواست‌ها (مثل درخواست‌های به Back4App) از شبکه میان
    event.respondWith(fetch(event.request));
  }
});
