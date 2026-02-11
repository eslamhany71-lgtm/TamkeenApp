const db = firebase.firestore();
let allRequests = []; // لتخزين البيانات محلياً للفلترة السريعة

// 1. دالة سحب كل طلبات الـ HR وعرضها في الجدول
function loadAllRequests() {
    db.collection("HR_Requests").orderBy("submittedAt", "desc").onSnapshot((snapshot) => {
        allRequests = [];
        snapshot.forEach(doc => {
            allRequests.push({ id: doc.id, ...doc.data() });
        });
        renderTable(allRequests);
    });
}

// 2. دالة رسم الجدول بناءً على البيانات
function renderTable(dataArray) {
    const tableBody = document.getElementById('hr-requests-table');
    let total = 0, approved = 0;
    
    tableBody.innerHTML = ""; 

    if (dataArray.length === 0) {
        tableBody.innerHTML = "<tr><td colspan='7' style='text-align:center;'>لا توجد بيانات مطابقة للبحث</td></tr>";
    }

    dataArray.forEach((data) => {
        total++;
        if(data.status === "Approved") approved++;

        const dateFrom = data.startDate || data.reqDate || "--";
        const dateTo = data.endDate ? ` إلى ${data.endDate}` : "";

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${data.employeeCode || "--"}</td>
            <td><strong>${data.employeeName || "اسم غير معروف"}</strong></td>
            <td>${data.jobTitle || "--"} / ${data.department || "--"}</td>
            <td>${translateType(data.type)} ${data.vacationType ? `(${data.vacationType})` : ""}</td>
            <td>${dateFrom}${dateTo}</td>
            <td><span class="badge ${data.status.toLowerCase()}">${data.status}</span></td>
            <td>
                <button onclick="deleteRequest('${data.id}')" class="delete-btn">حذف</button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    document.getElementById('total-count').innerText = total;
    document.getElementById('approved-count').innerText = approved;
}

// 3. دالة رفع ملف CSV (النظام الاحترافي الجديد - 4 أعمدة)
function uploadCSV() {
    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];
    if (!file) { 
        alert("يرجى اختيار ملف CSV أولاً"); 
        return; 
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const rows = text.split('\n'); // تقسيم الملف لأسطر
        let count = 0;

        // نبدأ من السطر الثاني (تخطي العناوين)
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i].trim();
            if (!row) continue; // تخطي السطور الفاضية

            const cols = row.split(','); // تقسيم السطر لأعمدة

            if (cols.length >= 4) {
                const code = cols[0].trim();
                const name = cols[1].trim();
                const phone = cols[2].trim();
                const role = cols[3].trim().toLowerCase(); // الرتبة: employee, manager, hr

                // رفع البيانات لجدول قاعدة بيانات الموظفين
                db.collection("Employee_Database").doc(code).set({
                    name: name,
                    phone: phone,
                    role: role,
                    activated: false // الحساب لسه مفعلوش الموظف
                });
                count++;
            }
        }
        alert(`تم رفع بيانات ${count} موظف بنجاح!`);
        fileInput.value = ""; // مسح الملف من الخانة بعد الرفع
    };
    reader.readAsText(file, "UTF-8");
}

// 4. دالة الفلترة الذكية
function filterTable() {
    const dateFrom = document.getElementById('filter-date-from').value;
    const dateTo = document.getElementById('filter-date-to').value;
    const typeSearch = document.getElementById('filter-type').value;
    const deptSearch = document.getElementById('filter-dept').value.toLowerCase();

    const filteredData = allRequests.filter(req => {
        const reqDate = req.startDate || req.reqDate || "";
        const reqType = req.type || "";
        const reqDept = (req.department || "").toLowerCase();
        const reqJob = (req.jobTitle || "").toLowerCase();

        let dateMatch = true;
        if (dateFrom && reqDate < dateFrom) dateMatch = false;
        if (dateTo && reqDate > dateTo) dateMatch = false;

        let typeMatch = true;
        if (typeSearch && reqType !== typeSearch) typeMatch = false;

        let deptMatch = true;
        if (deptSearch && !reqDept.includes(deptSearch) && !reqJob.includes(deptSearch)) deptMatch = false;

        return dateMatch && typeMatch && deptMatch;
    });

    renderTable(filteredData);
}

// 5. إعادة ضبط الفلاتر
function resetFilters() {
    document.getElementById('filter-date-from').value = "";
    document.getElementById('filter-date-to').value = "";
    document.getElementById('filter-type').value = "";
    document.getElementById('filter-dept').value = "";
    renderTable(allRequests);
}

// 6. حذف سجل
function deleteRequest(id) {
    if(confirm("هل أنت متأكد من حذف هذا السجل نهائياً؟")) {
        db.collection("HR_Requests").doc(id).delete();
    }
}

// 7. ترجمة نوع الطلب
function translateType(type) {
    const types = { vacation: "إجازة", late: "إذن تأخير", exit: "تصريح خروج" };
    return types[type] || type;
}

// 8. تصدير للـ Excel
function exportToExcel() {
    let csv = "\uFEFF"; 
    csv += "الكود,الموظف,الوظيفة/القسم,نوع الطلب,التاريخ,الحالة\n";
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
    hiddenElement.download = 'تقرير_HR.csv';
    hiddenElement.click();
}

// 9. نظام اللغة
function updatePageContent(lang) {
    const translations = {
        ar: { 
            title: "إدارة الـ HR", header: "لوحة تحكم الـ HR Admin", back: "رجوع", total: "إجمالي الطلبات:", approved: "الموافق عليها:", export: "تحميل تقرير",
            filterDate: "فلتر بالتاريخ:", filterType: "نوع الطلب:", filterDept: "البحث بالقسم / الوظيفة:", 
            optAll: "الكل", optVac: "إجازة", optLate: "إذن تأخير", optExit: "تصريح خروج",
            reset: "إعادة ضبط", code:"الكود", name:"الموظف", job:"الوظيفة/القسم", type:"نوع الطلب", date:"التاريخ", status:"الحالة", action:"إجراء",
            upload: "رفع بيانات الموظفين (ملف CSV):", start: "ابدأ الرفع الآن"
        },
        en: { 
            title: "HR Admin", header: "HR Admin Dashboard", back: "Back", total: "Total:", approved: "Approved:", export: "Export Report",
            filterDate: "Date Filter:", filterType: "Request Type:", filterDept: "Search Dept/Job:", 
            optAll: "All", optVac: "Vacation", optLate: "Late Perm.", optExit: "Exit Permit",
            reset: "Reset", code:
