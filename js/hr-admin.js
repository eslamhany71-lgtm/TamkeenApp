// hr-admin.js - لوحة تحكم الموارد البشرية (النسخة الكاملة مع عرض المرفقات)

let allRequests = []; 

function loadAllRequests() {
    firebase.firestore().collection("HR_Requests").orderBy("submittedAt", "desc").onSnapshot((snapshot) => {
        allRequests = [];
        snapshot.forEach(doc => {
            allRequests.push({ id: doc.id, ...doc.data() });
        });
        renderTable(allRequests);
    });
}

function renderTable(dataArray) {
    const tableBody = document.getElementById('hr-requests-table');
    let total = 0, approved = 0;
    
    if (!tableBody) return;
    tableBody.innerHTML = ""; 

    if (dataArray.length === 0) {
        tableBody.innerHTML = "<tr><td colspan='7' style='text-align:center;'>لا توجد بيانات مطابقة للبحث</td></tr>";
    }

    dataArray.forEach((data) => {
        total++;
        if(data.status === "Approved") approved++;

        const dateFrom = data.startDate || data.reqDate || "--";
        const dateTo = data.endDate ? ` إلى ${data.endDate}` : "";
        
        // فحص وجود مرفق لإضافة أيقونة
        const attachmentBtn = data.attachmentUrl ? 
            `<a href="${data.attachmentUrl}" target="_blank" title="عرض المرفق" style="margin-right: 5px; text-decoration: none;">📎</a>` : "";

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${data.employeeCode || "--"}</td>
            <td><strong>${data.employeeName || "غير معروف"}</strong></td>
            <td>
                <span class="job-info">${data.jobTitle || "--"}</span> / 
                <span class="dept-badge" style="background:#e3f2fd; color:#1976d2; padding:2px 8px; border-radius:4px; font-size:0.85em;">
                    ${data.department || "--"}
                </span>
            </td>
            <td>${translateType(data.type)} ${data.vacationType ? `(${data.vacationType})` : ""} ${attachmentBtn}</td>
            <td>${dateFrom}${dateTo}</td>
            <td><span class="badge ${(data.status || 'Pending').toLowerCase()}">${data.status || 'Pending'}</span></td>
            <td>
                <button onclick="deleteRequest('${data.id}')" class="delete-btn" style="background:#ff4d4d; color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:4px;">حذف</button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    if(document.getElementById('total-count')) document.getElementById('total-count').innerText = total;
    if(document.getElementById('approved-count')) document.getElementById('approved-count').innerText = approved;
}

// ... (باقي دوال uploadCSV و filterTable و exportToExcel كما هي بدون تغيير) ...

function uploadCSV() {
    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];
    if (!file) { alert("يرجى اختيار ملف CSV أولاً"); return; }
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const text = e.target.result;
            const rows = text.split(/\r?\n/); 
            let count = 0;
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i].trim();
                if (!row) continue;
                const cols = row.split(/[;,]/).map(item => item.replace(/["]/g, "").trim());
                if (cols.length >= 5) {
                    const code = cols[0], name = cols[1], phone = cols[2], role = cols[3].toLowerCase(), department = cols[4];
                    if (['employee', 'manager', 'hr', 'admin'].includes(role)) {
                        firebase.firestore().collection("Employee_Database").doc(code).set({
                            employeeId: code, name: name, phone: phone, role: role, department: department, activated: false
                        }, { merge: true });
                        count++;
                    }
                }
            }
            alert(`تم رفع ${count} موظف بنجاح!`);
            fileInput.value = ""; 
        } catch (err) { alert("خطأ: " + err.message); }
    };
    reader.readAsText(file, "UTF-8");
}

function filterTable() {
    const dateFrom = document.getElementById('filter-date-from').value;
    const dateTo = document.getElementById('filter-date-to').value;
    const typeSearch = document.getElementById('filter-type').value;
    const deptSearch = document.getElementById('filter-dept').value.toLowerCase();

    const filteredData = allRequests.filter(req => {
        const reqDate = req.startDate || req.reqDate || "";
        const reqDept = (req.department || "").toLowerCase();
        const reqJob = (req.jobTitle || "").toLowerCase();
        let dateMatch = (!dateFrom || reqDate >= dateFrom) && (!dateTo || reqDate <= dateTo);
        let typeMatch = !typeSearch || req.type === typeSearch;
        let deptMatch = !deptSearch || reqDept.includes(deptSearch) || reqJob.includes(deptSearch);
        return dateMatch && typeMatch && deptMatch;
    });
    renderTable(filteredData);
}

function resetFilters() {
    document.getElementById('filter-date-from').value = "";
    document.getElementById('filter-date-to').value = "";
    document.getElementById('filter-type').value = "";
    document.getElementById('filter-dept').value = "";
    renderTable(allRequests);
}

function deleteRequest(id) {
    if(confirm("حذف الطلب نهائياً؟")) { firebase.firestore().collection("HR_Requests").doc(id).delete(); }
}

function translateType(type) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const types = { vacation: lang === 'ar' ? "إجازة" : "Vacation", late: lang === 'ar' ? "إذن تأخير" : "Late Perm.", exit: lang === 'ar' ? "تصريح خروج" : "Exit Permit" };
    return types[type] || type;
}

function exportToExcel() {
    let csv = "\uFEFFكود الموظف,الاسم,الوظيفة,القسم,نوع الطلب,التاريخ,الحالة\n";
    allRequests.forEach(req => {
        const row = [req.employeeCode, req.employeeName, req.jobTitle, req.department, translateType(req.type), req.startDate || req.reqDate, req.status].join(",");
        csv += row + "\n";
    });
    const hiddenElement = document.createElement('a');
    hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
    hiddenElement.download = `تقرير_تمكين.csv`;
    hiddenElement.click();
}

function updatePageContent(lang) {
    // ... (نفس دالة الترجمة السابقة بدون تغيير) ...
    const translations = { ar: { header: "لوحة تحكم الـ HR Admin", back: "رجوع", export: "تحميل تقرير Excel" }, en: { header: "HR Admin Dashboard", back: "Back", export: "Download Excel" } };
    if(document.getElementById('txt-header')) document.getElementById('txt-header').innerText = translations[lang].header;
}

window.onload = () => {
    loadAllRequests();
    const savedLang = localStorage.getItem('preferredLang') || 'ar';
    updatePageContent(savedLang);
};
