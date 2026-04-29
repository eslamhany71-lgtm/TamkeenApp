// js/services.js - وحدة إدارة الخدمات (ERP Module)
const db = firebase.firestore();
const clinicId = sessionStorage.getItem('clinicId');

let allServices = []; 
let editServiceId = null; 

// ==========================================
// 🌍 نظام اللغات والترجمة (Localization)
// ==========================================
const dict = {
    ar: {
        pageTitle: "إدارة الخدمات الطبية", pageSub: "إضافة وتعديل أسعار الكشوفات والجلسات بالعيادة",
        searchPH: "ابحث عن خدمة (مثال: حشو عصب)...", btnAdd: "إضافة خدمة جديدة",
        loading: "جاري تحميل الخدمات...", empty: "لا توجد خدمات مسجلة. اضغط 'إضافة خدمة جديدة' للبدء.",
        mAddTitle: "إضافة خدمة جديدة", mEditTitle: "تعديل الخدمة",
        lName: "اسم الخدمة", pName: "مثال: حشو عصب أمامي",
        lCat: "تصنيف الخدمة", opt1: "كشف واستشارة", opt2: "علاجي (حشو، علاج عصب...)", opt3: "جراحي (خلع، زراعة...)", opt4: "تجميلي (تبييض، فينير...)", opt5: "أخرى",
        lPrice: "السعر الافتراضي (يمكن تغييره لاحقاً وقت الجلسة)",
        btnSave: "حفظ الخدمة", btnEdit: "✏️ تعديل", btnDel: "🗑️ حذف",
        currency: "ج.م", confDel: "هل أنت متأكد من حذف هذه الخدمة؟", msgError: "حدث خطأ أثناء المعالجة."
    },
    en: {
        pageTitle: "Services Management", pageSub: "Manage clinic treatments, sessions, and prices",
        searchPH: "Search service (e.g. Root Canal)...", btnAdd: "Add New Service",
        loading: "Loading services...", empty: "No services found. Click 'Add New Service' to begin.",
        mAddTitle: "Add New Service", mEditTitle: "Edit Service",
        lName: "Service Name", pName: "e.g. Anterior Root Canal",
        lCat: "Category", opt1: "Consultation", opt2: "Therapeutic (Fillings...)", opt3: "Surgical (Extraction...)", opt4: "Cosmetic (Whitening...)", opt5: "Other",
        lPrice: "Default Price (Can be changed during session)",
        btnSave: "Save Service", btnEdit: "✏️ Edit", btnDel: "🗑️ Delete",
        currency: "EGP", confDel: "Are you sure you want to delete this service?", msgError: "An error occurred."
    }
};

function updatePageContent(lang) {
    const c = dict[lang] || dict.ar;
    const setTxt = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };
    const setPH = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).placeholder = txt; };

    setTxt('txt-page-header', c.pageTitle); setTxt('txt-page-sub', c.pageSub);
    setPH('search_service', c.searchPH); setTxt('btn-add-txt', c.btnAdd);
    
    setTxt('mod-service-title', editServiceId ? c.mEditTitle : c.mAddTitle);
    setTxt('lbl-srv-name', c.lName); setPH('srv_name', c.pName);
    setTxt('lbl-srv-cat', c.lCat);
    setTxt('opt-consult', c.opt1); setTxt('opt-treat', c.opt2); setTxt('opt-surg', c.opt3); setTxt('opt-cosm', c.opt4); setTxt('opt-other', c.opt5);
    setTxt('lbl-srv-price', c.lPrice); setTxt('btn-save-srv', c.btnSave);
    
    window.emptyTxt = c.empty; window.currencyTxt = c.currency; window.confDelTxt = c.confDel;
    window.btnEditTxt = c.btnEdit; window.btnDelTxt = c.btnDel;
}

// ==========================================
// 🛠️ جلب وعرض البيانات (Read & Render)
// ==========================================
function loadServices() {
    if (!clinicId) return;

    db.collection("Services").where("clinicId", "==", clinicId).orderBy("createdAt", "desc").onSnapshot(snap => {
        allServices = [];
        snap.forEach(doc => allServices.push({ id: doc.id, ...doc.data() }));
        renderServices(allServices);
    }, error => {
        // إذا ظهر خطأ الـ Index الخاص بالفايربيز هنا، دوس على اللينك اللي في الكونسول زى ما متعود
        console.error("Error loading services:", error);
    });
}

