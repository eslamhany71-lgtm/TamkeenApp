// js/portal.js - V3.2 (Smart SaaS Portal & Auto Clinic Branding - WhatsApp Fix)

const db = firebase.firestore();
const urlParams = new URLSearchParams(window.location.search);
const clinicId = urlParams.get('clinicId'); 
let currentLang = localStorage.getItem('portal_lang') || 'ar';
let clinicWhatsApp = "";

// 🔴 متغيرات إعدادات العيادة للبوابة 🔴
let portalSettings = { workStart: '10:00', workEnd: '22:00', offDay: 'none' };

// ==========================================
// 🔴 الترجمة والدعم متعدد اللغات 🔴
// ==========================================
const portalDict = {
    ar: {
        pageTitle: "بوابة المريض",
        loginSub: "يرجى تسجيل الدخول لمتابعة ملفك الطبي",
        lblPhoneLogin: "رقم الموبايل المسجل بالعيادة",
        btnLogin: "تسجيل الدخول",
        txtOrNew: "أو لست مريضاً حالياً؟",
        btnBookNew: "📅 حجز موعد جديد",
        bookTitle: "📅 حجز موعد جديد",
        bookSub: "اختر اليوم والوقت المناسب لك",
        lblBookBranch: "اختر الفرع:", // 🔴
        optMainBranch: "الفرع الرئيسي", // 🔴
        lblBookDate: "اختر تاريخ الحجز:",
        lblSlots: "المواعيد المتاحة:",
        txtSelectedTime: "الموعد المحدد:",
        lblBookName: "الاسم بالكامل:",
        lblBookPhone: "رقم الموبايل للتواصل:",
        btnConfirmBooking: "تأكيد الحجز",
        btnCancelBooking: "إلغاء والعودة",
        lblNextApp: "الموعد القادم",
        lblQueue: "حالة الدور اليوم",
        lblDebt: "الحساب المالي",
        lblLabStatus: "🔬 حالة التركيبات/المعمل",
        lblHistory: "📋 السجل الطبي والجلسات",
        noApp: "لا يوجد موعد مسجل",
        notInClinic: "غير متواجد بالعيادة",
        inClinic: "لديك موعد اليوم! يرجى إبلاغ الاستقبال.",
        errNoClinic: "رابط العيادة غير صحيح أو مفقود!",
        errNotFound: "لم نتمكن من العثور على ملف طبي بهذا الرقم.",
        errGeneric: "حدث خطأ في الاتصال بالنظام، يرجى المحاولة لاحقاً.",
        msgNewPatient: " (مريض جديد)",
        msgBooked: "تم حجز موعدك بنجاح! سيتم التواصل معك.",
        msgConflict: "عفواً، تم حجز هذا الموعد منذ لحظات!",
        statusPending: "قيد التنفيذ ⏳",
        statusReady: "جاهز بالعيادة ✅",
        errOffDay: "عفواً، العيادة مغلقة في هذا اليوم (إجازة أسبوعية)."
    },
    en: {
        pageTitle: "Patient Portal",
        loginSub: "Please login to view your medical file",
        lblPhoneLogin: "Registered Mobile Number",
        btnLogin: "Login",
        txtOrNew: "Or are you a new patient?",
        btnBookNew: "📅 Book New Appointment",
        bookTitle: "📅 Book New Appointment",
        bookSub: "Choose a suitable date and time",
        lblBookBranch: "Select Branch:", // 🔴
        optMainBranch: "Main Branch", // 🔴
        lblBookDate: "Select Date:",
        lblSlots: "Available Slots:",
        txtSelectedTime: "Selected Time:",
        lblBookName: "Full Name:",
        lblBookPhone: "Contact Number:",
        btnConfirmBooking: "Confirm Booking",
        btnCancelBooking: "Cancel & Return",
        lblNextApp: "Next Appointment",
        lblQueue: "Queue Status",
        lblDebt: "Financial Balance",
        lblLabStatus: "🔬 Lab / Prosthetics Status",
        lblHistory: "📋 Medical History & Sessions",
        noApp: "No appointment scheduled",
        notInClinic: "Not at the clinic",
        inClinic: "You have an appointment today! Please inform reception.",
        errNoClinic: "Invalid or missing clinic link!",
        errNotFound: "Could not find a medical file with this number.",
        errGeneric: "System connection error, please try again.",
        msgNewPatient: " (New Patient)",
        msgBooked: "Appointment booked successfully! We will contact you.",
        msgConflict: "Sorry, this slot was just booked by someone else!",
        statusPending: "In Progress ⏳",
        statusReady: "Ready at Clinic ✅",
        errOffDay: "Sorry, the clinic is closed on this date (Weekly Day Off)."
    }
};

