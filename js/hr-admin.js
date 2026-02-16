// hr-admin.js - لوحة تحكم الموارد البشرية (النسخة المطورة والشاملة)

let allRequests = []; 

// 1. دالة سحب كل طلبات الموظفين من Firestore (تحديث لحظي)
function loadAllRequests() {
    firebase.firestore().collection("HR_Requests").orderBy("submittedAt", "desc").onSnapshot((snapshot) => {
        allRequests = [];
        let departmentsSet = new Set(); // لتجميع الأقسام بدون تكرار للدروب داون

        snapshot.forEach(doc => {
            const data = doc.data();
            allRequests.push({ id: doc.id, ...data });
            if (data.department) departmentsSet.add(data.department);
        });

        // تحديث قائمة الأقسام في الفلتر (الدروب داون)
        updateDeptDropdown(departmentsSet);
        
        // عرض الجدول بالبيانات المسحوبة
        renderTable(allRequests);
    });
}

// 2. تحديث قائمة الأقسام المنسدلة تلقائياً من البيانات
function updateDeptDropdown(depts) {
    const deptDropdown = document.getElementById('filter-dept-dropdown');
    if (!deptDropdown) return;
    
    const currentSelection = deptDropdown.value;
    deptDropdown.innerHTML = `<option value="">الكل</option>`; // إعادة التعيين
    
    depts.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept;
        option.innerText = dept;
        deptDropdown.appendChild(option);
    });
    
    deptDropdown.value = currentSelection; // الحفاظ على الاختيار الحالي
}

