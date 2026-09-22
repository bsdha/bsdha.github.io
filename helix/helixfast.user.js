// ==UserScript==
// @name         HIS Bình Dương - Tiện ích Helix
// @namespace    https://his.benhvienbinhduong.org.vn/
// @version      1.65
// @description  Tiện ích Helix + Quick Select Cận lâm sàng
// @match        https://his.benhvienbinhduong.org.vn/*
// @run-at       document-idle
// @grant        none
// @updateURL    https://raw.githubusercontent.com/bsdha/bsdha.github.io/refs/heads/main/helix/helixfast.meta.js
// @downloadURL  https://raw.githubusercontent.com/bsdha/bsdha.github.io/refs/heads/main/helix/helixfast.user.js
// ==/UserScript==

/* Hai phần dưới đây chạy trong 2 khối IIFE độc lập, không chia sẻ biến/hàm nào,
   và mọi id phần tử DOM (toolbar, nút, popup...) đều khác nhau nên không xung đột.
   Gộp lại giúp @match chỉ cần khai báo 1 lần và Tampermonkey chỉ theo dõi 1 file. */

(function () {
  'use strict';

  const HELIXFAST_VERSION = '1.65';
  const SYMPTOM_SELECTOR = 'textarea[formcontrolname="symptom"]';
  const PROGRESSION_SELECTOR = 'textarea[formcontrolname="progression"]';
  const NOTE_TEXTAREA_SELECTOR = '.width-per88 textarea.form-control';
  const ICD_INPUT_SELECTOR = '.icd-search-container input[role="combobox"]';
  const ICD_CONTAINER_SELECTOR = '.icd-search-container';
  const ICD_ENTER_FOCUS_DELAY = 80;
  const HS_DEST = 'Bệnh viện Đa khoa Bình Dương - Cơ sở 2';

  function setNativeValue(element, value) {
    const proto = Object.getPrototypeOf(element);
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
    if (descriptor && descriptor.set) {
      descriptor.set.call(element, value);
    } else {
      element.value = value;
    }
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  let boundSymptomEl = null;

  let hsQuickVariantIndex = 0;
  let hsQuickLastText = '';

  function hsQuickVariants(text) {
    return [
      `Bệnh nhân đến khám vì ${text}, đến khám tại ${HS_DEST}.`,
      `Ghi nhận bệnh nhân ${text}, nên đến khám tại ${HS_DEST}.`,
      `Bệnh nhân vào viện với lý do: ${text}. Đến khám tại ${HS_DEST}.`,
    ];
  }

  function getVisibleNoteTextarea() {
    const candidates = Array.from(document.querySelectorAll(NOTE_TEXTAREA_SELECTOR));
    return candidates.find((el) => el.offsetParent !== null) || null;
  }

  function setNoteTextareaValue(text) {
    const noteEl = getVisibleNoteTextarea();
    if (!noteEl) return;
    setNativeValue(noteEl, text);
  }

  // ===== Điền nhanh khám lâm sàng + đồng bộ 2 ô =====
  // Chỉ số theo thứ tự textarea trong '.width-per88' (0 = bệnh sử).
  const EXAM_IDX = { general: 1, organs: 2, mirrorA: 3, mirrorB: 4 };
  const EXAM_GENERAL_TEXT = 'Bệnh tỉnh, tiếp xúc tốt, da niêm hồng\nHạch ngoại vi không sờ chạm';
  const EXAM_ORGANS_TEXT = 'Tim đều\nPhổi không rale\nBụng mềm';

  function getExamTextareas() {
    return Array.from(document.querySelectorAll(NOTE_TEXTAREA_SELECTOR));
  }

  function fillExamFields(attemptsLeft) {
    if (attemptsLeft === undefined) attemptsLeft = 10;
    const list = getExamTextareas();
    const gen = list[EXAM_IDX.general];
    const org = list[EXAM_IDX.organs];
    if (!gen || !org) {
      if (attemptsLeft > 0) setTimeout(() => fillExamFields(attemptsLeft - 1), 100);
      return;
    }
    if (!gen.value.trim()) setNativeValue(gen, EXAM_GENERAL_TEXT);
    if (!org.value.trim()) setNativeValue(org, EXAM_ORGANS_TEXT);
  }

  let examMirrorBusy = false;
  document.addEventListener(
    'input',
    (e) => {
      if (examMirrorBusy || !isHelixfastEnabled()) return;
      const t = e.target;
      if (!t || t.tagName !== 'TEXTAREA') return;
      const list = getExamTextareas();
      const a = list[EXAM_IDX.mirrorA];
      const b = list[EXAM_IDX.mirrorB];
      if (!a || !b) return;
      const other = t === a ? b : t === b ? a : null;
      if (!other || other.value === t.value) return;
      examMirrorBusy = true;
      try {
        setNativeValue(other, t.value);
      } finally {
        examMirrorBusy = false;
      }
    },
    true
  );

  // ===== Sắp xếp thứ tự thuốc trong đơn (kéo thả + nút ▲▼) =====
  const RX_STYLE_ID = 'his-rx-style';
  let rxDrag = null;

  function injectRxCss() {
    if (document.getElementById(RX_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = RX_STYLE_ID;
    style.textContent = `
      .his-rx-table th.his-rx-stt-head,
      .his-rx-table td.his-rx-stt-cell {
        width: 104px !important;
        min-width: 104px !important;
        white-space: nowrap !important;
      }
      .his-rx-table td.his-rx-stt-cell input {
        width: 30px !important;
        display: inline-block !important;
        vertical-align: middle;
        padding-left: 2px !important;
        padding-right: 2px !important;
      }
      .his-rx-ctrl {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        vertical-align: middle;
        margin-right: 4px;
      }
      .his-rx-grip {
        cursor: grab;
        user-select: none;
        font-size: 15px;
        line-height: 1;
        padding: 0 3px;
        color: #5b6472;
      }
      .his-rx-grip:hover { color: #1a56db; }
      .his-rx-btn {
        border: 1px solid #c7cdd6;
        background: #fff;
        color: #1a56db;
        border-radius: 3px;
        width: 18px;
        height: 18px;
        padding: 0;
        font-size: 9px;
        line-height: 1;
        cursor: pointer;
      }
      .his-rx-btn:hover:not(:disabled) { background: #1a56db; color: #fff; }
      .his-rx-btn:disabled { opacity: 0.3; cursor: default; }
      .his-rx-table .p-datatable-tbody > tr > td {
        transition: padding 0.12s ease;
      }
      .his-rx-table .p-datatable-tbody > tr.his-rx-gap-above > td {
        padding-bottom: 18px !important;
        box-shadow: inset 0 -3px 0 #1a56db;
      }
      .his-rx-table .p-datatable-tbody > tr.his-rx-gap-below > td {
        padding-top: 18px !important;
      }
      .his-rx-table .p-datatable-tbody > tr.his-rx-gap-below.his-rx-line > td {
        box-shadow: inset 0 3px 0 #1a56db;
      }
      .his-rx-table .p-datatable-tbody > tr.his-rx-dragging > td {
        opacity: 0.35;
      }
      .his-rx-table .p-datatable-tbody > tr.his-rx-flash > td {
        background-color: #e6f4ea !important;
      }
      body.his-rx-noselect, body.his-rx-noselect * {
        user-select: none !important;
        cursor: grabbing !important;
      }
      .his-rx-ghost {
        position: fixed;
        z-index: 2147483647;
        pointer-events: none;
        background: #1a56db;
        color: #fff;
        font-size: 12px;
        font-weight: 600;
        padding: 5px 10px;
        border-radius: 4px;
        box-shadow: 0 4px 14px rgba(0,0,0,.3);
        max-width: 320px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `;
    document.head.appendChild(style);
  }

  function findRxTables() {
    return Array.from(document.querySelectorAll('p-table table')).filter((t) => {
      const heads = Array.from(t.querySelectorAll('thead th')).map((th) =>
        th.textContent.replace(/\s+/g, ' ').trim()
      );
      return heads.indexOf('Tên thuốc') !== -1 && heads.indexOf('Tổng S.Lg') !== -1;
    });
  }

  // Cột STT không phải lúc nào cũng là cột đầu tiên (có thể có cột checkbox
  // chọn dòng đứng trước, tuỳ trạng thái đơn thuốc), nên dò theo tiêu đề cột.
  function rxGetColIndex(table, label, cacheKey) {
    if (table.dataset[cacheKey] !== undefined) {
      return parseInt(table.dataset[cacheKey], 10);
    }
    const ths = Array.from(table.querySelectorAll('thead th'));
    let idx = ths.findIndex((th) => th.textContent.replace(/\s+/g, ' ').trim() === label);
    if (idx === -1) idx = 0;
    table.dataset[cacheKey] = String(idx);
    return idx;
  }

  function rxGetSttIndex(table) {
    const idx = rxGetColIndex(table, 'STT', 'hisRxSttIdx');
    const th = table.querySelectorAll('thead th')[idx];
    if (th) th.classList.add('his-rx-stt-head');
    return idx;
  }

  function rxGetNameIndex(table) {
    return rxGetColIndex(table, 'Tên thuốc', 'hisRxNameIdx');
  }

  function rxSttCell(row) {
    const table = row.closest('table');
    if (!table) return row.cells[0] || null;
    const idx = rxGetSttIndex(table);
    return row.cells[idx] || null;
  }

  function rxNameCell(row) {
    const table = row.closest('table');
    if (!table) return row.cells[1] || null;
    const idx = rxGetNameIndex(table);
    return row.cells[idx] || null;
  }

  function getRxRows(tbody) {
    const table = tbody.closest('table');
    const idx = table ? rxGetSttIndex(table) : 0;
    return Array.from(tbody.children).filter(
      (el) => el.tagName === 'TR' && el.cells && el.cells.length > idx && el.cells[idx].querySelector('input')
    );
  }

  function rxRenumber(tbody) {
    const rows = getRxRows(tbody);
    rows.forEach((row, i) => {
      const cell = rxSttCell(row);
      const inp = cell && cell.querySelector('input');
      if (inp) inp.value = String(i + 1);
      const up = row.querySelector('.his-rx-up');
      const down = row.querySelector('.his-rx-down');
      if (up) up.disabled = i === 0;
      if (down) down.disabled = i === rows.length - 1;
    });
  }

  function rxBuildCtrl() {
    const wrap = document.createElement('span');
    wrap.className = 'his-rx-ctrl';

    const grip = document.createElement('span');
    grip.className = 'his-rx-grip';
    grip.textContent = '⠿';
    grip.title = 'Giữ chuột kéo để đổi vị trí';

    const up = document.createElement('button');
    up.type = 'button';
    up.className = 'his-rx-btn his-rx-up';
    up.textContent = '▲';
    up.title = 'Lên 1 dòng';

    const down = document.createElement('button');
    down.type = 'button';
    down.className = 'his-rx-btn his-rx-down';
    down.textContent = '▼';
    down.title = 'Xuống 1 dòng';

    wrap.appendChild(grip);
    wrap.appendChild(up);
    wrap.appendChild(down);
    return wrap;
  }

  function rxFlash(row) {
    row.classList.add('his-rx-flash');
    setTimeout(() => row.classList.remove('his-rx-flash'), 500);
  }

  // --- Đổi thứ tự bằng chính cơ chế của HIS: sửa ô STT rồi rời khỏi ô (blur) ---
  // Người dùng phát hiện: gõ số thứ tự mới vào ô STT rồi click ra ngoài thì
  // HIS tự sắp xếp lại + lưu đúng thứ tự. Ta mô phỏng lại thao tác đó.
  function rxCommitStt(row, newStt, tbody) {
    const cell = rxSttCell(row);
    if (!cell) return;
    const input0 = cell.querySelector('input');
    if (!input0) return;

    const rowsBefore = getRxRows(tbody);
    const orderBefore = rowsBefore.map((r) => r.textContent.replace(/\s+/g, ' ').trim());

    function fireEditSequence(input) {
      try {
        input.focus();
      } catch (err) {
        /* ignore */
      }
      setNativeValue(input, String(newStt));

      const enterOpts = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true };
      input.dispatchEvent(new KeyboardEvent('keydown', enterOpts));
      input.dispatchEvent(new KeyboardEvent('keypress', enterOpts));
      input.dispatchEvent(new KeyboardEvent('keyup', enterOpts));
      input.dispatchEvent(new Event('change', { bubbles: true }));

      input.dispatchEvent(new FocusEvent('blur', { bubbles: false }));
      input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      try {
        input.blur();
      } catch (err) {
        /* ignore */
      }
      document.body.focus();

      const mo = new MutationObserver(() => {
        mo.disconnect();
        clearTimeout(fallbackTimer);
        setupRxReorder();
        rxRenumber(tbody);
        if (tbody.contains(row)) {
          rxFlash(row);
          row.scrollIntoView({ block: 'nearest' });
        }
      });
      mo.observe(tbody, { childList: true });

      const fallbackTimer = setTimeout(() => {
        mo.disconnect();
        const rowsAfter = getRxRows(tbody);
        const orderAfter = rowsAfter.map((r) => r.textContent.replace(/\s+/g, ' ').trim());
        const changed = JSON.stringify(orderBefore) !== JSON.stringify(orderAfter);
        if (!changed) {
          console.warn(
            '[Helix Rx] Đã sửa ô STT nhưng HIS chưa sắp xếp lại. Ô STT đang disabled=' +
              (cell.querySelector('input') ? cell.querySelector('input').disabled : '?') +
              '. Chạy hisRxInspect() rồi getEventListeners($hisRxInput) để kiểm tra tiếp.'
          );
        }
      }, 1200);
    }

    if (input0.disabled) {
      // Ô STT thường ở trạng thái khoá (disabled) để hiển thị số thứ tự;
      // cần "mở khoá" bằng double-click trước khi có thể sửa được, giống thao tác chuột thật.
      cell.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      cell.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
      cell.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      cell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
      input0.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));

      setTimeout(() => {
        const input1 = cell.querySelector('input');
        if (!input1 || input1.disabled) {
          console.warn(
            '[Helix Rx] Không mở khoá được ô STT bằng double-click (vẫn disabled=' +
              (input1 ? input1.disabled : 'không tìm thấy ô') +
              '). Cần biết thao tác thật để mở ô này (double-click, click vào số, hay bấm icon khác?).'
          );
          return;
        }
        fireEditSequence(input1);
      }, 80);
      return;
    }

    fireEditSequence(input0);
  }

  window.hisRxInspect = function () {
    const tables = findRxTables();
    if (!tables.length) {
      console.log('[Helix Rx] Không tìm thấy bảng đơn thuốc trên trang.');
      return;
    }
    const tbody = tables[0].querySelector('tbody');
    const rows = tbody ? getRxRows(tbody) : [];
    if (!rows.length) {
      console.log('[Helix Rx] Bảng đơn thuốc đang trống.');
      return;
    }
    const cell = rxSttCell(rows[0]);
    const input = cell && cell.querySelector('input');
    window.$hisRxInput = input;
    console.log('[Helix Rx] Ô STT dòng đầu tiên đã gán vào biến $hisRxInput.');
    console.log('[Helix Rx] Trong Console gõ: getEventListeners($hisRxInput)  để xem sự kiện đang gắn (input/change/blur/keydown...).');
    console.log('[Helix Rx] Hoặc bấm chuột phải vào dòng log phần tử dưới đây → "Reveal in Elements panel".');
    console.log(input);
  };

  function rxReorder(row, newIndex) {
    const tbody = row.parentElement;
    if (!tbody) return;
    const rows = getRxRows(tbody);
    const from = rows.indexOf(row);
    if (from === -1 || newIndex === from || newIndex < 0 || newIndex >= rows.length) return;
    rxCommitStt(row, newIndex + 1, tbody);
  }

  function rxMoveRow(row, dir) {
    const tbody = row.parentElement;
    if (!tbody) return;
    const rows = getRxRows(tbody);
    const i = rows.indexOf(row);
    const j = i + dir;
    if (i === -1 || j < 0 || j >= rows.length) return;
    rxCommitStt(row, j + 1, tbody);
  }

  function rxCleanupDrag() {
    if (!rxDrag) return;
    rxDrag.rows.forEach((r) =>
      r.classList.remove('his-rx-gap-above', 'his-rx-gap-below', 'his-rx-line', 'his-rx-dragging')
    );
    if (rxDrag.ghost) rxDrag.ghost.remove();
    document.body.classList.remove('his-rx-noselect');
    rxDrag = null;
  }

  function rxShowGap(k) {
    const rows = rxDrag.rows;
    rows.forEach((r) => r.classList.remove('his-rx-gap-above', 'his-rx-gap-below', 'his-rx-line'));
    const above = rows[k - 1];
    const below = rows[k];
    if (above) above.classList.add('his-rx-gap-above');
    if (below) {
      below.classList.add('his-rx-gap-below');
      if (!above) below.classList.add('his-rx-line');
    }
  }

  function rxInsertIndex(pageY) {
    const mids = rxDrag.mids;
    for (let i = 0; i < mids.length; i++) {
      if (mids[i] > pageY) return i;
    }
    return mids.length;
  }

  document.addEventListener(
    'mousedown',
    (e) => {
      if (e.button !== 0 || !isHelixfastEnabled()) return;
      const grip = e.target.closest && e.target.closest('.his-rx-grip');
      if (!grip) return;
      const row = grip.closest('tr');
      const tbody = row && row.parentElement;
      if (!tbody) return;
      e.preventDefault();
      e.stopPropagation();

      const rows = getRxRows(tbody);
      const idx = rows.indexOf(row);
      if (idx === -1) return;
      const mids = rows.map((r) => {
        const b = r.getBoundingClientRect();
        return b.top + window.scrollY + b.height / 2;
      });

      const ghost = document.createElement('div');
      ghost.className = 'his-rx-ghost';
      const nameCell = rxNameCell(row);
      ghost.textContent = '☰ ' + (nameCell ? nameCell.textContent.replace(/\s+/g, ' ').trim() : 'Thuốc');
      ghost.style.left = e.clientX + 12 + 'px';
      ghost.style.top = e.clientY + 8 + 'px';
      document.body.appendChild(ghost);

      row.classList.add('his-rx-dragging');
      document.body.classList.add('his-rx-noselect');
      rxDrag = { row, tbody, rows, idx, mids, ghost, k: idx };
      rxShowGap(idx);
    },
    true
  );

  document.addEventListener(
    'mousemove',
    (e) => {
      if (!rxDrag) return;
      rxDrag.ghost.style.left = e.clientX + 12 + 'px';
      rxDrag.ghost.style.top = e.clientY + 8 + 'px';
      if (e.clientY < 60) window.scrollBy(0, -15);
      else if (e.clientY > window.innerHeight - 60) window.scrollBy(0, 15);
      const k = rxInsertIndex(e.clientY + window.scrollY);
      if (k !== rxDrag.k) {
        rxDrag.k = k;
        rxShowGap(k);
      }
    },
    true
  );

  document.addEventListener(
    'mouseup',
    (e) => {
      if (!rxDrag) return;
      const { row, tbody, rows, idx } = rxDrag;
      const k = rxDrag.k;
      rxCleanupDrag();
      if (k !== idx && k !== idx + 1) {
        rxReorder(row, k > idx ? k - 1 : k);
      }
      const swallow = (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
      };
      document.addEventListener('click', swallow, { capture: true, once: true });
      setTimeout(() => document.removeEventListener('click', swallow, true), 0);
    },
    true
  );

  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Escape' && rxDrag) rxCleanupDrag();
    },
    true
  );

  document.addEventListener(
    'click',
    (e) => {
      const btn = e.target.closest && e.target.closest('.his-rx-up, .his-rx-down');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      if (!isHelixfastEnabled()) return;
      const row = btn.closest('tr');
      if (row) rxMoveRow(row, btn.classList.contains('his-rx-up') ? -1 : 1);
    },
    true
  );

  function setupRxReorder() {
    if (!isHelixfastEnabled()) return;
    const tables = findRxTables();
    if (!tables.length) return;
    injectRxCss();
    tables.forEach((t) => {
      t.classList.add('his-rx-table');
      const tbody = t.querySelector('tbody');
      if (!tbody) return;
      getRxRows(tbody).forEach((row) => {
        const td = rxSttCell(row);
        if (!td) return;
        td.classList.add('his-rx-stt-cell');
        if (!td.querySelector('.his-rx-ctrl')) {
          td.insertBefore(rxBuildCtrl(), td.firstChild);
        }
      });
      // Luôn tính lại trạng thái khoá ▲▼ vì Angular có thể chỉ DI CHUYỂN
      // (giữ nguyên) các phần tử DOM đang có sẵn thay vì tạo mới khi đổi thứ
      // tự, nên không thể chỉ dựa vào việc "có control mới được chèn hay không".
      rxRenumber(tbody);
    });
  }

  function removeRxControls() {
    rxCleanupDrag();
    document.querySelectorAll('.his-rx-ctrl').forEach((n) => n.remove());
    document.querySelectorAll('.his-rx-table').forEach((t) => t.classList.remove('his-rx-table'));
  }

  let hsProgressionLocked = false;

  function hsApplyQuickVariant(text, index) {
    const progressionEl = document.querySelector(PROGRESSION_SELECTOR);
    if (!progressionEl) return;
    const variants = hsQuickVariants(text);
    const generated = variants[index % variants.length];
    setNativeValue(progressionEl, generated);
    hsProgressionLocked = true;
    setNoteTextareaValue(generated);
  }

  function syncToProgression(symptomEl) {
    const progressionEl = document.querySelector(PROGRESSION_SELECTOR);
    if (!progressionEl) return;
    if (progressionEl.value.trim() === '') {
      hsProgressionLocked = false;
    }
    if (hsProgressionLocked) return;
    if (progressionEl.value !== symptomEl.value) {
      setNativeValue(progressionEl, symptomEl.value);
    }
  }

  function closeIcdDropdownIfEmpty(inputEl) {
    if (!inputEl || inputEl.value.trim() !== '') return;
    const escEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      code: 'Escape',
      keyCode: 27,
      which: 27,
      bubbles: true,
      cancelable: true,
    });
    inputEl.dispatchEvent(escEvent);
  }

  function suppressIcdFlicker(inputEl) {
    if (!inputEl || inputEl.value.trim() !== '') return;
    document.body.classList.add('icd-flicker-guard');
    setTimeout(() => {
      closeIcdDropdownIfEmpty(inputEl);
      setTimeout(() => {
        document.body.classList.remove('icd-flicker-guard');
      }, 120);
    }, 0);
  }

  function focusIcdInput() {
    const tryFocus = (attemptsLeft) => {
      const icdInput = document.querySelector(ICD_INPUT_SELECTOR);
      if (icdInput) {
        icdInput.focus();
        suppressIcdFlicker(icdInput);
        return;
      }
      if (attemptsLeft > 0) {
        setTimeout(() => tryFocus(attemptsLeft - 1), 100);
      }
    };
    tryFocus(10);
  }

  function onSymptomInput(e) {
    if (!isHelixfastEnabled()) return;
    capitalizeFirstChar(e.target);
    syncToProgression(e.target);
  }

  function capitalizeFirstChar(el) {
    const val = el.value;
    const match = val.match(/^(\s*)(\S)/);
    if (!match) return;
    const idx = match[1].length;
    const ch = match[2];
    const upperCh = ch.toLocaleUpperCase('vi-VN');
    if (ch === upperCh) return;
    const selStart = el.selectionStart;
    const selEnd = el.selectionEnd;
    const newVal = val.slice(0, idx) + upperCh + val.slice(idx + 1);
    setNativeValue(el, newVal);
    try {
      el.setSelectionRange(selStart, selEnd);
    } catch (err) {
      /* ignore */
    }
  }

  function onSymptomKeydown(e) {
    if (!isHelixfastEnabled()) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      const text = e.target.value.trim();
      if (text) {
        if (text !== hsQuickLastText) {
          hsQuickLastText = text;
          hsQuickVariantIndex = 0;
        }
        hsApplyQuickVariant(text, hsQuickVariantIndex);
        hsQuickVariantIndex++;
        fillExamFields();
      }
      focusIcdInput();
    }
  }

  function bindSymptomEl() {
    const symptomEl = document.querySelector(SYMPTOM_SELECTOR);
    if (!symptomEl || symptomEl === boundSymptomEl) return;

    if (boundSymptomEl) {
      boundSymptomEl.removeEventListener('input', onSymptomInput);
      boundSymptomEl.removeEventListener('keydown', onSymptomKeydown);
    }

    symptomEl.addEventListener('input', onSymptomInput);
    symptomEl.addEventListener('keydown', onSymptomKeydown);
    boundSymptomEl = symptomEl;
    setupHistoryPopup(symptomEl);
  }

  function updateOverflowTitle(el) {
    if (!el || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA')) return;
    if (el.scrollWidth > el.clientWidth + 1) {
      if (el.title !== el.value) el.title = el.value;
    } else if (el.title) {
      el.removeAttribute('title');
    }
  }

  function updateTableCellOverflowTitle(td) {
    if (!td) return;
    const text = td.textContent.replace(/\s+/g, ' ').trim();
    if (td.scrollWidth > td.clientWidth + 1) {
      if (td.title !== text) td.title = text;
    } else if (td.title) {
      td.removeAttribute('title');
    }
  }

  document.addEventListener(
    'mouseover',
    (e) => {
      updateOverflowTitle(e.target);
      const td = e.target.closest && e.target.closest('.p-datatable-tbody td');
      if (td) updateTableCellOverflowTitle(td);
    },
    true
  );
  document.addEventListener(
    'input',
    (e) => updateOverflowTitle(e.target),
    true
  );
  document.addEventListener(
    'focus',
    (e) => updateOverflowTitle(e.target),
    true
  );

  function injectIcdWideningCss() {
    if (document.getElementById('his-icd-widen-style')) return;
    const style = document.createElement('style');
    style.id = 'his-icd-widen-style';
    style.textContent = `
      .icd-search-container .ng-select-container {
        height: auto !important;
        min-height: 34px;
      }
      .icd-search-container .ng-value-container {
        flex-wrap: wrap;
      }
      .icd-search-container .ng-value {
        white-space: normal !important;
        overflow: visible !important;
        text-overflow: unset !important;
        word-break: break-word;
        line-height: 1.3;
      }
      .icd-search-container .ng-input > input {
        min-width: 60px;
      }

      .ng-dropdown-panel {
        width: 90vw !important;
        max-width: 90vw !important;
        min-width: 380px !important;
      }
      .ng-dropdown-panel .ng-dropdown-panel-items {
        width: 100% !important;
      }
      .ng-dropdown-panel {
        border: 1px solid #c9c9c9 !important;
        border-radius: 4px;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18) !important;
        overflow: hidden;
      }
      .ng-dropdown-panel .ng-option {
        padding: 8px 12px !important;
        border-bottom: 1px solid #e5e5e5;
        white-space: nowrap !important;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .ng-dropdown-panel .ng-option:last-child {
        border-bottom: none;
      }
      .ng-dropdown-panel .ng-option:hover,
      .ng-dropdown-panel .ng-option.ng-option-marked {
        background-color: #cfe8ff !important;
        color: #0b3d91 !important;
        font-weight: 500;
      }
      .ng-dropdown-panel .ng-option.ng-option-selected {
        background-color: #e6f4ea !important;
      }
      .ng-dropdown-panel .ng-option.icd-option-duplicate {
        opacity: 0.4;
        background-color: #f0f0f0 !important;
        color: #999 !important;
        text-decoration: line-through;
        pointer-events: none;
        cursor: not-allowed;
      }
      .icd-search-container.icd-row-focused .ng-select-container {
        border: 3px solid #1a56db !important;
        background-color: #eaf2ff !important;
        box-shadow: 0 0 0 3px rgba(26, 86, 219, 0.28) !important;
      }
      .icd-search-container.icd-row-focused .ng-value {
        font-weight: 800 !important;
        color: #0b3d91 !important;
      }
      body.icd-flicker-guard .ng-dropdown-panel {
        visibility: hidden !important;
      }

      .p-datatable-tbody > tr > td {
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        padding-top: 2px !important;
        padding-bottom: 2px !important;
        line-height: 1.15 !important;
      }
      .p-datatable-thead > tr > th {
        padding-top: 4px !important;
        padding-bottom: 4px !important;
      }
      .p-datatable-wrapper {
        max-height: none !important;
        overflow: visible !important;
      }

      .ui.dropdown .menu .item.selected {
        background-color: #cfe8ff !important;
        color: #0b3d91 !important;
        font-weight: 700 !important;
      }

      .his-treatment-buttons {
        margin-top: 6px;
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        width: 100%;
        flex-basis: 100%;
        max-width: 100%;
      }
      .his-treatment-btn {
        font-size: 11px;
        padding: 3px 10px;
        height: 26px;
        border-radius: 4px;
        border: 1px solid #1a56db;
        background-color: #fff;
        color: #1a56db;
        cursor: pointer;
      }
      .his-treatment-btn:hover {
        background-color: #1a56db;
        color: #fff;
      }
      .his-hs-toggle-btn {
        margin-top: 6px;
        font-size: 11px;
        padding: 4px 10px;
        height: 26px;
        border-radius: 4px;
        border: 1px solid #0f9d78;
        background-color: #fff;
        color: #0f9d78;
        cursor: pointer;
      }
      .his-hs-toggle-btn:hover {
        background-color: #0f9d78;
        color: #fff;
      }
      .his-hs-panel {
        position: fixed;
        top: 90px;
        right: 20px;
        width: 320px;
        max-height: 80vh;
        overflow-y: auto;
        background: #ffffff;
        color: #1c1f26;
        border: 1px solid #d8dce2;
        border-radius: 8px;
        box-shadow: 0 6px 24px rgba(0,0,0,.25);
        z-index: 99999;
        flex-direction: column;
        font-size: 12.5px;
      }
      .his-hs-header {
        background: #0f9d78;
        color: #fff;
        padding: 8px 10px;
        border-radius: 8px 8px 0 0;
        cursor: move;
        font-weight: 600;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .his-hs-close { cursor: pointer; padding: 0 4px; }
      .his-hs-body { padding: 10px; display: flex; flex-direction: column; gap: 6px; }
      .his-hs-label { font-size: 11px; color: #0f9d78; font-weight: 600; margin-top: 4px; }
      .his-hs-row { display: flex; flex-direction: column; gap: 2px; }
      .his-hs-field {
        width: 100%;
        box-sizing: border-box;
        background: #fff;
        color: #1c1f26;
        border: 1px solid #c7cdd6;
        border-radius: 4px;
        padding: 5px 6px;
        font-size: 12px;
      }
      .his-hs-preview {
        width: 100%;
        box-sizing: border-box;
        background: #f7f9fa;
        color: #1c1f26;
        border: 1px solid #c7cdd6;
        border-radius: 4px;
        padding: 6px;
        font-size: 12px;
        resize: vertical;
      }
      .his-hs-actions { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
      .his-hs-btn {
        flex: 1 1 auto;
        font-size: 11px;
        padding: 6px 8px;
        border-radius: 4px;
        border: 1px solid #c7cdd6;
        background: #fff;
        color: #1c1f26;
        cursor: pointer;
      }
      .his-hs-btn:hover {
        background: #eef1f4;
      }
      .his-hs-btn-primary {
        border-color: #0f9d78;
        background: #0f9d78;
        color: #fff;
        font-weight: 600;
      }
      .his-hs-btn-primary:hover {
        background: #0c8265;
      }
      .his-hs-panel input[type="checkbox"] {
        cursor: pointer !important;
      }
      .his-hs-checkbox-group label,
      .his-hs-panel #his-hs-reason-group label {
        color: #1c1f26;
      }
    `;
    document.head.appendChild(style);
  }

  injectIcdWideningCss();

  document.addEventListener(
    'focus',
    (e) => {
      if (e.target && e.target.matches && e.target.matches(ICD_INPUT_SELECTOR)) {
        suppressIcdFlicker(e.target);
      }
    },
    true
  );

  document.addEventListener(
    'mousedown',
    (e) => {
      const container = e.target.closest && e.target.closest(ICD_CONTAINER_SELECTOR);
      if (!container) return;
      const input = container.querySelector(ICD_INPUT_SELECTOR);
      if (input) suppressIcdFlicker(input);
    },
    true
  );

  function findAddIcdRowButton() {
    return document.querySelector('button[icon="fa fa-plus"]');
  }

  function waitForNewIcdInput(previousCount, callback, attemptsLeft) {
    if (attemptsLeft === undefined) attemptsLeft = 20;
    const icdInputs = Array.from(document.querySelectorAll(ICD_INPUT_SELECTOR));
    if (icdInputs.length > previousCount) {
      callback(icdInputs[icdInputs.length - 1]);
      return;
    }
    if (attemptsLeft > 0) {
      setTimeout(() => waitForNewIcdInput(previousCount, callback, attemptsLeft - 1), 100);
    }
  }

  document.addEventListener(
    'keydown',
    function (e) {
      if (e.key !== 'Enter') return;
      if (!e.target || !e.target.matches || !e.target.matches(ICD_INPUT_SELECTOR)) return;
      if (!isHelixfastEnabled()) return;

      const currentInput = e.target;

      const openPanel = document.querySelector('.ng-dropdown-panel');
      if (openPanel) {
        const markedOpt =
          openPanel.querySelector('.ng-option.ng-option-marked') ||
          openPanel.querySelector('.ng-option.ng-option-selected');
        if (markedOpt && markedOpt.classList.contains('icd-option-duplicate')) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }

      setTimeout(() => {
        const icdInputs = Array.from(document.querySelectorAll(ICD_INPUT_SELECTOR));
        const idx = icdInputs.indexOf(currentInput);
        if (idx === -1) return;

        if (idx + 1 < icdInputs.length) {
          const nextInput = icdInputs[idx + 1];
          nextInput.focus();
          suppressIcdFlicker(nextInput);
        } else {
          const addBtn = findAddIcdRowButton();
          if (addBtn) {
            const countBefore = icdInputs.length;
            addBtn.click();
            waitForNewIcdInput(countBefore, (newInput) => {
              newInput.focus();
              suppressIcdFlicker(newInput);
            });
          }
        }
      }, ICD_ENTER_FOCUS_DELAY);
    },
    true
  );

  document.addEventListener(
    'focus',
    (e) => {
      if (!e.target || !e.target.matches || !e.target.matches(ICD_INPUT_SELECTOR)) return;
      document
        .querySelectorAll(ICD_CONTAINER_SELECTOR + '.icd-row-focused')
        .forEach((c) => c.classList.remove('icd-row-focused'));
      const container = e.target.closest(ICD_CONTAINER_SELECTOR);
      if (container) container.classList.add('icd-row-focused');
    },
    true
  );
  document.addEventListener(
    'blur',
    (e) => {
      if (!e.target || !e.target.matches || !e.target.matches(ICD_INPUT_SELECTOR)) return;
      const container = e.target.closest(ICD_CONTAINER_SELECTOR);
      if (container) container.classList.remove('icd-row-focused');
    },
    true
  );

  function getSelectedIcdCodes(excludeContainer) {
    const codes = [];
    document.querySelectorAll(ICD_CONTAINER_SELECTOR).forEach((container) => {
      if (container === excludeContainer) return;
      const valueEl = container.querySelector('.ng-value');
      const code = valueEl ? valueEl.textContent.trim() : '';
      if (code) codes.push(code);
    });
    return codes;
  }

  function markDuplicateIcdOptions(panel) {
    if (!isHelixfastEnabled()) return;
    const activeInput = document.activeElement;
    let currentContainer = null;
    if (activeInput && activeInput.matches && activeInput.matches(ICD_INPUT_SELECTOR)) {
      currentContainer = activeInput.closest(ICD_CONTAINER_SELECTOR);
    }
    const selectedCodes = getSelectedIcdCodes(currentContainer);

    const applyMarks = () => {
      panel.querySelectorAll('.ng-option').forEach((opt) => {
        const text = opt.textContent || '';
        const code = text.split(' - ')[0].trim();
        if (selectedCodes.length && selectedCodes.indexOf(code) !== -1) {
          opt.classList.add('icd-option-duplicate');
        } else {
          opt.classList.remove('icd-option-duplicate');
        }
      });
    };

    applyMarks();

    const optionObserver = new MutationObserver(applyMarks);
    optionObserver.observe(panel, { childList: true, subtree: true });

    const cleanupObserver = new MutationObserver((muts) => {
      for (const mu of muts) {
        for (const rn of mu.removedNodes) {
          if (rn === panel || (rn.contains && rn.contains(panel))) {
            optionObserver.disconnect();
            cleanupObserver.disconnect();
            return;
          }
        }
      }
    });
    cleanupObserver.observe(document.body, { childList: true, subtree: true });
  }

  const dropdownWatchObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        let panel = null;
        if (node.matches && node.matches('.ng-dropdown-panel')) {
          panel = node;
        } else if (node.querySelector) {
          panel = node.querySelector('.ng-dropdown-panel');
        }
        if (panel) markDuplicateIcdOptions(panel);
      }
    }
  });
  dropdownWatchObserver.observe(document.body, { childList: true, subtree: true });

  function focusSymptomFieldOnly(attemptsLeft) {
    if (!isHelixfastEnabled()) return;
    if (attemptsLeft === undefined) attemptsLeft = 30;
    const el = document.querySelector(SYMPTOM_SELECTOR);
    if (el) {
      el.focus();
      return;
    }
    if (attemptsLeft > 0) {
      setTimeout(() => focusSymptomFieldOnly(attemptsLeft - 1), 150);
    }
  }

  let lastAutoFocusedSymptomEl = null;
  function autoFocusSymptomFieldIfNew() {
    if (!isHelixfastEnabled()) return;
    const el = document.querySelector(SYMPTOM_SELECTOR);
    if (el && el !== lastAutoFocusedSymptomEl) {
      lastAutoFocusedSymptomEl = el;
      el.focus();
    } else if (!el) {
      lastAutoFocusedSymptomEl = null;
    }
  }

  const START_EXAM_BUTTON_SELECTOR = 'button[data-sk="control.T"]';
  const START_EXAM_AUTO_CLICK_RETRY_GAP_MS = 150;

  function tryAutoClickStartExamButton(attemptsLeft) {
    if (!isHelixfastEnabled()) return;
    if (attemptsLeft === undefined) attemptsLeft = 40;
    const btn = document.querySelector(START_EXAM_BUTTON_SELECTOR);
    if (btn) {
      if (!btn.disabled) btn.click();
      return;
    }
    if (attemptsLeft > 1) {
      setTimeout(() => tryAutoClickStartExamButton(attemptsLeft - 1), START_EXAM_AUTO_CLICK_RETRY_GAP_MS);
    }
  }

  document.addEventListener(
    'dblclick',
    (e) => {
      const row = e.target.closest && e.target.closest('tr.cur-pointer');
      if (!row) return;
      if (!isHelixfastEnabled()) return;
      focusSymptomFieldOnly();
      tryAutoClickStartExamButton();
    },
    true
  );

  function getVisiblePharmacyItems(menuEl) {
    return Array.from(menuEl.querySelectorAll(':scope > .item')).filter(
      (el) => el.offsetParent !== null
    );
  }

  function ensureFirstPharmacyItemSelected(menuEl) {
    if (!isHelixfastEnabled()) return;
    if (!menuEl) return;
    if (menuEl.querySelector(':scope > .item.selected')) return;
    const items = getVisiblePharmacyItems(menuEl);
    if (items.length) items[0].classList.add('selected');
  }

  const pharmacyMenuObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'attributes' && m.attributeName === 'class') {
        const el = m.target;
        if (el.classList && el.classList.contains('menu') && el.classList.contains('visible')) {
          ensureFirstPharmacyItemSelected(el);
        }
      }
    }
  });
  pharmacyMenuObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ['class'],
    subtree: true,
  });

  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key !== 'ArrowUp') return;
      if (!isHelixfastEnabled()) return;
      const dropdownRoot =
        e.target.closest && e.target.closest('.ui.dropdown.search, .ui.search.dropdown, .ui.dropdown');
      if (!dropdownRoot) return;
      const menu = dropdownRoot.querySelector('.menu');
      if (!menu) return;

      const items = getVisiblePharmacyItems(menu);
      if (!items.length) return;

      const currentIndex = items.findIndex((it) => it.classList.contains('selected'));
      if (currentIndex === 0) {
        e.preventDefault();
        e.stopPropagation();
        items[0].classList.remove('selected');
        const lastItem = items[items.length - 1];
        lastItem.classList.add('selected');
        lastItem.scrollIntoView({ block: 'nearest' });
      }
    },
    true
  );

  const TREATMENT_DIALOG_SCOPE_SELECTOR = '.p-dialog, .clinic-complete-dialog';
  const TREATMENT_LABEL_TEXT = 'Phương pháp điều trị';
  const TREATMENT_DEFAULT_VALUE = 'Nội khoa';
  const TREATMENT_OPTIONS = ['Nội khoa', 'Ngoại khoa', 'Nội - Ngoại khoa'];

  function findTreatmentTextareas() {
    const results = [];
    document.querySelectorAll(TREATMENT_DIALOG_SCOPE_SELECTOR).forEach((dialog) => {
      dialog.querySelectorAll('.ui-form-group').forEach((group) => {
        const labelEl = group.querySelector('.inline-label');
        if (!labelEl) return;
        const labelText = labelEl.textContent.replace(/\s+/g, ' ').trim();
        if (labelText !== TREATMENT_LABEL_TEXT) return;
        const textarea = group.querySelector('textarea.p-inputtextarea');
        if (textarea) results.push(textarea);
      });
    });
    return results;
  }

  function setupTreatmentButtons(textarea) {
    if (textarea.dataset.hisTreatmentSetup) return;
    textarea.dataset.hisTreatmentSetup = '1';

    const wrapper = document.createElement('div');
    wrapper.className = 'his-treatment-buttons';
    wrapper.style.flex = '1 1 100%';
    wrapper.style.width = '100%';

    TREATMENT_OPTIONS.forEach((label) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = label;
      btn.className = 'his-treatment-btn';
      btn.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (!isHelixfastEnabled()) return;
        setNativeValue(textarea, label);
      });
      wrapper.appendChild(btn);
    });

    textarea.insertAdjacentElement('afterend', wrapper);
  }

  function scanForTreatmentTextareas() {
    if (!isHelixfastEnabled()) return;
    findTreatmentTextareas().forEach((textarea) => {
      setupTreatmentButtons(textarea);
      if (!textarea.value || textarea.value.trim() === '') {
        setNativeValue(textarea, TREATMENT_DEFAULT_VALUE);
      }
    });
  }

  // ===================== TẠO BỆNH SỬ NÂNG CAO =====================
  const HS_BLANK = '— chưa chọn —';

  const HS_COMMON = {
    thoigian: ['vài giờ', '1 ngày', '2 ngày', '3 ngày', 'vài ngày', '1 tuần'],
    mucdo: ['nhẹ (2-3/10)', 'vừa (4-6/10)', 'nặng (7-8/10)', 'rất nặng (9-10/10)'],
    dienbien: ['tăng dần', 'không đổi', 'giảm dần', 'từng cơn'],
    xutri: [
      'chưa xử trí gì',
      'đã tự mua thuốc uống nhưng không đỡ',
      'đã tự mua thuốc uống có đỡ nhưng không hết hẳn',
      'đã điều trị tại cơ sở y tế khác nhưng chưa cải thiện',
    ],
  };

  const HS_REASONS = {
    dau_bung: { label: 'đau bụng', vitri: ['vùng thượng vị', 'quanh rốn', 'vùng hạ vị', 'hố chậu phải', 'hố chậu trái', 'khắp bụng'], tinhchat: ['âm ỉ', 'quặn từng cơn', 'dữ dội'], lan: ['không lan', 'lan ra sau lưng', 'lan xuống hạ vị'], kemtheo: ['đầy bụng', 'buồn nôn/nôn', 'tiêu chảy', 'táo bón', 'chán ăn', 'không kèm triệu chứng khác'] },
    dau_dau: { label: 'đau đầu', vitri: ['hai bên đầu', 'nửa đầu một bên', 'vùng trán', 'vùng chẩm', 'lan tỏa toàn đầu'], tinhchat: ['âm ỉ', 'giật theo nhịp mạch', 'căng tức'], kemtheo: ['chóng mặt', 'buồn nôn/nôn', 'sợ ánh sáng/tiếng động', 'nhìn mờ', 'không kèm triệu chứng khác'] },
    chong_mat: { label: 'chóng mặt', tinhchat: ['choáng váng', 'cảm giác xoay tròn', 'mất thăng bằng'], vitri: ['xuất hiện khi thay đổi tư thế', 'xuất hiện liên tục không phụ thuộc tư thế', 'xuất hiện khi gắng sức'], kemtheo: ['buồn nôn/nôn', 'ù tai', 'nhìn mờ', 'yếu tay chân', 'không kèm triệu chứng khác'] },
    dau_nguc: { label: 'đau ngực', vitri: ['sau xương ức', 'vùng ngực trái', 'vùng ngực phải', 'lan lên vai/hàm'], tinhchat: ['đè nặng', 'nhói', 'bỏng rát'], lan: ['liên quan đến gắng sức', 'không liên quan đến gắng sức'], kemtheo: ['khó thở', 'hồi hộp/đánh trống ngực', 'vã mồ hôi', 'không kèm triệu chứng khác'] },
    dau_vaigay: { label: 'đau vai gáy', vitri: ['vai phải', 'vai trái', 'hai vai', 'lan xuống cánh tay'], tinhchat: ['âm ỉ', 'nhức mỏi', 'tê bì kèm theo'], lan: ['xuất hiện sau vận động/mang vác', 'tự nhiên xuất hiện', 'xuất hiện sau khi ngủ dậy'], kemtheo: ['hạn chế vận động', 'tê tay', 'không kèm triệu chứng khác'] },
    tieu_kho: { label: 'tiểu khó', tinhchat: ['tiểu buốt', 'tiểu rắt', 'tiểu ngắt quãng, khó bắt đầu dòng tiểu'], kemtheo: ['tiểu máu', 'sốt', 'đau vùng hông lưng', 'đau bụng dưới', 'không kèm triệu chứng khác'] },
    tieu_long: { label: 'tiêu lỏng', vitri: ['2-3 lần/ngày', '4-6 lần/ngày', 'trên 6 lần/ngày'], tinhchat: ['phân lỏng toàn nước', 'phân nhầy', 'phân có máu'], kemtheo: ['đau bụng', 'sốt', 'nôn', 'không kèm triệu chứng khác'] },
    ho: { label: 'ho', tinhchat: ['ho khan', 'ho có đờm'], kemtheo: ['sốt', 'đau họng', 'khó thở', 'đau ngực khi ho', 'không kèm triệu chứng khác'] },
    sot: { label: 'sốt', tinhchat: ['sốt nhẹ (37.5-38°C)', 'sốt vừa (38-39°C)', 'sốt cao (trên 39°C)'], vitri: ['sốt liên tục', 'sốt thành từng cơn'], kemtheo: ['ớn lạnh/rét run', 'đau đầu', 'đau cơ', 'phát ban', 'không kèm triệu chứng khác'] },
    kho_tho: { label: 'khó thở', vitri: ['khi gắng sức', 'cả khi nghỉ ngơi', 'khi nằm, phải kê cao gối'], kemtheo: ['ho', 'đau ngực', 'phù chân', 'tím tái', 'không kèm triệu chứng khác'] },
    dau_khop: { label: 'đau khớp', vitri: ['khớp gối', 'khớp cổ tay/bàn tay', 'khớp cổ chân/bàn chân', 'nhiều khớp'], tinhchat: ['sưng, nóng, đỏ, đau', 'chỉ đau, không sưng'], lan: ['xuất hiện sau vận động', 'xuất hiện vào buổi sáng khi ngủ dậy', 'không rõ yếu tố khởi phát'], kemtheo: ['hạn chế vận động', 'sốt', 'không kèm triệu chứng khác'] },
    dau_lung: { label: 'đau lưng', vitri: ['vùng thắt lưng', 'lan xuống mông/chân một bên', 'lan xuống hai chân'], tinhchat: ['âm ỉ', 'nhức nhối', 'tê bì kèm theo'], lan: ['xuất hiện sau mang vác nặng', 'tự nhiên xuất hiện', 'xuất hiện sau chấn thương'], kemtheo: ['tê chân', 'hạn chế vận động', 'không kèm triệu chứng khác'] },
    non: { label: 'buồn nôn/nôn', vitri: ['nôn 1-2 lần', 'nôn 3-5 lần', 'nôn trên 5 lần'], tinhchat: ['liên quan đến bữa ăn', 'không liên quan đến bữa ăn'], kemtheo: ['đau bụng', 'sốt', 'tiêu chảy', 'đau đầu', 'không kèm triệu chứng khác'] },
    phu: { label: 'phù', vitri: ['hai chân', 'vùng mặt', 'toàn thân'], tinhchat: ['phù mềm, ấn lõm', 'phù cứng'], kemtheo: ['tiểu ít', 'khó thở', 'tăng cân nhanh', 'không kèm triệu chứng khác'] },
    met_moi: { label: 'mệt mỏi', tinhchat: ['mệt nhẹ, vẫn sinh hoạt được', 'mệt nhiều, hạn chế sinh hoạt'], kemtheo: ['chán ăn', 'sụt cân', 'mất ngủ', 'không kèm triệu chứng khác'] },
  };
  const HS_REASON_ORDER = ['tai_kham', 'dau_bung', 'dau_dau', 'chong_mat', 'dau_nguc', 'dau_vaigay', 'tieu_kho', 'tieu_long', 'ho', 'sot', 'kho_tho', 'dau_khop', 'dau_lung', 'non', 'phu', 'met_moi', 'khac'];
  const HS_REASON_LABELS = {
    tai_kham: 'Tái khám (bệnh mạn tính)', dau_bung: 'Đau bụng', dau_dau: 'Đau đầu', chong_mat: 'Chóng mặt',
    dau_nguc: 'Đau ngực', dau_vaigay: 'Đau vai gáy', tieu_kho: 'Tiểu khó', tieu_long: 'Tiêu lỏng', ho: 'Ho',
    sot: 'Sốt', kho_tho: 'Khó thở', dau_khop: 'Đau khớp', dau_lung: 'Đau lưng', non: 'Buồn nôn/nôn',
    phu: 'Phù', met_moi: 'Mệt mỏi', khac: 'Khác (tự nhập)',
  };
  const HS_TAIKHAM = {
    benhnen: ['Đái tháo đường', 'Tăng huyết áp', 'COPD', 'Hen phế quản', 'Rối loạn lipid máu', 'Gout', 'Bệnh tuyến giáp', 'Bệnh thận mạn'],
    tinhtrang: ['ổn định', 'chưa ổn định, còn triệu chứng', 'có triệu chứng mới xuất hiện'],
    dapung: ['đáp ứng điều trị tốt', 'đáp ứng điều trị kém', 'chưa đánh giá được đáp ứng điều trị'],
  };

  function hsJoin(parts) {
    return parts.filter((p) => p && p.trim()).join(' ');
  }

  function hsJoinList(items) {
    const list = (items || []).filter((x) => x && x.trim());
    if (list.length === 0) return '';
    if (list.length === 1) return list[0];
    return list.slice(0, -1).join(', ') + ' và ' + list[list.length - 1];
  }

  function hsBuildSentence(reasonKey, values, variant) {
    if (reasonKey === 'khac') return values.freetext || '';

    if (reasonKey === 'tai_kham') {
      const benhnen = values.benhnen ? `theo dõi ${values.benhnen}` : 'theo dõi bệnh mạn tính';
      const tinhtrang = values.tinhtrang ? `, tình trạng hiện tại ${values.tinhtrang}` : '';
      const dapung = values.dapung ? `, ${values.dapung}` : '';
      const variants = [
        `Bệnh nhân đến tái khám theo lịch hẹn để ${benhnen}${tinhtrang}${dapung}, tiếp tục điều trị theo hướng dẫn trước đó tại ${HS_DEST}.`,
        `Bệnh nhân đến ${HS_DEST} tái khám định kỳ, ${benhnen}${tinhtrang}${dapung}.`,
        `Theo lịch hẹn, bệnh nhân tái khám để ${benhnen}${tinhtrang}${dapung} tại ${HS_DEST}.`,
      ];
      return variants[variant % variants.length];
    }

    const def = HS_REASONS[reasonKey];
    if (!def) return '';

    const vitriClause = values.vitri ? ` ${values.vitri}` : '';
    const tinhchatClause = values.tinhchat ? `, tính chất ${values.tinhchat}` : '';
    const lanClause = values.lan ? `, ${values.lan}` : '';
    const kemtheoList = Array.isArray(values.kemtheo)
      ? values.kemtheo.filter((x) => x && x !== 'không kèm triệu chứng khác')
      : (values.kemtheo && values.kemtheo !== 'không kèm triệu chứng khác' ? [values.kemtheo] : []);
    const kemtheoNone = Array.isArray(values.kemtheo)
      ? values.kemtheo.indexOf('không kèm triệu chứng khác') !== -1
      : values.kemtheo === 'không kèm triệu chứng khác';
    const kemtheoClause = kemtheoList.length
      ? ` Kèm theo ${hsJoinList(kemtheoList)}.`
      : (kemtheoNone ? ' Không ghi nhận triệu chứng kèm theo khác.' : '');
    const mucdoClause = values.mucdo ? `, mức độ ${values.mucdo}` : '';
    const dienbienClause = values.dienbien ? ` Triệu chứng ${values.dienbien}` : '';
    const xutriClause = values.xutri ? `, bệnh nhân ${values.xutri}` : '';

    const variants = [
      hsJoin([
        values.thoigian ? `Cách nhập viện ${values.thoigian}, bệnh nhân xuất hiện ${def.label}${vitriClause}${tinhchatClause}${mucdoClause}${lanClause}.` : `Bệnh nhân xuất hiện ${def.label}${vitriClause}${tinhchatClause}${mucdoClause}${lanClause}.`,
        kemtheoClause,
        hsJoin([dienbienClause + (xutriClause ? xutriClause + ',' : (dienbienClause ? '.' : '')), !dienbienClause && xutriClause ? `Bệnh nhân${xutriClause},` : '']),
        `nên đến khám tại ${HS_DEST}.`,
      ]),
      hsJoin([
        values.thoigian ? `Khoảng ${values.thoigian} trước khi vào viện, bệnh nhân bắt đầu ${def.label}${vitriClause}${tinhchatClause}${mucdoClause}${lanClause}.` : `Bệnh nhân bắt đầu ${def.label}${vitriClause}${tinhchatClause}${mucdoClause}${lanClause}.`,
        kemtheoClause,
        dienbienClause ? `Diễn tiến${dienbienClause.replace(' Triệu chứng', '')}${xutriClause ? xutriClause + ',' : '.'}` : (xutriClause ? `Bệnh nhân${xutriClause},` : ''),
        `bệnh nhân đến ${HS_DEST} để được thăm khám.`,
      ]),
      hsJoin([
        `Bệnh nhân ${def.label}${vitriClause}${values.thoigian ? ` khoảng ${values.thoigian} nay` : ''}${tinhchatClause}${mucdoClause}${lanClause}.`,
        kemtheoClause,
        dienbienClause ? `Triệu chứng${dienbienClause.replace(' Triệu chứng', '')}${xutriClause ? ', ' + values.xutri : ''}.` : (xutriClause ? `Bệnh nhân${xutriClause}.` : ''),
        `Vào viện tại ${HS_DEST}.`,
      ]),
    ];
    return variants[variant % variants.length].replace(/\s+/g, ' ').replace(/\s([.,])/g, '$1').trim();
  }

  function hsBuildCore(reasonKey, values, variant) {
    const def = HS_REASONS[reasonKey];
    if (!def) return '';

    const vitriClause = values.vitri ? ` ${values.vitri}` : '';
    const tinhchatClause = values.tinhchat ? `, tính chất ${values.tinhchat}` : '';
    const lanClause = values.lan ? `, ${values.lan}` : '';
    const mucdoClause = values.mucdo ? `, mức độ ${values.mucdo}` : '';
    const dienbienClause = values.dienbien ? ` Triệu chứng ${values.dienbien}` : '';
    const xutriClause = values.xutri ? `, bệnh nhân ${values.xutri}` : '';

    const variants = [
      hsJoin([
        values.thoigian ? `Cách nhập viện ${values.thoigian}, bệnh nhân xuất hiện ${def.label}${vitriClause}${tinhchatClause}${mucdoClause}${lanClause}.` : `Bệnh nhân xuất hiện ${def.label}${vitriClause}${tinhchatClause}${mucdoClause}${lanClause}.`,
        dienbienClause ? `${dienbienClause.trim()}${xutriClause ? xutriClause + '.' : '.'}` : (xutriClause ? `Bệnh nhân${xutriClause}.` : ''),
      ]),
      hsJoin([
        values.thoigian ? `Khoảng ${values.thoigian} trước khi vào viện, bệnh nhân bắt đầu ${def.label}${vitriClause}${tinhchatClause}${mucdoClause}${lanClause}.` : `Bệnh nhân bắt đầu ${def.label}${vitriClause}${tinhchatClause}${mucdoClause}${lanClause}.`,
        dienbienClause ? `Diễn tiến${dienbienClause.replace(' Triệu chứng', '')}${xutriClause ? xutriClause + '.' : '.'}` : (xutriClause ? `Bệnh nhân${xutriClause}.` : ''),
      ]),
      hsJoin([
        `Bệnh nhân ${def.label}${vitriClause}${values.thoigian ? ` khoảng ${values.thoigian} nay` : ''}${tinhchatClause}${mucdoClause}${lanClause}.`,
        dienbienClause ? `Triệu chứng${dienbienClause.replace(' Triệu chứng', '')}${xutriClause ? ', ' + values.xutri : ''}.` : (xutriClause ? `Bệnh nhân${xutriClause}.` : ''),
      ]),
    ];
    return variants[variant % variants.length].replace(/\s+/g, ' ').replace(/\s([.,])/g, '$1').trim();
  }

  function hsBuildTaiKhamCore(values, variant) {
    const benhnen = values.benhnen ? `theo dõi ${values.benhnen}` : 'theo dõi bệnh mạn tính';
    const tinhtrang = values.tinhtrang ? `, tình trạng hiện tại ${values.tinhtrang}` : '';
    const dapung = values.dapung ? `, ${values.dapung}` : '';
    const variants = [
      `Bệnh nhân đến tái khám theo lịch hẹn để ${benhnen}${tinhtrang}${dapung}, tiếp tục điều trị theo hướng dẫn trước đó.`,
      `Bệnh nhân tái khám định kỳ, ${benhnen}${tinhtrang}${dapung}.`,
      `Theo lịch hẹn, bệnh nhân tái khám để ${benhnen}${tinhtrang}${dapung}.`,
    ];
    return variants[variant % variants.length];
  }

  const HS_DEST_VARIANTS = [
    `Bệnh nhân đến khám tại ${HS_DEST}.`,
    `Bệnh nhân đến ${HS_DEST} để được thăm khám.`,
    `Bệnh nhân vào viện tại ${HS_DEST}.`,
  ];

  const HS_MAX_REASONS = 2;

  function hsMakeSelect(id, options, withBlank) {
    const sel = document.createElement('select');
    sel.className = 'his-hs-field';
    sel.id = id;
    if (withBlank !== false) {
      const optBlank = document.createElement('option');
      optBlank.value = '';
      optBlank.textContent = HS_BLANK;
      sel.appendChild(optBlank);
    }
    options.forEach((opt) => {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = opt;
      sel.appendChild(o);
    });
    return sel;
  }

  function hsMakeCheckboxGroup(idPrefix, options, exclusiveValue) {
    const wrap = document.createElement('div');
    wrap.className = 'his-hs-checkbox-group';
    wrap.id = idPrefix;
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'column';
    wrap.style.gap = '3px';
    wrap.style.background = '#f7f9fa';
    wrap.style.border = '1px solid #c7cdd6';
    wrap.style.borderRadius = '4px';
    wrap.style.padding = '6px';

    const checkboxes = [];
    options.forEach((opt, i) => {
      const row = document.createElement('label');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '6px';
      row.style.fontSize = '12px';
      row.style.cursor = 'pointer';
      row.style.fontWeight = 'normal';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = opt;
      cb.id = `${idPrefix}-${i}`;
      cb.style.setProperty('cursor', 'pointer', 'important');

      row.appendChild(cb);
      row.appendChild(document.createTextNode(opt));
      wrap.appendChild(row);
      checkboxes.push(cb);
    });

    if (exclusiveValue) {
      checkboxes.forEach((cb) => {
        cb.addEventListener('change', () => {
          if (cb.value === exclusiveValue && cb.checked) {
            checkboxes.forEach((other) => {
              if (other !== cb) {
                other.checked = false;
                other.disabled = true;
              }
            });
          } else if (cb.value === exclusiveValue && !cb.checked) {
            checkboxes.forEach((other) => {
              other.disabled = false;
            });
          } else if (cb.checked) {
            const exclusiveCb = checkboxes.find((c) => c.value === exclusiveValue);
            if (exclusiveCb) {
              exclusiveCb.checked = false;
              exclusiveCb.disabled = true;
            }
          } else if (!checkboxes.some((c) => c.value !== exclusiveValue && c.checked)) {
            const exclusiveCb = checkboxes.find((c) => c.value === exclusiveValue);
            if (exclusiveCb) exclusiveCb.disabled = false;
          }
        });
      });
    }

    return wrap;
  }

  function hsGetCheckedValues(idPrefix) {
    const wrap = document.getElementById(idPrefix);
    if (!wrap) return [];
    return Array.from(wrap.querySelectorAll('input[type="checkbox"]:checked')).map((cb) => cb.value);
  }

  function setupHistoryPopup(symptomEl) {
    if (document.getElementById('his-hs-toggle-btn')) return;

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.id = 'his-hs-toggle-btn';
    toggleBtn.className = 'his-hs-toggle-btn';
    toggleBtn.textContent = '🩺 Tạo bệnh sử nâng cao';
    symptomEl.insertAdjacentElement('afterend', toggleBtn);

    const panel = document.createElement('div');
    panel.id = 'his-hs-panel';
    panel.className = 'his-hs-panel';
    panel.style.display = 'none';
    panel.innerHTML =
      '<div class="his-hs-header" id="his-hs-drag-handle">🩺 Tạo bệnh sử nâng cao <span class="his-hs-close" id="his-hs-close-btn">✕</span></div>' +
      '<div class="his-hs-body">' +
      '<label class="his-hs-label">Lý do vào viện (chọn tối đa 2)</label>' +
      '<div id="his-hs-reason-group"></div>' +
      '<div id="his-hs-fields"></div>' +
      '<label class="his-hs-label">Xem trước</label>' +
      '<textarea id="his-hs-preview" class="his-hs-preview" rows="4" readonly></textarea>' +
      '<div class="his-hs-actions">' +
      '<button type="button" id="his-hs-gen" class="his-hs-btn his-hs-btn-primary">🎲 Tạo bệnh sử</button>' +
      '<button type="button" id="his-hs-insert" class="his-hs-btn">📋 Chèn vào bệnh sử</button>' +
      '<button type="button" id="his-hs-reset" class="his-hs-btn">🗑️ Xóa</button>' +
      '</div>' +
      '</div>';
    document.body.appendChild(panel);

    const reasonGroupEl = panel.querySelector('#his-hs-reason-group');
    const reasonCheckboxes = [];
    let selectedReasons = [];

    HS_REASON_ORDER.forEach((key) => {
      const row = document.createElement('label');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '6px';
      row.style.fontSize = '12px';
      row.style.cursor = 'pointer';
      row.style.fontWeight = 'normal';
      row.style.padding = '2px 0';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = key;
      cb.id = `hs-reason-${key}`;
      cb.style.setProperty('cursor', 'pointer', 'important');

      row.appendChild(cb);
      row.appendChild(document.createTextNode(HS_REASON_LABELS[key]));
      reasonGroupEl.appendChild(row);
      reasonCheckboxes.push(cb);

      cb.addEventListener('change', () => {
        if (cb.checked) {
          if (selectedReasons.length >= HS_MAX_REASONS) {
            cb.checked = false;
            return;
          }
          selectedReasons.push(key);
        } else {
          selectedReasons = selectedReasons.filter((k) => k !== key);
        }
        updateReasonCheckboxAvailability();
        renderFields();
      });
    });

    function updateReasonCheckboxAvailability() {
      const atMax = selectedReasons.length >= HS_MAX_REASONS;
      reasonCheckboxes.forEach((cb) => {
        if (!cb.checked) cb.disabled = atMax;
      });
    }

    const fieldsWrap = panel.querySelector('#his-hs-fields');
    const preview = panel.querySelector('#his-hs-preview');
    let variantCounter = 0;

    function fieldRow(labelText, fieldEl) {
      const row = document.createElement('div');
      row.className = 'his-hs-row';
      const lbl = document.createElement('label');
      lbl.className = 'his-hs-label';
      lbl.textContent = labelText;
      row.appendChild(lbl);
      row.appendChild(fieldEl);
      return row;
    }

    function renderReasonBlock(key) {
      const block = document.createElement('div');
      block.className = 'hs-reason-block';
      block.dataset.reasonKey = key;
      block.style.borderTop = '1px dashed #c7cdd6';
      block.style.marginTop = '6px';
      block.style.paddingTop = '6px';

      const heading = document.createElement('div');
      heading.textContent = HS_REASON_LABELS[key];
      heading.style.color = '#0f9d78';
      heading.style.fontWeight = '600';
      heading.style.fontSize = '12.5px';
      heading.style.marginBottom = '4px';
      block.appendChild(heading);

      if (key === 'khac') {
        const ta = document.createElement('textarea');
        ta.className = 'his-hs-field';
        ta.id = `hs-f-${key}-freetext`;
        ta.rows = 3;
        ta.placeholder = 'Nhập lý do vào viện...';
        block.appendChild(fieldRow('Nội dung', ta));
        return block;
      }

      if (key === 'tai_kham') {
        block.appendChild(fieldRow('Bệnh nền đang theo dõi', hsMakeSelect(`hs-f-${key}-benhnen`, HS_TAIKHAM.benhnen)));
        block.appendChild(fieldRow('Tình trạng hiện tại', hsMakeSelect(`hs-f-${key}-tinhtrang`, HS_TAIKHAM.tinhtrang)));
        block.appendChild(fieldRow('Đáp ứng điều trị', hsMakeSelect(`hs-f-${key}-dapung`, HS_TAIKHAM.dapung)));
        return block;
      }

      const def = HS_REASONS[key];
      block.appendChild(fieldRow('Thời gian', hsMakeSelect(`hs-f-${key}-thoigian`, HS_COMMON.thoigian)));
      if (def.vitri) block.appendChild(fieldRow('Vị trí / hoàn cảnh', hsMakeSelect(`hs-f-${key}-vitri`, def.vitri)));
      if (def.tinhchat) block.appendChild(fieldRow('Tính chất', hsMakeSelect(`hs-f-${key}-tinhchat`, def.tinhchat)));
      block.appendChild(fieldRow('Mức độ', hsMakeSelect(`hs-f-${key}-mucdo`, HS_COMMON.mucdo)));
      if (def.lan) block.appendChild(fieldRow('Đặc điểm thêm', hsMakeSelect(`hs-f-${key}-lan`, def.lan)));
      if (def.kemtheo) {
        block.appendChild(
          fieldRow(
            'Kèm theo (chọn nhiều)',
            hsMakeCheckboxGroup(`hs-f-${key}-kemtheo`, def.kemtheo, 'không kèm triệu chứng khác')
          )
        );
      }
      block.appendChild(fieldRow('Diễn tiến', hsMakeSelect(`hs-f-${key}-dienbien`, HS_COMMON.dienbien)));
      block.appendChild(fieldRow('Xử trí trước viện', hsMakeSelect(`hs-f-${key}-xutri`, HS_COMMON.xutri)));
      return block;
    }

    function renderFields() {
      fieldsWrap.innerHTML = '';
      variantCounter = 0;

      if (selectedReasons.length === 0) {
        const hint = document.createElement('div');
        hint.className = 'his-hs-label';
        hint.textContent = 'Chọn ít nhất 1 lý do vào viện ở trên.';
        fieldsWrap.appendChild(hint);
        return;
      }

      selectedReasons.forEach((key) => {
        fieldsWrap.appendChild(renderReasonBlock(key));
      });
    }

    function collectValuesForReason(key) {
      const values = {};
      const prefix = `hs-f-${key}-`;
      fieldsWrap.querySelectorAll(`select[id^="${prefix}"], textarea[id^="${prefix}"]`).forEach((el) => {
        values[el.id.replace(prefix, '')] = el.value;
      });
      const kemtheoId = `${prefix}kemtheo`;
      if (document.getElementById(kemtheoId)) {
        values.kemtheo = hsGetCheckedValues(kemtheoId);
      }
      return values;
    }

    function generate() {
      if (selectedReasons.length === 0) {
        preview.value = '';
        return;
      }

      if (selectedReasons.length === 1) {
        const key = selectedReasons[0];
        const values = collectValuesForReason(key);
        preview.value = hsBuildSentence(key, values, variantCounter);
        variantCounter++;
        return;
      }

      const parts = [];
      let allKem = [];
      let hasNoneKem = false;
      let hasKemField = false;

      selectedReasons.forEach((key) => {
        const values = collectValuesForReason(key);
        if (key === 'khac') {
          if (values.freetext) parts.push(values.freetext);
          return;
        }
        if (key === 'tai_kham') {
          parts.push(hsBuildTaiKhamCore(values, variantCounter));
          return;
        }
        parts.push(hsBuildCore(key, values, variantCounter));
        if (Array.isArray(values.kemtheo)) {
          hasKemField = true;
          const nonExclusive = values.kemtheo.filter((x) => x && x !== 'không kèm triệu chứng khác');
          allKem = allKem.concat(nonExclusive);
          if (values.kemtheo.indexOf('không kèm triệu chứng khác') !== -1) hasNoneKem = true;
        }
      });

      const seen = new Set();
      const dedupKem = allKem.filter((x) => {
        if (seen.has(x)) return false;
        seen.add(x);
        return true;
      });
      if (dedupKem.length) {
        parts.push(`Kèm theo ${hsJoinList(dedupKem)}.`);
      } else if (hasKemField && hasNoneKem) {
        parts.push('Không ghi nhận triệu chứng kèm theo khác.');
      }

      parts.push(HS_DEST_VARIANTS[variantCounter % HS_DEST_VARIANTS.length]);

      preview.value = parts.filter((p) => p && p.trim()).join(' ');
      variantCounter++;
    }

    panel.querySelector('#his-hs-gen').addEventListener('click', () => {
      if (!isHelixfastEnabled()) return;
      generate();
    });
    panel.querySelector('#his-hs-insert').addEventListener('click', () => {
      if (!isHelixfastEnabled()) return;
      const text = preview.value.trim();
      if (!text) return;

      if (symptomEl) {
        const shortLabels = selectedReasons.map((key) => {
          if (key === 'khac') {
            const ft = document.getElementById(`hs-f-${key}-freetext`);
            return ft && ft.value ? ft.value.trim().split(/\s+/).slice(0, 2).join(' ') : '';
          } else if (key === 'tai_kham') {
            return 'tái khám';
          } else if (HS_REASONS[key]) {
            return HS_REASONS[key].label;
          }
          return '';
        }).filter((s) => s);
        if (shortLabels.length) setNativeValue(symptomEl, shortLabels.join(', '));
      }

      const progressionEl = document.querySelector(PROGRESSION_SELECTOR);
      if (progressionEl) {
        setNativeValue(progressionEl, text);
        hsProgressionLocked = true;
      } else {
        setNativeValue(symptomEl, text);
      }
      setNoteTextareaValue(text);
    });
    panel.querySelector('#his-hs-reset').addEventListener('click', () => {
      if (!isHelixfastEnabled()) return;
      reasonCheckboxes.forEach((cb) => {
        cb.checked = false;
        cb.disabled = false;
      });
      selectedReasons = [];
      renderFields();
      preview.value = '';
    });
    panel.querySelector('#his-hs-close-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      panel.style.display = 'none';
    });

    toggleBtn.addEventListener('click', () => {
      if (!isHelixfastEnabled()) return;
      const showing = panel.style.display !== 'none';
      panel.style.display = showing ? 'none' : 'flex';
      if (!showing && !panel.dataset.hsInit) {
        panel.dataset.hsInit = '1';
        renderFields();
      }
    });

    document.addEventListener(
      'mousedown',
      (e) => {
        if (panel.style.display === 'none') return;
        if (panel.contains(e.target)) return;
        if (e.target === toggleBtn || toggleBtn.contains(e.target)) return;
        panel.style.display = 'none';
      },
      true
    );

    const handle = panel.querySelector('#his-hs-drag-handle');
    let dragging = false, offX = 0, offY = 0;
    handle.addEventListener('mousedown', (e) => {
      if (e.target.closest('#his-hs-close-btn')) return;
      dragging = true;
      const rect = panel.getBoundingClientRect();
      offX = e.clientX - rect.left;
      offY = e.clientY - rect.top;
      panel.style.left = `${rect.left}px`;
      panel.style.top = `${rect.top}px`;
      panel.style.right = 'auto';
    });
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      panel.style.left = `${e.clientX - offX}px`;
      panel.style.top = `${e.clientY - offY}px`;
    });
    document.addEventListener('mouseup', () => { dragging = false; });

    renderFields();
  }

  const PHARMACY_SEARCH_SELECTOR = 'ng-selector[formcontrolname="pharmacy"] input.search';
  const SUPPLY_DAY_SELECTOR = 'input[formcontrolname="immediate_dispense_day"]';
  const SUPPLY_QTY_SELECTOR = 'input[formcontrolname="immediate_dispense_qty"]';
  const QUANTITY_UNIT_SELECTOR =
    'input[formcontrolname="quantity_unit_s"], input[formcontrolname="quantity_unit_tr"], input[formcontrolname="quantity_unit_c"], input[formcontrolname="quantity_unit_t"]';

  function findExactTextElement(root, text) {
    const attrMatch = root.querySelector(`[title="${text}"]`);
    if (attrMatch) return attrMatch;
    const candidates = root.querySelectorAll('span, div, label');
    for (const el of candidates) {
      if (el.children.length === 0 && el.textContent.trim() === text) return el;
    }
    return null;
  }

  function findSharedAncestor(a, b) {
    let p = a;
    while (p) {
      if (p.contains(b)) return p;
      p = p.parentElement;
    }
    return null;
  }

  function directChildContaining(parent, descendant) {
    let el = descendant;
    while (el && el.parentElement !== parent) el = el.parentElement;
    return el;
  }

  function isAnyDropdownMenuOpen() {
    return !!document.querySelector(
      '.ui.dropdown .menu.visible, .ng-dropdown-panel, .p-dropdown-panel, .p-autocomplete-panel'
    );
  }

  function fixPharmacyDosageRow() {
    if (!isHelixfastEnabled()) return;
    if (isAnyDropdownMenuOpen()) return;

    const pharmacyTab = document.getElementById('pharmacy');
    if (!pharmacyTab) return;

    const dosageLabelRaw = findExactTextElement(pharmacyTab, 'S/Tr/C/T');
    if (dosageLabelRaw) dosageLabelRaw.textContent = 'Cách dùng';
    const dosageLabelEl = dosageLabelRaw || findExactTextElement(pharmacyTab, 'Cách dùng');

    const dayLabel = findExactTextElement(pharmacyTab, 'Số ngày');
    const dayInput = pharmacyTab.querySelector(SUPPLY_DAY_SELECTOR);
    const sangInput = pharmacyTab.querySelector('input[formcontrolname="quantity_unit_s"]');
    if (!dayLabel || !dayInput || !sangInput) return;

    const row = findSharedAncestor(dayLabel, sangInput);
    if (!row || row === dayLabel || row === sangInput) return;

    const anchor = directChildContaining(row, sangInput);
    const dayLabelChild = directChildContaining(row, dayLabel);
    const dayInputChild = directChildContaining(row, dayInput);
    const dosageLabelChild = dosageLabelEl ? directChildContaining(row, dosageLabelEl) : null;

    if (!anchor || !dayLabelChild || !dayInputChild) return;
    if (anchor === dayLabelChild || anchor === dayInputChild) return;

    const nextAfterDayInput = dosageLabelChild || anchor;
    const alreadyInPlace =
      dayLabelChild.nextElementSibling === dayInputChild &&
      dayInputChild.nextElementSibling === nextAfterDayInput &&
      (!dosageLabelChild || dosageLabelChild.nextElementSibling === anchor);
    if (alreadyInPlace) return;

    row.insertBefore(dayLabelChild, anchor);
    row.insertBefore(dayInputChild, anchor);
    if (
      dosageLabelChild &&
      dosageLabelChild !== anchor &&
      dosageLabelChild !== dayLabelChild &&
      dosageLabelChild !== dayInputChild
    ) {
      row.insertBefore(dosageLabelChild, anchor);
    }
  }

  fixPharmacyDosageRow();
  setInterval(fixPharmacyDosageRow, 300);
  new MutationObserver(() => fixPharmacyDosageRow()).observe(document.body, {
    childList: true,
    subtree: true,
  });

  function findCompletedCheckbox() {
    const checkboxes = Array.from(document.querySelectorAll('p-checkbox'));
    return checkboxes.find((cb) => {
      const labelEl = cb.querySelector('.p-checkbox-label');
      return labelEl && labelEl.textContent.replace(/\s+/g, ' ').trim() === 'Đã hoàn thành';
    }) || null;
  }

  let completedCheckboxHandled = false;
  let lastCompletedCheckboxEl = null;

  function tryCheckCompletedCheckbox() {
    if (!isHelixfastEnabled()) return;
    if (isAnyDropdownMenuOpen()) return;
    const cb = findCompletedCheckbox();
    if (!cb) {
      completedCheckboxHandled = false;
      lastCompletedCheckboxEl = null;
      return;
    }
    if (cb !== lastCompletedCheckboxEl) {
      lastCompletedCheckboxEl = cb;
      completedCheckboxHandled = false;
    }
    if (completedCheckboxHandled) return;
    const box = cb.querySelector('.p-checkbox-box');
    if (!box) return;
    if (!box.classList.contains('p-highlight')) {
      box.click();
    }
    completedCheckboxHandled = true;
  }

  let paginatorAutoSet = false;
  let paginatorAttemptInProgress = false;
  let paginatorPanelObserver = null;

  function trySetPaginatorTo100(attemptsLeft) {
    if (!isHelixfastEnabled()) return;
    if (attemptsLeft === undefined) attemptsLeft = 0;
    if (paginatorAttemptInProgress) return;

    const dropdown = document.querySelector('.p-paginator-rpp-options');
    if (!dropdown) {
      if (attemptsLeft < 50) setTimeout(() => trySetPaginatorTo100(attemptsLeft + 1), 300);
      return;
    }

    const label = dropdown.querySelector('.p-dropdown-label');
    if (label && label.textContent.trim() === '100') {
      paginatorAutoSet = true;
      return;
    }

    if (document.querySelector('.p-dropdown-panel')) return;

    paginatorAttemptInProgress = true;

    if (paginatorPanelObserver) {
      paginatorPanelObserver.disconnect();
      paginatorPanelObserver = null;
    }

    let guardTimeout = null;

    paginatorPanelObserver = new MutationObserver((mutations, obs) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (!node.querySelector) continue;
          const candidates = [
            ...(node.matches && node.matches('.p-dropdown-panel') ? [node] : []),
            ...Array.from(node.querySelectorAll('.p-dropdown-panel')),
          ];
          for (const panel of candidates) {
            const items = Array.from(
              panel.querySelectorAll('li[role="option"], li.p-dropdown-item, .p-dropdown-item')
            );
            const item100 = items.find((it) => it.textContent.trim() === '100');
            if (item100) {
              obs.disconnect();
              paginatorPanelObserver = null;
              clearTimeout(guardTimeout);
              item100.click();
              paginatorAutoSet = true;
              paginatorAttemptInProgress = false;
              return;
            }
          }
        }
      }
    });

    paginatorPanelObserver.observe(document.body, { childList: true, subtree: true });

    guardTimeout = setTimeout(() => {
      if (paginatorPanelObserver) {
        paginatorPanelObserver.disconnect();
        paginatorPanelObserver = null;
      }
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
      );
      paginatorAttemptInProgress = false;
    }, 2000);

    const trigger = dropdown.querySelector('.p-dropdown-trigger');
    (trigger || dropdown).click();
  }

  function focusFieldBySelector(selector, attemptsLeft) {
    if (attemptsLeft === undefined) attemptsLeft = 10;
    const el = document.querySelector(selector);
    if (el) {
      el.focus();
      if (typeof el.select === 'function') el.select();
      return;
    }
    if (attemptsLeft > 0) {
      setTimeout(() => focusFieldBySelector(selector, attemptsLeft - 1), 50);
    }
  }

  function getTabbableElements() {
    const nodes = Array.from(
      document.querySelectorAll('input, select, textarea, button, [tabindex]')
    );
    return nodes.filter((el) => {
      if (el.disabled) return false;
      if (el.type === 'hidden') return false;
      if (el.tabIndex === -1) return false;
      const style = window.getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') return false;
      if (el.offsetParent === null) return false;
      return true;
    });
  }

  function focusNextTabbable(current) {
    const tabbables = getTabbableElements();
    const idx = tabbables.indexOf(current);
    if (idx === -1) return;
    for (let i = idx + 1; i < tabbables.length; i++) {
      tabbables[i].focus();
      if (document.activeElement === tabbables[i]) return;
    }
  }

  const SUPPLY_QTY_RECALC_DELAY_MS = 50;
  const NAP_BUTTON_WAIT_RETRY_GAP_MS = 150;

  function findNapButton() {
    const candidates = Array.from(document.querySelectorAll('button[type="submit"]'));
    return (
      candidates.find((btn) => {
        const text = btn.textContent.replace(/\s+/g, ' ').trim();
        return text === 'Nạp';
      }) || null
    );
  }

  function tryClickNapButton(attemptsLeft) {
    if (attemptsLeft === undefined) attemptsLeft = 10;
    const napBtn = findNapButton();
    if (napBtn) {
      if (napBtn.disabled) {
        if (attemptsLeft > 1) {
          setTimeout(() => tryClickNapButton(attemptsLeft - 1), NAP_BUTTON_WAIT_RETRY_GAP_MS);
        }
        return;
      }
      napBtn.click();
      return;
    }
    if (attemptsLeft > 1) {
      setTimeout(() => tryClickNapButton(attemptsLeft - 1), NAP_BUTTON_WAIT_RETRY_GAP_MS);
    }
  }

  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key !== 'Enter') return;
      if (!isHelixfastEnabled()) return;
      const target = e.target;
      if (!target || !target.matches) return;

      if (target.matches(PHARMACY_SEARCH_SELECTOR)) {
        setTimeout(() => focusFieldBySelector(SUPPLY_DAY_SELECTOR), 100);
        return;
      }

      if (target.matches(SUPPLY_DAY_SELECTOR)) {
        e.preventDefault();
        e.stopPropagation();
        focusFieldBySelector(SUPPLY_QTY_SELECTOR);
        setTimeout(() => tryClickNapButton(), SUPPLY_QTY_RECALC_DELAY_MS);
        return;
      }

      if (target.matches(QUANTITY_UNIT_SELECTOR)) {
        e.preventDefault();
        e.stopPropagation();
        focusNextTabbable(target);
        return;
      }
    },
    true
  );

  const COMPLETE_EXAM_DIALOG_TITLE = 'Hoàn thành khám';
  const AUTO_SAVE_WAIT_WINDOW_MS = 8000;
  const AUTO_SAVE_CLICK_GAP_MS = 300;

  let awaitingCompleteExamDialog = false;
  let awaitingCompleteExamTimeoutId = null;

  function findDialogFooterButtonByLabel(dialog, label) {
    const footer = dialog.querySelector('.p-dialog-footer');
    if (!footer) return null;
    return Array.from(footer.querySelectorAll('button')).find((btn) => {
      const labelEl = btn.querySelector('.p-button-label');
      return labelEl && labelEl.textContent.trim() === label;
    }) || null;
  }

  function autoRunSaveDialog(dialog) {
    const saveBtn = findDialogFooterButtonByLabel(dialog, 'Lưu lại');
    if (!saveBtn) return;
    const printBtn = findDialogFooterButtonByLabel(dialog, 'In');
    const exitBtn = findDialogFooterButtonByLabel(dialog, 'Thoát');

    const steps = [saveBtn];
    if (printBtn) steps.push(printBtn);

    function runStep(i) {
      if (i >= steps.length) {
        if (exitBtn) setTimeout(() => exitBtn.click(), AUTO_SAVE_CLICK_GAP_MS);
        return;
      }
      steps[i].click();
      setTimeout(() => runStep(i + 1), AUTO_SAVE_CLICK_GAP_MS);
    }
    runStep(0);
  }

  document.addEventListener(
    'click',
    (e) => {
      const btn = e.target.closest && e.target.closest('button');
      if (!btn) return;
      const labelEl = btn.querySelector('.p-button-label');
      if (!labelEl || labelEl.textContent.trim() !== 'Đồng ý') return;
      const dialog = btn.closest('.p-dialog');
      if (!dialog) return;
      const titleEl = dialog.querySelector('.p-dialog-title');
      const titleText = titleEl ? titleEl.textContent.replace(/\s+/g, ' ').trim() : '';
      if (titleText !== COMPLETE_EXAM_DIALOG_TITLE) return;
      if (!isHelixfastEnabled()) return;

      awaitingCompleteExamDialog = true;
      clearTimeout(awaitingCompleteExamTimeoutId);
      awaitingCompleteExamTimeoutId = setTimeout(() => {
        awaitingCompleteExamDialog = false;
      }, AUTO_SAVE_WAIT_WINDOW_MS);
    },
    true
  );

  const autoSaveDialogObserver = new MutationObserver((mutations) => {
    if (!awaitingCompleteExamDialog) return;
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        let dialog = null;
        if (node.matches && node.matches('.p-dialog')) {
          dialog = node;
        } else if (node.querySelector) {
          dialog = node.querySelector('.p-dialog');
        }
        if (!dialog || dialog.dataset.hisAutoSaveHandled) continue;

        const saveBtn = findDialogFooterButtonByLabel(dialog, 'Lưu lại');
        if (!saveBtn) continue;

        dialog.dataset.hisAutoSaveHandled = '1';
        awaitingCompleteExamDialog = false;
        clearTimeout(awaitingCompleteExamTimeoutId);
        autoRunSaveDialog(dialog);
      }
    }
  });
  autoSaveDialogObserver.observe(document.body, { childList: true, subtree: true });

  const TOOLBAR_COMPLETE_BTN_SELECTOR = 'button[data-sk="control.Q"]';
  const TOOLBAR_SAVE_BTN_SELECTOR = 'button[data-sk="control.S"]';
  const PRINT_OUTPATIENT_BTN_ID = 'his-print-outpatient-btn';
  const PRINT_OUTPATIENT_WAIT_RETRY_GAP_MS = 150;
  const PRINT_OUTPATIENT_LABEL_DEFAULT = 'In nhanh BK toa về';
  const PRINT_OUTPATIENT_LABEL_REPRINT = 'In bảng kê lại';
  const CANCEL_COMPLETE_LABEL_TEXT = 'Hủy hoàn thành';

  let printOutpatientPending = false;
  let printOutpatientTimeoutId = null;
  let printOutpatientDialogObserver = null;

  function findToolbarButton(selector) {
    // querySelector đơn thuần có thể trúng phải 1 nút cũ còn sót lại (ẩn) trong
    // DOM do Angular chưa dọn, khiến đọc nhầm text/trạng thái. Ưu tiên nút đang
    // thực sự hiển thị trên toolbar; nếu không có nút nào hiển thị thì mới
    // fallback về nút đầu tiên tìm được (giữ hành vi cũ để không phá vỡ chỗ khác).
    const all = document.querySelectorAll(selector);
    for (const el of all) {
      if (el.offsetParent !== null) return el;
    }
    return all[0] || null;
  }

  function findOpenCompleteExamDialog() {
    return (
      Array.from(document.querySelectorAll('.p-dialog')).find((dialog) => {
        const titleEl = dialog.querySelector('.p-dialog-title');
        const titleText = titleEl ? titleEl.textContent.replace(/\s+/g, ' ').trim() : '';
        return titleText === COMPLETE_EXAM_DIALOG_TITLE;
      }) || null
    );
  }

  function stopWaitingForCompleteExamDialog() {
    printOutpatientPending = false;
    clearTimeout(printOutpatientTimeoutId);
    if (printOutpatientDialogObserver) {
      printOutpatientDialogObserver.disconnect();
      printOutpatientDialogObserver = null;
    }
  }

  function tryAutoConfirmCompleteExamDialog() {
    const dialog = findOpenCompleteExamDialog();
    if (!dialog) return false;
    const confirmBtn = findDialogFooterButtonByLabel(dialog, 'Đồng ý');
    if (!confirmBtn || confirmBtn.disabled) return false;
    confirmBtn.click();
    return true;
  }

  function startWaitingForCompleteExamDialogThenConfirm() {
    stopWaitingForCompleteExamDialog();
    printOutpatientPending = true;

    if (tryAutoConfirmCompleteExamDialog()) {
      stopWaitingForCompleteExamDialog();
      return;
    }

    printOutpatientDialogObserver = new MutationObserver(() => {
      if (!printOutpatientPending) return;
      if (tryAutoConfirmCompleteExamDialog()) {
        stopWaitingForCompleteExamDialog();
      }
    });
    printOutpatientDialogObserver.observe(document.body, { childList: true, subtree: true });

    printOutpatientTimeoutId = setTimeout(() => {
      stopWaitingForCompleteExamDialog();
    }, AUTO_SAVE_WAIT_WINDOW_MS);
  }

  function tryClickCompleteExamToolbarButton(attemptsLeft) {
    if (attemptsLeft === undefined) attemptsLeft = 10;
    const completeBtn = findToolbarButton(TOOLBAR_COMPLETE_BTN_SELECTOR);
    if (completeBtn) {
      if (completeBtn.disabled) return;
      completeBtn.click();
      startWaitingForCompleteExamDialogThenConfirm();
      return;
    }
    if (attemptsLeft > 1) {
      setTimeout(() => tryClickCompleteExamToolbarButton(attemptsLeft - 1), PRINT_OUTPATIENT_WAIT_RETRY_GAP_MS);
    }
  }

  const PRINT_SEQUENCE_RETRY_GAP_MS = 150;
  const PRINT_SEQUENCE_MAX_ATTEMPTS = 20;
  const PRINT_MENU_TRIGGER_ARIA_LABEL = 'In';
  const PRINT_MENU_ITEM_TEXT = 'Bảng kê bảo hiểm';
  const PRINT_FINAL_BUTTON_LABEL = 'In';

  function findPrintMenuTriggerButton() {
    const triggers = document.querySelectorAll(
      'app-toolbar-action-menu button.examination-toolbar-trigger'
    );
    for (const b of triggers) {
      if (b.offsetParent === null) continue;
      const aria = (b.getAttribute('aria-label') || '').trim();
      const spanText = b.querySelector('span') ? b.querySelector('span').textContent.trim() : '';
      if (aria === PRINT_MENU_TRIGGER_ARIA_LABEL || spanText === PRINT_MENU_TRIGGER_ARIA_LABEL) {
        return b;
      }
    }
    return null;
  }

  function findPrintMenuItemBangKe() {
    const items = document.querySelectorAll(
      '.examination-toolbar-menu__item, button[role="menuitem"]'
    );
    const target = PRINT_MENU_ITEM_TEXT.normalize('NFC');
    for (const it of items) {
      if (it.offsetParent === null) continue;
      const text = it.textContent.replace(/\s+/g, ' ').trim().normalize('NFC');
      if (text.indexOf(target) !== -1) return it;
    }
    return null;
  }

  function findFinalPrintButton() {
    const btns = document.querySelectorAll('button[pbutton]');
    for (const b of btns) {
      if (b.offsetParent === null) continue;
      const labelEl = b.querySelector('.p-button-label');
      const text = (labelEl ? labelEl.textContent : b.textContent).trim();
      if (text === PRINT_FINAL_BUTTON_LABEL) return b;
    }
    return null;
  }

  function waitAndClick(findFn, attemptsLeft, onSuccess, onFail) {
    const el = findFn();
    if (el) {
      el.click();
      if (onSuccess) onSuccess();
      return;
    }
    if (attemptsLeft > 0) {
      setTimeout(() => waitAndClick(findFn, attemptsLeft - 1, onSuccess, onFail), PRINT_SEQUENCE_RETRY_GAP_MS);
    } else if (onFail) {
      onFail();
    }
  }

  // Sau khi bấm "In" trong hộp thoại "Bảng kê bảo hiểm QĐ 6556/697", ẩn ngay
  // hộp thoại đó (kể cả lớp nền mờ phía sau) bằng CSS để người dùng không
  // nhìn thấy nó nữa, đợi một chút cho hành động in kịp thực thi rồi mới bấm
  // "Thoát" để đóng đúng cách (dọn dẹp state của ứng dụng thay vì chỉ ẩn).
  const PRINT_DIALOG_CLOSE_DELAY_MS = 500;

  function hidePrintDialogElement(dialog) {
    if (!dialog) return;
    dialog.style.transition = 'none';
    dialog.style.opacity = '0';
    dialog.style.pointerEvents = 'none';
    const maskEl = dialog.closest('.p-dialog-mask') || dialog.parentElement;
    if (maskEl && maskEl !== dialog) {
      maskEl.style.transition = 'none';
      maskEl.style.opacity = '0';
      maskEl.style.pointerEvents = 'none';
    }
  }

  function clickFinalPrintButtonThenClose(attemptsLeft, onDone) {
    const btn = findFinalPrintButton();
    if (btn) {
      const dialog = btn.closest('.p-dialog');
      btn.click();
      hidePrintDialogElement(dialog);
      if (dialog) {
        setTimeout(() => {
          const exitBtn = findDialogFooterButtonByLabel(dialog, 'Thoát');
          if (exitBtn) exitBtn.click();
        }, PRINT_DIALOG_CLOSE_DELAY_MS);
      }
      if (onDone) onDone();
      return;
    }
    if (attemptsLeft > 0) {
      setTimeout(() => clickFinalPrintButtonThenClose(attemptsLeft - 1, onDone), PRINT_SEQUENCE_RETRY_GAP_MS);
    } else if (onDone) {
      onDone();
    }
  }

  // Nút "In" gốc (app-toolbar-action-menu) chỉ được render khi đang ở subtab
  // "Khám bệnh" (href="#examination"). Ở các subtab khác như "Đơn thuốc"
  // (#pharmacy) hay "Phiếu chỉ định" (#service) nút đó không tồn tại trong DOM.
  // Đây là tab kiểu Bootstrap (data-toggle="tab"), các pane chỉ ẩn/hiện bằng
  // CSS chứ không bị hủy component, nên chuyển qua lại không làm mất dữ liệu
  // đang nhập ở tab khác.
  const EXAM_SUBTAB_HREF = '#examination';
  const EXAM_SUBTAB_SWITCH_WAIT_MS = 200;

  // Trang có thể có nhiều hơn 1 "ul.nav-tabs" (VD: thanh tab ngoài cùng
  // "Danh sách thăm khám ngoại trú | Chi tiết thông tin ngoại trú"), nên phải
  // xác định đúng thanh tab CON (Khám bệnh | DS chỉ định | Phiếu chỉ định |
  // Đơn thuốc | ...) bằng cách tìm ul.nav-tabs nào chứa link href="#examination",
  // rồi chỉ tìm/đọc trạng thái active bên trong đúng thanh đó — tránh đọc
  // nhầm sang thanh tab khác khiến không xác định đúng tab gốc để quay lại.
  function findExamSubTabBar() {
    const bars = document.querySelectorAll('ul.nav-tabs');
    for (const ul of bars) {
      if (ul.querySelector('a[data-toggle="tab"][href="' + EXAM_SUBTAB_HREF + '"]')) return ul;
    }
    return null;
  }

  function findExamSubTabLink(href) {
    const bar = findExamSubTabBar();
    if (!bar) return null;
    const a = bar.querySelector('a[data-toggle="tab"][href="' + href + '"]');
    return a && a.offsetParent !== null ? a : null;
  }

  function getActiveExamSubTabHref() {
    const bar = findExamSubTabBar();
    if (!bar) return null;
    const activeLink = bar.querySelector('li.active > a[data-toggle="tab"]');
    return activeLink ? activeLink.getAttribute('href') : null;
  }

  function clickExamSubTab(href) {
    const link = findExamSubTabLink(href);
    if (!link) return false;
    link.click();
    return true;
  }

  // Lớp phủ tạm thời trong lúc script tự chuyển qua tab "Khám bệnh" rồi quay
  // lại, để người dùng không thấy giao diện nháy đổi tab — chỉ thấy 1 lớp mờ
  // + spinner ngắn, giống như đang chờ xử lý bình thường.
  const PRINT_OVERLAY_ID = 'his-print-bangke-overlay';
  const PRINT_OVERLAY_STYLE_ID = 'his-print-bangke-overlay-style';

  function injectPrintOverlayCss() {
    if (document.getElementById(PRINT_OVERLAY_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = PRINT_OVERLAY_STYLE_ID;
    style.textContent = `
      #${PRINT_OVERLAY_ID} {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        background: rgba(255, 255, 255, 0.94);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
        font-family: inherit;
      }
      #${PRINT_OVERLAY_ID} .his-print-overlay-spinner {
        width: 34px;
        height: 34px;
        border: 4px solid #d6dee8;
        border-top-color: #1a56db;
        border-radius: 50%;
        animation: his-print-overlay-spin 0.8s linear infinite;
      }
      #${PRINT_OVERLAY_ID} .his-print-overlay-text {
        font-size: 13px;
        color: #333;
      }
      @keyframes his-print-overlay-spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  function showPrintOverlay(text) {
    injectPrintOverlayCss();
    let el = document.getElementById(PRINT_OVERLAY_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = PRINT_OVERLAY_ID;
      el.innerHTML =
        '<div class="his-print-overlay-spinner"></div>' +
        '<div class="his-print-overlay-text"></div>';
      document.body.appendChild(el);
    }
    el.querySelector('.his-print-overlay-text').textContent = text || 'Đang xử lý...';
  }

  function hidePrintOverlay() {
    const el = document.getElementById(PRINT_OVERLAY_ID);
    if (el) el.remove();
  }

  // Khi đã ở trạng thái "Hủy hoàn thành" (tức khám đã hoàn thành trước đó),
  // nút chuyển thành "In bảng kê lại": thực hiện 3 lần click liên tiếp
  // (chờ render giữa mỗi bước để tránh lỗi) — mở menu "In" trên toolbar,
  // chọn mục "Bảng kê bảo hiểm QĐ 6556/697", rồi bấm nút "In" trong hộp
  // thoại hiện ra — để xuất đúng bảng kê bảo hiểm.
  //
  // Nếu nút "In" gốc không có sẵn ở subtab hiện tại, tự chuyển sang subtab
  // "Khám bệnh" trước, chạy xong thì tự quay lại subtab ban đầu — có phủ
  // overlay để việc chuyển qua-lại này không hiện ra trước mắt người dùng.
  function runPrintBangKeSequence() {
    const trigger = findPrintMenuTriggerButton();
    if (trigger && !trigger.disabled) {
      trigger.click();
      waitAndClick(findPrintMenuItemBangKe, PRINT_SEQUENCE_MAX_ATTEMPTS, () => {
        clickFinalPrintButtonThenClose(PRINT_SEQUENCE_MAX_ATTEMPTS, null);
      });
      return;
    }

    const originalHref = getActiveExamSubTabHref();
    if (originalHref === EXAM_SUBTAB_HREF) return; // đã ở đúng tab mà vẫn không có nút -> bỏ qua

    showPrintOverlay('Đang in bảng kê bảo hiểm...');

    function restoreAndHideOverlay() {
      if (originalHref) clickExamSubTab(originalHref);
      setTimeout(hidePrintOverlay, EXAM_SUBTAB_SWITCH_WAIT_MS);
    }

    if (!clickExamSubTab(EXAM_SUBTAB_HREF)) {
      hidePrintOverlay();
      return;
    }

    setTimeout(() => {
      waitAndClick(findPrintMenuTriggerButton, PRINT_SEQUENCE_MAX_ATTEMPTS, () => {
        waitAndClick(findPrintMenuItemBangKe, PRINT_SEQUENCE_MAX_ATTEMPTS, () => {
          clickFinalPrintButtonThenClose(PRINT_SEQUENCE_MAX_ATTEMPTS, () => {
            restoreAndHideOverlay();
          });
        }, () => {
          restoreAndHideOverlay();
        });
      }, () => {
        restoreAndHideOverlay();
      });
    }, EXAM_SUBTAB_SWITCH_WAIT_MS);
  }

  function handlePrintOutpatientClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (isCancelCompleteButtonVisible()) {
      runPrintBangKeSequence();
    } else {
      tryClickCompleteExamToolbarButton();
    }
  }

  // ===== Nút "In toa thuốc" =====
  // Mỗi dòng "Đơn thuốc số ..." trong bảng danh sách đơn thuốc có 1 nút "In"
  // (title="In") riêng, nằm trong action-col CÙNG hàng <tr> với nhãn "Đơn
  // thuốc số ... (ngày giờ) - Bác sĩ ...". Bảng này chỉ được render khi đang
  // ở subtab "Đơn thuốc" (href="#pharmacy").
  const PRINT_RX_BTN_ID = 'his-print-rx-btn';
  const PRINT_RX_LABEL = 'In toa thuốc';
  const RX_SUBTAB_HREF = '#pharmacy';
  const RX_PICKER_MENU_ID = 'his-print-rx-menu';

  // v1.62: nhãn tab con "Đơn thuốc" có kèm số đếm (badge) ngay cạnh, ví dụ
  // "Đơn thuốc 1" — số này luôn nằm sẵn trong DOM ngay khi trang vừa tải
  // xong, KHÔNG phụ thuộc việc người dùng đã từng bấm vào tab "Đơn thuốc"
  // hay chưa (khác với bảng đơn thuốc bên trong pane, chỉ được Angular
  // render vào DOM ở lần đầu tab đó được kích hoạt). Dùng badge này làm tín
  // hiệu "chắc chắn có đơn" ngay từ khi load trang / vừa chuyển bệnh nhân,
  // để 2 nút in không bị mờ oan trong lúc người dùng còn ở tab "Khám bệnh".
  function getRxTabBadgeCount() {
    const bar = findExamSubTabBar();
    if (!bar) return 0;
    const link = bar.querySelector('a[data-toggle="tab"][href="' + RX_SUBTAB_HREF + '"]');
    if (!link) return 0;
    // Thử tìm phần tử badge riêng trước (span có nội dung thuần số), rồi mới
    // fallback đọc số ở cuối toàn bộ text của tab — tránh vơ nhầm span khác
    // (icon...) nếu tab có nhiều span con.
    const spans = Array.from(link.querySelectorAll('span'));
    const badgeSpan = spans.find((s) => /^\d+$/.test(s.textContent.trim()));
    if (badgeSpan) return parseInt(badgeSpan.textContent.trim(), 10) || 0;
    const fullText = link.textContent.replace(/\s+/g, ' ').trim();
    const m = fullText.match(/(\d+)\s*$/);
    return m ? parseInt(m[1], 10) || 0 : 0;
  }

  // Quét toàn bộ đơn thuốc đang hiển thị: lấy nút "In" kèm nhãn của dòng đó,
  // để nếu có nhiều hơn 1 đơn thì hiện danh sách cho người dùng chọn.
  //
  // v1.58: nới lỏng điều kiện dò tìm — trước đây yêu cầu ĐÚNG cấu trúc
  // ".action-col button[title=\"In\"]" nằm trong "p-table tr" và bản thân nút
  // đó phải offsetParent !== null. Nếu HIS render lệch 1 chút (khác class,
  // icon là <a> thay vì <button>, hoặc nút bị coi là "ẩn" do offsetParent
  // tính sai vì nằm trong container có overflow/animation) thì hàm cũ trả
  // về mảng rỗng dù trên màn hình rõ ràng đã có "Đơn thuốc số ...", khiến
  // nút "In toa thuốc" bị mờ vĩnh viễn dù F5 lại vẫn vậy. Giờ dò theo nhiều
  // tầng dự phòng, ưu tiên khớp đúng như cũ, sau đó nới dần điều kiện.
  function findPrintIconInRow(row) {
    // 1) Đúng cấu trúc gốc.
    let btn = row.querySelector('.action-col button[title="In"]');
    if (btn) return btn;
    // 2) Bỏ yêu cầu class "action-col", chỉ cần button[title="In"] trong dòng.
    btn = row.querySelector('button[title="In"]');
    if (btn) return btn;
    // 3) title có thể là "In" nhưng kèm khoảng trắng/hoa-thường khác, hoặc
    //    nằm ở aria-label thay vì title.
    const candidates = row.querySelectorAll('button, a');
    for (const el of candidates) {
      const t = (el.getAttribute('title') || el.getAttribute('aria-label') || '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
      if (t === 'in' || t === 'in toa' || t === 'in đơn') return el;
    }
    // 4) Nhận diện qua icon in (fa-print) bên trong nút/thẻ a.
    const iconBtn = row.querySelector('button i.fa-print, a i.fa-print, i.fa-print');
    if (iconBtn) return iconBtn.closest('button, a') || iconBtn;
    return null;
  }

  const RX_ROW_LABEL_PATTERN = /Đơn\s*thuốc\s*số/i;

  function collectRxPrintEntries() {
    const entries = [];
    // Ưu tiên các dòng bên trong <p-table>, nhưng nếu không có dòng nào phù
    // hợp thì thử lại trên toàn bộ <tr> của trang — phòng trường hợp HIS đổi
    // component bảng mà không còn thẻ <p-table> bao ngoài.
    let rows = Array.from(document.querySelectorAll('p-table tr'));
    let printBtns = rows.map((row) => findPrintIconInRow(row)).filter(Boolean);
    if (printBtns.length === 0) {
      rows = Array.from(document.querySelectorAll('tr'));
    }

    rows.forEach((row) => {
      // v1.61: BẮT BUỘC dòng phải thực sự là "Đơn thuốc số ..." mới tính là
      // hợp lệ. Trước đó (v1.60) khi không xác định được nhãn, code coi mọi
      // nút "In"/icon in tìm thấy trên trang (kể cả ở bảng "Phiếu chỉ định",
      // "Cận lâm sàng", "Tiếp nhận"...) đều là đơn thuốc, khiến 2 nút sáng
      // sai dù bệnh nhân CHƯA có đơn thuốc nào. Giờ chỉ nhận dòng có nhãn
      // khớp "Đơn thuốc số ..." (từ a.btn-expand b hoặc text của cả dòng).
      const rowText = row.textContent.replace(/\s+/g, ' ').trim();
      const labelEl = row.querySelector('a.btn-expand b');
      const labelText = labelEl ? labelEl.textContent.replace(/\s+/g, ' ').trim() : '';
      if (!RX_ROW_LABEL_PATTERN.test(labelText) && !RX_ROW_LABEL_PATTERN.test(rowText)) return;

      const printBtn = findPrintIconInRow(row);
      if (!printBtn) return;
      // Pane của tab không active chỉ ẩn bằng CSS, không bị Angular huỷ khỏi
      // DOM, nên vẫn tính là "có đơn" dù đang ở tab khác — chỉ cần phần tử
      // còn gắn trong document.
      if (!document.contains(printBtn)) return;

      let label = labelText;
      if (!label) {
        const m = rowText.match(/Đơn thuốc số[^)]*\)/i);
        label = m ? m[0] : 'Đơn thuốc';
      }
      // Tránh trùng lặp nếu cùng 1 nút được match qua nhiều dòng lồng nhau.
      if (entries.some((e) => e.btn === printBtn)) return;
      entries.push({ label, btn: printBtn });
    });
    return entries;
  }

  function removeRxPickerMenu() {
    const el = document.getElementById(RX_PICKER_MENU_ID);
    if (el) el.remove();
  }

  function showRxPickerMenu(anchorBtn, entries, onPick, onCancel) {
    removeRxPickerMenu();
    const menu = document.createElement('div');
    menu.id = RX_PICKER_MENU_ID;
    Object.assign(menu.style, {
      position: 'fixed',
      zIndex: '2147483647',
      background: '#fff',
      border: '1px solid #bbb',
      borderRadius: '6px',
      boxShadow: '0 4px 14px rgba(0,0,0,.22)',
      padding: '6px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      minWidth: '260px',
      maxWidth: '420px',
    });

    const title = document.createElement('div');
    title.textContent = 'Chọn đơn thuốc cần in:';
    Object.assign(title.style, {
      fontSize: '11px',
      fontWeight: '700',
      color: '#555',
      padding: '2px 4px 4px',
    });
    menu.appendChild(title);

    entries.forEach((entry) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.textContent = entry.label;
      Object.assign(item.style, {
        textAlign: 'left',
        padding: '6px 8px',
        fontSize: '12px',
        border: '1px solid #d7dee6',
        borderRadius: '4px',
        background: '#f7f9fc',
        cursor: 'pointer',
        whiteSpace: 'normal',
      });
      item.addEventListener('mouseenter', () => (item.style.background = '#e8f0fe'));
      item.addEventListener('mouseleave', () => (item.style.background = '#f7f9fc'));
      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        removeRxPickerMenu();
        onPick(entry);
      });
      menu.appendChild(item);
    });

    // v1.63: nút "In toa thuốc" thường nằm sát mép phải toolbar, nếu chỉ lấy
    // rect.left làm mép trái menu thì với maxWidth 420px menu rất dễ tràn ra
    // ngoài khung nhìn bên phải và bị cắt mất chữ. Giờ append vào DOM trước
    // để đo kích thước THẬT của menu (do nội dung co giãn giữa minWidth và
    // maxWidth), rồi canh menu theo MÉP PHẢI của nút bấm và tự kẹp lại trong
    // phạm vi cửa sổ (cả trái/phải lẫn trên/dưới).
    menu.style.visibility = 'hidden';
    document.body.appendChild(menu);
    const anchorRect = anchorBtn.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const margin = 8;

    let left = anchorRect.right - menuRect.width; // canh mép phải menu = mép phải nút
    if (left < margin) left = margin;
    if (left + menuRect.width > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - menuRect.width - margin);
    }

    let top = anchorRect.bottom + 4;
    if (top + menuRect.height > window.innerHeight - margin) {
      // Không đủ chỗ phía dưới -> hiện lên phía trên nút thay vì bị cắt.
      const aboveTop = anchorRect.top - menuRect.height - 4;
      top = aboveTop >= margin ? aboveTop : margin;
    }

    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    menu.style.visibility = 'visible';

    setTimeout(() => {
      document.addEventListener('click', function closer(ev) {
        if (!menu.contains(ev.target) && ev.target !== anchorBtn) {
          menu.remove();
          document.removeEventListener('click', closer);
          if (onCancel) onCancel();
        }
      }, true);
    }, 0);
  }

  // Giống hệt cơ chế của "In bảng kê lại": nếu bảng đơn thuốc không có sẵn ở
  // subtab hiện tại, tự chuyển sang subtab "Đơn thuốc", đọc danh sách đơn,
  // rồi tự quay lại subtab ban đầu — có phủ overlay để việc chuyển qua-lại
  // này không hiện ra trước mắt người dùng. Nếu có nhiều hơn 1 đơn, hiện
  // danh sách ngay tại nút "In toa thuốc" để người dùng chọn đơn cần in.
  function runPrintRxSequence() {
    const anchorBtn = document.getElementById(PRINT_RX_BTN_ID);

    function proceedWithEntries(entries, cleanup) {
      if (entries.length === 0) {
        if (cleanup) cleanup();
        return;
      }
      if (entries.length === 1) {
        entries[0].btn.click();
        if (cleanup) cleanup();
        return;
      }
      showRxPickerMenu(
        anchorBtn,
        entries,
        (entry) => {
          entry.btn.click();
          if (cleanup) cleanup();
        },
        () => {
          if (cleanup) cleanup();
        }
      );
    }

    const directEntries = collectRxPrintEntries();
    if (directEntries.length > 0) {
      proceedWithEntries(directEntries, null);
      return;
    }

    const originalHref = getActiveExamSubTabHref();
    if (originalHref === RX_SUBTAB_HREF) return; // đã ở đúng tab mà vẫn không thấy đơn nào -> bỏ qua

    showPrintOverlay('Đang tải danh sách đơn thuốc...');

    function restoreAndHideOverlay() {
      if (originalHref) clickExamSubTab(originalHref);
      setTimeout(hidePrintOverlay, EXAM_SUBTAB_SWITCH_WAIT_MS);
    }

    if (!clickExamSubTab(RX_SUBTAB_HREF)) {
      hidePrintOverlay();
      return;
    }

    function waitAndCollect(attemptsLeft) {
      if (attemptsLeft === undefined) attemptsLeft = PRINT_SEQUENCE_MAX_ATTEMPTS;
      const entries = collectRxPrintEntries();
      if (entries.length > 0) {
        proceedWithEntries(entries, restoreAndHideOverlay);
        return;
      }
      if (attemptsLeft > 0) {
        setTimeout(() => waitAndCollect(attemptsLeft - 1), PRINT_SEQUENCE_RETRY_GAP_MS);
      } else {
        restoreAndHideOverlay();
      }
    }

    setTimeout(() => waitAndCollect(), EXAM_SUBTAB_SWITCH_WAIT_MS);
  }

  function handlePrintRxClick(e) {
    e.preventDefault();
    e.stopPropagation();
    runPrintRxSequence();
  }

  function createPrintRxButton() {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = PRINT_RX_BTN_ID;
    btn.className = 'btn btn-xs';
    btn.innerHTML = '<i class="fa fa-print"></i> ' + PRINT_RX_LABEL;
    // Màu riêng (tím), khác với nút "In nhanh BK toa về" / "In bảng kê lại"
    // (btn-info, xanh dương) để không bị nhầm 2 nút với nhau.
    Object.assign(btn.style, {
      background: '#6f42c1',
      borderColor: '#6f42c1',
      color: '#fff',
    });
    btn.addEventListener('click', handlePrintRxClick);
    return btn;
  }

  // Mờ (disable) nút "In toa thuốc" khi chưa có đơn thuốc nào để in — tức
  // collectRxPrintEntries() không tìm thấy dòng "Đơn thuốc số ..." nào cả.
  //
  // v1.58: dùng setProperty(..., 'important') thay vì gán style.opacity
  // trực tiếp, để tránh trường hợp CSS khác trên trang (hoặc style trước đó
  // còn sót lại) ghi đè và làm nút bị kẹt ở trạng thái mờ dù disabled đã là
  // false. Đồng thời log ra console để dễ chẩn đoán nếu vẫn còn bị mờ.
  function updatePrintRxButtonState(btn, hasEntriesArg) {
    if (!btn) return;
    const hasEntries = typeof hasEntriesArg === 'boolean' ? hasEntriesArg : collectRxPrintEntries().length > 0;
    btn.disabled = !hasEntries;
    btn.style.setProperty('opacity', hasEntries ? '1' : '0.45', 'important');
    btn.style.setProperty('cursor', hasEntries ? 'pointer' : 'not-allowed', 'important');
    btn.style.setProperty('background', '#6f42c1', 'important');
    btn.style.setProperty('border-color', '#6f42c1', 'important');
    btn.style.setProperty('color', '#fff', 'important');
    btn.dataset.hasEntries = hasEntries ? '1' : '0';
  }

  // Lưới an toàn: ngoài MutationObserver, kiểm tra lại định kỳ mỗi 1.5s
  // phòng trường hợp DOM thay đổi theo cách MutationObserver không bắt kịp
  // (ví dụ Angular thay nguyên node cha bằng detached/reattach nhanh).
  let printRxWatchdogTimer = null;
  function startPrintRxWatchdog() {
    if (printRxWatchdogTimer) return;
    printRxWatchdogTimer = setInterval(() => {
      const btn = document.getElementById(PRINT_RX_BTN_ID);
      const outBtn = document.getElementById(PRINT_OUTPATIENT_BTN_ID);
      if (!btn) return;
      const hasEntries = collectRxPrintEntries().length > 0 || getRxTabBadgeCount() > 0;
      if (btn.dataset.hasEntries !== (hasEntries ? '1' : '0')) {
        updatePrintRxButtonState(btn, hasEntries);
      }
      if (outBtn && outBtn.dataset.hasEntries !== (hasEntries ? '1' : '0')) {
        updatePrintOutpatientButtonState(outBtn, hasEntries);
      }
    }, 1500);
  }

  function removePrintRxButton() {
    removeRxPickerMenu();
    const btn = document.getElementById(PRINT_RX_BTN_ID);
    if (btn) btn.remove();
  }

  function createPrintOutpatientButton() {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = PRINT_OUTPATIENT_BTN_ID;
    btn.className = 'btn btn-info btn-xs';
    btn.innerHTML = '<i class="fa fa-print"></i> ' + PRINT_OUTPATIENT_LABEL_DEFAULT;
    btn.addEventListener('click', handlePrintOutpatientClick);
    return btn;
  }

  function updatePrintOutpatientButtonLabel(btn) {
    if (!btn) return;
    // Không dựa vào data-sk nữa: khi ở trạng thái "đã hoàn thành khám", nút
    // này có thể không còn mang data-sk="control.Q" như lúc ban đầu (do
    // Angular gán lại), nên quét trực tiếp theo TEXT của các nút đang hiển
    // thị trên trang để tìm đúng trạng thái "Hủy hoàn thành".
    const isCancelCompleteState = isCancelCompleteButtonVisible();
    const desiredLabel = isCancelCompleteState
      ? PRINT_OUTPATIENT_LABEL_REPRINT
      : PRINT_OUTPATIENT_LABEL_DEFAULT;
    const currentLabel = btn.textContent.replace(/\s+/g, ' ').trim();
    if (currentLabel !== desiredLabel) {
      btn.innerHTML = '<i class="fa fa-print"></i> ' + desiredLabel;
    }
  }

  // v1.58: "In nhanh BK toa về" / "In bảng kê lại" cũng cần ít nhất 1 đơn
  // thuốc mới in được, nên mờ/khoá đồng bộ với nút "In toa thuốc" — dùng
  // chung 1 kết quả hasEntries để tránh gọi collectRxPrintEntries() 2 lần.
  function updatePrintOutpatientButtonState(btn, hasEntries) {
    if (!btn) return;
    btn.disabled = !hasEntries;
    btn.style.setProperty('opacity', hasEntries ? '1' : '0.45', 'important');
    btn.style.setProperty('cursor', hasEntries ? 'pointer' : 'not-allowed', 'important');
    btn.dataset.hasEntries = hasEntries ? '1' : '0';
  }

  function isCancelCompleteButtonVisible() {
    const targetText = CANCEL_COMPLETE_LABEL_TEXT.normalize('NFC');
    const btns = document.querySelectorAll('button');
    for (const b of btns) {
      if (b.offsetParent === null) continue;
      const t = b.textContent.replace(/\s+/g, ' ').trim().normalize('NFC');
      if (t.indexOf(targetText) !== -1) return true;
    }
    return false;
  }

  function removePrintOutpatientButton() {
    const btn = document.getElementById(PRINT_OUTPATIENT_BTN_ID);
    if (btn) btn.remove();
  }

  // ===== Tự tích "Tái khám" khi vào tab Đơn thuốc =====
  // Nút PrimeNG p-checkbox: phần tử thật sự nhận click là div[data-pc-section
  // ="input"] (class "p-checkbox-box") bên trong, không phải input ẩn.
  // Khi bị khoá (disabled), root có class "p-checkbox-disabled" và/hoặc
  // div input có data-p-disabled="true" — lúc đó KHÔNG cố ép tích vì Angular
  // sẽ không nhận, click chỉ vô ích.
  function findTaiKhamCheckbox() {
    const boxes = document.querySelectorAll('p-checkbox');
    for (const cb of boxes) {
      const label = cb.querySelector('label.p-checkbox-label');
      if (label && label.textContent.replace(/\s+/g, ' ').trim() === 'Tái khám') return cb;
    }
    return null;
  }

  function isPCheckboxDisabled(cbRoot) {
    const inputBox = cbRoot.querySelector('[data-pc-section="input"]');
    if (inputBox && inputBox.getAttribute('data-p-disabled') === 'true') return true;
    const hiddenInput = cbRoot.querySelector('input[type="checkbox"]');
    return !!(hiddenInput && hiddenInput.disabled);
  }

  function isPCheckboxChecked(cbRoot) {
    const inputBox = cbRoot.querySelector('[data-pc-section="input"]');
    return !!(inputBox && inputBox.getAttribute('data-p-highlight') === 'true');
  }

  function tryAutoCheckTaiKhamOnce() {
    const cb = findTaiKhamCheckbox();
    if (!cb) return false;
    if (isPCheckboxChecked(cb)) return true; // đã tích rồi, coi như xong
    if (isPCheckboxDisabled(cb)) return false; // đang khoá, thử lại sau
    const clickTarget = cb.querySelector('[data-pc-section="input"]') || cb;
    clickTarget.click();
    return isPCheckboxChecked(cb);
  }

  // Chỉ kích hoạt đúng lúc VỪA chuyển sang tab "Đơn thuốc" (cạnh sườn lên),
  // không lặp lại liên tục khi vẫn đang ở tab đó — để không ép tích lại nếu
  // người dùng chủ động bỏ tích. Checkbox có thể đang khoá ngay lúc chuyển
  // tab rồi mở khoá ngay sau (Angular render xong), nên thử lại vài lần.
  let lastActiveExamSubTabHref = null;
  function autoCheckTaiKhamRetry(attemptsLeft) {
    if (attemptsLeft === undefined) attemptsLeft = 10;
    if (tryAutoCheckTaiKhamOnce()) return;
    if (attemptsLeft > 0) setTimeout(() => autoCheckTaiKhamRetry(attemptsLeft - 1), 300);
  }
  function watchExamSubTabForRxAutoCheck() {
    const href = getActiveExamSubTabHref();
    if (href === RX_SUBTAB_HREF && lastActiveExamSubTabHref !== RX_SUBTAB_HREF) {
      autoCheckTaiKhamRetry();
    }
    lastActiveExamSubTabHref = href;
  }

  // ===== Tự động điền "Số ngày tái khám" = số ngày lớn nhất đã kê trong đợt =====
  // Theo dõi mọi ô "Số ngày" (nhãn <span class="inline-label ...">Số ngày</span>
  // đứng cạnh 1 <input>, dùng khi thêm từng loại thuốc). Mỗi lần Enter, so với
  // số lớn nhất đã ghi nhận CHO BỆNH NHÂN ĐANG XEM; nếu lớn hơn thì cập nhật
  // ngay vào ô số ngày hẹn tái khám rồi bấm ra ngoài để p-calendar tự tính
  // lại ngày hẹn.
  let rxDaysMax = 0;
  let rxDaysPatientKey = null;

  // Không có id bệnh nhân lộ sẵn trong DOM nên tạm dùng số hồ sơ (6-10 chữ số
  // liền nhau) xuất hiện sớm nhất trong khối thông tin ngoại trú đang active
  // làm khoá phân biệt — nếu sau này thấy nhận diện sai bệnh nhân (số max bị
  // giữ nguyên qua bệnh nhân khác), báo lại để đổi sang selector chính xác
  // hơn (VD: đúng phần tử hiển thị "Số BA").
  // v1.65: dùng đúng ô mã bệnh nhân — input[pinputtext] nằm trong cùng
  // .ui-inputgroup với 2 nút "Cập nhật TTHC" / "Tra cứu bệnh sử" (theo đúng
  // HTML người dùng cung cấp), thay vì đoán số 6-10 chữ số đầu tiên trên
  // trang (dễ bắt nhầm số khác như huyết áp, cân nặng...).
  function getCurrentPatientKeyForRxDays() {
    const updateBtn = document.querySelector('button[title="Cập nhật TTHC"]');
    const group = updateBtn ? updateBtn.closest('.ui-inputgroup') : null;
    const input = group ? group.querySelector('input[pinputtext]') : null;
    const val = input ? input.value.trim() : '';
    if (val) return val;
    // Dự phòng nếu không tìm thấy đúng cấu trúc trên.
    const pane =
      document.querySelector('.tab-content > .tab-pane.active') ||
      document.querySelector('.tab-pane.active') ||
      document.body;
    const m = (pane.textContent || '').match(/\b\d{6,10}\b/);
    return m ? m[0] : null;
  }

  function resetRxDaysTrackingIfPatientChanged() {
    const key = getCurrentPatientKeyForRxDays();
    if (key && key !== rxDaysPatientKey) {
      rxDaysPatientKey = key;
      rxDaysMax = 0;
    }
  }

  function findInlineLabelTextForInput(input) {
    const parent = input.parentElement;
    if (!parent) return '';
    const label = parent.querySelector('span.inline-label');
    return label ? label.textContent.replace(/\s+/g, ' ').trim() : '';
  }

  // Hàng "Tái khám" gồm 3 phần: checkbox + input số ngày (plthousandformater,
  // rộng 50px) + p-calendar — cùng nằm trong 1 container cha gần nhau. Đi lên
  // tối đa vài cấp từ checkbox để tìm đúng container này, tránh nhầm sang
  // input[plthousandformater] khác ở chỗ khác của trang (VD ô số lượng thuốc).
  function findTaiKhamRowContainer() {
    const cb = findTaiKhamCheckbox();
    if (!cb) return null;
    let node = cb.parentElement;
    for (let i = 0; i < 6 && node; i++) {
      if (node.querySelector('input[plthousandformater]') && node.querySelector('p-calendar')) {
        return node;
      }
      node = node.parentElement;
    }
    return null;
  }

  function findTaiKhamDaysInput() {
    const row = findTaiKhamRowContainer();
    if (row) {
      const el = row.querySelector('input[plthousandformater]');
      if (el) return el;
    }
    // Dự phòng nếu không dò được container: lấy input plthousandformater đầu
    // tiên trên trang (chấp nhận rủi ro nếu trang có nhiều ô cùng directive).
    return document.querySelector('input[plthousandformater]');
  }

  function applyRxDaysMaxToTaiKham() {
    const input = findTaiKhamDaysInput();
    if (!input || input.disabled) return; // ô đang khoá (VD chưa tích Tái khám)
    if (input.value === String(rxDaysMax)) return;
    setNativeValue(input, String(rxDaysMax));
    // Bấm ra ngoài để p-calendar tự tính lại ngày hẹn tái khám theo số ngày
    // vừa điền — kích blur trên chính ô rồi click ra vùng trống trung tính.
    setTimeout(() => {
      input.dispatchEvent(new Event('blur', { bubbles: true }));
      document.body.click();
    }, 50);
  }

  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key !== 'Enter') return;
      const target = e.target;
      if (!target || target.tagName !== 'INPUT') return;
      if (findInlineLabelTextForInput(target) !== 'Số ngày') return;
      const val = parseInt((target.value || '').replace(/\D/g, ''), 10);
      if (!val || val <= 0) return;
      resetRxDaysTrackingIfPatientChanged();
      if (val > rxDaysMax) {
        rxDaysMax = val;
        applyRxDaysMaxToTaiKham();
      }
    },
    true
  );

  function ensureCustomPrintButtonsPlacement() {
    // Cố định thứ tự NGAY TRƯỚC nút "Lưu lại" (control.S), bất kể nút này
    // đang bị vô hiệu hóa (disabled) hay không:
    //   [In bảng kê lại / In nhanh BK toa về]  [In toa thuốc]  [Lưu lại]
    // Đặt theo kiểu "chỉ số bên trái phải là X" (idempotent) thay vì mỗi nút
    // tự tranh nhau giành vị trí "ngay trước Lưu lại", để 2 hàm không đẩy
    // nhau đổi chỗ liên tục mỗi lần MutationObserver chạy lại.
    const saveBtn = findToolbarButton(TOOLBAR_SAVE_BTN_SELECTOR);
    if (!saveBtn) return;

    let rxBtn = document.getElementById(PRINT_RX_BTN_ID);
    if (!rxBtn) rxBtn = createPrintRxButton();

    let outBtn = document.getElementById(PRINT_OUTPATIENT_BTN_ID);
    if (!outBtn) outBtn = createPrintOutpatientButton();

    if (saveBtn.previousElementSibling !== rxBtn) {
      saveBtn.insertAdjacentElement('beforebegin', rxBtn);
    }
    if (rxBtn.previousElementSibling !== outBtn) {
      rxBtn.insertAdjacentElement('beforebegin', outBtn);
    }

    updatePrintOutpatientButtonLabel(outBtn);
    const hasEntries = collectRxPrintEntries().length > 0 || getRxTabBadgeCount() > 0;
    updatePrintRxButtonState(rxBtn, hasEntries);
    updatePrintOutpatientButtonState(outBtn, hasEntries);
    startPrintRxWatchdog();
    watchExamSubTabForRxAutoCheck();
  }

  const HELIXFAST_STORAGE_KEY = 'helixfast_enabled';
  const HELIXFAST_TOGGLE_LI_ID = 'helixfast-toggle-li';
  const HELIXFAST_SETTINGS_LINK_SELECTOR = 'a[title="Thiết lập"]';

  function isHelixfastEnabled() {
    try {
      const v = localStorage.getItem(HELIXFAST_STORAGE_KEY);
      return v === null ? true : v === '1';
    } catch (err) {
      return true;
    }
  }

  function setHelixfastEnabled(enabled) {
    try {
      localStorage.setItem(HELIXFAST_STORAGE_KEY, enabled ? '1' : '0');
    } catch (err) {
      /* bỏ qua nếu trình duyệt chặn localStorage */
    }
  }

  function injectHelixfastToggleCss() {
    if (document.getElementById('helixfast-toggle-style')) return;
    const style = document.createElement('style');
    style.id = 'helixfast-toggle-style';
    style.textContent = `
      #${HELIXFAST_TOGGLE_LI_ID} {
        display: inline-flex !important;
        align-items: center;
        width: auto !important;
        min-width: 0 !important;
        max-width: none !important;
        overflow: visible !important;
      }
      #${HELIXFAST_TOGGLE_LI_ID} > a {
        display: inline-flex !important;
        align-items: center;
        gap: 5px;
        white-space: nowrap;
        cursor: pointer;
        width: auto !important;
        min-width: 0 !important;
        max-width: none !important;
        padding-left: 10px !important;
        padding-right: 10px !important;
      }
      #${HELIXFAST_TOGGLE_LI_ID} > a,
      #${HELIXFAST_TOGGLE_LI_ID} > a:focus,
      #${HELIXFAST_TOGGLE_LI_ID} > a:active,
      #${HELIXFAST_TOGGLE_LI_ID} > a:focus-visible {
        outline: none !important;
        box-shadow: none !important;
      }
      .helixfast-logo {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        font-size: 14px;
        line-height: 1;
        flex-shrink: 0;
      }
      .helixfast-label {
        font-size: 12px;
        font-weight: 600;
        color: inherit;
        white-space: nowrap;
      }
      .helixfast-switch {
        position: relative;
        display: inline-block;
        width: 26px;
        height: 14px;
        border-radius: 9px;
        background: #ccc;
        transition: background .15s ease;
        flex-shrink: 0;
        vertical-align: middle;
      }
      .helixfast-switch.on {
        background: #0f9d78;
      }
      .helixfast-switch-knob {
        position: absolute;
        top: 2px;
        left: 2px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #fff;
        transition: left .15s ease;
        box-shadow: 0 1px 2px rgba(0,0,0,.3);
      }
      .helixfast-switch.on .helixfast-switch-knob {
        left: 14px;
      }
    `;
    document.head.appendChild(style);
  }

  function applyHelixfastToggleVisual(li) {
    const sw = li.querySelector('.helixfast-switch');
    const link = li.querySelector('a');
    if (!sw || !link) return;
    const enabled = isHelixfastEnabled();
    sw.classList.toggle('on', enabled);
    link.title = enabled ? 'Helixfast đang BẬT — bấm để tắt' : 'Helixfast đang TẮT — bấm để bật';
  }

  function retryEnsureCustomPrintButtonsPlacement(attemptsLeft) {
    if (attemptsLeft === undefined) attemptsLeft = 20;
    ensureCustomPrintButtonsPlacement();
    if (document.getElementById(PRINT_OUTPATIENT_BTN_ID) && document.getElementById(PRINT_RX_BTN_ID)) return;
    if (attemptsLeft > 0) {
      setTimeout(() => retryEnsureCustomPrintButtonsPlacement(attemptsLeft - 1), 150);
    }
  }

  function handleHelixfastToggleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget && typeof e.currentTarget.blur === 'function') {
      e.currentTarget.blur();
    }
    const nowEnabled = !isHelixfastEnabled();
    setHelixfastEnabled(nowEnabled);
    const li = document.getElementById(HELIXFAST_TOGGLE_LI_ID);
    if (li) applyHelixfastToggleVisual(li);
    if (nowEnabled) {
      retryEnsureCustomPrintButtonsPlacement();
      setupRxReorder();
      const hsBtn = document.getElementById('his-hs-toggle-btn');
      if (hsBtn) hsBtn.style.display = '';
    } else {
      removePrintOutpatientButton();
      removePrintRxButton();
      removeRxControls();
      const hsPanel = document.getElementById('his-hs-panel') || document.querySelector('.his-hs-panel');
      if (hsPanel) hsPanel.style.display = 'none';
      const hsBtn = document.getElementById('his-hs-toggle-btn');
      if (hsBtn) hsBtn.style.display = 'none';
    }
  }

  function createHelixfastToggleLi(settingsLi) {
    const li = settingsLi.cloneNode(true);
    li.removeAttribute('id');
    li.id = HELIXFAST_TOGGLE_LI_ID;
    li.classList.remove('open');

    const link = li.querySelector('a') || li;
    link.removeAttribute('title');
    link.removeAttribute('data-toggle');
    link.innerHTML =
      '<span class="helixfast-logo">🧬</span>' +
      '<span class="helixfast-label">Helixfast v' + HELIXFAST_VERSION + '</span>' +
      '<span class="helixfast-switch"><span class="helixfast-switch-knob"></span></span>';
    link.addEventListener('click', handleHelixfastToggleClick);

    applyHelixfastToggleVisual(li);
    return li;
  }

  function ensureHelixfastToggleButton() {
    const settingsLink = document.querySelector(HELIXFAST_SETTINGS_LINK_SELECTOR);
    if (!settingsLink) return;
    const settingsLi = settingsLink.closest('li');
    if (!settingsLi) return;

    injectHelixfastToggleCss();

    let li = document.getElementById(HELIXFAST_TOGGLE_LI_ID);
    if (!li) {
      li = createHelixfastToggleLi(settingsLi);
    } else {
      applyHelixfastToggleVisual(li);
    }

    if (settingsLi.previousElementSibling !== li) {
      settingsLi.insertAdjacentElement('beforebegin', li);
    }
  }

  const observer = new MutationObserver(() => {
    ensureHelixfastToggleButton();
    if (!isHelixfastEnabled()) return;
    bindSymptomEl();
    scanForTreatmentTextareas();
    if (paginatorAutoSet && !document.querySelector('.p-paginator-rpp-options')) {
      paginatorAutoSet = false;
    }
    if (!paginatorAutoSet) trySetPaginatorTo100();
    tryCheckCompletedCheckbox();
    ensureCustomPrintButtonsPlacement();
    autoFocusSymptomFieldIfNew();
    setupRxReorder();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  ensureHelixfastToggleButton();
  if (isHelixfastEnabled()) {
    bindSymptomEl();
    scanForTreatmentTextareas();
    trySetPaginatorTo100();
    tryCheckCompletedCheckbox();
    ensureCustomPrintButtonsPlacement();
    focusSymptomFieldOnly();
    autoFocusSymptomFieldIfNew();
    setupRxReorder();
  }
})();

// ============================================================
// ===== HIS BVBD - Quick Select Cận lâm sàng (v2.1) =========
// ============================================================
// Ghép nguyên vẹn từ userscript riêng, chạy trong IIFE riêng, độc lập hoàn toàn
// với phần Helixfast phía trên. Tự nhận biết trang phù hợp qua getSearchInput()
// (ô #specify-search-kw) nên vẫn an toàn khi chạy trên toàn bộ
// his.benhvienbinhduong.org.vn — ở trang khác không có ô đó, injectToolbar()
// đơn giản không làm gì.
(function () {
    'use strict';

    const GROUPS = [
        { label: 'Glucose', color: '#2196a8',
          keywords: ['Định lượng Glucose [Máu]'] },

        { label: 'Mỡ máu', color: '#e65c00',
          keywords: [
              'Triglycerid (máu) [Máu]',
              'Cholesterol toàn phần (máu)',
              'Định lượng HDL-C (High density lipoprotein Cholesterol)'
          ] },

        { label: 'Điện giải + Ca ion hóa', color: '#0097a7',
          keywords: [
              'Điện giải đồ (Na, K, Cl) [Máu]',
              'Calci ion hoá [Máu]'
          ] },

        { label: 'HbA1c', color: '#8d6e63',
          keywords: ['HbA1c [Máu]'] },

        { label: 'CN Gan', color: '#7b3f9e',
          keywords: [
              'ALT (GPT) [Máu]',
              'AST (GOT) [Máu]',
              'GGT (Gama Glutamyl Transferase) [Máu]'
          ] },

        { label: 'CN Thận', color: '#1565c0',
          keywords: [
              'Urê máu [Máu]',
              'Định lượng Creatinin (máu)'
          ] },

        { label: 'Acid Uric', color: '#00695c',
          keywords: ['Định lượng Acid Uric [Máu]'] },

        { label: 'Canxi TP', color: '#37474f',
          keywords: ['Định lượng Canxi toàn phần [Máu]'] },

        { label: 'Đông cầm máu', color: '#ad1457',
          keywords: [
              'Thời gian máu chảy phương pháp Duke',
              'Xét nghiệm đông máu nhanh tại giường'
          ] },

        { label: 'CTM', color: '#c62828',
          keywords: ['Tổng phân tích tế bào máu ngoại vi'] },

        { label: 'PT Nước tiểu', color: '#558b2f',
          keywords: ['Tổng phân tích nước tiểu (Bằng máy tự động)'] },

        { label: 'Viêm gan B/C', color: '#4527a0',
          sub: [
              { label: 'HBsAg test nhanh', keywords: ['HBsAg test nhanh'] },
              { label: 'HCV Ab test nhanh', keywords: ['HCV Ab test nhanh'] },
              { label: 'Cả 2 (HBsAg + HCV Ab)', keywords: ['HBsAg test nhanh', 'HCV Ab test nhanh'] }
          ] },

        { label: 'Test nhanh HIV', color: '#b71c1c',
          keywords: ['HIV Ab test nhanh'] },

        { label: 'Sốt xuất huyết', color: '#f57f17',
          sub: [
              { label: 'NS1Ag test nhanh', keywords: ['Dengue virus NS1Ag test nhanh'] },
              { label: 'IgM/IgG test nhanh', keywords: ['Dengue virus IgM/IgG test nhanh'] }
          ] },

        { label: 'Nhóm máu ABO', color: '#4e342e',
          keywords: ['Định nhóm máu hệ ABO (Kỹ thuật phiến đá)'] },
    ];

    const TOOLBAR_ID = 'cls_qs_toolbar';
    const STATUS_ID = 'cls_qs_status';
    const OVERLAY_ID = 'cls_qs_overlay';
    const OVERLAY_STYLE_ID = 'cls_qs_overlay_style';

    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    function injectOverlayCss() {
        if (document.getElementById(OVERLAY_STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = OVERLAY_STYLE_ID;
        style.textContent = `
            #${OVERLAY_ID} {
                position: fixed;
                inset: 0;
                z-index: 2147483647;
                background: rgba(20, 24, 31, 0.28);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: wait;
            }
            #${OVERLAY_ID} .cls-qs-box {
                background: #fff;
                border-radius: 10px;
                padding: 18px 26px;
                box-shadow: 0 10px 30px rgba(0,0,0,.28);
                display: flex;
                align-items: center;
                gap: 12px;
                font-size: 14px;
                font-weight: 600;
                color: #1c1f26;
                min-width: 220px;
            }
            #${OVERLAY_ID} .cls-qs-spinner {
                width: 18px;
                height: 18px;
                border-radius: 50%;
                border: 3px solid #cfd6e0;
                border-top-color: #1a56db;
                animation: cls-qs-spin 0.7s linear infinite;
                flex-shrink: 0;
            }
            #${OVERLAY_ID}.cls-qs-done .cls-qs-spinner {
                border: none;
                background: #0f9d78;
                animation: none;
                position: relative;
            }
            #${OVERLAY_ID}.cls-qs-done .cls-qs-spinner::after {
                content: '✓';
                position: absolute;
                inset: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #fff;
                font-size: 12px;
            }
            #${OVERLAY_ID} .cls-qs-text {
                white-space: pre-line;
            }
            @keyframes cls-qs-spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    function showOverlay(text) {
        injectOverlayCss();
        let ov = document.getElementById(OVERLAY_ID);
        if (!ov) {
            ov = document.createElement('div');
            ov.id = OVERLAY_ID;
            ov.innerHTML = '<div class="cls-qs-box"><div class="cls-qs-spinner"></div><div class="cls-qs-text"></div></div>';
            document.body.appendChild(ov);
        }
        ov.classList.remove('cls-qs-done');
        ov.querySelector('.cls-qs-text').textContent = text;
        return ov;
    }

    function overlaySetText(text) {
        const ov = document.getElementById(OVERLAY_ID);
        if (ov) ov.querySelector('.cls-qs-text').textContent = text;
    }

    function hideOverlayWithSuccess(text, delay) {
        const ov = document.getElementById(OVERLAY_ID);
        if (!ov) return;
        ov.classList.add('cls-qs-done');
        ov.querySelector('.cls-qs-text').textContent = text;
        setTimeout(() => {
            const el = document.getElementById(OVERLAY_ID);
            if (el) el.remove();
        }, delay === undefined ? 700 : delay);
    }

    function hideOverlayNow() {
        const ov = document.getElementById(OVERLAY_ID);
        if (ov) ov.remove();
    }

    function getSearchInput() {
        return document.getElementById('specify-search-kw');
    }

    function getSearchForm() {
        const input = getSearchInput();
        return input ? input.closest('form') : null;
    }

    function getSearchSubmitBtn() {
        const form = getSearchForm();
        return form ? form.querySelector('button[type="submit"]') : null;
    }

    function getTable() {
        const wrapper = document.querySelector('.ui-table-wrapper');
        return wrapper ? wrapper.querySelector('table') : null;
    }

    function getTheadRow() {
        const table = getTable();
        if (!table) return null;
        const thead = table.querySelector('thead');
        return thead ? thead.querySelector('tr') : null;
    }

    function getRows() {
        const table = getTable();
        if (!table) return [];
        const tbody = table.querySelector('tbody');
        if (!tbody) return [];
        return Array.from(tbody.querySelectorAll('tr'));
    }

    function getServiceNameCell(row) {
        return Array.from(row.querySelectorAll('td')).find(td => /^\s*\[/.test(td.textContent || ''));
    }

    function getServiceName(row) {
        const cell = getServiceNameCell(row);
        return cell ? cell.textContent.trim() : '';
    }

    function getHeaderIndex(headerText) {
        const headRow = getTheadRow();
        if (!headRow) return -1;
        const ths = Array.from(headRow.children);
        for (let i = 0; i < ths.length; i++) {
            const txt = (ths[i].textContent || '').trim();
            if (txt.includes(headerText)) return i;
        }
        return -1;
    }

    function getAddButton(row) {
        return row.querySelector('.btn-add-to-list-specify');
    }

    function getRemoveButton(row) {
        const icon = row.querySelector('i.fa-minus-circle');
        return icon ? icon.closest('button') : null;
    }

    function getOrderedCount(row) {
        const idx = getHeaderIndex('Đã chỉ định');
        if (idx === -1) return 0;
        const cells = row.querySelectorAll('td');
        const cell = cells[idx];
        if (!cell) return 0;
        const n = parseInt((cell.textContent || '0').trim(), 10);
        return isNaN(n) ? 0 : n;
    }

    function setNativeInputValue(input, value) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function waitForTableRefresh(timeout = 4000) {
        const wrapper = document.querySelector('.ui-table-wrapper');
        if (!wrapper) return sleep(300);
        return new Promise(resolve => {
            let done = false;
            let debounceTimer = null;
            const finish = () => {
                if (done) return;
                done = true;
                observer.disconnect();
                resolve();
            };
            const observer = new MutationObserver(() => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(finish, 250);
            });
            observer.observe(wrapper, { childList: true, subtree: true });
            debounceTimer = setTimeout(finish, 350);
            setTimeout(finish, timeout);
        });
    }

    async function searchKeyword(keyword) {
        const input = getSearchInput();
        const submitBtn = getSearchSubmitBtn();
        if (!input || !submitBtn) return false;
        setNativeInputValue(input, keyword);
        await sleep(80);
        submitBtn.click();
        await waitForTableRefresh();
        return true;
    }

    function findBestMatchingRow(keyword) {
        const rows = getRows();
        const kwLower = keyword.trim().toLowerCase();
        let exact = null;
        let contains = null;
        for (const row of rows) {
            const name = getServiceName(row).toLowerCase();
            if (!name) continue;
            if (!exact && name.includes('] ' + kwLower)) exact = row;
            if (!contains && name.includes(kwLower)) contains = row;
        }
        return exact || contains || null;
    }

    function findConfirmDialog() {
        const candidates = document.querySelectorAll('.modal, .p-dialog, [role="dialog"], .ui-dialog');
        for (const d of candidates) {
            if (d.offsetParent === null) continue;
            const txt = d.textContent || '';
            if (/xác nhận/i.test(txt)) return d;
        }
        return null;
    }

    function getDialogButton(dialog, pattern) {
        return Array.from(dialog.querySelectorAll('button')).find(b => pattern.test(b.textContent || ''));
    }

    async function dismissDialogIfAny() {
        await sleep(250);
        const dialog = findConfirmDialog();
        if (!dialog) return null;
        const text = dialog.textContent || '';
        const already = /đã có trong phiếu/i.test(text);
        const cancelBtn = getDialogButton(dialog, /Thoát|Hủy|Đóng|Cancel/i);
        if (cancelBtn) {
            cancelBtn.click();
            await sleep(200);
        }
        return already ? 'already' : 'other';
    }

    async function locateKeyword(keyword) {
        const ok = await searchKeyword(keyword);
        if (!ok) return null;
        const row = findBestMatchingRow(keyword);
        if (!row) return null;
        return { count: getOrderedCount(row) };
    }

    function freshRow(keyword) {
        return findBestMatchingRow(keyword);
    }

    async function setKeywordCount(keyword, currentCount, targetCount) {
        let count = currentCount;
        let guard = 0;

        while (count < targetCount && guard < 6) {
            const row = freshRow(keyword);
            if (!row) break;
            const addBtn = getAddButton(row);
            if (!addBtn || addBtn.disabled) break;
            addBtn.click();

            const dialogResult = await dismissDialogIfAny();
            if (dialogResult === 'already') {
                count = Math.max(count, 1);
                break;
            }

            await sleep(400);
            const rowAfter = freshRow(keyword);
            count = rowAfter ? getOrderedCount(rowAfter) : count;
            guard++;
        }

        guard = 0;
        while (count > targetCount && guard < 6) {
            const row = freshRow(keyword);
            if (!row) break;
            const removeBtn = getRemoveButton(row);
            if (!removeBtn || removeBtn.disabled) break;
            removeBtn.click();

            await dismissDialogIfAny();
            await sleep(400);
            const rowAfter = freshRow(keyword);
            count = rowAfter ? getOrderedCount(rowAfter) : count;
            guard++;
        }

        return count;
    }

    function setStatus(text) {
        const el = document.getElementById(STATUS_ID);
        if (el) el.textContent = text;
    }

    function setToolbarDisabled(disabled) {
        const toolbar = document.getElementById(TOOLBAR_ID);
        if (!toolbar) return;
        toolbar.querySelectorAll('button').forEach(b => (b.disabled = disabled));
    }

    function setBtnActive(btn, color, active) {
        const orig = btn.dataset.origLabel;
        if (active) {
            btn.textContent = '✓ ' + orig;
            btn.style.background = '#fff';
            btn.style.color = color;
            btn.style.border = '2px solid ' + color;
            btn.style.padding = '2px 8px';
        } else {
            btn.textContent = orig;
            btn.style.background = color;
            btn.style.color = '#fff';
            btn.style.border = 'none';
            btn.style.padding = '4px 10px';
        }
    }

    async function toggleGroup(label, keywords, btn, color) {
        setStatus(`Đang kiểm tra nhóm "${label}"...`);
        setToolbarDisabled(true);
        showOverlay(`Đang chọn "${label}", vui lòng chờ...`);

        const located = [];
        let allActive = true;
        for (const kw of keywords) {
            setStatus(`[${label}] Đang dò: ${kw}`);
            overlaySetText(`Đang dò "${label}"\n${kw}`);
            const info = await locateKeyword(kw);
            if (!info) {
                located.push({ kw, found: false, count: 0 });
                allActive = false;
                continue;
            }
            located.push({ kw, found: true, count: info.count });
            if (info.count < 1) allActive = false;
        }

        const target = allActive ? 0 : 1;
        const action = allActive ? 'Đang bỏ chọn' : 'Đang chọn';

        let okCount = 0;
        let missed = [];
        for (const item of located) {
            if (!item.found) { missed.push(item.kw); continue; }
            setStatus(`[${label}] ${action}: ${item.kw}`);
            overlaySetText(`${action} "${label}"\n${item.kw}`);
            const ok = await searchKeyword(item.kw);
            if (!ok) { missed.push(item.kw); continue; }
            const finalCount = await setKeywordCount(item.kw, item.count, target);
            if (finalCount === target) okCount++;
            else missed.push(item.kw);
        }

        setToolbarDisabled(false);

        if (btn) setBtnActive(btn, color, target === 1 && missed.length === 0);

        if (missed.length === 0) {
            const doneMsg = target === 1
                ? `Đã CHỌN nhóm "${label}" (${okCount}/${keywords.length}).`
                : `Đã BỎ CHỌN nhóm "${label}" (${okCount}/${keywords.length}).`;
            setStatus(doneMsg);
            hideOverlayWithSuccess(target === 1 ? 'Đã chọn xong!' : 'Đã bỏ chọn xong!');
        } else {
            const errMsg = `Nhóm "${label}": xong ${okCount}, lỗi/không tìm thấy: ${missed.join(', ')}`;
            setStatus(errMsg);
            hideOverlayWithSuccess('Xong, nhưng có mục lỗi — xem dòng trạng thái.', 1400);
        }

        return target === 1 && missed.length === 0;
    }

    function makeBaseBtn(label, color) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = label;
        btn.dataset.origLabel = label;
        Object.assign(btn.style, {
            padding: '4px 10px', fontSize: '12px', fontWeight: '600',
            color: '#fff', background: color, border: 'none',
            borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap',
            transition: 'opacity 0.15s',
        });
        btn.addEventListener('mouseenter', () => (btn.style.opacity = '0.85'));
        btn.addEventListener('mouseleave', () => (btn.style.opacity = '1'));
        return btn;
    }

    function makeGroupBtn(label, color, keywords) {
        const btn = makeBaseBtn(label, color);
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await toggleGroup(label, keywords, btn, color);
        });
        return btn;
    }

    function updateSubMenuParentState(group, parentBtn) {
        const anyActive = group.sub.some((o) => o.active);
        const orig = group.label + ' ▾';
        if (anyActive) {
            parentBtn.textContent = '✓ ' + orig;
            parentBtn.style.background = '#fff';
            parentBtn.style.color = group.color;
            parentBtn.style.border = '2px solid ' + group.color;
            parentBtn.style.padding = '2px 8px';
        } else {
            parentBtn.textContent = orig;
            parentBtn.style.background = group.color;
            parentBtn.style.color = '#fff';
            parentBtn.style.border = 'none';
            parentBtn.style.padding = '4px 10px';
        }
    }

    function makeSubMenuBtn(group) {
        const btn = makeBaseBtn(group.label + ' ▾', group.color);
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const menuId = 'cls_submenu_' + group.label;
            const existing = document.getElementById(menuId);
            if (existing) { existing.remove(); return; }

            const menu = document.createElement('div');
            menu.id = menuId;
            Object.assign(menu.style, {
                position: 'fixed', zIndex: '2147483647',
                background: '#fff', border: '1px solid #bbb',
                borderRadius: '6px', boxShadow: '0 4px 14px rgba(0,0,0,.22)',
                padding: '6px', display: 'flex', flexDirection: 'column',
                gap: '5px', minWidth: '200px'
            });

            group.sub.forEach(opt => {
                const optBtn = makeBaseBtn(opt.label, group.color);
                optBtn.style.textAlign = 'left';
                optBtn.style.width = '100%';
                // Khôi phục trạng thái đã chọn/bỏ chọn từ lần trước, vì menu này
                // bị tạo lại từ đầu mỗi lần mở, không tự nhớ trạng thái.
                setBtnActive(optBtn, group.color, !!opt.active);
                optBtn.addEventListener('click', async (e2) => {
                    e2.preventDefault(); e2.stopPropagation();
                    // Không đóng menu ngay — chờ xử lý xong để người dùng thấy dấu ✓
                    // trước khi menu tự đóng khi click ra ngoài.
                    menu.querySelectorAll('button').forEach((b) => (b.disabled = true));
                    const isActive = await toggleGroup(opt.label, opt.keywords, optBtn, group.color);
                    opt.active = isActive;
                    menu.querySelectorAll('button').forEach((b) => (b.disabled = false));
                    updateSubMenuParentState(group, btn);
                });
                menu.appendChild(optBtn);
            });

            const rect = btn.getBoundingClientRect();
            menu.style.top = (rect.bottom + 4) + 'px';
            menu.style.left = rect.left + 'px';
            document.body.appendChild(menu);

            setTimeout(() => {
                document.addEventListener('click', function closer(ev) {
                    if (!menu.contains(ev.target) && ev.target !== btn) {
                        menu.remove();
                        document.removeEventListener('click', closer);
                    }
                }, true);
            }, 0);
        });
        return btn;
    }

    function injectToolbar() {
        if (document.getElementById(TOOLBAR_ID)) return;
        const searchForm = getSearchForm();
        if (!searchForm) return;

        const header = document.querySelector('.ui-widget-header');
        if (!header || !header.parentNode) return;

        const toolbar = document.createElement('div');
        toolbar.id = TOOLBAR_ID;
        Object.assign(toolbar.style, {
            display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center',
            padding: '6px 10px', background: '#eef2f7', borderBottom: '1px solid #c8d3e0',
        });

        const label = document.createElement('span');
        label.textContent = '⚡ Chọn nhanh:';
        Object.assign(label.style, {
            fontSize: '11px', fontWeight: '700', color: '#555',
            marginRight: '4px', whiteSpace: 'nowrap',
        });
        toolbar.appendChild(label);

        GROUPS.forEach(g => {
            if (g.sub) {
                toolbar.appendChild(makeSubMenuBtn(g));
            } else {
                toolbar.appendChild(makeGroupBtn(g.label, g.color, g.keywords));
            }
        });

        const status = document.createElement('span');
        status.id = STATUS_ID;
        Object.assign(status.style, {
            marginLeft: '10px', fontSize: '11px', color: '#333', fontStyle: 'italic',
        });
        toolbar.appendChild(status);

        header.parentNode.insertBefore(toolbar, header.nextSibling);
    }

    const clsQsMainObserver = new MutationObserver(() => {
        if (getSearchInput() && !document.getElementById(TOOLBAR_ID)) {
            injectToolbar();
        }
        if (!getSearchInput() && document.getElementById(TOOLBAR_ID)) {
            document.getElementById(TOOLBAR_ID).remove();
        }
    });
    clsQsMainObserver.observe(document.body, { childList: true, subtree: true });

    setTimeout(injectToolbar, 1000);

})();
