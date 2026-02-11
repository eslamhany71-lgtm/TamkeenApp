// ملاحظة: لا نعرف db هنا لتجنب التعارض مع auth.js

// 1. دالة رفع ملف CSV (المطورة والمؤمنة)
function uploadCSV() {
    console.log("بدء عملية الرفع...");
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

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i].trim();
                if (!row) continue;

                // التعديل السحري: تقسيم السطر سواء الفاصلة كانت (,) أو (;)
                const cols = row.includes(';') ? row.split(';') : row.split(',');

                if (cols.length >= 4) {
                    const code = cols[0].trim();
                    const name = cols[1].trim();
                    const phone = cols[2].trim();
                    const role = cols[3].trim().toLowerCase();

                    // الرفع لـ Firestore
                    firebase.firestore().collection("Employee_Database").doc(code).set({
                        employeeId: code, // زودتهولك هنا كـ فيلد إضافي لو محتاجه
                        name: name,
                        phone: phone,
                        role: role,
                        activated: false
                    });
                    count++;
                }
            }
            
            if (count > 0) {
                alert("تم رفع " + count + " موظف بنجاح! اعمل Refresh لصفحة الفايربيز عشان تشوفهم.");
                fileInput.value = ""; 
            } else {
                alert("فشل الرفع: تأكد أن الملف يحتوي على 4 أعمدة (كود، اسم، موبايل، رتبة)");
            }

        } catch (err) {
            alert("خطأ: " + err.message);
        }
    };
    reader.readAsText(file, "UTF-8");
}
// 2. دالة سحب الطلبات للجدول
function loadAllRequests() {
    firebase.firestore().collection("HR_Requests").orderBy("submittedAt", "desc").onSnapshot((snapshot) => {
        const tableBody = document.getElementById('hr-requests-table');
        if (!tableBody) return;
        
        let total = 0, approved = 0;
        tableBody.innerHTML = "";

        snapshot.forEach(doc => {
            const data = doc.data();
            total++;
            if(data.status === "Approved") approved++;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${data.employeeCode || "--"}</td>
                <td><strong>${data.employeeName || "غير معروف"}</strong></td>
                <td>${data.jobTitle || "--"} / ${data.department || "--"}</td>
                <td>${data.type || "--"}</td>
                <td>${data.startDate || data.reqDate || "--"}</td>
                <td><span class="badge ${data.status?.toLowerCase()}">${data.status}</span></td>
                <td><button onclick="deleteRequest('${doc.id}')" class="delete-btn">حذف</button></td>
            `;
            tableBody.appendChild(row);
        });
        
        if(document.getElementById('total-count')) document.getElementById('total-count').innerText = total;
        if(document.getElementById('approved-count')) document.getElementById('approved-count').innerText = approved;
    });
}

// 3. باقي الدوال الأساسية
function deleteRequest(id) {
    if(confirm("حذف الطلب نهائياً؟")) {
        firebase.firestore().collection("HR_Requests").doc(id).delete();
    }
}

function exportToExcel() {
    alert("جاري تحضير التقرير...");
    // كود الـ Export اللي عندك شغال تمام
}

// تشغيل السحب عند التحميل
window.onload = () => {
    loadAllRequests();
    // تفعيل الترجمة لو محتاجها
    if (typeof updatePageContent === 'function') {
        const savedLang = localStorage.getItem('preferredLang') || 'ar';
        updatePageContent(savedLang);
    }
};
