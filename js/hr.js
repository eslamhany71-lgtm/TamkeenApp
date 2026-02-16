// hr.js - النسخة الاحترافية الكاملة والمستقرة (Tamkeen App)

let currentUserData = null;
let totalAnnualUsed = 0;

// 1. مراقبة الدخول + نظام الكاش (التخزين المؤقت) لمنع التهنيج
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        const empCode = user.email.split('@')[0];
        
        // جلب البيانات من الذاكرة المؤقتة فوراً لسرعة العرض
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

// 2. جلب بيانات الموظف من Firestore
async function fetchEmployeeData(code) {
    try {
        const doc = await firebase.firestore().collection("Employee_Database").doc(code).get();
        if (doc.exists) {
            currentUserData = doc.data();
            sessionStorage.setItem('userData', JSON.stringify(currentUserData)); // تحديث الكاش
            applyLockedFields(currentUserData);
        }
    } catch (e) { console.error("Error fetching data:", e); }
}

// 3. قفل الخانات الأساسية
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

// 4. تحميل سجل الطلبات والإحصائيات (تحديث لحظي)
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

            if(document.getElementById('vacation-balance')) document.getElementById('vacation-balance').innerText = Math.max(0, 21 - totalAnnualUsed);
            if(document.getElementById('my-approved-count')) document.getElementById('my-approved-count').innerText = approved;
            if(document.getElementById('my-rejected-count')) document.getElementById('my-rejected-count').innerText = rejected;
            if(document.getElementById('my-pending-count')) document.getElementById('my-pending-count').innerText = pending;
        });
}

// 5. إرسال الطلب (الحماية من التكرار + إشعار المدير + المرفقات)
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
    btn.innerText = lang === 'ar' ? "جاري المعالجة..." : "Processing...";

    try {
        // حماية من التكرار المزدوج
        const requestsRef = firebase.firestore().collection("HR_Requests");
        const q1 = await requestsRef.where("employeeCode", "==", empCode).where("startDate", "==", targetDate).get();
        const q2 = await requestsRef.where("employeeCode", "==", empCode).where("reqDate", "==", targetDate).get();

        if (!q1.empty || !q2.empty) {
            alert(lang === 'ar' ? `خطأ: لديك طلب مسجل بتاريخ ${targetDate}` : `Error: Duplicate request on ${targetDate}`);
            btn.disabled = false; btn.innerText = lang === 'ar' ? "إرسال" : "Submit"; return;
        }

        // تحويل المرفق إن وجد (Base64)
        let fileData = null;
        const file = document.getElementById('reqAttachment').files[0];
        if (file) {
            if(file.size > 800 * 1024) {
                alert("الملف كبير جداً! الحد الأقصى 800 كيلوبايت");
                btn.disabled = false; return;
            }
            fileData = await fileToBase64(file);
        }

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
        await firebase.firestore().collection("HR_Requests").add(requestData);

        // 2. إرسال إشعار للمدير
        await firebase.firestore().collection("Notifications").add({
            targetDept: requestData.department,
            message: lang === 'ar' ? `طلب جديد من: ${requestData.employeeName}` : `New request from: ${requestData.employeeName}`,
            isRead: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert(lang === 'ar' ? "تم الإرسال بنجاح!" : "Sent successfully!");
        closeForm();
    } catch (err) { alert("Error: " + err.message); }
    finally { btn.disabled = false; btn.innerText = lang === 'ar' ? "إرسال الطلب الآن" : "Submit Request"; }
});

// 6. دوال الواجهة (Modals)
function openForm(type) {
    document.getElementById('formModal').style.display = "block";
    document.getElementById('requestType').value = type;
    document.getElementById('vacation-fields').style.display = (type === 'vacation') ? 'block' : 'none';
    document.getElementById('time-fields').style.display = (type !== 'vacation') ? 'block' : 'none';
    
    // حل مشكلة التهنيج: إعادة تعبئة البيانات المقفولة فوراً
    if (currentUserData) {
        applyLockedFields(currentUserData);
    } else {
        const cached = sessionStorage.getItem('userData');
        if(cached) applyLockedFields(JSON.parse(cached));
    }
}

function closeForm() {
    document.getElementById('formModal').style.display = "none";
    document.getElementById('hrRequestForm').reset();
    if(currentUserData) applyLockedFields(currentUserData);
}

function openMyRequests() {
    document.getElementById('requestsModal').style.display = 'block';
}

function closeRequests() {
    document.getElementById('requestsModal').style.display = 'none';
}

// 7. دوال مساعدة
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = e => reject(e);
    });
}

function calculateDays(s, e) {
    if (!s || !e) return 1;
    const d1 = new Date(s), d2 = new Date(e);
    return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
}

function translateType(t) {
    const l = localStorage.getItem('preferredLang') || 'ar';
    const mapAr = { vacation: "إجازة", late: "إذن تأخير", exit: "تصريح خروج" };
    const mapEn = { vacation: "Vacation", late: "Late Perm.", exit: "Exit Permit" };
    return l === 'ar' ? (mapAr[t] || t) : (mapEn[t] || t);
}

function translateStatus(s, l) {
    const map = { 'Pending': l === 'ar' ? 'قيد الانتظار' : 'Pending', 'Approved': l === 'ar' ? 'مقبول' : 'Approved', 'Rejected': l === 'ar' ? 'مرفوض' : 'Rejected' };
    return map[s] || s;
}

// إغلاق المودالات عند الضغط خارجها
window.onclick = (e) => {
    if (e.target.className === 'modal') {
        closeForm();
        closeRequests();
    }
};
