// js/reports.js
const db = firebase.firestore();

let financeChart, servicesChart, methodsChart;
let currentReportData = {
    transactions: [],
    sessions: [],
    patients: []
};
الترجمة 
// 🔴 1. دالة الترجمة 🔴
function updateLanguage(lang) {
    const translations = {
        ar: {
            title: "التقارير التحليلية", sub: "تحليل الأداء المالي، نمو المرضى، وإحصائيات العيادة الشاملة",
            exp: "📥 تصدير لإكسيل", print: "🖨️ طباعة التقرير", optAll: "الفرع الرئيسي (كل الفروع)",
            month: "هذا الشهر", week: "هذا الأسبوع", year: "هذه السنة", all: "كل الوقت",
            to: "إلى", update: "تحديث 🔄",
            inc: "إجمالي الدخل", expen: "إجمالي المصروفات", net: "صافي الربح", pat: "مرضى جدد",
            c1: "📊 مخطط الإيرادات والمصروفات الزمني", c2: "🩺 أكثر الخدمات (الإجراءات) طلباً",
            c3: "💳 تحليل طرق التحصيل", c4: "📑 ملخص العمليات المالية في الفترة المختارة",
            thD: "التاريخ", thC: "التصنيف", thN: "البيان", thA: "المبلغ", load: "جاري تجميع البيانات...",
            lInc: "إيرادات", lExp: "مصروفات", lCash: "نقدي", lWallet: "محافظ", lBank: "بنوك", unspec: "غير محدد", noData: "لا توجد حركات."
        },
        en: {
            title: "Analytical Reports", sub: "Financial performance and patient growth statistics",
            exp: "📥 Export Excel", print: "🖨️ Print Report", optAll: "Main Branch (All)",
            month: "This Month", week: "This Week", year: "This Year", all: "All Time",
            to: "To", update: "Update 🔄",
            inc: "Total Income", expen: "Total Expenses", net: "Net Profit", pat: "New Patients",
            c1: "📊 Financial Timeline Chart", c2: "🩺 Most Requested Services",
            c3: "💳 Payment Methods", c4: "📑 Transactions Summary",
            thD: "Date", thC: "Category", thN: "Notes", thA: "Amount", load: "Compiling data...",
            lInc: "Income", lExp: "Expense", lCash: "Cash", lWallet: "Wallet", lBank: "Bank", unspec: "Unspecified", noData: "No data found."
        }
    };
    
    reportLang = translations[lang] || translations.ar;
    const set = (id, txt) => { const el = document.getElementById(id); if(el) el.innerText = txt; };

    set('txt-title', reportLang.title); set('txt-subtitle', reportLang.sub);
    set('btn-export', reportLang.exp); set('btn-print', reportLang.print);
    set('opt-all', reportLang.optAll); set('chip-month', reportLang.month);
    set('chip-week', reportLang.week); set('chip-year', reportLang.year); set('chip-all', reportLang.all);
    set('lbl-to', reportLang.to); set('btn-update', reportLang.update);
    set('txt-kpi-inc', reportLang.inc); set('txt-kpi-exp', reportLang.expen);
    set('txt-kpi-net', reportLang.net); set('txt-kpi-pat', reportLang.pat);
    set('c-title-1', reportLang.c1); set('c-title-2', reportLang.c2);
    set('c-title-3', reportLang.c3); set('c-title-4', reportLang.c4);
    set('th-d', reportLang.thD); set('th-c', reportLang.thC);
    set('th-n', reportLang.thN); set('th-a', reportLang.thA);
}


// 🔴 2. جلب الفروع 🔴
async function loadBranchesDropdown() {
    const cid = sessionStorage.getItem('clinicId');
    const select = document.getElementById('branch_filter');
    if (!cid || !select) return;

    db.collection("Branches").where("clinicId", "==", cid).get().then(snap => {
        snap.forEach(doc => {
            select.innerHTML += `<option value="${doc.id}">${doc.data().name}</option>`;
        });
    });
}

