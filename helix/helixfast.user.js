// ==UserScript==
// @name         HIS Bình Dương - Tiện ích Helix
// @namespace    https://his.benhvienbinhduong.org.vn/
// @version      2.0
// @description  Tiện ích Helix
// @match        https://his.benhvienbinhduong.org.vn/*
// @run-at       document-idle
// @grant        none
// @updateURL    https://raw.githubusercontent.com/bsdha/bsdha.github.io/refs/heads/main/helix/helixfast.meta.js
// @downloadURL  https://raw.githubusercontent.com/bsdha/bsdha.github.io/refs/heads/main/helix/helixfast.user.js
// ==/UserScript==

/* ==ChangeLog==
2.0 | 2026-09-15 | Sau khi đã tạo bệnh sử (nhanh khi Enter, hoặc từ popup nâng cao), cơ chế đồng bộ Triệu chứng → Diễn biến sẽ tự khoá lại, để gõ thêm vào ô Triệu chứng không ghi đè mất câu bệnh sử vừa tạo. Khoá tự mở lại khi ô Diễn biến trống trở lại.
1.9 | 2026-09-15 | (1) Khi Enter từ ô "Lý do khám", ngoài việc nhảy xuống ô tìm ICD như cũ, script tự sinh 1 câu bệnh sử ngắn từ đúng nội dung đã gõ và điền vào ô Diễn biến/Bệnh sử (không tự bịa thêm chi tiết y khoa nào). Thêm nút "Đổi cách diễn đạt bệnh sử" để tạo lại câu khác từ cùng nội dung đã gõ. (2) Ở "Tạo bệnh sử nâng cao", khi bấm "Chèn vào bệnh sử", ô "Lý do khám" giờ luôn được thay bằng từ khoá ngắn phù hợp với lý do đã chọn (trước đây chỉ điền khi ô đang trống).
1.8 | 2026-09-15 | Sửa lỗi kiểm tra sinh hiệu báo thiếu "Cân nặng" dù đã điền đủ: trước đây script đọc giá trị bằng textContent nên bỏ sót các ô sinh hiệu hiển thị dưới dạng input (rỗng khi đọc bằng textContent); giờ đọc đúng value của input/select nếu có.
1.7 | 2026-09-15 | Sửa "Tạo bệnh sử nâng cao": nút Chèn giờ chỉ điền vào ô Bệnh sử (giữ nguyên Lý do khám nếu đã gõ tay, tự điền ngắn gọn 1-2 từ khoá triệu chứng nếu ô đang trống); sửa lỗi popup bị nhảy sang trái khi bấm nút đóng lần đầu.
1.6 | 2026-09-15 | Thêm "Tạo bệnh sử nâng cao": popup kéo-thả cạnh ô Triệu chứng với thư viện 17 lý do vào viện, mỗi lý do có bộ trường khai thác riêng; script chỉ ghép câu từ dữ liệu đã chọn (không tự bịa triệu chứng/xử trí), có nút tạo lại để đổi cách diễn đạt và chèn thẳng vào ô Triệu chứng.
1.5 | 2026-09-14 | Bổ sung cơ chế tự động cập nhật qua Tampermonkey (script tự kiểm tra và báo/cài bản mới, không cần tải lại thủ công).
1.4 |  | Hoàn thiện bộ tự động hoá thao tác nhập bệnh án trên Helix: đồng bộ Triệu chứng ↔ Diễn biến, mở rộng ô tìm ICD-10, cảnh báo trùng mã ICD, kiểm tra đủ sinh hiệu trước khi bắt đầu khám, tự bấm "Bắt đầu khám" và focus ô triệu chứng, tự chọn sẵn thuốc đầu tiên trong danh sách nhà thuốc, nút xử lý nhanh trong ô y lệnh/điều trị, điều hướng Tab thông minh, tự bấm nút "Nạp", tự chạy các bước trong hộp thoại lưu.
==/ChangeLog== */

