// auth.js - Al Dokan ERP Cloud System - With 3-Day Trial Logic & Security

const auth = firebase.auth();
const db = firebase.firestore();

let isLoginInProgress = false; 

// 1. مراقب الحالة
auth.onAuthStateChanged((user) => {
    const path = window.location.pathname;
    const fileName = path.split("/").pop() || "index.html";
    
    if (fileName === "activate.html") return; 

    const isLoginPage = fileName === "index.html" || fileName === "";

    if (user) {
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

async function logout() {
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.email) {
        try {
            await db.collection("Users").doc(currentUser.email).update({
                isOnline: false,
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) { console.error("Error setting offline status:", e); }
    }
    
    await auth.signOut();
    sessionStorage.clear();
    localStorage.removeItem('lastActiveNiva');
    window.location.href = "index.html";
}

window.addEventListener('beforeunload', () => {
    const currentUser = auth.currentUser;
    if (currentUser && window.location.pathname.includes("home.html")) {
        db.collection("Users").doc(currentUser.email).update({
            isOnline: false
        }).catch(()=>{});
    }
});

// 2. دالة تسجيل الدخول (الأساسية)
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

    isLoginInProgress = true; 
    
    if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري التحقق من البيانات..." : "Checking credentials...");

    try {
        let loginEmail = rawInput;
        let usedCode = rawInput;

        if (!rawInput.includes('@')) {
            const empDoc = await db.collection("clinicId").doc(rawInput).get();
            if (!empDoc.exists || !empDoc.data().email) throw { code: 'custom/user-not-found' }; 
            loginEmail = empDoc.data().email;
        }

        await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);

        const userCredential = await auth.signInWithEmailAndPassword(loginEmail, pass);
        const actualEmail = userCredential.user.email;

        const userDoc = await db.collection("Users").doc(actualEmail).get();
        if (!userDoc.exists) throw { code: 'custom/user-not-found' };
        
        const userData = userDoc.data();
        const targetClinicId = userData.clinicId || 'default';
        const finalRole = userData.role;
        if(rawInput.includes('@')) usedCode = userData.empCode || rawInput;

        if (targetClinicId !== 'default' && finalRole !== 'superadmin') {
            const clinicDoc = await db.collection("Clinics").doc(targetClinicId).get();
            if (clinicDoc.exists) {
                const clinicStatus = clinicDoc.data().status;
                const nextPaymentDate = clinicDoc.data().nextPaymentDate ? clinicDoc.data().nextPaymentDate.toDate() : null;
                const now = new Date();

                let isSuspended = false;
                let suspendReason = '';

                if (clinicStatus === 'suspended') {
                    isSuspended = true;
                    suspendReason = 'suspended-clinic';
                } 
                else if (nextPaymentDate && now > nextPaymentDate) {
                    isSuspended = true;
                    suspendReason = 'subscription-expired';
                    db.collection("Clinics").doc(targetClinicId).update({ status: 'suspended' }).catch(console.error);
                }

                if (isSuspended) {
                    await auth.signOut();
                    throw { code: 'custom/' + suspendReason };
                }
            }
        }

        await db.collection("Users").doc(actualEmail).update({
            isOnline: true,
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });

        sessionStorage.setItem('userRole', finalRole);
        sessionStorage.setItem('empCode', usedCode);
        sessionStorage.setItem('clinicId', targetClinicId);
        
        window.location.href = "home.html"; 

    } catch (error) {
        if (window.hideLoader) window.hideLoader();
        
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
                errorDiv.innerText = isRtl ? "خطأ في البريد/الكود أو كلمة المرور" : "Error in Email/Code or Password";
            } else {
                errorDiv.innerText = isRtl ? "خطأ في عملية الدخول" : "Login error occurred";
            }
        }
    }
}

// ==========================================
// 🔴 إنشاء حساب تجريبي مجاني (3 أيام) 🔴
// ==========================================
function openTrialModal() {
    document.getElementById('trial_clinic_name').value = '';
    document.getElementById('trial_admin_name').value = '';
    document.getElementById('trial_phone').value = '';
    document.getElementById('trial_email').value = '';
    document.getElementById('trial_password').value = '';
    document.getElementById('trialModal').style.display = 'flex';
}

function closeTrialModal() {
    document.getElementById('trialModal').style.display = 'none';
}

