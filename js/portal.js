// js/portal.js - النسخة الذكية جداً (Live Time & Patient Matching)

const db = firebase.firestore();
const urlParams = new URLSearchParams(window.location.search);
const clinicId = urlParams.get('clinicId'); 

function showLoader(text = "جاري التحميل...") {
    document.getElementById('loader-text').innerText = text;
    document.getElementById('loader').style.display = 'flex';
}
function hideLoader() { document.getElementById('loader').style.display = 'none'; }

window.onload = () => {
    if (!clinicId) {
        document.getElementById('login-error').innerText = "رابط العيادة غير صحيح أو مفقود!";
        document.getElementById('login-error').style.display = 'block';
        document.getElementById('btn-login').disabled = true;
        return;
    }

    const savedPatient = sessionStorage.getItem(`patient_${clinicId}`);
    if (savedPatient) {
        const patientData = JSON.parse(savedPatient);
        loadDashboard(patientData);
    }
};

// ==========================================
// اللوجيك الخاص بتسجيل الدخول للمرضى المسجلين
// ==========================================
async function patientLogin(e) {
    e.preventDefault();
    const phoneInput = document.getElementById('patient_phone').value.trim();
    const errorDiv = document.getElementById('login-error');
    errorDiv.style.display = 'none';

    if (!phoneInput) return;

    showLoader("جاري البحث عن ملفك الطبي...");
    
    try {
        const snap = await db.collection("Patients")
            .where("clinicId", "==", clinicId)
            .where("phone", "==", phoneInput)
            .get();

        if (snap.empty) {
            errorDiv.innerText = "لم نتمكن من العثور على ملف طبي بهذا الرقم في هذه العيادة.";
            errorDiv.style.display = 'block';
        } else {
            const patientData = snap.docs[0].data();
            patientData.id = snap.docs[0].id;
            
            sessionStorage.setItem(`patient_${clinicId}`, JSON.stringify(patientData));
            loadDashboard(patientData);
        }
    } catch (error) {
        console.error(error);
        errorDiv.innerText = "حدث خطأ في الاتصال بالنظام، يرجى المحاولة لاحقاً.";
        errorDiv.style.display = 'block';
    } finally {
        hideLoader();
    }
}

async function loadDashboard(patientData) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('dashboard-screen').style.display = 'block';

    document.getElementById('disp_name').innerText = patientData.name;
    document.getElementById('disp_phone').innerText = patientData.phone;
    
    const debtAmount = patientData.totalDebt || 0;
    const debtEl = document.getElementById('disp_debt');
    debtEl.innerText = `${debtAmount} ج.م`;
    if(debtAmount === 0) {
        debtEl.style.background = "#dcfce7";
        debtEl.style.color = "#166534";
    }

    fetchNextAppointment(patientData.id);
    checkQueueStatus(patientData.id);
}

async function fetchNextAppointment(patientId) {
    try {
        const snap = await db.collection("Sessions")
            .where("patientId", "==", patientId)
            .where("clinicId", "==", clinicId)
            .orderBy("createdAt", "desc")
            .limit(10)
            .get();

        let nextAppDate = null;
        const today = new Date().toISOString().split('T')[0];

        snap.forEach(doc => {
            const data = doc.data();
            if (data.nextAppointment && data.nextAppointment >= today) {
                if (!nextAppDate || data.nextAppointment < nextAppDate) {
                    nextAppDate = data.nextAppointment;
                }
            }
        });

        if (nextAppDate) {
            document.getElementById('disp_next_app').innerText = nextAppDate;
        }
    } catch (error) {
        console.error("Error fetching sessions:", error);
    }
}

function checkQueueStatus(patientId) {
    const queueEl = document.getElementById('queue_status');
    const today = new Date().toISOString().split('T')[0];
    const nextApp = document.getElementById('disp_next_app').innerText;
    
    if (nextApp === today) {
        queueEl.innerText = "لديك موعد اليوم! يرجى إبلاغ الاستقبال عند وصولك.";
        queueEl.style.color = "#10b981";
    } else {
        queueEl.innerText = "ليس لديك حجز لليوم. حالة الانتظار غير نشطة.";
        queueEl.style.color = "#64748b";
    }
}

function patientLogout() {
    sessionStorage.removeItem(`patient_${clinicId}`);
    document.getElementById('loginForm').reset();
    document.getElementById('dashboard-screen').style.display = 'none';
    document.getElementById('login-screen').style.display = 'block';
}

// ==========================================
// 🟢 اللوجيك الذكي لحجز المواعيد الجديدة (تحديث عالمي) 🟢
// ==========================================
function showBookingScreen() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('booking-screen').style.display = 'block';
    
    // ضبط تاريخ اليوم كأقل تاريخ مسموح (الماضي مرفوض)
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('book_date').min = today;
}

function cancelBooking() {
    document.getElementById('booking-screen').style.display = 'none';
    document.getElementById('login-screen').style.display = 'block';
    document.getElementById('slots-container').style.display = 'none';
    document.getElementById('confirmBookingForm').style.display = 'none';
    document.getElementById('book_date').value = '';
}

