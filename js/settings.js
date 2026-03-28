const db = firebase.firestore();
const clinicId = sessionStorage.getItem('clinicId');

// 1. نظام الترجمة (مسطرة عربي وإنجليزي)
function updatePageContent(lang) {
    const t = {
        ar: {
            title: "إعدادات العيادة", sub: "تخصيص بيانات العيادة والشعار (اللوجو)", cardTitle: "البيانات الأساسية",
            lLogo: "شعار العيادة (اللوجو)", lHint: "يفضل أن تكون الصورة مربعة (1:1) بخلفية شفافة",
            lName: "اسم العيادة / المركز الطبي", pName: "أدخل اسم العيادة الذي سيظهر في النظام والروشتات",
            lLang: "لغة النظام (System Language)",
            btnSave: "حفظ التعديلات", msgSuccess: "تم حفظ التعديلات بنجاح!", msgError: "حدث خطأ أثناء الحفظ",
            // ترجمة الباك أب
            bkpTitle: "النسخ الاحتياطي والأمان", bkpDesc: "قم بتحميل نسخة احتياطية كاملة من بيانات العيادة (المرضى، المواعيد، الجلسات، الحسابات، والروشتات) للاحتفاظ بها على جهازك أو رفعها على مساحتك السحابية.", btnBkp: "تحميل نسخة احتياطية (Backup)", msgBkpWait: "جاري تجميع البيانات... برجاء الانتظار", msgBkpDone: "تم تحميل النسخة الاحتياطية بنجاح!"
        },
        en: {
            title: "Clinic Settings", sub: "Customize clinic data and logo", cardTitle: "Basic Information",
            lLogo: "Clinic Logo", lHint: "Square image (1:1) with transparent background is recommended",
            lName: "Clinic / Center Name", pName: "Enter the clinic name to appear in the system and prescriptions",
            lLang: "System Language",
            btnSave: "Save Changes", msgSuccess: "Changes saved successfully!", msgError: "Error saving changes",
            // Backup Translation
            bkpTitle: "Backup & Security", bkpDesc: "Download a full backup of clinic data (Patients, Appointments, Sessions, Finances, and Prescriptions) to keep on your device or upload to your cloud storage.", btnBkp: "Download Backup", msgBkpWait: "Gathering data... Please wait", msgBkpDone: "Backup downloaded successfully!"
        }
    };
    const c = t[lang] || t.ar;
    const setTxt = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };

    setTxt('txt-title', c.title); setTxt('txt-subtitle', c.sub); setTxt('txt-card-title', c.cardTitle);
    setTxt('lbl-logo', c.lLogo); setTxt('lbl-logo-hint', c.lHint); setTxt('lbl-name', c.lName);
    setTxt('lbl-lang', c.lLang);
    setTxt('txt-backup-title', c.bkpTitle); setTxt('txt-backup-desc', c.bkpDesc); setTxt('btn-backup-txt', c.btnBkp);
    
    const nameInput = document.getElementById('clinic_name');
    if(nameInput) nameInput.placeholder = c.pName;
    
    setTxt('btn-save', c.btnSave);
    
    const langSelect = document.getElementById('app_language');
    if(langSelect) langSelect.value = lang;

    window.settingsLang = c;
}

// 2. تحميل البيانات الحالية للعيادة
async function loadClinicSettings() {
    if (!clinicId || clinicId === 'default') return;

    try {
        const doc = await db.collection("Clinics").doc(clinicId).get();
        if (doc.exists) {
            const data = doc.data();
            if (data.clinicName) {
                document.getElementById('clinic_name').value = data.clinicName;
            }
            if (data.logoUrl) {
                document.getElementById('logo-preview').src = data.logoUrl;
                document.getElementById('logo_base64').value = data.logoUrl;
            }
        }
    } catch (error) {
        console.error("Error loading settings:", error);
    }
}

// 3. تحويل الصورة لـ Base64
function encodeLogo(element) {
    const file = element.files[0];
    const reader = new FileReader();
    reader.onloadend = function() {
        document.getElementById('logo-preview').src = reader.result;
        document.getElementById('logo_base64').value = reader.result;
    }
    if (file) {
        reader.readAsDataURL(file);
    }
}

// 4. دالة تغيير اللغة فوراً
function changeSystemLanguage(newLang) {
    localStorage.setItem('preferredLang', newLang);
    
    if (window.parent && typeof window.parent.switchAppLanguage === 'function') {
        window.parent.switchAppLanguage(newLang);
    } else {
        document.body.dir = newLang === 'en' ? 'ltr' : 'rtl';
        updatePageContent(newLang);
    }
}

