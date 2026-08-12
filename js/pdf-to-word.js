(function () {
  // ==== Công cụ PDF -> Word (AI, giữ bảng/layout, OCR cho bản scan) ====
  // Gọi tới 1 Cloudflare Worker trung gian (miễn phí) giữ bí mật client_secret của Adobe PDF
  // Services API và thực hiện toàn bộ luồng: lấy access token -> upload PDF -> submit job
  // export sang .docx (Adobe tự OCR nếu là file scan) -> chờ xong -> trả file .docx về đây.
  // QUAN TRỌNG: phải thay WORKER_URL bên dưới bằng URL Worker thật sau khi deploy (xem hướng dẫn).
  const WORKER_URL = 'https://pdf2word-proxy.dhabolero.workers.dev/convert';

  const dropzone = document.getElementById('p2wDropzone');
  const fileInput = document.getElementById('p2wFileInput');
  const fileRow = document.getElementById('p2wFileRow');
  const fileNameEl = document.getElementById('p2wFileName');
  const removeBtn = document.getElementById('p2wRemoveBtn');
  const convertBtn = document.getElementById('p2wConvertBtn');
  const statusEl = document.getElementById('p2wStatus');
  if (!dropzone || !fileInput) return;

  const MAX_SIZE_BYTES = 25 * 1024 * 1024;
  let selectedFile = null;

  function setStatus(html, cls) {
    statusEl.className = 'p2w-status' + (cls ? ' ' + cls : '');
    statusEl.innerHTML = html || '';
  }

  function pickFile(file) {
    if (!file) return;
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
      setStatus('Chỉ nhận file PDF (.pdf).', 'error');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setStatus('File quá lớn (giới hạn khoảng 25MB).', 'error');
      return;
    }
    selectedFile = file;
    fileNameEl.textContent = file.name + ' (' + (file.size / 1024 / 1024).toFixed(1) + ' MB)';
    fileRow.style.display = 'flex';
    convertBtn.disabled = false;
    setStatus('');
  }

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
  });
  fileInput.addEventListener('change', () => pickFile(fileInput.files && fileInput.files[0]));

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
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    pickFile(file);
  });

  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    selectedFile = null;
    fileInput.value = '';
    fileRow.style.display = 'none';
    convertBtn.disabled = true;
    setStatus('');
  });

  convertBtn.addEventListener('click', async () => {
    if (!selectedFile) return;
    if (!WORKER_URL || WORKER_URL.includes('YOUR-WORKER-NAME')) {
      setStatus('Chưa cấu hình địa chỉ Worker xử lý (WORKER_URL). Xem hướng dẫn deploy.', 'error');
      return;
    }
    convertBtn.disabled = true;
    setStatus('<span class="p2w-spinner"></span>Đang tải lên &amp; chuyển đổi… (có thể mất 10–40 giây tuỳ độ dài file)');
    try {
      const form = new FormData();
      form.append('file', selectedFile, selectedFile.name);
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
      const url = URL.createObjectURL(blob);
      const outName = selectedFile.name.replace(/\.pdf$/i, '') + '.docx';
      setStatus(
        '✅ Chuyển đổi thành công.<br><a class="p2w-download-btn" href="' + url + '" download="' + outName + '">⬇ Tải file Word</a>',
        'success'
      );
    } catch (err) {
      setStatus('❌ Chuyển đổi thất bại: ' + (err && err.message ? err.message : 'Lỗi không xác định'), 'error');
    } finally {
      convertBtn.disabled = false;
    }
  });
})();
