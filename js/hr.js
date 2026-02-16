// hr.js - النظام الموحد للخدمات الذاتية (النسخة الاحترافية الشاملة)

let currentUserData = null;
let totalAnnualUsed = 0;

// 1. مراقبة الدخول + حل مشكلة التهنيج (Cache System)
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        const empCode = user.email.split('@')[0];
        
        // استعادة البيانات فوراً من الذاكرة المؤقتة لسرعة العرض
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
    } catch (e) { console.error("Error fetching data:", e); }
}

function applyLockedFields(data) {
    if(!data) return;
    const fields = { 'empCode': data.employeeId, 'empName': data.name, 'empDept': data.department };
    for (let id in fields) {
        const el = document.getElementById(id);
        if (el) { 
            el.value = fields[id] || ""; 
            el.readOnly = true; 
            el.style.background = "#f0f0f0";
        }
    }
}

// 2. تحميل "طلباتي" والإحصائيات لحظياً
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
            document.getElementById('my-pending-count').innerText = pending;
        });
}

// 3. إرسال الطلب (منع تكرار + إشعار مدير + Base64)
document.getElementById('hrRequestForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit');
    const lang = localStorage.getItem('preferredLang') || 'ar';
    
    const type = document.getElementById('requestType').value;
    const empCode = document.getElementById('empCode').value;
    const targetDate = (type === 'vacation') ? document.getElementById('startDate').value : document.getElementById('reqDate').value;

    if (!targetDate) {
        alert(lang === 'ar' ? "يرجى اختيار التاريخ" : "Select date");
        return;
    }

    btn.disabled = true;
    btn.innerText = lang === 'ar' ? "جاري التحقق والإرسال..." : "Checking & Sending...";

    try {
        // فحص التكرار بدقة
        const requestsRef = firebase.firestore().collection("HR_Requests");
        const q1 = await requestsRef.where("employeeCode", "==", empCode).where("startDate", "==", targetDate).get();
        const q2 = await requestsRef.where("employeeCode", "==", empCode).where("reqDate", "==", targetDate).get();

        if (!q1.empty || !q2.empty) {
            alert(lang === 'ar' ? `لديك طلب مسجل بتاريخ ${targetDate}` : `Duplicate request on ${targetDate}`);
            btn.disabled = false; btn.innerText = "إرسال"; return;
        }

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
            startDate: (type === 'vacation') ? targetDate : null,
            endDate: (type === 'vacation') ? document.getElementById('endDate').value : null,
            reqDate: (type !== 'vacation') ? targetDate : null,
            reqTime: (type !== 'vacation') ? document.getElementById('reqTime').value : null,
            reason: document.getElementById('reqReason').value,
            fileBase64: fileData,
            status: "Pending",
            submittedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await firebase.firestore().collection("HR_Requests").add(requestData);

        // إرسال إشعار للمدير
        await firebase.firestore().collection("Notifications").add({
            targetDept: requestData.department,
            message: lang === 'ar' ? `طلب جديد من: ${requestData.employeeName}` : `New request from: ${requestData.employeeName}`,
            isRead: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert(lang === 'ar' ? "تم الإرسال بنجاح!" : "Sent successfully!");
        closeForm();
    } catch (err) { alert(err.message); }
    finally { btn.disabled = false; btn.innerText = "إرسال"; }
});

// دوال مساعدة
function fileToBase64(file) { return new Promise((res, rej) => { const r = new FileReader(); r.readAsDataURL(file); r.onload = () => res(r.result); r.onerror = e => rej(e); }); }
function calculateDays(s, e) { const d1 = new Date(s), d2 = new Date(e); return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24)) + 1; }

function translateType(t) { 
    const l = localStorage.getItem('preferredLang') || 'ar';
    const mapAr = { vacation: "إجازة", late: "إذن تأخير", exit: "تصريح خروج" };
    const mapEn = { vacation: "Vacation", late: "Late Perm.", exit: "Exit Permit" };
    return l === 'ar' ? mapAr[t] : mapEn[t];
}

function translateStatus(s, l) { 
    const map = { 'Pending': l === 'ar' ? 'قيد الانتظار' : 'Pending', 'Approved': l === 'ar' ? 'مقبول' : 'Approved', 'Rejected': l === 'ar' ? 'مرفوض' : 'Rejected' }; 
    return map[s] || s; 
}

function openForm(type) {
    document.getElementById('formModal').style.display = "block";
    document.getElementById('requestType').value = type;
    document.getElementById('vacation-fields').style.display = (type === 'vacation') ? 'block' : 'none';
    document.getElementById('time-fields').style.display = (type !== 'vacation') ? 'block' : 'none';
    if (currentUserData) applyLockedFields(currentUserData);
}

function closeForm() { document.getElementById('formModal').style.display = "none"; document.getElementById('hrRequestForm').reset(); if(currentUserData) applyLockedFields(currentUserData); }
function openMyRequests() { document.getElementById('requestsModal').style.display = 'block'; }
function closeRequests() { document.getElementById('requestsModal').style.display = 'none'; }

// نظام اللغة المدمج
function updatePageContent(lang) {
    const translations = {
        ar: {
            title: "الخدمات الذاتية - تمكين", back: "رجوع", header: "الخدمات الذاتية للموظفين",
            vacation: "طلب إجازة", late: "إذن تأخير", exit: "تصريح خروج", myOrders: "سجل طلباتي",
            code: "كود الموظف", name: "اسم الموظف", job: "الوظيفة", dept: "الإدارة / القسم", hire: "تاريخ التعيين",
            submit: "إرسال الطلب الآن", history: "سجل طلباتي وإحصائياتي"
        },
        en: {
            title: "Self Service - Tamkeen", back: "Back", header: "Employees Self Services",
            vacation: "Vacation Request", late: "Late Permission", exit: "Exit Permit", myOrders: "My Requests",
            code: "Emp. Code", name: "Emp. Name", job: "Job Title", dept: "Department", hire: "Hiring Date",
