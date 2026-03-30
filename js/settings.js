const db = firebase.firestore();
const auth = firebase.auth(); 
const clinicId = sessionStorage.getItem('clinicId');

// 1. نظام الترجمة
function updatePageContent(lang) {
    const t = {
        ar: {
            title: "إعدادات العيادة", sub: "تخصيص بيانات العيادة والشعار (اللوجو)", cardTitle: "البيانات الأساسية",
            lLogo: "شعار العيادة (اللوجو)", lHint: "يفضل أن تكون الصورة مربعة (1:1) بخلفية شفافة",
            lName: "اسم العيادة / المركز الطبي", pName: "أدخل اسم العيادة الذي سيظهر في النظام والروشتات",
            lLang: "لغة النظام (System Language)",
            btnSave: "حفظ التعديلات", msgSuccess: "تم حفظ التعديلات بنجاح!", msgError: "حدث خطأ أثناء الحفظ",
            // ترجمة الباك أب للإكسل
            bkpTitle: "النسخ الاحتياطي لـ Excel", bkpDesc: "قم بتحميل نسخة احتياطية كاملة من بيانات العيادة في ملف Excel واحد مقسم لشيتات (مرضى، حجوزات، حسابات، الخ) جاهز للطباعة أو الحفظ على جهازك.", btnBkp: "تحميل البيانات (Excel Backup)", msgBkpWait: "جاري استخراج البيانات لـ Excel...", msgBkpDone: "تم تحميل ملف الـ Excel بنجاح!",
            // ترجمة الأمان
            secTitle: "الأمان وتسجيل الدخول", secDesc: "يمكنك تغيير كلمة المرور الخاصة بحساب العيادة. ستحتاج إلى إدخال كلمة المرور الحالية للتأكيد.",
            btnPass: "تغيير كلمة المرور", modalPassTitle: "تغيير كلمة المرور", lOldPass: "كلمة المرور الحالية", lNewPass: "كلمة المرور الجديدة", lConfPass: "تأكيد كلمة المرور الجديدة", btnSavePass: "تحديث كلمة المرور"
        },
        en: {
            title: "Clinic Settings", sub: "Customize clinic data and logo", cardTitle: "Basic Information",
            lLogo: "Clinic Logo", lHint: "Square image (1:1) with transparent background is recommended",
            lName: "Clinic / Center Name", pName: "Enter the clinic name to appear in the system and prescriptions",
            lLang: "System Language",
            btnSave: "Save Changes", msgSuccess: "Changes saved successfully!", msgError: "Error saving changes",
            bkpTitle: "Excel Backup & Data", bkpDesc: "Download a full backup of clinic data in a single Excel file with separated sheets (Patients, Appointments, Finances, etc.) ready for printing or storage.", btnBkp: "Download Excel Backup", msgBkpWait: "Extracting data to Excel...", msgBkpDone: "Excel file downloaded successfully!",
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
    
    setTxt('txt-security-title', c.secTitle); setTxt('txt-security-desc', c.secDesc); setTxt('btn-change-pass', c.btnPass);
    setTxt('modal-pass-title', c.modalPassTitle); setTxt('lbl-old-pass', c.lOldPass); setTxt('lbl-new-pass', c.lNewPass); setTxt('lbl-confirm-pass', c.lConfPass); setTxt('btn-save-pass', c.btnSavePass);
    
    const nameInput = document.getElementById('clinic_name');
    if(nameInput) nameInput.placeholder = c.pName;
    
    setTxt('btn-save', c.btnSave);
    
    const langSelect = document.getElementById('app_language');
    if(langSelect) langSelect.value = lang;

    window.settingsLang = c;
}

const defaultLogoSVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23e2e8f0'/%3E%3Ctext x='50' y='50' font-family='Arial' font-size='14' fill='%2364748b' text-anchor='middle' dominant-baseline='middle'%3ELogo%3C/text%3E%3C/svg%3E";

async function loadClinicSettings() {
    if (!clinicId || clinicId === 'default') return;

    try {
        const doc = await db.collection("Clinics").doc(clinicId).get();
        if (doc.exists) {
            const data = doc.data();
            if (data.clinicName) {
                document.getElementById('clinic_name').value = data.clinicName;
            }
            if (data.logoUrl && data.logoUrl !== "") {
                document.getElementById('logo-preview').src = data.logoUrl;
                document.getElementById('logo_base64').value = data.logoUrl;
            } else {
                document.getElementById('logo-preview').src = defaultLogoSVG;
                document.getElementById('logo_base64').value = "";
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

// 🔴 دالة حذف اللوجو 🔴
function deleteLogo() {
    document.getElementById('logo-preview').src = defaultLogoSVG;
    document.getElementById('logo_base64').value = "";
    document.getElementById('clinic_logo').value = ""; // تفريغ حقل الملف
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

    if (newPass !== confirmPass) {
        errorMsg.innerText = "❌ كلمة المرور الجديدة غير متطابقة!";
        errorMsg.style.display = 'block';
        return;
    }

    btn.disabled = true;
    btn.innerText = "جاري التحديث...";

    const user = auth.currentUser;
    
    if (user) {
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, oldPass);
        try {
            await user.reauthenticateWithCredential(credential);
            await user.updatePassword(newPass);
            alert("✅ تم تغيير كلمة المرور بنجاح!");
            closePasswordModal();
        } catch (error) {
            console.error("Password update error:", error);
            errorMsg.style.display = 'block';
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

window.addEventListener('click', function(event) {
    const modal = document.getElementById('passwordModal');
    if (event.target === modal) {
        closePasswordModal();
    }
});

// ================== 🔴 دالة النسخ الاحتياطي لـ Excel السحرية 🔴 ==================
async function exportClinicDataToExcel() {
    if (!clinicId || clinicId === 'default') {
        alert("لا يوجد بيانات لتصديرها.");
        return;
    }

    const btn = document.getElementById('btn-backup');
    const originalText = document.getElementById('btn-backup-txt').innerText;
    
    const safeLang = window.settingsLang || {
        msgBkpWait: document.body.dir === 'ltr' ? "Extracting data to Excel..." : "جاري استخراج البيانات لـ Excel...",
        msgBkpDone: document.body.dir === 'ltr' ? "Excel file downloaded successfully!" : "تم تحميل ملف الـ Excel بنجاح!"
    };

    btn.disabled = true; 
    document.getElementById('btn-backup-txt').innerText = safeLang.msgBkpWait;

    try {
        // 1. إنشاء ملف (Workbook) جديد
        var wb = XLSX.utils.book_new();

        // 2. سحب وتجهيز شيت "المرضى"
        const patSnap = await db.collection("Patients").where("clinicId", "==", clinicId).get();
        let patientsList = [];
        patSnap.forEach(doc => {
            const d = doc.data();
            patientsList.push({
                "اسم المريض": d.name || '---',
                "الموبايل": d.phone || '---',
                "العمر": d.age || '---',
                "النوع": d.gender || '---',
                "تاريخ التسجيل": d.createdAt ? d.createdAt.toDate().toLocaleDateString('ar-EG') : '---'
            });
        });
        if (patientsList.length > 0) {
            var wsPatients = XLSX.utils.json_to_sheet(patientsList);
            XLSX.utils.book_append_sheet(wb, wsPatients, "قائمة المرضى");
        }

        // 3. سحب وتجهيز شيت "الحجوزات"
        const appSnap = await db.collection("Appointments").where("clinicId", "==", clinicId).get();
        let appsList = [];
        appSnap.forEach(doc => {
            const d = doc.data();
            let status = d.status === 'completed' ? 'مكتمل' : (d.status === 'cancelled' ? 'ملغي' : 'في الانتظار');
            appsList.push({
                "اسم المريض": d.patientName || '---',
                "التاريخ": d.date || '---',
                "الوقت": d.time || '---',
                "نوع الكشف": d.type || '---',
                "المدفوع": d.paid || 0,
                "المتبقي": d.remaining || 0,
                "الحالة": status
            });
        });
        if (appsList.length > 0) {
            var wsApps = XLSX.utils.json_to_sheet(appsList);
            XLSX.utils.book_append_sheet(wb, wsApps, "حجوزات العيادة");
        }

        // 4. سحب وتجهيز شيت "الحسابات والمصروفات"
        const finSnap = await db.collection("Finances").where("clinicId", "==", clinicId).get();
        let finList = [];
        finSnap.forEach(doc => {
            const d = doc.data();
            let type = d.type === 'income' ? 'إيراد (+)' : 'مصروف (-)';
            finList.push({
                "نوع الحركة": type,
                "البند": d.category || '---',
                "المبلغ": d.amount || 0,
                "التاريخ": d.date || '---',
                "ملاحظات": d.notes || '---'
            });
        });
        if (finList.length > 0) {
            var wsFin = XLSX.utils.json_to_sheet(finList);
            XLSX.utils.book_append_sheet(wb, wsFin, "الخزنة والحسابات");
        }

        // 5. حفظ الملف على جهاز المستخدم
        const clinicName = document.getElementById('clinic_name').value || "Clinic";
        const dateStr = new Date().toISOString().split('T')[0];
        const fileName = `${clinicName}_Backup_${dateStr}.xlsx`;

        XLSX.writeFile(wb, fileName);
        alert(safeLang.msgBkpDone);

    } catch (error) {
        console.error("Excel Backup Error:", error);
        alert("حدث خطأ أثناء استخراج البيانات.");
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
