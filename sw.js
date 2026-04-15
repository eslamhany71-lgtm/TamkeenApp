const CACHE_NAME = 'aldokan-erp-cache-v9'; // تحديث الإصدار لقتل الكاش القديم

// 🔴 1. خريطة الملفات المحلية فقط (أضمن وأسرع) 🔴
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
    '/js/backup.js' // ملف الباك أب موجود أهو ومنور
];

// 🔴 2. مرحلة التثبيت: تحميل الملفات بمرونة 🔴
self.addEventListener('install', (event) => {
    self.skipWaiting(); // تفعيل التحديث فوراً
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            console.log('✅ جاري تخزين الملفات الأساسية لتسريع النظام...');
            // تحميل الملفات واحد ورا التاني، لو واحد فشل الباقي يكمل عادي جداً
            for (let asset of ASSETS_TO_CACHE) {
                try { 
                    await cache.add(new Request(asset, { cache: 'reload' })); 
                } catch (err) { 
                    console.warn('⚠️ تم تخطي الملف (قد يكون غير موجود):', asset); 
                }
            }
        })
    );
});

// 🔴 3. مرحلة التفعيل: مسح أي كاش قديم مضروب 🔴
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => { 
                if (key !== CACHE_NAME) {
                    console.log('🧹 مسح كاش قديم:', key);
                    return caches.delete(key); 
                } 
            })
        ))
    );
    self.clients.claim(); // السيطرة على كل الصفحات المفتوحة فوراً
});

// 🔴 4. مرحلة جلب البيانات (السرعة الصاروخية) 🔴
self.addEventListener('fetch', (event) => {
    // تجاهل أي رابط مش http (زي إضافات المتصفح)
    if (!event.request.url.startsWith('http')) return;

    // 🔴 فلتر الأمان: تجاهل الروابط الخارجية (Firebase, Fonts, APIs) 🔴
    const requestUrl = new URL(event.request.url);
    if (requestUrl.origin !== self.location.origin) {
        return; // ده السطر السحري اللي بيمنع الـ 503 Errors
    }

    if (event.request.method === 'GET') {
        event.respondWith(
            // استراتيجية (Stale-While-Revalidate): اعرض من الكاش فوراً، وحدث في الخلفية
            caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
                
                const fetchPromise = fetch(event.request).then((networkResponse) => {
                    // لو النت شغال ورجع داتا سليمة، حدث الكاش عشان الزيارة الجاية
                    if (networkResponse && networkResponse.status === 200) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request.url.split('?')[0], responseToCache);
                        });
                    }
                    return networkResponse;
                }).catch(() => null); // لو النت فصل في الخلفية متعملش إيرور

                // إرجاع النسخة المحفوظة فوراً (في 0.01 ثانية)، ولو مش موجودة استنى النت
                return cachedResponse || fetchPromise.then(res => res || new Response(
                    "عفواً، لا يوجد اتصال بالإنترنت وهذه الصفحة لم يتم تحميلها مسبقاً.", 
                    { status: 503, headers: new Headers({ 'Content-Type': 'text/html; charset=utf-8' }) }
                ));
            })
        );
    }
});
