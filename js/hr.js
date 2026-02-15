// hr.js - النظام الموحد للخدمات الذاتية (النسخة الاحترافية الكاملة)

let currentUserData = null;
let totalAnnualUsed = 0;

// 1. مراقبة الدخول
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        const empCode = user.email.split('@')[0];
        fetchEmployeeData(empCode);
        loadMyRequests(empCode);
    } else {
        window.location.href = "index.html";
    }
});

// 2. جلب بيانات الموظف الأساسية
async function fetchEmployeeData(code) {
    try {
        const doc = await firebase.firestore().collection("Employee_Database").doc(code).get();
        if (doc.exists) {
            currentUserData = doc.data();
            applyLockedFields(currentUserData);
        }
    } catch (e) { console.error(e); }
}

function applyLockedFields(data) {
    const fields = { 'empCode': data.employeeId, 'empName': data.name, 'empDept': data.department };
    for (let id in fields) {
        const el = document.getElementById(id);
        if (el) { el.value = fields[id] || ""; el.readOnly = true; el.style.background = "#eee"; }
    }
}

// 3. تحميل سجل "طلباتي" وتحديث الإحصائيات لحظياً
function loadMyRequests(empCode) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    
    firebase.firestore().collection("HR_Requests")
        .where("employeeCode", "==", empCode)
        .orderBy("submittedAt", "desc")
        .onSnapshot((snapshot) => {
            const tableBody = document.getElementById('my-requests-table');
            if (!tableBody) return;

            tableBody.innerHTML = "";
            let approved = 0, rejected = 0, pending = 0, permits = 0;
            totalAnnualUsed = 0;

            snapshot.forEach((doc) => {
                const data = doc.data();
                
                // حساب الحالات
                if (data.status === "Approved") {
                    approved++;
                    if (data.type === "vacation" && data.vacationType === "سنوية") {
                        totalAnnualUsed += calculateDays(data.startDate, data.endDate);
                    }
                } else if (data.status === "Rejected") {
                    rejected++;
                } else {
                    pending++;
                }

                if (data.type === "late" || data.type === "exit") permits++;

                // إضافة سطر للجدول مع Badge ملون
                const statusTranslated = translateStatus(data.status, lang);
                const row = `<tr>
                    <td>${translateType(data.type)} ${data.vacationType ? '('+data.vacationType+')' : ''}</td>
                    <td>${data.startDate || data.reqDate}</td>
                    <td><span class="badge ${data.status.toLowerCase()}">${statusTranslated}</span></td>
                </tr>`;
                tableBody.innerHTML += row;
            });

            // تحديث واجهة الإحصائيات
            document.getElementById('vacation-balance').innerText = Math.max(0, 21 - totalAnnualUsed);
            document.getElementById('my-approved-count').innerText = approved;
            document.getElementById('my-rejected-count').innerText = rejected;
            document.getElementById('my-pending-count').innerText = pending;
            if(document.getElementById('my-permits-count')) document.getElementById('my-permits-count').innerText = permits;
        });
}

function calculateDays(start, end) {
    const s = new Date(start), e = new Date(end);
    return Math.floor((e - s) / (1000 * 60 * 60 * 24)) + 1;
}

// 4. إدارة المودالات
function openForm(type) {
    const modal = document.getElementById('formModal');
    document.getElementById('requestType').value = type;
    document.getElementById('vacation-fields').style.display = (type === 'vacation') ? 'block' : 'none';
    document.getElementById('time-fields').style.display = (type !== 'vacation') ? 'block' : 'none';
    modal.style.display = "block";
    if (currentUserData) applyLockedFields(currentUserData);
}

function closeForm() { document.getElementById('formModal').style.display = "none"; }
function openMyRequests() { document.getElementById('requestsModal').style.display = 'block'; }
function closeRequests() { document.getElementById('requestsModal').style.display = 'none'; }

// 5. إرسال الطلب مع التحقق
document.getElementById('hrRequestForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit');
    const type = document.getElementById('requestType').value;
    const vType = document.getElementById('vacType').value;
    const empCode = document.getElementById('empCode').value;
    const targetDate = (type === 'vacation') ? document.getElementById('startDate').value : document.getElementById('reqDate').value;

    btn.disabled = true;

    try {
        // فحص التكرار
        const dup = await firebase.firestore().collection("HR_Requests")
            .where("employeeCode", "==", empCode)
            .where(type === 'vacation' ? "startDate" : "reqDate", "==", targetDate)
            .get();

        if (!dup.empty) { alert("لديك طلب مسجل بالفعل في هذا التاريخ!"); btn.disabled = false; return; }

        // فحص الرصيد
        if (type === 'vacation' && vType === 'سنوية') {
            const days = calculateDays(targetDate, document.getElementById('endDate').value);
            if (totalAnnualUsed + days > 21) {
                if (!confirm("تجاوزت رصيد الـ 21 يوماً، هل تريد الإرسال كإجازة قد تخصم من الراتب؟")) { btn.disabled = false; return; }
            }
        }

        const requestData = {
            employeeCode: empCode, employeeName: document.getElementById('empName').value,
            department: document.getElementById('empDept').value, jobTitle: document.getElementById('empJob').value,
            hiringDate: document.getElementById('hireDate').value, type: type,
            vacationType: (type === 'vacation') ? vType : null,
            startDate: (type === 'vacation') ? targetDate : null,
            endDate: (type === 'vacation') ? document.getElementById('endDate').value : null,
            reqDate: (type !== 'vacation') ? targetDate : null,
            reqTime: (type !== 'vacation') ? document.getElementById('reqTime').value : null,
            reason: document.getElementById('reqReason').value, status: "Pending",
            submittedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await firebase.firestore().collection("HR_Requests").add(requestData);
        alert("تم الإرسال بنجاح!"); closeForm();
    } catch (err) { alert(err.message); }
    finally { btn.disabled = false; }
});

// 6. دوال مساعدة
function translateStatus(status, lang) {
    const s = { 'Pending': 'قيد الانتظار', 'Approved': 'مقبول', 'Rejected': 'مرفوض' };
    const e = { 'Pending': 'Pending', 'Approved': 'Approved', 'Rejected': 'Rejected' };
    return lang === 'ar' ? (s[status] || status) : (e[status] || status);
}

function translateType(type) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const t = { vacation: "إجازة", late: "إذن تأخير", exit: "تصريح خروج" };
    return lang === 'ar' ? (t[type] || type) : type.charAt(0).toUpperCase() + type.slice(1);
}

window.onclick = (e) => { if (e.target.className === 'modal') { closeForm(); closeRequests(); } }
