// auth.js - النسخة الشاملة (Login + Activation + Multi-Page Translation + Notifications Permission)
// تم تعديل الدخول والتفعيل ليدعم الأكواد النصية بالمسافات (مثل: At 6651) ليتطابق مع شيت الـ HR

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
        sessionStorage.clear(); // مسح الكاش عند الخروج لضمان الأمان
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

    // نأخذ النص كما هو مكتوب (At 6651)
    const rawInput = codeInput.value.trim(); 
    const pass = passInput.value.trim();

    if (!rawInput || !pass) { 
        if (errorDiv) errorDiv.innerText = document.body.dir === 'rtl' ? "برجاء إكمال البيانات" : "Please complete data"; 
        return; 
    }

    // --- المنطق الذكي الجديد ---
    // إزالة المسافات ضروري فقط لخانة الـ Email في Firebase Auth لأنها ترفض المسافات
    // يتم تحويل الإيميل لـ lowercase لضمان التطابق مع الـ Rules
    const cleanAuthEmail = rawInput.includes('@') 
        ? rawInput.replace(/\s+/g, '').toLowerCase() 
        : rawInput.replace(/\s+/g, '').toLowerCase() + "@tamkeen.com";
    
    const btn = document.getElementById('btn-login');
    
    if (btn) {
        btn.innerText = "...";
        btn.disabled = true;
    }

    auth.signInWithEmailAndPassword(cleanAuthEmail, pass)
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
                errorDiv.innerText = isRtl ? "صيغة غير صحيحة" : "Invalid format";
            } else {
                errorDiv.innerText = isRtl ? "خطأ في عملية الدخول" : "Login error occurred";
            }
        }
    });
}

// 4. دالة التفعيل الكاملة (للموظفين الجدد)
async function activateAccount() {
    const codeRaw = document.getElementById('reg-code').value.trim(); // "At 6651" مثلاً
    const phone = document.getElementById('reg-phone').value.trim();
    const pass = document.getElementById('reg-pass').value.trim();
    const msg = document.getElementById('reg-msg');

    if(!codeRaw || !phone || !pass) { 
        if(msg) msg.innerText = "برجاء إكمال البيانات"; return; 
    }

    // تجهيز إيميل الـ Auth (بدون مسافات وبحروف صغيرة)
    const authEmail = codeRaw.includes('@') 
        ? codeRaw.replace(/\s+/g, '').toLowerCase() 
        : codeRaw.replace(/\s+/g, '').toLowerCase() + "@tamkeen.com";

    try {
        if(msg) msg.innerText = "جاري فحص الكود: " + codeRaw;

        // البحث في جدول الموظفين باستخدام الكود الأصلي بالظبط (بالحروف الكبيرة والمسافات)
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

        // أ- إنشاء الحساب في نظام الـ Auth
        await auth.createUserWithEmailAndPassword(authEmail, pass);
        
        // ب- إنشاء بروفايل المستخدم في جدول Users وربطه بالكود الأصلي (At 6651)
        await db.collection("Users").doc(authEmail).set({
            role: (empData.role || "employee").toLowerCase().trim(),
            name: empData.name,
            empCode: codeRaw, // نحفظ الكود الأصلي بالمسافات
            email: authEmail
        });

        // ج- تحديث حالة التفعيل في جدول الموظفين الأصلي
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
                msg.innerText = "صيغة الكود أو الإيميل غير صحيحة تقنياً";
            } else if (error.code === 'auth/weak-password') {
                msg.innerText = "كلمة المرور ضعيفة جداً";
            } else if (error.code === 'auth/email-already-in-use') {
                msg.innerText = "هذا الإيميل مسجل مسبقاً";
            } else {
                msg.innerText = "خطأ: " + error.message;
            }
        }
    }
}

