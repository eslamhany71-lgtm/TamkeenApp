// js/dental-chart.js - NivaDent Advanced 5-Surfaces Dental Chart

// الترقيم العالمي (FDI)
const upperTeethArr = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const lowerTeethArr = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

let currentSelectedToothId = null;
let currentSelectedPart = null; // 'root', 'center', 'top', 'bottom', 'left', 'right', أو 'whole'

function buildAdvancedDentalChart() {
    const wrapper = document.getElementById('dental-chart-wrapper');
    if (!wrapper) return;

    wrapper.innerHTML = `
        <div class="dental-chart-container">
            <div style="width: 100%;">
                <div class="jaw-title">الفك العلوي (Maxillary)</div>
                <div class="jaw-row" id="upper-jaw-container"></div>
            </div>
            <div style="width: 100%;">
                <div class="jaw-title">الفك السفلي (Mandibular)</div>
                <div class="jaw-row" id="lower-jaw-container"></div>
            </div>
        </div>
    `;

    const upperContainer = document.getElementById('upper-jaw-container');
    const lowerContainer = document.getElementById('lower-jaw-container');

    upperTeethArr.forEach(num => upperContainer.appendChild(createComplexToothSVG(num, 'upper')));
    lowerTeethArr.forEach(num => lowerContainer.appendChild(createComplexToothSVG(num, 'lower')));

    // لو في داتا جاية من الجلسة القديمة
    if (typeof sessionData !== 'undefined' && sessionData && sessionData.dentalChart) {
        updateChartWithData(sessionData.dentalChart);
    }
}

// ==========================================
// مصنع إحداثيات الـ SVG (السر كله هنا)
// ==========================================
function createComplexToothSVG(num, jawType) {
    const wrapper = document.createElement('div');
    wrapper.className = `tooth-wrapper`;
    wrapper.id = `tooth-wrap-${num}`;

    // تحديد هل دي سِنة أمامية (قاطع/ناب) ولا ضرس (خلفي)
    const isMolar = [18,17,16,15,14, 24,25,26,27,28, 48,47,46,45,44, 34,35,36,37,38].includes(num);
    const isLower = jawType === 'lower';
    
    // الفك السفلي بنلفه عشان الجدور تبص لتحت
    const transformStyle = isLower ? `transform: rotate(180deg);` : ``;

    let svgContent = '';

    // 1. رسم الجذر (Root)
    if (isMolar) {
        // ضرس (بجذرين أو تلاتة)
        svgContent += `<path id="t${num}-root" class="tooth-part" d="M 25 50 C 15 20, 20 0, 35 0 C 45 20, 40 40, 50 50 C 60 40, 55 20, 65 0 C 80 0, 85 20, 75 50 Z" onclick="openToothPartModal(${num}, 'root')" />`;
    } else {
        // سِنة أمامية (بجذر واحد)
        svgContent += `<path id="t${num}-root" class="tooth-part" d="M 30 50 C 30 20, 40 0, 50 0 C 60 0, 70 20, 70 50 Z" onclick="openToothPartModal(${num}, 'root')" />`;
    }

    // 2. رسم التاج (Crown) متقسم لـ 5 أسطح
    // المربع الخارجي للتاج
    const crownY = 52; // بداية التاج من تحت الجذر
    
    // السطح العلوي (Top/Buccal)
    svgContent += `<path id="t${num}-top" class="tooth-part" d="M 20 ${crownY} L 80 ${crownY} L 65 ${crownY+12} L 35 ${crownY+12} Z" onclick="openToothPartModal(${num}, 'top')" />`;
    
    // السطح السفلي (Bottom/Lingual)
    svgContent += `<path id="t${num}-bottom" class="tooth-part" d="M 35 ${crownY+36} L 65 ${crownY+36} L 80 ${crownY+48} L 20 ${crownY+48} Z" onclick="openToothPartModal(${num}, 'bottom')" />`;
    
    // السطح الأيسر (Left/Mesial-Distal)
    svgContent += `<path id="t${num}-left" class="tooth-part" d="M 20 ${crownY} L 35 ${crownY+12} L 35 ${crownY+36} L 20 ${crownY+48} Z" onclick="openToothPartModal(${num}, 'left')" />`;
    
    // السطح الأيمن (Right/Distal-Mesial)
    svgContent += `<path id="t${num}-right" class="tooth-part" d="M 80 ${crownY} L 65 ${crownY+12} L 65 ${crownY+36} L 80 ${crownY+48} Z" onclick="openToothPartModal(${num}, 'right')" />`;
    
    // السطح الأوسط (Center/Occlusal-Incisal)
    svgContent += `<rect id="t${num}-center" class="tooth-part" x="35" y="${crownY+12}" width="30" height="24" onclick="openToothPartModal(${num}, 'center')" />`;

    // 3. علامات الخلع والزراعة (مخفية افتراضياً، هتظهر بالـ JS لما ندي السِنة كلاس معين)
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


    wrapper.innerHTML = `
        <div class="tooth-num" onclick="openToothPartModal(${num}, 'whole')">${num}</div>
        <svg viewBox="0 0 100 110" class="tooth-svg" style="${transformStyle}">
            ${svgContent}
        </svg>
    `;

    return wrapper;
}

