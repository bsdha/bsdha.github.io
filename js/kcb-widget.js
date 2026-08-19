/**
 * Widget "Số liệu KCB" ở góc trên-trái trang chủ — đọc trực tiếp từ Google Sheet
 * "BÁO CÁO SỐ LIỆU KCB CS2_BTU" (không qua Worker/backend nào), hiển thị số liệu
 * theo kiểu mờ dần rồi đổi số khác (giống banner thống kê), có nút xổ xuống xem
 * chi tiết từng phòng khám theo Hôm nay / Tổng tháng.
 *
 * YÊU CẦU: Sheet phải để chế độ chia sẻ "Bất kỳ ai có đường liên kết đều xem được"
 * (Chia sẻ -> Người xem), vì trang được fetch thẳng từ trình duyệt người dùng,
 * không qua tài khoản Google nào cả.
 *
 * TỰ ĐỘNG XÁC ĐỊNH TAB THÁNG HIỆN TẠI (không cần sửa gid tay mỗi tháng):
 *   Thay vì trỏ cứng vào 1 "gid", Google Sheets gviz cho phép gọi CSV theo TÊN TAB
 *   qua tham số "sheet=" (thay cho "gid="). Vì các tab được đặt tên theo đúng quy
 *   luật "THÁNG {tháng}/{năm}" (VD "THÁNG 8/2026", không có số 0 phía trước), script
 *   tự tính tên tab của tháng hiện tại từ ngày giờ máy người dùng. Nếu gọi tab tháng
 *   hiện tại thất bại (VD đầu tháng, tab mới chưa kịp tạo), tự thử lùi về tên tab
 *   tháng trước đó trước khi báo lỗi hẳn.
 */
