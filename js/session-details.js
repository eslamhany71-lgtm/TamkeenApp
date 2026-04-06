const db = firebase.firestore();
const storage = firebase.storage(); 
const urlParams = new URLSearchParams(window.location.search);
const sessionId = urlParams.get('sessionId');
const patientId = urlParams.get('patientId');
const clinicId = sessionStorage.getItem('clinicId');

let sessionData = null;
let patientName = "المريض";
let patientAge = "---";
let clinicPharmacy = []; 

// 🔴 متغيرات الروشتات (تم تحديثها لدعم الروشتات المتعددة) 🔴
let sessionPrescriptions = {}; // هيشيل كل الروشتات بتاعة الجلسة
let currentPrescriptionDrugs = []; 
let activePrescriptionDocId = null; 

let editDrugId = null; 

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
            patientAge = doc.data().age || '---';
            document.getElementById('header-patient-name').innerText = patientName;
            document.getElementById('print-patient-name').innerText = patientName;
            document.getElementById('print-patient-age').innerText = patientAge;
        }
    });

    db.collection("Sessions").doc(sessionId).onSnapshot(doc => {
        if(doc.exists) {
            sessionData = doc.data();
            document.getElementById('sd-procedure').innerText = sessionData.procedure;
            document.getElementById('print-patient-diag').innerText = sessionData.procedure; 
            document.getElementById('sd-date').innerText = sessionData.date;
            document.getElementById('sd-tooth').innerText = sessionData.tooth || '---';
            document.getElementById('sd-total').innerText = sessionData.total || 0;
            document.getElementById('sd-paid').innerText = sessionData.paid || 0;
            document.getElementById('sd-remaining').innerText = sessionData.remaining || 0;
            document.getElementById('sd-notes').innerText = sessionData.notes || 'لا يوجد';
        }
    });

    loadSessionXRays();
    loadSessionPrescription();
    loadClinicPharmacy();
    loadRxTemplates(); 
    // 🔴 تم إضافة استدعاء رسم مخطط الأسنان هنا 🔴
    renderDentalChart();
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
    if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري التحديث..." : "Updating...");

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
    } catch(e) { 
        console.error(e); 
    } finally {
        if (window.hideLoader) window.hideLoader();
    }
}

// ====================================================================
// 🔴 1. إدارة الأدوية والاستيراد من الإكسيل 🔴
// ====================================================================

function loadClinicPharmacy() {
    db.collection("Pharmacy").where("clinicId", "==", clinicId).onSnapshot(snap => {
        clinicPharmacy = [];
        snap.forEach(doc => clinicPharmacy.push({ id: doc.id, ...doc.data() }));
        if(document.getElementById('drug-search').value.length > 0) {
            searchDrugs();
        }
    });
}

function openAddDrugModal() {
    editDrugId = null; 
    document.getElementById('new_drug_category').value = '';
    document.getElementById('new_drug_name').value = '';
    document.getElementById('new_drug_dose').value = '';
    document.getElementById('modal-drug-title').innerText = 'إضافة علاج جديد للعيادة';
    document.getElementById('btn-save-drug').innerText = 'حفظ في قاعدة الأدوية';
    openModal('addDrugModal');
}

function openEditDrugModal(drugId, event) {
    event.stopPropagation(); 
    const drug = clinicPharmacy.find(d => d.id === drugId);
    if(!drug) return;

    editDrugId = drugId; 
    document.getElementById('new_drug_category').value = drug.category;
    document.getElementById('new_drug_name').value = drug.name;
    document.getElementById('new_drug_dose').value = drug.defaultDose;
    document.getElementById('modal-drug-title').innerText = 'تعديل بيانات العلاج';
    document.getElementById('btn-save-drug').innerText = 'حفظ التعديلات';
    openModal('addDrugModal');
}

async function deleteDrugFromPharmacy(drugId, event) {
    event.stopPropagation(); 
    if(confirm("هل أنت متأكد من حذف هذا الدواء نهائياً من قاعدة بيانات العيادة؟")) {
        if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري الحذف..." : "Deleting...");
        try {
            await db.collection("Pharmacy").doc(drugId).delete();
            document.getElementById('search-results-box').style.display = 'none';
            document.getElementById('drug-search').value = '';
        } catch(e) { 
            console.error(e); 
        } finally {
            if (window.hideLoader) window.hideLoader();
        }
    }
}

