/* =====================================================================
   js/chuyen-tuyen.js
   Tính năng: PHIẾU CHUYỂN CƠ SỞ KHÁM BỆNH, CHỮA BỆNH BẢO HIỂM Y TẾ
   - Đọc file nguồn (.rtf / .docx) do phần mềm bệnh viện xuất ra (dạng "goc.rtf")
   - Tự nhận diện các trường thông tin (họ tên, năm sinh, BHYT, chẩn đoán...)
   - Đổ dữ liệu vào MẪU CHUẨN DUY NHẤT (giống file_map.docx) để bản in luôn
     đồng nhất về bố cục, dù file nguồn đầu vào có định dạng hơi khác nhau
   - Cho phép tinh chỉnh trực quan trước khi in:
       + Thu / giãn khối nội dung chính, đẩy lên/xuống
       + Kéo-thả khối "Ngày... / ĐẠI DIỆN CSKCB / Ký tên, đóng dấu" tới đúng
         vị trí con dấu đã đóng sẵn trên tờ giấy
       + Bù trừ (canh chỉnh) khi in để không bị lệch do máy in / khay giấy
       + Lưu lại vị trí đã canh (localStorage) cho lần in sau khỏi phải chỉnh lại
   Không cần sửa index.html — file này tự render vào #chuyenTuyenContent.
   ===================================================================== */
