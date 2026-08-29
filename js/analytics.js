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
  // /heartbeat định kỳ trong lúc trang còn mở. Worker ghi khóa KV với TTL khớp
  // với chu kỳ ping bên dưới (xem HEARTBEAT_INTERVAL_MS); đóng tab/mất mạng thì
  // khóa tự hết hạn, không cần dọn dẹp. Xem /stats hoặc /online để xem số người
  // đang mở trang.
  //
  // ĐÃ VÁ 27/08/2026: GIẢM TẦN SUẤT HEARTBEAT TỪ 40 GIÂY -> 5 PHÚT để giảm số
  // lượt ghi KV (mỗi heartbeat tốn ~3 lượt put() phía worker: online:<id>,
  // registerVisitor, updatePeakOnline) — đây là nguồn ghi KV liên tục, chạy
  // suốt cả ngày với mọi tab đang mở trang, và là nguyên nhân chính khiến
  // worker bsdha-usage-tracker dễ vượt hạn mức 1.000 put()/ngày của gói
  // Cloudflare Workers Free. Đổi 40s -> 5 phút giảm số lượt heartbeat khoảng
  // 7.5 lần. LƯU Ý: TTL khóa "online:<id>" trong worker (route /heartbeat)
  // cũng đã được tăng tương ứng lên 330 giây (5.5 phút) để khớp với chu kỳ
  // ping mới — nếu chỉ sửa ở đây mà không sửa TTL bên worker thì "đang online"
  // sẽ hiển thị sai (khóa hết hạn giữa 2 lần ping).
  // ĐÃ VÁ 29/08/2026: BỎ HẲN heartbeat LẶP LẠI theo setInterval.
  // Lý do: dù đã giãn từ 40s -> 5 phút, việc gọi lặp lại theo THỜI GIAN MỞ TRANG vẫn
  // khiến "mở trang càng lâu càng tốn quota put() của KV" — 1 tab mở 8 tiếng vẫn tốn
  // ~96 lượt ghi. Vì tính năng "Đang online" chỉ mang tính tham khảo (không phải chức
  // năng cốt lõi), đổi sang chỉ ping ĐÚNG 1 LẦN khi mở trang (KHÔNG lặp lại theo thời
  // gian) — mở trang bao lâu cũng chỉ tốn tối đa 1-2 lượt ghi/tab/lần mở, hoàn toàn
  // tách biệt "thời gian mở trang" khỏi "số lượt ghi KV". Đánh đổi: số "đang online"
  // sẽ hết hạn sau ~60-330s dù tab vẫn đang mở (không còn phản ánh chính xác theo thời
  // gian thực) — chấp nhận được vì đây chỉ là con số vui, không ảnh hưởng công cụ chính.
  (function heartbeatOnce() {
    try {
      var sid = sessionStorage.getItem('bsdha_sid');
      if (!sid) {
        sid = 'sid_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
        sessionStorage.setItem('bsdha_sid', sid);
      }
      // Chỉ ping 1 LẦN cho mỗi phiên trình duyệt (sessionStorage) — không lặp lại,
      // dù tab có mở 1 phút hay 8 tiếng thì cũng chỉ đúng 1 lượt gọi này.
      var alreadyPinged = sessionStorage.getItem('bsdha_hb_sent');
      if (!alreadyPinged) {
        fetch(`${USAGE_WORKER_URL}/heartbeat?id=${encodeURIComponent(sid)}`, {
          method: 'POST',
          mode: 'cors',
          keepalive: true,
        }).catch(() => {});
        sessionStorage.setItem('bsdha_hb_sent', '1');
      }
    } catch (e) {
      // sessionStorage có thể bị chặn (chế độ ẩn danh nghiêm ngặt) -> bỏ qua, không ảnh hưởng trang
    }
  })();

  gtag('config', 'G-C4LNNNDG5Q');
