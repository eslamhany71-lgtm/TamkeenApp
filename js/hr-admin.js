const db = firebase.firestore();
let allRequests = []; // مصفوفة لتخزين كل البيانات محلياً عشان الفلترة تكون سريعة جداً

// 1. دالة سحب كل الطلبات من Firestore
function loadAllRequests() {
    db.collection("HR_Requests").orderBy("submittedAt", "desc").onSnapshot((snapshot) => {
        allRequests = [];
        snapshot.forEach(doc => {
            allRequests.push({ id: doc.id, ...doc.data() });
        });
        // أول ما البيانات تيجي، بنرسم الجدول بالكامل
        renderTable(allRequests);
    });
}

// 2. دالة رسم الجدول بناءً على البيانات (المفلترة أو الكاملة)
function renderTable(dataArray) {
    const tableBody = document.getElementById('hr-requests-table');
    let total = 0, approved = 0;
    
    tableBody.innerHTML = ""; // مسح الجدول القديم

    if (dataArray.length === 0) {
        tableBody.innerHTML = "<tr><td colspan='7' style='text-align:center;'>لا توجد بيانات مطابقة للبحث</td></tr>";
    }

    dataArray.forEach((data) => {
        total++;
        if(data.status === "Approved") approved++;

        // معالجة التواريخ للعرض
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

    // تحديث الأرقام في شريط الإحصائيات
    document.getElementById('total-count').innerText = total;
    document.getElementById('approved-count').innerText = approved;
}

// 3. دالة الفلترة الذكية (تاريخ + نوع + قسم)
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

        // فلتر التاريخ
        let dateMatch = true;
        if (dateFrom && reqDate < dateFrom) dateMatch = false;
        if (dateTo && reqDate > dateTo) dateMatch = false;

        // فلتر نوع الطلب
        let typeMatch = true;
        if (typeSearch && reqType !== typeSearch) typeMatch = false;

        // فلتر القسم والوظيفة
        let deptMatch = true;
        if (deptSearch && !reqDept.includes(deptSearch) && !reqJob.includes(deptSearch)) deptMatch = false;

        return dateMatch && typeMatch && deptMatch;
    });

    renderTable(filteredData);
}

// 4. إعادة ضبط الفلاتر
function resetFilters() {
    document.getElementById('filter-date-from').value = "";
    document.getElementById('filter-date-to').value = "";
    document.getElementById('filter-type').value = "";
    document.getElementById('filter-dept').value = "";
    renderTable(allRequests);
}

// 5. حذف طلب
function deleteRequest(id) {
    if(confirm("هل أنت متأكد من حذف هذا السجل نهائياً؟")) {
        db.collection("HR_Requests").doc(id).delete()
        .then(() => console.log("تم الحذف"))
        .catch(err => alert("خطأ في الحذف: " + err.message));
    }
}

// 6. ترجمة نوع الطلب للعرض
function translateType(type) {
    const types = { vacation: "إجازة", late: "إذن تأخير", exit: "تصريح خروج" };
    return types[type] || type;
}

// 7. تصدير البيانات الظاهرة في الجدول حالياً لملف Excel (CSV)
function exportToExcel() {
    let csv = "\uFEFF"; // لدعم اللغة العربية
    csv += "الكود,الموظف,الوظيفة/القسم,نوع الطلب,التاريخ,الحالة\n";
    
    // بناخد البيانات اللي ظاهرة حالياً في الـ Table Body
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
    hiddenElement.download = 'تقرير_HR_مفلتر.csv';
    hiddenElement.click();
}

// 8. نظام اللغة (Arabic/English) لصفحة الـ HR
function updatePageContent(lang) {
    const translations = {
        ar: { 
            title: "إدارة الـ HR", header: "لوحة تحكم الـ HR Admin", back: "رجوع", total: "إجمالي الطلبات:", approved: "الموافق عليها:", export: "تحميل تقرير مفلتر",
            filterDate: "فلتر بالتاريخ:", filterType: "نوع الطلب:", filterDept: "البحث بالقسم / الوظيفة:", 
            optAll: "الكل", optVac: "إجازة", optLate: "إذن تأخير", optExit: "تصريح خروج",
            reset: "إعادة ضبط", code:"الكود", name:"الموظف", job:"الوظيفة/القسم", type:"نوع الطلب", date:"التاريخ", status:"الحالة", action:"إجراء" 
        },
        en: { 
            title: "HR Admin", header: "HR Admin Dashboard", back: "Back", total: "Total:", approved: "Approved:", export: "Export Filtered Report",
            filterDate: "Date Filter:", filterType: "Request Type:", filterDept: "Search Dept/Job:", 
            optAll: "All", optVac: "Vacation", optLate: "Late Permission", optExit: "Exit Permit",
            reset: "Reset", code:"ID", name:"Name", job:"Job/Dept", type:"Type", date:"Date", status:"Status", action:"Action"
        }
    };
    const t = translations[lang];
    
    // تحديث النصوص
    document.getElementById('txt-title').innerText = t.title;
    document.getElementById('txt-header').innerText = t.header;
    document.getElementById('btn-back').innerText = t.back;
    document.getElementById('txt-total').innerText = t.total;
    document.getElementById('txt-approved').innerText = t.approved;
    document.getElementById('btn-export').innerText = t.export;
    document.getElementById('lbl-filter-date').innerText = t.filterDate;
    document.getElementById('lbl-filter-type').innerText = t.filterType;
    document.getElementById('lbl-filter-dept').innerText = t.filterDept;
    document.getElementById('opt-all').innerText = t.optAll;
    document.getElementById('opt-vac').innerText = t.optVac;
    document.getElementById('opt-late').innerText = t.optLate;
    document.getElementById('opt-exit').innerText = t.optExit;
    document.getElementById('btn-reset-filter').innerText = t.reset;
    
    // تحديث عناوين الجدول
    document.getElementById('th-code').innerText = t.code;
    document.getElementById('th-name').innerText = t.name;
    document.getElementById('th-job').innerText = t.job;
    document.getElementById('th-type').innerText = t.type;
    document.getElementById('th-date').innerText = t.date;
    document.getElementById('th-status').innerText = t.status;
    document.getElementById('th-action').innerText = t.action;
}

// تشغيل جلب البيانات عند فتح الصفحة
window.onload = () => { 
    loadAllRequests(); 
};
function uploadCSV() {
    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];
    if (!file) { alert("اختار ملف CSV الأول"); return; }

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const rows = text.split('\n');
        
        // تخطي أول سطر (العناوين) والبدء في الرفع
        for (let i = 1; i < rows.length; i++) {
            const cols = rows[i].split(',');
            if (cols.length >= 3) {
                const code = cols[0].trim(); // الكود
                const name = cols[1].trim(); // الاسم
                const phone = cols[2].trim(); // التليفون
                
                db.collection("Employee_Database").doc(code).set({
                    name: name,
                    phone: phone,
                    activated: false
                });
            }
        }
        alert("تمت جدولة رفع البيانات بنجاح!");
    };
    reader.readAsText(file);
}
