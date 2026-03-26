const db = firebase.firestore();

// 1. نظام الترجمة (عربي/إنجليزي)
function updatePageContent(lang) {
    const t = {
        ar: {
            title: "إدارة النظام المركزية (SaaS)", sub: "لوحة تحكم المالك - صلاحيات عليا", search: "بحث باسم العيادة...", btnAdd: "إضافة عيادة جديدة",
            totClinics: "العيادات النشطة", totSusp: "العيادات الموقوفة", totPatients: "المرضى (في كل النظام)",
            thDate: "تاريخ الاشتراك", thNextPay: "ميعاد التجديد", thName: "اسم العيادة", thEmail: "إيميل الأدمن (الدكتور)", thStatus: "الحالة", thAction: "إجراءات",
            loading: "جاري تحميل البيانات...", empty: "لا توجد عيادات مسجلة حالياً.",
            mTitle: "تسجيل عيادة جديدة بالنظام", lName: "اسم العيادة / المركز الطبي", lEmail: "البريد الإلكتروني للأدمن", 
            lHint: "* يجب إنشاء هذا الحساب لاحقاً من شاشة تسجيل الدخول.", lPlan: "خطة الاشتراك", 
            optAct: "نشط (Active)", optTri: "فترة تجريبية (Trial)", optSusp: "موقوف (Suspended)", btnSave: "إنشاء العيادة وتوليد المعرف",
            sAct: "نشط", sTri: "تجريبي", sSusp: "موقوف", 
            btnPaid: "تم الدفع", btnCancelSub: "إلغاء الاشتراك", btnRenew: "تجديد الاشتراك", btnDelete: "حذف العيادة",
            msgSuccess: "تم إنشاء العيادة بنجاح!\n\nكود الدخول: {id}\nإيميل الأدمن: {email}\n\nيرجى إرسال الكود للدكتور لتفعيل الحساب من صفحة التفعيل.",
            msgError: "حدث خطأ أثناء الإنشاء!", msgConfirmToggle: "هل متأكد من تغيير حالة اشتراك العيادة؟",
            msgConfirmPaid: "هل تريد تأكيد استلام الدفعة وتجديد الاشتراك لمدة شهر وتفعيل العيادة؟",
            msgWarnDel: "تحذير: هذا سيحذف العيادة تماماً ولن يمكن استرجاعها! اكتب '1234' للتأكيد:", msgDelSuccess: "تم حذف العيادة بنجاح.", btnSaving: "جاري الإنشاء..."
        },
        en: {
            title: "Central SaaS Management", sub: "Owner Dashboard - Super Admin", search: "Search by clinic name...", btnAdd: "Add New Clinic",
            totClinics: "Active Clinics", totSusp: "Suspended Clinics", totPatients: "Total Patients (Global)",
            thDate: "Sub Date", thNextPay: "Next Payment", thName: "Clinic Name", thEmail: "Admin Email", thStatus: "Status", thAction: "Actions",
            loading: "Loading data...", empty: "No clinics registered yet.",
            mTitle: "Register New Clinic", lName: "Clinic / Center Name", lEmail: "Admin Email", 
            lHint: "* This account must be created later from the login screen.", lPlan: "Subscription Plan", 
            optAct: "Active", optTri: "Trial", optSusp: "Suspended", btnSave: "Create Clinic & Generate ID",
            sAct: "Active", sTri: "Trial", sSusp: "Suspended", 
            btnPaid: "Paid", btnCancelSub: "Cancel Sub", btnRenew: "Renew Sub", btnDelete: "Delete Clinic",
            msgSuccess: "Clinic created successfully!\n\nAccess Code: {id}\nAdmin Email: {email}\n\nPlease send this code to the doctor to activate the account.",
            msgError: "Error creating clinic!", msgConfirmToggle: "Are you sure you want to change the subscription status?",
            msgConfirmPaid: "Confirm payment receipt and renew subscription for one month?",
            msgWarnDel: "WARNING: This will permanently delete the clinic! Type '1234' to confirm:", msgDelSuccess: "Clinic deleted successfully.", btnSaving: "Creating..."
        }
    };
    const c = t[lang] || t.ar;
    const setTxt = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };

    setTxt('txt-title', c.title); setTxt('txt-subtitle', c.sub); document.getElementById('searchInput').placeholder = c.search;
    setTxt('btn-add-clinic', c.btnAdd); setTxt('lbl-tot-clinics', c.totClinics); setTxt('lbl-tot-susp', c.totSusp); setTxt('lbl-tot-patients', c.totPatients);
    setTxt('th-date', c.thDate); setTxt('th-next-pay', c.thNextPay); setTxt('th-name', c.thName); setTxt('th-email', c.thEmail); setTxt('th-status', c.thStatus); setTxt('th-action', c.thAction);
    if(document.getElementById('txt-loading')) setTxt('txt-loading', c.loading);
    setTxt('mod-title', c.mTitle); setTxt('lbl-c-name', c.lName); setTxt('lbl-c-email', c.lEmail); setTxt('lbl-c-hint', c.lHint); setTxt('lbl-c-plan', c.lPlan);
    setTxt('opt-active', c.optAct); setTxt('opt-trial', c.optTri); setTxt('opt-susp', c.optSusp); setTxt('btn-save', c.btnSave);
    
    window.superLang = c;
}

