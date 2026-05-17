// js/finances.js
const db = firebase.firestore();
const clinicId = sessionStorage.getItem('clinicId'); 
const userRole = sessionStorage.getItem('userRole'); // 🔴 جلب وظيفة الموظف
const userBranch = sessionStorage.getItem('branchId') || 'main'; // 🔴 جلب فرع الموظف الافتراضي

let allTransactionsForEdit = []; 
let currentDisplayedData = []; 
let currentUserDisplayName = "مستخدم غير معروف";

// 🔴 متغيرات الـ Pagination (عرض المزيد) 🔴
let displayedTransactionsCount = 5;

// 🔴 دالة لجلب قائمة الفروع (للمدير فقط)
async function loadBranchesForAdmin() {
    if (userRole !== 'admin' && userRole !== 'superadmin') return;

    try {
        const snap = await db.collection("Branches").where("clinicId", "==", clinicId).get();
        const filterSelect = document.getElementById('branch-filter');
        
        if (!filterSelect) return;

        let optionsHtml = `<option value="all" id="opt-all-branches">كل الفروع</option>`;
        optionsHtml += `<option value="main">الفرع الرئيسي</option>`;

        snap.forEach(doc => {
            optionsHtml += `<option value="${doc.id}">${doc.data().name}</option>`;
        });

        filterSelect.innerHTML = optionsHtml;
        document.getElementById('admin-branch-group').style.display = 'block';
        filterSelect.value = userBranch;

        const lang = localStorage.getItem('preferredLang') || 'ar';
        if (lang === 'en') {
            const allOpt = document.getElementById('opt-all-branches');
            if (allOpt) allOpt.innerText = "All Branches";
        }
    } catch (e) {
        console.error("Error loading branches:", e);
    }
}

