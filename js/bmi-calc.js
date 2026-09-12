(function () {
  const wInput = document.getElementById('bmiWeight');
  const hInput = document.getElementById('bmiHeight');
  const bmiBtn = document.getElementById('bmiCalcBtn');
  const bmiErr = document.getElementById('bmiErr');
  const bmiResult = document.getElementById('bmiResult');
  const bmiValueEl = document.getElementById('bmiValue');
  const bmiTagEl = document.getElementById('bmiTag');

  if (!bmiBtn) return; // Trang chưa được render (an toàn khi script tải trước)

  function goNext(nextEl) {
    if (!nextEl) return;
    nextEl.focus();
    if (typeof nextEl.select === 'function') nextEl.select();
  }

  wInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); goNext(hInput); }
  });
  hInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); calcBmi(); }
  });

  function bmiShowErr(show) {
    bmiErr.classList.toggle('show', show);
    bmiResult.classList.toggle('show', !show);
  }

  function classifyBmi(bmi) {
    if (bmi < 18.5) return { label: 'Thiếu cân', color: 'var(--amber)', bg: 'var(--amber-light)' };
    if (bmi < 23) return { label: 'Bình thường', color: 'var(--green)', bg: 'var(--green-light)' };
    if (bmi < 25) return { label: 'Thừa cân', color: 'var(--amber)', bg: 'var(--amber-light)' };
    if (bmi < 30) return { label: 'Béo phì độ I', color: '#fff', bg: 'var(--red-dark)' };
    return { label: 'Béo phì độ II', color: '#fff', bg: 'var(--red-dark)' };
  }

  function calcBmi() {
    const weight = parseFloat(wInput.value);
    const height = parseFloat(hInput.value);
    if (!(weight > 0) || !(height > 0)) {
      bmiShowErr(true);
      return;
    }
    bmiShowErr(false);
    const hM = height / 100;
    const bmi = weight / (hM * hM);
    bmiValueEl.textContent = bmi.toFixed(1);
    const c = classifyBmi(bmi);
    bmiTagEl.textContent = c.label;
    bmiTagEl.style.color = c.color;
    bmiTagEl.style.background = c.bg;

    if (typeof logUsage === 'function') logUsage('bmi_calc');
  }

  bmiBtn.addEventListener('click', calcBmi);
})();
