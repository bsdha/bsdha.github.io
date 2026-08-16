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
  const CACHE_KEY = "kcbWidgetCache_v1";
  const CACHE_MS = 10 * 60 * 1000; // 10 phút — tránh gọi Google Sheet liên tục mỗi lần vào trang chủ

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
    let monthlyCol = -1;
    headerRow.forEach((c, idx) => { if (normKey(c) === normKey(MONTHLY_TOTAL_HEADER)) monthlyCol = idx; });

    const totalKey = new Set([normKey(TOTAL_LABEL)]);
    const deptKeySet = new Set(DEPT_LABELS.map(normKey));
    const deptKeyToLabel = {};
    DEPT_LABELS.forEach((l) => { deptKeyToLabel[normKey(l)] = l; });

    let totalRow = null;
    const deptRows = {}; // label -> row array

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

    function readDayValue(row, dateStr) {
      if (!row) return 0;
      const col = dateCols.find((d) => d.date === dateStr);
      if (!col) return 0;
      return toNumber(row[col.idx]);
    }
    function readMonthlyValue(row) {
      if (!row || monthlyCol === -1) return 0;
      return toNumber(row[monthlyCol]);
    }

    // Ngày hiển thị mặc định: hôm nay nếu có cột, không thì lấy cột ngày gần nhất có dữ liệu.
    let selectedDate = todayStr();
    if (!dateCols.some((d) => d.date === selectedDate)) {
      let lastWithData = null;
      dateCols.forEach((d) => {
        const v = readDayValue(totalRow, d.date);
        if (v > 0 || row_has_any(deptRows, d.date, readDayValue)) lastWithData = d.date;
      });
      selectedDate = lastWithData || (dateCols.length ? dateCols[dateCols.length - 1].date : selectedDate);
    }
    function row_has_any(rowsObj, dateStr, reader) {
      return Object.values(rowsObj).some((r) => reader(r, dateStr) > 0);
    }

    const departments = DEPT_LABELS.map((label) => ({
      label,
      day: readDayValue(deptRows[label], selectedDate),
      month: readMonthlyValue(deptRows[label]),
    }));

    return {
      selectedDate,
      todayTotal: readDayValue(totalRow, selectedDate),
      monthTotal: readMonthlyValue(totalRow),
      departments,
      fetchedAt: Date.now(),
    };
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

  async function fetchData() {
    const cached = readCache();
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

  function renderDetail(container, data, mode) {
    const rows = data.departments
      .map((d) => {
        const v = mode === "month" ? d.month : d.day;
        const label = d.label.replace(/^PK CS2_/, "");
        return `<tr><td>${label}</td><td>${fmt(v)}</td></tr>`;
      })
      .join("");
    container.innerHTML = rows;
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

    let data = null;
    let mode = "day";

    try {
      data = await fetchData();
    } catch (e) {
      textEl.textContent = "Không tải được số liệu KCB";
      return;
    }

    const shortDate = data.selectedDate.slice(0, 5); // dd/mm
    renderCycle(textEl, [
      `Hôm nay (${shortDate}): <b>${fmt(data.todayTotal)}</b> lượt khám`,
      `Tổng tháng: <b>${fmt(data.monthTotal)}</b> lượt khám`,
    ]);
    renderDetail(detailRows, data, mode);

    function openModal() {
      overlay.classList.add("open");
      document.body.classList.add("kcb-modal-lock");
    }
    function closeModal() {
      overlay.classList.remove("open");
      document.body.classList.remove("kcb-modal-lock");
    }

    toggleBtn.addEventListener("click", openModal);
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
        renderDetail(detailRows, data, mode);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
