/* Trang "Thang điểm cấp cứu & nhi" (/diem-cap-cuu-nhi) — 8 thang điểm, tách riêng khỏi "Thang điểm lâm sàng":
   Người lớn: Shock Index, Glasgow (GCS), qSOFA/SOFA, Padua, CAM-ICU
   Nhi - sơ sinh: APGAR, Đau trẻ em (FLACC / Wong-Baker), Nguy cơ té ngã trẻ em (Humpty Dumpty)
   Tính ngay trên trình duyệt, không gửi/lưu dữ liệu bệnh nhân. */
(function () {
  var root = document.getElementById('esRoot');
  if (!root) return;

  var P = '#page-emscores';
  var css = [
    'main{flex:1;padding:40px 24px;display:flex;justify-content:center}',
    '.panel-wrap{width:100%;max-width:780px}',
    '.card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:26px}',
    '.card h1{margin:0 0 6px;font-size:19px;font-weight:800}',
    '.card .sub{margin:0 0 16px;font-size:13px;color:var(--muted);line-height:1.5}',
    '.es-grp{margin:12px 0 6px;font-size:11.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}',
    '.es-tabs{display:flex;flex-wrap:wrap;gap:8px}',
    '.es-tab{border:1px solid var(--border);background:var(--field);color:var(--text);border-radius:999px;padding:8px 13px;cursor:pointer;font:inherit;font-size:13px;font-weight:700}',
    '.es-tab.active{border-color:var(--green);background:var(--green-light);color:var(--green)}',
    '.es-panel{display:none;margin-top:18px;padding-top:16px;border-top:1px solid var(--border)}.es-panel.active{display:block}',
    '.es-h{margin:0 0 4px;font-size:15px;font-weight:800}',
    '.es-d{margin:0 0 14px;font-size:12.5px;color:var(--muted);line-height:1.5}',
    '.es-sec{margin:16px 0 8px;font-size:13px;font-weight:800;color:var(--text)}',
    '.es-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}',
    '.field label{display:block;font-size:12.5px;color:var(--muted);margin-bottom:6px}',
    '.field input,.field select{width:100%;background:var(--field);border:1px solid var(--border);border-radius:10px;padding:11px 12px;color:var(--text);font-size:14px;outline:none;font-family:inherit}',
    '.field input:focus,.field select:focus{border-color:var(--blue)}',
    '.es-chk{display:flex;gap:9px;align-items:flex-start;font-size:13.5px;padding:8px 10px;border:1px solid var(--border);border-radius:10px;background:var(--field);margin-bottom:7px;cursor:pointer;line-height:1.4}',
    '.es-chk input{margin-top:3px}.es-pt{color:var(--green);margin-left:4px}',
    '.calc-btn{width:100%;padding:13px;border:none;border-radius:10px;background:var(--green);color:#0b1a18;font-size:15px;font-weight:800;cursor:pointer;margin:6px 0 14px}',
    '.calc-btn:hover{filter:brightness(1.05)}',
    '.err{color:var(--red);font-size:13px;margin:0 0 10px;display:none}.err.show{display:block}',
    '.es-res{border:1px solid var(--border);border-radius:12px;padding:16px;display:none}.es-res.show{display:block}',
    '.es-big{font-size:30px;font-weight:800;line-height:1.1}.es-big small{font-size:13px;color:var(--muted);font-weight:600;margin-left:5px}',
    '.es-line{margin-top:8px;font-size:13.5px;line-height:1.5}',
    '.es-tag{display:inline-block;margin-top:10px;padding:5px 12px;border-radius:999px;font-size:12.5px;font-weight:700}',
    '.es-tag.ok{background:var(--green-light);color:var(--green)}.es-tag.warn{background:var(--amber-light);color:var(--amber)}.es-tag.bad{background:var(--red-dark);color:#fff}',
    '.es-note{margin-top:14px;font-size:12px;color:var(--muted);background:var(--field);border:1px solid var(--border);border-radius:10px;padding:10px 12px;line-height:1.6}',
    '@media(max-width:600px){main{padding:20px 12px}.es-row{grid-template-columns:1fr}}'
  ];
  // Thêm tiền tố #page-emscores cho từng selector (kể cả trong @media) để CSS chỉ ảnh hưởng trang này
  function scopeRules(txt) {
    return txt.split('}').filter(function (x) { return x.trim(); }).map(function (x) {
      var i = x.indexOf('{');
      var sels = x.slice(0, i).split(',').map(function (q) { return P + ' ' + q.trim(); }).join(',');
      return sels + '{' + x.slice(i + 1) + '}';
    }).join('');
  }
  css = css.map(function (r) {
    if (r.indexOf('@media') === 0) { var i = r.indexOf('{'); return r.slice(0, i + 1) + scopeRules(r.slice(i + 1, -1)) + '}'; }
    return scopeRules(r);
  }).join('\n');
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  /* ---------- tiện ích ---------- */
  function $(id) { return document.getElementById(id); }
  function fmt(n, d) { return n.toLocaleString('vi-VN', { maximumFractionDigits: d == null ? 1 : d }); }
  function log(a) { if (typeof logUsage === 'function') logUsage(a); }
  function res(big, unit, lines, tag, cls) {
    return '<div class="es-big">' + big + (unit ? '<small>' + unit + '</small>' : '') + '</div>' +
      (lines || []).map(function (l) { return '<div class="es-line">' + l + '</div>'; }).join('') +
      (tag ? '<span class="es-tag ' + cls + '">' + tag + '</span>' : '');
  }
  var DISCLAIMER = '<div class="es-note">ℹ️ Công cụ hỗ trợ chấm điểm — kết quả cần kết hợp đánh giá lâm sàng và y lệnh/quy trình của bệnh viện. Không lưu dữ liệu bệnh nhân.</div>';

  /* ---------- định nghĩa các thang điểm ---------- */
  // Nhóm trường: {k, l, o:[[chữ, điểm]], d:(có giá trị mặc định), opt:(được bỏ trống), np:(ẩn điểm)}
  //              {k, l, chk:điểm}  (ô tick)   |  {k, l, num:true, ph}  (ô số)
  var YN = [['Có', 1], ['Không', 0]];
  var TOOLS = [
    { id: 'shock', grp: 'adult', t: 'Shock Index', d: 'Chỉ số sốc = Mạch ÷ Huyết áp tâm thu. Dùng cho người lớn, giúp phát hiện sớm nguy cơ sốc.',
      g: [{ k: 'hr', l: 'Mạch (lần/phút)', num: true, ph: 'VD: 112' }, { k: 'sbp', l: 'Huyết áp tâm thu (mmHg)', num: true, ph: 'VD: 90' }],
      fin: function (v) {
        var si = v.hr / v.sbp, tag, cls, note;
        if (si < 0.7) { tag = 'Bình thường'; cls = 'ok'; note = 'Giá trị bình thường khoảng 0,5–0,7.'; }
        else if (si < 1.0) { tag = 'Theo dõi sát'; cls = 'warn'; note = 'Vượt ngưỡng bình thường, cần theo dõi sát và tìm nguyên nhân.'; }
        else if (si < 1.4) { tag = 'Nguy cơ sốc cao'; cls = 'bad'; note = 'Từ 1,0 trở lên: nguy cơ sốc/mất máu — đánh giá và xử trí khẩn.'; }
        else { tag = 'Nguy cơ rất cao'; cls = 'bad'; note = 'Từ 1,4 trở lên: nguy cơ rất cao — xử trí cấp cứu ngay.'; }
        return res(fmt(si, 2), '', ['Mạch ' + fmt(v.hr, 0) + ' · HA tâm thu ' + fmt(v.sbp, 0) + ' mmHg', note], tag, cls) +
          '<div class="es-note">Ngưỡng tham khảo cho người lớn. Ở trẻ em và người dùng thuốc chẹn beta/máy tạo nhịp, chỉ số có thể không phản ánh đúng.</div>';
      } },
    { id: 'gcs', grp: 'adult', t: 'Glasgow (GCS)', d: 'Đánh giá mức độ tri giác theo 3 tiêu chí: mở mắt, lời nói, vận động (3–15 điểm).',
      g: [
        { k: 'e', l: 'Mở mắt (E)', o: [['Tự nhiên', 4], ['Khi gọi', 3], ['Khi đau', 2], ['Không mở mắt', 1]] },
        { k: 'v', l: 'Lời nói (V)', o: [['Định hướng, đúng nội dung', 5], ['Lẫn lộn', 4], ['Từ ngữ không phù hợp', 3], ['Âm thanh không thành lời', 2], ['Không đáp ứng', 1]] },
        { k: 'm', l: 'Vận động (M)', o: [['Làm theo lệnh', 6], ['Định khu được vị trí đau', 5], ['Co rút/gạt tránh khi đau', 4], ['Gập bất thường (mất vỏ)', 3], ['Duỗi bất thường (mất não)', 2], ['Không đáp ứng', 1]] }],
      fin: function (v) {
        var s = v.e + v.v + v.m, tag, cls;
        if (s >= 13) { tag = 'Nhẹ (13–15)'; cls = 'ok'; } else if (s >= 9) { tag = 'Vừa (9–12)'; cls = 'warn'; } else { tag = 'Nặng (≤ 8)'; cls = 'bad'; }
        return res(s, '/15', ['E' + v.e + ' V' + v.v + ' M' + v.m, s <= 8 ? 'GCS ≤ 8: nguy cơ mất bảo vệ đường thở — báo bác sĩ ngay.' : 'Theo dõi và chấm lại định kỳ.'], tag, cls) +
          '<div class="es-note">Bệnh nhân đặt nội khí quản/không nói được: ghi V = T (không tính điểm) theo quy định đơn vị.</div>';
      } },
    { id: 'sofa', grp: 'adult', t: 'qSOFA / SOFA', d: 'Tầm soát nhiễm khuẩn huyết: qSOFA (nhanh, 3 tiêu chí) và SOFA (6 cơ quan). Mục SOFA để mặc định 0 nếu chưa có số liệu.',
      g: [
        { sec: 'qSOFA (tick nếu có)' },
        { k: 'q1', l: 'Nhịp thở ≥ 22 lần/phút', chk: 1 }, { k: 'q2', l: 'Thay đổi ý thức (GCS < 15)', chk: 1 }, { k: 'q3', l: 'Huyết áp tâm thu ≤ 100 mmHg', chk: 1 },
        { sec: 'SOFA' },
        { k: 'r', l: 'Hô hấp: PaO₂/FiO₂ (mmHg)', d: 1, o: [['≥ 400 hoặc chưa có số liệu', 0], ['< 400', 1], ['< 300', 2], ['< 200 + thở máy/hỗ trợ hô hấp', 3], ['< 100 + thở máy/hỗ trợ hô hấp', 4]] },
        { k: 'p', l: 'Đông máu: tiểu cầu (×10³/µL)', d: 1, o: [['≥ 150 hoặc chưa có', 0], ['< 150', 1], ['< 100', 2], ['< 50', 3], ['< 20', 4]] },
        { k: 'b', l: 'Gan: bilirubin (mg/dL)', d: 1, o: [['< 1,2 hoặc chưa có', 0], ['1,2–1,9', 1], ['2,0–5,9', 2], ['6,0–11,9', 3], ['≥ 12,0', 4]] },
        { k: 'c', l: 'Tim mạch (thuốc: mcg/kg/phút)', d: 1, o: [['MAP ≥ 70 mmHg', 0], ['MAP < 70 mmHg', 1], ['Dopamin ≤ 5 hoặc dobutamin (mọi liều)', 2], ['Dopamin > 5 hoặc adrenalin/noradrenalin ≤ 0,1', 3], ['Dopamin > 15 hoặc adrenalin/noradrenalin > 0,1', 4]] },
        { k: 'n', l: 'Thần kinh: điểm Glasgow', d: 1, o: [['15', 0], ['13–14', 1], ['10–12', 2], ['6–9', 3], ['< 6', 4]] },
        { k: 'k', l: 'Thận: creatinin (mg/dL) / nước tiểu', d: 1, o: [['< 1,2 hoặc chưa có', 0], ['1,2–1,9', 1], ['2,0–3,4', 2], ['3,5–4,9 hoặc nước tiểu < 500 mL/ngày', 3], ['≥ 5,0 hoặc nước tiểu < 200 mL/ngày', 4]] }],
      fin: function (v) {
        var q = v.q1 + v.q2 + v.q3, s = v.r + v.p + v.b + v.c + v.n + v.k;
        var qt = q >= 2 ? ['qSOFA ≥ 2: nguy cơ diễn tiến nặng/tử vong cao hơn', 'bad'] : ['qSOFA < 2', 'ok'];
        var st2 = s >= 2 ? ['SOFA ≥ 2: có rối loạn chức năng cơ quan (nếu nghi nhiễm trùng: phù hợp nhiễm khuẩn huyết)', s >= 6 ? 'bad' : 'warn'] : ['SOFA < 2', 'ok'];
        return res('qSOFA ' + q + '/3', '', [], qt[0], qt[1]) +
          '<div style="margin-top:14px">' + res('SOFA ' + s, '/24', ['Hô hấp ' + v.r + ' · Đông máu ' + v.p + ' · Gan ' + v.b + ' · Tim mạch ' + v.c + ' · Thần kinh ' + v.n + ' · Thận ' + v.k], st2[0], st2[1]) + '</div>' +
          '<div class="es-note">SOFA đánh giá mức thay đổi so với điểm nền của bệnh nhân. Cần báo bác sĩ khi qSOFA ≥ 2 hoặc SOFA ≥ 2 kèm nghi nhiễm trùng.</div>';
      } },
    { id: 'padua', grp: 'adult', t: 'Padua', d: 'Đánh giá nguy cơ huyết khối tĩnh mạch (VTE) ở bệnh nhân nội khoa nhập viện. Tick các yếu tố có ở bệnh nhân.',
      g: [
        { k: 'a', l: 'Ung thư đang tiến triển', chk: 3 }, { k: 'b', l: 'Tiền sử huyết khối tĩnh mạch', chk: 3 },
        { k: 'c', l: 'Giảm vận động (nằm tại giường ≥ 3 ngày)', chk: 3 }, { k: 'd', l: 'Đã biết có rối loạn đông máu bẩm sinh', chk: 3 },
        { k: 'e', l: 'Chấn thương/phẫu thuật trong vòng 1 tháng', chk: 2 }, { k: 'f', l: 'Tuổi ≥ 70', chk: 1 },
        { k: 'g', l: 'Suy tim và/hoặc suy hô hấp', chk: 1 }, { k: 'h', l: 'Nhồi máu cơ tim cấp hoặc đột quỵ thiếu máu', chk: 1 },
        { k: 'i', l: 'Nhiễm trùng cấp và/hoặc bệnh thấp khớp', chk: 1 }, { k: 'j', l: 'Béo phì (BMI ≥ 30)', chk: 1 },
        { k: 'l', l: 'Đang điều trị nội tiết/hormone', chk: 1 }],
      fin: function (v) {
        var s = 0; Object.keys(v).forEach(function (k) { s += v[k]; });
        return s >= 4
          ? res(s, 'điểm', ['Nguy cơ cao (≥ 4): cân nhắc dự phòng huyết khối nếu không có chống chỉ định — báo bác sĩ.'], 'Nguy cơ cao', 'bad')
          : res(s, 'điểm', ['Nguy cơ thấp (< 4): khuyến khích vận động, đánh giá lại khi tình trạng thay đổi.'], 'Nguy cơ thấp', 'ok');
      } },
    { id: 'cam', grp: 'adult', t: 'CAM-ICU', d: 'Sàng lọc mê sảng (delirium) ở bệnh nhân hồi sức. Dương tính khi có đặc điểm 1 VÀ 2, kèm 3 HOẶC 4.',
      g: [
        { k: 'f1', l: '1. Khởi phát cấp tính hoặc diễn tiến dao động của tri giác', o: YN, np: 1 },
        { k: 'f2', l: '2. Giảm tập trung chú ý', o: YN, np: 1 },
        { k: 'f3', l: '3. Thay đổi mức độ ý thức (RASS khác 0)', o: YN, np: 1 },
        { k: 'f4', l: '4. Tư duy vô tổ chức', o: YN, np: 1 }],
      fin: function (v) {
        var pos = v.f1 && v.f2 && (v.f3 || v.f4);
        return pos
          ? res('Dương tính', '', ['Có đặc điểm 1 và 2, kèm ' + (v.f3 ? 'đặc điểm 3' : 'đặc điểm 4') + ' → nghi có mê sảng — báo bác sĩ.'], 'CAM-ICU (+)', 'bad')
          : res('Âm tính', '', [!v.f1 || !v.f2 ? 'Thiếu đặc điểm 1 và/hoặc 2 (bắt buộc) → không đủ tiêu chuẩn mê sảng.' : 'Không có đặc điểm 3 hoặc 4.'], 'CAM-ICU (−)', 'ok');
      } },
    { id: 'apgar', grp: 'peds', t: 'APGAR', d: 'Đánh giá trẻ sơ sinh ở phút thứ 1, 5 (và 10 nếu cần): 5 tiêu chí, mỗi tiêu chí 0–2 điểm.',
      g: [
        { k: 'a', l: 'Màu da (Appearance)', o: [['Xanh/tái toàn thân', 0], ['Thân hồng, đầu chi tím', 1], ['Hồng toàn thân', 2]] },
        { k: 'p', l: 'Nhịp tim (Pulse)', o: [['Không có', 0], ['< 100 lần/phút', 1], ['≥ 100 lần/phút', 2]] },
        { k: 'g', l: 'Phản xạ (Grimace)', o: [['Không đáp ứng', 0], ['Nhăn mặt', 1], ['Khóc/ho/hắt hơi', 2]] },
        { k: 't', l: 'Trương lực cơ (Activity)', o: [['Nhẽo', 0], ['Gập nhẹ tứ chi', 1], ['Cử động tốt', 2]] },
        { k: 'r', l: 'Hô hấp (Respiration)', o: [['Không thở', 0], ['Yếu/không đều', 1], ['Khóc to', 2]] }],
      fin: function (v) {
        var s = v.a + v.p + v.g + v.t + v.r, tag, cls, msg;
        if (s >= 7) { tag = 'Bình thường (7–10)'; cls = 'ok'; msg = 'Chăm sóc sơ sinh thường quy.'; }
        else if (s >= 4) { tag = 'Trung bình (4–6)'; cls = 'warn'; msg = 'Cần kích thích, hỗ trợ hô hấp và theo dõi sát.'; }
        else { tag = 'Thấp (0–3)'; cls = 'bad'; msg = 'Cần hồi sức tích cực sơ sinh ngay.'; }
        return res(s, '/10', [msg], tag, cls) + '<div class="es-note">Ghi rõ thời điểm chấm (phút 1, 5, 10). Điểm ở phút thứ nhất không thay thế quyết định hồi sức.</div>';
      } },
    { id: 'pain', grp: 'peds', t: 'Đau trẻ em', d: 'FLACC (trẻ nhỏ/không tự khai, 0–10 điểm) hoặc Wong-Baker (trẻ từ 3 tuổi tự chọn khuôn mặt). Chỉ cần điền một trong hai.',
      g: [
        { sec: 'FLACC' },
        { k: 'f', l: 'Nét mặt (Face)', opt: 1, o: [['Bình thường/cười', 0], ['Thỉnh thoảng nhăn mặt, cau mày', 1], ['Nhăn mặt thường xuyên, cằm run, nghiến răng', 2]] },
        { k: 'l', l: 'Chân (Legs)', opt: 1, o: [['Bình thường/thả lỏng', 0], ['Bồn chồn, căng', 1], ['Đá, co chân lên', 2]] },
        { k: 'a', l: 'Hoạt động (Activity)', opt: 1, o: [['Nằm yên/bình thường', 0], ['Vặn vẹo, căng thẳng', 1], ['Cong người, cứng đờ hoặc giật', 2]] },
        { k: 'c', l: 'Khóc (Cry)', opt: 1, o: [['Không khóc', 0], ['Rên rỉ, thỉnh thoảng than phiền', 1], ['Khóc liên tục, la hét, than phiền thường xuyên', 2]] },
        { k: 'o', l: 'Khả năng dỗ nín (Consolability)', opt: 1, o: [['Thoải mái, thư giãn', 0], ['Dỗ được bằng chạm/ôm/nói chuyện', 1], ['Khó dỗ nín', 2]] },
        { sec: 'Wong-Baker (trẻ ≥ 3 tuổi)' },
        { k: 'w', l: 'Khuôn mặt trẻ chọn', opt: 1, o: [['😄 Không đau', 0], ['🙂 Đau ít', 2], ['😐 Đau nhẹ', 4], ['😕 Đau vừa', 6], ['😣 Đau nhiều', 8], ['😭 Đau nhất', 10]] }],
      fin: function (v) {
        function lv(s) { return s === 0 ? ['Không đau', 'ok'] : s <= 3 ? ['Đau nhẹ', 'ok'] : s <= 6 ? ['Đau vừa', 'warn'] : ['Đau nặng', 'bad']; }
        var F = ['f', 'l', 'a', 'c', 'o'], hasF = F.every(function (k) { return v[k] != null; }), anyF = F.some(function (k) { return v[k] != null; });
        if (anyF && !hasF) return null;
        if (!hasF && v.w == null) return null;
        var out = '';
        if (hasF) { var s = F.reduce(function (a, k) { return a + v[k]; }, 0), t = lv(s); out += res('FLACC ' + s, '/10', [], t[0], t[1]); }
        if (v.w != null) { var t2 = v.w === 0 ? ['Không đau', 'ok'] : v.w <= 2 ? ['Đau nhẹ', 'ok'] : v.w <= 6 ? ['Đau vừa', 'warn'] : ['Đau nặng', 'bad']; out += '<div style="margin-top:' + (hasF ? 14 : 0) + 'px">' + res('Wong-Baker ' + v.w, '/10', [], t2[0], t2[1]) + '</div>'; }
        return out + '<div class="es-note">Đau vừa – nặng: báo bác sĩ để xử trí giảm đau theo y lệnh; đánh giá lại sau can thiệp.</div>';
      } },
    { id: 'fall', grp: 'peds', t: 'Té ngã trẻ em', d: 'Thang Humpty Dumpty: đánh giá nguy cơ té ngã ở trẻ nhập viện (7–23 điểm).',
      g: [
        { k: 'a', l: 'Tuổi', o: [['Dưới 3 tuổi', 4], ['3 – dưới 7 tuổi', 3], ['7 – dưới 13 tuổi', 2], ['Từ 13 tuổi trở lên', 1]] },
        { k: 's', l: 'Giới tính', o: [['Nam', 2], ['Nữ', 1]] },
        { k: 'd', l: 'Chẩn đoán', o: [['Bệnh thần kinh', 4], ['Rối loạn oxy (hô hấp, mất nước, thiếu máu, chán ăn, ngất/chóng mặt)', 3], ['Rối loạn tâm thần/hành vi', 2], ['Chẩn đoán khác', 1]] },
        { k: 'n', l: 'Nhận thức', o: [['Không nhận biết giới hạn bản thân', 3], ['Quên giới hạn của bản thân', 2], ['Nhận biết khả năng của mình', 1]] },
        { k: 'e', l: 'Yếu tố môi trường', o: [['Tiền sử té ngã / trẻ nhỏ nằm giường', 4], ['Dùng dụng cụ hỗ trợ / trẻ nhỏ nằm nôi, ghế', 3], ['Bệnh nhân nằm giường', 2], ['Khu vực ngoại trú', 1]] },
        { k: 'u', l: 'Phẫu thuật / an thần / gây mê', o: [['Trong vòng 24 giờ', 3], ['Trong vòng 48 giờ', 2], ['> 48 giờ hoặc không', 1]] },
        { k: 'm', l: 'Thuốc đang dùng', o: [['Nhiều thuốc an thần, giãn cơ, chống trầm cảm, lợi tiểu, nhuận tràng, opioid…', 3], ['Một trong các thuốc trên', 2], ['Thuốc khác / không dùng', 1]] }],
      fin: function (v) {
        var s = 0; Object.keys(v).forEach(function (k) { s += v[k]; });
        return s >= 12
          ? res(s, 'điểm', ['Nguy cơ cao (≥ 12): áp dụng biện pháp phòng ngừa té ngã đầy đủ theo quy trình.'], 'Nguy cơ té ngã cao', 'bad')
          : res(s, 'điểm', ['Nguy cơ thấp (7–11): áp dụng biện pháp phòng ngừa cơ bản, đánh giá lại khi tình trạng thay đổi.'], 'Nguy cơ té ngã thấp', 'ok');
      } }
  ];

  /* ---------- dựng giao diện ---------- */
  function gHtml(tid, g) {
    if (g.sec) return '<div class="es-sec">' + g.sec + '</div>';
    var id = 'es_' + tid + '_' + g.k;
    if (g.chk != null) return '<label class="es-chk"><input type="checkbox" id="' + id + '"><span>' + g.l + '<b class="es-pt">+' + g.chk + '</b></span></label>';
    if (g.num) return '<div class="field"><label for="' + id + '">' + g.l + '</label><input type="text" id="' + id + '" placeholder="' + (g.ph || '') + '" inputmode="decimal" autocomplete="off"></div>';
    return '<div class="field"><label for="' + id + '">' + g.l + '</label><select id="' + id + '">' +
      (g.d ? '' : '<option value="">' + (g.opt ? '— Bỏ trống —' : '— Chọn —') + '</option>') +
      g.o.map(function (o, i) { return '<option value="' + i + '">' + o[0] + (g.np ? '' : ' (' + o[1] + ')') + '</option>'; }).join('') + '</select></div>';
  }
  function bodyHtml(t) {
    var h = '', buf = '';
    function flush() { if (buf) { h += '<div class="es-row">' + buf + '</div>'; buf = ''; } }
    t.g.forEach(function (g) {
      if (g.sec) { flush(); h += gHtml(t.id, g); }
      else if (g.chk != null) { flush(); h += gHtml(t.id, g); }
      else buf += gHtml(t.id, g);
    });
    flush();
    return '<h2 class="es-h">' + t.t + '</h2><p class="es-d">' + t.d + '</p>' + h +
      '<div class="err" id="es_' + t.id + '_err"></div><button type="button" class="calc-btn" id="es_' + t.id + '_btn">Chấm điểm</button><div class="es-res" id="es_' + t.id + '_res"></div>';
  }
  function tabsFor(grp) {
    return '<div class="es-tabs">' + TOOLS.filter(function (t) { return t.grp === grp; }).map(function (t) {
      return '<button type="button" class="es-tab" data-tab="' + t.id + '">' + t.t + '</button>';
    }).join('') + '</div>';
  }
  root.innerHTML = '<div class="es-grp">👩‍⚕️ Người lớn</div>' + tabsFor('adult') + '<div class="es-grp">👶 Nhi - sơ sinh</div>' + tabsFor('peds') +
    TOOLS.map(function (t) { return '<div class="es-panel" id="es_p_' + t.id + '">' + bodyHtml(t) + '</div>'; }).join('');

  function collect(t) {
    var v = {}, missing = false;
    t.g.forEach(function (g) {
      if (g.sec) return;
      var el = $('es_' + t.id + '_' + g.k);
      if (g.chk != null) { v[g.k] = el.checked ? g.chk : 0; return; }
      if (g.num) {
        var n = parseFloat(String(el.value).replace(',', '.'));
        if (!(n > 0)) missing = true; else v[g.k] = n;
        return;
      }
      if (el.value === '') { if (!g.opt) missing = true; return; }
      v[g.k] = g.o[parseInt(el.value, 10)][1];
    });
    return missing ? null : v;
  }
  function run(t) {
    var err = $('es_' + t.id + '_err'), box = $('es_' + t.id + '_res');
    var v = collect(t), html = v ? t.fin(v) : null;
    if (!v || !html) {
      err.textContent = t.id === 'pain' ? 'Vui lòng điền đủ 5 mục FLACC hoặc chọn khuôn mặt Wong-Baker.' : (t.num || t.id === 'shock' ? 'Vui lòng nhập đủ và hợp lệ các giá trị (lớn hơn 0).' : 'Vui lòng chọn đủ các mục trước khi chấm điểm.');
      err.classList.add('show'); box.classList.remove('show'); return;
    }
    err.classList.remove('show');
    box.innerHTML = html + (t.id === 'gcs' || t.id === 'shock' || t.id === 'sofa' ? '' : DISCLAIMER);
    box.classList.add('show');
    log('emscore_' + t.id);
  }
  function show(id) {
    root.querySelectorAll('.es-tab').forEach(function (b) { b.classList.toggle('active', b.dataset.tab === id); });
    root.querySelectorAll('.es-panel').forEach(function (p) { p.classList.toggle('active', p.id === 'es_p_' + id); });
  }
  TOOLS.forEach(function (t) {
    $('es_' + t.id + '_btn').addEventListener('click', function () { run(t); });
    $('es_p_' + t.id).addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') { e.preventDefault(); run(t); }
    });
  });
  root.addEventListener('click', function (e) {
    var b = e.target.closest('.es-tab');
    if (!b) return;
    show(b.dataset.tab);
    var f = $('es_p_' + b.dataset.tab).querySelector('input[type="text"],select');
    if (f) f.focus({ preventScroll: true });
  });
  show('shock');
})();
