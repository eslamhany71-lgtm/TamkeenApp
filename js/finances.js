const db = firebase.firestore();
const clinicId = sessionStorage.getItem('clinicId'); 
let allTransactionsForEdit = []; 
let currentDisplayedData = []; 

let currentUserDisplayName = "مستخدم غير معروف";

function updatePageContent(lang) {
    const t = {
        ar: {
            title: "الحسابات والمصروفات", sub: "إدارة الخزنة، الإيرادات اليومية، المصروفات، والمديونيات",
            btnInc: "إضافة إيراد", btnExp: "إضافة مصروف", btnPrint: "طباعة التقرير",
            totInc: "إجمالي الإيرادات", totExp: "إجمالي المصروفات", net: "صافي الربح", debt: "إجمالي الديون الخارجية",
            ledger: "دفتر الخزنة وحركات الديون",
            thDate: "التاريخ والوقت", thType: "النوع", thCat: "البند", thAmount: "المبلغ", thNotes: "البيان", thAct: "إجراءات",
            mInc: "تسجيل إيراد جديد", mExp: "تسجيل مصروف جديد",
            lAmt: "المبلغ", lDate: "التاريخ", lCat: "البند", lNotes: "البيان / تفاصيل", btnSave: "حفظ العملية",
            catInc1: "كشف / جلسة مريض", catInc2: "دفعة مقدمة", catInc3: "إيرادات أخرى",
            catExp1: "مستلزمات طبية", catExp2: "معمل أسنان", catExp3: "رواتب ومكافآت", catExp4: "فواتير (كهرباء/إيجار)", catExp5: "مصروفات أخرى",
            bInc: "إيراد", bExp: "مصروف", bDebt: "مديونية", confDel: "هل أنت متأكد من الحذف؟", empty: "لا توجد حركات مالية مطابقة للبحث.",
            lSearch: "بحث بالبيان أو الملاحظات", lType: "النوع", lDateFrom: "من تاريخ", lDateTo: "إلى تاريخ",
            optAllTypes: "الكل", optInc: "إيرادات", optExp: "مصروفات", optDebt: "مديونيات", btnSearch: "🔍 بحث"
        },
        en: {
            title: "Finances & Expenses", sub: "Manage treasury, daily income, expenses, and debts",
            btnInc: "Add Income", btnExp: "Add Expense", btnPrint: "Print Report",
            totInc: "Total Income", totExp: "Total Expenses", net: "Net Profit", debt: "Total Debts",
            ledger: "Treasury & Debts Ledger",
            thDate: "Date & Time", thType: "Type", thCat: "Category", thAmount: "Amount", thNotes: "Notes", thAct: "Actions",
            mInc: "Record New Income", mExp: "Record New Expense",
            lAmt: "Amount", lDate: "Date", lCat: "Category", lNotes: "Details", btnSave: "Save Transaction",
            catInc1: "Patient Session", catInc2: "Advance Payment", catInc3: "Other Income",
            catExp1: "Medical Supplies", catExp2: "Dental Lab", catExp3: "Salaries", catExp4: "Bills (Rent/Utility)", catExp5: "Other Expenses",
            bInc: "Income", bExp: "Expense", bDebt: "Debt", confDel: "Are you sure you want to delete?", empty: "No financial transactions match your search.",
            lSearch: "Search by Details", lType: "Type", lDateFrom: "From Date", lDateTo: "To Date",
            optAllTypes: "All", optInc: "Income", optExp: "Expense", optDebt: "Debts", btnSearch: "🔍 Search"
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
    loadFinances();
}

function resetFilters() {
    document.getElementById('search_text').value = '';
    document.getElementById('filter_type').value = 'all';
    setDefaultDates();
    loadFinances();
}

function openTransactionModal(type) {
    document.getElementById('transactionForm').reset();
    document.getElementById('trans_date').value = new Date().toISOString().split('T')[0];
    document.getElementById('trans_type').value = type;
    
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

    const data = {
        clinicId: clinicId,
        type: document.getElementById('trans_type').value,
        amount: Number(document.getElementById('trans_amount').value),
        date: document.getElementById('trans_date').value,
        category: document.getElementById('trans_category').value,
        notes: document.getElementById('trans_notes').value.trim(),
        isManual: true, 
        createdBy: currentUserDisplayName,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection("Finances").add(data);
        closeTransactionModal();
        loadFinances();
    } catch (error) { console.error(error); }
    finally { btn.disabled = false; btn.innerText = window.finLang.btnSave; }
}

async function loadFinances() {
    if (!clinicId) return;
    
    const filterType = document.getElementById('filter_type').value;
    const dateFrom = document.getElementById('date_from').value;
    const dateTo = document.getElementById('date_to').value;

    const tbody = document.getElementById('financesBody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">جاري تجميع البيانات...</td></tr>';
    
    let combinedData = [];

    try {
        // 🔴 حماية الباقة: بنخلي الفايربيز يجيب حركات التاريخ ده بس، ويرتبها بالـ date لضمان الأوفلاين 🔴
        let finQuery = db.collection("Finances").where("clinicId", "==", clinicId);
        
        if (dateFrom) finQuery = finQuery.where("date", ">=", dateFrom);
        if (dateTo) finQuery = finQuery.where("date", "<=", dateTo);
        
        finQuery = finQuery.orderBy("date", "desc");

        const finSnap = await finQuery.get();
        
        finSnap.forEach(doc => {
            const d = doc.data();
            // الفلترة بالنوع تتم محلياً لتجنب الـ Indexes المعقدة
            if (filterType !== 'all' && d.type !== filterType) return;
            combinedData.push({ id: doc.id, ...d });
        });

        allTransactionsForEdit = combinedData;
        currentDisplayedData = combinedData;
        
        filterTransactionsLocally();

    } catch (error) {
        console.error("Error loading finances:", error);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">حدث خطأ في تحميل البيانات.</td></tr>';
    }
}

function filterTransactionsLocally() {
    const searchText = document.getElementById('search_text').value.trim().toLowerCase();
    
    let dataToRender = allTransactionsForEdit;
    if (searchText) {
        dataToRender = allTransactionsForEdit.filter(item => 
            (item.notes && item.notes.toLowerCase().includes(searchText)) || 
            (item.category && item.category.toLowerCase().includes(searchText)) ||
            (item.createdBy && item.createdBy.toLowerCase().includes(searchText))
        );
    }
    
    renderFinancesTable(dataToRender);
}

function renderFinancesTable(dataArray) {
    const tbody = document.getElementById('financesBody');
    tbody.innerHTML = '';
    
    let totalInc = 0;
    let totalExp = 0;
    let totalDebt = 0;

    if(dataArray.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #64748b;">${window.finLang.empty}</td></tr>`;
    }

    const isAr = (localStorage.getItem('preferredLang') || 'ar') === 'ar';

    dataArray.forEach(f => {
        if (f.type === 'income') totalInc += Number(f.amount);
        else if (f.type === 'expense') totalExp += Number(f.amount);
        else if (f.type === 'debt') totalDebt += Number(f.amount);

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

        if (f.type === 'income') {
            badgeClass = 'badge-inc';
            typeTxt = window.finLang.bInc;
            amountColor = '#059669';
            amountSign = '+';
        } else if (f.type === 'debt') {
            badgeClass = ''; 
            typeTxt = window.finLang.bDebt || "مديونية";
            amountColor = '#d97706'; 
            amountSign = ''; 
        }

        let createdByHtml = '';
        if (f.createdBy) {
            createdByHtml = `<div style="margin-top: 5px;"><span style="background: #f1f5f9; color: #64748b; font-size: 11px; padding: 2px 6px; border-radius: 4px; border: 1px solid #e2e8f0;">👤 ${isAr ? 'بواسطة:' : 'By:'} ${f.createdBy}</span></div>`;
        }

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
            <td class="amount-text" style="color: ${amountColor}; font-weight: bold;" dir="ltr">${amountSign} ${f.amount}</td>
            <td>${f.notes || '---'}</td>
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

function openEditTrans(docId) {
    const trans = allTransactionsForEdit.find(t => t.id === docId);
    if(!trans) return;

    document.getElementById('edit_trans_id').value = trans.id;
    document.getElementById('edit_trans_amount').value = trans.amount;
    document.getElementById('edit_trans_date').value = trans.date;
    document.getElementById('edit_trans_notes').value = trans.notes;
    
    document.getElementById('editTransactionModal').style.display = 'flex';
}

async function updateTransaction(e) {
    e.preventDefault();
    const docId = document.getElementById('edit_trans_id').value;
    const newAmount = Number(document.getElementById('edit_trans_amount').value);
    const newDate = document.getElementById('edit_trans_date').value;
    const newNotes = document.getElementById('edit_trans_notes').value;

    try {
        await db.collection("Finances").doc(docId).update({
            amount: newAmount,
            date: newDate,
            notes: newNotes
        });
        closeEditTransactionModal();
        loadFinances(); 
    } catch(e) { console.error(e); }
}

async function deleteTransaction(docId) {
    if(confirm(window.finLang.confDel)) {
        try { 
            await db.collection("Finances").doc(docId).delete(); 
            loadFinances(); 
        } 
        catch (e) { console.error(e); }
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
