let currentManagerDept = sessionStorage.getItem('managerDept') || null;

firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        const managerCode = user.email.split('@')[0];
        if (!currentManagerDept) fetchManagerInfo(managerCode);
        else initManagerDashboard();
    } else { window.location.href = "index.html"; }
});

async function fetchManagerInfo(code) {
    const doc = await firebase.firestore().collection("Employee_Database").doc(code).get();
    if (doc.exists) {
        currentManagerDept = doc.data().department;
        sessionStorage.setItem('managerDept', currentManagerDept);
        initManagerDashboard();
    }
}

function initManagerDashboard() {
    const deptDisplay = document.getElementById('dept-name');
    if(deptDisplay) deptDisplay.innerText = `(${currentManagerDept})`;
    loadRequestsByDept(currentManagerDept);
    startNotificationListener(currentManagerDept);
    if (window.applyLanguage) {
        const currentLang = localStorage.getItem('preferredLang') || 'ar';
        window.applyLanguage(currentLang);
    }
}

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
                    <button onclick="viewFile('${doc.id}')" class="view-file-btn">📎 ${lang === 'ar' ? 'عرض المرفق' : 'View File'}</button>
                    <textarea id="data-${doc.id}" style="display:none;">${data.fileBase64}</textarea>
                ` : "";

                const card = document.createElement('div');
                card.className = `request-card ${data.status.toLowerCase()}`;
                card.innerHTML = `
                    <div class="req-info">
                        <h4>${data.employeeName} <small>#${data.employeeCode}</small></h4>
                        <p><strong>${lang === 'ar' ? 'الطلب:' : 'Request:'}</strong> ${translateType(data.type)}</p>
                        <p><strong>${lang === 'ar' ? 'التاريخ:' : 'Date:'}</strong> ${data.startDate || data.reqDate}</p>
                        <p class="reason-text"><strong>${lang === 'ar' ? 'السبب:' : 'Reason:'}</strong> ${data.reason}</p>
                        ${attachmentBtn}
                    </div>
                    <div class="req-actions">
                        ${data.status === "Pending" ? `
                            <button onclick="updateStatus('${doc.id}', 'Approved', '${data.employeeCode}', '${data.days || 0}')" class="approve-btn">${lang === 'ar' ? 'موافقة' : 'Approve'}</button>
                            <button onclick="updateStatus('${doc.id}', 'Rejected')" class="reject-btn">${lang === 'ar' ? 'رفض' : 'Reject'}</button>
                        ` : `<p class="final-status">✅ ${data.status}</p>`}
                    </div>
                `;
                list.appendChild(card);
            });
            if(countSpan) countSpan.innerText = pendingCount;
        });
}

async function updateStatus(id, status, empCode, days) {
    if(!confirm("Are you sure?")) return;
    const batch = firebase.firestore().batch();
    batch.update(firebase.firestore().collection("HR_Requests").doc(id), { 
        status: status, reviewedAt: firebase.firestore.FieldValue.serverTimestamp() 
    });
    if(status === "Approved" && days > 0) {
        batch.update(firebase.firestore().collection("Employee_Database").doc(empCode), { 
            leaveBalance: firebase.firestore.FieldValue.increment(-days) 
        });
    }
    await batch.commit();
}

function viewFile(docId) {
    const data = document.getElementById(`data-${docId}`).value;
    const modal = document.getElementById('fileModal');
    modal.style.display = "flex";
    const body = document.getElementById('modal-body-content');
    if (data.includes("image")) body.innerHTML = `<img src="${data}" style="max-width:100%; border-radius:10px;">`;
    else body.innerHTML = `<iframe src="${data}" style="width:100%; height:80vh; border:none;"></iframe>`;
}

function closeModal() { document.getElementById('fileModal').style.display = "none"; }

function translateType(t) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const map = { vacation: {ar:"إجازة", en:"Vacation"}, late: {ar:"إذن تأخير", en:"Late"}, exit: {ar:"خروج", en:"Exit"} };
    return map[t] ? map[t][lang] : t;
}
