// js/home.js - NivaDent Master Shell (SaaS Routing, Dynamic Branding, Roles, Translations)

const SMART_VERSION = Math.floor(Date.now() / 3600000); 

function applyTheme(themeName) {
    document.body.setAttribute('data-theme', themeName);
    localStorage.setItem('niva_theme', themeName);
    
    const themeBtn = document.getElementById('btn-theme');
    if (themeName === 'dark') {
        themeBtn.innerText = '☀️';
        themeBtn.title = 'الوضع الفاتح';
    } else {
        themeBtn.innerText = '🌙';
        themeBtn.title = 'الوضع الليلي';
    }

    const frame = document.getElementById('content-frame');
    if (frame && frame.contentWindow) {
        frame.contentWindow.postMessage({ type: 'THEME_CHANGE', theme: themeName }, '*');
    }
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
}

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('niva_theme') || 'light';
    applyTheme(savedTheme);

    // 🔴 تفعيل التثبيت المحفوظ للقائمة الجانبية 🔴
    if (localStorage.getItem('sidebarPinned') === 'true' && window.innerWidth > 992) {
        document.body.classList.add('sidebar-pinned');
    }

    let overlay = document.createElement('div');
    overlay.id = 'mobile-overlay';
    overlay.className = 'mobile-overlay';
    overlay.onclick = toggleSidebar; 
    document.body.appendChild(overlay);
});

function loadPage(pageUrl, clickedLi) {
    if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري فتح الصفحة..." : "Loading page...");
    
    let finalUrl = pageUrl.includes('?') 
        ? `${pageUrl}&v=${SMART_VERSION}` 
        : `${pageUrl}?v=${SMART_VERSION}`;

    const frame = document.getElementById('content-frame');
    frame.src = finalUrl;
    
    frame.onload = function() {
        if (window.hideLoader) window.hideLoader();
        const currentTheme = document.body.getAttribute('data-theme');
        frame.contentWindow.postMessage({ type: 'THEME_CHANGE', theme: currentTheme }, '*');
    };
    
    sessionStorage.setItem('lastOpenedPage', pageUrl);

    if (clickedLi) {
        const allLinks = document.querySelectorAll('#nav-links li');
        allLinks.forEach(li => li.classList.remove('active'));
        clickedLi.classList.add('active');
        if(clickedLi.id) {
            sessionStorage.setItem('lastActiveNavId', clickedLi.id);
        }
    } else {
        const lastNavId = sessionStorage.getItem('lastActiveNavId');
        if (lastNavId) {
            const allLinks = document.querySelectorAll('#nav-links li');
            allLinks.forEach(li => li.classList.remove('active'));
            const activeLi = document.getElementById(lastNavId);
            if(activeLi) activeLi.classList.add('active');
        }
    }

    if (window.innerWidth <= 992) {
        document.getElementById('sidebar').classList.remove('active');
        const overlay = document.getElementById('mobile-overlay');
        if(overlay) overlay.classList.remove('active');
    }
}

function switchAppLanguage(lang) {
    setLanguage(lang); 
    updatePageContent(lang); 
    const frame = document.getElementById('content-frame');
    if(frame.contentWindow) {
        frame.contentWindow.location.reload();
    }
}

