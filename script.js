// ============================================================================
// المتغيرات العامة (Global State)
// ============================================================================
window.globalDistributionPlan = { males: [], females: [] };
window.lastDistributionData = [];
window.publicHolidays = [];

const departmentsList = [
    'قسم الباطنة', 'قسم الجراحة والحروق', 'قسم صحة المرأة', 
    'قسم العظام', 'قسم الأعصاب', 'قسم الأطفال', 'قسم (الحكيم)'
];
const arabicMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

// الاستماع لتغييرات الأسماء لتحديث العداد
document.getElementById('maleNames').addEventListener('input', updateCounts);
document.getElementById('femaleNames').addEventListener('input', updateCounts);
document.getElementById('mandatoryMonths').addEventListener('change', updatePeriodSummary);
document.getElementById('workMode').addEventListener('change', updatePeriodSummary);
document.getElementById('enableAllocator').addEventListener('change', function() {
    document.getElementById('allocatorSettings').style.display = this.checked ? 'block' : 'none';
});

// ============================================================================
// دوال واجهة المستخدم (UI Functions)
// ============================================================================
function buildDepartmentsTable() {
    const tbody = document.querySelector('#departmentsTable tbody');
    tbody.innerHTML = '';
    departmentsList.forEach((dept, index) => {
        let maxInput = dept === 'قسم (الحكيم)' ? '<span style="color:gray;">مستثنى</span>' : `<input type="number" class="dept-electro-max" data-index="${index}" placeholder="لا حد أقصى">`;
        tbody.innerHTML += `
            <tr>
                <td>${dept}</td>
                <td><input type="number" class="dept-male" data-index="${index}" value="0" min="0"></td>
                <td><input type="number" class="dept-female" data-index="${index}" value="0" min="0"></td>
                <td>${maxInput}</td>
            </tr>
        `;
    });
    document.querySelectorAll('.dept-male, .dept-female').forEach(input => {
        input.addEventListener('input', calculateTotals);
    });
}

function updateCounts() {
    const males = document.getElementById('maleNames').value.split('\n').filter(n => n.trim() !== '');
    const females = document.getElementById('femaleNames').value.split('\n').filter(n => n.trim() !== '');
    document.getElementById('maleCount').innerText = males.length;
    document.getElementById('femaleCount').innerText = females.length;
    updatePeriodSummary(); 
}

