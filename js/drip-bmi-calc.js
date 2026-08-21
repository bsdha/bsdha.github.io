(function () {
  const startInput = document.getElementById('dtStart');
  const volumeInput = document.getElementById('dtVolume');
  const rateInput = document.getElementById('dtRate');
  const factorToggle = document.getElementById('dtFactorToggle');
  const calcBtn = document.getElementById('dtCalcBtn');
  const errEl = document.getElementById('dtErr');
  const resultEl = document.getElementById('dtResult');
  const durationEl = document.getElementById('dtDuration');
  const endTagEl = document.getElementById('dtEndTag');
  const endDescEl = document.getElementById('dtEndDesc');

  if (!calcBtn) return; // Trang chưa được render (an toàn khi script tải trước)

  let dropFactor = 20;

  // Điền sẵn giờ hiện tại để tiện dùng ngay
  function pad2(n) { return String(n).padStart(2, '0'); }
  function fillNow() {
    if (startInput && !startInput.value) {
      const now = new Date();
      startInput.value = pad2(now.getHours()) + ':' + pad2(now.getMinutes());
    }
  }
  fillNow();

  factorToggle.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-factor]');
    if (!btn) return;
    factorToggle.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    dropFactor = parseFloat(btn.dataset.factor);
  });

  function showErr(show) {
    errEl.classList.toggle('show', show);
    resultEl.classList.toggle('show', !show);
  }

  function calc() {
    const volume = parseFloat(volumeInput.value);
    const rate = parseFloat(rateInput.value);

    if (!(volume > 0) || !(rate > 0)) {
      showErr(true);
      return;
    }
    showErr(false);

    const totalMinutes = (volume * dropFactor) / rate;
    const hh = Math.floor(totalMinutes / 60);
    const mm = Math.round(totalMinutes % 60);
    // Xử lý làm tròn phút gây tràn thành 60
    let dHH = hh, dMM = mm;
    if (dMM === 60) { dMM = 0; dHH += 1; }

    durationEl.textContent = (dHH > 0 ? dHH + ' giờ ' : '') + dMM + ' phút';

    // Tính giờ kết thúc dựa trên giờ bắt đầu (nếu có), mặc định là giờ hiện tại
    let startDate;
    if (startInput.value) {
      const [sh, sm] = startInput.value.split(':').map(Number);
      startDate = new Date();
      startDate.setHours(sh, sm, 0, 0);
    } else {
      startDate = new Date();
    }
    const endDate = new Date(startDate.getTime() + totalMinutes * 60000);
    const nextDay = endDate.getDate() !== startDate.getDate() || endDate.getMonth() !== startDate.getMonth();

    endTagEl.textContent = 'Kết thúc lúc ' + pad2(endDate.getHours()) + ':' + pad2(endDate.getMinutes()) + (nextDay ? ' (hôm sau)' : '');
    endDescEl.textContent = 'Bắt đầu ' + pad2(startDate.getHours()) + ':' + pad2(startDate.getMinutes()) +
      ' · Thể tích ' + volume + ' mL · Tốc độ ' + rate + ' giọt/phút · Hệ số ' + dropFactor + ' gtt/mL.';
  }

  calcBtn.addEventListener('click', calc);
  [volumeInput, rateInput].forEach((el) => {
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') calc(); });
  });

  // ---- BMI ----
  const wInput = document.getElementById('bmiWeight');
  const hInput = document.getElementById('bmiHeight');
  const bmiBtn = document.getElementById('bmiCalcBtn');
  const bmiErr = document.getElementById('bmiErr');
  const bmiResult = document.getElementById('bmiResult');
  const bmiValueEl = document.getElementById('bmiValue');
  const bmiTagEl = document.getElementById('bmiTag');

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
  }

  bmiBtn.addEventListener('click', calcBmi);
  [wInput, hInput].forEach((el) => {
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') calcBmi(); });
  });
})();
