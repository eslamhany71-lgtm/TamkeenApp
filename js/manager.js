// manager.js - المدير (النسخة الاحترافية: فلترة قسم + إشعارات لحظية + مرفقات)

let currentManagerDept = null;

firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        const managerCode = user.email.split('@')[0];
        fetchManagerInfo(managerCode);
    } else { window.location.href = "index.html"; }
});

async function fetchManagerInfo(code) {
    const doc = await firebase.firestore().collection("Employee_Database").doc(code).get();
    if (doc.exists) {
        currentManagerDept = doc.data().department;
        
        const header = document.getElementById('txt-header');
        if (header) header.innerText += ` - ${currentManagerDept}`;

        loadRequestsByDept(currentManagerDept);
        startNotificationListener(currentManagerDept); // بدء مراقبة الإشعارات
    }
}

// 1. مراقب الإشعارات اللحظي (يظهر للمدير وهو فاتح الصفحة)
function startNotificationListener(dept) {
    firebase.firestore().collection("Notifications")
        .where("targetDept", "==", dept)
        .where("isRead", "==", false)
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const notify = change.doc.data();
                    showNotificationToast(notify.message);
                    // تعليم الإشعار كـ "مقروء" فورياً
                    change.doc.ref.update({ isRead: true });
                }
            });
        });
}

function showNotificationToast(msg) {
    const toast = document.createElement('div');
    toast.innerHTML = `🔔 ${msg}`;
    toast.style = "position:fixed; top:20px; right:20px; background:#27ae60; color:white; padding:15px 25px; border-radius:10px; box-shadow:0 5px 15px rgba(0,0,0,0.2); z-index:9999; font-weight:bold; border-right: 5px solid #1e8449; animation: slideIn 0.5s forwards;";
    document.body.appendChild(toast);
    
    // تشغيل صوت تنبيه
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
    audio.play().catch(() => {});

    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 500); }, 4000);
}

// 2. تحميل الطلبات (قسم المدير فقط)
function loadRequestsByDept(deptName) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const list = document.getElementById('requests-list');
    const countSpan = document.getElementById('pending-count');

    firebase.firestore().collection("HR_Requests")
        .where("department", "==", deptName)
        .orderBy("submittedAt", "desc")
        .onSnapshot((snapshot) => {
            list.innerHTML = "";
            let pendingCount = 0;

            if (snapshot.empty) {
                list.innerHTML = "<p style='text-align:center; padding:20px;'>لا توجد طلبات حالياً.</p>";
                if (countSpan) countSpan.innerText = "0";
                return;
            }

            snapshot.forEach((doc) => {
                const data = doc.data();
                if(data.status === "Pending") pendingCount++;

                const attachmentBtn = data.fileBase64 ? `
                    <button onclick="viewFile('${doc.id}')" style="margin-top:10px; background:#3498db; color:white; border:none; padding:8px; border-radius:5px; cursor:pointer; width:100%;">
                        📎 عرض المرفق (إثبات)
                    </button>
                    <div id="data-${doc.id}" style="display:none;">${data.fileBase64}</div>
                ` : "";

                const card = document.createElement('div');
                card.className = `request-card ${data.status.toLowerCase()}`;
                card.innerHTML = `
                    <div class="req-info">
                        <h4>${data.employeeName} <small>#${data.employeeCode}</small></h4>
                        <p><strong>نوع الطلب:</strong> ${translateType(data.type)}</p>
                        <p><strong>التاريخ:</strong> ${data.startDate || data.reqDate}</p>
                        <p><strong>السبب:</strong> ${data.reason}</p>
                        ${attachmentBtn}
                    </div>
                    <div class="req-actions">
                        ${data.status === "Pending" ? `
                            <button onclick="updateStatus('${doc.id}', 'Approved')" class="approve-btn">موافقة</button>
                            <button onclick="updateStatus('${doc.id}', 'Rejected')" class="reject-btn">رفض</button>
                        ` : `<p class="final-status">تمت المراجعة (${data.status})</p>`}
                    </div>
                `;
                list.appendChild(card);
            });
            if (countSpan) countSpan.innerText = pendingCount;
        });
}

function viewFile(docId) {
    const data = document.getElementById(`data-${docId}`).innerText;
    const win = window.open();
    win.document.write(`<html><body style="margin:0;"><iframe src="${data}" frameborder="0" style="width:100%; height:100vh;"></iframe></body></html>`);
}

async function updateStatus(id, status) {
    if(confirm("هل أنت متأكد؟")) {
        await firebase.firestore().collection("HR_Requests").doc(id).update({
            status: status,
            reviewedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
}

function translateType(t) { const map = { vacation: "إجازة", late: "إذن تأخير", exit: "تصريح خروج" }; return map[t] || t; }
