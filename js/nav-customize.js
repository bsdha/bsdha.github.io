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

  const sidebar = document.getElementById('sidebarNav');
  if (!sidebar) return;
  const topbar = document.getElementById('topbarNav');

  function itemsOf(root) {
    return Array.prototype.slice.call(root.querySelectorAll('.nav-item'));
  }

  // Thứ tự & danh sách mục gốc (chụp lại trước khi có bất kỳ thay đổi nào)
  const DEFAULT_ORDER = itemsOf(sidebar).map(function (el) { return el.dataset.page; });

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

  // ---------- Áp dụng cấu hình (thứ tự + ẩn/hiện) lên giao diện ----------
  function applyOrderTo(root, order, hidden, flat) {
    itemsOf(root).forEach(function (el) {
      const idx = order.indexOf(el.dataset.page);
      el.style.order = idx === -1 ? '' : String(idx + 1);
      el.style.display = hidden.indexOf(el.dataset.page) !== -1 ? 'none' : '';
    });
    const groupEls = root.querySelectorAll('.nav-group-title, .nav-group-divider');
    for (let i = 0; i < groupEls.length; i++) groupEls[i].style.display = flat ? 'none' : '';
  }

  function applyHomeCards(order, hidden) {
    const hgrids = document.querySelectorAll('#page-home .hgrid');
    hgrids.forEach(function (grid) {
      const cards = Array.prototype.slice.call(grid.querySelectorAll('.hcard'));
      let visibleCount = 0;
      cards.forEach(function (el) {
        const idx = order.indexOf(el.dataset.page);
        el.style.order = idx === -1 ? '' : String(idx + 1);
        const isHidden = hidden.indexOf(el.dataset.page) !== -1;
        el.style.display = isHidden ? 'none' : '';
        if (!isHidden) visibleCount++;
      });
      grid.classList.toggle('hgrid-compact-few', cards.length > 0 && visibleCount > 0 && visibleCount <= 6);
    });
  }

  function restoreDefaults(root) {
    itemsOf(root).forEach(function (el) { el.style.order = ''; el.style.display = ''; });
    const groupEls = root.querySelectorAll('.nav-group-title, .nav-group-divider');
    for (let i = 0; i < groupEls.length; i++) groupEls[i].style.display = '';
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
      restoreHomeDefaults();
      return;
    }
    const order = fullOrder(prefs.order);
    const hidden = prefs.hidden || [];
    applyOrderTo(sidebar, order, hidden, true);
    if (topbar) applyOrderTo(topbar, order, hidden, true);
    applyHomeCards(order, hidden);
  }

  applyAll(); // áp dụng ngay khi tải trang (nếu người dùng đã từng tùy chỉnh trước đó)

  // ---------- Chế độ chỉnh sửa (giữ chuột/chạm ~3 giây) ----------
  let editMode = false;
  let workingOrder = [];
  let workingHidden = [];
  let toolbarEl = null;
  const injected = []; // các phần tử điều khiển (nút lên/xuống, checkbox) đã chèn thêm

  function isHomeBtn(el) { return el.classList.contains('home-btn'); }

  function renumber() {
    // Gọi lại sau mỗi lần đổi chỗ để cập nhật CSS order + bật/tắt nút lên/xuống
    itemsOf(sidebar).forEach(function (el) {
      const idx = workingOrder.indexOf(el.dataset.page);
      el.style.order = idx === -1 ? '' : String(idx + 1);
      const upBtn = el.querySelector('.nav-up');
      const downBtn = el.querySelector('.nav-down');
      if (upBtn) upBtn.disabled = idx <= 0;
      if (downBtn) downBtn.disabled = idx === -1 || idx >= workingOrder.length - 1;
    });
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

  function buildToolbar() {
    const bar = document.createElement('div');
    bar.className = 'nav-edit-toolbar';
    bar.innerHTML =
      '<p class="net-hint">Đang sắp xếp — bấm mũi tên để đổi vị trí, bỏ chọn ô để ẩn mục, rồi bấm Lưu.</p>' +
      '<button type="button" class="net-reset">Mặc định</button>' +
      '<button type="button" class="net-cancel">Hủy</button>' +
      '<button type="button" class="net-save">Lưu (OK)</button>';
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

    itemsOf(sidebar).forEach(function (el) {
      const key = el.dataset.page;
      // Hiện tạm tất cả mục (kể cả đang ẩn) để có thể tick lại và mở lại dễ dàng
      el.style.display = '';
      el.classList.add('nav-shake');

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
      el.insertBefore(reorder, el.firstChild);

      const label = document.createElement('label');
      label.className = 'nav-visible-toggle';
      label.title = 'Bỏ chọn để ẩn mục này khỏi sidebar';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = workingHidden.indexOf(key) === -1;
      cb.addEventListener('click', function (e) { e.stopPropagation(); });
      cb.addEventListener('change', function () {
        const i = workingHidden.indexOf(key);
        if (cb.checked) { if (i !== -1) workingHidden.splice(i, 1); }
        else if (i === -1) { workingHidden.push(key); }
      });
      label.appendChild(cb);
      label.appendChild(document.createTextNode('Hiện'));
      el.appendChild(label);

      injected.push({ el: el, reorder: reorder, label: label });
    });

    renumber();
    buildToolbar();
  }

  function exitEditMode() {
    editMode = false;
    sidebar.classList.remove('nav-edit-mode');
    injected.forEach(function (rec) {
      rec.el.classList.remove('nav-shake');
      rec.el.style.order = '';
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