function updatePortalContent(lang) {
    const d = portalDict[lang];
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    
    document.getElementById('page_title').innerText = d.pageTitle;
    document.getElementById('txt_login_sub').innerText = d.loginSub;
    document.getElementById('lbl_phone_login').innerText = d.lblPhoneLogin;
    document.getElementById('btn_login_submit').innerText = d.btnLogin;
    document.getElementById('txt_or_new').innerText = d.txtOrNew;
    document.getElementById('btn_book_new').innerText = d.btnBookNew;
    document.getElementById('txt_book_title').innerText = d.bookTitle;
    document.getElementById('txt_book_sub').innerText = d.bookSub;
    
    if(document.getElementById('lbl_book_branch')) document.getElementById('lbl_book_branch').innerText = d.lblBookBranch; // 🔴
    
    document.getElementById('lbl_book_date').innerText = d.lblBookDate;
    document.getElementById('lbl_slots').innerText = d.lblSlots;
    document.getElementById('txt_selected_time').innerText = d.txtSelectedTime;
    document.getElementById('lbl_book_name').innerText = d.lblBookName;
    document.getElementById('lbl_book_phone').innerText = d.lblBookPhone;
    document.getElementById('btn_confirm_booking').innerText = d.btnConfirmBooking;
    document.getElementById('btn_cancel_booking').innerText = d.btnCancelBooking;
    document.getElementById('lbl_next_app').innerText = d.lblNextApp;
    document.getElementById('lbl_queue').innerText = d.lblQueue;
    document.getElementById('lbl_debt').innerText = d.lblDebt;
    document.getElementById('lbl_lab_status').innerText = d.lblLabStatus;
    document.getElementById('lbl_history').innerText = d.lblHistory;
    
    document.getElementById('btn_ar').className = lang === 'ar' ? 'active' : '';
    document.getElementById('btn_en').className = lang === 'en' ? 'active' : '';
    
    // تحديث اسم الفرع الرئيسي لو موجود
    const mainOpt = document.querySelector('#book_branch option[value="main"]');
    if (mainOpt && !mainOpt.hasAttribute('data-custom-name')) {
        mainOpt.innerText = d.optMainBranch;
    }
}

function switchPortalLang(lang) {
    currentLang = lang;
    localStorage.setItem('portal_lang', lang);
    updatePortalContent(lang);
    if(document.getElementById('dashboard-screen').style.display === 'block') {
        const sd = sessionStorage.getItem(`patient_${clinicId}`);
        if(sd) checkQueueStatus(); 
    }
}

// ==========================================
// 🔴 Theme Management 🔴
// ==========================================
function togglePortalTheme() {
    const body = document.body;
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('portal_theme', newTheme);
    document.getElementById('btn_theme').innerText = newTheme === 'dark' ? '☀️' : '🌙';
}

function showLoader(text = "...") {
    document.getElementById('loader-text').innerText = text;
    document.getElementById('loader').style.display = 'flex';
}
function hideLoader() { document.getElementById('loader').style.display = 'none'; }

