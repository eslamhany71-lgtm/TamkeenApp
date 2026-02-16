// hr.js - نظام الخدمات الذاتية الموحد (النسخة الاحترافية الكاملة)
// تم الحفاظ على كافة الحسابات والترجمات مع دمج نظام الإشعارات اللحظي

let currentUserData = null;
let totalAnnualUsed = 0;

// 1. مراقبة الدخول + حل التهنيج (Cache System)
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        const empCode = user.email.split('@')[0];
        
        // استعادة سريعة من الكاش لمنع اختفاء البيانات عند الـ Refresh
        const cachedData = sessionStorage.getItem('userData');
        if (cachedData) {
            currentUserData = JSON.parse(cachedData);
            applyLockedFields(currentUserData);
        }
        
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
            sessionStorage.setItem('userData', JSON.stringify(currentUserData));
            applyLockedFields(currentUserData);
        }
    } catch (e) { console.error(e); }
}

function applyLockedFields(data) {
    if(!data) return;
    const fields = { 'empCode': data.employeeId || data.empCode, 'empName': data.name, 'empDept': data.department };
    for (let id in fields) {
        const el = document.getElementById(id);
        if (el) { 
            el.value = fields[id] || ""; 
            el.readOnly = true; 
            el.style.background = "#f0f0f0";
        }
    }
}

// 2. تحميل "طلباتي" وحساب الرصيد (الـ 21 يوم)
function loadMyRequests(empCode) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    firebase.firestore().collection("HR_Requests")
        .where("employeeCode", "==", empCode)
        .orderBy("submittedAt", "desc")
        .onSnapshot((snapshot) => {
            const tableBody = document.getElementById('my-requests-table');
            if (!tableBody) return;
            tableBody.innerHTML = "";
            let approved = 0, pending = 0;
            totalAnnualUsed = 0;

            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.status === "Approved") {
                    approved++;
                    // حساب الإجازات السنوية المخصومة فقط
                    if (data.type === "vacation" && data.vacationType === "سنوية") {
                        totalAnnualUsed += calculateDays(data.startDate, data.endDate);
                    }
                } else if (data.status === "Pending") { pending++; }

                tableBody.innerHTML += `<tr>
                    <td>${translateTypeLocal(data.type)} ${data.vacationType ? '('+data.vacationType+')' : ''}</td>
                    <td>${data.startDate || data.reqDate}</td>
                    <td><span class="badge ${data.status.toLowerCase()}">${translateStatusLocal(data.status, lang)}</span></td>
                </tr>`;
            });

            // تحديث عدادات الشاشة
            const balanceEl = document.getElementById('vacation-balance');
            if(balanceEl) balanceEl.innerText = Math.max(0, 21 - totalAnnualUsed);
            
            document.getElementById('my-approved-count').innerText = approved;
            document.getElementById('my-pending-count').innerText = pending;
        });
}

// 3. إرسال الطلب (مع الحماية من التكرار وإرسال إشعار للمدير)
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
        // فحص التكرار في نفس التاريخ لمنع تهنيج النظام
        const requestsRef = firebase.firestore().collection("HR_Requests");
        const q1 = await requestsRef.where("employeeCode", "==", empCode).where("startDate", "==", targetDate).get();
        const q2 = await requestsRef.where("employeeCode", "==", empCode).where("reqDate", "==", targetDate).get();

        if (!q1.empty || !q2.empty) {
            alert(lang === 'ar' ? `خطأ: لديك طلب مسجل بتاريخ ${targetDate}` : `Duplicate request on ${targetDate}`);
            btn.disabled = false; btn.innerText = lang === 'ar' ? "إرسال" : "Submit";
            return;
        }

        // معالجة المرفق (Base64) لتقليل التكاليف
        let fileData = null;
        const file = document.getElementById('reqAttachment').files[0];
        if (file && file.size <= 800 * 1024) {
            fileData = await new Promise((res) => {
                const r = new FileReader(); r.readAsDataURL(file); r.onload = () => res(r.result);
            });
        }

        // تجهيز بيانات الطلب
        const requestData = {
            employeeCode: empCode,
            employeeName: document.getElementById('empName').value,
            department: document.getElementById('empDept').value,
            jobTitle: document.getElementById('empJob') ? document.getElementById('empJob').value : "",
            hiringDate: document.getElementById('hireDate') ? document.getElementById('hireDate').value : "",
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

        // 1. حفظ الطلب في جدول الطلبات
        await firebase.firestore().collection("HR_Requests").add(requestData);

        // 2. إرسال الإشعار "الزناد" لمدير القسم (لتفعيل الصوت والتنبيه المستمر)
        await firebase.firestore().collection("Notifications").add({
            targetDept: requestData.department,
            message: lang === 'ar' ? `طلب جديد من: ${requestData.employeeName}` : `New request from: ${requestData.employeeName}`,
            isRead: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert(lang === 'ar' ? "تم الإرسال بنجاح!" : "Sent successfully!");
        closeForm();
    } catch (err) { 
        alert("Error: " + err.message); 
    } finally { 
        btn.disabled = false; 
        btn.innerText = lang === 'ar' ? "إرسال" : "Submit"; 
    }
});