// 🔴 1. إعدادات البداية والفلاتر 🔴
function setReportPeriod(period, element) {
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    if(element) element.classList.add('active');

    const today = new Date();
    let fromDate = new Date();
    
    if (period === 'month') {
        fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (period === 'week') {
        fromDate.setDate(today.getDate() - 7);
    } else if (period === 'year') {
        fromDate = new Date(today.getFullYear(), 0, 1);
    } else if (period === 'all') {
        fromDate = new Date(2020, 0, 1);
    }

    document.getElementById('rep_date_from').value = fromDate.toISOString().split('T')[0];
    document.getElementById('rep_date_to').value = today.toISOString().split('T')[0];
    
    loadAllReportsData();
}

// 🔴 2. جلب الداتا (بنظام التتبع البصري لكشف العطل) 🔴
async function loadAllReportsData() {
    const tbody = document.getElementById('detailedReportBody');
    
    // سحب الـ clinicId في نفس لحظة الجلب
    const currentClinicId = sessionStorage.getItem('clinicId');
    
    if (!currentClinicId) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: red; font-weight: bold;">خطأ: الـ clinicId مفقود! يرجى تسجيل الدخول من جديد.</td></tr>`;
        return;
    }
    
    const dateFrom = document.getElementById('rep_date_from').value;
    const dateTo = document.getElementById('rep_date_to').value;

    if (window.showLoader) window.showLoader("جاري إعداد التقارير...");
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #0284c7;">1. جاري سحب الحركات المالية...</td></tr>`;

    try {
        // أ. جلب الحركات المالية
        const finSnap = await db.collection("Finances")
            .where("clinicId", "==", currentClinicId)
            .where("date", ">=", dateFrom)
            .where("date", "<=", dateTo)
            .get();
        
        currentReportData.transactions = finSnap.docs.map(doc => doc.data());
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #0284c7;">2. جاري سحب الجلسات الطبية...</td></tr>`;

        // ب. جلب الجلسات
        const sessSnap = await db.collection("Sessions")
            .where("clinicId", "==", currentClinicId)
            .where("date", ">=", dateFrom)
            .where("date", "<=", dateTo)
            .get();
        
        currentReportData.sessions = sessSnap.docs.map(doc => doc.data());
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #0284c7;">3. جاري سحب ملفات المرضى...</td></tr>`;

        // ج. جلب المرضى 
        const patSnap = await db.collection("Patients")
            .where("clinicId", "==", currentClinicId)
            .get(); 
        
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #0284c7;">4. جاري فلترة المرضى بالتواريخ...</td></tr>`;
        
        currentReportData.patients = patSnap.docs.map(doc => doc.data()).filter(p => {
            if(!p.createdAt) return false;
            try {
                const pDate = p.createdAt.toDate().toISOString().split('T')[0];
                return pDate >= dateFrom && pDate <= dateTo;
            } catch(error) {
                // لو فيه مريض تاريخه بايظ، هيتجاهله بدل ما يوقف السيستم
                return false; 
            }
        });

        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #0284c7;">5. جاري رسم المخططات والجدول...</td></tr>`;

        // 🔴 3. معالجة الداتا وعرضها 🔴
        calculateKPIs();
        renderFinanceChart();
        renderServicesChart();
        renderMethodsChart();
        renderDetailedTable();

    } catch (e) {
        console.error("Reports Error:", e);
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: red; font-weight: bold;">حدث خطأ: ${e.message}</td></tr>`;
    } finally {
        if (window.hideLoader) window.hideLoader();
    }
}

function calculateKPIs() {
    let income = 0, expense = 0;
    currentReportData.transactions.forEach(t => {
        if (t.type === 'income') income += Number(t.amount);
        else if (t.type === 'expense') expense += Number(t.amount);
    });

    document.getElementById('rep-income').innerText = income.toLocaleString();
    document.getElementById('rep-expense').innerText = expense.toLocaleString();
    document.getElementById('rep-net').innerText = (income - expense).toLocaleString();
    document.getElementById('rep-new-patients').innerText = currentReportData.patients.length;
}

