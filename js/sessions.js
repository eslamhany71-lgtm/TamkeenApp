const db = firebase.firestore();
const clinicId = sessionStorage.getItem('clinicId');
let patientsMap = {}; // ID -> Name
let currentTab = 'sessions'; 
let currentSessionIdForUpload = null; 
let prescriptionsData = {}; 

// 🔴 متغيرات الـ Pagination لمنع إهدار القراءات 🔴
const ITEMS_PER_PAGE = 50;
let lastVisibleSession = null;
let lastVisibleRx = null;
let loadedSessions = [];
let loadedPrescriptions = [];

// 1. الترجمة
function updatePageContent(lang) {
    const t = {
        ar: {
            title: "سجل العيادة الشامل", sub: "متابعة أحدث الجلسات والروشتات الصادرة للمرضى",
            search: "بحث باسم المريض...",
            tSess: "🦷 أحدث الجلسات", tPresc: "💊 أحدث الروشتات",
            thDate: "التاريخ", thPat: "اسم المريض", thProc: "الإجراء الطبي", thTooth: "رقم السن", thNotes: "ملاحظات", thAct: "إجراءات", thMeds: "الأدوية والجرعات",
            thPaid: "المدفوع", thRemaining: "المتبقي",
            btnProf: "ملف المريض", btnPrint: "🖨️ طباعة", btnComplete: "✅ مكتمل", btnUpload: "📎 رفع روشتة", btnViewDoc: "👁️ عرض",
            empty: "لا يوجد بيانات حالياً.", loadMore: "⬇️ تحميل المزيد...", noMore: "لا يوجد بيانات أخرى"
        },
        en: {
            title: "Clinic Global Log", sub: "Monitor latest sessions and prescriptions",
            search: "Search by patient name...",
            tSess: "🦷 Latest Sessions", tPresc: "💊 Latest Prescriptions",
            thDate: "Date", thPat: "Patient Name", thProc: "Procedure", thTooth: "Tooth", thNotes: "Notes", thAct: "Actions", thMeds: "Medications",
            thPaid: "Paid", thRemaining: "Remaining",
            btnProf: "Profile", btnPrint: "🖨️ Print", btnComplete: "✅ Complete", btnUpload: "📎 Upload Rx", btnViewDoc: "👁️ View",
            empty: "No data available.", loadMore: "⬇️ Load More...", noMore: "No more data"
        }
    };
    const c = t[lang] || t.ar;
    const setTxt = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };

    setTxt('txt-title', c.title); setTxt('txt-subtitle', c.sub);
    document.getElementById('searchInput').placeholder = c.search;
    setTxt('tab-all-sessions', c.tSess); setTxt('tab-all-prescriptions', c.tPresc);
    
    setTxt('th-s-date', c.thDate); setTxt('th-s-patient', c.thPat); setTxt('th-s-proc', c.thProc); setTxt('th-s-tooth', c.thTooth); setTxt('th-s-paid', c.thPaid); setTxt('th-s-remaining', c.thRemaining); setTxt('th-s-action', c.thAct);
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
    
    // تحميل الداتا لو مكنتش متحملة
    if (currentTab === 'sessions' && loadedSessions.length === 0) loadSessions();
    if (currentTab === 'prescriptions' && loadedPrescriptions.length === 0) loadPrescriptions();
}

// 🔴 3. جلب أسماء المرضى المطلوبة فقط (Read-Saver) 🔴
async function fetchMissingPatients(patientIds) {
    const missingIds = patientIds.filter(id => !patientsMap[id]);
    if (missingIds.length === 0) return;
    
    // الفايربيز بيسمح بـ 10 أيديهات كحد أقصى في استعلام (in)، فهنقسمهم مجموعات
    const chunks = [];
    for (let i = 0; i < missingIds.length; i += 10) {
        chunks.push(missingIds.slice(i, i + 10));
    }
    
    for (const chunk of chunks) {
        try {
            const snap = await db.collection("Patients").where(firebase.firestore.FieldPath.documentId(), "in", chunk).get();
            snap.forEach(doc => { patientsMap[doc.id] = doc.data().name; });
        } catch(e) { console.error("Error fetching patient chunk:", e); }
    }
}

