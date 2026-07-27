// --- Global State ---
window.globalDistributionPlan = { males: [], females: [] };
window.lastDistributionData = []; // لحفظ البيانات لاستخدامها في طباعة شئون الامتياز

// بيانات الأقسام وأسماء الشهور
const departmentsList = [
    'قسم الباطنة', 'قسم الجراحة والحروق', 'قسم صحة المرأة', 
    'قسم العظام', 'قسم الأعصاب', 'قسم الأطفال', 'قسم (الحكيم)'
];
const arabicMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

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

        if (validIndices.length === 0) {
            failed = true;
            break;
        }

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

// الخوارزمية الرئيسية للتوزيع
function generateDistribution() {
    const males = document.getElementById('maleNames').value.split('\n').filter(n => n.trim() !== '');
    const females = document.getElementById('femaleNames').value.split('\n').filter(n => n.trim() !== '');
    const mandatoryMonths = parseInt(document.getElementById('mandatoryMonths').value);
    const startMonthIdx = parseInt(document.getElementById('startMonth').value);
    const numPeriods = 12 / mandatoryMonths;

    if (males.length === 0 && females.length === 0) {
        alert("يرجى إدخال أسماء الطلاب أولاً.");
        return;
    }

    let baseMaleCaps = Array.from(document.querySelectorAll('.dept-male')).map(inp => parseInt(inp.value) || 0);
    let baseFemaleCaps = Array.from(document.querySelectorAll('.dept-female')).map(inp => parseInt(inp.value) || 0);

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
    window.lastDistributionData = []; // إعادة تعيين بيانات الكشف
    
    // قوائم منع التكرار للعلاج الكهربائي (ثابتة طوال الـ 12 شهر)
    let globalUsedElectroMales = [];
    let globalUsedElectroFemales = [];
    
    const electroMaleReq = parseInt(document.getElementById('electroMale').value) || 0;
    const electroFemaleReq = parseInt(document.getElementById('electroFemale').value) || 0;

    // التوزيع داخل كل فترة (Rotation Loop)
    for (let p = 0; p < numPeriods; p++) {
        let cohortMales = malePeriods[p];
        let cohortFemales = femalePeriods[p];
        
        // حفظ البيانات لاستخدامها في طباعة شئون الامتياز
        window.lastDistributionData.push({ males: cohortMales, females: cohortFemales, mandatoryMonths: mandatoryMonths });

        let history = {};
        cohortMales.concat(cohortFemales).forEach(student => history[student] = []);

        // تحديد أسماء الشهور لهذه الفترة
        let periodStartAbsolute = p * mandatoryMonths;
        let periodMonthNames = [];
        for (let m = 0; m < mandatoryMonths; m++) {
            periodMonthNames.push(arabicMonths[(startMonthIdx + periodStartAbsolute + m) % 12]);
        }
        let periodMonthsText = periodMonthNames.join(' و ');

        html += `<div class="result-section" style="page-break-after: always; padding-bottom: 20px;">
                    <h3>الفترة الإجبارية ${p + 1} (المدة: ${mandatoryMonths} شهر) - ${periodMonthsText} - إجمالي: ${cohortMales.length} ذكور، ${cohortFemales.length} إناث</h3>
                    <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>الشهر</th>
                                ${departmentsList.map(d => `<th>${d}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>`;

        // جدول الأقسام للفترة
        for (let m = 1; m <= mandatoryMonths; m++) {
            let currentMonthName = arabicMonths[(startMonthIdx + periodStartAbsolute + m - 1) % 12];
            html += `<tr><td><strong>الشهر ${m} (${currentMonthName})</strong></td>`;
            
            let adjustedCaps = distributeDepartmentSurplus(baseMaleCaps, baseFemaleCaps, cohortMales.length, cohortFemales.length);
            let monthMaleCaps = adjustedCaps.males;
            let monthFemaleCaps = adjustedCaps.females;

            let maleAssignmentResult;
            for(let attempt=0; attempt<50; attempt++) {
                maleAssignmentResult = assignStudentsToDepartmentsSmart(cohortMales, monthMaleCaps, history);
                if(maleAssignmentResult.success) break;
            }
            
            let femaleAssignmentResult;
            for(let attempt=0; attempt<50; attempt++) {
                femaleAssignmentResult = assignStudentsToDepartmentsSmart(cohortFemales, monthFemaleCaps, maleAssignmentResult.success ? maleAssignmentResult.history : history);
                if(femaleAssignmentResult.success) break;
            }

            if (maleAssignmentResult.success && femaleAssignmentResult.success) {
                history = femaleAssignmentResult.history; 
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
        html += `</tbody></table></div>`;

        // إدراج جدول العلاج الكهربائي الخاص بهذه الفترة فقط (تحت جدول الأقسام مباشرة)
        if (electroMaleReq > 0 || electroFemaleReq > 0) {
            html += `<h4 style="margin-top:20px; color:var(--primary);">توزيع مسؤولي العلاج الكهربائي (الفترة ${p + 1})</h4>
                     <div class="table-responsive">
                     <table class="data-table">
                         <thead>
                             <tr>
                                 <th>الشهر</th>
                                 <th>الأسبوع الأول</th>
                                 <th>الأسبوع الثاني</th>
                                 <th>الأسبوع الثالث</th>
                                 <th>الأسبوع الرابع</th>
                             </tr>
                         </thead>
                         <tbody>`;
            
            let poolMales = [...cohortMales];
            let poolFemales = [...cohortFemales];

            for (let m = 1; m <= mandatoryMonths; m++) {
                let currentMonthName = arabicMonths[(startMonthIdx + periodStartAbsolute + m - 1) % 12];
                html += `<tr><td><strong>الشهر ${m} (${currentMonthName})</strong></td>`;
                
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
            }
            html += `</tbody></table></div>`;
        }
        
        html += `</div>`; // إغلاق الـ result-section الخاص بالفترة
    }

    document.getElementById('resultsContainer').innerHTML = html;
    document.getElementById('printActions').style.display = 'flex';
    document.getElementById('printArea').scrollIntoView({ behavior: 'smooth' });
}

// دالة تصدير النتيجة كملف Word بتنسيق Landscape مطابق للطباعة
function exportToWord() {
    // إضافة CSS مخصص لبرنامج Microsoft Word لضبط الـ Landscape والألوان
    let css = `
        <style>
            @page WordSection1 {
                size: 841.9pt 595.3pt; /* A4 Landscape */
                mso-page-orientation: landscape;
                margin: 0.5in 0.5in 0.5in 0.5in;
            }
            div.WordSection1 { 
                page: WordSection1; 
                direction: rtl; 
                font-family: 'Cairo', sans-serif; 
            }
            table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-bottom: 20px; 
                text-align: center; 
                direction: rtl; 
            }
            th, td { 
                border: 1pt solid windowtext; 
                padding: 5pt; 
                vertical-align: top; 
            }
            th { 
                background-color: #f3f4f6; 
                font-weight: bold; 
                color: #1e3a8a;
            }
            h3, h4 { 
                color: #1e3a8a; 
                text-align: right; 
                border-bottom: 1pt solid #1e3a8a;
                padding-bottom: 5pt;
            }
            ol { 
                margin: 0; 
                padding-right: 20px; 
                text-align: right; 
            }
        </style>
    `;

    // تجهيز الهيكل الأساسي لملف الوورد
    let preHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
        <meta charset='utf-8'>
        <title>التوزيع النهائي لطلاب الامتياز</title>
        ${css}
    </head>
    <body>
        <div class="WordSection1">`;

    let postHtml = `</div></body></html>`;

    // سحب الجداول من الموقع
    let content = document.getElementById('resultsContainer').innerHTML;
    let html = preHtml + content + postHtml;
    
    // إنشاء الملف وتحميله
    let blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    let url = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(html);
    
    let downloadLink = document.createElement("a");
    document.body.appendChild(downloadLink);
    
    if (navigator.msSaveOrOpenBlob) {
        navigator.msSaveOrOpenBlob(blob, 'التوزيع_النهائي_للامتياز.doc');
    } else {
        downloadLink.href = url;
        downloadLink.download = 'التوزيع_النهائي_للامتياز.doc';
        downloadLink.click();
    }
    document.body.removeChild(downloadLink);
}