// دوال التحكم في واجهة المستخدم (Modals)
function openForm(type) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const modal = document.getElementById('formModal');
    if(modal) modal.style.display = "block";
    
    document.getElementById('requestType').value = type;
    document.getElementById('vacation-fields').style.display = (type === 'vacation') ? 'block' : 'none';
    document.getElementById('time-fields').style.display = (type !== 'vacation') ? 'block' : 'none';
    
    const titles = { vacation: lang === 'ar' ? 'إجازة' : 'Vacation', late: lang === 'ar' ? 'تأخير' : 'Late', exit: lang === 'ar' ? 'خروج' : 'Exit' };
    document.getElementById('modal-title').innerText = titles[type];
    
    if (currentUserData) applyLockedFields(currentUserData);
}

function closeForm() { 
    document.getElementById('formModal').style.display = "none"; 
    document.getElementById('hrRequestForm').reset(); 
    if(currentUserData) applyLockedFields(currentUserData); 
}

function openMyRequests() { document.getElementById('requestsModal').style.display = 'block'; }
function closeRequests() { document.getElementById('requestsModal').style.display = 'none'; }

function calculateDays(s, e) { 
    if(!s || !e) return 0;
    const d1 = new Date(s), d2 = new Date(e); 
    return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24)) + 1; 
}

function translateTypeLocal(t) { 
    const l = localStorage.getItem('preferredLang') || 'ar';
    const map = { vacation: l==='ar'?'إجازة':'Vacation', late: l==='ar'?'إذن تأخير':'Late Perm.', exit: l==='ar'?'تصريح خروج':'Exit Permit' };
    return map[t] || t;
}

function translateStatusLocal(s, l) {
    const map = { 'Pending': l==='ar'?'قيد الانتظار':'Pending', 'Approved': l==='ar'?'مقبول':'Approved', 'Rejected': l==='ar'?'مرفوض':'Rejected' };
    return map[s] || s;
}

