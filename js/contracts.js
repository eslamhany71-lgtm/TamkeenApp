// js/contracts.js - وحدة التعاقدات والتأمين (ERP Module)
const db = firebase.firestore();
const clinicId = sessionStorage.getItem('clinicId');

let allContracts = []; 
let editContractId = null; 

// ==========================================
// 🌍 نظام اللغات والترجمة (Localization)
// ==========================================
const dict = {
    ar: {
        pageTitle: "إدارة التعاقدات والتأمين", pageSub: "إضافة النقابات والشركات المتعاقدة ونسب الخصم الخاصة بها",
        searchPH: "ابحث عن جهة التعاقد (مثال: نقابة المهندسين)...", btnAdd: "إضافة تعاقد جديد",
        loading: "جاري تحميل التعاقدات...", empty: "لا توجد تعاقدات مسجلة. اضغط 'إضافة تعاقد جديد' للبدء.",
        mAddTitle: "إضافة تعاقد جديد", mEditTitle: "تعديل بيانات التعاقد",
        lName: "اسم الجهة / النقابة", pName: "مثال: نقابة المهندسين",
        lDiscount: "نسبة الخصم (%)", pDiscount: "مثال: 20",
        lNotes: "ملاحظات وشروط التعاقد (اختياري)", pNotes: "مثال: يشمل الكشف والخلع فقط",
        btnSave: "حفظ التعاقد", btnEdit: "✏️ تعديل", btnDel: "🗑️ حذف",
        noNotes: "لا توجد شروط خاصة مسجلة.",
        confDel: "هل أنت متأكد من حذف هذا التعاقد نهائياً؟", msgError: "حدث خطأ أثناء المعالجة."
    },
    en: {
        pageTitle: "Contracts & Insurance", pageSub: "Manage corporate contracts, syndicates, and discount rates",
        searchPH: "Search contracts (e.g. Engineers Syndicate)...", btnAdd: "Add New Contract",
        loading: "Loading contracts...", empty: "No contracts found. Click 'Add New Contract' to begin.",
        mAddTitle: "Add New Contract", mEditTitle: "Edit Contract Details",
        lName: "Organization / Syndicate Name", pName: "e.g. Engineers Syndicate",
        lDiscount: "Discount Rate (%)", pDiscount: "e.g. 20",
        lNotes: "Terms & Notes (Optional)", pNotes: "e.g. Covers consultation and extraction only",
        btnSave: "Save Contract", btnEdit: "✏️ Edit", btnDel: "🗑️ Delete",
        noNotes: "No special terms recorded.",
        confDel: "Are you sure you want to permanently delete this contract?", msgError: "An error occurred."
    }
};

function updatePageContent(lang) {
    const c = dict[lang] || dict.ar;
    const setTxt = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };
    const setPH = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).placeholder = txt; };

    setTxt('txt-page-header', c.pageTitle); setTxt('txt-page-sub', c.pageSub);
    setPH('search_contract', c.searchPH); setTxt('btn-add-txt', c.btnAdd);
    
    setTxt('mod-contract-title', editContractId ? c.mEditTitle : c.mAddTitle);
    setTxt('lbl-cont-name', c.lName); setPH('cont_name', c.pName);
    setTxt('lbl-cont-discount', c.lDiscount); setPH('cont_discount', c.pDiscount);
    setTxt('lbl-cont-notes', c.lNotes); setPH('cont_notes', c.pNotes);
    setTxt('btn-save-cont', c.btnSave);
    
    window.emptyTxt = c.empty; window.noNotesTxt = c.noNotes; window.confDelTxt = c.confDel;
    window.btnEditTxt = c.btnEdit; window.btnDelTxt = c.btnDel;
}

// ==========================================
// 🛠️ جلب وعرض البيانات (Read & Render)
// ==========================================
function loadContracts() {
    if (!clinicId) return;

    db.collection("Contracts").where("clinicId", "==", clinicId).orderBy("createdAt", "desc").onSnapshot(snap => {
        allContracts = [];
        snap.forEach(doc => allContracts.push({ id: doc.id, ...doc.data() }));
        renderContracts(allContracts);
    }, error => {
        console.error("Error loading contracts:", error);
    });
}

