const db = firebase.firestore();
const clinicId = sessionStorage.getItem('clinicId');
let patientsMap = {}; // قاموس يحفظ (ID: Name)
let currentTab = 'sessions'; // المفتوح حالياً

// 1. الترجمة
function updatePageContent(lang) {
    const t = {
        ar: {
            title: "سجل العيادة الشامل", sub: "متابعة جميع الجلسات والروشتات الصادرة للمرضى",
            search: "بحث باسم المريض أو الإجراء...",
            tSess: "🦷 جميع الجلسات", tPresc: "💊 جميع الروشتات",
            thDate: "التاريخ", thPat: "اسم المريض", thProc: "الإجراء الطبي", thTooth: "رقم السن", thNotes: "ملاحظات", thAct: "إجراءات", thMeds: "الأدوية والجرعات",
            btnProf: "الملف", btnPrint: "🖨️ طباعة", empty: "لا يوجد بيانات حالياً."
        },
        en: {
            title: "Clinic Global Log", sub: "Monitor all sessions and prescriptions across the clinic",
            search: "Search by patient name or procedure...",
            tSess: "🦷 All Sessions", tPresc: "💊 All Prescriptions",
            thDate: "Date", thPat: "Patient Name", thProc: "Procedure", thTooth: "Tooth", thNotes: "Notes", thAct: "Actions", thMeds: "Medications",
            btnProf: "Profile", btnPrint: "🖨️ Print", empty: "No data available."
        }
    };
    const c = t[lang] || t.ar;
    const setTxt = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };

    setTxt('txt-title', c.title); setTxt('txt-subtitle', c.sub);
    document.getElementById('searchInput').placeholder = c.search;
    setTxt('tab-all-sessions', c.tSess); setTxt('tab-all-prescriptions', c.tPresc);
    
    setTxt('th-s-date', c.thDate); setTxt('th-s-patient', c.thPat); setTxt('th-s-proc', c.thProc); setTxt('th-s-tooth', c.thTooth); setTxt('th-s-notes', c.thNotes); setTxt('th-s-action', c.thAct);
    setTxt('th-p-date', c.thDate); setTxt('th-p-patient', c.thPat); setTxt('th-p-meds', c.thMeds); setTxt('th-p-action', c.thAct);

    window.globalStrings = c;
}

// 2. التبديل بين التابات
function switchTab(tabId, element) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    element.classList.add('active');
    document.getElementById(`content-${tabId}`).classList.add('active');
    currentTab = tabId === 'all-sessions' ? 'sessions' : 'prescriptions';
    filterData(); // إعادة فلترة لو في كلام مكتوب
}

// 3. جلب أسماء المرضى أولاً (القاموس السحري)
async function fetchPatientsMap() {
    if(!clinicId) return;
    try {
        const snap = await db.collection("Patients").where("clinicId", "==", clinicId).get();
        snap.forEach(doc => {
            patientsMap[doc.id] = doc.data().name;
        });
        // بعد ما نجيب الأسماء، نحمل الجلسات والروشتات
        loadAllSessions();
        loadAllPrescriptions();
    } catch(e) { console.error("Error fetching patients map:", e); }
}

// 4. جلب جميع الجلسات
function loadAllSessions() {
    db.collection("Sessions").where("clinicId", "==", clinicId).orderBy("createdAt", "desc").onSnapshot(snap => {
        const tbody = document.getElementById('sessionsBody');
        tbody.innerHTML = '';
        if (snap.empty) { tbody.innerHTML = `<tr><td colspan="6" style="text-align: center;">${window.globalStrings.empty}</td></tr>`; return; }
        
        snap.forEach(doc => {
            const s = doc.data();
            const patName = patientsMap[s.patientId] || "مريض غير معروف"; // ترجمة الـ ID لاسم
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="data-badge">${s.date}</span></td>
                <td style="font-weight:bold; color:#0f172a;">${patName}</td>
                <td>${s.procedure}</td>
                <td dir="ltr" style="text-align:start;">${s.tooth || '-'}</td>
                <td>${s.notes || '-'}</td>
                <td>
                    <div class="action-group">
                        <button class="btn-action btn-open" onclick="goToPatientProfile('${s.patientId}')">${window.globalStrings.btnProf}</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    });
}

// 5. جلب جميع الروشتات
function loadAllPrescriptions() {
    db.collection("Prescriptions").where("clinicId", "==", clinicId).orderBy("createdAt", "desc").onSnapshot(snap => {
        const tbody = document.getElementById('prescriptionsBody');
        tbody.innerHTML = '';
        if (snap.empty) { tbody.innerHTML = `<tr><td colspan="4" style="text-align: center;">${window.globalStrings.empty}</td></tr>`; return; }
        
        snap.forEach(doc => {
            const p = doc.data();
            const patName = patientsMap[p.patientId] || "مريض غير معروف";
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="data-badge">${p.date}</span></td>
                <td style="font-weight:bold; color:#0f172a;">${patName}</td>
                <td><div class="presc-text">${p.medications}</div></td>
                <td>
                    <div class="action-group">
                        <button class="btn-action btn-print" onclick="printGlobalPrescription('${doc.id}', '${patName}')">${window.globalStrings.btnPrint}</button>
                        <button class="btn-action btn-open" onclick="goToPatientProfile('${p.patientId}')">${window.globalStrings.btnProf}</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    });
}

// 6. الفلترة السريعة
function filterData() {
    const input = document.getElementById('searchInput').value.toLowerCase();
    const tableId = currentTab === 'sessions' ? 'sessionsBody' : 'prescriptionsBody';
    const rows = document.getElementById(tableId).getElementsByTagName('tr');
    
    for (let i = 0; i < rows.length; i++) {
        const nameCol = rows[i].getElementsByTagName('td')[1]; // عمود الاسم
        const infoCol = rows[i].getElementsByTagName('td')[2]; // عمود الإجراء/الدواء
        if (nameCol && infoCol) {
            const textToSearch = (nameCol.textContent + " " + infoCol.textContent).toLowerCase();
            if (textToSearch.indexOf(input) > -1) rows[i].style.display = "";
            else rows[i].style.display = "none";
        }
    }
}

// 7. دالة الطباعة
async function printGlobalPrescription(docId, patientName) {
    try {
        const doc = await db.collection("Prescriptions").doc(docId).get();
        if(doc.exists) {
            const p = doc.data();
            document.getElementById('print-patient-name').innerText = patientName;
            document.getElementById('print-date').innerText = p.date;
            document.getElementById('print-meds').innerText = p.medications;
            document.getElementById('print-notes').innerText = p.notes || '---';
            
            db.collection("Clinics").doc(clinicId).get().then(cDoc => {
                if(cDoc.exists && cDoc.data().clinicName) {
                    document.getElementById('print-clinic-name').innerText = cDoc.data().clinicName;
                }
                window.print();
            });
        }
    } catch(e) { console.error(e); }
}

function goToPatientProfile(patientId) {
    window.parent.loadPage(`patient-profile.html?id=${patientId}`, window.parent.document.getElementById('nav-patients').parentElement);
}

window.onload = () => {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.body.dir = lang === 'en' ? 'ltr' : 'rtl';
    updatePageContent(lang);
    
    firebase.auth().onAuthStateChanged((user) => {
        if (user) { fetchPatientsMap(); }
    });
};
