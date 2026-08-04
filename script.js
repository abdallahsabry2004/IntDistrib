// ============================================================================
// المتغيرات العامة (Global State)
// ============================================================================
window.globalDistributionPlan = { males: [], females: [] };
window.lastDistributionData = [];
window.publicHolidays = [];
window.electroRegistry = []; 
window.allocRegistry = [];
window.globalDutyCounts = {};

const departmentsList = [
    'قسم العظام', 'قسم الأعصاب', 'قسم الأطفال', 
    'قسم الباطنة', 'قسم الجراحة والحروق', 'قسم صحة المرأة', 
    'قسم (الحكيم)'
];
const arabicMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

// ============================================================================
// واجهة التحميل (Loader Injector)
// ============================================================================
function createLoader() {
    if (!document.getElementById('ai-loader')) {
        const loaderHtml = `<div id="ai-loader" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(255,255,255,0.95); z-index:9999; flex-direction:column; justify-content:center; align-items:center; font-family: 'Cairo', sans-serif; direction: rtl;">
            <div style="border: 8px solid #f3f3f3; border-top: 8px solid #1e3a8a; border-radius: 50%; width: 70px; height: 70px; animation: spin 1.5s linear infinite;"></div>
            <h2 style="color:#1e3a8a; margin-top:25px;">جاري حساب التوزيع الشامل الأمثل للطلاب...</h2>
            <p style="color:#4b5563; font-size:1.1em; font-weight:bold; margin-top:5px; text-align:center;">يُرجى الانتظار، تتم الآن محاكاة 10,000 مسار متكامل (أقسام + كهربائي + Allocator) لاختيار الأفضل.</p>
            <p id="sim-progress" style="color:#b45309; font-size:1.2em; font-weight:bold; margin-top:10px;"></p>
            <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', loaderHtml);
    }
}

// ============================================================================
// مستمعات الأحداث (Event Listeners)
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    buildDepartmentsTable();
    document.getElementById('maleNames')?.addEventListener('input', updateCounts);
    document.getElementById('femaleNames')?.addEventListener('input', updateCounts);
    document.getElementById('mandatoryMonths')?.addEventListener('change', updatePeriodSummary);
    document.getElementById('workMode')?.addEventListener('change', updatePeriodSummary);

    document.getElementById('allocCycle')?.addEventListener('input', updateAllocatorSuggestion);
    document.getElementById('allocMale')?.addEventListener('input', updateAllocatorSuggestion);
    document.getElementById('allocFemale')?.addEventListener('input', updateAllocatorSuggestion);
    document.getElementById('allocWeekend')?.addEventListener('change', updateAllocatorSuggestion);
    document.getElementById('enableAllocator')?.addEventListener('change', function() {
        const settingsBox = document.getElementById('allocatorSettings');
        if (settingsBox) settingsBox.style.display = this.checked ? 'block' : 'none';
        updateAllocatorSuggestion();
    });

    const allocSurplusDiv = document.getElementById('allocDistributeSurplus')?.parentElement?.parentElement;
    if (allocSurplusDiv && !document.getElementById('allocFillDeficitCross')) {
        allocSurplusDiv.insertAdjacentHTML('afterend', `
            <div class="input-group" style="grid-column: 1 / -1; margin-top: 10px;">
                <label style="display:inline-block; font-weight: bold; color: #b45309;">
                    <input type="checkbox" id="allocFillDeficitCross"> 
                    سد العجز في الدورات باستخدام طلاب من الجنس الآخر (إن وُجد فائض)
                </label>
            </div>
        `);
    }
});

// ============================================================================
// دوال واجهة المستخدم والمساعد الذكي (UI & Smart Advisor)
// ============================================================================
function buildDepartmentsTable() {
    const tbody = document.querySelector('#departmentsTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    departmentsList.forEach((dept, index) => {
        let maxInputM = dept === 'قسم (الحكيم)' ? '<span style="color:gray;">مستثنى</span>' : `<input type="number" class="dept-electro-max-m" data-index="${index}" placeholder="لا حد أقصى">`;
        let maxInputF = dept === 'قسم (الحكيم)' ? '<span style="color:gray;">مستثنى</span>' : `<input type="number" class="dept-electro-max-f" data-index="${index}" placeholder="لا حد أقصى">`;
        
        tbody.innerHTML += `
            <tr>
                <td>${dept}</td>
                <td><input type="number" class="dept-male" data-index="${index}" value="0" min="0"></td>
                <td><input type="number" class="dept-female" data-index="${index}" value="0" min="0"></td>
                <td>${maxInputM}</td>
                <td>${maxInputF}</td>
            </tr>
        `;
    });
    document.querySelectorAll('.dept-male, .dept-female').forEach(input => {
        input.addEventListener('input', calculateTotals);
    });
}

function updateCounts() {
    const malesVal = document.getElementById('maleNames')?.value || '';
    const femalesVal = document.getElementById('femaleNames')?.value || '';
    const males = malesVal.split('\n').map(n => n.trim()).filter(n => n !== '');
    const females = femalesVal.split('\n').map(n => n.trim()).filter(n => n !== '');
    
    if (document.getElementById('maleCount')) document.getElementById('maleCount').innerText = males.length;
    if (document.getElementById('femaleCount')) document.getElementById('femaleCount').innerText = females.length;
    updatePeriodSummary(); 
}

function calculateTotals() {
    let totalMale = 0, totalFemale = 0;
    document.querySelectorAll('.dept-male').forEach(i => totalMale += (parseInt(i.value) || 0));
    document.querySelectorAll('.dept-female').forEach(i => totalFemale += (parseInt(i.value) || 0));
    if (document.getElementById('totalMaleInput')) document.getElementById('totalMaleInput').innerText = totalMale;
    if (document.getElementById('totalFemaleInput')) document.getElementById('totalFemaleInput').innerText = totalFemale;
}

function updateAllocatorSuggestion() {
    const enableAlloc = document.getElementById('enableAllocator');
    const suggestionBox = document.getElementById('allocatorSuggestion');
    if (!enableAlloc || !suggestionBox) return;

    if (!enableAlloc.checked) {
        suggestionBox.style.display = 'none';
        return;
    }

    let malesTotal = parseInt(document.getElementById('maleCount')?.innerText) || 0;
    let femalesTotal = parseInt(document.getElementById('femaleCount')?.innerText) || 0;
    let mandatoryMonths = parseInt(document.getElementById('mandatoryMonths')?.value) || 1;
    let numPeriods = 12 / mandatoryMonths;

    let cohortM = Math.floor(malesTotal / numPeriods);
    let cohortF = Math.floor(femalesTotal / numPeriods);

    let allocCycle = parseInt(document.getElementById('allocCycle')?.value) || 1;
    let weekendVal = document.getElementById('allocWeekend')?.value || "5,6";
    let weekendsCount = weekendVal.split(',').length;
    
    let workDaysPerMonth = 30 - (weekendsCount * 4); 
    let estWorkDays = mandatoryMonths * workDaysPerMonth;
    
    let totalCycles = Math.floor(estWorkDays / allocCycle);
    if(totalCycles === 0) totalCycles = 1;

    let suggestedM = Math.floor(cohortM / totalCycles);
    let suggestedF = Math.floor(cohortF / totalCycles);

    let msg = `💡 <strong>المساعد الذكي (Allocator Advisor):</strong><br>`;
    msg += `• المتاح في الفترة الواحدة تقريباً <strong>${cohortM} ذكور</strong> و <strong>${cohortF} إناث</strong>.<br>`;
    msg += `• بناءً على إعداداتك، يوجد حوالي <strong>${estWorkDays} يوم عمل</strong>، مما يعني وجود <strong>${totalCycles} دورة</strong> (تتجدد كل ${allocCycle} أيام).<br><br>`;
    msg += `✅ <strong>النصيحة لتجنب الفائض أو العجز:</strong><br>`;
    msg += `اجعل المطلوب في الدورة الواحدة: <strong style="color:#16a34a; font-size:1.1em;">${suggestedM} ذكور</strong> و <strong style="color:#16a34a; font-size:1.1em;">${suggestedF} إناث</strong>.`;

    suggestionBox.innerHTML = msg;
    suggestionBox.style.display = 'block';
}

function validatePeriodTotals() {
    const malesVal = document.getElementById('maleNames')?.value || '';
    const femalesVal = document.getElementById('femaleNames')?.value || '';
    const totalMales = malesVal.split('\n').map(n => n.trim()).filter(n => n !== '').length;
    const totalFemales = femalesVal.split('\n').map(n => n.trim()).filter(n => n !== '').length;

    let currentM = 0, currentF = 0;
    document.querySelectorAll('.edit-period-m').forEach(inp => currentM += (parseInt(inp.value) || 0));
    document.querySelectorAll('.edit-period-f').forEach(inp => currentF += (parseInt(inp.value) || 0));

    let diffM = currentM - totalMales;
    let diffF = currentF - totalFemales;

    let msgContainer = document.getElementById('periodValidationMsg');
    if (!msgContainer) return;

    let msgHTML = '';
    if (diffM === 0 && diffF === 0) {
        msgHTML = '<span style="color: #16a34a;">✅ الأعداد موزعة على الفترات بشكل مطابق لإجمالي الطلاب.</span>';
    } else {
        msgHTML = '<span style="color: #dc2626;">⚠️ تنبيه: </span>';
        if (diffM > 0) msgHTML += `<span style="color: #dc2626;"> زيادة (${diffM}) ذكور. </span>`;
        if (diffM < 0) msgHTML += `<span style="color: #b45309;"> نقص (${Math.abs(diffM)}) ذكور. </span>`;
        if (diffF > 0) msgHTML += `<span style="color: #dc2626;"> زيادة (${diffF}) إناث. </span>`;
        if (diffF < 0) msgHTML += `<span style="color: #b45309;"> نقص (${Math.abs(diffF)}) إناث. </span>`;
    }
    msgContainer.innerHTML = msgHTML;
}

function updatePeriodSummary() {
    const mandatoryMonthsElem = document.getElementById('mandatoryMonths');
    if (!mandatoryMonthsElem) return;
    const months = parseInt(mandatoryMonthsElem.value);
    const periodsCount = 12 / months;
    const totalMales = parseInt(document.getElementById('maleCount')?.innerText) || 0;
    const totalFemales = parseInt(document.getElementById('femaleCount')?.innerText) || 0;
    const workMode = document.getElementById('workMode')?.value || 'full';
    
    window.globalDistributionPlan = { males: [], females: [] };
    let periodMaleCounts = getRandomDistributedCounts(totalMales, periodsCount);
    let periodFemaleCounts = getRandomDistributedCounts(totalFemales, periodsCount);

    let summaryContainer = document.getElementById('periodSummaryContainer');
    if (summaryContainer) {
        let html = `<strong>معلومة:</strong> سيتم تقسيم الدفعة إلى <strong>${periodsCount} فترات</strong>.<br>`;
        if (workMode !== 'full') {
            html += `<strong style="color:red;">تنبيه نظام 3 أيام:</strong> كل فترة سيتم قسمتها داخلياً إلى مجموعتي عمل (أ، ب).<br>الأعداد المطلوبة في الأقسام سيتم تطبيقها بالكامل على مجموعة (أ) وعلى مجموعة (ب) بشكل منفصل.`;
        }
        summaryContainer.innerHTML = html;
    }

    let tableHtml = `<table class="data-table mini-table">
                        <thead><tr><th>الفترة</th><th>ذكور (بكل فترة)</th><th>إناث (بكل فترة)</th></tr></thead><tbody>`;
    for (let p = 1; p <= periodsCount; p++) {
        let pMales = periodMaleCounts[p - 1];
        let pFemales = periodFemaleCounts[p - 1];
        window.globalDistributionPlan.males.push(pMales);
        window.globalDistributionPlan.females.push(pFemales);
        tableHtml += `<tr>
            <td>الفترة ${p}</td>
            <td><input type="number" class="edit-period-m" data-index="${p-1}" value="${pMales}" min="0" style="width:100%; text-align:center; padding: 4px; border: 1px solid #ccc; border-radius: 4px;"></td>
            <td><input type="number" class="edit-period-f" data-index="${p-1}" value="${pFemales}" min="0" style="width:100%; text-align:center; padding: 4px; border: 1px solid #ccc; border-radius: 4px;"></td>
        </tr>`;
    }
    tableHtml += `</tbody></table>`;
    tableHtml += `<div id="periodValidationMsg" style="margin-top: 10px; font-size: 14px; text-align: center; font-weight: bold; background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0;"></div>`;
    
    let detailedTable = document.getElementById('detailedPeriodTable');
    if (detailedTable) {
        detailedTable.innerHTML = (totalMales > 0 || totalFemales > 0) ? tableHtml : '';
        
        document.querySelectorAll('.edit-period-m').forEach(inp => {
            inp.addEventListener('input', (e) => {
                let idx = parseInt(e.target.getAttribute('data-index'));
                window.globalDistributionPlan.males[idx] = parseInt(e.target.value) || 0;
                validatePeriodTotals();
            });
        });
        document.querySelectorAll('.edit-period-f').forEach(inp => {
            inp.addEventListener('input', (e) => {
                let idx = parseInt(e.target.getAttribute('data-index'));
                window.globalDistributionPlan.females[idx] = parseInt(e.target.value) || 0;
                validatePeriodTotals();
            });
        });
        validatePeriodTotals(); 
    }
}

// ============================================================================
// الخوارزميات المساعدة (Helper Algorithms)
// ============================================================================
function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

function getRandomDistributedCounts(total, bins) {
    if (bins === 0) return [];
    let base = Math.floor(total / bins);
    let remainder = total % bins;
    let counts = Array(bins).fill(base);
    let indices = shuffle(Array.from({ length: bins }, (_, i) => i));
    for (let i = 0; i < remainder; i++) counts[indices[i]]++;
    return counts;
}

function distributeDepartmentSurplus(baseMaleCaps, baseFemaleCaps, targetMales, targetFemales) {
    let finalMaleCaps = [...baseMaleCaps];
    let finalFemaleCaps = [...baseFemaleCaps];
    let currentMaleSum = finalMaleCaps.reduce((a, b) => a + b, 0);
    let currentFemaleSum = finalFemaleCaps.reduce((a, b) => a + b, 0);
    let maleSurplus = targetMales - currentMaleSum;
    let femaleSurplus = targetFemales - currentFemaleSum;
    let eligibleIndices = [0, 1, 2, 3, 4, 5]; 
    
    if (maleSurplus > 0 || femaleSurplus > 0) {
        let safeCounter = 0;
        while ((maleSurplus > 0 || femaleSurplus > 0) && safeCounter < 50) {
            let shuffledIndices = shuffle([...eligibleIndices]);
            while ((maleSurplus > 0 || femaleSurplus > 0) && shuffledIndices.length > 0) {
                let randomDeptIdx = shuffledIndices.shift(); 
                if (maleSurplus > 0) { finalMaleCaps[randomDeptIdx]++; maleSurplus--; } 
                else if (femaleSurplus > 0) { finalFemaleCaps[randomDeptIdx]++; femaleSurplus--; }
            }
            safeCounter++;
        }
    }
    
    while (currentMaleSum > targetMales) {
        let valid = eligibleIndices.filter(idx => finalMaleCaps[idx] > 0);
        if(valid.length === 0) break;
        finalMaleCaps[valid[Math.floor(Math.random() * valid.length)]]--;
        currentMaleSum--;
    }
    while (currentFemaleSum > targetFemales) {
        let valid = eligibleIndices.filter(idx => finalFemaleCaps[idx] > 0);
        if(valid.length === 0) break;
        finalFemaleCaps[valid[Math.floor(Math.random() * valid.length)]]--;
        currentFemaleSum--;
    }
    return { males: finalMaleCaps, females: finalFemaleCaps };
}

function assignStudentsToDepartmentsSmart(students, targetCaps, currentHistory, allowRepetition = false) {
    let assignments = {};
    departmentsList.forEach(d => assignments[d] = []);
    let newHistory = JSON.parse(JSON.stringify(currentHistory || {}));
    let caps = [...targetCaps];
    let shuffledStudents = shuffle([...students]);
    let failed = false;
    let repeatedStudents = []; 

    for (let student of shuffledStudents) {
        if (!newHistory[student]) newHistory[student] = [];
        let validIndices = [];
        let availableIndices = []; 

        caps.forEach((cap, idx) => {
            if (cap > 0) {
                availableIndices.push(idx);
                if (!newHistory[student].includes(departmentsList[idx])) {
                    validIndices.push(idx); 
                }
            }
        });

        if (validIndices.length === 0) { 
            if (!allowRepetition) {
                failed = true; 
                break; 
            } else {
                if (availableIndices.length === 0) {
                    failed = true; break; 
                }
                let chosenIdx = availableIndices[Math.floor(Math.random() * availableIndices.length)];
                let chosenDept = departmentsList[chosenIdx];
                
                caps[chosenIdx]--;
                assignments[chosenDept].push(student);
                newHistory[student].push(chosenDept);
                repeatedStudents.push(student); 
            }
        } else {
            let chosenIdx = validIndices[Math.floor(Math.random() * validIndices.length)];
            let chosenDept = departmentsList[chosenIdx];
            
            caps[chosenIdx]--;
            assignments[chosenDept].push(student);
            newHistory[student].push(chosenDept);
        }
    }
    return { success: !failed, assignments: assignments, history: newHistory, repeatedStudents: repeatedStudents };
}

async function fetchPublicHolidays(year) {
    try {
        let res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/EG`);
        let data = await res.json();
        return data.map(d => ({ date: d.date, name: d.localName || d.name }));
    } catch (e) {
        console.warn("فشل في جلب الإجازات:", e);
        return [];
    }
}

