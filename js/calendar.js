// js/calendar.js

const db = firebase.firestore();
let currentClinicId = sessionStorage.getItem('clinicId');
let calendar; 

function updatePageContent(lang) {
    const t = {
        ar: {
            title: "أجندة المواعيد", sub: "إدارة حجوزات العيادة وتنظيم وقت الطبيب", btnAdd: "حجز موعد جديد",
            mTitle: "حجز موعد جديد", lName: "اسم المريض", lDate: "تاريخ الموعد", lTime: "الساعة", lType: "نوع الكشف / الجلسة",
            optNew: "كشف جديد", optFollow: "استشارة / متابعة", optSess: "جلسة علاجية", lNotes: "ملاحظات (اختياري)", btnSave: "تأكيد الحجز"
        },
        en: {
            title: "Appointments Calendar", sub: "Manage clinic bookings and organize doctor's time", btnAdd: "Book Appointment",
            mTitle: "Book New Appointment", lName: "Patient Name", lDate: "Appointment Date", lTime: "Time", lType: "Session Type",
            optNew: "New Checkup", optFollow: "Follow-up", optSess: "Treatment Session", lNotes: "Notes (Optional)", btnSave: "Confirm Booking"
        }
    };
    const c = t[lang] || t.ar;
    const setTxt = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };

    setTxt('txt-title', c.title); setTxt('txt-subtitle', c.sub); setTxt('btn-add-txt', c.btnAdd);
    setTxt('modal-title', c.mTitle); setTxt('lbl-app-name', c.lName); setTxt('lbl-app-date', c.lDate);
    setTxt('lbl-app-time', c.lTime); setTxt('lbl-app-type', c.lType); setTxt('lbl-app-notes', c.lNotes);
    setTxt('opt-new', c.optNew); setTxt('opt-follow', c.optFollow); setTxt('opt-session', c.optSess); setTxt('btn-save', c.btnSave);
}

function openAppointmentModal() {
    document.getElementById('addAppointmentForm').reset();
    document.getElementById('appointmentModal').style.display = 'flex';
}
function closeAppointmentModal() {
    document.getElementById('appointmentModal').style.display = 'none';
}

function closeAppDetailsModal() {
    document.getElementById('appDetailsModal').style.display = 'none';
}

function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    const lang = localStorage.getItem('preferredLang') || 'ar';
    
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek', 
        locale: lang === 'ar' ? 'ar' : 'en',
        direction: lang === 'ar' ? 'rtl' : 'ltr',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        slotMinTime: '09:00:00', 
        slotMaxTime: '22:00:00',
        allDaySlot: false,
        events: [],
        
        // السر هنا: لما تدوس على الموعد يفتح المودال بالتفاصيل
        eventClick: function(info) {
            const props = info.event.extendedProps;
            document.getElementById('det_name').innerText = props.patientName;
            
            // تظبيط شكل التاريخ والوقت
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
        }
    });
    
    calendar.render();
    loadAppointments(); 
}

async function saveAppointment(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save');
    btn.disabled = true; btn.innerText = "...";

    if (!currentClinicId) { alert("حدث خطأ: لم يتم التعرف على العيادة!"); return; }

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
        status: 'pending', 
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection("Appointments").add(appData);
        closeAppointmentModal();
        alert("تم حجز الموعد بنجاح!");
    } catch (error) {
        console.error("Error adding appointment: ", error);
        alert("حدث خطأ أثناء الحفظ");
    } finally {
        const lang = localStorage.getItem('preferredLang') || 'ar';
        btn.disabled = false; btn.innerText = lang === 'ar' ? "تأكيد الحجز" : "Confirm Booking";
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

            calendar.addEvent({
                id: doc.id,
                title: `${data.patientName} (${data.type})`,
                start: startDateTime,
                backgroundColor: data.color || '#0284C7',
                borderColor: data.color || '#0284C7',
                // بنخزن الداتا الإضافية هنا عشان المودال يقرأها
                extendedProps: {
                    patientName: data.patientName,
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
        if (user) {
            initCalendar();
        }
    });
};
