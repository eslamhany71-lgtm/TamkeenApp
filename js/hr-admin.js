// hr-admin.js - النسخة الاحترافية الشاملة (الرفع + الفلترة + المراجع + اللغات)

let allRequests = []; 

// 1. جلب البيانات من Firestore (تحديث لحظي)
function loadAllRequests() {
    console.log("جاري مزامنة بيانات HR...");
    firebase.firestore().collection("HR_Requests").orderBy("submittedAt", "desc").onSnapshot((snapshot) => {
        allRequests = [];
        let departments = new Set(); 

        snapshot.forEach(doc => {
            const data = doc.data();
            allRequests.push({ id: doc.id, ...data });
            if (data.department) departments.add(data.department);
        });

        // تعبئة قائمة الأقسام في الفلتر تلقائياً
        populateDeptFilter(departments);
        // عرض الجدول
        renderTable(allRequests);
    }, (error) => {
        console.error("Firebase Error: ", error);
    });
}

// 2. تعبئة قائمة الأقسام
function populateDeptFilter(depts) {
    const dropdown = document.getElementById('filter-dept-dropdown');
    if (!dropdown) return;
    const currentVal = dropdown.value;
    dropdown.innerHTML = `<option value="">الكل</option>`;
    depts.forEach(dept => {
        dropdown.innerHTML += `<option value="${dept}">${dept}</option>`;
    });
    dropdown.value = currentVal;
}

