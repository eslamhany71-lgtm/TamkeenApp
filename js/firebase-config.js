// firebase-config.js - التهيئة النظيفة للـ SaaS (مع حلول الموبايل واللودر)

const firebaseConfig = {
  apiKey: "AIzaSyCFVu8FHYq2leGA1F9SQEAXmn1agv1V1cM",
  authDomain: "smartplatform-513c3.firebaseapp.com",
  projectId: "smartplatform-513c3",
  storageBucket: "smartplatform-513c3.firebasestorage.app",
  messagingSenderId: "906640049959",
  appId: "1:906640049959:web:c6c619a53ef4d6f9704b02"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const currentPath = window.location.pathname;
const isLoginScreen = currentPath.endsWith("index.html") || currentPath === "/" || currentPath.endsWith("activate.html");

if (!isLoginScreen) {
    firebase.firestore().enablePersistence({ synchronizeTabs: true })
      .catch((err) => {
          if (err.code == 'failed-precondition') console.warn("تحذير: عدة تابات مفتوحة، تم تفعيل المزامنة.");
          else if (err.code == 'unimplemented') console.warn("المتصفح لا يدعم التخزين المحلي.");
      });
}

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
        badge.innerHTML = '⚠️ انقطع الاتصال بالإنترنت. جاري العمل أوفلاين...';
        badge.style.display = 'block';
    });

    window.addEventListener('online', () => {
        const badge = document.getElementById('offline-badge');
        badge.style.background = '#10b981';
        badge.innerHTML = '✅ تم عودة الاتصال ومزامنة البيانات بنجاح!';
        badge.style.display = 'block';
        setTimeout(() => { badge.style.display = 'none'; }, 4000);
    });
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW failed: ', err));
    });
}

// =========================================================================
// 🌟 اللودر العالمي + إصلاح الـ Scroll الإجباري للموديلات (Mobile Fix) 🌟
// =========================================================================
function createGlobalLoaderAndFixes() {
    const targetWindow = window.top || window;
    const targetDoc = targetWindow.document;

    if (!targetDoc.getElementById('global-erp-styles-and-loader')) {
        const style = targetDoc.createElement('style');
        style.id = 'global-erp-styles-and-loader';
        style.innerHTML = `
            /* 🔴 حل سحري لجميع الموديلات عشان تعمل Scroll لو الشاشة صغيرة 🔴 */
            .modal {
                padding: 15px !important;
                align-items: center !important;
                overflow-y: auto !important; /* السماح بالسحب الخارجي */
            }
            .modal-content {
                max-height: 85vh !important; /* لا تتخطى 85% من طول الشاشة */
                overflow-y: auto !important; /* تفعيل السحب الداخلي (Scroll) */
                margin: auto !important;
            }
            /* تعديل شكل شريط السحب عشان يبقى شيك */
            .modal-content::-webkit-scrollbar { width: 6px; }
            .modal-content::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
            .modal-content::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

            /* 🌟 ستايل اللودر 🌟 */
            #global-erp-loader {
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
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
    }

    let failsafeTimer;

    targetWindow.executeShowLoader = function(msg = "جاري التحميل...") {
        const l = targetDoc.getElementById('global-erp-loader');
        const m = targetDoc.getElementById('global-loader-msg');
        if (l) { 
            if(m) m.innerText = msg; 
            l.classList.add('active'); 
            
            clearTimeout(failsafeTimer);
            failsafeTimer = setTimeout(() => {
                l.classList.remove('active');
            }, 8000); // 8 ثواني كحد أقصى للودر
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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createGlobalLoaderAndFixes);
} else {
    createGlobalLoaderAndFixes();
}

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
