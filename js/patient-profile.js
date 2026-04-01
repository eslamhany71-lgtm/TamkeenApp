const db = firebase.firestore();
const urlParams = new URLSearchParams(window.location.search);
const patientId = urlParams.get('id');
const clinicId = sessionStorage.getItem('clinicId');

let currentPatientName = "مريض";
let loadedPatientSessions = []; 

// 🔴 متغيرات الـ Pagination 🔴
const SESSIONS_PER_PAGE = 50;
let lastVisibleProfileSession = null;

// 1. نظام الترجمة
function updatePageContent(lang) {
    const isAr = lang === 'ar';
    document.body.dir = isAr ? 'rtl' : 'ltr';
    if(isAr) {
        document.getElementById('txt-back').innerText = "العودة لقائمة المرضى";
    } else {
        document.getElementById('txt-back').innerText = "Back to Patients";
    }
}

// 2. التحكم في النوافذ (Modals)
function openModal(id) { 
    document.getElementById(id).style.display = 'flex'; 
    if(id === 'sessionModal') {
        document.getElementById('sess_date').value = new Date().toISOString().split('T')[0];
    }
}
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) { if (e.target === this) this.style.display = 'none'; });
    });
});

// 3. جلب بيانات المريض الأساسية
async function loadPatientData() {
    if (!patientId || !clinicId) {
        document.getElementById('prof-name').innerText = "خطأ: لم يتم العثور على المريض";
        return;
    }
    try {
        const doc = await db.collection("Patients").doc(patientId).get();
        if (doc.exists) {
            const p = doc.data();
            currentPatientName = p.name;
            
            // 🔴 عرض بادج الديون لو عليه فلوس 🔴
            let debtHtml = '';
            if (p.totalDebt && p.totalDebt > 0) {
                debtHtml = `<span style="color: #ef4444; font-size: 14px; font-weight: bold; background: #fee2e2; padding: 4px 10px; border-radius: 8px; margin-right: 15px; border: 1px solid #fca5a5;">الديون: ${p.totalDebt} ج.م</span>`;
            }
            
            document.getElementById('prof-name').innerHTML = `${p.name} ${debtHtml}`;
            document.getElementById('prof-phone').innerText = `📞 ${p.phone}`;
            document.getElementById('prof-age').innerText = `🎂 ${p.age} سنة`;
            document.getElementById('prof-gender').innerText = `🚻 ${p.gender || 'غير محدد'}`;
            
            const alerts = document.getElementById('prof-alerts');
            alerts.innerHTML = '';
            if (p.medicalHistory && p.medicalHistory.length > 0) {
                p.medicalHistory.forEach(d => { alerts.innerHTML += `<span class="alert-tag">⚠️ ${d}</span>`; });
            } else {
                alerts.innerHTML = `<span style="color: #10b981; font-weight: bold;">✅ سليم / لا يوجد أمراض مزمنة</span>`;
            }

            loadPatientSessions(); 
        }
    } catch (e) { console.error(e); }
}

function calculateRemaining(mode = 'add') {
    const prefix = mode === 'add' ? 'sess_' : 'edit_sess_';
    const total = Number(document.getElementById(`${prefix}total`).value) || 0;
    const paid = Number(document.getElementById(`${prefix}paid`).value) || 0;
    let remaining = total - paid;
    if (remaining < 0) remaining = 0; 
    document.getElementById(`${prefix}remaining`).value = remaining;
}

