const db = firebase.firestore();
const urlParams = new URLSearchParams(window.location.search);
const patientId = urlParams.get('id');
const clinicId = sessionStorage.getItem('clinicId');

let currentPatientName = "مريض";

function updatePageContent(lang) {
    const isAr = lang === 'ar';
    document.body.dir = isAr ? 'rtl' : 'ltr';
    if(isAr) {
        document.getElementById('txt-back').innerText = "العودة لقائمة المرضى";
    } else {
        document.getElementById('txt-back').innerText = "Back to Patients";
    }
}

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

            loadSessions(); 
        }
    } catch (e) { console.error(e); }
}

function calculateRemaining() {
    const total = Number(document.getElementById('sess_total').value) || 0;
    const paid = Number(document.getElementById('sess_paid').value) || 0;
    let remaining = total - paid;
    if (remaining < 0) remaining = 0; 
    document.getElementById('sess_remaining').value = remaining;
}

async function saveSession(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-session');
    btn.disabled = true;
    btn.innerText = "جاري الحفظ...";
    
    const totalAmount = Number(document.getElementById('sess_total').value) || 0;
    const paidAmount = Number(document.getElementById('sess_paid').value) || 0;
    const remainingAmount = Number(document.getElementById('sess_remaining').value) || 0;

    const data = {
        clinicId: clinicId, 
        patientId: patientId,
        date: document.getElementById('sess_date').value,
        nextAppointment: document.getElementById('sess_next_date').value || null,
        procedure: document.getElementById('sess_procedure').value,
        tooth: document.getElementById('sess_tooth').value,
        notes: document.getElementById('sess_notes').value,
        total: totalAmount,
        paid: paidAmount,
        remaining: remainingAmount,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        await db.collection("Sessions").add(data);
        closeModal('sessionModal'); 
        document.querySelector('#sessionModal form').reset();
    } catch (error) { 
        console.error(error); 
        alert("حدث خطأ أثناء حفظ الجلسة.");
    } finally {
        btn.disabled = false;
        btn.innerText = "حفظ الجلسة";
    }
}

function loadSessions() {
    db.collection("Sessions").where("patientId", "==", patientId).orderBy("date", "desc")
      .onSnapshot(snap => {
        const tbody = document.getElementById('sessions-list');
        tbody.innerHTML = '';
        if (snap.empty) { tbody.innerHTML = `<tr><td colspan="7" style="text-align: center;">لا توجد جلسات مسجلة حتى الآن.</td></tr>`; return; }
        
        snap.forEach(doc => {
            const s = doc.data();
            
            const total = s.total || 0;
            const paid = s.paid || 0;
            const remaining = s.remaining || 0;
            const nextApp = s.nextAppointment ? `<span style="color:#d97706; font-weight:bold;">${s.nextAppointment}</span>` : '---';

            tbody.innerHTML += `
                <tr>
                    <td><span class="data-badge">${s.date}</span></td>
                    <td style="font-weight:bold; color:#0f172a;">${s.procedure} <br> <small style="color:gray;">السن: ${s.tooth || '---'}</small></td>
                    <td style="font-weight:bold;">${total}</td>
                    <td style="color: #10b981; font-weight: bold;">${paid}</td>
                    <td style="color: ${remaining > 0 ? '#ef4444' : '#64748b'}; font-weight: bold;">${remaining}</td>
                    <td dir="ltr">${nextApp}</td>
                    <td style="text-align: center;">
                        <button class="btn-view" onclick="viewSessionDetails('${doc.id}')">👁️ عرض التفاصيل</button>
                        <button class="btn-danger" style="margin-right:5px; padding: 6px 10px;" onclick="deleteDoc('Sessions', '${doc.id}')">🗑️</button>
                    </td>
                </tr>
            `;
        });
    });
}

// الدالة السحرية الجديدة للبحث والفلترة
function filterPatientSessions() {
    const input = document.getElementById('searchSessionInput').value.toLowerCase();
    const rows = document.getElementById('sessions-list').getElementsByTagName('tr');

    for (let i = 0; i < rows.length; i++) {
        // نتخطى صف "لا توجد جلسات" لو الجدول فاضي
        if (rows[i].getElementsByTagName('td').length < 2) continue;

        // بنقرأ كل النص اللي جوه الصف ونقارنه بكلمة البحث
        const rowText = rows[i].textContent || rows[i].innerText;
        if (rowText.toLowerCase().indexOf(input) > -1) {
            rows[i].style.display = ""; // إظهار
        } else {
            rows[i].style.display = "none"; // إخفاء
        }
    }
}

function viewSessionDetails(sessionId) {
    window.parent.loadPage(`session-details.html?sessionId=${sessionId}&patientId=${patientId}`, window.parent.document.getElementById('nav-patients').parentElement);
}

async function deleteDoc(collectionName, docId) {
    if(confirm("هل أنت متأكد من حذف هذه الجلسة بالكامل؟ سيتم حذف جميع المرفقات المرتبطة بها.")) {
        try { await db.collection(collectionName).doc(docId).delete(); } 
        catch (e) { console.error(e); }
    }
}

window.onload = () => {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    updatePageContent(lang);
    firebase.auth().onAuthStateChanged((user) => { if (user) loadPatientData(); });
};
