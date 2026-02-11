const auth = firebase.auth();
const db = firebase.firestore();

// 1. دالة تسجيل الدخول بكود الموظف
function loginById() {
    const code = document.getElementById('empCode').value;
    const pass = document.getElementById('password').value;
    const errorDiv = document.getElementById('errorMessage');

    if(!code || !pass) { 
        if (errorDiv) errorDiv.innerText = "برجاء إكمال البيانات"; 
        return; 
    }

    const email = code + "@tamkeen.com";
    const btn = document.getElementById('btn-login');
    
    if (btn) {
        btn.innerText = "...";
        btn.disabled = true;
    }

    auth.signInWithEmailAndPassword(email, pass)
    .then(() => {
        // التوجيه يتم بواسطة المراقب بالأسفل
    })
    .catch((error) => {
        if (btn) {
            btn.innerText = "دخول";
            btn.disabled = false;
        }
        if (errorDiv) errorDiv.innerText = "خطأ في الكود أو كلمة المرور";
    });
}

// 2. دالة تفعيل الحساب لأول مرة
async function activateAccount() {
    const code = document.getElementById('reg-code').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const pass = document.getElementById('reg-pass').value.trim();
    const msg = document.getElementById('reg-msg');

    if(!code || !phone || !pass) { msg.innerText = "أكمل البيانات"; return; }

    try {
        // 1. جلب بيانات الموظف من الـ CSV المرفوع
        const empDoc = await db.collection("Employee_Database").doc(code).get();
        if (!empDoc.exists || empDoc.data().phone !== phone) {
            msg.innerText = "بيانات غير مطابقة للسجلات"; return;
        }

        const empData = empDoc.data();
        const role = empData.role || "employee";
        const email = code + "@tamkeen.com";

        // 2. إنشاء الحساب (هنا الموظف بيصبح Authenticated)
        await auth.createUserWithEmailAndPassword(email, pass);
        
        console.log("تم إنشاء الحساب، جاري تسجيل الصلاحيات لـ " + role);

        // 3. كتابة الصلاحيات (بما إنه بقا مسجل دخول، الـ Rules هتسمح له ينشئ ملفه)
        await db.collection("Users").doc(email).set({ 
            role: role, 
            name: empData.name,
            empCode: code 
        });

        // 4. تحديث حالة الموظف في الجدول الرئيسي
        await db.collection("Employee_Database").doc(code).update({ activated: true });

        alert("تم التفعيل بنجاح! رتبتك: " + role);
        window.location.href = "index.html";

    } catch (error) { 
        console.error(error);
        msg.innerText = "خطأ: " + error.message; 
    }
}

// 3. مراقب الحالة وحماية الصفحات
auth.onAuthStateChanged((user) => {
    const path = window.location.pathname;
    const fileName = path.split("/").pop();
    const isLoginPage = fileName === "index.html" || fileName === "activate.html" || fileName === "" || fileName === "undefined";

    if (user) {
        if (isLoginPage) {
            window.location.href = "home.html";
        }
    } else {
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

// 5. نظام اللغة
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
    
    if (document.getElementById('txt-title')) document.getElementById('txt-title').innerText = t.title;
    if (document.getElementById('txt-brand')) document.getElementById('txt-brand').innerText = t.brand;
    if (document.getElementById('txt-welcome')) document.getElementById('txt-welcome').innerText = t.welcome;
    if (document.getElementById('lbl-code')) document.getElementById('lbl-code').innerText = t.code;
    if (document.getElementById('lbl-pass')) document.getElementById('lbl-pass').innerText = t.pass;
    if (document.getElementById('btn-login')) document.getElementById('btn-login').innerText = t.btn;
    if (document.getElementById('txt-new')) document.getElementById('txt-new').innerText = t.new;
    if (document.getElementById('link-activate')) document.getElementById('link-activate').innerText = t.act;
    
    if (document.getElementById('txt-act-title')) document.getElementById('txt-act-title').innerText = t.actTitle;
    if (document.getElementById('lbl-phone')) document.getElementById('lbl-phone').innerText = t.lblPhone;
    if (document.getElementById('lbl-new-pass')) document.getElementById('lbl-new-pass').innerText = t.lblNewPass;
    if (document.getElementById('btn-activate')) document.getElementById('btn-activate').innerText = t.btnAct;
    if (document.getElementById('link-back')) document.getElementById('link-back').innerText = t.back;
    
    document.body.dir = (lang === 'en') ? 'ltr' : 'rtl';
}
