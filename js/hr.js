// js/hr.js - Unified HR & Access Control System
const db = firebase.firestore();
const currentClinicId = sessionStorage.getItem('clinicId');

let allStaff = []; 
let clinicBranches = [];

let usersUnsubscribe = null;
let invitesUnsubscribe = null;
let employeesUnsubscribe = null;

let hrLang = {}; // 🔴 لتخزين الترجمات

// 🔴 1. إعدادات اللغة 🔴
function updateLanguage(lang) {
    const translations = {
        ar: {
            title: "شؤون الموظفين والصلاحيات", sub: "إدارة فريق العمل، الفروع، الصلاحيات، والرواتب",
            btnInvite: "دعوة مستخدم للنظام", btnOther: "إضافة عمالة (بدون دخول)",
            kpiTeam: "فريق العمل", kpiOnline: "متصل الآن", kpiSalary: "إجمالي الرواتب",
            searchPlh: "ابحث بالاسم، الموبايل، أو الإيميل...",
            optAllRoles: "كل الوظائف", rAdm: "مدير نظام", rDoc: "طبيب", rRec: "استقبال", rNur: "مساعد / ممرض", rOth: "عمالة أخرى",
            optAllBranches: "كل الفروع", optMain: "الفرع الرئيسي",
            thName: "الاسم والبيانات", thRole: "الوظيفة والفرع", thAcc: "نظام المحاسبة", thStatus: "الحالة / التواجد", thAction: "إجراءات الكنترول",
            loading: "جاري تحميل بيانات الموظفين...", empty: "لا يوجد موظفين مطابقين.",
            stPending: "⏳ بانتظار التفعيل", stNoAcc: "بدون حساب", stOnline: "أونلاين", stOffline: "اوفلاين",
            accFixed: "ثابت", accComm: "نسبة", noSalary: "بدون راتب محدد", btnCtrl: "⚙️ كنترول وتعديل",
            
            // Modals
            mInvTitle: "🔑 دعوة مستخدم للنظام", lInvName: "اسم الموظف *", lInvRole: "الوظيفة *", lInvBranch: "الفرع التابع له *", btnGen: "توليد كود الدعوة",
            mOthTitle: "🧹 إضافة عمالة (للمرتبات فقط)", lOthName: "الاسم *", lOthBranch: "الفرع *", lOthSal: "الراتب الثابت", btnSaveOth: "حفظ الموظف",
            
            // Control
            c1: "🏢 التعيين والفرع", cBranch: "الفرع المخصص", cRole: "الوظيفة",
            c2: "💰 المحاسبة", cSal: "الراتب الثابت", cCom: "نسبة العمولة (%)",
            c3: "🔐 صلاحيات الأقسام (إظهار / إخفاء بالهوم)",
            p1: "👥 المرضى والجلسات", p2: "📅 المواعيد والتقويم", p3: "💉 الخدمات والأسعار", p4: "🤝 التعاقدات والخصومات", p5: "🧾 الفواتير (Invoices)", p6: "💰 الحسابات والماليات", p7: "📦 المخزون الطبي", p8: "📈 التقارير والإحصائيات", p9: "🏢 إدارة الفروع", p10: "👨‍ Staff (الموظفين)", p11: "🔔 الإشعارات", p12: "⚙️ الإعدادات العامة",
            btnSaveCtrl: "💾 حفظ الإعدادات والصلاحيات", btnDelEmp: "🗑️ حذف الموظف نهائياً",
            confDel: "هل أنت متأكد من حذف هذا الموظف نهائياً من كل سجلات النظام؟", msgDelDone: "تم فرمتة ومحو الموظف من النظام بنجاح!", errDel: "حدث خطأ أثناء الحذف"
        },
        en: {
            title: "Staff & Permissions (HR)", sub: "Manage team, branches, access levels, and payroll",
            btnInvite: "Invite System User", btnOther: "Add Staff (No Login)",
            kpiTeam: "Total Team", kpiOnline: "Online Now", kpiSalary: "Total Salaries",
            searchPlh: "Search by name, phone, or email...",
            optAllRoles: "All Roles", rAdm: "System Admin", rDoc: "Doctor", rRec: "Receptionist", rNur: "Nurse / Assistant", rOth: "Other Staff",
            optAllBranches: "All Branches", optMain: "Main Branch",
            thName: "Name & Details", thRole: "Role & Branch", thAcc: "Payroll System", thStatus: "Status", thAction: "Control Actions",
            loading: "Loading staff data...", empty: "No staff matched your search.",
            stPending: "⏳ Pending Activation", stNoAcc: "No Account", stOnline: "Online", stOffline: "Offline",
            accFixed: "Fixed", accComm: "Comm.", noSalary: "No defined salary", btnCtrl: "⚙️ Control & Edit",
            
            // Modals
            mInvTitle: "🔑 Invite System User", lInvName: "Employee Name *", lInvRole: "Role *", lInvBranch: "Assigned Branch *", btnGen: "Generate Invite Code",
            mOthTitle: "🧹 Add Staff (Payroll Only)", lOthName: "Name *", lOthBranch: "Branch *", lOthSal: "Fixed Salary", btnSaveOth: "Save Staff",
            
            // Control
            c1: "🏢 Assignment & Branch", cBranch: "Assigned Branch", cRole: "Role",
            c2: "💰 Payroll & Commission", cSal: "Fixed Salary", cCom: "Commission Rate (%)",
            c3: "🔐 Module Permissions (Show/Hide in Home)",
            p1: "👥 Patients & Sessions", p2: "📅 Appointments Calendar", p3: "💉 Services & Prices", p4: "🤝 Contracts & Discounts", p5: "🧾 Invoices", p6: "💰 Finances & Accounting", p7: "📦 Medical Inventory", p8: "📈 Analytical Reports", p9: "🏢 Branches Management", p10: "👨‍ HR & Staff", p11: "🔔 Notifications", p12: "⚙️ General Settings",
            btnSaveCtrl: "💾 Save Settings & Permissions", btnDelEmp: "🗑️ Delete Employee Permanently",
            confDel: "Are you sure you want to permanently delete this employee from all system records?", msgDelDone: "Employee permanently wiped from the system!", errDel: "Error occurred during deletion"
        }
    };
    hrLang = translations[lang] || translations.ar;
    const set = (id, txt) => { const el = document.getElementById(id); if(el) el.innerText = txt; };
    const setPlh = (id, txt) => { const el = document.getElementById(id); if(el) el.placeholder = txt; };

    set('page_title', `${hrLang.title} | NivaDent`);
    set('txt-title', hrLang.title); set('txt-subtitle', hrLang.sub);
    set('btn-invite-txt', hrLang.btnInvite); set('btn-other-txt', hrLang.btnOther);
    set('kpi-team', hrLang.kpiTeam); set('kpi-online', hrLang.kpiOnline); set('kpi-salary', hrLang.kpiSalary);
    
    setPlh('search_emp', hrLang.searchPlh);
    set('opt-all-roles', hrLang.optAllRoles); set('opt-admin', hrLang.rAdm); set('opt-doc', hrLang.rDoc); set('opt-rec', hrLang.rRec); set('opt-nur', hrLang.rNur); set('opt-oth', hrLang.rOth);
    if(document.getElementById('opt-all-branches')) set('opt-all-branches', hrLang.optAllBranches);
    if(document.getElementById('m-main')) set('m-main', hrLang.optMain);
    
    set('th-name', hrLang.thName); set('th-role', hrLang.thRole); set('th-acc', hrLang.thAcc); set('th-status', hrLang.thStatus); set('th-action', hrLang.thAction);
    set('txt-loading', hrLang.loading);

    // Modals
    set('m-inv-title', hrLang.mInvTitle); set('lbl-inv-name', hrLang.lInvName); set('lbl-inv-role', hrLang.lInvRole); set('lbl-inv-branch', hrLang.lInvBranch);
    set('m-doc', hrLang.rDoc); set('m-rec', hrLang.rRec); set('m-nur', hrLang.rNur); set('m-adm', hrLang.rAdm); set('btn-invite', hrLang.btnGen);
    
    set('m-oth-title', hrLang.mOthTitle); set('lbl-oth-name', hrLang.lOthName); set('lbl-oth-branch', hrLang.lOthBranch); set('lbl-oth-sal', hrLang.lOthSal); set('btn-save-oth', hrLang.btnSaveOth);

    // Control
    set('ctrl-h1', hrLang.c1); set('lbl-ctrl-branch', hrLang.cBranch); set('lbl-ctrl-role', hrLang.cRole);
    set('c-adm', hrLang.rAdm); set('c-doc', hrLang.rDoc); set('c-rec', hrLang.rRec); set('c-nur', hrLang.rNur); set('c-oth', hrLang.rOth);
    set('ctrl-h2', hrLang.c2); set('lbl-ctrl-sal', hrLang.cSal); set('lbl-ctrl-com', hrLang.cCom);
    set('ctrl-h3', hrLang.c3);
    set('p1', hrLang.p1); set('p2', hrLang.p2); set('p3', hrLang.p3); set('p4', hrLang.p4); set('p5', hrLang.p5); set('p6', hrLang.p6); set('p7', hrLang.p7); set('p8', hrLang.p8); set('p9', hrLang.p9); set('p10', hrLang.p10); set('p11', hrLang.p11); set('p12', hrLang.p12);
    set('btn-save-ctrl', hrLang.btnSaveCtrl); set('btn-del-emp', hrLang.btnDelEmp);
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) { if (e.target === this) this.style.display = 'none'; });
    });
});

