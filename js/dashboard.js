const db = firebase.firestore();
const clinicId = sessionStorage.getItem('clinicId'); 

let todayPendingApps = []; 
let upcomingPendingApps = [];
let allPatientsData = [];
let completedSessionsData = [];
let todayRevenueData = [];

let currentSelectedPatientId = null; 
let currentSelectedAppId = null; 

function updatePageContent(lang) {
    const t = { 
        ar: { 
            welcome: "نظرة عامة على العيادة", sub: "ملخص الأداء اليومي وإحصائيات المرضى اللحظية",
            pat: "إجمالي المرضى", wait: "في الانتظار (اليوم)", rev: "إيرادات اليوم", sess: "جلسات مكتملة",
            chart: "حالات المواعيد والجلسات", actions: "إجراءات سريعة",
            btnWait: "عرض قائمة الانتظار", btnPat: "إضافة مريض جديد", btnApp: "حجز موعد جديد",
            mWaitTitle: "⏳ قائمة الانتظار", tToday: "مواعيد اليوم", tUpc: "الأيام القادمة",
            mAppDetTitle: "تفاصيل الحجز", lName: "اسم المريض:", lDate: "التاريخ:", lTime: "الساعة:", lType: "نوع الكشف:", lNotes: "ملاحظات:",
            mPatTitle: "🦷 جميع المرضى", mPatDetTitle: "تفاصيل المريض", lpPhone: "الموبايل:", lpAge: "السن:", lpHist: "أمراض مزمنة:", btnProf: "فتح الملف الطبي الكامل",
            mRevTitle: "💵 إيرادات اليوم تفصيلياً", mSessTitle: "✅ الجلسات المكتملة", empty: "لا يوجد بيانات حالياً.",
            btnComp: "✅ مكتمل", btnCanc: "❌ إلغاء", btnDel: "🗑️ حذف", confDel: "هل أنت متأكد من حذف هذا الموعد نهائياً؟"
        }, 
        en: { 
            welcome: "Clinic Overview", sub: "Daily performance and real-time statistics",
            pat: "Total Patients", wait: "Pending (Today)", rev: "Today's Revenue", sess: "Completed Sessions",
            chart: "Appointments & Sessions Status", actions: "Quick Actions",
            btnWait: "Show Waiting List", btnPat: "Add New Patient", btnApp: "Book Appointment",
            mWaitTitle: "⏳ Waiting List", tToday: "Today's Apps", tUpc: "Upcoming",
            mAppDetTitle: "Booking Details", lName: "Patient Name:", lDate: "Date:", lTime: "Time:", lType: "Type:", lNotes: "Notes:",
            mPatTitle: "🦷 All Patients", mPatDetTitle: "Patient Details", lpPhone: "Phone:", lpAge: "Age:", lpHist: "Medical History:", btnProf: "Open Full Profile",
            mRevTitle: "💵 Today's Revenue Details", mSessTitle: "✅ Completed Sessions", empty: "No data available currently.",
            btnComp: "✅ Complete", btnCanc: "❌ Cancel", btnDel: "🗑️ Delete", confDel: "Are you sure you want to permanently delete this appointment?"
        } 
    };
    const c = t[lang] || t.ar;
    const setTxt = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };
    const setClassTxt = (cls, txt) => { document.querySelectorAll('.'+cls).forEach(el => el.innerText = txt); };

    setTxt('txt-welcome', c.welcome); setTxt('txt-subtitle', c.sub);
    setTxt('lbl-patients', c.pat); setTxt('lbl-appointments', c.wait); setTxt('lbl-revenue', c.rev); setTxt('lbl-sessions', c.sess);
    setTxt('lbl-chart', c.chart); setTxt('lbl-actions', c.actions);
    setTxt('btn-wait-list', c.btnWait); setTxt('btn-add-patient', c.btnPat); setTxt('btn-book-app', c.btnApp);
    
    setTxt('mod-wait-title', c.mWaitTitle); setTxt('tab-today-wait', c.tToday); setTxt('tab-upcoming-wait', c.tUpc);
    setTxt('mod-app-det-title', c.mAppDetTitle); setClassTxt('lbl-det-name', c.lName); setClassTxt('lbl-det-date', c.lDate); setClassTxt('lbl-det-time', c.lTime); setClassTxt('lbl-det-type', c.lType); setClassTxt('lbl-det-notes', c.lNotes);
    
    setTxt('mod-pat-title', c.mPatTitle); setTxt('mod-pat-det-title', c.mPatDetTitle); setClassTxt('lbl-p-name', c.lName); setClassTxt('lbl-p-phone', c.lpPhone); setClassTxt('lbl-p-age', c.lpAge); setClassTxt('lbl-p-history', c.lpHist); setTxt('btn-go-profile', c.btnProf);
    
    setTxt('mod-rev-title', c.mRevTitle); setTxt('mod-sess-title', c.mSessTitle);
    
    setTxt('btn-complete-app', c.btnComp); setTxt('btn-cancel-app', c.btnCanc); setTxt('btn-delete-app', c.btnDel);
    
    window.emptyTxt = c.empty; 
    window.confDelTxt = c.confDel;
}