function updatePageContent(lang) {
    const t = {
        ar: {
            title: "المركز المالي والمحاسبي", sub: "إدارة الخزنة، البنوك، الإيرادات اليومية، المصروفات، والمديونيات",
            btnInc: "إضافة إيراد", btnExp: "إضافة مصروف", btnPrint: "طباعة التقرير",
            totInc: "إجمالي الإيرادات", totExp: "إجمالي المصروفات", net: "صافي الربح", debt: "إجمالي الديون الخارجية",
            ledger: "دفتر الخزنة وحركات الديون",
            thDate: "التاريخ والوقت", thType: "النوع", thCat: "البند", thAmount: "المبلغ", thNotes: "البيان", thAct: "إجراءات",
            mInc: "تسجيل إيراد جديد", mExp: "تسجيل مصروف جديد",
            lAmt: "المبلغ", lDate: "التاريخ", lCat: "البند", lNotes: "البيان / تفاصيل", btnSave: "حفظ العملية في الدفتر",
            catInc1: "كشف / جلسة مريض", catInc2: "سداد مديونية", catInc3: "إيرادات أخرى",
            catExp1: "مشتريات خامات ومخزون", catExp2: "مصروفات معمل", catExp3: "رواتب ومكافآت", catExp4: "فواتير (كهرباء/إيجار)", catExp5: "مصروفات أخرى",
            bInc: "إيراد", bExp: "مصروف", bDebt: "مديونية", confDel: "هل أنت متأكد من الحذف؟", empty: "لا توجد حركات مالية مطابقة للبحث.",
            lSearch: "بحث بالبيان أو الملاحظات", lType: "النوع", lDateFrom: "من تاريخ", lDateTo: "إلى تاريخ",
            optAllTypes: "الكل", optInc: "إيرادات", optExp: "مصروفات", optDebt: "مديونيات", btnSearch: "🔍 بحث",
            optAllBranches: "كل الفروع", lblBranch: "فرع العيادة"
        },
        en: {
            title: "Financial & Accounting Center", sub: "Manage treasury, banks, income, expenses, and debts",
            btnInc: "Add Income", btnExp: "Add Expense", btnPrint: "Print Report",
            totInc: "Total Income", totExp: "Total Expenses", net: "Net Profit", debt: "Total Debts",
            ledger: "Treasury & Debts Ledger",
            thDate: "Date & Time", thType: "Type", thCat: "Category", thAmount: "Amount", thNotes: "Notes", thAct: "Actions",
            mInc: "Record New Income", mExp: "Record New Expense",
            lAmt: "Amount", lDate: "Date", lCat: "Category", lNotes: "Details", btnSave: "Save Transaction",
            catInc1: "Patient Session", catInc2: "Debt Payment", catInc3: "Other Income",
            catExp1: "Inventory Purchase", catExp2: "Lab Expense", catExp3: "Salaries", catExp4: "Bills (Rent/Utility)", catExp5: "Other Expenses",
            bInc: "Income", bExp: "Expense", bDebt: "Debt", confDel: "Are you sure you want to delete?", empty: "No financial transactions match your search.",
            lSearch: "Search by Details", lType: "Type", lDateFrom: "From Date", lDateTo: "To Date",
            optAllTypes: "All", optInc: "Income", optExp: "Expense", optDebt: "Debts", btnSearch: "🔍 Search",
            optAllBranches: "All Branches", lblBranch: "Clinic Branch"
        }
    };
    const c = t[lang] || t.ar;
    const setTxt = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };

    setTxt('txt-title', c.title); setTxt('txt-subtitle', c.sub);
    setTxt('btn-add-inc', c.btnInc); setTxt('btn-add-exp', c.btnExp); setTxt('btn-print', c.btnPrint);
    setTxt('lbl-total-inc', c.totInc); setTxt('lbl-total-exp', c.totExp); setTxt('lbl-net', c.net); setTxt('lbl-debt', c.debt);
    setTxt('txt-ledger', c.ledger);
    
    setTxt('th-date', c.thDate); setTxt('th-type', c.thType); setTxt('th-cat', c.thCat); setTxt('th-amount', c.thAmount); setTxt('th-notes', c.thNotes); setTxt('th-action', c.thAct);
    setTxt('lbl-amount', c.lAmt); setTxt('lbl-date', c.lDate); setTxt('lbl-cat', c.lCat); setTxt('lbl-notes', c.lNotes); setTxt('btn-save', c.btnSave);
    
    setTxt('lbl-search', c.lSearch); setTxt('lbl-type', c.lType); setTxt('lbl-date-from', c.lDateFrom); setTxt('lbl-date-to', c.lDateTo);
    setTxt('opt-all-types', c.optAllTypes); setTxt('opt-inc', c.optInc); setTxt('opt-exp', c.optExp); 
    if(document.getElementById('opt-debt')) document.getElementById('opt-debt').innerText = c.optDebt;

    if(document.getElementById('opt-all-branches')) document.getElementById('opt-all-branches').innerText = c.optAllBranches;
    setTxt('lbl-branch-filter', c.lblBranch);
    
    const searchInput = document.getElementById('search_text');
    if(searchInput) searchInput.placeholder = lang === 'ar' ? "ابحث عن مريض أو ملاحظة..." : "Search patient or note...";
    
    const searchBtn = document.getElementById('btn-do-search');
    if(searchBtn) searchBtn.innerHTML = c.btnSearch;

    window.finLang = c;
}

function setDefaultDates() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    
    document.getElementById('date_from').value = firstDay;
    document.getElementById('date_to').value = lastDay;
}

function setQuickFilter(type) {
    document.getElementById('filter_type').value = type;
    document.getElementById('filter_method').value = 'all'; 
    
    document.querySelectorAll('.kpi-card').forEach(c => c.classList.remove('active-filter'));
    loadFinances();
}

function filterByMethodCard(method, element) {
    document.getElementById('filter_method').value = method;
    document.querySelectorAll('.kpi-card').forEach(c => c.classList.remove('active-filter'));
    if(element) element.classList.add('active-filter');
    filterTransactionsLocally(true); // 🔴 تصفير الـ Pagination عند البحث
}

