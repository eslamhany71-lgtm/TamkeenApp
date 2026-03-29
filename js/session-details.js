const db = firebase.firestore();
const urlParams = new URLSearchParams(window.location.search);
const sessionId = urlParams.get('sessionId');
const patientId = urlParams.get('patientId');
const clinicId = sessionStorage.getItem('clinicId');

let sessionData = null;
let patientName = "المريض";
let clinicPharmacy = []; 
let currentPrescriptionDrugs = []; 
let activePrescriptionDocId = null; 

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

    db.collection("Patients").doc(patientId).get().then(doc => {
        if(doc.exists) {
            patientName = doc.data().name;
            document.getElementById('print-patient-name').innerText = patientName;
        }
    });

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

async function markPaymentComplete() {
    if(confirm("هل أنت متأكد من اكتمال الدفع؟ سيتم تصفير المتبقي وإضافته للمدفوع.")) {
        const total = Number(sessionData.total);
        try {
            await db.collection("Sessions").doc(sessionId).update({
                paid: total,
                remaining: 0
            });
        } catch(e) { console.error(e); }
    }
}

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
    } catch (e) { alert("حجم الصورة كبير جداً! برجاء استخدام صورة أصغر."); }
    finally { btn.disabled = false; btn.innerText = "رفع المرفق"; }
}

function loadSessionXRays() {
    db.collection("XRays").where("sessionId", "==", sessionId).onSnapshot(snap => {
        const list = document.getElementById('session-xrays-list');
        list.innerHTML = '';
        if (snap.empty) { list.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1; padding: 30px 20px;">لا توجد مرفقات.</div>`; return; }
        snap.forEach(doc => {
            const x = doc.data();
            list.innerHTML += `
                <div class="xray-card" style="padding: 10px; background: white; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center;">
                    <a href="${x.imageBase64}" target="_blank"><img src="${x.imageBase64}" style="width:100%; height:120px; object-fit:cover; border-radius:6px; margin-bottom: 10px; border:1px solid #f1f5f9;"></a>
                    <p style="font-size: 13px; margin: 5px 0; font-weight:bold; color: #1e293b;">${x.type}</p>
                    <button class="btn-danger" style="width:100%; padding:6px; font-size:13px; margin-top: 5px;" onclick="deleteDoc('XRays', '${doc.id}')">🗑️ حذف</button>
                </div>
            `;
        });
    });
}

// ================= 4. الروشتة الذكية (الصيدلية) =================

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
        resultBox.innerHTML = '<div class="search-item" style="color:#64748b; text-align: center;">لا يوجد دواء بهذا الاسم. اضغط (جديد ➕) لإضافته.</div>';
    } else {
        filtered.forEach(d => {
            const div = document.createElement('div');
            div.className = 'search-item';
            div.innerHTML = `<strong style="color: #0f172a;">${d.name}</strong> <small style="color:#64748b;">(${d.category})</small>`;
            div.onclick = () => addDrugToPrescriptionList(d);
            resultBox.appendChild(div);
        });
    }
    resultBox.style.display = 'block';
}

function addDrugToPrescriptionList(drug) {
    document.getElementById('search-results-box').style.display = 'none';
    document.getElementById('drug-search').value = '';
    
    // فحص التكرار (منع إضافة نفس الدواء مرتين)
    const exists = currentPrescriptionDrugs.some(d => d.name === drug.name);
    if(exists) {
        alert("هذا الدواء مضاف بالفعل في الروشتة.");
        return;
    }

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
        list.innerHTML = '<div class="empty-state" style="padding: 20px;">لم يتم اختيار أدوية بعد. ابحث في الأعلى واختر العلاج.</div>';
        return;
    }
    
    currentPrescriptionDrugs.forEach((drug, index) => {
        list.innerHTML += `
            <div class="drug-list-item">
                <div style="flex: 1; font-weight: 800; font-size: 15px; color: #0f172a;" dir="ltr">${drug.name}</div>
                <div style="flex: 2;">
                    <input type="text" value="${drug.dose}" id="dose_${index}" onchange="updateDose(${index}, this.value)" class="search-box" style="padding: 8px; border-radius: 6px; font-size: 13px;">
                </div>
                <div><button type="button" class="btn-danger" style="padding: 8px 12px; border-radius: 6px; font-size: 12px;" onclick="removeDrugFromList(${index})" title="إزالة الدواء">❌</button></div>
            </div>
        `;
    });
}

