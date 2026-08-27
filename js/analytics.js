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

  // --- "Đang online" ---
  // Mỗi trình duyệt tự sinh 1 sessionId (chỉ tồn tại trong tab hiện tại), rồi gọi
  // /heartbeat định kỳ trong lúc trang còn mở. Worker ghi khóa KV với TTL 60 giây;
  // đóng tab/mất mạng thì khóa tự hết hạn, không cần dọn dẹp. Xem /stats hoặc /online
  // để xem số người đang mở trang.
  (function heartbeat() {
    try {
      var sid = sessionStorage.getItem('bsdha_sid');
      if (!sid) {
        sid = 'sid_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
        sessionStorage.setItem('bsdha_sid', sid);
      }
      function ping() {
        fetch(`${USAGE_WORKER_URL}/heartbeat?id=${encodeURIComponent(sid)}`, {
          method: 'POST',
          mode: 'cors',
          keepalive: true,
        }).catch(() => {});
      }
      ping(); // gửi ngay khi tải trang
      setInterval(ping, 40000); // lặp lại mỗi 40 giây (TTL khóa là 60 giây, có dư thời gian)
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') ping();
      });
    } catch (e) {
      // sessionStorage có thể bị chặn (chế độ ẩn danh nghiêm ngặt) -> bỏ qua, không ảnh hưởng trang
    }
  })();

  gtag('config', 'G-C4LNNNDG5Q');
