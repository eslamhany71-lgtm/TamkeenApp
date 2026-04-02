const CACHE_NAME = 'aldokan-erp-cache-v5'; // التحديث الأخير

// 🔴 خريطة ملفات السيستم (المحلية + الخارجية اللي السيستم بيعتمد عليها) 🔴
const ASSETS_TO_CACHE = [
    // الملفات المحلية
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
    
    // الصور
    '/assets/logo.png',
    
    // ملفات التصميم
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
    
    // ملفات السكريبت المحلية
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
    '/js/backup.js',

    // 🔴 المكتبات والروابط الخارجية الأساسية 🔴
    'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap', // الخطوط
    'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.8/index.global.min.js', // مكتبة التقويم
    'https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js', // مكتبة التصدير لإكسيل
    'https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/9.0.0/firebase-auth-compat.js',
    'https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore-compat.js',
    'https://www.gstatic.com/firebasejs/9.0.0/firebase-storage-compat.js' // مكتبة رفع الصور اللي كانت ناقصة
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('✅ جاري تخزين جميع ملفات النظام الشاملة للعمل أوفلاين...');
            return cache.addAll(ASSETS_TO_CACHE).catch(err => {
                console.warn("⚠️ لم يتمكن من تحميل بعض الروابط الخارجية، سيستمر النظام بالعمل: ", err);
            });
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
    if (!event.request.url.startsWith('http')) return;

    // تجاهل اتصالات الفايربيز الحية عشان الكونسول ميتزحمش
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
                    // لو شغال، نحدث الكاش
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        const urlWithoutQuery = event.request.url.split('?')[0];
                        cache.put(urlWithoutQuery, responseToCache);
                    });
                    return networkResponse;
                })
                .catch(() => {
                    // 🔴 لو النت فاصل، جيب من الكاش بدون الـ (Version Tags) 🔴
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