// ==========================================
// التفاعل (المودال)
// ==========================================
function openToothPartModal(toothNum, part) {
    currentSelectedToothId = toothNum;
    currentSelectedPart = part;
    
    const isAr = (localStorage.getItem('preferredLang') || 'ar') === 'ar';
    const titleEl = document.getElementById('selected-tooth-title');
    
    // ترجمة الجزء اللي داس عليه عشان الدكتور يبقى فاهم
    let partNameAr = "";
    if (part === 'root') partNameAr = "الجذر (Root)";
    else if (part === 'center') partNameAr = "المنتصف (Occlusal)";
    else if (part === 'top') partNameAr = "العلوي (Buccal)";
    else if (part === 'bottom') partNameAr = "السفلي (Lingual)";
    else if (part === 'left' || part === 'right') partNameAr = "الجانبي (Mesial/Distal)";
    else if (part === 'whole') partNameAr = "السِنة بالكامل";

    if(titleEl) titleEl.innerText = isAr ? `إجراءات ${partNameAr} للسِنة (${toothNum})` : `Tooth (${toothNum}) - ${part}`;
    
    const grid = document.getElementById('tooth-actions-grid');
    if(!grid) return;

    // بنعرض زراير مختلفة حسب هو داس على إيه (التاج ولا الجدر ولا السِنة كلها)
    if (part === 'whole') {
        grid.innerHTML = `
            <button class="btn-primary" style="background: #ef4444; padding: 12px;" onclick="saveToothStatusInChart('extracted')">🔴 خلع (Extract)</button>
            <button class="btn-primary" style="background: #64748b; padding: 12px;" onclick="saveToothStatusInChart('implant')">🔩 زراعة (Implant)</button>
            <button class="btn-primary" style="background: #8b5cf6; padding: 12px;" onclick="saveToothStatusInChart('crown')">👑 طربوش (Crown)</button>
            <button class="btn-primary" style="background: #cbd5e1; color: #0f172a; padding: 12px; grid-column: span 2;" onclick="saveToothStatusInChart('normal')">⚪ مسح الحالة (Clear All)</button>
        `;
    } else if (part === 'root') {
        grid.innerHTML = `
            <button class="btn-primary" style="background: #ec4899; padding: 12px;" onclick="saveToothStatusInChart('endo')">💖 حشو عصب (Endo)</button>
            <button class="btn-primary" style="background: #cbd5e1; color: #0f172a; padding: 12px;" onclick="saveToothStatusInChart('normal')">⚪ سليم (Clear)</button>
        `;
    } else {
        // أسطح التاج
        grid.innerHTML = `
            <button class="btn-primary" style="background: #eab308; padding: 12px;" onclick="saveToothStatusInChart('decay')">🟡 تسوس (Decay)</button>
            <button class="btn-primary" style="background: #3b82f6; padding: 12px;" onclick="saveToothStatusInChart('filled')">🔵 حشو (Fill)</button>
            <button class="btn-primary" style="background: #cbd5e1; color: #0f172a; padding: 12px; grid-column: span 2;" onclick="saveToothStatusInChart('normal')">⚪ سليم (Clear)</button>
        `;
    }

    if(typeof closeModal === 'function') {
        document.getElementById('toothStatusModal').style.display = 'flex';
    }
}