function resetFilters() {
    document.getElementById('search_text').value = '';
    document.getElementById('filter_type').value = 'all';
    document.getElementById('filter_method').value = 'all';
    if(document.getElementById('branch-filter')) document.getElementById('branch-filter').value = userBranch; 
    document.querySelectorAll('.kpi-card').forEach(c => c.classList.remove('active-filter'));
    setDefaultDates();
    loadFinances();
}

function openTransactionModal(type) {
    document.getElementById('transactionForm').reset();
    document.getElementById('trans_date').value = new Date().toISOString().split('T')[0];
    document.getElementById('trans_type').value = type;
    document.getElementById('trans_method').value = 'cash'; 
    
    const select = document.getElementById('trans_category');
    select.innerHTML = '';
    
    if (type === 'income') {
        document.getElementById('modal-title').innerText = window.finLang.mInc;
        select.innerHTML = `
            <option value="${window.finLang.catInc1}">${window.finLang.catInc1}</option>
            <option value="${window.finLang.catInc2}">${window.finLang.catInc2}</option>
            <option value="${window.finLang.catInc3}">${window.finLang.catInc3}</option>
        `;
    } else {
        document.getElementById('modal-title').innerText = window.finLang.mExp;
        select.innerHTML = `
            <option value="${window.finLang.catExp1}">${window.finLang.catExp1}</option>
            <option value="${window.finLang.catExp2}">${window.finLang.catExp2}</option>
            <option value="${window.finLang.catExp3}">${window.finLang.catExp3}</option>
            <option value="${window.finLang.catExp4}">${window.finLang.catExp4}</option>
            <option value="${window.finLang.catExp5}">${window.finLang.catExp5}</option>
        `;
    }
    
    document.getElementById('transactionModal').style.display = 'flex';
}

function closeTransactionModal() { document.getElementById('transactionModal').style.display = 'none'; }
function closeEditTransactionModal() { document.getElementById('editTransactionModal').style.display = 'none'; }

async function saveTransaction(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save');
    btn.disabled = true; btn.innerText = "...";

    if (!clinicId) return;

    if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري حفظ العملية..." : "Saving transaction...");

    let targetBranchId = userBranch;
    if (userRole === 'admin' || userRole === 'superadmin') {
        const filterVal = document.getElementById('branch-filter').value;
        targetBranchId = filterVal === 'all' ? 'main' : filterVal;
    }

    const data = {
        clinicId: clinicId,
        branchId: targetBranchId, 
        type: document.getElementById('trans_type').value,
        amount: Number(document.getElementById('trans_amount').value),
        date: document.getElementById('trans_date').value,
        category: document.getElementById('trans_category').value,
        paymentMethod: document.getElementById('trans_method').value, 
        notes: document.getElementById('trans_notes').value.trim(),
        isManual: true, 
        createdBy: currentUserDisplayName,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection("Finances").add(data);
        closeTransactionModal();
        await loadFinances();
    } catch (error) { 
        console.error(error); 
    } finally { 
        btn.disabled = false; 
        btn.innerText = window.finLang.btnSave;
        if (window.hideLoader) window.hideLoader();
    }
}

function getAccurateTime(timestamp) {
    if (!timestamp) return Date.now();
    if (typeof timestamp.toMillis === 'function') return timestamp.toMillis();
    if (timestamp.seconds) return timestamp.seconds * 1000;
    return new Date(timestamp).getTime();
}

function sortDataLocally(dataArray) {
    dataArray.sort((a, b) => {
        const dateA = a.date || "";
        const dateB = b.date || "";
        if (dateA !== dateB) return dateB.localeCompare(dateA); 
        return getAccurateTime(b.createdAt) - getAccurateTime(a.createdAt);
    });
}

