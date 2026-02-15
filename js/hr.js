// hr.js - نظام الخدمات الذاتية المطور (الإحصائيات اللحظية ومتابعة الطلبات)

let currentUserData = null;
let totalAnnualUsed = 0; // رصيد الإجازات السنوية المستنفذ (للمقبولة فقط)

// 1. مراقبة حالة تسجيل الدخول وجلب البيانات
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        const empCode = user.email.split('@')[0];
        fetchEmployeeData(empCode);
        loadMyRequests(empCode); // تحميل سجل الطلبات والإحصائيات فوراً
    } else {
        window.location.href = "index.html";
    }
});

// 2. جلب بيانات الموظف الأساسية من Firestore
async function fetchEmployeeData(code) {
    try {
        const doc = await firebase.firestore().collection("Employee_Database").doc(code).get();
        if (doc.exists) {
            currentUserData = doc.data();
            applyLockedFields(currentUserData);
        }
    } catch (error) {
        console.error("Error fetching employee data:", error);
    }
}

// 3. قفل الخانات الأساسية (كود، اسم، قسم)
function applyLockedFields(data) {
    const fields = {
        'empCode': data.employeeId || "",
        'empName': data.name || "",
        'empDept': data.department || "غير محدد"
    };
    for (let id in fields) {
        const el = document.getElementById(id);
        if (el) {
            el.value = fields[id];
            el.readOnly = true;
            el.style.backgroundColor = "#e9ecef";
        }
    }
}

// 4. تحميل سجل "طلباتي" وتحديث الإحصائيات (تحديث لحظي Real-time)
function loadMyRequests(empCode) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    
    // استخدام onSnapshot يضمن تحديث البيانات بمجرد موافقة المدير
    firebase.firestore().collection("HR_Requests")
        .where("employeeCode", "==", empCode)
        .orderBy("submittedAt", "desc") // ترتيب التنازلي (الأحدث أولاً)
        .onSnapshot((snapshot) => {
            const tableBody = document.getElementById('my-requests-table');
            if (!tableBody) return;

            tableBody.innerHTML = "";
            let approved = 0, rejected = 0, pending = 0, permits = 0;
            totalAnnualUsed = 0;

            snapshot.forEach((doc) => {
                const data = doc.data();
                
                // حساب الإحصائيات بناءً على الحالة
                if (data.status === "Approved") {
                    approved++;
                    // خصم الرصيد فقط في حالة الموافقة على إجازة سنوية
                    if (data.type === "vacation" && data.vacationType === "سنوية") {
                        totalAnnualUsed += calculateDays(data.startDate, data.endDate);
                    }
                } else if (data.status === "Rejected") {
                    rejected++;
                } else {
                    pending++; // أي حالة أخرى غير مقبول أو مرفوض تعتبر معلقة
                }

                // حساب الأذونات والتصاريح
                if (data.type === "late" || data.type === "exit") permits++;

                // إضافة الطلب للجدول مع Badge ملون للحالة
                const statusTranslated = translateStatus(data.status, lang);
                const row = `<tr>
                    <td>${translateType(data.type)} ${data.vacationType ? '('+data.vacationType+')' : ''}</td>
                    <td>${data.startDate || data.reqDate}</td>
                    <td><span class="badge ${data.status.toLowerCase()}">${statusTranslated}</span></td>
                </tr>`;
                tableBody.innerHTML += row;
            });

            // تحديث الأرقام في واجهة الموظف
            const balanceVal = Math.max(0, 21 - totalAnnualUsed);
            if(document.getElementById('vacation-balance')) document.getElementById('vacation-balance').innerText = balanceVal;
            if(document.getElementById('my-approved-count')) document.getElementById('my-approved-count').innerText = approved;
            if(document.getElementById('my-rejected-count')) document.getElementById('my-rejected-count').innerText = rejected;
            if(document.getElementById('my-permits-count')) document.getElementById('my-permits-count').innerText = permits;
            
            // إضافة عداد الطلبات المعلقة لو وجد عنصر له
            if(document.getElementById('my-pending-count')) document.getElementById('my-pending-count').innerText = pending;
        });
}

// دالة حساب فرق الأيام بين تاريخين
function calculateDays(start, end) {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e - s);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

// 5. التحكم في المودالات
function openForm(type) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const modal = document.getElementById('formModal');
    if (!modal) return;

    document.getElementById('requestType').value = type;
    document.getElementById('vacation-fields').style.display = (type === 'vacation') ? 'block' : 'none';
    document.getElementById('time-fields').style.display = (type !== 'vacation') ? 'block' : 'none';

    const titleObj = {
        vacation: lang === 'ar' ? "تقديم طلب إجازة" : "Vacation Request",
        late: lang === 'ar' ? "إذن تأخير" : "Late Permission",
        exit: lang === 'ar' ? "تصريح خروج" : "Exit Permit"
    };
    document.getElementById('modal-title').innerText = titleObj[type];
    modal.style.display = "block";
    if (currentUserData) applyLockedFields(currentUserData);
}

function closeForm() {
    document.getElementById('formModal').style.display = "none";
    document.getElementById('hrRequestForm').reset();
}

function openMyRequests() {
    document.getElementById('requestsModal').style.display = 'block';
}

function closeRequests() {
    document.getElementById('requestsModal').style.display = 'none';
}

