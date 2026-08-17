/* =====================================================================
   js/giay-ra-vien.js
   Tính năng: GIẤY RA VIỆN (Mẫu số 02, theo mẫu Bộ Y tế / TT liên quan)

   - Đọc file nguồn (.pdf / .docx / .rtf) do phần mềm bệnh viện xuất ra
   - Tự nhận diện các trường thông tin (họ tên, ngày sinh, chẩn đoán,
     ngày vào/ra viện...) và ánh xạ vào MẪU CHUẨN A4 (1 trang, đúng bố
     cục "Giấy ra viện" hiện hành — không thay đổi nội dung/cấu trúc mẫu)
   - Cho phép tinh chỉnh trực quan trước khi in (giống hệt công cụ
     "Giấy nghỉ việc BHXH"):
       + Thu / giãn khối nội dung, đẩy lên/xuống
       + Giãn/co khoảng cách dòng
       + Bù trừ (canh chỉnh) khi in để không bị lệch do máy in/khay giấy
       + Kéo-thả khối chữ ký khi cần
       + Lưu lại (localStorage + tuỳ chọn đồng bộ Cloudflare KV) cho lần in sau
   Không cần sửa index.html — file này tự render vào #giayRaVienContent.
   ===================================================================== */
(function () {
  "use strict";

  var ROOT_ID = "giayRaVienContent";
  var LS_KEY = "gr_giayravien_settings_v1";
  var MAMMOTH_URL = "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js";
  var PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
  var PDFJS_WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  // Dùng CHUNG 1 Worker Cloudflare với "Phiếu chuyển tuyến" / "Giấy nghỉ việc
  // BHXH" (phân biệt qua path riêng KV_SETTINGS_PATH nên không ghi đè nhau).
  // Để trống ("") thì công cụ chỉ lưu trên máy (localStorage), không đồng bộ.
  var KV_WORKER_URL = "https://mapping-ct-bhxh.dhabolero.workers.dev";
  var KV_SETTINGS_PATH = "/settings/giayravien";

  var root = document.getElementById(ROOT_ID);
  if (!root) return;

  /* ---------------------------------------------------------------- */
  /* 0. Kích thước trang: A4 ĐẦY ĐỦ (210 x 297mm)                      */
  /* ---------------------------------------------------------------- */
  var PAGE_W_MM = 210, PAGE_H_MM = 297;

  // Điền cứng (không lấy từ file nguồn vì file nguồn có thể sai/khác đơn vị).
  var SO_Y_TE = "SỞ Y TẾ THÀNH PHỐ HỒ CHÍ MINH";
  var HOSPITAL_NAME = "BỆNH VIỆN ĐA KHOA BÌNH DƯƠNG – CƠ SỞ 2";

  /* ---------------------------------------------------------------- */
  /* 1. CSS (đặt tiền tố "gr-" — giữ nguyên hệ khung/hành vi như "nv-") */
  /* ---------------------------------------------------------------- */
  var style = document.createElement("style");
  style.textContent = [
    "#grWrap{max-width:1400px;margin:0 auto;padding:16px;font-family:inherit;color:var(--text,#222);}",
    "#grWrap h1{font-size:20px;margin:0 0 4px;}",
    "#grWrap .gr-sub{color:var(--muted,#777);font-size:13px;margin:0 0 16px;}",
    ".gr-grid{display:grid;grid-template-columns:1fr 340px;gap:18px;align-items:start;}",
    ".gr-grid>.gr-panel{order:2;}",
    ".gr-grid>.gr-stage{order:1;}",
    "@media (max-width:980px){.gr-grid{grid-template-columns:1fr;}}",
    ".gr-panel{background:var(--surface,#fff);border:1px solid var(--border,#e2e2e2);border-radius:12px;padding:14px;position:sticky;top:12px;max-height:calc(100vh - 24px);overflow:auto;}",
    ".gr-panel h3{font-size:14px;margin:14px 0 8px;padding-top:10px;border-top:1px dashed var(--border,#ddd);}",
    ".gr-panel h3:first-child{margin-top:0;padding-top:0;border-top:none;}",
    ".gr-drop{border:2px dashed var(--blue,#0066FF);border-radius:10px;padding:18px 10px;text-align:center;cursor:pointer;background:var(--surface-2,#f5f8ff);font-size:13px;}",
    ".gr-drop:hover{background:var(--blue-light,#eaf1ff);}",
    ".gr-filerow{display:flex;align-items:center;gap:8px;font-size:12.5px;margin-top:8px;word-break:break-all;}",
    ".gr-filerow button{border:none;background:none;color:#c0392b;cursor:pointer;font-size:14px;}",
    ".gr-field{margin-bottom:8px;}",
    ".gr-field label{display:block;font-size:11.5px;color:var(--muted,#777);margin-bottom:2px;}",
    ".gr-field input,.gr-field textarea,.gr-field select{width:100%;box-sizing:border-box;font-size:12.5px;padding:6px 8px;border:1px solid var(--border,#ddd);border-radius:6px;background:var(--surface-2,#fafafa);color:inherit;font-family:inherit;}",
    ".gr-field textarea{resize:vertical;min-height:36px;}",
    ".gr-row2{display:grid;grid-template-columns:1fr 1fr;gap:8px;}",
    ".gr-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:none;border-radius:8px;padding:9px 14px;font-size:13px;cursor:pointer;background:var(--blue,#0066FF);color:#fff;width:100%;margin-top:4px;transition:transform .12s ease,box-shadow .12s ease,background .2s ease;}",
    ".gr-btn:active{transform:scale(.97);}",
    ".gr-btn.secondary{background:var(--surface-2,#eee);color:var(--text,#222);}",
    ".gr-btn.small{width:auto;padding:6px 10px;font-size:12px;}",
    ".gr-btn.save{background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;box-shadow:0 2px 8px rgba(22,163,74,.35);}",
    ".gr-btn.save.saved{background:linear-gradient(135deg,#16a34a,#15803d);animation:grSavedPop .45s ease;}",
    "@keyframes grSavedPop{0%{transform:scale(1);}35%{transform:scale(.94);box-shadow:0 0 0 0 rgba(34,197,94,.5);}70%{transform:scale(1.03);box-shadow:0 0 0 8px rgba(34,197,94,0);}100%{transform:scale(1);}}",
    ".gr-status{font-size:12px;margin-top:8px;min-height:16px;}",
    ".gr-status.ok{color:#1a7a37;}",
    ".gr-status.err{color:#c0392b;}",
    ".gr-hint{font-size:11.5px;color:var(--muted,#888);line-height:1.5;}",
    ".gr-switchrow{display:flex;align-items:center;gap:10px;margin:10px 0;font-size:13px;}",
    ".gr-switch{position:relative;display:inline-block;width:38px;height:22px;flex:none;}",
    ".gr-switch input{opacity:0;width:0;height:0;}",
    ".gr-slider{position:absolute;cursor:pointer;inset:0;background:#ccc;border-radius:22px;transition:.2s;}",
    ".gr-slider:before{content:'';position:absolute;width:16px;height:16px;left:3px;bottom:3px;background:#fff;border-radius:50%;transition:.2s;box-shadow:0 1px 2px rgba(0,0,0,.3);}",
    ".gr-switch input:checked+.gr-slider{background:#16a34a;}",
    ".gr-switch input:checked+.gr-slider:before{transform:translateX(16px);}",
    ".gr-btn.config{background:linear-gradient(135deg,#64748b,#475569);color:#fff;box-shadow:0 2px 8px rgba(71,85,105,.35);}",
    ".gr-btn.config:hover{box-shadow:0 3px 10px rgba(71,85,105,.45);}",
    ".gr-panel-view.hidden{display:none;}",
    ".gr-config-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;}",
    ".gr-config-head h3{margin:0;padding-top:0;border-top:none;}",
    ".gr-close-btn{border:none;background:var(--surface-2,#eee);color:var(--text,#222);border-radius:8px;padding:6px 14px;cursor:pointer;font-size:12.5px;font-weight:500;white-space:nowrap;}",
    ".gr-close-btn:hover{background:var(--border,#ddd);}",
    /* -------- vùng xem trước / bản in -------- */
    ".gr-stage{background:#5a5f66;border-radius:12px;padding:22px;display:flex;justify-content:center;overflow:auto;}",
    ".gr-sheet-outer{background:#fff;box-shadow:0 6px 24px rgba(0,0,0,.35);position:relative;}",
    "#grSheet{width:" + PAGE_W_MM + "mm;height:" + PAGE_H_MM + "mm;background:#fff;position:relative;overflow:hidden;font-family:'Times New Roman',Times,serif;color:#000;}",
    ".gr-body{position:relative;width:100%;height:100%;transform-origin:top left;box-sizing:border-box;padding:14mm 16mm 4mm;line-height:var(--gr-lh,1.5);}",
    ".gr-body .l-row{position:relative;white-space:normal;box-sizing:border-box;margin-bottom:1.6mm;}",
    ".gr-hd{display:flex;justify-content:space-between;align-items:flex-start;gap:10mm;}",
    ".gr-hd-left{font-weight:bold;text-transform:uppercase;font-size:11.5px;max-width:55%;line-height:1.35;text-align:center;}",
    ".gr-hd-right{text-align:center;font-size:11.5px;max-width:55%;}",
    ".gr-hd-right b{display:block;text-decoration:underline;}",
    ".gr-hd-so{font-weight:400;text-transform:none;font-size:11px;margin-top:1mm;text-align:center;}",
    ".gr-hd-ms{font-weight:400;font-size:11px;margin-top:2mm;}",
    ".gr-title{text-align:center;font-weight:bold;font-size:16px;margin:5mm 0 4mm;text-transform:uppercase;}",
    ".fill{padding:0 1px;font-weight:400;white-space:pre-wrap;word-break:break-word;}",
    ".l-flexrow{display:flex;flex-wrap:wrap;column-gap:15px;row-gap:1.6mm;}",
    ".fill-line{display:inline-block;min-width:14px;border-bottom:1px dotted #000;margin:0 2px 1px;vertical-align:-2px;}",
    ".l-item{display:inline-block;margin-right:15px;white-space:nowrap;}",
    ".l-item:last-child{margin-right:0;}",
    ".gr-footer{display:flex;justify-content:space-between;margin-top:5mm;text-align:center;font-size:11.5px;transform-origin:top left;}",
    "#grSheet.gr-editon .gr-footer{cursor:grab;outline:1.5px dashed transparent;border-radius:6px;}",
    "#grSheet.gr-editon .gr-footer:hover,#grSheet.gr-editon .gr-footer.dragging{outline-color:#0066FF;background:rgba(0,102,255,.06);}",
    "#grSheet.gr-editon .gr-footer.dragging{cursor:grabbing;}",
    ".gr-footer .col{width:46%;}",
    ".gr-footer b{display:block;}",
    ".gr-footer .italic{font-style:italic;font-size:10.5px;}",
    ".gr-footer .signspace{height:16mm;}",
    "@media print{",
    "  html.gr-printing,html.gr-printing body{height:" + PAGE_H_MM + "mm !important;overflow:hidden !important;margin:0 !important;padding:0 !important;}",
    "  html.gr-printing body *{visibility:hidden !important;}",
    "  html.gr-printing #grSheet, html.gr-printing #grSheet *{visibility:visible !important;}",
    "  html.gr-printing .gr-sheet-outer{position:absolute !important;left:0 !important;top:0 !important;box-shadow:none !important;}",
    "  html.gr-printing #grSheet{position:absolute !important;left:0 !important;top:0 !important;box-shadow:none !important;overflow:hidden !important;}",
    "}"
  ].join("\n");
  document.head.appendChild(style);

  /* ---------------------------------------------------------------- */
  /* 2. HTML khung                                                     */
  /* ---------------------------------------------------------------- */
  root.innerHTML =
    '<div id="grWrap">' +
      '<h1>🏥 Giấy ra viện</h1>' +
      '<p class="gr-sub">Mẫu số 02 — khổ A4</p>' +
      '<div class="gr-grid">' +

        '<div class="gr-panel">' +

          '<div class="gr-panel-view" id="grViewMain">' +
            '<h3>① Tải file gốc</h3>' +
            '<div class="gr-drop" id="grDrop">📄 Bấm để chọn file <b>.pdf</b>, <b>.docx</b> hoặc <b>.rtf</b><br><span class="gr-hint">(file gốc bệnh viện, hoặc bản scan/PDF có lớp chữ)</span></div>' +
            '<input type="file" id="grFileInput" accept=".pdf,.rtf,.docx" hidden>' +
            '<div class="gr-filerow" id="grFileRow" style="display:none;"><span id="grFileName"></span><button id="grFileRemove" title="Bỏ chọn">✕</button></div>' +
            '<div class="gr-status" id="grStatus"></div>' +

            '<h3>② Xuất file</h3>' +
            '<button class="gr-btn" id="grPrintBtn">🖨️ In / Tải PDF</button>' +

            '<h3>③ Tinh chỉnh khi in</h3>' +
            '<div class="gr-field"><label>Cỡ nội dung (%)</label>' +
              '<input type="range" id="grScale" min="80" max="115" value="100"></div>' +
            '<div class="gr-field"><label>Đẩy nội dung lên / xuống (mm)</label>' +
              '<input type="range" id="grShiftY" min="-15" max="15" value="0"></div>' +
            '<div class="gr-field"><label>↕️ Giãn / co khoảng cách dòng (%)</label>' +
              '<input type="range" id="grLineSpread" min="70" max="180" value="100"></div>' +

            '<h3>④ Bù trừ lệch máy in</h3>' +
            '<div class="gr-hint">Nếu bản in bị lệch đều theo 1 hướng so với xem trước, chỉnh 2 số dưới rồi in lại — hệ thống sẽ nhớ cho lần sau.</div>' +
            '<div class="gr-row2">' +
              '<div class="gr-field"><label>Lệch ngang (mm)</label><input type="number" id="grCalX" value="0" step="0.5"></div>' +
              '<div class="gr-field"><label>Lệch dọc (mm)</label><input type="number" id="grCalY" value="0" step="0.5"></div>' +
            '</div>' +

            '<button class="gr-btn config" id="grConfigBtn" style="margin-top:14px;">⚙️ Cấu hình</button>' +
          '</div>' +

          '<div class="gr-panel-view hidden" id="grViewConfig">' +
            '<div class="gr-config-head"><h3>⚙️ Cấu hình</h3><button class="gr-close-btn" id="grConfigClose">✕ Đóng</button></div>' +

            '<h3>Thông tin đã nhận diện <span style="font-weight:400;color:var(--muted,#888);">(sửa nếu cần)</span></h3>' +
            '<div id="grFields"></div>' +

            '<h3>Bố cục</h3>' +
            '<div class="gr-switchrow">' +
              '<label class="gr-switch"><input type="checkbox" id="grEditModeToggle"><span class="gr-slider"></span></label>' +
              '<span>✏️ Chỉnh sửa vị trí bố cục (kéo-thả khối "Ngày.../Đại diện đơn vị/Người hành nghề, ký tên")</span>' +
            '</div>' +
            '<div class="gr-hint">Tắt đi để khoá, tránh vô tình kéo lệch khối chữ ký khi chỉ muốn nhập liệu. Kéo khối chữ ký tới đúng vị trí con dấu đã đóng sẵn trên tờ giấy nếu cần.</div>' +
            '<button class="gr-btn save" id="grSaveBtn">💾 Lưu tinh chỉnh</button>' +
            '<button class="gr-btn small secondary" id="grResetLayout">↺ Đưa vị trí &amp; khoảng cách dòng về mặc định</button>' +
          '</div>' +

        '</div>' +

        '<div class="gr-stage"><div class="gr-sheet-outer"><div id="grSheet"></div></div></div>' +
      '</div>' +
    '</div>';

  /* ---------------------------------------------------------------- */
  /* 3. Danh sách field + label hiển thị                               */
  /* ---------------------------------------------------------------- */
  var FIELD_DEFS = [
    ["soGiay", "Số (đầu trang)", "text"],
    ["soHoSo", "Số hồ sơ/Số BA", "text"],
    ["hoTen", "Họ tên người bệnh", "text"],
    ["ngaySinh", "Ngày/tháng/năm sinh", "text"],
    ["tuoi", "Tuổi", "text"],
    ["gioiTinh", "Nam/Nữ", "select:Nam,Nữ"],
    ["danToc", "Dân tộc", "text"],
    ["ngheNghiep", "Nghề nghiệp", "text"],
    ["cccd", "Số CCCD/CMND/ĐDCD/Hộ chiếu", "text"],
    ["ngayCapCCCD", "Ngày cấp CCCD", "text"],
    ["maBHXH", "Mã số BHXH/Thẻ BHYT số (nếu có)", "text"],
    ["diaChi", "Địa chỉ", "textarea"],
    ["vaoVien", "Vào viện lúc", "text"],
    ["raVien", "Ra viện lúc", "text"],
    ["chanDoan", "Chẩn đoán", "textarea"],
    ["phuongPhap", "Phương pháp điều trị", "textarea"],
    ["ghiChu", "Ghi chú", "textarea"],
    ["ngayKyNgay", "Ngày ký", "text"],
    ["ngayKyThang", "Tháng ký", "text"],
    ["ngayKyNam", "Năm ký", "text"],
    ["nguoiHanhNghe", "Người hành nghề (tên)", "text"]
  ];

  var DATA = {};

  function buildFieldsUI() {
    var wrap = document.getElementById("grFields");
    var html = "";
    FIELD_DEFS.forEach(function (f) {
      var key = f[0], label = f[1], type = f[2];
      html += '<div class="gr-field"><label>' + label + '</label>';
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

  function syncFieldsUIFromData() {
    var wrap = document.getElementById("grFields");
    wrap.querySelectorAll("[data-k]").forEach(function (el) {
      el.value = DATA[el.getAttribute("data-k")] || "";
    });
  }

  /* ---------------------------------------------------------------- */
  /* 4. Nhận diện thông tin từ văn bản nguồn (đã giải mã .rtf/.docx/.pdf) */
  /* ---------------------------------------------------------------- */
  function grab(re, text) {
    var m = re.exec(text);
    return m ? m[1].trim() : "";
  }

  function dedupeRepeat(s) {
    if (!s) return s;
    var str = s.trim();
    var m = /^(.+?)\s*\1$/.exec(str);
    if (m) return m[1].trim();
    var words = str.split(/\s+/);
    var out = [];
    for (var i = 0; i < words.length; i++) {
      if (words[i] !== words[i + 1]) out.push(words[i]);
      else i++;
    }
    return out.join(" ");
  }

  // Chuỗi toàn dấu chấm/gạch dưới (mẫu trống chưa điền, VD "......../........")
  // -> coi như KHÔNG có giá trị, tránh nhận nhầm placeholder của mẫu thành dữ liệu thật.
  function isPlaceholderDots(s) {
    if (!s) return true;
    return /^[.\-_\/\s]*$/.test(s);
  }

  // Phần mềm HIS xuất "Giấy ra viện" thường in nhóm nhãn ("- Họ tên người
  // bệnh:- Dân tộc:- Vào viện lúc:- Ngày/tháng/năm sinh: <ngày sinh>") trên
  // 1 dòng, còn giá trị của 3 nhãn đầu lại nằm tách riêng ở 3 dòng NGAY SAU
  // đó nhưng theo thứ tự NGƯỢC LẠI (dân tộc, vào viện, họ tên) — đây là đặc
  // điểm cố định của bản in này (đã kiểm chứng qua nhiều phiếu mẫu thật),
  // nên tách khối này riêng thay vì dò theo nhãn:giá trị liền kề như phần còn lại.
  function extractIdentityBlock(lines) {
    for (var i = 0; i < lines.length; i++) {
      if (/Ngày\/tháng\/năm sinh/i.test(lines[i]) && /Họ tên người bệnh/i.test(lines[i])) {
        var out = {};
        var ns = /Ngày\/tháng\/năm sinh:?\s*([0-9\/]+)/i.exec(lines[i]);
        if (ns) out.ngaySinh = ns[1];

        var lDanToc = (lines[i + 1] || "").trim();
        var lVaoVien = (lines[i + 2] || "").trim();
        var lHoTen = (lines[i + 3] || "").trim();
        var lNgheDong = (lines[i + 4] || "").trim();

        if (lDanToc && lDanToc.length <= 25 && !/[0-9]/.test(lDanToc)) out.danToc = lDanToc;
        if (/gi[oờ]/i.test(lVaoVien) && /ng[aà]y/i.test(lVaoVien)) out.vaoVien = lVaoVien;
        if (/^[A-ZÀ-Ỹ][A-ZÀ-Ỹ\s]{3,60}$/.test(lHoTen)) out.hoTen = lHoTen;
        var ngheMatch = /Nghề nghiệp:?\s*(.+)/i.exec(lNgheDong);
        if (ngheMatch) out.ngheNghiep = ngheMatch[1].trim();

        return out;
      }
    }
    return null;
  }

  function parseFields(rawText) {
    // Giữ nguyên xuống dòng (cần cho khối nhận diện họ tên/dân tộc/vào viện ở
    // trên) — chỉ gọn khoảng trắng THỪA trong TỪNG dòng, không gộp các dòng lại.
    var lines = rawText.split("\n").map(function (s) { return s.replace(/\s+/g, " ").trim(); }).filter(Boolean);
    var t = rawText.replace(/\s+/g, " ").trim(); // bản gộp 1 dòng, dùng cho các field label:value liền kề

    var d = {};

    var idBlock = extractIdentityBlock(lines);
    if (idBlock) Object.assign(d, idBlock);

    var tuoiM = /\(?Tuổi:?\s*([0-9]{1,3})\s*tuổi/i.exec(t);
    if (tuoiM) d.tuoi = tuoiM[1];
    if (/Nam\/n[ữu]:?\s*Nữ/i.test(t) || /Giới tính:?\s*Nữ/i.test(t)) d.gioiTinh = "Nữ";
    else if (/Nam\/n[ữu]:?\s*Nam/i.test(t) || /Giới tính:?\s*Nam/i.test(t)) d.gioiTinh = "Nam";

    d.cccd = grab(/Số CCCD\/CMND\/[^:]*:?\s*([0-9]{6,15})/i, t);
    d.ngayCapCCCD = grab(/Ngày cấp:?\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})/i, t);
    d.maBHXH = grab(/Mã số BHXH\/Thẻ BHYT số\s*\(nếu có\):?\s*([0-9A-Za-z\/]{6,40})/i, t);

    d.diaChi = dedupeRepeat(grab(/Địa chỉ:?\s*(.+?)\s*-\s*Ra viện lúc/i, t));
    d.vaoVien = d.vaoVien || grab(/Vào viện lúc:?\s*(.+?)\s*-\s*(?:Ra viện lúc|Chẩn đoán)/i, t);
    d.raVien = grab(/Ra viện lúc:?\s*(.+?)\s*-\s*Chẩn đoán/i, t);
    d.chanDoan = grab(/Chẩn đoán:?\s*(.+?)\s*-\s*Phương pháp điều trị/i, t);
    d.phuongPhap = grab(/Phương pháp điều trị\s*:?\s*(.+?)\s*-\s*Ghi chú/i, t);
    d.ghiChu = grab(/Ghi chú:?\s*(.+?)(?:\(Tuổi|Đại diện đơn vị|$)/i, t);

    // Ngày ký ở cuối trang — lấy occurrence "Ngày...tháng...năm..." SAU cụm
    // "Đại diện đơn vị" (tránh nhầm với ngày vào/ra viện đứng trước đó).
    var afterIdx = t.search(/Đại diện đơn vị/i);
    var tail = afterIdx !== -1 ? t.slice(afterIdx) : t;
    var kyM = /Ngày\s*([0-9]{1,2})\s*tháng\s*([0-9]{1,2})\s*năm\s*([0-9]{4})/i.exec(tail);
    if (kyM) { d.ngayKyNgay = kyM[1]; d.ngayKyThang = kyM[2]; d.ngayKyNam = kyM[3]; }

    // Bỏ các giá trị chỉ toàn dấu chấm/gạch (placeholder mẫu trống chưa điền).
    Object.keys(d).forEach(function (k) {
      if (d[k] && isPlaceholderDots(d[k])) delete d[k];
    });
    Object.keys(d).forEach(function (k) { if (d[k]) DATA[k] = d[k]; });
  }

  /* ---------------------------------------------------------------- */
  /* 5. Đọc file .pdf (pdf.js) / .docx (mammoth) / .rtf (giải mã đơn giản) */
  /* ---------------------------------------------------------------- */
  var mammothLoaded = false;
  function ensureMammoth(cb) {
    if (mammothLoaded || window.mammoth) { mammothLoaded = true; cb(); return; }
    var s = document.createElement("script");
    s.src = MAMMOTH_URL;
    s.onload = function () { mammothLoaded = true; cb(); };
    s.onerror = function () { setStatus("Không tải được thư viện đọc .docx (kiểm tra mạng).", "err"); };
    document.head.appendChild(s);
  }

  var pdfjsLoaded = false;
  function ensurePdfJs(cb) {
    if (pdfjsLoaded || window.pdfjsLib) { pdfjsLoaded = true; cb(); return; }
    var s = document.createElement("script");
    s.src = PDFJS_URL;
    s.onload = function () {
      pdfjsLoaded = true;
      try { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL; } catch (e) {}
      cb();
    };
    s.onerror = function () { setStatus("Không tải được thư viện đọc .pdf (kiểm tra mạng).", "err"); };
    document.head.appendChild(s);
  }

  // Sắp lại các mảnh chữ theo đúng vị trí trên trang (trên->dưới, trái->phải)
  // trước khi ghép thành văn bản — pdf.js trả text theo thứ tự trong luồng dữ
  // liệu PDF, không theo vị trí hiển thị.
  function reorderPdfItems(items) {
    var rows = items.map(function (it) {
      return { str: it.str, x: it.transform[4], y: it.transform[5] };
    }).filter(function (it) { return it.str && it.str.length; });
    rows.sort(function (a, b) { return b.y - a.y || a.x - b.x; });
    var TOL = 2.2;
    var lines = [];
    var cur = null, curY = null;
    rows.forEach(function (it) {
      if (cur !== null && Math.abs(it.y - curY) <= TOL) {
        cur.push(it);
      } else {
        if (cur) lines.push(cur);
        cur = [it];
        curY = it.y;
      }
    });
    if (cur) lines.push(cur);
    return lines.map(function (line) {
      line.sort(function (a, b) { return a.x - b.x; });
      return line.map(function (it) { return it.str; }).join(" ");
    }).join("\n");
  }

  function extractPdfText(arrayBuffer, cb) {
    ensurePdfJs(function () {
      window.pdfjsLib.getDocument({ data: arrayBuffer }).promise
        .then(function (pdf) {
          var pages = [];
          for (var i = 1; i <= pdf.numPages; i++) pages.push(i);
          var fullText = "";
          function next() {
            if (!pages.length) { cb(null, fullText); return; }
            var pageNum = pages.shift();
            pdf.getPage(pageNum).then(function (page) {
              return page.getTextContent();
            }).then(function (content) {
              fullText += reorderPdfItems(content.items) + "\n\n";
              next();
            }).catch(function (err) { cb(err); });
          }
          next();
        })
        .catch(function (err) { cb(err); });
    });
  }

  function decodeRtfSimple(rtf) {
    var s = rtf;
    s = s.replace(/\\u(-?\d+)\??/g, function (m, code) {
      var c = parseInt(code, 10); if (c < 0) c += 65536;
      try { return String.fromCharCode(c); } catch (e) { return ""; }
    });
    s = s.replace(/\\'([0-9a-fA-F]{2})/g, function (m, hex) {
      try { return String.fromCharCode(parseInt(hex, 16)); } catch (e) { return ""; }
    });
    s = s.replace(/\\par[d]?/g, "\n");
    s = s.replace(/\\tab/g, " ");
    s = s.replace(/[{}]/g, "");
    s = s.replace(/\\[a-zA-Z]+-?\d*[ ]?/g, "");
    s = s.replace(/[ \t]+/g, " ");
    try { s = s.normalize("NFC"); } catch (e) {}
    return s.trim();
  }

  function handleFile(file) {
    document.getElementById("grFileName").textContent = file.name;
    document.getElementById("grFileRow").style.display = "flex";
    setStatus("Đang đọc file…", "");
    var ext = (file.name.split(".").pop() || "").toLowerCase();
    var reader = new FileReader();
    if (ext === "pdf") {
      reader.onload = function (e) {
        extractPdfText(e.target.result, function (err, text) {
          if (err) { setStatus("Lỗi đọc .pdf: " + err.message, "err"); return; }
          if (!text || !text.trim()) {
            setStatus("File PDF này có vẻ là bản scan ảnh, không có lớp chữ để đọc tự động. Vui lòng nhập tay các trường bên trên.", "err");
            return;
          }
          parseFields(text);
          syncFieldsUIFromData();
          renderSheet();
          setStatus("Đã nhận diện thông tin từ file .pdf. Kiểm tra lại các trường bên trên.", "ok");
        });
      };
      reader.readAsArrayBuffer(file);
    } else if (ext === "docx") {
      ensureMammoth(function () {
        reader.onload = function (e) {
          window.mammoth.extractRawText({ arrayBuffer: e.target.result })
            .then(function (res) {
              parseFields(res.value || "");
              syncFieldsUIFromData();
              renderSheet();
              setStatus("Đã nhận diện thông tin từ file .docx. Kiểm tra lại các trường bên trên.", "ok");
            })
            .catch(function (err) { setStatus("Lỗi đọc .docx: " + err.message, "err"); });
        };
        reader.readAsArrayBuffer(file);
      });
    } else if (ext === "rtf") {
      reader.onload = function (e) {
        try {
          var text = decodeRtfSimple(String(e.target.result));
          parseFields(text);
          syncFieldsUIFromData();
          renderSheet();
          setStatus("Đã nhận diện thông tin từ file .rtf. Kiểm tra lại các trường bên trên.", "ok");
        } catch (err) { setStatus("Lỗi đọc .rtf: " + err.message, "err"); }
      };
      reader.readAsText(file, "utf-8");
    } else {
      setStatus("Chỉ hỗ trợ file .pdf, .rtf hoặc .docx.", "err");
    }
  }

  function setStatus(msg, cls) {
    var el = document.getElementById("grStatus");
    el.textContent = msg;
    el.className = "gr-status" + (cls ? " " + cls : "");
  }

  /* ---------------------------------------------------------------- */
  /* 6. Cài đặt canh in (localStorage / KV Worker tuỳ chọn)            */
  /* ---------------------------------------------------------------- */
  var settings = { scale: 100, shiftY: 0, calX: 0, calY: 0, lineSpread: 100, editMode: false, footerX: 0, footerY: 0 };

  function loadSettingsLocal() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (raw) settings = Object.assign(settings, JSON.parse(raw));
    } catch (e) {}
  }
  function saveSettingsLocal() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(settings)); } catch (e) {}
  }
  function fetchSettingsFromKV() {
    if (!KV_WORKER_URL) return;
    fetch(KV_WORKER_URL.replace(/\/$/, "") + KV_SETTINGS_PATH)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || Object.keys(data).length === 0) return;
        settings = Object.assign(settings, data);
        localStorage.setItem(LS_KEY, JSON.stringify(settings));
        applyTransformSettings();
        syncFieldsUIFromSettings();
        setStatus("Đã tải cấu hình canh chỉnh dùng chung từ máy chủ.", "ok");
      })
      .catch(function () { /* offline hoặc chưa cấu hình đúng -> bỏ qua êm */ });
  }
  function pushSettingsToKV(onDone) {
    if (!KV_WORKER_URL) { onDone && onDone(null); return; }
    fetch(KV_WORKER_URL.replace(/\/$/, "") + KV_SETTINGS_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings)
    })
      .then(function (r) { onDone && onDone(r.ok); })
      .catch(function () { onDone && onDone(false); });
  }
  function saveSettings() {
    saveSettingsLocal();
    var btn = document.getElementById("grSaveBtn");
    function flashButton(label) {
      if (!btn) return;
      if (btn._savedTimer) clearTimeout(btn._savedTimer);
      var original = btn._originalLabel || btn.innerHTML;
      btn._originalLabel = original;
      btn.classList.remove("saved");
      void btn.offsetWidth;
      btn.classList.add("saved");
      btn.innerHTML = label;
      btn._savedTimer = setTimeout(function () {
        btn.innerHTML = original;
        btn.classList.remove("saved");
      }, 1500);
    }
    if (!KV_WORKER_URL) {
      setStatus("Đã lưu vị trí canh chỉnh cho lần in sau (trên máy này).", "ok");
      flashButton("✅ Đã lưu!");
      return;
    }
    flashButton("⏳ Đang lưu...");
    pushSettingsToKV(function (ok) {
      if (ok) {
        setStatus("Đã lưu vị trí canh chỉnh — dùng chung cho mọi máy/mọi người mở trang.", "ok");
        flashButton("✅ Đã lưu (đồng bộ)!");
      } else {
        setStatus("Đã lưu trên máy này, nhưng đồng bộ máy chủ thất bại (kiểm tra mạng/cấu hình Worker).", "err");
        flashButton("⚠️ Chỉ lưu máy");
      }
    });
  }
  function syncFieldsUIFromSettings() {
    document.getElementById("grScale").value = settings.scale;
    document.getElementById("grShiftY").value = settings.shiftY;
    document.getElementById("grCalX").value = settings.calX;
    document.getElementById("grCalY").value = settings.calY;
    document.getElementById("grLineSpread").value = settings.lineSpread;
    var editEl = document.getElementById("grEditModeToggle");
    if (editEl) editEl.checked = !!settings.editMode;
  }
  function applyTransformSettings() {
    var scale = (settings.scale || 100) / 100;
    var shiftY = settings.shiftY || 0;
    var b = document.querySelector(".gr-body");
    if (b) b.style.transform = "translate(" + (settings.calX || 0) + "mm," + ((settings.calY || 0) + shiftY) + "mm) scale(" + scale + ")";
    var lh = 1.5 * ((settings.lineSpread || 100) / 100);
    if (b) b.style.setProperty("--gr-lh", lh.toFixed(3));
    var footer = document.querySelector(".gr-footer");
    if (footer) footer.style.transform = "translate(" + (settings.footerX || 0) + "mm," + (settings.footerY || 0) + "mm)";
    var sheet = document.getElementById("grSheet");
    if (sheet) sheet.classList.toggle("gr-editon", !!settings.editMode);
  }

  /* ---------------------------------------------------------------- */
  /* 7. Render nội dung tờ giấy — GIỮ NGUYÊN cấu trúc/nội dung mẫu     */
  /* ---------------------------------------------------------------- */
  function esc(s) { return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function fillOrLine(val, widthHint) {
    if (val && String(val).trim()) return '<span class="fill">' + esc(val) + '</span>';
    return '<span class="fill-line" style="min-width:' + (widthHint || 40) + 'mm"></span>';
  }

  function renderSheetBody() {
    var d = DATA;
    var html = "";

    html += '<div class="l-row gr-hd">' +
              '<div class="gr-hd-left">' + esc(SO_Y_TE) + '<br>' + esc(HOSPITAL_NAME) +
                '<div class="gr-hd-so">Số: ' + fillOrLine(d.soGiay, 45) + '</div>' +
              '</div>' +
              '<div class="gr-hd-right">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM<b>Độc lập - Tự do - Hạnh phúc</b>' +
                '<div class="gr-hd-ms">MS: 02</div>' +
                '<div>Số hồ sơ/Số BA: ' + fillOrLine(d.soHoSo, 40) + '</div>' +
              '</div>' +
            '</div>';

    html += '<div class="gr-title">Giấy ra viện</div>';

    html += '<div class="l-row">- Họ tên người bệnh: ' + fillOrLine(d.hoTen, 90) + '</div>';
    html += '<div class="l-row l-flexrow">' +
              '<span class="l-item">- Ngày/tháng/năm sinh: ' + fillOrLine(d.ngaySinh, 26) + '</span>' +
              '<span class="l-item">(Tuổi: ' + fillOrLine(d.tuoi, 10) + ')</span>' +
              '<span class="l-item">Nam/Nữ: ' + fillOrLine(d.gioiTinh, 14) + '</span>' +
            '</div>';
    html += '<div class="l-row l-flexrow">' +
              '<span class="l-item">- Dân tộc: ' + fillOrLine(d.danToc, 30) + '</span>' +
              '<span class="l-item">Nghề nghiệp: ' + fillOrLine(d.ngheNghiep, 45) + '</span>' +
            '</div>';
    html += '<div class="l-row l-flexrow">' +
              '<span class="l-item">- Số CCCD/CMND/Định danh công dân/Hộ chiếu: ' + fillOrLine(d.cccd, 32) + '</span>' +
              '<span class="l-item">Ngày cấp: ' + fillOrLine(d.ngayCapCCCD, 22) + '</span>' +
            '</div>';
    html += '<div class="l-row">- Mã số BHXH/Thẻ BHYT số (nếu có): ' + fillOrLine(d.maBHXH, 60) + '</div>';
    html += '<div class="l-row">- Địa chỉ: ' + fillOrLine(d.diaChi, 130) + '</div>';
    html += '<div class="l-row">- Vào viện lúc: ' + fillOrLine(d.vaoVien, 90) + '</div>';
    html += '<div class="l-row">- Ra viện lúc: ' + fillOrLine(d.raVien, 90) + '</div>';
    html += '<div class="l-row">- Chẩn đoán: ' + fillOrLine(d.chanDoan, 150) + '</div>';
    html += '<div class="l-row">- Phương pháp điều trị: ' + fillOrLine(d.phuongPhap, 130) + '</div>';
    html += '<div class="l-row">- Ghi chú: ' + fillOrLine(d.ghiChu, 130) + '</div>';

    html += '<div class="gr-footer">' +
              '<div class="col">' +
                '<div>Ngày ' + fillOrLine(d.ngayKyNgay, 8) + ' tháng ' + fillOrLine(d.ngayKyThang, 8) + ' năm ' + fillOrLine(d.ngayKyNam, 12) + '</div>' +
                '<b>Đại diện đơn vị</b>' +
                '<div class="italic">(Ký, ghi rõ họ tên, đóng dấu)</div>' +
                '<div class="signspace"></div>' +
              '</div>' +
              '<div class="col">' +
                '<b>Người hành nghề khám bệnh, chữa bệnh</b>' +
                '<div class="italic">(Ký, ghi rõ họ tên)</div>' +
                '<div class="signspace"></div>' +
                '<div class="fill" style="font-weight:700;">' + esc(d.nguoiHanhNghe || "") + '</div>' +
              '</div>' +
            '</div>';
    return html;
  }

  function renderSheet() {
    var sheet = document.getElementById("grSheet");
    sheet.innerHTML = '<div class="gr-body">' + renderSheetBody() + '</div>';
    applyTransformSettings();
    bindFooterDrag();
  }

  /* ---------------------------------------------------------------- */
  /* 7b. Kéo-thả khối chữ ký "Ngày.../Đại diện đơn vị/Người hành nghề" */
  /* ---------------------------------------------------------------- */
  function bindFooterDrag() {
    var footer = document.querySelector(".gr-footer");
    if (!footer) return;
    var dragging = false, startX, startY, baseX, baseY;
    footer.addEventListener("mousedown", function (e) {
      if (!settings.editMode) return;
      dragging = true;
      footer.classList.add("dragging");
      startX = e.clientX; startY = e.clientY;
      baseX = settings.footerX || 0; baseY = settings.footerY || 0;
      e.preventDefault();
    });
    window.addEventListener("mousemove", function (e) {
      if (!dragging) return;
      var sheet = document.getElementById("grSheet");
      var pxPerMm = sheet.getBoundingClientRect().width / PAGE_W_MM;
      settings.footerX = baseX + (e.clientX - startX) / pxPerMm;
      settings.footerY = baseY + (e.clientY - startY) / pxPerMm;
      applyTransformSettings();
    });
    window.addEventListener("mouseup", function () {
      if (!dragging) return;
      dragging = false;
      footer.classList.remove("dragging");
    });
  }

  /* ---------------------------------------------------------------- */
  /* 8. In / xuất PDF                                                   */
  /* ---------------------------------------------------------------- */
  function setPrintPageRule(on) {
    var id = "grPrintPageStyle";
    var existing = document.getElementById(id);
    if (existing) existing.parentNode.removeChild(existing);
    if (on) {
      var s = document.createElement("style");
      s.id = id;
      s.textContent = "@page{size:" + PAGE_W_MM + "mm " + PAGE_H_MM + "mm;margin:0;}";
      document.head.appendChild(s);
    }
  }
  function grBeforePrint() {
    document.documentElement.classList.add("gr-printing");
    setPrintPageRule(true);
  }
  function grAfterPrint() {
    document.documentElement.classList.remove("gr-printing");
    setPrintPageRule(false);
  }
  window.addEventListener("afterprint", grAfterPrint);

  /* ---------------------------------------------------------------- */
  /* 9. Gắn sự kiện UI                                                  */
  /* ---------------------------------------------------------------- */
  function bindUI() {
    var drop = document.getElementById("grDrop");
    var input = document.getElementById("grFileInput");
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
    document.getElementById("grFileRemove").addEventListener("click", function () {
      input.value = "";
      document.getElementById("grFileRow").style.display = "none";
      setStatus("", "");
    });

    document.getElementById("grScale").addEventListener("input", function (e) {
      settings.scale = parseInt(e.target.value, 10); applyTransformSettings();
    });
    document.getElementById("grShiftY").addEventListener("input", function (e) {
      settings.shiftY = parseInt(e.target.value, 10); applyTransformSettings();
    });
    document.getElementById("grCalX").addEventListener("input", function (e) {
      settings.calX = parseFloat(e.target.value) || 0; applyTransformSettings();
    });
    document.getElementById("grCalY").addEventListener("input", function (e) {
      settings.calY = parseFloat(e.target.value) || 0; applyTransformSettings();
    });
    document.getElementById("grLineSpread").addEventListener("input", function (e) {
      settings.lineSpread = parseInt(e.target.value, 10) || 100; applyTransformSettings();
    });
    document.getElementById("grConfigBtn").addEventListener("click", function () {
      syncFieldsUIFromSettings();
      document.getElementById("grViewMain").classList.add("hidden");
      document.getElementById("grViewConfig").classList.remove("hidden");
    });
    document.getElementById("grConfigClose").addEventListener("click", function () {
      document.getElementById("grViewConfig").classList.add("hidden");
      document.getElementById("grViewMain").classList.remove("hidden");
    });
    document.getElementById("grEditModeToggle").addEventListener("change", function (e) {
      settings.editMode = e.target.checked; applyTransformSettings();
    });
    document.getElementById("grResetLayout").addEventListener("click", function () {
      settings.lineSpread = 100; settings.footerX = 0; settings.footerY = 0;
      settings.scale = 100; settings.shiftY = 0;
      applyTransformSettings();
      syncFieldsUIFromSettings();
      setStatus("Đã đưa vị trí và khoảng cách dòng về mặc định (chưa lưu).", "ok");
    });
    document.getElementById("grSaveBtn").addEventListener("click", saveSettings);
    document.getElementById("grPrintBtn").addEventListener("click", function () {
      if (typeof logUsage === 'function') logUsage('giayravien_print');
      grBeforePrint();
      window.print();
      setTimeout(grAfterPrint, 1000);
    });
  }

  /* ---------------------------------------------------------------- */
  /* 10. Khởi động                                                      */
  /* ---------------------------------------------------------------- */
  buildFieldsUI();
  bindUI();
  loadSettingsLocal();
  syncFieldsUIFromSettings();
  renderSheet();
  fetchSettingsFromKV();
})();