// 🔴 4. رسم المخططات البيانية (متصغرة عشان متفرش في الشاشة) 🔴
function renderFinanceChart() {
    const ctx = document.getElementById('financeChart').getContext('2d');
    if (financeChart) financeChart.destroy();

    const days = {};
    currentReportData.transactions.forEach(t => {
        if (!days[t.date]) days[t.date] = { inc: 0, exp: 0 };
        if (t.type === 'income') days[t.date].inc += Number(t.amount);
        else days[t.date].exp += Number(t.amount);
    });

    const sortedLabels = Object.keys(days).sort();
    
    financeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedLabels,
            datasets: [
                { label: 'إيرادات', data: sortedLabels.map(d => days[d].inc), borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.4 },
                { label: 'مصروفات', data: sortedLabels.map(d => days[d].exp), borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', fill: true, tension: 0.4 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } } }
    });
}

function renderServicesChart() {
    const ctx = document.getElementById('servicesChart').getContext('2d');
    if (servicesChart) servicesChart.destroy();

    const counts = {};
    currentReportData.sessions.forEach(s => {
        const proc = s.procedure || "غير محدد";
        counts[proc] = (counts[proc] || 0) + 1;
    });

    servicesChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(counts),
            datasets: [{
                data: Object.values(counts),
                backgroundColor: ['#0284c7', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderMethodsChart() {
    const ctx = document.getElementById('methodsChart').getContext('2d');
    if (methodsChart) methodsChart.destroy();

    const methods = { 'cash': 0, 'wallet': 0, 'instapay': 0 };
    currentReportData.transactions.forEach(t => {
        if(t.type === 'income') {
            const m = t.paymentMethod || 'cash';
            methods[m] = (methods[m] || 0) + Number(t.amount);
        }
    });

    methodsChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['نقدي', 'محافظ', 'بنوك'],
            datasets: [{
                data: [methods.cash, methods.wallet, methods.instapay],
                backgroundColor: ['#10b981', '#8b5cf6', '#0284c7']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderDetailedTable() {
    const tbody = document.getElementById('detailedReportBody');
    tbody.innerHTML = '';
    
    currentReportData.transactions.sort((a,b) => b.date.localeCompare(a.date));
    
    if(currentReportData.transactions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center;">لا توجد حركات مالية في هذه الفترة.</td></tr>`;
        return;
    }

    currentReportData.transactions.forEach(t => {
        const tr = document.createElement('tr');
        const color = t.type === 'income' ? '#10b981' : '#ef4444';
        const sign = t.type === 'income' ? '+' : '-';
        
        tr.innerHTML = `
            <td>${t.date}</td>
            <td><strong>${t.category}</strong></td>
            <td>${t.notes || '---'}</td>
            <td style="color: ${color}; font-weight: bold;" dir="ltr">${sign} ${t.amount}</td>
        `;
        tbody.appendChild(tr);
    });
}

// 🔴 تصدير إكسيل 🔴
function exportReportToExcel() {
    const data = currentReportData.transactions.map(t => ({
        "التاريخ": t.date,
        "النوع": t.type === 'income' ? 'إيراد' : 'مصروف',
        "التصنيف": t.category,
        "المبلغ": t.amount,
        "طريقة الدفع": t.paymentMethod,
        "البيان": t.notes,
        "بواسطة": t.createdBy
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Financial Report");
    XLSX.writeFile(wb, `NivaDent_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
}

window.onload = () => {
    // تشغيل التقرير فقط بعد التأكد من تسجيل الدخول
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            setReportPeriod('month', document.querySelector('.filter-chip.active')); 
        } else {
            document.getElementById('detailedReportBody').innerHTML = `<tr><td colspan="4" style="text-align: center; color: red;">الرجاء تسجيل الدخول أولاً</td></tr>`;
        }
    });
};
