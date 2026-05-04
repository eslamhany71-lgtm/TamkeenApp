// js/hr.js - Unified HR & Access Control System
const db = firebase.firestore();
const currentClinicId = sessionStorage.getItem('clinicId');

let allStaff = []; // Array to hold unified data
let clinicBranches = [];

// Listeners
let usersUnsubscribe = null;
let invitesUnsubscribe = null;
let employeesUnsubscribe = null;

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) { if (e.target === this) this.style.display = 'none'; });
    });
});

window.onload = async () => {
    document.body.setAttribute('data-theme', localStorage.getItem('niva_theme') || 'light');
    if (!currentClinicId) {
        document.getElementById('employeesBody').innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">الرجاء تسجيل الدخول</td></tr>';
        return;
    }
    await loadBranches();
    startSyncingHR();
};

async function loadBranches() {
    try {
        const snap = await db.collection("Branches").where("clinicId", "==", currentClinicId).get();
        clinicBranches = [{ id: 'main', name: 'الفرع الرئيسي' }];
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
    el.innerHTML = isFilter ? '<option value="all">كل الفروع</option>' : '';
    clinicBranches.forEach(b => {
        el.innerHTML += `<option value="${b.id}">${b.name}</option>`;
    });
}

function startSyncingHR() {
    if (window.showLoader) window.showLoader("جاري مزامنة بيانات الموظفين...");

    let usersData = {};
    let invitesData = {};
    let payrollData = {};

    const compileAndRender = () => {
        allStaff = [];
        let totalSalaries = 0;
        let onlineCount = 0;

        // 1. ضخ المستخدمين الفعليين (Users)
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
            
            // عشان منكررش، هنعلم على ده إنه اتقرأ
            payroll.processed = true;
        });

        // 2. ضخ الدعوات المعلقة (Invites)
        Object.keys(invitesData).forEach(inviteCode => {
            const inv = invitesData[inviteCode];
            if (!inv.activated) {
                allStaff.push({
                    id: inviteCode, type: 'pending', name: inv.name, email: `كود: ${inviteCode}`,
                    role: inv.role, branchId: inv.branchId || 'main',
                    isOnline: false, lastLogin: null,
                    salary: 0, commission: 0, permissions: getDefaultPermissions(inv.role)
                });
            }
        });

        // 3. ضخ العمالة الأخرى من جدول المرتبات (التي لم يتم قراءتها كـ User)
        Object.keys(payrollData).forEach(pId => {
            const p = payrollData[pId];
            if (!p.processed && p.role === 'other') {
                allStaff.push({
                    id: pId, type: 'other', name: p.name, email: 'بدون إيميل', phone: p.phone || '',
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

    // الاستماع لجدول Users
    usersUnsubscribe = db.collection("Users").where("clinicId", "==", currentClinicId).onSnapshot(snap => {
        usersData = {};
        snap.forEach(doc => usersData[doc.id] = doc.data());
        compileAndRender();
    });

    // الاستماع لجدول InviteCodes
    invitesUnsubscribe = db.collection("InviteCodes").where("clinicId", "==", currentClinicId).onSnapshot(snap => {
        invitesData = {};
        snap.forEach(doc => invitesData[doc.id] = doc.data());
        compileAndRender();
    });

    // الاستماع لجدول Employees (الرواتب والعمالة)
    employeesUnsubscribe = db.collection("Employees").where("clinicId", "==", currentClinicId).onSnapshot(snap => {
        payrollData = {};
        snap.forEach(doc => payrollData[doc.id] = doc.data());
        compileAndRender();
    });
}

function getDefaultPermissions(role) {
    if (role === 'admin') return { patients: true, calendar: true, finances: true, inventory: true, reports: true, settings: true };
    if (role === 'doctor') return { patients: true, calendar: true, finances: false, inventory: true, reports: false, settings: false };
    if (role === 'receptionist') return { patients: true, calendar: true, finances: true, inventory: false, reports: false, settings: false };
    if (role === 'nurse') return { patients: true, calendar: true, finances: false, inventory: true, reports: false, settings: false };
    return { patients: false, calendar: false, finances: false, inventory: false, reports: false, settings: false }; // other
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
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #64748b; padding:20px;">لا يوجد موظفين مطابقين.</td></tr>';
        return;
    }

    dataArray.forEach(emp => {
        let roleBadge = ''; let roleName = '';
        if (emp.role === 'admin') { roleBadge = 'role-admin'; roleName = 'مدير نظام'; }
        else if (emp.role === 'doctor') { roleBadge = 'role-doctor'; roleName = 'طبيب'; }
        else if (emp.role === 'receptionist') { roleBadge = 'role-reception'; roleName = 'استقبال'; }
        else if (emp.role === 'nurse') { roleBadge = 'role-nurse'; roleName = 'مساعد / ممرض'; }
        else { roleBadge = 'role-other'; roleName = 'عمالة أخرى'; }

        const branchName = (clinicBranches.find(b => b.id === emp.branchId) || {}).name || 'غير محدد';

        let statusHtml = '';
        if (emp.type === 'pending') {
            statusHtml = `<span class="status-pending">⏳ بانتظار التفعيل</span>`;
        } else if (emp.type === 'other') {
            statusHtml = `<span class="status-offline">بدون حساب</span>`;
        } else {
            if (emp.isOnline) statusHtml = `<span class="status-online">أونلاين</span>`;
            else {
                let lastSeen = '---';
                if (emp.lastLogin) {
                    try {
                        const d = typeof emp.lastLogin.toDate === 'function' ? emp.lastLogin.toDate() : new Date(emp.lastLogin);
                        lastSeen = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`;
                    } catch(e){}
                }
                statusHtml = `<span class="status-offline" dir="ltr">اوفلاين: ${lastSeen}</span>`;
            }
        }

        let accSystem = [];
        if(Number(emp.salary) > 0) accSystem.push(`ثابت: <strong>${emp.salary}</strong>`);
        if(Number(emp.commission) > 0) accSystem.push(`نسبة: <strong style="color:#0ea5e9;">${emp.commission}%</strong>`);
        const accTxt = accSystem.length > 0 ? accSystem.join(' | ') : '<span style="color:#94a3b8;">بدون راتب محدد</span>';

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
                <button class="btn-action" style="background:#f1f5f9; color:#0f172a; border-color:#cbd5e1; font-weight:bold;" onclick="openGrandControl('${emp.id}')">⚙️ كنترول وتعديل</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// =====================================
// دوال توليد الدعوة والعمالة المباشرة
// =====================================
function openInviteModal() {
    document.getElementById('inv_name').value = '';
    document.getElementById('inv_role').value = 'doctor';
    document.getElementById('inv_branch').value = 'main';
    openModal('inviteModal');
}

async function generateInviteCode(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-invite');
    btn.disabled = true; btn.innerText = "جاري التوليد...";

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

        alert(`✅ تم توليد كود الدعوة بنجاح!\nالكود: ${inviteCode}\nأعطِ هذا الكود للموظف ليسجل به الدخول.`);
        closeModal('inviteModal');
    } catch(err) { console.error(err); alert("حدث خطأ"); }
    finally { btn.disabled = false; btn.innerText = "توليد كود الدعوة"; }
}

function openOtherEmpModal() {
    document.getElementById('oth_id').value = '';
    document.getElementById('oth_name').value = '';
    document.getElementById('oth_phone').value = '';
    document.getElementById('oth_branch').value = 'main';
    document.getElementById('oth_salary').value = '0';
    openModal('otherEmpModal');
}

async function saveOtherEmployee(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-oth');
    btn.disabled = true; btn.innerText = "جاري الحفظ...";

    const id = document.getElementById('oth_id').value;
    const data = {
        clinicId: currentClinicId,
        role: 'other',
        name: document.getElementById('oth_name').value.trim(),
        phone: document.getElementById('oth_phone').value.trim(),
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
    } catch(err) { console.error(err); alert("حدث خطأ"); }
    finally { btn.disabled = false; btn.innerText = "حفظ الموظف"; }
}

// =====================================
// المودال الشامل (Grand Control)
// =====================================
function openGrandControl(id) {
    const emp = allStaff.find(s => s.id === id);
    if (!emp) return;

    document.getElementById('ctrl_id').value = emp.id;
    document.getElementById('ctrl_type').value = emp.type;
    
    document.getElementById('ctrl_name').innerText = emp.name;
    
    let statusBadge = '';
    if(emp.type === 'pending') statusBadge = '<span style="color:#fbbf24; font-size:13px;">⏳ كود دعوة لم يفعل</span>';
    else if(emp.type === 'other') statusBadge = '<span style="color:#94a3b8; font-size:13px;">🧹 عمالة فقط</span>';
    else if(emp.isOnline) statusBadge = '<span style="color:#34d399; font-size:13px;">🟢 متصل الآن</span>';
    else statusBadge = '<span style="color:#94a3b8; font-size:13px;">💤 أوفلاين</span>';
    document.getElementById('ctrl_status_badge').innerHTML = statusBadge;

    document.getElementById('ctrl_branch').value = emp.branchId;
    document.getElementById('ctrl_role').value = emp.role;
    
    document.getElementById('ctrl_salary').value = emp.salary;
    document.getElementById('ctrl_commission').value = emp.commission;

    // إخفاء النسب والـ Permissions للعمالة
    const boxPerm = document.getElementById('box_permissions');
    const boxComm = document.getElementById('box_commission');
    
    if (emp.type === 'other') {
        boxPerm.style.display = 'none';
        boxComm.style.display = 'none';
    } else {
        boxPerm.style.display = 'block';
        boxComm.style.display = 'block';
        
        // ضبط التوجلز بناءً على الصلاحيات
        const p = emp.permissions || getDefaultPermissions(emp.role);
        document.getElementById('perm_patients').checked = !!p.patients;
        document.getElementById('perm_calendar').checked = !!p.calendar;
        document.getElementById('perm_finances').checked = !!p.finances;
        document.getElementById('perm_inventory').checked = !!p.inventory;
        document.getElementById('perm_reports').checked = !!p.reports;
        document.getElementById('perm_settings').checked = !!p.settings;
    }

    openModal('grandControlModal');
}

async function saveGrandControl(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-ctrl');
    btn.disabled = true; btn.innerText = "جاري الحفظ...";

    const id = document.getElementById('ctrl_id').value;
    const type = document.getElementById('ctrl_type').value;
    const branchId = document.getElementById('ctrl_branch').value;
    const salary = Number(document.getElementById('ctrl_salary').value) || 0;
    const commission = Number(document.getElementById('ctrl_commission').value) || 0;

    try {
        if (type === 'other') {
            // تحديث العمالة المباشرة
            await db.collection("Employees").doc(id).update({ branchId, salary, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        } 
        else if (type === 'pending') {
            // تحديث كود الدعوة (لفرع آخر مثلاً)
            await db.collection("InviteCodes").doc(id).update({ branchId });
            // تحديث المرتبات لو ضاف ليه فلوس وهو لسه مدخلش
            await db.collection("Employees").doc(`pending_${id}`).set({
                clinicId: currentClinicId, salary, commission, updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, {merge: true});
        }
        else if (type === 'user') {
            // تجميع الصلاحيات
            const permissions = {
                patients: document.getElementById('perm_patients').checked,
                calendar: document.getElementById('perm_calendar').checked,
                finances: document.getElementById('perm_finances').checked,
                inventory: document.getElementById('perm_inventory').checked,
                reports: document.getElementById('perm_reports').checked,
                settings: document.getElementById('perm_settings').checked
            };

            // تحديث الصلاحيات والفرع في جدول Users
            await db.collection("Users").doc(id).update({ branchId, permissions });
            
            // تحديث المرتبات في جدول Employees (بنربطه بالإيميل)
            await db.collection("Employees").doc(id).set({
                clinicId: currentClinicId, salary, commission, updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, {merge: true});
        }
        
        closeModal('grandControlModal');
    } catch(err) { console.error(err); alert("حدث خطأ أثناء الحفظ"); }
    finally { btn.disabled = false; btn.innerText = "💾 حفظ إعدادات الموظف"; }
}
