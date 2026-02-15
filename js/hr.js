// hr.js - الموظف (النسخة الاحترافية: سرعة عالية + إشعارات + منع تكرار)

let currentUserData = null;
let totalAnnualUsed = 0;

// 1. مراقبة الدخول + حل مشكلة التهنيج (Cache System)
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        const empCode = user.email.split('@')[0];
        
        // استعادة البيانات من الذاكرة المؤقتة فوراً لسرعة العرض
        const cachedData = sessionStorage.getItem('userData');
        if (cachedData) {
            currentUserData = JSON.parse(cachedData);
            applyLockedFields(currentUserData);
        }
        
        // تحديث البيانات من الفايربيز للتأكد من دقتها
        fetchEmployeeData(empCode);
        loadMyRequests(empCode);
    } else {
        window.location.href = "index.html";
    }
});

async function fetchEmployeeData(code) {
    try {
        const doc = await firebase.firestore().collection("Employee_Database").doc(code).get();
        if (doc.exists) {
            currentUserData = doc.data();
            sessionStorage.setItem('userData', JSON.stringify(currentUserData)); // حفظ للسرعة
            applyLockedFields(currentUserData);
        }
    } catch (e) { console.error("Error:", e); }
}

function applyLockedFields(data) {
    if(!data) return;
    const fields = { 'empCode': data.employeeId, 'empName': data.name, 'empDept': data.department };
    for (let id in fields) {
        const el = document.getElementById(id);
        if (el) { 
            el.value = fields[id] || ""; 
            el.readOnly = true; 
            el.style.background = "#f0f0f0"; // تمييز الخانات المقفولة
        }
    }
}

// 2. تحميل "طلباتي" والإحصائيات (تحديث لحظي)
function loadMyRequests(empCode) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    firebase.firestore().collection("HR_Requests")
        .where("employeeCode", "==", empCode)
        .orderBy("submittedAt", "desc")
        .onSnapshot((snapshot) => {
            const tableBody = document.getElementById('my-requests-table');
            if (!tableBody) return;
            tableBody.innerHTML = "";
            let approved = 0, rejected = 0, pending = 0;
            totalAnnualUsed = 0;

            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.status === "Approved") {
                    approved++;
                    if (data.type === "vacation" && data.vacationType === "سنوية") {
                        totalAnnualUsed += calculateDays(data.startDate, data.endDate);
                    }
                } else if (data.status === "Rejected") { rejected++; } else { pending++; }

                tableBody.innerHTML += `<tr>
                    <td>${translateType(data.type)} ${data.vacationType ? '('+data.vacationType+')' : ''}</td>
                    <td>${data.startDate || data.reqDate}</td>
                    <td><span class="badge ${data.status.toLowerCase()}">${translateStatus(data.status, lang)}</span></td>
                </tr>`;
            });

            document.getElementById('vacation-balance').innerText = Math.max(0, 21 - totalAnnualUsed);
            document.getElementById('my-approved-count').innerText = approved;
            document.getElementById('my-rejected-count').innerText = rejected;
            document.getElementById('my-pending-count').innerText = pending;
        });
}

