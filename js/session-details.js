const db = firebase.firestore();
const urlParams = new URLSearchParams(window.location.search);
const sessionId = urlParams.get('sessionId');
const patientId = urlParams.get('patientId');
const clinicId = sessionStorage.getItem('clinicId');

let sessionData = null;
let patientName = "المريض";
let clinicPharmacy = []; // قائمة الأدوية الخاصة بالعيادة
let currentPrescriptionDrugs = []; // الأدوية المختارة في الروشتة المفتوحة حالياً
let activePrescriptionDocId = null; // لو فيه روشتة متسجلة أصلاً للجلسة دي

function goBackToPatient() {
    window.parent.loadPage(`patient-profile.html?id=${patientId}`, window.parent.document.getElementById('nav-patients').parentElement);
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) { if (e.target === this) this.style.display = 'none'; });
    });
});

async function loadSessionDetails() {
    if(!sessionId || !clinicId) return;

    // جلب اسم المريض للطباعة
    db.collection("Patients").doc(patientId).get().then(doc => {
        if(doc.exists) {
            patientName = doc.data().name;
            document.getElementById('print-patient-name').innerText = patientName;
        }
    });

    // جلب تفاصيل الجلسة الأساسية
    db.collection("Sessions").doc(sessionId).onSnapshot(doc => {
        if(doc.exists) {
            sessionData = doc.data();
            document.getElementById('sd-procedure').innerText = sessionData.procedure;
            document.getElementById('sd-date').innerText = sessionData.date;
            document.getElementById('sd-tooth').innerText = sessionData.tooth || '---';
            document.getElementById('sd-total').innerText = sessionData.total || 0;
            document.getElementById('sd-paid').innerText = sessionData.paid || 0;
            document.getElementById('sd-remaining').innerText = sessionData.remaining || 0;
            document.getElementById('sd-notes').innerText = sessionData.notes || 'لا يوجد';

            // زرار اكتمل الدفع
            const btnComplete = document.getElementById('btn-complete-pay-container');
            if(Number(sessionData.remaining) > 0) {
                btnComplete.style.display = 'block';
            } else {
                btnComplete.style.display = 'none';
            }
        }
    });

    loadSessionXRays();
    loadSessionPrescription();
    loadClinicPharmacy();
}

// 1. زرار "اكتمل الدفع" السحري
async function markPaymentComplete() {
    if(confirm("هل أنت متأكد من اكتمال الدفع؟ سيتم تصفير المتبقي وإضافته للمدفوع.")) {
        const total = Number(sessionData.total);
        try {
            await db.collection("Sessions").doc(sessionId).update({
                paid: total,
                remaining: 0
            });
            alert("تم تحديث الحساب بنجاح!");
        } catch(e) { console.error(e); }
    }
}

// 2. تعديل الجلسة
function openEditSessionModal() {
    if(!sessionData) return;
    document.getElementById('es_date').value = sessionData.date;
    document.getElementById('es_next_date').value = sessionData.nextAppointment || '';
    document.getElementById('es_procedure').value = sessionData.procedure;
    document.getElementById('es_total').value = sessionData.total || 0;
    document.getElementById('es_paid').value = sessionData.paid || 0;
    document.getElementById('es_remaining').value = sessionData.remaining || 0;
    openModal('editSessionModal');
}

function calcEditRemaining() {
    const t = Number(document.getElementById('es_total').value) || 0;
    const p = Number(document.getElementById('es_paid').value) || 0;
    document.getElementById('es_remaining').value = Math.max(0, t - p);
}

async function updateSession(e) {
    e.preventDefault();
    const data = {
        date: document.getElementById('es_date').value,
        nextAppointment: document.getElementById('es_next_date').value || null,
        procedure: document.getElementById('es_procedure').value,
        total: Number(document.getElementById('es_total').value),
        paid: Number(document.getElementById('es_paid').value),
        remaining: Number(document.getElementById('es_remaining').value)
    };
    try {
        await db.collection("Sessions").doc(sessionId).update(data);
        closeModal('editSessionModal');
    } catch(e) { console.error(e); }
}

// 3. رفع وعرض المرفقات (الأشعة الخاصة بالجلسة)
function encodeSessionImage(element) {
    const file = element.files[0];
    const reader = new FileReader();
    reader.onloadend = function() { document.getElementById('sx_base64').value = reader.result; }
    if (file) reader.readAsDataURL(file);
}

