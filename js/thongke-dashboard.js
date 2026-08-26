/**
 * Trang "Thống kê tiếp nhận" — tích hợp vào SPA (bsdha.github.io).
 * Đọc dữ liệu trực tiếp từ Cloudflare Worker (KV) — Worker này cũng là nơi
 * userscript trên HIS gửi (POST) dữ liệu đến. Không còn đọc từ GitHub
 * (API GitHub Contents chỉ lưu lịch sử tối đa 1 năm). Hiển thị bảng chi
 * tiết theo phòng khám với 2 cột số liệu:
 *   - Cột theo NGÀY cụ thể (chọn được, mặc định = hôm nay)
 *   - Cột theo KỲ (Tháng / Quý / Năm — chọn được, mặc định = Tháng hiện tại)
 * Dùng chung cơ chế khoá mật khẩu "cs2" với các trang nội bộ khác (window.BSDHA_LOCK).
 *
 * TỰ ĐỘNG CẬP NHẬT: Worker/KV không hỗ trợ đẩy dữ liệu (không có WebSocket/SSE),
 * nên không thể có "thời gian thực" tuyệt đối — trang tự động hỏi lại Worker
 * (poll) mỗi AUTO_REFRESH_MS mili-giây để lấy số liệu mới nhất, KHÔNG cần
 * người dùng bấm nút. Tạm dừng khi tab đang ẩn (đỡ tốn request), tự chạy lại
 * ngay khi quay lại tab.
 */
