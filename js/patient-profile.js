const db = firebase.firestore();
const urlParams = new URLSearchParams(window.location.search);
const patientId = urlParams.get('id');
const clinicId = sessionStorage.getItem('clinicId');

let currentPatientName = "مريض";
let loadedPatientSessions = []; // لتخزين الجلسات محلياً لتسريع البحث والتعديل

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

// 3. جلب بيانات المريض الأساسية (مرة واحدة فقط)
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
            document.getElementById('prof-name').innerText = p.name;
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

            loadPatientSessions(); // سحب أول 50 جلسة
        }
    } catch (e) { console.error(e); }
}

// 4. حساب المتبقي أوتوماتيك
function calculateRemaining(mode = 'add') {
    const prefix = mode === 'add' ? 'sess_' : 'edit_sess_';
    const total = Number(document.getElementById(`${prefix}total`).value) || 0;
    const paid = Number(document.getElementById(`${prefix}paid`).value) || 0;
    let remaining = total - paid;
    if (remaining < 0) remaining = 0; 
    document.getElementById(`${prefix}remaining`).value = remaining;
}

// 🔴 5. إضافة وتعديل الجلسة (دمجنا الدالتين للتوفير) 🔴
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

    const data = {
        clinicId: clinicId, 
        patientId: patientId,
        date: document.getElementById(`${prefix}date`).value,
        nextAppointment: document.getElementById(`${prefix}next_date`).value || null,
        procedure: document.getElementById(`${prefix}procedure`).value,
        tooth: document.getElementById(`${prefix}tooth`).value,
        notes: document.getElementById(`${prefix}notes`).value,
        total: totalAmount,
        paid: paidAmount,
        remaining: remainingAmount
    };
    
    try {
        if (isEditMode) {
            const docId = document.getElementById('edit_sess_id').value;
            await db.collection("Sessions").doc(docId).update(data);
            
            // تحديث المصفوفة المحلية ورسم الجدول فوراً
            const index = loadedPatientSessions.findIndex(s => s.id === docId);
            if(index !== -1) loadedPatientSessions[index] = { ...loadedPatientSessions[index], ...data };
            renderPatientSessionsTable();
            
        } else {
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            const docRef = await db.collection("Sessions").add(data);
            
            // إضافة للجداول المحلية فوراً
            loadedPatientSessions.unshift({ id: docRef.id, ...data });
            renderPatientSessionsTable();
        }
        
        closeModal(modalId); 
        document.getElementById(isEditMode ? 'editSessionForm' : 'addSessionForm').reset();
    } catch (error) { 
        console.error(error); 
        alert("حدث خطأ أثناء الحفظ.");
    } finally {
        btn.disabled = false;
        btn.innerText = isEditMode ? "حفظ التعديلات" : "حفظ الجلسة";
    }
}

// 🔴 6. جلب الجلسات بالتقسيم (Pagination) 🔴
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

// دالة رسم الجدول محلياً لسرعة الأداء
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
                    <button class="btn-view" onclick="viewSessionDetails('${s.id}')">👁️ التفاصيل</button>
                    <button class="btn-action" style="background:#fff7ed; color:#d97706; border-color:#fed7aa;" onclick="openEditSession('${s.id}')" title="تعديل">✏️</button>
                    <button class="btn-action" style="background:#fee2e2; color:#ef4444; border-color:#fca5a5;" onclick="deleteDoc('Sessions', '${s.id}')" title="حذف">🗑️</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 7. فتح نافذة التعديل وتعبئتها
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

// 8. البحث المحلي (مبيسحبش من الفايربيز)
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

// 9. عرض تفاصيل الجلسة
function viewSessionDetails(sessionId) {
    window.parent.loadPage(`session-details.html?sessionId=${sessionId}&patientId=${patientId}`, window.parent.document.getElementById('nav-patients').parentElement);
}

// 10. الحذف الفردي الآمن
async function deleteDoc(collectionName, docId) {
    if(confirm("هل أنت متأكد من حذف هذه الجلسة بالكامل؟ سيتم حذف جميع المرفقات المرتبطة بها.")) {
        try { 
            await db.collection(collectionName).doc(docId).delete(); 
            // تحديث الجدول محلياً بعد الحذف
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
