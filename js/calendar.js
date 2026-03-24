const db = firebase.firestore();
let currentClinicId = sessionStorage.getItem('clinicId');
let calendar; // المتغير اللي هيشيل النتيجة

// 1. نظام الترجمة
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

// 2. دوال النافذة المنبثقة
function openAppointmentModal() {
    document.getElementById('addAppointmentForm').reset();
    document.getElementById('appointmentModal').style.display = 'flex';
}
function closeAppointmentModal() {
    document.getElementById('appointmentModal').style.display = 'none';
}

// 3. بناء النتيجة (FullCalendar)
function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    const lang = localStorage.getItem('preferredLang') || 'ar';
    
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek', // عرض الأسبوع بالساعات
        locale: lang === 'ar' ? 'ar' : 'en',
        direction: lang === 'ar' ? 'rtl' : 'ltr',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        slotMinTime: '09:00:00', // بداية الشغل 9 الصبح
        slotMaxTime: '22:00:00', // نهاية الشغل 10 بالليل
        allDaySlot: false,
        events: [] // هنجيبها من الفايربيز
    });
    
    calendar.render();
    loadAppointments(); // تحميل المواعيد بعد رسم النتيجة
}

// 4. حفظ الموعد في الفايربيز
async function saveAppointment(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save');
    btn.disabled = true; btn.innerText = "...";

    if (!currentClinicId) { alert("حدث خطأ: لم يتم التعرف على العيادة!"); return; }

    const dateVal = document.getElementById('app_date').value;
    const timeVal = document.getElementById('app_time').value;
    const typeVal = document.getElementById('app_type').value;

    // تحديد لون الموعد بناءً على نوعه
    let eventColor = '#0284C7'; // أزرق للكشف
    if (typeVal.includes('استشارة')) eventColor = '#f59e0b'; // برتقالي
    if (typeVal.includes('جلسة')) eventColor = '#10b981'; // أخضر

    const appData = {
        clinicId: currentClinicId,
        patientName: document.getElementById('app_name').value.trim(),
        date: dateVal,
        time: timeVal,
        type: typeVal,
        notes: document.getElementById('app_notes').value.trim(),
        color: eventColor,
        status: 'pending', // حالة الموعد (في الانتظار)
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

// 5. جلب المواعيد وعرضها في النتيجة
function loadAppointments() {
    if (!currentClinicId || !calendar) return;

    db.collection("Appointments")
      .where("clinicId", "==", currentClinicId)
      .onSnapshot(snap => {
        
        // مسح المواعيد القديمة من النتيجة قبل وضع الجديدة (عشان التكرار)
        calendar.removeAllEvents();

        snap.forEach(doc => {
            const data = doc.data();
            
            // دمج التاريخ والوقت عشان النتيجة تفهمه
            const startDateTime = `${data.date}T${data.time}:00`;

            calendar.addEvent({
                id: doc.id,
                title: `${data.patientName} (${data.type})`,
                start: startDateTime,
                backgroundColor: data.color || '#0284C7',
                borderColor: data.color || '#0284C7'
            });
        });
    });
}

// 6. التشغيل عند التحميل
window.onload = () => {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.body.dir = lang === 'en' ? 'ltr' : 'rtl';
    updatePageContent(lang);
    
    // التأكد من تسجيل الدخول قبل رسم النتيجة وجلب الداتا
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            initCalendar();
        }
    });
};
