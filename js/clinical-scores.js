(function () {
  var page = document.getElementById('page-clinicalscores');
  if (!page) return;

  // ---------- Tab switching (NEWS2 / VAS / Braden / Morse) ----------
  var tabBtns = page.querySelectorAll('#csTabs button');
  var toolPanels = page.querySelectorAll('.cs-tool');
  tabBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      tabBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var key = btn.dataset.tool;
      toolPanels.forEach(function (p) {
        p.style.display = (p.dataset.toolPanel === key) ? 'grid' : 'none';
      });
    });
  });

  function setStage(el, level, text) {
    el.className = 'stage' + (level ? ' cs-' + level : '');
    el.textContent = text; // dấu chấm màu được vẽ bằng CSS ::before, không cần chèn thẻ con
  }
  function num(id) {
    var v = parseFloat(document.getElementById(id).value);
    return isNaN(v) ? null : v;
  }
  function radioVal(name) {
    var el = page.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : null;
  }
  function radioSum(names) {
    return names.reduce(function (sum, name) {
      var v = radioVal(name);
      return sum + (v === null ? 0 : parseInt(v, 10));
    }, 0);
  }

  // ================= NEWS2 =================
  function scoreRR(v) { if (v === null) return 0; if (v <= 8) return 3; if (v <= 11) return 1; if (v <= 20) return 0; if (v <= 24) return 2; return 3; }
  function scoreSBP(v) { if (v === null) return 0; if (v <= 90) return 3; if (v <= 100) return 2; if (v <= 110) return 1; if (v <= 219) return 0; return 3; }
  function scorePulse(v) { if (v === null) return 0; if (v <= 40) return 3; if (v <= 50) return 1; if (v <= 90) return 0; if (v <= 110) return 1; if (v <= 130) return 2; return 3; }
  function scoreTemp(v) { if (v === null) return 0; if (v <= 35.0) return 3; if (v <= 36.0) return 1; if (v <= 38.0) return 0; if (v <= 39.0) return 1; return 2; }
  function scoreAVPU(v) { return v === 'alert' ? 0 : 3; }
  function scoreO2(v) { return v === 'yes' ? 2 : 0; }
  function scoreSpO2(v, scale, onO2) {
    if (v === null) return 0;
    if (scale === '1') {
      if (v <= 91) return 3; if (v <= 93) return 2; if (v <= 95) return 1; return 0;
    } else {
      if (v <= 83) return 3; if (v <= 85) return 2; if (v <= 87) return 1; if (v <= 92) return 0;
      if (onO2) { if (v <= 94) return 1; if (v <= 96) return 2; return 3; }
      return 3;
    }
  }

  function updateNews2() {
    var rr = num('csRr'), spo2 = num('csSpo2'), scale = radioVal('csSpo2Scale') || '1',
      o2 = radioVal('csO2') || 'no', sbp = num('csSbp'), pulse = num('csPulse'),
      temp = num('csTemp'), avpu = radioVal('csAvpu') || 'alert';

    var sRR = scoreRR(rr), sSpO2 = scoreSpO2(spo2, scale, o2 === 'yes'), sO2 = scoreO2(o2),
      sSBP = scoreSBP(sbp), sPulse = scorePulse(pulse), sTemp = scoreTemp(temp), sAVPU = scoreAVPU(avpu);

    var total = sRR + sSpO2 + sO2 + sSBP + sPulse + sTemp + sAVPU;
    var anyThree = [sRR, sSpO2, sSBP, sPulse, sTemp, sAVPU].some(function (x) { return x === 3; });

    document.getElementById('csSubRr').textContent = sRR;
    document.getElementById('csSubSpo2').textContent = sSpO2;
    document.getElementById('csSubO2').textContent = sO2;
    document.getElementById('csSubSbp').textContent = sSBP;
    document.getElementById('csSubPulse').textContent = sPulse;
    document.getElementById('csSubTemp').textContent = sTemp;
    document.getElementById('csSubAvpu').textContent = sAVPU;
    document.getElementById('csNews2Value').textContent = total;

    var badge = document.getElementById('csNews2Badge'), note = document.getElementById('csNews2Note');
    if (total >= 7) {
      setStage(badge, 'crit', 'Cao — cần đánh giá khẩn');
      note.textContent = 'Tổng điểm ≥7: nguy cơ mất bù cao, cần đánh giá bác sĩ khẩn cấp và theo dõi liên tục.';
    } else if (total >= 5) {
      setStage(badge, 'high', 'Trung bình — cao');
      note.textContent = 'Tổng điểm 5–6: tăng tần suất theo dõi, báo bác sĩ trực để đánh giá kịp thời.';
    } else if (anyThree) {
      setStage(badge, 'mid', 'Thấp — trung bình');
      note.textContent = 'Có một chỉ số đạt điểm 3: theo dõi sát dù tổng điểm còn thấp.';
    } else {
      setStage(badge, '', 'Thấp');
      note.textContent = 'Theo dõi và đánh giá lại theo diễn biến lâm sàng.';
    }
  }
  ['csRr', 'csSpo2', 'csSbp', 'csPulse', 'csTemp'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', updateNews2);
  });
  page.querySelectorAll('input[name="csSpo2Scale"], input[name="csO2"], input[name="csAvpu"]').forEach(function (el) {
    el.addEventListener('change', updateNews2);
  });
  updateNews2();

  // ================= VAS =================
  function updateVas() {
    var v = parseInt(document.getElementById('csVasSlider').value, 10);
    document.getElementById('csVasValue').textContent = v;
    var badge = document.getElementById('csVasBadge');
    if (v === 0) { setStage(badge, '', 'Không đau'); }
    else if (v <= 3) { setStage(badge, '', 'Đau nhẹ'); }
    else if (v <= 6) { setStage(badge, 'mid', 'Đau vừa'); }
    else if (v <= 8) { setStage(badge, 'high', 'Đau nặng'); }
    else { setStage(badge, 'crit', 'Đau dữ dội'); }
  }
  document.getElementById('csVasSlider').addEventListener('input', updateVas);
  updateVas();

  // ================= Braden =================
  var bradenNames = ['csBSensory', 'csBMoisture', 'csBActivity', 'csBMobility', 'csBNutrition', 'csBFriction'];
  function updateBraden() {
    var total = radioSum(bradenNames);
    document.getElementById('csBradenValue').textContent = total;
    var badge = document.getElementById('csBradenBadge'), note = document.getElementById('csBradenNote');
    if (total <= 9) { setStage(badge, 'crit', 'Rất cao'); }
    else if (total <= 12) { setStage(badge, 'high', 'Cao'); }
    else if (total <= 14) { setStage(badge, 'mid', 'Trung bình'); }
    else if (total <= 18) { setStage(badge, 'mid', 'Nhẹ'); }
    else { setStage(badge, '', 'Không có nguy cơ rõ rệt'); }
    note.textContent = 'Điểm ' + total + '/23. Điểm thấp hơn tương ứng nguy cơ loét tỳ đè cao hơn.';
  }
  bradenNames.forEach(function (name) {
    page.querySelectorAll('input[name="' + name + '"]').forEach(function (el) {
      el.addEventListener('change', updateBraden);
    });
  });
  updateBraden();

  // ================= Morse =================
  var morseNames = ['csMHistory', 'csMSecondary', 'csMAid', 'csMIv', 'csMGait', 'csMMental'];
  function updateMorse() {
    var total = radioSum(morseNames);
    document.getElementById('csMorseValue').textContent = total;
    var badge = document.getElementById('csMorseBadge'), note = document.getElementById('csMorseNote');
    if (total >= 51) { setStage(badge, 'crit', 'Cao'); }
    else if (total >= 25) { setStage(badge, 'mid', 'Trung bình'); }
    else { setStage(badge, '', 'Thấp'); }
    note.textContent = 'Điểm ' + total + '/125. Đánh giá lại sau mỗi thay đổi tình trạng hoặc theo quy định khoa phòng.';
  }
  morseNames.forEach(function (name) {
    page.querySelectorAll('input[name="' + name + '"]').forEach(function (el) {
      el.addEventListener('change', updateMorse);
    });
  });
  updateMorse();

})();
