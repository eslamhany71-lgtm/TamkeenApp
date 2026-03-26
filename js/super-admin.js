const db = firebase.firestore();

// 1. نظام الترجمة (عربي/إنجليزي)
function updatePageContent(lang) {
    const t = {
        ar: {
            title: "إدارة النظام المركزية (SaaS)", sub: "لوحة تحكم المالك - صلاحيات عليا", search: "بحث باسم العيادة...", btnAdd: "إضافة عيادة جديدة",
            totClinics: "إجمالي العيادات النشطة", totPatients: "إجمالي المرضى (في كل النظام)",
            thDate: "تاريخ الاشتراك", thNextPay: "ميعاد التجديد", thName: "اسم العيادة", thEmail: "إيميل الأدمن (الدكتور)", thStatus: "حالة الاشتراك", thAction: "إجراءات",
            loading: "جاري تحميل البيانات...", empty: "لا توجد عيادات مسجلة حالياً.",
            mTitle: "تسجيل عيادة جديدة بالنظام", lName: "اسم العيادة / المركز الطبي", lEmail: "البريد الإلكتروني للأدمن", 
            lHint: "* يجب إنشاء هذا الحساب لاحقاً من شاشة تسجيل الدخول.", lPlan: "خطة الاشتراك", 
            optAct: "نشط (Active)", optTri: "فترة تجريبية (Trial)", optSusp: "موقوف (Suspended)", btnSave: "إنشاء العيادة وتوليد المعرف",
            sAct: "نشط", sTri: "تجريبي", sSusp: "موقوف", btnChange: "تغيير الحالة", btnPaid: "تم الدفع", btnCancelSub: "إلغاء الاشتراك",
            msgSuccess: "تم إنشاء العيادة بنجاح!\n\nكود الدخول: {id}\nإيميل الأدمن: {email}\n\nيرجى إرسال الكود للدكتور لتفعيل الحساب من صفحة التفعيل.",
            msgError: "حدث خطأ أثناء الإنشاء!", msgConfirmToggle: "هل تريد تغيير حالة العيادة إلى {status}؟",
            msgConfirmPaid: "هل تريد تأكيد استلام الدفعة وتجديد الاشتراك لمدة شهر؟",
            msgWarnDel: "تحذير: هذا سيحذف العيادة تماماً! اكتب '1234' للتأكيد:", msgDelSuccess: "تم مسح العيادة وإلغاء الاشتراك.", btnSaving: "جاري الإنشاء..."
        },
        en: {
            title: "Central SaaS Management", sub: "Owner Dashboard - Super Admin", search: "Search by clinic name...", btnAdd: "Add New Clinic",
            totClinics: "Total Active Clinics", totPatients: "Total Patients (Global)",
            thDate: "Subscription Date", thNextPay: "Next Payment", thName: "Clinic Name", thEmail: "Admin Email (Doctor)", thStatus: "Status", thAction: "Actions",
            loading: "Loading data...", empty: "No clinics registered yet.",
            mTitle: "Register New Clinic", lName: "Clinic / Center Name", lEmail: "Admin Email", 
            lHint: "* This account must be created later from the login screen.", lPlan: "Subscription Plan", 
            optAct: "Active", optTri: "Trial", optSusp: "Suspended", btnSave: "Create Clinic & Generate ID",
            sAct: "Active", sTri: "Trial", sSusp: "Suspended", btnChange: "Toggle Status", btnPaid: "Paid", btnCancelSub: "Cancel Sub",
            msgSuccess: "Clinic created successfully!\n\nAccess Code: {id}\nAdmin Email: {email}\n\nPlease send this code to the doctor to activate the account.",
            msgError: "Error creating clinic!", msgConfirmToggle: "Change clinic status to {status}?",
            msgConfirmPaid: "Confirm payment receipt and renew subscription for one month?",
            msgWarnDel: "WARNING: This will delete the clinic! Type '1234' to confirm:", msgDelSuccess: "Clinic and subscription deleted.", btnSaving: "Creating..."
        }
    };
    const c = t[lang] || t.ar;
    const setTxt = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };

    setTxt('txt-title', c.title); setTxt('txt-subtitle', c.sub); document.getElementById('searchInput').placeholder = c.search;
    setTxt('btn-add-clinic', c.btnAdd); setTxt('lbl-tot-clinics', c.totClinics); setTxt('lbl-tot-patients', c.totPatients);
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

