// js/invoices.js
const db = firebase.firestore();
const clinicId = sessionStorage.getItem('clinicId');
const userRole = sessionStorage.getItem('userRole'); // 🔴 جلب الوظيفة
const userBranch = sessionStorage.getItem('branchId') || 'main'; // 🔴 جلب الفرع

let allPatients = [];
let selectedPatient = null;
let patientSessions = [];

let invLang = {}; // 🔴 تخزين الترجمات لاستخدامها في بناء الفاتورة

// 🔴 1. إعدادات اللغة 🔴
function updateLanguage(lang) {
    const translations = {
        ar: {
            title: "الفواتير وكشوف الحساب", sub: "إصدار الفواتير الرسمية، مراجعة مديونيات المرضى، وطباعة السندات",
            btnPrint: "طباعة الفاتورة الحالية",
            searchPat: "🔍 ابحث عن مريض", plhSearch: "اسم المريض أو الموبايل...",
            startSearch: "ابدأ البحث لعرض المرضى...", noPatient: "لا يوجد مريض بهذا الاسم.",
            selPat: "اختر مريضاً من القائمة لعرض كشف الحساب", selSub: "سيتم تجميع كافة الجلسات والمدفوعات والديون تلقائياً",
            optAll: "كل الفروع", 
            
            // نصوص الفاتورة المطبوعة
            invTitle: "كشف حساب مريض / Statement of Account",
            invDate: "التاريخ", invNo: "رقم الفاتورة", invPatName: "السيد المريض / Patient Name",
            thDate: "التاريخ", thProc: "الإجراء الطبي / الخدمة", thTotal: "الإجمالي", thPaid: "المدفوع", thRem: "المتبقي",
            totServ: "إجمالي الخدمات", totPaid: "إجمالي المدفوعات", netDebt: "صافي المديونية",
            footerMsg: "تُعتبر هذه الوثيقة كشف حساب رسمي صادر من نظام العيادة الذكي.",
            currency: "ج.م"
        },
        en: {
            title: "Invoices & Statements", sub: "Issue official invoices, review patient debts, and print receipts",
            btnPrint: "Print Current Invoice",
            searchPat: "🔍 Search Patient", plhSearch: "Patient name or phone...",
            startSearch: "Start typing to search patients...", noPatient: "No patient found.",
            selPat: "Select a patient from the list to view statement", selSub: "All sessions, payments, and debts will be compiled automatically",
            optAll: "All Branches",
            
            // Printed Invoice Texts
            invTitle: "Statement of Account / كشف حساب",
            invDate: "Date", invNo: "Invoice No", invPatName: "Patient Name / السيد المريض",
            thDate: "Date", thProc: "Procedure / Service", thTotal: "Total", thPaid: "Paid", thRem: "Remaining",
            totServ: "Total Services", totPaid: "Total Payments", netDebt: "Net Debt",
            footerMsg: "This document is an official statement issued by the smart clinic system.",
            currency: "EGP"
        }
    };
    invLang = translations[lang] || translations.ar;
    const set = (id, txt) => { const el = document.getElementById(id); if(el) el.innerText = txt; };
    const setPlh = (id, txt) => { const el = document.getElementById(id); if(el) el.placeholder = txt; };

    set('page_title', `${invLang.title} | NivaDent`);
    set('txt-title', invLang.title); set('txt-subtitle', invLang.sub);
    set('btn-print-txt', invLang.btnPrint);
    set('lbl-search-pat', invLang.searchPat); setPlh('patientSearch', invLang.plhSearch);
    set('txt-start-search', invLang.startSearch);
    set('txt-sel-pat', invLang.selPat); set('txt-sel-sub', invLang.selSub);
    if(document.getElementById('opt-all-branches')) set('opt-all-branches', invLang.optAll);

    // لو مريض محدد حالياً، ارسم الفاتورة تاني عشان تترجم
    if(selectedPatient) {
        renderInvoice();
    } else {
        searchPatientsForInvoice(); // Refresh search text
    }
}

