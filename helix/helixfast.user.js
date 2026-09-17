// ==UserScript==
// @name         HIS Bình Dương - Tiện ích Helix
// @namespace    https://his.benhvienbinhduong.org.vn/
// @version      1.36
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

  let printOutpatientPending = false;
  let printOutpatientTimeoutId = null;
  let printOutpatientDialogObserver = null;

  function findToolbarButton(selector) {
    return document.querySelector(selector);
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

  function handlePrintOutpatientClick(e) {
    e.preventDefault();
    e.stopPropagation();
    tryClickCompleteExamToolbarButton();
  }

  function createPrintOutpatientButton() {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = PRINT_OUTPATIENT_BTN_ID;
    btn.className = 'btn btn-info btn-xs';
    btn.innerHTML = '<i class="fa fa-print"></i> In nhanh BK toa về';
    btn.addEventListener('click', handlePrintOutpatientClick);
    return btn;
  }

  function removePrintOutpatientButton() {
    const btn = document.getElementById(PRINT_OUTPATIENT_BTN_ID);
    if (btn) btn.remove();
  }

  function ensurePrintOutpatientButtonPlacement() {
    const completeBtn = findToolbarButton(TOOLBAR_COMPLETE_BTN_SELECTOR);
    const saveBtn = findToolbarButton(TOOLBAR_SAVE_BTN_SELECTOR);
    if (!completeBtn || !saveBtn) return;

    let btn = document.getElementById(PRINT_OUTPATIENT_BTN_ID);
    if (!btn) {
      btn = createPrintOutpatientButton();
    }

    if (saveBtn.previousElementSibling !== btn) {
      saveBtn.insertAdjacentElement('beforebegin', btn);
    }
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

  function retryEnsurePrintOutpatientButtonPlacement(attemptsLeft) {
    if (attemptsLeft === undefined) attemptsLeft = 20;
    ensurePrintOutpatientButtonPlacement();
    if (document.getElementById(PRINT_OUTPATIENT_BTN_ID)) return;
    if (attemptsLeft > 0) {
      setTimeout(() => retryEnsurePrintOutpatientButtonPlacement(attemptsLeft - 1), 150);
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
      retryEnsurePrintOutpatientButtonPlacement();
      const hsBtn = document.getElementById('his-hs-toggle-btn');
      if (hsBtn) hsBtn.style.display = '';
    } else {
      removePrintOutpatientButton();
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
      '<span class="helixfast-label">Helixfast</span>' +
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
    ensurePrintOutpatientButtonPlacement();
    autoFocusSymptomFieldIfNew();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  ensureHelixfastToggleButton();
  if (isHelixfastEnabled()) {
    bindSymptomEl();
    scanForTreatmentTextareas();
    trySetPaginatorTo100();
    tryCheckCompletedCheckbox();
    ensurePrintOutpatientButtonPlacement();
    focusSymptomFieldOnly();
    autoFocusSymptomFieldIfNew();
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

    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

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

        const located = [];
        let allActive = true;
        for (const kw of keywords) {
            setStatus(`[${label}] Đang dò: ${kw}`);
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
            const ok = await searchKeyword(item.kw);
            if (!ok) { missed.push(item.kw); continue; }
            const finalCount = await setKeywordCount(item.kw, item.count, target);
            if (finalCount === target) okCount++;
            else missed.push(item.kw);
        }

        setToolbarDisabled(false);

        if (btn) setBtnActive(btn, color, target === 1 && missed.length === 0);

        if (missed.length === 0) {
            setStatus(target === 1
                ? `Đã CHỌN nhóm "${label}" (${okCount}/${keywords.length}).`
                : `Đã BỎ CHỌN nhóm "${label}" (${okCount}/${keywords.length}).`);
        } else {
            setStatus(`Nhóm "${label}": xong ${okCount}, lỗi/không tìm thấy: ${missed.join(', ')}`);
        }
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
                optBtn.addEventListener('click', async (e2) => {
                    e2.preventDefault(); e2.stopPropagation();
                    menu.remove();
                    await toggleGroup(opt.label, opt.keywords, optBtn, group.color);
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
