const db = firebase.firestore();
const urlParams = new URLSearchParams(window.location.search);
const patientId = urlParams.get('id');
const clinicId = sessionStorage.getItem('clinicId');

let currentPatientName = "مريض";

function updatePageContent(lang) {
    const isAr = lang === 'ar';
    document.body.dir = isAr ? 'rtl' : 'ltr';
    // ترجمة سريعة للأساسيات
    if(isAr) {
        document.getElementById('txt-back').innerText = "العودة لقائمة المرضى";
        document.getElementById('tab-sessions').innerText = "🦷 الجلسات السابقة";
        document.getElementById('tab-xrays').innerText = "📸 الأشعة والصور";
        document.getElementById('tab-prescriptions').innerText = "💊 الروشتات";
    } else {
        document.getElementById('txt-back').innerText = "Back to Patients";
        document.getElementById('tab-sessions').innerText = "🦷 Previous Sessions";
        document.getElementById('tab-xrays').innerText = "📸 X-Rays & Photos";
        document.getElementById('tab-prescriptions').innerText = "💊 Prescriptions";
    }
}

function switchTab(tabId, element) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    element.classList.add('active');
    document.getElementById(`content-${tabId}`).classList.add('active');
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

// إغلاق المودال بالضغط خارجه
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) { if (e.target === this) this.style.display = 'none'; });
    });
});

// 1. جلب بيانات المريض
async function loadPatientData() {
    if (!patientId || !clinicId) {
        document.getElementById('prof-name').innerText = "خطأ: لم يتم العثور على المريض";
        return;
    }
    try {
        const doc = await db.collection("Patients").doc(patientId).get();
        if (doc.exists) {
            const p = doc.data();
            currentPatientName = p.name;
            document.getElementById('prof-name').innerText = p.name;
            document.getElementById('print-patient-name').innerText = p.name; // للروشتة
            document.getElementById('prof-phone').innerText = `📞 ${p.phone}`;
            document.getElementById('prof-age').innerText = `🎂 ${p.age} سنة`;
            document.getElementById('prof-gender').innerText = `🚻 ${p.gender || 'غير محدد'}`;
            
            const alerts = document.getElementById('prof-alerts');
            alerts.innerHTML = '';
            if (p.medicalHistory && p.medicalHistory.length > 0) {
                p.medicalHistory.forEach(d => { alerts.innerHTML += `<span class="alert-tag">⚠️ ${d}</span>`; });
            } else {
                alerts.innerHTML = `<span style="color: #10b981; font-weight: bold;">✅ سليم / لا يوجد أمراض مزمنة</span>`;
            }

            // بعد ما نجيب المريض، نجيب ملفاته
            loadSessions();
            loadXRays();
            loadPrescriptions();
        }
    } catch (e) { console.error(e); }
}

