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

  // Điền sẵn giờ hiện tại (24h) và tốc độ mặc định để tiện dùng ngay
  function fillNow() {
    if (startInput && !startInput.value) {
      const now = new Date();
      startInput.value = pad2(now.getHours()) + ':' + pad2(now.getMinutes());
    }
    if (rateInput && !rateInput.value) {
      rateInput.value = '40';
    }
  }
  fillNow();

  // Enter ở 1 ô -> nhảy qua ô kế tiếp, bôi đen sẵn nội dung để gõ đè
  function goNext(nextEl) {
    if (!nextEl) return;
    nextEl.focus();
    if (typeof nextEl.select === 'function') nextEl.select();
  }

  // ---- Ô "Bắt đầu truyền lúc" dạng mặt nạ HH:MM ----
  // Luôn hiển thị đủ 4 số + 2 chấm, bôi xanh (chọn) đúng phần giờ/phút đang gõ,
  // gõ xong 2 số giờ tự nhảy qua phần phút, giới hạn giờ 00-23, phút 00-59.
  let timeSeg = 0;      // 0 = giờ, 1 = phút
  let timeBuf = '';     // các chữ số đã gõ trong phân đoạn hiện tại (chưa chốt)
  let timeHH = '00';
  let timeMM = '00';

  function timeSyncFromValue() {
    const m = /^([0-9]{2}):([0-9]{2})$/.exec(startInput.value || '');
    if (m) { timeHH = m[1]; timeMM = m[2]; } else { timeHH = '00'; timeMM = '00'; }
  }

  function timeRender() {
    startInput.value = timeHH + ':' + timeMM;
    if (timeSeg === 0) {
      startInput.setSelectionRange(0, 2);
    } else {
      startInput.setSelectionRange(3, 5);
    }
  }

  function timeSelectSeg(seg) {
    timeSeg = seg;
    timeBuf = '';
    timeRender();
  }

  timeSyncFromValue(); // đồng bộ giờ mặc định (giờ hiện tại) đã điền sẵn ở fillNow()

  startInput.addEventListener('focus', () => {
    timeSyncFromValue();
    timeSelectSeg(0);
  });

  startInput.addEventListener('click', () => {
    // Luôn chọn lại theo phân đoạn hiện tại thay vì để con trỏ rời rạc
    timeRender();
  });

  startInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (timeSeg === 0) { timeSelectSeg(1); } else { goNext(rateInput); }
      return;
    }
    if (e.key === 'Tab') {
      if (timeSeg === 0) { e.preventDefault(); timeSelectSeg(1); }
      return;
    }
    if (e.key === 'Backspace') {
      e.preventDefault();
      timeBuf = '';
      if (timeSeg === 0) { timeHH = '00'; } else { timeMM = '00'; }
      timeRender();
      return;
    }
    if (e.key === 'ArrowLeft') { e.preventDefault(); timeSelectSeg(0); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); timeSelectSeg(1); return; }

    if (!/^[0-9]$/.test(e.key)) { e.preventDefault(); return; }
    e.preventDefault();

    const maxVal = timeSeg === 0 ? 23 : 59;
    timeBuf += e.key;

    if (timeBuf.length === 1) {
      const d = parseInt(timeBuf, 10);
      // Nếu số đầu tiên đã vượt quá mức có thể ghép thêm số thứ 2 hợp lệ
      // (vd giờ gõ "5" -> hiểu luôn là 05 và nhảy qua phút)
      const maxFirstDigit = timeSeg === 0 ? 2 : 5;
      if (d > maxFirstDigit) {
        const val = pad2(d);
        if (timeSeg === 0) { timeHH = val; timeSelectSeg(1); }
        else { timeMM = val; timeBuf = ''; timeRender(); }
        return;
      }
      // Hiện tạm số vừa gõ, số còn lại giữ 0 và vẫn bôi xanh cả ô chờ số kế tiếp
      if (timeSeg === 0) { timeHH = pad2(d); } else { timeMM = pad2(d); }
      timeRender();
      return;
    }

    // Đã đủ 2 số cho phân đoạn
    let val = parseInt(timeBuf, 10);
    if (val > maxVal) val = maxVal;
    const formatted = pad2(val);
    if (timeSeg === 0) {
      timeHH = formatted;
      timeSelectSeg(1);
    } else {
      timeMM = formatted;
      timeBuf = '';
      timeRender();
    }
  });

  // Chặn dán nội dung không hợp lệ đè lên mặt nạ
  startInput.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text');
    const digits = text.replace(/\D/g, '').slice(0, 4);
    if (digits.length === 4) {
      let h = parseInt(digits.slice(0, 2), 10);
      let mi = parseInt(digits.slice(2, 4), 10);
      if (h > 23) h = 23;
      if (mi > 59) mi = 59;
      timeHH = pad2(h);
      timeMM = pad2(mi);
      timeSelectSeg(1);
    }
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
