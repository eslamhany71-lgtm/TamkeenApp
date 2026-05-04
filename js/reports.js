// js/reports.js
const db = firebase.firestore();

let financeChart, servicesChart, methodsChart;
let currentReportData = {
    transactions: [],
    sessions: [],
    patients: [],
    inventory: [] // إضافة حاوية المخزون
};
let reportLang = {}; // لتخزين اللغة

// 🔴 1. دالة اللغة والترجمة 🔴
function updateLanguage(lang) {
    const translations = {
        ar: {
            title: "التقارير التحليلية", sub: "تحليل الأداء المالي، نمو المرضى، وإحصائيات العيادة الشاملة",
            exp: "📥 تصدير لإكسيل", print: "🖨️ طباعة التقرير", optAll: "الفرع الرئيسي (كل الفروع)",
            month: "هذا الشهر", week: "هذا الأسبوع", year: "هذه السنة", all: "كل الوقت",
            to: "إلى", update: "تحديث 🔄",
            inc: "إجمالي الدخل", expen: "إجمالي المصروفات", net: "صافي الربح", pat: "مرضى جدد", inv: "نواقص المخزون",
            c1: "📊 مخطط الإيرادات والمصروفات الزمني", c2: "🩺 أكثر الخدمات (الإجراءات) طلباً",
            c3: "💳 تحليل طرق التحصيل", c4: "📑 ملخص العمليات المالية في الفترة المختارة",
            thD: "التاريخ", thC: "التصنيف", thN: "البيان", thA: "المبلغ", load: "جاري تجميع البيانات...",
            lInc: "إيرادات", lExp: "مصروفات", lCash: "نقدي", lWallet: "محافظ", lBank: "بنوك", unspec: "غير محدد", noData: "لا توجد حركات مالية في هذه الفترة."
        },
        en: {
            title: "Analytical Reports", sub: "Financial performance, patient growth, and statistics",
            exp: "📥 Export Excel", print: "🖨️ Print Report", optAll: "Main Branch (All)",
            month: "This Month", week: "This Week", year: "This Year", all: "All Time",
            to: "To", update: "Update 🔄",
            inc: "Total Income", expen: "Total Expenses", net: "Net Profit", pat: "New Patients", inv: "Low Stock Alerts",
            c1: "📊 Financial Timeline Chart", c2: "🩺 Most Requested Services",
            c3: "💳 Payment Methods", c4: "📑 Transactions Summary",
            thD: "Date", thC: "Category", thN: "Notes", thA: "Amount", load: "Compiling data...",
            lInc: "Income", lExp: "Expense", lCash: "Cash", lWallet: "Wallet", lBank: "Bank", unspec: "Unspecified", noData: "No financial transactions in this period."
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
    set('txt-kpi-inventory', reportLang.inv);
    set('c-title-1', reportLang.c1); set('c-title-2', reportLang.c2);
    set('c-title-3', reportLang.c3); set('c-title-4', reportLang.c4);
    set('th-d', reportLang.thD); set('th-c', reportLang.thC);
    set('th-n', reportLang.thN); set('th-a', reportLang.thA);
    set('txt-loading', reportLang.load);
}

// 🔴 2. جلب الفروع 🔴
function loadBranchesDropdown() {
    const cid = sessionStorage.getItem('clinicId');
    const select = document.getElementById('branch_filter');
    if (!cid || !select) return;

    db.collection("Branches").where("clinicId", "==", cid).get().then(snap => {
        snap.forEach(doc => {
            select.innerHTML += `<option value="${doc.id}">${doc.data().name}</option>`;
        });
    }).catch(e => console.error(e));
}

// 🔴 3. إعدادات البداية والفلاتر (كودك الأصلي بالحرف) 🔴
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

// 🔴 4. جلب الداتا (بالطريقة السريعة بتاعتك اللي نجحت 100%) 🔴
async function loadAllReportsData() {
    const tbody = document.getElementById('detailedReportBody');
    const currentClinicId = sessionStorage.getItem('clinicId');
    
    if (!currentClinicId) {
        if(tbody) tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: red; font-weight: bold;">خطأ: الـ clinicId مفقود! يرجى تسجيل الدخول من جديد.</td></tr>`;
        return;
    }

    const dateFrom = document.getElementById('rep_date_from').value;
    const dateTo = document.getElementById('rep_date_to').value;
    
    // سحب الفرع للفلترة المحلية بأمان
    const branchSelect = document.getElementById('branch_filter');
    const selectedBranch = branchSelect ? branchSelect.value : 'all';

    if (window.showLoader) window.showLoader(reportLang.load || "جاري إعداد التقارير...");
    if(tbody) tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #0284c7;">1. جاري سحب الحركات المالية...</td></tr>`;

    try {
        // أ. جلب الحركات المالية (استعلامك السريع المضمون)
        const finSnap = await db.collection("Finances")
            .where("clinicId", "==", currentClinicId)
            .where("date", ">=", dateFrom)
            .where("date", "<=", dateTo)
            .get();
        
        // فلترة الفرع محلياً بدون ما نضرب الـ Indexes
        currentReportData.transactions = finSnap.docs.map(doc => doc.data()).filter(t => {
            return selectedBranch === 'all' || (t.branchId || 'main') === selectedBranch;
        });

        if(tbody) tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #0284c7;">2. جاري سحب الجلسات والمخزون...</td></tr>`;

        // ب. جلب الجلسات (استعلامك السريع المضمون)
        const sessSnap = await db.collection("Sessions")
            .where("clinicId", "==", currentClinicId)
            .where("date", ">=", dateFrom)
            .where("date", "<=", dateTo)
            .get();
        
        currentReportData.sessions = sessSnap.docs.map(doc => doc.data()).filter(s => {
            return selectedBranch === 'all' || (s.branchId || 'main') === selectedBranch;
        });

        // ج. جلب المخزون (بدون تاريخ لأن المخزون تراكمي)
        const invSnap = await db.collection("Inventory")
            .where("clinicId", "==", currentClinicId)
            .get();
        
        currentReportData.inventory = invSnap.docs.map(doc => doc.data()).filter(inv => {
            return selectedBranch === 'all' || (inv.branchId || 'main') === selectedBranch;
        });

        if(tbody) tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #0284c7;">3. جاري سحب ملفات المرضى...</td></tr>`;

        // د. جلب المرضى
        const patSnap = await db.collection("Patients")
            .where("clinicId", "==", currentClinicId)
            .get(); 
        
        if(tbody) tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #0284c7;">4. جاري فلترة البيانات والمعالجة...</td></tr>`;
        
        currentReportData.patients = patSnap.docs.map(doc => doc.data()).filter(p => {
            // فلتر الفرع
            if (selectedBranch !== 'all' && (p.branchId || 'main') !== selectedBranch) return false;
            
            // فلتر التاريخ الأصلي بتاعك المضمون (مع حماية إضافية من الأخطاء)
            if(!p.createdAt) return false;
            try {
                let pDate;
                if (typeof p.createdAt.toDate === 'function') {
                    pDate = p.createdAt.toDate().toISOString().split('T')[0];
                } else {
                    pDate = new Date(p.createdAt).toISOString().split('T')[0];
                }
                return pDate >= dateFrom && pDate <= dateTo;
            } catch(error) {
                return false; 
            }
        });

        // 🔴 5. معالجة الداتا وعرضها 🔴
        calculateKPIs();
        renderFinanceChart();
        renderServicesChart();
        renderMethodsChart();
        renderDetailedTable();

    } catch (e) {
        console.error("Reports Error:", e);
        if(tbody) tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: red; font-weight: bold;">حدث خطأ: ${e.message}</td></tr>`;
    } finally {
        if (window.hideLoader) window.hideLoader();
    }
}

function calculateKPIs() {
    let income = 0, expense = 0;
    currentReportData.transactions.forEach(t => {
        if (t.type === 'income') income += Number(t.amount || 0);
        else if (t.type === 'expense') expense += Number(t.amount || 0);
    });

    document.getElementById('rep-income').innerText = income.toLocaleString();
    document.getElementById('rep-expense').innerText = expense.toLocaleString();
    document.getElementById('rep-net').innerText = (income - expense).toLocaleString();
    document.getElementById('rep-new-patients').innerText = currentReportData.patients.length;

    // حساب نواقص المخزون
    let lowStockCount = 0;
    currentReportData.inventory.forEach(item => {
        const qty = Number(item.qty || 0);
        const minAlert = Number(item.minAlert || 0);
        if (qty <= minAlert) lowStockCount++;
    });
    const invElem = document.getElementById('rep-inventory-alerts');
    if (invElem) invElem.innerText = lowStockCount;
}

// 🔴 4. رسم المخططات البيانية (بألوان تتناسب مع الدارك مود) 🔴
function renderFinanceChart() {
    const ctx = document.getElementById('financeChart').getContext('2d');
    if (financeChart) financeChart.destroy();

    const days = {};
    currentReportData.transactions.forEach(t => {
        if (!days[t.date]) days[t.date] = { inc: 0, exp: 0 };
        if (t.type === 'income') days[t.date].inc += Number(t.amount || 0);
        else days[t.date].exp += Number(t.amount || 0);
    });

    const sortedLabels = Object.keys(days).sort();
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const clr = isDark ? '#cbd5e1' : '#475569';
    
    financeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedLabels,
            datasets: [
                { label: reportLang.lInc || 'إيرادات', data: sortedLabels.map(d => days[d].inc), borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.4 },
                { label: reportLang.lExp || 'مصروفات', data: sortedLabels.map(d => days[d].exp), borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', fill: true, tension: 0.4 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { color: clr } } }, scales: { x:{ticks:{color:clr}}, y:{ticks:{color:clr}} } }
    });
}

function renderServicesChart() {
    const ctx = document.getElementById('servicesChart').getContext('2d');
    if (servicesChart) servicesChart.destroy();

    const counts = {};
    const unspec = reportLang.unspec || "غير محدد";
    
    currentReportData.sessions.forEach(s => {
        // إصلاح المشكلة (جلب الإجراء من dentalChart بناءً على صور الداتا بيز)
        let proc = unspec;
        if (s.dentalChart && s.dentalChart.procedure) {
            proc = s.dentalChart.procedure;
        } else if (s.procedure) {
            proc = s.procedure;
        }
        counts[proc] = (counts[proc] || 0) + 1;
    });

    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const clr = isDark ? '#cbd5e1' : '#475569';

    servicesChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(counts),
            datasets: [{
                data: Object.values(counts),
                backgroundColor: ['#0284c7', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: clr } } } }
    });
}

