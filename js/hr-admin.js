// hr-admin.js - النسخة الاحترافية الشاملة 2026 (دعم كامل للغتين + مراجع + CSV + Charts)

let allRequests = []; 
let statusChart = null;
let deptChart = null;

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

        populateDeptFilter(departments);
        renderTable(allRequests);
        updateCharts(allRequests);
    }, (error) => {
        console.error("Firebase Error: ", error);
    });
}

// 2. تحديث الرسوم البيانية (Charts) مع دعم اللغة
function updateCharts(dataArray) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const statusCounts = { Approved: 0, Pending: 0, Rejected: 0 };
    const deptCounts = {};

    dataArray.forEach(r => {
        if(statusCounts[r.status] !== undefined) statusCounts[r.status]++;
        const d = r.department || (lang === 'ar' ? "غير محدد" : "N/A");
        deptCounts[d] = (deptCounts[d] || 0) + 1;
    });

    if(statusChart) statusChart.destroy();
    if(deptChart) deptChart.destroy();

    const ctxS = document.getElementById('statusChart').getContext('2d');
    statusChart = new Chart(ctxS, {
        type: 'doughnut',
        data: {
            labels: lang === 'ar' ? ['مقبول', 'معلق', 'مرفوض'] : ['Approved', 'Pending', 'Rejected'],
            datasets: [{ data: [statusCounts.Approved, statusCounts.Pending, statusCounts.Rejected], backgroundColor: ['#2ecc71', '#f9ca24', '#eb4d4b'] }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });

    const ctxD = document.getElementById('deptChart').getContext('2d');
    deptChart = new Chart(ctxD, {
        type: 'bar',
        data: {
            labels: Object.keys(deptCounts),
            datasets: [{ 
                label: lang === 'ar' ? 'عدد الطلبات' : 'Requests Count', 
                data: Object.values(deptCounts), 
                backgroundColor: '#4834d4', 
                borderRadius: 5 
            }]
        }
    });
}

// 3. رسم الجدول المطور (يدعم الترجمة اللحظية)
function renderTable(dataArray) {
    const tableBody = document.getElementById('hr-requests-table');
    const lang = localStorage.getItem('preferredLang') || 'ar';

    if (!tableBody) return;
    tableBody.innerHTML = "";

    if (dataArray.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:20px;">${lang === 'ar' ? 'لا توجد بيانات' : 'No data available'}</td></tr>`;
        return;
    }

    dataArray.forEach((data) => {
        // تاريخ الإجازة (من - إلى)
        let dateRange = (data.type === 'vacation') ? 
            `<span style="font-size:11px;">${data.startDate} ⬅ ${data.endDate}</span>` : 
            (data.reqDate || data.startDate || "--");

        // عمود المراجع (المدير)
        const reviewerHtml = data.reviewerName ? `
            <div class="reviewer-info-mini">
                <b>${data.reviewerName}</b>
                <p>${data.reviewerDept || '--'}</p>
            </div>` : `<span style="color:#ccc">--</span>`;

        const row = document.createElement('tr');
        row.style.cursor = "pointer";
        row.innerHTML = `
            <td onclick="event.stopPropagation()"><input type="checkbox" class="row-checkbox" value="${data.id}" onchange="updateBulkDeleteUI()"></td>
            <td onclick="showRequestDetails('${data.id}')">${data.employeeCode || "--"}</td>
            <td onclick="showRequestDetails('${data.id}')"><b>${data.employeeName}</b></td>
            <td onclick="showRequestDetails('${data.id}')"><span class="dept-badge">${data.department || "--"}</span></td>
            <td onclick="showRequestDetails('${data.id}')">${translateType(data.type)}</td>
            <td onclick="showRequestDetails('${data.id}')">${dateRange}</td>
            <td onclick="showRequestDetails('${data.id}')"><span class="badge ${data.status.toLowerCase()}">${translateStatus(data.status)}</span></td>
            <td onclick="showRequestDetails('${data.id}')">${reviewerHtml}</td>
            <td onclick="event.stopPropagation()"><button class="delete-btn" onclick="deleteSingleRequest('${data.id}')">🗑️</button></td>
        `;
        tableBody.appendChild(row);
    });

    document.getElementById('total-count').innerText = dataArray.length;
    document.getElementById('approved-count').innerText = dataArray.filter(r => r.status === "Approved").length;
}

// 4. دالة الرفع (CSV) المصلحة
async function uploadCSV() {
    const fileInput = document.getElementById('csvFile');
    const btn = document.getElementById('btn-upload-start');
    const lang = localStorage.getItem('preferredLang') || 'ar';
    if (!fileInput.files[0]) return alert(lang === 'ar' ? "اختر ملف أولاً" : "Select file first");
    
    btn.innerText = lang === 'ar' ? "جاري المعالجة..." : "Processing...";
    btn.disabled = true;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const lines = e.target.result.split(/\r?\n/).slice(1);
            let count = 0;
            for (let line of lines) {
                const cols = line.split(/[;,]/).map(c => c.replace(/["]/g, "").trim());
                if (cols.length >= 5) {
                    await firebase.firestore().collection("Employee_Database").doc(cols[0]).set({
                        employeeId: cols[0], name: cols[1], phone: cols[2], role: cols[3].toLowerCase(), department: cols[4], activated: false
                    }, { merge: true });
                    count++;
                }
            }
            alert(lang === 'ar' ? `تم رفع ${count} موظف بنجاح` : `Uploaded ${count} employees`);
            fileInput.value = "";
        } catch (err) { alert("Error: " + err.message); }
        finally { btn.innerText = lang === 'ar' ? "ابدأ الرفع والدمج" : "Start Upload"; btn.disabled = false; }
    };
    reader.readAsText(fileInput.files[0], "UTF-8");
}

// 5. نظام الحذف الجماعي
function toggleSelectAll() {
    const isChecked = document.getElementById('selectAll').checked;
    document.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = isChecked);
    updateBulkDeleteUI();
}
function updateBulkDeleteUI() {
    const count = document.querySelectorAll('.row-checkbox:checked').length;
    const btn = document.getElementById('btn-delete-multi');
    const lang = localStorage.getItem('preferredLang') || 'ar';
    btn.style.display = count > 0 ? 'inline-block' : 'none';
    btn.innerText = lang === 'ar' ? `🗑️ حذف المحدد (${count})` : `🗑️ Delete Selected (${count})`;
}
async function deleteSelectedRequests() {
    const ids = Array.from(document.querySelectorAll('.row-checkbox:checked')).map(cb => cb.value);
    const lang = localStorage.getItem('preferredLang') || 'ar';
    if (!confirm(lang === 'ar' ? `حذف ${ids.length} طلب نهائياً؟` : `Delete ${ids.length} requests?`)) return;
    const batch = firebase.firestore().batch();
    ids.forEach(id => batch.delete(firebase.firestore().collection("HR_Requests").doc(id)));
    await batch.commit();
    document.getElementById('selectAll').checked = false;
    updateBulkDeleteUI();
}

// 6. مودال التفاصيل (الكارت الشيك)
function showRequestDetails(id) {
    const data = allRequests.find(r => r.id === id);
    if (!data) return;
    const lang = localStorage.getItem('preferredLang') || 'ar';

    document.getElementById('modal-emp-name').innerText = data.employeeName;
    document.getElementById('det-name').innerText = data.employeeName;
    document.getElementById('det-code').innerText = data.employeeCode;
    document.getElementById('det-dept').innerText = data.department;
    document.getElementById('det-type').innerText = translateType(data.type) + (data.vacationType ? ` (${data.vacationType})` : "");
    document.getElementById('det-dates').innerText = (data.type === 'vacation') ? `${data.startDate} إلى ${data.endDate}` : data.reqDate;
    document.getElementById('det-reason').innerText = data.reason || "--";
    document.getElementById('det-manager-note').innerText = data.managerComment || (lang === 'ar' ? "لا يوجد رد" : "No comment");
    document.getElementById('det-reviewer-name').innerText = data.reviewerName || "--";
    document.getElementById('det-reviewer-dept').innerText = data.reviewerDept || "--";

    const container = document.getElementById('det-attachment-container');
    container.innerHTML = "";
    if (data.fileBase64) {
        if (data.fileBase64.includes("image")) {
            container.innerHTML = `<img src="${data.fileBase64}" style="max-width:100%; border-radius:15px; margin-top:10px;">`;
        } else {
            container.innerHTML = `<button onclick="viewFileAdmin('${data.id}')" class="btn-export" style="margin-top:10px; background:#2a5298">${lang === 'ar' ? 'فتح المرفق' : 'Open Attachment'}</button>
            <textarea id="admin-data-${data.id}" style="display:none;">${data.fileBase64}</textarea>`;
        }
    }
    document.getElementById('detailsModal').style.display = "flex";
}

function closeDetailsModal() { document.getElementById('detailsModal').style.display = "none"; }

// 7. الفلترة
function filterTable() {
    const dFrom = document.getElementById('filter-date-from').value;
    const dTo = document.getElementById('filter-date-to').value;
    const dept = document.getElementById('filter-dept-dropdown').value;
    const status = document.getElementById('filter-status').value;
    const search = document.getElementById('filter-general').value.toLowerCase();

    const filtered = allRequests.filter(req => {
        const rDate = req.startDate || req.reqDate || "";
        const pool = (req.employeeName + req.employeeCode + (req.department || "")).toLowerCase();
        return (!dFrom || rDate >= dFrom) && (!dTo || rDate <= dTo) && (!dept || req.department === dept) && (!status || req.status === status) && (!search || pool.includes(search));
    });
    renderTable(filtered);
    updateCharts(filtered);
}

function populateDeptFilter(depts) {
    const dropdown = document.getElementById('filter-dept-dropdown');
    const val = dropdown.value;
    dropdown.innerHTML = `<option value="">${localStorage.getItem('preferredLang')==='en'?'All Depts':'الكل'}</option>`;
    depts.forEach(d => dropdown.innerHTML += `<option value="${d}">${d}</option>`);
    dropdown.value = val;
}

function resetFilters() {
    document.querySelectorAll('.filter-panel input, .filter-panel select').forEach(i => i.value = "");
    renderTable(allRequests);
    updateCharts(allRequests);
}

function viewFileAdmin(id) {
    const data = document.getElementById(`admin-data-${id}`).value;
    const win = window.open();
    win.document.write(`<html><body style="margin:0"><iframe src="${data}" frameborder="0" style="width:100%; height:100vh;"></iframe></body></html>`);
}

function deleteSingleRequest(id) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    if(confirm(lang === 'ar' ? "حذف؟" : "Delete?")) firebase.firestore().collection("HR_Requests").doc(id).delete();
}

