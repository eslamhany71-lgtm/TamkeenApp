const db = firebase.firestore();
let currentClinicId = sessionStorage.getItem('clinicId');
let currentEditPatientId = null; // متغير يحدد إحنا بنضيف ولا بنعدل
let patientsDataArray = []; // لتخزين البيانات محلياً لتسهيل التعديل

// 1. نظام الترجمة (مسطرة لغوياً)
function updatePageContent(lang) {
    const t = {
        ar: {
            title: "إدارة المرضى", sub: "قائمة المرضى المسجلين بالعيادة والتاريخ الطبي",
            search: "بحث بالاسم أو رقم الموبايل...", btnAdd: "إضافة مريض",
            thName: "اسم المريض", thPhone: "رقم الموبايل", thAge: "السن", thHistory: "تنبيهات طبية", thAction: "إجراءات",
            mTitleAdd: "تسجيل مريض جديد", mTitleEdit: "تعديل بيانات المريض", lName: "اسم المريض بالكامل", lPhone: "رقم الموبايل", lAge: "السن", lGender: "النوع",
            optM: "ذكر", optF: "أنثى", lHistory: "التاريخ الطبي والأمراض المزمنة (إن وجد)", 
            cDiab: "مرض السكر", cBp: "ضغط الدم", cBleed: "سيولة بالدم", cAllg: "حساسية بنج",
            lNotes: "ملاحظات إضافية", btnSave: "حفظ البيانات", btnView: "فتح الملف",
            selCount: "تم تحديد", patWord: "مريض", bulkDel: "🗑️ حذف المحدد", confDel: "هل أنت متأكد من حذف المريض؟ لا يمكن التراجع عن هذا الإجراء.", confBulkDel: "هل أنت متأكد من حذف جميع المرضى المحددين؟"
        },
        en: {
            title: "Patients Management", sub: "List of registered clinic patients and medical history",
            search: "Search by name or phone...", btnAdd: "Add Patient",
            thName: "Patient Name", thPhone: "Phone Number", thAge: "Age", thHistory: "Medical Alerts", thAction: "Actions",
            mTitleAdd: "Register New Patient", mTitleEdit: "Edit Patient Data", lName: "Full Name", lPhone: "Phone Number", lAge: "Age", lGender: "Gender",
            optM: "Male", optF: "Female", lHistory: "Medical History & Chronic Diseases", 
            cDiab: "Diabetes", cBp: "Blood Pressure", cBleed: "Bleeding", cAllg: "Anesthesia Allergy",
            lNotes: "Additional Notes", btnSave: "Save Data", btnView: "Open File",
            selCount: "Selected", patWord: "Patient(s)", bulkDel: "🗑️ Delete Selected", confDel: "Are you sure you want to delete this patient? This action cannot be undone.", confBulkDel: "Are you sure you want to delete all selected patients?"
        }
    };
    const c = t[lang] || t.ar;
    const setTxt = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };

    setTxt('txt-title', c.title); setTxt('txt-subtitle', c.sub); setTxt('btn-add-txt', c.btnAdd);
    document.getElementById('searchInput').placeholder = c.search;
    setTxt('th-name', c.thName); setTxt('th-phone', c.thPhone); setTxt('th-age', c.thAge); setTxt('th-history', c.thHistory); setTxt('th-action', c.thAction);
    setTxt('lbl-p-name', c.lName); setTxt('lbl-p-phone', c.lPhone); setTxt('lbl-p-age', c.lAge); setTxt('lbl-p-gender', c.lGender);
    setTxt('opt-male', c.optM); setTxt('opt-female', c.optF); setTxt('lbl-p-history', c.lHistory);
    setTxt('chk-diab', c.cDiab); setTxt('chk-bp', c.cBp); setTxt('chk-bleed', c.cBleed); setTxt('chk-allg', c.cAllg);
    setTxt('lbl-p-notes', c.lNotes); 
    setTxt('btn-bulk-delete', c.bulkDel);
    
    // حفظ متغيرات الجافاسكريبت للترجمة الديناميكية
    window.langVars = {
        mTitleAdd: c.mTitleAdd, mTitleEdit: c.mTitleEdit, btnSave: c.btnSave, btnView: c.btnView,
        selCount: c.selCount, patWord: c.patWord, confDel: c.confDel, confBulkDel: c.confBulkDel
    };
    updateBulkActionBar(); // تحديث النص لو محددين حاجة
}

// 2. إدارة النافذة (إضافة وتعديل)
function openPatientModal(patientId = null) {
    document.getElementById('addPatientForm').reset();
    currentEditPatientId = patientId;
    
    // تفريغ الشيك بوكس
    ['med_diabetes', 'med_bp', 'med_bleeding', 'med_allergy'].forEach(id => document.getElementById(id).checked = false);

    if (patientId) {
        // وضع التعديل (جلب الداتا وتعبئة الفورم)
        document.getElementById('modal-title').innerText = window.langVars.mTitleEdit;
        const p = patientsDataArray.find(x => x.id === patientId);
        if(p) {
            document.getElementById('p_name').value = p.name;
            document.getElementById('p_phone').value = p.phone;
            document.getElementById('p_age').value = p.age;
            document.getElementById('p_gender').value = p.gender;
            document.getElementById('p_notes').value = p.notes || '';
            
            if(p.medicalHistory) {
                if(p.medicalHistory.includes('سكر')) document.getElementById('med_diabetes').checked = true;
                if(p.medicalHistory.includes('ضغط')) document.getElementById('med_bp').checked = true;
                if(p.medicalHistory.includes('سيولة')) document.getElementById('med_bleeding').checked = true;
                if(p.medicalHistory.includes('حساسية بنج')) document.getElementById('med_allergy').checked = true;
            }
        }
    } else {
        // وضع الإضافة
        document.getElementById('modal-title').innerText = window.langVars.mTitleAdd;
    }
    
    document.getElementById('btn-save').innerText = window.langVars.btnSave;
    document.getElementById('patientModal').style.display = 'flex';
}

function closePatientModal() {
    document.getElementById('patientModal').style.display = 'none';
}

// 3. حفظ أو تعديل المريض
async function savePatient(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save');
    btn.disabled = true; btn.innerText = "...";

    if (!currentClinicId) { alert("حدث خطأ: لم يتم التعرف على العيادة!"); return; }

    let diseases = [];
    if(document.getElementById('med_diabetes').checked) diseases.push('سكر');
    if(document.getElementById('med_bp').checked) diseases.push('ضغط');
    if(document.getElementById('med_bleeding').checked) diseases.push('سيولة');
    if(document.getElementById('med_allergy').checked) diseases.push('حساسية بنج');

    const patientData = {
        clinicId: currentClinicId,
        name: document.getElementById('p_name').value.trim(),
        phone: document.getElementById('p_phone').value.trim(),
        age: document.getElementById('p_age').value,
        gender: document.getElementById('p_gender').value,
        medicalHistory: diseases,
        notes: document.getElementById('p_notes').value.trim(),
    };

    try {
        if (currentEditPatientId) {
            // تحديث
            await db.collection("Patients").doc(currentEditPatientId).update(patientData);
        } else {
            // إضافة جديدة
            patientData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection("Patients").add(patientData);
        }
        closePatientModal();
    } catch (error) {
        console.error("Error saving patient: ", error);
        alert("حدث خطأ أثناء الحفظ");
    } finally {
        btn.disabled = false; btn.innerText = window.langVars.btnSave;
    }
}

// 4. حذف فردي
async function deletePatient(patientId) {
    if(confirm(window.langVars.confDel)) {
        try { await db.collection("Patients").doc(patientId).delete(); } 
        catch (error) { console.error("Error deleting:", error); }
    }
}

