function calculateLoan() {
    const amount = parseFloat(document.getElementById('amount').value);
    const months = parseInt(document.getElementById('months').value);
    const productRate = parseFloat(document.getElementById('product').value);

    if (!amount || !months) { alert("برجاء إدخال البيانات"); return; }

    // 1. الرسوم الإدارية (5%)
    const adminFees = amount * 0.05;
    
    // 2. الفائدة الإجمالية (المبلغ * الفائدة * (الشهور/12))
    const totalInterest = amount * productRate * (months / 12);
    
    // 3. إجمالي المبلغ بعد الفائدة
    const totalWithInterest = amount + totalInterest;
    
    // 4. قيمة القسط الشهري
    const monthlyInstallment = totalWithInterest / months;
    
    // 5. إجمالي الرسوم + أول قسط
    const feesPlusFirstInstallment = adminFees + monthlyInstallment;
    
    // 6. إجمالي المبلغ بعد الفائدة + الرسوم
    const grandTotal = totalWithInterest + adminFees;
    
    // 7. المبلغ النهائي بعد الرسوم وأول قسط (المبلغ المستلم صافي)
    const netAmount = amount - feesPlusFirstInstallment;

    // 8. المبلغ النهائي بعد الرسوم فقط
    const netAfterFeesOnly = amount - adminFees;

    // عرض النتائج في الصفحة
    document.getElementById('res_admin').innerText = adminFees.toFixed(2);
    document.getElementById('res_monthly').innerText = monthlyInstallment.toFixed(2);
    document.getElementById('res_total').innerText = totalWithInterest.toFixed(2);
    document.getElementById('res_interest_val').innerText = totalInterest.toFixed(2);
    document.getElementById('res_grand_total').innerText = grandTotal.toFixed(2);
}
