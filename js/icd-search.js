(function () {
  // Dữ liệu icd-data.js / icd-yhct-data.js đã được rút gọn: các trường lặp lại nhiều lần
  // (meta theo chương/nhóm bệnh, statusTitle/statusDesc/status theo từng loại trạng thái)
  // được tách ra bảng tra riêng (ICD_META_TABLE / ICD_STATUS_TABLE / ICD_YHCT_STATUS_TABLE),
  // mỗi mã chỉ lưu 1 số chỉ mục (m/si) trỏ vào bảng đó thay vì lặp lại toàn bộ chuỗi văn bản.
  // Đoạn dưới đây "giải nén" lại thành các trường đầy đủ (meta/statusTitle/statusDesc/status...)
  // để phần còn lại của ứng dụng dùng như bình thường, không cần sửa gì thêm ở chỗ khác.
  const ICD_META_TABLE = window.ICD_META_TABLE || [];
  const ICD_STATUS_TABLE = window.ICD_STATUS_TABLE || [];
  const ICD_YHCT_STATUS_TABLE = window.ICD_YHCT_STATUS_TABLE || [];

  function expandIcdRecord(e) {
    if (typeof e.si === 'number' && ICD_STATUS_TABLE[e.si]) {
      const s = ICD_STATUS_TABLE[e.si];
      e.statusTitle = s.t;
      e.statusDesc = s.d;
      e.status = s.s;
    }
    if (typeof e.m === 'number' && ICD_META_TABLE[e.m]) {
      e.meta = ICD_META_TABLE[e.m];
    } else if (!e.meta) {
      e.meta = [];
    }
    return e;
  }

  function expandYhctRecord(e) {
    if (typeof e.si === 'number' && ICD_YHCT_STATUS_TABLE[e.si]) {
      const s = ICD_YHCT_STATUS_TABLE[e.si];
      e.statusTitle = s.t;
      e.statusDesc = s.d;
      e.status = s.s;
      e.statusKey = s.k;
      e.removed = !!s.r;
    }
    return e;
  }

  const ICD_DATA = (window.ICD_DATA || []).map(expandIcdRecord);
  const YHCT_DATA = (window.ICD_YHCT_DATA || []).map(expandYhctRecord);

  const dataStatusEl = document.getElementById('dataStatus');
  if (ICD_DATA.length === 0 && YHCT_DATA.length === 0) {
    dataStatusEl.className = 'warn';
    dataStatusEl.textContent =
      '⚠ Chưa có dữ liệu. Hãy dùng script "extract-icd-data.js" để trích xuất dữ liệu từ trang gốc, ' +
      'lưu thành file "icd-data.js" / "icd-yhct-data.js" và đặt cùng thư mục với file HTML này.';
  } else {
    dataStatusEl.style.display = 'none';
  }

  // Chuẩn hoá chuỗi tiếng Việt để tìm kiếm không dấu
  function normalize(str) {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd');
  }

  // Tiền xử lý: tạo trường tìm kiếm chuẩn hoá 1 lần cho hiệu năng
  // Mỗi phần tử được gắn thêm `_type` để phân biệt mã Tây y ('icd') và mã YHCT ('yhct')
  const searchIndex = [
    ...ICD_DATA.map((item) => ({
      item: { ...item, _type: 'icd' },
      codeNorm: normalize(item.code),
      nameNorm: normalize(item.name),
      nameAccent: (item.name || '').toLowerCase(),
      enNorm: normalize(item.en),
    })),
    ...YHCT_DATA.map((item) => ({
      item: { ...item, _type: 'yhct' },
      codeNorm: normalize(item.code),
      // với mã YHCT, tìm theo cả tên YHCT, tên bệnh hiện đại và mã ICD-10 tương ứng
      nameNorm: normalize(item.name) + ' ' + normalize(item.modernName) + ' ' + normalize(item.icd10),
      nameAccent: ((item.name || '') + ' ' + (item.modernName || '') + ' ' + (item.icd10 || '')).toLowerCase(),
      enNorm: '',
    })),
  ];

  const input = document.getElementById('searchInput');
  const clearBtn = document.getElementById('clearBtn');
  const yhctToggle = document.getElementById('yhctToggle');
  const mainDiseaseOnlyToggle = document.getElementById('mainDiseaseOnlyToggle');
  const rPriorityToggle = document.getElementById('rPriorityToggle');
  const sPriorityToggle = document.getElementById('sPriorityToggle');
  const resultsEl = document.getElementById('results');
  const statusEl = document.getElementById('status');
  const toastEl = document.getElementById('toast');

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 1600);
  }

  function copyText(text) {
    navigator.clipboard?.writeText(text).then(() => showToast('Đã copy: ' + text));
  }

  // Hiện banner trạng thái (statusTitle/statusDesc) ngay trong danh sách, không cần bấm vào chi tiết.
  // Áp dụng chung cho mọi loại statusTitle (VD: "Không dùng làm bệnh chính", "Có thể dùng làm bệnh chính",
  // "Cần chọn mã cụ thể hơn", "Không khuyến khích dùng làm bệnh chính"...).
  // Nhiều mã có thể xuất hiện ở nhiều nơi trong dữ liệu gốc (vừa là mục top-level, vừa là mã con
  // được liệt kê bên trong 1 mã nhóm khác) và các bản sao đó có thể có statusTitle/ghi chú khác nhau
  // (VD: bản trong "children" có đủ statusTitle do AI phân loại, còn bản top-level thì chưa có).
  // Gộp tất cả các bản trùng mã lại thành 1 bản "chuẩn" duy nhất, để cùng 1 mã luôn hiển thị
  // giống hệt nhau bất kể được tìm ra qua đường nào.
  const canonicalByCode = (function buildCanonicalIndex() {
    const map = new Map();
    function consider(raw, type) {
      if (!raw || !raw.code) return;
      const it = { ...raw, _type: type };
      const existing = map.get(it.code);
      if (!existing) {
        map.set(it.code, it);
        return;
      }
      const merged = { ...existing };
      const scalarKeys = ['statusTitle', 'statusDesc', 'status', 'en', 'note', 'removed', 'removedNote', 'modernName', 'icd10', 'name'];
      scalarKeys.forEach((key) => {
        const existingEmpty = merged[key] === undefined || merged[key] === null || merged[key] === '';
        const candidateHasValue = it[key] !== undefined && it[key] !== null && it[key] !== '';
        if (existingEmpty && candidateHasValue) merged[key] = it[key];
      });
      if ((!merged.meta || merged.meta.length === 0) && it.meta && it.meta.length) {
        merged.meta = it.meta;
      }
      map.set(it.code, merged);
    }
    ICD_DATA.forEach((item) => {
      consider(item, 'icd');
      if (item.children && item.children.length) {
        item.children.forEach((c) => consider(c, 'icd'));
      }
    });
    YHCT_DATA.forEach((item) => consider(item, 'yhct'));
    return map;
  })();

  function resolveCanonical(item) {
    if (!item || !item.code) return item;
    const canon = canonicalByCode.get(item.code);
    return canon ? { ...item, ...canon, _type: item._type } : item;
  }

  // Mã có được phép dùng làm bệnh chính hay không, dựa vào statusTitle của chính mã đó.
  // Danh sách này khớp với đúng các statusTitle thực tế có trong dữ liệu (icd-data.js / icd-yhct-data.js).
  const NON_MAIN_DISEASE_TITLES = [
    'Cần chọn mã cụ thể hơn',
    'Không khuyến khích dùng làm bệnh chính',
    'Không dùng làm bệnh chính',
    'Chỉ dùng mã hóa nguyên nhân tử vong',
    'Mã bị hủy - không sử dụng',
    'Đã huỷ theo QĐ7603',
    'Không sử dụng (PL02)',
  ];
  function isMainDiseaseUsable(item) {
    const data = resolveCanonical(item);
    if (data._type === 'yhct' && data.removed) return false;
    if (data.statusTitle && NON_MAIN_DISEASE_TITLES.includes(data.statusTitle)) return false;
    return true;
  }

  // Render 1 dòng kết quả (thẻ) dùng chung cho mọi loại mã: mã ICD-10, mã con được gợi ý từ
  // mã nhóm (giờ hiển thị ngang hàng, không phân biệt cha/con), và mã YHCT.
  // Toàn bộ vùng result-row có thể bấm vào để xổ chi tiết, không chỉ riêng nút/tên.
  // Dữ liệu hiển thị luôn lấy từ bản "chuẩn" (canonical) theo mã, để đồng nhất dù tìm bằng từ khóa nào.
  function renderCodeCard(rawItem) {
    const item = resolveCanonical(rawItem);
    const isYhct = item._type === 'yhct';
    const isRemoved = isYhct && !!item.removed;
    const isDropped = !isYhct && item.statusTitle === 'Cần chọn mã cụ thể hơn';
    const warnClass = isDropped || isRemoved ? ' result-row--dropped' : '';

    const bannerClass =
      item.status === 'ok' ? 'ok' : item.status === 'warn' ? 'warn' : item.status === 'danger' ? 'danger' : 'default';
    const effectiveBannerClass = !item.statusTitle && isRemoved ? 'warn' : bannerClass;
    // `t` (statusTitle, VD: "Đang dùng") hiện ngay ngoài danh sách. `d` (statusDesc, mô tả chi tiết)
    // chỉ hiện khi bấm xổ chi tiết ra.
    const statusTitleText = item.statusTitle || (isRemoved ? 'Không sử dụng' : '');
    const statusTitleHtml = statusTitleText ? `<b>${escapeHtml(statusTitleText)}</b>` : '';
    // Với mã YHCT có mã ICD-10 tương ứng, luôn hiện sẵn "Tên hiện đại: <mã ICD-10> - <tên>" chung 1 khối
    // màu với banner trạng thái (ngang hàng, tự xuống hàng nếu không đủ chỗ), không cần bấm xổ chi tiết
    // mới thấy. Phần chữ chỉ để đọc, kèm 1 nút "Copy mã" riêng (nền hồng nhạt, viền đen) để copy đúng
    // mã ICD-10 tương ứng.
    const icd10RowHtml =
      isYhct && item.icd10
        ? `<div class="banner-row">
             <span class="icd10-badge-text">Tên hiện đại: ${escapeHtml(item.icd10)}${item.modernName ? ' - ' + escapeHtml(item.modernName) : ''}</span>
             <button type="button" class="copy-btn icd10-copy-btn" data-copy="${escapeAttr(item.icd10)}">Copy mã</button>
           </div>`
        : '';
    const statusRowHtml =
      statusTitleHtml || icd10RowHtml
        ? `<div class="banner ${effectiveBannerClass}">${statusTitleHtml}${icd10RowHtml}</div>`
        : '';

    const extraParts = [];
    if (item.statusDesc) extraParts.push(`<div class="status-desc">${escapeHtml(item.statusDesc)}</div>`);
    if (isRemoved && item.removedNote) extraParts.push(`<div class="status-desc">${escapeHtml(item.removedNote)}</div>`);
    if (!isYhct) {
      if (item.en) extraParts.push(`<div class="en">${escapeHtml(item.en)}</div>`);
      if ((item.meta || []).length) extraParts.push(`<div class="meta">${item.meta.map((m) => `<span>${escapeHtml(m)}</span>`).join('')}</div>`);
      if (item.note) extraParts.push(`<div class="note">${item.note}</div>`);
    }
    const extraHtml = extraParts.join('');
    const hasDetail = !!extraHtml;
    const showCopy = isYhct ? !isRemoved : !isDropped;
    const nameLine = isYhct
      ? `${escapeHtml(item.name)}${item.modernName ? ' — ' + escapeHtml(item.modernName) : ''}`
      : escapeHtml(item.name);

    return `
      <div class="card">
        <div class="result-row${warnClass}${hasDetail ? ' clickable' : ''}" data-code="${escapeAttr(item.code)}" data-type="${isYhct ? 'yhct' : 'icd'}"${hasDetail ? ' role="button" tabindex="0" aria-expanded="false"' : ''}>
          ${isYhct ? '<span class="tag-yhct">YHCT</span>' : ''}
          <span class="result-code">${escapeHtml(item.code)}</span>
          <span class="result-name">${nameLine}</span>
          ${showCopy ? `<button class="copy-btn copy-btn-inline" data-copy="${escapeAttr(item.code)}">Copy mã</button>` : ''}
          ${hasDetail ? '<span class="expand-arrow">▾</span>' : ''}
        </div>
        ${statusRowHtml}
        ${hasDetail ? `<div class="detail-panel"><div class="detail-panel-inner">${extraHtml}</div></div>` : ''}
      </div>`;
  }

  function renderListItemCards(item, qi, mainOnly) {
    if (item._type === 'yhct') {
      if (mainOnly && !isMainDiseaseUsable(item)) return [];
      return [renderCodeCard(item)];
    }

    const hasChildren = item.children && item.children.length > 0;

    if (hasChildren) {
      // Mã nhóm -> không còn phân biệt cấp bậc: hiện các mã con phù hợp ngang hàng với
      // các kết quả khác, mỗi mã con là 1 dòng kết quả riêng, có thể bấm để xổ chi tiết y hệt.
      // Nếu có từ khóa tìm kiếm, chỉ hiện các mã con thực sự khớp với từ khóa đó
      // (tránh liệt kê tất cả mã con trong nhóm dù không liên quan, ví dụ tìm "thiếu máu cơ tim"
      // thì không nên hiện "Nhồi máu cơ tim cũ", "Phình thành tim"... nếu tên các mã đó không chứa từ khóa).
      let childrenToShow = item.children;
      if (qi && (qi.norm || qi.accent)) {
        const fullMatch = item.children.filter((c) => {
          const cNameAccent = (c.name || '').toLowerCase();
          if (normalize(c.code).includes(qi.norm)) return true;
          return textMatchesQuery(cNameAccent, qi);
        });
        if (fullMatch.length > 0) {
          childrenToShow = fullMatch;
        } else if (qi.words.length > 1) {
          // Chế độ chính xác nâng cao (luôn bật): không có mã con nào khớp đủ tất cả các từ,
          // chỉ hiện mã con khớp ÍT NHẤT MỘT từ trong câu tìm kiếm (đúng ranh giới từ)
          // thay vì hiện toàn bộ mã con của nhóm.
          const anyWordMatch = item.children.filter((c) => {
            const cNameAccent = (c.name || '').toLowerCase();
            return qi.words.some((w) => hasWordBoundaryMatch(cNameAccent, w));
          });
          childrenToShow = anyWordMatch.length > 0 ? anyWordMatch : item.children;
        }
        // Nếu không có mã con nào khớp đủ,
        // giữ hành vi cũ: hiện toàn bộ mã con của nhóm (childrenToShow đã mặc định = item.children).
      }
      if (mainOnly) {
        childrenToShow = childrenToShow.filter((c) => isMainDiseaseUsable(c));
      }
      return childrenToShow.map((c) => renderCodeCard(c));
    }

    // Mã cụ thể (mã lá) -> hiện rút gọn kèm banner trạng thái (nếu có) ngay trong danh sách;
    // bấm vào bất kỳ đâu trong dòng kết quả để xổ thêm chi tiết (tên tiếng Anh, phân loại, ghi chú)
    // ngay tại chỗ, với hiệu ứng xổ mượt.
    if (mainOnly && !isMainDiseaseUsable(item)) return [];
    return [renderCodeCard(item)];
  }

  function escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }
  function escapeAttr(str) { return escapeHtml(str); }

  let currentMatches = [];

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  // So khớp theo ranh giới từ, dùng \p{L}/\p{N} (Unicode) để nhận đúng cả ký tự có dấu tiếng Việt.
  // CHỈ bắt buộc ranh giới ở đầu từ khóa (không cho khớp lọt thỏm giữa 1 từ khác như "ong" trong
  // "phong"). Ở cuối thì KHÔNG bắt buộc phải là hết từ — để cho phép khớp ngay khi người dùng
  // gõ dở/chưa đủ chữ (VD: gõ "tăng huyết á" vẫn khớp được với "tăng huyết áp" vì "á" là phần đầu
  // hợp lệ của "áp"), giống kiểu tìm kiếm gợi ý tự động (autocomplete) quen thuộc.
  function hasWordBoundaryMatch(haystack, token) {
    if (!token) return false;
    const re = new RegExp('(^|[^\\p{L}\\p{N}])' + escapeRegex(token), 'iu');
    return re.test(haystack);
  }

  // Phân tích câu truy vấn. Luôn so khớp theo ĐÚNG bản có dấu người dùng gõ (không tự suy
  // rộng sang các từ khác dấu, VD: gõ "ong" tuyệt đối không được khớp với "ống"/"ông"/"óng",
  // gõ "rắn" tuyệt đối không được khớp với "rặn"/"răn"/"rán"/"rạn" — dù các từ này khi bỏ dấu
  // đều trùng nhau nhưng là những từ khác nghĩa hoàn toàn). Chỉ riêng MÃ ICD (vốn không có dấu)
  // vẫn so khớp theo bản chuẩn hoá bình thường.
  // Biên dịch sẵn 1 regex ranh giới từ cho 1 token (dùng lại `escapeRegex` đã có ở trên)
  function buildWordBoundaryRegex(token) {
    return new RegExp('(^|[^\\p{L}\\p{N}])' + escapeRegex(token), 'iu');
  }

  function buildQueryInfo(rawQuery) {
    const trimmed = (rawQuery || '').trim();
    const norm = normalize(trimmed);
    const accent = trimmed.toLowerCase();
    const words = accent.split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 0);
    // Quan trọng cho hiệu năng: biên dịch regex CHỈ 1 LẦN cho mỗi câu tìm kiếm, rồi dùng lại
    // cho toàn bộ ~16.000 dòng dữ liệu, thay vì tạo `new RegExp(...)` lại cho từng dòng
    // (trước đây là nguyên nhân chính khiến gõ phím bị đơ/chậm).
    const fullRegex = accent ? buildWordBoundaryRegex(accent) : null;
    const wordRegexes = words.map(buildWordBoundaryRegex);
    return { raw: trimmed, norm, accent, words, fullRegex, wordRegexes };
  }

  function textMatchesQuery(textAccent, qi) {
    if (!qi.accent) return false;
    // Luôn bắt buộc khớp theo đúng ranh giới từ (không tính là khớp nếu từ khóa chỉ nằm
    // lọt thỏm bên trong một từ khác, ví dụ "ong" không được tính là khớp bên trong "phong"/"ống").
    if (qi.fullRegex && qi.fullRegex.test(textAccent)) return true;
    if (qi.words.length > 1) return qi.wordRegexes.every((re) => re.test(textAccent));
    return false;
  }

  function scoreMatch(row, qi) {
    const code = row.codeNorm;
    const text = row.nameAccent;
    const qStr = qi.accent;
    if (code === qi.norm) return 1000;
    if (text === qStr) return 950;
    if (qi.norm && code.startsWith(qi.norm)) return 850;
    if (qi.fullRegex && qi.fullRegex.test(text)) {
      let s = 650;
      // Cụm từ nằm ngay đầu hoặc cuối tên bệnh (không bị "kẹp giữa") thì chính xác hơn
      if (text.startsWith(qStr)) s += 40;
      if (text.endsWith(qStr)) s += 40;
      // Cụm từ tìm kiếm chiếm tỉ lệ càng lớn trong tên bệnh (càng ít chữ thừa) thì càng liên quan
      s += Math.round((qStr.length / Math.max(text.length, 1)) * 100);
      return s;
    }
    if (code.includes(qi.norm)) return 250;
    // Không khớp nguyên cụm từ, nhưng nếu tên bệnh chứa đủ TẤT CẢ các từ trong câu tìm kiếm
    // (không cần liền nhau / đúng thứ tự, nhưng vẫn phải đúng ranh giới từng từ) thì vẫn coi là liên quan
    if (qi.words.length > 1) {
      const allWordsPresent = qi.wordRegexes.every((re) => re.test(text));
      if (allWordsPresent) {
        return Math.max(150, 400 - text.length);
      }
    }
    return 0;
  }

  let lastQueryInfo = buildQueryInfo('');

  function doSearch(query) {
    const qi = buildQueryInfo(query);
    lastQueryInfo = qi;
    if (!qi.norm && !qi.accent) {
      currentMatches = [];
      resultsEl.innerHTML = '';
      statusEl.textContent = '';
      return;
    }
    logUsage('icd_search');

    const yhctOnly = !!(yhctToggle && yhctToggle.checked);
    const matches = searchIndex
      .filter((row) => {
        if (yhctOnly && row.item._type !== 'yhct') return false;
        if (row.codeNorm.includes(qi.norm)) return true;
        if (textMatchesQuery(row.nameAccent, qi)) return true;
        return false;
      })
      .map((row) => ({ row, score: scoreMatch(row, qi) }))
      .sort((a, b) => {
        const aYhct = a.row.item._type === 'yhct' ? 1 : 0;
        const bYhct = b.row.item._type === 'yhct' ? 1 : 0;
        if (aYhct !== bYhct) return aYhct - bYhct; // YHCT luôn xuống dưới cùng, không lẫn với ICD-10 Tây y
        // Nếu bật "Ưu tiên mã R": đưa các mã có tiền tố R (triệu chứng, dấu hiệu lâm sàng...) lên đầu danh sách
        if (rPriorityToggle && rPriorityToggle.checked) {
          const aR = a.row.codeNorm.startsWith('r') ? 1 : 0;
          const bR = b.row.codeNorm.startsWith('r') ? 1 : 0;
          if (aR !== bR) return bR - aR;
        }
        // Nếu bật "Ưu tiên mã S": đưa các mã có tiền tố S (chấn thương, vết thương...) lên đầu danh sách
        if (sPriorityToggle && sPriorityToggle.checked) {
          const aS = a.row.codeNorm.startsWith('s') ? 1 : 0;
          const bS = b.row.codeNorm.startsWith('s') ? 1 : 0;
          if (aS !== bS) return bS - aS;
        }
        // Mã/tên khớp tuyệt đối (điểm >= 850) luôn đứng đầu, xếp theo điểm giảm dần
        const aExact = a.score >= 850 ? 1 : 0;
        const bExact = b.score >= 850 ? 1 : 0;
        if (aExact !== bExact) return bExact - aExact;
        if (aExact) return b.score - a.score;
        // Còn lại: sắp theo mã ABC/số cho dễ nhìn, dễ đoán thay vì theo điểm liên quan phức tạp
        return a.row.codeNorm.localeCompare(b.row.codeNorm, undefined, { numeric: true });
      })
      .map((x) => x.row);

    // Nếu 1 mã nhóm (có children) khớp tìm kiếm, ẩn bớt các mã con của nó
    // để tránh hiện trùng lặp (mã con đã nằm trong khối gợi ý màu xanh lá).
    const childCodesToHide = new Set();
    matches.forEach((row) => {
      if (row.item.children && row.item.children.length > 0) {
        row.item.children.forEach((c) => childCodesToHide.add(c.code));
      }
    });
    const dedupedMatches = matches.filter(
      (row) =>
        (row.item.children && row.item.children.length > 0) ||
        !childCodesToHide.has(row.item.code)
    );
    currentMatches = dedupedMatches;

    if (dedupedMatches.length === 0) {
      statusEl.textContent = `Tìm thấy 0 kết quả cho "${query}"`;
      resultsEl.innerHTML = '<div class="empty">Không tìm thấy mã hoặc bệnh phù hợp.</div>';
      return;
    }

    // Đếm số kết quả thực tế hiển thị ra màn hình (mỗi mã - dù trước đây là "mã cha" hay "mã con" -
    // giờ đều ngang hàng nhau, nên phải đếm theo số thẻ thực sự render ra, không đếm theo số dòng
    // trong dữ liệu gốc, tránh trường hợp 1 mã nhóm gộp nhiều mã con lại thành 1 khi đếm).
    const renderedCount = showList(dedupedMatches, qi);
    statusEl.textContent = `Tìm thấy ${renderedCount.toLocaleString('vi-VN')} kết quả cho "${query}"`;
  }

  // Với những từ khóa cho ra hàng nghìn kết quả (VD: "không xác định" ~2.800 kết quả), dựng
  // TOÀN BỘ ngần ấy thẻ HTML vào DOM cùng lúc khiến trình duyệt bị đơ 1 lúc. Thay vào đó, chỉ
  // dựng sẵn RESULTS_PAGE_SIZE thẻ đầu tiên, kèm nút "Xem thêm" để tải dần phần còn lại khi
  // người dùng thực sự cần xem — không làm mất/giảm bớt kết quả, chỉ trì hoãn việc render ra DOM.
  const RESULTS_PAGE_SIZE = 300;
  let allCards = [];
  let renderedCardCount = 0;

  function renderResultsPage(reset) {
    if (reset) {
      resultsEl.innerHTML = '';
      renderedCardCount = 0;
    }
    const oldMoreWrap = document.getElementById('loadMoreWrap');
    if (oldMoreWrap) oldMoreWrap.remove();

    const nextChunk = allCards.slice(renderedCardCount, renderedCardCount + RESULTS_PAGE_SIZE);
    renderedCardCount += nextChunk.length;
    if (nextChunk.length) resultsEl.insertAdjacentHTML('beforeend', nextChunk.join(''));

    const remaining = allCards.length - renderedCardCount;
    if (remaining > 0) {
      const wrap = document.createElement('div');
      wrap.id = 'loadMoreWrap';
      wrap.className = 'load-more-wrap';
      wrap.innerHTML = `<button type="button" class="load-more-btn" id="loadMoreBtn">Xem thêm ${remaining.toLocaleString('vi-VN')} kết quả</button>`;
      resultsEl.appendChild(wrap);
    }
  }

  function showList(matches, qi) {
    const queryInfo = qi !== undefined ? qi : lastQueryInfo;
    const mainOnly = !!(mainDiseaseOnlyToggle && mainDiseaseOnlyToggle.checked);
    allCards = matches.flatMap((row) => renderListItemCards(row.item, queryInfo, mainOnly));
    if (allCards.length === 0) {
      resultsEl.innerHTML = '<div class="empty">Không có mã nào dùng được làm bệnh chính phù hợp với tìm kiếm.</div>';
      return 0;
    }
    renderResultsPage(true);
    return allCards.length;
  }

  // Trì hoãn tìm kiếm ~150ms sau khi người dùng ngừng gõ, tránh chạy full search (16.000+ dòng)
  // trên MỌI ký tự khi đang gõ nhanh — đây là nguyên nhân chính gây đơ khi gõ cụm từ dài.
  let searchDebounceTimer = null;
  input.addEventListener('input', () => {
    const value = input.value;
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      searchDebounceTimer = null;
      doSearch(value);
    }, 150);
  });
  if (yhctToggle) {
    yhctToggle.addEventListener('change', () => {
      doSearch(input.value);
    });
  }
  if (mainDiseaseOnlyToggle) {
    mainDiseaseOnlyToggle.addEventListener('change', () => {
      doSearch(input.value);
    });
  }
  if (rPriorityToggle) {
    rPriorityToggle.addEventListener('change', () => {
      doSearch(input.value);
    });
  }
  if (sPriorityToggle) {
    sPriorityToggle.addEventListener('change', () => {
      doSearch(input.value);
    });
  }
  clearBtn.addEventListener('click', () => {
    input.value = '';
    doSearch('');
    input.focus();
  });

  // Bấm vào bất kỳ đâu trong 1 dòng kết quả (mã bệnh nào cũng ngang hàng như nhau) -> mở rộng/thu gọn
  // chi tiết ngay tại chỗ với hiệu ứng xổ mượt, không rời khỏi danh sách kết quả, không cần "Quay lại".
  resultsEl.addEventListener('click', (e) => {
    const copyBtn = e.target.closest('.copy-btn');
    if (copyBtn) {
      copyText(copyBtn.dataset.copy);
      return;
    }
    const moreBtn = e.target.closest('#loadMoreBtn');
    if (moreBtn) {
      renderResultsPage(false);
      return;
    }
    const row = e.target.closest('.result-row.clickable');
    if (row) {
      toggleResultRow(row);
    }
  });

  resultsEl.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const row = e.target.closest('.result-row.clickable');
    if (!row) return;
    e.preventDefault();
    toggleResultRow(row);
  });

  function toggleResultRow(row) {
    const card = row.closest('.card');
    const panel = card ? card.querySelector('.detail-panel') : null;
    if (!panel) return;
    const willOpen = !panel.classList.contains('open');
    panel.classList.toggle('open', willOpen);
    row.setAttribute('aria-expanded', String(willOpen));
  }

  // Phím tắt "/" để focus ô tìm kiếm
  document.addEventListener('keydown', (e) => {
    if (e.key !== '/') return;
    const ae = document.activeElement;
    const isTyping = ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable);
    if (isTyping || ae === input) return;
    e.preventDefault();
    input.focus();
  });

  input.focus();

  // Nút cuộn lên đầu trang
  const backToTopBtn = document.getElementById('backToTop');
  function toggleBackToTop() {
    if (window.scrollY > 300) {
      backToTopBtn.classList.add('show');
    } else {
      backToTopBtn.classList.remove('show');
    }
  }
  window.addEventListener('scroll', toggleBackToTop, { passive: true });
  toggleBackToTop();
  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Nút cuộn xuống cuối trang
  const goToBottomBtn = document.getElementById('goToBottom');
  function toggleGoToBottom() {
    const nearBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 50;
    if (window.scrollY <= 300 && !nearBottom) {
      goToBottomBtn.classList.add('show');
    } else {
      goToBottomBtn.classList.remove('show');
    }
  }
  window.addEventListener('scroll', toggleGoToBottom, { passive: true });
  toggleGoToBottom();
  goToBottomBtn.addEventListener('click', () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
  });
})();
