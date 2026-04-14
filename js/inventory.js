const db = firebase.firestore();
let currentClinicId = sessionStorage.getItem('clinicId');
let inventoryData = [];
let currentStockItemId = null;
let currentStockItemName = "";
let currentStockItemQty = 0;

let activeFilter = 'all';

let barcodeBuffer = "";
let barcodeTimeout = null;

// 🔴 متغير مكتبة الكاميرا 🔴
let html5QrcodeScanner = null;

// =========================================================
// 🔴 دوال الباركود (مسدس يدوي + كاميرا) 🔴
// =========================================================

// دالة فتح مودال الكاميرا وتشغيلها
window.openCameraScanner = function() {
    const modal = document.getElementById('cameraScannerModal');
    modal.style.display = 'flex';

    // تهيئة قارئ الباركود (بنديله إعدادات إنه يقرأ كل الصيغ)
    html5QrcodeScanner = new Html5Qrcode("reader");
    
    const config = { fps: 10, qrbox: { width: 250, height: 150 }, aspectRatio: 1.0 };
    
    // الدالة اللي هتتنفذ أول ما يلقط الكود
    const onScanSuccess = (decodedText, decodedResult) => {
        // اقفل الكاميرا الأول عشان متلقطش مرتين
        html5QrcodeScanner.stop().then(() => {
            closeCameraScanner();
            // ابعت الكود للدالة الأساسية بتاعتنا اللي بتوزع الشغل
            handleBarcodeScan(decodedText.trim());
        }).catch(err => {
            console.error("Error stopping scanner", err);
        });
    };

    const onScanFailure = (error) => {
        // أخطاء متجاهلة، لأنه بيعمل Scan 10 مرات في الثانية وبيفشل لحد ما يلقط
    };

    // تشغيل الكاميرا الخلفية (environment)
    html5QrcodeScanner.start({ facingMode: "environment" }, config, onScanSuccess, onScanFailure)
    .catch((err) => {
        console.error("Camera error", err);
        alert(document.body.dir === 'rtl' ? "تعذر فتح الكاميرا، يرجى إعطاء الصلاحية للمتصفح." : "Could not open camera. Please grant permissions.");
        closeCameraScanner();
    });
};

// دالة قفل مودال الكاميرا وإيقافها
window.closeCameraScanner = function() {
    const modal = document.getElementById('cameraScannerModal');
    modal.style.display = 'none';
    if (html5QrcodeScanner) {
        html5QrcodeScanner.stop().catch(err => console.log("Scanner already stopped"));
        html5QrcodeScanner.clear();
    }
};

// الدالة الأساسية اللي بتستقبل الكود (من المسدس أو الكاميرا)
function handleBarcodeScan(scannedCode) {
    const isAr = (localStorage.getItem('preferredLang') || 'ar') === 'ar';
    
    const foundItem = inventoryData.find(item => item.barcode === scannedCode);

    if (foundItem) {
        // لو موجود نورد رصيد
        openStockActionModal(foundItem.id, foundItem.name, foundItem.qty, 'add');
    } else {
        // لو جديد نضيفه
        openItemModal();
        document.getElementById('item_barcode').value = scannedCode;
        
        alert(isAr ? `تم التقاط باركود جديد (${scannedCode}). برجاء استكمال بيانات الصنف.` : `New barcode detected (${scannedCode}). Please complete item details.`);
        
        setTimeout(() => {
            document.getElementById('item_name').focus();
        }, 300);
    }
}

// مراقب مسدس الباركود (USB Scanner)
document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === 'Enter' && barcodeBuffer.length > 2) {
        handleBarcodeScan(barcodeBuffer);
        barcodeBuffer = ""; 
        return;
    }

    if (e.key !== 'Enter' && e.key !== 'Shift') {
        barcodeBuffer += e.key;
    }

    clearTimeout(barcodeTimeout);
    barcodeTimeout = setTimeout(() => {
        barcodeBuffer = "";
    }, 100);
});

// =========================================================

