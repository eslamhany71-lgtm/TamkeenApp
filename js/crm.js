// crm.js - Enterprise CRM Logic (Kanban Drag & Drop + Firebase)

let currentUserEmail = "";

// 1. التحقق من الدخول وجلب العملاء
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        currentUserEmail = user.email;
        loadLeads();
    } else {
        window.location.href = "index.html";
    }
});

// 2. جلب العملاء من Firestore لحظياً (Real-time)
function loadLeads() {
    firebase.firestore().collection("CRM_Leads")
        .where("assignedTo", "==", currentUserEmail) // الموظف يشوف عملائه بس
        .onSnapshot((snapshot) => {
            // تفريغ الأعمدة
            document.getElementById('body-new').innerHTML = "";
            document.getElementById('body-contacted').innerHTML = "";
            document.getElementById('body-negotiation').innerHTML = "";
            document.getElementById('body-won').innerHTML = "";

            let counts = { new: 0, contacted: 0, negotiation: 0, won: 0, lost: 0 };

            snapshot.forEach((doc) => {
                const lead = { id: doc.id, ...doc.data() };
                if (counts[lead.status] !== undefined) counts[lead.status]++;
                
                // رسم الكارت لو مش مرفوض (المرفوض مش بيظهر في الـ Kanban بيظهر في الإحصائيات بس)
                if (lead.status !== 'lost') {
                    createLeadCard(lead);
                }
            });

            // تحديث العدادات
            document.getElementById('count-new').innerText = counts.new;
            document.getElementById('count-contacted').innerText = counts.contacted;
            document.getElementById('count-negotiation').innerText = counts.negotiation;
            document.getElementById('count-won').innerText = counts.won;
            
            document.getElementById('val-total').innerText = snapshot.size;
            document.getElementById('val-won').innerText = counts.won;
            document.getElementById('val-lost').innerText = counts.lost || 0;
        });
}

// 3. إنشاء كارت العميل
function createLeadCard(lead) {
    const colBody = document.getElementById(`body-${lead.status}`);
    if (!colBody) return;

    const currency = localStorage.getItem('preferredLang') === 'en' ? 'EGP' : 'ج.م';
    const valueTxt = lead.value ? `${parseFloat(lead.value).toLocaleString()} ${currency}` : '---';

    const card = document.createElement('div');
    card.className = `lead-card priority-${lead.priority}`;
    card.draggable = true;
    card.id = `lead-${lead.id}`;
    
    // إيفنت السحب
    card.addEventListener('dragstart', dragStart);

    card.innerHTML = `
        <h4 class="lead-name">${lead.name}</h4>
        <p class="lead-info">📞 ${lead.phone}</p>
        <div class="lead-footer">
            <span class="lead-value">💰 ${valueTxt}</span>
            <button class="btn-edit-lead" onclick="editLead('${lead.id}')">✏️</button>
        </div>
    `;
    colBody.appendChild(card);
}

// 4. لوجيك السحب والإفلات (Drag & Drop)
function dragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.id);
    setTimeout(() => { e.target.style.opacity = '0.5'; }, 0);
}

function allowDrop(e) {
    e.preventDefault();
    e.currentTarget.querySelector('.col-body').classList.add('drag-over');
}

