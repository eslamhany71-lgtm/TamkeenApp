const db = firebase.firestore();
let currentClinicId = sessionStorage.getItem('clinicId');
let calendar; 
let currentEditAppId = null; 

function updatePageContent(lang) {
    const t = {
        ar: {
            title: "أجندة المواعيد", sub: "إدارة حجوزات العيادة وتنظيم وقت الطبيب", btnAdd: "حجز موعد جديد",
            mTitle: "حجز موعد جديد", mTitleEdit: "تعديل موعد", lName: "اسم المريض", lDate: "تاريخ الموعد", lTime: "الساعة", lType: "نوع الكشف / الجلسة",
            optNew: "كشف جديد", optFollow: "استشارة / متابعة", optSess: "جلسة علاجية", lNotes: "ملاحظات الحجز (اختياري)", btnSave: "تأكيد الحجز", btnUpdate: "تحديث الموعد",
            detTitle: "تفاصيل الحجز", lblDetName: "اسم المريض:", lblDetDate: "التاريخ:", lblDetTime: "الساعة:", lblDetType: "نوع الكشف:", lblDetNotes: "ملاحظات:", lblDetStatus: "الحالة:",
            btnEdit: "✏️ تعديل", btnDel: "🗑️ حذف", confDel: "هل أنت متأكد من حذف هذا الموعد نهائياً؟", errSave: "حدث خطأ أثناء الحفظ!", msgDrag: "تم تغيير الموعد بنجاح!"
        },
        en: {
            title: "Appointments Calendar", sub: "Manage clinic bookings and organize doctor's time", btnAdd: "Book Appointment",
            mTitle: "Book New Appointment", mTitleEdit: "Edit Appointment", lName: "Patient Name", lDate: "Date", lTime: "Time", lType: "Session Type",
            optNew: "New Checkup", optFollow: "Follow-up", optSess: "Treatment Session", lNotes: "Notes (Optional)", btnSave: "Confirm Booking", btnUpdate: "Update Booking",
            detTitle: "Booking Details", lblDetName: "Patient:", lblDetDate: "Date:", lblDetTime: "Time:", lblDetType: "Type:", lblDetNotes: "Notes:", lblDetStatus: "Status:",
            btnEdit: "✏️ Edit", btnDel: "🗑️ Delete", confDel: "Are you sure you want to permanently delete this appointment?", errSave: "Error saving appointment!", msgDrag: "Appointment updated successfully!"
        }
    };
    const c = t[lang] || t.ar;
    const setTxt = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };
    const setClassTxt = (cls, txt) => { document.querySelectorAll('.'+cls).forEach(el => el.innerText = txt); };

    setTxt('txt-title', c.title); setTxt('txt-subtitle', c.sub); setTxt('btn-add-txt', c.btnAdd);
    if(document.getElementById('modal-title')) setTxt('modal-title', c.mTitle);
    setTxt('lbl-app-name', c.lName); setTxt('lbl-app-date', c.lDate);
    setTxt('lbl-app-time', c.lTime); setTxt('lbl-app-type', c.lType); setTxt('lbl-app-notes', c.lNotes);
    setTxt('opt-new', c.optNew); setTxt('opt-follow', c.optFollow); setTxt('opt-session', c.optSess); setTxt('btn-save', c.btnSave);
    
    if(document.getElementById('det-modal-title')) setTxt('det-modal-title', c.detTitle);
    setClassTxt('lbl-det-name', c.lblDetName); setClassTxt('lbl-det-date', c.lblDetDate); setClassTxt('lbl-det-time', c.lblDetTime); 
    setClassTxt('lbl-det-type', c.lblDetType); setClassTxt('lbl-det-notes', c.lblDetNotes); setClassTxt('lbl-det-status', c.lblDetStatus);

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
    
    // تفريغ الـ Checkboxes
    document.querySelectorAll('.med-history-cb').forEach(cb => cb.checked = false);
    
    document.getElementById('app_total').value = '0';
    document.getElementById('app_paid').value = '0';
    document.getElementById('app_remaining').value = '0';
    
    document.getElementById('modal-title').innerText = window.calendarLang.mTitle;
    document.getElementById('btn-save').innerText = window.calendarLang.btnSave;
    document.getElementById('appointmentModal').style.display = 'flex';
}