let dashChart = null;
function updateChart(pending, completed, cancelled) {
    const ctx = document.getElementById('dashboardChart').getContext('2d');
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const labels = lang === 'ar' ? ['في الانتظار', 'مكتملة', 'ملغاة'] : ['Pending', 'Completed', 'Cancelled'];
    if (dashChart) dashChart.destroy();
    dashChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: labels, datasets: [{ label: lang==='ar'?'العدد':'Count', data: [pending, completed, cancelled], backgroundColor: ['#f59e0b', '#10b981', '#ef4444'], borderRadius: 6 }] },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
    });
}

function loadDashboardStats() {
    if (!clinicId) return;
    const todayStr = new Date().toISOString().split('T')[0];

    db.collection("Patients").where("clinicId", "==", clinicId).onSnapshot(snap => {
        allPatientsData = [];
        snap.forEach(doc => allPatientsData.push({ id: doc.id, ...doc.data() }));
        document.getElementById('stat-patients').innerText = allPatientsData.length;
    });

    db.collection("Finances").where("clinicId", "==", clinicId).where("type", "==", "income").onSnapshot(snap => {
        todayRevenueData = []; let todayRevTotal = 0; 
        snap.forEach(doc => { 
            const data = doc.data();
            if (data.date === todayStr && data.amount) { todayRevTotal += Number(data.amount); todayRevenueData.push({ id: doc.id, ...data }); }
        });
        document.getElementById('stat-revenue').innerText = todayRevTotal;
    });

    db.collection("Appointments").where("clinicId", "==", clinicId).onSnapshot(snap => {
        let pending = 0, completed = 0, cancelled = 0;
        todayPendingApps = []; upcomingPendingApps = []; completedSessionsData = [];

        snap.forEach(doc => {
            const data = doc.data();
            if (data.status === 'completed') { completed++; completedSessionsData.push({ id: doc.id, ...data }); }
            if (data.status === 'cancelled') cancelled++;
            if (data.status === 'pending') {
                pending++;
                if (data.date === todayStr) todayPendingApps.push({ id: doc.id, ...data });
                else if (data.date > todayStr) upcomingPendingApps.push({ id: doc.id, ...data });
            }
        });

        document.getElementById('stat-appointments').innerText = todayPendingApps.length;
        document.getElementById('stat-sessions').innerText = completed;
        updateChart(pending, completed, cancelled);
        
        if(document.getElementById('waitingListModal').style.display === 'flex'){
            renderWaitList('todayWaitContainer', todayPendingApps);
            renderWaitList('upcomingWaitContainer', upcomingPendingApps);
        }
    });
}

function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function openWaitingListModal() {
    renderWaitList('todayWaitContainer', todayPendingApps);
    renderWaitList('upcomingWaitContainer', upcomingPendingApps);
    document.getElementById('waitingListModal').style.display = 'flex';
}

function switchWaitTab(tabType) {
    document.getElementById('tab-today-wait').classList.remove('active');
    document.getElementById('tab-upcoming-wait').classList.remove('active');
    document.getElementById('wait-content-today').classList.remove('active');
    document.getElementById('wait-content-upcoming').classList.remove('active');
    if(tabType === 'today') {
        document.getElementById('tab-today-wait').classList.add('active');
        document.getElementById('wait-content-today').classList.add('active');
    } else {
        document.getElementById('tab-upcoming-wait').classList.add('active');
        document.getElementById('wait-content-upcoming').classList.add('active');
    }
}

function renderWaitList(containerId, dataArray) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    if (dataArray.length === 0) {
        container.innerHTML = `<li style="text-align:center; padding: 20px; color: #64748b;">${window.emptyTxt}</li>`;
        return;
    }
    dataArray.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    dataArray.forEach(app => {
        const li = document.createElement('li');
        li.className = 'data-list-li';
        li.onclick = () => openAppDetails(app);
        let timeTag = containerId === 'todayWaitContainer' ? app.time : `${app.date} | ${app.time}`;
        li.innerHTML = `<span style="font-weight: bold; font-size: 16px;">👤 ${app.patientName}</span><span class="data-badge orange">⏰ ${timeTag}</span>`;
        container.appendChild(li);
    });
}

function openAppDetails(app) {
    currentSelectedAppId = app.id; 
    document.getElementById('det_name').innerText = app.patientName;
    document.getElementById('det_date').innerText = app.date;
    document.getElementById('det_time').innerText = app.time;
    document.getElementById('det_type').innerText = app.type;
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.getElementById('det_notes').innerText = app.notes || (lang === 'ar' ? 'لا يوجد' : 'None');
    
    const actionsDiv = document.getElementById('app-actions-container');
    if(app.status !== 'pending') actionsDiv.style.display = 'none';
    else actionsDiv.style.display = 'flex';

    document.getElementById('appDetailsModal').style.display = 'flex';
}

