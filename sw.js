const CACHE_NAME = 'aldokan-erp-cache-v2'; // غيرنا الإصدار عشان يجبر المتصفح يحدثه

// 1. دي لستة بكل ملفات السيستم الأساسية (الـ App Shell) اللي لازم تنزل في الكاش أول ما السيستم يفتح
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

// حدث التثبيت (Install): أول ما يشتغل، يفتح الكاش ويحمل كل الملفات اللي فوق دي
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('✅ جاري تخزين ملفات النظام للعمل أوفلاين...');
            // بنحملهم، ولو في ملف مساره غلط بنطبع خطأ بس مش بنوقف السيستم
            return cache.addAll(ASSETS_TO_CACHE).catch(err => console.log("خطأ في تحميل بعض الملفات للكاش: ", err));
        })
    );
    self.skipWaiting(); // تفعيل فوري للنسخة الجديدة
});

// حدث التفعيل (Activate): بيمسح الكاش القديم لو عملنا تحديث للسيستم
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

// حدث الجلب (Fetch): لما المتصفح يطلب أي صفحة أو ملف
self.addEventListener('fetch', (event) => {
    // 1. تجاهل طلبات قاعدة البيانات (الفايربيز بيهندل الأوفلاين بتاعه لوحده)
    if (event.request.url.includes('firestore.googleapis.com') || 
        event.request.url.includes('firebasestorage.googleapis.com') ||
        event.request.url.includes('identitytoolkit.googleapis.com')) {
        return;
    }

    // 2. معالجة طلبات الصفحات والصور والسكريبتات (GET requests only)
    if (event.request.method === 'GET') {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    // لو النت شغال، نجيب الملف من النت ونحدث بيه الكاش عشان يبقى عندنا أحدث نسخة دايماً
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                    return networkResponse;
                })
                .catch(() => {
                    // لو النت فاصل (Catch Block)، ندور على الملف في الكاش
                    return caches.match(event.request).then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse; // لقيناه في الكاش، اعرضه فوراً
                        }
                        // لو ملقيناهوش خالص، بنرجع رد وهمي عشان نمنع إيرور (Failed to convert value to Response)
                        return new Response("عفواً، أنت تعمل في وضع عدم الاتصال (Offline) وهذه الصفحة لم يتم تحميلها مسبقاً.", {
                            status: 503,
                            statusText: "Service Unavailable",
                            headers: new Headers({ 'Content-Type': 'text/html; charset=utf-8' })
                        });
                    });
                })
        );
    }
});
