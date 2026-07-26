// المتغيرات العامة
const maleNamesInput = document.getElementById('maleNames');
const femaleNamesInput = document.getElementById('femaleNames');
const maleCountSpan = document.getElementById('maleCount');
const femaleCountSpan = document.getElementById('femaleCount');
const mandatoryMonthsSelect = document.getElementById('mandatoryMonths');
const periodCountsContainer = document.getElementById('periodCountsContainer');
const departmentInputsBody = document.querySelector('#departmentInputs tbody');
const totalDepCountSpan = document.getElementById('totalDepCount');
const targetTotalCountSpan = document.getElementById('targetTotalCount');
const electrotherapyCountInput = document.getElementById('electrotherapyCount');
const generateDistributionBtn = document.getElementById('generateDistribution');
const resultsContainer = document.getElementById('resultsContainer');
const printPDFBtn = document.getElementById('printPDF');

const departments = ['باطنة', 'جراحة وحروق', 'صحة المرأة', 'عظام', 'أعصاب', 'أطفال', 'الحكيم'];
const totalMonths = 12;

let finalDistributionData = null; // لتخزين البيانات النهائية قبل إنشاء الـ PDF

// خوارزمية ترتيب عشوائي مدمجة (Fisher-Yates shuffle)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// دالة لاستخراج قائمة الأسماء من textarea
function getNamesList(textarea) {
    return textarea.value.split('\n').map(name => name.trim()).filter(name => name !== '');
}

// دالة لحساب وتوزيع الفائض عشوائياً بين المجموعات
function getSurplusDistributedCounts(total, periods) {
    const counts = new Array(periods).fill(Math.floor(total / periods));
    let surplus = total % periods;
    let surplusIndices = Array.from({ length: periods }, (_, i) => i);
    shuffleArray(surplusIndices).slice(0, surplus).forEach(index => counts[index]++);
    return counts;
}

// --- التعامل مع المدخلات والعدادات التلقائية ---

function updateStudentCounts() {
    const maleNames = getNamesList(maleNamesInput);
    const femaleNames = getNamesList(femaleNamesInput);
    maleCountSpan.innerText = maleNames.length;
    femaleCountSpan.innerText = femaleNames.length;
    updateTargetTotalCount(maleNames.length + femaleNames.length);
    updatePeriodTable();
}

maleNamesInput.addEventListener('input', updateStudentCounts);
femaleNamesInput.addEventListener('input', updateStudentCounts);

// --- التعامل مع الفترات الإجبارية ---

mandatoryMonthsSelect.addEventListener('change', updatePeriodTable);

function updatePeriodTable() {
    const mandatoryMonths = parseInt(mandatoryMonthsSelect.value);
    const numPeriods = totalMonths / mandatoryMonths;
    const maleNames = getNamesList(maleNamesInput);
    const femaleNames = getNamesList(femaleNamesInput);

    // توزيع الذكور
    const maleCountsPerPeriod = getSurplusDistributedCounts(maleNames.length, numPeriods);

    // توزيع الإناث
    const femaleCountsPerPeriod = getSurplusDistributedCounts(femaleNames.length, numPeriods);

    let periodCountsHtml = '<h2>توزيع أعداد الطلاب لكل فترة إجبارية</h2><div class="period-items">';
    for (let period = 1; period <= numPeriods; period++) {
        const maleCount = maleCountsPerPeriod[period - 1];
        const femaleCount = femaleCountsPerPeriod[period - 1];
        periodCountsHtml += `<div class="period-item"><h3>الفترة ${period} (${mandatoryMonths} شهور)</h3>
                                <p>ذكور: ${maleCount}</p><p>إناث: ${femaleCount}</p></div>`;
    }
    periodCountsHtml += '</div>';

    periodCountsContainer.innerHTML = periodCountsHtml;
    generateDepartmentInputs();
}

// --- التعامل مع الأقسام والعدادات ---

function updateTargetTotalCount(total) {
    const mandatoryMonths = parseInt(mandatoryMonthsSelect.value);
    const numPeriods = totalMonths / mandatoryMonths;
    targetTotalCountSpan.innerText = total / numPeriods;
}

function generateDepartmentInputs() {
    let html = '';
    departments.forEach(dep => {
        html += `<tr><td>${dep}</td>
                     <td><input type="number" class="dep-male-input" data-dep="${dep}" value="0"></td>
                     <td><input type="number" class="dep-female-input" data-dep="${dep}" value="0"></td></tr>`;
    });
    departmentInputsBody.innerHTML = html;
    addDepInputListeners();
}

function addDepInputListeners() {
    const inputs = document.querySelectorAll('.dep-male-input, .dep-female-input');
    inputs.forEach(input => {
        input.addEventListener('input', updateTotalDepCount);
    });
}

function updateTotalDepCount() {
    const inputs = document.querySelectorAll('.dep-male-input, .dep-female-input');
    let total = 0;
    inputs.forEach(input => total += parseInt(input.value) || 0);
    totalDepCountSpan.innerText = total;
}

// --- خوارزمية التوزيع العشوائي الأساسية ---