window.onload = () => {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.body.dir = lang === 'en' ? 'ltr' : 'rtl';
    document.body.setAttribute('data-theme', localStorage.getItem('niva_theme') || 'light');
    
    updateLanguage(lang);
    
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            if (!currentClinicId) {
                document.getElementById('employeesBody').innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">الرجاء تسجيل الدخول</td></tr>`;
                return;
            }
            await loadBranches();
            startSyncingHR();
        } else {
            console.log("No user found, please log in.");
        }
    });
};

async function loadBranches() {
    try {
        const snap = await db.collection("Branches").where("clinicId", "==", currentClinicId).get();
        clinicBranches = [{ id: 'main', name: hrLang.optMain || 'الفرع الرئيسي' }];
        snap.forEach(doc => clinicBranches.push({ id: doc.id, name: doc.data().name }));
        
        populateBranchDropdown('filter_branch', true);
        populateBranchDropdown('inv_branch', false);
        populateBranchDropdown('oth_branch', false);
        populateBranchDropdown('ctrl_branch', false);
    } catch(e) { console.error("Error loading branches", e); }
}

function populateBranchDropdown(elementId, isFilter) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.innerHTML = isFilter ? `<option value="all">${hrLang.optAllBranches || 'كل الفروع'}</option>` : '';
    clinicBranches.forEach(b => {
        el.innerHTML += `<option value="${b.id}">${b.name}</option>`;
    });
}

