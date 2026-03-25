// auth.js - نسخة NivaDent السحابية (Multi-Tenant & Dental SaaS)

const auth = firebase.auth();
const db = firebase.firestore();

// 1. مراقب الحالة
auth.onAuthStateChanged((user) => {
    const path = window.location.pathname;
    const fileName = path.split("/").pop() || "index.html";
    
    // إيقاف المراقب في صفحة التفعيل لمنع المقاطعة
    if (fileName === "activate.html") {
        return; 
    }

    const isLoginPage = fileName === "index.html" || fileName === "";

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

function requestNotificationPermission() {
    if ("Notification" in window) {
        if (Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") console.log("تم تفعيل إذن التنبيهات");
            });
        }
    }
}

function logout() {
    auth.signOut().then(() => {
        sessionStorage.clear();
        window.location.href = "index.html";
    });
}

// 2. دالة تسجيل الدخول (تقرأ الصلاحية ومعرف العيادة من قاعدة الموظفين الأصلية)
async function loginById() {
    const codeInput = document.getElementById('empCode');
    const passInput = document.getElementById('password');
    const errorDiv = document.getElementById('errorMessage');

    if (!codeInput || !passInput) return;

    const rawInput = codeInput.value.trim(); 
    const pass = passInput.value.trim();

    if (!rawInput || !pass) { 
        if (errorDiv) errorDiv.innerText = document.body.dir === 'rtl' ? "برجاء إكمال البيانات" : "Please complete data"; 
        return; 
    }

    const btn = document.getElementById('btn-login');
    if (btn) { btn.innerText = "..."; btn.disabled = true; }

    try {
        let loginEmail = rawInput.toLowerCase();

        // الاعتماد الكلي على Employee_Database لجلب الإيميل والصلاحية ومعرف العيادة
        if (!rawInput.includes('@')) {
            const empDoc = await db.collection("Employee_Database").doc(rawInput).get();
            
            if (!empDoc.exists || !empDoc.data().email) {
                throw { code: 'custom/user-not-found' }; 
            }
            
            const empData = empDoc.data();
            loginEmail = empData.email;
            
            // 🔴 [الختم السحري]: حفظ الصلاحية ومعرف العيادة لضمان الخصوصية
            sessionStorage.setItem('userRole', empData.role);
            sessionStorage.setItem('empCode', rawInput);
            sessionStorage.setItem('clinicId', empData.clinicId || 'default'); // حفظ معرف العيادة
        }

        await auth.signInWithEmailAndPassword(loginEmail, pass);

    } catch (error) {
        if (btn) {
            btn.innerText = document.body.dir === 'rtl' ? "تسجيل الدخول" : "Login";
            btn.disabled = false;
        }
        if (errorDiv) {
            const isRtl = document.body.dir === 'rtl';
            if (error.code === 'auth/user-not-found' || error.code === 'custom/user-not-found' || error.code === 'auth/wrong-password') {
                errorDiv.innerText = isRtl ? "خطأ في الكود أو كلمة المرور" : "Error in ID or Password";
            } else {
                errorDiv.innerText = isRtl ? "خطأ في عملية الدخول" : "Login error occurred";
            }
        }
    }
}

// 3. دالة التفعيل (تزرع معرف العيادة في جدول المستخدمين الجديد)
async function activateAccount() {
    const codeRaw = document.getElementById('reg-code').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const realEmail = document.getElementById('reg-email').value.trim().toLowerCase();
    const pass = document.getElementById('reg-pass').value.trim();
    const msg = document.getElementById('reg-msg');

    if(!codeRaw || !phone || !realEmail || !pass) { 
        if(msg) msg.innerText = "برجاء إكمال كافة البيانات"; return; 
    }

    try {
        if(msg) msg.innerText = "جاري فحص البيانات...";

        const empDoc = await db.collection("Employee_Database").doc(codeRaw).get();

        if (!empDoc.exists) {
            if(msg) msg.innerText = "الكود غير مسجل، راجع إدارة النظام"; return;
        }

        const empData = empDoc.data();
        if (empData.phone !== phone) {
            if(msg) msg.innerText = "رقم الموبايل غير مطابق للسجلات"; return;
        }

        if (empData.activated === true) {
            if(msg) msg.innerText = "هذا الحساب مفعل بالفعل"; return;
        }

        if(msg) msg.innerText = "جاري إنشاء الحساب... برجاء الانتظار";

        // 1. إنشاء الحساب في الفايربيز
        await auth.createUserWithEmailAndPassword(realEmail, pass);
        
        // 2. بناء جدول الـ Users (مع إضافة ختم العيادة)
        await db.collection("Users").doc(realEmail).set({
            role: (empData.role || "doctor").toLowerCase().trim(),
            name: empData.name,
            empCode: codeRaw, 
            email: realEmail,
            clinicId: empData.clinicId || 'default' // 🔴 إضافة الختم هنا كمان
        });

        // 3. تحديث جدول الموظفين الأساسي
        await db.collection("Employee_Database").doc(codeRaw).update({ 
            activated: true,
            email: realEmail 
        });

        if(msg) msg.innerText = "تم التفعيل بنجاح! جاري تحويلك...";
        
        setTimeout(() => { window.location.href = "index.html"; }, 1500);

    } catch (error) {
        if(msg) {
            if (error.code === 'auth/email-already-in-use') msg.innerText = "هذا البريد الإلكتروني مستخدم بالفعل";
            else if (error.code === 'auth/invalid-email') msg.innerText = "صيغة البريد الإلكتروني غير صحيحة";
            else msg.innerText = "خطأ: " + error.message;
        }
    }
}