// 🔴 دوال عرض المزيد (Pagination) 🔴
window.loadMoreFinances = function() {
    displayedTransactionsCount += 5;
    filterTransactionsLocally(false);
};

function handleLoadMoreButton(totalLength) {
    let btnContainer = document.getElementById('load-more-finances-container');
    if (!btnContainer) {
        btnContainer = document.createElement('div');
        btnContainer.id = 'load-more-finances-container';
        btnContainer.style.cssText = 'text-align: center; margin-top: 15px; padding-bottom: 20px;';
        const table = document.getElementById('financesBody').closest('table');
        if(table && table.parentNode) table.parentNode.insertBefore(btnContainer, table.nextSibling);
    }

    if (displayedTransactionsCount < totalLength) {
        const isAr = (localStorage.getItem('preferredLang') || 'ar') === 'ar';
        btnContainer.innerHTML = `<button class="btn-action no-print" style="background:#0f172a; color:#fff; padding:8px 30px; border-radius:8px; font-weight:bold; cursor:pointer;" onclick="loadMoreFinances()">⬇️ ${isAr ? 'عرض المزيد (5)' : 'Load More (5)'}</button>`;
        btnContainer.style.display = 'block';
    } else {
        if(btnContainer) btnContainer.style.display = 'none';
    }
}

async function loadFinances() {
    if (!clinicId) return;
    
    const filterType = document.getElementById('filter_type').value;
    const dateFrom = document.getElementById('date_from').value;
    const dateTo = document.getElementById('date_to').value;

    const tbody = document.getElementById('financesBody');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">جاري تجميع البيانات...</td></tr>';
    
    if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري سحب دفتر الحسابات..." : "Loading finances...");

    let combinedData = [];

    try {
        let finQuery = db.collection("Finances").where("clinicId", "==", clinicId);
        
        if (userRole !== 'admin' && userRole !== 'superadmin') {
            finQuery = finQuery.where("branchId", "==", userBranch);
        } else {
            const selectedBranch = document.getElementById('branch-filter').value;
            if (selectedBranch && selectedBranch !== 'all') {
                finQuery = finQuery.where("branchId", "==", selectedBranch);
            }
        }
        
        if (dateFrom) finQuery = finQuery.where("date", ">=", dateFrom);
        if (dateTo) finQuery = finQuery.where("date", "<=", dateTo);

        const finSnap = await finQuery.get();
        
        finSnap.forEach(doc => {
            const d = doc.data({ serverTimestamps: 'estimate' });
            if (filterType !== 'all' && d.type !== filterType) return;
            combinedData.push({ id: doc.id, ...d });
        });

        sortDataLocally(combinedData);

        allTransactionsForEdit = combinedData;
        currentDisplayedData = combinedData;
        
        filterTransactionsLocally(true); // 🔴 تصفير العداد لـ 5 عند التحميل
        calculateOverallBalances();

    } catch (error) {
        console.error("Error loading finances:", error);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red;">حدث خطأ في تحميل البيانات.</td></tr>';
    } finally {
        if (window.hideLoader) window.hideLoader();
    }
}

async function calculateOverallBalances() {
    if (!clinicId) return;
    try {
        let balQuery = db.collection("Finances").where("clinicId", "==", clinicId);
        
        if (userRole !== 'admin' && userRole !== 'superadmin') {
            balQuery = balQuery.where("branchId", "==", userBranch);
        } else {
            const selectedBranch = document.getElementById('branch-filter').value;
            if (selectedBranch && selectedBranch !== 'all') {
                balQuery = balQuery.where("branchId", "==", selectedBranch);
            }
        }

        const snap = await balQuery.get();
        let netCash = 0, netWallet = 0, netBank = 0;

        snap.forEach(doc => {
            const d = doc.data();
            const method = d.paymentMethod || 'cash';
            const amt = Number(d.amount) || 0;

            if (d.type === 'income') {
                if (method === 'cash') netCash += amt;
                else if (method === 'wallet') netWallet += amt;
                else if (method === 'instapay') netBank += amt;
            } else if (d.type === 'expense') {
                if (method === 'cash') netCash -= amt;
                else if (method === 'wallet') netWallet -= amt;
                else if (method === 'instapay') netBank -= amt;
            }
        });

        document.getElementById('stat-bal-cash').innerText = netCash.toLocaleString();
        document.getElementById('stat-bal-wallet').innerText = netWallet.toLocaleString();
        document.getElementById('stat-bal-bank').innerText = netBank.toLocaleString();

    } catch (error) {
        console.error("Error calculating balances:", error);
    }
}