// 🔴 4. جلب الجلسات بالـ Pagination ومنع التكرار 🔴
async function loadSessions(isLoadMore = false) {
    if (!clinicId) return;
    const tbody = document.getElementById('sessionsBody');
    const btnMore = document.getElementById('btn-load-more-sessions');

    if (!isLoadMore) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">جاري التحميل...</td></tr>';
        loadedSessions = [];
        lastVisibleSession = null;
    } else {
        btnMore.innerText = "..."; btnMore.disabled = true;
    }

    try {
        let queryRef = db.collection("Sessions").where("clinicId", "==", clinicId).orderBy("createdAt", "desc").limit(ITEMS_PER_PAGE);
        if (isLoadMore && lastVisibleSession) queryRef = queryRef.startAfter(lastVisibleSession);

        const snap = await queryRef.get();
        if (!snap.empty) {
            lastVisibleSession = snap.docs[snap.docs.length - 1];
            
            // استخراج الأيديهات لطلب أساميهم
            const pIds = [];
            snap.forEach(doc => {
                const s = doc.data();
                if (s.patientId && !pIds.includes(s.patientId)) pIds.push(s.patientId);
            });
            
            await fetchMissingPatients(pIds);
            
            snap.forEach(doc => {
                const s = doc.data();
                s.id = doc.id;
                loadedSessions.push(s);
            });
            
            renderSessions();
            
            if (snap.docs.length === ITEMS_PER_PAGE) {
                btnMore.style.display = 'block';
                btnMore.innerText = window.globalStrings.loadMore || "⬇️ تحميل المزيد...";
            } else { btnMore.style.display = 'none'; }
        } else {
            if (!isLoadMore) tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #64748b;">${window.globalStrings.empty}</td></tr>`;
            else { btnMore.innerText = window.globalStrings.noMore || "لا يوجد المزيد"; setTimeout(() => btnMore.style.display = 'none', 2000); }
        }
    } catch(e) { console.error(e); } finally { if(isLoadMore) btnMore.disabled = false; }
}

// 🔴 دالة رسم الجلسات (مع فلتر منع التكرار للمريض) 🔴
function renderSessions(dataToRender = loadedSessions) {
    const tbody = document.getElementById('sessionsBody');
    tbody.innerHTML = '';
    
    if(dataToRender.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #64748b;">${window.globalStrings.empty}</td></tr>`;
        return;
    }

    const seenPatients = new Set(); // مصفاة منع التكرار

    dataToRender.forEach(s => {
        // لو المريض ده اتعرضله جلسة قبل كده في اللستة دي، نتجاهل الجلسات القديمة بتاعته
        if (seenPatients.has(s.patientId)) return; 
        seenPatients.add(s.patientId);

        const patName = patientsMap[s.patientId] || "مريض غير معروف"; 
        const paid = s.paid || 0;
        const remaining = s.remaining || 0;
        
        const tr = document.createElement('tr');
        
        // هنا حلينا مشكلة الـ Routing وبنبعت s.patientId
        let actionButtons = `<button class="btn-action btn-open" onclick="goToPatientProfile('${s.patientId}')">${window.globalStrings.btnProf}</button>`;
        
        if(remaining > 0) {
            actionButtons += `<button class="btn-action" style="background:#10b981; color:white; border:none;" onclick="markSessionComplete('${s.id}', ${paid}, ${remaining})">${window.globalStrings.btnComplete}</button>`;
        }

        tr.innerHTML = `
            <td><span class="data-badge">${s.date}</span></td>
            <td style="font-weight:bold; color:#0f172a;">${patName}</td>
            <td>${s.procedure}</td>
            <td dir="ltr" style="text-align:start;">${s.tooth || '-'}</td>
            <td style="color:#10b981; font-weight:bold;">${paid}</td>
            <td style="color:${remaining > 0 ? '#ef4444' : '#64748b'}; font-weight:bold;">${remaining}</td>
            <td>
                <div class="action-group">
                    ${actionButtons}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// دالة زرار "مكتمل"
function markSessionComplete(sessionId, currentPaid, currentRemaining) {
    if(confirm("هل أنت متأكد من إنهاء الجلسة وتصفير المتبقي؟ (سيتم إضافة المتبقي للمدفوع)")) {
        const totalPaid = Number(currentPaid) + Number(currentRemaining);
        db.collection("Sessions").doc(sessionId).update({
            paid: totalPaid,
            remaining: 0
        }).then(() => {
            // تحديث محلي سريع بدون ريفرش
            const sessionIndex = loadedSessions.findIndex(s => s.id === sessionId);
            if (sessionIndex > -1) {
                loadedSessions[sessionIndex].paid = totalPaid;
                loadedSessions[sessionIndex].remaining = 0;
                renderSessions();
            }
        }).catch(err => { alert("حدث خطأ أثناء التحديث."); });
    }
}

// 🔴 5. جلب الروشتات بالـ Pagination ومنع التكرار 🔴
async function loadPrescriptions(isLoadMore = false) {
    if (!clinicId) return;
    const tbody = document.getElementById('prescriptionsBody');
    const btnMore = document.getElementById('btn-load-more-rx');

    if (!isLoadMore) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">جاري التحميل...</td></tr>';
        loadedPrescriptions = [];
        lastVisibleRx = null;
    } else {
        btnMore.innerText = "..."; btnMore.disabled = true;
    }

    try {
        let queryRef = db.collection("Prescriptions").where("clinicId", "==", clinicId).orderBy("createdAt", "desc").limit(ITEMS_PER_PAGE);
        if (isLoadMore && lastVisibleRx) queryRef = queryRef.startAfter(lastVisibleRx);

        const snap = await queryRef.get();
        if (!snap.empty) {
            lastVisibleRx = snap.docs[snap.docs.length - 1];
            
            const pIds = [];
            snap.forEach(doc => {
                const p = doc.data();
                if (p.patientId && !pIds.includes(p.patientId)) pIds.push(p.patientId);
            });
            
            await fetchMissingPatients(pIds);
            
            snap.forEach(doc => {
                const p = doc.data();
                p.id = doc.id;
                loadedPrescriptions.push(p);
            });
            
            renderPrescriptions();
            
            if (snap.docs.length === ITEMS_PER_PAGE) {
                btnMore.style.display = 'block';
                btnMore.innerText = window.globalStrings.loadMore || "⬇️ تحميل المزيد...";
            } else { btnMore.style.display = 'none'; }
        } else {
            if (!isLoadMore) tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #64748b;">${window.globalStrings.empty}</td></tr>`;
            else { btnMore.innerText = window.globalStrings.noMore || "لا يوجد المزيد"; setTimeout(() => btnMore.style.display = 'none', 2000); }
        }
    } catch(e) { console.error(e); } finally { if(isLoadMore) btnMore.disabled = false; }
}

