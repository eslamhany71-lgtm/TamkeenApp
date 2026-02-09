// Import Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDutDzaVU4GYP0lhMfg0ab5aLb-w-11628",
  authDomain: "hr-system-d7fc4.firebaseapp.com",
  projectId: "hr-system-d7fc4",
  storageBucket: "hr-system-d7fc4.firebasestorage.app",
  messagingSenderId: "1078587501723",
  appId: "1:1078587501723:web:88a31496e6f815c0362a3e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };

