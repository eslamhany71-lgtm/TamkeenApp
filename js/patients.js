const db = firebase.firestore();
let currentClinicId = sessionStorage.getItem('clinicId');
let currentEditPatientId = null;
let patientsDataArray = []; 
let filteredPatientsArray = []; // مصفوفة جديدة للفلترة الذكية

// 🔴 متغيرات الـ Pagination للتحكم في قراءات الفايربيز
const PATIENTS_PER_PAGE = 50;
let lastVisibleDoc = null; // بيحفظ آخر مريض وقفنا عنده
let isSearchMode = false;  // عشان نفرق إحنا بنعرض لستة عادية ولا نتيجة بحث

// 1. نظام الترجمة
function updatePageContent(lang) {
    const t = {
        ar: {
            title: "إدارة المرضى", sub: "قائمة المرضى المسجلين بالعيادة والتاريخ الطبي",
            search: "بحث بالاسم أو رقم الموبايل...", btnAdd: "إضافة مريض",
            thDate: "التاريخ والوقت", thName: "اسم المريض", thPhone: "رقم الموبايل", thDebt: "المديونية", thAge: "السن", thHistory: "تنبيهات طبية", thNotes: "الملاحظات", thAction: "إجراءات",
            mTitleAdd: "تسجيل مريض جديد", mTitleEdit: "تعديل بيانات المريض", lName: "اسم المريض بالكامل", lPhone: "رقم الموبايل", lAge: "السن", lGender: "النوع",
            optM: "ذكر", optF: "أنثى", lHistory: "التاريخ الطبي والأمراض المزمنة (إن وجد)", 
            cDiab: "مرض السكر", cBp: "ضغط الدم", cBleed: "سيولة بالدم", cAllg: "حساسية بنج",
            lNotes: "ملاحظات إضافية", btnSave: "حفظ البيانات", btnView: "فتح الملف",
            selCount: "تم تحديد", patWord: "مريض", bulkDel: "🗑️ حذف المحدد", confDel: "هل أنت متأكد من حذف المريض؟ لا يمكن التراجع عن هذا الإجراء.", confBulkDel: "هل أنت متأكد من حذف جميع المرضى المحددين؟",
            loadMore: "⬇️ تحميل المزيد...", noMore: "لا يوجد مرضى آخرين", empty: "لا يوجد مرضى مسجلين"
        },
        en: {
            title: "Patients Management", sub: "List of registered clinic patients and medical history",
            search: "Search by name or phone...", btnAdd: "Add Patient",
            thDate: "Date & Time", thName: "Patient Name", thPhone: "Phone Number", thDebt: "Debt", thAge: "Age", thHistory: "Medical Alerts", thNotes: "Notes", thAction: "Actions",
            mTitleAdd: "Register New Patient", mTitleEdit: "Edit Patient Data", lName: "Full Name", lPhone: "Phone Number", lAge: "Age", lGender: "Gender",
            optM: "Male", optF: "Female", lHistory: "Medical History & Chronic Diseases", 
            cDiab: "Diabetes", cBp: "Blood Pressure", cBleed: "Bleeding", cAllg: "Anesthesia Allergy",
            lNotes: "Additional Notes", btnSave: "Save Data", btnView: "Open File",
            selCount: "Selected", patWord: "Patient(s)", bulkDel: "🗑️ Delete Selected", confDel: "Are you sure you want to delete this patient?", confBulkDel: "Are you sure you want to delete all selected patients?",
            loadMore: "⬇️ Load More...", noMore: "No more patients", empty: "No registered patients"
        }
    };
    const c = t[lang] || t.ar;
    const setTxt = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };

    setTxt('txt-title', c.title); setTxt('txt-subtitle', c.sub); setTxt('btn-add-txt', c.btnAdd);
    document.getElementById('searchInput').placeholder = c.search;
    
    // ربط عناوين الجدول بالترجمة
    setTxt('th-date', c.thDate); setTxt('th-name', c.thName); setTxt('th-phone', c.thPhone); setTxt('th-debt', c.thDebt); 
    setTxt('th-age', c.thAge); setTxt('th-history', c.thHistory); setTxt('th-notes', c.thNotes); setTxt('th-action', c.thAction);
    
    setTxt('lbl-p-name', c.lName); setTxt('lbl-p-phone', c.lPhone); setTxt('lbl-p-age', c.lAge); setTxt('lbl-p-gender', c.lGender);
    setTxt('opt-male', c.optM); setTxt('opt-female', c.optF); setTxt('lbl-p-history', c.lHistory);
    setTxt('chk-diab', c.cDiab); setTxt('chk-bp', c.cBp); setTxt('chk-bleed', c.cBleed); setTxt('chk-allg', c.cAllg);
    setTxt('lbl-p-notes', c.lNotes); 
    setTxt('btn-bulk-delete', c.bulkDel);
    
    window.langVars = c; 
    updateBulkActionBar(); 
}

function openPatientModal(patientId = null) {
    document.getElementById('addPatientForm').reset();
    currentEditPatientId = patientId;
    
    ['med_diabetes', 'med_bp', 'med_bleeding', 'med_allergy'].forEach(id => document.getElementById(id).checked = false);

    if (patientId) {
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
        document.getElementById('modal-title').innerText = window.langVars.mTitleAdd;
    }
    
    document.getElementById('btn-save').innerText = window.langVars.btnSave;
    document.getElementById('patientModal').style.display = 'flex';
}

function closePatientModal() { document.getElementById('patientModal').style.display = 'none'; }

async function savePatient(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save');
    btn.disabled = true; btn.innerText = "...";

    if (!currentClinicId) return;

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
            await db.collection("Patients").doc(currentEditPatientId).update(patientData);
            const index = patientsDataArray.findIndex(p => p.id === currentEditPatientId);
            if(index !== -1) {
                // دمج البيانات الجديدة مع القديمة (عشان نحافظ على المديونية والتاريخ)
                patientsDataArray[index] = { ...patientsDataArray[index], ...patientData };
            }
        } else {
            patientData.totalDebt = 0; // مريض جديد مفيش عليه ديون
            patientData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            const docRef = await db.collection("Patients").add(patientData);
            // نضيفه للمصفوفة بتاريخ وهمي (الآن) عشان يظهر فوراً في الجدول
            patientsDataArray.unshift({ id: docRef.id, ...patientData, createdAt: { toDate: () => new Date() } });
        }
        closePatientModal();
        filteredPatientsArray = [...patientsDataArray];
        renderPatientsTable(); 
    } catch (error) { console.error(error); } 
    finally { btn.disabled = false; btn.innerText = window.langVars.btnSave; }
}

async function deletePatient(patientId) {
    if(confirm(window.langVars.confDel)) {
        try { 
            await db.collection("Patients").doc(patientId).delete(); 
            patientsDataArray = patientsDataArray.filter(p => p.id !== patientId);
            filteredPatientsArray = [...patientsDataArray];
            renderPatientsTable();
        } 
        catch (error) { console.error(error); }
    }
}

// 6. جلب المرضى بالتقسيم
async function loadPatients(isLoadMore = false) {
    if (!currentClinicId) return;
    isSearchMode = false;

    const tbody = document.getElementById('patientsBody');
    const loadMoreBtn = document.getElementById('btn-load-more');

    if (!isLoadMore) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center;">جاري تحميل البيانات...</td></tr>';
        patientsDataArray = [];
        lastVisibleDoc = null;
    } else {
        loadMoreBtn.innerText = "...";
        loadMoreBtn.disabled = true;
    }

    try {
        let queryRef = db.collection("Patients")
                         .where("clinicId", "==", currentClinicId)
                         .orderBy("createdAt", "desc")
                         .limit(PATIENTS_PER_PAGE);

        if (isLoadMore && lastVisibleDoc) {
            queryRef = queryRef.startAfter(lastVisibleDoc);
        }

        const snap = await queryRef.get();
        
        if (!snap.empty) {
            lastVisibleDoc = snap.docs[snap.docs.length - 1];
            
            snap.forEach(doc => {
                const p = doc.data();
                p.id = doc.id;
                patientsDataArray.push(p);
            });
            
            filteredPatientsArray = [...patientsDataArray];
            renderPatientsTable();
            
            if(snap.docs.length === PATIENTS_PER_PAGE) {
                loadMoreBtn.style.display = 'block';
                loadMoreBtn.innerText = window.langVars.loadMore;
            } else {
                loadMoreBtn.style.display = 'none';
            }
        } else {
            if (!isLoadMore) {
                tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color:#64748b;">${window.langVars.empty}</td></tr>`;
            } else {
                loadMoreBtn.innerText = window.langVars.noMore;
                setTimeout(() => loadMoreBtn.style.display = 'none', 2000);
            }
        }
    } catch (error) {
        console.error("Error loading patients:", error);
    } finally {
        if(isLoadMore) loadMoreBtn.disabled = false;
    }
}

function loadMorePatients() { loadPatients(true); }

// 🔴 7. الفلترة الذكية (Local Filter) للسرعة الصاروخية 🔴
function filterPatientsLocally() {
    const input = document.getElementById('searchInput').value.trim().toLowerCase();
    
    if (!input) {
        filteredPatientsArray = [...patientsDataArray];
    } else {
        filteredPatientsArray = patientsDataArray.filter(p => {
            return (p.name && p.name.toLowerCase().includes(input)) || 
                   (p.phone && p.phone.includes(input));
        });
    }
    renderPatientsTable();
}

// البحث الدقيق (في كل الداتا بيز لو المريض مش في الـ 50 اللي اتسحبوا)
async function searchPatients() {
    const input = document.getElementById('searchInput').value.trim().toLowerCase();
    const loadMoreBtn = document.getElementById('btn-load-more');
    const tbody = document.getElementById('patientsBody');

    if (!input) { resetPatientSearch(); return; }

    isSearchMode = true;
    loadMoreBtn.style.display = 'none'; 
    tbody.innerHTML = '<tr><td colspan="9" style="text-align: center;">جاري البحث...</td></tr>';

    try {
        const snap = await db.collection("Patients").where("clinicId", "==", currentClinicId).get();
        let searchResults = [];

        snap.forEach(doc => {
            const p = doc.data();
            if ((p.name && p.name.toLowerCase().includes(input)) || (p.phone && p.phone.includes(input))) {
                p.id = doc.id;
                searchResults.push(p);
            }
        });

        searchResults.sort((a, b) => {
            let d1 = a.createdAt ? a.createdAt.toDate() : new Date(0);
            let d2 = b.createdAt ? b.createdAt.toDate() : new Date(0);
            return d2 - d1;
        });

        filteredPatientsArray = searchResults;
        renderPatientsTable();

    } catch (error) { console.error("Search Error:", error); }
}

function resetPatientSearch() {
    document.getElementById('searchInput').value = '';
    loadPatients(); 
}

// دالة رسم الجدول المحدثة (بتعرض التاريخ والمديونية)
function renderPatientsTable() {
    const tbody = document.getElementById('patientsBody');
    tbody.innerHTML = '';
    
    if(filteredPatientsArray.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color:#64748b;">لا توجد نتائج مطابقة</td></tr>`;
        return;
    }

    const isAr = (localStorage.getItem('preferredLang') || 'ar') === 'ar';

    filteredPatientsArray.forEach(p => {
        // 1. تظبيط التاريخ والوقت
        let dateStr = '---';
        let timeStr = '';
        if (p.createdAt) {
            const dateObj = p.createdAt.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
            dateStr = dateObj.toLocaleDateString(isAr ? 'ar-EG' : 'en-US');
            timeStr = dateObj.toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {hour: '2-digit', minute:'2-digit'});
        }

        // 2. تظبيط المديونية
        let debtAmount = p.totalDebt || 0;
        let debtHtml = debtAmount > 0 
            ? `<span style="color: #ef4444; font-weight: bold; background: #fee2e2; padding: 4px 8px; border-radius: 6px;">${debtAmount} ج.م</span>`
            : `<span style="color: #10b981;">0 ج.م</span>`;

        // 3. تظبيط الأمراض المزمنة
        let historyTags = '';
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
            <td>
                <div style="display: flex; flex-direction: column;">
                    <span style="font-weight: 600;">${dateStr}</span>
                    <span style="color: #000; font-size: 16px;">${timeStr}</span>
                </div>
            </td>
            <td style="font-weight: 600; color: #0f172a;">${p.name}</td>
            <td dir="ltr" style="text-align: start;">${p.phone}</td>
            <td style="text-align: center;">${debtHtml}</td>
            <td style="text-align: center;">${p.age}</td>
            <td>${historyTags}</td>
            <td style="color: #64748b; font-size: 14px; max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${p.notes || ''}">${p.notes || '---'}</td>
            <td>
                <div class="action-group" style="justify-content: center;">
                    <button class="btn-action btn-open" onclick="openMedicalProfile('${p.id}')" title="فتح الملف الطبي">📂</button>
                    <button class="btn-action btn-edit" onclick="openPatientModal('${p.id}')" title="تعديل">✏️</button>
                    <button class="btn-action btn-delete" onclick="deletePatient('${p.id}')" title="حذف">🗑️</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    document.getElementById('selectAll').checked = false;
    updateBulkActionBar();
}

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
    
    const allCheckboxes = document.querySelectorAll('.row-checkbox');
    if(allCheckboxes.length > 0) {
        document.getElementById('selectAll').checked = (checkboxes.length === allCheckboxes.length);
    }
}

async function deleteSelectedPatients() {
    const checkboxes = document.querySelectorAll('.row-checkbox:checked');
    if(checkboxes.length === 0) return;

    if(confirm(window.langVars.confBulkDel)) {
        const btn = document.getElementById('btn-bulk-delete');
        btn.disabled = true; btn.innerText = "...";
        
        try {
            const batch = db.batch();
            const idsToDelete = [];
            checkboxes.forEach(cb => {
                idsToDelete.push(cb.value);
                const docRef = db.collection("Patients").doc(cb.value);
                batch.delete(docRef);
            });
            await batch.commit();
            
            patientsDataArray = patientsDataArray.filter(p => !idsToDelete.includes(p.id));
            filteredPatientsArray = [...patientsDataArray];
            renderPatientsTable();
        } catch (error) {
            console.error(error);
        } finally {
            btn.disabled = false; btn.innerText = window.langVars.bulkDel;
        }
    }
}

function openMedicalProfile(patientId) { window.location.href = `patient-profile.html?id=${patientId}`; }

window.onload = () => {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.body.dir = lang === 'en' ? 'ltr' : 'rtl';
    updatePageContent(lang);
    
    firebase.auth().onAuthStateChanged((user) => {
        if (user) loadPatients();
    });
};

window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
});
