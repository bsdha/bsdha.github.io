/**
 * Trang "Thống kê tiếp nhận" — tích hợp vào SPA (bsdha.github.io).
 * Đọc dữ liệu từ data/thongke.json (do Cloudflare Worker ghi mỗi lần userscript
 * trên HIS đồng bộ), vẽ biểu đồ cột theo ngày + bảng chi tiết theo phòng khám.
 * Dùng chung cơ chế khoá mật khẩu "cs2" với các trang nội bộ khác (window.BSDHA_LOCK).
 */
(function () {
  const DATA_URL = 'https://raw.githubusercontent.com/bsdha/bsdha.github.io/main/data/thongke.json';

  const ROW_LABELS_FALLBACK = {
    3: 'Phòng khám Nội 1', 4: 'Phòng khám Nội 2', 5: 'Phòng Khám Nội 3',
    6: 'Phòng khám Ngoại tổng hợp', 7: 'Phòng khám khoa Sản', 8: 'Khám Nhi',
    9: 'Khám Mắt', 10: 'PK CS2_RHM', 11: 'Khám Tai Mũi Họng', 12: 'Phòng khám YHCT',
    13: 'Cấp Cứu', 14: 'Không BHYT (chuyên khoa + dịch vụ)',
    15: 'Khám sức khoẻ lái xe', 16: 'Phòng tiêm ngừa',
  };

  const STYLE_ID = 'thongke-dashboard-style';
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .tk-wrap{max-width:1100px;margin:0 auto;padding:10px 6px 44px;font-family:inherit;font-size:15px;}
      .tk-head{display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:14px;
        border-bottom:2px solid #0e2233;padding-bottom:16px;margin-bottom:24px;}
      .tk-head h2{margin:0;font-size:26px;font-weight:800;color:#0e2233;}
      .tk-head .tk-sub{font-size:14.5px;color:#5c7284;margin-top:5px;}
      .tk-controls{display:flex;gap:10px;align-items:center;}
      .tk-controls select{font-family:'Courier New',monospace;font-size:15px;padding:9px 12px;border-radius:7px;
        border:1px solid #c9d6de;background:#fff;color:#0e2233;cursor:pointer;}
      .tk-refresh{font-size:14.5px;font-weight:700;padding:9px 14px;border-radius:7px;border:1px solid #0b5fa5;
        background:#fff;color:#0b5fa5;cursor:pointer;}
      .tk-refresh:hover{background:#0b5fa5;color:#fff;}
      .tk-vitals{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px;}
      .tk-vital{background:#fff;border:1px solid #c9d6de;border-radius:12px;padding:16px 18px;position:relative;overflow:hidden;}
      .tk-vital::before{content:'';position:absolute;top:0;left:0;width:4px;height:100%;background:#0b5fa5;}
      .tk-vital.pulse::before{background:#d34b4b;}
      .tk-vital .l{font-family:'Courier New',monospace;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#5c7284;font-weight:700;}
      .tk-vital .v{font-family:'Courier New',monospace;font-size:30px;font-weight:700;margin-top:6px;color:#0e2233;}
      .tk-vital .v span{font-size:14px;font-weight:400;color:#7c8fa0;}
      .tk-panel{background:#fff;border:1px solid #c9d6de;border-radius:12px;padding:20px;margin-bottom:22px;}
      .tk-panel h3{font-size:15px;font-family:'Courier New',monospace;text-transform:uppercase;letter-spacing:.06em;
        margin:0 0 16px;color:#0e2233;display:flex;align-items:center;gap:8px;font-weight:700;}
      .tk-panel h3::before{content:'';width:8px;height:8px;background:#0b5fa5;border-radius:50%;display:inline-block;}
      .tk-canvas-wrap{position:relative;height:320px;width:100%;}
      .tk-table-wrap{overflow-x:auto;max-height:440px;overflow-y:auto;}
      .tk-table{width:100%;border-collapse:collapse;font-size:14.5px;}
      .tk-table thead th{font-family:'Courier New',monospace;font-size:12px;text-transform:uppercase;color:#5c7284;
        text-align:right;padding:9px 11px;border-bottom:2px solid #0e2233;position:sticky;top:0;background:#fff;font-weight:700;}
      .tk-table thead th:first-child{text-align:left;}
      .tk-table tbody td{padding:9px 11px;text-align:right;border-bottom:1px solid #e3e9ed;font-family:'Courier New',monospace;}
      .tk-table tbody td:first-child{text-align:left;font-family:inherit;font-weight:600;}
      .tk-table tbody tr:hover{background:rgba(11,95,165,0.05);}
      .tk-table tfoot td{padding:11px;text-align:right;font-family:'Courier New',monospace;font-weight:700;
        border-top:2px solid #0e2233;background:rgba(11,95,165,0.04);}
      .tk-table tfoot td:first-child{text-align:left;}
      .tk-empty{color:#7c8fa0;font-size:14.5px;padding:32px;text-align:center;font-family:'Courier New',monospace;}
      @media (max-width:720px){
        .tk-vitals{grid-template-columns:repeat(2,1fr);}
        .tk-canvas-wrap{height:260px;}
        .tk-head h2{font-size:22px;}
      }
    `;
    document.head.appendChild(style);
  }

  function fmt(n) { return n.toLocaleString('vi-VN'); }

  function skeletonHtml() {
    return `
      <div class="tk-wrap">
        <div class="tk-head">
          <div><h2>Thống kê tiếp nhận</h2><div class="tk-sub" id="tkLastSync">Đang tải dữ liệu…</div></div>
          <div class="tk-controls">
            <select id="tkMonthSelect"></select>
            <button class="tk-refresh" id="tkRefreshBtn">↻ Làm mới</button>
          </div>
        </div>
        <div class="tk-vitals" id="tkVitals"></div>
        <div class="tk-panel">
          <h3>Tổng lượt khám theo ngày</h3>
          <div class="tk-canvas-wrap"><canvas id="tkChart"></canvas></div>
        </div>
        <div class="tk-panel">
          <h3>Chi tiết theo phòng khám</h3>
          <div class="tk-table-wrap" id="tkTableWrap"><div class="tk-empty">Đang tải…</div></div>
        </div>
      </div>
    `;
  }

  let fullData = null;
  let chartInstance = null;

  async function loadData(container) {
    const lastSyncEl = container.querySelector('#tkLastSync');
    if (lastSyncEl) lastSyncEl.textContent = 'Đang tải dữ liệu…';
    try {
      const res = await fetch(DATA_URL + '?t=' + Date.now());
      if (!res.ok) throw new Error('HTTP ' + res.status);
      fullData = await res.json();
      populateMonthSelect(container);
    } catch (e) {
      if (lastSyncEl) lastSyncEl.textContent = '⚠️ Không tải được dữ liệu: ' + e.message;
      const tableWrap = container.querySelector('#tkTableWrap');
      if (tableWrap) tableWrap.innerHTML = '<div class="tk-empty">Không có dữ liệu.</div>';
    }
  }

  function populateMonthSelect(container) {
    const months = Object.keys((fullData && fullData.months) || {}).sort().reverse();
    const sel = container.querySelector('#tkMonthSelect');
    sel.innerHTML = '';
    if (months.length === 0) {
      container.querySelector('#tkLastSync').textContent = 'Chưa có dữ liệu nào được đồng bộ.';
      container.querySelector('#tkTableWrap').innerHTML = '<div class="tk-empty">Chưa có dữ liệu.</div>';
      return;
    }
    months.forEach((m) => {
      const opt = document.createElement('option');
      opt.value = m;
      const [y, mo] = m.split('-');
      opt.textContent = 'Tháng ' + parseInt(mo, 10) + ' / ' + y;
      sel.appendChild(opt);
    });
    sel.onchange = () => renderMonth(container, sel.value);
    renderMonth(container, months[0]);
  }

  // Chỉ chấp nhận khóa ngày là số nguyên hợp lệ (1-31); loại bỏ khóa rác
  // như "" phát sinh từ những lần đồng bộ cũ bị lỗi ngày.
  function isValidDayKey(k) {
    return /^\d{1,2}$/.test(k) && Number(k) >= 1 && Number(k) <= 31;
  }

  function renderMonth(container, monthKey) {
    const month = fullData.months[monthKey];
    if (!month) return;

    const days = Object.keys(month.totalByDay || {})
      .filter(isValidDayKey)
      .map(Number)
      .sort((a, b) => a - b);
    const totals = days.map((d) => month.totalByDay[String(d)] || 0);

    let lastSyncDay = null, lastSyncTime = null;
    days.forEach((d) => {
      const t = month.lastSyncByDay ? month.lastSyncByDay[String(d)] : null;
      if (t && (!lastSyncTime || t > lastSyncTime)) { lastSyncTime = t; lastSyncDay = d; }
    });
    const note = container.querySelector('#tkLastSync');
    if (lastSyncTime) {
      const dt = new Date(lastSyncTime);
      note.textContent = 'Đồng bộ gần nhất: ngày ' + lastSyncDay + ' lúc ' +
        dt.toLocaleTimeString('vi-VN') + ' ' + dt.toLocaleDateString('vi-VN');
    } else {
      note.textContent = 'Chưa có lần đồng bộ nào trong tháng này.';
    }

    renderVitals(container, days, totals);
    renderChart(container, days, totals);
    renderTable(container, days, month.rows || {});
  }

  function renderVitals(container, days, totals) {
    const todayTotal = totals.length ? totals[totals.length - 1] : 0;
    const sum = totals.reduce((a, b) => a + b, 0);
    const avg = totals.length ? Math.round(sum / totals.length) : 0;
    const max = totals.length ? Math.max(...totals) : 0;
    const maxDay = totals.length ? days[totals.indexOf(max)] : '-';

    const cards = [
      { l: 'Ngày gần nhất', v: todayTotal, u: 'lượt', pulse: true },
      { l: 'Tổng cộng tháng', v: sum, u: 'lượt' },
      { l: 'Trung bình / ngày', v: avg, u: 'lượt' },
      { l: 'Cao nhất', v: max, u: 'ngày ' + maxDay },
    ];

    container.querySelector('#tkVitals').innerHTML = cards.map((c) => `
      <div class="tk-vital${c.pulse ? ' pulse' : ''}">
        <div class="l">${c.l}</div>
        <div class="v">${fmt(c.v)} <span>${c.u}</span></div>
      </div>
    `).join('');
  }

  function renderChart(container, days, totals) {
    const canvas = container.querySelector('#tkChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const ctx = canvas.getContext('2d');
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: days.map((d) => 'Ng.' + d),
        datasets: [{
          label: 'Tổng lượt khám',
          data: totals,
          backgroundColor: 'rgba(11,95,165,0.75)',
          borderRadius: 4,
          maxBarThickness: 28,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { bodyFont: { size: 13 }, titleFont: { size: 13 } },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(11,95,165,0.08)' },
            ticks: { font: { size: 12.5 } },
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 12.5 } },
          },
        },
      },
    });
  }

  function renderTable(container, days, rows) {
    // Chỉ giữ các dòng có khóa là số hợp lệ (loại khóa rác "" từng bị ghi
    // nhầm do lỗi ngày ở lần đồng bộ cũ — nguyên nhân gây dòng trùng lặp).
    const rowNums = Object.keys(rows)
      .filter((rn) => /^\d+$/.test(rn))
      .sort((a, b) => Number(a) - Number(b));
    const wrap = container.querySelector('#tkTableWrap');
    if (rowNums.length === 0) {
      wrap.innerHTML = '<div class="tk-empty">Chưa có dữ liệu chi tiết.</div>';
      return;
    }

    let thead = '<tr><th>Phòng khám</th>' + days.map((d) => `<th>${d}</th>`).join('') + '</tr>';
    let tbody = '';
    const dayTotals = {};
    days.forEach((d) => (dayTotals[d] = 0));

    rowNums.forEach((rn) => {
      const row = rows[rn];
      const label = row.label || ROW_LABELS_FALLBACK[rn] || ('Dòng ' + rn);
      tbody += '<tr><td>' + label + '</td>' + days.map((d) => {
        const v = row.days[String(d)] || 0;
        dayTotals[d] += v;
        return `<td>${v}</td>`;
      }).join('') + '</tr>';
    });

    const tfoot = '<tr><td>Tổng</td>' + days.map((d) => `<td>${dayTotals[d]}</td>`).join('') + '</tr>';

    wrap.innerHTML = `<table class="tk-table"><thead>${thead}</thead><tbody>${tbody}</tbody><tfoot>${tfoot}</tfoot></table>`;
  }

  function initDashboard(container) {
    if (container.dataset.tkInit === '1') { loadData(container); return; }
    container.dataset.tkInit = '1';
    container.innerHTML = skeletonHtml();
    container.querySelector('#tkRefreshBtn').onclick = () => loadData(container);
    loadData(container);
  }

  function isUnlocked() {
    return !!(window.BSDHA_LOCK && window.BSDHA_LOCK.isUnlocked());
  }

  function tryInit() {
    const content = document.getElementById('thongkeContent');
    if (!content) return;
    if (isUnlocked()) {
      initDashboard(content);
    }
    // Nếu chưa mở khoá, spa-router.js sẽ tự hiện màn hình yêu cầu mật khẩu trước khi
    // trang này lộ ra (GUARDED_PAGES); khi người dùng nhập đúng, showPage gọi lại
    // callback -> ta cần theo dõi để render đúng lúc đó. Cách đơn giản: theo dõi việc
    // trang chuyển sang active rồi kiểm tra unlock mỗi lần.
  }

  // Theo dõi khi trang #page-thongke được kích hoạt (SPA đổi class "active")
  function watchPageActivation() {
    const pageEl = document.getElementById('page-thongke');
    if (!pageEl) return;
    const observer = new MutationObserver(() => {
      if (pageEl.classList.contains('active') && isUnlocked()) {
        initDashboard(document.getElementById('thongkeContent'));
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
