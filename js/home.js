// home.js - NivaDent Master Shell (SaaS Routing, Dynamic Branding, Roles, Translations)


// 1. دالة التنقل بين الصفحات في الـ Iframe
function loadPage(pageUrl, clickedLi) {
    document.getElementById('content-frame').src = pageUrl;
    
    const allLinks = document.querySelectorAll('#nav-links li');
    allLinks.forEach(li => li.classList.remove('active'));
    clickedLi.classList.add('active');

    if (window.innerWidth <= 992) {
        document.getElementById('sidebar').classList.remove('active');
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

// 3. الترجمة الخاصة بالهيكل الخارجي (NivaDent Menu)
function updatePageContent(lang) {
    const t = {
        ar: {
            header: "لوحة التحكم",
            navDash: "الداشبورد", navPatients: "المرضى والأشعة", navCalendar: "المواعيد والتقويم", 
            navSessions: "الجلسات والروشتات", navFinances: "الحسابات والمصروفات",
            navSettings: "إعدادات العيادة", navSuper: "إدارة النظام المركزية", logout: "تسجيل خروج"
        },
        en: {
            header: "Dashboard",
            navDash: "Overview", navPatients: "Patients & X-Rays", navCalendar: "Calendar", 
            navSessions: "Sessions & Prescriptions", navFinances: "Finances",
            navSettings: "Clinic Settings", navSuper: "Super Admin", logout: "Logout"
        }
    };
    const c = t[lang] || t.ar;
    const setTxt = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };

    setTxt('txt-header', c.header);
    setTxt('nav-dash', c.navDash); setTxt('nav-patients', c.navPatients); setTxt('nav-calendar', c.navCalendar); 
    setTxt('nav-sessions', c.navSessions); setTxt('nav-finances', c.navFinances);
    setTxt('nav-settings', c.navSettings); setTxt('nav-super', c.navSuper); setTxt('btn-logout', c.logout);
}

// 4. مراقب الصلاحيات وجلب بيانات العيادة (The Magic Router)
auth.onAuthStateChanged(async (user) => {
    if (user) {
        document.getElementById('userEmail').innerText = user.email;

        try {
            // جلب بيانات المستخدم من الفايربيز
            const userDoc = await db.collection("Users").doc(user.email).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                const role = userData.role || 'reception';
                const clinicId = userData.clinicId || sessionStorage.getItem('clinicId') || 'default';

                // حفظ معرف العيادة لضمان استخدامه في الشاشات الداخلية
                sessionStorage.setItem('clinicId', clinicId);

                // تطبيق الصلاحيات
                applyRoles(role);

                // تحميل اللوجو واسم العيادة الديناميكي
                loadClinicBranding(clinicId);
            }
        } catch (error) {
            console.error("خطأ في جلب بيانات المستخدم:", error);
        }
    } else {
        window.location.href = "index.html";
    }
});

// 5. دالة جلب لوجو واسم العيادة
async function loadClinicBranding(clinicId) {
    if (clinicId === 'default' || !clinicId) return; // الاحتفاظ بلوجو NivaDent الافتراضي

    try {
        const clinicDoc = await db.collection("Clinics").doc(clinicId).get();
        if (clinicDoc.exists) {
            const clinicData = clinicDoc.data();
            
            // تغيير اسم العيادة
            if (clinicData.clinicName) {
                const nameElement = document.getElementById('txt-clinic-name');
                if (nameElement) nameElement.innerText = clinicData.clinicName;
            }
            
            // تغيير اللوجو
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

// 6. توزيع الصلاحيات
function applyRoles(role) {
    const r = role.toLowerCase();
    
    // إخفاء القوائم الحساسة كإجراء افتراضي
    const settingsLi = document.getElementById('nav-settings-li');
    const superAdminLi = document.getElementById('nav-super-admin');
    
    if (settingsLi) settingsLi.style.display = 'none';
    if (superAdminLi) superAdminLi.style.display = 'none';

    // الدكتور (أو أدمن العيادة) يشوف الإعدادات
    if (r === 'doctor' || r === 'admin') {
        if (settingsLi) settingsLi.style.display = 'block';
    }
    
    // مالك النظام (إسلام الشريف) يشوف كل حاجة
    if (r === 'superadmin') {
        if (settingsLi) settingsLi.style.display = 'block';
        if (superAdminLi) superAdminLi.style.display = 'block';
    }
}

// 7. التحكم في القائمة الجانبية (UI)
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('active'); }
function toggleSidebarDesktop() {
    document.getElementById('sidebar').classList.toggle('collapsed');
    document.querySelector('.main-content').classList.toggle('expanded');
}
