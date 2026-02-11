// ملاحظة: لا نعرف db هنا لتجنب التعارض مع auth.js
let allRequests = []; 

// 1. دالة سحب كل طلبات الـ HR وعرضها في الجدول
function loadAllRequests() {
    firebase.firestore().collection("HR_Requests").orderBy("submittedAt", "desc").onSnapshot((snapshot) => {
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
            <td><strong>${data.employeeName || "غير معروف"}</strong></td>
            <td>${data.jobTitle || "--"} / ${data.department || "--"}</td>
            <td>${translateType(data.type)} ${data.vacationType ? `(${data.vacationType})` : ""}</td>
            <td>${dateFrom}${dateTo}</td>
            <td><span class="badge ${data.status?.toLowerCase() || ''}">${data.status || 'Pending'}</span></td>
            <td>
                <button onclick="deleteRequest('${data.id}')" class="delete-btn">حذف</button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    if(document.getElementById('total-count')) document.getElementById('total-count').innerText = total;
    if(document.getElementById('approved-count')) document.getElementById('approved-count').innerText = approved;
}

// 3. دالة رفع ملف CSV (النسخة الاحترافية الذكية)
function uploadCSV() {
    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];
    
    if (!file) { 
        alert("يرجى اختيار ملف CSV أولاً"); 
        return; 
    }

    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const text = e.target.result;
            const rows = text.split(/\r?\n/); 
            let count = 0;
            let errorLog = "";

            console.log("بدء فحص الملف...");

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i].trim();
                if (!row) continue;

                // تقسيم السطر باستخدام Regex لدعم (,) و (;) وتنظيف علامات التنصيص "
                const cols = row.split(/[;,]/).map(item => item.replace(/["]/g, "").trim());

                console.log(`سطر ${i}: وجدنا ${cols.length} أعمدة. البيانات:`, cols);

                if (cols.length >= 4) {
                    const code = cols[0];
                    const name = cols[1];
                    const phone = cols[2];
                    const role = cols[3].toLowerCase();

                    // التأكد من أن الرتبة مكتوبة صحيحة
                    if (['employee', 'manager', 'hr'].includes(role)) {
                        firebase.firestore().collection("Employee_Database").doc(code).set({
                            employeeId: code,
                            name: name,
                            phone: phone,
                            role: role,
                            activated: false
                        });
                        count++;
                    } else {
                        errorLog += `السطر ${i}: الرتبة "${role}" غير صحيحة (يجب أن تكون employee أو manager أو hr)\n`;
                    }
                } else {
                    errorLog += `السطر ${i}: يحتوي على ${cols.length} أعمدة فقط، والمطلوب 4 (كود، اسم، موبايل، رتبة)\n`;
                }
            }
            
            if (count > 0) {
                alert(`تم رفع ${count} موظف بنجاح! اعمل Refresh لصفحة Firebase للتأكد.`);
                if (errorLog) alert("ملاحظات على بعض السطور:\n" + errorLog);
                fileInput.value = ""; 
            } else {
                alert("لم يتم رفع أي بيانات!\nالأسباب المحتملة:\n" + errorLog);
            }

        } catch (err) {
            console.error(err);
            alert("خطأ تقني: " + err.message);
        }
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
        firebase.firestore().collection("HR_Requests").doc(id).delete();
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
            reset: "Reset", code:"ID", name:"Name", job:"Job/Dept", type:"Type", date:"Date", status:"Status", action:"Action",
            upload: "Upload Employees Data (CSV):", start: "Start Upload"
        }
    };
    const t = translations[lang];
    if(document.getElementById('txt-title')) document.getElementById('txt-title').innerText = t.title;
    if(document.getElementById('txt-header')) document.getElementById('txt-header').innerText = t.header;
    if(document.getElementById('btn-back')) document.getElementById('btn-back').innerText = t.back;
    if(document.getElementById('txt-total')) document.getElementById('txt-total').innerText = t.total;
    if(document.getElementById('txt-approved')) document.getElementById('txt-approved').innerText = t.approved;
    if(document.getElementById('btn-export')) document.getElementById('btn-export').innerText = t.export;
    if(document.getElementById('lbl-filter-date')) document.getElementById('lbl-filter-date').innerText = t.filterDate;
    if(document.getElementById('lbl-filter-type')) document.getElementById('lbl-filter-type').innerText = t.filterType;
    if(document.getElementById('lbl-filter-dept')) document.getElementById('lbl-filter-dept').innerText = t.filterDept;
    if(document.getElementById('opt-all')) document.getElementById('opt-all').innerText = t.optAll;
    if(document.getElementById('opt-vac')) document.getElementById('opt-vac').innerText = t.optVac;
    if(document.getElementById('opt-late')) document.getElementById('opt-late').innerText = t.optLate;
    if(document.getElementById('opt-exit')) document.getElementById('opt-exit').innerText = t.optExit;
    if(document.getElementById('btn-reset-filter')) document.getElementById('btn-reset-filter').innerText = t.reset;
    if(document.getElementById('th-code')) document.getElementById('th-code').innerText = t.code;
    if(document.getElementById('th-name')) document.getElementById('th-name').innerText = t.name;
    if(document.getElementById('th-job')) document.getElementById('th-job').innerText = t.job;
    if(document.getElementById('th-type')) document.getElementById('th-type').innerText = t.type;
    if(document.getElementById('th-date')) document.getElementById('th-date').innerText = t.date;
    if(document.getElementById('th-status')) document.getElementById('th-status').innerText = t.status;
    if(document.getElementById('th-action')) document.getElementById('th-action').innerText = t.action;
    
    if(document.getElementById('lbl-upload')) document.getElementById('lbl-upload').innerText = t.upload;
    if(document.getElementById('btn-upload-start')) document.getElementById('btn-upload-start').innerText = t.start;
}
