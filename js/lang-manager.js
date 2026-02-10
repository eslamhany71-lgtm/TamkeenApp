// دالة لتغيير اللغة وحفظها
function setLanguage(lang) {
    localStorage.setItem('preferredLang', lang);
    applyLanguage(lang);
}

// دالة لتطبيق اللغة على العناصر الموجودة في الصفحة
function applyLanguage(lang) {
    // تغيير اتجاه الصفحة
    document.body.dir = (lang === 'en') ? 'ltr' : 'rtl';

    // نداء على دالة الترجمة الخاصة بكل صفحة (لو موجودة)
    if (typeof updatePageContent === 'function') {
        updatePageContent(lang);
    }
}

// أول ما الصفحة تفتح، بنشوف اللغة المحفوظة ونطبقها
window.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('preferredLang') || 'ar';
    applyLanguage(savedLang);
});