async function saveNewDrugToPharmacy(e) {
    e.preventDefault();
    const nameInput = document.getElementById('new_drug_name').value.trim();
    
    if (!editDrugId) {
        const isDuplicate = clinicPharmacy.some(d => d.name.toLowerCase() === nameInput.toLowerCase());
        if (isDuplicate) {
            alert("❌ هذا العلاج موجود بالفعل في قاعدة البيانات!");
            return;
        }
    }

    if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري الحفظ..." : "Saving...");

    const data = {
        clinicId: clinicId,
        category: document.getElementById('new_drug_category').value.trim(),
        name: nameInput,
        defaultDose: document.getElementById('new_drug_dose').value.trim()
    };

    try {
        if (editDrugId) {
            await db.collection("Pharmacy").doc(editDrugId).update(data); 
        } else {
            await db.collection("Pharmacy").add(data); 
        }
        closeModal('addDrugModal');
        document.getElementById('drug-search').value = data.name;
        searchDrugs(); 
    } catch(e) { 
        console.error(e); 
    } finally {
        if (window.hideLoader) window.hideLoader();
    }
}

function searchDrugs() {
    const input = document.getElementById('drug-search').value.toLowerCase();
    const resultBox = document.getElementById('search-results-box');
    resultBox.innerHTML = '';
    
    if(input.length === 0) { resultBox.style.display = 'none'; return; }
    
    const filtered = clinicPharmacy.filter(d => d.name.toLowerCase().includes(input) || d.category.toLowerCase().includes(input));
    
    if(filtered.length === 0) {
        resultBox.innerHTML = '<div class="search-item" style="color:#64748b; text-align: center; padding: 15px;">لا يوجد دواء بهذا الاسم. اضغط (جديد ➕) لإضافته.</div>';
    } else {
        filtered.forEach(d => {
            const div = document.createElement('div');
            div.className = 'search-item';
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            div.style.cursor = 'pointer';

            const infoDiv = document.createElement('div');
            infoDiv.style.flex = '1';
            infoDiv.innerHTML = `<strong style="color: #0f172a; font-size: 15px;" dir="ltr">${d.name}</strong> <small style="color:#64748b; margin-right: 5px;">(${d.category})</small>`;
            infoDiv.onclick = () => addDrugToPrescriptionList(d);

            const actionsDiv = document.createElement('div');
            actionsDiv.style.display = 'flex';
            actionsDiv.style.gap = '5px';
            
            actionsDiv.innerHTML = `
                <button type="button" class="btn-action" style="padding:6px; font-size:12px; background:#fff7ed; color:#ea580c; border:1px solid #fed7aa;" onclick="openEditDrugModal('${d.id}', event)" title="تعديل">✏️</button>
                <button type="button" class="btn-action" style="padding:6px; font-size:12px; background:#fee2e2; color:#ef4444; border:1px solid #fca5a5;" onclick="deleteDrugFromPharmacy('${d.id}', event)" title="حذف">🗑️</button>
            `;

            div.appendChild(infoDiv);
            div.appendChild(actionsDiv);
            resultBox.appendChild(div);
        });
    }
    resultBox.style.display = 'block';
}

function downloadDrugsTemplate() {
    const wb = XLSX.utils.book_new();
    const ws_data = [
        ["category", "name", "defaultDose"],
        ["مضاد حيوي", "Augmentin 1gm", "قرص كل 12 ساعة"],
        ["مسكن", "Panadol Extra", "قرص عند اللزوم"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    XLSX.utils.book_append_sheet(wb, ws, "Drugs");
    XLSX.writeFile(wb, "NivaDent_Drugs_Template.xlsx");
}

function importDrugsFromExcel(input) {
    const file = input.files[0];
    if (!file) return;

    if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري استيراد الأدوية..." : "Importing drugs...");

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheet = workbook.SheetNames[0];
            const excelRows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);

            if (excelRows.length === 0) { alert("الملف فارغ!"); return; }

            let importedCount = 0;
            const batch = db.batch();
            
            excelRows.forEach(row => {
                if (row.name && row.category) {
                    const docRef = db.collection("Pharmacy").doc();
                    batch.set(docRef, {
                        clinicId: clinicId,
                        category: String(row.category).trim(),
                        name: String(row.name).trim(),
                        defaultDose: row.defaultDose ? String(row.defaultDose).trim() : ""
                    });
                    importedCount++;
                }
            });

            await batch.commit();
            alert(`✅ تم استيراد ${importedCount} دواء بنجاح!`);
            closeModal('addDrugModal');
        } catch (error) {
            console.error(error);
            alert("❌ حدث خطأ في قراءة ملف الإكسيل. تأكد من استخدام القالب الصحيح.");
        } finally {
            input.value = ''; 
            if (window.hideLoader) window.hideLoader();
        }
    };
    reader.readAsArrayBuffer(file);
}