function renderMethodsChart() {
    const ctx = document.getElementById('methodsChart').getContext('2d');
    if (methodsChart) methodsChart.destroy();

    const methods = { 'cash': 0, 'wallet': 0, 'instapay': 0 };
    currentReportData.transactions.forEach(t => {
        if(t.type === 'income') {
            const m = t.paymentMethod || 'cash';
            methods[m] = (methods[m] || 0) + Number(t.amount || 0);
        }
    });

    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const clr = isDark ? '#cbd5e1' : '#475569';

    methodsChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: [reportLang.lCash || 'نقدي', reportLang.lWallet || 'محافظ', reportLang.lBank || 'بنوك'],
            datasets: [{
                data: [methods.cash, methods.wallet, methods.instapay],
                backgroundColor: ['#10b981', '#8b5cf6', '#0284c7']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: clr } } } }
    });
}

function renderDetailedTable() {
    const tbody = document.getElementById('detailedReportBody');
    tbody.innerHTML = '';
    
    currentReportData.transactions.sort((a,b) => (b.date || "").localeCompare(a.date || ""));
    
    if(currentReportData.transactions.length === 0) {
        const msg = reportLang.noData || "لا توجد حركات مالية في هذه الفترة.";
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #64748b; padding: 20px;">${msg}</td></tr>`;
        return;
    }

    currentReportData.transactions.forEach(t => {
        const tr = document.createElement('tr');
        const color = t.type === 'income' ? '#10b981' : '#ef4444';
        const sign = t.type === 'income' ? '+' : '-';
        
        tr.innerHTML = `
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${t.date || '---'}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;"><strong>${t.category || '---'}</strong></td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${t.notes || '---'}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: ${color}; font-weight: bold;" dir="ltr">${sign} ${t.amount || 0}</td>
        `;
        tbody.appendChild(tr);
    });
}

