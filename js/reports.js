// js/reports.js
const db = firebase.firestore();
const clinicId = sessionStorage.getItem('clinicId');

let financeChart, servicesChart, methodsChart;
let currentReportData = {
    transactions: [],
    sessions: [],
    patients: []
};

// 🔴 1. الترجمة ودعم اللغات 🔴
function updatePageContent(lang) {
    const t = {
        ar: {
            title: "التقارير التحليلية", sub: "تحليل الأداء المالي، نمو المرضى، وإحصائيات العيادة الشاملة",
            btnExport: "📥 تصدير لإكسيل", btnPrint: "🖨️ طباعة التقرير", optAllBranches: "كل الفروع",
            chipMonth: "هذا الشهر", chipWeek: "هذا الأسبوع", chipYear: "هذه السنة", chipAll: "كل الوقت",
            lblTo: "إلى", btnUpdate: "تحديث 🔄",
            kpiInc: "إجمالي الدخل", kpiExp: "إجمالي المصروفات", kpiNet: "صافي الربح", kpiNewPat: "مرضى جدد",
            cFin: "📊 مخطط الإيرادات والمصروفات الزمني", cServ: "🩺 أكثر الخدمات (الإجراءات) طلباً",
            cMeth: "💳 تحليل طرق التحصيل", cTab: "📑 ملخص العمليات المالية في الفترة المختارة",
            thDate: "التاريخ", thCat: "التصنيف", thNote: "البيان", thAmount: "المبلغ", loadingTable: "جاري تجميع البيانات...",
            lInc: "إيرادات", lExp: "مصروفات", lCash: "نقدي", lWallet: "محافظ", lBank: "بنوك", unspec: "غير محدد"
        },
        en: {
            title: "Analytical Reports", sub: "Financial performance, patient growth, and overall statistics",
            btnExport: "📥 Export to Excel", btnPrint: "🖨️ Print Report", optAllBranches: "All Branches",
            chipMonth: "This Month", chipWeek: "This Week", chipYear: "This Year", chipAll: "All Time",
            lblTo: "To", btnUpdate: "Update 🔄",
            kpiInc: "Total Income", kpiExp: "Total Expenses", kpiNet: "Net Profit", kpiNewPat: "New Patients",
            cFin: "📊 Financial Timeline Chart", cServ: "🩺 Most Requested Services",
            cMeth: "💳 Payment Methods Analysis", cTab: "📑 Financial Transactions Summary",
            thDate: "Date", thCat: "Category", thNote: "Description", thAmount: "Amount", loadingTable: "Compiling data...",
            lInc: "Income", lExp: "Expenses", lCash: "Cash", lWallet: "Wallet", lBank: "Bank", unspec: "Unspecified"
        }
    };
    const c = t[lang] || t.ar;
    const setTxt = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };

    setTxt('txt-title', c.title); setTxt('txt-subtitle', c.sub);
    setTxt('btn-export', c.btnExport); setTxt('btn-print', c.btnPrint); 
    if(document.getElementById('opt-all-branches')) document.getElementById('opt-all-branches').innerText = c.optAllBranches;
    setTxt('chip-month', c.chipMonth); setTxt('chip-week', c.chipWeek); setTxt('chip-year', c.chipYear); setTxt('chip-all', c.chipAll);
    setTxt('lbl-to', c.lblTo); setTxt('btn-update', c.btnUpdate);
    setTxt('txt-kpi-income', c.kpiInc); setTxt('txt-kpi-expense', c.kpiExp); setTxt('txt-kpi-net', c.kpiNet); setTxt('txt-kpi-new-pat', c.kpiNewPat);
    setTxt('txt-chart-finance', c.cFin); setTxt('txt-chart-services', c.cServ); setTxt('txt-chart-methods', c.cMeth); setTxt('txt-chart-table', c.cTab);
    setTxt('th-date', c.thDate); setTxt('th-cat', c.thCat); setTxt('th-note', c.thNote); setTxt('th-amount', c.thAmount);
    setTxt('txt-loading-table', c.loadingTable);

    window.reportLang = c;
}

// 🔴 2. جلب الفروع لقائمة الفلتر 🔴
async function loadBranchesForFilter() {
    if (!clinicId) return;
    const select = document.getElementById('branch_filter');
    if (!select) return;
    
    db.collection("Branches").where("clinicId", "==", clinicId).onSnapshot(snap => {
        const currentVal = select.value;
        const isAr = document.body.dir === 'rtl';
        select.innerHTML = `<option value="all" id="opt-all-branches">${isAr ? 'كل الفروع' : 'All Branches'}</option>`;
        
        snap.forEach(doc => {
            const b = doc.data();
            select.innerHTML += `<option value="${doc.id}">${b.name}</option>`;
        });
        select.value = currentVal || 'all';
    });
}