function calculateTotals() {
    let totalMale = 0, totalFemale = 0;
    document.querySelectorAll('.dept-male').forEach(i => totalMale += (parseInt(i.value) || 0));
    document.querySelectorAll('.dept-female').forEach(i => totalFemale += (parseInt(i.value) || 0));
    document.getElementById('totalMaleInput').innerText = totalMale;
    document.getElementById('totalFemaleInput').innerText = totalFemale;
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
    let eligibleIndices = [0, 1, 2, 3, 4, 5]; // الحكيم مستثنى
    
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

function assignStudentsToDepartmentsSmart(students, targetCaps, currentHistory) {
    let assignments = {};
    departmentsList.forEach(d => assignments[d] = []);
    let newHistory = JSON.parse(JSON.stringify(currentHistory));
    let caps = [...targetCaps];
    let shuffledStudents = shuffle([...students]);
    let failed = false;

    for (let student of shuffledStudents) {
        let validIndices = [];
        caps.forEach((cap, idx) => {
            if (cap > 0 && !newHistory[student].includes(departmentsList[idx])) {
                validIndices.push(idx);
            }
        });
        if (validIndices.length === 0) { failed = true; break; }
        let chosenIdx = validIndices[Math.floor(Math.random() * validIndices.length)];
        let chosenDept = departmentsList[chosenIdx];
        caps[chosenIdx]--;
        assignments[chosenDept].push(student);
        newHistory[student].push(chosenDept);
    }
    return { success: !failed, assignments: assignments, history: newHistory };
}

// عرض ملخص الفترات 
function updatePeriodSummary() {
    const months = parseInt(document.getElementById('mandatoryMonths').value);
    const periodsCount = 12 / months;
    const totalMales = parseInt(document.getElementById('maleCount').innerText);
    const totalFemales = parseInt(document.getElementById('femaleCount').innerText);
    const workMode = document.getElementById('workMode').value;
    
    window.globalDistributionPlan = { males: [], females: [] };
    let periodMaleCounts = getRandomDistributedCounts(totalMales, periodsCount);
    let periodFemaleCounts = getRandomDistributedCounts(totalFemales, periodsCount);

    let html = `<strong>معلومة:</strong> سيتم تقسيم الدفعة إلى <strong>${periodsCount} فترات</strong>.<br>`;
    if (workMode !== 'full') {
        html += `<strong style="color:red;">تنبيه نظام 3 أيام:</strong> كل فترة سيتم قسمتها داخلياً إلى مجموعتي عمل (أ، ب).<br>الأعداد المطلوبة في الأقسام سيتم تطبيقها بالكامل على مجموعة (أ) وعلى مجموعة (ب) بشكل منفصل.`;
    }
    document.getElementById('periodSummaryContainer').innerHTML = html;

    let tableHtml = `<table class="data-table mini-table">
                        <thead><tr><th>الفترة</th><th>ذكور (بكل شهر)</th><th>إناث (بكل شهر)</th></tr></thead><tbody>`;
    for (let p = 1; p <= periodsCount; p++) {
        let pMales = periodMaleCounts[p - 1];
        let pFemales = periodFemaleCounts[p - 1];
        window.globalDistributionPlan.males.push(pMales);
        window.globalDistributionPlan.females.push(pFemales);
        tableHtml += `<tr><td>الفترة ${p}</td><td>${pMales}</td><td>${pFemales}</td></tr>`;
    }
    tableHtml += `</tbody></table>`;
    document.getElementById('detailedPeriodTable').innerHTML = (totalMales > 0 || totalFemales > 0) ? tableHtml : '';
}

// جلب الإجازات من الـ API
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

// اختيار مسؤولي العلاج الكهربائي باحترام القيود
function pickElectroStudents(pool, requiredCount, usedGlobal, monthAssignments, maxCapsArray) {
    let available = pool.filter(s => !usedGlobal.includes(s));
    let validAvailable = available.filter(s => {
        let dept = monthAssignments[s];
        if (dept === 'قسم (الحكيم)') return false;
        let deptIdx = departmentsList.indexOf(dept);
        let cap = maxCapsArray[deptIdx];
        if (cap === 0) return false; // ممنوع الاختيار من القسم ده
        return true;
    });

    if (validAvailable.length < requiredCount) return null; // العدد المتاح أقل من المطلوب

    let picked = [];
    let deptCounts = {};
    departmentsList.forEach(d => deptCounts[d] = 0);

    let byDept = {};
    departmentsList.forEach(d => byDept[d] = []);
    validAvailable.forEach(s => byDept[monthAssignments[s]].push(s));

    let attempts = 0;
    while (picked.length < requiredCount && attempts < 100) {
        attempts++;
        let deptsWithAvailable = departmentsList.filter(d => 
            byDept[d].length > 0 && 
            (maxCapsArray[departmentsList.indexOf(d)] === -1 || deptCounts[d] < maxCapsArray[departmentsList.indexOf(d)])
        );
        
        if (requiredCount > 1 && picked.length > 0) {
            let lastDept = monthAssignments[picked[picked.length - 1]];
            if (deptsWithAvailable.length > 1) {
                deptsWithAvailable = deptsWithAvailable.filter(d => d !== lastDept || deptsWithAvailable.length === 1);
            }
        }

        if (deptsWithAvailable.length === 0) break;

        let randDept = deptsWithAvailable[Math.floor(Math.random() * deptsWithAvailable.length)];
        let student = shuffle(byDept[randDept]).pop();
        picked.push(student);
        deptCounts[randDept]++;
    }

    if (picked.length < requiredCount) return null;
    return picked;
}

// ============================================================================
// الخوارزمية الرئيسية (Main Generation) مع نظام التحقق الذكي (Smart Validation)
// ============================================================================
async function generateDistribution() {
    const males = document.getElementById('maleNames').value.split('\n').filter(n => n.trim() !== '');
    const females = document.getElementById('femaleNames').value.split('\n').filter(n => n.trim() !== '');
    const mandatoryMonths = parseInt(document.getElementById('mandatoryMonths').value);
    const startMonthIdx = parseInt(document.getElementById('startMonth').value);
    const workMode = document.getElementById('workMode').value;
    const is3Days = workMode !== 'full';
    const numPeriods = 12 / mandatoryMonths;

    if (males.length === 0 && females.length === 0) { alert("أدخل أسماء الطلاب أولاً."); return; }

    let baseMaleCaps = Array.from(document.querySelectorAll('.dept-male')).map(inp => parseInt(inp.value) || 0);
    let baseFemaleCaps = Array.from(document.querySelectorAll('.dept-female')).map(inp => parseInt(inp.value) || 0);
    let electroMaxCaps = Array.from(document.querySelectorAll('.dept-electro-max')).map(inp => {
        if(inp.value === "") return -1; 
        return parseInt(inp.value);
    });
    electroMaxCaps[6] = 0; 

    // --- Smart Validation Block 1: Department Capacity ---
    let sumMaleCaps = baseMaleCaps.reduce((a, b) => a + b, 0);
    let sumFemaleCaps = baseFemaleCaps.reduce((a, b) => a + b, 0);
    let cohortMinMales = Math.floor(males.length / numPeriods);
    let cohortMinFemales = Math.floor(females.length / numPeriods);
    
    let requiredMalesCheck = is3Days ? sumMaleCaps * 2 : sumMaleCaps;
    let requiredFemalesCheck = is3Days ? sumFemaleCaps * 2 : sumFemaleCaps;

    if (requiredMalesCheck > cohortMinMales || requiredFemalesCheck > cohortMinFemales) {
        let deficitDetails = [];
        if (requiredMalesCheck > cohortMinMales) deficitDetails.push(`- ذكور: مطلوب (${requiredMalesCheck}) متاح (${cohortMinMales})`);
        if (requiredFemalesCheck > cohortMinFemales) deficitDetails.push(`- إناث: مطلوب (${requiredFemalesCheck}) متاح (${cohortMinFemales})`);
        
        let msg = `⚠️ [تحليل النظام: عجز في سعة الأقسام]\n\n`;
        msg += `🔍 الحالة:\nالأعداد المطلوبة للأقسام تفوق عدد الطلاب المتاحين في الفترة الإجبارية.\n\n`;
        msg += `📊 التفاصيل:\n${deficitDetails.join('\n')}\n\n`;
        msg += `💡 السبب:\nإما أن عدد الدفعة قليل، أو أن نظام (3 أيام) يضاعف الاحتياج لتغطية المجموعتين (أ، ب).\n\n`;
        msg += `✅ الحلول:\n1. تقليل الأعداد المطلوبة في الأقسام.\n2. زيادة عدد الدفعة.\n\n`;
        msg += `❓ هل تريد إجبار النظام على الإكمال؟ (سيتم تقليل الأعداد عشوائياً لسد العجز)`;
        
        if (!confirm(msg)) return;
    }

    let isAllocator = document.getElementById('enableAllocator').checked;
    if (isAllocator) {
        let year = new Date().getFullYear();
        window.publicHolidays = [...await fetchPublicHolidays(year), ...await fetchPublicHolidays(year + 1)];
    }

    let malePeriods = [], femalePeriods = [];
    let shuffledMales = shuffle([...males]), shuffledFemales = shuffle([...females]);
    let mIdx = 0, fIdx = 0;
    
    for (let i = 0; i < numPeriods; i++) {
        let pMalesCount = window.globalDistributionPlan.males[i];
        let pFemalesCount = window.globalDistributionPlan.females[i];
        malePeriods.push(shuffledMales.slice(mIdx, mIdx + pMalesCount));
        femalePeriods.push(shuffledFemales.slice(fIdx, fIdx + pFemalesCount));
        mIdx += pMalesCount; fIdx += pFemalesCount;
    }

    let html = '';
    window.lastDistributionData = [];
    
    const electroMaleReq = parseInt(document.getElementById('electroMale').value) || 0;
    const electroFemaleReq = parseInt(document.getElementById('electroFemale').value) || 0;
    let globalUsedElectroMales = [], globalUsedElectroFemales = [];

    let allocMaleReq = parseInt(document.getElementById('allocMale').value) || 0;
    let allocFemaleReq = parseInt(document.getElementById('allocFemale').value) || 0;
    let allocCycle = parseInt(document.getElementById('allocCycle').value) || 1;
    let allocWeekends = document.getElementById('allocWeekend').value.split(',').map(Number);
    let allocStart = document.getElementById('allocStartDate').value ? new Date(document.getElementById('allocStartDate').value) : null;

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

        periodGroups.forEach(group => {
            html += `<h4>توزيع الأقسام: ${group.name}</h4><div class="table-responsive"><table class="data-table"><thead><tr><th>الشهر</th>${departmentsList.map(d=>`<th>${d}</th>`).join('')}</tr></thead><tbody>`;
            
            let history = {};
            group.m.concat(group.f).forEach(s => history[s] = []);
            let groupSchedules = [];

            for (let m = 1; m <= mandatoryMonths; m++) {
                let mName = arabicMonths[(startMonthIdx + periodStartAbsolute + m - 1) % 12];
                html += `<tr><td><strong>الشهر ${m} (${mName})</strong></td>`;
                
                let adjustedCaps = distributeDepartmentSurplus(baseMaleCaps, baseFemaleCaps, group.m.length, group.f.length);
                let maleAssignment, femaleAssignment;
                
                for(let attempt=0; attempt<50; attempt++) { maleAssignment = assignStudentsToDepartmentsSmart(group.m, adjustedCaps.males, history); if(maleAssignment.success) break; }
                for(let attempt=0; attempt<50; attempt++) { femaleAssignment = assignStudentsToDepartmentsSmart(group.f, adjustedCaps.females, maleAssignment.success ? maleAssignment.history : history); if(femaleAssignment.success) break; }
                if (maleAssignment.success && femaleAssignment.success) history = femaleAssignment.history;

                let monthAssignments = {}; 
                departmentsList.forEach(dept => {
                    let cellStudents = [];
                    if(maleAssignment.success) { cellStudents.push(...maleAssignment.assignments[dept]); maleAssignment.assignments[dept].forEach(s => monthAssignments[s] = dept); }
                    if(femaleAssignment.success) { cellStudents.push(...femaleAssignment.assignments[dept]); femaleAssignment.assignments[dept].forEach(s => monthAssignments[s] = dept); }
                    html += `<td>${cellStudents.length > 0 ? `<ol class="student-list"><li>${cellStudents.join('</li><li>')}</li></ol>` : '-'}</td>`;
                });
                groupSchedules.push(monthAssignments);
                html += `</tr>`;
            }
            monthlySchedules.push({ groupName: group.name, schedules: groupSchedules, m: group.m, f: group.f });
            html += `</tbody></table></div>`;
        });

        // ----------------- العلاج الكهربائي -----------------
        if (electroMaleReq > 0 || electroFemaleReq > 0) {
            html += `<h4 style="margin-top:20px; color:var(--primary);">توزيع مسؤولي العلاج الكهربائي (الفترة ${p + 1})</h4>`;
            
            for (let gInfo of monthlySchedules) {
                html += `<h5>${gInfo.groupName}</h5><div class="table-responsive"><table class="data-table"><thead><tr><th>الشهر</th><th>الدورة الأولى</th><th>الدورة الثانية</th><th>الدورة الثالثة</th><th>الدورة الرابعة</th></tr></thead><tbody>`;
                
                for (let m = 1; m <= mandatoryMonths; m++) {
                    let mName = arabicMonths[(startMonthIdx + periodStartAbsolute + m - 1) % 12];
                    html += `<tr><td><strong>الشهر ${m} (${mName})</strong></td>`;
                    let monthAssig = gInfo.schedules[m-1];

                    for (let w = 1; w <= 4; w++) {
                        let pickedM = pickElectroStudents(gInfo.m, electroMaleReq, globalUsedElectroMales, monthAssig, electroMaxCaps);
                        let pickedF = pickElectroStudents(gInfo.f, electroFemaleReq, globalUsedElectroFemales, monthAssig, electroMaxCaps);
                        
                        // --- Smart Validation Block 2: Electrotherapy Constraints ---
                        if ((!pickedM && electroMaleReq > 0) || (!pickedF && electroFemaleReq > 0)) {
                            let typeStr = (!pickedM) ? 'ذكور' : 'إناث';
                            let reqStr = (!pickedM) ? electroMaleReq : electroFemaleReq;
                            let msg = `⚠️ [تحليل النظام: فشل تسكين العلاج الكهربائي - ${typeStr}]\n\n`;
                            msg += `🔍 الحالة:\nلم يتمكن النظام من إيجاد (${reqStr}) طلاب في الدورة (${w}) لشهر (${mName}) في (${gInfo.groupName}).\n\n`;
                            msg += `💡 السبب:\nالقيود التي حددتها (الحد الأقصى للأقسام) منعت تجميع العدد، أو أن كل الطلاب متاحين في (قسم الحكيم المستثنى)، أو تم استنفاذ الطلاب بالكامل.\n\n`;
                            msg += `✅ الحلول:\n1. قم بزيادة (الحد الأقصى) المسموح به للأقسام.\n2. قلل العدد المطلوب أسبوعياً.\n\n`;
                            msg += `العملية توقفت. يرجى تعديل الإعدادات والمحاولة مجدداً.`;
                            alert(msg);
                            return;
                        }
                        
                        let weekList = [];
                        if (pickedM) { globalUsedElectroMales.push(...pickedM); weekList.push(...pickedM); }
                        if (pickedF) { globalUsedElectroFemales.push(...pickedF); weekList.push(...pickedF); }
                        
                        html += `<td>${weekList.length > 0 ? `<ol class="student-list"><li>${weekList.join('</li><li>')}</li></ol>` : '-'}</td>`;
                    }
                    html += `</tr>`;
                }
                html += `</tbody></table></div>`;
            }
        }

        // ----------------- جدول الـ Allocator -----------------
        if (isAllocator && allocStart) {
            html += `<h4 style="margin-top:20px; color:#16a34a;">توزيع مسؤولي التاريخ المرضي Allocator (الفترة ${p + 1})</h4>`;
            
            let allocatorCurrentDate = new Date(allocStart);
            allocatorCurrentDate.setMonth(allocatorCurrentDate.getMonth() + (p * mandatoryMonths));

            for (let gInfo of monthlySchedules) {
                html += `<h5>${gInfo.groupName}</h5><div class="table-responsive"><table class="data-table"><thead><tr><th>التاريخ</th><th>مسؤولو التاريخ المرضي</th><th>ملاحظات</th></tr></thead><tbody>`;
                
                let usedAllocators = [];
                let daysAssigned = 0;
                let maxDays = mandatoryMonths * 30; 
                let safety = 0;

                while (daysAssigned < maxDays && safety < 100) {
                    safety++;
                    let dateString = allocatorCurrentDate.toISOString().split('T')[0];
                    let isWeekend = allocWeekends.includes(allocatorCurrentDate.getDay());
                    let holiday = window.publicHolidays.find(h => h.date === dateString);
                    
                    if (isWeekend || holiday) {
                        html += `<tr style="background:#f1f5f9;"><td>${dateString}</td><td colspan="2">${holiday ? 'إجازة رسمية: ' + holiday.name : 'عطلة أسبوعية'}</td></tr>`;
                        allocatorCurrentDate.setDate(allocatorCurrentDate.getDate() + 1);
                        continue;
                    }

                    let monthIdx = Math.floor(daysAssigned / 30) % mandatoryMonths;
                    let monthAssig = gInfo.schedules[monthIdx];
                    
                    let availM = shuffle(gInfo.m.filter(s => !usedAllocators.includes(s) && monthAssig[s] !== 'قسم (الحكيم)' && !globalUsedElectroMales.includes(s)));
                    let availF = shuffle(gInfo.f.filter(s => !usedAllocators.includes(s) && monthAssig[s] !== 'قسم (الحكيم)' && !globalUsedElectroFemales.includes(s)));
                    
                    let pickedM = availM.slice(0, allocMaleReq);
                    let pickedF = availF.slice(0, allocFemaleReq);
                    let picked = [...pickedM, ...pickedF];
                    
                    // --- Smart Validation Block 3: Allocator Deficit ---
                    if (picked.length < (allocMaleReq + allocFemaleReq)) {
                        let msg = `⚠️ [تحليل النظام: عجز في الـ Allocator]\n\n`;
                        msg += `🔍 الحالة:\nالطلاب المتاحين في دورة (${dateString}) غير كافين لتغطية المطلوب.\n\n`;
                        msg += `💡 السبب:\nمعظم الطلاب محجوزين في "قسم الحكيم" أو مسجلين كـ "علاج كهربائي"، أو تم استهلاكهم بالكامل في دورات الـ Allocator السابقة.\n\n`;
                        msg += `✅ الحلول:\n1. تقليل العدد المطلوب للـ Allocator.\n2. زيادة أيام تجديد القائمة لتقليل استهلاك الطلاب السريع.\n\n`;
                        msg += `❓ هل تريد إكمال التوزيع وترك باقي الأيام فارغة؟`;
                        
                        if (confirm(msg)) { break; } else { return; }
                    }

                    usedAllocators.push(...picked);
                    
                    let endDate = new Date(allocatorCurrentDate);
                    endDate.setDate(endDate.getDate() + allocCycle - 1);
                    html += `<tr><td>من ${dateString} <br>إلى ${endDate.toISOString().split('T')[0]}</td><td><ol class="student-list"><li>${picked.join('</li><li>')}</li></ol></td><td>دورة ${allocCycle} أيام</td></tr>`;
                    
                    allocatorCurrentDate.setDate(allocatorCurrentDate.getDate() + allocCycle);
                    daysAssigned += allocCycle;
                }
                
                // Smart Output: الفائض المتبقي
                let unassigned = [...gInfo.m, ...gInfo.f].filter(s => !usedAllocators.includes(s) && gInfo.schedules[0][s] !== 'قسم (الحكيم)');
                if (unassigned.length > 0) {
                    html += `<tr style="background:#fef2f2;"><td colspan="3"><strong style="color:red;">تحليل: فائض لم يتم توزيعه (${unassigned.length} طلاب)</strong><br><small>لم يتم استهلاكهم في الـ Allocator:</small> ${unassigned.join(' ، ')}</td></tr>`;
                }

                html += `</tbody></table></div>`;
            }
        }
        html += `</div>`;
    }

    document.getElementById('resultsContainer').innerHTML = html;
    document.getElementById('printActions').style.display = 'flex';
    document.getElementById('printArea').scrollIntoView({ behavior: 'smooth' });
}