// ==========================================
// 🔴 Initialization & Fetch Clinic Info 🔴
// ==========================================
window.onload = async () => {
    const savedTheme = localStorage.getItem('portal_theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    document.getElementById('btn_theme').innerText = savedTheme === 'dark' ? '☀️' : '🌙';
    updatePortalContent(currentLang);

    if (!clinicId) {
        document.getElementById('login-error').innerText = portalDict[currentLang].errNoClinic;
        document.getElementById('login-error').style.display = 'block';
        document.getElementById('btn_login_submit').disabled = true;
        return;
    }

    try {
        const clinicDoc = await db.collection("Clinics").doc(clinicId).get();
        if(clinicDoc.exists) {
            const cData = clinicDoc.data();
            const cName = cData.clinicName || (currentLang === 'ar' ? "العيادة الذكية" : "Smart Clinic");
            
            const loginNameEl = document.getElementById('txt_clinic_name_login');
            const dashNameEl = document.getElementById('txt_clinic_name_dash');
            if(loginNameEl) loginNameEl.innerText = cName;
            if(dashNameEl) dashNameEl.innerText = cName;

            portalSettings.workStart = cData.workStart || '10:00';
            portalSettings.workEnd = cData.workEnd || '22:00';
            portalSettings.offDay = cData.offDay || 'none';

            if(cData.logoUrl) {
                const logoContainer = document.getElementById('portal_logo_container');
                if(logoContainer) {
                    logoContainer.innerHTML = `<img src="${cData.logoUrl}" alt="Clinic Logo" style="width: 90px; height: 90px; object-fit: contain; border-radius: 50%; background: white; padding: 5px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); margin: 0 auto;">`;
                }
            }
            
            const rawPhone = cData.phone1 || cData.phone || cData.whatsapp || "";
            if(rawPhone) {
                clinicWhatsApp = rawPhone.replace(/\D/g, ''); 
                
                if (clinicWhatsApp.startsWith('0')) {
                    clinicWhatsApp = '2' + clinicWhatsApp;
                } else if (!clinicWhatsApp.startsWith('20') && clinicWhatsApp.length >= 10) {
                    clinicWhatsApp = '20' + clinicWhatsApp; 
                }
                
                const waBtn = document.getElementById('wa-float-btn');
                if(waBtn) {
                    waBtn.href = `https://wa.me/${clinicWhatsApp}`;
                    waBtn.style.display = 'flex'; 
                }
            }
        }
        
        // 🔴 جلب الفروع للبوابة 🔴
        await loadPortalBranches();

    } catch(e) { console.error("Branding Error", e); }

    const savedPatient = sessionStorage.getItem(`patient_${clinicId}`);
    if (savedPatient) {
        const patientData = JSON.parse(savedPatient);
        loadDashboard(patientData);
    }
};

// 🔴 دالة جلب فروع العيادة للبوابة 🔴
async function loadPortalBranches() {
    try {
        const snap = await db.collection("Branches").where("clinicId", "==", clinicId).get();
        const branchSelect = document.getElementById('book_branch');
        const branchGroup = document.getElementById('portal-branch-group');
        
        branchSelect.innerHTML = '';
        branchSelect.innerHTML += `<option value="main">${portalDict[currentLang].optMainBranch}</option>`;
        
        if (!snap.empty) {
            snap.forEach(doc => {
                if (doc.id !== 'main') {
                    branchSelect.innerHTML += `<option value="${doc.id}">${doc.data().name}</option>`;
                } else {
                    const mainOpt = branchSelect.querySelector('option[value="main"]');
                    mainOpt.innerText = doc.data().name;
                    mainOpt.setAttribute('data-custom-name', 'true');
                }
            });
            branchGroup.style.display = 'block'; // إظهار القائمة لو في فروع
        }
    } catch (e) {
        console.error("Error loading branches for portal:", e);
    }
}

// ==========================================
// 🔴 Login Logic 🔴
// ==========================================
async function patientLogin(e) {
    e.preventDefault();
    const phoneInput = document.getElementById('patient_phone').value.trim();
    const errorDiv = document.getElementById('login-error');
    errorDiv.style.display = 'none';

    if (!phoneInput) return;
    showLoader();
    
    try {
        const patientSnap = await db.collection("Patients").where("clinicId", "==", clinicId).where("phone", "==", phoneInput).get();

        if (!patientSnap.empty) {
            const patientData = patientSnap.docs[0].data();
            patientData.id = patientSnap.docs[0].id;
            patientData.isOfficial = true;
            sessionStorage.setItem(`patient_${clinicId}`, JSON.stringify(patientData));
            loadDashboard(patientData);
        } else {
            const appSnap = await db.collection("Appointments").where("clinicId", "==", clinicId).where("patientPhone", "==", phoneInput).get();

            if (!appSnap.empty) {
                const appData = appSnap.docs[0].data();
                const tempPatient = { id: "temp_" + phoneInput, name: appData.patientName, phone: appData.patientPhone || appData.phone, totalDebt: 0, isOfficial: false };
                sessionStorage.setItem(`patient_${clinicId}`, JSON.stringify(tempPatient));
                loadDashboard(tempPatient);
            } else {
                errorDiv.innerText = portalDict[currentLang].errNotFound;
                errorDiv.style.display = 'block';
            }
        }
    } catch (error) {
        errorDiv.innerText = portalDict[currentLang].errGeneric;
        errorDiv.style.display = 'block';
    } finally {
        hideLoader();
    }
}

async function loadDashboard(patientData) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('dashboard-screen').style.display = 'block';

    const nameExt = patientData.isOfficial ? "" : portalDict[currentLang].msgNewPatient;
    document.getElementById('disp_name').innerText = patientData.name + nameExt;
    document.getElementById('disp_phone').innerText = patientData.phone;
    
    const debtAmount = patientData.totalDebt || 0;
    const debtEl = document.getElementById('disp_debt');
    debtEl.innerText = `${debtAmount}`;
    
    if(debtAmount === 0) {
        debtEl.style.color = "#10b981";
    } else {
        debtEl.style.color = "#ef4444";
    }

    await fetchNextAppointment(patientData.phone);
    checkQueueStatus();

    if(patientData.isOfficial) {
        fetchPatientHistory(patientData.id);
        fetchLabOrders(patientData.id);
    }
}

