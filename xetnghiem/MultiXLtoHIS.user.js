// ==UserScript==
// @name         MultiXL -> HIS
// @namespace    his-bd-multixl-ocr
// @version      6.7
// @description  Tải/dán nhiều ảnh MultiXL, thu thập (SID máy, xét nghiệm, kết quả) 1 lần; chọn từng bệnh nhân trên web thì tự dò SID và điền vào ô trống
// @match        https://his.benhvienbinhduong.org.vn/his/laboratory-report-all-new/*
// @grant        none
// @run-at       document-idle
// @updateURL    https://github.com/bsdha/bsdha.github.io/raw/refs/heads/main/xetnghiem/MultiXLtoHIS.user.js
// @downloadURL  https://github.com/bsdha/bsdha.github.io/raw/refs/heads/main/xetnghiem/MultiXLtoHIS.user.js
// ==/UserScript==

(function () {
  'use strict';
  console.log('[MultiXL] script đã chạy v6.7');

  /* ============ CẤU HÌNH ============ */
  // Máy: 6 chữ số bắt đầu bằng 0 (vd 012132) -> web 5 chữ số (12132);
  //      hoặc đúng 5 chữ số (vd 12132) -> giống y hệt web. Mã khác (1 ký tự, 7 ký tự như 0012277...) bị bỏ qua.
  function machineToWebSid(m) {
    if (/^0\d{5}$/.test(m)) return m.slice(1);
    if (/^\d{5}$/.test(m)) return m;
    return null;
  }

  const CODE_TO_GROUP = {
    GLU: 'glu', CREA1: 'crea', CHOLE: 'chol', HDLC1: 'hdl', TRI1: 'tri',
    SGPT: 'alt', GPT01: 'alt', SGOT: 'ast', GOT01: 'ast',
    GGT: 'ggt', AU1: 'uric', BUN1: 'ure',
  };
  // Số chữ số thập phân CỐ ĐỊNH máy MultiXL in ra cho từng xét nghiệm (theo ảnh: GLU 4.9, CREA1 81.08, CHOLE 5.34...).
  // Dùng để dựng lại dấu chấm khi OCR làm mất nó (4.9 bị đọc thành 49) và để loại số sai định dạng.
  const CODE_DEC = {
    GLU: 1, CREA1: 2, CHOLE: 2, HDLC1: 2, TRI1: 2,
    SGPT: 1, GPT01: 1, SGOT: 1, GOT01: 1, GGT: 1, AU1: 1, BUN1: 1,
  };
  function fixVal(code, raw) {
    let v = String(raw).replace(/[Oo]/g, '0');
    if (/^N\/?A$/i.test(v)) return 'NA';
    const dec = CODE_DEC[code];
    if (dec != null && /^\d+$/.test(v) && v.length > dec) v = v.slice(0, -dec) + '.' + v.slice(-dec); // 49 -> 4.9 ; 8108 -> 81.08
    return v;
  }
  function validVal(code, v) {
    const dec = CODE_DEC[code];
    return dec != null && new RegExp('^\\d+\\.\\d{' + dec + '}$').test(v);
  }
  // Khoảng tham chiếu theo nhóm xét nghiệm (đơn vị như máy MultiXL: mmol/L, µmol/L, U/L). Sửa tại đây nếu cần.
  //  n = bình thường (ngoài khoảng -> hiện mũi tên ↑/↓)
  //  w = ngưỡng "cao/thấp BẤT THƯỜNG" -> cảnh báo đỏ, vẫn cho điền nhưng phải kiểm tra lại
  //  h = ngưỡng gần như không thể xảy ra (thường là OCR đọc sai) -> cảnh báo và KHÔNG dùng số này
  //  null = không giới hạn phía đó. HDL không đặt n vì khoảng của máy (0–0.9) không phản ánh thực tế.
  const REF = {
    glu:  { n: [4.1, 6.2],    w: [2.5, 20],    h: [0.5, 45] },
    crea: { n: [44, 106],     w: [30, 400],    h: [15, 2000] },
    chol: { n: [0, 5.18],     w: [null, 9],    h: [0.5, 20] },
    hdl:  { n: null,          w: [0.4, 2.5],   h: [0.1, 5] },
    tri:  { n: [0, 1.7],      w: [0.2, 5],     h: [0.05, 40] },
    alt:  { n: [0, 40],       w: [null, 200],  h: [null, 3000] },
    ast:  { n: [0, 37],       w: [null, 200],  h: [null, 3000] },
    ggt:  { n: [0, 38],       w: [null, 300],  h: [null, 2000] },
    uric: { n: [155, 428],    w: [100, 700],   h: [30, 1200] },
    ure:  { n: [2.5, 6.6],    w: [1.5, 25],    h: [0.3, 100] },
  };
  const out = (x, b) => b && ((b[0] != null && x < b[0]) || (b[1] != null && x > b[1]));
  // trả về { lv: 'ok'|'warn'|'block', txt, arrow }
  function assess(g, v) {
    const r = REF[g], x = parseFloat(v);
    if (!r || isNaN(x)) return { lv: 'ok', txt: '', arrow: '' };
    const dir = (b) => (b[1] != null && x > b[1] ? 'cao' : 'thấp');
    if (out(x, r.h)) return { lv: 'block', txt: `${dir(r.h)} phi lý (${x})`, arrow: '' };
    if (out(x, r.w)) return { lv: 'warn', txt: `${dir(r.w)} bất thường`, arrow: x > (r.w[1] ?? Infinity) ? ' ↑↑' : ' ↓↓' };
    if (out(x, r.n)) return { lv: 'ok', txt: '', arrow: x > (r.n[1] ?? Infinity) ? ' ↑' : ' ↓' };
    return { lv: 'ok', txt: '', arrow: '' };
  }
  const GROUP_REGEX = {
    glu: /glucose/, crea: /creatinin/, chol: /cholesterol/, hdl: /hdl/, tri: /triglycerid/,
    alt: /\balt\b|gpt/, ast: /\bast\b|got/, ggt: /ggt|gamma/, uric: /uric/, ure: /\bure\b/,
  };
  const GROUP_LABEL = {
    glu: 'Glucose', crea: 'Creatinin', chol: 'Cholesterol TP', hdl: 'HDL-C', tri: 'Triglycerid',
    alt: 'ALT (GPT)', ast: 'AST (GOT)', ggt: 'GGT', uric: 'Acid uric', ure: 'Urê',
  };

  /* ============ TIỆN ÍCH ============ */
  const norm = (s) =>
    (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/\s+/g, ' ').trim();
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function currentSid() {
    const el = document.querySelector('input[style*="color: red"]');
    const v = el ? el.value.trim() : '';
    return /^\d{5}$/.test(v) ? v : null;
  }
  function setValue(el, v) {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setter.call(el, v);
    ['input', 'change', 'blur'].forEach((e) => el.dispatchEvent(new Event(e, { bubbles: true })));
  }
  function webRows() {
    const out = [];
    for (const tr of document.querySelectorAll('#tb-result tbody tr')) {
      const ta = tr.querySelector('textarea.inpt-lab-result');
      if (!ta || /LabUReader|Ruby/i.test(tr.textContent)) continue;
      const nameTd = tr.querySelector('td[colspan="1"]') || tr.querySelectorAll('td')[3];
      const name = norm(nameTd && nameTd.textContent);
      if (!name) continue;
      for (const [g, re] of Object.entries(GROUP_REGEX)) {
        if (g === 'chol' && /hdl/.test(name)) continue;
        if (re.test(name)) { out.push({ group: g, name: nameTd.textContent.replace(/\s+/g, ' ').trim(), ta }); break; }
      }
    }
    return out;
  }

  /* ============ OCR (worker tải sẵn; mỗi ảnh đọc TỪNG DÒNG, mỗi dòng 3-5 lần rồi lấy theo đa số) ============ */
  // Bố cục MultiXL "Patient Report" chụp 1366x768. Chỉ cắt 3 cột: Sample ID | Test | Result rồi ghép lại
  // (bỏ hết cột khác nên máy đọc ít nhầm hơn và nhanh hơn). Toạ độ theo pixel ảnh 1366x768, tự co theo kích thước ảnh.
  const BASE_W = 1366, BASE_H = 768;
  const COLS = [[248, 326], [630, 690], [693, 765]];       // Sample ID, Test, Result
  const ROW_PITCH = 18, ROW_BAND0 = 293, COL_GAP = 18, N_BANDS = 24; // lưới MultiXL: 24 dòng/ảnh, mỗi dòng cao 18px
  const PASSES = [{ s: 4, th: 140 }, { s: 5, th: 130 }, { s: 3, th: 120 }, { s: 6, th: 135 }, { s: 2, th: 150 }]; // (độ phóng, ngưỡng đen-trắng)
  // Số worker đọc ảnh song song (chọn trên giao diện: ×1 ... ×10, nhớ lại lần sau). Mỗi worker ~100MB RAM.
  let POOL = (() => {
    const v = +localStorage.getItem('mx-pool');
    return [1, 2, 4, 6, 8, 10].includes(v) ? v : Math.min(4, navigator.hardwareConcurrency || 2);
  })();
  let poolPromise = null, ocrState = 'đang tải bộ đọc ảnh...';
  const progressCbs = [], passIdx = [];
  function ensureTesseract() {
    if (window.Tesseract) return Promise.resolve();
    return new Promise((res, rej) => {
      const sc = document.createElement('script');
      sc.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      sc.onload = res;
      sc.onerror = () => rej(new Error('Không tải được thư viện OCR (mạng/trình duyệt chặn cdn.jsdelivr.net)'));
      document.head.appendChild(sc);
    });
  }
  function getPool() {
    if (!poolPromise) {
      poolPromise = (async () => {
        await ensureTesseract();
        const ws = await Promise.all(Array.from({ length: POOL }, (_, i) =>
          Tesseract.createWorker('eng', 1, { logger: (m) => progressCbs[i] && progressCbs[i](m) })));
        for (const w of ws) {
          await w.setParameters({
            tessedit_pageseg_mode: '7', preserve_interword_spaces: '1',
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789. ',
          });
        }
        ocrState = 'bộ đọc ảnh sẵn sàng (×' + POOL + ')';
        renderTop();
        return ws;
      })().catch((e) => { poolPromise = null; ocrState = 'LỖI tải bộ đọc ảnh: ' + e.message; renderTop(); throw e; });
    }
    return poolPromise;
  }

  const KNOWN_CODES = Object.keys(CODE_TO_GROUP);
  function lev(a, b) {
    let d = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const p = d.slice(); d[0] = i;
      for (let j = 1; j <= b.length; j++) d[j] = Math.min(p[j] + 1, d[j - 1] + 1, p[j - 1] + (a[i - 1] !== b[j - 1] ? 1 : 0));
    }
    return d[b.length];
  }
  // Sửa lỗi OCR nhỏ ở mã xét nghiệm (CREAI1->CREA1, AU->AU1, TRI->TRI1, GOTO1->GOT01...). Không chắc chắn -> null.
  function fixCode(tok) {
    const base = tok.toUpperCase().replace(/[^A-Z0-9]/g, '');
    for (const v of [base, base.replace(/O/g, '0')]) if (CODE_TO_GROUP[v]) return v;
    if (base.length < 2) return null;
    const b0 = base.replace(/O/g, '0');
    for (const q of [base, b0]) {
      const c = KNOWN_CODES.filter((x) => lev(q, x) <= 1);
      if (c.length === 1) return c[0];
    }
    return null;
  }
  // Mỗi dòng sau khi ghép cột có dạng: SID  MÃ-XÉT-NGHIỆM  KẾT-QUẢ
  function parseLines(text) {
    const rows = [];
    text.split(/\r?\n/).forEach((line) => {
      const t = line.trim().split(/\s+/).filter(Boolean);
      if (t.length < 3) return;
      let i = -1;
      for (let k = 1; k < t.length; k++) if (fixCode(t[k])) { i = k; break; }
      if (i < 1 || i + 1 >= t.length) return;
      const sid = t[0].replace(/[Oo]/g, '0');
      if (!/^\d+$/.test(sid)) return;
      const code = fixCode(t[i]);
      // cột Result là phần cuối dòng; nếu OCR tách "4 9" hay "4 . 9" thì ghép lại trước khi dựng dấu chấm
      const val = fixVal(code, t.slice(i + 1).join(''));
      rows.push({ sid, code, val, raw: `${sid} ${code} ${val}` });
    });
    return rows;
  }
  // Quyết định 1 dòng từ các lần đọc: (mã XN + số) phải được >=2 lần đọc giống nhau và dẫn đầu rõ ràng; ngược lại -> không chắc.
  function decideBand(votes) {
    const c = votes.filter(Boolean);
    if (!c.length) return { why: 'có chữ nhưng không đọc được' };
    const g = new Map();
    c.forEach((v) => { const k = v.code + '|' + v.val; g.set(k, (g.get(k) || 0) + 1); });
    const top = [...g].sort((x, y) => y[1] - x[1]);
    if (top[0][1] < 2 || (top[1] && top[1][1] === top[0][1])) return { why: 'đọc không chắc chắn: ' + c.map((v) => v.raw).join(' ; ') };
    const [code, val] = top[0][0].split('|');
    const sc = new Map();
    c.filter((v) => v.code === code && v.val === val).forEach((v) => sc.set(v.sid, (sc.get(v.sid) || 0) + 1));
    const st = [...sc].sort((x, y) => y[1] - x[1]);
    let sid = st[0][0];
    if (st[1] && st[1][1] === st[0][1]) {
      const pl = st.filter((x) => x[1] === st[0][1] && machineToWebSid(x[0]));
      if (pl.length === 1) sid = pl[0][0];
      else if (pl.length > 1) return { why: `Sample ID không chắc chắn (${st.map((x) => x[0]).join(' / ')}) cho ${code} ${val}` };
    }
    return { row: { sid, code, val, raw: `${sid} ${code} ${val}` } };
  }

  // Cắt 1 dòng (3 cột), ghép cạnh nhau, đổi sang đen-trắng. Mỗi cột tự quyết định đảo màu (dòng đang chọn: nền xanh, chữ trắng).
  // Trả về cả tỉ lệ điểm đen (ink): gần 0 = dòng trống (hết danh sách).
  function renderBand(bmp, b, S, TH) {
    const kx = bmp.width / BASE_W, ky = bmp.height / BASE_H;
    const y0 = ROW_BAND0 + b * ROW_PITCH;
    const W = COLS.reduce((a, [x0, x1]) => a + (x1 - x0), 0) + COL_GAP * (COLS.length + 1);
    const c = document.createElement('canvas');
    c.width = W * S; c.height = ROW_PITCH * S;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    g.imageSmoothingQuality = 'high';
    const spans = []; let x = COL_GAP;
    COLS.forEach(([x0, x1]) => {
      g.drawImage(bmp, x0 * kx, y0 * ky, (x1 - x0) * kx, ROW_PITCH * ky, x * S, 0, (x1 - x0) * S, ROW_PITCH * S);
      spans.push([x * S, (x + x1 - x0) * S]);
      x += (x1 - x0) + COL_GAP;
    });
    const img = g.getImageData(0, 0, c.width, c.height), d = img.data, w = c.width, h = c.height;
    let black = 0;
    for (const [xa, xb] of spans) {
      let tot = 0, n = 0;
      for (let y = 0; y < h; y += 3) for (let xx = xa; xx < xb; xx += 3) { const o = (y * w + xx) * 4; tot += 0.299 * d[o] + 0.587 * d[o + 1] + 0.114 * d[o + 2]; n++; }
      const inv = n && tot / n < 170;
      for (let y = 0; y < h; y++) for (let xx = xa; xx < xb; xx++) {
        const o = (y * w + xx) * 4, v = 0.299 * d[o] + 0.587 * d[o + 1] + 0.114 * d[o + 2];
        const isBlack = inv ? v > 200 : v < TH;
        d[o] = d[o + 1] = d[o + 2] = isBlack ? 0 : 255; d[o + 3] = 255;
        if (isBlack) black++;
      }
    }
    g.putImageData(img, 0, 0);
    return { cv: c, ink: black / (w * h) };
  }

  // Đọc TỪNG DÒNG (24 dòng/ảnh) -> biết chắc ảnh có bao nhiêu dòng, dòng nào đọc không chắc thì báo đích danh.
  async function ocrBlob(blob, w, wi, onBand) {
    const bmp = await createImageBitmap(blob);
    const ratio = bmp.width / bmp.height;
    const warns = [];
    if (Math.abs(ratio - BASE_W / BASE_H) > 0.08 || bmp.width < 900)
      warns.push('Ảnh không đúng mẫu MultiXL toàn màn hình (1366×768) – kết quả có thể sai, hãy kiểm tra kỹ.');
    const rows = []; let seen = 0, unsure = 0;
    for (let b = 0; b < N_BANDS; b++) {
      if (onBand) onBand(b);
      const votes = []; let blank = false;
      for (let p = 0; p < PASSES.length; p++) {
        const { cv, ink } = renderBand(bmp, b, PASSES[p].s, PASSES[p].th);
        if (p === 0 && ink < 0.012) { blank = true; break; }
        const r = parseLines((await w.recognize(cv)).data.text);
        votes.push(r[0] || null);
        if (p === 2 && votes.every((v) => v && v.raw === votes[0].raw)) break; // 3 lần giống hệt -> xong
      }
      if (blank) continue;
      seen++;
      const dec = decideBand(votes);
      if (dec.row) rows.push(dec.row);
      else { unsure++; warns.push(`Dòng thứ ${b + 1} (từ trên xuống) ${dec.why} – chưa tính, hãy kiểm tra ảnh.`); }
    }
    if (bmp.close) bmp.close();
    return { rows, warns, seen, unsure };
  }

  /* ============ KHO DỮ LIỆU THU THẬP ============ */
  const store = new Map();      // webSid -> Map(group -> Map(val -> {raw,img}))
  const rejected = new Map();   // mã máy bị bỏ vì sai quy tắc (sid -> số dòng)
  const imgLog = [];            // {name,status,warns[]}
  const flagged = [];           // số bất thường/nghi đọc sai/nhiều số: {k,sid,label,val,lv:'block'|'warn'|'fmt'|'conf',txt,img}
  const allLines = new Map();   // sid|mã|số -> {img,n}: nhận ra dòng trùng giữa các ảnh chụp gối nhau
  const seenSids = new Set();   // mọi SID web có >=1 kết quả số (kể cả số nghi sai/không điền)
  let resultLines = 0, naLines = 0, rejLines = 0, fmtLines = 0, dupLines = 0, seenTotal = 0, unsureTotal = 0, dataVersion = 0;
  function setFlag(k, f) {
    const i = flagged.findIndex((x) => x.k === k);
    if (i >= 0) flagged.splice(i, 1);
    flagged.push(Object.assign({ k }, f));
  }

  function addRows(img, rows) {
    const warns = [];
    rows.forEach((r) => {
      if (!/^\d+$/.test(r.sid)) { warns.push(`Sample ID đọc lỗi (không phải số): "${r.raw}"`); return; }
      // dòng giống hệt (cùng mã máy, xét nghiệm, số) đã có từ ẢNH KHÁC = phần chụp gối nhau -> chỉ tính 1 lần
      const key = r.sid + '|' + r.code + '|' + r.val;
      const prev = allLines.get(key);
      if (prev && prev.img !== img) { dupLines++; return; }
      if (prev) prev.n++; else allLines.set(key, { img, n: 1 });
      const web = machineToWebSid(r.sid);
      if (!web) { rejected.set(r.sid, (rejected.get(r.sid) || 0) + 1); rejLines++; return; }
      if (/^N\/?A$/i.test(r.val)) { naLines++; warns.push(`SID ${web}: ${r.code} = NA (máy chưa có kết quả) – bỏ qua.`); return; }
      if (!r.code || !validVal(r.code, r.val)) {
        fmtLines++;
        if (r.code) setFlag('f|' + web + '|' + r.code + '|' + r.val, { sid: web, label: GROUP_LABEL[CODE_TO_GROUP[r.code]], val: r.val, lv: 'fmt', txt: 'sai định dạng (thiếu/thừa dấu chấm?)', img });
        warns.push(`SID ${web}: giá trị sai định dạng máy (${r.code} phải có ${CODE_DEC[r.code]} số lẻ), bỏ qua, hãy kiểm tra ảnh: "${r.raw}"`);
        return;
      }
      // từ đây là 1 KẾT QUẢ SỐ hợp lệ: luôn được đếm (kể cả khi nghi sai/không điền) để số hiện ra = số trong ảnh
      seenSids.add(web); resultLines++;
      const g = CODE_TO_GROUP[r.code];
      const as = assess(g, r.val);
      if (as.lv !== 'ok' && as.txt) setFlag('a|' + web + '|' + g + '|' + r.val, { sid: web, label: GROUP_LABEL[g], val: r.val, lv: as.lv, txt: as.txt, img });
      if (as.lv === 'block') { warns.push(`SID ${web}: ${GROUP_LABEL[g]} = ${r.val} ${as.txt} – số gần như chắc chắn đọc sai, KHÔNG dùng. Hãy kiểm tra ảnh.`); return; }
      if (as.lv === 'warn') warns.push(`SID ${web}: ${GROUP_LABEL[g]} = ${r.val} ${as.txt} – hãy so lại với ảnh/máy.`);
      if (!store.has(web)) store.set(web, new Map());
      const gm = store.get(web);
      if (!gm.has(g)) gm.set(g, new Map());
      const vals = gm.get(g);
      if (!vals.has(r.val)) vals.set(r.val, { raw: r.raw, img });
      if (vals.size > 1) setFlag('c|' + web + '|' + g, { sid: web, label: GROUP_LABEL[g], val: [...vals.keys()].join(' / '), lv: 'conf', txt: 'có ' + vals.size + ' số khác nhau cho cùng SID', img });
    });
    return warns;
  }

  /* ============ GIAO DIỆN ============ */
  // (Tuỳ chọn) Dán ảnh QR / thông tin ủng hộ của bạn vào đây: link https://... hoặc data:image/...
  const DONATE_IMG = '';

  const css = document.createElement('style');
  css.textContent = `
  #mx-box{position:fixed;right:14px;bottom:64px;z-index:99999;width:480px;max-width:96vw;max-height:86vh;display:flex;flex-direction:column;background:#fff;border-radius:16px;box-shadow:0 14px 44px rgba(8,40,60,.30),0 0 0 1px rgba(0,0,0,.06);font:13px/1.45 'Segoe UI',Roboto,Arial,sans-serif;color:#1e2a35;overflow:hidden}
  #mx-box *{box-sizing:border-box}
  .mx-head{background:linear-gradient(135deg,#00b386 0%,#0b7fc4 100%);color:#fff;padding:11px 14px;display:flex;align-items:flex-start;gap:10px}
  .mx-title{font-weight:700;font-size:16px;letter-spacing:.2px}
  .mx-status{font-size:11px;opacity:.92;margin-top:1px}
  .mx-author{margin-left:auto;cursor:pointer;border:1px solid rgba(255,255,255,.55);background:rgba(255,255,255,.16);color:#fff;border-radius:999px;padding:4px 11px;font:600 11px 'Segoe UI',Arial,sans-serif;white-space:nowrap;text-shadow:0 0 8px rgba(255,255,255,.9);transition:.25s;animation:mx-glow 2.4s ease-in-out infinite}
  .mx-author:hover{background:rgba(255,255,255,.3);transform:translateY(-1px) scale(1.04)}
  @keyframes mx-glow{0%,100%{box-shadow:0 0 4px rgba(255,255,255,.35)}50%{box-shadow:0 0 14px rgba(255,255,255,.85)}}
  .mx-body{padding:12px 14px 14px;overflow:auto}
  .mx-drop{border:2px dashed #00b38666;background:linear-gradient(180deg,#f3fcf9,#eef7fd);border-radius:14px;padding:14px;text-align:center;transition:.2s}
  .mx-drop.over{background:#dcf7ee;border-color:#00b386;transform:scale(1.01)}
  .mx-btn{border:0;cursor:pointer;border-radius:10px;font:600 13px 'Segoe UI',Arial,sans-serif;transition:.15s}
  .mx-btn:active{transform:scale(.97)}
  .mx-primary{background:linear-gradient(135deg,#00b386,#0b9fc4);color:#fff;padding:9px 18px;box-shadow:0 4px 12px rgba(0,179,134,.35)}
  .mx-primary:hover{filter:brightness(1.06)}
  .mx-ghost{background:#eef2f6;color:#33475b;padding:6px 12px;font-size:12px}
  .mx-ghost:hover{background:#e1e8ef}
  .mx-danger{background:#fff1f0;color:#c0282d;padding:6px 12px;font-size:12px}
  .mx-danger:hover{background:#ffe0de}
  .mx-hintsm{font-size:11.5px;color:#5d7285;margin-top:6px}
  .mx-row{display:flex;align-items:center;gap:8px;margin:10px 0 2px;font-size:12px;color:#44586b}
  .mx-row select{border:1px solid #cbd7e2;border-radius:8px;padding:3px 6px;font:600 12px 'Segoe UI',Arial;background:#fff;color:#12344d}
  .mx-imgs{margin-top:8px;display:flex;flex-direction:column;gap:3px;max-height:110px;overflow:auto}
  .mx-img{display:flex;gap:7px;align-items:center;font-size:11.5px;background:#f6f9fb;border-radius:8px;padding:3px 8px}
  .mx-img .mx-ic{width:16px;text-align:center}
  .mx-img.ok .mx-ic{color:#14a44d}.mx-img.err .mx-ic{color:#d93036}
  .mx-img .mx-nm{font-weight:600;color:#25384a}.mx-img .mx-ms{margin-left:auto;color:#6b7f90}
  .mx-stats{display:flex;gap:8px;margin-top:10px}
  .mx-stat{flex:1;border-radius:12px;padding:8px 10px;background:linear-gradient(135deg,#eaf6ff,#eafaf3);text-align:center}
  .mx-stat b{display:block;font-size:20px;color:#0b6fa8;line-height:1.1}
  .mx-stat span{font-size:11px;color:#58718a}
  .mx-chips{margin-top:8px;display:flex;flex-wrap:wrap;gap:4px;max-height:64px;overflow:auto}
  .mx-chip{background:#e8f1fa;color:#17527f;border-radius:999px;padding:1px 8px;font-size:11px;font-weight:600}
  .mx-muted{color:#7a8c9c;font-size:12px;margin-top:8px}
  .mx-recon{font-size:11.5px;color:#44586b;margin-top:7px;line-height:1.5}
  .mx-chip.bad{background:#ffe3e0;color:#c0282d}
  .mx-sep{height:1px;background:linear-gradient(90deg,transparent,#cfdbe6,transparent);margin:12px 0}
  .mx-patient{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .mx-sidpill{background:#fff0ef;color:#d62d33;font-weight:800;font-size:15px;border-radius:10px;padding:2px 12px;border:1px solid #ffc9c6}
  .mx-alert{background:#fff2f1;border-left:4px solid #e5484d;color:#872024;border-radius:8px;padding:8px 10px;margin-top:8px;font-size:12px}
  details.mx-alert summary{cursor:pointer;font-weight:700}
  details.mx-alert .mx-al{max-height:130px;overflow:auto;margin-top:5px}
  .mx-tbl{width:100%;border-collapse:separate;border-spacing:0;margin-top:8px;font-size:12.5px;border:1px solid #dbe5ee;border-radius:10px;overflow:hidden}
  .mx-tbl th{background:#eef4f9;text-align:left;padding:6px 8px;color:#39536b;font-size:11.5px}
  .mx-tbl td{padding:6px 8px;border-top:1px solid #e6edf3}
  .mx-tag{display:inline-block;border-radius:999px;padding:1px 9px;font-size:11.5px;font-weight:600}
  .mx-tag.ok{background:#e4f6ea;color:#12803b}.mx-tag.warn{background:#fff3d9;color:#a15c00}
  .mx-tag.bad{background:#ffe8e6;color:#c0282d}.mx-tag.info{background:#e1f0ff;color:#0b64b3}
  .mx-hint{color:#a82a2e;font-weight:700;margin-top:8px;font-size:12px}
  .mx-done{background:#e7f8ee;color:#12803b;border-radius:8px;padding:7px 10px;margin-top:8px;font-weight:600}
  .mx-bar{flex:0 0 auto;display:flex;align-items:center;gap:10px;padding:10px 14px;background:#fff;border-top:1px solid #dbe5ee;box-shadow:0 -4px 12px rgba(0,0,0,.06)}
  .mx-small{flex:0 0 auto;padding:4px 10px !important;font-size:11px !important;opacity:.85}
  .mx-fill{display:none;flex:1;margin:0;padding:13px;font-size:15px;background:linear-gradient(135deg,#0fbf6d,#00a3a3);color:#fff;box-shadow:0 5px 16px rgba(0,170,120,.4)}
  .mx-fill:hover{filter:brightness(1.07)}
  .mx-foot{display:flex;justify-content:space-between;margin-top:10px}
  #mx-toggle{position:fixed;right:14px;bottom:20px;z-index:99999;border:0;cursor:pointer;color:#fff;font:700 13px 'Segoe UI',Arial;padding:10px 18px;border-radius:999px;background:linear-gradient(135deg,#00b386,#0b7fc4);box-shadow:0 6px 18px rgba(0,120,160,.45);transition:.2s}
  #mx-toggle:hover{transform:translateY(-2px)}
  /* ---- popup neon ---- */
  #mx-pop{position:fixed;top:0;left:0;right:0;bottom:0;width:100vw;height:100vh;z-index:100000;display:none;align-items:center;justify-content:center;background:rgba(6,0,22,.74);backdrop-filter:blur(6px)}
  #mx-pop.mx-open{display:flex !important;align-items:center !important;justify-content:center !important;animation:mx-fade .25s}
  #mx-pop .mx-neoncard{margin:auto;flex:0 0 auto}
  @keyframes mx-fade{from{opacity:0}to{opacity:1}}
  @keyframes mx-in{from{transform:scale(.7) translateY(30px);opacity:0}to{transform:none;opacity:1}}
  @keyframes mx-spin{to{transform:rotate(360deg)}}
  .mx-neoncard{position:relative;width:400px;max-width:92vw;border-radius:24px;padding:3px;overflow:hidden;background:#0a0618;animation:mx-in .45s cubic-bezier(.2,1.3,.4,1);box-shadow:0 0 40px rgba(255,43,214,.45),0 0 90px rgba(0,229,255,.3)}
  .mx-neoncard::before{content:'';position:absolute;inset:-70%;background:conic-gradient(#ff2bd6,#00e5ff,#7cff00,#ffd000,#ff2bd6);animation:mx-spin 4s linear infinite}
  .mx-neoninner{position:relative;background:radial-gradient(circle at 50% 0%,#241050 0%,#0a0618 68%);border-radius:21px;padding:24px 22px 22px;text-align:center;overflow:hidden}
  .mx-x{position:absolute;right:12px;top:10px;width:30px;height:30px;border-radius:50%;border:1px solid #ff2bd6;background:transparent;color:#ff7bea;cursor:pointer;font-size:15px;text-shadow:0 0 8px #ff2bd6;z-index:3}
  .mx-x:hover{background:#ff2bd633}
  .mx-neon{font:800 25px/1.25 'Segoe UI',Arial,sans-serif;color:#fff;margin:6px 0 8px;text-shadow:0 0 4px #fff,0 0 12px #ff2bd6,0 0 26px #ff2bd6,0 0 44px #00e5ff;animation:mx-flick 3.2s infinite}
  @keyframes mx-flick{0%,19%,21%,60%,62%,100%{opacity:1}20%,61%{opacity:.55}}
  .mx-sub{color:#cdbdff;font-size:13px;text-shadow:0 0 8px #7a3cff}
  .mx-by{margin-top:12px;color:#7cffea;font-weight:700;font-size:13px;text-shadow:0 0 10px #00e5ff}
  .mx-cup{width:190px;height:190px;margin:0 auto;display:block;position:relative;z-index:2}
  .mx-steam{stroke-dasharray:14 10;animation:mx-steam 2.2s linear infinite}
  .mx-steam.s2{animation-delay:-.7s}.mx-steam.s3{animation-delay:-1.4s}
  @keyframes mx-steam{to{stroke-dashoffset:-48}}
  .mx-cupg{animation:mx-float 3s ease-in-out infinite;transform-origin:100px 120px}
  @keyframes mx-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
  .mx-heart{animation:mx-beat 1.2s ease-in-out infinite;transform-origin:100px 118px}
  @keyframes mx-beat{0%,100%{transform:scale(1)}50%{transform:scale(1.22)}}
  .mx-qr{margin:14px auto 0;width:170px;padding:6px;border-radius:14px;border:2px solid #00e5ff;box-shadow:0 0 18px #00e5ff,inset 0 0 12px #00e5ff55;background:#fff}
  .mx-qr img{width:100%;display:block;border-radius:8px}
  .mx-spark{position:absolute;bottom:-20px;font-size:14px;opacity:0;pointer-events:none;animation:mx-rise 5s linear infinite;z-index:1}
  @keyframes mx-rise{0%{transform:translateY(0) rotate(0);opacity:0}15%{opacity:.9}100%{transform:translateY(-420px) rotate(40deg);opacity:0}}
  `;
  document.head.appendChild(css);

  const box = document.createElement('div');
  box.id = 'mx-box';
  box.innerHTML = `
    <div class="mx-head">
      <div><div class="mx-title">🔬 MultiXL → HIS</div><div class="mx-status" id="mx-ocr"></div></div>
      <div class="mx-author" id="mx-author" title="Bấm để ủng hộ tác giả">☕ Tác giả: Hoàng Anh Jupiter</div>
    </div>
    <div class="mx-body">
      <div class="mx-drop" id="mx-dz">
        <button class="mx-btn mx-primary" id="mx-pick">📁 Tải nhiều ảnh lên</button>
        <input type="file" id="mx-files" accept="image/*" multiple style="display:none">
        <div class="mx-hintsm">hoặc kéo-thả ảnh vào đây, hoặc <b>Ctrl+V</b> để dán (nhiều lần cũng được)</div>
      </div>
      <div class="mx-row">⚡ Tốc độ đọc:
        <select id="mx-pool" title="Số luồng đọc ảnh song song. Nhiều luồng = nhanh hơn khi có nhiều ảnh nhưng tốn RAM/CPU."></select>
        <span id="mx-poolnote" style="color:#8a9aa8"></span>
      </div>
      <div class="mx-imgs" id="mx-imgs"></div>
      <div id="mx-sum"></div>
      <div id="mx-flag"></div>
      <div id="mx-gwarn"></div>
      <div class="mx-sep"></div>
      <div class="mx-patient">BN đang chọn trên web: <span class="mx-sidpill" id="mx-sid">chưa chọn</span>
        <button class="mx-btn mx-ghost" id="mx-rescan" style="margin-left:auto">↻ Dò lại</button></div>
      <div id="mx-warn"></div>
      <div id="mx-preview"></div>
    </div>
    <div class="mx-bar">
      <button class="mx-btn mx-danger mx-small" id="mx-clear" title="Xóa toàn bộ dữ liệu đã thu thập từ ảnh">🗑 Xóa</button>
      <button class="mx-btn mx-fill" id="mx-fill">✍ Điền số liệu sinh hóa</button>
    </div>`;
  document.body.appendChild(box);

  const toggle = document.createElement('button');
  toggle.id = 'mx-toggle';
  toggle.textContent = '🔬 MultiXL';
  toggle.onclick = () => (box.style.display = box.style.display === 'none' ? 'flex' : 'none');
  document.body.appendChild(toggle);

  /* ---- popup ủng hộ (neon) ---- */
  const pop = document.createElement('div');
  pop.id = 'mx-pop';
  pop.innerHTML = `
    <div class="mx-neoncard"><div class="mx-neoninner">
      <button class="mx-x" id="mx-popx" title="Đóng">✕</button>
      <svg class="mx-cup" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <defs><filter id="mx-gl" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
        <g filter="url(#mx-gl)" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="5">
          <g class="mx-cupg">
            <path d="M52 92 H138 V122 Q138 152 108 156 H82 Q52 152 52 122 Z" stroke="#00e5ff"/>
            <path d="M138 100 H152 Q168 100 168 117 Q168 134 150 134 H136" stroke="#00e5ff"/>
            <path d="M38 168 H152" stroke="#ff2bd6"/>
            <path class="mx-steam" d="M72 80 Q62 66 74 54 Q84 42 74 30" stroke="#ffd000"/>
            <path class="mx-steam s2" d="M96 80 Q86 66 98 54 Q108 42 98 30" stroke="#ffd000"/>
            <path class="mx-steam s3" d="M120 80 Q110 66 122 54 Q132 42 122 30" stroke="#ffd000"/>
            <path class="mx-heart" d="M95 128 C86 118 80 112 87 106 C92 102 96 106 95 110 C94 106 99 102 104 106 C111 112 104 118 95 128 Z" stroke="#ff2bd6" stroke-width="4"/>
          </g>
        </g>
      </svg>
      <div class="mx-neon">Hãy ủng hộ tôi<br>1 ly Coffee! ☕</div>
      <div class="mx-sub">Công cụ này miễn phí. Nếu thấy hữu ích, mời mình một ly cà phê để có thêm động lực nhé ❤</div>
      ${DONATE_IMG ? `<div class="mx-qr"><img src="${DONATE_IMG}" alt="Ủng hộ tác giả"></div>` : ''}
      <div class="mx-by">— Hoàng Anh Jupiter —</div>
    </div></div>`;
  document.body.appendChild(pop);
  (function sparkles() {
    const inner = pop.querySelector('.mx-neoninner'), em = ['✦', '♥', '✧', '☕', '★'], col = ['#ff2bd6', '#00e5ff', '#ffd000', '#7cff00'];
    for (let i = 0; i < 16; i++) {
      const s = document.createElement('span');
      s.className = 'mx-spark'; s.textContent = em[i % em.length];
      s.style.cssText = `left:${Math.round(Math.random() * 92)}%;animation-delay:${(Math.random() * 5).toFixed(2)}s;animation-duration:${(4 + Math.random() * 3).toFixed(1)}s;color:${col[i % col.length]};text-shadow:0 0 8px ${col[i % col.length]}`;
      inner.appendChild(s);
    }
  })();
  const closePop = () => pop.classList.remove('mx-open');
  box.querySelector('#mx-author').onclick = () => pop.classList.add('mx-open');
  pop.querySelector('#mx-popx').onclick = closePop;
  pop.addEventListener('click', (e) => { if (e.target === pop) closePop(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePop(); });

  const $ = (id) => box.querySelector(id);
  const imgsEl = $('#mx-imgs'), sumEl = $('#mx-sum'), gwarnEl = $('#mx-gwarn'), sidLabel = $('#mx-sid');
  const flagEl = $('#mx-flag');
  const warnEl = $('#mx-warn'), previewEl = $('#mx-preview'), fillBtn = $('#mx-fill');

  /* ---- chọn số luồng đọc ảnh ---- */
  const poolSel = $('#mx-pool');
  [1, 2, 4, 6, 8, 10].forEach((n) => { const o = document.createElement('option'); o.value = n; o.textContent = '×' + n; poolSel.appendChild(o); });
  poolSel.value = String(POOL);
  function poolNote() { $('#mx-poolnote').textContent = POOL >= 8 ? '(rất nhanh, tốn RAM)' : POOL >= 4 ? '(nhanh)' : '(tiết kiệm RAM)'; }
  poolNote();
  poolSel.onchange = async () => {
    const n = +poolSel.value;
    if (!(await setPool(n))) poolSel.value = String(POOL);
    poolNote();
  };

  function renderTop() { $('#mx-ocr').textContent = ocrState; }
  renderTop();

  let gwOpen = false;
  gwarnEl.addEventListener('toggle', (e) => { gwOpen = e.target.open; }, true);
  function renderCollected() {
    imgsEl.innerHTML = imgLog.map((l) =>
      `<div class="mx-img ${l.status}"><span class="mx-ic">${l.status === 'ok' ? '✔' : l.status === 'err' ? '✖' : '⏳'}</span><span class="mx-nm">${esc(l.name)}</span><span class="mx-ms">${esc(l.msg || '')}</span></div>`).join('');
    const sids = [...seenSids].sort();
    const badSid = new Set(flagged.filter((f) => f.lv !== 'warn').map((f) => f.sid));
    let fillable = 0; store.forEach((gm) => gm.forEach((v) => { if (v.size === 1) fillable++; }));
    sumEl.innerHTML = seenSids.size
      ? `<div class="mx-stats"><div class="mx-stat"><b>${seenSids.size}</b><span>bệnh nhân</span></div><div class="mx-stat"><b>${resultLines}</b><span>kết quả</span></div></div>`
        + `<div class="mx-recon">✔ <b>${fillable}</b> ô điền được · ⚠ <b>${resultLines - fillable}</b> cần tự kiểm tra/không điền (khung đỏ bên dưới)<br>`
        + `Đối chiếu: thấy <b>${seenTotal}</b> dòng − ${dupLines} dòng trùng giữa các ảnh = <b>${seenTotal - dupLines}</b> dòng = ${resultLines} kết quả + ${naLines} NA + ${rejLines} mã ngoài quy tắc (QC, 7 chữ số...)${fmtLines ? ' + ' + fmtLines + ' sai định dạng' : ''}`
        + (unsureTotal ? `<br><b style="color:#c0282d">⚠ ${unsureTotal} dòng đọc không chắc, CHƯA được tính – xem mục cảnh báo</b>` : '') + `</div>`
        + `<div class="mx-chips">${sids.map((s) => `<span class="mx-chip${badSid.has(s) ? ' bad' : ''}">${s}</span>`).join('')}</div>`
      : '<div class="mx-muted">Chưa có dữ liệu. Hãy tải/dán ảnh MultiXL.</div>';
    // Khung cảnh báo CHỈ SỐ BẤT THƯỜNG: luôn mở, nêu rõ SID + xét nghiệm + trị số
    const bySid = new Map();
    flagged.forEach((f) => bySid.set(f.sid, (bySid.get(f.sid) || []).concat(f)));
    flagEl.innerHTML = flagged.length
      ? `<div class="mx-alert" style="border-left-width:6px;background:#ffe9e7"><b>🚨 ${flagged.length} chỉ số bất thường / nghi đọc sai (${bySid.size} SID):</b><div class="mx-al" style="max-height:170px;overflow:auto;margin-top:5px">${[...bySid].sort((a, b) => a[0] - b[0]).map(([sid, list]) =>
          `<div><b>SID ${esc(sid)}</b>: ` + list.map((f) => `${esc(f.label)} = <b>${esc(f.val)}</b> <i>(${esc(f.txt)}${f.lv === 'warn' ? ' – đã điền, kiểm tra lại' : ' – KHÔNG điền, hãy tự nhập'})</i>`).join('; ') + '</div>').join('')}</div></div>`
      : '';
    const warns = [];
    imgLog.forEach((l) => (l.warns || []).forEach((w) => warns.push(`[${l.name}] ${w}`)));
    gwarnEl.innerHTML = warns.length
      ? `<details class="mx-alert"${gwOpen ? ' open' : ''}><summary>⚠ ${warns.length} cảnh báo khi đọc ảnh</summary><div class="mx-al">${warns.map((w) => '• ' + esc(w)).join('<br>')}</div></details>`
      : '';
  }

  /* ============ NHẬN ẢNH ============ */
  $('#mx-pick').onclick = () => $('#mx-files').click();
  $('#mx-files').onchange = (e) => { processFiles([...e.target.files]); e.target.value = ''; };
  const dz = $('#mx-dz');
  box.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('over'); });
  box.addEventListener('dragleave', () => dz.classList.remove('over'));
  box.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('over'); processFiles([...(e.dataTransfer?.files || [])]); });
  document.addEventListener('paste', (e) => {
    if (box.style.display === 'none') return;
    const items = [...(e.clipboardData?.items || [])].filter((i) => i.type.startsWith('image/'));
    if (!items.length) return;
    e.preventDefault();
    processFiles(items.map((i, k) => Object.assign(i.getAsFile(), { _n: 'ảnh dán ' + (imgLog.length + k + 1) })));
  });

  const pending = []; let running = Array(POOL).fill(false);
  async function setPool(n) {
    if (running.some(Boolean) || pending.length) { alert('Đang đọc ảnh – đợi đọc xong rồi hãy đổi tốc độ.'); return false; }
    POOL = n; localStorage.setItem('mx-pool', String(n));
    const old = poolPromise; poolPromise = null; progressCbs.length = 0; running = Array(POOL).fill(false);
    ocrState = 'đang nạp lại bộ đọc ảnh ×' + n + '...'; renderTop();
    if (old) { try { (await old).forEach((w) => w.terminate()); } catch (e) {} }
    getPool().catch(() => {});
    return true;
  }
  async function runner(i) {
    try {
      const ws = await getPool();
      let job;
      while ((job = pending.shift())) await job(ws[i], i);
    } catch (e) {
      let job; while ((job = pending.shift())) await job(null, i, e);
    }
    running[i] = false;
  }
  function kick() { for (let i = 0; i < POOL; i++) if (!running[i]) { running[i] = true; runner(i); } }

  function processFiles(files) {
    files.filter((f) => f && (!f.type || f.type.startsWith('image/'))).forEach((f) => {
      const log = { name: f.name || f._n || 'ảnh', status: 'wait', msg: 'đang chờ đọc...', warns: [] };
      imgLog.push(log); renderCollected();
      pending.push(async (w, i, poolErr) => {
        try {
          if (!w) throw poolErr || new Error('bộ đọc ảnh chưa sẵn sàng');
          log.msg = 'đang đọc...'; renderCollected();
          const { rows, warns: ocrWarns, seen, unsure } = await ocrBlob(f, w, i, (b) => { log.msg = `đang đọc dòng ${b + 1}/${N_BANDS}`; if (b % 3 === 0) renderCollected(); });
          seenTotal += seen; unsureTotal += unsure;
          log.warns.push(...ocrWarns);
          if (rows.length === 0) {
            log.status = 'err'; log.msg = 'KHÔNG ĐỌC ĐƯỢC dữ liệu (không thấy dòng kết quả)';
            log.warns.push('Không đọc được dòng kết quả nào. Hãy chụp màn hình Patient Report của MultiXL rõ, đủ cột Sample ID, Test, Result.');
          } else {
            log.warns.push(...addRows(log.name, rows));
            log.status = 'ok';
            log.msg = `thấy ${seen} dòng · đọc chắc ${rows.length}` + (unsure ? ` · ⚠ ${unsure} không chắc` : '');
            dataVersion++;
          }
        } catch (err) {
          log.status = 'err'; log.msg = 'LỖI: ' + err.message;
          log.warns.push('Không đọc được ảnh: ' + err.message);
        }
        renderCollected();
      });
    });
    kick();
  }

  /* ============ DÒ SID TRÊN WEB + KẾ HOẠCH ĐIỀN ============ */
  let plan = null, shownSid = undefined, shownVersion = -1;

  function showWarn(list) {
    warnEl.innerHTML = list.length
      ? '<div class="mx-alert"><b>⚠ CẢNH BÁO:</b><br>' + list.map((w) => '• ' + esc(w)).join('<br>') + '</div>'
      : '';
  }

  function buildPlan(sid) {
    plan = null; fillBtn.style.display = 'none'; previewEl.innerHTML = ''; showWarn([]);
    if (!sid) { showWarn(['Chưa chọn bệnh nhân hợp lệ (SID đúng 5 chữ số) trên web.']); return; }
    if (!store.size) { previewEl.innerHTML = '<div class="mx-muted">Chưa có dữ liệu thu thập.</div>'; return; }
    const warns = [];
    flagged.filter((f) => f.sid === sid).forEach((f) => warns.push(`BN này: ${f.label} = ${f.val} ${f.txt}${f.lv === 'warn' ? ' – kiểm tra lại với ảnh/máy.' : ' – script KHÔNG điền, hãy tự nhập tay theo ảnh.'}`));
    const data = store.get(sid);
    if (!data) {
      if (!flagged.some((f) => f.sid === sid)) warns.push(`KHÔNG CÓ dữ liệu của SID ${sid} (mã máy ${sid} hoặc 0${sid}) trong các ảnh đã thu thập. Không điền gì.`);
      showWarn(warns); return;
    }

    const wr = webRows();
    if (!wr.length) warns.push('Chưa thấy bảng kết quả sinh hóa trên web cho bệnh nhân này (trang đang tải? bấm "Dò lại").');

    const items = [];
    let html = `<div class="mx-muted">SID web ${esc(sid)} = mã máy ${esc(sid)} / 0${esc(sid)}</div><table class="mx-tbl"><tr><th>Xét nghiệm</th><th>Số đọc được</th><th>Tình trạng</th></tr>`;
    data.forEach((vals, g) => {
      const list = [...vals.keys()];
      const w = wr.find((x) => x.group === g);
      const label = GROUP_LABEL[g];
      let resCell, fill = false, valCell = list.map(esc).join(' / ');
      if (!w) {
        resCell = '<span class="mx-tag bad">⚠ web không có dòng này → không điền</span>';
        warns.push(`${label}: có số trong ảnh nhưng web không có dòng xét nghiệm này cho SID ${sid}.`);
      } else if (list.length > 1) {
        resCell = `<span class="mx-tag bad">⚠ ${list.length} số khác nhau → không điền</span>`;
        warns.push(`${label}: dữ liệu có nhiều số khác nhau cho cùng SID (${list.join(', ')}) – không điền, hãy kiểm tra.`);
      } else {
        const v = list[0], cur = w.ta.value.trim();
        const as = assess(g, v);
        valCell = `<b>${esc(v)}</b>` + (as.arrow ? `<span style="color:${as.lv === 'warn' ? '#d62d33' : '#c77700'};font-weight:700">${as.arrow}</span>` : '') + (as.lv === 'warn' ? ` <span class="mx-tag bad">⚠ ${as.txt}</span>` : '');
        if (cur !== '') {
          resCell = `<span class="mx-tag warn">⏭ đã có "${esc(cur)}" → giữ nguyên</span>`;
          if (cur !== v) warns.push(`${label}: web đã có ${cur} khác với ảnh (${v}) – không ghi đè, hãy kiểm tra.`);
        } else { resCell = '<span class="mx-tag info">sẽ điền (ô trống)</span>'; fill = true; }
      }
      items.push({ g, label, fill, v: fill ? list[0] : null });
      html += `<tr data-g="${g}"><td>${esc(label)}</td><td>${valCell}</td><td class="mx-res">${resCell}</td></tr>`;
    });
    html += '</table><div class="mx-hint">So số với ảnh, đúng rồi mới bấm "Điền số liệu sinh hóa".</div>';
    plan = { sid, items };
    showWarn(warns);
    previewEl.innerHTML = html;
    fillBtn.style.display = items.some((i) => i.fill) ? 'block' : 'none';
    if (!items.some((i) => i.fill)) previewEl.insertAdjacentHTML('beforeend', '<div class="mx-muted">Không có ô trống nào để điền.</div>');
  }

  // tự dò khi đổi bệnh nhân trên web hoặc có dữ liệu mới
  setInterval(() => {
    const sid = currentSid();
    sidLabel.textContent = sid || 'chưa chọn';
    if (sid !== shownSid || dataVersion !== shownVersion) {
      shownSid = sid; shownVersion = dataVersion;
      setTimeout(() => buildPlan(currentSid()), 900); // chờ web tải bảng kết quả
    }
  }, 600);
  $('#mx-rescan').onclick = () => buildPlan(currentSid());

  $('#mx-clear').onclick = () => {
    if (!confirm('Xóa toàn bộ dữ liệu đã thu thập từ ảnh?')) return;
    store.clear(); rejected.clear(); flagged.length = 0; imgLog.length = 0; allLines.clear(); seenSids.clear();
    resultLines = naLines = rejLines = fmtLines = dupLines = seenTotal = unsureTotal = 0; dataVersion++;
    renderCollected();
  };

  /* ============ ĐIỀN (khi bấm nút) ============ */
  // Popup xác nhận: hiện khi BN này có chỉ số bất thường / nghi đọc sai
  function confirmAbnormal(sid, list) {
    return new Promise((resolve) => {
      const ov = document.createElement('div');
      ov.style.cssText = 'position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;font:14px/1.5 "Segoe UI",Arial,sans-serif';
      const hasBlock = list.some((f) => f.lv !== 'warn');
      ov.innerHTML = `<div style="background:#fff;border-radius:16px;max-width:480px;width:92vw;padding:20px 22px;border-top:8px solid #e5484d;box-shadow:0 20px 60px rgba(0,0,0,.45)">
        <div style="font-size:18px;font-weight:800;color:#c0282d">🚨 CẢNH BÁO – SID ${esc(sid)}</div>
        <div style="margin:8px 0;color:#444">Có <b>${list.length}</b> chỉ số bất thường / nghi đọc sai. Hãy so lại với ảnh MultiXL:</div>
        <div style="max-height:220px;overflow:auto;background:#fff2f1;border-radius:10px;padding:8px 12px">${list.map((f) =>
          `<div style="padding:3px 0">• ${esc(f.label)} = <b style="color:#c0282d">${esc(f.val)}</b> – ${esc(f.txt)}<br><span style="font-size:12px;color:#7a2b2e">${f.lv === 'warn' ? 'vẫn sẽ điền, cần kiểm tra lại' : 'script KHÔNG điền, bạn tự nhập tay'}</span></div>`).join('')}</div>
        <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end">
          <button id="mx-c-no" style="border:0;border-radius:10px;padding:9px 16px;font-weight:700;background:#eef2f6;cursor:pointer">Quay lại kiểm tra</button>
          <button id="mx-c-ok" style="border:0;border-radius:10px;padding:9px 16px;font-weight:700;background:#e5484d;color:#fff;cursor:pointer">Đã xem – vẫn điền${hasBlock ? ' phần còn lại' : ''}</button>
        </div></div>`;
      document.body.appendChild(ov);
      const done = (v) => { ov.remove(); resolve(v); };
      ov.querySelector('#mx-c-no').onclick = () => done(false);
      ov.querySelector('#mx-c-ok').onclick = () => done(true);
    });
  }
  fillBtn.onclick = async () => {
    if (!plan) return;
    const fl = flagged.filter((f) => f.sid === plan.sid);
    if (fl.length && !(await confirmAbnormal(plan.sid, fl))) return;
    if (!plan) return;
    if (currentSid() !== plan.sid) { showWarn([`Bệnh nhân trên web đã đổi (cần SID ${plan.sid}). Không điền gì, bấm "Dò lại".`]); return; }
    const wr = webRows(); const warns = []; let n = 0;
    plan.items.forEach((it) => {
      if (!it.fill) return;
      const w = wr.find((x) => x.group === it.g);
      const cell = previewEl.querySelector(`tr[data-g="${it.g}"] .mx-res`);
      if (!w) { warns.push(`${it.label}: không thấy dòng trên web.`); return; }
      if (w.ta.value.trim() !== '') { if (cell) cell.innerHTML = `<span class="mx-tag warn">⏭ vừa có dữ liệu "${esc(w.ta.value.trim())}" → giữ nguyên</span>`; return; }
      setValue(w.ta, it.v);
      if (w.ta.value.trim() !== it.v) { warns.push(`${it.label}: điền ${it.v} nhưng ô không nhận giá trị.`); if (cell) cell.innerHTML = '<span class="mx-tag bad">⚠ điền thất bại</span>'; }
      else { n++; if (cell) cell.innerHTML = '<span class="mx-tag ok">✔ đã điền</span>'; }
      it.fill = false;
    });
    fillBtn.style.display = 'none';
    showWarn(warns.length ? warns : []);
    previewEl.insertAdjacentHTML('beforeend', `<div class="mx-done">Đã điền ${n} ô cho SID ${esc(plan.sid)}. Kiểm tra rồi tự bấm "Lưu lại".</div>`);
  };

  renderCollected();
  getPool().catch(() => {}); // tải sẵn bộ đọc ảnh ngay khi mở trang HIS
})();