const dentalCatalog = [
    "بنج - أرتيكين (Articaine)", "بنج - ليدوكايين (Lidocaine)", "بنج - ميبيفاكين (Mepivacaine بدون أدرينالين)",
    "إبر بنج قصيرة (Short Needles)", "إبر بنج طويلة (Long Needles)", "سرنجة بنج معدن (Carpule Syringe)",
    "حشو - كومبوزيت A1", "حشو - كومبوزيت A2", "حشو - كومبوزيت A3", "حشو - كومبوزيت B1",
    "حشو سائل (Flowable Composite)", "حمض تخريش (Etch 37%)", "بوند (Bonding Agent)",
    "علاج جذور - فايلات يدوية (K-Files 15-40)", "علاج جذور - فايلات يدوية (H-Files)", "علاج جذور - روتاري (Rotary Files)",
    "أقماع جوتابيركا (Gutta Percha)", "أقماع ورقية (Paper Points)", "محلول صوديوم هيپوكلوريت (NaOCl)",
    "مذيب قنوات (EDTA)", "سيلر جذور (Root Canal Sealer)",
    "تركيبات - مادة مقاس ثقيلة (Putty Impression)", "تركيبات - مادة مقاس خفيفة (Light Body)", "تركيبات - ألجينات (Alginate)",
    "لصق جلاس أينومر (Glass Ionomer Cement)", "لصق ريزين (Resin Cement)", "بودرة وعصارة زنك فوسفات (Zinc Phosphate)",
    "جراحة - شفرات مشرط (Scalpel Blades)", "خيط جراحة (Surgical Sutures)", "شاش معقم (Sterile Gauze)",
    "إسفنج وقف النزيف (Gelfoam)", "مادة قفل العصب (MTA / Bioceramic)",
    "مستهلكات - جوانتي لاتكس (Latex Gloves)", "مستهلكات - جوانتي نيتريل (Nitrile Gloves)", "مستهلكات - ماسكات طبية (Face Masks)",
    "مستهلكات - بافتات مرضى (Patient Bibs)", "ماصة لعاب (Saliva Ejectors)", "رولات قطن (Cotton Rolls)",
    "أكياس تعقيم (Sterilization Pouches)", "أكواب بلاستيك (Plastic Cups)", "مادة تلميع وتبييض (Polishing Paste)",
    "فرش تلميع (Polishing Brushes)", "فلورايد وقائي (Fluoride Varnish)"
];

