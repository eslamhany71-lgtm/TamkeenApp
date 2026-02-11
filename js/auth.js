const auth = firebase.auth();
const db = firebase.firestore();

// 1. دالة تسجيل الدخول بالكود
function loginById() {
    const code = document.getElementById('empCode').value;
    const pass = document.getElementById('password').value;
    const errorDiv = document.getElementById('errorMessage');

    if(!code || !pass) { errorDiv.innerText = "برجاء إكمال البيانات"; return; }

    // تحويل الكود لإيميل وهمي (خلف الكواليس)
    const email = `${code}@tamkeen.com`;

    auth.signInWithEmailAndPassword(email, pass)
    .then(() => {
        window.location.href = "home.html";
    })
    .catch((error) => {
        errorDiv.innerText = "خطأ: تأكد من الكود أو الباسورد، أو فعل حسابك أولاً.";
    });
}

// 2. دالة تفعيل الحساب لأول مرة
async function activateAccount() {
    const code = document.getElementById('reg-code').value;
    const phone = document.getElementById('reg-phone').value;
    const pass = document.getElementById('reg-pass').value;
    const msg = document.getElementById('reg-msg');

    if(!code || !phone || !pass) { msg.innerText = "برجاء إكمال الخانات"; return; }
    if(pass.length < 6) { msg.innerText = "الباسورد ضعيف، اجعله 6 رموز فأكثر"; return; }

    try {
        // التأكد من وجود الموظف في قاعدة بيانات الشركة
        const empDoc = await db.collection("Employee_Database").doc(code).get();

        if (!empDoc.exists) {
            msg.innerText = "كود الموظف غير مسجل بالنظام، راجع الـ HR";
            return;
        }

        const empData = empDoc.data();

        if (empData.activated === true) {
            msg.innerText = "هذا الحساب مفعل بالفعل، اذهب لصفحة الدخول";
            return;
        }

        if (empData.phone !== phone) {
            msg.innerText = "رقم الموبايل غير مطابق للكود المسجل";
            return;
        }

        // لو كله تمام.. ننشئ له حساب رسمي في Firebase Auth
        const email = `${code}@tamkeen.com`;
        await auth.createUserWithEmailAndPassword(email, pass);

        // تحديث حالة الموظف في Firestore لإنه تم التفعيل
        await db.collection("Employee_Database").doc(code).update({ activated: true });
        
        // إنشاء ملفه في جدول Users (الصلاحيات) تلقائياً كـ موظف
        await db.collection("Users").doc(email).set({ role: "employee", name: empData.name });

        alert("تم تفعيل حسابك بنجاح! يمكنك الدخول الآن.");
        window.location.href = "index.html";

    } catch (error) {
        msg.innerText = "خطأ أثناء التفعيل: " + error.message;
    }
}

// 3. حماية الصفحات (تأكد من وجودها في كل الصفحات)
auth.onAuthStateChanged((user) => {
    const path = window.location.pathname;
    if (user) {
        if (path.includes("index.html") || path.includes("activate.html") || path === "/") {
            window.location.href = "home.html";
        }
    } else {
        if (!path.includes("index.html") && !path.includes("activate.html") && path !== "/") {
            window.location.href = "index.html";
        }
    }
});

function logout() {
    auth.signOut().then(() => window.location.href = "index.html");
}