// ====================================================================
// 🔴 2. الروشتة الذكية وقوالب الروشتات (التعديل للروشتات المتعددة) 🔴
// ====================================================================

function addDrugToPrescriptionList(drug) {
    document.getElementById('search-results-box').style.display = 'none';
    document.getElementById('drug-search').value = '';
    
    const exists = currentPrescriptionDrugs.some(d => d.name === drug.name);
    if(exists) { alert("هذا الدواء مضاف بالفعل."); return; }

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
        list.innerHTML = '<div class="empty-state" style="padding: 30px;">لم يتم اختيار أدوية بعد. ابحث في الأعلى واختر العلاج.</div>';
        return;
    }
    
    currentPrescriptionDrugs.forEach((drug, index) => {
        list.innerHTML += `
            <div class="drug-list-item">
                <div style="flex: 1; font-weight: 800; font-size: 15px; color: #0f172a;" dir="ltr">${drug.name}</div>
                <div style="flex: 2;">
                    <input type="text" value="${drug.dose}" id="dose_${index}" onchange="updateDose(${index}, this.value)" class="search-box" style="padding: 8px; border-radius: 6px; font-size: 13px;">
                </div>
                <div><button type="button" class="btn-danger" style="padding: 8px 12px; border-radius: 6px; font-size: 12px;" onclick="removeDrugFromList(${index})">❌</button></div>
            </div>
        `;
    });
}

function updateDose(index, newDose) { currentPrescriptionDrugs[index].dose = newDose; }

// 🔴 إنشاء روشتة جديدة تماماً (تُستدعى من زرار "إصدار روشتة" الخارجي)
function openSmartRxModal() {
    activePrescriptionDocId = null; // تفريغ الـ ID عشان يعمل روشتة جديدة
    currentPrescriptionDrugs = [];
    document.getElementById('drug-search').value = '';
    document.getElementById('search-results-box').style.display = 'none';
    document.getElementById('rx_template_select').value = '';
    document.getElementById('rx_general_notes').value = '';
    renderSelectedDrugs();
    openModal('smartRxModal');
}

// 🔴 تعديل روشتة سابقة (تُستدعى من زرار "تعديل الأدوية" جوه كارت الروشتة)
function editPrescription(docId) {
    const p = sessionPrescriptions[docId];
    if(!p) return;
    
    activePrescriptionDocId = docId; // ربط المودال بالروشتة دي بالذات
    currentPrescriptionDrugs = p.rawDrugsArray ? [...p.rawDrugsArray] : [];
    document.getElementById('rx_general_notes').value = p.notes || '';
    document.getElementById('drug-search').value = '';
    document.getElementById('search-results-box').style.display = 'none';
    document.getElementById('rx_template_select').value = '';
    renderSelectedDrugs();
    openModal('smartRxModal');
}