(function () {
  const DATA_URL = 'https://his-sync-worker.dhabolero.workers.dev/';
  const AUTO_REFRESH_MS = 30 * 1000; // 30 giây/lần — gần thời gian thực
  let autoRefreshTimer = null;
  let resizeListenerBound = false;

  const ROW_LABELS_FALLBACK = {
    3: 'Phòng khám Nội 1', 4: 'Phòng khám Nội 2', 5: 'Phòng Khám Nội 3',
    6: 'Phòng khám Ngoại tổng hợp', 7: 'Phòng khám khoa Sản', 8: 'Khám Nhi',
    9: 'Khám Mắt', 10: 'PK CS2_RHM', 11: 'Khám Tai Mũi Họng', 12: 'Phòng khám YHCT',
    13: 'Cấp Cứu', 14: 'Không BHYT (chuyên khoa + dịch vụ)',
    15: 'Khám sức khoẻ lái xe', 16: 'Phòng tiêm ngừa',
  };

  // Đổi tên hiển thị cho một số nhãn (áp dụng dù nhãn lấy từ dữ liệu hay từ fallback).
  const DISPLAY_LABEL_OVERRIDES = {
    'Không BHYT (chuyên khoa + dịch vụ)': 'Dịch vụ',
  };

  // Đổi cách đọc (chỉ áp dụng khi đọc bằng giọng nói, không đổi nhãn hiển thị).
  const SPEECH_LABEL_OVERRIDES = {
    'Phòng khám YHCT': 'Phòng khám y học cổ truyền',
  };

  const STYLE_ID = 'thongke-dashboard-style';
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .tk-wrap{max-width:1320px;margin:0 auto;padding:10px 6px 44px;font-family:inherit;font-size:15px;}
      .tk-banner{position:relative;overflow:hidden;border-radius:16px;padding:20px 24px;margin-bottom:16px;
        text-align:center;
        background:linear-gradient(120deg,#071c3a,#0b3d91 38%,#0b5fa5 68%,#12b3c9);
        box-shadow:0 0 0 1px rgba(120,220,255,.25) inset,0 8px 26px rgba(11,61,145,.35),0 0 34px rgba(18,179,201,.25);}
      .tk-banner::after{content:'';position:absolute;inset:0;pointer-events:none;
        background:radial-gradient(600px 140px at 12% -20%,rgba(120,220,255,.35),transparent 60%);}
      .tk-banner-org{position:relative;color:#eaf6ff;font-size:14.5px;font-weight:800;letter-spacing:.05em;
        text-transform:uppercase;text-shadow:0 0 10px rgba(140,225,255,.65),0 0 22px rgba(60,180,255,.4);}
      .tk-banner-title{position:relative;color:#fff;font-size:23px;font-weight:800;margin-top:7px;
        text-shadow:0 0 14px rgba(120,220,255,.85),0 0 30px rgba(60,180,255,.5);}
      .tk-head-sticky{background:#fff;z-index:30;}
      .tk-head-sticky.tk-head-stuck{position:fixed;box-shadow:0 8px 18px -8px rgba(14,34,51,.28);
        padding-top:8px;}
      .tk-head-spacer{height:0;}
      .tk-head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px 18px;
        padding-bottom:10px;}
      .tk-head .tk-sub{font-size:13.5px;color:#5c7284;white-space:nowrap;}
      .tk-head-filters{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;}
      .tk-head-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
      .tk-head-divider{border:none;border-top:2px solid #0e2233;margin:0 0 14px;}
      .tk-speak-btn{font-size:13px;font-weight:700;padding:6px 12px;border-radius:8px;border:none;
        background:linear-gradient(120deg,#0b5fa5,#12b3c9);color:#fff;cursor:pointer;
        display:inline-flex;align-items:center;gap:7px;box-shadow:0 0 14px rgba(18,179,201,.45);white-space:nowrap;}
      .tk-speak-btn:hover{filter:brightness(1.08);}
      .tk-speak-btn.tk-speaking{background:linear-gradient(120deg,#17a34a,#22d3ee);
        box-shadow:0 0 16px rgba(23,163,74,.55);}
      .tk-live{font-size:12.5px;font-weight:700;padding:6px 11px;border-radius:7px;border:1px solid #17a34a;
        background:#f0fdf4;color:#15803d;white-space:nowrap;display:inline-flex;align-items:center;gap:6px;}
      .tk-live-dot{width:8px;height:8px;border-radius:50%;background:#17a34a;display:inline-block;
        position:relative;}
      .tk-live-dot::before{content:'';position:absolute;inset:-3px;border-radius:50%;
        background:#17a34a;opacity:.65;animation:tkPing 1.7s cubic-bezier(0,0,.2,1) infinite;}
      @keyframes tkPing{0%{transform:scale(1);opacity:.65;}75%,100%{transform:scale(3);opacity:0;}}
      .tk-filter-group{display:flex;flex-direction:column;gap:4px;}
      .tk-filter-group label{font-family:inherit;font-size:12.5px;color:#5c7284;font-weight:600;}
      .tk-filter-group input, .tk-filter-group select{font-family:inherit;font-size:14px;
        padding:6px 9px;border-radius:7px;border:1px solid #c9d6de;background:#fff;color:#0e2233;
        cursor:pointer;min-width:140px;}
      .tk-filter-group input:focus, .tk-filter-group select:focus{outline:2px solid #0b5fa5;outline-offset:1px;}
      .tk-panel{background:#fff;border:1px solid #c9d6de;border-radius:12px;padding:20px;margin-bottom:22px;}
      .tk-detail-panel{width:fit-content;max-width:100%;margin-left:auto;margin-right:auto;}
      .tk-panel-head{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;
        gap:10px 16px;margin-bottom:16px;}
      .tk-panel h3{font-size:16px;font-family:inherit;margin:0;color:#0e2233;display:flex;align-items:center;gap:8px;font-weight:700;white-space:nowrap;}
      .tk-panel h3::before{content:'';width:8px;height:8px;background:#0b5fa5;border-radius:50%;display:inline-block;}
      .tk-day-nav{display:flex;align-items:center;justify-content:flex-end;gap:6px;flex-wrap:wrap;}
      .tk-day-btn{width:30px;height:30px;border-radius:7px;border:1px solid #c9d6de;background:#fff;color:#0b5fa5;
        font-size:16px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;}
      .tk-day-btn:hover{background:#eef4fa;}
      .tk-day-nav input[type=date]{font-family:inherit;font-size:14px;padding:6px 8px;border-radius:7px;
        border:1px solid #c9d6de;background:#fff;color:#0e2233;cursor:pointer;}
      .tk-today-btn{height:30px;padding:0 12px;border-radius:7px;border:1px solid #c9d6de;background:#fff;
        color:#0b5fa5;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;
        justify-content:center;line-height:1;white-space:nowrap;font-family:inherit;}
      .tk-today-btn:hover{background:#eef4fa;}
      .tk-table-wrap{overflow-x:auto;}
      .tk-table{width:auto;max-width:100%;border-collapse:collapse;font-size:15px;}
      .tk-table thead th{font-family:inherit;font-size:13.5px;color:#5c7284;
        text-align:right;padding:9px 14px;border-bottom:2px solid #0e2233;background:#fff;font-weight:700;white-space:nowrap;}
      .tk-table thead th:first-child{text-align:left;}
      .tk-table tbody td{padding:9px 14px;text-align:right;border-bottom:1px solid #e3e9ed;font-family:'Courier New',monospace;}
      .tk-table tbody td:first-child{text-align:left;font-family:inherit;font-weight:600;}
      .tk-table tbody tr:hover{background:rgba(11,95,165,0.05);}
      .tk-table tbody tr.tk-total-row td{padding:10px 14px;font-family:inherit;font-weight:700;
        border-bottom:2px solid #0e2233;background:rgba(11,95,165,0.04);}
      .tk-table tbody tr.tk-total-row td:first-child{text-align:left;}
      .tk-empty{color:#7c8fa0;font-size:14.5px;padding:32px;text-align:center;font-family:inherit;}
      .tk-insights-panel{padding-top:22px;}
      .tk-insights-panel h3{font-size:16px;font-family:inherit;margin:0 0 16px;color:#0e2233;
        display:flex;align-items:center;gap:8px;font-weight:700;}
      .tk-insights-panel h3::before{content:'';width:8px;height:8px;background:#0b5fa5;border-radius:50%;display:inline-block;}
      .tk-kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;}
      .tk-kpi-card{background:#f5f9fb;border:1px solid #e1e8ee;border-radius:10px;padding:13px 15px;}
      .tk-kpi-label{font-size:12.5px;color:#5c7284;font-weight:600;}
      .tk-kpi-value{font-size:22px;font-weight:800;color:#0e2233;margin-top:4px;}
      .tk-kpi-value.tk-up{color:#17a34a;}
      .tk-kpi-value.tk-down{color:#dc2626;}
      .tk-chart-toggle{display:flex;gap:12px;justify-content:center;margin-bottom:18px;}
      .tk-chart-tab{width:44px;height:44px;border-radius:50%;border:1px solid #c9d6de;background:#fff;
        font-size:19px;cursor:pointer;display:flex;align-items:center;justify-content:center;
        color:#5c7284;transition:transform .15s ease;}
      .tk-chart-tab:hover{transform:translateY(-1px);}
      .tk-chart-tab.active{background:linear-gradient(120deg,#0b5fa5,#12b3c9);color:#fff;border-color:transparent;
        box-shadow:0 0 14px rgba(18,179,201,.5);}
      .tk-chart-area{width:100%;min-height:180px;max-width:760px;margin:0 auto;}
      .tk-chart-svg{width:100%;height:auto;display:block;}
      @media (max-width:720px){
        .tk-banner{padding:16px 18px;}
        .tk-banner-title{font-size:18px;}
        .tk-head-filters{gap:8px;}
        .tk-filter-group input, .tk-filter-group select{min-width:120px;}
      }
    `;
    document.head.appendChild(style);
  }

  function skeletonHtml() {
    return `
      <div class="tk-wrap">
        <div class="tk-banner">
          <div class="tk-banner-org">Bệnh viện đa khoa Bình Dương - Cơ sở 2</div>
          <div class="tk-banner-title" id="tkReportTitle">Báo cáo số liệu KCB ngày --/--/----</div>
        </div>
        <div id="tkHeadSentinel"></div>
        <div class="tk-head-sticky" id="tkHeadSticky">
          <div class="tk-head">
            <div class="tk-sub" id="tkLastSync">Đang tải dữ liệu…</div>
            <div class="tk-head-filters">
              <div class="tk-filter-group">
                <label for="tkPeriodType">Xem theo</label>
                <select id="tkPeriodType">
                  <option value="month">Tháng</option>
                  <option value="quarter">Quý</option>
                  <option value="year">Năm</option>
                </select>
              </div>
              <div class="tk-filter-group">
                <label for="tkPeriodValue" id="tkPeriodValueLabel">Chọn tháng</label>
                <select id="tkPeriodValue"></select>
              </div>
            </div>
            <div class="tk-head-actions">
              <button type="button" class="tk-speak-btn" id="tkSpeakBtn">🔊 Đọc báo cáo số liệu</button>
              <span class="tk-live"><span class="tk-live-dot"></span>Tự động cập nhật</span>
            </div>
          </div>
          <hr class="tk-head-divider">
        </div>
        <div class="tk-head-spacer" id="tkHeadSpacer"></div>
        <div class="tk-panel tk-detail-panel">
          <div class="tk-panel-head">
            <h3>Chi tiết theo phòng khám</h3>
            <div class="tk-day-nav" id="tkDayNav">
              <button type="button" class="tk-day-btn" id="tkDayPrev" title="Ngày trước">‹</button>
              <input type="date" id="tkDayPicker">
              <button type="button" class="tk-today-btn" id="tkDayToday" title="Về hôm nay">Hôm nay</button>
              <button type="button" class="tk-day-btn" id="tkDayNext" title="Ngày sau">›</button>
            </div>
          </div>
          <div class="tk-table-wrap" id="tkTableWrap"><div class="tk-empty">Đang tải…</div></div>
        </div>
        <div class="tk-panel tk-insights-panel">
          <h3>Biểu đồ</h3>
          <div class="tk-chart-toggle" id="tkChartToggle">
            <button type="button" class="tk-chart-tab active" data-view="kpi" title="Tổng quan số liệu (KPI)">🧮</button>
            <button type="button" class="tk-chart-tab" data-view="bar" title="Biểu đồ cột theo phòng khám">📊</button>
            <button type="button" class="tk-chart-tab" data-view="line" title="Xu hướng theo kỳ đã chọn (tháng/quý/năm)">📈</button>
          </div>
          <div class="tk-kpi-grid" id="tkKpiGrid"></div>
          <div class="tk-chart-area" id="tkChartArea" style="display:none;"><div class="tk-empty">Đang tải…</div></div>
        </div>
      </div>
    `;
  }

  let fullData = null;
  let lastReport = null; // { dayLabel, dd, mm, yyyy, dayTotalSum, rows:[{label, dayVal}] } — dùng cho nút "Đọc báo cáo số liệu"
  let activeChartType = 'kpi'; // 'kpi' | 'bar' | 'line' — chỉ hiện 1 kiểu view tại 1 thời điểm
  let lastChartData = null; // { bar:[{label,dayVal}], line:[{day,total}] }

  // ---------- Tiện ích ngày tháng ----------
  function pad2(n) { return String(n).padStart(2, '0'); }

  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  // Chỉ chấp nhận khóa ngày là số nguyên hợp lệ (1-31); loại bỏ khóa rác
  // như "" phát sinh từ những lần đồng bộ cũ bị lỗi ngày.
  function isValidDayKey(k) {
    return /^\d{1,2}$/.test(k) && Number(k) >= 1 && Number(k) <= 31;
  }

  function shortenLabel(label) {
    return String(label).replace(/^Phòng khám /i, '').replace(/^Phòng Khám /, '').trim();
  }

  function escapeXml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function getAvailableMonths() {
    return Object.keys((fullData && fullData.months) || {})
      .filter((mk) => /^\d{4}-\d{2}$/.test(mk))
      .sort();
  }

  function getAvailableYears(months) {
    const set = new Set(months.map((m) => m.slice(0, 4)));
    return [...set].sort();
  }

  function getAvailableQuarters(months) {
    const set = new Set(months.map((m) => {
      const [y, mo] = m.split('-').map(Number);
      const q = Math.ceil(mo / 3);
      return y + '-Q' + q;
    }));
    return [...set].sort();
  }

  function monthsInQuarter(quarterKey, availableMonths) {
    const [y, qPart] = quarterKey.split('-Q');
    const q = Number(qPart);
    const startMonth = (q - 1) * 3 + 1;
    const wanted = [startMonth, startMonth + 1, startMonth + 2].map((mm) => `${y}-${pad2(mm)}`);
    return availableMonths.filter((m) => wanted.includes(m));
  }

  function monthsInYear(yearKey, availableMonths) {
    return availableMonths.filter((m) => m.startsWith(yearKey + '-'));
  }

  // ---------- Tải dữ liệu ----------
  async function loadData(container) {
    const lastSyncEl = container.querySelector('#tkLastSync');
    if (lastSyncEl) lastSyncEl.textContent = 'Đang tải dữ liệu…';
    try {
      const res = await fetch(DATA_URL + '?t=' + Date.now());
      if (!res.ok) throw new Error('HTTP ' + res.status);
      fullData = await res.json();
      setupFilters(container);
    } catch (e) {
      if (lastSyncEl) lastSyncEl.textContent = '⚠️ Không tải được dữ liệu: ' + e.message;
      const tableWrap = container.querySelector('#tkTableWrap');
      if (tableWrap) tableWrap.innerHTML = '<div class="tk-empty">Không có dữ liệu.</div>';
    }
  }

  // ---------- Thiết lập bộ lọc (ngày / kỳ) ----------
  function setupFilters(container) {
    const availableMonths = getAvailableMonths();

    if (availableMonths.length === 0) {
      container.querySelector('#tkLastSync').textContent = 'Chưa có dữ liệu nào được đồng bộ.';
      container.querySelector('#tkTableWrap').innerHTML = '<div class="tk-empty">Chưa có dữ liệu.</div>';
      return;
    }

    const dayPicker = container.querySelector('#tkDayPicker');
    const dayPrevBtn = container.querySelector('#tkDayPrev');
    const dayNextBtn = container.querySelector('#tkDayNext');
    const dayTodayBtn = container.querySelector('#tkDayToday');
    const periodTypeSel = container.querySelector('#tkPeriodType');
    const periodValueSel = container.querySelector('#tkPeriodValue');

    // Mặc định ngày = hôm nay (chỉ đặt 1 lần khi khởi tạo, giữ nguyên lựa chọn
    // của người dùng ở những lần "Làm mới" sau đó).
    if (!dayPicker.value) dayPicker.value = todayStr();
    if (!dayPicker.dataset.bound) {
      dayPicker.dataset.bound = '1';
      dayPicker.addEventListener('change', () => renderAll(container));
    }

    function shiftDay(delta) {
      if (!dayPicker.value) return;
      const d = new Date(dayPicker.value + 'T00:00:00');
      d.setDate(d.getDate() + delta);
      dayPicker.value = d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
      renderAll(container);
    }
    if (dayPrevBtn && !dayPrevBtn.dataset.bound) {
      dayPrevBtn.dataset.bound = '1';
      dayPrevBtn.addEventListener('click', () => shiftDay(-1));
    }
    if (dayNextBtn && !dayNextBtn.dataset.bound) {
      dayNextBtn.dataset.bound = '1';
      dayNextBtn.addEventListener('click', () => shiftDay(1));
    }
    if (dayTodayBtn && !dayTodayBtn.dataset.bound) {
      dayTodayBtn.dataset.bound = '1';
      dayTodayBtn.addEventListener('click', () => {
        dayPicker.value = todayStr();
        renderAll(container);
      });
    }

    const speakBtn = container.querySelector('#tkSpeakBtn');
    if (speakBtn && !speakBtn.dataset.bound) {
      speakBtn.dataset.bound = '1';
      speakBtn.addEventListener('click', () => toggleSpeakReport(speakBtn));
    }

    if (!resizeListenerBound) {
      resizeListenerBound = true;
      document.addEventListener('scroll', () => checkHeaderStick(container), true);
      window.addEventListener('scroll', () => checkHeaderStick(container));
      window.addEventListener('resize', () => checkHeaderStick(container));
    }

    const chartToggle = container.querySelector('#tkChartToggle');
    if (chartToggle && !chartToggle.dataset.bound) {
      chartToggle.dataset.bound = '1';
      chartToggle.addEventListener('click', (e) => {
        const btn = e.target.closest('.tk-chart-tab');
        if (!btn) return;
        const type = btn.getAttribute('data-view');
        if (!type || type === activeChartType) return;
        activeChartType = type;
        chartToggle.querySelectorAll('.tk-chart-tab').forEach((b) => b.classList.toggle('active', b === btn));
        renderActiveChart(container);
      });
    }

    if (!periodTypeSel.dataset.bound) {
      periodTypeSel.dataset.bound = '1';
      periodTypeSel.addEventListener('change', () => {
        populatePeriodValueSelect(container, true);
        renderAll(container);
      });
    }

    if (!periodValueSel.dataset.bound) {
      periodValueSel.dataset.bound = '1';
      periodValueSel.addEventListener('change', () => renderAll(container));
    }

    if (!periodTypeSel.value) periodTypeSel.value = 'month';
    populatePeriodValueSelect(container, !periodValueSel.value);

    renderAll(container);
  }

  function populatePeriodValueSelect(container, resetToDefault) {
    const availableMonths = getAvailableMonths();
    const periodType = container.querySelector('#tkPeriodType').value;
    const periodValueSel = container.querySelector('#tkPeriodValue');
    const periodValueLabel = container.querySelector('#tkPeriodValueLabel');
    const currentValue = periodValueSel.value;

    // options sắp xếp mới-nhất-trước
    let options = [];
    if (periodType === 'month') {
      periodValueLabel.textContent = 'Chọn tháng';
      options = availableMonths.slice().reverse().map((m) => {
        const [y, mo] = m.split('-');
        return { value: m, label: 'Tháng ' + parseInt(mo, 10) + ' / ' + y };
      });
    } else if (periodType === 'quarter') {
      periodValueLabel.textContent = 'Chọn quý';
      options = getAvailableQuarters(availableMonths).reverse().map((q) => {
        const [y, qPart] = q.split('-Q');
        return { value: q, label: 'Quý ' + qPart + ' / ' + y };
      });
    } else {
      periodValueLabel.textContent = 'Chọn năm';
      options = getAvailableYears(availableMonths).reverse().map((y) => ({ value: y, label: 'Năm ' + y }));
    }

    periodValueSel.innerHTML = options.map((o) => `<option value="${o.value}">${o.label}</option>`).join('');

    if (!resetToDefault && options.some((o) => o.value === currentValue)) {
      periodValueSel.value = currentValue;
      return;
    }

    // Mặc định: kỳ chứa ngày hôm nay nếu có dữ liệu, ngược lại lấy kỳ gần nhất
    // (options[0] vì danh sách đã được sắp mới-nhất-trước).
    const today = todayStr();
    const todayMonth = today.slice(0, 7);
    let defaultValue = options.length ? options[0].value : null;
    if (periodType === 'month' && options.some((o) => o.value === todayMonth)) {
      defaultValue = todayMonth;
    } else if (periodType === 'quarter') {
      const [y, mo] = todayMonth.split('-').map(Number);
      const qKey = y + '-Q' + Math.ceil(mo / 3);
      if (options.some((o) => o.value === qKey)) defaultValue = qKey;
    } else if (periodType === 'year') {
      const yKey = todayMonth.slice(0, 4);
      if (options.some((o) => o.value === yKey)) defaultValue = yKey;
    }
    periodValueSel.value = defaultValue;
  }

  // ---------- Hiển thị ----------
  function renderAll(container) {
    const dayPicker = container.querySelector('#tkDayPicker');
    const periodType = container.querySelector('#tkPeriodType').value;
    const periodValue = container.querySelector('#tkPeriodValue').value;
    const availableMonths = getAvailableMonths();

    renderLastSync(container);
    renderTable(container, dayPicker.value, periodType, periodValue, availableMonths);
    requestAnimationFrame(() => checkHeaderStick(container));
  }

  function renderReportTitle(container, dd, dm, dy) {
    const el = container.querySelector('#tkReportTitle');
    if (el) el.textContent = `Báo cáo số liệu KCB ngày ${dd}/${dm}/${dy}`;
  }

  // ---------- Khoá vùng bộ lọc/đầu trang khi cuộn (thay cho position:sticky, để không phụ
  // thuộc vào ancestor cuộn nào của SPA) ----------
  let tkHeaderStuck = false;

  function getStickyTopOffset() {
    const topbar = document.querySelector('.topbar');
    if (topbar && getComputedStyle(topbar).display !== 'none') {
      return topbar.getBoundingClientRect().height;
    }
    return 0;
  }

  function checkHeaderStick(container) {
    const sentinel = container.querySelector('#tkHeadSentinel');
    const header = container.querySelector('#tkHeadSticky');
    const spacer = container.querySelector('#tkHeadSpacer');
    const wrap = container.querySelector('.tk-wrap');
    if (!sentinel || !header || !spacer || !wrap) return;
    const topOffset = getStickyTopOffset();
    const sentinelTop = sentinel.getBoundingClientRect().top;
    const shouldStick = sentinelTop <= topOffset;

    if (shouldStick) {
      const wrapRect = wrap.getBoundingClientRect();
      if (!tkHeaderStuck) {
        tkHeaderStuck = true;
        spacer.style.height = header.offsetHeight + 'px';
        header.classList.add('tk-head-stuck');
      }
      header.style.top = topOffset + 'px';
      header.style.left = wrapRect.left + 'px';
      header.style.width = wrapRect.width + 'px';
    } else if (tkHeaderStuck) {
      tkHeaderStuck = false;
      header.classList.remove('tk-head-stuck');
      header.style.top = '';
      header.style.left = '';
      header.style.width = '';
      spacer.style.height = '0';
    }
  }

  function renderLastSync(container) {
    // Đồng bộ gần nhất trên toàn bộ dữ liệu (không giới hạn theo bộ lọc hiện tại).
    let lastTime = null;
    Object.values(fullData.months || {}).forEach((month) => {
      Object.entries(month.lastSyncByDay || {}).forEach(([dk, t]) => {
        if (isValidDayKey(dk) && t && (!lastTime || t > lastTime)) lastTime = t;
      });
    });
    const note = container.querySelector('#tkLastSync');
    if (lastTime) {
      const dt = new Date(lastTime);
      note.textContent = 'Đồng bộ gần nhất: ' + dt.toLocaleTimeString('vi-VN') + ' ' + dt.toLocaleDateString('vi-VN');
    } else {
      note.textContent = 'Chưa có lần đồng bộ nào.';
    }
  }

  function renderTable(container, dayValue, periodType, periodValue, availableMonths) {
    const wrap = container.querySelector('#tkTableWrap');
    if (!dayValue || !periodValue) {
      wrap.innerHTML = '<div class="tk-empty">Chưa có dữ liệu.</div>';
      return;
    }

    // --- Xác định tháng/ngày được chọn ---
    const [dy, dm, dd] = dayValue.split('-');
    const dayMonthKey = `${dy}-${dm}`;
    const dayKey = String(parseInt(dd, 10));
    const dayMonth = fullData.months[dayMonthKey];
    const dayRows = (dayMonth && dayMonth.rows) || {};

    renderReportTitle(container, dd, dm, dy);

    // --- Xác định các tháng thuộc kỳ được chọn ở bộ lọc (dùng cho biểu đồ + KPI "theo kỳ đã chọn") ---
    let periodMonthKeys = [];
    if (periodType === 'month') {
      periodMonthKeys = [periodValue];
    } else if (periodType === 'quarter') {
      periodMonthKeys = monthsInQuarter(periodValue, availableMonths);
    } else {
      periodMonthKeys = monthsInYear(periodValue, availableMonths);
    }

    // --- Bảng chi tiết luôn hiển thị đủ 3 mốc thời gian gắn với NGÀY đang xem:
    //     Tháng / Quý / Năm chứa ngày đó (độc lập với bộ lọc "Xem theo" ở trên,
    //     bộ lọc đó chỉ còn dùng để chọn kỳ cho phần Biểu đồ bên dưới). ---
    const dNumForQuarter = parseInt(dm, 10);
    const quarterOfDayKey = `${dy}-Q${Math.ceil(dNumForQuarter / 3)}`;
    const yearOfDayKey = dy;
    const monthOfDayMonths = [dayMonthKey];
    const quarterOfDayMonths = monthsInQuarter(quarterOfDayKey, availableMonths);
    const yearOfDayMonths = monthsInYear(yearOfDayKey, availableMonths);

    // --- Gộp danh sách phòng khám xuất hiện ở ngày/tháng/quý/năm đang xem HOẶC trong kỳ lọc ---
    const rowNumSet = new Set();
    Object.keys(dayRows).forEach((rn) => { if (/^\d+$/.test(rn)) rowNumSet.add(rn); });
    [...yearOfDayMonths, ...periodMonthKeys].forEach((mk) => {
      const m = fullData.months[mk];
      if (!m) return;
      Object.keys(m.rows || {}).forEach((rn) => { if (/^\d+$/.test(rn)) rowNumSet.add(rn); });
    });
    const rowNums = [...rowNumSet].sort((a, b) => Number(a) - Number(b));

    if (rowNums.length === 0) {
      wrap.innerHTML = '<div class="tk-empty">Chưa có dữ liệu cho lựa chọn này.</div>';
      lastReport = {
        dd, dm, dy, dayTotalSum: 0, periodTotalSum: 0, dayMonthKey, dayKey, rows: [],
        periodType, periodValue, periodMonthKeys,
      };
      renderInsights(container);
      return;
    }

    // --- Nhãn cột ---
    const dayLabel = `Ngày ${dd}/${dm}/${dy}`;
    const monthOfDayLabel = `Tháng ${parseInt(dm, 10)}/${dy}`;
    const quarterOfDayLabel = `Quý ${Math.ceil(dNumForQuarter / 3)}/${dy}`;
    const yearOfDayLabel = `Năm ${dy}`;

    function sumRowOverMonths(rn, monthKeys) {
      let total = 0;
      monthKeys.forEach((mk) => {
        const m = fullData.months[mk];
        const row = m && m.rows && m.rows[rn];
        if (!row) return;
        Object.keys(row.days || {}).forEach((dk) => {
          if (isValidDayKey(dk)) total += row.days[dk] || 0;
        });
      });
      return total;
    }

    // --- Tính giá trị từng dòng ---
    let dayTotalSum = 0;
    let monthTotalSumAll = 0;
    let quarterTotalSumAll = 0;
    let yearTotalSumAll = 0;
    let tbody = '';
    const reportRows = [];
    rowNums.forEach((rn) => {
      const label =
        (dayRows[rn] && dayRows[rn].label) ||
        (yearOfDayMonths.map((mk) => fullData.months[mk] && fullData.months[mk].rows[rn]).find(Boolean) || {}).label ||
        ROW_LABELS_FALLBACK[rn] || ('Dòng ' + rn);
      const displayLabel = DISPLAY_LABEL_OVERRIDES[label] || label;

      const dayVal = (dayRows[rn] && dayRows[rn].days && dayRows[rn].days[dayKey]) || 0;
      const monthVal = sumRowOverMonths(rn, monthOfDayMonths);
      const quarterVal = sumRowOverMonths(rn, quarterOfDayMonths);
      const yearVal = sumRowOverMonths(rn, yearOfDayMonths);
      const periodVal = sumRowOverMonths(rn, periodMonthKeys);

      dayTotalSum += dayVal;
      monthTotalSumAll += monthVal;
      quarterTotalSumAll += quarterVal;
      yearTotalSumAll += yearVal;
      reportRows.push({ label: displayLabel, dayVal, periodVal });

      tbody += `<tr><td>${displayLabel}</td><td>${dayVal}</td><td>${monthVal}</td><td>${quarterVal}</td><td>${yearVal}</td></tr>`;
    });

    // Tổng theo kỳ đang chọn ở bộ lọc (dùng cho KPI + biểu đồ, có thể khác với năm/tháng của ngày đang xem)
    let periodTotalSum = 0;
    periodMonthKeys.forEach((mk) => { periodTotalSum += monthTotalSum(mk); });

    const thead = `<tr><th>Phòng khám</th><th>${dayLabel}</th><th>${monthOfDayLabel}</th><th>${quarterOfDayLabel}</th><th>${yearOfDayLabel}</th></tr>`;
    const totalRow = `<tr class="tk-total-row"><td>Tổng</td><td>${dayTotalSum}</td><td>${monthTotalSumAll}</td><td>${quarterTotalSumAll}</td><td>${yearTotalSumAll}</td></tr>`;

    wrap.innerHTML = `<table class="tk-table"><thead>${thead}</thead><tbody>${totalRow}${tbody}</tbody></table>`;

    lastReport = {
      dd, dm, dy, dayTotalSum, periodTotalSum, dayMonthKey, dayKey, rows: reportRows,
      periodType, periodValue, periodMonthKeys,
    };
    renderInsights(container);
  }

  // ---------- Khối phân tích: KPI + biểu đồ ----------
  function monthTotalSum(mk) {
    const m = fullData.months && fullData.months[mk];
    if (!m) return 0;
    let sum = 0;
    Object.entries(m.totalByDay || {}).forEach(([dk, v]) => { if (isValidDayKey(dk)) sum += v || 0; });
    return sum;
  }

  const MONTH_SHORT = { '01': 'Th1', '02': 'Th2', '03': 'Th3', '04': 'Th4', '05': 'Th5', '06': 'Th6',
    '07': 'Th7', '08': 'Th8', '09': 'Th9', '10': 'Th10', '11': 'Th11', '12': 'Th12' };

  // Xây dữ liệu cho biểu đồ đường theo đúng kỳ đang chọn (Tháng/Quý/Năm):
  //  - Tháng: trục X là các ngày trong tháng đó.
  //  - Quý / Năm: trục X là các tháng thuộc kỳ đó (kể cả tháng chưa có dữ liệu = 0).
  function buildPeriodLineData(periodType, periodValue, periodMonthKeys) {
    if (periodType === 'month') {
      const mk = (periodMonthKeys && periodMonthKeys[0]) || periodValue;
      const monthData = (fullData.months && fullData.months[mk]) || {};
      const totalByDay = monthData.totalByDay || {};
      const [y, mo] = mk.split('-');
      const numDays = new Date(Number(y), Number(mo), 0).getDate();
      const out = [];
      for (let d = 1; d <= numDays; d++) out.push({ day: d, total: totalByDay[String(d)] || 0 });
      return out;
    }
    if (periodType === 'quarter') {
      const [, qPart] = periodValue.split('-Q');
      const q = Number(qPart);
      const startMonth = (q - 1) * 3 + 1;
      const y = periodValue.split('-Q')[0];
      const out = [];
      for (let i = 0; i < 3; i++) {
        const mo = pad2(startMonth + i);
        const mk = `${y}-${mo}`;
        out.push({ day: MONTH_SHORT[mo] + '/' + y, total: monthTotalSum(mk) });
      }
      return out;
    }
    // year
    const y = periodValue;
    const out = [];
    for (let mo = 1; mo <= 12; mo++) {
      const mk = `${y}-${pad2(mo)}`;
      out.push({ day: MONTH_SHORT[pad2(mo)], total: monthTotalSum(mk) });
    }
    return out;
  }

  function renderInsights(container) {
    if (!lastReport) return;
    const { dayTotalSum, periodTotalSum, rows, dayMonthKey, dayKey, periodType, periodValue, periodMonthKeys } = lastReport;
    const monthData = (fullData.months && fullData.months[dayMonthKey]) || {};
    const totalByDay = monthData.totalByDay || {};

    // So với hôm qua (chỉ so trong cùng tháng để đơn giản)
    let diffHtml = '—';
    let diffClass = '';
    const dNum = Number(dayKey);
    if (dNum > 1) {
      const yestKey = String(dNum - 1);
      if (isValidDayKey(yestKey) && Object.prototype.hasOwnProperty.call(totalByDay, yestKey)) {
        const yestVal = totalByDay[yestKey] || 0;
        const diff = dayTotalSum - yestVal;
        const pct = yestVal > 0 ? Math.round((diff / yestVal) * 100) : (dayTotalSum > 0 ? 100 : 0);
        diffClass = diff > 0 ? 'tk-up' : diff < 0 ? 'tk-down' : '';
        diffHtml = `${diff > 0 ? '+' : ''}${diff} (${diff > 0 ? '+' : ''}${pct}%)`;
      }
    }

    const top = rows.slice().sort((a, b) => b.dayVal - a.dayVal)[0];
    const topHtml = top && top.dayVal > 0 ? `${escapeXml(shortenLabel(top.label))} (${top.dayVal})` : '—';

    const kpiHtml = `
      <div class="tk-kpi-card"><div class="tk-kpi-label">Tổng lượt hôm nay</div><div class="tk-kpi-value">${dayTotalSum}</div></div>
      <div class="tk-kpi-card"><div class="tk-kpi-label">Tổng lượt theo kỳ đã chọn</div><div class="tk-kpi-value">${periodTotalSum}</div></div>
      <div class="tk-kpi-card"><div class="tk-kpi-label">Phòng khám đông nhất hôm nay</div><div class="tk-kpi-value" style="font-size:16px;">${topHtml}</div></div>
      <div class="tk-kpi-card"><div class="tk-kpi-label">So với hôm qua</div><div class="tk-kpi-value ${diffClass}">${diffHtml}</div></div>`;
    const grid = container.querySelector('#tkKpiGrid');
    if (grid) grid.innerHTML = kpiHtml;

    // Biểu đồ đường bám theo kỳ đang chọn ở bộ lọc (Tháng/Quý/Năm), không chỉ tháng của ngày đang xem.
    const dayTotals = buildPeriodLineData(periodType, periodValue, periodMonthKeys);

    lastChartData = { bar: rows, barPeriodLabel: buildPeriodLabel(periodType, periodValue), line: dayTotals };
    renderActiveChart(container);
  }

  function buildPeriodLabel(periodType, periodValue) {
    if (periodType === 'month') {
      const [py, pmo] = periodValue.split('-');
      return `Tháng ${parseInt(pmo, 10)}/${py}`;
    }
    if (periodType === 'quarter') {
      const [py, pq] = periodValue.split('-Q');
      return `Quý ${pq}/${py}`;
    }
    return `Năm ${periodValue}`;
  }

  function renderActiveChart(container) {
    const kpiGrid = container.querySelector('#tkKpiGrid');
    const area = container.querySelector('#tkChartArea');
    if (!kpiGrid || !area) return;

    if (activeChartType === 'kpi') {
      kpiGrid.style.display = '';
      area.style.display = 'none';
      return;
    }

    kpiGrid.style.display = 'none';
    area.style.display = '';
    if (!lastChartData || (activeChartType === 'bar' ? lastChartData.bar.length === 0 : lastChartData.line.length === 0)) {
      area.innerHTML = '<div class="tk-empty">Chưa có dữ liệu để vẽ biểu đồ.</div>';
      return;
    }
    area.innerHTML = activeChartType === 'bar'
      ? buildBarChartSvg(lastChartData.bar, lastChartData.barPeriodLabel)
      : buildLineChartSvg(lastChartData.line);
  }

  function buildBarChartSvg(rows, periodLabel) {
    const w = 720, h = 280, padL = 42, padR = 16, padT = 22, padB = 82;
    const maxVal = Math.max(1, ...rows.map((r) => r.periodVal));
    const bw = (w - padL - padR) / rows.length;
    let bars = '';
    rows.forEach((r, i) => {
      const barH = (r.periodVal / maxVal) * (h - padT - padB);
      const x = padL + i * bw + bw * 0.18;
      const barWidth = bw * 0.64;
      const y = h - padB - barH;
      const cx = x + barWidth / 2;
      bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${Math.max(barH, 0).toFixed(1)}" rx="4" fill="url(#tkBarGrad)"></rect>`;
      if (r.periodVal > 0) bars += `<text x="${cx.toFixed(1)}" y="${(y - 6).toFixed(1)}" font-size="11" text-anchor="middle" fill="#0e2233" font-weight="700">${r.periodVal}</text>`;
      bars += `<text x="${cx.toFixed(1)}" y="${(h - padB + 14).toFixed(1)}" font-size="10" fill="#5c7284" text-anchor="end" transform="rotate(-42 ${cx.toFixed(1)} ${(h - padB + 14).toFixed(1)})">${escapeXml(shortenLabel(r.label))}</text>`;
    });
    const titleText = periodLabel ? `Theo phòng khám — ${escapeXml(periodLabel)}` : '';
    return `<svg class="tk-chart-svg" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="tkBarGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#12b3c9"/><stop offset="100%" stop-color="#0b5fa5"/>
      </linearGradient></defs>
      ${titleText ? `<text x="${padL}" y="14" font-size="12" fill="#5c7284" font-weight="700">${titleText}</text>` : ''}
      <line x1="${padL}" y1="${h - padB}" x2="${w - padR}" y2="${h - padB}" stroke="#c9d6de" stroke-width="1"/>
      ${bars}
    </svg>`;
  }

  function buildLineChartSvg(dayTotals) {
    const w = 720, h = 260, padL = 42, padR = 16, padT = 22, padB = 34;
    const maxVal = Math.max(1, ...dayTotals.map((d) => d.total));
    const stepX = (w - padL - padR) / Math.max(1, dayTotals.length - 1);
    const points = dayTotals.map((d, i) => ({
      x: padL + i * stepX,
      y: h - padB - (d.total / maxVal) * (h - padT - padB),
      d,
    }));
    const pathD = points.map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join(' ');
    const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${h - padB} L ${points[0].x.toFixed(1)} ${h - padB} Z`;
    let dots = '';
    let xlabels = '';
    const labelEvery = Math.max(1, Math.ceil(points.length / 10));
    points.forEach((p, i) => {
      dots += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="#0b5fa5"></circle>`;
      if (i % labelEvery === 0 || i === points.length - 1) {
        xlabels += `<text x="${p.x.toFixed(1)}" y="${h - padB + 16}" font-size="10" fill="#5c7284" text-anchor="middle">${p.d.day}</text>`;
      }
    });
    return `<svg class="tk-chart-svg" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="tkLineGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(18,179,201,.35)"/><stop offset="100%" stop-color="rgba(18,179,201,0)"/>
      </linearGradient></defs>
      <line x1="${padL}" y1="${h - padB}" x2="${w - padR}" y2="${h - padB}" stroke="#c9d6de" stroke-width="1"/>
      <path d="${areaD}" fill="url(#tkLineGrad)" stroke="none"></path>
      <path d="${pathD}" fill="none" stroke="#0b5fa5" stroke-width="2.5"></path>
      ${dots}
      ${xlabels}
    </svg>`;
  }

  // ---------- Đọc báo cáo số liệu (Text-to-Speech) ----------
  function buildReportSpeech() {
    if (!lastReport) return 'Chưa có dữ liệu để đọc.';
    const { dd, dm, dy, dayTotalSum, rows } = lastReport;
    let text = `Báo cáo số liệu khám chữa bệnh, Bệnh viện đa khoa Bình Dương, cơ sở 2, ngày ${parseInt(dd, 10)} tháng ${parseInt(dm, 10)} năm ${dy}. `;
    if (!rows || rows.length === 0 || dayTotalSum === 0) {
      text += 'Hôm nay chưa có lượt khám nào được ghi nhận.';
      return text;
    }
    text += `Tổng số lượt khám trong ngày là ${dayTotalSum} lượt. `;
    rows
      .filter((r) => r.dayVal > 0)
      .forEach((r) => {
        const spoken = SPEECH_LABEL_OVERRIDES[r.label] || r.label;
        text += `${spoken}: ${r.dayVal} lượt. `;
      });
    return text;
  }

  function toggleSpeakReport(btn) {
    if (!('speechSynthesis' in window)) {
      alert('Trình duyệt này không hỗ trợ đọc bằng giọng nói.');
      return;
    }
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      btn.classList.remove('tk-speaking');
      btn.textContent = '🔊 Đọc báo cáo số liệu';
      return;
    }
    const text = buildReportSpeech();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'vi-VN';
    utter.rate = 1;
    const voices = window.speechSynthesis.getVoices();
    const viVoice = voices.find((v) => v.lang === 'vi-VN') || voices.find((v) => v.lang && v.lang.startsWith('vi'));
    if (viVoice) utter.voice = viVoice;
    utter.onstart = () => { btn.classList.add('tk-speaking'); btn.textContent = '⏹ Dừng đọc'; };
    utter.onend = () => { btn.classList.remove('tk-speaking'); btn.textContent = '🔊 Đọc báo cáo số liệu'; };
    utter.onerror = () => { btn.classList.remove('tk-speaking'); btn.textContent = '🔊 Đọc báo cáo số liệu'; };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }

  // ---------- Tự động làm mới (polling) ----------
  function startAutoRefresh(container) {
    stopAutoRefresh();
    autoRefreshTimer = setInterval(() => {
      // Chỉ poll khi tab đang hiển thị và trang thống kê vẫn đang active,
      // tránh gọi Worker vô ích khi người dùng đã rời trang/ẩn tab.
      const pageEl = document.getElementById('page-thongke');
      if (document.hidden || !pageEl || !pageEl.classList.contains('active')) return;
      loadData(container);
    }, AUTO_REFRESH_MS);
  }

  function stopAutoRefresh() {
    if (autoRefreshTimer) {
      clearInterval(autoRefreshTimer);
      autoRefreshTimer = null;
    }
  }

  // Quay lại tab sau khi ẩn -> làm mới ngay lập tức thay vì chờ tới chu kỳ tiếp theo
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      const pageEl = document.getElementById('page-thongke');
      const contentEl = document.getElementById('thongkeContent');
      if (pageEl && pageEl.classList.contains('active') && contentEl && contentEl.dataset.tkInit === '1') {
        loadData(contentEl);
      }
    }
  });

  function initDashboard(container) {
    if (container.dataset.tkInit === '1') { loadData(container); startAutoRefresh(container); return; }
    container.dataset.tkInit = '1';
    container.innerHTML = skeletonHtml();
    loadData(container);
    startAutoRefresh(container);
  }

  function isUnlocked() {
    return !!(window.BSDHA_LOCK && window.BSDHA_LOCK.isUnlocked());
  }

  // Theo dõi khi trang #page-thongke được kích hoạt (SPA đổi class "active")
  function watchPageActivation() {
    const pageEl = document.getElementById('page-thongke');
    if (!pageEl) return;
    const observer = new MutationObserver(() => {
      if (pageEl.classList.contains('active') && isUnlocked()) {
        initDashboard(document.getElementById('thongkeContent'));
      } else if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    });
    observer.observe(pageEl, { attributes: true, attributeFilter: ['class'] });
    // Trường hợp trang load thẳng vào /thongke và đã unlock từ trước (sessionStorage)
    if (pageEl.classList.contains('active') && isUnlocked()) {
      initDashboard(document.getElementById('thongkeContent'));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchPageActivation);
  } else {
    watchPageActivation();
  }
})();
