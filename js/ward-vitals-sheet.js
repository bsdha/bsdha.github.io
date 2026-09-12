(function () {
  const pasteArea = document.getElementById('wvPasteArea');
  const parseBtn = document.getElementById('wvParseBtn');
  const fileInput = document.getElementById('wvFileInput');
  const fileNameEl = document.getElementById('wvFileName');
  const statusEl = document.getElementById('wvStatus');

  const previewCard = document.getElementById('wvPreviewCard');
  const editBody = document.getElementById('wvEditBody');
  const addRowBtn = document.getElementById('wvAddRowBtn');
  const buildBtn = document.getElementById('wvBuildBtn');
  const dateInput = document.getElementById('wvSheetDate');

  const sheetCard = document.getElementById('wvSheetCard');
  const sheetPrintArea = document.getElementById('wvSheetPrintArea');
  const backBtn = document.getElementById('wvBackBtn');
  const printBtn = document.getElementById('wvPrintBtn');

  if (!pasteArea) return; // trang chưa được mở / phần tử chưa tồn tại

  function setStatus(msg, isError) {
    statusEl.textContent = msg || '';
    statusEl.classList.toggle('wv-error', !!isError);
  }

  function todayLabel() {
    const d = new Date();
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  }
  if (dateInput) dateInput.value = todayLabel();

  // ---------- Chữ hoa tiếng Việt (kể cả khi người dùng dán/gõ chữ thường) ----------
  function toVNUpper(s) {
    return String(s || '').toLocaleUpperCase('vi-VN');
  }

  // ---------- Viết tắt tên quá dài (>= 5 từ) khi in bảng — "Tên" (từ cuối) không bao giờ viết tắt ----------
  const VN_VOWELS_RE = /[AĂÂEÊIOÔƠUƯYÁẮẤÉẾÍÓỐỚÚỨÝÀẰẦÈỀÌÒỒỜÙỪỲẢẲẨẺỂỈỎỔỞỦỬỶÃẴẪẼỄĨÕỖỠŨỮỸẠẶẬẸỆỊỌỘỢỤỰỴ]/g;
  function abbreviateLeadWord(word) {
    if (!word || word.length <= 2) return word;
    const first = word[0];
    const rest = word.slice(1).replace(VN_VOWELS_RE, '');
    const abb = first + rest;
    return (abb.length > 0 && abb.length < word.length) ? abb : word;
  }
  function abbreviateSecondWord(word) {
    if (!word) return word;
    return word[0] + '.';
  }
  function formatNameForPrint(rawName) {
    const upper = toVNUpper(rawName).trim();
    const words = upper.split(/\s+/).filter(Boolean);
    if (words.length < 5) return words.join(' ');
    const lastWord = words[words.length - 1]; // "Tên" — tuyệt đối không viết tắt
    const middle = words.slice(0, -1).map((w, idx) => {
      if (idx === 0) return abbreviateLeadWord(w);
      if (idx === 1) return abbreviateSecondWord(w);
      return w;
    });
    middle.push(lastWord);
    return middle.join(' ');
  }

  // ---------- Phân tích văn bản: mỗi dòng cố nhận ra "Họ & tên" + "Năm sinh" ----------
  function parseListText(text) {
    const lines = String(text || '').split(/\r?\n/);
    const rows = [];
    const yearRe = /(19[0-9]{2}|20[0-2][0-9])/;

    lines.forEach(raw => {
      let line = raw.trim();
      if (!line) return;
      // Bỏ số thứ tự / gạch đầu dòng: "1.", "1)", "-", "•"...
      line = line.replace(/^\s*(\d+[\.\)]|[-•*])\s*/, '');
      if (!line) return;

      const m = line.match(yearRe);
      let name, year = '';
      if (m) {
        year = m[1];
        name = line.slice(0, m.index);
        // Bỏ dấu chấm, phẩy, ngoặc còn sót lại cuối tên
        name = name.replace(/[.,\-–(\s]+$/, '').trim();
      } else {
        name = line.trim();
      }
      // Bỏ hẳn các dòng không còn chữ cái nào (VD dòng chỉ có số phòng...)
      if (!/[A-Za-zÀ-ỹ]/.test(name)) return;
      rows.push({ name: toVNUpper(name), year });
    });
    return rows;
  }

  function renderEditRows(rows) {
    editBody.innerHTML = '';
    rows.forEach(r => addEditRow(r.name, r.year, r.bed));
    if (!rows.length) addEditRow('', '', '');
    previewCard.hidden = false;
    sheetCard.hidden = true;
    previewCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function addEditRow(name, year, bed) {
    const tr = document.createElement('tr');
    tr.innerHTML =
      '<td class="wv-drag-handle-cell"><span class="wv-drag-handle" title="Kéo để đổi thứ tự">⋮⋮</span></td>' +
      '<td class="wv-stt"></td>' +
      '<td><input type="text" class="wv-name-input" value="' + escapeAttr(toVNUpper(name || '')) + '" placeholder="Họ và tên"></td>' +
      '<td><input type="text" class="wv-year-input" value="' + escapeAttr(year || '') + '" placeholder="Năm sinh"></td>' +
      '<td><input type="text" class="wv-bed-input" value="' + escapeAttr(bed || '') + '" placeholder="Số giường"></td>' +
      '<td><button type="button" class="wv-row-del" title="Xoá dòng">✕</button></td>';
    editBody.appendChild(tr);
    attachRowDrag(tr);
    renumberRows();
  }

  function renumberRows() {
    Array.from(editBody.querySelectorAll('tr')).forEach((tr, i) => {
      tr.querySelector('.wv-stt').textContent = i + 1;
    });
  }

  // ---------- Kéo-thả để đổi thứ tự các dòng trong bảng kiểm tra danh sách ----------
  let dragSrcRow = null;
  function attachRowDrag(tr) {
    const handle = tr.querySelector('.wv-drag-handle');
    if (handle) {
      handle.addEventListener('mousedown', () => { tr.draggable = true; });
      handle.addEventListener('touchstart', () => { tr.draggable = true; }, { passive: true });
    }
    tr.addEventListener('dragstart', (e) => {
      dragSrcRow = tr;
      tr.classList.add('wv-dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', ''); } catch (err) { /* Safari cũ */ }
    });
    tr.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!dragSrcRow || tr === dragSrcRow) return;
      const rect = tr.getBoundingClientRect();
      const putAfter = (e.clientY - rect.top) / rect.height > 0.5;
      tr.parentNode.insertBefore(dragSrcRow, putAfter ? tr.nextSibling : tr);
      renumberRows();
    });
    tr.addEventListener('dragend', () => {
      tr.draggable = false;
      tr.classList.remove('wv-dragging');
      dragSrcRow = null;
      renumberRows();
    });
  }
  // Phòng khi người dùng bấm-giữ tay cầm rồi thả ra mà không kéo (không kích hoạt dragstart)
  document.addEventListener('mouseup', () => {
    if (!editBody) return;
    Array.from(editBody.querySelectorAll('tr')).forEach(tr => { tr.draggable = false; });
  });

  // Tự động chuyển tên sang chữ hoa toàn bộ ngay khi người dùng gõ/sửa trực tiếp trong bảng
  editBody.addEventListener('blur', (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('wv-name-input')) {
      e.target.value = toVNUpper(e.target.value);
    }
  }, true);

  function escapeAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ---------- Trang in dùng chung (bảng có dữ liệu lẫn bảng in trắng) ----------
  // Mỗi trang tối đa 20 dòng, tự giãn đều lấp gần hết chiều cao A4, có tiêu đề riêng.
  const SHEET_PAGE_SIZE = 20;
  function buildSheetPageHtml(titleText, dateLabel, rowsHtml) {
    return '<div class="wv-print-page">' +
      '<h2 class="wv-sheet-title">' + escapeHtml(titleText) + '</h2>' +
      '<p class="wv-sheet-date">NGÀY: ' + escapeHtml(dateLabel) + '</p>' +
      '<div class="wv-sheet-table-wrap"><table class="wv-sheet-table">' +
      '<colgroup><col style="width:5%"><col style="width:27%"><col style="width:8%"><col style="width:6%">' +
      '<col style="width:9%"><col style="width:9%"><col style="width:9%"><col style="width:9%"><col style="width:9%"><col style="width:9%"></colgroup>' +
      '<thead><tr><th>STT</th><th>HỌ &amp; TÊN</th><th>NĂM SINH</th><th>GIƯỜNG</th><th>MẠCH</th><th>NHIỆT ĐỘ</th><th>HUYẾT ÁP</th><th>NHỊP THỞ</th><th>SpO2</th><th>ĐHMM</th></tr></thead>' +
      '<tbody>' + rowsHtml + '</tbody>' +
      '</table></div>' +
      '</div>';
  }

  editBody.addEventListener('click', (e) => {
    if (e.target.classList.contains('wv-row-del')) {
      const rows = editBody.querySelectorAll('tr');
      if (rows.length <= 1) { e.target.closest('tr').querySelectorAll('input').forEach(i => i.value = ''); return; }
      e.target.closest('tr').remove();
      renumberRows();
    }
  });

  if (addRowBtn) addRowBtn.addEventListener('click', () => addEditRow('', '', ''));

  if (parseBtn) parseBtn.addEventListener('click', () => {
    const rows = parseListText(pasteArea.value);
    if (!rows.length) {
      setStatus('Không nhận ra dòng nào có tên hợp lệ. Kiểm tra lại nội dung đã dán.', true);
      return;
    }
    setStatus('Đã nhận ' + rows.length + ' bệnh nhân. Kiểm tra lại bên dưới trước khi in.');
    renderEditRows(rows);
  });

  // ---------- Tải file PDF / Excel / Word / txt / csv ----------
  if (fileInput) fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    fileNameEl.textContent = file.name;
    setStatus('Đang đọc file "' + file.name + '"...');
    try {
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      let text = '';
      if (ext === 'txt' || ext === 'csv') {
        text = await file.text();
      } else if (ext === 'xlsx' || ext === 'xls') {
        text = await extractExcelText(file);
      } else if (ext === 'docx') {
        text = await extractDocxText(file);
      } else if (ext === 'pdf') {
        text = await extractPdfText(file);
      } else {
        setStatus('Định dạng file chưa được hỗ trợ. Dùng PDF, Excel, Word, txt hoặc csv.', true);
        return;
      }
      pasteArea.value = text;
      const rows = parseListText(text);
      if (!rows.length) {
        setStatus('Đọc được file nhưng không nhận ra tên/năm sinh nào. Bạn có thể sửa trực tiếp trong ô dán ở trên rồi bấm "Phân tích danh sách".', true);
        return;
      }
      setStatus('Đã đọc file và nhận được ' + rows.length + ' bệnh nhân. Kiểm tra lại bên dưới trước khi in.');
      renderEditRows(rows);
    } catch (err) {
      console.error(err);
      setStatus('Có lỗi khi đọc file: ' + (err && err.message ? err.message : err), true);
    }
  });

  function extractExcelText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Không đọc được file Excel'));
      reader.onload = () => {
        try {
          const data = new Uint8Array(reader.result);
          const wb = XLSX.read(data, { type: 'array' });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          const lines = rows.map(r => (r || []).map(c => (c === undefined || c === null) ? '' : String(c)).join(' ').trim());
          resolve(lines.join('\n'));
        } catch (e) { reject(e); }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  function extractDocxText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Không đọc được file Word'));
      reader.onload = () => {
        mammoth.extractRawText({ arrayBuffer: reader.result })
          .then(result => resolve(result.value || ''))
          .catch(reject);
      };
      reader.readAsArrayBuffer(file);
    });
  }

  function extractPdfText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Không đọc được file PDF'));
      reader.onload = async () => {
        try {
          const pdfjsLib = window.pdfjsLib;
          if (!pdfjsLib) throw new Error('Thư viện đọc PDF chưa sẵn sàng, thử lại sau vài giây.');
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          const doc = await pdfjsLib.getDocument({ data: reader.result }).promise;
          let fullText = '';
          for (let p = 1; p <= doc.numPages; p++) {
            const page = await doc.getPage(p);
            const content = await page.getTextContent();
            let lastY = null, line = '';
            content.items.forEach(item => {
              const y = Math.round(item.transform[5]);
              if (lastY !== null && Math.abs(y - lastY) > 3) {
                fullText += line.trim() + '\n';
                line = '';
              }
              line += item.str + ' ';
              lastY = y;
            });
            fullText += line.trim() + '\n';
          }
          resolve(fullText);
        } catch (e) { reject(e); }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  // ---------- Tạo bảng in cuối cùng ----------
  if (buildBtn) buildBtn.addEventListener('click', () => {
    const names = Array.from(editBody.querySelectorAll('.wv-name-input')).map(i => i.value.trim());
    const years = Array.from(editBody.querySelectorAll('.wv-year-input')).map(i => i.value.trim());
    const beds = Array.from(editBody.querySelectorAll('.wv-bed-input')).map(i => i.value.trim());
    const rows = [];
    for (let i = 0; i < names.length; i++) {
      if (!names[i]) continue;
      rows.push({ name: names[i], year: years[i] || '', bed: beds[i] || '' });
    }
    if (!rows.length) {
      setStatus('Danh sách đang trống, chưa có bệnh nhân nào để tạo bảng.', true);
      return;
    }
    const dateLabel = dateInput.value || todayLabel();
    const pagesHtml = [];
    for (let p = 0; p < rows.length; p += SHEET_PAGE_SIZE) {
      const chunk = rows.slice(p, p + SHEET_PAGE_SIZE);
      const rowsHtml = chunk.map((r, i) =>
        '<tr>' +
        '<td>' + (p + i + 1) + '</td>' +
        '<td>' + escapeHtml(formatNameForPrint(r.name)) + '</td>' +
        '<td>' + escapeHtml(r.year) + '</td>' +
        '<td>' + escapeHtml(r.bed) + '</td>' +
        '<td></td><td></td><td></td><td></td><td></td><td></td>' +
        '</tr>'
      ).join('');
      pagesHtml.push(buildSheetPageHtml('DANH SÁCH BỆNH NHÂN KHOA HSCC', dateLabel, rowsHtml));
    }
    sheetPrintArea.innerHTML = pagesHtml.join('');
    previewCard.hidden = true;
    sheetCard.hidden = false;
    sheetCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  if (backBtn) backBtn.addEventListener('click', () => {
    sheetCard.hidden = true;
    previewCard.hidden = false;
  });

  if (printBtn) printBtn.addEventListener('click', () => {
    if (typeof logUsage === 'function') logUsage('wardvitals_print');
    window.print();
  });

  // ============================================================
  // In bảng đi buồng TRẮNG (mẫu trống, viết tay) — không cần danh sách bệnh nhân
  // ============================================================
  const blankDeptSelect = document.getElementById('wvBlankDeptSelect');
  const blankPagesSelect = document.getElementById('wvBlankPagesSelect');
  const blankPrintBtn = document.getElementById('wvBlankPrintBtn');
  const blankPrintArea = document.getElementById('wvBlankPrintArea');

  if (blankDeptSelect && blankPrintBtn) {
    const DEPTS_KEY = 'bsdha_wv_blank_depts_v1';
    const LAST_DEPT_KEY = 'bsdha_wv_blank_last_dept_v1';
    const LAST_PAGES_KEY = 'bsdha_wv_blank_last_pages_v1';
    const ADD_NEW_VALUE = '__add_new__';
    const DEFAULT_DEPTS = ['CCHS', 'Nội tổng hợp', 'Ngoại tổng hợp', 'Sản', 'Nhi', 'Cấp cứu', 'Hồi sức tích cực (ICU)', 'YHCT - PHCN'];

    function loadDepts() {
      try {
        const raw = localStorage.getItem(DEPTS_KEY);
        const arr = raw ? JSON.parse(raw) : null;
        if (Array.isArray(arr) && arr.length) return arr;
      } catch (e) {}
      return DEFAULT_DEPTS.slice();
    }
    function saveDepts(list) {
      try { localStorage.setItem(DEPTS_KEY, JSON.stringify(list.slice(0, 40))); } catch (e) {}
    }
    function rememberDept(name) {
      const list = loadDepts();
      const idx = list.findIndex(d => d.toLowerCase() === name.toLowerCase());
      if (idx !== -1) list.splice(idx, 1);
      list.unshift(name);
      saveDepts(list);
    }

    function renderDeptOptions(selectedValue) {
      const list = loadDepts();
      blankDeptSelect.innerHTML = list.map(d => '<option value="' + escapeAttr(d) + '">' + escapeHtml(d) + '</option>').join('') +
        '<option value="' + ADD_NEW_VALUE + '">+ Thêm khoa mới...</option>';
      if (selectedValue && list.some(d => d.toLowerCase() === selectedValue.toLowerCase())) {
        blankDeptSelect.value = list.find(d => d.toLowerCase() === selectedValue.toLowerCase());
      } else {
        blankDeptSelect.selectedIndex = 0;
      }
    }

    // Khôi phục lựa chọn lần in gần nhất (lưu trong trình duyệt — còn nguyên dù tắt/mở lại máy)
    let lastDept = '';
    try { lastDept = localStorage.getItem(LAST_DEPT_KEY) || ''; } catch (e) {}
    renderDeptOptions(lastDept || 'CCHS');

    let lastPages = '1';
    try { lastPages = localStorage.getItem(LAST_PAGES_KEY) || '1'; } catch (e) {}
    blankPagesSelect.value = lastPages === '2' ? '2' : '1';

    blankDeptSelect.addEventListener('change', () => {
      if (blankDeptSelect.value !== ADD_NEW_VALUE) return;
      const name = (window.prompt('Nhập tên khoa mới:') || '').trim();
      if (!name) { renderDeptOptions(lastDept || 'CCHS'); return; }
      rememberDept(name);
      lastDept = name;
      renderDeptOptions(name);
    });

    function buildBlankPageHtml(deptTitle, startNum, count) {
      let rows = '';
      for (let i = 0; i < count; i++) {
        rows += '<tr><td>' + (startNum + i) + '</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>';
      }
      const title = 'DANH SÁCH BỆNH NHÂN KHOA ' + toVNUpper(deptTitle || 'CCHS');
      return buildSheetPageHtml(title, '.................................................', rows);
    }

    blankPrintBtn.addEventListener('click', () => {
      if (blankDeptSelect.value === ADD_NEW_VALUE) return; // đang mở prompt thêm khoa, chưa có gì để in
      const deptTitle = blankDeptSelect.value || 'CCHS';
      const pages = blankPagesSelect.value === '2' ? '2' : '1';

      try { localStorage.setItem(LAST_DEPT_KEY, deptTitle); } catch (e) {}
      try { localStorage.setItem(LAST_PAGES_KEY, pages); } catch (e) {}
      lastDept = deptTitle;
      lastPages = pages;

      let html;
      if (pages === '2') {
        html = buildBlankPageHtml(deptTitle, 1, 20) + buildBlankPageHtml(deptTitle, 21, 20);
      } else {
        html = buildBlankPageHtml(deptTitle, 1, 20);
      }
      blankPrintArea.innerHTML = html;

      if (typeof logUsage === 'function') logUsage('wardvitals_print');

      blankPrintArea.classList.add('wv-printing');
      // Ép reflow trước khi mở hộp thoại in, tránh trang trắng do race condition
      void blankPrintArea.offsetHeight;
      setTimeout(() => {
        window.print();
      }, 30);
    });

    window.addEventListener('afterprint', () => {
      blankPrintArea.classList.remove('wv-printing');
    });
  }

})();
