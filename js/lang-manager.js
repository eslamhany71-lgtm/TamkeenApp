// قاموس الترجمة الشامل (عربي / إنجليزي)
const translations = {
    en: {
        // العناوين والنصوص
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
        
        // النصوص التوضيحية داخل الحقول (Placeholders)
        "reg-code-placeholder": "Enter your code (e.g., 1001)",
        "reg-phone-placeholder": "Your registered mobile number",
        "reg-email-placeholder": "example@clinic.com",
        "reg-pass-placeholder": "At least 6 characters or numbers"
    },
    ar: {
        // العناوين والنصوص
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
        
        // النصوص التوضيحية داخل الحقول (Placeholders)
        "reg-code-placeholder": "أدخل كودك (مثل: 1001)",
        "reg-phone-placeholder": "رقمك المسجل في النظام",
        "reg-email-placeholder": "example@clinic.com",
        "reg-pass-placeholder": "6 أرقام أو حروف على الأقل"
    }
};

// دالة لتغيير اللغة وحفظها
function setLanguage(lang) {
    localStorage.setItem('preferredLang', lang);
    applyLanguage(lang);
}

// دالة لتطبيق اللغة على العناصر الموجودة في الصفحة
function applyLanguage(lang) {
    // تغيير اتجاه الصفحة وتاج الـ html
    document.documentElement.lang = lang;
    document.body.dir = (lang === 'en') ? 'ltr' : 'rtl';

    // تطبيق الترجمة على العناصر لو القاموس موجود للغة دي
    if (translations[lang]) {
        for (const key in translations[lang]) {
            // لو الـ key بيعبر عن placeholder لحقل إدخال
            if (key.includes('-placeholder')) {
                // بنشيل كلمة "-placeholder" عشان نجيب الـ id الأصلي للحقل
                const inputId = key.replace('-placeholder', ''); 
                const inputElement = document.getElementById(inputId);
                if (inputElement) {
                    inputElement.placeholder = translations[lang][key];
                }
            } else {
                // لو عنصر نصي عادي (زي العناوين والزراير)
                const element = document.getElementById(key);
                if (element) {
                    element.textContent = translations[lang][key];
                }
            }
        }
    }

    // نداء على دالة الترجمة الخاصة بكل صفحة (لو لسه بتستخدمها في صفحات تانية)
    if (typeof updatePageContent === 'function') {
        updatePageContent(lang);
    }
}

// أول ما الصفحة تفتح، بنشوف اللغة المحفوظة ونطبقها
window.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('preferredLang') || 'ar';
    applyLanguage(savedLang);
});
