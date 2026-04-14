const db = firebase.firestore();
let allClinicsList = []; 
let clinicUsersUnsubscribe = null; 

let currentActiveTab = 'active'; // 'active' أو 'trials' للفلترة

function updatePageContent(lang) {
    const t = {
        ar: {
            title: "إدارة النظام المركزية (SaaS)", sub: "لوحة تحكم المالك - صلاحيات عليا", search: "بحث باسم العيادة...", btnAdd: "إضافة عيادة جديدة",
            totClinics: "العيادات النشطة", totSusp: "العيادات الموقوفة", totPatients: "المرضى (في كل النظام)",
            thDate: "تاريخ الاشتراك", thNextPay: "ميعاد الانتهاء", thName: "اسم العيادة", thEmail: "إيميل الأدمن", thStatus: "الحالة", thAction: "إجراءات",
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

// 🔴 دالة تبديل التابات 🔴
function switchMainTab(tabName) {
    currentActiveTab = tabName;
    document.getElementById('tab-active').classList.remove('active');
    document.getElementById('tab-trials').classList.remove('active');
    
    if(tabName === 'active') document.getElementById('tab-active').classList.add('active');
    else document.getElementById('tab-trials').classList.add('active');
    
    renderClinicsTable(); // نعيد رسم الجدول بناءً على التابة
}

async function openClinicDetailsModal(clinicId) {
    const clinic = allClinicsList.find(c => c.id === clinicId);
    if (!clinic) return;

    const lang = localStorage.getItem('preferredLang') || 'ar';
    const isAr = lang === 'ar';

    let pkgLabel = '';
    if(clinic.package === 'trial_7') pkgLabel = 'تجريبي 7 أيام';
    else if(clinic.package === 'trial_14') pkgLabel = 'تجريبي 14 يوم';
    else if(clinic.planType === 'trial_3_days') pkgLabel = 'تجريبي مجاني (3 أيام)'; // للعيادات الجديدة
    else if(clinic.package === 'yearly') pkgLabel = 'اشتراك سنوي';
    else pkgLabel = 'اشتراك شهري';

    const detPhone = document.getElementById('det-clinic-phone');
    let phoneFound = clinic.phone1 || clinic.adminPhone || null;
    if (detPhone) detPhone.innerText = phoneFound || 'جاري البحث...';

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
    
    const hiddenId = document.getElementById('current-det-clinic-id');
    if (hiddenId) hiddenId.value = clinic.id;

    document.getElementById('clinicDetailsModal').style.display = 'flex';
    const tbody = document.getElementById('det-users-body');
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center;">${isAr ? 'جاري تجميع بيانات المستخدمين ومراقبة النشاط...' : 'Fetching users activity...'}</td></tr>`;

    try {
        const [adminCodesSnap, invitesSnap] = await Promise.all([
            db.collection("clinicId").where("clinicId", "==", clinicId).get(),
            db.collection("InviteCodes").where("clinicId", "==", clinicId).get()
        ]);

        let pendingUsers = [];

        let fallbackDate = clinic.createdAt ? (typeof clinic.createdAt.toDate === 'function' ? clinic.createdAt.toDate() : new Date(clinic.createdAt)) : new Date(0);

        adminCodesSnap.forEach(doc => {
            const a = doc.data();
            if (!phoneFound && a.phone) {
                phoneFound = a.phone;
                if (detPhone) detPhone.innerText = phoneFound;
            }
            if (!a.activated) {
                pendingUsers.push({ 
                    name: 'مدير العيادة (الأدمن)', 
                    identifier: `كود التفعيل: ${doc.id}`, 
                    role: 'admin', status: 'pending', isOnline: false, lastLogin: null,
                    createdAt: fallbackDate 
                });
            }
        });
        
        if (!phoneFound && detPhone) detPhone.innerText = 'غير مسجل';

        invitesSnap.forEach(doc => {
            const inv = doc.data();
            if (!inv.activated) {
                let invDate = inv.createdAt ? (typeof inv.createdAt.toDate === 'function' ? inv.createdAt.toDate() : new Date(inv.createdAt)) : fallbackDate;
                pendingUsers.push({ 
                    name: inv.name || 'ممرضة', 
                    identifier: `كود الدعوة: ${doc.id}`, 
                    role: inv.role, status: 'pending', isOnline: false, lastLogin: null,
                    createdAt: invDate 
                });
            }
        });

        if (clinicUsersUnsubscribe) {
            clinicUsersUnsubscribe(); 
        }

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
                        let roleAr = u.role === 'admin' ? 'أدمن (طبيب)' : (u.role === 'nurse' ? 'ممرضة' : u.role);
                        let roleColor = u.role === 'admin' ? '#0284c7' : '#7c3aed';
                        let roleBg = u.role === 'admin' ? '#e0f2fe' : '#ede9fe';
                        
                        let identHtml = u.status === 'pending' 
                            ? `<strong style="color: #dc2626;">${u.identifier}</strong>` 
                            : `<span dir="ltr">${u.identifier}</span>`;

                        let onlineHtml = '';
                        let lastSeenHtml = '---';

                        if (u.status === 'pending') {
                            onlineHtml = `<span style="color:#d97706; font-size:12px;">⏳ لم يفعل الحساب</span>`;
                        } else {
                            if (u.isOnline) {
                                onlineHtml = `<span class="status-online">أونلاين</span>`;
                                lastSeenHtml = `<span style="color:#10b981; font-weight:bold;">الآن</span>`;
                            } else {
                                onlineHtml = `<span style="color:#94a3b8; font-size:20px;" title="أوفلاين">💤</span>`;
                                if (u.lastLogin) {
                                    try {
                                        const d = typeof u.lastLogin.toDate === 'function' ? u.lastLogin.toDate() : new Date(u.lastLogin);
                                        lastSeenHtml = `<span class="status-offline" dir="ltr">${d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')} ${d.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', {hour:'2-digit', minute:'2-digit'})}</span>`;
                                    } catch(e) { lastSeenHtml = '---'; }
                                } else {
                                    lastSeenHtml = `<span class="status-offline">لم يسجل دخول مسبقاً</span>`;
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
                await db.collection("Clinics").doc(clinicId).update({
                    subPrice: numPrice
                });
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
    clinicSelect.innerHTML = '<option value="">جاري تحميل العيادات...</option>';
    document.getElementById('userModal').style.display = 'flex';

    try {
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

function closeUserModal() { document.getElementById('userModal').style.display = 'none'; }

async function saveNewUser(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    btn.innerText = "جاري توليد الكود...";

    const userName = document.getElementById('user_name').value.trim();
    const clinicId = document.getElementById('user_clinic').value;
    const role = "nurse";

    if (!clinicId) { alert("برجاء اختيار العيادة أولاً."); btn.disabled = false; btn.innerText = "توليد كود الدعوة"; return; }

    if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري إنشاء كود الدعوة..." : "Generating invite code...");

    try {
        // 🔴 توليد كود الممرضة أرقام فقط (5 أرقام) 🔴
        const inviteCode = Math.floor(10000 + Math.random() * 90000).toString();

        await db.collection("InviteCodes").doc(inviteCode).set({
            name: userName,
            role: role,
            clinicId: clinicId,
            activated: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert(`✅ تم توليد كود الدعوة بنجاح!\n\nكود الممرضة: ${inviteCode}\nاسم الممرضة: ${userName}\n\nيرجى إعطاء هذا الكود للممرضة لتفعيل حسابها من شاشة تسجيل الدخول.`);
        closeUserModal();
    } catch (error) {
        console.error("Error generating code:", error);
        alert("حدث خطأ أثناء توليد الكود!");
    } finally {
        btn.disabled = false;
        btn.innerText = "توليد كود الدعوة";
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

    try {
        // 🔴 كود العيادة أرقام فقط (5 أرقام) 🔴
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

        for (const doc of snap.docs) {
            const c = doc.data();
            c.id = doc.id;
            allClinicsList.push(c); 
            if (c.status === 'active') activeCount++;
            else if (c.status === 'suspended') suspendedCount++;
        }
        
        document.getElementById('stat-clinics').innerText = activeCount;
        document.getElementById('stat-susp-clinics').innerText = suspendedCount;
        
        renderClinicsTable(); // رسم الجدول بعد تحديث الداتا
        if (window.hideLoader) window.hideLoader();
    }, () => {
        if (window.hideLoader) window.hideLoader();
    });
}

// 🔴 دالة رسم الجدول المفصولة عشان تشتغل مع التابات 🔴
function renderClinicsTable() {
    const tbody = document.getElementById('clinicsBody');
    tbody.innerHTML = '';
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const now = new Date();

    // فلترة العيادات حسب التابة المفتوحة
    const filteredClinics = allClinicsList.filter(c => {
        if (currentActiveTab === 'trials') return c.planType === 'trial_3_days';
        return c.planType !== 'trial_3_days'; // الباقي كله في التابة الأساسية
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

        let adminEmail = c.adminEmail || "---";
        let accessCode = c.accessCode || ""; 

        let pkgLabel = '';
        if(c.package === 'trial_7') pkgLabel = 'تجريبي 7 أيام';
        else if(c.package === 'trial_14') pkgLabel = 'تجريبي 14 يوم';
        else if(c.planType === 'trial_3_days') pkgLabel = 'تجريبي مجاني (3 أيام)';
        else if(c.package === 'yearly') pkgLabel = 'اشتراك سنوي';
        else pkgLabel = 'اشتراك شهري';

        let statusHtml = '';
        if(c.status === 'active') statusHtml = `<span class="status-badge status-active">${window.superLang.sAct}</span>`;
        else statusHtml = `<span class="status-badge status-suspended">${window.superLang.sSusp}</span>`;

        let toggleBtnHtml = '';
        if (c.status === 'suspended') {
            toggleBtnHtml = `<button class="btn-primary" onclick="toggleSubscription('${c.id}', 'active')" style="background:#3b82f6; border:none; padding:5px 10px; color:white; border-radius:5px; cursor:pointer;">▶️ ${window.superLang.btnRenew}</button>`;
        } else {
            toggleBtnHtml = `<button class="btn-warning" onclick="toggleSubscription('${c.id}', 'suspended')" style="background:#f59e0b; border:none; padding:5px 10px; color:white; border-radius:5px; cursor:pointer;">⏸️ ${window.superLang.btnCancelSub}</button>`;
        }

        let btnPkgTxt = lang === 'ar' ? "تغيير الباقة" : "Package";

        let actionsHtml = '';
        
        // 🔴 أزرار تابة التجارب المجانية (ترقية اشتراك) 🔴
        if (currentActiveTab === 'trials') {
            actionsHtml = `
                <button onclick="upgradeTrialToPaid('${c.id}', '${c.clinicName}', '${adminEmail}', '${c.phone1}')" style="background:#10b981; border:none; padding:5px 10px; color:white; border-radius:5px; cursor:pointer; font-weight: bold; width: 100%;">🚀 ترقية العيادة ودفع الاشتراك</button>
            `;
        } 
        // 🔴 أزرار تابة العيادات الأساسية 🔴
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
                <small style="color:gray;">الكود: ${accessCode || 'بدون'} | الباقة: <span style="color:#3b82f6;">${pkgLabel}</span></small>
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

// 🔴 دالة تحويل العيادة التجريبية لعيادة رسمية وتوليد كود الدخول 🔴
async function upgradeTrialToPaid(clinicId, clinicName, adminEmail, adminPhone) {
    const isAr = (localStorage.getItem('preferredLang') || 'ar') === 'ar';
    
    let subPriceStr = prompt(isAr ? "أدخل قيمة الاشتراك الشهري المتفق عليه (ج.م):" : "Enter agreed monthly subscription price (EGP):", "500");
    if (subPriceStr === null || subPriceStr.trim() === "") return;
    
    const subPrice = Number(subPriceStr);
    if (isNaN(subPrice)) {
        alert(isAr ? "برجاء إدخال رقم صحيح!" : "Please enter a valid number.");
        return;
    }

    if (window.showLoader) window.showLoader(isAr ? "جاري ترقية العيادة وتوليد كود الدخول..." : "Upgrading clinic...");

    try {
        // توليد كود دخول أرقام فقط (5 أرقام)
        const accessCode = Math.floor(10000 + Math.random() * 90000).toString();
        
        // شهر جديد من دلوقتي
        const nextPayDate = new Date();
        nextPayDate.setMonth(nextPayDate.getMonth() + 1);

        // 1. تحديث بيانات العيادة
        await db.collection("Clinics").doc(clinicId).update({
            planType: firebase.firestore.FieldValue.delete(), // شيل صفة التجريبي
            package: 'monthly',
            subPrice: subPrice,
            accessCode: accessCode,
            nextPaymentDate: nextPayDate,
            status: 'active'
        });

        // 2. إنشاء كود الدخول في كوليكشن clinicId عشان يقدر يسجل بيه لو حب
        await db.collection("clinicId").doc(accessCode).set({
            activated: true, // متفعل جاهز عشان ميعملش ريجستر تاني
            name: clinicName,
            phone: adminPhone || "",
            email: adminEmail,
            role: "admin",
            clinicId: clinicId
        });

        alert(isAr ? `✅ تم ترقية العيادة بنجاح!\n\nتم توليد كود دخول جديد للدكتور:\nكود العيادة: ${accessCode}\nقيمة الاشتراك: ${subPrice} ج.م` : `✅ Clinic upgraded successfully!\nNew Code: ${accessCode}`);
        
    } catch (e) {
        console.error(e);
        alert("حدث خطأ أثناء الترقية");
    } finally {
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
