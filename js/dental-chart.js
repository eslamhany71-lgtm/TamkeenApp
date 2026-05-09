// js/dental-chart.js - NivaDent Palmer Quadrants & Auto-Billing Integration

// 🔴 توزيعات الأسنان الطبية (FDI) 🔴
const adultUR = [18, 17, 16, 15, 14, 13, 12, 11]; // يمين علوي
const adultUL = [21, 22, 23, 24, 25, 26, 27, 28]; // يسار علوي
const adultLR = [48, 47, 46, 45, 44, 43, 42, 41]; // يمين سفلي
const adultLL = [31, 32, 33, 34, 35, 36, 37, 38]; // يسار سفلي

const childUR = [55, 54, 53, 52, 51]; 
const childUL = [61, 62, 63, 64, 65]; 
const childLR = [85, 84, 83, 82, 81]; 
const childLL = [71, 72, 73, 74, 75]; 

let currentSelectedToothId = null;
let currentSelectedPart = null; 
let currentPatientId = null; // سيتم تمريره من الـ Session أو الـ Profile

// قاموس الترجمة
const dcLang = {
    ar: { 
        adults: "أسنان البالغين (Adults)", pedo: "أسنان الأطفال (Pediatric)",
        tRoot: "الجذر", tCenter: "المنتصف", tTop: "العلوي", tBottom: "السفلي", tLeft: "الأيسر", tRight: "الأيمن", tWhole: "السِنة كاملة",
        stExtract: "🔴 خلع", stImplant: "🔩 زراعة", stCrown: "👑 طربوش", stClear: "⚪ سليم (Clear)", stEndo: "💖 حشو عصب", stDecay: "🟡 تسوس", stFill: "🔵 حشو",
        billPrompt: "هل تريد إضافة هذا الإجراء ({action}) لفاتورة الجلسة الحالية؟"
    },
    en: { 
        adults: "Adult Teeth", pedo: "Pediatric Teeth",
        tRoot: "Root", tCenter: "Occlusal", tTop: "Buccal", tBottom: "Lingual", tLeft: "Mesial", tRight: "Distal", tWhole: "Whole Tooth",
        stExtract: "🔴 Extract", stImplant: "🔩 Implant", stCrown: "👑 Crown", stClear: "⚪ Clear", stEndo: "💖 Endo", stDecay: "🟡 Decay", stFill: "🔵 Fill",
        billPrompt: "Do you want to add this procedure ({action}) to the current session's bill?"
    }
};

// ==========================================
// 1. بناء هيكل الصليبة (Quadrants)
// ==========================================
function buildAdvancedDentalChart(patId) {
    currentPatientId = patId; // حفظ أيدي المريض للحفظ الدائم
    const wrapper = document.getElementById('dental-chart-wrapper');
    if (!wrapper) return;
    
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const c = dcLang[lang];

    wrapper.innerHTML = `
        <!-- بالغين -->
        <h2 class="chart-section-title">${c.adults}</h2>
        <div class="chart-grid">
            <span class="quad-label ur">R</span> <span class="quad-label ul">L</span>
            <div class="quad-ur" id="quad-adult-ur"></div>
            <div class="quad-ul" id="quad-adult-ul"></div>
            <span class="quad-label lr">R</span> <span class="quad-label ll">L</span>
            <div class="quad-lr" id="quad-adult-lr"></div>
            <div class="quad-ll" id="quad-adult-ll"></div>
        </div>

        <!-- أطفال -->
        <h2 class="chart-section-title" style="margin-top: 50px;">${c.pedo}</h2>
        <div class="chart-grid">
            <span class="quad-label ur">R</span> <span class="quad-label ul">L</span>
            <div class="quad-ur" id="quad-child-ur"></div>
            <div class="quad-ul" id="quad-child-ul"></div>
            <span class="quad-label lr">R</span> <span class="quad-label ll">L</span>
            <div class="quad-lr" id="quad-child-lr"></div>
            <div class="quad-ll" id="quad-child-ll"></div>
        </div>
    `;

    // رسم الأسنان
    adultUR.forEach(num => document.getElementById('quad-adult-ur').appendChild(createComplexToothSVG(num, 'upper', false)));
    adultUL.forEach(num => document.getElementById('quad-adult-ul').appendChild(createComplexToothSVG(num, 'upper', false)));
    adultLR.forEach(num => document.getElementById('quad-adult-lr').appendChild(createComplexToothSVG(num, 'lower', false)));
    adultLL.forEach(num => document.getElementById('quad-adult-ll').appendChild(createComplexToothSVG(num, 'lower', false)));

    childUR.forEach(num => document.getElementById('quad-child-ur').appendChild(createComplexToothSVG(num, 'upper', true)));
    childUL.forEach(num => document.getElementById('quad-child-ul').appendChild(createComplexToothSVG(num, 'upper', true)));
    childLR.forEach(num => document.getElementById('quad-child-lr').appendChild(createComplexToothSVG(num, 'lower', true)));
    childLL.forEach(num => document.getElementById('quad-child-ll').appendChild(createComplexToothSVG(num, 'lower', true)));

    // جلب الداتا الدائمة للمريض
    fetchPatientDentalHistory();
}

