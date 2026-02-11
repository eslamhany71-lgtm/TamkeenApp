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

// 2. دالة تفعيل الحساب لأول مرة (النسخة المضمونة)
async function activateAccount() {
    const code = document.getElementById('reg-code').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const pass = document.getElementById('reg-pass').value.trim();
    const msg = document.getElementById('reg-msg');

    if(!code || !phone || !pass) { 
        msg.innerText = "برجاء إكمال البيانات"; return; 
    }

    try {
        // 1. جلب بيانات الموظف من الجدول المرفوع
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

        // 2. إنشاء الحساب في الـ Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, pass);
        
        // 3. كتابة الصلاحيات في جدول Users (المهمة جداً)
        // بنستخدم await هنا عشان نضمن إنه مش هيتحرك للسطر اللي بعده غير لما يخلص كتابة
        await db.collection("Users").doc(email).set({
            role: role,
            name: empData.name,
            empCode: code,
            email: email
        });

        // 4. تحديث حالة التفعيل في جدول الموظفين
        await db.collection("Employee_Database").doc(code).update({
            activated: true
        });

        // 5. تأكيد نهائي قبل التحويل
        msg.innerText = "تم التفعيل بنجاح! جاري تحويلك...";
        
        setTimeout(() => {
            alert("تم التفعيل بنجاح بصلاحية: " + role);
            window.location.href = "index.html";
        }, 1500); // بنستنى ثانية ونصف عشان نضمن إن الداتا سمعت في السيرفر

    } catch (error) {
        console.error("خطأ التفعيل:", error);
        msg.innerText = "خطأ: " + error.message;
    }
}

// 3. مراقب الحالة وحماية الصفحات (Observer)
auth.onAuthStateChanged((user) => {
    const path = window.location.pathname;
    const fileName = path.split("/").pop();
    // تحديد صفحات الدخول
    const isLoginPage = fileName === "index.html" || fileName === "activate.html" || fileName === "" || fileName === "undefined";

    if (user) {
        // لو مسجل دخول وهو في صفحة الدخول، ابعته للهوم
        if (isLoginPage) {
            window.location.href = "home.html";
        }
    } else {
        // لو مش مسجل وهو في صفحة حماية، ارجع للدخول
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

// 5. نظام اللغة الكامل (Login & Activate)
function updatePageContent(lang) {
    const translations = {
        ar: {
            title: "دخول - نظام تمكين", brand: "تمكين للتمويل", welcome: "تسجيل الدخول", code: "كود الموظف", pass: "كلمة المرور", btn: "دخول", new: "موظف جديد؟", act: "تفعيل الحساب",
            actTitle: "تفعيل الحساب (للموظفين الجدد)", lblPhone: "رقم الموبايل", lblNewPass: "اختر كلمة مرور جديدة", btnAct: "تفعيل الحساب الآن", back: "العودة للدخول"
        },
        en: {
            title: "Login - Tamkeen", brand: "Tamkeen Finance", welcome: "User Login", code: "Employee ID", pass: "Password", btn: "Login", new: "New Employee?", act: "Activate Account",
            actTitle: "Account Activation", lblPhone: "Mobile Number", lblNewPass: "New Password", btnAct: "Activate Now", back: "Back to Login"
        }
    };

    const t = translations[lang];
    
    // عناصر صفحة الدخول (index.html)
    if (document.getElementById('txt-title')) document.getElementById('txt-title').innerText = t.title;
    if (document.getElementById('txt-brand')) document.getElementById('txt-brand').innerText = t.brand;
    if (document.getElementById('txt-welcome')) document.getElementById('txt-welcome').innerText = t.welcome;
    if (document.getElementById('lbl-code')) document.getElementById('lbl-code').innerText = t.code;
    if (document.getElementById('lbl-pass')) document.getElementById('lbl-pass').innerText = t.pass;
    if (document.getElementById('btn-login')) document.getElementById('btn-login').innerText = t.btn;
    if (document.getElementById('txt-new')) document.getElementById('txt-new').innerText = t.new;
    if (document.getElementById('link-activate')) document.getElementById('link-activate').innerText = t.act;
    
    // عناصر صفحة التفعيل (activate.html)
    if (document.getElementById('txt-act-title')) document.getElementById('txt-act-title').innerText = t.actTitle;
    if (document.getElementById('lbl-phone')) document.getElementById('lbl-phone').innerText = t.lblPhone;
    if (document.getElementById('lbl-new-pass')) document.getElementById('lbl-new-pass').innerText = t.lblNewPass;
    if (document.getElementById('btn-activate')) document.getElementById('btn-activate').innerText = t.btnAct;
    if (document.getElementById('link-back')) document.getElementById('link-back').innerText = t.back;
    
    document.body.dir = (lang === 'en') ? 'ltr' : 'rtl';
}
