// manager.js - النسخة الاحترافية الشاملة (Dashboard + Permissions + Smart Reminder + Reviewer Link)

let currentManagerDept = sessionStorage.getItem('managerDept') || null;
let currentManagerData = null; // مخزن بيانات المدير (اسم، كود، قسم)
let pendingCountGlobal = 0;
let reminderTimer = null;

// --- 1. نظام الصوت الذكي (توليد نغمة لمنع حظر الأنتي فيرس) ---
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

// --- 2. التحقق من الصلاحيات والبيانات ---
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
            currentManagerData = doc.data(); // حفظ بيانات المدير بالكامل
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
    
    // تشغيل التذكير كل 6 ثوانٍ
    if (reminderTimer) clearInterval(reminderTimer);
    reminderTimer = setInterval(() => {
        if (pendingCountGlobal > 0) {
            playSystemSound('remind');
            flashBadge();
        }
    }, 6000);

    if (typeof applyLanguage === 'function') {
        applyLanguage(lang);
    }
}

// --- 3. الإشعارات اللحظية ---
function startNotificationListener(dept) {
    firebase.firestore().collection("Notifications")
        .where("targetDept", "==", dept)
        .where("isRead", "==", false)
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    showToast(change.doc.data().message);
                    playSystemSound('new');
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

// --- 4. جلب الطلبات (الفلترة بالقسم) ---
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
                        ${attachmentBtn}
                    </div>
                    <div class="req-actions">
                        ${data.status === "Pending" ? `
                            <button onclick="updateStatus('${doc.id}', 'Approved', '${data.employeeCode}', '${data.days || 0}')" class="approve-btn">${lang === 'ar' ? 'موافقة' : 'Approve'}</button>
                            <button onclick="updateStatus('${doc.id}', 'Rejected')" class="reject-btn">${lang === 'ar' ? 'رفض' : 'Reject'}</button>
                        ` : `<p class="final-status">✅ ${lang === 'ar' ? 'تم الإجراء:' : 'Action Taken:'} ${data.status}</p>`}
                    </div>
                `;
                list.appendChild(card);
            });
            pendingCountGlobal = pCount;
            if(countSpan) countSpan.innerText = pCount;
        });
}

// --- 5. تحديث الحالة مع إرسال بيانات المدير لجدول الـ HR ---
async function updateStatus(id, status, empCode, days) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const confirmMsg = lang === 'en' ? "Confirm action?" : "تأكيد الإجراء؟";
    
    if(!confirm(confirmMsg)) return;

    if (!currentManagerData) {
        alert(lang === 'ar' ? "خطأ: بيانات المدير لم تتحمل بعد" : "Error: Manager data not loaded");
        return;
    }

    try {
        const batch = firebase.firestore().batch();
        const reqRef = firebase.firestore().collection("HR_Requests").doc(id);
        
        // إرسال بيانات المدير (المراجع) كاملة لكي تظهر في صفحة الـ HR
        batch.update(reqRef, { 
            status: status, 
            reviewedAt: firebase.firestore.FieldValue.serverTimestamp(),
            reviewerName: currentManagerData.name,                  // اسم المدير
            reviewerCode: currentManagerData.employeeId || currentManagerData.empCode, // كود المدير
            reviewerDept: currentManagerData.department             // قسم المدير
        });

        // خصم الرصيد في حالة الموافقة
        if(status === "Approved" && days > 0) {
            const empRef = firebase.firestore().collection("Employee_Database").doc(empCode);
            batch.update(empRef, { leaveBalance: firebase.firestore.FieldValue.increment(-days) });
        }

        await batch.commit();
        alert(lang === 'ar' ? "تم تحديث الطلب بنجاح" : "Request updated successfully");
    } catch (e) { 
        alert("Error: " + e.message); 
    }
}

// --- 6. المرفقات والمساعدة ---
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

function translateType(t) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const map = { 
        vacation: {ar:"إجازة", en:"Vacation"}, 
        late: {ar:"تأخير", en:"Late Arrival"}, 
        exit: {ar:"خروج", en:"Exit Permit"} 
    };
    return map[t] ? map[t][lang] : t;
}
