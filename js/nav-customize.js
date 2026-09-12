// ============================================================================
// Tùy chỉnh menu điều hướng: giữ chuột/chạm ~3 giây vào 1 mục trong sidebar để
// vào chế độ sắp xếp lại thứ tự và ẩn/hiện các mục theo ý cá nhân.
// Cấu hình được lưu vào localStorage của trình duyệt (không ảnh hưởng người
// dùng khác) — xoá dữ liệu trình duyệt (hoặc bấm "Khôi phục mặc định") sẽ
// đưa menu về đúng như ban đầu.
// LƯU Ý: file này phải được nạp TRƯỚC js/spa-router.js (dùng thuộc tính
// "defer" nên thứ tự thẻ <script> trong HTML quyết định thứ tự chạy) để
// listener click ở đây được gắn trước và có thể chặn việc chuyển trang khi
// đang ở chế độ chỉnh sửa.
// ============================================================================
(function () {
  const STORAGE_KEY = 'bsdha_nav_prefs_v1';
  const HOLD_MS = 3000;
  // Các mục cách nhau 10 đơn vị order thay vì 1, để chèn được tiêu đề/đường kẻ
  // nhóm vào giữa mà không phải dồn hết các mục lên trước (xem positionGroupMarkers).
  const ORDER_STEP = 10;

  const sidebar = document.getElementById('sidebarNav');
  if (!sidebar) return;
  const topbar = document.getElementById('topbarNav');

  function itemsOf(root) {
    return Array.prototype.slice.call(root.querySelectorAll('.nav-item'));
  }

  // Thứ tự & danh sách mục gốc (chụp lại trước khi có bất kỳ thay đổi nào)
  const DEFAULT_ORDER = itemsOf(sidebar).map(function (el) { return el.dataset.page; });

  // ---------- Xác định ranh giới các nhóm (dựa theo sidebar: tiêu đề + đường kẻ) ----------
  // Mỗi nhóm giữ lại danh sách "thành viên" (page key) gốc của mình, để dù người
  // dùng sắp xếp lại thứ tự thế nào, tiêu đề nhóm vẫn luôn bám theo đúng nhóm đó
  // (đặt ngay trước mục có order nhỏ nhất trong nhóm) thay vì biến mất hoặc bị
  // dồn hết lên đầu danh sách.
  const SIDEBAR_GROUPS = (function () {
    const groups = [];
    let cur = null;
    Array.prototype.slice.call(sidebar.children).forEach(function (el) {
      if (el.classList && el.classList.contains('nav-group-divider')) {
        cur = { dividerEl: el, titleEl: null, members: [] };
        groups.push(cur);
        return;
      }
      if (el.classList && el.classList.contains('nav-group-title')) {
        if (!cur) { cur = { dividerEl: null, titleEl: el, members: [] }; groups.push(cur); }
        else { cur.titleEl = el; }
        return;
      }
      if (el.classList && el.classList.contains('nav-item') && el.dataset.page) {
        if (!cur) { cur = { dividerEl: null, titleEl: null, members: [] }; groups.push(cur); }
        cur.members.push(el.dataset.page);
      }
    });
    return groups.filter(function (g) { return g.titleEl || g.dividerEl; });
  })();

  // Ghép đường kẻ ngăn cách bên topbar với đúng nhóm tương ứng bên sidebar
  // (topbar không có chữ tiêu đề, chỉ có đường kẻ dọc, theo đúng thứ tự xuất hiện).
  const TOPBAR_DIVIDERS = topbar ? Array.prototype.slice.call(topbar.querySelectorAll('.nav-group-divider')) : [];
  const GROUPS_WITH_DIVIDER = SIDEBAR_GROUPS.filter(function (g) { return g.dividerEl; });

  // ---------- Lưu trữ ----------
  function loadPrefs() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !Array.isArray(data.order)) return null;
      return { order: data.order, hidden: Array.isArray(data.hidden) ? data.hidden : [] };
    } catch (e) { return null; }
  }
  function savePrefs(order, hidden) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ order: order, hidden: hidden })); } catch (e) {}
  }
  function clearPrefs() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  }
  function fullOrder(order) {
    const set = {};
    order.forEach(function (k) { set[k] = true; });
    const merged = order.slice();
    DEFAULT_ORDER.forEach(function (k) { if (!set[k]) merged.push(k); });
    return merged;
  }
  function orderValueOf(order, key) {
    const idx = order.indexOf(key);
    return (idx === -1 ? order.length : idx) * ORDER_STEP;
  }

  // ---------- Đặt lại vị trí tiêu đề/đường kẻ nhóm theo order hiện tại ----------
  // Luôn hiển thị (không bao giờ ẩn), chỉ dịch chuyển theo đúng nhóm của mình.
  function positionGroupMarkers(order) {
    SIDEBAR_GROUPS.forEach(function (g) {
      const minVal = g.members.length
        ? Math.min.apply(null, g.members.map(function (k) { return orderValueOf(order, k); }))
        : orderValueOf(order, '__end__');
      if (g.titleEl) g.titleEl.style.order = String(minVal - 5);
      if (g.dividerEl) g.dividerEl.style.order = String(minVal - 6);
    });
    GROUPS_WITH_DIVIDER.forEach(function (g, i) {
      const dividerEl = TOPBAR_DIVIDERS[i];
      if (!dividerEl) return;
      const minVal = g.members.length
        ? Math.min.apply(null, g.members.map(function (k) { return orderValueOf(order, k); }))
        : 0;
      dividerEl.style.order = String(minVal - 6);
    });
  }

  // ---------- Áp dụng cấu hình (thứ tự + ẩn/hiện) lên giao diện ----------
  function applyOrderTo(root, order, hidden) {
    itemsOf(root).forEach(function (el) {
      el.style.order = String(orderValueOf(order, el.dataset.page));
      el.style.display = hidden.indexOf(el.dataset.page) !== -1 ? 'none' : '';
    });
  }

  function applyHomeCards(order, hidden) {
    const hgrids = document.querySelectorAll('#page-home .hgrid');
    hgrids.forEach(function (grid) {
      const cards = Array.prototype.slice.call(grid.querySelectorAll('.hcard'));
      let visibleCount = 0;
      cards.forEach(function (el) {
        el.style.order = String(orderValueOf(order, el.dataset.page));
        const isHidden = hidden.indexOf(el.dataset.page) !== -1;
        el.style.display = isHidden ? 'none' : '';
        if (!isHidden) visibleCount++;
      });
      grid.classList.toggle('hgrid-compact-few', cards.length > 0 && visibleCount > 0 && visibleCount <= 6);
    });
  }

  function restoreDefaults(root) {
    itemsOf(root).forEach(function (el) { el.style.order = ''; el.style.display = ''; });
  }
  function restoreGroupMarkers() {
    SIDEBAR_GROUPS.forEach(function (g) {
      if (g.titleEl) g.titleEl.style.order = '';
      if (g.dividerEl) g.dividerEl.style.order = '';
    });
    TOPBAR_DIVIDERS.forEach(function (el) { el.style.order = ''; });
  }
  function restoreHomeDefaults() {
    document.querySelectorAll('#page-home .hgrid').forEach(function (grid) {
      grid.classList.remove('hgrid-compact-few');
      grid.querySelectorAll('.hcard').forEach(function (el) { el.style.order = ''; el.style.display = ''; });
    });
  }

  function applyAll() {
    const prefs = loadPrefs();
    if (!prefs) {
      restoreDefaults(sidebar);
      if (topbar) restoreDefaults(topbar);
      restoreGroupMarkers();
      restoreHomeDefaults();
      return;
    }
    const order = fullOrder(prefs.order);
    const hidden = prefs.hidden || [];
    applyOrderTo(sidebar, order, hidden);
    if (topbar) applyOrderTo(topbar, order, hidden);
    positionGroupMarkers(order);
    applyHomeCards(order, hidden);
  }

  applyAll(); // áp dụng ngay khi tải trang (nếu người dùng đã từng tùy chỉnh trước đó)

  // ---------- Chế độ chỉnh sửa (giữ chuột/chạm ~3 giây) ----------
  let editMode = false;
  let workingOrder = [];
  let workingHidden = [];
  let toolbarEl = null;
  const injected = []; // các phần tử điều khiển (nút lên/xuống, tay kéo, checkbox) đã chèn thêm

  function isHomeBtn(el) { return el.classList.contains('home-btn'); }

  function renumber() {
    // Gọi lại sau mỗi lần đổi chỗ để cập nhật CSS order + bật/tắt nút lên/xuống
    itemsOf(sidebar).forEach(function (el) {
      const idx = workingOrder.indexOf(el.dataset.page);
      el.style.order = idx === -1 ? '' : String((idx + 1) * ORDER_STEP);
      const upBtn = el.querySelector('.nav-up');
      const downBtn = el.querySelector('.nav-down');
      if (upBtn) upBtn.disabled = idx <= 0;
      if (downBtn) downBtn.disabled = idx === -1 || idx >= workingOrder.length - 1;
    });
    positionGroupMarkers(workingOrder);
  }

  function moveItem(key, dir) {
    const idx = workingOrder.indexOf(key);
    const newIdx = idx + dir;
    if (idx === -1 || newIdx < 0 || newIdx >= workingOrder.length) return;
    const tmp = workingOrder[idx];
    workingOrder[idx] = workingOrder[newIdx];
    workingOrder[newIdx] = tmp;
    renumber();
  }

  // ---------- Kéo-thả bằng tay cầm (chỉ trên sidebar desktop — danh sách dọc) ----------
  let dragState = null;

  function startDrag(handle, el, key, pointerId) {
    const rect = el.getBoundingClientRect();
    dragState = {
      el: el,
      key: key,
      pointerId: pointerId,
      startY: rect.top,
      offsetInItem: 0,
      lastClientY: 0,
    };
    el.classList.add('nav-dragging');
    try { handle.setPointerCapture(pointerId); } catch (e) {}
  }

  function onDragMove(e) {
    if (!dragState || e.pointerId !== dragState.pointerId) return;
    e.preventDefault();
    dragState.lastClientY = e.clientY;
    dragState.el.style.transform = 'translateY(' + (e.clientY - (dragState.startY + dragState.el.offsetHeight / 2)) + 'px)';

    // So sánh tâm phần tử đang kéo với các mục còn lại để hoán đổi vị trí ngay khi vượt qua điểm giữa
    const draggedCenter = e.clientY;
    const siblings = itemsOf(sidebar).filter(function (s) { return s !== dragState.el; });
    for (let i = 0; i < siblings.length; i++) {
      const sib = siblings[i];
      const r = sib.getBoundingClientRect();
      const sibCenter = r.top + r.height / 2;
      const sibKey = sib.dataset.page;
      const draggedIdx = workingOrder.indexOf(dragState.key);
      const sibIdx = workingOrder.indexOf(sibKey);
      if (sibIdx === -1 || draggedIdx === -1) continue;
      if (draggedIdx < sibIdx && draggedCenter > sibCenter) {
        workingOrder.splice(draggedIdx, 1);
        workingOrder.splice(sibIdx, 0, dragState.key);
        renumber();
        break;
      } else if (draggedIdx > sibIdx && draggedCenter < sibCenter) {
        workingOrder.splice(draggedIdx, 1);
        workingOrder.splice(sibIdx, 0, dragState.key);
        renumber();
        break;
      }
    }
  }

  function endDrag(e) {
    if (!dragState || (e && e.pointerId !== dragState.pointerId)) return;
    dragState.el.classList.remove('nav-dragging');
    dragState.el.style.transform = '';
    dragState = null;
  }

  document.addEventListener('pointermove', onDragMove);
  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', endDrag);

  function buildToolbar() {
    const bar = document.createElement('div');
    bar.className = 'nav-edit-toolbar';
    bar.innerHTML =
      '<button type="button" class="net-reset" title="Khôi phục mặc định ban đầu">↺</button>' +
      '<button type="button" class="net-cancel" title="Hủy, không lưu thay đổi">✕</button>' +
      '<button type="button" class="net-save" title="Lưu thay đổi (OK)">✓</button>';
    bar.querySelector('.net-save').addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      savePrefs(workingOrder, workingHidden);
      exitEditMode();
      applyAll();
    });
    bar.querySelector('.net-cancel').addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      exitEditMode();
      applyAll();
    });
    bar.querySelector('.net-reset').addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      if (window.confirm('Khôi phục menu về mặc định ban đầu?')) {
        clearPrefs();
        exitEditMode();
        applyAll();
      }
    });
    sidebar.appendChild(bar);
    toolbarEl = bar;
  }

  function enterEditMode() {
    if (editMode) return;
    editMode = true;

    const prefs = loadPrefs();
    workingOrder = fullOrder(prefs ? prefs.order : []);
    workingHidden = prefs ? prefs.hidden.slice() : [];

    sidebar.classList.add('nav-edit-mode');

    itemsOf(sidebar).forEach(function (el, i) {
      const key = el.dataset.page;
      // Hiện tạm tất cả mục (kể cả đang ẩn) để có thể tick lại và mở lại dễ dàng
      el.style.display = '';
      el.classList.add('nav-shake');
      // Lệch pha thời gian rung một chút giữa các mục để đỡ rối mắt hơn là
      // rung đồng loạt cùng nhịp (giống hiệu ứng sắp xếp icon trên điện thoại).
      el.style.animationDelay = (-(i % 5) * 0.09) + 's';

      const handle = document.createElement('span');
      handle.className = 'nav-drag-handle';
      handle.title = 'Giữ và kéo để đổi vị trí';
      handle.innerHTML = '<span></span><span></span><span></span><span></span><span></span><span></span>';
      handle.addEventListener('pointerdown', function (e) {
        e.preventDefault(); e.stopPropagation();
        startDrag(handle, el, key, e.pointerId);
      });
      el.insertBefore(handle, el.firstChild);

      const reorder = document.createElement('span');
      reorder.className = 'nav-reorder';
      reorder.innerHTML = '<button type="button" class="nav-up" title="Đưa lên trên">▲</button>' +
                           '<button type="button" class="nav-down" title="Đưa xuống dưới">▼</button>';
      reorder.querySelector('.nav-up').addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation(); moveItem(key, -1);
      });
      reorder.querySelector('.nav-down').addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation(); moveItem(key, 1);
      });
      el.insertBefore(reorder, handle.nextSibling);

      const label = document.createElement('label');
      label.className = 'nav-visible-toggle';
      label.title = 'Bỏ chọn để ẩn mục này khỏi sidebar';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = workingHidden.indexOf(key) === -1;
      cb.addEventListener('click', function (e) { e.stopPropagation(); });
      cb.addEventListener('change', function () {
        const i2 = workingHidden.indexOf(key);
        if (cb.checked) { if (i2 !== -1) workingHidden.splice(i2, 1); }
        else if (i2 === -1) { workingHidden.push(key); }
      });
      label.appendChild(cb);
      label.appendChild(document.createTextNode('Hiện'));
      el.appendChild(label);

      injected.push({ el: el, handle: handle, reorder: reorder, label: label });
    });

    renumber();
    buildToolbar();
  }

  function exitEditMode() {
    editMode = false;
    endDrag(null);
    sidebar.classList.remove('nav-edit-mode');
    injected.forEach(function (rec) {
      rec.el.classList.remove('nav-shake');
      rec.el.style.animationDelay = '';
      rec.el.style.order = '';
      rec.el.style.transform = '';
      if (rec.handle.parentNode) rec.handle.parentNode.removeChild(rec.handle);
      if (rec.reorder.parentNode) rec.reorder.parentNode.removeChild(rec.reorder);
      if (rec.label.parentNode) rec.label.parentNode.removeChild(rec.label);
    });
    injected.length = 0;
    if (toolbarEl && toolbarEl.parentNode) toolbarEl.parentNode.removeChild(toolbarEl);
    toolbarEl = null;
  }

  document.addEventListener('keydown', function (e) {
    if (editMode && e.key === 'Escape') { exitEditMode(); applyAll(); }
  });

  // ---------- Giữ chuột/chạm ~3 giây trên 1 mục (trừ Trang chủ) để vào chỉnh sửa ----------
  itemsOf(sidebar).forEach(function (el) {
    if (isHomeBtn(el)) return;
    let timer = null;
    let justTriggered = false;
    const start = function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        timer = null;
        justTriggered = true;
        enterEditMode();
      }, HOLD_MS);
    };
    const cancel = function () { clearTimeout(timer); timer = null; };
    el.addEventListener('mousedown', start);
    el.addEventListener('mouseup', cancel);
    el.addEventListener('mouseleave', cancel);
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchend', cancel);
    el.addEventListener('touchcancel', cancel);
    // Listener này được gắn trước spa-router.js (nhờ thứ tự script "defer"),
    // nên sẽ chạy trước và có thể chặn việc chuyển trang.
    el.addEventListener('click', function (e) {
      if (justTriggered) { justTriggered = false; e.preventDefault(); e.stopImmediatePropagation(); return; }
      if (editMode) { e.preventDefault(); e.stopImmediatePropagation(); }
    });
  });
})();
