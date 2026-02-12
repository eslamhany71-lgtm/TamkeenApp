// قاعدة بيانات الفروع
const branchesData = [
    {
        id: 1,
        nameAr: "فرع الدقي",
        nameEn: "Dokki Branch",
        addressAr: "12 شارع التحرير، الدقي، الجيزة - بجوار مترو الدقي",
        addressEn: "12 Tahrir St, Dokki, Giza - Near Dokki Metro",
        phone: "01012345678 - 022345678",
        mapUrl: "https://maps.app.goo.gl/xxxxxx"
    },
    {
        id: 2,
        nameAr: "فرع مدينة نصر",
        nameEn: "Nasr City Branch",
        addressAr: "شارع عباس العقاد، برج رقم 5، الدور الأول",
        addressEn: "Abbas El Akkad St, Tower 5, 1st Floor",
        phone: "01187654321",
        mapUrl: "https://maps.app.goo.gl/yyyyyy"
    }
    // تقدر تضيف فروع تانية هنا بنفس التنسيق
];

// ملء القائمة المنسدلة عند التحميل
function initBranches() {
    const select = document.getElementById('branchSelect');
    const lang = localStorage.getItem('preferredLang') || 'ar';
    
    branchesData.forEach(branch => {
        const option = document.createElement('option');
        option.value = branch.id;
        option.innerText = (lang === 'ar') ? branch.nameAr : branch.nameEn;
        select.appendChild(option);
    });
}

// البحث عن فرع
function filterBranches() {
    const term = document.getElementById('branchSearch').value.toLowerCase();
    const lang = localStorage.getItem('preferredLang') || 'ar';
    
    const found = branchesData.find(b => 
        b.nameAr.includes(term) || b.nameEn.toLowerCase().includes(term)
    );

    if (found) {
        displayBranch(found);
    }
}

// الاختيار من القائمة
function selectBranch() {
    const id = document.getElementById('branchSelect').value;
    const found = branchesData.find(b => b.id == id);
    if (found) displayBranch(found);
}

// عرض بيانات الفرع في الكارت
function displayBranch(branch) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const card = document.getElementById('branchResult');
    
    document.getElementById('res-name').innerText = (lang === 'ar') ? branch.nameAr : branch.nameEn;
    document.getElementById('res-address').innerText = (lang === 'ar') ? branch.addressAr : branch.addressEn;
    document.getElementById('res-phone').innerText = branch.phone;
    
    const mapLink = document.getElementById('res-map-link');
    mapLink.href = branch.mapUrl;
    
    card.style.display = 'block';
}

// نسخ الموقع
function copyLocation() {
    const url = document.getElementById('res-map-link').href;
    navigator.clipboard.writeText(url).then(() => {
        alert(localStorage.getItem('preferredLang') === 'en' ? "Location copied!" : "تم نسخ رابط الموقع!");
    });
}

// نظام الترجمة
function updatePageContent(lang) {
    const translations = {
        ar: { title: "فروع تمكين", header: "دليل الفروع", back: "رجوع", search: "ابحث باسم الفرع...", opt: "اختر الفرع من القائمة...", map: "دخول مباشر للموقع (Maps)", copy: "نسخ الموقع" },
        en: { title: "Tamkeen Branches", header: "Branches Directory", back: "Back", search: "Search branch name...", opt: "Select branch from list...", map: "Direct Google Maps", copy: "Copy Location" }
    };
    const t = translations[lang];
    document.title = t.title;
    if(document.getElementById('txt-header')) document.getElementById('txt-header').innerText = t.header;
    if(document.getElementById('btn-back')) document.getElementById('btn-back').innerText = t.back;
    if(document.getElementById('branchSearch')) document.getElementById('branchSearch').placeholder = t.search;
    if(document.getElementById('opt-default')) document.getElementById('opt-default').innerText = t.opt;
    if(document.getElementById('res-map-link')) document.getElementById('res-map-link').innerText = t.map;
    if(document.getElementById('btn-copy')) document.getElementById('btn-copy').innerText = t.copy;

    // تحديث أسماء الفروع في القائمة لو اللغة اتغيرت
    const select = document.getElementById('branchSelect');
    if (select) {
        select.innerHTML = `<option value="" id="opt-default">${t.opt}</option>`;
        branchesData.forEach(branch => {
            const option = document.createElement('option');
            option.value = branch.id;
            option.innerText = (lang === 'ar') ? branch.nameAr : branch.nameEn;
            select.appendChild(option);
        });
    }
}

window.onload = () => {
    initBranches();
    updatePageContent(localStorage.getItem('preferredLang') || 'ar');
};
