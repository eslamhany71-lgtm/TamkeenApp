const auth = firebase.auth();
const db = firebase.firestore();

// 1. دالة تسجيل الدخول بكود الموظف
function loginById() {
    const codeInput = document.getElementById('empCode');
    const passInput = document.getElementById('password');
    const errorDiv = document.getElementById('errorMessage');

    if (!codeInput || !passInput) return;

    const code = codeInput.value.trim();
    const pass = passInput.value.trim();

    if (!code || !pass) { 
        if (errorDiv) errorDiv.innerText = document.body.dir === 'rtl' ? "برجاء إكمال البيانات" : "Please complete data"; 
        return; 
    }

    const email = code + "@tamkeen.com";
    const btn = document.getElementById('btn-login');
    const originalText = btn ? btn.innerText : "";
    
    if (btn) {
        btn.innerText = "...";
        btn.disabled = true;
    }

    auth.signInWithEmailAndPassword(email, pass)
    .then(() => {
        // التوجيه يتم تلقائياً عبر مراقب الحالة بالأسفل
    })
    .catch((error) => {
        if (btn) {
            btn.innerText = originalText;
            btn.disabled = false;
        }
        if (errorDiv) errorDiv.innerText = document.body.dir === 'rtl' ? "خطأ في الكود أو كلمة المرور" : "Error in ID or Password";
    });
}

// 2. دالة تفعيل الحساب لأول مرة (النسخة الكاملة والمضمونة)
async function activateAccount() {
    const code = document.getElementById('reg-code').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const pass = document.getElementById('reg-pass').value.trim();
    const msg = document.getElementById('reg-msg');

    if(!code || !phone || !pass) { 
        if(msg) msg.innerText = "برجاء إكمال البيانات"; return; 
    }

    try {
        const empDoc = await db.collection("Employee_Database").doc(code).get();

        if (!empDoc.exists) {
            msg.innerText = "الكود غير مسجل، راجع الـ HR"; return;
        }

        const empData = empDoc.data();
        if (empData.phone !== phone) {
            msg.innerText = "رقم الموبايل غير مطابق للسجلات"; return;
        }

        if (empData.activated === true) {
            msg.innerText = "هذا الحساب مفعل بالفعل"; return;
        }

        const email = code + "@tamkeen.com";
        const role = (empData.role || "employee").toLowerCase().trim();

        msg.innerText = "جاري إنشاء الحساب... برجاء الانتظار";

        const userCredential = await auth.createUserWithEmailAndPassword(email, pass);
        
        await db.collection("Users").doc(email).set({
            role: role,
            name: empData.name,
            empCode: code,
            email: email
        });

        await db.collection("Employee_Database").doc(code).update({
            activated: true
        });

        msg.innerText = "تم التفعيل بنجاح! جاري تحويلك...";
        
        setTimeout(() => {
            alert("تم التفعيل بنجاح بصلاحية: " + role);
            window.location.href = "index.html";
        }, 1500);

    } catch (error) {
        console.error("خطأ التفعيل:", error);
        if(msg) msg.innerText = "خطأ: " + error.message;
    }
}

// 3. مراقب الحالة وحماية الصفحات (Observer)
auth.onAuthStateChanged((user) => {
    const path = window.location.pathname;
    const fileName = path.split("/").pop();
    const isLoginPage = fileName === "index.html" || fileName === "activate.html" || fileName === "" || fileName === "undefined";

    if (user) {
        if (isLoginPage) {
            window.location.href = "home.html";
        }
    } else {
        if (!isLoginPage) {
            window.location.href = "index.html";
        }
    }
});

// 4. دالة تسجيل الخروج
function logout() {
    auth.signOut().then(() => {
        window.location.href = "index.html";
    }).catch(err => console.log("Logout Error"));
}

// 5. نظام اللغة الكامل (Login & Activate & Manager Dashboard)
function updatePageContent(lang) {
    const translations = {
        ar: {
            // ترجمات صفحة الدخول والتفعيل
            title: "دخول - نظام تمكين", brand: "تمكين للتمويل", welcome: "تسجيل الدخول", code: "كود الموظف", pass: "كلمة المرور", btn: "دخول", new: "موظف جديد؟", act: "تفعيل الحساب",
            actTitle: "تفعيل الحساب (للموظفين الجدد)", lblPhone: "رقم الموبايل", lblNewPass: "اختر كلمة مرور جديدة", btnAct: "تفعيل الحساب الآن", back: "رجوع",
            // ترجمات صفحة المدير (المضافة لحل مشكلة الـ Error)
            m_title: "لوحة تحكم المدير - نظام تمكين",
            m_header: "مراجعة طلبات الموظفين",
            m_pending_label: "إجمالي الطلبات المعلقة:",
            m_loading: "جاري تحميل الطلبات...",
            m_no_requests: "لا توجد طلبات حالياً."
        },
        en: {
            title: "Login - Tamkeen", brand: "Tamkeen Finance", welcome: "User Login", code: "Employee ID", pass: "Password", btn: "Login", new: "New Employee?", act: "Activate Account",
            actTitle: "Account Activation", lblPhone: "Mobile Number", lblNewPass: "New Password", btnAct: "Activate Now", back: "Back",
            // Manager Dashboard
            m_title: "Manager Dashboard - Tamkeen",
            m_header: "Review Employee Requests",
            m_pending_label: "Total Pending Requests:",
            m_loading: "Loading requests...",
            m_no_requests: "No requests available at the moment."
        }
    };

    const t = translations[lang];
    document.body.dir = (lang === 'en') ? 'ltr' : 'rtl';

    // دالة مساعدة لتجنب أخطاء undefined
    const safeSetText = (id, text) => {
        const element = document.getElementById(id);
        if (element) element.innerText = text;
    };

    // 1. عناصر صفحة الدخول (index.html)
    safeSetText('txt-title', t.title);
    safeSetText('txt-brand', t.brand);
    safeSetText('txt-welcome', t.welcome);
    safeSetText('lbl-code', t.code);
    safeSetText('lbl-pass', t.pass);
    safeSetText('btn-login', t.btn);
    safeSetText('txt-new', t.new);
    safeSetText('link-activate', t.act);
    
    // 2. عناصر صفحة التفعيل (activate.html)
    safeSetText('txt-act-title', t.actTitle);
    safeSetText('lbl-phone', t.lblPhone);
    safeSetText('lbl-new-pass', t.lblNewPass);
    safeSetText('btn-activate', t.btnAct);
    safeSetText('link-back', t.back);

    // 3. عناصر صفحة المدير (manager-dashboard.html)
    safeSetText('manager-page-title', t.m_title); // تحديث التايتل لمنع الخطأ
    safeSetText('txt-header-main', t.m_header);
    safeSetText('txt-pending-label', t.m_pending_label);
    safeSetText('loading-msg', t.m_loading);
}
