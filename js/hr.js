// hr.js - نظام الخدمات الذاتية الموحد (النسخة الاحترافية الكاملة)

let currentUserData = null;
let totalAnnualUsed = 0;

function sendSystemNotification(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, {
            body: body,
            icon: "https://cdn-icons-png.flaticon.com/512/1827/1827347.png"
        });
    }
}

firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        const empCode = user.email.split('@')[0];
        const cachedData = sessionStorage.getItem('userData');
        if (cachedData) {
            currentUserData = JSON.parse(cachedData);
            applyLockedFields(currentUserData);
        }
        fetchEmployeeData(empCode);
        loadMyRequests(empCode);
    } else {
        // تم التعديل هنا للرجوع للمسار الصحيح إذا تم تسجيل الخروج
        window.parent.location.href = "index.html";
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
            el.style.background = "#e2e8f0";
            el.style.color = "#64748b";
        }
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
            let approved = 0, pending = 0;
            totalAnnualUsed = 0;

            snapshot.docChanges().forEach(change => {
                if (change.type === "modified") {
                    const updatedData = change.doc.data();
                    sendSystemNotification(
                        lang === 'ar' ? "تحديث بخصوص طلبك" : "Request Update",
                        lang === 'ar' ? `تم تغيير حالة طلبك إلى: ${translateStatusLocal(updatedData.status, 'ar')}` : `Your request status is now: ${updatedData.status}`
                    );
                }
            });

            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.status === "Approved") {
                    approved++;
                    if (data.type === "vacation" && data.vacationType === "سنوية") {
                        totalAnnualUsed += calculateDays(data.startDate, data.endDate);
                    }
                } else if (data.status === "Pending") { pending++; }

                const managerComment = data.managerComment ? data.managerComment : (lang === 'ar' ? "لا يوجد رد بعد" : "No reply yet");

                tableBody.innerHTML += `<tr>
                    <td style="font-weight:700; color:#1e293b;">${translateTypeLocal(data.type)} ${data.vacationType ? '<span style="color:#64748b; font-size:12px;">('+data.vacationType+')</span>' : ''}</td>
                    <td>${data.startDate || data.reqDate}</td>
                    <td><span class="badge ${data.status.toLowerCase()}">${translateStatusLocal(data.status, lang)}</span></td>
                    <td style="font-size: 12px; color: #3b82f6; font-style: italic; max-width: 200px;">${managerComment}</td>
                </tr>`;
            });

            const balanceEl = document.getElementById('vacation-balance');
            if(balanceEl) balanceEl.innerText = Math.max(0, 21 - totalAnnualUsed);
            
            document.getElementById('my-approved-count').innerText = approved;
            document.getElementById('my-pending-count').innerText = pending;
        });
}

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
        const requestsRef = firebase.firestore().collection("HR_Requests");
        const q1 = await requestsRef.where("employeeCode", "==", empCode).where("startDate", "==", targetDate).get();
        const q2 = await requestsRef.where("employeeCode", "==", empCode).where("reqDate", "==", targetDate).get();

        if (!q1.empty || !q2.empty) {
            alert(lang === 'ar' ? `خطأ: لديك طلب مسجل بتاريخ ${targetDate}` : `Duplicate request on ${targetDate}`);
            btn.disabled = false; btn.innerText = lang === 'ar' ? "إرسال الطلب الآن" : "Submit Request";
            return;
        }

        let fileData = null;
        const file = document.getElementById('reqAttachment').files[0];
        if (file && file.size <= 800 * 1024) {
            fileData = await new Promise((res) => {
                const r = new FileReader(); r.readAsDataURL(file); r.onload = () => res(r.result);
            });
        }

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
            managerComment: "", 
            submittedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await firebase.firestore().collection("HR_Requests").add(requestData);

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
        btn.innerText = lang === 'ar' ? "إرسال الطلب الآن" : "Submit Request"; 
    }
});

function openForm(type) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const modal = document.getElementById('formModal');
    if(modal) modal.style.display = "flex";
    
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

function openMyRequests() { 
    document.getElementById('requestsModal').style.display = 'flex'; 
}
function closeRequests() { 
    document.getElementById('requestsModal').style.display = 'none'; 
}

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

