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

// تفعيل الكاش (السرعة الصاروخية) فقط داخل النظام، وإيقافه في شاشة الدخول لضمان سرعة الـ Login
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

// ======================================================================
// 🔴 الإضافة الجديدة: حارس الاشتراكات (مع حماية صارمة لصلاحيات السوبر أدمن) 🔴
// ======================================================================

if (!isLoginScreen) {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            let role = sessionStorage.getItem('userRole');
            let cId = sessionStorage.getItem('clinicId');

            // 1. لو المتصفح نسي الصلاحيات لأي سبب، نجيبها من الداتا بيز فوراً لحمايتك
            if (!role || !cId) {
                try {
                    const userDoc = await firebase.firestore().collection("Users").doc(user.email).get();
                    if (userDoc.exists) {
                        role = userDoc.data().role;
                        cId = userDoc.data().clinicId || 'default';
                        sessionStorage.setItem('userRole', role);
                        sessionStorage.setItem('clinicId', cId);
                    }
                } catch (e) {
                    console.error("Error fetching role:", e);
                }
            }

            // 2. الحماية الصارمة: لو إنت سوبر أدمن، وقف الكود ده تماماً واخرج!
            if (role === 'superadmin') {
                return; // لا حظر ولا تحذير يطبق على السوبر أدمن
            }

            // 3. تطبيق نظام الحظر والتحذير على العيادات فقط
            if (cId && cId !== 'default') {
                firebase.firestore().collection("Clinics").doc(cId).onSnapshot((doc) => {
                    if (doc.exists) {
                        const clinicData = doc.data();
                        const nextPaymentDate = clinicData.nextPaymentDate ? clinicData.nextPaymentDate.toDate() : null;
                        const now = new Date();

                        // حالة (1): الحظر الفوري (لو الحساب موقوف أو التاريخ عدى)
                        if (clinicData.status === 'suspended' || (nextPaymentDate && now > nextPaymentDate)) {
                            showPaywallBlocker();
                            hideSubscriptionWarning();
                        } 
                        // حالة (2): التحذير المبكر (لو لسه التاريخ معداش)
                        else if (nextPaymentDate) {
                            hidePaywallBlocker();
                            
                            const diffTime = nextPaymentDate - now;
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            
                            if (diffDays <= 3 && diffDays > 0) {
                                showSubscriptionWarning(diffDays);
                            } else {
                                hideSubscriptionWarning();
                            }
                        }
                    }
                });
            }
        }
    });
}

// ---------------------------------------------------------
// دوال واجهة المستخدم الخاصة بالحظر والتحذير
// ---------------------------------------------------------

function showPaywallBlocker() {
    let blocker = document.getElementById('paywall-blocker');
    if (!blocker) {
        blocker = document.createElement('div');
        blocker.id = 'paywall-blocker';
        blocker.style.cssText = "position: fixed; inset: 0; background: rgba(15, 23, 42, 0.98); z-index: 999999; display: flex; flex-direction: column; align-items: center; justify-content: center; backdrop-filter: blur(10px); color: white; text-align: center; direction: rtl; padding: 20px;";
        
        blocker.innerHTML = `
            <div style="background: white; color: #0f172a; padding: 40px; border-radius: 20px; max-width: 500px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
                <div style="font-size: 50px; margin-bottom: 15px;">⚠️</div>
                <h2 style="margin: 0 0 15px 0; font-size: 24px; color: #dc2626; font-weight: 900;">انتهت فترة الاشتراك</h2>
                <p style="margin: 0 0 25px 0; color: #475569; line-height: 1.6; font-size: 16px;">
                    عفواً، لقد انتهت فترة اشتراك عيادتك في النظام. برجاء التواصل مع الدعم الفني لتجديد الباقة لاستعادة الوصول لبياناتك.
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

function showSubscriptionWarning(daysRemaining) {
    let warning = document.getElementById('sub-warning-banner');
    if (!warning) {
        warning = document.createElement('div');
        warning.id = 'sub-warning-banner';
        warning.style.cssText = "position: fixed; top: 0; left: 0; right: 0; background: #f59e0b; color: white; text-align: center; padding: 12px; font-weight: bold; z-index: 999998; direction: rtl; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);";
        
        document.body.style.paddingTop = "45px"; 
        document.body.appendChild(warning);
    }

    let timeText = daysRemaining === 1 ? "غداً" : (daysRemaining === 2 ? "بعد غدٍ" : `خلال ${daysRemaining} أيام`);
    
    warning.innerHTML = `
        <span>⏳ تنبيه هام: اشتراك العيادة سينتهي <strong>${timeText}</strong>. برجاء التجديد لضمان استمرار الخدمة.</span>
    `;
}

function hideSubscriptionWarning() {
    const warning = document.getElementById('sub-warning-banner');
    if (warning) {
        warning.remove();
        document.body.style.paddingTop = "0"; 
    }
}
