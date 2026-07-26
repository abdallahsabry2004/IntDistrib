// --- Global State ---
window.globalDistributionPlan = { males: [], females: [] };

// بيانات الأقسام (Departments)
const departmentsList = [
    'قسم الباطنة', 'قسم الجراحة والحروق', 'قسم صحة المرأة', 
    'قسم العظام', 'قسم الأعصاب', 'قسم الأطفال', 'قسم (الحكيم)'
];

// الاستماع لتغييرات الأسماء لتحديث العداد
document.getElementById('maleNames').addEventListener('input', updateCounts);
document.getElementById('femaleNames').addEventListener('input', updateCounts);
document.getElementById('mandatoryMonths').addEventListener('change', updatePeriodSummary);

// بناء جدول إدخال سعة الأقسام
function buildDepartmentsTable() {
    const tbody = document.querySelector('#departmentsTable tbody');
    tbody.innerHTML = '';
    departmentsList.forEach((dept, index) => {
        tbody.innerHTML += `
            <tr>
                <td>${dept}</td>
                <td><input type="number" class="dept-male" data-index="${index}" value="0" min="0"></td>
                <td><input type="number" class="dept-female" data-index="${index}" value="0" min="0"></td>
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
    let totalMale = 0;
    let totalFemale = 0;
    document.querySelectorAll('.dept-male').forEach(i => totalMale += (parseInt(i.value) || 0));
    document.querySelectorAll('.dept-female').forEach(i => totalFemale += (parseInt(i.value) || 0));
    
    document.getElementById('totalMaleInput').innerText = totalMale;
    document.getElementById('totalFemaleInput').innerText = totalFemale;
}

// دالة الخلط العشوائي (Fisher-Yates Shuffle)
function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

// دالة لتوزيع العدد الكلي بشكل عشوائي على الفترات (Cohort Division)
function getRandomDistributedCounts(total, bins) {
    if (bins === 0) return [];
    let base = Math.floor(total / bins);
    let remainder = total % bins;
    let counts = Array(bins).fill(base);
    
    let indices = Array.from({ length: bins }, (_, i) => i);
    let shuffledIndices = shuffle(indices);
    
    for (let i = 0; i < remainder; i++) {
        counts[shuffledIndices[i]]++;
    }
    return counts;
}

// دالة توزيع الفائض على الأقسام شهرياً (استثناء الحكيم، وبحد أقصى +1 للقسم)
function distributeDepartmentSurplus(baseMaleCaps, baseFemaleCaps, targetMales, targetFemales) {
    let finalMaleCaps = [...baseMaleCaps];
    let finalFemaleCaps = [...baseFemaleCaps];
    
    let currentMaleSum = finalMaleCaps.reduce((a, b) => a + b, 0);
    let currentFemaleSum = finalFemaleCaps.reduce((a, b) => a + b, 0);
    
    let maleSurplus = targetMales - currentMaleSum;
    let femaleSurplus = targetFemales - currentFemaleSum;
    
    // الأقسام المتاحة للفائض (استثناء قسم الحكيم الاندكس 6)
    let eligibleIndices = [0, 1, 2, 3, 4, 5];
    
    if (maleSurplus > 0 || femaleSurplus > 0) {
        let safeCounter = 0;
        while ((maleSurplus > 0 || femaleSurplus > 0) && safeCounter < 50) {
            let shuffledIndices = shuffle([...eligibleIndices]);
            while ((maleSurplus > 0 || femaleSurplus > 0) && shuffledIndices.length > 0) {
                let randomDeptIdx = shuffledIndices.shift(); 
                
                if (maleSurplus > 0) {
                    finalMaleCaps[randomDeptIdx]++;
                    maleSurplus--;
                } else if (femaleSurplus > 0) {
                    finalFemaleCaps[randomDeptIdx]++;
                    femaleSurplus--;
                }
            }
            safeCounter++;
        }
    }
    
    // معالجة العجز (Deficit Processing) إذا اختار المستخدم الاستمرار
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

// دالة مساعدة لتسكين الطلاب بذكاء (Smart Assignment) لمنع التكرار
function assignStudentsToDepartmentsSmart(students, targetCaps, currentHistory) {
    let assignments = {};
    departmentsList.forEach(d => assignments[d] = []);
    let newHistory = JSON.parse(JSON.stringify(currentHistory)); // نسخة مؤقتة
    let caps = [...targetCaps];
    
    let shuffledStudents = shuffle([...students]);
    let failed = false;

    for (let student of shuffledStudents) {
        let validIndices = [];
        caps.forEach((cap, idx) => {
            // القسم صالح لو فيه سعة، والطالب مدخلوش قبل كده في الفترة دي
            if (cap > 0 && !newHistory[student].includes(departmentsList[idx])) {
                validIndices.push(idx);
            }
        });

        if (validIndices.length === 0) {
            failed = true;
            break;
        }

        // اختيار قسم عشوائي من الأقسام الصالحة للطالب
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

    window.globalDistributionPlan = { males: [], females: [] };

    let periodMaleCounts = getRandomDistributedCounts(totalMales, periodsCount);
    let periodFemaleCounts = getRandomDistributedCounts(totalFemales, periodsCount);

    let tableHtml = `<table class="data-table mini-table">
                        <thead>
                            <tr>
                                <th>الفترة (Cohort)</th>
                                <th>عدد الشهور بداخلها</th>
                                <th>عدد الذكور (بكل شهر)</th>
                                <th>عدد الإناث (بكل شهر)</th>
                            </tr>
                        </thead>
                        <tbody>`;
    
    for (let p = 1; p <= periodsCount; p++) {
        let pMales = periodMaleCounts[p - 1];
        let pFemales = periodFemaleCounts[p - 1];
        
        // حفظ الخطة (العدد بالكامل يشارك كل شهر في الفترة)
        window.globalDistributionPlan.males.push(pMales);
        window.globalDistributionPlan.females.push(pFemales);

        tableHtml += `<tr>
                        <td><strong>الفترة ${p}</strong></td>
                        <td>${months} شهور</td>
                        <td>${pMales} طالب</td>
                        <td>${pFemales} طالبة</td>
                      </tr>`;
    }
    tableHtml += `</tbody></table>`;
    
    let html = `<strong>معلومة:</strong> سيتم تقسيم الدفعة إلى <strong>${periodsCount} مجموعات (Cohorts)</strong> مغلقة.<br>`;
    html += `كل مجموعة ستقضي <strong>${months} شهور</strong> متتالية. جميع طلاب المجموعة متواجدون في كل شهر من شهور فترتهم ولكن في أقسام مختلفة.`;
    
    document.getElementById('periodSummaryContainer').innerHTML = html;

    if (totalMales > 0 || totalFemales > 0) {
        document.getElementById('detailedPeriodTable').innerHTML = tableHtml;
    } else {
        document.getElementById('detailedPeriodTable').innerHTML = '';
    }
}

// الخوارزمية الرئيسية للتوزيع (Main Generation)
function generateDistribution() {
    const males = document.getElementById('maleNames').value.split('\n').filter(n => n.trim() !== '');
    const females = document.getElementById('femaleNames').value.split('\n').filter(n => n.trim() !== '');
    const mandatoryMonths = parseInt(document.getElementById('mandatoryMonths').value);
    const numPeriods = 12 / mandatoryMonths;

    if (males.length === 0 && females.length === 0) {
        alert("يرجى إدخال أسماء الطلاب أولاً.");
        return;
    }

    let baseMaleCaps = Array.from(document.querySelectorAll('.dept-male')).map(inp => parseInt(inp.value) || 0);
    let baseFemaleCaps = Array.from(document.querySelectorAll('.dept-female')).map(inp => parseInt(inp.value) || 0);

    // --- نظام التحقق (Validation System) ---
    let sumMaleCaps = baseMaleCaps.reduce((a, b) => a + b, 0);
    let sumFemaleCaps = baseFemaleCaps.reduce((a, b) => a + b, 0);
    let cohortMinMales = Math.floor(males.length / numPeriods);
    let cohortMinFemales = Math.floor(females.length / numPeriods);

    if (sumMaleCaps > cohortMinMales || sumFemaleCaps > cohortMinFemales) {
        let confirmMsg = `⚠️ تنبيه هام: الأعداد المطلوبة للأقسام تفوق عدد الطلاب المتاحين في المجموعة الواحدة!\n\n` +
                         `📌 المتاح فعلياً في الفترة الواحدة:\n` +
                         `- ذكور: ${cohortMinMales} | إناث: ${cohortMinFemales}\n\n` +
                         `❓ هل تريد الاستمرار وإكمال التوزيع (سيتم تقليل الأعداد عشوائياً)؟`;
        if (!confirm(confirmMsg)) return; 
    }

    // بناء المجموعات (Cohorts) بناءً على الخطة المحفوظة
    let malePeriods = [];
    let femalePeriods = [];
    let shuffledMales = shuffle([...males]);
    let shuffledFemales = shuffle([...females]);
    
    let mIdx = 0, fIdx = 0;
    for (let i = 0; i < numPeriods; i++) {
        let pMalesCount = window.globalDistributionPlan.males[i];
        let pFemalesCount = window.globalDistributionPlan.females[i];

        malePeriods.push(shuffledMales.slice(mIdx, mIdx + pMalesCount));
        mIdx += pMalesCount;
        
        femalePeriods.push(shuffledFemales.slice(fIdx, fIdx + pFemalesCount));
        fIdx += pFemalesCount;
    }

    let html = '';
    let periodsActiveStudents = [];

    // التوزيع داخل كل فترة (Rotation Loop)
    for (let p = 0; p < numPeriods; p++) {
        let cohortMales = malePeriods[p];
        let cohortFemales = femalePeriods[p];
        
        periodsActiveStudents.push({ males: [...cohortMales], females: [...cohortFemales] });

        let history = {};
        cohortMales.concat(cohortFemales).forEach(student => history[student] = []);

        html += `<div class="result-section">
                    <h3>الفترة الإجبارية ${p + 1} (المدة: ${mandatoryMonths} شهر) - إجمالي: ${cohortMales.length} ذكور، ${cohortFemales.length} إناث</h3>
                    <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>الشهر</th>
                                ${departmentsList.map(d => `<th>${d}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>`;

        // لفة الشهور: نفس المجموعة (Cohort) توزع بالكامل كل شهر
        for (let m = 1; m <= mandatoryMonths; m++) {
            html += `<tr><td><strong>الشهر ${m}</strong></td>`;
            
            let adjustedCaps = distributeDepartmentSurplus(baseMaleCaps, baseFemaleCaps, cohortMales.length, cohortFemales.length);
            let monthMaleCaps = adjustedCaps.males;
            let monthFemaleCaps = adjustedCaps.females;

            // محاولة تسكين الذكور بذكاء (مع محاولات إعادة في حالة وجود Block)
            let maleAssignmentResult;
            for(let attempt=0; attempt<50; attempt++) {
                maleAssignmentResult = assignStudentsToDepartmentsSmart(cohortMales, monthMaleCaps, history);
                if(maleAssignmentResult.success) break;
            }
            // محاولة تسكين الإناث
            let femaleAssignmentResult;
            for(let attempt=0; attempt<50; attempt++) {
                femaleAssignmentResult = assignStudentsToDepartmentsSmart(cohortFemales, monthFemaleCaps, maleAssignmentResult.success ? maleAssignmentResult.history : history);
                if(femaleAssignmentResult.success) break;
            }

            if (maleAssignmentResult.success && femaleAssignmentResult.success) {
                history = femaleAssignmentResult.history; // اعتماد الـ History الجديد
            }

            departmentsList.forEach(dept => {
                let cellStudents = [];
                if(maleAssignmentResult.success) cellStudents.push(...maleAssignmentResult.assignments[dept]);
                if(femaleAssignmentResult.success) cellStudents.push(...femaleAssignmentResult.assignments[dept]);

                if (cellStudents.length > 0) {
                    html += `<td><ol class="student-list"><li>${cellStudents.join('</li><li>')}</li></ol></td>`;
                } else {
                    html += `<td>-</td>`;
                }
            });
            html += `</tr>`;
        }
        html += `</tbody></table></div></div>`;
    }

    // --- توزيع أجهزة العلاج الكهربائي (Electrotherapy Isolation) ---
    const electroMaleReq = parseInt(document.getElementById('electroMale').value) || 0;
    const electroFemaleReq = parseInt(document.getElementById('electroFemale').value) || 0;

    if (electroMaleReq > 0 || electroFemaleReq > 0) {
        html += `<div class="result-section" style="page-break-before: always;">
                    <h3>توزيع مسؤولي العلاج الكهربائي (أسبوعياً)</h3>
                    <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>الشهر العام</th>
                                <th>الأسبوع الأول</th>
                                <th>الأسبوع الثاني</th>
                                <th>الأسبوع الثالث</th>
                                <th>الأسبوع الرابع</th>
                            </tr>
                        </thead>
                        <tbody>`;

        let absoluteMonth = 1;
        let globalUsedElectroMales = [];
        let globalUsedElectroFemales = [];

        for (let p = 0; p < numPeriods; p++) {
            let poolMales = [...periodsActiveStudents[p].males];
            let poolFemales = [...periodsActiveStudents[p].females];

            for (let m = 1; m <= mandatoryMonths; m++) {
                html += `<tr><td><strong>الشهر ${absoluteMonth}</strong><br><small>(من الفترة ${p+1})</small></td>`;
                
                for (let w = 1; w <= 4; w++) {
                    let weekList = [];
                    
                    // اختيار مسؤولي العلاج الكهربائي باشتراط عدم التكرار طوال الـ 12 شهر
                    let availM = shuffle(poolMales.filter(s => !globalUsedElectroMales.includes(s)));
                    let pickedM = availM.slice(0, electroMaleReq);
                    globalUsedElectroMales.push(...pickedM);
                    weekList.push(...pickedM);

                    let availF = shuffle(poolFemales.filter(s => !globalUsedElectroFemales.includes(s)));
                    let pickedF = availF.slice(0, electroFemaleReq);
                    globalUsedElectroFemales.push(...pickedF);
                    weekList.push(...pickedF);

                    if (weekList.length > 0) {
                        html += `<td><ol class="student-list"><li>${weekList.join('</li><li>')}</li></ol></td>`;
                    } else {
                        html += `<td>-</td>`;
                    }
                }
                html += `</tr>`;
                absoluteMonth++;
            }
        }
        html += `</tbody></table></div></div>`;
    }

    document.getElementById('resultsContainer').innerHTML = html;
    document.getElementById('printActions').style.display = 'block';
    document.getElementById('printArea').scrollIntoView({ behavior: 'smooth' });
}

window.onload = () => {
    buildDepartmentsTable();
};
