// js/reports.js - Ultimate Final Version
const db = firebase.firestore();

let financeChart, servicesChart, methodsChart;
let currentReportData = {
    transactions: [],
    sessions: [],
    patients: [],
    inventory: [] // إضافة حاوية المخزون
};
let reportLanguageData = {};

// 🔴 1. إعدادات اللغة الشاملة 🔴
function updateLanguage(lang) {
    const translations = {
        ar: {
            title: "التقارير التحليلية",
            subtitle: "تحليل الأداء المالي، نمو المرضى، وإحصائيات العيادة الشاملة",
            btnExport: "📥 تصدير لإكسيل",
            btnPrint: "🖨️ طباعة التقرير",
            optAllBranches: "كل الفروع (الفرع الرئيسي)",
            chipMonth: "هذا الشهر",
            chipWeek: "هذا الأسبوع",
            chipYear: "هذه السنة",
            chipAll: "كل الوقت",
            lblTo: "إلى",
            btnUpdate: "تحديث 🔄",
            kpiIncome: "إجمالي الدخل",
            kpiExpense: "إجمالي المصروفات",
            kpiNet: "صافي الربح",
            kpiNewPatients: "مرضى جدد",
            kpiInventory: "نواقص المخزون", // ترجمة كارت المخزون
            chartFinance: "📊 مخطط الإيرادات والمصروفات الزمني",
            chartServices: "🩺 أكثر الخدمات (الإجراءات) طلباً",
            chartMethods: "💳 تحليل طرق التحصيل",
            chartTable: "📑 ملخص العمليات المالية في الفترة المختارة",
            thDate: "التاريخ",
            thCategory: "التصنيف",
            thNotes: "البيان",
            thAmount: "المبلغ",
            loadingTable: "جاري تجميع البيانات...",
            lblIncome: "إيرادات",
            lblExpense: "مصروفات",
            lblCash: "نقدي",
            lblWallet: "محافظ",
            lblBank: "بنوك",
            unspecified: "غير محدد",
            noData: "لا توجد حركات مالية في هذه الفترة."
        },
        en: {
            title: "Analytical Reports",
            subtitle: "Financial performance, patient growth, and overall statistics",
            btnExport: "📥 Export to Excel",
            btnPrint: "🖨️ Print Report",
            optAllBranches: "All Branches (Main)",
            chipMonth: "This Month",
            chipWeek: "This Week",
            chipYear: "This Year",
            chipAll: "All Time",
            lblTo: "To",
            btnUpdate: "Update 🔄",
            kpiIncome: "Total Income",
            kpiExpense: "Total Expenses",
            kpiNet: "Net Profit",
            kpiNewPatients: "New Patients",
            kpiInventory: "Low Stock Alerts", // Translation for Inventory KPI
            chartFinance: "📊 Financial Timeline Chart",
            chartServices: "🩺 Most Requested Services",
            chartMethods: "💳 Payment Methods Analysis",
            chartTable: "📑 Financial Transactions Summary",
            thDate: "Date",
            thCategory: "Category",
            thNotes: "Description",
            thAmount: "Amount",
            loadingTable: "Compiling data...",
            lblIncome: "Income",
            lblExpense: "Expenses",
            lblCash: "Cash",
            lblWallet: "Wallet",
            lblBank: "Bank",
            unspecified: "Unspecified",
            noData: "No financial transactions in this period."
        }
    };

    reportLanguageData = translations[lang] || translations.ar;

    const setElementText = (id, text) => {
        const element = document.getElementById(id);
        if (element) element.innerText = text;
    };

    setElementText('txt-title', reportLanguageData.title);
    setElementText('txt-subtitle', reportLanguageData.subtitle);
    setElementText('btn-export', reportLanguageData.btnExport);
    setElementText('btn-print', reportLanguageData.btnPrint);
    
    if(document.getElementById('opt-all-branches')) {
        document.getElementById('opt-all-branches').innerText = reportLanguageData.optAllBranches;
    }

    setElementText('chip-month', reportLanguageData.chipMonth);
    setElementText('chip-week', reportLanguageData.chipWeek);
    setElementText('chip-year', reportLanguageData.chipYear);
    setElementText('chip-all', reportLanguageData.chipAll);
    setElementText('lbl-to', reportLanguageData.lblTo);
    setElementText('btn-update', reportLanguageData.btnUpdate);

    setElementText('txt-kpi-income', reportLanguageData.kpiIncome);
    setElementText('txt-kpi-expense', reportLanguageData.kpiExpense);
    setElementText('txt-kpi-net', reportLanguageData.kpiNet);
    setElementText('txt-kpi-new-patients', reportLanguageData.kpiNewPatients);
    setElementText('txt-kpi-inventory', reportLanguageData.kpiInventory);

    setElementText('txt-chart-finance', reportLanguageData.chartFinance);
    setElementText('txt-chart-services', reportLanguageData.chartServices);
    setElementText('txt-chart-methods', reportLanguageData.chartMethods);
    setElementText('txt-chart-table', reportLanguageData.chartTable);

    setElementText('th-date', reportLanguageData.thDate);
    setElementText('th-category', reportLanguageData.thCategory);
    setElementText('th-notes', reportLanguageData.thNotes);
    setElementText('th-amount', reportLanguageData.thAmount);
    setElementText('txt-loading-table', reportLanguageData.loadingTable);
}

