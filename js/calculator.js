// calculator.js - Enterprise Edition

function calculateLoan() {
    const amount = parseFloat(document.getElementById('loan-amount').value);
    const interestRate = parseFloat(document.getElementById('loan-interest').value);
    const months = parseInt(document.getElementById('loan-months').value);

    const lang = localStorage.getItem('preferredLang') || 'ar';

    if (isNaN(amount) || isNaN(interestRate) || isNaN(months) || amount <= 0 || interestRate < 0 || months <= 0) {
        alert(lang === 'ar' ? "يرجى إدخال بيانات صحيحة بجميع الحقول" : "Please enter valid data in all fields");
        return;
    }

    // Calculation Logic
    const totalInterest = amount * (interestRate / 100) * (months / 12);
    const totalAmount = amount + totalInterest;
    const monthlyPayment = totalAmount / months;

    // Display formatting
    const currency = lang === 'en' ? 'EGP' : 'ج.م';
    
    document.getElementById('res-monthly').innerText = monthlyPayment.toFixed(2) + ' ' + currency;
    document.getElementById('res-total-interest').innerText = totalInterest.toFixed(2) + ' ' + currency;
    document.getElementById('res-total').innerText = totalAmount.toFixed(2) + ' ' + currency;

    // Show result box
    document.getElementById('result-box').style.display = 'block';
}

// Translation logic
function updatePageContent(lang) {
    const t = {
        ar: {
            title: "حاسبة القروض والتمويل",
            sub: "قم بإدخال بيانات القرض لحساب القسط الشهري والفوائد",
            amount: "مبلغ القرض",
            interest: "نسبة الفائدة السنوية (%)",
            months: "مدة السداد (بالأشهر)",
            btnCalc: "احسب الآن",
            resTitle: "نتيجة الحساب",
            resMonthly: "القسط الشهري",
            resTotalInterest: "إجمالي الفوائد",
            resTotal: "الإجمالي الكلي (شامل الفوائد)"
        },
        en: {
            title: "Loan Calculator",
            sub: "Enter loan details to calculate monthly installments and interest",
            amount: "Loan Amount",
            interest: "Annual Interest Rate (%)",
            months: "Repayment Period (Months)",
            btnCalc: "Calculate Now",
            resTitle: "Calculation Result",
            resMonthly: "Monthly Installment",
            resTotalInterest: "Total Interest",
            resTotal: "Grand Total (incl. Interest)"
        }
    };

    const c = t[lang] || t.ar;
    
    document.body.dir = lang === 'en' ? 'ltr' : 'rtl';

    const setTxt = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };

    setTxt('txt-calc-title', c.title);
    setTxt('txt-calc-sub', c.sub);
    setTxt('lbl-amount', c.amount);
    setTxt('lbl-interest', c.interest);
    setTxt('lbl-months', c.months);
    setTxt('btn-calc', c.btnCalc);
    setTxt('txt-result-title', c.resTitle);
    setTxt('lbl-res-monthly', c.resMonthly);
    setTxt('lbl-res-total-interest', c.resTotalInterest);
    setTxt('lbl-res-total', c.resTotal);
    
    // إعادة الحساب عشان علامة العملة (EGP / ج.م) تتحدث لو العميل مغير اللغة والنتيجة مفتوحة
    if (document.getElementById('result-box').style.display === 'block') {
        calculateLoan();
    }
}

// Load on start
window.onload = () => {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    updatePageContent(lang);
};
