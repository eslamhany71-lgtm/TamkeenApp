// js/home.js - NivaDent Master Shell (SaaS Routing, Dynamic Branding, Roles, Translations)

// 🚀 رقم إصدار ذكي: يتغير أوتوماتيكياً كل ساعة واحدة لضمان السرعة والتحديث معاً
const SMART_VERSION = Math.floor(Date.now() / 3600000); 

// 1. دالة التنقل بين الصفحات في الـ Iframe (تم تصليح مشكلة الـ ID 🛠️)
function loadPage(pageUrl, clickedLi) {
    let finalUrl = pageUrl.includes('?') 
        ? `${pageUrl}&v=${SMART_VERSION}` 
        : `${pageUrl}?v=${SMART_VERSION}`;

    document.getElementById('content-frame').src = finalUrl;
    
    if (clickedLi) {
        const allLinks = document.querySelectorAll('#nav-links li');
        allLinks.forEach(li => li.classList.remove('active'));
        clickedLi.classList.add('active');
    }

    if (window.innerWidth <= 992) {
        document.getElementById('sidebar').classList.remove('active');
        const overlay = document.getElementById('mobile-overlay');
        if(overlay) overlay.classList.remove('active');
    }
}

// 2. دالة تغيير لغة النظام
function switchAppLanguage(lang) {
    setLanguage(lang); 
    updatePageContent(lang); 
    const frame = document.getElementById('content-frame');
    if(frame.contentWindow) {
        frame.contentWindow.location.reload();
    }
}

// 3. الترجمة الخاصة بالهيكل الخارجي
function updatePageContent(lang) {
    const t = {
        ar: {
            header: "لوحة التحكم",
            navDash: "الداشبورد", navPatients: "المرضى والأشعة", navCalendar: "المواعيد والتقويم", 
            navSessions: "الجلسات والروشتات", navFinances: "الحسابات والمصروفات",
            navSettings: "إعدادات العيادة", navSuper: "إدارة النظام المركزية", logout: "تسجيل خروج",
            alertText: "⚠️ تنبيه هام: اشتراك العيادة سينتهي خلال {days} أيام. يرجى التواصل مع الإدارة للتجديد لتجنب إيقاف النظام.",
            alertToday: "⚠️ تنبيه هام: اشتراك العيادة ينتهي اليوم! يرجى التجديد فوراً لتجنب إيقاف النظام."
        },
        en: {
            header: "Dashboard",
            navDash: "Overview", navPatients: "Patients & X-Rays", navCalendar: "Calendar", 
            navSessions: "Sessions & Prescriptions", navFinances: "Finances",
            navSettings: "Clinic Settings", navSuper: "Super Admin", logout: "Logout",
            alertText: "⚠️ Important: Clinic subscription expires in {days} days. Please contact admin to renew and avoid suspension.",
            alertToday: "⚠️ Important: Clinic subscription expires TODAY! Please renew immediately to avoid suspension."
        }
    };
    const c = t[lang] || t.ar;
    const setTxt = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };

    setTxt('txt-header', c.header);
    setTxt('nav-dash', c.navDash); setTxt('nav-patients', c.navPatients); setTxt('nav-calendar', c.navCalendar); 
    setTxt('nav-sessions', c.navSessions); setTxt('nav-finances', c.navFinances);
    setTxt('nav-settings', c.navSettings); setTxt('nav-super', c.navSuper); setTxt('btn-logout', c.logout);
    
    window.homeLang = c;
}

// 4. مراقب الصلاحيات وجلب بيانات العيادة
firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
        document.getElementById('userEmail').innerText = user.email;

        // --- إضافة اللودر هنا ---
        if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري تهيئة النظام..." : "Initializing...");

        try {
            const userDoc = await db.collection("Users").doc(user.email).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                const role = userData.role || 'reception';
                const clinicId = userData.clinicId || sessionStorage.getItem('clinicId') || 'default';

                sessionStorage.setItem('clinicId', clinicId);

                applyRoles(role);
                loadClinicBranding(clinicId);
                
                // تشغيل فحص التنبيهات والاشتراكات للعيادة فقط
                if(role !== 'superadmin' && clinicId !== 'default') {
                    checkSubscriptionAlert(clinicId);
                }
            }
        } catch (error) {
            console.error("خطأ في جلب بيانات المستخدم:", error);
        } finally {
            // --- إخفاء اللودر هنا ---
            if (window.hideLoader) window.hideLoader();
        }
    } else {
        window.location.href = "index.html";
    }
});

