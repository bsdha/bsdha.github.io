// ==UserScript==
// @name         HIS Bình Dương - Tiện ích Helix
// @namespace    https://his.benhvienbinhduong.org.vn/
// @version      1.15
// @description  Tiện ích Helix
// @match        https://his.benhvienbinhduong.org.vn/*
// @run-at       document-idle
// @grant        none
// @updateURL    https://raw.githubusercontent.com/bsdha/bsdha.github.io/refs/heads/main/helix/helixfast.meta.js
// @downloadURL  https://raw.githubusercontent.com/bsdha/bsdha.github.io/refs/heads/main/helix/helixfast.user.js
// ==/UserScript==

/* ==ChangeLog==
1.15 | 2026-09-15 | Sửa lỗi không bỏ tích được checkbox "Đã hoàn thành": trước đây script tự tích lại checkbox này mỗi khi DOM trang thay đổi (xảy ra liên tục), khiến người dùng vừa bỏ tích là bị tích lại ngay. Nay chỉ tự động tích 1 lần duy nhất khi vừa vào trang/tải lại danh sách; sau đó không còn can thiệp nữa, người dùng tự tích/bỏ tích thoải mái.
1.14 | 2026-09-15 | Khi chọn từ 2 "Lý do vào viện" trở lên: gộp toàn bộ "Kèm theo" của các lý do vào 1 câu duy nhất (không lặp lại theo từng lý do), và chỉ còn 1 câu "Bệnh nhân đến khám tại Bệnh viện Đa khoa Bình Dương - Cơ sở 2." ở cuối cùng thay vì lặp lại cho mỗi lý do. Nội dung sau khi "Chèn vào bệnh sử" vẫn là ô nhập liệu bình thường của form, gõ sửa lại bình thường được.
1.13 | 2026-09-15 | Popup "Tạo bệnh sử nâng cao": cho phép chọn tối đa 2 "Lý do vào viện" cùng lúc (mỗi lý do hiện khối trường riêng, câu bệnh sử được ghép từ các lý do đã chọn); đổi "Kèm theo" từ chọn 1 sang chọn nhiều (checkbox) vì thực tế có thể kèm nhiều triệu chứng (nôn ói, tiêu chảy, chóng mặt...); chọn "không kèm triệu chứng khác" sẽ tự loại trừ các lựa chọn kèm theo khác và ngược lại.
1.12 | 2026-09-15 | Bỏ hoàn toàn kiểm tra DHST (dấu hiệu sinh tồn) khi nhấp đôi vào tên bệnh nhân — không còn hiện thông báo "Chưa điền đủ DHST..."; chỉ còn tự động focus ô Triệu chứng.
1.11 | 2026-09-15 | Tự động tích checkbox "Đã hoàn thành" (danh sách thăm khám ngoại trú) ngay sau khi tải trang, nếu chưa được tích sẵn; bỏ qua nếu đang có dropdown mở để tránh xung đột.
1.10 | 2026-09-15 | Bỏ tự động bấm nút "Bắt đầu khám" khi nhấp đôi vào tên bệnh nhân — vẫn giữ kiểm tra sinh hiệu (cảnh báo nếu thiếu DHST) và tự focus ô Triệu chứng, nhưng người dùng tự bấm "Bắt đầu khám".
1.9 | 2026-09-15 | Sửa lỗi nghiêm trọng: danh sách gợi ý thuốc (ô "Thuốc") tự đóng ngay sau mỗi ký tự gõ, không chọn được thuốc — do tính năng tự sắp xếp lại hàng "Số ngày/Cách dùng" thao tác DOM trong lúc dropdown gợi ý đang mở, khiến Angular đóng dropdown. Nay hàm này luôn kiểm tra và bỏ qua hoàn toàn nếu đang có bất kỳ dropdown nào mở (tìm thuốc, chọn kho, ICD...).
1.8 | 2026-09-15 | Sửa lỗi tự động chọn "100" bản ghi/trang bị kẹt (không xổ được dropdown): thêm cờ chống gọi chồng khi MutationObserver toàn trang kích hoạt lại hàm trong lúc panel đang mở/đang xử lý; không bấm lại trigger nếu panel đã đang mở; sửa lệnh đóng dropdown khi hết thời gian chờ (dispatch Escape lên document thay vì lên phần tử dropdown, đúng nơi PrimeNG lắng nghe).
1.7 | 2026-09-15 | Sửa thứ tự hàng đơn thuốc: dời cả nhãn "Cách dùng" vào đúng sau ô Số ngày (thay vì để nhãn đứng đầu hàng). Thêm tự động chọn "100" bản ghi/trang trong danh sách bệnh nhân sau khi tải trang. Sửa cảnh báo DHST sai do "Nhịp thở" load chậm hơn các trường khác — thay logic chờ-đủ bằng logic chờ-ổn-định (không đổi trong 600ms) trước khi kiểm tra.
1.6 | 2026-09-15 | Thêm "Tạo bệnh sử nâng cao": popup kéo-thả cạnh ô Triệu chứng với thư viện 17 lý do vào viện, mỗi lý do có bộ trường khai thác riêng; script chỉ ghép câu từ dữ liệu đã chọn (không tự bịa triệu chứng/xử trí), có nút tạo lại để đổi cách diễn đạt và chèn thẳng vào ô Triệu chứng. | Bỏ nút "🔁 Đổi cách diễn đạt bệnh sử" (không còn cần thiết); popup "Tạo bệnh sử nâng cao" giờ tự đóng khi bấm ra ngoài, không chỉ khi bấm nút "✕"; sửa lỗi danh sách ICD chớp nháy rồi biến mất khi bấm vào ô Chẩn đoán ICD trống — không còn hiện tượng nháy nữa. | Tự viết hoa ký tự đầu tiên của "Lý do khám"; danh sách bệnh nhân hiển thị gọn hơn — mỗi bệnh nhân 1 hàng, cột dài (Chẩn đoán, Địa chỉ...) cắt bớt bằng "...", rê chuột để xem đầy đủ; bỏ thanh cuộn riêng của vùng danh sách để hiển thị đủ luôn (kể cả 50 bệnh nhân), cuộn bằng thanh cuộn của trang như bình thường. | Đổi tên "S/Tr/C/T" thành "Cách dùng" trong đơn thuốc; dời ô "Số ngày" ra trước ô "Sáng" cùng hàng — Enter vẫn nhảy Tên thuốc → Số ngày → Tổng S.Lg như cũ, còn Tab từ ô Số ngày đi tiếp theo đúng thứ tự Sáng/Trưa/Chiều/Tối. | Danh sách bệnh nhân hiển thị khít hơn nữa (giảm thêm khoảng cách dòng); sửa lại cách "dời ô Số ngày" — bỏ cách canh bằng CSS (chỉ dời được ô nhập, không dời được nhãn chữ), chuyển sang tự kiểm tra và sửa vị trí liên tục mỗi 0.3 giây nên luôn đúng chỗ ngay khi vào thẻ Đơn thuốc, không cần thao tác gì thêm.
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
  let hsQuickVariantIndex = 0;
  let hsQuickLastText = '';

  function hsQuickVariants(text) {
    return [
      `Bệnh nhân đến khám vì ${text}, đến khám tại ${HS_DEST}.`,
      `Ghi nhận bệnh nhân ${text}, nên đến khám tại ${HS_DEST}.`,
      `Bệnh nhân vào viện với lý do: ${text}. Đến khám tại ${HS_DEST}.`,
    ];
  }

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

  const START_EXAM_MIN_DELAY_MS = 800;

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

  // Đã bỏ tự động bấm nút "Bắt đầu khám" (v1.10) và bỏ luôn kiểm tra DHST (v1.12) —
  // chỉ còn tự focus ô triệu chứng, người dùng tự bấm "Bắt đầu khám" khi sẵn sàng.
  function tryClickStartExamThenFocusSymptom() {
    focusSymptomFieldOnly();
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

  // Nối danh sách kiểu tiếng Việt: 1 mục -> "a"; 2 mục -> "a và b"; 3+ mục -> "a, b và c".
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

  // Giống hsBuildSentence nhưng KHÔNG gồm "Kèm theo..." và KHÔNG gồm câu đến khám tại bệnh viện —
  // dùng khi có từ 2 lý do vào viện trở lên, để gộp triệu chứng kèm theo và câu đến khám vào 1 chỗ duy nhất.
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

  // Bản "tái khám" không kèm câu đến khám tại bệnh viện — dùng khi tái khám được chọn
  // kèm theo lý do khác (để câu đến khám chỉ xuất hiện 1 lần ở cuối).
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

  // Nhóm checkbox cho phép chọn nhiều mục cùng lúc. Nếu exclusiveValue được chỉ định
  // (vd. "không kèm triệu chứng khác"), chọn mục đó sẽ tự bỏ chọn các mục khác và ngược lại.
  function hsMakeCheckboxGroup(idPrefix, options, exclusiveValue) {
    const wrap = document.createElement('div');
    wrap.className = 'his-hs-checkbox-group';
    wrap.id = idPrefix;
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'column';
    wrap.style.gap = '3px';
    wrap.style.background = '#262b35';
    wrap.style.border = '1px solid #3a4150';
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
    let selectedReasons = []; // giữ thứ tự chọn

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
      block.style.borderTop = '1px dashed #3a4150';
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

      // Chỉ 1 lý do được chọn: dùng câu đầy đủ như cũ (đã có đích đến, hoặc freetext).
      if (selectedReasons.length === 1) {
        const key = selectedReasons[0];
        const values = collectValuesForReason(key);
        preview.value = hsBuildSentence(key, values, variantCounter);
        variantCounter++;
        return;
      }

      // Từ 2 lý do trở lên: ghép các câu "core" (không có Kèm theo, không có câu đến khám),
      // gộp toàn bộ "Kèm theo" của các lý do lại 1 chỗ, và chỉ có 1 câu đến khám ở cuối cùng.
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

    panel.querySelector('#his-hs-gen').addEventListener('click', generate);
    panel.querySelector('#his-hs-insert').addEventListener('click', () => {
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
    });
    panel.querySelector('#his-hs-reset').addEventListener('click', () => {
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

  // Sửa thứ tự hàng đơn thuốc:
  // Mong muốn: [Số ngày label] [Số ngày input] [Cách dùng label] [Sáng/Trưa/Chiều/Tối...]
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

  // Bất kỳ dropdown/gợi ý nào đang mở (tìm thuốc, chọn kho, ICD...) đều dùng
  // kiểu ".menu.visible" (Semantic UI) hoặc ".ng-dropdown-panel" (ng-select).
  // Không được thao tác DOM trong lúc dropdown đang mở, nếu không Angular sẽ
  // đóng dropdown ngay khi phát hiện DOM bị chỉnh sửa từ bên ngoài (gây hiện
  // tượng danh sách thuốc xổ ra rồi thu vào ngay khi gõ ký tự).
  function isAnyDropdownMenuOpen() {
    return !!document.querySelector(
      '.ui.dropdown .menu.visible, .ng-dropdown-panel, .p-dropdown-panel, .p-autocomplete-panel'
    );
  }

  function fixPharmacyDosageRow() {
    if (isAnyDropdownMenuOpen()) return;

    const pharmacyTab = document.getElementById('pharmacy');
    if (!pharmacyTab) return;

    // Đổi tên nhãn S/Tr/C/T → Cách dùng
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

    // Thứ tự mong muốn: [Số ngày label] [Số ngày input] [Cách dùng label] [Sáng input...]
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

  // ---- Tự tích checkbox "Đã hoàn thành" sau khi tải trang (chỉ 1 lần, không ép lại nếu người dùng tự bỏ tích) ----
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
    if (isAnyDropdownMenuOpen()) return; // tránh thao tác DOM khi đang có dropdown mở
    const cb = findCompletedCheckbox();
    if (!cb) {
      // Rời khỏi trang có checkbox này (chuyển trang trong SPA) -> reset để lần tới vào lại vẫn tự tích 1 lần.
      completedCheckboxHandled = false;
      lastCompletedCheckboxEl = null;
      return;
    }
    if (cb !== lastCompletedCheckboxEl) {
      // Phần tử checkbox mới (vừa vào trang/tải lại danh sách) -> cho phép tự tích lại 1 lần.
      lastCompletedCheckboxEl = cb;
      completedCheckboxHandled = false;
    }
    if (completedCheckboxHandled) return; // đã xử lý rồi, không can thiệp nữa dù người dùng tự tích/bỏ tích
    const box = cb.querySelector('.p-checkbox-box');
    if (!box) return;
    if (!box.classList.contains('p-highlight')) {
      box.click();
    }
    completedCheckboxHandled = true;
  }

  // ---- Tự chọn "100" bản ghi/trang trong danh sách bệnh nhân ----
  let paginatorAutoSet = false;
  let paginatorAttemptInProgress = false;
  let paginatorPanelObserver = null;

  function trySetPaginatorTo100(attemptsLeft) {
    if (attemptsLeft === undefined) attemptsLeft = 0;
    if (paginatorAttemptInProgress) return; // chống gọi chồng khi observer toàn trang kích hoạt lại

    const dropdown = document.querySelector('.p-paginator-rpp-options');
    if (!dropdown) {
      if (attemptsLeft < 50) setTimeout(() => trySetPaginatorTo100(attemptsLeft + 1), 300);
      return;
    }

    // Đã chọn 100 rồi thì thôi
    const label = dropdown.querySelector('.p-dropdown-label');
    if (label && label.textContent.trim() === '100') {
      paginatorAutoSet = true;
      return;
    }

    // Nếu panel đang mở sẵn (do người dùng thao tác hoặc lần gọi trước chưa đóng),
    // đừng bấm trigger nữa — bấm lại sẽ đóng panel đang mở, gây cảm giác "bị khóa".
    if (document.querySelector('.p-dropdown-panel')) return;

    paginatorAttemptInProgress = true;

    // Huỷ observer cũ nếu còn
    if (paginatorPanelObserver) {
      paginatorPanelObserver.disconnect();
      paginatorPanelObserver = null;
    }

    // Dùng MutationObserver để bắt đúng thời điểm panel xuất hiện trong DOM
    // (PrimeNG appendTo="body" → panel được thêm vào body bất đồng bộ)
    let guardTimeout = null;

    paginatorPanelObserver = new MutationObserver((mutations, obs) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (!node.querySelector) continue;
          // Tìm panel dropdown vừa xuất hiện chứa mục "100"
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

    // Bảo vệ: sau 2 giây nếu vẫn chưa chọn được thì đóng dropdown và bỏ observer
    guardTimeout = setTimeout(() => {
      if (paginatorPanelObserver) {
        paginatorPanelObserver.disconnect();
        paginatorPanelObserver = null;
      }
      // Đóng overlay: PrimeNG lắng nghe Escape trên document, không phải trên phần tử dropdown.
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
      );
      paginatorAttemptInProgress = false;
    }, 2000);

    // Bấm mở dropdown
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
    // Reset cờ khi paginator biến mất (chuyển trang trong SPA)
    if (paginatorAutoSet && !document.querySelector('.p-paginator-rpp-options')) {
      paginatorAutoSet = false;
    }
    if (!paginatorAutoSet) trySetPaginatorTo100();
    tryCheckCompletedCheckbox();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  bindSymptomEl();
  scanForTreatmentTextareas();
  trySetPaginatorTo100();
  tryCheckCompletedCheckbox();
})();
