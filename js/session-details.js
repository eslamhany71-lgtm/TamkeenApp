// js/session-details.js
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

let sessionPrescriptions = {}; 
let currentPrescriptionDrugs = []; 
let activePrescriptionDocId = null; 
let editDrugId = null; 

let currentLang = localStorage.getItem('preferredLang') || 'ar';

// 🔴 متغيرات الـ ERP 
let erpServices = [];
let erpContracts = [];
let clinicInventory = []; // المخزون للصرف التلقائي

// ==========================================
// 🔴 الترجمة الكاملة (Localization) 🔴
// ==========================================
const dict = {
    ar: {
        pageTitle: "تفاصيل الجلسة", backProf: "العودة لملف المريض", sessHeader: "ملف جلسة المريض:",
        btnEdit: "✏️ تعديل الجلسة", btnPrintInv: "🖨️ طباعة الفاتورة", btnCard: "🖨️ طباعة كارت المريض",
        totalCalc: "الإجمالي", paidCalc: "المدفوع", remCalc: "المتبقي", docNotes: "ملاحظات الطبيب:",
        chartTitle: "🦷 مخطط الأسنان الطبي", rxTitle: "💊 روشتة الجلسة", btnAddRx: "➕ إصدار روشتة",
        noRx: "لا توجد روشتة مسجلة لهذه الجلسة.", extRx: "📎 نسخة خارجية (مرفوعة):",
        attTitle: "📸 مرفقات وأشعة", btnAddAtt: "➕ رفع مرفق", noAtt: "لا توجد مرفقات.",
        mEditTitle: "تعديل بيانات الجلسة والمحاسبة", lblDate: "تاريخ الجلسة", lblNext: "الموعد القادم",
        lblProc: "الإجراء الطبي", lblTotal: "الإجمالي", lblPaid: "المدفوع الكلي", lblRem: "المتبقي",
        lblPayMethod: "طريقة الدفع (لأي فرق)", btnUpdate: "حفظ التعديلات والتسويات",
        mRxTitle: "إصدار / تعديل الروشتة", lblRxImport: "📑 استيراد من روشتة جاهزة (اختياري):",
        optChooseTpl: "اختر قالب جاهز...", lblRxSearch: "بحث عن دواء (الاسم أو القسم)",
        btnAddNewDrug: "➕ جديد", txtNoDrugsSel: "لم يتم اختيار أدوية بعد. ابحث في الأعلى واختر العلاج.",
        lblRxGenNotes: "تعليمات عامة للمريض (اختياري)", btnSaveRx: "حفظ وإصدار الروشتة",
        prName: "الاسم (Name):", prDate: "التاريخ (Date):", prAge: "السن (Age):", prDiag: "الإجراء (Proc):",
        qrVerify: "قم بمسح الكود للتحقق (Scan to verify)", msgLoading: "جاري التحميل...",
        msgUpdating: "جاري التحديث وتسوية الحسابات...", msgSaved: "تم الحفظ بنجاح!", msgError: "حدث خطأ!",
        invTitle: "فاتورة / سند استلام", invTotal: "إجمالي الحساب", invPaid: "المدفوع", invRem: "المتبقي",
        rxInstructions: "التعليمات (Notes):"
    },
    en: {
        pageTitle: "Session Details", backProf: "Back to Profile", sessHeader: "Patient Session:",
        btnEdit: "✏️ Edit Session", btnPrintInv: "🖨️ Print Invoice", btnCard: "🖨️ Print Patient Card",
        totalCalc: "Total", paidCalc: "Paid", remCalc: "Remaining", docNotes: "Doctor Notes:",
        chartTitle: "🦷 Dental Chart", rxTitle: "💊 Prescription", btnAddRx: "➕ Issue Rx",
        noRx: "No prescription recorded for this session.", extRx: "📎 External Copy (Uploaded):",
        attTitle: "📸 Attachments & X-Rays", btnAddAtt: "➕ Add Attachment", noAtt: "No attachments found.",
        mEditTitle: "Edit Session & Finances", lblDate: "Session Date", lblNext: "Next Appointment",
        lblProc: "Procedure", lblTotal: "Total", lblPaid: "Total Paid", lblRem: "Remaining",
        lblPayMethod: "Payment Method (For diff)", btnUpdate: "Save Changes",
        mRxTitle: "Issue / Edit Rx", lblRxImport: "📑 Import from template (Optional):",
        optChooseTpl: "Choose template...", lblRxSearch: "Search drug (Name or Category)",
        btnAddNewDrug: "➕ New", txtNoDrugsSel: "No drugs selected yet. Search and select above.",
        lblRxGenNotes: "General instructions (Optional)", btnSaveRx: "Save and Issue Rx",
        prName: "Patient Name:", prDate: "Date:", prAge: "Age:", prDiag: "Procedure:",
        qrVerify: "Scan to verify", msgLoading: "Loading...", msgUpdating: "Updating finances...",
        msgSaved: "Saved successfully!", msgError: "Error occurred!",
        invTitle: "Invoice / Receipt", invTotal: "Total Amount", invPaid: "Amount Paid", invRem: "Remaining Balance",
        rxInstructions: "Instructions:"
    }
};

function getLang() { return currentLang === 'ar'; }

