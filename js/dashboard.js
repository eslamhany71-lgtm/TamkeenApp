const db = firebase.firestore();
let pendingAppsData = []; // متغير هنخزن فيه مواعيد الانتظار عشان نعرضها في المودال

function updatePageContent(lang) {
    const t = { ar: { wait: "في الانتظار (اليوم)" }, en: { wait: "Pending (Today)" } };
    const c = t[lang] || t.ar;
    if(document.getElementById('lbl-appointments')) document.getElementById('lbl-appointments').innerText = c.wait;
}

let dashChart = null;
function updateChart(pending, completed, cancelled) {
    const ctx = document.getElementById('dashboardChart').getContext('2d');
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const labels = lang === 'ar' ? ['في الانتظار', 'مكتملة', 'ملغاة'] : ['Pending', 'Completed', 'Cancelled'];
    if (dashChart) dashChart.destroy();
    dashChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: labels, datasets: [{ label: 'العدد', data: [pending, completed, cancelled], backgroundColor: ['#f59e0b', '#10b981', '#ef4444'], borderRadius: 6 }] },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
    });
}

function loadDashboardStats() {
    const clinicId = sessionStorage.getItem('clinicId'); 
    if (!clinicId) return;

    db.collection("Patients").where("clinicId", "==", clinicId).onSnapshot(snap => {
        document.getElementById('stat-patients').innerText = snap.size;
    });

    db.collection("Finances").where("clinicId", "==", clinicId).where("type", "==", "income").onSnapshot(snap => {
        let todayRev = 0; const todayStr = new Date().toISOString().split('T')[0];
        snap.forEach(doc => { if (doc.data().date === todayStr && doc.data().amount) todayRev += Number(doc.data().amount); });
        document.getElementById('stat-revenue').innerText = todayRev;
    });

    // جلب المواعيد وحفظ مواعيد الانتظار لليوم
    db.collection("Appointments").where("clinicId", "==", clinicId).onSnapshot(snap => {
        let pending = 0, completed = 0, cancelled = 0, todayPending = 0;
        const todayStr = new Date().toISOString().split('T')[0];
        
        pendingAppsData = []; // تفريغ القائمة قبل ملئها من جديد

        snap.forEach(doc => {
            const data = doc.data();
            if (data.status === 'completed') completed++;
            if (data.status === 'cancelled') cancelled++;
            if (data.status === 'pending') {
                pending++;
                if (data.date === todayStr) {
                    todayPending++;
                    // تخزين بيانات الموعد عشان نعرضه في المودال
                    pendingAppsData.push({ id: doc.id, ...data });
                }
            }
        });

        document.getElementById('stat-appointments').innerText = todayPending;
        document.getElementById('stat-sessions').innerText = completed;
        updateChart(pending, completed, cancelled);
    });
}

// --- دوال المودالز السحرية ---
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

// فتح مودال قائمة الانتظار
function openWaitingListModal() {
    const container = document.getElementById('waitingListContainer');
    container.innerHTML = ''; // تفريغ القديم

    if (pendingAppsData.length === 0) {
        container.innerHTML = '<li style="text-align:center; padding: 20px; color: #64748b; font-weight:bold;">🎉 لا يوجد مرضى في الانتظار حالياً</li>';
    } else {
        // ترتيب المواعيد حسب الوقت (من الأقدم للأحدث)
        pendingAppsData.sort((a, b) => a.time.localeCompare(b.time));

        pendingAppsData.forEach((app, index) => {
            // لما يدوس على السطر ده، هيشغل دالة فتح التفاصيل ويبعتلها رقم الـ Index
            container.innerHTML += `
                <li class="waiting-list-li" onclick="openAppDetailsFromList(${index})">
                    <span style="font-weight: bold; font-size: 16px; color: #1e293b;">👤 ${app.patientName}</span>
                    <span class="waiting-time">⏰ ${app.time}</span>
                </li>
            `;
        });
    }
    document.getElementById('waitingListModal').style.display = 'flex';
}

// فتح مودال التفاصيل بناءً على اختيار من القائمة
function openAppDetailsFromList(index) {
    const app = pendingAppsData[index];
    document.getElementById('det_name').innerText = app.patientName;
    document.getElementById('det_time').innerText = app.time;
    document.getElementById('det_type').innerText = app.type;
    document.getElementById('det_notes').innerText = app.notes || 'لا يوجد ملاحظات';
    
    // نفتح التفاصيل (فوق قائمة الانتظار)
    document.getElementById('appDetailsModal').style.display = 'flex';
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
