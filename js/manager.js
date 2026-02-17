// manager.js - النسخة المطورة (Dashboard + Notifications + Manager Comments)

let currentManagerDept = sessionStorage.getItem('managerDept') || null;
let currentManagerData = null;
let pendingCountGlobal = 0;
let reminderTimer = null;
let currentTargetRequestId = null;
let currentTargetStatus = null;
let currentTargetEmpCode = null;
let currentTargetDays = 0;

// --- 1. نظام الصوت الذكي ---
function playSystemSound(type) {
    try {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = 'sine';
        osc.frequency.value = (type === 'new') ? 880 : 440; 
        gain.gain.setValueAtTime(0.1, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(context.destination);
        osc.start();
        osc.stop(context.currentTime + 0.5);
    } catch (e) { console.log("Audio logic failed - interaction needed"); }
}

// --- 2. التحقق من الصلاحيات ---
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        const managerCode = user.email.split('@')[0];
        fetchManagerInfo(managerCode);
    } else { window.location.href = "index.html"; }
});

async function fetchManagerInfo(code) {
    try {
        const doc = await firebase.firestore().collection("Employee_Database").doc(code).get();
        if (doc.exists) {
            currentManagerData = doc.data();
            currentManagerDept = currentManagerData.department;
            sessionStorage.setItem('managerDept', currentManagerDept);
            initManagerDashboard();
        }
    } catch (error) { console.error("Error fetching manager info:", error); }
}

function initManagerDashboard() {
    const deptDisplay = document.getElementById('dept-name');
    const lang = localStorage.getItem('preferredLang') || 'ar';
    if(deptDisplay) deptDisplay.innerText = lang === 'ar' ? `قسم: ${currentManagerDept}` : `Dept: ${currentManagerDept}`;
    
    loadRequestsByDept(currentManagerDept);
    startNotificationListener(currentManagerDept);
    
    if (reminderTimer) clearInterval(reminderTimer);
    reminderTimer = setInterval(() => {
        if (pendingCountGlobal > 0) { playSystemSound('remind'); flashBadge(); }
    }, 6000);

    updatePageContent(lang);
}

// --- 3. جلب الطلبات (الفلترة بالقسم) ---
function loadRequestsByDept(deptName) {
    const list = document.getElementById('requests-list');
    const countSpan = document.getElementById('pending-count');
    const lang = localStorage.getItem('preferredLang') || 'ar';

    firebase.firestore().collection("HR_Requests")
        .where("department", "==", deptName)
        .orderBy("submittedAt", "desc")
        .onSnapshot((snapshot) => {
            list.innerHTML = "";
            let pCount = 0;
            
            if (snapshot.empty) {
                list.innerHTML = `<p class="no-data">${lang === 'ar' ? 'لا توجد طلبات حالياً.' : 'No requests found.'}</p>`;
                if(countSpan) countSpan.innerText = "0";
                pendingCountGlobal = 0;
                return;
            }

            snapshot.forEach((doc) => {
                const data = doc.data();
                if(data.status === "Pending") pCount++;

                const attachmentBtn = data.fileBase64 ? `
                    <button onclick="viewFile('${doc.id}')" class="view-file-btn">📎 ${lang === 'ar' ? 'عرض المرفق' : 'View Attachment'}</button>
                    <textarea id="data-${doc.id}" style="display:none;">${data.fileBase64}</textarea>
                ` : "";

                const card = document.createElement('div');
                card.className = `request-card ${data.status.toLowerCase()}`;
                card.innerHTML = `
                    <div class="req-info">
                        <h4>${data.employeeName} <small>#${data.employeeCode}</small></h4>
                        <p><b>${lang === 'ar' ? 'نوع الطلب:' : 'Request Type:'}</b> ${translateType(data.type)}</p>
                        <p><b>${lang === 'ar' ? 'التاريخ:' : 'Date:'}</b> ${data.startDate || data.reqDate}</p>
                        <p><b>${lang === 'ar' ? 'السبب:' : 'Reason:'}</b> ${data.reason}</p>
                        ${data.managerComment ? `<p style="color: #2a5298; background: #e8f4fd; padding: 5px; border-radius: 5px;"><b>${lang === 'ar' ? 'رد الإدارة:' : 'Manager Note:'}</b> ${data.managerComment}</p>` : ""}
                        ${attachmentBtn}
                    </div>
                    <div class="req-actions">
                        ${data.status === "Pending" ? `
                            <button onclick="openActionModal('${doc.id}', 'Approved', '${data.employeeCode}', '${calculateDays(data.startDate, data.endDate)}')" class="approve-btn">${lang === 'ar' ? 'موافقة' : 'Approve'}</button>
                            <button onclick="openActionModal('${doc.id}', 'Rejected')" class="reject-btn">${lang === 'ar' ? 'رفض' : 'Reject'}</button>
                        ` : `<p class="final-status">✅ ${lang === 'ar' ? 'تم الإجراء:' : 'Action Taken:'} ${translateStatus(data.status)}</p>`}
                    </div>
                `;
                list.appendChild(card);
            });
            pendingCountGlobal = pCount;
            if(countSpan) countSpan.innerText = pCount;
        });
}

