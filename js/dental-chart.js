// js/dental-chart.js - NivaDent Advanced Interactive Dental Chart

// الترقيم العالمي للأسنان (FDI Notation)
const upperTeethArr = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const lowerTeethArr = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

let currentSelectedToothId = null;

// 1. الدالة الأساسية اللي بتبني الخريطة وبترسم الـ SVGs
function buildAdvancedDentalChart() {
    const wrapper = document.getElementById('dental-chart-wrapper');
    if (!wrapper) return;

    wrapper.innerHTML = `
        <div class="dental-chart-container">
            <div style="width: 100%;">
                <div class="jaw-title">الفك العلوي (Upper Jaw)</div>
                <div class="jaw-row" id="upper-jaw-container"></div>
            </div>
            <div style="width: 100%;">
                <div class="jaw-title">الفك السفلي (Lower Jaw)</div>
                <div class="jaw-row" id="lower-jaw-container"></div>
            </div>
        </div>
    `;

    const upperContainer = document.getElementById('upper-jaw-container');
    const lowerContainer = document.getElementById('lower-jaw-container');

    // رسم الفك العلوي
    upperTeethArr.forEach(num => {
        upperContainer.appendChild(createToothSVGElement(num, 'upper'));
    });

    // رسم الفك السفلي (هنعكس الـ SVG عشان الجدور تبقى لتحت)
    lowerTeethArr.forEach(num => {
        lowerContainer.appendChild(createToothSVGElement(num, 'lower'));
    });

    // لو في داتا جاية من الجلسة القديمة، نلونها فوراً
    if (typeof sessionData !== 'undefined' && sessionData && sessionData.dentalChart) {
        updateChartWithData(sessionData.dentalChart);
    }
}

// 2. مصنع رسم السِنة (SVG Factory)
function createToothSVGElement(num, jawType) {
    const wrapper = document.createElement('div');
    wrapper.className = `tooth-wrapper status-normal`;
    wrapper.id = `tooth-wrap-${num}`;
    wrapper.onclick = () => openToothInteractiveModal(num);

    const isLower = jawType === 'lower';
    // لفة بسيطة للفك السفلي عشان الجدور تبص لتحت
    const transformStyle = isLower ? `transform: rotate(180deg);` : ``;

    wrapper.innerHTML = `
        <div class="tooth-num">${num}</div>
        <svg viewBox="0 0 100 100" class="tooth-svg" style="${transformStyle}">
            <path class="tooth-shape" d="M 20 30 C 20 5, 80 5, 80 30 C 80 50, 70 60, 65 80 C 60 100, 55 100, 55 80 C 55 70, 45 70, 45 80 C 45 100, 40 100, 35 80 C 30 60, 20 50, 20 30 Z" />
            
            <circle class="tooth-filling" cx="50" cy="30" r="12" fill="#3b82f6" display="none" />
            
            <circle class="tooth-decay-spot" cx="40" cy="25" r="8" fill="#ca8a04" display="none" />
            <circle class="tooth-decay-spot" cx="60" cy="35" r="6" fill="#854d0e" display="none" />

            <path class="tooth-implant-screw" d="M 40 50 L 60 50 L 55 90 L 45 90 Z" fill="#94a3b8" display="none" />
            <rect class="tooth-implant-screw" x="35" y="45" width="30" height="8" fill="#64748b" display="none" rx="2"/>

            <path class="tooth-cross" d="M 15 15 L 85 85 M 85 15 L 15 85" stroke="#ef4444" stroke-width="10" stroke-linecap="round" display="none" />
        </svg>
    `;

    return wrapper;
}

// 3. فتح المودال لعرض الإجراءات المتاحة للسِنة دي
function openToothInteractiveModal(toothNum) {
    currentSelectedToothId = toothNum;
    const isAr = (localStorage.getItem('preferredLang') || 'ar') === 'ar';
    
    const titleEl = document.getElementById('selected-tooth-title');
    if(titleEl) titleEl.innerText = isAr ? `إجراءات السِنة رقم (${toothNum})` : `Tooth (${toothNum}) Actions`;
    
    const grid = document.getElementById('tooth-actions-grid');
    if(!grid) return;

    // زراير الحالات الشيك
    grid.innerHTML = `
        <button class="btn-primary" style="background: #eab308; justify-content: center; padding: 12px; font-size: 15px;" onclick="saveToothStatusInChart('decay')">🟡 تسوس (Decay)</button>
        <button class="btn-primary" style="background: #3b82f6; justify-content: center; padding: 12px; font-size: 15px;" onclick="saveToothStatusInChart('filled')">🔵 حشو (Filled)</button>
        <button class="btn-primary" style="background: #6366f1; justify-content: center; padding: 12px; font-size: 15px;" onclick="saveToothStatusInChart('crown')">👑 طربوش (Crown)</button>
        <button class="btn-primary" style="background: #475569; justify-content: center; padding: 12px; font-size: 15px;" onclick="saveToothStatusInChart('implant')">🔩 زراعة (Implant)</button>
        <button class="btn-primary" style="background: #ef4444; justify-content: center; padding: 12px; font-size: 15px;" onclick="saveToothStatusInChart('extracted')">🔴 خلع (Extracted)</button>
        <button class="btn-primary" style="background: #cbd5e1; color: #0f172a; justify-content: center; padding: 12px; font-size: 15px;" onclick="saveToothStatusInChart('normal')">⚪ سليم (Normal)</button>
    `;

    // دالة closeModal موجودة في session-details.js
    if(typeof closeModal === 'function') {
        document.getElementById('toothStatusModal').style.display = 'flex';
    }
}

// 4. حفظ الحالة في الفايربيز وتحديث الرسمة
async function saveToothStatusInChart(status) {
    if (!currentSelectedToothId) return;
    const isAr = (localStorage.getItem('preferredLang') || 'ar') === 'ar';
    
    // إغلاق المودال وتحديث الرؤية فوراً (عشان اليوزر ميحسش بتأخير)
    if(typeof closeModal === 'function') closeModal('toothStatusModal');
    updateSingleToothVisual(currentSelectedToothId, status);

    // لو الـ sessionId موجود (من session-details.js)، نحفظ في الداتا بيز
    if (typeof sessionId !== 'undefined' && sessionId) {
        if (window.showLoader) window.showLoader(isAr ? "جاري حفظ الحالة..." : "Saving status...");
        try {
            await db.collection("Sessions").doc(sessionId).update({
                [`dentalChart.${currentSelectedToothId}`]: status
            });
        } catch(e) {
            console.error(e);
            alert(isAr ? "حدث خطأ أثناء حفظ حالة السِنة." : "Error saving tooth status.");
        } finally {
            if (window.hideLoader) window.hideLoader();
        }
    }
}

// 5. تحديث لون سِنة واحدة
function updateSingleToothVisual(toothNum, status) {
    const toothWrapper = document.getElementById(`tooth-wrap-${toothNum}`);
    if (toothWrapper) {
        toothWrapper.className = `tooth-wrapper status-${status}`;
    }
}

// 6. تحديث الخريطة كلها (بتقرأ من الداتا بيز)
function updateChartWithData(chartDataObj) {
    if (!chartDataObj) return;
    
    // تصفير كل الأسنان للوضع الطبيعي الأول
    const allTeeth = document.querySelectorAll('.tooth-wrapper');
    allTeeth.forEach(el => el.className = 'tooth-wrapper status-normal');

    // تلوين الأسنان اللي ليها حالات محفوظة
    for (const [toothNum, status] of Object.entries(chartDataObj)) {
        updateSingleToothVisual(toothNum, status);
    }
}
