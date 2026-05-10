// js/calendar.js
const db = firebase.firestore();
let currentClinicId = sessionStorage.getItem('clinicId');
const userRole = sessionStorage.getItem('userRole'); 
const userBranch = sessionStorage.getItem('branchId') || 'main'; 

let calendar; 
let currentEditAppId = null; 
let calendarUnsubscribe = null; 

let allClinicPatients = [];
let allAppointmentsData = []; 
let allClinicDoctors = []; // 🔴 مصفوفة الأطباء 🔴

let erpServices = [];
let erpContracts = [];
let clinicSettings = { workStart: '08:00', workEnd: '22:00', offDay: 'none' };

async function loadBranchesForAdmin() {
    if (userRole !== 'admin' && userRole !== 'superadmin') return;
    try {
        const snap = await db.collection("Branches").where("clinicId", "==", currentClinicId).get();
        const filterSelect = document.getElementById('branch-filter');
        const modalSelect = document.getElementById('app_branch');
        if (!filterSelect || !modalSelect) return;

        let optionsHtml = `<option value="all" id="opt-all-branches">كل الفروع</option>`;
        optionsHtml += `<option value="main">الفرع الرئيسي</option>`;
        let modalOptionsHtml = `<option value="main">الفرع الرئيسي</option>`;

        snap.forEach(doc => {
            optionsHtml += `<option value="${doc.id}">${doc.data().name}</option>`;
            modalOptionsHtml += `<option value="${doc.id}">${doc.data().name}</option>`;
        });

        filterSelect.innerHTML = optionsHtml;
        modalSelect.innerHTML = modalOptionsHtml;
        filterSelect.style.display = 'block';
        filterSelect.value = userBranch;
        
        document.getElementById('admin-branch-group').style.display = 'block';

        const lang = localStorage.getItem('preferredLang') || 'ar';
        if (lang === 'en') {
            const allOpt = document.getElementById('opt-all-branches');
            if (allOpt) allOpt.innerText = "All Branches";
        }
    } catch (e) { console.error("Error loading branches:", e); }
}

function updatePageContent(lang) {
    const t = {
        ar: {
            title: "أجندة المواعيد", sub: "إدارة حجوزات العيادة وتنظيم وقت الطبيب", btnAdd: "حجز موعد جديد",
            btnAllApps: "سجل الحجوزات", modAllAppsTitle: "📋 سجل جميع الحجوزات", searchAllAppsPlh: "بحث بالاسم أو الموبايل...",
            mTitle: "حجز موعد جديد", mTitleEdit: "تعديل موعد", lName: "اسم المريض", lDate: "تاريخ الموعد", lTime: "الساعة", lType: "نوع الكشف / الجلسة",
            optNew: "كشف جديد", optFollow: "استشارة / متابعة", optSess: "جلسة علاجية", lNotes: "ملاحظات الحجز (اختياري)", btnSave: "تأكيد الحجز", btnUpdate: "تحديث الموعد",
            detTitle: "تفاصيل الحجز", lblDetName: "اسم المريض:", lblDetDate: "التاريخ:", lblDetTime: "الساعة:", lblDetType: "نوع الكشف:", lblDetNotes: "ملاحظات:", lblDetStatus: "الحالة:",
            btnEdit: "✏️ تعديل الحجز", btnDel: "🗑️ حذف الحجز نهائياً", confDel: "هل أنت متأكد من حذف هذا الموعد نهائياً؟", errSave: "حدث خطأ أثناء الحفظ!", msgDrag: "تم تغيير الموعد بنجاح!",
            lblSearch: "🔍 بحث عن مريض مسجل (اختياري)", searchPlh: "اكتب الاسم أو رقم الموبايل للبحث...", lblPhone: "رقم الموبايل", lblAge: "العمر (سنوات)", lblGender: "النوع", lblTotal: "الإجمالي", lblPaid: "المدفوع", lblRem: "المتبقي",
            lblHistoryTitle: "التاريخ الطبي وأمراض مزمنة (اختياري)", lblDetHistory: "📋 التاريخ الطبي:", lblDetFinance: "💰 الحساب (مدفوع / إجمالي):", lblDetPhone: "📱 الموبايل:",
            btnWaRem: "📱 إرسال تذكير بالموعد (واتساب)", btnCompleteApp: "✅ المريض حضر (اكتمال الحجز وتوريد الإيراد)", btnCancelApp: "🚫 إلغاء الحجز (بدون مسح)", btnRestoreApp: "🔄 إرجاع الحجز لقيد الانتظار",
            errOffDay: "عفواً، هذا اليوم هو يوم الإجازة الأسبوعي للعيادة!", errTimeBounds: "عفواً، الموعد المحدد خارج ساعات العمل الرسمية للعيادة!"
        },
        en: {
            title: "Appointments Calendar", sub: "Manage clinic bookings and organize doctor's time", btnAdd: "Book Appointment",
            btnAllApps: "Appointments Log", modAllAppsTitle: "📋 All Appointments Log", searchAllAppsPlh: "Search by name or phone...",
            mTitle: "Book New Appointment", mTitleEdit: "Edit Appointment", lName: "Patient Name", lDate: "Date", lTime: "Time", lType: "Session Type",
            optNew: "New Checkup", optFollow: "Follow-up", optSess: "Treatment Session", lNotes: "Notes (Optional)", btnSave: "Confirm Booking", btnUpdate: "Update Booking",
            detTitle: "Booking Details", lblDetName: "Patient:", lblDetDate: "Date:", lblDetTime: "Time:", lblDetType: "Type:", lblDetNotes: "Notes:", lblDetStatus: "Status:",
            btnEdit: "✏️ Edit Appointment", btnDel: "🗑️ Delete Permanently", confDel: "Are you sure you want to delete this appointment?", errSave: "Error saving appointment!", msgDrag: "Appointment updated successfully!",
            lblSearch: "🔍 Search Existing Patient (Optional)", searchPlh: "Type name or phone to search...", lblPhone: "Mobile Number", lblAge: "Age (Years)", lblGender: "Gender", lblTotal: "Total", lblPaid: "Paid", lblRem: "Remaining",
            lblHistoryTitle: "Medical History (Optional)", lblDetHistory: "📋 Med History:", lblDetFinance: "💰 Finance (Paid/Total):", lblDetPhone: "📱 Mobile:",
            btnWaRem: "📱 Send WhatsApp Reminder", btnCompleteApp: "✅ Patient Attended (Complete)", btnCancelApp: "🚫 Cancel Appointment", btnRestoreApp: "🔄 Restore to Pending",
            errOffDay: "Sorry, this day is the clinic's weekly day off!", errTimeBounds: "Sorry, the selected time is outside official working hours!"
        }
    };
    const c = t[lang] || t.ar;
    const setTxt = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };
    const setClassTxt = (cls, txt) => { document.querySelectorAll('.'+cls).forEach(el => el.innerText = txt); };
    const setPlh = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).placeholder = txt; };

    setTxt('txt-title', c.title); setTxt('txt-subtitle', c.sub); setTxt('btn-add-txt', c.btnAdd);
    setTxt('btn-all-apps-txt', c.btnAllApps); setTxt('mod-all-apps-title', c.modAllAppsTitle); setPlh('search_all_apps', c.searchAllAppsPlh);
    if(document.getElementById('modal-title')) setTxt('modal-title', c.mTitle);
    setTxt('lbl-app-name', c.lName); setTxt('lbl-app-date', c.lDate);
    setTxt('lbl-app-time', c.lTime); setTxt('lbl-app-notes', c.lNotes);
    setTxt('btn-save', c.btnSave);
    
    setTxt('lbl-search-patient', c.lblSearch); setPlh('search_patient_input', c.searchPlh);
    setTxt('lbl-app-phone', c.lblPhone); setTxt('lbl-app-age', c.lblAge); setTxt('lbl-app-gender', c.lblGender);
    setTxt('lbl-app-history-title', c.lblHistoryTitle);
    setTxt('lbl-app-total', c.lblTotal); setTxt('lbl-app-paid', c.lblPaid); setTxt('lbl-app-rem', c.lblRem);
    
    if(document.getElementById('det-modal-title')) setTxt('det-modal-title', c.detTitle);
    setClassTxt('lbl-det-name', c.lblDetName); setClassTxt('lbl-det-date', c.lblDetDate); setClassTxt('lbl-det-time', c.lblDetTime); 
    setClassTxt('lbl-det-type', c.lblDetType); setClassTxt('lbl-det-notes', c.lblDetNotes); setClassTxt('lbl-det-status', c.lblDetStatus);
    setClassTxt('lbl-det-history', c.lblDetHistory); setClassTxt('lbl-det-finance', c.lblDetFinance); setClassTxt('lbl-det-phone', c.lblDetPhone);
    
    setTxt('btn-wa-reminder', c.btnWaRem); setTxt('btn-complete-app', c.btnCompleteApp); setTxt('btn-edit-app', c.btnEdit);
    setTxt('btn-cancel-app', c.btnCancelApp); setTxt('btn-restore-app', c.btnRestoreApp); setTxt('btn-delete-app', c.btnDel);
    
    // تغيير التسمية لتصبح اختياري
    const lblDoc = document.getElementById('lbl-app-doctor');
    if(lblDoc) lblDoc.innerText = lang === 'ar' ? 'الطبيب المعالج (اختياري)' : 'Treating Doctor (Optional)';

    window.calendarLang = c;
}

