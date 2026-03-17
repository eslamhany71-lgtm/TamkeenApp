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
    const adminFees = amount * 0.05; 
    const totalInterest = amount * rate * (months / 12); 
    const totalWithInterest = amount + totalInterest; 
    const monthlyInstallment = totalWithInterest / months; 
    const feesPlusFirstInstallment = adminFees + monthlyInstallment; 
    const grandTotalWithFees = totalWithInterest + adminFees; 
    const finalAfterAll = amount - feesPlusFirstInstallment; 
    const finalAfterAdminOnly = amount - adminFees; 

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

function updatePageContent(lang) {
    const trans = {
        ar: {
            title: "حاسبة القروض - تمكين",
            header: "حاسبة القروض الذكية",
            sub: "اختر نوع المنتج وأدخل البيانات للحصول على الحسبة الدقيقة",
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
            header: "Smart Loan Calculator",
            sub: "Select product type and enter details to get precise calculation",
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

    const t = trans[lang] || trans.ar;
    document.title = t.title;
    
    // دالة مساعدة لتحديث النصوص بدون أخطاء لو العنصر مش موجود
    const setTxt = (id, txt) => {
        const el = document.getElementById(id);
        if (el) el.innerText = txt;
    };

    // لاحظ إني شيلت سطر ترجمة زرار الرجوع لأنه مبقاش موجود
    setTxt('txt-header-title', t.header);
    setTxt('txt-subtitle', t.sub);
    setTxt('txt-input-data', t.input);
    setTxt('lbl-amount', t.amount);
    setTxt('lbl-months', t.months);
    setTxt('lbl-product', t.product);
    setTxt('btn-calc', t.calc);
    setTxt('btn-reset', t.reset);
    setTxt('txt-results-title', t.resTitle);
    
    setTxt('txt-resMonthly', t.r1);
    setTxt('txt-resAdmin', t.r2);
    setTxt('txt-resPureInterest', t.r3);
    setTxt('txt-resTotalWithInterest', t.r4);
    setTxt('txt-resFeesFirst', t.r5);
    setTxt('txt-resInterestRate', t.r6);
    setTxt('txt-resGrandTotal', t.r7);
    setTxt('txt-resFinalNet', t.r8);
    setTxt('txt-resFinalAdminOnly', t.r9);
}

window.onload = () => {
    const savedLang = localStorage.getItem('preferredLang') || 'ar';
    document.body.dir = savedLang === 'en' ? 'ltr' : 'rtl';
    updatePageContent(savedLang);
};
