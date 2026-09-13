/**
 * Cho phép kéo-giãn độ rộng sidebar (desktop) bằng cách rê chuột vào thanh
 * ngăn cách mảnh giữa sidebar và nội dung chính. Độ rộng đã chọn được lưu lại
 * vào localStorage để giữ nguyên cho lần truy cập sau.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "bsdha_sidebar_width";
  var MIN_WIDTH = 200;
  var MAX_WIDTH = 480;
  var DEFAULT_WIDTH = 240;

  var handle = document.getElementById("sidebarResizeHandle");
  if (!handle) return;

  function applyWidth(px) {
    var clamped = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, px));
    document.documentElement.style.setProperty("--sidebar-width", clamped + "px");
    return clamped;
  }

  // Khôi phục độ rộng đã lưu (nếu có) ngay khi tải trang.
  try {
    var saved = parseInt(localStorage.getItem(STORAGE_KEY), 10);
    if (!isNaN(saved)) applyWidth(saved);
  } catch (e) {}

  var dragging = false;

  function onPointerDown(e) {
    dragging = true;
    handle.classList.add("dragging");
    document.body.classList.add("sidebar-resizing");
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!dragging) return;
    var clientX = e.touches ? e.touches[0].clientX : e.clientX;
    applyWidth(clientX);
  }

  function onPointerUp() {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove("dragging");
    document.body.classList.remove("sidebar-resizing");
    try {
      var current = getComputedStyle(document.documentElement).getPropertyValue("--sidebar-width");
      var widthPx = parseInt(current, 10);
      if (!isNaN(widthPx)) localStorage.setItem(STORAGE_KEY, String(widthPx));
    } catch (e) {}
  }

  handle.addEventListener("mousedown", onPointerDown);
  handle.addEventListener("touchstart", onPointerDown, { passive: false });
  window.addEventListener("mousemove", onPointerMove);
  window.addEventListener("touchmove", onPointerMove, { passive: false });
  window.addEventListener("mouseup", onPointerUp);
  window.addEventListener("touchend", onPointerUp);

  // Bấm đúp vào thanh kéo -> trả về độ rộng mặc định, nhanh gọn nếu lỡ kéo quá tay.
  handle.addEventListener("dblclick", function () {
    applyWidth(DEFAULT_WIDTH);
    try { localStorage.setItem(STORAGE_KEY, String(DEFAULT_WIDTH)); } catch (e) {}
  });
})();