function renderContracts(contractsArray) {
    const container = document.getElementById('contractsContainer');
    container.innerHTML = '';

    if (contractsArray.length === 0) {
        container.innerHTML = `<div class="empty-state">${window.emptyTxt}</div>`;
        return;
    }

    contractsArray.forEach(cont => {
        const card = document.createElement('div');
        card.className = 'contract-card';
        card.innerHTML = `
            <div>
                <div class="cont-header">
                    <h3 class="cont-name">${cont.name}</h3>
                    <span class="cont-badge">خصم ${cont.discountPercentage}%</span>
                </div>
                <p class="cont-notes">📝 ${cont.notes || window.noNotesTxt}</p>
            </div>
            <div class="card-actions">
                <button class="btn-action btn-edit" onclick="openEditModal('${cont.id}')">${window.btnEditTxt}</button>
                <button class="btn-action btn-delete" onclick="deleteContract('${cont.id}')">${window.btnDelTxt}</button>
            </div>
        `;
        container.appendChild(card);
    });
}

// ==========================================
// 🔍 البحث الذكي اللحظي
// ==========================================
function searchContracts() {
    const input = document.getElementById('search_contract').value.trim().toLowerCase();
    if (input.length === 0) {
        renderContracts(allContracts);
        return;
    }
    const filtered = allContracts.filter(c => 
        (c.name && c.name.toLowerCase().includes(input)) || 
        (c.notes && c.notes.toLowerCase().includes(input))
    );
    renderContracts(filtered);
}

// ==========================================
// 📝 إدارة النوافذ والحفظ والتعديل (CRUD)
// ==========================================
function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function openAddContractModal() {
    editContractId = null;
    const isAr = getLang() === 'ar';
    document.getElementById('mod-contract-title').innerText = isAr ? dict.ar.mAddTitle : dict.en.mAddTitle;
    document.getElementById('cont_name').value = '';
    document.getElementById('cont_discount').value = '';
    document.getElementById('cont_notes').value = '';
    openModal('contractModal');
}

function openEditModal(docId) {
    const cont = allContracts.find(c => c.id === docId);
    if (!cont) return;
    
    editContractId = docId;
    const isAr = getLang() === 'ar';
    document.getElementById('mod-contract-title').innerText = isAr ? dict.ar.mEditTitle : dict.en.mEditTitle;
    
    document.getElementById('cont_name').value = cont.name;
    document.getElementById('cont_discount').value = cont.discountPercentage;
    document.getElementById('cont_notes').value = cont.notes || '';
    
    openModal('contractModal');
}

async function saveContract(e) {
    e.preventDefault();
    if(!clinicId) return;

    if(window.showLoader) window.showLoader();
    const btn = document.getElementById('btn-save-cont');
    const originalTxt = btn.innerText;
    btn.disabled = true; btn.innerText = "...";

    const data = {
        clinicId: clinicId,
        name: document.getElementById('cont_name').value.trim(),
        discountPercentage: Number(document.getElementById('cont_discount').value) || 0,
        notes: document.getElementById('cont_notes').value.trim()
    };

    try {
        if (editContractId) {
            await db.collection("Contracts").doc(editContractId).update(data);
        } else {
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection("Contracts").add(data);
        }
        closeModal('contractModal');
    } catch(err) {
        console.error(err);
        alert(getLang() === 'ar' ? dict.ar.msgError : dict.en.msgError);
    } finally {
        btn.disabled = false; btn.innerText = originalTxt;
        if(window.hideLoader) window.hideLoader();
    }
}

async function deleteContract(docId) {
    if(confirm(window.confDelTxt)) {
        if(window.showLoader) window.showLoader();
        try {
            await db.collection("Contracts").doc(docId).delete();
        } catch(err) {
            console.error(err);
        } finally {
            if(window.hideLoader) window.hideLoader();
        }
    }
}

// ==========================================
// 🚀 التشغيل المبدئي
// ==========================================
function getLang() { return localStorage.getItem('preferredLang') || 'ar'; }

window.onload = () => { 
    const lang = getLang();
    document.body.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.body.setAttribute('data-theme', localStorage.getItem('niva_theme') || 'light');
    updatePageContent(lang); 

    firebase.auth().onAuthStateChanged((user) => {
        if (user) loadContracts();
    });
};

document.addEventListener('DOMContentLoaded', () => {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', function(event) {
            if (event.target === this) this.style.display = 'none';
        });
    });
});
