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
  // Dán URL Worker Cloudflare (đã tạo theo hướng dẫn trong worker.js) vào đây,
  // dạng "https://ten-worker.ten-tai-khoan.workers.dev". Để trống ("") thì
  // công cụ chỉ lưu trên máy (localStorage) như trước, không đồng bộ server.
  var KV_WORKER_URL = "https://phieu-chuyen-tuyen.dhabolero.workers.dev";

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
    ".ct-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:none;border-radius:8px;padding:9px 14px;font-size:13px;cursor:pointer;background:var(--blue,#0066FF);color:#fff;width:100%;margin-top:4px;transition:transform .12s ease,box-shadow .12s ease,background .2s ease;}",
    ".ct-btn:active{transform:scale(.97);}",
    ".ct-btn.secondary{background:var(--surface-2,#eee);color:var(--text,#222);}",
    ".ct-btn.small{width:auto;padding:6px 10px;font-size:12px;}",
    ".ct-btn.save{background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;box-shadow:0 2px 8px rgba(22,163,74,.35);}",
    ".ct-btn.save:hover{box-shadow:0 3px 10px rgba(22,163,74,.45);}",
    ".ct-btn.config{background:linear-gradient(135deg,#818cf8,#6366f1);color:#fff;box-shadow:0 2px 8px rgba(99,102,241,.35);}",
    ".ct-btn.config:hover{box-shadow:0 3px 10px rgba(99,102,241,.45);}",
    ".ct-switchrow{display:flex;align-items:center;gap:10px;margin:10px 0;font-size:13px;}",
    ".ct-switch{position:relative;display:inline-block;width:38px;height:22px;flex:none;}",
    ".ct-switch input{opacity:0;width:0;height:0;}",
    ".ct-slider{position:absolute;cursor:pointer;inset:0;background:#ccc;border-radius:22px;transition:.2s;}",
    ".ct-slider:before{content:'';position:absolute;width:16px;height:16px;left:3px;bottom:3px;background:#fff;border-radius:50%;transition:.2s;box-shadow:0 1px 2px rgba(0,0,0,.3);}",
    ".ct-switch input:checked+.ct-slider{background:#16a34a;}",
    ".ct-switch input:checked+.ct-slider:before{transform:translateX(16px);}",
    ".ct-modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:50;align-items:center;justify-content:center;}",
    ".ct-modal-overlay.open{display:flex;}",
    ".ct-modal{background:#fff;border-radius:12px;padding:20px;width:min(420px,92vw);box-shadow:0 10px 40px rgba(0,0,0,.3);}",
    ".ct-modal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;}",
    ".ct-modal-head h3{margin:0;}",
    ".ct-modal-close{border:none;background:var(--surface-2,#eee);border-radius:50%;width:28px;height:28px;cursor:pointer;font-size:14px;}",
    ".ct-btn.save.saved{background:linear-gradient(135deg,#16a34a,#15803d);animation:ctSavedPop .45s ease;}",
    "@keyframes ctSavedPop{0%{transform:scale(1);}35%{transform:scale(.94);box-shadow:0 0 0 0 rgba(34,197,94,.5);}70%{transform:scale(1.03);box-shadow:0 0 0 8px rgba(34,197,94,0);}100%{transform:scale(1);}}",
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
    "#ctContentLayer .chkbig{display:inline-block;width:13px;height:13px;border:1.3px solid #000;text-align:center;line-height:11px;font-size:11px;font-weight:bold;margin:0 4px 0 0;vertical-align:-2px;flex:none;}",
    "#ctContentLayer .circ{display:inline-block;border:1.3px solid #000;border-radius:50%;padding:0 4px;line-height:1.15;}",
    "#ctContentLayer .l-flexrow{display:flex;align-items:baseline;}",
    "#ctContentLayer .fill-line{flex:1 1 auto;min-width:14px;align-self:stretch;border-bottom:1px dotted #000;margin:0 2px 2px;}",
    "#ctSheet.ct-editoff .ct-block{cursor:default;}",
    "#ctSheet.ct-editoff .ct-resize,#ctSheet.ct-editoff .ct-eye{display:none !important;}",
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
    "  .ct-stampguide,.ct-resize,.ct-eye{display:none !important;}",
    "  .ct-modal-overlay{display:none !important;}",
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
          '<div class="ct-field"><label>↕️ Cho phép kéo dãn dòng (%)</label>' +
            '<input type="range" id="ctLineSpread" min="70" max="180" value="100"></div>' +
          '<div class="ct-tools">' +
            '<button class="ct-btn small secondary" id="ctToggleGuide">🎯 Hiện/ẩn vòng canh dấu</button>' +
          '</div>' +

          '<h3>④ Bù trừ lệch máy in</h3>' +
          '<div class="ct-hint">Nếu bản in bị lệch đều theo 1 hướng so với bản xem trước (do máy in/khay giấy), chỉnh 2 số dưới rồi in lại — hệ thống sẽ nhớ cho lần sau.</div>' +
          '<div class="ct-row2">' +
            '<div class="ct-field"><label>Lệch ngang (mm)</label><input type="number" id="ctCalX" value="0" step="0.5"></div>' +
            '<div class="ct-field"><label>Lệch dọc (mm)</label><input type="number" id="ctCalY" value="0" step="0.5"></div>' +
          '</div>' +

          '<h3>⑤ Xuất file</h3>' +
          '<button class="ct-btn config" id="ctConfigBtn">⚙️ Cấu hình</button>' +
          '<button class="ct-btn" id="ctPrintBtn">🖨️ Tải PDF</button>' +
        '</div>' +

        '<div class="ct-stage"><div class="ct-sheet-outer"><div id="ctSheet"></div></div></div>' +
      '</div>' +

      '<div class="ct-modal-overlay" id="ctConfigOverlay">' +
        '<div class="ct-modal">' +
          '<div class="ct-modal-head"><h3>⚙️ Cấu hình</h3><button class="ct-modal-close" id="ctConfigClose">✕</button></div>' +
          '<div class="ct-switchrow">' +
            '<label class="ct-switch"><input type="checkbox" id="ctEditModeToggle"><span class="ct-slider"></span></label>' +
            '<span>✏️ Chỉnh sửa vị trí bố cục (kéo-thả 5 khối: SỞ Y TẾ, CỘNG HÒA, SVV, chữ ký, ghi chú)</span>' +
          '</div>' +
          '<div class="ct-hint">Tắt đi để khoá, tránh vô tình kéo lệch các khối khi chỉ muốn nhập liệu.</div>' +
          '<button class="ct-btn save" id="ctSaveBtn">💾 Lưu vị trí bố cục</button>' +
          '<button class="ct-btn small secondary" id="ctResetSig">↺ Reset tất cả vị trí</button>' +
        '</div>' +
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
    ["lyDo", "Lý do chuyển (a / b / 2)", "select:1a - 1.1. Phù hợp quy định chuyển cấp CMKT,1b - 1.2. Không phù hợp khả năng đáp ứng,2 - 2. Theo yêu cầu người bệnh"],
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

  // Bảng mã cp1252 cho vùng 0x80-0x9F (không trùng Latin-1/Unicode trực
  // tiếp) — cần để giải đúng các escape "\'XX" (dấu ngoặc kép kiểu chữ,
  // gạch ngang dài...) khi chúng đứng riêng, không kèm theo \uNNNN.
  var CP1252_80_9F = {
    0x80: 0x20AC, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E, 0x85: 0x2026,
    0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02C6, 0x89: 0x2030, 0x8A: 0x0160,
    0x8B: 0x2039, 0x8C: 0x0152, 0x8E: 0x017D, 0x91: 0x2018, 0x92: 0x2019,
    0x93: 0x201C, 0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
    0x98: 0x02DC, 0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A, 0x9C: 0x0153,
    0x9E: 0x017E, 0x9F: 0x0178
  };

  // Nhiều file RTF xuất từ phần mềm HIS bệnh viện dùng một "mẹo" để gõ đủ
  // dấu tiếng Việt trong RTF 8-bit: MỖI KÝ TỰ có dấu được gán cho một font
  // giả mang \fcharsetXXX của một NGÔN NGỮ KHÁC (Trung Âu 238, Việt 163,
  // Cyrillic 204, Hy Lạp 161, Thổ Nhĩ Kỳ 162, Do Thái 177, Ả Rập 178,
  // Baltic 186...) chỉ để mượn đúng vị trí byte có sẵn ký tự Việt cần dùng
  // trong bảng mã 8-bit tương ứng của ngôn ngữ đó — KHÔNG phải chữ đó thực
  // sự thuộc ngôn ngữ ấy. Vì vậy cùng 1 byte "\'XX" có thể mang nghĩa khác
  // nhau tuỳ ĐANG Ở ĐOẠN CHỮ CỦA FONT NÀO -> phải tra theo ĐÚNG charset của
  // font hiện hành (dò trong \fonttbl), không thể dùng 1 bảng cố định.
  // Riêng cp1258 (Việt) còn dùng DẤU TỔ HỢP (combining accent) đứng SAU
  // nguyên âm gốc (vd "a" + U+0301 = "á") thay vì 1 ký tự đã ghép sẵn ->
  // phải normalize("NFC") ở bước cuối để ghép lại thành 1 ký tự hoàn chỉnh.
  var CHARSET_TABLES = {
    0: {0x80:0x20AC, 0x82:0x201A, 0x83:0x192, 0x84:0x201E, 0x85:0x2026, 0x86:0x2020, 0x87:0x2021, 0x88:0x2C6, 0x89:0x2030, 0x8A:0x160, 0x8B:0x2039, 0x8C:0x152, 0x8E:0x17D, 0x91:0x2018, 0x92:0x2019, 0x93:0x201C, 0x94:0x201D, 0x95:0x2022, 0x96:0x2013, 0x97:0x2014, 0x98:0x2DC, 0x99:0x2122, 0x9A:0x161, 0x9B:0x203A, 0x9C:0x153, 0x9E:0x17E, 0x9F:0x178},
    163: {0x80:0x20AC, 0x82:0x201A, 0x83:0x192, 0x84:0x201E, 0x85:0x2026, 0x86:0x2020, 0x87:0x2021, 0x88:0x2C6, 0x89:0x2030, 0x8B:0x2039, 0x8C:0x152, 0x91:0x2018, 0x92:0x2019, 0x93:0x201C, 0x94:0x201D, 0x95:0x2022, 0x96:0x2013, 0x97:0x2014, 0x98:0x2DC, 0x99:0x2122, 0x9B:0x203A, 0x9C:0x153, 0x9F:0x178, 0xC3:0x102, 0xCC:0x300, 0xD0:0x110, 0xD2:0x309, 0xD5:0x1A0, 0xDD:0x1AF, 0xDE:0x303, 0xE3:0x103, 0xEC:0x301, 0xF0:0x111, 0xF2:0x323, 0xF5:0x1A1, 0xFD:0x1B0, 0xFE:0x20AB},
    238: {0x80:0x20AC, 0x82:0x201A, 0x84:0x201E, 0x85:0x2026, 0x86:0x2020, 0x87:0x2021, 0x89:0x2030, 0x8A:0x160, 0x8B:0x2039, 0x8C:0x15A, 0x8D:0x164, 0x8E:0x17D, 0x8F:0x179, 0x91:0x2018, 0x92:0x2019, 0x93:0x201C, 0x94:0x201D, 0x95:0x2022, 0x96:0x2013, 0x97:0x2014, 0x99:0x2122, 0x9A:0x161, 0x9B:0x203A, 0x9C:0x15B, 0x9D:0x165, 0x9E:0x17E, 0x9F:0x17A, 0xA1:0x2C7, 0xA2:0x2D8, 0xA3:0x141, 0xA5:0x104, 0xAA:0x15E, 0xAF:0x17B, 0xB2:0x2DB, 0xB3:0x142, 0xB9:0x105, 0xBA:0x15F, 0xBC:0x13D, 0xBD:0x2DD, 0xBE:0x13E, 0xBF:0x17C, 0xC0:0x154, 0xC3:0x102, 0xC5:0x139, 0xC6:0x106, 0xC8:0x10C, 0xCA:0x118, 0xCC:0x11A, 0xCF:0x10E, 0xD0:0x110, 0xD1:0x143, 0xD2:0x147, 0xD5:0x150, 0xD8:0x158, 0xD9:0x16E, 0xDB:0x170, 0xDE:0x162, 0xE0:0x155, 0xE3:0x103, 0xE5:0x13A, 0xE6:0x107, 0xE8:0x10D, 0xEA:0x119, 0xEC:0x11B, 0xEF:0x10F, 0xF0:0x111, 0xF1:0x144, 0xF2:0x148, 0xF5:0x151, 0xF8:0x159, 0xF9:0x16F, 0xFB:0x171, 0xFE:0x163, 0xFF:0x2D9},
    204: {0x80:0x402, 0x81:0x403, 0x82:0x201A, 0x83:0x453, 0x84:0x201E, 0x85:0x2026, 0x86:0x2020, 0x87:0x2021, 0x88:0x20AC, 0x89:0x2030, 0x8A:0x409, 0x8B:0x2039, 0x8C:0x40A, 0x8D:0x40C, 0x8E:0x40B, 0x8F:0x40F, 0x90:0x452, 0x91:0x2018, 0x92:0x2019, 0x93:0x201C, 0x94:0x201D, 0x95:0x2022, 0x96:0x2013, 0x97:0x2014, 0x99:0x2122, 0x9A:0x459, 0x9B:0x203A, 0x9C:0x45A, 0x9D:0x45C, 0x9E:0x45B, 0x9F:0x45F, 0xA1:0x40E, 0xA2:0x45E, 0xA3:0x408, 0xA5:0x490, 0xA8:0x401, 0xAA:0x404, 0xAF:0x407, 0xB2:0x406, 0xB3:0x456, 0xB4:0x491, 0xB8:0x451, 0xB9:0x2116, 0xBA:0x454, 0xBC:0x458, 0xBD:0x405, 0xBE:0x455, 0xBF:0x457, 0xC0:0x410, 0xC1:0x411, 0xC2:0x412, 0xC3:0x413, 0xC4:0x414, 0xC5:0x415, 0xC6:0x416, 0xC7:0x417, 0xC8:0x418, 0xC9:0x419, 0xCA:0x41A, 0xCB:0x41B, 0xCC:0x41C, 0xCD:0x41D, 0xCE:0x41E, 0xCF:0x41F, 0xD0:0x420, 0xD1:0x421, 0xD2:0x422, 0xD3:0x423, 0xD4:0x424, 0xD5:0x425, 0xD6:0x426, 0xD7:0x427, 0xD8:0x428, 0xD9:0x429, 0xDA:0x42A, 0xDB:0x42B, 0xDC:0x42C, 0xDD:0x42D, 0xDE:0x42E, 0xDF:0x42F, 0xE0:0x430, 0xE1:0x431, 0xE2:0x432, 0xE3:0x433, 0xE4:0x434, 0xE5:0x435, 0xE6:0x436, 0xE7:0x437, 0xE8:0x438, 0xE9:0x439, 0xEA:0x43A, 0xEB:0x43B, 0xEC:0x43C, 0xED:0x43D, 0xEE:0x43E, 0xEF:0x43F, 0xF0:0x440, 0xF1:0x441, 0xF2:0x442, 0xF3:0x443, 0xF4:0x444, 0xF5:0x445, 0xF6:0x446, 0xF7:0x447, 0xF8:0x448, 0xF9:0x449, 0xFA:0x44A, 0xFB:0x44B, 0xFC:0x44C, 0xFD:0x44D, 0xFE:0x44E, 0xFF:0x44F},
    161: {0x80:0x20AC, 0x82:0x201A, 0x83:0x192, 0x84:0x201E, 0x85:0x2026, 0x86:0x2020, 0x87:0x2021, 0x89:0x2030, 0x8B:0x2039, 0x91:0x2018, 0x92:0x2019, 0x93:0x201C, 0x94:0x201D, 0x95:0x2022, 0x96:0x2013, 0x97:0x2014, 0x99:0x2122, 0x9B:0x203A, 0xA1:0x385, 0xA2:0x386, 0xAF:0x2015, 0xB4:0x384, 0xB8:0x388, 0xB9:0x389, 0xBA:0x38A, 0xBC:0x38C, 0xBE:0x38E, 0xBF:0x38F, 0xC0:0x390, 0xC1:0x391, 0xC2:0x392, 0xC3:0x393, 0xC4:0x394, 0xC5:0x395, 0xC6:0x396, 0xC7:0x397, 0xC8:0x398, 0xC9:0x399, 0xCA:0x39A, 0xCB:0x39B, 0xCC:0x39C, 0xCD:0x39D, 0xCE:0x39E, 0xCF:0x39F, 0xD0:0x3A0, 0xD1:0x3A1, 0xD3:0x3A3, 0xD4:0x3A4, 0xD5:0x3A5, 0xD6:0x3A6, 0xD7:0x3A7, 0xD8:0x3A8, 0xD9:0x3A9, 0xDA:0x3AA, 0xDB:0x3AB, 0xDC:0x3AC, 0xDD:0x3AD, 0xDE:0x3AE, 0xDF:0x3AF, 0xE0:0x3B0, 0xE1:0x3B1, 0xE2:0x3B2, 0xE3:0x3B3, 0xE4:0x3B4, 0xE5:0x3B5, 0xE6:0x3B6, 0xE7:0x3B7, 0xE8:0x3B8, 0xE9:0x3B9, 0xEA:0x3BA, 0xEB:0x3BB, 0xEC:0x3BC, 0xED:0x3BD, 0xEE:0x3BE, 0xEF:0x3BF, 0xF0:0x3C0, 0xF1:0x3C1, 0xF2:0x3C2, 0xF3:0x3C3, 0xF4:0x3C4, 0xF5:0x3C5, 0xF6:0x3C6, 0xF7:0x3C7, 0xF8:0x3C8, 0xF9:0x3C9, 0xFA:0x3CA, 0xFB:0x3CB, 0xFC:0x3CC, 0xFD:0x3CD, 0xFE:0x3CE},
    162: {0x80:0x20AC, 0x82:0x201A, 0x83:0x192, 0x84:0x201E, 0x85:0x2026, 0x86:0x2020, 0x87:0x2021, 0x88:0x2C6, 0x89:0x2030, 0x8A:0x160, 0x8B:0x2039, 0x8C:0x152, 0x91:0x2018, 0x92:0x2019, 0x93:0x201C, 0x94:0x201D, 0x95:0x2022, 0x96:0x2013, 0x97:0x2014, 0x98:0x2DC, 0x99:0x2122, 0x9A:0x161, 0x9B:0x203A, 0x9C:0x153, 0x9F:0x178, 0xD0:0x11E, 0xDD:0x130, 0xDE:0x15E, 0xF0:0x11F, 0xFD:0x131, 0xFE:0x15F},
    177: {0x80:0x20AC, 0x82:0x201A, 0x83:0x192, 0x84:0x201E, 0x85:0x2026, 0x86:0x2020, 0x87:0x2021, 0x88:0x2C6, 0x89:0x2030, 0x8B:0x2039, 0x91:0x2018, 0x92:0x2019, 0x93:0x201C, 0x94:0x201D, 0x95:0x2022, 0x96:0x2013, 0x97:0x2014, 0x98:0x2DC, 0x99:0x2122, 0x9B:0x203A, 0xA4:0x20AA, 0xAA:0xD7, 0xBA:0xF7, 0xC0:0x5B0, 0xC1:0x5B1, 0xC2:0x5B2, 0xC3:0x5B3, 0xC4:0x5B4, 0xC5:0x5B5, 0xC6:0x5B6, 0xC7:0x5B7, 0xC8:0x5B8, 0xC9:0x5B9, 0xCB:0x5BB, 0xCC:0x5BC, 0xCD:0x5BD, 0xCE:0x5BE, 0xCF:0x5BF, 0xD0:0x5C0, 0xD1:0x5C1, 0xD2:0x5C2, 0xD3:0x5C3, 0xD4:0x5F0, 0xD5:0x5F1, 0xD6:0x5F2, 0xD7:0x5F3, 0xD8:0x5F4, 0xE0:0x5D0, 0xE1:0x5D1, 0xE2:0x5D2, 0xE3:0x5D3, 0xE4:0x5D4, 0xE5:0x5D5, 0xE6:0x5D6, 0xE7:0x5D7, 0xE8:0x5D8, 0xE9:0x5D9, 0xEA:0x5DA, 0xEB:0x5DB, 0xEC:0x5DC, 0xED:0x5DD, 0xEE:0x5DE, 0xEF:0x5DF, 0xF0:0x5E0, 0xF1:0x5E1, 0xF2:0x5E2, 0xF3:0x5E3, 0xF4:0x5E4, 0xF5:0x5E5, 0xF6:0x5E6, 0xF7:0x5E7, 0xF8:0x5E8, 0xF9:0x5E9, 0xFA:0x5EA, 0xFD:0x200E, 0xFE:0x200F},
    178: {0x80:0x20AC, 0x81:0x67E, 0x82:0x201A, 0x83:0x192, 0x84:0x201E, 0x85:0x2026, 0x86:0x2020, 0x87:0x2021, 0x88:0x2C6, 0x89:0x2030, 0x8A:0x679, 0x8B:0x2039, 0x8C:0x152, 0x8D:0x686, 0x8E:0x698, 0x8F:0x688, 0x90:0x6AF, 0x91:0x2018, 0x92:0x2019, 0x93:0x201C, 0x94:0x201D, 0x95:0x2022, 0x96:0x2013, 0x97:0x2014, 0x98:0x6A9, 0x99:0x2122, 0x9A:0x691, 0x9B:0x203A, 0x9C:0x153, 0x9D:0x200C, 0x9E:0x200D, 0x9F:0x6BA, 0xA1:0x60C, 0xAA:0x6BE, 0xBA:0x61B, 0xBF:0x61F, 0xC0:0x6C1, 0xC1:0x621, 0xC2:0x622, 0xC3:0x623, 0xC4:0x624, 0xC5:0x625, 0xC6:0x626, 0xC7:0x627, 0xC8:0x628, 0xC9:0x629, 0xCA:0x62A, 0xCB:0x62B, 0xCC:0x62C, 0xCD:0x62D, 0xCE:0x62E, 0xCF:0x62F, 0xD0:0x630, 0xD1:0x631, 0xD2:0x632, 0xD3:0x633, 0xD4:0x634, 0xD5:0x635, 0xD6:0x636, 0xD8:0x637, 0xD9:0x638, 0xDA:0x639, 0xDB:0x63A, 0xDC:0x640, 0xDD:0x641, 0xDE:0x642, 0xDF:0x643, 0xE1:0x644, 0xE3:0x645, 0xE4:0x646, 0xE5:0x647, 0xE6:0x648, 0xEC:0x649, 0xED:0x64A, 0xF0:0x64B, 0xF1:0x64C, 0xF2:0x64D, 0xF3:0x64E, 0xF5:0x64F, 0xF6:0x650, 0xF8:0x651, 0xFA:0x652, 0xFD:0x200E, 0xFE:0x200F, 0xFF:0x6D2},
    186: {0x80:0x20AC, 0x82:0x201A, 0x84:0x201E, 0x85:0x2026, 0x86:0x2020, 0x87:0x2021, 0x89:0x2030, 0x8B:0x2039, 0x8D:0xA8, 0x8E:0x2C7, 0x8F:0xB8, 0x91:0x2018, 0x92:0x2019, 0x93:0x201C, 0x94:0x201D, 0x95:0x2022, 0x96:0x2013, 0x97:0x2014, 0x99:0x2122, 0x9B:0x203A, 0x9D:0xAF, 0x9E:0x2DB, 0xA8:0xD8, 0xAA:0x156, 0xAF:0xC6, 0xB8:0xF8, 0xBA:0x157, 0xBF:0xE6, 0xC0:0x104, 0xC1:0x12E, 0xC2:0x100, 0xC3:0x106, 0xC6:0x118, 0xC7:0x112, 0xC8:0x10C, 0xCA:0x179, 0xCB:0x116, 0xCC:0x122, 0xCD:0x136, 0xCE:0x12A, 0xCF:0x13B, 0xD0:0x160, 0xD1:0x143, 0xD2:0x145, 0xD4:0x14C, 0xD8:0x172, 0xD9:0x141, 0xDA:0x15A, 0xDB:0x16A, 0xDD:0x17B, 0xDE:0x17D, 0xE0:0x105, 0xE1:0x12F, 0xE2:0x101, 0xE3:0x107, 0xE6:0x119, 0xE7:0x113, 0xE8:0x10D, 0xEA:0x17A, 0xEB:0x117, 0xEC:0x123, 0xED:0x137, 0xEE:0x12B, 0xEF:0x13C, 0xF0:0x161, 0xF1:0x144, 0xF2:0x146, 0xF4:0x14D, 0xF8:0x173, 0xF9:0x142, 0xFA:0x15B, 0xFB:0x16B, 0xFD:0x17C, 0xFE:0x17E, 0xFF:0x2D9}
  };

  // Nhiều file RTF khai báo NHIỀU FONT khác nhau cho cùng 1 tài liệu, và
  // CÙNG một byte "\'XX" mang Ý NGHĨA KHÁC NHAU tuỳ font đang áp dụng: font
  // "Times New Roman" thường (fcharset0/ANSI) dùng bảng mã kiểu cp1252, còn
  // font "...(Vietnamese)" (fcharset163) dùng bảng mã Windows-1258 (khác
  // hẳn ở vùng 0xC0-0xFF) -> phải dò trong \fonttbl xem font nào có
  // fcharset163 để biết đoạn nào cần giải mã theo cp1258.
  // Dò trong \fonttbl: font \f<n> nào dùng \fcharset<mm> nào -> trả về map
  // {fontId: charsetId} để biết mỗi đoạn chữ nên tra theo bảng mã 8-bit nào.
  function parseFontCharsets(rtfText) {
    var map = {};
    var re = /\{\\f(\d+)\b[^{}]*?\\fcharset(\d+)/g;
    var m;
    while ((m = re.exec(rtfText)) !== null) {
      map[parseInt(m[1], 10)] = parseInt(m[2], 10);
    }
    return map;
  }

  // Giải mã escape RTF -> ký tự thật, và loại control-word.
  // fontCharsets: map {fontId: charsetId} lấy từ \fonttbl (xem
  // parseFontCharsets), dùng để biết byte "\'XX" tại từng vị trí nên tra
  // theo bảng mã 8-bit nào, tuỳ font \f<n> đang áp dụng gần nhất phía
  // trước nó (vì mỗi đoạn chữ có thể "mượn" một charset khác nhau).
  function decodeRtfChunk(s, fontCharsets) {
    fontCharsets = fontCharsets || {};
    // Trường hợp \uNNNN đi kèm ký tự dự phòng ngay sau (dạng "?" đơn giản,
    // hoặc dạng "\'XX" theo mã cp1252 - thường gặp ở các file RTF xuất chi
    // tiết từng ký tự một, khác với goc.rtf) -> chỉ lấy ký tự Unicode thật
    // từ \uNNNN, bỏ hẳn phần dự phòng phía sau.
    s = s.replace(/\\u(-?\d+)(?:[\r\n]*)(?:\?|\\'[0-9a-fA-F]{2})?/g, function (m, code) {
      var c = parseInt(code, 10);
      if (c < 0) c += 65536;
      try { return String.fromCharCode(c); } catch (e) { return ""; }
    });
    // "\'XX" còn sót lại (không đi kèm \u phía trước, vd dấu ngoặc kép,
    // gạch ngang... trong vùng 0x80-0x9F của cp1252) -> tra bảng, các mã
    // còn lại (0xA0-0xFF) trùng Latin-1 nên dùng thẳng mã ký tự.
    s = s.replace(/\\'([0-9a-fA-F]{2})/g, function (m, hex, offset, whole) {
      var b = parseInt(hex, 16);
      // Tìm font \f<n> ĐƯỢC KHAI BÁO GẦN NHẤT phía trước byte này (quét lùi
      // một đoạn hợp lý) để biết nên tra bảng mã 8-bit nào cho đúng.
      var back = whole.slice(Math.max(0, offset - 300), offset);
      var fMatches = back.match(/\\f(\d+)(?!\d)/g);
      var fontId = fMatches && fMatches.length
        ? parseInt(fMatches[fMatches.length - 1].slice(2), 10)
        : null;
      var charsetId = fontId !== null ? fontCharsets[fontId] : null;
      var table = (charsetId !== null && charsetId !== undefined)
        ? CHARSET_TABLES[charsetId]
        : null;
      var code = (table && table[b]) || CP1252_80_9F[b] || b;
      try { return String.fromCharCode(code); } catch (e) { return ""; }
    });
    s = s.replace(/\\par[d]?/g, " ");
    // Quan trọng: các ký tự xuống dòng THẬT (\r, \n) nằm trong mã nguồn RTF
    // (do file bị wrap dòng để dễ đọc, hoặc do mỗi ký tự có dấu nằm trong 1
    // "run" riêng rồi bị ngắt dòng ngay giữa run đó) KHÔNG mang ý nghĩa xuống
    // dòng/khoảng trắng thật -> phải xoá hẳn (không phải thay bằng dấu cách),
    // nếu không sẽ chèn nhầm khoảng trắng vào GIỮA một từ, vd "Hồ" bị tách
    // thành "H Ồ", "Số hồ sơ" thành "Số h ồ sõ"... làm hỏng toàn bộ các regex
    // nhận diện trường phía sau (chỉ còn khớp được rất ít trường).
    s = s.replace(/[\r\n]+/g, "");
    s = s.replace(/\\[a-zA-Z]+-?\d*[ ]?/g, "");
    s = s.replace(/[{}]/g, "");
    s = s.replace(/\s+/g, " ").trim();
    // cp1258 biểu diễn ký tự có dấu bằng CHỮ CÁI GỐC + DẤU TỔ HỢP đứng sau
    // (vd "a" + U+0301 = "á") thay vì 1 ký tự dựng sẵn -> ghép lại (NFC) để
    // ra đúng 1 ký tự có dấu hoàn chỉnh, tránh hiển thị/so khớp sai.
    try { s = s.normalize("NFC"); } catch (e) {}
    return s;
  }

  // Trích các "shape" định vị tuyệt đối trong RTF, gom theo hàng (cùng
  // khoảng shptop) thành từng dòng văn bản theo đúng thứ tự trình bày gốc.
  function rtfToLines(rtfText) {
    // Quan trọng: KHÔNG giả định nội dung nhóm \shptxt luôn kết thúc bằng
    // đúng 4 dấu "}" liên tiếp — điều đó chỉ đúng với RTF xuất "phẳng"
    // (như goc.rtf). Nhiều file RTF khác (vd xuất từ Word với định dạng
    // chi tiết từng ký tự) lồng nhiều cấp ngoặc {} bên trong \shptxt hơn,
    // khiến cắt hụt nội dung hoặc không khớp được gì cả -> phải ĐẾM NGOẶC
    // CÂN BẰNG để lấy trọn vẹn nhóm \shptxt bất kể độ sâu lồng nhau.
    // Quan trọng: \shpleft / \shptop có thể nằm TRƯỚC hoặc SAU \shpinst tuỳ
    // từng file RTF (goc.rtf: toạ độ nằm TRƯỚC \shpinst; file khác: toạ độ
    // nằm SAU \shpinst) -> không thể neo theo \shpinst. Thay vào đó: với
    // mỗi khối "{\shptxt" tìm được, quét NGƯỢC một đoạn hợp lý phía trước
    // nó để lấy toạ độ shpleft/shptop GẦN NHẤT (thuộc cùng 1 shape).
    function lastNum(str, propName) {
      var re = new RegExp(propName + "(-?\\d+)", "g");
      var m, last = null;
      while ((m = re.exec(str)) !== null) last = m[1];
      return last !== null ? parseInt(last, 10) : null;
    }
    var fontCharsets = parseFontCharsets(rtfText);
    var WINDOW = 1200;
    var items = [];
    var searchFrom = 0;
    while (true) {
      var startIdx = rtfText.indexOf("{\\shptxt", searchFrom);
      if (startIdx === -1) break;
      var back = rtfText.slice(Math.max(0, startIdx - WINDOW), startIdx);
      var left = lastNum(back, "shpleft");
      var top = lastNum(back, "shptop");
      if (left === null || top === null) { searchFrom = startIdx + 8; continue; }
      var depth = 0, endIdx = -1;
      for (var i = startIdx; i < rtfText.length; i++) {
        var c = rtfText.charAt(i);
        if (c === "{") depth++;
        else if (c === "}") {
          depth--;
          if (depth === 0) { endIdx = i; break; }
        }
      }
      if (endIdx === -1) { searchFrom = startIdx + 8; continue; }
      var chunk = rtfText.slice(startIdx, endIdx + 1);
      var txt = decodeRtfChunk(chunk, fontCharsets);
      if (txt) items.push({ top: top, left: left, text: txt });
      searchFrom = endIdx + 1;
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

    // --- SVV / Số hồ sơ / Vào sổ chuyển CSKCB số -------------------------
    // File nguồn (goc.rtf) KHÔNG có nhãn "SVV" nào cả — số SVV chỉ là MỘT
    // DÒNG SỐ ĐỨNG RIÊNG LẺ (vd "20030") ở vùng đầu trang, do lệch toạ độ
    // với chữ "Số hồ sơ:" nên không nằm cùng dòng với nhãn nào. Nhận diện
    // bằng cách tìm dòng CHỈ TOÀN CHỮ SỐ (3-8 số) trong vài dòng đầu tiên.
    // SVV: nằm ở đầu trang (góc phải trên). File nguồn không có nhãn "SVV"
    // đi kèm — chỉ là một cụm số bị dính vào CUỐI dòng tiêu đề đầu tiên
    // (do trùng toạ độ hàng với "SỞ Y TẾ...", "Số hồ sơ:"...) hoặc đôi khi
    // đứng riêng hẳn 1 dòng, tuỳ file. Nhận diện bằng cách tìm CỤM SỐ Ở
    // CUỐI DÒNG (3-8 chữ số) trong vài dòng đầu tiên của phiếu.
    d.svv = "";
    for (var _i = 0; _i < Math.min(lines.length, 8); _i++) {
      var _ln = (lines[_i] || "").trim();
      var _mSvv = _ln.match(/(?:^|\s)(\d{3,8})\s*$/);
      if (_mSvv) { d.svv = _mSvv[1]; break; }
    }

    // "Vào sổ chuyển CSKCB số:" trong file nguồn hay bị dính chung dòng với
    // cụm "Độc lập - Tự do - Hạnh phúc" bên cạnh (do 2 khối trùng toạ độ
    // hàng) -> CHỈ lấy đúng phần "số/năm/PCCSKBCB", bỏ hết phần dính theo
    // sau, thay vì lấy nguyên phần còn lại của dòng.
    d.vaoSoChuyenCSKCB = grab(text, /Vào sổ chuyển[^:\n]*:?\s*([0-9]+\/[0-9]{4}\/PCCSKBCB)/i);

    // "Số:" (góc trên trái, "Số: ____/PCCSKBCB") — chỉ lấy phần số/năm,
    // KHÔNG lấy kèm hậu tố "/PCCSKBCB" vì khối hiển thị (hdrLeft) đã tự
    // nối thêm "/PCCSKBCB" phía sau rồi -> nếu giữ nguyên hậu tố ở đây sẽ
    // bị in lặp 2 lần "/PCCSKBCB/PCCSKBCB".
    var _soRaw = grab(text, /\bSố\s*:\s*([^\n]+)/i);
    var _mSo = _soRaw.match(/([0-9]+\/[0-9]{4})/);
    d.soHoSo = _mSo ? _mSo[1] : _soRaw.replace(/\/?PCCSKBCB\/?\s*$/i, "").trim();

    // "Số hồ sơ:" (góc trên phải) — theo yêu cầu, ô "Số hồ sơ (bệnh án)"
    // trên form sẽ hiển thị đúng giá trị SVV vừa nhận diện được ở trên,
    // còn ô SVV để trống (không tự điền) để người dùng tự nhập nếu cần.
    d.soHoSoBenhAn = d.svv;
    d.svv = "";
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

    // Quan trọng: KHÔNG dò "+ Tại:" trên toàn văn bản gộp (text) vì dòng
    // "Hết thời hạn: ... Không xác định được thời hạn:" hay bị dính chung
    // với dòng MẪU TRỐNG "+ Tại:.........." (do trùng toạ độ hàng trong
    // file nguồn) -> nếu dò cả câu sẽ bắt nhầm dòng mẫu trống lên trước,
    // đẩy dòng có dữ liệu thật xuống sau (sai thứ tự). Phải dò theo từng
    // dòng đã tách sẵn (lines) và chỉ nhận dòng THỰC SỰ BẮT ĐẦU bằng "+ Tại:".
    var dtLines = lines.filter(function (l) { return /^\+\s*Tại\s*:/i.test((l || "").trim()); });
    // Loại bỏ nhãn "Tại:" đầu dòng, rồi loại bỏ TIẾP mọi cụm "Tại:" còn sót
    // lại ở GIỮA nội dung (không phải do dữ liệu thật, mà do lỗi gộp dòng
    // theo toạ độ Y ở trên khi văn bản dài wrap xuống trùng hàng với nhãn
    // tĩnh của dòng "+ Tại:" kế tiếp trong file mẫu gốc).
    function stripStrayTai(s) {
      return s
        .replace(/^\+\s*/, "")
        .replace(/^(?:Tại\s*:\s*)+/i, "")
        .replace(/\bTại\s*:\s*/gi, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
    }
    d.dieuTri1 = dtLines[0] ? stripStrayTai(dtLines[0]) : "";
    d.dieuTri2 = dtLines[1] ? stripStrayTai(dtLines[1]) : "";

    // Viết hoa chữ cái đầu câu — chỉ áp dụng cho các trường trong mục
    // "TÓM TẮT BỆNH ÁN" khi thực sự CÓ dữ liệu điền vào (theo yêu cầu:
    // "chỗ nào điền vào thì viết hoa đầu câu"; chỗ để trống thì giữ trống,
    // không viết hoa chữ gì cả).
    function capFirst(s) {
      s = (s || "").trim();
      if (!s) return "";
      return s.charAt(0).toUpperCase() + s.slice(1);
    }

    d.tomTatLamSang = capFirst(grab(text, /Tóm tắt dấu hiệu lâm sàng\s*:\s*([^\n]+)/i));
    // Tóm tắt CLS: CHỈ lấy kết quả cận lâm sàng thật sự có trong file gốc
    // (siêu âm, CTM, XN...); KHÔNG được lấy nhầm nội dung của dòng "Chẩn
    // đoán" phía dưới — 2 trường này luôn nằm ở 2 DÒNG RIÊNG biệt sau khi
    // rtfToLines() tách dòng, nên regex chỉ dò trong đúng dòng của nó
    // (dừng lại ở \n) là đủ an toàn, không vô tình nuốt cả dòng chẩn đoán.
    d.tomTatCLS = capFirst(grab(text, /Tóm tắt kết quả xét nghiệm[^:]*:\s*([^\n]+)/i));
    d.chanDoan = capFirst(grab(text, /Chẩn đoán\s*:\s*([^\n]+)/i));
    // Lưu ý: dùng [ \t]* (KHÔNG phải \s*) ngay sau dấu ":" — vì \s* khớp cả
    // ký tự xuống dòng, nên nếu trường này để trống trong file gốc (dấu ":"
    // là cuối dòng, không có gì phía sau), \s* sẽ "tràn" qua dòng kế tiếp và
    // bắt nhầm nội dung của trường hoàn toàn khác (vd trường tiếp theo trong
    // phiếu) làm giá trị của trường này. Cùng lỗi áp dụng cho "nguoiHoTong".
    d.phuongPhapThuThuat = capFirst(grab(text, /Phương pháp, thủ thuật đã thực hiện[^:]*:[ \t]*([^\n]+)/i));
    d.kyThuatThuoc = capFirst(grab(text, /(?:Kỹ thuật, thuốc điều trị chính đã (?:sử dụng|dùng))\s*:?\s*([^\n]+)/i));
    d.tinhTrang = grab(text, /Tình trạng người bệnh lúc chuyển[^:]*:\s*([^\n]+)/i);

    // Quan trọng: KHÔNG được dò chữ "X" trên toàn văn bản (text) vì ô "X" luôn
    // xuất hiện đâu đó trong file nguồn bất kể đánh dấu ở dòng nào, dẫn tới
    // luôn rơi vào nhánh "Không phù hợp" một cách sai lệch. rtfToLines() đã
    // gộp các "shape" theo cùng hàng ngang (cùng shptop) thành 1 dòng, nên ô
    // dấu X luôn nằm CHUNG DÒNG với đúng lựa chọn a) hoặc b) tương ứng vị trí
    // thật trên phiếu gốc -> phải dò theo từng dòng (lineA / lineB) như dưới.
    var lineA = lines.filter(function (l) { return /Phù hợp với quy định chuyển cấp/i.test(l); })[0] || "";
    var lineB = lines.filter(function (l) { return /Không phù hợp với khả năng/i.test(l); })[0] || "";
    if (/\bX\b/.test(lineA)) d.lyDo = "1a - 1.1. Phù hợp quy định chuyển cấp CMKT";
    else if (/\bX\b/.test(lineB)) d.lyDo = "1b - 1.2. Không phù hợp khả năng đáp ứng";
    d.huongDieuTri = grab(text, /Hướng điều trị\s*:\s*([^\n]+)/i);
    d.chuyenHoi = grab(text, /Chuyển cơ sở khám bệnh, chữa bệnh hồi\s*:\s*([^\n]+)/i);
    var cgt = grab(text, /giá trị trong 01 năm\s*:\s*\(?([^)\n]+)/i);
    d.coGiaTri1Nam = /không/i.test(cgt) ? "Không" : (/có/i.test(cgt) ? "Có" : "");
    d.phuongTien = grab(text, /Phương tiện vận chuyển\s*:\s*([^\n]+)/i);
    // Cùng lý do như phuongPhapThuThuat ở trên: dùng [ \t]* thay vì \s* để
    // không tràn qua dòng "Ngày ... ĐẠI DIỆN CSKCB" kế tiếp khi trường này
    // để trống trong file gốc.
    d.nguoiHoTong = grab(text, /người hộ tống[^:]*:[ \t]*([^\n]+)/i);
    // Ngày ký (dòng "Ngày ... ĐẠI DIỆN CSKCB" cuối phiếu) — KHÔNG được dò
    // "Ngày <n> tháng <n> năm <n>" trên toàn văn bản vì sẽ bắt trúng ngay
    // ngày hết hạn thẻ BHYT ("...đến ngày 31 tháng 12 năm 2026") xuất hiện
    // sớm hơn trong văn bản. Ngày ký thật luôn nằm ở DÒNG RIÊNG cuối phiếu,
    // dạng "Ngày n tháng n năm n" không kèm chữ nào khác -> lấy dòng như
    // vậy CUỐI CÙNG trong toàn bộ nội dung.
    var ngayLines = lines.filter(function (l) {
      return /^Ngày\s+\d{1,2}\s+tháng\s+\d{1,2}\s+năm\s+\d{4}\s*$/i.test((l || "").trim());
    });
    d.ngayKy = ngayLines.length ? ngayLines[ngayLines.length - 1].replace(/^Ngày\s+/i, "").trim() : "";
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
  function box(checked, big) { return '<span class="' + (big ? "chkbig" : "chk") + '">' + (checked ? "X" : "") + '</span>'; }
  function circ(text, active) { return active ? '<span class="circ">' + text + '</span>' : text; }

  // Một dòng nội dung trong luồng văn bản bình thường (giống Word): không còn
  // toạ độ "top" tuyệt đối nữa -> dòng nào dài hơn tự xuống hàng bên trong
  // đúng bề rộng của nó, và các dòng phía dưới TỰ ĐỘNG bị đẩy xuống theo
  // (không còn đè chữ lên nhau nữa). left/right vẫn giữ để canh lề trái/bề
  // rộng khung y như bản gốc đo được.
  var lineCounter = 0;
  // fillEnd: giống fillOr nhưng khi CHƯA điền thì kéo dấu chấm (đường chấm)
  // dài hết phần còn lại của dòng, tới sát lề phải, thay vì dừng ở độ dài
  // ước lượng cố định như fillOr.
  function fillEnd(s) {
    return s
      ? '<span class="fill">' + esc(s) + '</span>'
      : '<span class="fill-line"></span>';
  }
  // Viết hoa chữ cái đầu tiên của chuỗi (giữ nguyên phần còn lại)
  function capFirst(s) {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function line(left, right, size, opt, build) {
    opt = opt || {};
    var idx = lineCounter++;
    var baseGapMm = mm(opt.gap != null ? opt.gap : 4);
    // "Cho phép kéo dãn dòng" giờ là 1 thanh kéo DUY NHẤT áp dụng cho TOÀN
    // BỘ khối nội dung chính (không còn chỉnh riêng từng dòng nữa): mọi
    // khoảng cách dòng được nhân đồng loạt theo settings.lineSpread (%).
    var spread = (settings && settings.lineSpread) ? settings.lineSpread : 100;
    var gapMm = +(baseGapMm * (spread / 100)).toFixed(2);
    var css = "margin-left:" + mm(left) + "mm;width:" + mm(right - left) + "mm;" +
      "font-size:" + size + "pt;margin-bottom:" + gapMm + "mm;";
    if (opt.bold) css += "font-weight:bold;";
    if (opt.center) css += "text-align:center;";
    if (opt.flex) css += "display:flex;align-items:baseline;";
    return '<div class="l-row' + (opt.flex ? " l-flexrow" : "") + '" data-li="' + idx + '" data-basegap="' + baseGapMm + '" style="' + css + '">' + build() + '</div>';
  }

  function buildFlowHTML(d) {
    lineCounter = 0;
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
    html += line(44, 568, 9.5, { flex: true }, function () { return "- Địa chỉ: " + fillEnd(d.diaChi); });
    html += line(44, 568, 9.5, {}, function () { return "- Dân tộc: " + fillOr(d.danToc, 30) + "&nbsp;&nbsp;Quốc tịch: " + fillOr(d.quocTich, 30); });
    html += line(44, 568, 9.5, {}, function () { return "- Nghề nghiệp: " + fillOr(d.ngheNghiep, 26) + "&nbsp;&nbsp;Nơi làm việc: " + fillOr(d.noiLamViec, 26); });
    html += line(44, 568, 9.5, { flex: true }, function () { return "- Số thẻ bảo hiểm y tế: " + fillEnd(d.soThe); });
    html += line(44, 568, 9.5, { flex: true }, function () { return "- Thời hạn sử dụng của thẻ bảo hiểm y tế đến ngày: " + fillEnd(d.hanThe); });
    html += line(54, 500, 9.5, { gap: 8 }, function () { return "Hết thời hạn: " + box(false) + "&nbsp;&nbsp;&nbsp;Không xác định được thời hạn: " + box(false); });

    html += line(44, 400, 9.5, {}, function () { return "- Đã được khám bệnh, điều trị:"; });
    html += line(44, 568, 9.5, { flex: true, gap: 6 }, function () { return "&nbsp;&nbsp;+ Tại: " + fillEnd(d.dieuTri1); });
    html += line(44, 568, 9.5, { gap: 8, flex: true }, function () { return d.dieuTri2 ? ("&nbsp;&nbsp;+ Tại: " + fillEnd(d.dieuTri2)) : "&nbsp;&nbsp;+ Tại:&nbsp;<span class=\"fill-line\"></span>"; });

    html += line(44, 300, 10.5, { bold: true, gap: 6 }, function () { return "TÓM TẮT BỆNH ÁN"; });
    html += line(44, 568, 9.5, { flex: true }, function () { return "- Tóm tắt dấu hiệu lâm sàng: " + fillEnd(d.tomTatLamSang); });
    html += line(44, 568, 9.5, { flex: true }, function () {
      return "- Tóm tắt kết quả xét nghiệm, cận lâm sàng chính có giá trị chẩn đoán, theo dõi điều trị: " + fillEnd(d.tomTatCLS);
    });
    html += line(44, 568, 9.5, { flex: true }, function () { return "- Chẩn đoán: " + fillEnd(d.chanDoan) + "&nbsp;(ICD-10)"; });

    html += line(44, 400, 9.5, {}, function () { return "- Phương pháp, thủ thuật đã thực hiện (nếu có):"; });
    html += line(44, 568, 9.5, { flex: true }, function () { return "+ " + fillEnd(d.phuongPhapThuThuat); });

    html += line(44, 568, 9.5, { flex: true }, function () { return "- Kỹ thuật, thuốc điều trị chính đã sử dụng: " + fillEnd(d.kyThuatThuoc); });
    html += line(44, 568, 9.5, { flex: true }, function () { return "- Tình trạng người bệnh lúc chuyển cơ sở KCB: " + fillEnd(capFirst(d.tinhTrang)); });

    html += line(44, 400, 9.5, {}, function () { return "- Lí do chuyển cơ sở khám bệnh, chữa bệnh:"; });
    html += line(44, 400, 9.5, {}, function () { return circ("1", is1a || is1b) + ". Đủ điều kiện chuyển cơ sở khám bệnh, chữa bệnh:"; });
    html += line(66, 568, 9.5, {}, function () { return box(is1a, true) + "Phù hợp với quy định chuyển cấp chuyên môn kỹ thuật"; });
    html += line(66, 568, 9.5, {}, function () { return box(is1b, true) + "Không phù hợp với khả năng đáp ứng của cơ sở khám bệnh, chữa bệnh"; });
    html += line(44, 568, 9.5, {}, function () { return "&nbsp;" + circ("2", is2) + ". Theo yêu cầu của người bệnh hoặc người đại diện hợp pháp của người bệnh."; });

    html += line(44, 568, 9.5, { flex: true }, function () { return "- Hướng điều trị: " + fillEnd(capFirst(d.huongDieuTri)); });
    html += line(44, 568, 9.5, { flex: true }, function () { return "- Chuyển cơ sở khám bệnh, chữa bệnh hồi: " + fillEnd(d.chuyenHoi); });
    html += line(44, 568, 9.5, { flex: true }, function () { return "- Trường hợp chuyển có giá trị trong 01 năm: " + fillEnd(d.coGiaTri1Nam); });
    html += line(44, 568, 9.5, { flex: true }, function () { return "- Phương tiện vận chuyển: " + fillEnd(capFirst(d.phuongTien)); });
    html += line(44, 568, 9.5, { gap: 30, flex: true }, function () { return "- Họ tên, chức danh người hộ tống (nếu có): " + fillEnd(d.nguoiHoTong); });

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
        var ngayHtml = d.ngayKy
          ? '<span class="fill">' + esc(d.ngayKy) + '</span>'
          : '<span class="fill empty">' + dots(4) + '</span> tháng <span class="fill empty">' + dots(3) + '</span> năm <span class="fill empty">' + dots(5) + '</span>';
        return '<div style="font-style:italic;font-size:9.5pt;text-align:center;">Ngày ' + ngayHtml + '</div>' +
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

  function normalizeSettings(s) {
    s = s || {};
    var defB = defaultBlocks();
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
      hidden: s.hidden || {}, // { blockId: true } -> ẩn khối đó khi IN (vẫn thấy khi xem trước, có viền chấm)
      editMode: s.editMode === true, // mặc định TẮT: khoá 5 khối, tránh vô tình kéo lệch
      // "Cho phép kéo dãn dòng" (%): co giãn ĐỒNG LOẠT khoảng cách giữa các
      // dòng của TOÀN BỘ khối nội dung chính (từ tiêu đề "PHIẾU CHUYỂN..."
      // đến dòng "Họ tên, chức danh người hộ tống"), không chỉnh riêng
      // từng dòng nữa. 100 = mặc định.
      lineSpread: s.lineSpread || 100
    };
  }
  function loadSettings() {
    try {
      return normalizeSettings(JSON.parse(localStorage.getItem(LS_KEY) || "{}"));
    } catch (e) {
      return normalizeSettings({});
    }
  }
  // Đồng bộ với Cloudflare KV (nếu đã cấu hình KV_WORKER_URL): tải cấu hình
  // dùng chung từ server ngay khi mở trang, ghi đè lên bản localStorage nếu
  // có dữ liệu mới hơn trên server. Không có mạng / chưa cấu hình -> im lặng
  // bỏ qua, dùng luôn bản localStorage đã tải trước đó (không chặn giao diện).
  function fetchSettingsFromKV() {
    if (!KV_WORKER_URL) return;
    fetch(KV_WORKER_URL.replace(/\/$/, "") + "/settings")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || Object.keys(data).length === 0) return;
        settings = normalizeSettings(data);
        localStorage.setItem(LS_KEY, JSON.stringify(settings));
        applyTransformSettings();
        syncFieldsUIFromSettings();
        setStatus("Đã tải cấu hình canh chỉnh dùng chung từ máy chủ.", "ok");
      })
      .catch(function () { /* offline hoặc chưa cấu hình đúng -> bỏ qua êm */ });
  }
  function pushSettingsToKV(onDone) {
    if (!KV_WORKER_URL) { onDone && onDone(null); return; }
    fetch(KV_WORKER_URL.replace(/\/$/, "") + "/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings)
    })
      .then(function (r) { onDone && onDone(r.ok); })
      .catch(function () { onDone && onDone(false); });
  }
  function saveSettings() {
    localStorage.setItem(LS_KEY, JSON.stringify(settings));
    var btn = document.getElementById("ctSaveBtn");
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

  // Kéo thanh trượt "Cho phép kéo dãn dòng" -> nhân đồng loạt khoảng cách
  // (margin-bottom) của MỌI dòng trong khối nội dung chính theo % đã chọn,
  // dựa trên khoảng cách gốc lưu ở data-basegap của từng dòng.
  function applyLineSpread() {
    var spread = settings.lineSpread || 100;
    var rows = document.querySelectorAll("#ctContentLayer .l-row");
    for (var i = 0; i < rows.length; i++) {
      var base = parseFloat(rows[i].getAttribute("data-basegap")) || 0;
      rows[i].style.marginBottom = (base * spread / 100).toFixed(2) + "mm";
    }
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
      sheet.classList.toggle("ct-editoff", !settings.editMode);
    }
    applyLineSpread();
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
        if (!settings.editMode) return;
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
        if (!settings.editMode) return;
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
      settings.lineSpread = 100;
      renderSheet();
      syncFieldsUIFromSettings();
      setStatus("Đã đưa 5 khối và khoảng cách dòng về mặc định (chưa lưu).", "ok");
    });
    document.getElementById("ctSaveBtn").addEventListener("click", saveSettings);
    document.getElementById("ctPrintBtn").addEventListener("click", function () {
      window.print();
    });
    document.getElementById("ctEditModeToggle").addEventListener("change", function (e) {
      settings.editMode = e.target.checked;
      applyTransformSettings();
    });
    document.getElementById("ctLineSpread").addEventListener("input", function (e) {
      settings.lineSpread = parseInt(e.target.value, 10) || 100;
      applyLineSpread();
    });
    document.getElementById("ctConfigBtn").addEventListener("click", function () {
      document.getElementById("ctEditModeToggle").checked = settings.editMode;
      document.getElementById("ctConfigOverlay").classList.add("open");
    });
    document.getElementById("ctConfigClose").addEventListener("click", function () {
      document.getElementById("ctConfigOverlay").classList.remove("open");
    });
    document.getElementById("ctConfigOverlay").addEventListener("click", function (e) {
      if (e.target.id === "ctConfigOverlay") e.currentTarget.classList.remove("open");
    });

    syncFieldsUIFromSettings();
  }
  function syncFieldsUIFromSettings() {
    var elScale = document.getElementById("ctScale");
    var elShiftY = document.getElementById("ctShiftY");
    var elCalX = document.getElementById("ctCalX");
    var elCalY = document.getElementById("ctCalY");
    var elEditMode = document.getElementById("ctEditModeToggle");
    var elLineSpread = document.getElementById("ctLineSpread");
    if (elScale) elScale.value = settings.scale;
    if (elShiftY) elShiftY.value = settings.shiftY;
    if (elCalX) elCalX.value = settings.calX;
    if (elCalY) elCalY.value = settings.calY;
    if (elEditMode) elEditMode.checked = settings.editMode;
    if (elLineSpread) elLineSpread.value = settings.lineSpread;
  }

  /* ---------------------------------------------------------------- */
  /* 8. Khởi động                                                       */
  /* ---------------------------------------------------------------- */
  buildFieldsUI();
  bindUI();
  renderSheet();
  fetchSettingsFromKV();
})();
