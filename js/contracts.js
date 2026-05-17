// js/contracts.js - وحدة التعاقدات والتأمين (ERP Module)
const db = firebase.firestore();
const clinicId = sessionStorage.getItem('clinicId');

let allContracts = []; 
let editContractId = null; 

// 🔴 متغيرات التوفير والترتيب (Pagination & Sorting)
const CONTRACTS_PER_PAGE = 15;
let lastVisibleContract = null;
let currentSortContract = 'createdAt_desc'; // الافتراضي: الأحدث
let isContractSearchMode = false;

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
        confDel: "هل أنت متأكد من حذف هذا التعاقد نهائياً؟", msgError: "حدث خطأ أثناء المعالجة.",
        loadMore: "⬇️ عرض المزيد", noMore: "لا توجد تعاقدات أخرى"
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
        confDel: "Are you sure you want to permanently delete this contract?", msgError: "An error occurred.",
        loadMore: "⬇️ Load More", noMore: "No more contracts"
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
    window.contLangVars = c;
}

// ==========================================
// 🔴 دوال الترتيب وعرض المزيد 🔴
// ==========================================
window.toggleSortContract = function() {
    currentSortContract = currentSortContract === 'createdAt_desc' ? 'discount_desc' : 'createdAt_desc';
    const isAr = getLang() === 'ar';
    const btn = document.getElementById('btn-sort-contracts');
    if(btn) btn.innerHTML = currentSortContract === 'createdAt_desc' ? (isAr ? '🔽 الأحدث' : 'Sort: Newest') : (isAr ? '🏷️ الأعلى خصماً' : 'Sort: Highest Discount');
    
    loadContracts(false); 
};

function injectContractSortButton() {
    if(document.getElementById('btn-sort-contracts')) return;
    const searchInput = document.getElementById('search_contract');
    if(searchInput) {
        const isAr = getLang() === 'ar';
        const btn = document.createElement('button');
        btn.id = 'btn-sort-contracts';
        btn.className = 'btn-action';
        btn.innerHTML = currentSortContract === 'createdAt_desc' ? (isAr ? '🔽 الأحدث' : 'Sort: Newest') : (isAr ? '🏷️ الأعلى خصماً' : 'Sort: Highest Discount');
        btn.style.cssText = 'flex-shrink: 0; min-width: max-content; margin-right: 10px; margin-left: 10px; background: #ffffff; color: #0f172a; border: 1px solid #cbd5e1; padding: 8px 15px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 13px; white-space: nowrap; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05); height: 42px;';
        btn.onclick = window.toggleSortContract;
        searchInput.parentNode.insertBefore(btn, searchInput.nextSibling);
    }
}

function handleContractLoadMore(show, isEnd = false) {
    let btnContainer = document.getElementById('load-more-cont-container');
    if (!btnContainer) {
        btnContainer = document.createElement('div');
        btnContainer.id = 'load-more-cont-container';
        btnContainer.style.cssText = 'text-align: center; margin-top: 20px; padding-bottom: 20px; width: 100%;';
        const container = document.getElementById('contractsContainer');
        if(container && container.parentNode) container.parentNode.appendChild(btnContainer);
    }

    if (show && !isEnd) {
        btnContainer.innerHTML = `<button class="btn-action" style="background: #f0f9ff; color: #0284c7; border: 1px solid #bae6fd; padding: 10px 40px; border-radius: 25px; font-weight: 800; cursor: pointer; font-size: 14px; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.05);" onclick="loadMoreContracts()">${window.contLangVars.loadMore}</button>`;
        btnContainer.style.display = 'block';
    } else if (show && isEnd) {
        btnContainer.innerHTML = `<span style="color:#64748b; font-weight:bold;">${window.contLangVars.noMore}</span>`;
        btnContainer.style.display = 'block';
        setTimeout(() => btnContainer.style.display = 'none', 2000);
    } else {
        btnContainer.style.display = 'none';
    }
}

window.loadMoreContracts = function() {
    loadContracts(true);
};

// ==========================================
// 🛠️ جلب وعرض البيانات (Read & Render) السحابي
// ==========================================
async function loadContracts(isLoadMore = false) {
    if (!clinicId) return;
    isContractSearchMode = false;

    const container = document.getElementById('contractsContainer');
    
    if (!isLoadMore) {
        container.innerHTML = `<div style="text-align: center; padding: 20px; width:100%;">${window.contLangVars ? window.contLangVars.loading : 'Loading...'}</div>`;
        allContracts = [];
        lastVisibleContract = null;
    }

    try {
        let queryRef = db.collection("Contracts").where("clinicId", "==", clinicId);

        if (currentSortContract === 'createdAt_desc') {
            queryRef = queryRef.orderBy("createdAt", "desc");
        } else if (currentSortContract === 'discount_desc') {
            queryRef = queryRef.orderBy("discountPercentage", "desc");
        }

        queryRef = queryRef.limit(CONTRACTS_PER_PAGE);

        if (isLoadMore && lastVisibleContract) {
            queryRef = queryRef.startAfter(lastVisibleContract);
        }

        const snap = await queryRef.get();

        if (!snap.empty) {
            lastVisibleContract = snap.docs[snap.docs.length - 1];
            
            const newContracts = [];
            snap.forEach(doc => {
                const c = doc.data();
                c.id = doc.id;
                newContracts.push(c);
            });
            
            allContracts = isLoadMore ? [...allContracts, ...newContracts] : newContracts;
            
            injectContractSortButton();
            renderContracts(allContracts);

            if(snap.docs.length === CONTRACTS_PER_PAGE) {
                handleContractLoadMore(true);
            } else {
                handleContractLoadMore(false);
            }
        } else {
            if (!isLoadMore) {
                container.innerHTML = `<div class="empty-state">${window.emptyTxt}</div>`;
                handleContractLoadMore(false);
            } else {
                handleContractLoadMore(true, true);
            }
        }
    } catch (error) {
        console.error("Error loading contracts:", error);
    }
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
// 🔍 البحث الذكي اللحظي (السحابي للتوفير)
// ==========================================
async function searchContracts() {
    const input = document.getElementById('search_contract').value.trim().toLowerCase();
    
    if (input.length === 0) {
        loadContracts(false);
        return;
    }

    isContractSearchMode = true;
    handleContractLoadMore(false); 
    const container = document.getElementById('contractsContainer');
    const isAr = getLang() === 'ar';
    container.innerHTML = `<div style="text-align: center; padding: 20px; width:100%;">${isAr ? 'جاري البحث...' : 'Searching...'}</div>`;

    try {
        // سحب أحدث 100 تعاقد فقط للبحث فيهم محلياً عشان منستهلكش باقة
        const snap = await db.collection("Contracts")
            .where("clinicId", "==", clinicId)
            .orderBy("createdAt", "desc")
            .limit(100)
            .get();

        const searchResults = [];
        snap.forEach(doc => {
            const c = doc.data();
            if ((c.name && c.name.toLowerCase().includes(input)) || (c.notes && c.notes.toLowerCase().includes(input))) {
                c.id = doc.id;
                searchResults.push(c);
            }
        });

        renderContracts(searchResults);

    } catch (e) {
        console.error("Search Error:", e);
        container.innerHTML = `<div style="text-align: center; color: red;">حدث خطأ في البحث</div>`;
    }
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
        // بعد الحفظ نعمل ريست ونحمل من الأول عشان يظهر الجديد
        document.getElementById('search_contract').value = '';
        loadContracts(false);
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
            allContracts = allContracts.filter(c => c.id !== docId);
            renderContracts(allContracts);
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
        if (user) loadContracts(false);
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
