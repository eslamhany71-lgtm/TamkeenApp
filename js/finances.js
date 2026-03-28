const db = firebase.firestore();
const clinicId = sessionStorage.getItem('clinicId'); 

function updatePageContent(lang) {
    const t = {
        ar: {
            title: "الحسابات والمصروفات", sub: "إدارة الخزنة، الإيرادات اليومية، والمصروفات",
            btnInc: "إضافة إيراد", btnExp: "إضافة مصروف", btnPrint: "طباعة التقرير",
            totInc: "إجمالي الإيرادات (محدد)", totExp: "إجمالي المصروفات (محدد)", net: "صافي الربح",
            ledger: "دفتر الخزنة", optAll: "كل الشهور",
            thDate: "التاريخ", thType: "النوع", thCat: "البند", thAmount: "المبلغ", thNotes: "البيان", thAct: "إجراءات",
            mInc: "تسجيل إيراد جديد", mExp: "تسجيل مصروف جديد",
            lAmt: "المبلغ", lDate: "التاريخ", lCat: "البند", lNotes: "البيان / تفاصيل", btnSave: "حفظ العملية",
            catInc1: "كشف / جلسة مريض", catInc2: "دفعة مقدمة", catInc3: "إيرادات أخرى",
            catExp1: "مستلزمات طبية", catExp2: "معمل أسنان", catExp3: "رواتب ومكافآت", catExp4: "فواتير (كهرباء/إيجار)", catExp5: "مصروفات أخرى",
            bInc: "إيراد", bExp: "مصروف", confDel: "هل أنت متأكد من الحذف؟", empty: "لا توجد حركات مالية مسجلة."
        },
        en: {
            title: "Finances & Expenses", sub: "Manage treasury, daily income, and expenses",
            btnInc: "Add Income", btnExp: "Add Expense", btnPrint: "Print Report",
            totInc: "Total Income (Selected)", totExp: "Total Expenses (Selected)", net: "Net Profit",
            ledger: "Treasury Ledger", optAll: "All Months",
            thDate: "Date", thType: "Type", thCat: "Category", thAmount: "Amount", thNotes: "Notes", thAct: "Actions",
            mInc: "Record New Income", mExp: "Record New Expense",
            lAmt: "Amount", lDate: "Date", lCat: "Category", lNotes: "Details", btnSave: "Save Transaction",
            catInc1: "Patient Session", catInc2: "Advance Payment", catInc3: "Other Income",
            catExp1: "Medical Supplies", catExp2: "Dental Lab", catExp3: "Salaries", catExp4: "Bills (Rent/Utility)", catExp5: "Other Expenses",
            bInc: "Income", bExp: "Expense", confDel: "Are you sure you want to delete?", empty: "No financial transactions recorded."
        }
    };
    const c = t[lang] || t.ar;
    const setTxt = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };

    setTxt('txt-title', c.title); setTxt('txt-subtitle', c.sub);
    setTxt('btn-add-inc', c.btnInc); setTxt('btn-add-exp', c.btnExp); setTxt('btn-print', c.btnPrint);
    setTxt('lbl-total-inc', c.totInc); setTxt('lbl-total-exp', c.totExp); setTxt('lbl-net', c.net);
    setTxt('txt-ledger', c.ledger); setTxt('opt-all', c.optAll);
    
    setTxt('th-date', c.thDate); setTxt('th-type', c.thType); setTxt('th-cat', c.thCat); setTxt('th-amount', c.thAmount); setTxt('th-notes', c.thNotes); setTxt('th-action', c.thAct);
    setTxt('lbl-amount', c.lAmt); setTxt('lbl-date', c.lDate); setTxt('lbl-cat', c.lCat); setTxt('lbl-notes', c.lNotes); setTxt('btn-save', c.btnSave);
    
    window.finLang = c;
    populateMonthsDropdown(lang);
}

function populateMonthsDropdown(lang) {
    const select = document.getElementById('filterMonth');
    const isAr = lang === 'ar';
    select.innerHTML = `<option value="all">${isAr ? 'كل الشهور' : 'All Months'}</option>`;
    
    const today = new Date();
    for (let i = 0; i < 6; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthVal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthTxt = d.toLocaleString(isAr ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' });
        select.innerHTML += `<option value="${monthVal}">${monthTxt}</option>`;
    }
    select.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
}

// 2. التحكم في المودال وتعبئة الفئات
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

// 3. حفظ العملية اليدوية
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
        isManual: true, // نميزها إنها يدوية مش من جلسة
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection("Finances").add(data);
        closeTransactionModal();
    } catch (error) { console.error(error); }
    finally { btn.disabled = false; btn.innerText = window.finLang.btnSave; }
}