async function loadAvailableSlots() {
    const selectedDate = document.getElementById('book_date').value;
    if (!selectedDate) return;

    showLoader("جاري التحقق من المواعيد...");
    const slotsContainer = document.getElementById('slots-container');
    const slotsGrid = document.getElementById('time-slots');
    slotsGrid.innerHTML = '';
    
    document.getElementById('confirmBookingForm').style.display = 'none';

    try {
        // قراءة المواعيد المحجوزة مسبقاً
        const snap = await db.collection("Appointments")
            .where("clinicId", "==", clinicId)
            .where("date", "==", selectedDate)
            .get();

        const bookedTimes = [];
        snap.forEach(doc => bookedTimes.push(doc.data().time));

        // 🔴 استخراج الوقت الحالي للمقارنة الحيّة 🔴
        const now = new Date();
        const isToday = selectedDate === now.toISOString().split('T')[0];
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        // توليد المواعيد (من 10 صباحاً لـ 10 مساءً)
        const startHour = 10; 
        const endHour = 22; 
        
        for (let h = startHour; h < endHour; h++) {
            ['00', '30'].forEach(min => {
                const timeStr = `${String(h).padStart(2, '0')}:${min}`;
                
                const ampm = h >= 12 ? 'م' : 'ص';
                const displayH = h > 12 ? h - 12 : (h === 0 ? 12 : h);
                const displayTime = `${displayH}:${min} ${ampm}`;

                // 🔴 التحقق: هل الوقت ده فات؟ 🔴
                let isPastTime = false;
                if (isToday) {
                    if (h < currentHour || (h === currentHour && parseInt(min) <= currentMinute)) {
                        isPastTime = true;
                    }
                }

                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'time-slot';
                btn.innerText = displayTime;

                // 🔴 قفل الميعاد لو محجوز أو وقته فات 🔴
                if (bookedTimes.includes(timeStr) || isPastTime) {
                    btn.classList.add('booked');
                    btn.disabled = true;
                    btn.title = isPastTime ? "عفواً، هذا الوقت قد انقضى" : "هذا الموعد محجوز مسبقاً";
                } else {
                    btn.onclick = () => selectSlot(btn, timeStr, displayTime);
                }

                slotsGrid.appendChild(btn);
            });
        }
        slotsContainer.style.display = 'block';
    } catch (error) {
        console.error(error);
        alert("حدث خطأ أثناء جلب المواعيد.");
    } finally {
        hideLoader();
    }
}

function selectSlot(btnElement, timeValue, displayTime) {
    document.querySelectorAll('.time-slot').forEach(b => b.classList.remove('selected'));
    btnElement.classList.add('selected');
    
    document.getElementById('selected_time').value = timeValue;
    document.getElementById('selected-time-display').innerText = displayTime;
    document.getElementById('confirmBookingForm').style.display = 'block';
}

async function submitBooking(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-confirm-booking');
    btn.disabled = true;
    
    const date = document.getElementById('book_date').value;
    const time = document.getElementById('selected_time').value;
    const inputName = document.getElementById('book_name').value.trim();
    const inputPhone = document.getElementById('book_phone').value.trim();

    showLoader("جاري تأكيد حجزك...");

    try {
        // 1. الدبل تشيك الأخير لمنع التعارض في نفس اللحظة
        const checkSnap = await db.collection("Appointments")
            .where("clinicId", "==", clinicId)
            .where("date", "==", date)
            .where("time", "==", time)
            .get();

        if (!checkSnap.empty) {
            alert("عفواً، تم حجز هذا الموعد منذ لحظات! يرجى اختيار موعد آخر.");
            loadAvailableSlots(); // تحديث اللوحة
            return;
        }

        // 🔴 2. فحص المريض في قاعدة بيانات السيستم (Smart Matching) 🔴
        let finalPatientId = null;
        let finalPatientName = inputName;
        
        const patientSnap = await db.collection("Patients")
            .where("clinicId", "==", clinicId)
            .where("phone", "==", inputPhone)
            .get();

        if (!patientSnap.empty) {
            // المريض ده موجود عندنا في السيستم!
            finalPatientId = patientSnap.docs[0].id;
            // عشان نحافظ على الداتا نظيفة، هناخد اسمه اللي متسجل عندنا في السيستم
            finalPatientName = patientSnap.docs[0].data().name; 
        }

        // 3. الحجز متاح والمريض اتفحص، احفظ بقى في الداتا بيز
        await db.collection("Appointments").add({
            clinicId: clinicId,
            patientId: finalPatientId, // لو جديد هيفضل null، لو موجود هيتحط الـ ID بتاعه
            patientName: finalPatientName,
            patientPhone: inputPhone,
            phone: inputPhone, // ضفت الحقل ده كاحتياطي لحد ما أشوف كود الـ calendar بتاعك بيقرأ إيه
            date: date,
            time: time,
            status: "pending", 
            source: "portal",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert("✅ تم حجز موعدك بنجاح! سيتم التواصل معك قريباً لتأكيد الحضور.");
        cancelBooking(); 

    } catch (error) {
        console.error(error);
        alert("حدث خطأ أثناء الحجز، يرجى المحاولة لاحقاً.");
    } finally {
        btn.disabled = false;
        hideLoader();
    }
}
