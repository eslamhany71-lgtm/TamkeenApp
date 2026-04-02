const db = firebase.firestore();
const storage = firebase.storage(); 
const clinicId = sessionStorage.getItem('clinicId');
let patientsMap = {}; 
let currentTab = 'sessions'; 
let currentSessionIdForUpload = null; 

let currentUserDisplayName = "مستخدم غير معروف";

const ITEMS_PER_PAGE = 50;
let lastVisibleSession = null;
let lastVisibleRx = null;
let loadedSessions = [];
let loadedPrescriptions = [];

function updatePageContent(lang) {
    const t = {
        ar: {
            title: "سجل العيادة الشامل", sub: "متابعة أحدث الجلسات والروشتات الصادرة للمرضى",
            search: "بحث باسم المريض...",
            tSess: "🦷 أحدث الجلسات", tPresc: "💊 أحدث الروشتات",
            thDate: "التاريخ والوقت", thPat: "اسم المريض", thProc: "الإجراء الطبي", thTooth: "رقم السن", 
            thTotal: "الإجمالي", thPaid: "المدفوع", thRemaining: "المتبقي", thNotes: "ملاحظات", thAct: "إجراءات", thMeds: "الأدوية والجرعات",
            btnProf: "ملف المريض", btnPrint: "🖨️ طباعة", btnUpload: "📎 رفع", btnViewDoc: "👁️ عرض", btnDel: "🗑️ حذف",
            empty: "لا يوجد بيانات حالياً.", loadMore: "⬇️ تحميل المزيد...", noMore: "لا يوجد بيانات أخرى", confDel: "هل أنت متأكد من حذف هذه الجلسة نهائياً؟"
        },
        en: {
            title: "Clinic Global Log", sub: "Monitor latest sessions and prescriptions",
            search: "Search by patient name...",
            tSess: "🦷 Latest Sessions", tPresc: "💊 Latest Prescriptions",
            thDate: "Date & Time", thPat: "Patient Name", thProc: "Procedure", thTooth: "Tooth", 
            thTotal: "Total", thPaid: "Paid", thRemaining: "Remaining", thNotes: "Notes", thAct: "Actions", thMeds: "Medications",
            btnProf: "Profile", btnPrint: "🖨️ Print", btnUpload: "📎 Upload", btnViewDoc: "👁️ View", btnDel: "🗑️ Delete",
            empty: "No data available.", loadMore: "⬇️ Load More...", noMore: "No more data", confDel: "Are you sure you want to delete this session?"
        }
    };
    const c = t[lang] || t.ar;
    const setTxt = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };

    setTxt('txt-title', c.title); setTxt('txt-subtitle', c.sub);
    document.getElementById('searchInput').placeholder = c.search;
    setTxt('tab-all-sessions', c.tSess); setTxt('tab-all-prescriptions', c.tPresc);
    
    setTxt('th-s-date', c.thDate); setTxt('th-s-patient', c.thPat); setTxt('th-s-proc', c.thProc); setTxt('th-s-tooth', c.thTooth); 
    setTxt('th-s-total', c.thTotal); setTxt('th-s-paid', c.thPaid); setTxt('th-s-remaining', c.thRemaining); setTxt('th-s-action', c.thAct);
    setTxt('th-p-date', c.thDate); setTxt('th-p-patient', c.thPat); setTxt('th-p-meds', c.thMeds); setTxt('th-p-action', c.thAct);

    window.globalStrings = c;
}

function switchTab(tabId, element) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    element.classList.add('active');
    document.getElementById(`content-${tabId}`).classList.add('active');
    currentTab = tabId === 'all-sessions' ? 'sessions' : 'prescriptions';
    
    if (currentTab === 'sessions' && loadedSessions.length === 0) loadSessions();
    if (currentTab === 'prescriptions' && loadedPrescriptions.length === 0) loadPrescriptions();
}

async function fetchMissingPatients(patientIds) {
    const missingIds = patientIds.filter(id => !patientsMap[id]);
    if (missingIds.length === 0) return;
    
    const chunks = [];
    for (let i = 0; i < missingIds.length; i += 10) { chunks.push(missingIds.slice(i, i + 10)); }
    
    for (const chunk of chunks) {
        try {
            const snap = await db.collection("Patients").where(firebase.firestore.FieldPath.documentId(), "in", chunk).get();
            snap.forEach(doc => { patientsMap[doc.id] = doc.data().name; });
        } catch(e) { console.error("Error fetching patient chunk:", e); }
    }
}

