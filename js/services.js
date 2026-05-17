// js/services.js - وحدة إدارة الخدمات (ERP Module)
const db = firebase.firestore();
const clinicId = sessionStorage.getItem('clinicId');

let allServices = []; 
let editServiceId = null; 

// 🔴 متغيرات التوفير والترتيب (Pagination & Sorting)
const SERVICES_PER_PAGE = 15;
let lastVisibleService = null;
let currentSortService = 'createdAt_desc'; // الافتراضي: الأحدث
let isServiceSearchMode = false;

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
        currency: "ج.م", confDel: "هل أنت متأكد من حذف هذه الخدمة؟", msgError: "حدث خطأ أثناء المعالجة.",
        loadMore: "⬇️ عرض المزيد", noMore: "لا توجد خدمات أخرى"
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
        currency: "EGP", confDel: "Are you sure you want to delete this service?", msgError: "An error occurred.",
        loadMore: "⬇️ Load More", noMore: "No more services"
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
    window.srvLangVars = c;
}

// ==========================================
// 🔴 دوال الترتيب وعرض المزيد 🔴
// ==========================================
window.toggleSortService = function() {
    currentSortService = currentSortService === 'createdAt_desc' ? 'price_desc' : 'createdAt_desc';
    const isAr = getLang() === 'ar';
    const btn = document.getElementById('btn-sort-services');
    if(btn) btn.innerHTML = currentSortService === 'createdAt_desc' ? (isAr ? '🔽 الأحدث' : 'Sort: Newest') : (isAr ? '💰 الأغلى سعراً' : 'Sort: Highest Price');
    
    loadServices(false); 
};

function injectServiceSortButton() {
    if(document.getElementById('btn-sort-services')) return;
    const searchInput = document.getElementById('search_service');
    if(searchInput) {
        const isAr = getLang() === 'ar';
        const btn = document.createElement('button');
        btn.id = 'btn-sort-services';
        btn.className = 'btn-action';
        btn.innerHTML = currentSortService === 'createdAt_desc' ? (isAr ? '🔽 الأحدث' : 'Sort: Newest') : (isAr ? '💰 الأغلى سعراً' : 'Sort: Highest Price');
        btn.style.cssText = 'flex-shrink: 0; min-width: max-content; margin-right: 10px; margin-left: 10px; background: #ffffff; color: #0f172a; border: 1px solid #cbd5e1; padding: 8px 15px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 13px; white-space: nowrap; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05); height: 42px;';
        btn.onclick = window.toggleSortService;
        searchInput.parentNode.insertBefore(btn, searchInput.nextSibling);
    }
}

function handleServiceLoadMore(show, isEnd = false) {
    let btnContainer = document.getElementById('load-more-srv-container');
    if (!btnContainer) {
        btnContainer = document.createElement('div');
        btnContainer.id = 'load-more-srv-container';
        btnContainer.style.cssText = 'text-align: center; margin-top: 20px; padding-bottom: 20px; width: 100%;';
        const container = document.getElementById('servicesContainer');
        if(container && container.parentNode) container.parentNode.appendChild(btnContainer);
    }

    if (show && !isEnd) {
        btnContainer.innerHTML = `<button class="btn-action" style="background: #f0f9ff; color: #0284c7; border: 1px solid #bae6fd; padding: 10px 40px; border-radius: 25px; font-weight: 800; cursor: pointer; font-size: 14px; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.05);" onclick="loadMoreServices()">${window.srvLangVars.loadMore}</button>`;
        btnContainer.style.display = 'block';
    } else if (show && isEnd) {
        btnContainer.innerHTML = `<span style="color:#64748b; font-weight:bold;">${window.srvLangVars.noMore}</span>`;
        btnContainer.style.display = 'block';
        setTimeout(() => btnContainer.style.display = 'none', 2000);
    } else {
        btnContainer.style.display = 'none';
    }
}

window.loadMoreServices = function() {
    loadServices(true);
};

// ==========================================
// 🛠️ جلب وعرض البيانات (Read & Render) السحابي
// ==========================================
async function loadServices(isLoadMore = false) {
    if (!clinicId) return;
    isServiceSearchMode = false;

    const container = document.getElementById('servicesContainer');
    
    if (!isLoadMore) {
        container.innerHTML = `<div style="text-align: center; padding: 20px; width:100%;">${window.srvLangVars.loading || 'Loading...'}</div>`;
        allServices = [];
        lastVisibleService = null;
    }

    try {
        let queryRef = db.collection("Services").where("clinicId", "==", clinicId);

        if (currentSortService === 'createdAt_desc') {
            queryRef = queryRef.orderBy("createdAt", "desc");
        } else if (currentSortService === 'price_desc') {
            queryRef = queryRef.orderBy("price", "desc");
        }

        queryRef = queryRef.limit(SERVICES_PER_PAGE);

        if (isLoadMore && lastVisibleService) {
            queryRef = queryRef.startAfter(lastVisibleService);
        }

        const snap = await queryRef.get();
        
        if (!snap.empty) {
            lastVisibleService = snap.docs[snap.docs.length - 1];
            
            const newServices = [];
            snap.forEach(doc => {
                const s = doc.data();
                s.id = doc.id;
                newServices.push(s);
            });
            
            allServices = isLoadMore ? [...allServices, ...newServices] : newServices;
            
            injectServiceSortButton();
            renderServices(allServices);

            if(snap.docs.length === SERVICES_PER_PAGE) {
                handleServiceLoadMore(true);
            } else {
                handleServiceLoadMore(false);
            }
        } else {
            if (!isLoadMore) {
                container.innerHTML = `<div class="empty-state">${window.emptyTxt}</div>`;
                handleServiceLoadMore(false);
            } else {
                handleServiceLoadMore(true, true);
            }
        }
    } catch (error) {
        console.error("Error loading services:", error);
    }
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
        const catClass = getCategoryClass(srv.category || "");
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
// 🔍 البحث الذكي اللحظي (السحابي للتوفير)
// ==========================================
async function searchServices() {
    const input = document.getElementById('search_service').value.trim().toLowerCase();
    
    if (input.length === 0) {
        loadServices(false);
        return;
    }

    isServiceSearchMode = true;
    handleServiceLoadMore(false); 
    const container = document.getElementById('servicesContainer');
    container.innerHTML = `<div style="text-align: center; padding: 20px; width:100%;">جاري البحث...</div>`;

    try {
        // سحب أحدث 100 خدمة فقط للبحث فيهم محلياً عشان منستهلكش باقة
        const snap = await db.collection("Services")
            .where("clinicId", "==", clinicId)
            .orderBy("createdAt", "desc")
            .limit(100)
            .get();

        const searchResults = [];
        snap.forEach(doc => {
            const s = doc.data();
            if ((s.name && s.name.toLowerCase().includes(input)) || (s.category && s.category.toLowerCase().includes(input))) {
                s.id = doc.id;
                searchResults.push(s);
            }
        });

        renderServices(searchResults);

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
            await db.collection("Services").doc(editServiceId).update(data);
        } else {
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection("Services").add(data);
        }
        closeModal('serviceModal');
        // بعد الحفظ نعمل ريست ونحمل من الأول عشان يظهر الجديد
        document.getElementById('search_service').value = '';
        loadServices(false);
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
            allServices = allServices.filter(s => s.id !== docId);
            renderServices(allServices);
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
        if (user) loadServices(false);
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