// 4. استعادة كلمة المرور
function openResetModal() {
    document.getElementById('resetEmailInput').value = "";
    document.getElementById('resetModal').style.display = "flex";
}
function closeResetModal() {
    document.getElementById('resetModal').style.display = "none";
}
async function sendResetLink(e) {
    e.preventDefault();
    const email = document.getElementById('resetEmailInput').value;
    const btn = document.getElementById('btn-send-reset');
    const lang = localStorage.getItem('preferredLang') || 'ar';
    
    btn.disabled = true;
    btn.innerText = lang === 'ar' ? "جاري الإرسال..." : "Sending...";
    btn.style.opacity = "0.7";

    try {
        await auth.sendPasswordResetEmail(email);
        alert(lang === 'ar' ? "تم إرسال رابط استعادة كلمة المرور بنجاح! يرجى مراجعة صندوق الوارد الخاص بك (أو مجلد Spam)." : "Password reset link sent successfully! Please check your inbox (or Spam folder).");
        closeResetModal();
    } catch (error) {
        if (error.code === 'auth/user-not-found') alert(lang === 'ar' ? "هذا البريد الإلكتروني غير مسجل في النظام." : "This email is not registered.");
        else if (error.code === 'auth/invalid-email') alert(lang === 'ar' ? "صيغة البريد الإلكتروني غير صحيحة." : "Invalid email format.");
        else alert((lang === 'ar' ? "حدث خطأ: " : "Error: ") + error.message);
    } finally {
        btn.disabled = false;
        btn.innerText = lang === 'ar' ? "إرسال رابط الاستعادة" : "Send Reset Link";
        btn.style.opacity = "1";
    }
}

