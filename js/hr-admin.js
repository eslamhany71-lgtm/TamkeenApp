// hr-admin.js - لوحة تحكم الموارد البشرية الموحدة (النسخة الكاملة الاحترافية)

let allRequests = []; 

// 1. دالة سحب كل طلبات الموظفين من Firestore (تحديث لحظي)
function loadAllRequests() {
    firebase.firestore().collection("HR_Requests").orderBy("submittedAt", "desc").onSnapshot((snapshot) => {
        allRequests = [];
        snapshot.forEach(doc => {
            allRequests.push({ id: doc.id, ...doc.data() });
        });
        renderTable(allRequests);
    });
}

// 2. دالة رسم الجدول بناءً على البيانات (الكل أو المفلتر)
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
            <td>${translateType(data.type)} ${data.vacationType ? `(${data.vacationType})` : ""}</td>
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

// 3. دالة رفع ملف CSV (تدعم 5 أعمدة: الكود، الاسم، الهاتف، الرتبة، القسم)
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

            // نبدأ من i=1 لتخطي سطر العناوين
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i].trim();
                if (!row) continue;

                // تنظيف البيانات والتقسيم
                const cols = row.split(/[;,]/).map(item => item.replace(/["]/g, "").trim());

                // التحقق من الأعمدة الخمسة: (0:كود، 1:اسم، 2:هاتف، 3:رتبة، 4:قسم)
                if (cols.length >= 5) {
                    const code = cols[0];
                    const name = cols[1];
                    const phone = cols[2];
                    const role = cols[3].toLowerCase();
                    const department = cols[4];

                    if (['employee', 'manager', 'hr', 'admin'].includes(role)) {
                        firebase.firestore().collection("Employee_Database").doc(code).set({
                            employeeId: code,
                            name: name,
                            phone: phone,
                            role: role,
                            department: department, // الحقل الجديد للربط
                            activated: false
                        }, { merge: true }); // Merge لعدم مسح بيانات التفعيل السابقة
                        count++;
                    } else {
                        errorLog += `السطر ${i+1}: الرتبة "${role}" غير صالحة.\n`;
                    }
                } else {
                    errorLog += `السطر ${i+1}: بيانات ناقصة (مطلوب 5 أعمدة).\n`;
                }
            }
            
            if (count > 0) {
                alert(`تم بنجاح رفع/تحديث بيانات ${count} موظف مع أقسامهم.`);
                if (errorLog) console.warn("ملاحظات:\n" + errorLog);
                fileInput.value = ""; 
            } else {
                alert("فشل الرفع! تأكد من تنسيق الملف (CSV) ووجود 5 أعمدة.");
            }

        } catch (err) {
            console.error(err);
            alert("خطأ تقني: " + err.message);
        }
    };
    reader.readAsText(file, "UTF-8");
}

// 4. دالة الفلترة الذكية (تاريخ - نوع - قسم/وظيفة)
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
    if(document.getElementById('filter-date-from')) document.getElementById('filter-date-from').value = "";
    if(document.getElementById('filter-date-to')) document.getElementById('filter-date-to').value = "";
    if(document.getElementById('filter-type')) document.getElementById('filter-type').value = "";
    if(document.getElementById('filter-dept')) document.getElementById('filter-dept').value = "";
    renderTable(allRequests);
}

// 6. حذف سجل طلب نهائياً
function deleteRequest(id) {
    if(confirm("هل أنت متأكد من حذف هذا السجل نهائياً؟")) {
        firebase.firestore().collection("HR_Requests").doc(id).delete();
    }
}

// 7. دالة مساعدة لترجمة نوع الطلب
function translateType(type) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const types = {
        vacation: lang === 'ar' ? "إجازة" : "Vacation",
        late: lang === 'ar' ? "إذن تأخير" : "Late Perm.",
        exit: lang === 'ar' ? "تصريح خروج" : "Exit Permit"
    };
    return types[type] || type;
}

// 8. تصدير البيانات إلى ملف Excel (بما في ذلك عمود القسم)
function exportToExcel() {
    let csv = "\uFEFF"; // UTF-8 BOM لضمان ظهور اللغة العربية بشكل صحيح في Excel
    csv += "كود الموظف,الاسم,الوظيفة,القسم,نوع الطلب,التاريخ,الحالة\n";
    
    allRequests.forEach(req => {
        const date = req.startDate || req.reqDate || "--";
        const row = [
            req.employeeCode || "",
            (req.employeeName || "").replace(/,/g, " "),
            (req.jobTitle || "").replace(/,/g, " "),
            (req.department || "").replace(/,/g, " "),
            translateType(req.type),
            date,
            req.status || "Pending"
        ].join(",");
        csv += row + "\n";
    });

    const hiddenElement = document.createElement('a');
    hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
    hiddenElement.target = '_blank';
    hiddenElement.download = `تقرير_تمكين_${new Date().toLocaleDateString()}.csv`;
    hiddenElement.click();
}

// 9. نظام اللغة الكامل (متوافق مع IDs صفحة HR Dashboard)
function updatePageContent(lang) {
    const translations = {
        ar: { 
            title: "إدارة الـ HR - تمكين", header: "لوحة تحكم الـ HR Admin", back: "رجوع", 
            total: "إجمالي الطلبات:", approved: "الموافق عليها:", export: "تحميل تقرير Excel",
            filterDate: "فلتر بالتاريخ:", filterType: "نوع الطلب:", filterDept: "البحث بالقسم / الوظيفة:", 
            optAll: "الكل", optVac: "إجازة", optLate: "إذن تأخير", optExit: "تصريح خروج",
            reset: "إعادة ضبط", code:"الكود", name:"الموظف", job:"الوظيفة/القسم", type:"نوع الطلب", date:"التاريخ", status:"الحالة", action:"إجراء",
            upload: "رفع بيانات الموظفين (CSV):", start: "ابدأ الرفع"
        },
        en: { 
            title: "HR Admin - Tamkeen", header: "HR Admin Dashboard", back: "Back", 
            total: "Total Requests:", approved: "Approved:", export: "Download Excel Report",
            filterDate: "Date Filter:", filterType: "Request Type:", filterDept: "Search Dept/Job:", 
            optAll: "All", optVac: "Vacation", optLate: "Late Perm.", optExit: "Exit Permit",
            reset: "Reset", code:"ID", name:"Name", job:"Job/Dept", type:"Type", date:"Date", status:"Status", action:"Action",
            upload: "Upload Employees (CSV):", start: "Upload Now"
        }
    };
    const t = translations[lang];
    if(!t) return;
    
    // تطبيق الترجمة على كافة العناصر
    if(document.getElementById('txt-title')) document.title = t.title;
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
    
    // رؤوس الجدول
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

// 10. التشغيل عند التحميل
window.onload = () => {
    loadAllRequests();
    const savedLang = localStorage.getItem('preferredLang') || 'ar';
    updatePageContent(savedLang);
};
