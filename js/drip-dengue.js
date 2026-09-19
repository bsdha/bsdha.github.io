(function () {
  const toggle = document.getElementById('dxToggle');
  const dtCard = document.getElementById('dtCard');
  const dtTitle = document.getElementById('dtTitle');
  const dtSub = document.getElementById('dtSub');
  const dtSimpleBody = document.getElementById('dtSimpleBody');
  const dtErr = document.getElementById('dtErr');
  const dtCalcBtn = document.getElementById('dtCalcBtn');
  const dtResult = document.getElementById('dtResult');
  const body = document.getElementById('dxBody');
  const ageToggle = document.getElementById('dxAgeToggle');
  const stageToggle = document.getElementById('dxStageToggle');
  const stageHint = document.getElementById('dxStageHint');
  const protocolNote = document.getElementById('dxProtocolNote');
  const warnNote = document.querySelector('#dtCard .dx-warn-note');
  const weightInput = document.getElementById('dxWeight');
  const vol1Input = document.getElementById('dxVol1');
  const vol2Input = document.getElementById('dxVol2');
  const volUsedInput = document.getElementById('dxVolUsed');
  const volTotalInput = document.getElementById('dxVolTotal');
  const rateInput = document.getElementById('dxRateMlKgH');
  const startInput = document.getElementById('dxStart');
  const calcBtn = document.getElementById('dxCalcBtn');
  const errEl = document.getElementById('dxErr');
  const resultEl = document.getElementById('dxResult');
  const rateMlHEl = document.getElementById('dxRateMlH');
  const rateGttEl = document.getElementById('dxRateGtt');
  const volLeftEl = document.getElementById('dxVolLeft');
  const durLeftEl = document.getElementById('dxDurLeft');
  const endTagEl = document.getElementById('dxEndTag');
  const durationNoteEl = document.getElementById('dxDurationNote');

  if (!toggle) return; // Trang chưa render

  const TITLE_SIMPLE = '💧 Tính giờ kết thúc truyền dịch';
  const SUB_SIMPLE = 'Nhập thời điểm bắt đầu, thể tích chai dịch và tốc độ truyền (giọt/phút) để tính giờ truyền xong, tiện ghi hồ sơ.';
  const TITLE_DX = '🦟 Bù dịch sốt xuất huyết Dengue có dấu hiệu cảnh báo';
  const SUB_DX = 'Tính tốc độ truyền theo cân nặng, gộp thể tích tối đa 2 chai dịch, suy ra thời gian hết dịch ở từng mức liều theo phác đồ Quyết định 2760/QĐ-BYT (2023).';

  // Phác đồ truyền dịch SXHD có dấu hiệu cảnh báo (Quyết định 2760/QĐ-BYT, 2023)
  // B1 (trẻ em < 16 tuổi) và B2 (người lớn ≥ 16 tuổi), giai đoạn CHƯA SỐC.
  const PROTOCOLS = {
    child: {
      label: 'Trẻ em (&lt; 16 tuổi)',
      stages: [
        { id: 'load', name: '6–7 mL/kg/giờ', rate: 6, hint: 'Liều khởi đầu, truyền trong 1–3 giờ đầu.' },
        { id: 'mid', name: '5 mL/kg/giờ', rate: 5, hint: 'Nếu chưa cải thiện rõ / Hct còn cao: giảm còn 5 mL/kg/giờ, truyền 2–4 giờ.' },
        { id: 'low', name: '3 mL/kg/giờ', rate: 3, hint: 'Mạch, HA ổn định, Hct giảm, nước tiểu ≥ 0,5–1 mL/kg/giờ: giảm còn 3 mL/kg/giờ. Có thể ngưng dịch sau 24–48 giờ nếu lâm sàng tiếp tục ổn.' }
      ],
      note: 'Theo Mục B1 (trẻ em &lt; 16 tuổi): 6–7 mL/kg/giờ × 1–3 giờ → 5 mL/kg/giờ × 2–4 giờ → nếu ổn, giảm 3 mL/kg/giờ, xem xét ngưng dịch sau 24–48 giờ. Thời gian truyền dịch nói chung không quá 24–48 giờ. Nếu mạch nhanh, HA tụt/kẹt hoặc Hct tăng: xử trí theo phác đồ SXHD nặng/sốc, ngoài phạm vi công cụ này.'
    },
    adult: {
      label: 'Người lớn (≥ 16 tuổi)',
      stages: [
        { id: 'load', name: '6 mL/kg/giờ', rate: 6, hint: 'Liều khởi đầu, truyền trong 1–2 giờ đầu.' },
        { id: 'mid', name: '3 mL/kg/giờ', rate: 3, hint: 'Sau liều khởi đầu: giảm còn 3 mL/kg/giờ, truyền 2–4 giờ.' },
        { id: 'low', name: '1,5 mL/kg/giờ', rate: 1.5, hint: 'Mạch, HA ổn định, Hct giảm, nước tiểu ≥ 0,5–1 mL/kg/giờ: giảm còn 1,5 mL/kg/giờ, duy trì 6–18 giờ. Có thể ngưng dịch sau 12–24 giờ nếu lâm sàng tiếp tục ổn.' }
      ],
      note: 'Theo Mục B2 (người lớn ≥ 16 tuổi): 6 mL/kg/giờ × 1–2 giờ → 3 mL/kg/giờ × 2–4 giờ → nếu ổn, giảm 1,5 mL/kg/giờ × 6–18 giờ, xem xét ngưng dịch sau 12–24 giờ. Nếu mạch nhanh nhẹ, HA kẹt/tụt hoặc Hct tăng: xử trí theo phác đồ SXHD nặng/sốc, ngoài phạm vi công cụ này.'
    }
  };

  let currentAge = 'child';
  let currentStage = 'load';
  let dropFactor = 20;

  function pad2(n) { return String(n).padStart(2, '0'); }

  function renderStages() {
    const proto = PROTOCOLS[currentAge];
    stageToggle.innerHTML = '';
    proto.stages.forEach((st) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.stage = st.id;
      btn.textContent = st.name;
      if (st.id === currentStage) btn.classList.add('active');
      stageToggle.appendChild(btn);
    });
    protocolNote.innerHTML = proto.note;
    applyStage();
  }

  function applyStage() {
    const proto = PROTOCOLS[currentAge];
    let st = proto.stages.find((s) => s.id === currentStage);
    if (!st) { st = proto.stages[0]; currentStage = st.id; }
    rateInput.value = st.rate;
    stageHint.textContent = st.hint;
  }

  ageToggle.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-age]');
    if (!btn) return;
    ageToggle.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentAge = btn.dataset.age;
    currentStage = 'load';
    renderStages();
  });

  stageToggle.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-stage]');
    if (!btn) return;
    stageToggle.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentStage = btn.dataset.stage;
    applyStage();
  });

  function setMode(isDx) {
    dtCard.classList.toggle('dx-mode', isDx);
    dtTitle.textContent = isDx ? TITLE_DX : TITLE_SIMPLE;
    dtSub.textContent = isDx ? SUB_DX : SUB_SIMPLE;

    dtSimpleBody.classList.toggle('mode-hidden', isDx);
    dtErr.classList.toggle('mode-hidden', isDx);
    dtCalcBtn.classList.toggle('mode-hidden', isDx);
    dtResult.classList.toggle('mode-hidden', isDx);

    body.classList.toggle('mode-hidden', !isDx);
    errEl.classList.toggle('mode-hidden', !isDx);
    calcBtn.classList.toggle('mode-hidden', !isDx);
    resultEl.classList.toggle('mode-hidden', !isDx);
    protocolNote.classList.toggle('mode-hidden', !isDx);
    if (warnNote) warnNote.classList.toggle('mode-hidden', !isDx);

    // Ẩn kết quả cũ và lỗi khi đổi chế độ, tránh nhầm lẫn
    dtErr.classList.remove('show');
    dtResult.classList.remove('show');
    errEl.classList.remove('show');
    resultEl.classList.remove('show');
  }

  toggle.addEventListener('change', () => setMode(toggle.checked));

  function reuseDropFactor() {
    const active = document.querySelector('#dtFactorToggle button.active');
    dropFactor = active ? parseFloat(active.dataset.factor) : 20;
  }

  function recalcTotal() {
    const v1 = parseFloat(vol1Input.value) || 0;
    const v2 = parseFloat(vol2Input.value) || 0;
    volTotalInput.value = (v1 + v2) > 0 ? String(v1 + v2) : '0';
  }
  vol1Input.addEventListener('input', recalcTotal);
  vol2Input.addEventListener('input', recalcTotal);

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
    const weight = parseFloat(weightInput.value);
    const v1 = parseFloat(vol1Input.value) || 0;
    const v2 = parseFloat(vol2Input.value) || 0;
    const used = parseFloat(volUsedInput.value) || 0;
    const mlKgH = parseFloat(rateInput.value);
    const total = v1 + v2;

    if (!(weight > 0) || !(v1 > 0) || !(mlKgH > 0)) {
      showErr(true);
      return;
    }
    showErr(false);
    reuseDropFactor();

    const volLeft = Math.max(total - used, 0);
    const rateMlH = mlKgH * weight;
    const gttMin = (rateMlH * dropFactor) / 60;
    const totalMinutes = (volLeft / rateMlH) * 60;
    const hh = Math.floor(totalMinutes / 60);
    const mm = Math.round(totalMinutes % 60);
    let dHH = hh, dMM = mm;
    if (dMM === 60) { dMM = 0; dHH += 1; }

    rateMlHEl.textContent = rateMlH.toFixed(1).replace(/\.0$/, '');
    rateGttEl.textContent = Math.round(gttMin);
    volLeftEl.textContent = volLeft.toFixed(0);
    durLeftEl.textContent = (dHH > 0 ? dHH + ' giờ ' : '') + dMM + ' phút';

    const parsedStart = parseStart(startInput.value);
    let startDate = new Date();
    if (parsedStart) startDate.setHours(parsedStart.h, parsedStart.mi, 0, 0);
    const endDate = new Date(startDate.getTime() + totalMinutes * 60000);
    const nextDay = endDate.getDate() !== startDate.getDate() || endDate.getMonth() !== startDate.getMonth();
    endTagEl.textContent = pad2(endDate.getHours()) + ':' + pad2(endDate.getMinutes()) + (nextDay ? ' (hôm sau)' : '');

    const proto = PROTOCOLS[currentAge];
    const st = proto.stages.find((s) => s.id === currentStage);
    durationNoteEl.textContent = 'Sau khi truyền hết ở mức này, đánh giá lại mạch/HA/nước tiểu/Hct rồi quyết định: giữ nguyên, chuyển mức tốc độ tiếp theo, hoặc ngưng dịch. ' + (st ? st.hint : '');

    if (typeof logUsage === 'function') logUsage('dichtruyen_dengue_calc');
  }

  calcBtn.addEventListener('click', calc);

  setMode(false);
  renderStages();
  recalcTotal();
})();