// نظام الترجمة الشامل (لشاشة الدخول وشاشة التفعيل) - توضع داخل auth.js
function updatePageContent(lang) {
    const translations = {
        ar: {
            title: "تسجيل الدخول - نظام تمكين", 
            welcome: "أهلاً بعودتك", 
            subLogin: "قم بتسجيل الدخول لمتابعة عملك",
            code: "كود الموظف أو الإيميل", 
            pass: "كلمة المرور", 
            btn: "تسجيل الدخول", 
            newEmp: "موظف جديد؟", 
            actLink: "تفعيل حسابك من هنا",
            brandTitle: "تمكين للتمويل",
            brandDesc: "نظام الإدارة الشامل للموارد البشرية والمبيعات والفروع. صُمم لرفع كفاءة العمل وتسهيل التواصل بين جميع الأقسام.",
            feat1: "✔️ أمان عالي", feat2: "✔️ سرعة في الأداء", feat3: "✔️ تقارير ذكية",
            // نصوص صفحة التفعيل
            actPageTitle: "تفعيل الحساب - نظام تمكين",
            actWelcome: "تفعيل حساب جديد",
            actSub: "يرجى إدخال البيانات المسجلة لدى إدارة الموارد البشرية",
            actCode: "كود الموظف",
            actPhone: "رقم الموبايل",
            actPass: "اختر كلمة مرور جديدة",
            btnAct: "تفعيل الحساب الآن",
            backLoginStr: "لديك حساب بالفعل؟",
            backLoginLink: "العودة للدخول",
            brandActTitle: "أهلاً بك في فريقنا",
            brandActDesc: "يسعدنا انضمامك لفريق تمكين. قم بتفعيل حسابك للوصول إلى لوحة التحكم الخاصة بك ومتابعة مهامك بكل سهولة."
        },
        en: {
            title: "Login - Tamkeen System", 
            welcome: "Welcome Back", 
            subLogin: "Sign in to continue your work",
            code: "Employee ID or Email", 
            pass: "Password", 
            btn: "Login", 
            newEmp: "New employee?", 
            actLink: "Activate your account here",
            brandTitle: "Tamkeen Finance",
            brandDesc: "Comprehensive management system for HR, Sales, and Branches. Designed to increase work efficiency and facilitate communication.",
            feat1: "✔️ High Security", feat2: "✔️ Fast Performance", feat3: "✔️ Smart Reports",
            // Activation Page Texts
            actPageTitle: "Activate Account - Tamkeen",
            actWelcome: "Activate New Account",
            actSub: "Please enter the data registered with the HR department",
            actCode: "Employee Code",
            actPhone: "Mobile Number",
            actPass: "Choose a new password",
            btnAct: "Activate Account Now",
            backLoginStr: "Already have an account?",
            backLoginLink: "Back to Login",
            brandActTitle: "Welcome to Our Team",
            brandActDesc: "We are glad you joined Tamkeen. Activate your account to access your dashboard and track your tasks easily."
        }
    };

    const t = translations[lang] || translations['ar'];
    document.body.dir = (lang === 'en') ? 'ltr' : 'rtl';

    const safeSetText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    };

    // ترجمة صفحة الدخول
    if (document.title.includes('دخول') || document.title.includes('Login')) document.title = t.title;
    safeSetText('txt-welcome', t.welcome);
    safeSetText('sub-login', t.subLogin);
    safeSetText('lbl-code', t.code);
    safeSetText('lbl-pass', t.pass);
    safeSetText('btn-login', t.btn);
    safeSetText('txt-new', t.newEmp);
    safeSetText('link-activate', t.actLink);
    safeSetText('txt-brand', t.brandTitle);
    safeSetText('brand-desc', t.brandDesc);
    safeSetText('feat-1', t.feat1);
    safeSetText('feat-2', t.feat2);
    safeSetText('feat-3', t.feat3);

    // ترجمة صفحة التفعيل
    if (document.title.includes('تفعيل') || document.title.includes('Activate')) document.title = t.actPageTitle;
    safeSetText('txt-act-welcome', t.actWelcome);
    safeSetText('txt-act-sub', t.actSub);
    safeSetText('lbl-act-code', t.actCode);
    safeSetText('lbl-act-phone', t.actPhone);
    safeSetText('lbl-act-pass', t.actPass);
    safeSetText('btn-activate', t.btnAct);
    safeSetText('txt-back-str', t.backLoginStr);
    safeSetText('link-back-login', t.backLoginLink);
    safeSetText('brand-act-title', t.brandActTitle);
    safeSetText('brand-act-desc', t.brandActDesc);
}