function pickElectroStudentsPriority(pool, requiredCount, usedGlobal, monthAssignments, maxCapsArray, allSchedules, currentMonthIdx, weekDates) {
    if (requiredCount === 0 || !monthAssignments) return [];
    
    let available = pool.filter(s => !usedGlobal.includes(s));
    let validAvailable = available.filter(s => {
        let dept = monthAssignments[s];
        if (!dept || dept === 'قسم (الحكيم)') return false;
        let deptIdx = departmentsList.indexOf(dept);
        if (deptIdx === -1) return false;
        let cap = maxCapsArray[deptIdx];
        if (cap === 0) return false; 
        return true;
    });

    validAvailable.sort((a, b) => {
        let scoreA = allSchedules.some((sched, idx) => idx !== currentMonthIdx && sched && sched.monthAssignments && sched.monthAssignments[a] === 'قسم (الحكيم)') ? 1 : 0;
        let scoreB = allSchedules.some((sched, idx) => idx !== currentMonthIdx && sched && sched.monthAssignments && sched.monthAssignments[b] === 'قسم (الحكيم)') ? 1 : 0;
        
        let dutyA = window.globalDutyCounts[a] || 0;
        let dutyB = window.globalDutyCounts[b] || 0;

        if (scoreB !== scoreA) return scoreB - scoreA;
        if (dutyA !== dutyB) return dutyA - dutyB; 
        return Math.random() - 0.5; 
    });

    let picked = [];
    let deptCounts = {};
    departmentsList.forEach(d => deptCounts[d] = 0);

    let attempts = 0;
    while (picked.length < requiredCount && attempts < 100) {
        attempts++;
        let pickedStudent = null;

        for (let i = 0; i < validAvailable.length; i++) {
            let s = validAvailable[i];
            let d = monthAssignments[s];
            let deptIdx = departmentsList.indexOf(d);
            
            if (maxCapsArray[deptIdx] === -1 || deptCounts[d] < maxCapsArray[deptIdx]) {
                let validDeptsRemaining = new Set(validAvailable.map(st => monthAssignments[st])).size;
                if (requiredCount > 1 && picked.length > 0 && validDeptsRemaining > 1) {
                    let lastDept = monthAssignments[picked[picked.length - 1]];
                    if (d === lastDept) continue; 
                }

                pickedStudent = s;
                validAvailable.splice(i, 1);
                break;
            }
        }

        if (!pickedStudent && validAvailable.length > 0) {
            for (let i = 0; i < validAvailable.length; i++) {
                let s = validAvailable[i];
                let d = monthAssignments[s];
                let deptIdx = departmentsList.indexOf(d);
                if (maxCapsArray[deptIdx] === -1 || deptCounts[d] < maxCapsArray[deptIdx]) {
                    pickedStudent = s;
                    validAvailable.splice(i, 1);
                    break;
                }
            }
        }

        if (pickedStudent) {
            picked.push(pickedStudent);
            deptCounts[monthAssignments[pickedStudent]]++;
        } else {
            break; 
        }
    }

    return picked; 
}

