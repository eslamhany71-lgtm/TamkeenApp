const db = firebase.firestore();
const clinicId = sessionStorage.getItem('clinicId');

// 1. نظام الترجمة
function updatePageContent(lang) {
    const t = {
        ar: {
            title: "إعدادات العيادة", sub: "تخصيص بيانات العيادة والشعار (اللوجو)", cardTitle: "البيانات الأساسية",
            lLogo: "شعار العيادة (اللوجو)", lHint: "يفضل أن تكون الصورة مربعة (1:1) بخلفية شفافة",
            lName: "اسم العيادة / المركز الطبي", pName: "أدخل اسم العيادة الذي سيظهر في النظام والروشتات",
            btnSave: "حفظ التعديلات", msgSuccess: "تم حفظ التعديلات بنجاح!", msgError: "حدث خطأ أثناء الحفظ"
        },
        en: {
            title: "Clinic Settings", sub: "Customize clinic data and logo", cardTitle: "Basic Information",
            lLogo: "Clinic Logo", lHint: "Square image (1:1) with transparent background is recommended",
            lName: "Clinic / Center Name", pName: "Enter the clinic name to appear in the system and prescriptions",
            btnSave: "Save Changes", msgSuccess: "Changes saved successfully!", msgError: "Error saving changes"
        }
    };
    const c = t[lang] || t.ar;
    const setTxt = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };

    setTxt('txt-title', c.title); setTxt('txt-subtitle', c.sub); setTxt('txt-card-title', c.cardTitle);
    setTxt('lbl-logo', c.lLogo); setTxt('lbl-logo-hint', c.lHint); setTxt('lbl-name', c.lName);
    document.getElementById('clinic_name').placeholder = c.pName;
    setTxt('btn-save', c.btnSave);
    
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

// 3. تحويل الصورة المرفوعة إلى Base64 لعرضها وحفظها
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

// 4. حفظ التعديلات في الفايربيز وتحديث القائمة الجانبية فوراً
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

        // 🔴 التريكة السحرية: تحديث اللوجو والاسم في الهيكل الخارجي (home.html) فوراً بدون ريفريش
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