(function () {
  'use strict';

  const SYMPTOM_SELECTOR = 'textarea[formcontrolname="symptom"]';
  const PROGRESSION_SELECTOR = 'textarea[formcontrolname="progression"]';
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

  // ---- Bệnh sử nhanh từ nội dung gõ tay ở "Lý do khám" ----
  // Chỉ bọc câu quanh đúng nội dung người dùng đã gõ, không tự thêm chi tiết y khoa nào.
  let hsQuickVariantIndex = 0;
  let hsQuickLastText = '';

  function hsQuickVariants(text) {
    return [
      `Bệnh nhân đến khám vì ${text}, đến khám tại ${HS_DEST}.`,
      `Ghi nhận bệnh nhân ${text}, nên đến khám tại ${HS_DEST}.`,
      `Bệnh nhân vào viện với lý do: ${text}. Đến khám tại ${HS_DEST}.`,
    ];
  }

  // Khi ô Diễn biến đang chứa 1 bệnh sử đã được tạo (nhanh hoặc nâng cao), khoá
  // đồng bộ Triệu chứng → Diễn biến lại để gõ thêm ở Triệu chứng không ghi đè mất
  // câu bệnh sử đó. Khoá tự mở lại khi ô Diễn biến trống trở lại.
  let hsProgressionLocked = false;

  function hsApplyQuickVariant(text, index) {
    const progressionEl = document.querySelector(PROGRESSION_SELECTOR);
    if (!progressionEl) return;
    const variants = hsQuickVariants(text);
    setNativeValue(progressionEl, variants[index % variants.length]);
    hsProgressionLocked = true;
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

  function focusIcdInput() {
    const tryFocus = (attemptsLeft) => {
      const icdInput = document.querySelector(ICD_INPUT_SELECTOR);
      if (icdInput) {
        icdInput.focus();
        setTimeout(() => closeIcdDropdownIfEmpty(icdInput), 0);
        return;
      }
      if (attemptsLeft > 0) {
        setTimeout(() => tryFocus(attemptsLeft - 1), 100);
      }
    };
    tryFocus(10);
  }

  function onSymptomInput(e) {
    syncToProgression(e.target);
  }

  function onSymptomKeydown(e) {
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

  document.addEventListener(
    'mouseover',
    (e) => updateOverflowTitle(e.target),
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
        background: #1c1f26;
        color: #eafffb;
        border-radius: 8px;
        box-shadow: 0 6px 24px rgba(0,0,0,.35);
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
      .his-hs-label { font-size: 11px; color: #9fd8c9; margin-top: 4px; }
      .his-hs-row { display: flex; flex-direction: column; gap: 2px; }
      .his-hs-field {
        width: 100%;
        box-sizing: border-box;
        background: #262b35;
        color: #eafffb;
        border: 1px solid #3a4150;
        border-radius: 4px;
        padding: 5px 6px;
        font-size: 12px;
      }
      .his-hs-preview {
        width: 100%;
        box-sizing: border-box;
        background: #262b35;
        color: #eafffb;
        border: 1px solid #3a4150;
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
        border: 1px solid #3a4150;
        background: #262b35;
        color: #eafffb;
        cursor: pointer;
      }
      .his-hs-btn-primary {
        border-color: #0f9d78;
        background: #0f9d78;
        color: #fff;
        font-weight: 600;
      }
    `;
    document.head.appendChild(style);
  }

  injectIcdWideningCss();

  document.addEventListener(
    'focus',
    (e) => {
      if (e.target && e.target.matches && e.target.matches(ICD_INPUT_SELECTOR)) {
        setTimeout(() => closeIcdDropdownIfEmpty(e.target), 0);
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
      if (input) setTimeout(() => closeIcdDropdownIfEmpty(input), 0);
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
          setTimeout(() => closeIcdDropdownIfEmpty(nextInput), 0);
        } else {
          const addBtn = findAddIcdRowButton();
          if (addBtn) {
            const countBefore = icdInputs.length;
            addBtn.click();
            waitForNewIcdInput(countBefore, (newInput) => {
              newInput.focus();
              setTimeout(() => closeIcdDropdownIfEmpty(newInput), 0);
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

  const START_EXAM_BUTTON_SELECTOR = 'button[data-sk="control.T"]';
  const START_EXAM_MIN_DELAY_MS = 800;
  const VITALS_WAIT_TIMEOUT_MS = 3000;

  function focusSymptomFieldOnly(attemptsLeft) {
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

  const REQUIRED_VITAL_LABELS = ['Huyết áp', 'Mạch', 'Cân nặng', 'Nhiệt độ', 'Nhịp thở'];

  function getVitalCellText(td) {
    if (!td) return '';
    const control = td.querySelector('input, select, textarea');
    if (control) return (control.value || '').replace(/\s+/g, ' ').trim();
    return td.textContent.replace(/\s+/g, ' ').trim();
  }

  function getVitalSignsMap() {
    const table = document.querySelector('app-vital-sign table.vital-sign');
    const map = {};
    if (!table) return map;
    table.querySelectorAll('tr').forEach((tr) => {
      const tds = Array.from(tr.children);
      for (let i = 0; i < tds.length; i += 2) {
        const label = getVitalCellText(tds[i]);
        const value = getVitalCellText(tds[i + 1]);
        if (label) map[label] = value;
      }
    });
    return map;
  }

  function getMissingVitalFields() {
    const map = getVitalSignsMap();
    return REQUIRED_VITAL_LABELS.filter((label) => {
      const value = map[label];
      return !value || !/\d/.test(value);
    });
  }

  function showVitalsWarning(missingFields) {
    alert(
      'Chưa điền đủ DHST (dấu hiệu sinh tồn), còn thiếu: ' +
        missingFields.join(', ') +
        '.\nVẫn tiến hành bấm "Bắt đầu khám", vui lòng bổ sung sau.'
    );
  }

  function waitForVitalsLoaded(onLoaded, onTimeout, elapsed) {
    if (elapsed === undefined) elapsed = 0;
    const missing = getMissingVitalFields();
    if (missing.length === 0) {
      onLoaded();
      return;
    }
    if (elapsed >= VITALS_WAIT_TIMEOUT_MS) {
      onTimeout(missing);
      return;
    }
    setTimeout(() => waitForVitalsLoaded(onLoaded, onTimeout, elapsed + 150), 150);
  }

  function clickStartExamIfPresent() {
    const btn = document.querySelector(START_EXAM_BUTTON_SELECTOR);
    if (btn && !btn.disabled) {
      const label = btn.textContent.replace(/\s+/g, ' ').trim();
      if (label === 'Bắt đầu khám') {
        btn.click();
        setTimeout(() => focusSymptomFieldOnly(), 500);
        return;
      }
    }
    focusSymptomFieldOnly();
  }

  function tryClickStartExamThenFocusSymptom() {
    waitForVitalsLoaded(
      () => clickStartExamIfPresent(),
      (missingFields) => {
        showVitalsWarning(missingFields);
        clickStartExamIfPresent();
      }
    );
  }

  document.addEventListener(
    'dblclick',
    (e) => {
      const row = e.target.closest && e.target.closest('tr.cur-pointer');
      if (!row) return;
      setTimeout(() => tryClickStartExamThenFocusSymptom(), START_EXAM_MIN_DELAY_MS);
    },
    true
  );

  function getVisiblePharmacyItems(menuEl) {
    return Array.from(menuEl.querySelectorAll(':scope > .item')).filter(
      (el) => el.offsetParent !== null
    );
  }

  function ensureFirstPharmacyItemSelected(menuEl) {
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
        setNativeValue(textarea, label);
      });
      wrapper.appendChild(btn);
    });

    textarea.insertAdjacentElement('afterend', wrapper);
  }

  function scanForTreatmentTextareas() {
    findTreatmentTextareas().forEach((textarea) => {
      setupTreatmentButtons(textarea);
      if (!textarea.value || textarea.value.trim() === '') {
        setNativeValue(textarea, TREATMENT_DEFAULT_VALUE);
      }
    });
  }

  // ===================== TẠO BỆNH SỬ NÂNG CAO =====================
  // Thư viện lý do vào viện, mỗi lý do có bộ trường khai thác riêng.
  // Nguyên tắc: chỉ ghép câu từ dữ liệu người dùng đã chọn — không tự
  // suy diễn/khẳng định triệu chứng, dấu hiệu hay xử trí nào chưa được chọn.
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

  // key: nhãn hiển thị + các trường đặc thù (vitri/tinhchat/lan/kemtheo)
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

  // Sinh câu từ dữ liệu đã chọn — bỏ qua hoàn toàn phần nào chưa chọn (không suy diễn).
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
    const kemtheoClause = values.kemtheo && values.kemtheo !== 'không kèm triệu chứng khác'
      ? ` Kèm theo ${values.kemtheo}.`
      : (values.kemtheo === 'không kèm triệu chứng khác' ? ' Không ghi nhận triệu chứng kèm theo khác.' : '');
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

  function setupHistoryPopup(symptomEl) {
    if (document.getElementById('his-hs-toggle-btn')) return;

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.id = 'his-hs-toggle-btn';
    toggleBtn.className = 'his-hs-toggle-btn';
    toggleBtn.textContent = '🩺 Tạo bệnh sử nâng cao';
    symptomEl.insertAdjacentElement('afterend', toggleBtn);

    // Nút đổi cách diễn đạt cho "bệnh sử nhanh" (sinh tự động khi Enter ở Lý do khám)
    const quickBtn = document.createElement('button');
    quickBtn.type = 'button';
    quickBtn.id = 'his-hs-quick-btn';
    quickBtn.className = 'his-hs-toggle-btn';
    quickBtn.style.marginLeft = '6px';
    quickBtn.style.borderColor = '#1a56db';
    quickBtn.style.color = '#1a56db';
    quickBtn.textContent = '🔁 Đổi cách diễn đạt bệnh sử';
    toggleBtn.insertAdjacentElement('afterend', quickBtn);

    quickBtn.addEventListener('click', () => {
      const text = symptomEl.value.trim();
      if (!text) {
        alert('Vui lòng gõ nội dung ở ô Lý do khám trước.');
        return;
      }
      if (text !== hsQuickLastText) {
        hsQuickLastText = text;
        hsQuickVariantIndex = 0;
      }
      hsApplyQuickVariant(text, hsQuickVariantIndex);
      hsQuickVariantIndex++;
    });

    const panel = document.createElement('div');
    panel.id = 'his-hs-panel';
    panel.className = 'his-hs-panel';
    panel.style.display = 'none';
    panel.innerHTML =
      '<div class="his-hs-header" id="his-hs-drag-handle">🩺 Tạo bệnh sử nâng cao <span class="his-hs-close" id="his-hs-close-btn">✕</span></div>' +
      '<div class="his-hs-body">' +
      '<label class="his-hs-label">Lý do vào viện</label>' +
      '<select id="his-hs-reason" class="his-hs-field"></select>' +
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

    const reasonSel = panel.querySelector('#his-hs-reason');
    HS_REASON_ORDER.forEach((key) => {
      const o = document.createElement('option');
      o.value = key;
      o.textContent = HS_REASON_LABELS[key];
      reasonSel.appendChild(o);
    });

    const fieldsWrap = panel.querySelector('#his-hs-fields');
    const preview = panel.querySelector('#his-hs-preview');
    let variantCounter = 0;

    function fieldRow(labelText, selectEl) {
      const row = document.createElement('div');
      row.className = 'his-hs-row';
      const lbl = document.createElement('label');
      lbl.className = 'his-hs-label';
      lbl.textContent = labelText;
      row.appendChild(lbl);
      row.appendChild(selectEl);
      return row;
    }

    function renderFields() {
      fieldsWrap.innerHTML = '';
      const key = reasonSel.value;
      variantCounter = 0;

      if (key === 'khac') {
        const ta = document.createElement('textarea');
        ta.className = 'his-hs-field';
        ta.id = 'hs-f-freetext';
        ta.rows = 3;
        ta.placeholder = 'Nhập lý do vào viện...';
        fieldsWrap.appendChild(fieldRow('Nội dung', ta));
        return;
      }

      if (key === 'tai_kham') {
        fieldsWrap.appendChild(fieldRow('Bệnh nền đang theo dõi', hsMakeSelect('hs-f-benhnen', HS_TAIKHAM.benhnen)));
        fieldsWrap.appendChild(fieldRow('Tình trạng hiện tại', hsMakeSelect('hs-f-tinhtrang', HS_TAIKHAM.tinhtrang)));
        fieldsWrap.appendChild(fieldRow('Đáp ứng điều trị', hsMakeSelect('hs-f-dapung', HS_TAIKHAM.dapung)));
        return;
      }

      const def = HS_REASONS[key];
      fieldsWrap.appendChild(fieldRow('Thời gian', hsMakeSelect('hs-f-thoigian', HS_COMMON.thoigian)));
      if (def.vitri) fieldsWrap.appendChild(fieldRow('Vị trí / hoàn cảnh', hsMakeSelect('hs-f-vitri', def.vitri)));
      if (def.tinhchat) fieldsWrap.appendChild(fieldRow('Tính chất', hsMakeSelect('hs-f-tinhchat', def.tinhchat)));
      fieldsWrap.appendChild(fieldRow('Mức độ', hsMakeSelect('hs-f-mucdo', HS_COMMON.mucdo)));
      if (def.lan) fieldsWrap.appendChild(fieldRow('Đặc điểm thêm', hsMakeSelect('hs-f-lan', def.lan)));
      if (def.kemtheo) fieldsWrap.appendChild(fieldRow('Kèm theo', hsMakeSelect('hs-f-kemtheo', def.kemtheo)));
      fieldsWrap.appendChild(fieldRow('Diễn tiến', hsMakeSelect('hs-f-dienbien', HS_COMMON.dienbien)));
      fieldsWrap.appendChild(fieldRow('Xử trí trước viện', hsMakeSelect('hs-f-xutri', HS_COMMON.xutri)));
    }

    function collectValues() {
      const values = {};
      panel.querySelectorAll('#his-hs-fields [id^="hs-f-"]').forEach((el) => {
        values[el.id.replace('hs-f-', '')] = el.value;
      });
      return values;
    }

    function generate() {
      const key = reasonSel.value;
      const values = collectValues();
      const text = hsBuildSentence(key, values, variantCounter);
      preview.value = text;
      variantCounter++;
    }

    reasonSel.addEventListener('change', renderFields);
    panel.querySelector('#his-hs-gen').addEventListener('click', generate);
    panel.querySelector('#his-hs-insert').addEventListener('click', () => {
      const text = preview.value.trim();
      if (!text) return;

      // Luôn thay "Lý do khám" (ô symptom) bằng từ khoá ngắn phù hợp với lý do đã chọn,
      // dù ô đó đã có nội dung hay chưa.
      if (symptomEl) {
        const key = reasonSel.value;
        let shortLabel = '';
        if (key === 'khac') {
          const ft = document.getElementById('hs-f-freetext');
          shortLabel = ft && ft.value ? ft.value.trim().split(/\s+/).slice(0, 2).join(' ') : '';
        } else if (key === 'tai_kham') {
          shortLabel = 'tái khám';
        } else if (HS_REASONS[key]) {
          shortLabel = HS_REASONS[key].label;
        }
        if (shortLabel) setNativeValue(symptomEl, shortLabel);
      }

      // Bệnh sử luôn nhận câu đầy đủ vừa tạo — chèn sau cùng để không bị ghi đè
      // bởi cơ chế đồng bộ Triệu chứng → Diễn biến ở trên.
      const progressionEl = document.querySelector(PROGRESSION_SELECTOR);
      if (progressionEl) {
        setNativeValue(progressionEl, text);
        hsProgressionLocked = true;
      } else {
        setNativeValue(symptomEl, text);
      }
    });
    panel.querySelector('#his-hs-reset').addEventListener('click', () => {
      renderFields();
      preview.value = '';
    });
    panel.querySelector('#his-hs-close-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      panel.style.display = 'none';
    });

    toggleBtn.addEventListener('click', () => {
      const showing = panel.style.display !== 'none';
      panel.style.display = showing ? 'none' : 'flex';
      if (!showing && !reasonSel.dataset.hsInit) {
        reasonSel.dataset.hsInit = '1';
        renderFields();
      }
    });

    // Kéo thả popup
    const handle = panel.querySelector('#his-hs-drag-handle');
    let dragging = false, offX = 0, offY = 0;
    handle.addEventListener('mousedown', (e) => {
      if (e.target.closest('#his-hs-close-btn')) return; // đừng bắt đầu kéo khi bấm nút đóng
      dragging = true;
      const rect = panel.getBoundingClientRect();
      offX = e.clientX - rect.left;
      offY = e.clientY - rect.top;
      // Giữ nguyên vị trí hiện tại khi chuyển từ neo "right" sang "left",
      // tránh popup bị nhảy giật sang trái ngay khi vừa nhấn chuột.
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

  const observer = new MutationObserver(() => {
    bindSymptomEl();
    scanForTreatmentTextareas();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  bindSymptomEl();
  scanForTreatmentTextareas();
})();