// 3. إرسال الطلب (منع التكرار + إشعار للمدير + Base64)
document.getElementById('hrRequestForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit');
    const lang = localStorage.getItem('preferredLang') || 'ar';
    
    const type = document.getElementById('requestType').value;
    const empCode = document.getElementById('empCode').value;
    const startDate = document.getElementById('startDate').value;
    const reqDate = document.getElementById('reqDate').value;
    const targetDate = (type === 'vacation') ? startDate : reqDate;

    if (!targetDate) {
        alert(lang === 'ar' ? "يرجى اختيار التاريخ" : "Please select date");
        return;
    }

    btn.disabled = true;
    btn.innerText = lang === 'ar' ? "جاري التحقق والإرسال..." : "Checking & Sending...";

    try {
        // --- حماية التكرار المزدوجة ---
        const requestsRef = firebase.firestore().collection("HR_Requests");
        const q1 = await requestsRef.where("employeeCode", "==", empCode).where("startDate", "==", targetDate).get();
        const q2 = await requestsRef.where("employeeCode", "==", empCode).where("reqDate", "==", targetDate).get();

        if (!q1.empty || !q2.empty) {
            alert(lang === 'ar' ? `خطأ: لديك طلب مسجل بتاريخ ${targetDate}` : `Error: Duplicate request on ${targetDate}`);
            btn.disabled = false; btn.innerText = "إرسال"; return;
        }

        // تحويل المرفق (Base64)
        let fileData = null;
        const file = document.getElementById('reqAttachment').files[0];
        if (file && file.size <= 800 * 1024) fileData = await fileToBase64(file);

        const requestData = {
            employeeCode: empCode,
            employeeName: document.getElementById('empName').value,
            department: document.getElementById('empDept').value,
            jobTitle: document.getElementById('empJob').value,
            hiringDate: document.getElementById('hireDate').value,
            type: type,
            vacationType: (type === 'vacation') ? document.getElementById('vacType').value : null,
            startDate: (type === 'vacation') ? startDate : null,
            endDate: (type === 'vacation') ? document.getElementById('endDate').value : null,
            reqDate: (type !== 'vacation') ? reqDate : null,
            reqTime: (type !== 'vacation') ? document.getElementById('reqTime').value : null,
            reason: document.getElementById('reqReason').value,
            fileBase64: fileData,
            status: "Pending",
            submittedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // 1. حفظ الطلب
        const docRef = await firebase.firestore().collection("HR_Requests").add(requestData);

        // 2. إرسال إشعار للمدير
        await firebase.firestore().collection("Notifications").add({
            targetDept: requestData.department,
            message: `طلب ${translateType(type)} جديد من: ${requestData.employeeName}`,
            isRead: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert(lang === 'ar' ? "تم الإرسال بنجاح!" : "Sent successfully!");
        closeForm();
    } catch (err) { alert("Error: " + err.message); }
    finally { btn.disabled = false; btn.innerText = "إرسال الطلب الآن"; }
});

// دوال مساعدة
function fileToBase64(file) { return new Promise((resolve, reject) => { const r = new FileReader(); r.readAsDataURL(file); r.onload = () => resolve(r.result); r.onerror = e => reject(e); }); }
function calculateDays(s, e) { const d1 = new Date(s), d2 = new Date(e); return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24)) + 1; }
function translateType(t) { const map = { vacation: "إجازة", late: "إذن تأخير", exit: "تصريح خروج" }; return map[t] || t; }
function translateStatus(s, l) { const map = { 'Pending': l === 'ar' ? 'قيد الانتظار' : 'Pending', 'Approved': l === 'ar' ? 'مقبول' : 'Approved', 'Rejected': l === 'ar' ? 'مرفوض' : 'Rejected' }; return map[s] || s; }

function openForm(type) {
    document.getElementById('formModal').style.display = "block";
    document.getElementById('requestType').value = type;
    document.getElementById('vacation-fields').style.display = (type === 'vacation') ? 'block' : 'none';
    document.getElementById('time-fields').style.display = (type !== 'vacation') ? 'block' : 'none';
    // حل مشكلة التهنيج: تطبيق البيانات فوراً عند الفتح
    if (currentUserData) applyLockedFields(currentUserData);
}
function closeForm() { document.getElementById('formModal').style.display = "none"; document.getElementById('hrRequestForm').reset(); if(currentUserData) applyLockedFields(currentUserData); }
function openMyRequests() { document.getElementById('requestsModal').style.display = 'block'; }
function closeRequests() { document.getElementById('requestsModal').style.display = 'none'; }
window.onclick = (e) => { if (e.target.className === 'modal') { closeForm(); closeRequests(); } }
