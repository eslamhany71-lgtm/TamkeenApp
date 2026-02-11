const auth = firebase.auth();
const db = firebase.firestore();

// 1. تسجيل الدخول
function loginById() {
    const code = document.getElementById('empCode').value;
    const pass = document.getElementById('password').value;
    const errorDiv = document.getElementById('errorMessage');

    if(!code || !pass) { errorDiv.innerText = "أكمل البيانات"; return; }
    const email = `${code}@tamkeen.com`;

    auth.signInWithEmailAndPassword(email, pass)
    .then(() => { window.location.href = "home.html"; })
    .catch((error) => { errorDiv.innerText = "خطأ في الكود أو الباسورد"; });
}

// 2. مراقب الحالة (مهم جداً)
auth.onAuthStateChanged((user) => {
    const path = window.location.pathname;
    const fileName = path.split("/").pop();

    if (user) {
        // لو مسجل دخول وهو في صفحة الدخول، وديه للهوم
        if (fileName === "index.html" || fileName === "activate.html" || fileName === "") {
            window.location.href = "home.html";
        }
    } else {
        // لو مش مسجل دخول وهو في صفحة محتاجة حماية، وديه للدخول
        if (fileName !== "index.html" && fileName !== "activate.html" && fileName !== "") {
            window.location.href = "index.html";
        }
    }
});

// 3. دالة تسجيل الخروج (تأكد أن الاسم logout بالظبط)
function logout() {
    auth.signOut().then(() => {
        window.location.href = "index.html";
    }).catch(err => alert("خطأ في الخروج"));
}