async function fetchNextAppointment(patientPhone) {
    try {
        const snap = await db.collection("Appointments")
            .where("clinicId", "==", clinicId)
            .where("patientPhone", "==", patientPhone)
            .where("status", "==", "pending").get();

        let nextAppDate = null; let nextAppTime = null;
        const today = new Date().toISOString().split('T')[0];

        snap.forEach(doc => {
            const data = doc.data();
            if (data.date >= today) {
                if (!nextAppDate || data.date < nextAppDate) { nextAppDate = data.date; nextAppTime = data.time; }
            }
        });

        if (nextAppDate) {
            document.getElementById('disp_next_app').innerText = `${nextAppDate} (${nextAppTime})`;
        } else {
            document.getElementById('disp_next_app').innerText = portalDict[currentLang].noApp;
        }
    } catch (error) { console.error(error); }
}

function checkQueueStatus() {
    const queueEl = document.getElementById('queue_status');
    const today = new Date().toISOString().split('T')[0];
    const nextAppStr = document.getElementById('disp_next_app').innerText;
    
    if (nextAppStr.includes(today)) {
        queueEl.innerText = portalDict[currentLang].inClinic;
        queueEl.style.color = "#f59e0b";
    } else {
        queueEl.innerText = portalDict[currentLang].notInClinic;
        queueEl.style.color = "#64748b";
    }
}

