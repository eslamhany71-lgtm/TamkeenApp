// js/dashboard.js
const db = firebase.firestore();
const clinicId = sessionStorage.getItem('clinicId'); 
const userRole = sessionStorage.getItem('userRole'); 
const userBranch = sessionStorage.getItem('branchId') || 'main';

let todayPendingApps = []; 
let upcomingPendingApps = [];
let allPatientsData = [];
let completedSessionsData = [];
let todayRevenueData = []; 

let currentSelectedPatientId = null; 
let currentSelectedApp = null; 

let erpServices = [];
let erpContracts = [];
let allClinicDoctors = []; // 🔴

function getLocalTodayString() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// 🔴 جلب الفروع لمودال الحجز السريع في الداشبورد للمدير 🔴
async function loadBranchesForModal() {
    if (userRole !== 'admin' && userRole !== 'superadmin') return;
    try {
        const snap = await db.collection("Branches").where("clinicId", "==", clinicId).get();
        const modalSelect = document.getElementById('app_branch');
        if (!modalSelect) return;

        let modalOptionsHtml = `<option value="main">الفرع الرئيسي</option>`;
        snap.forEach(doc => {
            modalOptionsHtml += `<option value="${doc.id}">${doc.data().name}</option>`;
        });

        modalSelect.innerHTML = modalOptionsHtml;
        document.getElementById('admin-branch-group').style.display = 'block';
        modalSelect.value = userBranch;
    } catch (e) { console.error("Error loading branches:", e); }
}

