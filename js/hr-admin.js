// hr-admin.js - النسخة الاحترافية المتكاملة 2026

let allRequests = []; 
let statusChart = null;
let deptChart = null;

// 1. جلب البيانات من Firestore (تحديث لحظي)
function loadAllRequests() {
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

// 2. تحديث الرسوم البيانية (Charts)
function updateCharts(dataArray) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const statusCounts = { Approved: 0, Pending: 0, Rejected: 0 };
    const deptCounts = {};

    dataArray.forEach(r => {
        if(statusCounts[r.status] !== undefined) statusCounts[r.status]++;
        const d = r.department || "N/A";
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
            datasets: [{ label: lang === 'ar' ? 'الطلبات' : 'Requests', data: Object.values(deptCounts), backgroundColor: '#4834d4', borderRadius: 5 }]
        }
    });
}

// 3. رسم الجدول المطور (مع الاختيار والتواريخ)
function renderTable(dataArray) {
    const tableBody = document.getElementById('hr-requests-table');
    const totalCountEl = document.getElementById('total-count');
    const approvedCountEl = document.getElementById('approved-count');
    const lang = localStorage.getItem('preferredLang') || 'ar';

    if (!tableBody) return;
    tableBody.innerHTML = "";
    let approved = 0;

    dataArray.forEach((data) => {
        if (data.status === "Approved") approved++;

        // دمج التواريخ (من - إلى)
        let dateRange = "";
        if (data.type === 'vacation') {
            dateRange = `<span style="font-size:11px;">${data.startDate} ⬅ ${data.endDate}</span>`;
        } else {
            dateRange = data.reqDate || data.startDate || "--";
        }

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
            <td onclick="event.stopPropagation()"><button class="delete-btn" onclick="deleteRequest('${data.id}')">🗑️</button></td>
        `;
        tableBody.appendChild(row);
    });

    if (totalCountEl) totalCountEl.innerText = dataArray.length;
    if (approvedCountEl) approvedCountEl.innerText = approved;
    applyLanguage(lang);
}

// 4. نظام الحذف الجماعي (Bulk Delete)
function toggleSelectAll() {
    const isChecked = document.getElementById('selectAll').checked;
    document.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = isChecked);
    updateBulkDeleteUI();
}

function updateBulkDeleteUI() {
    const selectedCount = document.querySelectorAll('.row-checkbox:checked').length;
    const btn = document.getElementById('btn-delete-multi');
    btn.style.display = selectedCount > 0 ? 'inline-block' : 'none';
}

async function deleteSelectedRequests() {
    const selectedIds = Array.from(document.querySelectorAll('.row-checkbox:checked')).map(cb => cb.value);
    if (!confirm(`حذف ${selectedIds.length} طلب نهائياً؟`)) return;

    const batch = firebase.firestore().batch();
    selectedIds.forEach(id => batch.delete(firebase.firestore().collection("HR_Requests").doc(id)));
    
    await batch.commit();
    document.getElementById('selectAll').checked = false;
    updateBulkDeleteUI();
}

// 5. مودال التفاصيل (الكارت الشيك)
function showRequestDetails(id) {
    const data = allRequests.find(r => r.id === id);
    if (!data) return;

    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.getElementById('modal-emp-name').innerText = data.employeeName;
    document.getElementById('det-code').innerText = data.employeeCode;
    document.getElementById('det-dept').innerText = data.department;
    document.getElementById('det-type').innerText = translateType(data.type);
    document.getElementById('det-dates').innerText = (data.type === 'vacation') ? `${data.startDate} إلى ${data.endDate}` : data.reqDate;
    document.getElementById('det-reason').innerText = data.reason || "لا يوجد سبب مكتوب";
    document.getElementById('det-manager-note').innerText = data.managerComment || "لا يوجد رد من المدير حالياً";

    const container = document.getElementById('det-attachment-container');
    container.innerHTML = "";
    if (data.fileBase64) {
        if (data.fileBase64.includes("image")) {
            container.innerHTML = `<img src="${data.fileBase64}" style="max-width:100%; border-radius:10px; margin-top:15px; border:1px solid #ddd;">`;
        } else {
            container.innerHTML = `<button onclick="viewFileAdmin('${data.id}')" class="btn-upload" style="margin-top:15px; background:var(--primary)">📄 فتح المرفق (PDF/ملف)</button>
                                   <textarea id="admin-data-${data.id}" style="display:none;">${data.fileBase64}</textarea>`;
        }
    } else { container.innerHTML = "<p style='color:#999; margin-top:15px;'>لا يوجد مرفقات لهذا الطلب</p>"; }

    document.getElementById('detailsModal').style.display = "flex";
}

function closeDetailsModal() { document.getElementById('detailsModal').style.display = "none"; }

// 6. دوال الرفع والفلترة واللغات (نفس الأصلية)
async function uploadCSV() {
    const file = document.getElementById('csvFile').files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        const rows = e.target.result.split(/\r?\n/).slice(1);
        for (let row of rows) {
            const cols = row.split(/[;,]/).map(c => c.replace(/["]/g, "").trim());
            if (cols.length >= 5) {
                await firebase.firestore().collection("Employee_Database").doc(cols[0]).set({
                    employeeId: cols[0], name: cols[1], phone: cols[2], role: cols[3].toLowerCase(), department: cols[4], activated: false
                }, { merge: true });
            }
        }
        alert("تم التحديث بنجاح");
    };
    reader.readAsText(file, "UTF-8");
}

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
    dropdown.innerHTML = `<option value="">الكل</option>`;
    depts.forEach(d => dropdown.innerHTML += `<option value="${d}">${d}</option>`);
}

function resetFilters() {
    document.querySelectorAll('.filter-item input, .filter-item select').forEach(i => i.value = "");
    renderTable(allRequests);
    updateCharts(allRequests);
}

function viewFileAdmin(id) {
    const data = document.getElementById(`admin-data-${id}`).value;
    const win = window.open();
    win.document.write(`<html><body style="margin:0"><iframe src="${data}" frameborder="0" style="width:100%; height:100vh;"></iframe></body></html>`);
}

function deleteRequest(id) {
    if(confirm("حذف الطلب؟")) firebase.firestore().collection("HR_Requests").doc(id).delete();
}

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

function exportToExcel() {
    let csv = "\uFEFFCode,Name,Dept,Type,Date,Status\n";
    allRequests.forEach(r => csv += `${r.employeeCode},${r.employeeName},${r.department},${r.type},${r.startDate || r.reqDate},${r.status}\n`);
    const link = document.createElement('a');
    link.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
    link.download = `HR_Report.csv`;
    link.click();
}

function applyLanguage(lang) {
    const trans = {
        ar: { title: "إدارة HR", code: "الكود", name: "الموظف", dept: "القسم", type: "النوع", dates: "تاريخ الإجازة (من - إلى)", status: "الحالة", action: "إجراء" },
        en: { title: "HR Admin", code: "Code", name: "Employee", dept: "Dept", type: "Type", dates: "Leave Dates (From-To)", status: "Status", action: "Action" }
    };
    const t = trans[lang] || trans.ar;
    if(document.getElementById('th-code')) document.getElementById('th-code').innerText = t.code;
    if(document.getElementById('th-name')) document.getElementById('th-name').innerText = t.name;
    if(document.getElementById('th-dept')) document.getElementById('th-dept').innerText = t.dept;
    if(document.getElementById('th-type')) document.getElementById('th-type').innerText = t.type;
    if(document.getElementById('th-dates')) document.getElementById('th-dates').innerText = t.dates;
    if(document.getElementById('th-status')) document.getElementById('th-status').innerText = t.status;
    if(document.getElementById('th-action')) document.getElementById('th-action').innerText = t.action;
}

window.onload = () => { loadAllRequests(); };
window.onclick = (e) => { if (e.target.className === 'modal') closeDetailsModal(); };
