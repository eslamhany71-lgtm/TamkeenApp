// branches.js - دليل الفروع المطور (النسخة الاحترافية)

let allBranches = []; // لتخزين الفروع محلياً لتسريع البحث

// 1. تحميل الفروع من Firestore عند فتح الصفحة
async function initBranches() {
    const select = document.getElementById('branchSelect');
    const grid = document.getElementById('allBranchesList');
    const lang = localStorage.getItem('preferredLang') || 'ar';

    try {
        const querySnapshot = await firebase.firestore().collection("Branches").get();
        allBranches = [];
        
        // تفريغ المحتوى القديم
        select.innerHTML = `<option value="" id="opt-default">...</option>`;
        if (grid) grid.innerHTML = "";

        querySnapshot.forEach((doc) => {
            const branch = { id: doc.id, ...doc.data() };
            allBranches.push(branch);

            // إضافة الفرع للقائمة المنسدلة
            const option = document.createElement('option');
            option.value = branch.id;
            option.innerText = (lang === 'ar') ? branch.nameAr : branch.nameEn;
            select.appendChild(option);

            // إضافة كارت صغير في الشبكة (Grid)
            createMiniCard(branch, lang);
        });

        // تحديث نصوص الصفحة بناءً على اللغة
        updatePageContent(lang);
        
        if (document.getElementById('loading-msg')) 
            document.getElementById('loading-msg').style.display = 'none';

    } catch (error) {
        console.error("خطأ في تحميل الفروع:", error);
    }
}

// 2. إنشاء كروت صغيرة لجميع الفروع في الشبكة
function createMiniCard(branch, lang) {
    const grid = document.getElementById('allBranchesList');
    if (!grid) return;

    const card = document.createElement('div');
    card.className = 'mini-branch-card';
    card.onclick = () => {
        document.getElementById('branchSelect').value = branch.id;
        selectBranch();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    card.innerHTML = `
        <h5>${(lang === 'ar') ? branch.nameAr : branch.nameEn}</h5>
        <p>📍 ${branch.address.substring(0, 35)}...</p>
    `;
    grid.appendChild(card);
}

// 3. البحث اللحظي عن فرع (فلترة سريعة من المصفوفة المحلية)
function filterBranches() {
    const term = document.getElementById('branchSearch').value.toLowerCase();
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const grid = document.getElementById('allBranchesList');
    
    if (!grid) return;
    grid.innerHTML = "";

    const filtered = allBranches.filter(b => 
        b.nameAr.includes(term) || 
        b.nameEn.toLowerCase().includes(term) || 
        b.address.toLowerCase().includes(term)
    );

    filtered.forEach(branch => createMiniCard(branch, lang));
}

// 4. الاختيار من القائمة المنسدلة
function selectBranch() {
    const id = document.getElementById('branchSelect').value;
    if (!id) {
        document.getElementById('branchResult').style.display = 'none';
        return;
    }

    const branch = allBranches.find(b => b.id === id);
    if (branch) displayBranch(branch);
}

// 5. عرض بيانات الفرع في الكارت الرئيسي
function displayBranch(branch) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const card = document.getElementById('branchResult');
    
    document.getElementById('res-name').innerText = (lang === 'ar') ? branch.nameAr : branch.nameEn;
    document.getElementById('res-address').innerText = branch.address;
    document.getElementById('res-phone').innerText = branch.phone || "---";
    
    const mapLink = document.getElementById('res-map-link');
    mapLink.href = branch.mapUrl || "#";
    
    card.style.display = 'block';
    card.classList.add('animate-top'); // إضافة تأثير حركة عند الظهور
}

// 6. نسخ رابط الموقع
function copyLocation() {
    const url = document.getElementById('res-map-link').href;
    const lang = localStorage.getItem('preferredLang') || 'ar';
    
    navigator.clipboard.writeText(url).then(() => {
        const btn = document.getElementById('btn-copy');
        const originalText = btn.innerText;
        btn.innerText = (lang === 'en') ? "✅ Copied!" : "✅ تم النسخ!";
        setTimeout(() => {
            btn.innerText = originalText;
        }, 2000);
    });
}

// 7. نظام الترجمة الموحد لصفحة الفروع
function updatePageContent(lang) {
    const translations = {
        ar: {
            title: "فروع تمكين",
            header: "دليل فروع تمكين",
            back: "رجوع",
            search: "ابحث باسم الفرع أو المدينة...",
            default: "اختر الفرع من القائمة مباشرة...",
            active: "نشط",
            addr: "العنوان",
            phone: "رقم التواصل",
            map: "فتح في خرائط Google",
            copy: "نسخ الموقع",
            all: "جميع الفروع"
        },
        en: {
            title: "Tamkeen Branches",
            header: "Branches Directory",
            back: "Back",
            search: "Search by branch or city...",
            default: "Select branch from list...",
            active: "Active",
            addr: "Address",
            phone: "Contact",
            map: "Open in Google Maps",
            copy: "Copy Link",
            all: "All Branches"
        }
    };

    const t = translations[lang];
    if (!t) return;

    document.title = t.title;
    if(document.getElementById('txt-header')) document.getElementById('txt-header').innerText = t.header;
    if(document.getElementById('txt-back')) document.getElementById('txt-back').innerText = t.back;
    if(document.getElementById('branchSearch')) document.getElementById('branchSearch').placeholder = t.search;
    if(document.getElementById('opt-default')) document.getElementById('opt-default').innerText = t.default;
    if(document.getElementById('txt-active')) document.getElementById('txt-active').innerText = t.active;
    if(document.getElementById('lbl-address')) document.getElementById('lbl-address').innerText = t.addr;
    if(document.getElementById('lbl-phone')) document.getElementById('lbl-phone').innerText = t.phone;
    if(document.getElementById('txt-view-map')) document.getElementById('txt-view-map').innerText = t.map;
    if(document.getElementById('btn-copy')) document.getElementById('btn-copy').innerText = t.copy;
    if(document.getElementById('txt-all-branches')) document.getElementById('txt-all-branches').innerText = t.all;
}

// تشغيل عند التحميل
window.onload = () => {
    initBranches();
};
