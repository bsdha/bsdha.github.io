/* Trang "Checklist & phiếu theo dõi" (/checklist-theo-doi) — 5 công cụ điều dưỡng trong 1 trang:
   Bàn giao ca · Catheter TM trung tâm · Chăm sóc vết thương/loét · Theo dõi truyền máu · Sinh hiệu theo giờ
   Chỉ nhập – xem – in ngay trên trình duyệt. KHÔNG lưu và KHÔNG gửi dữ liệu bệnh nhân lên máy chủ
   (tải lại trang là xóa sạch). Các ô họ tên/giường là tùy chọn, chỉ để in kèm phiếu. */
(function () {
  var root = document.getElementById('ckRoot');
  if (!root) return;
  var P = '#page-ckforms';

  /* ---------- CSS ---------- */
  var css = [
    'main{flex:1;padding:40px 24px;display:flex;justify-content:center}',
    '.panel-wrap{width:100%;max-width:860px}',
    '.card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:26px}',
    '.card h1{margin:0 0 6px;font-size:19px;font-weight:800}',
    '.card .sub{margin:0 0 16px;font-size:13px;color:var(--muted);line-height:1.5}',
    '.ck-tabs{display:flex;flex-wrap:wrap;gap:8px}',
    '.ck-tab{border:1px solid var(--border);background:var(--field);color:var(--text);border-radius:999px;padding:8px 13px;cursor:pointer;font:inherit;font-size:13px;font-weight:700}',
    '.ck-tab.active{border-color:var(--green);background:var(--green-light);color:var(--green)}',
    '.ck-panel{display:none;margin-top:18px;padding-top:16px;border-top:1px solid var(--border)}.ck-panel.active{display:block}',
    '.ck-h{margin:0 0 4px;font-size:16px;font-weight:800}',
    '.ck-d{margin:0 0 14px;font-size:12.5px;color:var(--muted);line-height:1.5}',
    '.ck-row{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:12px}',
    '.ck-row2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}',
    '.field label{display:block;font-size:12.5px;color:var(--muted);margin-bottom:5px}',
    '.field input,.field select,.field textarea,.ck-cell{width:100%;background:var(--field);border:1px solid var(--border);border-radius:10px;padding:9px 11px;color:var(--text);font-size:13.5px;outline:none;font-family:inherit}',
    '.field textarea{min-height:72px;resize:vertical}',
    '.field input:focus,.field select:focus,.field textarea:focus,.ck-cell:focus{border-color:var(--blue)}',
    '.ck-gt{margin:16px 0 7px;font-size:13px;font-weight:800}',
    '.ck-chk{display:flex;gap:9px;align-items:flex-start;font-size:13.5px;padding:8px 10px;border:1px solid var(--border);border-radius:10px;background:var(--field);margin-bottom:6px;cursor:pointer;line-height:1.4}',
    '.ck-chk input{margin-top:3px}.ck-chk.on{border-color:var(--green)}.ck-chk.w.on{border-color:var(--red);background:var(--amber-light)}',
    '.ck-prog{height:7px;background:var(--border);border-radius:5px;margin:10px 0 4px;overflow:hidden}.ck-prog i{display:block;height:100%;width:0;background:var(--green);transition:width .2s}',
    '.ck-pt{font-size:12.5px;color:var(--muted);margin-bottom:10px}',
    '.ck-alert{display:none;margin:12px 0;padding:11px 13px;border-radius:10px;background:var(--red-dark);color:#fff;font-size:13.5px;font-weight:700;line-height:1.5}.ck-alert.show{display:block}',
    '.ck-info{margin:10px 0;padding:10px 12px;border-radius:10px;background:var(--green-light);color:var(--green);font-size:13.5px;font-weight:700;display:none}.ck-info.show{display:block}',
    '.ck-act{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}',
    '.ck-btn{border:none;border-radius:10px;padding:11px 16px;font:inherit;font-size:14px;font-weight:800;cursor:pointer;background:var(--green);color:#0b1a18}',
    '.ck-btn.g{background:var(--field);color:var(--text);border:1px solid var(--border)}',
    '.ck-scroll{overflow-x:auto}',
    'table.ck-tb{width:100%;border-collapse:collapse;font-size:13px}',
    '.ck-tb th{background:var(--field);border:1px solid var(--border);padding:7px 6px;font-size:12px;color:var(--muted);white-space:nowrap}',
    '.ck-tb td{border:1px solid var(--border);padding:3px}',
    '.ck-tb td .ck-cell{border:none;border-radius:0;background:transparent;padding:7px 6px;text-align:center;min-width:56px}',
    '.ck-tb td.abn{background:var(--amber-light)}.ck-tb td.abn .ck-cell{color:var(--red);font-weight:800}',
    '.ck-charts{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:16px}',
    '.ck-chart{border:1px solid var(--border);border-radius:12px;padding:10px;background:var(--field)}',
    '.ck-chart b{font-size:12.5px}.ck-chart svg{width:100%;height:auto;display:block}',
    '.ck-chart .none{font-size:12px;color:var(--muted);padding:26px 0;text-align:center}',
    '.ck-sum{margin-top:12px;padding:11px 13px;border:1px dashed var(--border);border-radius:10px;font-size:13px;line-height:1.6;background:var(--field)}',
    '.ck-note{margin-top:14px;font-size:12px;color:var(--muted);line-height:1.6}',
    '.ck-pr{display:none}',
    '@media(max-width:700px){main{padding:20px 12px}.ck-row{grid-template-columns:1fr}.ck-row2{grid-template-columns:1fr}.ck-charts{grid-template-columns:1fr}}'
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
  }).join('\n') +
    // In phiếu: chỉ in vùng đang mở (nền trắng, chữ đen)
    '\n@media print{body *{visibility:hidden!important}' +
    P + ' .ck-panel.active,' + P + ' .ck-panel.active *{visibility:visible!important}' +
    P + ' .ck-panel.active{position:absolute;left:0;top:0;width:100%;margin:0;padding:0;border:none;background:#fff!important}' +
    P + ' .ck-panel.active *{color:#000!important;background:transparent!important;border-color:#888!important;box-shadow:none!important}' +
    P + ' .ck-panel.active .ck-pr{display:block!important;margin-bottom:10px;font-size:13px}' +
    P + ' .ck-noprint{display:none!important}' +
    P + ' .ck-panel.active .ck-alert.show{border:2px solid #000!important}' +
    P + ' .ck-panel.active td.abn{font-weight:700}}';
  document.head.appendChild(st);

  /* ---------- tiện ích ---------- */
  function $(id) { return document.getElementById(id); }
  function q(sel, ctx) { return (ctx || root).querySelector(sel); }
  function qa(sel, ctx) { return Array.prototype.slice.call((ctx || root).querySelectorAll(sel)); }
  function log(a) { if (typeof logUsage === 'function') logUsage(a); }
  function lc1(s) { return s.charAt(0).toLowerCase() + s.slice(1); }
  function fnum(s) { var n = parseFloat(String(s).replace(',', '.')); return isFinite(n) ? n : NaN; }
  function fmt(n, d) { return n.toLocaleString('vi-VN', { maximumFractionDigits: d == null ? 1 : d }); }
  function nowStr() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(d.getHours()) + ':' + p(d.getMinutes()) + ' ' + p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear();
  }
  function f(id, label, ph, val) {
    return '<div class="field"><label for="' + id + '">' + label + '</label><input type="text" id="' + id + '" placeholder="' + (ph || '') + '" value="' + (val || '') + '" autocomplete="off"></div>';
  }
  function sel(id, label, opts) {
    return '<div class="field"><label for="' + id + '">' + label + '</label><select id="' + id + '">' +
      opts.map(function (o) { return '<option value="' + o + '">' + o + '</option>'; }).join('') + '</select></div>';
  }
  function head(id, title) {
    return '<div class="ck-pr"><b>' + title + '</b> — In lúc ' + nowStr() + '</div>' +
      '<div class="ck-row">' + f(id + '_ward', 'Khoa / phòng', 'VD: Khám bệnh - Cấp cứu') + f(id + '_pt', 'Giường – họ tên (tùy chọn, chỉ để in)', '') + f(id + '_time', 'Ngày giờ', '', nowStr()) + '</div>';
  }
  function actions(id, extra) {
    return '<div class="ck-act ck-noprint">' + (extra || '') + '<button type="button" class="ck-btn" data-print="' + id + '">🖨️ In phiếu</button><button type="button" class="ck-btn g" data-reset="' + id + '">↺ Làm mới</button></div>' +
      '<div class="ck-note">Dữ liệu chỉ nằm trên trình duyệt này và mất khi tải lại trang; không gửi lên máy chủ. Nội dung là danh mục nhắc việc — thực hiện theo quy trình/y lệnh của bệnh viện.</div>';
  }
  // groups: [[tiêu đề, [mục | {t, w:1}]]]; w = mục cảnh báo (tick là báo động)
  function checklist(id, groups) {
    var n = 0;
    var h = groups.map(function (g) {
      return '<div class="ck-gt">' + g[0] + '</div>' + g[1].map(function (it) {
        var o = typeof it === 'string' ? { t: it } : it; n++;
        return '<label class="ck-chk' + (o.w ? ' w' : '') + '"><input type="checkbox" data-id="' + id + '"' + (o.w ? ' data-w="1"' : '') + '><span>' + o.t + '</span></label>';
      }).join('');
    }).join('');
    return '<div class="ck-prog ck-noprint"><i id="' + id + '_bar"></i></div><div class="ck-pt" id="' + id + '_pt2">0 / ' + n + ' mục</div>' + h;
  }
  function refresh(id, warnMsg) {
    var boxes = qa('input[data-id="' + id + '"]'), done = 0, warn = 0, tot = 0;
    boxes.forEach(function (b) {
      b.parentNode.classList.toggle('on', b.checked);
      if (b.dataset.w) { if (b.checked) warn++; } else { tot++; if (b.checked) done++; }
    });
    var bar = $(id + '_bar'); if (bar) bar.style.width = (tot ? done / tot * 100 : 0) + '%';
    var pt = $(id + '_pt2'); if (pt) pt.textContent = done + ' / ' + tot + ' mục đã kiểm' + (warn ? ' · ' + warn + ' dấu hiệu bất thường' : '');
    var al = $(id + '_alert'); if (al) al.classList.toggle('show', warn > 0);
  }

  /* ---------- 1) Bàn giao ca ---------- */
  var HAND = [
    ['Nhận diện & cảnh báo', ['Đối chiếu họ tên, tuổi, số giường, chẩn đoán', 'Dị ứng thuốc/thức ăn và các cảnh báo đặc biệt (cách ly, nguy cơ té ngã, loét tỳ đè)', 'Mức độ tri giác, ngôn ngữ, người thân chăm sóc']],
    ['Tình trạng hiện tại', ['Dấu hiệu sinh tồn gần nhất và diễn biến bất thường trong ca', 'Mức độ đau và xử trí giảm đau đã làm', 'Thở oxy/hỗ trợ hô hấp, chế độ ăn, tình trạng bài tiết']],
    ['Điều trị', ['Thuốc/dịch đang truyền (loại, tốc độ, giờ kết thúc)', 'Thuốc đã dùng trong ca và thuốc sắp đến giờ', 'Y lệnh mới hoặc y lệnh chưa thực hiện']],
    ['Đường vào, dẫn lưu, chăm sóc', ['Catheter TM, sonde, dẫn lưu: vị trí, ngày đặt, tình trạng', 'Vết thương/băng: tình trạng và lịch thay băng']],
    ['Cận lâm sàng & chuẩn bị', ['Xét nghiệm/chẩn đoán hình ảnh đã làm, đang chờ kết quả hoặc chưa làm', 'Chuẩn bị phẫu thuật/thủ thuật/chuyển khoa (nhịn ăn, ký cam kết, hồ sơ)']]
  ];
  var handHtml = head('hd', 'Bàn giao ca điều dưỡng') + '<div class="ck-row2">' + f('hd_from', 'Người giao ca', '') + f('hd_to', 'Người nhận ca', '') + '</div>' +
    checklist('hd', HAND) + '<div class="field" style="margin-top:12px"><label for="hd_todo">Việc cần làm ở ca sau / lưu ý</label><textarea id="hd_todo"></textarea></div>' + actions('hd');

  /* ---------- 2) Catheter TM trung tâm ---------- */
  var CVC = [
    ['Đánh giá hằng ngày', ['Catheter còn chỉ định lưu? (báo bác sĩ rút sớm nếu không còn cần)', 'Rửa/sát khuẩn tay trước khi thao tác']],
    ['Băng và vị trí chân catheter', ['Băng vô khuẩn còn nguyên, khô, dán kín', 'Có ghi ngày giờ thay băng trên băng', 'Catheter cố định chắc, không bị tuột/gập']],
    ['Đầu nối và dây truyền', ['Sát khuẩn đầu nối trước mỗi lần tiêm/truyền', 'Dây truyền ghi ngày thay đúng quy định', 'Bơm rửa catheter đúng quy trình sau truyền/lấy máu']],
    ['Dấu hiệu bất thường (tick nếu CÓ)', [{ t: 'Đỏ, sưng, nóng, đau ở chân catheter hoặc dọc đường đi', w: 1 }, { t: 'Chảy dịch/mủ, băng ẩm hoặc bẩn', w: 1 }, { t: 'Sốt/rét run không rõ nguyên nhân, nghi nhiễm khuẩn huyết', w: 1 }, { t: 'Tắc, không bơm rửa được; tay/cổ cùng bên sưng', w: 1 }]]
  ];
  var cvcHtml = head('cv', 'Chăm sóc catheter tĩnh mạch trung tâm') +
    '<div class="ck-row">' + sel('cv_site', 'Vị trí đặt', ['TM dưới đòn', 'TM cảnh trong', 'TM đùi', 'PICC', 'Khác']) +
    '<div class="field"><label for="cv_date">Ngày đặt catheter</label><input type="date" id="cv_date"></div>' + f('cv_note', 'Loại/số lumen (tùy chọn)', '') + '</div>' +
    '<div class="ck-info" id="cv_days"></div>' + checklist('cv', CVC) +
    '<div class="ck-alert" id="cv_alert">⚠️ Có dấu hiệu bất thường: báo bác sĩ ngay, ghi nhận vào hồ sơ; không tự rút catheter khi chưa có y lệnh.</div>' + actions('cv');

  /* ---------- 3) Chăm sóc vết thương / loét ---------- */
  var woundHtml = head('wd', 'Đánh giá & chăm sóc vết thương') +
    '<div class="ck-row">' + f('wd_site', 'Vị trí vết thương', 'VD: vùng cùng cụt') + sel('wd_type', 'Loại', ['Vết thương mổ', 'Loét tỳ đè', 'Loét do đái tháo đường/mạch máu', 'Chấn thương/trầy xước', 'Bỏng', 'Khác']) +
    sel('wd_stage', 'Giai đoạn loét tỳ đè (nếu có)', ['Không áp dụng', 'Giai đoạn 1', 'Giai đoạn 2', 'Giai đoạn 3', 'Giai đoạn 4', 'Không xếp được giai đoạn', 'Tổn thương mô sâu']) + '</div>' +
    '<div class="ck-row">' + f('wd_l', 'Dài (cm)', '') + f('wd_w', 'Rộng (cm)', '') + f('wd_dp', 'Sâu (cm)', '') + '</div>' +
    '<div class="ck-row">' + sel('wd_bed', 'Nền vết thương', ['Hạt hồng/đỏ (tốt)', 'Hỗn hợp hạt + giả mạc vàng', 'Giả mạc vàng/xơ', 'Hoại tử đen/khô', 'Biểu mô hóa']) +
    sel('wd_exu', 'Lượng dịch tiết', ['Không', 'Ít', 'Vừa', 'Nhiều']) + sel('wd_exut', 'Tính chất dịch', ['Không có', 'Thanh dịch', 'Máu', 'Thanh dịch lẫn máu', 'Mủ']) + '</div>' +
    '<div class="ck-row">' + sel('wd_skin', 'Da quanh vết thương', ['Bình thường', 'Đỏ', 'Phù nề', 'Trầy sước/ngâm nước', 'Tăng sắc tố/chai cứng']) + sel('wd_pain', 'Đau (VAS 0–10)', ['0', '1–3 (nhẹ)', '4–6 (vừa)', '7–10 (nặng)']) +
    sel('wd_dress', 'Loại băng đã dùng', ['Gạc thường', 'Gạc tẩm parafin', 'Hydrocolloid', 'Foam', 'Alginate', 'Khác']) + '</div>' +
    '<div class="ck-gt">Đã thực hiện</div>' +
    ['Rửa vết thương bằng NaCl 0,9%', 'Cắt lọc/loại bỏ mô hoại tử (theo y lệnh)', 'Thay băng', 'Hướng dẫn người nhà/bệnh nhân chăm sóc'].map(function (t) { return '<label class="ck-chk"><input type="checkbox" data-id="wd"><span>' + t + '</span></label>'; }).join('') +
    '<div class="ck-gt">Dấu hiệu nhiễm khuẩn (tick nếu CÓ)</div>' +
    ['Đau tăng, đỏ lan rộng, nóng', 'Mủ hoặc mùi hôi', 'Sốt/rét run'].map(function (t) { return '<label class="ck-chk w"><input type="checkbox" data-id="wd" data-w="1"><span>' + t + '</span></label>'; }).join('') +
    '<div class="ck-alert" id="wd_alert">⚠️ Nghi nhiễm khuẩn vết thương: báo bác sĩ để đánh giá và xử trí; ghi nhận vào hồ sơ.</div>' +
    '<div class="ck-sum" id="wd_sum"></div>' +
    actions('wd', '<button type="button" class="ck-btn g" id="wd_copy">📋 Sao chép tóm tắt</button>');

  /* ---------- 4) Theo dõi truyền máu ---------- */
  var TF_BEFORE = ['Đối chiếu 2 người: họ tên, mã số, nhóm máu ABO/Rh bệnh nhân với túi máu', 'Kiểm tra túi máu: mã túi, hạn dùng, màu sắc, không rách/rò/đông cục', 'Có y lệnh và phiếu đồng ý truyền máu', 'Đường truyền thông, dùng dây truyền máu có lọc'];
  var TF_ROWS = ['Trước truyền', '15 phút đầu', '30 phút', '1 giờ', '2 giờ', 'Khi kết thúc', '1 giờ sau kết thúc'];
  var TF_REACT = [{ t: 'Sốt, rét run', w: 1 }, { t: 'Nổi mề đay, ngứa, phát ban', w: 1 }, { t: 'Khó thở, thở rít, tím tái', w: 1 }, { t: 'Đau ngực, đau lưng, đau chỗ truyền', w: 1 }, { t: 'Tụt huyết áp, mạch nhanh, vã mồ hôi', w: 1 }, { t: 'Nước tiểu sẫm/đỏ, buồn nôn, nôn', w: 1 }];
  var tfHtml = head('tf', 'Theo dõi truyền máu') +
    '<div class="ck-row">' + f('tf_unit', 'Mã túi máu / chế phẩm', 'VD: HC 250 mL') + f('tf_grp', 'Nhóm máu bệnh nhân / túi', 'VD: O Rh+ / O Rh+') + f('tf_start', 'Giờ bắt đầu truyền', '') + '</div>' +
    checklist('tf', [['Kiểm tra trước truyền (2 người)', TF_BEFORE]]) +
    '<div class="ck-gt">Sinh hiệu theo mốc</div><div class="ck-scroll"><table class="ck-tb" id="tf_tb"><tr><th>Mốc</th><th>Giờ</th><th>Nhiệt độ °C</th><th>Mạch</th><th>HA (mmHg)</th><th>Nhịp thở</th><th>SpO₂ %</th><th>Tốc độ (giọt/ph)</th></tr>' +
    TF_ROWS.map(function (r, i) { return '<tr><td style="padding:6px 8px;white-space:nowrap">' + r + '</td>' + ['h', 't', 'm', 'ha', 'rr', 'sp', 'dr'].map(function (c) { return '<td><input class="ck-cell" data-tf="' + i + c + '"></td>'; }).join('') + '</tr>'; }).join('') + '</table></div>' +
    '<div class="ck-gt">Phản ứng khi truyền (tick nếu CÓ)</div>' + TF_REACT.map(function (o) { return '<label class="ck-chk w"><input type="checkbox" data-id="tf" data-w="1"><span>' + o.t + '</span></label>'; }).join('') +
    '<div class="ck-alert" id="tf_alert">⚠️ Có dấu hiệu phản ứng: DỪNG truyền máu ngay, giữ đường truyền bằng NaCl 0,9%, báo bác sĩ và xử trí theo quy trình xử trí phản ứng truyền máu.</div>' +
    '<div class="ck-alert" id="tf_temp"></div>' + actions('tf');

  /* ---------- 5) Sinh hiệu theo giờ ---------- */
  var VCOLS = [['h', 'Giờ'], ['m', 'Mạch'], ['s', 'HATT'], ['d', 'HATTr'], ['t', 'Nhiệt độ'], ['r', 'Nhịp thở'], ['p', 'SpO₂']];
  function vRow(i) { return '<tr data-row="' + i + '">' + VCOLS.map(function (c) { return '<td data-c="' + c[0] + '"><input class="ck-cell" data-v="' + c[0] + '" placeholder="' + (c[0] === 'h' ? '06:00' : '') + '"></td>'; }).join('') + '</tr>'; }
  var vHtml = head('vs', 'Biểu đồ sinh hiệu theo giờ') +
    '<p class="ck-d ck-noprint">Nhập số liệu từng lần đo, biểu đồ vẽ tự động. Ô tô vàng là giá trị ngoài ngưỡng tham khảo người lớn (mạch 50–120, HATT 90–180, nhiệt độ 36–37,9, nhịp thở 10–24, SpO₂ ≥ 94).</p>' +
    '<div class="ck-scroll"><table class="ck-tb" id="vs_tb"><tr>' + VCOLS.map(function (c) { return '<th>' + c[1] + '</th>'; }).join('') + '</tr>' + [0, 1, 2, 3, 4, 5].map(vRow).join('') + '</table></div>' +
    '<div class="ck-act ck-noprint"><button type="button" class="ck-btn g" id="vs_add">+ Thêm dòng</button></div>' +
    '<div class="ck-charts" id="vs_charts"></div>' + actions('vs');

  /* ---------- dựng giao diện ---------- */
  var TOOLS = [
    { id: 'hd', t: '🔄 Bàn giao ca', h: handHtml },
    { id: 'cv', t: '🧷 Catheter TM trung tâm', h: cvcHtml },
    { id: 'wd', t: '🩹 Vết thương/loét', h: woundHtml },
    { id: 'tf', t: '🩸 Truyền máu', h: tfHtml },
    { id: 'vs', t: '📈 Sinh hiệu theo giờ', h: vHtml }
  ];
  var TITLES = { hd: 'Bàn giao ca', cv: 'Chăm sóc catheter TM trung tâm', wd: 'Chăm sóc vết thương/loét', tf: 'Theo dõi truyền máu', vs: 'Sinh hiệu theo giờ' };
  var DESC = {
    hd: 'Tick từng mục khi đã bàn giao, ghi việc cần làm cho ca sau, rồi in.',
    cv: 'Danh mục kiểm hằng ngày để phòng nhiễm khuẩn đường truyền; tự đếm ngày lưu catheter.',
    wd: 'Phiếu đánh giá vết thương theo nền – dịch – da quanh vết thương, tự tính diện tích và tạo bản tóm tắt để dán vào hồ sơ.',
    tf: 'Kiểm tra trước truyền, sinh hiệu theo mốc và phản ứng truyền máu; cảnh báo khi có dấu hiệu cần dừng truyền.',
    vs: 'Vẽ biểu đồ mạch, huyết áp, nhiệt độ, nhịp thở, SpO₂ từ số liệu nhập tay.'
  };
  root.innerHTML = '<div class="ck-tabs ck-noprint">' + TOOLS.map(function (t) { return '<button type="button" class="ck-tab" data-tab="' + t.id + '">' + t.t + '</button>'; }).join('') + '</div>' +
    TOOLS.map(function (t) { return '<div class="ck-panel" id="ck_p_' + t.id + '"><h2 class="ck-h">' + TITLES[t.id] + '</h2><p class="ck-d ck-noprint">' + DESC[t.id] + '</p>' + t.h + '</div>'; }).join('');

  /* ---------- hành vi ---------- */
  function show(id) {
    qa('.ck-tab').forEach(function (b) { b.classList.toggle('active', b.dataset.tab === id); });
    qa('.ck-panel').forEach(function (p) { p.classList.toggle('active', p.id === 'ck_p_' + id); });
  }
  root.addEventListener('click', function (e) {
    var tb = e.target.closest('.ck-tab'); if (tb) return show(tb.dataset.tab);
    var pr = e.target.closest('[data-print]'); if (pr) { log('ckform_' + pr.dataset.print); window.print(); return; }
    var rs = e.target.closest('[data-reset]'); if (rs) return resetPanel(rs.dataset.reset);
  });
  root.addEventListener('change', function (e) {
    var c = e.target; if (c.type === 'checkbox' && c.dataset.id) { refresh(c.dataset.id); if (c.dataset.id === 'wd') wdSum(); }
  });

  function resetPanel(id) {
    var p = $('ck_p_' + id);
    qa('input,select,textarea', p).forEach(function (el) {
      if (el.type === 'checkbox') el.checked = false;
      else if (el.tagName === 'SELECT') el.selectedIndex = 0;
      else if (el.id === id + '_time') el.value = nowStr();
      else el.value = '';
    });
    refresh(id); if (id === 'cv') cvDays(); if (id === 'wd') wdSum(); if (id === 'tf') tfTemp(); if (id === 'vs') vsDraw();
  }

  // Catheter: đếm ngày lưu
  function cvDays() {
    var v = $('cv_date').value, box = $('cv_days');
    if (!v) { box.classList.remove('show'); return; }
    var d = Math.floor((new Date(new Date().toDateString()) - new Date(v + 'T00:00:00')) / 86400000) + 1;
    if (d < 1) { box.textContent = 'Ngày đặt nằm ở tương lai — kiểm tra lại.'; }
    else box.textContent = 'Hôm nay là ngày lưu catheter thứ ' + d + (d >= 7 ? ' — nên đánh giá lại nhu cầu lưu catheter và báo bác sĩ.' : '.');
    box.classList.add('show');
  }
  $('cv_date').addEventListener('input', cvDays);

  // Vết thương: tóm tắt
  function wdSum() {
    function v(id) { return $(id).value; }
    var L = fnum(v('wd_l')), W = fnum(v('wd_w')), D = fnum(v('wd_dp'));
    var size = (L > 0 && W > 0) ? fmt(L, 1) + ' × ' + fmt(W, 1) + (D > 0 ? ' × ' + fmt(D, 1) : '') + ' cm (diện tích ≈ ' + fmt(L * W, 1) + ' cm²)' : 'chưa ghi kích thước';
    var did = qa('input[data-id="wd"]').filter(function (c) { return c.checked && !c.dataset.w; }).map(function (c) { return lc1(c.parentNode.textContent.trim()); });
    var inf = qa('input[data-id="wd"]').filter(function (c) { return c.checked && c.dataset.w; }).map(function (c) { return lc1(c.parentNode.textContent.trim()); });
    var s = v('wd_type') + (v('wd_site') ? ' vùng ' + v('wd_site') : '') + (v('wd_stage') !== 'Không áp dụng' ? ' (' + v('wd_stage').toLowerCase() + ')' : '') + ', ' + size +
      '. Nền: ' + v('wd_bed').toLowerCase() + '. Dịch tiết: ' + v('wd_exu').toLowerCase() + (v('wd_exut') !== 'Không có' ? ', ' + v('wd_exut').toLowerCase() : '') +
      '. Da quanh vết thương: ' + v('wd_skin').toLowerCase() + '. Đau: ' + v('wd_pain') + '.' +
      (did.length ? ' Đã thực hiện: ' + did.join('; ') + (v('wd_dress') ? ' (băng: ' + v('wd_dress').toLowerCase() + ')' : '') + '.' : '') +
      (inf.length ? ' Dấu hiệu nhiễm khuẩn: ' + inf.join('; ') + ' → báo bác sĩ.' : ' Không ghi nhận dấu hiệu nhiễm khuẩn.');
    $('wd_sum').textContent = s;
    return s;
  }
  qa('#ck_p_wd input[type="text"],#ck_p_wd select').forEach(function (el) { el.addEventListener('input', wdSum); el.addEventListener('change', wdSum); });
  $('wd_copy').addEventListener('click', function () {
    var s = wdSum(), b = $('wd_copy');
    function ok() { b.textContent = '✓ Đã sao chép'; setTimeout(function () { b.textContent = '📋 Sao chép tóm tắt'; }, 1500); log('ckform_wd'); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(s).then(ok, function () { });
    else { var t = document.createElement('textarea'); t.value = s; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); ok(); } catch (x) { } t.remove(); }
  });

  // Truyền máu: cảnh báo sốt
  function tfTemp() {
    var t0 = fnum(q('[data-tf="0t"]').value), msg = '';
    for (var i = 1; i < TF_ROWS.length; i++) {
      var t = fnum(q('[data-tf="' + i + 't"]').value);
      if (t >= 38 || (t0 > 0 && t - t0 >= 1)) { msg = '⚠️ Nhiệt độ tại mốc “' + TF_ROWS[i] + '” (' + fmt(t, 1) + ' °C) ' + (t >= 38 ? 'từ 38 °C trở lên' : 'tăng ≥ 1 °C so với trước truyền') + ': nghi phản ứng — dừng truyền, giữ đường truyền, báo bác sĩ.'; break; }
    }
    var al = $('tf_temp'); al.textContent = msg; al.classList.toggle('show', !!msg);
  }
  qa('#tf_tb input').forEach(function (el) { el.addEventListener('input', tfTemp); });

  // Sinh hiệu: biểu đồ
  var LIM = { m: [50, 120], s: [90, 180], t: [36, 37.9], r: [10, 24], p: [94, 101] };
  function vsRows() {
    return qa('#vs_tb tr[data-row]').map(function (tr) {
      var o = {};
      qa('input[data-v]', tr).forEach(function (i) { o[i.dataset.v] = i.dataset.v === 'h' ? i.value.trim() : fnum(i.value); });
      return o;
    });
  }
  function seg(vals, X, Y, color) {
    var out = '', run = [];
    function flush() { if (run.length > 1) out += '<polyline fill="none" stroke="' + color + '" stroke-width="2" points="' + run.join(' ') + '"/>'; run = []; }
    vals.forEach(function (v, i) { if (v == null || isNaN(v)) { flush(); return; } var x = X(i), y = Y(v); run.push(x.toFixed(1) + ',' + y.toFixed(1)); out += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3" fill="' + color + '"/>'; });
    flush(); return out;
  }
  function chart(title, rows, series) {
    var all = []; series.forEach(function (s) { rows.forEach(function (r) { if (r[s.k] > 0) all.push(r[s.k]); }); });
    if (!all.length) return '<div class="ck-chart"><b>' + title + '</b><div class="none">Chưa có số liệu</div></div>';
    var mn = Math.min.apply(0, all), mx = Math.max.apply(0, all), pad = (mx - mn) * 0.15 || 1; mn -= pad; mx += pad;
    var W = 320, H = 140, L = 34, R = 8, T = 10, B = 24, n = rows.length;
    var X = function (i) { return L + (n > 1 ? i * (W - L - R) / (n - 1) : (W - L - R) / 2); };
    var Y = function (v) { return T + (mx - v) / (mx - mn) * (H - T - B); };
    var g = '';
    [0, 0.5, 1].forEach(function (f2) { var v = mn + (mx - mn) * f2; g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '" stroke="currentColor" stroke-opacity=".15"/><text x="' + (L - 4) + '" y="' + (Y(v) + 3).toFixed(1) + '" font-size="9" text-anchor="end" fill="currentColor" fill-opacity=".6">' + fmt(v, mx - mn < 8 ? 1 : 0) + '</text>'; });
    rows.forEach(function (r, i) { if (r.h) g += '<text x="' + X(i).toFixed(1) + '" y="' + (H - 8) + '" font-size="9" text-anchor="middle" fill="currentColor" fill-opacity=".6">' + r.h.replace(/</g, '') + '</text>'; });
    series.forEach(function (s) { g += seg(rows.map(function (r) { return r[s.k] > 0 ? r[s.k] : null; }), X, Y, s.c); });
    var leg = series.length > 1 ? ' <small style="color:#888">(' + series.map(function (s) { return '<span style="color:' + s.c + '">●</span> ' + s.n; }).join(' ') + ')</small>' : '';
    return '<div class="ck-chart"><b>' + title + leg + '</b><svg viewBox="0 0 ' + W + ' ' + H + '">' + g + '</svg></div>';
  }
  function vsDraw() {
    var rows = vsRows();
    qa('#vs_tb tr[data-row]').forEach(function (tr, i) {
      ['m', 's', 't', 'r', 'p'].forEach(function (k) {
        var td = q('td[data-c="' + k + '"]', tr), v = rows[i][k], bad = v > 0 && (v < LIM[k][0] || v > LIM[k][1]);
        td.classList.toggle('abn', bad);
      });
    });
    $('vs_charts').innerHTML =
      chart('Mạch (lần/phút)', rows, [{ k: 'm', c: '#e5484d', n: 'Mạch' }]) +
      chart('Huyết áp (mmHg)', rows, [{ k: 's', c: '#e5484d', n: 'Tâm thu' }, { k: 'd', c: '#2f81f7', n: 'Tâm trương' }]) +
      chart('Nhiệt độ (°C)', rows, [{ k: 't', c: '#d97706', n: 'Nhiệt độ' }]) +
      chart('Nhịp thở & SpO₂', rows, [{ k: 'r', c: '#8b5cf6', n: 'Nhịp thở' }, { k: 'p', c: '#16a34a', n: 'SpO₂' }]);
  }
  $('vs_tb').addEventListener('input', vsDraw);
  $('vs_add').addEventListener('click', function () {
    var n = qa('#vs_tb tr[data-row]').length;
    $('vs_tb').insertAdjacentHTML('beforeend', vRow(n));
  });

  ['hd', 'cv', 'tf'].forEach(function (id) { refresh(id); });
  wdSum(); vsDraw();
  show('hd');
})();
