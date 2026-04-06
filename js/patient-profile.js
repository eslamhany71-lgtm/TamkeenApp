const db = firebase.firestore();
const urlParams = new URLSearchParams(window.location.search);
const patientId = urlParams.get('id');
const clinicId = sessionStorage.getItem('clinicId');

let currentPatientName = "مريض";
let loadedPatientSessions = []; 
let currentUserDisplayName = "مستخدم غير معروف";

const SESSIONS_PER_PAGE = 50;
let lastVisibleProfileSession = null;

// مش هنحتاج دالة getLang() اللي عملتها المرة اللي فاتت لأن applyLanguage بتاعتك بتعمل كل حاجة
// دالة updatePageContent دي اللي ملف lang-manager بتاعك بينادي عليها
function updatePageContent(lang) {
    const isAr = lang === 'ar';
    document.getElementById('searchSessionInput').placeholder = isAr ? 'بحث بالتاريخ، الإجراء...' : 'Search by date, procedure...';
    
    // إعادة رسم الجداول عشان تترجم محتوياتها
    if (loadedPatientSessions.length > 0) renderPatientSessionsTable();
    loadLabOrders(); // نحدث المعامل عشان اللغة
}

function openModal(id) { 
    document.getElementById(id).style.display = 'flex'; 
    if(id === 'sessionModal') {
        document.getElementById('sess_date').value = new Date().toISOString().split('T')[0];
    }
    if(id === 'labOrderModal') {
        document.getElementById('lab_date').value = new Date().toISOString().split('T')[0];
    }
}
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) { if (e.target === this) this.style.display = 'none'; });
    });
});

async function loadPatientData() {
    const isAr = (localStorage.getItem('preferredLang') || 'ar') === 'ar';
    if (!patientId || !clinicId) {
        document.getElementById('prof-name').innerText = isAr ? "خطأ: لم يتم العثور على المريض" : "Error: Patient not found";
        return;
    }

    if (window.showLoader) window.showLoader(isAr ? "جاري تحميل ملف المريض..." : "Loading patient profile...");

    try {
        const doc = await db.collection("Patients").doc(patientId).get();
        if (doc.exists) {
            const p = doc.data();
            currentPatientName = p.name;
            
            let debtHtml = '';
            if (p.totalDebt && p.totalDebt > 0) {
                const debtTxt = isAr ? "الديون" : "Debt";
                debtHtml = `<span style="color: #ef4444; font-size: 14px; font-weight: bold; background: #fee2e2; padding: 4px 10px; border-radius: 8px; margin-right: 15px; border: 1px solid #fca5a5;">${debtTxt}: ${p.totalDebt}</span>`;
            }
            
            document.getElementById('prof-name').innerHTML = `${p.name} ${debtHtml}`;
            document.getElementById('prof-phone').innerText = `📞 ${p.phone}`;
            document.getElementById('prof-age').innerText = `🎂 ${p.age} ${isAr ? 'سنة' : 'Y'}`;
            document.getElementById('prof-gender').innerText = `🚻 ${p.gender || (isAr ? 'غير محدد' : 'Unknown')}`;
            
            const alerts = document.getElementById('prof-alerts');
            alerts.innerHTML = '';
            if (p.medicalHistory && p.medicalHistory.length > 0) {
                p.medicalHistory.forEach(d => { alerts.innerHTML += `<span class="alert-tag">⚠️ ${d}</span>`; });
            } else {
                const safeTxt = isAr ? '✅ سليم / لا يوجد أمراض مزمنة' : '✅ Healthy / No Chronic Diseases';
                alerts.innerHTML = `<span style="color: #10b981; font-weight: bold;">${safeTxt}</span>`;
            }

            // 🔴 حل مشكلة جلب الجلسات: شلت الأوردر المعقد مؤقتاً عشان لو الاندكس فيه مشكلة يقرأ الداتا
            await loadPatientSessions(); 
            loadLabOrders(); 
        }
    } catch (e) { 
        console.error(e); 
    } finally {
        if (window.hideLoader) window.hideLoader();
    }
}

