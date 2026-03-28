// firebase-config.js - التهيئة النظيفة مع السرعة الصاروخية (Offline Persistence)

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

// 🚀 تفعيل الكاش المحلي (السرعة الصاروخية والعمل بدون إنترنت) 🚀
firebase.firestore().enablePersistence()
  .catch((err) => {
      if (err.code == 'failed-precondition') {
          // بيحصل لو الدكتور فاتح السيستم في أكتر من تابة في نفس الوقت
          console.warn("الكاش يعمل في تابة واحدة فقط.");
      } else if (err.code == 'unimplemented') {
          // بيحصل لو المتصفح قديم جداً (نادر الحدوث)
          console.warn("المتصفح لا يدعم التخزين المحلي.");
      }
  });
