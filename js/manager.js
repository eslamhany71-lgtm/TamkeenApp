// manager.js - لوحة تحكم المدير (عرض المرفقات بنظام Base64 المجاني)

let currentManagerDept = null;

// 1. التأكد من هوية المدير وقسمه عند تحميل الصفحة
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        const managerCode = user.email.split('@')[0];
        fetchManagerInfo(managerCode);
    } else {
        window.location.href = "index.html";
    }
});

// 2. جلب بيانات المدير لمعرفة القسم المسؤول عنه
async function fetchManagerInfo(code) {
    try {
        const doc = await firebase.firestore().collection("Employee_Database").doc(code).get();
        if (doc.exists) {
            const data = doc.data();
            currentManagerDept = data.department;
            
            const headerTag = document.getElementById('txt-header');
            if (headerTag) {
                const lang = localStorage.getItem('preferredLang') || 'ar';
                headerTag.innerText += ` - ${currentManagerDept}`;
            }

            loadRequestsByDept(currentManagerDept);
        } else {
            document.getElementById('requests-list').innerHTML = "<p>خطأ: لم يتم تحديد قسم لهذا الحساب.</p>";
        }
    } catch (error) { console.error(error); }
}

// 3. سحب الطلبات الخاصة بقسم المدير فقط وعرض المرفقات
function loadRequestsByDept(deptName) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const list = document.getElementById('requests-list');
    const countSpan = document.getElementById('pending-count');

    firebase.firestore().collection("HR_Requests")
        .where("department", "==", deptName)
        .orderBy("submittedAt", "desc")
        .onSnapshot((snapshot) => {
            if (!list) return;
            list.innerHTML = ""; 
            let pendingCount = 0;

            if (snapshot.empty) {
                list.innerHTML = lang === 'ar' ? "<p>لا توجد طلبات مقدمة لقسمك.</p>" : "<p>No requests for your dept.</p>";
                if (countSpan) countSpan.innerText = "0";
                return;
            }

            snapshot.forEach((doc) => {
                const data = doc.data();
                if(data.status === "Pending") pendingCount++;

                // منطق عرض زر المرفق
                const attachmentBtn = data.fileBase64 ? `
                    <button onclick="viewFile('${doc.id}')" class="view-file-btn" style="margin-top:10px; background:#3498db; color:white; border:none; padding:8px; border-radius:5px; cursor:pointer; width:100%; font-weight:bold;">
                        📎 ${lang === 'ar' ? 'عرض المرفق (إثبات)' : 'View Attachment'}
                    </button>
                    <div id="data-${doc.id}" style="display:none;">${data.fileBase64}</div>
                ` : "";

                const card = document.createElement('div');
                card.className = `request-card ${data.status.toLowerCase()}`;
                card.innerHTML = `
                    <div class="req-info">
                        <h4>${data.employeeName} <small>#${data.employeeCode}</small></h4>
                        <p><strong>نوع الطلب:</strong> ${translateType(data.type, lang)} ${data.vacationType ? '('+data.vacationType+')' : ''}</p>
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

// 4. دالة عرض الملف في نافذة جديدة
function viewFile(docId) {
    const base64Data = document.getElementById(`data-${docId}`).innerText;
    const newWindow = window.open();
    newWindow.document.write(`
        <html>
            <title>معاينة المرفق - تمكين</title>
            <body style="margin:0; background:#333; display:flex; justify-content:center; align-items:center;">
                <iframe src="${base64Data}" frameborder="0" style="width:100%; height:100vh;" allowfullscreen></iframe>
            </body>
        </html>
    `);
}

async function updateStatus(requestId, newStatus) {
    if(confirm("هل أنت متأكد؟")) {
        await firebase.firestore().collection("HR_Requests").doc(requestId).update({
            status: newStatus,
            reviewedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
}

function translateType(type, lang) {
    const types = { vacation: lang === 'ar' ? "إجازة" : "Vacation", late: lang === 'ar' ? "إذن تأخير" : "Late Perm.", exit: lang === 'ar' ? "تصريح خروج" : "Exit Permit" };
    return types[type] || type;
}

window.onload = () => {
    const savedLang = localStorage.getItem('preferredLang') || 'ar';
    if(typeof updateManagerPageContent === 'function') updateManagerPageContent(savedLang);
};
