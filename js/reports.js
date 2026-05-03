// js/reports.js
const db = firebase.firestore();
const clinicId = sessionStorage.getItem('clinicId');

let financeChart, servicesChart, methodsChart;
let currentReportData = {
    transactions: [],
    sessions: [],
    patients: []
};

// 🔴 1. دالة الترجمة اللي كانت ناقصة 🔴
function updatePageContent(lang) {
    const t = {
        ar: {
            title: "التقارير التحليلية", sub: "تحليل الأداء المالي، نمو المرضى، وإحصائيات العيادة الشاملة",
            btnExport: "📥 تصدير لإكسيل", btnPrint: "🖨️ طباعة التقرير", optAllBranches: "كل الفروع (الرئيسي)",
            chipMonth: "هذا الشهر", chipWeek: "هذا الأسبوع", chipYear: "هذه السنة", chipAll: "كل الوقت",
            lblTo: "إلى", btnUpdate: "تحديث 🔄",
            kpiInc: "إجمالي الدخل", kpiExp: "إجمالي المصروفات", kpiNet: "صافي الربح", kpiNewPat: "مرضى جدد",
            cFin: "📊 مخطط الإيرادات والمصروفات الزمني", cServ: "🩺 أكثر الخدمات (الإجراءات) طلباً",
            cMeth: "💳 تحليل طرق التحصيل", cTab: "📑 ملخص العمليات المالية في الفترة المختارة",
            thDate: "التاريخ", thCat: "التصنيف", thNote: "البيان", thAmount: "المبلغ", loadingTable: "جاري تجميع البيانات...",
            lInc: "إيرادات", lExp: "مصروفات", lCash: "نقدي", lWallet: "محافظ", lBank: "بنوك", unspec: "غير محدد", noData: "لا توجد حركات مالية."
        },
        en: {
            title: "Analytical Reports", sub: "Financial performance, patient growth, and overall statistics",
            btnExport: "📥 Export to Excel", btnPrint: "🖨️ Print Report", optAllBranches: "All Branches (Main)",
            chipMonth: "This Month", chipWeek: "This Week", chipYear: "This Year", chipAll: "All Time",
            lblTo: "To", btnUpdate: "Update 🔄",
            kpiInc: "Total Income", kpiExp: "Total Expenses", kpiNet: "Net Profit", kpiNewPat: "New Patients",
            cFin: "📊 Financial Timeline Chart", cServ: "🩺 Most Requested Services",
            cMeth: "💳 Payment Methods Analysis", cTab: "📑 Financial Transactions Summary",
            thDate: "Date", thCat: "Category", thNote: "Description", thAmount: "Amount", loadingTable: "Compiling data...",
            lInc: "Income", lExp: "Expenses", lCash: "Cash", lWallet: "Wallet", lBank: "Bank", unspec: "Unspecified", noData: "No transactions found."
        }
    };
    const c = t[lang] || t.ar;
    const setTxt = (id, txt) => { const el = document.getElementById(id); if(el) el.innerText = txt; };

    setTxt('txt-title', c.title); setTxt('txt-subtitle', c.sub);
    setTxt('btn-export', c.btnExport); setTxt('btn-print', c.btnPrint); 
    if(document.getElementById('opt-all')) document.getElementById('opt-all').innerText = c.optAllBranches;
    setTxt('chip-month', c.chipMonth); setTxt('chip-week', c.chipWeek); setTxt('chip-year', c.chipYear); setTxt('chip-all', c.chipAll);
    setTxt('lbl-to', c.lblTo); setTxt('btn-update', c.btnUpdate);
    setTxt('txt-kpi-inc', c.kpiInc); setTxt('txt-kpi-exp', c.kpiExp); setTxt('txt-kpi-net', c.kpiNet); setTxt('txt-kpi-pat', c.kpiNewPat);
    setTxt('c-title-1', c.cFin); setTxt('c-title-2', c.cServ); setTxt('c-title-3', c.cMeth); setTxt('c-title-4', c.cTab);
    setTxt('th-d', c.thDate); setTxt('th-c', c.thCat); setTxt('th-n', c.thNote); setTxt('th-a', c.thAmount);
    setTxt('txt-loading', c.loadingTable);
    
    window.repLang = c;
}

// 🔴 2. الفروع 🔴
function loadBranchesDropdown() {
    if (!clinicId) return;
    const select = document.getElementById('branch_filter');
    if (!select) return;

    db.collection("Branches").where("clinicId", "==", clinicId).get().then(snap => {
        snap.forEach(doc => {
            select.innerHTML += `<option value="${doc.id}">${doc.data().name}</option>`;
        });
    }).catch(e => console.error("Branch Load Error:", e));
}

// 🔴 3. التواريخ 🔴
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
    
    // تأكد إن التحميل ميبدأش إلا لما يتم استدعاء الدالة
    loadAllReportsData();
}