function openAllAppointmentsModal() {
    document.getElementById('search_all_apps').value = '';
    renderAllAppointmentsList();
    document.getElementById('allAppointmentsModal').style.display = 'flex';
}
function closeAllAppointmentsModal() { document.getElementById('allAppointmentsModal').style.display = 'none'; }

function renderAllAppointmentsList() {
    const container = document.getElementById('all-apps-list-container');
    const searchQ = document.getElementById('search_all_apps').value.trim().toLowerCase();
    container.innerHTML = '';
    
    const filtered = allAppointmentsData.filter(app => 
        (app.patientName && app.patientName.toLowerCase().includes(searchQ)) ||
        (app.phone && app.phone.includes(searchQ)) ||
        (app.patientPhone && app.patientPhone.includes(searchQ))
    );

    if (filtered.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:30px; color:#64748b; background:#f8fafc; border-radius:8px; border:2px dashed #cbd5e1;">لا توجد حجوزات تطابق بحثك.</div>`;
        return;
    }

    const lang = localStorage.getItem('preferredLang') || 'ar';
    
    filtered.forEach(app => {
        let statusColor = '#f59e0b'; 
        let statusTxt = lang === 'ar' ? 'انتظار' : 'Pending';
        if(app.status === 'completed') { statusColor = '#10b981'; statusTxt = lang === 'ar' ? 'مكتمل' : 'Completed'; }
        if(app.status === 'cancelled') { statusColor = '#ef4444'; statusTxt = lang === 'ar' ? 'ملغي' : 'Cancelled'; }

        const div = document.createElement('div');
        div.style.cssText = "background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.02);";
        div.onmouseover = () => div.style.borderColor = "#bae6fd";
        div.onmouseout = () => div.style.borderColor = "#e2e8f0";
        
        div.onclick = () => {
            closeAllAppointmentsModal();
            const props = {
                patientId: app.patientId || null, patientName: app.patientName, 
                phone: app.patientPhone || app.phone, age: app.age, gender: app.gender, history: app.history,
                type: app.type || 'كشف', contract: app.contract || 'بدون تعاقد', notes: app.notes, status: app.status,
                date: app.date, time: app.safeTime, total: app.total, paid: app.paid, remaining: app.remaining,
                payMethod: app.payMethod || 'cash', source: app.source || 'clinic',
                doctorId: app.doctorId, doctorName: app.doctorName 
            };
            showAppDetailsModal(app.id, props);
        };

        div.innerHTML = `
            <div>
                <h4 style="margin: 0 0 5px 0; color: #0f172a; font-size: 16px;">👤 ${app.patientName}</h4>
                <p style="margin: 0; font-size: 13px; color: #64748b; font-weight: bold;">📅 ${app.date} | ⏰ ${app.safeTime} | 🩺 ${app.type}</p>
            </div>
            <div>
                <span style="background: ${statusColor}; color: white; padding: 5px 10px; border-radius: 8px; font-size: 12px; font-weight: bold;">${statusTxt}</span>
            </div>
        `;
        container.appendChild(div);
    });
}

