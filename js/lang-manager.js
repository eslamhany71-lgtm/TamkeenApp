// قاموس الترجمة الشامل (عربي / إنجليزي)
const translations = {
    en: {
        // --- Activate Page ---
        "page-title": "Activate Account - NivaDent",
        "txt-act-welcome": "Activate Clinic Account",
        "txt-act-sub": "Please enter the data registered with the system admin",
        "lbl-act-code": "Login Code",
        "lbl-act-phone": "Mobile Number",
        "lbl-act-email": "Clinic Email (for password recovery)",
        "lbl-act-pass": "Choose a New Password",
        "btn-activate": "Activate Account Now",
        "txt-back-str": "Already have an account?",
        "link-back-login": "Back to Login",
        "brand-act-title": "Welcome to NivaDent",
        "brand-act-desc": "We are glad to have you. Activate your account to access your clinic's dashboard, manage appointments, and handle patient files easily.",
        "feat-1": "✔️ Manage Appointments & Sessions",
        "feat-2": "✔️ Secure Medical Files",
        "feat-3": "✔️ Smart Prescriptions & Reports",
        "reg-code-placeholder": "Enter your code (e.g., 1001)",
        "reg-phone-placeholder": "Your registered mobile number",
        "reg-email-placeholder": "example@clinic.com",
        "reg-pass-placeholder": "At least 6 characters or numbers",

        // --- Patient Profile Page ---
        "txt-back": "Back to Patients",
        "txt-sess-title": "Treatment Sessions History",
        "btn-add-sess": "➕ Add Session",
        "btn-lab-order": "🔬 Lab Order",
        "th-date": "Date",
        "th-procedure": "Procedure",
        "th-total": "Total",
        "th-paid": "Paid",
        "th-remaining": "Remaining",
        "th-next-app": "Next Appt.",
        "th-action": "Actions",
        "btn-load-more-sessions": "⬇️ Load More Sessions...",
        "txt-lab-title": "🔬 Lab Orders History",
        
        // --- Lab Modal ---
        "modal-lab-title": "Send Lab Order",
        "lbl-lab-date": "Order Date",
        "lbl-lab-name": "Lab Name",
        "lbl-lab-work": "Work Type",
        "lbl-lab-cost": "Lab Cost (EGP)",
        "lbl-lab-delivery": "Expected Delivery",
        "lab-warning": "⚠️ Note: Lab costs will be recorded as 'Expenses' to be deducted from total revenue.",
        "btn-save-lab": "Save & Send Order",
        "lab_name-placeholder": "e.g: Al-Fayrouz Dental Lab",
        "lab_work_type-placeholder": "e.g: 3 Zirconia Crowns Upper Jaw",
        
        // --- Session Modals (Add/Edit) ---
        "modal-add-sess-title": "Add New Session",
        "modal-edit-sess-title": "Edit Session Details",
        "lbl-sess-date": "Session Date",
        "lbl-sess-next": "Next Appointment (Optional)",
        "lbl-sess-proc": "Medical Procedure",
        "lbl-sess-tooth": "Tooth Number (Optional)",
        "lbl-sess-total": "Total Amount",
        "lbl-sess-paid": "Paid Amount",
        "lbl-sess-remaining": "Remaining",
        "lbl-sess-notes": "Doctor Notes",
        "btn-save-session": "Save Session",
        "btn-update-session": "Save Changes",
        "sess_procedure-placeholder": "e.g., Root Canal, Extraction, Checkup...",
        "sess_tooth-placeholder": "e.g., Upper Right 6",
        
        // --- Session Details Page ---
        "txt-back-profile": "Back to Profile",
        "txt-sess-header": "Patient Session File:",
        "txt-total-calc": "Total Amount",
        "txt-paid-calc": "Paid",
        "txt-rem-calc": "Remaining",
        "txt-doc-notes": "Doctor Notes:",
        "btn-edit-sess": "✏️ Edit Session",
        "txt-rx-title": "💊 Session Prescription",
        "btn-add-rx": "➕ Issue Rx",
        "txt-att-title": "📸 Attachments & X-Rays",
        "btn-add-att": "➕ Upload Attachment",
        "txt-chart-title": "🦷 Medical Dental Chart"
    },
    ar: {
        // --- Activate Page ---
        "page-title": "تفعيل الحساب - NivaDent",
        "txt-act-welcome": "تفعيل حساب العيادة",
        "txt-act-sub": "يرجى إدخال البيانات المسجلة لدى إدارة النظام",
        "lbl-act-code": "كود الدخول",
        "lbl-act-phone": "رقم الموبايل",
        "lbl-act-email": "البريد الإلكتروني للعيادة (لاستعادة كلمة المرور)",
        "lbl-act-pass": "اختر كلمة مرور جديدة",
        "btn-activate": "تفعيل الحساب الآن",
        "txt-back-str": "لديك حساب بالفعل؟",
        "link-back-login": "العودة للدخول",
        "brand-act-title": "أهلاً بك في NivaDent",
        "brand-act-desc": "يسعدنا انضمامك. قم بتفعيل حسابك للوصول إلى لوحة تحكم عيادتك وإدارة مواعيدك وملفات مرضاك بكل سهولة.",
        "feat-1": "✔️ إدارة المواعيد والجلسات",
        "feat-2": "✔️ ملفات طبية آمنة",
        "feat-3": "✔️ روشتات وتقارير ذكية",
        "reg-code-placeholder": "أدخل كودك (مثل: 1001)",
        "reg-phone-placeholder": "رقمك المسجل في النظام",
        "reg-email-placeholder": "example@clinic.com",
        "reg-pass-placeholder": "6 أرقام أو حروف على الأقل",

        // --- Patient Profile Page ---
        "txt-back": "العودة لقائمة المرضى",
        "txt-sess-title": "سجل الجلسات العلاجية",
        "btn-add-sess": "➕ إضافة جلسة",
        "btn-lab-order": "🔬 طلب معمل",
        "th-date": "التاريخ",
        "th-procedure": "الإجراء الطبي",
        "th-total": "الإجمالي",
        "th-paid": "المدفوع",
        "th-remaining": "المتبقي",
        "th-next-app": "الموعد القادم",
        "th-action": "إجراءات",
        "btn-load-more-sessions": "⬇️ تحميل المزيد من الجلسات...",
        "txt-lab-title": "🔬 سجل طلبات المعامل (Lab Orders)",
        
        // --- Lab Modal ---
        "modal-lab-title": "إرسال طلب للمعمل",
        "lbl-lab-date": "تاريخ الطلب",
        "lbl-lab-name": "اسم المعمل",
        "lbl-lab-work": "نوع الشغل المطلوب",
        "lbl-lab-cost": "تكلفة المعمل (ج.م)",
        "lbl-lab-delivery": "موعد الاستلام المتوقع",
        "lab-warning": "⚠️ تنبيه: تكلفة المعمل هتتسجل كـ 'مصروفات' عشان تتخصم من إجمالي أرباح العيادة.",
        "btn-save-lab": "حفظ الطلب وإرساله",
        "lab_name-placeholder": "مثال: معمل الفيروز لطب الأسنان",
        "lab_work_type-placeholder": "مثال: 3 طرابيش زيركون للفك العلوي",

        // --- Session Modals (Add/Edit) ---
        "modal-add-sess-title": "إضافة جلسة جديدة",
        "modal-edit-sess-title": "تعديل بيانات الجلسة",
        "lbl-sess-date": "تاريخ الجلسة",
        "lbl-sess-next": "الموعد القادم (اختياري)",
        "lbl-sess-proc": "الإجراء الطبي",
        "lbl-sess-tooth": "رقم السن / الضرس (اختياري)",
        "lbl-sess-total": "إجمالي الحساب",
        "lbl-sess-paid": "المدفوع",
        "lbl-sess-remaining": "المتبقي",
        "lbl-sess-notes": "ملاحظات الطبيب",
        "btn-save-session": "حفظ الجلسة",
        "btn-update-session": "حفظ التعديلات",
        "sess_procedure-placeholder": "مثال: حشو عصب، خلع، كشف...",
        "sess_tooth-placeholder": "مثال: Upper Right 6",
        
        // --- Session Details Page ---
        "txt-back-profile": "العودة لملف المريض",
        "txt-sess-header": "ملف جلسة المريض:",
        "txt-total-calc": "إجمالي الحساب",
        "txt-paid-calc": "المدفوع",
        "txt-rem-calc": "المتبقي",
        "txt-doc-notes": "ملاحظات الطبيب:",
        "btn-edit-sess": "✏️ تعديل الجلسة",
        "txt-rx-title": "💊 روشتة الجلسة",
        "btn-add-rx": "➕ إصدار روشتة",
        "txt-att-title": "📸 مرفقات وأشعة",
        "btn-add-att": "➕ رفع مرفق",
        "txt-chart-title": "🦷 مخطط الأسنان الطبي"
    }
};

function setLanguage(lang) {
    localStorage.setItem('preferredLang', lang);
    applyLanguage(lang);
}

function applyLanguage(lang) {
    document.documentElement.lang = lang;
    document.body.dir = (lang === 'en') ? 'ltr' : 'rtl';

    if (translations[lang]) {
        for (const key in translations[lang]) {
            if (key.includes('-placeholder')) {
                const inputId = key.replace('-placeholder', ''); 
                const inputElement = document.getElementById(inputId);
                if (inputElement) {
                    inputElement.placeholder = translations[lang][key];
                }
            } else {
                const element = document.getElementById(key);
                if (element) {
                    element.textContent = translations[lang][key];
                }
            }
        }
    }

    if (typeof updatePageContent === 'function') {
        updatePageContent(lang);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('preferredLang') || 'ar';
    applyLanguage(savedLang);
});
