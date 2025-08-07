const CACHE_NAME = 'weekly-mobility-cache-v1';
// 오프라인 지원을 위해 캐싱할 파일 목록
const FILES_TO_CACHE = [
  '/weekly-mobility/',
  '/weekly-mobility/index.html',
  '/weekly-mobility/style/style.css',
  '/weekly-mobility/images/logo.png',
  '/weekly-mobility/images/logo.svg',
  '/weekly-mobility/components/main-nav.js',
  '/weekly-mobility/components/footer.js',
  '/weekly-mobility/components/floating-sns.js'
  // 필요에 따라 다른 주요 파일들을 추가할 수 있습니다.
];

// 서비스 워커 설치 시
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching app shell');
      return cache.addAll(FILES_TO_CACHE);
    })
  );
});

// 네트워크 요청 감지 시
self.addEventListener('fetch', (event) => {
  event.respondWith(
    // 캐시에서 먼저 찾아보고, 없으면 네트워크로 요청
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});