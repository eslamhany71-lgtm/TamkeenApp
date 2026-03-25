// js/calendar.js

const db = firebase.firestore();
let currentClinicId = sessionStorage.getItem('clinicId');
let calendar; 
let currentEditAppId = null; 

function updatePageContent(lang) {
    const t = {
        ar: {
            title: "أجندة المواعيد", sub: "إدارة حجوزات العيادة وتنظيم وقت الطبيب", btnAdd: "حجز موعد جديد",
            mTitle: "حجز موعد جديد", mEditTitle: "تعديل الموعد", lName: "اسم المريض", lDate: "تاريخ الموعد", lTime: "الساعة", lType: "نوع الكشف / الجلسة",
            optNew: "كشف جديد", optFollow: "استشارة / متابعة", optSess: "جلسة علاجية", lNotes: "ملاحظات (اختياري)", btnSave: "تأكيد الحجز", btnUpdate: "تحديث الموعد", confDel: "هل أنت متأكد من الحذف؟"
        },
        en: {
            title: "Appointments Calendar", sub: "Manage clinic bookings and organize doctor's time", btnAdd: "Book Appointment",
            mTitle: "Book New Appointment", mEditTitle: "Edit Appointment", lName: "Patient Name", lDate: "Appointment Date", lTime: "Time", lType: "Session Type",
            optNew: "New Checkup", optFollow: "Follow-up", optSess: "Treatment Session", lNotes: "Notes (Optional)", btnSave: "Confirm Booking", btnUpdate: "Update Booking", confDel: "Are you sure you want to delete?"
        }
    };
    const c = t[lang] || t.ar;
    const setTxt = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };

    setTxt('txt-title', c.title); setTxt('txt-subtitle', c.sub); setTxt('btn-add-txt', c.btnAdd);
    setTxt('modal-title', c.mTitle); setTxt('lbl-app-name', c.lName); setTxt('lbl-app-date', c.lDate);
    setTxt('lbl-app-time', c.lTime); setTxt('lbl-app-type', c.lType); setTxt('lbl-app-notes', c.lNotes);
    setTxt('opt-new', c.optNew); setTxt('opt-follow', c.optFollow); setTxt('opt-session', c.optSess); setTxt('btn-save', c.btnSave);
    window.calLang = c;
}

function openAppointmentModal() {
    currentEditAppId = null;
    document.getElementById('addAppointmentForm').reset();
    document.getElementById('modal-title').innerText = window.calLang.mTitle;
    document.getElementById('btn-save').innerText = window.calLang.btnSave;
    document.getElementById('appointmentModal').style.display = 'flex';
}

function closeAppointmentModal() { document.getElementById('appointmentModal').style.display = 'none'; }
function closeAppDetailsModal() { document.getElementById('appDetailsModal').style.display = 'none'; }

