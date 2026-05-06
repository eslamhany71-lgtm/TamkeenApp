// js/notifications.js - The Final Boss
const db = firebase.firestore();

// 🔴 متغيرات العزل والصلاحيات 🔴
const userRole = sessionStorage.getItem('userRole'); 
const userBranch = sessionStorage.getItem('branchId') || 'main'; 

let notifLang = {};
let unsubscribeListener = null;

// ============================================================================
// 🎵 مُصنع الأصوات المستقبلي (بدون ملفات خارجية) 🎵
// ============================================================================
function playSoundEffect(type) {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        if (type === 'new') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime); 
            osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1); 
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
        } else if (type === 'read') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.1);
        } else if (type === 'delete') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(150, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.2);
        }
    } catch (e) { console.log("الصوت غير مدعوم في هذا المتصفح"); }
}

// ============================================================================
// 🌍 الترجمة وجلب الفروع
// ============================================================================
function updateLanguage(lang) {
    const translations = {
        ar: {
            title: "الإشعارات والتنبيهات", sub: "متابعة أحداث العيادة والنواقص والمواعيد الجديدة",
            readAll: "✔️ تحديد الكل كمقروء", deleteAll: "🗑️ مسح الكل",
            emptyTitle: "لا توجد إشعارات", emptySub: "عيادتك في أمان وكل الأمور مستقرة!",
            justNow: "الآن", error: "حدث خطأ في جلب الإشعارات",
            optAll: "كل الفروع"
        },
        en: {
            title: "Notifications & Alerts", sub: "Track clinic events, low stock, and new appointments",
            readAll: "✔️ Mark All as Read", deleteAll: "🗑️ Clear All",
            emptyTitle: "No Notifications", emptySub: "Your clinic is secure and everything is up to date!",
            justNow: "Just now", error: "Error fetching notifications",
            optAll: "All Branches"
        }
    };
    notifLang = translations[lang] || translations.ar;
    const set = (id, txt) => { const el = document.getElementById(id); if(el) el.innerText = txt; };

    set('txt-title', notifLang.title); set('txt-subtitle', notifLang.sub);
    set('btn-read-all', notifLang.readAll); set('btn-delete-all', notifLang.deleteAll);
    if(document.getElementById('opt-all-branches')) set('opt-all-branches', notifLang.optAll);
}

async function loadBranchesForAdmin() {
    if (userRole !== 'admin' && userRole !== 'superadmin') return;
    const cid = sessionStorage.getItem('clinicId');
    const select = document.getElementById('branch-filter');
    if (!cid || !select) return;

    try {
        const snap = await db.collection("Branches").where("clinicId", "==", cid).get();
        let optionsHtml = `<option value="all" id="opt-all-branches">${notifLang.optAll || 'كل الفروع'}</option>`;
        optionsHtml += `<option value="main">الفرع الرئيسي</option>`;
        
        snap.forEach(doc => {
            optionsHtml += `<option value="${doc.id}">${doc.data().name}</option>`;
        });
        
        select.innerHTML = optionsHtml;
        select.style.display = 'block';
        select.value = userBranch;
    } catch (e) {
        console.error("Error loading branches:", e);
    }
}

