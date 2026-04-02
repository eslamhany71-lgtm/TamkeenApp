const CACHE_NAME = 'aldokan-erp-cache-v4'; // غيرنا الإصدار لـ 4 عشان يجبر المتصفح يحمل اللستة الجديدة دي كلها

// 🔴 خريطة ملفات السيستم بالكامل (App Shell) 🔴
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/activate.html',
    '/dashboard.html',
    '/patients.html',
    '/patient-profile.html',
    '/sessions.html',
    '/session-details.html',
    '/finances.html',
    '/calendar.html',
    '/settings.html',
    '/super-admin.html',
    '/404.html',
    
    // فولدر الصور
    '/assets/logo.png',
    
    // فولدر الـ CSS
    '/css/style.css',
    '/css/home.css',
    '/css/dashboard.css',
    '/css/patients.css',
    '/css/patient-profile.css',
    '/css/sessions.css',
    '/css/finances.css',
    '/css/calendar.css',
    '/css/settings.css',
    '/css/super-admin.css',
    
    // فولدر الـ JS
    '/js/firebase-config.js',
    '/js/auth.js',
    '/js/lang-manager.js',
    '/js/home.js',
    '/js/dashboard.js',
    '/js/patients.js',
    '/js/patient-profile.js',
    '/js/sessions.js',
    '/js/session-details.js',
    '/js/finances.js',
    '/js/calendar.js',
    '/js/settings.js',
    '/js/super-admin.js',
    '/js/backup.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('✅ جاري تخزين جميع ملفات النظام الشاملة للعمل أوفلاين...');
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
                        console.log('🧹 مسح الكاش القديم:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // 1. تأمين: تجاهل أي طلبات غير الـ HTTP/HTTPS
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
