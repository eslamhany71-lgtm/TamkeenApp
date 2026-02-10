function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const message = document.getElementById("message");

    firebase.auth().signInWithEmailAndPassword(email, password)
        .then(() => {
            message.innerText = "تم تسجيل الدخول ✅";
        })
        .catch(() => {
            message.innerText = "بيانات الدخول غير صحيحة ❌";
        });
}