function renderPrescriptions(dataToRender = loadedPrescriptions) {
    const tbody = document.getElementById('prescriptionsBody');
    tbody.innerHTML = '';
    
    if(dataToRender.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #64748b;">${window.globalStrings.empty}</td></tr>`;
        return;
    }

    const seenPatients = new Set(); 

    dataToRender.forEach(p => {
        if (seenPatients.has(p.patientId)) return; 
        seenPatients.add(p.patientId);

        const patName = patientsMap[p.patientId] || "مريض غير معروف";
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="data-badge">${p.date}</span></td>
            <td style="font-weight:bold; color:#0f172a;">${patName}</td>
            <td><div class="presc-text">${p.medications}</div></td>
            <td>
                <div class="action-group">
                    <button class="btn-action btn-print" onclick="printGlobalPrescription('${p.id}', '${patName}')">${window.globalStrings.btnPrint}</button>
                    <button class="btn-action btn-open" onclick="goToPatientProfile('${p.patientId}')">${window.globalStrings.btnProf}</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 6. البحث الذكي (بحث محلي لتوفير القراءات)
function searchActivity() {
    const input = document.getElementById('searchInput').value.trim().toLowerCase();
    if(!input) { resetSearch(); return; }
    
    if(currentTab === 'sessions') {
        const filtered = loadedSessions.filter(s => {
            const pName = (patientsMap[s.patientId] || "").toLowerCase();
            return pName.includes(input);
        });
        renderSessions(filtered);
        document.getElementById('btn-load-more-sessions').style.display = 'none';
    } else {
        const filtered = loadedPrescriptions.filter(p => {
            const pName = (patientsMap[p.patientId] || "").toLowerCase();
            return pName.includes(input);
        });
        renderPrescriptions(filtered);
        document.getElementById('btn-load-more-rx').style.display = 'none';
    }
}

function resetSearch() {
    document.getElementById('searchInput').value = '';
    if(currentTab === 'sessions') { 
        renderSessions(); 
        if (loadedSessions.length >= ITEMS_PER_PAGE) document.getElementById('btn-load-more-sessions').style.display = 'block'; 
    }
    else { 
        renderPrescriptions(); 
        if (loadedPrescriptions.length >= ITEMS_PER_PAGE) document.getElementById('btn-load-more-rx').style.display = 'block'; 
    }
}

// 7. دالة الطباعة وتوجيه البروفايل
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
    if(!patientId) return;
    window.parent.loadPage(`patient-profile.html?id=${patientId}`, window.parent.document.getElementById('nav-patients').parentElement);
}

window.onload = () => {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.body.dir = lang === 'en' ? 'ltr' : 'rtl';
    updatePageContent(lang);
    
    firebase.auth().onAuthStateChanged((user) => {
        if (user) { loadSessions(); }
    });
};
