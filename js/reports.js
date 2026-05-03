// js/reports.js
const db = firebase.firestore();

let financeChart, servicesChart, methodsChart;
let currentReportData = { transactions: [], sessions: [], patients: [] };
let reportLang = {};

// 🔴 1. دالة الترجمة (تم استدعاؤها بشكل صحيح ومفرودة) 🔴
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
    set('chip-week', reportLang.week); set('chip-year', reportLang.year); setTxt('chip-all', reportLang.all);
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

// 🔴 3. ضبط الفترة الزمنية (نفس كود التيست) 🔴
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

// 🔴 4. جلب الداتا (نفس عصب كود التيست المضمون) 🔴
async function loadAllReportsData() {
    const cid = sessionStorage.getItem('clinicId');
    const tbody = document.getElementById('detailedReportBody');
    if (!cid) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: red;">Error: Clinic ID Missing</td></tr>`;
        return;
    }

    const dateFrom = document.getElementById('rep_date_from').value;
    const dateTo = document.getElementById('rep_date_to').value;
    const selectedBranch = document.getElementById('branch_filter').value || 'all';

    if (window.showLoader) window.showLoader(reportLang.load || "جاري التحميل...");
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #0284c7; padding: 20px;">جاري جلب البيانات...</td></tr>`;

    try {
        // أ. الفواتير
        const finSnap = await db.collection("Finances").where("clinicId", "==", cid).where("date", ">=", dateFrom).where("date", "<=", dateTo).get();
        currentReportData.transactions = finSnap.docs.map(doc => doc.data()).filter(t => selectedBranch === 'all' || (t.branchId || 'main') === selectedBranch);

        // ب. الجلسات
        const sessSnap = await db.collection("Sessions").where("clinicId", "==", cid).where("date", ">=", dateFrom).where("date", "<=", dateTo).get();
        currentReportData.sessions = sessSnap.docs.map(doc => doc.data()).filter(s => selectedBranch === 'all' || (s.branchId || 'main') === selectedBranch);

        // ج. المرضى
        const patSnap = await db.collection("Patients").where("clinicId", "==", cid).get();
        currentReportData.patients = patSnap.docs.map(doc => doc.data()).filter(p => {
            if (selectedBranch !== 'all' && (p.branchId || 'main') !== selectedBranch) return false;
            if(!p.createdAt) return false;
            try {
                const pDate = p.createdAt.toDate().toISOString().split('T')[0];
                return pDate >= dateFrom && pDate <= dateTo;
            } catch(e) { return false; }
        });

        // العرض
        renderAll();

    } catch (error) {
        console.error(error);
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: red;">Error: ${error.message}</td></tr>`;
    } finally {
        if (window.hideLoader) window.hideLoader();
    }
}

function renderAll() {
    // حساب الـ KPIs
    let inc = 0; let exp = 0;
    currentReportData.transactions.forEach(t => {
        if(t.type === 'income') inc += Number(t.amount);
        else exp += Number(t.amount);
    });
    document.getElementById('rep-income').innerText = inc.toLocaleString();
    document.getElementById('rep-expense').innerText = exp.toLocaleString();
    document.getElementById('rep-net').innerText = (inc - exp).toLocaleString();
    document.getElementById('rep-new-patients').innerText = currentReportData.patients.length;

    // الرسوم البيانية
    renderCharts();
    
    // الجدول
    const tbody = document.getElementById('detailedReportBody');
    tbody.innerHTML = '';
    currentReportData.transactions.sort((a,b) => b.date.localeCompare(a.date));
    
    if(currentReportData.transactions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px;">${reportLang.noData}</td></tr>`;
        return;
    }
    
    currentReportData.transactions.forEach(t => {
        const tr = document.createElement('tr');
        const color = t.type === 'income' ? '#10b981' : '#ef4444';
        tr.innerHTML = `<td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${t.date}</td>
                        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;"><strong>${t.category}</strong></td>
                        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${t.notes || '---'}</td>
                        <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: ${color}; font-weight: bold;">${t.type === 'income'?'+':'-'} ${t.amount}</td>`;
        tbody.appendChild(tr);
    });
}

function renderCharts() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const clr = isDark ? '#cbd5e1' : '#475569';

    // 1. الزمني
    const days = {};
    currentReportData.transactions.forEach(t => {
        if(!days[t.date]) days[t.date] = {i:0, e:0};
        if(t.type === 'income') days[t.date].i += Number(t.amount); else days[t.date].e += Number(t.amount);
    });
    const sorted = Object.keys(days).sort();
    if (financeChart) financeChart.destroy();
    financeChart = new Chart(document.getElementById('financeChart'), {
        type: 'line',
        data: {
            labels: sorted,
            datasets: [
                { label: reportLang.lInc, data: sorted.map(d => days[d].i), borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.4 },
                { label: reportLang.lExp, data: sorted.map(d => days[d].e), borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', fill: true, tension: 0.4 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: clr } } }, scales: { x:{ticks:{color:clr}}, y:{ticks:{color:clr}} } }
    });

    // 2. الخدمات
    const srv = {};
    currentReportData.sessions.forEach(s => { const p = s.procedure || reportLang.unspec; srv[p] = (srv[p]||0)+1; });
    if (servicesChart) servicesChart.destroy();
    servicesChart = new Chart(document.getElementById('servicesChart'), {
        type: 'doughnut',
        data: { labels: Object.keys(srv), datasets: [{ data: Object.values(srv), backgroundColor: ['#0284c7', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'] }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: clr } } } }
    });

    // 3. طرق الدفع
    const mth = {cash:0, wallet:0, instapay:0};
    currentReportData.transactions.forEach(t => { if(t.type === 'income') mth[t.paymentMethod || 'cash'] += Number(t.amount); });
    if (methodsChart) methodsChart.destroy();
    methodsChart = new Chart(document.getElementById('methodsChart'), {
        type: 'pie',
        data: { labels: [reportLang.lCash, reportLang.lWallet, reportLang.lBank], datasets: [{ data: [mth.cash, mth.wallet, mth.instapay], backgroundColor: ['#10b981', '#8b5cf6', '#0284c7'] }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: clr } } } }
    });
}

function exportReportToExcel() {
    const isAr = document.body.dir === 'rtl';
    const data = currentReportData.transactions.map(t => ({
        [isAr?"التاريخ":"Date"]: t.date, [isAr?"النوع":"Type"]: t.type==='income'?'إيراد':'مصروف',
        [isAr?"التصنيف":"Category"]: t.category, [isAr?"المبلغ":"Amount"]: t.amount,
        [isAr?"الفرع":"Branch"]: t.branchId || 'Main', [isAr?"البيان":"Note"]: t.notes
    }));
    const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Financial Report");
    XLSX.writeFile(wb, `NivaDent_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
}

window.onload = () => {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.body.dir = lang === 'en' ? 'ltr' : 'rtl';
    document.body.setAttribute('data-theme', localStorage.getItem('niva_theme') || 'light');
    
    // 🔴 الاستدعاء الصحيح للدوال 🔴
    updateLanguage(lang);
    loadBranchesDropdown();

    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            setReportPeriod('month', document.getElementById('chip-month'));
        }
    });
};
