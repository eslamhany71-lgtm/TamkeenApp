firebase.auth().onAuthStateChanged((user) => {
    // نعرف إحنا في أنهي صفحة دلوقتي
    const currentPage = window.location.pathname.split("/").pop();

    if (user) {
        // لو المستخدم مسجل دخول
        console.log("المستخدم مسجل دخول:", user.email);
        
        // لو هو في صفحة الـ login (index.html) نوديه للـ home
        if (currentPage === "index.html" || currentPage === "") {
            window.location.href = "home.html";
        }

        // لو في صفحة الـ home، نعرض الإيميل
        const userEmailElement = document.getElementById('userEmail');
        if (userEmailElement) {
            userEmailElement.innerText = "مرحباً: " + user.email;
        }

    } else {
        // لو المستخدم مش مسجل دخول
        console.log("لا يوجد مستخدم مسجل");

        // لو هو مش في صفحة الـ login، نطرده للـ login
        if (currentPage !== "index.html" && currentPage !== "") {
            window.location.href = "index.html";
        }
    }
});

// دالة تسجيل الخروج
function logout() {
    firebase.auth().signOut().then(() => {
        window.location.href = "index.html";
    }).catch((error) => {
        alert("حدث خطأ أثناء تسجيل الخروج");
    });
}
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        // 1. روح لجدول الـ Users وهات بيانات الموظف ده
        firebase.firestore().collection("Users").doc(user.email).get().then((doc) => {
            if (doc.exists) {
                const userData = doc.data();
                const role = userData.role;

                // 2. إظهار الكروت حسب الصلاحية
                if (role === 'manager') {
                    document.getElementById('manager-card').style.display = 'block';
                } else if (role === 'hr') {
                    document.getElementById('hr-card').style.display = 'block';
                    document.getElementById('manager-card').style.display = 'block'; // الـ HR يشوف الاتنين
                }
            }
        });
    } else {
        window.location.href = "index.html";
    }
});