// 🔴 5. إضافة وتعديل الجلسة (مع ربط الخزنة والمديونية) 🔴
async function saveSession(e, isEditMode) {
    e.preventDefault();
    const prefix = isEditMode ? 'edit_sess_' : 'sess_';
    const btnId = isEditMode ? 'btn-update-session' : 'btn-save-session';
    const modalId = isEditMode ? 'editSessionModal' : 'sessionModal';
    
    const btn = document.getElementById(btnId);
    btn.disabled = true;
    btn.innerText = "جاري الحفظ...";
    
    const totalAmount = Number(document.getElementById(`${prefix}total`).value) || 0;
    const paidAmount = Number(document.getElementById(`${prefix}paid`).value) || 0;
    const remainingAmount = Number(document.getElementById(`${prefix}remaining`).value) || 0;

    const sessionDate = document.getElementById(`${prefix}date`).value;
    const procedureName = document.getElementById(`${prefix}procedure`).value;

    const data = {
        clinicId: clinicId, 
        patientId: patientId,
        date: sessionDate,
        nextAppointment: document.getElementById(`${prefix}next_date`).value || null,
        procedure: procedureName,
        tooth: document.getElementById(`${prefix}tooth`).value,
        notes: document.getElementById(`${prefix}notes`).value,
        total: totalAmount,
        paid: paidAmount,
        remaining: remainingAmount
    };
    
    try {
        if (isEditMode) {
            const docId = document.getElementById('edit_sess_id').value;
            // عشان نعدل فلوس الجلسة صح، لازم نحسب الفرق في المديونية
            const oldSession = loadedPatientSessions.find(s => s.id === docId);
            const oldRemaining = oldSession ? (oldSession.remaining || 0) : 0;
            const debtDiff = remainingAmount - oldRemaining;

            await db.collection("Sessions").doc(docId).update(data);
            
            // لو زود أو نقص المديونية أثناء التعديل
            if (debtDiff !== 0) {
                await db.collection("Patients").doc(patientId).update({
                    totalDebt: firebase.firestore.FieldValue.increment(debtDiff)
                });
                
                // إضافة حركة دين لتعديل الميزان
                await db.collection("Finances").add({
                    clinicId: clinicId, patientId: patientId,
                    type: 'debt', category: 'تعديل مديونية جلسة',
                    amount: debtDiff, date: sessionDate,
                    notes: `تسوية ديون بناءً على تعديل جلسة: ${procedureName}`,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            const index = loadedPatientSessions.findIndex(s => s.id === docId);
            if(index !== -1) loadedPatientSessions[index] = { ...loadedPatientSessions[index], ...data };
            
        } else {
            // 🔴 حالة إضافة جلسة جديدة 🔴
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            const docRef = await db.collection("Sessions").add(data);
            
            // 1. تسجيل الإيراد المدفوع في الخزنة
            if (paidAmount > 0) {
                await db.collection("Finances").add({
                    clinicId: clinicId, patientId: patientId,
                    type: 'income', category: 'كشف / جلسة',
                    amount: paidAmount, date: sessionDate,
                    notes: `إيراد جلسة: ${procedureName} - مريض: ${currentPatientName}`,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            // 2. تسجيل المديونية وتزويد حساب المريض
            if (remainingAmount > 0) {
                await db.collection("Finances").add({
                    clinicId: clinicId, patientId: patientId,
                    type: 'debt', category: 'متبقي جلسة',
                    amount: remainingAmount, date: sessionDate,
                    notes: `مديونية جلسة: ${procedureName} - مريض: ${currentPatientName}`,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                await db.collection("Patients").doc(patientId).update({
                    totalDebt: firebase.firestore.FieldValue.increment(remainingAmount)
                });
            }

            loadedPatientSessions.unshift({ id: docRef.id, ...data });
        }
        
        closeModal(modalId); 
        document.getElementById(isEditMode ? 'editSessionForm' : 'addSessionForm').reset();
        loadPatientData(); // ريفرش عشان البادج الأحمر يتحدث
    } catch (error) { 
        console.error(error); 
        alert("حدث خطأ أثناء الحفظ.");
    } finally {
        btn.disabled = false;
        btn.innerText = isEditMode ? "حفظ التعديلات" : "حفظ الجلسة";
    }
}

// 🔴 دالة سداد المديونية (الدورة العكسية) 🔴
async function paySessionDebt(sessionId, currentPaid, currentRemaining) {
    const amountStr = prompt(`المبلغ المتبقي: ${currentRemaining} ج.م\nأدخل المبلغ المراد سداده الآن:`, currentRemaining);
    if (amountStr === null) return; // تم الإلغاء
    
    const amountToPay = Number(amountStr);
    if (isNaN(amountToPay) || amountToPay <= 0 || amountToPay > currentRemaining) {
        alert("❌ يرجى إدخال مبلغ صحيح لا يتجاوز المتبقي.");
        return;
    }

    try {
        const newPaid = currentPaid + amountToPay;
        const newRemaining = currentRemaining - amountToPay;
        const today = new Date().toISOString().split('T')[0];

        // 1. تحديث الجلسة
        await db.collection("Sessions").doc(sessionId).update({
            paid: newPaid,
            remaining: newRemaining
        });

        // 2. خصم من ديون المريض
        await db.collection("Patients").doc(patientId).update({
            totalDebt: firebase.firestore.FieldValue.increment(-amountToPay)
        });

        // 3. إضافة الإيراد للخزنة
        await db.collection("Finances").add({
            clinicId: clinicId, patientId: patientId,
            type: 'income', category: 'سداد مديونية',
            amount: amountToPay, date: today,
            notes: `سداد جزء من مديونية سابقة للمريض: ${currentPatientName}`,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 4. خصم المديونية من الداش بورد (بحركة دين سالبة)
        await db.collection("Finances").add({
            clinicId: clinicId, patientId: patientId,
            type: 'debt', category: 'سداد مديونية',
            amount: -amountToPay, date: today,
            notes: `خصم مديونية مسددة للمريض: ${currentPatientName}`,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert("✅ تم سداد المبلغ وتسجيله كإيراد في الخزنة بنجاح!");
        
        // تحديث محلي
        const idx = loadedPatientSessions.findIndex(s => s.id === sessionId);
        if(idx !== -1) {
            loadedPatientSessions[idx].paid = newPaid;
            loadedPatientSessions[idx].remaining = newRemaining;
        }
        loadPatientData(); // تحديث عشان البادج الأحمر يتغير

    } catch (error) {
        console.error(error);
        alert("حدث خطأ أثناء السداد.");
    }
}

// 6. جلب الجلسات بالتقسيم
async function loadPatientSessions(isLoadMore = false) {
    if (!patientId) return;
    const tbody = document.getElementById('sessions-list');
    const btnMore = document.getElementById('btn-load-more-sessions');

    if (!isLoadMore) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">جاري التحميل...</td></tr>';
        loadedPatientSessions = [];
        lastVisibleProfileSession = null;
    } else {
        btnMore.innerText = "..."; btnMore.disabled = true;
    }

    try {
        let queryRef = db.collection("Sessions")
                         .where("patientId", "==", patientId)
                         .orderBy("date", "desc")
                         .limit(SESSIONS_PER_PAGE);

        if (isLoadMore && lastVisibleProfileSession) queryRef = queryRef.startAfter(lastVisibleProfileSession);

        const snap = await queryRef.get();
        if (!snap.empty) {
            lastVisibleProfileSession = snap.docs[snap.docs.length - 1];
            
            snap.forEach(doc => {
                const s = doc.data();
                s.id = doc.id;
                loadedPatientSessions.push(s);
            });
            
            renderPatientSessionsTable();
            
            if (snap.docs.length === SESSIONS_PER_PAGE) {
                btnMore.style.display = 'block';
                btnMore.innerText = "⬇️ تحميل المزيد من الجلسات...";
            } else { btnMore.style.display = 'none'; }
        } else {
            if (!isLoadMore) tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #64748b;">لا توجد جلسات مسجلة حتى الآن.</td></tr>`;
            else { btnMore.innerText = "لا يوجد جلسات أخرى"; setTimeout(() => btnMore.style.display = 'none', 2000); }
        }
    } catch (error) { console.error("Error loading profile sessions:", error); } 
    finally { if(isLoadMore) btnMore.disabled = false; }
}

function renderPatientSessionsTable(dataToRender = loadedPatientSessions) {
    const tbody = document.getElementById('sessions-list');
    tbody.innerHTML = '';
    
    if(dataToRender.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color:#64748b;">لا توجد جلسات مطابقة</td></tr>`;
        return;
    }

    dataToRender.forEach(s => {
        const total = s.total || 0;
        const paid = s.paid || 0;
        const remaining = s.remaining || 0;
        const nextApp = s.nextAppointment ? `<span style="color:#d97706; font-weight:bold;">${s.nextAppointment}</span>` : '---';

        // 🔴 زرار السداد بيظهر بس لو الجلسة عليها باقي
        let payBtnHtml = '';
        if (remaining > 0) {
            payBtnHtml = `<button class="btn-action" style="background:#10b981; color:white; border-color:#059669;" onclick="paySessionDebt('${s.id}', ${paid}, ${remaining})" title="سداد جزء أو كل المديونية">💰 سداد</button>`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="data-badge">${s.date}</span></td>
            <td style="font-weight:bold; color:#0f172a;">${s.procedure} <br> <small style="color:gray;">السن: ${s.tooth || '---'}</small></td>
            <td style="font-weight:bold;">${total}</td>
            <td style="color: #10b981; font-weight: bold;">${paid}</td>
            <td style="color: ${remaining > 0 ? '#ef4444' : '#64748b'}; font-weight: bold;">${remaining}</td>
            <td dir="ltr">${nextApp}</td>
            <td style="text-align: center;">
                <div class="action-group">
                    ${payBtnHtml}
                    <button class="btn-view" onclick="viewSessionDetails('${s.id}')">👁️ التفاصيل</button>
                    <button class="btn-action" style="background:#fff7ed; color:#d97706; border-color:#fed7aa;" onclick="openEditSession('${s.id}')" title="تعديل">✏️</button>
                    <button class="btn-action" style="background:#fee2e2; color:#ef4444; border-color:#fca5a5;" onclick="deleteDoc('Sessions', '${s.id}')" title="حذف">🗑️</button>
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
    
    document.getElementById('btn-load-more-sessions').style.display = 'none';
    
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
    if(loadedPatientSessions.length >= SESSIONS_PER_PAGE) {
        document.getElementById('btn-load-more-sessions').style.display = 'block';
    }
}

function viewSessionDetails(sessionId) {
    window.parent.loadPage(`session-details.html?sessionId=${sessionId}&patientId=${patientId}`, window.parent.document.getElementById('nav-patients').parentElement);
}

async function deleteDoc(collectionName, docId) {
    if(confirm("هل أنت متأكد من حذف هذه الجلسة بالكامل؟ سيتم حذف جميع المرفقات المرتبطة بها.")) {
        try { 
            await db.collection(collectionName).doc(docId).delete(); 
            loadedPatientSessions = loadedPatientSessions.filter(s => s.id !== docId);
            renderPatientSessionsTable();
        } 
        catch (e) { console.error(e); }
    }
}

window.onload = () => {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    updatePageContent(lang);
    firebase.auth().onAuthStateChanged((user) => { if (user) loadPatientData(); });
};
