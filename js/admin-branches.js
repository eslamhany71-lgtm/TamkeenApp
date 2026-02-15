// admin-branches.js - إدارة الفروع للأدمن

// 1. تشغيل عند تحميل الصفحة
window.onload = () => {
    loadBranchesList();
};

// 2. دالة رفع ملف الـ CSV وتحديث الفروع
function uploadBranchesCSV() {
    const fileInput = document.getElementById('branchCsvFile');
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
            let successCount = 0;

            // البدء من i=1 لتخطي العناوين
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i].trim();
                if (!row) continue;

                // تقسيم الصف ودعم الفواصل المختلفة
                const cols = row.split(/[;,]/).map(item => item.replace(/["]/g, "").trim());

                if (cols.length >= 6) {
                    const branchData = {
                        id: cols[0],
                        nameAr: cols[1],
                        nameEn: cols[2],
                        address: cols[3],
                        phone: cols[4],
                        mapUrl: cols[5],
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    };

                    firebase.firestore().collection("Branches").doc(branchData.id).set(branchData, { merge: true });
                    successCount++;
                }
            }
            alert(`تم بنجاح رفع/تحديث ${successCount} فرع!`);
            fileInput.value = "";
            loadBranchesList(); // تحديث الجدول فوراً
        } catch (err) {
            alert("حدث خطأ في قراءة الملف: " + err.message);
        }
    };
    reader.readAsText(file, "UTF-8");
}

// 3. دالة جلب وعرض الفروع الموجودة في Firestore
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
                    <td>${b.id}</td>
                    <td><strong>${b.nameAr}</strong></td>
                    <td>${b.nameEn}</td>
                    <td>${b.address}</td>
                    <td>
                        <button onclick="deleteBranch('${b.id}')" class="btn-delete">حذف</button>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
        countSpan.innerText = count;
    });
}

// 4. دالة حذف فرع معين
function deleteBranch(id) {
    if (confirm("هل أنت متأكد من حذف هذا الفرع نهائياً؟")) {
        firebase.firestore().collection("Branches").doc(id).delete()
            .then(() => alert("تم حذف الفرع"))
            .catch(err => alert("خطأ: " + err.message));
    }
}