// ============================================================================
// 1. دالة طباعة كشف شئون الامتياز (محدثة بتنسيق الصفحات)
// ============================================================================
function printAdminTable() {
    if (window.lastDistributionData.length === 0) {
        alert("يرجى إنشاء التوزيع العشوائي أولاً!");
        return;
    }
    
    const startMonthIdx = parseInt(document.getElementById('startMonth').value);
    
    // إعداد هيكل الـ HTML مع CSS مخصص للطباعة لمنع انقسام الجداول
    let adminHtml = `<html><head><title>كشف أسماء طلاب الامتياز</title><style>
        body { font-family: 'Cairo', sans-serif; direction: rtl; padding: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th, td { border: 1px solid #000; padding: 10px; text-align: center; }
        th { background-color: #f3f4f6; }
        h2 { text-align: center; margin-bottom: 20px; page-break-after: avoid; }
        h3 { color: #1e3a8a; page-break-after: avoid; }
        /* الكلاس الجديد لضمان عدم انقسام الفترة في منتصف الورقة */
        .period-section { 
            page-break-inside: avoid; /* يمنع انقسام الجدول الواحد بين صفحتين */
            page-break-after: always; /* يجعل كل فترة تبدأ في صفحة جديدة */
        }
        .period-section:last-child {
            page-break-after: auto; /* إلغاء فاصل الصفحة بعد آخر فترة */
        }
    </style></head><body>`;
    
    adminHtml += `<h2>كشف اسماء توزيع طلاب الإمتياز في الشهور الإجبارية</h2>`;

    window.lastDistributionData.forEach((data, index) => {
        let periodStartAbsolute = index * data.mandatoryMonths;
        let monthNames = [];
        for (let m = 0; m < data.mandatoryMonths; m++) {
            monthNames.push(arabicMonths[(startMonthIdx + periodStartAbsolute + m) % 12]);
        }
        
        // تغليف كل فترة بـ div يحمل الكلاس الخاص بالطباعة
        adminHtml += `<div class="period-section">`;
        adminHtml += `<h3>الفترة الإجبارية ${index + 1} (${monthNames.join(' و ')})</h3>`;
        adminHtml += `<table>
                        <thead>
                            <tr>
                                <th style="width: 10%;">م</th>
                                <th style="width: 60%;">اسم الطالب</th>
                                <th style="width: 30%;">النوع</th>
                            </tr>
                        </thead>
                        <tbody>`;
        let count = 1;
        data.males.forEach(name => {
            adminHtml += `<tr><td>${count++}</td><td>${name}</td><td>ذكر</td></tr>`;
        });
        data.females.forEach(name => {
            adminHtml += `<tr><td>${count++}</td><td>${name}</td><td>أنثى</td></tr>`;
        });
        adminHtml += `</tbody></table></div>`;
    });
    
    adminHtml += `</body></html>`;
    
    let printWin = window.open('', '_blank');
    printWin.document.write(adminHtml);
    printWin.document.close();
    printWin.focus();
    
    printWin.onload = function() {
        printWin.print();
    };
    printWin.onafterprint = function() {
        printWin.close();
    };
}

