// ==UserScript==
// @name         Helixfast
// @namespace    https://his.benhvienbinhduong.org.vn/
// @version      2.15
// @description  Tiện ích Helix
// @match        https://his.benhvienbinhduong.org.vn/*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      rxnav.nlm.nih.gov
// @connect      api.fda.gov
// @updateURL    https://raw.githubusercontent.com/bsdha/bsdha.github.io/refs/heads/main/helix/helixfast.meta.js
// @downloadURL  https://raw.githubusercontent.com/bsdha/bsdha.github.io/refs/heads/main/helix/helixfast.user.js
// ==/UserScript==

(function () {
  'use strict';

  const HELIXFAST_VERSION = '2.15';
  const HLX_UPDATE_META_URL = 'https://raw.githubusercontent.com/bsdha/bsdha.github.io/refs/heads/main/helix/helixfast.meta.js';
  const HLX_UPDATE_USER_URL = 'https://raw.githubusercontent.com/bsdha/bsdha.github.io/refs/heads/main/helix/helixfast.user.js';
  const hlxUpdState = { remote: null, hasNew: false, error: false, checked: false };

  const HLX_OFF = (() => {
    try { return localStorage.getItem('helixfast_enabled') === '0'; } catch (err) { return false; }
  })();
  function hlxDocListen() {
    if (HLX_OFF) return;
    document.addEventListener.apply(document, arguments);
  }
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

  const HELIXFAST_LICENSE_SECRET = '3780ca6bca82cf7389f693dfc26a3ff69dde2433c2649c9e122598af5d7be435';
  const HELIXFAST_LICENSE_TOKEN_KEY = 'helixfast_license_token';

  function hlxSha256Bytes(messageBytes) {
    const K = new Uint32Array([
      0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
      0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
      0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
      0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
      0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
      0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
      0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
      0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
    ]);
    let H = new Uint32Array([
      0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19,
    ]);
    const bitLen = messageBytes.length * 8;
    const withOne = new Uint8Array(((messageBytes.length + 9 + 63) >> 6) << 6);
    withOne.set(messageBytes);
    withOne[messageBytes.length] = 0x80;
    const dv = new DataView(withOne.buffer);
    dv.setUint32(withOne.length - 4, bitLen >>> 0, false);
    dv.setUint32(withOne.length - 8, Math.floor(bitLen / 4294967296), false);

    function rotr(x, n) {
      return (x >>> n) | (x << (32 - n));
    }

    for (let offset = 0; offset < withOne.length; offset += 64) {
      const w = new Uint32Array(64);
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(offset + i * 4, false);
      for (let i = 16; i < 64; i++) {
        const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }
      let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (let i = 0; i < 64; i++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const temp2 = (S0 + maj) >>> 0;
        h = g; g = f; f = e; e = (d + temp1) >>> 0;
        d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }

    const out = new Uint8Array(32);
    const outDv = new DataView(out.buffer);
    for (let i = 0; i < 8; i++) outDv.setUint32(i * 4, H[i], false);
    return out;
  }

  function hlxConcatBytes(a, b) {
    const out = new Uint8Array(a.length + b.length);
    out.set(a, 0);
    out.set(b, a.length);
    return out;
  }

  function hlxHmacSha256Hex(secretStr, messageStr) {
    const blockSize = 64;
    let key = new TextEncoder().encode(secretStr);
    if (key.length > blockSize) key = hlxSha256Bytes(key);
    if (key.length < blockSize) {
      const padded = new Uint8Array(blockSize);
      padded.set(key);
      key = padded;
    }
    const oKeyPad = new Uint8Array(blockSize);
    const iKeyPad = new Uint8Array(blockSize);
    for (let i = 0; i < blockSize; i++) {
      oKeyPad[i] = key[i] ^ 0x5c;
      iKeyPad[i] = key[i] ^ 0x36;
    }
    const msgBytes = new TextEncoder().encode(messageStr);
    const inner = hlxSha256Bytes(hlxConcatBytes(iKeyPad, msgBytes));
    const digest = hlxSha256Bytes(hlxConcatBytes(oKeyPad, inner));
    return Array.from(digest).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  function hlxBase64UrlEncode(str) {
    const b64 = btoa(unescape(encodeURIComponent(str)));
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function hlxBase64UrlDecode(b64url) {
    let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    return decodeURIComponent(escape(atob(b64)));
  }

  function hlxDjb2(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
      h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
  }

  function hlxFpWebGL() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return 'nogl';
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      const vendor = dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
      const renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      return (vendor || '') + '|' + (renderer || '');
    } catch (err) {
      return 'errgl';
    }
  }

  function hlxFpCanvas() {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 240;
      canvas.height = 40;
      const ctx = canvas.getContext('2d');
      if (!ctx) return 'noctx';
      ctx.textBaseline = 'top';
      ctx.font = '15px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(0, 0, 90, 22);
      ctx.fillStyle = '#069';
      ctx.fillText('Helixfast \u00c1\u00c2\u00caO \u0111\u1eb7c 0123', 2, 16);
      ctx.fillStyle = 'rgba(102, 200, 0, 0.65)';
      ctx.fillText('Helixfast \u00c1\u00c2\u00caO \u0111\u1eb7c 0123', 4, 19);
      return canvas.toDataURL();
    } catch (err) {
      return 'errcanvas';
    }
  }

  function hlxFpFonts() {
    try {
      if (!document.body) return 'nobody';
      const testFonts = [
        'Arial', 'Times New Roman', 'Courier New', 'Verdana', 'Tahoma',
        'Segoe UI', 'Calibri', 'Cambria', 'Consolas', 'Comic Sans MS',
        'Vni-Times', 'VNI-Times', '.VnTime', 'UTM Avo', 'Roboto Condensed',
      ];
      const baseFonts = ['monospace', 'sans-serif', 'serif'];
      const testString = 'mmmmmmmmmmlli0123';
      const span = document.createElement('span');
      span.style.position = 'absolute';
      span.style.left = '-9999px';
      span.style.top = '-9999px';
      span.style.fontSize = '72px';
      span.textContent = testString;
      document.body.appendChild(span);
      const baseWidths = {};
      baseFonts.forEach((bf) => {
        span.style.fontFamily = bf;
        baseWidths[bf] = span.offsetWidth;
      });
      const detected = [];
      testFonts.forEach((font) => {
        const found = baseFonts.some((bf) => {
          span.style.fontFamily = '"' + font + '", ' + bf;
          return span.offsetWidth !== baseWidths[bf];
        });
        if (found) detected.push(font);
      });
      document.body.removeChild(span);
      return detected.join(',');
    } catch (err) {
      return 'errfont';
    }
  }

  let hlxMachineCodeCache = null;

  const HLX_MID_KEY = 'helixfast_mid_v1';
  function hlxStoreGet(key) {
    let v = null;
    try { if (typeof GM_getValue === 'function') v = GM_getValue(key, null); } catch (err) {}
    if (v === null || v === undefined || v === '') {
      v = null;
      try { v = localStorage.getItem(key); } catch (err) {}
    }
    return v === undefined || v === '' ? null : v;
  }
  function hlxStoreSet(key, val) {
    try { if (typeof GM_setValue === 'function') GM_setValue(key, val); } catch (err) {}
    try { localStorage.setItem(key, val); } catch (err) {}
  }
  function hlxIsValidMid(v) {
    return typeof v === 'string' && /^HLF-[0-9A-Fa-f]{8}$/.test(v);
  }

  function hlxMidFromStoredToken() {
    try {
      const token = hlxStoreGet(HELIXFAST_LICENSE_TOKEN_KEY);
      if (!token || token.indexOf('.') === -1) return null;
      const dot = token.lastIndexOf('.');
      const payloadB64 = token.slice(0, dot);
      if (token.slice(dot + 1) !== hlxHmacSha256Hex(HELIXFAST_LICENSE_SECRET, payloadB64)) return null;
      const payload = JSON.parse(hlxBase64UrlDecode(payloadB64));
      return payload && hlxIsValidMid(payload.m) ? payload.m : null;
    } catch (err) {
      return null;
    }
  }
  function hlxComputeFingerprintMid() {
    const raw = [
      navigator.platform || '',
      (screen.width || 0) + 'x' + (screen.height || 0),
      (screen.availWidth || 0) + 'x' + (screen.availHeight || 0),
      (screen.colorDepth || 0) + '',
      (window.devicePixelRatio || 1) + '',
      navigator.language || '',
      (navigator.languages || []).join(','),
      (navigator.hardwareConcurrency || 0) + '',
      (navigator.deviceMemory || 0) + '',
      (navigator.maxTouchPoints || 0) + '',
      new Date().getTimezoneOffset() + '',
      hlxFpWebGL(),
      hlxFpCanvas(),
      hlxFpFonts(),
    ].join('||');
    return 'HLF-' + hlxDjb2(raw).toUpperCase();
  }

  function hlxGetMachineCode() {
    if (hlxMachineCodeCache) return hlxMachineCodeCache;
    let mid = hlxStoreGet(HLX_MID_KEY);
    if (!hlxIsValidMid(mid)) mid = null;
    if (!mid) mid = hlxMidFromStoredToken();
    if (!mid) mid = hlxComputeFingerprintMid();
    hlxMachineCodeCache = mid;
    hlxStoreSet(HLX_MID_KEY, mid);
    return mid;
  }

  function hlxParseLicenseToken(token) {
    if (!token || typeof token !== 'string' || token.indexOf('.') === -1) {
      return { ok: false, reason: 'Mã kích hoạt không đúng định dạng.' };
    }
    const dot = token.lastIndexOf('.');
    const payloadB64 = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    let expectedSig;
    try {
      expectedSig = hlxHmacSha256Hex(HELIXFAST_LICENSE_SECRET, payloadB64);
    } catch (err) {
      return { ok: false, reason: 'Không tính được chữ ký (trình duyệt không hỗ trợ).' };
    }
    if (sig !== expectedSig) {
      return { ok: false, reason: 'Chữ ký không khớp — mã kích hoạt sai hoặc bị sửa.' };
    }
    let payload;
    try {
      payload = JSON.parse(hlxBase64UrlDecode(payloadB64));
    } catch (err) {
      return { ok: false, reason: 'Không đọc được nội dung mã kích hoạt.' };
    }
    if (!payload || typeof payload.m !== 'string' || typeof payload.exp !== 'number') {
      return { ok: false, reason: 'Nội dung mã kích hoạt thiếu dữ liệu.' };
    }
    if (payload.m !== hlxGetMachineCode()) {
      return { ok: false, reason: 'Mã kích hoạt này dành cho MÁY KHÁC, không phải máy hiện tại.' };
    }
    const nowSec = Math.floor(Date.now() / 1000);
    if (nowSec > payload.exp) {
      return { ok: false, reason: 'Mã kích hoạt đã HẾT HẠN.', exp: payload.exp };
    }
    // Gói: token có t:'adv' = Nâng cao; không có = Cơ bản (token cũ vẫn hợp lệ, tính là Cơ bản)
    return { ok: true, exp: payload.exp, tier: payload.t === 'adv' ? 'adv' : 'basic' };
  }

  function hlxGetLicenseStatus() {
    let token = null;
    try {
      token = localStorage.getItem(HELIXFAST_LICENSE_TOKEN_KEY);
    } catch (err) {
    }
    if (!token) {

      token = hlxStoreGet(HELIXFAST_LICENSE_TOKEN_KEY);
      if (token) { try { localStorage.setItem(HELIXFAST_LICENSE_TOKEN_KEY, token); } catch (err) {} }
    }
    if (!token) return { valid: false, expired: false, reason: 'Chưa kích hoạt bản quyền cho máy này.' };
    const res = hlxParseLicenseToken(token);
    if (!res.ok) return { valid: false, expired: !!res.exp, exp: res.exp, reason: res.reason };
    const daysLeft = Math.ceil((res.exp - Date.now() / 1000) / 86400);
    return { valid: true, exp: res.exp, daysLeft, tier: res.tier };
  }

  function hlxActivateLicense(token) {
    const res = hlxParseLicenseToken((token || '').trim());
    if (!res.ok) return { ok: false, reason: res.reason };
    hlxStoreSet(HELIXFAST_LICENSE_TOKEN_KEY, (token || '').trim());
    return { ok: true, exp: res.exp, tier: res.tier };
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
  hlxDocListen(
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

  hlxDocListen(
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

  hlxDocListen(
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

  hlxDocListen(
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

  hlxDocListen(
    'keydown',
    (e) => {
      if (e.key === 'Escape' && rxDrag) rxCleanupDrag();
    },
    true
  );

  hlxDocListen(
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

  let hlxIcdGuardTimer = null;
  let hlxIcdGuardInput = null;
  let hlxIcdGuardUntil = 0;
  function hlxEndIcdGuard() {
    if (hlxIcdGuardTimer) { clearInterval(hlxIcdGuardTimer); hlxIcdGuardTimer = null; }
    document.removeEventListener('keydown', hlxIcdGuardKey, true);
    document.removeEventListener('mousedown', hlxIcdGuardMouse, true);
    document.body.classList.remove('icd-flicker-guard');
  }
  function hlxIcdGuardKey(ev) {

    if (!ev.isTrusted) return;
    if (ev.key === 'Enter' || ev.key === 'Tab' || ev.key === 'Shift' || ev.key === 'Control' || ev.key === 'Alt') return;
    hlxEndIcdGuard();
  }
  function hlxIcdGuardMouse() { hlxEndIcdGuard(); }
  function hlxSuppressIcdLong(inputEl) {
    if (!inputEl || inputEl.value.trim() !== '') return;
    hlxIcdGuardInput = inputEl;
    hlxIcdGuardUntil = Date.now() + 1400;
    document.body.classList.add('icd-flicker-guard');
    if (hlxIcdGuardTimer) return;
    document.addEventListener('keydown', hlxIcdGuardKey, true);
    document.addEventListener('mousedown', hlxIcdGuardMouse, true);
    hlxIcdGuardTimer = setInterval(() => {
      const inp = hlxIcdGuardInput;
      if (!inp || !inp.isConnected || inp.value.trim() !== '' || Date.now() > hlxIcdGuardUntil) {
        hlxEndIcdGuard();
        return;
      }
      const c = inp.closest(ICD_CONTAINER_SELECTOR);
      const opened = (c && c.querySelector('.ng-select-opened')) || document.querySelector('.ng-dropdown-panel');
      if (opened) closeIcdDropdownIfEmpty(inp);
    }, 40);
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
    hsHandleSymptomTextChange(e.target.value, { advanceVariant: false });
  }

  function hsHandleSymptomTextChange(rawText, opts) {
    const text = (rawText || '').trim();
    if (!text) return;
    if (text !== hsQuickLastText) {
      hsQuickLastText = text;
      hsQuickVariantIndex = 0;
    }
    hsApplyQuickVariant(text, hsQuickVariantIndex);
    if (opts && opts.advanceVariant) hsQuickVariantIndex++;
    fillExamFields();
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
    }
  }

  function onSymptomKeydown(e) {
    if (!isHelixfastEnabled()) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      hsHandleSymptomTextChange(e.target.value, { advanceVariant: true });
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

  hlxDocListen(
    'mouseover',
    (e) => {
      updateOverflowTitle(e.target);
      const td = e.target.closest && e.target.closest('.p-datatable-tbody td');
      if (td) updateTableCellOverflowTitle(td);
    },
    true
  );
  hlxDocListen(
    'input',
    (e) => updateOverflowTitle(e.target),
    true
  );
  hlxDocListen(
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
        opacity: 1;
        background-color: #f0f0f0 !important;
        color: #d32f2f !important;
        font-weight: 600;
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
      /* Bảng PHIẾU CHỈ ĐỊNH (cận lâm sàng): tên dịch vụ dài KHÔNG được nowrap, nếu không cột
         "Dịch vụ" phình ra ép cột "Ghi chú" nhỏ lại (rõ nhất khi zoom 100%).
         Nhận diện bảng qua tiêu đề cột TLTT (title="Tỷ lệ thanh toán theo dịch vụ"). */
      .p-datatable:has(th[title="Tỷ lệ thanh toán theo dịch vụ"]) .p-datatable-tbody > tr > td {
        white-space: normal !important;
        overflow: visible !important;
        text-overflow: clip !important;
        word-break: break-word;
      }
      .p-datatable:has(th[title="Tỷ lệ thanh toán theo dịch vụ"]) .p-datatable-tbody > tr > td textarea {
        width: 100% !important;
        min-width: 150px !important;
        box-sizing: border-box !important;
      }
      /* Bỏ giới hạn chiều cao (hiện hết dòng) nhưng GIỮ thanh trượt ngang.
         Trước đây overflow:visible làm bảng width:max-content tràn ra ngoài
         và mất scrollbar ngang + sticky cột Tác vụ. */
      .p-datatable-wrapper {
        max-height: none !important;
        overflow-x: auto !important;
        overflow-y: hidden !important;
      }
      /* Bảng có ô chứa dropdown (ng-select ICD...) thì giữ visible để
         panel không bị cắt như hành vi cũ. */
      .p-datatable-wrapper:has(.ng-select, .icd-search-container, .dropdown-menu.open) {
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
        top: 5vh;
        left: 50%;
        transform: translateX(-50%);
        width: 88vw;
        max-width: 1400px;
        height: 88vh;
        max-height: 88vh;
        overflow-y: auto;
        background: #ffffff;
        color: #1c1f26;
        border: 1px solid #d8dce2;
        border-radius: 10px;
        box-shadow: 0 6px 24px rgba(0,0,0,.25);
        z-index: 99999;
        flex-direction: column;
        font-size: 16px;
      }
      .his-hs-header {
        background: #0f9d78;
        color: #fff;
        padding: 12px 16px;
        border-radius: 10px 10px 0 0;
        cursor: move;
        font-weight: 600;
        font-size: 19px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .his-hs-close { cursor: pointer; padding: 0 6px; font-size: 20px; }
      .his-hs-body { padding: 18px 22px; display: flex; flex-direction: column; gap: 10px; }
      .his-hs-label { font-size: 14px; color: #0f9d78; font-weight: 600; margin-top: 6px; }
      .his-hs-search-wrap { position: relative; display: inline-block; width: 340px; max-width: 100%; margin: 4px 0 2px; }
      .his-hs-search { width: 100%; height: 32px; box-sizing: border-box; padding: 0 30px 0 10px; font-size: 13px;
        border: 1.5px solid #0f9d78; border-radius: 8px; outline: none; background: #fff; }
      .his-hs-search:focus { box-shadow: 0 0 0 3px rgba(15,157,120,.2); }
      .his-hs-search-clear { position: absolute; right: 9px; top: 50%; transform: translateY(-50%); cursor: pointer;
        color: #94a3b8; font-size: 13px; display: none; }
      .his-hs-search-clear:hover { color: #ef4444; }
      .his-hs-search-hint { font-size: 12.5px; color: #b45309; font-weight: 600; margin: 2px 0 4px; display: none; }
      .his-hs-reason-hl { background: #fff4d6; border-radius: 6px; box-shadow: 0 0 0 2px #f59e0b inset; font-weight: 700 !important; padding: 2px 6px !important; }
      .his-hs-row { display: flex; flex-direction: column; gap: 4px; }
      .his-hs-field {
        width: 100%;
        box-sizing: border-box;
        background: #fff;
        color: #1c1f26;
        border: 1px solid #c7cdd6;
        border-radius: 5px;
        padding: 8px 10px;
        font-size: 15px;
      }
      .his-hs-preview {
        width: 100%;
        box-sizing: border-box;
        background: #f7f9fa;
        color: #1c1f26;
        border: 1px solid #c7cdd6;
        border-radius: 5px;
        padding: 10px;
        font-size: 15px;
        resize: vertical;
        min-height: 120px;
      }
      .his-hs-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 6px; }
      .his-hs-btn {
        flex: 1 1 auto;
        font-size: 14px;
        padding: 9px 12px;
        border-radius: 5px;
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
        width: 16px;
        height: 16px;
      }
      .his-hs-checkbox-group label,
      .his-hs-panel #his-hs-reason-group label {
        color: #1c1f26;
        font-size: 14px;
      }
      #his-hs-reason-group {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
        gap: 2px 14px;
      }
      #his-hs-fields {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
        gap: 0 24px;
        align-items: start;
      }
      .hs-reason-block { min-width: 0; }
    `;
    document.head.appendChild(style);
  }

  if (!HLX_OFF) injectIcdWideningCss();

  hlxDocListen(
    'focus',
    (e) => {
      if (e.target && e.target.matches && e.target.matches(ICD_INPUT_SELECTOR)) {
        suppressIcdFlicker(e.target);
      }
    },
    true
  );

  hlxDocListen(
    'mousedown',
    (e) => {
      const container = e.target.closest && e.target.closest(ICD_CONTAINER_SELECTOR);
      if (!container) return;
      const input = container.querySelector(ICD_INPUT_SELECTOR);
      if (input) suppressIcdFlicker(input);
    },
    true
  );

  function hlxIsVisible(el) {
    return !!(el && (el.offsetParent !== null || (el.getClientRects && el.getClientRects().length)));
  }

  function hlxIcdScopeOf(ref) {
    if (!ref || !ref.closest) return null;
    return ref.closest('table') || ref.closest('.p-datatable') || ref.closest('tbody') || null;
  }

  function hlxIcdInputs(scope) {
    let all = Array.from(document.querySelectorAll(ICD_INPUT_SELECTOR)).filter(hlxIsVisible);
    if (scope && scope.isConnected) {
      const inScope = all.filter((i) => scope.contains(i));
      if (inScope.length) all = inScope;
    }
    return all;
  }

  function findAddIcdRowButton(refInput) {
    const SEL = 'button[icon="fa fa-plus"], button.ui-button-success .fa-plus';
    const toBtn = (el) => (el && el.tagName !== 'BUTTON' ? el.closest('button') : el);
    const usable = (b) => b && hlxIsVisible(b) && !b.disabled;
    const pickFrom = (node) => {
      for (let depth = 0; node && depth < 10; depth++, node = node.parentElement) {
        const cand = Array.from(node.querySelectorAll(SEL)).map((el) => toBtn(el)).filter(usable);
        if (cand.length) return cand[0];
      }
      return null;
    };
    let btn = null;
    if (refInput && refInput.isConnected) btn = pickFrom(refInput.parentElement);
    if (!btn) {
      const first = Array.from(document.querySelectorAll(ICD_CONTAINER_SELECTOR)).find(hlxIsVisible);
      if (first) btn = pickFrom(first.parentElement);
    }
    if (btn) return btn;
    const all = Array.from(document.querySelectorAll(SEL)).map((el) => toBtn(el)).filter(Boolean);
    return all.find(usable) || all[0] || null;
  }

  function waitForNewIcdInput(previousCount, callback, attemptsLeft, onFail, listFn) {
    if (attemptsLeft === undefined) attemptsLeft = 20;
    const icdInputs = listFn ? listFn() : hlxIcdInputs(null);
    if (icdInputs.length > previousCount) {
      callback(icdInputs[icdInputs.length - 1]);
      return;
    }
    if (attemptsLeft > 0) {
      setTimeout(() => waitForNewIcdInput(previousCount, callback, attemptsLeft - 1, onFail, listFn), 100);
    } else if (onFail) {
      onFail();
    }
  }

  hlxDocListen(
    'keydown',
    function (e) {
      if (e.key !== 'Enter') return;
      if (!e.target || !e.target.matches || !e.target.matches(ICD_INPUT_SELECTOR)) return;
      if (!isHelixfastEnabled()) return;

      const currentInput = e.target;
      let icdScope = hlxIcdScopeOf(currentInput);
      const idxAtKey = hlxIcdInputs(icdScope).indexOf(currentInput);

      {
        const ownContainer0 = currentInput.closest(ICD_CONTAINER_SELECTOR);
        const hasCode = !!(ownContainer0 && ownContainer0.querySelector('.ng-value'));
        const typedText = (currentInput.value || '').trim();
        if (hasCode && typedText === '') {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          setTimeout(() => advance(), 0);
          return;
        }
      }

      const openPanel = Array.from(document.querySelectorAll('.ng-dropdown-panel'))
        .find((pn) => pn.offsetParent !== null || pn.getClientRects().length) || null;

      {
        const oc = currentInput.closest(ICD_CONTAINER_SELECTOR);
        const emptyRow = oc && !oc.querySelector('.ng-value') && (currentInput.value || '').trim() === '';
        if (emptyRow && !openPanel) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return;
        }
      }

      if (openPanel) {
        const markedOpt =
          openPanel.querySelector('.ng-option.ng-option-marked') ||
          openPanel.querySelector('.ng-option.ng-option-selected');
        if (markedOpt && markedOpt.classList.contains('icd-option-duplicate')) {

          const ownContainer = currentInput.closest(ICD_CONTAINER_SELECTOR);
          const ownValueEl = ownContainer ? ownContainer.querySelector('.ng-value') : null;
          const ownCode = ownValueEl ? ownValueEl.textContent.replace(/[×x]\s*$/i, '').trim() : '';
          const markedCode = (markedOpt.textContent || '').split(' - ')[0].trim();
          const isOwn = ownCode && (ownCode === markedCode || ownCode.indexOf(markedCode) === 0);
          if (!isOwn) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          markedOpt.classList.remove('icd-option-duplicate');
        }
      }

      function advance() {

        if (!icdScope || !icdScope.isConnected) {
          const firstVis = Array.from(document.querySelectorAll(ICD_INPUT_SELECTOR)).find(hlxIsVisible);
          icdScope = hlxIcdScopeOf(currentInput.isConnected ? currentInput : firstVis);
        }
        const listFn = () => hlxIcdInputs(icdScope);
        const icdInputs = listFn();
        if (!icdInputs.length) return;
        let idx = icdInputs.indexOf(currentInput);

        if (idx === -1) idx = idxAtKey >= 0 ? Math.min(idxAtKey, icdInputs.length - 1) : icdInputs.length - 1;

        if (idx + 1 < icdInputs.length) {
          const nextInput = icdInputs[idx + 1];
          nextInput.focus();
          hlxSuppressIcdLong(nextInput);
        } else {
          const countBefore = icdInputs.length;
          const focusNew = (newInput) => {
            hlxSuppressIcdLong(newInput);
            newInput.focus();
          };
          const refInput = icdInputs[icdInputs.length - 1];
          const addBtn = findAddIcdRowButton(refInput);
          if (addBtn) {
            addBtn.click();

            waitForNewIcdInput(countBefore, focusNew, 20, () => {
              const retryBtn = findAddIcdRowButton(refInput);
              if (retryBtn) {
                retryBtn.click();
                waitForNewIcdInput(countBefore, focusNew, 20, null, listFn);
              }
            }, listFn);
          }
        }
      }

      setTimeout(advance, ICD_ENTER_FOCUS_DELAY);
    },
    true
  );

  hlxDocListen(
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
  hlxDocListen(
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

  function hlxCurrentIcdContainer() {
    const activeInput = document.activeElement;
    if (activeInput && activeInput.matches && activeInput.matches(ICD_INPUT_SELECTOR)) {
      const c = activeInput.closest(ICD_CONTAINER_SELECTOR);
      if (c) return c;
    }
    const opened = document.querySelector(ICD_CONTAINER_SELECTOR + ' .ng-select-opened, ' + ICD_CONTAINER_SELECTOR + ' .ng-select-focused');
    if (opened) {
      const c = opened.closest(ICD_CONTAINER_SELECTOR);
      if (c) return c;
    }
    const openedOuter = document.querySelector('.ng-select-opened');
    if (openedOuter) {
      const c = openedOuter.closest(ICD_CONTAINER_SELECTOR);
      if (c) return c;
    }
    return document.querySelector(ICD_CONTAINER_SELECTOR + '.icd-row-focused');
  }

  function markDuplicateIcdOptions(panel) {
    if (!isHelixfastEnabled()) return;
    const currentContainer = hlxCurrentIcdContainer();
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
  if (!HLX_OFF) dropdownWatchObserver.observe(document.body, { childList: true, subtree: true });

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

  hlxDocListen(
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
  if (!HLX_OFF) pharmacyMenuObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ['class'],
    subtree: true,
  });

  hlxDocListen(
    'keydown',
    (e) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      if (!isHelixfastEnabled()) return;
      const dropdownRoot =
        e.target.closest && e.target.closest('.ui.dropdown.search, .ui.search.dropdown, .ui.dropdown');
      if (!dropdownRoot) return;
      const menu = dropdownRoot.querySelector('.menu');
      if (!menu) return;

      const items = getVisiblePharmacyItems(menu);
      if (!items.length) return;

      const currentIndex = items.findIndex((it) => it.classList.contains('selected'));
      // Quay vòng: ↑ ở đầu danh sách → xuống cuối; ↓ ở cuối danh sách → lên đầu
      const wrapTo = e.key === 'ArrowUp'
        ? (currentIndex === 0 ? items[items.length - 1] : null)
        : (currentIndex === items.length - 1 && items.length > 1 ? items[0] : null);
      if (wrapTo) {
        e.preventDefault();
        e.stopPropagation();
        items[currentIndex].classList.remove('selected');
        wrapTo.classList.add('selected');
        wrapTo.scrollIntoView({ block: 'nearest' });
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
    chong_mat: { label: 'chóng mặt', tinhchat: ['choáng váng', 'cảm giác xoay tròn', 'mất thăng bằng'], vitri: ['xuất hiện khi thay đổi tư thế', 'xuất hiện liên tục không phụ thuộc tư thế', 'xuất hiện khi gắng sức'], kemtheo: ['buồn nôn/nôn', 'ù tai', 'nhìn mờ', 'yếu tay chân', 'đau đầu', 'không kèm triệu chứng khác'] },
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
    dau_hong: { label: 'đau họng', tinhchat: ['rát họng', 'nuốt đau', 'nuốt vướng'], kemtheo: ['ho', 'sốt', 'khàn tiếng', 'sưng hạch cổ', 'không kèm triệu chứng khác'] },
    ngua_diung: { label: 'ngứa, nổi mẩn da', vitri: ['khu trú một vùng', 'lan toàn thân'], tinhchat: ['mẩn đỏ', 'sẩn phù', 'mụn nước'], kemtheo: ['sốt', 'sưng môi/mắt', 'khó thở', 'không kèm triệu chứng khác'] },
    mat_ngu: { label: 'mất ngủ', tinhchat: ['khó vào giấc', 'ngủ không sâu giấc, hay tỉnh giấc', 'thức dậy sớm, khó ngủ lại'], kemtheo: ['lo âu, căng thẳng', 'đau đầu', 'mệt mỏi ban ngày', 'không kèm triệu chứng khác'] },
    chan_an: { label: 'chán ăn, sụt cân', tinhchat: ['sụt cân dưới 5% trọng lượng cơ thể', 'sụt cân trên 5% trọng lượng cơ thể'], kemtheo: ['mệt mỏi', 'sốt kéo dài', 'đau bụng', 'không kèm triệu chứng khác'] },
    tao_bon: { label: 'táo bón', tinhchat: ['đại tiện dưới 3 lần/tuần', 'phân cứng, khó rặn'], kemtheo: ['đau bụng', 'chướng bụng', 'đại tiện ra máu', 'không kèm triệu chứng khác'] },
    dau_mat_do: { label: 'đau mắt đỏ', vitri: ['một bên mắt', 'hai bên mắt'], tinhchat: ['cộm, ngứa mắt', 'chảy nước mắt, tiết dử'], kemtheo: ['nhìn mờ', 'sợ ánh sáng', 'sưng mí mắt', 'không kèm triệu chứng khác'] },
    u_tai: { label: 'ù tai, nghe kém', vitri: ['một bên tai', 'hai bên tai'], kemtheo: ['chóng mặt', 'đau tai', 'chảy dịch tai', 'không kèm triệu chứng khác'] },
    te_bi: { label: 'tê bì tay chân', vitri: ['đầu chi hai tay', 'đầu chi hai chân', 'nửa người một bên'], kemtheo: ['yếu cơ', 'đau', 'không kèm triệu chứng khác'] },
    chan_thuong: { label: 'chấn thương, té ngã', vitri: ['vùng tay', 'vùng chân', 'vùng đầu mặt', 'vùng lưng/hông'], tinhchat: ['xây xát da', 'bầm tím, sưng nề', 'nghi ngờ gãy xương'], kemtheo: ['đau nhiều khi vận động', 'chảy máu vết thương', 'hạn chế vận động', 'không kèm triệu chứng khác'] },
    dau_rang: { label: 'đau răng, đau miệng', vitri: ['một răng', 'nhiều răng', 'vùng nướu/lợi'], kemtheo: ['sưng nướu', 'sốt', 'hôi miệng', 'không kèm triệu chứng khác'] },
    chay_mau: { label: 'chảy máu bất thường', vitri: ['chảy máu cam', 'chảy máu chân răng', 'xuất huyết dưới da', 'ra huyết âm đạo bất thường'], kemtheo: ['chóng mặt', 'mệt mỏi', 'không kèm triệu chứng khác'] },
  };
  const HS_REASON_ORDER = [
    'tai_kham', 'dau_bung', 'dau_dau', 'chong_mat', 'dau_nguc', 'dau_vaigay', 'tieu_kho', 'tieu_long',
    'ho', 'dau_hong', 'sot', 'kho_tho', 'dau_khop', 'dau_lung', 'non', 'phu', 'met_moi',
    'ngua_diung', 'mat_ngu', 'chan_an', 'tao_bon', 'dau_mat_do', 'u_tai', 'te_bi', 'chan_thuong', 'dau_rang', 'chay_mau',
    'khac',
  ];
  const HS_REASON_LABELS = {
    tai_kham: 'Tái khám (bệnh mạn tính)', dau_bung: 'Đau bụng', dau_dau: 'Đau đầu', chong_mat: 'Chóng mặt',
    dau_nguc: 'Đau ngực', dau_vaigay: 'Đau vai gáy', tieu_kho: 'Tiểu khó', tieu_long: 'Tiêu lỏng', ho: 'Ho',
    dau_hong: 'Đau họng', sot: 'Sốt', kho_tho: 'Khó thở', dau_khop: 'Đau khớp', dau_lung: 'Đau lưng',
    non: 'Buồn nôn/nôn', phu: 'Phù', met_moi: 'Mệt mỏi', ngua_diung: 'Ngứa, nổi mẩn da', mat_ngu: 'Mất ngủ',
    chan_an: 'Chán ăn, sụt cân', tao_bon: 'Táo bón', dau_mat_do: 'Đau mắt đỏ', u_tai: 'Ù tai, nghe kém',
    te_bi: 'Tê bì tay chân', chan_thuong: 'Chấn thương, té ngã', dau_rang: 'Đau răng, đau miệng',
    chay_mau: 'Chảy máu bất thường', khac: 'Khác (tự nhập)',
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

  const HS_MAX_REASONS = 4;

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

  function hsMakeSelectWithOther(id, options, placeholder) {
    const wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'column';
    wrap.style.gap = '3px';

    const sel = hsMakeSelect(id, options);
    wrap.appendChild(sel);

    const other = document.createElement('input');
    other.type = 'text';
    other.className = 'his-hs-field';
    other.id = `${id}-other`;
    other.placeholder = placeholder || 'Khác (tự gõ nếu danh sách không có)';
    other.style.fontSize = '12px';
    other.style.boxSizing = 'border-box';
    other.addEventListener('input', () => {
      sel.disabled = !!other.value.trim();
    });
    wrap.appendChild(other);

    return wrap;
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

    const otherRow = document.createElement('div');
    otherRow.style.marginTop = '4px';
    otherRow.style.paddingTop = '4px';
    otherRow.style.borderTop = '1px dashed #dfe3e8';
    const otherInput = document.createElement('input');
    otherInput.type = 'text';
    otherInput.className = 'his-hs-field';
    otherInput.id = `${idPrefix}-other`;
    otherInput.placeholder = 'Khác (ghi thêm, cách nhau bằng dấu phẩy)';
    otherInput.style.fontSize = '12px';
    otherInput.style.width = '100%';
    otherInput.style.boxSizing = 'border-box';
    otherRow.appendChild(otherInput);
    wrap.appendChild(otherRow);

    return wrap;
  }

  function hsGetOtherKemTheo(idPrefix) {
    const input = document.getElementById(`${idPrefix}-other`);
    if (!input || !input.value) return [];
    return input.value
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter((s) => s);
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
      '<div><div class="his-hs-search-wrap">' +
      '<input type="text" id="his-hs-search" class="his-hs-search" placeholder="🔍 Tìm lý do vào viện (vd: đau, ho, sốt...)" autocomplete="off">' +
      '<span id="his-hs-search-clear" class="his-hs-search-clear" title="Xóa từ khóa">✕</span>' +
      '</div></div>' +
      '<div id="his-hs-search-hint" class="his-hs-search-hint"></div>' +
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
    const reasonRows = [];
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
      reasonRows.push({ key, row, label: HS_REASON_LABELS[key], cb });

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

    const searchInput = panel.querySelector('#his-hs-search');
    const searchClear = panel.querySelector('#his-hs-search-clear');
    const searchHint = panel.querySelector('#his-hs-search-hint');
    const hsNorm = (str) =>
      String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();

    function applyReasonFilter() {
      const q = hsNorm(searchInput.value);
      searchClear.style.display = q ? 'block' : 'none';
      let matched = 0;
      reasonRows.forEach((r) => {
        const isOther = r.key === 'khac';
        r.row.classList.remove('his-hs-reason-hl');
        if (!q) { r.row.style.display = 'flex'; return; }
        const hit = hsNorm(r.label).includes(q);
        if (hit && !isOther) matched++;

        r.row.style.display = (hit || isOther || r.cb.checked) ? 'flex' : 'none';
      });
      const noMatch = !!q && matched === 0;
      searchHint.style.display = noMatch ? 'block' : 'none';
      if (noMatch) {
        searchHint.textContent = 'Không có lý do nào khớp "' + searchInput.value.trim() + '". Hãy chọn mục "Khác (tự nhập)" để tự nhập lý do.';
        const other = reasonRows.find((r) => r.key === 'khac');
        if (other) other.row.classList.add('his-hs-reason-hl');
      }
    }
    searchInput.addEventListener('input', applyReasonFilter);
    searchInput.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') { searchInput.value = ''; applyReasonFilter(); }
    });
    searchInput.addEventListener('keyup', (e) => e.stopPropagation());
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      applyReasonFilter();
      searchInput.focus();
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
      if (def.vitri) block.appendChild(fieldRow('Vị trí / hoàn cảnh', hsMakeSelectWithOther(`hs-f-${key}-vitri`, def.vitri)));
      if (def.tinhchat) block.appendChild(fieldRow('Tính chất', hsMakeSelectWithOther(`hs-f-${key}-tinhchat`, def.tinhchat)));
      block.appendChild(fieldRow('Mức độ', hsMakeSelect(`hs-f-${key}-mucdo`, HS_COMMON.mucdo)));
      if (def.lan) block.appendChild(fieldRow('Đặc điểm thêm', hsMakeSelectWithOther(`hs-f-${key}-lan`, def.lan)));
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
      ['vitri', 'tinhchat', 'lan'].forEach((field) => {
        const otherEl = document.getElementById(`${prefix}${field}-other`);
        if (otherEl && otherEl.value.trim()) values[field] = otherEl.value.trim();
      });
      const kemtheoId = `${prefix}kemtheo`;
      if (document.getElementById(kemtheoId)) {
        values.kemtheo = hsGetCheckedValues(kemtheoId).concat(hsGetOtherKemTheo(kemtheoId));
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
      searchInput.value = '';
      applyReasonFilter();
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
      panel.style.transform = 'none';
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

    const roots = [];
    const pharmacyMain = document.getElementById('pharmacy');
    if (pharmacyMain) roots.push(pharmacyMain);
    // Popup kê toa (vd: "Thêm tờ điều trị" ở nội trú) cũng xử lý giống tab Kê toa
    document.querySelectorAll('.p-dialog').forEach((d) => {
      if (roots.indexOf(d) === -1 && d.querySelector('input[formcontrolname="quantity_unit_s"]')) roots.push(d);
    });
    roots.forEach(fixPharmacyDosageRowIn);
  }

  function fixPharmacyDosageRowIn(pharmacyTab) {

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

  if (!HLX_OFF) fixPharmacyDosageRow();
  if (!HLX_OFF) setInterval(fixPharmacyDosageRow, 300);
  if (!HLX_OFF) new MutationObserver(() => fixPharmacyDosageRow()).observe(document.body, {
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

  // Có 2 vùng Đơn thuốc giống nhau (tab Đơn thuốc ở trang khám + dialog "Thêm tờ điều trị").
  // document.querySelector luôn lấy vùng đầu tiên trong DOM -> chọn đúng vùng đang dùng.
  function hlxQ(sel) {
    const ae = document.activeElement;
    const root = ae && ae.closest ? ae.closest('app-medical-pharmacy') : null;
    if (root) { const r = root.querySelector(sel); if (r) return r; }
    const vis = Array.from(document.querySelectorAll(sel)).filter((e) => e.getClientRects().length > 0);
    if (vis.length) {
      const inDlg = vis.filter((e) => e.closest('.p-dialog'));
      return inDlg.length ? inDlg[inDlg.length - 1] : vis[vis.length - 1];
    }
    return document.querySelector(sel);
  }

  function focusFieldBySelector(selector, attemptsLeft) {
    if (attemptsLeft === undefined) attemptsLeft = 10;
    const el = hlxQ(selector);
    if (el) {
      el.focus();
      if (typeof el.select === 'function') el.select();
      return;
    }
    if (attemptsLeft > 0) {
      setTimeout(() => focusFieldBySelector(selector, attemptsLeft - 1), 50);
    }
  }

  const HLX_DAY_HOLD_MS = 1500;
  let hlxDayHoldTimer = null;
  let hlxDayHoldCleanup = null;
  function hlxStopDayHold() {
    if (hlxDayHoldTimer) { clearInterval(hlxDayHoldTimer); hlxDayHoldTimer = null; }
    if (hlxDayHoldCleanup) { hlxDayHoldCleanup(); hlxDayHoldCleanup = null; }
  }
  function hlxHoldDayFocus() {
    hlxStopDayHold();
    const until = Date.now() + HLX_DAY_HOLD_MS;
    const release = () => hlxStopDayHold();
    const onKey = (e) => { if (e.isTrusted) release(); };
    const onMouse = (e) => { if (e.isTrusted) release(); };

    const attachTimer = setTimeout(() => {
      document.addEventListener('keydown', onKey, true);
      document.addEventListener('mousedown', onMouse, true);
    }, 30);
    hlxDayHoldCleanup = () => {
      clearTimeout(attachTimer);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('mousedown', onMouse, true);
    };
    hlxDayHoldTimer = setInterval(() => {
      if (Date.now() > until) { hlxStopDayHold(); return; }
      const el = hlxQ(SUPPLY_DAY_SELECTOR);
      if (!el || el.disabled) return;
      if (document.activeElement !== el) {
        try { el.focus({ preventScroll: true }); } catch (err) { el.focus(); }
        if (typeof el.select === 'function') el.select();
      } else if (el.value && (el.selectionStart !== 0 || el.selectionEnd !== el.value.length)) {

        if (typeof el.select === 'function') el.select();
      }
    }, 40);
  }

  // Sau khi nạp: giữ focus ở ô Thuốc (HIS render lại bảng/form hay lấy mất focus) cho tới khi người dùng tự bấm phím/chuột
  let hlxThuocHoldTimer = null;
  let hlxThuocHoldCleanup = null;
  function hlxStopThuocHold() {
    if (hlxThuocHoldTimer) { clearInterval(hlxThuocHoldTimer); hlxThuocHoldTimer = null; }
    if (hlxThuocHoldCleanup) { hlxThuocHoldCleanup(); hlxThuocHoldCleanup = null; }
  }
  function hlxHoldThuocFocus(durationMs) {
    hlxStopThuocHold();
    const until = Date.now() + (durationMs || 4000);
    const release = () => hlxStopThuocHold();
    const onKey = (e) => { if (e.isTrusted) release(); };
    const onMouse = (e) => { if (e.isTrusted) release(); };
    // Chờ 400ms mới bắt đầu lắng nghe, để không tự huỷ bởi phím Enter vừa bấm
    const attachTimer = setTimeout(() => {
      document.addEventListener('keydown', onKey, true);
      document.addEventListener('mousedown', onMouse, true);
    }, 400);
    hlxThuocHoldCleanup = () => {
      clearTimeout(attachTimer);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('mousedown', onMouse, true);
    };
    hlxThuocHoldTimer = setInterval(() => {
      if (Date.now() > until) { hlxStopThuocHold(); return; }
      const el = hlxQ(PHARMACY_SEARCH_SELECTOR);
      if (!el || el.disabled) return;
      if (document.activeElement !== el) {
        try { el.focus({ preventScroll: true }); } catch (err) { el.focus(); }
      }
    }, 50);
  }

  function getTabbableElements() {
    const nodes = Array.from(
      document.querySelectorAll('input, select, textarea, button, [tabindex]')
    );
    return nodes.filter((el) => {
      if (el.disabled) return false;
      if (el.type === 'hidden') return false;
      if (el.tabIndex === -1) return false;
      if (el.closest && el.closest('p-autocomplete[formcontrolname="patient_note"]')) return false;
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

  const DRUG_USAGE_SELECTOR = 'input[formcontrolname="drug_usage"]';
  const NOTE_INPUT_SELECTOR = 'p-autocomplete[formcontrolname="patient_note"] input';
  const DOSE_FIELDS = [
    { sel: 'input[formcontrolname="quantity_unit_s"]', label: 'Sáng' },
    { sel: 'input[formcontrolname="quantity_unit_tr"]', label: 'Trưa' },
    { sel: 'input[formcontrolname="quantity_unit_c"]', label: 'Chiều' },
    { sel: 'input[formcontrolname="quantity_unit_t"]', label: 'Tối' },
  ];

  function hlxSetInputValue(el, val) {
    const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    if (desc && desc.set) desc.set.call(el, val); else el.value = val;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function hlxDoseUnitText() {
    const first = hlxQ(DOSE_FIELDS[0].sel);
    if (!first) return '';

    let node = first.parentElement;
    for (let i = 0; node && i < 5; i++, node = node.parentElement) {
      const t = node.querySelector('ng-selector .text');
      if (t) return (t.textContent || '').replace(/\s+/g, ' ').trim();
    }
    return '';
  }

  function hlxBuildDoseText() {
    const unitRaw = hlxDoseUnitText();
    const unit = unitRaw ? unitRaw.charAt(0).toUpperCase() + unitRaw.slice(1) : '';
    const parts = [];
    for (const f of DOSE_FIELDS) {
      const el = hlxQ(f.sel);
      if (!el) continue;
      const raw = (el.value || '').trim();
      if (!raw) continue;
      if (/^0+([.,]0*)?$/.test(raw)) continue;
      parts.push(f.label + ': ' + raw + (unit ? ' ' + unit : ''));
    }
    return parts.join(', ');
  }

  function hlxClearUsage() {
    if (hlxDoseNative()) return;
    document.querySelectorAll(DRUG_USAGE_SELECTOR).forEach((u) => {
      if ((u.value || '') === '') return;
      if (document.activeElement === u) return;
      hlxSetInputValue(u, '');
    });
  }

  let hlxNoteGuardUntil = 0;
  function hlxUpdateNoteAcClass() {
    if (hlxDoseNative()) { document.body.classList.remove('hlx-note-ac'); return; }
    const inp = hlxQ(NOTE_INPUT_SELECTOR);
    const focused = !!inp && document.activeElement === inp;
    document.body.classList.toggle('hlx-note-ac', focused || Date.now() < hlxNoteGuardUntil);
  }
  function hlxEnsureNoteAcCss() {
    if (document.getElementById('hlx-note-ac-css')) return;
    const st = document.createElement('style');
    st.id = 'hlx-note-ac-css';
    st.textContent = 'body.hlx-note-ac .p-autocomplete-panel{display:none !important;}';
    (document.head || document.documentElement).appendChild(st);
  }
  function hlxCloseNoteSuggest(inp) {
    try {
      const ev = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true });
      try { Object.defineProperty(ev, 'which', { value: 27 }); Object.defineProperty(ev, 'keyCode', { value: 27 }); } catch (err) {}
      inp.dispatchEvent(ev);
    } catch (err) {  }
  }
  let hlxNoteSyncGen = 0;
  function hlxScheduleNoteSync(delays) {
    const gen = ++hlxNoteSyncGen;
    delays.forEach((d) => setTimeout(() => {
      if (gen !== hlxNoteSyncGen) return;
      try { if (isHelixfastEnabled()) hlxSyncNote(); } catch (err) {}
    }, d));
  }
  if (!HLX_OFF) {
    hlxEnsureNoteAcCss();
    hlxDocListen('focusin', hlxUpdateNoteAcClass, true);
    hlxDocListen('focusout', () => { setTimeout(hlxUpdateNoteAcClass, 0); }, true);
    hlxDocListen('input', (e) => {
      if (e.isTrusted && e.target && e.target.matches && e.target.matches(NOTE_INPUT_SELECTOR)) hlxNoteSyncGen++;
    }, true);
  }

  function hlxSyncNote() {
    if (hlxDoseNative()) return;
    const inp = hlxQ(NOTE_INPUT_SELECTOR);
    if (!inp || !hlxQ(DOSE_FIELDS[0].sel)) return;
    const cur = inp.value || '';
    const text = hlxBuildDoseText();
    if (cur === text) return;
    const prevFocus = document.activeElement;
    hlxEnsureNoteAcCss();
    hlxNoteGuardUntil = Date.now() + 1200;
    hlxUpdateNoteAcClass();
    hlxSetInputValue(inp, text);

    [0, 120, 350, 700].forEach((d) => setTimeout(() => hlxCloseNoteSuggest(inp), d));
    setTimeout(hlxUpdateNoteAcClass, 1250);

    if (prevFocus && prevFocus !== document.body && document.activeElement !== prevFocus && prevFocus.focus) {
      try { prevFocus.focus({ preventScroll: true }); } catch (err) {  }
    }
  }

  // Tổng S.Lg = Số ngày × (Sáng + Trưa + Chiều + Tối), làm tròn lên thành số nguyên (vd 0,5 viên × 7 ngày = 3,5 → 4)
  function hlxParseNum(raw) {
    const v = String(raw || '').trim().replace(',', '.');
    if (!v) return 0;
    const fr = v.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
    if (fr) return parseFloat(fr[2]) ? parseFloat(fr[1]) / parseFloat(fr[2]) : 0;
    const n = parseFloat(v);
    return isFinite(n) ? n : 0;
  }
  function hlxSyncTotal() {
    if (hlxDoseNative()) return;
    const qty = hlxQ(SUPPLY_QTY_SELECTOR);
    const day = hlxQ(SUPPLY_DAY_SELECTOR);
    if (!qty || !day || qty.disabled || qty.readOnly) return;
    if (document.activeElement === qty) return; // người dùng đang tự sửa Tổng S.Lg: không ghi đè
    const days = hlxParseNum(day.value);
    let perDay = 0;
    for (const f of DOSE_FIELDS) {
      const el = hlxQ(f.sel);
      if (el) perDay += hlxParseNum(el.value);
    }
    if (!(days > 0) || !(perDay > 0)) return;
    const total = String(Math.ceil(days * perDay - 1e-9));
    if ((qty.value || '').trim() === total) return;
    hlxSetInputValue(qty, total);
  }
  let hlxTotalGen = 0;
  function hlxScheduleTotalSync(delays) {
    const gen = ++hlxTotalGen;
    delays.forEach((d) => setTimeout(() => {
      if (gen !== hlxTotalGen) return;
      try { if (isHelixfastEnabled()) hlxSyncTotal(); } catch (err) {}
    }, d));
  }

  function hlxPrepareNote() {
    const nat = hlxDoseNative();
    document.querySelectorAll(NOTE_INPUT_SELECTOR).forEach((inp) => {
      if (nat) {
        // Trả ô Ghi chú về nguyên bản: bỏ tabindex=-1 do Helixfast đặt
        if (inp.dataset.hlxTabOff) { inp.setAttribute('tabindex', '0'); delete inp.dataset.hlxTabOff; }
        return;
      }
      if (inp.getAttribute('tabindex') !== '-1') { inp.setAttribute('tabindex', '-1'); inp.dataset.hlxTabOff = '1'; }
    });
  }

  // Ô "Ghi chú" chỉ dùng để sinh Cách dùng tự động: KHÔNG bao giờ được nhận focus trừ khi người dùng tự click chuột vào.
  // Mọi lần focus còn lại (Tab, do PrimeNG autocomplete tự focus sau khi ghi giá trị, async...) đều bị trả focus về ô đang nhập.
  let hlxLastRxField = null;
  let hlxNoteClickAt = 0;
  if (!HLX_OFF) {
    hlxDocListen('mousedown', (e) => {
      const t = e.target;
      if (e.isTrusted && t && t.closest && t.closest('p-autocomplete[formcontrolname="patient_note"]')) hlxNoteClickAt = Date.now();
    }, true);
    hlxDocListen('focusin', (e) => {
      if (!isHelixfastEnabled() || hlxDoseNative()) return;
      const t = e.target;
      if (!t || !t.matches || !t.closest || !t.closest('app-medical-pharmacy')) return;
      if (t.matches(NOTE_INPUT_SELECTOR)) {
        if (Date.now() - hlxNoteClickAt < 600) return;
        const prev = hlxLastRxField;
        if (prev && prev !== t && document.contains(prev) && !prev.disabled && prev.getClientRects().length > 0) {
          try { t.blur(); } catch (err) {}
          try { prev.focus({ preventScroll: true }); } catch (err) { prev.focus(); }
        }
        return;
      }
      if (t.matches('input, textarea, select, button')) hlxLastRxField = t;
    }, true);
  }

  function hlxRxTick() {
    if (!isHelixfastEnabled()) return;
    hlxPrepareNote();
    hlxClearUsage();
  }

  if (!HLX_OFF) {
    setInterval(() => { try { hlxRxTick(false); } catch (err) {} }, 120);

    const hlxUsageFrame = () => {
      try {
        const u = hlxQ(DRUG_USAGE_SELECTOR);
        if (u && u.value !== '' && document.activeElement !== u && isHelixfastEnabled()) hlxClearUsage();
      } catch (err) {  }
      requestAnimationFrame(hlxUsageFrame);
    };
    requestAnimationFrame(hlxUsageFrame);

    hlxDocListen('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== 'Tab') return;
      const t = e.target;
      if (!t || !t.matches) return;
      if (t.matches(QUANTITY_UNIT_SELECTOR) || t.matches(SUPPLY_DAY_SELECTOR)) {
        hlxScheduleNoteSync([0, 30, 150, 350]);
      } else if (t.matches(PHARMACY_SEARCH_SELECTOR)) {
        hlxScheduleNoteSync([150, 400, 800, 1300]);
      }
    }, true);

    // Thời gian thực: gõ/xóa/dán ở Số ngày, Sáng, Trưa, Chiều, Tối, Tổng S.Lg → sinh Cách dùng ở Ghi chú ngay, không chờ Tab/Enter
    hlxDocListen('input', (e) => {
      if (!e.isTrusted) return;
      const t = e.target;
      if (!t || !t.matches || !isHelixfastEnabled()) return;
      if (t.matches(QUANTITY_UNIT_SELECTOR) || t.matches(SUPPLY_DAY_SELECTOR) || t.matches(SUPPLY_QTY_SELECTOR)) {
        hlxScheduleNoteSync([0, 40, 150]);
      }
      // Số ngày / Sáng-Trưa-Chiều-Tối đổi → tính lại Tổng S.Lg ngay (gõ trực tiếp ở Tổng S.Lg thì giữ nguyên)
      if (t.matches(QUANTITY_UNIT_SELECTOR) || t.matches(SUPPLY_DAY_SELECTOR)) {
        hlxScheduleTotalSync([0, 60, 200]);
      }
    }, true);

    hlxDocListen('click', (e) => {
      const btn = e.target && e.target.closest ? e.target.closest('button[type="submit"]') : null;
      if (!btn || btn.textContent.replace(/\s+/g, ' ').trim() !== 'Nạp') return;
      try { hlxRxTick(true); } catch (err) {}
    }, true);

    hlxDocListen('click', (e) => {
      const btn = e.target && e.target.closest ? e.target.closest('button') : null;
      if (!btn || btn.textContent.replace(/\s+/g, ' ').trim() !== 'Lưu lại') return;
      try { hlxRxTick(true); } catch (err) {}
    }, true);
  }

  const SUPPLY_QTY_RECALC_DELAY_MS = 50;
  const NAP_BUTTON_WAIT_RETRY_GAP_MS = 150;

  function findNapButton() {
    const label = (btn) => btn.textContent.replace(/\s+/g, ' ').trim();
    const candidates = Array.from(document.querySelectorAll('button[type="submit"]'));
    const nap = candidates.find((btn) => label(btn) === 'Nạp');
    if (nap) return nap;
    // Đang sửa dòng thuốc có sẵn: nút Nạp đổi tên thành "Lưu lại"/"Cập nhật" (cùng form với ô đang nhập)
    const anchor = hlxQ(SUPPLY_DAY_SELECTOR) || hlxQ(PHARMACY_SEARCH_SELECTOR);
    const form = anchor && anchor.closest ? anchor.closest('form') : null;
    const scope = form || (anchor && anchor.closest ? anchor.closest('app-medical-pharmacy, .p-dialog') : null);
    if (scope) {
      const inScope = Array.from(scope.querySelectorAll('button[type="submit"]')).filter((btn) => btn.offsetParent !== null);
      const edit = inScope.find((btn) => /^(Lưu lại|Cập nhật|Lưu)$/.test(label(btn)) && btn.classList.contains('btn-success'))
        || inScope.find((btn) => /^(Lưu lại|Cập nhật|Lưu)$/.test(label(btn)));
      if (edit) return edit;
    }
    return null;
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

  hlxDocListen(
    'keydown',
    (e) => {
      if (e.key !== 'Enter') return;
      if (!isHelixfastEnabled()) return;
      const target = e.target;
      if (!target || !target.matches) return;

      if (target.matches(PHARMACY_SEARCH_SELECTOR)) {
        setTimeout(() => focusFieldBySelector(SUPPLY_DAY_SELECTOR), 100);
        hlxHoldDayFocus();
        if (!(hlxRouteNative() && hlxDoseNative())) hlxRouteOnPharmacyEnter(target);
        return;
      }

      // Enter ở Số ngày / Sáng-Trưa-Chiều-Tối / Tổng S.Lg: chốt giá trị → web tính lại Tổng S.Lg
      // → sinh Ghi chú → bấm Nạp → quay về ô Thuốc (không nhảy sang ô kế bên)
      if (target.matches(SUPPLY_DAY_SELECTOR) || target.matches(QUANTITY_UNIT_SELECTOR) || target.matches(SUPPLY_QTY_SELECTOR)) {
        e.preventDefault();
        e.stopPropagation();
        // Đang chọn Đ.Dùng tự động: chờ chọn xong rồi mới nạp
        if (hlxRouteSt && !hlxRouteSt.done) { hlxRouteSt.wantNap = true; return; }
        // Chốt giá trị đang gõ để Angular tính lại Tổng S.Lg
        try {
          target.dispatchEvent(new Event('input', { bubbles: true }));
          target.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (err) {}
        setTimeout(() => {
          try { hlxSyncNote(); } catch (err) {}
          rxNapAndRefocus();
        }, 120);
        return;
      }
    },
    true
  );

  // Backspace ở ô trống (Tổng S.Lg / Tối / Chiều / Trưa / Sáng) → lùi về ô liền trước và bôi đen dữ liệu có sẵn.
  // Ô Số ngày là ô đầu hàng: Backspace không lùi đi đâu nữa.
  const HLX_DOSE_BACK_ORDER = [
    SUPPLY_DAY_SELECTOR,
    'input[formcontrolname="quantity_unit_s"]',
    'input[formcontrolname="quantity_unit_tr"]',
    'input[formcontrolname="quantity_unit_c"]',
    'input[formcontrolname="quantity_unit_t"]',
    SUPPLY_QTY_SELECTOR
  ];
  hlxDocListen(
    'keydown',
    (e) => {
      if (e.key !== 'Backspace' || !e.isTrusted || e.isComposing) return;
      if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;
      if (!isHelixfastEnabled()) return;
      const t = e.target;
      if (!t || !t.matches || t.tagName !== 'INPUT') return;
      let idx = -1;
      for (let i = 0; i < HLX_DOSE_BACK_ORDER.length; i++) {
        if (t.matches(HLX_DOSE_BACK_ORDER[i])) { idx = i; break; }
      }
      if (idx < 0) return;
      // Số ngày: giữ hành vi Backspace bình thường, không chuyển ô
      if (idx === 0) return;
      // Còn dữ liệu thì Backspace xóa như bình thường (lần nhấn tiếp theo mới lùi ô)
      if (t.value !== '') return;
      const root = t.closest('#pharmacy, .p-dialog') || document;
      for (let j = idx - 1; j >= 0; j--) {
        const prev = root.querySelector(HLX_DOSE_BACK_ORDER[j]);
        if (!prev || prev.disabled || prev.readOnly || prev.offsetParent === null) continue;
        e.preventDefault();
        e.stopPropagation();
        prev.focus();
        if (typeof prev.select === 'function') prev.select();
        return;
      }
    },
    true
  );

  // ===== Công tắc "Sử dụng chức năng mặc định của Helix" (mặc định TẮT) =====
  const HLX_ROUTE_NATIVE_KEY = 'hlx_route_native_v1';
  const HLX_DOSE_NATIVE_KEY = 'hlx_dose_native_v1';
  function hlxRouteNative() { return hlxStoreGet(HLX_ROUTE_NATIVE_KEY) === '1'; }
  function hlxDoseNative() { return hlxStoreGet(HLX_DOSE_NATIVE_KEY) === '1'; }
  const HLX_NATIVE_HTML = (id, sub) =>
    '<div class="hlx-nat-row"><label class="hlx-nat-sw"><input type="checkbox" class="hlx-nat-cb" id="' + id + '">' +
    '<span class="hlx-nat-tk"></span></label><div><div class="hlx-nat-t">Sử dụng chức năng tự động của Helixfast</div>' +
    '<div class="hlx-nat-sub">' + sub + '</div></div></div>';
  const HLX_NATIVE_CSS = `
      .hlx-nat-row { display: flex; align-items: center; gap: 14px; padding: 12px 22px; background: #fff7ed; border-bottom: 1px solid #fdba74; color: #0f172a; }
      .hlx-nat-t { font-weight: 800; font-size: 14px; color: #0f172a; }
      .hlx-nat-sub { font-size: 12.5px; color: #1e293b; margin-top: 2px; }
      .hlx-nat-sw { position: relative; display: inline-block; width: 46px; height: 26px; flex: 0 0 auto; cursor: pointer; }
      .hlx-nat-cb { position: absolute; opacity: 0; width: 100%; height: 100%; margin: 0; cursor: pointer; }
      .hlx-nat-tk { position: absolute; inset: 0; background: #94a3b8; border-radius: 26px; transition: .15s; }
      .hlx-nat-tk::after { content: ''; position: absolute; left: 3px; top: 3px; width: 20px; height: 20px; background: #fff; border-radius: 50%; transition: .15s; }
      .hlx-nat-cb:checked + .hlx-nat-tk { background: #ea580c; }
      .hlx-nat-cb:checked + .hlx-nat-tk::after { transform: translateX(20px); }
      .hlx-dim { opacity: .35 !important; pointer-events: none !important; filter: grayscale(1); user-select: none; }
  `;

  // ===== Xuất Excel (.xlsx) tối giản, không cần thư viện ngoài =====
  const HLX_CRC_T = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function hlxCrc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = HLX_CRC_T[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function hlxZipStore(files) { // files: [{name, data(string)}]
    const enc = new TextEncoder();
    const parts = []; const central = []; let offset = 0;
    files.forEach((f) => {
      const nameB = enc.encode(f.name); const data = enc.encode(f.data); const crc = hlxCrc32(data);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, 0, true); lh.setUint16(12, 0x21, true); lh.setUint32(14, crc, true);
      lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, nameB.length, true); lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), nameB, data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
      ch.setUint16(10, 0, true); ch.setUint16(12, 0, true); ch.setUint16(14, 0x21, true); ch.setUint32(16, crc, true);
      ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, nameB.length, true);
      ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), nameB);
      offset += 30 + nameB.length + data.length;
    });
    let cdSize = 0; central.forEach((p) => { cdSize += p.length; });
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    return new Blob(parts.concat(central, [new Uint8Array(end.buffer)]), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  // opts: { sheetName, title, subtitle, legend, header[], rows:[{v:[], kind:'' | 'has' | 'new'}], widths[], center:[colIdx] }
  function hlxXlsxBlob(o) {
    const esc = (v) => String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const colL = (i) => String.fromCharCode(65 + i);
    const nC = o.header.length, lastCol = colL(nC - 1);
    const cell = (v, r, c, st) => {
      const ref = colL(c) + (r + 1);
      if (v === '' || v == null) return '<c r="' + ref + '" s="' + st + '"/>';
      if (typeof v === 'number' || /^\d+(\.\d+)?$/.test(String(v))) return '<c r="' + ref + '" s="' + st + '"><v>' + v + '</v></c>';
      return '<c r="' + ref + '" s="' + st + '" t="inlineStr"><is><t xml:space="preserve">' + esc(v) + '</t></is></c>';
    };
    const HR = 4; // dòng tiêu đề bảng
    let sd = '';
    sd += '<row r="1" ht="32" customHeight="1">' + cell(o.title, 0, 0, 2) + '</row>';
    sd += '<row r="2" ht="18" customHeight="1">' + cell(o.subtitle, 1, 0, 3) + '</row>';
    sd += '<row r="3" ht="18" customHeight="1">' + cell(o.legend, 2, 0, 3) + '</row>';
    sd += '<row r="' + HR + '" ht="28" customHeight="1">' + o.header.map((h, i) => cell(h, HR - 1, i, 1)).join('') + '</row>';
    o.rows.forEach((row, ri) => {
      const base = row.kind === 'new' ? 8 : row.kind === 'has' ? 6 : 4;
      sd += '<row r="' + (HR + 1 + ri) + '" ht="22" customHeight="1">' +
        row.v.map((v, ci) => cell(v, HR + ri, ci, base + (o.center.indexOf(ci) !== -1 ? 1 : 0))).join('') + '</row>';
    });
    const lastRow = HR + o.rows.length;
    const X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
    const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
    const thin = '<border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border>';
    const xf = (font, fill, border, h, wrap) => '<xf numFmtId="0" fontId="' + font + '" fillId="' + fill + '" borderId="' + border + '" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="' + h + '" vertical="center"' + (wrap ? ' wrapText="1"' : '') + '/></xf>';
    const styles = X + '<styleSheet xmlns="' + NS + '">' +
      '<fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>' +
      '<font><b/><sz val="18"/><color rgb="FF1E3A8A"/><name val="Calibri"/></font><font><i/><sz val="10"/><color rgb="FF334155"/><name val="Calibri"/></font></fonts>' +
      '<fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FF2D6FC9"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFE3F4E8"/><bgColor indexed="64"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFFFF1BF"/><bgColor indexed="64"/></patternFill></fill></fills>' +
      '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>' + thin + '</borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="10"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
      xf(1, 2, 1, 'center', true) + xf(2, 0, 0, 'left', false) + xf(3, 0, 0, 'left', false) +
      xf(0, 0, 1, 'left', true) + xf(0, 0, 1, 'center', true) + xf(0, 3, 1, 'left', true) + xf(0, 3, 1, 'center', true) +
      xf(0, 4, 1, 'left', true) + xf(0, 4, 1, 'center', true) + '</cellXfs>' +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
    const sheet = X + '<worksheet xmlns="' + NS + '"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>' +
      '<sheetViews><sheetView workbookViewId="0" showGridLines="0"><pane ySplit="' + HR + '" topLeftCell="A' + (HR + 1) + '" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
      '<cols>' + o.widths.map((w, i) => '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>').join('') + '</cols>' +
      '<sheetData>' + sd + '</sheetData>' +
      '<autoFilter ref="A' + HR + ':' + lastCol + lastRow + '"/>' +
      '<mergeCells count="3"><mergeCell ref="A1:' + lastCol + '1"/><mergeCell ref="A2:' + lastCol + '2"/><mergeCell ref="A3:' + lastCol + '3"/></mergeCells>' +
      '<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>' +
      '<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>';
    return hlxZipStore([
      { name: '[Content_Types].xml', data: X + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>' },
      { name: '_rels/.rels', data: X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
      { name: 'xl/workbook.xml', data: X + '<workbook xmlns="' + NS + '" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="' + esc(o.sheetName) + '" sheetId="1" r:id="rId1"/></sheets>' +
        '<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">\'' + esc(o.sheetName) + '\'!$A$' + HR + ':$' + lastCol + '$' + lastRow + '</definedName></definedNames></workbook>' },
      { name: 'xl/_rels/workbook.xml.rels', data: X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
      { name: 'xl/styles.xml', data: styles },
      { name: 'xl/worksheets/sheet1.xml', data: sheet },
    ]);
  }
  function hlxDownloadBlob(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  // ===== Cách dùng tự động: chọn Đ.Dùng theo từ khóa tên thuốc =====
  const HLX_ROUTE_KEY = 'hlx_route_rules_v1';
  // Danh mục Đ.Dùng cố định của HIS (không thêm/sửa được)
  const HLX_ROUTE_LIST = ["Đường hô hấp", "Khí dung", "Uống", "Bơm âm đạo", "Áp ngoài da", "Áp sát khối u", "Bình khí lỏng hoặc nén", "Bình khí nén", "Bôi trực tràng", "Bột đông khô để pha hỗn dịch", "Bột hít", "Cấy vào khối u", "Chiếu ngoài", "Đánh tưa lưỡi", "Đặt dưới lưỡi", "Dung dịch", "Dung dịch rửa", "Dung dịch thẩm phân", "Đường nội khí quản", "Hỗn dịch", "Liposome", "Ngậm", "Ngậm dưới lưỡi", "Nhai", "Nhỏ mũi", "Nhỏ tai", "Phun", "Phun mù", "Polymeric micelle", "Thuốc mắt", "Thuốc mũi", "Tra mắt", "Túi", "Xịt họng", "Xịt mũi", "Tiêm bắp", "Tiêm dưới da", "Tiêm trong da", "Tiêm nội nhãn cầu", "Tiêm tĩnh mạch", "Tiêm trong dịch kính của mắt", "Tiêm truyền tĩnh mạch", "Tiêm vào các khoang của cơ thể", "Tiêm vào ổ khớp", "Nhỏ", "Tiêm", "Tiêm động mạch khối u", "Tiêm vào khoang tự nhiên", "Tiêm vào khối u", "Truyền tĩnh mạch", "Tiêm truyền", "Bôi", "Xoa ngoài", "Dùng ngoài", "Đặt", "Đặt âm đạo", "Đặt hậu môn", "Đặt tử cung", "Thụt", "Thụt hậu môn - trực tràng", "Hít qua đường miệng", "Xịt", "Dán trên da", "nhỏ mắt", "Pha tiêm", "Pha truyền", "Pha truyền qua bơm tiêm điện 1 ml/h", "Pha truyền qua bơm tiêm điện 10 ml/h", "Pha truyền qua bơm tiêm điện 2 ml/h", "Pha truyền qua bơm tiêm điện 20 ml/h", "Pha truyền qua bơm tiêm điện 3 ml/h", "Pha truyền qua bơm tiêm điện 30 ml/h", "Pha truyền qua bơm tiêm điện 40 ml/h", "Pha truyền qua bơm tiêm điện 5 ml/h", "Pha truyền qua bơm tiêm điện 50 ml/h", "Pha truyền qua PCA 1 ml/h", "Pha truyền qua PCA 10 ml/h", "Pha truyền qua PCA 2 ml/h", "Pha truyền qua PCA 20 ml/h", "Pha truyền qua PCA 3 ml/h", "Pha truyền qua PCA 30 ml/h", "Pha truyền qua PCA 40 ml/h", "Pha truyền qua PCA 5 ml/h", "Pha truyền qua PCA 50 ml/h", "Pha truyền tĩnh mạch 10 giọt / phút", "Pha truyền tĩnh mạch 100 giọt / phút", "Pha truyền tĩnh mạch 20 giọt / phút", "Pha truyền tĩnh mạch 30 giọt / phút", "Pha truyền tĩnh mạch 40 giọt / phút", "Pha truyền tĩnh mạch 60 giọt / phút", "Pha truyền tĩnh mạch 80 giọt / phút", "Phun khí dung", "Thở Oxy", "Truyền tĩnh mạch 10 giọt / phút", "Truyền tĩnh mạch 100 giọt / phút", "Truyền tĩnh mạch 20 giọt / phút", "Truyền tĩnh mạch 30 giọt / phút", "Truyền tĩnh mạch 40 giọt / phút", "Truyền tĩnh mạch 60 giọt / phút", "Truyền tĩnh mạch 80 giọt / phút", "Uống sáng trước ăn", "Uống sau ăn", "Uống tối trước ngủ", "Uống trước ăn", "Xịt ngoài da"];
  const HLX_ROUTE_VER = 4;
  const HLX_ROUTE_DEFAULT_RULES = {
    ver: HLX_ROUTE_VER,
    def: 'Uống sau ăn',
    rules: [
      // ---- Thuốc uống: theo bữa ăn ----
      // (đã bỏ 'prazol' vì khớp nhầm Alprazolam; bỏ 'tidin' vì quá rộng -> liệt kê rõ)
      { keywords: ['omeprazol', 'esomeprazol', 'pantoprazol', 'lansoprazol', 'rabeprazol', 'dexlansoprazol', 'ilaprazol',
                   'ranitidin', 'famotidin', 'cimetidin', 'nizatidin',
                   'captopril', 'gliclazid', 'glimepirid', 'repaglinid', 'nateglinid', 'acarbose',
                   'sắt', 'ferrous', 'domperidon', 'metoclopramid', 'sucralfat'], route: 'Uống trước ăn' },
      { keywords: ['magnesi hydroxyd', 'nhôm hydroxyd', 'antacid'], route: 'Uống sau ăn' },
      { keywords: ['diosmec'], route: 'Uống' },
      { keywords: ['attapulgite'], route: 'Nhai' },
      { keywords: ['levothyroxin', 'thyroxin', 'alendronat', 'risedronat', 'ibandronat'], route: 'Uống sáng trước ăn' },
      { keywords: ['simvastatin', 'lovastatin', 'pravastatin', 'zolpidem', 'zopiclon', 'statin', 'fibrat', 'gemfibrozil'], route: 'Uống tối trước ngủ' },
      { keywords: ['nystatin'], route: 'Uống sau ăn' }, // 'statin' sẽ khớp nhầm nystatin (kháng nấm) nên có từ khóa dài hơn để ưu tiên
      { keywords: ['viên ngậm', 'lozenge'], route: 'Ngậm' },

      // ---- Thuốc TIÊM DƯỚI DA ----
      { keywords: ['insulin', 'scilin', 'mixtard', 'actrapid', 'insulatard', 'humulin', 'humalog', 'novorapid', 'novomix',
                   'lantus', 'levemir', 'tresiba', 'toujeo', 'apidra', 'basaglar', 'gensulin', 'wosulin', 'insuman', 'ryzodeg', 'fiasp',
                   'liraglutid', 'victoza', 'saxenda', 'semaglutid', 'ozempic', 'dulaglutid', 'trulicity', 'exenatid', 'tirzepatid', 'mounjaro', 'lyxumia',
                   'glucagon',
                   'enoxaparin', 'lovenox', 'clexane', 'nadroparin', 'fraxiparin', 'dalteparin', 'fragmin', 'fondaparinux', 'arixtra', 'bemiparin',
                   'filgrastim', 'epoetin', 'darbepoetin', 'teriparatid', 'denosumab', 'adalimumab', 'etanercept',
                   'bút tiêm'], route: 'Tiêm dưới da' },
      // ---- Thuốc TIÊM khác ----
      { keywords: ['benzathin', 'bicillin'], route: 'Tiêm bắp' },
      { keywords: ['tuberculin'], route: 'Tiêm trong da' },
      { keywords: ['ceftriaxon', 'cefotaxim', 'ceftazidim', 'cefazolin', 'cefoperazon', 'cefepim', 'cefuroxim natri', 'meropenem', 'imipenem', 'ertapenem',
                   'piperacillin', 'amikacin', 'heparin', 'adrenalin', 'epinephrin'], route: 'Tiêm' },

      // ---- Hô hấp / mắt / mũi / tai / họng ----
      { keywords: ['Salbutamol (dưới dạng salbutamol sulfat)', 'khí dung', 'nebul'], route: 'Phun khí dung' },
      { keywords: ['Salbutamol (dưới dạng Salbutamol Sulfate)', 'xịt họng'], route: 'Xịt họng' },
      { keywords: ['budesonide', 'fluticasone', 'xịt mũi', 'nasal spray'], route: 'Xịt mũi' },
      { keywords: ['bột hít', 'inhaler', 'turbuhaler', 'accuhaler', 'symbicort', 'seretide', 'spiriva'], route: 'Hít qua đường miệng' },
      { keywords: ['Fluorometholon', 'nhỏ mắt', 'eye drop'], route: 'nhỏ mắt' },
      { keywords: ['tra mắt', 'mỡ tra mắt'], route: 'Tra mắt' },
      { keywords: ['nhỏ mũi', 'xylometazolin', 'oxymetazolin'], route: 'Nhỏ mũi' },
      { keywords: ['nhỏ tai'], route: 'Nhỏ tai' },

      // ---- Dùng ngoài / đặt ----
      { keywords: ['kem bôi', 'thuốc mỡ', 'gel bôi', 'thuốc bôi', 'cream', 'ointment', 'mupirocin'], route: 'Bôi' },
      { keywords: ['dùng ngoài', 'povidon'], route: 'Dùng ngoài' },
      { keywords: ['đặt âm đạo'], route: 'Đặt âm đạo' },
      { keywords: ['đặt hậu môn', 'viên đạn', 'suppository'], route: 'Đặt hậu môn' },
      { keywords: ['miếng dán'], route: 'Dán trên da' },
    ],
  };

  function hlxRouteNorm(s) {
    return String(s == null ? '' : s).replace(/ /g, ' ').normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  // Nâng cấp cấu hình đã lưu từ bản cũ: sửa từ khóa khớp nhầm + bổ sung quy tắc thuốc tiêm... (giữ nguyên quy tắc người dùng tự thêm)
  function hlxRouteMigrate(cfg) {
    const ver = cfg.ver || 1;
    // v3: bỏ từ khóa 'neomycin' (không còn tự chọn Nhỏ mắt)
    const dropNeo = () => {
      cfg.rules.forEach((r) => { r.keywords = r.keywords.filter((k) => hlxRouteNorm(k) !== 'neomycin'); });
      cfg.rules = cfg.rules.filter((r) => r.keywords.length);
    };
    // v4: thêm từ khóa nhóm mỡ máu 'statin', 'fibrat', 'gemfibrozil' (+ 'nystatin' để không khớp nhầm)
    const addV4 = () => {
      const have = new Set();
      cfg.rules.forEach((r) => r.keywords.forEach((k) => have.add(hlxRouteNorm(k))));
      [['Uống tối trước ngủ', ['statin', 'fibrat', 'gemfibrozil']], ['Uống sau ăn', ['nystatin']]].forEach((g) => {
        const add = g[1].filter((k) => !have.has(k));
        if (!add.length) return;
        const same = cfg.rules.find((r) => r.route === g[0] && r.keywords.some((k) => hlxRouteNorm(k) === (g[0] === 'Uống sau ăn' ? '\u0000' : 'simvastatin')));
        if (same) same.keywords = same.keywords.concat(add);
        else cfg.rules.push({ keywords: add, route: g[0] });
      });
    };
    if (ver >= 2) { dropNeo(); addV4(); cfg.ver = HLX_ROUTE_VER; return cfg; }
    const SPLIT = {
      prazol: ['omeprazol', 'esomeprazol', 'pantoprazol', 'lansoprazol', 'rabeprazol', 'dexlansoprazol', 'ilaprazol'],
      tidin: ['ranitidin', 'famotidin', 'cimetidin', 'nizatidin'],
    };
    cfg.rules.forEach((r) => {
      const out = [];
      r.keywords.forEach((k) => {
        const nk = hlxRouteNorm(k);
        if (SPLIT[nk]) SPLIT[nk].forEach((x) => out.push(x)); else out.push(k);
      });
      r.keywords = out;
    });
    const have = new Set();
    cfg.rules.forEach((r) => r.keywords.forEach((k) => have.add(hlxRouteNorm(k))));
    HLX_ROUTE_DEFAULT_RULES.rules.forEach((d) => {
      const add = d.keywords.filter((k) => !have.has(hlxRouteNorm(k)));
      if (!add.length) return;
      add.forEach((k) => have.add(hlxRouteNorm(k)));
      const same = cfg.rules.find((r) => r.route === d.route);
      if (same) same.keywords = same.keywords.concat(add);
      else cfg.rules.push({ keywords: add, route: d.route });
    });
    dropNeo();
    addV4();
    cfg.ver = HLX_ROUTE_VER;
    return cfg;
  }

  function hlxRouteLoad() {
    let cfg = null;
    try {
      const raw = hlxStoreGet(HLX_ROUTE_KEY);
      if (raw) cfg = JSON.parse(raw);
    } catch (err) { cfg = null; }
    if (!cfg || !Array.isArray(cfg.rules)) return JSON.parse(JSON.stringify(HLX_ROUTE_DEFAULT_RULES));
    if (HLX_ROUTE_LIST.indexOf(cfg.def) === -1) cfg.def = 'Uống sau ăn';
    cfg.rules = cfg.rules.filter(
      (r) => r && Array.isArray(r.keywords) && HLX_ROUTE_LIST.indexOf(r.route) !== -1
    );
    if ((cfg.ver || 1) < HLX_ROUTE_VER) {
      cfg = hlxRouteMigrate(cfg);
      try { hlxRouteSave(cfg); } catch (err) {}
    }
    return cfg;
  }

  function hlxRouteSave(cfg) {
    hlxStoreSet(HLX_ROUTE_KEY, JSON.stringify(cfg));
  }

  // Đoán Đ.Dùng theo DẠNG BÀO CHẾ trong tên thuốc (chỉ dùng khi không khớp từ khóa nào)
  // -> thuốc tiêm/nhỏ/xịt/bôi... không bị rơi về mặc định "Uống sau ăn"
  function hlxRouteGuessByForm(name) {
    const n = hlxRouteNorm(name);
    const oral = /uống|siro|sirô|syrup|viên|gói|cốm|nhai/.test(n);
    const tests = [
      [/nhỏ mắt|eye drop/, 'nhỏ mắt'],
      [/tra mắt/, 'Tra mắt'],
      [/nhỏ mũi/, 'Nhỏ mũi'],
      [/xịt mũi|nasal spray/, 'Xịt mũi'],
      [/nhỏ tai/, 'Nhỏ tai'],
      [/xịt họng/, 'Xịt họng'],
      [/khí dung|nebul/, 'Phun khí dung'],
      [/đặt âm đạo/, 'Đặt âm đạo'],
      [/đặt hậu môn|viên đạn|suppository/, 'Đặt hậu môn'],
      [/truyền tĩnh mạch|dịch truyền|infusion/, 'Truyền tĩnh mạch'],
      [/bột pha tiêm|pha tiêm|bột đông khô|lyophil/, 'Pha tiêm'],
      [/tiêm|\binj\b|injection|\bvial\b/, 'Tiêm'],
      [/\bkem\b|cream|ointment|thuốc mỡ|gel bôi|thuốc bôi|lotion/, 'Bôi'],
    ];
    for (const t of tests) if (t[0].test(n)) return t[1];
    // Đơn vị "Ống" + nồng độ /ml, không có dấu hiệu thuốc uống -> thuốc tiêm
    if (!oral && /(^|[-–(]\s*)ống\b/.test(n) && /\d\s*(mg|mcg|µg|g|ui|iu|%)\s*\/\s*\d*\s*ml/.test(n)) return 'Tiêm';
    return null;
  }

  // Từ khóa dài/cụ thể nhất khớp tên thuốc được ưu tiên; không khớp thì đoán theo dạng bào chế; cuối cùng mới dùng mặc định
  function hlxRouteResolve(name, cfgIn, unitIn) {
    const cfg = cfgIn || hlxRouteLoad();
    const n = hlxRouteNorm(name);
    let best = null;
    cfg.rules.forEach((r) => {
      r.keywords.forEach((k) => {
        const kk = hlxRouteNorm(k);
        if (kk && n.indexOf(kk) !== -1 && (!best || kk.length > best.kw.length)) best = { route: r.route, kw: kk };
      });
    });
    if (best) return { route: best.route, kw: best.kw };
    // Thuốc VIÊN không khớp từ khóa -> dùng mặc định (Uống sau ăn). Dạng khác (chai, lọ, bút tiêm...) -> để mặc định của máy (route = null)
    // Dạng thuốc lấy theo ô "Đơn vị" của HIS (Viên / Chai / Lọ / Bút / Ống...); chưa có đơn vị thì xét theo tên thuốc
    let u = hlxRouteNorm(unitIn);
    if (/^chọn/.test(u)) u = '';
    const isTablet = u ? u === 'viên' : /viên|nang|tablet|capsule/.test(n);
    if (isTablet) return { route: cfg.def, kw: null };
    return { route: null, kw: null, webDefault: true };
  }
  // ----- end route logic -----

  function hlxRouteEnsureCss() {
    if (document.getElementById('hlx-route-css')) return;
    const st = document.createElement('style');
    st.id = 'hlx-route-css';
    st.textContent = `
      body.hlx-route-guard .ng-dropdown-panel { visibility: hidden !important; }
      #hlx-ctx-menu { position: fixed; z-index: 2147483647; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px;
        box-shadow: 0 8px 24px rgba(15,23,42,.25); padding: 4px; min-width: 150px;
        font-family: -apple-system,Segoe UI,Roboto,Arial,sans-serif; }
      #hlx-ctx-menu button { display: flex; align-items: center; gap: 8px; width: 100%; border: none; background: transparent;
        padding: 7px 12px; font-size: 13px; color: #1e293b; cursor: pointer; border-radius: 5px; text-align: left; }
      #hlx-ctx-menu button:hover { background: #eaf2ff; color: #1a56db; }
      .hlx-rt-overlay { position: fixed; inset: 0; background: rgba(15,23,42,.5); z-index: 999998; }
      .hlx-rt-box { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 780px; max-width: 94vw;
        max-height: 88vh; display: flex; flex-direction: column; background: #fff; border-radius: 14px; overflow: hidden;
        z-index: 999999; box-shadow: 0 24px 64px rgba(15,23,42,.35); color: #0f172a; font-size: 14px;
        font-family: -apple-system,Segoe UI,Roboto,Arial,sans-serif; }
      .hlx-rt-head { background: linear-gradient(135deg,#0f766e,#0f9d78); color: #fff; padding: 14px 20px; display: flex;
        align-items: center; justify-content: space-between; font-weight: 700; font-size: 15px; }
      .hlx-rt-x { cursor: pointer; font-size: 18px; padding: 0 4px; }
      .hlx-rt-body { padding: 14px 20px; overflow-y: auto; flex: 1 1 auto; }
      .hlx-rt-note { font-size: 13px; color: #1e293b; margin-bottom: 10px; line-height: 1.5; }
      .hlx-rt-defrow { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; font-weight: 600; }
      .hlx-rt-h { display: grid; grid-template-columns: 1fr 220px 32px; gap: 8px; font-size: 12px; font-weight: 800;
        color: #0f172a; text-transform: uppercase; letter-spacing: .3px; margin-bottom: 4px; }
      .hlx-rt-row { display: grid; grid-template-columns: 1fr 220px 32px; gap: 8px; align-items: start; margin-bottom: 8px; }
      .hlx-rt-row textarea { width: 100%; box-sizing: border-box; min-height: 56px; resize: vertical; padding: 7px 9px;
        border: 1.5px solid #94a3b8; border-radius: 7px; font-size: 14px; line-height: 1.45; font-family: inherit; background: #fff; }
      .hlx-rt-row textarea:focus, .hlx-rt-sel:focus, .hlx-rt-test:focus { outline: none; border-color: #0f9d78;
        box-shadow: 0 0 0 3px rgba(15,157,120,.18); background: #fff; }
      .hlx-rt-sel { width: 100%; box-sizing: border-box; height: 36px; padding: 0 6px; border: 1.5px solid #94a3b8;
        border-radius: 7px; background: #fff; font-size: 14px; }
      .hlx-rt-del { height: 36px; border: 1px solid #fecaca; background: #fff; color: #dc2626; border-radius: 7px; cursor: pointer; }
      .hlx-rt-del:hover { background: #fee2e2; }
      .hlx-rt-add { border: 1.5px dashed #0f9d78; background: #f0fdf9; color: #0f766e; border-radius: 7px; padding: 6px 14px;
        font-weight: 600; cursor: pointer; margin: 2px 0 14px; }
      .hlx-rt-test-wrap { border-top: 1px solid #eef1f5; padding-top: 12px; }
      .hlx-rt-test { width: 100%; box-sizing: border-box; height: 36px; padding: 0 10px; border: 1.5px solid #94a3b8;
        border-radius: 7px; font-size: 14px; background: #fff; }
      .hlx-rt-res { margin-top: 6px; font-weight: 600; min-height: 18px; color: #0f766e; }
      .hlx-rt-foot { padding: 12px 20px; border-top: 1px solid #eef1f5; background: #fafbfc; display: flex; gap: 8px;
        align-items: center; }
      .hlx-rt-msg { font-weight: 600; font-size: 12.5px; margin-right: auto; margin-left: 8px; }
      .hlx-rt-btn { padding: 8px 16px; border-radius: 8px; font-size: 12.5px; font-weight: 700; cursor: pointer;
        border: 1.5px solid #94a3b8; background: #fff; color: #0f172a; }
      .hlx-rt-btn:hover { background: #f1f5f9; }
      .hlx-rt-btn.primary { background: #0f9d78; border-color: #0f9d78; color: #fff; }
      .hlx-rt-btn.primary:hover { background: #0c8265; }
      .hlx-rt-box textarea, .hlx-rt-box select, .hlx-rt-box input:not([type=checkbox]) { color: #000 !important; -webkit-text-fill-color: #000 !important; opacity: 1 !important; font-weight: 500; }
      .hlx-rt-box select option { color: #000; background: #fff; }
      .hlx-rt-box ::placeholder { color: #475569 !important; opacity: 1 !important; }
      .hlx-rt-box .hlx-rt-btn.primary { color: #fff !important; -webkit-text-fill-color: #fff !important; }
      .hlx-rt-defrow { font-size: 14px; color: #0f172a; }
      .hlx-rt-box { width: 880px; }
      .hlx-rt-body { background: #f8fafc; padding: 14px 20px 8px; }
      .hlx-rt-flow { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; }
      .hlx-rt-step { display: flex; gap: 9px; align-items: flex-start; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px;
        padding: 10px 12px; font-size: 12.5px; line-height: 1.45; color: #1e293b; }
      .hlx-rt-step b { flex: 0 0 22px; height: 22px; border-radius: 50%; background: #0f9d78; color: #fff; display: flex;
        align-items: center; justify-content: center; font-size: 12px; }
      .hlx-rt-step em { color: #64748b; font-style: normal; }
      .hlx-rt-step select { margin-top: 5px; display: block; }
      .hlx-rt-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; margin-bottom: 14px; }
      .hlx-rt-cap { font-size: 12px; font-weight: 800; color: #0f172a; margin-bottom: 6px; }
      .hlx-rt-bar { display: flex; gap: 8px; margin-bottom: 10px; position: sticky; top: -14px; z-index: 2; background: #f8fafc; padding: 6px 0; }
      .hlx-rt-bar input { flex: 1; height: 36px; box-sizing: border-box; padding: 0 12px; border: 1.5px solid #94a3b8; border-radius: 8px; font-size: 14px; background: #fff; }
      .hlx-rt-bar .hlx-rt-add { margin: 0; white-space: nowrap; }
      .hlx-rt-sec { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 10px; overflow: hidden; }
      .hlx-rt-sec > summary { cursor: pointer; list-style: none; padding: 9px 14px; font-weight: 800; font-size: 13.5px;
        display: flex; align-items: center; gap: 8px; background: #f1f5f9; border-left: 5px solid var(--c, #0f9d78); color: #0f172a; }
      .hlx-rt-sec > summary::-webkit-details-marker { display: none; }
      .hlx-rt-sec > summary::before { content: '▸'; transition: transform .12s; display: inline-block; }
      .hlx-rt-sec[open] > summary::before { transform: rotate(90deg); }
      .hlx-rt-cnt { margin-left: auto; font-weight: 700; font-size: 12px; background: #fff; border: 1px solid #cbd5e1;
        border-radius: 999px; padding: 1px 9px; color: #475569; }
      .hlx-rt-secbody { padding: 10px 12px 4px; }
      .hlx-rt-row { grid-template-columns: 1fr 220px 34px; padding: 8px; border: 1px solid #e2e8f0; border-left: 4px solid var(--c, #0f9d78);
        border-radius: 8px; background: #fff; margin-bottom: 8px; }
      .hlx-rt-row[hidden] { display: none; }
      .hlx-rt-row textarea { min-height: 0; background: #fafcff; }
      .hlx-rt-arrow { display: none; }
      .hlx-rt-compact { padding: 8px 12px; margin-bottom: 8px; }
      .hlx-rt-line { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
      .hlx-rt-line .hlx-rt-cap { margin: 0; white-space: nowrap; }
      .hlx-rt-line .hlx-rt-test { flex: 1; }
      .hlx-rt-res { margin-top: 0; }
      .hlx-rt-help { margin-top: 4px; font-size: 12.5px; color: #1e293b; }
      .hlx-rt-help > summary { cursor: pointer; font-weight: 700; color: #0f766e; }
      .hlx-rt-help ol { margin: 6px 0 0; padding-left: 20px; line-height: 1.5; }
      .hlx-rt-empty { text-align: center; color: #64748b; padding: 14px; font-size: 13px; }
      @media (max-width: 820px) { .hlx-rt-flow { grid-template-columns: 1fr; } .hlx-rt-row { grid-template-columns: 1fr; } }
    ` + HLX_NATIVE_CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  function hlxCloseRouteDialog() {
    ['hlx-rt-overlay', 'hlx-rt-box'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) { hlxKeepDrop(el); el.remove(); }
    });
    document.removeEventListener('keydown', hlxRouteDialogEsc, true);
  }
  function hlxRouteDialogEsc(e) {
    if (!e.isTrusted) return; // bỏ qua Escape giả do script khác (ICD/phân trang/ghi chú) bắn ra
    if (e.key === 'Escape') hlxCloseRouteDialog();
  }

  function hlxOpenRouteDialog() {
    hlxCloseRouteDialog();
    hlxRouteEnsureCss();
    const cfg = hlxRouteLoad();

    const overlay = document.createElement('div');
    overlay.id = 'hlx-rt-overlay';
    overlay.className = 'hlx-rt-overlay';
    const box = document.createElement('div');
    box.id = 'hlx-rt-box';
    box.className = 'hlx-rt-box';
    box.innerHTML =
      '<div class="hlx-rt-head"><span>💊 Cách dùng tự động (Đ.Dùng)</span><span class="hlx-rt-x" id="hlx-rt-x">✕</span></div>' +
      HLX_NATIVE_HTML('hlx-rt-nat', 'Bật: dùng các quy tắc bên dưới (script tự chọn Đ.Dùng). Tắt: dùng mặc định của máy, script không can thiệp.') +
      '<div class="hlx-rt-body">' +
      '<div class="hlx-rt-card hlx-rt-compact">' +
        '<div class="hlx-rt-line"><span class="hlx-rt-cap">Thuốc viên không khớp từ khóa → dùng:</span><span id="hlx-rt-def"></span></div>' +
        '<div class="hlx-rt-line"><span class="hlx-rt-cap">🔎 Thử nhanh:</span>' +
        '<input type="text" class="hlx-rt-test" id="hlx-rt-test" placeholder="Gõ tên thuốc, vd: Omeprazol 20mg - Viên"></div>' +
        '<div class="hlx-rt-res" id="hlx-rt-res"></div>' +
        '<details class="hlx-rt-help"><summary>ℹ Cách hoạt động</summary>' +
        '<ol><li><strong>Tên thuốc có chứa từ khóa</strong> trong bảng bên dưới → chọn cách dùng của quy tắc đó (nhiều từ khóa cùng khớp thì lấy từ khóa dài nhất).</li>' +
        '<li><strong>Không chứa từ khóa nào</strong> → xem ô <strong>Đơn vị</strong> của thuốc: nếu là <strong>Viên</strong> thì dùng cách dùng mặc định ở trên.</li>' +
        '<li>Đơn vị khác (Chai, Lọ, Ống, Bút...) → để nguyên mặc định của máy.</li></ol></details>' +
      '</div>' +
      '<div class="hlx-rt-bar"><input type="search" id="hlx-rt-q" placeholder="Lọc quy tắc theo từ khóa hoặc cách dùng...">' +
      '<button type="button" class="hlx-rt-add" id="hlx-rt-add">+ Thêm quy tắc</button></div>' +
      '<div id="hlx-rt-rules"></div>' +
      '</div>' +
      '<div class="hlx-rt-foot">' +
      '<button type="button" class="hlx-rt-btn" id="hlx-rt-reset">Khôi phục mặc định</button>' +
      '<span class="hlx-rt-msg" id="hlx-rt-msg"></span>' +
      '<button type="button" class="hlx-rt-btn" id="hlx-rt-close">Đóng</button>' +
      '<button type="button" class="hlx-rt-btn primary" id="hlx-rt-save">Lưu</button>' +
      '</div>';
    document.body.appendChild(overlay);
    document.body.appendChild(box);
    hlxKeepAdd(overlay, hlxRouteEnsureCss);
    hlxKeepAdd(box, hlxRouteEnsureCss);
    box.addEventListener('keydown', (e) => e.stopPropagation());
    box.addEventListener('keyup', (e) => e.stopPropagation());
    document.addEventListener('keydown', hlxRouteDialogEsc, true);

    const rulesEl = box.querySelector('#hlx-rt-rules');
    const msgEl = box.querySelector('#hlx-rt-msg');
    const resEl = box.querySelector('#hlx-rt-res');
    const testEl = box.querySelector('#hlx-rt-test');

    const makeSelect = (val) => {
      const sel = document.createElement('select');
      sel.className = 'hlx-rt-sel';
      HLX_ROUTE_LIST.forEach((r) => {
        const o = document.createElement('option');
        o.value = r;
        o.textContent = r;
        sel.appendChild(o);
      });
      sel.value = val;
      return sel;
    };
    const defSel = makeSelect(cfg.def);
    defSel.style.width = '200px';
    box.querySelector('#hlx-rt-def').appendChild(defSel);

    const parseKw = (v) => String(v || '').split(/[\n;,]+/).map((x) => x.trim()).filter(Boolean);
    const collect = () => ({
      ver: HLX_ROUTE_VER,
      def: defSel.value,
      rules: Array.from(rulesEl.querySelectorAll('.hlx-rt-row'))
        .map((row) => ({ keywords: parseKw(row._ta.value), route: row._sel.value }))
        .filter((r) => r.keywords.length),
    });
    const updTest = () => {
      const name = testEl.value.trim();
      if (!name) { resEl.textContent = ''; return; }
      const r = hlxRouteResolve(name, collect());
      resEl.textContent = '→ ' + (r.route || 'giữ mặc định của máy') + (r.kw ? '   (khớp từ khóa "' + r.kw + '")' : (r.guess ? '   (đoán theo dạng bào chế)' : (r.webDefault ? '   (không phải thuốc viên)' : '   (thuốc viên → mặc định)')));
    };
    // ---- Nhóm quy tắc theo loại cách dùng ----
    const CATS = [
      { k: 'new', t: '✨ Quy tắc mới thêm', c: '#0f9d78' },
      { k: 'oral', t: '💊 Thuốc uống (theo bữa ăn)', c: '#0f766e' },
      { k: 'inj', t: '💉 Thuốc tiêm / truyền', c: '#b45309' },
      { k: 'resp', t: '👁 Hô hấp · Mắt · Mũi · Tai · Họng', c: '#1d4ed8' },
      { k: 'top', t: '🧴 Dùng ngoài · Đặt · Dán', c: '#7c3aed' },
    ];
    const catOf = (route) => {
      const r = hlxRouteNorm(route);
      if (/^(uống|nhai|ngậm|đặt dưới lưỡi)/.test(r)) return 'oral';
      if (/^(tiêm|pha |truyền)/.test(r)) return 'inj';
      if (/(phun|xịt|hít|nhỏ|tra mắt|thuốc mắt|thuốc mũi|khí dung|thở)/.test(r)) return 'resp';
      return 'top';
    };
    const secs = {};
    const buildSections = () => {
      rulesEl.innerHTML = '';
      CATS.forEach((c) => {
        const d = document.createElement('details');
        d.className = 'hlx-rt-sec';
        d.open = c.k !== 'new';
        d.style.setProperty('--c', c.c);
        d.innerHTML = '<summary><span>' + c.t + '</span><span class="hlx-rt-cnt">0</span></summary><div class="hlx-rt-secbody"></div>';
        rulesEl.appendChild(d);
        secs[c.k] = d;
      });
    };
    const updCounts = () => {
      CATS.forEach((c) => {
        const d = secs[c.k];
        const n = d.querySelectorAll('.hlx-rt-row').length;
        d.querySelector('.hlx-rt-cnt').textContent = n;
        d.style.display = n ? '' : 'none';
      });
    };
    const growTa = (ta) => { ta.rows = Math.max(2, Math.min(7, ta.value.split('\n').length)); };
    const addRow = (rule, catKey) => {
      const ck = catKey || catOf(rule.route || cfg.def);
      const sec = secs[ck];
      const row = document.createElement('div');
      row.className = 'hlx-rt-row';
      row.style.setProperty('--c', (CATS.find((c) => c.k === ck) || CATS[1]).c);
      const ta = document.createElement('textarea');
      ta.placeholder = 'Mỗi từ khóa 1 dòng';
      ta.value = (rule.keywords || []).join('\n');
      growTa(ta);
      ta.addEventListener('input', () => growTa(ta));
      const sel = makeSelect(rule.route || cfg.def);
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'hlx-rt-del';
      del.textContent = '🗑';
      del.title = 'Xóa quy tắc';
      del.addEventListener('click', () => { row.remove(); updCounts(); updTest(); });
      row._ta = ta;
      row._sel = sel;
      row.appendChild(ta);
      row.appendChild(sel);
      row.appendChild(del);
      sec.querySelector('.hlx-rt-secbody').appendChild(row);
      sec.style.display = '';
      return row;
    };
    buildSections();
    cfg.rules.forEach((r) => addRow(r));
    updCounts();

    // Lọc quy tắc
    const qEl = box.querySelector('#hlx-rt-q');
    qEl.addEventListener('input', () => {
      const q = hlxRouteNorm(qEl.value);
      CATS.forEach((c) => {
        const d = secs[c.k];
        let vis = 0;
        d.querySelectorAll('.hlx-rt-row').forEach((row) => {
          const hit = !q || hlxRouteNorm(row._ta.value + ' ' + row._sel.value).indexOf(q) !== -1;
          row.hidden = !hit;
          if (hit) vis++;
        });
        const total = d.querySelectorAll('.hlx-rt-row').length;
        if (q) { d.open = vis > 0; d.style.display = vis > 0 ? '' : 'none'; }
        else { d.style.display = total ? '' : 'none'; d.open = c.k !== 'new'; }
      });
    });

    box.addEventListener('input', updTest);
    box.addEventListener('change', updTest);
    box.querySelector('#hlx-rt-add').addEventListener('click', () => {
      qEl.value = '';
      qEl.dispatchEvent(new Event('input'));
      secs.new.open = true;
      const row = addRow({ keywords: [], route: defSel.value }, 'new');
      row._ta.focus();
    });
    box.querySelector('#hlx-rt-reset').addEventListener('click', () => {
      if (!window.confirm('Khôi phục toàn bộ quy tắc về mặc định ban đầu? (chưa lưu cho đến khi bấm Lưu)')) return;
      buildSections();
      HLX_ROUTE_DEFAULT_RULES.rules.forEach((r) => addRow(r));
      updCounts();
      defSel.value = HLX_ROUTE_DEFAULT_RULES.def;
      updTest();
      msgEl.style.color = '#b45309';
      msgEl.textContent = 'Đã khôi phục — bấm Lưu để áp dụng.';
    });
    box.querySelector('#hlx-rt-save').addEventListener('click', () => {
      hlxRouteSave(collect());
      msgEl.style.color = '#0f9d78';
      msgEl.textContent = '✅ Đã lưu.';
      setTimeout(hlxCloseRouteDialog, 700);
    });
    box.querySelector('#hlx-rt-close').addEventListener('click', hlxCloseRouteDialog);
    box.querySelector('#hlx-rt-x').addEventListener('click', hlxCloseRouteDialog);

    const natCb = box.querySelector('#hlx-rt-nat');
    const applyNat = () => {
      const on = !natCb.checked; // công tắc BẬT = dùng script; TẮT = mặc định của máy
      const body = box.querySelector('.hlx-rt-body');
      body.classList.toggle('hlx-dim', on);
      body.inert = on;
      ['#hlx-rt-reset', '#hlx-rt-save'].forEach((sel) => { const b = box.querySelector(sel); b.disabled = on; b.classList.toggle('hlx-dim', on); });
    };
    natCb.checked = !hlxRouteNative();
    applyNat();
    natCb.addEventListener('change', () => { hlxStoreSet(HLX_ROUTE_NATIVE_KEY, natCb.checked ? '0' : '1'); applyNat(); });
  }


  // ================= Liều dùng tự động =================
  const HLX_DOSE_KEY = 'hlx_dose_rules_v1';
  const HLX_DOSE_FIELDS = [['s', 'Sáng'], ['tr', 'Trưa'], ['c', 'Chiều'], ['t', 'Tối']];
  let hlxDoseCache = null;
  let hlxDoseScanStop = false;

  function hlxDoseLoad() {
    if (hlxDoseCache) return hlxDoseCache;
    let cfg = null;
    try { const raw = hlxStoreGet(HLX_DOSE_KEY); if (raw) cfg = JSON.parse(raw); } catch (err) { cfg = null; }
    if (!cfg || !Array.isArray(cfg.drugs)) cfg = { updated: 0, drugs: [] };
    hlxDoseCache = cfg;
    return cfg;
  }
  function hlxDoseSave(cfg) {
    hlxDoseCache = cfg;
    hlxStoreSet(HLX_DOSE_KEY, JSON.stringify(cfg));
  }
  // "4778 - Aciclovir 800mg (Aciclovir) 800mg - Viên (Hộp 20 vỉ x 05 viên) 1,045 233" -> "Aciclovir 800mg (Aciclovir) 800mg - Viên"
  function hlxDoseClean(raw) {
    let t = hlxRouteClean(raw);
    t = t.replace(/^[A-Za-z]*\d+[A-Za-z0-9]*\s+-\s+/, '');
    t = t.replace(/\)((\s+[\d.,]+)+)$/, ')');
    t = t.replace(/(\s-\s[^-()]+?)\s*\([^()]*\)$/, '$1');
    t = t.trim();
    // Thuốc YHCT: tên quá dài -> chỉ giữ "Tên trước ngoặc - Dạng thuốc"
    if (hlxDoseGrp(raw) === 'yhct') {
      const p = t.indexOf('(');
      if (p > 0) {
        const name = t.slice(0, p).trim();
        const i = t.lastIndexOf(' - ');
        let form = i >= p ? t.slice(i + 3) : '';
        form = form.replace(/\s*\(.*$/, '').trim();
        t = form ? name + ' - ' + form : name;
      }
    }
    return t;
  }
  function hlxDoseKey(raw) { return hlxRouteNorm(hlxDoseClean(raw)); }
  function hlxDoseIsYhct(raw) {
    const t = String(raw || '');
    return /chứa\s*:|dược liệu/i.test(t) || (t.match(/;/g) || []).length >= 2 || t.length > 220;
  }
  // Nhóm thuốc: ưu tiên lựa chọn thủ công (cfg.grp), không có thì tự nhận diện
  function hlxDoseGrpKey(raw) {
    const t = hlxRouteClean(raw).replace(/^[A-Za-z]*\d+[A-Za-z0-9]*\s+-\s+/, '');
    const p = t.indexOf('(');
    return hlxRouteNorm(p > 0 ? t.slice(0, p) : t);
  }
  // Mặc định có sẵn: thuốc bị nhận diện nhầm sang YHCT nhưng thực tế là Tây Y
  const HLX_DOSE_GRP_DEFAULTS = { "Tot'hema": 'tay', 'Tot\u2019hema': 'tay' };
  let hlxDoseGrpDefMap = null;
  function hlxDoseAutoGrp(raw) {
    if (!hlxDoseGrpDefMap) {
      hlxDoseGrpDefMap = {};
      Object.keys(HLX_DOSE_GRP_DEFAULTS).forEach((n) => { hlxDoseGrpDefMap[hlxDoseGrpKey(n)] = HLX_DOSE_GRP_DEFAULTS[n]; });
    }
    const d = hlxDoseGrpDefMap[hlxDoseGrpKey(raw)];
    if (d) return d;
    return hlxDoseIsYhct(raw) ? 'yhct' : 'tay';
  }
  function hlxDoseGrp(raw) {
    const g = hlxDoseLoad().grp;
    const k = g ? g[hlxDoseGrpKey(raw)] : null;
    if (k === 'tay' || k === 'yhct') return k;
    return hlxDoseAutoGrp(raw);
  }
  function hlxDosePrefs() {
    const cfg = hlxDoseLoad();
    if (!cfg.prefs) cfg.prefs = { hideYhct: true, norm: true };
    // Hiển thị thuốc: 'all' | 'tay' | 'yhct' (di chuyển từ cờ hideYhct cũ)
    if (!cfg.prefs.show) cfg.prefs.show = cfg.prefs.hideYhct === false ? 'all' : 'tay';
    return cfg.prefs;
  }
  function hlxDoseHas(d) {
    return HLX_DOSE_FIELDS.some((f) => {
      const v = String(d[f[0]] == null ? '' : d[f[0]]).trim();
      return v !== '' && !/^0+([.,]0+)?$/.test(v);
    });
  }
  function hlxDoseLookup(name) {
    const n = hlxDoseKey(name);
    if (!n) return null;
    let best = null;
    hlxDoseLoad().drugs.forEach((d) => {
      if (!hlxDoseHas(d)) return;
      const k = hlxDoseKey(d.name);
      if (!k) return;
      let score = 0;
      if (k === n) score = 100000;
      else if (n.indexOf(k) !== -1 || k.indexOf(n) !== -1) score = Math.min(k.length, n.length);
      if (score && (!best || score > best.score)) best = { d, score };
    });
    return best ? best.d : null;
  }
  // Điền S/Tr/C/T; HIS có thể ghi đè sau khi chọn thuốc nên kiểm tra lại vài lần
  function hlxDoseApply(name) {
    if (hlxDoseNative()) return;
    const d = hlxDoseLookup(name);
    if (!d) return;
    console.log('[Helixfast] Liều dùng:', name, '→', HLX_DOSE_FIELDS.map((f) => d[f[0]] || '0').join('-'));
    const run = () => {
      HLX_DOSE_FIELDS.forEach((f) => {
        const el = hlxQ('input[formcontrolname="quantity_unit_' + f[0] + '"]');
        if (!el || el === document.activeElement) return;
        const want = String(d[f[0]] == null || String(d[f[0]]).trim() === '' ? '0' : d[f[0]]).trim();
        if (el.value !== want) setNativeValue(el, want);
      });
    };
    run();
    setTimeout(run, 500);
    setTimeout(run, 1200);
  }

  const hlxDoseSleep = (ms) => new Promise((r) => setTimeout(r, ms));
  function hlxDoseReadItems(dd) {
    const out = [];
    dd.querySelectorAll('.menu .item').forEach((it) => {
      if (it.classList.contains('message')) return;
      const t = hlxRouteClean(it.textContent);
      if (t && !/^(không tìm thấy|no results)/i.test(t)) out.push(t);
    });
    return out;
  }
  async function hlxDoseQuery(input, dd, q) {
    setNativeValue(input, q);
    ['keydown', 'keyup'].forEach((tp) =>
      input.dispatchEvent(new KeyboardEvent(tp, { key: q ? q.slice(-1) : 'Backspace', bubbles: true }))
    );
    await hlxDoseSleep(450);
    let last = -1, same = 0;
    const t0 = Date.now();
    while (Date.now() - t0 < 3000 && same < 2) {
      const menu = dd.querySelector('.menu');
      if (menu) menu.scrollTop = menu.scrollHeight; // tải thêm nếu danh sách tải theo trang
      await hlxDoseSleep(200);
      const n = hlxDoseReadItems(dd).length;
      if (n === last) same++; else { same = 0; last = n; }
    }
    return hlxDoseReadItems(dd);
  }
  // Đóng hẳn danh sách thuốc sau khi quét (tránh treo che giao diện)
  async function hlxDoseCloseDropdown(input, dd) {
    try {
      setNativeValue(input, '');
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }));
      input.blur();
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      document.body.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    } catch (err) {}
    await hlxDoseSleep(250);
    try {
      const menus = dd.querySelectorAll('.menu');
      const still = Array.prototype.some.call(menus, (m) => m.offsetParent !== null);
      if (still || dd.classList.contains('active') || dd.classList.contains('visible')) {
        if (!document.getElementById('hlx-ds-hide-css')) {
          const st = document.createElement('style');
          st.id = 'hlx-ds-hide-css';
          st.textContent = '.hlx-ds-hide { display: none !important; }';
          document.head.appendChild(st);
        }
        dd.classList.remove('active', 'visible');
        menus.forEach((m) => { m.classList.remove('visible', 'transition', 'animating'); m.classList.add('hlx-ds-hide'); });
        setTimeout(() => menus.forEach((m) => m.classList.remove('hlx-ds-hide')), 600);
      }
    } catch (err) {}
  }
  // Quét toàn bộ thuốc trong ô "Thuốc *"
  async function hlxDoseScan(progress) {
    const input = hlxQ(PHARMACY_SEARCH_SELECTOR);
    if (!input) return { error: 'Không thấy ô "Thuốc". Hãy mở tab Đơn thuốc rồi bấm lại.' };
    const dd = input.closest('.ui.dropdown') || input.parentElement;
    const found = new Map();
    const add = (arr) => arr.forEach((t) => { const k = hlxRouteNorm(t); if (!found.has(k)) found.set(k, t); });
    const prevActive = document.activeElement;
    hlxDoseScanStop = false;
    try {
      input.focus();
      dd.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      dd.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      progress('Đang đọc danh sách...');
      add(await hlxDoseQuery(input, dd, ''));
      const first = found.size;
      const keys = 'abcdefghijklmnopqrstuvwxyz0123456789'.split('');
      for (let i = 0; i < keys.length && !hlxDoseScanStop; i++) {
        progress('Đang quét "' + keys[i] + '" (' + (i + 1) + '/' + keys.length + ') — ' + found.size + ' thuốc');
        add(await hlxDoseQuery(input, dd, keys[i]));
      }
      await hlxDoseQuery(input, dd, '');
    } finally {
      await hlxDoseCloseDropdown(input, dd);
      try { if (prevActive && prevActive.focus && document.contains(prevActive)) prevActive.focus(); } catch (err) {}
    }
    return { list: Array.from(found.values()), stopped: hlxDoseScanStop };
  }

  function hlxDoseEnsureCss() {
    if (document.getElementById('hlx-ds-css')) return;
    const st = document.createElement('style');
    st.id = 'hlx-ds-css';
    st.textContent = `
      .hlx-ds-overlay { position: fixed; inset: 0; background: rgba(15,23,42,.5); z-index: 999998; }
      .hlx-ds-box { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 1200px; max-width: 96vw;
        height: 88vh; display: flex; flex-direction: column; background: #fff; border-radius: 16px; overflow: hidden;
        z-index: 999999; box-shadow: 0 24px 64px rgba(15,23,42,.4); color: #0f172a; font-size: 14px;
        border: 2px solid #3b82f6; font-family: -apple-system,Segoe UI,Roboto,Arial,sans-serif; }
      .hlx-ds-head { background: linear-gradient(135deg,#3b6fd4,#7b4fb8); color: #fff; padding: 16px 22px; display: flex;
        align-items: center; justify-content: space-between; font-weight: 800; font-size: 19px; }
      .hlx-ds-x { cursor: pointer; font-size: 20px; padding: 0 4px; }
      .hlx-ds-bar { display: flex; align-items: center; gap: 14px; padding: 16px 22px 12px; flex-wrap: wrap; }
      .hlx-ds-search { flex: 0 0 300px; height: 40px; box-sizing: border-box; padding: 0 12px; border: 1.5px solid #cbd5e1;
        border-radius: 8px; font-size: 14px; }
      .hlx-ds-search:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.2); }
      .hlx-ds-stat { color: #0f172a; font-size: 14px; font-weight: 500; }
      .hlx-ds-stat b { color: #2563eb; }
      .hlx-ds-upd { margin-left: auto; background: #2d8fdd; color: #fff; border: none; border-radius: 6px; padding: 10px 16px;
        font-weight: 700; font-size: 13px; cursor: pointer; }
      .hlx-ds-upd:hover { background: #1f7ac4; }
      .hlx-ds-upd:disabled { opacity: .6; cursor: default; }
      .hlx-ds-msg { padding: 0 22px 8px; min-height: 18px; font-size: 12.5px; font-weight: 600; color: #0f766e; }
      .hlx-ds-wrap { flex: 1 1 auto; overflow-y: auto; margin: 0 22px; border-top: 1px solid #e2e8f0; }
      .hlx-ds-table { width: 100%; border-collapse: collapse; }
      .hlx-ds-table th { position: sticky; top: 0; background: #f1f5f9; z-index: 1; text-align: center; font-size: var(--fs,14px); color: #000; font-weight: 800;
        padding: 11px 8px; border-bottom: 2px solid #3b82f6; }
      .hlx-ds-table th:first-child, .hlx-ds-table td:first-child { text-align: left; padding-left: 8px; }
      .hlx-ds-table td { color: #000; font-size: var(--fs,14px); padding: var(--py,9px) 8px; border-bottom: 1px solid #eef1f5; text-align: center; }
      .hlx-ds-table tr.has td { background: #eaf7ee; }
      .hlx-ds-table tr.edit td { background: #fff8e1; }
      .hlx-ds-in { width: var(--iw,62px); height: var(--ih,36px); box-sizing: border-box; text-align: center; font-size: var(--fs,14px); border: 1.5px solid #cbd5e1;
        border-radius: 7px; background: #fff; }
      .hlx-ds-in { color: #000 !important; -webkit-text-fill-color: #000 !important; opacity: 1 !important; font-weight: 700; border-color: #94a3b8 !important; }
      .hlx-ds-in::placeholder { color: #475569 !important; opacity: 1 !important; -webkit-text-fill-color: #475569 !important; }
      .hlx-ds-in:disabled { background: #f1f5f9; }
      .hlx-ds-search { color: #000 !important; border-color: #94a3b8 !important; }
      .hlx-ds-search::placeholder { color: #475569; opacity: 1; }
      .hlx-ds-in:not(:disabled):focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.2); }
      .hlx-ds-act { min-width: 118px; white-space: nowrap; border: none; border-radius: 6px; padding: var(--ap,9px) 14px; font-weight: 800; font-size: calc(var(--fs,14px) - 2px);
        letter-spacing: .3px; cursor: pointer; background: #2d8fdd; color: #fff; text-transform: uppercase; }
      .hlx-ds-act.save { background: #16a34a; }
      .hlx-ds-tg { border: 1.5px solid #94a3b8; background: #fff; color: #0f172a; border-radius: 6px; padding: 9px 12px;
        font-weight: 700; font-size: 12.5px; cursor: pointer; }
      .hlx-ds-tg.on { background: #eaf2ff; border-color: #3b82f6; color: #1d4ed8; }
      .hlx-ds-stat { flex: 1 1 100%; }
      .hlx-ds-empty { padding: 30px; text-align: center; color: #0f172a; }
      .hlx-ds-xls { background: #16a34a; color: #fff; border: none; border-radius: 8px; padding: 11px 18px; font-weight: 700; cursor: pointer; }
      .hlx-ds-xls:hover { background: #15803d; }
      .hlx-ds-foot-l { display: flex; gap: 10px; }
      .hlx-ds-bar2 { display: flex; align-items: center; gap: 22px; padding: 0 22px 8px; flex-wrap: wrap; color: #0f172a; font-weight: 700; font-size: 13.5px; }
      .hlx-ds-bar2 label, .hlx-ds-fsw { display: inline-flex; align-items: center; gap: 8px; }
      .hlx-ds-grp { height: var(--ih,36px); font-size: var(--fs,14px) !important; }
      .hlx-ds-sort { height: 36px; border: 1.5px solid #94a3b8; border-radius: 7px; background: #fff; color: #000 !important; font-size: 13.5px; padding: 0 8px; font-weight: 600; }
      .hlx-ds-fsr { width: 150px; accent-color: #2563eb; cursor: pointer; }
      .hlx-ds-fsv { min-width: 40px; text-align: center; color: #1d4ed8; }
      .hlx-ds-fsb { border: 1.5px solid #94a3b8; background: #fff; color: #0f172a; border-radius: 6px; width: 32px; height: 30px; font-weight: 800; cursor: pointer; }
      .hlx-ds-fsb:hover { background: #eaf2ff; }
      .hlx-ds-hint { font-weight: 500; color: #334155; font-size: 12.5px; }
      .hlx-ds-table tr.new td { background: #fff4c2; }
      .hlx-ds-badge { display: inline-block; margin-left: 8px; padding: 1px 7px; border-radius: 10px; background: #f59e0b; color: #000; font-size: 11px; font-weight: 800; vertical-align: middle; }
      .hlx-ds-foot { padding: 14px 22px; display: flex; justify-content: space-between; align-items: center; }
      .hlx-ds-clear { background: #e5473b; color: #fff; border: none; border-radius: 8px; padding: 11px 18px; font-weight: 700; cursor: pointer; }
      .hlx-ds-close { background: #475569; color: #fff; border: none; border-radius: 8px; padding: 11px 26px; font-weight: 700; cursor: pointer; }
    ` + HLX_NATIVE_CSS;
    document.head.appendChild(st);
  }
  function hlxCloseDoseDialog() {
    hlxDoseScanStop = true;
    ['hlx-ds-overlay', 'hlx-ds-box'].forEach((id) => { const el = document.getElementById(id); if (el) { hlxKeepDrop(el); el.remove(); } });
    document.removeEventListener('keydown', hlxDoseDialogEsc, true);
  }
  function hlxDoseDialogEsc(e) {
    if (!e.isTrusted) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); hlxCloseDoseDialog(); }
  }
  function hlxOpenDoseDialog() {
    hlxDoseEnsureCss();
    hlxCloseDoseDialog();
    const overlay = document.createElement('div');
    overlay.id = 'hlx-ds-overlay';
    overlay.className = 'hlx-ds-overlay';
    const box = document.createElement('div');
    box.id = 'hlx-ds-box';
    box.className = 'hlx-ds-box';
    box.innerHTML =
      '<div class="hlx-ds-head"><span>📋 Liều dùng tự động</span><span class="hlx-ds-x" id="hlx-ds-x">✕</span></div>' +
      HLX_NATIVE_HTML('hlx-ds-nat', 'Bật: dùng liều đã cài bên dưới (script tự điền Sáng/Trưa/Chiều/Tối, Cách dùng, Ghi chú). Tắt: dùng mặc định của máy, script không can thiệp.') +
      '<div class="hlx-ds-bar"><input class="hlx-ds-search" id="hlx-ds-q" placeholder="Tìm tên thuốc...">' +
      '<label class="hlx-ds-showl">Hiển thị thuốc: <select class="hlx-ds-sort" id="hlx-ds-show">' +
      '<option value="all">Tất cả</option><option value="tay">Thuốc Tây Y</option><option value="yhct">Thuốc YHCT</option></select></label>' +
      '<button type="button" class="hlx-ds-tg" id="hlx-ds-norm"></button>' +
      '<button type="button" class="hlx-ds-upd" id="hlx-ds-upd">⟳ Cập nhật danh sách thuốc</button>' +
      '<span class="hlx-ds-stat" id="hlx-ds-stat"></span></div>' +
      '<div class="hlx-ds-bar2">' +
      '<label>Sắp xếp: <select class="hlx-ds-sort" id="hlx-ds-sort">' +
      '<option value="abc">Tên A → Z (mặc định)</option><option value="zba">Tên Z → A</option>' +
      '<option value="newest">Mới thêm nhất trước</option><option value="oldest">Cũ nhất trước</option>' +
      '<option value="dose">Đã cài liều trước</option><option value="nodose">Chưa cài liều trước</option></select></label>' +
      '<span class="hlx-ds-fsw">Cỡ chữ: <button type="button" class="hlx-ds-fsb" id="hlx-ds-fsm">A−</button>' +
      '<input type="range" class="hlx-ds-fsr" id="hlx-ds-fsr" min="10" max="20" step="1">' +
      '<button type="button" class="hlx-ds-fsb" id="hlx-ds-fsp">A+</button><span class="hlx-ds-fsv" id="hlx-ds-fsv"></span></span>' +
      '<span class="hlx-ds-hint">Thuốc mới dò được luôn nằm đầu danh sách.</span></div>' +
      '<div class="hlx-ds-msg" id="hlx-ds-msg"></div>' +
      '<div class="hlx-ds-wrap"><table class="hlx-ds-table"><thead><tr><th>Tên thuốc</th><th>Nhóm</th>' +
      HLX_DOSE_FIELDS.map((f) => '<th>' + f[1] + '</th>').join('') +
      '<th>Hành động</th></tr></thead><tbody id="hlx-ds-body"></tbody></table></div>' +
      '<div class="hlx-ds-foot"><div class="hlx-ds-foot-l"><button type="button" class="hlx-ds-clear" id="hlx-ds-clear">🗑 Xóa toàn bộ liều đã cài</button>' +
      '<button type="button" class="hlx-ds-xls" id="hlx-ds-xls">📥 Xuất danh sách thuốc (Excel)</button></div>' +
      '<button type="button" class="hlx-ds-close" id="hlx-ds-close">Đóng</button></div>';
    document.body.appendChild(overlay);
    document.body.appendChild(box);
    hlxKeepAdd(overlay, hlxDoseEnsureCss);
    hlxKeepAdd(box, hlxDoseEnsureCss);
    document.addEventListener('keydown', hlxDoseDialogEsc, true);
    overlay.addEventListener('mousedown', hlxCloseDoseDialog);

    const body = box.querySelector('#hlx-ds-body');
    const qEl = box.querySelector('#hlx-ds-q');
    const msg = box.querySelector('#hlx-ds-msg');
    const stat = box.querySelector('#hlx-ds-stat');
    const updBtn = box.querySelector('#hlx-ds-upd');
    const showEl = box.querySelector('#hlx-ds-show');
    const normBtn = box.querySelector('#hlx-ds-norm');

    let lastRows = [];
    const fmtAge = (ts) => (ts ? new Date(ts).toLocaleString('vi-VN') : 'chưa cập nhật');
    function render() {
      const cfg = hlxDoseLoad();
      const pf = hlxDosePrefs();
      const q = hlxRouteNorm(qEl.value);
      const yhctAll = cfg.drugs.filter((d) => hlxDoseGrp(d.name) === 'yhct');
      const rows = cfg.drugs.filter(
        (d) => (pf.show === 'all' || (pf.show === 'yhct') === (hlxDoseGrp(d.name) === 'yhct')) &&
          (!q || hlxRouteNorm(d.name).indexOf(q) !== -1 || hlxDoseKey(d.name).indexOf(q) !== -1)
      );
      const cmpName = (a, b) => hlxDoseClean(a.name).localeCompare(hlxDoseClean(b.name), 'vi');
      const mode = hlxDosePrefs().sort || 'abc';
      const cmp = {
        abc: cmpName,
        zba: (a, b) => cmpName(b, a),
        newest: (a, b) => (b.added || 0) - (a.added || 0) || cmpName(a, b),
        oldest: (a, b) => (a.added || 0) - (b.added || 0) || cmpName(a, b),
        dose: (a, b) => (hlxDoseHas(b) ? 1 : 0) - (hlxDoseHas(a) ? 1 : 0) || cmpName(a, b),
        nodose: (a, b) => (hlxDoseHas(a) ? 1 : 0) - (hlxDoseHas(b) ? 1 : 0) || cmpName(a, b),
      }[mode] || cmpName;
      // Thuốc mới dò được luôn lên đầu, trong nhóm vẫn theo kiểu sắp xếp đang chọn
      rows.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0) || cmp(a, b));
      lastRows = rows;
      const withDose = cfg.drugs.filter(hlxDoseHas).length;
      const nNew = cfg.drugs.filter((d) => d.isNew).length;
      showEl.value = pf.show;
      showEl.options[1].textContent = 'Thuốc Tây Y (' + (cfg.drugs.length - yhctAll.length) + ')';
      showEl.options[2].textContent = 'Thuốc YHCT (' + yhctAll.length + ')';
      normBtn.textContent = pf.norm ? '✔ Chuẩn hóa tên thuốc: BẬT' : '✖ Chuẩn hóa tên thuốc: TẮT';
      normBtn.classList.toggle('on', pf.norm);
      stat.innerHTML = 'Tổng: <b>' + cfg.drugs.length + '</b> | Hiển thị: <b>' + rows.length + '</b> | Thuốc mới: <b style="color:#16a34a">' + nNew +
        '</b> | Thuốc cũ: <b>' + (cfg.drugs.length - nNew) + '</b> | Đã cài liều: <b>' + withDose + '</b> | Cập nhật: ' + fmtAge(cfg.updated);
      body.textContent = '';
      if (!rows.length) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="7" class="hlx-ds-empty">' +
          (cfg.drugs.length ? 'Không có thuốc phù hợp.' : 'Chưa có danh sách. Mở tab Đơn thuốc rồi bấm "Cập nhật danh sách thuốc".') + '</td>';
        body.appendChild(tr);
        return;
      }
      const frag = document.createDocumentFragment();
      rows.forEach((d) => {
        const tr = document.createElement('tr');
        const tdN = document.createElement('td');
        tdN.textContent = hlxDosePrefs().norm ? hlxDoseClean(d.name) : d.name;
        tdN.title = d.name;
        if (d.isNew) { const bd = document.createElement('span'); bd.className = 'hlx-ds-badge'; bd.textContent = 'MỚI'; tdN.appendChild(bd); }
        tr.appendChild(tdN);
        const tdG = document.createElement('td');
        const gSel = document.createElement('select');
        gSel.className = 'hlx-ds-sort hlx-ds-grp';
        gSel.innerHTML = '<option value="tay">Tây Y</option><option value="yhct">YHCT</option>';
        gSel.value = hlxDoseGrp(d.name);
        gSel.title = 'Phân loại nhóm thuốc (chọn lại nếu máy nhận diện sai)';
        gSel.addEventListener('change', () => {
          const c = hlxDoseLoad();
          if (!c.grp) c.grp = {};
          const k = hlxDoseGrpKey(d.name);
          if (hlxDoseAutoGrp(d.name) === gSel.value) delete c.grp[k]; else c.grp[k] = gSel.value;
          hlxDoseSave(c);
          render();
        });
        tdG.appendChild(gSel);
        tr.appendChild(tdG);
        const inputs = {};
        HLX_DOSE_FIELDS.forEach((f) => {
          const td = document.createElement('td');
          const inp = document.createElement('input');
          inp.className = 'hlx-ds-in';
          inp.disabled = true;
          inp.value = d[f[0]] == null ? '' : d[f[0]];
          inp.placeholder = '0';
          inputs[f[0]] = inp;
          td.appendChild(inp);
          tr.appendChild(td);
        });
        const tdA = document.createElement('td');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'hlx-ds-act';
        btn.textContent = 'Chỉnh sửa';
        let editing = false;
        const refreshCls = () => { tr.className = editing ? 'edit' : d.isNew ? 'new' : hlxDoseHas(d) ? 'has' : ''; };
        refreshCls();
        btn.addEventListener('click', () => {
          if (!editing) {
            editing = true;
            HLX_DOSE_FIELDS.forEach((f) => { inputs[f[0]].disabled = false; });
            btn.textContent = 'Lưu';
            btn.classList.add('save');
            inputs.s.focus();
            inputs.s.select();
          } else {
            HLX_DOSE_FIELDS.forEach((f) => {
              d[f[0]] = inputs[f[0]].value.trim().replace(',', '.');
              inputs[f[0]].value = d[f[0]];
              inputs[f[0]].disabled = true;
            });
            editing = false;
            btn.textContent = 'Chỉnh sửa';
            btn.classList.remove('save');
            hlxDoseSave(hlxDoseLoad());
            refreshCls();
            stat.innerHTML = stat.innerHTML.replace(/Đã cài liều: <b>\d+<\/b>/, 'Đã cài liều: <b>' + hlxDoseLoad().drugs.filter(hlxDoseHas).length + '</b>');
          }
          refreshCls();
        });
        tr.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && editing) { e.preventDefault(); btn.click(); }
        });
        tdA.appendChild(btn);
        tr.appendChild(tdA);
        frag.appendChild(tr);
      });
      body.appendChild(frag);
    }

    let t = null;
    qEl.addEventListener('input', () => { clearTimeout(t); t = setTimeout(render, 120); });
    showEl.addEventListener('change', () => { const pf = hlxDosePrefs(); pf.show = showEl.value; pf.hideYhct = pf.show !== 'all'; hlxDoseSave(hlxDoseLoad()); render(); });
    normBtn.addEventListener('click', () => { const pf = hlxDosePrefs(); pf.norm = !pf.norm; hlxDoseSave(hlxDoseLoad()); render(); });
    box.querySelector('#hlx-ds-close').addEventListener('click', hlxCloseDoseDialog);
    box.querySelector('#hlx-ds-x').addEventListener('click', hlxCloseDoseDialog);
    box.querySelector('#hlx-ds-clear').addEventListener('click', () => {
      if (!confirm('Xóa liều đã cài của tất cả thuốc? (danh sách thuốc vẫn giữ)')) return;
      const cfg = hlxDoseLoad();
      cfg.drugs.forEach((d) => { HLX_DOSE_FIELDS.forEach((f) => { d[f[0]] = ''; }); });
      hlxDoseSave(cfg);
      render();
    });
    const sortEl = box.querySelector('#hlx-ds-sort');
    const fsR = box.querySelector('#hlx-ds-fsr');
    const fsV = box.querySelector('#hlx-ds-fsv');
    const applyFs = () => {
      const pf = hlxDosePrefs();
      const fs = Math.max(10, Math.min(20, Number(pf.fs) || 14));
      const py = Math.max(2, Math.min(12, Math.round((fs - 9) * 1.6)));
      box.style.setProperty('--fs', fs + 'px');
      box.style.setProperty('--py', py + 'px');
      box.style.setProperty('--ih', Math.round(fs * 2.2) + 'px');
      box.style.setProperty('--iw', Math.round(fs * 3.6 + 14) + 'px');
      box.style.setProperty('--ap', Math.max(3, Math.round(py * 0.9)) + 'px');
      fsR.value = fs;
      fsV.textContent = fs + 'px';
    };
    const setFs = (v) => { hlxDosePrefs().fs = Math.max(10, Math.min(20, v)); hlxDoseSave(hlxDoseLoad()); applyFs(); };
    sortEl.value = hlxDosePrefs().sort || 'abc';
    sortEl.addEventListener('change', () => { hlxDosePrefs().sort = sortEl.value; hlxDoseSave(hlxDoseLoad()); render(); });
    fsR.addEventListener('input', () => setFs(Number(fsR.value)));
    box.querySelector('#hlx-ds-fsm').addEventListener('click', () => setFs((Number(hlxDosePrefs().fs) || 14) - 1));
    box.querySelector('#hlx-ds-fsp').addEventListener('click', () => setFs((Number(hlxDosePrefs().fs) || 14) + 1));
    applyFs();

    box.querySelector('#hlx-ds-xls').addEventListener('click', () => {
      if (!lastRows.length) { msg.style.color = '#dc2626'; msg.textContent = 'Chưa có danh sách thuốc để xuất. Hãy bấm "Cập nhật danh sách thuốc" trước.'; return; }
      const rt = hlxRouteLoad();
      const rows = lastRows.map((d, i) => {
        const r = hlxRouteResolve(d.name, rt);
        const kind = d.isNew ? 'new' : hlxDoseHas(d) ? 'has' : '';
        return { kind, v: [i + 1, hlxDoseClean(d.name), d.name, d.s || '', d.tr || '', d.c || '', d.t || '',
          r.route || '(mặc định của máy)', r.kw ? 'Từ khóa: ' + r.kw : (r.guess ? 'Đoán theo dạng bào chế' : (r.webDefault ? 'Để mặc định của máy' : 'Mặc định')),
          d.isNew ? 'Thuốc mới' : hlxDoseHas(d) ? 'Đã cài liều' : 'Chưa cài liều'] };
      });
      const p = (n) => String(n).padStart(2, '0');
      const dt = new Date();
      const fn = 'Danh_sach_thuoc_' + dt.getFullYear() + p(dt.getMonth() + 1) + p(dt.getDate()) + '_' + p(dt.getHours()) + p(dt.getMinutes()) + '.xlsx';
      const sortName = { abc: 'Tên A → Z', zba: 'Tên Z → A', newest: 'Mới thêm nhất trước', oldest: 'Cũ nhất trước', dose: 'Đã cài liều trước', nodose: 'Chưa cài liều trước' }[hlxDosePrefs().sort || 'abc'];
      const nDose = rows.filter((r) => r.kind === 'has').length;
      const nNew = rows.filter((r) => r.kind === 'new').length;
      hlxDownloadBlob(hlxXlsxBlob({
        sheetName: 'Danh sách thuốc',
        title: 'DANH SÁCH THUỐC & LIỀU DÙNG TỰ ĐỘNG',
        subtitle: 'Xuất lúc ' + p(dt.getHours()) + ':' + p(dt.getMinutes()) + ' ngày ' + p(dt.getDate()) + '/' + p(dt.getMonth() + 1) + '/' + dt.getFullYear() +
          '   |   Tổng: ' + rows.length + ' thuốc   |   Đã cài liều: ' + nDose + '   |   Thuốc mới: ' + nNew + '   |   Sắp xếp: ' + sortName,
        legend: 'Chú thích màu:  xanh lá = đã cài liều   |   vàng = thuốc mới dò được   |   Sáng / Trưa / Chiều / Tối là số viên mỗi lần uống',
        header: ['STT', 'Tên thuốc (chuẩn hóa)', 'Tên đầy đủ (HIS)', 'Sáng', 'Trưa', 'Chiều', 'Tối', 'Cách dùng tự chọn (Đ.Dùng)', 'Nguồn quy tắc', 'Trạng thái'],
        rows, widths: [7, 46, 62, 9, 9, 9, 9, 24, 30, 16], center: [0, 3, 4, 5, 6, 7, 9],
      }), fn);
      msg.style.color = '#0f766e';
      msg.textContent = '✅ Đã xuất ' + rows.length + ' thuốc → ' + fn;
    });

    const natCb = box.querySelector('#hlx-ds-nat');
    const applyNat = () => {
      const on = !natCb.checked; // công tắc BẬT = dùng script; TẮT = mặc định của máy
      ['.hlx-ds-bar', '.hlx-ds-bar2', '.hlx-ds-msg', '.hlx-ds-wrap', '#hlx-ds-clear'].forEach((sel) => {
        const el = box.querySelector(sel); el.classList.toggle('hlx-dim', on); el.inert = on;
      });
    };
    natCb.checked = !hlxDoseNative();
    applyNat();
    natCb.addEventListener('change', () => { hlxStoreSet(HLX_DOSE_NATIVE_KEY, natCb.checked ? '0' : '1'); applyNat(); });

    updBtn.addEventListener('click', async () => {
      if (updBtn.dataset.busy) { hlxDoseScanStop = true; msg.textContent = 'Đang dừng...'; return; }
      updBtn.dataset.busy = '1';
      updBtn.textContent = '■ Dừng';
      msg.style.color = '#0f766e';
      const res = await hlxDoseScan((m) => { if (document.getElementById('hlx-ds-msg')) msg.textContent = m; });
      delete updBtn.dataset.busy;
      updBtn.textContent = '⟳ Cập nhật danh sách thuốc';
      if (!document.getElementById('hlx-ds-box')) return;
      if (res.error) { msg.style.color = '#dc2626'; msg.textContent = res.error; return; }
      if (!res.list.length) { msg.style.color = '#dc2626'; msg.textContent = 'Không đọc được thuốc nào từ ô "Thuốc".'; return; }
      const cfg = hlxDoseLoad();
      const hadList = cfg.drugs.length > 0;
      const old = new Map(cfg.drugs.map((d) => [hlxDoseKey(d.name), d]));
      const seen = new Set();
      const nd = [];
      res.list.forEach((name) => {
        const k = hlxDoseKey(name);
        if (seen.has(k)) return;
        seen.add(k);
        const o = old.get(k);
        nd.push(o ? { name, s: o.s || '', tr: o.tr || '', c: o.c || '', t: o.t || '', isNew: false, added: o.added || 0 }
          : { name, s: '', tr: '', c: '', t: '', isNew: hadList, added: Date.now() });
      });
      // giữ lại thuốc đã cài liều dù lần quét này không thấy
      cfg.drugs.forEach((d) => { if (hlxDoseHas(d) && !seen.has(hlxDoseKey(d.name))) nd.push(Object.assign({}, d, { isNew: false })); });
      nd.sort((a, b) => hlxDoseClean(a.name).localeCompare(hlxDoseClean(b.name), 'vi'));
      const added = nd.filter((d) => d.isNew).length;
      hlxDoseSave({ updated: Date.now(), drugs: nd, prefs: hlxDosePrefs(), grp: hlxDoseLoad().grp || {} });
      msg.style.color = '#0f766e';
      msg.textContent = '✅ Đã cập nhật: ' + res.list.length + ' thuốc (' + added + ' thuốc mới)' + (res.stopped ? ' — quét chưa đủ vì đã dừng.' : '.');
      render();
    });
    render();
  }

  // Giữ menu/modal luôn hiện: nếu trang (hoặc script khác) gỡ chúng khỏi DOM / làm mất CSS thì gắn lại ngay
  let hlxKeepList = [];
  let hlxKeepTimer = null;
  function hlxKeepTick() {
    hlxKeepList.forEach((k) => {
      try {
        if (k.cssFn) k.cssFn();
        if (!k.el.isConnected && document.body) document.body.appendChild(k.el);
      } catch (err) {}
    });
  }
  function hlxKeepAdd(el, cssFn) {
    hlxKeepList.push({ el, cssFn });
    if (!hlxKeepTimer) hlxKeepTimer = setInterval(hlxKeepTick, 100);
  }
  function hlxKeepDrop(el) {
    hlxKeepList = hlxKeepList.filter((k) => k.el !== el);
    if (!hlxKeepList.length && hlxKeepTimer) { clearInterval(hlxKeepTimer); hlxKeepTimer = null; }
  }

  // ================= Đổi tên ICD mặc định =================
  const HLX_ICD_KEY = 'hlx_icd_names_v1';
  const HLX_ICD_DEFAULTS = {
    'I20.8': 'Cơn đau thắt ngực ổn định chưa được kiểm soát đầy đủ với các điều trị khác',
    'I25.9': 'Bệnh tim thiếu máu cục bộ mạn tính, chưa được kiểm soát đầy đủ với các điều trị khác',
  };
  let hlxIcdCache = null;
  function hlxIcdLoad() {
    if (hlxIcdCache) return hlxIcdCache;
    let cfg = null;
    try { const raw = hlxStoreGet(HLX_ICD_KEY); if (raw) cfg = JSON.parse(raw); } catch (err) { cfg = null; }
    if (!cfg || typeof cfg.map !== 'object' || !cfg.map) cfg = { on: true, map: Object.assign({}, HLX_ICD_DEFAULTS) };
    Object.keys(HLX_ICD_DEFAULTS).forEach((c) => { if (!cfg.map[c]) cfg.map[c] = HLX_ICD_DEFAULTS[c]; });
    hlxIcdCache = cfg;
    return cfg;
  }
  function hlxIcdSave(cfg) {
    hlxIcdCache = cfg;
    hlxStoreSet(HLX_ICD_KEY, JSON.stringify(cfg));
  }
  function hlxIcdSetInput(inp, val) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(inp, val);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    inp.dispatchEvent(new Event('change', { bubbles: true }));
  }
  const hlxIcdRowState = new WeakMap();
  function hlxIcdTick() {
    if (document.hidden) return;
    const sel = document.querySelector('app-icd-selector');
    if (!sel) return;
    const cfg = hlxIcdLoad();
    const now = Date.now();
    sel.querySelectorAll('tbody tr').forEach((tr) => {
      const valEl = tr.querySelector('.ng-value');
      const inp = tr.querySelector('input.abccc');
      if (!inp) return;
      const m = valEl ? (valEl.textContent || '').trim().match(/^[A-Za-z]\d{2}(?:\.[A-Za-z0-9]+)?/) : null;
      const code = m ? m[0].toUpperCase() : '';
      let st = hlxIcdRowState.get(tr);
      if (!st) {
        // Lần đầu thấy dòng: nếu đã có mã sẵn (hồ sơ đã lưu) thì không đụng vào
        st = { code, pending: false, until: 0, target: '' };
        hlxIcdRowState.set(tr, st);
        return;
      }
      if (code !== st.code) {
        st.code = code;
        st.pending = !!code;
        st.until = 0;
      }
      if (!cfg.on || !code || inp.disabled || inp.readOnly) return;
      const target = cfg.map[code];
      if (!target) { st.pending = false; return; }
      if (st.pending) {
        if (inp.value && inp.value !== target) {
          hlxIcdSetInput(inp, target);
          st.pending = false;
          st.target = target;
          st.until = now + 2500; // máy có thể ghi đè lại tên mặc định muộn, canh thêm một lúc
        }
      } else if (st.until > now && st.target === target && inp.value !== target && document.activeElement !== inp) {
        hlxIcdSetInput(inp, target);
      }
    });
  }
  setInterval(hlxIcdTick, 300);

  function hlxIcdEnsureCss() {
    if (document.getElementById('hlx-icd-css')) return;
    const st = document.createElement('style');
    st.id = 'hlx-icd-css';
    st.textContent = `
      .hlx-icd-overlay { position: fixed; inset: 0; background: rgba(15,23,42,.5); z-index: 999998; }
      .hlx-icd-box { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 900px; max-width: 96vw; max-height: 86vh;
        display: flex; flex-direction: column; background: #fff; border-radius: 16px; overflow: hidden; z-index: 999999;
        box-shadow: 0 24px 64px rgba(15,23,42,.4); color: #0f172a; font-size: 14px; font-family: inherit; }
      .hlx-icd-head { display: flex; justify-content: space-between; align-items: center; padding: 16px 22px; color: #fff; font-weight: 800; font-size: 18px;
        background: linear-gradient(90deg,#3b5bdb,#7048c8); }
      .hlx-icd-x { cursor: pointer; font-size: 20px; }
      .hlx-icd-tip { padding: 12px 22px 4px; font-size: 13px; color: #334155; }
      .hlx-icd-on { padding: 6px 22px 10px; font-weight: 700; display: flex; align-items: center; gap: 8px; cursor: pointer; }
      .hlx-icd-on input { position: absolute; opacity: 0; pointer-events: none; }
      .hlx-icd-sw { position: relative; width: 46px; height: 26px; border-radius: 13px; background: #94a3b8; transition: background .15s; flex: 0 0 auto; }
      .hlx-icd-sw::after { content: ''; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: left .15s; box-shadow: 0 1px 3px rgba(0,0,0,.3); }
      .hlx-icd-on input:checked + .hlx-icd-sw { background: #16a34a; }
      .hlx-icd-on input:checked + .hlx-icd-sw::after { left: 23px; }
      .hlx-icd-cf-ov { position: fixed; inset: 0; background: rgba(15,23,42,.55); z-index: 1000000; }
      .hlx-icd-cf { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 420px; max-width: 92vw; background: #fff; border-radius: 14px;
        z-index: 1000001; padding: 24px; box-shadow: 0 24px 64px rgba(15,23,42,.45); color: #0f172a; font-size: 15px; text-align: center; font-family: inherit; }
      .hlx-icd-cf-t { font-weight: 800; font-size: 17px; margin-bottom: 8px; }
      .hlx-icd-cf-b { display: flex; gap: 10px; justify-content: center; margin-top: 18px; }
      .hlx-icd-cf-b button { border: none; border-radius: 8px; padding: 10px 24px; font-weight: 700; font-size: 14px; cursor: pointer; color: #fff; }
      .hlx-icd-cf-y { background: #16a34a; } .hlx-icd-cf-n { background: #64748b; }
      .hlx-icd-c { text-transform: uppercase; }
      .hlx-icd-wrap { flex: 1 1 auto; overflow-y: auto; margin: 0 22px; border-top: 1px solid #e2e8f0; }
      .hlx-icd-table { width: 100%; border-collapse: collapse; }
      .hlx-icd-table th { position: sticky; top: 0; background: #f1f5f9; text-align: left; padding: 10px 8px; font-weight: 800; color: #000; border-bottom: 2px solid #3b82f6; }
      .hlx-icd-table td { padding: 6px 8px; border-bottom: 1px solid #eef1f5; vertical-align: top; }
      .hlx-icd-in { width: 100%; box-sizing: border-box; border: 1.5px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; font-size: 14px; color: #000; background: #fff; font-family: inherit; }
      .hlx-icd-in:focus { outline: none; border-color: #3b82f6; }
      textarea.hlx-icd-in { resize: vertical; min-height: 38px; }
      .hlx-icd-del { background: #ef4444; color: #fff; border: none; border-radius: 6px; padding: 8px 12px; font-weight: 700; cursor: pointer; }
      .hlx-icd-foot { display: flex; justify-content: space-between; padding: 14px 22px; }
      .hlx-icd-add { background: #16a34a; color: #fff; border: none; border-radius: 6px; padding: 10px 16px; font-weight: 700; cursor: pointer; }
      .hlx-icd-del:disabled { opacity: .35; cursor: not-allowed; }
      .hlx-icd-in[readonly] { background: #f1f5f9; color: #475569; }
      .hlx-icd-close { background: #334155; color: #fff; border: none; border-radius: 6px; padding: 10px 22px; font-weight: 700; cursor: pointer; }
    `;
    document.head.appendChild(st);
  }
  function hlxCloseIcdDialog() {
    ['hlx-icd-overlay', 'hlx-icd-box'].forEach((id) => { const el = document.getElementById(id); if (el) { hlxKeepDrop(el); el.remove(); } });
    document.removeEventListener('keydown', hlxIcdDialogEsc, true);
  }
  function hlxIcdDialogEsc(e) {
    if (!e.isTrusted) return;
    if (document.querySelector('.hlx-icd-cf')) return; // đang có popup xác nhận
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); hlxCloseIcdDialog(); }
  }
  function hlxIcdConfirm(title, text, onYes) {
    const ov = document.createElement('div');
    ov.className = 'hlx-icd-cf-ov';
    const dlg = document.createElement('div');
    dlg.className = 'hlx-icd-cf';
    dlg.innerHTML = '<div class="hlx-icd-cf-t"></div><div class="hlx-icd-cf-x"></div>' +
      '<div class="hlx-icd-cf-b"><button type="button" class="hlx-icd-cf-y">Xác nhận</button><button type="button" class="hlx-icd-cf-n">Hủy</button></div>';
    dlg.querySelector('.hlx-icd-cf-t').textContent = title;
    dlg.querySelector('.hlx-icd-cf-x').textContent = text;
    document.body.appendChild(ov);
    document.body.appendChild(dlg);
    hlxKeepAdd(ov, hlxIcdEnsureCss);
    hlxKeepAdd(dlg, hlxIcdEnsureCss);
    const done = () => { hlxKeepDrop(ov); hlxKeepDrop(dlg); ov.remove(); dlg.remove(); document.removeEventListener('keydown', onKey, true); };
    const onKey = (e) => {
      if (!e.isTrusted) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(); }
    };
    document.addEventListener('keydown', onKey, true);
    dlg.querySelector('.hlx-icd-cf-y').addEventListener('click', () => { done(); onYes(); });
    dlg.querySelector('.hlx-icd-cf-n').addEventListener('click', done);
    ov.addEventListener('mousedown', done);
    dlg.querySelector('.hlx-icd-cf-y').focus();
  }
  function hlxOpenIcdDialog() {
    hlxIcdEnsureCss();
    hlxCloseIcdDialog();
    const overlay = document.createElement('div');
    overlay.id = 'hlx-icd-overlay';
    overlay.className = 'hlx-icd-overlay';
    const box = document.createElement('div');
    box.id = 'hlx-icd-box';
    box.className = 'hlx-icd-box';
    box.innerHTML =
      '<div class="hlx-icd-head"><span>🏷 Đổi tên ICD mặc định</span><span class="hlx-icd-x" id="hlx-icd-x">✕</span></div>' +
      '<div class="hlx-icd-tip">Ở tab Khám bệnh, khi chọn mã ICD nằm trong danh sách dưới đây, ô tên ICD sẽ tự được thay bằng tên bạn đặt. Thay đổi được lưu tự động.</div>' +
      '<label class="hlx-icd-on"><input type="checkbox" id="hlx-icd-on"><span class="hlx-icd-sw"></span><span id="hlx-icd-onl"></span></label>' +
      '<div class="hlx-icd-wrap"><table class="hlx-icd-table"><thead><tr><th style="width:140px">Mã ICD</th><th>Tên hiển thị mới</th><th style="width:70px"></th></tr></thead><tbody id="hlx-icd-body"></tbody></table></div>' +
      '<div class="hlx-icd-foot"><button type="button" class="hlx-icd-add" id="hlx-icd-add">＋ Thêm ICD</button><button type="button" class="hlx-icd-close" id="hlx-icd-close">Đóng</button></div>';
    document.body.appendChild(overlay);
    document.body.appendChild(box);
    hlxKeepAdd(overlay, hlxIcdEnsureCss);
    hlxKeepAdd(box, hlxIcdEnsureCss);
    document.addEventListener('keydown', hlxIcdDialogEsc, true);
    overlay.addEventListener('mousedown', hlxCloseIcdDialog);

    const body = box.querySelector('#hlx-icd-body');
    const onCb = box.querySelector('#hlx-icd-on');
    const onLbl = box.querySelector('#hlx-icd-onl');
    const paintOn = () => { onLbl.textContent = onCb.checked ? 'Tự đổi tên ICD: BẬT' : 'Tự đổi tên ICD: TẮT'; };
    onCb.checked = !!hlxIcdLoad().on;
    paintOn();
    function collect() {
      const map = {};
      body.querySelectorAll('tr').forEach((tr) => {
        const c = tr.querySelector('.c').value.trim().toUpperCase();
        const n = tr.querySelector('.n').value.trim();
        if (c && n) map[c] = n;
      });
      Object.keys(HLX_ICD_DEFAULTS).forEach((c) => { if (!map[c]) map[c] = HLX_ICD_DEFAULTS[c]; });
      hlxIcdSave({ on: onCb.checked, map });
    }
    function addRow(code, name, focus) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td><input class="hlx-icd-in c" placeholder="VD: I10"></td><td><textarea class="hlx-icd-in n" rows="2" placeholder="Tên mới"></textarea></td><td><button type="button" class="hlx-icd-del">Xóa</button></td>';
      const cIn = tr.querySelector('.c');
      cIn.classList.add('hlx-icd-c');
      cIn.value = (code || '').toUpperCase();
      // Mã ICD luôn viết hoa (giữ vị trí con trỏ)
      cIn.addEventListener('input', () => {
        const pos = cIn.selectionStart;
        const up = cIn.value.toUpperCase();
        if (up !== cIn.value) { cIn.value = up; try { cIn.setSelectionRange(pos, pos); } catch (err) {} }
      });
      tr.querySelector('.n').value = name || '';
      tr.addEventListener('input', collect);
      const delBtn = tr.querySelector('.hlx-icd-del');
      if (HLX_ICD_DEFAULTS[code]) {
        delBtn.disabled = true;
        delBtn.title = 'Mã mặc định, không thể xóa';
        tr.querySelector('.c').readOnly = true;
      }
      delBtn.addEventListener('click', () => { if (delBtn.disabled) return; tr.remove(); collect(); });
      body.appendChild(tr);
      if (focus) tr.querySelector('.c').focus();
    }
    Object.keys(hlxIcdLoad().map).forEach((c) => addRow(c, hlxIcdLoad().map[c]));
    onCb.addEventListener('change', () => {
      const want = onCb.checked;
      onCb.checked = !want; // giữ trạng thái cũ cho tới khi xác nhận
      paintOn();
      hlxIcdConfirm(want ? 'Bật tự đổi tên ICD?' : 'Tắt tự đổi tên ICD?',
        want ? 'Tên ICD sẽ được tự thay theo danh sách bên dưới.' : 'Tên ICD sẽ giữ nguyên mặc định của máy.',
        () => { onCb.checked = want; paintOn(); collect(); });
    });
    box.querySelector('#hlx-icd-add').addEventListener('click', () => {
      addRow('', '', true);
      const w = box.querySelector('.hlx-icd-wrap'); w.scrollTop = w.scrollHeight;
    });
    box.querySelector('#hlx-icd-close').addEventListener('click', hlxCloseIcdDialog);
    box.querySelector('#hlx-icd-x').addEventListener('click', hlxCloseIcdDialog);
  }

  // Menu chuột phải trên nút Helixfast
  function hlxShowCtxMenu(x, y) {
    hlxRouteEnsureCss();
    const old = document.getElementById('hlx-ctx-menu');
    if (old) { hlxKeepDrop(old); old.remove(); }
    const menu = document.createElement('div');
    menu.id = 'hlx-ctx-menu';
    const killMenu = () => { hlxKeepDrop(menu); menu.remove(); };
    const item0 = document.createElement('button');
    item0.type = 'button';
    item0.textContent = '📋 Liều dùng tự động';
    item0.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      killMenu();
      hlxOpenDoseDialog();
    });
    menu.appendChild(item0);
    const item = document.createElement('button');
    item.type = 'button';
    item.textContent = '💊 Cách dùng';
    item.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      killMenu();
      hlxOpenRouteDialog();
    });
    menu.appendChild(item);
    const itemIcd = document.createElement('button');
    itemIcd.type = 'button';
    itemIcd.textContent = '🏷 Đổi tên ICD mặc định';
    itemIcd.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      killMenu();
      hlxOpenIcdDialog();
    });
    menu.appendChild(itemIcd);
    const itemUp = document.createElement('button');
    itemUp.type = 'button';
    itemUp.textContent = '⟳ Cập nhật' + (hlxUpdState.hasNew ? ' • có bản mới v' + hlxUpdState.remote : '');
    if (hlxUpdState.hasNew) itemUp.style.color = '#15803d';
    itemUp.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      killMenu();
      openUpdateDialog();
    });
    menu.appendChild(itemUp);
    const itemLic = document.createElement('button');
    itemLic.type = 'button';
    itemLic.textContent = '🔑 Bản quyền';
    itemLic.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      killMenu();
      openLicenseDialog();
    });
    menu.appendChild(itemLic);
    menu.style.visibility = 'hidden';
    document.body.appendChild(menu);
    hlxKeepAdd(menu, hlxRouteEnsureCss);
    const r = menu.getBoundingClientRect();
    menu.style.left = Math.max(4, Math.min(x, window.innerWidth - r.width - 4)) + 'px';
    menu.style.top = Math.max(4, Math.min(y, window.innerHeight - r.height - 4)) + 'px';
    menu.style.visibility = 'visible';
    const close = (ev) => {
      if (ev && !ev.isTrusted) return; // Escape/click giả không được đóng menu
      if (ev && ev.type === 'keydown' && ev.key !== 'Escape') return;
      if (ev && ev.type === 'mousedown' && menu.contains(ev.target)) return;
      killMenu();
      document.removeEventListener('mousedown', close, true);
      document.removeEventListener('keydown', close, true);
    };
    setTimeout(() => {
      document.addEventListener('mousedown', close, true);
      document.addEventListener('keydown', close, true);
    }, 0);
  }

  // ---- Tự chọn Đ.Dùng khi Enter chọn thuốc ----
  const ROUTE_COMBO_SELECTOR = 'ng-combobox[formcontrolname="ph_route"]';
  let hlxRouteSt = null;

  function hlxRouteClean(t) {
    return String(t || '').replace(/\s+/g, ' ').trim();
  }
  function hlxRouteCurrent(combo) {
    const v = combo && combo.querySelector('.ng-value-label');
    return v ? hlxRouteClean(v.textContent) : '';
  }
  function hlxPharmacySelectedText() {
    const host = document.querySelector('ng-selector[formcontrolname="pharmacy"]');
    if (!host) return '';
    for (const t of host.querySelectorAll('.text')) {
      const s = hlxRouteClean(t.textContent);
      if (s && !t.classList.contains('default') && !/^chọn/i.test(s)) return s;
    }
    return '';
  }
  function rxNapAndRefocus() {
    setTimeout(() => tryClickNapButton(), SUPPLY_QTY_RECALC_DELAY_MS);
    hlxHoldThuocFocus(4000);
  }

  function hlxRouteOnPharmacyEnter(input) {
    if (hlxRouteSt) hlxRouteSt.cancelled = true;
    const st = { done: false, cancelled: false, typed: false, wantNap: false, swallow: false, buf: [] };
    hlxRouteSt = st;

    // Thuốc đang được tô sáng trong danh sách chính là thuốc sắp được chọn bằng Enter
    const dd = input.closest('.ui.dropdown');
    const hi = dd && dd.querySelector('.menu .item.selected');
    const pre = hi && hi.offsetParent !== null ? hlxRouteClean(hi.textContent) : '';
    const before = hlxPharmacySelectedText();

    const onKey = (e) => {
      if (!e.isTrusted || st.cancelled) return;
      if (/^(Shift|Control|Alt|Meta|CapsLock)$/.test(e.key)) return;
      if (st.swallow) {
        if (e.key === 'Enter') st.wantNap = true;
        else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { st.buf.push(e.key); st.typed = true; }
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      } else if (e.key.length === 1 || e.key === 'Backspace') {
        st.typed = true;
      }
    };
    window.addEventListener('keydown', onKey, true);

    const finish = () => {
      window.removeEventListener('keydown', onKey, true);
      document.body.classList.remove('hlx-route-guard');
      if (st.done) return;
      st.done = true;
      if (hlxRouteSt === st) hlxRouteSt = null;
      if (st.wantNap && !st.cancelled) rxNapAndRefocus();
    };

    const t0 = Date.now();
    let enabledSince = 0;
    const tick = () => {
      if (st.cancelled) { finish(); return; }
      if (Date.now() - t0 > 3500) { finish(); return; }
      const cur = hlxPharmacySelectedText();
      const name = pre || (cur && cur !== before ? cur : '');
      const combo = hlxQ(ROUTE_COMBO_SELECTOR);
      const sel = combo && combo.querySelector('ng-select');
      const enabled = !!sel && !sel.classList.contains('ng-select-disabled');
      if (enabled && !enabledSince) enabledSince = Date.now();
      if (name && enabled) {
        try { hlxDoseApply(name); } catch (err) { console.warn('[Helixfast] Liều dùng lỗi', err); }
        setTimeout(() => (hlxRouteNative() ? finish() : hlxRouteApply(name, st, finish)), 200);
        return;
      }
      if (enabled && Date.now() - enabledSince > 800 && !name) { finish(); return; }
      setTimeout(tick, 100);
    };
    setTimeout(tick, 100);
  }

  async function hlxRouteApply(name, st, finish) {
    const res = hlxRouteResolve(name, null, hlxDoseUnitText());
    const target = res.route;
    console.log('[Helixfast] Cách dùng:', name, '→', target || '(mặc định của máy)', res.kw ? '(khớp "' + res.kw + '")' : (res.guess ? '(đoán theo dạng bào chế)' : '(mặc định)'));
    const combo = hlxQ(ROUTE_COMBO_SELECTOR);
    try {
      if (st.cancelled || !combo) return;
      if (!target) return; // dạng thuốc không phải viên & không khớp quy tắc: để nguyên mặc định của máy
      if (hlxRouteNorm(hlxRouteCurrent(combo)) === hlxRouteNorm(target)) return;

      const dayEl0 = hlxQ(SUPPLY_DAY_SELECTOR);
      hlxRouteEnsureCss();
      hlxStopDayHold();
      st.swallow = true;
      document.body.classList.add('hlx-route-guard');

      const container = combo.querySelector('.ng-select-container');
      let ok = false;
      for (let attempt = 0; attempt < 2 && !ok && container; attempt++) {
        container.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        const inp = await baWaitFor(() => combo.querySelector('.ng-input input'), 1500);
        if (!inp) continue;
        setNativeValue(inp, target);
        const opt = await baWaitFor(() => {
          const id = inp.getAttribute('aria-controls');
          const panel = (id && document.getElementById(id)) || document.querySelector('.ng-dropdown-panel');
          if (!panel) return null;
          return Array.from(panel.querySelectorAll('.ng-option')).find(
            (o) => hlxRouteNorm(o.textContent) === hlxRouteNorm(target)
          ) || null;
        }, 2000);
        if (opt) {
          opt.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          ok = !!(await baWaitFor(() => hlxRouteNorm(hlxRouteCurrent(combo)) === hlxRouteNorm(target), 1200));
        }
        if (!ok) {
          inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true }));
          await baSleep(150);
        }
      }
      if (!ok) console.warn('[Helixfast] Không chọn được Đ.Dùng "' + target + '".');
      document.body.classList.remove('hlx-route-guard');
      st.swallow = false;

      // Trả con trỏ về ô Số ngày
      const day = hlxQ(SUPPLY_DAY_SELECTOR);
      if (day && !st.cancelled) {
        day.focus();
        if (st.buf.length) {
          setNativeValue(day, (day.value || '') + st.buf.join(''));
        }
        if (st.typed) {
          try { day.setSelectionRange(day.value.length, day.value.length); } catch (err) {}
        } else {
          if (typeof day.select === 'function') day.select();
          if (!st.wantNap) hlxHoldDayFocus();
        }
      } else if (dayEl0 && !st.cancelled) {
        dayEl0.focus();
      }
    } catch (err) {
      console.warn('[Helixfast] Lỗi chọn Đ.Dùng:', err);
      document.body.classList.remove('hlx-route-guard');
      st.swallow = false;
    } finally {
      finish();
    }
  }

  const COMPLETE_EXAM_DIALOG_TITLE = 'Hoàn thành khám';
  const AUTO_SAVE_WAIT_WINDOW_MS = 8000;
  const AUTO_SAVE_CLICK_GAP_MS = 300;

  let awaitingCompleteExamDialog = false;

  let quickPrintOverlayFlow = false;
  function endQuickPrintOverlay(delay) {
    if (!quickPrintOverlayFlow) return;
    quickPrintOverlayFlow = false;
    setTimeout(hidePrintOverlay, delay || 0);
  }
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
        endQuickPrintOverlay(AUTO_SAVE_CLICK_GAP_MS + 600);
        return;
      }
      steps[i].click();
      setTimeout(() => runStep(i + 1), AUTO_SAVE_CLICK_GAP_MS);
    }
    runStep(0);
  }

  hlxDocListen(
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
        endQuickPrintOverlay(0);
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
  if (!HLX_OFF) autoSaveDialogObserver.observe(document.body, { childList: true, subtree: true });

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
      endQuickPrintOverlay(0);
    }, AUTO_SAVE_WAIT_WINDOW_MS);
  }

  function tryClickCompleteExamToolbarButton(attemptsLeft) {
    if (attemptsLeft === undefined) attemptsLeft = 10;
    const completeBtn = findToolbarButton(TOOLBAR_COMPLETE_BTN_SELECTOR);
    if (completeBtn) {
      if (completeBtn.disabled) { endQuickPrintOverlay(0); return; }
      completeBtn.click();
      startWaitingForCompleteExamDialogThenConfirm();
      return;
    }
    if (attemptsLeft > 1) {
      setTimeout(() => tryClickCompleteExamToolbarButton(attemptsLeft - 1), PRINT_OUTPATIENT_WAIT_RETRY_GAP_MS);
    } else {
      endQuickPrintOverlay(0);
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

  const EXAM_SUBTAB_HREF = '#examination';
  const EXAM_SUBTAB_SWITCH_WAIT_MS = 200;

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
        cursor: wait;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: inherit;
        overflow: hidden;
        background: linear-gradient(120deg, #e0f2fe, #ede9fe, #dcfce7, #e0f2fe);
        background-size: 300% 300%;
        animation: his-po-bg 9s ease infinite;
      }
      /* các vệt sáng mờ trôi nhẹ phía sau */
      #${PRINT_OVERLAY_ID}::before,
      #${PRINT_OVERLAY_ID}::after {
        content: '';
        position: absolute;
        width: 46vmax;
        height: 46vmax;
        border-radius: 50%;
        filter: blur(70px);
        opacity: .55;
      }
      #${PRINT_OVERLAY_ID}::before {
        background: #60a5fa;
        top: -18vmax; left: -14vmax;
        animation: his-po-float1 11s ease-in-out infinite alternate;
      }
      #${PRINT_OVERLAY_ID}::after {
        background: #34d399;
        bottom: -20vmax; right: -14vmax;
        animation: his-po-float2 13s ease-in-out infinite alternate;
      }
      #${PRINT_OVERLAY_ID} .his-po-card {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 18px;
        padding: 30px 46px 26px;
        border-radius: 22px;
        background: rgba(255, 255, 255, 0.72);
        backdrop-filter: blur(10px);
        box-shadow: 0 18px 50px rgba(30, 64, 175, .22), 0 0 0 1px rgba(255,255,255,.8) inset;
        animation: his-po-pop .35s ease-out both;
      }
      #${PRINT_OVERLAY_ID} .his-po-ring {
        position: relative;
        width: 74px;
        height: 74px;
        border-radius: 50%;
        background: conic-gradient(from 0deg, #2563eb, #7c3aed, #06b6d4, #10b981, #facc15, #2563eb);
        -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 7px), #000 calc(100% - 6px));
                mask: radial-gradient(farthest-side, transparent calc(100% - 7px), #000 calc(100% - 6px));
        animation: his-po-spin 1.1s linear infinite;
        filter: drop-shadow(0 0 8px rgba(37, 99, 235, .55));
      }
      #${PRINT_OVERLAY_ID} .his-po-ring-wrap {
        position: relative;
        width: 74px;
        height: 74px;
      }
      #${PRINT_OVERLAY_ID} .his-po-ring-wrap::after {
        content: '';
        position: absolute;
        inset: 17px;
        border-radius: 50%;
        background: radial-gradient(circle, #3b82f6 0%, #2563eb 55%, rgba(37,99,235,0) 72%);
        animation: his-po-pulse 1.4s ease-in-out infinite;
      }
      #${PRINT_OVERLAY_ID} .his-print-overlay-text {
        font-size: 16px;
        font-weight: 700;
        letter-spacing: .2px;
        background: linear-gradient(90deg, #1e3a8a, #2563eb, #7c3aed, #0891b2, #1e3a8a);
        background-size: 250% 100%;
        -webkit-background-clip: text;
                background-clip: text;
        -webkit-text-fill-color: transparent;
                color: transparent;
        animation: his-po-shimmer 3s linear infinite;
      }
      #${PRINT_OVERLAY_ID} .his-po-dots span {
        display: inline-block;
        width: 7px; height: 7px;
        margin: 0 3px;
        border-radius: 50%;
        background: #2563eb;
        animation: his-po-bounce 1s ease-in-out infinite;
      }
      #${PRINT_OVERLAY_ID} .his-po-dots span:nth-child(2) { background: #7c3aed; animation-delay: .15s; }
      #${PRINT_OVERLAY_ID} .his-po-dots span:nth-child(3) { background: #10b981; animation-delay: .3s; }
      #${PRINT_OVERLAY_ID} .his-po-bar {
        width: 200px;
        height: 4px;
        border-radius: 4px;
        background: rgba(37, 99, 235, .15);
        overflow: hidden;
      }
      #${PRINT_OVERLAY_ID} .his-po-bar::before {
        content: '';
        display: block;
        width: 40%;
        height: 100%;
        border-radius: 4px;
        background: linear-gradient(90deg, #2563eb, #7c3aed, #10b981);
        animation: his-po-slide 1.3s ease-in-out infinite;
      }
      @keyframes his-po-spin { to { transform: rotate(360deg); } }
      @keyframes his-po-bg { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
      @keyframes his-po-float1 { to { transform: translate(18vw, 14vh) scale(1.15); } }
      @keyframes his-po-float2 { to { transform: translate(-16vw, -12vh) scale(1.1); } }
      @keyframes his-po-shimmer { to { background-position: -250% 0; } }
      @keyframes his-po-pulse { 0%,100% { transform: scale(.7); opacity: .7; } 50% { transform: scale(1.05); opacity: 1; } }
      @keyframes his-po-bounce { 0%,80%,100% { transform: translateY(0); opacity: .5; } 40% { transform: translateY(-7px); opacity: 1; } }
      @keyframes his-po-slide { 0% { transform: translateX(-110%); } 100% { transform: translateX(260%); } }
      @keyframes his-po-pop { from { opacity: 0; transform: scale(.92) translateY(8px); } to { opacity: 1; transform: none; } }
      @media print { #${PRINT_OVERLAY_ID} { display: none !important; } }
    `;
    document.head.appendChild(style);
  }

  let printOverlayLockHandler = null;
  let printOverlayWatchdog = null;
  const PRINT_OVERLAY_MAX_MS = 25000;
  const PRINT_OVERLAY_LOCK_EVENTS = [
    'keydown', 'keypress', 'keyup', 'mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu', 'wheel',
  ];

  function lockPrintOverlayInput() {
    if (printOverlayLockHandler) return;

    printOverlayLockHandler = (e) => {
      if (!e.isTrusted) return;
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    PRINT_OVERLAY_LOCK_EVENTS.forEach((t) =>
      window.addEventListener(t, printOverlayLockHandler, { capture: true, passive: false })
    );
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }

  function unlockPrintOverlayInput() {
    if (!printOverlayLockHandler) return;
    PRINT_OVERLAY_LOCK_EVENTS.forEach((t) =>
      window.removeEventListener(t, printOverlayLockHandler, { capture: true })
    );
    printOverlayLockHandler = null;
  }

  function showPrintOverlay(text) {
    injectPrintOverlayCss();
    lockPrintOverlayInput();
    clearTimeout(printOverlayWatchdog);

    printOverlayWatchdog = setTimeout(hidePrintOverlay, PRINT_OVERLAY_MAX_MS);
    let el = document.getElementById(PRINT_OVERLAY_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = PRINT_OVERLAY_ID;
      el.innerHTML =
        '<div class="his-po-card">' +
          '<div class="his-po-ring-wrap"><div class="his-po-ring"></div></div>' +
          '<div class="his-print-overlay-text"></div>' +
          '<div class="his-po-dots"><span></span><span></span><span></span></div>' +
          '<div class="his-po-bar"></div>' +
        '</div>';
      document.body.appendChild(el);
    }
    el.querySelector('.his-print-overlay-text').textContent = text || 'Đang xử lý...';
  }

  function hidePrintOverlay() {
    clearTimeout(printOverlayWatchdog);
    printOverlayWatchdog = null;
    unlockPrintOverlayInput();
    const el = document.getElementById(PRINT_OVERLAY_ID);
    if (el) el.remove();
  }

  function runPrintBangKeSequence() {

    showPrintOverlay('Đang xử lý, vui lòng chờ...');
    const FINISH_DELAY_MS = PRINT_DIALOG_CLOSE_DELAY_MS + 250;

    const trigger = findPrintMenuTriggerButton();
    if (trigger && !trigger.disabled) {
      trigger.click();
      waitAndClick(
        findPrintMenuItemBangKe,
        PRINT_SEQUENCE_MAX_ATTEMPTS,
        () => {
          clickFinalPrintButtonThenClose(PRINT_SEQUENCE_MAX_ATTEMPTS, () => {
            setTimeout(hidePrintOverlay, FINISH_DELAY_MS);
          });
        },
        hidePrintOverlay
      );
      return;
    }

    const originalHref = getActiveExamSubTabHref();
    if (originalHref === EXAM_SUBTAB_HREF) {
      hidePrintOverlay();
      return;
    }

    function restoreAndHideOverlay(delay) {
      setTimeout(() => {
        if (originalHref) clickExamSubTab(originalHref);
        setTimeout(hidePrintOverlay, EXAM_SUBTAB_SWITCH_WAIT_MS);
      }, delay || 0);
    }

    if (!clickExamSubTab(EXAM_SUBTAB_HREF)) {
      hidePrintOverlay();
      return;
    }

    setTimeout(() => {
      waitAndClick(findPrintMenuTriggerButton, PRINT_SEQUENCE_MAX_ATTEMPTS, () => {
        waitAndClick(findPrintMenuItemBangKe, PRINT_SEQUENCE_MAX_ATTEMPTS, () => {
          clickFinalPrintButtonThenClose(PRINT_SEQUENCE_MAX_ATTEMPTS, () => {
            restoreAndHideOverlay(FINISH_DELAY_MS);
          });
        }, () => {
          restoreAndHideOverlay(0);
        });
      }, () => {
        restoreAndHideOverlay(0);
      });
    }, EXAM_SUBTAB_SWITCH_WAIT_MS);
  }

  function handlePrintOutpatientClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (isCancelCompleteButtonVisible()) {
      runPrintBangKeSequence();
    } else {

      quickPrintOverlayFlow = true;
      showPrintOverlay('Đang xử lý, vui lòng chờ...');
      tryClickCompleteExamToolbarButton();
    }
  }

  const PRINT_RX_BTN_ID = 'his-print-rx-btn';
  const PRINT_RX_LABEL = 'In toa thuốc';
  const RX_SUBTAB_HREF = '#pharmacy';
  const RX_PICKER_MENU_ID = 'his-print-rx-menu';

  function getRxTabBadgeCount() {
    const bar = findExamSubTabBar();
    if (!bar) return 0;
    const link = bar.querySelector('a[data-toggle="tab"][href="' + RX_SUBTAB_HREF + '"]');
    if (!link) return 0;
    const spans = Array.from(link.querySelectorAll('span'));
    const badgeSpan = spans.find((s) => /^\d+$/.test(s.textContent.trim()));
    if (badgeSpan) return parseInt(badgeSpan.textContent.trim(), 10) || 0;
    const fullText = link.textContent.replace(/\s+/g, ' ').trim();
    const m = fullText.match(/(\d+)\s*$/);
    return m ? parseInt(m[1], 10) || 0 : 0;
  }

  function findPrintIconInRow(row) {
    let btn = row.querySelector('.action-col button[title="In"]');
    if (btn) return btn;
    btn = row.querySelector('button[title="In"]');
    if (btn) return btn;
    const candidates = row.querySelectorAll('button, a');
    for (const el of candidates) {
      const t = (el.getAttribute('title') || el.getAttribute('aria-label') || '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
      if (t === 'in' || t === 'in toa' || t === 'in đơn') return el;
    }
    const iconBtn = row.querySelector('button i.fa-print, a i.fa-print, i.fa-print');
    if (iconBtn) return iconBtn.closest('button, a') || iconBtn;
    return null;
  }

  const RX_ROW_LABEL_PATTERN = /Đơn\s*thuốc\s*số/i;

  function collectRxPrintEntries() {
    const entries = [];
    let rows = Array.from(document.querySelectorAll('p-table tr'));
    let printBtns = rows.map((row) => findPrintIconInRow(row)).filter(Boolean);
    if (printBtns.length === 0) {
      rows = Array.from(document.querySelectorAll('tr'));
    }

    rows.forEach((row) => {
      const rowText = row.textContent.replace(/\s+/g, ' ').trim();
      const labelEl = row.querySelector('a.btn-expand b');
      const labelText = labelEl ? labelEl.textContent.replace(/\s+/g, ' ').trim() : '';
      if (!RX_ROW_LABEL_PATTERN.test(labelText) && !RX_ROW_LABEL_PATTERN.test(rowText)) return;

      const printBtn = findPrintIconInRow(row);
      if (!printBtn) return;
      if (!document.contains(printBtn)) return;

      let label = labelText;
      if (!label) {
        const m = rowText.match(/Đơn thuốc số[^)]*\)/i);
        label = m ? m[0] : 'Đơn thuốc';
      }
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

    menu.style.visibility = 'hidden';
    document.body.appendChild(menu);
    const anchorRect = anchorBtn.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const margin = 8;

    let left = anchorRect.right - menuRect.width;
    if (left < margin) left = margin;
    if (left + menuRect.width > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - menuRect.width - margin);
    }

    let top = anchorRect.bottom + 4;
    if (top + menuRect.height > window.innerHeight - margin) {
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
    if (originalHref === RX_SUBTAB_HREF) return;

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
    Object.assign(btn.style, {
      background: '#6f42c1',
      borderColor: '#6f42c1',
      color: '#fff',
    });
    btn.addEventListener('click', handlePrintRxClick);
    return btn;
  }

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
    const isCancelCompleteState = isCancelCompleteButtonVisible();
    const desiredLabel = isCancelCompleteState
      ? PRINT_OUTPATIENT_LABEL_REPRINT
      : PRINT_OUTPATIENT_LABEL_DEFAULT;
    const currentLabel = btn.textContent.replace(/\s+/g, ' ').trim();
    if (currentLabel !== desiredLabel) {
      btn.innerHTML = '<i class="fa fa-print"></i> ' + desiredLabel;
    }
  }

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

  function isCurrentPrescriptionEmpty() {
    const tables = findRxTables();
    if (!tables.length) return false;
    return tables.every((t) => {
      const tbody = t.querySelector('tbody');
      const rows = tbody ? getRxRows(tbody) : [];
      return rows.length === 0;
    });
  }

  function tryAutoCheckTaiKhamOnce() {
    const cb = findTaiKhamCheckbox();
    if (!cb) return false;
    if (isPCheckboxChecked(cb)) return true;
    if (isPCheckboxDisabled(cb)) return false;
    if (isCurrentPrescriptionEmpty()) return false;
    const clickTarget = cb.querySelector('[data-pc-section="input"]') || cb;
    clickTarget.click();
    return isPCheckboxChecked(cb);
  }

  let lastActiveExamSubTabHref = null;
  function autoCheckTaiKhamRetry(attemptsLeft, onDone) {
    if (attemptsLeft === undefined) attemptsLeft = 10;
    if (tryAutoCheckTaiKhamOnce()) {
      if (onDone) onDone();
      return;
    }
    if (attemptsLeft > 0) {
      setTimeout(() => autoCheckTaiKhamRetry(attemptsLeft - 1, onDone), 300);
    } else if (onDone) {
      onDone();
    }
  }
  function watchExamSubTabForRxAutoCheck() {
    const href = getActiveExamSubTabHref();
    if (href === RX_SUBTAB_HREF && lastActiveExamSubTabHref !== RX_SUBTAB_HREF) {
      autoCheckTaiKhamRetry();
    }
    lastActiveExamSubTabHref = href;
  }

  function uncheckTaiKhamCheckbox(cb) {
    if (!isPCheckboxChecked(cb) || isPCheckboxDisabled(cb)) return false;
    const clickTarget = cb.querySelector('[data-pc-section="input"]') || cb;
    clickTarget.click();
    return !isPCheckboxChecked(cb);
  }

  function clearTaiKhamDaysInputIfAny() {
    const input = findTaiKhamDaysInput();
    if (!input || input.disabled || !input.value) return;
    setNativeValue(input, '');
    setTimeout(() => {
      input.dispatchEvent(new Event('blur', { bubbles: true }));
      document.body.click();
    }, 50);
  }

  function autoUncheckTaiKhamIfPrescriptionEmptied() {
    const cb = findTaiKhamCheckbox();
    if (!cb || !isPCheckboxChecked(cb)) return;
    if (!isCurrentPrescriptionEmpty()) return;
    if (uncheckTaiKhamCheckbox(cb)) {
      clearTaiKhamDaysInputIfAny();
      rxDaysMax = 0;
    }
  }

  let rxDaysMax = 0;
  let rxDaysPatientKey = null;

  function getCurrentPatientKeyForRxDays() {
    const updateBtn = document.querySelector('button[title="Cập nhật TTHC"]');
    const group = updateBtn ? updateBtn.closest('.ui-inputgroup') : null;
    const input = group ? group.querySelector('input[pinputtext]') : null;
    const val = input ? input.value.trim() : '';
    if (val) return val;
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
    return document.querySelector('input[plthousandformater]');
  }

  function applyRxDaysMaxToTaiKham() {
    const input = findTaiKhamDaysInput();
    if (!input || input.disabled) return;
    if (input.value === String(rxDaysMax)) return;
    setNativeValue(input, String(rxDaysMax));
    setTimeout(() => {
      input.dispatchEvent(new Event('blur', { bubbles: true }));
      document.body.click();
    }, 50);
  }

  hlxDocListen(
    'keydown',
    (e) => {
      if (e.key !== 'Enter') return;
      const target = e.target;
      if (!target || target.tagName !== 'INPUT') return;
      if (!target.matches(SUPPLY_DAY_SELECTOR)) return;
      const val = parseInt((target.value || '').replace(/\D/g, ''), 10);
      if (!val || val <= 0) return;
      resetRxDaysTrackingIfPatientChanged();
      if (val > rxDaysMax) rxDaysMax = val;
      autoCheckTaiKhamRetry(undefined, applyRxDaysMaxToTaiKham);
    },
    true
  );

  function ensureCustomPrintButtonsPlacement() {
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
    autoUncheckTaiKhamIfPrescriptionEmptied();
  }

  const HELIXFAST_STORAGE_KEY = 'helixfast_enabled';
  const HELIXFAST_TOGGLE_LI_ID = 'helixfast-toggle-li';
  const HELIXFAST_SETTINGS_LINK_SELECTOR = 'a[title="Thiết lập"]';
  const BSDHA_RX_LI_ID = 'helixfast-rx-li';
  const BSDHA_RX_ORIGIN = 'https://bsdha.github.io';
  const BSDHA_RX_URL = BSDHA_RX_ORIGIN + '/donthuoc?mode=kt';

  // Bật/tắt cơ bản (công tắc + bản quyền). Dùng cho các phần luôn chạy: nút chọn nhanh DS chỉ định, khóa Đơn thuốc cấp cứu...
  function hlxBaseEnabled() {
    if (!hlxGetLicenseStatus().valid) return false;
    try {
      const v = localStorage.getItem(HELIXFAST_STORAGE_KEY);
      return v === null ? true : v === '1';
    } catch (err) {
      return true;
    }
  }

  // Trang Cấp cứu / Nội trú: gói Cơ bản chỉ chạy phần cơ bản; các chức năng khác (gồm tab Bệnh án) cần mã kích hoạt gói Nâng cao
  function hlxIsRestrictedPage() {
    const p = location.pathname;
    return p.indexOf('/his/emergency') !== -1 || p.indexOf('/his/ipd') !== -1;
  }
  // Gói Nâng cao = mã kích hoạt có t:'adv' (còn hạn, đúng máy)
  function hlxAdvancedOn() {
    const l = hlxGetLicenseStatus();
    return !!(l.valid && l.tier === 'adv');
  }
  function hlxTierName() { return hlxAdvancedOn() ? 'Nâng cao' : 'Cơ bản'; }

  // Cổng chung cho mọi chức năng mở rộng của Helixfast
  function isHelixfastEnabled() {
    if (!hlxBaseEnabled()) return false;
    if (hlxIsRestrictedPage() && !hlxAdvancedOn()) return false;
    return true;
  }

  function setHelixfastEnabled(enabled) {
    try {
      localStorage.setItem(HELIXFAST_STORAGE_KEY, enabled ? '1' : '0');
    } catch (err) {
    }
  }

  function injectHelixfastToggleCss() {
    if (document.getElementById('helixfast-toggle-style')) return;
    const style = document.createElement('style');
    style.id = 'helixfast-toggle-style';
    style.textContent = `
      #${BSDHA_RX_LI_ID} {
        position: relative !important;
        z-index: 2147483647 !important;
        isolation: isolate;
        display: inline-flex !important;
        align-items: center;
        width: auto !important;
        min-width: 0 !important;
        max-width: none !important;
        overflow: visible !important;
      }
      #${BSDHA_RX_LI_ID} > a {
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
        outline: none !important;
        box-shadow: none !important;
      }
      #${BSDHA_RX_LI_ID} > a:hover { color: #0f9d78; }
      #${BSDHA_RX_LI_ID} > a { position: relative; z-index: 2147483647; }
      .new-button .new-message,
      .new-button .pre-new-message { pointer-events: none !important; }
      body.hlx-rx-hover .new-button .new-message,
      body.hlx-rx-hover .new-button .pre-new-message,
      body.hlx-rx-hover .new-button .new-icon { display: none !important; }
      body.hlx-rx-hover .new-button { pointer-events: none !important; }
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
      .helixfast-label.hlx-has-new { display: inline-grid; }
      .helixfast-label .hlx-lbl { grid-area: 1 / 1; text-align: center; white-space: nowrap; transition: opacity .35s ease; }
      .helixfast-label .hlx-lbl-new { opacity: 0; }
      .helixfast-label.hlx-show-new .hlx-lbl-cur { opacity: 0; }
      .helixfast-label.hlx-show-new .hlx-lbl-new { opacity: 1; }
    `;
    document.head.appendChild(style);
  }

  function applyHelixfastToggleVisual(li) {
    const sw = li.querySelector('.helixfast-switch');
    const link = li.querySelector('a');
    const labelEl = li.querySelector('.helixfast-label');
    if (!sw || !link) return;
    const enabled = hlxBaseEnabled();
    sw.classList.toggle('on', enabled);
    const lic = hlxGetLicenseStatus();
    const nearExpiry = lic.valid && lic.daysLeft <= 14;
    const isExpired = !lic.valid && lic.expired;
    if (labelEl) {
      let label = 'Helixfast v' + HELIXFAST_VERSION;
      if (isExpired) label += ' — Đã hết hạn';
      else if (!lic.valid) label += ' (Chưa kích hoạt)';
      else if (nearExpiry) label += ' — Sắp hết hạn';
      if (hlxUpdState.hasNew && hlxUpdState.remote) {
        // Hai nhãn xếp chồng trong cùng một ô lưới => độ rộng nút luôn = nhãn dài nhất, không bị giật
        const alt = '⬆ Bản mới v' + hlxUpdState.remote;
        const key = label + '|' + alt;
        if (labelEl.dataset.hlxKey !== key) {
          labelEl.dataset.hlxKey = key;
          labelEl.textContent = '';
          const sa = document.createElement('span'); sa.className = 'hlx-lbl hlx-lbl-cur'; sa.textContent = label;
          const sb = document.createElement('span'); sb.className = 'hlx-lbl hlx-lbl-new'; sb.textContent = alt;
          labelEl.append(sa, sb);
        }
        labelEl.classList.add('hlx-has-new');
        labelEl.classList.toggle('hlx-show-new', hlxUpdFlip);
      } else {
        delete labelEl.dataset.hlxKey;
        labelEl.classList.remove('hlx-has-new', 'hlx-show-new');
        labelEl.textContent = label;
      }
    }
    if (isExpired) {
      link.title = 'Bản quyền đã hết hạn — chuột phải → Bản quyền để kích hoạt lại';
    } else if (!lic.valid) {
      link.title = 'Chưa kích hoạt bản quyền — chuột phải → Bản quyền để kích hoạt';
    } else if (nearExpiry) {
      link.title = 'Còn ' + lic.daysLeft + ' ngày — sắp hết hạn, chuột phải → Bản quyền để gia hạn';
    } else {
      link.title = enabled ? 'Helixfast đang BẬT — bấm công tắc để tắt' : 'Helixfast đang TẮT — bấm công tắc để bật';
    }
    if (isExpired) {
      link.style.background = '#fdecea';
      link.style.color = '#c0392b';
    } else if (nearExpiry) {
      link.style.background = '#fff4e5';
      link.style.color = '#b45309';
    } else {
      link.style.background = '';
      link.style.color = '';
    }
  }

  function hlxFormatDate(epochSeconds) {
    const d = new Date(epochSeconds * 1000);
    const pad = (n) => String(n).padStart(2, '0');
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
  }

  let mainObserverDebounceTimer = null;


  // ===== Cập nhật phiên bản + hộp thoại xác nhận bật/tắt =====
  function hlxVerCmp(a, b) {
    const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
    for (let i = 0; i < Math.max(x.length, y.length); i++) {
      const d = (x[i] || 0) - (y[i] || 0);
      if (d) return d > 0 ? 1 : -1;
    }
    return 0;
  }

  // Nhấp nháy luân phiên: "Helixfast v2.0" <-> "⬆ Bản mới v2.1" khi có bản mới
  let hlxUpdFlip = false, hlxUpdFlipTimer = null;
  function hlxUpdFlipStart() {
    if (hlxUpdFlipTimer) return;
    hlxUpdFlipTimer = setInterval(() => {
      hlxUpdFlip = !hlxUpdFlip;
      const li = document.getElementById(HELIXFAST_TOGGLE_LI_ID);
      if (li) applyHelixfastToggleVisual(li);
    }, 2500);
  }
  function hlxUpdFlipStop() {
    if (hlxUpdFlipTimer) { clearInterval(hlxUpdFlipTimer); hlxUpdFlipTimer = null; }
    hlxUpdFlip = false;
  }

  async function hlxCheckUpdate() {
    try {
      const res = await fetch(HLX_UPDATE_META_URL + '?t=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const m = (await res.text()).match(/@version\s+([0-9][0-9.]*)/);
      if (!m) throw new Error('no version');
      hlxUpdState.remote = m[1];
      hlxUpdState.hasNew = hlxVerCmp(m[1], HELIXFAST_VERSION) > 0;
      hlxUpdState.error = false;
    } catch (err) {
      hlxUpdState.error = true;
    }
    hlxUpdState.checked = true;
    if (hlxUpdState.hasNew) hlxUpdFlipStart(); else hlxUpdFlipStop();
    const li = document.getElementById(HELIXFAST_TOGGLE_LI_ID);
    if (li) applyHelixfastToggleVisual(li);
    return hlxUpdState;
  }

  function closeUpdateDialog() {
    ['helixfast-update-dialog', 'helixfast-update-overlay'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
    document.removeEventListener('keydown', hlxUpdateDialogEsc, true);
  }
  function hlxUpdateDialogEsc(e) {
    if (e.isTrusted && e.key === 'Escape') closeUpdateDialog();
  }

  // Sau khi bấm "Cài bản mới": khi quay lại tab HIS thì nhắc tải lại để áp dụng
  let hlxUpdatePending = false;
  function hlxMarkUpdatePending() { hlxUpdatePending = true; }
  function hlxShowReloadToast() {
    if (document.getElementById('helixfast-reload-toast')) return;
    const t = document.createElement('div');
    t.id = 'helixfast-reload-toast';
    t.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:2147483647;background:#0f172a;color:#fff;padding:12px 16px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.35);font:600 13px system-ui,sans-serif;display:flex;gap:10px;align-items:center;';
    t.innerHTML = '<span>Đã cài xong Helixfast bản mới? Tải lại trang để áp dụng.</span>' +
      '<button type="button" id="hlx-rl-yes" style="background:#2563eb;color:#fff;border:0;border-radius:8px;padding:6px 12px;font-weight:700;cursor:pointer">Tải lại ngay</button>' +
      '<button type="button" id="hlx-rl-no" style="background:transparent;color:#cbd5e1;border:0;cursor:pointer;font-size:16px" title="Để sau">✕</button>';
    document.body.appendChild(t);
    t.querySelector('#hlx-rl-yes').addEventListener('click', () => window.location.reload());
    t.querySelector('#hlx-rl-no').addEventListener('click', () => t.remove());
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && hlxUpdatePending) {
      hlxUpdatePending = false;
      hlxShowReloadToast();
    }
  });

  function openUpdateDialog() {
    closeUpdateDialog();
    closeLicenseDialog();
    injectLicenseDialogCss();
    const overlay = document.createElement('div');
    overlay.id = 'helixfast-update-overlay';
    overlay.className = 'hlx-lic-overlay';
    overlay.addEventListener('click', closeUpdateDialog);
    const box = document.createElement('div');
    box.id = 'helixfast-update-dialog';
    box.className = 'hlx-lic-box';
    box.addEventListener('click', (e) => e.stopPropagation());
    box.innerHTML =
      '<div class="hlx-lic-head"><div class="hlx-lic-head-row">' +
      '<div class="hlx-lic-title"><span class="ico">⟳</span>Cập nhật Helixfast</div>' +
      '<span class="hlx-lic-pill ok" id="hlx-up-pill" style="display:none"></span></div>' +
      '<div class="hlx-lic-sub">Phiên bản đang dùng: v' + HELIXFAST_VERSION + '</div></div>' +
      '<div class="hlx-lic-body"><div id="hlx-up-msg" style="font-size:13px;font-weight:600;min-height:40px;line-height:1.5;color:#475569;">Đang kiểm tra bản mới...</div></div>' +
      '<div class="hlx-lic-foot">' +
      '<button id="hlx-up-close" type="button" class="hlx-lic-btn secondary">Đóng</button>' +
      '<button id="hlx-up-act" type="button" class="hlx-lic-btn primary" disabled>Đang kiểm tra...</button></div>';
    document.body.appendChild(overlay);
    document.body.appendChild(box);
    document.addEventListener('keydown', hlxUpdateDialogEsc, true);
    const msg = box.querySelector('#hlx-up-msg');
    const act = box.querySelector('#hlx-up-act');
    const pill = box.querySelector('#hlx-up-pill');
    box.querySelector('#hlx-up-close').addEventListener('click', closeUpdateDialog);
    let mode = 'check';
    const show = () => {
      act.disabled = false;
      if (hlxUpdState.error) {
        mode = 'manual';
        msg.style.color = '#b45309';
        msg.textContent = 'Không kiểm tra được phiên bản (có thể do mạng). Bạn có thể mở trang cập nhật thủ công hoặc kiểm tra lại.';
        act.textContent = '⬇ Mở trang cập nhật';
      } else if (hlxUpdState.hasNew) {
        mode = 'install';
        pill.style.display = '';
        pill.className = 'hlx-lic-pill warn';
        pill.textContent = '● Có bản mới';
        msg.style.color = '#15803d';
        msg.textContent = 'Đã có bản mới v' + hlxUpdState.remote + ' (bạn đang dùng v' + HELIXFAST_VERSION + '). Bấm "Cài bản mới", rồi bấm Cài đặt/Update ở tab vừa mở và tải lại trang HIS.';
        act.textContent = '⬇ Cài bản v' + hlxUpdState.remote;
      } else {
        mode = 'check';
        pill.style.display = '';
        pill.className = 'hlx-lic-pill ok';
        pill.textContent = '● Mới nhất';
        msg.style.color = '#15803d';
        msg.textContent = '✅ Bạn đang dùng bản mới nhất (v' + HELIXFAST_VERSION + ').';
        act.textContent = '⟳ Kiểm tra lại';
      }
    };
    const run = async () => {
      act.disabled = true;
      act.textContent = 'Đang kiểm tra...';
      msg.style.color = '#475569';
      msg.textContent = 'Đang kiểm tra bản mới...';
      await hlxCheckUpdate();
      if (!document.getElementById('helixfast-update-dialog')) return;
      show();
    };
    act.addEventListener('click', () => {
      if (mode === 'install') { hlxMarkUpdatePending(); window.open(HLX_UPDATE_USER_URL + '?t=' + Date.now(), '_blank'); closeUpdateDialog(); return; }
      if (mode === 'manual' && hlxUpdState.error && act.textContent.indexOf('Mở trang') !== -1) {
        hlxMarkUpdatePending();
        window.open(HLX_UPDATE_USER_URL + '?t=' + Date.now(), '_blank');
        return;
      }
      run();
    });
    run();
  }

  function hlxConfirmToggle() {
    const old = document.getElementById('helixfast-toggle-confirm');
    if (old) return;
    injectLicenseDialogCss();
    const turningOff = hlxBaseEnabled();
    const overlay = document.createElement('div');
    overlay.id = 'helixfast-toggle-confirm-overlay';
    overlay.className = 'hlx-lic-overlay';
    const box = document.createElement('div');
    box.id = 'helixfast-toggle-confirm';
    box.className = 'hlx-lic-box';
    box.style.width = '340px';
    box.innerHTML =
      '<div class="hlx-lic-head' + (turningOff ? ' warn' : '') + '"><div class="hlx-lic-title"><span class="ico">🧬</span>Helixfast đang ' + (turningOff ? 'BẬT' : 'TẮT') + '</div></div>' +
      '<div class="hlx-lic-body" style="padding-bottom:16px;font-size:13.5px;font-weight:600;line-height:1.5;">' +
      (turningOff ? 'Bạn muốn <b>TẮT</b> Helixfast? Trang sẽ tải lại.' : 'Bạn muốn <b>BẬT</b> Helixfast? Trang sẽ tải lại.') + '</div>' +
      '<div class="hlx-lic-foot"><button type="button" id="hlx-tg-no" class="hlx-lic-btn secondary">Giữ nguyên</button>' +
      '<button type="button" id="hlx-tg-yes" class="hlx-lic-btn primary">' + (turningOff ? 'Tắt Helixfast' : 'Bật Helixfast') + '</button></div>';
    document.body.appendChild(overlay);
    document.body.appendChild(box);
    const close = () => {
      overlay.remove(); box.remove();
      document.removeEventListener('keydown', onKey, true);
    };
    const onKey = (e) => { if (e.isTrusted && e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey, true);
    overlay.addEventListener('click', close);
    box.addEventListener('click', (e) => e.stopPropagation());
    box.querySelector('#hlx-tg-no').addEventListener('click', close);
    box.querySelector('#hlx-tg-yes').addEventListener('click', () => {
      setHelixfastEnabled(!turningOff);
      const li = document.getElementById(HELIXFAST_TOGGLE_LI_ID);
      if (li) applyHelixfastToggleVisual(li);
      close();
      setTimeout(() => window.location.reload(), 150);
    });
    box.querySelector('#hlx-tg-no').focus();
  }

  function closeLicenseDialog() {
    const existing = document.getElementById('helixfast-license-dialog');
    if (existing) existing.remove();
    const overlay = document.getElementById('helixfast-license-overlay');
    if (overlay) overlay.remove();
  }

  async function hlxTryPaste(targetEl, btn) {
    if (!targetEl) return;
    targetEl.focus();
    if (targetEl.select) targetEl.select();
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          targetEl.value = text.trim();
          if (btn) {
            const old = btn.textContent;
            btn.textContent = 'Đã dán';
            setTimeout(() => (btn.textContent = old), 1200);
          }
          return;
        }
      }
    } catch (err) {
    }
  }

  function injectLicenseDialogCss() {
    if (document.getElementById('helixfast-license-css')) return;
    const style = document.createElement('style');
    style.id = 'helixfast-license-css';
    style.textContent = `
      .hlx-lic-overlay{position:fixed;inset:0;background:rgba(15,23,42,.55);backdrop-filter:blur(2px);z-index:999998;animation:hlxFadeIn .15s ease-out;}
      .hlx-lic-box{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:360px;max-width:92vw;
        background:#fff;border-radius:14px;overflow:hidden;z-index:999999;zoom:1.2;
        box-shadow:0 24px 64px rgba(15,23,42,.35),0 2px 8px rgba(15,23,42,.12);
        font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1e293b;font-size:12.5px;
        animation:hlxPopIn .18s cubic-bezier(.2,.9,.3,1.2);}
      @keyframes hlxFadeIn{from{opacity:0}to{opacity:1}}
      @keyframes hlxPopIn{from{opacity:0;transform:translate(-50%,-46%) scale(.96)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
      .hlx-lic-head{position:relative;overflow:hidden;padding:20px 22px 18px;color:#fff;
        background:linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 45%,#3b82f6 100%);}
      .hlx-lic-head::before{content:"";position:absolute;top:-40px;right:-30px;width:160px;height:160px;
        border-radius:50%;background:rgba(255,255,255,.10);}
      .hlx-lic-head::after{content:"";position:absolute;bottom:-50px;right:40px;width:110px;height:110px;
        border-radius:50%;background:rgba(255,255,255,.07);}
      .hlx-lic-head-row{position:relative;display:flex;align-items:center;justify-content:space-between;}
      .hlx-lic-title{font-weight:700;font-size:15px;display:flex;align-items:center;gap:8px;letter-spacing:.2px;}
      .hlx-lic-title .ico{font-size:17px;filter:drop-shadow(0 1px 1px rgba(0,0,0,.25));}
      .hlx-lic-pill{position:relative;display:inline-flex;align-items:center;gap:5px;font-weight:600;font-size:11px;
        padding:4px 10px;border-radius:20px;backdrop-filter:blur(4px);white-space:nowrap;}
      .hlx-lic-pill{font-size:12px !important;padding:5px 12px !important;font-weight:700 !important;}
      .hlx-lic-pill.ok{background:linear-gradient(135deg,#22c55e,#15803d);color:#fff;border:1px solid #86efac;
        box-shadow:0 2px 10px rgba(21,128,61,.55);text-shadow:0 1px 1px rgba(0,0,0,.25);}
      .hlx-lic-pill.warn{background:linear-gradient(135deg,#fbbf24,#d97706);color:#fff;border:1px solid #fde68a;
        box-shadow:0 2px 10px rgba(217,119,6,.5);text-shadow:0 1px 1px rgba(0,0,0,.25);}
      .hlx-lic-pill.bad{background:#fff;color:#b91c1c;border:1px solid #fecaca;
        box-shadow:0 2px 10px rgba(127,29,29,.45);}
      .hlx-lic-head.bad{background:linear-gradient(135deg,#7f1d1d 0%,#dc2626 50%,#ef4444 100%);}
      .hlx-lic-head.warn{background:linear-gradient(135deg,#92400e 0%,#d97706 55%,#f59e0b 100%);}
      .hlx-lic-btn.update{background:#f0fdf4;color:#15803d;border:1.5px solid #bbf7d0;margin-right:auto;}
      .hlx-lic-btn.update:hover{background:#dcfce7;}
      .hlx-lic-btn.update.has-new{background:linear-gradient(135deg,#22c55e,#15803d);color:#fff;border-color:#16a34a;}
      .hlx-lic-btn:disabled{opacity:.6;cursor:default;}
      .hlx-lic-upmsg{padding:0 22px 12px;font-size:12px;font-weight:600;min-height:0;}
      .hlx-lic-sub{position:relative;font-size:11px;color:rgba(255,255,255,.75);margin-top:5px;}
      .hlx-lic-body{padding:18px 22px 6px;}
      .hlx-lic-label{display:block;font-weight:600;font-size:11px;color:#64748b;text-transform:uppercase;
        letter-spacing:.4px;margin-bottom:6px;}
      .hlx-lic-field{margin-bottom:15px;}
      .hlx-lic-inputrow{display:flex;gap:7px;}
      .hlx-lic-input, .hlx-lic-textarea{width:100%;padding:8px 10px;border:1.5px solid #e2e8f0;border-radius:8px;
        font-size:12.5px;font-family:ui-monospace,Menlo,Consolas,monospace;color:#1e293b;
        background:#f8fafc;transition:border-color .15s,box-shadow .15s;}
      .hlx-lic-input:focus, .hlx-lic-textarea:focus{outline:none;border-color:#2563eb;
        box-shadow:0 0 0 3px rgba(37,99,235,.15);background:#fff;}
      .hlx-lic-textarea{resize:vertical;min-height:64px;}
      .hlx-lic-copybtn{padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;background:#fff;
        cursor:pointer;font-size:12px;font-weight:600;color:#334155;transition:.15s;white-space:nowrap;}
      .hlx-lic-copybtn:hover{background:#f1f5f9;border-color:#cbd5e1;}
      .hlx-lic-msg{margin-top:2px;font-size:12px;min-height:16px;font-weight:600;}
      .hlx-lic-contact{margin:2px 0 14px;padding:9px 11px;background:#f8fafc;border:1px solid #eef1f5;
        border-radius:8px;font-size:11.5px;color:#64748b;}
      .hlx-lic-contact b{color:#334155;}
      .hlx-lic-contact-zalo{display:flex;align-items:center;gap:6px;margin-top:5px;}
      .hlx-lic-contact-zalo svg{flex:none;}
      .hlx-lic-foot{padding:14px 22px;border-top:1px solid #eef1f5;display:flex;justify-content:flex-end;gap:8px;
        background:#fafbfc;}
      .hlx-lic-btn{padding:8px 16px;border-radius:8px;font-size:12.5px;font-weight:700;cursor:pointer;
        border:none;transition:.15s;}
      .hlx-lic-btn.secondary{background:#fff;color:#475569;border:1.5px solid #e2e8f0;}
      .hlx-lic-btn.secondary:hover{background:#f1f5f9;}
      .hlx-lic-btn.primary{background:linear-gradient(135deg,#1d4ed8,#2563eb);color:#fff;
        box-shadow:0 2px 8px rgba(37,99,235,.35);}
      .hlx-lic-btn.primary:hover{box-shadow:0 4px 14px rgba(37,99,235,.45);transform:translateY(-1px);}
    `;
    document.head.appendChild(style);
  }

  function openLicenseDialog() {
    closeLicenseDialog();
    injectLicenseDialogCss();

    const overlay = document.createElement('div');
    overlay.id = 'helixfast-license-overlay';
    overlay.className = 'hlx-lic-overlay';
    overlay.addEventListener('click', closeLicenseDialog);

    const box = document.createElement('div');
    box.id = 'helixfast-license-dialog';
    box.className = 'hlx-lic-box';
    box.addEventListener('click', (e) => e.stopPropagation());

    const machineCode = hlxGetMachineCode();
    const lic = hlxGetLicenseStatus();
    const nearExpiryDlg = lic.valid && lic.daysLeft <= 14;
    let pill;
    let subText;
    let headCls = '';
    if (lic.valid && !nearExpiryDlg) {
      pill = '<span class="hlx-lic-pill ok">● Đã kích hoạt</span>';
      subText = 'Còn ' + lic.daysLeft + ' ngày · Hết hạn: ' + hlxFormatDate(lic.exp);
    } else if (lic.valid && nearExpiryDlg) {
      pill = '<span class="hlx-lic-pill warn">● Sắp hết hạn</span>';
      headCls = ' warn';
      subText = 'Còn ' + lic.daysLeft + ' ngày · Hết hạn: ' + hlxFormatDate(lic.exp);
    } else if (lic.expired) {
      pill = '<span class="hlx-lic-pill bad">● Đã hết hạn</span>';
      headCls = ' bad';
      subText = 'Đã hết hạn ngày ' + hlxFormatDate(lic.exp) + ' — vui lòng kích hoạt lại';
    } else {
      pill = '<span class="hlx-lic-pill bad">● Chưa kích hoạt</span>';
      headCls = ' bad';
      subText = 'Kích hoạt theo máy';
    }

    box.innerHTML =
      '<div class="hlx-lic-head' + headCls + '">' +
      '<div class="hlx-lic-head-row">' +
      '<div class="hlx-lic-title"><span class="ico">🔑</span>Bản quyền Helixfast <span style="opacity:.7;font-weight:500;font-size:11px;">v' + HELIXFAST_VERSION + '</span></div>' +
      pill +
      '</div>' +
      '<div class="hlx-lic-sub">' + subText + '</div>' +
      '</div>' +
      '<div class="hlx-lic-body">' +
      '<div class="hlx-lic-field">' +
      '<label class="hlx-lic-label">Mã máy</label>' +
      '<div class="hlx-lic-inputrow">' +
      '<input id="helixfast-machine-code-input" class="hlx-lic-input" type="text" readonly value="' + machineCode + '">' +
      '<button id="helixfast-copy-machine-btn" type="button" class="hlx-lic-copybtn">Copy</button>' +
      '</div></div>' +
      '<div class="hlx-lic-field">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;">' +
      '<label class="hlx-lic-label" style="margin-bottom:0;">Mã kích hoạt</label>' +
      '<button id="helixfast-paste-license-btn" type="button" class="hlx-lic-copybtn" style="padding:4px 10px;font-size:11px;">Paste</button>' +
      '</div>' +
      '<textarea id="helixfast-license-input" class="hlx-lic-textarea" rows="3" placeholder="Dán mã kích hoạt..." style="margin-top:6px;"></textarea>' +
      '<div id="helixfast-license-msg" class="hlx-lic-msg"></div>' +
      '</div>' +
      '<div class="hlx-lic-contact">💬&nbsp;Liên hệ kích hoạt: <b>Hoàng Anh Jupiter</b>' +
      '<div class="hlx-lic-contact-zalo"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAPDklEQVR4nN2beZRU1ZnAf999r7q6obGR7mZRRAMosrhA4qgzGRUlxpAjJpr2EAwyiaPgFp14MsdlcjqcGZeTODFOzATFwWiIMWIiYyZGoxFBIEQ5Ii6IgIRFoEF2aLqW9+43f9z3+lVVVzfdiAT4Tr9T9W7d5dvut93bwgGCqnoiEha+A0OAM4DTgJOBE4B6oAaoAioAD5D2pgUskAdagN3AVmADsAp4D1gKvC8i+wrW9gErIvZA6ek8NKhnTOvClao6VlV/pqrvqGpGP30IVHWVqs5U1fGq2quAEZ6qtsfcTwiNamhU40evzTmdEiFSCmGEZBB9t9HTVYjHlc5XCk2q+qCqnlrIiINLfIOb0Ae4VC+7/xX9Syu1oYaqmi8g9lBAIVNi2KeqD6lqv5gJelC0oVF9gD636We4Sp+d8EQrBu1J5FCDVSeAGDap6tUx+qpqDpz4SPIVN2kD/6xbz/yBai7QIAw1tIdK1p2HUkbMUNXKA2dCRLyZond6N6tW3qC6fJNbIDgc5N4+FDLiNVWt6zoTIrVnst7r3abKRA3ue9Gpe/7wJr4QctHnW9olJiTE32G+oyrf0tyQRrXZwEn+8NP8DiFmwkJ1LruNYSzmSIN6TJWA6/QrpLlHMgQa4P/7OKTCc1HKp+RkPy1I4YKqc4GHo8CtyEUmDGhUw9NYbtb++MwwITZswYw4Gbn8TLAK/iewp39DiJlwtapOFJFAC+KEhKRlCCJKjv8mxbGiKCHm2xeAZxwDjmDwcCH2j1W1N6Aa2QPHgAb1mCUhk3UsaS6VLEGYx6uth4ZR0QxHmO6XgMExoBfQGOUMEv8Aw9DI7f0HinoGIQuXng49u0FoQY5sBkCiBdeo6iDAqqoxNKrPVLHUcQlpRpLHKngY+NooZ/iOEhAcA9LALSKigDEsi2hUbgJUgDAPtbXw+UFulDnypR+Dh5PpBFWtEZHAMEtCrtMBCBeSR4zBkIO/OwlqqpzxOwrUP4ZYC2qBSyC2AcKXSFOBJRAQLHx+sBtxhFv/cqDRMw4SBoyJoxyrgA9nnUj001EHBkfW36tqlc/NmibHKAIQMNZCRXc4pY/r3Z76h10sPhk58K1kFTTSRO+TB2PxDCcAQ30CBiL0x7k6owH0q4V+Na5Xe0gfBEQ6DUY42KpocQbxTB8YgkcFASoeQgjH94QKz3G9kAFxLrAvB6+vcW1Cx65SBAhhWH+or+5aPhH3fXsDbN8NlZXOOB8ErxSjPMLHMhgfEKyAh02kb7U4AowZsnYbjL5/P9PHjwfshWe+C1eMdFunszlFvN6tT8OcRdD7RFh7N1SmyjPyAJK1wT7CiUWjLNT3SCYsB1aBXEeYA1XgeSAW/F6JUY2lF1rXLX636pAXARsFqrH2VabApKF7RZmlFEJ18xTODR1u05ji432UPqWU9qxqZ1Q07Lie8F+TyvcJFbql4MdzYMUGCDJw/yQY0MshZqLEqhS5QrU2JTVdVTem1CXbiHBfkn4iydxxDFNGK+KmOh+hV6Surf2qynC6cNSx3eDm0eX7APz+XVi7GcIWmDQGbrkwIl4SKc9dAbMWw/LNDtHBtfD1cxxzf/cmSAquPiexG6VgrSO0OQcz5sPz78BHuyBlYHhfuOpcuGR4xBja3Ro9fJTq0tb97VGlrRsMrTOcf1kDX3kIgn3wuaHw8IQkmVIgF8CUmfDz13DbKDpbmiMw/c/QtwaaNjqMx5zqGFAqecUR/85GGD8Nlq3F2fUIpyUrYOZCmHQePDIxoafAoMffqnyEdCmL7X58vJQwySp4PmzdC+OnQ5CFunqYdR2k/WQ+I/CNx+CZuUAlHFPnrLpnYPFa2LYNmnaBX+OoLCeImBkf7YCLH4CmrUAKBvWDkQOgOQvzV8GeZnj8ZQiAmf+U2JgSSPkofmlrS75jBhSCkgQp46fD2o1gKuDJa+Gk2gKDJPDUYnhmPlAFFw6F6RNhYL37fcNOuPlX8OwbYD3HtHKqrxEht8+Gps1AJdz+Jfjel6FbtHVXboGJ/wOvr4ZfvgoTPgdjRzhcSmyPF4eFRbA703kGhKGb5dZZ8MpSN9sProQvnApBtGCseg+/BkZhQB08e4MjPrTuOb4nPD0Zhg4Amy3v6xXnET7eA7OXghgYNxLu/aojPrDuObk3/PYGOLaH80LT57ePf1slE6fKnYHAgu/B9AXwkxdc2zfOh9vGRL8ZJzEjsCcDH2wGG8IVn4VjKiEXMc8z7rtvYOK5QK48A2Lv8d4maN4LauCaf3Dt+Wi8b9z342rg4uGgIbzflAijVKuKGKBRy6Zd0Y8dRBVxQLNgNdw40w0eeTJMv8q5wtISWiZwBhCB3j0Sr9CKiLi23tUFuJRC1JjJO8niJS67cC6Jkrra7m5MLmw/dylmQBS5bdiZIFjWBUWS2LgLrpwG+RaoqYFfXwsVkdGzGql39FlTBb26u/3259VJoTUs6OsZWLiadn1WvJUG9AJJAzlYtMbhmS+Yh0jrXl/jtkmfHs4YaxlD2FYDPEfYlj3FXC9iEhCEcOUjsHELVFfD8992e88IpLxEtf3os8KDC4c4tX1+Kcx+y7V5xo1J+/DaKnhyIZiq8hIz4qQ/pA8MPc69P/BHWPUxVPru3TNuW/70VXjjQ7fe2BFufFhGmkUeQNVFYfua3aT9atrmAxb3PuUpWPCus/hjTnNSf3FZtO8LpYbb96efAN/9Ajy+ADJZ+PqjcOtFcOkZbr6X3ocfvgB5dUgXTlKYkAXWGcLvfxkaHnRu84L74V+/COcOcm7w6cXwyDwghL594frzHG3lKtt+qYyNgM3Bm+vgHwcX/xir6R+XwfSXoKIHBArPLYXZr1NedQ2wBx69yRmsJ66Bq6ZBZi/cNxvui4wnGZJSRbp4TwdhEuvHhvVro+DOK+Ce38CGLXDLE0BlJKGsG1dzDMyaDHXVSdhcAmoQgjbNAgs+bP2a9I4+F61xCOeyYDPObZUlPsqVpTsMrneIN4yCV2+HC4a7wgs593iVcP5p0Hg5EETzRgvWdnfvzVECJpHBvHsczLwRThsQ2YSsG9utB4w7Cxbe5Qq77RAPEAqTdREpziaPRTBGwObh+HpYORWqClLP+HP9DvhwM4iX2IRyIOLcUE01jOwfrVgQjCzb6IIWqzCoHk6P+ry5Dna3wFmfcRngtmZ4Zz1UpovrATFhocKStbB2u7MlQ/u5+Qr7tAMtwhR9GZ+LYgZAtA2yMO8Otw3KRFCfCApT30JQkiSns9AebrH2tEN8LMttBmW7wybZ7kaAPDz7VtK7aLQmEVxnntJkJq4Pxm4rsAlTCt1jufVKIQ5u4nni9QrrAx3AboPQVLp/rQJp+M0S53ZKI6g45+7s0x4irW6rpE/cXm69chAzzt/PegUQk/OxQVnXJhtU8Cpg3Qb4w3tuga5WgQ9ziClebzCswkVPZfOCB+e4r0fR8VghrDDAB4TkMMUbIbQuIpv7LsxbmcTqRwnEtL5j8FmN8hEu+ioiUQSwcNdzhxzBTxsMLgJ5y/ATySK8GZfGC3uFFrxuMP9tePINZ2COAi2IKVgFrHT7Xnm5vRMOVVeS/pdfuwQpruoewRDli8xzx+MAyh/IksO0zQ2sugrtlo/h+l8dFYelccYx2700qMcjsg7lFVKt9/WLILRgusNvF8OyTVGkeGRqQXw3aC3wqqqKYVgkVOEhOhCwCEgAa7a5945ygMMYYgY8KiJZwDNMlYBGNWzlBbIsIYWhtVpfMFJBPZdaHqGgOPXfAUyLboyGzgYsQ5glIfBvCIK2rREQQN9aGH5c1FYmLD2clSIMbYhjwA9FZCtgRCS6PDxLQhrU42F5niz/RyU+mtQJjAFtgQlnufQ0sMleiRMVa5OQ+XBiROS2Q88zPvAB8EB0SdJCYU1wGIqqYLiBPDvxMCjWiDvgrKlNyt2qrkoTH3l5JtEIzzhGBGWywEMFsVDUFW8tIC+9m92x/K/Zy0QkAxBdkytgwFSxXInhZ7KegGvwMSJYFO2Wgqeuc7V237iipx8VNPdmlBffzjL+pzs5446tPDavhUxeWzM8q4eGGYUpcywUEXTO8rz94o8y5uLbtn1r6MDKDxqeVq/wv8vaWn13cTLgOr3Tq+bucDv5sZ8N/P+83EouNGQDpWmnZfmmgDdW51n0YY71TWFy6SRQTjkxxTfPq+LKs6sY2Lv4rDuIzwmJQm3pemyhmhzJqTrtK0zWdjQrv3uzRWfMywRzP6xOsWXLneb3J9z7vTnqTx0tRSXA8mvHTJis91LF7bSEIft2CpI1WONKt6E6CirAVIgLJKOmMKuQU7rVGEYPTXPZqDSjh6UZ3Kf8P3PFl6A6dK2S5P3lYPMuy8KVOZ5bkuWFpRnbtMUq3Xp54u28z8zoe0d4vvrMlTb1z3aYr0IDJrpAfQdp7iEA9m0LRLO+MR4i2op0uYqPMRAEQMZ1qOhhGNHf55xBFZw1MMWI/j4n1nnUVZsu3x7b3aJ8tD1k+caAxWvyLFqVZ8m6PDu3W7A2oCrte1VVeMHeu3Iz+t7Tehm8DHS8dDxwil6BxzR86ti9NSTICmb/lTshMY5hCOTU1dEFSAs9qw19e3r0qzH0rTHUVhuOqRIqKwTfCFaVbB72ZJTtzZYtuy2bdoZs2mn5eI9FWzQ5uEip9VKiUtHTC4PMNs1lr+cX/WZ1RPz+GQCF2+EkPH6Ex1fJ7IPMdovxouBi/zKMi6Ct93jUVYwJNLrcEG/sDrA04uyMB3iCZ1BBraqK9auNYiDMzSa/5zvMPOmvnD/HZ+7otmX/LjEAKOLijToOuJN89mxsHoJmUOuOPVUEiUqsnYD4/k7rPZ6ORjn+qCrRH6pifPxq92OYex219/Dz+v9tg3NHOHQGUcD9Sw04d4nA5Nxl5HZdC3oRqR6VqIUw4w4VbKC0uhqBon9U2t+SRWdi2vquajC+YFLuFEUM5PdkQP6E6vRWwhvVwPdh6tROVS66nt2WcvabTQMhNQa1F4GOQu0JeOk0rf9lHJt4m7x3BiWJd1Z8ChJAmM0iZj3IEuBPSOolHuu5ul3cOgEHmN5HXmIY6jQigklaidk2EKunIHYw6ACgL6rHRpexKhH1O1hXUQmADMJeRHaAaQJdh5pVGFmBrV3N45LcYWlUE+UycaGjS/D/sBiPLBdm2h4AAAAASUVORK5CYII=" width="15" height="15" alt="Zalo" style="flex:none;border-radius:3px;">0868.91.97.90</div>' +
      '</div>' +
      '</div>' +
      '<div class="hlx-lic-foot">' +
      '<button id="helixfast-license-close-btn" type="button" class="hlx-lic-btn secondary">Đóng</button>' +
      '<button id="helixfast-license-activate-btn" type="button" class="hlx-lic-btn primary">Kích hoạt</button>' +
      '</div>';

    document.body.appendChild(overlay);
    document.body.appendChild(box);

    const copyBtn = box.querySelector('#helixfast-copy-machine-btn');
    copyBtn.addEventListener('click', () => {
      const input = box.querySelector('#helixfast-machine-code-input');
      input.select();
      try {
        navigator.clipboard.writeText(machineCode);
      } catch (err) {
        document.execCommand('copy');
      }
      copyBtn.textContent = 'Đã copy';
      setTimeout(() => (copyBtn.textContent = 'Copy'), 1200);
    });

    const pasteMachineBtn = box.querySelector('#helixfast-paste-machine-btn');
    if (pasteMachineBtn) {
      pasteMachineBtn.addEventListener('click', () => {
        hlxTryPaste(box.querySelector('#helixfast-machine-code-input'), pasteMachineBtn);
      });
    }

    const pasteLicenseBtn = box.querySelector('#helixfast-paste-license-btn');
    pasteLicenseBtn.addEventListener('click', () => {
      hlxTryPaste(box.querySelector('#helixfast-license-input'), pasteLicenseBtn);
    });

    box.querySelector('#helixfast-license-close-btn').addEventListener('click', closeLicenseDialog);

    box.querySelector('#helixfast-license-activate-btn').addEventListener('click', () => {
      const input = box.querySelector('#helixfast-license-input');
      const msgEl = box.querySelector('#helixfast-license-msg');
      const res = hlxActivateLicense(input.value);
      if (res.ok) {
        msgEl.style.color = '#0f9d78';
        msgEl.textContent = '✅ Kích hoạt thành công — hiệu lực đến ' + hlxFormatDate(res.exp) + '.';
        const li = document.getElementById(HELIXFAST_TOGGLE_LI_ID);
        if (li) applyHelixfastToggleVisual(li);
        setTimeout(() => window.location.reload(), 1000);
      } else {
        msgEl.style.color = '#e53935';
        msgEl.textContent = '⛔ ' + res.reason;
      }
    });
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
    // Chỉ bấm đúng công tắc mới hỏi; bấm chỗ khác trên nút Helixfast thì không làm gì
    if (!(e.target && e.target.closest && e.target.closest('.helixfast-switch'))) return;
    hlxConfirmToggle();
  }

  function createHelixfastToggleLi(settingsLi) {
    const li = settingsLi.cloneNode(true);
    li.removeAttribute('id');
    li.id = HELIXFAST_TOGGLE_LI_ID;
    li.classList.remove('open');
    li.style.position = 'relative';

    const link = li.querySelector('a') || li;
    link.removeAttribute('title');
    link.removeAttribute('data-toggle');
    link.innerHTML =
      '<span class="helixfast-logo">🧬</span>' +
      '<span class="helixfast-label">Helixfast v' + HELIXFAST_VERSION + '</span>' +
      '<span class="helixfast-switch"><span class="helixfast-switch-knob"></span></span>';
    link.addEventListener('click', handleHelixfastToggleClick);
    link.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      hlxShowCtxMenu(e.clientX, e.clientY);
    });

    applyHelixfastToggleVisual(li);
    return li;
  }

  function bsdhaClean(t) {
    return String(t == null ? '' : t).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function bsdhaVisible(el) {
    return !!(el && (el.offsetParent !== null || (el.getClientRects && el.getClientRects().length)));
  }

  function bsdhaOwnText(el) {
    let t = '';
    el.childNodes.forEach((n) => { if (n.nodeType === 3) t += n.textContent; });
    return bsdhaClean(t).replace(/:$/, '');
  }

  function bsdhaFindLabels(text, root) {
    const want = text.toLowerCase();
    const out = [];
    (root || document).querySelectorAll('td, label, div, span, b').forEach((el) => {
      if (el.children.length > 3) return;
      if (bsdhaOwnText(el).toLowerCase() === want && bsdhaVisible(el)) out.push(el);
    });
    return out;
  }

  function bsdhaValueOf(el) {
    if (!el) return '';
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return bsdhaClean(el.value);
    const inp = el.querySelector && el.querySelector('input, textarea');
    if (inp) return bsdhaClean(inp.value);
    return bsdhaClean(el.textContent);
  }

  function bsdhaNormDob(raw) {
    const s = bsdhaClean(raw);
    let m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    let y, mo, d;
    if (m) { d = +m[1]; mo = +m[2]; y = +m[3]; }
    else {
      m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (!m) return '';
      y = +m[1]; mo = +m[2]; d = +m[3];
    }
    if (y < 1880 || y > new Date().getFullYear() || mo < 1 || mo > 12 || d < 1 || d > 31) return '';
    return y + '-' + String(mo).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  }

  function bsdhaNormSex(raw) {
    const s = bsdhaClean(raw).toLowerCase();
    if (/^nữ$|^nu$|^female$/.test(s)) return 'Nữ';
    if (/^nam$|^male$/.test(s)) return 'Nam';
    return '';
  }

  function bsdhaFormatDiagnosis(raw) {
    const items = String(raw || '').split('\\').map(bsdhaClean).filter(Boolean);
    const out = [];
    items.forEach((it) => {
      if (/\.\.\.$|…$/.test(it)) return;
      const m = it.match(/^\(([A-Za-z][0-9A-Za-z.]*)\)\s*-?\s*(.+)$/);
      out.push(m ? m[2].trim() + ' (' + m[1].toUpperCase() + ')' : it);
    });
    return out.join('; ');
  }

  function bsdhaReadVital(label, re) {
    const labels = bsdhaFindLabels(label).filter((el) => el.tagName !== 'TH');
    for (let i = 0; i < labels.length; i++) {
      const L = labels[i];
      const cands = [L.nextElementSibling, L.parentElement && L.parentElement.nextElementSibling];
      for (let k = 0; k < cands.length; k++) {
        const m = bsdhaValueOf(cands[k]).replace(',', '.').match(re);
        if (m) return m;
      }
    }
    return null;
  }

  function bsdhaScrapeVitals() {
    const v = {};
    const bp = bsdhaReadVital('Huyết áp', /(\d{2,3})\s*\/\s*(\d{2,3})/);
    if (bp) { v.bpSys = bp[1]; v.bpDia = bp[2]; }
    const pulse = bsdhaReadVital('Mạch', /(\d{2,3})/);
    if (pulse) v.pulse = pulse[1];
    const temp = bsdhaReadVital('Nhiệt độ', /(\d{2}(?:\.\d)?)/);
    if (temp) v.temp = temp[1];
    const resp = bsdhaReadVital('Nhịp thở', /(\d{1,2})/);
    if (resp) v.resp = resp[1];
    const w = bsdhaReadVital('Cân nặng', /(\d{1,3}(?:\.\d{1,2})?)/);
    if (w) v.weight = w[1];
    return v;
  }

  function bsdhaScrapeExamPage() {
    const boxes = Array.from(document.querySelectorAll('[data-bootstro-title="TT bệnh nhân"]'));
    const box = boxes.find(bsdhaVisible);
    if (!box) return null;
    const head = box.querySelector('.width-per60') || box;
    const nameEl = head.cloneNode(true);
    nameEl.querySelectorAll('a, span, i, button, svg').forEach((n) => n.remove());
    const p = { name: bsdhaClean(nameEl.textContent) };

    if (head.querySelector('.fa-female')) p.sex = 'Nữ';
    else if (head.querySelector('.fa-male')) p.sex = 'Nam';
    else {
      const sm = bsdhaClean(head.textContent).match(/(^|\s)(Nam|Nữ)(\s|$)/);
      if (sm) p.sex = sm[2];
    }

    const dm = bsdhaClean(head.textContent).match(/NS:\s*(\d{1,2}\/\d{1,2}\/\d{4})/);
    if (dm) p.dob = bsdhaNormDob(dm[1]);

    const addrL = bsdhaFindLabels('Địa chỉ', box)[0];
    if (addrL) p.address = bsdhaValueOf(addrL.nextElementSibling);

    const histL = bsdhaFindLabels('Bệnh sử', box)[0];
    if (histL && histL.nextElementSibling) {
      const cell = histL.nextElementSibling;
      const sp = cell.querySelector('span[title]');
      p.diagnosis = bsdhaFormatDiagnosis(sp ? sp.getAttribute('title') : cell.textContent);
    }
    return p;
  }

  function bsdhaScrapeEmergencyPage() {
    const nameL = bsdhaFindLabels('Họ tên')[0];
    if (!nameL) return null;
    const get = (label) => {
      const L = bsdhaFindLabels(label)[0];
      return L ? bsdhaValueOf(L.nextElementSibling) : '';
    };
    const p = { name: get('Họ tên') };
    const dob = bsdhaNormDob(get('Ngày sinh'));
    if (dob) p.dob = dob;
    const sex = bsdhaNormSex(get('Giới tính'));
    if (sex) p.sex = sex;
    p.address = get('Xã/Tỉnh') || get('Địa chỉ');
    return p;
  }

  function bsdhaScrapePatient() {
    const p = bsdhaScrapeExamPage() || bsdhaScrapeEmergencyPage();
    if (!p || !p.name) return null;
    Object.assign(p, bsdhaScrapeVitals());
    console.log('[BSDHA-RX] Đã đọc từ HIS:', p);
    return p;
  }

  function bsdhaSendPatientWhenReady(win, patient) {
    const onMsg = (ev) => {
      if (ev.origin !== BSDHA_RX_ORIGIN || ev.source !== win) return;
      if (!ev.data || ev.data.type !== 'bsdha-rx-ready') return;
      try {
        win.postMessage({ type: 'bsdha-rx-patient', v: 1, patient: patient || null }, BSDHA_RX_ORIGIN);
      } catch (err) {
        console.warn('[BSDHA-RX] Không gửi được dữ liệu sang tab kê toa:', err);
      }
    };
    window.addEventListener('message', onMsg);
    setTimeout(() => window.removeEventListener('message', onMsg), 60000);
  }

  function bsdhaToast(msg) {
    const old = document.getElementById('bsdha-rx-toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.id = 'bsdha-rx-toast';
    t.textContent = msg;
    Object.assign(t.style, {
      position: 'fixed', left: '50%', top: '70px', transform: 'translateX(-50%)',
      background: '#c0392b', color: '#fff', padding: '12px 22px', borderRadius: '8px',
      fontSize: '15px', fontWeight: '700', zIndex: 2147483647,
      boxShadow: '0 4px 16px rgba(0,0,0,.35)', pointerEvents: 'none',
    });
    document.body.appendChild(t);
    setTimeout(() => { if (t.parentNode) t.remove(); }, 3500);
  }

  let bsdhaRxHoverBound = false;
  function bsdhaBindRxHoverOnce() {
    if (bsdhaRxHoverBound) return;
    bsdhaRxHoverBound = true;
    const inRx = (e) => e.target && e.target.closest && e.target.closest('#' + BSDHA_RX_LI_ID);
    ['mouseover', 'mouseenter', 'pointerover', 'pointerenter', 'mousemove'].forEach((type) => {
      document.addEventListener(type, (e) => {
        if (inRx(e)) { document.body.classList.add('hlx-rx-hover'); e.stopPropagation(); }
        else document.body.classList.remove('hlx-rx-hover');
      }, true);
    });
  }

  function createBsdhaRxLi(settingsLi) {
    const li = settingsLi.cloneNode(true);
    li.removeAttribute('id');
    li.id = BSDHA_RX_LI_ID;
    li.classList.remove('open');
    li.style.position = 'relative';

    const link = li.querySelector('a') || li;
    link.removeAttribute('data-toggle');
    link.removeAttribute('href');
    link.title = 'Mở tab mới: Kê toa thuốc dịch vụ của BSDHA (chỉ phần kê toa)';
    link.innerHTML =
      '<span class="helixfast-logo">💊</span>' +
      '<span class="helixfast-label">Kê toa DV của BSDHA</span>';
    link.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof link.blur === 'function') link.blur();
      let patient = null;
      try {
        patient = bsdhaScrapePatient();
      } catch (err) {
        console.warn('[BSDHA-RX] Lỗi đọc thông tin bệnh nhân:', err);
      }
      if (!patient) {
        bsdhaToast('Chỉ khả dụng khi đang khám 1 bệnh nhân cụ thể');
        return;
      }

      const w = window.open(BSDHA_RX_URL, '_blank');
      if (!w) return;

      bsdhaSendPatientWhenReady(w, patient);
    });
    bsdhaBindRxHoverOnce();
    return li;
  }

  const EXAM_LABEL_TOAN_THAN = 'Toàn thân';
  const EXAM_LABEL_CAC_BO_PHAN = 'Các bộ phận';
  const EXAM_LABEL_YC_XN = 'Yêu cầu xét nghiệm CLS';
  const EXAM_LABEL_CHI_DINH = 'Chỉ định CLS';
  const EXAM_DEFAULT_BO_PHAN = 'Tim đều\nPhổi không rale\nBụng mềm';
  const EXAM_DEFAULT_CLS = 'Tổng phân tích tế bào máu ngoại vi\nĐHMM tại giường';
  const EXAM_TOAN_THAN_BASE = 'Bệnh tỉnh\nTiếp xúc tốt, niêm hồng, hạch ngoại vi không sờ chạm';
  const EXAM_SYMPTOM_MAX_LEN = 160;

  function examFindDocxTextarea(label) {
    const spans = document.querySelectorAll('docx-label span[title]');
    for (const sp of spans) {
      if ((sp.getAttribute('title') || '').trim() !== label) continue;
      const row = sp.closest('.ui-form-group');
      if (!row || row.offsetParent === null) continue;
      const ta = row.querySelector('docx-control textarea');
      if (ta) return ta;
    }
    return null;
  }

  function examFindSymptomSource() {
    const spans = document.querySelectorAll('docx-label span[title]');
    for (const sp of spans) {
      if ((sp.getAttribute('title') || '').trim() !== EXAM_LABEL_TOAN_THAN) continue;
      const row = sp.closest('.ui-form-group');
      if (!row || row.offsetParent === null) continue;
      let prev = row.previousElementSibling;
      for (let i = 0; i < 3 && prev; i++, prev = prev.previousElementSibling) {
        const ta = prev.querySelector('docx-control textarea');
        if (ta) return ta;
      }
    }
    return null;
  }

  function examExtractSymptoms(raw) {
    let parts = String(raw || '').replace(/\r/g, '').split(/[.;\n]+/).map((x) => x.trim()).filter(Boolean);
    if (!parts.length) return '';
    let t = parts[0];
    if (t.length < 25 && parts[1]) t += ', ' + parts[1].charAt(0).toLowerCase() + parts[1].slice(1);
    t = t
      .replace(/^(bệnh nhân|người bệnh|bn)\s*(vào viện|nhập viện|đến khám|đến)?\s*(vì|do)?\s*(lý do)?\s*[:\-]?\s*/i, '')
      .replace(/^(diễn tiến|diễn biến|triệu chứng|bệnh sử|lý do vào viện)\s*[:\-]?\s*/i, '')
      .replace(/[\s,.;:]+$/, '')
      .trim();
    if (!t) return '';
    if (t.length > EXAM_SYMPTOM_MAX_LEN) {
      const cut = t.slice(0, EXAM_SYMPTOM_MAX_LEN);
      const k = Math.max(cut.lastIndexOf(','), cut.lastIndexOf(' '));
      t = (k > 40 ? cut.slice(0, k) : cut).replace(/[\s,.;:]+$/, '');
    }
    return t.charAt(0).toLowerCase() + t.slice(1);
  }

  function examFillIfEmpty(el, value) {
    if (!el || !value || el.disabled || el.readOnly) return;
    if (el.value.trim() !== '') return;
    setNativeValue(el, value);
  }

  function examApplyOnEnter(progEl) {
    const text = (progEl.value || '').trim();
    if (!text) return;
    examFillIfEmpty(examFindSymptomSource(), text);
    const xyz = examExtractSymptoms(text);
    examFillIfEmpty(
      examFindDocxTextarea(EXAM_LABEL_TOAN_THAN),
      EXAM_TOAN_THAN_BASE + (xyz ? ', ' + xyz : '')
    );
    examFillIfEmpty(examFindDocxTextarea(EXAM_LABEL_CAC_BO_PHAN), EXAM_DEFAULT_BO_PHAN);
    const yc = examFindDocxTextarea(EXAM_LABEL_YC_XN);
    const cd = examFindDocxTextarea(EXAM_LABEL_CHI_DINH);

    if (yc && cd && yc.value.trim() === '' && cd.value.trim() === '') {
      examFillIfEmpty(yc, EXAM_DEFAULT_CLS);
      examFillIfEmpty(cd, EXAM_DEFAULT_CLS);
    }
  }

  hlxDocListen(
    'keydown',
    (e) => {
      if (e.key !== 'Enter' || e.isComposing || e.ctrlKey || e.altKey || e.metaKey) return;
      if (!isHelixfastEnabled()) return;
      const t = e.target;
      if (!t || t.tagName !== 'TEXTAREA' || !t.matches(PROGRESSION_SELECTOR)) return;

      setTimeout(() => examApplyOnEnter(t), 0);
    },
    true
  );

  const IPD_LABEL_DIEN_BIEN_VV = 'Diễn biến vào viện';
  const IPD_LABEL_CD_XAC_DINH = 'Chẩn đoán xác định';
  const IPD_LABEL_HUONG_DIEU_TRI = 'Hướng điều trị';
  const ICD_FREE_TEXT_SELECTOR = 'input[formcontrolname="icd_free_text"]';
  const IPD_HUONG_DIEU_TRI_OPTIONS = [
    'Điều trị nội khoa',
    'Điều trị bảo tồn',
    'Điều trị triệu chứng',
    'Điều trị theo phác đồ',
    'Kiểm soát huyết áp',
    'Kiểm soát đường huyết',
    'Kiểm soát nhiễm trùng',
    'Kiểm soát triệu chứng hô hấp',
    'Giảm đau',
    'Cải thiện chức năng vận động',
    'Bù nước và điện giải',
    'Phòng ngừa biến chứng',
    'Theo dõi diễn tiến',
  ];
  const ipdFilledKeys = new Set();

  function ipdIsPage() {
    return location.pathname.indexOf('/his/ipd') !== -1 || emergIsPage();
  }
  function emergIsPage() {
    return location.pathname.indexOf('/his/emergency') !== -1;
  }

  function ipdFindDocxField(label) {
    const spans = document.querySelectorAll('docx-label span[title]');
    for (const sp of spans) {
      if ((sp.getAttribute('title') || '').trim() !== label) continue;
      const row = sp.closest('.ui-form-group');
      if (!row || row.offsetParent === null) continue;
      const el = row.querySelector('docx-control textarea') || row.querySelector('docx-control input[type="text"]');
      if (el) return el;
    }
    return null;
  }

  function ipdVisitKey() {
    if (emergIsPage()) {
      // Trang Cấp cứu: ưu tiên ô "Mã tiếp nhận" (cùng cấu trúc với nội trú), dự phòng họ tên + ngày sinh + ngày vào viện
      const maL = bsdhaFindLabels('Mã tiếp nhận')[0];
      const maBox = maL && maL.nextElementSibling;
      const maInp = maBox && maBox.querySelector('input');
      const ma = maInp ? (maInp.value || '').trim() : '';
      if (ma) return ma;
      const nameL = bsdhaFindLabels('Họ tên')[0];
      const nm = nameL ? bsdhaValueOf(nameL.nextElementSibling) : '';
      const dobL = bsdhaFindLabels('Ngày sinh')[0];
      const dob = dobL ? bsdhaValueOf(dobL.nextElementSibling) : '';
      const rc = document.querySelector('p-calendar[formcontrolname="receive_date_time"] input');
      return [nm, dob, rc ? rc.value : ''].join('|');
    }
    const root = document.getElementById('ipd_detail');
    if (!root) return '';
    const lbl = findExactTextElement(root, 'Mã tiếp nhận');
    const box = lbl && lbl.nextElementSibling;
    const inp = box && box.querySelector('input');
    return inp ? (inp.value || '').trim() : '';
  }

  function ipdApplyOnSymptom() {
    const toanThan = ipdFindDocxField(EXAM_LABEL_TOAN_THAN);
    if (!toanThan) return;
    const key = ipdVisitKey();
    if (key) {
      if (ipdFilledKeys.has(key)) return;
      ipdFilledKeys.add(key);
    }
    examFillIfEmpty(toanThan, EXAM_TOAN_THAN_BASE);
    examFillIfEmpty(ipdFindDocxField(EXAM_LABEL_CAC_BO_PHAN), EXAM_DEFAULT_BO_PHAN);
    const yc = ipdFindDocxField(EXAM_LABEL_YC_XN);
    const cd = ipdFindDocxField(EXAM_LABEL_CHI_DINH);
    if (yc && cd && yc.value.trim() === '' && cd.value.trim() === '') {
      examFillIfEmpty(yc, EXAM_DEFAULT_CLS);
      examFillIfEmpty(cd, EXAM_DEFAULT_CLS);
    }
  }

  function ipdVisible(selector) {
    return Array.from(document.querySelectorAll(selector)).find((el) => el.offsetParent !== null) || null;
  }

  const ipdSync = { key: null, settle: 0, pv: { a: null, b: null }, cls: { a: null, b: null }, icd: null };

  function ipdSyncPair(st, a, b) {
    const x = a.value || '';
    const y = b.value || '';
    if (st.a === null) {
      if (x.trim() && !y.trim()) setNativeValue(b, x);
      else if (!x.trim() && y.trim()) setNativeValue(a, y);
    } else if (x !== st.a) {
      if (y !== x) setNativeValue(b, x);
    } else if (y !== st.b) {
      if (x !== y) setNativeValue(a, y);
    }
    st.a = a.value || '';
    st.b = b.value || '';
  }

  function ipdSyncTick() {
    const key = ipdVisitKey();
    if (key !== ipdSync.key) {
      ipdSync.key = key;
      ipdSync.pv.a = null;
      ipdSync.cls.a = null;
      ipdSync.icd = null;
      ipdSync.settle = Date.now() + 600;
    }
    if (Date.now() < ipdSync.settle) return;

    const prog = ipdVisible(PROGRESSION_SELECTOR);
    const vv = ipdFindDocxField(IPD_LABEL_DIEN_BIEN_VV);
    if (prog && vv) ipdSyncPair(ipdSync.pv, prog, vv);

    const yc = ipdFindDocxField(EXAM_LABEL_YC_XN);
    const cd = ipdFindDocxField(EXAM_LABEL_CHI_DINH);
    if (yc && cd) ipdSyncPair(ipdSync.cls, yc, cd);

    const icd = ipdVisible(ICD_FREE_TEXT_SELECTOR);
    const cx = ipdFindDocxField(IPD_LABEL_CD_XAC_DINH);
    if (icd && cx) {
      const i = icd.value || '';
      const c = cx.value || '';
      if (ipdSync.icd === null) {
        if (i.trim() && !c.trim()) setNativeValue(cx, i);
      } else if (i !== ipdSync.icd && (c === '' || c === ipdSync.icd)) {
        setNativeValue(cx, i);
      }
      ipdSync.icd = i;
    }
  }

  const IPD_CLS_OPTIONS = [
    'Tổng phân tích tế bào máu ngoại vi',
    'NS1Ag Test nhanh',
    'ĐHMM tại giường',
    'Điện giải đồ',
    'Siêu âm ổ bụng',
    'Điện tim cấp cứu tại giường',
  ];

  function ipdNormPart(x) {
    return String(x || '').trim().replace(/[.\s]+$/, '').toLowerCase();
  }

  function ipdParseParts(v) {
    return String(v || '')
      .split(/\s*,\s*/)
      .map((x) => x.trim().replace(/\.+$/, '').trim())
      .filter(Boolean);
  }

  function ipdParseLines(v) {
    return String(v || '')
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean);
  }

  function ipdBuildParts(parts) {
    const opt = new Map(IPD_HUONG_DIEU_TRI_OPTIONS.map((o) => [ipdNormPart(o), o]));
    const out = parts.map((p, i) => {
      const o = opt.get(ipdNormPart(p));
      if (!o) return p;
      return (i === 0 ? o.charAt(0).toUpperCase() : o.charAt(0).toLowerCase()) + o.slice(1);
    });
    return out.length ? out.join(', ') + '.' : '';
  }

  function ipdEnsureOptCss() {
    if (document.getElementById('hlx-opt-css')) return;
    const st = document.createElement('style');
    st.id = 'hlx-opt-css';
    st.textContent =
      '.hlx-opt-box{display:flex !important;flex-wrap:wrap !important;gap:4px 14px;float:none !important;clear:both !important;width:100% !important;box-sizing:border-box !important;margin:5px 0 0 0;font-size:12px;}' +
      '.hlx-opt-box,.hlx-opt-box *{cursor:pointer !important;-webkit-user-select:none;user-select:none;}' +
      '.hlx-opt-box label{display:inline-flex !important;align-items:center;gap:4px;margin:0 !important;padding:0 !important;font-weight:normal !important;white-space:nowrap;width:auto !important;float:none !important;}' +
      '.hlx-opt-box input[type=\"checkbox\"]{display:inline-block !important;position:static !important;opacity:1 !important;visibility:visible !important;-webkit-appearance:checkbox !important;appearance:auto !important;width:14px !important;height:14px !important;margin:0 !important;flex:none;}';
    (document.head || document.documentElement).appendChild(st);
  }

  function ipdBuildOptionBox(extraClass, options, onToggle) {
    ipdEnsureOptCss();
    const box = document.createElement('div');
    box.className = 'hlx-opt-box ' + extraClass;
    options.forEach((o) => {
      const lb = document.createElement('label');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = o;
      cb.addEventListener('change', () => onToggle(o, cb.checked));
      lb.appendChild(cb);
      lb.appendChild(document.createTextNode(o));
      box.appendChild(lb);
    });
    return box;
  }

  function ipdRefreshBox(box, haveNorm) {
    box.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      const want = haveNorm.indexOf(ipdNormPart(cb.value)) !== -1;
      if (cb.checked !== want) cb.checked = want;
    });
  }

  function ipdEnsureHuongBox() {
    const inp = ipdFindDocxField(IPD_LABEL_HUONG_DIEU_TRI);
    if (!inp || inp.tagName !== 'INPUT') return;
    let box = inp.parentElement.querySelector('.hlx-ht-box');
    if (!box) {
      box = ipdBuildOptionBox('hlx-ht-box', IPD_HUONG_DIEU_TRI_OPTIONS, (o, checked) => {
        const field = ipdFindDocxField(IPD_LABEL_HUONG_DIEU_TRI);
        if (!field) return;
        const norm = ipdNormPart(o);
        const parts = ipdParseParts(field.value).filter((p) => ipdNormPart(p) !== norm);
        if (checked) parts.push(o);
        setNativeValue(field, ipdBuildParts(parts));
      });
      inp.insertAdjacentElement('afterend', box);
    }
    ipdRefreshBox(box, ipdParseParts(inp.value).map(ipdNormPart));
  }

  function ipdEnsureClsBox() {
    const cd = ipdFindDocxField(EXAM_LABEL_CHI_DINH);
    if (!cd || cd.tagName !== 'TEXTAREA') return;
    const wrap = cd.parentElement;
    let box = wrap.querySelector('.hlx-cls-box');
    if (!box) {
      // dọn hộp cũ (bản trước chèn lệch sang bên cạnh)
      document.querySelectorAll('.hlx-cls-box').forEach((b) => { if (b.parentElement !== wrap) b.remove(); });
    }
    if (!box) {
      box = ipdBuildOptionBox('hlx-cls-box', IPD_CLS_OPTIONS, (o, checked) => {
        const c = ipdFindDocxField(EXAM_LABEL_CHI_DINH);
        const y = ipdFindDocxField(EXAM_LABEL_YC_XN);
        if (!c) return;
        const norm = ipdNormPart(o);
        const lines = ipdParseLines(c.value).filter((l) => ipdNormPart(l) !== norm);
        if (checked) lines.push(o);
        const text = lines.join('\n');
        setNativeValue(c, text);
        if (y) setNativeValue(y, text);
      });
      cd.insertAdjacentElement('afterend', box);
    }
    ipdRefreshBox(box, ipdParseLines(cd.value).map(ipdNormPart));
  }

  // ===== IPD: Chọn nhanh "Toàn thân" + "Các bộ phận" =====
  const IPD_EX_PREF_KEY = 'hlx_ipd_ex_v1';
  const EX_CHILD_ONLY_YT = ['tỉnh, linh hoạt', 'quấy khóc', 'lừ đừ'];

  const EX_TT_CORE = [
    { k: 'yt', label: 'Ý thức', def: 'tỉnh', opts: ['tỉnh', 'tỉnh, linh hoạt', 'quấy khóc', 'lơ mơ', 'ngủ gà', 'lừ đừ', 'li bì', 'kích thích, vật vã', 'hôn mê'] },
    { k: 'gcs', label: 'GCS (điểm)', opts: ['15', '14', '13', '12', '11', '10', '9', '8', '7', '6', '5', '4', '3'] },
    { k: 'tx', label: 'Tiếp xúc', def: 'tốt', opts: ['tốt', 'được', 'kém', 'khó', 'không tiếp xúc'] },
    { k: 'dn', label: 'Da, niêm', def: 'hồng', opts: ['hồng', 'hồng nhạt', 'nhạt', 'tái', 'vàng'] },
    { k: 'tt', label: 'Thể trạng', opts: ['trung bình', 'tốt', 'gầy', 'suy kiệt', 'thừa cân', 'béo phì'] },
    { k: 'pxas', label: 'PXAS', opts: ['(+)', '(-)', 'chậm'] },
    { k: 'dtSide', label: 'Đồng tử: bên', opts: ['2 bên', 'mắt phải', 'mắt trái'] },
    { k: 'dtSize', label: 'Đồng tử: kích thước', opts: ['2mm', '2,5mm', '3mm', '4mm', '5mm', 'co nhỏ (<2mm)', 'giãn (>5mm)'] },
    { k: 'hach', label: 'Hạch ngoại vi', def: 'không sờ chạm', opts: ['không sờ chạm', 'sờ chạm vùng cổ', 'sờ chạm vùng nách', 'sờ chạm vùng bẹn', 'sờ chạm nhiều vùng'] },
    { k: 'mq', label: 'Mạch quay', opts: ['rõ', 'yếu', 'khó bắt', 'không bắt được'] },
    { k: 'chi', label: 'Chi', opts: ['ấm', 'mát', 'lạnh', 'lạnh ẩm'] },
    { k: 'mn', label: 'Dấu mất nước', opts: ['không dấu mất nước', 'mất nước nhẹ', 'mất nước vừa', 'mất nước nặng'] },
  ];

  const exJ = (a) => a.filter((x) => x && String(x).trim()).join(', ');
  const exKem = (arr) => (arr && arr.length ? 'kèm ' + hsJoinList(arr) : '');

  const EX_SYM = [
    { k: 'met', label: 'Than mệt', fields: [
      { k: 'muc', label: 'Mức độ', opts: ['nhẹ', 'vừa', 'nhiều'] },
      { k: 'kem', label: 'Kèm theo', multi: true, opts: ['chán ăn', 'ăn uống kém', 'sụt cân', 'mất ngủ', 'vã mồ hôi'] },
    ], build: (v) => exJ(['than mệt' + (v.muc ? ' ' + v.muc : ''), exKem(v.kem)]) },

    { k: 'dauco', label: 'Đau mỏi cơ', fields: [
      { k: 'vung', label: 'Vùng', multi: true, opts: ['toàn thân', 'vai gáy', 'hai tay', 'hai chân', 'đùi', 'bắp chân', 'thắt lưng', 'ngực', 'bụng'] },
      { k: 'tc', label: 'Tính chất', opts: ['âm ỉ', 'nhức mỏi', 'đau nhói', 'kèm chuột rút'] },
    ], build: (v) => exJ([
      'đau mỏi cơ' + (v.vung && v.vung.length ? (v.vung.indexOf('toàn thân') !== -1 ? ' toàn thân' : ' vùng ' + hsJoinList(v.vung)) : ''),
      v.tc,
    ]) },

    { k: 'sot', label: 'Sốt', fields: [
      { k: 'muc', label: 'Mức sốt', opts: ['37,5-38°C', '38-39°C', 'trên 39°C'] },
      { k: 'kieu', label: 'Kiểu sốt', opts: ['liên tục', 'từng cơn', 'về chiều'] },
      { k: 'kem', label: 'Kèm theo', multi: true, opts: ['ớn lạnh', 'rét run', 'vã mồ hôi', 'đau đầu', 'đau cơ', 'phát ban'] },
    ], build: (v) => exJ(['sốt' + (v.muc ? ' ' + v.muc : ''), v.kieu, exKem(v.kem)]) },

    { k: 'daudau', label: 'Đau đầu', fields: [
      { k: 'vt', label: 'Vị trí', opts: ['hai bên', 'nửa đầu phải', 'nửa đầu trái', 'vùng trán', 'vùng chẩm', 'vùng thái dương', 'toàn bộ đầu'] },
      { k: 'tc', label: 'Tính chất', opts: ['âm ỉ', 'giật theo nhịp mạch', 'căng tức', 'dữ dội'] },
      { k: 'kem', label: 'Kèm theo', multi: true, opts: ['chóng mặt', 'buồn nôn', 'nôn', 'sợ ánh sáng', 'sợ tiếng động', 'nhìn mờ', 'cứng gáy', 'sốt'] },
    ], build: (v) => exJ(['đau đầu' + (v.vt ? ' ' + v.vt : ''), v.tc, exKem(v.kem)]) },

    { k: 'chongmat', label: 'Chóng mặt', fields: [
      { k: 'kieu', label: 'Kiểu', opts: ['xoay tròn', 'choáng váng', 'mất thăng bằng', 'cảm giác sắp ngất'] },
      { k: 'yt', label: 'Hoàn cảnh', opts: ['khi thay đổi tư thế', 'liên tục', 'khi gắng sức', 'khi đứng dậy'] },
      { k: 'kem', label: 'Kèm theo', multi: true, opts: ['ù tai', 'buồn nôn', 'nôn', 'nhìn mờ', 'đau đầu', 'yếu tay chân', 'vã mồ hôi'] },
    ], build: (v) => exJ(['chóng mặt' + (v.kieu ? ' ' + v.kieu : ''), v.yt, exKem(v.kem)]) },

    { k: 'non', label: 'Buồn nôn / Nôn', fields: [
      { k: 'loai', label: 'Loại', opts: ['buồn nôn', 'nôn', 'buồn nôn và nôn'] },
      { k: 'lan', label: 'Số lần', opts: ['1-2 lần', '3-5 lần', 'trên 5 lần'] },
      { k: 'dich', label: 'Chất nôn', opts: ['thức ăn', 'dịch trong', 'dịch mật', 'dịch vị', 'lẫn máu'] },
      { k: 'kieu', label: 'Đặc điểm', opts: ['nôn vọt', 'sau ăn', 'không liên quan bữa ăn'] },
      { k: 'kem', label: 'Kèm theo', multi: true, opts: ['đau bụng', 'tiêu chảy', 'sốt', 'đau đầu', 'chóng mặt', 'chướng bụng'] },
    ], build: (v) => exJ([
      (v.loai || 'nôn') + (v.lan ? ' ' + v.lan : ''),
      v.dich ? 'chất nôn ' + v.dich : '',
      v.kieu,
      exKem(v.kem),
    ]) },

    { k: 'tieuchay', label: 'Tiêu chảy', fields: [
      { k: 'lan', label: 'Số lần', opts: ['2-3 lần', '4-6 lần', 'trên 6 lần'] },
      { k: 'phan', label: 'Tính chất phân', opts: ['phân lỏng sệt', 'phân lỏng toàn nước', 'phân nhầy', 'phân nhầy máu', 'phân đen', 'phân vàng nhạt'] },
      { k: 'kem', label: 'Kèm theo', multi: true, opts: ['đau bụng quặn', 'mót rặn', 'sốt', 'nôn', 'mất nước'] },
    ], build: (v) => exJ(['tiêu chảy' + (v.lan ? ' ' + v.lan : ''), v.phan, exKem(v.kem)]) },

    { k: 'daubung', label: 'Đau bụng', fields: [
      { k: 'vt', label: 'Vị trí', opts: ['thượng vị', 'quanh rốn', 'hạ vị', 'hố chậu phải', 'hố chậu trái', 'hạ sườn phải', 'hạ sườn trái', 'khắp bụng'] },
      { k: 'tc', label: 'Tính chất', opts: ['âm ỉ', 'quặn từng cơn', 'dữ dội', 'bỏng rát'] },
      { k: 'lan', label: 'Lan', opts: ['không lan', 'lan ra sau lưng', 'lan xuống hạ vị', 'lan lên vai phải', 'lan xuống bẹn'] },
      { k: 'kem', label: 'Kèm theo', multi: true, opts: ['buồn nôn', 'nôn', 'tiêu chảy', 'táo bón', 'chướng bụng', 'sốt', 'chán ăn'] },
    ], build: (v) => exJ(['đau bụng' + (v.vt ? ' vùng ' + v.vt : ''), v.tc, v.lan, exKem(v.kem)]) },

    { k: 'daunguc', label: 'Đau ngực', fields: [
      { k: 'vt', label: 'Vị trí', opts: ['sau xương ức', 'ngực trái', 'ngực phải', 'vùng trước tim', 'toàn ngực'] },
      { k: 'tc', label: 'Tính chất', opts: ['đè nặng', 'thắt nghẹt', 'nhói', 'bỏng rát', 'âm ỉ'] },
      { k: 'lan', label: 'Lan', opts: ['không lan', 'lan lên vai trái', 'lan ra tay trái', 'lan lên hàm', 'lan ra sau lưng', 'lan xuống thượng vị'] },
      { k: 'yt', label: 'Yếu tố liên quan', opts: ['liên quan gắng sức', 'không liên quan gắng sức', 'đau tăng khi hít sâu', 'đau tăng khi ho', 'giảm khi nghỉ'] },
      { k: 'kem', label: 'Kèm theo', multi: true, opts: ['khó thở', 'vã mồ hôi', 'hồi hộp đánh trống ngực', 'buồn nôn', 'choáng'] },
    ], build: (v) => exJ(['đau ngực' + (v.vt ? ' ' + v.vt : ''), v.tc, v.lan, v.yt, exKem(v.kem)]) },

    { k: 'khotho', label: 'Khó thở', fields: [
      { k: 'kieu', label: 'Hoàn cảnh', opts: ['khi gắng sức', 'cả khi nghỉ', 'khi nằm phải kê cao gối', 'từng cơn về đêm', 'thở rít'] },
      { k: 'muc', label: 'Mức độ', opts: ['nhẹ', 'vừa', 'nặng'] },
      { k: 'kem', label: 'Kèm theo', multi: true, opts: ['ho', 'đau ngực', 'phù chân', 'tím môi', 'khò khè', 'sốt'] },
    ], build: (v) => exJ(['khó thở' + (v.kieu ? ' ' + v.kieu : ''), v.muc ? 'mức độ ' + v.muc : '', exKem(v.kem)]) },

    { k: 'ho', label: 'Ho', fields: [
      { k: 'loai', label: 'Loại', opts: ['khan', 'có đờm trắng', 'có đờm vàng/xanh', 'ra máu', 'từng cơn'] },
      { k: 'kem', label: 'Kèm theo', multi: true, opts: ['sốt', 'đau họng', 'khó thở', 'đau ngực khi ho', 'khò khè', 'chảy mũi'] },
    ], build: (v) => exJ(['ho' + (v.loai ? ' ' + v.loai : ''), exKem(v.kem)]) },

    { k: 'phu', label: 'Phù', fields: [
      { k: 'vt', label: 'Vị trí', opts: ['hai chân', 'mặt', 'toàn thân', 'quanh mắt cá'] },
      { k: 'tc', label: 'Tính chất', opts: ['phù mềm ấn lõm', 'phù cứng', 'phù trắng mềm'] },
      { k: 'kem', label: 'Kèm theo', multi: true, opts: ['tiểu ít', 'khó thở', 'tăng cân nhanh'] },
    ], build: (v) => exJ(['phù' + (v.vt ? ' ' + v.vt : ''), v.tc, exKem(v.kem)]) },
  ];

  const EX_BP = [
    { k: 'tim', label: 'Tim', fields: [
      { k: 'nhip', label: 'Nhịp tim', def: 'đều', opts: ['đều', 'không đều', 'nhanh', 'chậm', 'nhanh, không đều', 'loạn nhịp hoàn toàn'] },
      { k: 't12', label: 'T1, T2', opts: ['T1 T2 rõ', 'T1 T2 mờ', 'T1 mờ', 'T2 mạnh', 'T2 tách đôi'] },
      { k: 'tho', label: 'Âm thổi', opts: ['không âm thổi', 'âm thổi tâm thu', 'âm thổi tâm trương', 'âm thổi tâm thu và tâm trương'] },
      { k: 'vt', label: 'Vị trí âm thổi', opts: ['mỏm tim', 'ổ van động mạch chủ', 'ổ van động mạch phổi', 'ổ van 2 lá', 'ổ van 3 lá'] },
    ], build: (v) => {
      const p = [];
      if (v.nhip) p.push(v.nhip);
      if (v.t12) p.push(v.t12);
      if (v.tho) p.push(v.tho + (v.vt && v.tho !== 'không âm thổi' ? ' ' + v.vt : ''));
      return p.length ? 'tim ' + p.join(', ') : '';
    } },

    { k: 'phoi', label: 'Phổi', fields: [
      { k: 'am', label: 'Âm phế bào', opts: ['êm', 'thô', 'giảm rì rào phế nang', 'mất rì rào phế nang'] },
      { k: 'rale', label: 'Rale', def: 'không rale', opts: ['không rale', 'rale ẩm', 'rale nổ', 'rale ngáy', 'rale rít', 'rale ẩm, rale nổ', 'rale rít, rale ngáy'] },
      { k: 'vt', label: 'Vị trí rale', opts: ['2 bên phế trường', 'phế trường phải', 'phế trường trái', '2 đáy phổi', 'đáy phổi phải', 'đáy phổi trái'] },
      { k: 'ln', label: 'Lồng ngực / co kéo', opts: ['không co kéo cơ hô hấp phụ', 'co kéo cơ hô hấp phụ', 'rút lõm ngực', 'lồng ngực di động kém'] },
    ], build: (v) => {
      const p = [];
      if (v.am) p.push(v.am);
      if (v.rale) p.push(v.rale + (v.rale !== 'không rale' && v.vt ? ' ' + v.vt : ''));
      if (v.ln) p.push(v.ln);
      return p.length ? 'phổi ' + p.join(', ') : '';
    } },

    { k: 'bung', label: 'Bụng', fields: [
      { k: 'tt', label: 'Tình trạng bụng', def: 'mềm', opts: ['mềm', 'chướng hơi', 'chướng căng', 'co cứng', 'gồng cứng'] },
      { k: 'go', label: 'Gõ', opts: ['gõ vang', 'gõ đục', 'gõ đục vùng thấp', 'gõ trống'] },
      { k: 'dau', label: 'Ấn bụng', opts: ['ấn không đau', 'ấn đau'] },
      { k: 'pu', label: 'Phản ứng thành bụng', opts: ['không phản ứng thành bụng', 'phản ứng thành bụng (+)', 'phản ứng dội (+)'] },
      { k: 'dh', label: 'Dấu hiệu', opts: ['Murphy (-)', 'Murphy (+)', 'McBurney (-)', 'McBurney (+)'] },
      { k: 'gl', label: 'Gan, lách', opts: ['gan lách không sờ chạm', 'gan sờ chạm', 'lách sờ chạm', 'gan lách to'] },
      { k: 'nd', label: 'Nhu động ruột', opts: ['nhu động ruột bình thường', 'nhu động ruột tăng', 'nhu động ruột giảm', 'nhu động ruột mất'] },
      { k: 'vt', label: 'Vị trí ấn đau (khi chọn "ấn đau")', multi: true, opts: ['thượng vị', 'quanh rốn', 'hạ vị', 'hố chậu phải', 'hố chậu trái', 'hạ sườn phải', 'hạ sườn trái', 'khắp bụng'] },
    ], build: (v) => {
      const p = [];
      if (v.tt) p.push(v.tt);
      if (v.go) p.push(v.go);
      if (v.dau === 'ấn đau') p.push('ấn đau' + (v.vt && v.vt.length ? ' ' + hsJoinList(v.vt) : ''));
      else if (v.dau) p.push(v.dau);
      if (v.pu) p.push(v.pu);
      if (v.dh) p.push(v.dh);
      if (v.gl) p.push(v.gl);
      if (v.nd) p.push(v.nd);
      return p.length ? 'bụng ' + p.join(', ') : '';
    } },

    { k: 'hong', label: 'Họng', fields: [
      { k: 'x', label: 'Họng', opts: ['họng sạch', 'họng đỏ', 'amidan sưng to', 'amidan sưng to có mủ'] },
    ], build: (v) => v.x || '' },

    { k: 'tk', label: 'Thần kinh', fields: [
      { k: 'x', label: 'Thần kinh', opts: ['cổ mềm, không dấu thần kinh khu trú', 'cổ cứng', 'dấu thần kinh khu trú (+)', 'liệt nửa người phải', 'liệt nửa người trái'] },
    ], build: (v) => v.x || '' },

    { k: 'tn', label: 'Thận, tiết niệu', fields: [
      { k: 'x', label: 'Thận, tiết niệu', opts: ['chạm thận (-), rung thận (-)', 'rung thận (+) bên phải', 'rung thận (+) bên trái', 'cầu bàng quang (+)', 'ấn đau điểm niệu quản'] },
    ], build: (v) => v.x || '' },

    { k: 'cxk', label: 'Cơ xương khớp', fields: [
      { k: 'x', label: 'Cơ xương khớp', opts: ['cột sống không biến dạng, không điểm đau', 'ấn đau cột sống thắt lưng', 'ấn đau cơ cạnh sống thắt lưng', 'hạn chế vận động khớp', 'sưng nóng đỏ đau khớp'] },
    ], build: (v) => v.x || '' },
  ];

  function exPrefs() {
    try { return JSON.parse(localStorage.getItem(IPD_EX_PREF_KEY) || '{}') || {}; } catch (err) { return {}; }
  }
  function exPrefSet(k, v) {
    const p = exPrefs();
    p[k] = v;
    try { localStorage.setItem(IPD_EX_PREF_KEY, JSON.stringify(p)); } catch (err) {}
  }

  function exNewState() {
    const tt = {};
    EX_TT_CORE.forEach((f) => { tt[f.k] = f.def || ''; });
    const bp = {};
    EX_BP.forEach((sys) => sys.fields.forEach((f) => { bp[sys.k + '.' + f.k] = f.multi ? [] : (f.def || ''); }));
    return { tt, ttSym: {}, ttFree: '', bp, bpFree: '', touched: { tt: false, bp: false }, last: { tt: null, bp: null }, pre: null };
  }
  const ipdExStore = {};
  function exState() {
    const key = ipdVisitKey() || '_';
    if (!ipdExStore[key]) ipdExStore[key] = exNewState();
    return ipdExStore[key];
  }

  function exParseAge(raw) {
    const s = bsdhaClean(raw).toLowerCase();
    if (!s) return null;
    let m = s.match(/(\d{1,3})\s*(tuổi|tuoi|năm|nam|t)\b/);
    if (m) return parseInt(m[1], 10);
    if (/tháng|thang|ngày|ngay|tuần|tuan|month|day/.test(s)) return 0;
    m = s.match(/(\d{1,3})/);
    return m ? parseInt(m[1], 10) : null;
  }
  function exAgeFromIso(iso) {
    const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const now = new Date();
    let a = now.getFullYear() - parseInt(m[1], 10);
    const md = now.getMonth() + 1 - parseInt(m[2], 10);
    if (md < 0 || (md === 0 && now.getDate() < parseInt(m[3], 10))) a--;
    return a < 0 ? null : a;
  }
  function exGetAge() {
    const root = document.getElementById('ipd_detail') || document;
    const labelsAge = ['Tuổi', 'Tuổi (năm)', 'Tuổi/tháng'];
    for (const lbText of labelsAge) {
      for (const lab of bsdhaFindLabels(lbText, root)) {
        const cands = [lab.nextElementSibling, lab.parentElement && lab.parentElement.nextElementSibling];
        for (const c of cands) {
          const a = exParseAge(bsdhaValueOf(c));
          if (a !== null) return a;
        }
      }
    }
    for (const lbText of ['Ngày sinh', 'Năm sinh']) {
      for (const lab of bsdhaFindLabels(lbText, root)) {
        const cands = [lab.nextElementSibling, lab.parentElement && lab.parentElement.nextElementSibling];
        for (const c of cands) {
          const raw = bsdhaValueOf(c);
          const a = /^\d{4}$/.test(bsdhaClean(raw)) ? new Date().getFullYear() - parseInt(raw, 10) : exAgeFromIso(bsdhaNormDob(raw));
          if (a !== null && a >= 0) return a;
        }
      }
    }
    return null;
  }
  function exPrefix(st) {
    if (st.pre) return st.pre;
    const a = exGetAge();
    return a !== null && a < 16 ? 'Bé' : 'Bệnh';
  }

  function exCap(s) {
    s = String(s || '').trim();
    return s ? s.charAt(0).toLocaleUpperCase('vi-VN') + s.slice(1) : '';
  }
  function exFinish(lines) {
    const ls = lines.map(exCap).filter(Boolean);
    if (exPrefs().perLine !== false) return ls.join('\n');
    return ls.map((l) => l.replace(/[.\s]+$/, '') + '.').join(' ');
  }

  function exBuildToanThan(st, pre) {
    const c = st.tt;
    const lines = [];
    lines.push(exJ([c.yt ? pre + ' ' + c.yt : '', c.gcs ? 'GCS ' + c.gcs + ' điểm' : '']));
    lines.push(exJ([
      c.tx ? (c.tx === 'không tiếp xúc' ? 'không tiếp xúc được' : 'tiếp xúc ' + c.tx) : '',
      c.dn ? 'da niêm ' + c.dn : '',
      c.tt ? 'thể trạng ' + c.tt : '',
    ]));
    lines.push(exJ([
      c.pxas ? 'PXAS ' + c.pxas : '',
      c.dtSize ? 'đồng tử ' + (c.dtSide || '2 bên') + ' ' + c.dtSize : '',
    ]));
    lines.push(exJ([
      c.hach ? 'hạch ngoại vi ' + c.hach : '',
      c.mq ? 'mạch quay ' + c.mq : '',
      c.chi ? 'chi ' + c.chi : '',
      c.mn || '',
    ]));
    EX_SYM.forEach((g) => {
      const s = st.ttSym[g.k];
      if (s && s.on) lines.push(g.build(s.v || {}));
    });
    if (st.ttFree && st.ttFree.trim()) lines.push(st.ttFree.trim());
    return exFinish(lines);
  }
  function exBuildBoPhan(st) {
    const lines = [];
    EX_BP.forEach((sys) => {
      const v = {};
      sys.fields.forEach((f) => { v[f.k] = st.bp[sys.k + '.' + f.k]; });
      lines.push(sys.build(v));
    });
    if (st.bpFree && st.bpFree.trim()) lines.push(st.bpFree.trim());
    return exFinish(lines);
  }

  function exWrite(field, text, st, kind, baseText) {
    const cur = (field.value || '').trim();
    const known = [st.last[kind], baseText]
      .filter((x) => x !== null && x !== undefined)
      .map((x) => String(x).trim());
    if (cur && known.indexOf(cur) === -1) {
      if (!window.confirm('Ô này đang có nội dung bạn tự nhập/sửa.\nGhi đè bằng nội dung chọn nhanh?')) return false;
    }
    setNativeValue(field, text);
    st.last[kind] = text;
    return true;
  }
  function exApply(kind) {
    const st = exState();
    const field = ipdFindDocxField(kind === 'tt' ? EXAM_LABEL_TOAN_THAN : EXAM_LABEL_CAC_BO_PHAN);
    if (!field) return;
    const text = kind === 'tt' ? exBuildToanThan(st, exPrefix(st)) : exBuildBoPhan(st);
    exWrite(field, text, st, kind, kind === 'tt' ? EXAM_TOAN_THAN_BASE : EXAM_DEFAULT_BO_PHAN);
  }
  function exOnChange(kind) {
    exState().touched[kind] = true;
    exApply(kind);
  }

  function exEnsureCss() {
    if (document.getElementById('hlx-ex-css')) return;
    const st = document.createElement('style');
    st.id = 'hlx-ex-css';
    st.textContent =
      'body.hlx-ex-resizing,body.hlx-ex-resizing *{user-select:none !important;cursor:ns-resize !important;}' +
      '.hlx-ex-panel{width:100%;box-sizing:border-box;margin:12px 0 4px;border:1px solid #c8d3e0;border-radius:6px;background:#f7f9fc;font-size:12px;clear:both;float:none !important;}' +
      '.hlx-ex-head{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:5px 8px;}' +
      '.hlx-ex-tgl{border:1px solid #0f9d78;background:#fff;color:#0f9d78;border-radius:4px;padding:3px 10px;font-size:12px;font-weight:600;cursor:pointer;}' +
      '.hlx-ex-tgl:hover{background:#0f9d78;color:#fff;}' +
      '.hlx-ex-mini{border:1px solid #c7cdd6;background:#fff;color:#333;border-radius:4px;padding:2px 8px;font-size:11.5px;cursor:pointer;}' +
      '.hlx-ex-mini.on{background:#1a56db;border-color:#1a56db;color:#fff;font-weight:700;}' +
      '.hlx-ex-info{font-size:11.5px;color:#666;}' +
      '.hlx-ex-line{display:inline-flex;align-items:center;gap:4px;font-size:11.5px;color:#333;cursor:pointer;margin:0;font-weight:normal;}' +
      '.hlx-ex-body{padding:4px 10px 10px;border-top:1px solid #dfe6ee;}' +
      '.hlx-ex-sec{font-weight:700;color:#0f9d78;font-size:11.5px;margin:9px 0 4px;text-transform:uppercase;letter-spacing:.3px;}' +
      '.hlx-ex-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(165px,1fr));gap:6px 10px;}' +
      '.hlx-ex-f{display:flex;flex-direction:column;gap:2px;min-width:0;}' +
      '.hlx-ex-f>span{font-size:11px;color:#556;}' +
      '.hlx-ex-f select,.hlx-ex-f input[type="text"]{width:100%;height:26px;box-sizing:border-box;font-size:12px;border:1px solid #c7cdd6;border-radius:4px;background:#fff;padding:0 4px;}' +
      '.hlx-ex-chips{display:flex;flex-wrap:wrap;gap:5px;}' +
      '.hlx-ex-chip{border:1px solid #0f9d78;background:#fff;color:#0f9d78;border-radius:14px;padding:2px 11px;font-size:12px;cursor:pointer;}' +
      '.hlx-ex-chip.on{background:#0f9d78;color:#fff;font-weight:700;}' +
      '.hlx-ex-sym{border:1px dashed #b8c4d2;border-radius:5px;padding:6px 8px 8px;margin-top:6px;background:#fff;}' +
      '.hlx-ex-sym-h{font-weight:700;color:#1a56db;font-size:12px;margin-bottom:4px;}' +
      '.hlx-ex-multi{display:flex;flex-wrap:wrap;gap:3px 12px;}' +
      '.hlx-ex-multi label{display:inline-flex !important;align-items:center;gap:4px;margin:0 !important;padding:0 !important;font-weight:normal !important;white-space:nowrap;width:auto !important;float:none !important;cursor:pointer;}' +
      '.hlx-ex-multi input[type="checkbox"],.hlx-ex-line input[type="checkbox"]{display:inline-block !important;position:static !important;opacity:1 !important;visibility:visible !important;-webkit-appearance:checkbox !important;appearance:auto !important;width:14px !important;height:14px !important;margin:0 !important;flex:none;}';
    (document.head || document.documentElement).appendChild(st);
  }

  function exDiv(cls) {
    const d = document.createElement('div');
    if (cls) d.className = cls;
    return d;
  }
  function exBtn(cls, text, onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.textContent = text;
    b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); onClick(b); });
    return b;
  }
  function exSelect(opts, value, onChange) {
    const s = document.createElement('select');
    const b = document.createElement('option');
    b.value = '';
    b.textContent = '—';
    s.appendChild(b);
    opts.forEach((o) => {
      const op = document.createElement('option');
      op.value = o;
      op.textContent = o;
      s.appendChild(op);
    });
    s.value = value || '';
    s.addEventListener('change', () => onChange(s.value));
    return s;
  }
  function exMulti(opts, vals, onChange) {
    const box = exDiv('hlx-ex-multi');
    opts.forEach((o) => {
      const lb = document.createElement('label');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = o;
      cb.checked = (vals || []).indexOf(o) !== -1;
      cb.addEventListener('change', () => {
        onChange(Array.from(box.querySelectorAll('input:checked')).map((x) => x.value));
      });
      lb.appendChild(cb);
      lb.appendChild(document.createTextNode(o));
      box.appendChild(lb);
    });
    return box;
  }
  function exField(label, ctrl, wide) {
    const f = exDiv('hlx-ex-f');
    const sp = document.createElement('span');
    sp.textContent = label;
    f.appendChild(sp);
    f.appendChild(ctrl);
    if (wide) f.style.gridColumn = '1 / -1';
    return f;
  }
  function exSec(text) {
    const d = exDiv('hlx-ex-sec');
    d.textContent = text;
    return d;
  }
  function exFreeInput(kind, st) {
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.placeholder = 'Khác: gõ thêm nội dung (thành 1 dòng riêng)';
    inp.value = kind === 'tt' ? st.ttFree : st.bpFree;
    inp.addEventListener('input', () => {
      if (kind === 'tt') st.ttFree = inp.value; else st.bpFree = inp.value;
      exOnChange(kind);
    });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); }
    });
    return exField('Ghi chú thêm', inp, true);
  }

  function exRebuild(kind) {
    document.querySelectorAll('.hlx-ex-panel[data-ex="' + kind + '"]').forEach((n) => n.remove());
    exEnsurePanel(kind);
  }

  function exBuildPanel(kind, key) {
    exEnsureCss();
    const st = exState();
    const isTt = kind === 'tt';
    const box = exDiv('hlx-ex-panel');
    box.dataset.ex = kind;
    box.dataset.exVisit = key;

    const openKey = isTt ? 'openTt' : 'openBp';
    const head = exDiv('hlx-ex-head');
    const body = exDiv('hlx-ex-body');
    const title = isTt ? '🩺 Chọn nhanh Toàn thân' : '🫀 Chọn nhanh Các bộ phận';
    const open = !!exPrefs()[openKey];
    body.style.display = open ? '' : 'none';
    head.appendChild(exBtn('hlx-ex-tgl', (open ? '▾ ' : '▸ ') + title, (b) => {
      const show = body.style.display === 'none';
      body.style.display = show ? '' : 'none';
      b.textContent = (show ? '▾ ' : '▸ ') + title;
      exPrefSet(openKey, show);
    }));

    if (isTt) {
      const age = exGetAge();
      const pre = exPrefix(st);
      const lab = document.createElement('span');
      lab.className = 'hlx-ex-info';
      lab.textContent = 'Xưng:';
      head.appendChild(lab);
      ['Bệnh', 'Bé'].forEach((p) => {
        head.appendChild(exBtn('hlx-ex-mini' + (pre === p ? ' on' : ''), p, () => {
          st.pre = p;
          st.touched.tt = true;
          exApply('tt');
          exRebuild('tt');
        }));
      });
      const info = document.createElement('span');
      info.className = 'hlx-ex-info';
      info.textContent = age === null ? '(không đọc được tuổi — hãy chọn Bệnh/Bé)' : '(tuổi ' + age + (st.pre ? ', đang chọn tay' : ', tự nhận') + ')';
      head.appendChild(info);
    }

    const lineLb = document.createElement('label');
    lineLb.className = 'hlx-ex-line';
    const lineCb = document.createElement('input');
    lineCb.type = 'checkbox';
    lineCb.checked = exPrefs().perLine !== false;
    lineCb.addEventListener('change', () => {
      exPrefSet('perLine', lineCb.checked);
      ['tt', 'bp'].forEach((k) => { if (exState().touched[k]) exApply(k); });
    });
    lineLb.appendChild(lineCb);
    lineLb.appendChild(document.createTextNode('Mỗi mục 1 dòng'));
    head.appendChild(lineLb);

    head.appendChild(exBtn('hlx-ex-mini', '↺ Đặt lại mặc định', () => {
      const fresh = exNewState();
      if (isTt) { st.tt = fresh.tt; st.ttSym = fresh.ttSym; st.ttFree = ''; }
      else { st.bp = fresh.bp; st.bpFree = ''; }
      st.touched[kind] = true;
      exApply(kind);
      exRebuild(kind);
    }));
    box.appendChild(head);

    if (isTt) {
      const pre = exPrefix(st);
      body.appendChild(exSec('Toàn thân'));
      const grid = exDiv('hlx-ex-grid');
      EX_TT_CORE.forEach((f) => {
        let opts = f.opts;
        if (f.k === 'yt' && pre !== 'Bé') {
          opts = opts.filter((o) => EX_CHILD_ONLY_YT.indexOf(o) === -1);
          if (st.tt.yt && opts.indexOf(st.tt.yt) === -1) st.tt.yt = '';
        }
        grid.appendChild(exField(f.label, exSelect(opts, st.tt[f.k], (v) => { st.tt[f.k] = v; exOnChange('tt'); })));
      });
      body.appendChild(grid);

      body.appendChild(exSec('Triệu chứng kèm theo (bấm nhóm rồi chọn chi tiết)'));
      const chips = exDiv('hlx-ex-chips');
      const symWrap = exDiv('');
      body.appendChild(chips);
      body.appendChild(symWrap);
      const renderSym = () => {
        chips.innerHTML = '';
        symWrap.innerHTML = '';
        EX_SYM.forEach((g) => {
          const s0 = st.ttSym[g.k];
          const on = !!(s0 && s0.on);
          chips.appendChild(exBtn('hlx-ex-chip' + (on ? ' on' : ''), g.label, () => {
            const s = st.ttSym[g.k] || (st.ttSym[g.k] = { on: false, v: {} });
            s.on = !s.on;
            exOnChange('tt');
            renderSym();
          }));
          if (!on) return;
          const blk = exDiv('hlx-ex-sym');
          const h = exDiv('hlx-ex-sym-h');
          h.textContent = g.label;
          blk.appendChild(h);
          const gr = exDiv('hlx-ex-grid');
          g.fields.forEach((f) => {
            const onCh = (v) => { s0.v[f.k] = v; exOnChange('tt'); };
            const ctrl = f.multi ? exMulti(f.opts, s0.v[f.k] || [], onCh) : exSelect(f.opts, s0.v[f.k], onCh);
            gr.appendChild(exField(f.label, ctrl, !!f.multi));
          });
          blk.appendChild(gr);
          symWrap.appendChild(blk);
        });
      };
      renderSym();
      body.appendChild(exSec('Khác'));
      const g2 = exDiv('hlx-ex-grid');
      g2.appendChild(exFreeInput('tt', st));
      body.appendChild(g2);
    } else {
      EX_BP.forEach((sys) => {
        body.appendChild(exSec(sys.label));
        const grid = exDiv('hlx-ex-grid');
        sys.fields.forEach((f) => {
          const k = sys.k + '.' + f.k;
          const onCh = (v) => { st.bp[k] = v; exOnChange('bp'); };
          const ctrl = f.multi ? exMulti(f.opts, st.bp[k] || [], onCh) : exSelect(f.opts, st.bp[k], onCh);
          grid.appendChild(exField(sys.fields.length === 1 ? 'Chọn' : f.label, ctrl, !!f.multi));
        });
        body.appendChild(grid);
      });
      body.appendChild(exSec('Khác'));
      const g2 = exDiv('hlx-ex-grid');
      g2.appendChild(exFreeInput('bp', st));
      body.appendChild(g2);
    }
    box.appendChild(body);
    return box;
  }

  function exEnsureGrip(ta, kind) {
    const wrap = ta.parentElement;
    if (!wrap) return;
    if (!ta.dataset.hlxH) {
      ta.dataset.hlxH = '1';
      const h = exPrefs()['h_' + kind];
      if (h) ta.style.setProperty('height', h + 'px', 'important');
    }
    ta.style.setProperty('resize', 'vertical', 'important');
    ta.style.setProperty('max-height', 'none', 'important');
    if (!ta.dataset.hlxCap) {
      ta.dataset.hlxCap = '1';
      ta.addEventListener('input', (e) => {
        if (e.isComposing || !isHelixfastEnabled()) return;
        const v = ta.value;
        const nv = v.replace(/(^|\n)([ \t]*)(\S)/g, (m, a, b, c) => a + b + c.toLocaleUpperCase('vi-VN'));
        if (nv === v) return;
        const s = ta.selectionStart;
        const en = ta.selectionEnd;
        setNativeValue(ta, nv);
        try { ta.setSelectionRange(s, en); } catch (err) {}
      });
    }
    if (window.getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
    let g = wrap.querySelector('.hlx-ex-grip[data-ex="' + kind + '"]');
    if (g && g._ta !== ta) { g.remove(); g = null; }
    const place = () => {
      g.style.left = (ta.offsetLeft + ta.offsetWidth - 18) + 'px';
      g.style.top = (ta.offsetTop + ta.offsetHeight - 18) + 'px';
    };
    if (!g) {
      g = document.createElement('div');
      g.className = 'hlx-ex-grip';
      g.dataset.ex = kind;
      g._ta = ta;
      g.title = 'Kéo lên/xuống để đổi chiều cao ô';
      Object.assign(g.style, {
        position: 'absolute', width: '18px', height: '18px', cursor: 'ns-resize', zIndex: '5',
        background: 'transparent',
      });
      g.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        const startY = e.clientY;
        const startH = ta.offsetHeight;
        document.body.classList.add('hlx-ex-resizing');
        const mv = (ev) => {
          const h = Math.max(40, startH + ev.clientY - startY);
          ta.style.setProperty('height', h + 'px', 'important');
          place();
        };
        const up = () => {
          document.removeEventListener('mousemove', mv, true);
          document.removeEventListener('mouseup', up, true);
          document.body.classList.remove('hlx-ex-resizing');
          exPrefSet('h_' + kind, ta.offsetHeight);
        };
        document.addEventListener('mousemove', mv, true);
        document.addEventListener('mouseup', up, true);
      });
      wrap.appendChild(g);
    }
    place();
  }

  function exEnsurePanel(kind) {
    const ta = ipdFindDocxField(kind === 'tt' ? EXAM_LABEL_TOAN_THAN : EXAM_LABEL_CAC_BO_PHAN);
    if (!ta || ta.tagName !== 'TEXTAREA') return;
    exEnsureCss();
    exEnsureGrip(ta, kind);
    const wrap = ta.parentElement;
    const key = ipdVisitKey() || '_';
    let box = wrap.querySelector('.hlx-ex-panel[data-ex="' + kind + '"]');
    if (box && box.dataset.exVisit !== key) { box.remove(); box = null; }
    if (!box) ta.insertAdjacentElement('afterend', exBuildPanel(kind, key));
  }

  // Popup "Thêm tờ điều trị": tự điền "Diễn biến bệnh" = nội dung Toàn thân + 4 chỉ số sinh hiệu
  function ipdReadVitals() {
    const tables = Array.from(document.querySelectorAll('table.vital-sign'));
    const t = tables.find(hlxIsVisible) || tables[0];
    const out = {};
    if (!t) return out;
    t.querySelectorAll('tr').forEach((tr) => {
      const tds = Array.from(tr.children).filter((c) => c.tagName === 'TD');
      for (let i = 0; i + 1 < tds.length; i += 2) {
        const lab = bsdhaClean(tds[i].textContent).replace(/:$/, '').normalize('NFC');
        const cell = tds[i + 1];
        const inp = cell.querySelector('input');
        out[lab] = bsdhaClean(inp ? inp.value : cell.textContent);
      }
    });
    return out;
  }

  function ipdTreatmentProgTick() {
    const ta = Array.from(document.querySelectorAll('.p-dialog textarea[formcontrolname="progression"]')).find(hlxIsVisible);
    if (!ta || ta.dataset.hlxProgDone) return;
    const now = Date.now();
    if (!ta.dataset.hlxProgT0) ta.dataset.hlxProgT0 = String(now);
    if (now - Number(ta.dataset.hlxProgT0) > 8000) { ta.dataset.hlxProgDone = '1'; return; }
    if ((ta.value || '').trim()) { ta.dataset.hlxProgDone = '1'; return; }

    // Chỉ điền khi popup đúng của bệnh nhân đang mở (so mã tiếp nhận trên tiêu đề popup)
    const dialog = ta.closest('.p-dialog');
    const titleEl = dialog && dialog.querySelector('.p-dialog-title');
    const titleText = titleEl ? titleEl.textContent.replace(/\s+/g, ' ') : '';
    const key = ipdVisitKey();
    if (key && /^[A-Za-z]{1,4}\d{5,}$/.test(key) && titleText.indexOf(key) === -1) return;

    // Tìm ô "Toàn thân" kể cả khi tab Khám bệnh đang bị ẩn phía sau popup
    const findField = (label) => {
      let f = ipdFindDocxField(label);
      if (f) return f;
      const sps = document.querySelectorAll('docx-label span[title]');
      for (const sp of sps) {
        if ((sp.getAttribute('title') || '').trim() !== label) continue;
        const row = sp.closest('.ui-form-group');
        const el = row && row.querySelector('docx-control textarea');
        if (el) return el;
      }
      return null;
    };
    const tt = findField(EXAM_LABEL_TOAN_THAN);
    const bpEl = findField(EXAM_LABEL_CAC_BO_PHAN);
    const bpText = bpEl ? (bpEl.value || '').trim() : '';
    const base = tt ? (tt.value || '').trim() : '';
    // Chưa có nội dung Toàn thân: chờ thêm (tối đa ~3 giây) rồi mới điền riêng sinh hiệu
    if (!base && now - Number(ta.dataset.hlxProgT0) < 3000) return;
    const vit = ipdReadVitals();
    const rows = [];
    [['Mạch', 'Mạch'], ['Nhiệt độ', 'Nhiệt độ'], ['Huyết áp', 'Huyết áp'], ['Nhịp thở', 'Nhịp thở']].forEach((p) => {
      let v = vit[p[0]];
      if (!v || !/\d/.test(v)) return;
      if (p[0] === 'Huyết áp') v = v.replace(/\s*\/\s*/g, '/');
      rows.push(p[1] + ': ' + v);
    });
    if (!base && !rows.length) return;
    // Tách Toàn thân: phần "Bệnh/Bé…, tiếp xúc, da niêm, hạch ngoại vi" (+GCS) ở TRÊN sinh hiệu,
    // phần còn lại (mạch quay, chi, triệu chứng...) đặt DƯỚI sinh hiệu
    const HEAD_RE = /^(bệnh|bé|tiếp xúc|không tiếp xúc|da niêm|hạch ngoại vi|gcs)(\s|$)/i;
    const multiLine = /\n/.test(base);
    const headLines = [];
    const restLines = [];
    base.split(/\r?\n/).forEach((line) => {
      line.split(/\.\s+|\.$/).forEach((sent) => {
        const s = sent.trim();
        if (!s) return;
        const headParts = [];
        const restParts = [];
        s.split(/\s*,\s*/).forEach((c) => {
          const cl = c.trim();
          if (!cl) return;
          (HEAD_RE.test(cl) ? headParts : restParts).push(cl);
        });
        const fix = (parts) => {
          const t = parts.join(', ').replace(/[.\s]+$/, '');
          return t ? t.charAt(0).toLocaleUpperCase('vi-VN') + t.slice(1) : '';
        };
        const h = fix(headParts);
        const r = fix(restParts);
        if (h) headLines.push(h);
        if (r) restLines.push(r);
      });
    });
    const sep = multiLine ? '\n' : '. ';
    const headText = headLines.join('\n');
    const restText = restLines.length ? restLines.join(sep) + (multiLine ? '' : '.') : '';
    setNativeValue(ta, [headText, rows.join('\n'), restText, bpText].filter(Boolean).join('\n'));
    ta.dataset.hlxProgDone = '1';
  }

  // ===== Tab "Bệnh án": chọn sẵn / điền sẵn các mục (mỗi lượt khám chỉ làm 1 lần mỗi mục) =====
  const BA_CONSTANTS = [
    ['6.2.1', 'Tim đều, không âm thổi bệnh lý'],
    ['6.2.2', 'Phổi không rale'],
    ['6.2.3', 'Bụng mềm, gan lách không sờ chạm'],
    ['6.2.4', 'Chạm thận (-)'],
    ['6.2.5', 'Không dấu thần kinh định vị'],
    ['6.2.6', 'Cử động trong giới hạn bình thường'],
    ['6.2.7', 'Chưa ghi nhận bất thường'],
    ['6.2.8', 'Chưa ghi nhận bất thường'],
    ['6.2.9', 'Chưa ghi nhận bất thường'],
    ['6.2.10', 'Chưa ghi nhận bất thường'],
  ];
  const baDone = {};

  function baFindRow(num) {
    const re = new RegExp('^' + num.replace(/\./g, '\\.') + '\\.\\s');
    const spans = document.querySelectorAll('docx-label span[title]');
    let any = null;
    for (const sp of spans) {
      const txt = (sp.textContent || '').replace(/\s+/g, ' ').trim();
      if (!re.test(txt)) continue;
      const row = sp.closest('.clearfix');
      if (!row) continue;
      if (hlxIsVisible(row)) return row;
      any = any || row;
    }
    return any && hlxIsVisible(any) ? any : null;
  }

  function baFindTextarea(num) {
    const row = baFindRow(num);
    return row ? row.querySelector('docx-control textarea') : null;
  }

  // Nguồn ở phần nhập khoa: tìm theo tiêu đề, chấp nhận cả khi tab đang ẩn
  function baSourceByTitle(label) {
    const spans = document.querySelectorAll('docx-label span[title]');
    let hidden = null;
    for (const sp of spans) {
      if ((sp.getAttribute('title') || '').trim() !== label) continue;
      const row = sp.closest('.ui-form-group');
      const el = row && row.querySelector('docx-control textarea');
      if (!el) continue;
      if (hlxIsVisible(el)) return el;
      hidden = hidden || el;
    }
    return hidden;
  }

  function baSourceByControl(name) {
    const els = Array.from(document.querySelectorAll('textarea[formcontrolname="' + name + '"]'));
    return els.find(hlxIsVisible) || els[0] || null;
  }

  function baPickRadio(num, wantText, overrideTexts) {
    const row = baFindRow(num);
    if (!row) return false;
    const radios = Array.from(row.querySelectorAll('p-radiobutton'));
    if (!radios.length) return false;
    const txt = (r) => (r.querySelector('label') ? r.querySelector('label').textContent : '').replace(/\s+/g, ' ').trim();
    const want = radios.find((r) => txt(r) === wantText);
    if (!want) return false;
    const checked = radios.find((r) => r.querySelector('.p-radiobutton-checked'));
    if (checked === want) return true;
    if (checked && !(overrideTexts || []).includes(txt(checked))) return true; // người dùng đã chọn khác: giữ nguyên
    const box = want.querySelector('.p-radiobutton-box') || want.querySelector('.p-radiobutton') || want;
    box.click();
    return true;
  }

  // Suy ra số ngày từ lúc có triệu chứng đến khi vào viện (giờ/phút/cùng ngày = 1)
  function baParseOnsetDays(text) {
    const t = String(text || '').toLowerCase().normalize('NFC');
    if (!t.trim()) return 0;
    const words = { 'một': 1, 'hai': 2, 'ba': 3, 'bốn': 4, 'tư': 4, 'năm': 5, 'sáu': 6, 'bảy': 7, 'tám': 8, 'chín': 9, 'mười': 10 };
    const re = /(\d+|một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười)\s*(ngày|tuần|tháng|giờ|tiếng|phút)\b/g;
    let m;
    while ((m = re.exec(t))) {
      const prev = t.slice(Math.max(0, m.index - 6), m.index);
      if (/thứ\s*$/.test(prev)) continue;
      const num = /^\d+$/.test(m[1]) ? parseInt(m[1], 10) : words[m[1]];
      if (!num) continue;
      if (m[2] === 'ngày') return num;
      if (m[2] === 'tuần') return num * 7;
      if (m[2] === 'tháng') return num * 30;
      return 1; // giờ, tiếng, phút
    }
    if (/(cùng ngày|trong ngày|nửa ngày|sáng nay|chiều nay|tối nay|hôm nay|vài giờ|vài tiếng)/.test(t)) return 1;
    return 0;
  }

  function ipdBenhAnTick() {
    const key = ipdVisitKey() || '_';
    const done = baDone[key] || (baDone[key] = new Set());
    // Chỉ chạy khi tab Bệnh án đang hiển thị; rời tab thì reset để lần sau (có thể là bệnh nhân khác) làm lại
    if (!baFindRow('1.1')) { delete baDone[key]; delete baSyncSt[key]; return; }

    if (!done.has('r1.1') && baPickRadio('1.1', '1.Cấp cứu', ['3.Khoa điều trị'])) done.add('r1.1');
    if (!done.has('r1.2') && baPickRadio('1.2', '2.Tự đến', [])) done.add('r1.2');

    const fillFrom = (id, getSrc) => {
      if (done.has(id)) return;
      const ta = baFindTextarea(id);
      if (!ta) return;
      if (ta.value.trim()) { done.add(id); return; } // đã có nội dung: không đụng vào
      const src = getSrc();
      const text = src ? (src.value || '').trim() : '';
      if (!text) return; // nguồn chưa có: thử lại ở lần sau
      setNativeValue(ta, text);
      done.add(id);
    };

    fillFrom('5.1', () => baSourceByTitle('Diễn biến vào viện'));
    // 4.1 Vào ngày thứ: suy ra từ "Diễn biến vào viện" (cách nhập viện N ngày / giờ / phút / cùng ngày → 1)
    if (!done.has('4.1')) {
      const f41 = baFindField('4.1');
      if (f41) {
        if (f41.value.trim()) done.add('4.1');
        else {
          const srcEl = baSourceByTitle('Diễn biến vào viện');
          const srcTxt = srcEl ? String(srcEl.value || '').trim() : '';
          const n = srcTxt ? (baParseOnsetDays(srcTxt) || 1) : 0; // không xác định được → mặc định 1
          if (n) { setNativeValue(f41, String(n)); done.add('4.1'); }
        }
      }
    }
    fillFrom('5.2.1', () => baSourceByControl('self_anamnesis'));
    fillFrom('5.2.3', () => baSourceByControl('family_anamnesis'));
    fillFrom('6.1', () => baSourceByTitle('Toàn thân'));
    fillFrom('6.3', () => {
      const a = baSourceByTitle('Yêu cầu xét nghiệm CLS');
      if (a && (a.value || '').trim()) return a;
      return baSourceByTitle('Chỉ định CLS');
    });

    BA_CONSTANTS.forEach((p) => {
      const id = p[0];
      if (done.has(id)) return;
      const ta = baFindTextarea(id);
      if (!ta) return;
      if (!ta.value.trim()) setNativeValue(ta, p[1]);
      done.add(id);
    });
    baExtraTick(key, done);
  }

  // ===== Bệnh án: 6.4 tóm tắt, 8 tiên lượng, 9, 10.x =====
  const baSyncSt = {};
  let baBusy = false;
  let baLastSummary = '';
  let baLast102 = '';
  const BA_102_ITEMS = [
    ['ctm', 'Công thức máu'], ['dgd', 'Điện giải đồ'], ['dhmm', 'ĐHMM'],
    ['ns1', 'NS1Ag'], ['sa', 'Siêu âm'], ['xq', 'X-quang'],
  ];

  const baSleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const baNorm = (s) => String(s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim().normalize('NFC');

  function baWaitFor(fn, timeout, step) {
    timeout = timeout || 4000; step = step || 100;
    return new Promise((res) => {
      const t0 = Date.now();
      (function tick() {
        let v = null;
        try { v = fn(); } catch (err) {}
        if (v || Date.now() - t0 > timeout) return res(v || null);
        setTimeout(tick, step);
      })();
    });
  }

  function baFindField(num) {
    const row = baFindRow(num);
    if (!row) return null;
    return row.querySelector('docx-control textarea') ||
      row.querySelector('docx-control input[type="text"], docx-control input:not([type])');
  }

  function baEnsureCss() {
    if (document.getElementById('hlx-ba-css')) return;
    const st = document.createElement('style');
    st.id = 'hlx-ba-css';
    st.textContent =
      '.hlx-ba-opts,.hlx-ba-bar{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:4px 0;clear:both;width:100%;box-sizing:border-box;}' +
      '.hlx-ba-opt{border:1px solid #0f9d78;background:#fff;color:#0f9d78;border-radius:14px;padding:2px 12px;font-size:12px;cursor:pointer;}' +
      '.hlx-ba-opt.on{background:#0f9d78;color:#fff;font-weight:700;}' +
      '.hlx-ba-go{border:1px solid #1a56db;background:#1a56db;color:#fff;border-radius:4px;padding:3px 12px;font-size:12px;font-weight:600;cursor:pointer;}' +
      '.hlx-ba-go:disabled{opacity:.5;cursor:default;}' +
      '.hlx-ba-st{font-size:11.5px;color:#555;font-style:italic;}' +
      '.hlx-ba-chk{display:inline-flex !important;align-items:center;gap:4px;margin:0 !important;font-weight:normal !important;font-size:12px;cursor:pointer;width:auto !important;float:none !important;}' +
      '.hlx-ba-chk input{display:inline-block !important;position:static !important;opacity:1 !important;visibility:visible !important;-webkit-appearance:checkbox !important;appearance:auto !important;width:14px !important;height:14px !important;margin:0 !important;}';
    (document.head || document.documentElement).appendChild(st);
  }

  // Nút chọn nhanh cho 1 ô; def điền sẵn 1 lần
  function baEnsureOptions(num, cls, options, def, done) {
    const f = baFindField(num);
    if (!f) return;
    baEnsureCss();
    if (def && !done.has('def' + num)) {
      if (!f.value.trim()) setNativeValue(f, def);
      done.add('def' + num);
    }
    let box = f.parentElement.querySelector('.' + cls);
    if (!box) {
      box = document.createElement('div');
      box.className = 'hlx-ba-opts ' + cls;
      options.forEach((o) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'hlx-ba-opt';
        b.textContent = o;
        b.addEventListener('click', (e) => {
          e.preventDefault(); e.stopPropagation();
          const ff = baFindField(num);
          if (ff) setNativeValue(ff, o);
        });
        box.appendChild(b);
      });
      f.insertAdjacentElement('afterend', box);
    }
    const cur = baNorm(f.value).toLowerCase();
    box.querySelectorAll('.hlx-ba-opt').forEach((b) => {
      b.classList.toggle('on', b.textContent.toLowerCase() === cur);
    });
  }

  // ---- đọc dữ liệu bệnh nhân ----
  function baReadGender() {
    const spans = Array.from(document.querySelectorAll('td[pltablecolumncell="gender"] span[title]'));
    if (!spans.length) return '';
    const sel = spans.find((s) => {
      const tr = s.closest('tr');
      return tr && (tr.getAttribute('data-p-highlight') === 'true' || tr.classList.contains('p-highlight'));
    });
    const pick = sel || (spans.length === 1 ? spans[0] : spans.find(hlxIsVisible));
    const t = pick ? baNorm(pick.getAttribute('title')) : '';
    return /^nữ$/i.test(t) ? 'Nữ' : /^nam$/i.test(t) ? 'Nam' : '';
  }

  function baReadAge() {
    let a = exGetAge();
    if (a !== null) return a;
    const root = document.getElementById('ipd_detail') || document;
    for (const lab of bsdhaFindLabels('Tuổi', root)) {
      let n = lab;
      for (let i = 0; n && i < 3; i++, n = n.parentElement) {
        const inp = n.querySelector && n.querySelector('input');
        if (inp && /\d/.test(inp.value || '')) {
          a = exParseAge(inp.value);
          if (a !== null) return a;
        }
      }
    }
    return null;
  }

  // ---- phân tích triệu chứng ----
  const BA_NORMAL_RE = /^(bệnh nhân |bn |bé )?(tỉnh|tiếp xúc|da niêm|niêm hồng|tim đều|phổi rõ|phổi trong|bụng mềm|không dấu thần kinh|sinh hiệu ổn)/i;
  const BA_THUCTHE_RE = /(rale|ran ẩm|ran nổ|ran rít|ran ngáy|ronchi|co kéo|rút lõm|ấn đau|đau khi ấn|phản ứng thành bụng|cảm ứng phúc mạc|murphy|mcburney|gan|lách|phù|vàng da|vàng mắt|xuất huyết|chấm xuất huyết|nổi ban|phát ban|hạch|cứng gáy|cổ mềm|dấu thần kinh|yếu liệt|liệt|mạch nhanh|tim nhanh|nhịp nhanh|loạn nhịp|thở nhanh|tím|spo2|huyết áp|nhiệt độ|thở rít|khò khè|chướng|đề kháng|dấu mất nước|mất nước|sốc|lơ mơ|li bì|vã mồ hôi|da lạnh|chi lạnh|đồng tử|rung thận|chạm thận|sưng|nóng đỏ)/i;
  const BA_CONANG_RE = /(sốt|ớn lạnh|rét run|ho|đờm|khó thở|đau|nhức|mỏi|buồn nôn|nôn|ói|tiêu chảy|tiêu lỏng|táo bón|chóng mặt|hoa mắt|mệt|chán ăn|ăn kém|sụt cân|mất ngủ|tiểu|ngứa|hồi hộp|đánh trống ngực|tức ngực|nặng ngực|nghẹt mũi|sổ mũi|chảy mũi|khó nuốt|ợ |nóng rát|máu|tê |run |co giật|ngất|đầy bụng|đại tiện|phân )/i;

  function baExtractSymptoms(text) {
    const conang = [];
    const thucthe = [];
    const seen = new Set();
    String(text || '').split(/[.;\n]+/).forEach((sent) => {
      sent.split(/\s*,\s*/).forEach((raw) => {
        let c = baNorm(raw).replace(/^(bệnh nhân|bn|bé)\s+/i, '').replace(/[\s:,.-]+$/, '');
        if (!c || c.length < 3) return;
        const low = c.toLowerCase();
        if (seen.has(low)) return;
        const isThucThe = BA_THUCTHE_RE.test(low);
        const isCoNang = BA_CONANG_RE.test(low);
        if (BA_NORMAL_RE.test(low) && !isThucThe && !isCoNang) return;
        if (!isThucThe && !isCoNang) return;
        seen.add(low);
        (isThucThe && !/^(đau|sốt|ho|nôn|buồn nôn|khó thở)/.test(low) ? thucthe : conang).push(low);
      });
    });
    return { conang, thucthe };
  }

  // ---- tab Tờ điều trị: lấy diễn biến lần khám đầu ----
  function baFindTabLink(text) {
    const want = text.normalize('NFC');
    const match = (a) => hlxIsVisible(a) && baNorm(a.textContent) === want;
    let c = Array.from(document.querySelectorAll('ul.nav-tabs a')).filter(match);
    if (!c.length) {
      c = Array.from(document.querySelectorAll('a[data-toggle="tab"], a[role="tab"], [role="tab"], .p-tabview-nav a, .p-tabmenu-nav a')).filter(match);
    }
    return c[0] || null;
  }

  function baFindTreatTable() {
    return Array.from(document.querySelectorAll('p-table table')).find((t) =>
      hlxIsVisible(t) && Array.from(t.querySelectorAll('thead th')).some((th) => /Mã tờ điều trị/.test(th.textContent))
    ) || null;
  }

  function baRowTime(tr) {
    const s = (tr.getAttribute('title') || '') + ' ' + tr.textContent;
    const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
    return m ? new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]).getTime() : Infinity;
  }

  function baFindDienBienTextarea() {
    for (const lab of bsdhaFindLabels('Diễn biến bệnh')) {
      let n = lab;
      for (let i = 0; n && i < 4; i++, n = n.parentElement) {
        const ta = n.querySelector && n.querySelector('textarea');
        if (ta) return ta;
      }
    }
    return Array.from(document.querySelectorAll('textarea[readonly][pinputtextarea]')).find(hlxIsVisible) || null;
  }

  async function baGetFirstProgression() {
    const treatLink = baFindTabLink('Tờ điều trị');
    let backLink = null;
    if (treatLink) {
      const ul = treatLink.closest('ul');
      const act = ul && ul.querySelector('li.active > a');
      if (act && act !== treatLink) backLink = act;
    }
    if (!baFindTreatTable()) {
      if (!treatLink) return '';
      treatLink.click();
    }
    const table = await baWaitFor(baFindTreatTable, 4000);
    if (!table) { if (backLink) backLink.click(); return ''; }
    await baSleep(300);
    const rows = Array.from(table.querySelectorAll('tbody > tr.p-selectable-row'));
    if (!rows.length) { if (backLink) backLink.click(); return ''; }
    const orig = rows.find((r) => r.getAttribute('data-p-highlight') === 'true' || r.classList.contains('view-detail')) || null;
    const first = rows.slice().sort((a, b) => baRowTime(a) - baRowTime(b))[0];
    const ta0 = baFindDienBienTextarea();
    const prev = ta0 ? ta0.value : '';
    const cell = first.querySelector('td:nth-child(3)') || first.querySelector('td:last-child');
    if (first !== orig) cell.click();
    await baWaitFor(() => {
      const t = baFindDienBienTextarea();
      return t && t.value.trim() && (first === orig || t.value !== prev);
    }, 3500);
    await baSleep(200);
    const ta = baFindDienBienTextarea();
    const text = ta ? ta.value : '';
    if (orig && first !== orig) {
      const oc = orig.querySelector('td:nth-child(3)') || orig.querySelector('td:last-child');
      if (oc) oc.click();
      await baSleep(300);
    }
    if (backLink) backLink.click();
    await baWaitFor(() => baFindRow('6.4'), 3000);
    return text;
  }

  async function baGenerateSummary(btn, stEl) {
    if (baBusy) return;
    baBusy = true;
    btn.disabled = true;
    const setSt = (t) => { stEl.textContent = t; };
    showPrintOverlay('Đang tạo tóm tắt bệnh án, vui lòng chờ...');
    try {
      let sex = baReadGender();
      let age = baReadAge();
      if (!sex) { const a = window.prompt('Không đọc được giới tính. Nhập Nam hoặc Nữ:', 'Nam'); sex = /nữ|nu/i.test(a || '') ? 'Nữ' : 'Nam'; }
      if (age === null) { const a = window.prompt('Không đọc được tuổi. Nhập tuổi:', ''); age = exParseAge(a || ''); }
      const src = baSourceByControl('symptom');
      let reason = src ? baNorm(src.value).replace(/[.\s]+$/, '') : '';
      reason = reason ? reason.charAt(0).toLocaleLowerCase('vi-VN') + reason.slice(1) : '...';
      const prog = await baGetFirstProgression();
      const sym = baExtractSymptoms(prog);
      const lines = [
        'Bệnh nhân ' + sex + ', ' + (age === null ? '...' : age) + ' tuổi, vào viện vì ' + reason + ', qua thăm khám ghi nhận:',
        '- Cơ năng: ' + (sym.conang.length ? sym.conang.join(', ') : '(chưa trích xuất được, vui lòng bổ sung)'),
        '- Thực thể: ' + (sym.thucthe.length ? sym.thucthe.join(', ') : '(chưa ghi nhận dấu hiệu nổi bật)'),
      ];
      const ta = baFindTextarea('6.4');
      if (!ta) { setSt('Không thấy ô 6.4'); return; }
      const cur = ta.value.trim();
      if (cur && cur !== baLastSummary && !window.confirm('Ô 6.4 đang có nội dung. Ghi đè?')) { setSt('Đã hủy'); return; }
      const text = lines.join('\n');
      setNativeValue(ta, text);
      baLastSummary = text;
      setSt(prog ? 'Đã tạo xong.' : 'Không đọc được diễn biến lần khám đầu, hãy bổ sung tay.');
    } catch (err) {
      setSt('Lỗi: ' + (err && err.message));
    } finally {
      hidePrintOverlay();
      btn.disabled = false;
      baBusy = false;
    }
  }

  function baEnsureSummaryBar() {
    const ta = baFindTextarea('6.4');
    if (!ta || ta.parentElement.querySelector('.hlx-ba-sum')) return;
    baEnsureCss();
    const bar = document.createElement('div');
    bar.className = 'hlx-ba-bar hlx-ba-sum';
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'hlx-ba-go';
    b.textContent = '✨ Tạo tóm tắt bệnh án';
    const st = document.createElement('span');
    st.className = 'hlx-ba-st';
    b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); baGenerateSummary(b, st); });
    bar.appendChild(b);
    bar.appendChild(st);
    ta.insertAdjacentElement('afterend', bar);
  }

  // ---- 10.2 trích xuất kết quả xét nghiệm ----
  function baResultRoot() {
    const d = Array.from(document.querySelectorAll('app-subclinical-result-detail')).find(hlxIsVisible);
    return d || null;
  }

  function baParseResults() {
    const root = baResultRoot();
    const out = [];
    if (!root) return out;
    let group = '';
    root.querySelectorAll('tbody > tr').forEach((tr) => {
      const tds = tr.querySelectorAll(':scope > td');
      if (tds.length === 2 && tds[1].getAttribute('colspan')) { group = baNorm(tds[1].textContent); return; }
      if (tds.length < 6) return;
      out.push({ group, name: baNorm(tds[2].textContent), unit: baNorm(tds[4].textContent), res: baNorm(tds[5].textContent) });
    });
    return out;
  }

  const baFmt = (it) => it.name + ': ' + it.res + (it.unit ? (/^10\^/.test(it.unit) ? ' x ' : ' ') + it.unit : '');

  function baPickItems(items, key, found) {
    if (found[key].size) return; // chỉ lấy 1 phiếu đại diện (xa nhất) cho mỗi mục
    const add = (k, s) => { if (!found[key].has(k)) found[key].set(k, s); };
    items.forEach((it) => {
      if (!it.res) return;
      const g = it.group.toLowerCase();
      const n = it.name.toLowerCase();
      if (key === 'ctm' && /tế bào máu/.test(g) && /^(wbc|rbc|hct|plt)$/.test(n)) add(n, baFmt(it));
      if (key === 'dgd' && /điện giải/.test(g) && /^(na\+|k\+|cl-)$/.test(n)) add(n, baFmt(it));
      if (key === 'dhmm' && /đường (máu )?mao mạch|đhmm/.test(g + ' ' + n)) add(n, 'ĐHMM: ' + it.res + (it.unit ? ' ' + it.unit : ''));
      if (key === 'ns1' && /ns1/.test(g + ' ' + n)) add(n, 'NS1Ag: ' + it.res);
    });
  }

  // Phiếu CĐHA/siêu âm: lấy phần "Kết luận"
  function baParseConclusion() {
    const root = baResultRoot();
    const el = root && root.querySelector('.diagnose_result_view');
    if (!el) return '';
    const html = el.innerHTML.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n');
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent.split(/\n+/)
      .map((l) => baNorm(l).replace(/^[-•]\s*/, '').replace(/[;.\s]+$/, ''))
      .filter(Boolean).join('; ');
  }

  function baShortService(name) {
    return baNorm(name).replace(/\(PACS\)/i, '').replace(/\[[^\]]*\]/g, '').replace(/\([^)]*\)/g, '')
      .replace(/^chụp\s+xquang/i, 'X-quang').replace(/\s+/g, ' ').trim();
  }

  const baListTime = (tr) => {
    const m = baNorm(tr.children[1] ? tr.children[1].textContent : '').match(/(\d{1,2}):(\d{2})\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    return m ? new Date(+m[5], +m[4] - 1, +m[3], +m[1], +m[2]).getTime() : 0;
  };

  function baFindKqLink() {
    const row = baFindRow('6.4');
    const isLink = (el) => baNorm(Array.from(el.childNodes).filter((x) => x.nodeType === 3).map((x) => x.textContent).join('')) === 'KQ chỉ định';
    let link = row && Array.from(row.querySelectorAll('a, span, b')).find(isLink);
    if (!link) link = Array.from(document.querySelectorAll('a.bolder.pull-left')).find((a) => hlxIsVisible(a) && isLink(a));
    return link || null;
  }

  async function baExtractLabs(wanted, setSt) {
    const found = {};
    wanted.forEach((k) => { found[k] = new Map(); });
    let opened = false;
    if (!baResultRoot()) {
      const link = baFindKqLink();
      if (!link) throw new Error('Không thấy nút "KQ chỉ định" cạnh mục 6.4');
      link.click();
      opened = true;
      if (!(await baWaitFor(() => baResultRoot() && baResultRoot().closest('#subclinical_result') && baResultRoot().closest('#subclinical_result').querySelector('p-table tbody tr.hover'), 6000))) {
        throw new Error('Không mở được bảng KQ chỉ định');
      }
      await baSleep(300);
    }
    const pane = baResultRoot().closest('#subclinical_result') || document;
    const tb = pane.querySelector('p-table tbody');
    const all = tb ? Array.from(tb.querySelectorAll('tr.hover')) : [];
    // xa thời điểm hiện tại nhất trước; cùng giờ thì dòng dưới cùng trước
    const rows = all.map((r, i) => ({ r, i, t: baListTime(r) })).sort((a, b) => (a.t - b.t) || (b.i - a.i)).map((x) => x.r);
    const sig = () => { const r = baResultRoot(); return r ? r.textContent.replace(/\s+/g, ' ').slice(0, 600) : ''; };
    const need = (k) => wanted.indexOf(k) !== -1 && !found[k].size;
    const labKeys = ['ctm', 'dgd', 'dhmm', 'ns1'];
    for (const r of rows) {
      if (!need('ctm') && !need('dgd') && !need('dhmm') && !need('ns1') && !need('sa') && !need('xq')) break;
      if (r.classList.contains('not-completed')) continue;
      const name = r.children[2] ? baNorm(r.children[2].textContent).replace(/\(PACS\)/i, '').trim() : '';
      const isSA = /siêu âm/i.test(name);
      const isXQ = /x-?quang/i.test(name);
      const isLab = !isSA && !isXQ && /xét nghiệm|test|định lượng|đường|điện giải|tổng phân tích|hba1c|calci/i.test(name);
      const labNeeded = labKeys.some(need);
      if (!((isSA && need('sa')) || (isXQ && need('xq')) || (isLab && labNeeded))) continue;
      setSt('Đang đọc: ' + (baShortService(name) || name) + '...');
      const before = sig();
      const selected = r.classList.contains('view-detail');
      (r.children[1] || r).click();
      if (!selected) await baWaitFor(() => sig() !== before, 2500);
      await baSleep(350);
      if (isSA || isXQ) {
        const key = isSA ? 'sa' : 'xq';
        const concl = baParseConclusion();
        if (concl) found[key].set('x', baShortService(name) + ': ' + concl);
      } else {
        const items = baParseResults();
        wanted.forEach((k) => { if (labKeys.indexOf(k) !== -1) baPickItems(items, k, found); });
      }
    }
    if (opened) {
      const dlg = baResultRoot() && baResultRoot().closest('.p-dialog');
      const x = dlg && dlg.querySelector('.p-dialog-header-close');
      if (x) x.click();
    }
    return found;
  }

  function baEnsureExtractBar() {
    const ta = baFindField('10.2');
    if (!ta || ta.parentElement.querySelector('.hlx-ba-ext')) return;
    baEnsureCss();
    const bar = document.createElement('div');
    bar.className = 'hlx-ba-bar hlx-ba-ext';
    const saved = exPrefs().ba102 || ['ctm'];
    BA_102_ITEMS.forEach((it) => {
      const lb = document.createElement('label');
      lb.className = 'hlx-ba-chk';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = it[0];
      cb.checked = saved.indexOf(it[0]) !== -1;
      cb.addEventListener('change', () => {
        exPrefSet('ba102', Array.from(bar.querySelectorAll('input:checked')).map((x) => x.value));
      });
      lb.appendChild(cb);
      lb.appendChild(document.createTextNode(it[1]));
      bar.appendChild(lb);
    });
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'hlx-ba-go';
    b.textContent = '⤓ Trích xuất';
    const st = document.createElement('span');
    st.className = 'hlx-ba-st';
    b.addEventListener('click', async (e) => {
      e.preventDefault(); e.stopPropagation();
      if (baBusy) return;
      const wanted = Array.from(bar.querySelectorAll('input:checked')).map((x) => x.value);
      if (!wanted.length) { st.textContent = 'Hãy tích chọn mục cần lấy.'; return; }
      baBusy = true;
      b.disabled = true;
      showPrintOverlay('Đang trích xuất kết quả, vui lòng chờ...');
      try {
        const found = await baExtractLabs(wanted, (t) => { st.textContent = t; });
        const labs = [];
        const extra = [];
        wanted.forEach((k) => {
          const vals = Array.from(found[k].values());
          if (k === 'sa' || k === 'xq') extra.push(...vals); else labs.push(...vals);
        });
        const text = [labs.join(', ')].concat(extra).filter(Boolean).join('\n');
        const f = baFindField('10.2');
        if (!text) { st.textContent = 'Không tìm thấy kết quả phù hợp.'; }
        else if (f) {
          const cur = f.value.trim();
          if (!cur || cur === baLast102 || window.confirm('Ô 10.2 đang có nội dung. Ghi đè?')) {
            setNativeValue(f, text);
            baLast102 = text;
            st.textContent = 'Đã trích xuất.';
          } else st.textContent = 'Đã hủy.';
        }
      } catch (err) {
        st.textContent = 'Lỗi: ' + (err && err.message);
      } finally {
        hidePrintOverlay();
        b.disabled = false;
        baBusy = false;
      }
    });
    bar.appendChild(b);
    bar.appendChild(st);
    ta.insertAdjacentElement('afterend', bar);
  }

  function baExtraTick(key, done) {
    // 8. Tiên lượng
    baEnsureOptions('8', 'hlx-ba-tl', ['Tốt', 'Khá', 'Trung bình', 'Nặng'], 'Trung bình', done);
    // 9. Hướng dẫn điều trị: copy từ tab Nhập khoa (1 lần)
    const t9 = baFindField('9');
    if (t9 && !done.has('9')) {
      if (t9.value.trim()) done.add('9');
      else {
        let src = null;
        for (const lbl of ['Hướng dẫn điều trị', 'Hướng điều trị']) {
          const spans = document.querySelectorAll('docx-label span[title]');
          for (const sp of spans) {
            if ((sp.getAttribute('title') || '').trim() !== lbl) continue;
            const row = sp.closest('.ui-form-group');
            const el = row && (row.querySelector('docx-control textarea') || row.querySelector('docx-control input[type="text"]'));
            if (el && el !== t9 && (el.value || '').trim()) { src = el; break; }
          }
          if (src) break;
        }
        if (src) { setNativeValue(t9, src.value.trim()); done.add('9'); }
      }
    }
    // 10.1 <-> 5.1 đồng bộ 2 chiều
    const a = baFindTextarea('5.1');
    const b = baFindField('10.1');
    if (a && b) {
      const st = baSyncSt[key] || (baSyncSt[key] = { a: null, b: null });
      ipdSyncPair(st, a, b);
    }
    baEnsureSummaryBar();
    baEnsureExtractBar();
    baEnsureOptions('10.3', 'hlx-ba-pp', ['Nội khoa', 'Ngoại khoa', 'Sản khoa'], 'Nội khoa', done);
    baEnsureOptions('10.4', 'hlx-ba-tt', ['Khỏe', 'Tạm ổn'], 'Tạm ổn', done);
    const f105 = baFindField('10.5');
    if (f105 && !done.has('10.5')) {
      if (!f105.value.trim()) setNativeValue(f105, 'Xuất viện, toa về');
      done.add('10.5');
    }
    // 10.12 = tổng 10.6..10.11
    const total = baFindField('10.12');
    if (total) {
      total.readOnly = true;
      total.tabIndex = -1;
      total.style.backgroundColor = '#eceff3';
      total.style.cursor = 'not-allowed';
      let s = 0;
      let any = false;
      ['10.6', '10.7', '10.8', '10.9', '10.10', '10.11'].forEach((id) => {
        const f = baFindField(id);
        if (!f) return;
        const n = parseInt(String(f.value || '').replace(/\D/g, ''), 10);
        if (!isNaN(n)) { s += n; any = true; }
      });
      const want = any ? String(s) : '';
      if ((any || total.dataset.hlxSum) && total.value !== want) setNativeValue(total, want);
      if (any) total.dataset.hlxSum = '1'; else delete total.dataset.hlxSum;
    }
  }

  function ipdTick() {
    if (!ipdIsPage()) return;
    if (!isHelixfastEnabled()) {
      document.querySelectorAll('.hlx-opt-box, .hlx-ex-panel').forEach((b) => b.remove());
      return;
    }
    ipdSyncTick();
    ipdEnsureHuongBox();
    ipdEnsureClsBox();
    exEnsurePanel('tt');
    exEnsurePanel('bp');
    if (!emergIsPage()) {
      ipdTreatmentProgTick();
      ipdBenhAnTick();
    }
  }

  if (!HLX_OFF) {
    setInterval(() => { try { ipdTick(); } catch (err) {} }, 300);
  }

  hlxDocListen(
    'input',
    (e) => {
      if (!e.isTrusted) return;
      if (!isHelixfastEnabled() || !ipdIsPage()) return;
      const t = e.target;
      if (!t || t.tagName !== 'TEXTAREA' || !t.matches(SYMPTOM_SELECTOR)) return;
      if (!(t.value || '').trim()) return;
      setTimeout(ipdApplyOnSymptom, 0);
    },
    true
  );

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

    let rxLi = document.getElementById(BSDHA_RX_LI_ID);
    if (!rxLi) rxLi = createBsdhaRxLi(settingsLi);
    if (li.previousElementSibling !== rxLi) {
      li.insertAdjacentElement('beforebegin', rxLi);
    }
  }

  const observer = new MutationObserver(() => {
    if (mainObserverDebounceTimer) return;
    mainObserverDebounceTimer = setTimeout(() => {
      mainObserverDebounceTimer = null;
      hlxMainTick();
    }, 200);
  });

  function hlxSafe(fn) { try { fn(); } catch (err) {  } }

  const HLX_TAB_SEL = 'ul.nav-tabs.fixed_clinic_2';
  let hlxTabUl = null;
  let hlxTabPh = null;
  let hlxTabStuck = false;
  let hlxTabBaseTop = null;
  let hlxTabOffsetCache = null;

  function hlxTabHeaderBottom() {

    try {
      const btn = Array.from(document.querySelectorAll('button')).find(
        (b) => /Lưu lại/.test(b.textContent || '') && b.offsetParent !== null
      );
      let n = btn;
      for (let i = 0; n && n !== document.body && i < 12; i++, n = n.parentElement) {
        const pos = getComputedStyle(n).position;
        if (pos === 'fixed' || pos === 'sticky') {
          const r = n.getBoundingClientRect();
          if (r.height > 0) { hlxTabOffsetCache = Math.round(r.bottom); return hlxTabOffsetCache; }
        }
      }
    } catch (err) {  }
    if (hlxTabOffsetCache !== null) return hlxTabOffsetCache;
    return hlxTabBaseTop !== null ? hlxTabBaseTop : 0;
  }

  function hlxTabUnstick() {
    if (!hlxTabUl) return;
    hlxTabUl.style.position = '';
    hlxTabUl.style.top = '';
    hlxTabUl.style.left = '';
    hlxTabUl.style.width = '';
    hlxTabUl.style.zIndex = '';
    hlxTabUl.style.background = '';
    if (hlxTabPh) hlxTabPh.style.display = 'none';
    hlxTabStuck = false;
  }

  function hlxTabUpdate() {
    const ul = hlxTabUl;
    if (!ul || !ul.isConnected || !hlxIsVisible(ul)) return;
    const off = hlxTabHeaderBottom();
    const ref = hlxTabStuck ? hlxTabPh.getBoundingClientRect() : ul.getBoundingClientRect();
    if (!hlxTabStuck) {
      if (ref.top < off) {
        hlxTabPh.style.height = ul.offsetHeight + 'px';
        hlxTabPh.style.display = 'block';
        ul.style.position = 'fixed';
        ul.style.top = off + 'px';
        ul.style.left = ref.left + 'px';
        ul.style.width = ref.width + 'px';
        ul.style.zIndex = '1029';
        ul.style.background = '#fff';
        hlxTabStuck = true;
      }
    } else if (ref.top >= off) {
      hlxTabUnstick();
    } else {
      ul.style.top = off + 'px';
      ul.style.left = ref.left + 'px';
      ul.style.width = ref.width + 'px';
    }
  }

  function hlxScrollToTop() {
    try { window.scrollTo(0, 0); } catch (err) {}
    try {
      const se = document.scrollingElement;
      if (se) se.scrollTop = 0;
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    } catch (err) {}
    const start = hlxTabUl || document.querySelector(HLX_TAB_SEL) || document.querySelector('#opd_visit_list');
    for (let n = start && start.parentElement; n && n !== document.body; n = n.parentElement) {
      if (n.scrollTop > 0) n.scrollTop = 0;
    }
    hlxSafe(hlxTabUpdate);
  }
  hlxDocListen('click', function (e) {
    if (!isHelixfastEnabled()) return;
    const a = e.target && e.target.closest ? e.target.closest('a[data-toggle="tab"][href="#opd_visit_list"]') : null;
    if (!a) return;

    hlxScrollToTop();
    setTimeout(hlxScrollToTop, 80);
    setTimeout(hlxScrollToTop, 300);
  }, true);

  function hlxTabStickInit() {
    const ul = document.querySelector(HLX_TAB_SEL);
    if (!ul) return;
    if (ul === hlxTabUl && hlxTabPh && hlxTabPh.isConnected) return;
    hlxTabUl = ul;
    hlxTabStuck = false;
    hlxTabBaseTop = Math.round(ul.getBoundingClientRect().top);
    hlxTabPh = document.createElement('div');
    hlxTabPh.style.display = 'none';
    hlxTabPh.className = 'hlx-tab-placeholder';
    ul.parentNode.insertBefore(hlxTabPh, ul);
    if (!window.__hlxTabBound) {
      window.__hlxTabBound = true;
      window.addEventListener('scroll', () => hlxSafe(hlxTabUpdate), true);
      window.addEventListener('resize', () => hlxSafe(hlxTabUpdate));
    }
    hlxTabUpdate();
  }

  function hlxMainTick() {
    hlxSafe(ensureHelixfastToggleButton);
    let enabled = false;
    hlxSafe(() => { enabled = isHelixfastEnabled(); });
    if (!enabled) return;
    hlxSafe(bindSymptomEl);
    hlxSafe(scanForTreatmentTextareas);
    hlxSafe(() => {
      if (paginatorAutoSet && !document.querySelector('.p-paginator-rpp-options')) {
        paginatorAutoSet = false;
      }
      if (!paginatorAutoSet) trySetPaginatorTo100();
    });
    hlxSafe(tryCheckCompletedCheckbox);
    hlxSafe(ensureCustomPrintButtonsPlacement);
    hlxSafe(autoFocusSymptomFieldIfNew);
    hlxSafe(setupRxReorder);
    hlxSafe(hlxTabStickInit);
  }

  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.__hlxIsEnabled = hlxBaseEnabled;

  hlxSafe(ensureHelixfastToggleButton);
  hlxSafe(() => {
    if (!isHelixfastEnabled()) return;
    hlxSafe(bindSymptomEl);
    hlxSafe(scanForTreatmentTextareas);
    hlxSafe(trySetPaginatorTo100);
    hlxSafe(tryCheckCompletedCheckbox);
    hlxSafe(ensureCustomPrintButtonsPlacement);
    hlxSafe(focusSymptomFieldOnly);
    hlxSafe(autoFocusSymptomFieldIfNew);
    hlxSafe(setupRxReorder);
  });

  setInterval(() => { hlxSafe(ensureHelixfastToggleButton); }, 1500);
  // Tự kiểm tra bản mới: sau khi tải trang và mỗi 6 giờ
  setTimeout(() => { hlxCheckUpdate(); }, 4000);
  setInterval(() => { hlxCheckUpdate(); }, 6 * 3600 * 1000);

  document.addEventListener('visibilitychange', () => { if (!document.hidden) hlxMainTick(); });
  window.addEventListener('pageshow', () => hlxMainTick());
  window.addEventListener('load', () => setTimeout(hlxMainTick, 300));

  // ===== Chọn phòng nhanh + ghim phòng mặc định + tự bấm Tìm kiếm (danh sách thăm khám) =====
  (function hlxRoomModule() {
    if (HLX_OFF) return;
    const K_ON = 'helixfast_room_on_v1', K_DEF = 'helixfast_room_def_v1';
    const QUICK = ['5', '6', '7'];
    const HOST_SEL = 'ng-selectize[formcontrolname="area_id"]';
    let busy = false, autoDone = false, hostSince = 0, lastSeen = null, searchT = null;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const nz = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd')
      .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\b0+(\d)/g, '$1');
    const isOn = () => hlxStoreGet(K_ON) === '1';
    function getDef() { try { const v = JSON.parse(hlxStoreGet(K_DEF) || 'null'); return v && v.n ? v : null; } catch (err) { return null; } }
    function setDef(v) { try { hlxStoreSet(K_DEF, JSON.stringify(v || null)); } catch (err) {} }
    function curName(host) {
      const sp = host.querySelector('.selectize-input > span[data-value]');
      if (!sp) return '';
      const dv = sp.querySelector('div');
      return ((dv || sp).textContent || '').replace(/×/g, '').replace(/\s+/g, ' ').trim();
    }
    function ddOf(host) {
      let dd = host.querySelector('.selectize-dropdown');
      if (dd && dd.querySelector('.option')) return dd;
      dd = Array.from(document.querySelectorAll('.selectize-dropdown')).find((x) => x.querySelector('.option') && x.offsetParent !== null);
      return dd || null;
    }
    function optionsOf(host) {
      const dd = ddOf(host);
      return dd ? Array.from(dd.querySelectorAll('.option')) : [];
    }
    // Ưu tiên gọi thẳng API selectize (nếu truy cập được), không được thì mô phỏng bấm chuột
    function selApi(host) {
      try {
        const sel = host.querySelector('select');
        if (!sel) return null;
        let inst = sel.selectize;
        if (!inst) {
          const u = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
          const $ = u.jQuery || u.$;
          if ($) { const e = $(sel)[0]; inst = e && e.selectize; }
        }
        return inst && inst.options ? inst : null;
      } catch (err) { return null; }
    }
    function apiOptions(inst) {
      const lf = (inst.settings && inst.settings.labelField) || 'text';
      const vf = (inst.settings && inst.settings.valueField) || 'value';
      return Object.keys(inst.options).map((k) => ({ id: inst.options[k][vf] !== undefined ? inst.options[k][vf] : k, text: String(inst.options[k][lf] || '') }));
    }
    const mev = (el, t) => el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }));
    async function openDd(host) {
      const ctl = host.querySelector('.selectize-input');
      if (!ctl) return [];
      mev(ctl, 'mousedown');
      try { const i = ctl.querySelector('input'); if (i) i.focus(); } catch (err) {}
      for (let i = 0; i < 25; i++) {
        const o = optionsOf(host);
        if (o.length) return o;
        await sleep(100);
      }
      return [];
    }
    function closeDd(host) {
      try { const i = host.querySelector('.selectize-input input'); if (i) i.blur(); } catch (err) {}
    }
    // Chọn phòng theo TÊN ĐẦY ĐỦ (so khớp chính xác, bỏ qua số 0 đứng đầu: "Phòng 5" = "Phòng 05")
    async function selectRoom(host, targetNorm) {
      if (busy) return false;
      busy = true; paintBusy(true);
      try {
        if (nz(curName(host)) === targetNorm) return true;
        const inst = selApi(host);
        if (inst) {
          const ah = apiOptions(inst).find((o) => nz(o.text) === targetNorm);
          if (ah) {
            try { inst.setValue(ah.id); } catch (err) {}
            for (let i = 0; i < 15; i++) { await sleep(100); if (nz(curName(host)) === targetNorm) return true; }
          }
        }
        const opts = await openDd(host);
        const hit = opts.find((o) => nz(o.textContent) === targetNorm);
        if (!hit) {
          try { console.log('[Helixfast] Chọn phòng: không tìm thấy', targetNorm, 'trong', opts.map((o) => o.textContent.trim())); } catch (err) {}
          closeDd(host); return false;
        }
        mev(hit, 'mousedown'); mev(hit, 'click');
        for (let i = 0; i < 20; i++) {
          await sleep(100);
          if (nz(curName(host)) === targetNorm) return true;
        }
        closeDd(host);
        return false;
      } finally {
        busy = false; paintBusy(false);
        try { const hh = document.querySelector(HOST_SEL); if (hh) lastSeen = nz(curName(hh)); } catch (err) {}
      }
    }
    function doSearch(host) {
      try {
        const f = host.closest('form');
        const b = f && f.querySelector('button[type="submit"]');
        if (b) b.click();
      } catch (err) {}
    }
    function paintBusy(b) {
      const bar = document.getElementById('hlx-room-bar');
      if (bar) bar.classList.toggle('busy', !!b);
    }

    // Danh sách phòng có thể được gắn ngoài khung ng-selectize → nhận diện (theo class hoặc theo nội dung chữ) rồi kéo dài tới đáy màn hình
    let lastOpen = 0;
    const ddLogged = new WeakSet();
    const visible = (el) => !!(el && el.getClientRects && el.getClientRects().length);
    function fitDd(dd) {
      try {
        // Tính chiều cao MỘT LẦN mỗi lần mở: từ đỉnh dropdown đến gần cạnh dưới màn hình
        let h = +dd.getAttribute('data-hlx-h') || 0;
        if (!h) {
          const top = dd.getBoundingClientRect().top;
          if (top > 0 && top < window.innerHeight - 150) {
            h = Math.max(160, Math.floor(window.innerHeight - top - 16));
            dd.setAttribute('data-hlx-h', String(h));
          } else {
            h = Math.floor(window.innerHeight * 0.6);
          }
        }
        // Giới hạn + thanh trượt đặt trên chính khung dropdown
        dd.style.setProperty('max-height', h + 'px', 'important');
        dd.style.setProperty('overflow-y', 'auto', 'important');
        dd.style.setProperty('overflow-x', 'hidden', 'important');
        dd.style.setProperty('overscroll-behavior', 'contain', 'important');
        // Phần bên trong để giãn tự nhiên, tránh 2 thanh trượt lồng nhau
        dd.querySelectorAll('.selectize-dropdown-content, [data-hlx-scroll]').forEach((c) => {
          c.style.setProperty('max-height', 'none', 'important');
          c.style.setProperty('overflow', 'visible', 'important');
        });
        // Lăn chuột chỉ cuộn trong danh sách, không cuộn trang
        if (!dd._hlxWheel) {
          dd._hlxWheel = 1;
          dd.addEventListener('wheel', (e) => {
            const atTop = dd.scrollTop <= 0 && e.deltaY < 0;
            const atBot = dd.scrollTop + dd.clientHeight >= dd.scrollHeight - 1 && e.deltaY > 0;
            e.stopPropagation();
            if (atTop || atBot) e.preventDefault();
          }, { passive: false });
        }
      } catch (err) {}
    }
    function resetDdH() { document.querySelectorAll('[data-hlx-h]').forEach((x) => x.removeAttribute('data-hlx-h')); }
    function isRoomDd(dd) {
      const os = Array.from(dd.querySelectorAll('.option'));
      if (!os.length) return false;
      if (dd.closest && dd.closest(HOST_SEL)) return true;
      const h = document.querySelector(HOST_SEL);
      if (h && visible(dd) && h.querySelector('.dropdown-active, .focus')) return true;
      return os.some((o) => /^phong \d/.test(nz(o.textContent)));
    }
    // Không phụ thuộc class: tìm khối đang hiển thị chứa >=3 dòng chữ "Phòng + số" (ngoài bảng dữ liệu, ngoài ô chọn)
    function findRoomListByText() {
      const host = document.querySelector(HOST_SEL);
      const cnt = new Map();
      document.querySelectorAll('div,li,span,a,p').forEach((el) => {
        if (el.firstElementChild) return;
        const tx = el.textContent || '';
        if (tx.length > 80 || !/^phong \d/.test(nz(tx))) return;
        if (el.closest('table,td,th,tr,.p-datatable,#hlx-room-bar,.hlx-ddi-panel,#hlx-ddi-panel')) return;
        if (host && host.contains(el)) return;
        if (!visible(el)) return;
        const p = el.parentElement;
        if (p) cnt.set(p, (cnt.get(p) || 0) + 1);
      });
      let best = null, bn = 2;
      cnt.forEach((n, p) => { if (n > bn) { bn = n; best = p; } });
      return best;
    }
    function applyDd(dd, why) {
      dd.classList.add('hlx-room-dd');
      if (!ddLogged.has(dd)) {
        ddLogged.add(dd);
        try {
          const chain = []; let x = dd;
          for (let i = 0; i < 4 && x; i++, x = x.parentElement) chain.push(x.tagName.toLowerCase() + (x.className ? '.' + String(x.className).trim().split(/\s+/).join('.') : ''));
          console.log('[Helixfast] Danh sách phòng (' + why + '):', chain.join(' < '));
        } catch (err) {}
      }
      fitDd(dd);
      setTimeout(() => fitDd(dd), 60);
      setTimeout(() => fitDd(dd), 250);
    }
    function markDd() {
      let found = false;
      document.querySelectorAll('.selectize-dropdown').forEach((dd) => {
        if (!isRoomDd(dd)) return;
        applyDd(dd, 'class'); found = true;
      });
      if (found) return;
      const open = Date.now() - lastOpen < 2500;
      const marked = Array.from(document.querySelectorAll('.hlx-room-dd')).filter(visible);
      if (marked.length) { marked.forEach(fitDd); return; }
      if (!open) return;
      const c = findRoomListByText();
      if (!c) return;
      c.setAttribute('data-hlx-scroll', '1');
      const wrap = (c.closest && c.closest('.selectize-dropdown')) || c.parentElement || c;
      applyDd(wrap, 'text');
    }
    function css() {
      if (document.getElementById('hlx-room-css')) return;
      const st = document.createElement('style');
      st.id = 'hlx-room-css';
      st.textContent = `
        #hlx-room-bar { position:absolute; left:100%; top:0; bottom:0; display:flex; align-items:center; gap:4px; padding-left:6px; white-space:nowrap; z-index:5; }
        #hlx-room-bar.busy { opacity:.6; pointer-events:none; }
        #hlx-room-bar .tg { position:relative; flex:none; width:26px; height:14px; border-radius:7px; background:#94a3b8; cursor:pointer; transition:background .15s; margin-right:2px; }
        #hlx-room-bar .tg::after { content:''; position:absolute; top:2px; left:2px; width:10px; height:10px; border-radius:50%; background:#fff; transition:left .15s; }
        #hlx-room-bar .tg.on { background:#16a34a; }
        #hlx-room-bar .tg.on::after { left:14px; }
        #hlx-room-bar .q { width:24px; height:24px; padding:0; border-radius:50%; border:1px solid #1e3a8a; background:#fff; color:#1e3a8a; font-weight:700; font-size:11px; cursor:pointer; line-height:1; }
        #hlx-room-bar .q:hover { background:#eff6ff; }
        #hlx-room-bar .q.on { background:#1e3a8a; color:#fff; }
        #hlx-room-bar .q.bad { border-color:#dc2626; color:#dc2626; }
        .selectize-dropdown.hlx-room-dd { width:auto !important; min-width:380px; z-index:100000; white-space:nowrap; box-shadow:0 8px 24px rgba(0,0,0,.25); }
        .selectize-dropdown.hlx-room-dd .option { white-space:nowrap; padding:7px 12px; font-size:14px; border-bottom:1px solid #f1f5f9; }
      `;
      document.head.appendChild(st);
    }

    function build(host) {
      css();
      const old = document.getElementById('hlx-room-bar');
      if (old) old.remove();
      const col = host.parentElement;
      if (col) col.style.position = 'relative';
      const bar = document.createElement('div');
      bar.id = 'hlx-room-bar';
      const tg = document.createElement('span');
      tg.className = 'tg';
      tg.addEventListener('click', () => {
        if (isOn()) {
          try { hlxStoreSet(K_ON, '0'); } catch (err) {}
        } else {
          const c = curName(host);
          if (!c) return;
          setDef({ n: nz(c), t: c });
          try { hlxStoreSet(K_ON, '1'); } catch (err) {}
        }
        refresh(host);
      });
      bar.appendChild(tg);
      QUICK.forEach((n) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'q'; b.textContent = '0' + n; b.title = 'Chọn nhanh Phòng 0' + n + ' và tìm kiếm'; b.dataset.n = n;
        b.addEventListener('click', async (e) => {
          e.preventDefault(); e.stopPropagation();
          const ok = await selectRoom(host, 'phong ' + n);
          if (ok) { await sleep(400); doSearch(host); }
          else { b.classList.add('bad'); setTimeout(() => b.classList.remove('bad'), 1500); }
          refresh(host);
        });
        bar.appendChild(b);
      });
      host.insertAdjacentElement('afterend', bar);
      return bar;
    }

    function refresh(host) {
      const bar = document.getElementById('hlx-room-bar');
      if (!bar) return;
      const tg = bar.querySelector('.tg');
      const def = getDef();
      tg.classList.toggle('on', isOn());
      tg.title = isOn() && def
        ? 'Đang ghim: ' + def.t + '. F5 sẽ tự chọn phòng này và bấm Tìm kiếm. Bấm để tắt (bật lại sẽ ghim phòng đang chọn).'
        : 'Bật để ghim phòng đang chọn làm mặc định: F5 sẽ tự chọn phòng đó và bấm Tìm kiếm.';
      const cn = nz(curName(host));
      bar.querySelectorAll('.q').forEach((b) => b.classList.toggle('on', cn === 'phong ' + b.dataset.n));
    }

    async function startup(host) {
      const def = getDef();
      if (!(isOn() && def)) return;
      for (let i = 0; i < 3; i++) {
        if (!document.body.contains(host)) return;
        if (await selectRoom(host, def.n)) { await sleep(400); doSearch(host); refresh(host); return; }
        await sleep(1500);
      }
    }

    function tick() {
      let host = null, enabled = false;
      try { host = document.querySelector(HOST_SEL); enabled = isHelixfastEnabled(); } catch (err) {}
      const bar = document.getElementById('hlx-room-bar');
      if (!host || !enabled) { if (bar) bar.remove(); hostSince = 0; return; }
      if (!hostSince) hostSince = Date.now();
      if (!bar || bar.previousElementSibling !== host) build(host);
      if (!busy) refresh(host);
      if (!autoDone && !busy && Date.now() - hostSince > 900) {
        autoDone = true;
        if (isOn() && getDef()) startup(host); // ghim phòng: tự chọn phòng rồi tìm
        else doSearch(host);                   // không ghim: tìm luôn với phòng đang chọn
      }
    }
    setInterval(() => { try { tick(); } catch (err) {} }, 800);
    // Tự bấm Tìm kiếm mỗi khi người dùng tự chọn phòng khác trong dropdown (không phụ thuộc công tắc ghim)
    setInterval(() => {
      try {
        const host = document.querySelector(HOST_SEL);
        if (!host || !isHelixfastEnabled()) { lastSeen = null; return; }
        const cur = nz(curName(host));
        if (busy) return; // luồng chọn nhanh/ghim tự xử lý tìm kiếm
        if (lastSeen === null) { lastSeen = cur; return; }
        if (cur === lastSeen) return;
        lastSeen = cur;
        if (!cur) return; // bấm xóa (×) thì không tìm
        clearTimeout(searchT);
        searchT = setTimeout(() => {
          try {
            const h = document.querySelector(HOST_SEL);
            if (h && !busy && nz(curName(h)) === cur) doSearch(h);
          } catch (err) {}
        }, 400);
      } catch (err) {}
    }, 250);
    let mdT = null;
    new MutationObserver(() => { if (mdT) return; mdT = requestAnimationFrame(() => { mdT = null; try { markDd(); } catch (err) {} }); })
      .observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
    window.addEventListener('resize', () => { try { resetDdH(); markDd(); } catch (err) {} });
    document.addEventListener('mousedown', (e) => { try { if (e.target && e.target.closest && e.target.closest(HOST_SEL)) { lastOpen = Date.now(); resetDdH(); setTimeout(markDd, 120); setTimeout(markDd, 400); } } catch (err) {} }, true);
    try { console.log('[Helixfast] Chọn phòng nhanh: sẵn sàng'); } catch (err) {}
  })();

  (function hlxDdiModule() {
  if (HLX_OFF) return;
// ===== Kiểm tra tương tác thuốc: LÕI DỮ LIỆU (không đụng DOM) =====
  /*DDI_CORE_START*/
  const HLX_DDI_LV = {
    contra: { r: 4, t: 'Chống chỉ định', ic: '⛔' },
    major: { r: 3, t: 'Quan trọng', ic: '🔴' },
    moderate: { r: 2, t: 'Vừa', ic: '🟠' },
    minor: { r: 1, t: 'Lưu ý', ic: '🟡' }
  };
  // id: [Tên hiển thị, nhóm (tag) cách nhau bởi dấu cách, tên gốc/biệt dược cách nhau bởi |]
  const HLX_DDI_ING = {
    losartan: ['Losartan', 'arb raas', 'losartan|cozaar|hyzaar'],
    valsartan: ['Valsartan', 'arb raas', 'valsartan|diovan'],
    irbesartan: ['Irbesartan', 'arb raas', 'irbesartan|aprovel|coaprovel'],
    telmisartan: ['Telmisartan', 'arb raas', 'telmisartan|micardis'],
    candesartan: ['Candesartan', 'arb raas', 'candesartan|atacand'],
    olmesartan: ['Olmesartan', 'arb raas', 'olmesartan|olmetec'],
    perindopril: ['Perindopril', 'acei raas', 'perindopril|coversyl|prestarium'],
    enalapril: ['Enalapril', 'acei raas', 'enalapril|renitec'],
    lisinopril: ['Lisinopril', 'acei raas', 'lisinopril|zestril'],
    captopril: ['Captopril', 'acei raas', 'captopril'],
    ramipril: ['Ramipril', 'acei raas', 'ramipril|tritace'],
    imidapril: ['Imidapril', 'acei raas', 'imidapril|tanatril'],
    meloxicam: ['Meloxicam', 'nsaid', 'meloxicam|mobic|coxnis'],
    ibuprofen: ['Ibuprofen', 'nsaid', 'ibuprofen|brufen|nurofen'],
    diclofenac: ['Diclofenac', 'nsaid', 'diclofenac|voltaren'],
    naproxen: ['Naproxen', 'nsaid', 'naproxen|apranax'],
    celecoxib: ['Celecoxib', 'nsaid', 'celecoxib|celebrex'],
    etoricoxib: ['Etoricoxib', 'nsaid', 'etoricoxib|arcoxia'],
    piroxicam: ['Piroxicam', 'nsaid', 'piroxicam|feldene'],
    ketorolac: ['Ketorolac', 'nsaid', 'ketorolac|toradol'],
    indomethacin: ['Indomethacin', 'nsaid', 'indomethacin|indometacin'],
    aceclofenac: ['Aceclofenac', 'nsaid', 'aceclofenac|airtal'],
    nimesulide: ['Nimesulid', 'nsaid', 'nimesulid'],
    aspirin: ['Aspirin', 'antiplatelet', 'aspirin|aspilets|cardiopirin|astrapirin'],
    clopidogrel: ['Clopidogrel', 'antiplatelet', 'clopidogrel|plavix|tunadimet'],
    ticagrelor: ['Ticagrelor', 'antiplatelet', 'ticagrelor|brilinta'],
    prasugrel: ['Prasugrel', 'antiplatelet', 'prasugrel|effient'],
    warfarin: ['Warfarin', 'anticoag', 'warfarin|coumadin'],
    rivaroxaban: ['Rivaroxaban', 'anticoag doac', 'rivaroxaban|xarelto'],
    apixaban: ['Apixaban', 'anticoag doac', 'apixaban|eliquis'],
    dabigatran: ['Dabigatran', 'anticoag doac', 'dabigatran|pradaxa'],
    omeprazole: ['Omeprazol', 'ppi', 'omeprazol|losec|kagasdine'],
    esomeprazole: ['Esomeprazol', 'ppi', 'esomeprazol|nexium'],
    lansoprazole: ['Lansoprazol', 'ppi', 'lansoprazol|lanzor'],
    pantoprazole: ['Pantoprazol', 'ppi', 'pantoprazol|pantoloc'],
    rabeprazole: ['Rabeprazol', 'ppi', 'rabeprazol|pariet'],
    gliclazide: ['Gliclazid', 'sulfonylurea', 'gliclazid|diamicron|pyme diapro|predian'],
    glimepiride: ['Glimepirid', 'sulfonylurea', 'glimepirid|amaryl'],
    glibenclamide: ['Glibenclamid', 'sulfonylurea', 'glibenclamid|daonil'],
    metformin: ['Metformin', '', 'metformin|glucophage|panfor|stadovas'],
    insulin: ['Insulin', '', 'insulin|mixtard|lantus|novorapid'],
    fenofibrate: ['Fenofibrat', 'fibrate', 'fenofibrat|lipanthyl|tricor'],
    gemfibrozil: ['Gemfibrozil', 'fibrate', 'gemfibrozil|lopid'],
    atorvastatin: ['Atorvastatin', 'statin', 'atorvastatin|lipitor'],
    rosuvastatin: ['Rosuvastatin', 'statin', 'rosuvastatin|crestor'],
    simvastatin: ['Simvastatin', 'statin', 'simvastatin|zocor'],
    lovastatin: ['Lovastatin', 'statin', 'lovastatin'],
    pravastatin: ['Pravastatin', 'statin', 'pravastatin'],
    tramadol: ['Tramadol', 'serotonergic opioid', 'tramadol|dinalvic|ultracet'],
    paracetamol: ['Paracetamol', '', 'paracetamol|acetaminophen|panadol|efferalgan|hapacol|dinalvic|ultracet'],
    trimetazidine: ['Trimetazidin', '', 'trimetazidin|vastarel|vaspycar'],
    magnesium: ['Magnesi', 'chelator', 'magnesi|magne|mazzgin'],
    calcium: ['Calci', 'chelator', 'calcium|calci carbonat'],
    iron: ['Sắt', 'chelator', 'sat fumarat|sat sulfat|ferrous|tardyferon|ferrovit'],
    aluminium: ['Nhôm hydroxid (antacid)', 'chelator', 'aluminium|nhom hydroxid|maalox|phosphalugel|almagate'],
    nitrate: ['Nitrat', 'nitrate', 'isosorbid|nitroglycerin|nitromint|imdur|nitrostad'],
    sildenafil: ['Sildenafil', 'pde5', 'sildenafil|viagra'],
    tadalafil: ['Tadalafil', 'pde5', 'tadalafil|cialis'],
    vardenafil: ['Vardenafil', 'pde5', 'vardenafil|levitra'],
    moclobemide: ['Moclobemid', 'maoi', 'moclobemid|aurorix'],
    selegiline: ['Selegilin', 'maoi', 'selegilin'],
    fluoxetine: ['Fluoxetin', 'ssri serotonergic', 'fluoxetin|prozac'],
    sertraline: ['Sertralin', 'ssri serotonergic', 'sertralin|zoloft'],
    paroxetine: ['Paroxetin', 'ssri serotonergic', 'paroxetin|paxil'],
    citalopram: ['Citalopram', 'ssri serotonergic', 'citalopram'],
    escitalopram: ['Escitalopram', 'ssri serotonergic', 'escitalopram|lexapro'],
    fluvoxamine: ['Fluvoxamin', 'ssri serotonergic', 'fluvoxamin'],
    clarithromycin: ['Clarithromycin', 'macrolide', 'clarithromycin|klacid'],
    erythromycin: ['Erythromycin', 'macrolide', 'erythromycin'],
    ketoconazole: ['Ketoconazol', 'azole', 'ketoconazol|nizoral'],
    itraconazole: ['Itraconazol', 'azole', 'itraconazol|sporanox'],
    fluconazole: ['Fluconazol', 'azole', 'fluconazol|diflucan'],
    ciprofloxacin: ['Ciprofloxacin', 'quinolone', 'ciprofloxacin|ciprobay'],
    levofloxacin: ['Levofloxacin', 'quinolone', 'levofloxacin|tavanic'],
    moxifloxacin: ['Moxifloxacin', 'quinolone', 'moxifloxacin|avelox'],
    cotrimoxazole: ['Co-trimoxazol', '', 'co trimoxazol|cotrimoxazol|sulfamethoxazol|bactrim|biseptol|septrin'],
    metronidazole: ['Metronidazol', '', 'metronidazol|flagyl'],
    methotrexate: ['Methotrexat', '', 'methotrexat'],
    digoxin: ['Digoxin', '', 'digoxin|lanoxin'],
    amiodarone: ['Amiodaron', '', 'amiodaron|cordarone'],
    verapamil: ['Verapamil', 'ndhp', 'verapamil|isoptin'],
    amlodipine: ['Amlodipin', '', 'amlodipin|amlor|norvasc'],
    allopurinol: ['Allopurinol', '', 'allopurinol|zyloric'],
    azathioprine: ['Azathioprin', '', 'azathioprin|imuran'],
    theophylline: ['Theophyllin', '', 'theophyllin|theostat'],
    tizanidine: ['Tizanidin', '', 'tizanidin|sirdalud'],
    ergotamine: ['Ergotamin', '', 'ergotamin|dihydroergotamin'],
    lithium: ['Lithi', '', 'lithi|lithium'],
    spironolactone: ['Spironolacton', 'kspare', 'spironolacton|aldactone'],
    potassium: ['Kali clorid', 'kspare', 'kali clorid|kcl|potassium'],
    furosemide: ['Furosemid', '', 'furosemid|lasix'],
    prednisolone: ['Prednisolon', 'corticoid', 'prednisolon|medrol|methylprednisolon|dexamethason|hydrocortison'],
    gabapentin: ['Gabapentin/Pregabalin', 'cnsdep', 'gabapentin|pregabalin|lyrica'],
    benzodiazepine: ['Benzodiazepin', 'cnsdep', 'diazepam|alprazolam|lorazepam|clonazepam|seduxen'],
    levothyroxine: ['Levothyroxin', '', 'levothyroxin|levothyrox|berlthyrox'],
    bisphosphonate: ['Bisphosphonat', '', 'alendronat|fosamax'],
    tetracycline: ['Tetracyclin/Doxycyclin', '', 'doxycyclin|tetracyclin'],
  entresto: ['Sacubitril/valsartan', 'arni arb raas', 'sacubitril|entresto'],
  aliskiren: ['Aliskiren', '', 'aliskiren|rasilez'],
  linezolid: ['Linezolid', '', 'linezolid|zyvox'],
  dextromethorphan: ['Dextromethorphan', '', 'dextromethorphan'],
  pethidine: ['Pethidin', 'opioid', 'pethidin|meperidin|dolargan'],
  morphine: ['Morphin', 'opioid', 'morphin'],
  codeine: ['Codein', 'opioid', 'codein'],
  fentanyl: ['Fentanyl', 'opioid', 'fentanyl|durogesic'],
  colchicine: ['Colchicin', '', 'colchicin'],
  cyclosporine: ['Ciclosporin', '', 'ciclosporin|cyclosporin|sandimmun|neoral'],
  repaglinide: ['Repaglinid', '', 'repaglinid|novonorm'],
  ivabradine: ['Ivabradin', '', 'ivabradin|procoralan|coralan'],
  diltiazem: ['Diltiazem', 'ndhp', 'diltiazem|tildiem'],
  domperidone: ['Domperidon', '', 'domperidon|motilium'],
  enoxaparin: ['Enoxaparin/heparin', 'anticoag', 'enoxaparin|lovenox|heparin|nadroparin|fraxiparine'],
  mercaptopurine: ['Mercaptopurin', '', 'mercaptopurin|purinethol'],
  febuxostat: ['Febuxostat', '', 'febuxostat|adenuric|febuxo'],
  carbamazepine: ['Carbamazepin', '', 'carbamazepin|tegretol'],
  valproate: ['Valproat', '', 'valproat|depakine|depakin'],
  carbapenem: ['Carbapenem', 'carbapenem', 'meropenem|imipenem|ertapenem|meronem|tienam'],
  triptan: ['Triptan', '', 'sumatriptan|rizatriptan|zolmitriptan|naratriptan|imigran'],
  nicorandil: ['Nicorandil', 'nitrate', 'nicorandil|sigmart'],
  bblocker: ['Chẹn beta', 'bblocker', 'metoprolol|betaloc|bisoprolol|concor|carvedilol|atenolol|propranolol|nebivolol']
  };

  function hlxDdiNorm(s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function hlxDdiBrandKey(name) {
    return hlxDdiNorm(String(name || '').replace(/\([^)]*\)/g, ' ').replace(/\d+([.,]\d+)?\s*(mg|mcg|g|ml|iu|%)?/gi, ' '));
  }
  const HLX_DDI_ALIASES = (() => {
    const out = [];
    Object.keys(HLX_DDI_ING).forEach((id) => {
      String(HLX_DDI_ING[id][2] || '').split('|').forEach((a) => {
        a = hlxDdiNorm(a);
        if (a) out.push([a, id]);
      });
    });
    return out;
  })();
  function hlxDdiAutoIds(normName) {
    const hay = ' ' + normName;
    const ids = [];
    HLX_DDI_ALIASES.forEach((p) => {
      if (hay.indexOf(' ' + p[0]) !== -1 && ids.indexOf(p[1]) === -1) ids.push(p[1]);
    });
    return ids;
  }

  // Quy tắc: a/b là id hoạt chất hoặc nhóm (tag). lv: contra|major|moderate|minor
  const HLX_DDI_RULES = [
    // ---- CHỐNG CHỈ ĐỊNH (khóa nút Lưu lại) ----
    { a: ['nitrate'], b: ['pde5'], lv: 'contra', t: 'Nitrat/nicorandil + thuốc ức chế PDE5',
      why: 'Cùng giãn mạch qua cGMP → tụt huyết áp nặng, ngất, có thể gây thiếu máu cơ tim/nhồi máu.',
      adv: 'Không dùng chung. Chỉ dùng nitrat sau ≥24 giờ kể từ liều sildenafil/vardenafil, ≥48 giờ với tadalafil.' },
    { a: ['maoi'], b: ['tramadol', 'ssri', 'dextromethorphan', 'pethidine'], lv: 'contra', t: 'Thuốc ức chế MAO + tramadol/SSRI/dextromethorphan/pethidin',
      why: 'Tăng serotonin quá mức → hội chứng serotonin (sốt cao, co giật, rối loạn ý thức), có thể tử vong.',
      adv: 'Không dùng chung; phải có thời gian rửa thuốc theo nhãn (thường ≥2 tuần).' },
    { a: ['ketorolac'], b: ['nsaid', 'aspirin'], lv: 'contra', t: 'Ketorolac + NSAID/aspirin khác', same: true,
      why: 'Cộng hưởng độc tính: xuất huyết tiêu hóa, chảy máu, suy thận. Nhãn ketorolac chống chỉ định phối hợp.',
      adv: 'Chỉ giữ một thuốc giảm đau kháng viêm.' },
    { a: ['simvastatin', 'lovastatin'], b: ['itraconazole', 'ketoconazole', 'clarithromycin', 'erythromycin'], lv: 'contra',
      t: 'Simvastatin/lovastatin + thuốc ức chế CYP3A4 mạnh',
      why: 'Nồng độ statin tăng nhiều lần → nguy cơ tiêu cơ vân, suy thận cấp. Nhãn chống chỉ định.',
      adv: 'Không dùng chung; tạm ngưng statin trong đợt kháng sinh/kháng nấm hoặc đổi thuốc.' },
    { a: ['tizanidine'], b: ['ciprofloxacin', 'fluvoxamine'], lv: 'contra', t: 'Tizanidin + ciprofloxacin/fluvoxamin',
      why: 'Ức chế CYP1A2 làm nồng độ tizanidin tăng mạnh → hạ huyết áp nặng, an thần, chậm nhịp.',
      adv: 'Không dùng chung; đổi kháng sinh hoặc thuốc giãn cơ.' },
    { a: ['ergotamine'], b: ['clarithromycin', 'erythromycin', 'itraconazole', 'ketoconazole'], lv: 'contra',
      t: 'Ergotamin + macrolid/azol ức chế CYP3A4',
      why: 'Tăng nồng độ ergotamin → co mạch nặng, thiếu máu chi/não (ergotism).',
      adv: 'Không dùng chung.' },
    { a: ['arni'], b: ['acei'], lv: 'contra', t: 'Sacubitril/valsartan + ức chế men chuyển',
    why: 'Nguy cơ phù mạch nặng. Nhãn chống chỉ định; phải ngừng ACEi ≥36 giờ trước khi dùng sacubitril/valsartan.',
    adv: 'Không dùng chung.' },
  { a: ['maoi'], b: ['linezolid', 'triptan', 'carbamazepine'], lv: 'contra', t: 'Thuốc ức chế MAO + linezolid/triptan/carbamazepin',
    why: 'Nguy cơ hội chứng serotonin, cơn tăng huyết áp hoặc tăng độc tính (nhãn các thuốc này chống chỉ định phối hợp với MAOI).',
    adv: 'Không dùng chung; cần thời gian rửa thuốc theo nhãn.' },
  { a: ['triptan'], b: ['ergotamine'], lv: 'contra', t: 'Triptan + ergotamin',
    why: 'Cộng hưởng co mạch kéo dài → thiếu máu mạch vành/ngoại biên. Nhãn chống chỉ định dùng trong vòng 24 giờ.',
    adv: 'Không dùng chung; cách nhau ít nhất 24 giờ.' },
  { a: ['simvastatin', 'lovastatin'], b: ['gemfibrozil', 'cyclosporine'], lv: 'contra', t: 'Simvastatin/lovastatin + gemfibrozil/ciclosporin',
    why: 'Tăng mạnh nồng độ statin → tiêu cơ vân, suy thận cấp. Nhãn chống chỉ định.',
    adv: 'Không dùng chung; đổi statin hoặc fibrat.' },
  { a: ['repaglinide'], b: ['gemfibrozil'], lv: 'contra', t: 'Repaglinid + gemfibrozil',
    why: 'Gemfibrozil làm tăng mạnh nồng độ repaglinid → hạ đường huyết nặng, kéo dài.',
    adv: 'Không dùng chung.' },
  { a: ['ivabradine'], b: ['ketoconazole', 'itraconazole', 'clarithromycin', 'erythromycin'], lv: 'contra', t: 'Ivabradin + ức chế CYP3A4 mạnh',
    why: 'Tăng nồng độ ivabradin → chậm nhịp tim nặng, block dẫn truyền. Nhãn chống chỉ định.',
    adv: 'Không dùng chung.' },
  { a: ['domperidone'], b: ['ketoconazole', 'itraconazole', 'clarithromycin', 'erythromycin'], lv: 'contra', t: 'Domperidon + ức chế CYP3A4 mạnh/macrolid',
    why: 'Tăng nồng độ domperidon, kéo dài QT → nguy cơ loạn nhịp thất (xoắn đỉnh).',
    adv: 'Không dùng chung; đổi thuốc chống nôn/kháng sinh.' },
  { a: ['ticagrelor'], b: ['ketoconazole', 'itraconazole', 'clarithromycin'], lv: 'contra', t: 'Ticagrelor + ức chế CYP3A4 mạnh',
    why: 'Tăng nồng độ ticagrelor nhiều lần → nguy cơ chảy máu. Nhãn chống chỉ định.',
    adv: 'Không dùng chung.' },
  { a: ['febuxostat'], b: ['azathioprine', 'mercaptopurine'], lv: 'contra', t: 'Febuxostat + azathioprin/mercaptopurin',
    why: 'Ức chế xanthin oxidase làm tăng nồng độ thuốc ức chế miễn dịch → ức chế tủy nặng. Nhãn chống chỉ định.',
    adv: 'Không dùng chung.' },
  // ---- QUAN TRỌNG ----
  { a: ['colchicine'], b: ['clarithromycin', 'erythromycin', 'ketoconazole', 'itraconazole', 'cyclosporine'], lv: 'major', t: 'Colchicin + ức chế CYP3A4/P-gp',
    why: 'Tăng nồng độ colchicin → ngộ độc (tiêu chảy nặng, ức chế tủy, suy đa cơ quan); đặc biệt nguy hiểm khi suy thận/gan.',
    adv: 'Tránh phối hợp hoặc giảm liều colchicin mạnh; chống chỉ định nếu có suy thận/gan.' },
  { a: ['anticoag'], b: ['anticoag'], lv: 'major', t: 'Hai thuốc chống đông cùng lúc', same: true,
    why: 'Cộng hưởng tác dụng → nguy cơ chảy máu nặng.',
    adv: 'Thường chỉ dùng một thuốc chống đông (trừ giai đoạn chuyển đổi có kế hoạch).' },
  { a: ['doac'], b: ['ketoconazole', 'itraconazole'], lv: 'major', t: 'DOAC + ketoconazol/itraconazol',
    why: 'Tăng nồng độ thuốc chống đông đường uống → nguy cơ chảy máu.',
    adv: 'Tránh phối hợp hoặc đổi thuốc.' },
  { a: ['aliskiren'], b: ['acei', 'arb'], lv: 'major', t: 'Aliskiren + ACEi/ARB',
    why: 'Phong tỏa kép hệ renin-angiotensin → tăng kali, suy thận; chống chỉ định ở bệnh nhân đái tháo đường.',
    adv: 'Tránh phối hợp.' },
  { a: ['opioid'], b: ['benzodiazepine'], lv: 'major', t: 'Opioid/tramadol + benzodiazepin',
    why: 'Ức chế hô hấp, hôn mê, có thể tử vong (cảnh báo hộp của nhà sản xuất).',
    adv: 'Tránh phối hợp; nếu bắt buộc dùng liều thấp nhất, thời gian ngắn, theo dõi sát.' },
  { a: ['bblocker'], b: ['ndhp'], lv: 'major', t: 'Chẹn beta + verapamil/diltiazem',
    why: 'Nguy cơ chậm nhịp nặng, block nhĩ thất, suy tim.',
    adv: 'Tránh phối hợp (nhất là đường tiêm); nếu cần phải theo dõi nhịp, ECG.' },
  { a: ['ivabradine'], b: ['ndhp'], lv: 'major', t: 'Ivabradin + verapamil/diltiazem',
    why: 'Tăng nồng độ ivabradin và cộng hưởng làm chậm nhịp.',
    adv: 'Không khuyến cáo phối hợp.' },
  { a: ['amiodarone'], b: ['clarithromycin', 'erythromycin', 'moxifloxacin', 'levofloxacin'], lv: 'major', t: 'Amiodaron + thuốc kéo dài QT',
    why: 'Cộng hưởng kéo dài QT → nguy cơ xoắn đỉnh, loạn nhịp thất.',
    adv: 'Tránh phối hợp hoặc theo dõi ECG, điện giải.' },
  { a: ['amiodarone'], b: ['warfarin'], lv: 'major', t: 'Amiodaron + warfarin',
    why: 'Amiodaron làm tăng mạnh tác dụng warfarin (tăng INR).', adv: 'Giảm liều warfarin và theo dõi INR sát.' },
  { a: ['carbamazepine'], b: ['clarithromycin', 'erythromycin', 'verapamil', 'diltiazem'], lv: 'major', t: 'Carbamazepin + macrolid/verapamil/diltiazem',
    why: 'Tăng nồng độ carbamazepin → ngộ độc (chóng mặt, nhìn đôi, thất điều).', adv: 'Tránh hoặc theo dõi nồng độ thuốc.' },
  { a: ['valproate'], b: ['carbapenem'], lv: 'major', t: 'Valproat + carbapenem',
    why: 'Carbapenem làm giảm mạnh nồng độ valproat → mất kiểm soát cơn co giật.', adv: 'Tránh phối hợp; dùng kháng sinh khác.' },
  { a: ['statin'], b: ['statin'], lv: 'major', t: 'Hai statin cùng lúc', same: true,
    why: 'Không tăng hiệu quả mà tăng nguy cơ độc tính cơ, gan.', adv: 'Chỉ giữ một statin.' },
  { a: ['sulfonylurea'], b: ['sulfonylurea'], lv: 'major', t: 'Hai sulfonylurea cùng lúc', same: true,
    why: 'Nguy cơ hạ đường huyết nặng.', adv: 'Chỉ giữ một sulfonylurea.' },
  { a: ['ssri'], b: ['ssri'], lv: 'major', t: 'Hai SSRI cùng lúc', same: true,
    why: 'Nguy cơ hội chứng serotonin.', adv: 'Chỉ giữ một thuốc (chuyển đổi cần có kế hoạch).' },
  { a: ['acei'], b: ['acei'], lv: 'major', t: 'Hai ACEi cùng lúc', same: true,
    why: 'Tăng nguy cơ hạ huyết áp, tăng kali, suy thận mà không thêm lợi ích.', adv: 'Chỉ giữ một thuốc.' },
  { a: ['arb'], b: ['arb'], lv: 'major', t: 'Hai ARB cùng lúc', same: true,
    why: 'Tăng nguy cơ hạ huyết áp, tăng kali, suy thận mà không thêm lợi ích.', adv: 'Chỉ giữ một thuốc.' },
    { a: ['clopidogrel'], b: ['omeprazole', 'esomeprazole'], lv: 'major', t: 'Clopidogrel + omeprazol/esomeprazol',
      why: 'Omeprazol/esomeprazol ức chế CYP2C19 → giảm chuyển clopidogrel thành chất có hoạt tính, giảm tác dụng chống kết tập tiểu cầu.',
      adv: 'Nên đổi PPI ít ảnh hưởng CYP2C19 (vd pantoprazol, rabeprazol) hoặc cân nhắc có cần PPI hay không.' },
    { a: ['antiplatelet', 'anticoag'], b: ['nsaid'], lv: 'major', t: 'Thuốc chống kết tập/chống đông + NSAID',
      why: 'NSAID làm tổn thương niêm mạc dạ dày và ức chế tiểu cầu → tăng nguy cơ xuất huyết tiêu hóa và chảy máu.',
      adv: 'Hạn chế NSAID; nếu bắt buộc dùng thì thời gian ngắn, liều thấp và cân nhắc bảo vệ dạ dày.' },
    { a: ['anticoag'], b: ['antiplatelet'], lv: 'major', t: 'Thuốc chống đông + thuốc chống kết tập tiểu cầu',
      why: 'Cộng hưởng tác dụng → tăng nguy cơ chảy máu. Có thể là chủ ý (ví dụ sau đặt stent kèm rung nhĩ).',
      adv: 'Chỉ phối hợp khi có chỉ định rõ, xác định thời gian dùng và theo dõi chảy máu.' },
    { a: ['nsaid'], b: ['nsaid'], lv: 'major', t: 'Hai NSAID cùng lúc', same: true, skipIf: ['ketorolac'],
      why: 'Không tăng hiệu quả nhưng tăng độc tính tiêu hóa, thận, tim mạch.',
      adv: 'Chỉ giữ một NSAID.' },
    { a: ['acei'], b: ['arb'], lv: 'major', skipIf: ['arni'], t: 'Ức chế men chuyển + chẹn thụ thể angiotensin',
      why: 'Phong tỏa kép hệ renin-angiotensin → tăng kali máu, hạ huyết áp, suy thận cấp mà không thêm lợi ích rõ.',
      adv: 'Thường tránh phối hợp.' },
    { a: ['warfarin'], b: ['clarithromycin', 'erythromycin', 'fluconazole', 'ketoconazole', 'itraconazole', 'ciprofloxacin', 'levofloxacin', 'metronidazole', 'cotrimoxazole'],
      lv: 'major', t: 'Warfarin + kháng sinh/kháng nấm',
      why: 'Làm tăng tác dụng warfarin (tăng INR) → nguy cơ chảy máu.',
      adv: 'Theo dõi INR sát, cân nhắc đổi thuốc hoặc chỉnh liều warfarin.' },
    { a: ['tramadol'], b: ['ssri'], lv: 'major', t: 'Tramadol + SSRI',
      why: 'Nguy cơ hội chứng serotonin và co giật; fluoxetin/paroxetin còn làm giảm tác dụng giảm đau của tramadol (ức chế CYP2D6).',
      adv: 'Tránh phối hợp hoặc theo dõi sát; cân nhắc thuốc giảm đau khác.' },
    { a: ['digoxin'], b: ['amiodarone', 'clarithromycin', 'erythromycin', 'verapamil'], lv: 'major', t: 'Digoxin + thuốc làm tăng nồng độ digoxin',
      why: 'Tăng nồng độ digoxin → ngộ độc (buồn nôn, loạn nhịp, rối loạn thị giác).',
      adv: 'Giảm liều digoxin/theo dõi nồng độ và ECG.' },
    { a: ['theophylline'], b: ['ciprofloxacin', 'clarithromycin', 'erythromycin'], lv: 'major', t: 'Theophyllin + ciprofloxacin/macrolid',
      why: 'Giảm thanh thải theophyllin → ngộ độc (nôn, loạn nhịp, co giật).',
      adv: 'Theo dõi nồng độ theophyllin, giảm liều hoặc đổi kháng sinh.' },
    { a: ['methotrexate'], b: ['nsaid', 'cotrimoxazole'], lv: 'major', t: 'Methotrexat + NSAID/co-trimoxazol',
      why: 'Giảm thải methotrexat hoặc cộng độc tính → ức chế tủy, độc thận.',
      adv: 'Tránh phối hợp hoặc theo dõi công thức máu, chức năng thận.' },
    { a: ['spironolactone'], b: ['potassium'], lv: 'major', t: 'Spironolacton + kali clorid',
      why: 'Cộng hưởng tăng kali máu → loạn nhịp tim.',
      adv: 'Tránh phối hợp hoặc theo dõi kali máu sát.' },
    { a: ['statin'], b: ['gemfibrozil'], lv: 'major', skipIf: ['simvastatin', 'lovastatin'], t: 'Statin + gemfibrozil',
      why: 'Tăng nguy cơ bệnh cơ/tiêu cơ vân.',
      adv: 'Tránh; nếu cần fibrat nên chọn fenofibrat với liều thấp và theo dõi CK, triệu chứng cơ.' },
    { a: ['allopurinol'], b: ['azathioprine', 'mercaptopurine'], lv: 'major', t: 'Allopurinol + azathioprin/mercaptopurin',
      why: 'Giảm chuyển hóa azathioprin → ức chế tủy xương nặng.',
      adv: 'Giảm liều azathioprin theo hướng dẫn và theo dõi công thức máu.' },
    { a: ['lithium'], b: ['nsaid', 'raas'], lv: 'major', t: 'Lithi + NSAID/ACEi/ARB',
      why: 'Giảm thải lithi → tăng nồng độ, ngộ độc lithi.',
      adv: 'Theo dõi nồng độ lithi hoặc tránh phối hợp.' },
    // ---- VỪA ----
    { a: ['raas'], b: ['nsaid'], lv: 'moderate', t: 'ACEi/ARB + NSAID',
      why: 'NSAID làm giảm tác dụng hạ áp và tăng nguy cơ suy thận cấp, tăng kali, nhất là người lớn tuổi, mất nước hoặc có bệnh thận.',
      adv: 'Theo dõi huyết áp, creatinin/eGFR, kali máu; hạn chế NSAID dài ngày.' },
    { a: ['sulfonylurea'], b: ['fibrate'], lv: 'moderate', t: 'Sulfonylurea + fibrat',
      why: 'Có thể làm tăng tác dụng hạ đường huyết của sulfonylurea.',
      adv: 'Theo dõi đường huyết, dặn bệnh nhân dấu hiệu hạ đường huyết.' },
    { a: ['sulfonylurea'], b: ['fluconazole', 'ketoconazole', 'ciprofloxacin', 'levofloxacin'], lv: 'moderate', t: 'Sulfonylurea + azol/quinolon',
      why: 'Nguy cơ hạ hoặc rối loạn đường huyết.',
      adv: 'Theo dõi đường huyết trong đợt dùng chung.' },
    { a: ['statin'], b: ['fenofibrate'], lv: 'moderate', t: 'Statin + fenofibrat',
      why: 'Tăng nhẹ nguy cơ độc tính trên cơ.',
      adv: 'Theo dõi đau cơ, CK nếu có triệu chứng.' },
    { a: ['raas'], b: ['kspare'], lv: 'moderate', t: 'ACEi/ARB + spironolacton/kali',
      why: 'Nguy cơ tăng kali máu.',
      adv: 'Theo dõi kali máu và creatinin.' },
    { a: ['corticoid'], b: ['nsaid'], lv: 'moderate', t: 'Corticoid + NSAID',
      why: 'Tăng nguy cơ loét và xuất huyết tiêu hóa.',
      adv: 'Cân nhắc bảo vệ dạ dày, dùng ngắn ngày.' },
    { a: ['nsaid'], b: ['ssri'], lv: 'moderate', t: 'NSAID + SSRI',
      why: 'Tăng nguy cơ chảy máu tiêu hóa.',
      adv: 'Cân nhắc bảo vệ dạ dày.' },
    { a: ['nsaid'], b: ['furosemide'], lv: 'moderate', t: 'NSAID + furosemid',
      why: 'Giảm tác dụng lợi tiểu, tăng nguy cơ suy thận.',
      adv: 'Theo dõi cân nặng, huyết áp, chức năng thận.' },
    { a: ['quinolone'], b: ['corticoid'], lv: 'moderate', t: 'Quinolon + corticoid',
      why: 'Tăng nguy cơ viêm/đứt gân.',
      adv: 'Dặn bệnh nhân ngưng và báo ngay khi đau gân.' },
    { a: ['quinolone', 'tetracycline', 'levothyroxine', 'bisphosphonate'], b: ['chelator'], lv: 'moderate', t: 'Thuốc bị giảm hấp thu bởi Mg/Ca/Fe/nhôm',
      why: 'Tạo phức khó hấp thu ở ruột nên giảm nồng độ thuốc.',
      adv: 'Uống cách nhau ít nhất 2–6 giờ (đọc nhãn từng thuốc).' },
    { a: ['warfarin'], b: ['fenofibrate'], lv: 'moderate', t: 'Warfarin + fenofibrat',
      why: 'Có thể tăng INR.', adv: 'Theo dõi INR.' },
    { a: ['amlodipine'], b: ['simvastatin'], lv: 'moderate', t: 'Amlodipin + simvastatin',
      why: 'Tăng nồng độ simvastatin → nguy cơ độc tính cơ.',
      adv: 'Giới hạn simvastatin ≤20 mg/ngày hoặc đổi statin.' },
    { a: ['opioid'], b: ['gabapentin'], lv: 'moderate', t: 'Opioid/tramadol + gabapentin/pregabalin',
    why: 'Cộng hưởng ức chế thần kinh trung ương và hô hấp.',
    adv: 'Dùng liều thấp nhất, theo dõi an thần/hô hấp, nhất là người lớn tuổi.' },
  { a: ['atorvastatin'], b: ['clarithromycin', 'itraconazole'], lv: 'moderate', t: 'Atorvastatin + clarithromycin/itraconazol',
    why: 'Tăng nồng độ atorvastatin → nguy cơ độc tính cơ.',
    adv: 'Giới hạn liều atorvastatin hoặc tạm ngưng trong đợt kháng sinh/kháng nấm.' },
  { a: ['ppi'], b: ['ppi'], lv: 'moderate', t: 'Hai thuốc ức chế bơm proton', same: true,
    why: 'Cùng nhóm, không tăng hiệu quả mà tăng tác dụng phụ.', adv: 'Chỉ giữ một PPI.' },
  { a: ['corticoid'], b: ['sulfonylurea', 'metformin', 'insulin'], lv: 'moderate', t: 'Corticoid + thuốc hạ đường huyết',
      why: 'Corticoid làm tăng đường huyết, giảm hiệu quả thuốc đái tháo đường.',
      adv: 'Theo dõi đường huyết, có thể cần chỉnh liều.' },
    // ---- LƯU Ý ----
    { a: ['warfarin'], b: ['paracetamol'], lv: 'minor', t: 'Warfarin + paracetamol',
      why: 'Paracetamol liều cao kéo dài có thể làm tăng INR.', adv: 'Theo dõi INR nếu dùng đều đặn.' }
  ];

  // Phân tích một toa. drugs = [{ name, idx }], custom = { khóa: [id,...] } (người dùng tự gán hoạt chất)
  function hlxDdiAnalyze(drugs, custom) {
    custom = custom || {};
    const list = drugs.map((d) => {
      const key = hlxDdiBrandKey(d.name);
      const cu = custom[key];
      const ignored = !!(cu && cu.indexOf('_none') !== -1);
      const ids = cu ? cu.filter((x) => x !== '_none' && HLX_DDI_ING[x]) : hlxDdiAutoIds(hlxDdiNorm(d.name));
      const tags = new Set();
      ids.forEach((id) => {
        tags.add(id);
        String(HLX_DDI_ING[id][1] || '').split(' ').forEach((t) => { if (t) tags.add(t); });
      });
      return { name: d.name, idx: d.idx, ref: d.ref, key, ids, tags, ignored, byUser: !!cu };
    });
    const has = (d, arr) => arr.some((t) => d.tags.has(t));
    const issues = [];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const X = list[i], Y = list[j];
        const shared = X.ids.filter((id) => Y.ids.indexOf(id) !== -1);
        shared.forEach((id) => {
          if (id === 'paracetamol') {
            issues.push({ lv: 'minor', x: X, y: Y, t: 'Cùng chứa paracetamol',
              why: 'Hai thuốc cùng chứa paracetamol: dễ vượt tổng liều an toàn.',
              adv: 'Tổng paracetamol ≤ 4 g/ngày (≤ 3 g/ngày nếu người lớn tuổi, suy gan, nghiện rượu, suy dinh dưỡng).' });
          } else {
            issues.push({ lv: 'moderate', x: X, y: Y, t: 'Trùng hoạt chất: ' + HLX_DDI_ING[id][0],
              why: 'Cùng một hoạt chất xuất hiện ở hai dòng thuốc → nguy cơ quá liều.',
              adv: 'Kiểm tra có chủ ý hay không; thường chỉ giữ một dòng.' });
          }
        });
        HLX_DDI_RULES.forEach((r) => {
          if (r.same && shared.length) return;
          if (r.skipIf && (has(X, r.skipIf) || has(Y, r.skipIf))) return;
          if ((has(X, r.a) && has(Y, r.b)) || (has(Y, r.a) && has(X, r.b))) {
            issues.push({ lv: r.lv, x: X, y: Y, t: r.t, why: r.why, adv: r.adv });
          }
        });
      }
    }
    issues.sort((p, q) => (HLX_DDI_LV[q.lv].r - HLX_DDI_LV[p.lv].r) || (p.x.idx - q.x.idx) || (p.y.idx - q.y.idx));
    issues.forEach((it) => { it.key = it.lv + '|' + it.t + '|' + it.x.key + '|' + it.y.key; });
    return { drugs: list, issues, unresolved: list.filter((d) => !d.ids.length && !d.ignored) };
  }
  /*DDI_CORE_END*/

  // ===== Kiểm tra tương tác thuốc: GIAO DIỆN =====
  const HLX_DDI_ALIAS_KEY = 'helixfast_ddi_alias_v1';
  const HLX_DDI_ON_KEY = 'helixfast_ddi_on_v1';
  function ddiOn() { return hlxStoreGet(HLX_DDI_ON_KEY) !== '0'; }
  function ddiSetOn(on) {
    hlxStoreSet(HLX_DDI_ON_KEY, on ? '1' : '0');
    if (!on) ddiTurnedOffCleanup();
    else { ddiSig = ''; ddiNotifiedKey = ''; }
    ddiSyncButtons();
  }
  const HLX_DDI_COL = {
    contra: ['#7f1d1d', '#fee2e2'], major: ['#b91c1c', '#fef2f2'],
    moderate: ['#c2410c', '#fff7ed'], minor: ['#a16207', '#fefce8']
  };
  let ddiOpen = false;
  let ddiFilter = true;
  let ddiRes = null;
  let ddiSig = '';
  let ddiAliasVer = 0;
  let ddiNotifiedKey = '';
  const ddiExpanded = new Set();

  function ddiLoadCustom() {
    try { return JSON.parse(hlxStoreGet(HLX_DDI_ALIAS_KEY) || '{}') || {}; } catch (err) { return {}; }
  }
  function ddiSaveCustom(map) {
    try { hlxStoreSet(HLX_DDI_ALIAS_KEY, JSON.stringify(map)); } catch (err) {}
    ddiAliasVer++;
  }
  function ddiReadDrugs() {
    const out = [];
    findRxTables().forEach((t) => {
      const tb = t.querySelector('tbody');
      if (!tb) return;
      getRxRows(tb).forEach((row) => {
        const nc = rxNameCell(row);
        const name = nc ? nc.textContent.replace(/\s+/g, ' ').trim() : '';
        if (name) out.push({ name, idx: out.length + 1, ref: row });
      });
    });
    return out;
  }
  function ddiRun() { return hlxDdiAnalyze(ddiReadDrugs(), ddiLoadCustom()); }

  function ddiH(tag, props, kids) {
    const el = document.createElement(tag);
    if (props) Object.keys(props).forEach((k) => {
      if (k === 'text') el.textContent = props[k];
      else if (k === 'style') el.style.cssText = props[k];
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), props[k]);
      else el.setAttribute(k, props[k]);
    });
    (kids || []).forEach((c) => { if (c) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }

  function ddiCss() {
    if (document.getElementById('hlx-ddi-css')) return;
    const st = document.createElement('style');
    st.id = 'hlx-ddi-css';
    st.textContent = `
      #hlx-ddi-btn { background:#fff !important; border:1px solid #d97706 !important; color:#d97706 !important; font-weight:600; margin-right:5px; }
      #hlx-ddi-btn:hover { background:#fff7ed !important; }
      #hlx-ddi-btn .hlx-ddi-badge { display:inline-block; min-width:18px; margin-left:6px; padding:0 5px; border-radius:9px; background:#fff7ed; border:1px solid currentColor; color:#b91c1c; font-weight:700; font-size:12px; line-height:18px; text-align:center; }
      #hlx-ddi-panel { position:fixed; right:14px; bottom:14px; width:430px; max-height:74vh; overflow:auto; z-index:100050; background:#fff; border:1px solid #cbd5e1; border-radius:10px; box-shadow:0 10px 34px rgba(0,0,0,.35); font-size:13px; color:#1f2937; }
      #hlx-ddi-panel .hd { position:sticky; top:0; z-index:1; display:flex; align-items:center; gap:8px; padding:10px 12px; background:#1e3a8a; color:#fff; font-weight:700; }
      #hlx-ddi-panel .hd .x { margin-left:auto; cursor:pointer; background:transparent; border:0; color:#fff; font-size:18px; line-height:1; }
      #hlx-ddi-panel .bd { padding:10px 12px; }
      #hlx-ddi-panel .ban { margin:0 0 8px; padding:8px 10px; border-radius:6px; background:#fee2e2; color:#7f1d1d; font-weight:600; }
      #hlx-ddi-panel .okb { margin:0 0 8px; padding:8px 10px; border-radius:6px; background:#ecfdf5; color:#065f46; }
      #hlx-ddi-panel .card { margin:0 0 8px; padding:8px 10px; border-radius:8px; border:1px solid; }
      #hlx-ddi-panel .pair { font-weight:700; }
      #hlx-ddi-panel .sub { margin-top:2px; }
      #hlx-ddi-panel .bt { display:inline-block; margin:6px 6px 0 0; padding:2px 8px; border:1px solid #94a3b8; border-radius:5px; background:#fff; color:#0f172a; cursor:pointer; font-size:12px; }
      #hlx-ddi-panel .bt:hover { background:#e2e8f0; }
      #hlx-ddi-panel .dt { display:none; margin-top:6px; padding:6px 8px; background:rgba(255,255,255,.75); border-radius:6px; line-height:1.45; }
      #hlx-ddi-panel .dt.on { display:block; }
      #hlx-ddi-panel .un { margin:8px 0; padding:8px 10px; border:1px dashed #94a3b8; border-radius:8px; background:#f8fafc; }
      #hlx-ddi-panel select { max-width:150px; margin:2px 4px 2px 0; font-size:12px; }
      #hlx-ddi-panel .net { margin:6px 0 0; padding:6px 8px; border:1px solid #fdba74; border-radius:6px; background:#fff7ed; font-size:12px; line-height:1.4; }
      #hlx-ddi-panel .net .sn { color:#475569; font-size:11.5px; margin-top:2px; }
      #hlx-ddi-panel input.ddi-in { width:130px; margin:2px 4px 2px 0; font-size:12px; padding:1px 4px; border:1px solid #94a3b8; border-radius:4px; }
      #hlx-ddi-panel .ft { margin-top:8px; color:#64748b; font-size:11.5px; line-height:1.4; }
    #hlx-ddi-btn { display:inline-flex; align-items:center; }
    #hlx-ddi-btn.off { background:#fff !important; border-color:#94a3b8 !important; color:#94a3b8 !important; }
    #hlx-ddi-btn.off .p-button-label, #hlx-ddi-btn.off .hlx-ddi-badge { opacity:.75; }
    #hlx-ddi-btn .hlx-ddi-tg { position:relative; display:inline-block; flex:none; width:30px; height:16px; margin-right:8px; border-radius:8px; background:#16a34a; cursor:pointer; transition:background .15s; }
    #hlx-ddi-btn .hlx-ddi-tg::after { content:''; position:absolute; top:2px; left:16px; width:12px; height:12px; border-radius:50%; background:#fff; transition:left .15s; }
    #hlx-ddi-btn.off .hlx-ddi-tg { background:#64748b; }
    #hlx-ddi-btn.off .hlx-ddi-tg::after { left:2px; }
    tr.hlx-ddi-hide { display:none !important; }
      tr.hlx-ddi-r-contra > td:first-child { box-shadow: inset 5px 0 0 #7f1d1d; }
      tr.hlx-ddi-r-major > td:first-child { box-shadow: inset 5px 0 0 #dc2626; }
      tr.hlx-ddi-r-moderate > td:first-child { box-shadow: inset 5px 0 0 #f97316; }
      tr.hlx-ddi-r-minor > td:first-child { box-shadow: inset 5px 0 0 #eab308; }
      tr.hlx-ddi-flash > td { animation: hlxDdiFlash 1.2s ease 2; }
      @keyframes hlxDdiFlash { 50% { background:#fde68a; } }
      button.hlx-ddi-locked { opacity:.45 !important; cursor:not-allowed !important; filter:grayscale(.6); }
      #hlx-ddi-toast { position:fixed; top:84px; left:50%; transform:translateX(-50%); z-index:100060; max-width:620px; padding:10px 16px; border-radius:8px; background:#7f1d1d; color:#fff; font-weight:600; box-shadow:0 8px 24px rgba(0,0,0,.4); }
    `;
    document.head.appendChild(st);
  }

  function ddiToast(msg) {
    const old = document.getElementById('hlx-ddi-toast');
    if (old) old.remove();
    const t = ddiH('div', { id: 'hlx-ddi-toast', text: msg });
    document.body.appendChild(t);
    setTimeout(() => { try { t.remove(); } catch (err) {} }, 7000);
  }

  function ddiLabel(d) { return '[' + d.idx + '] ' + d.name.replace(/\s*\(.*$/, ''); }

  function ddiSelectRow(d) {
    const row = d.ref;
    if (!row || !row.isConnected) return;
    const nc = rxNameCell(row) || row;
    try { row.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (err) {}
    try { nc.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window })); } catch (err) {}
    row.classList.add('hlx-ddi-flash');
    setTimeout(() => row.classList.remove('hlx-ddi-flash'), 2600);
  }

  function ddiBadge() {
    const b = document.getElementById('hlx-ddi-btn');
    if (!b || !ddiRes) return;
    const sp = b.querySelector('.hlx-ddi-badge');
    const n = ddiRes.issues.length;
    const un = ddiRes.unresolved.length;
    if (sp) {
      let nh = 0; ddiNetFind.forEach((f) => { nh += f.items.length; });
      sp.style.display = n || un || nh ? '' : 'none';
      sp.textContent = n ? String(n) : (nh ? '!' : '?');
      const top = ddiRes.issues[0];
      sp.style.color = n ? HLX_DDI_COL[top.lv][0] : (nh ? '#c2410c' : '#475569');
    }
    b.title = n ? n + ' tương tác trong toa' : (un ? un + ' thuốc chưa nhận diện hoạt chất' : 'Chưa phát hiện tương tác theo bộ quy tắc hiện có');
  }

  function ddiSyncButtons() {
    const b = document.getElementById('hlx-ddi-btn');
    const on = ddiOn();
    if (b) {
      b.classList.toggle('off', !on);
      b.title = on ? 'Kiểm tra tương tác thuốc. Công tắc bên trái để tắt (được lưu lại).' : 'Đang tắt kiểm tra tương tác thuốc. Bật công tắc bên trái để dùng lại (được lưu lại).';
    }
    if (on) ddiBadge();
  }
  function ddiTurnedOffCleanup() {
    ddiOpen = false;
    const p = document.getElementById('hlx-ddi-panel');
    if (p) p.remove();
    const t = document.getElementById('hlx-ddi-toast');
    if (t) t.remove();
    ddiRes = null;
    document.querySelectorAll('tr[class*="hlx-ddi-"]').forEach((r) => { r.className = r.className.replace(/\s*hlx-ddi-(hide|r-\w+|flash)/g, ''); });
    document.querySelectorAll('button.hlx-ddi-locked').forEach((x) => { x.classList.remove('hlx-ddi-locked'); x.removeAttribute('title'); });
  }

  function ddiEnsureButton() {
    ddiCss();
    const foot = Array.from(document.querySelectorAll('.p-datatable-footer p-button')).find((p) => /Kê vật tư/.test(p.textContent || ''));
    const cur = document.getElementById('hlx-ddi-btn');
    const old = document.getElementById('hlx-ddi-sw');
    if (old) old.remove();
    if (!foot) { if (cur && !cur.isConnected) cur.remove(); return; }
    if (cur && cur.nextElementSibling === foot) return;
    if (cur) cur.remove();
    const tg = ddiH('span', { class: 'hlx-ddi-tg', onclick: (e) => { e.preventDefault(); e.stopPropagation(); ddiSetOn(!ddiOn()); } });
    const btn = ddiH('button', {
      id: 'hlx-ddi-btn', type: 'button', class: 'p-ripple p-element p-button p-component',
      onclick: (e) => { e.preventDefault(); e.stopPropagation(); if (!ddiOn()) return; ddiOpen ? ddiClose() : ddiShow(); }
    }, [tg, ddiH('span', { class: 'p-button-label', text: 'Kiểm tra tương tác thuốc' }), ddiH('span', { class: 'hlx-ddi-badge', style: 'display:none' })]);
    foot.parentNode.insertBefore(btn, foot);
    ddiSyncButtons();
  }


  // ===== Tra cứu online miễn phí (RxNorm + openFDA) =====
  const HLX_DDI_EXT_KEY = 'helixfast_ddi_ext_v1';
  function ddiLoadExt() { try { return JSON.parse(hlxStoreGet(HLX_DDI_EXT_KEY) || '{}') || {}; } catch (err) { return {}; } }
  function ddiSaveExt(m) { try { hlxStoreSet(HLX_DDI_EXT_KEY, JSON.stringify(m)); } catch (err) {} }
  const ddiNetSug = new Map();   // key thuốc -> { busy, list:[{g,src,note}], err }
  const ddiNetFind = new Map();  // key thuốc -> { busy, items:[{a,b,snip}], notes:[], done }
  const ddiLabelCache = new Map();
  const HLX_DDI_CLASS_TERMS = {
    nsaid: ['nsaid', 'nonsteroidal'], ppi: ['proton pump'], anticoag: ['anticoagulant'], antiplatelet: ['antiplatelet'],
    statin: ['statin'], ssri: ['ssri', 'serotonin'], acei: ['ace inhibitor', 'angiotensin converting'], arb: ['angiotensin receptor'],
    corticoid: ['corticosteroid'], opioid: ['opioid'], chelator: ['antacid', 'magnesium', 'aluminum']
  };

  function ddiHttp(url) {
    return new Promise((resolve, reject) => {
      if (typeof GM_xmlhttpRequest === 'function') {
        GM_xmlhttpRequest({
          method: 'GET', url, timeout: 15000, headers: { Accept: 'application/json' },
          onload: (r) => { try { resolve(JSON.parse(r.responseText)); } catch (err) { reject(err); } },
          onerror: () => reject(new Error('network')), ontimeout: () => reject(new Error('timeout'))
        });
      } else {
        fetch(url).then((r) => r.json()).then(resolve, reject);
      }
    });
  }
  function ddiCleanTerm(s) {
    return String(s || '').replace(/\([^)]*\)/g, ' ').replace(/\d+([.,]\d+)?\s*(mg|mcg|g|ml|iu|%)?/gi, ' ')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').replace(/[^A-Za-z0-9 -]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Tra thành phần từ tên biệt dược / tên gõ tay. Chỉ GỢI Ý, người dùng phải bấm xác nhận.
  async function ddiNetSuggest(d, typed) {
    const term = ddiCleanTerm(typed || d.name);
    const st = { busy: true, list: [], err: '' };
    ddiNetSug.set(d.key, st);
    if (ddiOpen) ddiRenderPanel();
    const add = (g, src, note) => {
      g = String(g || '').toLowerCase().trim();
      if (g && !st.list.some((x) => x.g === g)) st.list.push({ g, src, note: note || '' });
    };
    let netFail = 0;
    if (term.length >= 3) {
      const w = term.split(' ')[0];
      // 1) openFDA: trùng tên biệt dược
      try {
        const j = await ddiHttp('https://api.fda.gov/drug/label.json?limit=2&search=openfda.brand_name:%22' + encodeURIComponent(term) + '%22');
        (j.results || []).forEach((r) => ((r.openfda && r.openfda.generic_name) || []).forEach((g) => add(g, 'openFDA', 'trùng tên biệt dược')));
      } catch (err) { netFail++; }
      // 2) openFDA: trùng tên hoạt chất (khi gõ tay)
      if (typed) {
        try {
          const j = await ddiHttp('https://api.fda.gov/drug/label.json?limit=1&search=openfda.generic_name:' + encodeURIComponent(w + '*'));
          (j.results || []).forEach((r) => ((r.openfda && r.openfda.generic_name) || []).forEach((g) => add(g, 'openFDA', 'có nhãn thuốc')));
        } catch (err) { netFail++; }
      }
      // 3) RxNorm: gần đúng
      try {
        const j = await ddiHttp('https://rxnav.nlm.nih.gov/REST/approximateTerm.json?maxEntries=3&term=' + encodeURIComponent(term));
        const cand = ((j.approximateGroup && j.approximateGroup.candidate) || []).slice(0, 3);
        const seen = new Set();
        for (const c of cand) {
          if (seen.has(c.rxcui)) continue;
          seen.add(c.rxcui);
          const r = await ddiHttp('https://rxnav.nlm.nih.gov/REST/rxcui/' + c.rxcui + '/related.json?tty=IN');
          ((r.relatedGroup && r.relatedGroup.conceptGroup) || []).forEach((cg) => (cg.conceptProperties || []).forEach((p) => {
            add(p.name, 'RxNorm', 'khớp gần đúng với “' + (c.name || term) + '” (điểm ' + Math.round(+c.score || 0) + ')');
          }));
        }
      } catch (err) { netFail++; }
    }
    if (typed && !st.list.some((x) => x.g === typed.toLowerCase().trim())) add(typed, 'tự gõ', 'chưa xác minh được trên FDA/RxNorm');
    st.busy = false;
    // Tự động dùng khi chỉ có ĐÚNG 1 kết quả đáng tin; nhiều kết quả hoặc khớp yếu thì để người dùng chọn
    if (st.list.length === 1 && !typed) {
      const x = st.list[0];
      const m = /điểm (\d+)/.exec(x.note || '');
      if (x.src === 'openFDA' || (x.src === 'RxNorm' && m && +m[1] >= 75)) {
        st.busy = false;
        ddiUseGeneric(d, x.g);
        return;
      }
    }
    if (!st.list.length) st.err = netFail >= 2 ? 'Không kết nối được dịch vụ online.' : 'Không tìm thấy (biệt dược nội địa thường không có trên cơ sở dữ liệu Mỹ). Hãy gõ tên hoạt chất đọc trên hộp thuốc.';
    if (ddiOpen) ddiRenderPanel();
  }

  function ddiUseGeneric(d, g) {
    const ids = hlxDdiAutoIds(hlxDdiNorm(g));
    const map = ddiLoadCustom();
    if (ids.length) {
      map[d.key] = ids;          // đã có trong bộ quy tắc nội bộ → dùng luôn quy tắc tiếng Việt
    } else {
      const ext = ddiLoadExt(); ext[d.key] = [g]; ddiSaveExt(ext);
      map[d.key] = ['_none'];    // chưa có quy tắc nội bộ → quét nhãn FDA
    }
    ddiSaveCustom(map);
    ddiNetSug.delete(d.key); ddiNetFind.clear();
    ddiRefresh(true);
  }
  function ddiForgetExt(d) {
    const ext = ddiLoadExt(); delete ext[d.key]; ddiSaveExt(ext);
    const map = ddiLoadCustom(); delete map[d.key]; ddiSaveCustom(map);
    ddiNetFind.clear(); ddiRefresh(true);
  }

  async function ddiFdaLabel(generic) {
    const w = ddiCleanTerm(generic).split(' ')[0].toLowerCase();
    if (w.length < 3) return '';
    if (ddiLabelCache.has(w)) return ddiLabelCache.get(w);
    let txt = '';
    try {
      const j = await ddiHttp('https://api.fda.gov/drug/label.json?limit=3&search=openfda.generic_name:' + encodeURIComponent(w + '*'));
      (j.results || []).forEach((r) => { (r.drug_interactions || []).forEach((s) => { txt += ' ' + s; }); });
    } catch (err) { return null; }
    txt = txt.toLowerCase().replace(/\s+/g, ' ');
    ddiLabelCache.set(w, txt);
    return txt;
  }
  function ddiOtherTerms(o) {
    const out = [];
    o.ids.forEach((id) => { const a = hlxDdiNorm(String(HLX_DDI_ING[id][2]).split('|')[0]); if (a) out.push(a); });
    (ddiLoadExt()[o.key] || []).forEach((g) => out.push(hlxDdiNorm(g).split(' ')[0]));
    Object.keys(HLX_DDI_CLASS_TERMS).forEach((tg) => { if (o.tags.has(tg)) HLX_DDI_CLASS_TERMS[tg].forEach((x) => out.push(x)); });
    return Array.from(new Set(out.filter((x) => x.length >= 3)));
  }
  function ddiSnip(txt, i) { return '…' + txt.slice(Math.max(0, i - 90), i + 140).trim() + '…'; }

  // Quét mục “Tương tác thuốc” trong nhãn FDA: thuốc ngoài bộ quy tắc ↔ các thuốc còn lại trong toa
  async function ddiNetCheck(d) {
    const st = { busy: true, items: [], notes: [], done: false };
    ddiNetFind.set(d.key, st);
    if (ddiOpen) ddiRenderPanel();
    const gens = (ddiLoadExt()[d.key] || []).map((g) => hlxDdiNorm(g));
    const others = (ddiRes ? ddiRes.drugs : []).filter((x) => x.key !== d.key);
    for (const g of gens) {
      const labG = await ddiFdaLabel(g);
      if (labG === null) { st.notes.push('Không kết nối được openFDA.'); continue; }
      if (!labG) st.notes.push('Không tìm thấy mục tương tác trên nhãn FDA của “' + g + '”.');
      for (const o of others) {
        const terms = ddiOtherTerms(o);
        if (!terms.length) { st.notes.push(ddiLabel(o) + ': chưa biết hoạt chất nên không đối chiếu.'); continue; }
        let hit = null;
        for (const tm of terms) { const i = labG.indexOf(tm); if (i !== -1) { hit = { snip: ddiSnip(labG, i), by: g }; break; } }
        if (!hit) {
          const labO = await ddiFdaLabel(terms[0]);
          const gw = g.split(' ')[0];
          if (labO) { const i = labO.indexOf(gw); if (i !== -1) hit = { snip: ddiSnip(labO, i), by: terms[0] }; }
        }
        if (hit) st.items.push({ a: g, b: ddiLabel(o), snip: hit.snip, by: hit.by });
      }
    }
    st.busy = false; st.done = true;
    ddiBadge();
    if (ddiOpen) ddiRenderPanel();
  }

  // Tự tra thuốc chưa nhận diện + tự quét nhãn FDA cho hoạt chất tra online
  function ddiAutoNet() {
    if (!ddiRes || !ddiOn()) return;
    const ext = ddiLoadExt();
    ddiRes.unresolved.forEach((d) => { if (!ddiNetSug.has(d.key)) ddiNetSuggest(d, ''); });
    ddiRes.drugs.forEach((d) => { if (ext[d.key] && !ddiNetFind.has(d.key)) ddiNetCheck(d); });
  }

  function ddiRenderNet(bd, res) {
    const ext = ddiLoadExt();
    const exts = res.drugs.filter((d) => ext[d.key]);
    if (!exts.length) return;
    const box = ddiH('div', { class: 'un' }, [ddiH('div', { style: 'font-weight:700;margin-bottom:4px', text: '🌐 Hoạt chất tra online (chưa có trong bộ quy tắc) — đối chiếu nhãn FDA:' })]);
    exts.forEach((d) => {
      const f = ddiNetFind.get(d.key);
      const row = ddiH('div', { style: 'margin:4px 0' }, [
        ddiH('div', { text: ddiLabel(d) + '  →  ' + ext[d.key].join(', ') }),
        ddiH('button', { type: 'button', class: 'bt', text: f && f.busy ? 'Đang quét…' : '🔎 Quét nhãn FDA', onclick: () => { if (!(f && f.busy)) ddiNetCheck(d); } }),
        ddiH('button', { type: 'button', class: 'bt', text: 'Bỏ gán', onclick: () => ddiForgetExt(d) })
      ]);
      if (f && f.done) {
        if (!f.items.length) row.appendChild(ddiH('div', { class: 'net', text: 'Nhãn FDA không nhắc tới các thuốc còn lại trong toa (không đồng nghĩa là an toàn).' }));
        f.items.forEach((it) => row.appendChild(ddiH('div', { class: 'net' }, [
          ddiH('b', { text: it.a + ' ⟷ ' + it.b }),
          ddiH('div', { class: 'sn', text: 'Trích nhãn ' + it.by + ': ' + it.snip })
        ])));
        f.notes.forEach((n) => row.appendChild(ddiH('div', { class: 'sn', style: 'color:#64748b;font-size:11.5px', text: 'ℹ ' + n })));
        row.appendChild(ddiH('div', { class: 'sn', style: 'color:#b45309;font-size:11.5px', text: 'Quét từ khóa tự động trên nhãn tiếng Anh của Mỹ, chưa phân mức độ — cần bác sĩ/dược sĩ đọc lại.' }));
      }
      box.appendChild(row);
    });
    bd.appendChild(box);
  }

  function ddiRenderPanel() {
    let p = document.getElementById('hlx-ddi-panel');
    if (!p) { p = ddiH('div', { id: 'hlx-ddi-panel' }); document.body.appendChild(p); }
    const res = ddiRes || ddiRun();
    const cnt = { contra: 0, major: 0, moderate: 0, minor: 0 };
    res.issues.forEach((i) => cnt[i.lv]++);
    p.textContent = '';
    p.appendChild(ddiH('div', { class: 'hd' }, [
      ddiH('span', { text: '💊 Kiểm tra tương tác thuốc' }),
      ddiH('button', { class: 'x', type: 'button', title: 'Đóng', text: '✕', onclick: ddiClose })
    ]));
    const bd = ddiH('div', { class: 'bd' });
    bd.appendChild(ddiH('div', { style: 'margin-bottom:8px', text:
      res.drugs.length + ' thuốc · ' + res.issues.length + ' tương tác' +
      (res.issues.length ? '  (' + ['contra', 'major', 'moderate', 'minor'].filter((k) => cnt[k]).map((k) => HLX_DDI_LV[k].ic + cnt[k]).join(' ') + ')' : '') }));
    if (cnt.contra) {
      bd.appendChild(ddiH('div', { class: 'ban', text: '⛔ Có phối hợp CHỐNG CHỈ ĐỊNH: nút “Lưu lại” bị khóa cho đến khi bỏ một trong các thuốc liên quan.' }));
    } else if (!res.issues.length && !res.unresolved.length) {
      bd.appendChild(ddiH('div', { class: 'okb', text: 'Không phát hiện tương tác theo bộ quy tắc hiện có. Đây không phải bảo đảm an toàn tuyệt đối.' + (Object.keys(ddiLoadExt()).length ? ' Hoạt chất tra online được quét nhãn FDA riêng ở bên dưới.' : '') }));
    }
    if (res.issues.length) {
      const lab = ddiH('label', { style: 'display:block;margin:0 0 8px;cursor:pointer' }, [
        ddiH('input', { type: 'checkbox', style: 'margin-right:6px', onchange: (e) => { ddiFilter = e.target.checked; ddiApplyFilter(); } }),
        'Chỉ hiện các thuốc có tương tác trong bảng'
      ]);
      lab.firstChild.checked = ddiFilter;
      bd.appendChild(lab);
    }
    res.issues.forEach((it) => {
      const c = HLX_DDI_COL[it.lv];
      const card = ddiH('div', { class: 'card', style: 'background:' + c[1] + ';border-color:' + c[0] });
      card.appendChild(ddiH('div', { style: 'color:' + c[0] + ';font-weight:700', text: HLX_DDI_LV[it.lv].ic + ' ' + HLX_DDI_LV[it.lv].t }));
      card.appendChild(ddiH('div', { class: 'pair', text: ddiLabel(it.x) + '  ⟷  ' + ddiLabel(it.y) }));
      card.appendChild(ddiH('div', { class: 'sub', text: it.t }));
      const dt = ddiH('div', { class: 'dt' + (ddiExpanded.has(it.key) ? ' on' : '') }, [
        ddiH('div', {}, [ddiH('b', { text: 'Vì sao không nên dùng chung: ' }), it.why]),
        ddiH('div', { style: 'margin-top:4px' }, [ddiH('b', { text: 'Khuyến nghị: ' }), it.adv])
      ]);
      const infoBtn = ddiH('button', { type: 'button', class: 'bt', text: 'ⓘ Chi tiết', onclick: () => {
        const on = dt.classList.toggle('on');
        if (on) ddiExpanded.add(it.key); else ddiExpanded.delete(it.key);
      } });
      card.appendChild(infoBtn);
      [it.x, it.y].forEach((d) => card.appendChild(ddiH('button', { type: 'button', class: 'bt', title: 'Chọn dòng này trong bảng để bấm Xóa', text: 'Chọn dòng ' + d.idx + ' để xóa', onclick: () => ddiSelectRow(d) })));
      card.appendChild(dt);
      bd.appendChild(card);
    });
    if (res.unresolved.length) {
      const un = ddiH('div', { class: 'un' }, [ddiH('div', { style: 'font-weight:700;margin-bottom:4px', text: '❓ Chưa nhận diện hoạt chất, CHƯA được kiểm tra:' })]);
      const opts = Object.keys(HLX_DDI_ING).sort((a, b) => HLX_DDI_ING[a][0].localeCompare(HLX_DDI_ING[b][0], 'vi'));
      res.unresolved.forEach((d) => {
        const mk = () => {
          const s = ddiH('select');
          s.appendChild(ddiH('option', { value: '', text: '— chọn hoạt chất —' }));
          opts.forEach((id) => s.appendChild(ddiH('option', { value: id, text: HLX_DDI_ING[id][0] })));
          s.appendChild(ddiH('option', { value: '_none', text: 'Không cần đối chiếu' }));
          return s;
        };
        const s1 = mk(), s2 = mk();
        const row = ddiH('div', { style: 'margin:4px 0' }, [
          ddiH('div', { text: ddiLabel(d) }), s1, s2,
          ddiH('button', { type: 'button', class: 'bt', text: 'Lưu', onclick: () => {
            const v = [s1.value, s2.value].filter(Boolean);
            if (!v.length) return;
            const map = ddiLoadCustom();
            map[d.key] = v.indexOf('_none') !== -1 ? ['_none'] : v;
            ddiSaveCustom(map);
            ddiRefresh(true);
          } })
        ]);
        const sg = ddiNetSug.get(d.key);
        const inp = ddiH('input', { type: 'text', class: 'ddi-in', placeholder: 'hoặc gõ hoạt chất' });
        row.appendChild(ddiH('div', {}, [
          ddiH('button', { type: 'button', class: 'bt', text: sg && sg.busy ? 'Đang tra…' : '🌐 Tra online', onclick: () => { if (!(sg && sg.busy)) ddiNetSuggest(d, ''); } }),
          inp,
          ddiH('button', { type: 'button', class: 'bt', text: 'Tra', onclick: () => { const v = inp.value.trim(); if (v && !(sg && sg.busy)) ddiNetSuggest(d, v); } }),
          ddiH('a', { class: 'bt', style: 'text-decoration:none', target: '_blank', rel: 'noopener', title: 'Mở Google tìm thành phần', text: '🔎 Google',
            href: 'https://www.google.com/search?q=' + encodeURIComponent(ddiCleanTerm(d.name) + ' thành phần hoạt chất') })
        ]));
        if (sg && !sg.busy) {
          if (sg.err) row.appendChild(ddiH('div', { class: 'net', text: sg.err }));
          sg.list.forEach((x) => row.appendChild(ddiH('div', { class: 'net' }, [
            ddiH('b', { text: x.g }),
            ddiH('span', { text: '  (' + x.src + (x.note ? ' — ' + x.note : '') + ')' }),
            ddiH('button', { type: 'button', class: 'bt', style: 'margin-left:6px', text: 'Dùng', title: 'Xác nhận gán hoạt chất này cho thuốc', onclick: () => ddiUseGeneric(d, x.g) })
          ])));
        }
        un.appendChild(row);
      });
      bd.appendChild(un);
    }
    ddiRenderNet(bd, res);
    bd.appendChild(ddiH('div', { class: 'ft', text: 'Công cụ hỗ trợ rà soát dựa trên bộ quy tắc nội bộ của Helixfast (chưa bao phủ hết mọi thuốc/tương tác, chưa xét liều và bệnh nền của người bệnh). Quyết định lâm sàng thuộc về bác sĩ; nên đối chiếu thêm dược thư/Drugs.com/Lexicomp khi cần.' }));
    p.appendChild(bd);
  }

  function ddiApplyFilter() {
    const involved = new Map();
    if (ddiOpen && ddiRes) {
      ddiRes.issues.forEach((i) => [i.x, i.y].forEach((d) => {
        const cur = involved.get(d.ref);
        if (!cur || HLX_DDI_LV[i.lv].r > HLX_DDI_LV[cur].r) involved.set(d.ref, i.lv);
      }));
    }
    const rows = ddiRes ? ddiRes.drugs.map((d) => d.ref) : [];
    document.querySelectorAll('tr.hlx-ddi-hide, tr[class*="hlx-ddi-r-"]').forEach((r) => {
      if (rows.indexOf(r) === -1) r.className = r.className.replace(/\s*hlx-ddi-(hide|r-\w+)/g, '');
    });
    rows.forEach((r) => {
      if (!r || !r.isConnected) return;
      r.className = r.className.replace(/\s*hlx-ddi-(hide|r-\w+)/g, '');
      if (!ddiOpen) return;
      const lv = involved.get(r);
      if (lv) r.classList.add('hlx-ddi-r-' + lv);
      else if (ddiFilter && involved.size) r.classList.add('hlx-ddi-hide');
    });
  }

  function ddiShow() {
    ddiOpen = true;
    ddiRefresh(true);
  }
  function ddiClose() {
    ddiOpen = false;
    const p = document.getElementById('hlx-ddi-panel');
    if (p) p.remove();
    ddiApplyFilter();
  }
  function ddiRefresh(force) {
    const drugs = ddiReadDrugs();
    const sig = drugs.map((d) => d.name).join('¦') + '#' + ddiAliasVer;
    if (!force && sig === ddiSig && ddiRes) return;
    ddiSig = sig;
    ddiNetFind.clear();
    ddiRes = hlxDdiAnalyze(drugs, ddiLoadCustom());
    ddiBadge();
    if (ddiOpen) ddiRenderPanel();
    setTimeout(ddiAutoNet, 0);
    ddiApplyFilter();
    const c = ddiRes.issues.filter((i) => i.lv === 'contra');
    const ck = c.map((i) => i.key).join('~');
    if (c.length && ck !== ddiNotifiedKey) {
      ddiToast('⛔ Phối hợp chống chỉ định: ' + ddiLabel(c[0].x) + ' + ' + ddiLabel(c[0].y) + ' — đã khóa nút Lưu lại.');
    }
    ddiNotifiedKey = ck;
  }

  function ddiIsSaveBtn(btn) {
    if (!btn || btn.textContent.replace(/\s+/g, ' ').trim() !== 'Lưu lại') return false;
    if (btn.closest('.p-dialog')) return false;
    try { if (btn === findNapButton()) return false; } catch (err) {}
    return true;
  }
  function ddiApplyLock() {
    const locked = !!(ddiRes && ddiRes.issues.some((i) => i.lv === 'contra'));
    document.querySelectorAll('button').forEach((b) => {
      if (!ddiIsSaveBtn(b)) { if (b.classList.contains('hlx-ddi-locked')) b.classList.remove('hlx-ddi-locked'); return; }
      if (locked && findRxTables().length) { b.classList.add('hlx-ddi-locked'); b.title = 'Toa có phối hợp chống chỉ định: loại bỏ thuốc liên quan để lưu'; }
      else if (b.classList.contains('hlx-ddi-locked')) { b.classList.remove('hlx-ddi-locked'); b.removeAttribute('title'); }
    });
  }

  hlxDocListen('click', (e) => {
    if (!isHelixfastEnabled() || !ddiOn()) return;
    const btn = e.target && e.target.closest ? e.target.closest('button') : null;
    if (!btn || !ddiIsSaveBtn(btn) || !findRxTables().length) return;
    const res = ddiRun();
    const c = res.issues.filter((i) => i.lv === 'contra');
    if (!c.length) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    ddiRes = res;
    ddiToast('⛔ Không thể lưu: ' + ddiLabel(c[0].x) + ' + ' + ddiLabel(c[0].y) + ' (' + c[0].t + '). Hãy bỏ một trong các thuốc.');
    ddiOpen = true;
    ddiRenderPanel();
    ddiApplyFilter();
  }, true);

  setInterval(() => {
    try {
      if (!isHelixfastEnabled()) {
        if (ddiOpen) ddiClose();
        ['hlx-ddi-btn', 'hlx-ddi-sw'].forEach((id) => { const b = document.getElementById(id); if (b) b.remove(); });
        document.querySelectorAll('button.hlx-ddi-locked').forEach((x) => x.classList.remove('hlx-ddi-locked'));
        return;
      }
      ddiEnsureButton();
      if (!ddiOn()) { if (ddiRes || ddiOpen) ddiTurnedOffCleanup(); ddiSyncButtons(); return; }
      ddiRefresh(false);
      ddiApplyLock();
      if (ddiOpen) ddiApplyFilter();
    } catch (err) {}
  }, 500);

  })();
})();

(function hlxQsInit() {
    'use strict';
    if (window.__hlxIsEnabled && !window.__hlxIsEnabled()) { setTimeout(hlxQsInit, 1500); return; }

    const GROUPS = [
        { label: 'Glucose', color: '#2196a8',
          keywords: ['Định lượng Glucose [Máu]'] },

        { label: 'Mỡ máu', color: '#e65c00',
          keywords: [
              'Triglycerid (máu) [Máu]',
              'Cholesterol toàn phần (máu)',
              'Định lượng HDL-C (High density lipoprotein Cholesterol)'
          ] },

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

        { label: 'PT Nước tiểu', color: '#558b2f',
          keywords: ['Tổng phân tích nước tiểu (Bằng máy tự động)'] },

        { label: 'CTM', color: '#c62828',
          keywords: ['Tổng phân tích tế bào máu ngoại vi'] },

        { label: 'Điện giải + Ca ion hóa', color: '#0097a7',
          keywords: [
              'Điện giải đồ (Na, K, Cl) [Máu]',
              'Calci ion hoá [Máu]'
          ] },

        { label: 'Acid Uric', color: '#00695c',
          keywords: ['Định lượng Acid Uric [Máu]'] },

        { label: 'ĐHMM', color: '#039be5',
          keywords: ['Xét nghiệm đường máu mao mạch tại giường'] },

        { label: 'HbA1c', color: '#8d6e63',
          keywords: ['HbA1c [Máu]'] },

        { label: 'Canxi TP', color: '#37474f',
          keywords: ['Định lượng Canxi toàn phần [Máu]'] },

        { label: 'Đông cầm máu', color: '#ad1457',
          keywords: [
              'Thời gian máu chảy phương pháp Duke',
              'Xét nghiệm đông máu nhanh tại giường'
          ] },

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

        { label: 'X-quang', color: '#3949ab',
          sub: [
              { header: 'Đầu mặt' },
              { label: 'Sọ thẳng/nghiêng', keywords: ['Chụp Xquang sọ thẳng/nghiêng'] },
              { label: 'Blondeau (1 phim)', keywords: ['Chụp Xquang Blondeau [B - 01 phim]'] },
              { label: 'Blondeau + Hirtz (2 phim)', keywords: ['Chụp Xquang Blondeau [Blondeau + Hirtz số hóa 2 phim]'] },
              { label: 'Hirtz (1 phim)', keywords: ['Chụp Xquang Hirtz [H - 01 phim]'] },

              { header: 'Ngực / Cột sống' },
              { label: 'Ngực thẳng', keywords: ['Chụp Xquang ngực thẳng [01 phim]'] },
              { label: 'CS cổ thẳng/nghiêng', keywords: ['Chụp Xquang cột sống cổ thẳng nghiêng [ thẳng hoặc nghiêng 01 phim]'] },
              { label: 'CS thắt lưng thẳng/nghiêng', keywords: ['Chụp Xquang cột sống thắt lưng thẳng nghiêng [thẳng hoặc nghiêng, 01 phim]'] },
              { label: 'CS thắt lưng L5-S1', keywords: ['Chụp Xquang cột sống thắt lưng L5-S1 thẳng nghiêng [thẳng hoặc nghiêng, 01 phim]'] },

              { header: 'Chi trên' },
              { label: 'Khớp vai', keywords: ['Chụp Xquang khớp vai thẳng [01 phim]'] },
              { label: 'Xương bả vai', keywords: ['Chụp Xquang xương bả vai thẳng nghiêng [thẳng hoặc nghiêng, 01 phim]'] },
              { label: 'Xương cánh tay', keywords: ['Chụp Xquang xương cánh tay thẳng nghiêng [thẳng hoặc nghiêng, 01 phim]'] },
              { label: 'Xương cẳng tay', keywords: ['Chụp Xquang xương cẳng tay thẳng nghiêng [thẳng hoặc nghiêng, 01 phim]'] },
              { label: 'Xương cổ tay', keywords: ['Chụp Xquang xương cổ tay thẳng, nghiêng hoặc chếch [T hoặc N hoặc C, 01 phim]'] },
              { label: 'Bàn, ngón tay', keywords: ['Chụp Xquang xương bàn ngón tay thẳng, nghiêng hoặc chếch [T hoặc N hoặc C, 01 phim]'] },

              { header: 'Chi dưới' },
              { label: 'Khung chậu thẳng', keywords: ['Chụp Xquang khung chậu thẳng [01 phim]'] },
              { label: 'Xương đùi', keywords: ['Chụp Xquang xương đùi thẳng nghiêng [thẳng hoặc nghiêng, 01 phim]'] },
              { label: 'Khớp gối', keywords: ['Chụp Xquang khớp gối thẳng, nghiêng hoặc chếch [01 phim]'] },
              { label: 'Xương cẳng chân', keywords: ['Chụp Xquang xương cẳng chân thẳng nghiêng [thẳng hoặc nghiêng, 01 phim]'] },
              { label: 'Xương cổ chân', keywords: ['Chụp Xquang xương cổ chân thẳng, nghiêng hoặc chếch [01 phim]'] },
              { label: 'Bàn, ngón chân', keywords: ['Chụp Xquang xương bàn, ngón chân thẳng, nghiêng hoặc chếch [01 phim]'] },
              { label: 'Xương gót', keywords: ['Chụp Xquang xương gót thẳng nghiêng [thẳng hoặc nghiêng, 01 phim]'] }
          ] },

        { label: 'Siêu âm / Điện tim', color: '#00838f',
          sub: [
              { header: 'Siêu âm' },
              { label: 'Ổ bụng', keywords: ['Siêu âm ổ bụng'] },
              { label: 'Ổ bụng (gan mật, tụy, lách, thận, bàng quang)', keywords: ['[18.0015.0001] Siêu âm ổ bụng (gan mật, tụy, lách, thận, bàng quang)'] },
              { label: 'Tử cung phần phụ', keywords: ['[18.0018.0001] Siêu âm tử cung phần phụ'] },
              { label: 'Thai nhi 3 tháng đầu', keywords: ['[18.0034.0001] Siêu âm thai nhi trong 3 tháng đầu'] },
              { label: 'Thai nhi 3 tháng giữa', keywords: ['[18.0035.0001] Siêu âm thai nhi trong 3 tháng giữa'] },
              { label: 'Thai nhi 3 tháng cuối', keywords: ['[18.0036.0001] Siêu âm thai nhi trong 3 tháng cuối'] },
              { label: 'Tuyến vú hai bên', keywords: ['[18.0054.0001] Siêu âm tuyến vú hai bên'] },
              { label: 'Tuyến giáp', keywords: ['Siêu âm tuyến giáp'] },
              { label: 'Khớp (gối, háng, khuỷu, cổ tay...)', keywords: ['Siêu âm khớp (gối, háng, khuỷu, cổ tay...)'] },
              { label: 'Phần mềm cổ mặt', keywords: ['Siêu âm cơ phần mềm vùng cổ mặt'] },
              { label: 'Phần mềm (da, dưới da, cơ)', keywords: ['Siêu âm phần mềm (da, tổ chức dưới da, cơ'] },
              { label: 'Tuyến nước bọt', keywords: ['[18.0002.0001] Siêu âm các tuyến nước bọt'] },

              { header: 'Điện tim' },

              { label: 'Điện tim thường', keywords: ['[21.0014.1778] Điện tim thường'] }
          ] },

        { label: 'Thủ thuật', color: '#00695c',
          sub: [
              { label: 'Hút dịch khớp gối', keywords: ['Hút dịch khớp gối'] },
              { label: 'Hút ổ viêm / áp xe phần mềm', keywords: ['Hút ổ viêm/ áp xe phần mềm'] },
              { label: 'Thay băng, cắt chỉ vết mổ (<15cm)', keywords: ['Thay băng, cắt chỉ vết mổ [(vết mổ, nhi + người lớn) (dưới 15cm)]'] },
              { label: 'Khâu vết thương nông (<10cm)', keywords: ['Khâu vết thương phần mềm dài dưới 10cm [tổn thương nông]'] }
          ] },
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
        const all = document.querySelectorAll('#specify-search-kw');
        for (const el of all) {
            if (el.getClientRects().length > 0) return el;
        }
        return all.length ? all[0] : null;
    }

    function getRoot() {
        const inp = getSearchInput();
        if (!inp) return document;
        return inp.closest('.datatable-container') || inp.closest('.ui-g-12') || document;
    }

    function getToolbar() {
        return getRoot().querySelector('.cls-qs-toolbar');
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
        const wrapper = getRoot().querySelector('.ui-table-wrapper');
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
        const wrapper = getRoot().querySelector('.ui-table-wrapper');
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

    function searchTextOf(keyword) {
        return String(keyword).replace(/^\s*\[[^\]]*\]\s*/, '').trim();
    }

    async function searchKeyword(keyword) {
        const input = getSearchInput();
        const submitBtn = getSearchSubmitBtn();
        if (!input || !submitBtn) return false;
        setNativeInputValue(input, searchTextOf(keyword));
        await sleep(80);
        submitBtn.click();
        await waitForTableRefresh();
        return true;
    }

    function findBestMatchingRow(keyword) {
        const rows = getRows();
        const kwLower = keyword.trim().toLowerCase();
        const hasCode = /^\s*\[/.test(keyword);
        const nameOnly = searchTextOf(keyword).toLowerCase();
        let exact = null;
        let contains = null;
        for (const row of rows) {
            const name = getServiceName(row).toLowerCase();
            if (!name) continue;
            if (hasCode) {

                if (!exact && name.startsWith(kwLower)) exact = row;
                if (!contains && name.includes(kwLower)) contains = row;
            } else {
                if (!exact && name.includes('] ' + nameOnly)) exact = row;
                if (!contains && name.includes(nameOnly)) contains = row;
            }
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
        const tb = getToolbar();
        const el = tb ? tb.querySelector('.cls-qs-status') : null;
        if (el) el.textContent = text;
    }

    function setToolbarDisabled(disabled) {
        const toolbar = getToolbar();
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
            const kwShown = searchTextOf(kw);
            setStatus(`[${label}] Đang dò: ${kwShown}`);
            overlaySetText(`Đang dò "${label}"\n${kwShown}`);
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
            const kwShown = searchTextOf(item.kw);
            setStatus(`[${label}] ${action}: ${kwShown}`);
            overlaySetText(`${action} "${label}"\n${kwShown}`);
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
            const errMsg = `Nhóm "${label}": xong ${okCount}, lỗi/không tìm thấy: ${missed.map(searchTextOf).join(', ')}`;
            setStatus(errMsg);
            hideOverlayWithSuccess('Xong, nhưng có mục lỗi — xem dòng trạng thái.', 1400);
        }

        return target === 1 && missed.length === 0;
    }

    const ORDER_KEY = 'hlx_cls_qs_order_v1';
    function loadOrders() {
        try { return JSON.parse(localStorage.getItem(ORDER_KEY) || '{}') || {}; } catch (e) { return {}; }
    }
    function saveOrder(scope, labels) {
        try {
            const o = loadOrders();
            o[scope] = labels;
            localStorage.setItem(ORDER_KEY, JSON.stringify(o));
        } catch (e) {  }
    }
    function sortByOrder(items, scope) {
        const saved = loadOrders()[scope];
        if (!Array.isArray(saved) || !saved.length) return items.slice();
        // Mục đã lưu thứ tự: giữ đúng thứ tự đã lưu
        const known = items.filter(it => saved.indexOf(it.label) >= 0)
            .sort((a, b) => saved.indexOf(a.label) - saved.indexOf(b.label));
        const out = known.slice();
        // Mục mới (chưa có trong thứ tự đã lưu): chèn ngay sau mục đứng trước nó trong danh sách mặc định
        items.forEach((it, i) => {
            if (saved.indexOf(it.label) >= 0) return;
            let pos = 0;
            for (let j = i - 1; j >= 0; j--) {
                const k = out.indexOf(items[j]);
                if (k >= 0) { pos = k + 1; break; }
            }
            out.splice(pos, 0, it);
        });
        return out;
    }

    function orderedSub(group) {
        const saved = loadOrders()['sub:' + group.label];
        if (!Array.isArray(saved) || !saved.length) return group.sub;
        const out = [];
        let seg = [];
        const flush = () => { out.push(...sortByOrder(seg, 'sub:' + group.label)); seg = []; };
        group.sub.forEach(o => { if (o.header) { flush(); out.push(o); } else seg.push(o); });
        flush();
        return out;
    }
    const HANDLE = '⠿ ';

    function enableDrag(container, selector, onDone) {
        const items = Array.from(container.querySelectorAll(selector));
        let dragEl = null;
        items.forEach(el => {
            el.draggable = true;
            el.dataset.hlxSorting = '1';
            el.style.cursor = 'move';
            el.style.outline = '1px dashed #888';
            el.textContent = HANDLE + el.textContent.replace(HANDLE, '');
            el.addEventListener('dragstart', (e) => {
                dragEl = el; el.style.opacity = '0.4';
                e.dataTransfer.effectAllowed = 'move';
                try { e.dataTransfer.setData('text/plain', el.dataset.origLabel || ''); } catch (x) {}
            });
            el.addEventListener('dragend', () => { el.style.opacity = '1'; dragEl = null; onDone && onDone(); });
            el.addEventListener('dragover', (e) => {
                if (!dragEl || dragEl === el || dragEl.parentNode !== el.parentNode) return;

                const sibs = Array.from(el.parentNode.children);
                const a = sibs.indexOf(dragEl), b = sibs.indexOf(el);
                const [lo, hi] = a < b ? [a, b] : [b, a];
                for (let i = lo + 1; i < hi; i++) if (sibs[i].dataset.hlxHeader) return;
                if (sibs[lo].dataset.hlxHeader || sibs[hi].dataset.hlxHeader) return;
                e.preventDefault();
                const r = el.getBoundingClientRect();
                const horizontal = Math.abs(r.top - dragEl.getBoundingClientRect().top) < r.height / 2;
                const after = horizontal ? (e.clientX > r.left + r.width / 2) : (e.clientY > r.top + r.height / 2);
                el.parentNode.insertBefore(dragEl, after ? el.nextSibling : el);
            });
        });
    }
    function disableDrag(container, selector) {
        container.querySelectorAll(selector).forEach(el => {
            el.draggable = false;
            delete el.dataset.hlxSorting;
            el.style.cursor = 'pointer';
            el.style.outline = '';
            el.textContent = el.textContent.replace(HANDLE, '');
        });
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

            orderedSub(group).forEach(opt => {
                if (opt.header) {
                    const h = document.createElement('div');
                    h.dataset.hlxHeader = '1';
                    h.textContent = opt.header;
                    Object.assign(h.style, {
                        fontSize: '11px', fontWeight: '700', color: group.color,
                        textTransform: 'uppercase', letterSpacing: '.3px',
                        padding: '4px 2px 2px', borderBottom: '1px solid #ddd', marginTop: '2px',
                    });
                    menu.appendChild(h);
                    return;
                }
                const optBtn = makeBaseBtn(opt.label, group.color);
                optBtn.style.textAlign = 'left';
                optBtn.style.width = '100%';
                setBtnActive(optBtn, group.color, !!opt.active);
                optBtn.addEventListener('click', async (e2) => {
                    e2.preventDefault(); e2.stopPropagation();
                    menu.querySelectorAll('button').forEach((b) => (b.disabled = true));
                    const isActive = await toggleGroup(opt.label, opt.keywords, optBtn, group.color);
                    opt.active = isActive;
                    menu.querySelectorAll('button').forEach((b) => (b.disabled = false));
                    updateSubMenuParentState(group, btn);
                });
                optBtn.addEventListener('click', (e3) => {
                    if (optBtn.dataset.hlxSorting) { e3.stopImmediatePropagation(); e3.preventDefault(); }
                }, true);
                menu.appendChild(optBtn);
            });

            const sortBtn = makeBaseBtn('↕ Sắp xếp', '#607d8b');
            sortBtn.style.marginTop = '4px';
            sortBtn.style.width = '100%';
            let sorting = false;
            const optSel = 'button:not([data-hlx-sort-btn])';
            sortBtn.dataset.hlxSortBtn = '1';
            sortBtn.addEventListener('click', (e4) => {
                e4.preventDefault(); e4.stopPropagation();
                sorting = !sorting;
                if (sorting) {
                    sortBtn.textContent = '✔ Xong';
                    enableDrag(menu, optSel, () => {
                        saveOrder('sub:' + group.label,
                            Array.from(menu.querySelectorAll(optSel)).map(b => b.dataset.origLabel));
                    });
                } else {
                    sortBtn.textContent = '↕ Sắp xếp';
                    disableDrag(menu, optSel);
                }
            });
            menu.appendChild(sortBtn);

            const rect = btn.getBoundingClientRect();
            menu.style.top = (rect.bottom + 4) + 'px';
            menu.style.left = rect.left + 'px';
            document.body.appendChild(menu);
            (function clampMenu() {
                const mr = menu.getBoundingClientRect();
                if (mr.right > window.innerWidth - 8) menu.style.left = Math.max(8, window.innerWidth - mr.width - 8) + 'px';
                if (mr.bottom > window.innerHeight - 8) {
                    const newTop = Math.max(8, window.innerHeight - mr.height - 8);
                    menu.style.top = newTop + 'px';
                    if (mr.height > window.innerHeight - 16) {
                        menu.style.maxHeight = (window.innerHeight - 16) + 'px';
                        menu.style.overflowY = 'auto';
                    }
                }
            })();

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

    let clsLastPatientKey = null;
    function clsGetPatientKey() {
        const boxes = Array.from(document.querySelectorAll('[data-bootstro-title="TT bệnh nhân"]'));
        const box = boxes.find((b) => b.offsetParent !== null) || null;
        if (!box) return null;
        const inp = box.querySelector('input');
        const code = inp ? String(inp.value || '').trim() : '';
        const txt = String(box.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120);
        return code + '|' + txt;
    }
    function clsResetSelectionState() {
        GROUPS.forEach((g) => { if (g.sub) g.sub.forEach((o) => { o.active = false; }); });
        document.querySelectorAll('[id^="cls_submenu_"]').forEach((m) => m.remove());
        document.querySelectorAll('.cls-qs-toolbar').forEach((t) => t.remove());
    }

    function injectToolbar() {
        const patientKey = clsGetPatientKey();
        if (patientKey !== null) {
            if (clsLastPatientKey !== null && patientKey !== clsLastPatientKey) clsResetSelectionState();
            clsLastPatientKey = patientKey;
        }
        document.querySelectorAll('.cls-qs-toolbar').forEach(t => {
            const prev = t.previousElementSibling;
            if (!prev || !prev.querySelector('#specify-search-kw')) t.remove();
        });
        const searchForm = getSearchForm();
        if (!searchForm) return;

        // Vùng "Chỉ định giường/dịch vụ khác" (nội trú): không hiện chọn nhanh
        const qsTab = searchForm.closest('p-accordiontab');
        const qsTabHead = qsTab && qsTab.querySelector('.p-accordion-header-text');
        const qsTabText = qsTabHead ? qsTabHead.textContent.replace(/\s+/g, ' ').trim().normalize('NFC').toLowerCase() : '';
        if (qsTabText.indexOf('chỉ định giường') !== -1) {
            document.querySelectorAll('.cls-qs-toolbar').forEach(t => {
                if (qsTab.contains(t)) t.remove();
            });
            // Tự điền sẵn mã giường để chỉ hiện 1 mục (chỉ điền 1 lần cho mỗi ô; bạn xóa thì không điền lại)
            const presetInp = searchForm.querySelector('#specify-search-kw');
            const presetBtn = searchForm.querySelector('button[type="submit"]');
            if (presetInp && !presetInp.dataset.hlxPreset) {
                presetInp.dataset.hlxPreset = '1';
                setNativeInputValue(presetInp, 'K02.HSCC');
                setTimeout(() => { if (presetBtn) presetBtn.click(); }, 150);
            }
            return;
        }

        const header = searchForm.closest('.ui-widget-header');
        if (!header || !header.parentNode) return;
        const nxt = header.nextElementSibling;
        if (nxt && nxt.classList.contains('cls-qs-toolbar')) return;

        const toolbar = document.createElement('div');
        toolbar.className = 'cls-qs-toolbar';
        Object.assign(toolbar.style, {
            display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center',
            padding: '6px 10px', background: '#eef2f7', borderBottom: '1px solid #c8d3e0',
            width: '100%', boxSizing: 'border-box', clear: 'both',
        });

        const label = document.createElement('span');
        label.textContent = '⚡ Chọn nhanh:';
        Object.assign(label.style, {
            fontSize: '11px', fontWeight: '700', color: '#555',
            marginRight: '4px', whiteSpace: 'nowrap',
        });
        toolbar.appendChild(label);

        sortByOrder(GROUPS, 'main').forEach(g => {
            if (g.sub) {
                toolbar.appendChild(makeSubMenuBtn(g));
            } else {
                toolbar.appendChild(makeGroupBtn(g.label, g.color, g.keywords));
            }
        });

        const mainSortBtn = makeBaseBtn('↕ Sắp xếp', '#607d8b');
        mainSortBtn.dataset.hlxSortBtn = '1';
        let mainSorting = false;
        const mainSel = 'button:not([data-hlx-sort-btn])';
        mainSortBtn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            mainSorting = !mainSorting;
            if (mainSorting) {
                mainSortBtn.textContent = '✔ Xong';
                document.querySelectorAll('[id^="cls_submenu_"]').forEach(m => m.remove());
                enableDrag(toolbar, mainSel, () => {
                    saveOrder('main', Array.from(toolbar.querySelectorAll(mainSel))
                        .map(b => (b.dataset.origLabel || '').replace(/ ▾$/, '')));
                });
            } else {
                mainSortBtn.textContent = '↕ Sắp xếp';
                disableDrag(toolbar, mainSel);
            }
        });

        toolbar.addEventListener('click', (e) => {
            const b = e.target.closest('button');
            if (b && b.dataset.hlxSorting) { e.stopImmediatePropagation(); e.preventDefault(); }
        }, true);
        toolbar.appendChild(mainSortBtn);

        const status = document.createElement('span');
        status.className = 'cls-qs-status';
        Object.assign(status.style, {
            marginLeft: '10px', fontSize: '11px', color: '#333', fontStyle: 'italic',
        });
        toolbar.appendChild(status);

        header.parentNode.insertBefore(toolbar, header.nextSibling);
    }

    let clsQsTimer = null;
    function scheduleEnsure() {
        if (clsQsTimer) return;
        clsQsTimer = setTimeout(() => {
            clsQsTimer = null;
            try { injectToolbar(); } catch (e) {  }
        }, 120);
    }
    const clsQsMainObserver = new MutationObserver(scheduleEnsure);
    clsQsMainObserver.observe(document.body, { childList: true, subtree: true });
    setInterval(scheduleEnsure, 1500);

    setTimeout(injectToolbar, 1000);

})();

(function hlxStarInit() {
  'use strict';
  if (window.__hlxIsEnabled && !window.__hlxIsEnabled()) { setTimeout(hlxStarInit, 1500); return; }

  const STAR_DATA_URI =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#FFE066"/>' +
      '<stop offset="1" stop-color="#F5A623"/>' +
      '</linearGradient></defs>' +
      '<path fill="url(#g)" stroke="#D98A0B" stroke-width="1.5" stroke-linejoin="round" ' +
      'd="M32 4l7.9 16.5 18 2.4-13.1 12.6 3.3 18-16.1-8.9-16.1 8.9 3.3-18L6.1 22.9l18-2.4z"/>' +
      '</svg>'
    );
  const STAR_FLAG_ATTR = 'data-hlx-star';
  const BHYT_EMPTY_TEXT = 'DỊCH VỤ';
  const STAR_ANIM_STYLE_ID = 'hlx-star-anim-style';

  function ensureStarAnimStyle() {
    if (document.getElementById(STAR_ANIM_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STAR_ANIM_STYLE_ID;
    style.textContent =
      '@keyframes hlxStarSpinPulse {' +
      '0%   { transform: rotate(0deg) scale(1); }' +
      '25%  { transform: rotate(90deg) scale(1.35); }' +
      '50%  { transform: rotate(180deg) scale(1); }' +
      '75%  { transform: rotate(270deg) scale(0.85); }' +
      '100% { transform: rotate(360deg) scale(1); }' +
      '}' +
      '.hlx-star-icon {' +
      'animation: hlxStarSpinPulse 2.2s linear infinite;' +
      'transform-origin: center center;' +
      'display: inline-block;' +
      '}';
    document.head.appendChild(style);
  }

  function processRow(tr) {
    const bhytTd = tr.querySelector('td[pltablecolumncell="MODULE.HIS.health_insurance_id"]');
    let isDichVu = false;
    if (bhytTd) {
      if (!bhytTd.hasAttribute(STAR_FLAG_ATTR)) {
        const txt = (bhytTd.textContent || '').trim();
        if (txt === '') {
          bhytTd.textContent = BHYT_EMPTY_TEXT;
        }
        bhytTd.setAttribute(STAR_FLAG_ATTR, '1');
      }
      isDichVu = (bhytTd.textContent || '').trim() === BHYT_EMPTY_TEXT;
    }

    const nameTd = tr.querySelector('td[pltablecolumncell="full_name"]');
    if (nameTd && !nameTd.hasAttribute(STAR_FLAG_ATTR)) {
      if (isDichVu) {
        ensureStarAnimStyle();
        const star = document.createElement('img');
        star.src = STAR_DATA_URI;
        star.alt = '⭐';
        star.className = 'hlx-star-icon';
        Object.assign(star.style, {
          width: '20px',
          height: '20px',
          marginLeft: '4px',
          verticalAlign: 'middle',
        });
        nameTd.appendChild(star);
      }
      nameTd.setAttribute(STAR_FLAG_ATTR, '1');
    }
  }

  // Chuẩn hóa tên: bỏ mã "[26NT00478] " đứng đầu ô Họ tên (giữ mã trong tooltip + data-hlx-code)
  const NAME_CODE_RE = /^(\s*)\[([^\]]+)\]\s*/;
  function stripNameCode(tr) {
    const td = tr.querySelector('td[pltablecolumncell="full_name"]');
    if (!td) return;
    const w = document.createTreeWalker(td, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      if (!n.nodeValue.trim()) continue;
      const m = NAME_CODE_RE.exec(n.nodeValue);
      if (m) {
        td.setAttribute('data-hlx-code', m[2]);
        if (!td.title) td.title = 'Mã tiếp nhận: ' + m[2];
        n.nodeValue = n.nodeValue.replace(NAME_CODE_RE, '$1');
      }
      break; // chỉ xét text đầu tiên của ô
    }
  }

  function processTable() {
    document
      .querySelectorAll('.p-datatable-tbody > tr')
      .forEach(tr => { processRow(tr); try { stripNameCode(tr); } catch (e) {} });
  }

  const hlxRowObserver = new MutationObserver(() => {
    processTable();
  });
  hlxRowObserver.observe(document.body, { childList: true, subtree: true });

  setInterval(processTable, 1000);
  setTimeout(processTable, 500);

  // ===== Kéo chỉnh độ rộng cột bảng (danh sách bệnh nhân...) + nhấp đúp ranh giới để tự vừa nội dung =====
  (function hlxColumnResize() {
    let hlxOffLocal = false;
    try { hlxOffLocal = localStorage.getItem('helixfast_enabled') === '0'; } catch (err) {}
    if (hlxOffLocal) return;
    const rsOn = () => { try { return window.__hlxIsEnabled ? !!window.__hlxIsEnabled() : true; } catch (err) { return true; } };
    const LS_KEY = 'hlx_colw_v1';
    const MIN_W = 30;
    const MAX_AUTO_W = 700;
    let store = {};
    try { store = JSON.parse(localStorage.getItem(LS_KEY) || '{}') || {}; } catch (err) { store = {}; }
    const save = () => { try { localStorage.setItem(LS_KEY, JSON.stringify(store)); } catch (err) {} };
    const esc = (v) => String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"');

    const styleEl = document.createElement('style');
    styleEl.id = 'hlx-rs-style';
    const measureEl = document.createElement('style');
    measureEl.id = 'hlx-rs-measure';
    (document.head || document.documentElement).appendChild(styleEl);
    (document.head || document.documentElement).appendChild(measureEl);

    const baseCss = `
      body.hlx-rs-hot, body.hlx-rs-hot *, body.hlx-rs-dragging, body.hlx-rs-dragging * { cursor: col-resize !important; user-select: none !important; }
    `;
    function rebuildCss() {
      let css = baseCss;
      document.querySelectorAll('table[data-hlx-rs]').forEach((t) => {
        const key = t.getAttribute('data-hlx-rs');
        const cols = store[key];
        if (!cols || t.__hlxRsDone) return;
      });
      const seen = new Set();
      document.querySelectorAll('table[data-hlx-rs]').forEach((t) => {
        const key = t.getAttribute('data-hlx-rs');
        if (seen.has(key)) return;
        seen.add(key);
        const cols = store[key] || {};
        Object.keys(cols).forEach((c) => {
          const w = cols[c];
          css += 'table[data-hlx-rs="' + esc(key) + '"] [pltablecolumncell="' + esc(c) + '"]{width:' + w + 'px !important;min-width:' + w + 'px !important;max-width:' + w + 'px !important;}\n';
        });
      });
      if (styleEl.textContent !== css) styleEl.textContent = css;
    }

    function tableKey(table) {
      const names = Array.from(table.querySelectorAll('thead th[pltablecolumncell]')).map((th) => th.getAttribute('pltablecolumncell'));
      if (!names.length) return '';
      return names.join('|');
    }
    function shown(el) { return el.getClientRects().length > 0; }

    function setWidth(table, col, w) {
      const key = table.getAttribute('data-hlx-rs');
      w = Math.max(MIN_W, Math.round(w));
      (store[key] = store[key] || {})[col] = w;
      rebuildCss();
    }

    function autoFit(table, th) {
      const col = th.getAttribute('pltablecolumncell');
      const key = table.getAttribute('data-hlx-rs');
      const sel = 'table[data-hlx-rs="' + esc(key) + '"] [pltablecolumncell="' + esc(col) + '"]';
      // Bỏ khóa độ rộng cột này, cho nội dung tự giãn một dòng rồi đo
      const saved = store[key] && store[key][col];
      if (store[key]) delete store[key][col];
      rebuildCss();
      measureEl.textContent = sel + '{width:auto !important;min-width:0 !important;max-width:none !important;white-space:nowrap !important;}';
      const w = th.getBoundingClientRect().width;
      measureEl.textContent = '';
      if (!(w > 0)) { if (saved) { store[key][col] = saved; rebuildCss(); } return; }
      setWidth(table, col, Math.min(MAX_AUTO_W, Math.ceil(w) + 2));
      save();
    }

    function attach(table) {
      const key = tableKey(table);
      if (!key) return;
      if (table.getAttribute('data-hlx-rs') !== key) {
        table.setAttribute('data-hlx-rs', key);
        rebuildCss();
      }
    }

    // Nhận diện ranh giới cột theo vị trí chuột (không phụ thuộc phần tử chèn vào <th>, tránh bị che/cắt/render lại)
    const EDGE = 6;
    function edgeTh(e) {
      const t = e.target;
      if (!t || !t.closest) return null;
      const th = t.closest('thead th[pltablecolumncell]');
      if (!th) return null;
      const table = th.closest('table');
      if (!table) return null;
      const r = th.getBoundingClientRect();
      let hit = null;
      if (r.right - e.clientX <= EDGE && r.right - e.clientX >= -2) hit = th;
      else if (e.clientX - r.left <= 3) {
        let p = th.previousElementSibling;
        while (p && !shown(p)) p = p.previousElementSibling;
        if (p && p.hasAttribute('pltablecolumncell')) hit = p;
      }
      return hit ? { th: hit, table } : null;
    }

    const lineEl = document.createElement('div');
    lineEl.id = 'hlx-rs-line';
    lineEl.style.cssText = 'position:fixed;width:2px;background:#2563eb;z-index:2147483000;pointer-events:none;display:none;';
    (document.body || document.documentElement).appendChild(lineEl);
    function showLine(th) {
      const r = th.getBoundingClientRect();
      lineEl.style.left = (r.right - 1) + 'px';
      lineEl.style.top = r.top + 'px';
      lineEl.style.height = (th.closest('table').getBoundingClientRect().bottom - r.top) + 'px';
      lineEl.style.display = 'block';
    }
    function hideLine() { lineEl.style.display = 'none'; }

    let hot = null;
    let drag = null;
    document.addEventListener('mousemove', (e) => {
      if (!rsOn()) return;
      if (drag) {
        const dx = e.clientX - drag.x;
        if (Math.abs(dx) > 2) drag.moved = true;
        setWidth(drag.table, drag.col, drag.w + dx);
        showLine(drag.th);
        e.preventDefault();
        return;
      }
      const hit = edgeTh(e);
      if (hit) {
        attach(hit.table);
        hot = hit;
        document.body.classList.add('hlx-rs-hot');
        showLine(hit.th);
      } else if (hot) {
        hot = null;
        document.body.classList.remove('hlx-rs-hot');
        hideLine();
      }
    }, true);
    document.addEventListener('mousedown', (e) => {
      if (e.button !== 0 || !rsOn()) return;
      const hit = edgeTh(e);
      if (!hit) return;
      attach(hit.table);
      e.preventDefault();
      e.stopPropagation();
      drag = { table: hit.table, th: hit.th, col: hit.th.getAttribute('pltablecolumncell'), x: e.clientX, w: hit.th.getBoundingClientRect().width, moved: false };
      document.body.classList.add('hlx-rs-dragging');
    }, true);
    document.addEventListener('mouseup', () => {
      if (!drag) return;
      document.body.classList.remove('hlx-rs-dragging');
      if (drag.moved) save();
      drag = null;
      hideLine();
    }, true);
    document.addEventListener('click', (e) => {
      if (rsOn() && edgeTh(e)) { e.preventDefault(); e.stopPropagation(); }
    }, true);
    document.addEventListener('dblclick', (e) => {
      if (!rsOn()) return;
      const hit = edgeTh(e);
      if (!hit) return;
      e.preventDefault();
      e.stopPropagation();
      attach(hit.table);
      autoFit(hit.table, hit.th);
      showLine(hit.th);
    }, true);

    function scan() {
      try {
        if (!rsOn()) return;
        document.querySelectorAll('table').forEach((t) => {
          if (t.querySelector('thead th[pltablecolumncell]')) attach(t);
        });
      } catch (err) {}
    }
    let t = null;
    new MutationObserver(() => { if (t) return; t = setTimeout(() => { t = null; scan(); }, 250); })
      .observe(document.body, { childList: true, subtree: true });
    setInterval(scan, 1500);
    setTimeout(scan, 500);
    rebuildCss();
    try { console.log('[Helixfast] Kéo cột: sẵn sàng'); } catch (err) {}
  })();

})();