function startSyncingHR() {
    if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري مزامنة بيانات الموظفين..." : "Syncing staff data...");

    let usersData = {};
    let invitesData = {};
    let payrollData = {};

    const compileAndRender = () => {
        allStaff = [];
        let totalSalaries = 0;
        let onlineCount = 0;

        Object.values(usersData).forEach(u => {
            const payroll = payrollData[u.email] || {};
            const finalStaff = {
                id: u.email, type: 'user', name: u.name, email: u.email, phone: payroll.phone || '',
                role: u.role, branchId: u.branchId || 'main',
                isOnline: u.isOnline, lastLogin: u.lastLogin,
                salary: payroll.salary || 0, commission: payroll.commission || 0,
                permissions: u.permissions || getDefaultPermissions(u.role)
            };
            allStaff.push(finalStaff);
            if(u.isOnline) onlineCount++;
            totalSalaries += Number(finalStaff.salary);
            payroll.processed = true;
        });

        Object.keys(invitesData).forEach(inviteCode => {
            const inv = invitesData[inviteCode];
            if (!inv.activated) {
                allStaff.push({
                    id: inviteCode, type: 'pending', name: inv.name, email: `Code: ${inviteCode}`,
                    role: inv.role, branchId: inv.branchId || 'main',
                    isOnline: false, lastLogin: null,
                    salary: 0, commission: 0, permissions: getDefaultPermissions(inv.role)
                });
            }
        });

        Object.keys(payrollData).forEach(pId => {
            const p = payrollData[pId];
            if (!p.processed && p.role === 'other') {
                allStaff.push({
                    id: pId, type: 'other', name: p.name, email: '---', phone: p.phone || '',
                    role: 'other', branchId: p.branchId || 'main',
                    isOnline: false, lastLogin: null,
                    salary: p.salary || 0, commission: 0, permissions: getDefaultPermissions('other')
                });
                totalSalaries += Number(p.salary || 0);
            }
        });

        document.getElementById('stat-total-emps').innerText = allStaff.length;
        document.getElementById('stat-active-emps').innerText = onlineCount;
        document.getElementById('stat-total-salaries').innerText = totalSalaries.toLocaleString();

        searchEmployees();
        if (window.hideLoader) window.hideLoader();
    };

    usersUnsubscribe = db.collection("Users").where("clinicId", "==", currentClinicId).onSnapshot(snap => {
        usersData = {};
        snap.forEach(doc => usersData[doc.id] = doc.data());
        compileAndRender();
    });

    invitesUnsubscribe = db.collection("InviteCodes").where("clinicId", "==", currentClinicId).onSnapshot(snap => {
        invitesData = {};
        snap.forEach(doc => invitesData[doc.id] = doc.data());
        compileAndRender();
    });

    employeesUnsubscribe = db.collection("Employees").where("clinicId", "==", currentClinicId).onSnapshot(snap => {
        payrollData = {};
        snap.forEach(doc => payrollData[doc.id] = doc.data());
        compileAndRender();
    });
}