// 2. التأكد من الصلاحيات
firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
        const userDoc = await db.collection("Users").doc(user.email).get();
        if (userDoc.exists && userDoc.data().role === 'superadmin') {
            loadClinics();
            loadGlobalStats();
        } else {
            const isAr = (localStorage.getItem('preferredLang') || 'ar') === 'ar';
            document.body.innerHTML = `<h2 style='text-align:center; color:red; margin-top:50px;'>${isAr ? "عفواً، ليس لديك صلاحية للدخول لهذه الشاشة." : "Access Denied."}</h2>`;
        }
    } else {
        window.location.href = "index.html";
    }
});

function openClinicModal() {
    document.getElementById('clinicForm').reset();
    document.getElementById('clinicModal').style.display = 'flex';
}

function closeClinicModal() {
    document.getElementById('clinicModal').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', function(event) {
            if (event.target === this) {
                this.style.display = 'none';
            }
        });
    });
});

// 4. إنشاء عيادة جديدة وتوليد الكود
async function saveNewClinic(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save');
    btn.disabled = true; btn.innerText = window.superLang.btnSaving;

    const clinicName = document.getElementById('clinic_name').value.trim();
    const adminEmail = document.getElementById('clinic_admin_email').value.trim().toLowerCase();
    const plan = document.getElementById('clinic_plan').value;
    const phoneInput = document.getElementById('clinic_phone');
    const adminPhone = phoneInput && phoneInput.value.trim() !== "" ? phoneInput.value.trim() : "01000000000";

    try {
        const accessCode = Math.floor(1000 + Math.random() * 9000).toString();
        const uniqueClinicId = "clinic_" + accessCode + "_" + Date.now().toString().slice(-4);

        const nextPayDate = new Date();
        nextPayDate.setMonth(nextPayDate.getMonth() + 1);

        await db.collection("Clinics").doc(uniqueClinicId).set({
            clinicName: clinicName,
            status: plan,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            nextPaymentDate: nextPayDate,
            logoUrl: "",
            accessCode: accessCode,
            adminEmail: adminEmail
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
    }
}

// 5. عرض العيادات (مع نظام التنبيهات المبكرة للسوبر أدمن)
function loadClinics() {
    db.collection("Clinics").orderBy("createdAt", "desc").onSnapshot(async (snap) => {
        const tbody = document.getElementById('clinicsBody');
        tbody.innerHTML = '';
        
        let activeCount = 0;
        let suspendedCount = 0;

        if (snap.empty) {
            document.getElementById('stat-clinics').innerText = 0;
            document.getElementById('stat-susp-clinics').innerText = 0;
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center;">${window.superLang.empty}</td></tr>`;
            return;
        }

        const lang = localStorage.getItem('preferredLang') || 'ar';
        const now = new Date();

        for (const doc of snap.docs) {
            const c = doc.data();
            const dateStr = c.createdAt ? c.createdAt.toDate().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US') : '---';
            
            let nextPayStr = "---";
            let payStyle = "";
            let alertBadge = ""; // علامة التنبيه

            if (c.nextPaymentDate) {
                const npDate = c.nextPaymentDate.toDate();
                nextPayStr = npDate.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US');
                
                // حساب الأيام المتبقية
                const diffTime = npDate - now;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

                if (diffDays < 0 && c.status !== 'suspended') {
                    // عدى الميعاد ولسه متوقفش (المفروض دي متحصلش لأننا عاملين الطرد، بس زيادة تأكيد)
                    payStyle = "color: red; font-weight: bold;";
                    alertBadge = `<span style="background: red; color: white; padding: 2px 5px; border-radius: 4px; font-size: 10px; margin-right: 5px;">منتهي</span>`;
                } else if (diffDays >= 0 && diffDays <= 3 && c.status === 'active') {
                    // ⚠️ التنبيه المبكر: فاضل 3 أيام أو أقل
                    payStyle = "color: #d97706; font-weight: bold;"; // لون برتقالي غامق
                    alertBadge = `<span style="background: #fef3c7; color: #d97706; padding: 2px 5px; border-radius: 4px; font-size: 10px; margin-right: 5px; border: 1px solid #fde68a;">⚠️ قريباً</span>`;
                } else {
                    payStyle = "color: green;";
                }
            }

            // تحديث الإحصائيات
            if (c.status === 'active' || c.status === 'trial') activeCount++;
            else if (c.status === 'suspended') suspendedCount++;

            let adminEmail = c.adminEmail || "---";
            let accessCode = c.accessCode || ""; 

            let statusHtml = '';
            if(c.status === 'active') statusHtml = `<span class="status-badge status-active">${window.superLang.sAct}</span>`;
            else if(c.status === 'trial') statusHtml = `<span class="status-badge status-trial">${window.superLang.sTri}</span>`;
            else statusHtml = `<span class="status-badge status-suspended">${window.superLang.sSusp}</span>`;

            let toggleBtnHtml = '';
            if (c.status === 'suspended') {
                toggleBtnHtml = `<button class="btn-primary" onclick="toggleSubscription('${doc.id}', 'active')" style="background:#3b82f6; border:none; padding:5px 10px; color:white; border-radius:5px; cursor:pointer;">▶️ ${window.superLang.btnRenew}</button>`;
            } else {
                toggleBtnHtml = `<button class="btn-warning" onclick="toggleSubscription('${doc.id}', 'suspended')" style="background:#f59e0b; border:none; padding:5px 10px; color:white; border-radius:5px; cursor:pointer;">⏸️ ${window.superLang.btnCancelSub}</button>`;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${dateStr}</td>
                <td style="${payStyle}" dir="ltr">${nextPayStr} ${alertBadge}</td>
                <td style="font-weight:bold;">${c.clinicName}<br><small style="color:gray;">الكود: ${accessCode}</small></td>
                <td dir="ltr" style="text-align:start;">${adminEmail}</td>
                <td>${statusHtml}</td>
                <td style="text-align: center; display: flex; gap: 5px; justify-content: center; flex-wrap: wrap;">
                    <button onclick="markAsPaid('${doc.id}')" style="background:#10b981; border:none; padding:5px 10px; color:white; border-radius:5px; cursor:pointer;" title="إضافة شهر جديد">💰 ${window.superLang.btnPaid}</button>
                    ${toggleBtnHtml}
                    <button class="btn-danger" onclick="deleteClinic('${doc.id}', '${accessCode}')" style="background:#ef4444; border:none; padding:5px 10px; color:white; border-radius:5px; cursor:pointer;">🗑️ ${window.superLang.btnDelete}</button>
                </td>
            `;
            tbody.appendChild(tr);
        }
        
        document.getElementById('stat-clinics').innerText = activeCount;
        document.getElementById('stat-susp-clinics').innerText = suspendedCount;
    });
}
// 6. زرار تم الدفع (يجدد شهر ويخلي الحالة نشطة)
async function markAsPaid(clinicId) {
    if(confirm(window.superLang.msgConfirmPaid)) {
        const newNextPay = new Date();
        newNextPay.setMonth(newNextPay.getMonth() + 1); 
        
        await db.collection("Clinics").doc(clinicId).update({ 
            status: 'active',
            nextPaymentDate: newNextPay
        });
    }
}

// 7. إيقاف / تفعيل اشتراك (إلغاء أو تجديد بدون مسح الداتا)
async function toggleSubscription(clinicId, newStatus) {
    if(confirm(window.superLang.msgConfirmToggle)) {
        await db.collection("Clinics").doc(clinicId).update({ status: newStatus });
    }
}

// 8. الحذف النهائي (Hard Delete)
async function deleteClinic(clinicId, accessCode) {
    const code = prompt(window.superLang.msgWarnDel);
    if (code === '1234') {
        await db.collection("Clinics").doc(clinicId).delete();
        if(accessCode && accessCode !== "") {
            await db.collection("clinicId").doc(accessCode).delete();
        }
        alert(window.superLang.msgDelSuccess);
    }
}

function loadGlobalStats() {
    db.collection("Patients").get().then(snap => {
        document.getElementById('stat-all-patients').innerText = snap.size;
    });
}

function filterClinics() {
    const input = document.getElementById('searchInput').value.toLowerCase();
    const rows = document.getElementById('clinicsBody').getElementsByTagName('tr');
    for (let i = 0; i < rows.length; i++) {
        const nameCol = rows[i].getElementsByTagName('td')[2]; 
        if (nameCol) {
            const textToSearch = nameCol.textContent.toLowerCase();
            if (textToSearch.indexOf(input) > -1) rows[i].style.display = "";
            else rows[i].style.display = "none";
        }
    }
}

window.onload = () => {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.body.dir = lang === 'en' ? 'ltr' : 'rtl';
    updatePageContent(lang);
};
