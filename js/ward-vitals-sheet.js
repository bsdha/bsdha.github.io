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
  const sheetDeptSelect = document.getElementById('wvSheetDeptSelect');

  const sheetCard = document.getElementById('wvSheetCard');
  const sheetPrintArea = document.getElementById('wvSheetPrintArea');
  const backBtn = document.getElementById('wvBackBtn');
  const printBtn = document.getElementById('wvPrintBtn');

  if (!pasteArea) return; // trang chưa được mở / phần tử chưa tồn tại

  // ---------- Ẩn/hiện "Ví dụ:" (overlay giả placeholder, có thể hover từng chữ) ----------
  // Dùng div overlay thay cho placeholder gốc vì placeholder thật của trình
  // duyệt không cho phép tô màu/hover từng chữ riêng lẻ bên trong.
  const exampleOverlay = document.getElementById('wvExampleOverlay');
  if (exampleOverlay) {
    const wrap = pasteArea.closest('.wv-textarea-wrap') || exampleOverlay.parentElement;
    function syncExampleOverlay() {
      wrap.classList.toggle('wv-has-value', pasteArea.value.length > 0);
    }
    syncExampleOverlay();
    pasteArea.addEventListener('input', syncExampleOverlay);

    // Tự động chạy hiệu ứng lần lượt qua từng chữ (không cần rê chuột) —
    // dừng khi ô đã có nội dung (overlay đang ẩn) để đỡ tốn tài nguyên.
    const funWords = Array.from(exampleOverlay.querySelectorAll('.wv-fun-word'));
    if (funWords.length) {
      let idx = 0;
      setInterval(() => {
        if (wrap.classList.contains('wv-has-value')) return;
        funWords.forEach(el => el.classList.remove('wv-fun-active'));
        funWords[idx].classList.add('wv-fun-active');
        idx = (idx + 1) % funWords.length;
      }, 1000);
    }
  }

  function setStatus(msg, isError) {
    statusEl.textContent = msg || '';
    statusEl.classList.toggle('wv-error', !!isError);
  }

  function todayLabel() {
    const d = new Date();
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  }
  if (dateInput) dateInput.value = todayLabel();

  // ---------- Danh sách khoa dùng chung (bảng có DS bệnh nhân & bảng trắng) ----------
  // Lưu trong trình duyệt (localStorage) nên còn nguyên dù tắt/mở lại máy,
  // và chọn ở nơi nào cũng nhớ chung một khoa đang trực gần nhất.
  const DEPTS_KEY = 'bsdha_wv_blank_depts_v1';
  const LAST_DEPT_KEY = 'bsdha_wv_blank_last_dept_v1';
  const DEPT_ADD_NEW_VALUE = '__add_new__';
  const DEFAULT_DEPTS = ['CCHS', 'Nội tổng hợp', 'Ngoại tổng hợp', 'Sản', 'Nhi', 'Nội - Nhi - Nhiễm', 'Hồi sức tích cực (ICU)', 'YHCT - PHCN'];

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
  // Đổi tên khoa cũ đã lưu trong máy người dùng sang tên mới, để những máy
  // đã dùng công cụ từ trước cũng tự cập nhật mà không cần xoá dữ liệu trình duyệt.
  const RENAMED_DEPTS = { 'cấp cứu': 'Nội - Nhi - Nhiễm' };
  (function migrateRenamedDepts() {
    const list = loadDepts();
    let changed = false;
    const newList = list.map(d => {
      const renamed = RENAMED_DEPTS[String(d).trim().toLowerCase()];
      if (renamed && renamed !== d) { changed = true; return renamed; }
      return d;
    });
    if (changed) {
      saveDepts(newList);
      try {
        const last = localStorage.getItem(LAST_DEPT_KEY);
        const renamedLast = last && RENAMED_DEPTS[last.trim().toLowerCase()];
        if (renamedLast) localStorage.setItem(LAST_DEPT_KEY, renamedLast);
      } catch (e) {}
    }
  })();
  function rememberDept(name) {
    const list = loadDepts();
    const idx = list.findIndex(d => d.toLowerCase() === name.toLowerCase());
    if (idx !== -1) list.splice(idx, 1);
    list.unshift(name);
    saveDepts(list);
  }
  function lastDeptChosen() {
    try { return localStorage.getItem(LAST_DEPT_KEY) || ''; } catch (e) { return ''; }
  }
  function rememberLastDept(name) {
    try { localStorage.setItem(LAST_DEPT_KEY, name); } catch (e) {}
  }
  // Vẽ danh sách khoa vào một thẻ <select>, có sẵn mục "+ Thêm khoa mới..."
  // và tự xử lý việc thêm khoa mới khi người dùng chọn mục đó.
  function wireDeptSelect(selectEl, initialValue) {
    function render(selectedValue) {
      const list = loadDepts();
      selectEl.innerHTML = list.map(d => '<option value="' + escapeAttr(d) + '">' + escapeHtml(d) + '</option>').join('') +
        '<option value="' + DEPT_ADD_NEW_VALUE + '">+ Thêm khoa mới...</option>';
      if (selectedValue && list.some(d => d.toLowerCase() === selectedValue.toLowerCase())) {
        selectEl.value = list.find(d => d.toLowerCase() === selectedValue.toLowerCase());
      } else {
        selectEl.selectedIndex = 0;
      }
    }
    render(initialValue);
    selectEl.addEventListener('change', () => {
      if (selectEl.value !== DEPT_ADD_NEW_VALUE) { rememberLastDept(selectEl.value); return; }
      const name = (window.prompt('Nhập tên khoa mới:') || '').trim();
      if (!name) { render(lastDeptChosen() || initialValue); return; }
      rememberDept(name);
      rememberLastDept(name);
      render(name);
    });
    return { render, get value() { return selectEl.value === DEPT_ADD_NEW_VALUE ? (initialValue || 'CCHS') : selectEl.value; } };
  }
  const sheetDeptApi = sheetDeptSelect ? wireDeptSelect(sheetDeptSelect, lastDeptChosen() || 'CCHS') : null;

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
  const FULL_DATE_RE = /\b(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/(19[0-9]{2}|20[0-2][0-9])\b/;
  // Các nhãn trạng thái / cột không phải tên hay xuất hiện khi dán nguyên bảng
  // từ danh sách khám bệnh (HIS): "17", "Chờ thực hiện", "[TT] Hoàn thành"...
  const STATUS_CELL_RE = /^(\[?TT\]?|CHỜ(\s+\S+)*|HOÀN\s*THÀNH|THỰC\s*HIỆN|KẾT\s*QUẢ)$/i;
  // Cột "Giới tính" (Nam/Nữ) hay đứng ngay trước cột Ngày sinh trong các
  // báo cáo xuất từ HIS (PDF/Excel danh sách nội trú) — không phải tên.
  const GENDER_CELL_RE = /^(NAM|N[ỮU])$/i;
  // Một số báo cáo (PDF) chỉ in "Năm sinh" (4 chữ số) thay vì ngày/tháng/năm
  // đầy đủ — vẫn cần coi đây là ranh giới cột để tách đúng tên.
  const YEAR_ONLY_CELL_RE = /^(19[0-9]{2}|20[0-2][0-9])$/;
  // Các từ tiêu đề cột hay lọt vào khi dòng tiêu đề bảng/PDF bị đọc lệch cột
  // (VD mỗi từ tiêu đề rơi vào một dòng riêng khi đọc PDF nhiều cột).
  const HEADER_NOISE_WORDS = ['stt', 'họ tên', 'giới tính', 'năm sinh', 'ngày sinh', 'địa chỉ',
    'số thẻ', 'bảo hiểm', 'y tế', 'mã', 'bệnh án', 'khoa', 'phòng', 'giường', 'số',
    'ngày vào', 'ngày vào khoa', 'nam nữ', 'nam', 'nữ', 'chẩn đoán'];

  // Loại các dòng "nhiễu" không phải tên người: dòng tiêu đề bảng, địa chỉ
  // bệnh viện, số điện thoại/fax, tiêu đề cột PDF bị tách lẻ từng chữ...
  // — những dòng này thường có số/dấu ':' hoặc quá nhiều từ so với một họ tên.
  function isLikelyNoiseLine(name) {
    const n = String(name || '').trim();
    if (!n) return true;
    if (/\d/.test(n)) return true; // có số (địa chỉ, SĐT, ngày tháng còn sót...) -> không phải tên
    if (/[:;@#]/.test(n)) return true;
    if (HEADER_NOISE_WORDS.includes(n.toLowerCase())) return true;
    const words = n.split(/\s+/).filter(Boolean);
    if (words.length > 5) return true; // họ tên người Việt hiếm khi quá 5 từ
    return false;
  }

  // Bỏ mã hồ sơ kiểu "[26NT00121]" ở đầu ô tên, và ghi chú kiểu
  // "Ghi chú: Sốt n2" bác sĩ/điều dưỡng gõ thêm ở cuối tên trên HIS —
  // đây không phải là một phần họ & tên.
  function cleanNameCell(raw) {
    let n = String(raw || '');
    n = n.replace(/^\[[^\]]*\]\s*/, '');
    n = n.replace(/\s*ghi\s*ch[uú]\s*:.*$/i, '');
    return n.trim();
  }

  // Cố nhận ra dòng dạng bảng dán từ HIS: các cột phân tách bằng Tab hoặc
  // nhiều khoảng trắng liên tiếp (STT | Trạng thái | Họ tên | Ngày sinh
  // dd/mm/yyyy | Số thẻ BHYT | Chẩn đoán | Giới tính | Địa chỉ...; hoặc
  // PID | [Mã HS] Họ tên | Ngày sinh | Số thẻ BHYT | ... như danh sách
  // "Quản lý nội trú"; hoặc STT | Mã LK | Mã BN | Họ tên | Giới tính |
  // Ngày sinh | ... như file Excel/PDF "Danh sách bệnh nhân nội trú").
  // Cách này xác định đúng cột "Họ & tên" thay vì chỉ dò năm sinh trong cả
  // dòng, nên không bị lẫn STT/PID/mã liên kết/giới tính/mã thẻ vào tên.
  function parseTableRow(line) {
    const cells = line.split(/\t|\s{2,}/).map(c => c.trim()).filter(c => c !== '');
    if (cells.length < 2) return null;
    let idx = cells.findIndex(c => FULL_DATE_RE.test(c));
    let year;
    if (idx > 0) {
      year = cells[idx].match(FULL_DATE_RE)[3];
    } else {
      // Không có ngày/tháng đầy đủ -> thử tìm cột chỉ ghi Năm sinh (4 chữ số)
      idx = cells.findIndex(c => YEAR_ONLY_CELL_RE.test(c));
      if (idx <= 0) return null;
      year = cells[idx];
    }
    for (let i = idx - 1; i >= 0; i--) {
      const c = cells[i];
      if (/^\d+$/.test(c)) continue; // STT / PID / Mã BN (toàn số)
      if (STATUS_CELL_RE.test(c)) continue; // nhãn trạng thái
      if (GENDER_CELL_RE.test(c)) continue; // cột Giới tính (Nam/Nữ)
      if (/[A-Za-zÀ-ỹ]/.test(c)) {
        const name = cleanNameCell(c);
        if (!name || isLikelyNoiseLine(name)) break;
        return { name: toVNUpper(name), year };
      }
      break; // ô không có chữ cái và không phải STT/trạng thái/giới tính -> dừng, không đoán bừa
    }
    return null;
  }

  function parseListText(text) {
    const lines = String(text || '').split(/\r?\n/);
    const rows = [];
    const yearRe = /(19[0-9]{2}|20[0-2][0-9])/;

    lines.forEach(raw => {
      if (!raw.trim()) return;

      // Ưu tiên nhận diện theo cột (xem parseTableRow ở trên)
      const tableRow = parseTableRow(raw);
      if (tableRow) { rows.push(tableRow); return; }

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
      // Bỏ các dòng nhiễu: không còn chữ cái, hoặc là tiêu đề/địa chỉ/SĐT...
      if (!/[A-Za-zÀ-ỹ]/.test(name)) return;
      if (isLikelyNoiseLine(name)) return;
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
      pasteArea.dispatchEvent(new Event('input'));
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
          const wb = XLSX.read(data, { type: 'array', cellDates: true });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          // raw:false để Excel tự format ngày tháng thành chuỗi dd/mm/yyyy
          // (giống hiển thị trên file) thay vì trả về số serial ngày của Excel.
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, dateNF: 'dd/mm/yyyy' });
          // Nối các ô bằng Tab (không phải khoảng trắng) để giữ đúng ranh giới
          // cột — nhờ đó bước phân tích ở trên (parseTableRow) xác định đúng
          // cột "Họ tên" / "Ngày sinh" thay vì gộp lẫn STT, Mã LK, Mã BN...
          const lines = rows.map(r => (r || []).map(c => (c === undefined || c === null) ? '' : String(c)).join('\t').trim());
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

            // Gom các mảnh chữ (text item) cùng hàng (Y gần nhau) lại thành
            // một dòng, và chèn dấu Tab vào chỗ có khoảng cách ngang lớn
            // (ranh giới cột trong bảng) — nhờ đó bước phân tích ở trên
            // (parseTableRow) tách đúng cột "Họ tên" / "Ngày sinh" thay vì
            // dính chung STT, mã BN, giới tính... như văn bản thuần trước đây.
            const COLUMN_GAP_PT = 8; // khoảng trắng lớn hơn mức này giữa 2 chữ -> coi là ranh giới cột
            let lastY = null;
            let lineItems = [];
            const lines = [];
            function flushLine() {
              if (!lineItems.length) return;
              lineItems.sort((a, b) => a.x - b.x);
              let out = '';
              let prevRight = null;
              lineItems.forEach(it => {
                if (prevRight !== null) {
                  const gap = it.x - prevRight;
                  out += gap > COLUMN_GAP_PT ? '\t' : (/\s$/.test(out) ? '' : ' ');
                }
                out += it.str;
                prevRight = it.x + (it.width || 0);
              });
              lines.push(out.trim());
              lineItems = [];
            }
            content.items.forEach(item => {
              if (!item.str || !item.str.trim()) return; // bỏ khoảng trắng rời rạc pdf.js hay tách riêng
              const y = Math.round(item.transform[5]);
              const x = item.transform[4];
              if (lastY !== null && Math.abs(y - lastY) > 3) flushLine();
              lineItems.push({ str: item.str, x, width: item.width || 0 });
              lastY = y;
            });
            flushLine();
            fullText += mergeWrappedTableLines(lines).join('\n') + '\n';
          }
          resolve(fullText);
        } catch (e) { reject(e); }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  // Trong bảng PDF, các ô nhiều chữ (họ tên dài, khoa, phòng, địa chỉ...)
  // thường bị ngắt xuống 2-3 dòng vật lý trong file — nếu để nguyên, mỗi
  // dòng ngắt đó (VD "Khoa Khám", "Cứu", "Phòng Lưu"...) sẽ bị hiểu nhầm là
  // một bệnh nhân riêng. Hàm này gộp các dòng bị ngắt đó về lại đúng một
  // dòng cho từng bệnh nhân, dựa vào việc mỗi dòng bắt đầu một bệnh nhân
  // mới luôn mở đầu bằng số thứ tự (STT) đứng riêng hoặc theo sau là Tab.
  function mergeWrappedTableLines(lines) {
    const STT_ONLY_RE = /^\d{1,4}$/;
    const STT_START_RE = /^\d{1,4}(\t|\s{2,}|$)/;
    const merged = [];
    let inDataRow = false;
    // Khi STT đứng một mình trên cả dòng riêng (không kèm gì khác), lần gộp
    // kế tiếp phải nối bằng Tab để STT tách hẳn thành một cột riêng — nếu nối
    // bằng khoảng trắng, số STT sẽ dính liền vào tên (VD "4 DƯƠNG VĂN") và bị
    // hiểu nhầm là "tên có số" rồi bị loại bỏ.
    let pendingTabJoin = false;
    lines.forEach(raw => {
      const line = raw.trim();
      if (!line) return;
      if (STT_START_RE.test(line)) {
        merged.push(line);
        inDataRow = true;
        pendingTabJoin = STT_ONLY_RE.test(line);
      } else if (inDataRow && merged.length) {
        merged[merged.length - 1] += (pendingTabJoin ? '\t' : ' ') + line;
        pendingTabJoin = false;
      }
      // Dòng trước bệnh nhân đầu tiên (tiêu đề bảng, địa chỉ BV, tên cột bị
      // tách lẻ...) không giữ lại — chỉ là phần đầu trang, không phải bệnh nhân.
    });
    return merged;
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
    const buildDeptTitle = sheetDeptApi ? sheetDeptApi.value : 'CCHS';
    rememberLastDept(buildDeptTitle);
    const pagesHtml = [];
    for (let p = 0; p < rows.length; p += SHEET_PAGE_SIZE) {
      const chunk = rows.slice(p, p + SHEET_PAGE_SIZE);
      let rowsHtml = '';
      // Luôn xuất đủ 20 dòng mỗi trang (kể cả trang cuối chưa đủ người) để
      // trang in luôn đầy như nhau — các dòng dư (chưa có bệnh nhân) vẫn giữ
      // số thứ tự liên tục, để trống, dùng làm chỗ ghi thêm nếu có BN mới.
      for (let i = 0; i < SHEET_PAGE_SIZE; i++) {
        const r = chunk[i];
        rowsHtml += '<tr>' +
          '<td>' + (p + i + 1) + '</td>' +
          '<td>' + (r ? escapeHtml(formatNameForPrint(r.name)) : '') + '</td>' +
          '<td>' + (r ? escapeHtml(r.year) : '') + '</td>' +
          '<td>' + (r ? escapeHtml(r.bed) : '') + '</td>' +
          '<td></td><td></td><td></td><td></td><td></td><td></td>' +
          '</tr>';
      }
      pagesHtml.push(buildSheetPageHtml('DANH SÁCH BỆNH NHÂN KHOA ' + toVNUpper(buildDeptTitle || 'CCHS'), dateLabel, rowsHtml));
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
    const LAST_PAGES_KEY = 'bsdha_wv_blank_last_pages_v1';

    const blankDeptApi = wireDeptSelect(blankDeptSelect, lastDeptChosen() || 'CCHS');

    let lastPages = '1';
    try { lastPages = localStorage.getItem(LAST_PAGES_KEY) || '1'; } catch (e) {}
    blankPagesSelect.value = lastPages === '2' ? '2' : '1';

    function buildBlankPageHtml(deptTitle, startNum, count) {
      let rows = '';
      for (let i = 0; i < count; i++) {
        rows += '<tr><td>' + (startNum + i) + '</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>';
      }
      const title = 'DANH SÁCH BỆNH NHÂN KHOA ' + toVNUpper(deptTitle || 'CCHS');
      return buildSheetPageHtml(title, '.................................................', rows);
    }

    blankPrintBtn.addEventListener('click', () => {
      if (blankDeptSelect.value === DEPT_ADD_NEW_VALUE) return; // đang mở prompt thêm khoa, chưa có gì để in
      const deptTitle = blankDeptApi.value || 'CCHS';
      const pages = blankPagesSelect.value === '2' ? '2' : '1';

      // Khoa vừa in ở bảng trắng cũng được nhớ chung cho ô "Tiêu đề khoa"
      // ở bảng dán danh sách, và ngược lại.
      rememberLastDept(deptTitle);
      if (sheetDeptApi) sheetDeptApi.render(deptTitle);
      try { localStorage.setItem(LAST_PAGES_KEY, pages); } catch (e) {}
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
