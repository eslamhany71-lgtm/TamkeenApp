// admin-branches.js - نسخة الـ 4 أعمدة المطورة

window.onload = () => {
    loadBranchesList();
};

function uploadBranchesCSV() {
    const fileInput = document.getElementById('branchCsvFile');
    const file = fileInput.files[0];
    if (!file) return alert("اختار الملف أولاً");

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const text = e.target.result;
            const rows = text.split(/\r?\n/);
            let count = 0;

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i].trim();
                if (!row) continue; // يتجاهل السطور الفاضية تماماً

                const cols = row.split(/[;,]/).map(item => item.replace(/["]/g, "").trim());

                // --- التعديل السحري هنا ---
                // نتأكد إن أول عمود (الكود) مش فاضي قبل ما نكلم الفايربيز
                if (cols.length >= 6 && cols[0]) { 
                    firebase.firestore().collection("Branches").doc(cols[0]).set({
                        id: cols[0],
                        nameAr: cols[1],
                        nameEn: cols[2],
                        address: cols[3],
                        phone: cols[4],
                        mapUrl: cols[5]
                    });
                    count++;
                }
            }
            
            if(count > 0) {
                alert("تم رفع " + count + " فرع بنجاح بدون أخطاء.");
                fileInput.value = "";
            } else {
                alert("لم يتم العثور على بيانات صالحة.");
            }
        } catch (err) {
            console.error(err);
            alert("حدث خطأ غير متوقع: " + err.message);
        }
    };
    reader.readAsText(file, "UTF-8");
}

// 2. دالة عرض الفروع لحظياً
function loadBranchesList() {
    const tableBody = document.getElementById('branches-list-body');
    const countSpan = document.getElementById('branch-count');

    firebase.firestore().collection("Branches").onSnapshot((snapshot) => {
        tableBody.innerHTML = "";
        let count = 0;
        
        snapshot.forEach((doc) => {
            const b = doc.data();
            count++;
            const row = `
                <tr>
                    <td><strong>${b.nameAr}</strong></td>
                    <td>${b.address}</td>
                    <td>${b.phone}</td>
                    <td><a href="${b.mapUrl}" target="_blank">📍 خريطة</a></td>
                    <td>
                        <button onclick="deleteBranch('${doc.id}')" class="btn-delete">حذف</button>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
        countSpan.innerText = count;
    });
}

// 3. دالة الحذف
function deleteBranch(id) {
    if (confirm("حذف هذا الفرع؟")) {
        firebase.firestore().collection("Branches").doc(id).delete();
    }
}
