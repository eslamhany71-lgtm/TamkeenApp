// hr.js - النظام الموحد للخدمات الذاتية (نسخة منع التكرار الاحترافية)

let currentUserData = null;

// 1. مراقبة حالة تسجيل الدخول وجلب بيانات الموظف
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        const empCode = user.email.split('@')[0];
        fetchEmployeeData(empCode);
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
    } catch (error) {
        console.error("Error fetching employee data:", error);
    }
}

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
            el.style.backgroundColor = "#e9ecef";
        }
    }
}

// 2. فتح وإغلاق المودال
function openForm(type) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const modal = document.getElementById('formModal');
    if (!modal) return;

    document.getElementById('requestType').value = type;
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
    if (currentUserData) applyLockedFields(currentUserData);
}

function closeForm() {
    document.getElementById('formModal').style.display = "none";
}

// 3. دالة التحقق من وجود طلب مسبق في نفس التاريخ
async function checkDuplicateRequest(empCode, date, type) {
    // سنبحث عن أي طلب لهذا الموظف في هذا التاريخ
    // ملحوظة: في الإجازات نبحث في startDate، وفي الأذونات نبحث في reqDate
    const collection = firebase.firestore().collection("HR_Requests");
    
    let query;
    if (type === 'vacation') {
        query = collection.where("employeeCode", "==", empCode).where("startDate", "==", date);
    } else {
        query = collection.where("employeeCode", "==", empCode).where("reqDate", "==", date);
    }

    const snapshot = await query.get();
    return !snapshot.empty; // إذا كانت ليست فارغة، يعني يوجد طلب مسبق
}

// 4. إرسال الطلب مع التحقق من التكرار
const hrForm = document.getElementById('hrRequestForm');
if (hrForm) {
    hrForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const lang = localStorage.getItem('preferredLang') || 'ar';
        const submitBtn = document.getElementById('btn-submit');
        const type = document.getElementById('requestType').value;
        const empCode = document.getElementById('empCode').value;

        // تحديد التاريخ المراد فحصه بناءً على نوع الطلب
        const targetDate = (type === 'vacation') ? 
            document.getElementById('startDate').value : 
            document.getElementById('reqDate').value;

        if (!targetDate) {
            alert(lang === 'ar' ? "يرجى تحديد التاريخ!" : "Please select a date!");
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerText = (lang === 'ar') ? "جاري التحقق..." : "Checking...";

        try {
            // --- خطوة الحماية: التحقق من التكرار ---
            const isDuplicate = await checkDuplicateRequest(empCode, targetDate, type);
            
            if (isDuplicate) {
                const msg = (lang === 'ar') ? 
                    `لديك طلب مسجل بالفعل لهذا التاريخ (${targetDate}). لا يمكن التكرار.` : 
                    `You already have a request for this date (${targetDate}). Duplicate not allowed.`;
                alert(msg);
                submitBtn.disabled = false;
                submitBtn.innerText = (lang === 'ar') ? "إرسال الطلب الآن" : "Submit Request";
                return; // إيقاف العملية هنا
            }

            // إذا لم يكن مكرراً، نكمل الإرسال
            const requestData = {
                type: type,
                employeeCode: empCode,
                employeeName: document.getElementById('empName').value,
                department: document.getElementById('empDept').value,
                jobTitle: document.getElementById('empJob').value,
                hiringDate: document.getElementById('hireDate').value,
                vacationType: document.getElementById('vacType')?.value || null,
                startDate: document.getElementById('startDate')?.value || null,
                endDate: document.getElementById('endDate')?.value || null,
                backupEmployee: document.getElementById('backupEmp')?.value || "N/A",
                reqDate: document.getElementById('reqDate')?.value || null,
                reqTime: document.getElementById('reqTime')?.value || null,
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

// 5. نظام اللغة
function updatePageContent(lang) {
    const translations = {
        ar: {
            header: "الخدمات الذاتية للموظفين", back: "رجوع", vacation: "طلب إجازة", late: "إذن تأخير", exit: "تصريح خروج",
            code: "كود الموظف", name: "اسم الموظف", job: "الوظيفة", dept: "الإدارة / القسم", hire: "تاريخ التعيين",
            vType: "نوع الإجازة", from: "من تاريخ", to: "إلى تاريخ", backup: "الموظف البديل (اختياري)",
            rDate: "تاريخ الإذن", time: "الوقت", reason: "السبب / التفاصيل", submit: "إرسال الطلب الآن"
        },
        en: {
            header: "Employees Self Services", back: "Back", vacation: "Vacation Request", late: "Late Permission", exit: "Exit Permit",
            code: "Emp. Code", name: "Emp. Name", job: "Job Title", dept: "Department", hire: "Hiring Date",
            vType: "Vacation Type", from: "From Date", to: "To Date", backup: "Backup Person (Optional)",
            rDate: "Request Date", time: "Time", reason: "Reason / Details", submit: "Submit Request"
        }
    };
    const t = translations[lang];
    if(!t) return;
    Object.keys(t).forEach(key => {
        const el = document.getElementById(`txt-${key}`) || document.getElementById(`lbl-${key}`) || document.getElementById(`btn-${key}`);
        if(el) el.innerText = t[key];
    });
}

window.onload = () => {
    const savedLang = localStorage.getItem('preferredLang') || 'ar';
    updatePageContent(savedLang);
};

window.onclick = (event) => {
    if (event.target == document.getElementById('formModal')) closeForm();
}
