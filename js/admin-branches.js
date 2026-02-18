// admin-branches.js - نسخة الـ 4 أعمدة المطورة

window.onload = () => {
    loadBranchesList();
};

// 1. دالة الرفع والمعالجة
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

            // نبدأ من 1 لتخطي سطر العنوان في الإكسيل
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i].trim();
                if (!row) continue;

                // تقسيم الصف بناءً على الفاصلة (,) أو الفاصلة المنقوطة (;)
                const cols = row.split(/[;,]/).map(item => item.replace(/["]/g, "").trim());

                // التحقق من وجود 4 أعمدة (الاسم، العنوان، التليفون، الموقع)
                if (cols.length >= 4) {
                    const branchName = cols[0];
                    const address = cols[1];
                    const phone = cols[2];
                    const mapUrl = cols[3];

                    // رفع للفايربيز (اسم الفرع هو الـ ID لضمان عدم التكرار)
                    firebase.firestore().collection("Branches").doc(branchName).set({
                        nameAr: branchName, // بنخزنه كاسم عربي وافتراضي
                        nameEn: branchName, 
                        address: address,
                        phone: phone,
                        mapUrl: mapUrl,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });

                    successCount++;
                }
            }
            alert(`تم بنجاح رفع/تحديث ${successCount} فرع!`);
            fileInput.value = "";
        } catch (err) {
            alert("خطأ في قراءة الملف: " + err.message);
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
