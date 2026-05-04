// js/notifications.js - The Final Boss
const db = firebase.firestore();
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
            // صوت إشعار جديد (رنة ناعمة)
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
            osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1); // A6
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
        } else if (type === 'read') {
            // صوت قراءة (Pop خفيف)
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.1);
        } else if (type === 'delete') {
            // صوت مسح (صوت منخفض)
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
// 🌍 الترجمة
// ============================================================================
function updateLanguage(lang) {
    const translations = {
        ar: {
            title: "الإشعارات والتنبيهات", sub: "متابعة أحداث العيادة والنواقص والمواعيد الجديدة",
            readAll: "✔️ تحديد الكل كمقروء", deleteAll: "🗑️ مسح الكل",
            emptyTitle: "لا توجد إشعارات", emptySub: "عيادتك في أمان وكل الأمور مستقرة!",
            justNow: "الآن", error: "حدث خطأ في جلب الإشعارات"
        },
        en: {
            title: "Notifications & Alerts", sub: "Track clinic events, low stock, and new appointments",
            readAll: "✔️ Mark All as Read", deleteAll: "🗑️ Clear All",
            emptyTitle: "No Notifications", emptySub: "Your clinic is secure and everything is up to date!",
            justNow: "Just now", error: "Error fetching notifications"
        }
    };
    notifLang = translations[lang] || translations.ar;
    const set = (id, txt) => { const el = document.getElementById(id); if(el) el.innerText = txt; };

    set('txt-title', notifLang.title); set('txt-subtitle', notifLang.sub);
    set('btn-read-all', notifLang.readAll); set('btn-delete-all', notifLang.deleteAll);
}

// ============================================================================
// 📡 جلب الإشعارات (ريال تايم)
// ============================================================================
function startNotificationsListener() {
    const cid = sessionStorage.getItem('clinicId');
    const container = document.getElementById('notificationsContainer');
    if (!cid) return;

    if(window.showLoader) window.showLoader("جاري المزامنة...");

    // إيقاف أي مستمع قديم عشان ميكررش
    if (unsubscribeListener) unsubscribeListener();

    // تشغيل الـ Real-time listener
    unsubscribeListener = db.collection("Notifications")
        .where("clinicId", "==", cid)
        .orderBy("createdAt", "desc")
        .onSnapshot((snapshot) => {
            if (window.hideLoader) window.hideLoader();
            container.innerHTML = ''; // مسح القديم للرسم من جديد

            if (snapshot.empty) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 50px; background: white; border-radius: 16px; border: 1px dashed #cbd5e1; margin-top: 20px;" class="empty-state">
                        <div style="font-size: 60px; margin-bottom: 15px;">📭</div>
                        <h2 style="color: #0f172a; margin-bottom: 5px;">${notifLang.emptyTitle}</h2>
                        <p style="color: #64748b;">${notifLang.emptySub}</p>
                    </div>`;
                return;
            }

            let unreadCount = 0;

            snapshot.forEach((doc) => {
                const data = doc.data();
                if (!data.isRead) unreadCount++;
                container.appendChild(createNotificationCard(doc.id, data));
            });

            // لو في إشعارات جديدة غير مقروءة، شغل صوت
            // التريكة: onSnapshot بيشتغل أول مرة بـ local cache، فبنتأكد إن التغيير جاي من السيرفر
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added" && !change.doc.data().isRead && !change.doc.metadata.hasPendingWrites) {
                    playSoundEffect('new');
                }
            });

        }, (error) => {
            console.error("Notif Error:", error);
            // لو فشل بسبب الـ Index كالعادة، هنجيبها بالطريقة السريعة بدون orderBy
            fallbackFetchNotifications(cid);
        });
}

// طريقة احتياطية لو الـ Index لسه متبناش
async function fallbackFetchNotifications(cid) {
    const container = document.getElementById('notificationsContainer');
    try {
        const snap = await db.collection("Notifications").where("clinicId", "==", cid).get();
        let notifs = snap.docs.map(d => ({id: d.id, ...d.data()}));
        notifs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); // ترتيب محلي
        
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

    // تحديد الأيقونة واللون بناءً على نوع الإشعار
    let iconHTML = '🔔';
    let iconClass = 'icon-sys';
    
    if (data.type === 'appointment') { iconHTML = '📅'; iconClass = 'icon-appt'; }
    else if (data.type === 'inventory') { iconHTML = '📦'; iconClass = 'icon-inv'; }
    else if (data.type === 'finance') { iconHTML = '💰'; iconClass = 'icon-fin'; }

    // تظبيط شكل الوقت
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
// ⚡ العمليات (قراءة، حذف، تجربة)
// ============================================================================
async function markAsRead(id) {
    try {
        playSoundEffect('read');
        await db.collection("Notifications").doc(id).update({ isRead: true });
        // الكارت هيتحدث أوتوماتيك بسبب الـ onSnapshot
    } catch(e) { console.error(e); }
}

async function markAllAsRead() {
    const cid = sessionStorage.getItem('clinicId');
    if (!cid) return;
    playSoundEffect('read');
    
    try {
        const snap = await db.collection("Notifications").where("clinicId", "==", cid).where("isRead", "==", false).get();
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
        card.classList.add('removing'); // تشغيل أنيميشن التبخر
        setTimeout(async () => {
            try { await db.collection("Notifications").doc(id).delete(); } 
            catch(e) { console.error(e); }
        }, 400); // استنى الأنيميشن يخلص قبل مسح الداتا
    }
}

async function deleteAllNotifications() {
    if(!confirm("هل أنت متأكد من مسح جميع الإشعارات؟")) return;
    const cid = sessionStorage.getItem('clinicId');
    if (!cid) return;
    playSoundEffect('delete');

    try {
        const snap = await db.collection("Notifications").where("clinicId", "==", cid).get();
        const batch = db.batch();
        snap.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    } catch(e) { console.error(e); }
}

// 🧪 دالة سحرية لزرار التجربة (عشان تدلع نفسك وتشوف الأنيميشن والصوت)
async function spawnTestNotification() {
    const cid = sessionStorage.getItem('clinicId');
    if (!cid) { alert("سجل دخول الأول يا بطل!"); return; }

    const types = ['appointment', 'inventory', 'finance', 'system'];
    const randomType = types[Math.floor(Math.random() * types.length)];
    
    let title = "مريض جديد"; let msg = "تم حجز موعد جديد للمريض أحمد.";
    if(randomType === 'inventory') { title = "نقص في المخزون"; msg = "بنج أرتيكين وصل للحد الأدنى (5 علب)."; }
    else if(randomType === 'finance') { title = "دفعة مالية"; msg = "تم تحصيل 1000 جنيه من المريض."; }

    try {
        await db.collection("Notifications").add({
            clinicId: cid,
            title: title,
            message: msg,
            type: randomType,
            isRead: false,
            createdAt: new Date().toISOString()
        });
        // الـ onSnapshot هيتولى الباقي ويشغل الصوت ويرسم الكارت!
    } catch(e) { console.error(e); }
}

// ============================================================================
// 🚀 التشغيل الأساسي
// ============================================================================
window.onload = () => {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.body.dir = lang === 'en' ? 'ltr' : 'rtl';
    document.body.setAttribute('data-theme', localStorage.getItem('niva_theme') || 'light');
    
    updateLanguage(lang);

    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            startNotificationsListener();
        } else {
            document.getElementById('notificationsContainer').innerHTML = `<div style="text-align: center; color: red; font-weight: bold; padding: 20px;">الرجاء تسجيل الدخول أولاً</div>`;
        }
    });
};