// 🔴 2. جلب الفروع (للمدير فقط) 🔴
async function loadBranchesDropdown() {
    if (userRole !== 'admin' && userRole !== 'superadmin') {
        document.getElementById('branch_filter').style.display = 'none';
        return;
    }

    const select = document.getElementById('branch_filter');
    if (!clinicId || !select) return;

    try {
        const snap = await db.collection("Branches").where("clinicId", "==", clinicId).get();
        let optionsHtml = `<option value="all" id="opt-all-branches">${invLang.optAll || 'كل الفروع'}</option>`;
        
        snap.forEach(doc => {
            optionsHtml += `<option value="${doc.id}">${doc.data().name}</option>`;
        });
        
        select.innerHTML = optionsHtml;
        select.style.display = 'block';
        select.value = userBranch; // تعيين الفرع الافتراضي للمدير
    } catch (e) {
        console.error("خطأ في جلب الفروع:", e);
    }
}

// 🔴 3. جلب المرضى (الكبسولة السحرية للفلترة والعزل) 🔴
async function loadPatients() {
    if (!clinicId) return;

    let queryRef = db.collection("Patients").where("clinicId", "==", clinicId);

    if (userRole !== 'admin' && userRole !== 'superadmin') {
        // الموظف العادي معزول على فرعه
        queryRef = queryRef.where("branchId", "==", userBranch);
    } else {
        // المدير يقدر يفلتر بالـ Dropdown
        const selectedBranch = document.getElementById('branch_filter').value;
        if (selectedBranch && selectedBranch !== 'all') {
            queryRef = queryRef.where("branchId", "==", selectedBranch);
        }
    }

    try {
        const snap = await queryRef.get();
        allPatients = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // تفريغ البحث عند التبديل بين الفروع
        document.getElementById('patientSearch').value = '';
        searchPatientsForInvoice(); 
    } catch (e) {
        console.error("Error loading patients:", e);
    }
}