function showAppDetailsModal(appId, props) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.getElementById('appDetailsModal').setAttribute('data-current-id', appId);
    document.getElementById('appDetailsModal').setAttribute('data-full-info', JSON.stringify(props));

    document.getElementById('det_name').innerText = props.patientName;
    document.getElementById('det_phone').innerText = props.phone || '---';
    document.getElementById('det_date').innerText = props.date;
    document.getElementById('det_time').innerText = props.time;
    
    document.getElementById('det_doctor').innerText = props.doctorName || 'غير محدد';
    
    let typeText = props.type;
    if(props.contract && props.contract !== 'بدون تعاقد') typeText += ` <span style="font-size:12px;color:#10b981;">(تأمين: ${props.contract})</span>`;
    document.getElementById('det_type').innerHTML = typeText;
    
    const sourceTxt = props.source === 'portal' ? (lang === 'ar' ? 'بوابة المرضى (أونلاين)' : 'Patient Portal (Online)') : (lang === 'ar' ? 'من داخل العيادة' : 'From Clinic');
    if(document.getElementById('det_source')) document.getElementById('det_source').innerText = sourceTxt;
    
    document.getElementById('det_history').innerText = props.history && props.history !== "" ? props.history : (lang === 'ar' ? "سليم (لا يوجد)" : "Healthy (None)");
    
    const paid = props.paid || 0; const total = props.total || 0;
    document.getElementById('det_finance').innerText = `${paid} / ${total}`;

    let methodStr = lang === 'ar' ? "نقدي" : "Cash";
    if(props.payMethod === 'wallet') methodStr = lang === 'ar' ? "محفظة" : "Wallet";
    if(props.payMethod === 'instapay') methodStr = lang === 'ar' ? "إنستاباي / بنكي" : "InstaPay / Bank";
    document.getElementById('det_pay_method').innerText = methodStr;

    document.getElementById('det_notes').innerText = props.notes || (lang === 'ar' ? 'لا يوجد ملاحظات' : 'No notes');
    
    let statusTxt = lang === 'ar' ? 'في الانتظار' : 'Pending';
    if(props.status === 'completed') statusTxt = lang === 'ar' ? 'مكتمل' : 'Completed';
    if(props.status === 'cancelled') statusTxt = lang === 'ar' ? 'ملغي' : 'Cancelled';
    document.getElementById('det_status').innerText = statusTxt;

    if(props.status === 'completed' || props.status === 'cancelled') {
        document.getElementById('whatsapp-action-box').style.display = 'none';
        document.getElementById('complete-action-box').style.display = 'none';
        document.getElementById('edit-action-box').style.display = 'none';
        document.getElementById('cancel-action-box').style.display = 'none';
        document.getElementById('restore-action-box').style.display = props.status === 'cancelled' ? 'block' : 'none';
    } else {
        document.getElementById('whatsapp-action-box').style.display = 'block';
        document.getElementById('complete-action-box').style.display = 'block';
        document.getElementById('edit-action-box').style.display = 'block';
        document.getElementById('cancel-action-box').style.display = 'block';
        document.getElementById('restore-action-box').style.display = 'none';
    }
    document.getElementById('appDetailsModal').style.display = 'flex';
}

// 🔴 دالة تصفية الأطباء حسب الفرع المختار 🔴
function populateModalDoctors() {
    const docSelect = document.getElementById('app_doctor');
    if (!docSelect) return;
    const lang = localStorage.getItem('preferredLang') || 'ar';
    docSelect.innerHTML = `<option value="">${lang === 'ar' ? 'اختر الطبيب (اختياري)...' : 'Select Doctor (Optional)...'}</option>`;
    
    let targetBranch = userBranch;
    if (userRole === 'admin' || userRole === 'superadmin') {
        const appBranchEl = document.getElementById('app_branch');
        if (appBranchEl && appBranchEl.value) {
            targetBranch = appBranchEl.value;
        }
    }

    allClinicDoctors.forEach(d => {
        if (targetBranch === 'all' || d.branchId === targetBranch || d.branchId === 'main') {
            // 🔴 تم التصحيح هنا: d.id بدلاً من doc.id 🔴
            docSelect.innerHTML += `<option value="${d.id}">${d.name}</option>`;
        }
    });
}

