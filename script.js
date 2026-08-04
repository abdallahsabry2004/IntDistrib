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

// حقن واجهة التحميل الذكية في الصفحة
if (!document.getElementById('ai-loader')) {
    const loaderHtml = `<div id="ai-loader" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(255,255,255,0.95); z-index:9999; flex-direction:column; justify-content:center; align-items:center; font-family: 'Cairo', sans-serif; direction: rtl;">
        <div style="border: 8px solid #f3f3f3; border-top: 8px solid #1e3a8a; border-radius: 50%; width: 70px; height: 70px; animation: spin 1.5s linear infinite;"></div>
        <h2 style="color:#1e3a8a; margin-top:25px;">جاري حساب المسار الرياضي المثالي (Backtracking)...</h2>
        <p style="color:#4b5563; font-size:1.1em; font-weight:bold; margin-top:5px;">يُرجى الانتظار وعدم إغلاق الصفحة، قد تستغرق العملية وقتاً لضمان دقة 100% بدون أي عجز أو فائض.</p>
        <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', loaderHtml);
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

function updatePeriodSummary() {
    const mandatoryMonthsElem = document.getElementById('mandatoryMonths');
    if (!mandatoryMonthsElem) return;
    const months = parseInt(mandatoryMonthsElem.value);
    const periodsCount = 12 / months;
    const totalMales = parseInt(document.getElementById('maleCount')?.innerText) || 0;
    const totalFemales = parseInt(document.getElementById('femaleCount')?.innerText) || 0;
    const workMode = document.getElementById('workMode')?.value || 'full';
    
    window.globalDistributionPlan = { males: [], females: [] };
    
    let baseM = Math.floor(totalMales / periodsCount);
    let remM = totalMales % periodsCount;
    let baseF = Math.floor(totalFemales / periodsCount);
    let remF = totalFemales % periodsCount;

    let summaryContainer = document.getElementById('periodSummaryContainer');
    if (summaryContainer) {
        let html = `<strong>معلومة:</strong> سيتم تقسيم الدفعة إلى <strong>${periodsCount} فترات</strong>.<br>`;
        if (workMode !== 'full') {
            html += `<strong style="color:red;">تنبيه نظام 3 أيام:</strong> كل فترة سيتم قسمتها داخلياً إلى مجموعتي عمل (أ، ب).<br>الأعداد المطلوبة في الأقسام سيتم تطبيقها بالكامل على مجموعة (أ) وعلى مجموعة (ب) بشكل منفصل.`;
        }
        summaryContainer.innerHTML = html;
    }

    let tableHtml = `<table class="data-table mini-table">
                        <thead><tr><th>الفترة</th><th>ذكور (بكل شهر)</th><th>إناث (بكل شهر)</th></tr></thead><tbody>`;
    for (let p = 1; p <= periodsCount; p++) {
        let pMales = baseM + (p <= remM ? 1 : 0);
        let pFemales = baseF + (p <= remF ? 1 : 0);
        window.globalDistributionPlan.males.push(pMales);
        window.globalDistributionPlan.females.push(pFemales);
        tableHtml += `<tr><td>الفترة ${p}</td><td>${pMales}</td><td>${pFemales}</td></tr>`;
    }
    tableHtml += `</tbody></table>`;
    
    let detailedTable = document.getElementById('detailedPeriodTable');
    if (detailedTable) detailedTable.innerHTML = (totalMales > 0 || totalFemales > 0) ? tableHtml : '';
}

// ============================================================================
// الخوارزميات الحتمية المساعدة (Deterministic Helper Algorithms)
// ============================================================================

function distributeDepartmentSurplusDeterministic(baseCaps, targetSum) {
    let finalCaps = [...baseCaps];
    let currentSum = finalCaps.reduce((a, b) => a + b, 0);
    let eligibleIndices = [0, 1, 2, 3, 4, 5]; 
    
    if (currentSum < targetSum) {
        let surplus = targetSum - currentSum;
        let pointer = 0;
        while (surplus > 0) {
            finalCaps[eligibleIndices[pointer % eligibleIndices.length]]++;
            surplus--;
            pointer++;
        }
    } else if (currentSum > targetSum) {
        let deficit = currentSum - targetSum;
        let pointer = 0;
        while (deficit > 0) {
            let idx = eligibleIndices[pointer % eligibleIndices.length];
            if (finalCaps[idx] > 0) {
                finalCaps[idx]--;
                deficit--;
            }
            pointer++;
        }
    }
    return finalCaps;
}

// خوارزمية التتبع الخلفي (Depth-First Search Backtracking)
function exactSolveMonth(students, caps, currentHistory, allowRepetition = false) {
    let assignments = {};
    departmentsList.forEach(d => assignments[d] = []);
    let newHistory = JSON.parse(JSON.stringify(currentHistory || {}));
    let remainingCaps = [...caps];
    let repeatedStudents = [];

    // الترتيب الحتمي: الأقل خيارات (زار أقسام أكتر) يحل أولاً، ثم ترتيب أبجدي لكسر التعادل
    let sortedStudents = [...students].sort((a, b) => {
        let histA = (newHistory[a] || []).length;
        let histB = (newHistory[b] || []).length;
        if (histB !== histA) return histB - histA; // ترتيب تنازلي (الأكثر زيارة أولاً)
        return a.localeCompare(b);
    });

    function backtrack(index) {
        if (index === sortedStudents.length) return true; // تمت بنجاح
        
        let student = sortedStudents[index];
        if (!newHistory[student]) newHistory[student] = [];
        
        let availableDepts = [];
        for (let i = 0; i < departmentsList.length; i++) {
            if (remainingCaps[i] > 0) {
                if (allowRepetition || !newHistory[student].includes(departmentsList[i])) {
                    availableDepts.push(i);
                }
            }
        }

        // الترتيب الحتمي للأقسام: الأقسام غير المكررة أولاً، ثم الأعلى سعة
        availableDepts.sort((a, b) => {
            let repA = newHistory[student].includes(departmentsList[a]) ? 1 : 0;
            let repB = newHistory[student].includes(departmentsList[b]) ? 1 : 0;
            if (repA !== repB) return repA - repB; 
            
            let capDiff = remainingCaps[b] - remainingCaps[a];
            if (capDiff !== 0) return capDiff;
            return a - b; 
        });

        for (let deptIdx of availableDepts) {
            let deptName = departmentsList[deptIdx];
            let isRepeat = newHistory[student].includes(deptName);
            
            // تجربة المسار
            assignments[deptName].push(student);
            newHistory[student].push(deptName);
            remainingCaps[deptIdx]--;
            if (isRepeat) repeatedStudents.push(student);

            // النزول في الشجرة
            if (backtrack(index + 1)) return true;

            // فشل المسار: التراجع (Backtrack)
            assignments[deptName].pop();
            newHistory[student].pop();
            remainingCaps[deptIdx]++;
            if (isRepeat) repeatedStudents.pop();
        }

        return false;
    }

    let success = backtrack(0);
    return { success, assignments, history: newHistory, repeatedStudents };
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

// السحب الحتمي للكهربائي (لا يوجد أي عشوائية)
function pickElectroStudentsDeterministic(pool, requiredCount, usedGlobal, monthAssignments, maxCapsArray, allSchedules, currentMonthIdx) {
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

    // ترتيب حتمي صارم جداً
    validAvailable.sort((a, b) => {
        // 1. أولوية قسم الحكيم في الشهور الأخرى
        let scoreA = allSchedules.some((sched, idx) => idx !== currentMonthIdx && sched && sched[a] === 'قسم (الحكيم)') ? 1 : 0;
        let scoreB = allSchedules.some((sched, idx) => idx !== currentMonthIdx && sched && sched[b] === 'قسم (الحكيم)') ? 1 : 0;
        if (scoreB !== scoreA) return scoreB - scoreA;
        
        // 2. العدالة في النوبتجيات
        let dutyA = window.globalDutyCounts[a] || 0;
        let dutyB = window.globalDutyCounts[b] || 0;
        if (dutyA !== dutyB) return dutyA - dutyB;
        
        // 3. الترتيب الأبجدي كفيصل نهائي (منع العشوائية)
        return a.localeCompare(b);
    });

    let picked = [];
    let deptCounts = {};
    departmentsList.forEach(d => deptCounts[d] = 0);

    // سحب منظم لضمان التنوع
    while (picked.length < requiredCount && validAvailable.length > 0) {
        let pickedIndex = -1;

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
                pickedIndex = i;
                break;
            }
        }

        if (pickedIndex === -1) {
            for (let i = 0; i < validAvailable.length; i++) {
                let s = validAvailable[i];
                let d = monthAssignments[s];
                let deptIdx = departmentsList.indexOf(d);
                if (maxCapsArray[deptIdx] === -1 || deptCounts[d] < maxCapsArray[deptIdx]) {
                    pickedIndex = i;
                    break;
                }
            }
        }

        if (pickedIndex !== -1) {
            let s = validAvailable.splice(pickedIndex, 1)[0];
            picked.push(s);
            deptCounts[monthAssignments[s]]++;
        } else {
            break; 
        }
    }

    return picked; 
}

function pickRepeatedElectroDeterministic(pool, requiredCount, usedGlobal, monthAssignments, currentP, currentM, currentW) {
    if (requiredCount === 0 || !monthAssignments) return [];
    
    let availableForRepeat = usedGlobal.filter(s => pool.includes(s)); 
    let validForRepeat = availableForRepeat.filter(s => {
        let dept = monthAssignments[s];
        if (!dept || dept === 'قسم (الحكيم)') return false;
        
        let conflictThisWeek = window.electroRegistry.some(r => r.name === s && r.p === currentP && r.m === currentM && r.w === currentW);
        return !conflictThisWeek;
    });

    validForRepeat.sort((a, b) => {
        let dutyA = window.globalDutyCounts[a] || 0;
        let dutyB = window.globalDutyCounts[b] || 0;
        if (dutyA !== dutyB) return dutyA - dutyB;
        return a.localeCompare(b);
    });

    return validForRepeat.slice(0, requiredCount);
}

// ============================================================================
// الخوارزمية الرئيسية المزامنة (Main Generation Async)
// ============================================================================
async function generateDistribution() {
    try {
        const malesVal = document.getElementById('maleNames')?.value || '';
        const femalesVal = document.getElementById('femaleNames')?.value || '';
        const males = malesVal.split('\n').map(n => n.trim()).filter(n => n !== '');
        const females = femalesVal.split('\n').map(n => n.trim()).filter(n => n !== '');
        
        if (males.length === 0 && females.length === 0) { 
            alert("أدخل أسماء الطلاب أولاً."); 
            return; 
        }

        // إظهار شاشة التحميل (Loader) وإجبار المتصفح على رسمها
        document.getElementById('ai-loader').style.display = 'flex';
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        await new Promise(r => setTimeout(r, 100)); // مساحة إضافية للمتصفح

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
        let cohortMinMales = Math.floor(males.length / numPeriods);
        let cohortMinFemales = Math.floor(females.length / numPeriods);
        
        let requiredMalesCheck = is3Days ? sumMaleCaps * 2 : sumMaleCaps;
        let requiredFemalesCheck = is3Days ? sumFemaleCaps * 2 : sumFemaleCaps;

        if (requiredMalesCheck > cohortMinMales || requiredFemalesCheck > cohortMinFemales) {
            document.getElementById('ai-loader').style.display = 'none';
            let msg = `⚠️ [تحليل النظام: عجز في سعة الأقسام]\n\nالأعداد المطلوبة للأقسام تفوق عدد الطلاب المتاحين في الفترة.\n❓ هل تريد إجبار النظام على الإكمال وتقليل الأعداد برمجياً لسد العجز؟`;
            if (!confirm(msg)) return;
            document.getElementById('ai-loader').style.display = 'flex';
            await new Promise(r => setTimeout(r, 50));
        }

        let isAllocator = document.getElementById('enableAllocator')?.checked || false;
        if (isAllocator) {
            let year = new Date().getFullYear();
            window.publicHolidays = [...await fetchPublicHolidays(year), ...await fetchPublicHolidays(year + 1)];
        }

        let malePeriods = [], femalePeriods = [];
        // التوزيع الحتمي للدفعة على الفترات 
        let sortedAllMales = [...males].sort((a,b) => a.localeCompare(b));
        let sortedAllFemales = [...females].sort((a,b) => a.localeCompare(b));
        
        let mIdx = 0, fIdx = 0;
        for (let i = 0; i < numPeriods; i++) {
            let pMalesCount = window.globalDistributionPlan.males[i] || Math.floor(males.length / numPeriods);
            let pFemalesCount = window.globalDistributionPlan.females[i] || Math.floor(females.length / numPeriods);
            malePeriods.push(sortedAllMales.slice(mIdx, mIdx + pMalesCount));
            femalePeriods.push(sortedAllFemales.slice(fIdx, fIdx + pFemalesCount));
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
            let periodUsedElectroMales = [];
            let periodUsedElectroFemales = [];
            let fatalErrorOccurred = false; 

            for (let group of periodGroups) {
                if (fatalErrorOccurred) break;

                let groupSchedules = [];
                let currentHistoryM = {}, currentHistoryF = {};
                group.m.forEach(s => currentHistoryM[s] = []);
                group.f.forEach(s => currentHistoryF[s] = []);
                
                let penalty = 0;

                for (let m = 1; m <= mandatoryMonths; m++) {
                    // تفادي التجميد: يريح المتصفح بين الشهور
                    await new Promise(r => setTimeout(r, 0));
                    
                    let adjustedM = distributeDepartmentSurplusDeterministic(baseMaleCaps, group.m.length);
                    let adjustedF = distributeDepartmentSurplusDeterministic(baseFemaleCaps, group.f.length);
                    
                    // حل حتمي دقيق
                    let maleAssign = exactSolveMonth(group.m, adjustedM, currentHistoryM, false);
                    if (!maleAssign.success) maleAssign = exactSolveMonth(group.m, adjustedM, currentHistoryM, true);
                    
                    let femaleAssign = exactSolveMonth(group.f, adjustedF, currentHistoryF, false);
                    if (!femaleAssign.success) femaleAssign = exactSolveMonth(group.f, adjustedF, currentHistoryF, true);

                    currentHistoryM = maleAssign.history;
                    currentHistoryF = femaleAssign.history;
                    penalty += maleAssign.repeatedStudents.length + femaleAssign.repeatedStudents.length;

                    let monthAssignments = {};
                    departmentsList.forEach(dept => {
                        if (maleAssign.assignments[dept]) maleAssign.assignments[dept].forEach(s => monthAssignments[s] = dept);
                        if (femaleAssign.assignments[dept]) femaleAssign.assignments[dept].forEach(s => monthAssignments[s] = dept);
                    });

                    groupSchedules.push({
                        maleAssign: maleAssign,
                        femaleAssign: femaleAssign,
                        monthAssignments: monthAssignments
                    });
                }

                if (penalty > 0) {
                    document.getElementById('ai-loader').style.display = 'none';
                    let msg = `⚠️ [تحليل النظام: استنفاذ الأقسام للمجموعة ${group.name}]\n\n`;
                    msg += `تم تنفيذ الحل الرياضي الدقيق (Backtracking DFS)، ولكن السعة الحالية لا تكفي لمنع التكرار تماماً رياضياً.\n`;
                    msg += `المسار الوحيد المتاح يتطلب تكرار أقسام لعدد (${penalty}) طالب/طالبة.\n\n`;
                    msg += `هل توافق على السماح بالتكرار لسد العجز؟ (سيتم تمييزهم بلون أحمر)`;
                    if (!confirm(msg)) {
                        fatalErrorOccurred = true; 
                        document.getElementById('ai-loader').style.display = 'flex';
                        break;
                    }
                    document.getElementById('ai-loader').style.display = 'flex';
                    await new Promise(r => setTimeout(r, 50));
                }

                html += `<h4>توزيع الأقسام: ${group.name}</h4><div class="table-responsive"><table class="data-table"><thead><tr><th>الشهر</th>${departmentsList.map(d=>`<th>${d}</th>`).join('')}</tr></thead><tbody>`;
                
                let processedSchedules = [];

                for (let m = 1; m <= mandatoryMonths; m++) {
                    let mName = arabicMonths[(startMonthIdx + periodStartAbsolute + m - 1) % 12];
                    html += `<tr><td><strong>الشهر ${m} (${mName})</strong></td>`;
                    
                    let mData = groupSchedules[m-1];
                    let monthAssignments = mData.monthAssignments;

                    departmentsList.forEach(dept => {
                        let cellStudents = [];
                        
                        if (mData.maleAssign.assignments[dept]) {
                            mData.maleAssign.assignments[dept].forEach(s => {
                                let isRepeated = mData.maleAssign.repeatedStudents.includes(s);
                                let displayStr = isRepeated ? `<span style="color: #dc2626;">${s}</span>` : s;
                                cellStudents.push(displayStr);
                            });
                        }
                        if (mData.femaleAssign.assignments[dept]) {
                            mData.femaleAssign.assignments[dept].forEach(s => {
                                let isRepeated = mData.femaleAssign.repeatedStudents.includes(s);
                                let displayStr = isRepeated ? `<span style="color: #dc2626;">${s}</span>` : s;
                                cellStudents.push(displayStr);
                            });
                        }
                        html += `<td>${cellStudents.length > 0 ? `<ol class="student-list"><li>${cellStudents.join('</li><li>')}</li></ol>` : '-'}</td>`;
                    });
                    processedSchedules.push(monthAssignments);
                    html += `</tr>`;
                }
                monthlySchedules.push({ groupName: group.name, schedules: processedSchedules, m: group.m, f: group.f });
                html += `</tbody></table></div>`;
            }

            if (fatalErrorOccurred) break;

            // ----------------- العلاج الكهربائي -----------------
            if (electroMaleReq > 0 || electroFemaleReq > 0) {
                html += `<h4 style="margin-top:20px; color:var(--primary);">توزيع مسؤولي العلاج الكهربائي (الفترة ${p + 1})</h4>`;
                
                for (let gInfo of monthlySchedules) {
                    html += `<h5>${gInfo.groupName}</h5><div class="table-responsive"><table class="data-table"><thead><tr><th>الشهر</th><th>الأسبوع الأول</th><th>الأسبوع الثاني</th><th>الأسبوع الثالث</th><th>الأسبوع الرابع</th></tr></thead><tbody>`;
                    
                    for (let m = 1; m <= mandatoryMonths; m++) {
                        let mName = arabicMonths[(startMonthIdx + periodStartAbsolute + m - 1) % 12];
                        html += `<tr><td><strong>الشهر ${m} (${mName})</strong></td>`;
                        let monthAssig = gInfo.schedules[m-1] || {};

                        let baseD = allocStart ? new Date(allocStart) : new Date();
                        baseD.setMonth(baseD.getMonth() + (p * mandatoryMonths) + (m - 1));
                        let y = baseD.getFullYear();
                        let mon = baseD.getMonth();
                        
                        let weeksDates = [
                            { start: new Date(y, mon, 1), end: new Date(y, mon, 7) },
                            { start: new Date(y, mon, 8), end: new Date(y, mon, 14) },
                            { start: new Date(y, mon, 15), end: new Date(y, mon, 21) },
                            { start: new Date(y, mon, 22), end: new Date(y, mon + 1, 0) } 
                        ];

                        for (let w = 1; w <= 4; w++) {
                            let currWeekDate = weeksDates[w - 1];
                            let pickedM = pickElectroStudentsDeterministic(gInfo.m, electroMaleReq, periodUsedElectroMales, monthAssig, electroMaxCapsM, gInfo.schedules, m-1);
                            let pickedF = pickElectroStudentsDeterministic(gInfo.f, electroFemaleReq, periodUsedElectroFemales, monthAssig, electroMaxCapsF, gInfo.schedules, m-1);
                            
                            let missingM = electroMaleReq - pickedM.length;
                            let missingF = electroFemaleReq - pickedF.length;

                            if (missingM > 0 || missingF > 0) {
                                document.getElementById('ai-loader').style.display = 'none';
                                let msg = `⚠️ [عجز في العلاج الكهربائي - الأسبوع ${w} لشهر ${mName}]\n\nالعدد المتاح للذكور: ${pickedM.length}/${electroMaleReq} | للإناث: ${pickedF.length}/${electroFemaleReq}\n\nهل توافق على تكرار طلاب (نزلوا علاج كهربائي في أسابيع سابقة) لسد العجز وتلوينهم بالأحمر؟`;
                                if (confirm(msg)) {
                                    if (missingM > 0) {
                                        let extraM = pickRepeatedElectroDeterministic(gInfo.m, missingM, periodUsedElectroMales, monthAssig, p, m, w);
                                        pickedM.push(...extraM);
                                    }
                                    if (missingF > 0) {
                                        let extraF = pickRepeatedElectroDeterministic(gInfo.f, missingF, periodUsedElectroFemales, monthAssig, p, m, w);
                                        pickedF.push(...extraF);
                                    }
                                }
                                document.getElementById('ai-loader').style.display = 'flex';
                                await new Promise(r => setTimeout(r, 50));
                            }
                            
                            let weekList = [];
                            if (pickedM && pickedM.length > 0) { 
                                pickedM.forEach(s => {
                                    window.globalDutyCounts[s] = (window.globalDutyCounts[s] || 0) + 1;
                                    window.electroRegistry.push({name: s, p: p, m: m, w: w, startDate: currWeekDate.start, endDate: currWeekDate.end});
                                    let isRep = periodUsedElectroMales.includes(s);
                                    if (!isRep) periodUsedElectroMales.push(s);
                                    
                                    let deptName = monthAssig[s] || 'غير محدد';
                                    let displayName = `${s} (${deptName})`;
                                    weekList.push(isRep ? `<span style="color: #dc2626;">${displayName}</span>` : displayName);
                                });
                            }
                            if (pickedF && pickedF.length > 0) { 
                                pickedF.forEach(s => {
                                    window.globalDutyCounts[s] = (window.globalDutyCounts[s] || 0) + 1;
                                    window.electroRegistry.push({name: s, p: p, m: m, w: w, startDate: currWeekDate.start, endDate: currWeekDate.end});
                                    let isRep = periodUsedElectroFemales.includes(s);
                                    if (!isRep) periodUsedElectroFemales.push(s);
                                    
                                    let deptName = monthAssig[s] || 'غير محدد';
                                    let displayName = `${s} (${deptName})`;
                                    weekList.push(isRep ? `<span style="color: #dc2626;">${displayName}</span>` : displayName);
                                });
                            }
                            
                            html += `<td>${weekList.length > 0 ? `<ol class="student-list"><li>${weekList.join('</li><li>')}</li></ol>` : '-'}</td>`;
                        }
                        html += `</tr>`;
                    }
                    
                    let unassignedElectro = [...gInfo.m, ...gInfo.f].filter(s => !periodUsedElectroMales.includes(s) && !periodUsedElectroFemales.includes(s));
                    if (unassignedElectro.length > 0) {
                        html += `<tr style="background:#fffbeb;"><td colspan="5"><strong style="color:#b45309;">تحليل: فائض لم يتم توزيعه (${unassignedElectro.length} طلاب)</strong><br><small>لم يتم توزيعهم في العلاج الكهربائي في هذه الفترة:</small> ${unassignedElectro.join(' ، ')}</td></tr>`;
                    }
                    
                    html += `</tbody></table></div>`;
                }
            }

            // ----------------- جدول الـ Allocator -----------------
            if (isAllocator && allocStart) {
                html += `<h4 style="margin-top:20px; color:#16a34a;">توزيع مسؤولي التاريخ المرضي Allocator (الفترة ${p + 1})</h4>`;
                
                let allocatorCurrentDate = new Date(allocStart);
                allocatorCurrentDate.setMonth(allocatorCurrentDate.getMonth() + (p * mandatoryMonths));
                
                let periodEndDate = new Date(allocatorCurrentDate);
                periodEndDate.setMonth(periodEndDate.getMonth() + mandatoryMonths);

                for (let gInfo of monthlySchedules) {
                    html += `<h5>${gInfo.groupName}</h5><div class="table-responsive"><table class="data-table"><thead><tr><th>التاريخ</th><th>مسؤولو التاريخ المرضي</th><th>ملاحظات</th></tr></thead><tbody>`;
                    
                    let usedAllocators = [];
                    let safety = 0;
                    
                    let allocCyclesData = [];
                    let uncoveredDays = [];
                    let deficitOccurred = false;

                    while (allocatorCurrentDate < periodEndDate && safety < 365) {
                        safety++;
                        let dateString = allocatorCurrentDate.toISOString().split('T')[0];
                        let isWeekend = allocWeekends.includes(allocatorCurrentDate.getDay());
                        let holiday = window.publicHolidays.find(h => h.date === dateString);
                        
                        if (isWeekend || holiday) {
                            allocCyclesData.push({ isOff: true, date: dateString, reason: holiday ? 'إجازة رسمية: ' + holiday.name : 'عطلة أسبوعية' });
                            allocatorCurrentDate.setDate(allocatorCurrentDate.getDate() + 1);
                            continue;
                        }

                        let endDate = new Date(allocatorCurrentDate);
                        let addedDays = 1;
                        
                        while(addedDays < allocCycle) {
                            let nextDay = new Date(endDate);
                            nextDay.setDate(nextDay.getDate() + 1);

                            if (nextDay >= periodEndDate) { break; }

                            endDate = nextDay;
                            let endIsWknd = allocWeekends.includes(endDate.getDay());
                            let endHol = window.publicHolidays.find(h => h.date === endDate.toISOString().split('T')[0]);
                            if(!endIsWknd && !endHol) { addedDays++; }
                        }
                        
                        let endDateString = endDate.toISOString().split('T')[0];

                        if (deficitOccurred) {
                            uncoveredDays.push(`من ${dateString} إلى ${endDateString}`);
                            allocatorCurrentDate = new Date(endDate);
                            allocatorCurrentDate.setDate(allocatorCurrentDate.getDate() + 1);
                            continue;
                        }

                        let periodStartDate = new Date(allocStart);
                        periodStartDate.setMonth(periodStartDate.getMonth() + (p * mandatoryMonths));
                        
                        let monthIdx = 0;
                        for (let mStep = 1; mStep <= mandatoryMonths; mStep++) {
                            let stepDate = new Date(periodStartDate);
                            stepDate.setMonth(stepDate.getMonth() + mStep);
                            if (allocatorCurrentDate < stepDate) {
                                monthIdx = mStep - 1;
                                break;
                            }
                        }
                        if(monthIdx >= mandatoryMonths) monthIdx = mandatoryMonths - 1;
                        
                        let monthAssig = gInfo.schedules[monthIdx] || {};
                        let currentAbsoluteMonth = monthIdx + 1; 

                        const hasElectroConflict = (studentName, allocStartStr, allocEndStr) => {
                            let alStart = new Date(allocStartStr);
                            let alEnd = new Date(allocEndStr);
                            return window.electroRegistry.some(record => {
                                if (record.name !== studentName) return false;
                                let elStart = new Date(record.startDate);
                                let elEnd = new Date(record.endDate);
                                return (alStart <= elEnd && alEnd >= elStart);
                            });
                        };

                        let availM = gInfo.m.filter(s => !usedAllocators.includes(s) && monthAssig[s] && monthAssig[s] !== 'قسم (الحكيم)' && !hasElectroConflict(s, dateString, endDateString));
                        let availF = gInfo.f.filter(s => !usedAllocators.includes(s) && monthAssig[s] && monthAssig[s] !== 'قسم (الحكيم)' && !hasElectroConflict(s, dateString, endDateString));
                        
                        // الترتيب الحتمي الدقيق
                        const smartSortAlloc = (a, b) => {
                            let hA = gInfo.schedules.filter((sched, idx) => idx !== monthIdx && sched && sched[a] === 'قسم (الحكيم)').length;
                            let hB = gInfo.schedules.filter((sched, idx) => idx !== monthIdx && sched && sched[b] === 'قسم (الحكيم)').length;
                            if (hA !== hB) return hB - hA; 
                            
                            let dA = window.globalDutyCounts[a] || 0;
                            let dB = window.globalDutyCounts[b] || 0;
                            if (dA !== dB) return dA - dB;
                            
                            return a.localeCompare(b);
                        };
                        
                        availM.sort(smartSortAlloc);
                        availF.sort(smartSortAlloc);

                        let pickedM = availM.slice(0, allocMaleReq);
                        let pickedF = availF.slice(0, allocFemaleReq);
                        let picked = [...pickedM, ...pickedF];
                        
                        if (picked.length < (allocMaleReq + allocFemaleReq)) {
                            document.getElementById('ai-loader').style.display = 'none';
                            if (confirm(`⚠️ [عجز في الـ Allocator]\nالطلاب المتاحين في دورة (${dateString}) غير كافين.\nهل تريد إكمال التوزيع وترك باقي الأيام فارغة؟`)) { 
                                deficitOccurred = true;
                                uncoveredDays.push(`من ${dateString} إلى ${endDateString}`);
                                allocatorCurrentDate = new Date(endDate);
                                allocatorCurrentDate.setDate(allocatorCurrentDate.getDate() + 1);
                                document.getElementById('ai-loader').style.display = 'flex';
                                continue;
                            } else { return; }
                        }

                        picked.forEach(s => {
                            window.globalDutyCounts[s] = (window.globalDutyCounts[s] || 0) + 1;
                            usedAllocators.push(s);
                            window.allocRegistry.push({name: s, startDate: dateString, endDate: endDateString});
                        });
                        
                        allocCyclesData.push({
                            isOff: false,
                            startDate: dateString,
                            endDate: endDateString,
                            picked: picked,
                            extraCount: 0,
                            absMonth: currentAbsoluteMonth,
                            cycleDays: addedDays
                        });
                        
                        allocatorCurrentDate = new Date(endDate);
                        allocatorCurrentDate.setDate(allocatorCurrentDate.getDate() + 1);
                    }
                    
                    let unassigned = [...gInfo.m, ...gInfo.f].filter(s => !usedAllocators.includes(s) && gInfo.schedules[0] && gInfo.schedules[0][s] !== 'قسم (الحكيم)');
                    
                    if (allocDistributeSurplus && unassigned.length > 0) {
                        let activeCycles = allocCyclesData.filter(c => !c.isOff);
                        
                        // ترتيب حتمي للمتبقين لضمان نفس النتيجة
                        let surplusPool = [...unassigned].sort((a,b) => {
                            let dA = window.globalDutyCounts[a] || 0;
                            let dB = window.globalDutyCounts[b] || 0;
                            if (dA !== dB) return dA - dB;
                            return a.localeCompare(b);
                        });
                        
                        for (let student of surplusPool) {
                            activeCycles.sort((a, b) => (a.extraCount || 0) - (b.extraCount || 0));
                            
                            for (let cycle of activeCycles) {
                                const alStart = new Date(cycle.startDate);
                                const alEnd = new Date(cycle.endDate);
                                
                                const conflict = window.electroRegistry.some(record => {
                                    if(record.name !== student) return false;
                                    let elStart = new Date(record.startDate);
                                    let elEnd = new Date(record.endDate);
                                    return (alStart <= elEnd && alEnd >= elStart);
                                });
                                
                                if (!conflict) {
                                    cycle.picked.push(student);
                                    cycle.extraCount = (cycle.extraCount || 0) + 1;
                                    unassigned = unassigned.filter(s => s !== student);
                                    usedAllocators.push(student);
                                    window.globalDutyCounts[student] = (window.globalDutyCounts[student] || 0) + 1;
                                    break;
                                }
                            }
                        }
                    }

                    allocCyclesData.forEach(cycle => {
                        if (cycle.isOff) {
                            html += `<tr style="background:#f1f5f9;"><td>${cycle.date}</td><td colspan="2">${cycle.reason}</td></tr>`;
                        } else {
                            let extraText = cycle.extraCount > 0 ? `<br><span style="color:#16a34a; font-weight:bold; font-size: 0.9em;">(+${cycle.extraCount} طالب إضافي من الفائض)</span>` : '';
                            
                            let cycleMonthAssig = gInfo.schedules[cycle.absMonth - 1] || {};
                            let formattedPicked = cycle.picked.map(s => {
                                let deptName = cycleMonthAssig[s] || 'غير محدد';
                                return `${s} (${deptName})`;
                            });
                            
                            html += `<tr><td>من ${cycle.startDate} <br>إلى ${cycle.endDate}</td><td><ol class="student-list"><li>${formattedPicked.join('</li><li>')}</li></ol></td><td>دورة ${cycle.cycleDays} أيام${extraText}</td></tr>`;
                        }
                    });

                    if (uncoveredDays.length > 0) {
                        html += `<tr style="background:#fef2f2;"><td colspan="3"><strong style="color:#dc2626; font-size: 1.1em;">أيام غير مغطاة (عجز في الطلاب):</strong><br> ${uncoveredDays.join('<br>')}</td></tr>`;
                    }

                    if (unassigned.length > 0) {
                        html += `<tr style="background:#fffbeb;"><td colspan="3"><strong style="color:#b45309;">تحليل: فائض لم يتم توزيعه (${unassigned.length} طلاب)</strong><br><small>لم يتم توزيعهم في الـ Allocator:</small> ${unassigned.join(' ، ')}</td></tr>`;
                    }

                    html += `</tbody></table></div>`;
                }
            }
            html += `</div>`;
        }

        let container = document.getElementById('resultsContainer');
        if (container) container.innerHTML = html;
        let actionsBox = document.getElementById('printActions');
        if (actionsBox) actionsBox.style.display = 'flex';
        
    } catch (error) {
        document.getElementById('ai-loader').style.display = 'none';
        alert("⚠️ حدث خطأ أثناء التوزيع:\n" + error.message + "\n\nيُرجى التأكد من تحديث ملف الـ HTML ليطابق آخر التعديلات.");
        console.error(error);
    } finally {
        // إخفاء شاشة التحميل في النهاية والنزول للنتائج
        let loader = document.getElementById('ai-loader');
        if(loader) loader.style.display = 'none';
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
