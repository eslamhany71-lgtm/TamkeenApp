// auth.js - النسخة الشاملة (الإصلاح النهائي 2026)
// يدعم الأكواد النصية بالمسافات (مثل: At 6651) والإيميلات الكاملة ذكياً

const auth = firebase.auth();
const db = firebase.firestore();

// 1. مراقب الحالة (التوجيه التلقائي + طلب إذن التنبيهات)
auth.onAuthStateChanged((user) => {
    const path = window.location.pathname;
    const fileName = path.split("/").pop() || "index.html";
    
    const isLoginPage = fileName === "index.html" || fileName === "activate.html" || fileName === "";

    if (user) {
        if (isLoginPage) {
            window.location.href = "home.html";
        }
        requestNotificationPermission();
    } else {
        if (!isLoginPage) {
            window.location.href = "index.html";
        }
    }
});

// ميزة التنبيهات الخارجية: طلب الإذن
function requestNotificationPermission() {
    if ("Notification" in window) {
        if (Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    console.log("تم تفعيل إذن التنبيهات");
                }
            });
        }
    }
}

// 2. دالة تسجيل الخروج
function logout() {
    auth.signOut().then(() => {
        console.log("Logged out successfully");
        window.location.href = "index.html";
    }).catch((error) => {
        console.error("Logout Error:", error);
    });
}

// 3. دالة تسجيل الدخول الذكية (Login)
function loginById() {
    const codeInput = document.getElementById('empCode');
    const passInput = document.getElementById('password');
    const errorDiv = document.getElementById('errorMessage');

    if (!codeInput || !passInput) return;

    const rawInput = codeInput.value.trim(); // نأخذ النص كما هو بالمسافات (At 6651)
    const pass = passInput.value.trim();

    if (!rawInput || !pass) { 
        if (errorDiv) errorDiv.innerText = document.body.dir === 'rtl' ? "برجاء إكمال البيانات" : "Please complete data"; 
        return; 
    }

    // تجهيز الإيميل لـ Firebase Auth (إزالة المسافات ضروري تقنياً للدخول فقط)
    // لو الموظف كتب "At 6651" الفايربيز هيشوفه "At6651@tamkeen.com"
    const authEmail = rawInput.includes('@') ? rawInput.replace(/\s+/g, '') : rawInput.replace(/\s+/g, '') + "@tamkeen.com";
    
    const btn = document.getElementById('btn-login');
    if (btn) {
        btn.innerText = "...";
        btn.disabled = true;
    }

    auth.signInWithEmailAndPassword(authEmail, pass)
    .catch((error) => {
        if (btn) {
            btn.innerText = "دخول";
            btn.disabled = false;
        }
        if (errorDiv) {
            const isRtl = document.body.dir === 'rtl';
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                errorDiv.innerText = isRtl ? "خطأ في الكود أو كلمة المرور" : "Error in ID or Password";
            } else {
                errorDiv.innerText = isRtl ? "صيغة غير صحيحة أو خطأ في الدخول" : "Invalid format or login error";
            }
        }
    });
}

