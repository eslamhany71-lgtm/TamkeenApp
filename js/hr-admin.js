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

            // معالجة التواريخ
            const dateFrom = data.startDate || data.reqDate || "--";
            const dateTo = data.endDate ? ` إلى ${data.endDate}` : "";

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${data.employeeCode || "--"}</td>
                <td><strong>${data.employeeName || "اسم غير معروف"}</strong></td>
                <td>${data.jobTitle || "--"} / ${data.department || "--"}</td>
                <td>${translateType(data.type)} ${data.vacationType ? `(${data.vacationType})` : ""}</td>
                <td>${dateFrom}${dateTo}</td>
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
    if(confirm("هل أنت متأكد من حذف هذا السجل نهائياً؟")) {
        db.collection("HR_Requests").doc(id).delete();
    }
}

function translateType(type) {
    const types = { vacation: "إجازة", late: "إذن تأخير", exit: "تصريح خروج" };
    return types[type] || type;
}

// تحميل التقرير بصيغة CSV تحتوي على كل الخانات الجديدة
function exportToExcel() {
    let csv = "\uFEFF"; // إضافة BOM لدعم اللغة العربية في Excel
    csv += "الكود,الموظف,الوظيفة,القسم,تاريخ التعيين,النوع,التفاصيل,من تاريخ/تاريخ الإذن,إلى تاريخ,الوقت,السبب,الحالة\n";
    
    db.collection("HR_Requests").get().then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
            const d = doc.data();
            csv += `${d.employeeCode},${d.employeeName},${d.jobTitle},${d.department},${d.hiringDate},${translateType(d.type)},${d.vacationType || ""},${d.startDate || d.reqDate},${d.endDate || ""},${d.reqTime || ""},${d.reason},${d.status}\n`;
        });
        const hiddenElement = document.createElement('a');
        hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
        hiddenElement.target = '_blank';
        hiddenElement.download = 'تقرير_تمكين_HR.csv';
        hiddenElement.click();
    });
}

function updatePageContent(lang) {
    const translations = {
        ar: { title: "إدارة الـ HR", header: "لوحة تحكم الـ HR Admin", back: "رجوع", total: "إجمالي الطلبات:", approved: "الموافق عليها:", export: "تحميل تقرير كامل", code:"الكود", name:"الموظف", job:"الوظيفة/القسم", type:"نوع الطلب", date:"التاريخ", status:"الحالة", action:"إجراء" },
        en: { title: "HR Admin", header: "HR Admin Dashboard", back: "Back", total: "Total:", approved: "Approved:", export: "Export Full Report", code:"ID", name:"Name", job:"Job/Dept", type:"Type", date:"Date", status:"Status", action:"Action" }
    };
    const t = translations[lang];
    document.getElementById('txt-title').innerText = t.title;
    document.getElementById('txt-header').innerText = t.header;
    document.getElementById('btn-back').innerText = t.back;
    document.getElementById('txt-total').innerText = t.total;
    document.getElementById('txt-approved').innerText = t.approved;
    document.getElementById('btn-export').innerText = t.export;
    document.getElementById('th-code').innerText = t.code;
    document.getElementById('th-name').innerText = t.name;
    document.getElementById('th-job').innerText = t.job;
    document.getElementById('th-type').innerText = t.type;
    document.getElementById('th-date').innerText = t.date;
    document.getElementById('th-status').innerText = t.status;
    document.getElementById('th-action').innerText = t.action;
}

window.onload = () => { loadAllRequests(); };
