const db = firebase.firestore();
const auth = firebase.auth(); // 🔴 ضفنا الـ Auth عشان تغيير الباسورد
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
            bkpTitle: "النسخ الاحتياطي والبيانات", bkpDesc: "قم بتحميل نسخة احتياطية كاملة من بيانات العيادة (المرضى، المواعيد، الجلسات، الحسابات، والروشتات) للاحتفاظ بها على جهازك.", btnBkp: "تحميل نسخة احتياطية (Backup)", msgBkpWait: "جاري تجميع البيانات... برجاء الانتظار", msgBkpDone: "تم تحميل النسخة الاحتياطية بنجاح!",
            // ترجمة الأمان والباسورد 🔴
            secTitle: "الأمان وتسجيل الدخول", secDesc: "يمكنك تغيير كلمة المرور الخاصة بحساب العيادة. ستحتاج إلى إدخال كلمة المرور الحالية للتأكيد.",
            btnPass: "تغيير كلمة المرور", modalPassTitle: "تغيير كلمة المرور", lOldPass: "كلمة المرور الحالية", lNewPass: "كلمة المرور الجديدة", lConfPass: "تأكيد كلمة المرور الجديدة", btnSavePass: "تحديث كلمة المرور"
        },
        en: {
            title: "Clinic Settings", sub: "Customize clinic data and logo", cardTitle: "Basic Information",
            lLogo: "Clinic Logo", lHint: "Square image (1:1) with transparent background is recommended",
            lName: "Clinic / Center Name", pName: "Enter the clinic name to appear in the system and prescriptions",
            lLang: "System Language",
            btnSave: "Save Changes", msgSuccess: "Changes saved successfully!", msgError: "Error saving changes",
            // Backup Translation
            bkpTitle: "Backup & Data", bkpDesc: "Download a full backup of clinic data (Patients, Appointments, Sessions, Finances, and Prescriptions) to keep on your device.", btnBkp: "Download Backup", msgBkpWait: "Gathering data... Please wait", msgBkpDone: "Backup downloaded successfully!",
            // Security Translation 🔴
            secTitle: "Security & Login", secDesc: "You can change your clinic account password. You will need to enter your current password to confirm.",
            btnPass: "Change Password", modalPassTitle: "Change Password", lOldPass: "Current Password", lNewPass: "New Password", lConfPass: "Confirm New Password", btnSavePass: "Update Password"
        }
    };
    const c = t[lang] || t.ar;
    const setTxt = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };

    setTxt('txt-title', c.title); setTxt('txt-subtitle', c.sub); setTxt('txt-card-title', c.cardTitle);
    setTxt('lbl-logo', c.lLogo); setTxt('lbl-logo-hint', c.lHint); setTxt('lbl-name', c.lName);
    setTxt('lbl-lang', c.lLang);
    setTxt('txt-backup-title', c.bkpTitle); setTxt('txt-backup-desc', c.bkpDesc); setTxt('btn-backup-txt', c.btnBkp);
    
    // الأمان 🔴
    setTxt('txt-security-title', c.secTitle); setTxt('txt-security-desc', c.secDesc); setTxt('btn-change-pass', c.btnPass);
    setTxt('modal-pass-title', c.modalPassTitle); setTxt('lbl-old-pass', c.lOldPass); setTxt('lbl-new-pass', c.lNewPass); setTxt('lbl-confirm-pass', c.lConfPass); setTxt('btn-save-pass', c.btnSavePass);
    
    const nameInput = document.getElementById('clinic_name');
    if(nameInput) nameInput.placeholder = c.pName;
    
    setTxt('btn-save', c.btnSave);
    
    const langSelect = document.getElementById('app_language');
    if(langSelect) langSelect.value = lang;

    window.settingsLang = c;
}

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

function changeSystemLanguage(newLang) {
    localStorage.setItem('preferredLang', newLang);
    
    if (window.parent && typeof window.parent.switchAppLanguage === 'function') {
        window.parent.switchAppLanguage(newLang);
    } else {
        document.body.dir = newLang === 'en' ? 'ltr' : 'rtl';
        updatePageContent(newLang);
    }
}

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

// 🔴 دوال تغيير كلمة المرور 🔴
function openPasswordModal() {
    document.getElementById('pass-error-msg').style.display = 'none';
    document.getElementById('old_password').value = '';
    document.getElementById('new_password').value = '';
    document.getElementById('confirm_password').value = '';
    document.getElementById('passwordModal').style.display = 'flex';
}

function closePasswordModal() {
    document.getElementById('passwordModal').style.display = 'none';
}