// 5. جلب وعرض المرضى
function loadPatients() {
    if (!currentClinicId) return;

    db.collection("Patients").where("clinicId", "==", currentClinicId).orderBy("createdAt", "desc").onSnapshot(snap => {
        const tbody = document.getElementById('patientsBody');
        tbody.innerHTML = '';
        patientsDataArray = []; // تحديث المصفوفة المحلية
        
        if(snap.empty) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color:#64748b;">لا يوجد مرضى مسجلين</td></tr>`;
            updateBulkActionBar();
            return;
        }

        snap.forEach(doc => {
            const p = doc.data();
            p.id = doc.id;
            patientsDataArray.push(p);
            
            let historyTags = '';
            const isAr = (localStorage.getItem('preferredLang') || 'ar') === 'ar';
            if (p.medicalHistory && p.medicalHistory.length > 0) {
                p.medicalHistory.forEach(disease => {
                    historyTags += `<span class="tag tag-danger">${disease}</span>`;
                });
            } else {
                historyTags = `<span style="color: #94a3b8; font-size: 13px;">${isAr ? 'سليم' : 'Healthy'}</span>`;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="text-align: center;">
                    <input type="checkbox" class="custom-checkbox row-checkbox" value="${p.id}" onclick="updateBulkActionBar()">
                </td>
                <td style="font-weight: 600;">${p.name}</td>
                <td dir="ltr" style="text-align: start;">${p.phone}</td>
                <td>${p.age}</td>
                <td>${historyTags}</td>
                <td>
                    <div class="action-group">
                        <button class="btn-action btn-open" onclick="openMedicalProfile('${p.id}')" title="فتح الملف">📂</button>
                        <button class="btn-action btn-edit" onclick="openPatientModal('${p.id}')" title="تعديل">✏️</button>
                        <button class="btn-action btn-delete" onclick="deletePatient('${p.id}')" title="حذف">🗑️</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        document.getElementById('selectAll').checked = false;
        updateBulkActionBar();
    });
}

// 6. اختيار المتعدد (Bulk Selection)
function toggleSelectAll(source) {
    const checkboxes = document.querySelectorAll('.row-checkbox');
    checkboxes.forEach(cb => cb.checked = source.checked);
    updateBulkActionBar();
}

function updateBulkActionBar() {
    const checkboxes = document.querySelectorAll('.row-checkbox:checked');
    const bulkBar = document.getElementById('bulk-actions');
    const txtCount = document.getElementById('txt-selected-count');
    
    if (checkboxes.length > 0) {
        txtCount.innerText = `${window.langVars.selCount} ${checkboxes.length} ${window.langVars.patWord}`;
        bulkBar.style.display = 'flex';
    } else {
        bulkBar.style.display = 'none';
    }
    
    // تظبيط زرار التحديد الكل
    const allCheckboxes = document.querySelectorAll('.row-checkbox');
    if(allCheckboxes.length > 0) {
        document.getElementById('selectAll').checked = (checkboxes.length === allCheckboxes.length);
    }
}

// 7. الحذف الجماعي
async function deleteSelectedPatients() {
    const checkboxes = document.querySelectorAll('.row-checkbox:checked');
    if(checkboxes.length === 0) return;

    if(confirm(window.langVars.confBulkDel)) {
        const btn = document.getElementById('btn-bulk-delete');
        btn.disabled = true; btn.innerText = "...";
        
        try {
            const batch = db.batch();
            checkboxes.forEach(cb => {
                const docRef = db.collection("Patients").doc(cb.value);
                batch.delete(docRef);
            });
            await batch.commit();
        } catch (error) {
            console.error("Error bulk deleting:", error);
            alert("حدث خطأ أثناء الحذف الجماعي");
        } finally {
            btn.disabled = false; btn.innerText = window.langVars.bulkDel;
        }
    }
}

function openMedicalProfile(patientId) { window.location.href = `patient-profile.html?id=${patientId}`; }

function filterPatients() {
    const input = document.getElementById('searchInput').value.toLowerCase();
    const rows = document.getElementById('patientsBody').getElementsByTagName('tr');
    
    for (let i = 0; i < rows.length; i++) {
        const nameCol = rows[i].getElementsByTagName('td')[1];
        const phoneCol = rows[i].getElementsByTagName('td')[2];
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

window.onload = () => {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.body.dir = lang === 'en' ? 'ltr' : 'rtl';
    updatePageContent(lang);
    
    firebase.auth().onAuthStateChanged((user) => {
        if (user) loadPatients();
    });
};
// إغلاق المودال عند الضغط في أي مكان فارغ بالشاشة
window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
});
