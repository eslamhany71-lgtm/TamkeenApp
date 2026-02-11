function updatePageContent(lang) {
    const translations = {
        ar: {
            welcome: "أهلاً بك في نظام الإدارة الموحد",
            calc: "حاسبة القروض",
            branches: "الفروع",
            hr: "شؤون الموظفين"
        },
        en: {
            welcome: "Welcome to Unified Management System",
            calc: "Loan Calculator",
            branches: "Branches",
            hr: "HR Solution"
        }
    };

    const t = translations[lang];
    
    // تأكد إن العناصر دي ليها IDs في الـ HTML بتاعك
    if(document.getElementById('txt-welcome')) document.getElementById('txt-welcome').innerText = t.welcome;
    if(document.getElementById('txt-calc')) document.getElementById('txt-calc').innerText = t.calc;
    // وهكذا لباقي العناصر...
}
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        document.getElementById('userEmail').innerText = user.email;
        const userEmail = user.email;
        const empCode = userEmail.split('@')[0]; // بيجيب الكود من الإيميل (مثلاً 1007)

        // 1. محاولة قراءة البيانات من جدول Users
        firebase.firestore().collection("Users").doc(userEmail).get().then((doc) => {
            if (doc.exists) {
                // الموظف سليم وموجود.. افتح الصلاحيات
                applyRoles(doc.data().role);
            } else {
                // --- نظام الإصلاح الذاتي ---
                console.log("ملف الصلاحيات ناقص.. جاري محاولة الإصلاح أوتوماتيكياً...");
                
                // روح هات البيانات من جدول الموظفين الأصلي
                return firebase.firestore().collection("Employee_Database").doc(empCode).get();
            }
        })
        .then((empDoc) => {
            if (empDoc && empDoc.exists) {
                const empData = empDoc.data();
                const assignedRole = empData.role || "employee";
                
                // كريت الملف اللي كان ناقص في Users دلوقتى حالا
                return firebase.firestore().collection("Users").doc(userEmail).set({
                    role: assignedRole,
                    name: empData.name,
                    empCode: empCode,
                    email: userEmail
                }).then(() => {
                    console.log("تم إصلاح الحساب بنجاح!");
                    applyRoles(assignedRole);
                });
            }
        })
        .catch((error) => {
            console.error("خطأ في نظام الصلاحيات:", error);
            // لو فشل تماماً بعد كل ده، خرجه برا
            // alert("خطأ في الصلاحيات، راجع الـ HR");
            // logout(); 
        });
    } else {
        window.location.href = "index.html";
    }
});

// دالة إظهار الكروت حسب الرتبة
function applyRoles(role) {
    if (role === 'manager') {
        document.getElementById('manager-card').style.display = 'block';
    } else if (role === 'hr') {
        document.getElementById('manager-card').style.display = 'block';
        document.getElementById('hr-admin-card').style.display = 'block';
    }
}