function updatePageContent(lang) {
    const t = {
        ar: {
            header: "لوحة التحكم",
            navDash: "الداشبورد", navPatients: "المرضى والأشعة", navCalendar: "المواعيد والتقويم", 
            navFinances: "الحسابات والمصروفات",
            navInventory: "المخزون الطبي", 
            navSettings: "إعدادات العيادة", navSuper: "إدارة النظام المركزية", logout: "تسجيل خروج",
            alertText: "⚠️ تنبيه هام: اشتراك العيادة سينتهي خلال {days} أيام. يرجى التواصل مع الإدارة للتجديد لتجنب إيقاف النظام.",
            alertToday: "⚠️ تنبيه هام: اشتراك العيادة ينتهي اليوم! يرجى التجديد فوراً لتجنب إيقاف النظام.",
            navSupport: "الدعم الفني والتواصل", modSupTitle: "🎧 الدعم الفني والمساعدة", modSupDesc: "هل تواجه مشكلة أو تحتاج إلى إضافة ميزة جديدة للعيادة؟ اكتب رسالتك وسنقوم بالرد عليك في أسرع وقت.", btnSupSend: "إرسال طلب الدعم",
            aiTitle: "المساعد الذكي Niva", aiWelcome: "مرحباً دكتور! 👋 أنا مساعدك الذكي Niva. كيف يمكنني مساعدتك اليوم؟"
        },
        en: {
            header: "Dashboard",
            navDash: "Overview", navPatients: "Patients & X-Rays", navCalendar: "Calendar", 
            navFinances: "Finances",
            navInventory: "Medical Inventory", 
            navSettings: "Clinic Settings", navSuper: "Super Admin", logout: "Logout",
            alertText: "⚠️ Important: Clinic subscription expires in {days} days. Please contact admin to renew and avoid suspension.",
            alertToday: "⚠️ Important: Clinic subscription expires TODAY! Please renew immediately to avoid suspension.",
            navSupport: "Tech Support", modSupTitle: "🎧 Technical Support", modSupDesc: "Facing an issue or need a new feature? Write your message and we'll reply ASAP.", btnSupSend: "Send Support Ticket",
            aiTitle: "Niva Assistant", aiWelcome: "Hello Doctor! 👋 I'm Niva, your smart assistant. How can I help you today?"
        }
    };
    const c = t[lang] || t.ar;
    const setTxt = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };

    setTxt('txt-header', c.header);
    setTxt('nav-dash', c.navDash); setTxt('nav-patients', c.navPatients); setTxt('nav-calendar', c.navCalendar); 
    setTxt('nav-finances', c.navFinances);
    setTxt('nav-inventory', c.navInventory); 
    setTxt('nav-settings', c.navSettings); setTxt('nav-super', c.navSuper); setTxt('btn-logout', c.logout);
    
    setTxt('nav-support', c.navSupport); setTxt('mod-support-title', c.modSupTitle);
    setTxt('mod-support-desc', c.modSupDesc); setTxt('btn-support-send', c.btnSupSend);
    
    setTxt('ai-title', c.aiTitle); setTxt('ai-welcome-msg', c.aiWelcome);

    const msgBox = document.getElementById('support_message');
    if(msgBox) msgBox.placeholder = lang === 'ar' ? "اكتب تفاصيل المشكلة أو طلبك هنا..." : "Type issue details or request here...";

    window.homeLang = c;
}

firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
        document.getElementById('userEmail').innerText = user.email;

        if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري تهيئة النظام..." : "Initializing...");

        try {
            const userDoc = await db.collection("Users").doc(user.email).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                const role = userData.role || 'reception';
                const clinicId = userData.clinicId || sessionStorage.getItem('clinicId') || 'default';

                sessionStorage.setItem('clinicId', clinicId);

                applyRoles(role);
                loadClinicBranding(clinicId);
                
                if(role !== 'superadmin' && clinicId !== 'default') {
                    checkSubscriptionAlert(clinicId);
                }

                const lastPage = sessionStorage.getItem('lastOpenedPage');
                const lastNavId = sessionStorage.getItem('lastActiveNavId');
                
                if (lastPage) {
                    const navLi = lastNavId ? document.getElementById(lastNavId) : null;
                    loadPage(lastPage, navLi);
                } else {
                    loadPage('dashboard.html', document.getElementById('nav-item-dash'));
                }
            }
        } catch (error) {
            console.error("خطأ في جلب بيانات المستخدم:", error);
        } finally {
            if (window.hideLoader) window.hideLoader();
        }
    } else {
        window.location.href = "index.html";
    }
});

