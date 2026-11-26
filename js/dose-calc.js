/* Trang "Tính liều & dịch truyền" (/tinh-lieu) — gộp 4 công cụ đơn giản vào 1 trang:
   1) Liều hạ sốt theo cân nặng  2) Bơm tiêm điện / thuốc vận mạch
   3) Cân bằng dịch vào - ra     4) Dịch duy trì theo cân nặng (Nhi)
   5) Insulin hiệu chỉnh (thang trượt / công thức 1800-1500)
   Mọi phép tính chạy ngay trên trình duyệt, KHÔNG gửi/lưu dữ liệu bệnh nhân lên máy chủ. */
(function () {
  var root = document.getElementById('dcRoot');
  if (!root) return;

  /* ---------- CSS (giới hạn trong #page-dosecalc, dùng chung biến màu của trang) ---------- */
  var css = [
    '#page-dosecalc main{flex:1;padding:40px 24px;display:flex;justify-content:center}',
    '#page-dosecalc .panel-wrap{width:100%;max-width:760px}',
    '#page-dosecalc .card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:26px}',
    '#page-dosecalc .card h1{margin:0 0 6px;font-size:19px;font-weight:800}',
    '#page-dosecalc .card .sub{margin:0 0 18px;font-size:13px;color:var(--muted);line-height:1.5}',
    '#page-dosecalc .dc-tabs{display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:8px;margin-bottom:18px}',
    '#page-dosecalc .dc-tab{border:1px solid var(--border);background:var(--field);color:var(--text);border-radius:12px;padding:10px 6px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:700;line-height:1.25;text-align:center}',
    '#page-dosecalc .dc-tab .ic{display:block;font-size:20px;margin-bottom:3px}',
    '#page-dosecalc .dc-tab.active{border-color:var(--green);background:var(--green-light);color:var(--green)}',
    '#page-dosecalc .dc-panel{display:none}#page-dosecalc .dc-panel.active{display:block}',
    '#page-dosecalc .dc-h{margin:0 0 4px;font-size:15px;font-weight:800}',
    '#page-dosecalc .dc-d{margin:0 0 14px;font-size:12.5px;color:var(--muted);line-height:1.5}',
    '#page-dosecalc .row{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}',
    '#page-dosecalc .field label{display:block;font-size:12.5px;color:var(--muted);margin-bottom:6px}',
    '#page-dosecalc .field input,#page-dosecalc .field select{width:100%;background:var(--field);border:1px solid var(--border);border-radius:10px;padding:11px 12px;color:var(--text);font-size:14px;outline:none;font-family:inherit}',
    '#page-dosecalc .field input:focus,#page-dosecalc .field select:focus{border-color:var(--blue)}',
    '#page-dosecalc .dc-chk{display:flex;gap:8px;align-items:center;font-size:13px;margin:0 0 14px;color:var(--text)}',
    '#page-dosecalc .calc-btn{width:100%;padding:13px;border:none;border-radius:10px;background:var(--green);color:#0b1a18;font-size:15px;font-weight:800;cursor:pointer;margin-bottom:14px}',
    '#page-dosecalc .calc-btn:hover{filter:brightness(1.05)}',
    '#page-dosecalc .err{color:var(--red);font-size:13px;margin:-6px 0 14px;display:none}#page-dosecalc .err.show{display:block}',
    '#page-dosecalc .dc-res{border:1px solid var(--border);border-radius:12px;padding:16px;display:none}#page-dosecalc .dc-res.show{display:block}',
    '#page-dosecalc .dc-big{font-size:28px;font-weight:800;line-height:1.15}',
    '#page-dosecalc .dc-big small{font-size:13px;color:var(--muted);font-weight:600;margin-left:4px}',
    '#page-dosecalc .dc-line{margin-top:8px;font-size:13.5px;line-height:1.5}',
    '#page-dosecalc .dc-line b{font-weight:800}',
    '#page-dosecalc .dc-tag{display:inline-block;margin-top:10px;padding:4px 11px;border-radius:999px;font-size:12px;font-weight:700}',
    '#page-dosecalc .dc-tag.ok{background:var(--green-light);color:var(--green)}',
    '#page-dosecalc .dc-tag.warn{background:var(--amber-light);color:var(--amber)}',
    '#page-dosecalc .dc-tag.bad{background:var(--red-dark);color:#fff}',
    '#page-dosecalc table.dc-tb{width:100%;border-collapse:collapse;margin-top:12px;font-size:12.5px}',
    '#page-dosecalc .dc-tb td,#page-dosecalc .dc-tb th{border-top:1px solid var(--border);padding:6px 8px;text-align:left}',
    '#page-dosecalc .dc-tb th{color:var(--muted);font-weight:700}',
    '#page-dosecalc .formula-note{margin-top:14px;font-size:12px;color:var(--muted);background:var(--field);border:1px solid var(--border);border-radius:10px;padding:10px 12px;line-height:1.6}',
    '#page-dosecalc .dc-warn{margin-top:14px;font-size:12.5px;background:var(--amber-light);color:var(--amber);border-radius:10px;padding:10px 12px;line-height:1.55}',
    '@media(max-width:600px){#page-dosecalc main{padding:20px 12px}#page-dosecalc .row{grid-template-columns:1fr}#page-dosecalc .dc-tabs{grid-template-columns:1fr 1fr}}'
  ].join('\n');
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  /* ---------- tiện ích ---------- */
  function $(id) { return document.getElementById(id); }
  function num(id) {
    var el = $(id);
    if (!el) return NaN;
    var v = String(el.value || '').replace(',', '.').trim();
    return v === '' ? NaN : parseFloat(v);
  }
  function fmt(n, d) { return n.toLocaleString('vi-VN', { maximumFractionDigits: d == null ? 1 : d }); }
  function log(a) { if (typeof logUsage === 'function') logUsage(a); }
  function showErr(p, msg) {
    var e = $(p + 'Err'), r = $(p + 'Res');
    if (msg) { e.textContent = msg; e.classList.add('show'); r.classList.remove('show'); }
    else { e.classList.remove('show'); }
  }
  function showRes(p, html) { var r = $(p + 'Res'); r.innerHTML = html; r.classList.add('show'); }
  function field(id, label, ph, extra) {
    return '<div class="field"><label for="' + id + '">' + label + '</label>' +
      '<input type="text" id="' + id + '" placeholder="' + (ph || '') + '" inputmode="decimal" autocomplete="off"' + (extra || '') + '></div>';
  }
  function foot(p, label) {
    return '<div class="err" id="' + p + 'Err"></div><button type="button" class="calc-btn" id="' + p + 'Btn">' + label + '</button><div class="dc-res" id="' + p + 'Res"></div>';
  }

  /* ---------- 1) Liều hạ sốt ---------- */
  var DRUGS = {
    para: { name: 'Paracetamol', lo: 10, hi: 15, gap: 'cách nhau tối thiểu 4–6 giờ', dayMax: 60, capDose: 1000, capDay: 4000,
      forms: [['Siro 160 mg/5 mL', 32, 'mL'], ['Gói 80 mg', 80, 'gói'], ['Gói 150 mg', 150, 'gói'], ['Gói 250 mg', 250, 'gói'], ['Viên 500 mg', 500, 'viên']],
      warn: 'Không dùng cùng lúc 2 chế phẩm đều có paracetamol. Trẻ có bệnh gan hoặc suy dinh dưỡng nặng cần hỏi bác sĩ.' },
    ibu: { name: 'Ibuprofen', lo: 5, hi: 10, gap: 'cách nhau tối thiểu 6–8 giờ', dayMax: 40, capDose: 400, capDay: 1200,
      forms: [['Siro 100 mg/5 mL', 20, 'mL'], ['Viên 200 mg', 200, 'viên'], ['Viên 400 mg', 400, 'viên']],
      warn: 'Chỉ dùng cho trẻ từ 6 tháng tuổi. KHÔNG dùng khi nghi/đang sốt xuất huyết, mất nước, suy thận, loét dạ dày – tá tràng.' }
  };
  var feverHtml =
    '<h2 class="dc-h">🌡️ Liều hạ sốt theo cân nặng</h2>' +
    '<p class="dc-d">Tính khoảng liều mỗi lần theo mg/kg và quy đổi ra dạng bào chế thường dùng.</p>' +
    '<div class="row">' + field('fvKg', 'Cân nặng (kg)', 'VD: 18') +
    '<div class="field"><label for="fvDrug">Thuốc</label><select id="fvDrug"><option value="para">Paracetamol (10–15 mg/kg/lần)</option><option value="ibu">Ibuprofen (5–10 mg/kg/lần)</option></select></div></div>' +
    '<div class="row"><div class="field"><label for="fvForm">Dạng bào chế</label><select id="fvForm"></select></div></div>' +
    foot('fv', 'Tính liều');

  function fillForms() {
    var d = DRUGS[$('fvDrug').value], s = $('fvForm'), h = '<option value="-1">Chỉ tính mg</option>';
    d.forms.forEach(function (f, i) { h += '<option value="' + i + '">' + f[0] + '</option>'; });
    s.innerHTML = h;
    s.value = d.forms.length ? '0' : '-1';
  }
  function calcFever() {
    var kg = num('fvKg');
    if (!(kg > 0 && kg <= 200)) return showErr('fv', 'Vui lòng nhập cân nặng hợp lệ (0–200 kg).');
    showErr('fv', '');
    var d = DRUGS[$('fvDrug').value];
    var capped = false;
    var lo = kg * d.lo, hi = kg * d.hi;
    if (hi > d.capDose) { hi = d.capDose; capped = true; }
    if (lo > d.capDose) { lo = d.capDose; capped = true; }
    var day = Math.min(kg * d.dayMax, d.capDay);
    var fi = parseInt($('fvForm').value, 10), f = fi >= 0 ? d.forms[fi] : null;
    var html = '<div class="dc-big">' + fmt(lo, 0) + '–' + fmt(hi, 0) + '<small>mg / lần</small></div>';
    if (f) {
      var a = lo / f[1], b = hi / f[1];
      html += '<div class="dc-line">≈ <b>' + fmt(a, 2) + '–' + fmt(b, 2) + ' ' + f[2] + '</b> (' + f[0] + ')</div>';
    }
    html += '<div class="dc-line">Khoảng cách: ' + d.gap + '.</div>' +
      '<div class="dc-line">Tối đa trong 24 giờ: <b>' + fmt(day, 0) + ' mg</b> (' + d.dayMax + ' mg/kg/ngày' + (kg * d.dayMax > d.capDay ? ', đã giới hạn ở liều người lớn' : '') + ').</div>';
    if (capped) html += '<span class="dc-tag warn">Đã giới hạn ở liều tối đa 1 lần của người lớn</span>';
    html += '<div class="dc-warn">⚠️ ' + d.warn + ' Liều chỉ để tham khảo — luôn đối chiếu y lệnh và nhãn thuốc; làm tròn theo khả năng chia liều thực tế.</div>';
    showRes('fv', html);
    log('dosecalc_fever');
  }

  /* ---------- 2) Bơm tiêm điện / thuốc vận mạch ---------- */
  var PUMP = {
    custom: ['Tự nhập', '', ''],
    nor: ['Noradrenalin', 4, 50],
    adr: ['Adrenalin', 4, 50],
    dop: ['Dopamin', 200, 50],
    dob: ['Dobutamin', 250, 50]
  };
  var pumpHtml =
    '<h2 class="dc-h">💉 Bơm tiêm điện / thuốc vận mạch</h2>' +
    '<p class="dc-d">Đổi qua lại giữa liều (mcg/kg/phút) và tốc độ bơm (mL/giờ). Nồng độ mặc định chỉ để gợi ý — sửa lại đúng cách pha tại khoa.</p>' +
    '<div class="row">' + field('pmKg', 'Cân nặng (kg)', 'VD: 60') +
    '<div class="field"><label for="pmDrug">Thuốc</label><select id="pmDrug">' +
    Object.keys(PUMP).map(function (k) { return '<option value="' + k + '">' + PUMP[k][0] + '</option>'; }).join('') + '</select></div></div>' +
    '<div class="row">' + field('pmMg', 'Lượng thuốc trong bơm (mg)', 'VD: 4') + field('pmMl', 'Thể tích sau pha (mL)', 'VD: 50') + '</div>' +
    '<div class="row"><div class="field"><label for="pmMode">Cần tính</label><select id="pmMode"><option value="rate">Liều → tốc độ bơm (mL/giờ)</option><option value="dose">Tốc độ bơm → liều (mcg/kg/phút)</option></select></div>' +
    field('pmVal', '<span id="pmValLbl">Liều (mcg/kg/phút)</span>', 'VD: 0,1') + '</div>' +
    foot('pm', 'Tính');

  function calcPump() {
    var kg = num('pmKg'), mg = num('pmMg'), ml = num('pmMl'), v = num('pmVal'), mode = $('pmMode').value;
    if (!(kg > 0 && kg <= 300) || !(mg > 0) || !(ml > 0) || !(v >= 0)) return showErr('pm', 'Vui lòng nhập đủ và hợp lệ: cân nặng, lượng thuốc, thể tích và giá trị cần tính.');
    showErr('pm', '');
    var conc = mg * 1000 / ml; // mcg/mL
    var html;
    if (mode === 'rate') {
      var rate = v * kg * 60 / conc;
      html = '<div class="dc-big">' + fmt(rate, 2) + '<small>mL/giờ</small></div>' +
        '<div class="dc-line">Nồng độ: <b>' + fmt(conc, 1) + ' mcg/mL</b> · Liều đích: ' + fmt(v, 3) + ' mcg/kg/phút (≈ ' + fmt(v * kg, 2) + ' mcg/phút)</div>';
      var doses = [0.05, 0.1, 0.2, 0.3, 0.5, 1];
      html += '<table class="dc-tb"><tr><th>Liều (mcg/kg/phút)</th><th>Tốc độ (mL/giờ)</th></tr>' +
        doses.map(function (d) { return '<tr><td>' + fmt(d, 2) + '</td><td>' + fmt(d * kg * 60 / conc, 2) + '</td></tr>'; }).join('') + '</table>';
    } else {
      var dose = v * conc / (kg * 60);
      html = '<div class="dc-big">' + fmt(dose, 3) + '<small>mcg/kg/phút</small></div>' +
        '<div class="dc-line">Nồng độ: <b>' + fmt(conc, 1) + ' mcg/mL</b> · Tốc độ bơm: ' + fmt(v, 2) + ' mL/giờ</div>';
    }
    html += '<div class="dc-warn">⚠️ Phép tính hỗ trợ — bắt buộc đối chiếu y lệnh, nồng độ thực tế trên bơm tiêm và kiểm tra chéo với đồng nghiệp trước khi chỉnh tốc độ.</div>';
    showRes('pm', html);
    log('dosecalc_pump');
  }

  /* ---------- 3) Cân bằng dịch vào - ra ---------- */
  var ioHtml =
    '<h2 class="dc-h">🧮 Cân bằng dịch vào - ra</h2>' +
    '<p class="dc-d">Cộng tổng dịch vào, dịch ra trong khoảng thời gian theo dõi (mặc định 24 giờ), có thể tính cả lượng nước tiểu theo cân nặng.</p>' +
    '<div class="row">' + field('ioIv', 'Dịch truyền tĩnh mạch (mL)', '0') + field('ioOral', 'Uống / ăn qua sonde (mL)', '0') + '</div>' +
    '<div class="row">' + field('ioOth', 'Thuốc pha / dịch khác vào (mL)', '0') + field('ioUri', 'Nước tiểu (mL)', '0') + '</div>' +
    '<div class="row">' + field('ioDr', 'Dẫn lưu / nôn / phân lỏng (mL)', '0') + field('ioH', 'Số giờ theo dõi', '24') + '</div>' +
    '<div class="row">' + field('ioKg', 'Cân nặng (kg) — tùy chọn', 'VD: 60') + '</div>' +
    '<label class="dc-chk"><input type="checkbox" id="ioIns"> Tính thêm mất nước không nhận biết (ước ~10 mL/kg/24 giờ, cần nhập cân nặng)</label>' +
    foot('io', 'Tính cân bằng');

  function calcIo() {
    function v(id) { var n = num(id); return isFinite(n) && n > 0 ? n : 0; }
    var inn = v('ioIv') + v('ioOral') + v('ioOth');
    var h = num('ioH'); if (!(h > 0)) h = 24;
    var kg = num('ioKg');
    var out = v('ioUri') + v('ioDr');
    if (inn === 0 && out === 0) return showErr('io', 'Vui lòng nhập ít nhất một số liệu dịch vào hoặc dịch ra.');
    var insNote = '';
    if ($('ioIns').checked) {
      if (!(kg > 0)) return showErr('io', 'Muốn tính mất nước không nhận biết cần nhập cân nặng.');
      var ins = 10 * kg * h / 24;
      out += ins;
      insNote = ' (đã gồm ~' + fmt(ins, 0) + ' mL mất không nhận biết)';
    }
    showErr('io', '');
    var bal = inn - out;
    var sign = bal > 0 ? '+' : '';
    var cls = Math.abs(bal) < 500 ? 'ok' : (Math.abs(bal) < 1500 ? 'warn' : 'bad');
    var txt = bal > 0 ? 'Cân bằng dương' : (bal < 0 ? 'Cân bằng âm' : 'Cân bằng 0');
    var html = '<div class="dc-big">' + sign + fmt(bal, 0) + '<small>mL / ' + fmt(h, 0) + ' giờ</small></div>' +
      '<div class="dc-line">Vào: <b>' + fmt(inn, 0) + ' mL</b> · Ra: <b>' + fmt(out, 0) + ' mL</b>' + insNote + '</div>' +
      '<span class="dc-tag ' + cls + '">' + txt + '</span>';
    var uri = v('ioUri');
    if (kg > 0 && uri > 0) {
      var r = uri / kg / h;
      html += '<div class="dc-line">Nước tiểu: <b>' + fmt(r, 2) + ' mL/kg/giờ</b> ' + (r < 0.5 ? '— thấp (tham chiếu ≥ 0,5 mL/kg/giờ ở người lớn; trẻ nhỏ ≥ 1)' : '— đạt ngưỡng tham chiếu') + '.</div>';
    }
    html += '<div class="dc-warn">ℹ️ Mức đánh giá (dương/âm) chỉ mang tính gợi ý — cần kết hợp lâm sàng và cân nặng hằng ngày. Dữ liệu chỉ tính tại chỗ, không được lưu.</div>';
    showRes('io', html);
    log('dosecalc_io');
  }

  /* ---------- 4) Dịch duy trì theo cân nặng (Holliday-Segar) ---------- */
  var mtHtml =
    '<h2 class="dc-h">🍼 Dịch duy trì theo cân nặng (Nhi)</h2>' +
    '<p class="dc-d">Công thức Holliday-Segar: 100 mL/kg cho 10 kg đầu, 50 mL/kg cho 10 kg tiếp theo, 20 mL/kg cho mỗi kg còn lại.</p>' +
    '<div class="row">' + field('mtKg', 'Cân nặng (kg)', 'VD: 14') + '</div>' +
    foot('mt', 'Tính nhu cầu duy trì') +
    '<div class="formula-note">Không áp dụng cho trẻ sơ sinh (&lt; 28 ngày), suy tim, suy thận, tăng áp lực nội sọ hoặc sốt xuất huyết có dấu hiệu cảnh báo (dùng mục “Tính thời gian kết thúc dịch truyền” theo phác đồ riêng). Nhu cầu thực tế thay đổi theo sốt, mất dịch bất thường và tình trạng bệnh.</div>';

  function calcMaint() {
    var kg = num('mtKg');
    if (!(kg > 0 && kg <= 100)) return showErr('mt', 'Vui lòng nhập cân nặng hợp lệ (0–100 kg).');
    showErr('mt', '');
    var day = kg <= 10 ? kg * 100 : (kg <= 20 ? 1000 + (kg - 10) * 50 : 1500 + (kg - 20) * 20);
    var hr = kg <= 10 ? kg * 4 : (kg <= 20 ? 40 + (kg - 10) * 2 : 60 + (kg - 20));
    var html = '<div class="dc-big">' + fmt(day, 0) + '<small>mL / 24 giờ</small></div>' +
      '<div class="dc-line">≈ <b>' + fmt(hr, 1) + ' mL/giờ</b> (quy tắc 4-2-1) · ' + fmt(day / kg, 0) + ' mL/kg/ngày</div>' +
      '<div class="dc-warn">⚠️ Chỉ là nhu cầu duy trì cơ bản; liều/loại dịch thực tế theo y lệnh của bác sĩ.</div>';
    showRes('mt', html);
    log('dosecalc_maint');
  }


  /* ---------- 5) Insulin hiệu chỉnh (thang trượt) ---------- */
  var SCALES = {
    s: { n: 'Nhạy cảm cao (gầy, cao tuổi, suy thận, tổng liều < 40 đv/ngày)', d: [1, 2, 3, 4, 5] },
    u: { n: 'Trung bình / thông thường (tổng liều 40–80 đv/ngày)', d: [2, 4, 6, 8, 10] },
    r: { n: 'Đề kháng (béo phì, dùng corticoid, tổng liều > 80 đv/ngày)', d: [3, 6, 9, 12, 15] }
  };
  var BANDS = [[150, 199, '150–199', '8,3–11,0'], [200, 249, '200–249', '11,1–13,8'], [250, 299, '250–299', '13,9–16,6'], [300, 349, '300–349', '16,7–19,4'], [350, 9999, '≥ 350', '≥ 19,4']];
  var insHtml =
    '<h2 class="dc-h">🩸 Insulin hiệu chỉnh (thang trượt)</h2>' +
    '<p class="dc-d">Liều insulin tác dụng nhanh/regular <b>bổ sung</b> theo đường huyết trước ăn. Dùng cùng insulin nền/bữa theo y lệnh, không dùng đơn độc kéo dài.</p>' +
    '<div class="row"><div class="field"><label for="inMode">Cách tính</label><select id="inMode"><option value="scale">Thang trượt (3 mức nhạy cảm)</option><option value="formula">Công thức 1800/1500</option></select></div>' +
    '<div class="field"><label for="inUnit">Đơn vị đường huyết</label><select id="inUnit"><option value="mg">mg/dL</option><option value="mmol">mmol/L</option></select></div></div>' +
    '<div class="row">' + field('inG', 'Đường huyết', 'VD: 245 hoặc 13,6') + '<div class="field" id="inTimeW"><label for="inTime">Thời điểm</label><select id="inTime"><option value="meal">Trước bữa ăn</option><option value="bed">Trước ngủ (giảm 50%)</option></select></div></div>' +
    '<div class="row" id="inScaleW"><div class="field" style="grid-column:1/-1"><label for="inSens">Mức nhạy cảm insulin</label><select id="inSens">' +
    Object.keys(SCALES).map(function (k) { return '<option value="' + k + '"' + (k === 'u' ? ' selected' : '') + '>' + SCALES[k].n + '</option>'; }).join('') + '</select></div></div>' +
    '<div id="inFormW" style="display:none"><div class="row">' + field('inTdd', 'Tổng liều insulin/ngày (đơn vị)', 'VD: 50') +
    '<div class="field"><label for="inType">Loại insulin hiệu chỉnh</label><select id="inType"><option value="1800">Tác dụng nhanh (quy tắc 1800)</option><option value="1500">Regular (quy tắc 1500)</option></select></div></div>' +
    '<div class="row">' + field('inTarget', 'Đường huyết mục tiêu (cùng đơn vị)', 'mặc định 150 mg/dL (8,3 mmol/L)') + '</div></div>' +
    foot('in', 'Tính liều hiệu chỉnh');
  function calcIns() {
    var mode = $('inMode').value, mmol = $('inUnit').value === 'mmol', g = num('inG');
    if (!(g > 0)) return showErr('in', 'Vui lòng nhập đường huyết hợp lệ.');
    var bg = mmol ? g * 18 : g, gShow = mmol ? fmt(g, 1) + ' mmol/L (' + fmt(bg, 0) + ' mg/dL)' : fmt(g, 0) + ' mg/dL (' + fmt(bg / 18, 1) + ' mmol/L)';
    showErr('in', '');
    var html = '', note = '';
    if (bg < 70) {
      html = '<div class="dc-big">0<small>đơn vị</small></div><div class="dc-line">Đường huyết ' + gShow + '</div><span class="dc-tag bad">' + (bg < 54 ? 'Hạ đường huyết nặng' : 'Hạ đường huyết') + ' — KHÔNG tiêm insulin</span>' +
        '<div class="dc-warn">⚠️ Xử trí hạ đường huyết ngay theo phác đồ (đường nhanh 15–20 g nếu tỉnh; truyền glucose nếu lơ mơ/không uống được), kiểm tra lại sau 15 phút và báo bác sĩ.</div>';
      showRes('in', html); log('dosecalc_insulin'); return;
    }
    var dose, tag, cls = 'ok';
    if (mode === 'scale') {
      var sc = SCALES[$('inSens').value], bed = $('inTime').value === 'bed', idx = -1;
      BANDS.forEach(function (b, i) { if (bg >= b[0] && bg <= b[1] + 0.99) idx = i; });
      dose = idx < 0 ? 0 : sc.d[idx];
      if (bed) { dose = bg >= 200 ? Math.floor(dose / 2) : 0; note = 'Trước ngủ: dùng 50% liều bảng (làm tròn xuống) và chỉ hiệu chỉnh khi ≥ 200 mg/dL (11,1 mmol/L).'; }
      html = '<div class="dc-big">' + dose + '<small>đơn vị insulin</small></div><div class="dc-line">Đường huyết ' + gShow + ' · ' + sc.n + (bed ? ' · trước ngủ' : '') + '</div>';
      html += '<table class="dc-tb"><tr><th>Đường huyết mg/dL (mmol/L)</th><th>Liều bảng (đv)</th></tr><tr><td>&lt; 150 (&lt; 8,3)</td><td>0</td></tr>' +
        BANDS.map(function (b, i) { return '<tr' + (i === idx ? ' style="font-weight:800;background:var(--green-light)"' : '') + '><td>' + b[2] + ' (' + b[3] + ')</td><td>' + sc.d[i] + '</td></tr>'; }).join('') + '</table>';
      if (dose === 0 && !bed) { tag = 'Không cần liều hiệu chỉnh'; }
    } else {
      var tdd = num('inTdd'), k = parseInt($('inType').value, 10), tg = num('inTarget');
      if (!(tdd > 0)) return showErr('in', 'Công thức 1800/1500 cần tổng liều insulin/ngày.');
      var tgt = isFinite(tg) && tg > 0 ? (mmol ? tg * 18 : tg) : 150;
      var cf = k / tdd, raw = Math.max(0, (bg - tgt) / cf);
      dose = Math.round(raw * 2) / 2;
      html = '<div class="dc-big">' + fmt(dose, 1) + '<small>đơn vị insulin</small></div><div class="dc-line">Đường huyết ' + gShow + ' · mục tiêu ' + fmt(tgt, 0) + ' mg/dL</div>' +
        '<div class="dc-line">Hệ số nhạy cảm: 1 đơn vị hạ khoảng <b>' + fmt(cf, 0) + ' mg/dL</b> (' + fmt(cf / 18, 1) + ' mmol/L) · tính ' + fmt(raw, 2) + ' → làm tròn 0,5 đv</div>';
      if (bg <= tgt) tag = 'Đường huyết ≤ mục tiêu: không cần liều hiệu chỉnh';
    }
    if (bg >= 400) { tag = 'Đường huyết ≥ 400 mg/dL (22,2 mmol/L) — báo bác sĩ'; cls = 'bad'; note += ' Kiểm tra ketone/dấu hiệu mất nước, toan ceton (nhất là đái tháo đường type 1).'; }
    else if (bg >= 350 && mode === 'scale') { cls = 'warn'; tag = tag || 'Mức cao — theo dõi sát, báo bác sĩ nếu kéo dài'; }
    if (tag) html += '<span class="dc-tag ' + cls + '">' + tag + '</span>';
    if (note) html += '<div class="dc-line">' + note + '</div>';
    html += '<div class="dc-warn">⚠️ Bảng/công thức phổ biến, KHÔNG thay y lệnh. Thực hiện đúng loại insulin, thời điểm tiêm so với bữa ăn và ngưỡng báo bác sĩ theo phác đồ của khoa. Giảm nguy cơ hạ đường huyết ở bệnh nhân ăn kém, suy thận, người già. Khuyến cáo hiện nay: ưu tiên phác đồ nền–bữa, thang trượt chỉ dùng hỗ trợ.</div>';
    showRes('in', html); log('dosecalc_insulin');
  }

  /* ---------- dựng giao diện ---------- */
  var TOOLS = [
    { id: 'fv', ic: '🌡️', t: 'Liều hạ sốt', html: feverHtml, run: calcFever },
    { id: 'pm', ic: '💉', t: 'Bơm tiêm điện', html: pumpHtml, run: calcPump },
    { id: 'io', ic: '🧮', t: 'Cân bằng dịch', html: ioHtml, run: calcIo },
    { id: 'mt', ic: '🍼', t: 'Dịch duy trì Nhi', html: mtHtml, run: calcMaint },
    { id: 'in', ic: '🩸', t: 'Insulin hiệu chỉnh', html: insHtml, run: calcIns }
  ];
  root.innerHTML =
    '<div class="dc-tabs" role="tablist">' + TOOLS.map(function (t, i) {
      return '<button type="button" class="dc-tab' + (i ? '' : ' active') + '" data-tab="' + t.id + '" role="tab"><span class="ic">' + t.ic + '</span>' + t.t + '</button>';
    }).join('') + '</div>' +
    TOOLS.map(function (t, i) { return '<div class="dc-panel' + (i ? '' : ' active') + '" id="dcp-' + t.id + '">' + t.html + '</div>'; }).join('');

  fillForms();
  $('fvDrug').addEventListener('change', fillForms);
  $('pmDrug').addEventListener('change', function () {
    var p = PUMP[$('pmDrug').value];
    if (p[1] !== '') { $('pmMg').value = p[1]; $('pmMl').value = p[2]; }
  });
  $('pmMode').addEventListener('change', function () {
    $('pmValLbl').textContent = $('pmMode').value === 'rate' ? 'Liều (mcg/kg/phút)' : 'Tốc độ bơm (mL/giờ)';
    $('pmVal').placeholder = $('pmMode').value === 'rate' ? 'VD: 0,1' : 'VD: 4,5';
  });
  $('inMode').addEventListener('change', function () {
    var sc = $('inMode').value === 'scale';
    $('inScaleW').style.display = sc ? '' : 'none'; $('inTimeW').style.display = sc ? '' : 'none'; $('inFormW').style.display = sc ? 'none' : '';
  });
  $('pmDrug').dispatchEvent(new Event('change'));
  $('pmDrug').value = 'nor'; $('pmDrug').dispatchEvent(new Event('change'));

  TOOLS.forEach(function (t) {
    $(t.id + 'Btn').addEventListener('click', t.run);
    $('dcp-' + t.id).addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') { e.preventDefault(); t.run(); }
    });
  });
  root.querySelector('.dc-tabs').addEventListener('click', function (e) {
    var b = e.target.closest('.dc-tab');
    if (!b) return;
    root.querySelectorAll('.dc-tab').forEach(function (x) { x.classList.toggle('active', x === b); });
    root.querySelectorAll('.dc-panel').forEach(function (p) { p.classList.toggle('active', p.id === 'dcp-' + b.dataset.tab); });
    var f = root.querySelector('#dcp-' + b.dataset.tab + ' input');
    if (f) f.focus({ preventScroll: true });
  });
})();
