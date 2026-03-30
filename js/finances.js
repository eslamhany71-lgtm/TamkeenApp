const db = firebase.firestore();
const clinicId = sessionStorage.getItem('clinicId'); 

function updatePageContent(lang) {
    const t = {
        ar: {
            title: "الحسابات والمصروفات", sub: "إدارة الخزنة، الإيرادات اليومية، والمصروفات",
            btnInc: "إضافة إيراد", btnExp: "إضافة مصروف", btnPrint: "طباعة التقرير",
            totInc: "إجمالي الإيرادات (للفترة المحددة)", totExp: "إجمالي المصروفات (للفترة المحددة)", net: "صافي الربح",
            ledger: "دفتر الخزنة",
            thDate: "التاريخ", thType: "النوع", thCat: "البند", thAmount: "المبلغ", thNotes: "البيان", thAct: "إجراءات",
            mInc: "تسجيل إيراد جديد", mExp: "تسجيل مصروف جديد",
            lAmt: "المبلغ", lDate: "التاريخ", lCat: "البند", lNotes: "البيان / تفاصيل", btnSave: "حفظ العملية",
            catInc1: "كشف / جلسة مريض", catInc2: "دفعة مقدمة", catInc3: "إيرادات أخرى",
            catExp1: "مستلزمات طبية", catExp2: "معمل أسنان", catExp3: "رواتب ومكافآت", catExp4: "فواتير (كهرباء/إيجار)", catExp5: "مصروفات أخرى",
            bInc: "إيراد", bExp: "مصروف", confDel: "هل أنت متأكد من الحذف؟", empty: "لا توجد حركات مالية مطابقة للبحث.",
            lSearch: "بحث بالبيان أو الملاحظات", lType: "النوع", lDateFrom: "من تاريخ", lDateTo: "إلى تاريخ",
            optAllTypes: "الكل", optInc: "إيرادات", optExp: "مصروفات", btnSearch: "🔍 بحث"
        },
        en: {
            title: "Finances & Expenses", sub: "Manage treasury, daily income, and expenses",
            btnInc: "Add Income", btnExp: "Add Expense", btnPrint: "Print Report",
            totInc: "Total Income (Selected)", totExp: "Total Expenses (Selected)", net: "Net Profit",
            ledger: "Treasury Ledger",
            thDate: "Date", thType: "Type", thCat: "Category", thAmount: "Amount", thNotes: "Notes", thAct: "Actions",
            mInc: "Record New Income", mExp: "Record New Expense",
            lAmt: "Amount", lDate: "Date", lCat: "Category", lNotes: "Details", btnSave: "Save Transaction",
            catInc1: "Patient Session", catInc2: "Advance Payment", catInc3: "Other Income",
            catExp1: "Medical Supplies", catExp2: "Dental Lab", catExp3: "Salaries", catExp4: "Bills (Rent/Utility)", catExp5: "Other Expenses",
            bInc: "Income", bExp: "Expense", confDel: "Are you sure you want to delete?", empty: "No financial transactions match your search.",
            lSearch: "Search by Details", lType: "Type", lDateFrom: "From Date", lDateTo: "To Date",
            optAllTypes: "All", optInc: "Income", optExp: "Expense", btnSearch: "🔍 Search"
        }
    };
    const c = t[lang] || t.ar;
    const setTxt = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };

    setTxt('txt-title', c.title); setTxt('txt-subtitle', c.sub);
    setTxt('btn-add-inc', c.btnInc); setTxt('btn-add-exp', c.btnExp); setTxt('btn-print', c.btnPrint);
    setTxt('lbl-total-inc', c.totInc); setTxt('lbl-total-exp', c.totExp); setTxt('lbl-net', c.net);
    setTxt('txt-ledger', c.ledger);
    
    setTxt('th-date', c.thDate); setTxt('th-type', c.thType); setTxt('th-cat', c.thCat); setTxt('th-amount', c.thAmount); setTxt('th-notes', c.thNotes); setTxt('th-action', c.thAct);
    setTxt('lbl-amount', c.lAmt); setTxt('lbl-date', c.lDate); setTxt('lbl-cat', c.lCat); setTxt('lbl-notes', c.lNotes); setTxt('btn-save', c.btnSave);
    
    setTxt('lbl-search', c.lSearch); setTxt('lbl-type', c.lType); setTxt('lbl-date-from', c.lDateFrom); setTxt('lbl-date-to', c.lDateTo);
    setTxt('opt-all-types', c.optAllTypes); setTxt('opt-inc', c.optInc); setTxt('opt-exp', c.optExp);
    
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
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection("Finances").add(data);
        closeTransactionModal();
        loadFinances();
    } catch (error) { console.error(error); }
    finally { btn.disabled = false; btn.innerText = window.finLang.btnSave; }
}

