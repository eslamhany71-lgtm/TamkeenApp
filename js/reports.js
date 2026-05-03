// js/reports.js
const db = firebase.firestore();
const clinicId = sessionStorage.getItem('clinicId');

let financeChart, servicesChart, methodsChart;
let currentReportData = {
    transactions: [],
    sessions: [],
    patients: []
};

// 🔴 إضافة جديدة: جلب الفروع لقائمة الفلتر 🔴
function loadBranchesDropdown() {
    if (!clinicId) return;
    const select = document.getElementById('branch_filter');
    if (!select) return; // لو نسيت تضيفها في الـ HTML مش هيضرب إيرور

    db.collection("Branches").where("clinicId", "==", clinicId).get().then(snap => {
        select.innerHTML = '<option value="all">كل الفروع (الفرع الرئيسي)</option>';
        snap.forEach(doc => {
            select.innerHTML += `<option value="${doc.id}">${doc.data().name}</option>`;
        });
    });
}

// 🔴 1. إعدادات البداية والفلاتر (كودك الأصلي) 🔴
function setReportPeriod(period, element) {
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    
    if(element) {
        element.classList.add('active');
    } else {
        // لو الـ element مش مبعوت (زي في بداية التحميل)، هننشط أول زرار كإفتراضي
        const chips = document.querySelectorAll('.filter-chip');
        if(chips.length > 0) chips[0].classList.add('active');
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

// 🔴 2. جلب كل الداتا (معدلة للفلترة بالفروع بأمان شديد) 🔴
async function loadAllReportsData() {
    if (!clinicId) return;
    
    const dateFrom = document.getElementById('rep_date_from').value;
    const dateTo = document.getElementById('rep_date_to').value;
    
    // سحب الفرع المختار من الـ HTML
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
        
        let trans = finSnap.docs.map(doc => doc.data());
        // فلتر الفروع (الداتا القديمة اللي مفهاش فرع بنعتبرها 'all')
        if (selectedBranch !== 'all') {
            trans = trans.filter(t => (t.branchId || 'main') === selectedBranch);
        }
        currentReportData.transactions = trans;

        // ب. جلب الجلسات
        const sessSnap = await db.collection("Sessions")
            .where("clinicId", "==", clinicId)
            .where("date", ">=", dateFrom)
            .where("date", "<=", dateTo)
            .get();
        
        let sess = sessSnap.docs.map(doc => doc.data());
        if (selectedBranch !== 'all') {
            sess = sess.filter(s => (s.branchId || 'main') === selectedBranch);
        }
        currentReportData.sessions = sess;

        // ج. جلب المرضى الجدد
        const patSnap = await db.collection("Patients")
            .where("clinicId", "==", clinicId)
            .get(); 
        
        currentReportData.patients = patSnap.docs.map(doc => doc.data()).filter(p => {
            // فلتر الفرع أولاً
            if (selectedBranch !== 'all') {
                if ((p.branchId || 'main') !== selectedBranch) return false;
            }
            
            // كودك الأصلي للتواريخ بدون أي مساس!
            if(!p.createdAt) return false;
            const pDate = p.createdAt.toDate().toISOString().split('T')[0];
            return pDate >= dateFrom && pDate <= dateTo;
        });

        // 🔴 3. معالجة الداتا وعرضها 🔴
        calculateKPIs();
        renderFinanceChart();
        renderServicesChart();
        renderMethodsChart();
        renderDetailedTable();

    } catch (e) {
        console.error("Reports Error:", e);
        const tbody = document.getElementById('detailedReportBody');
        if(tbody) tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: red;">حدث خطأ: ${e.message}</td></tr>`;
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

// 🔴 4. رسم المخططات (مضاف إليها maintainAspectRatio لضبط الحجم) 🔴

function getTextColor() {
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
    const isAr = document.body.dir !== 'ltr';
    const textColor = getTextColor();
    
    financeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedLabels,
            datasets: [
                { label: isAr ? 'إيرادات' : 'Income', data: sortedLabels.map(d => days[d].inc), borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.4 },
                { label: isAr ? 'مصروفات' : 'Expenses', data: sortedLabels.map(d => days[d].exp), borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', fill: true, tension: 0.4 }
            ]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, // ده اللي بيمنع الرسم من إنه يبقى عملاق
            plugins: { legend: { position: 'top', labels: { color: textColor } } },
            scales: { x: { ticks: { color: textColor } }, y: { ticks: { color: textColor } } }
        }
    });
}

function renderServicesChart() {
    const ctx = document.getElementById('servicesChart').getContext('2d');
    if (servicesChart) servicesChart.destroy();

    const counts = {};
    const isAr = document.body.dir !== 'ltr';
    const unspec = isAr ? "غير محدد" : "Unspecified";

    currentReportData.sessions.forEach(s => {
        const proc = s.procedure || unspec;
        counts[proc] = (counts[proc] || 0) + 1;
    });

    const textColor = getTextColor();

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

    const isAr = document.body.dir !== 'ltr';
    const textColor = getTextColor();

    methodsChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: [isAr?'نقدي':'Cash', isAr?'محافظ':'Wallet', isAr?'بنوك':'Bank'],
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
    
    // كودك الأصلي للترتيب (محمي)
    currentReportData.transactions.sort((a,b) => {
        const d1 = a.date || "";
        const d2 = b.date || "";
        return d2.localeCompare(d1);
    });
    
    currentReportData.transactions.forEach(t => {
        const tr = document.createElement('tr');
        const color = t.type === 'income' ? '#10b981' : '#ef4444';
        const sign = t.type === 'income' ? '+' : '-';
        
        tr.innerHTML = `
            <td>${t.date || ''}</td>
            <td><strong>${t.category || ''}</strong></td>
            <td>${t.notes || '---'}</td>
            <td style="color: ${color}; font-weight: bold;" dir="ltr">${sign} ${t.amount || 0}</td>
        `;
        tbody.appendChild(tr);
    });

    if (currentReportData.transactions.length === 0) {
        const isAr = document.body.dir !== 'ltr';
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #64748b;">${isAr ? 'لا توجد حركات في هذه الفترة' : 'No transactions found'}</td></tr>`;
    }
}

// 🔴 تصدير إكسيل 🔴
function exportReportToExcel() {
    const isAr = document.body.dir !== 'ltr';
    const data = currentReportData.transactions.map(t => ({
        [isAr ? "التاريخ" : "Date"]: t.date,
        [isAr ? "النوع" : "Type"]: t.type === 'income' ? (isAr ? 'إيراد' : 'Income') : (isAr ? 'مصروف' : 'Expense'),
        [isAr ? "التصنيف" : "Category"]: t.category,
        [isAr ? "المبلغ" : "Amount"]: t.amount,
        [isAr ? "طريقة الدفع" : "Payment Method"]: t.paymentMethod,
        [isAr ? "البيان" : "Description"]: t.notes,
        [isAr ? "بواسطة" : "By"]: t.createdBy
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Financial Report");
    XLSX.writeFile(wb, `NivaDent_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// 🔴 5. تحميل الصفحة (نفس اللوجيك بتاعك اللي شغال) 🔴
window.onload = () => {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.body.dir = lang === 'en' ? 'ltr' : 'rtl';
    document.body.setAttribute('data-theme', localStorage.getItem('niva_theme') || 'light');
    
    // سحب الفروع للفلتر لو موجود
    loadBranchesDropdown();

    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            setReportPeriod('month'); // تحميل تقرير الشهر الحالي افتراضياً
        }
    });
};
