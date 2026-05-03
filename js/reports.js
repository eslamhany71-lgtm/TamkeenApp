// js/reports.js
const db = firebase.firestore();
const clinicId = sessionStorage.getItem('clinicId');

let financeChart, servicesChart, methodsChart;
let currentReportData = {
    transactions: [],
    sessions: [],
    patients: []
};

// 🔴 1. إعدادات اللغة (قاموس كامل ومقروء) 🔴
function updatePageContent(lang) {
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

    const currentLang = translations[lang] || translations.ar;

    const setElementText = (id, text) => {
        const element = document.getElementById(id);
        if (element) {
            element.innerText = text;
        }
    };

    setElementText('txt-title', currentLang.title);
    setElementText('txt-subtitle', currentLang.subtitle);
    setElementText('btn-export', currentLang.btnExport);
    setElementText('btn-print', currentLang.btnPrint);
    
    if(document.getElementById('opt-all-branches')) {
        document.getElementById('opt-all-branches').innerText = currentLang.optAllBranches;
    }

    setElementText('chip-month', currentLang.chipMonth);
    setElementText('chip-week', currentLang.chipWeek);
    setElementText('chip-year', currentLang.chipYear);
    setElementText('chip-all', currentLang.chipAll);
    setElementText('lbl-to', currentLang.lblTo);
    setElementText('btn-update', currentLang.btnUpdate);

    setElementText('txt-kpi-income', currentLang.kpiIncome);
    setElementText('txt-kpi-expense', currentLang.kpiExpense);
    setElementText('txt-kpi-net', currentLang.kpiNet);
    setElementText('txt-kpi-new-patients', currentLang.kpiNewPatients);

    setElementText('txt-chart-finance', currentLang.chartFinance);
    setElementText('txt-chart-services', currentLang.chartServices);
    setElementText('txt-chart-methods', currentLang.chartMethods);
    setElementText('txt-chart-table', currentLang.chartTable);

    setElementText('th-date', currentLang.thDate);
    setElementText('th-category', currentLang.thCategory);
    setElementText('th-notes', currentLang.thNotes);
    setElementText('th-amount', currentLang.thAmount);
    setElementText('txt-loading-table', currentLang.loadingTable);

    window.reportLanguageData = currentLang;
}

// 🔴 2. جلب الفروع لقائمة الفلتر 🔴
function loadBranchesDropdown() {
    if (!clinicId) return;
    
    const selectElement = document.getElementById('branch_filter');
    if (!selectElement) return;

    db.collection("Branches").where("clinicId", "==", clinicId).get().then(snapshot => {
        snapshot.forEach(doc => {
            const branchData = doc.data();
            selectElement.innerHTML += `<option value="${doc.id}">${branchData.name}</option>`;
        });
    }).catch(error => {
        console.error("Error loading branches: ", error);
    });
}

// 🔴 3. إعدادات البداية والفلاتر (كما كانت في الكود الأصلي) 🔴
function setReportPeriod(period, element) {
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    
    if (element) {
        element.classList.add('active');
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
    
    const branchSelectElement = document.getElementById('branch_filter');
    const selectedBranch = branchSelectElement ? branchSelectElement.value : 'all';

    if (window.showLoader) {
        window.showLoader(window.reportLanguageData ? window.reportLanguageData.loadingTable : "جاري إعداد التقارير...");
    }

    try {
        // أ. جلب الحركات المالية
        const financesSnapshot = await db.collection("Finances")
            .where("clinicId", "==", clinicId)
            .where("date", ">=", dateFrom)
            .where("date", "<=", dateTo)
            .get();
        
        currentReportData.transactions = financesSnapshot.docs.map(doc => doc.data()).filter(transaction => {
            if (selectedBranch === 'all') return true;
            const transactionBranch = transaction.branchId || 'main';
            return transactionBranch === selectedBranch;
        });

        // ب. جلب الجلسات (لتحليل الإجراءات)
        const sessionsSnapshot = await db.collection("Sessions")
            .where("clinicId", "==", clinicId)
            .where("date", ">=", dateFrom)
            .where("date", "<=", dateTo)
            .get();
        
        currentReportData.sessions = sessionsSnapshot.docs.map(doc => doc.data()).filter(session => {
            if (selectedBranch === 'all') return true;
            const sessionBranch = session.branchId || 'main';
            return sessionBranch === selectedBranch;
        });

        // ج. جلب المرضى الجدد
        const patientsSnapshot = await db.collection("Patients")
            .where("clinicId", "==", clinicId)
            .get(); 
        
        currentReportData.patients = patientsSnapshot.docs.map(doc => doc.data()).filter(patient => {
            if (selectedBranch !== 'all') {
                const patientBranch = patient.branchId || 'main';
                if (patientBranch !== selectedBranch) return false;
            }

            if (!patient.createdAt) return false;
            
            // معالجة التاريخ بأمان ليتوافق مع البيانات القديمة
            let patientDate = "";
            try {
                if (typeof patient.createdAt.toDate === 'function') {
                    patientDate = patient.createdAt.toDate().toISOString().split('T')[0];
                } else {
                    patientDate = new Date(patient.createdAt).toISOString().split('T')[0];
                }
            } catch (error) {
                return false;
            }
            
            return patientDate >= dateFrom && patientDate <= dateTo;
        });

        // 🔴 3. معالجة الداتا وعرضها 🔴
        calculateKPIs();
        renderFinanceChart();
        renderServicesChart();
        renderMethodsChart();
        renderDetailedTable();

    } catch (error) {
        console.error("Reports Error:", error);
    } finally {
        if (window.hideLoader) {
            window.hideLoader();
        }
    }
}

function calculateKPIs() {
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
}

// 🔴 5. رسم المخططات البيانية (محسنة الأبعاد واللون) 🔴

function getThemeTextColor() {
    const isDarkMode = document.body.getAttribute('data-theme') === 'dark';
    return isDarkMode ? '#cbd5e1' : '#475569';
}

function renderFinanceChart() {
    const canvasElement = document.getElementById('financeChart');
    if (!canvasElement) return;
    
    const ctx = canvasElement.getContext('2d');
    if (financeChart) {
        financeChart.destroy();
    }

    const daysData = {};
    currentReportData.transactions.forEach(transaction => {
        if (!daysData[transaction.date]) {
            daysData[transaction.date] = { income: 0, expense: 0 };
        }
        
        if (transaction.type === 'income') {
            daysData[transaction.date].income += Number(transaction.amount);
        } else if (transaction.type === 'expense') {
            daysData[transaction.date].expense += Number(transaction.amount);
        }
    });

    const sortedDates = Object.keys(daysData).sort();
    const themeTextColor = getThemeTextColor();
    
    const labelIncome = window.reportLanguageData ? window.reportLanguageData.lblIncome : 'إيرادات';
    const labelExpense = window.reportLanguageData ? window.reportLanguageData.lblExpense : 'مصروفات';

    financeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedDates,
            datasets: [
                { 
                    label: labelIncome, 
                    data: sortedDates.map(date => daysData[date].income), 
                    borderColor: '#10b981', 
                    backgroundColor: 'rgba(16, 185, 129, 0.1)', 
                    fill: true, 
                    tension: 0.4 
                },
                { 
                    label: labelExpense, 
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
            plugins: { 
                legend: { 
                    position: 'top', 
                    labels: { color: themeTextColor } 
                } 
            },
            scales: {
                x: { ticks: { color: themeTextColor } },
                y: { ticks: { color: themeTextColor } }
            }
        }
    });
}