function updatePageContent(lang) {
    const t = {
        ar: {
            title: "المخزون الطبي", sub: "إدارة مستهلكات العيادة، الخامات، وتنبيهات النواقص", btnAdd: "➕ إضافة صنف للمخزن", searchPlh: "بحث باسم الخامة أو القسم...",
            statTotal: "إجمالي الأصناف", statLow: "نواقص (أوشك على الانتهاء)", statExp: "صلاحية منتهية / قريبة",
            thName: "اسم الخامة / الصنف", thCat: "القسم", thQty: "الرصيد", thExp: "تاريخ الصلاحية", thStatus: "حالة المخزون", thAction: "سحب / إضافة",
            mTitle: "إضافة صنف جديد", mTitleEdit: "تعديل صنف", lName: "اسم الخامة (اختر أو اكتب جديد)", lCat: "القسم", lQty: "الكمية الافتتاحية", lUnit: "الوحدة", lAlert: "الحد الأدنى للتنبيه", lExp: "تاريخ الصلاحية (اختياري)", btnSave: "حفظ الصنف",
            sTitle: "تعديل الرصيد", sAmount: "أدخل الكمية:", sCost: "إجمالي التكلفة / سعر الشراء (ج.م):", btnAddStock: "📥 إضافة (توريد)", btnConsume: "📤 سحب (استهلاك)",
            stGood: "متوفر", stLow: "نواقص", stExp: "منتهي الصلاحية", stExpSoon: "ينتهي قريباً",
            msgDel: "هل أنت متأكد من حذف هذا الصنف؟", msgStockErr: "الكمية المدخلة غير صحيحة أو أكبر من الرصيد المتاح!",
            btnBarcode: "📷 مسح بالكاميرا (سكان)", camTitle: "📷 ماسح الباركود", camSub: "قم بتوجيه الكاميرا نحو باركود المنتج (Barcode أو QR Code)"
        },
        en: {
            title: "Medical Inventory", sub: "Manage clinic supplies, materials, and shortage alerts", btnAdd: "➕ Add New Item", searchPlh: "Search item or category...",
            statTotal: "Total Items", statLow: "Low Stock (Shortages)", statExp: "Expired / Expiring Soon",
            thName: "Item Name", thCat: "Category", thQty: "Quantity", thExp: "Expiry Date", thStatus: "Status", thAction: "In / Out",
            mTitle: "Add New Item", mTitleEdit: "Edit Item", lName: "Item Name (Select or Type)", lCat: "Category", lQty: "Initial Qty", lUnit: "Unit", lAlert: "Min Alert Limit", lExp: "Expiry Date (Optional)", btnSave: "Save Item",
            sTitle: "Adjust Stock", sAmount: "Enter Quantity:", sCost: "Total Purchase Cost (EGP):", btnAddStock: "📥 Add Stock", btnConsume: "📤 Consume",
            stGood: "In Stock", stLow: "Low Stock", stExp: "Expired", stExpSoon: "Expiring Soon",
            msgDel: "Are you sure you want to delete this item?", msgStockErr: "Invalid quantity or exceeds available stock!",
            btnBarcode: "📷 Scan with Camera", camTitle: "📷 Barcode Scanner", camSub: "Point camera at the product barcode or QR Code"
        }
    };
    const c = t[lang] || t.ar;
    const setTxt = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };
    const setPlh = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).placeholder = txt; };

    setTxt('txt-title', c.title); setTxt('txt-subtitle', c.sub); setTxt('btn-add-item', c.btnAdd); setPlh('searchInput', c.searchPlh);
    setTxt('txt-stat-total', c.statTotal); setTxt('txt-stat-low', c.statLow); setTxt('txt-stat-exp', c.statExp);
    setTxt('th-name', c.thName); setTxt('th-category', c.thCat); setTxt('th-qty', c.thQty); setTxt('th-exp', c.thExp); setTxt('th-status', c.thStatus); setTxt('th-actions', c.thAction);
    if(document.getElementById('modal-title')) setTxt('modal-title', c.mTitle);
    setTxt('lbl-item-name', c.lName); setTxt('lbl-item-cat', c.lCat); setTxt('lbl-item-qty', c.lQty); setTxt('lbl-item-unit', c.lUnit); setTxt('lbl-item-alert', c.lAlert); setTxt('lbl-item-exp', c.lExp); setTxt('btn-save-item', c.btnSave);
    setTxt('stock-modal-title', c.sTitle); setTxt('lbl-stock-amount', c.sAmount); setTxt('lbl-stock-cost', c.sCost); setTxt('btn-stock-add', c.btnAddStock); setTxt('btn-stock-consume', c.btnConsume);
    setTxt('btn-manual-barcode', c.btnBarcode);
    setTxt('cam-modal-title', c.camTitle); setTxt('cam-modal-sub', c.camSub);

    window.invLang = c;
}