// 🔴 2. جلب الفروع لقائمة الفلتر 🔴
async function loadBranchesDropdown() {
    const cid = sessionStorage.getItem('clinicId');
    const selectElement = document.getElementById('branch_filter');
    if (!cid || !selectElement) return;

    try {
        const snapshot = await db.collection("Branches").where("clinicId", "==", cid).get();
        snapshot.forEach(doc => {
            const branchData = doc.data();
            selectElement.innerHTML += `<option value="${doc.id}">${branchData.name}</option>`;
        });
    } catch (error) {
        console.error("Error loading branches: ", error);
    }
}

// 🔴 3. إعدادات الفترات الزمنية 🔴
function setReportPeriod(period, element) {
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    
    if (element) element.classList.add('active');

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

// 🔴 4. جلب الداتا (السريع والآمن) 🔴
async function loadAllReportsData() {
    const cid = sessionStorage.getItem('clinicId');
    const user = firebase.auth().currentUser;
    const tableBody = document.getElementById('detailedReportBody');
    
    if (!cid || !user) {
        if(tableBody) tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #f59e0b; padding: 20px;">الرجاء الانتظار حتى يتم التحقق من الصلاحيات...</td></tr>`;
        return;
    }

    const dateFrom = document.getElementById('rep_date_from').value;
    const dateTo = document.getElementById('rep_date_to').value;
    const branchSelectElement = document.getElementById('branch_filter');
    const selectedBranch = branchSelectElement ? branchSelectElement.value : 'all';

    if (window.showLoader) window.showLoader(reportLanguageData.loadingTable || "جاري إعداد التقارير...");
    tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #0ea5e9; font-weight:bold; padding: 20px;">1. جاري الاتصال بقاعدة البيانات...</td></tr>`;

    try {
        // أ. الفواتير 
        const financesSnapshot = await db.collection("Finances").where("clinicId", "==", cid).get();
        currentReportData.transactions = financesSnapshot.docs.map(doc => doc.data()).filter(transaction => {
            const passBranch = selectedBranch === 'all' || (transaction.branchId || 'main') === selectedBranch;
            const passDate = !transaction.date || (transaction.date >= dateFrom && transaction.date <= dateTo);
            return passBranch && passDate;
        });

        tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #8b5cf6; font-weight:bold; padding: 20px;">2. جاري سحب الجلسات والمخزون...</td></tr>`;

        // ب. الجلسات (بإصلاح المشكلة الهندسية للـ dentalChart)
        const sessionsSnapshot = await db.collection("Sessions").where("clinicId", "==", cid).get();
        currentReportData.sessions = sessionsSnapshot.docs.map(doc => doc.data()).filter(session => {
            const passBranch = selectedBranch === 'all' || (session.branchId || 'main') === selectedBranch;
            const passDate = !session.date || (session.date >= dateFrom && session.date <= dateTo);
            return passBranch && passDate;
        });

        // ج. المرضى الجدد (تأمين قراءة Timestamp)
        const patientsSnapshot = await db.collection("Patients").where("clinicId", "==", cid).get(); 
        currentReportData.patients = patientsSnapshot.docs.map(doc => doc.data()).filter(patient => {
            if (selectedBranch !== 'all' && (patient.branchId || 'main') !== selectedBranch) return false;
            if (!patient.createdAt) return false;
            
            try {
                let patientDate = "";
                if (typeof patient.createdAt.toDate === 'function') {
                    patientDate = patient.createdAt.toDate().toISOString().split('T')[0];
                } else {
                    patientDate = new Date(patient.createdAt).toISOString().split('T')[0];
                }
                return patientDate >= dateFrom && patientDate <= dateTo;
            } catch (error) {
                return false;
            }
        });

        tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #10b981; font-weight:bold; padding: 20px;">3. جاري سحب المخزون ورسم المخططات...</td></tr>`;

        // د. المخزون (Inventory) - جلب الأصناف لفحص النواقص
        const inventorySnapshot = await db.collection("Inventory").where("clinicId", "==", cid).get();
        currentReportData.inventory = inventorySnapshot.docs.map(doc => doc.data()).filter(item => {
            // تصفية المخزون حسب الفرع (إذا كان مقسماً للفروع)
            return selectedBranch === 'all' || (item.branchId || 'main') === selectedBranch;
        });

        // العرض النهائي
        renderAllReports();

    } catch (error) {
        console.error("Reports Fetch Error:", error);
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: red; font-weight:bold; padding: 20px;">حدث خطأ: ${error.message}</td></tr>`;
    } finally {
        if (window.hideLoader) window.hideLoader();
    }
}

function renderAllReports() {
    // 1. حساب الـ KPIs (الدخل والمصروفات)
    let totalIncome = 0;
    let totalExpense = 0;
    currentReportData.transactions.forEach(transaction => {
        if (transaction.type === 'income') {
            totalIncome += Number(transaction.amount);
        } else if (transaction.type === 'expense') {
            totalExpense += Number(transaction.amount);
        }
    });

    document.getElementById('rep-income').innerText = totalIncome.toLocaleString();
    document.getElementById('rep-expense').innerText = totalExpense.toLocaleString();
    document.getElementById('rep-net').innerText = (totalIncome - totalExpense).toLocaleString();
    document.getElementById('rep-new-patients').innerText = currentReportData.patients.length;

    // 2. حساب نواقص المخزون (Inventory Alerts)
    let lowStockCount = 0;
    currentReportData.inventory.forEach(item => {
        const qty = Number(item.qty || 0);
        const minAlert = Number(item.minAlert || 0);
        if (qty <= minAlert) {
            lowStockCount++;
        }
    });
    document.getElementById('rep-inventory-alerts').innerText = lowStockCount;

    // 3. رسم المخططات
    renderCharts();
    
    // 4. رسم الجدول
    const tableBody = document.getElementById('detailedReportBody');
    tableBody.innerHTML = '';
    
    currentReportData.transactions.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    
    if (currentReportData.transactions.length === 0) {
        const noDataMessage = reportLanguageData.noData || "لا توجد حركات مالية في هذه الفترة.";
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px; color: #64748b;">${noDataMessage}</td></tr>`;
        return;
    }

    currentReportData.transactions.forEach(transaction => {
        const tableRow = document.createElement('tr');
        const amountColor = transaction.type === 'income' ? '#10b981' : '#ef4444';
        const amountSign = transaction.type === 'income' ? '+' : '-';
        
        tableRow.innerHTML = `
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${transaction.date || '---'}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;"><strong>${transaction.category || '---'}</strong></td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${transaction.notes || '---'}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: ${amountColor}; font-weight: bold;" dir="ltr">${amountSign} ${transaction.amount || 0}</td>
        `;
        tableBody.appendChild(tableRow);
    });
}

// 🔴 5. المخططات البيانية (متوافقة مع الدارك مود) 🔴
function renderCharts() {
    if (typeof Chart === 'undefined') return;

    const isDarkMode = document.body.getAttribute('data-theme') === 'dark';
    const themeTextColor = isDarkMode ? '#cbd5e1' : '#475569';

    // A. المخطط الزمني
    const daysData = {};
    currentReportData.transactions.forEach(transaction => {
        if (!transaction.date) return;
        if (!daysData[transaction.date]) daysData[transaction.date] = { income: 0, expense: 0 };
        
        if (transaction.type === 'income') {
            daysData[transaction.date].income += Number(transaction.amount);
        } else {
            daysData[transaction.date].expense += Number(transaction.amount);
        }
    });

    const sortedDates = Object.keys(daysData).sort();
    
    if (financeChart) financeChart.destroy();
    financeChart = new Chart(document.getElementById('financeChart').getContext('2d'), {
        type: 'line',
        data: {
            labels: sortedDates,
            datasets: [
                { 
                    label: reportLanguageData.lblIncome, 
                    data: sortedDates.map(date => daysData[date].income), 
                    borderColor: '#10b981', 
                    backgroundColor: 'rgba(16, 185, 129, 0.1)', 
                    fill: true, 
                    tension: 0.4 
                },
                { 
                    label: reportLanguageData.lblExpense, 
                    data: sortedDates.map(date => daysData[date].expense), 
                    borderColor: '#ef4444', 
                    backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                    fill: true, 
                    tension: 0.4 
                }
            ]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { legend: { position: 'top', labels: { color: themeTextColor } } },
            scales: { x: { ticks: { color: themeTextColor } }, y: { ticks: { color: themeTextColor } } }
        }
    });

    // B. مخطط الإجراءات (حل مشكلة المسار الخاطئ للإجراء)
    const procedureCounts = {};
    const unspecifiedLabel = reportLanguageData.unspecified || "غير محدد";

    currentReportData.sessions.forEach(session => {
        // الوصول الآمن لاسم الإجراء اللي جوه dentalChart
        let procedureName = unspecifiedLabel;
        if (session.dentalChart && session.dentalChart.procedure) {
            procedureName = session.dentalChart.procedure;
        } else if (session.procedure) {
            procedureName = session.procedure; // حماية إضافية لو فيه داتا قديمة بره
        }
        
        procedureCounts[procedureName] = (procedureCounts[procedureName] || 0) + 1;
    });

    if (servicesChart) servicesChart.destroy();
    servicesChart = new Chart(document.getElementById('servicesChart').getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(procedureCounts),
            datasets: [{
                data: Object.values(procedureCounts),
                backgroundColor: ['#0284c7', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899']
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { legend: { position: 'right', labels: { color: themeTextColor } } } 
        }
    });

    // C. طرق التحصيل
    const methodTotals = { cash: 0, wallet: 0, instapay: 0 };
    currentReportData.transactions.forEach(transaction => {
        if (transaction.type === 'income') {
            const method = transaction.paymentMethod || 'cash';
            if (methodTotals[method] !== undefined) {
                methodTotals[method] += Number(transaction.amount);
            }
        }
    });

    if (methodsChart) methodsChart.destroy();
    methodsChart = new Chart(document.getElementById('methodsChart').getContext('2d'), {
        type: 'pie',
        data: {
            labels: [reportLanguageData.lblCash, reportLanguageData.lblWallet, reportLanguageData.lblBank],
            datasets: [{
                data: [methodTotals.cash, methodTotals.wallet, methodTotals.instapay],
                backgroundColor: ['#10b981', '#8b5cf6', '#0284c7']
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { legend: { position: 'bottom', labels: { color: themeTextColor } } } 
        }
    });
}

// 🔴 6. تصدير إكسيل 🔴
function exportReportToExcel() {
    const isArabic = document.body.dir === 'rtl';
    
    const excelData = currentReportData.transactions.map(transaction => {
        const rowData = {};
        rowData[isArabic ? "التاريخ" : "Date"] = transaction.date;
        rowData[isArabic ? "النوع" : "Type"] = transaction.type === 'income' ? (isArabic ? 'إيراد' : 'Income') : (isArabic ? 'مصروف' : 'Expense');
        rowData[isArabic ? "التصنيف" : "Category"] = transaction.category;
        rowData[isArabic ? "المبلغ" : "Amount"] = transaction.amount;
        rowData[isArabic ? "الفرع" : "Branch"] = transaction.branchId || (isArabic ? 'الفرع الرئيسي' : 'Main Branch');
        rowData[isArabic ? "طريقة الدفع" : "Payment Method"] = transaction.paymentMethod || (isArabic ? 'نقدي' : 'Cash');
        rowData[isArabic ? "البيان" : "Description"] = transaction.notes || "";
        rowData[isArabic ? "بواسطة" : "By"] = transaction.createdBy || "";
        return rowData;
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Financial Report");
    
    const todayString = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `NivaDent_Report_${todayString}.xlsx`);
}

// 🔴 7. التحميل 🔴
window.onload = () => {
    const savedLanguage = localStorage.getItem('preferredLang') || 'ar';
    document.body.dir = savedLanguage === 'en' ? 'ltr' : 'rtl';
    document.body.setAttribute('data-theme', localStorage.getItem('niva_theme') || 'light');
    
    updateLanguage(savedLanguage);
    loadBranchesDropdown();

    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            setReportPeriod('month', document.getElementById('chip-month')); 
        } else {
            console.warn("User is not authenticated. Please log in.");
        }
    });
};