function updatePageContent(lang) {
    const t = { 
        ar: { 
            welcome: "نظرة عامة على العيادة", sub: "ملخص الأداء اليومي وإحصائيات المرضى اللحظية",
            pat: "إجمالي المرضى", wait: "في الانتظار (اليوم)", rev: "إيرادات اليوم", sess: "حجوزات مكتملة",
            chart: "حالات المواعيد والجلسات", actions: "إجراءات سريعة",
            btnWait: "عرض قائمة الانتظار", btnPat: "إضافة مريض جديد", btnApp: "حجز موعد جديد",
            invAlerts: "🔔 تنبيهات المخزون الذكية", sysMods: "🚀 أقسام النظام المركزية (ERP)",
            loadingInv: "جاري فحص المخازن...", emptyInv: "✅ المخزون سليم حالياً.",
            modRep: "التقارير", modInv: "الفواتير", modHr: "الموظفين", modBran: "الفروع", 
            modStock: "جرد المخزون", modNotif: "الإشعارات", modServ: "الخدمات", modCont: "التعاقدات",
            current: "الحالي:", minQty: "الحد الأدنى:",
            mWaitTitle: "⏳ قائمة الانتظار", tToday: "مواعيد اليوم", tUpc: "الأيام القادمة",
            mAppDetTitle: "تفاصيل الحجز", lName: "اسم المريض:", lPhone: "الموبايل:", lDate: "التاريخ:", lTime: "الساعة:", lType: "نوع الكشف:", lNotes: "ملاحظات:",
            mPatTitle: "🦷 جميع المرضى", mPatDetTitle: "تفاصيل المريض", lpPhone: "الموبايل:", lpAge: "السن:", lpHist: "أمراض مزمنة:", btnProf: "فتح الملف الطبي الكامل",
            mRevTitle: "💵 إيرادات اليوم تفصيلياً", mSessTitle: "✅ الحجوزات المكتملة", empty: "لا يوجد بيانات حالياً.",
            btnCanc: "❌ إلغاء", btnDel: "🗑️ حذف", confDel: "هل أنت متأكد من حذف هذا الموعد نهائياً؟",
            mRevDetTitle: "تفاصيل الإيراد", lRevAmt: "المبلغ:", lRevDate: "التاريخ:", lRevCat: "البند:", lRevNotes: "البيان:",
            
            lblMonthSummary: "📊 ملخص أداء الشهر الحالي", lblMonthPat: "مرضى جُدد", lblMonthSess: "جلسات مكتملة", lblMonthRev: "إيرادات (ج.م)",
            lblLiveUpcoming: "📅 المواعيد القادمة فوراً", noUpcoming: "لا يوجد مواعيد في الانتظار حالياً.",
            lblLiveFinances: "💸 أحدث العمليات المالية (اليوم)", noFinances: "لا توجد عمليات مالية مسجلة اليوم."
        }, 
        en: { 
            welcome: "Clinic Overview", sub: "Daily performance and real-time statistics",
            pat: "Total Patients", wait: "Pending (Today)", rev: "Today's Revenue", sess: "Completed Sessions",
            chart: "Appointments & Sessions Status", actions: "Quick Actions",
            btnWait: "Show Waiting List", btnPat: "Add New Patient", btnApp: "Book Appointment",
            invAlerts: "🔔 Smart Inventory Alerts", sysMods: "🚀 ERP System Modules",
            loadingInv: "Checking stock...", emptyInv: "✅ Inventory is safe.",
            modRep: "Reports", modInv: "Invoices", modHr: "HR", modBran: "Branches", 
            modStock: "Stocktaking", modNotif: "Notifications", modServ: "Services", modCont: "Contracts",
            current: "Now:", minQty: "Min:",
            mWaitTitle: "⏳ Waiting List", tToday: "Today's Apps", tUpc: "Upcoming",
            mAppDetTitle: "Booking Details", lName: "Patient Name:", lPhone: "Phone:", lDate: "Date:", lTime: "Time:", lType: "Type:", lNotes: "Notes:",
            mPatTitle: "🦷 All Patients", mPatDetTitle: "Patient Details", lpPhone: "Phone:", lpAge: "Age:", lpHist: "Medical History:", btnProf: "Open Full Profile",
            mRevTitle: "💵 Today's Revenue Details", mSessTitle: "✅ Completed Sessions", empty: "No data available currently.",
            btnCanc: "❌ Cancel", btnDel: "🗑️ Delete", confDel: "Are you sure you want to permanently delete this appointment?",
            mRevDetTitle: "Revenue Details", lRevAmt: "Amount:", lRevDate: "Date:", lRevCat: "Category:", lRevNotes: "Notes:",
            
            lblMonthSummary: "📊 Current Month Summary", lblMonthPat: "New Patients", lblMonthSess: "Completed Sessions", lblMonthRev: "Revenue (EGP)",
            lblLiveUpcoming: "📅 Upcoming Appointments", noUpcoming: "No pending appointments currently.",
            lblLiveFinances: "💸 Recent Transactions (Today)", noFinances: "No financial transactions recorded today."
        } 
    };
    const c = t[lang] || t.ar;
    const setTxt = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };
    const setClassTxt = (cls, txt) => { document.querySelectorAll('.'+cls).forEach(el => el.innerText = txt); };

    setTxt('txt-welcome', c.welcome); setTxt('txt-subtitle', c.sub);
    setTxt('lbl-patients', c.pat); setTxt('lbl-appointments', c.wait); setTxt('lbl-revenue', c.rev); setTxt('lbl-sessions', c.sess);
    setTxt('lbl-chart', c.chart); setTxt('lbl-actions', c.actions);
    setTxt('btn-wait-list', c.btnWait); setTxt('btn-add-patient', c.btnPat); setTxt('btn-book-app', c.btnApp);
    setTxt('lbl-inventory-alerts', c.invAlerts); setTxt('lbl-system-modules', c.sysMods);
    setTxt('txt-loading-inv', c.loadingInv);
    
    const monthSummaryTitle = document.querySelector('h3.panel-title[style*="8b5cf6"]');
    if(monthSummaryTitle) monthSummaryTitle.innerText = c.lblMonthSummary;
    
    const monthPatHead = document.querySelector('#stat-month-patients').previousElementSibling;
    if(monthPatHead) monthPatHead.innerText = c.lblMonthPat;
    
    const monthSessHead = document.querySelector('#stat-month-sessions').previousElementSibling;
    if(monthSessHead) monthSessHead.innerText = c.lblMonthSess;
    
    const monthRevHead = document.querySelector('#stat-month-revenue').previousElementSibling;
    if(monthRevHead) monthRevHead.innerText = c.lblMonthRev;

    const liveUpcomingTitle = document.querySelector('h3.panel-title[style*="f59e0b"]');
    if(liveUpcomingTitle) liveUpcomingTitle.innerText = c.lblLiveUpcoming;
    
    const liveFinancesTitle = document.querySelector('h3.panel-title[style*="10b981"]');
    if(liveFinancesTitle) liveFinancesTitle.innerText = c.lblLiveFinances;
    
    setTxt('mod-reports', c.modRep); setTxt('mod-invoices', c.modInv); setTxt('mod-hr', c.modHr);
    setTxt('mod-branches', c.modBran); setTxt('mod-stock', c.modStock); setTxt('mod-notif', c.modNotif);
    setTxt('mod-services', c.modServ); setTxt('mod-contracts', c.modCont);
    
    setTxt('mod-wait-title', c.mWaitTitle); setTxt('tab-today-wait', c.tToday); setTxt('tab-upcoming-wait', c.tUpc);
    setTxt('mod-app-det-title', c.mAppDetTitle); setClassTxt('lbl-det-name', c.lName); setClassTxt('lbl-det-phone', c.lPhone); setClassTxt('lbl-det-date', c.lDate); setClassTxt('lbl-det-time', c.lTime); setClassTxt('lbl-det-type', c.lType); setClassTxt('lbl-det-notes', c.lNotes);
    
    setTxt('mod-pat-title', c.mPatTitle); setTxt('mod-pat-det-title', c.mPatDetTitle); setClassTxt('lbl-p-name', c.lName); setClassTxt('lbl-p-phone', c.lpPhone); setClassTxt('lbl-p-age', c.lpAge); setClassTxt('lbl-p-history', c.lpHist); setTxt('btn-go-profile', c.btnProf);
    
    setTxt('mod-rev-title', c.mRevTitle); setTxt('mod-sess-title', c.mSessTitle);
    setTxt('mod-rev-det-title', c.mRevDetTitle);
    setClassTxt('lbl-rev-amount', c.lRevAmt);
    setClassTxt('lbl-rev-date', c.lRevDate);
    setClassTxt('lbl-rev-cat', c.lRevCat);
    setClassTxt('lbl-rev-notes', c.lRevNotes);
    
    setTxt('btn-cancel-app', c.btnCanc); setTxt('btn-delete-app', c.btnDel);
    
    window.emptyTxt = c.empty; 
    window.confDelTxt = c.confDel;
    window.invCurrentTxt = c.current;
    window.invMinTxt = c.minQty;
    window.invEmptyTxt = c.emptyInv;
    window.dashLangVars = c; 
}