function updatePageContent(lang) {
    const c = dict[lang];
    if(!c) return;

    document.getElementById('page_title').innerText = c.pageTitle;
    const txtBack = document.getElementById('txt-back-profile'); if(txtBack) txtBack.innerText = c.backProf;
    const txtHeader = document.getElementById('txt-sess-header'); if(txtHeader) txtHeader.innerText = c.sessHeader;
    const btnEdit = document.getElementById('btn-edit-sess'); if(btnEdit) btnEdit.innerText = c.btnEdit;
    const btnPrintInv = document.getElementById('btn-print-invoice'); if(btnPrintInv) btnPrintInv.innerText = c.btnPrintInv;
    const btnCard = document.getElementById('btn-print-card'); if(btnCard) btnCard.innerText = c.btnCard;
    const btnCardModal = document.getElementById('btn-print-card-modal'); if(btnCardModal) btnCardModal.innerText = c.btnCard;
    
    const txtTotal = document.getElementById('txt-total-calc'); if(txtTotal) txtTotal.innerText = c.totalCalc;
    const txtPaid = document.getElementById('txt-paid-calc'); if(txtPaid) txtPaid.innerText = c.paidCalc;
    const txtRem = document.getElementById('txt-rem-calc'); if(txtRem) txtRem.innerText = c.remCalc;
    const txtNotes = document.getElementById('txt-doc-notes'); if(txtNotes) txtNotes.innerText = c.docNotes;
    
    const chartTitle = document.getElementById('txt-chart-title'); if(chartTitle) chartTitle.innerText = c.chartTitle;
    const rxTitle = document.getElementById('txt-rx-title'); if(rxTitle) rxTitle.innerText = c.rxTitle;
    const btnAddRx = document.getElementById('btn-add-rx'); if(btnAddRx) btnAddRx.innerText = c.btnAddRx;
    const txtNoRx = document.getElementById('txt-no-rx'); if(txtNoRx) txtNoRx.innerText = c.noRx;
    const txtExtRx = document.getElementById('txt-ext-rx'); if(txtExtRx) txtExtRx.innerText = c.extRx;
    
    const attTitle = document.getElementById('txt-att-title'); if(attTitle) attTitle.innerText = c.attTitle;
    const btnAddAtt = document.getElementById('btn-add-att'); if(btnAddAtt) btnAddAtt.innerText = c.btnAddAtt;
    const txtNoAtt = document.getElementById('txt-no-att'); if(txtNoAtt) txtNoAtt.innerText = c.noAtt;

    const prName = document.getElementById('lbl-pr-name'); if(prName) prName.innerText = c.prName;
    const prDate = document.getElementById('lbl-pr-date'); if(prDate) prDate.innerText = c.prDate;
    const prAge = document.getElementById('lbl-pr-age'); if(prAge) prAge.innerText = c.prAge;
    const prDiag = document.getElementById('lbl-pr-diag'); if(prDiag) prDiag.innerText = c.prDiag;
    const qrVer = document.getElementById('lbl-qr-verify'); if(qrVer) qrVer.innerText = c.qrVerify;

    document.querySelectorAll('.currency-txt').forEach(el => el.innerText = lang === 'ar' ? 'ج.م' : 'EGP');
}

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
            
            let procTxt = sessionData.procedure;
            if(sessionData.contract && sessionData.contract !== 'بدون تعاقد') {
                procTxt += ` <span style="font-size:12px;color:#10b981;font-weight:bold;">(تأمين: ${sessionData.contract})</span>`;
            }
            
            document.getElementById('sd-procedure').innerHTML = procTxt;
            document.getElementById('print-patient-diag').innerText = sessionData.procedure; 
            document.getElementById('sd-date').innerText = sessionData.date;
            document.getElementById('sd-tooth').innerText = sessionData.tooth || '---';
            document.getElementById('sd-total').innerText = sessionData.total || 0;
            document.getElementById('sd-paid').innerText = sessionData.paid || 0;
            document.getElementById('sd-remaining').innerText = sessionData.remaining || 0;
            document.getElementById('sd-notes').innerText = sessionData.notes || (getLang() ? 'لا يوجد' : 'None');

            const matList = document.getElementById('session_materials_list');
            if(matList) {
                matList.innerHTML = '';
                const used = sessionData.usedMaterials || [];
                if(used.length === 0) {
                    matList.innerHTML = `<li style="color:#64748b; font-size:14px; text-align:center; padding:10px;">لا يوجد مستهلكات تم سحبها.</li>`;
                } else {
                    used.forEach(m => {
                        matList.innerHTML += `<li style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:#fff; border:1px solid #e2e8f0; margin-bottom:5px; border-radius:8px;">
                            <span><strong style="color:#0f172a; font-size:15px;">${m.name}</strong> <span style="color:#8b5cf6; font-weight:bold;">(${m.qty} وحدة)</span></span>
                            <button onclick="removeSessionMaterial('${m.id}', '${m.name}', ${m.qty}, '${m.consumedAt}')" style="background:#fee2e2; border:1px solid #fca5a5; color:#ef4444; border-radius:6px; cursor:pointer; padding:4px 8px; font-weight:bold; font-size:12px;">إلغاء الصرف ↩️</button>
                        </li>`;
                    });
                }
            }

            if (typeof updateChartWithData === "function") {
                updateChartWithData(sessionData.dentalChart || {});
            }
        }
    });

    db.collection("Services").where("clinicId", "==", clinicId).onSnapshot(snap => {
        erpServices = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const selectProc = document.getElementById('es_procedure');
        if (selectProc && selectProc.tagName === 'SELECT') {
            const currentVal = selectProc.value;
            selectProc.innerHTML = `<option value="">اختر الخدمة (الإجراء)...</option>`;
            erpServices.forEach(s => {
                selectProc.innerHTML += `<option value="${s.id}">${s.name} (${s.price} ج.م)</option>`;
            });
            if (sessionData && !currentVal) {
                const existingSrv = erpServices.find(s => s.name === sessionData.procedure);
                if(existingSrv) selectProc.value = existingSrv.id;
            } else {
                selectProc.value = currentVal;
            }
        }
    });

    db.collection("Contracts").where("clinicId", "==", clinicId).onSnapshot(snap => {
        erpContracts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const contEl = document.getElementById('es_contract');
        if (contEl) {
            const currentVal = contEl.value;
            contEl.innerHTML = `<option value="">بدون تعاقد (0%)</option>`;
            erpContracts.forEach(c => {
                contEl.innerHTML += `<option value="${c.id}">${c.name} (خصم ${c.discountPercentage}%)</option>`;
            });
            if (sessionData && sessionData.contract && !currentVal) {
                const existingCont = erpContracts.find(c => c.name === sessionData.contract);
                if(existingCont) contEl.value = existingCont.id;
            } else {
                contEl.value = currentVal;
            }
        }
    });

    loadClinicInventory(); 
    loadSessionXRays();
    loadSessionPrescription();
    loadClinicPharmacy();
    loadRxTemplates(); 
    
    if (typeof buildAdvancedDentalChart === "function") {
        setTimeout(() => buildAdvancedDentalChart(patientId), 300); 
    }
}

function loadClinicInventory() {
    db.collection("Inventory").where("clinicId", "==", clinicId).onSnapshot(snap => {
        clinicInventory = [];
        const sel = document.getElementById('inv_item_select');
        if(!sel) return;
        sel.innerHTML = '<option value="">اختر الخامة المستهلكة...</option>';
        snap.forEach(doc => {
            const data = doc.data();
            clinicInventory.push({ id: doc.id, ...data });
            if(data.qty > 0) {
                sel.innerHTML += `<option value="${doc.id}">${data.name} (المتاح بالمخزن: ${data.qty})</option>`;
            }
        });
    });
}