// ============================================================================
// 📡 جلب الإشعارات (معزولة بالفروع)
// ============================================================================
function startNotificationsListener() {
    const cid = sessionStorage.getItem('clinicId');
    const container = document.getElementById('notificationsContainer');
    if (!cid) return;

    if(window.showLoader) window.showLoader("جاري المزامنة...");

    if (unsubscribeListener) unsubscribeListener();

    // 🔴 الكبسولة السحرية للفلترة والعزل 🔴
    let queryRef = db.collection("Notifications").where("clinicId", "==", cid);

    if (userRole !== 'admin' && userRole !== 'superadmin') {
        queryRef = queryRef.where("branchId", "==", userBranch);
    } else {
        const selectedBranch = document.getElementById('branch-filter').value;
        if (selectedBranch && selectedBranch !== 'all') {
            queryRef = queryRef.where("branchId", "==", selectedBranch);
        }
    }

    unsubscribeListener = queryRef.orderBy("createdAt", "desc")
        .onSnapshot((snapshot) => {
            if (window.hideLoader) window.hideLoader();
            container.innerHTML = ''; 

            if (snapshot.empty) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 50px; background: white; border-radius: 16px; border: 1px dashed #cbd5e1; margin-top: 20px;" class="empty-state">
                        <div style="font-size: 60px; margin-bottom: 15px;">📭</div>
                        <h2 style="color: #0f172a; margin-bottom: 5px;">${notifLang.emptyTitle}</h2>
                        <p style="color: #64748b;">${notifLang.emptySub}</p>
                    </div>`;
                return;
            }

            snapshot.forEach((doc) => {
                const data = doc.data();
                container.appendChild(createNotificationCard(doc.id, data));
            });

            snapshot.docChanges().forEach((change) => {
                if (change.type === "added" && !change.doc.data().isRead && !change.doc.metadata.hasPendingWrites) {
                    playSoundEffect('new');
                }
            });

        }, (error) => {
            console.error("Notif Error:", error);
            fallbackFetchNotifications(cid);
        });
}

// طريقة احتياطية
async function fallbackFetchNotifications(cid) {
    const container = document.getElementById('notificationsContainer');
    try {
        let queryRef = db.collection("Notifications").where("clinicId", "==", cid);

        if (userRole !== 'admin' && userRole !== 'superadmin') {
            queryRef = queryRef.where("branchId", "==", userBranch);
        } else {
            const selectedBranch = document.getElementById('branch-filter').value;
            if (selectedBranch && selectedBranch !== 'all') {
                queryRef = queryRef.where("branchId", "==", selectedBranch);
            }
        }

        const snap = await queryRef.get();
        let notifs = snap.docs.map(d => ({id: d.id, ...d.data()}));
        notifs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); 
        
        container.innerHTML = '';
        if(notifs.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:50px;">📭 ${notifLang.emptyTitle}</div>`;
            return;
        }
        notifs.forEach(n => container.appendChild(createNotificationCard(n.id, n)));
    } catch(e) {
        container.innerHTML = `<div style="color:red; text-align:center;">${notifLang.error}</div>`;
    }
}

// ============================================================================
// 🎨 رسم كارت الإشعار
// ============================================================================
function createNotificationCard(id, data) {
    const card = document.createElement('div');
    card.className = `notif-card ${data.isRead ? '' : 'unread'}`;
    card.id = `notif-${id}`;

    let iconHTML = '🔔';
    let iconClass = 'icon-sys';
    
    if (data.type === 'appointment') { iconHTML = '📅'; iconClass = 'icon-appt'; }
    else if (data.type === 'inventory') { iconHTML = '📦'; iconClass = 'icon-inv'; }
    else if (data.type === 'finance') { iconHTML = '💰'; iconClass = 'icon-fin'; }

    let timeString = notifLang.justNow;
    if (data.createdAt) {
        try {
            const dateObj = new Date(data.createdAt);
            timeString = dateObj.toLocaleDateString() + ' - ' + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        } catch(e){}
    }

    card.innerHTML = `
        <div class="notif-icon ${iconClass}">${iconHTML}</div>
        <div class="notif-content">
            <h3 class="notif-title">${data.title || 'تنبيه'}</h3>
            <p class="notif-msg">${data.message || '...'}</p>
            <div class="notif-time">🕒 ${timeString}</div>
        </div>
        <div class="notif-actions">
            ${!data.isRead ? `<button class="btn-icon" onclick="markAsRead('${id}')" title="تحديد كمقروء">👁️</button>` : ''}
            <button class="btn-icon delete" onclick="deleteNotification('${id}')" title="حذف الإشعار">🗑️</button>
        </div>
    `;
    return card;
}

// ============================================================================
// ⚡ العمليات (قراءة، حذف، تجربة) - معزولة بالفرع
// ============================================================================
async function markAsRead(id) {
    try {
        playSoundEffect('read');
        await db.collection("Notifications").doc(id).update({ isRead: true });
    } catch(e) { console.error(e); }
}

