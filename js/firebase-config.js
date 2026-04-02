// firebase-config.js - التهيئة النظيفة 

const firebaseConfig = {
  apiKey: "AIzaSyCFVu8FHYq2leGA1F9SQEAXmn1agv1V1cM",
  authDomain: "smartplatform-513c3.firebaseapp.com",
  projectId: "smartplatform-513c3",
  storageBucket: "smartplatform-513c3.firebasestorage.app",
  messagingSenderId: "906640049959",
  appId: "1:906640049959:web:c6c619a53ef4d6f9704b02"
};

// التأكد من عدم تهيئة الفايربيز مرتين
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// 🚀 فحص مسار الصفحة الحالية
const currentPath = window.location.pathname;
const isLoginScreen = currentPath.endsWith("index.html") || currentPath === "/" || currentPath.endsWith("activate.html");

// تفعيل الكاش (السرعة الصاروخية ووضع الأوفلاين) فقط داخل النظام
if (!isLoginScreen) {
    firebase.firestore().enablePersistence({ synchronizeTabs: true })
      .catch((err) => {
          if (err.code == 'failed-precondition') {
              console.warn("تحذير: عدة تابات مفتوحة، تم تفعيل المزامنة.");
          } else if (err.code == 'unimplemented') {
              console.warn("المتصفح لا يدعم التخزين المحلي.");
          }
      });
}

// =========================================================================
// 🔴 إضافة ميزة عالمية للسيستم: إغلاق أي مودال بزرار (Esc) في الكيبورد 🔴
// =========================================================================
document.addEventListener('keydown', function(event) {
    if (event.key === "Escape" || event.keyCode === 27) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (modal.style.display === 'flex' || modal.style.display === 'block') {
                modal.style.display = 'none';
            }
        });
    }
});

// =========================================================================
// 🔴 رادار الاتصال بالإنترنت (Offline/Online Monitor) 🔴
// =========================================================================
window.addEventListener('load', () => {
    // إنشاء البادج (الإشعار) برمجياً عشان يشتغل في كل الصفحات بدون تعديل الـ HTML
    const networkBadge = document.createElement('div');
    networkBadge.id = 'offline-badge';
    networkBadge.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: #ef4444;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-family: 'Tajawal', sans-serif;
        font-size: 14px;
        font-weight: bold;
        box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
        display: none;
        z-index: 99999;
        transition: all 0.3s ease;
        direction: rtl;
    `;
    document.body.appendChild(networkBadge);

    // لما النت يفصل
    window.addEventListener('offline', () => {
        const badge = document.getElementById('offline-badge');
        badge.style.background = '#ef4444'; // أحمر
        badge.innerHTML = '⚠️ انقطع الاتصال بالإنترنت. جاري حفظ البيانات محلياً...';
        badge.style.display = 'block';
    });

    // لما النت يرجع
    window.addEventListener('online', () => {
        const badge = document.getElementById('offline-badge');
        badge.style.background = '#10b981'; // أخضر
        badge.innerHTML = '✅ تم عودة الاتصال ومزامنة البيانات مع السيرفر بنجاح!';
        badge.style.display = 'block';
        
        // يخفي الإشعار بعد 4 ثواني
        setTimeout(() => {
            badge.style.display = 'none';
        }, 4000);
    });
});
