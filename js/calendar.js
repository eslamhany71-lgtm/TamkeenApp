const db = firebase.firestore();
let currentClinicId = sessionStorage.getItem('clinicId');
let calendar; 
let currentEditAppId = null;

function updatePageContent(lang) {
    const t = {
        ar: {
            title: "أجندة المواعيد", sub: "إدارة حجوزات العيادة وتنظيم وقت الطبيب", btnAdd: "حجز موعد جديد",
            mTitle: "حجز موعد جديد", mTitleEdit: "تعديل موعد", lName: "اسم المريض", lDate: "تاريخ الموعد", lTime: "الساعة", lType: "نوع الكشف / الجلسة",
            optNew: "كشف جديد", optFollow: "استشارة / متابعة", optSess: "جلسة علاجية", lNotes: "ملاحظات (اختياري)", btnSave: "تأكيد الحجز",
            btnUpdate: "تحديث الموعد", btnDelete: "حذف الموعد", confDelete: "هل أنت متأكد من حذف هذا الموعد؟"
        },
        en: {
            title: "Appointments Calendar", sub: "Clinic bookings and scheduling", btnAdd: "Book Appointment",
            mTitle: "Book Appointment", mTitleEdit: "Edit Appointment", lName: "Patient Name", lDate: "Date", lTime: "Time", lType: "Type",
            optNew: "New Checkup", optFollow: "Follow-up", optSess: "Treatment Session", lNotes: "Notes (Optional)", btnSave: "Confirm Booking",
            btnUpdate: "Update", btnDelete: "Delete", confDelete: "Delete this appointment permanently?"
        }
    };
    const c = t[lang] || t.ar;
    const setTxt = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };
    setTxt('txt-title', c.title); setTxt('txt-subtitle', c.sub); setTxt('btn-add-txt', c.btnAdd);
    setTxt('modal-title', c.mTitle); setTxt('lbl-app-name', c.lName); setTxt('lbl-app-date', c.lDate);
    setTxt('lbl-app-time', c.lTime); setTxt('lbl-app-type', c.lType); setTxt('lbl-app-notes', c.lNotes);
    setTxt('opt-new', c.optNew); setTxt('opt-follow', c.optFollow); setTxt('opt-session', c.optSess); setTxt('btn-save', c.btnSave);
    window.calendarStrings = c;
}

// الفتح للإضافة
function openAppointmentModal() {
    currentEditAppId = null;
    const form = document.getElementById('addAppointmentForm');
    if(form) {
        form.reset();
        document.getElementById('modal-title').innerText = window.calendarStrings.mTitle;
        document.getElementById('btn-save').innerText = window.calendarStrings.btnSave;
        document.getElementById('appointmentModal').style.display = 'flex';
    } else {
        console.error("Form not found! Check if ID is 'addAppointmentForm'");
    }
}

// الفتح للتعديل
async function openEditModal(appId) {
    currentEditAppId = appId;
    try {
        const doc = await db.collection("Appointments").doc(appId).get();
        if (doc.exists) {
            const data = doc.data();
            document.getElementById('app_name').value = data.patientName;
            document.getElementById('app_date').value = data.date;
            document.getElementById('app_time').value = data.time;
            document.getElementById('app_type').value = data.type;
            document.getElementById('app_notes').value = data.notes || '';
            document.getElementById('modal-title').innerText = window.calendarStrings.mTitleEdit;
            document.getElementById('btn-save').innerText = window.calendarStrings.btnUpdate;
            closeAppDetailsModal();
            document.getElementById('appointmentModal').style.display = 'flex';
        }
    } catch (e) { console.error(e); }
}

function closeAppointmentModal() { document.getElementById('appointmentModal').style.display = 'none'; }
function closeAppDetailsModal() { document.getElementById('appDetailsModal').style.display = 'none'; }

async function deleteAppointment() {
    const appId = document.getElementById('appDetailsModal').getAttribute('data-current-id');
    if (confirm(window.calendarStrings.confDelete)) {
        try {
            await db.collection("Appointments").doc(appId).delete();
            closeAppDetailsModal();
        } catch (e) { console.error(e); }
    }
}

