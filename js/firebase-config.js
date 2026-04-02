// firebase-config.js - التهيئة النظيفة للـ SaaS (النسخة الخارقة للـ iFrames)

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
    const networkBadge = document.createElement('div');
    networkBadge.id = 'offline-badge';
    networkBadge.style.cssText = `
        position: fixed; bottom: 20px; left: 20px; background: #ef4444; color: white;
        padding: 12px 20px; border-radius: 8px; font-family: 'Tajawal', sans-serif;
        font-size: 14px; font-weight: bold; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
        display: none; z-index: 99999; transition: all 0.3s ease; direction: rtl;
    `;
    document.body.appendChild(networkBadge);

    window.addEventListener('offline', () => {
        const badge = document.getElementById('offline-badge');
        badge.style.background = '#ef4444';
        badge.innerHTML = '⚠️ انقطع الاتصال بالإنترنت. جاري حفظ البيانات محلياً...';
        badge.style.display = 'block';
    });

    window.addEventListener('online', () => {
        const badge = document.getElementById('offline-badge');
        badge.style.background = '#10b981';
        badge.innerHTML = '✅ تم عودة الاتصال ومزامنة البيانات مع السيرفر بنجاح!';
        badge.style.display = 'block';
        setTimeout(() => { badge.style.display = 'none'; }, 4000);
    });
});

// =========================================================================
// 🔴 تفعيل الـ Service Worker لتشغيل السيستم بالكامل أوفلاين (PWA) 🔴
// =========================================================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => { console.log('✅ ServiceWorker registration successful'); })
            .catch(err => { console.log('❌ ServiceWorker registration failed: ', err); });
    });
}

// =========================================================================
// 🌟 اللودر العالمي (يُزرع في الشاشة الرئيسية Top Window لضمان تغطية السيستم) 🌟
// =========================================================================
function createGlobalLoader() {
    // استهداف الشاشة الأب (حتى لو إحنا جوه iFrame)
    const targetWindow = window.top || window;
    const targetDoc = targetWindow.document;

    // لو اللودر موجود أصلاً ميكرروش
    if (targetDoc.getElementById('global-erp-loader')) return;

    const style = targetDoc.createElement('style');
    style.innerHTML = `
        #global-erp-loader {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
            display: flex; flex-direction: column; justify-content: center; align-items: center;
            z-index: 99999999; opacity: 0; visibility: hidden; transition: opacity 0.3s ease, visibility 0.3s ease;
        }
        #global-erp-loader.active { opacity: 1; visibility: visible; }
        .loader-logo-container { position: relative; width: 100px; height: 100px; display: flex; justify-content: center; align-items: center; }
        .loader-spinner { position: absolute; width: 100%; height: 100%; border: 4px solid transparent; border-top: 4px solid #0284C7; border-right: 4px solid #38BDF8; border-radius: 50%; animation: spin 1s linear infinite; }
        .loader-logo { width: 60px; height: 60px; animation: pulse 1.5s ease-in-out infinite; }
        .loader-text { margin-top: 20px; font-family: 'Tajawal', sans-serif; font-weight: 700; color: #0F172A; font-size: 18px; letter-spacing: 0.5px; animation: pulse-text 1.5s ease-in-out infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes pulse { 0% { transform: scale(0.9); opacity: 0.8; } 50% { transform: scale(1.05); opacity: 1; filter: drop-shadow(0 0 10px rgba(2, 132, 199, 0.4)); } 100% { transform: scale(0.9); opacity: 0.8; } }
        @keyframes pulse-text { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
    `;
    targetDoc.head.appendChild(style);

    const loaderDiv = targetDoc.createElement('div');
    loaderDiv.id = 'global-erp-loader';
    loaderDiv.innerHTML = `
        <div class="loader-logo-container">
            <div class="loader-spinner"></div>
            <svg class="loader-logo" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="100" height="100" rx="20" fill="#E0F2FE"/>
                <path d="M30 40C30 28.9543 38.9543 20 50 20C61.0457 20 70 28.9543 70 40V60C70 65.5228 65.5228 70 60 70C54.4772 70 50 65.5228 50 60C50 65.5228 45.5228 70 40 70C34.4772 70 30 65.5228 30 60V40Z" fill="#0284C7"/>
                <path d="M50 20C38.9543 20 30 28.9543 30 40V60C30 65.5228 34.4772 70 40 70C45.5228 70 50 65.5228 50 60V20Z" fill="#0EA5E9"/>
                <circle cx="50" cy="50" r="8" fill="#FFFFFF"/>
            </svg>
        </div>
        <div class="loader-text" id="global-loader-msg">جاري التحميل...</div>
    `;
    targetDoc.body.appendChild(loaderDiv);

    // ربط دوال التشغيل بالشاشة الرئيسية
    targetWindow.executeShowLoader = function(msg = "جاري التحميل...") {
        const l = targetDoc.getElementById('global-erp-loader');
        const m = targetDoc.getElementById('global-loader-msg');
        if (l) { if(m) m.innerText = msg; l.classList.add('active'); }
    };

    targetWindow.executeHideLoader = function() {
        const l = targetDoc.getElementById('global-erp-loader');
        if (l) l.classList.remove('active');
    };
}

// تنفيذ الحقن فوراً
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createGlobalLoader);
} else {
    createGlobalLoader();
}

// 🔴 دوال الاستدعاء المباشرة من أي ملف JS (بتخترق الـ iFrame) 🔴
window.showLoader = function(msg) {
    if (window.top && window.top.executeShowLoader) {
        window.top.executeShowLoader(msg);
    }
};

window.hideLoader = function() {
    if (window.top && window.top.executeHideLoader) {
        window.top.executeHideLoader();
    }
};
