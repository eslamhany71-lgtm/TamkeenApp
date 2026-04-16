const db = firebase.firestore();
let currentClinicId = sessionStorage.getItem('clinicId');
let currentEditPatientId = null;
let patientsDataArray = []; 
let filteredPatientsArray = []; 

const PATIENTS_PER_PAGE = 50;
let lastVisibleDoc = null; 
let isSearchMode = false;  

function updatePageContent(lang) {
    const t = {
        ar: {
            title: "إدارة المرضى", sub: "قائمة المرضى المسجلين بالعيادة والتاريخ الطبي",
            search: "بحث بالاسم أو رقم الموبايل...", btnAdd: "إضافة مريض",
            thDate: "التاريخ والوقت", thName: "اسم المريض", thPhone: "رقم الموبايل", thDebt: "المديونية", thAge: "السن", thHistory: "تنبيهات طبية", thNotes: "الملاحظات", thAction: "إجراءات",
            mTitleAdd: "تسجيل مريض جديد", mTitleEdit: "تعديل بيانات المريض", lName: "اسم المريض بالكامل", lPhone: "رقم الموبايل", lAge: "السن", lGender: "النوع",
            optM: "ذكر", optF: "أنثى", lHistory: "التاريخ الطبي والأمراض المزمنة (إن وجد)", 
            lNotes: "ملاحظات إضافية", btnSave: "حفظ البيانات", btnView: "فتح الملف",
            selCount: "تم تحديد", patWord: "مريض", bulkDel: "🗑️ حذف المحدد", confDel: "هل أنت متأكد من حذف المريض؟ لا يمكن التراجع عن هذا الإجراء.", confBulkDel: "هل أنت متأكد من حذف جميع المرضى المحددين؟",
            loadMore: "⬇️ تحميل المزيد...", noMore: "لا يوجد مرضى آخرين", empty: "لا يوجد مرضى مسجلين",
            btnSearch: "بحث دقيق", btnBarcode: "مسح بالكاميرا (سكان)", btnExcel: "استيراد إكسيل"
        },
        en: {
            title: "Patients Management", sub: "List of registered clinic patients and medical history",
            search: "Search by name or phone...", btnAdd: "Add Patient",
            thDate: "Date & Time", thName: "Patient Name", thPhone: "Phone Number", thDebt: "Debt", thAge: "Age", thHistory: "Medical Alerts", thNotes: "Notes", thAction: "Actions",
            mTitleAdd: "Register New Patient", mTitleEdit: "Edit Patient Data", lName: "Full Name", lPhone: "Phone Number", lAge: "Age", lGender: "Gender",
            optM: "Male", optF: "Female", lHistory: "Medical History & Chronic Diseases", 
            lNotes: "Additional Notes", btnSave: "Save Data", btnView: "Open File",
            selCount: "Selected", patWord: "Patient(s)", bulkDel: "🗑️ Delete Selected", confDel: "Are you sure you want to delete this patient?", confBulkDel: "Are you sure you want to delete all selected patients?",
            loadMore: "⬇️ Load More...", noMore: "No more patients", empty: "No registered patients",
            btnSearch: "Deep Search", btnBarcode: "Scan Barcode", btnExcel: "Import Excel"
        }
    };
    const c = t[lang] || t.ar;
    const setTxt = (id, txt) => { if(document.getElementById(id)) document.getElementById(id).innerText = txt; };

    setTxt('txt-title', c.title); setTxt('txt-subtitle', c.sub); setTxt('btn-add-txt', c.btnAdd);
    document.getElementById('searchInput').placeholder = c.search;
    
    setTxt('th-date', c.thDate); setTxt('th-name', c.thName); setTxt('th-phone', c.thPhone); setTxt('th-debt', c.thDebt); 
    setTxt('th-age', c.thAge); setTxt('th-history', c.thHistory); setTxt('th-notes', c.thNotes); setTxt('th-action', c.thAction);
    
    setTxt('lbl-p-name', c.lName); setTxt('lbl-p-phone', c.lPhone); setTxt('lbl-p-age', c.lAge); setTxt('lbl-p-gender', c.lGender);
    setTxt('opt-male', c.optM); setTxt('opt-female', c.optF); setTxt('lbl-p-history', c.lHistory);
    setTxt('lbl-p-notes', c.lNotes); 
    setTxt('btn-bulk-delete', c.bulkDel);
    
    // 🔴 ترجمة أزرار المرضى مع الحفاظ على الأيقونات 🔴
    const btnSearch = document.getElementById('btn-do-search');
    if(btnSearch) btnSearch.innerHTML = `🔍 ${c.btnSearch}`;

    const btnBarcode = document.getElementById('btn-manual-barcode');
    if(btnBarcode) btnBarcode.innerHTML = `📷 ${c.btnBarcode}`;

    const excelSpan = document.querySelector('.btn-excel span:last-child');
    if(excelSpan) excelSpan.innerText = c.btnExcel;
    
    window.langVars = c; 
    updateBulkActionBar(); 
}

