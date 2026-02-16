// manager.js - النسخة الشاملة (Dashboard + Permissions + Notifications + Base64 View)

let currentManagerDept = sessionStorage.getItem('managerDept') || null;

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
    
    // تحميل الداتا والاشعارات بناءً على القسم
    loadRequestsByDept(currentManagerDept);
    startNotificationListener(currentManagerDept);
    
    // تطبيق اللغة
    if (typeof applyLanguage === 'function') {
        applyLanguage(localStorage.getItem('preferredLang') || 'ar');
    }
}

// 3. نظام الإشعارات (لحظي + صوتي + شكلي)
function startNotificationListener(dept) {
    firebase.firestore().collection("Notifications")
        .where("targetDept", "==", dept)
        .where("isRead", "==", false)
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    showNotificationToast(change.doc.data().message);
                    change.doc.ref.update({ isRead: true }); // تعليم كـ مقروء
                }
            });
        });
}

function showNotificationToast(msg) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = "notification-toast";
    toast.innerHTML = `🔔 <b>إشعار جديد</b><p>${msg}</p>`;
    container.appendChild(toast);
    
    // تشغيل الصوت
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
    audio.play().catch(() => console.log("User must interact for sound"));

    setTimeout(() => {
        toast.style.animation = "slideOut 0.5s forwards";
        setTimeout(() => toast.remove(), 500);
    }, 5000);
}

// 4. تحميل الطلبات (الفلترة بالقسم)
function loadRequestsByDept(deptName) {
    const list = document.getElementById('requests-list');
    const countSpan = document.getElementById('pending-count');
    const lang = localStorage.getItem('preferredLang') || 'ar';

    firebase.firestore().collection("HR_Requests")
        .where("department", "==", deptName)
        .orderBy("submittedAt", "desc")
        .onSnapshot((snapshot) => {
            list.innerHTML = "";
            let pendingCount = 0;
            
            if (snapshot.empty) {
                list.innerHTML = `<p class="no-data">${lang === 'ar' ? 'لا توجد طلبات حالياً.' : 'No requests found.'}</p>`;
                if(countSpan) countSpan.innerText = "0";
                return;
            }

            snapshot.forEach((doc) => {
                const data = doc.data();
                if(data.status === "Pending") pendingCount++;

                const attachmentBtn = data.fileBase64 ? `
                    <button onclick="viewFile('${doc.id}')" class="view-file-btn">
                        📎 <span>${lang === 'ar' ? 'عرض المرفق' : 'View Attachment'}</span>
                    </button>
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
            if(countSpan) countSpan.innerText = pendingCount;
        });
}

// 5. تحديث الحالة وخصم الرصيد
async function updateStatus(id, status, empCode, days) {
    if(!confirm("هل أنت متأكد؟")) return;
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

// 6. عرض المرفقات (Modal)
function viewFile(docId) {
    const data = document.getElementById(`data-${docId}`).value;
    const modal = document.getElementById('fileModal');
    const body = document.getElementById('modal-body-content');
    
    if(!modal || !body) {
        window.open().document.write(`<iframe src="${data}" style="width:100%;height:100%;"></iframe>`);
        return;
    }

    modal.style.display = "flex";
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

function translateType(t) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const map = { vacation: {ar:"إجازة", en:"Vacation"}, late: {ar:"تأخير", en:"Late"}, exit: {ar:"خروج", en:"Exit"} };
    return map[t] ? map[t][lang] : t;
}
