const auth = firebase.auth();
const db = firebase.firestore();

// 1. دالة تسجيل الدخول بكود الموظف
function loginById() {
    const code = document.getElementById('empCode').value;
    const pass = document.getElementById('password').value;
    const errorDiv = document.getElementById('errorMessage');

    if(!code || !pass) { 
        errorDiv.innerText = document.body.dir === 'rtl' ? "أكمل البيانات" : "Complete data"; 
        return; 
    }

    // تحويل الكود لإيميل وهمي خلف الكواليس
    const email = `${code}@tamkeen.com`;
    const btn = document.getElementById('btn-login');
    const originalText = btn.innerText;
    
    btn.innerText = "...";
    btn.disabled = true;

    auth.signInWithEmailAndPassword(email, pass)
    .then(() => {
        // التوجيه يتم أوتوماتيكياً بواسطة المراقب بالأسفل
    })
    .catch((error) => {
        btn.innerText = originalText;
        btn.disabled = false;
        errorDiv.innerText = document.body.dir === 'rtl' ? "خطأ في الكود أو الباسورد" : "Error in ID or Password";
    });
}

// 2. دالة تفعيل الحساب لأول مرة (المطورة)
async function activateAccount() {
    const code = document.getElementById('reg-code').value;
    const phone = document.getElementById('reg-phone').value;
    const pass = document.getElementById('reg-pass').value;
    const msg = document.getElementById('reg-msg');

    if(!code || !phone || !pass) { 
        msg.innerText = document.body.dir === 'rtl' ? "أكمل البيانات" : "Complete data"; 
        return; 
    }

    try {
        // أ- التأكد من وجود الموظف في قاعدة بيانات الشركة
        const empDoc = await db.collection("Employee_Database").doc(code).get();

        if (!empDoc.exists) {
            msg.innerText = document.body.dir === 'rtl' ? "الكود غير مسجل، راجع الـ HR" : "ID not found, check HR";
            return;
        }

        const empData = empDoc.data();

        // ب- التأكد من مطابقة رقم الموبايل
        if (empData.phone !== phone) {
            msg.innerText = document.body.dir === 'rtl' ? "رقم الموبايل غير مطابق" : "Phone number mismatch";
            return;
        }

        // ج- التأكد أن الحساب لم يفعل مسبقاً
        if (empData.activated === true) {
            msg.innerText = document.body.dir === 'rtl' ? "الحساب مفعل بالفعل" : "Account already active";
            return;
        }

        // د- سحب الصلاحية (Role) المحددة من الـ CSV
        const assignedRole = empData.role || "employee"; 
        const email = `${code}@tamkeen.com`;

        // هـ- إنشاء الحساب في Firebase Auth
        await auth.createUserWithEmailAndPassword(email, pass);

        // و- تحديث حالة التفعيل في جدول الموظفين
        await db.collection("Employee_Database").doc(code).update({ activated: true });
        
        // ز- إنشاء ملف الصلاحيات في جدول Users
        await db.collection("Users").doc(email).set({ 
            role: assignedRole, 
            name: empData.name,
            empCode: code 
        });

        alert(document.body.dir === 'rtl' ? "تم التفعيل بنجاح بصلاحية: " + assignedRole : "Activated successfully as: " + assignedRole);
        window.location.href = "index.html";

    } catch (error) {
        msg.innerText = error.message;
    }
}

// 3. مراقب الحالة وحماية الصفحات (Observer)
auth.onAuthStateChanged((user) => {
    const path = window.location.pathname;
    const fileName = path.split("/").pop();
    const isLoginPage = fileName === "index.html" || fileName === "activate.html" || fileName === "" || fileName === "undefined";

    if (user) {
        // لو مسجل دخول وهو في صفحة الدخول، وديه للهوم
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
    }).catch(err => alert("Error logging out"));
}

// 5. نظام اللغة الكامل (Login & Activate)
function updatePageContent(lang) {
    const translations = {
        ar: {
            title: "دخول - نظام تمكين",
            brand: "تمكين للتمويل",
            welcome: "تسجيل الدخول",
            code: "كود الموظف",
            pass: "كلمة المرور",
            btn: "دخول",
            new: "موظف جديد؟",
            act: "تفعيل الحساب",
            // صفحة التفعيل
            actTitle: "تفعيل الحساب (للموظفين الجدد)",
            lblPhone: "رقم الموبايل",
            lblNewPass: "اختر كلمة مرور جديدة",
            btnAct: "تفعيل الحساب الآن",
            back: "العودة للدخول"
        },
        en: {
            title: "Login - Tamkeen",
            brand: "Tamkeen Finance",
            welcome: "User Login",
            code: "Employee ID",
            pass: "Password",
            btn: "Login",
            new: "New Employee?",
            act: "Activate Account",
            // Activation Page
            actTitle: "Account Activation",
            lblPhone: "Mobile Number",
            lblNewPass: "Choose New Password",
            btnAct: "Activate Now",
            back: "Back to Login"
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
    if (document.getElementById('btn-activate')) document.getElementById('btn-activate'
