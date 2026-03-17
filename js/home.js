// home.js - Master Shell Logic (SPA Routing, Roles, Translations)

// 1. دالة التنقل بين الصفحات في الـ Iframe
function loadPage(pageUrl, clickedLi) {
    // تغيير الرابط داخل الـ Iframe
    document.getElementById('content-frame').src = pageUrl;
    
    // إزالة كلاس active من كل الروابط وإضافته للرابط المضغوط
    const allLinks = document.querySelectorAll('#nav-links li');
    allLinks.forEach(li => li.classList.remove('active'));
    clickedLi.classList.add('active');

    // قفل القائمة في الموبايل بعد الاختيار
    if (window.innerWidth <= 992) {
        document.getElementById('sidebar').classList.remove('active');
    }
}

// 2. دالة تغيير لغة النظام بالكامل (الخارج والداخل)
function switchAppLanguage(lang) {
    setLanguage(lang); // الدالة الأساسية لتغيير الـ LocalStorage
    updatePageContent(lang); // تحديث القائمة الجانبية
    // تحديث الصفحة المعروضة داخل الـ Iframe
    const frame = document.getElementById('content-frame');
    if(frame.contentWindow) {
        frame.contentWindow.location.reload();
    }
}

// 3. الترجمة الخاصة بالهيكل الخارجي فقط
function updatePageContent(lang) {
    const t = {
        ar: {
            brand: "تمكين ERP", header: "لوحة التحكم المركزية",
            navHome: "الرئيسية", navCrm: "إدارة العملاء (CRM)", navCalc: "حاسبة القروض", navHr: "الخدمات الذاتية", navBranches: "دليل الفروع",
            navMgr: "لوحة المدير", navHrd: "لوحة الـ HR", navAdm: "إدارة النظام", logout: "تسجيل خروج"
        },
        en: {
            brand: "Tamkeen ERP", header: "Central Dashboard",
            navHome: "Home", navCrm: "CRM", navCalc: "Loan Calc", navHr: "Self Service", navBranches: "Branches",
            navMgr: "Manager Panel", navHrd: "HR Panel", navAdm: "System Admin", logout: "Logout"
        }
    };
    const c = t[lang] || t.ar;
    const setTxt = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };

    setTxt('txt-brand', c.brand); setTxt('txt-header', c.header);
    setTxt('nav-home', c.navHome); setTxt('nav-crm', c.navCrm); setTxt('nav-calc', c.navCalc); setTxt('nav-hr', c.navHr); setTxt('nav-branches', c.navBranches);
    setTxt('nav-mgr-dash', c.navMgr); setTxt('nav-hrd-dash', c.navHrd); setTxt('nav-adm-dash', c.navAdm); setTxt('btn-logout', c.logout);
}

// 4. مراقب الصلاحيات (يتحكم في إظهار روابط القائمة الجانبية)
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        document.getElementById('userEmail').innerText = user.email;
        const empCode = user.email.split('@')[0];

        firebase.firestore().collection("Users").doc(user.email).get().then((doc) => {
            if (doc.exists) applyRoles(doc.data().role);
        });
    } else {
        window.location.href = "index.html";
    }
});

function applyRoles(role) {
    const r = role.toLowerCase();
    if (r === 'manager' || r === 'hr' || r === 'admin') document.getElementById('nav-manager').style.display = 'block';
    if (r === 'hr' || r === 'admin') document.getElementById('nav-hr-admin').style.display = 'block';
    if (r === 'admin') document.getElementById('nav-admin').style.display = 'block';
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('active'); }
function toggleSidebarDesktop() {
    document.getElementById('sidebar').classList.toggle('collapsed');
    document.querySelector('.main-content').classList.toggle('expanded');
}
