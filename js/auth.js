// التأكد من حالة تسجيل الدخول
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        // المستخدم مسجل دخول
        document.getElementById('userEmail').innerText = "مرحباً: " + user.email;
    } else {
        // المستخدم مش مسجل دخول، ابعته لصفحة الـ login
        window.location.href = "index.html";
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
