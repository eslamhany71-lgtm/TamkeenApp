// auth.js - النسخة الشاملة (Login + Activation + Multi-Page Translation + Notifications Permission + Forgot Password)

const auth = firebase.auth();
const db = firebase.firestore();

// 1. مراقب الحالة (التحقق من تسجيل الدخول وتوجيه المستخدم)
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
        sessionStorage.clear();
        window.location.href = "index.html";
    }).catch((error) => {
        console.error("Logout Error:", error);
    });
}

// 3. دالة تسجيل الدخول (محدثة للبحث عن الإيميل الحقيقي باستخدام الكود)
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

        // لو المستخدم مدخلش إيميل (يعني دخل كود الموظف زي At 6651)
        if (!rawInput.includes('@')) {
            // نروح ندور على الإيميل الحقيقي بتاعه المربوط بالكود ده في قاعدة البيانات
            const userQuery = await db.collection("Users").where("empCode", "==", rawInput).get();
            
            if (userQuery.empty) {
                throw { code: 'custom/user-not-found' }; // لو الكود مش موجود نطلع خطأ
            }
            // استخراج الإيميل الحقيقي
            loginEmail = userQuery.docs[0].data().email;
        }

        // تسجيل الدخول بالإيميل الحقيقي اللي جبناه (أو اللي هو كتبه)
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

// 4. دالة التفعيل الكاملة (محدثة لاستخدام الإيميل الحقيقي)
async function activateAccount() {
    const codeRaw = document.getElementById('reg-code').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const realEmail = document.getElementById('reg-email').value.trim().toLowerCase(); // 👈 الإيميل الحقيقي
    const pass = document.getElementById('reg-pass').value.trim();
    const msg = document.getElementById('reg-msg');

    if(!codeRaw || !phone || !realEmail || !pass) { 
        if(msg) msg.innerText = "برجاء إكمال كافة البيانات"; return; 
    }

    try {
        if(msg) msg.innerText = "جاري فحص البيانات...";

        // التأكد من كود الموظف
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

        // أ- إنشاء الحساب بالإيميل الحقيقي بدل الإيميل الوهمي
        await auth.createUserWithEmailAndPassword(realEmail, pass);
        
        // ب- حفظ بيانات المستخدم متضمنة الإيميل الحقيقي للرجوع إليها وقت الدخول
        await db.collection("Users").doc(realEmail).set({
            role: (empData.role || "employee").toLowerCase().trim(),
            name: empData.name,
            empCode: codeRaw, 
            email: realEmail // 👈 حفظنا الإيميل هنا
        });

        // ج- تحديث حالة التفعيل
        await db.collection("Employee_Database").doc(codeRaw).update({ activated: true });

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

// 5. استعادة كلمة المرور (جديد)
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
        if (error.code === 'auth/user-not-found') {
            alert(lang === 'ar' ? "هذا البريد الإلكتروني غير مسجل في النظام." : "This email is not registered.");
        } else if (error.code === 'auth/invalid-email') {
            alert(lang === 'ar' ? "صيغة البريد الإلكتروني غير صحيحة." : "Invalid email format.");
        } else {
            alert((lang === 'ar' ? "حدث خطأ: " : "Error: ") + error.message);
        }
    } finally {
        btn.disabled = false;
        btn.innerText = lang === 'ar' ? "إرسال رابط الاستعادة" : "Send Reset Link";
        btn.style.opacity = "1";
    }
}

// 6. نظام الترجمة الشامل 
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
            forgotPass: "نسيت كلمة المرور؟",
            resetTitle: "استعادة كلمة المرور",
            resetSub: "أدخل بريدك الإلكتروني المسجل لدينا، وسنرسل لك رابطاً لتعيين كلمة مرور جديدة.",
            btnReset: "إرسال رابط الاستعادة",
            emailPlaceholder: "أدخل البريد الإلكتروني",
            
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
            brandActDesc: "يسعدنا انضمامك لفريق تمكين. قم بتفعيل حسابك للوصول إلى لوحة التحكم الخاصة بك ومتابعة مهامك بكل سهولة.",
            actEmail: "البريد الإلكتروني الشخصي",
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
            forgotPass: "Forgot Password?",
            resetTitle: "Reset Password",
            resetSub: "Enter your registered email, and we will send you a link to set a new password.",
            btnReset: "Send Reset Link",
            emailPlaceholder: "Enter email address",
            
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
            brandActDesc: "We are glad you joined Tamkeen. Activate your account to access your dashboard and track your tasks easily.",
            actEmail: "Personal Email Address",
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
    
    // ترجمة نصوص نسيت كلمة المرور
    safeSetText('link-forgot', t.forgotPass);
    safeSetText('txt-reset-title', t.resetTitle);
    safeSetText('txt-reset-sub', t.resetSub);
    safeSetText('btn-send-reset', t.btnReset);
    const resetInput = document.getElementById('resetEmailInput');
    if(resetInput) resetInput.placeholder = t.emailPlaceholder;

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
