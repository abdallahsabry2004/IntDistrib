// --- Navigation Logic (التحكم في خطوات الموقع) ---
function nextStep(stepNumber) {
    document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
    document.getElementById(`step-${stepNumber}`).classList.add('active');
}

function prevStep(stepNumber) {
    document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
    document.getElementById(`step-${stepNumber}`).classList.add('active');
}

// --- Data & Helpers ---
const departments = ['الباطنة (Internal Med)', 'الجراحة والحروق (Surgery)', 'صحة المرأة (OB/GYN)', 'العظام (Orthopedics)', 'الأعصاب (Neurology)', 'الأطفال (Pediatrics)', 'الحكيم (Al-Hakeem)'];
let allMales = [];
let allFemales = [];

// تحديث عدادات الأسماء بشكل لحظي
document.getElementById('maleNames').addEventListener('input', function() {
    allMales = this.value.split('\n').map(n => n.trim()).filter(n => n !== '');
    document.getElementById('maleCount').innerText = allMales.length;
});
document.getElementById('femaleNames').addEventListener('input', function() {
    allFemales = this.value.split('\n').map(n => n.trim()).filter(n => n !== '');
    document.getElementById('femaleCount').innerText = allFemales.length;
});

// Fisher-Yates Shuffle Algorithm (للتوزيع العشوائي)
function shuffleArray(array) {
    let arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// إنشاء حقول الأقسام وتحديث التوقعات
function generatePeriodPreview() {
    const mandatoryMonths = parseInt(document.getElementById('mandatoryMonths').value);
    const numPeriods = 12 / mandatoryMonths;
    const totalStudents = allMales.length + allFemales.length;
    
    // متوسط عدد الطلاب في الشهر الواحد
    const avgPerMonth = Math.floor(totalStudents / 12);
    document.getElementById('targetTotal').innerText = avgPerMonth;

    let previewHTML = `<strong>إحصائيات الفترات:</strong> سيتم التقسيم لـ ${numPeriods} فترات، كل فترة مدتها ${mandatoryMonths} شهر.<br>`;
    previewHTML += `متوسط عدد الطلاب في الشهر الواحد تقريباً: ${avgPerMonth} طالب (سيتم توزيع أي كسور عشوائياً).`;
    document.getElementById('periodPreview').innerHTML = previewHTML;

    // توليد خانات الأقسام
    const tbody = document.querySelector('#departmentInputs tbody');
    tbody.innerHTML = '';
    departments.forEach((dep, index) => {
        tbody.innerHTML += `
            <tr>
                <td>${dep}</td>
                <td><input type="number" class="dep-male" data-idx="${index}" value="0" min="0"></td>
                <td><input type="number" class="dep-female" data-idx="${index}" value="0" min="0"></td>
            </tr>
        `;
    });

    // إضافة Event Listeners لجمع المدخلات
    document.querySelectorAll('.dep-male, .dep-female').forEach(input => {
        input.addEventListener('input', calculateEnteredTotal);
    });
}

function calculateEnteredTotal() {
    let total = 0;
    document.querySelectorAll('.dep-male, .dep-female').forEach(input => {
        total += parseInt(input.value) || 0;
    });
    document.getElementById('totalEntered').innerText = total;
}

// دالة لتوزيع الفائض (Surplus) عشوائياً
function distributeSurplus(baseCount, totalAvailable) {
    let distributed = [...baseCount];
    let currentSum = distributed.reduce((a, b) => a + b, 0);
    
    while(currentSum < totalAvailable) {
        // نختار اندكس عشوائي ونزود عليه 1
        let randomIdx = Math.floor(Math.random() * distributed.length);
        distributed[randomIdx]++;
        currentSum++;
    }
    while(currentSum > totalAvailable) {
        // لو المدخلات أكبر من المتاح، ننقص عشوائياً (عشان الـ Logic ميبوظش)
        let validIndices = distributed.map((val, idx) => val > 0 ? idx : -1).filter(idx => idx !== -1);
        if(validIndices.length > 0) {
            let randomIdx = validIndices[Math.floor(Math.random() * validIndices.length)];
            distributed[randomIdx]--;
            currentSum--;
        }
    }
    return distributed;
}

// --- الخوارزمية الأساسية للتقسيم ---
function generateFinalDistribution() {
    const mandatoryMonths = parseInt(document.getElementById('mandatoryMonths').value);
    const numPeriods = 12 / mandatoryMonths;
    
    let shuffledMales = shuffleArray(allMales);
    let shuffledFemales = shuffleArray(allFemales);
    
    // أخذ مدخلات الأقسام كمتوسط أساسي
    let baseDepMales = Array.from(document.querySelectorAll('.dep-male')).map(inp => parseInt(inp.value) || 0);
    let baseDepFemales = Array.from(document.querySelectorAll('.dep-female')).map(inp => parseInt(inp.value) || 0);

    let htmlOutput = '';
    let allPeriodsData = []; // هنحتفظ بالداتا عشان العلاج الكهربائي

    for (let p = 1; p <= numPeriods; p++) {
        // حساب نصيب الفترة دي من الطلاب
        let periodMaleCount = Math.floor(allMales.length / numPeriods) + (p <= (allMales.length % numPeriods) ? 1 : 0);
        let periodFemaleCount = Math.floor(allFemales.length / numPeriods) + (p <= (allFemales.length % numPeriods) ? 1 : 0);
        
        let periodMalesList = shuffledMales.splice(0, periodMaleCount);
        let periodFemalesList = shuffledFemales.splice(0, periodFemaleCount);
        
        allPeriodsData.push({ males: [...periodMalesList], females: [...periodFemalesList] });

        htmlOutput += `<h3>الفترة ${p} (المدة: ${mandatoryMonths} شهر) - إجمالي: ${periodMalesList.length} ذكور، ${periodFemalesList.length} إناث</h3>`;
        htmlOutput += `<table class="result-period-table">
                        <thead>
                            <tr>
                                <th>الشهر (Month)</th>
                                ${departments.map(d => `<th>${d}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>`;

        // لضمان عدم تكرار القسم لنفس الطالب
        let studentDepHistory = {}; 
        periodMalesList.concat(periodFemalesList).forEach(student => studentDepHistory[student] = []);

        for (let m = 1; m <= mandatoryMonths; m++) {
            htmlOutput += `<tr><td>الشهر ${m}</td>`;
            
            // حساب نصيب الشهر ده (مفيد في حالة الفترات الطويلة زي 3 أو 4 شهور)
            let monthMaleTarget = Math.floor(periodMalesList.length / mandatoryMonths) + (m <= (periodMalesList.length % mandatoryMonths) ? 1 : 0);
            let monthFemaleTarget = Math.floor(periodFemalesList.length / mandatoryMonths) + (m <= (periodFemalesList.length % mandatoryMonths) ? 1 : 0);
            
            // لو الفترات 1 أو 2 شهر، العدد بيفضل هو هو بتاع الفترة
            if(mandatoryMonths <= 2) { 
                monthMaleTarget = periodMalesList.length; 
                monthFemaleTarget = periodFemalesList.length; 
            }

            let currentMonthMales = distributeSurplus(baseDepMales, monthMaleTarget);
            let currentMonthFemales = distributeSurplus(baseDepFemales, monthFemaleTarget);

            let availableMalesThisMonth = shuffleArray(periodMalesList);
            let availableFemalesThisMonth = shuffleArray(periodFemalesList);

            departments.forEach((dep, depIdx) => {
                let cellStudents = [];
                
                // سحب الذكور للقسم
                let malesNeeded = currentMonthMales[depIdx];
                for(let i=0; i<availableMalesThisMonth.length && malesNeeded>0; i++){
                    let student = availableMalesThisMonth[i];
                    if(!studentDepHistory[student].includes(dep)) {
                        cellStudents.push(student);
                        studentDepHistory[student].push(dep);
                        availableMalesThisMonth.splice(i, 1);
                        malesNeeded--;
                        i--; // نظبط الاندكس بعد المسح
                    }
                }
                
                // سحب الإناث للقسم
                let femalesNeeded = currentMonthFemales[depIdx];
                for(let i=0; i<availableFemalesThisMonth.length && femalesNeeded>0; i++){
                    let student = availableFemalesThisMonth[i];
                    if(!studentDepHistory[student].includes(dep)) {
                        cellStudents.push(student);
                        studentDepHistory[student].push(dep);
                        availableFemalesThisMonth.splice(i, 1);
                        femalesNeeded--;
                        i--;
                    }
                }

                // عرض النتيجة كقائمة مرقمة
                if(cellStudents.length > 0) {
                    htmlOutput += `<td><ol class="student-list"><li>${cellStudents.join('</li><li>')}</li></ol></td>`;
                } else {
                    htmlOutput += `<td>-</td>`;
                }
            });
            htmlOutput += `</tr>`;
        }
        htmlOutput += `</tbody></table>`;
    }

    // --- توزيع العلاج الكهربائي (Electrotherapy) ---
    const electroMaleReq = parseInt(document.getElementById('electroMaleCount').value) || 0;
    const electroFemaleReq = parseInt(document.getElementById('electroFemaleCount').value) || 0;
    
    if (electroMaleReq > 0 || electroFemaleReq > 0) {
        htmlOutput += `<h3>جدول العلاج الكهربائي (Electrotherapy Distribution)</h3>`;
        htmlOutput += `<table class="result-period-table">
                        <thead>
                            <tr>
                                <th>الشهر</th>
                                <th>الأسبوع 1</th><th>الأسبوع 2</th><th>الأسبوع 3</th><th>الأسبوع 4</th>
                            </tr>
                        </thead>
                        <tbody>`;
        
        let monthCounter = 1;
        for (let p = 0; p < numPeriods; p++) {
            let periodPoolMales = [...allPeriodsData[p].males];
            let periodPoolFemales = [...allPeriodsData[p].females];
            
            for (let m = 1; m <= mandatoryMonths; m++) {
                htmlOutput += `<tr><td>الشهر ${monthCounter}</td>`;
                let usedThisMonth = []; // لضمان إن الطالب ميتكررش أكتر من أسبوع في نفس الشهر
                
                for (let w = 1; w <= 4; w++) {
                    let weekStudents = [];
                    // سحب عشوائي للذكور
                    let availableMales = shuffleArray(periodPoolMales.filter(s => !usedThisMonth.includes(s)));
                    let selectedMales = availableMales.slice(0, electroMaleReq);
                    usedThisMonth.push(...selectedMales);
                    weekStudents.push(...selectedMales);

                    // سحب عشوائي للإناث
                    let availableFemales = shuffleArray(periodPoolFemales.filter(s => !usedThisMonth.includes(s)));
                    let selectedFemales = availableFemales.slice(0, electroFemaleReq);
                    usedThisMonth.push(...selectedFemales);
                    weekStudents.push(...selectedFemales);
                    
                    if(weekStudents.length > 0) {
                        htmlOutput += `<td><ol class="student-list"><li>${weekStudents.join('</li><li>')}</li></ol></td>`;
                    } else {
                        htmlOutput += `<td>-</td>`;
                    }
                }
                htmlOutput += `</tr>`;
                monthCounter++;
            }
        }
        htmlOutput += `</tbody></table>`;
    }

    document.getElementById('resultsContainer').innerHTML = htmlOutput;
    nextStep(4);
}

// --- الطباعة (PDF) باستخدام html2pdf ---
function printPDF() {
    const element = document.getElementById('printableArea');
    const opt = {
        margin:       0.3, // Margin by inches
        filename:     'Internship_Distribution.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'landscape' }
    };

    // الـ Function دي بتاخد الـ HTML وتطلعه كـ PDF مضبوط جداً بدون مشاكل في الخط العربي
    html2pdf().set(opt).from(element).save();
}
