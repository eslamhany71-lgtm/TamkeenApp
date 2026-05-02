// js/hr.js
const db = firebase.firestore();
const clinicId = sessionStorage.getItem('clinicId');

let allEmployees = [];

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) { if (e.target === this) this.style.display = 'none'; });
    });
});

async function loadEmployees() {
    if (!clinicId) return;

    const tbody = document.getElementById('employeesBody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">جاري تحميل البيانات...</td></tr>';
    
    if (window.showLoader) window.showLoader("جاري السحب...");

    try {
        db.collection("Employees").where("clinicId", "==", clinicId).onSnapshot(snap => {
            allEmployees = [];
            let totalSalaries = 0;
            let activeCount = 0;

            snap.forEach(doc => {
                const emp = { id: doc.id, ...doc.data() };
                allEmployees.push(emp);
                
                if (emp.status === 'active') {
                    activeCount++;
                    totalSalaries += Number(emp.salary) || 0;
                }
            });

            document.getElementById('stat-total-emps').innerText = allEmployees.length;
            document.getElementById('stat-active-emps').innerText = activeCount;
            document.getElementById('stat-total-salaries').innerText = totalSalaries.toLocaleString() + ' ج.م';

            searchEmployees(); 
        });
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">خطأ في التحميل!</td></tr>';
    } finally {
        if (window.hideLoader) window.hideLoader();
    }
}

function searchEmployees() {
    const searchText = document.getElementById('search_emp').value.trim().toLowerCase();
    const roleFilter = document.getElementById('filter_role').value;
    
    let filtered = allEmployees;

    if (searchText) {
        filtered = filtered.filter(e => 
            (e.name && e.name.toLowerCase().includes(searchText)) ||
            (e.email && e.email.toLowerCase().includes(searchText)) ||
            (e.phone && e.phone.includes(searchText))
        );
    }

    if (roleFilter !== 'all') {
        filtered = filtered.filter(e => e.role === roleFilter);
    }

    renderEmployeesTable(filtered);
}

function renderEmployeesTable(dataArray) {
    const tbody = document.getElementById('employeesBody');
    tbody.innerHTML = '';

    if (dataArray.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #64748b;">لا يوجد موظفين مطابقين للبحث.</td></tr>';
        return;
    }

    dataArray.forEach(emp => {
        let roleBadge = '';
        let roleName = '';
        if (emp.role === 'admin') { roleBadge = 'role-admin'; roleName = 'مدير نظام'; }
        else if (emp.role === 'doctor') { roleBadge = 'role-doctor'; roleName = 'طبيب'; }
        else if (emp.role === 'receptionist') { roleBadge = 'role-reception'; roleName = 'استقبال'; }
        else if (emp.role === 'nurse') { roleBadge = 'role-nurse'; roleName = 'مساعد/ممرض'; }

        const statusHtml = emp.status === 'active' 
            ? '<span class="status-active">نشط ✅</span>' 
            : '<span class="status-inactive">موقوف ❌</span>';

        let accSystem = [];
        if(Number(emp.salary) > 0) accSystem.push('راتب ثابت');
        if(Number(emp.commission) > 0) accSystem.push('عمولة');
        const accTxt = accSystem.length > 0 ? accSystem.join(' + ') : 'بدون نظام مالي';

        let moneyTxt = '';
        if(Number(emp.salary) > 0) moneyTxt += `ثابت: <strong>${emp.salary}</strong><br>`;
        if(Number(emp.commission) > 0) moneyTxt += `نسبة: <strong style="color:#0ea5e9;">${emp.commission}%</strong>`;
        if(moneyTxt === '') moneyTxt = '---';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <strong style="color: #0f172a; font-size: 16px;">${emp.name}</strong><br>
                <small style="color: #64748b; font-family: monospace;">${emp.email}</small>
                ${emp.phone ? `<br><small style="color: #64748b;" dir="ltr">📞 ${emp.phone}</small>` : ''}
            </td>
            <td><span class="role-badge ${roleBadge}">${roleName}</span></td>
            <td style="color: #475569; font-weight: bold; font-size: 13px;">${accTxt}</td>
            <td style="line-height: 1.5;">${moneyTxt}</td>
            <td style="text-align: center;">${statusHtml}</td>
            <td style="text-align: center; white-space: nowrap;">
                <button class="btn-action" style="background:#fff7ed; color:#ea580c; border-color:#fed7aa;" onclick="openEditEmployee('${emp.id}')">✏️ تعديل</button>
                <button class="btn-action" style="background:#fee2e2; color:#ef4444; border-color:#fca5a5;" onclick="deleteEmployee('${emp.id}', '${emp.email}')">🗑️ حذف</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openEmployeeModal() {
    document.getElementById('emp_id').value = '';
    document.getElementById('emp_name').value = '';
    document.getElementById('emp_phone').value = '';
    document.getElementById('emp_email').value = '';
    document.getElementById('emp_email').disabled = false; 
    document.getElementById('emp_role').value = 'receptionist';
    document.getElementById('emp_status').value = 'active';
    document.getElementById('emp_salary').value = '0';
    document.getElementById('emp_commission').value = '0';
    
    document.getElementById('modal-title').innerText = 'تسجيل موظف جديد';
    openModal('employeeModal');
}

function openEditEmployee(docId) {
    const emp = allEmployees.find(e => e.id === docId);
    if (!emp) return;

    document.getElementById('emp_id').value = emp.id;
    document.getElementById('emp_name').value = emp.name;
    document.getElementById('emp_phone').value = emp.phone || '';
    document.getElementById('emp_email').value = emp.email;
    document.getElementById('emp_email').disabled = true; 
    document.getElementById('emp_role').value = emp.role;
    document.getElementById('emp_status').value = emp.status || 'active';
    document.getElementById('emp_salary').value = emp.salary || 0;
    document.getElementById('emp_commission').value = emp.commission || 0;
    
    document.getElementById('modal-title').innerText = 'تعديل بيانات الموظف';
    openModal('employeeModal');
}

async function saveEmployee(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save');
    btn.disabled = true; btn.innerText = "جاري الحفظ...";

    const empId = document.getElementById('emp_id').value;
    const emailInput = document.getElementById('emp_email').value.trim().toLowerCase();

    if (!empId) {
        const isDuplicate = allEmployees.some(e => e.email === emailInput);
        if (isDuplicate) {
            alert("❌ هذا البريد الإلكتروني مسجل لموظف آخر في العيادة!");
            btn.disabled = false; btn.innerText = "حفظ بيانات الموظف";
            return;
        }
    }

    const data = {
        clinicId: clinicId,
        name: document.getElementById('emp_name').value.trim(),
        phone: document.getElementById('emp_phone').value.trim(),
        email: emailInput,
        role: document.getElementById('emp_role').value,
        status: document.getElementById('emp_status').value,
        salary: Number(document.getElementById('emp_salary').value) || 0,
        commission: Number(document.getElementById('emp_commission').value) || 0,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        if (empId) {
            await db.collection("Employees").doc(empId).update(data);
        } else {
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection("Employees").add(data);
        }
        closeModal('employeeModal');
    } catch (error) {
        console.error("Error saving employee:", error);
        alert("حدث خطأ أثناء الحفظ!");
    } finally {
        btn.disabled = false; btn.innerText = "حفظ بيانات الموظف";
    }
}

async function deleteEmployee(docId, email) {
    if (confirm("هل أنت متأكد من حذف هذا الموظف نهائياً؟\nسيؤدي ذلك لمنعه من تسجيل الدخول للعيادة.")) {
        if (window.showLoader) window.showLoader("جاري الحذف...");
        try {
            await db.collection("Employees").doc(docId).delete();
        } catch (error) {
            console.error(error);
        } finally {
            if (window.hideLoader) window.hideLoader();
        }
    }
}

window.onload = () => {
    document.body.setAttribute('data-theme', localStorage.getItem('niva_theme') || 'light');
    firebase.auth().onAuthStateChanged((user) => {
        if (user) loadEmployees();
    });
};