function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const isMobile = window.innerWidth < 768; // 🔴 فحص الموبايل
    
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: isMobile ? 'timeGridDay' : 'timeGridWeek', // 🔴 لو موبايل يعرض يوم واحد عشان ميبقاش زحمة
        locale: lang === 'ar' ? 'ar' : 'en',
        direction: lang === 'ar' ? 'rtl' : 'ltr',
        editable: true, // 🔴 تفعيل السحب والإفلات
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: isMobile ? 'timeGridDay,listWeek' : 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        slotMinTime: '09:00:00', 
        slotMaxTime: '22:00:00',
        allDaySlot: false,
        events: [],
        
        // 🔴 دالة السحب والإفلات
        eventDrop: async function(info) {
            const newDate = info.event.startStr.split('T')[0];
            const newTime = info.event.startStr.split('T')[1].substring(0, 5);
            try {
                await db.collection("Appointments").doc(info.event.id).update({ date: newDate, time: newTime });
            } catch (error) { info.revert(); }
        },

        // فتح التفاصيل
        eventClick: function(info) {
            const props = info.event.extendedProps;
            document.getElementById('appDetailsModal').setAttribute('data-current-id', info.event.id); // حفظ الـ ID
            document.getElementById('det_name').innerText = props.patientName;
            
            const dateObj = new Date(info.event.start);
            document.getElementById('det_date').innerText = dateObj.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US');
            document.getElementById('det_time').innerText = dateObj.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', {hour: '2-digit', minute:'2-digit'});
            document.getElementById('det_type').innerText = props.type;
            document.getElementById('det_notes').innerText = props.notes || (lang === 'ar' ? 'لا يوجد ملاحظات' : 'No notes');
            
            let statusTxt = 'في الانتظار';
            if(props.status === 'completed') statusTxt = 'مكتمل';
            if(props.status === 'cancelled') statusTxt = 'ملغي';
            document.getElementById('det_status').innerText = statusTxt;

            document.getElementById('appDetailsModal').style.display = 'flex';
        },
        // 🔴 عشان لو لف الموبايل أو كبر الشاشة تتغير طريقة العرض لوحدها
        windowResize: function(arg) {
            if (window.innerWidth < 768) { calendar.changeView('timeGridDay'); } 
            else { calendar.changeView('timeGridWeek'); }
        }
    });
    
    calendar.render();
    loadAppointments(); 
}

// 🔴 دالة التعديل
async function openEditModal() {
    const appId = document.getElementById('appDetailsModal').getAttribute('data-current-id');
    if (!appId) return;
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

            document.getElementById('modal-title').innerText = window.calLang.mEditTitle;
            document.getElementById('btn-save').innerText = window.calLang.btnUpdate;
            
            closeAppDetailsModal();
            document.getElementById('appointmentModal').style.display = 'flex';
        }
    } catch (e) { console.error(e); }
}

// 🔴 دالة الحذف
async function deleteAppointment() {
    const appId = document.getElementById('appDetailsModal').getAttribute('data-current-id');
    if (!appId) return;

    if (confirm(window.calLang.confDel)) {
        try {
            await db.collection("Appointments").doc(appId).delete();
            closeAppDetailsModal();
        } catch (e) { console.error(e); }
    }
}

async function saveAppointment(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save');
    btn.disabled = true; btn.innerText = "...";

    if (!currentClinicId) return;

    const dateVal = document.getElementById('app_date').value;
    const timeVal = document.getElementById('app_time').value;
    const typeVal = document.getElementById('app_type').value;

    let eventColor = '#0284C7'; 
    if (typeVal.includes('استشارة')) eventColor = '#f59e0b'; 
    if (typeVal.includes('جلسة')) eventColor = '#10b981'; 

    const appData = {
        clinicId: currentClinicId,
        patientName: document.getElementById('app_name').value.trim(),
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
    } catch (error) { console.error(error); } 
    finally { btn.disabled = false; btn.innerText = window.calLang.btnSave; }
}

function loadAppointments() {
    if (!currentClinicId || !calendar) return;

    db.collection("Appointments").where("clinicId", "==", currentClinicId).onSnapshot(snap => {
        calendar.removeAllEvents();
        snap.forEach(doc => {
            const data = doc.data();
            const startDateTime = `${data.date}T${data.time}:00`;

            calendar.addEvent({
                id: doc.id,
                title: `${data.patientName}`, // شلت النوع عشان الموبايل المساحة أضيق
                start: startDateTime,
                backgroundColor: data.color || '#0284C7',
                borderColor: data.color || '#0284C7',
                extendedProps: { patientName: data.patientName, type: data.type, notes: data.notes, status: data.status }
            });
        });
    });
}

window.onload = () => {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.body.dir = lang === 'en' ? 'ltr' : 'rtl';
    updatePageContent(lang);
    
    firebase.auth().onAuthStateChanged((user) => { if (user) { initCalendar(); } });
};

// 🔴 دعم اللمس للمودال في صفحة التقويم
['click', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    }, {passive: true});
});