function openPatientModal(patientId = null) {
    document.getElementById('addPatientForm').reset();
    currentEditPatientId = patientId;
    
    document.querySelectorAll('.med-history-cb').forEach(cb => cb.checked = false);
    document.getElementById('p_history_notes').value = '';
    
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    document.getElementById('p_date').value = todayStr;

    if (patientId) {
        document.getElementById('modal-title').innerText = window.langVars.mTitleEdit;
        const p = patientsDataArray.find(x => x.id === patientId);
        if(p) {
            document.getElementById('p_name').value = p.name;
            document.getElementById('p_phone').value = p.phone;
            document.getElementById('p_age').value = p.age;
            document.getElementById('p_gender').value = p.gender;
            document.getElementById('p_notes').value = p.notes || '';
            
            if(p.createdAt) {
                const docDate = p.createdAt.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
                document.getElementById('p_date').value = `${docDate.getFullYear()}-${String(docDate.getMonth()+1).padStart(2, '0')}-${String(docDate.getDate()).padStart(2, '0')}`;
            }
            
            let remainingNotes = [];
            if(p.medicalHistory && Array.isArray(p.medicalHistory)) {
                p.medicalHistory.forEach(part => {
                    const cb = document.querySelector(`.med-history-cb[value="${part}"]`);
                    if(cb) cb.checked = true;
                    else remainingNotes.push(part);
                });
            }
            document.getElementById('p_history_notes').value = remainingNotes.join(' ، ');
        }
    } else {
        document.getElementById('modal-title').innerText = window.langVars.mTitleAdd;
    }
    
    document.getElementById('btn-save').innerText = window.langVars.btnSave;
    document.getElementById('patientModal').style.display = 'flex';
}

function closePatientModal() { document.getElementById('patientModal').style.display = 'none'; }

async function savePatient(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save');
    btn.disabled = true; btn.innerText = "...";

    if (!currentClinicId) return;

    if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري حفظ البيانات..." : "Saving data...");

    let historyArr = [];
    document.querySelectorAll('.med-history-cb:checked').forEach(cb => {
        historyArr.push(cb.value);
    });
    const otherHistory = document.getElementById('p_history_notes').value.trim();
    if(otherHistory) {
        historyArr.push(otherHistory);
    }

    const selectedDateStr = document.getElementById('p_date').value;
    const selectedDateObj = new Date(selectedDateStr);
    
    const patientData = {
        clinicId: currentClinicId,
        name: document.getElementById('p_name').value.trim(),
        phone: document.getElementById('p_phone').value.trim(),
        age: document.getElementById('p_age').value,
        gender: document.getElementById('p_gender').value,
        medicalHistory: historyArr,
        notes: document.getElementById('p_notes').value.trim(),
    };

    try {
        if (currentEditPatientId) {
            patientData.createdAt = firebase.firestore.Timestamp.fromDate(selectedDateObj);
            
            await db.collection("Patients").doc(currentEditPatientId).update(patientData);
            const index = patientsDataArray.findIndex(p => p.id === currentEditPatientId);
            if(index !== -1) {
                patientsDataArray[index] = { ...patientsDataArray[index], ...patientData };
            }
        } else {
            patientData.totalDebt = 0; 
            patientData.createdAt = firebase.firestore.Timestamp.fromDate(selectedDateObj);
            
            const docRef = await db.collection("Patients").add(patientData);
            patientsDataArray.unshift({ id: docRef.id, ...patientData });
        }
        closePatientModal();
        filteredPatientsArray = [...patientsDataArray];
        renderPatientsTable(); 
    } catch (error) { 
        console.error(error); 
    } finally { 
        btn.disabled = false; btn.innerText = window.langVars.btnSave; 
        if (window.hideLoader) window.hideLoader();
    }
}

