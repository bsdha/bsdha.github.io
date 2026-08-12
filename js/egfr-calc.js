(function () {
  const unitToggle = document.getElementById('egfrUnitToggle');
  const scrLabel = document.getElementById('egfrScrLabel');
  const scrInput = document.getElementById('egfrScr');
  let unit = 'umol';

  unitToggle.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    unit = btn.dataset.unit;
    [...unitToggle.children].forEach(b => b.classList.toggle('active', b === btn));
    if (unit === 'umol') {
      scrLabel.textContent = 'Creatinin huyết thanh (µmol/L)';
      scrInput.placeholder = 'VD: 88.4';
    } else {
      scrLabel.textContent = 'Creatinin huyết thanh (mg/dL)';
      scrInput.placeholder = 'VD: 1.00';
    }
    document.getElementById('egfrResult').classList.remove('show');
  });

  function classifyStage(egfr) {
    if (egfr >= 90) return { tag: 'G1', color: 'var(--green)', bg: 'var(--green-light)', border: 'var(--green-border)', desc: 'Chức năng thận bình thường hoặc cao (G1). Nếu có tổn thương thận kèm theo (protein niệu...), cần đánh giá thêm.' };
    if (egfr >= 60) return { tag: 'G2', color: 'var(--green)', bg: 'var(--green-light)', border: 'var(--green-border)', desc: 'Giảm nhẹ mức lọc cầu thận (G2). Thường chưa có ý nghĩa lâm sàng nếu không kèm tổn thương thận.' };
    if (egfr >= 45) return { tag: 'G3a', color: 'var(--amber)', bg: 'var(--amber-light)', border: '#5f4a1a', desc: 'Giảm nhẹ - trung bình (G3a). Cần theo dõi định kỳ chức năng thận.' };
    if (egfr >= 30) return { tag: 'G3b', color: 'var(--amber)', bg: 'var(--amber-light)', border: '#5f4a1a', desc: 'Giảm trung bình - nặng (G3b). Nên hội chẩn chuyên khoa Thận nếu chưa theo dõi.' };
    if (egfr >= 15) return { tag: 'G4', color: 'var(--red)', bg: 'var(--red-light)', border: 'var(--red-border)', desc: 'Giảm nặng (G4). Cần theo dõi sát và chuẩn bị các phương án điều trị thay thế thận.' };
    return { tag: 'G5', color: 'var(--red)', bg: 'var(--red-light)', border: 'var(--red-border)', desc: 'Suy thận giai đoạn cuối (G5). Cần đánh giá điều trị thay thế thận (lọc máu/ghép thận).' };
  }

  document.getElementById('egfrCalcBtn').addEventListener('click', () => {
    logUsage('egfr_calc');
    const age = parseFloat(document.getElementById('egfrAge').value);
    const sex = document.getElementById('egfrSex').value;
    let scrRaw = parseFloat(scrInput.value);
    const errEl = document.getElementById('egfrErr');
    const resultEl = document.getElementById('egfrResult');

    const valid = Number.isFinite(age) && age >= 18 && age <= 120 && Number.isFinite(scrRaw) && scrRaw > 0;
    if (!valid) {
      errEl.classList.add('show');
      resultEl.classList.remove('show');
      return;
    }
    errEl.classList.remove('show');

    let scrMgdl = unit === 'umol' ? scrRaw / 88.4 : scrRaw;

    const isFemale = sex === 'female';
    const kappa = isFemale ? 0.7 : 0.9;
    const alpha = isFemale ? -0.241 : -0.302;

    const ratio = scrMgdl / kappa;
    const minPart = Math.pow(Math.min(ratio, 1), alpha);
    const maxPart = Math.pow(Math.max(ratio, 1), -1.200);
    let egfr = 142 * minPart * maxPart * Math.pow(0.9938, age);
    if (isFemale) egfr *= 1.012;

    const rounded = Math.round(egfr * 10) / 10;
    const stage = classifyStage(rounded);

    document.getElementById('egfrValue').textContent = rounded.toFixed(1);
    const tagEl = document.getElementById('egfrStageTag');
    tagEl.textContent = stage.tag;
    tagEl.style.color = stage.color;
    tagEl.style.background = stage.bg;
    tagEl.style.border = `1px solid ${stage.border}`;
    document.getElementById('egfrStageDesc').textContent = stage.desc;

    resultEl.classList.add('show');
  });

  scrInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('egfrCalcBtn').click();
  });
  document.getElementById('egfrAge').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('egfrCalcBtn').click();
  });
})();
