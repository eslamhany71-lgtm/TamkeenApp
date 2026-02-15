// hr.js - النظام الموحد للخدمات الذاتية (النسخة الاحترافية الشاملة)

let currentUserData = null;
let totalAnnualUsed = 0; // رصيد الإجازات السنوية المستخدمة

// 1. مراقبة حالة تسجيل الدخول وجلب البيانات
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        const empCode = user.email.split('@')[0];
        fetchEmployeeData(empCode);
        loadMyRequests(empCode); // تحميل سجل الطلبات والإحصائيات
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
    const fixedFields = {
        'empCode': data.employeeId || "",
        'empName': data.name || "",
        'empDept': data.department || "غير محدد"
    };
    for (let id in fixedFields) {
        const el = document.getElementById(id);
        if (el) {
            el.value = fixedFields[id];
            el.readOnly = true;
            el.style.backgroundColor = "#e9ecef"; // لون رمادي للقفل
        }
    }
}

// 4. تحميل سجل "طلباتي" وحساب الإحصائيات ورصيد الإجازات
function loadMyRequests(empCode) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    
    firebase.firestore().collection("HR_Requests")
        .where("employeeCode", "==", empCode)
        .onSnapshot((snapshot) => {
            const tableBody = document.getElementById('my-requests-table');
            if (!tableBody) return;

            tableBody.innerHTML = "";
            let approved = 0, rejected = 0, permits = 0;
            totalAnnualUsed = 0;

            snapshot.forEach((doc) => {
                const data = doc.data();
                
                // حساب الحالات للإحصائيات
                if (data.status === "Approved") {
                    approved++;
                    // إذا كانت إجازة سنوية مقبولة، نحسب أيامها من الرصيد
                    if (data.type === "vacation" && data.vacationType === "سنوية") {
                        totalAnnualUsed += calculateDays(data.startDate, data.endDate);
                    }
                }
                if (data.status === "Rejected") rejected++;
                if (data.type === "late" || data.type === "exit") permits++;

                // إضافة سطر للجدول
                const row = `<tr>
                    <td>${translateType(data.type)} ${data.vacationType ? '('+data.vacationType+')' : ''}</td>
                    <td>${data.startDate || data.reqDate}</td>
                    <td><span class="badge ${data.status.toLowerCase()}">${data.status}</span></td>
                </tr>`;
                tableBody.innerHTML += row;
            });

            // تحديث واجهة الإحصائيات
            const balanceVal = Math.max(0, 21 - totalAnnualUsed);
            if(document.getElementById('vacation-balance')) document.getElementById('vacation-balance').innerText = balanceVal;
            if(document.getElementById('my-approved-count')) document.getElementById('my-approved-count').innerText = approved;
            if(document.getElementById('my-rejected-count')) document.getElementById('my-rejected-count').innerText = rejected;
            if(document.getElementById('my-permits-count')) document.getElementById('my-permits-count').innerText = permits;
        });
}

// دالة مساعدة لحساب فرق الأيام
function calculateDays(start, end) {
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e - s);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

// 5. وظائف فتح وإغلاق المودالات
function openForm(type) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const modal = document.getElementById('formModal');
    if (!modal) return;

    document.getElementById('requestType').value = type;
    document.getElementById('vacation-fields').style.display = (type === 'vacation') ? 'block' : 'none';
    document.getElementById('time-fields').style.display = (type !== 'vacation') ? 'block' : 'none';

    // تحديث عنوان المودال
    const titleObj = {
        vacation: lang === 'ar' ? "طلب إجازة" : "Vacation Request",
        late: lang === 'ar' ? "إذن تأخير" : "Late Permission",
        exit: lang === 'ar' ? "تصريح خروج" : "Exit Permit"
    };
    document.getElementById('modal-title').innerText = titleObj[type];

    modal.style.display = "block";
    if (currentUserData) applyLockedFields(currentUserData);
}

function closeForm() {
    document.getElementById('formModal').style.display = "none";
}

function openMyRequests() {
    document.getElementById('requestsModal').style.display = 'block';
}

function closeRequests() {
    document.getElementById('requestsModal').style.display = 'none';
}