let dashChart = null;
function updateChart(pending, completed, cancelled) {
    try {
        const chartCanvas = document.getElementById('dashboardChart');
        if (!chartCanvas) return; 

        const ctx = chartCanvas.getContext('2d');
        const lang = localStorage.getItem('preferredLang') || 'ar';
        const labels = lang === 'ar' ? ['في الانتظار', 'مكتملة', 'ملغاة'] : ['Pending', 'Completed', 'Cancelled'];
        
        if (dashChart) dashChart.destroy();
        dashChart = new Chart(ctx, {
            type: 'bar',
            data: { labels: labels, datasets: [{ label: lang==='ar'?'العدد':'Count', data: [pending, completed, cancelled], backgroundColor: ['#f59e0b', '#10b981', '#ef4444'], borderRadius: 6 }] },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
        });
    } catch (err) { console.warn("Chart loading skipped"); }
}

function updateTotalRevenue() {
    let total = 0;
    let cash = 0;
    let wallet = 0;
    let bank = 0;

    todayRevenueData.forEach(item => {
        const amt = Number(item.amount) || 0;
        total += amt;
        const method = item.paymentMethod || 'cash';
        if (method === 'cash') cash += amt;
        else if (method === 'wallet') wallet += amt;
        else if (method === 'instapay') bank += amt;
    });

    document.getElementById('stat-revenue').innerText = total;

    const elCash = document.getElementById('rev-total-cash');
    const elWallet = document.getElementById('rev-total-wallet');
    const elBank = document.getElementById('rev-total-bank');
    
    if(elCash) elCash.innerText = cash;
    if(elWallet) elWallet.innerText = wallet;
    if(elBank) elBank.innerText = bank;
}

function loadInventoryAlerts() {
    if(!clinicId) return;
    const container = document.getElementById('inventory-alerts-container');
    
    // فلترة النواقص حسب الفرع الحالي 
    let queryRef = db.collection("Inventory").where("clinicId", "==", clinicId);
    if (userRole !== 'admin' && userRole !== 'superadmin') {
        queryRef = queryRef.where("branchId", "==", userBranch);
    }
    
    queryRef.onSnapshot(snap => {
        container.innerHTML = '';
        let alertsCount = 0;

        snap.forEach(doc => {
            const item = doc.data();
            const qty = Number(item.qty) || 0; 
            const min = Number(item.minAlert) || 0; 

            if (qty <= min) {
                alertsCount++;
                const statusClass = qty === 0 ? 'danger' : 'warning';
                container.innerHTML += `
                    <div class="inventory-alert ${statusClass}">
                        <span>⚠️ ${item.name || 'صنف غير معروف'} (${item.category || ''})</span>
                        <span>${window.invCurrentTxt} ${qty} | ${window.invMinTxt} ${min}</span>
                    </div>
                `;
            }
        });

        if (alertsCount === 0) {
            container.innerHTML = `<div class="empty-state">${window.invEmptyTxt}</div>`;
        }
    });
}

