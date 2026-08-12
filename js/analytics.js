  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  // --- Bộ đếm "sử dụng thật" (không phải pageview) ---
  // Đổi WORKER_URL thành URL Worker của bạn sau khi deploy (xem README trong usage-worker/).
  const USAGE_WORKER_URL = 'https://bsdha-usage-tracker.dhabolero.workers.dev';
  const USAGE_DEBOUNCE_MS = 800; // gộp các lần gọi liên tiếp trong khoảng này thành 1 lượt
  const _usageTimers = {};
  function logUsage(action) {
    clearTimeout(_usageTimers[action]);
    _usageTimers[action] = setTimeout(() => {
      fetch(`${USAGE_WORKER_URL}/log?action=${encodeURIComponent(action)}`, {
        method: 'POST',
        mode: 'cors',
        keepalive: true,
      }).catch(() => {}); // im lặng nếu lỗi mạng, không ảnh hưởng người dùng
    }, USAGE_DEBOUNCE_MS);
  }

  // --- Lưu đơn thuốc đã ẩn danh 1 phần (không gửi tên đầy đủ, không gửi địa chỉ) ---
  // Token này chỉ để chặn spam ghi dữ liệu rác, KHÔNG phải mật khẩu bảo mật xem lại
  // (trang xem lại dùng RX_KEY riêng, gõ tay, không nằm trong file này).
  const RX_WRITE_TOKEN = 'bsdha-rx-write-2026';
  function maskPatientName(fullName) {
    if (!fullName) return '';
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    return parts.map(p => p.charAt(0).toUpperCase()).join('.');
  }
  function savePrescriptionRecord(data) {
    fetch(`${USAGE_WORKER_URL}/prescriptions`, {
      method: 'POST',
      mode: 'cors',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: RX_WRITE_TOKEN, ...data }),
    }).catch(() => {}); // im lặng nếu lỗi mạng, không ảnh hưởng việc xuất PDF
  }

  gtag('config', 'G-C4LNNNDG5Q');
