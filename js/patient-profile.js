// 🔴 ملف patient-profile.js - النسخة المُحصنة الشاملة (Dashboard + n8n Ready) 🔴

try {
    const db = firebase.firestore();

    const urlParams = new URLSearchParams(window.location.search);
    let patientId = urlParams.get('id');
    
    if (patientId && patientId.includes('&')) {
        patientId = patientId.split('&')[0];
    }

    let clinicId = urlParams.get('clinicId') || sessionStorage.getItem('clinicId') || localStorage.getItem('clinicId');
    if (!clinicId && window.parent) {
        try { clinicId = window.parent.sessionStorage.getItem('clinicId'); } catch(e) {}
    }

    // 🔴 1. استخراج كود الفرع (السر اللي كان بيخفي الفلوس من الداشبورد) 🔴
    let currentBranchId = urlParams.get('branchId') || sessionStorage.getItem('branchId') || localStorage.getItem('branchId');
    if (!currentBranchId && window.parent) {
        try { currentBranchId = window.parent.sessionStorage.getItem('branchId'); } catch(e) {}
    }
    if (!currentBranchId) currentBranchId = 'main';

    let currentPatientName = "مريض";
    let currentPatientPhone = ""; 
    let loadedPatientSessions = []; 
    let currentUserDisplayName = "مستخدم غير معروف";

    // 🔴 متغيرات الـ ERP 🔴
    let erpServices = [];
    let erpContracts = [];

    const SESSIONS_PER_PAGE = 50;
    let lastVisibleProfileSession = null;
    let isInitialLoad = true;

    function getLang() {
        return (localStorage.getItem('preferredLang') || 'ar') === 'ar';
    }

    // 🔴 2. دالة سحرية لضبط التاريخ المحلي عشان الداشبورد يقرأ صح 🔴
    function getLocalTodayString() {
        const todayDate = new Date();
        todayDate.setMinutes(todayDate.getMinutes() - todayDate.getTimezoneOffset());
        return todayDate.toISOString().split('T')[0];
    }

    function updatePageContent(lang) {
        const isAr = lang === 'ar';
        const searchInput = document.getElementById('searchSessionInput');
        if(searchInput) searchInput.placeholder = isAr ? 'بحث بالتاريخ، الإجراء...' : 'Search by date, procedure...';
        if (loadedPatientSessions.length > 0) renderPatientSessionsTable();
        loadLabOrders(); 
    }

    function openModal(id) { 
        document.getElementById(id).style.display = 'flex'; 
        if(id === 'sessionModal') {
            document.getElementById('sess_date').value = getLocalTodayString();
            if(document.getElementById('sess_contract')) document.getElementById('sess_contract').value = '';
        }
        if(id === 'labOrderModal') {
            document.getElementById('lab_date').value = getLocalTodayString();
        }
        if(id === 'installmentModal') {
            document.getElementById('inst_start_date').value = getLocalTodayString();
            document.getElementById('inst_total').value = '';
            document.getElementById('inst_down_payment').value = '';
            document.getElementById('inst_remaining').value = '';
            document.getElementById('inst_count').value = '1';
            document.getElementById('inst_value_display').innerText = '0 ج.م';
        }
    }

    function closeModal(id) { document.getElementById(id).style.display = 'none'; }

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', function(e) { if (e.target === this) this.style.display = 'none'; });
        });
    });

    // 🔴 جلب داتا الـ ERP للمودالز 🔴
    function loadERPData() {
        if (!clinicId) return;

        db.collection("Services").where("clinicId", "==", clinicId).onSnapshot(snap => {
            erpServices = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            ['sess_procedure', 'edit_sess_procedure'].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    const currentVal = el.value;
                    el.innerHTML = `<option value="">اختر الخدمة...</option>`;
                    erpServices.forEach(s => {
                        el.innerHTML += `<option value="${s.id}">${s.name} (${s.price} ج.م)</option>`;
                    });
                    el.value = currentVal;
                }
            });
        });

        db.collection("Contracts").where("clinicId", "==", clinicId).onSnapshot(snap => {
            erpContracts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            ['sess_contract', 'edit_sess_contract'].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    const currentVal = el.value;
                    el.innerHTML = `<option value="">بدون تعاقد (خصم 0%)</option>`;
                    erpContracts.forEach(c => {
                        el.innerHTML += `<option value="${c.id}">${c.name} (خصم ${c.discountPercentage}%)</option>`;
                    });
                    el.value = currentVal;
                }
            });
        });
    }

    // 🔴 دالة السحر: حساب السعر أوتوماتيك 🔴
    function calculateProfileERP(mode) {
        const prefix = mode === 'add' ? 'sess_' : 'edit_sess_';
        const srvId = document.getElementById(`${prefix}procedure`).value;
        const contId = document.getElementById(`${prefix}contract`).value;
        
        let basePrice = 0;
        const srv = erpServices.find(s => s.id === srvId);
        if (srv) basePrice = Number(srv.price) || 0;

        let discount = 0;
        const cont = erpContracts.find(c => c.id === contId);
        if (cont) discount = Number(cont.discountPercentage) || 0;

        const total = basePrice - (basePrice * (discount / 100));
        document.getElementById(`${prefix}total`).value = Math.round(total);
        calculateRemaining(mode);
    }

    function loadPatientData() {
        try {
            const isAr = getLang();
            const nameEl = document.getElementById('prof-name');
            if (!nameEl) return; 

            if (!patientId) {
                nameEl.innerHTML = `<span style="color:#ef4444; font-size:16px;">⚠️ خطأ: كود المريض مفقود!</span>`;
                return;
            }
            if (!clinicId) {
                nameEl.innerHTML = `<span style="color:#ef4444; font-size:16px;">⚠️ خطأ: كود العيادة مفقود!</span>`;
                return;
            }

            if (isInitialLoad && window.showLoader) window.showLoader(isAr ? "جاري تحميل بيانات المريض..." : "Loading patient...");

            db.collection("Patients").doc(patientId).onSnapshot(doc => {
                if (doc.exists) {
                    const p = doc.data();
                    currentPatientName = p.name;
                    currentPatientPhone = p.phone || ""; 
                    
                    let debtHtml = '';
                    if (p.totalDebt && p.totalDebt > 0) {
                        const debtTxt = isAr ? "الديون" : "Debt";
                        debtHtml = `<span style="color: #ef4444; font-size: 14px; font-weight: bold; background: #fee2e2; padding: 4px 10px; border-radius: 8px; margin-right: 15px; border: 1px solid #fca5a5;">${debtTxt}: ${p.totalDebt}</span>`;
                    }
                    
                    nameEl.innerHTML = `${p.name} ${debtHtml}`;
                    const phoneEl = document.getElementById('prof-phone');
                    if(phoneEl) phoneEl.innerText = `📞 ${p.phone || '---'}`;
                    
                    const ageEl = document.getElementById('prof-age');
                    if(ageEl) ageEl.innerText = `🎂 ${p.age || '---'} ${isAr ? 'سنة' : 'Y'}`;
                    
                    const genderEl = document.getElementById('prof-gender');
                    if(genderEl) genderEl.innerText = `🚻 ${p.gender || (isAr ? 'غير محدد' : 'Unknown')}`;
                    
                    const alerts = document.getElementById('prof-alerts');
                    if(alerts) {
                        alerts.innerHTML = '';
                        if (p.medicalHistory && p.medicalHistory.length > 0) {
                            p.medicalHistory.forEach(d => { alerts.innerHTML += `<span class="alert-tag">⚠️ ${d}</span>`; });
                        } else {
                            alerts.innerHTML = `<span style="color: #10b981; font-weight: bold;">${isAr ? '✅ سليم' : '✅ Healthy'}</span>`;
                        }
                    }
                } else {
                    nameEl.innerHTML = `<span style="color:#ef4444;">⚠️ هذا المريض غير موجود أو تم حذفه!</span>`;
                }
                
                if (isInitialLoad) {
                    loadPatientSessions(); 
                    loadLabOrders(); 
                    isInitialLoad = false;
                    if (window.hideLoader) window.hideLoader();
                }
            }, (error) => {
                console.error(error);
                nameEl.innerHTML = `<span style="color:#ef4444; font-size:14px;">❌ خطأ اتصال بالفايربيز: ${error.message}</span>`;
                if (isInitialLoad && window.hideLoader) window.hideLoader();
            });
        } catch (innerError) {
            alert("خطأ في جلب البيانات: " + innerError.message);
        }
    }

    function sendPortalLinkWhatsApp() {
        const isAr = getLang();
        if (!currentPatientPhone || currentPatientPhone.trim() === '') {
            alert(isAr ? "عفواً، لا يوجد رقم موبايل مسجل لهذا المريض." : "No phone number registered for this patient.");
            return;
        }

        let phone = currentPatientPhone.replace(/\D/g, '');
        if (phone.startsWith('0')) { phone = '2' + phone; } 
        else if (!phone.startsWith('20') && phone.length >= 10) { phone = '20' + phone; }

        const portalUrl = `https://nivadent.web.app/portal.html?clinicId=${clinicId}`;
        let message = isAr 
            ? `مرحباً أستاذ/ة *${currentPatientName}* 👋\n\nنود إعلامكم أنه يمكنكم الآن متابعة ملفكم الطبي، حساباتكم، وحجز مواعيدكم القادمة بكل سهولة عبر بوابتنا الذكية.\n\n🔗 *رابط الدخول للبوابة:*\n${portalUrl}\n\nنتمنى لكم دوام الصحة والعافية! 🦷✨`
            : `Hello *${currentPatientName}* 👋\n\nYou can now view your medical profile, finances, and book new appointments easily through our smart portal.\n\n🔗 *Portal Link:*\n${portalUrl}\n\nWishing you a healthy smile! 🦷✨`;

        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const whatsappUrl = isMobile ? `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}` : `https://api.whatsapp.com/send/?phone=${phone}&text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    }

    function calcInstallments() {
        const total = Number(document.getElementById('inst_total').value) || 0;
        const downPayment = Number(document.getElementById('inst_down_payment').value) || 0;
        const count = Number(document.getElementById('inst_count').value) || 1;
        const remaining = Math.max(0, total - downPayment);
        document.getElementById('inst_remaining').value = remaining;
        const valPerSession = remaining > 0 ? (remaining / count).toFixed(2) : 0;
        document.getElementById('inst_value_display').innerText = `${valPerSession} ج.م`;
    }

    // 🔴 3. تعديل دالة الأقساط لإضافة الفرع 🔴
    async function saveInstallmentPlan(e) {
        e.preventDefault();
        const isAr = getLang();
        const btn = document.getElementById('btn-save-installment');
        btn.disabled = true;
        if (window.showLoader) window.showLoader(isAr ? "جاري جدولة الأقساط..." : "Scheduling Plan...");

        const planName = document.getElementById('inst_plan_name').value.trim();
        const total = Number(document.getElementById('inst_total').value) || 0;
        const downPayment = Number(document.getElementById('inst_down_payment').value) || 0;
        const payMethod = document.getElementById('inst_pay_method').value;
        const startDateStr = document.getElementById('inst_start_date').value;
        const remaining = Number(document.getElementById('inst_remaining').value) || 0;
        const count = Number(document.getElementById('inst_count').value) || 1;
        const interval = document.getElementById('inst_interval').value;

        const valPerSession = remaining > 0 ? (remaining / count) : 0;

        try {
            const batch = db.batch();
            const financeRef = db.collection("Finances");
            const sessionsRef = db.collection("Sessions");
            const patientRef = db.collection("Patients").doc(patientId);

            if (downPayment > 0) {
                const downSessRef = sessionsRef.doc();
                batch.set(downSessRef, {
                    clinicId: clinicId, branchId: currentBranchId, patientId: patientId, date: startDateStr,
                    procedure: `مقدم خطة: ${planName}`, contract: 'بدون تعاقد', tooth: "", notes: "دفعة مقدمة لخطة علاج",
                    total: downPayment, paid: downPayment, remaining: 0,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                const downFinRef = financeRef.doc();
                const incomeData = {
                    clinicId: clinicId, branchId: currentBranchId, patientId: patientId, type: 'income', 
                    category: isAr ? 'كشف / جلسة' : 'Session Income',
                    amount: downPayment, date: startDateStr, paymentMethod: payMethod,
                    notes: isAr ? `مقدم خطة: ${planName}` : `Down payment: ${planName}`,
                    createdBy: currentUserDisplayName, createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                batch.set(downFinRef, incomeData);
                
                // إشعار n8n
                if (window.triggerN8nWebhook) window.triggerN8nWebhook("new_revenue", {...incomeData, patientName: currentPatientName});
            }

            if (remaining > 0) {
                let currentDate = new Date(startDateStr);
                for (let i = 1; i <= count; i++) {
                    if (interval === 'monthly') { currentDate.setMonth(currentDate.getMonth() + 1); } 
                    else if (interval === 'weekly') { currentDate.setDate(currentDate.getDate() + 7); }

                    const instDateStr = currentDate.toISOString().split('T')[0];
                    const instSessRef = sessionsRef.doc();
                    batch.set(instSessRef, {
                        clinicId: clinicId, branchId: currentBranchId, patientId: patientId, date: instDateStr,
                        procedure: `قسط رقم (${i}) - ${planName}`, contract: 'بدون تعاقد', tooth: "", notes: "قسط مجدول أوتوماتيكياً",
                        total: valPerSession, paid: 0, remaining: valPerSession,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp() 
                    });

                    const instFinRef = financeRef.doc();
                    batch.set(instFinRef, {
                        clinicId: clinicId, branchId: currentBranchId, patientId: patientId, type: 'debt', 
                        category: isAr ? 'قسط خطة علاج' : 'Plan Installment',
                        amount: valPerSession, date: instDateStr,
                        notes: isAr ? `قسط (${i}): ${planName}` : `Installment (${i}): ${planName}`,
                        createdBy: currentUserDisplayName, createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
                batch.update(patientRef, { totalDebt: firebase.firestore.FieldValue.increment(remaining) });
            }
            await batch.commit();

            closeModal('installmentModal');
            document.getElementById('installmentForm').reset();
            alert(isAr ? `✅ تم جدولة الخطة وحفظ ${count} أقساط بنجاح!` : `✅ Plan scheduled successfully!`);
            loadPatientSessions();
        } catch (error) {
            console.error(error);
            alert(isAr ? "❌ خطأ أثناء الجدولة." : "❌ Error scheduling plan.");
        } finally {
            btn.disabled = false;
            if (window.hideLoader) window.hideLoader();
        }
    }

    // 🔴 4. تعديل دالة المعمل لإضافة الفرع 🔴
    async function saveLabOrder(e) {
        e.preventDefault();
        const isAr = getLang();
        const btn = document.getElementById('btn-save-lab');
        btn.disabled = true;
        if (window.showLoader) window.showLoader(isAr ? "جاري حفظ الطلب..." : "Saving Order...");

        const labCost = Number(document.getElementById('lab_cost').value) || 0;
        const workType = document.getElementById('lab_work_type').value;
        const labName = document.getElementById('lab_name').value;
        const orderDate = document.getElementById('lab_date').value;
        const paymentMethod = document.getElementById('lab_pay_method').value; 

        const labData = {
            clinicId: clinicId, branchId: currentBranchId, patientId: patientId, date: orderDate,
            labName: labName, workType: workType, cost: labCost,
            deliveryDate: document.getElementById('lab_delivery_date').value || null,
            status: 'pending', createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await db.collection("LabOrders").add(labData);
            if (labCost > 0) {
                await db.collection("Finances").add({
                    clinicId: clinicId, branchId: currentBranchId, patientId: patientId, type: 'expense', category: isAr ? 'مصروفات معمل' : 'Lab Expense',
                    amount: labCost, date: orderDate, paymentMethod: paymentMethod, 
                    notes: isAr ? `تكلفة معمل: ${labName} - للمريض: ${currentPatientName}` : `Lab Cost: ${labName} - Patient: ${currentPatientName}`,
                    createdBy: currentUserDisplayName, createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            closeModal('labOrderModal');
            document.querySelector('#labOrderModal form').reset();
            alert(isAr ? "✅ تم إرسال الطلب بنجاح وتوثيق المصروفات!" : "✅ Order sent and expenses recorded!");
        } catch (error) {
            alert(isAr ? "❌ خطأ أثناء الإرسال." : "❌ Error sending order.");
        } finally {
            btn.disabled = false;
            if (window.hideLoader) window.hideLoader();
        }
    }

    function loadLabOrders() {
        db.collection("LabOrders").where("patientId", "==", patientId).orderBy("createdAt", "desc").onSnapshot(snap => {
            const isAr = getLang();
            const container = document.getElementById('lab-orders-list');
            if(!container) return;
            container.innerHTML = '';

            if (snap.empty) {
                container.innerHTML = `<div style="text-align: center; color: #64748b; padding: 20px;">${isAr ? 'لا توجد طلبات معمل.' : 'No lab orders.'}</div>`;
                return;
            }

            snap.forEach(doc => {
                const data = doc.data();
                const isPending = data.status === 'pending';
                const pendingTxt = isAr ? '⏳ قيد التنفيذ' : '⏳ Pending';
                const deliveredTxt = isAr ? '✅ تم الاستلام' : '✅ Delivered';
                const statusHtml = isPending ? `<span class="lab-status-pending">${pendingTxt}</span>` : `<span class="lab-status-delivered">${deliveredTxt}</span>`;
                const confirmBtnTxt = isAr ? '✔️ تأكيد الاستلام' : '✔️ Mark Delivered';
                const actionBtn = isPending ? `<button onclick="markLabOrderDelivered('${doc.id}')" style="background:#10b981; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:12px;">${confirmBtnTxt}</button>` : '';

                const deliveryTxt = data.deliveryDate ? `${isAr ? 'التسليم:' : 'Delivery:'} <strong dir="ltr">${data.deliveryDate}</strong>` : (isAr ? 'موعد غير محدد' : 'No date set');
                const labLabel = isAr ? 'معمل:' : 'Lab:';
                const costLabel = isAr ? 'التكلفة:' : 'Cost:';
                const delBtn = isAr ? '🗑️ حذف' : '🗑️ Delete';

                container.innerHTML += `
                    <div class="lab-card">
                        <div style="flex: 2; min-width: 200px;">
                            <h4 style="margin: 0 0 5px 0; color: #0f172a; font-size: 16px;">${data.workType}</h4>
                            <div style="font-size: 13px; color: #64748b;">${labLabel} <strong>${data.labName}</strong> | ${costLabel} <strong>${data.cost}</strong></div>
                        </div>
                        <div style="flex: 1; text-align: left; min-width: 150px; display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                            ${statusHtml} <span style="font-size: 12px; color: #94a3b8;">${deliveryTxt}</span> ${actionBtn}
                            <button class="btn-action" style="background:#fee2e2; color:#ef4444; border-color:#fca5a5; padding: 4px 8px; font-size: 11px;" onclick="deleteDoc('LabOrders', '${doc.id}')">${delBtn}</button>
                        </div>
                    </div>
                `;
            });
        });
    }

    async function markLabOrderDelivered(orderId) {
        const isAr = getLang();
        if(confirm(isAr ? "هل تم استلام الشغل من المعمل؟" : "Is the work delivered?")) {
            if(window.showLoader) window.showLoader(isAr ? "تحديث..." : "Updating...");
            try { await db.collection("LabOrders").doc(orderId).update({ status: 'delivered', deliveredAt: firebase.firestore.FieldValue.serverTimestamp() }); } 
            catch(e) { console.error(e); } finally { if(window.hideLoader) window.hideLoader(); }
        }
    }

    function calculateRemaining(mode = 'add') {
        const prefix = mode === 'add' ? 'sess_' : 'edit_sess_';
        const total = Number(document.getElementById(`${prefix}total`).value) || 0;
        const paid = Number(document.getElementById(`${prefix}paid`).value) || 0;
        document.getElementById(`${prefix}remaining`).value = Math.max(0, total - paid);
    }

    // 🔴 5. تعديل دالة الجلسات (شامل الفرع والـ n8n) 🔴
    async function saveSession(e, isEditMode) {
        e.preventDefault();
        const isAr = getLang();
        const prefix = isEditMode ? 'edit_sess_' : 'sess_';
        const btnId = isEditMode ? 'btn-update-session' : 'btn-save-session';
        const modalId = isEditMode ? 'editSessionModal' : 'sessionModal';
        
        const btn = document.getElementById(btnId);
        btn.disabled = true;
        if (window.showLoader) window.showLoader(isAr ? "جاري الحفظ..." : "Saving...");
        
        const totalAmount = Number(document.getElementById(`${prefix}total`).value) || 0;
        const paidAmount = Number(document.getElementById(`${prefix}paid`).value) || 0;
        const remainingAmount = Number(document.getElementById(`${prefix}remaining`).value) || 0;
        const sessionDate = document.getElementById(`${prefix}date`).value;
        const paymentMethod = document.getElementById(`${prefix}pay_method`).value;

        const procSelect = document.getElementById(`${prefix}procedure`);
        const srv = erpServices.find(s => s.id === procSelect.value);
        const procedureName = srv ? srv.name : (procSelect.options ? procSelect.options[procSelect.selectedIndex]?.text : procSelect.value);

        const contSelect = document.getElementById(`${prefix}contract`);
        const cont = contSelect ? erpContracts.find(c => c.id === contSelect.value) : null;
        const contractName = cont ? cont.name : 'بدون تعاقد';

        // 🔴 الفرع تمت إضافته هنا
        const data = {
            clinicId: clinicId, branchId: currentBranchId, patientId: patientId, date: sessionDate,
            nextAppointment: document.getElementById(`${prefix}next_date`).value || null,
            procedure: procedureName, contract: contractName, 
            tooth: document.getElementById(`${prefix}tooth`).value,
            notes: document.getElementById(`${prefix}notes`).value,
            total: totalAmount, paid: paidAmount, remaining: remainingAmount
        };
        
        try {
            if (isEditMode) {
                const docId = document.getElementById('edit_sess_id').value;
                const oldSession = loadedPatientSessions.find(s => s.id === docId);
                const oldRemaining = oldSession ? (oldSession.remaining || 0) : 0;
                const oldPaid = oldSession ? (oldSession.paid || 0) : 0;
                
                const debtDiff = remainingAmount - oldRemaining;
                const paidDiff = paidAmount - oldPaid;

                await db.collection("Sessions").doc(docId).update(data);
                
                if (paidDiff !== 0) {
                    const incomeData = {
                        clinicId: clinicId, branchId: currentBranchId, patientId: patientId, type: paidDiff > 0 ? 'income' : 'expense', 
                        category: isAr ? 'كشف / جلسة' : 'Session Income',
                        amount: Math.abs(paidDiff), date: sessionDate, paymentMethod: paymentMethod, 
                        notes: isAr ? `تسوية حساب: ${procedureName}` : `Payment Adjust: ${procedureName}`,
                        createdBy: currentUserDisplayName, createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    };
                    await db.collection("Finances").add(incomeData);

                    // 🔔 إرسال الإشعار اللحظي لو المريض دفع فلوس زيادة في التعديل
                    if (paidDiff > 0 && window.triggerN8nWebhook) {
                        window.triggerN8nWebhook("new_revenue", {...incomeData, patientName: currentPatientName});
                    }
                }
                if (debtDiff !== 0) {
                    await db.collection("Patients").doc(patientId).update({ totalDebt: firebase.firestore.FieldValue.increment(debtDiff) });
                    await db.collection("Finances").add({
                        clinicId: clinicId, branchId: currentBranchId, patientId: patientId, type: 'debt', category: isAr ? 'تعديل مديونية جلسة' : 'Session Debt Adjustment',
                        amount: debtDiff, date: sessionDate, notes: isAr ? `تسوية ديون: ${procedureName}` : `Debt Adjust: ${procedureName}`,
                        createdBy: currentUserDisplayName, createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
                const index = loadedPatientSessions.findIndex(s => s.id === docId);
                if(index !== -1) loadedPatientSessions[index] = { ...loadedPatientSessions[index], ...data };
            } else {
                data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                const docRef = await db.collection("Sessions").add(data);
                
                if (paidAmount > 0) {
                    const incomeData = {
                        clinicId: clinicId, branchId: currentBranchId, patientId: patientId, type: 'income', category: isAr ? 'كشف / جلسة' : 'Session Income',
                        amount: paidAmount, date: sessionDate, paymentMethod: paymentMethod, 
                        notes: isAr ? `إيراد جلسة: ${procedureName}` : `Income: ${procedureName}`,
                        createdBy: currentUserDisplayName, createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    };
                    await db.collection("Finances").add(incomeData);

                    // 🔔 إرسال الإشعار اللحظي للمدير على n8n
                    if (window.triggerN8nWebhook) {
                        window.triggerN8nWebhook("new_revenue", {...incomeData, patientName: currentPatientName});
                    }
                }
                if (remainingAmount > 0) {
                    await db.collection("Finances").add({
                        clinicId: clinicId, branchId: currentBranchId, patientId: patientId, type: 'debt', category: isAr ? 'متبقي جلسة' : 'Session Remaining',
                        amount: remainingAmount, date: sessionDate, notes: isAr ? `مديونية جلسة: ${procedureName}` : `Debt: ${procedureName}`,
                        createdBy: currentUserDisplayName, createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    await db.collection("Patients").doc(patientId).update({ totalDebt: firebase.firestore.FieldValue.increment(remainingAmount) });
                }
                data.createdAt = new Date();
                loadedPatientSessions.unshift({ id: docRef.id, ...data });
            }
            
            closeModal(modalId); 
            document.getElementById(isEditMode ? 'editSessionForm' : 'addSessionForm').reset();
            sortDataLocally(loadedPatientSessions);
            renderPatientSessionsTable();
        } catch (error) { 
            console.error(error); 
            alert(isAr ? "حدث خطأ أثناء الحفظ." : "Error saving.");
        } finally {
            btn.disabled = false;
            if (window.hideLoader) window.hideLoader();
        }
    }

    function openPaymentModal(sessionId, currentPaid, currentRemaining) {
        document.getElementById('pay_sess_id').value = sessionId;
        document.getElementById('pay_sess_current_paid').value = currentPaid;
        document.getElementById('pay_sess_remaining').innerText = currentRemaining;
        document.getElementById('pay_amount').value = currentRemaining; 
        document.getElementById('pay_amount').max = currentRemaining; 
        openModal('paymentModal');
    }

    // 🔴 6. دالة سداد المديونية المربوطة بالفرع والـ الداشبورد والـ n8n 🔴
    async function executePayment(e) {
        e.preventDefault();
        const isAr = getLang();
        const btn = document.getElementById('btn-execute-payment');
        btn.disabled = true;

        const sessionId = document.getElementById('pay_sess_id').value;
        const currentPaid = Number(document.getElementById('pay_sess_current_paid').value);
        const amountToPay = Number(document.getElementById('pay_amount').value);
        const paymentMethod = document.getElementById('pay_method').value;
        const currentRemaining = Number(document.getElementById('pay_sess_remaining').innerText);

        if (isNaN(amountToPay) || amountToPay <= 0 || amountToPay > currentRemaining) {
            alert(isAr ? "المبلغ غير صحيح!" : "Invalid amount!");
            btn.disabled = false;
            return;
        }
        if (window.showLoader) window.showLoader(isAr ? "تسجيل السداد..." : "Processing...");

        try {
            const newPaid = currentPaid + amountToPay;
            const newRemaining = currentRemaining - amountToPay;
            const today = getLocalTodayString(); // استخدام التاريخ المحلي

            await db.collection("Sessions").doc(sessionId).update({ paid: newPaid, remaining: newRemaining });
            await db.collection("Patients").doc(patientId).update({ totalDebt: firebase.firestore.FieldValue.increment(-amountToPay) });

            const financeIncomeData = {
                clinicId: clinicId, branchId: currentBranchId, patientId: patientId, type: 'income', 
                category: isAr ? 'كشف / جلسة' : 'Session Income',
                amount: amountToPay, date: today, paymentMethod: paymentMethod, 
                notes: isAr ? `سداد مديونية سابقة (لجلسة قديمة)` : `Debt payment`,
                createdBy: currentUserDisplayName, createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            await db.collection("Finances").add(financeIncomeData);

            await db.collection("Finances").add({
                clinicId: clinicId, branchId: currentBranchId, patientId: patientId, type: 'debt', 
                category: isAr ? 'سداد مديونية' : 'Debt Payment',
                amount: -amountToPay, date: today, notes: isAr ? `خصم مديونية مسددة` : `Deduct paid debt`,
                createdBy: currentUserDisplayName, createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // 🔔 إرسال الإشعار اللحظي للمدير على n8n
            if (window.triggerN8nWebhook) {
                window.triggerN8nWebhook("new_revenue", {...financeIncomeData, patientName: currentPatientName});
            } else if (window.parent && window.parent.triggerN8nWebhook) {
                window.parent.triggerN8nWebhook("new_revenue", {...financeIncomeData, patientName: currentPatientName});
            }

            const idx = loadedPatientSessions.findIndex(s => s.id === sessionId);
            if(idx !== -1) { loadedPatientSessions[idx].paid = newPaid; loadedPatientSessions[idx].remaining = newRemaining; }
            renderPatientSessionsTable();

            closeModal('paymentModal');
            alert(isAr ? "✅ تم سداد المبلغ وتسميعه في الخزنة بنجاح!" : "✅ Payment recorded successfully!");
        } catch (error) { 
            alert(isAr ? "❌ خطأ في السداد" : "Error");
        } finally { 
            btn.disabled = false;
            if (window.hideLoader) window.hideLoader(); 
        }
    }

    function getAccurateTime(timestamp) {
        if (!timestamp) return Infinity; 
        if (typeof timestamp.toMillis === 'function') return timestamp.toMillis();
        if (timestamp.seconds) return timestamp.seconds * 1000;
        return new Date(timestamp).getTime();
    }

    function sortDataLocally(dataArray) {
        dataArray.sort((a, b) => {
            const dateA = new Date(a.date || 0).getTime();
            const dateB = new Date(b.date || 0).getTime();
            if (dateA !== dateB) return dateB - dateA; 
            return getAccurateTime(b.createdAt) - getAccurateTime(a.createdAt);
        });
    }

    async function loadPatientSessions() {
        if (!patientId) return;
        const isAr = getLang();
        const tbody = document.getElementById('sessions-list');
        if(!tbody) return;

        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center;">${isAr ? 'جاري التحميل...' : 'Loading...'}</td></tr>`;
        loadedPatientSessions = [];

        try {
            const snap = await db.collection("Sessions").where("patientId", "==", patientId).get();
            if (!snap.empty) {
                snap.forEach(doc => {
                    const s = doc.data({ serverTimestamps: 'estimate' });
                    s.id = doc.id;
                    loadedPatientSessions.push(s);
                });
                sortDataLocally(loadedPatientSessions);
                renderPatientSessionsTable();
            } else {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #64748b;">${isAr ? 'لا توجد جلسات.' : 'No sessions.'}</td></tr>`;
            }
        } catch (error) { 
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: red;">Error Loading Data</td></tr>`;
        }
    }

    function renderPatientSessionsTable(dataToRender = loadedPatientSessions) {
        const tbody = document.getElementById('sessions-list');
        if(!tbody) return;
        tbody.innerHTML = '';
        const isAr = getLang();
        
        if(dataToRender.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color:#64748b;">${isAr ? 'لا توجد بيانات' : 'No Data'}</td></tr>`;
            return;
        }

        dataToRender.forEach(s => {
            const total = s.total || 0;
            const paid = s.paid || 0;
            const remaining = s.remaining || 0;
            const nextApp = s.nextAppointment ? `<span style="color:#d97706; font-weight:bold;">${s.nextAppointment}</span>` : '---';

            let timeStr = '---';
            if (s.createdAt) {
                try {
                    const d = typeof s.createdAt.toDate === 'function' ? s.createdAt.toDate() : new Date(s.createdAt);
                    timeStr = d.toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {hour: '2-digit', minute:'2-digit'});
                } catch(e) { timeStr = '---'; }
            }

            let payBtnHtml = '';
            if (remaining > 0) {
                payBtnHtml = `<button class="btn-action" style="background:#10b981; color:white; border-color:#059669;" onclick="openPaymentModal('${s.id}', ${paid}, ${remaining})">💰 ${isAr ? 'سداد' : 'Pay'}</button>`;
            }

            const toothLabel = isAr ? 'السن:' : 'Tooth:';
            const viewBtn = isAr ? '👁️ التفاصيل' : '👁️ View';

            let procDisplay = `${s.procedure}`;
            if(s.contract && s.contract !== 'بدون تعاقد') {
                procDisplay += `<br><small style="color:#10b981; font-weight:bold;">تأمين: ${s.contract}</small>`;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="display: flex; flex-direction: column; align-items: center;">
                        <span class="data-badge">${s.date}</span>
                        <span style="font-size: 13px; color: #64748b; margin-top: 4px; font-weight: bold;">${timeStr}</span>
                    </div>
                </td>
                <td style="font-weight:bold; color:#0f172a;">${procDisplay} <br> <small style="color:gray;">${toothLabel} ${s.tooth || '---'}</small></td>
                <td style="font-weight:bold;">${total}</td>
                <td style="color: #10b981; font-weight: bold;">${paid}</td>
                <td style="color: ${remaining > 0 ? '#ef4444' : '#64748b'}; font-weight: bold;">${remaining}</td>
                <td dir="ltr">${nextApp}</td>
                <td style="text-align: center;">
                    <div class="action-group">
                        ${payBtnHtml}
                        <button class="btn-view" onclick="viewSessionDetails('${s.id}')">${viewBtn}</button>
                        <button class="btn-action" style="background:#fff7ed; color:#d97706; border-color:#fed7aa;" onclick="openEditSession('${s.id}')">✏️</button>
                        <button class="btn-action" style="background:#fee2e2; color:#ef4444; border-color:#fca5a5;" onclick="deleteDoc('Sessions', '${s.id}')">🗑️</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    function openEditSession(docId) {
        const session = loadedPatientSessions.find(s => s.id === docId);
        if (!session) return;
        document.getElementById('edit_sess_id').value = session.id;
        document.getElementById('edit_sess_date').value = session.date;
        document.getElementById('edit_sess_next_date').value = session.nextAppointment || '';
        
        const procEl = document.getElementById('edit_sess_procedure');
        if(procEl) {
            const srv = erpServices.find(s => s.name === session.procedure);
            if(srv) procEl.value = srv.id;
        }
        const contEl = document.getElementById('edit_sess_contract');
        if(contEl) {
            const cont = erpContracts.find(c => c.name === session.contract);
            if(cont) contEl.value = cont.id; else contEl.value = "";
        }

        document.getElementById('edit_sess_tooth').value = session.tooth || '';
        document.getElementById('edit_sess_notes').value = session.notes || '';
        document.getElementById('edit_sess_total').value = session.total || 0;
        document.getElementById('edit_sess_paid').value = session.paid || 0;
        document.getElementById('edit_sess_remaining').value = session.remaining || 0;
        openModal('editSessionModal');
    }

    function searchSessions() {
        const input = document.getElementById('searchSessionInput').value.trim().toLowerCase();
        if(!input) { resetSessionSearch(); return; }
        const filtered = loadedPatientSessions.filter(s => {
            return (s.procedure && s.procedure.toLowerCase().includes(input)) ||
                   (s.date && s.date.includes(input)) ||
                   (s.notes && s.notes.toLowerCase().includes(input)) ||
                   (s.total && s.total.toString().includes(input));
        });
        renderPatientSessionsTable(filtered);
    }

    function resetSessionSearch() {
        document.getElementById('searchSessionInput').value = '';
        renderPatientSessionsTable();
    }

    function viewSessionDetails(sessionId) {
        const isAr = (localStorage.getItem('preferredLang') || 'ar') === 'ar';
        if (window.showLoader) window.showLoader(isAr ? "جاري فتح تفاصيل الجلسة..." : "Loading session...");
        window.location.href = `session-details.html?sessionId=${sessionId}&patientId=${patientId}`;
    }

    async function deleteDoc(collectionName, docId) {
        const isAr = getLang();
        if(confirm(isAr ? "هل أنت متأكد من الحذف؟" : "Are you sure you want to delete?")) {
            if (window.showLoader) window.showLoader(isAr ? "جاري الحذف..." : "Deleting...");
            try { 
                await db.collection(collectionName).doc(docId).delete(); 
                if (collectionName === 'Sessions') {
                    loadedPatientSessions = loadedPatientSessions.filter(s => s.id !== docId);
                    renderPatientSessionsTable();
                }
            } 
            catch (e) { console.error(e); }
            finally { if (window.hideLoader) window.hideLoader(); }
        }
    }

    function initProfile() {
        setTimeout(() => { loadPatientData(); }, 100);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initProfile);
    } else {
        initProfile();
    }

    firebase.auth().onAuthStateChanged(async (user) => { 
        if (user) { 
            loadERPData(); 
            try {
                const userDoc = await db.collection("Users").doc(user.email).get();
                if (userDoc.exists) {
                    const isAr = getLang();
                    currentUserDisplayName = userDoc.data().name || (isAr ? "مدير النظام" : "Admin");
                }
            } catch(e) {}
        } 
    });

    function openQRModal() {
        const isAr = getLang();
        
        document.getElementById('qr_patient_name').innerText = currentPatientName;
        const phoneNode = document.getElementById('prof-phone');
        const phoneText = phoneNode ? phoneNode.innerText.replace('📞', '').trim() : '';
        document.getElementById('qr_patient_phone').innerText = phoneText;

        const qrContainer = document.getElementById('qrcode_container');
        qrContainer.innerHTML = '';

        const profileUrl = window.location.origin + "/patient-profile.html?id=" + patientId + "&clinicId=" + clinicId;

        new QRCode(qrContainer, {
            text: profileUrl, 
            width: 150,
            height: 150,
            colorDark : "#0f172a",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.L 
        });

        openModal('qrPrintModal');
    }
    
    function printPatientCard() {
        const cardContent = document.getElementById('printArea').outerHTML;
        const printSection = document.getElementById('actualPrintSection');
        printSection.innerHTML = cardContent;
        closeModal('qrPrintModal');

        setTimeout(() => {
            window.print();
            printSection.innerHTML = '';
        }, 500);
    }

    window.sendPortalLinkWhatsApp = sendPortalLinkWhatsApp; 
    window.openQRModal = openQRModal;
    window.printPatientCard = printPatientCard;
    window.openModal = openModal;
    window.closeModal = closeModal;
    window.saveSession = saveSession;
    window.openPaymentModal = openPaymentModal;
    window.executePayment = executePayment;
    window.openEditSession = openEditSession;
    window.searchSessions = searchSessions;
    window.resetSessionSearch = resetSessionSearch;
    window.viewSessionDetails = viewSessionDetails;
    window.deleteDoc = deleteDoc;
    window.calcInstallments = calcInstallments;
    window.saveInstallmentPlan = saveInstallmentPlan;
    window.saveLabOrder = saveLabOrder;
    window.markLabOrderDelivered = markLabOrderDelivered;
    window.calculateProfileERP = calculateProfileERP; 

} catch (globalError) {
    alert("حدث خطأ تقني يمنع تحميل الصفحة: " + globalError.message);
}