// 4. دالة التفعيل الكاملة (تبحث بالكود الأصلي وتتعامل مع المسافات)
async function activateAccount() {
    const codeRaw = document.getElementById('reg-code').value.trim(); // الكود كما هو (At 6651)
    const phone = document.getElementById('reg-phone').value.trim();
    const pass = document.getElementById('reg-pass').value.trim();
    const msg = document.getElementById('reg-msg');

    if(!codeRaw || !phone || !pass) { 
        if(msg) msg.innerText = "برجاء إكمال البيانات"; return; 
    }

    // تجهيز الإيميل للتسجيل في Auth (بدون مسافات لأن الفايربيز يمنعها)
    const authEmail = codeRaw.includes('@') ? codeRaw.replace(/\s+/g, '').toLowerCase() : codeRaw.replace(/\s+/g, '').toLowerCase() + "@tamkeen.com";

    try {
        if(msg) msg.innerText = "جاري التحقق من السجلات...";

        // البحث في Firestore بالكود الأصلي كما هو مكتوب في الشيت (بالمسافات: At 6651)
        const empDoc = await db.collection("Employee_Database").doc(codeRaw).get();

        if (!empDoc.exists) {
            if(msg) msg.innerText = "الكود (" + codeRaw + ") غير مسجل، راجع الـ HR"; return;
        }

        const empData = empDoc.data();
        if (empData.phone !== phone) {
            if(msg) msg.innerText = "رقم الموبايل غير مطابق للسجلات"; return;
        }

        if (empData.activated === true) {
            if(msg) msg.innerText = "هذا الحساب مفعل بالفعل"; return;
        }

        if(msg) msg.innerText = "جاري إنشاء الحساب... برجاء الانتظار";

        // إنشاء الحساب في Auth بالإيميل التقني
        await auth.createUserWithEmailAndPassword(authEmail, pass);
        
        // إنشاء ملف المستخدم في Users وحفظ الكود الأصلي (بالمسافات)
        await db.collection("Users").doc(authEmail).set({
            role: (empData.role || "employee").toLowerCase().trim(),
            name: empData.name,
            empCode: codeRaw, // نحفظه At 6651 كما هو
            email: authEmail
        });

        // تحديث حالة التفعيل في Employee_Database باستخدام الكود الأصلي (بالمسافات)
        await db.collection("Employee_Database").doc(codeRaw).update({
            activated: true
        });

        if(msg) msg.innerText = "تم التفعيل بنجاح! جاري تحويلك...";
        
        setTimeout(() => {
            window.location.href = "index.html";
        }, 1500);

    } catch (error) {
        console.error("خطأ التفعيل:", error);
        if(msg) {
            if (error.code === 'auth/invalid-email') {
                msg.innerText = "خطأ في صيغة الإيميل التقنية";
            } else {
                msg.innerText = "خطأ: " + error.message;
            }
        }
    }
}

// 5. نظام الترجمة الموحد (كامل بدون نقص حرف واحد)
function updatePageContent(lang) {
    const translations = {
        ar: {
            title: "دخول - نظام تمكين", brand: "تمكين للتمويل", welcome: "تسجيل الدخول", code: "كود الموظف أو الإيميل", pass: "كلمة المرور", btn: "دخول", new: "موظف جديد؟", act: "تفعيل الحساب",
            actTitle: "تفعيل الحساب (للموظفين الجدد)", lblPhone: "رقم الموبايل", lblNewPass: "اختر كلمة مرور جديدة", btnAct: "تفعيل الحساب الآن", back: "رجوع",
            m_title: "لوحة تحكم المدير - تمكين", m_header: "مراجعة طلبات الموظفين", m_pending_label: "إجمالي الطلبات المعلقة:", m_loading: "جاري تحميل الطلبات..."
        },
        en: {
            title: "Login - Tamkeen", brand: "Tamkeen Finance", welcome: "User Login", code: "Employee ID or Email", pass: "Password", btn: "Login", new: "New Employee?", act: "Activate Account",
            actTitle: "Account Activation", lblPhone: "Mobile Number", lblNewPass: "New Password", btnAct: "Activate Now", back: "Back",
            m_title: "Manager Dashboard - Tamkeen", m_header: "Review Employee Requests", m_pending_label: "Total Pending Requests:", m_loading: "Loading requests..."
        }
    };

    const t = translations[lang] || translations['ar'];
    document.body.dir = (lang === 'en') ? 'ltr' : 'rtl';

    const safeSetText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    };

    safeSetText('txt-title', t.title);
    safeSetText('txt-brand', t.brand);
    safeSetText('txt-welcome', t.welcome);
    safeSetText('lbl-code', t.code);
    safeSetText('lbl-pass', t.pass);
    safeSetText('btn-login', t.btn);
    safeSetText('btn-back', t.back);
    safeSetText('txt-new', t.new);
    safeSetText('link-activate', t.act);
    safeSetText('txt-act-title', t.actTitle);
    safeSetText('lbl-phone', t.lblPhone);
    safeSetText('lbl-new-pass', t.lblNewPass);
    safeSetText('btn-activate', t.btnAct);
    safeSetText('link-back', t.back);
    safeSetText('manager-page-title', t.m_title);
    safeSetText('txt-header-main', t.m_header);
    safeSetText('txt-pending-label', t.m_pending_label);
    safeSetText('loading-msg', t.m_loading);
}