function searchPatientsForInvoice() {
    const query = document.getElementById('patientSearch').value.trim().toLowerCase();
    const resultsContainer = document.getElementById('searchResults');
    resultsContainer.innerHTML = '';

    if (query.length < 2) {
        resultsContainer.innerHTML = `<div class="empty-state">${invLang.startSearch || 'ابدأ البحث...'}</div>`;
        return;
    }

    const filtered = allPatients.filter(p => 
        (p.name && p.name.toLowerCase().includes(query)) || 
        (p.phone && p.phone.includes(query))
    );

    if (filtered.length === 0) {
        resultsContainer.innerHTML = `<div class="empty-state">${invLang.noPatient || 'لا يوجد مريض.'}</div>`;
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

async function selectPatientForInvoice(patient, element) {
    document.querySelectorAll('.patient-result-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    
    selectedPatient = patient;
    const isAr = (localStorage.getItem('preferredLang') || 'ar') === 'ar';
    if (window.showLoader) window.showLoader(isAr ? "جاري تجميع كشف الحساب..." : "Compiling statement...");

    try {
        const snap = await db.collection("Sessions")
            .where("patientId", "==", patient.id)
            .orderBy("date", "desc")
            .get();
        
        patientSessions = snap.docs.map(doc => doc.data());
        renderInvoice();
    } catch (e) {
        console.error(e);
        alert(isAr ? "خطأ في جلب بيانات الجلسات" : "Error fetching sessions data");
    } finally {
        if (window.hideLoader) window.hideLoader();
    }
}

// 🔴 4. رسم الفاتورة (مجهزة للغات والطباعة) 🔴
function renderInvoice() {
    const placeholder = document.getElementById('invoicePlaceholder');
    const content = document.getElementById('invoiceContent');
    const printArea = document.getElementById('actualPrintArea');
    
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

    const isAr = document.body.dir === 'rtl';
    const alignStr = isAr ? 'left' : 'right';

    const invoiceHTML = `
        <div class="bill-header">
            <div>
                <h1 style="margin:0; color:#0284c7;">NivaDent Clinic</h1>
                <p style="margin:5px 0; color:#64748b; font-weight:bold;">${invLang.invTitle}</p>
            </div>
            <div style="text-align: ${alignStr};">
                <p style="margin:0;">${invLang.invDate}: <strong>${new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</strong></p>
                <p style="margin:5px 0;">${invLang.invNo}: <strong dir="ltr">INV-${Math.floor(1000 + Math.random() * 9000)}</strong></p>
            </div>
        </div>

        <div class="patient-info-box" style="margin-bottom: 30px; display: flex; justify-content: space-between; background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
            <div>
                <span style="color: #64748b; font-size: 14px;">${invLang.invPatName}</span>
                <h2 style="margin: 5px 0; color: #0f172a;">${selectedPatient.name}</h2>
                <span dir="ltr">📞 ${selectedPatient.phone || '---'}</span>
            </div>
            <div class="invoice-qr" style="background: white; padding: 5px; border-radius: 8px; border: 1px solid #cbd5e1;"></div>
        </div>

        <table class="bill-table" dir="${isAr ? 'rtl' : 'ltr'}">
            <thead>
                <tr>
                    <th style="text-align: ${isAr ? 'right' : 'left'};">${invLang.thDate}</th>
                    <th style="text-align: ${isAr ? 'right' : 'left'};">${invLang.thProc}</th>
                    <th style="text-align: ${isAr ? 'right' : 'left'};">${invLang.thTotal}</th>
                    <th style="text-align: ${isAr ? 'right' : 'left'};">${invLang.thPaid}</th>
                    <th style="text-align: ${isAr ? 'right' : 'left'};">${invLang.thRem}</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
            </tbody>
        </table>

        <div class="bill-footer">
            <div class="total-box">
                <div class="total-row"><span>${invLang.totServ}:</span> <span>${totalBill} ${invLang.currency}</span></div>
                <div class="total-row"><span>${invLang.totPaid}:</span> <span style="color:#10b981;">${totalPaid} ${invLang.currency}</span></div>
                <div class="total-row final-debt" style="border-top:1px dashed #ffffff55; padding-top:10px; margin-top:10px; font-size:20px; font-weight:900;">
                    <span>${invLang.netDebt}:</span> <span>${totalDebt} ${invLang.currency}</span>
                </div>
            </div>
        </div>
        
        <div style="margin-top: 50px; text-align: center; border-top: 1px solid #eee; padding-top: 20px; color: #94a3b8; font-size: 12px;">
            ${invLang.footerMsg}
        </div>
    `;

    // حقن الفاتورة في العرض والطباعة
    content.innerHTML = invoiceHTML;
    printArea.innerHTML = invoiceHTML;

    const qrText = `ID:${selectedPatient.id} | Debt:${totalDebt}`;
    
    const displayQrContainer = content.querySelector('.invoice-qr');
    if(displayQrContainer) {
        displayQrContainer.innerHTML = '';
        new QRCode(displayQrContainer, { text: qrText, width: 80, height: 80, correctLevel : QRCode.CorrectLevel.L });
    }

    const printQrContainer = printArea.querySelector('.invoice-qr');
    if(printQrContainer) {
        printQrContainer.innerHTML = '';
        new QRCode(printQrContainer, { text: qrText, width: 80, height: 80, correctLevel : QRCode.CorrectLevel.L });
    }
}

window.onload = () => {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.body.dir = lang === 'en' ? 'ltr' : 'rtl';
    document.body.setAttribute('data-theme', localStorage.getItem('niva_theme') || 'light');
    
    updateLanguage(lang);
    
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            await loadBranchesDropdown();
            loadPatients();
        }
    });
};