function renderLiveUpcoming() {
    const container = document.getElementById('live-upcoming-apps');
    if (!container) return;
    
    if (todayPendingApps.length === 0) {
        const msg = window.dashLangVars ? window.dashLangVars.noUpcoming : "لا يوجد مواعيد في الانتظار حالياً.";
        container.innerHTML = `<div style="text-align:center; padding: 30px; color: #64748b;">${msg}</div>`;
        return;
    }

    container.innerHTML = '';
    const topApps = todayPendingApps.slice(0, 5);
    
    topApps.forEach(app => {
        const div = document.createElement('div');
        div.className = 'live-list-item';
        div.onclick = () => openAppDetails(app);
        div.innerHTML = `
            <div>
                <strong style="color: #0f172a; font-size: 15px;">${app.patientName}</strong><br>
                <small style="color: #64748b;">${app.type}</small>
            </div>
            <div style="background: #fffbeb; color: #d97706; padding: 5px 10px; border-radius: 8px; font-weight: bold; border: 1px solid #fde68a;">
                ⏰ ${app.time}
            </div>
        `;
        container.appendChild(div);
    });
}

function renderLiveFinances() {
    const container = document.getElementById('live-recent-finances');
    if (!container) return;

    if (todayRevenueData.length === 0) {
        const msg = window.dashLangVars ? window.dashLangVars.noFinances : "لا توجد عمليات مالية مسجلة اليوم.";
        container.innerHTML = `<div style="text-align:center; padding: 30px; color: #64748b;">${msg}</div>`;
        return;
    }

    container.innerHTML = '';
    const recentFinances = [...todayRevenueData].reverse().slice(0, 5);
    const lang = localStorage.getItem('preferredLang') || 'ar';
    
    recentFinances.forEach(rev => {
        const div = document.createElement('div');
        div.className = 'live-list-item';
        div.onclick = () => openRevDetails(rev);
        
        let methodTxt = lang === 'ar' ? 'كاش' : 'Cash';
        if(rev.paymentMethod === 'wallet') methodTxt = lang === 'ar' ? 'محفظة' : 'Wallet';
        if(rev.paymentMethod === 'instapay') methodTxt = lang === 'ar' ? 'بنكي' : 'Bank';

        div.innerHTML = `
            <div>
                <strong style="color: #0f172a; font-size: 15px;">${rev.notes || 'إيراد'}</strong><br>
                <small style="color: #64748b;">${methodTxt}</small>
            </div>
            <div style="background: #ecfdf5; color: #10b981; padding: 5px 10px; border-radius: 8px; font-weight: bold; border: 1px solid #a7f3d0;">
                + ${rev.amount}
            </div>
        `;
        container.appendChild(div);
    });
}

