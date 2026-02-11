// 1. نظام الترجمة
const translations = {
    ar: {
        header: "الخدمات الذاتية للموظفين",
        vacation: "طلب إجازة",
        vacationSub: "تقديم طلب إجازة سنوية أو عارضة",
        late: "إذن تأخير",
        lateSub: "طلب إذن حضور متأخر للعمل",
        exit: "تصريح خروج",
        exitSub: "طلب تصريح خروج أثناء ساعات العمل",
        back: "رجوع",
        submit: "إرسال الطلب",
        name: "اسم الموظف",
        date: "التاريخ",
        reason: "السبب / التفاصيل",
        dir: "rtl"
    },
    en: {
        header: "Employee Self-Service",
        vacation: "Vacation Request",
        vacationSub: "Submit annual or casual leave",
        late: "Late Permission",
        lateSub: "Request permission for late arrival",
        exit: "Exit Permit",
        exitSub: "Request permit during work hours",
        back: "Back",
        submit: "Submit Request",
        name: "Employee Name",
        date: "Date",
        reason: "Reason / Details",
        dir: "ltr"
    }
};

function changeLang(lang) {
    const t = translations[lang];
    document.getElementById('txt-header').innerText = t.header;
    document.getElementById('txt-vacation').innerText = t.vacation;
    document.getElementById('sub-vacation').innerText = t.vacationSub;
    document.getElementById('txt-late').innerText = t.late;
    document.getElementById('sub-late').innerText = t.lateSub;
    document.getElementById('txt-exit').innerText = t.exit;
    document.getElementById('sub-exit').innerText = t.exitSub;
    document.getElementById('btn-back').innerText = t.back;
    document.getElementById('btn-submit').innerText = t.submit;
    document.getElementById('lbl-name').innerText = t.name;
    document.getElementById('lbl-date').innerText = t.date;
    document.getElementById('lbl-reason').innerText = t.reason;
    document.body.dir = t.dir;
    localStorage.setItem('preferredLang', lang);
}

// 2. فتح وإغلاق النموذج
function openForm(type) {
    document.getElementById('requestType').value = type;
    document.getElementById('modal-title').innerText = translations[localStorage.getItem('preferredLang') || 'ar'][type];
    document.getElementById('formModal').style.display = "block";
}

function closeForm() {
    document.getElementById('formModal').style.display = "none";
}

// 3. إرسال البيانات لـ Firebase Firestore
const db = firebase.firestore();

document.getElementById('hrRequestForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const requestData = {
        type: document.getElementById('requestType').value,
        employee: document.getElementById('empName').value,
        date: document.getElementById('reqDate').value,
        reason: document.getElementById('reqReason').value,
        submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
        status: "Pending"
    };

    db.collection("HR_Requests").add(requestData)
    .then(() => {
        alert("تم إرسال طلبك بنجاح!");
        closeForm();
        document.getElementById('hrRequestForm').reset();
    })
    .catch((error) => {
        alert("خطأ في الإرسال: " + error.message);
    });
});

// تشغيل اللغة عند التحميل
window.onload = () => {
    changeLang(localStorage.getItem('preferredLang') || 'ar');
};
function openForm(type) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.getElementById('requestType').value = type;
    
    // إخفاء كل الخانات الخاصة أولاً
    document.getElementById('vacation-only').style.display = 'none';
    document.getElementById('time-only').style.display = 'none';

    // إظهار الخانات بناءً على النوع
    if (type === 'vacation') {
        document.getElementById('vacation-only').style.display = 'block';
        document.getElementById('modal-title').innerText = (lang === 'ar') ? "طلب إجازة" : "Vacation Request";
    } 
    else if (type === 'late') {
        document.getElementById('time-only').style.display = 'block';
        document.getElementById('modal-title').innerText = (lang === 'ar') ? "إذن تأخير" : "Late Permission";
    } 
    else if (type === 'exit') {
        document.getElementById('time-only').style.display = 'block';
        document.getElementById('modal-title').innerText = (lang === 'ar') ? "تصريح خروج" : "Exit Permit";
    }

    document.getElementById('formModal').style.display = "block";
}
