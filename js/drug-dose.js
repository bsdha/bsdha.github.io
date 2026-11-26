/* Trang "Liều thuốc theo cân nặng" (/lieu-thuoc)
   - Tab 1: chọn thuốc → xem liều người lớn / trẻ em (mg/kg/ngày), cảnh báo, chỉnh liều thận, chế phẩm trong danh mục BV,
            và tính liều theo cân nặng, quy đổi ra số viên/gói theo chế phẩm.
   - Tab 2: tính độ thanh thải creatinin (Cockcroft-Gault) và eGFR trẻ em (Schwartz).
   Dữ liệu thuốc: js/drug-data.js (window.DRUG_DB). Chạy hoàn toàn trên trình duyệt, không lưu dữ liệu bệnh nhân. */
(function () {
  var root = document.getElementById('ddRoot');
  var DB = window.DRUG_DB;
  if (!root || !DB) return;
  var P = '#page-drugdose';

  var css = [
    'main{flex:1;padding:40px 24px;display:flex;justify-content:center}',
    '.panel-wrap{width:100%;max-width:820px}',
    '.card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:26px}',
    '.card h1{margin:0 0 6px;font-size:19px;font-weight:800}',
    '.card .sub{margin:0 0 16px;font-size:13px;color:var(--muted);line-height:1.5}',
    '.dd-tabs{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:6px}',
    '.dd-tab{border:1px solid var(--border);background:var(--field);color:var(--text);border-radius:999px;padding:8px 14px;cursor:pointer;font:inherit;font-size:13px;font-weight:700}',
    '.dd-tab.active{border-color:var(--green);background:var(--green-light);color:var(--green)}',
    '.dd-panel{display:none;margin-top:16px;padding-top:16px;border-top:1px solid var(--border)}.dd-panel.active{display:block}',
    '.dd-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}',
    '.field label{display:block;font-size:12.5px;color:var(--muted);margin-bottom:5px}',
    '.field input,.field select{width:100%;background:var(--field);border:1px solid var(--border);border-radius:10px;padding:10px 12px;color:var(--text);font-size:14px;outline:none;font-family:inherit}',
    '.field input:focus,.field select:focus{border-color:var(--blue)}',
    '.dd-info{border:1px solid var(--border);border-radius:12px;padding:14px;margin:4px 0 14px;font-size:13.5px;line-height:1.55}',
    '.dd-info h3{margin:0 0 8px;font-size:15px;font-weight:800}',
    '.dd-sec{margin-top:9px}.dd-sec b{display:block;font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.03em;margin-bottom:2px}',
    '.dd-warn{margin-top:10px;padding:9px 11px;border-radius:9px;background:var(--amber-light);color:var(--amber);font-size:12.5px;line-height:1.5}',
    '.dd-renal{margin-top:10px;padding:9px 11px;border-radius:9px;background:var(--field);border:1px solid var(--border);font-size:12.5px;line-height:1.5}',
    '.calc-btn{width:100%;padding:13px;border:none;border-radius:10px;background:var(--green);color:#0b1a18;font-size:15px;font-weight:800;cursor:pointer;margin:4px 0 14px}',
    '.err{color:var(--red);font-size:13px;margin:0 0 10px;display:none}.err.show{display:block}',
    '.dd-res{border:1px solid var(--border);border-radius:12px;padding:16px;display:none}.dd-res.show{display:block}',
    '.dd-big{font-size:26px;font-weight:800;line-height:1.15}.dd-big small{font-size:13px;color:var(--muted);font-weight:600;margin-left:5px}',
    '.dd-line{margin-top:8px;font-size:13.5px;line-height:1.55}',
    '.dd-tag{display:inline-block;margin-top:10px;padding:5px 12px;border-radius:999px;font-size:12.5px;font-weight:700}',
    '.dd-tag.ok{background:var(--green-light);color:var(--green)}.dd-tag.warn{background:var(--amber-light);color:var(--amber)}.dd-tag.bad{background:var(--red-dark);color:#fff}',
    'table.dd-tb{width:100%;border-collapse:collapse;margin-top:10px;font-size:13px}',
    '.dd-tb th,.dd-tb td{border-top:1px solid var(--border);padding:6px 8px;text-align:left}.dd-tb th{color:var(--muted);font-weight:700}',
    '.dd-note{margin-top:14px;font-size:12px;color:var(--muted);line-height:1.6}',
    '@media(max-width:620px){main{padding:20px 12px}.dd-row{grid-template-columns:1fr}}'
  ];
  function scopeRules(txt) {
    return txt.split('}').filter(function (x) { return x.trim(); }).map(function (x) {
      var i = x.indexOf('{');
      var sels = x.slice(0, i).split(',').map(function (q) { return P + ' ' + q.trim(); }).join(',');
      return sels + '{' + x.slice(i + 1) + '}';
    }).join('');
  }
  var st = document.createElement('style');
  st.textContent = css.map(function (r) {
    if (r.indexOf('@media') === 0) { var i = r.indexOf('{'); return r.slice(0, i + 1) + scopeRules(r.slice(i + 1, -1)) + '}'; }
    return scopeRules(r);
  }).join('\n');
  document.head.appendChild(st);

  /* ---------- tiện ích ---------- */
  function $(id) { return document.getElementById(id); }
  function num(id) { var n = parseFloat(String($(id).value || '').replace(',', '.')); return isFinite(n) ? n : NaN; }
  function fmt(n, d) { return n.toLocaleString('vi-VN', { maximumFractionDigits: d == null ? 1 : d }); }
  function mg(n) { return fmt(n, n < 10 ? 1 : 0); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function log(a) { if (typeof logUsage === 'function') logUsage(a); }
  function field(id, label, ph) { return '<div class="field"><label for="' + id + '">' + label + '</label><input type="text" id="' + id + '" placeholder="' + (ph || '') + '" inputmode="decimal" autocomplete="off"></div>'; }
  function byId(id) { for (var i = 0; i < DB.length; i++) if (DB[i].id === id) return DB[i]; return null; }

  /* ---------- giao diện ---------- */
  var groups = [];
  DB.forEach(function (d) { if (groups.indexOf(d.g) < 0) groups.push(d.g); });
  var drugOpts = groups.map(function (g) {
    return '<optgroup label="' + g + '">' + DB.filter(function (d) { return d.g === g; }).map(function (d) { return '<option value="' + d.id + '">' + d.n + '</option>'; }).join('') + '</optgroup>';
  }).join('');

  root.innerHTML =
    '<div class="dd-tabs"><button type="button" class="dd-tab active" data-tab="dose">💊 Liều theo thuốc</button><button type="button" class="dd-tab" data-tab="renal">🧪 Chức năng thận</button></div>' +
    '<div class="dd-panel active" id="dd_p_dose">' +
    '<div class="dd-row"><div class="field"><label for="ddSearch">Tìm thuốc</label><input type="text" id="ddSearch" placeholder="Gõ tên hoạt chất, VD: amox, para…" autocomplete="off"></div>' +
    '<div class="field"><label for="ddDrug">Thuốc</label><select id="ddDrug">' + drugOpts + '</select></div></div>' +
    '<div class="dd-info" id="ddInfo"></div>' +
    '<div class="dd-row"><div class="field"><label for="ddWho">Đối tượng</label><select id="ddWho"><option value="pd">Trẻ em</option><option value="ad">Người lớn</option></select></div>' + field('ddKg', 'Cân nặng (kg) — bắt buộc với trẻ em', 'VD: 18') + '</div>' +
    '<div class="dd-row"><div class="field"><label for="ddProd">Chế phẩm trong danh mục bệnh viện</label><select id="ddProd"></select></div></div>' +
    '<div class="err" id="ddErr"></div><button type="button" class="calc-btn" id="ddBtn">Tính liều</button><div class="dd-res" id="ddRes"></div>' +
    '<div class="dd-note">⚠️ Liều chỉ mang tính tham khảo (tổng hợp từ Dược thư Quốc gia VN, BNF/BNFc, Nelson) và có thể khác phác đồ của bệnh viện hoặc chỉ định riêng. Luôn đối chiếu y lệnh, tình trạng bệnh nhân và dược sĩ lâm sàng. Danh sách chế phẩm lấy từ file danh mục thuốc đã nạp; dữ liệu bệnh nhân không được lưu.</div></div>' +
    '<div class="dd-panel" id="dd_p_renal"><p class="sub" style="margin:0 0 12px;font-size:13px;color:var(--muted)">Ước tính độ thanh thải creatinin (người lớn – Cockcroft-Gault) hoặc eGFR trẻ em (Schwartz tại giường) để đối chiếu mục “Chỉnh liều theo chức năng thận” của từng thuốc.</p>' +
    '<div class="dd-row"><div class="field"><label for="rnWho">Đối tượng</label><select id="rnWho"><option value="ad">Người lớn (Cockcroft-Gault)</option><option value="pd">Trẻ em (Schwartz)</option></select></div>' +
    '<div class="field"><label for="rnSex">Giới</label><select id="rnSex"><option value="m">Nam</option><option value="f">Nữ</option></select></div></div>' +
    '<div class="dd-row">' + field('rnAge', 'Tuổi (năm)', 'VD: 65') + field('rnKg', 'Cân nặng (kg)', 'VD: 60') + '</div>' +
    '<div class="dd-row">' + field('rnCr', 'Creatinin huyết thanh', 'VD: 1,4') +
    '<div class="field"><label for="rnUnit">Đơn vị creatinin</label><select id="rnUnit"><option value="mg">mg/dL</option><option value="um">µmol/L</option></select></div></div>' +
    '<div class="dd-row" id="rnHtRow" style="display:none">' + field('rnHt', 'Chiều cao (cm) — dùng cho trẻ em', 'VD: 110') + '</div>' +
    '<div class="err" id="rnErr"></div><button type="button" class="calc-btn" id="rnBtn">Tính</button><div class="dd-res" id="rnRes"></div></div>';

  /* ---------- Tab 1 ---------- */
  function renderInfo() {
    var d = byId($('ddDrug').value); if (!d) return;
    var h = '<h3>' + esc(d.n) + '</h3>' +
      '<div class="dd-sec"><b>Người lớn</b>' + esc(d.ad.t) + '</div>' +
      '<div class="dd-sec"><b>Trẻ em</b>' + esc(d.pd.t) + (d.pd.d ? '<br><span style="color:var(--muted)">≈ ' + fmt(d.pd.d[0], 2) + (d.pd.d[1] !== d.pd.d[0] ? '–' + fmt(d.pd.d[1], 2) : '') + ' mg/kg/ngày, chia ' + d.pd.f[0] + (d.pd.f[1] !== d.pd.f[0] ? '–' + d.pd.f[1] : '') + ' lần' + (d.pd.cap ? ' · tối đa ' + fmt(d.pd.cap, 0) + ' mg/ngày' : '') + '</span>' : '') + '</div>' +
      '<div class="dd-sec"><b>Chế phẩm trong danh mục BV</b>' + d.pr.map(function (p) { return esc(p.l); }).join(' · ') + '</div>' +
      (d.w ? '<div class="dd-warn">⚠️ ' + esc(d.w) + '</div>' : '') +
      (d.rn ? '<div class="dd-renal">🧪 <b>Chỉnh liều theo chức năng thận:</b> ' + esc(d.rn) + '</div>' : '');
    $('ddInfo').innerHTML = h;
    $('ddProd').innerHTML = '<option value="-1">Chỉ tính mg</option>' + d.pr.map(function (p, i) { return '<option value="' + i + '">' + esc(p.l) + '</option>'; }).join('');
    if (d.pr.length) $('ddProd').value = '0';
    $('ddRes').classList.remove('show'); $('ddErr').classList.remove('show');
  }
  function units(doseMg, p) {
    var u = doseMg / p.s, r = Math.round(u * 4) / 4;
    return { u: u, r: r };
  }
  function prodLine(lo, hi, p) {
    var a = units(lo, p), b = units(hi, p);
    var txt = (a.r === b.r ? fmt(a.u, 2) : fmt(a.u, 2) + '–' + fmt(b.u, 2)) + ' ' + p.f + ' (' + esc(p.l) + ')';
    var warn = (b.u < 0.25 ? ' — liều quá nhỏ cho dạng này, cần dạng bào chế phù hợp (siro/gói/chia nhỏ)' : (p.f === 'viên' && (a.u % 0.5 !== 0 || b.u % 0.5 !== 0) ? ' — viên chỉ nên chia đôi; làm tròn theo ½ viên nếu cần' : ''));
    return txt + warn;
  }
  function calc() {
    var d = byId($('ddDrug').value), who = $('ddWho').value, err = $('ddErr'), box = $('ddRes');
    var pi = parseInt($('ddProd').value, 10), prod = pi >= 0 ? d.pr[pi] : null;
    var kg = num('ddKg'), x = d[who], html = '';
    err.classList.remove('show');
    if (who === 'pd' && !(kg > 0 && kg <= 150)) { err.textContent = 'Trẻ em: vui lòng nhập cân nặng hợp lệ (0–150 kg).'; err.classList.add('show'); box.classList.remove('show'); return; }
    if (who === 'ad' && isFinite(kg) && !(kg > 0 && kg <= 300)) { err.textContent = 'Cân nặng không hợp lệ.'; err.classList.add('show'); box.classList.remove('show'); return; }
    if (!x.p && !x.d) {
      html = '<div class="dd-big" style="font-size:17px">' + (who === 'pd' ? 'Trẻ em' : 'Người lớn') + ' — ' + esc(d.n) + '</div><div class="dd-line">' + esc(x.t) + '</div>' +
        '<div class="dd-line" style="color:var(--muted)">Thuốc này không có công thức quy đổi theo cân nặng trong dữ liệu — dùng đúng liều theo chỉ định ở trên.</div>';
      if (prod) html += '<div class="dd-line">Chế phẩm đã chọn: ' + esc(prod.l) + '</div>';
      box.innerHTML = html; box.classList.add('show'); log('drugdose_calc'); return;
    }
    var lo, hi, fa, fb, capNote = '', dayLo, dayHi, tag = '', cls = 'ok';
    if (who === 'pd') {
      dayLo = kg * x.d[0]; dayHi = kg * x.d[1];
      if (x.cap && dayHi > x.cap) { capNote = 'Đã giới hạn ở liều tối đa ' + fmt(x.cap, 0) + ' mg/ngày'; dayHi = x.cap; if (dayLo > x.cap) dayLo = x.cap; }
      fa = x.f[0]; fb = x.f[1];
      lo = dayLo / fb; hi = dayHi / fa;
      if (x.pc && hi > x.pc) { hi = x.pc; capNote = (capNote ? capNote + '; ' : '') + 'mỗi lần tối đa ' + fmt(x.pc, 0) + ' mg'; if (lo > x.pc) lo = x.pc; }
    } else {
      lo = x.p[0]; hi = x.p[1]; fa = x.f[0]; fb = x.f[1];
      dayLo = lo * fa; dayHi = Math.min(hi * fb, x.cap || hi * fb);
    }
    html = '<div class="dd-big">' + mg(lo) + (hi !== lo ? '–' + mg(hi) : '') + '<small>mg / lần</small></div>' +
      '<div class="dd-line">Chia <b>' + fa + (fb !== fa ? '–' + fb : '') + ' lần/ngày</b> · tổng <b>' + mg(dayLo) + (dayHi !== dayLo ? '–' + mg(dayHi) : '') + ' mg/ngày</b>' +
      (who === 'pd' ? ' (' + fmt(x.d[0], 2) + (x.d[1] !== x.d[0] ? '–' + fmt(x.d[1], 2) : '') + ' mg/kg/ngày)' : '') + '</div>';
    if (who === 'ad' && x.cap) html += '<div class="dd-line">Liều tối đa trong ngày: <b>' + fmt(x.cap, 0) + ' mg</b></div>';
    if (prod) html += '<div class="dd-line">≈ <b>' + prodLine(lo, hi, prod) + '</b> mỗi lần</div>';
    html += '<div class="dd-line" style="color:var(--muted)">Quy tắc: ' + esc(x.t) + '</div>';
    if (capNote) html += '<span class="dd-tag warn">' + capNote + '</span>';
    if (who === 'pd' && kg >= 40) html += '<span class="dd-tag warn">Trẻ ≥ 40 kg: cân nhắc liều người lớn</span>';
    if (d.w) html += '<div class="dd-warn">⚠️ ' + esc(d.w) + '</div>';
    if (d.rn) html += '<div class="dd-renal">🧪 <b>Chỉnh liều theo chức năng thận:</b> ' + esc(d.rn) + '</div>';
    box.innerHTML = html; box.classList.add('show'); log('drugdose_calc');
  }

  $('ddDrug').addEventListener('change', renderInfo);
  $('ddSearch').addEventListener('input', function () {
    var q = this.value.trim().toLowerCase(), sel = $('ddDrug');
    Array.prototype.forEach.call(sel.querySelectorAll('option'), function (o) { var d = byId(o.value); o.hidden = !!q && d.n.toLowerCase().indexOf(q) < 0; });
    Array.prototype.forEach.call(sel.querySelectorAll('optgroup'), function (g) { g.hidden = !g.querySelector('option:not([hidden])'); });
    var cur = sel.options[sel.selectedIndex];
    if (cur && cur.hidden) { var first = sel.querySelector('option:not([hidden])'); if (first) { sel.value = first.value; renderInfo(); } }
  });
  $('ddBtn').addEventListener('click', calc);
  $('dd_p_dose').addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); calc(); } });

  /* ---------- Tab 2: chức năng thận ---------- */
  $('rnWho').addEventListener('change', function () {
    $('rnHtRow').style.display = this.value === 'pd' ? '' : 'none';
  });
  function stage(v, ped) {
    if (v >= 90) return ['Bình thường hoặc giảm nhẹ (≥ 90)', 'ok'];
    if (v >= 60) return ['Giảm nhẹ (60–89)', 'ok'];
    if (v >= 30) return ['Giảm trung bình (30–59) — cần chỉnh liều một số thuốc', 'warn'];
    if (v >= 15) return ['Giảm nặng (15–29) — chỉnh liều nhiều thuốc', 'bad'];
    return ['Suy thận (< 15) — chỉnh liều/tránh nhiều thuốc', 'bad'];
  }
  function renal() {
    var who = $('rnWho').value, err = $('rnErr'), box = $('rnRes');
    var age = num('rnAge'), kg = num('rnKg'), cr = num('rnCr'), ht = num('rnHt');
    err.classList.remove('show');
    if ($('rnUnit').value === 'um') cr = cr / 88.4;
    var bad = !(cr > 0) || !(age >= 0 && age <= 120) || (who === 'ad' && !(kg > 0)) || (who === 'pd' && !(ht > 0));
    if (bad) { err.textContent = who === 'ad' ? 'Vui lòng nhập tuổi, cân nặng và creatinin hợp lệ.' : 'Vui lòng nhập tuổi, chiều cao và creatinin hợp lệ.'; err.classList.add('show'); box.classList.remove('show'); return; }
    var v, label, formula;
    if (who === 'ad') {
      v = (140 - age) * kg / (72 * cr); if ($('rnSex').value === 'f') v *= 0.85;
      label = 'Độ thanh thải creatinin (ClCr)'; formula = 'Cockcroft-Gault: (140 − tuổi) × cân nặng ÷ (72 × creatinin mg/dL) × 0,85 nếu nữ';
    } else {
      v = 0.413 * ht / cr; label = 'eGFR (Schwartz tại giường)'; formula = 'Schwartz: 0,413 × chiều cao (cm) ÷ creatinin (mg/dL)';
    }
    var s = stage(v, who === 'pd');
    box.innerHTML = '<div class="dd-big">' + fmt(v, 0) + '<small>mL/phút' + (who === 'pd' ? '/1,73 m²' : '') + '</small></div><div class="dd-line">' + label + ' · creatinin ' + fmt(cr, 2) + ' mg/dL (' + fmt(cr * 88.4, 0) + ' µmol/L)</div><span class="dd-tag ' + s[1] + '">' + s[0] + '</span>' +
      '<div class="dd-line" style="color:var(--muted)">' + formula + '</div>' +
      '<div class="dd-note">Chỉ là ước tính, kém chính xác khi creatinin đang thay đổi nhanh (suy thận cấp), người béo phì/suy dinh dưỡng, cổ trướng, người cao tuổi rất gầy. Đối chiếu mục “Chỉnh liều theo chức năng thận” ở từng thuốc ở tab “Liều theo thuốc”.</div>';
    box.classList.add('show'); log('drugdose_renal');
  }
  $('rnBtn').addEventListener('click', renal);
  $('dd_p_renal').addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); renal(); } });

  root.querySelector('.dd-tabs').addEventListener('click', function (e) {
    var b = e.target.closest('.dd-tab'); if (!b) return;
    Array.prototype.forEach.call(root.querySelectorAll('.dd-tab'), function (x) { x.classList.toggle('active', x === b); });
    $('dd_p_dose').classList.toggle('active', b.dataset.tab === 'dose');
    $('dd_p_renal').classList.toggle('active', b.dataset.tab === 'renal');
  });

  $('ddDrug').value = 'paracetamol';
  renderInfo();
})();