function filterTransactionsLocally(resetPagination = false) {
    if (resetPagination) displayedTransactionsCount = 5;

    const searchText = document.getElementById('search_text').value.trim().toLowerCase();
    const filterMethod = document.getElementById('filter_method').value; 
    
    let dataToRender = allTransactionsForEdit;
    
    if (searchText) {
        dataToRender = dataToRender.filter(item => 
            (item.notes && item.notes.toLowerCase().includes(searchText)) || 
            (item.category && item.category.toLowerCase().includes(searchText)) ||
            (item.createdBy && item.createdBy.toLowerCase().includes(searchText))
        );
    }

    if (filterMethod !== 'all') {
        dataToRender = dataToRender.filter(item => {
            const method = item.paymentMethod || 'cash';
            return method === filterMethod;
        });
    }
    
    // 🔴 تطبيق الـ Pagination 🔴
    let pagedData = dataToRender;
    // لو مفيش بحث، اعرض 5 بـ 5.. لو فيه بحث، اعرض كله عشان تلاقي اللي بتدور عليه
    if (!searchText) {
        pagedData = dataToRender.slice(0, displayedTransactionsCount);
        handleLoadMoreButton(dataToRender.length);
    } else {
        const moreBtn = document.getElementById('load-more-finances-container');
        if (moreBtn) moreBtn.style.display = 'none';
    }

    renderFinancesTable(pagedData, dataToRender);
}