function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    const lang = localStorage.getItem('preferredLang') || 'ar';
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek', 
        locale: lang === 'ar' ? 'ar' : 'en',
        direction: lang === 'ar' ? 'rtl' : 'ltr',
        editable: true,
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' },
        slotMinTime: '09:00:00', slotMaxTime: '22:00:00', allDaySlot: false,
        eventClick: function(info) {
            const props = info.event.extendedProps;
            const appId = info.event.id;
            document.getElementById('appDetailsModal').setAttribute('data-current-id', appId);
            document.getElementById('det_name').innerText = props.patientName;
            document.getElementById('det_date').innerText = info.event.start.toLocaleDateString();
            document.getElementById('det_time').innerText = info.event.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            document.getElementById('det_type').innerText = props.type;
            document.getElementById('det_notes').innerText = props.notes || '---';
            
            // إضافة أزرار الأكشن
            renderActionButtons(appId);
            document.getElementById('appDetailsModal').style.display = 'flex';
        },
        eventDrop: async function(info) {
            const newDate = info.event.startStr.split('T')[0];
            const newTime = info.event.startStr.split('T')[1].substring(0, 5);
            try { await db.collection("Appointments").doc(info.event.id).update({ date: newDate, time: newTime }); } 
            catch (e) { info.revert(); }
        }
    });
    calendar.render();
    loadAppointments(); 
}

function renderActionButtons(appId) {
    let footer = document.getElementById('modal-action-footer');
    if (!footer) {
        footer = document.createElement('div');
        footer.id = 'modal-action-footer';
        footer.style = "margin-top:20px; display:flex; gap:10px;";
        document.querySelector('#appDetailsModal .modal-content').appendChild(footer);
    }
    footer.innerHTML = `
        <button class="btn-primary" onclick="openEditModal('${appId}')" style="flex:1;">✏️</button>
        <button class="btn-danger" onclick="deleteAppointment()" style="flex:1; background:#ef4444; color:white; border:none; border-radius:8px;">🗑️</button>
    `;
}

async function saveAppointment(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save');
    btn.disabled = true; btn.innerText = "...";
    const typeVal = document.getElementById('app_type').value;
    let eventColor = '#0284C7'; 
    if (typeVal.includes('استشارة')) eventColor = '#f59e0b'; 
    if (typeVal.includes('جلسة')) eventColor = '#10b981'; 

    const appData = {
        clinicId: currentClinicId,
        patientName: document.getElementById('app_name').value.trim(),
        date: document.getElementById('app_date').value,
        time: document.getElementById('app_time').value,
        type: typeVal,
        notes: document.getElementById('app_notes').value.trim(),
        color: eventColor,
        status: 'pending'
    };

    try {
        if (currentEditAppId) { await db.collection("Appointments").doc(currentEditAppId).update(appData); } 
        else { appData.createdAt = firebase.firestore.FieldValue.serverTimestamp(); await db.collection("Appointments").add(appData); }
        closeAppointmentModal();
    } catch (error) { alert("Error saving!"); }
    finally { btn.disabled = false; btn.innerText = currentEditAppId ? window.calendarStrings.btnUpdate : window.calendarStrings.btnSave; }
}

function loadAppointments() {
    if (!currentClinicId || !calendar) return;
    db.collection("Appointments").where("clinicId", "==", currentClinicId).onSnapshot(snap => {
        calendar.removeAllEvents();
        snap.forEach(doc => {
            const data = doc.data();
            calendar.addEvent({
                id: doc.id,
                title: `${data.patientName}`,
                start: `${data.date}T${data.time}:00`,
                backgroundColor: data.color || '#0284C7',
                extendedProps: { patientName: data.patientName, type: data.type, notes: data.notes, status: data.status }
            });
        });
    });
}

window.onload = () => {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.body.dir = lang === 'en' ? 'ltr' : 'rtl';
    updatePageContent(lang);
    firebase.auth().onAuthStateChanged((user) => { if (user) initCalendar(); });
};