// تحويل رقم السِنة العلمي لرقم 1-8 أو A-E عشان العرض (Palmer Notation)
function getToothDisplayName(fdiNum, isChild) {
    const numStr = String(fdiNum);
    const lastDigit = numStr.charAt(1);
    if (!isChild) return lastDigit; // البالغين 1-8
    
    // الأطفال A-E
    const letterMap = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E' };
    return letterMap[lastDigit] || lastDigit;
}

// ==========================================
// 2. مصنع رسم الـ SVG
// ==========================================
function createComplexToothSVG(num, jawType, isChild) {
    const wrapper = document.createElement('div');
    wrapper.className = `tooth-wrapper`;
    wrapper.id = `tooth-wrap-${num}`;

    const isMolar = [18,17,16,15,14, 24,25,26,27,28, 48,47,46,45,44, 34,35,36,37,38, 55,54, 64,65, 85,84, 74,75].includes(num);
    const isLower = jawType === 'lower';
    const transformStyle = isLower ? `transform: rotate(180deg);` : ``;

    let svgContent = '';

    if (isMolar) {
        svgContent += `<path id="t${num}-root" class="tooth-part" d="M 25 50 C 15 20, 20 0, 35 0 C 45 20, 40 40, 50 50 C 60 40, 55 20, 65 0 C 80 0, 85 20, 75 50 Z" onclick="openToothPartModal(${num}, 'root')" />`;
    } else {
        svgContent += `<path id="t${num}-root" class="tooth-part" d="M 30 50 C 30 20, 40 0, 50 0 C 60 0, 70 20, 70 50 Z" onclick="openToothPartModal(${num}, 'root')" />`;
    }

    const crownY = 52; 
    svgContent += `<path id="t${num}-top" class="tooth-part" d="M 20 ${crownY} L 80 ${crownY} L 65 ${crownY+12} L 35 ${crownY+12} Z" onclick="openToothPartModal(${num}, 'top')" />`;
    svgContent += `<path id="t${num}-bottom" class="tooth-part" d="M 35 ${crownY+36} L 65 ${crownY+36} L 80 ${crownY+48} L 20 ${crownY+48} Z" onclick="openToothPartModal(${num}, 'bottom')" />`;
    svgContent += `<path id="t${num}-left" class="tooth-part" d="M 20 ${crownY} L 35 ${crownY+12} L 35 ${crownY+36} L 20 ${crownY+48} Z" onclick="openToothPartModal(${num}, 'left')" />`;
    svgContent += `<path id="t${num}-right" class="tooth-part" d="M 80 ${crownY} L 65 ${crownY+12} L 65 ${crownY+36} L 80 ${crownY+48} Z" onclick="openToothPartModal(${num}, 'right')" />`;
    svgContent += `<rect id="t${num}-center" class="tooth-part" x="35" y="${crownY+12}" width="30" height="24" onclick="openToothPartModal(${num}, 'center')" />`;

    svgContent += `<g id="t${num}-extract-mark" display="none">
        <line x1="10" y1="10" x2="90" y2="90" stroke="#ef4444" stroke-width="8" stroke-linecap="round"/>
        <line x1="90" y1="10" x2="10" y2="90" stroke="#ef4444" stroke-width="8" stroke-linecap="round"/>
    </g>`;

    svgContent += `<g id="t${num}-implant-mark" display="none">
        <rect x="40" y="10" width="20" height="80" fill="#94a3b8" rx="5"/>
        <line x1="30" y1="30" x2="70" y2="30" stroke="#cbd5e1" stroke-width="4"/>
        <line x1="30" y1="50" x2="70" y2="50" stroke="#cbd5e1" stroke-width="4"/>
        <line x1="30" y1="70" x2="70" y2="70" stroke="#cbd5e1" stroke-width="4"/>
    </g>`;

    const displayName = getToothDisplayName(num, isChild);

    wrapper.innerHTML = `
        <div class="tooth-num" onclick="openToothPartModal(${num}, 'whole')">${displayName}</div>
        <svg viewBox="0 0 100 110" class="tooth-svg" style="${transformStyle}">
            ${svgContent}
        </svg>
    `;

    return wrapper;
}

