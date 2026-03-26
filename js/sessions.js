const db = firebase.firestore();
const clinicId = sessionStorage.getItem('clinicId');
let patientsMap = {}; // قاموس يحفظ (ID: Name)
let currentTab = 'sessions'; // المفتوح حالياً
let currentSessionIdForUpload = null; 
let prescriptionsData = {}; // أوبجكت نحفظ فيه الصور (Base64) عشان نعرضها بسرعة وبدون مشاكل في المتصفح

// 1. الترجمة
function updatePageContent(lang) {
    const t = {
        ar: {
            title: "سجل العيادة الشامل", sub: "متابعة جميع الجلسات والروشتات الصادرة للمرضى",
            search: "بحث باسم المريض أو الإجراء...",
            tSess: "🦷 جميع الجلسات", tPresc: "💊 جميع الروشتات",
            thDate: "التاريخ", thPat: "اسم المريض", thProc: "الإجراء الطبي", thTooth: "رقم السن", thNotes: "ملاحظات", thAct: "إجراءات", thMeds: "الأدوية والجرعات",
            thPaid: "المدفوع", thRemaining: "المتبقي",
            btnProf: "الملف", btnPrint: "🖨️ طباعة", btnComplete: "✅ مكتمل", btnUpload: "📎 رفع روشتة", btnViewDoc: "👁️ عرض",
            empty: "لا يوجد بيانات حالياً."
        },
        en: {
            title: "Clinic Global Log", sub: "Monitor all sessions and prescriptions across the clinic",
            search: "Search by patient name or procedure...",
            tSess: "🦷 All Sessions", tPresc: "💊 All Prescriptions",
            thDate: "Date", thPat: "Patient Name", thProc: "Procedure", thTooth: "Tooth", thNotes: "Notes", thAct: "Actions", thMeds: "Medications",
            thPaid: "Paid", thRemaining: "Remaining",
            btnProf: "Profile", btnPrint: "🖨️ Print", btnComplete: "✅ Complete", btnUpload: "📎 Upload Rx", btnViewDoc: "👁️ View",
            empty: "No data available."
        }
    };
    const c = t[lang] || t.ar;
    const setTxt = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };

    setTxt('txt-title', c.title); setTxt('txt-subtitle', c.sub);
    document.getElementById('searchInput').placeholder = c.search;
    setTxt('tab-all-sessions', c.tSess); setTxt('tab-all-prescriptions', c.tPresc);
    
    setTxt('th-s-date', c.thDate); setTxt('th-s-patient', c.thPat); setTxt('th-s-proc', c.thProc); setTxt('th-s-tooth', c.thTooth); setTxt('th-s-notes', c.thNotes); setTxt('th-s-action', c.thAct);
    setTxt('th-s-paid', c.thPaid); setTxt('th-s-remaining', c.thRemaining); 
    
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
    filterData(); 
}

// 3. جلب أسماء المرضى أولاً
async function fetchPatientsMap() {
    if(!clinicId) return;
    try {
        const snap = await db.collection("Patients").where("clinicId", "==", clinicId).get();
        snap.forEach(doc => {
            patientsMap[doc.id] = doc.data().name;
        });
        loadAllSessions();
        loadAllPrescriptions();
    } catch(e) { console.error("Error fetching patients map:", e); }
}

