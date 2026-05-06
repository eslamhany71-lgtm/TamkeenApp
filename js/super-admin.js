// js/superadmin.js
const db = firebase.firestore();
let allClinicsList = []; 
let clinicUsersUnsubscribe = null; 

let currentActiveTab = 'active'; 

function updatePageContent(lang) {
    const t = {
        ar: {
            title: "إدارة النظام المركزية (SaaS)", sub: "لوحة تحكم المالك - صلاحيات عليا", search: "بحث باسم العيادة...", btnAdd: "إضافة عيادة جديدة", btnAddUser: "توليد كود دعوة موظف",
            totClinics: "العيادات النشطة", totSusp: "العيادات الموقوفة", totPatients: "المرضى (في كل النظام)",
            thDate: "تاريخ الاشتراك", thNextPay: "ميعاد الانتهاء", thName: "اسم العيادة / الباقة", thEmail: "إيميل الأدمن", thStatus: "الحالة", thAction: "إجراءات",
            loading: "جاري تحميل البيانات...", empty: "لا توجد عيادات مسجلة حالياً.",
            mTitle: "تسجيل عيادة جديدة بالنظام", lName: "اسم العيادة / المركز الطبي", lEmail: "البريد الإلكتروني للأدمن", 
            lHint: "* يجب إنشاء هذا الحساب لاحقاً من شاشة تسجيل الدخول.", lPhone: "رقم الموبايل",
            lPkg: "باقة الاشتراك", optPkgT7: "تجريبي (7 أيام)", optPkgT14: "تجريبي (14 يوم)", optPkgMonth: "شهري (Monthly)", optPkgYear: "سنوي (Yearly)",
            lPlan: "حالة الحساب", optAct: "نشط (Active)", optSusp: "موقوف (Suspended)", btnSave: "إنشاء العيادة وتوليد المعرف",
            lLimit: "الحد الأقصى للمستخدمين (الموظفين)", hintLimit: "شاملاً حساب الدكتور المالك", lPrice: "قيمة الاشتراك (ج.م)",
            sAct: "نشط", sSusp: "موقوف", sExpired: "منتهي (خلص وقته)", 
            btnPaid: "تم الدفع", btnCancelSub: "إيقاف الحساب", btnRenew: "تفعيل الحساب", btnDelete: "حذف العيادة",
            msgSuccess: "تم إنشاء العيادة بنجاح!\n\nكود الدخول: {id}\nإيميل الأدمن: {email}\n\nيرجى إرسال الكود للدكتور لتفعيل الحساب.",
            msgError: "حدث خطأ أثناء الإنشاء!", msgConfirmToggle: "هل متأكد من تغيير حالة العيادة؟",
            msgConfirmPaid: "هل تريد تأكيد استلام الدفعة وتجديد الاشتراك لمدة شهر؟",
            msgWarnDel: "تحذير: هذا سيحذف العيادة تماماً ولن يمكن استرجاعها! اكتب '1234' للتأكيد:", msgDelSuccess: "تم حذف العيادة بنجاح.", btnSaving: "جاري الإنشاء...",
            
            mUpgTitle: "🚀 ترقية العيادة التجريبية", mUpgSub: "حدد الباقة وقيمة الاشتراك لتوليد كود الدخول الجديد للعيادة.",
            lUpgPkg: "باقة الاشتراك", optUpgMonth: "شهري (Monthly)", optUpgYear: "سنوي (Yearly)",
            lUpgPrice: "الاشتراك (ج.م)", lUpgLimit: "الحد الأقصى للمستخدمين", btnConfirmUpg: "تأكيد الترقية وتوليد الكود",
            
            mUserTitle: "توليد كود دعوة مستخدم", mUserSub: "اختر العيادة والوظيفة لتوليد كود (يعمل كـ Override في حالة الطوارئ).",
            lUClinic: "العيادة التابعة لها", lUName: "اسم المستخدم", lURole: "الصلاحية الممنوحة (Role)",
            optUAdmin: "مدير نظام (Doctor/Admin)", optUDoc: "طبيب (صلاحية محدودة)", optURec: "موظف استقبال", optUNur: "مساعد / ممرضة", btnSubUser: "توليد كود الدعوة",
            
            modDetTitle: "تفاصيل العيادة والمستخدمين", lblDetName: "اسم العيادة", lblDetCode: "كود العيادة", lblDetEmail: "إيميل الأدمن", lblDetPhone: "الموبايل",
            lblDetPkg: "نوع الباقة", lblDetCreated: "تاريخ الإنشاء", lblDetLimit: "الحد الأقصى للمستخدمين:", lblDetPrice: "قيمة الاشتراك المتفق عليها:",
            txtTeamTitle: "👥 فريق العمل والمستخدمين", thUName: "اسم المستخدم", thUEmail: "البريد / الكود", thURole: "الصلاحية",
            thUDate: "تاريخ الانضمام", thUOnline: "متصل الآن؟", thULast: "آخر ظهور", txtULoad: "جاري تحميل المستخدمين...",
            
            // تابات السوبر أدمن الجديدة
            tabActive: "🏢 العيادات النشطة والموقوفة", tabTrials: "🚀 التجارب المجانية", tabSupport: "🎧 تذاكر الدعم الفني", tabReviews: "⭐ تقييمات النظام",
            noSupport: "لا توجد تذاكر دعم فني.", noReviews: "لا توجد تقييمات حتى الآن.", btnReply: "رد وإغلاق",
            msgReplySent: "تم إرسال الرد وإغلاق التذكرة بنجاح."
        },
        en: {
            title: "Central SaaS Management", sub: "Owner Dashboard - Super Admin", search: "Search by clinic name...", btnAdd: "Add New Clinic", btnAddUser: "Generate User Invite",
            totClinics: "Active Clinics", totSusp: "Suspended Clinics", totPatients: "Total Patients",
            thDate: "Sub Date", thNextPay: "Next Payment", thName: "Clinic / Package", thEmail: "Admin Email", thStatus: "Status", thAction: "Actions",
            loading: "Loading data...", empty: "No clinics registered yet.",
            mTitle: "Register New Clinic", lName: "Clinic / Center Name", lEmail: "Admin Email", 
            lHint: "* This account must be created later from login screen.", lPhone: "Mobile Number",
            lPkg: "Subscription Package", optPkgT7: "Trial (7 Days)", optPkgT14: "Trial (14 Days)", optPkgMonth: "Monthly", optPkgYear: "Yearly",
            lPlan: "Account Status", optAct: "Active", optSusp: "Suspended", btnSave: "Create Clinic & Generate ID",
            lLimit: "Max Allowed Users (Staff)", hintLimit: "Including Admin doctor", lPrice: "Subscription Price",
            sAct: "Active", sSusp: "Suspended", sExpired: "Expired", 
            btnPaid: "Paid", btnCancelSub: "Suspend Acc", btnRenew: "Activate Acc", btnDelete: "Delete Clinic",
            msgSuccess: "Clinic created successfully!\n\nAccess Code: {id}\nAdmin Email: {email}\n\nPlease send code to the doctor.",
            msgError: "Error creating clinic!", msgConfirmToggle: "Are you sure you want to change the status?",
            msgConfirmPaid: "Confirm payment receipt and renew subscription for one month?",
            msgWarnDel: "WARNING: Type '1234' to confirm permanent deletion:", msgDelSuccess: "Clinic deleted successfully.", btnSaving: "Creating...",
            
            mUpgTitle: "🚀 Upgrade Trial Clinic", mUpgSub: "Select package and price to generate a new access code.",
            lUpgPkg: "Subscription Package", optUpgMonth: "Monthly", optUpgYear: "Yearly",
            lUpgPrice: "Price (EGP)", lUpgLimit: "Max Users Limit", btnConfirmUpg: "Confirm Upgrade & Generate",
            
            mUserTitle: "Generate User Invite", mUserSub: "Select clinic and role to override and generate code.",
            lUClinic: "Select Clinic", lUName: "User Name", lURole: "Assigned Role",
            optUAdmin: "System Admin", optUDoc: "Doctor", optURec: "Receptionist", optUNur: "Nurse / Assistant", btnSubUser: "Generate Invite Code",
            
            modDetTitle: "Clinic & Staff Details", lblDetName: "Clinic Name", lblDetCode: "Access Code", lblDetEmail: "Admin Email", lblDetPhone: "Phone",
            lblDetPkg: "Package", lblDetCreated: "Created At", lblDetLimit: "Max Users Limit:", lblDetPrice: "Agreed Subscription Price:",
            txtTeamTitle: "👥 Staff & Users", thUName: "User Name", thUEmail: "Email / Code", thURole: "Role",
            thUDate: "Join Date", thUOnline: "Online?", thULast: "Last Seen", txtULoad: "Loading users...",

            tabActive: "🏢 Active & Suspended Clinics", tabTrials: "🚀 Free Trials", tabSupport: "🎧 Support Tickets", tabReviews: "⭐ System Reviews",
            noSupport: "No support tickets found.", noReviews: "No reviews yet.", btnReply: "Reply & Close",
            msgReplySent: "Reply sent and ticket closed successfully."
        }
    };
    const c = t[lang] || t.ar;
    const setTxt = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };

    setTxt('txt-title', c.title); setTxt('txt-subtitle', c.sub); document.getElementById('searchInput').placeholder = c.search;
    setTxt('btn-add-clinic', c.btnAdd); setTxt('btn-add-user', c.btnAddUser);
    setTxt('lbl-tot-clinics', c.totClinics); setTxt('lbl-tot-susp', c.totSusp); setTxt('lbl-tot-patients', c.totPatients);
    setTxt('th-date', c.thDate); setTxt('th-next-pay', c.thNextPay); setTxt('th-name', c.thName); setTxt('th-email', c.thEmail); setTxt('th-status', c.thStatus); setTxt('th-action', c.thAction);
    if(document.getElementById('txt-loading')) setTxt('txt-loading', c.loading);
    
    setTxt('mod-title', c.mTitle); setTxt('lbl-c-name', c.lName); setTxt('lbl-c-email', c.lEmail); setTxt('lbl-c-hint', c.lHint); setTxt('lbl-c-phone', c.lPhone); 
    setTxt('lbl-c-pkg', c.lPkg); setTxt('opt-pkg-t7', c.optPkgT7); setTxt('opt-pkg-t14', c.optPkgT14); setTxt('opt-pkg-month', c.optPkgMonth); setTxt('opt-pkg-year', c.optPkgYear);
    setTxt('lbl-c-plan', c.lPlan); setTxt('opt-active', c.optAct); setTxt('opt-susp', c.optSusp); setTxt('btn-save', c.btnSave);
    setTxt('lbl-c-limit', c.lLimit); setTxt('hint-c-limit', c.hintLimit); setTxt('lbl-c-price', c.lPrice);
    
    setTxt('mod-upgrade-title', c.mUpgTitle); setTxt('mod-upgrade-sub', c.mUpgSub);
    setTxt('lbl-upg-pkg', c.lUpgPkg); setTxt('opt-upg-month', c.optUpgMonth); setTxt('opt-upg-year', c.optUpgYear);
    setTxt('lbl-upg-price', c.lUpgPrice); setTxt('lbl-upg-limit', c.lUpgLimit); setTxt('btn-confirm-upgrade', c.btnConfirmUpg);
    
    setTxt('mod-user-title', c.mUserTitle); setTxt('mod-user-sub', c.mUserSub);
    setTxt('lbl-u-clinic', c.lUClinic); setTxt('lbl-u-name', c.lUName); setTxt('lbl-u-role', c.lURole);
    setTxt('opt-u-admin', c.optUAdmin); setTxt('opt-u-doc', c.optUDoc); setTxt('opt-u-rec', c.optURec); setTxt('opt-u-nur', c.optUNur); setTxt('btn-submit-user', c.btnSubUser);

    setTxt('mod-det-title', c.modDetTitle); setTxt('lbl-det-name', c.lblDetName); setTxt('lbl-det-code', c.lblDetCode); setTxt('lbl-det-email', c.lblDetEmail); setTxt('lbl-det-phone', c.lblDetPhone);
    setTxt('lbl-det-pkg', c.lblDetPkg); setTxt('lbl-det-created', c.lblDetCreated); setTxt('lbl-det-limit', c.lblDetLimit); setTxt('lbl-det-price', c.lblDetPrice);
    setTxt('txt-team-title', c.txtTeamTitle); setTxt('th-u-name', c.thUName); setTxt('th-u-email', c.thUEmail); setTxt('th-u-role', c.thURole);
    setTxt('th-u-date', c.thUDate); setTxt('th-u-online', c.thUOnline); setTxt('th-u-last', c.thULast);
    if(document.getElementById('txt-u-load')) setTxt('txt-u-load', c.txtULoad);

    // تحديث التابات
    if(document.getElementById('tab-active')) document.getElementById('tab-active').innerHTML = c.tabActive;
    if(document.getElementById('tab-trials')) document.getElementById('tab-trials').innerHTML = c.tabTrials;
    
    const supBadge = document.getElementById('badge-support');
    const badgeHtml = supBadge ? supBadge.outerHTML : '';
    if(document.getElementById('tab-support')) document.getElementById('tab-support').innerHTML = c.tabSupport + badgeHtml;
    
    if(document.getElementById('tab-reviews')) document.getElementById('tab-reviews').innerHTML = c.tabReviews;

    window.superLang = c;
}

firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
        const userDoc = await db.collection("Users").doc(user.email).get();
        if (userDoc.exists && userDoc.data().role === 'superadmin') {
            loadClinics();
            loadGlobalStats();
            loadSupportTickets(); // 🔴 جلب تذاكر الدعم
            loadSystemReviews(); // 🔴 جلب التقييمات
        } else {
            const isAr = (localStorage.getItem('preferredLang') || 'ar') === 'ar';
            document.body.innerHTML = `<h2 style='text-align:center; color:red; margin-top:50px;'>${isAr ? "عفواً، ليس لديك صلاحية للدخول لهذه الشاشة." : "Access Denied."}</h2>`;
        }
    } else {
        window.location.href = "index.html";
    }
});

// 🔴 التنقل بين الأقسام (Views) 🔴
function switchMainTab(tabName) {
    currentActiveTab = tabName;
    document.querySelectorAll('.sa-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.main-view-container').forEach(v => v.style.display = 'none');
    
    if (tabName === 'active' || tabName === 'trials') {
        document.getElementById(`tab-${tabName}`).classList.add('active');
        document.getElementById('view-clinics').style.display = 'block';
        renderClinicsTable(); 
    } else if (tabName === 'support') {
        document.getElementById('tab-support').classList.add('active');
        document.getElementById('view-support').style.display = 'block';
    } else if (tabName === 'reviews') {
        document.getElementById('tab-reviews').classList.add('active');
        document.getElementById('view-reviews').style.display = 'block';
    }
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

// 🔴 دالة جلب وعرض تذاكر الدعم الفني 🔴
function loadSupportTickets() {
    db.collection("SupportTickets").orderBy("timestamp", "desc").onSnapshot(snap => {
        const tbody = document.getElementById('supportBody');
        tbody.innerHTML = '';
        let openCount = 0;
        const lang = localStorage.getItem('preferredLang') || 'ar';
        const isAr = lang === 'ar';

        if (snap.empty) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #64748b;">${window.superLang.noSupport || 'لا توجد تذاكر دعم فني.'}</td></tr>`;
            document.getElementById('badge-support').style.display = 'none';
            return;
        }

        snap.forEach(doc => {
            const ticket = doc.data();
            if (ticket.status === 'open') openCount++;

            let statusHtml = ticket.status === 'open' 
                ? `<span class="support-status support-open">${isAr ? 'مفتوحة (قيد الانتظار)' : 'Open'}</span>`
                : `<span class="support-status support-closed">${isAr ? 'مغلقة (تم الرد)' : 'Closed'}</span>`;

            let dateStr = '---';
            if (ticket.timestamp) {
                const d = typeof ticket.timestamp.toDate === 'function' ? ticket.timestamp.toDate() : new Date(ticket.timestamp);
                dateStr = `<span dir="ltr">${d.toLocaleDateString(isAr?'ar-EG':'en-US')} ${d.toLocaleTimeString(isAr?'ar-EG':'en-US', {hour:'2-digit', minute:'2-digit'})}</span>`;
            }

            let actionBtn = ticket.status === 'open' 
                ? `<button class="btn-primary" style="background:#0ea5e9; border:none; padding:5px 10px; border-radius:5px;" onclick='openReplyTicketModal("${doc.id}", ${JSON.stringify(ticket).replace(/'/g, "&#39;")})'>✉️ ${window.superLang.btnReply || 'رد'}</button>`
                : `<button class="btn-action" style="background:#f1f5f9; color:#94a3b8; border:1px solid #e2e8f0; cursor:not-allowed;" disabled>✔️ تمت</button>`;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-size: 13px; color: #475569;">${dateStr}</td>
                <td>
                    <strong style="color: #0f172a;">🏢 ${ticket.clinicName || '---'}</strong><br>
                    <small style="color: #64748b;" dir="ltr">${ticket.userEmail || '---'}</small>
                </td>
                <td style="max-width: 300px; white-space: normal; line-height: 1.5;">${ticket.message || '---'}</td>
                <td>${statusHtml}</td>
                <td style="text-align: center;">${actionBtn}</td>
            `;
            tbody.appendChild(tr);
        });

        // تحديث البادچ
        const badge = document.getElementById('badge-support');
        if (openCount > 0) {
            badge.innerText = openCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    });
}

function openReplyTicketModal(id, ticket) {
    document.getElementById('reply_ticket_id').value = id;
    document.getElementById('reply_clinic_id').value = ticket.clinicId;
    document.getElementById('ticket_reply_text').value = '';

    const isAr = (localStorage.getItem('preferredLang') || 'ar') === 'ar';
    let dateStr = '---';
    if (ticket.timestamp && ticket.timestamp.seconds) {
        const d = new Date(ticket.timestamp.seconds * 1000);
        dateStr = `<span dir="ltr">${d.toLocaleDateString(isAr?'ar-EG':'en-US')} ${d.toLocaleTimeString(isAr?'ar-EG':'en-US', {hour:'2-digit', minute:'2-digit'})}</span>`;
    }

    document.getElementById('ticket-info-display').innerHTML = `
        <strong>العيادة:</strong> ${ticket.clinicName}<br>
        <strong>الرسالة الأصلية:</strong> <br> <span style="color:#0f172a; display:block; padding:10px; background:white; border-radius:6px; margin-top:5px; border:1px solid #cbd5e1;">${ticket.message}</span>
    `;

    openModal('replyTicketModal');
}

async function submitTicketReply(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true; btn.innerText = "...";

    const ticketId = document.getElementById('reply_ticket_id').value;
    const clinicId = document.getElementById('reply_clinic_id').value;
    const replyText = document.getElementById('ticket_reply_text').value.trim();

    try {
        await db.collection("SupportTickets").doc(ticketId).update({
            status: 'closed',
            reply: replyText,
            repliedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // إرسال إشعار للعيادة بالرد
        await db.collection("Notifications").add({
            clinicId: clinicId,
            title: "رد على طلب الدعم الفني",
            message: replyText,
            type: "system",
            isRead: false,
            createdAt: new Date().toISOString()
        });

        alert(window.superLang.msgReplySent || "تم الرد وإغلاق التذكرة بنجاح.");
        closeModal('replyTicketModal');
    } catch (err) {
        console.error(err);
        alert("حدث خطأ أثناء الرد.");
    } finally {
        btn.disabled = false; btn.innerText = window.superLang.btnReply || "إرسال الرد وإغلاق التيكت";
    }
}

// 🔴 دالة جلب وعرض تقييمات النظام 🔴
function loadSystemReviews() {
    db.collection("SystemReviews").orderBy("createdAt", "desc").onSnapshot(snap => {
        const container = document.getElementById('reviewsContainer');
        container.innerHTML = '';
        
        if (snap.empty) {
            container.innerHTML = `<div style="text-align: center; padding: 20px; color: #64748b; grid-column: 1/-1;">${window.superLang.noReviews || 'لا توجد تقييمات حتى الآن.'}</div>`;
            return;
        }

        snap.forEach(doc => {
            const r = doc.data();
            let starsHtml = '⭐'.repeat(r.rating || 5);
            
            let dateStr = '---';
            if (r.createdAt) {
                const d = typeof r.createdAt.toDate === 'function' ? r.createdAt.toDate() : new Date(r.createdAt);
                dateStr = d.toLocaleDateString();
            }

            container.innerHTML += `
                <div class="review-card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <span class="stars">${starsHtml}</span>
                        <span style="color: #94a3b8; font-size: 12px;">${dateStr}</span>
                    </div>
                    <p style="margin: 0 0 10px 0; font-size: 15px; line-height: 1.5;">"${r.comment || 'بدون تعليق'}"</p>
                    <div style="border-top: 1px solid #e2e8f0; padding-top: 10px; display: flex; align-items: center; gap: 10px;">
                        <div style="width: 30px; height: 30px; background: #e0f2fe; color: #0284c7; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px;">🏢</div>
                        <div style="font-size: 13px; color: #475569;">
                            <strong>${r.clinicName || 'عيادة مجهولة'}</strong><br>
                            <span dir="ltr">${r.userEmail || ''}</span>
                        </div>
                    </div>
                </div>
            `;
        });
    });
}

// =================== باقي أكواد السوبر أدمن (العيادات والتعديلات) ===================

async function openClinicDetailsModal(clinicId) {
    const clinic = allClinicsList.find(c => c.id === clinicId);
    if (!clinic) return;

    const lang = localStorage.getItem('preferredLang') || 'ar';
    const isAr = lang === 'ar';

    let pkgLabel = '';
    if(clinic.package === 'trial_7') pkgLabel = isAr ? 'تجريبي 7 أيام' : 'Trial 7 Days';
    else if(clinic.package === 'trial_14') pkgLabel = isAr ? 'تجريبي 14 يوم' : 'Trial 14 Days';
    else if(clinic.planType === 'trial_29_days' || clinic.planType === 'trial_3_days') pkgLabel = isAr ? 'تجريبي (29 يوم)' : 'Trial (29 Days)'; 
    else if(clinic.package === 'yearly') pkgLabel = isAr ? 'اشتراك سنوي' : 'Yearly';
    else pkgLabel = isAr ? 'اشتراك شهري' : 'Monthly';

    const detPhone = document.getElementById('det-clinic-phone');
    let phoneFound = clinic.phone1 || clinic.adminPhone || null;
    if (detPhone) detPhone.innerText = phoneFound || '---';

    let clinicCreatedStr = '---';
    if (clinic.createdAt) {
        const cd = typeof clinic.createdAt.toDate === 'function' ? clinic.createdAt.toDate() : new Date(clinic.createdAt);
        clinicCreatedStr = cd.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US');
    }

    document.getElementById('det-clinic-name').innerText = clinic.clinicName;
    document.getElementById('det-clinic-code').innerText = clinic.accessCode || '---';
    document.getElementById('det-clinic-email').innerText = clinic.adminEmail || '---';
    document.getElementById('det-clinic-pkg').innerText = pkgLabel;
    
    const detCreated = document.getElementById('det-clinic-created');
    if (detCreated) detCreated.innerText = clinicCreatedStr;

    const priceDisplay = document.getElementById('det-clinic-price');
    if (priceDisplay) priceDisplay.innerText = clinic.subPrice || 0;
    
    const limitDisplay = document.getElementById('det-clinic-limit');
    if (limitDisplay) limitDisplay.innerText = clinic.maxUsers || 1;
    
    const hiddenId = document.getElementById('current-det-clinic-id');
    if (hiddenId) hiddenId.value = clinic.id;

    document.getElementById('clinicDetailsModal').style.display = 'flex';
    const tbody = document.getElementById('det-users-body');
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center;">${isAr ? 'جاري تجميع بيانات المستخدمين...' : 'Fetching users...'}</td></tr>`;

    try {
        const [adminCodesSnap, invitesSnap] = await Promise.all([
            db.collection("clinicId").where("clinicId", "==", clinicId).get(),
            db.collection("InviteCodes").where("clinicId", "==", clinicId).get()
        ]);

        let pendingUsers = [];
        let fallbackDate = clinic.createdAt ? (typeof clinic.createdAt.toDate === 'function' ? clinic.createdAt.toDate() : new Date(clinic.createdAt)) : new Date(0);

        adminCodesSnap.forEach(doc => {
            const a = doc.data();
            if (!a.activated) {
                pendingUsers.push({ 
                    name: 'مدير العيادة (الأدمن)', 
                    identifier: `كود التفعيل: ${doc.id}`, 
                    role: 'admin', status: 'pending', isOnline: false, lastLogin: null,
                    createdAt: fallbackDate 
                });
            }
        });
        
        invitesSnap.forEach(doc => {
            const inv = doc.data();
            if (!inv.activated) {
                let invDate = inv.createdAt ? (typeof inv.createdAt.toDate === 'function' ? inv.createdAt.toDate() : new Date(inv.createdAt)) : fallbackDate;
                pendingUsers.push({ 
                    name: inv.name || 'موظف مجهول', 
                    identifier: `كود الدعوة: ${doc.id}`, 
                    role: inv.role, status: 'pending', isOnline: false, lastLogin: null,
                    createdAt: invDate 
                });
            }
        });

        if (clinicUsersUnsubscribe) { clinicUsersUnsubscribe(); }

        clinicUsersUnsubscribe = db.collection("Users").where("clinicId", "==", clinicId)
            .onSnapshot(usersSnap => {
                let staffList = [...pendingUsers]; 

                usersSnap.forEach(doc => {
                    const u = doc.data();
                    let uDate = u.createdAt ? (typeof u.createdAt.toDate === 'function' ? u.createdAt.toDate() : new Date(u.createdAt)) : fallbackDate;
                    staffList.push({ 
                        name: u.name || '---', 
                        identifier: u.email || doc.id, 
                        role: u.role, 
                        status: 'active',
                        isOnline: u.isOnline || false, 
                        lastLogin: u.lastLogin || null,
                        createdAt: uDate 
                    });
                });

                staffList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

                tbody.innerHTML = '';
                
                if (staffList.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #64748b;">لا يوجد مستخدمين مسجلين أو أكواد معلقة.</td></tr>';
                } else {
                    staffList.forEach(u => {
                        let roleAr = u.role === 'admin' ? 'أدمن (مدير)' : (u.role === 'nurse' ? 'ممرضة' : (u.role === 'receptionist' ? 'استقبال' : (u.role === 'doctor' ? 'طبيب' : u.role)));
                        let roleColor = u.role === 'admin' ? '#dc2626' : (u.role === 'doctor' ? '#0284c7' : '#d97706');
                        let roleBg = u.role === 'admin' ? '#fee2e2' : (u.role === 'doctor' ? '#e0f2fe' : '#fef3c7');
                        
                        let identHtml = u.status === 'pending' 
                            ? `<strong style="color: #dc2626;">${u.identifier}</strong>` 
                            : `<span dir="ltr">${u.identifier}</span>`;

                        let onlineHtml = '';
                        let lastSeenHtml = '---';

                        if (u.status === 'pending') {
                            onlineHtml = `<span style="color:#d97706; font-size:12px;">⏳ لم يفعل الحساب</span>`;
                        } else {
                            if (u.isOnline) {
                                onlineHtml = `<span class="status-online">${isAr ? 'أونلاين' : 'Online'}</span>`;
                                lastSeenHtml = `<span style="color:#10b981; font-weight:bold;">${isAr ? 'الآن' : 'Now'}</span>`;
                            } else {
                                onlineHtml = `<span style="color:#94a3b8; font-size:20px;" title="أوفلاين">💤</span>`;
                                if (u.lastLogin) {
                                    try {
                                        const d = typeof u.lastLogin.toDate === 'function' ? u.lastLogin.toDate() : new Date(u.lastLogin);
                                        lastSeenHtml = `<span class="status-offline" dir="ltr">${d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')} ${d.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', {hour:'2-digit', minute:'2-digit'})}</span>`;
                                    } catch(e) { lastSeenHtml = '---'; }
                                } else {
                                    lastSeenHtml = `<span class="status-offline">${isAr ? 'لم يسجل دخول' : 'Never'}</span>`;
                                }
                            }
                        }

                        let joinDateHtml = '---';
                        if (u.createdAt.getTime() !== 0) {
                            joinDateHtml = `<span dir="ltr" style="color: #475569; font-size: 13px;">${u.createdAt.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}</span>`;
                        }

                        tbody.innerHTML += `
                            <tr>
                                <td style="font-weight: bold; color: #334155;">${u.name}</td>
                                <td style="text-align: right;">${identHtml}</td>
                                <td><span style="background: ${roleBg}; color: ${roleColor}; padding: 4px 10px; border-radius: 6px; font-size: 13px; font-weight: bold;">${roleAr}</span></td>
                                <td style="text-align: center;">${joinDateHtml}</td>
                                <td style="text-align: center;">${onlineHtml}</td>
                                <td>${lastSeenHtml}</td>
                            </tr>
                        `;
                    });
                }
            });

    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">حدث خطأ في تحميل بيانات المستخدمين والنشاط.</td></tr>';
    }
}

async function editClinicPrice() {
    const isAr = (localStorage.getItem('preferredLang') || 'ar') === 'ar';
    const currentPriceStr = document.getElementById('det-clinic-price').innerText;
    const clinicId = document.getElementById('current-det-clinic-id').value;
    if (!clinicId) return;

    let newPrice = prompt(isAr ? "أدخل قيمة الاشتراك الجديدة (ج.م):" : "Enter new subscription price (EGP):", currentPriceStr);
    
    if (newPrice !== null && newPrice.trim() !== "") {
        const numPrice = Number(newPrice);
        if (!isNaN(numPrice) && numPrice >= 0) {
            if (window.showLoader) window.showLoader(isAr ? "جاري التحديث..." : "Updating price...");
            try {
                await db.collection("Clinics").doc(clinicId).update({ subPrice: numPrice });
                document.getElementById('det-clinic-price').innerText = numPrice;
            } catch (err) {
                console.error(err);
                alert(isAr ? "حدث خطأ أثناء التحديث" : "Error updating price");
            } finally {
                if (window.hideLoader) window.hideLoader();
            }
        } else {
            alert(isAr ? "برجاء إدخال رقم صحيح." : "Please enter a valid number.");
        }
    }
}

async function editClinicUsersLimit() {
    const isAr = (localStorage.getItem('preferredLang') || 'ar') === 'ar';
    const currentLimit = document.getElementById('det-clinic-limit').innerText;
    const clinicId = document.getElementById('current-det-clinic-id').value;
    if (!clinicId) return;

    let newLimit = prompt(isAr ? "أدخل الحد الأقصى الجديد للمستخدمين (شاملاً المدير):" : "Enter new max users limit (including admin):", currentLimit);
    
    if (newLimit !== null && newLimit.trim() !== "") {
        const numLimit = Number(newLimit);
        if (!isNaN(numLimit) && numLimit >= 1) {
            if (window.showLoader) window.showLoader(isAr ? "جاري تحديث الصلاحيات..." : "Updating limit...");
            try {
                await db.collection("Clinics").doc(clinicId).update({ maxUsers: numLimit });
                document.getElementById('det-clinic-limit').innerText = numLimit;
            } catch (err) {
                console.error(err);
                alert(isAr ? "حدث خطأ أثناء التحديث" : "Error updating limit");
            } finally {
                if (window.hideLoader) window.hideLoader();
            }
        } else {
            alert(isAr ? "برجاء إدخال رقم صحيح أكبر من 0." : "Please enter a valid number greater than 0.");
        }
    }
}

function closeClinicDetailsModal() { 
    document.getElementById('clinicDetailsModal').style.display = 'none'; 
    if (clinicUsersUnsubscribe) {
        clinicUsersUnsubscribe();
        clinicUsersUnsubscribe = null;
    }
}

function openClinicModal() {
    document.getElementById('clinicForm').reset();
    document.getElementById('clinicModal').style.display = 'flex';
}

function closeClinicModal() {
    document.getElementById('clinicModal').style.display = 'none';
}

async function openUserModal() {
    document.getElementById('userForm').reset();
    const clinicSelect = document.getElementById('user_clinic');
    const branchSelect = document.getElementById('user_branch');
    
    clinicSelect.innerHTML = '<option value="">جاري تحميل العيادات...</option>';
    branchSelect.innerHTML = '<option value="main">الفرع الرئيسي</option>';
    
    document.getElementById('userModal').style.display = 'flex';

    try {
        const snap = await db.collection("Clinics").where("status", "==", "active").get();
        clinicSelect.innerHTML = '<option value="" disabled selected>اختر العيادة...</option>';
        snap.forEach(doc => {
            const c = doc.data();
            clinicSelect.innerHTML += `<option value="${doc.id}">${c.clinicName}</option>`;
        });

        clinicSelect.onchange = async function() {
            const selectedClinicId = this.value;
            branchSelect.innerHTML = '<option value="">جاري التحميل...</option>';
            try {
                const branchSnap = await db.collection("Branches").where("clinicId", "==", selectedClinicId).get();
                branchSelect.innerHTML = '<option value="main">الفرع الرئيسي</option>';
                branchSnap.forEach(bDoc => {
                    branchSelect.innerHTML += `<option value="${bDoc.id}">${bDoc.data().name}</option>`;
                });
            } catch(err) {
                console.error("Error fetching branches:", err);
                branchSelect.innerHTML = '<option value="main">الفرع الرئيسي</option>';
            }
        };

    } catch(e) {
        console.error(e);
        clinicSelect.innerHTML = '<option value="">خطأ في تحميل العيادات</option>';
    }
}

function closeUserModal() { document.getElementById('userModal').style.display = 'none'; }

async function saveNewUser(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    btn.innerText = "جاري توليد الكود...";

    const userName = document.getElementById('user_name').value.trim();
    const clinicId = document.getElementById('user_clinic').value;
    const branchId = document.getElementById('user_branch').value; 
    const role = document.getElementById('user_role').value; 

    if (!clinicId) { alert("برجاء اختيار العيادة أولاً."); btn.disabled = false; btn.innerText = window.superLang.btnSubUser; return; }

    if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري إنشاء كود الدعوة..." : "Generating invite code...");

    try {
        const inviteCode = Math.floor(10000 + Math.random() * 90000).toString();

        await db.collection("InviteCodes").doc(inviteCode).set({
            name: userName,
            role: role,
            clinicId: clinicId,
            branchId: branchId, 
            activated: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert(`✅ تم توليد كود الدعوة بنجاح!\n\nالكود: ${inviteCode}\nالاسم: ${userName}\nالوظيفة: ${role}\nالفرع: ${branchId === 'main' ? 'الرئيسي' : 'فرع إضافي'}\n\nيرجى إعطاء هذا الكود للموظف لتفعيل حسابه من شاشة تسجيل الدخول.`);
        closeUserModal();
    } catch (error) {
        console.error("Error generating code:", error);
        alert("حدث خطأ أثناء توليد الكود!");
    } finally {
        btn.disabled = false;
        btn.innerText = window.superLang.btnSubUser;
        if (window.hideLoader) window.hideLoader();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', function(event) {
            if (event.target === this) {
                if (this.id === 'clinicDetailsModal' && clinicUsersUnsubscribe) {
                    clinicUsersUnsubscribe();
                    clinicUsersUnsubscribe = null;
                }
                this.style.display = 'none';
            }
        });
    });
});

async function saveNewClinic(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save');
    btn.disabled = true; btn.innerText = window.superLang.btnSaving;

    if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري تجهيز مساحة العيادة على السيرفر..." : "Setting up new clinic...");

    const clinicName = document.getElementById('clinic_name').value.trim();
    const adminEmail = document.getElementById('clinic_admin_email').value.trim().toLowerCase();
    const plan = document.getElementById('clinic_plan').value; 
    const packageType = document.getElementById('clinic_package').value; 
    
    const subPriceInput = document.getElementById('clinic_sub_price');
    const subPrice = subPriceInput && subPriceInput.value ? Number(subPriceInput.value) : 0;
    
    const phoneInput = document.getElementById('clinic_phone');
    const adminPhone = phoneInput && phoneInput.value.trim() !== "" ? phoneInput.value.trim() : "01000000000";

    const maxUsersInput = document.getElementById('clinic_max_users');
    const maxUsers = maxUsersInput ? Number(maxUsersInput.value) : 3;

    try {
        const accessCode = Math.floor(10000 + Math.random() * 90000).toString();
        const uniqueClinicId = "clinic_" + accessCode + "_" + Date.now().toString().slice(-4);

        const nextPayDate = new Date();
        if (packageType === 'monthly') { nextPayDate.setMonth(nextPayDate.getMonth() + 1); } 
        else if (packageType === 'yearly') { nextPayDate.setFullYear(nextPayDate.getFullYear() + 1); } 
        else if (packageType === 'trial_7') { nextPayDate.setDate(nextPayDate.getDate() + 7); } 
        else if (packageType === 'trial_14') { nextPayDate.setDate(nextPayDate.getDate() + 14); }

        await db.collection("Clinics").doc(uniqueClinicId).set({
            clinicName: clinicName,
            status: plan,
            package: packageType, 
            subPrice: subPrice, 
            maxUsers: maxUsers,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            nextPaymentDate: nextPayDate,
            logoUrl: "",
            accessCode: accessCode,
            adminEmail: adminEmail,
            adminPhone: adminPhone
        });

        await db.collection("clinicId").doc(accessCode).set({
            activated: false,
            name: clinicName,
            phone: adminPhone,
            email: adminEmail,
            role: "admin",
            clinicId: uniqueClinicId
        });

        let msg = window.superLang.msgSuccess.replace('{id}', accessCode).replace('{email}', adminEmail);
        alert(msg);
        closeClinicModal();
    } catch (error) {
        console.error("Error creating clinic:", error);
        alert(window.superLang.msgError);
    } finally {
        btn.disabled = false; btn.innerText = window.superLang.btnSave;
        if (window.hideLoader) window.hideLoader();
    }
}

function loadClinics() {
    if (window.showLoader && allClinicsList.length === 0) window.showLoader(document.body.dir === 'rtl' ? "جاري مزامنة بيانات النظام..." : "Syncing SaaS data...");

    db.collection("Clinics").orderBy("createdAt", "desc").onSnapshot(async (snap) => {
        allClinicsList = []; 
        let activeCount = 0;
        let suspendedCount = 0;
        const now = new Date();

        for (const doc of snap.docs) {
            const c = doc.data();
            c.id = doc.id;

            if (c.nextPaymentDate) {
                const npDate = typeof c.nextPaymentDate.toDate === 'function' ? c.nextPaymentDate.toDate() : new Date(c.nextPaymentDate);
                if (now > npDate && c.status !== 'expired' && c.status !== 'suspended') {
                    db.collection("Clinics").doc(c.id).update({
                        status: 'expired',
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }).catch(e => console.error("Auto-expire error:", e));
                    
                    c.status = 'expired'; 
                }
            }

            allClinicsList.push(c); 
            if (c.status === 'active') activeCount++;
            else if (c.status === 'suspended') suspendedCount++;
        }
        
        document.getElementById('stat-clinics').innerText = activeCount;
        document.getElementById('stat-susp-clinics').innerText = suspendedCount;
        
        renderClinicsTable(); 
        if (window.hideLoader) window.hideLoader();
    }, () => {
        if (window.hideLoader) window.hideLoader();
    });
}

function renderClinicsTable() {
    const tbody = document.getElementById('clinicsBody');
    tbody.innerHTML = '';
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const now = new Date();

    const filteredClinics = allClinicsList.filter(c => {
        if (currentActiveTab === 'trials') return c.planType === 'trial_29_days' || c.planType === 'trial_3_days';
        return c.planType !== 'trial_29_days' && c.planType !== 'trial_3_days'; 
    });

    if (filteredClinics.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center;">${window.superLang.empty}</td></tr>`;
        return;
    }

    filteredClinics.forEach(c => {
        const dateStr = c.createdAt ? c.createdAt.toDate().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US') : '---';
        
        let nextPayStr = "---";
        let payStyle = "";
        let alertBadge = "";

        if (c.nextPaymentDate) {
            const npDate = typeof c.nextPaymentDate.toDate === 'function' ? c.nextPaymentDate.toDate() : new Date(c.nextPaymentDate);
            nextPayStr = npDate.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US');
            
            const diffTime = npDate - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

            if (diffDays < 0 && c.status !== 'suspended') {
                payStyle = "color: red; font-weight: bold;";
                alertBadge = `<span style="background: red; color: white; padding: 2px 5px; border-radius: 4px; font-size: 10px; margin-right: 5px;">منتهي</span>`;
            } else if (diffDays >= 0 && diffDays <= 3 && c.status === 'active') {
                payStyle = "color: #d97706; font-weight: bold;";
                alertBadge = `<span style="background: #fef3c7; color: #d97706; padding: 2px 5px; border-radius: 4px; font-size: 10px; margin-right: 5px; border: 1px solid #fde68a;">⚠️ قريباً</span>`;
            } else {
                payStyle = "color: green;";
            }
        }

        let adminEmail = c.adminEmail || "---";
        let accessCode = c.accessCode || ""; 

        let pkgLabel = '';
        if(c.package === 'trial_7') pkgLabel = lang==='ar'?'تجريبي 7 أيام':'Trial 7';
        else if(c.package === 'trial_14') pkgLabel = lang==='ar'?'تجريبي 14 يوم':'Trial 14';
        else if(c.planType === 'trial_3_days') pkgLabel = lang==='ar'?'تجريبي (3 أيام)':'Trial 3';
        else if(c.package === 'yearly') pkgLabel = lang==='ar'?'سنوي':'Yearly';
        else pkgLabel = lang==='ar'?'شهري':'Monthly';

        let statusHtml = '';
        if(c.status === 'active') statusHtml = `<span class="status-badge status-active">${window.superLang.sAct}</span>`;
        else if(c.status === 'expired') statusHtml = `<span class="status-badge" style="background:#fee2e2; color:#ef4444; border:1px solid #fca5a5;">${window.superLang.sExpired}</span>`;
        else statusHtml = `<span class="status-badge status-suspended">${window.superLang.sSusp}</span>`;

        let toggleBtnHtml = '';
        if (c.status === 'suspended' || c.status === 'expired') {
            toggleBtnHtml = `<button class="btn-primary" onclick="toggleSubscription('${c.id}', 'active')" style="background:#3b82f6; border:none; padding:5px 10px; color:white; border-radius:5px; cursor:pointer;">▶️ ${window.superLang.btnRenew}</button>`;
        } else {
            toggleBtnHtml = `<button class="btn-warning" onclick="toggleSubscription('${c.id}', 'suspended')" style="background:#f59e0b; border:none; padding:5px 10px; color:white; border-radius:5px; cursor:pointer;">⏸️ ${window.superLang.btnCancelSub}</button>`;
        }

        let btnPkgTxt = lang === 'ar' ? "تغيير الباقة" : "Package";

        let actionsHtml = '';
        
        if (currentActiveTab === 'trials') {
            actionsHtml = `
                <button onclick="openUpgradeTrialModal('${c.id}', '${c.clinicName}', '${adminEmail}', '${c.phone1}')" style="background:#10b981; border:none; padding:5px 10px; color:white; border-radius:5px; cursor:pointer; font-weight: bold; width: 100%;">🚀 ترقية العيادة ودفع الاشتراك</button>
            `;
        } 
        else {
            actionsHtml = `
                <button onclick="markAsPaid('${c.id}')" style="background:#10b981; border:none; padding:5px 10px; color:white; border-radius:5px; cursor:pointer;" title="إضافة شهر جديد">💰 ${window.superLang.btnPaid}</button>
                <button onclick="openChangePackageModal('${c.id}')" style="background:#8b5cf6; border:none; padding:5px 10px; color:white; border-radius:5px; cursor:pointer;" title="${btnPkgTxt}">📦 ${btnPkgTxt}</button>
                ${toggleBtnHtml}
                <button class="btn-danger" onclick="deleteClinic('${c.id}', '${accessCode}')" style="background:#ef4444; border:none; padding:5px 10px; color:white; border-radius:5px; cursor:pointer;">🗑️ ${window.superLang.btnDelete}</button>
            `;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${dateStr}</td>
            <td style="${payStyle}" dir="ltr">${nextPayStr} ${alertBadge}</td>
            <td>
                <a class="clinic-link" onclick="openClinicDetailsModal('${c.id}')">🏢 ${c.clinicName}</a><br>
                <small style="color:gray;">الكود: ${accessCode || 'بدون'} | الباقة: <span style="color:#3b82f6;">${pkgLabel}</span> | السعة: <strong>${c.maxUsers||1}</strong></small>
            </td>
            <td dir="ltr" style="text-align:start;">${adminEmail}</td>
            <td>${statusHtml}</td>
            <td style="text-align: center; display: flex; gap: 5px; justify-content: center; flex-wrap: wrap;">
                ${actionsHtml}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openUpgradeTrialModal(clinicId, clinicName, adminEmail, adminPhone) {
    document.getElementById('upg_clinic_id').value = clinicId;
    document.getElementById('upg_clinic_name').value = clinicName;
    document.getElementById('upg_admin_email').value = adminEmail;
    document.getElementById('upg_admin_phone').value = adminPhone || '';
    
    document.getElementById('upg_package').value = 'monthly';
    document.getElementById('upg_price').value = '';
    document.getElementById('upg_max_users').value = '5';
    
    document.getElementById('upgradeTrialModal').style.display = 'flex';
}

function closeUpgradeTrialModal() {
    document.getElementById('upgradeTrialModal').style.display = 'none';
}

async function confirmUpgradeTrial(e) {
    e.preventDefault();
    const isAr = (localStorage.getItem('preferredLang') || 'ar') === 'ar';
    const btn = document.getElementById('btn-confirm-upgrade');
    btn.disabled = true;
    
    const clinicId = document.getElementById('upg_clinic_id').value;
    const clinicName = document.getElementById('upg_clinic_name').value;
    const adminEmail = document.getElementById('upg_admin_email').value;
    const adminPhone = document.getElementById('upg_admin_phone').value;
    const packageType = document.getElementById('upg_package').value;
    const subPrice = Number(document.getElementById('upg_price').value);
    const maxUsers = Number(document.getElementById('upg_max_users').value);

    if (window.showLoader) window.showLoader(isAr ? "جاري ترقية العيادة وتوليد كود الدخول..." : "Upgrading clinic...");

    try {
        const accessCode = Math.floor(10000 + Math.random() * 90000).toString();
        
        const nextPayDate = new Date();
        if (packageType === 'monthly') nextPayDate.setMonth(nextPayDate.getMonth() + 1);
        else if (packageType === 'yearly') nextPayDate.setFullYear(nextPayDate.getFullYear() + 1);

        await db.collection("Clinics").doc(clinicId).update({
            planType: firebase.firestore.FieldValue.delete(), 
            package: packageType,
            subPrice: subPrice,
            maxUsers: maxUsers,
            accessCode: accessCode,
            nextPaymentDate: nextPayDate,
            status: 'active'
        });

        await db.collection("clinicId").doc(accessCode).set({
            activated: true, 
            name: clinicName,
            phone: adminPhone || "",
            email: adminEmail,
            role: "admin",
            clinicId: clinicId
        });

        alert(isAr ? `✅ تم ترقية العيادة بنجاح!\n\nتم توليد كود دخول جديد للدكتور:\nكود العيادة: ${accessCode}\nقيمة الاشتراك: ${subPrice} ج.م` : `✅ Clinic upgraded successfully!\nNew Code: ${accessCode}`);
        closeUpgradeTrialModal();
    } catch (error) {
        console.error(error);
        alert("حدث خطأ أثناء الترقية");
    } finally {
        btn.disabled = false;
        if (window.hideLoader) window.hideLoader();
    }
}

function openChangePackageModal(clinicId) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const isAr = lang === 'ar';
    
    let modal = document.getElementById('dynamicPkgModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'dynamicPkgModal';
        modal.className = 'modal no-print';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px; text-align: ${isAr ? 'right' : 'left'}; direction: ${isAr ? 'rtl' : 'ltr'};">
                <span class="close-modal" onclick="document.getElementById('dynamicPkgModal').style.display='none'" style="${isAr ? 'left: 25px; right: auto;' : 'right: 25px; left: auto;'}">&times;</span>
                <h2 style="margin-bottom: 20px;">${isAr ? 'تغيير باقة العيادة' : 'Change Clinic Package'}</h2>
                <input type="hidden" id="pkg_change_clinic_id">
                <div class="form-group">
                    <label>${isAr ? 'اختر الباقة الجديدة' : 'Select New Package'}</label>
                    <select id="new_pkg_select" class="search-box" style="direction: ${isAr ? 'rtl' : 'ltr'}; margin-bottom: 20px;">
                        <option value="trial_7">${isAr ? 'تجريبي 7 أيام' : 'Trial (7 Days)'}</option>
                        <option value="trial_14">${isAr ? 'تجريبي 14 يوم' : 'Trial (14 Days)'}</option>
                        <option value="monthly">${isAr ? 'شهري (Monthly)' : 'Monthly'}</option>
                        <option value="yearly">${isAr ? 'سنوي (Yearly)' : 'Yearly'}</option>
                    </select>
                </div>
                <button class="btn-primary" style="width: 100%; justify-content: center; background: #8b5cf6;" onclick="confirmPackageChange()">${isAr ? 'حفظ وتفعيل الباقة' : 'Save & Activate'}</button>
            </div>
        `;
        document.body.appendChild(modal);
    }
    document.getElementById('pkg_change_clinic_id').value = clinicId;
    modal.style.display = 'flex';
}

async function confirmPackageChange() {
    const clinicId = document.getElementById('pkg_change_clinic_id').value;
    const newPkg = document.getElementById('new_pkg_select').value;
    if(!clinicId) return;

    if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري تحديث الباقة وتفعيل العيادة..." : "Updating package...");
    try {
        const nextPayDate = new Date();
        if (newPkg === 'trial_7') nextPayDate.setDate(nextPayDate.getDate() + 7);
        else if (newPkg === 'trial_14') nextPayDate.setDate(nextPayDate.getDate() + 14);
        else if (newPkg === 'monthly') nextPayDate.setMonth(nextPayDate.getMonth() + 1);
        else if (newPkg === 'yearly') nextPayDate.setFullYear(nextPayDate.getFullYear() + 1);

        await db.collection("Clinics").doc(clinicId).update({
            package: newPkg,
            nextPaymentDate: nextPayDate,
            status: 'active'
        });

        document.getElementById('dynamicPkgModal').style.display = 'none';
        closeClinicDetailsModal(); 
        alert(document.body.dir === 'rtl' ? "✅ تم تحديث الباقة وتفعيل العيادة بنجاح!" : "✅ Package updated successfully!");
    } catch(e) {
        console.error(e);
        alert("حدث خطأ");
    } finally {
        if (window.hideLoader) window.hideLoader();
    }
}

async function markAsPaid(clinicId) {
    if(confirm(window.superLang.msgConfirmPaid)) {
        if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري التجديد..." : "Renewing...");
        try {
            const newNextPay = new Date();
            newNextPay.setMonth(newNextPay.getMonth() + 1); 
            
            await db.collection("Clinics").doc(clinicId).update({ 
                status: 'active',
                nextPaymentDate: newNextPay,
                package: 'monthly' 
            });
        } catch (e) {
            console.error(e);
        } finally {
            if (window.hideLoader) window.hideLoader();
        }
    }
}

async function toggleSubscription(clinicId, newStatus) {
    if(confirm(window.superLang.msgConfirmToggle)) {
        if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري تغيير الحالة..." : "Updating status...");
        try {
            await db.collection("Clinics").doc(clinicId).update({ status: newStatus });
        } catch (e) {
            console.error(e);
        } finally {
            if (window.hideLoader) window.hideLoader();
        }
    }
}

async function deleteClinic(clinicId, accessCode) {
    const code = prompt(window.superLang.msgWarnDel);
    if (code === '1234') {
        if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري مسح العيادة نهائياً..." : "Deleting clinic...");
        try {
            await db.collection("Clinics").doc(clinicId).delete();
            if(accessCode && accessCode !== "") {
                await db.collection("clinicId").doc(accessCode).delete();
            }
            alert(window.superLang.msgDelSuccess);
        } catch (e) {
            console.error(e);
        } finally {
            if (window.hideLoader) window.hideLoader();
        }
    }
}

function loadGlobalStats() {
    db.collection("Patients").get().then(snap => {
        document.getElementById('stat-all-patients').innerText = snap.size;
    });
}

function filterData() {
    const input = document.getElementById('searchInput').value.toLowerCase();
    
    // فلترة العيادات
    const cRows = document.getElementById('clinicsBody').getElementsByTagName('tr');
    for (let i = 0; i < cRows.length; i++) {
        const nameCol = cRows[i].getElementsByTagName('td')[2]; 
        if (nameCol) {
            const textToSearch = nameCol.textContent.toLowerCase();
            if (textToSearch.indexOf(input) > -1) cRows[i].style.display = "";
            else cRows[i].style.display = "none";
        }
    }
    
    // فلترة الدعم الفني
    const sRows = document.getElementById('supportBody').getElementsByTagName('tr');
    for (let i = 0; i < sRows.length; i++) {
        const clinicCol = sRows[i].getElementsByTagName('td')[1]; 
        if (clinicCol) {
            const textToSearch = clinicCol.textContent.toLowerCase();
            if (textToSearch.indexOf(input) > -1) sRows[i].style.display = "";
            else sRows[i].style.display = "none";
        }
    }
}

window.onload = () => {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.body.dir = lang === 'en' ? 'ltr' : 'rtl';
    updatePageContent(lang);
};
