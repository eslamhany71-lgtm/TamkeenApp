// manager.js - النسخة الاحترافية الكاملة (تعديل على كود المستخدم)
let currentManagerDept = sessionStorage.getItem('managerDept') || null;

firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        const managerCode = user.email.split('@')[0];
        // نحدث البيانات دائماً للتأكد من الصلاحيات (حتى لو فيه Cache)
        fetchManagerInfo(managerCode);
    } else { 
        window.location.href = "index.html"; 
    }
});

async function fetchManagerInfo(code) {
    try {
        const doc = await firebase.firestore().collection("Employee_Database").doc(code).get();
        if (doc.exists) {
            const freshDept = doc.data().department;
            // إذا تغير القسم أو لم يكن موجوداً، نحدثه فوراً
            currentManagerDept = freshDept;
            sessionStorage.setItem('managerDept', freshDept);
            initManagerDashboard();
        } else {
            console.error("Manager data not found in Database");
        }
    } catch (error) { 
        console.error("Error fetching manager info:", error); 
    }
}

function initManagerDashboard() {
    const deptDisplay = document.getElementById('dept-name');
    if(deptDisplay) deptDisplay.innerText = `(${currentManagerDept})`;
    
    // الأمان: لا نحمل الطلبات إلا إذا كان القسم معروفاً
    if (currentManagerDept) {
        loadRequestsByDept(currentManagerDept);
        startNotificationListener(currentManagerDept);
    }

    // تفعيل اللغات (استدعاء آمن)
    if (typeof applyLanguage === 'function') {
        const currentLang = localStorage.getItem('preferredLang') || 'ar';
        applyLanguage(currentLang);
    }
}

// 1. مراقب الإشعارات اللحظي
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
    
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
    audio.play().catch(()=>{});

    setTimeout(() => { 
        toast.classList.add('fade-out'); 
        setTimeout(() => toast.remove(), 500); 
    }, 4000);
}

// 2. تحميل الطلبات (تم تأكيد فلترة القسم هنا)
function loadRequestsByDept(deptName) {
    const list = document.getElementById('requests-list');
    const countSpan = document.getElementById('pending-count');
    const lang = localStorage.getItem('preferredLang') || 'ar';

    firebase.firestore().collection("HR_Requests")
        .where("department", "==", deptName) // قفل الأمان: القسم فقط
        .orderBy("submittedAt", "desc")
        .onSnapshot((snapshot) => {
            list.innerHTML = "";
            let pendingCount = 0;
            
            if (snapshot.empty) {
                list.innerHTML = `<p class="no-data">${lang === 'ar' ? 'لا توجد طلبات حالياً لقسمك.' : 'No requests for your department.'}</p>`;
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

// 3. تحديث الحالة + خصم الرصيد
async function updateStatus(id, status, empCode, days) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const confirmMsg = lang === 'en' ? "Are you sure?" : "هل أنت متأكد من تنفيذ الإجراء؟";
    
    if(!confirm(confirmMsg)) return;

    try {
        const batch = firebase.firestore().batch();
        const reqRef = firebase.firestore().collection("HR_Requests").doc(id);
        
        batch.update(reqRef, { 
            status: status, 
            reviewedAt: firebase.firestore.FieldValue.serverTimestamp() 
        });

        if(status === "Approved" && days > 0) {
            const empRef = firebase.firestore().collection("Employee_Database").doc(empCode);
            batch.update(empRef, { 
                leaveBalance: firebase.firestore.FieldValue.increment(-days) 
            });
        }

        await batch.commit();
    } catch (e) {
        alert("Error: " + e.message);
    }
}

// 4. عرض المرفقات (Modal)
function viewFile(docId) {
    const data = document.getElementById(`data-${docId}`).value;
    const modal = document.getElementById('fileModal');
    const body = document.getElementById('modal-body-content'); // تأكد من وجود الـ ID ده في الـ HTML
    
    if(!modal || !body) {
        // إذا لم يجد المودال، يفتح في نافذة جديدة (طريقة احتياطية)
        const win = window.open();
        win.document.write(`<iframe src="${data}" frameborder="0" style="width:100%; height:100vh;"></iframe>`);
        return;
    }

    modal.style.display = "flex";
    if (data.includes("image")) {
        body.innerHTML = `<img src="${data}" style="max-width:100%; border-radius:10px; box-shadow:0 0 20px rgba(0,0,0,0.2);">`;
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
    const map = { 
        vacation: {ar:"إجازة", en:"Vacation"}, 
        late: {ar:"إذن تأخير", en:"Late Arrival"}, 
        exit: {ar:"خروج", en:"Exit Permit"} 
    };
    return map[t] ? map[t][lang] : t;
}