function getAccurateTime(timestamp) {
    if (!timestamp) return Date.now();
    if (typeof timestamp.toMillis === 'function') return timestamp.toMillis();
    if (timestamp.seconds) return timestamp.seconds * 1000;
    return new Date(timestamp).getTime();
}

function sortDataLocally(dataArray) {
    dataArray.sort((a, b) => {
        const dateA = new Date(a.date || 0).getTime();
        const dateB = new Date(b.date || 0).getTime();
        if (dateA !== dateB) {
            return dateB - dateA; 
        }
        return getAccurateTime(b.createdAt) - getAccurateTime(a.createdAt);
    });
}

async function loadSessions(isLoadMore = false) {
    if (!clinicId) return;
    const tbody = document.getElementById('sessionsBody');
    const btnMore = document.getElementById('btn-load-more-sessions');

    // 🔴 إظهار اللودر عند التحميل لأول مرة
    if (!isLoadMore && window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري تحميل الجلسات..." : "Loading sessions...");

    if (!isLoadMore) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">جاري التحميل...</td></tr>';
        loadedSessions = [];
        lastVisibleSession = null;
    } else {
        btnMore.innerText = "..."; btnMore.disabled = true;
    }

    try {
        let queryRef = db.collection("Sessions")
                         .where("clinicId", "==", clinicId)
                         .orderBy("date", "desc")
                         .limit(ITEMS_PER_PAGE);

        if (isLoadMore && lastVisibleSession) queryRef = queryRef.startAfter(lastVisibleSession);

        const snap = await queryRef.get();
        if (!snap.empty) {
            lastVisibleSession = snap.docs[snap.docs.length - 1];
            
            const pIds = [];
            snap.forEach(doc => {
                const s = doc.data();
                if (s.patientId && !pIds.includes(s.patientId)) pIds.push(s.patientId);
            });
            
            await fetchMissingPatients(pIds);
            
            snap.forEach(doc => {
                const s = doc.data({ serverTimestamps: 'estimate' });
                s.id = doc.id;
                loadedSessions.push(s);
            });
            
            sortDataLocally(loadedSessions);
            renderSessions();
            
            if (snap.docs.length === ITEMS_PER_PAGE) {
                btnMore.style.display = 'block';
                btnMore.innerText = window.globalStrings.loadMore;
            } else { btnMore.style.display = 'none'; }
        } else {
            if (!isLoadMore) tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #64748b;">${window.globalStrings.empty}</td></tr>`;
            else { btnMore.innerText = window.globalStrings.noMore; setTimeout(() => btnMore.style.display = 'none', 2000); }
        }
    } catch(e) { 
        console.error(e); 
    } finally { 
        if(isLoadMore) btnMore.disabled = false; 
        // 🔴 إخفاء اللودر
        if (!isLoadMore && window.hideLoader) window.hideLoader();
    }
}