// 🔴 3. إعدادات البداية والفلاتر 🔴
function setReportPeriod(period, element) {
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    if(element) element.classList.add('active');
    else {
        const chip = document.getElementById(`chip-${period}`);
        if(chip) chip.classList.add('active');
    }

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

// 🔴 4. جلب كل الداتا المطلوبة في وقت واحد 🔴
async function loadAllReportsData() {
    if (!clinicId) return;
    
    const dateFrom = document.getElementById('rep_date_from').value;
    const dateTo = document.getElementById('rep_date_to').value;
    
    const branchSelect = document.getElementById('branch_filter');
    const selectedBranch = branchSelect ? branchSelect.value : 'all';

    if (window.showLoader) window.showLoader("جاري إعداد التقارير...");

    try {
        // أ. جلب الحركات المالية
        const finSnap = await db.collection("Finances")
            .where("clinicId", "==", clinicId)
            .where("date", ">=", dateFrom)
            .where("date", "<=", dateTo)
            .get();
        
        currentReportData.transactions = finSnap.docs.map(doc => doc.data()).filter(t => selectedBranch === 'all' || t.branchId === selectedBranch);

        // ب. جلب الجلسات (لتحليل الإجراءات)
        const sessSnap = await db.collection("Sessions")
            .where("clinicId", "==", clinicId)
            .where("date", ">=", dateFrom)
            .where("date", "<=", dateTo)
            .get();
        
        currentReportData.sessions = sessSnap.docs.map(doc => doc.data()).filter(s => selectedBranch === 'all' || s.branchId === selectedBranch);

        // ج. جلب المرضى الجدد
        const patSnap = await db.collection("Patients")
            .where("clinicId", "==", clinicId)
            .get();
        
        currentReportData.patients = patSnap.docs.map(doc => doc.data()).filter(p => {
            if (selectedBranch !== 'all' && p.branchId && p.branchId !== selectedBranch) return false;
            if(!p.createdAt) return false;
            const pDate = p.createdAt.toDate().toISOString().split('T')[0];
            return pDate >= dateFrom && pDate <= dateTo;
        });

        // د. معالجة الداتا وعرضها
        calculateKPIs();
        renderFinanceChart();
        renderServicesChart();
        renderMethodsChart();
        renderDetailedTable();

    } catch (e) {
        console.error("Reports Error:", e);
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

// 🔴 5. رسم المخططات البيانية مع التحكم بالحجم والدارك مود 🔴
function getChartTextColor() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    return isDark ? '#cbd5e1' : '#475569';
}

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
    const lInc = window.reportLang ? window.reportLang.lInc : 'إيرادات';
    const lExp = window.reportLang ? window.reportLang.lExp : 'مصروفات';
    const textColor = getChartTextColor();
    
    financeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedLabels,
            datasets: [
                { label: lInc, data: sortedLabels.map(d => days[d].inc), borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.4 },
                { label: lExp, data: sortedLabels.map(d => days[d].exp), borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', fill: true, tension: 0.4 }
            ]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { legend: { position: 'top', labels: { color: textColor } } },
            scales: {
                x: { ticks: { color: textColor } },
                y: { ticks: { color: textColor } }
            }
        }
    });
}

function renderServicesChart() {
    const ctx = document.getElementById('servicesChart').getContext('2d');
    if (servicesChart) servicesChart.destroy();

    const counts = {};
    const unspec = window.reportLang ? window.reportLang.unspec : "غير محدد";
    currentReportData.sessions.forEach(s => {
        const proc = s.procedure || unspec;
        counts[proc] = (counts[proc] || 0) + 1;
    });

    const textColor = getChartTextColor();

    servicesChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(counts),
            datasets: [{
                data: Object.values(counts),
                backgroundColor: ['#0284c7', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'right', labels: { color: textColor } } }
        }
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

    const lCash = window.reportLang ? window.reportLang.lCash : 'نقدي';
    const lWallet = window.reportLang ? window.reportLang.lWallet : 'محافظ';
    const lBank = window.reportLang ? window.reportLang.lBank : 'بنوك';
    const textColor = getChartTextColor();

    methodsChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: [lCash, lWallet, lBank],
            datasets: [{
                data: [methods.cash, methods.wallet, methods.instapay],
                backgroundColor: ['#10b981', '#8b5cf6', '#0284c7']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: textColor } } }
        }
    });
}

function renderDetailedTable() {
    const tbody = document.getElementById('detailedReportBody');
    tbody.innerHTML = '';
    
    currentReportData.transactions.sort((a,b) => b.date.localeCompare(a.date));
    
    if (currentReportData.transactions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 15px; color: #64748b;">لا توجد حركات في هذه الفترة.</td></tr>`;
        return;
    }

    currentReportData.transactions.forEach(t => {
        const tr = document.createElement('tr');
        const color = t.type === 'income' ? '#10b981' : '#ef4444';
        const sign = t.type === 'income' ? '+' : '-';
        
        tr.innerHTML = `
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${t.date}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;"><strong>${t.category}</strong></td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${t.notes || '---'}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: ${color}; font-weight: bold;" dir="ltr">${sign} ${t.amount}</td>
        `;
        tbody.appendChild(tr);
    });
}

// 🔴 6. تصدير إكسيل 🔴
function exportReportToExcel() {
    const isAr = document.body.dir === 'rtl';
    const data = currentReportData.transactions.map(t => ({
        [isAr ? "التاريخ" : "Date"]: t.date,
        [isAr ? "النوع" : "Type"]: t.type === 'income' ? (isAr ? 'إيراد' : 'Income') : (isAr ? 'مصروف' : 'Expense'),
        [isAr ? "التصنيف" : "Category"]: t.category,
        [isAr ? "المبلغ" : "Amount"]: t.amount,
        [isAr ? "الفرع" : "Branch"]: t.branchId || (isAr ? 'الفرع الرئيسي' : 'Main Branch'),
        [isAr ? "البيان" : "Description"]: t.notes,
        [isAr ? "بواسطة" : "By"]: t.createdBy
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Financial Report");
    XLSX.writeFile(wb, `NivaDent_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// 🔴 7. الإقلاع الآمن (السر هنا) 🔴
window.onload = () => {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.body.dir = lang === 'en' ? 'ltr' : 'rtl';
    document.body.setAttribute('data-theme', localStorage.getItem('niva_theme') || 'light');
    
    updatePageContent(lang);
    loadBranchesForFilter();

    // ننتظر التحقق من صلاحية المستخدم أولاً قبل سحب البيانات!
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            setReportPeriod('month', document.getElementById('chip-month'));
        }
    });
};
