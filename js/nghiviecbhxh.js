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

  var ROOT_ID = "nvContent";
  var LS_KEY = "nv_nghiviecbhxh_settings_v1";
  var MAMMOTH_URL = "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js";
  // Dán URL Worker Cloudflare (nếu muốn đồng bộ vị trí canh in giữa các máy).
  // Để trống ("") thì chỉ lưu trên máy (localStorage).
  var KV_WORKER_URL = "";

  var root = document.getElementById(ROOT_ID);
  if (!root) return;

  /* ---------------------------------------------------------------- */
  /* 0. Kích thước trang A4 (mm) - mỗi bản chiếm đúng NỬA chiều cao     */
  /* ---------------------------------------------------------------- */
  var PAGE_W_MM = 210, PAGE_H_MM = 297;
  var HALF_H_MM = PAGE_H_MM / 2; // 148.5mm mỗi bản

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
    /* -------- vùng xem trước / bản in -------- */
    ".nv-stage{background:#5a5f66;border-radius:12px;padding:22px;display:flex;justify-content:center;overflow:auto;}",
    ".nv-sheet-outer{background:#fff;box-shadow:0 6px 24px rgba(0,0,0,.35);position:relative;}",
    "#nvSheet{width:" + PAGE_W_MM + "mm;height:" + PAGE_H_MM + "mm;background:#fff;position:relative;overflow:hidden;font-family:'Times New Roman',Times,serif;color:#000;}",
    ".nv-half{position:absolute;left:0;width:100%;height:" + HALF_H_MM + "mm;box-sizing:border-box;overflow:hidden;}",
    ".nv-half.top{top:0;}",
    ".nv-half.bottom{top:" + HALF_H_MM + "mm;}",
    ".nv-cutline{position:absolute;left:0;top:" + HALF_H_MM + "mm;width:100%;border-top:1px dashed #999;height:0;z-index:3;}",
    ".nv-cutline .scissors{position:absolute;left:2mm;top:-3mm;font-size:9px;color:#999;background:#fff;padding:0 2px;}",
    ".nv-body{position:relative;width:100%;height:100%;transform-origin:top left;box-sizing:border-box;padding:6mm 12mm 4mm;line-height:1.34;}",
    ".nv-body .l-row{position:relative;white-space:normal;box-sizing:border-box;margin-bottom:1.2mm;}",
    ".nv-hd{display:flex;justify-content:space-between;align-items:flex-start;}",
    ".nv-hd-left{font-weight:bold;text-transform:uppercase;font-size:11.5px;max-width:60%;line-height:1.3;}",
    ".nv-hd-right{text-align:right;font-size:11px;}",
    ".nv-title{text-align:center;font-weight:bold;font-size:14px;margin:3mm 0 0;text-transform:uppercase;}",
    ".nv-title2{text-align:center;font-weight:bold;font-size:13px;text-transform:uppercase;}",
    ".nv-sub{text-align:center;font-style:italic;font-size:11px;margin-bottom:2mm;}",
    ".nv-section{font-weight:bold;font-size:12px;margin-top:2mm;}",
    ".fill{padding:0 1px;font-weight:400;white-space:pre-wrap;word-break:break-word;}",
    ".fill.empty{color:#000;}",
    ".l-flexrow{display:flex;align-items:baseline;flex-wrap:wrap;}",
    ".fill-line{flex:1 1 auto;min-width:14px;align-self:stretch;border-bottom:1px dotted #000;margin:0 2px 1px;}",
    ".nv-footer{display:flex;justify-content:space-between;margin-top:3mm;text-align:center;font-size:11.5px;}",
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
    "  html.nv-printing .nv-cutline{border-top:none !important;}",
    "  html.nv-printing .nv-cutline .scissors{display:none !important;}",
    "}"
  ].join("\n");
  document.head.appendChild(style);

  /* ---------------------------------------------------------------- */
  /* 2. HTML khung                                                     */
  /* ---------------------------------------------------------------- */
  root.innerHTML =
    '<div id="nvWrap">' +
      '<h1>📝 Giấy chứng nhận nghỉ việc hưởng BHXH</h1>' +
      '<p class="nv-sub">Tải file gốc (.rtf/.docx) → tự nhận diện thông tin → đổ vào mẫu chuẩn → in 2 bản giống hệt nhau trên cùng 1 tờ A4 (cắt đôi thành 2 liên).</p>' +
      '<div class="nv-grid">' +

        '<div class="nv-panel">' +
          '<h3>① Tải file gốc</h3>' +
          '<div class="nv-drop" id="nvDrop">📄 Bấm để chọn file <b>.rtf</b> hoặc <b>.docx</b><br><span class="nv-hint">(file xuất từ phần mềm HIS bệnh viện)</span></div>' +
          '<input type="file" id="nvFileInput" accept=".rtf,.docx" hidden>' +
          '<div class="nv-filerow" id="nvFileRow" style="display:none;"><span id="nvFileName"></span><button id="nvFileRemove" title="Bỏ chọn">✕</button></div>' +
          '<div class="nv-status" id="nvStatus"></div>' +

          '<h3>② Thông tin đã nhận diện <span style="font-weight:400;color:var(--muted,#888);">(sửa nếu cần)</span></h3>' +
          '<div id="nvFields"></div>' +

          '<h3>③ Tinh chỉnh khi in</h3>' +
          '<div class="nv-field"><label>Cỡ nội dung (%)</label>' +
            '<input type="range" id="nvScale" min="80" max="115" value="100"></div>' +
          '<div class="nv-field"><label>Đẩy nội dung lên / xuống trong mỗi nửa (mm)</label>' +
            '<input type="range" id="nvShiftY" min="-15" max="15" value="0"></div>' +
          '<div class="nv-switchrow">' +
            '<label class="nv-switch"><input type="checkbox" id="nvShowCut" checked><span class="nv-slider"></span></label>' +
            '<span>✂️ Hiện đường kẻ cắt đôi (chỉ xem trước, không in)</span>' +
          '</div>' +

          '<h3>④ Bù trừ lệch máy in</h3>' +
          '<div class="nv-hint">Nếu bản in bị lệch đều theo 1 hướng so với xem trước, chỉnh 2 số dưới rồi in lại — hệ thống sẽ nhớ cho lần sau.</div>' +
          '<div class="nv-row2">' +
            '<div class="nv-field"><label>Lệch ngang (mm)</label><input type="number" id="nvCalX" value="0" step="0.5"></div>' +
            '<div class="nv-field"><label>Lệch dọc (mm)</label><input type="number" id="nvCalY" value="0" step="0.5"></div>' +
          '</div>' +

          '<h3>⑤ Xuất file</h3>' +
          '<button class="nv-btn save" id="nvSaveBtn">💾 Lưu tinh chỉnh</button>' +
          '<button class="nv-btn" id="nvPrintBtn">🖨️ Tải / In PDF (2 bản / A4)</button>' +
        '</div>' +

        '<div class="nv-stage"><div class="nv-sheet-outer"><div id="nvSheet"></div></div></div>' +
      '</div>' +
    '</div>';

  /* ---------------------------------------------------------------- */
  /* 3. Danh sách field + label hiển thị                               */
  /* ---------------------------------------------------------------- */
  var FIELD_DEFS = [
    ["tenCoSo", "Tên cơ sở KCB (dòng đầu)", "text"],
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

  function parseFields(text) {
    var t = text.replace(/\s+/g, " ").trim();
    var d = {};

    d.mauSo = grab(/Mẫu số:?\s*([0-9]+)/i, t);
    d.soKCB = grab(/Số:?\s*([0-9]+\s*\/\s*KCB)/i, t).replace(/\s*\/\s*/, "/");
    d.soSeri = grab(/Số seri:?\s*([0-9]+)/i, t);

    // Tên cơ sở KCB: dòng in hoa ở đầu văn bản, trước "Mẫu số"
    var hd = /^(.*?)Mẫu số/i.exec(t);
    if (hd) d.tenCoSo = hd[1].replace(/[-–]\s*$/, "").trim();

    d.hoTen = grab(/Họ và tên:?\s*([A-ZÀ-Ỹ\s]+?)\s+Ngày sinh/i, t);
    d.ngaySinh = grab(/Ngày sinh:?\s*([0-9\/]+)/i, t);
    d.gioiTinh = /Giới tính:?\s*N[Ữữ]/i.test(t) ? "Nữ" : (/Giới tính:?\s*Nam/i.test(t) ? "Nam" : "");
    d.maBHXH = grab(/Mã số BHXH\/Số thẻ BHYT:?\s*([0-9A-Za-z\/]+)/i, t);
    d.cccd = grab(/(?:Số CCCD\/CMND\/[^:]*):?\s*([0-9]{6,15})/i, t);
    d.ngayCapCCCD = grab(/Ngày cấp:?\s*([0-9\/]+)/i, t);
    d.donViLamViec = grab(/Đơn vị làm việc:?\s*(.+?)\s+(?:Ngày khám|II\.)/i, t);
    d.ngayKham = grab(/Ngày khám bệnh, chữa bệnh:?\s*(ngày[^;.]+?năm\s*[0-9]{4})/i, t);
    d.chanDoan = grab(/phương pháp điều trị\s*(.+?)\s*Số ngày nghỉ/i, t);
    d.soNgayNghi = grab(/Số ngày nghỉ:?\s*([0-9]+)/i, t);
    d.tuNgay = grab(/Từ ngày\s*([0-9\/]+)/i, t);
    d.denNgay = grab(/đến hết ngày\s*([0-9\/]+)/i, t);
    d.tenCha = grab(/Họ và tên cha:?\s*([^\-–]*?)(?:-|Họ và tên mẹ|$)/i, t);
    d.tenMe = grab(/Họ và tên mẹ:?\s*([^\-–]*?)(?:-|Đại diện|Ngày|$)/i, t);

    var ngayKy = /Ngày\s*([0-9]{1,2})\s*tháng\s*([0-9]{1,2})\s*năm\s*([0-9]{4})/i.exec(t);
    if (ngayKy) { d.ngayKyNgay = ngayKy[1]; d.ngayKyThang = ngayKy[2]; d.ngayKyNam = ngayKy[3]; }

    // Tên người ký thường xuất hiện lặp lại ngay sau cụm "(Ký, ghi rõ họ tên,)"
    var ky = /\(Ký,?\s*ghi rõ họ tên,?\)\s*([A-ZÀ-Ỹ][A-ZÀ-Ỹ\s]{4,40})/i.exec(t);
    if (ky) d.nguoiHanhNghe = ky[1].trim();

    Object.keys(d).forEach(function (k) { if (d[k]) DATA[k] = d[k]; });
  }

  /* ---------------------------------------------------------------- */
  /* 5. Đọc file .docx (mammoth) hoặc .rtf (giải mã đơn giản)          */
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
    if (ext === "docx") {
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
      setStatus("Chỉ hỗ trợ file .rtf hoặc .docx.", "err");
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
  var settings = { scale: 100, shiftY: 0, calX: 0, calY: 0, showCut: true };

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
    fetch(KV_WORKER_URL + "/get")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data) { settings = Object.assign(settings, data); applyTransformSettings(); syncFieldsUIFromSettings(); }
      })
      .catch(function () {});
  }
  function pushSettingsToKV() {
    if (!KV_WORKER_URL) return;
    fetch(KV_WORKER_URL + "/set", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings)
    }).catch(function () {});
  }
  function saveSettings() {
    saveSettingsLocal();
    pushSettingsToKV();
    var btn = document.getElementById("nvSaveBtn");
    btn.classList.add("saved");
    setTimeout(function () { btn.classList.remove("saved"); }, 500);
    setStatus("Đã lưu tinh chỉnh.", "ok");
  }
  function syncFieldsUIFromSettings() {
    document.getElementById("nvScale").value = settings.scale;
    document.getElementById("nvShiftY").value = settings.shiftY;
    document.getElementById("nvCalX").value = settings.calX;
    document.getElementById("nvCalY").value = settings.calY;
    document.getElementById("nvShowCut").checked = settings.showCut !== false;
  }
  function applyTransformSettings() {
    var scale = (settings.scale || 100) / 100;
    var shiftY = settings.shiftY || 0;
    document.querySelectorAll(".nv-body").forEach(function (b) {
      b.style.transform = "translate(" + (settings.calX || 0) + "mm," + ((settings.calY || 0) + shiftY) + "mm) scale(" + scale + ")";
    });
    var cut = document.getElementById("nvCutLine");
    if (cut) cut.style.display = settings.showCut === false ? "none" : "block";
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
              '<div class="nv-hd-left">' + esc(d.tenCoSo || "BỆNH VIỆN / TRUNG TÂM Y TẾ …") + '</div>' +
              '<div class="nv-hd-right">Mẫu số: ' + fillOrLine(d.mauSo || "07", 10) + '<br>' +
                'Số: ' + fillOrLine(d.soKCB, 20) + '/KCB<br>' +
                'Số seri: ' + fillOrLine(d.soSeri, 25) +
              '</div>' +
            '</div>';
    html += '<div class="nv-title">Giấy chứng nhận</div>';
    html += '<div class="nv-title2">nghỉ việc hưởng bảo hiểm xã hội</div>';
    html += '<div class="nv-sub">(Chỉ áp dụng cho điều trị ngoại trú)</div>';

    html += '<div class="nv-section">I. Thông tin người bệnh</div>';
    html += '<div class="l-row l-flexrow">Họ và tên: ' + fillOrLine(d.hoTen, 55) +
            '&nbsp;&nbsp;Ngày sinh: ' + fillOrLine(d.ngaySinh, 22) + '</div>';
    html += '<div class="l-row l-flexrow">Mã số BHXH/Số thẻ BHYT: ' + fillOrLine(d.maBHXH, 50) + '</div>';
    html += '<div class="l-row l-flexrow">Số CCCD/CMND/Định danh công dân/Hộ chiếu: ' + fillOrLine(d.cccd, 32) +
            '&nbsp;&nbsp;Ngày cấp: ' + fillOrLine(d.ngayCapCCCD, 20) + '</div>';
    html += '<div class="l-row l-flexrow">Giới tính: ' + fillOrLine((d.gioiTinh || "").toUpperCase(), 14) + '</div>';
    html += '<div class="l-row l-flexrow">Đơn vị làm việc: ' + fillOrLine(d.donViLamViec, 70) + '</div>';
    html += '<div class="l-row l-flexrow">Ngày khám bệnh, chữa bệnh: ' + fillOrLine(d.ngayKham, 45) + '</div>';

    html += '<div class="nv-section">II. Chẩn đoán và phương pháp điều trị</div>';
    html += '<div class="l-row">' + fillOrLine(d.chanDoan, 150) + '</div>';
    html += '<div class="l-row l-flexrow">Số ngày nghỉ: ' + fillOrLine(d.soNgayNghi, 8) + ' (ngày)</div>';
    html += '<div class="l-row l-flexrow">(Từ ngày ' + fillOrLine(d.tuNgay, 20) +
            ' đến hết ngày ' + fillOrLine(d.denNgay, 20) + ')</div>';

    html += '<div class="nv-section">III. Thông tin cha, mẹ <span style="font-weight:400;font-style:italic;font-size:10.5px;">(chỉ áp dụng đối với trường hợp người bệnh là trẻ em dưới 07 tuổi)</span></div>';
    html += '<div class="l-row l-flexrow">- Họ và tên cha: ' + fillOrLine(d.tenCha, 60) + '</div>';
    html += '<div class="l-row l-flexrow">- Họ và tên mẹ: ' + fillOrLine(d.tenMe, 60) + '</div>';

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
                '<div class="fill">' + esc(d.nguoiHanhNghe || "") + '</div>' +
              '</div>' +
            '</div>';
    return html;
  }

  function renderSheet() {
    var sheet = document.getElementById("nvSheet");
    var copyHtml = renderOneCopy();
    sheet.innerHTML =
      '<div class="nv-half top"><div class="nv-body">' + copyHtml + '</div></div>' +
      '<div class="nv-cutline" id="nvCutLine"><span class="scissors">✂ cắt tại đây</span></div>' +
      '<div class="nv-half bottom"><div class="nv-body">' + copyHtml + '</div></div>';
    applyTransformSettings();
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
    document.getElementById("nvShowCut").addEventListener("change", function (e) {
      settings.showCut = e.target.checked; applyTransformSettings();
    });
    document.getElementById("nvCalX").addEventListener("input", function (e) {
      settings.calX = parseFloat(e.target.value) || 0; applyTransformSettings();
    });
    document.getElementById("nvCalY").addEventListener("input", function (e) {
      settings.calY = parseFloat(e.target.value) || 0; applyTransformSettings();
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
