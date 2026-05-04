// js/branches.js - Branches Management & Patient Transfer Logic
const db = firebase.firestore();
const clinicId = sessionStorage.getItem('clinicId');
let allBranches = [];
let allPatients = [];
let patientToMove = null;

function updatePageContent(lang) {
    const t = {
        ar: {
            title: "إدارة فروع العيادة", sub: "إضافة فروع جديدة ونقل المرضى بين الفروع", btnAdd: "إضافة فرع جديد",
            listTitle: "الفروع المسجلة", loading: "جاري تحميل الفروع...",
            transTitle: "🔄 مركز نقل ملفات المرضى", transDesc: "يمكنك البحث عن مريض ونقله بكامل سجلاته الطبية من فرع إلى فرع آخر.",
            lSearch: "ابحث عن المريض (بالاسم أو الموبايل)", plhSearch: "اكتب للبحث...",
            mBranchTitle: "إضافة فرع جديد", lBName: "اسم الفرع", lBPhone: "تليفون الفرع", lBAddr: "عنوان الفرع بالتفصيل", btnSaveB: "حفظ بيانات الفرع",
            mTransTitle: "نقل المريض لفرع آخر", lMoving: "نقل المريض:", lSelectB: "اختر الفرع الجديد لعملية النقل:", btnExec: "تأكيد عملية النقل ➔",
            warn: "⚠️ سيتم تحديث ملف المريض فوراً ليظهر في مواعيد وتقارير الفرع الجديد بشكل حصري.",
            msgSuccess: "تم حفظ الفرع بنجاح", msgTransOk: "تم نقل المريض بنجاح إلى الفرع الجديد", confDel: "هل تريد حذف هذا الفرع؟ لن يتم حذف المرضى التابعين له.",
            msgDuplicate: "❌ هذا الفرع مسجل بالفعل في النظام!" // 🔴 رسالة التكرار 🔴
        },
        en: {
            title: "Clinic Branches", sub: "Add new branches and transfer patients between them", btnAdd: "Add New Branch",
            listTitle: "Registered Branches", loading: "Loading branches...",
            transTitle: "🔄 Patient File Transfer", transDesc: "Search for a patient and move their entire medical record to another branch.",
            lSearch: "Search Patient (Name or Phone)", plhSearch: "Type to search...",
            mBranchTitle: "Add New Branch", lBName: "Branch Name", lBPhone: "Branch Phone", lBAddr: "Branch Address", btnSaveB: "Save Branch Data",
            mTransTitle: "Transfer Patient", lMoving: "Moving Patient:", lSelectB: "Select Target Branch:", btnExec: "Execute Transfer ➔",
            warn: "⚠️ Patient profile will be updated instantly to appear exclusively in the new branch.",
            msgSuccess: "Branch saved successfully", msgTransOk: "Patient transferred successfully", confDel: "Delete this branch? Patients won't be deleted.",
            msgDuplicate: "❌ This branch is already registered in the system!"
        }
    };
    const c = t[lang] || t.ar;
    const setTxt = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };

    setTxt('txt-title', c.title); setTxt('txt-subtitle', c.sub); setTxt('btn-add-branch-txt', c.btnAdd);
    setTxt('txt-branches-list-title', c.listTitle); setTxt('txt-loading-branches', c.loading);
    setTxt('txt-transfer-title', c.transTitle); setTxt('txt-transfer-desc', c.transDesc);
    setTxt('lbl-search-patient', c.lSearch); if(document.getElementById('search_patient_input')) document.getElementById('search_patient_input').placeholder = c.plhSearch;
    setTxt('mod-branch-title', c.mBranchTitle); setTxt('lbl-b-name', c.lBName); setTxt('lbl-b-phone', c.lBPhone); setTxt('lbl-b-address', c.lBAddr); setTxt('btn-save-branch', c.btnSaveB);
    setTxt('mod-transfer-title', c.mTransTitle); setTxt('lbl-select-branch', c.lSelectB); setTxt('txt-transfer-warn', c.warn);
    if(document.querySelector('.btn-modern-action')) document.querySelector('.btn-modern-action').innerText = c.btnExec;

    window.branchLang = c;
}

