// js/calendar.js

const db = firebase.firestore();
let currentClinicId = sessionStorage.getItem('clinicId');
let calendar; 
let currentEditAppId = null; // متغير لتخزين ID الموعد اللي بنعدله حالياً

function updatePageContent(lang) {
    const t = {
        ar: {
            title: "أجندة المواعيد", sub: "إدارة حجوزات العيادة وتنظيم وقت الطبيب", btnAdd: "حجز موعد جديد",
            mTitle: "حجز موعد جديد", mTitleEdit: "تعديل موعد", lName: "اسم المريض", lDate: "تاريخ الموعد", lTime: "الساعة", lType: "نوع الكشف / الجلسة",
            optNew: "كشف جديد", optFollow: "استشارة / متابعة", optSess: "جلسة علاجية", lNotes: "ملاحظات (اختياري)", btnSave: "تأكيد الحجز",
            btnUpdate: "تحديث الموعد", btnDelete: "حذف الموعد", confDelete: "هل أنت متأكد من حذف هذا الموعد نهائياً؟"
        },
        en: {
            title: "Appointments Calendar", sub: "Manage clinic bookings and organize doctor's time", btnAdd: "Book Appointment",
            mTitle: "Book New Appointment", mTitleEdit: "Edit Appointment", lName: "Patient Name", lDate: "Appointment Date", lTime: "Time", lType: "Session Type",
            optNew: "New Checkup", optFollow: "Follow-up", optSess: "Treatment Session", lNotes: "Notes (Optional)", btnSave: "Confirm Booking",
            btnUpdate: "Update Appointment", btnDelete: "Delete Appointment", confDelete: "Are you sure you want to delete this appointment permanently?"
        }
    };
    const c = t[lang] || t.ar;
    const setTxt = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };

    setTxt('txt-title', c.title); setTxt('txt-subtitle', c.sub); setTxt('btn-add-txt', c.btnAdd);
    setTxt('modal-title', c.mTitle); setTxt('lbl-app-name', c.lName); setTxt('lbl-app-date', c.lDate);
    setTxt('lbl-app-time', c.lTime); setTxt('lbl-app-type', c.lType); setTxt('lbl-app-notes', c.lNotes);
    setTxt('opt-new', c.optNew); setTxt('opt-follow', c.optFollow); setTxt('opt-session', c.optSess); setTxt('btn-save', c.btnSave);
    
    // حفظ نصوص التنبيهات والزراير للاستخدام البرمجي
    window.calendarStrings = c;
}

// فتح المودال للإضافة
function openAppointmentModal() {
    currentEditAppId = null; // تصفير الـ ID عشان نشتغل إضافة
    document.getElementById('addAppointmentForm').reset();
    document.getElementById('modal-title').innerText = window.calendarStrings.mTitle;
    document.getElementById('btn-save').innerText = window.calendarStrings.btnSave;
    document.getElementById('appointmentModal').style.display = 'flex';
}

// فتح المودال للتعديل
async function openEditModal(appId) {
    currentEditAppId = appId;
    const lang = localStorage.getItem('preferredLang') || 'ar';
    
    try {
        const doc = await db.collection("Appointments").doc(appId).get();
        if (doc.exists) {
            const data = doc.data();
            
            // ملء الفورم بالبيانات الحالية
            document.getElementById('app_name').value = data.patientName;
            document.getElementById('app_date').value = data.date;
            document.getElementById('app_time').value = data.time;
            document.getElementById('app_type').value = data.type;
            document.getElementById('app_notes').value = data.notes || '';

            // تغيير شكل المودال لوضع التعديل
            document.getElementById('modal-title').innerText = window.calendarStrings.mTitleEdit;
            document.getElementById('btn-save').innerText = window.calendarStrings.btnUpdate;
            
            closeAppDetailsModal(); // قفل مودال التفاصيل أولاً
            document.getElementById('appointmentModal').style.display = 'flex';
        }
    } catch (e) { console.error("Error fetching app data:", e); }
}

function closeAppointmentModal() {
    document.getElementById('appointmentModal').style.display = 'none';
}

function closeAppDetailsModal() {
    document.getElementById('appDetailsModal').style.display = 'none';
}