// ==========================================
// أكواد إدارة المعامل (Lab Management)
// ==========================================

async function saveLabOrder(e) {
    e.preventDefault();
    const isAr = (localStorage.getItem('preferredLang') || 'ar') === 'ar';
    const btn = document.getElementById('btn-save-lab');
    btn.disabled = true;
    
    if (window.showLoader) window.showLoader(isAr ? "جاري حفظ الطلب..." : "Saving Order...");

    const labCost = Number(document.getElementById('lab_cost').value) || 0;
    const workType = document.getElementById('lab_work_type').value;
    const labName = document.getElementById('lab_name').value;
    const orderDate = document.getElementById('lab_date').value;

    const labData = {
        clinicId: clinicId, patientId: patientId, date: orderDate,
        labName: labName, workType: workType, cost: labCost,
        deliveryDate: document.getElementById('lab_delivery_date').value || null,
        status: 'pending', createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection("LabOrders").add(labData);

        if (labCost > 0) {
            await db.collection("Finances").add({
                clinicId: clinicId, patientId: patientId, type: 'expense', category: isAr ? 'مصروفات معمل' : 'Lab Expense',
                amount: labCost, date: orderDate,
                notes: isAr ? `تكلفة معمل: ${labName} - للمريض: ${currentPatientName}` : `Lab Cost: ${labName} - Patient: ${currentPatientName}`,
                createdBy: currentUserDisplayName, createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        closeModal('labOrderModal');
        document.querySelector('#labOrderModal form').reset();
        alert(isAr ? "✅ تم إرسال الطلب بنجاح!" : "✅ Order sent successfully!");
        
    } catch (error) {
        console.error(error);
        alert(isAr ? "❌ خطأ أثناء الإرسال." : "❌ Error sending order.");
    } finally {
        btn.disabled = false;
        if (window.hideLoader) window.hideLoader();
    }
}

function loadLabOrders() {
    db.collection("LabOrders").where("patientId", "==", patientId).orderBy("createdAt", "desc").onSnapshot(snap => {
        const isAr = (localStorage.getItem('preferredLang') || 'ar') === 'ar';
        const container = document.getElementById('lab-orders-list');
        container.innerHTML = '';

        if (snap.empty) {
            container.innerHTML = `<div style="text-align: center; color: #64748b; padding: 20px;">${isAr ? 'لا توجد طلبات معمل.' : 'No lab orders.'}</div>`;
            return;
        }

        snap.forEach(doc => {
            const data = doc.data();
            const isPending = data.status === 'pending';
            
            const pendingTxt = isAr ? '⏳ قيد التنفيذ' : '⏳ Pending';
            const deliveredTxt = isAr ? '✅ تم الاستلام' : '✅ Delivered';
            const statusHtml = isPending ? `<span class="lab-status-pending">${pendingTxt}</span>` : `<span class="lab-status-delivered">${deliveredTxt}</span>`;
            
            const confirmBtnTxt = isAr ? '✔️ تأكيد الاستلام' : '✔️ Mark Delivered';
            const actionBtn = isPending ? `<button onclick="markLabOrderDelivered('${doc.id}')" style="background:#10b981; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:12px;">${confirmBtnTxt}</button>` : '';

            const deliveryTxt = data.deliveryDate ? `${isAr ? 'التسليم:' : 'Delivery:'} <strong dir="ltr">${data.deliveryDate}</strong>` : (isAr ? 'موعد غير محدد' : 'No date set');
            const labLabel = isAr ? 'معمل:' : 'Lab:';
            const costLabel = isAr ? 'التكلفة:' : 'Cost:';
            const delBtn = isAr ? '🗑️ حذف' : '🗑️ Delete';

            container.innerHTML += `
                <div class="lab-card">
                    <div style="flex: 2; min-width: 200px;">
                        <h4 style="margin: 0 0 5px 0; color: #0f172a; font-size: 16px;">${data.workType}</h4>
                        <div style="font-size: 13px; color: #64748b;">${labLabel} <strong>${data.labName}</strong> | ${costLabel} <strong>${data.cost}</strong></div>
                    </div>
                    <div style="flex: 1; text-align: left; min-width: 150px; display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                        ${statusHtml} <span style="font-size: 12px; color: #94a3b8;">${deliveryTxt}</span> ${actionBtn}
                        <button class="btn-action" style="background:#fee2e2; color:#ef4444; border-color:#fca5a5; padding: 4px 8px; font-size: 11px;" onclick="deleteDoc('LabOrders', '${doc.id}')">${delBtn}</button>
                    </div>
                </div>
            `;
        });
    });
}

async function markLabOrderDelivered(orderId) {
    const isAr = (localStorage.getItem('preferredLang') || 'ar') === 'ar';
    if(confirm(isAr ? "هل تم استلام الشغل من المعمل؟" : "Is the work delivered?")) {
        if(window.showLoader) window.showLoader(isAr ? "تحديث..." : "Updating...");
        try { await db.collection("LabOrders").doc(orderId).update({ status: 'delivered', deliveredAt: firebase.firestore.FieldValue.serverTimestamp() }); } 
        catch(e) { console.error(e); } finally { if(window.hideLoader) window.hideLoader(); }
    }
}

// ==========================================
// الجلسات الأساسية (بحل مشكلة الاستدعاء)
// ==========================================

function calculateRemaining(mode = 'add') {
    const prefix = mode === 'add' ? 'sess_' : 'edit_sess_';
    const total = Number(document.getElementById(`${prefix}total`).value) || 0;
    const paid = Number(document.getElementById(`${prefix}paid`).value) || 0;
    document.getElementById(`${prefix}remaining`).value = Math.max(0, total - paid);
}

async function saveSession(e, isEditMode) {
    e.preventDefault();
    const isAr = (localStorage.getItem('preferredLang') || 'ar') === 'ar';
    const prefix = isEditMode ? 'edit_sess_' : 'sess_';
    const btnId = isEditMode ? 'btn-update-session' : 'btn-save-session';
    const modalId = isEditMode ? 'editSessionModal' : 'sessionModal';
    
    const btn = document.getElementById(btnId);
    btn.disabled = true;

    if (window.showLoader) window.showLoader(isAr ? "جاري الحفظ..." : "Saving...");
    
    const totalAmount = Number(document.getElementById(`${prefix}total`).value) || 0;
    const paidAmount = Number(document.getElementById(`${prefix}paid`).value) || 0;
    const remainingAmount = Number(document.getElementById(`${prefix}remaining`).value) || 0;
    const sessionDate = document.getElementById(`${prefix}date`).value;
    const procedureName = document.getElementById(`${prefix}procedure`).value;

    const data = {
        clinicId: clinicId, patientId: patientId, date: sessionDate,
        nextAppointment: document.getElementById(`${prefix}next_date`).value || null,
        procedure: procedureName, tooth: document.getElementById(`${prefix}tooth`).value,
        notes: document.getElementById(`${prefix}notes`).value,
        total: totalAmount, paid: paidAmount, remaining: remainingAmount
    };
    
    try {
        if (isEditMode) {
            const docId = document.getElementById('edit_sess_id').value;
            const oldSession = loadedPatientSessions.find(s => s.id === docId);
            const oldRemaining = oldSession ? (oldSession.remaining || 0) : 0;
            const debtDiff = remainingAmount - oldRemaining;

            await db.collection("Sessions").doc(docId).update(data);
            
            if (debtDiff !== 0) {
                await db.collection("Patients").doc(patientId).update({ totalDebt: firebase.firestore.FieldValue.increment(debtDiff) });
                await db.collection("Finances").add({
                    clinicId: clinicId, patientId: patientId, type: 'debt', category: isAr ? 'تعديل مديونية جلسة' : 'Session Debt Adjustment',
                    amount: debtDiff, date: sessionDate, notes: isAr ? `تسوية ديون: ${procedureName}` : `Debt Adjust: ${procedureName}`,
                    createdBy: currentUserDisplayName, createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            const index = loadedPatientSessions.findIndex(s => s.id === docId);
            if(index !== -1) loadedPatientSessions[index] = { ...loadedPatientSessions[index], ...data };
            
        } else {
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            const docRef = await db.collection("Sessions").add(data);
            
            if (paidAmount > 0) {
                await db.collection("Finances").add({
                    clinicId: clinicId, patientId: patientId, type: 'income', category: isAr ? 'كشف / جلسة' : 'Session Income',
                    amount: paidAmount, date: sessionDate, notes: isAr ? `إيراد جلسة: ${procedureName}` : `Income: ${procedureName}`,
                    createdBy: currentUserDisplayName, createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            if (remainingAmount > 0) {
                await db.collection("Finances").add({
                    clinicId: clinicId, patientId: patientId, type: 'debt', category: isAr ? 'متبقي جلسة' : 'Session Remaining',
                    amount: remainingAmount, date: sessionDate, notes: isAr ? `مديونية جلسة: ${procedureName}` : `Debt: ${procedureName}`,
                    createdBy: currentUserDisplayName, createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                await db.collection("Patients").doc(patientId).update({ totalDebt: firebase.firestore.FieldValue.increment(remainingAmount) });
            }
            data.createdAt = new Date();
            loadedPatientSessions.unshift({ id: docRef.id, ...data });
        }
        
        closeModal(modalId); 
        document.getElementById(isEditMode ? 'editSessionForm' : 'addSessionForm').reset();
        sortDataLocally(loadedPatientSessions);
        renderPatientSessionsTable();
    } catch (error) { 
        console.error(error); 
        alert(isAr ? "حدث خطأ أثناء الحفظ." : "Error saving.");
    } finally {
        btn.disabled = false;
        if (window.hideLoader) window.hideLoader();
    }
}

async function paySessionDebt(sessionId, currentPaid, currentRemaining) {
    const isAr = (localStorage.getItem('preferredLang') || 'ar') === 'ar';
    const amountStr = prompt(isAr ? `المتبقي: ${currentRemaining}\nأدخل السداد:` : `Remaining: ${currentRemaining}\nEnter payment:`, currentRemaining);
    if (amountStr === null) return; 
    
    const amountToPay = Number(amountStr);
    if (isNaN(amountToPay) || amountToPay <= 0 || amountToPay > currentRemaining) return;

    if (window.showLoader) window.showLoader(isAr ? "تسجيل السداد..." : "Processing...");

    try {
        const newPaid = currentPaid + amountToPay;
        const newRemaining = currentRemaining - amountToPay;
        const today = new Date().toISOString().split('T')[0];

        await db.collection("Sessions").doc(sessionId).update({ paid: newPaid, remaining: newRemaining });
        await db.collection("Patients").doc(patientId).update({ totalDebt: firebase.firestore.FieldValue.increment(-amountToPay) });

        await db.collection("Finances").add({
            clinicId: clinicId, patientId: patientId, type: 'income', category: isAr ? 'سداد مديونية' : 'Debt Payment',
            amount: amountToPay, date: today, notes: isAr ? `سداد جزء من مديونية` : `Debt payment`,
            createdBy: currentUserDisplayName, createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        await db.collection("Finances").add({
            clinicId: clinicId, patientId: patientId, type: 'debt', category: isAr ? 'سداد مديونية' : 'Debt Payment',
            amount: -amountToPay, date: today, notes: isAr ? `خصم مديونية مسددة` : `Deduct paid debt`,
            createdBy: currentUserDisplayName, createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        const idx = loadedPatientSessions.findIndex(s => s.id === sessionId);
        if(idx !== -1) { loadedPatientSessions[idx].paid = newPaid; loadedPatientSessions[idx].remaining = newRemaining; }
        renderPatientSessionsTable();

    } catch (error) { console.error(error); } finally { if (window.hideLoader) window.hideLoader(); }
}

function getAccurateTime(timestamp) {
    if (!timestamp) return Infinity; 
    if (typeof timestamp.toMillis === 'function') return timestamp.toMillis();
    if (timestamp.seconds) return timestamp.seconds * 1000;
    return new Date(timestamp).getTime();
}

function sortDataLocally(dataArray) {
    dataArray.sort((a, b) => {
        const dateA = new Date(a.date || 0).getTime();
        const dateB = new Date(b.date || 0).getTime();
        if (dateA !== dateB) return dateB - dateA; 
        return getAccurateTime(b.createdAt) - getAccurateTime(a.createdAt);
    });
}

// 🔴 دالة الاستدعاء المحدثة: هنستخدم فلتر الـ patientId بس، وهنرتب عندنا محلياً عشان نتجنب مشكلة الـ Index
async function loadPatientSessions() {
    if (!patientId) return;
    const isAr = (localStorage.getItem('preferredLang') || 'ar') === 'ar';
    const tbody = document.getElementById('sessions-list');

    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center;">${isAr ? 'جاري التحميل...' : 'Loading...'}</td></tr>`;
    loadedPatientSessions = [];

    try {
        // بنجيب الداتا المربوطة بالمريض بس، الفايربيز هيقبل ده من غير Index معقد
        const snap = await db.collection("Sessions").where("patientId", "==", patientId).get();
        
        if (!snap.empty) {
            snap.forEach(doc => {
                const s = doc.data({ serverTimestamps: 'estimate' });
                s.id = doc.id;
                loadedPatientSessions.push(s);
            });
            
            // بنرتبهم هنا عندنا بالجافاسكريبت بالأحدث
            sortDataLocally(loadedPatientSessions);
            renderPatientSessionsTable();
        } else {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #64748b;">${isAr ? 'لا توجد جلسات.' : 'No sessions.'}</td></tr>`;
        }
    } catch (error) { 
        console.error("Error loading sessions:", error); 
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: red;">Error Loading Data</td></tr>`;
    }
}

function renderPatientSessionsTable(dataToRender = loadedPatientSessions) {
    const tbody = document.getElementById('sessions-list');
    tbody.innerHTML = '';
    const isAr = (localStorage.getItem('preferredLang') || 'ar') === 'ar';
    
    if(dataToRender.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color:#64748b;">${isAr ? 'لا توجد بيانات' : 'No Data'}</td></tr>`;
        return;
    }

    dataToRender.forEach(s => {
        const total = s.total || 0;
        const paid = s.paid || 0;
        const remaining = s.remaining || 0;
        const nextApp = s.nextAppointment ? `<span style="color:#d97706; font-weight:bold;">${s.nextAppointment}</span>` : '---';

        let timeStr = '---';
        if (s.createdAt) {
            try {
                const d = typeof s.createdAt.toDate === 'function' ? s.createdAt.toDate() : new Date(s.createdAt);
                timeStr = d.toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {hour: '2-digit', minute:'2-digit'});
            } catch(e) { timeStr = '---'; }
        }

        let payBtnHtml = '';
        if (remaining > 0) {
            payBtnHtml = `<button class="btn-action" style="background:#10b981; color:white; border-color:#059669;" onclick="paySessionDebt('${s.id}', ${paid}, ${remaining})">💰 ${isAr ? 'سداد' : 'Pay'}</button>`;
        }

        const toothLabel = isAr ? 'السن:' : 'Tooth:';
        const viewBtn = isAr ? '👁️ التفاصيل' : '👁️ View';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div style="display: flex; flex-direction: column; align-items: center;">
                    <span class="data-badge">${s.date}</span>
                    <span style="font-size: 13px; color: #64748b; margin-top: 4px; font-weight: bold;">${timeStr}</span>
                </div>
            </td>
            <td style="font-weight:bold; color:#0f172a;">${s.procedure} <br> <small style="color:gray;">${toothLabel} ${s.tooth || '---'}</small></td>
            <td style="font-weight:bold;">${total}</td>
            <td style="color: #10b981; font-weight: bold;">${paid}</td>
            <td style="color: ${remaining > 0 ? '#ef4444' : '#64748b'}; font-weight: bold;">${remaining}</td>
            <td dir="ltr">${nextApp}</td>
            <td style="text-align: center;">
                <div class="action-group">
                    ${payBtnHtml}
                    <button class="btn-view" onclick="viewSessionDetails('${s.id}')">${viewBtn}</button>
                    <button class="btn-action" style="background:#fff7ed; color:#d97706; border-color:#fed7aa;" onclick="openEditSession('${s.id}')">✏️</button>
                    <button class="btn-action" style="background:#fee2e2; color:#ef4444; border-color:#fca5a5;" onclick="deleteDoc('Sessions', '${s.id}')">🗑️</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openEditSession(docId) {
    const session = loadedPatientSessions.find(s => s.id === docId);
    if (!session) return;

    document.getElementById('edit_sess_id').value = session.id;
    document.getElementById('edit_sess_date').value = session.date;
    document.getElementById('edit_sess_next_date').value = session.nextAppointment || '';
    document.getElementById('edit_sess_procedure').value = session.procedure;
    document.getElementById('edit_sess_tooth').value = session.tooth || '';
    document.getElementById('edit_sess_notes').value = session.notes || '';
    document.getElementById('edit_sess_total').value = session.total || 0;
    document.getElementById('edit_sess_paid').value = session.paid || 0;
    document.getElementById('edit_sess_remaining').value = session.remaining || 0;

    openModal('editSessionModal');
}

function searchSessions() {
    const input = document.getElementById('searchSessionInput').value.trim().toLowerCase();
    if(!input) { resetSessionSearch(); return; }
    
    const filtered = loadedPatientSessions.filter(s => {
        return (s.procedure && s.procedure.toLowerCase().includes(input)) ||
               (s.date && s.date.includes(input)) ||
               (s.notes && s.notes.toLowerCase().includes(input)) ||
               (s.total && s.total.toString().includes(input));
    });
    
    renderPatientSessionsTable(filtered);
}

function resetSessionSearch() {
    document.getElementById('searchSessionInput').value = '';
    renderPatientSessionsTable();
}

function viewSessionDetails(sessionId) {
    window.parent.loadPage(`session-details.html?sessionId=${sessionId}&patientId=${patientId}`, window.parent.document.getElementById('nav-patients').parentElement);
}

async function deleteDoc(collectionName, docId) {
    const isAr = (localStorage.getItem('preferredLang') || 'ar') === 'ar';
    if(confirm(isAr ? "هل أنت متأكد من الحذف؟" : "Are you sure you want to delete?")) {
        if (window.showLoader) window.showLoader(isAr ? "جاري الحذف..." : "Deleting...");
        try { 
            await db.collection(collectionName).doc(docId).delete(); 
            if (collectionName === 'Sessions') {
                loadedPatientSessions = loadedPatientSessions.filter(s => s.id !== docId);
                renderPatientSessionsTable();
            }
        } 
        catch (e) { console.error(e); }
        finally { if (window.hideLoader) window.hideLoader(); }
    }
}

window.onload = () => {
    // مفيش داعي ننادي على applyLanguage هنا لأن ملف lang-manager بيعملها أوتوماتيك لما بيحمل
    firebase.auth().onAuthStateChanged(async (user) => { 
        if (user) { 
            try {
                const userDoc = await db.collection("Users").doc(user.email).get();
                if (userDoc.exists) {
                    const isAr = (localStorage.getItem('preferredLang') || 'ar') === 'ar';
                    currentUserDisplayName = userDoc.data().name || (isAr ? "مدير النظام" : "Admin");
                }
            } catch(e) { console.error(e); }

            loadPatientData(); 
        } 
    });
};