function loadDashboardStats() {
    if (!clinicId) return;
    const todayStr = getLocalTodayString(); 
    const currentMonthPrefix = todayStr.substring(0, 7); 

    if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري تحديث الإحصائيات..." : "Loading stats...");

    let loaderTimeout = setTimeout(() => {
        if (window.hideLoader) window.hideLoader();
    }, 1500);

    db.collection("Services").where("clinicId", "==", clinicId).onSnapshot(snap => {
        erpServices = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const selectType = document.getElementById('app_type');
        if (selectType && selectType.tagName === 'SELECT') {
            const currentVal = selectType.value;
            selectType.innerHTML = `<option value="">اختر الخدمة...</option>`;
            erpServices.forEach(s => {
                selectType.innerHTML += `<option value="${s.id}">${s.name} (${s.price} ج.م)</option>`;
            });
            selectType.value = currentVal;
        }
    });

    db.collection("Contracts").where("clinicId", "==", clinicId).onSnapshot(snap => {
        erpContracts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const contEl = document.getElementById('app_contract');
        if (contEl) {
            const currentVal = contEl.value;
            contEl.innerHTML = `<option value="">بدون تعاقد (خصم 0%)</option>`;
            erpContracts.forEach(c => {
                contEl.innerHTML += `<option value="${c.id}">${c.name} (خصم ${c.discountPercentage}%)</option>`;
            });
            contEl.value = currentVal;
        }
    });

    // جلب الدكاترة لاستخدامهم في مودال الحجز السريع
    db.collection("Users").where("clinicId", "==", clinicId).where("role", "==", "doctor").onSnapshot(snap => {
        allClinicDoctors = [];
        snap.forEach(doc => { allClinicDoctors.push({ id: doc.id, ...doc.data() }); });
    });

    let patQuery = db.collection("Patients").where("clinicId", "==", clinicId);
    let finQuery = db.collection("Finances").where("clinicId", "==", clinicId).where("type", "==", "income");
    let appQuery = db.collection("Appointments").where("clinicId", "==", clinicId);
    
    // 🔴 تطبيق العزل على كل الإحصائيات في الداشبورد 🔴
    if (userRole !== 'admin' && userRole !== 'superadmin') {
        patQuery = patQuery.where("branchId", "==", userBranch);
        finQuery = finQuery.where("branchId", "==", userBranch);
        appQuery = appQuery.where("branchId", "==", userBranch);
    }

    patQuery.onSnapshot(snap => {
        try {
            allPatientsData = [];
            let monthlyPatients = 0;

            snap.forEach(doc => {
                const data = doc.data();
                allPatientsData.push({ id: doc.id, ...data });
                
                if (data.createdAt) {
                    let pDate = typeof data.createdAt.toDate === 'function' ? data.createdAt.toDate() : new Date(data.createdAt);
                    if (pDate.toISOString().startsWith(currentMonthPrefix)) monthlyPatients++;
                } else {
                    monthlyPatients++; 
                }
            });
            
            document.getElementById('stat-patients').innerText = allPatientsData.length;
            if (document.getElementById('stat-month-patients')) {
                document.getElementById('stat-month-patients').innerText = monthlyPatients;
            }
        } catch(e) { console.error("Patients Error:", e); }
    });

    finQuery.onSnapshot(snap => {
        try {
            todayRevenueData = []; 
            let monthRevenue = 0;

            snap.forEach(doc => { 
                const data = doc.data();
                if (data.amount) {
                    if (data.date === todayStr) {
                        todayRevenueData.push({ id: doc.id, ...data }); 
                    }
                    if (data.date && data.date.startsWith(currentMonthPrefix)) {
                        monthRevenue += Number(data.amount);
                    }
                }
            });
            
            if (document.getElementById('stat-month-revenue')) {
                document.getElementById('stat-month-revenue').innerText = monthRevenue.toLocaleString();
            }
            updateTotalRevenue();
            renderLiveFinances(); 
        } catch(e) { console.error("Finances Error:", e); }
    });

    appQuery.onSnapshot(snap => {
        try {
            let pending = 0, completed = 0, cancelled = 0;
            let monthlyCompleted = 0;
            todayPendingApps = []; upcomingPendingApps = []; completedSessionsData = [];

            snap.forEach(doc => {
                const data = doc.data();
                if (data.status === 'completed') { 
                    completed++; 
                    completedSessionsData.push({ id: doc.id, ...data }); 
                    if (data.date && data.date.startsWith(currentMonthPrefix)) monthlyCompleted++;
                }
                if (data.status === 'cancelled') cancelled++;
                if (data.status === 'pending') {
                    pending++;
                    if (data.date === todayStr) todayPendingApps.push({ id: doc.id, ...data });
                    else if (data.date > todayStr) upcomingPendingApps.push({ id: doc.id, ...data });
                }
            });

            document.getElementById('stat-appointments').innerText = todayPendingApps.length;
            document.getElementById('stat-sessions').innerText = completed;
            if (document.getElementById('stat-month-sessions')) {
                document.getElementById('stat-month-sessions').innerText = monthlyCompleted;
            }
            
            todayPendingApps.sort((a, b) => a.time.localeCompare(b.time));
            renderLiveUpcoming(); 

            updateChart(pending, completed, cancelled);
            
            if(document.getElementById('waitingListModal').style.display === 'flex'){
                renderWaitList('todayWaitContainer', todayPendingApps);
                renderWaitList('upcomingWaitContainer', upcomingPendingApps);
            }
        } catch(e) { console.error("Appointments Error:", e); }
    });

    loadInventoryAlerts();
}

function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function searchExistingPatientsDash() {
    const input = document.getElementById('search_patient_input').value.trim().toLowerCase();
    const resultsBox = document.getElementById('patient-search-results');
    resultsBox.innerHTML = '';

    if (input.length === 0) {
        resultsBox.style.display = 'none';
        return;
    }

    const filtered = allPatientsData.filter(p => 
        (p.name && p.name.toLowerCase().includes(input)) || 
        (p.phone && p.phone.includes(input))
    );

    if (filtered.length > 0) {
        filtered.forEach(p => {
            const div = document.createElement('div');
            div.className = 'patient-result-item';
            div.innerHTML = `<span class="patient-result-name">${p.name}</span><span class="patient-result-phone" dir="ltr">${p.phone || ''}</span>`;
            div.onclick = () => fillPatientDataDash(p);
            resultsBox.appendChild(div);
        });
        resultsBox.style.display = 'block';
    } else {
        resultsBox.style.display = 'none';
    }
}