function loadClinicSettingsAndERP() {
    if (!currentClinicId) return;

    db.collection("Clinics").doc(currentClinicId).onSnapshot(doc => {
        if (doc.exists) {
            const data = doc.data();
            clinicSettings.workStart = data.workStart || '08:00';
            clinicSettings.workEnd = data.workEnd || '22:00';
            clinicSettings.offDay = data.offDay || 'none';
        }
        if (calendar) {
            calendar.setOption('slotMinTime', clinicSettings.workStart + ':00');
            calendar.setOption('slotMaxTime', clinicSettings.workEnd + ':00');
            calendar.setOption('hiddenDays', clinicSettings.offDay !== 'none' ? [Number(clinicSettings.offDay)] : []);
        } else {
            setTimeout(() => { initCalendar(); }, 100); 
        }
    });

    db.collection("Services").where("clinicId", "==", currentClinicId).onSnapshot(snap => {
        erpServices = [];
        const selectType = document.getElementById('app_type');
        if (selectType) selectType.innerHTML = `<option value="">اختر الخدمة...</option>`;
        snap.forEach(doc => {
            const s = Object.assign({id: doc.id}, doc.data());
            erpServices.push(s);
            if (selectType) selectType.innerHTML += `<option value="${s.name}">${s.name} (${s.price || 0} ج.م)</option>`; 
        });
    });

    // 🔴 جلب جميع الأطباء في العيادة 🔴
    db.collection("Users").where("clinicId", "==", currentClinicId).where("role", "==", "doctor").onSnapshot(snap => {
        allClinicDoctors = [];
        snap.forEach(doc => { allClinicDoctors.push({ id: doc.id, ...doc.data() }); });
        populateModalDoctors(); // تحديث القائمة فوراً
    });

    db.collection("Contracts").where("clinicId", "==", currentClinicId).onSnapshot(snap => {
        erpContracts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const contEl = document.getElementById('app_contract');
        if (contEl) {
            contEl.innerHTML = `<option value="">بدون تعاقد (خصم 0%)</option>`;
            erpContracts.forEach(c => { contEl.innerHTML += `<option value="${c.id}">${c.name} (خصم ${c.discountPercentage}%)</option>`; });
        }
    });
}

function calculateCalERP() {
    const srvName = document.getElementById('app_type').value;
    const contId = document.getElementById('app_contract').value;
    
    let basePrice = 0;
    const srv = erpServices.find(s => s.name === srvName);
    if (srv) basePrice = Number(srv.price) || 0;

    let discount = 0;
    const cont = erpContracts.find(c => c.id === contId);
    if (cont) discount = Number(cont.discountPercentage) || 0;

    const total = basePrice - (basePrice * (discount / 100));
    document.getElementById('app_total').value = Math.round(total);
    calcCalRemaining();
}

function calcCalRemaining() {
    const t = Number(document.getElementById('app_total').value) || 0;
    const p = Number(document.getElementById('app_paid').value) || 0;
    document.getElementById('app_remaining').value = Math.max(0, t - p);
}

function openAppointmentModal() {
    currentEditAppId = null; 
    document.getElementById('addAppointmentForm').reset();
    
    document.getElementById('search_patient_input').value = '';
    document.getElementById('patient-search-results').style.display = 'none';
    document.getElementById('smart-search-container').style.display = 'block'; 

    document.querySelectorAll('.med-history-cb').forEach(cb => cb.checked = false);
    
    if (userRole === 'admin' || userRole === 'superadmin') {
        const filterVal = document.getElementById('branch-filter').value;
        document.getElementById('app_branch').value = filterVal === 'all' ? 'main' : filterVal;
    }
    
    // 🔴 تحديث قائمة الأطباء 🔴
    populateModalDoctors();
    
    document.getElementById('app_doctor').value = ''; 
    document.getElementById('app_type').value = '';
    document.getElementById('app_contract').value = '';
    document.getElementById('app_total').value = '0';
    document.getElementById('app_paid').value = '0';
    document.getElementById('app_remaining').value = '0';
    document.getElementById('app_pay_method').value = 'cash'; 
    
    const msg = document.getElementById('phone-check-msg');
    if(msg) msg.style.display = 'none';

    document.getElementById('modal-title').innerText = window.calendarLang.mTitle;
    document.getElementById('btn-save').innerText = window.calendarLang.btnSave;
    document.getElementById('appointmentModal').style.display = 'flex';
    
    if (allClinicPatients.length === 0) loadAllPatientsForSearch();
}

function closeAppointmentModal() { document.getElementById('appointmentModal').style.display = 'none'; }
function closeAppDetailsModal() { document.getElementById('appDetailsModal').style.display = 'none'; }

function loadAllPatientsForSearch() {
    if (!currentClinicId) return;
    let queryRef = db.collection("Patients").where("clinicId", "==", currentClinicId);
    if (userRole !== 'admin' && userRole !== 'superadmin') {
        queryRef = queryRef.where("branchId", "==", userBranch);
    } else {
        const selectedBranch = document.getElementById('branch-filter').value;
        if (selectedBranch !== 'all') {
            queryRef = queryRef.where("branchId", "==", selectedBranch);
        }
    }
    queryRef.get().then(snap => {
        allClinicPatients = [];
        snap.forEach(doc => { allClinicPatients.push({ id: doc.id, ...doc.data() }); });
    }).catch(err => console.error(err));
}

function searchExistingPatients() {
    const input = document.getElementById('search_patient_input').value.trim().toLowerCase();
    const resultsBox = document.getElementById('patient-search-results');
    resultsBox.innerHTML = '';

    if (input.length === 0) { resultsBox.style.display = 'none'; return; }

    const filtered = allClinicPatients.filter(p => 
        (p.name && p.name.toLowerCase().includes(input)) || 
        (p.phone && p.phone.includes(input))
    );

    if (filtered.length > 0) {
        filtered.forEach(p => {
            const div = document.createElement('div');
            div.className = 'patient-result-item';
            div.innerHTML = `<span class="patient-result-name">${p.name}</span><span class="patient-result-phone" dir="ltr">${p.phone || ''}</span>`;
            div.onclick = () => fillPatientData(p);
            resultsBox.appendChild(div);
        });
        resultsBox.style.display = 'block';
    } else { resultsBox.style.display = 'none'; }
}

