const CACHE_NAME = 'aldokan-erp-cache-v1';

// هنستخدم استراتيجية (Network First, falling back to cache)
// يعني هيحاول يجيب أحدث نسخة من النت الأول، لو النت فاصل هيجيب من الكاش
self.addEventListener('fetch', (event) => {
    // استثناء طلبات الفايربيز (عشان الفايربيز بيهندل الأوفلاين بتاعه بنفسه)
    if (event.request.url.includes('firestore.googleapis.com') || 
        event.request.url.includes('firebasestorage.googleapis.com') ||
        event.request.url.includes('identitytoolkit.googleapis.com')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // لو النت شغال جاب الملف، نقوم مخزنين نسخة منه في الكاش للمستقبل
                return caches.open(CACHE_NAME).then((cache) => {
                    if (event.request.method === 'GET') {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                });
            })
            .catch(() => {
                // لو النت فاصل، ندور على الملف في الكاش ونعرضه
                return caches.match(event.request);
            })
    );
});