function fillPatientDataDash(p) {
    document.getElementById('search_patient_input').value = p.name;
    document.getElementById('patient-search-results').style.display = 'none';

    document.getElementById('app_name').value = p.name || '';
    document.getElementById('app_phone').value = p.phone || '';
    document.getElementById('app_age').value = p.age || '';
    
    if(p.gender) document.getElementById('app_gender').value = p.gender;

    document.querySelectorAll('.med-history-cb').forEach(cb => cb.checked = false);
    let remainingNotes = [];
    if(p.medicalHistory && Array.isArray(p.medicalHistory)) {
        p.medicalHistory.forEach(part => {
            const cb = document.querySelector(`.med-history-cb[value="${part}"]`);
            if(cb) cb.checked = true;
            else remainingNotes.push(part);
        });
    }
    document.getElementById('app_history').value = remainingNotes.join(' ، ');
    checkPhoneInSystemDash();
}

function checkPhoneInSystemDash() {
    const phone = document.getElementById('app_phone').value.trim();
    const msg = document.getElementById('phone-check-msg');
    if (!msg) return;
    
    if(phone.length < 8) { msg.style.display = 'none'; return; }
    
    const found = allPatientsData.find(p => p.phone === phone);
    if(found) {
        msg.style.display = 'block'; 
        msg.innerText = '✅ مريض مسجل بالسيستم'; 
        msg.style.color = '#10b981';
        if(document.getElementById('app_name').value.trim() === '') fillPatientDataDash(found);
    } else {
        msg.style.display = 'block'; 
        msg.innerText = '✨ مريض جديد محتمل'; 
        msg.style.color = '#0284c7';
    }
}

document.addEventListener('click', function(e) {
    const searchBox = document.getElementById('smart-search-container');
    if (searchBox && !searchBox.contains(e.target)) {
        const results = document.getElementById('patient-search-results');
        if(results) results.style.display = 'none';
    }
});

// 🔴 دالة تصفية الأطباء لمودال الداشبورد السريع 🔴
function populateModalDoctors() {
    const docSelect = document.getElementById('app_doctor');
    if (!docSelect) return;
    const lang = localStorage.getItem('preferredLang') || 'ar';
    docSelect.innerHTML = `<option value="">${lang === 'ar' ? 'اختر الطبيب (اختياري)...' : 'Select Doctor (Optional)...'}</option>`;
    
    let targetBranch = userBranch;
    if (userRole === 'admin' || userRole === 'superadmin') {
        const appBranchEl = document.getElementById('app_branch');
        if (appBranchEl && appBranchEl.value) {
            targetBranch = appBranchEl.value;
        }
    }

    allClinicDoctors.forEach(d => {
        if (targetBranch === 'all' || d.branchId === targetBranch || d.branchId === 'main') {
            docSelect.innerHTML += `<option value="${doc.id}">${d.name}</option>`;
        }
    });
}

function openNewAppModal() {
    const today = getLocalTodayString(); 
    document.getElementById('search_patient_input').value = '';
    document.getElementById('patient-search-results').style.display = 'none';
    
    document.getElementById('app_name').value = '';
    document.getElementById('app_phone').value = '';
    document.getElementById('app_age').value = '';
    document.getElementById('app_gender').value = 'ذكر';
    document.querySelectorAll('.med-history-cb').forEach(cb => cb.checked = false);
    document.getElementById('app_history').value = '';
    
    document.getElementById('app_date').value = today;
    document.getElementById('app_time').value = '18:00';
    document.getElementById('app_type').value = '';
    if(document.getElementById('app_contract')) document.getElementById('app_contract').value = '';
    
    document.getElementById('app_total').value = '0';
    document.getElementById('app_paid').value = '0';
    document.getElementById('app_remaining').value = '0';
    document.getElementById('app_pay_method').value = 'cash';
    document.getElementById('app_notes').value = '';
    
    const msg = document.getElementById('phone-check-msg');
    if(msg) msg.style.display = 'none';
    
    if (userRole === 'admin' || userRole === 'superadmin') {
        document.getElementById('app_branch').value = 'main'; // افتراضي
    }
    
    populateModalDoctors();

    document.getElementById('newAppModal').style.display = 'flex';
}