(function () {
  "use strict";

  var ROOT_ID = "chuyenTuyenContent";
  var LS_KEY = "ct_phieuchuyentuyen_settings_v1";
  var MAMMOTH_URL = "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js";

  var root = document.getElementById(ROOT_ID);
  if (!root) return;

  /* ---------------------------------------------------------------- */
  /* 0. Kích thước trang lấy CHÍNH XÁC từ file_map.pdf (612 x 792 pt)  */
  /*    -> mọi vị trí dòng bên dưới lấy nguyên toạ độ đo được trên PDF */
  /*    đó, chỉ chuyển đơn vị pt sang mm để không lệch bố cục gốc.     */
  /* ---------------------------------------------------------------- */
  var PT2MM = 0.352778;
  var PAGE_W_PT = 612, PAGE_H_PT = 792;
  var PAGE_W_MM = +(PAGE_W_PT * PT2MM).toFixed(2);
  var PAGE_H_MM = +(PAGE_H_PT * PT2MM).toFixed(2);
  function mm(pt) { return +(pt * PT2MM).toFixed(2); }

  /* ---------------------------------------------------------------- */
  /* 1. CSS                                                            */
  /* ---------------------------------------------------------------- */
  var style = document.createElement("style");
  style.textContent = [
    "#ctWrap{max-width:1400px;margin:0 auto;padding:16px;font-family:inherit;color:var(--text,#222);}",
    "#ctWrap h1{font-size:20px;margin:0 0 4px;}",
    "#ctWrap .ct-sub{color:var(--muted,#777);font-size:13px;margin:0 0 16px;}",
    ".ct-grid{display:grid;grid-template-columns:1fr 340px;gap:18px;align-items:start;}",
    ".ct-grid>.ct-panel{order:2;}",
    ".ct-grid>.ct-stage{order:1;}",
    "@media (max-width:980px){.ct-grid{grid-template-columns:1fr;}}",
    ".ct-panel{background:var(--surface,#fff);border:1px solid var(--border,#e2e2e2);border-radius:12px;padding:14px;position:sticky;top:12px;max-height:calc(100vh - 24px);overflow:auto;}",
    ".ct-panel h3{font-size:14px;margin:14px 0 8px;padding-top:10px;border-top:1px dashed var(--border,#ddd);}",
    ".ct-panel h3:first-child{margin-top:0;padding-top:0;border-top:none;}",
    ".ct-drop{border:2px dashed var(--blue,#0066FF);border-radius:10px;padding:18px 10px;text-align:center;cursor:pointer;background:var(--surface-2,#f5f8ff);font-size:13px;}",
    ".ct-drop:hover{background:var(--blue-light,#eaf1ff);}",
    ".ct-filerow{display:flex;align-items:center;gap:8px;font-size:12.5px;margin-top:8px;word-break:break-all;}",
    ".ct-filerow button{border:none;background:none;color:#c0392b;cursor:pointer;font-size:14px;}",
    ".ct-field{margin-bottom:8px;}",
    ".ct-field label{display:block;font-size:11.5px;color:var(--muted,#777);margin-bottom:2px;}",
    ".ct-field input,.ct-field textarea,.ct-field select{width:100%;box-sizing:border-box;font-size:12.5px;padding:6px 8px;border:1px solid var(--border,#ddd);border-radius:6px;background:var(--surface-2,#fafafa);color:inherit;font-family:inherit;}",
    ".ct-field textarea{resize:vertical;min-height:36px;}",
    ".ct-row2{display:grid;grid-template-columns:1fr 1fr;gap:8px;}",
    ".ct-row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;}",
    ".ct-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:none;border-radius:8px;padding:9px 14px;font-size:13px;cursor:pointer;background:var(--blue,#0066FF);color:#fff;width:100%;margin-top:4px;}",
    ".ct-btn.secondary{background:var(--surface-2,#eee);color:var(--text,#222);}",
    ".ct-btn.small{width:auto;padding:6px 10px;font-size:12px;}",
    ".ct-tools{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;}",
    ".ct-status{font-size:12px;margin-top:8px;min-height:16px;}",
    ".ct-status.ok{color:#1a7a37;}",
    ".ct-status.err{color:#c0392b;}",
    ".ct-hint{font-size:11.5px;color:var(--muted,#888);line-height:1.5;}",
    /* -------- vùng xem trước / bản in -------- */
    ".ct-stage{background:#5a5f66;border-radius:12px;padding:22px;display:flex;justify-content:center;overflow:auto;}",
    ".ct-sheet-outer{background:#fff;box-shadow:0 6px 24px rgba(0,0,0,.35);position:relative;}",
    "#ctSheet{width:" + PAGE_W_MM + "mm;height:" + PAGE_H_MM + "mm;background:#fff;position:relative;overflow:hidden;font-family:'Times New Roman',Times,serif;color:#000;}",
    "#ctContentLayer{position:relative;width:100%;height:100%;transform-origin:top left;box-sizing:border-box;}",
    "#ctContentLayer .l-row{position:relative;white-space:normal;line-height:1.28;box-sizing:border-box;}",
    "#ctContentLayer .l-flex{display:flex;box-sizing:border-box;}",
    "#ctContentLayer .l-title{text-align:center;font-weight:bold;}",
    "#ctContentLayer .l-kinhgui{text-align:center;}",
    "#ctContentLayer .l-section{font-weight:bold;text-align:center;}",
    /* Đã điền -> chỉ hiện chữ, KHÔNG gạch chân / không chấm để đỡ rối mắt.
       Chưa điền -> hiện các dấu chấm (dots) làm chỗ trống để viết tay, không viền. */
    "#ctContentLayer .fill{padding:0 1px;font-weight:600;white-space:pre-wrap;word-break:break-word;}",
    "#ctContentLayer .fill.empty{font-weight:400;color:#000;}",
    "#ctContentLayer .chk{display:inline-block;width:9px;height:9px;border:1px solid #000;text-align:center;line-height:8px;font-size:8px;margin:0 3px;vertical-align:1px;flex:none;}",
    "#ctContentLayer .circ{display:inline-block;border:1.3px solid #000;border-radius:50%;padding:0 4px;line-height:1.15;}",
    "#ctContentLayer .ct-lyrow{display:flex;justify-content:space-between;align-items:baseline;gap:8px;}",
    "#ctSigBlock{position:absolute;text-align:center;line-height:1.32;cursor:grab;padding:4px 10px;border-radius:6px;user-select:none;white-space:nowrap;}",
    "#ctSigBlock:active{cursor:grabbing;}",
    /* -------- khối kéo-thả tự do (đầu trang trái / quốc hiệu / SVV / chữ ký) -------- */
    /* Mỗi khối này KHÔNG nằm trong luồng chảy chữ chính -> kéo/thả/phóng to/thu nhỏ */
    /* rồi lưu lại, sẽ đứng yên tại đó, không bao giờ bị nội dung khác đẩy hay đè lên. */
    ".ct-block{position:absolute;line-height:1.28;white-space:nowrap;cursor:grab;user-select:none;padding:3px 6px;border-radius:6px;transform-origin:top left;}",
    ".ct-block:active{cursor:grabbing;}",
    ".ct-block.dragging,#ctSigBlock.dragging{outline:2px dashed #0066FF;background:rgba(0,102,255,.06);z-index:5;}",
    ".ct-block .ct-resize{position:absolute;right:-9px;bottom:-9px;width:14px;height:14px;border-radius:50%;background:#0066FF;border:2px solid #fff;cursor:nwse-resize;display:none;box-shadow:0 1px 3px rgba(0,0,0,.4);}",
    ".ct-block .ct-eye{position:absolute;left:-11px;top:-11px;width:18px;height:18px;border-radius:50%;background:#fff;border:1.5px solid #888;cursor:pointer;display:none;align-items:center;justify-content:center;font-size:11px;line-height:1;box-shadow:0 1px 3px rgba(0,0,0,.3);}",
    ".ct-block:hover .ct-resize,.ct-block.dragging .ct-resize{display:block;}",
    ".ct-block:hover .ct-eye,.ct-block.dragging .ct-eye{display:flex;}",
    ".ct-block.ct-hidden-print{opacity:.35;outline:1.5px dashed #999;}",
    ".ct-stampguide{position:absolute;border:1.5px dashed #ff5050;border-radius:50%;pointer-events:none;opacity:.55;display:none;}",
    "@media print{",
    "  html,body{height:" + PAGE_H_MM + "mm !important;overflow:hidden !important;margin:0 !important;padding:0 !important;}",
    "  body *{visibility:hidden !important;}",
    "  #ctSheet, #ctSheet *{visibility:visible !important;}",
    "  .ct-sheet-outer{position:absolute !important;left:0 !important;top:0 !important;box-shadow:none !important;}",
    "  #ctSheet{position:absolute !important;left:0 !important;top:0 !important;box-shadow:none !important;overflow:hidden !important;}",
    "  .ct-stampguide,.ct-resize{display:none !important;}",
    "  .ct-hidden-print{display:none !important;}",
    "  .ct-block{cursor:default !important;}",
    "  @page{size:" + PAGE_W_MM + "mm " + PAGE_H_MM + "mm;margin:0;}",
    "}"
  ].join("\n");
  document.head.appendChild(style);

  /* ---------------------------------------------------------------- */
  /* 2. HTML khung                                                     */
  /* ---------------------------------------------------------------- */
  root.innerHTML =
    '<div id="ctWrap">' +
      '<h1>🚑 Phiếu chuyển cơ sở KCB (BHYT)</h1>' +
      '<p class="ct-sub">Tải file gốc (.rtf/.docx) → tự nhận diện thông tin → đổ vào mẫu chuẩn → chỉnh vị trí bằng tay → in đúng khớp con dấu đã đóng sẵn.</p>' +
      '<div class="ct-grid">' +

        '<div class="ct-panel">' +
          '<h3>① Tải file phiếu gốc</h3>' +
          '<div class="ct-drop" id="ctDrop">📄 Bấm để chọn file <b>.rtf</b> hoặc <b>.docx</b><br><span class="ct-hint">(vd: goc.rtf, hoặc file word xuất từ phần mềm HIS)</span></div>' +
          '<input type="file" id="ctFileInput" accept=".rtf,.docx" hidden>' +
          '<div class="ct-filerow" id="ctFileRow" style="display:none;"><span id="ctFileName"></span><button id="ctFileRemove" title="Bỏ chọn">✕</button></div>' +
          '<div class="ct-status" id="ctStatus"></div>' +

          '<h3>② Thông tin đã nhận diện <span style="font-weight:400;color:var(--muted,#888);">(sửa nếu cần)</span></h3>' +
          '<div id="ctFields"></div>' +

          '<h3>③ Tinh chỉnh khi in</h3>' +
          '<div class="ct-field"><label>Cỡ khối nội dung chính (%)</label>' +
            '<input type="range" id="ctScale" min="80" max="115" value="100"></div>' +
          '<div class="ct-field"><label>Đẩy khối nội dung lên / xuống (mm)</label>' +
            '<input type="range" id="ctShiftY" min="-30" max="30" value="0"></div>' +
          '<div class="ct-hint">5 khối sau đứng <b>độc lập</b>, không bị chữ khác đè lên hay đẩy đi: "SỞ Y TẾ…/Số:…", "CỘNG HÒA…", "SVV/Số hồ sơ/Vào sổ…", "Ngày…/ĐẠI DIỆN CSKCB/Ký tên, đóng dấu" và "Ghi chú…". Rê chuột vào từng khối trên bản xem trước để <b>kéo đổi vị trí</b>; kéo chấm xanh ở góc để <b>phóng to/thu nhỏ</b>; bấm nút <b>👁</b> ở góc trên-trái để <b>ẩn/hiện khối đó khi in</b> (khối ẩn vẫn thấy mờ trên màn hình để dễ chỉnh, nhưng biến mất khi in/tải PDF/Word). Xong bấm "Lưu vị trí" — sẽ giữ nguyên mãi cho lần sau.</div>' +
          '<div class="ct-tools">' +
            '<button class="ct-btn small secondary" id="ctToggleGuide">🎯 Hiện/ẩn vòng canh dấu</button>' +
            '<button class="ct-btn small secondary" id="ctResetSig">↺ Reset tất cả vị trí</button>' +
          '</div>' +

          '<h3>④ Bù trừ lệch máy in</h3>' +
          '<div class="ct-hint">Nếu bản in bị lệch đều theo 1 hướng so với bản xem trước (do máy in/khay giấy), chỉnh 2 số dưới rồi in lại — hệ thống sẽ nhớ cho lần sau.</div>' +
          '<div class="ct-row2">' +
            '<div class="ct-field"><label>Lệch ngang (mm)</label><input type="number" id="ctCalX" value="0" step="0.5"></div>' +
            '<div class="ct-field"><label>Lệch dọc (mm)</label><input type="number" id="ctCalY" value="0" step="0.5"></div>' +
          '</div>' +

          '<h3>⑤ Xuất file</h3>' +
          '<div class="ct-row2">' +
            '<button class="ct-btn" id="ctPrintBtn">🖨️ Tải PDF</button>' +
            '<button class="ct-btn secondary" id="ctWordBtn">📝 Tải Word</button>' +
          '</div>' +
          '<div class="ct-hint">Word xuất ra giữ đúng nội dung &amp; vị trí các khối để bạn chỉnh tay thêm nếu cần; PDF là bản in chính xác từng mm như xem trước.</div>' +
          '<button class="ct-btn secondary" id="ctSaveBtn">💾 Lưu vị trí đã canh</button>' +
        '</div>' +

        '<div class="ct-stage"><div class="ct-sheet-outer"><div id="ctSheet"></div></div></div>' +
      '</div>' +
    '</div>';

  /* ---------------------------------------------------------------- */
  /* 3. Danh sách field + label hiển thị                               */
  /* ---------------------------------------------------------------- */
  var FIELD_DEFS = [
    ["svv", "SVV", "text"],
    ["soHoSoBenhAn", "Số hồ sơ (bệnh án)", "text"],
    ["vaoSoChuyenCSKCB", "Vào sổ chuyển CSKCB số", "text"],
    ["soHoSo", "Số phiếu (Số: …/PCCSKBCB)", "text"],
    ["kinhGui", "Kính gửi (nơi chuyển đến)", "text"],
    ["coSoGioiThieu", "Cơ sở KCB giới thiệu (nơi lập phiếu)", "text"],
    ["hoTen", "Họ và tên người bệnh", "text"],
    ["gioiTinh", "Giới tính", "select:Nam,Nữ"],
    ["namSinh", "Năm sinh", "text"],
    ["diaChi", "Địa chỉ", "text"],
    ["danToc", "Dân tộc", "text"],
    ["quocTich", "Quốc tịch", "text"],
    ["ngheNghiep", "Nghề nghiệp", "text"],
    ["noiLamViec", "Nơi làm việc", "text"],
    ["soThe", "Số thẻ BHYT", "text"],
    ["hanThe", "Hạn thẻ BHYT đến ngày/tháng/năm", "text"],
    ["dieuTri1", "Đã khám/điều trị tại (dòng 1)", "textarea"],
    ["dieuTri2", "Đã khám/điều trị tại (dòng 2, nếu có)", "textarea"],
    ["tomTatLamSang", "Tóm tắt dấu hiệu lâm sàng", "textarea"],
    ["tomTatCLS", "Tóm tắt kết quả xét nghiệm/CLS", "textarea"],
    ["chanDoan", "Chẩn đoán (ICD-10)", "textarea"],
    ["phuongPhapThuThuat", "Phương pháp, thủ thuật đã thực hiện", "textarea"],
    ["kyThuatThuoc", "Kỹ thuật, thuốc điều trị chính đã dùng", "textarea"],
    ["tinhTrang", "Tình trạng người bệnh lúc chuyển", "text"],
    ["lyDo", "Lý do chuyển (a / b / 2)", "select:1a - a) Phù hợp quy định chuyển cấp CMKT,1b - b) Không phù hợp khả năng đáp ứng,2 - 2. Theo yêu cầu người bệnh"],
    ["huongDieuTri", "Hướng điều trị", "text"],
    ["chuyenHoi", "Chuyển cơ sở KCB hồi (giờ, ngày tháng năm)", "text"],
    ["coGiaTri1Nam", "Có giá trị trong 01 năm", "select:Có,Không"],
    ["phuongTien", "Phương tiện vận chuyển", "text"],
    ["nguoiHoTong", "Người hộ tống (nếu có)", "text"],
    ["ngayKy", "Ngày ký phiếu (ngày tháng năm)", "text"]
  ];

  var DATA = {}; // giá trị field hiện tại

  function buildFieldsUI() {
    var wrap = document.getElementById("ctFields");
    var html = "";
    FIELD_DEFS.forEach(function (f) {
      var key = f[0], label = f[1], type = f[2];
      html += '<div class="ct-field"><label>' + label + '</label>';
      if (type === "textarea") {
        html += '<textarea data-k="' + key + '"></textarea>';
      } else if (type.indexOf("select:") === 0) {
        var opts = type.replace("select:", "").split(",");
        html += '<select data-k="' + key + '"><option value="">--</option>';
        opts.forEach(function (o) { html += '<option value="' + o + '">' + o + '</option>'; });
        html += '</select>';
      } else {
        html += '<input type="text" data-k="' + key + '">';
      }
      html += '</div>';
    });
    wrap.innerHTML = html;
    wrap.querySelectorAll("[data-k]").forEach(function (el) {
      el.addEventListener("input", function () {
        DATA[el.getAttribute("data-k")] = el.value;
        renderSheet();
      });
    });
  }

  function fillFieldsUI() {
    var wrap = document.getElementById("ctFields");
    wrap.querySelectorAll("[data-k]").forEach(function (el) {
      el.value = DATA[el.getAttribute("data-k")] || "";
    });
  }

  /* ---------------------------------------------------------------- */
  /* 4. Đọc & nhận diện file nguồn                                     */
  /* ---------------------------------------------------------------- */

  // Giải mã escape \uNNNN? kiểu RTF -> ký tự thật, và loại control-word.
  function decodeRtfChunk(s) {
    s = s.replace(/\\u(-?\d+)\??/g, function (m, code) {
      var c = parseInt(code, 10);
      if (c < 0) c += 65536;
      try { return String.fromCharCode(c); } catch (e) { return ""; }
    });
    s = s.replace(/\\par[d]?/g, " ");
    s = s.replace(/\\[a-zA-Z]+-?\d*/g, "");
    s = s.replace(/[{}]/g, "");
    return s.replace(/\s+/g, " ").trim();
  }

  // Trích các "shape" định vị tuyệt đối trong RTF (kiểu goc.rtf), gom theo hàng
  // (cùng khoảng shptop) thành từng dòng văn bản theo đúng thứ tự trình bày gốc.
  function rtfToLines(rtfText) {
    var re = /shpleft(-?\d+)\\shpright(-?\d+)\\shptop(-?\d+)\\shpbottom(-?\d+)[\s\S]*?\\shptxt\{([\s\S]*?)\}\}\}\}/g;
    var items = [];
    var m;
    while ((m = re.exec(rtfText)) !== null) {
      var left = parseInt(m[1], 10), top = parseInt(m[3], 10);
      var txt = decodeRtfChunk(m[5]);
      if (txt) items.push({ top: top, left: left, text: txt });
    }
    if (!items.length) return [];
    items.sort(function (a, b) { return a.top - b.top || a.left - b.left; });
    var lines = [];
    var cur = null, curTop = null;
    var TOL = 40; // dung sai (twips) coi là cùng 1 hàng
    items.forEach(function (it) {
      if (cur !== null && Math.abs(it.top - curTop) <= TOL) {
        cur.push(it.text);
      } else {
        if (cur) lines.push(cur.join(" "));
        cur = [it.text];
        curTop = it.top;
      }
    });
    if (cur) lines.push(cur.join(" "));
    return lines;
  }

  function loadMammoth() {
    if (window.mammoth) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = MAMMOTH_URL;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function docxToLines(arrayBuffer) {
    return loadMammoth().then(function () {
      return window.mammoth.extractRawText({ arrayBuffer: arrayBuffer }).then(function (res) {
        return res.value.split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
      });
    });
  }

  // ---- Trích field theo regex trên toàn văn bản đã gộp dòng ----
  function grab(text, re) {
    var m = text.match(re);
    return m ? m[1].trim().replace(/\s{2,}/g, " ") : "";
  }

  function extractFields(lines) {
    var text = lines.join("\n");
    var d = {};

    d.svv = grab(text, /\bSVV\s*:?\s*([^\n]+)/i);
    d.soHoSoBenhAn = grab(text, /Số hồ sơ\s*:\s*([^\n]+)/i);
    d.vaoSoChuyenCSKCB = grab(text, /Vào sổ chuyển[^:\n]*:?\s*([^\n]+)/i);
    d.soHoSo = grab(text, /\bSố\s*:\s*([^\n]+)/i);
    d.kinhGui = grab(text, /Kính gửi\s*:\s*([^\n]+)/i);
    d.coSoGioiThieu =
      grab(text, /Cơ sở khám bệnh,? chữa bệnh\s*:\s*([^\n]+?)\s*(?:-\s*)?trân trọng/i) ||
      grab(text, /^(BỆNH VIỆN[^\n]+)/im);

    d.hoTen = grab(text, /Họ và tên(?: người bệnh)?\s*:\s*([^\n]+?)(?=\s*-?\s*Nam\/N)/i) ||
              grab(text, /Họ và tên(?: người bệnh)?\s*:\s*([^\n]+)/i);
    var gt = grab(text, /Nam\/N[ữu]\s*:\s*([^\n\s]+)/i);
    d.gioiTinh = /nam/i.test(gt) && !/nữ/i.test(gt) ? "Nam" : (/nữ|n[ữu]/i.test(gt) ? "Nữ" : "");
    d.namSinh = grab(text, /Năm sinh\s*:?\s*([0-9]{4})/i);
    d.diaChi = grab(text, /Địa chỉ\s*:\s*([^\n]+?)(?=\s*-\s*Dân tộc|\n|$)/i);
    d.danToc = grab(text, /Dân tộc\s*:\s*([^\n]+?)(?=\s*Quốc tịch|\n|$)/i);
    d.quocTich = grab(text, /Quốc tịch\s*:\s*([^\n]+)/i);
    d.ngheNghiep = grab(text, /Nghề nghiệp\s*:\s*([^\n]+?)(?=\s*Nơi làm việc|\n|$)/i);
    d.noiLamViec = grab(text, /Nơi làm việc\s*:\s*([^\n]+)/i);
    d.soThe = grab(text, /Số thẻ bảo hiểm y tế\s*:\s*([^\n]+)/i);
    d.hanThe = grab(text, /Thời hạn sử dụng[^\n]*thẻ bảo hiểm y tế\s*(?:đến ngày)?\s*([^\n]+)/i);

    var dt = text.match(/\+\s*Tại\s*:\s*([^\n]+)/gi) || [];
    d.dieuTri1 = dt[0] ? dt[0].replace(/^\+\s*/, "").trim() : "";
    d.dieuTri2 = dt[1] ? dt[1].replace(/^\+\s*/, "").trim() : "";

    d.tomTatLamSang = grab(text, /Tóm tắt dấu hiệu lâm sàng\s*:\s*([^\n]+)/i);
    d.tomTatCLS = grab(text, /Tóm tắt kết quả xét nghiệm[^:]*:\s*([^\n]+)/i);
    d.chanDoan = grab(text, /Chẩn đoán\s*:\s*([^\n]+)/i);
    d.phuongPhapThuThuat = grab(text, /Phương pháp, thủ thuật đã thực hiện[^:]*:\s*([^\n]+)/i);
    d.kyThuatThuoc = grab(text, /(?:Kỹ thuật, thuốc điều trị chính đã (?:sử dụng|dùng))\s*:?\s*([^\n]+)/i);
    d.tinhTrang = grab(text, /Tình trạng người bệnh lúc chuyển[^:]*:\s*([^\n]+)/i);

    if (/Không phù hợp với khả năng/i.test(text) && /\bX\b/.test(text)) d.lyDo = "1b - Không phù hợp khả năng đáp ứng";
    else if (/Phù hợp với quy định chuyển cấp/i.test(text)) d.lyDo = "1a - Phù hợp quy định chuyển cấp CMKT";
    d.huongDieuTri = grab(text, /Hướng điều trị\s*:\s*([^\n]+)/i);
    d.chuyenHoi = grab(text, /Chuyển cơ sở khám bệnh, chữa bệnh hồi\s*:\s*([^\n]+)/i);
    var cgt = grab(text, /giá trị trong 01 năm\s*:\s*\(?([^)\n]+)/i);
    d.coGiaTri1Nam = /không/i.test(cgt) ? "Không" : (/có/i.test(cgt) ? "Có" : "");
    d.phuongTien = grab(text, /Phương tiện vận chuyển\s*:\s*([^\n]+)/i);
    d.nguoiHoTong = grab(text, /người hộ tống[^:]*:\s*([^\n]+)/i);
    d.ngayKy = grab(text, /Ngày\s+(\d{1,2}\s+tháng\s+\d{1,2}\s+năm\s+\d{4})/i);
    // Chỗ đóng mộc LUÔN LUÔN là "ĐẠI DIỆN CSKCB" — không tự nhận diện từ văn bản
    // gốc nữa (trước đây bị dính nhầm dòng "đại diện hợp pháp của người bệnh"
    // có sẵn trong 1 số file nguồn do regex bắt chữ không phân biệt hoa/thường).

    return d;
  }

  function handleFile(file) {
    setStatus("Đang đọc & nhận diện file…", "");
    var name = file.name.toLowerCase();
    var reader = new FileReader();
    reader.onerror = function () { setStatus("Không đọc được file.", "err"); };
    if (name.endsWith(".docx")) {
      reader.onload = function () {
        docxToLines(reader.result).then(function (lines) {
          applyExtracted(lines, file.name);
        }).catch(function (e) {
          console.error(e);
          setStatus("Lỗi đọc .docx: " + e.message, "err");
        });
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = function () {
        var lines = rtfToLines(String(reader.result));
        if (!lines.length) { setStatus("Không nhận diện được nội dung RTF.", "err"); return; }
        applyExtracted(lines, file.name);
      };
      reader.readAsText(file, "ISO-8859-1");
    }
  }

  function applyExtracted(lines, fname) {
    var d = extractFields(lines);
    Object.keys(d).forEach(function (k) { if (d[k]) DATA[k] = d[k]; });
    fillFieldsUI();
    renderSheet();
    document.getElementById("ctFileRow").style.display = "flex";
    document.getElementById("ctFileName").textContent = "📄 " + fname;
    var soDuoc = Object.keys(d).filter(function (k) { return d[k]; }).length;
    setStatus("Đã nhận diện " + soDuoc + "/" + FIELD_DEFS.length + " trường. Kiểm tra & sửa lại nếu cần ở mục ②.", "ok");
  }

  function setStatus(msg, cls) {
    var el = document.getElementById("ctStatus");
    el.textContent = msg;
    el.className = "ct-status" + (cls ? " " + cls : "");
  }

  /* ---------------------------------------------------------------- */
  /* 5. Render tờ phiếu THEO ĐÚNG TOẠ ĐỘ ĐO TỪ file_map.pdf             */
  /*    Mỗi dòng dưới đây giữ nguyên top/left (pt) đo được trên PDF     */
  /*    gốc — chỉ nội dung chỗ dấu chấm được thay bằng dữ liệu; nếu     */
  /*    nội dung dài hơn khung dòng, trình duyệt tự xuống hàng bên      */
  /*    trong khung đó (không xê dịch các dòng khác).                  */
  /* ---------------------------------------------------------------- */
  function esc(s) { return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function dots(n) { return new Array((n || 20) + 1).join("."); }
  // Đã điền -> chỉ hiện chữ (không viền, không chấm). Chưa điền -> hiện chấm
  // để chừa chỗ viết tay, giống hệt bản giấy gốc.
  function fillOr(s, dotLen) {
    return s
      ? '<span class="fill">' + esc(s) + '</span>'
      : '<span class="fill empty">' + dots(dotLen) + '</span>';
  }
  function box(checked) { return '<span class="chk">' + (checked ? "X" : "") + '</span>'; }
  function circ(text, active) { return active ? '<span class="circ">' + text + '</span>' : text; }

  // Một dòng nội dung trong luồng văn bản bình thường (giống Word): không còn
  // toạ độ "top" tuyệt đối nữa -> dòng nào dài hơn tự xuống hàng bên trong
  // đúng bề rộng của nó, và các dòng phía dưới TỰ ĐỘNG bị đẩy xuống theo
  // (không còn đè chữ lên nhau nữa). left/right vẫn giữ để canh lề trái/bề
  // rộng khung y như bản gốc đo được.
  function line(left, right, size, opt, build) {
    opt = opt || {};
    var css = "margin-left:" + mm(left) + "mm;width:" + mm(right - left) + "mm;" +
      "font-size:" + size + "pt;margin-bottom:" + (opt.gap != null ? opt.gap : 4) + "pt;";
    if (opt.bold) css += "font-weight:bold;";
    if (opt.center) css += "text-align:center;";
    return '<div class="l-row" style="' + css + '">' + build() + '</div>';
  }

  function buildFlowHTML(d) {
    var lyDo = d.lyDo || "";
    var is1a = lyDo.indexOf("1a") === 0, is1b = lyDo.indexOf("1b") === 0, is2 = lyDo.indexOf("2") === 0;
    var html = "";

    // Lưu ý: 3 cụm "SỞ Y TẾ.../Số:...", "CỘNG HÒA.../Độc lập...", "SVV/Số hồ
    // sơ/Vào sổ..." KHÔNG còn nằm trong luồng chữ chính nữa — chúng là 3 khối
    // kéo-thả độc lập (xem BLOCK_DEFS + renderBlocks) y như khối chữ ký, để
    // không bao giờ bị đè hay xô lệch bởi phần nội dung phía dưới.

    html += line(44, 568, 12.5, { bold: true, center: true, gap: 8 }, function () { return "PHIẾU CHUYỂN CƠ SỞ KHÁM BỆNH, CHỮA BỆNH BẢO HIỂM Y TẾ"; });

    html += line(44, 568, 10, { center: true, gap: 5 }, function () { return "Kính gửi: " + fillOr(d.kinhGui, 46); });
    html += line(44, 568, 9.5, { gap: 8 }, function () { return esc(d.coSoGioiThieu || "Bệnh viện Đa khoa Bình Dương") + " trân trọng giới thiệu:"; });

    html += line(44, 568, 9.5, {}, function () {
      return "- Họ và tên người bệnh: " + fillOr(d.hoTen, 34) + "&nbsp;&nbsp;Giới tính: " + fillOr(d.gioiTinh, 8) + "&nbsp;&nbsp;Năm sinh: " + fillOr(d.namSinh, 8);
    });
    html += line(44, 568, 9.5, {}, function () { return "- Địa chỉ: " + fillOr(d.diaChi, 110); });
    html += line(44, 568, 9.5, {}, function () { return "- Dân tộc: " + fillOr(d.danToc, 30) + "&nbsp;&nbsp;Quốc tịch: " + fillOr(d.quocTich, 30); });
    html += line(44, 568, 9.5, {}, function () { return "- Nghề nghiệp: " + fillOr(d.ngheNghiep, 26) + "&nbsp;&nbsp;Nơi làm việc: " + fillOr(d.noiLamViec, 26); });
    html += line(44, 568, 9.5, {}, function () { return "- Số thẻ bảo hiểm y tế: " + fillOr(d.soThe, 55); });
    html += line(44, 568, 9.5, {}, function () { return "- Thời hạn sử dụng của thẻ bảo hiểm y tế đến ngày: " + fillOr(d.hanThe, 24); });
    html += line(54, 500, 9.5, { gap: 8 }, function () { return "Hết thời hạn: " + box(false) + "&nbsp;&nbsp;&nbsp;Không xác định được thời hạn: " + box(false); });

    html += line(44, 400, 9.5, {}, function () { return "- Đã được khám bệnh, điều trị:"; });
    html += line(44, 568, 9.5, {}, function () { return "&nbsp;&nbsp;+ Tại: " + fillOr(d.dieuTri1, 90); });
    html += line(44, 568, 9.5, { gap: 8 }, function () { return "&nbsp;&nbsp;+ Tại: " + fillOr(d.dieuTri2, 90); });

    html += line(44, 300, 10.5, { bold: true, gap: 6 }, function () { return "TÓM TẮT BỆNH ÁN"; });
    html += line(44, 568, 9.5, {}, function () { return "- Tóm tắt dấu hiệu lâm sàng: " + fillOr(d.tomTatLamSang, 88); });
    html += line(44, 568, 9.5, {}, function () {
      return "- Tóm tắt kết quả xét nghiệm, cận lâm sàng chính có giá trị chẩn đoán, theo dõi điều trị: " + fillOr(d.tomTatCLS, 150);
    });
    html += line(44, 568, 9.5, {}, function () { return "- Chẩn đoán: " + fillOr(d.chanDoan, 95) + "&nbsp;(ICD-10)"; });

    html += line(44, 400, 9.5, {}, function () { return "- Phương pháp, thủ thuật đã thực hiện (nếu có):"; });
    html += line(44, 568, 9.5, {}, function () { return "+ " + fillOr(d.phuongPhapThuThuat, 150); });

    html += line(44, 568, 9.5, {}, function () { return "- Kỹ thuật, thuốc điều trị chính đã sử dụng: " + fillOr(d.kyThuatThuoc, 90); });
    html += line(44, 568, 9.5, {}, function () { return "- Tình trạng người bệnh lúc chuyển cơ sở KCB: " + fillOr(d.tinhTrang, 65); });

    html += line(44, 400, 9.5, {}, function () { return "- Lí do chuyển cơ sở khám bệnh, chữa bệnh:"; });
    html += line(44, 400, 9.5, {}, function () { return circ("1", is1a || is1b) + ". Đủ điều kiện chuyển cơ sở khám bệnh, chữa bệnh:"; });
    html += line(66, 568, 9.5, {}, function () { return '<div class="ct-lyrow"><span>a) Phù hợp với quy định chuyển cấp chuyên môn kỹ thuật:</span>' + box(is1a) + '</div>'; });
    html += line(66, 568, 9.5, {}, function () { return '<div class="ct-lyrow"><span>b) Không phù hợp với khả năng đáp ứng của cơ sở khám bệnh, chữa bệnh:</span>' + box(is1b) + '</div>'; });
    html += line(44, 568, 9.5, {}, function () { return "&nbsp;" + circ("2", is2) + ". Theo yêu cầu của người bệnh hoặc người đại diện hợp pháp của người bệnh."; });

    html += line(44, 568, 9.5, {}, function () { return "- Hướng điều trị: " + fillOr(d.huongDieuTri, 100); });
    html += line(44, 568, 9.5, {}, function () { return "- Chuyển cơ sở khám bệnh, chữa bệnh hồi: " + fillOr(d.chuyenHoi, 70); });
    html += line(44, 568, 9.5, {}, function () { return "- Trường hợp chuyển có giá trị trong 01 năm: " + fillOr(d.coGiaTri1Nam, 10); });
    html += line(44, 568, 9.5, {}, function () { return "- Phương tiện vận chuyển: " + fillOr(d.phuongTien, 90); });
    html += line(44, 568, 9.5, { gap: 30 }, function () { return "- Họ tên, chức danh người hộ tống (nếu có): " + fillOr(d.nguoiHoTong, 55); });

    // Khoảng trống lớn bên trên để chừa chỗ cho khối "Ngày.../ĐẠI DIỆN CSKCB/
    // Ký tên, đóng dấu" và khối "Ghi chú" (kéo-thả tự do, đặt đè lên khoảng
    // trống này — xem BLOCK_DEFS).

    return html;
  }

  /* ---------------------------------------------------------------- */
  /* 5b. 4 khối kéo-thả tự do (không nằm trong luồng chữ chính):        */
  /*     header trái / quốc hiệu / SVV-Số hồ sơ-Vào sổ / chữ ký         */
  /*     Mỗi khối: kéo để đổi vị trí, kéo chấm xanh góc để phóng to/    */
  /*     thu nhỏ, lưu lại (localStorage) rồi đứng yên mãi, không bị     */
  /*     nội dung khác đẩy hay đè lên nữa.                              */
  /* ---------------------------------------------------------------- */
  var BLOCK_DEFS = [
    {
      id: "hdrLeft", defLeft: 44, defTop: 23, defScale: 100,
      build: function (d) {
        return '<div style="font-weight:bold;font-size:9pt;">SỞ Y TẾ THÀNH PHỐ HỒ CHÍ MINH</div>' +
          '<div style="font-weight:bold;font-size:9pt;">' + esc(d.coSoGioiThieu || "BỆNH VIỆN ĐA KHOA BÌNH DƯƠNG – CƠ SỞ 2") + '</div>' +
          '<div style="font-size:9.5pt;margin-top:2pt;">Số: ' + fillOr(d.soHoSo, 10) + '/PCCSKBCB</div>';
      }
    },
    {
      id: "hdrCenter", defLeft: 300, defTop: 23, defScale: 100,
      build: function () {
        return '<div style="font-weight:bold;font-size:9pt;text-align:center;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>' +
          '<div style="font-size:9pt;text-align:center;">Độc lập - Tự do - Hạnh phúc</div>';
      }
    },
    {
      id: "hdrSvv", defLeft: 400, defTop: 60, defScale: 100,
      build: function (d) {
        return '<div style="font-size:8pt;">SVV: ' + fillOr(d.svv, 16) + '</div>' +
          '<div style="font-size:8pt;">Số hồ sơ: ' + fillOr(d.soHoSoBenhAn, 16) + '</div>' +
          '<div style="font-size:8pt;">Vào sổ chuyển CSKCB số: ' + fillOr(d.vaoSoChuyenCSKCB, 12) + '</div>';
      }
    },
    {
      id: "ctSigBlock", defLeft: 390, defTop: 608, defScale: 100,
      build: function (d) {
        return '<div style="font-style:italic;font-size:9.5pt;text-align:center;">Ngày ' + fillOr(d.ngayKy, 12) + '</div>' +
          '<div style="font-weight:bold;font-size:9.5pt;text-align:center;">ĐẠI DIỆN CSKCB</div>' +
          '<div style="font-style:italic;font-size:9.5pt;text-align:center;">(Ký tên, đóng dấu)</div>';
      }
    },
    {
      id: "ghiChu", defLeft: 44, defTop: 706, defScale: 100, wrap: true, width: 524,
      build: function () {
        return '<div style="font-weight:bold;font-size:8.5pt;">Ghi chú:</div>' +
          '<div style="font-size:8pt;">- Khoanh tròn vào mục 1 hoặc 2 lý do chuyển cơ sở khám bệnh, chữa bệnh. Trường hợp chọn mục 1, đánh dấu (X) vào ô tương ứng.</div>' +
          '<div style="font-size:8pt;">- Trường hợp phiếu chuyển cơ sở khám bệnh, chữa bệnh được hiển thị trên ứng dụng VNeID và có ký số đầy đủ theo quy định thì có giá trị tương đương bản giấy./.</div>';
      }
    }
  ];

  function renderBlocks(d) {
    var sheet = document.getElementById("ctSheet");
    BLOCK_DEFS.forEach(function (b) {
      var el = document.createElement("div");
      el.id = b.id;
      el.className = "ct-block";
      if (b.wrap) {
        el.style.whiteSpace = "normal";
        el.style.width = mm(b.width || 400) + "mm";
      }
      el.innerHTML = b.build(d) +
        '<div class="ct-eye" data-block="' + b.id + '" title="Ẩn/hiện khối này khi in">👁</div>' +
        '<div class="ct-resize" data-block="' + b.id + '"></div>';
      sheet.appendChild(el);
    });
    sheet.insertAdjacentHTML("beforeend", '<div class="ct-stampguide" id="ctStampGuide"></div>');
  }

  function renderSheet() {
    var d = DATA;
    var sheet = document.getElementById("ctSheet");
    // Chỉ 1 tờ phiếu duy nhất trong #ctSheet, không lặp lại nội dung.
    sheet.innerHTML = '<div id="ctContentLayer" style="padding-top:' + mm(95) + 'mm;padding-left:0;">' + buildFlowHTML(d) + '</div>';
    renderBlocks(d);
    applyTransformSettings();
    initDrag();
  }

  /* ---------------------------------------------------------------- */
  /* 6. Tinh chỉnh: scale/shift nội dung + kéo-thả/resize các khối       */
  /* ---------------------------------------------------------------- */
  var settings = loadSettings();

  function defaultBlocks() {
    var b = {};
    BLOCK_DEFS.forEach(function (d) {
      b[d.id] = { left: mm(d.defLeft), top: mm(d.defTop), scale: d.defScale };
    });
    return b;
  }

  function loadSettings() {
    var defB = defaultBlocks();
    try {
      var s = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
      var blocks = {};
      BLOCK_DEFS.forEach(function (bd) {
        var saved = (s.blocks && s.blocks[bd.id]) || null;
        // Tương thích ngược với bản cũ chỉ lưu sigLeft/sigTop cho khối chữ ký.
        if (!saved && bd.id === "ctSigBlock" && (s.sigLeft != null || s.sigTop != null)) {
          saved = { left: s.sigLeft, top: s.sigTop, scale: 100 };
        }
        blocks[bd.id] = saved ? {
          left: saved.left != null ? saved.left : defB[bd.id].left,
          top: saved.top != null ? saved.top : defB[bd.id].top,
          scale: saved.scale != null ? saved.scale : defB[bd.id].scale
        } : defB[bd.id];
      });
      return {
        scale: s.scale || 100,
        shiftY: s.shiftY || 0,
        calX: s.calX || 0,
        calY: s.calY || 0,
        blocks: blocks,
        hidden: s.hidden || {} // { blockId: true } -> ẩn khối đó khi IN (vẫn thấy khi xem trước, có viền chấm)
      };
    } catch (e) {
      return { scale: 100, shiftY: 0, calX: 0, calY: 0, blocks: defB, hidden: {} };
    }
  }
  function saveSettings() {
    localStorage.setItem(LS_KEY, JSON.stringify(settings));
    setStatus("Đã lưu vị trí canh chỉnh cho lần in sau.", "ok");
  }

  function applyTransformSettings() {
    var layer = document.getElementById("ctContentLayer");
    if (layer) {
      layer.style.transform = "scale(" + (settings.scale / 100) + ") translateY(" + settings.shiftY + "mm)";
    }
    BLOCK_DEFS.forEach(function (bd) {
      var el = document.getElementById(bd.id);
      var st = settings.blocks[bd.id];
      if (el && st) {
        el.style.left = st.left + "mm";
        el.style.top = st.top + "mm";
        el.style.transform = "scale(" + (st.scale / 100) + ")";
        el.classList.toggle("ct-hidden-print", !!settings.hidden[bd.id]);
      }
    });
    var sheet = document.getElementById("ctSheet");
    if (sheet) {
      sheet.style.transform = "translate(" + settings.calX + "mm," + settings.calY + "mm)";
    }
    var sigSt = settings.blocks.ctSigBlock;
    var guide = document.getElementById("ctStampGuide");
    if (guide && sigSt) {
      guide.style.left = (sigSt.left - 8) + "mm";
      guide.style.top = (sigSt.top - 14) + "mm";
      guide.style.width = "34mm";
      guide.style.height = "34mm";
    }
  }

  function initDrag() {
    var sheet = document.getElementById("ctSheet");
    if (!sheet) return;

    function pos(e) { return e.touches ? e.touches[0] : e; }

    BLOCK_DEFS.forEach(function (bd) {
      var el = document.getElementById(bd.id);
      if (!el) return;
      var dragging = false, resizing = false;
      var startX, startY, startLeft, startTop, startScale;

      el.addEventListener("mousedown", function (e) {
        if (e.target.classList.contains("ct-resize") || e.target.classList.contains("ct-eye")) return; // xử lý riêng
        down(e);
      });
      el.addEventListener("touchstart", function (e) {
        if (e.target.classList.contains("ct-resize") || e.target.classList.contains("ct-eye")) return;
        down(e);
      }, { passive: true });

      var eye = el.querySelector(".ct-eye");
      if (eye) {
        eye.addEventListener("click", function (e) {
          e.stopPropagation();
          settings.hidden[bd.id] = !settings.hidden[bd.id];
          applyTransformSettings();
        });
        eye.addEventListener("mousedown", function (e) { e.stopPropagation(); });
      }

      function down(e) {
        dragging = true;
        el.classList.add("dragging");
        var p = pos(e);
        startX = p.clientX; startY = p.clientY;
        startLeft = settings.blocks[bd.id].left; startTop = settings.blocks[bd.id].top;
        document.addEventListener("mousemove", move);
        document.addEventListener("touchmove", move, { passive: true });
        document.addEventListener("mouseup", up);
        document.addEventListener("touchend", up);
      }
      function move(e) {
        if (!dragging) return;
        var p = pos(e);
        var pxPerMm = sheet.getBoundingClientRect().width / PAGE_W_MM;
        var dxMm = (p.clientX - startX) / pxPerMm;
        var dyMm = (p.clientY - startY) / pxPerMm;
        settings.blocks[bd.id].left = Math.round((startLeft + dxMm) * 10) / 10;
        settings.blocks[bd.id].top = Math.round((startTop + dyMm) * 10) / 10;
        applyTransformSettings();
      }
      function up() {
        dragging = false;
        el.classList.remove("dragging");
        document.removeEventListener("mousemove", move);
        document.removeEventListener("touchmove", move);
        document.removeEventListener("mouseup", up);
        document.removeEventListener("touchend", up);
      }

      // ---- kéo chấm xanh góc để phóng to / thu nhỏ khối ----
      var handle = el.querySelector(".ct-resize");
      if (!handle) return;
      handle.addEventListener("mousedown", rdown);
      handle.addEventListener("touchstart", rdown, { passive: true });

      function rdown(e) {
        e.stopPropagation();
        resizing = true;
        el.classList.add("dragging");
        var p = pos(e);
        startX = p.clientX; startY = p.clientY;
        startScale = settings.blocks[bd.id].scale;
        document.addEventListener("mousemove", rmove);
        document.addEventListener("touchmove", rmove, { passive: true });
        document.addEventListener("mouseup", rup);
        document.addEventListener("touchend", rup);
      }
      function rmove(e) {
        if (!resizing) return;
        var p = pos(e);
        var dx = p.clientX - startX;
        var delta = dx / 2; // 2px kéo ~ 1% cỡ chữ
        var newScale = Math.max(50, Math.min(220, Math.round(startScale + delta)));
        settings.blocks[bd.id].scale = newScale;
        applyTransformSettings();
      }
      function rup() {
        resizing = false;
        el.classList.remove("dragging");
        document.removeEventListener("mousemove", rmove);
        document.removeEventListener("touchmove", rmove);
        document.removeEventListener("mouseup", rup);
        document.removeEventListener("touchend", rup);
      }
    });
  }

  /* ---------------------------------------------------------------- */
  /* 7. Gắn sự kiện UI                                                  */
  /* ---------------------------------------------------------------- */
  function bindUI() {
    var drop = document.getElementById("ctDrop");
    var input = document.getElementById("ctFileInput");
    drop.addEventListener("click", function () { input.click(); });
    drop.addEventListener("dragover", function (e) { e.preventDefault(); drop.style.opacity = .7; });
    drop.addEventListener("dragleave", function () { drop.style.opacity = 1; });
    drop.addEventListener("drop", function (e) {
      e.preventDefault(); drop.style.opacity = 1;
      if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });
    input.addEventListener("change", function () {
      if (input.files[0]) handleFile(input.files[0]);
    });
    document.getElementById("ctFileRemove").addEventListener("click", function () {
      input.value = "";
      document.getElementById("ctFileRow").style.display = "none";
      setStatus("", "");
    });

    document.getElementById("ctScale").addEventListener("input", function (e) {
      settings.scale = parseInt(e.target.value, 10); applyTransformSettings();
    });
    document.getElementById("ctShiftY").addEventListener("input", function (e) {
      settings.shiftY = parseInt(e.target.value, 10); applyTransformSettings();
    });
    document.getElementById("ctCalX").addEventListener("input", function (e) {
      settings.calX = parseFloat(e.target.value) || 0; applyTransformSettings();
    });
    document.getElementById("ctCalY").addEventListener("input", function (e) {
      settings.calY = parseFloat(e.target.value) || 0; applyTransformSettings();
    });
    document.getElementById("ctToggleGuide").addEventListener("click", function () {
      var g = document.getElementById("ctStampGuide");
      g.style.display = (g.style.display === "block") ? "none" : "block";
    });
    document.getElementById("ctResetSig").addEventListener("click", function () {
      settings.blocks = defaultBlocks();
      applyTransformSettings();
      setStatus("Đã đưa 4 khối về vị trí mặc định (chưa lưu).", "ok");
    });
    document.getElementById("ctSaveBtn").addEventListener("click", saveSettings);
    document.getElementById("ctPrintBtn").addEventListener("click", function () {
      saveSettings();
      window.print();
    });
    document.getElementById("ctWordBtn").addEventListener("click", exportWord);

    document.getElementById("ctScale").value = settings.scale;
    document.getElementById("ctShiftY").value = settings.shiftY;
    document.getElementById("ctCalX").value = settings.calX;
    document.getElementById("ctCalY").value = settings.calY;
  }

  /* ---------------------------------------------------------------- */
  /* 7b. Xuất Word (.docx) — chuyển nguyên bản #ctSheet (đã gồm cả 4    */
  /*     khối kéo-thả tại đúng vị trí đã canh) sang file .docx để Word  */
  /*     mở & chỉnh tay thêm nếu cần. PDF (nút Tải PDF ở trên) vẫn là   */
  /*     bản chuẩn khớp mm chính xác nhất để in.                        */
  /* ---------------------------------------------------------------- */
  var HTML_DOCX_URL = "https://cdnjs.cloudflare.com/ajax/libs/html-docx-js/0.3.1/html-docx.js";
  function loadHtmlDocx() {
    if (window.htmlDocx) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = HTML_DOCX_URL;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  function exportWord() {
    setStatus("Đang tạo file Word…", "");
    loadHtmlDocx().then(function () {
      var sheet = document.getElementById("ctSheet");
      var clone = sheet.cloneNode(true);
      // Bỏ các khối đang bật "ẩn khi in", và bỏ nút điều khiển (mắt/chấm resize)
      // khỏi bản xuất Word, chỉ giữ đúng nội dung sẽ thực sự in ra.
      clone.querySelectorAll(".ct-hidden-print").forEach(function (n) { n.remove(); });
      clone.querySelectorAll(".ct-eye,.ct-resize,.ct-stampguide").forEach(function (n) { n.remove(); });
      clone.style.transform = "none"; // bỏ lệch bù máy in khi xuất Word
      // Dựng 1 trang HTML tĩnh, giữ nguyên vị trí tuyệt đối (mm) của mọi
      // dòng/khối như bản xem trước, để mở trong Word vẫn đúng bố cục.
      var pageCss = "@page{size:" + PAGE_W_MM + "mm " + PAGE_H_MM + "mm;margin:0;}" +
        "body{margin:0;} #ctSheet{position:relative;width:" + PAGE_W_MM + "mm;height:" + PAGE_H_MM + "mm;font-family:'Times New Roman',Times,serif;}" +
        ".l-row,.ct-block{position:absolute;} .fill{font-weight:600;}";
      var fullHtml = "<!DOCTYPE html><html><head><meta charset='utf-8'><style>" + pageCss + "</style></head><body>" +
        clone.outerHTML + "</body></html>";
      var blob = window.htmlDocx.asBlob(fullHtml);
      var a = document.createElement("a");
      var fname = "PhieuChuyenCoSoKCB_" + (DATA.hoTen ? DATA.hoTen.replace(/\s+/g, "") : "phieu") + ".docx";
      a.href = URL.createObjectURL(blob);
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setStatus("Đã tải file Word. Lưu ý: Word có thể hiển thị hơi khác 1 chút so với bản xem trước/PDF do cách Word dựng khối tuyệt đối; nếu cần bản in khớp từng mm hãy dùng nút Tải PDF.", "ok");
    }).catch(function (e) {
      console.error(e);
      setStatus("Không tải được công cụ xuất Word (cần kết nối mạng). Hãy dùng nút Tải PDF.", "err");
    });
  }

  /* ---------------------------------------------------------------- */
  /* 8. Khởi động                                                       */
  /* ---------------------------------------------------------------- */
  buildFieldsUI();
  bindUI();
  renderSheet();
})();
