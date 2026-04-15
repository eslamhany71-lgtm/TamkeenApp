const CACHE_NAME = 'aldokan-erp-cache-v6'; // تحديث الإصدار لفرض مسح الكاش القديم المضروب

// 🔴 الملفات المحلية فقط (أضمن وأسرع) 🔴
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/activate.html',
    '/dashboard.html',
    '/patients.html',
    '/patient-profile.html',
    '/session-details.html',
    '/finances.html',
    '/calendar.html',
    '/settings.html',
    '/super-admin.html',
    '/404.html',
    '/home.html',
    '/inventory.html',
    
    '/assets/logo.png',
    
    '/css/style.css',
    '/css/home.css',
    '/css/dashboard.css',
    '/css/patients.css',
    '/css/patient-profile.css',
    '/css/finances.css',
    '/css/calendar.css',
    '/css/settings.css',
    '/css/super-admin.css',
    '/css/dental-chart.css',
    '/css/inventory.css',
    
    '/js/firebase-config.js',
    '/js/auth.js',
    '/js/lang-manager.js',
    '/js/home.js',
    '/js/dashboard.js',
    '/js/patients.js',
    '/js/patient-profile.js',
    '/js/session-details.js',
    '/js/finances.js',
    '/js/calendar.js',
    '/js/settings.js',
    '/js/super-admin.js',
    '/js/dental-chart.js',
    '/js/inventory.js',
    '/js/backup.js' // 🔴 رجع لمكانه الطبيعي عشان النسخ الاحتياطي 🔴
];

self.addEventListener('install', (event) => {
    self.skipWaiting(); 
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            console.log('✅ جاري تخزين الملفات الأساسية للنظام...');
            
            // 🔴 التحميل المرن (Fault-Tolerant Caching) 🔴
            // لو ملف واحد باظ، الباقي يكمل عادي
            for (let asset of ASSETS_TO_CACHE) {
                try {
                    const req = new Request(asset, { cache: 'reload' });
                    await cache.add(req);
                } catch (err) {
                    console.warn(`⚠️ لم يتم تخزين هذا الملف (قد يكون غير موجود): ${asset}`);
                }
            }
            console.log('🚀 تم إنهاء عملية التخزين المبدئي بنجاح!');
        })
    );
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
    // تجاهل الروابط الغريبة أو طلبات الكروم الداخلية
    if (!event.request.url.startsWith('http')) return;

    // 🔴 تجاهل الفايربيز نهائياً من الـ SW عشان ميعملش 503 🔴
    if (event.request.url.includes('firestore.googleapis.com') || 
        event.request.url.includes('firebasestorage.googleapis.com') ||
        event.request.url.includes('identitytoolkit.googleapis.com') ||
        event.request.url.includes('google-analytics.com') ||
        event.request.url.includes('cleardot.gif')) {
        return;
    }

    if (event.request.method === 'GET') {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    // التخزين الديناميكي (Dynamic Caching) لأي حاجة جديدة أو الروابط الخارجية
                    if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic' || networkResponse.type === 'cors') {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            // تجاهل الـ Query Strings زي ?v=123 عشان الكاش ميتمليش نسخ مكررة
                            const urlWithoutQuery = event.request.url.split('?')[0];
                            cache.put(urlWithoutQuery, responseToCache);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // 🔴 لو النت فاصل، نجيب من الكاش بس نتجاهل الـ ?v= تماماً 🔴
                    return caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        
                        // لو الملف مش موجود خالص في الكاش
                        return new Response("عفواً، يبدو أنك تعمل أوفلاين ولم يسبق تحميل هذه الصفحة.", {
                            status: 503,
                            headers: new Headers({ 'Content-Type': 'text/html; charset=utf-8' })
                        });
                    });
                })
        );
    }
});