function getCategoryClass(cat) {
    if(cat.includes('كشف') || cat.includes('Consultation')) return 'cat-consult';
    if(cat.includes('علاجي') || cat.includes('Therapeutic')) return 'cat-treat';
    if(cat.includes('جراحي') || cat.includes('Surgical')) return 'cat-surg';
    if(cat.includes('تجميلي') || cat.includes('Cosmetic')) return 'cat-cosm';
    return 'cat-other';
}

function renderServices(servicesArray) {
    const container = document.getElementById('servicesContainer');
    container.innerHTML = '';

    if (servicesArray.length === 0) {
        container.innerHTML = `<div class="empty-state">${window.emptyTxt}</div>`;
        return;
    }

    servicesArray.forEach(srv => {
        const catClass = getCategoryClass(srv.category);
        const card = document.createElement('div');
        card.className = 'service-card';
        card.innerHTML = `
            <span class="srv-cat ${catClass}">${srv.category}</span>
            <h3 class="srv-name">${srv.name}</h3>
            <p class="srv-price">${srv.price} <small>${window.currencyTxt}</small></p>
            <div class="card-actions">
                <button class="btn-action btn-edit" onclick="openEditModal('${srv.id}')">${window.btnEditTxt}</button>
                <button class="btn-action btn-delete" onclick="deleteService('${srv.id}')">${window.btnDelTxt}</button>
            </div>
        `;
        container.appendChild(card);
    });
}

// ==========================================
// 🔍 البحث الذكي اللحظي
// ==========================================
function searchServices() {
    const input = document.getElementById('search_service').value.trim().toLowerCase();
    if (input.length === 0) {
        renderServices(allServices);
        return;
    }
    const filtered = allServices.filter(s => 
        (s.name && s.name.toLowerCase().includes(input)) || 
        (s.category && s.category.toLowerCase().includes(input))
    );
    renderServices(filtered);
}

// ==========================================
// 📝 إدارة النوافذ والحفظ والتعديل (CRUD)
// ==========================================
function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function openAddServiceModal() {
    editServiceId = null;
    const isAr = getLang() === 'ar';
    document.getElementById('mod-service-title').innerText = isAr ? dict.ar.mAddTitle : dict.en.mAddTitle;
    document.getElementById('srv_name').value = '';
    document.getElementById('srv_category').selectedIndex = 0;
    document.getElementById('srv_price').value = '';
    openModal('serviceModal');
}

function openEditModal(docId) {
    const srv = allServices.find(s => s.id === docId);
    if (!srv) return;
    
    editServiceId = docId;
    const isAr = getLang() === 'ar';
    document.getElementById('mod-service-title').innerText = isAr ? dict.ar.mEditTitle : dict.en.mEditTitle;
    
    document.getElementById('srv_name').value = srv.name;
    document.getElementById('srv_category').value = srv.category;
    document.getElementById('srv_price').value = srv.price;
    
    openModal('serviceModal');
}

async function saveService(e) {
    e.preventDefault();
    if(!clinicId) return;

    if(window.showLoader) window.showLoader();
    const btn = document.getElementById('btn-save-srv');
    const originalTxt = btn.innerText;
    btn.disabled = true; btn.innerText = "...";

    const data = {
        clinicId: clinicId,
        name: document.getElementById('srv_name').value.trim(),
        category: document.getElementById('srv_category').value,
        price: Number(document.getElementById('srv_price').value) || 0
    };

    try {
        if (editServiceId) {
            // تحديث خدمة موجودة
            await db.collection("Services").doc(editServiceId).update(data);
        } else {
            // إضافة خدمة جديدة
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection("Services").add(data);
        }
        closeModal('serviceModal');
    } catch(err) {
        console.error(err);
        alert(getLang() === 'ar' ? dict.ar.msgError : dict.en.msgError);
    } finally {
        btn.disabled = false; btn.innerText = originalTxt;
        if(window.hideLoader) window.hideLoader();
    }
}

async function deleteService(docId) {
    if(confirm(window.confDelTxt)) {
        if(window.showLoader) window.showLoader();
        try {
            await db.collection("Services").doc(docId).delete();
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
        if (user) loadServices();
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
