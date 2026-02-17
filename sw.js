/* K-MUDANG Service Worker v1.2 */
const CACHE_VERSION = 'kmudang-v1.2';
const STATIC_CACHE = 'kmudang-static-v1.2';

/* 핵심 정적 에셋 — 설치 시 즉시 캐시 */
const PRECACHE_ASSETS = [
  '/ko.html',
  '/en.html',
  '/jp.html',
  '/manifest.json',
  '/manifest-en.json',
  '/manifest-jp.json',
  '/ogimage.png',
  '/sharethumbnail.png',
  '/zodiacwheel.png',
  '/mainbg.jpg',
  '/rat.webp',
  '/ox.webp',
  '/tiger.webp',
  '/rabbit.webp',
  '/dragon.webp',
  '/snake.webp',
  '/horse.webp',
  '/sheep.webp',
  '/monkey.webp',
  '/rooster.webp',
  '/dog.webp',
  '/pig.webp'
];

/* ─── Install: 핵심 에셋 사전 캐시 ─── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        /* 실패해도 SW 설치는 계속 — 개별 파일 오류 무시 */
        return Promise.allSettled(
          PRECACHE_ASSETS.map(url =>
            cache.add(url).catch(() => { /* 404 무시 */ })
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

/* ─── Activate: 구 버전 캐시 삭제 ─── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

/* ─── Fetch 전략 ─── */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  /* 외부 도메인(CDN, 폰트, API) — 항상 네트워크 통과 */
  if (url.origin !== self.location.origin) {
    return;
  }

  /* HTML 파일 — Network First (최신 버전 우선, 실패 시 캐시) */
  if (url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  /* 정적 에셋(이미지/webp/json/css) — Cache First (캐시 미스 시 네트워크) */
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        /* 성공한 응답만 캐시 */
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        /* 오프라인 + 캐시 미스: 아무것도 없으면 그냥 실패 */
        return new Response('', { status: 503 });
      });
    })
  );
});