function renderSessions(dataToRender = loadedSessions) {
    const tbody = document.getElementById('sessionsBody');
    tbody.innerHTML = '';
    
    if(dataToRender.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #64748b;">${window.globalStrings.empty}</td></tr>`;
        return;
    }

    const seenPatients = new Set();
    const isAr = (localStorage.getItem('preferredLang') || 'ar') === 'ar';

    dataToRender.forEach(s => {
        if (seenPatients.has(s.patientId)) return; 
        seenPatients.add(s.patientId);

        const patName = patientsMap[s.patientId] || "مريض غير معروف"; 
        
        let timeStr = '---';
        if (s.createdAt) {
            try {
                const d = typeof s.createdAt.toDate === 'function' ? s.createdAt.toDate() : new Date(s.createdAt);
                timeStr = d.toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {hour: '2-digit', minute:'2-digit'});
            } catch(e) { timeStr = '---'; }
        }

        const total = s.total || 0;
        const paid = s.paid || 0;
        const remaining = s.remaining || 0;

        let createdByHtml = '';
        if (s.createdBy) {
            createdByHtml = `<div style="margin-top: 5px;"><span style="background: #f1f5f9; color: #64748b; font-size: 11px; padding: 2px 6px; border-radius: 4px; border: 1px solid #e2e8f0;">👤 ${isAr ? 'بواسطة:' : 'By:'} ${s.createdBy}</span></div>`;
        }
        
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td>
                <div style="display: flex; flex-direction: column; align-items: center;">
                    <span class="data-badge">${s.date}</span>
                    <span style="font-size: 16px; color: #000; margin-top: 4px; font-weight: bold;">${timeStr}</span>
                </div>
            </td>
            <td style="font-weight:bold; color:#0f172a;">${patName}</td>
            <td>
                <div style="font-weight: bold; color: #0f172a;">${s.procedure}</div>
                ${createdByHtml}
            </td>
            <td dir="ltr" style="text-align: center; font-weight: bold; color: #0284c7;">${s.tooth || '-'}</td>
            <td style="font-weight:bold;">${total}</td>
            <td style="color:#10b981; font-weight:bold;">${paid}</td>
            <td style="color:${remaining > 0 ? '#ef4444' : '#64748b'}; font-weight:bold;">${remaining}</td>
            <td>
                <div class="action-group" style="justify-content: center;">
                    <button class="btn-action btn-open" onclick="goToPatientProfile('${s.patientId}')" title="ملف المريض">📂</button>
                    <button class="btn-action btn-delete" onclick="deleteSession('${s.id}')" title="حذف الجلسة">🗑️</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function deleteSession(sessionId) {
    if(confirm(window.globalStrings.confDel || "هل أنت متأكد من حذف هذه الجلسة؟")) {
        // 🔴 إظهار اللودر عند الحذف
        if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري الحذف..." : "Deleting...");

        try {
            await db.collection("Sessions").doc(sessionId).delete();
            loadedSessions = loadedSessions.filter(s => s.id !== sessionId);
            renderSessions();
        } catch(e) { 
            console.error(e); 
        } finally {
            // 🔴 إخفاء اللودر
            if (window.hideLoader) window.hideLoader();
        }
    }
}

async function loadPrescriptions(isLoadMore = false) {
    if (!clinicId) return;
    const tbody = document.getElementById('prescriptionsBody');
    const btnMore = document.getElementById('btn-load-more-rx');

    // 🔴 إظهار اللودر
    if (!isLoadMore && window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري تحميل الروشتات..." : "Loading prescriptions...");

    if (!isLoadMore) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">جاري التحميل...</td></tr>';
        loadedPrescriptions = [];
        lastVisibleRx = null;
    } else {
        btnMore.innerText = "..."; btnMore.disabled = true;
    }

    try {
        let queryRef = db.collection("Prescriptions")
                         .where("clinicId", "==", clinicId)
                         .orderBy("date", "desc")
                         .limit(ITEMS_PER_PAGE);

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
                const p = doc.data({ serverTimestamps: 'estimate' });
                p.id = doc.id;
                loadedPrescriptions.push(p);
            });
            
            sortDataLocally(loadedPrescriptions);
            renderPrescriptions();
            
            if (snap.docs.length === ITEMS_PER_PAGE) {
                btnMore.style.display = 'block';
                btnMore.innerText = window.globalStrings.loadMore;
            } else { btnMore.style.display = 'none'; }
        } else {
            if (!isLoadMore) tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #64748b;">${window.globalStrings.empty}</td></tr>`;
            else { btnMore.innerText = window.globalStrings.noMore; setTimeout(() => btnMore.style.display = 'none', 2000); }
        }
    } catch(e) { 
        console.error(e); 
    } finally { 
        if(isLoadMore) btnMore.disabled = false; 
        // 🔴 إخفاء اللودر
        if (!isLoadMore && window.hideLoader) window.hideLoader();
    }
}

