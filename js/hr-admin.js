// ملاحظة: لا نعرف db هنا لتجنب التعارض مع auth.js

// 1. دالة رفع ملف CSV (المطورة والمؤمنة)
function uploadCSV() {
    console.log("تم الضغط على زرار الرفع"); // للتأكد في الـ Console
    
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
            const rows = text.split(/\r?\n/); // تقسيم السطور بشكل يدعم ويندوز وماك
            let count = 0;

            console.log("إجمالي السطور المكتشفة: " + rows.length);

            // نبدأ من i=1 لتخطي سطر العناوين
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i].trim();
                if (!row) continue; // تخطي السطور الفارغة

                // تقسيم السطر بالأعمدة (يدعم الفاصلة العادية)
                const cols = row.split(','); 

                if (cols.length >= 4) {
                    const code = cols[0].trim();
                    const name = cols[1].trim();
                    const phone = cols[2].trim();
                    const role = cols[3].trim().toLowerCase();

                    // الرفع مباشرة باستخدام firebase.firestore()
                    firebase.firestore().collection("Employee_Database").doc(code).set({
                        name: name,
                        phone: phone,
                        role: role,
                        activated: false
                    });
                    count++;
                }
            }
            
            if (count > 0) {
                alert("تم رفع بيانات " + count + " موظف بنجاح إلى قاعدة البيانات!");
                fileInput.value = ""; // تفريغ الخانة بعد النجاح
            } else {
                alert("لم يتم العثور على بيانات صالحة في الملف. تأكد أن الملف يحتوي على 4 أعمدة.");
            }

        } catch (err) {
            console.error(err);
            alert("حدث خطأ أثناء قراءة الملف: " + err.message);
        }
    };

    reader.onerror = function() {
        alert("فشل في قراءة الملف تماماً!");
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