// ==========================================
// 🔴 Fetch Medical History & Labs 🔴
// ==========================================
async function fetchPatientHistory(patientId) {
    const listEl = document.getElementById('history_list');
    listEl.innerHTML = '';
    try {
        const snap = await db.collection("Sessions").where("patientId", "==", patientId).orderBy("createdAt", "desc").limit(5).get();
        if(!snap.empty) {
            document.getElementById('history-section').style.display = 'block';
            snap.forEach(doc => {
                const d = doc.data();
                const currency = currentLang === 'ar' ? 'ج.م' : 'EGP';
                listEl.innerHTML += `
                    <div class="history-item">
                        <div>
                            <span class="hist-date">${d.date}</span>
                            <p class="hist-proc">${d.procedure}</p>
                        </div>
                        <div class="hist-price">${d.paid} ${currency}</div>
                    </div>
                `;
            });
        }
    } catch(e) { console.log("History fetch error"); }
}

async function fetchLabOrders(patientId) {
    const listEl = document.getElementById('lab_orders_list');
    listEl.innerHTML = '';
    try {
        const snap = await db.collection("LabOrders").where("patientId", "==", patientId).orderBy("createdAt", "desc").limit(3).get();
        let hasActive = false;
        snap.forEach(doc => {
            const d = doc.data();
            hasActive = true;
            const statusTxt = d.status === 'pending' ? portalDict[currentLang].statusPending : portalDict[currentLang].statusReady;
            const statusColor = d.status === 'pending' ? '#d97706' : '#10b981';
            
            listEl.innerHTML += `
                <div style="background: var(--bg-color); padding: 10px; border-radius: 8px; margin-bottom: 8px; border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                    <strong style="font-size: 14px;">${d.workType}</strong>
                    <span style="font-size: 12px; font-weight: bold; color: ${statusColor}; background: var(--card-bg); padding: 3px 8px; border-radius: 10px;">${statusTxt}</span>
                </div>
            `;
        });
        if(hasActive) document.getElementById('lab-section').style.display = 'block';
    } catch(e) { console.log("Lab fetch error"); }
}

function patientLogout() {
    sessionStorage.removeItem(`patient_${clinicId}`);
    document.getElementById('loginForm').reset();
    document.getElementById('dashboard-screen').style.display = 'none';
    document.getElementById('login-screen').style.display = 'block';
}

