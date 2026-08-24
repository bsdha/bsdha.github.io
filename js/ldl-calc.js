(function () {
  const tcInput = document.getElementById('ldlTC');
  const hdlInput = document.getElementById('ldlHDL');
  const tgInput = document.getElementById('ldlTG');
  const calcBtn = document.getElementById('ldlCalcBtn');
  const resultEl = document.getElementById('ldlResult');
  const formulaBox = document.getElementById('ldlFormulaBox');
  const unitBtns = document.querySelectorAll('#page-ldl .unit-btn[data-unit]');

  let unit = 'mmol';

  function updateFormulaBox() {
    formulaBox.innerHTML =
      unit === 'mmol'
        ? 'Công thức đang dùng (mmol/L): <code>LDL-C = TC − HDL-C − TG/2.2</code>'
        : 'Công thức đang dùng (mg/dL): <code>LDL-C = TC − HDL-C − TG/5</code>';
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

  function calc() {
    logUsage('ldl_calc');
    const tc = parseFloat(tcInput.value);
    const hdl = parseFloat(hdlInput.value);
    const tg = parseFloat(tgInput.value);

    if (isNaN(tc) || isNaN(hdl) || isNaN(tg)) {
      resultEl.innerHTML = '<div class="ldl-warning">Vui lòng nhập đầy đủ và hợp lệ cả 3 chỉ số TC, HDL-C, TG.</div>';
      return;
    }

    const tgLimit = unit === 'mmol' ? 4.5 : 400;
    const divisor = unit === 'mmol' ? 2.2 : 5;
    const unitLabel = unit === 'mmol' ? 'mmol/L' : 'mg/dL';

    const ldl = tc - hdl - tg / divisor;
    const overLimit = tg >= tgLimit;
    const negative = ldl < 0;
    const invalid = overLimit || negative;

    const cardClass = invalid ? 'ldl-result-card invalid' : 'ldl-result-card';
    const badge = invalid ? '' : (() => {
      const c = classify(ldl, unit);
      return `<span class="ldl-badge ${c.cls}">${c.label}</span>`;
    })();

    let warningHtml = '';
    if (overLimit) {
      warningHtml = `<div class="ldl-warning">⚠ TG = ${tg} ${unitLabel} ≥ ${tgLimit} ${unitLabel}. Công thức Friedewald KHÔNG chính xác trong trường hợp này.</div>`;
    } else if (negative) {
      warningHtml = `<div class="ldl-warning">⚠ Kết quả tính ra âm, không có ý nghĩa lâm sàng. Vui lòng kiểm tra lại số liệu đầu vào hoặc định lượng LDL-C trực tiếp.</div>`;
    }

    let sampsonHtml = '';
    if (overLimit) {
      const tcMg = unit === 'mmol' ? tc * CHOL_FACTOR : tc;
      const hdlMg = unit === 'mmol' ? hdl * CHOL_FACTOR : hdl;
      const tgMg = unit === 'mmol' ? tg * TG_FACTOR : tg;
      const sampsonMg = sampsonLDL(tcMg, hdlMg, tgMg);
      const sampsonDisplay = unit === 'mmol' ? sampsonMg / CHOL_FACTOR : sampsonMg;

      if (sampsonMg < 0) {
        sampsonHtml = `
          <div class="ldl-result-card invalid" style="margin-top:10px;">
            <div class="ldl-note" style="margin-top:0;">Công thức Sampson (thay thế): kết quả âm, nên định lượng LDL-C trực tiếp bằng xét nghiệm.</div>
          </div>`;
      } else {
        const c = classify(sampsonDisplay, unit);
        sampsonHtml = `
          <div class="ldl-result-card" style="margin-top:10px;">
            <div class="ldl-note" style="margin-top:0; color:var(--text); font-weight:700;">Ước tính bằng công thức Sampson (phù hợp hơn Friedewald khi TG cao)</div>
            <div class="big" style="font-size:24px; margin-top:6px;">${sampsonDisplay.toFixed(2)}<span class="u">${unitLabel}</span></div>
            <span class="ldl-badge ${c.cls}">${c.label}</span>
            <div class="ldl-note">Nếu có điều kiện, vẫn nên ưu tiên định lượng LDL-C trực tiếp bằng xét nghiệm khi TG cao.</div>
          </div>`;
      }
    }

    resultEl.innerHTML = `
      <div class="${cardClass}">
        <div class="big">${invalid ? '—' : ldl.toFixed(2)}<span class="u">${unitLabel}</span></div>
        ${badge}
        ${warningHtml}
        <div class="ldl-note">
          Công thức Friedewald chỉ đáng tin cậy khi TG &lt; ${tgLimit} ${unitLabel} và bệnh nhân nhịn ăn trước lấy máu.
          Không dùng cho rối loạn lipoprotein đặc biệt (VD: dysbetalipoproteinemia).
        </div>
      </div>
      ${sampsonHtml}`;
  }

  calcBtn.addEventListener('click', calc);
  tcInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); hdlInput.focus(); } });
  hdlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); tgInput.focus(); } });
  tgInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); calc(); } });
})();