// ============================================================================
// 2. دالة تصدير شئون الامتياز إلى ملف Word (.doc)
// ============================================================================
function exportAdminToWord() {
    if (window.lastDistributionData.length === 0) {
        alert("يرجى إنشاء التوزيع العشوائي أولاً!");
        return;
    }
    
    const startMonthIdx = parseInt(document.getElementById('startMonth').value);
    
    // إعداد CSS مخصص لـ Microsoft Word (MSO)
    let css = `
        <style>
            @page WordSection1 {
                size: 595.3pt 841.9pt; /* حجم A4 رأسي (Portrait) لأنه مناسب أكثر للقوائم */
                margin: 0.5in 0.5in 0.5in 0.5in;
            }
            div.WordSection1 { page: WordSection1; direction: rtl; font-family: 'Cairo', sans-serif; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; text-align: center; direction: rtl; }
            th, td { border: 1pt solid windowtext; padding: 8pt; }
            th { background-color: #f3f4f6; font-weight: bold; color: #1e3a8a; }
            h2 { text-align: center; margin-bottom: 20px; color: #000; }
            h3 { color: #1e3a8a; text-align: right; }
            /* إجبار الوورد على بدء صفحة جديدة لكل فترة */
            .page-break { mso-special-character: line-break; page-break-before: always; }
        </style>
    `;

    let html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>كشف شئون الامتياز</title>${css}</head>
    <body><div class="WordSection1">
    <h2>كشف اسماء توزيع طلاب الإمتياز في الشهور الإجبارية</h2>`;

    window.lastDistributionData.forEach((data, index) => {
        let periodStartAbsolute = index * data.mandatoryMonths;
        let monthNames = [];
        for (let m = 0; m < data.mandatoryMonths; m++) {
            monthNames.push(arabicMonths[(startMonthIdx + periodStartAbsolute + m) % 12]);
        }
        
        if (index > 0) {
            html += `<br clear="all" class="page-break" />`; // فاصل صفحات لملف الوورد
        }
        
        html += `<h3>الفترة الإجبارية ${index + 1} (${monthNames.join(' و ')})</h3>`;
        html += `<table>
                    <thead>
                        <tr>
                            <th>م</th>
                            <th>اسم الطالب</th>
                            <th>النوع</th>
                        </tr>
                    </thead>
                    <tbody>`;
        let count = 1;
        data.males.forEach(name => {
            html += `<tr><td>${count++}</td><td>${name}</td><td>ذكر</td></tr>`;
        });
        data.females.forEach(name => {
            html += `<tr><td>${count++}</td><td>${name}</td><td>أنثى</td></tr>`;
        });
        html += `</tbody></table>`;
    });

    html += `</div></body></html>`;
    
    let blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    let url = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(html);
    let downloadLink = document.createElement("a");
    document.body.appendChild(downloadLink);
    downloadLink.href = url;
    downloadLink.download = 'كشف_شئون_الامتياز.doc';
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

// ============================================================================
// 3. دالة تصدير شئون الامتياز إلى ملف Excel (.xlsx)
// ============================================================================
function exportAdminToExcel() {
    if (window.lastDistributionData.length === 0) {
        alert("يرجى إنشاء التوزيع العشوائي أولاً!");
        return;
    }
    
    // التحقق من وجود مكتبة SheetJS
    if (typeof XLSX === 'undefined') {
        alert("حدث خطأ: مكتبة Excel لم يتم تحميلها بشكل صحيح. يرجى التأكد من اتصالك بالإنترنت.");
        return;
    }
    
    const startMonthIdx = parseInt(document.getElementById('startMonth').value);
    
    // إنشاء ملف Excel جديد
    let wb = XLSX.utils.book_new();
    wb.Workbook = { Views: [{ RTL: true }] }; // ضبط الملف ليكون من اليمين لليسار

    window.lastDistributionData.forEach((data, index) => {
        let periodStartAbsolute = index * data.mandatoryMonths;
        let monthNames = [];
        for (let m = 0; m < data.mandatoryMonths; m++) {
            monthNames.push(arabicMonths[(startMonthIdx + periodStartAbsolute + m) % 12]);
        }
        
        // تجهيز البيانات التي ستدخل في الـ Sheet (مصفوفة ثنائية الأبعاد)
        let wsData = [
            [`كشف أسماء طلاب الامتياز - الفترة الإجبارية ${index + 1} (${monthNames.join(' و ')})`],
            [], // سطر فارغ
            ['م', 'اسم الطالب', 'النوع'] // ترويسة الجدول
        ];
        
        let count = 1;
        data.males.forEach(name => {
            wsData.push([count++, name, 'ذكر']);
        });
        data.females.forEach(name => {
            wsData.push([count++, name, 'أنثى']);
        });

        // تحويل المصفوفة إلى Sheet
        let ws = XLSX.utils.aoa_to_sheet(wsData);
        
        // ضبط عرض الأعمدة ليكون مناسباً
        ws['!cols'] = [
            { wch: 5 },   // عمود "م"
            { wch: 40 },  // عمود "اسم الطالب"
            { wch: 15 }   // عمود "النوع"
        ];

        // إضافة الـ Sheet لملف الـ Excel (تسمية كل Sheet برقم الفترة)
        // الحد الأقصى لاسم الـ Sheet هو 31 حرف في Excel
        let sheetName = `الفترة ${index + 1}`; 
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });
    
    // تنزيل الملف بصيغة .xlsx
    XLSX.writeFile(wb, 'كشف_شئون_الامتياز.xlsx');
}

window.onload = () => {
    buildDepartmentsTable();
};
