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
    .then(() => { /* التوجيه تلقائي عبر المراقب */ })
    .catch((error) => {
        if (btn) { btn.innerText = "دخول"; btn.disabled = false; }
        if (errorDiv) errorDiv.innerText = document.body.dir === 'rtl' ? "خطأ في الكود أو كلمة المرور" : "Error in ID or Password";
    });
}

// 2. تفعيل الحساب (النسخة الكاملة اللي بعتها لي)
async function activateAccount() {
    const code = document.getElementById('reg-code').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const pass = document.getElementById('reg-pass').value.trim();
    const msg = document.getElementById('reg-msg');
    if(!code || !phone || !pass) { if(msg) msg.innerText = "برجاء إكمال البيانات"; return; }

    try {
        const empDoc = await db.collection("Employee_Database").doc(code).get();
        if (!empDoc.exists) { msg.innerText = "الكود غير مسجل"; return; }
        const empData = empDoc.data();
        if (empData.phone !== phone) { msg.innerText = "رقم الموبايل غير مطابق"; return; }
        if (empData.activated === true) { msg.innerText = "مفعل بالفعل"; return; }

        const email = code + "@tamkeen.com";
        const role = (empData.role || "employee").toLowerCase().trim();
        await auth.createUserWithEmailAndPassword(email, pass);
        await db.collection("Users").doc(email).set({
            role: role, name: empData.name, empCode: code, email: email
        });
        await db.collection("Employee_Database").doc(code).update({ activated: true });
        msg.innerText = "تم التفعيل بنجاح!";
        setTimeout(() => { window.location.href = "index.html"; }, 1500);
    } catch (error) { if(msg) msg.innerText = "خطأ: " + error.message; }
}

// 3. مراقب الحالة (Observer)
auth.onAuthStateChanged((user) => {
    const fileName = window.location.pathname.split("/").pop();
    const isLoginPage = fileName === "index.html" || fileName === "activate.html" || fileName === "" || fileName === "undefined";
    if (user) {
        if (isLoginPage) window.location.href = "home.html";
    } else {
        if (!isLoginPage) window.location.href = "index.html";
    }
});

// 4. نظام اللغات (حل مشكلة الـ Undefined)
function updatePageContent(lang) {
    const translations = {
        ar: {
            title: "دخول - تمكين", brand: "تمكين للتمويل", welcome: "تسجيل الدخول", code: "كود الموظف", pass: "كلمة المرور", btn: "دخول", new: "موظف جديد؟", act: "تفعيل",
            actTitle: "تفعيل الحساب", lblPhone: "رقم الموبايل", lblNewPass: "كلمة مرور جديدة", btnAct: "تفعيل الآن", back: "رجوع",
            m_title: "لوحة تحكم المدير", m_header: "مراجعة طلبات الموظفين", m_pending: "الطلبات المعلقة:", m_loading: "جاري التحميل...", m_no_req: "لا توجد طلبات."
        },
        en: {
            title: "Login - Tamkeen", brand: "Tamkeen Finance", welcome: "User Login", code: "Employee ID", pass: "Password", btn: "Login", new: "New?", act: "Activate",
            actTitle: "Activation", lblPhone: "Mobile", lblNewPass: "New Password", btnAct: "Activate", back: "Back",
            m_title: "Manager Dashboard", m_header: "Review Requests", m_pending: "Pending:", m_loading: "Loading...", m_no_req: "No requests."
        }
    };
    const t = translations[lang] || translations['ar'];
    document.body.dir = (lang === 'en') ? 'ltr' : 'rtl';

    // استخدام دالة آمنة للتحديث عشان الكود ميوقفش لو العنصر مش موجود
    const safeSet = (id, text) => { const el = document.getElementById(id); if(el) el.innerText = text; };
    
    safeSet('txt-title', t.title);
    safeSet('txt-welcome', t.welcome);
    safeSet('btn-login', t.btn);
    safeSet('btn-back', t.back);
    safeSet('manager-page-title', t.m_title);
    safeSet('txt-header-main', t.m_header);
    safeSet('txt-pending-label', t.m_pending);
    safeSet('loading-msg', t.m_loading);
}