// ==========================================
// الحفظ في الفايربيز وتلوين الخريطة
// ==========================================
async function saveToothStatusInChart(status) {
    if (!currentSelectedToothId || !currentSelectedPart) return;
    const isAr = (localStorage.getItem('preferredLang') || 'ar') === 'ar';
    
    if(typeof closeModal === 'function') closeModal('toothStatusModal');
    
    updateSingleToothVisual(currentSelectedToothId, currentSelectedPart, status);

    // مفتاح الحفظ في الفايربيز (عشان نحفظ حالة كل سطح لوحده)
    // مثال: dentalChart.16_center = 'decay'
    const dbKey = `dentalChart.${currentSelectedToothId}_${currentSelectedPart}`;

    if (typeof sessionId !== 'undefined' && sessionId) {
        if (window.showLoader) window.showLoader(isAr ? "جاري حفظ الحالة..." : "Saving status...");
        try {
            // لو السِنة كلها اتخلعت، نمسح حالات الأسطح بتاعتها الأول عشان النضافة
            if (currentSelectedPart === 'whole' && status !== 'normal') {
                const updates = {};
                ['root', 'top', 'bottom', 'left', 'right', 'center'].forEach(p => {
                    updates[`dentalChart.${currentSelectedToothId}_${p}`] = firebase.firestore.FieldValue.delete();
                });
                updates[`dentalChart.${currentSelectedToothId}_whole`] = status;
                await db.collection("Sessions").doc(sessionId).update(updates);
            } else {
                await db.collection("Sessions").doc(sessionId).update({
                    [dbKey]: status === 'normal' ? firebase.firestore.FieldValue.delete() : status
                });
            }
        } catch(e) {
            console.error(e);
        } finally {
            if (window.hideLoader) window.hideLoader();
        }
    }
}

function updateSingleToothVisual(toothNum, part, status) {
    const wrapper = document.getElementById(`tooth-wrap-${toothNum}`);
    const partEl = document.getElementById(`t${toothNum}-${part}`);
    const extractMark = document.getElementById(`t${toothNum}-extract-mark`);
    const implantMark = document.getElementById(`t${toothNum}-implant-mark`);

    if (!wrapper) return;

    // لو الشغل على السِنة بالكامل (خلع/زراعة/طربوش)
    if (part === 'whole') {
        // تنظيف الكلاسات القديمة
        wrapper.classList.remove('tooth-extracted', 'tooth-implant');
        extractMark.setAttribute('display', 'none');
        implantMark.setAttribute('display', 'none');

        // 🔴 التعديل الجراحي: استخدام setAttribute للمسح عشان يشتغل مع الـ SVG
        ['root', 'top', 'bottom', 'left', 'right', 'center'].forEach(p => {
            const el = document.getElementById(`t${toothNum}-${p}`);
            if(el) el.setAttribute('class', 'tooth-part'); // يرجع سليم 100%
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

    // لو الشغل على سطح معين (Center, Top, Root...)
    if (partEl) {
        // 🔴 التعديل الجراحي: استخدام setAttribute للمسح عشان يشتغل مع الـ SVG
        partEl.setAttribute('class', 'tooth-part'); // مسح القديم بقوة
        
        if (status !== 'normal') {
            partEl.classList.add(`status-${status}`);
        }
    }
}

// تلوين الخريطة كلها من داتا الفايربيز
function updateChartWithData(chartDataObj) {
    if (!chartDataObj) return;
    
    // 🔴 التعديل الجراحي: تصفير الخريطة بالكامل باستخدام setAttribute للـ SVG
    document.querySelectorAll('.tooth-part').forEach(el => el.setAttribute('class', 'tooth-part'));
    document.querySelectorAll('.tooth-wrapper').forEach(el => el.classList.remove('tooth-extracted', 'tooth-implant'));
    document.querySelectorAll('[id$="-extract-mark"]').forEach(el => el.setAttribute('display', 'none'));
    document.querySelectorAll('[id$="-implant-mark"]').forEach(el => el.setAttribute('display', 'none'));

    for (const [key, status] of Object.entries(chartDataObj)) {
        // Key بيكون مثلا: "16_center" أو "21_whole"
        const parts = key.split('_');
        if (parts.length === 2) {
            const toothNum = parts[0];
            const partName = parts[1];
            updateSingleToothVisual(toothNum, partName, status);
        }
    }
}
