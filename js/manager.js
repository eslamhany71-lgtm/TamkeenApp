const db = firebase.firestore();

// 1. دالة سحب الطلبات وعرضها
function loadRequests() {
    // بنسحب من جدول HR_Requests وبنرتبهم من الأحدث للأقدم
    db.collection("HR_Requests").orderBy("submittedAt", "desc").onSnapshot((snapshot) => {
        const list = document.getElementById('requests-list');
        const countSpan = document.getElementById('pending-count');
        let pendingCount = 0;
        
        list.innerHTML = ""; // مسح القائمة عشان نحدثها بالجديد

        if (snapshot.empty) {
            list.innerHTML = "<p>لا توجد طلبات مقدمة حتى الآن.</p>";
            return;
        }

        snapshot.forEach((doc) => {
            const data = doc.data();
            if(data.status === "Pending") pendingCount++;

            // إنشاء كارت لكل طلب
            const card = document.createElement('div');
            card.className = `request-card ${data.status.toLowerCase()}`;
            
            card.innerHTML = `
                <div class="req-info">
                    <h4>${data.employee}</h4>
                    <p><strong>النوع:</strong> ${translateType(data.type)}</p>
                    <p><strong>التاريخ:</strong> ${data.date}</p>
                    <p><strong>السبب:</strong> ${data.reason}</p>
                    <p><strong>الحالة:</strong> <span class="status-label">${data.status}</span></p>
                </div>
                <div class="req-actions">
                    ${data.status === "Pending" ? `
                        <button onclick="updateStatus('${doc.id}', 'Approved')" class="approve-btn">موافقة</button>
                        <button onclick="updateStatus('${doc.id}', 'Rejected')" class="reject-btn">رفض</button>
                    ` : `<p class="final-status">تمت المراجعة</p>`}
                </div>
            `;
            list.appendChild(card);
        });
        
        countSpan.innerText = pendingCount;
    });
}

// 2. دالة تحديث حالة الطلب (موافقة أو رفض)
function updateStatus(requestId, newStatus) {
    if(confirm("هل أنت متأكد من تغيير حالة الطلب؟")) {
        db.collection("HR_Requests").doc(requestId).update({
            status: newStatus
        }).then(() => {
            console.log("تم التحديث بنجاح");
        }).catch((error) => {
            alert("خطأ في التحديث: " + error.message);
        });
    }
}

// دالة مساعدة لترجمة نوع الطلب
function translateType(type) {
    const types = { vacation: "إجازة", late: "إذن تأخير", exit: "تصريح خروج" };
    return types[type] || type;
}

// 3. نظام اللغة لصفحة المدير
function updatePageContent(lang) {
    const translations = {
        ar: { title: "لوحة تحكم المدير", header: "مراجعة طلبات الموظفين", back: "رجوع", total: "الطلبات المعلقة: " },
        en: { title: "Manager Dashboard", header: "Review Employee Requests", back: "Back", total: "Pending Requests: " }
    };
    const t = translations[lang];
    document.getElementById('txt-title').innerText = t.title;
    document.getElementById('txt-header').innerText = t.header;
    document.getElementById('btn-back').innerText = t.back;
    document.getElementById('txt-total-requests').firstChild.textContent = t.total;
}

// تشغيل السحب عند فتح الصفحة
window.onload = () => {
    loadRequests();
};
