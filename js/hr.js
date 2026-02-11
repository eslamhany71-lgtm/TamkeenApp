const db = firebase.firestore();

// 1. فتح الفورم وتخصيص الخانات
function openForm(type) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.getElementById('requestType').value = type;
    
    // إخفاء المجموعات الخاصة
    document.getElementById('vacation-fields').style.display = 'none';
    document.getElementById('time-fields').style.display = 'none';

    if (type === 'vacation') {
        document.getElementById('vacation-fields').style.display = 'block';
        document.getElementById('modal-title').innerText = (lang === 'ar') ? "طلب إجازة" : "Vacation Request";
    } else {
        document.getElementById('time-fields').style.display = 'block';
        document.getElementById('modal-title').innerText = (lang === 'ar') ? (type === 'late' ? "إذن تأخير" : "تصريح خروج") : (type === 'late' ? "Late Permission" : "Exit Permit");
    }

    document.getElementById('formModal').style.display = "block";
}

function closeForm() {
    document.getElementById('formModal').style.display = "none";
}

// 2. إرسال الطلب لـ Firebase
document.getElementById('hrRequestForm').addEventListener('submit', (e) => {
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
        // بيانات الإجازة
        vacationType: document.getElementById('vacType').value || null,
        startDate: document.getElementById('startDate').value || null,
        endDate: document.getElementById('endDate').value || null,
        backupEmployee: document.getElementById('backupEmp').value || "N/A",
        // بيانات الأذونات
        reqDate: document.getElementById('reqDate').value || null,
        reqTime: document.getElementById('reqTime').value || null,
        
        reason: document.getElementById('reqReason').value,
        status: "Pending",
        submittedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    db.collection("HR_Requests").add(data)
    .then(() => {
        alert("تم إرسال طلبك بنجاح!");
        closeForm();
        document.getElementById('hrRequestForm').reset();
    })
    .catch((err) => alert("Error: " + err.message))
    .finally(() => {
        submitBtn.innerText = "إرسال الطلب الآن";
        submitBtn.disabled = false;
    });
});

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
    document.getElementById('txt-header').innerText = t.header;
    document.getElementById('btn-back').innerText = t.back;
    document.getElementById('txt-vacation').innerText = t.vacation;
    document.getElementById('txt-late').innerText = t.late;
    document.getElementById('txt-exit').innerText = t.exit;
    document.getElementById('lbl-code').innerText = t.code;
    document.getElementById('lbl-name').innerText = t.name;
    document.getElementById('lbl-job').innerText = t.job;
    document.getElementById('lbl-dept').innerText = t.dept;
    document.getElementById('lbl-hire').innerText = t.hire;
    document.getElementById('lbl-vac-type').innerText = t.vType;
    document.getElementById('lbl-from').innerText = t.from;
    document.getElementById('lbl-to').innerText = t.to;
    document.getElementById('lbl-backup').innerText = t.backup;
    document.getElementById('lbl-req-date').innerText = t.rDate;
    document.getElementById('lbl-time').innerText = t.time;
    document.getElementById('lbl-reason').innerText = t.reason;
    document.getElementById('btn-submit').innerText = t.submit;
}
