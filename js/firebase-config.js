// firebase-config.js - التهيئة النظيفة + الاستعادة الذكية وحارس الاشتراكات

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

// تفعيل الكاش (السرعة الصاروخية) فقط داخل النظام
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

// =======================================================
// 🔴 حارس الاشتراكات السحابي واستعادة الصلاحيات 🔴
// =======================================================
if (!isLoginScreen) {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            let clinicId = sessionStorage.getItem('clinicId');
            let userRole = sessionStorage.getItem('userRole');

            // 🔴 الحل السحري لمشكلة اختفاء صلاحية السوبر أدمن (لو المتصفح مسحها) 🔴
            if (!userRole) {
                try {
                    const userDoc = await firebase.firestore().collection("Users").doc(user.email).get();
                    if (userDoc.exists) {
                        const data = userDoc.data();
                        userRole = data.role;
                        clinicId = data.clinicId || 'default';
                        
                        sessionStorage.setItem('userRole', userRole);
                        sessionStorage.setItem('clinicId', clinicId);
                        sessionStorage.setItem('empCode', data.empCode || user.email);
                        
                        // نعمل ريفريش سريع عشان قوائم السوبر أدمن تظهر تاني
                        window.location.reload();
                        return; 
                    }
                } catch (e) { console.error("Error restoring session:", e); }
            }

            // 🔴 حارس الاشتراك (يُطبق على العيادات فقط، السوبر أدمن مش بيتقفل عليه) 🔴
            if (clinicId && clinicId !== 'default' && userRole !== 'superadmin') {
                firebase.firestore().collection("Clinics").doc(clinicId).onSnapshot((doc) => {
                    if (doc.exists) {
                        const clinicData = doc.data();
                        const nextPaymentDate = clinicData.nextPaymentDate ? clinicData.nextPaymentDate.toDate() : null;
                        const now = new Date();

                        // لو الاشتراك خلص يتم إظهار شاشة الحظر
                        if (clinicData.status === 'suspended' || (nextPaymentDate && now > nextPaymentDate)) {
                            showPaywallBlocker();
                        } else {
                            hidePaywallBlocker();
                        }
                    }
                });
            }
        }
    });
}

// دالة إظهار شاشة الحظر الإجبارية للعيادة
function showPaywallBlocker() {
    let blocker = document.getElementById('paywall-blocker');
    if (!blocker) {
        blocker = document.createElement('div');
        blocker.id = 'paywall-blocker';
        blocker.style.cssText = "position: fixed; inset: 0; background: rgba(15, 23, 42, 0.95); z-index: 999999; display: flex; flex-direction: column; align-items: center; justify-content: center; backdrop-filter: blur(10px); color: white; text-align: center; direction: rtl; padding: 20px;";
        
        blocker.innerHTML = `
            <div style="background: white; color: #0f172a; padding: 40px; border-radius: 20px; max-width: 500px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
                <div style="font-size: 50px; margin-bottom: 15px;">⚠️</div>
                <h2 style="margin: 0 0 15px 0; font-size: 24px; color: #dc2626; font-weight: 900;">تم إيقاف النظام</h2>
                <p style="margin: 0 0 25px 0; color: #475569; line-height: 1.6; font-size: 16px;">
                    عفواً، لقد انتهت فترة اشتراكك في نظام NivaDent أو تم إيقاف الحساب. برجاء التواصل مع الدعم الفني لتجديد الباقة واستعادة الوصول للنظام.
                </p>
                <button onclick="firebase.auth().signOut().then(() => { sessionStorage.clear(); window.location.href = 'index.html'; })" style="background: #dc2626; color: white; border: none; padding: 15px; width: 100%; border-radius: 10px; font-size: 16px; font-weight: bold; cursor: pointer;">
                    تسجيل الخروج
                </button>
            </div>
        `;
        document.body.appendChild(blocker);
    }
}

function hidePaywallBlocker() {
    const blocker = document.getElementById('paywall-blocker');
    if (blocker) blocker.remove();
}