function getDefaultPermissions(role) {
    const allOn = { patients: true, calendar: true, finances: true, invoices: true, inventory: true, reports: true, settings: true, services: true, contracts: true, branches: true, hr: true, notifications: true };
    if (role === 'admin' || role === 'superadmin') return allOn;
    if (role === 'doctor') return { ...allOn, finances: false, invoices: false, reports: false, settings: false, hr: false, branches: false };
    if (role === 'receptionist') return { ...allOn, finances: false, reports: false, settings: false, hr: false, branches: false, inventory: false };
    return { patients: false, calendar: false, finances: false, invoices: false, inventory: false, reports: false, settings: false, services: false, contracts: false, branches: false, hr: false, notifications: false };
}

function searchEmployees() {
    const searchText = document.getElementById('search_emp').value.trim().toLowerCase();
    const roleFilter = document.getElementById('filter_role').value;
    const branchFilter = document.getElementById('filter_branch').value;
    
    let filtered = allStaff;

    if (searchText) {
        filtered = filtered.filter(e => 
            (e.name && e.name.toLowerCase().includes(searchText)) ||
            (e.email && e.email.toLowerCase().includes(searchText)) ||
            (e.phone && e.phone.includes(searchText)) ||
            (e.id && e.id.toLowerCase().includes(searchText))
        );
    }

    if (roleFilter !== 'all') filtered = filtered.filter(e => e.role === roleFilter);
    if (branchFilter !== 'all') filtered = filtered.filter(e => e.branchId === branchFilter);

    renderEmployeesTable(filtered);
}