async function updateAppStatus(newStatus) {
    if(!currentSelectedAppId) return;
    try {
        await db.collection("Appointments").doc(currentSelectedAppId).update({ status: newStatus });
        closeModal('appDetailsModal');
    } catch(e) { console.error("Error updating status:", e); }
}

async function deleteAppointment() {
    if(!currentSelectedAppId) return;
    if(confirm(window.confDelTxt)) {
        try {
            await db.collection("Appointments").doc(currentSelectedAppId).delete();
            closeModal('appDetailsModal');
        } catch(e) { console.error("Error deleting:", e); }
    }
}

function openPatientsModal() {
    const container = document.getElementById('patientsContainer');
    container.innerHTML = '';
    if (allPatientsData.length === 0) {
        container.innerHTML = `<li style="text-align:center; padding: 20px; color: #64748b;">${window.emptyTxt}</li>`;
    } else {
        allPatientsData.forEach(p => {
            const li = document.createElement('li');
            li.className = 'data-list-li';
            li.onclick = () => openPatientDetails(p);
            li.innerHTML = `<span style="font-weight: bold; font-size: 16px;">🦷 ${p.name}</span><span class="data-badge" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1;">📞 ${p.phone}</span>`;
            container.appendChild(li);
        });
    }
    document.getElementById('patientsModal').style.display = 'flex';
}

function openPatientDetails(p) {
    currentSelectedPatientId = p.id;
    document.getElementById('pdet_name').innerText = p.name;
    document.getElementById('pdet_phone').innerText = p.phone;
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.getElementById('pdet_age').innerText = p.age + (lang === 'ar' ? ' سنة' : ' Years');
    
    let historyStr = (p.medicalHistory && p.medicalHistory.length > 0) ? p.medicalHistory.join(' ، ') : (lang === 'ar' ? 'سليم' : 'Healthy');
    document.getElementById('pdet_history').innerText = historyStr;
    if(historyStr === 'سليم' || historyStr === 'Healthy') document.getElementById('pdet_history').style.color = '#10b981';
    else document.getElementById('pdet_history').style.color = '#ef4444';

    document.getElementById('patientDetailsModal').style.display = 'flex';
}

function goToPatientProfile() {
    if(currentSelectedPatientId) {
        window.parent.loadPage(`patient-profile.html?id=${currentSelectedPatientId}`, window.parent.document.getElementById('nav-patients').parentElement);
    }
}

function openRevenueModal() {
    const container = document.getElementById('revenueContainer');
    container.innerHTML = '';
    if (todayRevenueData.length === 0) {
        container.innerHTML = `<li style="text-align:center; padding: 20px; color: #64748b;">${window.emptyTxt}</li>`;
    } else {
        todayRevenueData.forEach(rev => {
            const li = document.createElement('li');
            li.className = 'data-list-li';
            const lang = localStorage.getItem('preferredLang') || 'ar';
            li.innerHTML = `<span style="font-weight: bold; font-size: 15px;">📝 ${rev.notes || (lang==='ar'?'دفعة نقدية':'Cash Payment')}</span><span class="data-badge green">💰 ${rev.amount}</span>`;
            container.appendChild(li);
        });
    }
    document.getElementById('revenueModal').style.display = 'flex';
}

function openSessionsModal() {
    const container = document.getElementById('sessionsContainer');
    container.innerHTML = '';
    if (completedSessionsData.length === 0) {
        container.innerHTML = `<li style="text-align:center; padding: 20px; color: #64748b;">${window.emptyTxt}</li>`;
    } else {
        completedSessionsData.forEach(sess => {
            const li = document.createElement('li');
            li.className = 'data-list-li';
            li.onclick = () => openAppDetails(sess); 
            li.innerHTML = `<span style="font-weight: bold; font-size: 16px;">✅ ${sess.patientName}</span><span class="data-badge" style="background: #10b981;">⏰ ${sess.date}</span>`;
            container.appendChild(li);
        });
    }
    document.getElementById('sessionsModal').style.display = 'flex';
}

window.onload = () => { 
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.body.dir = lang === 'en' ? 'ltr' : 'rtl';
    updatePageContent(lang); 
    updateChart(0, 0, 0);

    firebase.auth().onAuthStateChanged((user) => {
        if (user) loadDashboardStats();
    });
};

// 🔴 الحل النهائي للموبايل والكمبيوتر (إغلاق المودال بالضغط خارجه)
document.addEventListener('DOMContentLoaded', () => {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', function(event) {
            // يتأكد إنه داس على الخلفية الضلمة مش جوه المربع الأبيض
            if (event.target === this) {
                this.style.display = 'none';
            }
        });
    });
});
