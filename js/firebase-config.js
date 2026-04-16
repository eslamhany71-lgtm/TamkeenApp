// firebase-config.js - التهيئة النظيفة للـ SaaS (باللودر المضاد للتعليق + إصلاحات الموبايل)

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
const currentPath = window.location.pathname.toLowerCase();
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

// إغلاق المودال بـ Escape
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

// رادار الاتصال بالإنترنت
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

// تفعيل الـ Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => { console.log('✅ ServiceWorker registration successful'); })
            .catch(err => { console.log('❌ ServiceWorker registration failed: ', err); });
    });
}

// =========================================================================
// 🌟 اللودر العالمي المُحصن + حل مشكلة السكرول وزراير المودال للموبايل 🌟
// =========================================================================
function createGlobalLoader() {
    const targetWindow = window.top || window;
    const targetDoc = targetWindow.document;

    if (targetDoc.getElementById('global-erp-loader')) return;

    const style = targetDoc.createElement('style');
    style.innerHTML = `
        /* 🔴 1. حلول السحب (Scroll) والزراير المخفية في الموبايل 🔴 */
        .modal {
            align-items: flex-start !important; /* يمنع قص المودال من فوق وتحت */
            padding: 20px 10px !important; /* مسافة آمنة من حواف الشاشة */
            overflow-y: auto !important; /* تفعيل السحب الإجباري */
            -webkit-overflow-scrolling: touch !important; /* سحب ناعم جداً للايفون والاندرويد */
        }
        .modal-content {
            margin: auto !important; /* يتوسط الشاشة لو صغير */
            max-height: calc(100vh - 40px) !important; /* أقصى طول عشان مايخرجش بره الشاشة */
            overflow-y: auto !important; /* سكرول داخلي */
            padding-bottom: 30px !important; /* مساحة إضافية تحت عشان الزراير تبان دايماً */
            overscroll-behavior: contain !important; /* يمنع تهييس المتصفح مع السحب */
        }
        /* تجميل شريط السحب */
        .modal-content::-webkit-scrollbar { width: 6px; }
        .modal-content::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 8px; }
        .modal-content::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }

        /* 🔴 2. ستايل اللودر 🔴 */
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

    let failsafeTimer; 

    // دوال التشغيل مع الحماية
    targetWindow.executeShowLoader = function(msg = "جاري التحميل...") {
        const l = targetDoc.getElementById('global-erp-loader');
        const m = targetDoc.getElementById('global-loader-msg');
        if (l) { 
            if(m) m.innerText = msg; 
            l.classList.add('active'); 
            
            // 🔴 التدمير الذاتي: لو إحنا مش في شاشة الدخول واللودر علق، يختفي إجباري بعد 1.2 ثانية
            clearTimeout(failsafeTimer);
            if (!isLoginScreen) {
                failsafeTimer = setTimeout(() => {
                    l.classList.remove('active');
                    console.warn("تم إخفاء اللودر إجبارياً لحماية النظام من التعليق.");
                }, 1200); 
            }
        }
    };

    targetWindow.executeHideLoader = function() {
        const l = targetDoc.getElementById('global-erp-loader');
        if (l) {
            l.classList.remove('active');
            clearTimeout(failsafeTimer);
        }
    };
}

// تنفيذ الحقن فوراً
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createGlobalLoader);
} else {
    createGlobalLoader();
}

// دوال الاستدعاء المباشرة
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

// =======================================================
// 🔴 كود أيقونة المتصفح (Global Favicon) 🔴
// =======================================================
(function setGlobalFavicon() {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
    }
    link.href = 'data:image/svg+xml;utf8,<svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" rx="20" fill="%23E0F2FE"/><path d="M30 40C30 28.9543 38.9543 20 50 20C61.0457 20 70 28.9543 70 40V60C70 65.5228 65.5228 70 60 70C54.4772 70 50 65.5228 50 60C50 65.5228 45.5228 70 40 70C34.4772 70 30 65.5228 30 60V40Z" fill="%230284C7"/><path d="M50 20C38.9543 20 30 28.9543 30 40V60C30 65.5228 34.4772 70 40 70C45.5228 70 50 65.5228 50 60V20Z" fill="%230EA5E9"/><circle cx="50" cy="50" r="8" fill="%23FFFFFF"/></svg>';
})();

// =====================================================================
// 🔴 سحر الوضع الليلي (Universal Dark Mode Injector) 🔴
// =====================================================================

function applyGlobalDarkMode() {
    const theme = localStorage.getItem('niva_theme') || 'light';
    
    // 🔴 التعديل الجراحي: توحيد المنطق بتطبيق الثيم على الـ body والـ html معاً لقتل أي تعارض 🔴
    document.body.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    
    if (theme === 'dark' && !document.getElementById('global-dark-css')) {
        const style = document.createElement('style');
        style.id = 'global-dark-css';
        style.innerHTML = `
            [data-theme="dark"] body, body[data-theme="dark"], body[data-theme="dark"] .main-content { background-color: #0f172a !important; color: #f8fafc !important; }
            body[data-theme="dark"] .page-header { background: transparent !important; }
            body[data-theme="dark"] #txt-title, body[data-theme="dark"] h1, body[data-theme="dark"] h2, body[data-theme="dark"] h3 { color: #f8fafc !important; }
            body[data-theme="dark"] #txt-subtitle, body[data-theme="dark"] p { color: #94a3b8 !important; }

            /* الجداول */
            body[data-theme="dark"] .table-container { background: #1e293b !important; border: 1px solid #334155 !important; box-shadow: none !important; }
            body[data-theme="dark"] table th { background: #0f172a !important; color: #cbd5e1 !important; border-bottom: 1px solid #334155 !important; }
            body[data-theme="dark"] table td { color: #f8fafc !important; border-bottom: 1px solid #334155 !important; }
            body[data-theme="dark"] table tr:hover td { background-color: #334155 !important; }
            body[data-theme="dark"] .clickable-row:hover td { background-color: #334155 !important; }

            /* الموديل (النوافذ المنبثقة) */
            body[data-theme="dark"] .modal-content { background: #1e293b !important; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.9) !important; }
            body[data-theme="dark"] .modal-content h2, body[data-theme="dark"] .modal-content h3 { border-color: #334155 !important; }
            body[data-theme="dark"] .close-modal { color: #94a3b8 !important; }
            body[data-theme="dark"] .close-modal:hover { color: #ef4444 !important; }
            body[data-theme="dark"] .details-box, body[data-theme="dark"] .finance-box-modal, body[data-theme="dark"] .session-summary { background: #0f172a !important; border: 1px solid #334155 !important; }
            body[data-theme="dark"] .details-box p strong, body[data-theme="dark"] .finance-box-modal label { color: #cbd5e1 !important; }
            body[data-theme="dark"] .details-box span { color: #f8fafc !important; }

            /* الحقول (Inputs & Selects) */
            body[data-theme="dark"] input:not([type="checkbox"]), body[data-theme="dark"] select, body[data-theme="dark"] textarea, body[data-theme="dark"] .search-box {
                background-color: #0f172a !important; color: #f8fafc !important; border: 1px solid #475569 !important;
            }
            body[data-theme="dark"] input[readonly] { background-color: #1e293b !important; color: #ef4444 !important; border-color: #334155 !important; }
            body[data-theme="dark"] input:focus, body[data-theme="dark"] select:focus, body[data-theme="dark"] textarea:focus {
                border-color: #38bdf8 !important; box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.1) !important;
            }
            body[data-theme="dark"] label { color: #cbd5e1 !important; }

            /* الكروت (KPIs, Dashboard & Settings) */
            body[data-theme="dark"] .kpi-card, body[data-theme="dark"] .settings-card { background: #1e293b !important; border-color: #334155 !important; box-shadow: none !important; }
            body[data-theme="dark"] .kpi-info h4 { color: #94a3b8 !important; }
            body[data-theme="dark"] .kpi-info h2 { color: #f8fafc !important; }
            body[data-theme="dark"] .chart-container { background: #1e293b !important; border-color: #334155 !important; box-shadow: none !important; }

            /* التقويم (Calendar) */
            body[data-theme="dark"] .fc { color: #f8fafc !important; }
            body[data-theme="dark"] .fc-theme-standard td, body[data-theme="dark"] .fc-theme-standard th { border-color: #334155 !important; }
            body[data-theme="dark"] .fc-theme-standard .fc-scrollgrid { border-color: #334155 !important; }
            body[data-theme="dark"] .fc-col-header-cell { background-color: #0f172a !important; }
            body[data-theme="dark"] .fc-daygrid-day { background-color: #1e293b !important; }
            body[data-theme="dark"] .fc-day-today { background-color: #334155 !important; }
            body[data-theme="dark"] .fc-list-day-cushion { background-color: #334155 !important; color: #f8fafc !important; }
            body[data-theme="dark"] .fc-list-event:hover td { background-color: #475569 !important; }
            body[data-theme="dark"] .fc-list-event-title { color: #f8fafc !important; }
            body[data-theme="dark"] .fc-timegrid-slot-label-cushion { color: #94a3b8 !important; }

            /* حالات فارغة وعناصر إضافية */
            body[data-theme="dark"] .empty-state { background: #0f172a !important; border-color: #334155 !important; color: #94a3b8 !important; }
            body[data-theme="dark"] .drug-list-item { background: #0f172a !important; border-color: #334155 !important; }
            body[data-theme="dark"] .search-results { background: #1e293b !important; border-color: #334155 !important; }
            body[data-theme="dark"] .search-item { border-color: #334155 !important; }
            body[data-theme="dark"] .search-item:hover { background: #334155 !important; }
            body[data-theme="dark"] .search-item strong { color: #f8fafc !important; }
        `;
        document.head.appendChild(style);
    } else if (theme === 'light') {
        const darkStyle = document.getElementById('global-dark-css');
        if (darkStyle) darkStyle.remove();
    }
}

// تشغيل الدالة فوراً
applyGlobalDarkMode(); 

// استقبال أمر التغيير من الواجهة الرئيسية
window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'THEME_CHANGE') {
        localStorage.setItem('niva_theme', event.data.theme);
        applyGlobalDarkMode();
    }
});