async function changePassword(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-pass');
    const errorMsg = document.getElementById('pass-error-msg');
    
    const oldPass = document.getElementById('old_password').value;
    const newPass = document.getElementById('new_password').value;
    const confirmPass = document.getElementById('confirm_password').value;
    
    errorMsg.style.display = 'none';

    // 1. التأكد من تطابق كلمة المرور الجديدة
    if (newPass !== confirmPass) {
        errorMsg.innerText = "❌ كلمة المرور الجديدة غير متطابقة!";
        errorMsg.style.display = 'block';
        return;
    }

    btn.disabled = true;
    btn.innerText = "جاري التحديث...";

    const user = auth.currentUser;
    
    if (user) {
        // 2. إعادة المصادقة (Re-authenticate) بالباسورد القديم
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, oldPass);
        
        try {
            await user.reauthenticateWithCredential(credential);
            
            // 3. لو الباسورد القديم صح، نحدث للجديد
            await user.updatePassword(newPass);
            
            alert("✅ تم تغيير كلمة المرور بنجاح!");
            closePasswordModal();
            
        } catch (error) {
            console.error("Password update error:", error);
            errorMsg.style.display = 'block';
            
            // تحديد نوع الخطأ عشان نعرض رسالة واضحة
            if (error.code === 'auth/wrong-password') {
                errorMsg.innerText = "❌ كلمة المرور الحالية غير صحيحة!";
            } else if (error.code === 'auth/weak-password') {
                errorMsg.innerText = "❌ كلمة المرور الجديدة ضعيفة (يجب أن تكون 6 أحرف على الأقل).";
            } else {
                errorMsg.innerText = "❌ حدث خطأ، يرجى المحاولة مرة أخرى.";
            }
        }
    } else {
        alert("يرجى تسجيل الدخول أولاً.");
    }
    
    btn.disabled = false;
    btn.innerText = window.settingsLang.btnSavePass || "تحديث كلمة المرور";
}

// إغلاق المودال عند الضغط في أي مكان فارغ
window.addEventListener('click', function(event) {
    const modal = document.getElementById('passwordModal');
    if (event.target === modal) {
        closePasswordModal();
    }
});

async function exportClinicData() {
    if (!clinicId || clinicId === 'default') {
        alert("لا يوجد بيانات لتصديرها.");
        return;
    }

    const btn = document.getElementById('btn-backup');
    const originalText = document.getElementById('btn-backup-txt').innerText;
    
    const safeLang = window.settingsLang || {
        msgBkpWait: document.body.dir === 'ltr' ? "Gathering data... Please wait" : "جاري تجميع البيانات... برجاء الانتظار",
        msgBkpDone: document.body.dir === 'ltr' ? "Backup downloaded successfully!" : "تم تحميل النسخة الاحتياطية بنجاح!"
    };

    btn.disabled = true; 
    document.getElementById('btn-backup-txt').innerText = safeLang.msgBkpWait;

    try {
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

        const clinicDoc = await db.collection("Clinics").doc(clinicId).get();
        if(clinicDoc.exists) backupData.clinicInfo = clinicDoc.data();

        const patSnap = await db.collection("Patients").where("clinicId", "==", clinicId).get();
        patSnap.forEach(doc => backupData.patients.push({ id: doc.id, ...doc.data() }));

        const appSnap = await db.collection("Appointments").where("clinicId", "==", clinicId).get();
        appSnap.forEach(doc => backupData.appointments.push({ id: doc.id, ...doc.data() }));

        const sessSnap = await db.collection("Sessions").where("clinicId", "==", clinicId).get();
        sessSnap.forEach(doc => backupData.sessions.push({ id: doc.id, ...doc.data() }));

        const finSnap = await db.collection("Finances").where("clinicId", "==", clinicId).get();
        finSnap.forEach(doc => backupData.finances.push({ id: doc.id, ...doc.data() }));

        const rxSnap = await db.collection("Prescriptions").where("clinicId", "==", clinicId).get();
        rxSnap.forEach(doc => backupData.prescriptions.push({ id: doc.id, ...doc.data() }));

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        
        const clinicNameStr = backupData.clinicInfo.clinicName ? backupData.clinicInfo.clinicName.replace(/\s+/g, '_') : 'Clinic';
        const dateStr = new Date().toISOString().split('T')[0];
        downloadAnchorNode.setAttribute("download", `${clinicNameStr}_Backup_${dateStr}.json`);
        
        document.body.appendChild(downloadAnchorNode); 
        downloadAnchorNode.click();
        downloadAnchorNode.remove();

        alert(safeLang.msgBkpDone);

    } catch (error) {
        console.error("Backup Error:", error);
        alert("حدث خطأ أثناء إنشاء النسخة الاحتياطية.");
    } finally {
        btn.disabled = false; 
        document.getElementById('btn-backup-txt').innerText = originalText;
    }
}

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
