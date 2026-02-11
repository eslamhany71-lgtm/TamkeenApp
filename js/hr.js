// ملاحظة: شلنا سطر const db = firebase.firestore() لأنه موجود في ملف auth.js اللي بيتحمل قبله

// 1. فتح الفورم وتخصيص الخانات
function openForm(type) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    
    // التأكد من أن المودال موجود قبل الشغل
    const modal = document.getElementById('formModal');
    if (!modal) return;

    document.getElementById('requestType').value = type;
    
    // إخفاء المجموعات الخاصة أولاً
    document.getElementById('vacation-fields').style.display = 'none';
    document.getElementById('time-fields').style.display = 'none';

    if (type === 'vacation') {
        document.getElementById('vacation-fields').style.display = 'block';
        document.getElementById('modal-title').innerText = (lang === 'ar') ? "طلب إجازة" : "Vacation Request";
    } else {
        document.getElementById('time-fields').style.display = 'block';
        const title = (type === 'late') ? 
            (lang === 'ar' ? "إذن تأخير" : "Late Permission") : 
            (lang === 'ar' ? "تصريح خروج" : "Exit Permit");
        document.getElementById('modal-title').innerText = title;
    }

    modal.style.display = "block";
}

function closeForm() {
    document.getElementById('formModal').style.display = "none";
}

// 2. إرسال الطلب لـ Firebase (بنستخدم db اللي اتعرفت في auth.js)
const hrForm = document.getElementById('hrRequestForm');
if (hrForm) {
    hrForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const submitBtn = document.getElementById('btn-submit');
        submitBtn.innerText = "...";
        submitBtn.disabled = true;

        const data = {
            type: document.getElementById('requestType').value,
            employeeCode: document.getElementById('empCode').value,
            employeeName: document.getElementById('empName').value,
            jobTitle: document.getElementById('empJob').value,
            department: document.getElementById('empDept').value,
            hiringDate: document.getElementById('hireDate').value,
            vacationType: document.getElementById('vacType').value || null,
            startDate: document.getElementById('startDate').value || null,
            endDate: document.getElementById('endDate').value || null,
            backupEmployee: document.getElementById('backupEmp').value || "N/A",
            reqDate: document.getElementById('reqDate').value || null,
            reqTime: document.getElementById('reqTime').value || null,
            reason: document.getElementById('reqReason').value,
            status: "Pending",
            submittedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // بنستخدم firebase.firestore() مباشرة لضمان عدم حدوث تداخل
        firebase.firestore().collection("HR_Requests").add(data)
        .then(() => {
            alert("تم إرسال طلبك بنجاح!");
            closeForm();
            hrForm.reset();
        })
        .catch((err) => alert("Error: " + err.message))
        .finally(() => {
            submitBtn.innerText = "إرسال الطلب الآن";
            submitBtn.disabled = false;
        });
    });
}

// 3. نظام اللغة
function updatePageContent(lang) {
    const translations = {
        ar: {
            header: "الخدمات الذاتية", back: "رجوع", vacation: "طلب إجازة", late: "إذن تأخير", exit: "تصريح خروج",
            code: "كود الموظف", name: "اسم الموظف", job: "الوظيفة", dept: "الإدارة / القسم", hire: "تاريخ التعيين",
            vType: "نوع الإجازة", from: "من تاريخ", to: "إلى تاريخ", backup: "الموظف البديل (اختياري)",
            rDate: "تاريخ الإذن", time: "الوقت", reason: "السبب / التفاصيل", submit: "إرسال الطلب الآن"
        },
        en: {
            header: "Self Services", back: "Back", vacation: "Vacation Request", late: "Late Permission", exit: "Exit Permit",
            code: "Emp. Code", name: "Emp. Name", job: "Job Title", dept: "Department", hire: "Hiring Date",
            vType: "Vacation Type", from: "From Date", to: "To Date", backup: "Backup Person (Optional)",
            rDate: "Request Date", time: "Time", reason: "Reason / Details", submit: "Submit Request"
        }
    };
    const t = translations[lang];
    if(document.getElementById('txt-header')) document.getElementById('txt-header').innerText = t.header;
    if(document.getElementById('btn-back')) document.getElementById('btn-back').innerText = t.back;
    if(document.getElementById('txt-vacation')) document.getElementById('txt-vacation').innerText = t.vacation;
    if(document.getElementById('txt-late')) document.getElementById('txt-late').innerText = t.late;
    if(document.getElementById('txt-exit')) document.getElementById('txt-exit').innerText = t.exit;
    if(document.getElementById('lbl-code')) document.getElementById('lbl-code').innerText = t.code;
    if(document.getElementById('lbl-name')) document.getElementById('lbl-name').innerText = t.name;
    if(document.getElementById('lbl-job')) document.getElementById('lbl-job').innerText = t.job;
    if(document.getElementById('lbl-dept')) document.getElementById('lbl-dept').innerText = t.dept;
    if(document.getElementById('lbl-hire')) document.getElementById('lbl-hire').innerText = t.hire;
    if(document.getElementById('lbl-vac-type')) document.getElementById('lbl-vac-type').innerText = t.vType;
    if(document.getElementById('lbl-from')) document.getElementById('lbl-from').innerText = t.from;
    if(document.getElementById('lbl-to')) document.getElementById('lbl-to').innerText = t.to;
    if(document.getElementById('lbl-backup')) document.getElementById('lbl-backup').innerText = t.backup;
    if(document.getElementById('lbl-req-date')) document.getElementById('lbl-req-date').innerText = t.rDate;
    if(document.getElementById('lbl-time')) document.getElementById('lbl-time').innerText = t.time;
    if(document.getElementById('lbl-reason')) document.getElementById('lbl-reason').innerText = t.reason;
    if(document.getElementById('btn-submit')) document.getElementById('btn-submit').innerText = t.submit;
}
