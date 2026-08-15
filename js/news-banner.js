(function () {
  "use strict";

  // Dùng chung worker tracker hiện có (khớp với analytics.js và spa-router.js)
  const USAGE_WORKER_URL = "https://bsdha-usage-tracker.dhabolero.workers.dev";
  // Banner chỉ cần TỔNG số liệu -> dùng route nhẹ /totals (nhanh, ổn định dù dữ liệu nhiều),
  // không dùng /stats?format=json nữa vì route đó còn quét cả breakdown theo ngày (chậm dần theo thời gian).
  // /totals không cần mật khẩu vì số liệu này vốn đã hiển thị công khai trên banner cho mọi người xem.
  const STATS_API = `${USAGE_WORKER_URL}/totals`;
  const NEWS_API = `${USAGE_WORKER_URL}/news`; // xem worker-news-route.js để thêm route này
  const READ_API = `${USAGE_WORKER_URL}/read`; // lấy nội dung bài viết để hiển thị trong popup

  const ICONS = {
    icd_search: "🔎", sinhhieu_generate: "📋", donthuoc_save: "💊",
    egfr_calc: "🧪", insulin_calc: "💉", ldl_calc: "🩸",
    pdf2word_convert: "📄", pdftools_use: "🛠️",
  };
  const LABELS = {
    icd_search: "lượt tra ICD-10", sinhhieu_generate: "phiếu sinh hiệu",
    donthuoc_save: "lượt kê đơn thuốc", egfr_calc: "lượt tính eGFR",
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
    return `<span class="nb-item nb-stat"><span class="nb-icon">${ICONS[key] || "📊"}</span>${count.toLocaleString("vi-VN")} ${esc(LABELS[key] || key)}</span>`;
  }

  function newsItemHTML(item) {
    const icon = item.type === "pubmed" ? "🌐" : "📰";
    const validUrl = item.url && /^https?:\/\//i.test(item.url);
    const link = validUrl
      ? `<a href="#" class="nb-news-link" data-url="${esc(item.url)}" data-title="${esc(item.title)}" data-source="${esc(item.source)}">${esc(item.title)}</a>`
      : esc(item.title);
    return `<span class="nb-item nb-news"><span class="nb-icon">${icon}</span>${link}<span class="nb-source"> — ${esc(item.source)}</span></span>`;
  }

  // ===== Popup đọc tin ngay trên trang (không rời sang tab khác) =====
  let nbModalEl = null;

  function ensureNewsModal() {
    if (nbModalEl) return nbModalEl;
    const modal = document.createElement("div");
    modal.className = "nb-modal-overlay";
    modal.id = "nbNewsModal";
    modal.innerHTML = `
      <div class="nb-modal-box" role="dialog" aria-modal="true" aria-labelledby="nbModalTitle">
        <div class="nb-modal-head">
          <div class="nb-modal-titlewrap">
            <span id="nbModalTitle" class="nb-modal-title"></span>
            <span id="nbModalSource" class="nb-modal-source"></span>
          </div>
          <div class="nb-modal-actions">
            <a id="nbModalOpenNew" href="#" target="_blank" rel="noopener" class="nb-modal-newtab" title="Mở trong tab mới">↗</a>
            <button type="button" class="nb-modal-close" id="nbModalCloseBtn" title="Đóng" aria-label="Đóng">✕</button>
          </div>
        </div>
        <div class="nb-modal-body">
          <div class="nb-modal-loading" id="nbModalLoading">Đang tải bài viết...</div>
          <div id="nbModalArticle" class="nb-modal-article"></div>
        </div>
      </div>`;
    document.body.appendChild(modal);

    const closeBtn = modal.querySelector("#nbModalCloseBtn");

    function close() {
      modal.classList.remove("open");
      document.body.classList.remove("nb-modal-lock");
      modal.querySelector("#nbModalArticle").innerHTML = "";
    }
    closeBtn.addEventListener("click", close);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("open")) close();
    });

    nbModalEl = modal;
    return modal;
  }

  async function openNewsModal(url, title, source) {
    const modal = ensureNewsModal();
    modal.querySelector("#nbModalTitle").textContent = title || "";
    modal.querySelector("#nbModalSource").textContent = source ? "— " + source : "";
    modal.querySelector("#nbModalOpenNew").href = url;
    const loading = modal.querySelector("#nbModalLoading");
    const article = modal.querySelector("#nbModalArticle");
    article.innerHTML = "";
    loading.style.display = "flex";
    loading.textContent = "Đang tải bài viết...";
    modal.classList.add("open");
    document.body.classList.add("nb-modal-lock");

    try {
      const data = await fetchJSON(`${READ_API}?url=${encodeURIComponent(url)}`, 12000);
      if (!data || data.ok === false) throw new Error((data && data.error) || "lỗi tải bài viết");

      if (data.title) modal.querySelector("#nbModalTitle").textContent = data.title;

      const imgHTML = data.image
        ? `<img src="${esc(data.image)}" alt="" class="nb-article-img">`
        : "";
      const bodyHTML = (data.paragraphs || [])
        .map((p) => `<p>${esc(p)}</p>`)
        .join("");

      article.innerHTML = imgHTML + bodyHTML;
      loading.style.display = "none";
    } catch (err) {
      loading.innerHTML =
        'Không tải được nội dung bài viết ngay lúc này. <a href="' + esc(url) + '" target="_blank" rel="noopener">Mở trong tab mới</a>.';
    }
  }

  document.addEventListener("click", (e) => {
    const link = e.target.closest(".nb-news-link");
    if (!link) return;
    e.preventDefault();
    openNewsModal(link.dataset.url, link.dataset.title, link.dataset.source);
  });

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

  // ===== Dòng số liệu: hiện từng số liệu, canh giữa, mờ dần rồi đổi số khác =====
  let statsCycleTimer = null;

  function renderStatsCycle(track, htmlPieces, intervalMs) {
    if (statsCycleTimer) {
      clearInterval(statsCycleTimer);
      statsCycleTimer = null;
    }
    if (!track || !htmlPieces.length) return;

    let idx = 0;
    const banner = track.closest(".news-banner");

    function show(i) {
      track.classList.add("nb-stat-fade");
      setTimeout(() => {
        track.innerHTML = htmlPieces[i];
        track.classList.remove("nb-stat-fade");
      }, 450);
    }

    show(idx);
    if (htmlPieces.length <= 1) return; // chỉ 1 số liệu -> không cần xoay vòng

    statsCycleTimer = setInterval(() => {
      if (banner && banner.classList.contains("nb-paused")) return;
      idx = (idx + 1) % htmlPieces.length;
      show(idx);
    }, intervalMs || 3500);
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
    const statsTrack = document.getElementById("nbStatsTrack");
    const newsTrack = document.getElementById("nbTrack");
    if (!statsTrack && !newsTrack) return;

    const statsPieces = [];
    const newsPieces = [];

    // 1) Số liệu tổng cộng, toàn thời gian (từ /stats?format=json -> totals) — dòng riêng
    // Chỉ hiển thị TỔNG, không hiển thị số theo từng ngày (số theo ngày còn ít, chưa đáng nói).
    try {
      const stats = await fetchJSON(STATS_API, 8000);
      const totals = stats && stats.totals;
      if (totals) {
        Object.keys(totals).forEach((k) => {
          if (totals[k] > 0) statsPieces.push(statItemHTML(k, totals[k]));
        });
      }
    } catch (e) { /* im lặng, banner vẫn chạy với phần còn lại */ }

    // 2) Tin tức y khoa (từ /news — cần thêm route, xem worker-news-route.js) — dòng riêng
    try {
      const news = await fetchJSON(NEWS_API);
      (news.items || []).slice(0, 8).forEach((item) => newsPieces.push(newsItemHTML(item)));
    } catch (e) { /* im lặng */ }

    // 3) Nếu dòng tin tức rỗng -> dùng mẹo/tip tĩnh, banner không bao giờ trống
    if (!newsPieces.length) {
      FALLBACK_ITEMS.forEach((item) => newsPieces.push(tipItemHTML(item)));
    }
    // Nếu dòng số liệu rỗng (chưa có lượt dùng nào) -> ẩn hẳn dòng đó
    const statsBanner = document.getElementById("statsBanner");
    if (!statsPieces.length) {
      if (statsBanner) statsBanner.style.display = "none";
    } else {
      if (statsBanner) statsBanner.style.display = "";
      if (statsTrack) renderStatsCycle(statsTrack, statsPieces);
    }

    if (newsTrack) render(newsTrack, newsPieces);
  }

  function initToggle(bannerId, btnId) {
    const banner = document.getElementById(bannerId);
    const btn = document.getElementById(btnId);
    if (!banner || !btn) return;
    btn.addEventListener("click", () => {
      const paused = banner.classList.toggle("nb-paused");
      btn.textContent = paused ? "▶" : "⏸";
      btn.title = paused ? "Chạy tiếp" : "Tạm dừng";
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initToggle("statsBanner", "nbStatsToggle");
    initToggle("newsBanner", "nbToggle");
    loadBanner();
    setInterval(loadBanner, 15 * 60 * 1000); // làm mới mỗi 15 phút nếu tab để mở lâu
  });
})();
