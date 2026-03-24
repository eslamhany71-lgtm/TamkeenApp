const db = firebase.firestore();

// 1. جلب ID المريض من الرابط
const urlParams = new URLSearchParams(window.location.search);
const patientId = urlParams.get('id');
const clinicId = sessionStorage.getItem('clinicId');

// 2. نظام الترجمة
function updatePageContent(lang) {
    const t = {
        ar: {
            back: "العودة لقائمة المرضى", tSess: "🦷 الجلسات السابقة", tXray: "📸 الأشعة والصور", tPresc: "💊 الروشتات",
            sTitle: "سجل الجلسات", btnSess: "➕ إضافة جلسة جديدة", noSess: "لا توجد جلسات مسجلة حتى الآن.",
            xTitle: "معرض الأشعة والصور", btnXray: "📸 رفع صورة/أشعة", noXray: "لا توجد صور أو أشعة مرفوعة.",
            pTitle: "الروشتات المصدرة", btnPresc: "💊 كتابة روشتة جديدة", noPresc: "لم يتم إصدار أي روشتات لهذا المريض."
        },
        en: {
            back: "Back to Patients", tSess: "🦷 Previous Sessions", tXray: "📸 X-Rays & Photos", tPresc: "💊 Prescriptions",
            sTitle: "Sessions Log", btnSess: "➕ Add New Session", noSess: "No sessions recorded yet.",
            xTitle: "X-Rays Gallery", btnXray: "📸 Upload Photo/X-Ray", noXray: "No photos or X-Rays uploaded.",
            pTitle: "Issued Prescriptions", btnPresc: "💊 Write New Prescription", noPresc: "No prescriptions issued for this patient."
        }
    };
    const c = t[lang] || t.ar;
    const setTxt = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };

    setTxt('txt-back', c.back); setTxt('tab-sessions', c.tSess); setTxt('tab-xrays', c.tXray); setTxt('tab-prescriptions', c.tPresc);
    setTxt('txt-sess-title', c.sTitle); setTxt('btn-add-sess', c.btnSess); setTxt('txt-no-sess', c.noSess);
    setTxt('txt-xray-title', c.xTitle); setTxt('btn-add-xray', c.btnXray); setTxt('txt-no-xray', c.noXray);
    setTxt('txt-presc-title', c.pTitle); setTxt('btn-add-presc', c.btnPresc); setTxt('txt-no-presc', c.noPresc);
}

// 3. التبديل بين التابات
function switchTab(tabId, element) {
    // إزالة Active من كل التابات والمحتوى
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    // إضافة Active للتاب المطلوب
    element.classList.add('active');
    document.getElementById(`content-${tabId}`).classList.add('active');
}

// 4. جلب بيانات المريض من الفايربيز
async function loadPatientData() {
    if (!patientId || !clinicId) {
        document.getElementById('prof-name').innerText = "خطأ: لم يتم العثور على المريض";
        return;
    }

    try {
        const doc = await db.collection("Patients").doc(patientId).get();
        if (doc.exists) {
            const p = doc.data();
            
            // حماية إضافية: التأكد إن المريض ده تبع العيادة دي
            if (p.clinicId !== clinicId) {
                document.getElementById('prof-name').innerText = "عفواً، غير مصرح لك برؤية هذا الملف";
                return;
            }

            // عرض البيانات الأساسية
            document.getElementById('prof-name').innerText = p.name;
            document.getElementById('prof-phone').innerHTML = `📞 <span dir="ltr">${p.phone}</span>`;
            document.getElementById('prof-age').innerText = `🎂 ${p.age} سنة`;
            document.getElementById('prof-gender').innerText = `🚻 ${p.gender}`;

            // عرض الأمراض المزمنة (إن وجدت)
            const alertsContainer = document.getElementById('prof-alerts');
            alertsContainer.innerHTML = ''; // تفريغ
            
            if (p.medicalHistory && p.medicalHistory.length > 0) {
                p.medicalHistory.forEach(disease => {
                    alertsContainer.innerHTML += `<span class="alert-tag">⚠️ ${disease}</span>`;
                });
            } else {
                alertsContainer.innerHTML = `<span style="color: #10b981; font-weight: bold;">✅ لا يوجد أمراض مزمنة</span>`;
            }
        }
    } catch (error) {
        console.error("خطأ في جلب بيانات المريض:", error);
    }
}

// التشغيل عند التحميل
window.onload = () => {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.body.dir = lang === 'en' ? 'ltr' : 'rtl';
    updatePageContent(lang);
    loadPatientData();
};