async function deletePatient(patientId) {
    if(confirm(window.langVars.confDel)) {
        if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري الحذف..." : "Deleting...");
        try { 
            await db.collection("Patients").doc(patientId).delete(); 
            patientsDataArray = patientsDataArray.filter(p => p.id !== patientId);
            filteredPatientsArray = [...patientsDataArray];
            renderPatientsTable();
        } 
        catch (error) { console.error(error); }
        finally {
            if (window.hideLoader) window.hideLoader();
        }
    }
}

async function loadPatients(isLoadMore = false) {
    if (!currentClinicId) return;
    isSearchMode = false;

    const tbody = document.getElementById('patientsBody');
    const loadMoreBtn = document.getElementById('btn-load-more');

    if (!isLoadMore && window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري تحميل بيانات المرضى..." : "Loading patients...");

    if (!isLoadMore) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center;">جاري تحميل البيانات...</td></tr>';
        patientsDataArray = [];
        lastVisibleDoc = null;
    } else {
        loadMoreBtn.innerText = "...";
        loadMoreBtn.disabled = true;
    }

    try {
        let queryRef = db.collection("Patients")
                         .where("clinicId", "==", currentClinicId)
                         .orderBy("createdAt", "desc")
                         .limit(PATIENTS_PER_PAGE);

        if (isLoadMore && lastVisibleDoc) {
            queryRef = queryRef.startAfter(lastVisibleDoc);
        }

        const snap = await queryRef.get();
        
        if (!snap.empty) {
            lastVisibleDoc = snap.docs[snap.docs.length - 1];
            
            snap.forEach(doc => {
                const p = doc.data();
                p.id = doc.id;
                patientsDataArray.push(p);
            });
            
            filteredPatientsArray = [...patientsDataArray];
            renderPatientsTable();
            
            if(snap.docs.length === PATIENTS_PER_PAGE) {
                loadMoreBtn.style.display = 'block';
                loadMoreBtn.innerText = window.langVars.loadMore;
            } else {
                loadMoreBtn.style.display = 'none';
            }
        } else {
            if (!isLoadMore) {
                tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color:#64748b;">${window.langVars.empty}</td></tr>`;
            } else {
                loadMoreBtn.innerText = window.langVars.noMore;
                setTimeout(() => loadMoreBtn.style.display = 'none', 2000);
            }
        }
    } catch (error) {
        console.error("Error loading patients:", error);
    } finally {
        if(isLoadMore) loadMoreBtn.disabled = false;
        if (!isLoadMore && window.hideLoader) window.hideLoader();
    }
}

function loadMorePatients() { loadPatients(true); }

function filterPatientsLocally() {
    const input = document.getElementById('searchInput').value.trim().toLowerCase();
    
    if (!input) {
        filteredPatientsArray = [...patientsDataArray];
    } else {
        filteredPatientsArray = patientsDataArray.filter(p => {
            return (p.name && p.name.toLowerCase().includes(input)) || 
                   (p.phone && p.phone.includes(input));
        });
    }
    renderPatientsTable();
}

