(function(){
  const PER_PAGE = 40; // 5 cột x 8 hàng, giống file Word
  const el = id => document.getElementById(id);
  if(!el('skSheets')) return;

  // ---- Ô ngày: gõ liền 8 số, tự chèn dấu "/" ----
  let digits = '';
  const dateEl = el('skDateInput');
  function maskText(){
    const m = '__/__/____'.split('');
    const pos = [0,1,3,4,6,7,8,9];
    for(let i = 0; i < digits.length; i++) m[pos[i]] = digits[i];
    return m.join('');
  }
  function labelDate(){
    if(!digits) return '';
    return maskText().replace(/_/g,'').replace(/\/+$/,'').replace(/\/{2,}/g,'/');
  }
  function paintDate(){
    dateEl.value = maskText();
    const pos = [0,1,3,4,6,7,8,9,10];
    const caret = pos[Math.min(digits.length, 8)] + (digits.length === 2 || digits.length === 4 ? 1 : 0);
    try{ dateEl.setSelectionRange(caret, caret); }catch(e){}
  }
  function setToday(){
    const d = new Date();
    digits = String(d.getDate()).padStart(2,'0') + String(d.getMonth()+1).padStart(2,'0') + d.getFullYear();
    paintDate(); render();
  }
  function allSelected(){ return dateEl.selectionStart === 0 && dateEl.selectionEnd >= dateEl.value.length; }
  dateEl.addEventListener('keydown', e => {
    if(e.ctrlKey || e.metaKey || e.altKey) return;
    if(/^[0-9]$/.test(e.key)){
      e.preventDefault();
      if(allSelected() || digits.length >= 8) digits = '';
      digits += e.key;
      paintDate(); render();
    } else if(e.key === 'Backspace'){
      e.preventDefault();
      digits = allSelected() ? '' : digits.slice(0,-1);
      paintDate(); render();
    } else if(e.key === 'Delete'){
      e.preventDefault(); digits = ''; paintDate(); render();
    } else if(e.key.length === 1){
      e.preventDefault(); // chặn chữ/dấu lạ
    }
  });
  dateEl.addEventListener('paste', e => {
    e.preventDefault();
    const t = ((e.clipboardData || window.clipboardData).getData('text') || '').replace(/\D/g,'').slice(0,8);
    if(t){ digits = t; paintDate(); render(); }
  });
  // Điện thoại/bàn phím ảo: xử lý qua input
  dateEl.addEventListener('input', () => {
    const t = dateEl.value.replace(/\D/g,'').slice(0,8);
    digits = t; paintDate(); render();
  });
  dateEl.addEventListener('focus', () => setTimeout(() => dateEl.select(), 0));
  dateEl.addEventListener('mouseup', e => e.preventDefault());

  // ---- Dựng lưới nhãn ----
  function esc(s){ return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  function intVal(id, def){ const v = parseInt(el(id).value, 10); return isNaN(v) ? def : v; }
  function cell(unit, date, n){
    return '<div class="sk-cell"><span class="sk-unit">' + esc(unit) + '</span><span class="sk-date">' + esc(date) + '</span><span class="sk-num">' + n + '</span></div>';
  }
  function fit(){
    const desk = el('skDesk'), box = el('skSheets');
    box.style.zoom = 1;
    const sheetW = box.getBoundingClientRect().width;
    const avail = desk.clientWidth - 24;
    box.style.zoom = (sheetW > 0 && avail < sheetW) ? (avail / sheetW) : 1;
  }
  function render(){
    el('skPageSizeStyle').textContent = '@page{ size:letter portrait; margin:0; }';
    const unit = el('skUnitInput').value.trim();
    const date = labelDate();
    let start = Math.max(1, intVal('skStartInput', 1));
    let end = intVal('skEndInput', start); if(end < start) end = start;
    const total = end - start + 1;
    const pages = Math.ceil(total / PER_PAGE);
    el('skPillRange').textContent = 'Số ' + start + ' → ' + end;
    el('skPillCount').textContent = total + ' nhãn';
    el('skPillPages').textContent = pages + ' trang';
    document.querySelectorAll('#skChips button').forEach(b => b.classList.toggle('on', +b.dataset.q === total));

    const box = el('skSheets');
    let out = '', n = start;
    for(let p = 0; p < pages; p++){
      let html = '';
      for(let i = 0; i < PER_PAGE && n <= end; i++, n++) html += cell(unit, date, n);
      out += '<div class="sk-sheet"><div class="sk-grid">' + html + '</div></div>';
    }
    box.innerHTML = out;
    fit();
  }

  // Số lượng <-> đến số
  function fromQty(){
    let q = intVal('skQtyInput', 1); if(q < 1) q = 1; if(q > 2000) q = 2000;
    el('skQtyInput').value = q;
    el('skEndInput').value = Math.max(1, intVal('skStartInput', 1)) + q - 1;
    render();
  }
  function fromEnd(){
    const s = Math.max(1, intVal('skStartInput', 1));
    let e = intVal('skEndInput', s); if(e < s) e = s;
    el('skQtyInput').value = e - s + 1;
    render();
  }
  el('skUnitInput').addEventListener('input', e => {
    const p = e.target.selectionStart;
    e.target.value = e.target.value.toUpperCase();
    try{ e.target.setSelectionRange(p, p); }catch(_){}
    render();
  });
  el('skTodayBtn').addEventListener('click', () => { setToday(); dateEl.focus(); });
  el('skStartInput').addEventListener('input', fromQty);
  el('skQtyInput').addEventListener('input', fromQty);
  el('skEndInput').addEventListener('input', fromEnd);
  el('skChips').addEventListener('click', e => {
    const b = e.target.closest('button[data-q]'); if(!b) return;
    el('skQtyInput').value = b.dataset.q; fromQty();
  });
  window.addEventListener('resize', fit);
  document.addEventListener('click', e => { if(e.target.closest('[data-page="sttsktd"]')) setTimeout(fit, 80); });

  el('skPrintBtn').addEventListener('click', () => {
    if(typeof logUsage === 'function') logUsage('sttsktd_generate');
    const page = el('page-sttsktd');
    const box = el('skSheets');
    page.classList.add('sk-printing');
    box.style.zoom = 1;
    void page.offsetHeight;
    setTimeout(() => {
      window.print();
      setTimeout(() => { page.classList.remove('sk-printing'); fit(); }, 300);
    }, 50);
  });

  setToday();
})();
