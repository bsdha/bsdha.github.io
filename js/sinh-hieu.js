  (function(){
    const PER_SHEET = 6;
    const el = id => document.getElementById(id);

    function buildSlip(num){
      const numStr = String(num).padStart(3,'0');
      return `
      <div class="sh-slip">
        <div class="sh-slip-head">
          <span class="sh-slip-no">${numStr}</span>
        </div>
        <div class="sh-field"><span class="sh-label">Họ và tên</span><span class="sh-box"></span></div>
        <div class="sh-field"><span class="sh-label">Năm sinh</span><span class="sh-box"></span></div>
        <div class="sh-field"><span class="sh-label">Khám phòng</span><span class="sh-box"></span></div>
        <div class="sh-field"><span class="sh-label">Chuyển phòng</span><span class="sh-box"></span></div>
        <div class="sh-row2">
          <div class="sh-field"><span class="sh-label">M</span><span class="sh-box"></span></div>
          <div class="sh-field"><span class="sh-label">T°</span><span class="sh-box"></span></div>
        </div>
        <div class="sh-row2">
          <div class="sh-field"><span class="sh-label">HA</span><span class="sh-box"></span></div>
          <div class="sh-field"><span class="sh-label">NT</span><span class="sh-box"></span></div>
        </div>
        <div class="sh-field"><span class="sh-label">Cân nặng (kg)</span><span class="sh-box"></span></div>
      </div>`;
    }

    function updateEndFromSheets(){
      const start = parseInt(el('shStartInput').value, 10) || 1;
      let sheets = parseInt(el('shSheetsInput').value, 10);
      if(!sheets || sheets < 1) sheets = 1;
      el('shSheetsInput').value = sheets;
      el('shEndInput').value = start + sheets * PER_SHEET - 1;
      render();
    }

    function render(){
      const perSheet = PER_SHEET;

      let start = parseInt(el('shStartInput').value, 10);
      let end = parseInt(el('shEndInput').value, 10);
      if(!start || start < 1) start = 1;
      if(!end || end < start) end = start;
      el('shStartInput').value = start;
      el('shEndInput').value = end;

      el('shPageSizeStyle').textContent =
        `@page{ size:A4 portrait; margin:6mm; }`;

      const totalSlips = end - start + 1;
      const sheetCount = Math.ceil(totalSlips / perSheet);
      el('shSummaryLabel').textContent =
        `Sẽ tạo phiếu #${String(start).padStart(3,'0')} → #${String(end).padStart(3,'0')}  (${sheetCount} tờ A4)`;

      const sheetsDiv = el('shSheets');
      sheetsDiv.innerHTML = '';

      let counter = start;
      for(let s=0; s<sheetCount; s++){
        const sheet = document.createElement('div');
        sheet.className = 'sh-sheet sh-a4';
        let html = '';
        for(let i=0; i<perSheet && counter<=end; i++){
          html += buildSlip(counter);
          counter++;
        }
        sheet.innerHTML = html;
        sheetsDiv.appendChild(sheet);
      }
    }

    function printSinhHieu(){
      logUsage('sinhhieu_generate');
      const page = el('page-sinhhieu');
      page.classList.add('sh-printing');
      // Ép trình duyệt reflow ngay để đảm bảo style mới (visibility/position) được áp dụng
      // trước khi mở hộp thoại in — tránh race condition gây ra trang trắng khi in.
      void page.offsetHeight;
      setTimeout(() => {
        window.print();
        setTimeout(() => page.classList.remove('sh-printing'), 300);
      }, 50);
    }

    el('shStartInput').addEventListener('change', updateEndFromSheets);
    el('shEndInput').addEventListener('change', render);
    el('shSheetsInput').addEventListener('change', updateEndFromSheets);
    el('shSheetsQuick').addEventListener('change', () => {
      const sheets = parseInt(el('shSheetsQuick').value, 10);
      if(sheets){
        el('shSheetsInput').value = sheets;
        updateEndFromSheets();
      }
    });
    el('shPrintBtn').addEventListener('click', printSinhHieu);

    render();
  })();
