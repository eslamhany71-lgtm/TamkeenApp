// firebase-config.js - التهيئة النظيفة مع السرعة الصاروخية ومزامنة الإطارات والتابات

const firebaseConfig = {
  apiKey: "AIzaSyCFVu8FHYq2leGA1F9SQEAXmn1agv1V1cM",
  authDomain: "smartplatform-513c3.firebaseapp.com",
  projectId: "smartplatform-513c3",
  storageBucket: "smartplatform-513c3.firebasestorage.app",
  messagingSenderId: "906640049959",
  appId: "1:906640049959:web:c6c619a53ef4d6f9704b02"
};

// التأكد من عدم تهيئة الفايربيز مرتين (مهمة جداً مع الـ iframe)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// 🚀 تفعيل الكاش المحلي مع دعم التابات المتعددة (synchronizeTabs) 🚀
firebase.firestore().enablePersistence({ synchronizeTabs: true })
  .catch((err) => {
      if (err.code == 'failed-precondition') {
          console.warn("تحذير: عدة تابات مفتوحة، تم تفعيل المزامنة.");
      } else if (err.code == 'unimplemented') {
          console.warn("المتصفح لا يدعم التخزين المحلي.");
      }
  });