// 5. حفظ التعديلات
async function saveSettings(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save');
    btn.disabled = true; btn.innerText = "...";

    if (!clinicId || clinicId === 'default') {
        alert("لا يمكن تعديل إعدادات العيادة الافتراضية.");
        btn.disabled = false; btn.innerText = window.settingsLang.btnSave;
        return;
    }

    const newName = document.getElementById('clinic_name').value.trim();
    const newLogo = document.getElementById('logo_base64').value;

    try {
        await db.collection("Clinics").doc(clinicId).update({
            clinicName: newName,
            logoUrl: newLogo
        });

        alert(window.settingsLang.msgSuccess);

        if (window.parent && typeof window.parent.loadClinicBranding === 'function') {
            window.parent.loadClinicBranding(clinicId);
        }

    } catch (error) {
        console.error("Error saving settings:", error);
        alert(window.settingsLang.msgError);
    } finally {
        btn.disabled = false; btn.innerText = window.settingsLang.btnSave;
    }
}

// 🔴 6. السحر الخالص: دالة التصدير الشامل (Full Backup) 🔴
async function exportClinicData() {
    if (!clinicId || clinicId === 'default') {
        alert("لا يوجد بيانات لتصديرها.");
        return;
    }

    const btn = document.getElementById('btn-backup');
    const originalText = document.getElementById('btn-backup-txt').innerText;
    btn.disabled = true; 
    document.getElementById('btn-backup-txt').innerText = window.settingsLang.msgBkpWait;

    try {
        // إنشاء الكيان اللي هيشيل الداتا كلها
        let backupData = {
            exportDate: new Date().toISOString(),
            clinicId: clinicId,
            clinicInfo: {},
            patients: [],
            appointments: [],
            sessions: [],
            finances: [],
            prescriptions: []
        };

        // 1. جلب بيانات العيادة
        const clinicDoc = await db.collection("Clinics").doc(clinicId).get();
        if(clinicDoc.exists) backupData.clinicInfo = clinicDoc.data();

        // 2. جلب المرضى
        const patSnap = await db.collection("Patients").where("clinicId", "==", clinicId).get();
        patSnap.forEach(doc => backupData.patients.push({ id: doc.id, ...doc.data() }));

        // 3. جلب المواعيد
        const appSnap = await db.collection("Appointments").where("clinicId", "==", clinicId).get();
        appSnap.forEach(doc => backupData.appointments.push({ id: doc.id, ...doc.data() }));

        // 4. جلب الجلسات
        const sessSnap = await db.collection("Sessions").where("clinicId", "==", clinicId).get();
        sessSnap.forEach(doc => backupData.sessions.push({ id: doc.id, ...doc.data() }));

        // 5. جلب الحسابات
        const finSnap = await db.collection("Finances").where("clinicId", "==", clinicId).get();
        finSnap.forEach(doc => backupData.finances.push({ id: doc.id, ...doc.data() }));

        // 6. جلب الروشتات
        const rxSnap = await db.collection("Prescriptions").where("clinicId", "==", clinicId).get();
        rxSnap.forEach(doc => backupData.prescriptions.push({ id: doc.id, ...doc.data() }));

        // --- تحويل الداتا لملف وتنزيله ---
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        
        // تسمية الملف باسم العيادة وتاريخ اليوم
        const clinicNameStr = backupData.clinicInfo.clinicName ? backupData.clinicInfo.clinicName.replace(/\s+/g, '_') : 'Clinic';
        const dateStr = new Date().toISOString().split('T')[0];
        downloadAnchorNode.setAttribute("download", `${clinicNameStr}_Backup_${dateStr}.json`);
        
        document.body.appendChild(downloadAnchorNode); 
        downloadAnchorNode.click();
        downloadAnchorNode.remove();

        alert(window.settingsLang.msgBkpDone);

    } catch (error) {
        console.error("Backup Error:", error);
        alert("حدث خطأ أثناء إنشاء النسخة الاحتياطية.");
    } finally {
        btn.disabled = false; 
        document.getElementById('btn-backup-txt').innerText = originalText;
    }
}

// تشغيل الشاشة
window.onload = () => {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.body.dir = lang === 'en' ? 'ltr' : 'rtl';
    updatePageContent(lang);
    
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            loadClinicSettings();
        }
    });
};