function translateType(t) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const map = { vacation: {ar:"إجازة", en:"Vacation"}, late: {ar:"تأخير", en:"Late"}, exit: {ar:"خروج", en:"Exit"} };
    return map[t] ? map[t][lang] : t;
}

function translateStatus(s) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const map = { Approved: {ar:"مقبول", en:"Approved"}, Rejected: {ar:"مرفوض", en:"Rejected"}, Pending: {ar:"معلق", en:"Pending"} };
    return map[s] ? map[s][lang] : s;
}

function exportToExcel() {
    let csv = "\uFEFFCode,Name,Dept,Type,Date,Status,Reviewer\n";
    allRequests.forEach(r => csv += `${r.employeeCode},${r.employeeName},${r.department},${r.type},${r.startDate || r.reqDate},${r.status},${r.reviewerName || '--'}\n`);
    const link = document.createElement('a'); link.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv); link.download = `HR_Report_Tamkeen.csv`; link.click();
}

// 8. نظام اللغة الموحد (الذي يتم استدعاؤه من lang-manager.js)
function updatePageContent(lang) {
    const trans = {
        ar: {
            title: "إدارة HR - تمكين", back: "رجوع", total: "إجمالي كافة الطلبات", approved: "طلبات تمت الموافقة عليها", upload: "تحديث سجل الموظفين (ملف CSV)", btnUpload: "ابدأ الرفع والدمج",
            chartStatus: "توزيع حالات الطلبات", chartDept: "أكثر الأقسام طلباً", code: "الكود", name: "الموظف", dept: "القسم", type: "نوع الطلب", dates: "تاريخ الإجازة (من - إلى)", status: "الحالة", reviewer: "تم الإجراء بواسطة", action: "إجراء"
        },
        en: {
            title: "HR Admin - Tamkeen", back: "Back", total: "Total Requests", approved: "Approved Requests", upload: "Update Employees Record (CSV)", btnUpload: "Start Upload & Merge",
            chartStatus: "Requests Status Distribution", chartDept: "Top Departments", code: "Code", name: "Employee", dept: "Dept", type: "Type", dates: "Leave Dates (From-To)", status: "Status", reviewer: "Reviewed By", action: "Action"
        }
    };
    const t = trans[lang] || trans.ar;

    // تحديث العناوين
    const set = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };
    set('txt-title', t.title); set('btn-back-txt', t.back); set('txt-total', t.total); set('txt-approved', t.approved); set('lbl-upload', t.upload); set('btn-upload-start', t.btnUpload);
    set('txt-chart-status', t.chartStatus); set('txt-chart-dept', t.chartDept);
    
    // تحديث رءوس الجدول
    set('th-code', t.code); set('th-name', t.name); set('th-dept', t.dept); set('th-type', t.type); set('th-dates', t.dates); set('th-status', t.status); set('th-reviewer', t.reviewer); set('th-action', t.action);

    // إعادة رندر الجدول والشارت لتحديث البيانات الداخلية
    renderTable(allRequests);
    updateCharts(allRequests);
}

// التشغيل عند التحميل
window.onload = () => { loadAllRequests(); };
window.onclick = (e) => { if (e.target.className === 'modal') closeDetailsModal(); };