function drop(e, newStatus) {
    e.preventDefault();
    const colBody = document.getElementById(`body-${newStatus}`);
    
    // إزالة تأثير الـ hover من كل الأعمدة
    document.querySelectorAll('.col-body').forEach(el => el.classList.remove('drag-over'));

    const leadIdRaw = e.dataTransfer.getData('text/plain');
    if (!leadIdRaw) return;
    
    const leadId = leadIdRaw.replace('lead-', '');
    const card = document.getElementById(leadIdRaw);
    
    if (card) {
        card.style.opacity = '1';
        // تحديث الحالة في قاعدة البيانات فوراً
        firebase.firestore().collection("CRM_Leads").doc(leadId).update({
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(err => console.error("Error updating status: ", err));
    }
}

// 5. إدارة المودال (إضافة وتعديل)
function openLeadModal() {
    document.getElementById('leadForm').reset();
    document.getElementById('leadId').value = "";
    document.getElementById('modal-lead-title').innerText = localStorage.getItem('preferredLang') === 'en' ? "Add New Lead" : "إضافة عميل جديد";
    document.getElementById('leadModal').style.display = "flex";
}

function closeLeadModal() {
    document.getElementById('leadModal').style.display = "none";
}

async function saveLead(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-lead');
    btn.disabled = true;

    const leadId = document.getElementById('leadId').value;
    const leadData = {
        name: document.getElementById('leadName').value,
        phone: document.getElementById('leadPhone').value,
        value: document.getElementById('leadValue').value || 0,
        priority: document.getElementById('leadPriority').value,
        note: document.getElementById('leadNote').value,
        assignedTo: currentUserEmail,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        if (leadId) {
            // تعديل عميل موجود
            await firebase.firestore().collection("CRM_Leads").doc(leadId).update(leadData);
        } else {
            // عميل جديد
            leadData.status = 'new'; // الحالة الافتراضية
            leadData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await firebase.firestore().collection("CRM_Leads").add(leadData);
        }
        closeLeadModal();
    } catch (error) {
        alert("Error: " + error.message);
    } finally {
        btn.disabled = false;
    }
}

// تعديل بيانات العميل
async function editLead(id) {
    const doc = await firebase.firestore().collection("CRM_Leads").doc(id).get();
    if (doc.exists) {
        const lead = doc.data();
        document.getElementById('leadId').value = id;
        document.getElementById('leadName').value = lead.name;
        document.getElementById('leadPhone').value = lead.phone;
        document.getElementById('leadValue').value = lead.value;
        document.getElementById('leadPriority').value = lead.priority;
        document.getElementById('leadNote').value = lead.note || "";
        
        document.getElementById('modal-lead-title').innerText = localStorage.getItem('preferredLang') === 'en' ? "Edit Lead" : "تعديل بيانات العميل";
        document.getElementById('leadModal').style.display = "flex";
    }
}

// 6. نظام الترجمة (لصفحة الـ CRM)
function updatePageContent(lang) {
    const t = {
        ar: {
            title: "إدارة المبيعات (CRM)", navHome: "الرئيسية", navCrm: "إدارة العملاء (CRM)",
            header: "مسار المبيعات (Sales Pipeline)", btnAdd: "➕ إضافة عميل جديد",
            total: "إجمالي العملاء:", wonLbl: "تم البيع (Won):", lostLbl: "مرفوض (Lost):",
            colNew: "عميل جديد (New)", colCont: "جاري التواصل", colNeg: "تفاوض / عرض سعر", colWon: "تم البيع (Won)",
            lblName: "اسم العميل / الشركة", lblPhone: "رقم الهاتف", lblValue: "قيمة الصفقة المتوقعة", lblPriority: "الأولوية", lblNote: "ملاحظات",
            optHigh: "🔥 عالية (ساخن)", optMed: "⚡ متوسطة", optLow: "❄️ منخفضة (بارد)", btnSave: "حفظ بيانات العميل"
        },
        en: {
            title: "Sales Management (CRM)", navHome: "Home", navCrm: "CRM",
            header: "Sales Pipeline", btnAdd: "➕ Add New Lead",
            total: "Total Leads:", wonLbl: "Won:", lostLbl: "Lost:",
            colNew: "New Lead", colCont: "Contacted", colNeg: "Negotiation", colWon: "Closed Won",
            lblName: "Client / Company Name", lblPhone: "Phone Number", lblValue: "Expected Deal Value", lblPriority: "Priority", lblNote: "Notes",
            optHigh: "🔥 High (Hot)", optMed: "⚡ Medium", optLow: "❄️ Low (Cold)", btnSave: "Save Lead Details"
        }
    };

    const c = t[lang] || t.ar;
    document.title = c.title;
    const set = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };

    set('txt-brand', lang === 'ar' ? 'تمكين ERP' : 'Tamkeen ERP');
    set('nav-home', c.navHome); set('nav-crm', c.navCrm);
    set('txt-header', c.header); set('btn-add-lead', c.btnAdd);
    set('lbl-total-leads', c.total); set('lbl-won-leads', c.wonLbl); set('lbl-lost-leads', c.lostLbl);
    set('txt-col-new', c.colNew); set('txt-col-contacted', c.colCont); set('txt-col-negotiation', c.colNeg); set('txt-col-won', c.colWon);
    
    set('lbl-lead-name', c.lblName); set('lbl-lead-phone', c.lblPhone); set('lbl-lead-value', c.lblValue); 
    set('lbl-lead-priority', c.lblPriority); set('lbl-lead-note', c.lblNote);
    set('opt-high', c.optHigh); set('opt-medium', c.optMed); set('opt-low', c.optLow); set('btn-save-lead', c.btnSave);
}

// دالة طي القائمة الجانبية (للتوافق مع الكود الجديد)
function toggleSidebarDesktop() {
    document.getElementById('sidebar').classList.toggle('collapsed');
    document.querySelector('.main-content').classList.toggle('expanded');
}
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}