// ============================================================================
// محرك المحاكاة الشامل (Global Pipeline Simulation Engine)
// ============================================================================
async function runFullPipelineSimulation(config) {
    const TOTAL_SIMULATIONS = 10000; // 10,000 محاكاة شاملة ومستقلة تماماً
    let bestSim = null;
    let lowestPenalty = Infinity;
    let pElem = document.getElementById('sim-progress');

    for (let sim = 0; sim < TOTAL_SIMULATIONS; sim++) {
        if (sim % 500 === 0) {
            if(pElem) pElem.innerText = `تم تجربة وتقييم ${(sim).toLocaleString()} مسار شامل...`;
            await new Promise(r => setTimeout(r, 0));
        }

        let currentHistory = {};
        config.groupM.concat(config.groupF).forEach(s => currentHistory[s] = []);
        
        let simSchedules = [];
        let simElectroLog = [];
        let simAllocLog = [];
        
        // سجلات محلية خاصة بكل محاولة لعدم التلويث
        let simElectroRegistry = [];
        let simGlobalDutyCounts = {};
        let simPeriodUsedElectroMales = [];
        let simPeriodUsedElectroFemales = [];
        
        let penalty = 0;
        let simFailed = false;
        let simMessages = [];

        // --- 1. مرحلة الأقسام (Departments) ---
        for (let m = 1; m <= config.mandatoryMonths; m++) {
            let adjustedCaps = distributeDepartmentSurplus(config.baseMaleCaps, config.baseFemaleCaps, config.groupM.length, config.groupF.length);
            
            let maleAssign = assignStudentsToDepartmentsSmart(config.groupM, adjustedCaps.males, currentHistory, false);
            if (!maleAssign.success) maleAssign = assignStudentsToDepartmentsSmart(config.groupM, adjustedCaps.males, currentHistory, true);
            
            let femaleAssign = assignStudentsToDepartmentsSmart(config.groupF, adjustedCaps.females, maleAssign.history, false);
            if (!femaleAssign.success) femaleAssign = assignStudentsToDepartmentsSmart(config.groupF, adjustedCaps.females, maleAssign.history, true);

            if (!maleAssign.success || !femaleAssign.success) {
                simFailed = true; break; 
            }

            currentHistory = femaleAssign.history;
            penalty += (maleAssign.repeatedStudents.length + femaleAssign.repeatedStudents.length) * 10000; // عقوبة ضخمة لتكرار الأقسام
            
            let monthAssignments = {};
            departmentsList.forEach(dept => {
                if (maleAssign.assignments[dept]) maleAssign.assignments[dept].forEach(s => monthAssignments[s] = dept);
                if (femaleAssign.assignments[dept]) femaleAssign.assignments[dept].forEach(s => monthAssignments[s] = dept);
            });

            simSchedules.push({ maleAssign, femaleAssign, monthAssignments });
        }

        if (simFailed) continue;

        // --- 2. مرحلة العلاج الكهربائي (Electrotherapy) ---
        if (config.electroMaleReq > 0 || config.electroFemaleReq > 0) {
            for (let m = 1; m <= config.mandatoryMonths; m++) {
                let monthAssig = simSchedules[m-1] ? simSchedules[m-1].monthAssignments : {};
                let weeksDates = config.electroDates[m-1];

                let monthElectroData = [];

                for (let w = 1; w <= 4; w++) {
                    let currWeekDate = weeksDates[w - 1];
                    let pickedM = pickElectroStudentsPriority(config.groupM, config.electroMaleReq, simPeriodUsedElectroMales, monthAssig, config.electroMaxCapsM, simSchedules, m-1, currWeekDate);
                    let pickedF = pickElectroStudentsPriority(config.groupF, config.electroFemaleReq, simPeriodUsedElectroFemales, monthAssig, config.electroMaxCapsF, simSchedules, m-1, currWeekDate);
                    
                    let missingM = config.electroMaleReq - pickedM.length;
                    let missingF = config.electroFemaleReq - pickedF.length;

                    // في المحاكاة، نستخدم طلاب مكررين لسد العجز فوراً ونحسب عقوبات
                    if (missingM > 0) {
                        let availForRep = simPeriodUsedElectroMales.filter(s => config.groupM.includes(s) && monthAssig[s] && monthAssig[s] !== 'قسم (الحكيم)' && !simElectroRegistry.some(r => r.name === s && r.m === m && r.w === w));
                        let extraM = shuffle(availForRep).slice(0, missingM);
                        pickedM.push(...extraM);
                        penalty += extraM.length * 100; // عقوبة للتكرار
                        missingM -= extraM.length;
                        if (missingM > 0) penalty += missingM * 1000; // عقوبة لعجز مستحيل
                    }

                    if (missingF > 0) {
                        let availForRep = simPeriodUsedElectroFemales.filter(s => config.groupF.includes(s) && monthAssig[s] && monthAssig[s] !== 'قسم (الحكيم)' && !simElectroRegistry.some(r => r.name === s && r.m === m && r.w === w));
                        let extraF = shuffle(availForRep).slice(0, missingF);
                        pickedF.push(...extraF);
                        penalty += extraF.length * 100; 
                        missingF -= extraF.length;
                        if (missingF > 0) penalty += missingF * 1000; 
                    }
                    
                    let weekMList = [], weekFList = [];
                    
                    pickedM.forEach(s => {
                        simGlobalDutyCounts[s] = (simGlobalDutyCounts[s] || 0) + 1;
                        simElectroRegistry.push({name: s, m: m, w: w, startDate: currWeekDate.start, endDate: currWeekDate.end});
                        let isRep = simPeriodUsedElectroMales.includes(s);
                        if (!isRep) simPeriodUsedElectroMales.push(s);
                        weekMList.push({name: s, isRep: isRep});
                    });

                    pickedF.forEach(s => {
                        simGlobalDutyCounts[s] = (simGlobalDutyCounts[s] || 0) + 1;
                        simElectroRegistry.push({name: s, m: m, w: w, startDate: currWeekDate.start, endDate: currWeekDate.end});
                        let isRep = simPeriodUsedElectroFemales.includes(s);
                        if (!isRep) simPeriodUsedElectroFemales.push(s);
                        weekFList.push({name: s, isRep: isRep});
                    });

                    monthElectroData.push({ pickedM: weekMList, pickedF: weekFList, missingM, missingF });
                }
                simElectroLog.push(monthElectroData);
            }
        }

        // --- 3. مرحلة الـ Allocator ---
        if (config.isAllocator && config.allocCyclesRaw) {
            let usedAllocators = [];
            
            for (let i = 0; i < config.allocCyclesRaw.length; i++) {
                let cycle = Object.assign({}, config.allocCyclesRaw[i]);
                if (cycle.isOff) {
                    simAllocLog.push(cycle);
                    continue;
                }

                let monthAssig = simSchedules[cycle.monthIdx] ? simSchedules[cycle.monthIdx].monthAssignments : {};
                
                const hasElectroConflict = (studentName, allocStartStr, allocEndStr) => {
                    let alStart = new Date(allocStartStr);
                    let alEnd = new Date(allocEndStr);
                    return simElectroRegistry.some(record => {
                        if (record.name !== studentName) return false;
                        let elStart = new Date(record.startDate);
                        let elEnd = new Date(record.endDate);
                        return (alStart <= elEnd && alEnd >= elStart);
                    });
                };

                let availM = shuffle(config.groupM.filter(s => !usedAllocators.includes(s) && monthAssig[s] && monthAssig[s] !== 'قسم (الحكيم)' && !hasElectroConflict(s, cycle.startDate, cycle.endDate)));
                let availF = shuffle(config.groupF.filter(s => !usedAllocators.includes(s) && monthAssig[s] && monthAssig[s] !== 'قسم (الحكيم)' && !hasElectroConflict(s, cycle.startDate, cycle.endDate)));
                
                const smartSortAlloc = (a, b) => {
                    let hA = simSchedules.filter((sched, idx) => idx !== cycle.monthIdx && sched && sched.monthAssignments[a] === 'قسم (الحكيم)').length;
                    let hB = simSchedules.filter((sched, idx) => idx !== cycle.monthIdx && sched && sched.monthAssignments[b] === 'قسم (الحكيم)').length;
                    if (hA !== hB) return hB - hA; 
                    let dA = simGlobalDutyCounts[a] || 0;
                    let dB = simGlobalDutyCounts[b] || 0;
                    if (dA !== dB) return dA - dB;
                    return Math.random() - 0.5;
                };
                
                availM.sort(smartSortAlloc);
                availF.sort(smartSortAlloc);

                let pickedM = availM.slice(0, config.allocMaleReq);
                let pickedF = availF.slice(0, config.allocFemaleReq);
                let missingM = config.allocMaleReq - pickedM.length;
                let missingF = config.allocFemaleReq - pickedF.length;
                let crossFilledNames = [];

                if (config.allocFillDeficitCross) {
                    if (missingM > 0 && availF.length > config.allocFemaleReq) {
                        let extraF = availF.slice(config.allocFemaleReq, config.allocFemaleReq + missingM);
                        pickedF.push(...extraF);
                        crossFilledNames.push(...extraF);
                        penalty += extraF.length * 10; // عقوبة خفيفة لسد العجز من الجنس الآخر
                        missingM -= extraF.length;
                    }
                    if (missingF > 0 && availM.length > config.allocMaleReq) {
                        let extraM = availM.slice(config.allocMaleReq, config.allocMaleReq + missingF);
                        pickedM.push(...extraM);
                        crossFilledNames.push(...extraM);
                        penalty += extraM.length * 10; 
                        missingF -= extraM.length;
                    }
                }

                if (missingM > 0 || missingF > 0) {
                    penalty += (missingM + missingF) * 1000; // عقوبة شديدة لعجز غير قابل للحل
                    simMessages.push(`عجز في الـ Allocator بدورة (${cycle.startDate}) غير كافين.`);
                }

                let picked = [...pickedM, ...pickedF];
                picked.forEach(s => {
                    simGlobalDutyCounts[s] = (simGlobalDutyCounts[s] || 0) + 1;
                    usedAllocators.push(s);
                });

                cycle.picked = picked;
                cycle.crossFilled = crossFilledNames;
                cycle.extraCount = 0;
                simAllocLog.push(cycle);
            }

            // توزيع الفائض في الـ Allocator
            let unassignedAlloc = [...config.groupM, ...config.groupF].filter(s => !usedAllocators.includes(s) && simSchedules[0] && simSchedules[0].monthAssignments[s] !== 'قسم (الحكيم)');
            if (config.allocDistributeSurplus && unassignedAlloc.length > 0) {
                let activeCycles = simAllocLog.filter(c => !c.isOff);
                let surplusPool = shuffle([...unassignedAlloc]);
                
                for (let student of surplusPool) {
                    activeCycles.sort((a, b) => (a.extraCount || 0) - (b.extraCount || 0));
                    for (let cycle of activeCycles) {
                        const conflict = simElectroRegistry.some(record => {
                            if(record.name !== student) return false;
                            return (new Date(cycle.startDate) <= new Date(record.endDate) && new Date(cycle.endDate) >= new Date(record.startDate));
                        });
                        
                        if (!conflict) {
                            cycle.picked.push(student);
                            cycle.extraCount = (cycle.extraCount || 0) + 1;
                            unassignedAlloc = unassignedAlloc.filter(s => s !== student);
                            usedAllocators.push(student);
                            simGlobalDutyCounts[student] = (simGlobalDutyCounts[student] || 0) + 1;
                            break;
                        }
                    }
                }
            }
            // ربط الفائض الأخير ليتم عرضه
            simAllocLog.unassigned = unassignedAlloc;
        }

        // --- تقييم المحاولة وحفظها إذا كانت الأفضل ---
        if (penalty < lowestPenalty) {
            lowestPenalty = penalty;
            bestSim = {
                schedules: simSchedules,
                electroLog: simElectroLog,
                allocLog: simAllocLog,
                electroRegistryUpdates: simElectroRegistry,
                dutyUpdates: simGlobalDutyCounts,
                periodUsedElectroMales: simPeriodUsedElectroMales,
                periodUsedElectroFemales: simPeriodUsedElectroFemales,
                messages: simMessages
            };
        }
        
        if (lowestPenalty === 0) break; // وجد المسار المثالي التام
    }

    if(pElem) pElem.innerText = `تم الانتهاء من المعالجة الشاملة!`;
    return { data: bestSim, penalty: lowestPenalty };
}