function calculateNewAppERP() {
    const srvId = document.getElementById('app_type').value;
    const contEl = document.getElementById('app_contract');
    const contId = contEl ? contEl.value : '';
    
    let basePrice = 0;
    const srv = erpServices.find(s => s.id === srvId);
    if (srv) basePrice = Number(srv.price) || 0;

    let discount = 0;
    const cont = erpContracts.find(c => c.id === contId);
    if (cont) discount = Number(cont.discountPercentage) || 0;

    const total = basePrice - (basePrice * (discount / 100));
    document.getElementById('app_total').value = Math.round(total);
    calcNewAppRemaining();
}

function calcNewAppRemaining() {
    const t = Number(document.getElementById('app_total').value) || 0;
    const p = Number(document.getElementById('app_paid').value) || 0;
    document.getElementById('app_remaining').value = Math.max(0, t - p);
}

async function saveNewAppointment(e) {
    e.preventDefault();
    if(!clinicId) return;

    if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري حجز الموعد..." : "Booking...");

    let historyArr = [];
    document.querySelectorAll('.med-history-cb:checked').forEach(cb => historyArr.push(cb.value));
    const otherHistory = document.getElementById('app_history').value.trim();
    if(otherHistory) historyArr.push(otherHistory);
    const finalHistory = historyArr.join(' ، ');

    const srvSelect = document.getElementById('app_type');
    const srv = erpServices.find(s => s.id === srvSelect.value);
    const typeVal = srv ? srv.name : (srvSelect.options ? srvSelect.options[srvSelect.selectedIndex]?.text : srvSelect.value);

    const contSelect = document.getElementById('app_contract');
    const cont = contSelect ? erpContracts.find(c => c.id === contSelect.value) : null;
    const contractVal = cont ? cont.name : 'بدون تعاقد';

    const docSelect = document.getElementById('app_doctor');
    const doctorId = docSelect ? docSelect.value : '';
    const doctorName = (docSelect && docSelect.selectedIndex > 0) ? docSelect.options[docSelect.selectedIndex].text : '';

    let eventColor = '#0284C7'; 
    if (typeVal.includes('استشارة') || typeVal.toLowerCase().includes('follow')) eventColor = '#f59e0b'; 
    if (typeVal.includes('جلسة') || typeVal.toLowerCase().includes('session')) eventColor = '#10b981';

    let targetBranchId = userBranch;
    if (userRole === 'admin' || userRole === 'superadmin') {
        const appBranchEl = document.getElementById('app_branch');
        if (appBranchEl) targetBranchId = appBranchEl.value;
    }

    // عشان نتجنب التكرار في الحجز السريع، هنربطه ببيانات المريض لو لقيناه
    const inputPhone = document.getElementById('app_phone').value.trim();
    const foundPatient = allPatientsData.find(p => p.phone === inputPhone);
    const linkedPatientId = foundPatient ? foundPatient.id : null;

    const data = {
        clinicId: clinicId,
        branchId: targetBranchId, // 🔴
        doctorId: doctorId, // 🔴
        doctorName: doctorName, // 🔴
        patientId: linkedPatientId,
        patientName: document.getElementById('app_name').value.trim(),
        phone: inputPhone, patientPhone: inputPhone,
        age: document.getElementById('app_age').value,
        gender: document.getElementById('app_gender').value,
        history: finalHistory,
        date: document.getElementById('app_date').value,
        time: document.getElementById('app_time').value || '12:00',
        type: typeVal,
        contract: contractVal,
        total: Number(document.getElementById('app_total').value) || 0,
        paid: Number(document.getElementById('app_paid').value) || 0,
        remaining: Number(document.getElementById('app_remaining').value) || 0,
        payMethod: document.getElementById('app_pay_method').value, 
        notes: document.getElementById('app_notes').value.trim(),
        color: eventColor,
        status: 'pending',
        source: 'clinic',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        const btn = e.target.querySelector('button');
        btn.disabled = true; btn.innerText = "...";
        await db.collection("Appointments").add(data);
        closeModal('newAppModal');
    } catch(err) {
        console.error(err);
        alert("حدث خطأ أثناء الحفظ.");
    } finally {
        if (window.hideLoader) window.hideLoader();
    }
}

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
    currentSelectedApp = app; 
    document.getElementById('det_name').innerText = app.patientName;
    document.getElementById('det_phone').innerText = app.phone || '---';
    document.getElementById('det_date').innerText = app.date;
    document.getElementById('det_time').innerText = app.time;
    
    // إظهار الدكتور في تفاصيل الداشبورد
    const docEl = document.getElementById('det_doctor');
    if(docEl) docEl.innerText = app.doctorName || 'غير محدد';
    
    let typeText = app.type;
    if(app.contract && app.contract !== 'بدون تعاقد') typeText += ` <span style="font-size:12px;color:#10b981;">(مُغطى: ${app.contract})</span>`;
    document.getElementById('det_type').innerHTML = typeText;
    
    const paid = app.paid || 0;
    const total = app.total || 0;
    document.getElementById('det_finance').innerText = `${paid} / ${total} ج.م`;
    
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.getElementById('det_notes').innerText = app.notes || (lang === 'ar' ? 'لا يوجد' : 'None');
    
    const actionsDiv = document.getElementById('app-actions-container');
    if(app.status !== 'pending') actionsDiv.style.display = 'none';
    else actionsDiv.style.display = 'flex';

    document.getElementById('appDetailsModal').style.display = 'flex';
}

