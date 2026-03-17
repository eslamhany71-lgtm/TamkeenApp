// home.js - Enterprise Logic (Roles + Translations + Sidebar)

// 1. نظام الترجمة الشامل لصفحة الهوم والـ Sidebar
function updatePageContent(lang) {
    const translations = {
        ar: {
            brand: "تمكين ERP",
            header: "لوحة التحكم المركزية",
            welcome: "أهلاً بك في نظام تمكين الموحد",
            subtitle: "مرحباً بك في نظام إدارة الموارد المتكامل",
            navHome: "الرئيسية", navCalc: "حاسبة القروض", navHr: "الخدمات الذاتية", navBranches: "دليل الفروع",
            navMgr: "لوحة المدير", navHrd: "لوحة الـ HR", navAdm: "إدارة النظام",
            calc: "حاسبة القروض", descCalc: "حساب الأقساط والفوائد",
            hr: "شؤون الموظفين", descHr: "الإجازات والأذونات",
            branches: "الفروع", descBranches: "دليل الفروع والخرائط",
            mgr: "لوحة تحكم المدير", descMgr: "مراجعة طلبات القسم",
            hrd: "لوحة تحكم الـ HR", descHrd: "إدارة الطلبات والتقارير",
            adm: "إدارة الفروع (Admin)", descAdm: "إضافة وتعديل النظام",
            logout: "تسجيل خروج",
            navCrm: "إدارة العملاء",
            crm: "إدارة العملاء (CRM)",
            descCrm: "مسار المبيعات والصفقات",
        },
        en: {
            brand: "Tamkeen ERP",
            header: "Central Dashboard",
            welcome: "Welcome to Tamkeen Unified System",
            subtitle: "Welcome to the Integrated Resource Management System",
            navHome: "Home", navCalc: "Loan Calc", navHr: "Self Service", navBranches: "Branches",
            navMgr: "Manager Panel", navHrd: "HR Panel", navAdm: "System Admin",
            calc: "Loan Calculator", descCalc: "Calculate Installments",
            hr: "HR Solution", descHr: "Leaves & Permissions",
            branches: "Branches", descBranches: "Directory & Maps",
            mgr: "Manager Panel", descMgr: "Review Dept Requests",
            hrd: "HR Dashboard", descHrd: "Manage Requests & Reports",
            adm: "Manage Branches", descAdm: "Add/Edit System Data",
            logout: "Logout",
            navCrm: "CRM",
            crm: "Sales CRM",
            descCrm: "Sales Pipeline & Leads",
        }
    };

    const t = translations[lang];
    
    // دوال مساعدة لتجنب الأخطاء
    const setTxt = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };

    // تطبيق الترجمة
    setTxt('txt-brand', t.brand);
    setTxt('txt-header', t.header);
    if(document.getElementById('txt-welcome').innerText !== "جاري التحميل...") setTxt('txt-welcome', t.welcome);
    setTxt('txt-subtitle', t.subtitle);
    
    // القائمة الجانبية
    setTxt('nav-home', t.navHome); 
    setTxt('nav-calc', t.navCalc); 
    setTxt('nav-hr', t.navHr); 
    setTxt('nav-branches', t.navBranches);
    setTxt('nav-mgr-dash', t.navMgr); 
    setTxt('nav-hrd-dash', t.navHrd); 
    setTxt('nav-adm-dash', t.navAdm);
    setTxt('nav-crm', t.navCrm); // ترجمة رابط الـ CRM في القائمة الجانبية
    
    // الكروت الرئيسية
    setTxt('txt-calc', t.calc); setTxt('desc-calc', t.descCalc);
    setTxt('txt-hr', t.hr); setTxt('desc-hr', t.descHr);
    setTxt('txt-branches', t.branches); setTxt('desc-branches', t.descBranches);
    setTxt('txt-mgr-dash', t.mgr); setTxt('desc-mgr', t.descMgr);
    setTxt('txt-hr-dash', t.hrd); setTxt('desc-hrd', t.descHrd);
    setTxt('txt-admin-dash', t.adm); setTxt('desc-adm', t.descAdm);
    setTxt('txt-crm', t.crm); setTxt('desc-crm', t.descCrm); // ترجمة كارت الـ CRM
    setTxt('btn-logout', t.logout);
}

// 2. مراقب حالة الدخول والصلاحيات والإصلاح الذاتي
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        document.getElementById('userEmail').innerText = user.email;
        const userEmail = user.email;
        const empCode = userEmail.split('@')[0];

        firebase.firestore().collection("Users").doc(userEmail).get().then((doc) => {
            if (doc.exists) {
                applyRoles(doc.data().role);
                const lang = localStorage.getItem('preferredLang') || 'ar';
                document.getElementById('txt-welcome').innerText = (lang === 'ar') ? "أهلاً بك في نظام تمكين الموحد" : "Welcome to Tamkeen Unified System";
            } else {
                console.log("ملف الصلاحيات ناقص.. جاري محاولة الإصلاح...");
                return firebase.firestore().collection("Employee_Database").doc(empCode).get();
            }
        })
        .then((empDoc) => {
            if (empDoc && empDoc.exists) {
                const empData = empDoc.data();
                const assignedRole = (empData.role || "employee").toLowerCase();
                
                return firebase.firestore().collection("Users").doc(userEmail).set({
                    role: assignedRole,
                    name: empData.name,
                    empCode: empCode,
                    email: userEmail
                }).then(() => {
                    console.log("تم إصلاح الحساب بنجاح!");
                    applyRoles(assignedRole);
                    const lang = localStorage.getItem('preferredLang') || 'ar';
                    document.getElementById('txt-welcome').innerText = (lang === 'ar') ? "أهلاً بك في نظام تمكين الموحد" : "Welcome to Tamkeen Unified System";
                });
            }
        })
        .catch((error) => {
            console.error("خطأ في الصلاحيات:", error);
        });
    } else {
        window.location.href = "index.html";
    }
});

// 3. دالة إظهار الكروت والقائمة الجانبية حسب الرتبة
function applyRoles(role) {
    const r = role.toLowerCase();
    
    // المدير، الـ HR، والأدمن
    if (r === 'manager' || r === 'hr' || r === 'admin') {
        if(document.getElementById('manager-card')) document.getElementById('manager-card').style.display = 'flex';
        if(document.getElementById('nav-manager')) document.getElementById('nav-manager').style.display = 'block';
    }
    
    // الـ HR والأدمن
    if (r === 'hr' || r === 'admin') {
        if(document.getElementById('hr-admin-card')) document.getElementById('hr-admin-card').style.display = 'flex';
        if(document.getElementById('nav-hr-admin')) document.getElementById('nav-hr-admin').style.display = 'block';
    }

    // الأدمن فقط
    if (r === 'admin') {
        if(document.getElementById('admin-branch-card')) document.getElementById('admin-branch-card').style.display = 'flex';
        if(document.getElementById('nav-admin')) document.getElementById('nav-admin').style.display = 'block';
    }
}

// 4. دالة لفتح وقفل الـ Sidebar في الموبايل
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
}

// 5. دالة طي القائمة في شاشات الكمبيوتر
function toggleSidebarDesktop() {
    document.getElementById('sidebar').classList.toggle('collapsed');
    document.querySelector('.main-content').classList.toggle('expanded');
}
