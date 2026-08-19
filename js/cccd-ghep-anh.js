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
  /* 0. Nạp OpenCV.js không đồng bộ (không chặn giao diện)             */
  /* ---------------------------------------------------------------- */
  var cvReady = false;
  var cvFailed = false;
  var cvStatusEl = null; // gán sau khi dựng toolbar

  function setCvStatus(text, ok) {
    if (!cvStatusEl) return;
    cvStatusEl.textContent = text;
    cvStatusEl.style.color = ok === true ? "var(--green,#1f9c8f)" : (ok === false ? "var(--red,#d8433f)" : "var(--muted,#5a5a5a)");
  }

  (function loadOpenCV() {
    if (window.cv && window.cv.Mat) { cvReady = true; return; }
    var s = document.createElement("script");
    s.src = "https://docs.opencv.org/4.x/opencv.js";
    s.async = true;
    s.onload = function () {
      // opencv.js gọi cv['onRuntimeInitialized'] khi WASM sẵn sàng
      function waitReady() {
        if (window.cv && window.cv.Mat) { cvReady = true; setCvStatus("OpenCV.js sẵn sàng — tự động xoay thẳng ✓", true); }
        else { setTimeout(waitReady, 200); }
      }
      if (window.cv) {
        window.cv["onRuntimeInitialized"] = function () { cvReady = true; setCvStatus("OpenCV.js sẵn sàng — tự động xoay thẳng ✓", true); };
        waitReady();
      } else {
        cvFailed = true; setCvStatus("Không tải được OpenCV.js — dùng chế độ cắt viền cơ bản", false);
      }
    };
    s.onerror = function () {
      cvFailed = true;
      setCvStatus("Không tải được OpenCV.js (mạng chặn?) — dùng chế độ cắt viền cơ bản", false);
    };
    setCvStatus("Đang tải OpenCV.js để tự động xoay thẳng ảnh…", null);
    document.head.appendChild(s);
  })();

  /* ---------------------------------------------------------------- */
  /* 1. CSS (tiền tố "cd-" để không đụng CSS các module khác)          */
  /* ---------------------------------------------------------------- */
  var style = document.createElement("style");
  style.textContent = [
    "#cdWrap{max-width:900px;margin:0 auto;padding:16px;font-family:inherit;color:var(--text,#111);}",
    "#cdWrap h1{font-size:20px;margin:0 0 4px;}",
    "#cdWrap .cd-sub{color:var(--muted,#5a5a5a);font-size:13px;margin:0 0 14px;}",
    ".cd-toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:10px;background:var(--surface-2,#f2f2f2);border:1px solid var(--border,#e2e2e2);border-radius:10px;margin-bottom:12px;}",
    ".cd-toolbar button{cursor:pointer;border:1px solid var(--border,#ccc);background:var(--surface,#fff);color:var(--text,#111);border-radius:8px;padding:9px 13px;font-size:13.5px;font-weight:600;}",
    ".cd-toolbar button.primary{background:var(--blue,#1c6fd1);color:#fff;border-color:var(--blue,#1c6fd1);}",
    ".cd-toolbar button:hover{filter:brightness(0.97);}",
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
      '<div class="cd-toolbar">' +
        '<button type="button" id="cdAddRow">+ Thêm người (hàng mới)</button>' +
        '<button type="button" id="cdPrint" class="primary">🖨 In</button>' +
        '<button type="button" id="cdClear">Xóa hết, làm lại</button>' +
        '<span id="cdCvStatus" style="font-size:12px;color:var(--muted,#5a5a5a);margin-left:4px;"></span>' +
      '</div>' +
      '<p class="cd-help">Mỗi hàng dành cho 1 người: khung trái là <b>mặt trước</b>, khung phải là <b>mặt sau</b> CCCD. ' +
      'Ảnh sẽ được tự động cắt bớt viền dư quanh mép. Nếu ảnh vẫn nghiêng, dùng thanh trượt để chỉnh ngay ngắn, ' +
      'kéo chuột trong khung để dịch ảnh, nút +/− để phóng to/thu nhỏ. Khi in, chỉ trang A4 được in.</p>' +
      '<div class="cd-sheet" id="cdSheet"></div>' +
    '</div>';

  var sheet = root.querySelector("#cdSheet");
  cvStatusEl = root.querySelector("#cdCvStatus");
  setCvStatus("Đang tải OpenCV.js để tự động xoay thẳng ảnh…", null);

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
    try {
      var cv = window.cv;
      var src = cv.imread(img);
      var gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
      cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0);

      var thresh = new cv.Mat();
      cv.threshold(gray, thresh, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);

      // Cạnh CCCD thường tương phản với nền -> dùng Canny bổ trợ rồi giãn nở để nối viền đứt
      var edges = new cv.Mat();
      cv.Canny(gray, edges, 50, 150);
      var kernel = cv.Mat.ones(5, 5, cv.CV_8U);
      cv.dilate(edges, edges, kernel);

      var contours = new cv.MatVector();
      var hierarchy = new cv.Mat();
      cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      var bestIdx = -1, bestArea = 0;
      for (var i = 0; i < contours.size(); i++) {
        var area = cv.contourArea(contours.get(i));
        if (area > bestArea) { bestArea = area; bestIdx = i; }
      }

      var imgArea = src.rows * src.cols;
      if (bestIdx === -1 || bestArea < imgArea * 0.15) {
        // Không tìm được viền thẻ đủ lớn và đáng tin -> bỏ qua, dùng autoTrim thay thế
        [src, gray, thresh, edges, kernel, contours, hierarchy].forEach(function (m) { m.delete(); });
        callback(null);
        return;
      }

      var rect = cv.minAreaRect(contours.get(bestIdx));
      var angle = rect.angle; // OpenCV.js: góc trong khoảng (-90, 0]
      var center = new cv.Point(src.cols / 2, src.rows / 2);

      // Chuẩn hoá góc để không xoay lệch 90°: đưa về khoảng gần 0 nhất
      var rotAngle = angle;
      if (rect.size.width < rect.size.height) rotAngle = angle + 90;
      while (rotAngle > 45) rotAngle -= 90;
      while (rotAngle < -45) rotAngle += 90;

      var M = cv.getRotationMatrix2D(center, rotAngle, 1);
      var rotated = new cv.Mat();
      cv.warpAffine(src, rotated, M, new cv.Size(src.cols, src.rows), cv.INTER_LINEAR, cv.BORDER_REPLICATE);

      // Sau khi xoay thẳng, tìm lại viền thẻ trên ảnh đã xoay để cắt sát mép
      var gray2 = new cv.Mat();
      cv.cvtColor(rotated, gray2, cv.COLOR_RGBA2GRAY);
      cv.GaussianBlur(gray2, gray2, new cv.Size(5, 5), 0);
      var edges2 = new cv.Mat();
      cv.Canny(gray2, edges2, 50, 150);
      cv.dilate(edges2, edges2, kernel);
      var contours2 = new cv.MatVector();
      var hierarchy2 = new cv.Mat();
      cv.findContours(edges2, contours2, hierarchy2, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      var bestIdx2 = -1, bestArea2 = 0;
      for (var j = 0; j < contours2.size(); j++) {
        var a2 = cv.contourArea(contours2.get(j));
        if (a2 > bestArea2) { bestArea2 = a2; bestIdx2 = j; }
      }

      var outCanvas = document.createElement("canvas");
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

      [src, gray, thresh, edges, kernel, contours, hierarchy, rotated, gray2, edges2, contours2, hierarchy2].forEach(function (m) { m.delete(); });

      callback(outCanvas.toDataURL("image/jpeg", 0.95));
    } catch (err) {
      // Bất kỳ lỗi nào từ OpenCV -> âm thầm rơi về autoTrim, không làm gián đoạn người dùng
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
          autoDeskewCrop(tmp, function (cvResult) {
            if (cvResult) { finish(cvResult); }
            else { autoTrim(tmp, finish); }
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
