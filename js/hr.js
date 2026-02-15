// hr.js - نسخة الرفع المجانية (Base64) - Tamkeen App
let currentUserData = null;
let totalAnnualUsed = 0;

firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        const empCode = user.email.split('@')[0];
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

                const row = `<tr>
                    <td>${translateType(data.type)} ${data.vacationType ? '('+data.vacationType+')' : ''}</td>
                    <td>${data.startDate || data.reqDate}</td>
                    <td><span class="badge ${data.status.toLowerCase()}">${data.status}</span></td>
                </tr>`;
                tableBody.innerHTML += row;
            });

            document.getElementById('vacation-balance').innerText = Math.max(0, 21 - totalAnnualUsed);
            document.getElementById('my-approved-count').innerText = approved;
            document.getElementById('my-rejected-count').innerText = rejected;
            document.getElementById('my-pending-count').innerText = pending;
        });
}

// دالة تحويل الملف إلى نص Base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

document.getElementById('hrRequestForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit');
    const fileInput = document.getElementById('reqAttachment');
    const file = fileInput.files[0];

    btn.disabled = true;
    btn.innerText = "جاري حفظ الطلب...";

    try {
        let fileData = null;
        if (file) {
            if (file.size > 800 * 1024) { // منع الملفات أكبر من 800KB لضمان المجانية
                alert("الملف كبير جداً! يرجى اختيار صورة أو ملف PDF أقل من 1 ميجابايت.");
                btn.disabled = false; btn.innerText = "إرسال الطلب الآن"; return;
            }
            fileData = await fileToBase64(file);
        }

        const requestData = {
            employeeCode: document.getElementById('empCode').value,
            employeeName: document.getElementById('empName').value,
            department: document.getElementById('empDept').value,
            jobTitle: document.getElementById('empJob').value,
            hiringDate: document.getElementById('hireDate').value,
            type: document.getElementById('requestType').value,
            vacationType: document.getElementById('vacType').value || null,
            startDate: document.getElementById('startDate').value || null,
            endDate: document.getElementById('endDate').value || null,
            reqDate: document.getElementById('reqDate').value || null,
            reqTime: document.getElementById('reqTime').value || null,
            reason: document.getElementById('reqReason').value,
            fileBase64: fileData, // تخزين المرفق هنا
            status: "Pending",
            submittedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await firebase.firestore().collection("HR_Requests").add(requestData);
        alert("تم إرسال طلبك بنجاح!");
        closeForm();
    } catch (err) { alert("خطأ: " + err.message); }
    finally { btn.disabled = false; btn.innerText = "إرسال الطلب الآن"; }
});

function calculateDays(start, end) { const s = new Date(start), e = new Date(end); return Math.floor((e - s) / (1000 * 60 * 60 * 24)) + 1; }
function openForm(type) { document.getElementById('formModal').style.display = "block"; document.getElementById('requestType').value = type; document.getElementById('vacation-fields').style.display = (type === 'vacation') ? 'block' : 'none'; document.getElementById('time-fields').style.display = (type !== 'vacation') ? 'block' : 'none'; }
function closeForm() { document.getElementById('formModal').style.display = "none"; document.getElementById('hrRequestForm').reset(); }
function openMyRequests() { document.getElementById('requestsModal').style.display = 'block'; }
function closeRequests() { document.getElementById('requestsModal').style.display = 'none'; }
function translateType(type) { const t = { vacation: "إجازة", late: "إذن تأخير", exit: "تصريح خروج" }; return t[type] || type; }
window.onclick = (e) => { if (e.target.className === 'modal') { closeForm(); closeRequests(); } }
