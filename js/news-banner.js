(function () {
  "use strict";

  // Dùng chung worker tracker hiện có (khớp với analytics.js và spa-router.js)
  const USAGE_WORKER_URL = "https://bsdha-usage-tracker.dhabolero.workers.dev";
  const STATS_KEY = "guitar72";
  const STATS_API = `${USAGE_WORKER_URL}/stats?key=${encodeURIComponent(STATS_KEY)}&format=json`;
  const NEWS_API = `${USAGE_WORKER_URL}/news`; // xem worker-news-route.js để thêm route này

  const ICONS = {
    icd_search: "🔎", sinhhieu_generate: "📋", donthuoc_save: "💊",
    egfr_calc: "🧪", insulin_calc: "💉", ldl_calc: "🩸",
    pdf2word_convert: "📄", pdftools_use: "🛠️",
  };
  const LABELS = {
    icd_search: "lượt tra ICD-10", sinhhieu_generate: "phiếu sinh hiệu",
    donthuoc_save: "đơn thuốc đã lưu", egfr_calc: "lượt tính eGFR",
    insulin_calc: "lượt tính Insulin", ldl_calc: "lượt tính LDL-C",
    pdf2word_convert: "lượt chuyển đổi tài liệu", pdftools_use: "lượt dùng Công cụ PDF",
  };

  // Nội dung dự phòng khi API lỗi/CORS/rớt mạng — banner không bao giờ trống
  const FALLBACK_ITEMS = [
    { icon: "💡", text: "Rửa tay 6 bước đúng cách giúp giảm đáng kể nguy cơ nhiễm khuẩn bệnh viện." },
    { icon: "🩺", text: "BSDHA — bộ công cụ tra cứu &amp; tính toán nhanh phục vụ khám chữa bệnh." },
  ];

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function statItemHTML(key, count) {
    return `<span class="nb-item nb-stat"><span class="nb-icon">${ICONS[key] || "📊"}</span>${count.toLocaleString("vi-VN")} ${esc(LABELS[key] || key)} hôm nay</span>`;
  }

  function newsItemHTML(item) {
    const icon = item.type === "pubmed" ? "🌐" : "📰";
    const link = item.url
      ? `<a href="${esc(item.url)}" target="_blank" rel="noopener">${esc(item.title)}</a>`
      : esc(item.title);
    return `<span class="nb-item nb-news"><span class="nb-icon">${icon}</span>${link}<span class="nb-source"> — ${esc(item.source)}</span></span>`;
  }

  function tipItemHTML(item) {
    return `<span class="nb-item"><span class="nb-icon">${item.icon}</span>${item.text}</span>`;
  }

  function sepHTML() {
    return `<span class="nb-dot-sep">•</span>`;
  }

  function render(track, htmlPieces) {
    if (!track || !htmlPieces.length) return;
    const joined = htmlPieces.join(sepHTML());
    // Nhân đôi nội dung để loop mượt (animation dịch đúng -50%)
    track.innerHTML = joined + sepHTML() + joined + sepHTML();
    const durationSeconds = Math.max(24, Math.round(track.scrollWidth / 55));
    const banner = track.closest(".news-banner");
    if (banner) banner.style.setProperty("--nb-duration", durationSeconds + "s");
  }

  async function fetchJSON(url, timeoutMs) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs || 6000);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error("bad status");
      return await res.json();
    } finally {
      clearTimeout(t);
    }
  }

  async function loadBanner() {
    const track = document.getElementById("nbTrack");
    if (!track) return;

    const pieces = [];

    // 1) Số liệu thật hôm nay (từ /stats?format=json)
    try {
      const stats = await fetchJSON(STATS_API);
      const today = stats && stats.today;
      if (today) {
        Object.keys(today).forEach((k) => {
          if (today[k] > 0) pieces.push(statItemHTML(k, today[k]));
        });
      }
    } catch (e) { /* im lặng, banner vẫn chạy với phần còn lại */ }

    // 2) Tin tức y khoa (từ /news — cần thêm route, xem worker-news-route.js)
    try {
      const news = await fetchJSON(NEWS_API);
      (news.items || []).slice(0, 8).forEach((item) => pieces.push(newsItemHTML(item)));
    } catch (e) { /* im lặng */ }

    // 3) Nếu cả 2 nguồn đều rỗng -> dùng mẹo/tip tĩnh, banner không bao giờ trống
    if (!pieces.length) {
      FALLBACK_ITEMS.forEach((item) => pieces.push(tipItemHTML(item)));
    }

    render(track, pieces);
  }

  function initToggle() {
    const banner = document.getElementById("newsBanner");
    const btn = document.getElementById("nbToggle");
    if (!banner || !btn) return;
    btn.addEventListener("click", () => {
      const paused = banner.classList.toggle("nb-paused");
      btn.textContent = paused ? "▶" : "⏸";
      btn.title = paused ? "Chạy tiếp" : "Tạm dừng";
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initToggle();
    loadBanner();
    setInterval(loadBanner, 15 * 60 * 1000); // làm mới mỗi 15 phút nếu tab để mở lâu
  });
})();
