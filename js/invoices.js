// js/invoices.js
const db = firebase.firestore();
const clinicId = sessionStorage.getItem('clinicId');

let allPatients = [];
let selectedPatient = null;
let patientSessions = [];

// 🔴 1. تحميل قائمة المرضى للبحث السريع 🔴
async function loadPatients() {
    if (!clinicId) return;
    const snap = await db.collection("Patients").where("clinicId", "==", clinicId).get();
    allPatients = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

function searchPatientsForInvoice() {
    const query = document.getElementById('patientSearch').value.trim().toLowerCase();
    const resultsContainer = document.getElementById('searchResults');
    resultsContainer.innerHTML = '';

    if (query.length < 2) {
        resultsContainer.innerHTML = '<div class="empty-state">اكتب حرفين على الأقل للبحث...</div>';
        return;
    }

    const filtered = allPatients.filter(p => 
        (p.name && p.name.toLowerCase().includes(query)) || 
        (p.phone && p.phone.includes(query))
    );

    if (filtered.length === 0) {
        resultsContainer.innerHTML = '<div class="empty-state">لا يوجد مريض بهذا الاسم.</div>';
        return;
    }

    filtered.forEach(p => {
        const div = document.createElement('div');
        div.className = 'patient-result-item';
        div.innerHTML = `<strong>${p.name}</strong><br><small dir="ltr">${p.phone || 'بدون رقم'}</small>`;
        div.onclick = () => selectPatientForInvoice(p, div);
        resultsContainer.appendChild(div);
    });
}

// 🔴 2. اختيار مريض وجلب كشف حسابه 🔴
async function selectPatientForInvoice(patient, element) {
    document.querySelectorAll('.patient-result-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    
    selectedPatient = patient;
    if (window.showLoader) window.showLoader("جاري تجميع كشف الحساب...");

    try {
        const snap = await db.collection("Sessions")
            .where("patientId", "==", patient.id)
            .orderBy("date", "desc")
            .get();
        
        patientSessions = snap.docs.map(doc => doc.data());
        renderInvoice();
    } catch (e) {
        console.error(e);
        alert("خطأ في جلب بيانات الجلسات");
    } finally {
        if (window.hideLoader) window.hideLoader();
    }
}

// 🔴 3. رسم الفاتورة (كشف الحساب) 🔴
function renderInvoice() {
    const placeholder = document.getElementById('invoicePlaceholder');
    const content = document.getElementById('invoiceContent');
    
    placeholder.style.display = 'none';
    content.style.display = 'block';

    let totalBill = 0, totalPaid = 0, totalDebt = 0;

    let rowsHtml = '';
    patientSessions.forEach(s => {
        const t = Number(s.total) || 0;
        const p = Number(s.paid) || 0;
        const r = Number(s.remaining) || 0;
        
        totalBill += t;
        totalPaid += p;
        totalDebt += r;

        rowsHtml += `
            <tr>
                <td>${s.date}</td>
                <td><strong>${s.procedure}</strong></td>
                <td>${t}</td>
                <td style="color: #10b981;">${p}</td>
                <td style="color: #ef4444;">${r}</td>
            </tr>
        `;
    });

    const invoiceHTML = `
        <div class="bill-header">
            <div>
                <h1 style="margin:0; color:#0284c7;">NivaDent Clinic</h1>
                <p style="margin:5px 0; color:#64748b; font-weight:bold;">كشف حساب مريض / Statement of Account</p>
            </div>
            <div style="text-align: left;">
                <p style="margin:0;">التاريخ: <strong>${new Date().toLocaleDateString('ar-EG')}</strong></p>
                <p style="margin:5px 0;">رقم الفاتورة: <strong>INV-${Math.floor(1000 + Math.random() * 9000)}</strong></p>
            </div>
        </div>

        <div style="margin-bottom: 30px; display: flex; justify-content: space-between; background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
            <div>
                <span style="color: #64748b; font-size: 14px;">السيد المريض / Patient Name</span>
                <h2 style="margin: 5px 0; color: #0f172a;">${selectedPatient.name}</h2>
                <span dir="ltr">📞 ${selectedPatient.phone || '---'}</span>
            </div>
            <div id="invoice-qr" style="background: white; padding: 5px; border-radius: 8px; border: 1px solid #cbd5e1;"></div>
        </div>

        <table class="bill-table">
            <thead>
                <tr>
                    <th>التاريخ</th>
                    <th>الإجراء الطبي / الخدمة</th>
                    <th>الإجمالي</th>
                    <th>المدفوع</th>
                    <th>المتبقي</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
            </tbody>
        </table>

        <div class="bill-footer">
            <div class="total-box">
                <div class="total-row"><span>إجمالي الخدمات:</span> <span>${totalBill} ج.م</span></div>
                <div class="total-row"><span>إجمالي المدفوعات:</span> <span style="color:#10b981;">${totalPaid} ج.م</span></div>
                <div class="total-row" style="border-top:1px dashed #94a3b8; padding-top:10px; margin-top:10px; font-size:20px; font-weight:900;">
                    <span>صافي المديونية:</span> <span>${totalDebt} ج.م</span>
                </div>
            </div>
        </div>
        
        <div style="margin-top: 50px; text-align: center; border-top: 1px solid #eee; padding-top: 20px; color: #94a3b8; font-size: 12px;">
            تُعتبر هذه الوثيقة كشف حساب رسمي صادر من نظام العيادة الذكي.
        </div>
    `;

    content.innerHTML = invoiceHTML;
    document.getElementById('actualPrintArea').innerHTML = invoiceHTML; 

    // 🔴 حل مشكلة الـ QR Code Overflow للنصوص العربية 🔴
    const qrContainer = document.getElementById("invoice-qr");
    qrContainer.innerHTML = ""; 
    
    let qrText = `Patient: ${selectedPatient.name} | Debt: ${totalDebt} | Clinic: NivaDent`;
    let safeText = qrText;
    try { 
        safeText = unescape(encodeURIComponent(qrText)); 
    } catch(e) {}

    new QRCode(qrContainer, {
        text: safeText,
        width: 80,
        height: 80,
        colorDark : "#0f172a",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.L
    });
}

window.onload = () => {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.body.dir = lang === 'en' ? 'ltr' : 'rtl';
    document.body.setAttribute('data-theme', localStorage.getItem('niva_theme') || 'light');
    
    firebase.auth().onAuthStateChanged((user) => {
        if (user) loadPatients();
    });
};
