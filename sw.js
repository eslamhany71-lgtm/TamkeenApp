const CACHE_NAME = 'aldokan-erp-cache-v7'; // التحديث الصاروخي

// 🔴 الملفات الأساسية للنظام 🔴
const ASSETS_TO_CACHE = [
    '/', '/index.html', '/activate.html', '/dashboard.html', 
    '/patients.html', '/patient-profile.html', '/session-details.html', 
    '/finances.html', '/calendar.html', '/settings.html', 
    '/super-admin.html', '/404.html', '/home.html', '/inventory.html',
    
    '/assets/logo.png',
    
    '/css/style.css', '/css/home.css', '/css/dashboard.css', 
    '/css/patients.css', '/css/patient-profile.css', '/css/finances.css', 
    '/css/calendar.css', '/css/settings.css', '/css/super-admin.css', 
    '/css/dental-chart.css', '/css/inventory.css',
    
    '/js/firebase-config.js', '/js/auth.js', '/js/lang-manager.js', 
    '/js/home.js', '/js/dashboard.js', '/js/patients.js', 
    '/js/patient-profile.js', '/js/session-details.js', '/js/finances.js', 
    '/js/calendar.js', '/js/settings.js', '/js/super-admin.js', 
    '/js/dental-chart.js', '/js/inventory.js', '/js/backup.js'
];

self.addEventListener('install', (event) => {
    self.skipWaiting(); 
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            console.log('✅ جاري تخزين الملفات للتسريع المباشر...');
            for (let asset of ASSETS_TO_CACHE) {
                try { await cache.add(new Request(asset, { cache: 'reload' })); } 
                catch (err) {}
            }
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => { if (key !== CACHE_NAME) return caches.delete(key); })
        ))
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (!event.request.url.startsWith('http')) return;

    // تجاهل استعلامات الداتابيز عشان متتكيش والبيانات تفضل حية
    if (event.request.url.includes('firestore.googleapis.com') || 
        event.request.url.includes('firebasestorage.googleapis.com') ||
        event.request.url.includes('identitytoolkit.googleapis.com')) {
        return;
    }

    if (event.request.method === 'GET') {
        event.respondWith(
            caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
                
                // 🔴 السحر هنا: تحميل التحديث في الخلفية بدون تعطيل الشاشة 🔴
                const fetchPromise = fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request.url.split('?')[0], networkResponse.clone());
                        });
                    }
                    return networkResponse;
                }).catch(() => { /* تجاهل أخطاء النت في الخلفية */ });

                // 🔴 إرجاع الصفحة من الكاش فوراً (في 0.01 ثانية) لو موجودة، ولو مش موجودة استنى النت 🔴
                return cachedResponse || fetchPromise;
            })
        );
    }
});
