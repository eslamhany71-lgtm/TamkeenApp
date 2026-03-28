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
    setTxt('btn-edit-app', c.btnEdit); setTxt('btn-del-app', c.btnDel);
    setClassTxt('lbl-det-name', c.lblDetName); setClassTxt('lbl-det-date', c.lblDetDate); setClassTxt('lbl-det-time', c.lblDetTime); 
    setClassTxt('lbl-det-type', c.lblDetType); setClassTxt('lbl-det-notes', c.lblDetNotes); setClassTxt('lbl-det-status', c.lblDetStatus);

    window.calendarLang = c;
}

function openAppointmentModal() {
    currentEditAppId = null; 
    document.getElementById('addAppointmentForm').reset();
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
        slotMinTime: '09:00:00', 
        slotMaxTime: '22:00:00',
        allDaySlot: false,
        events: [],
        
        eventClick: function(info) {
            const props = info.event.extendedProps;
            const appId = info.event.id;
            
            document.getElementById('appDetailsModal').setAttribute('data-current-id', appId);
            // حفظ الداتا في المودال عشان نستخدمها وقت الكريت
            document.getElementById('appDetailsModal').setAttribute('data-full-info', JSON.stringify(props));

            document.getElementById('det_name').innerText = props.patientName;
            document.getElementById('det_phone').innerText = props.phone || '---';
            const dateObj = new Date(info.event.start);
            document.getElementById('det_date').innerText = dateObj.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US');
            document.getElementById('det_time').innerText = dateObj.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', {hour: '2-digit', minute:'2-digit'});
            document.getElementById('det_type').innerText = props.type;
            document.getElementById('det_notes').innerText = props.notes || (lang === 'ar' ? 'لا يوجد ملاحظات' : 'No notes');
            
            let statusTxt = lang === 'ar' ? 'في الانتظار' : 'Pending';
            if(props.status === 'completed') statusTxt = lang === 'ar' ? 'مكتمل' : 'Completed';
            if(props.status === 'cancelled') statusTxt = lang === 'ar' ? 'ملغي' : 'Cancelled';
            document.getElementById('det_status').innerText = statusTxt;

            // إخفاء زرار الاكتمال لو هو أصلاً مكتمل
            if(props.status === 'completed' || props.status === 'cancelled') {
                document.getElementById('complete-action-box').style.display = 'none';
            } else {
                document.getElementById('complete-action-box').style.display = 'block';
            }

            document.getElementById('appDetailsModal').style.display = 'flex';
        },

        eventDrop: async function(info) {
            const newDate = info.event.startStr.split('T')[0];
            const newTime = info.event.startStr.split('T')[1].substring(0, 5);
            try {
                await db.collection("Appointments").doc(info.event.id).update({
                    date: newDate,
                    time: newTime
                });
            } catch (error) {
                console.error("Error moving event:", error);
                info.revert(); 
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

// دالة الحفظ المدمجة مع الداتا الجديدة
async function saveAppointment(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save');
    btn.disabled = true; btn.innerText = "...";

    if (!currentClinicId) { alert("حدث خطأ!"); return; }

    const dateVal = document.getElementById('app_date').value;
    const timeVal = document.getElementById('app_time').value;
    const typeVal = document.getElementById('app_type').value;

    let eventColor = '#0284C7'; 
    if (typeVal.includes('استشارة')) eventColor = '#f59e0b'; 
    if (typeVal.includes('جلسة')) eventColor = '#10b981'; 

    const appData = {
        clinicId: currentClinicId,
        patientName: document.getElementById('app_name').value.trim(),
        phone: document.getElementById('app_phone').value.trim(),
        age: document.getElementById('app_age').value,
        gender: document.getElementById('app_gender').value,
        history: document.getElementById('app_history').value.trim(),
        date: dateVal,
        time: timeVal,
        type: typeVal,
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
    }
}

// 🔴 الدالة السحرية: تحويل الحجز لمريض وتحديث الحالة (Lazy Creation)
async function markAppAsCompleted() {
    const appId = document.getElementById('appDetailsModal').getAttribute('data-current-id');
    const rawData = document.getElementById('appDetailsModal').getAttribute('data-full-info');
    if (!appId || !rawData) return;

    const props = JSON.parse(rawData);
    const btn = document.querySelector('#complete-action-box button');
    btn.innerText = "جاري الحفظ والإنشاء...";
    btn.disabled = true;

    try {
        // 1. تحديث حالة الموعد لـ مكتمل
        await db.collection("Appointments").doc(appId).update({ status: 'completed' });

        // 2. البحث عن المريض برقم الموبايل لمنع التكرار
        const existingPatientQuery = await db.collection("Patients")
            .where("clinicId", "==", currentClinicId)
            .where("phone", "==", props.phone)
            .get();

        if (existingPatientQuery.empty) {
            // 3. لو المريض مش موجود، نكريتله ملف جديد بالداتا اللي اتسجلت وقت الحجز
            let historyArray = [];
            if(props.history && props.history.length > 0) {
                historyArray = props.history.split(',').map(item => item.trim()).filter(i => i);
            }

            await db.collection("Patients").add({
                clinicId: currentClinicId,
                name: props.patientName,
                phone: props.phone,
                age: props.age || '',
                gender: props.gender || '',
                medicalHistory: historyArray,
                notes: props.notes || '', // هنحفظ ملاحظات الحجز في ملف المريض
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            alert("✅ تم اكتمال الحجز وتم إنشاء ملف دائم للمريض بنجاح!");
        } else {
            alert("✅ تم اكتمال الحجز. (ملف المريض موجود بالفعل)");
        }
        
        closeAppDetailsModal();
    } catch (error) {
        console.error("Error completing app:", error);
        alert("حدث خطأ أثناء إتمام العملية.");
    } finally {
        btn.innerText = "✅ المريض حضر (اكتمال الحجز وإنشاء ملف)";
        btn.disabled = false;
    }
}

async function openEditModal() {
    const appId = document.getElementById('appDetailsModal').getAttribute('data-current-id');
    if (!appId) return;

    currentEditAppId = appId;
    try {
        const doc = await db.collection("Appointments").doc(appId).get();
        if (doc.exists) {
            const data = doc.data();
            document.getElementById('app_name').value = data.patientName;
            document.getElementById('app_phone').value = data.phone || '';
            document.getElementById('app_age').value = data.age || '';
            document.getElementById('app_gender').value = data.gender || 'ذكر';
            document.getElementById('app_history').value = data.history || '';
            document.getElementById('app_date').value = data.date;
            document.getElementById('app_time').value = data.time;
            document.getElementById('app_type').value = data.type;
            document.getElementById('app_notes').value = data.notes || '';

            document.getElementById('modal-title').innerText = window.calendarLang.mTitleEdit;
            document.getElementById('btn-save').innerText = window.calendarLang.btnUpdate;
            
            closeAppDetailsModal(); 
            document.getElementById('appointmentModal').style.display = 'flex';
        }
    } catch (e) { console.error(e); }
}

async function deleteAppointment() {
    const appId = document.getElementById('appDetailsModal').getAttribute('data-current-id');
    if (!appId) return;

    if (confirm(window.calendarLang.confDel)) {
        try {
            await db.collection("Appointments").doc(appId).delete();
            closeAppDetailsModal();
        } catch (error) { console.error("Error deleting:", error); }
    }
}

function loadAppointments() {
    if (!currentClinicId || !calendar) return;

    db.collection("Appointments")
      .where("clinicId", "==", currentClinicId)
      .onSnapshot(snap => {
        calendar.removeAllEvents();
        snap.forEach(doc => {
            const data = doc.data();
            const startDateTime = `${data.date}T${data.time}:00`;

            // هنغير لون المواعيد المكتملة لرمادي عشان الدكتور يعرف انها خلصت
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
                    patientName: data.patientName,
                    phone: data.phone,
                    age: data.age,
                    gender: data.gender,
                    history: data.history,
                    type: data.type,
                    notes: data.notes,
                    status: data.status
                }
            });
        });
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
