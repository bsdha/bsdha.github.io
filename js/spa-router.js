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

  const PATH_MAP = { '/': 'home', '/icd10': 'icd', '/icd10/': 'icd', '/sinhhieu': 'sinhhieu', '/sinhhieu/': 'sinhhieu', '/insulin': 'insulin', '/insulin/': 'insulin', '/ldl': 'ldl', '/ldl/': 'ldl', '/egfr': 'egfr', '/egfr/': 'egfr', '/tuongtacthuoc': 'tuongtac', '/tuongtacthuoc/': 'tuongtac', '/donthuoc': 'donthuoc', '/donthuoc/': 'donthuoc', '/pdf2word': 'pdf2word', '/pdf2word/': 'pdf2word', '/pdftools': 'pdftools', '/pdftools/': 'pdftools', '/chuyentuyen': 'chuyentuyen', '/chuyentuyen/': 'chuyentuyen', '/nghiviecbhxh': 'nghiviecbhxh', '/nghiviecbhxh/': 'nghiviecbhxh' };
  const KEY_PATH = { home: '/', icd: '/icd10', sinhhieu: '/sinhhieu', insulin: '/insulin', ldl: '/ldl', egfr: '/egfr', tuongtac: '/tuongtacthuoc', donthuoc: '/donthuoc', pdf2word: '/pdf2word', pdftools: '/pdftools', chuyentuyen: '/chuyentuyen', nghiviecbhxh: '/nghiviecbhxh' };

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

  function showPage(key, push) {
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