// ============================================================================
// دوال الطباعة والتصدير (Print & Export) - لا يوجد تعديلات هنا
// ============================================================================
function printAdminTable() {
    if (window.lastDistributionData.length === 0) { alert("يرجى إنشاء التوزيع أولاً!"); return; }
    const startMonthIdx = parseInt(document.getElementById('startMonth').value);
    let adminHtml = `<html><head><title>كشف أسماء طلاب الامتياز</title><style>
        body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th, td { border: 1px solid #000; padding: 10px; text-align: center; }
        th { background-color: #f3f4f6; }
        h2 { text-align: center; margin-bottom: 20px; page-break-after: avoid; }
        h3 { color: #1e3a8a; page-break-after: avoid; }
        .period-section { page-break-inside: avoid; page-break-after: always; }
        .period-section:last-child { page-break-after: auto; }
    </style></head><body><h2>كشف أسماء الطلاب الموزعين (شئون الامتياز)</h2>`;

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
    printWin.document.write(adminHtml);
    printWin.document.close();
    printWin.focus();
    printWin.onload = function() { printWin.print(); };
    printWin.onafterprint = function() { printWin.close(); };
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
    + document.getElementById('resultsContainer').innerHTML + `</div></body></html>`;
    
    let blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    let url = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(html);
    let downloadLink = document.createElement("a");
    document.body.appendChild(downloadLink);
    downloadLink.href = url; downloadLink.download = 'التوزيع_النهائي_للامتياز.doc'; downloadLink.click();
    document.body.removeChild(downloadLink);
}

function exportAdminToWord() {
    if (window.lastDistributionData.length === 0) { alert("يرجى إنشاء التوزيع أولاً!"); return; }
    const startMonthIdx = parseInt(document.getElementById('startMonth').value);
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
    <head><meta charset='utf-8'><title>كشف شئون الامتياز</title>${css}</head><body><div class="WordSection1"><h2>كشف أسماء الطلاب الموزعين (شئون الامتياز)</h2>`;
    
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
    const startMonthIdx = parseInt(document.getElementById('startMonth').value);
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
