// 1. دالة سحب الطلبات وعرضها بالتفاصيل الجديدة
function loadRequests() {
    firebase.firestore().collection("HR_Requests").orderBy("submittedAt", "desc").onSnapshot((snapshot) => {
        const list = document.getElementById('requests-list');
        const countSpan = document.getElementById('pending-count');
        if (!list) return;

        let pendingCount = 0;
        list.innerHTML = ""; 

        if (snapshot.empty) {
            list.innerHTML = "<p>لا توجد طلبات مقدمة حتى الآن.</p>";
            return;
        }

        snapshot.forEach((doc) => {
            const data = doc.data();
            if(data.status === "Pending") pendingCount++;

            const displayDate = data.startDate || data.reqDate || "غير محدد";
            const displayEndDate = data.endDate ? ` إلى ${data.endDate}` : "";

            const card = document.createElement('div');
            card.className = `request-card ${data.status.toLowerCase()}`;
            
            card.innerHTML = `
                <div class="req-info">
                    <h4>${data.employeeName || "اسم غير معروف"} <small>(${data.employeeCode || "بدون كود"})</small></h4>
                    <p><strong>الوظيفة/القسم:</strong> ${data.jobTitle || "--"} / ${data.department || "--"}</p>
                    <p><strong>نوع الطلب:</strong> ${data.type} ${data.vacationType ? `(${data.vacationType})` : ""}</p>
                    <p><strong>التاريخ:</strong> ${displayDate}${displayEndDate}</p>
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
        
        if (countSpan) countSpan.innerText = pendingCount;
    });
}

function updateStatus(requestId, newStatus) {
    if(confirm("هل أنت متأكد؟")) {
        firebase.firestore().collection("HR_Requests").doc(requestId).update({
            status: newStatus
        });
    }
}

window.onload = () => { loadRequests(); };
