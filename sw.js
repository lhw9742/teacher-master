const CACHE_NAME = 'teacher-master-v26.16';
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    'https://unpkg.com/react@18/umd/react.production.min.js',
    'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/lucide@latest',
    'https://fonts.googleapis.com/css2?family=Pretendard:wght@400;600;700;900&display=swap'
];

// 설치: 핵심 파일 캐시
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('캐시 저장 중...');
            // 외부 CDN은 실패해도 설치 계속 진행
            return cache.addAll(['./index.html', './manifest.json']).then(() => {
                return Promise.allSettled(
                    ['https://unpkg.com/react@18/umd/react.production.min.js',
                     'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
                     'https://cdn.tailwindcss.com',
                     'https://unpkg.com/lucide@latest'].map(url =>
                        cache.add(url).catch(() => console.log('CDN 캐시 실패(무시):', url))
                    )
                );
            });
        }).then(() => self.skipWaiting())
    );
});

// 활성화: 이전 캐시 정리
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => {
                        console.log('이전 캐시 삭제:', key);
                        return caches.delete(key);
                    })
            )
        ).then(() => self.clients.claim())
    );
});

// 요청 처리: 캐시 우선, 없으면 네트워크
self.addEventListener('fetch', event => {
    // POST 요청은 캐시 무시
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                // 유효한 응답만 캐시에 저장
                if (!response || response.status !== 200 || response.type === 'opaque') {
                    return response;
                }
                const toCache = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
                return response;
            }).catch(() => {
                // 오프라인 + 캐시 없음: index.html 반환
                if (event.request.destination === 'document') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
