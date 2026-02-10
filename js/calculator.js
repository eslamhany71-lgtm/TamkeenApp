function calculateLoan() {
    // 1. جلب المدخلات
    const amount = parseFloat(document.getElementById('loanAmount').value);
    const months = parseInt(document.getElementById('loanMonths').value);
    const rate = parseFloat(document.getElementById('productType').value);

    if (isNaN(amount) || isNaN(months)) {
        alert("برجاء إدخال المبلغ والمدة بشكل صحيح");
        return;
    }

    // --- المعادلات ---
    
    // أ- الرسوم الإدارية (5%)
    const adminFees = amount * 0.05;

    // ب- إجمالي الفائدة (المبلغ * النسبة * (الشهور / 12))
    const totalInterest = amount * rate * (months / 12);

    // ج- إجمالي المبلغ بعد الفائدة
    const totalWithInterest = amount + totalInterest;

    // د- قيمة القسط الشهري
    const monthlyInstallment = totalWithInterest / months;

    // هـ- إجمالي الرسوم + أول قسط
    const feesPlusFirstInstallment = adminFees + monthlyInstallment;

    // و- إجمالي المبلغ بعد الفائدة + الرسوم الإدارية
    const grandTotalWithFees = totalWithInterest + adminFees;

    // ز- المبلغ النهائي بعد خصم الرسوم وأول قسط
    const finalAfterAll = amount - feesPlusFirstInstallment;

    // ح- المبلغ النهائي بعد خصم الرسوم الإدارية فقط
    const finalAfterAdminOnly = amount - adminFees;

    // --- عرض النتائج في الصفحة ---
    document.getElementById('results').style.display = 'block';
    
    document.getElementById('resAdmin').innerText = adminFees.toLocaleString() + " ج.م";
    document.getElementById('resMonthly').innerText = monthlyInstallment.toLocaleString(undefined, {maximumFractionDigits: 2}) + " ج.م";
    document.getElementById('resTotalWithInterest').innerText = totalWithInterest.toLocaleString() + " ج.م";
    document.getElementById('resFeesFirst').innerText = feesPlusFirstInstallment.toLocaleString() + " ج.م";
    document.getElementById('resInterestRate').innerText = (rate * 100).toFixed(2) + " %";
    document.getElementById('resGrandTotal').innerText = grandTotalWithFees.toLocaleString() + " ج.م";
    document.getElementById('resPureInterest').innerText = totalInterest.toLocaleString() + " ج.م";
    document.getElementById('resFinalNet').innerText = finalAfterAll.toLocaleString() + " ج.م";
    document.getElementById('resFinalAdminOnly').innerText = finalAfterAdminOnly.toLocaleString() + " ج.م";
}