// --- 4. نظام الملاحظات الجديد ---
function openActionModal(id, status, empCode = null, days = 0) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    currentTargetRequestId = id;
    currentTargetStatus = status;
    currentTargetEmpCode = empCode;
    currentTargetDays = parseInt(days) || 0;

    document.getElementById('actionModal').style.display = "flex";
    document.getElementById('manager-comment').value = "";
    
    if (status === 'Approved') {
        document.getElementById('action-modal-title').innerText = lang === 'ar' ? "تأكيد الموافقة" : "Confirm Approval";
        document.getElementById('confirm-action-btn').style.backgroundColor = "#27ae60";
    } else {
        document.getElementById('action-modal-title').innerText = lang === 'ar' ? "تأكيد الرفض" : "Confirm Rejection";
        document.getElementById('confirm-action-btn').style.backgroundColor = "#e74c3c";
    }
    
    document.getElementById('confirm-action-btn').onclick = processStatusUpdate;
}

function closeActionModal() {
    document.getElementById('actionModal').style.display = "none";
}

async function processStatusUpdate() {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const comment = document.getElementById('manager-comment').value.trim();
    const btn = document.getElementById('confirm-action-btn');
    
    btn.disabled = true;
    btn.innerText = "...";

    try {
        const batch = firebase.firestore().batch();
        const reqRef = firebase.firestore().collection("HR_Requests").doc(currentTargetRequestId);
        
        batch.update(reqRef, { 
            status: currentTargetStatus, 
            managerComment: comment,
            reviewedAt: firebase.firestore.FieldValue.serverTimestamp(),
            reviewerName: currentManagerData.name,
            reviewerCode: currentManagerData.employeeId || currentManagerData.empCode,
            reviewerDept: currentManagerData.department
        });

        if(currentTargetStatus === "Approved" && currentTargetDays > 0) {
            const empRef = firebase.firestore().collection("Employee_Database").doc(currentTargetEmpCode);
            batch.update(empRef, { leaveBalance: firebase.firestore.FieldValue.increment(-currentTargetDays) });
        }

        await batch.commit();
        closeActionModal();
    } catch (e) {
        alert("Error: " + e.message);
    } finally {
        btn.disabled = false;
        btn.innerText = lang === 'ar' ? "تأكيد" : "Confirm";
    }
}

// --- المساعدات ---
function calculateDays(s, e) {
    if(!s || !e) return 0;
    const d1 = new Date(s), d2 = new Date(e);
    return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
}

function viewFile(docId) {
    const data = document.getElementById(`data-${docId}`).value;
    const body = document.getElementById('modal-body-content');
    document.getElementById('fileModal').style.display = "flex";
    if (data.includes("image")) {
        body.innerHTML = `<img src="${data}" style="max-width:100%; border-radius:10px;">`;
    } else {
        body.innerHTML = `<iframe src="${data}" style="width:100%; height:80vh; border:none;"></iframe>`;
    }
}

function closeModal() { document.getElementById('fileModal').style.display = "none"; }

function translateType(t) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const map = { vacation: {ar:"إجازة", en:"Vacation"}, late: {ar:"تأخير", en:"Late Arrival"}, exit: {ar:"خروج", en:"Exit Permit"} };
    return map[t] ? map[t][lang] : t;
}

function translateStatus(s) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const map = { Approved: {ar:"مقبول", en:"Approved"}, Rejected: {ar:"مرفوض", en:"Rejected"}, Pending: {ar:"معلق", en:"Pending"} };
    return map[s] ? map[s][lang] : s;
}

// نظام الترجمة (updatePageContent)
function updatePageContent(lang) {
    const trans = {
        ar: { back: "رجوع", pending: "إجمالي الطلبات المعلقة:", loading: "جاري تحميل الطلبات..." },
        en: { back: "Back", pending: "Total Pending:", loading: "Loading requests..." }
    };
    const t = trans[lang] || trans.ar;
    if(document.getElementById('btn-back')) document.getElementById('btn-back').innerText = t.back;
    if(document.getElementById('txt-pending-label')) document.getElementById('txt-pending-label').innerText = t.pending;
    if(document.getElementById('loading-msg')) document.getElementById('loading-msg').innerText = t.loading;
}

// استماع للإشعارات
function startNotificationListener(dept) {
    firebase.firestore().collection("Notifications")
        .where("targetDept", "==", dept)
        .where("isRead", "==", false)
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    playSystemSound('new');
                    change.doc.ref.update({ isRead: true });
                }
            });
        });
}

function flashBadge() {
    const badge = document.getElementById('pending-count');
    if (badge) {
        badge.style.color = "red";
        setTimeout(() => { badge.style.color = "#2a5298"; }, 800);
    }
}
