/* =====================================================================
   js/nghiviecbhxh.js
   Tính năng: GIẤY CHỨNG NHẬN NGHỈ VIỆC HƯỞNG BẢO HIỂM XÃ HỘI
   (Chỉ áp dụng cho điều trị ngoại trú) - Mẫu số 07

   - Đọc file nguồn (.rtf / .docx) do phần mềm bệnh viện xuất ra
   - Tự nhận diện các trường thông tin (họ tên, ngày sinh, mã BHXH, CCCD,
     chẩn đoán, số ngày nghỉ...)
   - Đổ dữ liệu vào MẪU CHUẨN, in 2 BẢN GIỐNG HỆT NHAU xếp trên cùng
     1 tờ A4 (nửa trên / nửa dưới, có đường kẻ đứt để cắt đôi) - đúng như
     cách bệnh viện in 1 tờ ra 2 liên.
   - Cho phép tinh chỉnh trực quan trước khi in:
       + Thu / giãn khối nội dung, đẩy lên/xuống
       + Bù trừ (canh chỉnh) khi in để không bị lệch do máy in / khay giấy
       + Lưu lại (localStorage) cho lần in sau khỏi phải chỉnh lại
   Không cần sửa index.html — file này tự render vào #nvContent.
   ===================================================================== */
(function () {
  "use strict";

  var ROOT_ID = "nghiViecBhxhContent";
  var LS_KEY = "nv_nghiviecbhxh_settings_v1";
  var MAMMOTH_URL = "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js";
  var PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
  var PDFJS_WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  // Dán URL Worker Cloudflare (đã tạo theo hướng dẫn cuối file worker.js đi
  // kèm, dùng CHUNG với "Phiếu chuyển tuyến") vào đây, dạng
  // "https://ten-worker.ten-tai-khoan.workers.dev". Để trống ("") thì công cụ
  // chỉ lưu trên máy (localStorage) như trước, không đồng bộ server.
  // Worker dùng chung phân biệt từng form qua path riêng (KV_SETTINGS_PATH)
  // nên 2 form không ghi đè cấu hình của nhau.
  var KV_WORKER_URL = "https://mapping-ct-bhxh.dhabolero.workers.dev";
  var KV_SETTINGS_PATH = "/settings/nghiviec";

  var root = document.getElementById(ROOT_ID);
  if (!root) return;

  /* ---------------------------------------------------------------- */
  /* 0. Kích thước trang: A4 ĐẦY ĐỦ (210 x 297mm) - xem trước & in     */
  /*    hiện trọn 1 tờ giấy như bản gốc.                               */
  /* ---------------------------------------------------------------- */
  var PAGE_W_MM = 210, PAGE_H_MM = 297;

  // Tên cơ sở KCB điền CỨNG (không lấy từ file nguồn vì file nguồn có thể
  // sai / thuộc mẫu của đơn vị khác).
  var HOSPITAL_NAME = "BỆNH VIỆN ĐA KHOA BÌNH DƯƠNG – CƠ SỞ 2";

  /* ---------------------------------------------------------------- */
  /* 1. CSS                                                            */
  /* ---------------------------------------------------------------- */
  var style = document.createElement("style");
  style.textContent = [
    "#nvWrap{max-width:1400px;margin:0 auto;padding:16px;font-family:inherit;color:var(--text,#222);}",
    "#nvWrap h1{font-size:20px;margin:0 0 4px;}",
    "#nvWrap .nv-sub{color:var(--muted,#777);font-size:13px;margin:0 0 16px;}",
    ".nv-grid{display:grid;grid-template-columns:1fr 340px;gap:18px;align-items:start;}",
    ".nv-grid>.nv-panel{order:2;}",
    ".nv-grid>.nv-stage{order:1;}",
    "@media (max-width:980px){.nv-grid{grid-template-columns:1fr;}}",
    ".nv-panel{background:var(--surface,#fff);border:1px solid var(--border,#e2e2e2);border-radius:12px;padding:14px;position:sticky;top:12px;max-height:calc(100vh - 24px);overflow:auto;}",
    ".nv-panel h3{font-size:14px;margin:14px 0 8px;padding-top:10px;border-top:1px dashed var(--border,#ddd);}",
    ".nv-panel h3:first-child{margin-top:0;padding-top:0;border-top:none;}",
    ".nv-drop{border:2px dashed var(--blue,#0066FF);border-radius:10px;padding:18px 10px;text-align:center;cursor:pointer;background:var(--surface-2,#f5f8ff);font-size:13px;}",
    ".nv-drop:hover{background:var(--blue-light,#eaf1ff);}",
    ".nv-filerow{display:flex;align-items:center;gap:8px;font-size:12.5px;margin-top:8px;word-break:break-all;}",
    ".nv-filerow button{border:none;background:none;color:#c0392b;cursor:pointer;font-size:14px;}",
    ".nv-field{margin-bottom:8px;}",
    ".nv-field label{display:block;font-size:11.5px;color:var(--muted,#777);margin-bottom:2px;}",
    ".nv-field input,.nv-field textarea,.nv-field select{width:100%;box-sizing:border-box;font-size:12.5px;padding:6px 8px;border:1px solid var(--border,#ddd);border-radius:6px;background:var(--surface-2,#fafafa);color:inherit;font-family:inherit;}",
    ".nv-field textarea{resize:vertical;min-height:36px;}",
    ".nv-row2{display:grid;grid-template-columns:1fr 1fr;gap:8px;}",
    ".nv-row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;}",
    ".nv-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:none;border-radius:8px;padding:9px 14px;font-size:13px;cursor:pointer;background:var(--blue,#0066FF);color:#fff;width:100%;margin-top:4px;transition:transform .12s ease,box-shadow .12s ease,background .2s ease;}",
    ".nv-btn:active{transform:scale(.97);}",
    ".nv-btn.secondary{background:var(--surface-2,#eee);color:var(--text,#222);}",
    ".nv-btn.small{width:auto;padding:6px 10px;font-size:12px;}",
    ".nv-btn.save{background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;box-shadow:0 2px 8px rgba(22,163,74,.35);}",
    ".nv-btn.save.saved{background:linear-gradient(135deg,#16a34a,#15803d);animation:nvSavedPop .45s ease;}",
    "@keyframes nvSavedPop{0%{transform:scale(1);}35%{transform:scale(.94);box-shadow:0 0 0 0 rgba(34,197,94,.5);}70%{transform:scale(1.03);box-shadow:0 0 0 8px rgba(34,197,94,0);}100%{transform:scale(1);}}",
    ".nv-status{font-size:12px;margin-top:8px;min-height:16px;}",
    ".nv-status.ok{color:#1a7a37;}",
    ".nv-status.err{color:#c0392b;}",
    ".nv-hint{font-size:11.5px;color:var(--muted,#888);line-height:1.5;}",
    ".nv-switchrow{display:flex;align-items:center;gap:10px;margin:10px 0;font-size:13px;}",
    ".nv-switch{position:relative;display:inline-block;width:38px;height:22px;flex:none;}",
    ".nv-switch input{opacity:0;width:0;height:0;}",
    ".nv-slider{position:absolute;cursor:pointer;inset:0;background:#ccc;border-radius:22px;transition:.2s;}",
    ".nv-slider:before{content:'';position:absolute;width:16px;height:16px;left:3px;bottom:3px;background:#fff;border-radius:50%;transition:.2s;box-shadow:0 1px 2px rgba(0,0,0,.3);}",
    ".nv-switch input:checked+.nv-slider{background:#16a34a;}",
    ".nv-switch input:checked+.nv-slider:before{transform:translateX(16px);}",
    ".nv-btn.config{background:linear-gradient(135deg,#64748b,#475569);color:#fff;box-shadow:0 2px 8px rgba(71,85,105,.35);}",
    ".nv-btn.config:hover{box-shadow:0 3px 10px rgba(71,85,105,.45);}",
    ".nv-panel-view.hidden{display:none;}",
    ".nv-config-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;}",
    ".nv-config-head h3{margin:0;padding-top:0;border-top:none;}",
    ".nv-close-btn{border:none;background:var(--surface-2,#eee);color:var(--text,#222);border-radius:8px;padding:6px 14px;cursor:pointer;font-size:12.5px;font-weight:500;white-space:nowrap;}",
    ".nv-close-btn:hover{background:var(--border,#ddd);}",
    /* -------- vùng xem trước / bản in -------- */
    ".nv-stage{background:#5a5f66;border-radius:12px;padding:22px;display:flex;justify-content:center;overflow:auto;}",
    ".nv-sheet-outer{background:#fff;box-shadow:0 6px 24px rgba(0,0,0,.35);position:relative;}",
    "#nvSheet{width:" + PAGE_W_MM + "mm;height:" + PAGE_H_MM + "mm;background:#fff;position:relative;overflow:hidden;font-family:'Times New Roman',Times,serif;color:#000;}",
    ".nv-body{position:relative;width:100%;height:100%;transform-origin:top left;box-sizing:border-box;padding:6mm 12mm 4mm;line-height:var(--nv-lh,1.34);}",
    ".nv-body .l-row{position:relative;white-space:normal;box-sizing:border-box;margin-bottom:1.2mm;}",
    ".nv-hd{display:flex;justify-content:space-between;align-items:flex-start;}",
    ".nv-hd-left{font-weight:bold;text-transform:uppercase;font-size:11.5px;max-width:60%;line-height:1.3;}",
    ".nv-hd-right{text-align:right;font-size:11px;}",
    ".nv-hd-mauso{text-align:left;font-weight:400;text-transform:none;font-size:11px;margin-top:1mm;}",
    ".nv-title{text-align:center;font-weight:bold;font-size:14px;margin:3mm 0 0;text-transform:uppercase;}",
    ".nv-title2{text-align:center;font-weight:bold;font-size:13px;text-transform:uppercase;}",
    ".nv-sub{text-align:center;font-style:italic;font-size:11px;margin-bottom:2mm;}",
    ".nv-section{font-weight:bold;font-size:12px;margin-top:2mm;}",
    ".fill{padding:0 1px;font-weight:400;white-space:pre-wrap;word-break:break-word;}",
    ".fill.empty{color:#000;}",
    ".l-flexrow{display:flex;flex-wrap:wrap;column-gap:15px;row-gap:1.2mm;}",
    ".fill-line{display:inline-block;min-width:14px;border-bottom:1px dotted #000;margin:0 2px 1px;vertical-align:-2px;}",
    ".l-item{display:inline-block;margin-right:15px;white-space:nowrap;}",
    ".l-item:last-child{margin-right:0;}",
    ".nv-footer{display:flex;justify-content:space-between;margin-top:3mm;text-align:center;font-size:11.5px;transform-origin:top left;}",
    "#nvSheet.nv-editon .nv-footer{cursor:grab;outline:1.5px dashed transparent;border-radius:6px;}",
    "#nvSheet.nv-editon .nv-footer:hover,#nvSheet.nv-editon .nv-footer.dragging{outline-color:#0066FF;background:rgba(0,102,255,.06);}",
    "#nvSheet.nv-editon .nv-footer.dragging{cursor:grabbing;}",
    ".nv-footer .col{width:46%;}",
    ".nv-footer b{display:block;}",
    ".nv-footer .italic{font-style:italic;font-size:10.5px;}",
    ".nv-footer .signspace{height:14mm;}",
    "@media print{",
    "  html.nv-printing,html.nv-printing body{height:" + PAGE_H_MM + "mm !important;overflow:hidden !important;margin:0 !important;padding:0 !important;}",
    "  html.nv-printing body *{visibility:hidden !important;}",
    "  html.nv-printing #nvSheet, html.nv-printing #nvSheet *{visibility:visible !important;}",
    "  html.nv-printing .nv-sheet-outer{position:absolute !important;left:0 !important;top:0 !important;box-shadow:none !important;}",
    "  html.nv-printing #nvSheet{position:absolute !important;left:0 !important;top:0 !important;box-shadow:none !important;overflow:hidden !important;}",
    "}"
  ].join("\n");
  document.head.appendChild(style);

  /* ---------------------------------------------------------------- */
  /* 2. HTML khung                                                     */
  /* ---------------------------------------------------------------- */
  root.innerHTML =
    '<div id="nvWrap">' +
      '<h1>📝 Giấy chứng nhận nghỉ việc hưởng BHXH</h1>' +
      '<div class="nv-grid">' +

        '<div class="nv-panel">' +

          '<div class="nv-panel-view" id="nvViewMain">' +
            '<h3>① Tải file gốc</h3>' +
            '<div class="nv-drop" id="nvDrop">📄 Bấm để chọn file <b>.pdf</b>, <b>.docx</b> hoặc <b>.rtf</b><br><span class="nv-hint">(file gốc bệnh viện, hoặc bản scan/PDF có lớp chữ)</span></div>' +
            '<input type="file" id="nvFileInput" accept=".pdf,.rtf,.docx" hidden>' +
            '<div class="nv-filerow" id="nvFileRow" style="display:none;"><span id="nvFileName"></span><button id="nvFileRemove" title="Bỏ chọn">✕</button></div>' +
            '<div class="nv-status" id="nvStatus"></div>' +

            '<h3>② Xuất file</h3>' +
            '<button class="nv-btn" id="nvPrintBtn">🖨️ In / Tải PDF</button>' +

            '<h3>③ Tinh chỉnh khi in</h3>' +
            '<div class="nv-field"><label>Cỡ nội dung (%)</label>' +
              '<input type="range" id="nvScale" min="80" max="115" value="100"></div>' +
            '<div class="nv-field"><label>Đẩy nội dung lên / xuống (mm)</label>' +
              '<input type="range" id="nvShiftY" min="-15" max="15" value="0"></div>' +
            '<div class="nv-field"><label>↕️ Giãn / co khoảng cách dòng (%)</label>' +
              '<input type="range" id="nvLineSpread" min="70" max="180" value="100"></div>' +

            '<h3>④ Bù trừ lệch máy in</h3>' +
            '<div class="nv-hint">Nếu bản in bị lệch đều theo 1 hướng so với xem trước, chỉnh 2 số dưới rồi in lại — hệ thống sẽ nhớ cho lần sau.</div>' +
            '<div class="nv-row2">' +
              '<div class="nv-field"><label>Lệch ngang (mm)</label><input type="number" id="nvCalX" value="0" step="0.5"></div>' +
              '<div class="nv-field"><label>Lệch dọc (mm)</label><input type="number" id="nvCalY" value="0" step="0.5"></div>' +
            '</div>' +

            '<button class="nv-btn config" id="nvConfigBtn" style="margin-top:14px;">⚙️ Cấu hình</button>' +
          '</div>' +

          '<div class="nv-panel-view hidden" id="nvViewConfig">' +
            '<div class="nv-config-head"><h3>⚙️ Cấu hình</h3><button class="nv-close-btn" id="nvConfigClose">✕ Đóng</button></div>' +

            '<h3>Thông tin đã nhận diện <span style="font-weight:400;color:var(--muted,#888);">(sửa nếu cần)</span></h3>' +
            '<div id="nvFields"></div>' +

            '<h3>Bố cục</h3>' +
            '<div class="nv-switchrow">' +
              '<label class="nv-switch"><input type="checkbox" id="nvEditModeToggle"><span class="nv-slider"></span></label>' +
              '<span>✏️ Chỉnh sửa vị trí bố cục (kéo-thả khối "Ngày.../Đại diện đơn vị/Người hành nghề, ký tên")</span>' +
            '</div>' +
            '<div class="nv-hint">Tắt đi để khoá, tránh vô tình kéo lệch khối chữ ký khi chỉ muốn nhập liệu. Kéo khối chữ ký tới đúng vị trí con dấu đã đóng sẵn trên tờ giấy nếu cần.</div>' +
            '<button class="nv-btn save" id="nvSaveBtn">💾 Lưu tinh chỉnh</button>' +
            '<button class="nv-btn small secondary" id="nvResetLayout">↺ Đưa vị trí &amp; khoảng cách dòng về mặc định</button>' +
          '</div>' +

        '</div>' +

        '<div class="nv-stage"><div class="nv-sheet-outer"><div id="nvSheet"></div></div></div>' +
      '</div>' +
    '</div>';

  /* ---------------------------------------------------------------- */
  /* 3. Danh sách field + label hiển thị                               */
  /* ---------------------------------------------------------------- */
  var FIELD_DEFS = [
    ["mauSo", "Mẫu số", "text"],
    ["soKCB", "Số (…/KCB)", "text"],
    ["soSeri", "Số seri", "text"],
    ["hoTen", "Họ và tên người bệnh", "text"],
    ["ngaySinh", "Ngày sinh", "text"],
    ["gioiTinh", "Giới tính", "select:Nam,Nữ"],
    ["maBHXH", "Mã số BHXH/Số thẻ BHYT", "text"],
    ["cccd", "Số CCCD/CMND/ĐDCD/Hộ chiếu", "text"],
    ["ngayCapCCCD", "Ngày cấp CCCD", "text"],
    ["donViLamViec", "Đơn vị làm việc", "text"],
    ["ngayKham", "Ngày khám bệnh, chữa bệnh", "text"],
    ["chanDoan", "Chẩn đoán và phương pháp điều trị", "textarea"],
    ["soNgayNghi", "Số ngày nghỉ", "text"],
    ["tuNgay", "Từ ngày", "text"],
    ["denNgay", "Đến hết ngày", "text"],
    ["tenCha", "Họ và tên cha (nếu là trẻ dưới 07 tuổi)", "text"],
    ["tenMe", "Họ và tên mẹ (nếu là trẻ dưới 07 tuổi)", "text"],
    ["ngayKyNgay", "Ngày ký", "text"],
    ["ngayKyThang", "Tháng ký", "text"],
    ["ngayKyNam", "Năm ký", "text"],
    ["nguoiHanhNghe", "Người hành nghề KB, CB (tên)", "text"]
  ];

  var DATA = {};

  function buildFieldsUI() {
    var wrap = document.getElementById("nvFields");
    var html = "";
    FIELD_DEFS.forEach(function (f) {
      var key = f[0], label = f[1], type = f[2];
      html += '<div class="nv-field"><label>' + label + '</label>';
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
    var wrap = document.getElementById("nvFields");
    wrap.querySelectorAll("[data-k]").forEach(function (el) {
      el.value = DATA[el.getAttribute("data-k")] || "";
    });
  }

  /* ---------------------------------------------------------------- */
  /* 4. Nhận diện thông tin từ văn bản nguồn (đã giải mã .rtf/.docx)   */
  /* ---------------------------------------------------------------- */
  function grab(re, text) {
    var m = re.exec(text);
    return m ? m[1].trim() : "";
  }

  // Sửa lỗi hay gặp khi đọc PDF in 2 liên (trên/dưới hoặc trái/phải): 1 cụm
  // chữ bị lặp lại 2 lần dính liền nhau, vd "CÔNG TY ABC CÔNG TY ABC" hay
  // "GIẤY CHỨNG NHẬN GIẤY CHỨNG NHẬN" -> chỉ giữ lại 1 lần.
  function dedupeRepeat(s) {
    if (!s) return s;
    var str = s.trim();
    // Trường hợp lặp nguyên khối, có/không dấu cách ở giữa: "A A" -> "A"
    var m = /^(.+?)\s*\1$/.exec(str);
    if (m) return m[1].trim();
    // Trường hợp lặp từng từ liên tiếp: "A A B B C C" -> "A B C"
    var words = str.split(/\s+/);
    var out = [];
    for (var i = 0; i < words.length; i++) {
      if (words[i] !== words[i + 1]) out.push(words[i]);
      else i++; // bỏ qua bản sao liền kề
    }
    return out.join(" ");
  }

  // Do PDF bị đọc lộn xộn (in 2 liên / thứ tự dòng đảo ngược), 1 giá trị đôi
  // khi bị chen thêm tên nhãn của chính nó ở giữa, vd:
  // "CÔNG TY ABC Đơn vị làm việc: CÔNG TY ABC" -> bỏ nhãn chen giữa trước
  // khi gộp trùng.
  function stripEmbeddedLabels(s) {
    if (!s) return s;
    return s.replace(/(Chẩn đoán và phương pháp điều trị|Đơn vị làm việc|Ngày khám bệnh,?\s*chữa bệnh|Số CCCD\/CMND[^:]*|Mã số BHXH\/Số thẻ BHYT|Họ và tên|Ngày sinh|Giới tính|Số ngày nghỉ|I{1,3}\.)\s*:?/gi, " ")
      .replace(/\s+/g, " ").trim();
  }

  // Lỗi hay gặp khi đọc PDF: chữ cái cuối 1 từ tiếng Việt viết thường bị đọc
  // nhầm thành "I" hoa (vd "chi" -> "chI"). Chuẩn hoá lại cho đúng chính tả.
  function fixTrailingCapitalI(s) {
    if (!s) return s;
    return s.replace(/([a-zà-ỹ])I\b/g, "$1i");
  }

  function capitalizeFirst(s) {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function parseFields(text) {
    var t = text.replace(/\s+/g, " ").trim();
    var d = {};

    d.mauSo = grab(/Mẫu số:?\s*([0-9]+)/i, t);
    d.soKCB = grab(/Số:?\s*([0-9]+\s*\/\s*KCB)/i, t).replace(/\s*\/\s*/, "/");
    d.soSeri = grab(/Số seri:?\s*([0-9]+)/i, t);

    d.hoTen = grab(/Họ và tên:?\s*([A-ZÀ-Ỹ\s]+?)\s+Ngày sinh/i, t);
    d.ngaySinh = grab(/Ngày sinh:?\s*([0-9\/]+)/i, t);
    d.gioiTinh = /Giới tính:?\s*N[Ữữ]/i.test(t) ? "Nữ" : (/Giới tính:?\s*Nam/i.test(t) ? "Nam" : "");
    d.maBHXH = grab(/Mã số BHXH\/Số thẻ BHYT:?\s*(?!\d{1,2}\/\d{1,2}\/\d{4}(?:\s|$))([0-9A-Za-z\/]{6,40})/i, t);
    d.cccd = grab(/(?:Số CCCD\/CMND\/[^:]*):?\s*([0-9]{6,15})/i, t);
    d.ngayCapCCCD = grab(/Ngày cấp:?\s*([0-9\/]+)/i, t);
    d.donViLamViec = dedupeRepeat(stripEmbeddedLabels(grab(/Đơn vị làm việc:?\s*(.+?)\s+(?:Ngày khám|II\.)/i, t)));
    d.ngayKham = capitalizeFirst(grab(/Ngày khám bệnh, chữa bệnh:?\s*(ngày[^;.]+?năm\s*[0-9]{4})/i, t));
    d.chanDoan = fixTrailingCapitalI(dedupeRepeat(stripEmbeddedLabels(grab(/phương pháp điều trị\s*(.+?)\s*Số ngày nghỉ/i, t))));
    d.soNgayNghi = grab(/Số ngày nghỉ:?\s*([0-9]+)/i, t);
    d.tuNgay = grab(/Từ ngày\s*([0-9\/]+)/i, t);
    d.denNgay = grab(/đến hết ngày\s*([0-9\/]+)/i, t);
    d.tenCha = grab(/Họ và tên cha:?\s*([^\-–]*?)(?:-|Họ và tên mẹ|$)/i, t);
    d.tenMe = grab(/Họ và tên mẹ:?\s*([^\-–]*?)(?:-|Đại diện|Ngày|$)/i, t);

    var ngayKy = /Ngày\s*([0-9]{1,2})\s*tháng\s*([0-9]{1,2})\s*năm\s*([0-9]{4})/i.exec(t);
    if (ngayKy) { d.ngayKyNgay = ngayKy[1]; d.ngayKyThang = ngayKy[2]; d.ngayKyNam = ngayKy[3]; }

    // Tên người ký thường xuất hiện lặp lại ngay sau cụm "(Ký, ghi rõ họ tên,)"
    var ky = /\(Ký,?\s*ghi rõ họ tên,?\)\s*([A-ZÀ-Ỹ][A-ZÀ-Ỹ\s]{4,40})/i.exec(t);
    if (ky) d.nguoiHanhNghe = dedupeRepeat(ky[1].trim());

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
  // trước khi ghép thành văn bản. Cần thiết vì pdf.js trả text theo thứ tự
  // trong luồng dữ liệu PDF (thường theo thứ tự vẽ khi tạo file), KHÔNG
  // theo vị trí hiển thị -> nếu trang có nhiều khối/nhiều bản nội dung xếp
  // cạnh nhau (như tờ A4 in 2 liên), text dễ bị xáo trộn giữa các khối nếu
  // ghép thẳng theo thứ tự gốc.
  function reorderPdfItems(items) {
    var rows = items.map(function (it) {
      return { str: it.str, x: it.transform[4], y: it.transform[5] };
    }).filter(function (it) { return it.str && it.str.length; });
    rows.sort(function (a, b) { return b.y - a.y || a.x - b.x; });
    var TOL = 2.2; // dung sai (đơn vị PDF pt) coi là cùng 1 dòng
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
    document.getElementById("nvFileName").textContent = file.name;
    document.getElementById("nvFileRow").style.display = "flex";
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
    var el = document.getElementById("nvStatus");
    el.textContent = msg;
    el.className = "nv-status" + (cls ? " " + cls : "");
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
  // Đồng bộ với Cloudflare KV (nếu đã cấu hình KV_WORKER_URL): tải cấu hình
  // dùng chung từ server ngay khi mở trang, ghi đè lên bản localStorage nếu
  // có dữ liệu mới hơn trên server. Không có mạng / chưa cấu hình -> im lặng
  // bỏ qua, dùng luôn bản localStorage đã tải trước đó (không chặn giao diện).
  // Cơ chế và endpoint ("/settings") giống hệt file chuyen-tuyen.js để có thể
  // dùng chung một mẫu Worker Cloudflare cho cả 2 loại giấy tờ.
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
    var btn = document.getElementById("nvSaveBtn");
    function flashButton(label) {
      if (!btn) return;
      if (btn._savedTimer) clearTimeout(btn._savedTimer);
      var original = btn._originalLabel || btn.innerHTML;
      btn._originalLabel = original;
      btn.classList.remove("saved");
      void btn.offsetWidth; // ép reflow để animation chạy lại mỗi lần bấm
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
    document.getElementById("nvScale").value = settings.scale;
    document.getElementById("nvShiftY").value = settings.shiftY;
    document.getElementById("nvCalX").value = settings.calX;
    document.getElementById("nvCalY").value = settings.calY;
    document.getElementById("nvLineSpread").value = settings.lineSpread;
    var editEl = document.getElementById("nvEditModeToggle");
    if (editEl) editEl.checked = !!settings.editMode;
  }
  function applyTransformSettings() {
    var scale = (settings.scale || 100) / 100;
    var shiftY = settings.shiftY || 0;
    var b = document.querySelector(".nv-body");
    if (b) b.style.transform = "translate(" + (settings.calX || 0) + "mm," + ((settings.calY || 0) + shiftY) + "mm) scale(" + scale + ")";
    var lh = 1.34 * ((settings.lineSpread || 100) / 100);
    if (b) b.style.setProperty("--nv-lh", lh.toFixed(3));
    var footer = document.querySelector(".nv-footer");
    if (footer) footer.style.transform = "translate(" + (settings.footerX || 0) + "mm," + (settings.footerY || 0) + "mm)";
    var sheet = document.getElementById("nvSheet");
    if (sheet) sheet.classList.toggle("nv-editon", !!settings.editMode);
  }

  /* ---------------------------------------------------------------- */
  /* 7. Render nội dung 1 bản (dùng chung cho nửa trên & nửa dưới)     */
  /* ---------------------------------------------------------------- */
  function esc(s) { return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function fillOrLine(val, widthHint) {
    if (val && String(val).trim()) return '<span class="fill">' + esc(val) + '</span>';
    return '<span class="fill-line" style="min-width:' + (widthHint || 40) + 'mm"></span>';
  }

  function renderOneCopy() {
    var d = DATA;
    var html = "";
    html += '<div class="l-row nv-hd">' +
              '<div class="nv-hd-left">' + esc(HOSPITAL_NAME) +
                '<div class="nv-hd-mauso">Mẫu số: ' + fillOrLine(d.mauSo || "07", 10) + '<br>' +
                  'Số: ' + fillOrLine(d.soKCB, 20) + '/KCB<br>' +
                  'Số seri: ' + fillOrLine(d.soSeri, 25) +
                '</div>' +
              '</div>' +
            '</div>';
    html += '<div class="nv-title">Giấy chứng nhận</div>';
    html += '<div class="nv-title2">nghỉ việc hưởng bảo hiểm xã hội</div>';
    html += '<div class="nv-sub">(Chỉ áp dụng cho điều trị ngoại trú)</div>';

    html += '<div class="nv-section">I. Thông tin người bệnh</div>';
    html += '<div class="l-row l-flexrow"><span class="l-item">Họ và tên: ' + fillOrLine(d.hoTen, 55) + '</span>' +
            '<span class="l-item">Ngày sinh: ' + fillOrLine(d.ngaySinh, 22) + '</span></div>';
    html += '<div class="l-row">Mã số BHXH/Số thẻ BHYT: ' + fillOrLine(d.maBHXH, 50) + '</div>';
    html += '<div class="l-row l-flexrow"><span class="l-item">Số CCCD/CMND/Định danh công dân/Hộ chiếu: ' + fillOrLine(d.cccd, 32) + '</span>' +
            '<span class="l-item">Ngày cấp: ' + fillOrLine(d.ngayCapCCCD, 20) + '</span></div>';
    html += '<div class="l-row">Giới tính: ' + fillOrLine(d.gioiTinh || "", 14) + '</div>';
    html += '<div class="l-row">Đơn vị làm việc: ' + fillOrLine(d.donViLamViec, 70) + '</div>';
    html += '<div class="l-row">Ngày khám bệnh, chữa bệnh: ' + fillOrLine(d.ngayKham, 45) + '</div>';

    html += '<div class="nv-section">II. Chẩn đoán và phương pháp điều trị</div>';
    html += '<div class="l-row">' + fillOrLine(d.chanDoan, 150) + '</div>';
    html += '<div class="l-row"><span class="l-item">Số ngày nghỉ: ' + fillOrLine(d.soNgayNghi, 8) + ' (ngày)</span></div>';
    html += '<div class="l-row">(Từ ngày ' + fillOrLine(d.tuNgay, 20) +
            ' đến hết ngày ' + fillOrLine(d.denNgay, 20) + ')</div>';

    html += '<div class="nv-section">III. Thông tin cha, mẹ <span style="font-weight:400;font-style:italic;font-size:10.5px;">(chỉ áp dụng đối với trường hợp người bệnh là trẻ em dưới 07 tuổi)</span></div>';
    html += '<div class="l-row">- Họ và tên cha: ' + fillOrLine(d.tenCha, 60) + '</div>';
    html += '<div class="l-row">- Họ và tên mẹ: ' + fillOrLine(d.tenMe, 60) + '</div>';

    html += '<div class="nv-footer">' +
              '<div class="col">' +
                '<b>Đại diện đơn vị</b>' +
                '<div class="italic">(Ký ghi rõ họ tên, đóng dấu)</div>' +
                '<div class="signspace"></div>' +
              '</div>' +
              '<div class="col">' +
                '<div>Ngày ' + fillOrLine(d.ngayKyNgay, 8) + ' tháng ' + fillOrLine(d.ngayKyThang, 8) + ' năm ' + fillOrLine(d.ngayKyNam, 12) + '</div>' +
                '<b>Người hành nghề KB, CB</b>' +
                '<div class="italic">(Ký, ghi rõ họ tên)</div>' +
                '<div class="signspace"></div>' +
                '<div class="fill" style="font-weight:700;">' + esc(d.nguoiHanhNghe || "") + '</div>' +
              '</div>' +
            '</div>';
    return html;
  }

  function renderSheet() {
    var sheet = document.getElementById("nvSheet");
    sheet.innerHTML = '<div class="nv-body">' + renderOneCopy() + '</div>';
    applyTransformSettings();
    bindFooterDrag();
  }

  /* ---------------------------------------------------------------- */
  /* 7b. Kéo-thả khối chữ ký "Ngày.../Đại diện đơn vị/Người hành nghề" */
  /*     - chỉ hoạt động khi chế độ "Chỉnh sửa vị trí bố cục" đang bật */
  /* ---------------------------------------------------------------- */
  function bindFooterDrag() {
    var footer = document.querySelector(".nv-footer");
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
      var sheet = document.getElementById("nvSheet");
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
    var id = "nvPrintPageStyle";
    var existing = document.getElementById(id);
    if (existing) existing.parentNode.removeChild(existing);
    if (on) {
      var s = document.createElement("style");
      s.id = id;
      s.textContent = "@page{size:" + PAGE_W_MM + "mm " + PAGE_H_MM + "mm;margin:0;}";
      document.head.appendChild(s);
    }
  }
  function nvBeforePrint() {
    document.documentElement.classList.add("nv-printing");
    setPrintPageRule(true);
  }
  function nvAfterPrint() {
    document.documentElement.classList.remove("nv-printing");
    setPrintPageRule(false);
  }
  window.addEventListener("afterprint", nvAfterPrint);

  /* ---------------------------------------------------------------- */
  /* 9. Gắn sự kiện UI                                                  */
  /* ---------------------------------------------------------------- */
  function bindUI() {
    var drop = document.getElementById("nvDrop");
    var input = document.getElementById("nvFileInput");
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
    document.getElementById("nvFileRemove").addEventListener("click", function () {
      input.value = "";
      document.getElementById("nvFileRow").style.display = "none";
      setStatus("", "");
    });

    document.getElementById("nvScale").addEventListener("input", function (e) {
      settings.scale = parseInt(e.target.value, 10); applyTransformSettings();
    });
    document.getElementById("nvShiftY").addEventListener("input", function (e) {
      settings.shiftY = parseInt(e.target.value, 10); applyTransformSettings();
    });
    document.getElementById("nvCalX").addEventListener("input", function (e) {
      settings.calX = parseFloat(e.target.value) || 0; applyTransformSettings();
    });
    document.getElementById("nvCalY").addEventListener("input", function (e) {
      settings.calY = parseFloat(e.target.value) || 0; applyTransformSettings();
    });
    document.getElementById("nvLineSpread").addEventListener("input", function (e) {
      settings.lineSpread = parseInt(e.target.value, 10) || 100; applyTransformSettings();
    });
    document.getElementById("nvConfigBtn").addEventListener("click", function () {
      syncFieldsUIFromSettings();
      document.getElementById("nvViewMain").classList.add("hidden");
      document.getElementById("nvViewConfig").classList.remove("hidden");
    });
    document.getElementById("nvConfigClose").addEventListener("click", function () {
      document.getElementById("nvViewConfig").classList.add("hidden");
      document.getElementById("nvViewMain").classList.remove("hidden");
    });
    document.getElementById("nvEditModeToggle").addEventListener("change", function (e) {
      settings.editMode = e.target.checked; applyTransformSettings();
    });
    document.getElementById("nvResetLayout").addEventListener("click", function () {
      settings.lineSpread = 100; settings.footerX = 0; settings.footerY = 0;
      settings.scale = 100; settings.shiftY = 0;
      applyTransformSettings();
      syncFieldsUIFromSettings();
      setStatus("Đã đưa vị trí và khoảng cách dòng về mặc định (chưa lưu).", "ok");
    });
    document.getElementById("nvSaveBtn").addEventListener("click", saveSettings);
    document.getElementById("nvPrintBtn").addEventListener("click", function () {
      nvBeforePrint();
      window.print();
      setTimeout(nvAfterPrint, 1000);
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
