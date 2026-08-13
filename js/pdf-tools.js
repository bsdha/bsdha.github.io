(function () {
  // ==== Công cụ PDF: Ghép / Tách / Xoay / Xóa trang / Nén / OCR ====
  // Dùng chung 1 Cloudflare Worker với công cụ chuyển đổi (js/pdf-to-word.js), gọi tới route
  // riêng /pdf-ops. Worker nhận field "op" để biết chạy thao tác Adobe PDF Services nào
  // (CombinePDF, SplitPDF, RotatePages, DeletePages, CompressPDF, OCR) rồi trả file kết quả
  // về đây — 1 file .pdf, hoặc 1 file .zip nếu thao tác (Tách PDF) sinh ra nhiều file.
  // QUAN TRỌNG: cần thêm route /pdf-ops vào Worker hiện có (xem hướng dẫn kèm theo).
  const WORKER_BASE = 'https://pdf2word-proxy.dhabolero.workers.dev';
  const PDF_OPS_URL = WORKER_BASE + '/pdf-ops';

  const MAX_SIZE_BYTES = 25 * 1024 * 1024;
  const tabsEl = document.getElementById('ptTabs');
  const statusEl = document.getElementById('ptStatus');
  if (!tabsEl || !statusEl) return;

  const state = {
    combine: [],
    split: [],
    rotate: [],
    delete: [],
    compress: [],
    ocr: [],
  };
  let seq = 0;
  let currentOp = 'combine';
  let isRunning = false;

  function setStatus(html, cls) {
    statusEl.className = 'pt-status' + (cls ? ' ' + cls : '');
    statusEl.innerHTML = html || '';
  }

  function fmtSize(bytes) {
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }

  // ---- Chuyển tab ----
  tabsEl.querySelectorAll('.pt-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const op = tab.getAttribute('data-op');
      if (op === currentOp) return;
      currentOp = op;
      tabsEl.querySelectorAll('.pt-tab').forEach((t) => t.classList.toggle('active', t === tab));
      document.querySelectorAll('.pt-panel-op').forEach((p) => {
        p.style.display = p.getAttribute('data-panel') === op ? 'block' : 'none';
      });
      setStatus('');
    });
  });

  // ---- Xử lý dropzone + file input cho từng op ----
  document.querySelectorAll('.pt-dropzone').forEach((dz) => {
    const op = dz.getAttribute('data-dz');
    const input = document.querySelector(`.pt-file-input[data-input="${op}"]`);
    const allowMultiple = op === 'combine';

    dz.addEventListener('click', () => input.click());
    dz.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
    });
    input.addEventListener('change', () => {
      pickFiles(op, input.files, allowMultiple);
      input.value = '';
    });
    ['dragenter', 'dragover'].forEach((evt) => dz.addEventListener(evt, (e) => { e.preventDefault(); dz.classList.add('dragover'); }));
    ['dragleave', 'drop'].forEach((evt) => dz.addEventListener(evt, (e) => { e.preventDefault(); dz.classList.remove('dragover'); }));
    dz.addEventListener('drop', (e) => {
      const files = e.dataTransfer && e.dataTransfer.files;
      pickFiles(op, files, allowMultiple);
    });
  });

  function pickFiles(op, fileList, allowMultiple) {
    if (!fileList || !fileList.length) return;
    const rejected = [];
    let incoming = Array.from(fileList);
    if (!allowMultiple) incoming = incoming.slice(0, 1);

    incoming.forEach((file) => {
      if (!file.name.toLowerCase().endsWith('.pdf')) { rejected.push(file.name + ' (không phải .pdf)'); return; }
      if (file.size > MAX_SIZE_BYTES) { rejected.push(file.name + ' (quá 25MB)'); return; }
      const dup = state[op].some((it) => it.file.name === file.name && it.file.size === file.size);
      if (dup) return;
      seq += 1;
      if (!allowMultiple) state[op] = [];
      state[op].push({ id: 'p' + seq, file });
    });

    if (rejected.length) setStatus(`Bỏ qua ${rejected.length} file không hợp lệ: ${rejected.join(', ')}`, 'error');
    else setStatus('');

    renderList(op);
    updateRunBtn(op);
  }

  function renderList(op) {
    const listEl = document.querySelector(`.pt-file-list[data-list="${op}"]`);
    const items = state[op];
    if (!items.length) {
      listEl.style.display = 'none';
      listEl.innerHTML = '';
      return;
    }
    listEl.style.display = 'flex';
    const showHandle = op === 'combine' && items.length > 1;
    listEl.innerHTML = items.map((it, idx) => `
      <div class="pt-file-row" data-id="${it.id}" draggable="${showHandle}">
        ${showHandle ? '<span class="pt-drag-handle" title="Kéo để đổi thứ tự">⠿</span>' : ''}
        <span class="pt-file-icon">📄</span>
        <span class="pt-file-name" title="${it.file.name}">${idx + 1}. ${it.file.name}</span>
        <span class="pt-file-meta">${fmtSize(it.file.size)}</span>
        <button type="button" class="pt-remove-btn" data-remove="${it.id}" title="Bỏ file">✕</button>
      </div>`).join('');

    listEl.querySelectorAll('[data-remove]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-remove');
        state[op] = state[op].filter((x) => x.id !== id);
        renderList(op);
        updateRunBtn(op);
      });
    });

    if (showHandle) enableDragReorder(listEl, op);
  }

  function enableDragReorder(listEl, op) {
    let dragId = null;
    listEl.querySelectorAll('.pt-file-row').forEach((row) => {
      row.addEventListener('dragstart', () => { dragId = row.getAttribute('data-id'); row.classList.add('dragging'); });
      row.addEventListener('dragend', () => { row.classList.remove('dragging'); });
      row.addEventListener('dragover', (e) => e.preventDefault());
      row.addEventListener('drop', (e) => {
        e.preventDefault();
        const targetId = row.getAttribute('data-id');
        if (!dragId || dragId === targetId) return;
        const arr = state[op];
        const fromIdx = arr.findIndex((x) => x.id === dragId);
        const toIdx = arr.findIndex((x) => x.id === targetId);
        if (fromIdx === -1 || toIdx === -1) return;
        const [moved] = arr.splice(fromIdx, 1);
        arr.splice(toIdx, 0, moved);
        renderList(op);
      });
    });
  }

  function updateRunBtn(op) {
    const btn = document.querySelector(`.pt-run-btn[data-run="${op}"]`);
    const minFiles = op === 'combine' ? 2 : 1;
    btn.disabled = isRunning || state[op].length < minFiles;
  }

  function collectParams(op) {
    if (op === 'split') return { ranges: (document.getElementById('ptSplitRanges').value || '').trim() };
    if (op === 'rotate') return {
      angle: document.getElementById('ptRotateAngle').value,
      pages: (document.getElementById('ptRotatePages').value || '').trim(),
    };
    if (op === 'delete') return { pages: (document.getElementById('ptDeletePages').value || '').trim() };
    if (op === 'compress') return { level: document.getElementById('ptCompressLevel').value };
    if (op === 'ocr') return { locale: document.getElementById('ptOcrLocale').value };
    return {};
  }

  const OP_LABEL = {
    combine: 'Ghép PDF', split: 'Tách PDF', rotate: 'Xoay trang',
    delete: 'Xóa trang', compress: 'Nén PDF', ocr: 'OCR',
  };

  document.querySelectorAll('.pt-run-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const op = btn.getAttribute('data-run');
      const items = state[op];
      const minFiles = op === 'combine' ? 2 : 1;
      if (items.length < minFiles || isRunning) return;

      if (op === 'delete' && !collectParams('delete').pages) {
        setStatus('Vui lòng nhập số trang muốn xóa.', 'error');
        return;
      }

      isRunning = true;
      updateRunBtn(op);
      setStatus(`<span class="pt-spinner"></span>Đang xử lý "${OP_LABEL[op]}"… có thể mất 10–40 giây tuỳ độ dài file.`);

      try {
        const form = new FormData();
        form.append('op', op);
        if (op === 'combine') {
          items.forEach((it) => form.append('files', it.file, it.file.name));
        } else {
          form.append('file', items[0].file, items[0].file.name);
        }
        form.append('params', JSON.stringify(collectParams(op)));

        const resp = await fetch(PDF_OPS_URL, { method: 'POST', body: form });
        if (!resp.ok) {
          let msg = 'Lỗi máy chủ (' + resp.status + ')';
          try {
            const errJson = await resp.json();
            if (errJson && errJson.error) msg = errJson.error;
          } catch (_) {}
          throw new Error(msg);
        }

        const blob = await resp.blob();
        const isZip = (resp.headers.get('content-type') || '').includes('zip');
        const baseName = (items[0] ? items[0].file.name : 'ket-qua').replace(/\.[^.]+$/i, '');
        const outName = isZip ? baseName + '-tach-trang.zip' : baseName + '-' + op + '.pdf';
        const url = URL.createObjectURL(blob);
        setStatus(
          `✅ "${OP_LABEL[op]}" thành công.<br><a class="pt-download-btn" href="${url}" download="${outName}">⬇ Tải file ${isZip ? '.zip' : 'PDF'} kết quả</a>`,
          'success'
        );
      } catch (err) {
        setStatus('❌ Thất bại: ' + (err && err.message ? err.message : 'Lỗi không xác định'), 'error');
      } finally {
        isRunning = false;
        updateRunBtn(op);
      }
    });
  });

  // Khởi tạo trạng thái ban đầu cho tất cả nút chạy
  Object.keys(state).forEach(updateRunBtn);
})();