// 5. دالة فحص التنبيهات والحظر الإجباري (Billing Alerts & Paywall)
async function checkSubscriptionAlert(clinicId) {
    try {
        // نستخدم onSnapshot عشان لو الادمن جددله وهو فاتح الشاشة تروح فوراً
        db.collection("Clinics").doc(clinicId).onSnapshot((clinicDoc) => {
            if (clinicDoc.exists) {
                const cData = clinicDoc.data();
                const now = new Date();
                
                // 1. لو الحساب موقوف من الأدمن
                if (cData.status === 'suspended') {
                    showPaywallBlocker();
                    return;
                }

                if (cData.nextPaymentDate) {
                    const nextPayDate = cData.nextPaymentDate.toDate();
                    
                    // 2. لو الاشتراك خلص (نظهر شاشة الحظر)
                    if (now > nextPayDate) {
                        showPaywallBlocker();
                    } 
                    // 3. لو لسه مخلصش (نخفي شاشة الحظر لو موجودة، ونشغل التحذير بتاعك لو قرب يخلص)
                    else {
                        hidePaywallBlocker();

                        const diffTime = nextPayDate - now;
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

                        if (diffDays >= 0 && diffDays <= 3) {
                            showBillingAlert(diffDays);
                        } else {
                            hideBillingAlert(); // إخفاء التحذير لو جدد لأكتر من 3 أيام
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error("خطأ في فحص الاشتراك:", error);
    }
}

// =============================================================
// 🔴 دوال إظهار شاشة الحظر الإجبارية (عند انتهاء الاشتراك) 🔴
// =============================================================
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
                    عفواً، لقد انتهت فترة اشتراك عيادتك في نظام NivaDent أو تم إيقاف الحساب. برجاء التواصل مع الدعم الفني لتجديد الباقة لاستعادة الوصول لبيانات العيادة.
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

// =============================================================
// دوال التحذير المبكر (بتاعتك كما هي)
// =============================================================
function showBillingAlert(daysLeft) {
    // منع تكرار التحذير لو موجود
    if(document.getElementById('billing-alert-banner')) return;

    const lang = localStorage.getItem('preferredLang') || 'ar';
    const t = window.homeLang || updatePageContent(lang); 
    
    let alertMsg = daysLeft === 0 ? window.homeLang.alertToday : window.homeLang.alertText.replace('{days}', daysLeft);

    const alertDiv = document.createElement('div');
    alertDiv.id = "billing-alert-banner";
    alertDiv.style.cssText = "background-color: #ef4444; color: white; text-align: center; padding: 10px; font-weight: bold; font-size: 14px; z-index: 9999; position: relative; width: 100%; box-shadow: 0 2px 4px rgba(0,0,0,0.2); animation: slideDown 0.3s ease-out;";
    alertDiv.innerHTML = `<span>${alertMsg}</span>`;

    document.body.insertBefore(alertDiv, document.body.firstChild);
}

function hideBillingAlert() {
    const alertDiv = document.getElementById('billing-alert-banner');
    if(alertDiv) alertDiv.remove();
}


// 6. دالة جلب لوجو واسم العيادة
async function loadClinicBranding(clinicId) {
    if (clinicId === 'default' || !clinicId) return; 

    try {
        const clinicDoc = await db.collection("Clinics").doc(clinicId).get();
        if (clinicDoc.exists) {
            const clinicData = clinicDoc.data();
            
            if (clinicData.clinicName) {
                const nameElement = document.getElementById('txt-clinic-name');
                if (nameElement) nameElement.innerText = clinicData.clinicName;
            }
            
            if (clinicData.logoUrl) {
                const logoContainer = document.getElementById('clinic-logo-container');
                if (logoContainer) {
                    logoContainer.innerHTML = `<img src="${clinicData.logoUrl}" alt="Clinic Logo" style="max-width: 45px; max-height: 45px; border-radius: 8px; object-fit: contain;">`;
                }
            }
        }
    } catch (error) {
        console.error("خطأ في جلب بيانات العيادة:", error);
    }
}

// 7. توزيع الصلاحيات (مع حجب الحسابات عن الممرضة)
function applyRoles(role) {
    const r = role.toLowerCase();
    
    const settingsLi = document.getElementById('nav-settings-li');
    const superAdminLi = document.getElementById('nav-super-admin');
    const financesLi = document.getElementById('nav-finances-li');
    
    if (settingsLi) settingsLi.style.display = 'none';
    if (superAdminLi) superAdminLi.style.display = 'none';
    if (financesLi) financesLi.style.display = 'block';

    if (r === 'nurse') {
        if (financesLi) financesLi.style.display = 'none';
    }

    if (r === 'doctor' || r === 'admin') {
        if (settingsLi) settingsLi.style.display = 'block';
    }
    
    if (r === 'superadmin') {
        if (settingsLi) settingsLi.style.display = 'block';
        if (superAdminLi) superAdminLi.style.display = 'block';
    }
}

// 8. إضافة طبقة خلفية عائمة (Overlay)
document.addEventListener('DOMContentLoaded', () => {
    let overlay = document.createElement('div');
    overlay.id = 'mobile-overlay';
    overlay.className = 'mobile-overlay';
    overlay.onclick = toggleSidebar; 
    document.body.appendChild(overlay);
});

// 9. التحكم في القائمة الجانبية (UI)
function toggleSidebar() { 
    document.getElementById('sidebar').classList.toggle('active'); 
    document.getElementById('mobile-overlay').classList.toggle('active');
}

function toggleSidebarDesktop() {
    document.getElementById('sidebar').classList.toggle('collapsed');
    document.querySelector('.main-content').classList.toggle('expanded');
}

window.onload = () => {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.body.dir = lang === 'en' ? 'ltr' : 'rtl';
    updatePageContent(lang);
};
// =========================================================================
// 🔴 نظام الأمان المتقدم: الخروج التلقائي عند الخمول (حماية من الهيستوري) 🔴
// =========================================================================

const IDLE_TIMEOUT_MINUTES = 30; // تقدر تخليها 15 أو 30 دقيقة براحتك
let idleTime = 0;

// 1. تصفير العداد لما المستخدم يتحرك أو يكتب
function resetIdleTime() {
    idleTime = 0;
    localStorage.setItem('lastActiveNiva', Date.now());
}

// مراقبة أي حركة على الشاشة (ماوس، كيبورد، تاتش)
window.onload = resetIdleTime;
document.onmousemove = resetIdleTime;
document.onkeypress = resetIdleTime;
document.ontouchstart = resetIdleTime; // عشان الموبايل والتابلت

// 2. فحص كل دقيقة وهو فاتح الشاشة
setInterval(() => {
    idleTime++;
    if (idleTime >= IDLE_TIMEOUT_MINUTES) {
        forceSecurityLogout("تم تسجيل الخروج تلقائياً لعدم الاستخدام لفترة طويلة (حماية لبيانات العيادة).");
    }
}, 60000); // 60000 ملي ثانية = دقيقة

// 3. الفحص الفوري أول ما يفتح (عشان لو جابها من الهيستوري أو الـ Restore)
function checkHistoryRestore() {
    const lastActive = localStorage.getItem('lastActiveNiva');
    if (lastActive) {
        const diffMinutes = (Date.now() - lastActive) / (1000 * 60);
        // لو فتحها من الهيستوري بعد ما الوقت عدى، هنطرده
        if (diffMinutes >= IDLE_TIMEOUT_MINUTES) {
            forceSecurityLogout("انتهت الجلسة للأمان. يرجى تسجيل الدخول مرة أخرى.");
        }
    }
}

// 4. دالة الطرد (تسجيل الخروج الإجباري)
function forceSecurityLogout(msg) {
    if(firebase.auth().currentUser) {
        firebase.auth().signOut().then(() => {
            sessionStorage.clear();
            localStorage.removeItem('lastActiveNiva');
            alert("🔒 " + msg);
            window.top.location.href = 'index.html';
        });
    }
}

// استدعاء فحص الهيستوري فوراً مع تحميل الصفحة
checkHistoryRestore();