// 4. نظام اللغة الشامل
function updatePageContent(lang) {
    const translations = {
        ar: {
            title: "الخدمات الذاتية - تمكين", back: "رجوع", header: "الخدمات الذاتية للموظفين",
            vacation: "طلب إجازة", late: "إذن تأخير", exit: "تصريح خروج", myOrders: "سجل طلباتي",
            subVac: "سنوية، مرضية، عارضة...", subLate: "إذن حضور متأخر للعمل", subExit: "خروج مؤقت أثناء العمل",
            subMy: "متابعة الحالات والإحصائيات", code: "كود الموظف", name: "اسم الموظف", job: "الوظيفة",
            dept: "الإدارة / القسم", hire: "تاريخ التعيين", reason: "السبب / التفاصيل", attachment: "إرفاق مستند (اختياري)",
            submit: "إرسال الطلب الآن", history: "سجل طلباتي وإحصائياتي", balance: "الرصيد المتبقي", pending: "قيد الانتظار", 
            approved: "مقبولة", type: "النوع", date: "التاريخ", status: "الحالة", vType: "نوع الإجازة", from: "من تاريخ", to: "إلى تاريخ", rDate: "تاريخ الإذن", time: "الوقت"
        },
        en: {
            title: "Self Service - Tamkeen", back: "Back", header: "Employees Self Services",
            vacation: "Vacation Request", late: "Late Permission", exit: "Exit Permit", myOrders: "My Requests",
            subVac: "Annual, Medical, etc.", subLate: "Late arrival permission", subExit: "Temporary work exit",
            subMy: "Track status & statistics", code: "Employee Code", name: "Employee Name", job: "Job Title",
            dept: "Department", hire: "Hiring Date", reason: "Reason / Details", attachment: "Attach File (Optional)",
            submit: "Submit Request", history: "My Requests & Stats", balance: "Vacation Balance", pending: "Pending", 
            approved: "Approved", type: "Type", date: "Date", status: "Status", vType: "Vacation Type", from: "From Date", to: "To Date", rDate: "Request Date", time: "Time"
        }
    };
    const t = translations[lang] || translations['ar'];

    document.title = t.title;
    if(document.getElementById('txt-back')) document.getElementById('txt-back').innerText = t.back;
    if(document.getElementById('txt-header-main')) document.getElementById('txt-header-main').innerText = t.header;
    if(document.getElementById('txt-vacation')) document.getElementById('txt-vacation').innerText = t.vacation;
    if(document.getElementById('sub-vacation')) document.getElementById('sub-vacation').innerText = t.subVac;
    if(document.getElementById('txt-late')) document.getElementById('txt-late').innerText = t.late;
    if(document.getElementById('sub-late')) document.getElementById('sub-late').innerText = t.subLate;
    if(document.getElementById('txt-exit')) document.getElementById('txt-exit').innerText = t.exit;
    if(document.getElementById('sub-exit')) document.getElementById('sub-exit').innerText = t.subExit;
    if(document.getElementById('txt-my-orders')) document.getElementById('txt-my-orders').innerText = t.myOrders;
    if(document.getElementById('sub-my-orders')) document.getElementById('sub-my-orders').innerText = t.subMy;

    // المسميات داخل الفورم
    const labels = { 'lbl-code': t.code, 'lbl-name': t.name, 'lbl-job': t.job, 'lbl-dept': t.dept, 'lbl-hire': t.hire, 'lbl-reason': t.reason, 'lbl-attachment': t.attachment };
    for(let id in labels) { if(document.getElementById(id)) document.getElementById(id).innerText = labels[id]; }
    
    if(document.getElementById('btn-submit')) document.getElementById('btn-submit').innerText = t.submit;
    if(document.getElementById('txt-history-title')) document.getElementById('txt-history-title').innerText = t.history;
    if(document.getElementById('txt-stat-balance')) document.getElementById('txt-stat-balance').innerText = t.balance;
    if(document.getElementById('txt-stat-pending')) document.getElementById('txt-stat-pending').innerText = t.pending;
    if(document.getElementById('txt-stat-approved')) document.getElementById('txt-stat-approved').innerText = t.approved;

    if(document.getElementById('th-type')) document.getElementById('th-type').innerText = t.type;
    if(document.getElementById('th-date')) document.getElementById('th-date').innerText = t.date;
    if(document.getElementById('th-status')) document.getElementById('th-status').innerText = t.status;

    // حقول المودال المتغيرة
    if(document.getElementById('lbl-vac-type')) document.getElementById('lbl-vac-type').innerText = t.vType;
    if(document.getElementById('lbl-from')) document.getElementById('lbl-from').innerText = t.from;
    if(document.getElementById('lbl-to')) document.getElementById('lbl-to').innerText = t.to;
    if(document.getElementById('lbl-req-date')) document.getElementById('lbl-req-date').innerText = t.rDate;
    if(document.getElementById('lbl-time')) document.getElementById('lbl-time').innerText = t.time;
}

// تشغيل عند التحميل
window.addEventListener('DOMContentLoaded', () => {
    updatePageContent(localStorage.getItem('preferredLang') || 'ar');
});

// إغلاق المودال عند الضغط خارجه
window.onclick = (e) => { 
    if (e.target.className === 'modal') { closeForm(); closeRequests(); } 
};