function populateCatalog() {
    const dataList = document.getElementById('dental-catalog');
    if (!dataList) return;
    dataList.innerHTML = '';
    dentalCatalog.forEach(item => {
        const option = document.createElement('option');
        option.value = item;
        dataList.appendChild(option);
    });
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function openItemModal() {
    document.getElementById('itemForm').reset();
    document.getElementById('item_id').value = '';
    document.getElementById('item_barcode').value = ''; 
    document.getElementById('modal-title').innerText = window.invLang.mTitle;
    document.getElementById('item_qty').disabled = false; 
    document.getElementById('item_initial_cost').value = '0';
    document.getElementById('item_initial_pay_method').value = 'cash';
    openModal('itemModal');
}

async function saveItem(e) {
    e.preventDefault();
    const isAr = (localStorage.getItem('preferredLang') || 'ar') === 'ar';
    if (window.showLoader) window.showLoader(isAr ? "جاري الحفظ..." : "Saving...");

    const itemId = document.getElementById('item_id').value;
    const itemName = document.getElementById('item_name').value.trim();
    const initialQty = Number(document.getElementById('item_qty').value);
    const initialCost = Number(document.getElementById('item_initial_cost').value) || 0;
    const payMethod = document.getElementById('item_initial_pay_method').value;
    const barcode = document.getElementById('item_barcode').value.trim(); 

    const data = {
        clinicId: currentClinicId,
        name: itemName,
        category: document.getElementById('item_category').value,
        qty: initialQty,
        unit: document.getElementById('item_unit').value,
        minAlert: Number(document.getElementById('item_min_alert').value),
        expiryDate: document.getElementById('item_exp').value || null,
        barcode: barcode || null, 
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        if (itemId) {
            delete data.qty; 
            await db.collection("Inventory").doc(itemId).update(data);
        } else {
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection("Inventory").add(data);

            if (initialCost > 0) {
                const today = new Date().toISOString().split('T')[0];
                await db.collection("Finances").add({
                    clinicId: currentClinicId,
                    type: 'expense',
                    category: isAr ? 'مشتريات خامات ومخزون' : 'Inventory Purchase',
                    amount: initialCost,
                    date: today,
                    paymentMethod: payMethod,
                    notes: isAr ? `توريد أول كمية (${initialQty}) للصنف: ${itemName}` : `Initial stock (${initialQty}) for: ${itemName}`,
                    createdBy: "Admin",
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        }
        closeModal('itemModal');
    } catch (err) {
        console.error(err);
        alert(isAr ? "حدث خطأ أثناء الحفظ" : "Error saving item");
    } finally {
        if (window.hideLoader) window.hideLoader();
    }
}

function openStockActionModal(id, name, currentQty, actionType) {
    currentStockItemId = id;
    currentStockItemName = name;
    currentStockItemQty = Number(currentQty);

    document.getElementById('stock-item-name').innerText = name;
    document.getElementById('stock-current-qty').querySelector('span').innerText = currentQty;
    document.getElementById('stock_amount').value = 1;
    document.getElementById('stock_cost').value = 0;
    document.getElementById('stock_pay_method').value = 'cash'; 

    const btnAdd = document.getElementById('btn-stock-add');
    const btnConsume = document.getElementById('btn-stock-consume');
    const costContainer = document.getElementById('stock-cost-container');

    setTimeout(() => { document.getElementById('stock_amount').focus(); }, 100);

    if (actionType === 'add') {
        btnAdd.style.display = 'flex';
        btnConsume.style.display = 'none';
        costContainer.style.display = 'block'; 
    } else {
        btnAdd.style.display = 'none';
        btnConsume.style.display = 'flex';
        costContainer.style.display = 'none'; 
    }

    openModal('stockActionModal');
}

async function executeStockAction(type) {
    const amount = Number(document.getElementById('stock_amount').value);
    const cost = Number(document.getElementById('stock_cost').value) || 0;
    const payMethod = document.getElementById('stock_pay_method').value; 
    const isAr = (localStorage.getItem('preferredLang') || 'ar') === 'ar';

    if (!amount || amount <= 0 || (type === 'consume' && amount > currentStockItemQty)) {
        alert(window.invLang.msgStockErr);
        return;
    }

    if (window.showLoader) window.showLoader(isAr ? "جاري التحديث..." : "Updating...");

    let newQty = type === 'add' ? currentStockItemQty + amount : currentStockItemQty - amount;

    try {
        await db.collection("Inventory").doc(currentStockItemId).update({
            qty: newQty,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        if (type === 'add' && cost > 0) {
            const today = new Date().toISOString().split('T')[0];
            await db.collection("Finances").add({
                clinicId: currentClinicId,
                type: 'expense',
                category: isAr ? 'مشتريات خامات ومخزون' : 'Inventory Purchase',
                amount: cost,
                date: today,
                paymentMethod: payMethod, 
                notes: isAr ? `توريد كمية (${amount}) للصنف: ${currentStockItemName}` : `Stock added (${amount}) for: ${currentStockItemName}`,
                createdBy: "Admin",
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        closeModal('stockActionModal');
    } catch (err) {
        console.error(err);
    } finally {
        if (window.hideLoader) window.hideLoader();
    }
}

function editItem(id) {
    const item = inventoryData.find(i => i.id === id);
    if (!item) return;

    document.getElementById('item_id').value = item.id;
    document.getElementById('item_name').value = item.name;
    document.getElementById('item_category').value = item.category;
    document.getElementById('item_qty').value = item.qty;
    document.getElementById('item_qty').disabled = true; 
    document.getElementById('item_unit').value = item.unit;
    document.getElementById('item_min_alert').value = item.minAlert;
    document.getElementById('item_exp').value = item.expiryDate || '';
    document.getElementById('item_barcode').value = item.barcode || ''; 

    document.getElementById('item_initial_cost').parentElement.parentElement.style.display = 'none';

    document.getElementById('modal-title').innerText = window.invLang.mTitleEdit;
    openModal('itemModal');
}

async function deleteItem(id) {
    if (confirm(window.invLang.msgDel)) {
        const isAr = (localStorage.getItem('preferredLang') || 'ar') === 'ar';
        if (window.showLoader) window.showLoader(isAr ? "جاري الحذف..." : "Deleting...");
        try {
            await db.collection("Inventory").doc(id).delete();
        } catch (e) {
            console.error(e);
        } finally {
            if (window.hideLoader) window.hideLoader();
        }
    }
}

function loadInventory() {
    if (!currentClinicId) return;

    db.collection("Inventory").where("clinicId", "==", currentClinicId)
      .orderBy("updatedAt", "desc")
      .onSnapshot(snap => {
        inventoryData = [];
        let totalItems = 0;
        let lowStockCount = 0;
        let expiringCount = 0;
        
        const now = new Date();
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

        snap.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            inventoryData.push(data);
            
            totalItems++;
            if (data.qty <= data.minAlert) lowStockCount++;
            
            if (data.expiryDate) {
                const expDate = new Date(data.expiryDate);
                if (expDate.getTime() - now.getTime() < thirtyDaysMs) {
                    expiringCount++;
                }
            }
        });

        document.getElementById('stat-total-items').innerText = totalItems;
        document.getElementById('stat-low-stock').innerText = lowStockCount;
        document.getElementById('stat-expiring').innerText = expiringCount;

        applyCurrentFilterAndSearch();
    });
}

function filterInventory(type) {
    activeFilter = type;
    
    document.querySelectorAll('.stat-card').forEach(card => card.classList.remove('active-stat'));
    document.getElementById(`card-${type}`).classList.add('active-stat');
    
    applyCurrentFilterAndSearch();
}

function searchInventory() {
    applyCurrentFilterAndSearch();
}

function applyCurrentFilterAndSearch() {
    const input = document.getElementById('searchInput').value.trim().toLowerCase();
    let filteredData = inventoryData;

    if (input) {
        filteredData = filteredData.filter(i => 
            (i.name && i.name.toLowerCase().includes(input)) || 
            (i.category && i.category.toLowerCase().includes(input)) ||
            (i.barcode && i.barcode.includes(input)) 
        );
    }

    const now = new Date();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    if (activeFilter === 'low') {
        filteredData = filteredData.filter(item => item.qty <= item.minAlert);
    } else if (activeFilter === 'exp') {
        filteredData = filteredData.filter(item => {
            if (!item.expiryDate) return false;
            const expDate = new Date(item.expiryDate);
            return (expDate.getTime() - now.getTime() < thirtyDaysMs);
        });
    }

    renderInventoryTable(filteredData);
}

function renderInventoryTable(dataToRender) {
    const tbody = document.getElementById('inventoryBody');
    tbody.innerHTML = '';
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const isAr = lang === 'ar';

    if (dataToRender.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #64748b;">${isAr ? 'لا توجد أصناف مطابقة للبحث أو الفلتر' : 'No items match your filter/search'}</td></tr>`;
        return;
    }

    const now = new Date();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    dataToRender.forEach(item => {
        let statusHtml = '';
        let rowStyle = '';
        
        let isLow = item.qty <= item.minAlert;
        let isExpiring = false;
        let isExpired = false;

        if (item.expiryDate) {
            const expDate = new Date(item.expiryDate);
            const diff = expDate.getTime() - now.getTime();
            if (diff < 0) isExpired = true;
            else if (diff < thirtyDaysMs) isExpiring = true;
        }

        if (isExpired) {
            statusHtml = `<span class="badge-danger">${window.invLang.stExp}</span>`;
            rowStyle = 'background: #fef2f2;';
        } else if (isLow) {
            statusHtml = `<span class="badge-warning">${window.invLang.stLow}</span>`;
            rowStyle = 'background: #fffbeb;';
        } else if (isExpiring) {
            statusHtml = `<span class="badge-warning" style="background:#fecaca; color:#991b1b; border-color:#f87171;">${window.invLang.stExpSoon}</span>`;
        } else {
            statusHtml = `<span class="badge-success">${window.invLang.stGood}</span>`;
        }

        const qtyDisplay = `<strong style="font-size: 16px; color: ${isLow ? '#dc2626' : '#0f172a'};">${item.qty}</strong> <small style="color: #64748b;">${item.unit}</small>`;

        const tr = document.createElement('tr');
        tr.style.cssText = rowStyle;
        tr.innerHTML = `
            <td style="font-weight: bold; color: #0f172a;">
                ${item.name}
                ${item.barcode ? '<br><small style="color:#94a3b8; font-weight:normal;">' + item.barcode + '</small>' : ''} 
            </td>
            <td><span style="background: #f1f5f9; padding: 4px 8px; border-radius: 6px; font-size: 12px; border: 1px solid #e2e8f0; color: #475569;">${item.category}</span></td>
            <td style="text-align: center;">${qtyDisplay}</td>
            <td style="color: ${isExpired || isExpiring ? '#dc2626' : '#475569'}; font-weight: ${isExpired || isExpiring ? 'bold' : 'normal'};" dir="ltr">${item.expiryDate || '---'}</td>
            <td style="text-align: center;">${statusHtml}</td>
            <td style="text-align: center; white-space: nowrap;">
                <div style="display: inline-flex; gap: 5px;">
                    <button class="btn-action" style="background:#dcfce7; color:#166534; border-color:#bbf7d0;" onclick="openStockActionModal('${item.id}', '${item.name}', ${item.qty}, 'add')" title="${isAr?'توريد':'Add'}">📥</button>
                    <button class="btn-action" style="background:#fef3c7; color:#b45309; border-color:#fde68a;" onclick="openStockActionModal('${item.id}', '${item.name}', ${item.qty}, 'consume')" title="${isAr?'سحب':'Consume'}">📤</button>
                    <button class="btn-action" style="background:#f1f5f9; color:#0ea5e9; border-color:#bae6fd;" onclick="editItem('${item.id}')" title="${isAr?'تعديل':'Edit'}">✏️</button>
                    <button class="btn-action" style="background:#fee2e2; color:#ef4444; border-color:#fca5a5;" onclick="deleteItem('${item.id}')" title="${isAr?'حذف':'Delete'}">🗑️</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.onload = () => {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.body.dir = lang === 'en' ? 'ltr' : 'rtl';
    
    populateCatalog(); 
    
    if(window.translations) updatePageContent(lang);
    else setTimeout(() => updatePageContent(lang), 500);
    
    firebase.auth().onAuthStateChanged((user) => {
        if (user) loadInventory();
    });
};

window.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        // لو دسنا بره مودال الكاميرا، نقفلها صح عشان ميفضلش اللمبة منورة
        if (e.target.id === 'cameraScannerModal') {
            closeCameraScanner();
        } else {
            e.target.style.display = 'none';
        }
    }
});