// 3. رسم الجدول وتحديث العدادات
function renderTable(dataArray) {
    const tableBody = document.getElementById('hr-requests-table');
    const totalCountEl = document.getElementById('total-count');
    const approvedCountEl = document.getElementById('approved-count');
    const lang = localStorage.getItem('preferredLang') || 'ar';

    if (!tableBody) return;
    tableBody.innerHTML = "";
    let total = 0, approved = 0;

    if (dataArray.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:20px;">لا توجد بيانات متاحة</td></tr>`;
        if (totalCountEl) totalCountEl.innerText = "0";
        if (approvedCountEl) approvedCountEl.innerText = "0";
        return;
    }

    dataArray.forEach((data) => {
        total++;
        if (data.status === "Approved") approved++;

        // دمج نوع الطلب مع النوع الفرعي (إجازة سنوية/مرضية)
        const displayType = translateType(data.type) + (data.vacationType ? ` (${data.vacationType})` : "");
        
        // المرفقات
        const attachment = data.fileBase64 ? 
            `<span class="attach-icon" onclick="viewFileAdmin('${data.id}')" title="عرض المرفق">📎</span>
             <textarea id="admin-data-${data.id}" style="display:none;">${data.fileBase64}</textarea>` : "";

        // عمود "تم الإجراء بواسطة" (بيانات المراجع)
        const reviewerHtml = data.reviewerName ? `
            <div class="reviewer-card">
                <b>${data.reviewerName}</b>
                <p>${data.reviewerDept} | ${data.reviewerCode}</p>
            </div>` : `<span style="color:#ccc">--</span>`;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${data.employeeCode || "--"}</td>
            <td><b>${data.employeeName}</b></td>
            <td>${data.jobTitle || "--"}</td>
            <td><span class="dept-badge">${data.department || "--"}</span></td>
            <td>${displayType} ${attachment}</td>
            <td>${data.startDate || data.reqDate || "--"}</td>
            <td><span class="badge ${data.status.toLowerCase()}">${translateStatus(data.status)}</span></td>
            <td>${reviewerHtml}</td>
            <td><button class="delete-btn" onclick="deleteRequest('${data.id}')">حذف</button></td>
        `;
        tableBody.appendChild(row);
    });

    if (totalCountEl) totalCountEl.innerText = total;
    if (approvedCountEl) approvedCountEl.innerText = approved;
    
    // تطبيق اللغة على العناوين الثابتة
    applyLanguage(lang);
}

// 4. دالة رفع بيانات الموظفين CSV (اللي كانت ناقصة وعملت خطأ)
async function uploadCSV() {
    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];
    const lang = localStorage.getItem('preferredLang') || 'ar';
    
    if (!file) {
        alert(lang === 'ar' ? "يرجى اختيار ملف CSV أولاً" : "Please select CSV file first");
        return;
    }
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const text = e.target.result;
            const rows = text.split(/\r?\n/);
            let successCount = 0;

            // نبدأ من 1 لتخطي سطر العنوان (Header)
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i].trim();
                if (!row) continue;

                // تقسيم الأعمدة (كود, اسم, موبايل, رول, قسم)
                const cols = row.split(/[;,]/).map(c => c.replace(/["]/g, "").trim());
                
                if (cols.length >= 5) {
                    const empCode = cols[0];
                    await firebase.firestore().collection("Employee_Database").doc(empCode).set({
                        employeeId: cols[0],
                        name: cols[1],
                        phone: cols[2],
                        role: cols[3].toLowerCase(),
                        department: cols[4],
                        activated: false
                    }, { merge: true });
                    successCount++;
                }
            }
            alert(lang === 'ar' ? `تم رفع وتحديث ${successCount} موظف بنجاح` : `Successfully uploaded ${successCount} employees`);
            fileInput.value = "";
        } catch (err) {
            console.error(err);
            alert("Error processing CSV: " + err.message);
        }
    };
    reader.readAsText(file, "UTF-8");
}

// 5. محرك الفلترة (تاريخ، قسم، حالة، بحث عام)
function filterTable() {
    const dateFrom = document.getElementById('filter-date-from').value;
    const dateTo = document.getElementById('filter-date-to').value;
    const deptFilter = document.getElementById('filter-dept-dropdown').value;
    const statusFilter = document.getElementById('filter-status').value;
    const searchFilter = document.getElementById('filter-general').value.toLowerCase();

    const filtered = allRequests.filter(req => {
        const reqDate = req.startDate || req.reqDate || "";
        const reqDept = (req.department || "");
        const reqStatus = req.status || "";
        const searchPool = (req.employeeName + req.employeeCode + req.jobTitle + req.department).toLowerCase();

        const matchDate = (!dateFrom || reqDate >= dateFrom) && (!dateTo || reqDate <= dateTo);
        const matchDept = !deptFilter || reqDept === deptFilter;
        const matchStatus = !statusFilter || reqStatus === statusFilter;
        const matchSearch = !searchFilter || searchPool.includes(searchFilter);

        return matchDate && matchDept && matchStatus && matchSearch;
    });

    renderTable(filtered);
}

// 6. إعادة ضبط الفلاتر
function resetFilters() {
    document.getElementById('filter-date-from').value = "";
    document.getElementById('filter-date-to').value = "";
    document.getElementById('filter-dept-dropdown').value = "";
    document.getElementById('filter-status').value = "";
    document.getElementById('filter-general').value = "";
    renderTable(allRequests);
}

// 7. عرض المرفقات (Base64)
function viewFileAdmin(id) {
    const data = document.getElementById(`admin-data-${id}`).value;
    const win = window.open();
    win.document.write(`<html><body style="margin:0"><iframe src="${data}" frameborder="0" style="width:100%; height:100vh;"></iframe></body></html>`);
}

// 8. حذف سجل
function deleteRequest(id) {
    if(confirm("هل أنت متأكد من الحذف؟")) {
        firebase.firestore().collection("HR_Requests").doc(id).delete();
    }
}

// 9. التحويلات اللغوية (Type & Status)
function translateType(t) {
    const l = localStorage.getItem('preferredLang') || 'ar';
    const map = { vacation: {ar:"إجازة", en:"Vacation"}, late: {ar:"تأخير", en:"Late"}, exit: {ar:"خروج", en:"Exit"} };
    return map[t] ? map[t][l] : t;
}

function translateStatus(s) {
    const l = localStorage.getItem('preferredLang') || 'ar';
    const map = { Approved: {ar:"مقبول", en:"Approved"}, Rejected: {ar:"مرفوض", en:"Rejected"}, Pending: {ar:"معلق", en:"Pending"} };
    return map[s] ? map[s][l] : s;
}

// 10. تصدير للـ Excel
function exportToExcel() {
    let csv = "\uFEFFCode,Name,Job,Department,Type,Date,Status,Reviewer\n";
    allRequests.forEach(r => {
        csv += `${r.employeeCode},${r.employeeName},${r.jobTitle},${r.department},${r.type},${r.startDate || r.reqDate},${r.status},${r.reviewerName || '--'}\n`;
    });
    const link = document.createElement('a');
    link.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
    link.download = `HR_Report_Tamkeen.csv`;
    link.click();
}

// 11. نظام اللغات (لترجمة العناوين الثابتة)
function applyLanguage(lang) {
    const trans = {
        ar: {
            title: "إدارة HR - تمكين", back: "رجوع", total: "إجمالي الطلبات", approved: "المقبولة",
            code: "الكود", name: "الموظف", job: "الوظيفة", dept: "القسم", type: "نوع الطلب", date: "التاريخ", status: "الحالة", reviewer: "تم الإجراء بواسطة", action: "إجراء"
        },
        en: {
            title: "HR Admin - Tamkeen", back: "Back", total: "Total Requests", approved: "Approved",
            code: "Code", name: "Employee", job: "Title", dept: "Dept", type: "Type", date: "Date", status: "Status", reviewer: "Reviewed By", action: "Action"
        }
    };
    const t = trans[lang] || trans.ar;
    
    const set = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };
    set('txt-title', t.title);
    set('btn-back-txt', t.back);
    set('txt-total', t.total);
    set('txt-approved', t.approved);
    set('th-code', t.code); set('th-name', t.name); set('th-job', t.job); set('th-dept', t.dept);
    set('th-type', t.type); set('th-date', t.date); set('th-status', t.status); set('th-reviewer', t.reviewer); set('th-action', t.action);
}

// 12. عند التشغيل
window.onload = () => {
    loadAllRequests();
    applyLanguage(localStorage.getItem('preferredLang') || 'ar');
};
