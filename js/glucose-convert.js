(function () {
  const MGDL_PER_MMOL = 18.0182;

  const input = document.getElementById('gcInput');
  const inputLabel = document.getElementById('gcInputLabel');
  const inputBadge = document.getElementById('gcInputUnitBadge');
  const outputValue = document.getElementById('gcOutputValue');
  const outputBadge = document.getElementById('gcOutputUnitBadge');
  const swapBtn = document.getElementById('gcSwapBtn');
  const alertEl = document.getElementById('gcAlert');

  if (!input) return;

  // unit === 'mmol' -> nhập mmol/L, ra mg/dL (mặc định)
  // unit === 'mg'   -> nhập mg/dL, ra mmol/L
  let unit = 'mmol';

  function classify(mgdl) {
    if (mgdl < 70) {
      return { level: 'low', icon: '🔵', text: 'Hạ đường huyết — cần xử trí ngay (bổ sung đường nhanh, theo dõi sát).' };
    }
    if (mgdl > 200) {
      return { level: 'high', icon: '🔴', text: 'Đường huyết bất kỳ tăng cao — nghi ngờ Đái tháo đường, cần đánh giá thêm HbA1c.' };
    }
    if (mgdl > 126) {
      return { level: 'high', icon: '🔴', text: 'Vượt ngưỡng đường huyết đói của ĐTĐ (>126 mg/dL / 7,0 mmol/L nếu đo lúc đói).' };
    }
    if (mgdl >= 100) {
      return { level: 'pre', icon: '🟠', text: 'Vùng rối loạn đường huyết đói — cảnh báo Tiền đái tháo đường (100–125 mg/dL).' };
    }
    return { level: 'normal', icon: '🟢', text: 'Trong giới hạn bình thường.' };
  }

  function renderAlert(mgdl) {
    const c = classify(mgdl);
    alertEl.className = 'gc-alert ' + c.level;
    alertEl.innerHTML = '<span class="gc-icon">' + c.icon + '</span><span>' + c.text + '</span>';
  }

  function resetAlert() {
    const unitLabel = unit === 'mmol' ? 'mmol/L' : 'mg/dL';
    alertEl.className = 'gc-alert neutral';
    alertEl.innerHTML = '<span class="gc-icon">ℹ️</span><span>Nhập chỉ số ' + unitLabel + ' để xem phân loại</span>';
  }

  function fmt(n) {
    return (Math.round(n * 10) / 10).toString().replace('.', ',');
  }

  function updateLabels() {
    if (unit === 'mmol') {
      inputLabel.textContent = 'Chỉ số đường huyết (mmol/L)';
      inputBadge.textContent = 'mmol/L';
      outputBadge.textContent = 'mg/dL';
      input.placeholder = 'VD: 6.6';
    } else {
      inputLabel.textContent = 'Chỉ số đường huyết (mg/dL)';
      inputBadge.textContent = 'mg/dL';
      outputBadge.textContent = 'mmol/L';
      input.placeholder = 'VD: 126';
    }
  }

  function recalc() {
    const v = parseFloat(input.value);
    if (isNaN(v) || v < 0) {
      outputValue.textContent = '—';
      resetAlert();
      return;
    }

    let mgdl;
    if (unit === 'mmol') {
      mgdl = v * MGDL_PER_MMOL;
      outputValue.textContent = fmt(mgdl);
    } else {
      mgdl = v;
      const mmol = v / MGDL_PER_MMOL;
      outputValue.textContent = fmt(mmol);
    }
    renderAlert(mgdl);
    if (typeof logUsage === 'function') logUsage('glucose_convert');
  }

  function swap() {
    // Đổi chiều: lấy giá trị output hiện tại (nếu có) làm input mới của đơn vị mới
    const currentOutput = outputValue.textContent;
    unit = unit === 'mmol' ? 'mg' : 'mmol';
    updateLabels();

    if (currentOutput !== '—') {
      input.value = currentOutput.replace(',', '.');
    } else {
      input.value = '';
    }

    swapBtn.classList.add('spin');
    setTimeout(() => swapBtn.classList.remove('spin'), 200);

    recalc();
    input.focus();
  }

  input.addEventListener('input', recalc);
  swapBtn.addEventListener('click', swap);

  updateLabels();
  recalc();
})();
