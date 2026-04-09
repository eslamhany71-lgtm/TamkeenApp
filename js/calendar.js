const db = firebase.firestore();
let currentClinicId = sessionStorage.getItem('clinicId');
let calendar; 
let currentEditAppId = null; 

let allClinicPatients = [];

function updatePageContent(lang) {
    const t = {
        ar: {
            title: "أجندة المواعيد", sub: "إدارة حجوزات العيادة وتنظيم وقت الطبيب", btnAdd: "حجز موعد جديد",
            mTitle: "حجز موعد جديد", mTitleEdit: "تعديل موعد", lName: "اسم المريض", lDate: "تاريخ الموعد", lTime: "الساعة", lType: "نوع الكشف / الجلسة",
            optNew: "كشف جديد", optFollow: "استشارة / متابعة", optSess: "جلسة علاجية", lNotes: "ملاحظات الحجز (اختياري)", btnSave: "تأكيد الحجز", btnUpdate: "تحديث الموعد",
            detTitle: "تفاصيل الحجز", lblDetName: "اسم المريض:", lblDetDate: "التاريخ:", lblDetTime: "الساعة:", lblDetType: "نوع الكشف:", lblDetNotes: "ملاحظات:", lblDetStatus: "الحالة:",
            btnEdit: "✏️ تعديل الحجز", btnDel: "🗑️ حذف الحجز نهائياً", confDel: "هل أنت متأكد من حذف هذا الموعد نهائياً؟", errSave: "حدث خطأ أثناء الحفظ!", msgDrag: "تم تغيير الموعد بنجاح!",
            lblSearch: "🔍 بحث عن مريض مسجل (اختياري)", searchPlh: "اكتب الاسم أو رقم الموبايل للبحث...", lblPhone: "رقم الموبايل", lblAge: "العمر (سنوات)", lblGender: "النوع", lblTotal: "الإجمالي", lblPaid: "المدفوع", lblRem: "المتبقي",
            lblHistoryTitle: "التاريخ الطبي وأمراض مزمنة (اختياري)", lblDetHistory: "📋 التاريخ الطبي:", lblDetFinance: "💰 الحساب (مدفوع / إجمالي):", lblDetPhone: "📱 الموبايل:",
            btnWaRem: "📱 إرسال تذكير بالموعد (واتساب)", btnCompleteApp: "✅ المريض حضر (اكتمال الحجز وتوريد الإيراد)", btnCancelApp: "🚫 إلغاء الحجز (بدون مسح)", btnRestoreApp: "🔄 إرجاع الحجز لقيد الانتظار"
        },
        en: {
            title: "Appointments Calendar", sub: "Manage clinic bookings and organize doctor's time", btnAdd: "Book Appointment",
            mTitle: "Book New Appointment", mTitleEdit: "Edit Appointment", lName: "Patient Name", lDate: "Date", lTime: "Time", lType: "Session Type",
            optNew: "New Checkup", optFollow: "Follow-up", optSess: "Treatment Session", lNotes: "Notes (Optional)", btnSave: "Confirm Booking", btnUpdate: "Update Booking",
            detTitle: "Booking Details", lblDetName: "Patient:", lblDetDate: "Date:", lblDetTime: "Time:", lblDetType: "Type:", lblDetNotes: "Notes:", lblDetStatus: "Status:",
            btnEdit: "✏️ Edit Appointment", btnDel: "🗑️ Delete Permanently", confDel: "Are you sure you want to permanently delete this appointment?", errSave: "Error saving appointment!", msgDrag: "Appointment updated successfully!",
            lblSearch: "🔍 Search Existing Patient (Optional)", searchPlh: "Type name or phone to search...", lblPhone: "Mobile Number", lblAge: "Age (Years)", lblGender: "Gender", lblTotal: "Total", lblPaid: "Paid", lblRem: "Remaining",
            lblHistoryTitle: "Medical History (Optional)", lblDetHistory: "📋 Med History:", lblDetFinance: "💰 Finance (Paid/Total):", lblDetPhone: "📱 Mobile:",
            btnWaRem: "📱 Send WhatsApp Reminder", btnCompleteApp: "✅ Patient Attended (Complete & Add Income)", btnCancelApp: "🚫 Cancel Appointment", btnRestoreApp: "🔄 Restore to Pending"
        }
    };
    const c = t[lang] || t.ar;
    const setTxt = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };
    const setClassTxt = (cls, txt) => { document.querySelectorAll('.'+cls).forEach(el => el.innerText = txt); };
    const setPlh = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).placeholder = txt; };

    setTxt('txt-title', c.title); setTxt('txt-subtitle', c.sub); setTxt('btn-add-txt', c.btnAdd);
    if(document.getElementById('modal-title')) setTxt('modal-title', c.mTitle);
    setTxt('lbl-app-name', c.lName); setTxt('lbl-app-date', c.lDate);
    setTxt('lbl-app-time', c.lTime); setTxt('lbl-app-type', c.lType); setTxt('lbl-app-notes', c.lNotes);
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

    window.calendarLang = c;
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
    
    document.getElementById('app_total').value = '0';
    document.getElementById('app_paid').value = '0';
    document.getElementById('app_remaining').value = '0';
    document.getElementById('app_pay_method').value = 'cash'; // افتراضي
    
    document.getElementById('modal-title').innerText = window.calendarLang.mTitle;
    document.getElementById('btn-save').innerText = window.calendarLang.btnSave;
    document.getElementById('appointmentModal').style.display = 'flex';
    
    if (allClinicPatients.length === 0) {
        loadAllPatientsForSearch();
    }
}

