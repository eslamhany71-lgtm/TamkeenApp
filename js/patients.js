// js/patients.js

const db = firebase.firestore();
let currentClinicId = sessionStorage.getItem('clinicId');

// 1. نظام الترجمة لشاشة المرضى
function updatePageContent(lang) {
    const t = {
        ar: {
            title: "إدارة المرضى", sub: "قائمة المرضى المسجلين بالعيادة والتاريخ الطبي",
            search: "بحث بالاسم أو رقم الموبايل...", btnAdd: "إضافة مريض",
            thName: "اسم المريض", thPhone: "رقم الموبايل", thAge: "السن", thHistory: "تنبيهات طبية", thAction: "إجراءات",
            mTitle: "تسجيل مريض جديد", lName: "اسم المريض بالكامل", lPhone: "رقم الموبايل", lAge: "السن", lGender: "النوع",
            optM: "ذكر", optF: "أنثى", lHistory: "التاريخ الطبي والأمراض المزمنة (إن وجد)", 
            cDiab: "مرض السكر", cBp: "ضغط الدم", cBleed: "سيولة بالدم", cAllg: "حساسية بنج",
            lNotes: "ملاحظات إضافية", btnSave: "حفظ بيانات المريض", btnView: "فتح الملف الطبي"
        },
        en: {
            title: "Patients Management", sub: "List of registered clinic patients and medical history",
            search: "Search by name or phone...", btnAdd: "Add Patient",
            thName: "Patient Name", thPhone: "Phone Number", thAge: "Age", thHistory: "Medical Alerts", thAction: "Actions",
            mTitle: "Register New Patient", lName: "Full Name", lPhone: "Phone Number", lAge: "Age", lGender: "Gender",
            optM: "Male", optF: "Female", lHistory: "Medical History & Chronic Diseases", 
            cDiab: "Diabetes", cBp: "Blood Pressure", cBleed: "Bleeding", cAllg: "Anesthesia Allergy",
            lNotes: "Additional Notes", btnSave: "Save Patient Data", btnView: "Open Medical File"
        }
    };
    const c = t[lang] || t.ar;
    const setTxt = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };

    setTxt('txt-title', c.title); setTxt('txt-subtitle', c.sub); setTxt('btn-add-txt', c.btnAdd);
    document.getElementById('searchInput').placeholder = c.search;
    setTxt('th-name', c.thName); setTxt('th-phone', c.thPhone); setTxt('th-age', c.thAge); setTxt('th-history', c.thHistory); setTxt('th-action', c.thAction);
    setTxt('modal-title', c.mTitle); setTxt('lbl-p-name', c.lName); setTxt('lbl-p-phone', c.lPhone); setTxt('lbl-p-age', c.lAge); setTxt('lbl-p-gender', c.lGender);
    setTxt('opt-male', c.optM); setTxt('opt-female', c.optF); setTxt('lbl-p-history', c.lHistory);
    setTxt('chk-diab', c.cDiab); setTxt('chk-bp', c.cBp); setTxt('chk-bleed', c.cBleed); setTxt('chk-allg', c.cAllg);
    setTxt('lbl-p-notes', c.lNotes); setTxt('btn-save', c.btnSave);
    
    // حفظ كلمة "فتح الملف" في متغير لاستخدامها وقت بناء الجدول
    window.btnViewTxt = c.btnView;
}

// 2. دوال النافذة المنبثقة (Modal)
function openPatientModal() {
    document.getElementById('addPatientForm').reset();
    document.getElementById('patientModal').style.display = 'flex';
}
function closePatientModal() {
    document.getElementById('patientModal').style.display = 'none';
}

// 3. حفظ المريض في الفايربيز
async function savePatient(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save');
    btn.disabled = true; btn.innerText = "...";

    if (!currentClinicId) { alert("حدث خطأ: لم يتم التعرف على العيادة!"); return; }

    // جمع بيانات الأمراض
    let diseases = [];
    if(document.getElementById('med_diabetes').checked) diseases.push(document.getElementById('med_diabetes').value);
    if(document.getElementById('med_bp').checked) diseases.push(document.getElementById('med_bp').value);
    if(document.getElementById('med_bleeding').checked) diseases.push(document.getElementById('med_bleeding').value);
    if(document.getElementById('med_allergy').checked) diseases.push(document.getElementById('med_allergy').value);

    const patientData = {
        clinicId: currentClinicId,
        name: document.getElementById('p_name').value.trim(),
        phone: document.getElementById('p_phone').value.trim(),
        age: document.getElementById('p_age').value,
        gender: document.getElementById('p_gender').value,
        medicalHistory: diseases,
        notes: document.getElementById('p_notes').value.trim(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection("Patients").add(patientData);
        closePatientModal();
        alert("تم تسجيل المريض بنجاح!");
    } catch (error) {
        console.error("Error adding patient: ", error);
        alert("حدث خطأ أثناء الحفظ");
    } finally {
        const lang = localStorage.getItem('preferredLang') || 'ar';
        btn.disabled = false; btn.innerText = lang === 'ar' ? "حفظ بيانات المريض" : "Save Patient Data";
    }
}

// 4. جلب وعرض المرضى للعيادة الحالية فقط
function loadPatients() {
    if (!currentClinicId) return;

    db.collection("Patients")
      .where("clinicId", "==", currentClinicId)
      .orderBy("createdAt", "desc")
      .onSnapshot(snap => {
        const tbody = document.getElementById('patientsBody');
        tbody.innerHTML = '';
        
        if(snap.empty) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center;">لا يوجد مرضى مسجلين حتى الآن</td></tr>`;
            return;
        }

        snap.forEach(doc => {
            const p = doc.data();
            const patientId = doc.id;
            
            let historyTags = '';
            if (p.medicalHistory && p.medicalHistory.length > 0) {
                p.medicalHistory.forEach(disease => {
                    historyTags += `<span class="tag tag-danger">${disease}</span>`;
                });
            } else {
                historyTags = `<span style="color: #94a3b8; font-size: 13px;">سليم</span>`;
            }

            const viewBtnTxt = window.btnViewTxt || "فتح الملف الطبي";

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: 600;">${p.name}</td>
                <td dir="ltr" style="text-align: ${document.body.dir === 'rtl' ? 'right' : 'left'}">${p.phone}</td>
                <td>${p.age}</td>
                <td>${historyTags}</td>
                <td>
                    <button class="btn-action" onclick="openMedicalProfile('${patientId}')">${viewBtnTxt}</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    });
}

// 5. فتح الملف الطبي (الشاشة الثانية)
function openMedicalProfile(patientId) {
    window.location.href = `patient-profile.html?id=${patientId}`;
}

// 6. فلترة البحث
function filterPatients() {
    const input = document.getElementById('searchInput').value.toLowerCase();
    const rows = document.getElementById('patientsBody').getElementsByTagName('tr');
    
    for (let i = 0; i < rows.length; i++) {
        const nameCol = rows[i].getElementsByTagName('td')[0];
        const phoneCol = rows[i].getElementsByTagName('td')[1];
        if (nameCol && phoneCol) {
            const nameTxt = nameCol.textContent || nameCol.innerText;
            const phoneTxt = phoneCol.textContent || phoneCol.innerText;
            if (nameTxt.toLowerCase().indexOf(input) > -1 || phoneTxt.indexOf(input) > -1) {
                rows[i].style.display = "";
            } else {
                rows[i].style.display = "none";
            }
        }
    }
}

// التشغيل عند التحميل
window.onload = () => {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.body.dir = lang === 'en' ? 'ltr' : 'rtl';
    updatePageContent(lang);
    loadPatients();
};
