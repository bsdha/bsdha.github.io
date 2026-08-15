(function () {
  // ==== Công cụ PDF: Ghép / Tách / Xoay / Xóa trang / Nén / OCR ====
  // Dùng chung 1 Cloudflare Worker với công cụ chuyển đổi (js/pdf-to-word.js), gọi tới route
  // riêng /pdf-ops. Worker giữ CLOUDCONVERT_API_KEY và gọi CloudConvert Jobs API
  // (https://api.cloudconvert.com/v2/jobs) với các task tương ứng:
  //   - combine  -> task "merge" (gộp nhiều PDF thành 1)
  //   - split    -> nhiều task "convert" (engine "pdfcpu"), mỗi task 1 page_range, rồi export và
  //                 đóng gói .zip nếu có >1 file kết quả
  //   - rotate   -> task "convert" (engine "pdfcpu", option "rotate" + "page_range")
  //   - delete   -> task "convert" (engine "pdfcpu", "page_range" = các trang GIỮ LẠI — Worker
  //                 tự tính phần bù từ danh sách trang người dùng muốn xóa + tổng số trang)
  //   - compress -> task "optimize" (dedicated CloudConvert task, có "profile": web/print/archive)
  //   - ocr      -> task "convert" (option "ocr": true, "ocr_languages": [...]) — CloudConvert hỗ
  //                 trợ tiếng Việt ("vie") và nhiều ngôn ngữ khác mà Adobe trước đây không hỗ trợ
  // CloudConvert dùng mã ngôn ngữ ISO 639-2/B (3 ký tự, vd. "vie", "eng", "ara") thay vì "vi"/"en".
  // QUAN TRỌNG: cần thêm route /pdf-ops vào Worker hiện có, chuyển toàn bộ logic gọi API từ
  // Adobe PDF Services sang CloudConvert (xem hướng dẫn kèm theo).
  const WORKER_BASE = 'https://pdf2word-proxy.dhabolero.workers.dev';
  const PDF_OPS_URL = WORKER_BASE + '/pdf-ops';
  const OCR_WORD_URL = WORKER_BASE + '/ocr-word';
  // Nếu HTML có checkbox <input type="checkbox" id="ptOcrToWord"> trong panel OCR, tick vào đó
  // sẽ gọi thẳng route /ocr-word (Google Vision -> Azure Read -> CloudConvert, xem worker.js) để
  // xuất trực tiếp ra .docx với độ chính xác cao hơn nhiều so với "OCR rồi convert" thông thường.
  // Nếu không có checkbox này trong HTML thì bỏ qua, hành vi OCR giữ nguyên như cũ (ra PDF có thể tìm kiếm).

  // CloudConvert free tier: 25 conversion phút miễn phí / ngày (khác cơ chế giới hạn dung lượng
  // file của Adobe). Vẫn giữ giới hạn 25MB phía client để tránh upload file quá lớn không cần thiết.

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

  // ---- Đếm số trang PDF (dùng để tự điền "toàn bộ trang" khi Adobe API bắt buộc pageRanges) ----
  let pdfLibLoadPromise = null;
  function loadPdfLib() {
    if (window.PDFLib) return Promise.resolve(window.PDFLib);
    if (pdfLibLoadPromise) return pdfLibLoadPromise;
    pdfLibLoadPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js';
      s.onload = () => resolve(window.PDFLib);
      s.onerror = () => reject(new Error('Không tải được thư viện đếm trang PDF.'));
      document.head.appendChild(s);
    });
    return pdfLibLoadPromise;
  }

  async function countPdfPages(file) {
    const PDFLib = await loadPdfLib();
    const buf = await file.arrayBuffer();
    const doc = await PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
    return doc.getPageCount();
  }

  // ---- Tách PDF thành ảnh từng trang NGAY TRÊN TRÌNH DUYỆT (pdf.js), không tốn credit
  // CloudConvert — chỉ dùng cho luồng "OCR sang Word" (Google Vision/Azure OCR ảnh). ----
  let pdfJsLoadPromise = null;
  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (pdfJsLoadPromise) return pdfJsLoadPromise;
    pdfJsLoadPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.js';
      s.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      };
      s.onerror = () => reject(new Error('Không tải được thư viện đọc PDF (pdf.js).'));
      document.head.appendChild(s);
    });
    return pdfJsLoadPromise;
  }

  // Vẽ từng trang PDF ra <canvas> rồi xuất JPEG chất lượng cao (scale 2 ~ tương đương 144dpi,
  // đủ nét cho OCR). Trả về mảng { blob, filename } theo đúng thứ tự trang.
  async function renderPdfPagesToJpeg(file, onProgress) {
    const pdfjsLib = await loadPdfJs();
    const buf = await file.arrayBuffer();
    const doc = await pdfjsLib.getDocument({ data: buf }).promise;
    const out = [];
    for (let i = 1; i <= doc.numPages; i += 1) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
      out.push({ blob, filename: 'page-' + String(i).padStart(3, '0') + '.jpg' });
      if (onProgress) onProgress(i, doc.numPages);
    }
    return out;
  }


  // Parse chuỗi kiểu "1-3,5,8-9" thành mảng số trang (1-based), có loại trùng.
  function parsePageSpec(spec, total) {
    const out = new Set();
    (spec || '').split(',').map((s) => s.trim()).filter(Boolean).forEach((part) => {
      const m = part.match(/^(\d+)\s*-\s*(\d+)$/);
      if (m) {
        let a = parseInt(m[1], 10), b = parseInt(m[2], 10);
        if (a > b) [a, b] = [b, a];
        for (let i = a; i <= b; i += 1) if (i >= 1 && i <= total) out.add(i);
      } else {
        const n = parseInt(part, 10);
        if (!isNaN(n) && n >= 1 && n <= total) out.add(n);
      }
    });
    return out;
  }

  // Từ tổng số trang + danh sách trang muốn xoá -> chuỗi range các trang cần GIỮ LẠI
  // (định dạng CloudConvert pdfcpu hiểu được, vd. "1-2,4,6-8"). Trả về null nếu không hợp lệ
  // (vd. xoá hết toàn bộ tài liệu).
  function computeKeepRange(total, deleteSpec) {
    if (!total || total < 1) return null;
    const toDelete = parsePageSpec(deleteSpec, total);
    const keep = [];
    for (let i = 1; i <= total; i += 1) if (!toDelete.has(i)) keep.push(i);
    if (!keep.length) return null;
    const ranges = [];
    let start = keep[0], prev = keep[0];
    for (let i = 1; i < keep.length; i += 1) {
      if (keep[i] === prev + 1) { prev = keep[i]; continue; }
      ranges.push(start === prev ? String(start) : start + '-' + prev);
      start = prev = keep[i];
    }
    ranges.push(start === prev ? String(start) : start + '-' + prev);
    return ranges.join(',');
  }

  // CloudConvert (engine Tesseract OCR) hỗ trợ tiếng Việt và hầu hết ngôn ngữ trong danh sách UI,
  // khác với Adobe trước đây. Chỉ cần map mã ngôn ngữ UI ("vi", "en", ...) sang mã CloudConvert
  // (ISO 639-2/B, 3 ký tự) trước khi gửi lên Worker.
  const OCR_UNSUPPORTED_LOCALES = new Set(); // hiện chưa có ngôn ngữ nào trong UI bị CloudConvert từ chối

  // Map mã ngôn ngữ hiển thị trên UI (vd. select #ptOcrLocale) sang mã CloudConvert ISO 639-2/B.
  // Nếu UI dùng sẵn mã 3 ký tự thì map thẳng qua, nếu không có trong bảng thì gửi nguyên giá trị.
  const OCR_LOCALE_TO_CLOUDCONVERT = {
    vi: 'vie', 'vi-vn': 'vie', vietnamese: 'vie',
    en: 'eng', 'en-us': 'eng', 'en-gb': 'eng', english: 'eng',
    ar: 'ara', 'ar-sa': 'ara', arabic: 'ara',
    fr: 'fra', french: 'fra',
    de: 'deu', german: 'deu',
    ja: 'jpn', japanese: 'jpn',
    ko: 'kor', korean: 'kor',
    zh: 'chi_sim', 'zh-cn': 'chi_sim', 'zh-tw': 'chi_tra',
    es: 'spa', spanish: 'spa',
    ru: 'rus', russian: 'rus',
    th: 'tha', thai: 'tha',
  };
  function toCloudConvertLocale(uiLocale) {
    const key = (uiLocale || '').toLowerCase();
    return OCR_LOCALE_TO_CLOUDCONVERT[key] || uiLocale;
  }

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
    if (op === 'compress') return { profile: mapCompressLevelToProfile(document.getElementById('ptCompressLevel').value) };
    if (op === 'ocr') return { locale: toCloudConvertLocale(document.getElementById('ptOcrLocale').value) };
    return {};
  }

  // Adobe dùng mức "low/medium/high"; CloudConvert Optimize task dùng "profile": "web" (nén nhiều,
  // chất lượng thấp hơn) / "print" (cân bằng) / "archive" (nén ít, giữ chất lượng cao nhất).
  // Nếu UI (#ptCompressLevel) vẫn đang để value low/medium/high thì map tương ứng ở đây; nếu đã
  // đổi trực tiếp value trong HTML thành web/print/archive thì hàm này chỉ trả nguyên giá trị.
  function mapCompressLevelToProfile(uiValue) {
    const v = (uiValue || '').toLowerCase();
    if (v === 'low') return 'web';
    if (v === 'medium') return 'print';
    if (v === 'high') return 'archive';
    if (v === 'web' || v === 'print' || v === 'archive') return v;
    return 'print';
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

      // CloudConvert (engine pdfcpu) không có tuỳ chọn "xoá trang X", chỉ có "page_range" = các
      // trang GIỮ LẠI. Nên ở đây cần đếm tổng số trang rồi tính phần bù (trang không nằm trong
      // danh sách người dùng muốn xoá) trước khi gửi lên Worker, thay vì gửi thẳng "pages" gốc.
      let deleteKeepRange = null;
      if (op === 'delete') {
        try {
          setStatus('<span class="pt-spinner"></span>Đang xác định số trang…');
          const total = await countPdfPages(items[0].file);
          deleteKeepRange = computeKeepRange(total, collectParams('delete').pages);
          if (!deleteKeepRange) {
            setStatus('❌ Danh sách trang muốn xoá không hợp lệ hoặc xoá hết toàn bộ tài liệu.', 'error');
            return;
          }
        } catch (e) {
          setStatus('❌ ' + (e && e.message ? e.message : 'Không đọc được số trang PDF.'), 'error');
          return;
        }
      }

      // Task "convert" (engine pdfcpu) của CloudConvert cũng yêu cầu page_range cụ thể, không tự
      // hiểu "để trống = tất cả trang". Nếu người dùng để trống, tự đếm số trang và điền "1-N".
      if (op === 'rotate' && !collectParams('rotate').pages) {
        try {
          setStatus('<span class="pt-spinner"></span>Đang xác định số trang…');
          const total = await countPdfPages(items[0].file);
          if (total > 0) document.getElementById('ptRotatePages').value = '1-' + total;
        } catch (e) {
          setStatus('❌ ' + (e && e.message ? e.message : 'Không đọc được số trang PDF.'), 'error');
          return;
        }
      }

      // CloudConvert (Tesseract) hỗ trợ hầu hết ngôn ngữ trong UI, kể cả tiếng Việt — giữ lại
      // bước kiểm tra này để phòng trường hợp sau này có ngôn ngữ nào đó chưa được hỗ trợ.
      if (op === 'ocr') {
        const rawLocale = (document.getElementById('ptOcrLocale').value || '').toLowerCase();
        if (OCR_UNSUPPORTED_LOCALES.has(rawLocale)) {
          setStatus('⚠️ Dịch vụ OCR (CloudConvert) hiện chưa hỗ trợ ngôn ngữ bạn chọn. Vui lòng chọn ngôn ngữ khác.', 'error');
          return;
        }
      }

      // Nếu có checkbox "Xuất thẳng ra Word" (#ptOcrToWord) và đang tick -> đi theo nhánh riêng,
      // gọi /ocr-word (Google Vision -> Azure Read -> CloudConvert), độ chính xác cao hơn nhiều.
      const ocrToWordEl = document.getElementById('ptOcrToWord');
      const useOcrToWord = op === 'ocr' && ocrToWordEl && ocrToWordEl.checked;

      // Với nhánh OCR-Word: tách trang PDF thành ảnh NGAY TRÊN TRÌNH DUYỆT (pdf.js) trước khi
      // gửi lên Worker, để không tốn credit CloudConvert cho bước rasterize (chỉ Google
      // Vision/Azure OCR mới cần gọi tới Worker, cả 2 đều có quota miễn phí lớn hơn nhiều).
      let renderedPages = null;
      if (useOcrToWord) {
        try {
          setStatus('<span class="pt-spinner"></span>Đang tách trang PDF thành ảnh…');
          renderedPages = await renderPdfPagesToJpeg(items[0].file, (done, total) => {
            setStatus(`<span class="pt-spinner"></span>Đang tách trang PDF thành ảnh… (${done}/${total})`);
          });
          if (!renderedPages.length) throw new Error('Không đọc được trang nào từ file PDF.');
        } catch (e) {
          setStatus('❌ ' + (e && e.message ? e.message : 'Không tách được trang PDF.'), 'error');
          return;
        }
      }

      isRunning = true;
      updateRunBtn(op);
      setStatus(`<span class="pt-spinner"></span>Đang xử lý "${OP_LABEL[op]}"… có thể mất 10–60 giây tuỳ độ dài file.`);

      try {
        const form = new FormData();
        if (useOcrToWord) {
          renderedPages.forEach((p) => form.append('images', p.blob, p.filename));
          form.append('locale', toCloudConvertLocale(document.getElementById('ptOcrLocale').value));
          form.append('baseName', items[0].file.name.replace(/\.[^.]+$/i, ''));
        } else {
          form.append('op', op);
          if (op === 'combine') {
            items.forEach((it) => form.append('files', it.file, it.file.name));
          } else {
            form.append('file', items[0].file, items[0].file.name);
          }
          const params = collectParams(op);
          if (op === 'delete') params.pages = deleteKeepRange; // đã đổi thành "range cần giữ lại"
          form.append('params', JSON.stringify(params));
        }

        const resp = await fetch(useOcrToWord ? OCR_WORD_URL : PDF_OPS_URL, { method: 'POST', body: form });
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
        let outName, kindLabel;
        if (useOcrToWord) {
          outName = baseName + '-ocr.docx';
          kindLabel = 'Word (.docx)';
        } else {
          outName = isZip ? baseName + '-tach-trang.zip' : baseName + '-' + op + '.pdf';
          kindLabel = isZip ? '.zip' : 'PDF';
        }
        const url = URL.createObjectURL(blob);
        if (typeof logUsage === 'function') logUsage('pdftools_use');
        const engineTag = useOcrToWord ? (resp.headers.get('X-OCR-Engine') || '') : '';
        setStatus(
          `✅ "${useOcrToWord ? 'OCR sang Word' : OP_LABEL[op]}" thành công${engineTag ? ' (engine: ' + engineTag + ')' : ''}.` +
          `<br><a class="pt-download-btn" href="${url}" download="${outName}">⬇ Tải file ${kindLabel} kết quả</a>`,
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
