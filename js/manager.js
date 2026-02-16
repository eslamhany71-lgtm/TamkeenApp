// manager.js - النسخة الشاملة (Dashboard + Smart Reminder + Notifications)

let currentManagerDept = sessionStorage.getItem('managerDept') || null;
let pendingCountGlobal = 0; // لمراقبة الطلبات المعلقة عالمياً
let reminderTimer = null;   // دورة التذكير

// 1. مراقب حالة الدخول وجلب بيانات المدير
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
            currentManagerDept = doc.data().department;
            sessionStorage.setItem('managerDept', currentManagerDept);
            initManagerDashboard();
        }
    } catch (error) { 
        console.error("Error fetching manager info:", error); 
    }
}

// 2. تشغيل لوحة التحكم
function initManagerDashboard() {
    const deptDisplay = document.getElementById('dept-name');
    if(deptDisplay) deptDisplay.innerText = `(${currentManagerDept})`;
    
    loadRequestsByDept(currentManagerDept);
    startNotificationListener(currentManagerDept);
    
    // بدء دورة التذكير الذكية (كل 10 ثوانٍ)
    startReminderLoop();

    if (typeof applyLanguage === 'function') {
        applyLanguage(localStorage.getItem('preferredLang') || 'ar');
    }
}

// 3. نظام الإشعارات اللحظية
function startNotificationListener(dept) {
    firebase.firestore().collection("Notifications")
        .where("targetDept", "==", dept)
        .where("isRead", "==", false)
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    showNotificationToast(change.doc.data().message);
                    change.doc.ref.update({ isRead: true });
                }
            });
        });
}

// 4. نظام التذكير (كل 10 ثوانٍ طالما يوجد طلبات معلقة)
function startReminderLoop() {
    if (reminderTimer) clearInterval(reminderTimer);
    
    reminderTimer = setInterval(() => {
        if (pendingCountGlobal > 0) {
            console.log("Reminder: You have " + pendingCountGlobal + " pending requests!");
            playReminderSound();
            flashUI();
        }
    }, 10000); // تذكير كل 10 ثوانٍ
}

function playReminderSound() {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2857/2857-preview.mp3');
    audio.volume = 0.4; // صوت هادئ للتذكير
    audio.play().catch(() => {});
}

function flashUI() {
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

function showNotificationToast(msg) {
    let container = document.getElementById('toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = "notification-toast";
    toast.innerHTML = `🔔 <b>إشعار جديد</b><p>${msg}</p>`;
    container.appendChild(toast);
    
    // صوت إشعار قوي للوصول لأول مرة
    new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3').play().catch(()=>{});

    setTimeout(() => {
        toast.style.animation = "slideOut 0.5s forwards";
        setTimeout(() => toast.remove(), 500);
    }, 5000);
}

function createToastContainer() {
    const c = document.createElement('div');
    c.id = 'toast-container';
    document.body.appendChild(c);
    return c;
}

// 5. تحميل الطلبات (الفلترة بالقسم وتحديث العداد)
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
            
            snapshot.forEach((doc) => {
                const data = doc.data();
                if(data.status === "Pending") pCount++;

                const attachmentBtn = data.fileBase64 ? `
                    <button onclick="viewFile('${doc.id}')" class="view-file-btn">📎 عرض المرفق</button>
                    <textarea id="data-${doc.id}" style="display:none;">${data.fileBase64}</textarea>
                ` : "";

                const card = document.createElement('div');
                card.className = `request-card ${data.status.toLowerCase()}`;
                card.innerHTML = `
                    <div class="req-info">
                        <h4>${data.employeeName} <small>#${data.employeeCode}</small></h4>
                        <p><strong>الطلب:</strong> ${translateType(data.type)}</p>
                        <p><strong>التاريخ:</strong> ${data.startDate || data.reqDate}</p>
                        <p><strong>السبب:</strong> ${data.reason}</p>
                        ${attachmentBtn}
                    </div>
                    <div class="req-actions">
                        ${data.status === "Pending" ? `
                            <button onclick="updateStatus('${doc.id}', 'Approved', '${data.employeeCode}', '${data.days || 0}')" class="approve-btn">موافقة</button>
                            <button onclick="updateStatus('${doc.id}', 'Rejected')" class="reject-btn">رفض</button>
                        ` : `<p class="final-status">✅ ${data.status}</p>`}
                    </div>
                `;
                list.appendChild(card);
            });
            // تحديث العداد العالمي لإيقاف/تشغيل التذكير
            pendingCountGlobal = pCount;
            if(countSpan) countSpan.innerText = pCount;
        });
}

// 6. تحديث الحالة وخصم الرصيد
async function updateStatus(id, status, empCode, days) {
    if(!confirm("تأكيد العملية؟")) return;
    try {
        const batch = firebase.firestore().batch();
        const reqRef = firebase.firestore().collection("HR_Requests").doc(id);
        batch.update(reqRef, { status: status, reviewedAt: firebase.firestore.FieldValue.serverTimestamp() });

        if(status === "Approved" && days > 0) {
            const empRef = firebase.firestore().collection("Employee_Database").doc(empCode);
            batch.update(empRef, { leaveBalance: firebase.firestore.FieldValue.increment(-days) });
        }
        await batch.commit();
    } catch (e) { alert("Error: " + e.message); }
}

// 7. عرض المرفقات (Modal)
function viewFile(docId) {
    const data = document.getElementById(`data-${docId}`).value;
    const modal = document.getElementById('fileModal');
    const body = document.getElementById('modal-body-content');
    modal.style.display = "flex";
    if (data.includes("image")) body.innerHTML = `<img src="${data}" style="max-width:100%;">`;
    else body.innerHTML = `<iframe src="${data}" style="width:100%; height:80vh; border:none;"></iframe>`;
}

function closeModal() { document.getElementById('fileModal').style.display = "none"; }

function translateType(t) {
    const map = { vacation: "إجازة", late: "تأخير", exit: "خروج" };
    return map[t] || t;
}
