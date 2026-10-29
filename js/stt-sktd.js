(function(){
  const PER_PAGE = 40; // 5 cột x 8 hàng, giống file Word
  const el = id => document.getElementById(id);
  if(!el('nsSheets')) return;

  function todayStr(){
    const d = new Date();
    return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();
  }
  function esc(s){ return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  function intVal(id, def){ const v = parseInt(el(id).value, 10); return isNaN(v) ? def : v; }

  function cell(unit, date, n){
    return '<div class="ns-cell"><span class="ns-unit">' + esc(unit) + '</span><span class="ns-date">' + esc(date) + '</span><span class="ns-num">' + n + '</span></div>';
  }

  function render(){
    el('nsPageSizeStyle').textContent = '@page{ size:letter portrait; margin:0; }';
    const unit = el('nsUnitInput').value.trim();
    const date = el('nsDateInput').value.trim();
    let start = intVal('nsStartInput', 1); if(start < 1) start = 1;
    let end = intVal('nsEndInput', start); if(end < start) end = start;
    const total = end - start + 1;
    const pages = Math.ceil(total / PER_PAGE);
    el('nsSummaryLabel').textContent = 'Sẽ tạo nhãn ' + start + ' → ' + end + ' (' + total + ' nhãn, ' + pages + ' trang Letter)';

    const box = el('nsSheets');
    box.innerHTML = '';
    let n = start;
    for(let p = 0; p < pages; p++){
      let html = '';
      for(let i = 0; i < PER_PAGE && n <= end; i++, n++) html += cell(unit, date, n);
      const sheet = document.createElement('div');
      sheet.className = 'ns-sheet';
      sheet.innerHTML = '<div class="ns-grid">' + html + '</div>';
      box.appendChild(sheet);
    }
  }

  // Đổi "Số lượng" -> cập nhật "đến số"; đổi "đến số" -> cập nhật "Số lượng"
  function fromQty(){
    let q = intVal('nsQtyInput', 1); if(q < 1) q = 1;
    el('nsQtyInput').value = q;
    el('nsEndInput').value = intVal('nsStartInput', 1) + q - 1;
    render();
  }
  function fromEnd(){
    const s = Math.max(1, intVal('nsStartInput', 1));
    let e = intVal('nsEndInput', s); if(e < s) e = s;
    el('nsEndInput').value = e;
    el('nsQtyInput').value = e - s + 1;
    render();
  }

  el('nsDateInput').value = todayStr();
  el('nsUnitInput').addEventListener('input', render);
  el('nsDateInput').addEventListener('input', render);
  el('nsTodayBtn').addEventListener('click', () => { el('nsDateInput').value = todayStr(); render(); });
  el('nsStartInput').addEventListener('input', fromQty);
  el('nsQtyInput').addEventListener('input', fromQty);
  el('nsEndInput').addEventListener('input', fromEnd);
  el('nsQtyQuick').addEventListener('change', () => {
    const q = parseInt(el('nsQtyQuick').value, 10);
    if(q){ el('nsQtyInput').value = q; fromQty(); }
    el('nsQtyQuick').value = '';
  });
  el('nsPrintBtn').addEventListener('click', () => {
    if(typeof logUsage === 'function') logUsage('nhanstt_generate');
    const page = el('page-nhanstt');
    page.classList.add('ns-printing');
    void page.offsetHeight;
    setTimeout(() => {
      window.print();
      setTimeout(() => page.classList.remove('ns-printing'), 300);
    }, 50);
  });

  render();
})();