async function updateAppStatus(newStatus) {
    if(!currentSelectedApp) return;

    if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري التحديث..." : "Updating...");
    try {
        await db.collection("Appointments").doc(currentSelectedApp.id).update({ status: newStatus });
        closeModal('appDetailsModal');
    } catch(e) { 
        console.error("Error updating status:", e); 
    } finally {
        if (window.hideLoader) window.hideLoader();
    }
}

async function deleteAppointment() {
    if(!currentSelectedApp) return;
    if(confirm(window.confDelTxt)) {
        if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري الحذف..." : "Deleting...");
        try {
            await db.collection("Appointments").doc(currentSelectedApp.id).delete();
            closeModal('appDetailsModal');
        } catch(e) { 
            console.error("Error deleting:", e); 
        } finally {
            if (window.hideLoader) window.hideLoader();
        }
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
            li.onclick = () => openRevDetails(rev); 
            const lang = localStorage.getItem('preferredLang') || 'ar';
            
            let methodIcon = '💵';
            if(rev.paymentMethod === 'wallet') methodIcon = '📱';
            if(rev.paymentMethod === 'instapay') methodIcon = '🏦';

            li.innerHTML = `<span style="font-weight: bold; font-size: 15px;">${methodIcon} ${rev.notes || (lang==='ar'?'إيراد عيادة':'Clinic Revenue')}</span><span class="data-badge green">💰 ${rev.amount}</span>`;
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

function openRevDetails(rev) {
    document.getElementById('rdet_amount').innerText = rev.amount;
    document.getElementById('rdet_date').innerText = rev.date;
    document.getElementById('rdet_cat').innerText = rev.category || '---';
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.getElementById('rdet_notes').innerText = rev.notes || (lang === 'ar' ? 'لا يوجد' : 'None');

    let methodStr = "نقدي";
    if(rev.paymentMethod === 'wallet') methodStr = "محفظة";
    if(rev.paymentMethod === 'instapay') methodStr = "إنستاباي / بنكي";
    document.getElementById('rdet_method').innerText = methodStr;
    
    document.getElementById('revDetailsModal').style.display = 'flex';
}

function setupERPInputs() {
    const typeInput = document.getElementById('app_type');
    if (typeInput && typeInput.tagName === 'INPUT') {
        const selectType = document.createElement('select');
        selectType.id = 'app_type';
        selectType.required = true;
        selectType.style.cssText = typeInput.style.cssText;
        selectType.onchange = calculateNewAppERP;
        typeInput.parentNode.replaceChild(selectType, typeInput);

        const contractDiv = document.createElement('div');
        contractDiv.className = 'form-group';
        contractDiv.style.marginBottom = '15px';
        contractDiv.innerHTML = `<label style="display: block; margin-bottom: 8px; font-weight: bold; color: #334155; font-size: 14px;">جهة التعاقد (الخصم)</label>
            <select id="app_contract" style="${selectType.style.cssText}" onchange="calculateNewAppERP()">
                <option value="">بدون تعاقد (0%)</option>
            </select>`;
        selectType.parentNode.parentNode.insertBefore(contractDiv, selectType.parentNode.nextSibling);
    }
}

window.onload = async () => { 
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.body.dir = lang === 'en' ? 'ltr' : 'rtl';
    document.body.setAttribute('data-theme', localStorage.getItem('niva_theme') || 'light');
    
    updatePageContent(lang); 
    setupERPInputs(); 
    updateChart(0, 0, 0);

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            await loadBranchesForModal();
            loadDashboardStats();
        }
    });
};

document.addEventListener('DOMContentLoaded', () => {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', function(event) {
            if (event.target === this) {
                this.style.display = 'none';
            }
        });
    });
});
