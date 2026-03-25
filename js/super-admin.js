const db = firebase.firestore();

// 1. التأكد من الصلاحيات (حماية الشاشة)
firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
        const userDoc = await db.collection("Users").doc(user.email).get();
        if (userDoc.exists && userDoc.data().role === 'superadmin') {
            loadClinics();
            loadGlobalStats();
        } else {
            // طرده لو مش سوبر أدمن
            document.body.innerHTML = "<h2 style='text-align:center; color:red; margin-top:50px;'>عفواً، ليس لديك صلاحية للدخول لهذه الشاشة.</h2>";
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

// 2. إنشاء عيادة جديدة (The Magic)
async function saveNewClinic(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save');
    btn.disabled = true; btn.innerText = "جاري الإنشاء...";

    const clinicName = document.getElementById('clinic_name').value.trim();
    const adminEmail = document.getElementById('clinic_admin_email').value.trim().toLowerCase();
    const plan = document.getElementById('clinic_plan').value;

    try {
        // أ. إنشاء ملف العيادة في الكولكشن الأساسي
        const clinicRef = await db.collection("Clinics").add({
            clinicName: clinicName,
            status: plan,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            logoUrl: "" // يقدر الدكتور يرفعه بعدين من الإعدادات
        });

        const newClinicId = clinicRef.id;

        // ب. ربط إيميل الدكتور بالعيادة الجديدة في كولكشن المستخدمين
        await db.collection("Users").doc(adminEmail).set({
            clinicId: newClinicId,
            role: "admin",
            email: adminEmail
        });

        alert(`تم إنشاء العيادة بنجاح!\n\nمعرف العيادة: ${newClinicId}\nإيميل الأدمن: ${adminEmail}\n\nيرجى التأكد من تسجيل هذا الإيميل بكلمة مرور في شاشة الدخول.`);
        closeClinicModal();
    } catch (error) {
        console.error("Error creating clinic:", error);
        alert("حدث خطأ أثناء الإنشاء!");
    } finally {
        btn.disabled = false; btn.innerText = "إنشاء العيادة وتوليد المعرف";
    }
}

// 3. عرض العيادات
function loadClinics() {
    db.collection("Clinics").orderBy("createdAt", "desc").onSnapshot(async (snap) => {
        const tbody = document.getElementById('clinicsBody');
        tbody.innerHTML = '';
        
        document.getElementById('stat-clinics').innerText = snap.size;

        if (snap.empty) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center;">لا توجد عيادات مسجلة حالياً.</td></tr>`;
            return;
        }

        for (const doc of snap.docs) {
            const c = doc.data();
            const dateStr = c.createdAt ? c.createdAt.toDate().toLocaleDateString('ar-EG') : 'الآن';
            
            // جلب إيميل الأدمن المربوط بالعيادة دي
            let adminEmail = "---";
            const usersSnap = await db.collection("Users").where("clinicId", "==", doc.id).where("role", "==", "admin").get();
            if (!usersSnap.empty) { adminEmail = usersSnap.docs[0].id; } // لأن الـ ID هو الإيميل

            let statusHtml = '';
            if(c.status === 'active') statusHtml = '<span class="status-badge status-active">نشط</span>';
            else if(c.status === 'trial') statusHtml = '<span class="status-badge status-trial">تجريبي</span>';
            else statusHtml = '<span class="status-badge status-suspended">موقوف</span>';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${dateStr}</td>
                <td style="font-weight:bold;">${c.clinicName}</td>
                <td dir="ltr" style="text-align:start;">${adminEmail}</td>
                <td>${statusHtml}</td>
                <td style="text-align: center;">
                    <button class="btn-warning" onclick="toggleStatus('${doc.id}', '${c.status}')">تغيير الحالة</button>
                    <button class="btn-danger" onclick="deleteClinic('${doc.id}', '${adminEmail}')">🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);
        }
    });
}

// 4. إيقاف / تفعيل عيادة
async function toggleStatus(clinicId, currentStatus) {
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    if(confirm(`هل تريد تغيير حالة العيادة إلى ${newStatus === 'active' ? 'نشط' : 'موقوف'}؟`)) {
        await db.collection("Clinics").doc(clinicId).update({ status: newStatus });
    }
}

// 5. حذف العيادة (احذر!)
async function deleteClinic(clinicId, adminEmail) {
    const code = prompt("تحذير: هذا سيحذف العيادة! اكتب '1234' للتأكيد:");
    if (code === '1234') {
        // حذف العيادة
        await db.collection("Clinics").doc(clinicId).delete();
        // حذف صلاحية الأدمن
        if(adminEmail !== "---") {
            await db.collection("Users").doc(adminEmail).delete();
        }
        alert("تم مسح العيادة وصلاحية دخول الأدمن.");
    }
}

// إحصائية سريعة لعدد المرضى في السيرفر كله
function loadGlobalStats() {
    db.collection("Patients").get().then(snap => {
        document.getElementById('stat-all-patients').innerText = snap.size;
    });
}

function filterClinics() {
    const input = document.getElementById('searchInput').value.toLowerCase();
    const rows = document.getElementById('clinicsBody').getElementsByTagName('tr');
    for (let i = 0; i < rows.length; i++) {
        const nameCol = rows[i].getElementsByTagName('td')[1];
        if (nameCol) {
            const textToSearch = nameCol.textContent.toLowerCase();
            if (textToSearch.indexOf(input) > -1) rows[i].style.display = "";
            else rows[i].style.display = "none";
        }
    }
}

// حل اللمس للمودال
['click', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    }, {passive: true});
});