// ================= 2. برمجة الجلسات =================
async function saveSession(e) {
    e.preventDefault();
    const data = {
        clinicId: clinicId, patientId: patientId,
        procedure: document.getElementById('sess_procedure').value,
        tooth: document.getElementById('sess_tooth').value,
        notes: document.getElementById('sess_notes').value,
        date: new Date().toISOString().split('T')[0],
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    try {
        await db.collection("Sessions").add(data);
        closeModal('sessionModal'); document.querySelector('#sessionModal form').reset();
    } catch (error) { console.error(error); }
}

function loadSessions() {
    db.collection("Sessions").where("patientId", "==", patientId).orderBy("createdAt", "desc")
      .onSnapshot(snap => {
        const list = document.getElementById('sessions-list');
        list.innerHTML = '';
        if (snap.empty) { list.innerHTML = `<div class="empty-state">لا توجد جلسات مسجلة.</div>`; return; }
        snap.forEach(doc => {
            const s = doc.data();
            list.innerHTML += `
                <div class="data-card">
                    <div class="data-card-info">
                        <span class="data-badge">📅 ${s.date}</span>
                        <h4>🦷 ${s.procedure}</h4>
                        ${s.tooth ? `<p><strong>رقم السن:</strong> <span dir="ltr">${s.tooth}</span></p>` : ''}
                        <p><strong>ملاحظات:</strong> ${s.notes || 'لا يوجد'}</p>
                    </div>
                    <button class="btn-danger" onclick="deleteDoc('Sessions', '${doc.id}')">🗑️</button>
                </div>
            `;
        });
    });
}

// ================= 3. برمجة الأشعة (Base64 Magic) =================
// تحويل الصورة لنص عشان نحفظها في Firestore مباشرة (مناسب للـ MVP السريع)
function encodeImage(element) {
    const file = element.files[0];
    const reader = new FileReader();
    reader.onloadend = function() {
        document.getElementById('xray_base64').value = reader.result;
    }
    if (file) reader.readAsDataURL(file);
}

async function saveXRay(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-xray');
    btn.disabled = true; btn.innerText = "جاري الرفع...";

    const data = {
        clinicId: clinicId, patientId: patientId,
        type: document.getElementById('xray_type').value,
        notes: document.getElementById('xray_notes').value,
        imageBase64: document.getElementById('xray_base64').value,
        date: new Date().toISOString().split('T')[0],
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection("XRays").add(data);
        closeModal('xrayModal'); document.querySelector('#xrayModal form').reset();
    } catch (error) { 
        console.error(error); 
        alert("حجم الصورة كبير جداً! يرجى استخدام صورة أقل من 1 ميجابايت.");
    } finally {
        btn.disabled = false; btn.innerText = "رفع وحفظ";
    }
}

function loadXRays() {
    db.collection("XRays").where("patientId", "==", patientId).orderBy("createdAt", "desc")
      .onSnapshot(snap => {
        const list = document.getElementById('xrays-list');
        list.innerHTML = '';
        if (snap.empty) { list.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;">لا توجد صور مرفوعة.</div>`; return; }
        snap.forEach(doc => {
            const x = doc.data();
            list.innerHTML += `
                <div class="xray-card">
                    <span class="data-badge">📅 ${x.date}</span>
                    <a href="${x.imageBase64}" target="_blank" title="اضغط لتكبير الصورة">
                        <img src="${x.imageBase64}" alt="X-Ray">
                    </a>
                    <p>${x.type}</p>
                    <p style="color:#64748b; font-size:12px;">${x.notes}</p>
                    <button class="btn-danger" style="width:100%; margin-top:10px;" onclick="deleteDoc('XRays', '${doc.id}')">🗑️ حذف</button>
                </div>
            `;
        });
    });
}

// ================= 4. برمجة الروشتات والطباعة =================
async function savePrescription(e) {
    e.preventDefault();
    const data = {
        clinicId: clinicId, patientId: patientId,
        medications: document.getElementById('presc_meds').value,
        notes: document.getElementById('presc_notes').value,
        date: new Date().toISOString().split('T')[0],
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    try {
        await db.collection("Prescriptions").add(data);
        closeModal('prescriptionModal'); document.querySelector('#prescriptionModal form').reset();
    } catch (error) { console.error(error); }
}

function loadPrescriptions() {
    db.collection("Prescriptions").where("patientId", "==", patientId).orderBy("createdAt", "desc")
      .onSnapshot(snap => {
        const list = document.getElementById('prescriptions-list');
        list.innerHTML = '';
        if (snap.empty) { list.innerHTML = `<div class="empty-state">لم يتم إصدار روشتات.</div>`; return; }
        snap.forEach(doc => {
            const p = doc.data();
            list.innerHTML += `
                <div class="data-card" style="flex-direction: column;">
                    <div style="display:flex; justify-content:space-between; width:100%; border-bottom:1px solid #e2e8f0; padding-bottom:10px; margin-bottom:10px;">
                        <span class="data-badge">📅 ${p.date}</span>
                        <div>
                            <button class="btn-primary" onclick="printPrescription('${doc.id}')" style="padding: 5px 10px; background:#10b981;">🖨️ طباعة</button>
                            <button class="btn-danger" onclick="deleteDoc('Prescriptions', '${doc.id}')" style="padding: 5px 10px;">🗑️</button>
                        </div>
                    </div>
                    <div style="white-space: pre-wrap; direction: ltr; text-align: left; font-weight:bold; color:#0f172a; width: 100%;">${p.medications}</div>
                    ${p.notes ? `<p style="margin-top:10px; color:#475569;"><strong>تعليمات:</strong> ${p.notes}</p>` : ''}
                </div>
            `;
        });
    });
}

// دالة الطباعة السحرية
async function printPrescription(docId) {
    try {
        const doc = await db.collection("Prescriptions").doc(docId).get();
        if(doc.exists) {
            const p = doc.data();
            document.getElementById('print-date').innerText = p.date;
            document.getElementById('print-meds').innerText = p.medications;
            document.getElementById('print-notes').innerText = p.notes || 'لا يوجد';
            
            // اسم العيادة من الجلسة لو موجود
            db.collection("Clinics").doc(clinicId).get().then(cDoc => {
                if(cDoc.exists && cDoc.data().clinicName) {
                    document.getElementById('print-clinic-name').innerText = cDoc.data().clinicName;
                }
                // أمر الطباعة للمتصفح
                window.print();
            });
        }
    } catch(e) { console.error(e); }
}

// دالة حذف عامة
async function deleteDoc(collectionName, docId) {
    if(confirm("هل أنت متأكد من الحذف؟")) {
        try { await db.collection(collectionName).doc(docId).delete(); } 
        catch (e) { console.error(e); }
    }
}

window.onload = () => {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    updatePageContent(lang);
    firebase.auth().onAuthStateChanged((user) => { if (user) loadPatientData(); });
};
