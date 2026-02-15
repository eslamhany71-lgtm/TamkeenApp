// manager.js - لوحة تحكم المدير (نظام الربط بالأقسام)

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
            
            // تحديث واجهة المستخدم باسم القسم
            const headerTag = document.getElementById('txt-header');
            if (headerTag) {
                const lang = localStorage.getItem('preferredLang') || 'ar';
                headerTag.innerText += ` - ${currentManagerDept}`;
            }

            // تحميل الطلبات بناءً على القسم
            loadRequestsByDept(currentManagerDept);
        } else {
            console.error("بيانات المدير غير موجودة!");
            document.getElementById('requests-list').innerHTML = "<p>خطأ: لم يتم تحديد قسم لهذا الحساب.</p>";
        }
    } catch (error) {
        console.error("Error fetching manager info:", error);
    }
}

// 3. سحب الطلبات الخاصة بقسم المدير فقط
function loadRequestsByDept(deptName) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const list = document.getElementById('requests-list');
    const countSpan = document.getElementById('pending-count');

    // كويري الفلترة بالقسم
    firebase.firestore().collection("HR_Requests")
        .where("department", "==", deptName)
        .orderBy("submittedAt", "desc")
        .onSnapshot((snapshot) => {
            
            if (!list) return;
            list.innerHTML = ""; 
            let pendingCount = 0;

            if (snapshot.empty) {
                list.innerHTML = lang === 'ar' ? 
                    "<p class='no-data'>لا توجد طلبات مقدمة لقسمك حتى الآن.</p>" : 
                    "<p class='no-data'>No requests submitted for your department yet.</p>";
                if (countSpan) countSpan.innerText = "0";
                return;
            }

            snapshot.forEach((doc) => {
                const data = doc.data();
                if(data.status === "Pending") pendingCount++;

                const displayDate = data.startDate || data.reqDate || "--";
                const displayEndDate = data.endDate ? ` إلى ${data.endDate}` : "";
                const requestTypeTranslated = translateType(data.type, lang);

                const card = document.createElement('div');
                card.className = `request-card ${data.status.toLowerCase()}`;
                
                card.innerHTML = `
                    <div class="req-info">
                        <div class="req-header">
                            <h4>${data.employeeName || "Unknown"} <small>#${data.employeeCode || ""}</small></h4>
                            <span class="status-badge ${data.status.toLowerCase()}">${data.status}</span>
                        </div>
                        <div class="req-body">
                            <p><strong>${lang === 'ar' ? 'الوظيفة:' : 'Job Title:'}</strong> ${data.jobTitle || "--"}</p>
                            <p><strong>${lang === 'ar' ? 'نوع الطلب:' : 'Request Type:'}</strong> ${requestTypeTranslated} ${data.vacationType ? `(${data.vacationType})` : ""}</p>
                            <p><strong>${lang === 'ar' ? 'التاريخ:' : 'Date:'}</strong> ${displayDate}${displayEndDate}</p>
                            <p><strong>${lang === 'ar' ? 'السبب:' : 'Reason:'}</strong> ${data.reason || "--"}</p>
                        </div>
                    </div>
                    <div class="req-actions">
                        ${data.status === "Pending" ? `
                            <button onclick="updateStatus('${doc.id}', 'Approved')" class="approve-btn">${lang === 'ar' ? 'موافقة' : 'Approve'}</button>
                            <button onclick="updateStatus('${doc.id}', 'Rejected')" class="reject-btn">${lang === 'ar' ? 'رفض' : 'Reject'}</button>
                        ` : `
                            <p class="final-status">${lang === 'ar' ? 'تمت المراجعة' : 'Reviewed'}</p>
                        `}
                    </div>
                `;
                list.appendChild(card);
            });
            
            if (countSpan) countSpan.innerText = pendingCount;
        });
}

// 4. تحديث حالة الطلب (موافقة / رفض)
async function updateStatus(requestId, newStatus) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const confirmMsg = lang === 'ar' ? "هل أنت متأكد من اتخاذ هذا الإجراء؟" : "Are you sure you want to take this action?";
    
    if(confirm(confirmMsg)) {
        try {
            await firebase.firestore().collection("HR_Requests").doc(requestId).update({
                status: newStatus,
                reviewedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            alert("Error: " + error.message);
        }
    }
}

// 5. ترجمة الأنواع
function translateType(type, lang) {
    const types = {
        vacation: lang === 'ar' ? "إجازة" : "Vacation",
        late: lang === 'ar' ? "إذن تأخير" : "Late Permission",
        exit: lang === 'ar' ? "تصريح خروج" : "Exit Permit"
    };
    return types[type] || type;
}

// 6. نظام اللغة (تحديث النصوص الثابتة)
function updateManagerPageContent(lang) {
    const translations = {
        ar: {
            header: "مراجعة طلبات القسم",
            back: "رجوع",
            total: "إجمالي الطلبات المعلقة: ",
            loading: "جاري تحميل الطلبات..."
        },
        en: {
            header: "Department Requests Review",
            back: "Back",
            total: "Total Pending Requests: ",
            loading: "Loading requests..."
        }
    };
    const t = translations[lang];
    if (document.getElementById('txt-header')) document.getElementById('txt-header').innerText = t.header;
    if (document.getElementById('btn-back')) document.getElementById('btn-back').innerText = t.back;
    if (document.getElementById('txt-total-requests')) {
        document.getElementById('txt-total-requests').firstChild.textContent = t.total;
    }
}

window.onload = () => {
    const savedLang = localStorage.getItem('preferredLang') || 'ar';
    updateManagerPageContent(savedLang);
};
