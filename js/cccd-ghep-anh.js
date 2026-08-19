/* =====================================================================
   js/cccd-ghep-anh.js
   Tính năng: GHÉP ẢNH CCCD ĐỂ IN

   - Mỗi hàng = 1 người, gồm 2 khung (mặt trước / mặt sau CCCD), đúng kích
     thước thật (85.6 x 54mm) để in ra cắt là vừa khít.
   - Kéo-thả hoặc bấm chọn ảnh cho từng khung.
   - Tự động cắt bớt viền dư quanh mép ảnh (nền bàn, nền giấy...) dựa vào
     màu nền lấy mẫu ở 4 góc ảnh.
   - Chỉnh tay: xoay 90°, xoay nhẹ để ngay ngắn, phóng to/thu nhỏ, kéo để
     dịch ảnh trong khung — vì auto-trim không thể hoàn hảo 100% với ảnh
     chụp thủ công.
   - Thêm/xóa hàng (thêm người). In ra khổ A4 thật, ẩn toolbar khi in.
   - Có nạp thêm OpenCV.js (tải từ CDN, không bắt buộc): khi tải xong, ảnh
     sẽ được tự động XOAY THẲNG (deskew) theo đúng góc nghiêng của tấm thẻ
     rồi cắt sát viền, chính xác hơn nhiều so với cách cắt viền đơn giản
     trước đó. Nếu OpenCV.js chưa tải xong hoặc lỗi mạng, tự động dùng lại
     cách cắt viền cũ (autoTrim) để không chặn người dùng.
   Không cần sửa index.html — file này tự render vào #cccdGhepAnhContent.
   ===================================================================== */
