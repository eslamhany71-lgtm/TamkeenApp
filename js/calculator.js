// calculator.js - حاسبة القروض الدقيقة مع نظام اللغات

function calculateLoan() {
    const amount = parseFloat(document.getElementById('loanAmount').value);
    const months = parseInt(document.getElementById('loanMonths').value);
    const rate = parseFloat(document.getElementById('productType').value);
    const lang = localStorage.getItem('preferredLang') || 'ar';

    if (isNaN(amount) || isNaN(months) || amount <= 0 || months <= 0) {
        alert(lang === 'ar' ? "برجاء إدخال المبلغ والمدة بشكل صحيح" : "Please enter valid amount and duration");
        return;
    }

    // --- المعادلات الحسابية الخاصة بك ---
    const adminFees = amount * 0.05; // الرسوم الإدارية
    const totalInterest = amount * rate * (months / 12); // إجمالي الفائدة
    const totalWithInterest = amount + totalInterest; // إجمالي المبلغ بعد الفائدة
    const monthlyInstallment = totalWithInterest / months; // القسط الشهري
    const feesPlusFirstInstallment = adminFees + monthlyInstallment; // الرسوم + أول قسط
    const grandTotalWithFees = totalWithInterest + adminFees; // الإجمالي بالفائدة والرسوم
    const finalAfterAll = amount - feesPlusFirstInstallment; // المستلم بعد الكل
    const finalAfterAdminOnly = amount - adminFees; // المستلم بعد الرسوم فقط

    // --- عرض النتائج مع تنسيق الأرقام ---
    const currency = lang === 'ar' ? " ج.م" : " EGP";
    document.getElementById('results').style.display = 'block';

    setRes('resAdmin', adminFees, currency);
    setRes('resMonthly', monthlyInstallment, currency);
    setRes('resTotalWithInterest', totalWithInterest, currency);
    setRes('resFeesFirst', feesPlusFirstInstallment, currency);
    setRes('resGrandTotal', grandTotalWithFees, currency);
    setRes('resPureInterest', totalInterest, currency);
    setRes('resFinalNet', finalAfterAll, currency);
    setRes('resFinalAdminOnly', finalAfterAdminOnly, currency);
    document.getElementById('resInterestRate').innerText = (rate * 100).toFixed(2) + " %";
}

function setRes(id, value, symbol) {
    document.getElementById(id).innerText = value.toLocaleString(undefined, {maximumFractionDigits: 2}) + symbol;
}

function resetCalculator() {
    document.getElementById('loanAmount').value = '';
    document.getElementById('loanMonths').value = '';
    document.getElementById('results').style.display = 'none';
}

// نظام الترجمة الشامل لصفحة الحاسبة
function updatePageContent(lang) {
    const trans = {
        ar: {
            title: "حاسبة القروض - تمكين",
            back: "رجوع",
            header: "حاسبة القروض الذكية",
            input: "بيانات التمويل",
            amount: "مبلغ التمويل",
            months: "المدة (بالشهور)",
            product: "نوع المنتج",
            calc: "احسب الآن",
            reset: "إعادة",
            resTitle: "نتائج الحسبة الدقيقة",
            r1: "قيمة القسط الشهري",
            r2: "الرسوم الإدارية (5%)",
            r3: "إجمالي الفائدة فقط",
            r4: "المبلغ بعد الفائدة",
            r5: "الرسوم + أول قسط",
            r6: "نسبة الفائدة السنوية",
            r7: "الإجمالي (فائدة + رسوم)",
            r8: "المستلم (بعد الرسوم والقسط)",
            r9: "المستلم (بعد الرسوم فقط)"
        },
        en: {
            title: "Loan Calculator - Tamkeen",
            back: "Back",
            header: "Smart Loan Calculator",
            input: "Loan Details",
            amount: "Loan Amount",
            months: "Duration (Months)",
            product: "Product Type",
            calc: "Calculate",
            reset: "Reset",
            resTitle: "Detailed Results",
            r1: "Monthly Installment",
            r2: "Admin Fees (5%)",
            r3: "Pure Interest",
            r4: "Total with Interest",
            r5: "Fees + 1st Installment",
            r6: "Annual Interest Rate",
            r7: "Grand Total (Int+Fees)",
            r8: "Net (After Fees & 1st Inst)",
            r9: "Net (After Admin Fees Only)"
        }
    };

    const t = trans[lang];
    document.title = t.title;
    document.getElementById('txt-back').innerText = t.back;
    document.getElementById('txt-header-title').innerText = t.header;
    document.getElementById('txt-input-data').innerText = t.input;
    document.getElementById('lbl-amount').innerText = t.amount;
    document.getElementById('lbl-months').innerText = t.months;
    document.getElementById('lbl-product').innerText = t.product;
    document.getElementById('btn-calc').innerText = t.calc;
    document.getElementById('btn-reset').innerText = t.reset;
    document.getElementById('txt-results-title').innerText = t.resTitle;
    
    // ترجمة تسميات النتائج الـ 9
    document.getElementById('txt-resMonthly').innerText = t.r1;
    document.getElementById('txt-resAdmin').innerText = t.r2;
    document.getElementById('txt-resPureInterest').innerText = t.r3;
    document.getElementById('txt-resTotalWithInterest').innerText = t.r4;
    document.getElementById('txt-resFeesFirst').innerText = t.r5;
    document.getElementById('txt-resInterestRate').innerText = t.r6;
    document.getElementById('txt-resGrandTotal').innerText = t.r7;
    document.getElementById('txt-resFinalNet').innerText = t.r8;
    document.getElementById('txt-resFinalAdminOnly').innerText = t.r9;
}

window.onload = () => {
    const savedLang = localStorage.getItem('preferredLang') || 'ar';
    updatePageContent(savedLang);
};
