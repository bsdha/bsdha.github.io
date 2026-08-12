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
  /* 1. CSS                                                            */
  /* ---------------------------------------------------------------- */
  var style = document.createElement("style");
  style.textContent = [
    "#ctWrap{max-width:1400px;margin:0 auto;padding:16px;font-family:inherit;color:var(--text,#222);}",
    "#ctWrap h1{font-size:20px;margin:0 0 4px;}",
    "#ctWrap .ct-sub{color:var(--muted,#777);font-size:13px;margin:0 0 16px;}",
    ".ct-grid{display:grid;grid-template-columns:340px 1fr;gap:18px;align-items:start;}",
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
    "#ctSheet{width:210mm;min-height:297mm;background:#fff;position:relative;overflow:hidden;font-family:'Times New Roman',Times,serif;color:#000;}",
    "#ctContentLayer{position:relative;padding:14mm 14mm 10mm;box-sizing:border-box;transform-origin:top center;}",
    "#ctContentLayer .l-header{font-size:12.5pt;line-height:1.35;}",
    "#ctContentLayer .l-hcol{display:flex;justify-content:space-between;}",
    "#ctContentLayer .l-hleft{width:46%;}",
    "#ctContentLayer .l-hright{width:50%;text-align:center;}",
    "#ctContentLayer .l-hright b{display:block;}",
    "#ctContentLayer .l-title{text-align:center;font-weight:bold;font-size:15pt;margin:8pt 0 10pt;}",
    "#ctContentLayer .l-kinhgui{text-align:center;font-size:13pt;margin-bottom:6pt;}",
    "#ctContentLayer p{margin:3pt 0;font-size:12.2pt;line-height:1.42;}",
    "#ctContentLayer .l-section{font-weight:bold;text-align:center;margin:8pt 0 4pt;}",
    "#ctContentLayer .fill{border-bottom:1px solid #000;padding:0 2px;font-weight:600;}",
    "#ctContentLayer .chk{display:inline-block;width:11px;height:11px;border:1px solid #000;text-align:center;line-height:10px;font-size:9px;margin:0 3px;}",
    "#ctSigBlock{position:absolute;text-align:center;font-size:12.2pt;line-height:1.4;cursor:grab;padding:4px 10px;border-radius:6px;user-select:none;}",
    "#ctSigBlock:active{cursor:grabbing;}",
    "#ctSigBlock.dragging{outline:2px dashed #0066FF;background:rgba(0,102,255,.06);}",
    "#ctSigBlock .l-date{font-style:italic;}",
    "#ctSigBlock .l-role{font-weight:bold;}",
    "#ctSigBlock .l-note{font-style:italic;}",
    ".ct-stampguide{position:absolute;border:1.5px dashed #ff5050;border-radius:50%;pointer-events:none;opacity:.55;display:none;}",
    "@media print{",
    "  body *{visibility:hidden !important;}",
    "  #ctSheet, #ctSheet *{visibility:visible !important;}",
    "  #ctSheet{position:fixed !important;left:0;top:0;box-shadow:none !important;}",
    "  .ct-stampguide{display:none !important;}",
    "  @page{size:A4;margin:0;}",
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
          '<div class="ct-hint">Kéo trực tiếp bằng chuột vào khối "Ngày…/ĐẠI DIỆN CSKCB/Ký tên, đóng dấu" trên bản xem trước bên phải để rê tới đúng vị trí con dấu đã đóng.</div>' +
          '<div class="ct-tools">' +
            '<button class="ct-btn small secondary" id="ctToggleGuide">🎯 Hiện/ẩn vòng canh dấu</button>' +
            '<button class="ct-btn small secondary" id="ctResetSig">↺ Reset vị trí chữ ký</button>' +
          '</div>' +

          '<h3>④ Bù trừ lệch máy in</h3>' +
          '<div class="ct-hint">Nếu bản in bị lệch đều theo 1 hướng so với bản xem trước (do máy in/khay giấy), chỉnh 2 số dưới rồi in lại — hệ thống sẽ nhớ cho lần sau.</div>' +
          '<div class="ct-row2">' +
            '<div class="ct-field"><label>Lệch ngang (mm)</label><input type="number" id="ctCalX" value="0" step="0.5"></div>' +
            '<div class="ct-field"><label>Lệch dọc (mm)</label><input type="number" id="ctCalY" value="0" step="0.5"></div>' +
          '</div>' +

          '<button class="ct-btn" id="ctPrintBtn">🖨️ In / Tải PDF</button>' +
          '<button class="ct-btn secondary" id="ctSaveBtn">💾 Lưu vị trí đã canh</button>' +
        '</div>' +

        '<div class="ct-stage"><div class="ct-sheet-outer"><div id="ctSheet"></div></div></div>' +
      '</div>' +
    '</div>';

  /* ---------------------------------------------------------------- */
  /* 3. Danh sách field + label hiển thị                               */
  /* ---------------------------------------------------------------- */
  var FIELD_DEFS = [
    ["soHoSo", "Số hồ sơ / số phiếu", "text"],
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
    ["lyDo", "Lý do chuyển (1a / 1b / 2)", "select:1a - Phù hợp quy định chuyển cấp CMKT,1b - Không phù hợp khả năng đáp ứng,2 - Theo yêu cầu người bệnh"],
    ["huongDieuTri", "Hướng điều trị", "text"],
    ["chuyenHoi", "Chuyển cơ sở KCB hồi (giờ, ngày tháng năm)", "text"],
    ["coGiaTri1Nam", "Có giá trị trong 01 năm", "select:Có,Không"],
    ["phuongTien", "Phương tiện vận chuyển", "text"],
    ["nguoiHoTong", "Người hộ tống (nếu có)", "text"],
    ["ngayKy", "Ngày ký phiếu (ngày tháng năm)", "text"],
    ["nguoiKy", "Chức danh người ký", "text"]
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
    d.nguoiKy = grab(text, /(ĐẠI DIỆN[^\n]+)/i) || "ĐẠI DIỆN CSKCB";

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
  /* 5. Render tờ phiếu (mẫu chuẩn) + đổ dữ liệu                       */
  /* ---------------------------------------------------------------- */
  function esc(s) { return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function fillOr(s, placeholder) {
    return s ? '<span class="fill">' + esc(s) + '</span>' : '<span class="fill">' + esc(placeholder || "……………………") + '</span>';
  }
  function box(checked) { return '<span class="chk">' + (checked ? "X" : "") + '</span>'; }

  function renderSheet() {
    var d = DATA;
    var lyDo = d.lyDo || "";
    var is1a = lyDo.indexOf("1a") === 0;
    var is1b = lyDo.indexOf("1b") === 0;
    var is2 = lyDo.indexOf("2") === 0;

    var html = '';
    html += '<div class="l-header l-hcol">' +
              '<div class="l-hleft"><b>SỞ Y TẾ TP HỒ CHÍ MINH</b><br>' + fillOr(d.coSoGioiThieu, "TÊN CƠ SỞ KCB") + '<br>Số: ' + fillOr(d.soHoSo, "…………………") + '</div>' +
              '<div class="l-hright"><b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</b>Độc lập - Tự do - Hạnh phúc</div>' +
            '</div>';
    html += '<div class="l-title">PHIẾU CHUYỂN CƠ SỞ KHÁM BỆNH,<br>CHỮA BỆNH BẢO HIỂM Y TẾ</div>';
    html += '<div class="l-kinhgui">Kính gửi: <b>' + fillOr(d.kinhGui, "…………………………………") + '</b></div>';
    html += '<p>' + fillOr(d.coSoGioiThieu, "Cơ sở KCB") + ' trân trọng giới thiệu:</p>';
    html += '<p>- Họ và tên người bệnh: ' + fillOr(d.hoTen) + '&nbsp;&nbsp;Giới tính: ' + fillOr(d.gioiTinh) + '&nbsp;&nbsp;Năm sinh: ' + fillOr(d.namSinh) + '</p>';
    html += '<p>- Địa chỉ: ' + fillOr(d.diaChi) + '</p>';
    html += '<p>- Dân tộc: ' + fillOr(d.danToc) + '&nbsp;&nbsp;Quốc tịch: ' + fillOr(d.quocTich) + '</p>';
    html += '<p>- Nghề nghiệp: ' + fillOr(d.ngheNghiep) + '&nbsp;&nbsp;Nơi làm việc: ' + fillOr(d.noiLamViec) + '</p>';
    html += '<p>- Số thẻ bảo hiểm y tế: ' + fillOr(d.soThe) + '</p>';
    html += '<p>- Thời hạn sử dụng của thẻ BHYT đến ngày: ' + fillOr(d.hanThe) + '</p>';
    html += '<p>- Đã được khám bệnh, điều trị:</p>';
    html += '<p>&nbsp;&nbsp;+ Tại: ' + fillOr(d.dieuTri1) + '</p>';
    if (d.dieuTri2) html += '<p>&nbsp;&nbsp;+ Tại: ' + fillOr(d.dieuTri2) + '</p>';
    html += '<div class="l-section">TÓM TẮT BỆNH ÁN</div>';
    html += '<p>- Tóm tắt dấu hiệu lâm sàng: ' + fillOr(d.tomTatLamSang) + '</p>';
    html += '<p>- Tóm tắt kết quả xét nghiệm, CLS chính có giá trị chẩn đoán, theo dõi điều trị: ' + fillOr(d.tomTatCLS) + '</p>';
    html += '<p>- Chẩn đoán (ICD-10): ' + fillOr(d.chanDoan) + '</p>';
    if (d.phuongPhapThuThuat) html += '<p>- Phương pháp, thủ thuật đã thực hiện: ' + fillOr(d.phuongPhapThuThuat) + '</p>';
    html += '<p>- Kỹ thuật, thuốc điều trị chính đã sử dụng: ' + fillOr(d.kyThuatThuoc) + '</p>';
    html += '<p>- Tình trạng người bệnh lúc chuyển cơ sở KCB: ' + fillOr(d.tinhTrang) + '</p>';
    html += '<p>- Lý do chuyển cơ sở KCB:</p>';
    html += '<p>&nbsp;&nbsp;1. Đủ điều kiện chuyển cơ sở KCB: &nbsp;a) Phù hợp quy định chuyển cấp CMKT ' + box(is1a) + '&nbsp;&nbsp;b) Không phù hợp khả năng đáp ứng ' + box(is1b) + '</p>';
    html += '<p>&nbsp;&nbsp;2. Theo yêu cầu của người bệnh / người đại diện hợp pháp ' + box(is2) + '</p>';
    html += '<p>- Hướng điều trị: ' + fillOr(d.huongDieuTri) + '</p>';
    html += '<p>- Chuyển cơ sở KCB hồi: ' + fillOr(d.chuyenHoi) + '</p>';
    html += '<p>- Trường hợp chuyển có giá trị trong 01 năm: ' + fillOr(d.coGiaTri1Nam, "Có/Không") + '</p>';
    html += '<p>- Phương tiện vận chuyển: ' + fillOr(d.phuongTien) + '</p>';
    html += '<p>- Họ tên, chức danh người hộ tống (nếu có): ' + fillOr(d.nguoiHoTong, "(không có)") + '</p>';

    document.getElementById("ctContentLayer") || null;
    var sheet = document.getElementById("ctSheet");
    sheet.innerHTML = '<div id="ctContentLayer">' + html + '</div>' +
      '<div id="ctSigBlock">' +
        '<div class="l-date">Ngày ' + fillOr(d.ngayKy, "…… tháng …… năm ……") + '</div>' +
        '<div class="l-role">' + esc(d.nguoiKy || "ĐẠI DIỆN CSKCB") + '</div>' +
        '<div class="l-note">(Ký tên, đóng dấu)</div>' +
      '</div>' +
      '<div class="ct-stampguide" id="ctStampGuide"></div>';

    applyTransformSettings();
    initDrag();
  }

  /* ---------------------------------------------------------------- */
  /* 6. Tinh chỉnh: scale/shift nội dung + kéo-thả khối chữ ký          */
  /* ---------------------------------------------------------------- */
  var settings = loadSettings();

  function loadSettings() {
    try {
      var s = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
      return {
        scale: s.scale || 100,
        shiftY: s.shiftY || 0,
        sigLeft: (s.sigLeft != null) ? s.sigLeft : 118, // mm từ trái
        sigTop: (s.sigTop != null) ? s.sigTop : 250,    // mm từ trên
        calX: s.calX || 0,
        calY: s.calY || 0
      };
    } catch (e) {
      return { scale: 100, shiftY: 0, sigLeft: 118, sigTop: 250, calX: 0, calY: 0 };
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
    var sig = document.getElementById("ctSigBlock");
    if (sig) {
      sig.style.left = settings.sigLeft + "mm";
      sig.style.top = settings.sigTop + "mm";
    }
    var sheet = document.getElementById("ctSheet");
    if (sheet) {
      sheet.style.transform = "translate(" + settings.calX + "mm," + settings.calY + "mm)";
    }
    var guide = document.getElementById("ctStampGuide");
    if (guide) {
      guide.style.left = (settings.sigLeft - 8) + "mm";
      guide.style.top = (settings.sigTop - 14) + "mm";
      guide.style.width = "34mm";
      guide.style.height = "34mm";
    }
  }

  function initDrag() {
    var sig = document.getElementById("ctSigBlock");
    var sheet = document.getElementById("ctSheet");
    if (!sig || !sheet) return;
    var dragging = false, startX, startY, startLeft, startTop;

    function pos(e) { return e.touches ? e.touches[0] : e; }

    sig.addEventListener("mousedown", down);
    sig.addEventListener("touchstart", down, { passive: true });

    function down(e) {
      dragging = true;
      sig.classList.add("dragging");
      var p = pos(e);
      startX = p.clientX; startY = p.clientY;
      startLeft = settings.sigLeft; startTop = settings.sigTop;
      document.addEventListener("mousemove", move);
      document.addEventListener("touchmove", move, { passive: true });
      document.addEventListener("mouseup", up);
      document.addEventListener("touchend", up);
    }
    function move(e) {
      if (!dragging) return;
      var p = pos(e);
      var pxPerMm = sheet.getBoundingClientRect().width / 210;
      var dxMm = (p.clientX - startX) / pxPerMm;
      var dyMm = (p.clientY - startY) / pxPerMm;
      settings.sigLeft = Math.round((startLeft + dxMm) * 10) / 10;
      settings.sigTop = Math.round((startTop + dyMm) * 10) / 10;
      applyTransformSettings();
    }
    function up() {
      dragging = false;
      sig.classList.remove("dragging");
      document.removeEventListener("mousemove", move);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("mouseup", up);
      document.removeEventListener("touchend", up);
    }
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
      settings.sigLeft = 118; settings.sigTop = 250; applyTransformSettings();
    });
    document.getElementById("ctSaveBtn").addEventListener("click", saveSettings);
    document.getElementById("ctPrintBtn").addEventListener("click", function () {
      saveSettings();
      window.print();
    });

    document.getElementById("ctScale").value = settings.scale;
    document.getElementById("ctShiftY").value = settings.shiftY;
    document.getElementById("ctCalX").value = settings.calX;
    document.getElementById("ctCalY").value = settings.calY;
  }

  /* ---------------------------------------------------------------- */
  /* 8. Khởi động                                                       */
  /* ---------------------------------------------------------------- */
  buildFieldsUI();
  bindUI();
  renderSheet();
})();