// دالة الحذف
async function deleteAppointment() {
    const appId = document.getElementById('appDetailsModal').getAttribute('data-current-id');
    if (confirm(window.calendarStrings.confDelete)) {
        try {
            await db.collection("Appointments").doc(appId).delete();
            closeAppDetailsModal();
        } catch (e) { console.error("Error deleting:", e); }
    }
}

function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    const lang = localStorage.getItem('preferredLang') || 'ar';
    
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek', 
        locale: lang === 'ar' ? 'ar' : 'en',
        direction: lang === 'ar' ? 'rtl' : 'ltr',
        editable: true, // تفعيل السحب والإفلات
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        slotMinTime: '09:00:00', 
        slotMaxTime: '22:00:00',
        allDaySlot: false,
        events: [],
        
        // عند الضغط على الموعد
        eventClick: function(info) {
            const props = info.event.extendedProps;
            const appId = info.event.id;
            
            document.getElementById('appDetailsModal').setAttribute('data-current-id', appId);
            document.getElementById('det_name').innerText = props.patientName;
            
            const dateObj = new Date(info.event.start);
            document.getElementById('det_date').innerText = dateObj.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US');
            document.getElementById('det_time').innerText = dateObj.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', {hour: '2-digit', minute:'2-digit'});
            
            document.getElementById('det_type').innerText = props.type;
            document.getElementById('det_notes').innerText = props.notes || (lang === 'ar' ? 'لا يوجد ملاحظات' : 'No notes');
            
            let statusTxt = lang === 'ar' ? 'في الانتظار' : 'Pending';
            if(props.status === 'completed') statusTxt = lang === 'ar' ? 'مكتمل' : 'Completed';
            if(props.status === 'cancelled') statusTxt = lang === 'ar' ? 'ملغي' : 'Cancelled';
            document.getElementById('det_status').innerText = statusTxt;

            // إضافة زرار التعديل والحذف ديناميكياً في مودال التفاصيل لو مش موجودين
            renderActionButtons(appId);

            document.getElementById('appDetailsModal').style.display = 'flex';
        },

        // عند سحب الموعد وتغيير وقته بالماوس
        eventDrop: async function(info) {
            const newDate = info.event.startStr.split('T')[0];
            const newTime = info.event.startStr.split('T')[1].substring(0, 5);
            
            try {
                await db.collection("Appointments").doc(info.event.id).update({
                    date: newDate,
                    time: newTime
                });
            } catch (e) {
                info.revert();
                console.error("Update failed:", e);
            }
        }
    });
    
    calendar.render();
    loadAppointments(); 
}

// دالة لإضافة زراير التعديل والحذف في مودال التفاصيل
function renderActionButtons(appId) {
    let actionContainer = document.getElementById('modal-action-footer');
    if (!actionContainer) {
        actionContainer = document.createElement('div');
        actionContainer.id = 'modal-action-footer';
        actionContainer.style = "margin-top:20px; display:flex; gap:10px;";
        document.querySelector('#appDetailsModal .modal-content').appendChild(actionContainer);
    }
    
    actionContainer.innerHTML = `
        <button class="btn-primary" onclick="openEditModal('${appId}')" style="flex:1;">✏️</button>
        <button class="btn-danger" onclick="deleteAppointment()" style="flex:1; background:#ef4444;">🗑️</button>
    `;
}

async function saveAppointment(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save');
    btn.disabled = true; btn.innerText = "...";

    if (!currentClinicId) { alert("حدث خطأ: لم يتم التعرف على العيادة!"); return; }

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
        if (currentEditAppId) {
            // تحديث موعد موجود
            await db.collection("Appointments").doc(currentEditAppId).update(appData);
        } else {
            // إضافة موعد جديد
            appData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection("Appointments").add(appData);
        }
        closeAppointmentModal();
    } catch (error) {
        console.error("Error saving appointment: ", error);
        alert("حدث خطأ أثناء الحفظ");
    } finally {
        btn.disabled = false;
        btn.innerText = currentEditAppId ? window.calendarStrings.btnUpdate : window.calendarStrings.btnSave;
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
