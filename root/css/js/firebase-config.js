// بيانات اتصال Firebase الخاصة بك
const firebaseConfig = {
  apiKey: "AIzaSyCFVu8FHYq2leGA1F9SQEAXmn1agv1V1cM",
  authDomain: "smartplatform-513c3.firebaseapp.com",
  projectId: "smartplatform-513c3",
  storageBucket: "smartplatform-513c3.firebasestorage.app",
  messagingSenderId: "906640049959",
  appId: "1:906640049959:web:c6c619a53ef4d6f9704b02"
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);

// دالة تسجيل الدخول
function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');
    const loginBtn = document.getElementById('loginBtn');

    if (email === "" || password === "") {
        errorMessage.innerText = "برجاء ملء جميع الحقول";
        return;
    }

    // تغيير شكل الزر أثناء التحميل
    loginBtn.innerText = "جاري الدخول...";
    loginBtn.disabled = true;

    // تنفيذ عملية الدخول عبر Firebase
    firebase.auth().signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
        // إذا نجح الدخول، يتم التوجه للصفحة الرئيسية
        window.location.href = "home.html";
    })
    .catch((error) => {
        // في حالة الخطأ
        loginBtn.innerText = "تسجيل الدخول";
        loginBtn.disabled = false;
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage.innerText = "المستخدم غير موجود";
                break;
            case 'auth/wrong-password':
                errorMessage.innerText = "كلمة المرور غير صحيحة";
                break;
            default:
                errorMessage.innerText = "خطأ في تسجيل الدخول، تأكد من البيانات";
        }
    });
}