function fillPatientData(patientData) {
    document.getElementById('search_patient_input').value = patientData.name;
    document.getElementById('patient-search-results').style.display = 'none';

    document.getElementById('app_name').value = patientData.name || '';
    document.getElementById('app_phone').value = patientData.phone || '';
    document.getElementById('app_age').value = patientData.age || '';
    if(patientData.gender) document.getElementById('app_gender').value = patientData.gender;

    document.querySelectorAll('.med-history-cb').forEach(cb => cb.checked = false);
    let remainingNotes = [];
    if(patientData.medicalHistory && Array.isArray(patientData.medicalHistory)) {
        patientData.medicalHistory.forEach(part => {
            const cb = document.querySelector(`.med-history-cb[value="${part}"]`);
            if(cb) cb.checked = true; else remainingNotes.push(part);
        });
    }
    document.getElementById('app_history').value = remainingNotes.join(' ، ');
    checkPhoneInSystem(); 
}

function checkPhoneInSystem() {
    const phone = document.getElementById('app_phone').value.trim();
    const msg = document.getElementById('phone-check-msg');
    if (!msg) return;
    
    if(phone.length < 8) { msg.style.display = 'none'; return; }
    
    const found = allClinicPatients.find(p => p.phone === phone);
    if(found) {
        msg.style.display = 'block'; 
        msg.innerText = '✅ مريض مسجل بالسيستم'; 
        msg.style.color = '#10b981';
        if(document.getElementById('app_name').value.trim() === '') fillPatientData(found);
    } else {
        msg.style.display = 'block'; 
        msg.innerText = '✨ مريض جديد محتمل'; 
        msg.style.color = '#0284c7';
    }
}

document.addEventListener('click', function(e) {
    const searchBox = document.getElementById('smart-search-container');
    if (searchBox && !searchBox.contains(e.target)) {
        const results = document.getElementById('patient-search-results');
        if(results) results.style.display = 'none';
    }
});

function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const isMobile = window.innerWidth < 768;

    let minTime = clinicSettings.workStart ? clinicSettings.workStart + ':00' : '00:00:00';
    let maxTime = clinicSettings.workEnd ? clinicSettings.workEnd + ':00' : '24:00:00';
    let hiddenDaysArr = clinicSettings.offDay && clinicSettings.offDay !== 'none' ? [Number(clinicSettings.offDay)] : [];

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: isMobile ? 'timeGridDay' : 'timeGridWeek',
        locale: lang === 'ar' ? 'ar' : 'en',
        direction: lang === 'ar' ? 'rtl' : 'ltr',
        editable: true, 
        headerToolbar: { left: 'prev,next today', center: 'title', right: isMobile ? 'timeGridDay,listWeek' : 'dayGridMonth,timeGridWeek,timeGridDay' },
        slotMinTime: minTime,
        slotMaxTime: maxTime,
        hiddenDays: hiddenDaysArr,
        allDaySlot: false, events: [],
        
        eventClick: function(info) {
            const props = info.event.extendedProps;
            const appId = info.event.id;
            showAppDetailsModal(appId, props);
        },
        eventDrop: async function(info) {
            const newDate = info.event.startStr.split('T')[0];
            const newTime = info.event.startStr.split('T')[1].substring(0, 5);

            const selectedDateObj = new Date(newDate);
            const dayOfWeek = selectedDateObj.getDay();
            if (clinicSettings.offDay !== 'none' && dayOfWeek === Number(clinicSettings.offDay)) {
                alert(window.calendarLang.errOffDay);
                info.revert();
                return;
            }

            const timeMinutes = parseInt(newTime.split(':')[0]) * 60 + parseInt(newTime.split(':')[1]);
            const startMinutes = parseInt(clinicSettings.workStart.split(':')[0]) * 60 + parseInt(clinicSettings.workStart.split(':')[1]);
            const endMinutes = parseInt(clinicSettings.workEnd.split(':')[0]) * 60 + parseInt(clinicSettings.workEnd.split(':')[1]);
            
            if (timeMinutes < startMinutes || timeMinutes > endMinutes) {
                alert(window.calendarLang.errTimeBounds);
                info.revert();
                return;
            }

            if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري تحديث الموعد..." : "Updating...");
            try { await db.collection("Appointments").doc(info.event.id).update({ date: newDate, time: newTime }); } 
            catch (error) { console.error("Error moving event:", error); info.revert(); } 
            finally { if (window.hideLoader) window.hideLoader(); }
        },
        windowResize: function(arg) {
            if (window.innerWidth < 768) { calendar.changeView('timeGridDay'); } else { calendar.changeView('timeGridWeek'); }
        }
    });
    calendar.render();
    loadAppointments(); 
}