// ============================================================================
// الخوارزمية الرئيسية المزامنة (Main Generation Async)
// ============================================================================
async function generateDistribution() {
    createLoader();
    let loader = document.getElementById('ai-loader');

    try {
        const malesVal = document.getElementById('maleNames')?.value || '';
        const femalesVal = document.getElementById('femaleNames')?.value || '';
        const males = malesVal.split('\n').map(n => n.trim()).filter(n => n !== '');
        const females = femalesVal.split('\n').map(n => n.trim()).filter(n => n !== '');
        
        if (males.length === 0 && females.length === 0) { 
            alert("أدخل أسماء الطلاب أولاً."); 
            return; 
        }

        if (loader) loader.style.display = 'flex';
        await new Promise(resolve => setTimeout(resolve, 100));

        window.electroRegistry = []; 
        window.allocRegistry = [];
        window.globalDutyCounts = {}; 
        window.lastDistributionData = [];
        let html = '';

        const mandatoryMonths = parseInt(document.getElementById('mandatoryMonths')?.value) || 1;
        const startMonthIdx = parseInt(document.getElementById('startMonth')?.value) || 0;
        const workMode = document.getElementById('workMode')?.value || 'full';
        const is3Days = workMode !== 'full';
        const numPeriods = 12 / mandatoryMonths;

        let baseMaleCaps = Array.from(document.querySelectorAll('.dept-male')).map(inp => parseInt(inp.value) || 0);
        let baseFemaleCaps = Array.from(document.querySelectorAll('.dept-female')).map(inp => parseInt(inp.value) || 0);
        
        let electroMaxCapsM = Array.from(document.querySelectorAll('.dept-electro-max-m')).map(inp => {
            if(inp.value === "") return -1; 
            return parseInt(inp.value);
        });
        if (electroMaxCapsM.length > 6) electroMaxCapsM[6] = 0; 

        let electroMaxCapsF = Array.from(document.querySelectorAll('.dept-electro-max-f')).map(inp => {
            if(inp.value === "") return -1; 
            return parseInt(inp.value);
        });
        if (electroMaxCapsF.length > 6) electroMaxCapsF[6] = 0; 

        let sumMaleCaps = baseMaleCaps.reduce((a, b) => a + b, 0);
        let sumFemaleCaps = baseFemaleCaps.reduce((a, b) => a + b, 0);
        
        let periodsMalesCounts = window.globalDistributionPlan.males.length > 0 ? window.globalDistributionPlan.males : Array(numPeriods).fill(Math.floor(males.length / numPeriods));
        let periodsFemalesCounts = window.globalDistributionPlan.females.length > 0 ? window.globalDistributionPlan.females : Array(numPeriods).fill(Math.floor(females.length / numPeriods));

        let requiredMalesCheck = is3Days ? sumMaleCaps * 2 : sumMaleCaps;
        let requiredFemalesCheck = is3Days ? sumFemaleCaps * 2 : sumFemaleCaps;

        if (requiredMalesCheck > Math.max(...periodsMalesCounts) || requiredFemalesCheck > Math.max(...periodsFemalesCounts)) {
            if (loader) loader.style.display = 'none';
            let msg = `⚠️ [تحليل النظام: عجز في سعة الأقسام]\n\nالأعداد المطلوبة للأقسام تفوق عدد الطلاب المتاحين في بعض الفترات.\n❓ هل تريد إجبار النظام على الإكمال وتقليل الأعداد عشوائياً لسد العجز؟`;
            if (!confirm(msg)) return;
            if (loader) loader.style.display = 'flex';
            await new Promise(r => setTimeout(r, 50));
        }

        let isAllocator = document.getElementById('enableAllocator')?.checked || false;
        if (isAllocator) {
            let year = new Date().getFullYear();
            window.publicHolidays = [...await fetchPublicHolidays(year), ...await fetchPublicHolidays(year + 1)];
        }

        let malePeriods = [], femalePeriods = [];
        let shuffledMales = shuffle([...males]), shuffledFemales = shuffle([...females]);
        let mIdx = 0, fIdx = 0;
        
        for (let i = 0; i < numPeriods; i++) {
            let pMalesCount = periodsMalesCounts[i];
            let pFemalesCount = periodsFemalesCounts[i];
            malePeriods.push(shuffledMales.slice(mIdx, mIdx + pMalesCount));
            femalePeriods.push(shuffledFemales.slice(fIdx, fIdx + pFemalesCount));
            mIdx += pMalesCount; fIdx += pFemalesCount;
        }

        const electroMaleReq = parseInt(document.getElementById('electroMale')?.value) || 0;
        const electroFemaleReq = parseInt(document.getElementById('electroFemale')?.value) || 0;

        let allocMaleReq = parseInt(document.getElementById('allocMale')?.value) || 0;
        let allocFemaleReq = parseInt(document.getElementById('allocFemale')?.value) || 0;
        let allocCycle = parseInt(document.getElementById('allocCycle')?.value) || 1;
        let allocWeekends = (document.getElementById('allocWeekend')?.value || "5,6").split(',').map(Number);
        let allocStartDateVal = document.getElementById('allocStartDate')?.value;
        let allocStart = allocStartDateVal ? new Date(allocStartDateVal) : null;
        let allocDistributeSurplus = document.getElementById('allocDistributeSurplus')?.checked || false;
        let allocFillDeficitCross = document.getElementById('allocFillDeficitCross')?.checked || false;

        let allGlobalMessages = []; // لتجميع التنبيهات

        for (let p = 0; p < numPeriods; p++) {
            let cohortMales = malePeriods[p], cohortFemales = femalePeriods[p];
            window.lastDistributionData.push({ males: cohortMales, females: cohortFemales, mandatoryMonths: mandatoryMonths });
            
            let periodGroups = [{ name: 'الفترة بالكامل', m: cohortMales, f: cohortFemales }];
            if (is3Days) {
                let mMid = Math.floor(cohortMales.length / 2), fMid = Math.floor(cohortFemales.length / 2);
                periodGroups = [
                    { name: workMode === '3cont' ? '(مجموعة أ: سبت-أحد-إثنين)' : '(مجموعة أ: سبت-إثنين-أربعاء)', m: cohortMales.slice(0, mMid), f: cohortFemales.slice(0, fMid) },
                    { name: workMode === '3cont' ? '(مجموعة ب: ثلاثاء-أربعاء-خميس)' : '(مجموعة ب: أحد-ثلاثاء-خميس)', m: cohortMales.slice(mMid), f: cohortFemales.slice(fMid) }
                ];
            }

            let periodStartAbsolute = p * mandatoryMonths;
            let pMonthsText = Array.from({length: mandatoryMonths}, (_, i) => arabicMonths[(startMonthIdx + periodStartAbsolute + i) % 12]).join(' و ');
            
            html += `<div class="result-section" style="page-break-after: always; padding-bottom: 20px;">
                        <h3>الفترة الإجبارية ${p + 1} (${mandatoryMonths} شهر) - ${pMonthsText}</h3>`;

            let monthlySchedules = []; 

            for (let group of periodGroups) {
                // تجهيز بيانات الـ Config للمحاكاة الشاملة
                let electroDatesConfig = [];
                for (let m = 1; m <= mandatoryMonths; m++) {
                    let baseD = allocStart ? new Date(allocStart) : new Date();
                    baseD.setMonth(baseD.getMonth() + (p * mandatoryMonths) + (m - 1));
                    let y = baseD.getFullYear();
                    let mon = baseD.getMonth();
                    electroDatesConfig.push([
                        { start: new Date(y, mon, 1), end: new Date(y, mon, 7) },
                        { start: new Date(y, mon, 8), end: new Date(y, mon, 14) },
                        { start: new Date(y, mon, 15), end: new Date(y, mon, 21) },
                        { start: new Date(y, mon, 22), end: new Date(y, mon + 1, 0) } 
                    ]);
                }

                let allocCyclesRaw = [];
                if (isAllocator && allocStart) {
                    let allocatorCurrentDate = new Date(allocStart);
                    allocatorCurrentDate.setMonth(allocatorCurrentDate.getMonth() + (p * mandatoryMonths));
                    let periodEndDate = new Date(allocatorCurrentDate);
                    periodEndDate.setMonth(periodEndDate.getMonth() + mandatoryMonths);
                    let safety = 0;
                    
                    while (allocatorCurrentDate < periodEndDate && safety < 365) {
                        safety++;
                        let dateString = allocatorCurrentDate.toISOString().split('T')[0];
                        let isWeekend = allocWeekends.includes(allocatorCurrentDate.getDay());
                        let holiday = window.publicHolidays.find(h => h.date === dateString);
                        
                        if (isWeekend || holiday) {
                            allocCyclesRaw.push({ isOff: true, date: dateString, reason: holiday ? 'إجازة رسمية: ' + holiday.name : 'عطلة أسبوعية' });
                            allocatorCurrentDate.setDate(allocatorCurrentDate.getDate() + 1);
                            continue;
                        }

                        let endDate = new Date(allocatorCurrentDate);
                        let addedDays = 1;
                        while(addedDays < allocCycle) {
                            let nextDay = new Date(endDate);
                            nextDay.setDate(nextDay.getDate() + 1);
                            if (nextDay >= periodEndDate) break; 
                            endDate = nextDay;
                            let endIsWknd = allocWeekends.includes(endDate.getDay());
                            let endHol = window.publicHolidays.find(h => h.date === endDate.toISOString().split('T')[0]);
                            if(!endIsWknd && !endHol) addedDays++;
                        }
                        
                        let periodStartDate = new Date(allocStart);
                        periodStartDate.setMonth(periodStartDate.getMonth() + (p * mandatoryMonths));
                        let monthIdx = 0;
                        for (let mStep = 1; mStep <= mandatoryMonths; mStep++) {
                            let stepDate = new Date(periodStartDate);
                            stepDate.setMonth(stepDate.getMonth() + mStep);
                            if (allocatorCurrentDate < stepDate) {
                                monthIdx = mStep - 1; break;
                            }
                        }
                        if(monthIdx >= mandatoryMonths) monthIdx = mandatoryMonths - 1;
                        
                        allocCyclesRaw.push({
                            isOff: false,
                            startDate: dateString,
                            endDate: endDate.toISOString().split('T')[0],
                            monthIdx: monthIdx,
                            cycleDays: addedDays
                        });
                        
                        allocatorCurrentDate = new Date(endDate);
                        allocatorCurrentDate.setDate(allocatorCurrentDate.getDate() + 1);
                    }
                }

                let simConfig = {
                    groupM: group.m, groupF: group.f, baseMaleCaps, baseFemaleCaps, mandatoryMonths,
                    electroMaleReq, electroFemaleReq, electroMaxCapsM, electroMaxCapsF, electroDates: electroDatesConfig,
                    isAllocator, allocMaleReq, allocFemaleReq, allocDistributeSurplus, allocFillDeficitCross, allocCyclesRaw
                };

                let bestResult = await runFullPipelineSimulation(simConfig);
                let bestData = bestResult.data;

                if (!bestData || !bestData.schedules) {
                    if (loader) loader.style.display = 'none';
                    alert(`⚠️ فشل رياضي في توزيع المجموعة: ${group.name}. السعة المتاحة أقل من عدد الدفعة.`);
                    return;
                }

                // تجميع الرسائل التحذيرية إن وجدت لعرضها لاحقاً
                if (bestData.messages && bestData.messages.length > 0) {
                    allGlobalMessages.push(`في مجموعة ${group.name}: ` + bestData.messages.join(" و "));
                }

                // تحديث المتغيرات العامة بنتائج أفضل محاكاة
                window.globalDutyCounts = Object.assign(window.globalDutyCounts, bestData.dutyUpdates);
                bestData.electroRegistryUpdates.forEach(r => window.electroRegistry.push({...r, p: p}));

                // ==================== رسم الجداول بناءً على البيانات المثالية ====================
                
                // 1. رسم الأقسام
                html += `<h4>توزيع الأقسام: ${group.name}</h4><div class="table-responsive"><table class="data-table"><thead><tr><th>الشهر</th>${departmentsList.map(d=>`<th>${d}</th>`).join('')}</tr></thead><tbody>`;
                for (let m = 1; m <= mandatoryMonths; m++) {
                    let mName = arabicMonths[(startMonthIdx + periodStartAbsolute + m - 1) % 12];
                    html += `<tr><td><strong>الشهر ${m} (${mName})</strong></td>`;
                    let mData = bestData.schedules[m-1];
                    departmentsList.forEach(dept => {
                        let cellStudents = [];
                        if (mData.maleAssign.assignments[dept]) {
                            mData.maleAssign.assignments[dept].forEach(s => {
                                let isRep = mData.maleAssign.repeatedStudents.includes(s);
                                cellStudents.push(isRep ? `<span style="color: #dc2626;">${s}</span>` : s);
                            });
                        }
                        if (mData.femaleAssign.assignments[dept]) {
                            mData.femaleAssign.assignments[dept].forEach(s => {
                                let isRep = mData.femaleAssign.repeatedStudents.includes(s);
                                cellStudents.push(isRep ? `<span style="color: #dc2626;">${s}</span>` : s);
                            });
                        }
                        html += `<td contenteditable="true">${cellStudents.length > 0 ? `<ol class="student-list"><li>${cellStudents.join('</li><li>')}</li></ol>` : '-'}</td>`;
                    });
                    html += `</tr>`;
                }
                html += `</tbody></table></div>`;

                // 2. رسم العلاج الكهربائي
                if (electroMaleReq > 0 || electroFemaleReq > 0) {
                    html += `<h4 style="margin-top:20px; color:var(--primary);">توزيع مسؤولي العلاج الكهربائي (الفترة ${p + 1})</h4>`;
                    html += `<h5>${group.name}</h5><div class="table-responsive"><table class="data-table"><thead><tr><th>الشهر</th><th>الأسبوع الأول</th><th>الأسبوع الثاني</th><th>الأسبوع الثالث</th><th>الأسبوع الرابع</th></tr></thead><tbody>`;
                    
                    for (let m = 1; m <= mandatoryMonths; m++) {
                        let mName = arabicMonths[(startMonthIdx + periodStartAbsolute + m - 1) % 12];
                        html += `<tr><td><strong>الشهر ${m} (${mName})</strong></td>`;
                        
                        let monthElectroData = bestData.electroLog[m-1];
                        let monthAssig = bestData.schedules[m-1].monthAssignments;

                        for (let w = 1; w <= 4; w++) {
                            let weekData = monthElectroData[w-1];
                            let weekList = [];
                            
                            weekData.pickedM.forEach(item => {
                                let deptName = monthAssig[item.name] || 'غير محدد';
                                let disp = `${item.name} (${deptName})`;
                                weekList.push(item.isRep ? `<span style="color: #dc2626;">${disp}</span>` : disp);
                            });
                            weekData.pickedF.forEach(item => {
                                let deptName = monthAssig[item.name] || 'غير محدد';
                                let disp = `${item.name} (${deptName})`;
                                weekList.push(item.isRep ? `<span style="color: #dc2626;">${disp}</span>` : disp);
                            });
                            
                            html += `<td contenteditable="true">${weekList.length > 0 ? `<ol class="student-list"><li>${weekList.join('</li><li>')}</li></ol>` : '-'}</td>`;
                        }
                        html += `</tr>`;
                    }
                    
                    let unassignedElectro = [...group.m, ...group.f].filter(s => !bestData.periodUsedElectroMales.includes(s) && !bestData.periodUsedElectroFemales.includes(s));
                    if (unassignedElectro.length > 0) {
                        html += `<tr style="background:#fffbeb;"><td colspan="5" contenteditable="true"><strong style="color:#b45309; pointer-events:none;">تحليل: فائض لم يتم توزيعه (${unassignedElectro.length} طلاب)</strong><br><small style="pointer-events:none;">لم يتم توزيعهم في العلاج الكهربائي في هذه الفترة:</small> ${unassignedElectro.join(' ، ')}</td></tr>`;
                    }
                    html += `</tbody></table></div>`;
                }

                // 3. رسم الـ Allocator
                if (isAllocator && allocStart) {
                    html += `<h4 style="margin-top:20px; color:#16a34a;">توزيع مسؤولي التاريخ المرضي Allocator (الفترة ${p + 1})</h4>`;
                    html += `<h5>${group.name}</h5><div class="table-responsive"><table class="data-table"><thead><tr><th>التاريخ</th><th>مسؤولو التاريخ المرضي</th><th>ملاحظات</th></tr></thead><tbody>`;
                    
                    let uncoveredDays = [];
                    bestData.allocLog.forEach(cycle => {
                        if (cycle.isOff) {
                            html += `<tr style="background:#f1f5f9;"><td>${cycle.date}</td><td colspan="2">${cycle.reason}</td></tr>`;
                        } else {
                            if (cycle.picked.length < (allocMaleReq + allocFemaleReq)) {
                                uncoveredDays.push(`من ${cycle.startDate} إلى ${cycle.endDate}`);
                            }
                            let extraText = cycle.extraCount > 0 ? `<br><span style="color:#16a34a; font-weight:bold; font-size: 0.9em;">(+${cycle.extraCount} طالب إضافي من الفائض)</span>` : '';
                            
                            let cycleMonthAssig = bestData.schedules[cycle.monthIdx].monthAssignments;
                            let formattedPicked = cycle.picked.map(s => {
                                let deptName = cycleMonthAssig[s] || 'غير محدد';
                                let displayName = `${s} (${deptName})`;
                                if (cycle.crossFilled && cycle.crossFilled.includes(s)) {
                                    return `<span style="color: #b45309; font-weight: bold;">${displayName}</span>`;
                                }
                                return displayName;
                            });
                            
                            html += `<tr><td>من ${cycle.startDate} <br>إلى ${cycle.endDate}</td><td contenteditable="true"><ol class="student-list"><li>${formattedPicked.join('</li><li>')}</li></ol></td><td>دورة ${cycle.cycleDays} أيام${extraText}</td></tr>`;
                        }
                    });

                    if (uncoveredDays.length > 0) {
                        html += `<tr style="background:#fef2f2;"><td colspan="3"><strong style="color:#dc2626; font-size: 1.1em;">أيام غير مغطاة (عجز في الطلاب):</strong><br> ${uncoveredDays.join('<br>')}</td></tr>`;
                    }

                    if (bestData.allocLog.unassigned && bestData.allocLog.unassigned.length > 0) {
                        html += `<tr style="background:#fffbeb;"><td colspan="3" contenteditable="true"><strong style="color:#b45309; pointer-events:none;">تحليل: فائض لم يتم توزيعه (${bestData.allocLog.unassigned.length} طلاب)</strong><br><small style="pointer-events:none;">لم يتم توزيعهم في الـ Allocator:</small> ${bestData.allocLog.unassigned.join(' ، ')}</td></tr>`;
                    }
                    html += `</tbody></table></div>`;
                }
            }
            html += `</div>`;
        }

        // عرض تنبيه شامل بالرسائل المجمعة إن وجدت
        if (loader) loader.style.display = 'none';
        if (allGlobalMessages.length > 0) {
            let alertMsg = "⚠️ تنبيهات من المحاكاة المثالية:\n\n" + allGlobalMessages.join("\n\n") + "\n\nالسيستم حاول يحلها رياضياً واختار أقل ضرر ممكن.";
            alert(alertMsg);
        }

        let container = document.getElementById('resultsContainer');
        if (container) container.innerHTML = html;
        let actionsBox = document.getElementById('printActions');
        if (actionsBox) actionsBox.style.display = 'flex';

    } catch (error) {
        if (document.getElementById('ai-loader')) document.getElementById('ai-loader').style.display = 'none';
        alert("⚠️ حدث خطأ أثناء التوزيع:\n" + error.message + "\n\nيُرجى التأكد من تحديث ملف الـ HTML ليطابق آخر التعديلات.");
        console.error(error);
    } finally {
        let loader = document.getElementById('ai-loader');
        if (loader) loader.style.display = 'none';
        document.getElementById('printArea')?.scrollIntoView({ behavior: 'smooth' });
    }
}

