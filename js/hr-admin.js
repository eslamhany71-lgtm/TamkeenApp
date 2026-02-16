// hr-admin.js - المحرك الرئيسي للوحة تحكم HR (إصدار تمكين الموحد 2026)

let allRequests = []; // مصفوفة لتخزين كافة البيانات الخام

// 1. جلب البيانات والتحميل الأولي
function loadAllRequests() {
    console.log("جاري مزامنة بيانات HR...");
    firebase.firestore().collection("HR_Requests").orderBy("submittedAt", "desc").onSnapshot((snapshot) => {
        allRequests = [];
        let departments = new Set(); // لتجميع الأقسام الفريدة

        snapshot.forEach(doc => {
            const data = doc.data();
            allRequests.push({ id: doc.id, ...data });
            if (data.department) departments.add(data.department);
        });

        // تعبئة قائمة الأقسام المنسدلة (Dropdown) تلقائياً
        populateDeptFilter(departments);
        
        // عرض البيانات في الجدول
        renderTable(allRequests);
    }, (error) => {
        console.error("خطأ في جلب البيانات: ", error);
    });
}

// 2. تعبئة فلتر الأقسام
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

// 3. رسم الجدول (The Engine)
function renderTable(dataArray) {
    const tableBody = document.getElementById('hr-requests-table');
    const totalCountEl = document.getElementById('total-count');
    const approvedCountEl = document.getElementById('approved-count');
    const lang = localStorage.getItem('preferredLang') || 'ar';

    if (!tableBody) return;
    tableBody.innerHTML = "";
    let total = 0, approved = 0;

    dataArray.forEach((data) => {
        total++;
        if (data.status === "Approved") approved++;

        // معالجة نوع الطلب (إجازة سنوية، مرضية...)
        const displayType = translateType(data.type) + (data.vacationType ? ` (${data.vacationType})` : "");
        
        // أيقونة المرفق
        const attachment = data.fileBase64 ? 
            `<span class="attach-icon" onclick="viewFileAdmin('${data.id}')">📎</span>
             <textarea id="admin-data-${data.id}" style="display:none;">${data.fileBase64}</textarea>` : "";

        // بيانات المراجع (المدير)
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
            <td><button class="delete-btn" onclick="deleteRequest('${data.id}')">${lang === 'ar' ? 'حذف' : 'Delete'}</button></td>
        `;
        tableBody.appendChild(row);
    });

    if (totalCountEl) totalCountEl.innerText = total;
    if (approvedCountEl) approvedCountEl.innerText = approved;
    
    // إعادة تطبيق اللغة بعد رسم الجدول لضمان ترجمة أي نصوص ثابتة
    applyLanguage(lang);
}

// 4. محرك الفلترة (الذي سألت عنه)
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

// 5. إعادة ضبط الفلاتر
function resetFilters() {
    document.getElementById('filter-date-from').value = "";
    document.getElementById('filter-date-to').value = "";
    document.getElementById('filter-dept-dropdown').value = "";
    document.getElementById('filter-status').value = "";
    document.getElementById('filter-general').value = "";
    renderTable(allRequests);
}

// 6. دوال المساعدة (الترجمة والعرض)
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

function viewFileAdmin(id) {
    const data = document.getElementById(`admin-data-${id}`).value;
    const win = window.open();
    win.document.write(`<html><body style="margin:0"><iframe src="${data}" frameborder="0" style="width:100%; height:100vh;"></iframe></body></html>`);
}

function deleteRequest(id) {
    const msg = localStorage.getItem('preferredLang') === 'ar' ? "هل أنت متأكد من الحذف؟" : "Are you sure?";
    if(confirm(msg)) firebase.firestore().collection("HR_Requests").doc(id).delete();
}

// 7. تصدير البيانات لـ Excel
function exportToExcel() {
    let csv = "\uFEFFCode,Name,Job,Department,RequestType,Date,Status,Reviewer\n";
    allRequests.forEach(r => {
        csv += `${r.employeeCode},${r.employeeName},${r.jobTitle},${r.department},${r.type},${r.startDate || r.reqDate},${r.status},${r.reviewerName || '--'}\n`;
    });
    const link = document.createElement('a');
    link.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
    link.download = `Tamkeen_HR_Report_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
}

// 8. نظام اللغة (المدمج لحل مشكلة عدم الترجمة)
function applyLanguage(lang) {
    const trans = {
        ar: {
            title: "إدارة HR - تمكين", back: "رجوع", total: "إجمالي الطلبات", approved: "المقبولة",
            code: "كود", name: "الموظف", job: "الوظيفة", dept: "القسم", type: "النوع", date: "التاريخ", status: "الحالة", reviewer: "المراجع", action: "إجراء"
        },
        en: {
            title: "HR Dashboard - Tamkeen", back: "Back", total: "Total Requests", approved: "Approved",
            code: "ID", name: "Employee", job: "Title", dept: "Dept", type: "Type", date: "Date", status: "Status", reviewer: "Reviewed By", action: "Action"
        }
    };
    const t = trans[lang] || trans.ar;
    
    // تحديث العناوين
    const el = (id, text) => { if(document.getElementById(id)) document.getElementById(id).innerText = text; };
    el('txt-title', t.title);
    el('btn-back-txt', t.back);
    el('txt-total', t.total);
    el('txt-approved', t.approved);
    el('th-code', t.code); el('th-name', t.name); el('th-job', t.job); el('th-dept', t.dept);
    el('th-type', t.type); el('th-date', t.date); el('th-status', t.status); el('th-reviewer', t.reviewer); el('th-action', t.action);
}

// 9. تشغيل عند التحميل
window.onload = () => {
    loadAllRequests();
    applyLanguage(localStorage.getItem('preferredLang') || 'ar');
};
