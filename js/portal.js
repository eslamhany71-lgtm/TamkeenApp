// تهيئة المتغيرات
const db = firebase.firestore();
const urlParams = new URLSearchParams(window.location.search);
const clinicId = urlParams.get('clinicId'); // يجب أن يكون موجوداً في الرابط

// عرض وإخفاء اللودر
function showLoader(text = "جاري التحميل...") {
    document.getElementById('loader-text').innerText = text;
    document.getElementById('loader').style.display = 'flex';
}
function hideLoader() { document.getElementById('loader').style.display = 'none'; }

// التحقق عند تحميل الصفحة
window.onload = () => {
    if (!clinicId) {
        document.getElementById('login-error').innerText = "رابط العيادة غير صحيح أو مفقود!";
        document.getElementById('login-error').style.display = 'block';
        document.getElementById('btn-login').disabled = true;
        return;
    }

    // لو المريض مسجل دخوله قبل كده على المتصفح ده للعيادة دي
    const savedPatient = sessionStorage.getItem(`patient_${clinicId}`);
    if (savedPatient) {
        const patientData = JSON.parse(savedPatient);
        loadDashboard(patientData);
    }
};

// دالة تسجيل الدخول
async function patientLogin(e) {
    e.preventDefault();
    const phoneInput = document.getElementById('patient_phone').value.trim();
    const errorDiv = document.getElementById('login-error');
    errorDiv.style.display = 'none';

    if (!phoneInput) return;

    showLoader("جاري البحث عن ملفك الطبي...");
    
    try {
        // البحث في مجموعة المرضى عن رقم الموبايل داخل هذه العيادة فقط
        const snap = await db.collection("Patients")
            .where("clinicId", "==", clinicId)
            .where("phone", "==", phoneInput)
            .get();

        if (snap.empty) {
            errorDiv.innerText = "لم نتمكن من العثور على ملف طبي بهذا الرقم في هذه العيادة.";
            errorDiv.style.display = 'block';
        } else {
            // المريض موجود! هناخد بياناته
            const patientData = snap.docs[0].data();
            patientData.id = snap.docs[0].id;
            
            // حفظ مؤقت عشان ميسجلش دخول كل شوية
            sessionStorage.setItem(`patient_${clinicId}`, JSON.stringify(patientData));
            
            // الانتقال للوحة التحكم
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

// دالة عرض لوحة التحكم وتعبئة البيانات
async function loadDashboard(patientData) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('dashboard-screen').style.display = 'block';

    // 1. عرض البيانات الأساسية والمديونية
    document.getElementById('disp_name').innerText = patientData.name;
    document.getElementById('disp_phone').innerText = patientData.phone;
    
    const debtAmount = patientData.totalDebt || 0;
    const debtEl = document.getElementById('disp_debt');
    debtEl.innerText = `${debtAmount} ج.م`;
    if(debtAmount === 0) {
        debtEl.style.background = "#dcfce7";
        debtEl.style.color = "#166534";
    }

    // 2. جلب الموعد القادم (من جدول الجلسات)
    fetchNextAppointment(patientData.id);
    
    // 3. جلب حالة الدور (Queue) - مبدئياً رسالة ذكية
    checkQueueStatus(patientData.id);
}

// جلب الموعد القادم للمريض
async function fetchNextAppointment(patientId) {
    try {
        const snap = await db.collection("Sessions")
            .where("patientId", "==", patientId)
            .where("clinicId", "==", clinicId)
            .orderBy("createdAt", "desc")
            .limit(10) // نبحث في آخر 10 جلسات عن موعد قادم
            .get();

        let nextAppDate = null;
        const today = new Date().toISOString().split('T')[0];

        snap.forEach(doc => {
            const data = doc.data();
            if (data.nextAppointment && data.nextAppointment >= today) {
                // نجيب أقرب موعد
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

// ميزة (دوري إمتى؟) الذكية
function checkQueueStatus(patientId) {
    const queueEl = document.getElementById('queue_status');
    const today = new Date().toISOString().split('T')[0];
    
    // لأنك لسه مبرمجتش جدول مخصص لـ "غرفة الانتظار/الاستقبال" في لوحة العيادة، 
    // هنعرض للمريض رسالة ديناميكية تفاعلية تعتمد على هل عنده موعد اليوم أم لا.
    const nextApp = document.getElementById('disp_next_app').innerText;
    
    if (nextApp === today) {
        queueEl.innerText = "لديك موعد اليوم! يرجى إبلاغ الاستقبال عند وصولك.";
        queueEl.style.color = "#10b981"; // أخضر
    } else {
        queueEl.innerText = "ليس لديك حجز لليوم. حالة الانتظار غير نشطة.";
        queueEl.style.color = "#64748b"; // رصاصي
    }
}

// تسجيل الخروج
function patientLogout() {
    sessionStorage.removeItem(`patient_${clinicId}`);
    document.getElementById('loginForm').reset();
    document.getElementById('dashboard-screen').style.display = 'none';
    document.getElementById('login-screen').style.display = 'block';
}