function loadRxTemplates() {
    db.collection("RxTemplates").where("clinicId", "==", clinicId).onSnapshot(snap => {
        const select = document.getElementById('rx_template_select');
        select.innerHTML = '<option value="">اختر قالب جاهز (مثال: روشتة خلع، عصب...)</option>';
        
        const listContainer = document.getElementById('templates-list-container');
        listContainer.innerHTML = '';
        
        if (snap.empty) {
            listContainer.innerHTML = '<div class="empty-state">لا يوجد قوالب محفوظة.</div>';
            return;
        }

        snap.forEach(doc => {
            const t = doc.data();
            select.innerHTML += `<option value="${doc.id}">${t.templateName}</option>`;
            
            listContainer.innerHTML += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #f1f5f9;">
                    <strong>${t.templateName}</strong>
                    <button class="btn-danger" style="padding: 5px 10px; font-size: 12px;" onclick="deleteDoc('RxTemplates', '${doc.id}')">حذف</button>
                </div>
            `;
        });
        
        window.rxTemplatesData = snap.docs.map(d => ({id: d.id, ...d.data()}));
    });
}

function openTemplateManager() { openModal('templatesModal'); }

function applyRxTemplate(templateId) {
    if(!templateId) return;
    const tpl = window.rxTemplatesData.find(t => t.id === templateId);
    if(tpl && tpl.drugsArray) {
        tpl.drugsArray.forEach(drug => {
            if(!currentPrescriptionDrugs.some(d => d.name === drug.name)) {
                currentPrescriptionDrugs.push({ name: drug.name, dose: drug.dose });
            }
        });
        renderSelectedDrugs();
    }
}

async function saveCurrentRxAsTemplate() {
    const tplName = document.getElementById('tpl_name').value.trim();
    if (!tplName) { alert("برجاء كتابة اسم القالب أولاً!"); return; }
    if (currentPrescriptionDrugs.length === 0) { alert("الروشتة الحالية فارغة!"); return; }

    if (window.showLoader) window.showLoader("جاري حفظ القالب...");
    try {
        const updatedDrugs = currentPrescriptionDrugs.map((d, i) => {
            const doseEl = document.getElementById(`dose_${i}`);
            return { name: d.name, dose: doseEl ? doseEl.value : d.dose };
        });

        await db.collection("RxTemplates").add({
            clinicId: clinicId,
            templateName: tplName,
            drugsArray: updatedDrugs,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        document.getElementById('tpl_name').value = '';
        alert("✅ تم حفظ القالب بنجاح!");
    } catch(e) { console.error(e); }
    finally { if (window.hideLoader) window.hideLoader(); }
}

async function saveSmartPrescription() {
    if(currentPrescriptionDrugs.length === 0) { alert("برجاء اختيار دواء واحد على الأقل لإصدار الروشتة."); return; }
    
    if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري إصدار الروشتة..." : "Creating prescription...");

    let medsText = "";
    
    currentPrescriptionDrugs.forEach((d, i) => {
        const doseEl = document.getElementById(`dose_${i}`);
        const finalDose = doseEl ? doseEl.value : d.dose;
        d.dose = finalDose; 
        medsText += `${i+1}. ${d.name}\n   ${finalDose}\n\n`;
    });
    
    const notes = document.getElementById('rx_general_notes').value;
    const dateStr = new Date().toISOString().split('T')[0];

    const data = {
        clinicId: clinicId, patientId: patientId, sessionId: sessionId,
        medications: medsText, 
        notes: notes, 
        date: dateStr,
        rawDrugsArray: currentPrescriptionDrugs 
    };

    try {
        if(activePrescriptionDocId) {
            // تحديث روشتة حالية
            await db.collection("Prescriptions").doc(activePrescriptionDocId).update(data);
        } else {
            // إنشاء روشتة جديدة
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection("Prescriptions").add(data);
        }
        closeModal('smartRxModal');
    } catch(e) { 
        console.error(e); 
    } finally {
        if (window.hideLoader) window.hideLoader();
    }
}

// ====================================================================
// 🔴 3. المرفقات الخارجية المتعددة وعرض الروشتات 🔴
// ====================================================================

function attachImageToRx(docId) {
    activePrescriptionDocId = docId; // ربط زرار الرفع بالروشتة المحددة
    document.getElementById('upload-rx-input').click();
}

function loadSessionPrescription() {
    db.collection("Prescriptions").where("sessionId", "==", sessionId).orderBy("createdAt", "asc").onSnapshot(snap => {
        const container = document.getElementById('session-rx-container');
        
        sessionPrescriptions = {}; // تفريغ الروشتات المخزنة

        if(snap.empty) {
            container.innerHTML = `
                <div class="empty-state">لا توجد روشتات مسجلة لهذه الجلسة.</div>
                <div style="text-align: center; margin-top: 15px;">
                    <button class="btn-action" style="background:#f8fafc; border:1px solid #cbd5e1; color:#475569;" onclick="attachImageToRx(null)">📎 إرفاق روشتة خارجية (صورة)</button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = ''; // مسح الـ Container عشان نرص الروشتات
        let counter = 1;

        snap.forEach(doc => {
            const p = doc.data();
            sessionPrescriptions[doc.id] = p; // تخزين الروشتة للاستخدام في التعديل

            let uploadedUrls = [];
            if (p.uploadedRxUrl) uploadedUrls.push(p.uploadedRxUrl);
            if (p.uploadedRxUrls && Array.isArray(p.uploadedRxUrls)) {
                uploadedUrls = [...new Set([...uploadedUrls, ...p.uploadedRxUrls])];
            }

            let uploadsHtml = '';
            if (uploadedUrls.length > 0) {
                let imagesHtml = '';
                uploadedUrls.forEach((url) => {
                    imagesHtml += `
                        <div style="position: relative; display: inline-block; margin: 5px;">
                            <a href="${url}" target="_blank">
                                <img src="${url}" style="height: 100px; width: 100px; object-fit: cover; border-radius: 8px; border: 1px solid #cbd5e1; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            </a>
                            <button onclick="deleteSpecificRxImage('${doc.id}', '${url}')" style="position: absolute; top: -5px; right: -5px; background: #ef4444; color: white; border: none; border-radius: 50%; width: 22px; height: 22px; cursor: pointer; font-size: 12px; line-height: 1; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">×</button>
                        </div>
                    `;
                });

                uploadsHtml = `
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed #cbd5e1; text-align: right;">
                        <span style="color: #64748b; font-size: 14px; display: block; margin-bottom: 10px; font-weight: bold;">📎 نسخ خارجية مرفوعة (${uploadedUrls.length}):</span>
                        <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                            ${imagesHtml}
                        </div>
                    </div>
                `;
            }
            
            let rxTitle = `روشتة #${counter}`;
            if (p.medications === "روشتة خارجية مرفقة") rxTitle = `مرفق خارجي #${counter}`;

            container.innerHTML += `
                <div style="background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 15px; position: relative;">
                    <h4 style="margin: 0 0 15px 0; color: #0284c7; border-bottom: 2px solid #e0f2fe; padding-bottom: 5px; display: inline-block;">📜 ${rxTitle}</h4>
                    
                    ${p.medications && p.medications !== "روشتة خارجية مرفقة" ? `<div style="white-space: pre-wrap; direction: ltr; text-align: left; font-weight:700; color:#0f172a; line-height: 1.6;">${p.medications}</div>` : ''}
                    ${p.notes ? `<p style="margin-top:15px; color:#475569; border-top: 1px dashed #cbd5e1; padding-top: 10px; font-size: 14px;"><strong>تعليمات خاصة:</strong> ${p.notes}</p>` : ''}
                    
                    ${uploadsHtml}

                    <div style="margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
                        <button class="btn-primary" style="flex:1; min-width: 100px; background:#10b981; justify-content: center;" onclick="printSessionRx('${doc.id}')">🖨️ طباعة</button>
                        <button class="btn-action" style="flex:1; min-width: 100px; background:#fff7ed; color:#ea580c; border-color:#fed7aa; justify-content: center;" onclick="editPrescription('${doc.id}')">✏️ تعديل الأدوية</button>
                        <button class="btn-action" style="flex:1; min-width: 100px; background:#f1f5f9; color:#475569; border-color:#cbd5e1; justify-content: center;" onclick="attachImageToRx('${doc.id}')">📎 إرفاق صورة</button>
                        <button class="btn-danger" style="flex:1; min-width: 100px; justify-content: center;" onclick="deleteDoc('Prescriptions', '${doc.id}')">🗑️ مسح الروشتة</button>
                    </div>
                </div>
            `;
            counter++;
        });
    });
}

document.getElementById('upload-rx-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!activePrescriptionDocId) {
        if (window.showLoader) window.showLoader("جاري إنشاء مرفق جديد...");
        try {
            const newRx = await db.collection("Prescriptions").add({
                clinicId: clinicId, patientId: patientId, sessionId: sessionId,
                medications: "روشتة خارجية مرفقة", date: new Date().toISOString().split('T')[0],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                uploadedRxUrls: []
            });
            activePrescriptionDocId = newRx.id;
        } catch(err) { console.error(err); if(window.hideLoader) window.hideLoader(); return; }
    } else {
        if (window.showLoader) window.showLoader("جاري رفع الصورة...");
    }

    try {
        const storageRef = storage.ref(`prescriptions/${clinicId}/${activePrescriptionDocId}_${Date.now()}_${file.name}`);
        await storageRef.put(file);
        const url = await storageRef.getDownloadURL();
        
        await db.collection("Prescriptions").doc(activePrescriptionDocId).update({ 
            uploadedRxUrls: firebase.firestore.FieldValue.arrayUnion(url) 
        });
        
        alert("✅ تم إرفاق الصورة بنجاح!");
    } catch (error) {
        console.error("Upload error:", error);
        alert("❌ حدث خطأ أثناء الرفع.");
    } finally {
        e.target.value = ''; 
        if (window.hideLoader) window.hideLoader();
    }
});