function renderServicesChart() {
    const canvasElement = document.getElementById('servicesChart');
    if (!canvasElement) return;

    const ctx = canvasElement.getContext('2d');
    if (servicesChart) {
        servicesChart.destroy();
    }

    const procedureCounts = {};
    const unspecifiedLabel = window.reportLanguageData ? window.reportLanguageData.unspecified : "غير محدد";

    currentReportData.sessions.forEach(session => {
        const procedureName = session.procedure || unspecifiedLabel;
        procedureCounts[procedureName] = (procedureCounts[procedureName] || 0) + 1;
    });

    const themeTextColor = getThemeTextColor();

    servicesChart = new Chart(ctx, {
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
            plugins: { 
                legend: { 
                    position: 'right', 
                    labels: { color: themeTextColor } 
                } 
            } 
        }
    });
}

function renderMethodsChart() {
    const canvasElement = document.getElementById('methodsChart');
    if (!canvasElement) return;

    const ctx = canvasElement.getContext('2d');
    if (methodsChart) {
        methodsChart.destroy();
    }

    const methodTotals = { cash: 0, wallet: 0, instapay: 0 };
    
    currentReportData.transactions.forEach(transaction => {
        if (transaction.type === 'income') {
            const method = transaction.paymentMethod || 'cash';
            if (methodTotals[method] !== undefined) {
                methodTotals[method] += Number(transaction.amount);
            }
        }
    });

    const themeTextColor = getThemeTextColor();
    const labelCash = window.reportLanguageData ? window.reportLanguageData.lblCash : 'نقدي';
    const labelWallet = window.reportLanguageData ? window.reportLanguageData.lblWallet : 'محافظ';
    const labelBank = window.reportLanguageData ? window.reportLanguageData.lblBank : 'بنوك';

    methodsChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: [labelCash, labelWallet, labelBank],
            datasets: [{
                data: [methodTotals.cash, methodTotals.wallet, methodTotals.instapay],
                backgroundColor: ['#10b981', '#8b5cf6', '#0284c7']
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { 
                legend: { 
                    position: 'bottom', 
                    labels: { color: themeTextColor } 
                } 
            } 
        }
    });
}

function renderDetailedTable() {
    const tableBody = document.getElementById('detailedReportBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    currentReportData.transactions.sort((a, b) => b.date.localeCompare(a.date));
    
    if (currentReportData.transactions.length === 0) {
        const noDataMessage = window.reportLanguageData ? window.reportLanguageData.noData : "لا توجد حركات مالية في هذه الفترة.";
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 15px; color: #64748b;">${noDataMessage}</td></tr>`;
        return;
    }

    currentReportData.transactions.forEach(transaction => {
        const tableRow = document.createElement('tr');
        const amountColor = transaction.type === 'income' ? '#10b981' : '#ef4444';
        const amountSign = transaction.type === 'income' ? '+' : '-';
        
        tableRow.innerHTML = `
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${transaction.date}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;"><strong>${transaction.category}</strong></td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${transaction.notes || '---'}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: ${amountColor}; font-weight: bold;" dir="ltr">${amountSign} ${transaction.amount}</td>
        `;
        tableBody.appendChild(tableRow);
    });
}

// 🔴 6. تصدير إكسيل (بكامل التفاصيل) 🔴
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

// 🔴 7. التحميل وتأكيد حالة المستخدم 🔴
window.onload = () => {
    const savedLanguage = localStorage.getItem('preferredLang') || 'ar';
    document.body.dir = savedLanguage === 'en' ? 'ltr' : 'rtl';
    
    const savedTheme = localStorage.getItem('niva_theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    
    updatePageContent(savedLanguage);
    loadBranchesDropdown();

    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            const defaultFilterElement = document.getElementById('chip-month');
            setReportPeriod('month', defaultFilterElement); 
        } else {
            console.warn("User is not authenticated. Please log in.");
        }
    });
};
