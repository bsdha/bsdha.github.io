(function () {
  const tcInput = document.getElementById('ldlTC');
  const hdlInput = document.getElementById('ldlHDL');
  const tgInput = document.getElementById('ldlTG');
  const calcBtn = document.getElementById('ldlCalcBtn');
  const resultEl = document.getElementById('ldlResult');
  const formulaBox = document.getElementById('ldlFormulaBox');
  const unitBtns = document.querySelectorAll('#page-ldl .unit-btn[data-unit]');

  let unit = 'mmol';

  const FORMULA_HTML =
    '<b>Công thức Sampson/NIH</b> (mg/dL): <code>LDL-C = TC/0.948 − HDL-C/0.971 − (TG/8.56 + TG×non-HDL-C/2140 − TG²/16100) − 9.44</code><br>' +
    'non-HDL-C = TC − HDL-C. Giá trị nhập mmol/L được tự quy đổi sang mg/dL (TC, HDL-C × 38.67; TG × 88.57) rồi đổi lại kết quả.<br>' +
    'Khuyến cáo ACC/AHA 2026 (Class 1): dùng Martin/Hopkins hoặc Sampson/NIH thay cho Friedewald; không khuyến khích định lượng LDL-C trực tiếp thường quy. Sampson/NIH áp dụng cho TG &lt; 800 mg/dL (≈ 9.04 mmol/L).';

  function updateFormulaBox() {
    formulaBox.innerHTML = FORMULA_HTML;
  }

  unitBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      unit = btn.dataset.unit;
      unitBtns.forEach((b) => b.classList.toggle('active', b === btn));
      updateFormulaBox();
      resultEl.innerHTML = '';
    });
  });
  updateFormulaBox();

  function classify(ldl, unitUsed) {
    const mgdl = unitUsed === 'mmol' ? ldl * 38.67 : ldl;
    if (mgdl < 100) return { label: 'Tối ưu', cls: 'optimal' };
    if (mgdl < 130) return { label: 'Gần tối ưu', cls: 'optimal' };
    if (mgdl < 160) return { label: 'Giới hạn cao', cls: 'near' };
    if (mgdl < 190) return { label: 'Cao', cls: 'high' };
    return { label: 'Rất cao', cls: 'high' };
  }

  const CHOL_FACTOR = 38.67;
  const TG_FACTOR = 88.57;

  function sampsonLDL(tcMg, hdlMg, tgMg) {
    const nonHDL = tcMg - hdlMg;
    return (
      tcMg / 0.948 -
      hdlMg / 0.971 -
      (tgMg / 8.56 + (tgMg * nonHDL) / 2140 - (tgMg * tgMg) / 16100) -
      9.44
    );
  }

  const TG_MAX_MG = 800;
  const TG_FASTING_MG = 400;

  function calc() {
    logUsage('ldl_calc');
    const tc = parseFloat(tcInput.value);
    const hdl = parseFloat(hdlInput.value);
    const tg = parseFloat(tgInput.value);

    if (isNaN(tc) || isNaN(hdl) || isNaN(tg)) {
      resultEl.innerHTML = '<div class="ldl-warning">Vui lòng nhập đầy đủ và hợp lệ cả 3 chỉ số TC, HDL-C, TG.</div>';
      return;
    }

    const unitLabel = unit === 'mmol' ? 'mmol/L' : 'mg/dL';
    const tcMg = unit === 'mmol' ? tc * CHOL_FACTOR : tc;
    const hdlMg = unit === 'mmol' ? hdl * CHOL_FACTOR : hdl;
    const tgMg = unit === 'mmol' ? tg * TG_FACTOR : tg;

    const overLimit = tgMg >= TG_MAX_MG;
    const ldlMg = overLimit ? NaN : sampsonLDL(tcMg, hdlMg, tgMg);
    const negative = !overLimit && ldlMg < 0;
    const invalid = overLimit || negative;
    const ldl = unit === 'mmol' ? ldlMg / CHOL_FACTOR : ldlMg;
    const tgLimitDisplay = unit === 'mmol' ? (TG_MAX_MG / TG_FACTOR).toFixed(2) : TG_MAX_MG;

    const cardClass = invalid ? 'ldl-result-card invalid' : 'ldl-result-card';
    const badge = invalid ? '' : (() => {
      const c = classify(ldl, unit);
      return `<span class="ldl-badge ${c.cls}">${c.label}</span>`;
    })();

    const tgFastingDisplay = unit === 'mmol' ? (TG_FASTING_MG / TG_FACTOR).toFixed(2) : TG_FASTING_MG;
    let warningHtml = '';
    if (overLimit) {
      warningHtml = `<div class="ldl-warning">⚠ TG = ${tg} ${unitLabel} ≥ ${tgLimitDisplay} ${unitLabel}. Ngoài giới hạn áp dụng của công thức Sampson/NIH (TG &lt; 800 mg/dL); cần định lượng LDL-C trực tiếp hoặc beta-quantification.</div>`;
    } else if (negative) {
      warningHtml = `<div class="ldl-warning">⚠ Kết quả tính ra âm, không có ý nghĩa lâm sàng. Vui lòng kiểm tra lại số liệu đầu vào hoặc định lượng LDL-C trực tiếp.</div>`;
    }

    const fastingHtml = (!overLimit && tgMg >= TG_FASTING_MG)
      ? `<div class="ldl-warning">ℹ TG ≥ ${tgFastingDisplay} ${unitLabel}: nên lấy lại mẫu sau nhịn ăn để xác nhận (theo ACC/AHA 2026).</div>`
      : '';

    resultEl.innerHTML = `
      <div class="${cardClass}">
        <div class="big">${invalid ? '—' : ldl.toFixed(2)}<span class="u">${unitLabel}</span></div>
        ${badge}
        ${warningHtml}
        ${fastingHtml}
        <div class="ldl-note">
          Tính theo công thức Sampson/NIH (khuyến cáo ACC/AHA 2026, Class 1) — chính xác hơn Friedewald, nhất là khi TG cao hoặc LDL-C thấp; có thể dùng mẫu không nhịn ăn khi TG &lt; 400 mg/dL (4.52 mmol/L).
          Công thức vẫn có sai số, nhất là khi TG cao và LDL-C thấp; cần cẩn trọng khi diễn giải gần các ngưỡng mục tiêu.
          </div>
      </div>`;
  }

  calcBtn.addEventListener('click', calc);
  tcInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); hdlInput.focus(); } });
  hdlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); tgInput.focus(); } });
  tgInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); calc(); } });
})();
