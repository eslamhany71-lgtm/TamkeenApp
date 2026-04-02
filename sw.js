const CACHE_NAME = 'aldokan-erp-cache-v3'; 

const ASSETS_TO_CACHE = [
    '/',
    '/dashboard.html',
    '/patients.html',
    '/patient-profile.html',
    '/sessions.html',
    '/finances.html',
    '/super-admin.html',
    '/css/patients.css',
    '/css/patient-profile.css',
    '/css/sessions.css',
    '/css/finances.css',
    '/css/super-admin.css',
    '/js/firebase-config.js',
    '/js/patients.js',
    '/js/patient-profile.js',
    '/js/sessions.js',
    '/js/finances.js',
    '/js/super-admin.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('✅ جاري تخزين ملفات النظام للعمل أوفلاين...');
            return cache.addAll(ASSETS_TO_CACHE).catch(err => console.log("خطأ في الكاش (لا تقلق): ", err));
        })
    );
    self.skipWaiting(); 
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // 1. تأمين: تجاهل أي طلبات غير الـ HTTP/HTTPS (زي إضافات المتصفح)
    if (!event.request.url.startsWith('http')) return;

    // 2. تجاهل الفايربيز وصور التتبع عشان ميعملوش زحمة في الكونسول
    if (event.request.url.includes('firestore.googleapis.com') || 
        event.request.url.includes('firebasestorage.googleapis.com') ||
        event.request.url.includes('identitytoolkit.googleapis.com') ||
        event.request.url.includes('cleardot.gif')) {
        return;
    }

    if (event.request.method === 'GET') {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    // النت شغال: خد نسخة حديثة للكاش
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        // هنخزن الطلب الأصلي بدون الـ Query String عشان ميملاش الكاش ع الفاضي
                        const urlWithoutQuery = event.request.url.split('?')[0];
                        cache.put(urlWithoutQuery, responseToCache);
                    });
                    return networkResponse;
                })
                .catch(() => {
                    // 🔴 النت فاصل: هات من الكاش مع تجاهل أي ?v=12345 🔴
                    return caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        return new Response("عفواً، أنت تعمل في وضع الأوفلاين وهذه الصفحة غير متاحة.", {
                            status: 503,
                            headers: new Headers({ 'Content-Type': 'text/html; charset=utf-8' })
                        });
                    });
                })
        );
    }
});
