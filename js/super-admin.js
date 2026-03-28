const db = firebase.firestore();

// 1. نظام الترجمة
function updatePageContent(lang) {
    const t = {
        ar: {
            title: "إدارة النظام المركزية (SaaS)", sub: "لوحة تحكم المالك - صلاحيات عليا", search: "بحث باسم العيادة...", btnAdd: "إضافة عيادة جديدة",
            totClinics: "العيادات النشطة", totSusp: "العيادات الموقوفة", totPatients: "المرضى (في كل النظام)",
            thDate: "تاريخ الاشتراك", thNextPay: "ميعاد التجديد", thName: "اسم العيادة", thEmail: "إيميل الأدمن", thStatus: "الحالة", thAction: "إجراءات",
            loading: "جاري تحميل البيانات...", empty: "لا توجد عيادات مسجلة حالياً.",
            mTitle: "تسجيل عيادة جديدة بالنظام", lName: "اسم العيادة / المركز الطبي", lEmail: "البريد الإلكتروني للأدمن", 
            lHint: "* يجب إنشاء هذا الحساب لاحقاً من شاشة تسجيل الدخول.",
            lPkg: "باقة الاشتراك", optPkgT7: "تجريبي (7 أيام)", optPkgT14: "تجريبي (14 يوم)", optPkgMonth: "شهري (Monthly)", optPkgYear: "سنوي (Yearly)",
            lPlan: "حالة الحساب", optAct: "نشط (Active)", optSusp: "موقوف (Suspended)", btnSave: "إنشاء العيادة وتوليد المعرف",
            sAct: "نشط", sSusp: "موقوف", 
            btnPaid: "تم الدفع", btnCancelSub: "إيقاف الحساب", btnRenew: "تفعيل الحساب", btnDelete: "حذف العيادة",
            msgSuccess: "تم إنشاء العيادة بنجاح!\n\nكود الدخول: {id}\nإيميل الأدمن: {email}\n\nيرجى إرسال الكود للدكتور لتفعيل الحساب.",
            msgError: "حدث خطأ أثناء الإنشاء!", msgConfirmToggle: "هل متأكد من تغيير حالة العيادة؟",
            msgConfirmPaid: "هل تريد تأكيد استلام الدفعة وتجديد الاشتراك لمدة شهر؟",
            msgWarnDel: "تحذير: هذا سيحذف العيادة تماماً ولن يمكن استرجاعها! اكتب '1234' للتأكيد:", msgDelSuccess: "تم حذف العيادة بنجاح.", btnSaving: "جاري الإنشاء..."
        },
        en: {
            title: "Central SaaS Management", sub: "Owner Dashboard - Super Admin", search: "Search by clinic name...", btnAdd: "Add New Clinic",
            totClinics: "Active Clinics", totSusp: "Suspended Clinics", totPatients: "Total Patients",
            thDate: "Sub Date", thNextPay: "Next Payment", thName: "Clinic Name", thEmail: "Admin Email", thStatus: "Status", thAction: "Actions",
            loading: "Loading data...", empty: "No clinics registered yet.",
            mTitle: "Register New Clinic", lName: "Clinic / Center Name", lEmail: "Admin Email", 
            lHint: "* This account must be created later from the login screen.", 
            lPkg: "Subscription Package", optPkgT7: "Trial (7 Days)", optPkgT14: "Trial (14 Days)", optPkgMonth: "Monthly", optPkgYear: "Yearly",
            lPlan: "Account Status", optAct: "Active", optSusp: "Suspended", btnSave: "Create Clinic & Generate ID",
            sAct: "Active", sSusp: "Suspended", 
            btnPaid: "Paid", btnCancelSub: "Suspend Acc", btnRenew: "Activate Acc", btnDelete: "Delete Clinic",
            msgSuccess: "Clinic created successfully!\n\nAccess Code: {id}\nAdmin Email: {email}\n\nPlease send this code to the doctor to activate the account.",
            msgError: "Error creating clinic!", msgConfirmToggle: "Are you sure you want to change the status?",
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
    setTxt('mod-title', c.mTitle); setTxt('lbl-c-name', c.lName); setTxt('lbl-c-email', c.lEmail); setTxt('lbl-c-hint', c.lHint); 
    
    setTxt('lbl-c-pkg', c.lPkg); setTxt('opt-pkg-t7', c.optPkgT7); setTxt('opt-pkg-t14', c.optPkgT14); setTxt('opt-pkg-month', c.optPkgMonth); setTxt('opt-pkg-year', c.optPkgYear);
    
    setTxt('lbl-c-plan', c.lPlan); setTxt('opt-active', c.optAct); setTxt('opt-susp', c.optSusp); setTxt('btn-save', c.btnSave);
    
    window.superLang = c;
}

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

// === دوال إضافة المستخدمين (الممرضة) السحرية ===
async function openUserModal() {
    document.getElementById('userForm').reset();
    const clinicSelect = document.getElementById('user_clinic');
    clinicSelect.innerHTML = '<option value="">جاري تحميل العيادات...</option>';
    document.getElementById('userModal').style.display = 'flex';

    try {
        // بنسحب العيادات عشان نملى القائمة المنسدلة
        const snap = await db.collection("Clinics").where("status", "==", "active").get();
        clinicSelect.innerHTML = '<option value="" disabled selected>اختر العيادة...</option>';
        snap.forEach(doc => {
            const c = doc.data();
            clinicSelect.innerHTML += `<option value="${doc.id}">${c.clinicName}</option>`;
        });
    } catch(e) {
        console.error(e);
        clinicSelect.innerHTML = '<option value="">خطأ في تحميل العيادات</option>';
    }
}

function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
}

async function saveNewUser(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    btn.innerText = "جاري الحفظ والربط...";

    const userName = document.getElementById('user_name').value.trim();
    const userEmail = document.getElementById('user_email').value.trim().toLowerCase();
    const clinicId = document.getElementById('user_clinic').value;
    const role = "nurse";

    if (!clinicId) {
        alert("برجاء اختيار العيادة التي ستعمل بها الممرضة أولاً.");
        btn.disabled = false;
        btn.innerText = "تسجيل وربط الصلاحية";
        return;
    }

    try {
        // حجز الإيميل كممرضة في الداتا بيز (Whitelist)
        await db.collection("Users").doc(userEmail).set({
            name: userName,
            email: userEmail,
            role: role,
            clinicId: clinicId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert(`تم إضافة الممرضة بنجاح! 🎉\n\nالعيادة تم ربطها، ويمكن للممرضة الآن إنشاء حساب جديد باستخدام الإيميل:\n${userEmail}\nوسيتم توجيهها لعيادتها مباشرة كـ "ممرضة".`);
        closeUserModal();
    } catch (error) {
        console.error("Error adding user:", error);
        alert("حدث خطأ أثناء إضافة الممرضة!");
    } finally {
        btn.disabled = false;
        btn.innerText = "تسجيل وربط الصلاحية";
    }
}
// ===============================================

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

// 4. الحفظ وتوليد التاريخ بناءً على الباقة المختارة
async function saveNewClinic(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save');
    btn.disabled = true; btn.innerText = window.superLang.btnSaving;

    const clinicName = document.getElementById('clinic_name').value.trim();
    const adminEmail = document.getElementById('clinic_admin_email').value.trim().toLowerCase();
    const plan = document.getElementById('clinic_plan').value; 
    const packageType = document.getElementById('clinic_package').value; 
    
    const phoneInput = document.getElementById('clinic_phone');
    const adminPhone = phoneInput && phoneInput.value.trim() !== "" ? phoneInput.value.trim() : "01000000000";

    try {
        const accessCode = Math.floor(1000 + Math.random() * 9000).toString();
        const uniqueClinicId = "clinic_" + accessCode + "_" + Date.now().toString().slice(-4);

        const nextPayDate = new Date();
        if (packageType === 'monthly') {
            nextPayDate.setMonth(nextPayDate.getMonth() + 1);
        } else if (packageType === 'yearly') {
            nextPayDate.setFullYear(nextPayDate.getFullYear() + 1);
        } else if (packageType === 'trial_7') {
            nextPayDate.setDate(nextPayDate.getDate() + 7);
        } else if (packageType === 'trial_14') {
            nextPayDate.setDate(nextPayDate.getDate() + 14);
        }

        await db.collection("Clinics").doc(uniqueClinicId).set({
            clinicName: clinicName,
            status: plan,
            package: packageType, 
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

// 5. عرض العيادات 
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
            let alertBadge = "";

            if (c.nextPaymentDate) {
                const npDate = c.nextPaymentDate.toDate();
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

            if (c.status === 'active') activeCount++;
            else if (c.status === 'suspended') suspendedCount++;

            let adminEmail = c.adminEmail || "---";
            let accessCode = c.accessCode || ""; 

            let pkgLabel = '';
            if(c.package === 'trial_7') pkgLabel = 'تجريبي 7 أيام';
            else if(c.package === 'trial_14') pkgLabel = 'تجريبي 14 يوم';
            else if(c.package === 'yearly') pkgLabel = 'اشتراك سنوي';
            else pkgLabel = 'اشتراك شهري';

            let statusHtml = '';
            if(c.status === 'active') statusHtml = `<span class="status-badge status-active">${window.superLang.sAct}</span>`;
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
                <td style="font-weight:bold;">${c.clinicName}<br><small style="color:gray;">الكود: ${accessCode} | الباقة: <span style="color:#3b82f6;">${pkgLabel}</span></small></td>
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

async function markAsPaid(clinicId) {
    if(confirm(window.superLang.msgConfirmPaid)) {
        const newNextPay = new Date();
        newNextPay.setMonth(newNextPay.getMonth() + 1); 
        
        await db.collection("Clinics").doc(clinicId).update({ 
            status: 'active',
            nextPaymentDate: newNextPay,
            package: 'monthly' 
        });
    }
}

async function toggleSubscription(clinicId, newStatus) {
    if(confirm(window.superLang.msgConfirmToggle)) {
        await db.collection("Clinics").doc(clinicId).update({ status: newStatus });
    }
}

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