function updateDose(index, newDose) {
    currentPrescriptionDrugs[index].dose = newDose;
}

// 🔴 فتح نافذة الروشتة (لإضافة جديدة أو التعديل على الحالية) 🔴
function openSmartRxModal() {
    document.getElementById('drug-search').value = '';
    document.getElementById('search-results-box').style.display = 'none';
    renderSelectedDrugs();
    openModal('smartRxModal');
}

async function saveSmartPrescription() {
    if(currentPrescriptionDrugs.length === 0) { alert("برجاء اختيار دواء واحد على الأقل لإصدار الروشتة."); return; }
    
    let medsText = "";
    currentPrescriptionDrugs.forEach((d, i) => {
        medsText += `${i+1}. ${d.name}\n   ${d.dose}\n\n`;
    });
    
    const notes = document.getElementById('rx_general_notes').value;
    const dateStr = new Date().toISOString().split('T')[0];

    const data = {
        clinicId: clinicId, patientId: patientId, sessionId: sessionId,
        medications: medsText, 
        notes: notes, 
        date: dateStr,
        rawDrugsArray: currentPrescriptionDrugs // حفظ المصفوفة الأصلية عشان نقدر نعدل عليها بعدين
    };

    try {
        if(activePrescriptionDocId) {
            await db.collection("Prescriptions").doc(activePrescriptionDocId).update(data);
        } else {
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection("Prescriptions").add(data);
        }
        closeModal('smartRxModal');
    } catch(e) { console.error(e); }
}

function loadSessionPrescription() {
    db.collection("Prescriptions").where("sessionId", "==", sessionId).onSnapshot(snap => {
        const container = document.getElementById('session-rx-container');
        if(snap.empty) {
            container.innerHTML = `<div class="empty-state">لا توجد روشتة مسجلة لهذه الجلسة.</div>`;
            activePrescriptionDocId = null;
            currentPrescriptionDrugs = [];
            document.getElementById('rx_general_notes').value = '';
            return;
        }
        
        snap.forEach(doc => {
            const p = doc.data();
            activePrescriptionDocId = doc.id;
            
            // تعبئة البيانات في حالة إننا حبينا نعدلها
            currentPrescriptionDrugs = p.rawDrugsArray || []; // لو المصفوفة محفوظة، نرجعها للواجهة
            document.getElementById('rx_general_notes').value = p.notes || '';
            
            container.innerHTML = `
                <div style="background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px dashed #cbd5e1; position: relative;">
                    <div style="white-space: pre-wrap; direction: ltr; text-align: left; font-weight:700; color:#0f172a; line-height: 1.6;">${p.medications}</div>
                    ${p.notes ? `<p style="margin-top:15px; color:#475569; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 14px;"><strong>تعليمات خاصة:</strong> ${p.notes}</p>` : ''}
                    
                    <div style="margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
                        <button class="btn-primary" style="flex:1; min-width: 100px; background:#10b981; justify-content: center;" onclick="printSessionRx('${doc.id}')">🖨️ طباعة الروشتة</button>
                        <button class="btn-action" style="flex:1; min-width: 100px; background:#fff7ed; color:#ea580c; border-color:#fed7aa;" onclick="openSmartRxModal()">✏️ تعديل الأدوية</button>
                        <button class="btn-danger" style="flex:1; min-width: 100px; justify-content: center;" onclick="deleteDoc('Prescriptions', '${doc.id}')">🗑️ مسح الروشتة</button>
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
    if(confirm("هل أنت متأكد من الحذف النهائي؟")) {
        try { await db.collection(collectionName).doc(docId).delete(); } 
        catch (e) { console.error(e); }
    }
}

window.onload = () => {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.body.dir = lang === 'en' ? 'ltr' : 'rtl';
    firebase.auth().onAuthStateChanged((user) => { if (user) loadSessionDetails(); });
};
