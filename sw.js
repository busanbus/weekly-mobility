const CACHE_NAME = 'weekly-mobility-cache-v2';
// 오프라인 지원을 위해 캐싱할 파일 목록
const FILES_TO_CACHE = [
    './',
    './index.html',
    './style/style.css', // 👈 이 부분을 수정했습니다!
    './images/logo.png',
    './images/logo.svg',
    './components/main-nav.js',
    './components/footer.js',
    './components/floating-sns.js'
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
  // 즉시 대기 상태 건너뛰고 새 SW 활성화 시도
  self.skipWaiting();
});

// 오래된 캐시 정리 및 즉시 컨트롤 권한 획득
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

// 네트워크 요청 감지 시
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // 비-GET은 그대로 네트워크

  const url = new URL(req.url);
  const accept = req.headers.get('accept') || '';

  // 1) HTML 문서(페이지)는 네트워크 우선
  const isHtmlRequest = req.mode === 'navigate' || accept.includes('text/html');
  const isAppAsset = /\.(js|css|json)$/i.test(url.pathname);

  if (isHtmlRequest || isAppAsset) {
    event.respondWith(
      (async () => {
        try {
          const networkResp = await fetch(req, { cache: 'no-store' });
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, networkResp.clone());
          return networkResp;
        } catch (err) {
          const cached = await caches.match(req);
          return cached || caches.match('./index.html');
        }
      })()
    );
    return;
  }

  // 2) 나머지 정적 리소스는 캐시 우선 + 네트워크 갱신
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      const fetchPromise = fetch(req).then(async (networkResp) => {
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, networkResp.clone());
        return networkResp;
      }).catch(() => undefined);
      return cached || fetchPromise;
    })()
  );
});