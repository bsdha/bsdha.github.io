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

  if (!calcBtn) return; // Trang chưa được render (an toàn khi script tải trước)

  let dropFactor = 20;

  function pad2(n) { return String(n).padStart(2, '0'); }

  // Điền sẵn giờ hiện tại (24h) để tiện dùng ngay
  function fillNow() {
    if (startInput && !startInput.value) {
      const now = new Date();
      startInput.value = pad2(now.getHours()) + ':' + pad2(now.getMinutes());
    }
  }
  fillNow();

  // Gõ số liên tục dạng HHMM -> tự hiển thị "HH:MM", ký tự thứ 3-4 luôn là phút
  startInput.addEventListener('input', () => {
    let digits = startInput.value.replace(/\D/g, '').slice(0, 4);
    let formatted = digits;
    if (digits.length >= 3) {
      formatted = digits.slice(0, 2) + ':' + digits.slice(2);
    } else if (digits.length >= 1) {
      formatted = digits;
    }
    startInput.value = formatted;
  });

  // Enter ở 1 ô -> nhảy qua ô kế tiếp, bôi đen sẵn nội dung để gõ đè
  function goNext(nextEl) {
    if (!nextEl) return;
    nextEl.focus();
    if (typeof nextEl.select === 'function') nextEl.select();
  }

  startInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); goNext(rateInput); }
  });
  volumeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); goNext(rateInput); }
  });
  rateInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); calc(); }
  });

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

  function parseStart(str) {
    const m = /^([0-9]{1,2}):([0-9]{2})$/.exec((str || '').trim());
    if (!m) return null;
    const h = parseInt(m[1], 10);
    const mi = parseInt(m[2], 10);
    if (h < 0 || h > 23 || mi < 0 || mi > 59) return null;
    return { h, mi };
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
    let dHH = hh, dMM = mm;
    if (dMM === 60) { dMM = 0; dHH += 1; }

    durationEl.textContent = (dHH > 0 ? dHH + ' giờ ' : '') + dMM + ' phút';

    const parsedStart = parseStart(startInput.value);
    let startDate = new Date();
    if (parsedStart) startDate.setHours(parsedStart.h, parsedStart.mi, 0, 0);

    const endDate = new Date(startDate.getTime() + totalMinutes * 60000);
    const nextDay = endDate.getDate() !== startDate.getDate() || endDate.getMonth() !== startDate.getMonth();

    endTagEl.textContent = pad2(endDate.getHours()) + ':' + pad2(endDate.getMinutes()) + (nextDay ? ' (hôm sau)' : '');
  }

  calcBtn.addEventListener('click', calc);

  // ---- BMI ----
  const wInput = document.getElementById('bmiWeight');
  const hInput = document.getElementById('bmiHeight');
  const bmiBtn = document.getElementById('bmiCalcBtn');
  const bmiErr = document.getElementById('bmiErr');
  const bmiResult = document.getElementById('bmiResult');
  const bmiValueEl = document.getElementById('bmiValue');
  const bmiTagEl = document.getElementById('bmiTag');

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
  }

  bmiBtn.addEventListener('click', calcBmi);
})();
