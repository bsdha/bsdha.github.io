(function () {
  // Khôi phục đường dẫn thật nếu vừa được 404.html chuyển hướng tới (kỹ thuật SPA cho GitHub Pages)
  (function restoreRoute() {
    const redirect = sessionStorage.getItem('spa-redirect');
    if (redirect) {
      sessionStorage.removeItem('spa-redirect');
      if (redirect !== location.pathname + location.search + location.hash) {
        history.replaceState(null, '', redirect);
      }
    }
  })();

  const pages = document.querySelectorAll('.page');
  const navEls = document.querySelectorAll('[data-page]');

  const PATH_MAP = { '/': 'home', '/icd10': 'icd', '/icd10/': 'icd', '/thongkekcb-bvdkbdcs2': 'thongke', '/thongkekcb-bvdkbdcs2/': 'thongke', '/sinhhieu': 'sinhhieu', '/sinhhieu/': 'sinhhieu', '/insulin': 'insulin', '/insulin/': 'insulin', '/duonghuyet': 'glucose', '/duonghuyet/': 'glucose', '/ldl': 'ldl', '/ldl/': 'ldl', '/egfr': 'egfr', '/egfr/': 'egfr', '/dichtruyen': 'dichtruyen', '/dichtruyen/': 'dichtruyen', '/bmi': 'bmi', '/bmi/': 'bmi', '/tuongtacthuoc': 'tuongtac', '/tuongtacthuoc/': 'tuongtac', '/donthuoc': 'donthuoc', '/donthuoc/': 'donthuoc', '/pdf2word': 'pdf2word', '/pdf2word/': 'pdf2word', '/pdftools': 'pdftools', '/pdftools/': 'pdftools', '/chuyentuyen': 'chuyentuyen', '/chuyentuyen/': 'chuyentuyen', '/nghiviecbhxh': 'nghiviecbhxh', '/nghiviecbhxh/': 'nghiviecbhxh', '/giayravien': 'giayravien', '/giayravien/': 'giayravien', '/ghepcccd': 'cccd', '/ghepcccd/': 'cccd', '/clinical-scores': 'clinicalscores', '/clinical-scores/': 'clinicalscores', '/helix': 'helix', '/helix/': 'helix' };
  const KEY_PATH = { home: '/', icd: '/icd10', thongke: '/thongkekcb-bvdkbdcs2', sinhhieu: '/sinhhieu', insulin: '/insulin', glucose: '/duonghuyet', ldl: '/ldl', egfr: '/egfr', dichtruyen: '/dichtruyen', bmi: '/bmi', tuongtac: '/tuongtacthuoc', donthuoc: '/donthuoc', pdf2word: '/pdf2word', pdftools: '/pdftools', chuyentuyen: '/chuyentuyen', nghiviecbhxh: '/nghiviecbhxh', giayravien: '/giayravien', cccd: '/ghepcccd', clinicalscores: '/clinical-scores', helix: '/helix' };

  // --- Các tính năng "Sắp ra mắt": mỗi mục có đường dẫn riêng, nhưng cùng dùng chung
  // 1 trang nội dung "page-comingsoon" (xem actuallyShowPage bên dưới). ---
  const SOON_KEYS = [
    'vitals-chart', 'ped-dose', 'io-balance', 'wound-care', 'cam-icu', 'apgar',
    'shock-index', 'padua-score', 'transfusion-monitor', 'nursing-care-plan',
    'vasopressor-calc', 'drain-tracking', 'fluid-nutrition-peds',
    'handoff-checklist', 'gcs-score', 'ped-pain-scale', 'ped-fall-risk',
    'antibiotic-renal-dose', 'insulin-sliding-scale', 'postop-pain-tracking',
    'cvc-care-checklist', 'tube-feeding-tracker', 'fever-dose-calc',
    'ventilator-monitor', 'pressure-ulcer-prevention', 'immunization-tracker',
    'seizure-log', 'sofa-score', 'bp-trend-chart'
  ];
  SOON_KEYS.forEach(k => {
    const path = '/' + k;
    const key = 'soon:' + k;
    PATH_MAP[path] = key;
    PATH_MAP[path + '/'] = key;
    KEY_PATH[key] = path;
  });

  // Danh sách bệnh nhân nội trú (bảng sinh hiệu đi buồng) — tính năng đã hoạt động thật.
  PATH_MAP['/ward-vitals-sheet'] = 'wardvitals';
  PATH_MAP['/ward-vitals-sheet/'] = 'wardvitals';
  KEY_PATH['wardvitals'] = '/ward-vitals-sheet';

  function focusFirstField(key) {
    const pageEl = document.getElementById('page-' + key);
    if (!pageEl) return;
    // Bỏ qua trang chủ (không có ô nhập nào) và chỉ tự động focus khi vừa chuyển trang, để tiện
    // gõ ngay mà không cần bấm chuột/chạm vào ô đầu tiên trước. Bỏ qua input ẩn (VD: input file
    // ẩn của trang PDF→Word, vốn được kích hoạt qua vùng kéo-thả chứ không phải gõ chữ).
    const field = pageEl.querySelector(
      'input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]):not([hidden]):not([readonly]):not([disabled]), textarea, select'
    );
    if (!field) return;
    // Trì hoãn 1 khung hình để đảm bảo trang đã thực sự hiển thị (display đổi qua class "active")
    // trước khi focus, tránh bị trình duyệt bỏ qua yêu cầu focus trên phần tử còn đang ẩn.
    requestAnimationFrame(() => {
      field.focus({ preventScroll: true });
      if (typeof field.select === 'function' && field.type !== 'date') field.select();
    });
  }

  // --- Khoá mật khẩu cho một số trang. Mỗi "nhóm" có mật khẩu và trạng thái
  // mở-khoá (sessionStorage) riêng, không ảnh hưởng lẫn nhau. Yêu cầu nhập mật
  // khẩu cố định 1 lần mỗi phiên trình duyệt (tự yêu cầu lại khi tắt hẳn trình
  // duyệt rồi mở lại, không hỏi lại khi chỉ chuyển tab/trang).
  const GUARD_GROUPS = [
    {
      // Thống kê tiếp nhận, Phiếu chuyển tuyến, Giấy nghỉ việc BHXH, Giấy ra viện
      keys: ['thongke', 'chuyentuyen', 'nghiviecbhxh', 'giayravien'],
      password: 'cs2',
      flag: 'bsdha_internal_unlocked',
      title: 'Chỉ dành cho Admin, vui lòng nhập mật&nbsp;khẩu!'
    },
    {
      // Tiện ích Helix
      keys: ['helix'],
      password: 'helix2026',
      flag: 'bsdha_helix_unlocked',
      title: 'Trang Tiện ích Helix, vui lòng nhập mật&nbsp;khẩu!'
    }
  ];
  const GUARDED_PAGES = GUARD_GROUPS.reduce((acc, g) => acc.concat(g.keys), []);
  const lockModalEls = {};

  function findGuardGroup(key) {
    return GUARD_GROUPS.find(g => g.keys.indexOf(key) !== -1) || null;
  }

  function isGroupUnlocked(group) {
    return sessionStorage.getItem(group.flag) === '1';
  }

  // Giữ tương thích ngược: isUnlocked()/requestUnlock() mặc định thao tác trên
  // nhóm mật khẩu nội bộ "cs2" (dùng bởi các script khác như widget số liệu KCB).
  const internalGroup = GUARD_GROUPS[0];
  function isUnlocked() {
    return isGroupUnlocked(internalGroup);
  }

  function ensureLockModal(group) {
    if (lockModalEls[group.flag]) return lockModalEls[group.flag];
    const overlay = document.createElement('div');
    overlay.className = 'ilock-overlay';
    overlay.innerHTML =
      '<div class="ilock-box" role="dialog" aria-modal="true" aria-labelledby="ilockTitle-' + group.flag + '">' +
        '<div class="ilock-icon">🔒</div>' +
        '<div id="ilockTitle-' + group.flag + '" class="ilock-title">' + group.title + '</div>' +
        '<form class="ilock-form" autocomplete="off">' +
          '<input type="password" class="ilock-input" placeholder="Mật khẩu" autocomplete="off">' +
          '<div class="ilock-err" hidden>Mật khẩu không đúng, vui lòng thử lại.</div>' +
          '<div class="ilock-actions">' +
            '<button type="button" class="ilock-cancel">Huỷ</button>' +
            '<button type="submit" class="ilock-submit">Xác nhận</button>' +
          '</div>' +
        '</form>' +
      '</div>';
    document.body.appendChild(overlay);
    lockModalEls[group.flag] = overlay;
    return overlay;
  }

  function requestUnlockForGroup(group, onSuccess, onCancel) {
    const overlay = ensureLockModal(group);
    const form = overlay.querySelector('.ilock-form');
    const input = overlay.querySelector('.ilock-input');
    const err = overlay.querySelector('.ilock-err');
    const cancelBtn = overlay.querySelector('.ilock-cancel');
    let failCount = 0;
    const MAX_FAILS = 3;

    err.hidden = true;
    input.value = '';
    overlay.classList.add('open');
    document.body.classList.add('ilock-lock');
    requestAnimationFrame(() => input.focus());

    function cleanup() {
      overlay.classList.remove('open');
      document.body.classList.remove('ilock-lock');
      form.removeEventListener('submit', onSubmit);
      cancelBtn.removeEventListener('click', onCancelClick);
    }
    function onSubmit(e) {
      e.preventDefault();
      if (input.value === group.password) {
        sessionStorage.setItem(group.flag, '1');
        cleanup();
        if (onSuccess) onSuccess();
        return;
      }
      failCount++;
      if (failCount >= MAX_FAILS) {
        sessionStorage.setItem(group.flag, '1');
        cleanup();
        if (onSuccess) onSuccess();
        return;
      }
      err.hidden = false;
      input.value = '';
      input.focus();
      overlay.querySelector('.ilock-box').classList.remove('ilock-shake');
      void overlay.offsetWidth; // restart animation
      overlay.querySelector('.ilock-box').classList.add('ilock-shake');
    }
    function onCancelClick() {
      cleanup();
      if (onCancel) onCancel();
    }
    form.addEventListener('submit', onSubmit);
    cancelBtn.addEventListener('click', onCancelClick);
  }

  function requestUnlock(onSuccess, onCancel) {
    requestUnlockForGroup(internalGroup, onSuccess, onCancel);
  }

  // Cho phép các script khác (VD widget số liệu KCB) dùng chung cơ chế khoá mật
  // khẩu "cs2" và cùng 1 trạng thái mở-khoá theo phiên trình duyệt.
  window.BSDHA_LOCK = { isUnlocked, requestUnlock };

  function actuallyShowPage(key, push) {
    // Các trang "Sắp ra mắt" (key dạng "soon:xxx") đều hiển thị chung nội dung của
    // #page-comingsoon, chỉ khác nhau ở đường dẫn URL và mục đang được tô sáng ở menu.
    const isSoon = typeof key === 'string' && key.indexOf('soon:') === 0;
    const pageElId = isSoon ? 'page-comingsoon' : 'page-' + key;
    pages.forEach(p => p.classList.toggle('active', p.id === pageElId));
    navEls.forEach(b => {
      if (b.classList.contains('home-btn')) return;
      b.classList.toggle('active', b.dataset.page === key);
    });
    window.scrollTo({ top: 0 });
    if (!isSoon) focusFirstField(key);
    if (push) {
      const path = KEY_PATH[key] || '/';
      if (location.pathname !== path) history.pushState({ page: key }, '', path);
    }
    // Báo cho coming-soon.js biết mục nào vừa được mở, để cập nhật tiêu đề/icon phù hợp.
    window.dispatchEvent(new CustomEvent('spa:navigate', { detail: { key } }));
  }

  function showPage(key, push) {
    const group = findGuardGroup(key);
    if (group && !isGroupUnlocked(group)) {
      requestUnlockForGroup(group, () => actuallyShowPage(key, push));
      return;
    }
    actuallyShowPage(key, push);
  }

  navEls.forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      showPage(el.dataset.page, true);
    });
  });

  window.addEventListener('popstate', () => {
    const key = PATH_MAP[location.pathname] || 'home';
    showPage(key, false);
  });

  const initialKey = PATH_MAP[location.pathname] || 'home';
  showPage(initialKey, false);

  const footerYearEl = document.getElementById('footerYear');
  if (footerYearEl) footerYearEl.textContent = new Date().getFullYear();

  // --- Phím tắt riêng: Ctrl+Shift+K -> mở trang thống kê lượt sử dụng (desktop) ---
  const STATS_URL = 'https://bsdha-usage-tracker.dhabolero.workers.dev/stats?key=guitar72';
  function openStatsPrompt() {
    window.open(STATS_URL, '_blank');
  }

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'K' || e.key === 'k')) {
      e.preventDefault();
      openStatsPrompt();
    }
  });

  // --- Nhấn giữ ~3 giây vào footer (chuột hoặc chạm tay) -> mở trang thống kê ---
  const siteFooterEl = document.getElementById('siteFooter');
  if (siteFooterEl) {
    let holdTimer = null;
    const startHold = () => {
      clearTimeout(holdTimer);
      holdTimer = setTimeout(() => {
        holdTimer = null;
        openStatsPrompt();
      }, 3000);
    };
    const cancelHold = () => {
      clearTimeout(holdTimer);
      holdTimer = null;
    };
    siteFooterEl.addEventListener('mousedown', startHold);
    siteFooterEl.addEventListener('mouseup', cancelHold);
    siteFooterEl.addEventListener('mouseleave', cancelHold);
    siteFooterEl.addEventListener('touchstart', startHold, { passive: true });
    siteFooterEl.addEventListener('touchend', cancelHold);
    siteFooterEl.addEventListener('touchcancel', cancelHold);
  }
})();
