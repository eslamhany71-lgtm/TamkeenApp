// 1. تحميل الفروع من Firestore
function initBranches() {
    const select = document.getElementById('branchSelect');
    const lang = localStorage.getItem('preferredLang') || 'ar';
    
    // سحب البيانات من جدول Branches
    firebase.firestore().collection("Branches").get().then((querySnapshot) => {
        select.innerHTML = `<option value="">${lang === 'ar' ? 'اختر الفرع من القائمة...' : 'Select branch...'}</option>`;
        
        querySnapshot.forEach((doc) => {
            const branch = doc.data();
            const option = document.createElement('option');
            option.value = branch.id;
            option.innerText = (lang === 'ar') ? branch.nameAr : branch.nameEn;
            select.appendChild(option);
        });
    });
}

// 2. البحث عن فرع
function filterBranches() {
    const term = document.getElementById('branchSearch').value.toLowerCase();
    if (!term) return;

    firebase.firestore().collection("Branches").get().then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
            const branch = doc.data();
            if (branch.nameAr.includes(term) || branch.nameEn.toLowerCase().includes(term)) {
                displayBranch(branch);
            }
        });
    });
}

// 3. الاختيار من القائمة
function selectBranch() {
    const id = document.getElementById('branchSelect').value;
    if (!id) return;

    firebase.firestore().collection("Branches").doc(id).get().then((doc) => {
        if (doc.exists) displayBranch(doc.data());
    });
}

// 4. عرض بيانات الفرع
function displayBranch(branch) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const card = document.getElementById('branchResult');
    
    document.getElementById('res-name').innerText = (lang === 'ar') ? branch.nameAr : branch.nameEn;
    document.getElementById('res-address').innerText = branch.address; // العنوان كما هو
    document.getElementById('res-phone').innerText = branch.phone;
    
    const mapLink = document.getElementById('res-map-link');
    mapLink.href = branch.mapUrl;
    
    card.style.display = 'block';
}

function copyLocation() {
    const url = document.getElementById('res-map-link').href;
    navigator.clipboard.writeText(url).then(() => {
        alert(localStorage.getItem('preferredLang') === 'en' ? "Location copied!" : "تم نسخ الرابط!");
    });
}

window.onload = () => {
    initBranches();
};
