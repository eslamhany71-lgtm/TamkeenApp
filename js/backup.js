// backup.js - NivaDent Auto Backup Script
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

// 1. إعدادات الفايربيز بتاعتك (زي اللي في الموقع بالظبط)
const firebaseConfig = {
  apiKey: "AIzaSyCFVu8FHYq2leGA1F9SQEAXmn1agv1V1cM",
  authDomain: "smartplatform-513c3.firebaseapp.com",
  projectId: "smartplatform-513c3",
  storageBucket: "smartplatform-513c3.firebasestorage.app",
  messagingSenderId: "906640049959",
  appId: "1:906640049959:web:c6c619a53ef4d6f9704b02"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 🔴 حط هنا إيميل وباسورد العيادة اللي هيتعملها باك أب
const CLINIC_EMAIL = "clinic1@nivadent.com"; 
const CLINIC_PASS = "123456"; 

async function runBackup() {
    console.log("⏳ جاري الاتصال بخوادم NivaDent...");
    
    try {
        // 1. تسجيل الدخول
        const userCredential = await signInWithEmailAndPassword(auth, CLINIC_EMAIL, CLINIC_PASS);
        console.log("✅ تم تسجيل الدخول بنجاح.");

        // 2. هنجيب الـ clinicId بتاع الدكتور ده
        const userDocs = await getDocs(query(collection(db, "Users"), where("email", "==", CLINIC_EMAIL)));
        let clinicId = "default";
        userDocs.forEach(doc => { clinicId = doc.data().clinicId; });

        if(clinicId === "default") throw new Error("لم يتم العثور على عيادة مرتبطة بهذا الحساب.");
        console.log(`📥 جاري سحب بيانات العيادة (${clinicId})...`);

        // 3. تجهيز وعاء البيانات
        let backupData = {
            backupDate: new Date().toISOString(),
            clinicId: clinicId,
            patients: [],
            sessions: [],
            finances: []
        };

        // 4. سحب المرضى
        const patSnap = await getDocs(query(collection(db, "Patients"), where("clinicId", "==", clinicId)));
        patSnap.forEach(doc => backupData.patients.push({ id: doc.id, ...doc.data() }));

        // 5. سحب الجلسات
        const sessSnap = await getDocs(query(collection(db, "Sessions"), where("clinicId", "==", clinicId)));
        sessSnap.forEach(doc => backupData.sessions.push({ id: doc.id, ...doc.data() }));

        // 6. سحب الحسابات
        const finSnap = await getDocs(query(collection(db, "Finances"), where("clinicId", "==", clinicId)));
        finSnap.forEach(doc => backupData.finances.push({ id: doc.id, ...doc.data() }));

        // 7. حفظ البيانات في ملف JSON على الديسكتوب
        const dateStr = new Date().toISOString().split('T')[0];
        const fileName = `Backup_${clinicId}_${dateStr}.json`;
        const filePath = path.join(__dirname, fileName);

        fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf-8');
        console.log(`🎉 اكتمل النسخ الاحتياطي! تم حفظ الملف باسم: ${fileName}`);

        process.exit(0);
    } catch (error) {
        console.error("❌ حدث خطأ أثناء النسخ الاحتياطي:", error.message);
        process.exit(1);
    }
}

runBackup();
