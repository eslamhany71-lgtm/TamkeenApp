// hr-admin.js - لوحة تحكم الموارد البشرية (النسخة الكاملة مع المرفقات المجانية)

let allRequests = []; 

function loadAllRequests() {
    firebase.firestore().collection("HR_Requests").orderBy("submittedAt", "desc").onSnapshot((snapshot) => {
        allRequests = [];
        snapshot.forEach(doc => {
            allRequests.push({ id: doc.id, ...doc.data() });
        });
        renderTable(allRequests);
    });
}

function renderTable(dataArray) {
    const tableBody = document.getElementById('hr-requests-table');
    if (!tableBody) return;
    tableBody.innerHTML = ""; 

    dataArray.forEach((data) => {
        const dateFrom = data.startDate || data.reqDate || "--";
        
        // أيقونة المرفق إذا وجد
        const attachmentIcon = data.fileBase64 ? 
            `<span onclick="viewFileAdmin('${data.id}')" style="cursor:pointer; font-size:1.2em; margin-left:5px;" title="عرض المرفق">📎</span>
             <div id="admin-data-${data.id}" style="display:none;">${data.fileBase64}</div>` : "";

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${data.employeeCode || "--"}</td>
            <td><strong>${data.employeeName || "غير معروف"}</strong></td>
            <td>${data.jobTitle || "--"} / <span class="dept-badge">${data.department || "--"}</span></td>
            <td>${translateType(data.type)} ${attachmentIcon}</td>
            <td>${dateFrom}</td>
            <td><span class="badge ${(data.status || 'Pending').toLowerCase()}">${data.status || 'Pending'}</span></td>
            <td><button onclick="deleteRequest('${data.id}')" class="delete-btn">حذف</button></td>
        `;
        tableBody.appendChild(row);
    });
}

// دالة عرض المرفق للـ HR
function viewFileAdmin(docId) {
    const base64Data = document.getElementById(`admin-data-${docId}`).innerText;
    const newWindow = window.open();
    newWindow.document.write(`<html><body style="margin:0;"><iframe src="${base64Data}" frameborder="0" style="width:100%; height:100vh;"></iframe></body></html>`);
}

// دالة رفع الموظفين CSV
function uploadCSV() {
    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];
    if (!file) { alert("اختر ملف أولاً"); return; }
    const reader = new FileReader();
    reader.onload = function(e) {
        const rows = e.target.result.split(/\r?\n/);
        let count = 0;
        for (let i = 1; i < rows.length; i++) {
            const cols = rows[i].split(/[;,]/).map(c => c.replace(/["]/g, "").trim());
            if (cols.length >= 5) {
                firebase.firestore().collection("Employee_Database").doc(cols[0]).set({
                    employeeId: cols[0], name: cols[1], phone: cols[2], role: cols[3].toLowerCase(), department: cols[4], activated: false
                }, { merge: true });
                count++;
            }
        }
        alert(`تم رفع ${count} موظف بنجاح!`);
    };
    reader.readAsText(file, "UTF-8");
}

function filterTable() {
    const deptSearch = document.getElementById('filter-dept').value.toLowerCase();
    const typeSearch = document.getElementById('filter-type').value;
    const filtered = allRequests.filter(req => {
        let matchDept = !deptSearch || (req.department || "").toLowerCase().includes(deptSearch);
        let matchType = !typeSearch || req.type === typeSearch;
        return matchDept && matchType;
    });
    renderTable(filtered);
}

function translateType(type) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const types = { vacation: lang === 'ar' ? "إجازة" : "Vacation", late: lang === 'ar' ? "إذن تأخير" : "Late Perm.", exit: lang === 'ar' ? "تصريح خروج" : "Exit Permit" };
    return types[type] || type;
}

function deleteRequest(id) {
    if(confirm("هل أنت متأكد؟")) firebase.firestore().collection("HR_Requests").doc(id).delete();
}

window.onload = () => {
    loadAllRequests();
    const savedLang = localStorage.getItem('preferredLang') || 'ar';
    if(typeof updatePageContent === 'function') updatePageContent(savedLang);
};