// ==========================================
// 3. التفاعل (Modal & Actions)
// ==========================================
function openToothPartModal(toothNum, part) {
    currentSelectedToothId = toothNum;
    currentSelectedPart = part;
    
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const c = dcLang[lang];
    const titleEl = document.getElementById('selected-tooth-title');
    
    let partName = c['t' + part.charAt(0).toUpperCase() + part.slice(1)] || part;
    if(titleEl) titleEl.innerText = `${partName} - (${toothNum})`;
    
    const grid = document.getElementById('tooth-actions-grid');
    if(!grid) return;

    if (part === 'whole') {
        grid.innerHTML = `
            <button class="btn-primary" style="background: #ef4444; padding: 12px;" onclick="saveToothStatusInChart('extracted', '${c.stExtract}')">${c.stExtract}</button>
            <button class="btn-primary" style="background: #64748b; padding: 12px;" onclick="saveToothStatusInChart('implant', '${c.stImplant}')">${c.stImplant}</button>
            <button class="btn-primary" style="background: #8b5cf6; padding: 12px;" onclick="saveToothStatusInChart('crown', '${c.stCrown}')">${c.stCrown}</button>
            <button class="btn-primary" style="background: #cbd5e1; color: #0f172a; padding: 12px; grid-column: span 2;" onclick="saveToothStatusInChart('normal', '${c.stClear}')">${c.stClear}</button>
        `;
    } else if (part === 'root') {
        grid.innerHTML = `
            <button class="btn-primary" style="background: #ec4899; padding: 12px;" onclick="saveToothStatusInChart('endo', '${c.stEndo}')">${c.stEndo}</button>
            <button class="btn-primary" style="background: #cbd5e1; color: #0f172a; padding: 12px;" onclick="saveToothStatusInChart('normal', '${c.stClear}')">${c.stClear}</button>
        `;
    } else {
        grid.innerHTML = `
            <button class="btn-primary" style="background: #eab308; padding: 12px;" onclick="saveToothStatusInChart('decay', '${c.stDecay}')">${c.stDecay}</button>
            <button class="btn-primary" style="background: #3b82f6; padding: 12px;" onclick="saveToothStatusInChart('filled', '${c.stFill}')">${c.stFill}</button>
            <button class="btn-primary" style="background: #cbd5e1; color: #0f172a; padding: 12px; grid-column: span 2;" onclick="saveToothStatusInChart('normal', '${c.stClear}')">${c.stClear}</button>
        `;
    }

    if(typeof closeModal === 'function') {
        document.getElementById('toothStatusModal').style.display = 'flex';
    }
}

// ==========================================
// 4. الحفظ في الـ DB ودمج الـ ERP (المبيعات)
// ==========================================
async function saveToothStatusInChart(status, actionName) {
    if (!currentSelectedToothId || !currentSelectedPart || !currentPatientId) return;
    
    if(typeof closeModal === 'function') closeModal('toothStatusModal');
    
    updateSingleToothVisual(currentSelectedToothId, currentSelectedPart, status);

    const dbKey = `dentalChart.${currentSelectedToothId}_${currentSelectedPart}`;

    try {
        // 🔴 1. حفظ دائم في بروفايل المريض (Permanent Record) 🔴
        if (currentSelectedPart === 'whole' && status !== 'normal') {
            const updates = {};
            ['root', 'top', 'bottom', 'left', 'right', 'center'].forEach(p => {
                updates[`dentalChart.${currentSelectedToothId}_${p}`] = firebase.firestore.FieldValue.delete();
            });
            updates[`dentalChart.${currentSelectedToothId}_whole`] = status;
            
            await db.collection("Patients").doc(currentPatientId).update(updates);
            if (typeof sessionId !== 'undefined' && sessionId) await db.collection("Sessions").doc(sessionId).update(updates);
            
        } else {
            const updateObj = { [dbKey]: status === 'normal' ? firebase.firestore.FieldValue.delete() : status };
            await db.collection("Patients").doc(currentPatientId).update(updateObj);
            if (typeof sessionId !== 'undefined' && sessionId) await db.collection("Sessions").doc(sessionId).update(updateObj);
        }

        // 🔴 2. دمج הـ ERP (اقتراح الفوترة) 🔴
        if (status !== 'normal' && typeof sessionId !== 'undefined' && sessionId) {
            promptERPIntegration(currentSelectedToothId, actionName);
        }

    } catch(e) {
        console.error("Save Chart Error:", e);
    }
}

