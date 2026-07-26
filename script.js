// بيانات الأقسام
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

    // إضافة مستمعات للأحداث لجمع المجاميع تلقائياً
    document.querySelectorAll('.dept-male, .dept-female').forEach(input => {
        input.addEventListener('input', calculateTotals);
    });
}

function updateCounts() {
    const males = document.getElementById('maleNames').value.split('\n').filter(n => n.trim() !== '');
    const females = document.getElementById('femaleNames').value.split('\n').filter(n => n.trim() !== '');
    
    document.getElementById('maleCount').innerText = males.length;
    document.getElementById('femaleCount').innerText = females.length;
    updatePeriodSummary(); // تحديث الملخص والجدول التفصيلي
}

function calculateTotals() {
    let totalMale = 0;
    let totalFemale = 0;
    document.querySelectorAll('.dept-male').forEach(i => totalMale += (parseInt(i.value) || 0));
    document.querySelectorAll('.dept-female').forEach(i => totalFemale += (parseInt(i.value) || 0));
    
    document.getElementById('totalMaleInput').innerText = totalMale;
    document.getElementById('totalFemaleInput').innerText = totalFemale;
}

// عرض ملخص الفترات والجدول التفصيلي
function updatePeriodSummary() {
    const months = parseInt(document.getElementById('mandatoryMonths').value);
    const periodsCount = 12 / months;
    const totalMales = parseInt(document.getElementById('maleCount').innerText);
    const totalFemales = parseInt(document.getElementById('femaleCount').innerText);

    // [التعديل 1] حساب العدد الشهري بدلاً من فترة كاملة في النص التوضيحي
    const periodMale = Math.floor(totalMales / periodsCount);
    const periodFemale = Math.floor(totalFemales / periodsCount);
    const monthMale = Math.floor(periodMale / months);
    const monthFemale = Math.floor(periodFemale / months);

    let html = `<strong>معلومة:</strong> سيتم تقسيم الطلاب إلى <strong>${periodsCount} فترات</strong>، كل فترة مدتها <strong>${months} شهر</strong>.<br>`;
    html += `في كل شهر، سيتواجد تقريباً <strong>${monthMale} ذكور</strong> و <strong>${monthFemale} إناث</strong> للتوزيع على الأقسام.`;
    
    document.getElementById('periodSummaryContainer').innerHTML = html;

    // [إضافة] إنشاء الجدول التفصيلي لعدد الطلاب في كل شهر داخل كل فترة
    let tableHtml = `<table class="data-table mini-table">
                        <thead>
                            <tr>
                                <th>الفترة (Period)</th>
                                <th>الشهر داخل الفترة</th>
                                <th>عدد الذكور المتاح</th>
                                <th>عدد الإناث المتاح</th>
                            </tr>
                        </thead>
                        <tbody>`;
    
    // محاكاة حسابات الـ Math بالضبط كما تحدث في دالة التوزيع
    for (let p = 1; p <= periodsCount; p++) {
        // حساب نصيب هذه الفترة (توزيع باقي القسمة)
        let pMales = Math.floor(totalMales / periodsCount) + (p <= (totalMales % periodsCount) ? 1 : 0);
        let pFemales = Math.floor(totalFemales / periodsCount) + (p <= (totalFemales % periodsCount) ? 1 : 0);
        
        for (let m = 1; m <= months; m++) {
            // حساب نصيب هذا الشهر تحديداً (توزيع باقي القسمة داخل الفترة)
            let mMales = Math.floor(pMales / months) + (m <= (pMales % months) ? 1 : 0);
            let mFemales = Math.floor(pFemales / months) + (m <= (pFemales % months) ? 1 : 0);
            
            tableHtml += `<tr>`;
            if (m === 1) {
                tableHtml += `<td rowspan="${months}"><strong>الفترة ${p}</strong></td>`;
            }
            tableHtml += `<td>الشهر ${m}</td>
                          <td>${mMales}</td>
                          <td>${mFemales}</td>
                      </tr>`;
        }
    }
    tableHtml += `</tbody></table>`;
    
    // إظهار الجدول فقط إذا كان هناك بيانات
    if (totalMales > 0 || totalFemales > 0) {
        document.getElementById('detailedPeriodTable').innerHTML = tableHtml;
    } else {
        document.getElementById('detailedPeriodTable').innerHTML = '';
    }
}

// دالة الخلط العشوائي (Fisher-Yates)
function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

// دالة تقسيم مصفوفة إلى مجموعات (فترات) مع توزيع الفائض عشوائياً
function divideIntoPeriods(studentsArray, numPeriods) {
    let shuffled = shuffle([...studentsArray]);
    let periods = Array.from({ length: numPeriods }, () => []);
    
    let baseCount = Math.floor(shuffled.length / numPeriods);
    let remainder = shuffled.length % numPeriods;

    let currentIndex = 0;
    for (let i = 0; i < numPeriods; i++) {
        let extra = (remainder > 0) ? 1 : 0;
        let takeCount = baseCount + extra;
        
        periods[i] = shuffled.slice(currentIndex, currentIndex + takeCount);
        currentIndex += takeCount;
        remainder--;
    }
    return shuffle(periods);
}

