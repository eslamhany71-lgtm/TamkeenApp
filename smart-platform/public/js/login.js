document.getElementById("loginBtn").addEventListener("click", () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const errorMsg = document.getElementById("errorMsg");

  errorMsg.textContent = "";

  if (!email || !password) {
    errorMsg.textContent = "اكتب الإيميل والباسورد";
    return;
  }

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      window.location.href = "home.html";
    })
    .catch(err => {
      errorMsg.textContent = err.message;
    });
});