// 4. جلب جميع الجلسات (تم التحديث لدعم الـ Base64)
function loadAllSessions() {
    db.collection("Sessions").where("clinicId", "==", clinicId).orderBy("createdAt", "desc").onSnapshot(snap => {
        const tbody = document.getElementById('sessionsBody');
        tbody.innerHTML = '';
        if (snap.empty) { tbody.innerHTML = `<tr><td colspan="8" style="text-align: center;">${window.globalStrings.empty}</td></tr>`; return; }
        
        snap.forEach(doc => {
            const s = doc.data();
            const patName = patientsMap[s.patientId] || "مريض غير معروف"; 
            
            const paid = s.paid || 0;
            const remaining = s.remaining || 0;
            
            const tr = document.createElement('tr');
            
            let actionButtons = `<button class="btn-action btn-open" onclick="goToPatientProfile('${s.patientId}')">${window.globalStrings.btnProf}</button>`;
            
            if(remaining > 0) {
                actionButtons += `<button class="btn-action" style="background:#10b981; color:white; border:none;" onclick="markSessionComplete('${doc.id}', ${paid}, ${remaining})">${window.globalStrings.btnComplete}</button>`;
            }

            // لو الروشتة محفوظة كـ Base64
            if(s.prescriptionBase64) {
                prescriptionsData[doc.id] = s.prescriptionBase64; // بنخزنها في القاموس عشان نعرضها بعدين
                actionButtons += `<button class="btn-action" style="background:#3b82f6; color:white; border:none;" onclick="viewPrescription('${doc.id}')">${window.globalStrings.btnViewDoc}</button>`;
            } else {
                actionButtons += `<button class="btn-action" onclick="triggerUpload('${doc.id}')">${window.globalStrings.btnUpload}</button>`;
            }

            tr.innerHTML = `
                <td><span class="data-badge">${s.date}</span></td>
                <td style="font-weight:bold; color:#0f172a;">${patName}</td>
                <td>${s.procedure}</td>
                <td dir="ltr" style="text-align:start;">${s.tooth || '-'}</td>
                <td>${s.notes || '-'}</td>
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
    });
}

// 5. دالة زرار "مكتمل"
function markSessionComplete(sessionId, currentPaid, currentRemaining) {
    if(confirm("هل أنت متأكد من إنهاء الجلسة وتصفير المتبقي؟ (سيتم إضافة المتبقي للمدفوع)")) {
        const totalPaid = Number(currentPaid) + Number(currentRemaining);
        
        db.collection("Sessions").doc(sessionId).update({
            paid: totalPaid,
            remaining: 0
        }).then(() => {
            console.log("تم تحديث الجلسة بنجاح وتصفير المتبقي.");
        }).catch(err => {
            console.error("خطأ في تحديث الجلسة: ", err);
            alert("حدث خطأ أثناء التحديث.");
        });
    }
}

// 6. دوال رفع الروشتة وعرضها (بطريقة الـ Base64)
function triggerUpload(sessionId) {
    currentSessionIdForUpload = sessionId;
    document.getElementById('uploadPrescriptionInput').click(); 
}

document.getElementById('uploadPrescriptionInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if(!file || !currentSessionIdForUpload) return;

    // بنعمل حماية لأن الفايرستور آخره 1 ميجا بايت للدوكيومنت الواحد (خلينا الحد الأقصى 800 كيلو بايت عشان نكون في الأمان)
    if(file.size > 800 * 1024) {
        alert("حجم الملف كبير جداً! يرجى اختيار صورة أو ملف أقل من 800 كيلوبايت حتى يمكن حفظه مباشرة.");
        this.value = ''; // نفضي الانبوت
        return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
        const base64String = event.target.result;
        
        alert("جاري حفظ الروشتة... برجاء الانتظار");
        
        db.collection("Sessions").doc(currentSessionIdForUpload).update({
            prescriptionBase64: base64String
        }).then(() => {
            alert("تم حفظ الروشتة بنجاح!");
            document.getElementById('uploadPrescriptionInput').value = ''; 
            currentSessionIdForUpload = null;
        }).catch((error) => {
            console.error("Upload failed: ", error);
            alert("فشل حفظ الروشتة.");
        });
    };
    reader.readAsDataURL(file); // تحويل الصورة لنص Base64
});

// دالة العرض (بتفتح تابة جديدة وتحط فيها الصورة أو الـ PDF)
function viewPrescription(sessionId) {
    const base64Data = prescriptionsData[sessionId];
    if(!base64Data) return;
    
    const win = window.open();
    if (base64Data.includes("application/pdf")) {
        win.document.write('<title>عرض الروشتة</title><iframe src="' + base64Data + '" style="width:100%; height:100%; border:none;"></iframe>');
    } else {
        win.document.write('<title>عرض الروشتة</title><img src="' + base64Data + '" style="max-width: 100%; display: block; margin: 0 auto;">');
    }
}


// 7. جلب جميع الروشتات المكتوبة 
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

// 8. الفلترة السريعة
function filterData() {
    const input = document.getElementById('searchInput').value.toLowerCase();
    const tableId = currentTab === 'sessions' ? 'sessionsBody' : 'prescriptionsBody';
    const rows = document.getElementById(tableId).getElementsByTagName('tr');
    
    for (let i = 0; i < rows.length; i++) {
        const nameCol = rows[i].getElementsByTagName('td')[1]; 
        const infoCol = rows[i].getElementsByTagName('td')[2]; 
        if (nameCol && infoCol) {
            const textToSearch = (nameCol.textContent + " " + infoCol.textContent).toLowerCase();
            if (textToSearch.indexOf(input) > -1) rows[i].style.display = "";
            else rows[i].style.display = "none";
        }
    }
}

// 9. دالة الطباعة
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