function renderPrescriptions(dataToRender = loadedPrescriptions) {
    const tbody = document.getElementById('prescriptionsBody');
    tbody.innerHTML = '';
    
    if(dataToRender.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #64748b;">${window.globalStrings.empty}</td></tr>`;
        return;
    }

    const seenPatients = new Set(); 
    const isAr = (localStorage.getItem('preferredLang') || 'ar') === 'ar';

    dataToRender.forEach(p => {
        if (seenPatients.has(p.patientId)) return; 
        seenPatients.add(p.patientId);

        let timeStr = '---';
        if (p.createdAt) {
            try {
                const d = typeof p.createdAt.toDate === 'function' ? p.createdAt.toDate() : new Date(s.createdAt);
                timeStr = d.toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {hour: '2-digit', minute:'2-digit'});
            } catch(e) { timeStr = '---'; }
        }

        const patName = patientsMap[p.patientId] || "مريض غير معروف";
        const tr = document.createElement('tr');
        
        let rxButtons = `<button class="btn-action" style="background:#f59e0b; color:white; border:none;" onclick="triggerUploadRx('${p.id}')" title="رفع صورة/ملف للروشتة">📎</button>`;
        if(p.imageUrl) {
            rxButtons += `<button class="btn-action" style="background:#3b82f6; color:white; border:none;" onclick="window.open('${p.imageUrl}', '_blank')" title="عرض الروشتة المرفوعة">👁️</button>`;
        }

        let createdByHtml = '';
        if (p.createdBy) {
            createdByHtml = `<div style="margin-top: 8px;"><span style="background: #f1f5f9; color: #64748b; font-size: 11px; padding: 2px 6px; border-radius: 4px; border: 1px solid #e2e8f0;">👤 ${isAr ? 'بواسطة:' : 'By:'} ${p.createdBy}</span></div>`;
        }

        tr.innerHTML = `
            <td>
                <div style="display: flex; flex-direction: column; align-items: center;">
                    <span class="data-badge">${p.date}</span>
                    <span style="font-size: 16px; color: #000; margin-top: 4px; font-weight: bold;">${timeStr}</span>
                </div>
            </td>
            <td style="font-weight:bold; color:#0f172a;">${patName}</td>
            <td>
                <div class="presc-text">${p.medications}</div>
                ${createdByHtml}
            </td>
            <td>
                <div class="action-group" style="justify-content: center;">
                    ${rxButtons}
                    <button class="btn-action btn-print" onclick="printGlobalPrescription('${p.id}', '${patName}')" title="طباعة">🖨️</button>
                    <button class="btn-action btn-open" onclick="goToPatientProfile('${p.patientId}')" title="ملف المريض">📂</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function triggerUploadRx(rxId) {
    currentSessionIdForUpload = rxId;
    document.getElementById('uploadPrescriptionInput').click();
}

document.getElementById('uploadPrescriptionInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || !currentSessionIdForUpload) return;
    
    // 🔴 إظهار اللودر عند رفع الروشتة
    if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري رفع الروشتة..." : "Uploading prescription...");
    
    try {
        const storageRef = storage.ref(`prescriptions/${clinicId}/${currentSessionIdForUpload}_${file.name}`);
        await storageRef.put(file);
        const url = await storageRef.getDownloadURL();
        
        await db.collection("Prescriptions").doc(currentSessionIdForUpload).update({ imageUrl: url });
        
        const rxIndex = loadedPrescriptions.findIndex(p => p.id === currentSessionIdForUpload);
        if(rxIndex > -1) {
            loadedPrescriptions[rxIndex].imageUrl = url;
            renderPrescriptions();
        }
        
        alert("✅ تم رفع الروشتة بنجاح!");
    } catch (error) {
        console.error("Upload error:", error);
        alert("❌ حدث خطأ أثناء الرفع.");
    } finally {
        e.target.value = ''; 
        // 🔴 إخفاء اللودر
        if (window.hideLoader) window.hideLoader();
    }
});

function searchActivity() {
    const input = document.getElementById('searchInput').value.trim().toLowerCase();
    
    if(!input) {
        if(currentTab === 'sessions') {
            renderSessions(loadedSessions);
            document.getElementById('btn-load-more-sessions').style.display = loadedSessions.length >= ITEMS_PER_PAGE ? 'block' : 'none';
        } else {
            renderPrescriptions(loadedPrescriptions);
            document.getElementById('btn-load-more-rx').style.display = loadedPrescriptions.length >= ITEMS_PER_PAGE ? 'block' : 'none';
        }
        return; 
    }
    
    if(currentTab === 'sessions') {
        const filtered = loadedSessions.filter(s => {
            const pName = (patientsMap[s.patientId] || "").toLowerCase();
            return pName.includes(input) || (s.createdBy && s.createdBy.toLowerCase().includes(input));
        });
        renderSessions(filtered);
        document.getElementById('btn-load-more-sessions').style.display = 'none';
    } else {
        const filtered = loadedPrescriptions.filter(p => {
            const pName = (patientsMap[p.patientId] || "").toLowerCase();
            return pName.includes(input) || (p.createdBy && p.createdBy.toLowerCase().includes(input));
        });
        renderPrescriptions(filtered);
        document.getElementById('btn-load-more-rx').style.display = 'none';
    }
}

function resetSearch() {
    document.getElementById('searchInput').value = '';
    searchActivity(); 
}

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
    
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) { 
            try {
                const userDoc = await db.collection("Users").doc(user.email).get();
                if (userDoc.exists) {
                    currentUserDisplayName = userDoc.data().name || "مدير النظام";
                }
            } catch(e) { console.error("Error fetching user name"); }
            
            loadSessions(); 
        }
    });
};