// ============================================================================
// دوال الطباعة والتصدير (Print & Export) 
// ============================================================================
function printAdminTable() {
    if (window.lastDistributionData.length === 0) { alert("يرجى إنشاء التوزيع أولاً!"); return; }
    const startMonthIdx = parseInt(document.getElementById('startMonth')?.value) || 0;
    let adminHtml = `<html><head><title>كشف أسماء طلاب الامتياز</title><style>
        body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th, td { border: 1px solid #000; padding: 10px; text-align: center; }
        th { background-color: #f3f4f6; }
        h2 { text-align: center; margin-bottom: 20px; page-break-after: avoid; }
        h3 { color: #1e3a8a; page-break-after: avoid; }
        .period-section { page-break-inside: avoid; page-break-after: always; }
        .period-section:last-child { page-break-after: auto; }
    </style></head><body><h2>كشف اسماء توزيع طلاب الأمتياز في الشهور الإجبارية</h2>`;

    window.lastDistributionData.forEach((data, index) => {
        let periodStartAbsolute = index * data.mandatoryMonths;
        let monthNames = [];
        for (let m = 0; m < data.mandatoryMonths; m++) monthNames.push(arabicMonths[(startMonthIdx + periodStartAbsolute + m) % 12]);
        adminHtml += `<div class="period-section"><h3>الفترة الإجبارية ${index + 1} (${monthNames.join(' و ')})</h3>
        <table><thead><tr><th style="width: 10%;">م</th><th style="width: 60%;">اسم الطالب</th><th style="width: 30%;">النوع</th></tr></thead><tbody>`;
        let count = 1;
        data.males.forEach(name => { adminHtml += `<tr><td>${count++}</td><td>${name}</td><td>ذكر</td></tr>`; });
        data.females.forEach(name => { adminHtml += `<tr><td>${count++}</td><td>${name}</td><td>أنثى</td></tr>`; });
        adminHtml += `</tbody></table></div>`;
    });
    adminHtml += `</body></html>`;
    
    let printWin = window.open('', '_blank');
    if(printWin) {
        printWin.document.write(adminHtml);
        printWin.document.close();
        printWin.focus();
        printWin.onload = function() { printWin.print(); };
        printWin.onafterprint = function() { printWin.close(); };
    }
}

