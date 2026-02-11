const db = firebase.firestore();
let allRequests = []; // مصفوفة لتخزين البيانات محلياً للفلترة السريعة

function loadAllRequests() {
    db.collection("HR_Requests").orderBy("submittedAt", "desc").onSnapshot((snapshot) => {
        allRequests = [];
        snapshot.forEach(doc => {
            allRequests.push({ id: doc.id, ...doc.data() });
        });
        renderTable(allRequests);
    });
}

// دالة رسم الجدول بناءً على البيانات (المفلترة أو الكاملة)
function renderTable(dataArray) {
    const tableBody = document.getElementById('hr-requests-table');
    let total = 0, approved = 0;
    tableBody.innerHTML = "";

    dataArray.forEach((data) => {
        total++;
        if(data.status === "Approved") approved++;

        const dateFrom = data.startDate || data.reqDate || "";
        const dateTo = data.endDate ? ` إلى ${data.endDate}` : "";

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${data.employeeCode || "--"}</td>
            <td><strong>${data.employeeName || "اسم غير معروف"}</strong></td>
            <td>${data.jobTitle || "--"} / ${data.department || "--"}</td>
            <td>${translateType(data.type)} ${data.vacationType ? `(${data.vacationType})` : ""}</td>
            <td>${dateFrom}${dateTo}</td>
            <td data-date="${dateFrom}"><span class="badge ${data.status.toLowerCase()}">${data.status}</span></td>
            <td>
                <button onclick="deleteRequest('${data.id}')" class="delete-btn">حذف</button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    document.getElementById('total-count').innerText = total;
    document.getElementById('approved-count').innerText = approved;
}

// دالة الفلترة الذكية
function filterTable() {
    const dateFrom = document.getElementById('filter-date-from').value;
    const dateTo = document.getElementById('filter-date-to').value;
    const deptSearch = document.getElementById('filter-dept').value.toLowerCase();

    const filteredData = allRequests.filter(req => {
        const reqDate = req.startDate || req.reqDate || "";
        const reqDept = (req.department || "").toLowerCase();
        const reqJob = (req.jobTitle || "").toLowerCase();

        // فلتر التاريخ
        let dateMatch = true;
        if (dateFrom && reqDate < dateFrom) dateMatch = false;
        if (dateTo && reqDate > dateTo) dateMatch = false;

        // فلتر القسم والوظيفة
        let deptMatch = true;
        if (deptSearch && !reqDept.includes(deptSearch) && !reqJob.includes(deptSearch)) deptMatch = false;

        return dateMatch && deptMatch;
    });

    renderTable(filteredData);
}

function resetFilters() {
    document.getElementById('filter-date-from').value = "";
    document.getElementById('filter-date-to').value = "";
    document.getElementById('filter-dept').value = "";
    renderTable(allRequests);
}

function deleteRequest(id) {
    if(confirm("هل أنت متأكد من حذف هذا السجل نهائياً؟")) {
        db.collection("HR_Requests").doc(id).delete();
    }
}

function translateType(type) {
    const types = { vacation: "إجازة", late: "إذن تأخير", exit: "تصريح خروج" };
    return types[type] || type;
}

function exportToExcel() {
    let csv = "\uFEFF"; 
    csv += "الكود,الموظف,الوظيفة,القسم,تاريخ التعيين,النوع,التفاصيل,من تاريخ,إلى تاريخ,الوقت,السبب,الحالة\n";
    
    // تصدير البيانات الظاهرة حالياً في الجدول فقط
    const tableRows = document.querySelectorAll("#hr-requests-table tr");
    tableRows.forEach(row => {
        const cols = row.querySelectorAll("td");
        let rowData = [];
        cols.forEach((col, index) => {
            if(index < 6) rowData.push(col.innerText.replace(/,/g, " "));
        });
        csv += rowData.join(",") + "\n";
    });

    const hiddenElement = document.createElement('a');
    hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
    hiddenElement.target = '_blank';
    hiddenElement.download = 'تقرير_مفلتر_HR.csv';
    hiddenElement.click();
}

function updatePageContent(lang) {
    const translations = {
        ar: { 
            title: "إدارة الـ HR", header: "لوحة تحكم الـ HR Admin", back: "رجوع", total: "إجمالي الطلبات:", approved: "الموافق عليها:", export: "تحميل تقرير",
            filterDate: "فلتر بالتاريخ:", filterDept: "البحث بالقسم / الوظيفة:", reset: "إعادة ضبط",
            code:"الكود", name:"الموظف", job:"الوظيفة/القسم", type:"نوع الطلب", date:"التاريخ", status:"الحالة", action:"إجراء" 
        },
        en: { 
            title: "HR Admin", header: "HR Admin Dashboard", back: "Back", total: "Total:", approved: "Approved:", export: "Export Report",
            filterDate: "Filter by Date:", filterDept: "Search Dept / Job:", reset: "Reset",
            code:"ID", name:"Name", job:"Job/Dept", type:"Type", date:"Date", status:"Status", action:"Action" 
        }
    };
    const t = translations[lang];
    document.getElementById('txt-title').innerText = t.title;
    document.getElementById('txt-header').innerText = t.header;
    document.getElementById('btn-back').innerText = t.back;
    document.getElementById('txt-total').innerText = t.total;
    document.getElementById('txt-approved').innerText = t.approved;
    document.getElementById('btn-export').innerText = t.export;
    document.getElementById('lbl-filter-date').innerText = t.filterDate;
    document.getElementById('lbl-filter-dept').innerText = t.filterDept;
    document.getElementById('btn-reset-filter').innerText = t.reset;
    // ... (باقي ترجمة الجدول)
}

window.onload = () => { loadAllRequests(); };
