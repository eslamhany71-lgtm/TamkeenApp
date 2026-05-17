// js/invoices.js
const db = firebase.firestore();
const clinicId = sessionStorage.getItem('clinicId');
const userRole = sessionStorage.getItem('userRole'); // 🔴 جلب الوظيفة
const userBranch = sessionStorage.getItem('branchId') || 'main'; // 🔴 جلب الفرع

let allPatients = [];
let selectedPatient = null;
let patientSessions = [];
let clinicSettings = null; // 🔴 مخزن إعدادات العيادة لقراءة السجل والاسم والتفاصيل

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

// 🔴 دالة جلب إعدادات العيادة من جدول Settings لطباعتها رسميًا 🔴
async function loadClinicSettings() {
    if (!clinicId) return;
    try {
        const doc = await db.collection("Settings").doc(clinicId).get();
        if (doc.exists) {
            clinicSettings = doc.data();
        } else {
            // محاولة جلب من كوليكشن Clinics كخيار بديل
            const clinicDoc = await db.collection("Clinics").doc(clinicId).get();
            if (clinicDoc.exists) clinicSettings = clinicDoc.data();
        }
    } catch (e) {
        console.error("خطأ أثناء جلب إعدادات العيادة للطباعة:", e);
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

    // قراءة البيانات الديناميكية من صفحة الإعدادات المحفوظة بالفايربيز
    const clinicName = clinicSettings?.clinicName || clinicSettings?.name || "NivaDent Clinic";
    const commercialRegister = clinicSettings?.commercialRegister || clinicSettings?.commercialNo || "";
    const taxCard = clinicSettings?.taxCard || clinicSettings?.taxNo || "";
    const clinicPhone = clinicSettings?.phone || clinicSettings?.clinicPhone || "";
    const clinicAddress = clinicSettings?.address || "";

    // بناء الهيدر بناء على البيانات الموجودة في صفحة الإعدادات
    let settingsDetailsHtml = '';
    if (isAr) {
        if (commercialRegister) settingsDetailsHtml += `<p style="margin:2px 0; font-size:13px; color:#64748b;">سجل تجاري: <strong>${commercialRegister}</strong></p>`;
        if (taxCard) settingsDetailsHtml += `<p style="margin:2px 0; font-size:13px; color:#64748b;">بطاقة ضريبية: <strong>${taxCard}</strong></p>`;
        if (clinicPhone) settingsDetailsHtml += `<p style="margin:2px 0; font-size:13px; color:#64748b;">تليفون: <strong>${clinicPhone}</strong></p>`;
        if (clinicAddress) settingsDetailsHtml += `<p style="margin:2px 0; font-size:13px; color:#64748b;">العنوان: <strong>${clinicAddress}</strong></p>`;
    } else {
        if (commercialRegister) settingsDetailsHtml += `<p style="margin:2px 0; font-size:13px; color:#64748b;">CR No: <strong>${commercialRegister}</strong></p>`;
        if (taxCard) settingsDetailsHtml += `<p style="margin:2px 0; font-size:13px; color:#64748b;">Tax Card: <strong>${taxCard}</strong></p>`;
        if (clinicPhone) settingsDetailsHtml += `<p style="margin:2px 0; font-size:13px; color:#64748b;">Tel: <strong>${clinicPhone}</strong></p>`;
        if (clinicAddress) settingsDetailsHtml += `<p style="margin:2px 0; font-size:13px; color:#64748b;">Address: <strong>${clinicAddress}</strong></p>`;
    }

    const invoiceHTML = `
        <style>
            .bill-table {
                width: 100% !important;
                max-width: 100% !important;
                border-collapse: collapse !important;
                margin-top: 20px;
                table-layout: auto !important; /* ملائمة تلقائية للمسافات */
            }
            .bill-table th, .bill-table td {
                border: 1px solid #e2e8f0 !important;
                padding: 10px 12px !important;
                font-size: 14px !important;
                word-break: break-word !important; /* منع خروج الكلمات برا العمود */
            }
            @media print {
                @page {
                    size: A4;
                    margin: 15mm 12mm 15mm 12mm; /* هوامش متناسقة لورق A4 */
                }
                body {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    background: #fff !important;
                    color: #000 !important;
                }
                #actualPrintArea {
                    width: 100% !important;
                    max-width: 100% !important;
                    padding: 0 !important;
                    margin: 0 !important;
                }
                .bill-table th, .bill-table td {
                    padding: 6px 8px !important; /* تضييق المسافات تلقائيًا عند الطباعة */
                    font-size: 12px !important;
                }
                .total-box {
                    width: 100% !important;
                    max-width: 320px !important;
                    margin-top: 15px !important;
                }
            }
        </style>

        <div class="bill-header" style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px;">
            <div>
                <h1 style="margin:0; color:#0284c7; font-size: 28px; font-weight: 800;">${clinicName}</h1>
                <p style="margin:5px 0 2px 0; color:#0f172a; font-weight:bold; font-size: 15px;">${invLang.invTitle}</p>
                ${settingsDetailsHtml}
            </div>
            <div style="text-align: ${alignStr}; min-width: 180px;">
                <p style="margin:0; font-size:14px;">${invLang.invDate}: <strong>${new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</strong></p>
                <p style="margin:5px 0; font-size:14px;">${invLang.invNo}: <strong dir="ltr" style="color:#0284c7;">INV-${Math.floor(1000 + Math.random() * 9000)}</strong></p>
            </div>
        </div>

        <div class="patient-info-box" style="margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 18px; border-radius: 12px; border: 1px solid #e2e8f0;">
            <div>
                <span style="color: #64748b; font-size: 13px; font-weight: bold;">${invLang.invPatName}</span>
                <h2 style="margin: 5px 0; color: #0f172a; font-size: 20px; font-weight: 700;">${selectedPatient.name}</h2>
                <span dir="ltr" style="font-weight: 600; color: #334155;">📞 ${selectedPatient.phone || '---'}</span>
            </div>
            <div class="invoice-qr" style="background: white; padding: 6px; border-radius: 8px; border: 1px solid #cbd5e1; display: inline-block;"></div>
        </div>

        <table class="bill-table" dir="${isAr ? 'rtl' : 'ltr'}">
            <thead>
                <tr style="background-color: #f1f5f9;">
                    <th style="text-align: ${isAr ? 'right' : 'left'}; color: #334155; font-weight: 700;">${invLang.thDate}</th>
                    <th style="text-align: ${isAr ? 'right' : 'left'}; color: #334155; font-weight: 700;">${invLang.thProc}</th>
                    <th style="text-align: ${isAr ? 'right' : 'left'}; color: #334155; font-weight: 700;">${invLang.thTotal}</th>
                    <th style="text-align: ${isAr ? 'right' : 'left'}; color: #334155; font-weight: 700;">${invLang.thPaid}</th>
                    <th style="text-align: ${isAr ? 'right' : 'left'}; color: #334155; font-weight: 700;">${invLang.thRem}</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
            </tbody>
        </table>

        <div class="bill-footer" style="display: flex; justify-content: flex-end; margin-top: 20px;">
            <div class="total-box" style="background: #0f172a; color: white; padding: 15px; border-radius: 12px; min-width: 280px;">
                <div class="total-row" style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;"><span>${invLang.totServ}:</span> <span>${totalBill} ${invLang.currency}</span></div>
                <div class="total-row" style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;"><span>${invLang.totPaid}:</span> <span style="color:#10b981; font-weight: bold;">${totalPaid} ${invLang.currency}</span></div>
                <div class="total-row final-debt" style="display: flex; justify-content: space-between; border-top:1px dashed #ffffff55; padding-top:10px; margin-top:10px; font-size:18px; font-weight:900;">
                    <span>${invLang.netDebt}:</span> <span style="color:#f43f5e;">${totalDebt} ${invLang.currency}</span>
                </div>
            </div>
        </div>
        
        <div style="margin-top: 40px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px; color: #94a3b8; font-size: 12px; font-weight: 500;">
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
            await loadClinicSettings(); // 🔴 جلب الإعدادات أولًا لتجهيز داتا الطباعة
            await loadBranchesDropdown();
            loadPatients();
        }
    });
};
