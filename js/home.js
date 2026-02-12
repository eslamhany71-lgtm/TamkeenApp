// 1. نظام الترجمة لصفحة الهوم
function updatePageContent(lang) {
    const translations = {
        ar: {
            welcome: "أهلاً بك في نظام تمكين الموحد",
            calc: "حاسبة القروض",
            branches: "الفروع",
            hr: "شؤون الموظفين",
            mgr: "لوحة تحكم المدير",
            hrd: "لوحة تحكم الـ HR",
            adm: "إدارة الفروع (Admin)",
            logout: "تسجيل خروج"
        },
        en: {
            welcome: "Welcome to Tamkeen Unified System",
            calc: "Loan Calculator",
            branches: "Branches",
            hr: "HR Solution",
            mgr: "Manager Panel",
            hrd: "HR Dashboard",
            adm: "Manage Branches",
            logout: "Logout"
        }
    };

    const t = translations[lang];
    
    if(document.getElementById('txt-welcome')) document.getElementById('txt-welcome').innerText = t.welcome;
    if(document.getElementById('txt-calc')) document.getElementById('txt-calc').innerText = t.calc;
    if(document.getElementById('txt-hr')) document.getElementById('txt-hr').innerText = t.hr;
    if(document.getElementById('txt-branches')) document.getElementById('txt-branches').innerText = t.branches;
    if(document.getElementById('txt-mgr-dash')) document.getElementById('txt-mgr-dash').innerText = t.mgr;
    if(document.getElementById('txt-hr-dash')) document.getElementById('txt-hr-dash').innerText = t.hrd;
    if(document.getElementById('txt-admin-dash')) document.getElementById('txt-admin-dash').innerText = t.adm;
    if(document.getElementById('btn-logout')) document.getElementById('btn-logout').innerText = t.logout;
}

// 2. مراقب حالة الدخول والصلاحيات
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        document.getElementById('userEmail').innerText = user.email;
        const userEmail = user.email;
        const empCode = userEmail.split('@')[0];

        // محاولة قراءة البيانات من جدول Users
        firebase.firestore().collection("Users").doc(userEmail).get().then((doc) => {
            if (doc.exists) {
                // الموظف موجود.. افتح الصلاحيات
                applyRoles(doc.data().role);
            } else {
                // --- نظام الإصلاح الذاتي ---
                console.log("ملف الصلاحيات ناقص.. جاري محاولة الإصلاح...");
                return firebase.firestore().collection("Employee_Database").doc(empCode).get();
            }
        })
        .then((empDoc) => {
            if (empDoc && empDoc.exists) {
                const empData = empDoc.data();
                const assignedRole = (empData.role || "employee").toLowerCase();
                
                // إنشاء الملف الناقص في Users
                return firebase.firestore().collection("Users").doc(userEmail).set({
                    role: assignedRole,
                    name: empData.name,
                    empCode: empCode,
                    email: userEmail
                }).then(() => {
                    console.log("تم إصلاح الحساب بنجاح!");
                    applyRoles(assignedRole);
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

// 3. دالة إظهار الكروت حسب الرتبة (معدلة لتشمل الأدمن)
function applyRoles(role) {
    const r = role.toLowerCase();
    
    // كارت المدير: يظهر للمدير والـ HR والأدمن
    if (r === 'manager' || r === 'hr' || r === 'admin') {
        if(document.getElementById('manager-card')) document.getElementById('manager-card').style.display = 'block';
    }
    
    // كارت الـ HR: يظهر للـ HR والأدمن
    if (r === 'hr' || r === 'admin') {
        if(document.getElementById('hr-admin-card')) document.getElementById('hr-admin-card').style.display = 'block';
    }

    // كارت الأدمن (إدارة الفروع): يظهر للأدمن فقط
    if (r === 'admin') {
        if(document.getElementById('admin-branch-card')) document.getElementById('admin-branch-card').style.display = 'block';
    }
}
