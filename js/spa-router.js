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

  const PATH_MAP = { '/': 'home', '/icd10': 'icd', '/icd10/': 'icd', '/thongke': 'thongke', '/thongke/': 'thongke', '/sinhhieu': 'sinhhieu', '/sinhhieu/': 'sinhhieu', '/insulin': 'insulin', '/insulin/': 'insulin', '/ldl': 'ldl', '/ldl/': 'ldl', '/egfr': 'egfr', '/egfr/': 'egfr', '/dichtruyen': 'dichtruyen', '/dichtruyen/': 'dichtruyen', '/tuongtacthuoc': 'tuongtac', '/tuongtacthuoc/': 'tuongtac', '/donthuoc': 'donthuoc', '/donthuoc/': 'donthuoc', '/pdf2word': 'pdf2word', '/pdf2word/': 'pdf2word', '/pdftools': 'pdftools', '/pdftools/': 'pdftools', '/chuyentuyen': 'chuyentuyen', '/chuyentuyen/': 'chuyentuyen', '/nghiviecbhxh': 'nghiviecbhxh', '/nghiviecbhxh/': 'nghiviecbhxh', '/giayravien': 'giayravien', '/giayravien/': 'giayravien', '/ghepcccd': 'cccd', '/ghepcccd/': 'cccd', '/clinical-scores': 'clinicalscores', '/clinical-scores/': 'clinicalscores' };
  const KEY_PATH = { home: '/', icd: '/icd10', thongke: '/thongke', sinhhieu: '/sinhhieu', insulin: '/insulin', ldl: '/ldl', egfr: '/egfr', dichtruyen: '/dichtruyen', tuongtac: '/tuongtacthuoc', donthuoc: '/donthuoc', pdf2word: '/pdf2word', pdftools: '/pdftools', chuyentuyen: '/chuyentuyen', nghiviecbhxh: '/nghiviecbhxh', giayravien: '/giayravien', cccd: '/ghepcccd', clinicalscores: '/clinical-scores' };

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

  // --- Khoá "chỉ dành cho nội bộ" cho 3 trang: Phiếu chuyển tuyến, Giấy nghỉ
  // việc BHXH, Giấy ra viện. Yêu cầu nhập mật khẩu cố định 1 lần mỗi phiên trình duyệt (sessionStorage — tự
  // yêu cầu lại khi tắt hẳn trình duyệt rồi mở lại, không hỏi lại khi chỉ chuyển tab/trang).
  const GUARDED_PAGES = ['thongke', 'chuyentuyen', 'nghiviecbhxh', 'giayravien'];
  const INTERNAL_PASSWORD = 'cs2';
  const UNLOCK_FLAG = 'bsdha_internal_unlocked';
  let lockModalEl = null;

  function isUnlocked() {
    return sessionStorage.getItem(UNLOCK_FLAG) === '1';
  }

  function ensureLockModal() {
    if (lockModalEl) return lockModalEl;
    const overlay = document.createElement('div');
    overlay.className = 'ilock-overlay';
    overlay.innerHTML =
      '<div class="ilock-box" role="dialog" aria-modal="true" aria-labelledby="ilockTitle">' +
        '<div class="ilock-icon">🔒</div>' +
        '<div id="ilockTitle" class="ilock-title">Chỉ dành cho nội bộ, vui lòng nhập mật&nbsp;khẩu!</div>' +
        '<form class="ilock-form" id="ilockForm" autocomplete="off">' +
          '<input type="password" id="ilockInput" class="ilock-input" placeholder="Mật khẩu" autocomplete="off">' +
          '<div class="ilock-err" id="ilockErr" hidden>Mật khẩu không đúng, vui lòng thử lại.</div>' +
          '<div class="ilock-actions">' +
            '<button type="button" class="ilock-cancel" id="ilockCancel">Huỷ</button>' +
            '<button type="submit" class="ilock-submit">Xác nhận</button>' +
          '</div>' +
        '</form>' +
      '</div>';
    document.body.appendChild(overlay);
    lockModalEl = overlay;
    return overlay;
  }

  function requestUnlock(onSuccess, onCancel) {
    const overlay = ensureLockModal();
    const form = overlay.querySelector('#ilockForm');
    const input = overlay.querySelector('#ilockInput');
    const err = overlay.querySelector('#ilockErr');
    const cancelBtn = overlay.querySelector('#ilockCancel');

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
      if (input.value === INTERNAL_PASSWORD) {
        sessionStorage.setItem(UNLOCK_FLAG, '1');
        cleanup();
        if (onSuccess) onSuccess();
      } else {
        err.hidden = false;
        input.value = '';
        input.focus();
        overlay.querySelector('.ilock-box').classList.remove('ilock-shake');
        void overlay.offsetWidth; // restart animation
        overlay.querySelector('.ilock-box').classList.add('ilock-shake');
      }
    }
    function onCancelClick() {
      cleanup();
      if (onCancel) onCancel();
    }
    form.addEventListener('submit', onSubmit);
    cancelBtn.addEventListener('click', onCancelClick);
  }

  // Cho phép các script khác (VD widget số liệu KCB) dùng chung cơ chế khoá mật
  // khẩu "cs2" và cùng 1 trạng thái mở-khoá theo phiên trình duyệt.
  window.BSDHA_LOCK = { isUnlocked, requestUnlock };

  function actuallyShowPage(key, push) {
    pages.forEach(p => p.classList.toggle('active', p.id === 'page-' + key));
    navEls.forEach(b => {
      if (b.classList.contains('home-btn')) return;
      b.classList.toggle('active', b.dataset.page === key);
    });
    window.scrollTo({ top: 0 });
    focusFirstField(key);
    if (push) {
      const path = KEY_PATH[key] || '/';
      if (location.pathname !== path) history.pushState({ page: key }, '', path);
    }
  }

  function showPage(key, push) {
    if (GUARDED_PAGES.indexOf(key) !== -1 && !isUnlocked()) {
      requestUnlock(() => actuallyShowPage(key, push));
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
