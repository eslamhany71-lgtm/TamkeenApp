// hr-admin.js - لوحة تحكم الموارد البشرية (الإصدار الاحترافي مع العدادات الذكية)

let allRequests = []; 

// 1. دالة سحب كل طلبات الموظفين من Firestore (تحديث لحظي)
function loadAllRequests() {
    firebase.firestore().collection("HR_Requests").orderBy("submittedAt", "desc").onSnapshot((snapshot) => {
        allRequests = [];
        snapshot.forEach(doc => {
            allRequests.push({ id: doc.id, ...doc.data() });
        });
        // عند التحميل لأول مرة نعرض الكل
        renderTable(allRequests);
    });
}

// 2. دالة رسم الجدول وتحديث العدادات (إجمالي / موافق عليه)
function renderTable(dataArray) {
    const tableBody = document.getElementById('hr-requests-table');
    const totalCountEl = document.getElementById('total-count');
    const approvedCountEl = document.getElementById('approved-count');

    if (!tableBody) return;
    tableBody.innerHTML = ""; 

    let total = 0;
    let approved = 0;

    // إذا كانت المصفوفة فارغة
    if (dataArray.length === 0) {
        tableBody.innerHTML = "<tr><td colspan='7' style='text-align:center;'>لا توجد بيانات متاحة</td></tr>";
        if (totalCountEl) totalCountEl.innerText = "0";
        if (approvedCountEl) approvedCountEl.innerText = "0";
        return;
    }

    dataArray.forEach((data) => {
        // حساب الإحصائيات
        total++;
        if (data.status === "Approved") {
            approved++;
        }

        const dateFrom = data.startDate || data.reqDate || "--";
        
        // أيقونة المرفق (Base64)
        const attachmentIcon = data.fileBase64 ? 
            `<span onclick="viewFileAdmin('${data.id}')" style="cursor:pointer; font-size:1.2em; margin-left:5px; color: #2a5298;" title="عرض المرفق">📎</span>
             <div id="admin-data-${data.id}" style="display:none;">${data.fileBase64}</div>` : "";

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${data.employeeCode || "--"}</td>
            <td><strong>${data.employeeName || "غير معروف"}</strong></td>
            <td>${data.jobTitle || "--"} / <span class="dept-badge" style="background:#e3f2fd; color:#1976d2; padding:2px 8px; border-radius:4px; font-size:0.85em;">${data.department || "--"}</span></td>
            <td>${translateType(data.type)} ${attachmentIcon}</td>
            <td>${dateFrom}</td>
            <td><span class="badge ${(data.status || 'Pending').toLowerCase()}" style="padding: 5px 10px; border-radius: 12px; font-size: 0.8em; font-weight: bold; color: white; background: ${getStatusColor(data.status)}">${data.status || 'Pending'}</span></td>
            <td><button onclick="deleteRequest('${data.id}')" class="delete-btn" style="background:#ff4d4d; color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:4px;">حذف</button></td>
        `;
        tableBody.appendChild(row);
    });

    // تحديث الأرقام في الواجهة (العدادات)
    if (totalCountEl) totalCountEl.innerText = total;
    if (approvedCountEl) approvedCountEl.innerText = approved;
}

// دالة مساعدة لجلب ألوان الحالة
function getStatusColor(status) {
    switch (status) {
        case 'Approved': return '#27ae60'; // أخضر
        case 'Rejected': return '#e74c3c'; // أحمر
        default: return '#f39c12'; // برتقالي للمعلق
    }
}

// 3. دالة عرض المرفق للـ HR (Base64)
function viewFileAdmin(docId) {
    const base64Data = document.getElementById(`admin-data-${docId}`).innerText;
    const newWindow = window.open();
    newWindow.document.write(`
        <html>
            <title>معاينة المرفق</title>
            <body style="margin:0; background:#333;">
                <iframe src="${base64Data}" frameborder="0" style="width:100%; height:100vh;" allowfullscreen></iframe>
            </body>
        </html>
    `);
}

// 4. دالة رفع الموظفين من ملف CSV
function uploadCSV() {
    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];
    if (!file) { alert("يرجى اختيار ملف أولاً"); return; }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const rows = e.target.result.split(/\r?\n/);
            let count = 0;
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i].trim();
                if (!row) continue;
                const cols = row.split(/[;,]/).map(c => c.replace(/["]/g, "").trim());
                if (cols.length >= 5) {
                    firebase.firestore().collection("Employee_Database").doc(cols[0]).set({
                        employeeId: cols[0], name: cols[1], phone: cols[2], role: cols[3].toLowerCase(), department: cols[4], activated: false
                    }, { merge: true });
                    count++;
                }
            }
            alert(`تم رفع وتحديث بيانات ${count} موظف بنجاح!`);
            fileInput.value = "";
        } catch (err) { alert("خطأ في معالجة الملف"); }
    };
    reader.readAsText(file, "UTF-8");
}

// 5. الفلترة الذكية (تحديث العدادات يتم تلقائياً لأننا نستدعي renderTable)
function filterTable() {
    const dateFrom = document.getElementById('filter-date-from').value;
    const dateTo = document.getElementById('filter-date-to').value;
    const typeSearch = document.getElementById('filter-type').value;
    const deptSearch = document.getElementById('filter-dept').value.toLowerCase();

    const filtered = allRequests.filter(req => {
        const reqDate = req.startDate || req.reqDate || "";
        const reqDept = (req.department || "").toLowerCase();
        const reqJob = (req.jobTitle || "").toLowerCase();

        let dateMatch = (!dateFrom || reqDate >= dateFrom) && (!dateTo || reqDate <= dateTo);
        let typeMatch = !typeSearch || req.type === typeSearch;
        let deptMatch = !deptSearch || reqDept.includes(deptSearch) || reqJob.includes(deptSearch);

        return dateMatch && typeMatch && deptMatch;
    });

    renderTable(filtered);
}

// 6. إعادة ضبط الفلاتر
function resetFilters() {
    document.getElementById('filter-date-from').value = "";
    document.getElementById('filter-date-to').value = "";
    document.getElementById('filter-type').value = "";
    document.getElementById('filter-dept').value = "";
    renderTable(allRequests);
}

// 7. حذف طلب
function deleteRequest(id) {
    if(confirm("هل أنت متأكد من حذف هذا السجل نهائياً؟")) {
        firebase.firestore().collection("HR_Requests").doc(id).delete();
    }
}

// 8. ترجمة نوع الطلب
function translateType(type) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const types = {
        vacation: lang === 'ar' ? "إجازة" : "Vacation",
        late: lang === 'ar' ? "إذن تأخير" : "Late Perm.",
        exit: lang === 'ar' ? "تصريح خروج" : "Exit Permit"
    };
    return types[type] || type;
}

// 9. تصدير للـ Excel
function exportToExcel() {
    let csv = "\uFEFF"; 
    csv += "كود الموظف,الاسم,الوظيفة,القسم,نوع الطلب,التاريخ,الحالة\n";
    
    // تصدير البيانات المعروضة حالياً (المفلترة)
    const rows = document.querySelectorAll("#hr-requests-table tr");
    rows.forEach(row => {
        const cols = row.querySelectorAll("td");
        if (cols.length > 1) {
            let rowData = [];
            for (let i = 0; i < 6; i++) {
                rowData.push(cols[i].innerText.replace(/,/g, " "));
            }
            csv += rowData.join(",") + "\n";
        }
    });

    const hiddenElement = document.createElement('a');
    hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
    hiddenElement.target = '_blank';
    hiddenElement.download = `تقرير_الموارد_البشرية_${new Date().toLocaleDateString()}.csv`;
    hiddenElement.click();
}

// 10. تهيئة الصفحة ونظام اللغة
window.onload = () => {
    loadAllRequests();
    const savedLang = localStorage.getItem('preferredLang') || 'ar';
    if(typeof updatePageContent === 'function') updatePageContent(savedLang);
};