function closeAppointmentModal() { document.getElementById('appointmentModal').style.display = 'none'; }
function closeAppDetailsModal() { document.getElementById('appDetailsModal').style.display = 'none'; }

// =========================================================================
// 🔴 البحث الذكي عن المريض 🔴
// =========================================================================
function loadAllPatientsForSearch() {
    if (!currentClinicId) return;
    db.collection("Patients").where("clinicId", "==", currentClinicId).get().then(snap => {
        allClinicPatients = [];
        snap.forEach(doc => {
            allClinicPatients.push({ id: doc.id, ...doc.data() });
        });
    }).catch(err => console.error("Error loading patients for search:", err));
}

function searchExistingPatients() {
    const input = document.getElementById('search_patient_input').value.trim().toLowerCase();
    const resultsBox = document.getElementById('patient-search-results');
    resultsBox.innerHTML = '';

    if (input.length === 0) {
        resultsBox.style.display = 'none';
        return;
    }

    const filtered = allClinicPatients.filter(p => 
        (p.name && p.name.toLowerCase().includes(input)) || 
        (p.phone && p.phone.includes(input))
    );

    if (filtered.length > 0) {
        filtered.forEach(p => {
            const div = document.createElement('div');
            div.className = 'patient-result-item';
            div.innerHTML = `
                <span class="patient-result-name">${p.name}</span>
                <span class="patient-result-phone" dir="ltr">${p.phone || ''}</span>
            `;
            div.onclick = () => fillPatientData(p);
            resultsBox.appendChild(div);
        });
        resultsBox.style.display = 'block';
    } else {
        resultsBox.style.display = 'none';
    }
}

function fillPatientData(patientData) {
    document.getElementById('search_patient_input').value = patientData.name;
    document.getElementById('patient-search-results').style.display = 'none';

    document.getElementById('app_name').value = patientData.name || '';
    document.getElementById('app_phone').value = patientData.phone || '';
    document.getElementById('app_age').value = patientData.age || '';
    
    if(patientData.gender) {
        const genderSelect = document.getElementById('app_gender');
        for (let i = 0; i < genderSelect.options.length; i++) {
            if (genderSelect.options[i].value === patientData.gender) {
                genderSelect.selectedIndex = i;
                break;
            }
        }
    }

    document.querySelectorAll('.med-history-cb').forEach(cb => cb.checked = false);
    let remainingNotes = [];
    if(patientData.medicalHistory && Array.isArray(patientData.medicalHistory)) {
        patientData.medicalHistory.forEach(part => {
            const cb = document.querySelector(`.med-history-cb[value="${part}"]`);
            if(cb) cb.checked = true;
            else remainingNotes.push(part);
        });
    }
    document.getElementById('app_history').value = remainingNotes.join(' ، ');
}

document.addEventListener('click', function(e) {
    const searchBox = document.getElementById('smart-search-container');
    if (searchBox && !searchBox.contains(e.target)) {
        const results = document.getElementById('patient-search-results');
        if(results) results.style.display = 'none';
    }
});

// =========================================================================