async function saveSessionXRay(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-sx');
    btn.disabled = true; btn.innerText = "جاري الرفع...";
    const data = {
        clinicId: clinicId, patientId: patientId, sessionId: sessionId,
        type: document.getElementById('sx_type').value,
        imageBase64: document.getElementById('sx_base64').value,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    try {
        await db.collection("XRays").add(data);
        closeModal('xrayModal'); document.querySelector('#xrayModal form').reset();
    } catch (e) { alert("حجم الصورة كبير جداً!"); }
    finally { btn.disabled = false; btn.innerText = "رفع المرفق"; }
}

function loadSessionXRays() {
    db.collection("XRays").where("sessionId", "==", sessionId).onSnapshot(snap => {
        const list = document.getElementById('session-xrays-list');
        list.innerHTML = '';
        if (snap.empty) { list.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;">لا توجد مرفقات.</div>`; return; }
        snap.forEach(doc => {
            const x = doc.data();
            list.innerHTML += `
                <div class="xray-card" style="padding: 10px;">
                    <a href="${x.imageBase64}" target="_blank"><img src="${x.imageBase64}" style="width:100%; height:100px; object-fit:cover; border-radius:6px; border:1px solid #e2e8f0;"></a>
                    <p style="font-size: 12px; margin: 5px 0; font-weight:bold;">${x.type}</p>
                    <button class="btn-danger" style="width:100%; padding:4px; font-size:12px;" onclick="deleteDoc('XRays', '${doc.id}')">🗑️</button>
                </div>
            `;
        });
    });
}

// ================= 4. الروشتة الذكية (الصيدلية) =================

// جلب قاعدة الأدوية الخاصة بالعيادة
function loadClinicPharmacy() {
    db.collection("Pharmacy").where("clinicId", "==", clinicId).onSnapshot(snap => {
        clinicPharmacy = [];
        snap.forEach(doc => clinicPharmacy.push({ id: doc.id, ...doc.data() }));
    });
}

function openAddDrugModal() {
    document.getElementById('new_drug_category').value = '';
    document.getElementById('new_drug_name').value = '';
    document.getElementById('new_drug_dose').value = '';
    openModal('addDrugModal');
}

async function saveNewDrugToPharmacy(e) {
    e.preventDefault();
    const data = {
        clinicId: clinicId,
        category: document.getElementById('new_drug_category').value,
        name: document.getElementById('new_drug_name').value,
        defaultDose: document.getElementById('new_drug_dose').value
    };
    try {
        await db.collection("Pharmacy").add(data);
        closeModal('addDrugModal');
        // نضع الدواء في خانة البحث أوتوماتيك
        document.getElementById('drug-search').value = data.name;
        searchDrugs();
    } catch(e) { console.error(e); }
}

function searchDrugs() {
    const input = document.getElementById('drug-search').value.toLowerCase();
    const resultBox = document.getElementById('search-results-box');
    resultBox.innerHTML = '';
    
    if(input.length === 0) { resultBox.style.display = 'none'; return; }
    
    const filtered = clinicPharmacy.filter(d => d.name.toLowerCase().includes(input) || d.category.toLowerCase().includes(input));
    
    if(filtered.length === 0) {
        resultBox.innerHTML = '<div class="search-item" style="color:#64748b;">لا يوجد دواء بهذا الاسم. اضغط زر (جديد +) لإضافته.</div>';
    } else {
        filtered.forEach(d => {
            const div = document.createElement('div');
            div.className = 'search-item';
            div.innerHTML = `<strong>${d.name}</strong> <small style="color:gray;">(${d.category})</small>`;
            div.onclick = () => addDrugToPrescriptionList(d);
            resultBox.appendChild(div);
        });
    }
    resultBox.style.display = 'block';
}

function addDrugToPrescriptionList(drug) {
    // إخفاء البحث وتفريغه
    document.getElementById('search-results-box').style.display = 'none';
    document.getElementById('drug-search').value = '';
    
    // إضافة الدواء للقائمة الحالية
    currentPrescriptionDrugs.push({ name: drug.name, dose: drug.defaultDose });
    renderSelectedDrugs();
}

function removeDrugFromList(index) {
    currentPrescriptionDrugs.splice(index, 1);
    renderSelectedDrugs();
}

function renderSelectedDrugs() {
    const list = document.getElementById('selected-drugs-list');
    list.innerHTML = '';
    if(currentPrescriptionDrugs.length === 0) {
        list.innerHTML = '<p style="color: #64748b; text-align: center; font-size: 14px;">لم يتم اختيار أدوية بعد. ابحث في الأعلى واختر العلاج.</p>';
        return;
    }
    
    currentPrescriptionDrugs.forEach((drug, index) => {
        list.innerHTML += `
            <div class="drug-list-item">
                <div style="flex: 1; font-weight: bold; font-family: sans-serif;" dir="ltr">${drug.name}</div>
                <div style="flex: 2;">
                    <input type="text" value="${drug.dose}" id="dose_${index}" onchange="updateDose(${index}, this.value)" style="width: 100%; padding: 5px; border: 1px solid #cbd5e1; border-radius: 4px;">
                </div>
                <div><button class="btn-danger" style="padding: 5px;" onclick="removeDrugFromList(${index})">❌</button></div>
            </div>
        `;
    });
}

function updateDose(index, newDose) {
    currentPrescriptionDrugs[index].dose = newDose;
}

function openSmartRxModal() {
    document.getElementById('drug-search').value = '';
    document.getElementById('search-results-box').style.display = 'none';
    renderSelectedDrugs();
    openModal('smartRxModal');
}

// حفظ الروشتة في الداتا بيز مربوطة بالجلسة
async function saveSmartPrescription() {
    if(currentPrescriptionDrugs.length === 0) { alert("برجاء اختيار دواء واحد على الأقل."); return; }
    
    // تجميع الأدوية في نص منسق (عشان الطباعة القديمة تشتغل زي ما هي)
    let medsText = "";
    currentPrescriptionDrugs.forEach((d, i) => {
        medsText += `${i+1}. ${d.name}\n   ${d.dose}\n\n`;
    });
    
    const notes = document.getElementById('rx_general_notes').value;
    const dateStr = new Date().toISOString().split('T')[0];

    const data = {
        clinicId: clinicId, patientId: patientId, sessionId: sessionId,
        medications: medsText, notes: notes, date: dateStr,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        if(activePrescriptionDocId) {
            // تحديث لو موجودة
            await db.collection("Prescriptions").doc(activePrescriptionDocId).update(data);
        } else {
            // إضافة لو جديدة
            await db.collection("Prescriptions").add(data);
        }
        closeModal('smartRxModal');
    } catch(e) { console.error(e); }
}

// عرض الروشتة المربوطة بالجلسة في الشاشة والطباعة
function loadSessionPrescription() {
    db.collection("Prescriptions").where("sessionId", "==", sessionId).onSnapshot(snap => {
        const container = document.getElementById('session-rx-container');
        if(snap.empty) {
            container.innerHTML = `<div class="empty-state">لا توجد روشتة مسجلة لهذه الجلسة.</div>`;
            activePrescriptionDocId = null;
            currentPrescriptionDrugs = [];
            return;
        }
        
        snap.forEach(doc => {
            const p = doc.data();
            activePrescriptionDocId = doc.id;
            
            // هنا بنعرضها كـ Text عادي في الشاشة للمعاينة
            container.innerHTML = `
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px dashed #cbd5e1; position: relative;">
                    <div style="white-space: pre-wrap; direction: ltr; text-align: left; font-weight:bold; color:#0f172a;">${p.medications}</div>
                    ${p.notes ? `<p style="margin-top:10px; color:#475569; border-top: 1px solid #e2e8f0; padding-top: 5px;"><strong>تعليمات:</strong> ${p.notes}</p>` : ''}
                    
                    <div style="margin-top: 15px; display: flex; gap: 10px;">
                        <button class="btn-primary" style="flex:1; background:#10b981;" onclick="printSessionRx('${doc.id}')">🖨️ طباعة</button>
                        <button class="btn-danger" style="flex:1;" onclick="deleteDoc('Prescriptions', '${doc.id}')">🗑️ حذف</button>
                    </div>
                </div>
            `;
        });
    });
}

function printSessionRx(docId) {
    db.collection("Prescriptions").doc(docId).get().then(doc => {
        if(doc.exists) {
            const p = doc.data();
            document.getElementById('print-date').innerText = p.date;
            document.getElementById('print-meds').innerText = p.medications;
            document.getElementById('print-notes').innerText = p.notes || 'لا يوجد';
            db.collection("Clinics").doc(clinicId).get().then(cDoc => {
                if(cDoc.exists && cDoc.data().clinicName) {
                    document.getElementById('print-clinic-name').innerText = cDoc.data().clinicName;
                }
                window.print();
            });
        }
    });
}

async function deleteDoc(collectionName, docId) {
    if(confirm("هل أنت متأكد من الحذف؟")) {
        try { await db.collection(collectionName).doc(docId).delete(); } 
        catch (e) { console.error(e); }
    }
}

window.onload = () => {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.body.dir = lang === 'en' ? 'ltr' : 'rtl';
    firebase.auth().onAuthStateChanged((user) => { if (user) loadSessionDetails(); });
};