function closeAppointmentModal() { document.getElementById('appointmentModal').style.display = 'none'; }
function closeAppDetailsModal() { document.getElementById('appDetailsModal').style.display = 'none'; }

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
            
            // إظهار التاريخ الطبي
            document.getElementById('det_history').innerText = props.history && props.history !== "" ? props.history : (lang === 'ar' ? "سليم (لا يوجد)" : "Healthy (None)");
            
            const paid = props.paid || 0;
            const total = props.total || 0;
            document.getElementById('det_finance').innerText = `${paid} / ${total}`;

            document.getElementById('det_notes').innerText = props.notes || (lang === 'ar' ? 'لا يوجد ملاحظات' : 'No notes');
            
            let statusTxt = lang === 'ar' ? 'في الانتظار' : 'Pending';
            if(props.status === 'completed') statusTxt = lang === 'ar' ? 'مكتمل' : 'Completed';
            if(props.status === 'cancelled') statusTxt = lang === 'ar' ? 'ملغي' : 'Cancelled';
            document.getElementById('det_status').innerText = statusTxt;

            // لوجيك إظهار وإخفاء الزراير (بما فيها الواتساب)
            if(props.status === 'completed' || props.status === 'cancelled') {
                document.getElementById('whatsapp-action-box').style.display = 'none'; // نخفي الواتساب لو الموعد خلص أو اتلغى
                document.getElementById('complete-action-box').style.display = 'none';
                document.getElementById('edit-action-box').style.display = 'none';
                document.getElementById('cancel-action-box').style.display = 'none';
                document.getElementById('restore-action-box').style.display = props.status === 'cancelled' ? 'block' : 'none';
            } else {
                document.getElementById('whatsapp-action-box').style.display = 'block'; // نظهر الواتساب في الانتظار
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

// 🔴 اللوجيك السحري: إرسال الواتساب (ضغطة واحدة، بدون تابات مزعجة) 🔴
function sendWhatsAppReminder() {
    const rawData = document.getElementById('appDetailsModal').getAttribute('data-full-info');
    if (!rawData) return;
    
    const props = JSON.parse(rawData);
    let phone = props.phone;
    const isAr = (localStorage.getItem('preferredLang') || 'ar') === 'ar';
    
    // تأكد إن الرقم مكتوب وصحيح
    if (!phone || phone.length < 9) {
        alert(isAr ? "عفواً، لا يوجد رقم موبايل صالح مسجل لهذا المريض." : "Sorry, no valid phone number recorded for this patient.");
        return;
    }

    // تنظيف الرقم وإضافة كود الدولة (+20 لمصر كمثال، ممكن يتعدل)
    phone = phone.replace(/\D/g, ''); // إزالة أي مسافات أو حروف
    if (phone.startsWith('0')) {
        phone = '2' + phone; // تحويل 010... إلى 2010...
    } else if (!phone.startsWith('20')) {
        phone = '20' + phone; // افتراض كود مصر لو مش مكتوب
    }

    // تجهيز الرسالة
    let message = "";
    if (isAr) {
        message = `مرحباً أستاذ/ة *${props.patientName}* 👋\n\nنذكركم بموعدكم القادم في عيادتنا يوم *${props.date}* الساعة *${props.time}*.\n\nيرجى تأكيد الحضور أو إبلاغنا في حالة الاعتذار. نتمنى لكم دوام الصحة والعافية! 🦷✨`;
    } else {
        message = `Hello *${props.patientName}* 👋\n\nThis is a friendly reminder for your upcoming appointment at our clinic on *${props.date}* at *${props.time}*.\n\nPlease confirm your attendance. Wishing you a healthy smile! 🦷✨`;
    }

    // استخدام App Protocol لفتح البرنامج مباشرة بدون متصفح (ولو فشل بيفتح المتصفح العادي)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const whatsappUrl = isMobile 
        ? `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`
        : `https://api.whatsapp.com/send/?phone=${phone}&text=${encodeURIComponent(message)}`;

    // فتح الواتساب باستخدام اسم تابة محدد لتجنب فتح 100 تابة
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
    if (typeVal.includes('استشارة')) eventColor = '#f59e0b'; 
    if (typeVal.includes('جلسة')) eventColor = '#10b981'; 

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
        
        if (paidAmount > 0) {
            await db.collection("Finances").add({
                clinicId: currentClinicId,
                patientId: patientId,
                type: 'income',
                category: 'كشف / جلسة',
                amount: paidAmount,
                date: currentPayDate,
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

        alert(document.body.dir === 'rtl' ? "✅ تم إتمام الحجز وتسجيل الإيراد بنجاح!" : "✅ Appointment completed successfully!");
        closeAppDetailsModal();
    } catch (error) {
        console.error("Error completing app:", error);
        alert(document.body.dir === 'rtl' ? "حدث خطأ أثناء الإتمام." : "Error completing appointment.");
    } finally {
        btn.innerText = "✅ المريض حضر (اكتمال الحجز وتوريد الإيراد)";
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

        document.getElementById('modal-title').innerText = window.calendarLang.mTitleEdit;
        document.getElementById('btn-save').innerText = window.calendarLang.btnUpdate;
        
        closeAppDetailsModal(); 
        document.getElementById('appointmentModal').style.display = 'flex';
    } catch (e) { console.error(e); }
}

async function cancelAppointment() {
    const appId = document.getElementById('appDetailsModal').getAttribute('data-current-id');
    if (!appId) return;

    const msg = document.body.dir === 'rtl' ? "هل أنت متأكد من إلغاء هذا الحجز؟ (سيبقى في الأجندة كـ ملغي)" : "Are you sure you want to cancel this appointment?";
    
    if (confirm(msg)) {
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
                    paid: data.paid, remaining: data.remaining
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
    updatePageContent(lang);
    
    firebase.auth().onAuthStateChanged((user) => {
        if (user) { initCalendar(); }
    });
};

window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
});
