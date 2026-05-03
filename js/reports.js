// js/reports.js - V-Final Professional
const db = firebase.firestore();
const clinicId = sessionStorage.getItem('clinicId');

let financeChart, servicesChart, methodsChart;
let currentReportData = { transactions: [], sessions: [], patients: [] };

// 🔴 1. قاموس اللغات الكامل (لحل مشكلة الـ 50 سطر) 🔴
function updatePageContent(lang) {
    const t = {
        ar: {
            title: "التقارير التحليلية", sub: "تحليل الأداء المالي، نمو المرضى، وإحصائيات العيادة الشاملة",
            exp: "📥 تصدير لإكسيل", print: "🖨️ طباعة التقرير", optAll: "كل الفروع (الرئيسي)",
            m: "هذا الشهر", w: "هذا الأسبوع", y: "هذه السنة", a: "كل الوقت",
            to: "إلى", upd: "تحديث 🔄",
            inc: "إجمالي الدخل", expen: "إجمالي المصروفات", net: "صافي الربح", pat: "مرضى جدد",
            c1: "📊 مخطط الإيرادات والمصروفات الزمني", c2: "🩺 أكثر الخدمات (الإجراءات) طلباً",
            c3: "💳 تحليل طرق التحصيل", c4: "📑 ملخص العمليات المالية في الفترة المختارة",
            thD: "التاريخ", thC: "التصنيف", thN: "البيان", thA: "المبلغ", load: "جاري تجميع البيانات...",
            lInc: "إيرادات", lExp: "مصروفات", lCash: "نقدي", lWallet: "محافظ", lBank: "بنوك", unspec: "غير محدد", noData: "لا توجد حركات مالية."
        },
        en: {
            title: "Analytical Reports", sub: "Financial performance, patient growth, and statistics",
            exp: "📥 Export to Excel", print: "🖨️ Print Report", optAll: "All Branches (Main)",
            m: "This Month", w: "This Week", y: "This Year", a: "All Time",
            to: "To", upd: "Update 🔄",
            inc: "Total Income", expen: "Total Expenses", net: "Net Profit", pat: "New Patients",
            c1: "📊 Financial Timeline Chart", c2: "🩺 Most Requested Services",
            c3: "💳 Payment Methods Analysis", c4: "📑 Financial Transactions Summary",
            thD: "Date", thC: "Category", thN: "Description", thA: "Amount", load: "Compiling data...",
            lInc: "Income", lExp: "Expenses", lCash: "Cash", lWallet: "Wallet", lBank: "Bank", unspec: "Unspecified", noData: "No transactions found."
        }
    };
    const c = t[lang] || t.ar;
    const setTxt = (id, txt) => { const el = document.getElementById(id); if(el) el.innerText = txt; };

    setTxt('txt-title', c.title); setTxt('txt-subtitle', c.sub);
    setTxt('btn-export', c.exp); setTxt('btn-print', c.print); 
    if(document.getElementById('opt-all')) document.getElementById('opt-all').innerText = c.optAll;
    setTxt('chip-month', c.m); setTxt('chip-week', c.w); setTxt('chip-year', c.y); setTxt('chip-all', c.a);
    setTxt('lbl-to', c.to); setTxt('btn-update', c.upd);
    setTxt('txt-kpi-inc', c.inc); setTxt('txt-kpi-exp', c.expen); setTxt('txt-kpi-net', c.net); setTxt('txt-kpi-pat', c.pat);
    setTxt('c-title-1', c.c1); setTxt('c-title-2', c.c2); setTxt('c-title-3', c.c3); setTxt('c-title-4', c.c4);
    setTxt('th-d', c.thD); setTxt('th-c', c.thC); setTxt('th-n', c.thN); setTxt('th-a', c.thA);
    setTxt('txt-loading', c.load);
    window.repLang = c;
}

