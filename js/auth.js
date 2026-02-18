// auth.js - النسخة الشاملة (Login + Activation + Multi-Page Translation + Notifications Permission)
// تم تحديث منطق الدخول والتفعيل ليدعم (الكود فقط) أو (الإيميل الكامل) ذكياً وبدون أخطاء فورمات

const auth = firebase.auth();
const db = firebase.firestore();

// 1. مراقب الحالة (التحقق من تسجيل الدخول وتوجيه المستخدم)
auth.onAuthStateChanged((user) => {
    const path = window.location.pathname;
    const fileName = path.split("/").pop() || "index.html";
    
    // الصفحات التي لا تتطلب تسجيل دخول
    const isLoginPage = fileName === "index.html" || fileName === "activate.html" || fileName === "";

    if (user) {
        // لو مسجل دخول وموجود في صفحة الدخول.. ابعته للهوم
        if (isLoginPage) {
            window.location.href = "home.html";
        }
        // طلب إذن التنبيهات من المتصفح بمجرد تسجيل الدخول
        requestNotificationPermission();
    } else {
        // لو مش مسجل دخول وموجود في صفحة داخلية.. ارجعه للدخول
        if (!isLoginPage) {
            window.location.href = "index.html";
        }
    }
});

// ميزة التنبيهات الخارجية: وظيفة طلب الإذن
function requestNotificationPermission() {
    if ("Notification" in window) {
        if (Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    console.log("تم تفعيل إذن التنبيهات بنجاح");
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

    // تنظيف المدخلات من المسافات وتحويلها لحروف صغيرة (Lowercase) لمنع أخطاء الـ Auth
    const inputVal = codeInput.value.trim().toLowerCase();
    const pass = passInput.value.trim();

    if (!inputVal || !pass) { 
        if (errorDiv) errorDiv.innerText = document.body.dir === 'rtl' ? "برجاء إكمال البيانات" : "Please complete data"; 
        return; 
    }

    // --- المنطق الذكي الجديد ---
    // إذا كان المدخل يحتوي على @ نعتبره إيميل كامل، وإذا لم يحتوي نعتبره كود ونضيف له الدومين
    const email = inputVal.includes('@') ? inputVal : inputVal + "@tamkeen.com";
    
    const btn = document.getElementById('btn-login');
    
    if (btn) {
        btn.innerText = "...";
        btn.disabled = true;
    }

    auth.signInWithEmailAndPassword(email, pass)
    .catch((error) => {
        if (btn) {
            btn.innerText = "دخول";
            btn.disabled = false;
        }
        // رسالة الخطأ بناءً على لغة الصفحة
        if (errorDiv) {
            const isRtl = document.body.dir === 'rtl';
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                errorDiv.innerText = isRtl ? "خطأ في الكود أو كلمة المرور" : "Error in ID or Password";
            } else if (error.code === 'auth/invalid-email') {
                errorDiv.innerText = isRtl ? "صيغة البريد الإلكتروني غير صحيحة" : "Invalid email format";
            } else {
                errorDiv.innerText = isRtl ? "خطأ في عملية الدخول" : "Login error occurred";
            }
        }
    });
}

// 4. دالة التفعيل الكاملة (للموظفين الجدد)
async function activateAccount() {
    const codeRaw = document.getElementById('reg-code').value.trim().toLowerCase();
    const phone = document.getElementById('reg-phone').value.trim();
    const pass = document.getElementById('reg-pass').value.trim();
    const msg = document.getElementById('reg-msg');

    if(!codeRaw || !phone || !pass) { 
        if(msg) msg.innerText = "برجاء إكمال البيانات"; return; 
    }

    // استخراج الكود الصافي للبحث في Firestore (لو كتب إيميل كامل، ناخد اللي قبل الـ @)
    const code = codeRaw.includes('@') ? codeRaw.split('@')[0] : codeRaw;
    
    // بناء الإيميل الصحيح للتسجيل في Firebase Auth
    const email = codeRaw.includes('@') ? codeRaw : codeRaw + "@tamkeen.com";

    try {
        // البحث عن الموظف في قاعدة البيانات باستخدام الكود
        const empDoc = await db.collection("Employee_Database").doc(code).get();

        if (!empDoc.exists) {
            if(msg) msg.innerText = "الكود غير مسجل، راجع الـ HR"; return;
        }

        const empData = empDoc.data();
        if (empData.phone !== phone) {
            if(msg) msg.innerText = "رقم الموبايل غير مطابق للسجلات"; return;
        }

        if (empData.activated === true) {
            if(msg) msg.innerText = "هذا الحساب مفعل بالفعل"; return;
        }

        if(msg) msg.innerText = "جاري إنشاء الحساب... برجاء الانتظار";

        // إنشاء الحساب في Auth
        await auth.createUserWithEmailAndPassword(email, pass);
        
        // إنشاء ملف المستخدم في Users
        await db.collection("Users").doc(email).set({
            role: (empData.role || "employee").toLowerCase().trim(),
            name: empData.name,
            empCode: code,
            email: email
        });

        // تحديث حالة التفعيل في Employee_Database
        await db.collection("Employee_Database").doc(code).update({
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
                msg.innerText = "صيغة الكود أو الإيميل غير صحيحة";
            } else if (error.code === 'auth/weak-password') {
                msg.innerText = "كلمة المرور ضعيفة جداً";
            } else {
                msg.innerText = "خطأ: " + error.message;
            }
        }
    }
}

// 5. نظام الترجمة الموحد (يدعم كل الصفحات)
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

    // دالة مساعدة لتحديث النصوص بأمان
    const safeSetText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    };

    // تطبيق الترجمات (ستعمل فقط إذا كان العنصر موجوداً في الصفحة الحالية)
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