function updatePageContent(lang) {
    const translations = {
        ar: {
            title: "الخدمات الذاتية - تمكين", header: "الخدمات الذاتية للموظفين", subHeader: "اختر الخدمة المطلوبة لتقديم الطلب أو متابعة طلباتك السابقة",
            vacation: "طلب إجازة", late: "إذن تأخير", exit: "تصريح خروج", myOrders: "سجل طلباتي",
            subVac: "سنوية، مرضية، عارضة...", subLate: "إذن حضور متأخر للعمل", subExit: "خروج مؤقت أثناء العمل",
            subMy: "متابعة الحالات والإحصائيات", code: "كود الموظف", name: "اسم الموظف", job: "الوظيفة",
            dept: "الإدارة / القسم", hire: "تاريخ التعيين", reason: "السبب / التفاصيل", attachment: "إرفاق مستند (اختياري)",
            submit: "إرسال الطلب الآن", history: "سجل طلباتي وإحصائياتي", balance: "الرصيد المتبقي", pending: "قيد الانتظار", 
            approved: "مقبولة", type: "النوع", date: "التاريخ", status: "الحالة", vType: "نوع الإجازة", from: "من تاريخ", to: "إلى تاريخ", rDate: "تاريخ الإذن", time: "الوقت",
            comment: "رد الإدارة"
        },
        en: {
            title: "Self Service - Tamkeen", header: "Employees Self Services", subHeader: "Choose a service to submit a request or track previous ones",
            vacation: "Vacation Request", late: "Late Permission", exit: "Exit Permit", myOrders: "My Requests",
            subVac: "Annual, Medical, etc.", subLate: "Late arrival permission", subExit: "Temporary work exit",
            subMy: "Track status & statistics", code: "Employee Code", name: "Employee Name", job: "Job Title",
            dept: "Department", hire: "Hiring Date", reason: "Reason / Details", attachment: "Attach File (Optional)",
            submit: "Submit Request", history: "My Requests & Stats", balance: "Vacation Balance", pending: "Pending", 
            approved: "Approved", type: "Type", date: "Date", status: "Status", vType: "Vacation Type", from: "From Date", to: "To Date", rDate: "Request Date", time: "Time",
            comment: "Manager Note"
        }
    };
    const t = translations[lang] || translations['ar'];
    document.body.dir = lang === 'en' ? 'ltr' : 'rtl';

    const setTxt = (id, txt) => {
        const el = document.getElementById(id);
        if (el) el.innerText = txt;
    };

    document.title = t.title;
    setTxt('txt-header-main', t.header);
    setTxt('txt-subtitle', t.subHeader); // العنوان الفرعي الجديد
    setTxt('txt-vacation', t.vacation);
    setTxt('sub-vacation', t.subVac);
    setTxt('txt-late', t.late);
    setTxt('sub-late', t.subLate);
    setTxt('txt-exit', t.exit);
    setTxt('sub-exit', t.subExit);
    setTxt('txt-my-orders', t.myOrders);
    setTxt('sub-my-orders', t.subMy);

    const labels = { 'lbl-code': t.code, 'lbl-name': t.name, 'lbl-job': t.job, 'lbl-dept': t.dept, 'lbl-hire': t.hire, 'lbl-reason': t.reason, 'lbl-attachment': t.attachment };
    for(let id in labels) setTxt(id, labels[id]);
    
    setTxt('btn-submit', t.submit);
    setTxt('txt-history-title', t.history);
    setTxt('txt-stat-balance', t.balance);
    setTxt('txt-stat-pending', t.pending);
    setTxt('txt-stat-approved', t.approved);

    setTxt('th-type', t.type);
    setTxt('th-date', t.date);
    setTxt('th-status', t.status);
    setTxt('th-comment', t.comment);

    setTxt('lbl-vac-type', t.vType);
    setTxt('lbl-from', t.from);
    setTxt('lbl-to', t.to);
    setTxt('lbl-req-date', t.rDate);
    setTxt('lbl-time', t.time);
}

window.addEventListener('DOMContentLoaded', () => {
    updatePageContent(localStorage.getItem('preferredLang') || 'ar');
});

window.onclick = (e) => { 
    if (e.target.className === 'modal') { closeForm(); closeRequests(); } 
};