// دالة توزيع السعة وتوزيع الفائض للأقسام
function getMonthlyCapacities(baseCapacities, targetTotalCount) {
    let caps = [...baseCapacities];
    let currentSum = caps.reduce((a, b) => a + b, 0);

    // توزيع الزيادة عشوائياً
    while (currentSum < targetTotalCount) {
        let randIdx = Math.floor(Math.random() * caps.length);
        caps[randIdx]++;
        currentSum++;
    }
    // تصحيح النقص
    while (currentSum > targetTotalCount) {
        let validIndices = caps.map((val, idx) => val > 0 ? idx : -1).filter(idx => idx !== -1);
        if (validIndices.length > 0) {
            let randIdx = validIndices[Math.floor(Math.random() * validIndices.length)];
            caps[randIdx]--;
            currentSum--;
        }
    }
    return caps;
}

// الخوارزمية الرئيسية للتوزيع
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

    let malePeriods = divideIntoPeriods(males, numPeriods);
    let femalePeriods = divideIntoPeriods(females, numPeriods);

    let html = '';
    let periodsActiveStudents = [];

    // التوزيع داخل كل فترة (الشهور والأقسام)
    for (let p = 0; p < numPeriods; p++) {
        let currentPeriodMales = malePeriods[p];
        let currentPeriodFemales = femalePeriods[p];
        
        periodsActiveStudents.push({ males: [...currentPeriodMales], females: [...currentPeriodFemales] });

        let history = {};
        currentPeriodMales.concat(currentPeriodFemales).forEach(student => history[student] = []);

        html += `<div class="result-section">
                    <h3>الفترة الإجبارية ${p + 1} (المدة: ${mandatoryMonths} شهر) - إجمالي: ${currentPeriodMales.length} ذكور، ${currentPeriodFemales.length} إناث</h3>
                    <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>الشهر</th>
                                ${departmentsList.map(d => `<th>${d}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>`;

        for (let m = 1; m <= mandatoryMonths; m++) {
            html += `<tr><td><strong>الشهر ${m}</strong></td>`;
            
            // [التعديل 2] حساب وتوزيع السعة المطلوبة لهذا الشهر تحديداً وليس الفترة بالكامل
            let targetMonthMales = Math.floor(currentPeriodMales.length / mandatoryMonths);
            let targetMonthFemales = Math.floor(currentPeriodFemales.length / mandatoryMonths);
            
            if (m <= currentPeriodMales.length % mandatoryMonths) targetMonthMales++;
            if (m <= currentPeriodFemales.length % mandatoryMonths) targetMonthFemales++;

            let monthMaleCaps = getMonthlyCapacities(baseMaleCaps, targetMonthMales);
            let monthFemaleCaps = getMonthlyCapacities(baseFemaleCaps, targetMonthFemales);

            let availableMales = shuffle([...currentPeriodMales]);
            let availableFemales = shuffle([...currentPeriodFemales]);

            departmentsList.forEach((dept, dIndex) => {
                let cellStudents = [];
                
                let neededMales = monthMaleCaps[dIndex];
                for (let i = 0; i < availableMales.length && neededMales > 0; i++) {
                    let student = availableMales[i];
                    if (!history[student].includes(dept)) {
                        cellStudents.push(student);
                        history[student].push(dept);
                        availableMales.splice(i, 1);
                        neededMales--;
                        i--; 
                    }
                }

                let neededFemales = monthFemaleCaps[dIndex];
                for (let i = 0; i < availableFemales.length && neededFemales > 0; i++) {
                    let student = availableFemales[i];
                    if (!history[student].includes(dept)) {
                        cellStudents.push(student);
                        history[student].push(dept);
                        availableFemales.splice(i, 1);
                        neededFemales--;
                        i--;
                    }
                }

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

    // --- توزيع أجهزة العلاج الكهربائي (منفصل) ---
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
        
        // [التعديل 3] مصفوفة عامة لمنع تكرار الطالب إطلاقاً طوال فترات التدريب
        let globalUsedElectroMales = [];
        let globalUsedElectroFemales = [];

        for (let p = 0; p < numPeriods; p++) {
            let poolMales = [...periodsActiveStudents[p].males];
            let poolFemales = [...periodsActiveStudents[p].females];

            for (let m = 1; m <= mandatoryMonths; m++) {
                html += `<tr><td><strong>الشهر ${absoluteMonth}</strong><br><small>(من الفترة ${p+1})</small></td>`;
                
                for (let w = 1; w <= 4; w++) {
                    let weekList = [];
                    
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
