// manager.js - النسخة الاحترافية 2.0
let currentManagerDept = sessionStorage.getItem('managerDept') || null;

firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        const managerCode = user.email.split('@')[0];
        if (!currentManagerDept) {
            fetchManagerInfo(managerCode);
        } else {
            initManagerDashboard();
        }
    } else { window.location.href = "index.html"; }
});

async function fetchManagerInfo(code) {
    try {
        const doc = await firebase.firestore().collection("Employee_Database").doc(code).get();
        if (doc.exists) {
            currentManagerDept = doc.data().department;
            sessionStorage.setItem('managerDept', currentManagerDept);
            initManagerDashboard();
        }
    } catch (error) { console.error("Error fetching manager info:", error); }
}

function initManagerDashboard() {
    document.getElementById('dept-name').innerText = `(${currentManagerDept})`;
    loadRequestsByDept(currentManagerDept);
    startNotificationListener(currentManagerDept);
    // تفعيل اللغات عند بدء التحميل
    if (window.applyLanguage) window.applyLanguage(); 
}

// 1. مراقب الإشعارات اللحظي مع صوت تنبيه
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

function showNotificationToast(msg) {
    const toast = document.createElement('div');
    toast.className = "notification-toast";
    toast.innerHTML = `🔔 ${msg}`;
    document.body.appendChild(toast);
    
    new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3').play().catch(()=>{});
    setTimeout(() => { toast.classList.add('fade-out'); setTimeout(() => toast.remove(), 500); }, 4000);
}

// 2. تحميل الطلبات مع دعم اللغات
function loadRequestsByDept(deptName) {
    const list = document.getElementById('requests-list');
    const countSpan = document.getElementById('pending-count');

    firebase.firestore().collection("HR_Requests")
        .where("department", "==", deptName)
        .orderBy("submittedAt", "desc")
        .onSnapshot((snapshot) => {
            list.innerHTML = "";
            let pendingCount = 0;

            if (snapshot.empty) {
                list.innerHTML = `<p class="no-data" data-i18n="no_requests">لا توجد طلبات حالياً لموظفي قسم ${deptName}</p>`;
                countSpan.innerText = "0";
                return;
            }

            snapshot.forEach((doc) => {
                const data = doc.data();
                if(data.status === "Pending") pendingCount++;

                const attachmentBtn = data.fileBase64 ? `
                    <button onclick="viewFile('${doc.id}')" class="view-file-btn">
                        📎 <span data-i18n="view_attachment">عرض المرفق</span>
                    </button>
                    <textarea id="data-${doc.id}" style="display:none;">${data.fileBase64}</textarea>
                ` : "";

                const card = document.createElement('div');
                card.className = `request-card ${data.status.toLowerCase()}`;
                card.innerHTML = `
                    <div class="req-info">
                        <h4>${data.employeeName} <small>#${data.employeeCode}</small></h4>
                        <p><strong><span data-i18n="req_type">الطلب:</span></strong> ${translateType(data.type)}</p>
                        <p><strong><span data-i18n="req_date">التاريخ:</span></strong> ${data.startDate || data.reqDate}</p>
                        <p class="reason-text"><strong><span data-i18n="reason">السبب:</span></strong> ${data.reason}</p>
                        ${attachmentBtn}
                    </div>
                    <div class="req-actions">
                        ${data.status === "Pending" ? `
                            <button onclick="updateStatus('${doc.id}', 'Approved', '${data.employeeCode}', '${data.days || 0}')" class="approve-btn" data-i18n="approve">موافقة</button>
                            <button onclick="updateStatus('${doc.id}', 'Rejected')" class="reject-btn" data-i18n="reject">رفض</button>
                        ` : `<p class="final-status">✅ <span data-i18n="${data.status.toLowerCase()}">${data.status}</span></p>`}
                    </div>
                `;
                list.appendChild(card);
            });
            countSpan.innerText = pendingCount;
            if (window.applyLanguage) window.applyLanguage(); 
        });
}

// 3. تحديث الحالة مع خصم الرصيد (للموافقة فقط)
async function updateStatus(id, status, empCode, days) {
    const confirmMsg = localStorage.getItem('preferredLang') === 'en' ? "Are you sure?" : "هل أنت متأكد؟";
    if(!confirm(confirmMsg)) return;

    const batch = firebase.firestore().batch();
    const reqRef = firebase.firestore().collection("HR_Requests").doc(id);
    
    batch.update(reqRef, { 
        status: status, 
        reviewedAt: firebase.firestore.FieldValue.serverTimestamp() 
    });

    // إذا تمت الموافقة، يتم خصم الإجازة تلقائياً من الموظف
    if(status === "Approved" && days > 0) {
        const empRef = firebase.firestore().collection("Employee_Database").doc(empCode);
        batch.update(empRef, { 
            leaveBalance: firebase.firestore.FieldValue.increment(-days) 
        });
    }

    try {
        await batch.commit();
    } catch (e) { alert("Error: " + e.message); }
}

// 4. عرض الملفات الاحترافي (Base64)
function viewFile(docId) {
    const base64Data = document.getElementById(`data-${docId}`).value;
    const modal = document.getElementById('fileModal');
    const img = document.getElementById('modalImg');
    const iframe = document.getElementById('modalIframe');

    modal.style.display = "block";
    
    if (base64Data.includes("image")) {
        img.src = base64Data;
        img.style.display = "block";
        iframe.style.display = "none";
    } else {
        iframe.src = base64Data;
        iframe.style.display = "block";
        img.style.display = "none";
    }
}

function closeModal() { document.getElementById('fileModal').style.display = "none"; }

function translateType(t) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const map = {
        vacation: { ar: "إجازة", en: "Vacation" },
        late: { ar: "إذن تأخير", en: "Late Arrival" },
        exit: { ar: "تصريح خروج", en: "Exit Permit" }
    };
    return map[t] ? map[t][lang] : t;
}
