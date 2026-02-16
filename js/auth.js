const auth = firebase.auth();
const db = firebase.firestore();

// 1. تسجيل الدخول
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
    if (btn) { btn.innerText = "..."; btn.disabled = true; }

    auth.signInWithEmailAndPassword(email, pass)
    .then(() => { /* التوجيه تلقائي */ })
    .catch((error) => {
        if (btn) { btn.innerText = "دخول"; btn.disabled = false; }
        if (errorDiv) errorDiv.innerText = document.body.dir === 'rtl' ? "خطأ في الكود أو كلمة المرور" : "Error in ID or Password";
    });
}

// 2. تفعيل الحساب الكامل (بدون حذف أي سطر)
async function activateAccount() {
    const code = document.getElementById('reg-code').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const pass = document.getElementById('reg-pass').value.trim();
    const msg = document.getElementById('reg-msg');
    if(!code || !phone || !pass) { if(msg) msg.innerText = "برجاء إكمال البيانات"; return; }

    try {
        const empDoc = await db.collection("Employee_Database").doc(code).get();
        if (!empDoc.exists) { msg.innerText = "الكود غير مسجل، راجع الـ HR"; return; }
        const empData = empDoc.data();
        if (empData.phone !== phone) { msg.innerText = "رقم الموبايل غير مطابق للسجلات"; return; }
        if (empData.activated === true) { msg.innerText = "هذا الحساب مفعل بالفعل"; return; }

        const email = code + "@tamkeen.com";
        const role = (empData.role || "employee").toLowerCase().trim();
        msg.innerText = "جاري إنشاء الحساب...";

        await auth.createUserWithEmailAndPassword(email, pass);
        await db.collection("Users").doc(email).set({
            role: role, name: empData.name, empCode: code, email: email
        });
        await db.collection("Employee_Database").doc(code).update({ activated: true });

        msg.innerText = "تم التفعيل بنجاح! جاري تحويلك...";
        setTimeout(() => { window.location.href = "index.html"; }, 1500);
    } catch (error) { if(msg) msg.innerText = "خطأ: " + error.message; }
}

// 3. مراقب الحالة
auth.onAuthStateChanged((user) => {
    const path = window.location.pathname;
    const fileName = path.split("/").pop();
    const isLoginPage = fileName === "index.html" || fileName === "activate.html" || fileName === "" || fileName === "undefined";
    if (user) { if (isLoginPage) window.location.href = "home.html"; } 
    else { if (!isLoginPage) window.location.href = "index.html"; }
});

// 4. نظام اللغة الشامل
function updatePageContent(lang) {
    const translations = {
        ar: {
            title: "دخول - نظام تمكين", brand: "تمكين للتمويل", welcome: "تسجيل الدخول", code: "كود الموظف", pass: "كلمة المرور", btn: "دخول", new: "موظف جديد؟", act: "تفعيل الحساب",
            actTitle: "تفعيل الحساب (للموظفين الجدد)", lblPhone: "رقم الموبايل", lblNewPass: "كلمة مرور جديدة", btnAct: "تفعيل الآن", back: "رجوع",
            // صفحة المدير
            m_title: "لوحة تحكم المدير - تمكين", m_header: "مراجعة طلبات الموظفين", m_pending: "إجمالي الطلبات المعلقة:",
            m_loading: "جاري تحميل الطلبات...", m_no_req: "لا توجد طلبات حالياً."
        },
        en: {
            title: "Login - Tamkeen", brand: "Tamkeen Finance", welcome: "User Login", code: "Employee ID", pass: "Password", btn: "Login", new: "New Employee?", act: "Activate",
            actTitle: "Account Activation", lblPhone: "Mobile Number", lblNewPass: "New Password", btnAct: "Activate Now", back: "Back",
            m_title: "Manager Dashboard - Tamkeen", m_header: "Review Requests", m_pending: "Total Pending:",
            m_loading: "Loading...", m_no_req: "No requests found."
        }
    };
    const t = translations[lang];
    document.body.dir = (lang === 'en') ? 'ltr' : 'rtl';
    const set = (id, text) => { if(document.getElementById(id)) document.getElementById(id).innerText = text; };

    set('txt-title', t.title); set('txt-welcome', t.welcome); set('btn-login', t.btn); set('btn-back', t.back);
    set('manager-page-title', t.m_title); set('txt-header-main', t.m_header); set('txt-pending-label', t.m_pending); set('loading-msg', t.m_loading);
}