function renderEmployeesTable(dataArray) {
    const tbody = document.getElementById('employeesBody');
    tbody.innerHTML = '';

    if (dataArray.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #64748b; padding:20px;">${hrLang.empty}</td></tr>`;
        return;
    }

    dataArray.forEach(emp => {
        let roleBadge = ''; let roleName = '';
        if (emp.role === 'admin') { roleBadge = 'role-admin'; roleName = hrLang.rAdm; }
        else if (emp.role === 'doctor') { roleBadge = 'role-doctor'; roleName = hrLang.rDoc; }
        else if (emp.role === 'receptionist') { roleBadge = 'role-reception'; roleName = hrLang.rRec; }
        else if (emp.role === 'nurse') { roleBadge = 'role-nurse'; roleName = hrLang.rNur; }
        else { roleBadge = 'role-other'; roleName = hrLang.rOth; }

        const branchName = (clinicBranches.find(b => b.id === emp.branchId) || {}).name || '---';

        let statusHtml = '';
        if (emp.type === 'pending') {
            statusHtml = `<span class="status-pending">${hrLang.stPending}</span>`;
        } else if (emp.type === 'other') {
            statusHtml = `<span class="status-offline">${hrLang.stNoAcc}</span>`;
        } else {
            if (emp.isOnline) statusHtml = `<span class="status-online">${hrLang.stOnline}</span>`;
            else {
                let lastSeen = '---';
                if (emp.lastLogin) {
                    try {
                        const d = typeof emp.lastLogin.toDate === 'function' ? emp.lastLogin.toDate() : new Date(emp.lastLogin);
                        lastSeen = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`;
                    } catch(e){}
                }
                statusHtml = `<span class="status-offline" dir="ltr">${hrLang.stOffline}: ${lastSeen}</span>`;
            }
        }

        let accSystem = [];
        if(Number(emp.salary) > 0) accSystem.push(`${hrLang.accFixed}: <strong>${emp.salary}</strong>`);
        if(Number(emp.commission) > 0) accSystem.push(`${hrLang.accComm}: <strong style="color:#0ea5e9;">${emp.commission}%</strong>`);
        const accTxt = accSystem.length > 0 ? accSystem.join(' | ') : `<span style="color:#94a3b8;">${hrLang.noSalary}</span>`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <strong style="color: #0f172a; font-size: 15px;">${emp.name}</strong><br>
                <small style="color: #64748b; font-family: monospace;">${emp.email}</small>
            </td>
            <td>
                <span class="role-badge ${roleBadge}" style="margin-bottom:4px;">${roleName}</span><br>
                <small style="color: #475569;">📍 ${branchName}</small>
            </td>
            <td style="font-size: 13px;">${accTxt}</td>
            <td style="text-align: center;">${statusHtml}</td>
            <td style="text-align: center;">
                <button class="btn-action" style="background:#f1f5f9; color:#0f172a; border-color:#cbd5e1; font-weight:bold;" onclick="openGrandControl('${emp.id}')">${hrLang.btnCtrl}</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openInviteModal() {
    document.getElementById('inv_name').value = '';
    document.getElementById('inv_role').value = 'doctor';
    document.getElementById('inv_branch').value = 'main';
    openModal('inviteModal');
}

async function generateInviteCode(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-invite');
    btn.disabled = true; btn.innerText = "...";

    try {
        const inviteCode = Math.floor(10000 + Math.random() * 90000).toString();
        await db.collection("InviteCodes").doc(inviteCode).set({
            name: document.getElementById('inv_name').value.trim(),
            role: document.getElementById('inv_role').value,
            clinicId: currentClinicId,
            branchId: document.getElementById('inv_branch').value,
            activated: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert(`✅ ${document.body.dir==='rtl'?'تم توليد كود الدعوة بنجاح!':'Invite code generated successfully!'}\nCode: ${inviteCode}`);
        closeModal('inviteModal');
    } catch(err) { console.error(err); }
    finally { btn.disabled = false; btn.innerText = hrLang.btnGen; }
}

function openOtherEmpModal() {
    document.getElementById('oth_id').value = '';
    document.getElementById('oth_name').value = '';
    document.getElementById('oth_branch').value = 'main';
    document.getElementById('oth_salary').value = '0';
    openModal('otherEmpModal');
}

async function saveOtherEmployee(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-oth');
    btn.disabled = true; btn.innerText = "...";

    const id = document.getElementById('oth_id').value;
    const data = {
        clinicId: currentClinicId,
        role: 'other',
        name: document.getElementById('oth_name').value.trim(),
        branchId: document.getElementById('oth_branch').value,
        salary: Number(document.getElementById('oth_salary').value) || 0,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        if(id) await db.collection("Employees").doc(id).update(data);
        else {
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection("Employees").add(data);
        }
        closeModal('otherEmpModal');
    } catch(err) { console.error(err); }
    finally { btn.disabled = false; btn.innerText = hrLang.btnSaveOth; }
}

function openGrandControl(id) {
    const emp = allStaff.find(s => s.id === id);
    if (!emp) return;

    document.getElementById('ctrl_id').value = emp.id;
    document.getElementById('ctrl_type').value = emp.type;
    
    document.getElementById('ctrl_name').innerText = emp.name;
    
    let statusBadge = '';
    if(emp.type === 'pending') statusBadge = `<span style="color:#fbbf24; font-size:13px;">${hrLang.stPending}</span>`;
    else if(emp.type === 'other') statusBadge = `<span style="color:#94a3b8; font-size:13px;">${hrLang.stNoAcc}</span>`;
    else if(emp.isOnline) statusBadge = `<span style="color:#34d399; font-size:13px;">${hrLang.stOnline}</span>`;
    else statusBadge = `<span style="color:#94a3b8; font-size:13px;">${hrLang.stOffline}</span>`;
    document.getElementById('ctrl_status_badge').innerHTML = statusBadge;

    document.getElementById('ctrl_branch').value = emp.branchId;
    document.getElementById('ctrl_role').value = emp.role;
    
    document.getElementById('ctrl_salary').value = emp.salary;
    document.getElementById('ctrl_commission').value = emp.commission;

    const boxPerm = document.getElementById('box_permissions');
    const boxComm = document.getElementById('box_commission');
    
    if (emp.type === 'other') {
        boxPerm.style.display = 'none';
        boxComm.style.display = 'none';
    } else {
        boxPerm.style.display = 'block';
        boxComm.style.display = 'block';
        
        const p = emp.permissions || getDefaultPermissions(emp.role);
        document.getElementById('perm_patients').checked = !!p.patients;
        document.getElementById('perm_calendar').checked = !!p.calendar;
        document.getElementById('perm_services').checked = !!p.services;
        document.getElementById('perm_contracts').checked = !!p.contracts;
        document.getElementById('perm_invoices').checked = !!p.invoices;
        document.getElementById('perm_finances').checked = !!p.finances;
        document.getElementById('perm_inventory').checked = !!p.inventory;
        document.getElementById('perm_reports').checked = !!p.reports;
        document.getElementById('perm_branches').checked = !!p.branches;
        document.getElementById('perm_hr').checked = !!p.hr;
        document.getElementById('perm_notifications').checked = !!p.notifications;
        document.getElementById('perm_settings').checked = !!p.settings;
    }

    openModal('grandControlModal');
}

async function saveGrandControl(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-ctrl');
    btn.disabled = true; btn.innerText = "...";

    const id = document.getElementById('ctrl_id').value;
    const type = document.getElementById('ctrl_type').value;
    const branchId = document.getElementById('ctrl_branch').value;
    const salary = Number(document.getElementById('ctrl_salary').value) || 0;
    const commission = Number(document.getElementById('ctrl_commission').value) || 0;

    try {
        if (type === 'other') {
            await db.collection("Employees").doc(id).update({ branchId, salary, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        } 
        else if (type === 'pending') {
            await db.collection("InviteCodes").doc(id).update({ branchId });
            await db.collection("Employees").doc(`pending_${id}`).set({
                clinicId: currentClinicId, salary, commission, updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, {merge: true});
        }
        else if (type === 'user') {
            const permissions = {
                patients: document.getElementById('perm_patients').checked,
                calendar: document.getElementById('perm_calendar').checked,
                services: document.getElementById('perm_services').checked,
                contracts: document.getElementById('perm_contracts').checked,
                invoices: document.getElementById('perm_invoices').checked,
                finances: document.getElementById('perm_finances').checked,
                inventory: document.getElementById('perm_inventory').checked,
                reports: document.getElementById('perm_reports').checked,
                branches: document.getElementById('perm_branches').checked,
                hr: document.getElementById('perm_hr').checked,
                notifications: document.getElementById('perm_notifications').checked,
                settings: document.getElementById('perm_settings').checked
            };

            await db.collection("Users").doc(id).update({ branchId, permissions });
            
            await db.collection("Employees").doc(id).set({
                clinicId: currentClinicId, salary, commission, updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, {merge: true});
        }
        
        closeModal('grandControlModal');
    } catch(err) { console.error(err); }
    finally { btn.disabled = false; btn.innerText = hrLang.btnSaveCtrl; }
}

async function deleteEmployeeComplete() {
    const id = document.getElementById('ctrl_id').value;
    const type = document.getElementById('ctrl_type').value;

    if (!confirm(hrLang.confDel)) return;

    if (window.showLoader) window.showLoader("...");
    try {
        if (type === 'other') {
            await db.collection("Employees").doc(id).delete();
        } else if (type === 'pending') {
            await db.collection("InviteCodes").doc(id).delete();
            await db.collection("Employees").doc(`pending_${id}`).delete().catch(e=>{});
        } else if (type === 'user') {
            await db.collection("Users").doc(id).delete();
            await db.collection("Employees").doc(id).delete().catch(e=>{});
        }
        closeModal('grandControlModal');
        alert(hrLang.msgDelDone);
    } catch (e) {
        console.error(e);
        alert(hrLang.errDel);
    } finally {
        if (window.hideLoader) window.hideLoader();
    }
}
