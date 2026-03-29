// js/home.js - NivaDent Master Shell (SaaS Routing, Dynamic Branding, Roles, Translations) - نسخة منع التكييش العنيف

// 1. دالة التنقل بين الصفحات في الـ Iframe (مع منع التكييش العنيف للموبايل) 🚀📱
function loadPage(pageUrl, clickedLi) {
    // 🔴 سحر الـ Cache-Busting: إجبار الموبايل على سحب أحدث نسخة دايماً
    const timestamp = new Date().getTime();
    const cleanUrl = pageUrl.split('?')[0]; // لو اللينك فيه بارامترات قديمة نشيلها
    const finalUrl = `${cleanUrl}?v=${timestamp}`; // إضافة رقم فريد عشان المتصفح ميتغاباش

    document.getElementById('content-frame').src = finalUrl;
    
    const allLinks = document.querySelectorAll('#nav-links li');
    allLinks.forEach(li => li.classList.remove('active'));
    clickedLi.classList.add('active');

    // إغلاق القائمة الجانبية في الموبايل بعد الاختيار
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

// 4. مراقب الصلاحيات وجلب بيانات العيادة (The Magic Router)
firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
        document.getElementById('userEmail').innerText = user.email;

        try {
            const userDoc = await db.collection("Users").doc(user.email).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                const role = userData.role || 'reception';
                const clinicId = userData.clinicId || sessionStorage.getItem('clinicId') || 'default';

                sessionStorage.setItem('clinicId', clinicId);

                applyRoles(role);
                loadClinicBranding(clinicId);
                
                // 🔴 تشغيل فحص التنبيهات للعيادة 🔴
                if(role !== 'superadmin' && clinicId !== 'default') {
                    checkSubscriptionAlert(clinicId);
                }
            }
        } catch (error) {
            console.error("خطأ في جلب بيانات المستخدم:", error);
        }
    } else {
        window.location.href = "index.html";
    }
});

// 🔴 5. دالة فحص التنبيهات (Billing Alerts) 🔴
async function checkSubscriptionAlert(clinicId) {
    try {
        const clinicDoc = await db.collection("Clinics").doc(clinicId).get();
        if (clinicDoc.exists) {
            const cData = clinicDoc.data();
            
            // تأكيد الطرد لو العيادة اتوقفت وهو جوه السيستم
            if (cData.status === 'suspended') {
                firebase.auth().signOut();
                return;
            }

            if (cData.nextPaymentDate) {
                const nextPayDate = cData.nextPaymentDate.toDate();
                const now = new Date();
                
                const diffTime = nextPayDate - now;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

                // لو فاضل 3 أيام أو أقل، نظهر شريط التنبيه
                if (diffDays >= 0 && diffDays <= 3) {
                    showBillingAlert(diffDays);
                }
            }
        }
    } catch (error) {
        console.error("خطأ في فحص الاشتراك:", error);
    }
}

// دالة رسم شريط التنبيه في الشاشة
function showBillingAlert(daysLeft) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const t = window.homeLang || updatePageContent(lang); 
    
    let alertMsg = daysLeft === 0 ? window.homeLang.alertToday : window.homeLang.alertText.replace('{days}', daysLeft);

    // إنشاء شريط التنبيه HTML
    const alertDiv = document.createElement('div');
    alertDiv.id = "billing-alert-banner";
    alertDiv.style.cssText = "background-color: #ef4444; color: white; text-align: center; padding: 10px; font-weight: bold; font-size: 14px; z-index: 9999; position: relative; width: 100%; box-shadow: 0 2px 4px rgba(0,0,0,0.2);";
    alertDiv.innerHTML = `<span>${alertMsg}</span>`;

    // إضافته في أعلى الصفحة (فوق الـ Header)
    document.body.insertBefore(alertDiv, document.body.firstChild);
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
    const financesLi = document.getElementById('nav-finances-li'); // سحبنا زرار الحسابات
    
    // الوضع الافتراضي للكل
    if (settingsLi) settingsLi.style.display = 'none';
    if (superAdminLi) superAdminLi.style.display = 'none';
    if (financesLi) financesLi.style.display = 'block'; // الحسابات ظاهرة للكل كوضع مبدئي

    // لو اليوزر ده ممرضة (أخفي الحسابات)
    if (r === 'nurse') {
        if (financesLi) financesLi.style.display = 'none';
    }

    // لو اليوزر دكتور أو أدمن
    if (r === 'doctor' || r === 'admin') {
        if (settingsLi) settingsLi.style.display = 'block';
    }
    
    // لو اليوزر مالك النظام
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