async function searchPatients() {
    const input = document.getElementById('searchInput').value.trim().toLowerCase();
    const loadMoreBtn = document.getElementById('btn-load-more');
    const tbody = document.getElementById('patientsBody');

    if (!input) { resetPatientSearch(); return; }

    isSearchMode = true;
    loadMoreBtn.style.display = 'none'; 
    tbody.innerHTML = '<tr><td colspan="9" style="text-align: center;">جاري البحث...</td></tr>';

    if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري البحث في السجلات..." : "Searching...");

    try {
        const snap = await db.collection("Patients").where("clinicId", "==", currentClinicId).get();
        let searchResults = [];

        snap.forEach(doc => {
            const p = doc.data();
            if ((p.name && p.name.toLowerCase().includes(input)) || (p.phone && p.phone.includes(input))) {
                p.id = doc.id;
                searchResults.push(p);
            }
        });

        searchResults.sort((a, b) => {
            let d1 = a.createdAt ? a.createdAt.toDate() : new Date(0);
            let d2 = b.createdAt ? b.createdAt.toDate() : new Date(0);
            return d2 - d1;
        });

        filteredPatientsArray = searchResults;
        renderPatientsTable();

    } catch (error) { 
        console.error("Search Error:", error); 
    } finally {
        if (window.hideLoader) window.hideLoader();
    }
}

function resetPatientSearch() {
    document.getElementById('searchInput').value = '';
    loadPatients(); 
}