let allTransactionsForEdit = []; 

// 🔴 دالة جلب البيانات معتمدة فقط على جدول Finances لتفادي التكرار 🔴
async function loadFinances() {
    if (!clinicId) return;
    
    const searchText = document.getElementById('search_text').value.trim().toLowerCase();
    const filterType = document.getElementById('filter_type').value;
    const dateFrom = document.getElementById('date_from').value;
    const dateTo = document.getElementById('date_to').value;

    const tbody = document.getElementById('financesBody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">جاري تجميع البيانات...</td></tr>';
    
    let totalInc = 0;
    let totalExp = 0;
    let combinedData = [];

    try {
        let finQuery = db.collection("Finances").where("clinicId", "==", clinicId);

        if (dateFrom) {
            finQuery = finQuery.where("date", ">=", dateFrom);
        }
        if (dateTo) {
            finQuery = finQuery.where("date", "<=", dateTo);
        }

        // جلب المصروفات (لو الفلتر مش إيرادات بس)
        if (filterType !== 'income') { 
            const finSnap = await finQuery.where("type", "==", "expense").get();
            finSnap.forEach(doc => combinedData.push({ id: doc.id, collection: 'Finances', ...doc.data() }));
        }
        // جلب الإيرادات (لو الفلتر مش مصروفات بس)
        if (filterType !== 'expense') { 
            const finSnapInc = await finQuery.where("type", "==", "income").get();
            finSnapInc.forEach(doc => combinedData.push({ id: doc.id, collection: 'Finances', ...doc.data() }));
        }

        // تم حذف استعلام الـ Sessions بالكامل من هنا لعدم تكرار الإيرادات

        if (searchText) {
            combinedData = combinedData.filter(item => 
                (item.notes && item.notes.toLowerCase().includes(searchText)) || 
                (item.category && item.category.toLowerCase().includes(searchText))
            );
        }

        combinedData.sort((a, b) => new Date(b.date) - new Date(a.date));
        allTransactionsForEdit = combinedData;

        tbody.innerHTML = '';
        if(combinedData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #64748b;">${window.finLang.empty}</td></tr>`;
        }

        combinedData.forEach(f => {
            if (f.type === 'income') totalInc += Number(f.amount);
            else totalExp += Number(f.amount);

            const isInc = f.type === 'income';
            const badgeClass = isInc ? 'badge-inc' : 'badge-exp';
            const typeTxt = isInc ? window.finLang.bInc : window.finLang.bExp;
            const amountColor = isInc ? '#059669' : '#dc2626';
            const amountSign = isInc ? '+' : '-';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: bold; color: #475569;">${f.date}</td>
                <td><span class="${badgeClass}">${typeTxt}</span></td>
                <td>${f.category}</td>
                <td class="amount-text" style="color: ${amountColor};" dir="ltr">${amountSign} ${f.amount}</td>
                <td>${f.notes}</td>
                <td class="no-print" style="text-align: center;">
                    <button class="btn-primary" style="background:#f59e0b; padding: 5px 10px; font-size:12px; margin-right:5px;" onclick="openEditTrans('${f.id}')">✏️</button>
                    <button class="btn-danger" style="padding: 5px 10px; font-size:12px;" onclick="deleteTransaction('${f.id}', '${f.collection}')">🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.getElementById('stat-income').innerText = totalInc.toLocaleString();
        document.getElementById('stat-expense').innerText = totalExp.toLocaleString();
        const netProfit = totalInc - totalExp;
        document.getElementById('stat-net').innerText = netProfit.toLocaleString();
        document.getElementById('stat-net').style.color = netProfit >= 0 ? '#0284C7' : '#ef4444';

    } catch (error) {
        console.error("Error loading finances:", error);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">حدث خطأ في تحميل البيانات. برجاء إضافة (Index) من الكونسول إن لزم الأمر.</td></tr>';
    }
}

function openEditTrans(docId) {
    const trans = allTransactionsForEdit.find(t => t.id === docId);
    if(!trans) return;

    // تم حذف المنع الخاص بالـ Sessions لأن كل الداتا دلوقتي جاية من Finances
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

async function deleteTransaction(docId, collection) {
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
    
    firebase.auth().onAuthStateChanged((user) => {
        if (user) { loadFinances(); }
    });
};

['click', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    }, {passive: true});
});