async function loadBranches() {
    if (!clinicId) return;
    const grid = document.getElementById('branches-grid');
    const select = document.getElementById('new_branch_select');
    
    db.collection("Branches").where("clinicId", "==", clinicId).onSnapshot(snap => {
        allBranches = [];
        grid.innerHTML = '';
        select.innerHTML = '<option value="">-- اختر الفرع --</option>';
        
        if (snap.empty) {
            grid.innerHTML = '<p style="text-align: center; color: #94a3b8; grid-column: 1/-1; padding: 30px; background: #f8fafc; border-radius: 16px; border: 2px dashed #e2e8f0;">لا يوجد فروع إضافية مسجلة. الفرع الرئيسي يعمل كفرع افتراضي.</p>';
            return;
        }

        snap.forEach(doc => {
            const b = doc.data();
            b.id = doc.id;
            allBranches.push(b);

            grid.innerHTML += `
                <div class="settings-card branch-card" style="margin-top:0; padding: 25px;">
                    <div style="display:flex; justify-content:space-between; align-items:start;">
                        <h4 style="margin:0; color:#0f172a; font-size: 18px;">🏢 ${b.name}</h4>
                        <button onclick="deleteBranch('${b.id}')" style="background:#fee2e2; color:#ef4444; border:none; cursor:pointer; padding: 8px; border-radius: 8px; transition: 0.2s;">🗑️</button>
                    </div>
                    <p style="font-size:14px; color:#475569; margin:15px 0 5px 0; font-weight: bold;"><span style="color:#0ea5e9;">📍</span> ${b.address}</p>
                    <p style="font-size:14px; color:#475569; margin:0; font-weight: bold;"><span style="color:#10b981;">📞</span> ${b.phone || '---'}</p>
                </div>
            `;
            
            select.innerHTML += `<option value="${b.id}">${b.name}</option>`;
        });
    });
}

async function saveBranch(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-branch');
    const branchName = document.getElementById('branch_name').value.trim();
    
    // 🔴 حماية ضد التكرار 🔴
    const isDuplicate = allBranches.some(b => b.name.toLowerCase() === branchName.toLowerCase());
    if (isDuplicate) {
        alert(window.branchLang.msgDuplicate || "هذا الفرع مسجل بالفعل!");
        return;
    }

    btn.disabled = true;

    const bData = {
        clinicId: clinicId,
        name: branchName,
        phone: document.getElementById('branch_phone').value.trim(),
        address: document.getElementById('branch_address').value.trim(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection("Branches").add(bData);
        alert(window.branchLang.msgSuccess);
        closeBranchModal();
    } catch (e) { console.error(e); }
    finally { btn.disabled = false; }
}

async function searchPatientsForTransfer() {
    const query = document.getElementById('search_patient_input').value.trim().toLowerCase();
    const resultsBox = document.getElementById('transfer-results');
    resultsBox.innerHTML = '';

    if (query.length < 2) return;

    if (allPatients.length === 0) {
        const snap = await db.collection("Patients").where("clinicId", "==", clinicId).get();
        allPatients = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    const filtered = allPatients.filter(p => 
        (p.name && p.name.toLowerCase().includes(query)) || 
        (p.phone && p.phone.includes(query))
    );

    filtered.forEach(p => {
        const currentBranch = allBranches.find(b => b.id === p.branchId)?.name || "الفرع الرئيسي/غير محدد";
        const div = document.createElement('div');
        div.className = 'patient-item';
        div.innerHTML = `
            <div>
                <strong style="color: #0f172a; font-size: 16px;">👤 ${p.name}</strong><br>
                <small style="color:#64748b; font-weight: bold;">الفرع الحالي: ${currentBranch}</small>
            </div>
            <button class="btn-transfer" onclick="openTransferModal('${p.id}', '${p.name}')">نقل المريض ➔</button>
        `;
        resultsBox.appendChild(div);
    });
}

async function executeTransfer() {
    const newBranchId = document.getElementById('new_branch_select').value;
    if (!newBranchId || !patientToMove) { alert("برجاء اختيار الفرع الجديد!"); return; }

    if (window.showLoader) window.showLoader("جاري نقل ملف المريض...");

    try {
        await db.collection("Patients").doc(patientToMove.id).update({
            branchId: newBranchId,
            lastTransferAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        alert(window.branchLang.msgTransOk);
        allPatients = []; 
        closeTransferModal();
        document.getElementById('search_patient_input').value = '';
        document.getElementById('transfer-results').innerHTML = '';
    } catch (e) { console.error(e); }
    finally { if (window.hideLoader) window.hideLoader(); }
}

// 🔴 دوال المودال بتأثيرات الـ CSS 🔴
function openAddBranchModal() { 
    document.getElementById('branchForm').reset(); 
    const modal = document.getElementById('branchModal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
}
function closeBranchModal() { 
    const modal = document.getElementById('branchModal');
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
}

function openTransferModal(id, name) { 
    patientToMove = { id, name }; 
    document.getElementById('target-patient-name').innerText = name;
    const modal = document.getElementById('transferConfirmModal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
}
function closeTransferModal() { 
    const modal = document.getElementById('transferConfirmModal');
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
}

async function deleteBranch(id) {
    if(confirm(window.branchLang.confDel)) {
        await db.collection("Branches").doc(id).delete();
    }
}

window.onload = () => {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.body.dir = lang === 'en' ? 'ltr' : 'rtl';
    document.body.setAttribute('data-theme', localStorage.getItem('niva_theme') || 'light');
    updatePageContent(lang);
    firebase.auth().onAuthStateChanged(user => { if(user) loadBranches(); });
};