async function consumeSessionMaterial() {
    const sel = document.getElementById('inv_item_select');
    const qtyInput = document.getElementById('inv_item_qty');
    if(!sel || !qtyInput) return;
    const itemId = sel.value;
    const qty = Number(qtyInput.value) || 0;

    if(!itemId || qty <= 0) { alert(getLang() ? "برجاء اختيار الصنف وتحديد الكمية!" : "Select item and valid quantity."); return; }

    const item = clinicInventory.find(i => i.id === itemId);
    if(!item || item.qty < qty) { alert(getLang() ? "الكمية المتاحة في المخزن لا تكفي!" : "Not enough stock in inventory!"); return; }

    if (window.showLoader) window.showLoader(getLang() ? "جاري سحب الكمية من المخزن..." : "Deducting from stock...");

    const materialObj = { id: itemId, name: item.name, qty: qty, consumedAt: new Date().toISOString() };

    try {
        const batch = db.batch();
        batch.update(db.collection("Inventory").doc(itemId), { qty: firebase.firestore.FieldValue.increment(-qty) });
        batch.update(db.collection("Sessions").doc(sessionId), { usedMaterials: firebase.firestore.FieldValue.arrayUnion(materialObj) });
        await batch.commit();

        sel.value = ''; qtyInput.value = '1';
    } catch(e) { console.error(e); }
    finally { if(window.hideLoader) window.hideLoader(); }
}

async function removeSessionMaterial(itemId, itemName, qty, consumedAt) {
    if(!confirm(getLang() ? "هل تريد إلغاء صرف هذه الخامة وإرجاعها للمخزن؟" : "Undo deduction and return to stock?")) return;

    if (window.showLoader) window.showLoader(getLang() ? "جاري الإرجاع للمخزن..." : "Returning to stock...");
    try {
        const materialObj = { id: itemId, name: itemName, qty: qty, consumedAt: consumedAt };
        const batch = db.batch();
        batch.update(db.collection("Inventory").doc(itemId), { qty: firebase.firestore.FieldValue.increment(qty) });
        batch.update(db.collection("Sessions").doc(sessionId), { usedMaterials: firebase.firestore.FieldValue.arrayRemove(materialObj) });
        await batch.commit();
    } catch(e) { console.error(e); }
    finally { if(window.hideLoader) window.hideLoader(); }
}

function openEditSessionModal() {
    if(!sessionData) return;
    document.getElementById('es_date').value = sessionData.date;
    document.getElementById('es_next_date').value = sessionData.nextAppointment || '';
    
    const procEl = document.getElementById('es_procedure');
    if(procEl && procEl.tagName === 'SELECT') {
        const srv = erpServices.find(s => s.name === sessionData.procedure);
        if(srv) procEl.value = srv.id;
    }
    const contEl = document.getElementById('es_contract');
    if(contEl && sessionData.contract) {
        const cont = erpContracts.find(c => c.name === sessionData.contract);
        if(cont) contEl.value = cont.id;
    }

    document.getElementById('es_total').value = sessionData.total || 0;
    document.getElementById('es_paid').value = sessionData.paid || 0;
    document.getElementById('es_remaining').value = sessionData.remaining || 0;
    document.getElementById('es_pay_method').value = 'cash'; 
    openModal('editSessionModal');
}

function calculateEditSessionERP() {
    const srvId = document.getElementById('es_procedure').value;
    const contEl = document.getElementById('es_contract');
    const contId = contEl ? contEl.value : '';
    
    let basePrice = 0;
    const srv = erpServices.find(s => s.id === srvId);
    if (srv) basePrice = Number(srv.price) || 0;

    let discount = 0;
    const cont = erpContracts.find(c => c.id === contId);
    if (cont) discount = Number(cont.discountPercentage) || 0;

    const total = basePrice - (basePrice * (discount / 100));
    document.getElementById('es_total').value = Math.round(total);
    calcEditRemaining();
}

function calcEditRemaining() {
    const t = Number(document.getElementById('es_total').value) || 0;
    const p = Number(document.getElementById('es_paid').value) || 0;
    document.getElementById('es_remaining').value = Math.max(0, t - p);
}