// 3. دالة رسم الجدول وتحديث العدادات (إجمالي / موافق عليه)
function renderTable(dataArray) {
    const tableBody = document.getElementById('hr-requests-table');
    const totalCountEl = document.getElementById('total-count');
    const approvedCountEl = document.getElementById('approved-count');
    const lang = localStorage.getItem('preferredLang') || 'ar';

    if (!tableBody) return;
    tableBody.innerHTML = ""; 

    let total = 0;
    let approved = 0;

    if (dataArray.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center;">${lang === 'ar' ? 'لا توجد بيانات متاحة' : 'No data available'}</td></tr>`;
        if (totalCountEl) totalCountEl.innerText = "0";
        if (approvedCountEl) approvedCountEl.innerText = "0";
        return;
    }

    dataArray.forEach((data) => {
        total++;
        if (data.status === "Approved") approved++;

        const dateFrom = data.startDate || data.reqDate || "--";
        
        // تفاصيل نوع الطلب (دمج النوع مع تفاصيل الإجازة)
        const fullType = translateType(data.type) + (data.vacationType ? ` (${data.vacationType})` : "");
        
        // بيانات المدير (تم الإجراء بواسطة)
        const reviewerInfo = data.reviewerName ? 
            `<div style="font-size: 11px; line-height: 1.3; color: #555; background: #fdfdfd; padding: 4px; border-radius: 4px; border: 1px solid #eee;">
                <b>${data.reviewerName}</b><br>
                <span>ID: ${data.reviewerCode}</span><br>
                <span style="color: #2a5298;">Dept: ${data.reviewerDept}</span>
            </div>` : "--";

        // أيقونة المرفق (Base64)
        const attachmentIcon = data.fileBase64 ? 
            `<span onclick="viewFileAdmin('${data.id}')" style="cursor:pointer; font-size:1.2em; margin-left:5px; color: #2a5298;" title="عرض المرفق">📎</span>
             <textarea id="admin-data-${data.id}" style="display:none;">${data.fileBase64}</textarea>` : "";

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${data.employeeCode || "--"}</td>
            <td><strong>${data.employeeName || "غير معروف"}</strong></td>
            <td>${data.jobTitle || "--"}</td>
            <td><span class="dept-badge" style="background:#e3f2fd; color:#1976d2; padding:3px 10px; border-radius:4px; font-size:0.85em; font-weight:bold;">${data.department || "--"}</span></td>
            <td>${fullType} ${attachmentIcon}</td>
            <td>${dateFrom}</td>
            <td><span class="badge ${(data.status || 'Pending').toLowerCase()}" style="padding: 5px 10px; border-radius: 12px; font-size: 0.8em; font-weight: bold; color: white; background: ${getStatusColor(data.status)}">${data.status || 'Pending'}</span></td>
            <td>${reviewerInfo}</td>
            <td><button onclick="deleteRequest('${data.id}')" class="delete-btn" style="background:#ff4d4d; color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:4px;">حذف</button></td>
        `;
        tableBody.appendChild(row);
    });

    if (totalCountEl) totalCountEl.innerText = total;
    if (approvedCountEl) approvedCountEl.innerText = approved;
}

// دالة مساعدة لجلب ألوان الحالة
function getStatusColor(status) {
    switch (status) {
        case 'Approved': return '#27ae60'; 
        case 'Rejected': return '#e74c3c'; 
        default: return '#f39c12'; 
    }
}

// 4. دالة عرض المرفق للـ HR (Base64)
function viewFileAdmin(docId) {
    const base64Data = document.getElementById(`admin-data-${docId}`).value;
    const newWindow = window.open();
    newWindow.document.write(`<html><title>معاينة المرفق</title><body style="margin:0;"><iframe src="${base64Data}" frameborder="0" style="width:100%; height:100vh;"></iframe></body></html>`);
}

// 5. دالة رفع الموظفين من ملف CSV
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

// 6. الفلترة الذكية المطورة
function filterTable() {
    const dateFrom = document.getElementById('filter-date-from').value;
    const dateTo = document.getElementById('filter-date-to').value;
    const typeSearch = document.getElementById('filter-type').value;
    const statusSearch = document.getElementById('filter-status').value; // فلتر الحالة الجديد
    const deptDropdown = document.getElementById('filter-dept-dropdown').value; // فلتر القسم دروب داون
    const generalSearch = document.getElementById('filter-general').value.toLowerCase(); // بحث عام

    const filtered = allRequests.filter(req => {
        const reqDate = req.startDate || req.reqDate || "";
        const reqDept = (req.department || "").toLowerCase();
        const reqName = (req.employeeName || "").toLowerCase();
        const reqCode = (req.employeeCode || "").toString();
        const reqJob = (req.jobTitle || "").toLowerCase();

        let dateMatch = (!dateFrom || reqDate >= dateFrom) && (!dateTo || reqDate <= dateTo);
        let typeMatch = !typeSearch || req.type === typeSearch;
        let statusMatch = !statusSearch || req.status === statusSearch;
        let deptDropdownMatch = !deptDropdown || req.department === deptDropdown;
        
        // البحث العام في (الاسم، الكود، القسم، الوظيفة)
        let generalMatch = !generalSearch || 
                           reqName.includes(generalSearch) || 
                           reqCode.includes(generalSearch) || 
                           reqDept.includes(generalSearch) || 
                           reqJob.includes(generalSearch);

        return dateMatch && typeMatch && statusMatch && deptDropdownMatch && generalMatch;
    });

    renderTable(filtered);
}

// 7. إعادة ضبط الفلاتر
function resetFilters() {
    document.getElementById('filter-date-from').value = "";
    document.getElementById('filter-date-to').value = "";
    document.getElementById('filter-type').value = "";
    document.getElementById('filter-status').value = "";
    document.getElementById('filter-dept-dropdown').value = "";
    document.getElementById('filter-general').value = "";
    renderTable(allRequests);
}

// 8. حذف طلب
function deleteRequest(id) {
    if(confirm("هل أنت متأكد من حذف هذا السجل نهائياً؟")) {
        firebase.firestore().collection("HR_Requests").doc(id).delete();
    }
}

// 9. ترجمة نوع الطلب
function translateType(type) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const types = {
        vacation: lang === 'ar' ? "إجازة" : "Vacation",
        late: lang === 'ar' ? "إذن تأخير" : "Late Perm.",
        exit: lang === 'ar' ? "تصريح خروج" : "Exit Permit"
    };
    return types[type] || type;
}

// 10. تصدير للـ Excel (محدث ليشمل المدير ونوع الإجازة)
function exportToExcel() {
    let csv = "\uFEFF"; 
    csv += "كود الموظف,الاسم,الوظيفة,القسم,نوع الطلب,التاريخ,الحالة,المراجع\n";
    
    allRequests.forEach(req => {
        let rowData = [
            req.employeeCode || "",
            req.employeeName || "",
            req.jobTitle || "",
            req.department || "",
            translateType(req.type) + (req.vacationType ? " " + req.vacationType : ""),
            req.startDate || req.reqDate || "",
            req.status || "",
            req.reviewerName || ""
        ];
        csv += rowData.join(",") + "\n";
    });

    const hiddenElement = document.createElement('a');
    hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
    hiddenElement.target = '_blank';
    hiddenElement.download = `تقرير_HR_تمكين_${new Date().toLocaleDateString()}.csv`;
    hiddenElement.click();
}

// 11. تهيئة الصفحة ونظام اللغة
window.onload = () => {
    loadAllRequests();
    const savedLang = localStorage.getItem('preferredLang') || 'ar';
    if(typeof updatePageContent === 'function') updatePageContent(savedLang);
};