function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const isMobile = window.innerWidth < 768;

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: isMobile ? 'timeGridDay' : 'timeGridWeek',
        locale: lang === 'ar' ? 'ar' : 'en',
        direction: lang === 'ar' ? 'rtl' : 'ltr',
        editable: true, 
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: isMobile ? 'timeGridDay,listWeek' : 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        slotMinTime: '00:00:00', 
        slotMaxTime: '24:00:00',
        allDaySlot: false,
        events: [],
        
        eventClick: function(info) {
            const props = info.event.extendedProps;
            const appId = info.event.id;
            
            document.getElementById('appDetailsModal').setAttribute('data-current-id', appId);
            document.getElementById('appDetailsModal').setAttribute('data-full-info', JSON.stringify(props));

            document.getElementById('det_name').innerText = props.patientName;
            document.getElementById('det_phone').innerText = props.phone || '---';
            const dateObj = new Date(info.event.start);
            document.getElementById('det_date').innerText = dateObj.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US');
            document.getElementById('det_time').innerText = dateObj.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', {hour: '2-digit', minute:'2-digit'});
            document.getElementById('det_type').innerText = props.type;
            
            document.getElementById('det_history').innerText = props.history && props.history !== "" ? props.history : (lang === 'ar' ? "سليم (لا يوجد)" : "Healthy (None)");
            
            const paid = props.paid || 0;
            const total = props.total || 0;
            document.getElementById('det_finance').innerText = `${paid} / ${total}`;

            // 🔴 عرض طريقة الدفع في التفاصيل 🔴
            let methodStr = "نقدي";
            if(props.payMethod === 'wallet') methodStr = "محفظة";
            if(props.payMethod === 'instapay') methodStr = "إنستاباي / بنكي";
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
        },

        eventDrop: async function(info) {
            const newDate = info.event.startStr.split('T')[0];
            const newTime = info.event.startStr.split('T')[1].substring(0, 5);
            if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري تحديث الموعد..." : "Updating...");
            try {
                await db.collection("Appointments").doc(info.event.id).update({
                    date: newDate,
                    time: newTime
                });
            } catch (error) {
                console.error("Error moving event:", error);
                info.revert(); 
            } finally {
                if (window.hideLoader) window.hideLoader();
            }
        },
        windowResize: function(arg) {
            if (window.innerWidth < 768) { calendar.changeView('timeGridDay'); } 
            else { calendar.changeView('timeGridWeek'); }
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
    
    if (!phone || phone.length < 9) {
        alert(isAr ? "عفواً، لا يوجد رقم موبايل صالح مسجل لهذا المريض." : "Sorry, no valid phone number recorded for this patient.");
        return;
    }

    phone = phone.replace(/\D/g, '');
    if (phone.startsWith('0')) {
        phone = '2' + phone; 
    } else if (!phone.startsWith('20')) {
        phone = '20' + phone; 
    }

    let message = "";
    if (isAr) {
        message = `مرحباً أستاذ/ة *${props.patientName}* 👋\n\nنذكركم بموعدكم القادم في عيادتنا يوم *${props.date}* الساعة *${props.time}*.\n\nيرجى تأكيد الحضور أو إبلاغنا في حالة الاعتذار. نتمنى لكم دوام الصحة والعافية! 🦷✨`;
    } else {
        message = `Hello *${props.patientName}* 👋\n\nThis is a friendly reminder for your upcoming appointment at our clinic on *${props.date}* at *${props.time}*.\n\nPlease confirm your attendance. Wishing you a healthy smile! 🦷✨`;
    }

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const whatsappUrl = isMobile 
        ? `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`
        : `https://api.whatsapp.com/send/?phone=${phone}&text=${encodeURIComponent(message)}`;

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
    const typeVal = document.getElementById('app_type').value;

    let historyArr = [];
    document.querySelectorAll('.med-history-cb:checked').forEach(cb => {
        historyArr.push(cb.value);
    });
    const otherHistory = document.getElementById('app_history').value.trim();
    if(otherHistory) {
        historyArr.push(otherHistory);
    }
    const finalHistory = historyArr.join(' ، ');

    let eventColor = '#0284C7'; 
    if (typeVal.includes('استشارة') || typeVal.toLowerCase().includes('follow')) eventColor = '#f59e0b'; 
    if (typeVal.includes('جلسة') || typeVal.toLowerCase().includes('session')) eventColor = '#10b981'; 

    const appData = {
        clinicId: currentClinicId,
        patientName: document.getElementById('app_name').value.trim(),
        phone: document.getElementById('app_phone').value.trim(),
        age: document.getElementById('app_age').value,
        gender: document.getElementById('app_gender').value,
        history: finalHistory, 
        date: dateVal,
        time: timeVal,
        type: typeVal,
        total: Number(document.getElementById('app_total').value) || 0,
        paid: Number(document.getElementById('app_paid').value) || 0,
        remaining: Number(document.getElementById('app_remaining').value) || 0,
        payMethod: document.getElementById('app_pay_method').value, // 🔴 حفظ طريقة الدفع
        notes: document.getElementById('app_notes').value.trim(),
        color: eventColor,
        status: 'pending' 
    };

    try {
        if (currentEditAppId) {
            await db.collection("Appointments").doc(currentEditAppId).update(appData);
        } else {
            appData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection("Appointments").add(appData);
        }
        closeAppointmentModal();
    } catch (error) {
        console.error("Error saving appointment: ", error);
        alert(window.calendarLang.errSave);
    } finally {
        btn.disabled = false; btn.innerText = currentEditAppId ? window.calendarLang.btnUpdate : window.calendarLang.btnSave;
        if (window.hideLoader) window.hideLoader();
    }
}