(function () {
  const SHEET_ID = "1nsx9ew0fDMfyNDyzUq1h8jTRtafnxswo01F8Z8wLazc";

  function sheetTabName(monthsAgo) {
    const d = new Date();
    d.setDate(1); // tránh lệch tháng khi trừ ở các ngày cuối tháng
    d.setMonth(d.getMonth() - (monthsAgo || 0));
    return "THÁNG " + (d.getMonth() + 1) + "/" + d.getFullYear();
  }
  function csvUrlForSheetName(name) {
    return (
      "https://docs.google.com/spreadsheets/d/" + SHEET_ID +
      "/gviz/tq?tqx=out:csv&sheet=" + encodeURIComponent(name)
    );
  }

  const CYCLE_MS = 3500;
  const CACHE_KEY = "kcbWidgetCache_v2";
  const REFRESH_MS = 3 * 60 * 1000; // 3 phút — tự động làm mới, không cần F5
  const CACHE_MS = REFRESH_MS; // cache khớp với chu kỳ làm mới, tránh gọi Sheet thừa khi vừa load trang

  // Nhãn các phòng khám cần lấy (khớp với cột B trong sheet). "TỔNG_KB" là dòng
  // tổng lượt khám mỗi ngày (dòng "KHÁM"), hiển thị riêng ở phần rút gọn phía trên.
  const TOTAL_LABEL = "TỔNG_KB";
  const DEPT_LABELS = [
    "PK CS2_Nội TH 1", "PK CS2_Nội TH 2", "PK CS2_Nội TH 3", "PK CS2_Ngoại TH",
    "PK CS2_Phụ Sản", "PK CS2_Nhi", "PK CS2_Mắt", "PK CS2_RHM", "PK CS2_TMH",
    "PK CS2_YHCT", "PK CS2_CC", "PK CS2_Dịch vụ", "Khám Sức khỏe", "Tiêm ngừa",
  ];
  const MONTHLY_TOTAL_HEADER = "TỔNG_THÁNG";

  function norm(s) {
    return String(s == null ? "" : s).replace(/\s+/g, " ").trim();
  }
  function normKey(s) {
    return norm(s).toLowerCase();
  }

  // Parser CSV đơn giản, có xử lý trường trong dấu ngoặc kép (chứa dấu phẩy/xuống dòng).
  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i += 1) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { cell += '"'; i += 1; } else { inQuotes = false; }
        } else {
          cell += c;
        }
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(cell); cell = "";
      } else if (c === "\n") {
        row.push(cell); cell = ""; rows.push(row); row = [];
      } else if (c === "\r") {
        // bỏ qua, xử lý \n riêng
      } else {
        cell += c;
      }
    }
    if (cell.length || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  function toNumber(str) {
    const cleaned = String(str == null ? "" : str).replace(/[^\d-]/g, "");
    const n = parseInt(cleaned, 10);
    return isNaN(n) ? 0 : n;
  }

  function fmt(n) {
    return n.toLocaleString("vi-VN");
  }

  function todayStr() {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return dd + "/" + mm + "/" + yyyy;
  }

  // Tìm trong 1 hàng CSV cell đầu tiên khớp (không phân biệt hoa/thường) 1 trong các nhãn cần tìm.
  function findLabelCol(row, labelSet) {
    for (let c = 0; c < row.length; c += 1) {
      const key = normKey(row[c]);
      if (key && labelSet.has(key)) return c;
    }
    return -1;
  }

  function parseSheet(csvText) {
    const rows = parseCsv(csvText).filter((r) => r.some((c) => norm(c) !== ""));
    if (!rows.length) throw new Error("Sheet rỗng.");

    // Hàng tiêu đề: hàng có nhiều cell dạng dd/mm/yyyy nhất.
    let headerRowIdx = -1, bestCount = 0;
    rows.forEach((r, i) => {
      const count = r.filter((c) => /^\d{2}\/\d{2}\/\d{4}$/.test(norm(c))).length;
      if (count > bestCount) { bestCount = count; headerRowIdx = i; }
    });
    if (headerRowIdx === -1) throw new Error("Không tìm thấy hàng tiêu đề ngày.");

    const headerRow = rows[headerRowIdx];
    const dateCols = [];
    headerRow.forEach((c, idx) => {
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(norm(c))) dateCols.push({ idx, date: norm(c) });
    });
    // Đảm bảo thứ tự tăng dần theo ngày thực (không chỉ theo thứ tự cột trên sheet),
    // để nút "Ngày trước/Ngày sau" luôn di chuyển đúng hướng.
    dateCols.sort((a, b) => toDateObj(a.date) - toDateObj(b.date));

    let monthlyCol = -1;
    headerRow.forEach((c, idx) => { if (normKey(c) === normKey(MONTHLY_TOTAL_HEADER)) monthlyCol = idx; });

    const totalKey = new Set([normKey(TOTAL_LABEL)]);
    const deptKeySet = new Set(DEPT_LABELS.map(normKey));
    const deptKeyToLabel = {};
    DEPT_LABELS.forEach((l) => { deptKeyToLabel[normKey(l)] = l; });

    let totalRow = null;
    const deptRows = {}; // label -> row array (raw CSV cells)

    for (let i = headerRowIdx + 1; i < rows.length; i += 1) {
      const r = rows[i];
      const totalCol = findLabelCol(r, totalKey);
      if (totalCol !== -1 && !totalRow) { totalRow = r; continue; }
      const deptCol = findLabelCol(r, deptKeySet);
      if (deptCol !== -1) {
        const label = deptKeyToLabel[normKey(r[deptCol])];
        if (label && !deptRows[label]) deptRows[label] = r;
      }
    }

    const data = { dateCols, monthlyCol, totalRow, deptRows, fetchedAt: Date.now() };

    function hasAnyDataOn(dateStr) {
      if (dayValue(data, totalRow, dateStr) > 0) return true;
      return Object.values(deptRows).some((r) => dayValue(data, r, dateStr) > 0);
    }

    // Ngày xem mặc định: hôm nay nếu có cột, không thì lấy cột ngày gần nhất có dữ liệu.
    let selectedDate = todayStr();
    if (!dateCols.some((d) => d.date === selectedDate)) {
      let lastWithData = null;
      dateCols.forEach((d) => { if (hasAnyDataOn(d.date)) lastWithData = d.date; });
      selectedDate = lastWithData || (dateCols.length ? dateCols[dateCols.length - 1].date : selectedDate);
    }

    data.selectedDate = selectedDate;
    data.monthTotal = monthValue(data, totalRow);
    return data;
  }

  // Đọc giá trị 1 ngày cụ thể từ 1 hàng CSV thô (dùng chung cho tổng & từng khoa phòng).
  function dayValue(data, row, dateStr) {
    if (!row) return 0;
    const col = data.dateCols.find((d) => d.date === dateStr);
    if (!col) return 0;
    return toNumber(row[col.idx]);
  }
  function monthValue(data, row) {
    if (!row || data.monthlyCol === -1) return 0;
    return toNumber(row[data.monthlyCol]);
  }
  function toDateObj(ddmmyyyy) {
    const [dd, mm, yyyy] = ddmmyyyy.split("/").map(Number);
    return new Date(yyyy, mm - 1, dd);
  }

  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || Date.now() - data.fetchedAt > CACHE_MS) return null;
      return data;
    } catch (e) {
      return null;
    }
  }
  function writeCache(data) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch (e) {}
  }

  async function fetchCsv(url) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    try {
      const resp = await fetch(url, { signal: ctrl.signal });
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      const text = await resp.text();
      // Sheet không tồn tại (tên tab sai) -> Google trả về trang lỗi HTML thay vì CSV.
      if (/^\s*</.test(text)) throw new Error("Tab không tồn tại hoặc chưa công khai.");
      return text;
    } finally {
      clearTimeout(t);
    }
  }

  async function fetchData(forceFresh) {
    const cached = forceFresh ? null : readCache();
    if (cached) return cached;

    // Thử tab tháng hiện tại trước, không được thì lùi dần về tối đa 2 tháng trước
    // (phòng trường hợp đầu tháng, tab mới chưa kịp tạo).
    let lastErr = null;
    for (let monthsAgo = 0; monthsAgo <= 2; monthsAgo += 1) {
      const name = sheetTabName(monthsAgo);
      try {
        const text = await fetchCsv(csvUrlForSheetName(name));
        const data = parseSheet(text);
        writeCache(data);
        return data;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("Không tải được dữ liệu KCB.");
  }

  // ===== Render =====
  let cycleTimer = null;

  function renderCycle(textEl, pieces) {
    if (cycleTimer) { clearInterval(cycleTimer); cycleTimer = null; }
    if (!textEl || !pieces.length) return;
    let idx = 0;
    function show(i) {
      textEl.classList.add("kcb-fade");
      setTimeout(() => {
        textEl.innerHTML = pieces[i];
        textEl.classList.remove("kcb-fade");
      }, 400);
    }
    show(idx);
    if (pieces.length <= 1) return;
    cycleTimer = setInterval(() => {
      idx = (idx + 1) % pieces.length;
      show(idx);
    }, CYCLE_MS);
  }

  function renderDetail(container, data, mode, viewDate) {
    const totalVal = mode === "month" ? data.monthTotal : dayValue(data, data.totalRow, viewDate);
    const totalRowHtml = `<tr class="kcb-detail-total"><td>Tổng cộng</td><td>${fmt(totalVal)}</td></tr>`;
    const rows = DEPT_LABELS.map((label) => {
      const row = data.deptRows[label];
      const v = mode === "month" ? monthValue(data, row) : dayValue(data, row, viewDate);
      const short = label.replace(/^PK CS2_/, "");
      return `<tr><td>${short}</td><td>${fmt(v)}</td></tr>`;
    }).join("");
    container.innerHTML = totalRowHtml + rows;
  }

  function dayLabel(dateStr) {
    const short = dateStr.slice(0, 5);
    return dateStr === todayStr() ? `Hôm nay (${short})` : `Ngày ${short}`;
  }

  // "dd/mm/yyyy" <-> "yyyy-mm-dd" (định dạng <input type="date">)
  function toInputDate(ddmmyyyy) {
    const [dd, mm, yyyy] = ddmmyyyy.split("/");
    return yyyy + "-" + mm + "-" + dd;
  }
  function fromInputDate(yyyymmdd) {
    const [yyyy, mm, dd] = yyyymmdd.split("-");
    return dd + "/" + mm + "/" + yyyy;
  }

  async function init() {
    const widget = document.getElementById("kcbWidget");
    if (!widget) return;
    const textEl = document.getElementById("kcbWidgetText");
    const toggleBtn = document.getElementById("kcbWidgetToggle");
    const overlay = document.getElementById("kcbModalOverlay");
    const closeBtn = document.getElementById("kcbModalClose");
    const detailRows = document.getElementById("kcbDetailRows");
    const tabs = overlay ? overlay.querySelectorAll(".kcb-detail-tab") : [];
    const prevBtn = document.getElementById("kcbDatePrev");
    const nextBtn = document.getElementById("kcbDateNext");
    const dateInput = document.getElementById("kcbDateInput");
    const dateNavEl = document.getElementById("kcbDateNav");

    let data = null;
    let mode = "day";
    let viewDate = null;

    try {
      data = await fetchData();
    } catch (e) {
      textEl.textContent = "Không tải được số liệu KCB";
      return;
    }
    viewDate = data.selectedDate;

    function isUnlocked() {
      return !!(window.BSDHA_LOCK && window.BSDHA_LOCK.isUnlocked());
    }

    function renderWidgetText() {
      if (!isUnlocked()) {
        textEl.innerHTML = `${dayLabel(viewDate)}: <span class="kcb-hidden-link" id="kcbHiddenLink">Hiển thị</span>`;
        const link = document.getElementById("kcbHiddenLink");
        if (link) link.addEventListener("click", (e) => { e.stopPropagation(); unlockThenReveal(); });
        return;
      }
      renderCycle(textEl, [
        `${dayLabel(viewDate)}: <b>${fmt(dayValue(data, data.totalRow, viewDate))}</b> lượt khám`,
        `Tổng tháng: <b>${fmt(data.monthTotal)}</b> lượt khám`,
      ]);
    }

    function updateDateNavButtons() {
      const idx = data.dateCols.findIndex((d) => d.date === viewDate);
      if (prevBtn) prevBtn.disabled = idx <= 0;
      if (nextBtn) nextBtn.disabled = idx === -1 || idx >= data.dateCols.length - 1;
      if (dateInput) {
        dateInput.value = toInputDate(viewDate);
        if (data.dateCols.length) {
          dateInput.min = toInputDate(data.dateCols[0].date);
          dateInput.max = toInputDate(data.dateCols[data.dateCols.length - 1].date);
        }
      }
    }

    function renderModalContent() {
      if (dateNavEl) dateNavEl.hidden = mode !== "day";
      renderDetail(detailRows, data, mode, viewDate);
      updateDateNavButtons();
    }

    function goToDate(dateStr) {
      if (!data.dateCols.some((d) => d.date === dateStr)) return;
      viewDate = dateStr;
      renderWidgetText();
      if (overlay.classList.contains("open")) renderModalContent();
    }

    if (prevBtn) prevBtn.addEventListener("click", () => {
      const idx = data.dateCols.findIndex((d) => d.date === viewDate);
      if (idx > 0) goToDate(data.dateCols[idx - 1].date);
    });
    if (nextBtn) nextBtn.addEventListener("click", () => {
      const idx = data.dateCols.findIndex((d) => d.date === viewDate);
      if (idx !== -1 && idx < data.dateCols.length - 1) goToDate(data.dateCols[idx + 1].date);
    });
    if (dateInput) dateInput.addEventListener("change", () => {
      if (dateInput.value) goToDate(fromInputDate(dateInput.value));
    });

    function openModal() {
      renderModalContent();
      overlay.classList.add("open");
      document.body.classList.add("kcb-modal-lock");
    }
    function closeModal() {
      overlay.classList.remove("open");
      document.body.classList.remove("kcb-modal-lock");
    }

    function unlockThenReveal(thenOpenModal) {
      if (!window.BSDHA_LOCK) return;
      window.BSDHA_LOCK.requestUnlock(() => {
        renderWidgetText();
        if (thenOpenModal) openModal();
      });
    }

    toggleBtn.addEventListener("click", () => {
      if (!isUnlocked()) { unlockThenReveal(true); return; }
      openModal();
    });
    closeBtn.addEventListener("click", closeModal);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay.classList.contains("open")) closeModal();
    });

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        mode = tab.dataset.mode;
        renderModalContent();
      });
    });

    renderWidgetText();

    // Tự động làm mới số liệu mỗi REFRESH_MS, không cần người dùng bấm F5. Chỉ chạy
    // khi tab đang hiển thị (bỏ qua lúc chuyển sang tab trình duyệt khác) để đỡ tốn
    // lượt gọi Google Sheet không cần thiết.
    setInterval(async () => {
      if (document.hidden) return;
      try {
        const fresh = await fetchData(true);
        data = fresh;
        // Nếu người dùng đang xem đúng ngày hôm nay thì bám theo ngày mới nhất; nếu đang
        // xem 1 ngày quá khứ cụ thể (đã tự chọn) thì giữ nguyên ngày đó, chỉ số liệu tự cập nhật.
        if (viewDate === data.selectedDate || !data.dateCols.some((d) => d.date === viewDate)) {
          viewDate = data.selectedDate;
        }
        renderWidgetText();
        if (overlay.classList.contains("open")) renderModalContent();
      } catch (e) {
        // Lỗi tạm thời (mạng chập chờn...) -> giữ nguyên số liệu cũ, thử lại ở chu kỳ sau.
      }
    }, REFRESH_MS);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
