(function () {
  // Thông tin hiển thị (icon + tên) cho từng tính năng "Sắp ra mắt", khớp với các
  // khoá "soon:xxx" được khai báo trong js/spa-router.js.
  const SOON_META = {
    'vitals-chart': { icon: '📈', label: 'Biểu đồ theo dõi sinh hiệu theo giờ' },
    'ped-dose': { icon: '🧒', label: 'Liều thuốc trẻ em theo cân nặng' },
    'io-balance': { icon: '🧮', label: 'Cân bằng dịch vào - ra (24h)' },
    'wound-care': { icon: '🩹', label: 'Chăm sóc vết thương/loét' },
    'cam-icu': { icon: '🧠', label: 'CAM-ICU' },
    'apgar': { icon: '👶', label: 'APGAR sơ sinh' },
    'shock-index': { icon: '🚨', label: 'Chỉ số sốc (Shock Index)' },
    'padua-score': { icon: '🩺', label: 'Padua Score' },
    'transfusion-monitor': { icon: '🩸', label: 'Theo dõi truyền máu' },
    'nursing-care-plan': { icon: '📔', label: 'Kế hoạch chăm sóc điều dưỡng' },
    'vasopressor-calc': { icon: '💉', label: 'Bơm tiêm điện & thuốc vận mạch' },
    'drain-tracking': { icon: '📉', label: 'Theo dõi dẫn lưu' },
    'fluid-nutrition-peds': { icon: '🍼', label: 'Dịch truyền/nuôi ăn theo cân nặng (Nhi)' },
    'handoff-checklist': { icon: '✅', label: 'Checklist bàn giao ca' }
  };

  const iconEl = document.getElementById('soonPageIcon');
  const titleEl = document.getElementById('soonPageTitle');

  window.addEventListener('spa:navigate', (e) => {
    const key = e.detail && e.detail.key;
    if (typeof key !== 'string' || key.indexOf('soon:') !== 0) return;
    const shortKey = key.slice(5);
    const meta = SOON_META[shortKey];
    if (meta) {
      if (iconEl) iconEl.textContent = meta.icon;
      if (titleEl) titleEl.textContent = meta.label;
    }
  });

  // --- Nút "Dạ không!": hễ rê chuột/chạm gần vào là nhảy sang vị trí khác trong khung,
  // khiến người dùng không thể nào bấm trúng được. ---
  const area = document.getElementById('soonJokeArea');
  const noBtn = document.getElementById('soonNoBtn');
  const yesBtn = document.getElementById('soonYesBtn');

  function dodge() {
    if (!area || !noBtn) return;
    const areaRect = area.getBoundingClientRect();
    const btnRect = noBtn.getBoundingClientRect();
    const maxLeft = Math.max(8, areaRect.width - btnRect.width - 8);
    const maxTop = Math.max(8, areaRect.height - btnRect.height - 8);
    const newLeft = 8 + Math.random() * (maxLeft - 8);
    const newTop = 8 + Math.random() * (maxTop - 8);
    area.classList.add('soon-dodging');
    noBtn.style.left = newLeft + 'px';
    noBtn.style.top = newTop + 'px';
  }

  if (noBtn && area) {
    noBtn.addEventListener('mouseenter', dodge);
    noBtn.addEventListener('touchstart', (e) => { e.preventDefault(); dodge(); }, { passive: false });
    noBtn.addEventListener('focus', dodge);
    // Phòng khi người dùng cố lướt chuột thật nhanh vào giữa nút.
    noBtn.addEventListener('mousemove', dodge);
    // Không cho phím Tab/Enter "gian lận" để kích hoạt nút.
    noBtn.addEventListener('click', (e) => { e.preventDefault(); dodge(); });
  }

  // Đặt lại vị trí ban đầu (giữa khung) mỗi lần trang này được mở lại.
  window.addEventListener('spa:navigate', (e) => {
    const key = e.detail && e.detail.key;
    if (key !== 'undefined' && typeof key === 'string' && key.indexOf('soon:') === 0 && area && noBtn) {
      area.classList.remove('soon-dodging');
      noBtn.style.left = '';
      noBtn.style.top = '';
    }
  });

  // --- Nút "Dạ có!": hiện popup cảm ơn giữa màn hình ---
  const thanksOverlay = document.getElementById('soonThanksOverlay');
  const thanksClose = document.getElementById('soonThanksClose');

  function openThanks() {
    if (!thanksOverlay) return;
    thanksOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeThanks() {
    if (!thanksOverlay) return;
    thanksOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (yesBtn) yesBtn.addEventListener('click', openThanks);
  if (thanksClose) thanksClose.addEventListener('click', closeThanks);
  if (thanksOverlay) {
    thanksOverlay.addEventListener('click', (e) => {
      if (e.target === thanksOverlay) closeThanks();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && thanksOverlay && thanksOverlay.classList.contains('open')) closeThanks();
  });
})();