// 🔴 تحديث دالة إتمام الموعد (رمي الإيرادات بالخزنة وطريقة الدفع) 🔴
async function markAppAsCompleted() {
    const appId = document.getElementById('appDetailsModal').getAttribute('data-current-id');
    const rawData = document.getElementById('appDetailsModal').getAttribute('data-full-info');
    if (!appId || !rawData) return;

    const props = JSON.parse(rawData);
    const btn = document.querySelector('#complete-action-box button');
    btn.innerText = "جاري الحفظ والإنشاء...";
    btn.disabled = true;

    if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري إتمام الحجز..." : "Completing...");

    try {
        await db.collection("Appointments").doc(appId).update({ status: 'completed' });

        const patientPhone = props.phone || "غير مسجل";
        const paidAmount = Number(props.paid) || 0;
        const remainingAmount = Number(props.remaining) || 0;
        const paymentMethod = props.payMethod || 'cash'; // سحب طريقة الدفع من الموعد

        const existingPatientQuery = await db.collection("Patients")
            .where("clinicId", "==", currentClinicId)
            .where("phone", "==", patientPhone)
            .get();

        let patientId = null;
        let matchedPatientDoc = null;

        if (!existingPatientQuery.empty) {
            existingPatientQuery.forEach(doc => {
                if (doc.data().name.trim() === props.patientName.trim()) {
                    matchedPatientDoc = doc;
                }
            });
        }

        if (!matchedPatientDoc) {
            let historyArray = [];
            if(props.history && props.history.length > 0) {
                historyArray = props.history.split(' ، ').map(item => item.trim()).filter(i => i);
            }

            const newPat = await db.collection("Patients").add({
                clinicId: currentClinicId,
                name: props.patientName,
                phone: patientPhone,
                age: props.age || '',
                gender: props.gender || '',
                medicalHistory: historyArray,
                notes: props.notes || '', 
                totalDebt: remainingAmount,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            patientId = newPat.id;
        } else {
            patientId = matchedPatientDoc.id;
            if (remainingAmount > 0) {
                await db.collection("Patients").doc(patientId).update({
                    totalDebt: firebase.firestore.FieldValue.increment(remainingAmount)
                });
            }
        }

        const d = new Date();
        const currentPayDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        await db.collection("Sessions").add({
            clinicId: currentClinicId,
            patientId: patientId,
            date: currentPayDate,
            procedure: props.type || "كشف / إجراء",
            total: props.total || 0,
            paid: paidAmount,
            remaining: remainingAmount,
            notes: props.notes || "",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // 🔴 رمي الإيراد في الخزنة مع طريقة الدفع 🔴
        if (paidAmount > 0) {
            await db.collection("Finances").add({
                clinicId: currentClinicId,
                patientId: patientId,
                type: 'income',
                category: 'كشف / جلسة',
                amount: paidAmount,
                date: currentPayDate,
                paymentMethod: paymentMethod, // السر هنا
                notes: `إيراد حجز مريض: ${props.patientName} - (${props.type})`,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        if (remainingAmount > 0) {
            await db.collection("Finances").add({
                clinicId: currentClinicId,
                patientId: patientId,
                type: 'debt', 
                category: 'متبقي كشف / جلسة',
                amount: remainingAmount,
                date: currentPayDate,
                notes: `مديونية متبقية على المريض: ${props.patientName} - (${props.type})`,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        alert(document.body.dir === 'rtl' ? "✅ تم إتمام الحجز، وتسجيل الإيراد والمديونية بنجاح!" : "✅ Appointment completed successfully!");
        closeAppDetailsModal();
    } catch (error) {
        console.error("Error completing app:", error);
        alert(document.body.dir === 'rtl' ? "حدث خطأ أثناء إتمام العملية." : "Error completing appointment.");
    } finally {
        btn.innerText = window.calendarLang.btnCompleteApp;
        btn.disabled = false;
        if (window.hideLoader) window.hideLoader();
    }
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
        if(props.history) {
            const parts = props.history.split(' ، ');
            parts.forEach(part => {
                const cb = document.querySelector(`.med-history-cb[value="${part}"]`);
                if(cb) cb.checked = true;
                else remainingNotes.push(part);
            });
        }
        document.getElementById('app_history').value = remainingNotes.join(' ، ');

        document.getElementById('app_date').value = props.date;
        document.getElementById('app_time').value = props.time;
        document.getElementById('app_type').value = props.type;
        document.getElementById('app_notes').value = props.notes || '';
        
        document.getElementById('app_total').value = props.total || '0';
        document.getElementById('app_paid').value = props.paid || '0';
        document.getElementById('app_remaining').value = props.remaining || '0';
        // 🔴 استدعاء طريقة الدفع في التعديل 🔴
        document.getElementById('app_pay_method').value = props.payMethod || 'cash';

        document.getElementById('modal-title').innerText = window.calendarLang.mTitleEdit;
        document.getElementById('btn-save').innerText = window.calendarLang.btnUpdate;
        
        closeAppDetailsModal(); 
        document.getElementById('appointmentModal').style.display = 'flex';
    } catch (e) { console.error(e); }
}

async function cancelAppointment() {
    const appId = document.getElementById('appDetailsModal').getAttribute('data-current-id');
    if (!appId) return;

    if (confirm(window.calendarLang.confDel)) { 
        if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري الإلغاء..." : "Cancelling...");
        try {
            await db.collection("Appointments").doc(appId).update({ status: 'cancelled' });
            closeAppDetailsModal();
        } catch (error) { 
            console.error("Error cancelling:", error); 
        } finally {
            if (window.hideLoader) window.hideLoader();
        }
    }
}

async function restoreAppointment() {
    const appId = document.getElementById('appDetailsModal').getAttribute('data-current-id');
    if (!appId) return;

    if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري الإرجاع..." : "Restoring...");
    try {
        await db.collection("Appointments").doc(appId).update({ status: 'pending' });
        closeAppDetailsModal();
    } catch (error) { 
        console.error("Error restoring:", error); 
    } finally {
        if (window.hideLoader) window.hideLoader();
    }
}

async function deleteAppointment() {
    const appId = document.getElementById('appDetailsModal').getAttribute('data-current-id');
    if (!appId) return;

    if (confirm(window.calendarLang.confDel)) {
        if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري الحذف..." : "Deleting...");
        try {
            await db.collection("Appointments").doc(appId).delete();
            closeAppDetailsModal();
        } catch (error) { 
            console.error("Error deleting:", error); 
        } finally {
            if (window.hideLoader) window.hideLoader();
        }
    }
}

function loadAppointments() {
    if (!currentClinicId || !calendar) return;

    if (window.showLoader && calendar.getEvents().length === 0) window.showLoader(document.body.dir === 'rtl' ? "جاري مزامنة المواعيد..." : "Syncing appointments...");

    db.collection("Appointments")
      .where("clinicId", "==", currentClinicId)
      .onSnapshot(snap => {
        calendar.removeAllEvents();
        snap.forEach(doc => {
            const data = doc.data();
            const safeTime = data.time || "12:00"; 
            const startDateTime = `${data.date}T${safeTime}:00`;

            let finalColor = data.color || '#0284C7';
            if(data.status === 'completed') finalColor = '#94a3b8';
            if(data.status === 'cancelled') finalColor = '#ef4444'; 

            calendar.addEvent({
                id: doc.id,
                title: `${data.patientName}`,
                start: startDateTime,
                backgroundColor: finalColor,
                borderColor: finalColor,
                extendedProps: {
                    patientName: data.patientName, phone: data.phone,
                    age: data.age, gender: data.gender, history: data.history,
                    type: data.type, notes: data.notes, status: data.status,
                    date: data.date, time: safeTime, total: data.total,
                    paid: data.paid, remaining: data.remaining,
                    payMethod: data.payMethod || 'cash' // 🔴 إرسالها لخصائص الإيفنت
                }
            });
        });
        if (window.hideLoader) window.hideLoader();
    }, error => {
        if (window.hideLoader) window.hideLoader();
    });
}

window.onload = () => {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.body.dir = lang === 'en' ? 'ltr' : 'rtl';
    
    if(window.translations) {
        updatePageContent(lang);
    } else {
        setTimeout(() => updatePageContent(lang), 500);
    }
    
    firebase.auth().onAuthStateChanged((user) => {
        if (user) { initCalendar(); }
    });
};

window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
});