// 5. نظام الترجمة
function updatePageContent(lang) {
    const translations = {
        ar: {
            title: "تسجيل الدخول - نظام NivaDent", welcome: "أهلاً بك في NivaDent", subLogin: "قم بتسجيل الدخول لإدارة عيادتك",
            code: "كود الدخول أو البريد الإلكتروني", pass: "كلمة المرور", btn: "تسجيل الدخول", newEmp: "حساب جديد؟", actLink: "تفعيل حساب العيادة من هنا",
            brandTitle: "NivaDent", brandDesc: "النظام السحابي الأذكى لإدارة عيادات طب الأسنان. صُمم لرفع كفاءة العيادة، تنظيم المواعيد، وإدارة ملفات المرضى باحترافية وسهولة.",
            feat1: "✔️ ملف طبي ذكي وأشعة", feat2: "✔️ إدارة الجلسات والمواعيد", feat3: "✔️ روشتات وحسابات دقيقة",
            forgotPass: "نسيت كلمة المرور؟", resetTitle: "استعادة كلمة المرور", resetSub: "أدخل بريدك الإلكتروني المسجل لدينا، وسنرسل لك رابطاً لتعيين كلمة مرور جديدة.",
            btnReset: "إرسال رابط الاستعادة", emailPlaceholder: "أدخل البريد الإلكتروني",
            actPageTitle: "تفعيل الحساب - NivaDent", actWelcome: "تفعيل حساب العيادة", actSub: "يرجى إدخال البيانات المسجلة لدى إدارة النظام",
            actCode: "كود الدخول", actPhone: "رقم الموبايل", actPass: "اختر كلمة مرور جديدة", btnAct: "تفعيل الحساب الآن",
            backLoginStr: "لديك حساب بالفعل؟", backLoginLink: "العودة للدخول", brandActTitle: "أهلاً بك في NivaDent",
            brandActDesc: "يسعدنا انضمامك. قم بتفعيل حسابك للوصول إلى لوحة تحكم عيادتك وإدارة مواعيدك وملفات مرضاك بكل سهولة.", actEmail: "البريد الإلكتروني للعيادة"
        },
        en: {
            title: "Login - NivaDent System", welcome: "Welcome to NivaDent", subLogin: "Sign in to manage your clinic",
            code: "Access Code or Email", pass: "Password", btn: "Login", newEmp: "New Account?", actLink: "Activate clinic account here",
            brandTitle: "NivaDent", brandDesc: "The smartest cloud system for dental practice management. Designed to increase efficiency, organize appointments, and manage patient records professionally.",
            feat1: "✔️ Smart Medical Records & X-Rays", feat2: "✔️ Appointments & Sessions Management", feat3: "✔️ E-Prescriptions & Accurate Billing",
            forgotPass: "Forgot Password?", resetTitle: "Reset Password", resetSub: "Enter your registered email, and we will send you a link to set a new password.",
            btnReset: "Send Reset Link", emailPlaceholder: "Enter email address",
            actPageTitle: "Activate Account - NivaDent", actWelcome: "Activate Clinic Account", actSub: "Please enter the data registered with the system administration",
            actCode: "Access Code", actPhone: "Mobile Number", actPass: "Choose a new password", btnAct: "Activate Account Now",
            backLoginStr: "Already have an account?", backLoginLink: "Back to Login", brandActTitle: "Welcome to NivaDent",
            brandActDesc: "We are glad you joined. Activate your account to access your clinic's dashboard, manage appointments, and track patient files easily.", actEmail: "Clinic Email Address"
        }
    };
    const t = translations[lang] || translations['ar'];
    document.body.dir = (lang === 'en') ? 'ltr' : 'rtl';
    const safeSetText = (id, text) => { const el = document.getElementById(id); if (el) el.innerText = text; };

    if (document.title.includes('دخول') || document.title.includes('Login')) document.title = t.title;
    safeSetText('txt-welcome', t.welcome); safeSetText('sub-login', t.subLogin); safeSetText('lbl-code', t.code);
    safeSetText('lbl-pass', t.pass); safeSetText('btn-login', t.btn); safeSetText('txt-new', t.newEmp);
    safeSetText('link-activate', t.actLink); safeSetText('txt-brand', t.brandTitle); safeSetText('brand-desc', t.brandDesc);
    safeSetText('feat-1', t.feat1); safeSetText('feat-2', t.feat2); safeSetText('feat-3', t.feat3);
    safeSetText('link-forgot', t.forgotPass); safeSetText('txt-reset-title', t.resetTitle); safeSetText('txt-reset-sub', t.resetSub);
    safeSetText('btn-send-reset', t.btnReset); const resetInput = document.getElementById('resetEmailInput'); if(resetInput) resetInput.placeholder = t.emailPlaceholder;
    if (document.title.includes('تفعيل') || document.title.includes('Activate')) document.title = t.actPageTitle;
    safeSetText('txt-act-welcome', t.actWelcome); safeSetText('txt-act-sub', t.actSub); safeSetText('lbl-act-code', t.actCode);
    safeSetText('lbl-act-phone', t.actPhone); safeSetText('lbl-act-pass', t.actPass); safeSetText('btn-activate', t.btnAct);
    safeSetText('txt-back-str', t.backLoginStr); safeSetText('link-back-login', t.backLoginLink); safeSetText('brand-act-title', t.brandActTitle);
    safeSetText('brand-act-desc', t.brandActDesc); safeSetText('lbl-act-email', t.actEmail);
}

// 6. دالة إظهار/إخفاء كلمة المرور (العين 👁️)
function togglePasswordVisibility() {
    const passInput = document.getElementById('password');
    const toggleIcon = document.querySelector('.toggle-password');
    if (passInput.type === 'password') {
        passInput.type = 'text';
        toggleIcon.innerText = '🙈';
    } else {
        passInput.type = 'password';
        toggleIcon.innerText = '👁️';
    }
}
