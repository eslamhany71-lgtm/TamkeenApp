function updatePageContent(lang) {
    const translations = {
        ar: {
            welcome: "أهلاً بك في نظام الإدارة الموحد",
            calc: "حاسبة القروض",
            branches: "الفروع",
            hr: "شؤون الموظفين"
        },
        en: {
            welcome: "Welcome to Unified Management System",
            calc: "Loan Calculator",
            branches: "Branches",
            hr: "HR Solution"
        }
    };

    const t = translations[lang];
    
    // تأكد إن العناصر دي ليها IDs في الـ HTML بتاعك
    if(document.getElementById('txt-welcome')) document.getElementById('txt-welcome').innerText = t.welcome;
    if(document.getElementById('txt-calc')) document.getElementById('txt-calc').innerText = t.calc;
    // وهكذا لباقي العناصر...
}
