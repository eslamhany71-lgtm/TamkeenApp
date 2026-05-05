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
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

document.addEventListener('DOMContentLoaded', () => {
    applyTheme(localStorage.getItem('niva_theme') || 'light');
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
    let finalUrl = pageUrl.includes('?') ? `${pageUrl}&v=${SMART_VERSION}` : `${pageUrl}?v=${SMART_VERSION}`;
    const frame = document.getElementById('content-frame');
    frame.src = finalUrl;
    
    frame.onload = function() {
        if (window.hideLoader) window.hideLoader();
        frame.contentWindow.postMessage({ type: 'THEME_CHANGE', theme: document.body.getAttribute('data-theme') }, '*');
    };
    
    sessionStorage.setItem('lastOpenedPage', pageUrl);

    if (clickedLi) {
        document.querySelectorAll('#nav-links li').forEach(li => li.classList.remove('active'));
        clickedLi.classList.add('active');
        if(clickedLi.id) sessionStorage.setItem('lastActiveNavId', clickedLi.id);
    } else {
        const lastNavId = sessionStorage.getItem('lastActiveNavId');
        if (lastNavId) {
            document.querySelectorAll('#nav-links li').forEach(li => li.classList.remove('active'));
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
    if(frame.contentWindow) frame.contentWindow.location.reload();
}

function updatePageContent(lang) {
    const t = {
        ar: {
            header: "لوحة التحكم",
            navDash: "الداشبورد", navPatients: "المرضى والأشعة", navCalendar: "المواعيد والتقويم", 
            navFinances: "الحسابات والمصروفات",
            navInvoices: "الفواتير", 
            navInventory: "المخزون الطبي", 
            navSettings: "إعدادات العيادة", navSuper: "إدارة النظام المركزية", logout: "تسجيل خروج",
            alertText: "⚠️ تنبيه هام: اشتراك العيادة سينتهي خلال {days} أيام. يرجى التواصل مع الإدارة للتجديد لتجنب إيقاف النظام.",
            alertToday: "⚠️ تنبيه هام: اشتراك العيادة ينتهي اليوم! يرجى التجديد فوراً لتجنب إيقاف النظام.",
            navSupport: "الدعم الفني والتواصل", modSupTitle: "🎧 الدعم الفني والمساعدة", modSupDesc: "هل تواجه مشكلة أو تحتاج إلى إضافة ميزة جديدة للعيادة؟ اكتب رسالتك وسنقوم بالرد عليك في أسرع وقت.", btnSupSend: "إرسال طلب الدعم",
            aiTitle: "المساعد الذكي Niva", aiWelcome: "مرحباً دكتور! 👋 أنا مساعدك الذكي Niva. كيف يمكنني مساعدتك اليوم?"
        },
        en: {
            header: "Dashboard",
            navDash: "Overview", navPatients: "Patients & X-Rays", navCalendar: "Calendar", 
            navFinances: "Finances",
            navInvoices: "Invoices", 
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
    setTxt('nav-invoices', c.navInvoices); 
    setTxt('nav-inventory', c.navInventory); 
    setTxt('nav-settings', c.navSettings); setTxt('nav-super', c.navSuper); setTxt('btn-logout', c.logout);
    
    setTxt('nav-support', c.navSupport); setTxt('mod-support-title', c.modSupTitle);
    setTxt('mod-support-desc', c.modSupDesc); setTxt('btn-support-send', c.btnSupSend);
    
    setTxt('ai-title', c.aiTitle); setTxt('ai-welcome-msg', c.aiWelcome);

    const msgBox = document.getElementById('support_message');
    if(msgBox) msgBox.placeholder = lang === 'ar' ? "اكتب تفاصيل المشكلة أو طلبك هنا..." : "Type issue details or request here...";

    window.homeLang = c;
}

// =========================================================================
// 🔴 تطبيق الصلاحيات الصارم (Deny by Default) 🔴
// =========================================================================
function getDefaultPermissions(role) {
    const allOn = { patients: true, calendar: true, finances: true, invoices: true, inventory: true, reports: true, settings: true, services: true, contracts: true, branches: true, hr: true, notifications: true };
    if (role === 'admin' || role === 'superadmin') return allOn;
    if (role === 'doctor') return { ...allOn, finances: false, invoices: false, reports: false, settings: false, hr: false, branches: false };
    if (role === 'receptionist') return { ...allOn, reports: false, settings: false, hr: false, branches: false, inventory: false };
    return { patients: false, calendar: false, finances: false, invoices: false, inventory: false, reports: false, settings: false, services: false, contracts: false, branches: false, hr: false, notifications: false };
}

function applyPermissions(perms, role) {
    const superAdminLi = document.getElementById('nav-super-admin') || document.getElementById('nav-super-admin-li');
    if (superAdminLi) superAdminLi.style.display = (role === 'superadmin') ? 'block' : 'none';
    
    if (role === 'superadmin') return;

    const restrictedItems = document.querySelectorAll('li[data-perm]');
    restrictedItems.forEach(item => {
        const permKey = item.getAttribute('data-perm');
        if (!perms || perms[permKey] !== true) {
            item.style.display = 'none';
        } else {
            item.style.display = 'block';
        }
    });

    if (!perms || perms.reports !== true) {
        document.querySelectorAll('.btn-finance').forEach(btn => btn.style.display = 'none');
    } else {
        document.querySelectorAll('.btn-finance').forEach(btn => btn.style.display = 'inline-block');
    }
}

// =========================================================================
// تهيئة النظام وتأمين الدخول (تحديث الدمج التلقائي للحسابات القديمة)
// =========================================================================
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

                let userPermissions = userData.permissions;
                let defaultPerms = getDefaultPermissions(role);
                
                // 🔴 السحر بتاع التوافقية (Backward Compatibility Merge) 🔴
                if (!userPermissions) {
                    // لو الحساب معندوش أي صلاحيات خالص
                    userPermissions = defaultPerms;
                    db.collection("Users").doc(user.email).update({ permissions: userPermissions }).catch(e=>{});
                } else {
                    // لو الحساب قديم وعنده صلاحيات بس ناقصة المفاتيح الجديدة (زي invoices و hr وغيرها)
                    let isMissingKeys = false;
                    for (let key in defaultPerms) {
                        if (userPermissions[key] === undefined) {
                            userPermissions[key] = defaultPerms[key]; // بياخد القيمة الافتراضية بتاعته (true للمدير)
                            isMissingKeys = true;
                        }
                    }
                    // تحديث قاعدة البيانات بالمفاتيح الناقصة عشان تفضل مسجلة
                    if (isMissingKeys) {
                        db.collection("Users").doc(user.email).update({ permissions: userPermissions }).catch(e=>{});
                    }
                }
                
                sessionStorage.setItem('userPermissions', JSON.stringify(userPermissions));

                applyPermissions(userPermissions, role);
                loadClinicBranding(clinicId);
                
                if(role !== 'superadmin' && clinicId !== 'default') {
                    checkSubscriptionAlert(clinicId);
                }

                const lastPage = sessionStorage.getItem('lastOpenedPage');
                const lastNavId = sessionStorage.getItem('lastActiveNavId');
                
                let pageToLoad = lastPage || 'dashboard.html';
                let navToClick = lastNavId ? document.getElementById(lastNavId) : document.getElementById('nav-item-dash');

                if (navToClick && navToClick.style.display === 'none') {
                    pageToLoad = 'dashboard.html';
                    navToClick = document.getElementById('nav-item-dash');
                }

                loadPage(pageToLoad, navToClick);
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

const IDLE_TIMEOUT_MINUTES = 30; 
const OFFLINE_MARK_MINUTES = 15; 
let currentPresenceStatus = "online"; 

function updateUserPresence(isOnlineStatus) {
    const user = firebase.auth().currentUser;
    if (user) {
        const docId = user.email || user.uid; 
        db.collection("Users").doc(docId).set({ 
            isOnline: isOnlineStatus, 
            lastSeen: firebase.firestore.FieldValue.serverTimestamp() 
        }, { merge: true }).catch(()=>{});
    }
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { 
        currentPresenceStatus = "online"; 
        updateUserPresence(true); 
    } else if (document.visibilityState === 'hidden') { 
        currentPresenceStatus = "offline"; 
        updateUserPresence(false); 
    }
});

function updateLastActiveTime() {
    localStorage.setItem('lastActiveNiva', Date.now());
    if (currentPresenceStatus === "offline" && firebase.auth().currentUser) { 
        currentPresenceStatus = "online"; 
        updateUserPresence(true); 
    }
}

document.onmousemove = updateLastActiveTime; 
document.onkeypress = updateLastActiveTime; 
document.ontouchstart = updateLastActiveTime;

setInterval(() => {
    const lastActive = localStorage.getItem('lastActiveNiva');
    if (lastActive && firebase.auth().currentUser) {
        const diffMinutes = (Date.now() - Number(lastActive)) / (1000 * 60);
        if (diffMinutes >= IDLE_TIMEOUT_MINUTES) {
            if(firebase.auth().currentUser) {
                updateUserPresence(false);
                firebase.auth().signOut().then(() => {
                    sessionStorage.clear(); 
                    localStorage.removeItem('lastActiveNiva');
                    alert("🔒 تم تسجيل الخروج تلقائياً لعدم الاستخدام لفترة طويلة (حماية لبيانات العيادة)."); 
                    window.top.location.href = 'index.html';
                });
            }
        } else if (diffMinutes >= OFFLINE_MARK_MINUTES && currentPresenceStatus === "online") {
            currentPresenceStatus = "offline"; 
            updateUserPresence(false);
        }
    }
}, 60000);

async function checkSubscriptionAlert(clinicId) {
    try {
        db.collection("Clinics").doc(clinicId).onSnapshot(async (clinicDoc) => {
            if (clinicDoc.exists) {
                const cData = clinicDoc.data();
                const now = new Date();
                
                if (cData.status === 'suspended') { 
                    showPaywallBlocker("تم إيقاف الحساب", "عفواً، تم إيقاف حساب عيادتك إدارياً. يرجى التواصل مع الدعم الفني للاستفسار."); 
                    return; 
                }
                
                let expireDate = null;
                if (cData.nextPaymentDate) {
                    expireDate = typeof cData.nextPaymentDate.toDate === 'function' ? cData.nextPaymentDate.toDate() : new Date(cData.nextPaymentDate);
                } else if (cData.trialEndDate) {
                    expireDate = typeof cData.trialEndDate.toDate === 'function' ? cData.trialEndDate.toDate() : new Date(cData.trialEndDate);
                }
                
                if (expireDate) {
                    if (now > expireDate) {
                        if (cData.status !== 'expired') { 
                            await db.collection("Clinics").doc(clinicId).update({ 
                                status: 'expired', 
                                updatedAt: firebase.firestore.FieldValue.serverTimestamp() 
                            }); 
                        }
                        showPaywallBlocker("انتهى الاشتراك", "عفواً، لقد انتهت فترة تجربتك المجانية أو اشتراكك.");
                    } else {
                        hidePaywallBlocker();
                        const diffDays = Math.ceil((expireDate - now) / (1000 * 60 * 60 * 24)); 
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

function showPaywallBlocker(title, message) {
    let blocker = document.getElementById('paywall-blocker');
    if (!blocker) {
        blocker = document.createElement('div'); 
        blocker.id = 'paywall-blocker';
        blocker.style.cssText = "position: fixed; inset: 0; background: rgba(15, 23, 42, 0.95); z-index: 999999; display: flex; flex-direction: column; align-items: center; justify-content: center; backdrop-filter: blur(10px); color: white; text-align: center; direction: rtl; padding: 20px;";
        document.body.appendChild(blocker);
    }
    blocker.innerHTML = `<div style="background: white; color: #0f172a; padding: 40px; border-radius: 20px; max-width: 500px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);"><div style="font-size: 50px; margin-bottom: 15px;">⚠️</div><h2 style="margin: 0 0 15px 0; font-size: 24px; color: #dc2626; font-weight: 900;">${title}</h2><p style="margin: 0 0 25px 0; color: #475569; line-height: 1.6; font-size: 16px;">${message}</p><button onclick="firebase.auth().signOut().then(() => { sessionStorage.clear(); window.location.href = 'index.html'; })" style="background: #dc2626; color: white; border: none; padding: 15px; width: 100%; border-radius: 10px; font-size: 16px; font-weight: bold; cursor: pointer;">تسجيل الخروج</button></div>`;
}

function hidePaywallBlocker() { 
    const blocker = document.getElementById('paywall-blocker'); 
    if (blocker) blocker.remove(); 
}

function showBillingAlert(daysLeft) {
    if(document.getElementById('billing-alert-banner')) return;
    let alertMsg = daysLeft === 0 ? "⚠️ تنبيه هام: اشتراك العيادة ينتهي اليوم! يرجى التجديد فوراً." : `⚠️ تنبيه هام: اشتراك العيادة سينتهي خلال ${daysLeft} أيام. يرجى التواصل مع الإدارة للتجديد.`;
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
                if (logoContainer) logoContainer.innerHTML = `<img src="${clinicData.logoUrl}" alt="Clinic Logo" style="max-width: 45px; max-height: 45px; border-radius: 8px; object-fit: contain;">`; 
            }
        }
    } catch (error) { 
        console.error("خطأ في جلب بيانات العيادة:", error); 
    }
}

function toggleSidebar() { 
    document.getElementById('sidebar').classList.toggle('active'); 
    document.getElementById('mobile-overlay').classList.toggle('active'); 
}

function toggleSidebarDesktop() { 
    document.body.classList.toggle('sidebar-pinned'); 
    localStorage.setItem('sidebarPinned', document.body.classList.contains('sidebar-pinned')); 
}

function openSupportModal() { 
    document.getElementById('support_message').value = ''; 
    document.getElementById('supportModal').style.display = 'flex'; 
}

function closeSupportModal() { 
    document.getElementById('supportModal').style.display = 'none'; 
}

async function sendSupportWhatsApp() {
    const msg = document.getElementById('support_message').value.trim();
    if (!msg) { alert("برجاء كتابة الرسالة أولاً!"); return; }
    
    const btn = document.getElementById('btn-support-send'); 
    const originalText = btn ? btn.innerText : 'إرسال'; 
    if(btn) btn.innerText = "⏳ جاري الإرسال...";
    
    try {
        await db.collection("SupportTickets").add({ 
            clinicId: sessionStorage.getItem('clinicId') || 'غير معروف', 
            clinicName: document.getElementById('txt-clinic-name') ? document.getElementById('txt-clinic-name').innerText : 'غير معروف', 
            userEmail: document.getElementById('userEmail') ? document.getElementById('userEmail').innerText : 'غير معروف', 
            message: msg, 
            status: "open", 
            timestamp: firebase.firestore.FieldValue.serverTimestamp() 
        });
        alert("✅ تم إرسال رسالتك لفريق الدعم الفني بنجاح!"); 
        document.getElementById('support_message').value = ''; 
        closeSupportModal();
    } catch (error) { 
        console.error("Error sending ticket:", error); 
        alert("❌ حدث خطأ أثناء الإرسال."); 
    } finally { 
        if(btn) btn.innerText = originalText; 
    }
}

window.addEventListener('click', function(event) { 
    const modal = document.getElementById('supportModal'); 
    if (event.target === modal) closeSupportModal(); 
});

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
            appendToAIChat(isAr ? "⚠️ <strong>تنبيه:</strong> أنا مساعد ذكي مخصص لقراءة بيانات العيادات فقط. أنت الآن مسجل دخول بحساب (الإدارة المركزية)." : "⚠️ <strong>Alert:</strong> AI reads clinic data only. Please login with a clinic account to test.", false);
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
            let total = 0; snap.forEach(doc => total += Number(doc.data().amount));
            aiResponse = isAr ? `✅ إجمالي المبالغ المحصلة اليوم هو: <strong>${total} ج.م</strong> من ${snap.size} عملية توريد.` : `✅ Today's total collected income is: <strong>${total} EGP</strong> from ${snap.size} transactions.`;
        } 
        else if (promptType === 'expenses') {
            const snap = await db.collection("Finances").where("clinicId", "==", clinicId).where("date", "==", todayStr).where("type", "==", "expense").get();
            let total = 0; snap.forEach(doc => total += Number(doc.data().amount));
            aiResponse = isAr ? `📉 إجمالي المصروفات المسجلة اليوم هو: <strong style="color:#dc2626;">${total} ج.م</strong> في ${snap.size} بند.` : `📉 Today's total expenses are: <strong style="color:#dc2626;">${total} EGP</strong> in ${snap.size} items.`;
        }
        else if (promptType === 'debts') {
            const snap = await db.collection("Patients").where("clinicId", "==", clinicId).where("totalDebt", ">", 0).get();
            let totalDebts = 0; let patientsList = [];
            snap.forEach(doc => { let d = doc.data(); totalDebts += Number(d.totalDebt); patientsList.push(`${d.name} (${d.totalDebt} ج.م)`); });
            if (snap.size === 0) { aiResponse = isAr ? "✨ ممتاز! لا يوجد مرضى عليهم مديونيات للعيادة." : "✨ Great! No patients with outstanding debts."; } 
            else {
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
                if (s === 'completed') completed++; else if (s === 'cancelled') cancelled++; else pending++;
            });
            aiResponse = isAr ? `📅 إجمالي حجوزات اليوم: <strong>${total}</strong><br>✔️ اكتمل: ${completed}<br>⏳ في الانتظار: ${pending}<br>🚫 ملغي: ${cancelled}` : `📅 Total appointments today: <strong>${total}</strong><br>✔️ Completed: ${completed}<br>⏳ Pending: ${pending}<br>🚫 Cancelled: ${cancelled}`;
        }
        else if (promptType === 'tomorrow') {
            const snap = await db.collection("Appointments").where("clinicId", "==", clinicId).where("date", "==", tomorrowStr).get();
            let total = snap.size;
            if (total === 0) { aiResponse = isAr ? "لا توجد أي حجوزات مسجلة لغدٍ حتى الآن. 🏖️" : "No appointments scheduled for tomorrow yet. 🏖️"; } 
            else { aiResponse = isAr ? `🔮 يوجد <strong>${total} كشوفات</strong> مسجلة غداً.` : `🔮 There are <strong>${total} appointments</strong> scheduled for tomorrow.`; }
        }
        else if (promptType === 'inventory') {
            const snap = await db.collection("Inventory").where("clinicId", "==", clinicId).get();
            let shortages = [];
            snap.forEach(doc => { const item = doc.data(); if (item.qty <= item.minAlert) shortages.push(item.name); });
            if (shortages.length === 0) { aiResponse = isAr ? "📦 المخزون في أمان! لا توجد نواقص حالياً." : "📦 Inventory is safe! No shortages currently."; } 
            else { aiResponse = isAr ? `🚨 <strong>تحذير!</strong> يوجد ${shortages.length} أصناف أوشكت على الانتهاء:<br> - ${shortages.join('<br> - ')}` : `🚨 <strong>Warning!</strong> ${shortages.length} items are running low:<br> - ${shortages.join('<br> - ')}`; }
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

function openPortalSettings() {
    const currentClinicId = sessionStorage.getItem('clinicId');
    if (!currentClinicId || currentClinicId === 'default') {
        alert("لا يمكن إنشاء رابط لعيادة افتراضية. يرجى تسجيل الدخول بحساب عيادة.");
        return;
    }
    const portalUrl = `https://nivadent.web.app/portal.html?clinicId=${currentClinicId}`;
    document.getElementById('clinic_portal_link').value = portalUrl;
    
    const qrContainer = document.getElementById('clinic_qr_container');
    qrContainer.innerHTML = ''; 
    new QRCode(qrContainer, { text: portalUrl, width: 180, height: 180, colorDark : "#0f172a", colorLight : "#ffffff", correctLevel : QRCode.CorrectLevel.H });
    document.getElementById('clinicPortalModal').style.display = 'flex';
}

function copyPortalLink() {
    const linkInput = document.getElementById('clinic_portal_link');
    linkInput.select();
    document.execCommand("copy");
    alert("✅ تم نسخ الرابط بنجاح!");
}

function printClinicQR() {
    const qrCanvas = document.querySelector('#clinic_qr_container canvas');
    if (!qrCanvas) return;
    const imgData = qrCanvas.toDataURL("image/png");
    const clinicName = document.getElementById('txt-clinic-name').innerText;
    
    const printArea = document.getElementById('portalPrintArea');
    printArea.innerHTML = `
        <div style="text-align: center; font-family: 'Tajawal', sans-serif; padding: 40px; border: 4px solid #0284c7; border-radius: 20px; max-width: 500px; margin: 0 auto; background: white;">
            <h1 style="color: #0284c7; font-size: 36px; margin-bottom: 10px;">${clinicName}</h1>
            <h2 style="color: #0f172a; margin-top: 0;">بوابة المريض الذكية</h2>
            <img src="${imgData}" style="width: 250px; height: 250px; margin: 20px 0;">
            <p style="font-size: 20px; font-weight: bold; color: #d97706;">قم بمسح الكود بكاميرا هاتفك</p>
            <ul style="text-align: right; font-size: 18px; color: #475569; display: inline-block; padding-right: 20px;">
                <li style="margin-bottom: 10px;">✅ تابع دورك في الانتظار</li>
                <li style="margin-bottom: 10px;">✅ احجز موعد جديد بسهولة</li>
                <li style="margin-bottom: 10px;">✅ راجع حساباتك الطبية</li>
            </ul>
        </div>
    `;
    
    document.getElementById('clinicPortalModal').style.display = 'none';
    printArea.style.display = 'block'; 
    
    const style = document.createElement('style');
    style.id = 'temp-print-style';
    style.innerHTML = `@media print { body * { visibility: hidden; } #portalPrintArea, #portalPrintArea * { visibility: visible; } #portalPrintArea { position: absolute; left: 0; top: 0; width: 100%; } }`;
    document.head.appendChild(style);

    setTimeout(() => {
        window.print();
        printArea.innerHTML = '';
        printArea.style.display = 'none';
        document.head.removeChild(style); 
    }, 500);
}

window.openPortalSettings = openPortalSettings;
window.copyPortalLink = copyPortalLink;
window.printClinicQR = printClinicQR;