async function registerTrialAccount(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-trial');
    btn.disabled = true;
    btn.innerText = "جاري إنشاء العيادة...";

    const clinicName = document.getElementById('trial_clinic_name').value.trim();
    const adminName = document.getElementById('trial_admin_name').value.trim();
    const phone = document.getElementById('trial_phone').value.trim();
    const email = document.getElementById('trial_email').value.trim().toLowerCase();
    const password = document.getElementById('trial_password').value;

    if (window.showLoader) window.showLoader("جاري تجهيز النظام لك...");

    try {
        await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const actualEmail = userCredential.user.email;

        // 3 أيام فترة تجريبية
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 3);

        const clinicRef = await db.collection("Clinics").add({
            clinicName: clinicName,
            adminEmail: actualEmail,
            phone1: phone,
            status: 'active',
            planType: 'trial_3_days', 
            nextPaymentDate: firebase.firestore.Timestamp.fromDate(expirationDate),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        const newClinicId = clinicRef.id;

        await db.collection("Users").doc(actualEmail).set({
            role: 'admin',
            name: adminName,
            empCode: 'TRIAL-ADMIN', 
            email: actualEmail,
            clinicId: newClinicId,
            isOnline: true,
            lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        sessionStorage.setItem('userRole', 'admin');
        sessionStorage.setItem('empCode', 'TRIAL-ADMIN');
        sessionStorage.setItem('clinicId', newClinicId);

        isLoginInProgress = true;
        
        if (window.hideLoader) window.hideLoader();
        alert(`✅ مبروك يا ${adminName}!\nتم تفعيل العيادة بنجاح. فترة التجربة هتنتهي يوم ${expirationDate.toLocaleDateString('ar-EG')}`);
        window.location.href = "home.html";

    } catch (error) {
        console.error("Trial Registration Error:", error);
        if (window.hideLoader) window.hideLoader();
        btn.disabled = false;
        btn.innerText = "إنشاء الحساب وبدء التجربة";
        
        if (error.code === 'auth/email-already-in-use') {
            alert("❌ هذا البريد مسجل بالفعل في النظام.");
        } else if (error.code === 'auth/weak-password') {
            alert("❌ كلمة المرور ضعيفة جداً.");
        } else {
            alert("❌ حدث خطأ أثناء التسجيل: " + error.message);
        }
    }
}

// ==========================================
// باقي دوال الممرضة والتفعيل والاستعادة
// ==========================================
function openStaffModal() {
    document.getElementById('staffInviteCode').value = '';
    document.getElementById('staffEmail').value = '';
    document.getElementById('staffPassword').value = '';
    document.getElementById('staffModal').style.display = 'flex';
}

function closeStaffModal() {
    document.getElementById('staffModal').style.display = 'none';
}

async function activateStaffAccount(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-activate-staff');
    btn.disabled = true;
    btn.innerText = "جاري فحص الكود والتفعيل...";

    const inviteCode = document.getElementById('staffInviteCode').value.trim().toUpperCase(); 
    const newEmail = document.getElementById('staffEmail').value.trim().toLowerCase();
    const newPassword = document.getElementById('staffPassword').value.trim();

    if (window.showLoader) window.showLoader("جاري فحص الكود...");

    try {
        const inviteDoc = await db.collection("InviteCodes").doc(inviteCode).get();

        if (!inviteDoc.exists) {
            if (window.hideLoader) window.hideLoader();
            alert("❌ كود الدعوة غير صحيح أو غير مسجل في النظام.");
            btn.disabled = false; btn.innerText = "تفعيل الحساب والدخول";
            return;
        }

        const inviteData = inviteDoc.data();

        if (inviteData.activated) {
            if (window.hideLoader) window.hideLoader();
            alert("❌ هذا الكود تم استخدامه وتفعيله مسبقاً.");
            btn.disabled = false; btn.innerText = "تفعيل الحساب والدخول";
            return;
        }

        isLoginInProgress = true;
        if (window.showLoader) window.showLoader("جاري تفعيل الحساب...");

        await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
        await auth.createUserWithEmailAndPassword(newEmail, newPassword);

        await db.collection("Users").doc(newEmail).set({
            name: inviteData.name,
            email: newEmail,
            role: inviteData.role, 
            clinicId: inviteData.clinicId,
            empCode: inviteCode,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            isOnline: true,
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });

        await db.collection("InviteCodes").doc(inviteCode).update({
            activated: true,
            activatedByEmail: newEmail,
            activatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        sessionStorage.setItem('userRole', inviteData.role);
        sessionStorage.setItem('empCode', inviteCode);
        sessionStorage.setItem('clinicId', inviteData.clinicId);

        if (window.hideLoader) window.hideLoader();
        alert(`✅ تم تفعيل الحساب بنجاح يا ${inviteData.name}!\nجاري تحويلك للعيادة...`);
        
        if (window.showLoader) window.showLoader("جاري التحويل...");
        window.location.href = "home.html";

    } catch (error) {
        if (window.hideLoader) window.hideLoader();
        console.error("Staff Activation Error:", error);
        isLoginInProgress = false;
        btn.disabled = false; btn.innerText = "تفعيل الحساب والدخول";
        
        if (error.code === 'auth/email-already-in-use') {
            alert("❌ هذا البريد الإلكتروني مستخدم بالفعل في حساب آخر.");
        } else if (error.code === 'auth/weak-password') {
            alert("❌ كلمة المرور ضعيفة، يجب أن تكون 6 أحرف على الأقل.");
        } else {
            alert("❌ حدث خطأ أثناء التفعيل: " + error.message);
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

    if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري فحص البيانات..." : "Checking data...");

    try {
        if(msg) msg.innerText = document.body.dir === 'rtl' ? "جاري فحص البيانات..." : "Checking data...";

        const empDoc = await db.collection("clinicId").doc(codeRaw).get();

        if (!empDoc.exists) {
            if(window.hideLoader) window.hideLoader();
            if(msg) msg.innerText = document.body.dir === 'rtl' ? "الكود غير مسجل، راجع إدارة النظام" : "Code not registered, contact admin"; 
            return;
        }

        const empData = empDoc.data();
        if (empData.phone !== phone) {
            if(window.hideLoader) window.hideLoader();
            if(msg) msg.innerText = document.body.dir === 'rtl' ? "رقم الموبايل غير مطابق للسجلات" : "Phone number does not match records"; 
            return;
        }

        if (empData.activated === true) {
            if(window.hideLoader) window.hideLoader();
            if(msg) msg.innerText = document.body.dir === 'rtl' ? "هذا الحساب مفعل بالفعل" : "Account already activated"; 
            return;
        }

        if(window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري إنشاء الحساب..." : "Creating account...");
        if(msg) msg.innerText = document.body.dir === 'rtl' ? "جاري إنشاء الحساب... برجاء الانتظار" : "Creating account... Please wait";

        await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);

        await auth.createUserWithEmailAndPassword(realEmail, pass);
        
        await db.collection("Users").doc(realEmail).set({
            role: (empData.role || "admin").toLowerCase().trim(),
            name: empData.name,
            empCode: codeRaw, 
            email: realEmail,
            clinicId: empData.clinicId || 'default'
        });

        await db.collection("clinicId").doc(codeRaw).update({ 
            activated: true,
            email: realEmail 
        });

        if(window.hideLoader) window.hideLoader();
        if(msg) msg.innerText = document.body.dir === 'rtl' ? "تم التفعيل بنجاح! جاري تحويلك..." : "Activation successful! Redirecting...";
        
        setTimeout(() => { 
            if(window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري التحويل..." : "Redirecting...");
            window.location.href = "index.html"; 
        }, 1500);

    } catch (error) {
        if(window.hideLoader) window.hideLoader();
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

// ... (باقي أكواد auth.js كما هي في الأعلى الخاصة بالـ Login والـ Trial) ...

function updatePageContent(lang) {
    const currentYear = new Date().getFullYear(); // بيجيب السنة أوتوماتيك
    const translations = {
        ar: {
            title: "تسجيل الدخول - نظام NivaDent", welcome: "أهلاً بك في NivaDent", subLogin: "قم بتسجيل الدخول لإدارة عيادتك",
            code: "البريد الإلكتروني أو كود العيادة", pass: "كلمة المرور", btn: "تسجيل الدخول", newEmp: "حساب جديد؟", actLink: "تفعيل حساب العيادة من هنا",
            brandTitle: "NivaDent", brandDesc: "النظام السحابي الأذكى لإدارة عيادات طب الأسنان من إنتاج Al Dokan ERP. صُمم لرفع كفاءة العيادة، تنظيم المواعيد، وإدارة ملفات المرضى باحترافية وسهولة.",
            feat1: "✔️ ملف طبي ذكي وأشعة", feat2: "✔️ إدارة الجلسات والمواعيد", feat3: "✔️ روشتات وحسابات دقيقة",
            forgotPass: "نسيت كلمة المرور؟", resetTitle: "استعادة كلمة المرور", resetSub: "أدخل بريدك الإلكتروني المسجل لدينا، وسنرسل لك رابطاً لتعيين كلمة مرور جديدة.",
            btnReset: "إرسال رابط الاستعادة", emailPlaceholder: "أدخل البريد الإلكتروني",
            actPageTitle: "تفعيل الحساب - NivaDent", actWelcome: "تفعيل حساب العيادة", actSub: "يرجى إدخال البيانات المسجلة لدى إدارة النظام",
            actCode: "كود الدخول", actPhone: "رقم الموبايل", actPass: "اختر كلمة مرور جديدة", btnAct: "تفعيل الحساب الآن",
            backLoginStr: "لديك حساب بالفعل؟", backLoginLink: "العودة للدخول", brandActTitle: "أهلاً بك في NivaDent",
            brandActDesc: "يسعدنا انضمامك. قم بتفعيل حسابك للوصول إلى لوحة تحكم عيادتك وإدارة مواعيدك وملفات مرضاك بكل سهولة.", actEmail: "البريد الإلكتروني للعيادة",
            
            // 🔴 التحديثات الجديدة (التجربة وحقوق الملكية) 🔴
            staffInvite: "🔑 لدي كود دعوة (تفعيل حساب موظف)",
            btnTrialTxt: "ابدأ فترة تجريبية مجانية (3 أيام)",
            copyright: `© ${currentYear} Al Dokan ERP. جميع الحقوق محفوظة.`,
            privacy: "سياسة الخصوصية والتأمين (Privacy Policy)",
            poweredBy: "Powered by",
            mTrialTitle: "🚀 إنشاء حساب تجريبي",
            mTrialSub: "جرب النظام بكامل مميزاته مجاناً لمدة 3 أيام",
            lTClinic: "اسم العيادة", pTClinic: "مثال: عيادة النور لطب الأسنان",
            lTAdmin: "اسم الطبيب / المدير", pTAdmin: "الاسم بالكامل",
            lTPhone: "رقم الموبايل للتواصل", pTPhone: "01xxxxxxxxx",
            lTEmail: "البريد الإلكتروني (للدخول)", pTEmail: "clinic@example.com",
            lTPass: "كلمة المرور (6 أحرف أو أكثر)", pTPass: "********",
            btnSubmitTrial: "إنشاء الحساب وبدء التجربة"
        },
        en: {
            title: "Login - NivaDent System", welcome: "Welcome to NivaDent", subLogin: "Sign in to manage your clinic",
            code: "Email or Access Code", pass: "Password", btn: "Login", newEmp: "New Account?", actLink: "Activate clinic account here",
            brandTitle: "NivaDent", brandDesc: "The smartest cloud system for dental practice management powered by Al Dokan ERP. Designed to increase efficiency, organize appointments, and manage patient records professionally.",
            feat1: "✔️ Smart Medical Records & X-Rays", feat2: "✔️ Appointments & Sessions Management", feat3: "✔️ E-Prescriptions & Accurate Billing",
            forgotPass: "Forgot Password?", resetTitle: "Reset Password", resetSub: "Enter your registered email, and we will send you a link to set a new password.",
            btnReset: "Send Reset Link", emailPlaceholder: "Enter email address",
            actPageTitle: "Activate Account - NivaDent", actWelcome: "Activate Clinic Account", actSub: "Please enter the data registered with the system administration",
            actCode: "Access Code", actPhone: "Mobile Number", actPass: "Choose a new password", btnAct: "Activate Account Now",
            backLoginStr: "Already have an account?", backLoginLink: "Back to Login", brandActTitle: "Welcome to NivaDent",
            brandActDesc: "We are glad you joined. Activate your account to access your clinic's dashboard, manage appointments, and track patient files easily.", actEmail: "Clinic Email Address",
            
            // 🔴 New Updates (Trial & Copyright) 🔴
            staffInvite: "🔑 I have an invite code (Staff)",
            btnTrialTxt: "Start Free Trial (3 Days)",
            copyright: `© ${currentYear} Al Dokan ERP. All rights reserved.`,
            privacy: "Privacy Policy & Security",
            poweredBy: "Powered by",
            mTrialTitle: "🚀 Create Trial Account",
            mTrialSub: "Try full features free for 3 days",
            lTClinic: "Clinic Name", pTClinic: "e.g., Al-Nour Dental Clinic",
            lTAdmin: "Doctor / Admin Name", pTAdmin: "Full Name",
            lTPhone: "Contact Phone", pTPhone: "01xxxxxxxxx",
            lTEmail: "Email (For Login)", pTEmail: "clinic@example.com",
            lTPass: "Password (Min 6 chars)", pTPass: "********",
            btnSubmitTrial: "Create Account & Start Trial"
        }
    };
    const t = translations[lang] || translations['ar'];
    document.body.dir = (lang === 'en') ? 'ltr' : 'rtl';
    const safeSetText = (id, text) => { const el = document.getElementById(id); if (el) el.innerText = text; };
    const safeSetPlaceholder = (id, text) => { const el = document.getElementById(id); if (el) el.placeholder = text; };

    if (document.title.includes('دخول') || document.title.includes('Login')) document.title = t.title;
    safeSetText('txt-welcome', t.welcome); safeSetText('sub-login', t.subLogin); safeSetText('lbl-code', t.code);
    safeSetText('lbl-pass', t.pass); safeSetText('btn-login', t.btn); safeSetText('txt-new', t.newEmp);
    safeSetText('link-activate', t.actLink); safeSetText('txt-brand', t.brandTitle); safeSetText('brand-desc', t.brandDesc);
    safeSetText('feat-1', t.feat1); safeSetText('feat-2', t.feat2); safeSetText('feat-3', t.feat3);
    safeSetText('link-forgot', t.forgotPass); safeSetText('txt-reset-title', t.resetTitle); safeSetText('txt-reset-sub', t.resetSub);
    safeSetText('btn-send-reset', t.btnReset); safeSetPlaceholder('resetEmailInput', t.emailPlaceholder);
    if (document.title.includes('تفعيل') || document.title.includes('Activate')) document.title = t.actPageTitle;
    safeSetText('txt-act-welcome', t.actWelcome); safeSetText('txt-act-sub', t.actSub); safeSetText('lbl-act-code', t.actCode);
    safeSetText('lbl-act-phone', t.actPhone); safeSetText('lbl-act-pass', t.actPass); safeSetText('btn-activate', t.btnAct);
    safeSetText('txt-back-str', t.backLoginStr); safeSetText('link-back-login', t.backLoginLink); safeSetText('brand-act-title', t.brandActTitle);
    safeSetText('brand-act-desc', t.brandActDesc); safeSetText('lbl-act-email', t.actEmail);
    
    // تطبيق ترجمات الجزء الجديد
    safeSetText('txt-staff-invite', t.staffInvite);
    safeSetText('btn-trial-txt', t.btnTrialTxt);
    safeSetText('txt-copyright', t.copyright);
    safeSetText('link-privacy', t.privacy);
    safeSetText('txt-powered', t.poweredBy);
    
    safeSetText('mod-trial-title', t.mTrialTitle);
    safeSetText('mod-trial-sub', t.mTrialSub);
    safeSetText('lbl-t-clinic', t.lTClinic); safeSetPlaceholder('trial_clinic_name', t.pTClinic);
    safeSetText('lbl-t-admin', t.lTAdmin); safeSetPlaceholder('trial_admin_name', t.pTAdmin);
    safeSetText('lbl-t-phone', t.lTPhone); safeSetPlaceholder('trial_phone', t.pTPhone);
    safeSetText('lbl-t-email', t.lTEmail); safeSetPlaceholder('trial_email', t.pTEmail);
    safeSetText('lbl-t-pass', t.lTPass); safeSetPlaceholder('trial_password', t.pTPass);
    safeSetText('btn-submit-trial', t.btnSubmitTrial);
}
// ... (باقي الدوال كما هي) ...

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