async function checkSubscriptionAlert(clinicId) {
    try {
        db.collection("Clinics").doc(clinicId).onSnapshot((clinicDoc) => {
            if (clinicDoc.exists) {
                const cData = clinicDoc.data();
                const now = new Date();
                
                if (cData.status === 'suspended') {
                    showPaywallBlocker();
                    return;
                }

                if (cData.nextPaymentDate) {
                    const nextPayDate = cData.nextPaymentDate.toDate();
                    
                    if (now > nextPayDate) {
                        showPaywallBlocker();
                    } 
                    else {
                        hidePaywallBlocker();

                        const diffTime = nextPayDate - now;
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

                        if (diffDays >= 0 && diffDays <= 3) {
                            showBillingAlert(diffDays);
                        } else {
                            hideBillingAlert(); 
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error("خطأ في فحص الاشتراك:", error);
    }
}

function showPaywallBlocker() {
    let blocker = document.getElementById('paywall-blocker');
    if (!blocker) {
        blocker = document.createElement('div');
        blocker.id = 'paywall-blocker';
        blocker.style.cssText = "position: fixed; inset: 0; background: rgba(15, 23, 42, 0.95); z-index: 999999; display: flex; flex-direction: column; align-items: center; justify-content: center; backdrop-filter: blur(10px); color: white; text-align: center; direction: rtl; padding: 20px;";
        
        blocker.innerHTML = `
            <div style="background: white; color: #0f172a; padding: 40px; border-radius: 20px; max-width: 500px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
                <div style="font-size: 50px; margin-bottom: 15px;">⚠️</div>
                <h2 style="margin: 0 0 15px 0; font-size: 24px; color: #dc2626; font-weight: 900;">تم إيقاف النظام</h2>
                <p style="margin: 0 0 25px 0; color: #475569; line-height: 1.6; font-size: 16px;">
                    عفواً، لقد انتهت فترة اشتراك عيادتك في نظام NivaDent أو تم إيقاف الحساب. برجاء التواصل مع الدعم الفني لتجديد الباقة لاستعادة الوصول لبيانات العيادة.
                </p>
                <button onclick="firebase.auth().signOut().then(() => { sessionStorage.clear(); window.location.href = 'index.html'; })" style="background: #dc2626; color: white; border: none; padding: 15px; width: 100%; border-radius: 10px; font-size: 16px; font-weight: bold; cursor: pointer;">
                    تسجيل الخروج
                </button>
            </div>
        `;
        document.body.appendChild(blocker);
    }
}

function hidePaywallBlocker() {
    const blocker = document.getElementById('paywall-blocker');
    if (blocker) blocker.remove();
}

function showBillingAlert(daysLeft) {
    if(document.getElementById('billing-alert-banner')) return;

    const lang = localStorage.getItem('preferredLang') || 'ar';
    const t = window.homeLang || updatePageContent(lang); 
    
    let alertMsg = daysLeft === 0 ? window.homeLang.alertToday : window.homeLang.alertText.replace('{days}', daysLeft);

    const alertDiv = document.createElement('div');
    alertDiv.id = "billing-alert-banner";
    alertDiv.style.cssText = "background-color: #ef4444; color: white; text-align: center; padding: 10px; font-weight: bold; font-size: 14px; z-index: 9999; position: relative; width: 100%; box-shadow: 0 2px 4px rgba(0,0,0,0.2); animation: slideDown 0.3s ease-out;";
    alertDiv.innerHTML = `<span>${alertMsg}</span>`;

    document.body.insertBefore(alertDiv, document.body.firstChild);
}

function hideBillingAlert() {
    const alertDiv = document.getElementById('billing-alert-banner');
    if(alertDiv) alertDiv.remove();
}

async function loadClinicBranding(clinicId) {
    if (clinicId === 'default' || !clinicId) return; 

    try {
        const clinicDoc = await db.collection("Clinics").doc(clinicId).get();
        if (clinicDoc.exists) {
            const clinicData = clinicDoc.data();
            
            if (clinicData.clinicName) {
                const nameElement = document.getElementById('txt-clinic-name');
                if (nameElement) nameElement.innerText = clinicData.clinicName;
            }
            
            if (clinicData.logoUrl) {
                const logoContainer = document.getElementById('clinic-logo-container');
                if (logoContainer) {
                    logoContainer.innerHTML = `<img src="${clinicData.logoUrl}" alt="Clinic Logo" style="max-width: 45px; max-height: 45px; border-radius: 8px; object-fit: contain;">`;
                }
            }
        }
    } catch (error) {
        console.error("خطأ في جلب بيانات العيادة:", error);
    }
}

function applyRoles(role) {
    const r = role.toLowerCase();
    
    const settingsLi = document.getElementById('nav-settings-li');
    const superAdminLi = document.getElementById('nav-super-admin');
    const financesLi = document.getElementById('nav-finances-li');
    const inventoryLi = document.getElementById('nav-item-inventory'); 
    
    if (settingsLi) settingsLi.style.display = 'none';
    if (superAdminLi) superAdminLi.style.display = 'none';
    if (financesLi) financesLi.style.display = 'block';
    if (inventoryLi) inventoryLi.style.display = 'block'; 

    if (r === 'nurse') {
        if (financesLi) financesLi.style.display = 'none';
    }

    if (r === 'doctor' || r === 'admin') {
        if (settingsLi) settingsLi.style.display = 'block';
    }
    
    if (r === 'superadmin') {
        if (settingsLi) settingsLi.style.display = 'block';
        if (superAdminLi) superAdminLi.style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    let overlay = document.createElement('div');
    overlay.id = 'mobile-overlay';
    overlay.className = 'mobile-overlay';
    overlay.onclick = toggleSidebar; 
    document.body.appendChild(overlay);
});

function toggleSidebar() { 
    document.getElementById('sidebar').classList.toggle('active'); 
    document.getElementById('mobile-overlay').classList.toggle('active');
}

function toggleSidebarDesktop() {
    // التبديل بين وضع التثبيت والوضع الأوتوماتيكي
    document.body.classList.toggle('sidebar-pinned');
    const isPinned = document.body.classList.contains('sidebar-pinned');
    localStorage.setItem('sidebarPinned', isPinned);
}

window.onload = () => {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.body.dir = lang === 'en' ? 'ltr' : 'rtl';
    updatePageContent(lang);
};

// =========================================================================
// الدعم الفني
// =========================================================================
function openSupportModal() {
    document.getElementById('support_message').value = '';
    document.getElementById('supportModal').style.display = 'flex';
}

function closeSupportModal() {
    document.getElementById('supportModal').style.display = 'none';
}

// 🔴 تعديل: تحويل الدعم الفني لنظام تذاكر داخلي 🔴
async function sendSupportWhatsApp() {
    const msg = document.getElementById('support_message').value.trim();
    if (!msg) {
        alert(document.body.dir === 'rtl' ? "برجاء كتابة الرسالة أولاً!" : "Please write a message first!");
        return;
    }

    const clinicName = document.getElementById('txt-clinic-name') ? document.getElementById('txt-clinic-name').innerText : 'غير معروف';
    const userEmail = document.getElementById('userEmail') ? document.getElementById('userEmail').innerText : 'غير معروف';
    const clinicId = sessionStorage.getItem('clinicId') || 'غير معروف';

    const btn = document.getElementById('btn-support-send');
    const originalText = btn ? btn.innerText : 'إرسال';
    if(btn) btn.innerText = "⏳ جاري الإرسال...";

    try {
        await db.collection("SupportTickets").add({
            clinicId: clinicId,
            clinicName: clinicName,
            userEmail: userEmail,
            message: msg,
            status: "open",
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert(document.body.dir === 'rtl' ? "✅ تم إرسال رسالتك لفريق الدعم الفني بنجاح! سيتم التواصل معك قريباً." : "✅ Ticket sent successfully! We will contact you soon.");
        document.getElementById('support_message').value = '';
        closeSupportModal();
    } catch (error) {
        console.error("Error sending support ticket:", error);
        alert(document.body.dir === 'rtl' ? "❌ حدث خطأ أثناء الإرسال، يرجى المحاولة لاحقاً." : "❌ Error sending ticket, please try again.");
    } finally {
        if(btn) btn.innerText = originalText;
    }
}

window.addEventListener('click', function(event) {
    const modal = document.getElementById('supportModal');
    if (event.target === modal) {
        closeSupportModal();
    }
});


// =========================================================================
// المساعد الذكي Niva AI
// =========================================================================

function toggleAIPanel() {
    const panel = document.getElementById('niva-ai-panel');
    const triggerBtn = document.getElementById('niva-btn-trigger');
    
    if (panel.style.display === 'flex') {
        panel.style.display = 'none';
        triggerBtn.innerHTML = '🤖'; 
        triggerBtn.classList.remove('open');
    } else {
        panel.style.display = 'flex';
        triggerBtn.innerHTML = '❌'; 
        triggerBtn.classList.add('open');
    }
}

function appendToAIChat(text, isUser = false) {
    const chatBody = document.getElementById('niva-ai-chat');
    const msgDiv = document.createElement('div');
    msgDiv.className = isUser ? 'user-msg' : 'ai-msg';
    msgDiv.innerHTML = text;
    chatBody.appendChild(msgDiv);
    chatBody.scrollTop = chatBody.scrollHeight; 
}

async function askAI(promptType) {
    const isAr = (localStorage.getItem('preferredLang') || 'ar') === 'ar';
    const clinicId = sessionStorage.getItem('clinicId');

    let userMsg = "";
    if (promptType === 'income') userMsg = isAr ? "كم إجمالي إيرادات العيادة اليوم؟" : "What is today's total income?";
    else if (promptType === 'expenses') userMsg = isAr ? "كم إجمالي مصروفات العيادة اليوم؟" : "What is today's total expenses?";
    else if (promptType === 'debts') userMsg = isAr ? "من هم المرضى المتعثرين؟ وما هو إجمالي الديون؟" : "Who are the defaulting patients? Total debts?";
    else if (promptType === 'appointments') userMsg = isAr ? "ما هو موقف مواعيد اليوم؟" : "What is today's appointment status?";
    else if (promptType === 'tomorrow') userMsg = isAr ? "ما هي مواعيد عيادة الغد؟" : "What are tomorrow's appointments?";
    else if (promptType === 'inventory') userMsg = isAr ? "هل يوجد نواقص في المخزن الطبي؟" : "Are there any inventory shortages?";

    appendToAIChat(userMsg, true);
    
    if (!clinicId || clinicId === 'default') {
        setTimeout(() => {
            appendToAIChat(isAr ? "⚠️ <strong>تنبيه:</strong> أنا مساعد ذكي مخصص لقراءة بيانات العيادات فقط. أنت الآن مسجل دخول بحساب (الإدارة المركزية). قم بالدخول بحساب عيادة (طبيب/ممرضة) لتجربة استخراج الأرقام الحقيقية! 🚀" : "⚠️ <strong>Alert:</strong> AI reads clinic data only. Please login with a clinic account to test.", false);
        }, 500);
        return;
    }

    const loadingId = "ai-loading-" + Date.now();
    appendToAIChat(`<span id="${loadingId}" style="color:#64748b;">⏳ ${isAr ? 'جاري الفحص السريع...' : 'Checking data...'}</span>`);

    try {
        const todayStr = new Date().toISOString().split('T')[0];
        
        const tomorrowDate = new Date();
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

        let aiResponse = "";

        if (promptType === 'income') {
            const snap = await db.collection("Finances").where("clinicId", "==", clinicId).where("date", "==", todayStr).where("type", "==", "income").get();
            let total = 0;
            snap.forEach(doc => total += Number(doc.data().amount));
            aiResponse = isAr ? `✅ إجمالي المبالغ المحصلة اليوم هو: <strong>${total} ج.م</strong> من ${snap.size} عملية توريد.` : `✅ Today's total collected income is: <strong>${total} EGP</strong> from ${snap.size} transactions.`;
        } 
        
        else if (promptType === 'expenses') {
            const snap = await db.collection("Finances").where("clinicId", "==", clinicId).where("date", "==", todayStr).where("type", "==", "expense").get();
            let total = 0;
            snap.forEach(doc => total += Number(doc.data().amount));
            aiResponse = isAr ? `📉 إجمالي المصروفات المسجلة اليوم هو: <strong style="color:#dc2626;">${total} ج.م</strong> في ${snap.size} بند.` : `📉 Today's total expenses are: <strong style="color:#dc2626;">${total} EGP</strong> in ${snap.size} items.`;
        }
        
        else if (promptType === 'debts') {
            const snap = await db.collection("Patients").where("clinicId", "==", clinicId).where("totalDebt", ">", 0).get();
            let totalDebts = 0;
            let patientsList = [];
            snap.forEach(doc => {
                let d = doc.data();
                totalDebts += Number(d.totalDebt);
                patientsList.push(`${d.name} (${d.totalDebt} ج.م)`);
            });
            
            if (snap.size === 0) {
                aiResponse = isAr ? "✨ ممتاز! لا يوجد مرضى عليهم مديونيات للعيادة." : "✨ Great! No patients with outstanding debts.";
            } else {
                let topList = patientsList.slice(0, 3).join('<br> - '); 
                let moreHtml = patientsList.length > 3 ? `<br><small>...و ${patientsList.length - 3} مرضى آخرين (راجع صفحة المرضى).</small>` : "";
                aiResponse = isAr ? `💸 إجمالي الديون المستحقة للعيادة هو: <strong>${totalDebts} ج.م</strong> موزع على ${snap.size} مريض.<br><strong>أبرز المتعثرين:</strong><br> - ${topList} ${moreHtml}` : `💸 Total debts owed to clinic: <strong>${totalDebts} EGP</strong> across ${snap.size} patients.`;
            }
        }

        else if (promptType === 'appointments') {
            const snap = await db.collection("Appointments").where("clinicId", "==", clinicId).where("date", "==", todayStr).get();
            let total = snap.size, completed = 0, pending = 0, cancelled = 0;
            snap.forEach(doc => {
                const s = doc.data().status;
                if (s === 'completed') completed++;
                else if (s === 'cancelled') cancelled++;
                else pending++;
            });
            aiResponse = isAr ? `📅 إجمالي حجوزات اليوم: <strong>${total}</strong><br>✔️ اكتمل: ${completed}<br>⏳ في الانتظار: ${pending}<br>🚫 ملغي: ${cancelled}` : `📅 Total appointments today: <strong>${total}</strong><br>✔️ Completed: ${completed}<br>⏳ Pending: ${pending}<br>🚫 Cancelled: ${cancelled}`;
        }
        
        else if (promptType === 'tomorrow') {
            const snap = await db.collection("Appointments").where("clinicId", "==", clinicId).where("date", "==", tomorrowStr).get();
            let total = snap.size;
            if (total === 0) {
                aiResponse = isAr ? "لا توجد أي حجوزات مسجلة لغدٍ حتى الآن. 🏖️" : "No appointments scheduled for tomorrow yet. 🏖️";
            } else {
                aiResponse = isAr ? `🔮 يوجد <strong>${total} كشوفات</strong> مسجلة غداً. يرجى التنبيه على السكرتارية لتأكيد المواعيد.` : `🔮 There are <strong>${total} appointments</strong> scheduled for tomorrow.`;
            }
        }

        else if (promptType === 'inventory') {
            const snap = await db.collection("Inventory").where("clinicId", "==", clinicId).get();
            let shortages = [];
            snap.forEach(doc => {
                const item = doc.data();
                if (item.qty <= item.minAlert) shortages.push(item.name);
            });

            if (shortages.length === 0) {
                aiResponse = isAr ? "📦 المخزون في أمان! لا توجد نواقص حالياً." : "📦 Inventory is safe! No shortages currently.";
            } else {
                aiResponse = isAr ? `🚨 <strong>تحذير!</strong> يوجد ${shortages.length} أصناف أوشكت على الانتهاء:<br> - ${shortages.join('<br> - ')}` : `🚨 <strong>Warning!</strong> ${shortages.length} items are running low:<br> - ${shortages.join('<br> - ')}`;
            }
        }

        const loadingElement = document.getElementById(loadingId);
        if(loadingElement && loadingElement.parentElement) loadingElement.parentElement.remove();
        appendToAIChat(aiResponse, false);

    } catch (error) {
        console.error(error);
        const loadingElement = document.getElementById(loadingId);
        if(loadingElement && loadingElement.parentElement) loadingElement.parentElement.remove();
        appendToAIChat(isAr ? "❌ حدث خطأ أثناء سحب البيانات. يرجى المحاولة لاحقاً." : "❌ Error fetching data. Please try again.", false);
    }
}

// =========================================================================
// 🔴 رادار الحضور والأمان (Smart Presence & Sleep Mode) 🔴
// =========================================================================

const IDLE_TIMEOUT_MINUTES = 30; // الطرد النهائي وتسجيل الخروج بعد 30 دقيقة
const OFFLINE_MARK_MINUTES = 15; // اعتباره (غير متصل) بعد 15 دقيقة خمول
let currentPresenceStatus = "online"; // حالة الدكتور الحالية على الشاشة

function updateLastActiveTime() {
    localStorage.setItem('lastActiveNiva', Date.now());

    // 🔴 السحر هنا: لو كان أوفلاين (بسبب الخمول) ولمس الماوس، نرجعه أونلاين فوراً 🔴
    if (currentPresenceStatus === "offline" && firebase.auth().currentUser) {
        currentPresenceStatus = "online";
        db.collection("Users").doc(firebase.auth().currentUser.email).update({
            isOnline: true,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(()=>{});
    }
}

window.onload = updateLastActiveTime;
document.onmousemove = updateLastActiveTime;
document.onkeypress = updateLastActiveTime;
document.ontouchstart = updateLastActiveTime;

// العداد السحري (يشتغل كل دقيقة يراقب نشاط الدكتور)
setInterval(() => {
    const lastActive = localStorage.getItem('lastActiveNiva');
    if (lastActive && firebase.auth().currentUser) {
        const diffMinutes = (Date.now() - Number(lastActive)) / (1000 * 60);

        // 1. لو عدى 30 دقيقة خمول -> طرد نهائي للأمان (تسجيل خروج)
        if (diffMinutes >= IDLE_TIMEOUT_MINUTES) {
            forceSecurityLogout("تم تسجيل الخروج تلقائياً لعدم الاستخدام لفترة طويلة (حماية لبيانات العيادة).");
        } 
        // 2. لو عدى 15 دقيقة (ولسه مطردش) وكان أونلاين -> نقلبه أوفلاين عند الإدارة
        else if (diffMinutes >= OFFLINE_MARK_MINUTES && currentPresenceStatus === "online") {
            currentPresenceStatus = "offline";
            db.collection("Users").doc(firebase.auth().currentUser.email).update({
                isOnline: false,
                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            }).catch(()=>{});
        }
    }
}, 60000);

// 3. 🔴 قناص إغلاق المتصفح: لو قفل اللاب توب أو التاب من الـ (X) فجأة 🔴
window.addEventListener('beforeunload', () => {
    if(firebase.auth().currentUser && currentPresenceStatus === "online") {
        db.collection("Users").doc(firebase.auth().currentUser.email).update({
            isOnline: false,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(()=>{});
    }
});

function checkHistoryRestore() {
    const lastActive = localStorage.getItem('lastActiveNiva');
    if (lastActive) {
        const diffMinutes = (Date.now() - Number(lastActive)) / (1000 * 60);
        if (diffMinutes >= IDLE_TIMEOUT_MINUTES) {
            forceSecurityLogout("انتهت الجلسة للأمان. يرجى تسجيل الدخول مرة أخرى.");
        }
    }
}

function forceSecurityLogout(msg) {
    if(firebase.auth().currentUser) {
        // تأكيد تسجيله أوفلاين قبل الطرد
        db.collection("Users").doc(firebase.auth().currentUser.email).update({
            isOnline: false,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(()=>{});

        firebase.auth().signOut().then(() => {
            sessionStorage.clear();
            localStorage.removeItem('lastActiveNiva');
            alert("🔒 " + msg);
            window.top.location.href = 'index.html';
        });
    }
}

// تأكيد حالة الأونلاين أول ما يفتح الداشبورد بنجاح
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        currentPresenceStatus = "online";
        db.collection("Users").doc(user.email).update({
            isOnline: true,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(()=>{});
    }
});

checkHistoryRestore();
