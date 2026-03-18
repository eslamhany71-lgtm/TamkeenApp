// crm.js - Enterprise CRM Logic (Phase 1 + Excel Import)

let currentUserEmail = "";

firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        currentUserEmail = user.email;
        loadLeads();
    } else {
        window.parent.location.href = "index.html";
    }
});

function loadLeads() {
    firebase.firestore().collection("CRM_Leads")
        .where("assignedTo", "==", currentUserEmail)
        .onSnapshot((snapshot) => {
            document.getElementById('body-new').innerHTML = "";
            document.getElementById('body-contacted').innerHTML = "";
            document.getElementById('body-negotiation').innerHTML = "";
            document.getElementById('body-won').innerHTML = "";
            document.getElementById('body-lost').innerHTML = "";

            let counts = { new: 0, contacted: 0, negotiation: 0, won: 0, lost: 0 };

            snapshot.forEach((doc) => {
                const lead = { id: doc.id, ...doc.data() };
                if (counts[lead.status] !== undefined) counts[lead.status]++;
                createLeadCard(lead);
            });

            document.getElementById('count-new').innerText = counts.new;
            document.getElementById('count-contacted').innerText = counts.contacted;
            document.getElementById('count-negotiation').innerText = counts.negotiation;
            document.getElementById('count-won').innerText = counts.won;
            document.getElementById('count-lost').innerText = counts.lost;
            
            document.getElementById('val-total').innerText = snapshot.size;
            document.getElementById('val-won').innerText = counts.won;
            document.getElementById('val-lost').innerText = counts.lost;

            toggleBulkActions();
        });
}

function createLeadCard(lead) {
    const colBody = document.getElementById(`body-${lead.status}`);
    if (!colBody) return;

    const currency = localStorage.getItem('preferredLang') === 'en' ? 'EGP' : 'ج.م';
    const valueTxt = lead.value ? `${parseFloat(lead.value).toLocaleString()} ${currency}` : '---';

    const card = document.createElement('div');
    card.className = `lead-card priority-${lead.priority}`;
    card.draggable = true;
    card.id = `lead-${lead.id}`;
    
    card.addEventListener('dragstart', dragStart);

    let feedbackHtml = lead.feedback ? `<div class="lead-feedback-box">💬 ${lead.feedback}</div>` : '';

    card.innerHTML = `
        <div class="lead-header">
            <h4 class="lead-name">${lead.name}</h4>
            <input type="checkbox" class="lead-checkbox" value="${lead.id}" onchange="toggleBulkActions()">
        </div>
        <p class="lead-info">📞 ${lead.phone}</p>
        ${feedbackHtml}
        <div class="lead-footer">
            <span class="lead-value">💰 ${valueTxt}</span>
            <div class="action-buttons">
                <button class="btn-action" title="تعليق / فيدباك" onclick="openFeedbackModal('${lead.id}', \`${lead.feedback || ''}\`)">💬</button>
                <button class="btn-action" title="تعديل بيانات" onclick="editLead('${lead.id}')">✏️</button>
                <button class="btn-action text-red" title="حذف العميل" onclick="deleteLead('${lead.id}')">🗑️</button>
            </div>
        </div>
    `;
    colBody.appendChild(card);
}

// --- التحديد والحذف ---
function toggleBulkActions() {
    const checkboxes = document.querySelectorAll('.lead-checkbox:checked');
    const bulkDiv = document.getElementById('bulk-actions');
    const countSpan = document.getElementById('selected-count');
    
    if (checkboxes.length > 0) {
        countSpan.innerText = checkboxes.length;
        bulkDiv.style.display = 'flex';
    } else {
        bulkDiv.style.display = 'none';
    }
}

async function deleteSelectedLeads() {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const checkboxes = document.querySelectorAll('.lead-checkbox:checked');
    
    if (confirm(lang === 'ar' ? `هل أنت متأكد من حذف ${checkboxes.length} عميل نهائياً؟` : `Are you sure you want to delete ${checkboxes.length} leads?`)) {
        const batch = firebase.firestore().batch();
        checkboxes.forEach(box => {
            const ref = firebase.firestore().collection("CRM_Leads").doc(box.value);
            batch.delete(ref);
        });
        await batch.commit();
        toggleBulkActions();
    }
}

async function deleteLead(id) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    if (confirm(lang === 'ar' ? "هل أنت متأكد من حذف هذا العميل؟" : "Delete this lead?")) {
        await firebase.firestore().collection("CRM_Leads").doc(id).delete();
    }
}