// سؤال الدكتور لو حابب يضيف الإجراء للفاتورة
function promptERPIntegration(toothNum, actionName) {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    const c = dcLang[lang];
    const msg = c.billPrompt.replace('{action}', `${actionName} (${toothNum})`);
    
    if (confirm(msg)) {
        // بننادي على دالة من ملف session.js عشان ترمي الإجراء في الفاتورة أوتوماتيك
        if (typeof addServiceToInvoiceFromChart === 'function') {
            addServiceToInvoiceFromChart(`علاج سِنة ${toothNum} - ${actionName}`);
        } else {
            // لو الدالة مش موجودة لسه، ننبه المبرمج يضيفها
            console.warn("Function addServiceToInvoiceFromChart is missing in session.js");
        }
    }
}

// ==========================================
// 5. التلوين وسحب البيانات
// ==========================================
function updateSingleToothVisual(toothNum, part, status) {
    const wrapper = document.getElementById(`tooth-wrap-${toothNum}`);
    const partEl = document.getElementById(`t${toothNum}-${part}`);
    const extractMark = document.getElementById(`t${toothNum}-extract-mark`);
    const implantMark = document.getElementById(`t${toothNum}-implant-mark`);

    if (!wrapper) return;

    if (part === 'whole') {
        wrapper.classList.remove('tooth-extracted', 'tooth-implant');
        extractMark.setAttribute('display', 'none');
        implantMark.setAttribute('display', 'none');

        ['root', 'top', 'bottom', 'left', 'right', 'center'].forEach(p => {
            const el = document.getElementById(`t${toothNum}-${p}`);
            if(el) el.setAttribute('class', 'tooth-part');
        });

        if (status === 'extracted') {
            wrapper.classList.add('tooth-extracted');
            extractMark.setAttribute('display', 'block');
        } else if (status === 'implant') {
            wrapper.classList.add('tooth-implant');
            implantMark.setAttribute('display', 'block');
        } else if (status === 'crown') {
            ['top', 'bottom', 'left', 'right', 'center'].forEach(p => {
                const el = document.getElementById(`t${toothNum}-${p}`);
                if(el) el.classList.add('status-crown');
            });
        }
        return;
    }

    if (partEl) {
        partEl.setAttribute('class', 'tooth-part'); 
        if (status !== 'normal') partEl.classList.add(`status-${status}`);
    }
}

function updateChartWithData(chartDataObj) {
    if (!chartDataObj) return;
    
    document.querySelectorAll('.tooth-part').forEach(el => el.setAttribute('class', 'tooth-part'));
    document.querySelectorAll('.tooth-wrapper').forEach(el => el.classList.remove('tooth-extracted', 'tooth-implant'));
    document.querySelectorAll('[id$="-extract-mark"]').forEach(el => el.setAttribute('display', 'none'));
    document.querySelectorAll('[id$="-implant-mark"]').forEach(el => el.setAttribute('display', 'none'));

    for (const [key, status] of Object.entries(chartDataObj)) {
        const parts = key.split('_');
        if (parts.length === 2) {
            updateSingleToothVisual(parts[0], parts[1], status);
        }
    }
}

async function fetchPatientDentalHistory() {
    if (!currentPatientId) return;
    try {
        const doc = await db.collection("Patients").doc(currentPatientId).get();
        if (doc.exists) {
            const data = doc.data();
            if (data.dentalChart) updateChartWithData(data.dentalChart);
        }
    } catch(e) { console.error("Error fetching dental chart:", e); }
}