// 4. جلب الحركات (دمج الحسابات اليدوية مع إيرادات الجلسات)
let allTransactionsForEdit = []; // عشان نحتفظ بالداتا للتعديل

async function loadFinances() {
    if (!clinicId) return;
    const selectedMonth = document.getElementById('filterMonth').value; 
    const tbody = document.getElementById('financesBody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">جاري تجميع البيانات...</td></tr>';
    
    let totalInc = 0;
    let totalExp = 0;
    let combinedData = [];

    try {
        // 1. جلب المصروفات والإيرادات اليدوية
        const finQuery = selectedMonth === 'all' 
            ? db.collection("Finances").where("clinicId", "==", clinicId) 
            : db.collection("Finances").where("clinicId", "==", clinicId)
                .where("date", ">=", selectedMonth + "-01")
                .where("date", "<=", selectedMonth + "-31");
                
        const finSnap = await finQuery.get();
        finSnap.forEach(doc => {
            combinedData.push({ id: doc.id, collection: 'Finances', ...doc.data() });
        });

        // 2. جلب إيرادات الجلسات (اللي الدكاترة سجلوها)
        const sessQuery = selectedMonth === 'all'
            ? db.collection("Sessions").where("clinicId", "==", clinicId)
            : db.collection("Sessions").where("clinicId", "==", clinicId)
                .where("date", ">=", selectedMonth + "-01")
                .where("date", "<=", selectedMonth + "-31");
                
        const sessSnap = await sessQuery.get();
        
        // جلب أسماء المرضى عشان نكتبها في البيان
        const patSnap = await db.collection("Patients").where("clinicId", "==", clinicId).get();
        let patientsMap = {};
        patSnap.forEach(p => patientsMap[p.id] = p.data().name);

        sessSnap.forEach(doc => {
            const s = doc.data();
            if (s.paid && s.paid > 0) { // لو الجلسة اتدفع فيها فلوس
                const patName = patientsMap[s.patientId] || "مريض";
                combinedData.push({
                    id: doc.id,
                    collection: 'Sessions', // بنميزها إنها جاية من الجلسات
                    type: 'income',
                    amount: s.paid,
                    date: s.date,
                    category: 'إيراد جلسة علاجية',
                    notes: `إجراء: ${s.procedure} - (المريض: ${patName})`
                });
            }
        });

        // 3. ترتيب الكل تنازلياً بالتاريخ
        combinedData.sort((a, b) => new Date(b.date) - new Date(a.date));
        allTransactionsForEdit = combinedData;

        // 4. رسم الجدول
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

        // تحديث الكروت العلوية
        document.getElementById('stat-income').innerText = totalInc.toLocaleString();
        document.getElementById('stat-expense').innerText = totalExp.toLocaleString();
        const netProfit = totalInc - totalExp;
        document.getElementById('stat-net').innerText = netProfit.toLocaleString();
        document.getElementById('stat-net').style.color = netProfit >= 0 ? '#0284C7' : '#ef4444';

    } catch (error) {
        console.error("Error loading finances:", error);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">حدث خطأ في تحميل البيانات.</td></tr>';
    }
}

// 5. دوال التعديل
function openEditTrans(docId) {
    const trans = allTransactionsForEdit.find(t => t.id === docId);
    if(!trans) return;

    if(trans.collection === 'Sessions') {
        alert("هذا الإيراد مسجل من داخل جلسة المريض. يرجى تعديل (المدفوع) من داخل ملف المريض لتجنب تضارب الحسابات.");
        return;
    }

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
        loadFinances(); // Refresh
    } catch(e) { console.error(e); }
}

// 6. حذف حركة
async function deleteTransaction(docId, collection) {
    if(collection === 'Sessions') {
        alert("لا يمكن حذف إيراد الجلسة من هنا. يجب حذفه من ملف المريض.");
        return;
    }

    if(confirm(window.finLang.confDel)) {
        try { 
            await db.collection("Finances").doc(docId).delete(); 
            loadFinances(); // Refresh
        } 
        catch (e) { console.error(e); }
    }
}

window.onload = () => {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.body.dir = lang === 'en' ? 'ltr' : 'rtl';
    updatePageContent(lang);
    
    firebase.auth().onAuthStateChanged((user) => {
        if (user) { loadFinances(); }
    });
};

// حل اللمس للمودال
['click', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    }, {passive: true});
});