async function deleteSpecificRxImage(docId, imageUrl) {
    if(confirm("هل أنت متأكد من حذف هذه الصورة فقط؟")) {
        if(window.showLoader) window.showLoader("جاري حذف الصورة...");
        try {
            await db.collection("Prescriptions").doc(docId).update({
                uploadedRxUrls: firebase.firestore.FieldValue.arrayRemove(imageUrl)
            });
        } catch(e) {
            console.error(e);
        } finally {
            if(window.hideLoader) window.hideLoader();
        }
    }
}

// ====================================================================
// 🔴 4. الطباعة والمرفقات (الأشعة) 🔴
// ====================================================================

function printSessionRx(docId) {
    if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "تجهيز للطباعة..." : "Preparing print...");

    db.collection("Prescriptions").doc(docId).get().then(doc => {
        if(doc.exists) {
            const p = doc.data();
            document.getElementById('print-date').innerText = p.date;
            document.getElementById('print-meds').innerText = p.medications;
            document.getElementById('print-notes').innerText = p.notes || 'لا يوجد';
            
            db.collection("Clinics").doc(clinicId).get().then(cDoc => {
                if(cDoc.exists) {
                    const cInfo = cDoc.data();
                    document.getElementById('print-clinic-name').innerText = cInfo.clinicName || 'Clinic Name';
                    document.getElementById('print-doctor-name').innerText = cInfo.adminEmail ? `Dr. Account: ${cInfo.adminEmail}` : '';
                    
                    if(cInfo.logoUrl) {
                        const printLogo = document.getElementById('print-clinic-logo');
                        printLogo.src = cInfo.logoUrl;
                        printLogo.style.display = 'block';
                    }

                    document.getElementById('print-clinic-address').innerText = cInfo.address1 || "---";
                    document.getElementById('print-clinic-phone').innerText = cInfo.phone1 || "---";
                }
                
                if (window.hideLoader) window.hideLoader();
                setTimeout(() => window.print(), 500); 
            }).catch(() => { if (window.hideLoader) window.hideLoader(); });
        } else {
            if (window.hideLoader) window.hideLoader();
        }
    }).catch(() => {
        if (window.hideLoader) window.hideLoader();
    });
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

    if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري رفع المرفق..." : "Uploading...");

    const data = {
        clinicId: clinicId, patientId: patientId, sessionId: sessionId,
        type: document.getElementById('sx_type').value,
        imageBase64: document.getElementById('sx_base64').value,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    try {
        await db.collection("XRays").add(data);
        closeModal('xrayModal'); document.querySelector('#xrayModal form').reset();
    } catch (e) { 
        alert("حجم الصورة كبير جداً! برجاء استخدام صورة أصغر."); 
    } finally { 
        btn.disabled = false; btn.innerText = "رفع المرفق"; 
        if (window.hideLoader) window.hideLoader();
    }
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

async function deleteDoc(collectionName, docId) {
    if(confirm("هل أنت متأكد من الحذف النهائي؟")) {
        if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري الحذف..." : "Deleting...");
        try { 
            await db.collection(collectionName).doc(docId).delete(); 
        } catch (e) { 
            console.error(e); 
        } finally {
            if (window.hideLoader) window.hideLoader();
        }
    }
}

// ====================================================================
// 🔴 5. مخطط الأسنان التفاعلي (Dental Chart) 🔴
// ====================================================================

// 1. متغير عشان نحفظ فيه رقم السِنة اللي الدكتور داس عليها حالياً
let currentSelectedTooth = null; 

// 2. الدالة المسؤولة عن رسم الأسنان أول ما الصفحة تفتح
function renderDentalChart() {
    const upperJaw = document.getElementById('upper-jaw');
    const lowerJaw = document.getElementById('lower-jaw');
    
    // بنفضي الفكين عشان لو الصفحة عملت تحديث ميرسمش أسنان فوق أسنان
    upperJaw.innerHTML = ''; 
    lowerJaw.innerHTML = '';
    
    // 3. (حلقة تكرارية) من رقم 1 لحد 16، عشان نرسم أسنان الفك العلوي
    for (let i = 1; i <= 16; i++) {
        // بننادي على الدالة اللي بتصنع السِنة، وبنديها الرقم، وبعدين بنلزقها في الفك العلوي
        upperJaw.appendChild(createToothElement(i));
    }
    
    // 4. (حلقة تكرارية) من رقم 17 لحد 32، عشان نرسم الفك السفلي
    for (let i = 17; i <= 32; i++) {
        lowerJaw.appendChild(createToothElement(i));
    }
}

// 5. دي الدالة اللي بتصنع عنصر السِنة نفسه برمجياً (كأنك كتبتها في الـ HTML)
function createToothElement(number) {
    const toothDiv = document.createElement('div'); // اخلق عنصر div جديد
    toothDiv.className = 'tooth'; // اديله شكل السِنة من الـ CSS
    toothDiv.id = `tooth-${number}`; // اديله ID مميز عشان نعرف نمسكه بعدين (مثال: tooth-5)
    toothDiv.innerText = number; // اكتب جواه رقم السِنة
    
    // بنقول للسِنة: لما حد يضغط عليكي (onclick)، شغلي دالة فتح النافذة وابعتيلها رقمك
    toothDiv.onclick = function() {
        openToothModal(number);
    };
    
    return toothDiv; // بنرجع السِنة جاهزة عشان تترص في الفك
}

// 6. دالة بتفتح النافذة المنبثقة وتكتب فيها رقم السِنة
function openToothModal(toothNumber) {
    currentSelectedTooth = toothNumber; // بنسجل الرقم في الذاكرة
    document.getElementById('selected-tooth-title').innerText = `اختر حالة السِنة رقم (${toothNumber})`;
    openModal('toothStatusModal'); // بنفتح النافذة
}

// 7. الدالة اللي بتلون السِنة وبتحفظها في الفايربيز
async function saveToothStatus(statusType) {
    if (!currentSelectedTooth) return; 
    
    // 1. تلوين السِنة في الشاشة قدام الدكتور (عشان يحس بالاستجابة فوراً)
    const toothElement = document.getElementById(`tooth-${currentSelectedTooth}`);
    toothElement.classList.remove('status-decay', 'status-extracted', 'status-crown');
    if (statusType !== 'normal') {
        toothElement.classList.add(`status-${statusType}`);
    }
    closeModal('toothStatusModal');

    // 2. إرسال البيانات لقاعدة بيانات الفايربيز للحفظ
    if (window.showLoader) window.showLoader("جاري حفظ حالة السِنة...");
    try {
        // بنعمل تحديث (update) للجلسة الحالية في الفايربيز
        // بنستخدم طريقة النقطة (dentalChart.15) عشان نحفظ حالة كل سنة لوحدها من غير ما نمسح الباقي
        await db.collection("Sessions").doc(sessionId).update({
            [`dentalChart.${currentSelectedTooth}`]: statusType
        });
    } catch (e) {
        console.error(e);
        alert("❌ حدث خطأ أثناء حفظ حالة السِنة.");
    } finally {
        if (window.hideLoader) window.hideLoader();
    }
}

window.onload = () => {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.body.dir = lang === 'en' ? 'ltr' : 'rtl';
    firebase.auth().onAuthStateChanged((user) => { if (user) loadSessionDetails(); });
};