async function updateSession(e) {
    e.preventDefault();
    const isAr = getLang();
    if (window.showLoader) window.showLoader(dict[currentLang].msgUpdating);

    const newTotal = Number(document.getElementById('es_total').value);
    const newPaid = Number(document.getElementById('es_paid').value);
    const newRemaining = Number(document.getElementById('es_remaining').value);
    const newDate = document.getElementById('es_date').value;
    const payMethod = document.getElementById('es_pay_method').value; 

    const procSelect = document.getElementById('es_procedure');
    const srv = erpServices.find(s => s.id === procSelect.value);
    const newProcedure = srv ? srv.name : (procSelect.options ? procSelect.options[procSelect.selectedIndex]?.text : procSelect.value);

    const contSelect = document.getElementById('es_contract');
    const cont = contSelect ? erpContracts.find(c => c.id === contSelect.value) : null;
    const contractVal = cont ? cont.name : 'بدون تعاقد';

    const data = {
        date: newDate,
        nextAppointment: document.getElementById('es_next_date').value || null,
        procedure: newProcedure,
        contract: contractVal,
        total: newTotal,
        paid: newPaid,
        remaining: newRemaining
    };

    try {
        const oldRemaining = sessionData.remaining || 0;
        const oldPaid = sessionData.paid || 0;
        
        const debtDiff = newRemaining - oldRemaining;
        const paidDiff = newPaid - oldPaid;

        await db.collection("Sessions").doc(sessionId).update(data);

        if (paidDiff !== 0) {
            await db.collection("Finances").add({
                clinicId: clinicId, patientId: patientId, 
                type: paidDiff > 0 ? 'income' : 'expense', 
                category: isAr ? 'تعديل دفعة جلسة' : 'Session Payment Adjustment',
                amount: Math.abs(paidDiff), 
                date: newDate, 
                paymentMethod: payMethod,
                notes: isAr ? `تسوية حساب جلسة: ${newProcedure}` : `Payment Adjust: ${newProcedure}`,
                createdBy: "Admin", 
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        if (debtDiff !== 0) {
            await db.collection("Patients").doc(patientId).update({ 
                totalDebt: firebase.firestore.FieldValue.increment(debtDiff) 
            });
            await db.collection("Finances").add({
                clinicId: clinicId, patientId: patientId, type: 'debt', 
                category: isAr ? 'تعديل مديونية جلسة' : 'Session Debt Adjustment',
                amount: debtDiff, date: newDate, 
                notes: isAr ? `تسوية ديون: ${newProcedure}` : `Debt Adjust: ${newProcedure}`,
                createdBy: "Admin", 
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        closeModal('editSessionModal');
    } catch(e) { 
        console.error(e); 
        alert(dict[currentLang].msgError);
    } finally {
        if (window.hideLoader) window.hideLoader();
    }
}

// ==========================================
// 🔴 سحر دمج مخطط الأسنان بالـ ERP 🔴
// ==========================================
async function addServiceToInvoiceFromChart(actionDetails) {
    const isAr = getLang();
    const priceInput = prompt(isAr ? `أدخل تكلفة: ${actionDetails} (ج.م)` : `Enter cost for: ${actionDetails} (EGP)`, "0");
    if (priceInput === null) return;

    const addedPrice = Number(priceInput);
    if (isNaN(addedPrice) || addedPrice < 0) {
        alert(isAr ? "قيمة غير صحيحة!" : "Invalid amount!");
        return;
    }

    if (window.showLoader) window.showLoader(isAr ? "جاري تحديث الفاتورة..." : "Updating invoice...");

    try {
        const oldProcedure = sessionData.procedure || "";
        const newProcedure = oldProcedure === "كشف" || oldProcedure === "استشارة" ? actionDetails : oldProcedure + " + " + actionDetails;
        
        const newTotal = (Number(sessionData.total) || 0) + addedPrice;
        const newRemaining = (Number(sessionData.remaining) || 0) + addedPrice;

        await db.collection("Sessions").doc(sessionId).update({
            procedure: newProcedure,
            total: newTotal,
            remaining: newRemaining
        });

        if (addedPrice > 0) {
            await db.collection("Patients").doc(patientId).update({
                totalDebt: firebase.firestore.FieldValue.increment(addedPrice)
            });
            
            await db.collection("Finances").add({
                clinicId: clinicId,
                patientId: patientId,
                type: 'debt',
                category: isAr ? 'إضافة إجراء من الخريطة' : 'Chart Procedure Added',
                amount: addedPrice,
                date: new Date().toISOString().split('T')[0],
                notes: actionDetails,
                createdBy: "System",
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        alert(isAr ? "✅ تم إضافة الإجراء للفاتورة وتسجيل المديونية بنجاح!" : "✅ Procedure added to invoice!");
    } catch (error) {
        console.error(error);
        alert(isAr ? "❌ حدث خطأ أثناء التحديث." : "❌ Error updating invoice.");
    } finally {
        if (window.hideLoader) window.hideLoader();
    }
}
window.addServiceToInvoiceFromChart = addServiceToInvoiceFromChart;
// ==========================================

function generateQRCodeForPrint(textData) {
    const qrContainer = document.getElementById('print-qr-container');
    qrContainer.innerHTML = ''; 
    
    let safeText = textData;
    try { safeText = unescape(encodeURIComponent(textData)); } catch(e) {}
    
    new QRCode(qrContainer, {
        text: safeText, width: 100, height: 100, colorDark : "#0f172a", colorLight : "#ffffff", correctLevel : QRCode.CorrectLevel.L
    });
}

async function preparePrintHeader() {
    const cDoc = await db.collection("Clinics").doc(clinicId).get();
    if(cDoc.exists) {
        const cInfo = cDoc.data();
        document.getElementById('print-clinic-name').innerText = cInfo.clinicName || 'Smart Clinic';
        document.getElementById('print-doctor-name').innerText = cInfo.adminEmail ? `Dr. Account: ${cInfo.adminEmail}` : '';
        if(cInfo.logoUrl) {
            const printLogo = document.getElementById('print-clinic-logo');
            printLogo.src = cInfo.logoUrl;
            printLogo.style.display = 'block';
        }
        document.getElementById('print-clinic-address').innerText = cInfo.address1 || "---";
        document.getElementById('print-clinic-phone').innerText = cInfo.phone1 || "---";
    }
}

async function printSessionRx(docId) {
    if (window.showLoader) window.showLoader(dict[currentLang].msgLoading);
    try {
        const doc = await db.collection("Prescriptions").doc(docId).get();
        if(doc.exists) {
            const p = doc.data();
            document.getElementById('print-date').innerText = p.date;
            await preparePrintHeader();
            const bodyContent = document.getElementById('print-dynamic-body');
            bodyContent.className = 'print-rx-body watermark-rx'; 
            bodyContent.innerHTML = `
                <div style="white-space: pre-wrap; font-size: 20px; line-height: 2.2; direction: ltr; text-align: left; padding-left: 30px; font-weight: bold; color: #1e293b;">${p.medications}</div>
                <div style="margin-top: 40px;">
                    <strong style="color: #ef4444; font-size: 18px;">${dict[currentLang].rxInstructions}</strong> 
                    <p style="margin-top: 10px; font-size: 16px; line-height: 1.8;">${p.notes || (getLang() ? 'لا يوجد' : 'None')}</p>
                </div>
            `;
            const qrData = `Doc: Prescription\nID: ${docId}\nDate: ${p.date}\nAuth: NivaDent System`;
            generateQRCodeForPrint(qrData);
            if (window.hideLoader) window.hideLoader();
            setTimeout(() => window.print(), 500); 
        } else { if (window.hideLoader) window.hideLoader(); }
    } catch(e) { if (window.hideLoader) window.hideLoader(); console.error(e); }
}

async function printSessionInvoice() {
    if (window.showLoader) window.showLoader(dict[currentLang].msgLoading);
    try {
        document.getElementById('print-date').innerText = sessionData.date;
        await preparePrintHeader();
        const bodyContent = document.getElementById('print-dynamic-body');
        bodyContent.className = 'print-rx-body watermark-invoice'; 
        
        const currency = getLang() ? 'ج.م' : 'EGP';
        const invTitle = dict[currentLang].invTitle;
        const totalTxt = dict[currentLang].invTotal;
        const paidTxt = dict[currentLang].invPaid;
        const remTxt = dict[currentLang].invRem;

        bodyContent.innerHTML = `
            <h2 style="text-align: center; color: #0f172a; margin-bottom: 30px; font-size: 24px; border-bottom: 2px dashed #cbd5e1; padding-bottom: 10px;">🧾 ${invTitle}</h2>
            <table class="invoice-table">
                <tr><th>${totalTxt}</th><th>${paidTxt}</th><th>${remTxt}</th></tr>
                <tr>
                    <td style="font-weight: bold;">${sessionData.total || 0} ${currency}</td>
                    <td style="color: #10b981; font-weight: bold;">${sessionData.paid || 0} ${currency}</td>
                    <td style="color: #ef4444; font-weight: bold;">${sessionData.remaining || 0} ${currency}</td>
                </tr>
            </table>
            <div style="margin-top: 40px;">
                <p style="font-size: 16px; color: #475569;"><strong>${dict[currentLang].docNotes}</strong> ${sessionData.notes || '---'}</p>
            </div>
        `;
        const qrData = `Doc: Invoice\nID: ${sessionId}\nTotal: ${sessionData.total}\nPaid: ${sessionData.paid}\nAuth: NivaDent System`;
        generateQRCodeForPrint(qrData);
        if (window.hideLoader) window.hideLoader();
        setTimeout(() => window.print(), 500); 
    } catch(e) { if (window.hideLoader) window.hideLoader(); console.error(e); }
}

function openQRModal() {
    document.getElementById('qr_patient_name').innerText = patientName;
    db.collection("Patients").doc(patientId).get().then(doc => {
        if(doc.exists) document.getElementById('qr_patient_phone').innerText = doc.data().phone || '';
    });
    const qrContainer = document.getElementById('qrcode_container_card');
    qrContainer.innerHTML = '';
    const profileUrl = window.location.origin + "/patient-profile.html?id=" + patientId + "&clinicId=" + clinicId;
    new QRCode(qrContainer, { text: profileUrl, width: 150, height: 150, colorDark : "#0f172a", colorLight : "#ffffff", correctLevel : QRCode.CorrectLevel.L });
    openModal('qrPrintModal');
}

function printPatientCard() {
    const cardContent = document.getElementById('printCardArea').outerHTML;
    const printSection = document.getElementById('actualPrintSection');
    const mainPrintArea = document.getElementById('print-area');
    if(mainPrintArea) mainPrintArea.style.display = 'none'; 
    printSection.innerHTML = cardContent;
    closeModal('qrPrintModal');
    setTimeout(() => {
        window.print();
        printSection.innerHTML = '';
        if(mainPrintArea) mainPrintArea.style.display = 'block'; 
    }, 500);
}

function loadClinicPharmacy() {
    const cacheKey = `pharmacy_${clinicId}`;
    const cachedDrugs = localStorage.getItem(cacheKey);
    if (cachedDrugs) clinicPharmacy = JSON.parse(cachedDrugs);

    db.collection("Pharmacy").where("clinicId", "==", clinicId).onSnapshot(snap => {
        clinicPharmacy = [];
        snap.forEach(doc => clinicPharmacy.push({ id: doc.id, ...doc.data() }));
        localStorage.setItem(cacheKey, JSON.stringify(clinicPharmacy));
        if(document.getElementById('drug-search') && document.getElementById('drug-search').value.length > 0) searchDrugs();
    });
}

function loadRxTemplates() {
    const isAr = getLang();
    const select = document.getElementById('rx_template_select');
    const listContainer = document.getElementById('templates-list-container');
    const cacheKey = `rx_templates_${clinicId}`;

    const renderTemplates = (templatesArray) => {
        if (!select || !listContainer) return;
        select.innerHTML = `<option value="">${dict[currentLang].optChooseTpl}</option>`;
        listContainer.innerHTML = '';
        if (templatesArray.length === 0) {
            listContainer.innerHTML = `<div class="empty-state">${isAr ? 'لا يوجد قوالب محفوظة.' : 'No saved templates.'}</div>`;
            return;
        }
        templatesArray.forEach(t => {
            select.innerHTML += `<option value="${t.id}">${t.templateName}</option>`;
            listContainer.innerHTML += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #f1f5f9;">
                    <strong>${t.templateName}</strong>
                    <button class="btn-danger" style="padding: 5px 10px; font-size: 12px;" onclick="deleteDoc('RxTemplates', '${t.id}')">${isAr ? 'حذف' : 'Delete'}</button>
                </div>
            `;
        });
        window.rxTemplatesData = templatesArray;
    };

    const cachedTemplates = localStorage.getItem(cacheKey);
    if (cachedTemplates) renderTemplates(JSON.parse(cachedTemplates));

    db.collection("RxTemplates").where("clinicId", "==", clinicId).onSnapshot(snap => {
        const freshTemplates = snap.docs.map(d => ({id: d.id, ...d.data()}));
        localStorage.setItem(cacheKey, JSON.stringify(freshTemplates));
        renderTemplates(freshTemplates);
    });
}

function openAddDrugModal() {
    const isAr = getLang();
    editDrugId = null; 
    document.getElementById('new_drug_category').value = '';
    document.getElementById('new_drug_name').value = '';
    document.getElementById('new_drug_dose').value = '';
    document.getElementById('modal-drug-title').innerText = isAr ? 'إضافة علاج جديد' : 'Add New Drug';
    document.getElementById('btn-save-drug').innerText = isAr ? 'حفظ في قاعدة الأدوية' : 'Save Drug';
    openModal('addDrugModal');
}

function openEditDrugModal(drugId, event) {
    event.stopPropagation(); 
    const isAr = getLang();
    const drug = clinicPharmacy.find(d => d.id === drugId);
    if(!drug) return;
    editDrugId = drugId; 
    document.getElementById('new_drug_category').value = drug.category;
    document.getElementById('new_drug_name').value = drug.name;
    document.getElementById('new_drug_dose').value = drug.defaultDose;
    document.getElementById('modal-drug-title').innerText = isAr ? 'تعديل بيانات العلاج' : 'Edit Drug';
    document.getElementById('btn-save-drug').innerText = isAr ? 'حفظ التعديلات' : 'Save Changes';
    openModal('addDrugModal');
}

async function deleteDrugFromPharmacy(drugId, event) {
    event.stopPropagation(); 
    const isAr = getLang();
    const msg = isAr ? "هل أنت متأكد من حذف هذا الدواء نهائياً؟" : "Are you sure you want to delete this drug permanently?";
    if(confirm(msg)) {
        if (window.showLoader) window.showLoader(isAr ? "جاري الحذف..." : "Deleting...");
        try {
            await db.collection("Pharmacy").doc(drugId).delete();
            document.getElementById('search-results-box').style.display = 'none';
            document.getElementById('drug-search').value = '';
        } catch(e) { console.error(e); } 
        finally { if (window.hideLoader) window.hideLoader(); }
    }
}

async function saveNewDrugToPharmacy(e) {
    e.preventDefault();
    const isAr = getLang();
    const nameInput = document.getElementById('new_drug_name').value.trim();
    if (!editDrugId) {
        const isDuplicate = clinicPharmacy.some(d => d.name.toLowerCase() === nameInput.toLowerCase());
        if (isDuplicate) { alert(isAr ? "❌ هذا العلاج موجود بالفعل!" : "❌ This drug already exists!"); return; }
    }
    if (window.showLoader) window.showLoader(isAr ? "جاري الحفظ..." : "Saving...");
    const data = { clinicId: clinicId, category: document.getElementById('new_drug_category').value.trim(), name: nameInput, defaultDose: document.getElementById('new_drug_dose').value.trim() };
    try {
        if (editDrugId) await db.collection("Pharmacy").doc(editDrugId).update(data); 
        else await db.collection("Pharmacy").add(data); 
        closeModal('addDrugModal');
        document.getElementById('drug-search').value = data.name;
        searchDrugs(); 
    } catch(e) { console.error(e); } 
    finally { if (window.hideLoader) window.hideLoader(); }
}

function searchDrugs() {
    const input = document.getElementById('drug-search').value.toLowerCase();
    const resultBox = document.getElementById('search-results-box');
    resultBox.innerHTML = '';
    const isAr = getLang();
    if(input.length === 0) { resultBox.style.display = 'none'; return; }
    const filtered = clinicPharmacy.filter(d => d.name.toLowerCase().includes(input) || d.category.toLowerCase().includes(input));
    if(filtered.length === 0) {
        const txt = isAr ? 'لا يوجد دواء بهذا الاسم.' : 'No drug found.';
        resultBox.innerHTML = `<div class="search-item" style="color:#64748b; text-align: center; padding: 15px;">${txt}</div>`;
    } else {
        filtered.forEach(d => {
            const div = document.createElement('div');
            div.className = 'search-item';
            div.style.display = 'flex'; div.style.justifyContent = 'space-between'; div.style.alignItems = 'center'; div.style.cursor = 'pointer';
            const infoDiv = document.createElement('div');
            infoDiv.style.flex = '1';
            infoDiv.innerHTML = `<strong style="color: #0f172a; font-size: 15px;" dir="ltr">${d.name}</strong> <small style="color:#64748b; margin-right: 5px;">(${d.category})</small>`;
            infoDiv.onclick = () => addDrugToPrescriptionList(d);
            const actionsDiv = document.createElement('div');
            actionsDiv.style.display = 'flex'; actionsDiv.style.gap = '5px';
            actionsDiv.innerHTML = `
                <button type="button" class="btn-action" style="padding:6px; font-size:12px; background:#fff7ed; color:#ea580c; border:1px solid #fed7aa;" onclick="openEditDrugModal('${d.id}', event)">✏️</button>
                <button type="button" class="btn-action" style="padding:6px; font-size:12px; background:#fee2e2; color:#ef4444; border:1px solid #fca5a5;" onclick="deleteDrugFromPharmacy('${d.id}', event)">🗑️</button>
            `;
            div.appendChild(infoDiv); div.appendChild(actionsDiv); resultBox.appendChild(div);
        });
    }
    resultBox.style.display = 'block';
}

function downloadDrugsTemplate() {
    const wb = XLSX.utils.book_new();
    const ws_data = [["category", "name", "defaultDose"], ["مضاد حيوي", "Augmentin 1gm", "قرص كل 12 ساعة"]];
    const ws = XLSX.utils.aoa_to_sheet(ws_data); XLSX.utils.book_append_sheet(wb, ws, "Drugs"); XLSX.writeFile(wb, "NivaDent_Drugs_Template.xlsx");
}

function importDrugsFromExcel(input) {
    const file = input.files[0];
    if (!file) return;
    const isAr = getLang();
    if (window.showLoader) window.showLoader(isAr ? "جاري استيراد الأدوية..." : "Importing drugs...");
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result); const workbook = XLSX.read(data, {type: 'array'});
            const firstSheet = workbook.SheetNames[0]; const excelRows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);
            if (excelRows.length === 0) { alert(isAr ? "الملف فارغ!" : "File is empty!"); return; }
            let importedCount = 0; const batch = db.batch();
            excelRows.forEach(row => {
                if (row.name && row.category) {
                    const docRef = db.collection("Pharmacy").doc();
                    batch.set(docRef, { clinicId: clinicId, category: String(row.category).trim(), name: String(row.name).trim(), defaultDose: row.defaultDose ? String(row.defaultDose).trim() : "" });
                    importedCount++;
                }
            });
            await batch.commit();
            alert(isAr ? `✅ تم استيراد ${importedCount} دواء بنجاح!` : `✅ Successfully imported ${importedCount} drugs!`);
            closeModal('addDrugModal');
        } catch (error) { console.error(error); alert(isAr ? "❌ حدث خطأ في قراءة الملف." : "❌ Error reading file."); } 
        finally { input.value = ''; if (window.hideLoader) window.hideLoader(); }
    };
    reader.readAsArrayBuffer(file);
}

function addDrugToPrescriptionList(drug) {
    const isAr = getLang();
    document.getElementById('search-results-box').style.display = 'none';
    document.getElementById('drug-search').value = '';
    const exists = currentPrescriptionDrugs.some(d => d.name === drug.name);
    if(exists) { alert(isAr ? "هذا الدواء مضاف بالفعل." : "Drug already added."); return; }
    currentPrescriptionDrugs.push({ name: drug.name, dose: drug.defaultDose });
    renderSelectedDrugs();
}

function removeDrugFromList(index) { currentPrescriptionDrugs.splice(index, 1); renderSelectedDrugs(); }

function renderSelectedDrugs() {
    const list = document.getElementById('selected-drugs-list'); list.innerHTML = '';
    if(currentPrescriptionDrugs.length === 0) {
        list.innerHTML = `<div class="empty-state" style="padding: 30px;">${dict[currentLang].txtNoDrugsSel}</div>`; return;
    }
    currentPrescriptionDrugs.forEach((drug, index) => {
        list.innerHTML += `
            <div class="drug-list-item">
                <div style="flex: 1; font-weight: 800; font-size: 15px; color: #0f172a;" dir="ltr">${drug.name}</div>
                <div style="flex: 2;"><input type="text" value="${drug.dose}" id="dose_${index}" onchange="updateDose(${index}, this.value)" class="search-box" style="padding: 8px; border-radius: 6px; font-size: 13px;"></div>
                <div><button type="button" class="btn-danger" style="padding: 8px 12px; border-radius: 6px; font-size: 12px;" onclick="removeDrugFromList(${index})">❌</button></div>
            </div>
        `;
    });
}

function updateDose(index, newDose) { currentPrescriptionDrugs[index].dose = newDose; }

function openSmartRxModal() {
    activePrescriptionDocId = null; currentPrescriptionDrugs = []; document.getElementById('drug-search').value = '';
    document.getElementById('search-results-box').style.display = 'none'; document.getElementById('rx_template_select').value = '';
    document.getElementById('rx_general_notes').value = ''; renderSelectedDrugs(); openModal('smartRxModal');
}

function editPrescription(docId) {
    const p = sessionPrescriptions[docId]; if(!p) return;
    activePrescriptionDocId = docId; currentPrescriptionDrugs = p.rawDrugsArray ? [...p.rawDrugsArray] : [];
    document.getElementById('rx_general_notes').value = p.notes || ''; document.getElementById('drug-search').value = '';
    document.getElementById('search-results-box').style.display = 'none'; document.getElementById('rx_template_select').value = '';
    renderSelectedDrugs(); openModal('smartRxModal');
}

function openTemplateManager() { openModal('templatesModal'); }

function applyRxTemplate(templateId) {
    if(!templateId) return; const tpl = window.rxTemplatesData.find(t => t.id === templateId);
    if(tpl && tpl.drugsArray) {
        tpl.drugsArray.forEach(drug => {
            if(!currentPrescriptionDrugs.some(d => d.name === drug.name)) currentPrescriptionDrugs.push({ name: drug.name, dose: drug.dose });
        });
        renderSelectedDrugs();
    }
}

async function saveCurrentRxAsTemplate() {
    const isAr = getLang(); const tplName = document.getElementById('tpl_name').value.trim();
    if (!tplName) { alert(isAr ? "برجاء كتابة اسم القالب أولاً!" : "Please write a template name!"); return; }
    if (currentPrescriptionDrugs.length === 0) { alert(isAr ? "الروشتة الحالية فارغة!" : "Current prescription is empty!"); return; }
    if (window.showLoader) window.showLoader(dict[currentLang].msgLoading);
    try {
        const updatedDrugs = currentPrescriptionDrugs.map((d, i) => { const doseEl = document.getElementById(`dose_${i}`); return { name: d.name, dose: doseEl ? doseEl.value : d.dose }; });
        await db.collection("RxTemplates").add({ clinicId: clinicId, templateName: tplName, drugsArray: updatedDrugs, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        document.getElementById('tpl_name').value = ''; alert(isAr ? "✅ تم حفظ القالب بنجاح!" : "✅ Template saved successfully!");
    } catch(e) { console.error(e); } finally { if (window.hideLoader) window.hideLoader(); }
}

async function saveSmartPrescription() {
    const isAr = getLang();
    if(currentPrescriptionDrugs.length === 0) { alert(isAr ? "برجاء اختيار دواء واحد على الأقل." : "Please select at least one drug."); return; }
    if (window.showLoader) window.showLoader(dict[currentLang].msgLoading);
    let medsText = "";
    currentPrescriptionDrugs.forEach((d, i) => {
        const doseEl = document.getElementById(`dose_${i}`); const finalDose = doseEl ? doseEl.value : d.dose;
        d.dose = finalDose; medsText += `${i+1}. ${d.name}\n   ${finalDose}\n\n`;
    });
    const data = { clinicId: clinicId, patientId: patientId, sessionId: sessionId, medications: medsText, notes: document.getElementById('rx_general_notes').value, date: new Date().toISOString().split('T')[0], rawDrugsArray: currentPrescriptionDrugs };
    try {
        if(activePrescriptionDocId) await db.collection("Prescriptions").doc(activePrescriptionDocId).update(data);
        else { data.createdAt = firebase.firestore.FieldValue.serverTimestamp(); await db.collection("Prescriptions").add(data); }
        closeModal('smartRxModal');
    } catch(e) { console.error(e); } finally { if (window.hideLoader) window.hideLoader(); }
}

function attachImageToRx(docId) { activePrescriptionDocId = docId; document.getElementById('upload-rx-input').click(); }

function loadSessionPrescription() {
    db.collection("Prescriptions").where("sessionId", "==", sessionId).orderBy("createdAt", "asc").onSnapshot(snap => {
        const container = document.getElementById('session-rx-container'); const isAr = getLang(); sessionPrescriptions = {}; 
        if(snap.empty) { container.innerHTML = `<div class="empty-state">${dict[currentLang].noRx}</div><div style="text-align: center; margin-top: 15px;"><button class="btn-action" style="background:#f8fafc; border:1px solid #cbd5e1; color:#475569;" onclick="attachImageToRx(null)">${dict[currentLang].extRx}</button></div>`; return; }
        container.innerHTML = ''; let counter = 1;
        snap.forEach(doc => {
            const p = doc.data(); sessionPrescriptions[doc.id] = p; 
            let uploadedUrls = [];
            if (p.uploadedRxUrl) uploadedUrls.push(p.uploadedRxUrl);
            if (p.uploadedRxUrls && Array.isArray(p.uploadedRxUrls)) uploadedUrls = [...new Set([...uploadedUrls, ...p.uploadedRxUrls])];
            let uploadsHtml = '';
            if (uploadedUrls.length > 0) {
                let imagesHtml = '';
                uploadedUrls.forEach((url) => { imagesHtml += `<div style="position: relative; display: inline-block; margin: 5px;"><a href="${url}" target="_blank"><img src="${url}" style="height: 100px; width: 100px; object-fit: cover; border-radius: 8px; border: 1px solid #cbd5e1;"></a><button onclick="deleteSpecificRxImage('${doc.id}', '${url}')" style="position: absolute; top: -5px; right: -5px; background: #ef4444; color: white; border: none; border-radius: 50%; width: 22px; height: 22px; cursor: pointer; font-size: 12px;">×</button></div>`; });
                uploadsHtml = `<div style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed #cbd5e1; text-align: right;"><span style="color: #64748b; font-size: 14px; display: block; margin-bottom: 10px; font-weight: bold;">📎 ${isAr?'مرفقات':'Attachments'} (${uploadedUrls.length}):</span><div style="display: flex; flex-wrap: wrap; gap: 10px;">${imagesHtml}</div></div>`;
            }
            let rxTitle = isAr ? `روشتة #${counter}` : `Prescription #${counter}`;
            if (p.medications === "روشتة خارجية مرفقة") rxTitle = isAr ? `مرفق خارجي #${counter}` : `External Attachment #${counter}`;
            container.innerHTML += `
                <div style="background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 15px;">
                    <h4 style="margin: 0 0 15px 0; color: #0284c7; border-bottom: 2px solid #e0f2fe; padding-bottom: 5px;">📜 ${rxTitle}</h4>
                    ${p.medications && p.medications !== "روشتة خارجية مرفقة" ? `<div style="white-space: pre-wrap; direction: ltr; text-align: left; font-weight:700; color:#0f172a;">${p.medications}</div>` : ''}
                    ${p.notes ? `<p style="margin-top:15px; color:#475569; border-top: 1px dashed #cbd5e1; padding-top: 10px; font-size: 14px;"><strong>${isAr?'تعليمات خاصة:':'Notes:'}</strong> ${p.notes}</p>` : ''}
                    ${uploadsHtml}
                    <div style="margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
                        <button class="btn-primary" style="flex:1; background:#10b981; justify-content: center;" onclick="printSessionRx('${doc.id}')">${isAr?'🖨️ طباعة':'🖨️ Print'}</button>
                        <button class="btn-action" style="flex:1; background:#fff7ed; color:#ea580c; border-color:#fed7aa; justify-content: center;" onclick="editPrescription('${doc.id}')">${isAr?'✏️ تعديل':'✏️ Edit'}</button>
                        <button class="btn-action" style="flex:1; background:#f1f5f9; color:#475569; border-color:#cbd5e1; justify-content: center;" onclick="attachImageToRx('${doc.id}')">${isAr?'📎 إرفاق صورة':'📎 Attach Image'}</button>
                        <button class="btn-danger" style="flex:1; justify-content: center;" onclick="deleteDoc('Prescriptions', '${doc.id}')">${isAr?'🗑️ مسح':'🗑️ Delete'}</button>
                    </div>
                </div>
            `;
            counter++;
        });
    });
}

document.getElementById('upload-rx-input').addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return; const isAr = getLang();
    if (!activePrescriptionDocId) {
        if (window.showLoader) window.showLoader(isAr ? "جاري إنشاء مرفق جديد..." : "Creating attachment...");
        try {
            const newRx = await db.collection("Prescriptions").add({ clinicId: clinicId, patientId: patientId, sessionId: sessionId, medications: "روشتة خارجية مرفقة", date: new Date().toISOString().split('T')[0], createdAt: firebase.firestore.FieldValue.serverTimestamp(), uploadedRxUrls: [] });
            activePrescriptionDocId = newRx.id;
        } catch(err) { console.error(err); if(window.hideLoader) window.hideLoader(); return; }
    } else { if (window.showLoader) window.showLoader(isAr ? "جاري رفع الصورة..." : "Uploading image..."); }
    try {
        const storageRef = storage.ref(`prescriptions/${clinicId}/${activePrescriptionDocId}_${Date.now()}_${file.name}`);
        await storageRef.put(file); const url = await storageRef.getDownloadURL();
        await db.collection("Prescriptions").doc(activePrescriptionDocId).update({ uploadedRxUrls: firebase.firestore.FieldValue.arrayUnion(url) });
        alert(isAr ? "✅ تم إرفاق الصورة بنجاح!" : "✅ Image attached successfully!");
    } catch (error) { console.error("Upload error:", error); alert(isAr ? "❌ حدث خطأ أثناء الرفع." : "❌ Upload error."); } 
    finally { e.target.value = ''; if (window.hideLoader) window.hideLoader(); }
});

async function deleteSpecificRxImage(docId, imageUrl) {
    const isAr = getLang(); const msg = isAr ? "هل أنت متأكد من حذف هذه الصورة فقط؟" : "Are you sure you want to delete this image only?";
    if(confirm(msg)) {
        if(window.showLoader) window.showLoader(isAr ? "جاري الحذف..." : "Deleting...");
        try { await db.collection("Prescriptions").doc(docId).update({ uploadedRxUrls: firebase.firestore.FieldValue.arrayRemove(imageUrl) }); } catch(e) { console.error(e); } finally { if(window.hideLoader) window.hideLoader(); }
    }
}

function encodeSessionImage(element) {
    const file = element.files[0]; if (!file) return; const isAr = getLang();
    const btn = document.getElementById('btn-save-sx'); const originalText = btn.innerText;
    btn.disabled = true; btn.innerText = isAr ? "جاري ضغط الصورة..." : "Compressing...";
    const reader = new FileReader(); reader.readAsDataURL(file);
    reader.onload = function(event) {
        const img = new Image(); img.src = event.target.result;
        img.onload = function() {
            const canvas = document.createElement('canvas'); const MAX_WIDTH = 1200;
            let width = img.width; let height = img.height;
            if (width > MAX_WIDTH) { height = Math.round((height * MAX_WIDTH) / width); width = MAX_WIDTH; }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
            document.getElementById('sx_base64').value = compressedBase64;
            btn.disabled = false; btn.innerText = originalText;
        }
    };
}

async function saveSessionXRay(e) {
    e.preventDefault(); const isAr = getLang(); const btn = document.getElementById('btn-save-sx');
    btn.disabled = true; btn.innerText = isAr ? "جاري الرفع..." : "Uploading...";
    if (window.showLoader) window.showLoader(isAr ? "جاري رفع المرفق..." : "Uploading attachment...");
    const data = { clinicId: clinicId, patientId: patientId, sessionId: sessionId, type: document.getElementById('sx_type').value, imageBase64: document.getElementById('sx_base64').value, createdAt: firebase.firestore.FieldValue.serverTimestamp() };
    try { await db.collection("XRays").add(data); closeModal('xrayModal'); document.querySelector('#xrayModal form').reset(); } 
    catch (e) { alert(isAr ? "حجم الصورة كبير جداً!" : "Image size is too large!"); } 
    finally { btn.disabled = false; btn.innerText = isAr ? "رفع المرفق" : "Upload"; if (window.hideLoader) window.hideLoader(); }
}

function loadSessionXRays() {
    db.collection("XRays").where("sessionId", "==", sessionId).onSnapshot(snap => {
        const isAr = getLang(); const list = document.getElementById('session-xrays-list'); list.innerHTML = '';
        if (snap.empty) { list.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1; padding: 30px 20px;">${isAr?'لا توجد مرفقات.':'No attachments.'}</div>`; return; }
        snap.forEach(doc => {
            const x = doc.data();
            list.innerHTML += `<div class="xray-card" style="padding: 10px; background: white; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center;"><a href="${x.imageBase64}" target="_blank"><img src="${x.imageBase64}" style="width:100%; height:120px; object-fit:cover; border-radius:6px; margin-bottom: 10px; border:1px solid #f1f5f9;"></a><p style="font-size: 13px; margin: 5px 0; font-weight:bold; color: #1e293b;">${x.type}</p><button class="btn-danger" style="width:100%; padding:6px; font-size:13px; margin-top: 5px;" onclick="deleteDoc('XRays', '${doc.id}')">${isAr?'🗑️ حذف':'🗑️ Delete'}</button></div>`;
        });
    });
}

async function deleteDoc(collectionName, docId) {
    const isAr = getLang(); const msg = isAr ? "هل أنت متأكد من الحذف النهائي؟" : "Are you sure you want to permanently delete this?";
    if(confirm(msg)) {
        if (window.showLoader) window.showLoader(isAr ? "جاري الحذف..." : "Deleting...");
        try { await db.collection(collectionName).doc(docId).delete(); } catch (e) { console.error(e); } finally { if (window.hideLoader) window.hideLoader(); }
    }
}

function setupERPSessionInputs() {
    const procInput = document.getElementById('es_procedure');
    if (procInput && procInput.tagName === 'INPUT') {
        const selectProc = document.createElement('select');
        selectProc.id = 'es_procedure';
        selectProc.style.cssText = procInput.style.cssText;
        selectProc.onchange = calculateEditSessionERP;
        procInput.parentNode.replaceChild(selectProc, procInput);

        const contractDiv = document.createElement('div');
        contractDiv.className = 'form-group';
        contractDiv.style.marginTop = '10px';
        contractDiv.innerHTML = `<label style="font-weight:bold;color:#334155;font-size:14px;margin-bottom:8px;display:block;">جهة التعاقد (الخصم)</label>
            <select id="es_contract" style="${selectProc.style.cssText}" onchange="calculateEditSessionERP()">
                <option value="">بدون تعاقد (0%)</option>
            </select>`;
        selectProc.parentNode.parentNode.insertBefore(contractDiv, selectProc.parentNode.nextSibling);
    }
}

window.onload = () => {
    currentLang = localStorage.getItem('preferredLang') || 'ar';
    document.body.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    document.body.setAttribute('data-theme', localStorage.getItem('niva_theme') || 'light');
    
    updatePageContent(currentLang);
    setupERPSessionInputs(); 
    
    firebase.auth().onAuthStateChanged((user) => { if (user) loadSessionDetails(); });
};