(function () {
  "use strict";

  var ROOT_ID = "cccdGhepAnhContent";
  var root = document.getElementById(ROOT_ID);
  if (!root) return;

  var CARD_W_MM = 85.6;
  var CARD_H_MM = 54;

  /* ---------------------------------------------------------------- */
  /* 0. Nạp OpenCV.js + Tesseract.js không đồng bộ, có % tiến trình,   */
  /*    khóa (mờ) thao tác cho tới khi tải xong hoặc thất bại          */
  /* ---------------------------------------------------------------- */
  var cvReady = false, cvFailed = false, cvPercent = 0;
  var ocrReady = false, ocrFailed = false, ocrPercent = 0;
  var ocrWorker = null;
  var loadingBannerEl = null, loadingTextEl = null, loadingFillEl = null, loadingOverlayEl = null;

  function setLoadingUiRefs(banner, text, fill, overlay) {
    loadingBannerEl = banner; loadingTextEl = text; loadingFillEl = fill; loadingOverlayEl = overlay;
  }

  function updateLoadingUi() {
    var bothDone = (cvReady || cvFailed) && (ocrReady || ocrFailed);
    var pct = Math.round((cvPercent + ocrPercent) / 2);
    if (loadingFillEl) loadingFillEl.style.width = pct + "%";

    if (!bothDone) {
      if (loadingTextEl) loadingTextEl.textContent = "Đang tải công cụ hỗ trợ, vui lòng chờ trước khi sử dụng! (" + pct + "%)";
      if (loadingBannerEl) { loadingBannerEl.style.display = "flex"; loadingBannerEl.className = "cd-loading-banner"; }
      setToolbarDisabled(true);
      return;
    }

    // Đã xong (thành công hoặc thất bại 1 phần) -> mở khóa thao tác
    setToolbarDisabled(false);
    if (cvReady && ocrReady) {
      if (loadingTextEl) loadingTextEl.textContent = "Đã tải xong công cụ hỗ trợ, bạn có thể sử dụng!";
      if (loadingBannerEl) loadingBannerEl.className = "cd-loading-banner cd-loading-ok";
    } else {
      if (loadingTextEl) loadingTextEl.textContent = "Đã sẵn sàng — một phần công cụ hỗ trợ không tải được, dùng chế độ cơ bản.";
      if (loadingBannerEl) loadingBannerEl.className = "cd-loading-banner cd-loading-warn";
    }
    // Tự ẩn banner sau vài giây cho gọn giao diện
    setTimeout(function () {
      if (loadingBannerEl) loadingBannerEl.style.display = "none";
    }, 3500);
  }

  function setToolbarDisabled(disabled) {
    if (loadingOverlayEl) loadingOverlayEl.style.display = disabled ? "block" : "none";
    ["cdAddRow", "cdPrint", "cdClear"].forEach(function (id) {
      var el = root.querySelector("#" + id);
      if (el) el.disabled = disabled;
    });
  }

  (function loadOpenCV() {
    if (window.cv && window.cv.Mat) { cvReady = true; cvPercent = 100; updateLoadingUi(); return; }

    // Ưu tiên jsDelivr: CDN thương mại, có cache + CORS header đầy đủ, ổn
    // định hơn nhiều so với docs.opencv.org (server tài liệu OpenCV, hay bị
    // timeout/chặn ở mạng cơ quan vì không có CORS đáng tin). docs.opencv.org
    // chỉ giữ lại làm phương án dự phòng cuối cùng.
    var SOURCES = [
      "https://cdn.jsdelivr.net/npm/@techstark/opencv-js@4.10.0-release.1/dist/opencv.js",
      "https://docs.opencv.org/4.x/opencv.js"
    ];
    var idx = 0;

    function tryNext() {
      if (idx >= SOURCES.length) {
        cvFailed = true; cvPercent = 100; updateLoadingUi();
        return;
      }
      var src = SOURCES[idx++];
      cvPercent = 15; updateLoadingUi();
      var s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = function () {
        cvPercent = 55; updateLoadingUi();
        function waitReady(tries) {
          if (window.cv && window.cv.Mat) { cvReady = true; cvPercent = 100; updateLoadingUi(); return; }
          if (tries <= 0) { s.remove(); tryNext(); return; } // load xong nhưng không init được -> thử nguồn kế
          cvPercent = Math.min(95, 55 + Math.round((50 - tries) / 50 * 40)); updateLoadingUi();
          setTimeout(function () { waitReady(tries - 1); }, 200);
        }
        if (window.cv) {
          window.cv["onRuntimeInitialized"] = function () { cvReady = true; cvPercent = 100; updateLoadingUi(); };
          waitReady(50); // ~10s chờ WASM init trước khi bỏ cuộc
        } else {
          tryNext();
        }
      };
      s.onerror = function () { s.remove(); tryNext(); };
      document.head.appendChild(s);
    }

    tryNext();
  })();

  /* ---------------------------------------------------------------- */
  /* 0b. Nạp Tesseract.js để NHẬN DIỆN CHIỀU CHỮ (OSD) và tự xoay đúng */
  /* ---------------------------------------------------------------- */
  (function loadTesseract() {
    function startWorker() {
      try {
        window.Tesseract.createWorker("osd", 1, {
          logger: function (m) {
            if (m && typeof m.progress === "number") {
              // Các bước tải model/ngôn ngữ chiếm phần lớn thời gian chờ
              ocrPercent = Math.max(ocrPercent, 40 + Math.round(m.progress * 55));
              updateLoadingUi();
            }
          }
        }).then(function (worker) {
          ocrWorker = worker; ocrReady = true; ocrPercent = 100; updateLoadingUi();
        }).catch(function () {
          ocrFailed = true; ocrPercent = 100; updateLoadingUi();
        });
      } catch (e) {
        ocrFailed = true; ocrPercent = 100; updateLoadingUi();
      }
    }

    if (window.Tesseract) { ocrPercent = 35; updateLoadingUi(); startWorker(); return; }
    ocrPercent = 5; updateLoadingUi();
    var s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    s.async = true;
    s.onload = function () {
      if (window.Tesseract) { ocrPercent = 35; updateLoadingUi(); startWorker(); }
      else { ocrFailed = true; ocrPercent = 100; updateLoadingUi(); }
    };
    s.onerror = function () { ocrFailed = true; ocrPercent = 100; updateLoadingUi(); };
    document.head.appendChild(s);
  })();

  // Xoay 1 dataURL đi bội số của 90 độ (0/90/180/270), trả về dataURL mới qua callback
  function rotateDataUrlBy90(dataUrl, degrees, callback) {
    var deg = ((Math.round(degrees / 90) * 90) % 360 + 360) % 360;
    if (deg === 0) { callback(dataUrl); return; }
    var im = new Image();
    im.onload = function () {
      var swap = (deg === 90 || deg === 270);
      var cw = swap ? im.naturalHeight : im.naturalWidth;
      var ch = swap ? im.naturalWidth : im.naturalHeight;
      var c = document.createElement("canvas");
      c.width = cw; c.height = ch;
      var ctx = c.getContext("2d");
      ctx.translate(cw / 2, ch / 2);
      ctx.rotate(deg * Math.PI / 180);
      ctx.drawImage(im, -im.naturalWidth / 2, -im.naturalHeight / 2);
      callback(c.toDataURL("image/jpeg", 0.95));
    };
    im.onerror = function () { callback(dataUrl); };
    im.src = dataUrl;
  }

  // Đọc thử chữ trên ảnh (OSD) để biết ảnh đang bị xoay 0/90/180/270 độ so
  // với chiều đọc đúng, rồi tự xoay lại cho đúng. Nếu Tesseract chưa sẵn
  // sàng / lỗi mạng / không đủ tin cậy -> giữ nguyên ảnh, không đoán bừa.
  function autoFixTextOrientation(dataUrl, callback) {
    if (!ocrReady || !ocrWorker) { callback(dataUrl); return; }
    var im = new Image();
    im.onload = function () {
      ocrWorker.detect(im).then(function (result) {
        var d = result && result.data;
        var deg = d ? d.orientation_degrees : 0;
        var conf = d ? d.orientation_confidence : 0;
        // Chỉ xoay khi đủ tin cậy, tránh xoay nhầm ảnh vốn đã đúng chiều
        if (!deg || conf < 1.5) { callback(dataUrl); return; }
        // Tesseract báo góc cần xoay ảnh THEO CHIỀU KIM ĐỒNG HỒ để về đúng chiều đọc
        rotateDataUrlBy90(dataUrl, deg, callback);
      }).catch(function () { callback(dataUrl); });
    };
    im.onerror = function () { callback(dataUrl); };
    im.src = dataUrl;
  }

  /* ---------------------------------------------------------------- */
  /* 1. CSS (tiền tố "cd-" để không đụng CSS các module khác)          */
  /* ---------------------------------------------------------------- */
  var style = document.createElement("style");
  style.textContent = [
    "#cdWrap{position:relative;max-width:900px;margin:0 auto;padding:16px;font-family:inherit;color:var(--text,#111);}",
    "#cdWrap h1{font-size:20px;margin:0 0 4px;}",
    "#cdWrap .cd-sub{color:var(--muted,#5a5a5a);font-size:13px;margin:0 0 14px;}",
    ".cd-toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:10px;background:var(--surface-2,#f2f2f2);border:1px solid var(--border,#e2e2e2);border-radius:10px;margin-bottom:12px;}",
    ".cd-toolbar button{cursor:pointer;border:1px solid var(--border,#ccc);background:var(--surface,#fff);color:var(--text,#111);border-radius:8px;padding:9px 13px;font-size:13.5px;font-weight:600;}",
    ".cd-toolbar button.primary{background:var(--blue,#1c6fd1);color:#fff;border-color:var(--blue,#1c6fd1);}",
    ".cd-toolbar button:hover{filter:brightness(0.97);}",
    ".cd-toolbar button:disabled{opacity:.45;cursor:not-allowed;filter:none;}",
    ".cd-loading-banner{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:13px;font-weight:600;padding:9px 12px;border-radius:8px;margin-bottom:12px;background:var(--blue-light,#e8f1fc);border:1px solid var(--blue-border,#b7d3f2);color:var(--text,#111);}",
    ".cd-loading-banner.cd-loading-ok{background:#e6f7f2;border-color:#a9e3d1;color:#127a5c;}",
    ".cd-loading-banner.cd-loading-warn{background:#fff6e5;border-color:#f0d79a;color:#8a5b00;}",
    ".cd-loading-track{flex:1 1 140px;min-width:120px;height:8px;border-radius:5px;background:rgba(0,0,0,.08);overflow:hidden;}",
    ".cd-loading-fill{height:100%;width:0%;background:var(--blue,#1c6fd1);border-radius:5px;transition:width .25s ease;}",
    ".cd-loading-banner.cd-loading-ok .cd-loading-fill{background:#1f9c8f;}",
    ".cd-loading-banner.cd-loading-warn .cd-loading-fill{background:#c98a00;}",
    ".cd-loading-overlay{display:none;position:absolute;inset:0;background:rgba(255,255,255,.6);z-index:40;cursor:not-allowed;}",
    ".cd-help{font-size:12.5px;color:var(--muted,#5a5a5a);margin:0 0 14px;line-height:1.55;background:var(--blue-light,#e8f1fc);border:1px solid var(--blue-border,#b7d3f2);padding:9px 12px;border-radius:8px;}",
    ".cd-sheet{background:#fff;box-shadow:0 0 8px rgba(0,0,0,.18);width:210mm;min-height:297mm;margin:0 auto;padding:10mm;box-sizing:border-box;border:1px solid var(--border,#e2e2e2);}",
    ".cd-row{display:flex;gap:6mm;align-items:flex-start;padding:3mm 0;border-bottom:1px dashed #999;position:relative;}",
    ".cd-row:last-child{border-bottom:none;}",
    ".cd-row-actions{position:absolute;right:-9mm;top:3mm;display:flex;flex-direction:column;gap:4px;}",
    ".cd-row-actions button{width:22px;height:22px;font-size:12px;line-height:1;border-radius:50%;border:1px solid var(--border,#ccc);background:#fff;cursor:pointer;}",
    ".cd-slot{width:" + CARD_W_MM + "mm;height:" + CARD_H_MM + "mm;border:2px dashed #aaa;border-radius:3mm;position:relative;overflow:hidden;background:#fafafa;flex-shrink:0;}",
    ".cd-slot.has-img{border-style:solid;border-color:#bbb;}",
    ".cd-slot .cd-placeholder{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;font-size:11px;color:#888;padding:4mm;cursor:pointer;}",
    ".cd-slot img{position:absolute;top:50%;left:50%;transform-origin:center center;user-select:none;-webkit-user-drag:none;pointer-events:none;max-width:none;}",
    ".cd-slot input[type=file]{display:none;}",
    ".cd-slot-controls{position:absolute;left:0;right:0;bottom:0;display:flex;gap:2px;background:rgba(255,255,255,.9);padding:2px;flex-wrap:wrap;font-size:10px;}",
    ".cd-slot-controls button{border:1px solid #ccc;background:#fff;border-radius:3px;padding:1px 4px;cursor:pointer;font-size:10px;}",
    ".cd-slot-controls input[type=range]{width:44px;vertical-align:middle;}",
    ".cd-slot-label{position:absolute;top:2px;left:2px;font-size:9px;background:rgba(0,0,0,.55);color:#fff;padding:1px 4px;border-radius:3px;}",
    "@media print{",
    "  body *{visibility:hidden;}",
    "  #cdSheet, #cdSheet *{visibility:visible;}",
    "  #cdSheet{position:absolute;left:0;top:0;box-shadow:none;border:none;margin:0;width:210mm;min-height:297mm;}",
    "  .cd-slot-controls, .cd-row-actions, .cd-slot .cd-placeholder, .cd-slot-label{display:none !important;}",
    "  .cd-slot{border-style:dashed;border-color:#999;}",
    "  @page{size:A4;margin:0;}",
    "}"
  ].join("\n");
  document.head.appendChild(style);

  /* ---------------------------------------------------------------- */
  /* 2. Khung sườn                                                    */
  /* ---------------------------------------------------------------- */
  root.innerHTML =
    '<div id="cdWrap">' +
      '<h1>Ghép ảnh CCCD để in</h1>' +
      '<p class="cd-sub">Ghép nhiều ảnh CCCD (mặt trước/sau) vào 1 trang A4 rồi in, cắt hàng ngang để kẹp hồ sơ — không cần chỉnh tay trong Word.</p>' +
      '<div class="cd-loading-banner" id="cdLoadingBanner">' +
        '<span id="cdLoadingText">Đang tải công cụ hỗ trợ, vui lòng chờ trước khi sử dụng!</span>' +
        '<div class="cd-loading-track"><div class="cd-loading-fill" id="cdLoadingFill"></div></div>' +
      '</div>' +
      '<div class="cd-toolbar">' +
        '<button type="button" id="cdAddRow">+ Thêm người (hàng mới)</button>' +
        '<button type="button" id="cdPrint" class="primary">🖨 In</button>' +
        '<button type="button" id="cdClear">Xóa hết, làm lại</button>' +
      '</div>' +
      '<p class="cd-help">Mỗi hàng dành cho 1 người: khung trái là <b>mặt trước</b>, khung phải là <b>mặt sau</b> CCCD. ' +
      'Ảnh sẽ được tự động cắt bớt viền dư quanh mép. Nếu ảnh vẫn nghiêng, dùng thanh trượt để chỉnh ngay ngắn, ' +
      'kéo chuột trong khung để dịch ảnh, nút +/− để phóng to/thu nhỏ. Khi in, chỉ trang A4 được in.</p>' +
      '<div class="cd-sheet" id="cdSheet"></div>' +
      '<div class="cd-loading-overlay" id="cdLoadingOverlay"></div>' +
    '</div>';

  var sheet = root.querySelector("#cdSheet");
  setLoadingUiRefs(
    root.querySelector("#cdLoadingBanner"),
    root.querySelector("#cdLoadingText"),
    root.querySelector("#cdLoadingFill"),
    root.querySelector("#cdLoadingOverlay")
  );
  updateLoadingUi();

  /* ---------------------------------------------------------------- */
  /* 3. Auto-trim viền dư quanh mép ảnh                                */
  /* ---------------------------------------------------------------- */
  function autoTrim(img, callback) {
    var canvas = document.createElement("canvas");
    var w = img.naturalWidth, h = img.naturalHeight;
    canvas.width = w; canvas.height = h;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h);
    var data;
    try {
      data = ctx.getImageData(0, 0, w, h).data;
    } catch (e) {
      callback(img.src); return;
    }

    function px(x, y) {
      var i = (y * w + x) * 4;
      return [data[i], data[i + 1], data[i + 2]];
    }
    var corners = [px(1, 1), px(w - 2, 1), px(1, h - 2), px(w - 2, h - 2)];
    var bg = [0, 0, 0];
    corners.forEach(function (c) { bg[0] += c[0] / 4; bg[1] += c[1] / 4; bg[2] += c[2] / 4; });

    var THRESH = 42;
    function diff(x, y) {
      var c = px(x, y);
      return Math.abs(c[0] - bg[0]) + Math.abs(c[1] - bg[1]) + Math.abs(c[2] - bg[2]);
    }
    function rowHasContent(y) {
      var hit = 0, step = Math.max(1, Math.floor(w / 200));
      for (var x = 0; x < w; x += step) { if (diff(x, y) > THRESH) hit++; }
      return hit > (w / step) * 0.06;
    }
    function colHasContent(x) {
      var hit = 0, step = Math.max(1, Math.floor(h / 200));
      for (var y = 0; y < h; y += step) { if (diff(x, y) > THRESH) hit++; }
      return hit > (h / step) * 0.06;
    }

    var top = 0, bottom = h - 1, left = 0, right = w - 1;
    while (top < h * 0.4 && !rowHasContent(top)) top++;
    while (bottom > h * 0.6 && !rowHasContent(bottom)) bottom--;
    while (left < w * 0.4 && !colHasContent(left)) left++;
    while (right > w * 0.6 && !colHasContent(right)) right--;

    if (right - left < w * 0.5 || bottom - top < h * 0.5) {
      callback(img.src); return;
    }
    var pad = Math.round(Math.min(w, h) * 0.01);
    left = Math.max(0, left - pad); top = Math.max(0, top - pad);
    right = Math.min(w - 1, right + pad); bottom = Math.min(h - 1, bottom + pad);

    var cw = right - left, ch = bottom - top;
    var out = document.createElement("canvas");
    out.width = cw; out.height = ch;
    out.getContext("2d").drawImage(canvas, left, top, cw, ch, 0, 0, cw, ch);
    callback(out.toDataURL("image/jpeg", 0.95));
  }

  /* ---------------------------------------------------------------- */
  /* 3b. Auto-deskew + crop bằng OpenCV.js (chính xác hơn autoTrim)   */
  /*     - Tìm đường viền lớn nhất (thẻ CCCD) trong ảnh                */
  /*     - Lấy hình chữ nhật xoay nhỏ nhất bao quanh (minAreaRect)     */
  /*     - Xoay thẳng ảnh theo góc đó rồi cắt sát viền                 */
  /* ---------------------------------------------------------------- */
  function autoDeskewCrop(img, callback) {
    if (!cvReady || !window.cv) { callback(null); return; }
    var cv = window.cv;
    var mats = [];
    function trk(m) { mats.push(m); return m; }
    function cleanup() { mats.forEach(function (m) { try { m.delete(); } catch (e) {} }); }

    try {
      var src = trk(cv.imread(img));
      var gray = trk(new cv.Mat());
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
      cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0);

      var edges = trk(new cv.Mat());
      cv.Canny(gray, edges, 40, 130);
      var kernel = trk(cv.Mat.ones(7, 7, cv.CV_8U));
      cv.dilate(edges, edges, kernel);
      cv.morphologyEx(edges, edges, cv.MORPH_CLOSE, kernel);

      var contours = trk(new cv.MatVector());
      var hierarchy = trk(new cv.Mat());
      cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      var imgArea = src.rows * src.cols;
      var bestQuad = null, bestArea = 0, bestRectIdx = -1, bestRectArea = 0;

      for (var i = 0; i < contours.size(); i++) {
        var cnt = contours.get(i);
        var area = cv.contourArea(cnt);
        if (area < imgArea * 0.15) { continue; }

        // Thử xấp xỉ thành tứ giác (4 góc thẻ) -> cho phép nắn phối cảnh chuẩn
        var peri = cv.arcLength(cnt, true);
        var approx = new cv.Mat();
        cv.approxPolyDP(cnt, approx, 0.02 * peri, true);
        if (approx.rows === 4 && area > bestArea) {
          bestArea = area;
          if (bestQuad) bestQuad.delete();
          bestQuad = approx;
        } else {
          approx.delete();
        }
        if (area > bestRectArea) { bestRectArea = area; bestRectIdx = i; }
      }

      var outCanvas = document.createElement("canvas");

      if (bestQuad) {
        // Sắp xếp 4 điểm: trên-trái, trên-phải, dưới-phải, dưới-trái
        var pts = [];
        for (var p = 0; p < 4; p++) {
          pts.push({ x: bestQuad.intPtr(p, 0)[0], y: bestQuad.intPtr(p, 0)[1] });
        }
        bestQuad.delete();
        pts.sort(function (a, b) { return (a.y + a.x) - (b.y + b.x); });
        var tl = pts[0];
        var br = pts[3];
        var rest = [pts[1], pts[2]];
        rest.sort(function (a, b) { return a.y - b.y; });
        var tr = (pts[1].x - pts[1].y) > (pts[2].x - pts[2].y) ? pts[1] : pts[2];
        var bl = tr === pts[1] ? pts[2] : pts[1];

        var wTop = Math.hypot(tr.x - tl.x, tr.y - tl.y);
        var wBot = Math.hypot(br.x - bl.x, br.y - bl.y);
        var hL = Math.hypot(bl.x - tl.x, bl.y - tl.y);
        var hR = Math.hypot(br.x - tr.x, br.y - tr.y);
        var outW = Math.round(Math.max(wTop, wBot));
        var outH = Math.round(Math.max(hL, hR));

        // Thẻ CCCD tỉ lệ ~1.585:1 -- nếu kết quả bị lật ngang/dọc do xấp xỉ góc, ép lại đúng tỉ lệ hướng ngang
        if (outH > outW) { var t = outW; outW = outH; outH = t; }

        var srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y]);
        var dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, outW, 0, outW, outH, 0, outH]);
        var Mp = cv.getPerspectiveTransform(srcTri, dstTri);
        var warped = trk(new cv.Mat());
        cv.warpPerspective(src, warped, Mp, new cv.Size(outW, outH));
        srcTri.delete(); dstTri.delete(); Mp.delete();

        cv.imshow(outCanvas, warped);
        cleanup();
        callback(outCanvas.toDataURL("image/jpeg", 0.95));
        return;
      }

      // Không tìm được tứ giác 4 góc rõ ràng -> rơi về cách cũ: minAreaRect + xoay thẳng
      if (bestRectIdx === -1) { cleanup(); callback(null); return; }

      var rect = cv.minAreaRect(contours.get(bestRectIdx));
      var angle = rect.angle;
      var center = new cv.Point(src.cols / 2, src.rows / 2);
      var rotAngle = angle;
      if (rect.size.width < rect.size.height) rotAngle = angle + 90;
      while (rotAngle > 45) rotAngle -= 90;
      while (rotAngle < -45) rotAngle += 90;

      var M = cv.getRotationMatrix2D(center, rotAngle, 1);
      var rotated = trk(new cv.Mat());
      cv.warpAffine(src, rotated, M, new cv.Size(src.cols, src.rows), cv.INTER_LINEAR, cv.BORDER_REPLICATE);

      var gray2 = trk(new cv.Mat());
      cv.cvtColor(rotated, gray2, cv.COLOR_RGBA2GRAY);
      cv.GaussianBlur(gray2, gray2, new cv.Size(5, 5), 0);
      var edges2 = trk(new cv.Mat());
      cv.Canny(gray2, edges2, 50, 150);
      cv.dilate(edges2, edges2, kernel);
      var contours2 = trk(new cv.MatVector());
      var hierarchy2 = trk(new cv.Mat());
      cv.findContours(edges2, contours2, hierarchy2, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      var bestIdx2 = -1, bestArea2 = 0;
      for (var j = 0; j < contours2.size(); j++) {
        var a2 = cv.contourArea(contours2.get(j));
        if (a2 > bestArea2) { bestArea2 = a2; bestIdx2 = j; }
      }

      if (bestIdx2 !== -1) {
        var box = cv.boundingRect(contours2.get(bestIdx2));
        var pad = Math.round(Math.min(box.width, box.height) * 0.015);
        var x = Math.max(0, box.x - pad), y = Math.max(0, box.y - pad);
        var w2 = Math.min(rotated.cols - x, box.width + pad * 2);
        var h2 = Math.min(rotated.rows - y, box.height + pad * 2);
        var roi = rotated.roi(new cv.Rect(x, y, w2, h2));
        cv.imshow(outCanvas, roi);
        roi.delete();
      } else {
        cv.imshow(outCanvas, rotated);
      }

      cleanup();
      callback(outCanvas.toDataURL("image/jpeg", 0.95));
    } catch (err) {
      cleanup();
      callback(null);
    }
  }

  /* ---------------------------------------------------------------- */
  /* 4. 1 khung ảnh (slot)                                            */
  /* ---------------------------------------------------------------- */
  function createSlot(labelText) {
    var slot = document.createElement("div");
    slot.className = "cd-slot";

    var label = document.createElement("div");
    label.className = "cd-slot-label";
    label.textContent = labelText;
    slot.appendChild(label);

    var placeholder = document.createElement("div");
    placeholder.className = "cd-placeholder";
    placeholder.textContent = "Bấm hoặc kéo-thả ảnh " + labelText.toLowerCase() + " vào đây";
    slot.appendChild(placeholder);

    var fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    slot.appendChild(fileInput);

    var img = null;
    var tf = { rotate: 0, scale: 1, x: 0, y: 0 };

    function applyTransform() {
      if (!img) return;
      img.style.transform =
        "translate(-50%,-50%) translate(" + tf.x + "px," + tf.y + "px) rotate(" + tf.rotate + "deg) scale(" + tf.scale + ")";
    }

    function loadFile(file) {
      if (!file || !/^image\//.test(file.type)) return;
      var reader = new FileReader();
      reader.onload = function (e) {
        var tmp = new Image();
        tmp.onload = function () {
          function finish(finalSrc) {
            if (!img) {
              img = document.createElement("img");
              slot.insertBefore(img, slot.querySelector(".cd-slot-controls") || null);
            }
            img.src = finalSrc;
            img.onload = function () {
              var slotRect = slot.getBoundingClientRect();
              var ratioW = slotRect.width / img.naturalWidth;
              var ratioH = slotRect.height / img.naturalHeight;
              var base = Math.max(ratioW, ratioH);
              img.style.width = img.naturalWidth + "px";
              img.style.height = img.naturalHeight + "px";
              tf.scale = base; tf.rotate = 0; tf.x = 0; tf.y = 0;
              applyTransform();
            };
            placeholder.style.display = "none";
            slot.classList.add("has-img");
            ensureControls();
          }
          // Ưu tiên OpenCV.js (tự xoay thẳng + cắt sát viền). Nếu chưa sẵn sàng
          // hoặc không tìm được viền thẻ đáng tin -> rơi về autoTrim (cắt viền cơ bản).
          // Sau đó luôn chạy thêm bước đọc-thử-chữ (OSD) để tự xoay đúng chiều đọc
          // (phòng trường hợp ảnh bị úp ngược/nằm ngang mà viền thẻ vẫn "thẳng").
          autoDeskewCrop(tmp, function (cvResult) {
            if (cvResult) { autoFixTextOrientation(cvResult, finish); }
            else { autoTrim(tmp, function (trimResult) { autoFixTextOrientation(trimResult, finish); }); }
          });
        };
        tmp.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }

    placeholder.addEventListener("click", function () { fileInput.click(); });
    fileInput.addEventListener("change", function () {
      if (fileInput.files && fileInput.files[0]) loadFile(fileInput.files[0]);
    });
    slot.addEventListener("dragover", function (e) { e.preventDefault(); slot.style.background = "#eaf1ff"; });
    slot.addEventListener("dragleave", function () { slot.style.background = ""; });
    slot.addEventListener("drop", function (e) {
      e.preventDefault(); slot.style.background = "";
      var f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) loadFile(f);
    });

    var dragging = false, startX, startY, startTx, startTy;
    slot.addEventListener("mousedown", function (e) {
      if (!img || e.target.closest(".cd-slot-controls")) return;
      dragging = true; startX = e.clientX; startY = e.clientY; startTx = tf.x; startTy = tf.y;
      e.preventDefault();
    });
    window.addEventListener("mousemove", function (e) {
      if (!dragging) return;
      tf.x = startTx + (e.clientX - startX);
      tf.y = startTy + (e.clientY - startY);
      applyTransform();
    });
    window.addEventListener("mouseup", function () { dragging = false; });

    var controlsEl;
    function ensureControls() {
      if (controlsEl) return;
      controlsEl = document.createElement("div");
      controlsEl.className = "cd-slot-controls";

      var rot90 = document.createElement("button");
      rot90.type = "button"; rot90.title = "Xoay 90°"; rot90.textContent = "⟳90°";
      rot90.addEventListener("click", function () { tf.rotate += 90; applyTransform(); });

      var rotRange = document.createElement("input");
      rotRange.type = "range"; rotRange.min = -15; rotRange.max = 15; rotRange.step = 0.2; rotRange.value = 0;
      rotRange.title = "Chỉnh ngay ngắn (xoay nhẹ)";
      rotRange.addEventListener("input", function () {
        var base90 = Math.round(tf.rotate / 90) * 90;
        tf.rotate = base90 + parseFloat(rotRange.value);
        applyTransform();
      });

      var zoomOut = document.createElement("button");
      zoomOut.type = "button"; zoomOut.textContent = "−"; zoomOut.title = "Thu nhỏ";
      zoomOut.addEventListener("click", function () { tf.scale = Math.max(0.05, tf.scale * 0.95); applyTransform(); });

      var zoomIn = document.createElement("button");
      zoomIn.type = "button"; zoomIn.textContent = "+"; zoomIn.title = "Phóng to";
      zoomIn.addEventListener("click", function () { tf.scale = tf.scale * 1.05; applyTransform(); });

      var resetBtn = document.createElement("button");
      resetBtn.type = "button"; resetBtn.textContent = "⟲"; resetBtn.title = "Đặt lại vị trí/góc";
      resetBtn.addEventListener("click", function () {
        var slotRect = slot.getBoundingClientRect();
        var ratioW = slotRect.width / img.naturalWidth;
        var ratioH = slotRect.height / img.naturalHeight;
        tf.scale = Math.max(ratioW, ratioH); tf.rotate = 0; tf.x = 0; tf.y = 0; rotRange.value = 0;
        applyTransform();
      });

      var delBtn = document.createElement("button");
      delBtn.type = "button"; delBtn.textContent = "✕"; delBtn.title = "Xóa ảnh";
      delBtn.addEventListener("click", function () {
        if (img) { img.remove(); img = null; }
        placeholder.style.display = "flex";
        slot.classList.remove("has-img");
        fileInput.value = "";
        controlsEl.remove(); controlsEl = null;
      });

      controlsEl.appendChild(rot90);
      controlsEl.appendChild(rotRange);
      controlsEl.appendChild(zoomOut);
      controlsEl.appendChild(zoomIn);
      controlsEl.appendChild(resetBtn);
      controlsEl.appendChild(delBtn);
      slot.appendChild(controlsEl);
    }

    return slot;
  }

  /* ---------------------------------------------------------------- */
  /* 5. 1 hàng = 1 người (mặt trước / mặt sau)                        */
  /* ---------------------------------------------------------------- */
  function createRow() {
    var row = document.createElement("div");
    row.className = "cd-row";

    row.appendChild(createSlot("Mặt trước"));
    row.appendChild(createSlot("Mặt sau"));

    var actions = document.createElement("div");
    actions.className = "cd-row-actions";
    var removeBtn = document.createElement("button");
    removeBtn.type = "button"; removeBtn.textContent = "✕"; removeBtn.title = "Xóa hàng này";
    removeBtn.addEventListener("click", function () { row.remove(); });
    actions.appendChild(removeBtn);
    row.appendChild(actions);

    return row;
  }

  /* ---------------------------------------------------------------- */
  /* 6. Toolbar                                                       */
  /* ---------------------------------------------------------------- */
  root.querySelector("#cdAddRow").addEventListener("click", function () {
    sheet.appendChild(createRow());
  });
  root.querySelector("#cdPrint").addEventListener("click", function () {
    window.print();
  });
  root.querySelector("#cdClear").addEventListener("click", function () {
    if (!confirm("Xóa toàn bộ ảnh đã thêm?")) return;
    sheet.innerHTML = "";
    for (var i = 0; i < 5; i++) sheet.appendChild(createRow());
  });

  for (var i = 0; i < 5; i++) sheet.appendChild(createRow());
})();