// ==========================================
// 🔴 Booking Logic (Protected & Branch Isolated) 🔴
// ==========================================
function showBookingScreen() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('booking-screen').style.display = 'block';
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
    const selectedBranch = document.getElementById('book_branch').value || 'main'; // 🔴 تحديد الفرع

    if (!selectedDate) return;

    const selectedDateObj = new Date(selectedDate);
    const dayOfWeek = selectedDateObj.getDay();
    if (portalSettings.offDay !== 'none' && dayOfWeek === Number(portalSettings.offDay)) {
        alert(portalDict[currentLang].errOffDay);
        document.getElementById('slots-container').style.display = 'none';
        document.getElementById('confirmBookingForm').style.display = 'none';
        document.getElementById('book_date').value = ''; 
        return;
    }

    showLoader();
    const slotsContainer = document.getElementById('slots-container');
    const slotsGrid = document.getElementById('time-slots');
    slotsGrid.innerHTML = '';
    document.getElementById('confirmBookingForm').style.display = 'none';

    try {
        // 🔴 سحب المواعيد المحجوزة مسبقاً في الفرع المحدد فقط 🔴
        const snap = await db.collection("Appointments")
            .where("clinicId", "==", clinicId)
            .where("branchId", "==", selectedBranch)
            .where("date", "==", selectedDate).get();
            
        const bookedTimes = [];
        snap.forEach(doc => { if(doc.data().status !== 'cancelled') bookedTimes.push(doc.data().time) });

        const now = new Date();
        const isToday = selectedDate === now.toISOString().split('T')[0];
        const currentHour = now.getHours(); const currentMinute = now.getMinutes();

        const startHour = parseInt(portalSettings.workStart.split(':')[0]);
        let endHour = parseInt(portalSettings.workEnd.split(':')[0]);
        
        const startMinutes = parseInt(portalSettings.workStart.split(':')[0]) * 60 + parseInt(portalSettings.workStart.split(':')[1]);
        const endMinutes = parseInt(portalSettings.workEnd.split(':')[0]) * 60 + parseInt(portalSettings.workEnd.split(':')[1]);

        for (let h = startHour; h <= endHour; h++) {
            ['00', '30'].forEach(min => {
                const timeMinutes = h * 60 + parseInt(min);
                if (timeMinutes < startMinutes || timeMinutes > endMinutes) return;

                const timeStr = `${String(h).padStart(2, '0')}:${min}`;
                const ampm = h >= 12 ? 'PM' : 'AM';
                const displayH = h > 12 ? h - 12 : (h === 0 ? 12 : h);
                const displayTime = `${displayH}:${min} ${ampm}`;

                let isPastTime = false;
                if (isToday && (h < currentHour || (h === currentHour && parseInt(min) <= currentMinute))) isPastTime = true;

                const btn = document.createElement('button');
                btn.type = 'button'; btn.className = 'time-slot'; btn.innerText = displayTime;

                if (bookedTimes.includes(timeStr) || isPastTime) {
                    btn.classList.add('booked'); btn.disabled = true;
                } else {
                    btn.onclick = () => selectSlot(btn, timeStr, displayTime);
                }
                slotsGrid.appendChild(btn);
            });
        }
        
        if (slotsGrid.innerHTML === '') {
            slotsGrid.innerHTML = `<p style="color:#ef4444; font-weight:bold; text-align:center; width:100%;">لا توجد مواعيد متاحة في هذا اليوم.</p>`;
        }
        
        slotsContainer.style.display = 'block';
    } catch (error) { console.error(error); } finally { hideLoader(); }
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
    const btn = document.getElementById('btn_confirm_booking');
    btn.disabled = true;
    
    const date = document.getElementById('book_date').value;
    const time = document.getElementById('selected_time').value;
    const selectedBranch = document.getElementById('book_branch').value || 'main'; // 🔴 ختم الفرع
    const inputName = document.getElementById('book_name').value.trim();
    const inputPhone = document.getElementById('book_phone').value.trim();

    showLoader();

    try {
        // 🔴 حماية مزدوجة: التأكد إن الموعد مش محجوز في نفس الفرع 🔴
        const checkSnap = await db.collection("Appointments")
            .where("clinicId", "==", clinicId)
            .where("branchId", "==", selectedBranch)
            .where("date", "==", date)
            .where("time", "==", time).get();
            
        let isConflict = false;
        checkSnap.forEach(d => { if(d.data().status !== 'cancelled') isConflict = true; });

        if (isConflict) {
            alert(portalDict[currentLang].msgConflict);
            loadAvailableSlots(); return;
        }

        let finalPatientId = null; let finalPatientName = inputName;
        const patientSnap = await db.collection("Patients").where("clinicId", "==", clinicId).where("phone", "==", inputPhone).get();

        if (!patientSnap.empty) {
            finalPatientId = patientSnap.docs[0].id;
            finalPatientName = patientSnap.docs[0].data().name; 
        }

        // 🔴 رمي الموعد في الفايربيز مع الفرع الصحيح 🔴
        await db.collection("Appointments").add({
            clinicId: clinicId, 
            branchId: selectedBranch, 
            patientId: finalPatientId, 
            patientName: finalPatientName,
            patientPhone: inputPhone, phone: inputPhone, 
            date: date, time: time,
            status: "pending", source: "portal", 
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert(portalDict[currentLang].msgBooked);
        cancelBooking(); 

    } catch (error) { alert(portalDict[currentLang].errGeneric); } 
    finally { btn.disabled = false; hideLoader(); }
}