async function markAllAsRead() {
    const cid = sessionStorage.getItem('clinicId');
    if (!cid) return;
    playSoundEffect('read');
    
    let queryRef = db.collection("Notifications").where("clinicId", "==", cid).where("isRead", "==", false);
    
    if (userRole !== 'admin' && userRole !== 'superadmin') {
        queryRef = queryRef.where("branchId", "==", userBranch);
    } else {
        const selectedBranch = document.getElementById('branch-filter').value;
        if (selectedBranch && selectedBranch !== 'all') {
            queryRef = queryRef.where("branchId", "==", selectedBranch);
        }
    }
    
    try {
        const snap = await queryRef.get();
        const batch = db.batch();
        snap.forEach(doc => {
            batch.update(doc.ref, { isRead: true });
        });
        await batch.commit();
    } catch(e) { console.error(e); }
}

async function deleteNotification(id) {
    const card = document.getElementById(`notif-${id}`);
    if (card) {
        playSoundEffect('delete');
        card.classList.add('removing'); 
        setTimeout(async () => {
            try { await db.collection("Notifications").doc(id).delete(); } 
            catch(e) { console.error(e); }
        }, 400); 
    }
}

async function deleteAllNotifications() {
    if(!confirm("هل أنت متأكد من مسح الإشعارات المحددة؟")) return;
    const cid = sessionStorage.getItem('clinicId');
    if (!cid) return;
    playSoundEffect('delete');

    let queryRef = db.collection("Notifications").where("clinicId", "==", cid);
    
    if (userRole !== 'admin' && userRole !== 'superadmin') {
        queryRef = queryRef.where("branchId", "==", userBranch);
    } else {
        const selectedBranch = document.getElementById('branch-filter').value;
        if (selectedBranch && selectedBranch !== 'all') {
            queryRef = queryRef.where("branchId", "==", selectedBranch);
        }
    }

    try {
        const snap = await queryRef.get();
        const batch = db.batch();
        snap.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    } catch(e) { console.error(e); }
}

// 🧪 دالة سحرية لزرار التجربة 
async function spawnTestNotification() {
    const cid = sessionStorage.getItem('clinicId');
    if (!cid) { alert("سجل دخول الأول يا بطل!"); return; }

    const types = ['appointment', 'inventory', 'finance', 'system'];
    const randomType = types[Math.floor(Math.random() * types.length)];
    
    let title = "مريض جديد"; let msg = "تم حجز موعد جديد للمريض أحمد.";
    if(randomType === 'inventory') { title = "نقص في المخزون"; msg = "بنج أرتيكين وصل للحد الأدنى (5 علب)."; }
    else if(randomType === 'finance') { title = "دفعة مالية"; msg = "تم تحصيل 1000 جنيه من المريض."; }

    // 🔴 رمي الإشعار في الفرع المحدد عشان يظهر فوراً 🔴
    let targetBranch = userBranch;
    if (userRole === 'admin' || userRole === 'superadmin') {
        const filterVal = document.getElementById('branch-filter').value;
        targetBranch = filterVal === 'all' ? 'main' : filterVal;
    }

    try {
        await db.collection("Notifications").add({
            clinicId: cid,
            branchId: targetBranch, // 🔴
            title: title,
            message: msg,
            type: randomType,
            isRead: false,
            createdAt: new Date().toISOString()
        });
    } catch(e) { console.error(e); }
}

// ============================================================================
// 🚀 التشغيل الأساسي
// ============================================================================
window.onload = async () => {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.body.dir = lang === 'en' ? 'ltr' : 'rtl';
    document.body.setAttribute('data-theme', localStorage.getItem('niva_theme') || 'light');
    
    updateLanguage(lang);

    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            await loadBranchesForAdmin();
            startNotificationsListener();
        } else {
            document.getElementById('notificationsContainer').innerHTML = `<div style="text-align: center; color: red; font-weight: bold; padding: 20px;">الرجاء تسجيل الدخول أولاً</div>`;
        }
    });
};