// 🔴 2. جلب الفروع 🔴
function loadBranchesDropdown() {
    if (!clinicId) return;
    const select = document.getElementById('branch_filter');
    if (!select) return;
    db.collection("Branches").where("clinicId", "==", clinicId).get().then(snap => {
        snap.forEach(doc => { select.innerHTML += `<option value="${doc.id}">${doc.data().name}</option>`; });
    });
}

// 🔴 3. التواريخ 🔴
function setReportPeriod(period, element) {
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    if(element) element.classList.add('active');
    const today = new Date();
    let fromDate = new Date();
    if (period === 'month') fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
    else if (period === 'week') fromDate.setDate(today.getDate() - 7);
    else if (period === 'year') fromDate = new Date(today.getFullYear(), 0, 1);
    else if (period === 'all') fromDate = new Date(2020, 0, 1);

    document.getElementById('rep_date_from').value = fromDate.toISOString().split('T')[0];
    document.getElementById('rep_date_to').value = today.toISOString().split('T')[0];
    loadAllReportsData();
}

// 🔴 4. جلب الداتا (باللوجيك الأصلي المضمون) 🔴
async function loadAllReportsData() {
    if (!clinicId || !firebase.auth().currentUser) return;
    const dateFrom = document.getElementById('rep_date_from').value;
    const dateTo = document.getElementById('rep_date_to').value;
    const branchSelect = document.getElementById('branch_filter');
    const selectedBranch = branchSelect ? branchSelect.value : 'all';

    if (window.showLoader) window.showLoader(window.repLang.load);

    try {
        const finSnap = await db.collection("Finances").where("clinicId", "==", clinicId).where("date", ">=", dateFrom).where("date", "<=", dateTo).get();
        currentReportData.transactions = finSnap.docs.map(doc => doc.data()).filter(t => selectedBranch === 'all' || (t.branchId || 'main') === selectedBranch);

        const sessSnap = await db.collection("Sessions").where("clinicId", "==", clinicId).where("date", ">=", dateFrom).where("date", "<=", dateTo).get();
        currentReportData.sessions = sessSnap.docs.map(doc => doc.data()).filter(s => selectedBranch === 'all' || (s.branchId || 'main') === selectedBranch);

        const patSnap = await db.collection("Patients").where("clinicId", "==", clinicId).get(); 
        currentReportData.patients = patSnap.docs.map(doc => doc.data()).filter(p => {
            if (selectedBranch !== 'all' && (p.branchId || 'main') !== selectedBranch) return false;
            if(!p.createdAt) return false;
            const pDate = p.createdAt.toDate().toISOString().split('T')[0];
            return pDate >= dateFrom && pDate <= dateTo;
        });

        calculateKPIs();
        renderFinanceChart();
        renderServicesChart();
        renderMethodsChart();
        renderDetailedTable();
    } catch (e) { console.error(e); } 
    finally { if (window.hideLoader) window.hideLoader(); }
}

function calculateKPIs() {
    let inc = 0, exp = 0;
    currentReportData.transactions.forEach(t => {
        if (t.type === 'income') inc += Number(t.amount);
        else inc -= Number(t.amount); // أو حسب تصنيفك للمصروف
    });
    // إعادة حساب الـ KPIs بناءً على النوع الفعلي
    let totalIncome = 0; let totalExpense = 0;
    currentReportData.transactions.forEach(t => {
        if(t.type === 'income') totalIncome += Number(t.amount);
        else totalExpense += Number(t.amount);
    });

    document.getElementById('rep-income').innerText = totalIncome.toLocaleString();
    document.getElementById('rep-expense').innerText = totalExpense.toLocaleString();
    document.getElementById('rep-net').innerText = (totalIncome - totalExpense).toLocaleString();
    document.getElementById('rep-new-patients').innerText = currentReportData.patients.length;
}

// 🔴 5. المخططات البيانية 🔴
function getThemeColors() { return document.body.getAttribute('data-theme') === 'dark' ? '#cbd5e1' : '#475569'; }