// 6. إرسال الطلب مع التحقق الذكي (التكرار + الرصيد)
document.getElementById('hrRequestForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const submitBtn = document.getElementById('btn-submit');
    const type = document.getElementById('requestType').value;
    const vType = document.getElementById('vacType').value;
    const empCode = document.getElementById('empCode').value;

    const startDate = document.getElementById('startDate').value;
    const reqDate = document.getElementById('reqDate').value;
    const targetDate = (type === 'vacation') ? startDate : reqDate;

    if (!targetDate) {
        alert(lang === 'ar' ? "يرجى تحديد التاريخ!" : "Please select a date!");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerText = (lang === 'ar') ? "جاري المعالجة..." : "Processing...";

    try {
        // أ- التحقق من تكرار الطلب في نفس اليوم
        const dupSnapshot = await firebase.firestore().collection("HR_Requests")
            .where("employeeCode", "==", empCode)
            .where(type === 'vacation' ? "startDate" : "reqDate", "==", targetDate)
            .get();

        if (!dupSnapshot.empty) {
            alert(lang === 'ar' ? "لديك طلب مسجل بالفعل في هذا التاريخ!" : "Duplicate request for this date!");
            submitBtn.disabled = false;
            submitBtn.innerText = (lang === 'ar') ? "إرسال الطلب الآن" : "Submit Request";
            return;
        }

        // ب- التحقق من رصيد السنوي
        if (type === 'vacation' && vType === 'سنوية') {
            const requestedDays = calculateDays(startDate, document.getElementById('endDate').value);
            if (totalAnnualUsed + requestedDays > 21) {
                const msg = lang === 'ar' 
                    ? `تنبيه: رصيدك السنوي المتبقي لا يكفي. هل تريد الإرسال كإجازة بدون أجر؟`
                    : `Warning: Your balance is insufficient. Submit as unpaid leave?`;
                if (!confirm(msg)) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = (lang === 'ar') ? "إرسال الطلب الآن" : "Submit Request";
                    return;
                }
            }
        }

        // ج- حفظ الطلب
        const requestData = {
            type: type,
            employeeCode: empCode,
            employeeName: document.getElementById('empName').value,
            department: document.getElementById('empDept').value,
            jobTitle: document.getElementById('empJob').value,
            hiringDate: document.getElementById('hireDate').value,
            vacationType: (type === 'vacation') ? vType : null,
            startDate: (type === 'vacation') ? startDate : null,
            endDate: (type === 'vacation') ? document.getElementById('endDate').value : null,
            reqDate: (type !== 'vacation') ? reqDate : null,
            reqTime: (type !== 'vacation') ? document.getElementById('reqTime').value : null,
            reason: document.getElementById('reqReason').value,
            status: "Pending", // يبدأ دائماً كمعلق
            submittedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await firebase.firestore().collection("HR_Requests").add(requestData);
        alert(lang === 'ar' ? "تم إرسال طلبك بنجاح!" : "Request sent successfully!");
        closeForm();
        if (currentUserData) applyLockedFields(currentUserData);

    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = (lang === 'ar') ? "إرسال الطلب الآن" : "Submit Request";
    }
});

// 7. دوال الترجمة
function translateStatus(status, lang) {
    const statuses = {
        'Pending': lang === 'ar' ? 'قيد الانتظار' : 'Pending',
        'Approved': lang === 'ar' ? 'مقبول' : 'Approved',
        'Rejected': lang === 'ar' ? 'مرفوض' : 'Rejected'
    };
    return statuses[status] || status;
}

function translateType(type) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const types = { vacation: "إجازة", late: "إذن تأخير", exit: "تصريح خروج" };
    const typesEn = { vacation: "Vacation", late: "Late Perm.", exit: "Exit Permit" };
    return lang === 'ar' ? (types[type] || type) : (typesEn[type] || type);
}

function updatePageContent(lang) {
    const translations = {
        ar: {
            header: "الخدمات الذاتية للموظفين", back: "رجوع", vacation: "طلب إجازة", late: "إذن تأخير", exit: "تصريح خروج",
            code: "كود الموظف", name: "اسم الموظف", job: "الوظيفة", dept: "الإدارة / القسم", hire: "تاريخ التعيين",
            submit: "إرسال الطلب الآن", myOrders: "سجل طلباتي", subMyOrders: "الإحصائيات وحالة الطلبات"
        },
        en: {
            header: "Employees Self Services", back: "Back", vacation: "Vacation Request", late: "Late Permission", exit: "Exit Permit",
            code: "Emp. Code", name: "Emp. Name", job: "Job Title", dept: "Department", hire: "Hiring Date",
            submit: "Submit Request", myOrders: "My Requests", subMyOrders: "Stats & History"
        }
    };
    const t = translations[lang];
    if(!t) return;
    const elements = {
        'txt-header': t.header, 'btn-back': t.back, 'txt-vacation': t.vacation, 'txt-late': t.late, 'txt-exit': t.exit,
        'lbl-code': t.code, 'lbl-name': t.name, 'lbl-job': t.job, 'lbl-dept': t.dept, 'lbl-hire': t.hire,
        'btn-submit': t.submit, 'txt-my-orders': t.myOrders, 'sub-my-orders': t.subMyOrders
    };
    for (let id in elements) {
        const el = document.getElementById(id);
        if(el) el.innerText = elements[id];
    }
}

// 8. تهيئة عند التحميل
window.onload = () => {
    const savedLang = localStorage.getItem('preferredLang') || 'ar';
    updatePageContent(savedLang);
};

// إغلاق المودالات عند الضغط خارجها
window.onclick = (event) => {
    if (event.target.className === 'modal') {
        closeForm();
        closeRequests();
    }
}
