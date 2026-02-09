auth.onAuthStateChanged(user => {
  if (!user && !window.location.pathname.includes("login.html")) {
    window.location.href = "login.html";
  }
});

