(function () {
  // ==== Công cụ chuyển đổi định dạng tài liệu (giữ bảng/layout, OCR cho bản scan) ====
  // Gọi tới 1 Cloudflare Worker trung gian (miễn phí) giữ bí mật CLOUDCONVERT_API_KEY và thực
  // hiện toàn bộ luồng qua CloudConvert Jobs API (https://api.cloudconvert.com/v2/jobs):
  //   1) tạo Job gồm 3 task: "import/upload" -> "convert" (input_format=from, output_format=to)
  //      -> "export/url"
  //   2) upload file lên URL mà CloudConvert trả về cho task import/upload
  //   3) poll job cho tới khi task export/url có status "finished", lấy URL file kết quả
  //   4) Worker tải file đó về rồi trả (proxy) lại cho trình duyệt ở đây, để client vẫn chỉ cần
  //      gọi 1 endpoint như trước, không cần biết chi tiết luồng job/task của CloudConvert.
  // CloudConvert dùng engine mặc định phù hợp theo cặp định dạng (LibreOffice cho docx/xlsx/pptx,
  // pdfcpu/pdf.co-style cho các thao tác PDF khác) — không cần chỉ định trong request đơn giản này.
  // Hỗ trợ chuyển đổi HÀNG LOẠT: chọn/kéo nhiều file cùng lúc, xử lý tuần tự có giới hạn
  // song song (tránh vượt quá số job đồng thời của gói CloudConvert), rồi có thể tải gộp .zip
  // (dùng JSZip qua CDN).
  // QUAN TRỌNG: phải thay WORKER_URL bên dưới bằng URL Worker thật sau khi deploy, và Worker phải
  // được viết lại để gọi CloudConvert API thay vì Adobe PDF Services (xem hướng dẫn kèm theo).
  const WORKER_URL = 'https://pdf2word-proxy.dhabolero.workers.dev/convert';

  // CloudConvert hỗ trợ thêm định dạng đích/nguồn "text" (.txt) và "html" cho PDF mà Adobe trước
  // đây không có — có thể mở rộng FORMATS bên dưới nếu muốn thêm lựa chọn này vào UI (#p2wFromSelect
  // / #p2wToSelect), miễn là thêm <option> tương ứng trong HTML.

  const dropzone = document.getElementById('p2wDropzone');
  const fileInput = document.getElementById('p2wFileInput');
  const fileListEl = document.getElementById('p2wFileList');
  const convertBtn = document.getElementById('p2wConvertBtn');
  const statusEl = document.getElementById('p2wStatus');
  const fromSelect = document.getElementById('p2wFromSelect');
  const toSelect = document.getElementById('p2wToSelect');
  const swapBtn = document.getElementById('p2wSwapBtn');
  const formatHint = document.getElementById('p2wFormatHint');
  const dropIcon = document.getElementById('p2wDropIcon');
  const dropHint = document.getElementById('p2wDropHint');
  const batchActions = document.getElementById('p2wBatchActions');
  const downloadAllBtn = document.getElementById('p2wDownloadAllBtn');
  if (!dropzone || !fileInput) return;

  const MAX_SIZE_BYTES = 25 * 1024 * 1024;
  const MAX_CONCURRENT = 2; // giới hạn số job chạy song song, tránh quá tải Worker free tier
  let items = []; // { id, file, status: 'waiting'|'working'|'done'|'error', blobUrl, blob, outName, errorMsg }
  let isConverting = false;
  let seq = 0;

  const FORMATS = {
    pdf:   { label: 'PDF',        icon: '📄', ext: ['.pdf'],               accept: 'application/pdf,.pdf' },
    docx:  { label: 'Word',       icon: '📝', ext: ['.docx', '.doc'],      accept: '.docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword' },
    xlsx:  { label: 'Excel',      icon: '📊', ext: ['.xlsx', '.xls'],      accept: '.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel' },
    pptx:  { label: 'PowerPoint', icon: '📽️', ext: ['.pptx', '.ppt'],      accept: '.pptx,.ppt,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint' },
    image: { label: 'Ảnh',        icon: '🖼️', ext: ['.png', '.jpg', '.jpeg'], accept: '.png,.jpg,.jpeg,image/png,image/jpeg' },
    // CloudConvert hỗ trợ thêm 2 định dạng này cho PDF (Adobe trước đây không có). Chỉ hoạt động
    // trên UI nếu #p2wFromSelect / #p2wToSelect có thêm <option value="txt"> / <option value="html">.
    txt:   { label: 'Văn bản (.txt)', icon: '📃', ext: ['.txt'],  accept: '.txt,text/plain' },
    html:  { label: 'HTML',       icon: '🌐', ext: ['.html', '.htm'], accept: '.html,.htm,text/html' },
  };

  function isPairSupported(from, to) {
    if (from === to) return false;
    if (from === 'pdf' || to === 'pdf') return true;
    return false;
  }

  function outExt(to, contentType) {
    // Nếu server trả về .zip (VD: PDF nhiều trang -> nhiều ảnh, đóng gói thành zip)
    // thì luôn ưu tiên đuôi .zip bất kể "to" là gì, để tên file khớp với nội dung thật.
    if (contentType && contentType.indexOf('zip') !== -1) return '.zip';
    if (to === 'docx') return '.docx';
    if (to === 'xlsx') return '.xlsx';
    if (to === 'pptx') return '.pptx';
    if (to === 'image') return '.jpg';
    if (to === 'pdf') return '.pdf';
    if (to === 'txt') return '.txt';
    if (to === 'html') return '.html';
    return '';
  }

  function fmtSize(bytes) {
    if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }

  function setStatus(html, cls) {
    statusEl.className = 'p2w-status' + (cls ? ' ' + cls : '');
    statusEl.innerHTML = html || '';
  }

  function refreshUI() {
    const from = fromSelect.value;
    const to = toSelect.value;

    fileInput.setAttribute('accept', FORMATS[from].accept);
    dropIcon.textContent = FORMATS[from].icon;
    dropHint.textContent = `Chỉ nhận file ${FORMATS[from].ext.join(', ')} — dung lượng tối đa khoảng 25MB / file`;

    const n = items.length;
    convertBtn.textContent = n > 1
      ? `Chuyển đổi hàng loạt (${n} file)`
      : `Chuyển ${FORMATS[from].label} → ${FORMATS[to].label}`;

    if (!isPairSupported(from, to)) {
      formatHint.textContent = from === to
        ? 'Định dạng nguồn và đích đang giống nhau — hãy chọn khác nhau.'
        : `Chưa hỗ trợ đổi trực tiếp ${FORMATS[from].label} → ${FORMATS[to].label}. Hãy đổi qua PDF trước (VD: ${FORMATS[from].label} → PDF, rồi PDF → ${FORMATS[to].label}).`;
      formatHint.classList.add('warn');
      convertBtn.disabled = true;
    } else {
      formatHint.textContent = `${FORMATS[from].icon} ${FORMATS[from].label} → ${FORMATS[to].icon} ${FORMATS[to].label}`;
      formatHint.classList.remove('warn');
      convertBtn.disabled = isConverting || items.length === 0;
    }

    // nếu đổi định dạng nguồn khiến các file đã chọn không còn khớp đuôi -> loại các file không khớp
    if (items.length) {
      items = items.filter((it) => {
        const nameLower = it.file.name.toLowerCase();
        return FORMATS[from].ext.some((e) => nameLower.endsWith(e));
      });
    }

    renderFileList();
  }

  function renderFileList() {
    if (!items.length) {
      fileListEl.style.display = 'none';
      fileListEl.innerHTML = '';
      batchActions.style.display = 'none';
      return;
    }
    fileListEl.style.display = 'flex';
    const from = fromSelect.value;
    fileListEl.innerHTML = items.map((it) => {
      let badge = '<span class="p2w-file-badge waiting">Chờ</span>';
      let dl = '';
      if (it.status === 'working') badge = '<span class="p2w-file-badge working"><span class="p2w-spinner"></span>Đang chuyển</span>';
      if (it.status === 'done') {
        badge = '<span class="p2w-file-badge done">✅ Xong</span>';
        dl = `<a class="p2w-file-dl" href="${it.blobUrl}" download="${it.outName}">⬇ Tải</a>`;
      }
      if (it.status === 'error') badge = `<span class="p2w-file-badge error" title="${(it.errorMsg || '').replace(/"/g, '&quot;')}">❌ Lỗi</span>`;
      const removeBtn = isConverting ? '' : `<button type="button" class="p2w-remove-btn" data-remove="${it.id}" title="Bỏ file">✕</button>`;
      return `<div class="p2w-file-row" data-id="${it.id}">
        <span class="p2w-file-icon">${FORMATS[from].icon}</span>
        <span class="p2w-file-name" title="${it.file.name}">${it.file.name}</span>
        <span class="p2w-file-meta">${fmtSize(it.file.size)}</span>
        ${badge}
        ${dl}
        ${removeBtn}
      </div>`;
    }).join('');

    fileListEl.querySelectorAll('[data-remove]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-remove');
        const it = items.find((x) => x.id === id);
        if (it && it.blobUrl) URL.revokeObjectURL(it.blobUrl);
        items = items.filter((x) => x.id !== id);
        refreshUI();
        setStatus('');
      });
    });

    const doneCount = items.filter((it) => it.status === 'done').length;
    batchActions.style.display = doneCount >= 2 ? 'block' : 'none';
  }

  fromSelect.addEventListener('change', () => {
    if (fromSelect.value === toSelect.value) {
      toSelect.value = fromSelect.value === 'pdf' ? 'docx' : 'pdf';
    }
    refreshUI();
  });
  toSelect.addEventListener('change', () => {
    if (fromSelect.value === toSelect.value) {
      fromSelect.value = toSelect.value === 'pdf' ? 'docx' : 'pdf';
    }
    refreshUI();
  });
  swapBtn.addEventListener('click', () => {
    const f = fromSelect.value, t = toSelect.value;
    if (isPairSupported(t, f)) {
      fromSelect.value = t;
      toSelect.value = f;
    } else {
      fromSelect.value = 'pdf';
      toSelect.value = f === 'pdf' ? 'docx' : f;
    }
    clearAllFiles();
    refreshUI();
  });

  function clearAllFiles() {
    items.forEach((it) => { if (it.blobUrl) URL.revokeObjectURL(it.blobUrl); });
    items = [];
    fileInput.value = '';
    refreshUI();
  }

  function pickFiles(fileList) {
    if (!fileList || !fileList.length) return;
    const from = fromSelect.value;
    const rejected = [];
    Array.from(fileList).forEach((file) => {
      const nameLower = file.name.toLowerCase();
      const matches = FORMATS[from].ext.some((e) => nameLower.endsWith(e));
      if (!matches) { rejected.push(file.name + ' (sai định dạng)'); return; }
      if (file.size > MAX_SIZE_BYTES) { rejected.push(file.name + ' (quá 25MB)'); return; }
      const dup = items.some((it) => it.file.name === file.name && it.file.size === file.size);
      if (dup) return;
      seq += 1;
      items.push({ id: 'f' + seq, file, status: 'waiting', blobUrl: null, blob: null, outName: '', errorMsg: '' });
    });

    if (rejected.length) {
      setStatus(`Bỏ qua ${rejected.length} file không hợp lệ: ${rejected.join(', ')}`, 'error');
    } else {
      setStatus('');
    }
    refreshUI();
  }

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
  });
  fileInput.addEventListener('change', () => { pickFiles(fileInput.files); fileInput.value = ''; });

  ['dragenter', 'dragover'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
  });
  ['dragleave', 'drop'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    });
  });
  dropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer && e.dataTransfer.files;
    pickFiles(files);
  });

  async function convertOne(it, from, to) {
    it.status = 'working';
    renderFileList();
    try {
      const form = new FormData();
      form.append('file', it.file, it.file.name);
      form.append('from', from);
      form.append('to', to);
      const resp = await fetch(WORKER_URL, { method: 'POST', body: form });
      if (!resp.ok) {
        let msg = 'Lỗi máy chủ (' + resp.status + ')';
        try {
          const errJson = await resp.json();
          if (errJson && errJson.error) msg = errJson.error;
        } catch (_) {}
        throw new Error(msg);
      }
      const blob = await resp.blob();
      const contentType = resp.headers.get('content-type') || blob.type || '';
      const baseName = it.file.name.replace(/\.[^.]+$/i, '');
      it.outName = baseName + outExt(to, contentType);
      it.blob = blob;
      it.blobUrl = URL.createObjectURL(blob);
      it.status = 'done';
    } catch (err) {
      it.status = 'error';
      it.errorMsg = err && err.message ? err.message : 'Lỗi không xác định';
    }
    renderFileList();
  }

  async function runPool(tasks, limit) {
    let cursor = 0;
    async function worker() {
      while (cursor < tasks.length) {
        const idx = cursor;
        cursor += 1;
        await tasks[idx]();
      }
    }
    const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
    await Promise.all(workers);
  }

  convertBtn.addEventListener('click', async () => {
    if (!items.length || isConverting) return;
    const from = fromSelect.value;
    const to = toSelect.value;
    if (!isPairSupported(from, to)) return;

    if (!WORKER_URL || WORKER_URL.includes('YOUR-WORKER-NAME')) {
      setStatus('Chưa cấu hình địa chỉ Worker xử lý (WORKER_URL). Xem hướng dẫn deploy.', 'error');
      return;
    }

    isConverting = true;
    convertBtn.disabled = true;
    batchActions.style.display = 'none';
    items.forEach((it) => { it.status = 'waiting'; it.errorMsg = ''; if (it.blobUrl) { URL.revokeObjectURL(it.blobUrl); it.blobUrl = null; } });
    renderFileList();

    const isBatch = items.length > 1;
    setStatus(
      isBatch
        ? `<span class="p2w-spinner"></span>Đang chuyển đổi hàng loạt ${items.length} file (${FORMATS[from].label} → ${FORMATS[to].label})… tối đa ${MAX_CONCURRENT} file cùng lúc.`
        : `<span class="p2w-spinner"></span>Đang tải lên &amp; chuyển đổi ${FORMATS[from].label} → ${FORMATS[to].label}… (có thể mất 10–40 giây tuỳ độ dài file)`
    );

    const tasks = items.map((it) => () => convertOne(it, from, to));
    await runPool(tasks, MAX_CONCURRENT);

    const okCount = items.filter((it) => it.status === 'done').length;
    const errCount = items.filter((it) => it.status === 'error').length;

    if (okCount > 0 && typeof logUsage === 'function') logUsage('pdf2word_convert');

    if (!isBatch) {
      const it = items[0];
      if (it.status === 'done') {
        setStatus('✅ Chuyển đổi thành công.<br><a class="p2w-download-btn" href="' + it.blobUrl + '" download="' + it.outName + '">⬇ Tải file ' + FORMATS[to].label + '</a>', 'success');
      } else {
        setStatus('❌ Chuyển đổi thất bại: ' + it.errorMsg, 'error');
      }
    } else if (errCount === 0) {
      setStatus(`✅ Đã chuyển đổi xong cả ${okCount} file. Bấm "Tải" ở từng dòng, hoặc tải gộp .zip bên dưới.`, 'success');
    } else if (okCount === 0) {
      setStatus(`❌ Cả ${errCount} file đều chuyển đổi thất bại. Xem chi tiết lỗi ở từng dòng.`, 'error');
    } else {
      setStatus(`⚠️ Xong ${okCount}/${items.length} file, ${errCount} file lỗi. Xem chi tiết ở từng dòng.`, 'error');
    }

    isConverting = false;
    convertBtn.disabled = false;
    renderFileList();
  });

  downloadAllBtn.addEventListener('click', async () => {
    const doneItems = items.filter((it) => it.status === 'done' && it.blob);
    if (!doneItems.length) return;
    if (typeof JSZip === 'undefined') {
      setStatus('Chưa tải được thư viện nén .zip (JSZip). Kiểm tra kết nối mạng rồi thử lại, hoặc tải từng file riêng lẻ.', 'error');
      return;
    }
    downloadAllBtn.disabled = true;
    downloadAllBtn.textContent = 'Đang nén .zip…';
    try {
      const zip = new JSZip();
      const usedNames = new Set();
      doneItems.forEach((it) => {
        let name = it.outName;
        let i = 2;
        while (usedNames.has(name)) {
          name = it.outName.replace(/(\.[^.]+)$/, `_${i}$1`);
          i += 1;
        }
        usedNames.add(name);
        zip.file(name, it.blob);
      });
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chuyen-doi-hang-loat-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      setStatus('❌ Nén .zip thất bại: ' + (err && err.message ? err.message : 'Lỗi không xác định'), 'error');
    } finally {
      downloadAllBtn.disabled = false;
      downloadAllBtn.textContent = '⬇ Tải tất cả (.zip)';
    }
  });

  refreshUI();
})();
