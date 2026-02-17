// manager.js - النسخة الاحترافية الشاملة (Dashboard + Permissions + Smart Reminder + Reviewer Link + System Notifications)

let currentManagerDept = sessionStorage.getItem('managerDept') || null;
let currentManagerData = null; // مخزن بيانات المدير (اسم، كود، قسم)
let pendingCountGlobal = 0;
let reminderTimer = null;

// متغيرات مساعدة للمودال الجديد
let currentTargetRequestId = null;
let currentTargetStatus = null;
let currentTargetEmpCode = null;
let currentTargetDays = 0;

// --- 1. نظام التنبيهات الخارجية (System Notifications) ---
function sendSystemNotification(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, {
            body: body,
            icon: "https://cdn-icons-png.flaticon.com/512/1827/1827347.png"
        });
    }
}

// --- 2. نظام الصوت الذكي (توليد نغمة لمنع حظر الأنتي فيرس) ---
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
    } catch (e) { console.log("Audio logic failed - user interaction needed"); }
}

// --- 3. التحقق من الصلاحيات والبيانات ---
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        const managerCode = user.email.split('@')[0];
        fetchManagerInfo(managerCode);
    } else { 
        window.location.href = "index.html"; 
    }
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
    
    if(deptDisplay) {
        deptDisplay.innerText = lang === 'ar' ? `قسم: ${currentManagerDept}` : `Dept: ${currentManagerDept}`;
    }
    
    loadRequestsByDept(currentManagerDept);
    startNotificationListener(currentManagerDept);
    
    if (reminderTimer) clearInterval(reminderTimer);
    reminderTimer = setInterval(() => {
        if (pendingCountGlobal > 0) {
            playSystemSound('remind');
            flashBadge();
        }
    }, 6000);

    updatePageContent(lang);
}

// --- 4. الإشعارات اللحظية (دمج التنبيه الخارجي) ---
function startNotificationListener(dept) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    firebase.firestore().collection("Notifications")
        .where("targetDept", "==", dept)
        .where("isRead", "==", false)
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const msg = change.doc.data().message;
                    showToast(msg);
                    playSystemSound('new');
                    // تنبيه النظام الخارجي
                    sendSystemNotification(lang === 'ar' ? "طلب جديد - تمكين" : "New Request - Tamkeen", msg);
                    change.doc.ref.update({ isRead: true });
                }
            });
        });
}

function showToast(msg) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    let container = document.getElementById('toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = "notification-toast";
    toast.innerHTML = `🔔 <b>${lang === 'ar' ? 'إشعار جديد' : 'New Notification'}</b><p>${msg}</p>`;
    container.appendChild(toast);
    setTimeout(() => { 
        toast.style.opacity = '0'; 
        setTimeout(() => toast.remove(), 500); 
    }, 5000);
}

function createToastContainer() {
    const c = document.createElement('div');
    c.id = 'toast-container';
    document.body.appendChild(c);
    return c;
}

function flashBadge() {
    const badge = document.getElementById('pending-count');
    if (badge) {
        badge.style.transition = "0.3s";
        badge.style.color = "red";
        badge.style.transform = "scale(1.4)";
        setTimeout(() => { 
            badge.style.color = "#2a5298"; 
            badge.style.transform = "scale(1)"; 
        }, 800);
    }
}

// --- 5. جلب الطلبات (الفلترة بالقسم) ---
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
                        ${data.managerComment ? `<p style="color: #2a5298; background: #e8f4fd; padding: 10px; border-radius: 8px; font-size: 13px;"><b>${lang === 'ar' ? 'ملاحظتك:' : 'Your Note:'}</b> ${data.managerComment}</p>` : ""}
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

// --- 6. نظام اتخاذ الإجراء مع التعليق ---
function openActionModal(id, status, empCode = null, days = 0) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    currentTargetRequestId = id;
    currentTargetStatus = status;
    currentTargetEmpCode = empCode;
    currentTargetDays = parseInt(days) || 0;

    const modal = document.getElementById('actionModal');
    if (modal) {
        modal.style.display = "flex";
        document.getElementById('manager-comment').value = "";
        document.getElementById('action-modal-title').innerText = status === 'Approved' ? (lang === 'ar' ? "تأكيد الموافقة" : "Confirm Approval") : (lang === 'ar' ? "تأكيد الرفض" : "Confirm Rejection");
        document.getElementById('confirm-action-btn').style.backgroundColor = status === 'Approved' ? "#27ae60" : "#e74c3c";
        document.getElementById('confirm-action-btn').onclick = processStatusUpdate;
    }
}

function closeActionModal() {
    document.getElementById('actionModal').style.display = "none";
}

async function processStatusUpdate() {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const comment = document.getElementById('manager-comment').value.trim();
    const btn = document.getElementById('confirm-action-btn');
    
    if (!currentManagerData) return;
    btn.disabled = true;

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
    } catch (e) { alert("Error: " + e.message); }
    finally { btn.disabled = false; }
}

// --- 7. المرفقات والمساعدة ---
function viewFile(docId) {
    const data = document.getElementById(`data-${docId}`).value;
    const body = document.getElementById('modal-body-content');
    if(!body) return;
    document.getElementById('fileModal').style.display = "flex";
    if (data.includes("image")) {
        body.innerHTML = `<img src="${data}" style="max-width:100%; border-radius:10px;">`;
    } else {
        body.innerHTML = `<iframe src="${data}" style="width:100%; height:80vh; border:none;"></iframe>`;
    }
}

function closeModal() {
    const modal = document.getElementById('fileModal');
    if(modal) modal.style.display = "none";
}

function calculateDays(s, e) { 
    if(!s || !e) return 0;
    const d1 = new Date(s), d2 = new Date(e); 
    return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24)) + 1; 
}

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

function updatePageContent(lang) {
    const trans = {
        ar: { back: "رجوع", pending: "إجمالي الطلبات المعلقة:", loading: "جاري تحميل الطلبات..." },
        en: { back: "Back", pending: "Total Pending Requests:", loading: "Loading requests..." }
    };
    const t = trans[lang] || trans.ar;
    if(document.getElementById('btn-back')) document.getElementById('btn-back').innerText = t.back;
    if(document.getElementById('txt-pending-label')) document.getElementById('txt-pending-label').innerText = t.pending;
    if(document.getElementById('loading-msg')) document.getElementById('loading-msg').innerText = t.loading;
}
