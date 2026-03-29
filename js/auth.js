// auth.js - نسخة NivaDent السحابية (Multi-Tenant & Dental SaaS) - نسخة السرعة الصاروخية

const auth = firebase.auth();
const db = firebase.firestore();

// 🔴 متغير الفرملة لمنع التحويل التلقائي قبل فحص حالة العيادة
let isLoginInProgress = false; 

// 1. مراقب الحالة
auth.onAuthStateChanged((user) => {
    const path = window.location.pathname;
    const fileName = path.split("/").pop() || "index.html";
    
    if (fileName === "activate.html") return; 

    const isLoginPage = fileName === "index.html" || fileName === "";

    if (user) {
        // لو في صفحة الدخول، متحولوش إلا لو الفحص خلص
        if (isLoginPage && !isLoginInProgress) {
            window.location.href = "home.html";
        }
        if (!isLoginPage) requestNotificationPermission();
    } else {
        if (!isLoginPage) window.location.href = "index.html";
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

// 2. دالة تسجيل الدخول (صاروخية) 🚀
async function loginById() {
    const codeInput = document.getElementById('empCode');
    const passInput = document.getElementById('password');
    const errorDiv = document.getElementById('errorMessage');

    if (!codeInput || !passInput) return;

    const rawInput = codeInput.value.trim().toLowerCase(); 
    const pass = passInput.value.trim();

    if (!rawInput || !pass) { 
        if (errorDiv) errorDiv.innerText = document.body.dir === 'rtl' ? "برجاء إكمال البيانات" : "Please complete data"; 
        return; 
    }

    const btn = document.getElementById('btn-login');
    if (btn) { btn.innerText = "..."; btn.disabled = true; }

    isLoginInProgress = true; // 🔴 إيقاف التحويل التلقائي للمراقب

    try {
        let loginEmail = rawInput;
        let usedCode = rawInput;

        // 1. لو كاتب كود مش إيميل، نجيب الإيميل بتاعه بسرعة
        if (!rawInput.includes('@')) {
            const empDoc = await db.collection("clinicId").doc(rawInput).get();
            if (!empDoc.exists || !empDoc.data().email) throw { code: 'custom/user-not-found' }; 
            loginEmail = empDoc.data().email;
        }

        // 2. تسجيل الدخول الفعلي (بياخد 0.1 ثانية) ⚡
        const userCredential = await auth.signInWithEmailAndPassword(loginEmail, pass);
        const actualEmail = userCredential.user.email;

        // 3. جلب داتا اليوزر الخفيفة بعد الدخول
        const userDoc = await db.collection("Users").doc(actualEmail).get();
        if (!userDoc.exists) throw { code: 'custom/user-not-found' };
        
        const userData = userDoc.data();
        const targetClinicId = userData.clinicId || 'default';
        const finalRole = userData.role;
        if(rawInput.includes('@')) usedCode = userData.empCode || rawInput;

        // 4. الفحص الإجباري لحالة العيادة
        if (targetClinicId !== 'default') {
            const clinicDoc = await db.collection("Clinics").doc(targetClinicId).get();
            if (clinicDoc.exists) {
                const clinicStatus = clinicDoc.data().status;
                const nextPaymentDate = clinicDoc.data().nextPaymentDate ? clinicDoc.data().nextPaymentDate.toDate() : null;
                const now = new Date();

                let isSuspended = false;
                let suspendReason = '';

                // فحص الإيقاف اليدوي
                if (clinicStatus === 'suspended') {
                    isSuspended = true;
                    suspendReason = 'suspended-clinic';
                } 
                // فحص انتهاء الاشتراك التلقائي
                else if (nextPaymentDate && now > nextPaymentDate) {
                    isSuspended = true;
                    suspendReason = 'subscription-expired';
                    // تحديث الحالة في الخلفية عشان منأخرش الدخول
                    db.collection("Clinics").doc(targetClinicId).update({ status: 'suspended' }).catch(console.error);
                }

                // لو موقوفة، اطرده فوراً!
                if (isSuspended) {
                    await auth.signOut();
                    throw { code: 'custom/' + suspendReason };
                }
            }
        }

        // 5. لو كل الفحوصات عدت بسلام، نحفظ الجلسة ونحوله يدوي
        sessionStorage.setItem('userRole', finalRole);
        sessionStorage.setItem('empCode', usedCode);
        sessionStorage.setItem('clinicId', targetClinicId);
        
        window.location.href = "home.html"; 

    } catch (error) {
        // لو حصل خطأ، نتأكد إنه معموله Sign Out عشان ميحصلش تعليق
        await auth.signOut().catch(()=>{}); 
        isLoginInProgress = false; 
        
        if (btn) {
            btn.innerText = document.body.dir === 'rtl' ? "تسجيل الدخول" : "Login";
            btn.disabled = false;
        }
        if (errorDiv) {
            const isRtl = document.body.dir === 'rtl';
            
            if (error.code === 'custom/suspended-clinic') {
                errorDiv.innerText = isRtl ? "عفواً، حساب هذه العيادة موقوف مؤقتاً." : "Account suspended.";
            } else if (error.code === 'custom/subscription-expired') {
                errorDiv.innerText = isRtl ? "عفواً، انتهت فترة الاشتراك." : "Subscription expired.";
            } else if (error.code === 'auth/user-not-found' || error.code === 'custom/user-not-found' || error.code === 'auth/wrong-password') {
                errorDiv.innerText = isRtl ? "خطأ في الكود أو كلمة المرور" : "Error in ID or Password";
            } else {
                errorDiv.innerText = isRtl ? "خطأ في عملية الدخول" : "Login error occurred";
            }
        }
    }
}

// باقي الدوال (activateAccount, resetPassword, etc.) تفضل زي ما هي عشان مفيهاش مشاكل
async function activateAccount() {
    const codeRaw = document.getElementById('reg-code').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const realEmail = document.getElementById('reg-email').value.trim().toLowerCase();
    const pass = document.getElementById('reg-pass').value.trim();
    const msg = document.getElementById('reg-msg');

    if(!codeRaw || !phone || !realEmail || !pass) { 
        if(msg) msg.innerText = document.body.dir === 'rtl' ? "برجاء إكمال كافة البيانات" : "Please complete all fields"; 
        return; 
    }

    try {
        if(msg) msg.innerText = document.body.dir === 'rtl' ? "جاري فحص البيانات..." : "Checking data...";

        const empDoc = await db.collection("clinicId").doc(codeRaw).get();

        if (!empDoc.exists) {
            if(msg) msg.innerText = document.body.dir === 'rtl' ? "الكود غير مسجل، راجع إدارة النظام" : "Code not registered, contact admin"; 
            return;
        }

        const empData = empDoc.data();
        if (empData.phone !== phone) {
            if(msg) msg.innerText = document.body.dir === 'rtl' ? "رقم الموبايل غير مطابق للسجلات" : "Phone number does not match records"; 
            return;
        }

        if (empData.activated === true) {
            if(msg) msg.innerText = document.body.dir === 'rtl' ? "هذا الحساب مفعل بالفعل" : "Account already activated"; 
            return;
        }

        if(msg) msg.innerText = document.body.dir === 'rtl' ? "جاري إنشاء الحساب... برجاء الانتظار" : "Creating account... Please wait";

        await auth.createUserWithEmailAndPassword(realEmail, pass);
        
        await db.collection("Users").doc(realEmail).set({
            role: (empData.role || "doctor").toLowerCase().trim(),
            name: empData.name,
            empCode: codeRaw, 
            email: realEmail,
            clinicId: empData.clinicId || 'default'
        });

        await db.collection("clinicId").doc(codeRaw).update({ 
            activated: true,
            email: realEmail 
        });

        if(msg) msg.innerText = document.body.dir === 'rtl' ? "تم التفعيل بنجاح! جاري تحويلك..." : "Activation successful! Redirecting...";
        
        setTimeout(() => { window.location.href = "index.html"; }, 1500);

    } catch (error) {
        if(msg) {
            const isRtl = document.body.dir === 'rtl';
            if (error.code === 'auth/email-already-in-use') {
                msg.innerText = isRtl ? "هذا البريد الإلكتروني مستخدم بالفعل" : "Email already in use";
            } else if (error.code === 'auth/invalid-email') {
                msg.innerText = isRtl ? "صيغة البريد الإلكتروني غير صحيحة" : "Invalid email format";
            } else {
                msg.innerText = (isRtl ? "خطأ: " : "Error: ") + error.message;
            }
        }
    }
}

function openResetModal() {
    const emailInput = document.getElementById('resetEmailInput');
    const modal = document.getElementById('resetModal');
    if (emailInput) emailInput.value = "";
    if (modal) modal.style.display = "flex";
}

function closeResetModal() {
    const modal = document.getElementById('resetModal');
    if (modal) modal.style.display = "none";
}

async function sendResetLink(e) {
    e.preventDefault();
    const email = document.getElementById('resetEmailInput').value;
    const btn = document.getElementById('btn-send-reset');
    const lang = localStorage.getItem('preferredLang') || 'ar';
    
    if (btn) {
        btn.disabled = true;
        btn.innerText = lang === 'ar' ? "جاري الإرسال..." : "Sending...";
        btn.style.opacity = "0.7";
    }

    try {
        await auth.sendPasswordResetEmail(email);
        alert(lang === 'ar' ? "تم إرسال رابط استعادة كلمة المرور بنجاح! يرجى مراجعة صندوق الوارد الخاص بك (أو مجلد Spam)." : "Password reset link sent successfully! Please check your inbox (or Spam folder).");
        closeResetModal();
    } catch (error) {
        if (error.code === 'auth/user-not-found') alert(lang === 'ar' ? "هذا البريد الإلكتروني غير مسجل في النظام." : "This email is not registered.");
        else if (error.code === 'auth/invalid-email') alert(lang === 'ar' ? "صيغة البريد الإلكتروني غير صحيحة." : "Invalid email format.");
        else alert((lang === 'ar' ? "حدث خطأ: " : "Error: ") + error.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerText = lang === 'ar' ? "إرسال رابط الاستعادة" : "Send Reset Link";
            btn.style.opacity = "1";
        }
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

function togglePasswordVisibility() {
    const passInput = document.getElementById('password');
    const toggleIcon = document.querySelector('.toggle-password');
    if (passInput && toggleIcon) {
        if (passInput.type === 'password') {
            passInput.type = 'text';
            toggleIcon.innerText = '🙈';
        } else {
            passInput.type = 'password';
            toggleIcon.innerText = '👁️';
        }
    }
}
