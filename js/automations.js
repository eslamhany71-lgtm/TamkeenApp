// js/automations.js - NivaDent & n8n Bridge 🚀

// ده اللينك اللي إنت لسه باعتوهولي
const N8N_WEBHOOK_URL = "https://eslamhany71.app.n8n.cloud/webhook-test/fd4ea639-9c32-48ce-801e-5dc76454a0cb";

/**
 * دالة سحرية بتبعت أي داتا من السيستم للـ n8n
 * @param {string} eventName - اسم الحدث (مثلاً: new_appointment, session_completed)
 * @param {object} payload - الداتا اللي عايزين نبعتها (اسم المريض، الفلوس، الخ)
 */
async function sendDataToN8n(eventName, payload) {
    try {
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                event: eventName,
                system: "NivaDent",
                timestamp: new Date().toISOString(),
                data: payload
            })
        });

        if (response.ok) {
            console.log("✅ Data sent successfully to n8n!");
        } else {
            console.error("❌ Failed to send data to n8n.");
        }
    } catch (error) {
        console.error("❌ Network error connecting to n8n:", error);
    }
}

// دالة مخصصة للتيست دلوقتي عشان نشوف السحر
function testN8nConnection() {
    // داتا وهمية كأن مريض حجز موعد دلوقتي
    const dummyPatientData = {
        patientName: "إسلام هاني",
        phone: "01012345678",
        procedure: "حشو عصب",
        date: "2026-05-15",
        time: "18:00",
        clinicBranch: "الفرع الرئيسي"
    };

    console.log("🚀 Sending Test Event to n8n...");
    sendDataToN8n("test_new_appointment", dummyPatientData);
    alert("تم إرسال الإشارة للـ n8n! افتح صفحة n8n دلوقتي وشوف السحر 🪄");
}