// 🔴 4. جلب الداتا (باللوجيك الأصلي مع تجاوز ذكي للفروع) 🔴
async function loadAllReportsData() {
    if (!clinicId) return;
    
    const dateFrom = document.getElementById('rep_date_from').value;
    const dateTo = document.getElementById('rep_date_to').value;

    if (window.showLoader) window.showLoader("جاري إعداد التقارير...");

    try {
        // سحب قيمة الفرع
        const branchSelect = document.getElementById('branch_filter');
        const selectedBranch = branchSelect ? branchSelect.value : 'all';

        // أ. جلب الحركات المالية (كودك الأصلي)
        const finSnap = await db.collection("Finances")
            .where("clinicId", "==", clinicId)
            .where("date", ">=", dateFrom)
            .where("date", "<=", dateTo)
            .get();
        
        let trans = finSnap.docs.map(doc => doc.data());
        // 🔴 التعديل هنا: لو الداتا قديمة ومفيهاش فرع، هتتعامل كأنها تبع الفرع المختار أو "all"
        if (selectedBranch !== 'all') {
            trans = trans.filter(t => (t.branchId || 'main') === selectedBranch);
        }
        currentReportData.transactions = trans;

        // ب. جلب الجلسات (كودك الأصلي)
        const sessSnap = await db.collection("Sessions")
            .where("clinicId", "==", clinicId)
            .where("date", ">=", dateFrom)
            .where("date", "<=", dateTo)
            .get();
        
        let sess = sessSnap.docs.map(doc => doc.data());
        // 🔴 التعديل هنا: نفس المعاملة الآمنة للفروع
        if (selectedBranch !== 'all') {
            sess = sess.filter(s => (s.branchId || 'main') === selectedBranch);
        }
        currentReportData.sessions = sess;

        // ج. جلب المرضى الجدد (كودك الأصلي)
        const patSnap = await db.collection("Patients")
            .where("clinicId", "==", clinicId)
            .get(); 
        
        let pats = patSnap.docs.map(doc => doc.data()).filter(p => {
            if(!p.createdAt) return false;
            const pDate = p.createdAt.toDate().toISOString().split('T')[0];
            return pDate >= dateFrom && pDate <= dateTo;
        });

        // 🔴 التعديل هنا: فلترة آمنة للمرضى القدامى
        if (selectedBranch !== 'all') {
            pats = pats.filter(p => (p.branchId || 'main') === selectedBranch);
        }
        currentReportData.patients = pats;

        // د. المعالجة والعرض
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

// 🔴 5. المخططات (بحجم مناسب) 🔴
function getChartColor() {
    return document.body.getAttribute('data-theme') === 'dark' ? '#cbd5e1' : '#475569';
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
    const txtColor = getChartColor();
    const isAr = document.body.dir !== 'ltr';
    
    financeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedLabels,
            datasets: [
                { label: isAr ? 'إيرادات' : 'Income', data: sortedLabels.map(d => days[d].inc), borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.4 },
                { label: isAr ? 'مصروفات' : 'Expenses', data: sortedLabels.map(d => days[d].exp), borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', fill: true, tension: 0.4 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { color: txtColor } } }, scales: { x: { ticks: { color: txtColor } }, y: { ticks: { color: txtColor } } } }
    });
}

function renderServicesChart() {
    const ctx = document.getElementById('servicesChart').getContext('2d');
    if (servicesChart) servicesChart.destroy();

    const counts = {};
    const unspec = document.body.dir === 'rtl' ? "غير محدد" : "Unspecified";
    currentReportData.sessions.forEach(s => {
        const proc = s.procedure || unspec;
        counts[proc] = (counts[proc] || 0) + 1;
    });

    const txtColor = getChartColor();

    servicesChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(counts),
            datasets: [{ data: Object.values(counts), backgroundColor: ['#0284c7', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899'] }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: txtColor } } } }
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

    const txtColor = getChartColor();
    const isAr = document.body.dir !== 'ltr';

    methodsChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: [isAr ? 'نقدي' : 'Cash', isAr ? 'محافظ' : 'Wallet', isAr ? 'بنوك' : 'Bank'],
            datasets: [{ data: [methods.cash, methods.wallet, methods.instapay], backgroundColor: ['#10b981', '#8b5cf6', '#0284c7'] }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: txtColor } } } }
    });
}

// 🔴 6. الجدول الأصلي 🔴
function renderDetailedTable() {
    const tbody = document.getElementById('detailedReportBody');
    tbody.innerHTML = '';
    
    currentReportData.transactions.sort((a,b) => b.date.localeCompare(a.date));
    
    if (currentReportData.transactions.length === 0) {
        const msg = document.body.dir === 'rtl' ? 'لا توجد حركات مالية في هذه الفترة.' : 'No transactions found.';
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 15px; color: #64748b;">${msg}</td></tr>`;
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

function exportReportToExcel() {
    const isAr = document.body.dir === 'rtl';
    const data = currentReportData.transactions.map(t => ({
        [isAr ? "التاريخ" : "Date"]: t.date,
        [isAr ? "النوع" : "Type"]: t.type === 'income' ? (isAr ? 'إيراد' : 'Income') : (isAr ? 'مصروف' : 'Expense'),
        [isAr ? "التصنيف" : "Category"]: t.category,
        [isAr ? "المبلغ" : "Amount"]: t.amount,
        [isAr ? "طريقة الدفع" : "Payment Method"]: t.paymentMethod || 'cash',
        [isAr ? "البيان" : "Description"]: t.notes,
        [isAr ? "بواسطة" : "By"]: t.createdBy
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Financial Report");
    XLSX.writeFile(wb, `NivaDent_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// 🔴 7. الإقلاع الآمن 🔴
window.onload = () => {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.body.dir = lang === 'en' ? 'ltr' : 'rtl';
    document.body.setAttribute('data-theme', localStorage.getItem('niva_theme') || 'light');
    
    updatePageContent(lang);
    loadBranchesDropdown();

    // 🔴 الحل السحري لتفادي Permission Error 🔴
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            // لن يتم طلب البيانات إلا بعد التأكد من تسجيل الدخول
            setTimeout(() => {
                setReportPeriod('month', document.getElementById('chip-month'));
            }, 500); // تأخير بسيط لضمان تجهيز توكن الفايربيز
        }
    });
};