function renderFinanceChart() {
    const ctx = document.getElementById('financeChart').getContext('2d');
    if (financeChart) financeChart.destroy();
    const days = {};
    currentReportData.transactions.forEach(t => {
        if (!days[t.date]) days[t.date] = { inc: 0, exp: 0 };
        if (t.type === 'income') days[t.date].inc += Number(t.amount); else days[t.date].exp += Number(t.amount);
    });
    const sorted = Object.keys(days).sort();
    const clr = getThemeColors();
    financeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sorted,
            datasets: [
                { label: window.repLang.lInc, data: sorted.map(d => days[d].inc), borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.4 },
                { label: window.repLang.lExp, data: sorted.map(d => days[d].exp), borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', fill: true, tension: 0.4 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: clr } } }, scales: { x: { ticks: { color: clr } }, y: { ticks: { color: clr } } } }
    });
}

function renderServicesChart() {
    const ctx = document.getElementById('servicesChart').getContext('2d');
    if (servicesChart) servicesChart.destroy();
    const counts = {};
    currentReportData.sessions.forEach(s => { const p = s.procedure || window.repLang.unspec; counts[p] = (counts[p] || 0) + 1; });
    servicesChart = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: Object.keys(counts), datasets: [{ data: Object.values(counts), backgroundColor: ['#0284c7', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'] }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: getThemeColors() } } } }
    });
}

function renderMethodsChart() {
    const ctx = document.getElementById('methodsChart').getContext('2d');
    if (methodsChart) methodsChart.destroy();
    const mths = { cash: 0, wallet: 0, instapay: 0 };
    currentReportData.transactions.forEach(t => { if(t.type === 'income') mths[t.paymentMethod || 'cash'] += Number(t.amount); });
    methodsChart = new Chart(ctx, {
        type: 'pie',
        data: { labels: [window.repLang.lCash, window.repLang.lWallet, window.repLang.lBank], datasets: [{ data: [mths.cash, mths.wallet, mths.instapay], backgroundColor: ['#10b981', '#8b5cf6', '#0284c7'] }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: getThemeColors() } } } }
    });
}

function renderDetailedTable() {
    const tbody = document.getElementById('detailedReportBody');
    tbody.innerHTML = '';
    currentReportData.transactions.sort((a,b) => b.date.localeCompare(a.date));
    if (currentReportData.transactions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 15px;">${window.repLang.noData}</td></tr>`;
        return;
    }
    currentReportData.transactions.forEach(t => {
        const tr = document.createElement('tr');
        const color = t.type === 'income' ? '#10b981' : '#ef4444';
        tr.innerHTML = `<td>${t.date}</td><td><strong>${t.category}</strong></td><td>${t.notes || '---'}</td><td style="color: ${color}; font-weight: bold;" dir="ltr">${t.type === 'income' ? '+' : '-'} ${t.amount}</td>`;
        tbody.appendChild(tr);
    });
}

// 🔴 6. تصدير إكسيل 🔴
function exportReportToExcel() {
    const data = currentReportData.transactions.map(t => ({
        "التاريخ": t.date, "النوع": t.type === 'income' ? 'إيراد' : 'مصروف', "التصنيف": t.category, "المبلغ": t.amount, "الفرع": t.branchId || 'الرئيسي', "البيان": t.notes, "بواسطة": t.createdBy
    }));
    const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Financial Report");
    XLSX.writeFile(wb, `NivaDent_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
}

window.onload = () => {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.body.dir = lang === 'en' ? 'ltr' : 'rtl';
    document.body.setAttribute('data-theme', localStorage.getItem('niva_theme') || 'light');
    applyLanguage(lang);
    loadBranchesDropdown();
    firebase.auth().onAuthStateChanged((user) => { if (user) setReportPeriod('month', document.getElementById('chip-month')); });
};
