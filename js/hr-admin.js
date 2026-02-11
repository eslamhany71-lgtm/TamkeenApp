const db = firebase.firestore();

function loadAllRequests() {
    db.collection("HR_Requests").orderBy("submittedAt", "desc").onSnapshot((snapshot) => {
        const tableBody = document.getElementById('hr-requests-table');
        let total = 0, approved = 0;
        
        tableBody.innerHTML = "";

        snapshot.forEach((doc) => {
            const data = doc.data();
            total++;
            if(data.status === "Approved") approved++;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${data.employee}</td>
                <td>${translateType(data.type)}</td>
                <td>${data.date}</td>
                <td><span class="badge ${data.status.toLowerCase()}">${data.status}</span></td>
                <td>
                    <button onclick="deleteRequest('${doc.id}')" class="delete-btn">حذف</button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        document.getElementById('total-count').innerText = total;
        document.getElementById('approved-count').innerText = approved;
    });
}

function deleteRequest(id) {
    if(confirm("هل أنت متأكد من حذف هذا الطلب نهائياً من السجلات؟")) {
        db.collection("HR_Requests").doc(id).delete();
    }
}

function translateType(type) {
    const types = { vacation: "إجازة", late: "إذن تأخير", exit: "تصريح خروج" };
    return types[type] || type;
}

// نظام اللغة لصفحة الـ HR
function updatePageContent(lang) {
    const translations = {
        ar: { title: "إدارة الـ HR", header: "لوحة تحكم الـ HR Admin", back: "رجوع", total: "إجمالي الطلبات:", approved: "الموافق عليها:", export: "تحميل تقرير" },
        en: { title: "HR Admin", header: "HR Admin Dashboard", back: "Back", total: "Total Requests:", approved: "Approved:", export: "Export Report" }
    };
    const t = translations[lang];
    document.getElementById('txt-title').innerText = t.title;
    document.getElementById('txt-header').innerText = t.header;
    document.getElementById('btn-back').innerText = t.back;
    document.getElementById('txt-total').innerText = t.total;
    document.getElementById('txt-approved').innerText = t.approved;
    document.getElementById('btn-export').innerText = t.export;
}

// دالة بسيطة لتحميل البيانات (CSV) لفتحها في Excel
function exportToExcel() {
    let csv = "Employee,Type,Date,Status\n";
    db.collection("HR_Requests").get().then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
            const d = doc.data();
            csv += `${d.employee},${d.type},${d.date},${d.status}\n`;
        });
        const hiddenElement = document.createElement('a');
        hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
        hiddenElement.target = '_blank';
        hiddenElement.download = 'HR_Report.csv';
        hiddenElement.click();
    });
}

window.onload = () => { loadAllRequests(); };
