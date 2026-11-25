window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  // --- Bộ đếm "sử dụng thật" (không phải pageview) ---
  const USAGE_WORKER_URL = 'https://bsdha-usage-tracker.dhabolero.workers.dev';
  const USAGE_DEBOUNCE_MS = 800; // gộp các lần gọi liên tiếp trong khoảng này thành 1 lượt
  // Các công cụ kích hoạt khi đang GÕ (không cần bấm nút) -> mỗi máy chỉ ghi tối đa
  // 1 lượt / 5 phút cho mỗi công cụ. Các công cụ bấm nút/in/lưu vẫn ghi từng lượt như cũ.
  const USAGE_MIN_GAP_MS = { icd_search: 300000, insulin_calc: 300000 };
  const _usageTimers = {};
  const _usageLastSent = {};
  function logUsage(action) {
    clearTimeout(_usageTimers[action]);
    _usageTimers[action] = setTimeout(() => {
      const gap = USAGE_MIN_GAP_MS[action] || 0;
      const now = Date.now();
      if (gap && _usageLastSent[action] && now - _usageLastSent[action] < gap) return;
      _usageLastSent[action] = now;
      fetch(`${USAGE_WORKER_URL}/log?action=${encodeURIComponent(action)}`, {
        method: 'POST',
        mode: 'cors',
        keepalive: true,
      }).catch(() => {}); // im lặng nếu lỗi mạng, không ảnh hưởng người dùng
    }, USAGE_DEBOUNCE_MS);
  }

  // --- "Đang online" ---
  // Ping khi mở trang, rồi mỗi 15 phút. Khi quay lại tab thì ping lại NHƯNG chỉ khi
  // lần ping trước đã cách >= 5 phút (trước đây mỗi lần chuyển tab là 1 lượt ghi D1).
  // Worker giữ phiên online 20 phút nên chu kỳ này vẫn hiển thị đúng.
  var HEARTBEAT_INTERVAL_MS = 900000; // 15 phút
  var HEARTBEAT_MIN_GAP_MS = 300000;  // 5 phút
  (function heartbeat() {
    try {
      var sid = sessionStorage.getItem('bsdha_sid');
      if (!sid) {
        sid = 'sid_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
        sessionStorage.setItem('bsdha_sid', sid);
      }
      var lastPing = 0;
      function ping(force) {
        var now = Date.now();
        if (!force && now - lastPing < HEARTBEAT_MIN_GAP_MS) return;
        lastPing = now;
        fetch(`${USAGE_WORKER_URL}/heartbeat?id=${encodeURIComponent(sid)}`, {
          method: 'POST',
          mode: 'cors',
          keepalive: true,
        }).catch(() => {});
      }
      ping(true); // gửi ngay khi tải trang
      setInterval(function () { ping(false); }, HEARTBEAT_INTERVAL_MS);
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') ping(false);
      });
    } catch (e) {
      // sessionStorage có thể bị chặn -> bỏ qua, không ảnh hưởng trang
    }
  })();

  gtag('config', 'G-C4LNNNDG5Q');
