const auth = firebase.auth();
const db = firebase.firestore();

// 1. تسجيل الدخول ومعرفة الصلاحية
function loginById() {
    const code = document.getElementById('empCode').value;
    const pass = document.getElementById('password').value;
    const errorDiv = document.getElementById('errorMessage');

    if(!code || !pass) { errorDiv.innerText = "أكمل البيانات"; return; }

    const email = `${code}@tamkeen.com`;
    const btn = document.getElementById('btn-login');
    btn.innerText = "...";

    auth.signInWithEmailAndPassword(email, pass)
    .then((userCredential) => {
        // بعد الدخول، نبحث عن الصلاحية فوراً
        return db.collection("Users").doc(email).get();
    })
    .then((doc) => {
        if (doc.exists) {
            window.location.href = "home.html"; // سيتم التوجيه حسب الصلاحية في صفحة الـ Home
        }
    })
    .catch((error) => {
        btn.innerText = "دخول";
        errorDiv.innerText = "خطأ في الكود أو الباسورد";
    });
}

// 2. نظام ترجمة صفحة الدخول
function updatePageContent(lang) {
    const translations = {
        ar: { title:"دخول - نظام تمكين", brand:"تمكين للتمويل", welcome:"تسجيل الدخول", code:"كود الموظف", pass:"كلمة المرور", btn:"دخول", new:"موظف جديد؟", act:"تفعيل الحساب" },
        en: { title:"Login - Tamkeen", brand:"Tamkeen Finance", welcome:"User Login", code:"Employee ID", pass:"Password", btn:"Login", new:"New Employee?", act:"Activate Account" }
    };
    const t = translations[lang];
    if(document.getElementById('txt-title')) document.getElementById('txt-title').innerText = t.title;
    if(document.getElementById('txt-brand')) document.getElementById('txt-brand').innerText = t.brand;
    if(document.getElementById('txt-welcome')) document.getElementById('txt-welcome').innerText = t.welcome;
    if(document.getElementById('lbl-code')) document.getElementById('lbl-code').innerText = t.code;
    if(document.getElementById('lbl-pass')) document.getElementById('lbl-pass').innerText = t.pass;
    if(document.getElementById('btn-login')) document.getElementById('btn-login').innerText = t.btn;
    if(document.getElementById('txt-new')) document.getElementById('txt-new').innerText = t.new;
    if(document.getElementById('link-activate')) document.getElementById('link-activate').innerText = t.act;
}

// 3. مراقب الحالة (Auth Observer)
auth.onAuthStateChanged((user) => {
    const path = window.location.pathname;
    const isLoginPage = path.includes("index.html") || path.includes("activate.html") || path.endsWith("/");
    
    if (user) {
        if (isLoginPage) window.location.href = "home.html";
    } else {
        if (!isLoginPage) window.location.href = "index.html";
    }
});
