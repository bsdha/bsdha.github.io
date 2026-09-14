// ==UserScript==
// @name         HIS Bình Dương - Tiện ích Helix
// @namespace    https://his.benhvienbinhduong.org.vn/
// @version      1.5
// @description  Tiện ích Helix
// @match        https://his.benhvienbinhduong.org.vn/*
// @run-at       document-idle
// @grant        none
// @updateURL    https://raw.githubusercontent.com/bsdha/bsdha.github.io/refs/heads/main/helix/helix_utilities.user.js
// @downloadURL  https://raw.githubusercontent.com/bsdha/bsdha.github.io/refs/heads/main/helix/helix_utilities.user.js
// ==/UserScript==

/* ==ChangeLog==
1.5 | 2026-09-14 | Bổ sung cơ chế tự động cập nhật qua Tampermonkey (script tự kiểm tra và báo/cài bản mới, không cần tải lại thủ công).
1.4 |  | Hoàn thiện bộ tự động hoá thao tác nhập bệnh án trên Helix/VNPT HIS: đồng bộ Triệu chứng ↔ Diễn biến, mở rộng ô tìm ICD-10, cảnh báo trùng mã ICD, kiểm tra đủ sinh hiệu trước khi bắt đầu khám, tự bấm "Bắt đầu khám" và focus ô triệu chứng, tự chọn sẵn thuốc đầu tiên trong danh sách nhà thuốc, nút xử lý nhanh trong ô y lệnh/điều trị, điều hướng Tab thông minh, tự bấm nút "Nạp", tự chạy các bước trong hộp thoại lưu.
==/ChangeLog== */

(function () {
  'use strict';

  const SYMPTOM_SELECTOR = 'textarea[formcontrolname="symptom"]';
  const PROGRESSION_SELECTOR = 'textarea[formcontrolname="progression"]';
  const ICD_INPUT_SELECTOR = '.icd-search-container input[role="combobox"]';
  const ICD_CONTAINER_SELECTOR = '.icd-search-container';
  const ICD_ENTER_FOCUS_DELAY = 80;

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

  function syncToProgression(symptomEl) {
    const progressionEl = document.querySelector(PROGRESSION_SELECTOR);
    if (!progressionEl) return;
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

  function getVitalSignsMap() {
    const table = document.querySelector('app-vital-sign table.vital-sign');
    const map = {};
    if (!table) return map;
    table.querySelectorAll('tr').forEach((tr) => {
      const tds = Array.from(tr.children);
      for (let i = 0; i < tds.length; i += 2) {
        const label = tds[i] ? tds[i].textContent.replace(/\s+/g, ' ').trim() : '';
        const value = tds[i + 1] ? tds[i + 1].textContent.replace(/\s+/g, ' ').trim() : '';
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