// 4. إنشاء عيادة جديدة وتوليد الكود (مع حساب ميعاد الدفع)
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

        // 🔴 حساب تاريخ التجديد (بعد شهر من النهارده)
        const nextPayDate = new Date();
        nextPayDate.setMonth(nextPayDate.getMonth() + 1);

        await db.collection("Clinics").doc(uniqueClinicId).set({
            clinicName: clinicName,
            status: plan,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            nextPaymentDate: nextPayDate, // حفظ الميعاد في الفايربيز
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

// 5. عرض العيادات (مع التواريخ والزراير الجديدة)
function loadClinics() {
    db.collection("Clinics").orderBy("createdAt", "desc").onSnapshot(async (snap) => {
        const tbody = document.getElementById('clinicsBody');
        tbody.innerHTML = '';
        
        let activeCount = 0;

        if (snap.empty) {
            document.getElementById('stat-clinics').innerText = 0;
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center;">${window.superLang.empty}</td></tr>`;
            return;
        }

        const lang = localStorage.getItem('preferredLang') || 'ar';

        for (const doc of snap.docs) {
            const c = doc.data();
            const dateStr = c.createdAt ? c.createdAt.toDate().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US') : '---';
            
            // قراءة ميعاد الدفع وتلوينه لو متأخر
            let nextPayStr = "---";
            let payStyle = "";
            if (c.nextPaymentDate) {
                const npDate = c.nextPaymentDate.toDate();
                nextPayStr = npDate.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US');
                if (new Date() > npDate) {
                    payStyle = "color: red; font-weight: bold;"; // تنبيه أحمر لو عدى الميعاد
                } else {
                    payStyle = "color: green;";
                }
            }

            if (c.status === 'active') activeCount++;

            let adminEmail = c.adminEmail || "---";
            let accessCode = c.accessCode || ""; 

            let statusHtml = '';
            if(c.status === 'active') statusHtml = `<span class="status-badge status-active">${window.superLang.sAct}</span>`;
            else if(c.status === 'trial') statusHtml = `<span class="status-badge status-trial">${window.superLang.sTri}</span>`;
            else statusHtml = `<span class="status-badge status-suspended">${window.superLang.sSusp}</span>`;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${dateStr}</td>
                <td style="${payStyle}" dir="ltr">${nextPayStr}</td>
                <td style="font-weight:bold;">${c.clinicName}<br><small style="color:gray;">الكود: ${accessCode}</small></td>
                <td dir="ltr" style="text-align:start;">${adminEmail}</td>
                <td>${statusHtml}</td>
                <td style="text-align: center; display: flex; gap: 5px; justify-content: center; flex-wrap: wrap;">
                    <button class="btn-primary" onclick="markAsPaid('${doc.id}')" style="background:#10b981; border:none; padding:5px 10px; color:white; border-radius:5px; cursor:pointer;">${window.superLang.btnPaid}</button>
                    <button class="btn-warning" onclick="toggleStatus('${doc.id}', '${c.status}')" style="border:none; padding:5px 10px; border-radius:5px; cursor:pointer;">${window.superLang.btnChange}</button>
                    <button class="btn-danger" onclick="deleteClinic('${doc.id}', '${accessCode}')" style="border:none; padding:5px 10px; border-radius:5px; cursor:pointer;">${window.superLang.btnCancelSub}</button>
                </td>
            `;
            tbody.appendChild(tr);
        }
        document.getElementById('stat-clinics').innerText = activeCount; // تحديث الإحصائيات بالعيادات النشطة فقط
    });
}

// 6. زرار تم الدفع (يجدد شهر ويخلي الحالة نشطة)
async function markAsPaid(clinicId) {
    if(confirm(window.superLang.msgConfirmPaid)) {
        const newNextPay = new Date();
        newNextPay.setMonth(newNextPay.getMonth() + 1); // يزود شهر من تاريخ النهارده
        
        await db.collection("Clinics").doc(clinicId).update({ 
            status: 'active',
            nextPaymentDate: newNextPay
        });
    }
}

// 7. إيقاف / تفعيل عيادة يدوياً
async function toggleStatus(clinicId, currentStatus) {
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    const statusTxt = newStatus === 'active' ? window.superLang.sAct : window.superLang.sSusp;
    
    if(confirm(window.superLang.msgConfirmToggle.replace('{status}', statusTxt))) {
        await db.collection("Clinics").doc(clinicId).update({ status: newStatus });
    }
}

// 8. إلغاء الاشتراك (حذف)
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
        const nameCol = rows[i].getElementsByTagName('td')[2]; // العمود بقى رقم 2 بدل 1 عشان ضفنا ميعاد الدفع
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