// --- رفع ملف الإكسيل (Excel Import) ---
async function uploadExcel(e) {
    const file = e.target.files[0];
    if (!file) return;

    const lang = localStorage.getItem('preferredLang') || 'ar';
    const reader = new FileReader();

    reader.onload = async function(event) {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // تحويل الشيت لـ مصفوفة (Array of arrays)
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // مسح أول صف (عناوين الأعمدة)
        rows.shift();

        if (rows.length === 0) {
            alert(lang === 'ar' ? "الشيت فارغ أو لا يحتوي على بيانات!" : "Sheet is empty!");
            return;
        }

        // فايربيز Batch Write بتسمح بـ 500 عملية كحد أقصى في المرة الواحدة
        if (rows.length > 500) {
            alert(lang === 'ar' ? "الحد الأقصى للرفع هو 500 عميل في المرة الواحدة." : "Max upload is 500 leads at once.");
            return;
        }

        alert(lang === 'ar' ? `جاري رفع ${rows.length} عميل...` : `Uploading ${rows.length} leads...`);

        const batch = firebase.firestore().batch();
        let addedCount = 0;

        rows.forEach(row => {
            if (!row[0]) return; // لو مفيش اسم، يتجاهل الصف ده
            
            const leadRef = firebase.firestore().collection("CRM_Leads").doc();
            
            // تحديد الأولوية من الكلمة
            let priorityVal = 'medium';
            if (row[3]) {
                const p = String(row[3]).toLowerCase();
                if (p.includes('عالي') || p.includes('high')) priorityVal = 'high';
                else if (p.includes('منخفض') || p.includes('low')) priorityVal = 'low';
            }

            batch.set(leadRef, {
                name: String(row[0] || "بدون اسم"),
                phone: String(row[1] || ""),
                value: Number(row[2]) || 0,
                priority: priorityVal,
                note: String(row[4] || ""),
                status: 'new',
                assignedTo: currentUserEmail,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            addedCount++;
        });

        try {
            await batch.commit();
            alert(lang === 'ar' ? `تم إضافة ${addedCount} عميل بنجاح!` : `Successfully added ${addedCount} leads!`);
        } catch (error) {
            alert("Error: " + error.message);
        }
        
        e.target.value = ""; // تفريغ خانة الملف عشان لو حب يرفع نفس الملف تاني
    };

    reader.readAsArrayBuffer(file);
}

// --- الفيدباك (التعليقات) ---
function openFeedbackModal(id, currentFeedback) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.getElementById('feedbackLeadId').value = id;
    document.getElementById('leadFeedback').value = currentFeedback || "";
    document.getElementById('modal-feedback-title').innerText = lang === 'ar' ? "تحديث حالة العميل" : "Update Lead Status";
    document.getElementById('feedbackModal').style.display = "flex";
}
function closeFeedbackModal() { document.getElementById('feedbackModal').style.display = "none"; }
async function saveFeedback(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-feedback');
    btn.disabled = true;
    const leadId = document.getElementById('feedbackLeadId').value;
    const feedbackText = document.getElementById('leadFeedback').value;
    try {
        await firebase.firestore().collection("CRM_Leads").doc(leadId).update({ feedback: feedbackText, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        closeFeedbackModal();
    } catch (error) { alert("Error: " + error.message); } finally { btn.disabled = false; }
}

// --- السحب والإفلات ---
function dragStart(e) {
    if(e.target.className.includes("lead-checkbox") || e.target.className.includes("btn-action")) { e.preventDefault(); return; }
    e.dataTransfer.setData('text/plain', e.target.id);
    setTimeout(() => { e.target.style.opacity = '0.5'; }, 0);
}
function allowDrop(e) { e.preventDefault(); e.currentTarget.querySelector('.col-body').classList.add('drag-over'); }
function drop(e, newStatus) {
    e.preventDefault();
    document.querySelectorAll('.col-body').forEach(el => el.classList.remove('drag-over'));
    const leadIdRaw = e.dataTransfer.getData('text/plain');
    if (!leadIdRaw) return;
    const leadId = leadIdRaw.replace('lead-', '');
    const card = document.getElementById(leadIdRaw);
    if (card) {
        card.style.opacity = '1';
        firebase.firestore().collection("CRM_Leads").doc(leadId).update({ status: newStatus, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }).catch(err => console.error(err));
    }
}

// --- المودال والحفظ (إضافة / تعديل) ---
function openLeadModal() { document.getElementById('leadForm').reset(); document.getElementById('leadId').value = ""; document.getElementById('modal-lead-title').innerText = localStorage.getItem('preferredLang') === 'en' ? "Add New Lead" : "إضافة عميل جديد"; document.getElementById('leadModal').style.display = "flex"; }
function closeLeadModal() { document.getElementById('leadModal').style.display = "none"; }
async function saveLead(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-lead');
    btn.disabled = true;
    const leadId = document.getElementById('leadId').value;
    const leadData = { name: document.getElementById('leadName').value, phone: document.getElementById('leadPhone').value, value: document.getElementById('leadValue').value || 0, priority: document.getElementById('leadPriority').value, note: document.getElementById('leadNote').value, assignedTo: currentUserEmail, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
    try {
        if (leadId) { await firebase.firestore().collection("CRM_Leads").doc(leadId).update(leadData); } 
        else { leadData.status = 'new'; leadData.createdAt = firebase.firestore.FieldValue.serverTimestamp(); await firebase.firestore().collection("CRM_Leads").add(leadData); }
        closeLeadModal();
    } catch (error) { alert("Error: " + error.message); } finally { btn.disabled = false; }
}

async function editLead(id) {
    const doc = await firebase.firestore().collection("CRM_Leads").doc(id).get();
    if (doc.exists) {
        const lead = doc.data();
        document.getElementById('leadId').value = id; document.getElementById('leadName').value = lead.name; document.getElementById('leadPhone').value = lead.phone; document.getElementById('leadValue').value = lead.value; document.getElementById('leadPriority').value = lead.priority; document.getElementById('leadNote').value = lead.note || "";
        document.getElementById('modal-lead-title').innerText = localStorage.getItem('preferredLang') === 'en' ? "Edit Lead" : "تعديل بيانات العميل"; document.getElementById('leadModal').style.display = "flex";
    }
}

function updatePageContent(lang) {
    const t = {
        ar: {
            header: "مسار المبيعات (Sales Pipeline)", sub: "إدارة العملاء وتتبع مراحل المبيعات والصفقات", btnAdd: "➕ إضافة عميل جديد",
            total: "إجمالي العملاء:", wonLbl: "تم البيع (Won):", lostLbl: "مرفوض (Lost):",
            colNew: "عميل جديد (New)", colCont: "جاري التواصل", colNeg: "تفاوض / عرض سعر", colWon: "تم البيع (Won)", colLost: "مرفوض (Lost)",
            lblName: "اسم العميل / الشركة", lblPhone: "رقم الهاتف", lblValue: "قيمة الصفقة المتوقعة", lblPriority: "الأولوية", lblNote: "ملاحظات أولية",
            optHigh: "🔥 عالية (ساخن)", optMed: "⚡ متوسطة", optLow: "❄️ منخفضة (بارد)", btnSave: "حفظ بيانات العميل",
            lblFeedback: "التعليق / الفيدباك", btnSaveFeedback: "حفظ التعليق", btnBulkDelete: "🗑️ حذف المحدد", btnImportExcel: "📊 رفع شيت إكسيل"
        },
        en: {
            header: "Sales Pipeline", sub: "Manage clients and track sales deals", btnAdd: "➕ Add New Lead",
            total: "Total Leads:", wonLbl: "Won:", lostLbl: "Lost:",
            colNew: "New Lead", colCont: "Contacted", colNeg: "Negotiation", colWon: "Closed Won", colLost: "Lost",
            lblName: "Client / Company Name", lblPhone: "Phone Number", lblValue: "Expected Deal Value", lblPriority: "Priority", lblNote: "Initial Notes",
            optHigh: "🔥 High (Hot)", optMed: "⚡ Medium", optLow: "❄️ Low (Cold)", btnSave: "Save Lead Details",
            lblFeedback: "Feedback / Comment", btnSaveFeedback: "Save Feedback", btnBulkDelete: "🗑️ Delete Selected", btnImportExcel: "📊 Upload Excel"
        }
    };
    const c = t[lang] || t.ar; document.body.dir = lang === 'en' ? 'ltr' : 'rtl';
    const set = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };

    set('txt-header', c.header); set('txt-subtitle', c.sub); set('btn-add-lead', c.btnAdd); set('btn-import-excel', c.btnImportExcel);
    set('lbl-total-leads', c.total); set('lbl-won-leads', c.wonLbl); set('lbl-lost-leads', c.lostLbl);
    set('txt-col-new', c.colNew); set('txt-col-contacted', c.colCont); set('txt-col-negotiation', c.colNeg); set('txt-col-won', c.colWon); set('txt-col-lost', c.colLost);
    set('lbl-lead-name', c.lblName); set('lbl-lead-phone', c.lblPhone); set('lbl-lead-value', c.lblValue); set('lbl-lead-priority', c.lblPriority); set('lbl-lead-note', c.lblNote);
    set('opt-high', c.optHigh); set('opt-medium', c.optMed); set('opt-low', c.optLow); set('btn-save-lead', c.btnSave);
    set('lbl-feedback', c.lblFeedback); set('btn-save-feedback', c.btnSaveFeedback); set('btn-bulk-delete', c.btnBulkDelete);
}

window.onload = () => { updatePageContent(localStorage.getItem('preferredLang') || 'ar'); };