// 6. معالجة إرسال الطلب مع الفحص (التكرار + الرصيد)
const hrForm = document.getElementById('hrRequestForm');
if (hrForm) {
    hrForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const lang = localStorage.getItem('preferredLang') || 'ar';
        const submitBtn = document.getElementById('btn-submit');
        const type = document.getElementById('requestType').value;
        const vType = document.getElementById('vacType').value;
        const empCode = document.getElementById('empCode').value;

        // تحديد التاريخ المراد فحصه
        const startDate = document.getElementById('startDate').value;
        const reqDate = document.getElementById('reqDate').value;
        const targetDate = (type === 'vacation') ? startDate : reqDate;

        if (!targetDate) {
            alert(lang === 'ar' ? "يرجى تحديد التاريخ!" : "Please select a date!");
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerText = (lang === 'ar') ? "جاري التحقق..." : "Checking...";

        try {
            // أ- فحص التكرار (طلب في نفس اليوم)
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

            // ب- فحص رصيد الإجازات السنوية (21 يوم)
            if (type === 'vacation' && vType === 'سنوية') {
                const requestedDays = calculateDays(startDate, document.getElementById('endDate').value);
                if (totalAnnualUsed + requestedDays > 21) {
                    const confirmMsg = lang === 'ar' 
                        ? `لقد تجاوزت رصيد الـ 21 يوماً. هل تريد الإرسال كإجازة قد تخصم من الراتب؟`
                        : `You have exceeded 21 days balance. Submit as unpaid leave?`;
                    if (!confirm(confirmMsg)) {
                        submitBtn.disabled = false;
                        submitBtn.innerText = (lang === 'ar') ? "إرسال الطلب الآن" : "Submit Request";
                        return;
                    }
                }
            }

            // ج- تنفيذ الإرسال
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
                status: "Pending",
                submittedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await firebase.firestore().collection("HR_Requests").add(requestData);
            alert(lang === 'ar' ? "تم إرسال طلبك بنجاح!" : "Request sent successfully!");
            closeForm();
            hrForm.reset();
            if (currentUserData) applyLockedFields(currentUserData);

        } catch (err) {
            console.error(err);
            alert("Error: " + err.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = (lang === 'ar') ? "إرسال الطلب الآن" : "Submit Request";
        }
    });
}

// 7. نظام اللغة
function updatePageContent(lang) {
    const translations = {
        ar: {
            header: "الخدمات الذاتية للموظفين", back: "رجوع", vacation: "طلب إجازة", late: "إذن تأخير", exit: "تصريح خروج",
            code: "كود الموظف", name: "اسم الموظف", job: "الوظيفة", dept: "الإدارة / القسم", hire: "تاريخ التعيين",
            vType: "نوع الإجازة", from: "من تاريخ", to: "إلى تاريخ", reason: "السبب / التفاصيل", submit: "إرسال الطلب الآن",
            myOrders: "سجل طلباتي", subMyOrders: "الإحصائيات وحالة الطلبات"
        },
        en: {
            header: "Employees Self Services", back: "Back", vacation: "Vacation Request", late: "Late Permission", exit: "Exit Permit",
            code: "Emp. Code", name: "Emp. Name", job: "Job Title", dept: "Department", hire: "Hiring Date",
            vType: "Vacation Type", from: "From Date", to: "To Date", reason: "Reason / Details", submit: "Submit Request",
            myOrders: "My Requests", subMyOrders: "Stats & History"
        }
    };
    const t = translations[lang];
    if(!t) return;
    
    // تحديث النصوص
    const elements = {
        'txt-header': t.header, 'btn-back': t.back, 'txt-vacation': t.vacation, 'txt-late': t.late, 'txt-exit': t.exit,
        'lbl-code': t.code, 'lbl-name': t.name, 'lbl-job': t.job, 'lbl-dept': t.dept, 'lbl-hire': t.hire,
        'lbl-reason': t.reason, 'btn-submit': t.submit, 'txt-my-orders': t.myOrders, 'sub-my-orders': t.subMyOrders
    };

    for (let id in elements) {
        const el = document.getElementById(id);
        if(el) el.innerText = elements[id];
    }
}

function translateType(type) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const types = { vacation: "إجازة", late: "إذن تأخير", exit: "تصريح خروج" };
    const typesEn = { vacation: "Vacation", late: "Late Perm.", exit: "Exit Permit" };
    return lang === 'ar' ? (types[type] || type) : (typesEn[type] || type);
}

// تشغيل عند التحميل
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