function exportToWord() {
    let css = `<style>
        @page WordSection1 { size: 841.9pt 595.3pt; mso-page-orientation: landscape; margin: 0.5in 0.5in 0.5in 0.5in; }
        div.WordSection1 { page: WordSection1; direction: rtl; font-family: 'Cairo', sans-serif; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; text-align: center; direction: rtl; }
        th, td { border: 1pt solid windowtext; padding: 5pt; vertical-align: top; }
        th { background-color: #f3f4f6; font-weight: bold; color: #1e3a8a; }
        h3, h4, h5 { color: #1e3a8a; text-align: right; border-bottom: 1pt solid #1e3a8a; padding-bottom: 5pt; }
        ol { margin: 0; padding-right: 20px; text-align: right; }
    </style>`;
    let html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>التوزيع النهائي لطلاب الامتياز</title>${css}</head><body><div class="WordSection1">` 
    + (document.getElementById('resultsContainer')?.innerHTML || '') + `</div></body></html>`;
    
    let blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    let url = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(html);
    let downloadLink = document.createElement("a");
    document.body.appendChild(downloadLink);
    downloadLink.href = url; downloadLink.download = 'التوزيع_النهائي_للامتياز.doc'; downloadLink.click();
    document.body.removeChild(downloadLink);
}

function exportAdminToWord() {
    if (window.lastDistributionData.length === 0) { alert("يرجى إنشاء التوزيع أولاً!"); return; }
    const startMonthIdx = parseInt(document.getElementById('startMonth')?.value) || 0;
    let css = `<style>
        @page WordSection1 { size: 595.3pt 841.9pt; margin: 0.5in 0.5in 0.5in 0.5in; }
        div.WordSection1 { page: WordSection1; direction: rtl; font-family: 'Cairo', sans-serif; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; text-align: center; direction: rtl; }
        th, td { border: 1pt solid windowtext; padding: 8pt; }
        th { background-color: #f3f4f6; font-weight: bold; color: #1e3a8a; }
        h2 { text-align: center; margin-bottom: 20px; color: #000; }
        h3 { color: #1e3a8a; text-align: right; }
        .page-break { mso-special-character: line-break; page-break-before: always; }
    </style>`;
    let html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>كشف شئون الامتياز</title>${css}</head><body><div class="WordSection1"><h2>كشف اسماء توزيع طلاب الأمتياز في الشهور الإجبارية</h2>`;
    
    window.lastDistributionData.forEach((data, index) => {
        let periodStartAbsolute = index * data.mandatoryMonths;
        let monthNames = [];
        for (let m = 0; m < data.mandatoryMonths; m++) monthNames.push(arabicMonths[(startMonthIdx + periodStartAbsolute + m) % 12]);
        if (index > 0) html += `<br clear="all" class="page-break" />`;
        html += `<h3>الفترة الإجبارية ${index + 1} (${monthNames.join(' و ')})</h3><table><thead><tr><th>م</th><th>اسم الطالب</th><th>النوع</th></tr></thead><tbody>`;
        let count = 1;
        data.males.forEach(name => { html += `<tr><td>${count++}</td><td>${name}</td><td>ذكر</td></tr>`; });
        data.females.forEach(name => { html += `<tr><td>${count++}</td><td>${name}</td><td>أنثى</td></tr>`; });
        html += `</tbody></table>`;
    });
    html += `</div></body></html>`;
    let blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    let url = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(html);
    let downloadLink = document.createElement("a");
    document.body.appendChild(downloadLink);
    downloadLink.href = url; downloadLink.download = 'كشف_شئون_الامتياز.doc'; downloadLink.click();
    document.body.removeChild(downloadLink);
}

function exportAdminToExcel() {
    if (window.lastDistributionData.length === 0) { alert("يرجى إنشاء التوزيع أولاً!"); return; }
    if (typeof XLSX === 'undefined') { alert("مكتبة Excel لم يتم تحميلها بشكل صحيح."); return; }
    const startMonthIdx = parseInt(document.getElementById('startMonth')?.value) || 0;
    let wb = XLSX.utils.book_new();
    wb.Workbook = { Views: [{ RTL: true }] };
    window.lastDistributionData.forEach((data, index) => {
        let periodStartAbsolute = index * data.mandatoryMonths;
        let monthNames = [];
        for (let m = 0; m < data.mandatoryMonths; m++) monthNames.push(arabicMonths[(startMonthIdx + periodStartAbsolute + m) % 12]);
        let wsData = [ [`كشف أسماء طلاب الامتياز - الفترة الإجبارية ${index + 1} (${monthNames.join(' و ')})`], [], ['م', 'اسم الطالب', 'النوع'] ];
        let count = 1;
        data.males.forEach(name => { wsData.push([count++, name, 'ذكر']); });
        data.females.forEach(name => { wsData.push([count++, name, 'أنثى']); });
        let ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!cols'] = [ { wch: 5 }, { wch: 40 }, { wch: 15 } ];
        XLSX.utils.book_append_sheet(wb, ws, `الفترة ${index + 1}`);
    });
    XLSX.writeFile(wb, 'كشف_شئون_الامتياز.xlsx');
}

window.onload = () => { buildDepartmentsTable(); };