generateDistributionBtn.addEventListener('click', () => {
    // التحقق من الأعداد
    const totalTarget = parseInt(targetTotalCountSpan.innerText);
    const totalEntered = parseInt(totalDepCountSpan.innerText);
    if (totalEntered !== totalTarget) {
        alert('مجموع الطلاب المطلوبين في الأقسام يجب أن يساوي مجموع الطلاب في الفترة الواحدة! يرجى التحقق من الأعداد.');
        return;
    }

    const mandatoryMonths = parseInt(mandatoryMonthsSelect.value);
    const numPeriods = totalMonths / mandatoryMonths;
    const allMaleNames = shuffleArray(getNamesList(maleNamesInput));
    const allFemaleNames = shuffleArray(getNamesList(femaleNamesInput));
    const allStudents = shuffleArray(allMaleNames.concat(allFemaleNames));

    const maleCountsPerPeriod = getSurplusDistributedCounts(allMaleNames.length, numPeriods);
    const femaleCountsPerPeriod = getSurplusDistributedCounts(allFemaleNames.length, numPeriods);

    const periodsStudents = [];
    for (let i = 0; i < numPeriods; i++) {
        periodsStudents.push({
            males: allMaleNames.splice(0, maleCountsPerPeriod[i]),
            females: allFemaleNames.splice(0, femaleCountsPerPeriod[i])
        });
    }

    const depMaleCounts = {};
    const depFemaleCounts = {};
    document.querySelectorAll('.dep-male-input').forEach(input => depMaleCounts[input.dataset.dep] = parseInt(input.value) || 0);
    document.querySelectorAll('.dep-female-input').forEach(input => depFemaleCounts[input.dataset.dep] = parseInt(input.value) || 0);

    // إنشاء توزيع الفترات مع ضمان عدم التكرار
    const periodDistributions = [];
    for (let p = 0; p < numPeriods; p++) {
        const periodMales = shuffleArray(periodsStudents[p].males);
        const periodFemales = shuffleArray(periodsStudents[p].females);
        const periodDist = {};

        // لكل طالب، نحدد قائمة الأقسام التي لم يدخلها بعد
        const studentAssignments = {};
        periodMales.concat(periodFemales).forEach(student => {
            studentAssignments[student] = shuffleArray(departments.slice());
        });

        for (let m = 1; m <= mandatoryMonths; m++) {
            const monthDist = {};
            // توزيع الذكور
            Object.keys(depMaleCounts).forEach(dep => {
                monthDist[dep] = monthDist[dep] || { males: [], females: [] };
                // اختيار الطلاب الذين لم يدخلوا القسم بعد
                const eligibleMales = periodMales.filter(student => studentAssignments[student].includes(dep));
                monthDist[dep].males = eligibleMales.splice(0, depMaleCounts[dep]);
                // إزالة القسم من قائمة الطالب
                monthDist[dep].males.forEach(student => studentAssignments[student] = studentAssignments[student].filter(d => d !== dep));
            });
            // توزيع الإناث
            Object.keys(depFemaleCounts).forEach(dep => {
                monthDist[dep] = monthDist[dep] || { males: [], females: [] };
                // اختيار الطالبات اللواتي لم يدخلن القسم بعد
                const eligibleFemales = periodFemales.filter(student => studentAssignments[student].includes(dep));
                monthDist[dep].females = eligibleFemales.splice(0, depFemaleCounts[dep]);
                // إزالة القسم من قائمة الطالبة
                monthDist[dep].females.forEach(student => studentAssignments[student] = studentAssignments[student].filter(d => d !== dep));
            });
            periodDist[`الشهر ${m}`] = monthDist;
        }
        periodDistributions.push(periodDist);
    }

    // --- توزيع العلاج الكهربائي (منفصل، عشوائي، بدون تكرار) ---

    const numElectrotherapyPerWeek = parseInt(electrotherapyCountInput.value) || 0;
    const electrotherapyDistribution = [];
    for (let m = 1; m <= totalMonths; m++) {
        // الطلاب الموجودون في المركز في هذا الشهر (طلاب الفترة التي تحتوي على هذا الشهر)
        const periodIndex = Math.floor((m - 1) / mandatoryMonths);
        const availableStudents = periodsStudents[periodIndex].males.concat(periodsStudents[periodIndex].females);
        const availableMaleStudents = periodsStudents[periodIndex].males;
        const availableFemaleStudents = periodsStudents[periodIndex].females;

        const electrotherapyMonth = {};
        for (let w = 1; w <= 4; w++) {
            const electrotherapyWeek = [];
            
            // محاولة توزيع الطلاب بالتساوي على الأسابيع مع ضمان عدم التكرار الأسبوعي
            const maleStudentsPerWeek = getSurplusDistributedCounts(availableMaleStudents.length, 4);
            const femaleStudentsPerWeek = getSurplusDistributedCounts(availableFemaleStudents.length, 4);

            electrotherapyWeek.push(...shuffleArray(availableMaleStudents.splice(0, maleStudentsPerWeek[w-1])).slice(0, numElectrotherapyPerWeek));
            electrotherapyWeek.push(...shuffleArray(availableFemaleStudents.splice(0, femaleStudentsPerWeek[w-1])).slice(0, numElectrotherapyPerWeek));
            electrotherapyMonth[`الأسبوع ${w}`] = shuffleArray(electrotherapyWeek);
        }
        electrotherapyDistribution.push(electrotherapyMonth);
    }

    // تخزين البيانات النهائية للعرض وإنشاء الـ PDF
    finalDistributionData = {
        periodDistributions,
        electrotherapyDistribution,
        numPeriods,
        mandatoryMonths
    };

    displayResults(finalDistributionData);
    printPDFBtn.disabled = false;
});