function renderPatientsTable() {
    const tbody = document.getElementById('patientsBody');
    tbody.innerHTML = '';
    
    if(filteredPatientsArray.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color:#64748b;">لا توجد نتائج مطابقة</td></tr>`;
        return;
    }

    const isAr = (localStorage.getItem('preferredLang') || 'ar') === 'ar';

    filteredPatientsArray.forEach(p => {
        let dateStr = '---';
        let timeStr = '';
        if (p.createdAt) {
            const dateObj = p.createdAt.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
            dateStr = dateObj.toLocaleDateString(isAr ? 'ar-EG' : 'en-US');
            if (dateObj.getHours() !== 0 || dateObj.getMinutes() !== 0) {
                timeStr = dateObj.toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {hour: '2-digit', minute:'2-digit'});
            }
        }

        let debtAmount = p.totalDebt || 0;
        let debtHtml = debtAmount > 0 
            ? `<span style="color: #ef4444; font-weight: bold; background: #fee2e2; padding: 4px 8px; border-radius: 6px;">${debtAmount} ج.م</span>`
            : `<span style="color: #10b981;">0 ج.م</span>`;

        let historyTags = '';
        if (p.medicalHistory && p.medicalHistory.length > 0) {
            p.medicalHistory.forEach(disease => {
                historyTags += `<span class="tag tag-danger">${disease}</span>`;
            });
        } else {
            historyTags = `<span style="color: #94a3b8; font-size: 13px;">${isAr ? 'سليم' : 'Healthy'}</span>`;
        }

        const tr = document.createElement('tr');
        tr.className = 'clickable-row';
        tr.onclick = function(e) {
            if(e.target.type === 'checkbox' || e.target.tagName === 'BUTTON' || e.target.parentElement.tagName === 'BUTTON') return;
            openMedicalProfile(p.id);
        };

        tr.innerHTML = `
            <td style="text-align: center;">
                <input type="checkbox" class="custom-checkbox row-checkbox" value="${p.id}" onclick="updateBulkActionBar()">
            </td>
            <td>
                <div style="display: flex; flex-direction: column;">
                    <span style="font-weight: 600;">${dateStr}</span>
                    <span style="color: #000; font-size: 16px;">${timeStr}</span>
                </div>
            </td>
            <td style="font-weight: 600; color: #0f172a;">${p.name}</td>
            <td dir="ltr" style="text-align: start;">${p.phone}</td>
            <td style="text-align: center;">${debtHtml}</td>
            <td style="text-align: center;">${p.age}</td>
            <td>${historyTags}</td>
            <td style="color: #64748b; font-size: 14px; max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${p.notes || ''}">${p.notes || '---'}</td>
            <td>
                <div class="action-group" style="justify-content: center;">
                    <button class="btn-action btn-edit" onclick="openPatientModal('${p.id}')" title="تعديل">✏️</button>
                    <button class="btn-action btn-delete" onclick="deletePatient('${p.id}')" title="حذف">🗑️</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    document.getElementById('selectAll').checked = false;
    updateBulkActionBar();
}

function toggleSelectAll(source) {
    const checkboxes = document.querySelectorAll('.row-checkbox');
    checkboxes.forEach(cb => cb.checked = source.checked);
    updateBulkActionBar();
}

function updateBulkActionBar() {
    const checkboxes = document.querySelectorAll('.row-checkbox:checked');
    const bulkBar = document.getElementById('bulk-actions');
    const txtCount = document.getElementById('txt-selected-count');
    
    if (checkboxes.length > 0) {
        txtCount.innerText = `${window.langVars.selCount} ${checkboxes.length} ${window.langVars.patWord}`;
        bulkBar.style.display = 'flex';
    } else {
        bulkBar.style.display = 'none';
    }
    
    const allCheckboxes = document.querySelectorAll('.row-checkbox');
    if(allCheckboxes.length > 0) {
        document.getElementById('selectAll').checked = (checkboxes.length === allCheckboxes.length);
    }
}

async function deleteSelectedPatients() {
    const checkboxes = document.querySelectorAll('.row-checkbox:checked');
    if(checkboxes.length === 0) return;

    if(confirm(window.langVars.confBulkDel)) {
        const btn = document.getElementById('btn-bulk-delete');
        btn.disabled = true; btn.innerText = "...";

        if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري الحذف..." : "Deleting...");
        
        try {
            const batch = db.batch();
            const idsToDelete = [];
            checkboxes.forEach(cb => {
                idsToDelete.push(cb.value);
                const docRef = db.collection("Patients").doc(cb.value);
                batch.delete(docRef);
            });
            await batch.commit();
            
            patientsDataArray = patientsDataArray.filter(p => !idsToDelete.includes(p.id));
            filteredPatientsArray = [...patientsDataArray];
            renderPatientsTable();
        } catch (error) {
            console.error(error);
        } finally {
            btn.disabled = false; btn.innerText = window.langVars.bulkDel;
            if (window.hideLoader) window.hideLoader();
        }
    }
}

// 🔴 التوجيه الداخلي مع كاسر الكاش الإجباري للموبايل 🔴
function openMedicalProfile(patientId) { 
    const isAr = (localStorage.getItem('preferredLang') || 'ar') === 'ar';
    if (window.showLoader) window.showLoader(isAr ? "جاري تجهيز ملف المريض..." : "Opening profile...");
    
    // إضافة Date.now() تجبر الموبايل إنه ميقرأش من الكاش القديم أبداً
    window.location.href = `patient-profile.html?id=${patientId}&v=${Date.now()}`; 
}

// 🔴 دالة سحب وإضافة المرضى من الإكسيل
function importPatientsFromExcel(input) {
    const file = input.files[0];
    if (!file) return;

    if (window.showLoader) window.showLoader(document.body.dir === 'rtl' ? "جاري سحب بيانات المرضى من الإكسيل..." : "Importing patients...");

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const firstSheet = workbook.SheetNames[0];
            const excelRows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);

            if (excelRows.length === 0) { alert("ملف الإكسيل فارغ!"); return; }

            let importedCount = 0;
            let skippedCount = 0;
            const batch = db.batch();
            
            const currentPatientsSet = new Set(patientsDataArray.map(p => String(p.phone).trim() + "_" + String(p.name).trim().toLowerCase()));

            excelRows.forEach(row => {
                const pName = row['الاسم'] || row['اسم المريض'] || row['name'];
                const pPhone = row['الموبايل'] || row['الهاتف'] || row['phone'];
                
                if (pName && pPhone) {
                    const phoneStr = String(pPhone).trim();
                    const nameStr = String(pName).trim().toLowerCase();
                    const uniqueKey = phoneStr + "_" + nameStr;
                    
                    if (currentPatientsSet.has(uniqueKey)) {
                        skippedCount++;
                        return;
                    }

                    const pAge = row['السن'] || row['العمر'] || row['age'] || "";
                    const pDebt = row['المديونية'] || row['debt'] || 0;
                    
                    let historyArr = [];
                    const pHistory = row['التاريخ الطبي'] || row['الأمراض'] || row['history'];
                    if (pHistory) {
                        historyArr = String(pHistory).split(',').map(i => i.trim());
                    }

                    const docRef = db.collection("Patients").doc();
                    batch.set(docRef, {
                        clinicId: currentClinicId,
                        name: String(pName).trim(),
                        phone: phoneStr,
                        age: String(pAge).trim(),
                        gender: "غير محدد",
                        medicalHistory: historyArr,
                        notes: "تم الاستيراد من الإكسيل",
                        totalDebt: Number(pDebt),
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    currentPatientsSet.add(uniqueKey); 
                    importedCount++;
                }
            });

            if (importedCount > 0) {
                await batch.commit();
                alert(`✅ تم استيراد ${importedCount} مريض بنجاح!\n⚠️ تم تجاهل ${skippedCount} مريض لأنهم مسجلين مسبقاً.`);
                loadPatients(); 
            } else {
                alert("لم يتم استيراد أي مريض. تأكد من صحة أسماء الأعمدة (الاسم، الموبايل) أو أنهم مسجلين بالفعل.");
            }

        } catch (error) {
            console.error(error);
            alert("❌ حدث خطأ في قراءة ملف الإكسيل.");
        } finally {
            input.value = ''; 
            if (window.hideLoader) window.hideLoader();
        }
    };
    reader.readAsArrayBuffer(file);
}

window.onload = () => {
    const lang = localStorage.getItem('preferredLang') || 'ar';
    document.body.dir = lang === 'en' ? 'ltr' : 'rtl';
    updatePageContent(lang);
    
    firebase.auth().onAuthStateChanged((user) => {
        if (user) loadPatients();
    });
};

window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
});

// =========================================================
// 🔴 لوجيك ماسح كارت المريض (QR Code Scanner) 🔴
// =========================================================

let html5QrcodeScanner = null;
let isCameraRunning = false; 

window.openCameraScanner = function() {
    const isAr = (localStorage.getItem('preferredLang') || 'ar') === 'ar';
    const modal = document.getElementById('cameraScannerModal');
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert(isAr ? "الكاميرا غير مدعومة في هذا المتصفح." : "Camera not supported in this browser.");
        return;
    }

    modal.style.display = 'flex';

    html5QrcodeScanner = new Html5Qrcode("reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };
    
    const onScanSuccess = (decodedText, decodedResult) => {
        if (isCameraRunning) {
            html5QrcodeScanner.stop().then(() => {
                isCameraRunning = false;
                html5QrcodeScanner.clear();
                closeCameraScanner();
                
                handlePatientQRScan(decodedText.trim());
                
            }).catch(err => console.error("Error stopping scanner", err));
        }
    };

    html5QrcodeScanner.start({ facingMode: "environment" }, config, onScanSuccess, () => {})
    .then(() => {
        isCameraRunning = true; 
    })
    .catch((err) => {
        console.warn("Camera failed to start:", err);
        closeCameraScanner();
        alert(isAr ? "تعذر تشغيل الكاميرا. يرجى إعطاء الصلاحية." : "Could not start camera. Please grant permissions.");
    });
};

window.closeCameraScanner = function() {
    const modal = document.getElementById('cameraScannerModal');
    modal.style.display = 'none';
    
    if (html5QrcodeScanner && isCameraRunning) {
        html5QrcodeScanner.stop().then(() => {
            isCameraRunning = false;
            html5QrcodeScanner.clear();
        }).catch(err => console.log(err));
    }
};

function handlePatientQRScan(scannedCode) {
    const isAr = (localStorage.getItem('preferredLang') || 'ar') === 'ar';
    
    const foundPatient = patientsDataArray.find(item => item.id === scannedCode || item.phone === scannedCode);

    if (foundPatient) {
        if (window.showLoader) window.showLoader(isAr ? "جاري فتح ملف المريض..." : "Opening patient profile...");
        setTimeout(() => {
            openMedicalProfile(foundPatient.id);
        }, 500);
    } else {
        alert(isAr ? `لم يتم العثور على مريض بهذا الكود: (${scannedCode})` : `No patient found with this code: (${scannedCode})`);
    }
}