// 🔴 تصدير إكسيل 🔴
function exportReportToExcel() {
    const isAr = document.body.dir === 'rtl';
    const data = currentReportData.transactions.map(t => ({
        [isAr ? "التاريخ" : "Date"]: t.date || '',
        [isAr ? "النوع" : "Type"]: t.type === 'income' ? (isAr ? 'إيراد' : 'Income') : (isAr ? 'مصروف' : 'Expense'),
        [isAr ? "التصنيف" : "Category"]: t.category || '',
        [isAr ? "المبلغ" : "Amount"]: t.amount || 0,
        [isAr ? "الفرع" : "Branch"]: t.branchId || (isAr ? 'الرئيسي' : 'Main'),
        [isAr ? "طريقة الدفع" : "Payment Method"]: t.paymentMethod || 'cash',
        [isAr ? "البيان" : "Description"]: t.notes || '',
        [isAr ? "بواسطة" : "By"]: t.createdBy || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Financial Report");
    XLSX.writeFile(wb, `NivaDent_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
}

window.onload = () => {
    // تجهيز لغة الصفحة ووضع الألوان فوراً
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.body.dir = lang === 'en' ? 'ltr' : 'rtl';
    document.body.setAttribute('data-theme', localStorage.getItem('niva_theme') || 'light');
    
    updateLanguage(lang);
    loadBranchesDropdown();

    // تشغيل التقرير فقط بعد التأكد من تسجيل الدخول
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            setReportPeriod('month', document.querySelector('.filter-chip.active')); 
        } else {
            const tbody = document.getElementById('detailedReportBody');
            if (tbody) tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: red; padding: 20px;">الرجاء تسجيل الدخول أولاً</td></tr>`;
        }
    });
};