// --- عرض النتائج النهائية ---

function displayResults(data) {
    const { periodDistributions, electrotherapyDistribution, numPeriods, mandatoryMonths } = data;
    let html = '<h2>جداول التوزيع العشوائي النهائي</h2>';

    for (let p = 0; p < numPeriods; p++) {
        html += `<h3>الفترة ${p + 1} (${mandatoryMonths} شهور)</h3>`;
        html += `<table><thead><tr><th>الشهر</th>`;
        departments.forEach(dep => html += `<th>${dep}</th>`);
        html += `</tr></thead><tbody>`;

        for (let m = 1; m <= mandatoryMonths; m++) {
            const monthDist = periodDistributions[p][`الشهر ${m}`];
            html += `<tr><td>الشهر ${m}</td>`;
            departments.forEach(dep => {
                const students = (monthDist[dep].males.concat(monthDist[dep].females)).join('<br>');
                html += `<td>${students}</td>`;
            });
            html += `</tr>`;
        }
        html += `</tbody></table>`;
    }

    html += `<h3>توزيع مسؤولي العلاج الكهربائي (منفصل، عشوائي، بدون تكرار)</h3>`;
    html += `<table><thead><tr><th>الشهر</th><th>الأسبوع 1</th><th>الأسبوع 2</th><th>الأسبوع 3</th><th>الأسبوع 4</th></tr></thead><tbody>`;
    for (let m = 1; m <= totalMonths; m++) {
        html += `<tr><td>الشهر ${m}</td>`;
        for (let w = 1; w <= 4; w++) {
            html += `<td>${electrotherapyDistribution[m-1][`الأسبوع ${w}`].join('<br>')}</td>`;
        }
        html += `</tr>`;
    }
    html += `</tbody></table>`;

    resultsContainer.innerHTML = html;
}

// --- وظيفة الطباعة (PDF) ---

printPDFBtn.addEventListener('click', () => {
    if (!finalDistributionData) {
        alert('يرجى إنشاء التوزيع العشوائي أولاً!');
        return;
    }

    const { periodDistributions, electrotherapyDistribution, numPeriods, mandatoryMonths } = finalDistributionData;
    const doc = new jspdf.jsPDF();

    doc.setFont('Cairo'); // استخدام الخطوط العربية
    doc.text('نظام توزيع طلاب الامتياز - التوزيع العشوائي النهائي', 10, 10);
    doc.text(`تاريخ الإنشاء: ${new Date().toLocaleDateString()}`, 10, 20);

    let yOffset = 30;

    for (let p = 0; p < numPeriods; p++) {
        doc.text(`الفترة ${p + 1} (${mandatoryMonths} شهور)`, 10, yOffset);
        yOffset += 10;

        const tableHead = [['الشهر', ...departments]];
        const tableBody = [];

        for (let m = 1; m <= mandatoryMonths; m++) {
            const monthDist = periodDistributions[p][`الشهر ${m}`];
            const row = [`الشهر ${m}`];
            departments.forEach(dep => row.push((monthDist[dep].males.concat(monthDist[dep].females)).join(', ')));
            tableBody.push(row);
        }

        doc.autoTable({
            startY: yOffset,
            head: tableHead,
            body: tableBody,
            styles: { font: 'Cairo', halign: 'right' }, // استخدام الخطوط العربية وتحديد اتجاه النص
            margin: { left: 10, right: 10 }
        });
        yOffset = doc.autoTable.previous.finalY + 10;
    }

    doc.addPage(); // إضافة صفحة جديدة لعلاج العلاج الكهربائي
    doc.text('توزيع مسؤولي العلاج الكهربائي (منفصل، عشوائي، بدون تكرار)', 10, 10);
    const electrotherapyHead = [['الشهر', 'الأسبوع 1', 'الأسبوع 2', 'الأسبوع 3', 'الأسبوع 4']];
    const electrotherapyBody = [];
    for (let m = 1; m <= totalMonths; m++) {
        const row = [`الشهر ${m}`];
        for (let w = 1; w <= 4; w++) row.push(electrotherapyDistribution[m-1][`الأسبوع ${w}`].join(', '));
        electrotherapyBody.push(row);
    }

    doc.autoTable({
        startY: 20,
        head: electrotherapyHead,
        body: electrotherapyBody,
        styles: { font: 'Cairo', halign: 'right' },
        margin: { left: 10, right: 10 }
    });

    doc.save('distribution_final.pdf');
});
