// hr-admin.js - النسخة النهائية المصلحة 2026 (CSV FIX + Charts + Bulk Delete)

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

// 2. تحديث الرسوم البيانية (Charts)
function updateCharts(dataArray) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const statusCounts = { Approved: 0, Pending: 0, Rejected: 0 };
    const deptCounts = {};

    dataArray.forEach(r => {
        if(statusCounts[r.status] !== undefined) statusCounts[r.status]++;
        const d = r.department || "غير محدد";
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

        let dateRange = (data.type === 'vacation') ? 
            `<span style="font-size:11px;">${data.startDate} ⬅ ${data.endDate}</span>` : 
            (data.reqDate || data.startDate || "--");

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

// 4. دالة رفع ملف الـ CSV (تم إصلاحها بالكامل)
async function uploadCSV() {
    const fileInput = document.getElementById('csvFile');
    const btn = document.getElementById('btn-upload-start');
    const file = fileInput.files[0];
    
    if (!file) {
        alert("يرجى اختيار ملف CSV أولاً");
        return;
    }

    btn.innerText = "جاري المعالجة...";
    btn.disabled = true;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const text = e.target.result;
            const lines = text.split(/\r?\n/);
            let successCount = 0;

            // نبدأ من السطر الثاني (index 1) لتخطي العناوين
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                // دعم الفاصلة العادية والفاصلة المنقوطة
                const cols = line.split(/[;,]/).map(c => c.replace(/["]/g, "").trim());

                if (cols.length >= 5) {
                    const empCode = cols[0]; // الكود
                    const empData = {
                        employeeId: cols[0],
                        name: cols[1],
                        phone: cols[2],
                        role: cols[3].toLowerCase(),
                        department: cols[4],
                        activated: false
                    };

                    await firebase.firestore().collection("Employee_Database").doc(empCode).set(empData, { merge: true });
                    successCount++;
                }
            }
            alert(`تم بنجاح رفع وتحديث بيانات ${successCount} موظف.`);
            fileInput.value = ""; // تصفير خانة الملف
        } catch (err) {
            console.error(err);
            alert("حدث خطأ أثناء الرفع: " + err.message);
        } finally {
            btn.innerText = "ابدأ الرفع والدمج";
            btn.disabled = false;
        }
    };
    reader.readAsText(file, "UTF-8");
}

// 5. نظام الحذف الجماعي (Bulk Delete)
function toggleSelectAll() {
    const masterCb = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('.row-checkbox');
    checkboxes.forEach(cb => cb.checked = masterCb.checked);
    updateBulkDeleteUI();
}

function updateBulkDeleteUI() {
    const selectedCount = document.querySelectorAll('.row-checkbox:checked').length;
    const delBtn = document.getElementById('btn-delete-multi');
    if (delBtn) {
        delBtn.style.display = selectedCount > 0 ? 'inline-block' : 'none';
        delBtn.innerText = `🗑️ حذف المحدد (${selectedCount})`;
    }
}

async function deleteSelectedRequests() {
    const selectedCbs = document.querySelectorAll('.row-checkbox:checked');
    if (selectedCbs.length === 0) return;

    if (confirm(`هل أنت متأكد من حذف ${selectedCbs.length} طلب نهائياً؟`)) {
        const batch = firebase.firestore().batch();
        selectedCbs.forEach(cb => {
            const ref = firebase.firestore().collection("HR_Requests").doc(cb.value);
            batch.delete(ref);
        });

        try {
            await batch.commit();
            document.getElementById('selectAll').checked = false;
            updateBulkDeleteUI();
            alert("تم الحذف بنجاح");
        } catch (e) { alert("خطأ أثناء الحذف: " + e.message); }
    }
}

// 6. كارت تفاصيل الطلب (Details Modal)
function showRequestDetails(id) {
    const data = allRequests.find(r => r.id === id);
    if (!data) return;

    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.getElementById('modal-emp-name').innerText = data.employeeName;
    document.getElementById('det-code').innerText = data.employeeCode;
    document.getElementById('det-dept').innerText = data.department;
    document.getElementById('det-type').innerText = translateType(data.type) + (data.vacationType ? ` (${data.vacationType})` : "");
    document.getElementById('det-dates').innerText = (data.type === 'vacation') ? `${data.startDate} إلى ${data.endDate}` : (data.reqDate || "--");
    document.getElementById('det-reason').innerText = data.reason || "لا يوجد أسباب مكتوبة";
    document.getElementById('det-manager-note').innerText = data.managerComment || (lang === 'ar' ? "لم يتم كتابة رد بعد" : "No manager reply yet");

    const attachArea = document.getElementById('det-attachment-container');
    attachArea.innerHTML = "";
    if (data.fileBase64) {
        if (data.fileBase64.includes("image")) {
            attachArea.innerHTML = `<img src="${data.fileBase64}" style="max-width:100%; border-radius:15px; margin-top:15px; border:1px solid #ddd; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">`;
        } else {
            attachArea.innerHTML = `<button onclick="viewFileAdmin('${data.id}')" class="btn-export" style="background:#2a5298; margin-top:15px; width:100%;">📄 فتح المرفق (PDF/ملف)</button>
                                   <textarea id="admin-data-${data.id}" style="display:none;">${data.fileBase64}</textarea>`;
        }
    } else {
        attachArea.innerHTML = `<p style="color:#999; margin-top:15px; font-size:13px;">🚫 لا يوجد مرفقات لهذا الطلب</p>`;
    }

    document.getElementById('detailsModal').style.display = "flex";
}

function closeDetailsModal() {
    document.getElementById('detailsModal').style.display = "none";
}

// 7. محرك الفلترة والبحث
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
    if (!dropdown) return;
    const currentVal = dropdown.value;
    dropdown.innerHTML = `<option value="">الكل</option>`;
    depts.forEach(d => dropdown.innerHTML += `<option value="${d}">${d}</option>`);
    dropdown.value = currentVal;
}

function resetFilters() {
    document.getElementById('filter-date-from').value = "";
    document.getElementById('filter-date-to').value = "";
    document.getElementById('filter-dept-dropdown').value = "";
    document.getElementById('filter-status').value = "";
    document.getElementById('filter-general').value = "";
    renderTable(allRequests);
    updateCharts(allRequests);
}

function viewFileAdmin(id) {
    const data = document.getElementById(`admin-data-${id}`).value;
    const win = window.open();
    win.document.write(`<html><body style="margin:0"><iframe src="${data}" frameborder="0" style="width:100%; height:100vh;"></iframe></body></html>`);
}

function deleteRequest(id) {
    if(confirm("هل أنت متأكد من الحذف؟")) firebase.firestore().collection("HR_Requests").doc(id).delete();
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
    link.download = `HR_Report_Tamkeen.csv`;
    link.click();
}

function applyLanguage(lang) {
    const trans = {
        ar: { title: "إدارة HR - تمكين", code: "الكود", name: "الموظف", dept: "القسم", type: "النوع", dates: "تاريخ الإجازة (من - إلى)", status: "الحالة", action: "إجراء" },
        en: { title: "HR Admin - Tamkeen", code: "Code", name: "Employee", dept: "Dept", type: "Type", dates: "Leave Dates (From-To)", status: "Status", action: "Action" }
    };
    const t = trans[lang] || trans.ar;
    const set = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };
    set('txt-title', t.title); set('th-code', t.code); set('th-name', t.name); set('th-dept', t.dept); set('th-type', t.type); set('th-dates', t.dates); set('th-status', t.status); set('th-action', t.action);
}

window.onload = () => { loadAllRequests(); };
window.onclick = (e) => { if (e.target.className === 'modal') closeDetailsModal(); };