// 🔴 تم إضافة fullData عشان الإجماليات اللي فوق تتحسب صح على الكل مش الـ 5 المعروضين بس 🔴
function renderFinancesTable(pagedData, fullData = null) {
    const tbody = document.getElementById('financesBody');
    tbody.innerHTML = '';
    
    let totalInc = 0;
    let totalExp = 0;
    let totalDebt = 0;

    if(pagedData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #64748b;">${window.finLang.empty}</td></tr>`;
    }

    const isAr = (localStorage.getItem('preferredLang') || 'ar') === 'ar';
    const dataToCalculate = fullData || pagedData;

    dataToCalculate.forEach(f => {
        if (f.type === 'income') totalInc += Number(f.amount);
        else if (f.type === 'expense') totalExp += Number(f.amount);
        else if (f.type === 'debt') totalDebt += Number(f.amount);
    });

    pagedData.forEach(f => {
        let timeStr = '---';
        if (f.createdAt) {
            try {
                const d = typeof f.createdAt.toDate === 'function' ? f.createdAt.toDate() : new Date(f.createdAt);
                timeStr = d.toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {hour: '2-digit', minute:'2-digit'});
            } catch(e) { timeStr = '---'; }
        }

        let badgeClass = 'badge-exp';
        let typeTxt = window.finLang.bExp;
        let amountColor = '#dc2626';
        let amountSign = '-';

        let displayAmount = Math.abs(Number(f.amount));

        if (f.type === 'income') {
            badgeClass = 'badge-inc';
            typeTxt = window.finLang.bInc;
            amountColor = '#059669';
            amountSign = '+';
        } else if (f.type === 'debt') {
            badgeClass = ''; 
            if (Number(f.amount) < 0) {
                typeTxt = isAr ? "تخفيض مديونية" : "Debt Deduction";
                amountColor = '#10b981'; // أخضر
                amountSign = '🔻'; 
            } else {
                typeTxt = window.finLang.bDebt || "مديونية";
                amountColor = '#d97706'; // برتقالي
                amountSign = '🔺'; 
            }
        }

        let createdByHtml = '';
        if (f.createdBy) {
            createdByHtml = `<div style="margin-top: 5px;"><span style="background: #f1f5f9; color: #64748b; font-size: 11px; padding: 2px 6px; border-radius: 4px; border: 1px solid #e2e8f0;">👤 ${isAr ? 'بواسطة:' : 'By:'} ${f.createdBy}</span></div>`;
        }

        let methodHtml = '';
        const methodVal = f.paymentMethod || 'cash';
        if (methodVal === 'cash') methodHtml = '💵 نقدي';
        else if (methodVal === 'wallet') methodHtml = '📱 محفظة';
        else if (methodVal === 'instapay') methodHtml = '🏦 بنكي';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div style="display: flex; flex-direction: column;">
                    <span style="font-weight: bold; color: #475569;">${f.date}</span>
                    <span style="font-size: 16px; color: #000; font-weight: bold;">${timeStr}</span>
                </div>
            </td>
            <td><span class="${badgeClass}" style="${f.type === 'debt' ? 'background: #fef3c7; color: #b45309; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 12px;' : ''}">${typeTxt}</span></td>
            <td>
                <div style="font-weight: bold; color: #0f172a;">${f.category}</div>
                ${createdByHtml}
            </td>
            <td class="amount-text" style="color: ${amountColor}; font-weight: bold;" dir="ltr">${amountSign} ${displayAmount}</td>
            <td style="color: #475569; font-weight: bold; font-size: 13px;">${methodHtml}</td> <td>${f.notes || '---'}</td>
            <td class="no-print" style="text-align: center;">
                <button class="btn-primary" style="background:#f59e0b; padding: 5px 10px; font-size:12px; margin-right:5px;" onclick="openEditTrans('${f.id}')">✏️</button>
                <button class="btn-danger" style="padding: 5px 10px; font-size:12px;" onclick="deleteTransaction('${f.id}')">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('stat-income').innerText = totalInc.toLocaleString();
    document.getElementById('stat-expense').innerText = totalExp.toLocaleString();
    
    const netProfit = totalInc - totalExp;
    document.getElementById('stat-net').innerText = netProfit.toLocaleString();
    document.getElementById('stat-net').style.color = netProfit >= 0 ? '#0284C7' : '#ef4444';
    
    if(document.getElementById('stat-debt')) {
        document.getElementById('stat-debt').innerText = totalDebt.toLocaleString();
    }
}

async function printShiftClosure() {
    const todayDate = new Date();
    todayDate.setMinutes(todayDate.getMinutes() - todayDate.getTimezoneOffset());
    const today = todayDate.toISOString().split('T')[0];
    
    const isAr = (localStorage.getItem('preferredLang') || 'ar') === 'ar';
    
    if (window.showLoader) window.showLoader(isAr ? "جاري تجميع حركات الدرج..." : "Calculating shift...");

    try {
        let shiftQuery = db.collection("Finances")
            .where("clinicId", "==", clinicId)
            .where("date", "==", today);

        let printedBranchName = isAr ? "الفرع الرئيسي" : "Main Branch";

        if (userRole !== 'admin' && userRole !== 'superadmin') {
            shiftQuery = shiftQuery.where("branchId", "==", userBranch);
        } else {
            const selectedBranch = document.getElementById('branch-filter').value;
            if (selectedBranch && selectedBranch !== 'all') {
                shiftQuery = shiftQuery.where("branchId", "==", selectedBranch);
                const selectElement = document.getElementById('branch-filter');
                printedBranchName = selectElement.options[selectElement.selectedIndex].text;
            } else {
                printedBranchName = isAr ? "كل الفروع" : "All Branches";
            }
        }

        const snap = await shiftQuery.get();

        let shiftCashIn = 0;
        let shiftCashOut = 0;

        snap.forEach(doc => {
            const d = doc.data();
            const method = d.paymentMethod || 'cash';
            
            if (method === 'cash') {
                if (d.type === 'income') shiftCashIn += Number(d.amount);
                else if (d.type === 'expense') shiftCashOut += Number(d.amount);
            }
        });

        const shiftNet = shiftCashIn - shiftCashOut;

        document.getElementById('sh-date').innerText = new Date().toLocaleString('ar-EG');
        document.getElementById('sh-user').innerText = currentUserDisplayName;
        document.getElementById('sh-branch').innerText = printedBranchName; 
        document.getElementById('sh-income').innerText = shiftCashIn + (isAr ? ' ج.م' : ' EGP');
        document.getElementById('sh-expense').innerText = shiftCashOut + (isAr ? ' ج.م' : ' EGP');
        document.getElementById('sh-net').innerText = shiftNet + (isAr ? ' ج.م' : ' EGP');

        const style = document.createElement('style');
        style.id = 'hide-table-on-shift-print';
        style.innerHTML = '@media print { table, .card, .search-box, .kpi-card, button, input, select { display: none !important; } }';
        document.head.appendChild(style);

        window.print();

        setTimeout(() => {
            const el = document.getElementById('hide-table-on-shift-print');
            if(el) el.remove();
        }, 500);

    } catch (e) {
        console.error(e);
        alert(isAr ? "خطأ في حساب الشيفت" : "Error calculating shift");
    } finally {
        if (window.hideLoader) window.hideLoader();
    }
}

function openEditTrans(docId) {
    const trans = allTransactionsForEdit.find(t => t.id === docId);
    if(!trans) return;

    document.getElementById('edit_trans_id').value = trans.id;
    document.getElementById('edit_trans_amount').value = trans.amount;
    document.getElementById('edit_trans_date').value = trans.date;
    document.getElementById('edit_trans_method').value = trans.paymentMethod || 'cash';
    document.getElementById('edit_trans_notes').value = trans.notes;
    
    document.getElementById('editTransactionModal').style.display = 'flex';
}

async function updateTransaction(e) {
    e.preventDefault();
    const docId = document.getElementById('edit_trans_id').value;
    const newAmount = Number(document.getElementById('edit_trans_amount').value);
    const newDate = document.getElementById('edit_trans_date').value;
    const newMethod = document.getElementById('edit_trans_method').value;
    const newNotes = document.getElementById('edit_trans_notes').value;

    if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري التحديث..." : "Updating...");

    try {
        await db.collection("Finances").doc(docId).update({
            amount: newAmount,
            date: newDate,
            paymentMethod: newMethod,
            notes: newNotes
        });
        closeEditTransactionModal();
        await loadFinances(); 
    } catch(e) { 
        console.error(e); 
    } finally {
        if (window.hideLoader) window.hideLoader();
    }
}

async function deleteTransaction(docId) {
    if(confirm(window.finLang.confDel)) {
        if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري الحذف..." : "Deleting...");

        try { 
            await db.collection("Finances").doc(docId).delete(); 
            await loadFinances(); 
        } catch (e) { 
            console.error(e); 
        } finally {
            if (window.hideLoader) window.hideLoader();
        }
    }
}

window.onload = () => {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.body.dir = lang === 'en' ? 'ltr' : 'rtl';
    updatePageContent(lang);
    setDefaultDates(); 
    
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) { 
            try {
                const userDoc = await db.collection("Users").doc(user.email).get();
                if (userDoc.exists) {
                    currentUserDisplayName = userDoc.data().name || "مدير النظام";
                }
            } catch(e) { console.error("Error fetching user name"); }
            
            await loadBranchesForAdmin(); 
            loadFinances(); 
        }
    });
};

['click', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    }, {passive: true});
});