function sendWhatsAppReminder() {
    const rawData = document.getElementById('appDetailsModal').getAttribute('data-full-info');
    if (!rawData) return;
    const props = JSON.parse(rawData);
    let phone = props.phone;
    const isAr = (localStorage.getItem('preferredLang') || 'ar') === 'ar';
    
    if (!phone || phone.length < 9) { alert(isAr ? "عفواً، لا يوجد رقم موبايل صالح." : "Sorry, no valid phone."); return; }

    phone = phone.replace(/\D/g, '');
    if (phone.startsWith('0')) { phone = '2' + phone; } else if (!phone.startsWith('20')) { phone = '20' + phone; }

    let message = isAr ? `مرحباً أستاذ/ة *${props.patientName}* 👋\n\nنذكركم بموعدكم القادم في عيادتنا يوم *${props.date}* الساعة *${props.time}*.\n\nيرجى تأكيد الحضور. نتمنى لكم دوام الصحة! 🦷✨`
                       : `Hello *${props.patientName}* 👋\n\nThis is a friendly reminder for your appointment on *${props.date}* at *${props.time}*.\n\nPlease confirm attendance! 🦷✨`;

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const whatsappUrl = isMobile ? `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}` : `https://api.whatsapp.com/send/?phone=${phone}&text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, 'NivaWhatsAppTab');
    closeAppDetailsModal();
}

async function saveAppointment(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save');
    btn.disabled = true; btn.innerText = "...";

    if (!currentClinicId) { alert("حدث خطأ!"); return; }
    if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري الحفظ..." : "Saving...");

    const dateVal = document.getElementById('app_date').value;
    const timeVal = document.getElementById('app_time').value || '12:00'; 
    const phoneInput = document.getElementById('app_phone').value.trim();

    const selectedDate = new Date(dateVal);
    const dayOfWeek = selectedDate.getDay();
    if (clinicSettings.offDay !== 'none' && dayOfWeek === Number(clinicSettings.offDay)) {
        alert(window.calendarLang.errOffDay);
        btn.disabled = false; btn.innerText = currentEditAppId ? window.calendarLang.btnUpdate : window.calendarLang.btnSave;
        if (window.hideLoader) window.hideLoader();
        return;
    }

    const timeMinutes = parseInt(timeVal.split(':')[0]) * 60 + parseInt(timeVal.split(':')[1]);
    const startMinutes = parseInt(clinicSettings.workStart.split(':')[0]) * 60 + parseInt(clinicSettings.workStart.split(':')[1]);
    const endMinutes = parseInt(clinicSettings.workEnd.split(':')[0]) * 60 + parseInt(clinicSettings.workEnd.split(':')[1]);
    
    if (timeMinutes < startMinutes || timeMinutes > endMinutes) {
        alert(window.calendarLang.errTimeBounds);
        btn.disabled = false; btn.innerText = currentEditAppId ? window.calendarLang.btnUpdate : window.calendarLang.btnSave;
        if (window.hideLoader) window.hideLoader();
        return;
    }

    let historyArr = [];
    document.querySelectorAll('.med-history-cb:checked').forEach(cb => { historyArr.push(cb.value); });
    const otherHistory = document.getElementById('app_history').value.trim();
    if(otherHistory) historyArr.push(otherHistory);
    const finalHistory = historyArr.join(' ، ');

    const srvSelect = document.getElementById('app_type');
    const typeVal = srvSelect.value || "كشف";

    // 🔴 قراءة بيانات الدكتور (بأمان حتى لو اختياري) 🔴
    const docSelect = document.getElementById('app_doctor');
    const doctorId = docSelect ? docSelect.value : '';
    const doctorName = (docSelect && docSelect.selectedIndex > 0) ? docSelect.options[docSelect.selectedIndex].text : '';

    const contSelect = document.getElementById('app_contract');
    const cont = erpContracts.find(c => c.id === contSelect.value);
    const contractVal = cont ? cont.name : 'بدون تعاقد';

    let eventColor = '#0284C7'; 
    if (typeVal.includes('استشارة') || typeVal.toLowerCase().includes('follow')) eventColor = '#f59e0b'; 
    if (typeVal.includes('جلسة') || typeVal.toLowerCase().includes('session')) eventColor = '#10b981'; 

    const foundPatient = allClinicPatients.find(p => p.phone === phoneInput);
    const linkedPatientId = foundPatient ? foundPatient.id : null;

    let targetBranchId = userBranch;
    if (userRole === 'admin' || userRole === 'superadmin') {
        const appBranchEl = document.getElementById('app_branch');
        if (appBranchEl) targetBranchId = appBranchEl.value;
    }

    const appData = {
        clinicId: currentClinicId, patientId: linkedPatientId,
        branchId: targetBranchId, 
        doctorId: doctorId, doctorName: doctorName, 
        patientName: document.getElementById('app_name').value.trim(),
        phone: phoneInput, patientPhone: phoneInput,
        age: document.getElementById('app_age').value, gender: document.getElementById('app_gender').value,
        history: finalHistory, date: dateVal, time: timeVal,
        type: typeVal, contract: contractVal,
        total: Number(document.getElementById('app_total').value) || 0,
        paid: Number(document.getElementById('app_paid').value) || 0,
        remaining: Number(document.getElementById('app_remaining').value) || 0,
        payMethod: document.getElementById('app_pay_method').value, 
        notes: document.getElementById('app_notes').value.trim(),
        color: eventColor, status: 'pending', source: 'clinic'
    };

    try {
        if (currentEditAppId) { await db.collection("Appointments").doc(currentEditAppId).update(appData); } 
        else { appData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
              // ==========================================
    // 🛡️ فحص التعارض (Pre-Check Validation)
    // ==========================================
    const checkDate = document.getElementById('app_date').value;
    const checkTime = document.getElementById('app_time').value;
    const checkPhone = document.getElementById('app_phone').value.trim();
    
    // سحب المواعيد اللي في نفس اليوم ونفس الفرع وحالتها قيد الانتظار
    const conflictSnap = await db.collection("Appointments")
        .where("clinicId", "==", clinicId)
        .where("branchId", "==", targetBranchId)
        .where("date", "==", checkDate)
        .where("status", "==", "pending")
        .get();

    let isTimeTaken = false;
    let isPatientDuplicate = false;

    conflictSnap.forEach(doc => {
        const existingApp = doc.data();
        
        // 1. فحص تعارض الوقت (نفس الوقت لنفس الطبيب)
        // لو مفيش طبيب محدد (العيادة كلها شغالة طابور)، هنفحص الوقت بس
        const isSameDoctor = doctorId ? (existingApp.doctorId === doctorId) : true; 
        if (existingApp.time === checkTime && isSameDoctor) {
            isTimeTaken = true;
        }

        // 2. فحص تكرار المريض (نفس الرقم في نفس اليوم)
        if (existingApp.phone === checkPhone) {
            isPatientDuplicate = true;
        }
    });

    if (isTimeTaken) {
        alert("⚠️ عذراً، هذا الموعد محجوز مسبقاً! يرجى اختيار وقت آخر أو طبيب آخر.");
        if (window.hideLoader) window.hideLoader();
        return; // توقيف عملية الحفظ فوراً
    }

    if (isPatientDuplicate) {
        const confirmDuplicate = confirm("⚠️ هذا المريض (نفس رقم الموبايل) لديه حجز بالفعل في هذا اليوم.. هل تريد تأكيد حجز موعد إضافي له؟");
        if (!confirmDuplicate) {
            if (window.hideLoader) window.hideLoader();
            return; // توقيف عملية الحفظ لو ضغط Cancel
        }
    }
    // ==========================================
    // نهاية الفحص، نكمل الحفظ العادي لو الدنيا تمام
              await db.collection("Appointments").add(appData); }
        closeAppointmentModal();
    } catch (error) { console.error("Error saving:", error); alert(window.calendarLang.errSave); } 
    finally { btn.disabled = false; btn.innerText = currentEditAppId ? window.calendarLang.btnUpdate : window.calendarLang.btnSave; if (window.hideLoader) window.hideLoader(); }
}

async function markAppAsCompleted() {
    const appId = document.getElementById('appDetailsModal').getAttribute('data-current-id');
    const rawData = document.getElementById('appDetailsModal').getAttribute('data-full-info');
    if (!appId || !rawData) return;

    const props = JSON.parse(rawData);
    const btn = document.querySelector('#complete-action-box button');
    btn.innerText = "جاري الحفظ والإنشاء..."; btn.disabled = true;

    if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري إتمام الحجز..." : "Completing...");

    try {
        await db.collection("Appointments").doc(appId).update({ status: 'completed' });

        const patientPhone = props.phone || "غير مسجل";
        const paidAmount = Number(props.paid) || 0;
        const remainingAmount = Number(props.remaining) || 0;
        const paymentMethod = props.payMethod || 'cash'; 
        
        let appBranchId = userBranch;
        if (userRole === 'admin' || userRole === 'superadmin') {
            const filterVal = document.getElementById('branch-filter').value;
            appBranchId = filterVal === 'all' ? 'main' : filterVal;
        }

        let patientId = props.patientId;
        if (!patientId) {
            const existingPatientQuery = await db.collection("Patients").where("clinicId", "==", currentClinicId).where("phone", "==", patientPhone).get();
            let matchedPatientDoc = null;
            if (!existingPatientQuery.empty) {
                existingPatientQuery.forEach(doc => { if (doc.data().name.trim() === props.patientName.trim()) { matchedPatientDoc = doc; } });
            }

            if (!matchedPatientDoc) {
                let historyArray = [];
                if(props.history && props.history.length > 0 && props.history !== "سليم (لا يوجد)") { historyArray = props.history.split(' ، ').map(item => item.trim()).filter(i => i); }

                const newPat = await db.collection("Patients").add({
                    clinicId: currentClinicId, branchId: appBranchId, name: props.patientName, phone: patientPhone, age: props.age || '', gender: props.gender || '',
                    medicalHistory: historyArray, notes: props.notes || '', totalDebt: remainingAmount, createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                patientId = newPat.id;
            } else {
                patientId = matchedPatientDoc.id;
                if (remainingAmount > 0) { await db.collection("Patients").doc(patientId).update({ totalDebt: firebase.firestore.FieldValue.increment(remainingAmount) }); }
            }
        } else {
            if (remainingAmount > 0) { await db.collection("Patients").doc(patientId).update({ totalDebt: firebase.firestore.FieldValue.increment(remainingAmount) }); }
        }

        const d = new Date();
        const currentPayDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        await db.collection("Sessions").add({
            clinicId: currentClinicId, branchId: appBranchId, patientId: patientId, date: currentPayDate,
            procedure: props.type || "كشف / إجراء", contract: props.contract || 'بدون تعاقد',
            total: props.total || 0, paid: paidAmount, remaining: remainingAmount,
            notes: props.notes || "", createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        if (paidAmount > 0) {
            await db.collection("Finances").add({
                clinicId: currentClinicId, branchId: appBranchId, patientId: patientId, type: 'income', category: 'كشف / جلسة',
                amount: paidAmount, date: currentPayDate, paymentMethod: paymentMethod, 
                notes: `إيراد حجز مريض: ${props.patientName} - (${props.type})`, createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        if (remainingAmount > 0) {
            await db.collection("Finances").add({
                clinicId: currentClinicId, branchId: appBranchId, patientId: patientId, type: 'debt', category: 'متبقي كشف / جلسة',
                amount: remainingAmount, date: currentPayDate, notes: `مديونية متبقية على المريض: ${props.patientName} - (${props.type})`, createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        alert(document.body.dir === 'rtl' ? "✅ تم إتمام الحجز بنجاح!" : "✅ Appointment completed successfully!");
        closeAppDetailsModal();
    } catch (error) { console.error(error); alert(document.body.dir === 'rtl' ? "حدث خطأ." : "Error."); } 
    finally { btn.innerText = window.calendarLang.btnCompleteApp; btn.disabled = false; if (window.hideLoader) window.hideLoader(); }
}

async function openEditModal() {
    const appId = document.getElementById('appDetailsModal').getAttribute('data-current-id');
    const rawData = document.getElementById('appDetailsModal').getAttribute('data-full-info');
    if (!appId || !rawData) return;

    currentEditAppId = appId;
    const props = JSON.parse(rawData);
    
    try {
        document.getElementById('smart-search-container').style.display = 'none';
        document.getElementById('app_name').value = props.patientName;
        document.getElementById('app_phone').value = props.phone || '';
        document.getElementById('app_age').value = props.age || '';
        document.getElementById('app_gender').value = props.gender || 'ذكر';
        
        document.querySelectorAll('.med-history-cb').forEach(cb => cb.checked = false);
        let remainingNotes = [];
        if(props.history && props.history !== "سليم (لا يوجد)" && props.history !== "Healthy (None)") {
            const parts = props.history.split(' ، ');
            parts.forEach(part => {
                const cb = document.querySelector(`.med-history-cb[value="${part}"]`);
                if(cb) cb.checked = true; else remainingNotes.push(part);
            });
        }
        document.getElementById('app_history').value = remainingNotes.join(' ، ');

        document.getElementById('app_date').value = props.date;
        document.getElementById('app_time').value = props.time;
        
        const typeEl = document.getElementById('app_type');
        const srv = erpServices.find(s => s.name === props.type);
        if(srv) typeEl.value = srv.name;

        if (userRole === 'admin' || userRole === 'superadmin') {
            const appBranchEl = document.getElementById('app_branch');
            if (appBranchEl) appBranchEl.value = props.branchId || 'main';
        }

        // 🔴 تحديث قائمة الأطباء قبل تعيين الطبيب 🔴
        populateModalDoctors();
        const docEl = document.getElementById('app_doctor');
        if (docEl) docEl.value = props.doctorId || '';

        const contEl = document.getElementById('app_contract');
        const cont = erpContracts.find(c => c.name === props.contract);
        if(cont) contEl.value = cont.id;

        document.getElementById('app_notes').value = props.notes || '';
        document.getElementById('app_total').value = props.total || '0';
        document.getElementById('app_paid').value = props.paid || '0';
        document.getElementById('app_remaining').value = props.remaining || '0';
        document.getElementById('app_pay_method').value = props.payMethod || 'cash';

        document.getElementById('modal-title').innerText = window.calendarLang.mTitleEdit;
        document.getElementById('btn-save').innerText = window.calendarLang.btnUpdate;
        
        const msg = document.getElementById('phone-check-msg');
        if(msg) msg.style.display = 'none';

        closeAppDetailsModal(); 
        document.getElementById('appointmentModal').style.display = 'flex';
    } catch (e) { console.error(e); }
}

async function cancelAppointment() {
    const appId = document.getElementById('appDetailsModal').getAttribute('data-current-id');
    if (!appId) return;
    if (confirm(window.calendarLang.confDel)) { 
        if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري الإلغاء..." : "Cancelling...");
        try { await db.collection("Appointments").doc(appId).update({ status: 'cancelled' }); closeAppDetailsModal(); } 
        catch (error) { console.error(error); } finally { if (window.hideLoader) window.hideLoader(); }
    }
}

async function restoreAppointment() {
    const appId = document.getElementById('appDetailsModal').getAttribute('data-current-id');
    if (!appId) return;
    if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري الإرجاع..." : "Restoring...");
    try { await db.collection("Appointments").doc(appId).update({ status: 'pending' }); closeAppDetailsModal(); } 
    catch (error) { console.error(error); } finally { if (window.hideLoader) window.hideLoader(); }
}

async function deleteAppointment() {
    const appId = document.getElementById('appDetailsModal').getAttribute('data-current-id');
    if (!appId) return;
    if (confirm(window.calendarLang.confDel)) {
        if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري الحذف..." : "Deleting...");
        try { await db.collection("Appointments").doc(appId).delete(); closeAppDetailsModal(); } 
        catch (error) { console.error(error); } finally { if (window.hideLoader) window.hideLoader(); }
    }
}

function loadAppointments() {
    if (!currentClinicId || !calendar) return;
    if (window.showLoader && calendar.getEvents().length === 0) window.showLoader(document.body.dir === 'rtl' ? "جاري مزامنة المواعيد..." : "Syncing...");

    let queryRef = db.collection("Appointments").where("clinicId", "==", currentClinicId);

    if (userRole !== 'admin' && userRole !== 'superadmin') {
        queryRef = queryRef.where("branchId", "==", userBranch);
    } else {
        const selectedBranch = document.getElementById('branch-filter').value;
        if (selectedBranch !== 'all') {
            queryRef = queryRef.where("branchId", "==", selectedBranch);
        }
    }

    if (calendarUnsubscribe) {
        calendarUnsubscribe(); 
    }

    calendarUnsubscribe = queryRef.onSnapshot(snap => {
        calendar.removeAllEvents();
        allAppointmentsData = []; 

        snap.forEach(doc => {
            const data = doc.data();
            const safeTime = data.time || "12:00"; 
            const startDateTime = `${data.date}T${safeTime}:00`;

            let finalColor = data.color || '#0284C7';
            if(data.status === 'completed') finalColor = '#94a3b8';
            if(data.status === 'cancelled') finalColor = '#ef4444'; 

            const appObj = {
                id: doc.id, patientId: data.patientId || null, patientName: data.patientName, 
                phone: data.patientPhone || data.phone, patientPhone: data.patientPhone || data.phone, age: data.age, gender: data.gender, history: data.history,
                type: data.type || 'كشف', contract: data.contract || 'بدون تعاقد', notes: data.notes, status: data.status,
                date: data.date, time: safeTime, safeTime: safeTime, total: data.total, paid: data.paid, remaining: data.remaining,
                payMethod: data.payMethod || 'cash', source: data.source || 'clinic',
                doctorId: data.doctorId, doctorName: data.doctorName, branchId: data.branchId 
            };

            allAppointmentsData.push(appObj);

            calendar.addEvent({
                id: doc.id, title: `${data.patientName}`, start: startDateTime, backgroundColor: finalColor, borderColor: finalColor,
                extendedProps: appObj
            });
        });
        
        allAppointmentsData.sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
        loadAllPatientsForSearch(); 

        if (window.hideLoader) window.hideLoader();
    }, error => { if (window.hideLoader) window.hideLoader(); });
}

window.onload = async () => {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.body.dir = lang === 'en' ? 'ltr' : 'rtl';
    document.body.setAttribute('data-theme', localStorage.getItem('niva_theme') || 'light');
    
    if(window.translations) { updatePageContent(lang); } else { setTimeout(() => updatePageContent(lang), 500); }
    
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) { 
            await loadBranchesForAdmin();
            loadClinicSettingsAndERP(); 
        }
    });
};

window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) { event.target.style.display = 'none'; }
});
