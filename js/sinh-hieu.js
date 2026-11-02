(function(){
    const el = id => document.getElementById(id);

    // Kiểu bố cục cho từng số phiếu/tờ A4 (dọc).
    //  c, r   : số cột, số hàng      gx, gy: khoảng cách ngang, dọc giữa các phiếu
    //  mode   : std = bố cục gốc (mỗi ô một dòng)
    //           p5  = 5 dòng, ô chia đôi cạnh nhau (phòng khám + chuyển phòng chung dòng)
    //           p6  = 6 dòng, phòng khám / chuyển phòng mỗi ô một dòng (phiếu hẹp)
    //  head   : n = tiêu đề thường, c = tiêu đề gọn (số + tên bệnh viện cùng một hàng)
    //  k      : hệ số co chữ so với phiếu gốc
    const LAYOUTS = {
      4:  { c:2, r:2, gx:'8mm', gy:'6mm',   mode:'std', head:'n', k:1.3  },
      6:  { c:2, r:3, gx:'8mm', gy:'2.5mm', mode:'std', head:'n', k:1    },
      8:  { c:2, r:4, gx:'4mm', gy:'2.5mm', mode:'p5',  head:'n', k:1    },
      10: { c:2, r:5, gx:'4mm', gy:'2mm',   mode:'p5',  head:'c', k:0.95 },
      12: { c:3, r:4, gx:'3mm', gy:'2.5mm', mode:'p6',  head:'c', k:0.9  },
      15: { c:3, r:5, gx:'3mm', gy:'2mm',   mode:'p6',  head:'c', k:0.85 },
      18: { c:3, r:6, gx:'3mm', gy:'1.5mm', mode:'p6',  head:'c', k:0.75 },
      24: { c:4, r:6, gx:'2mm', gy:'1.5mm', mode:'p6',  head:'c', k:0.7  }
    };
    const DEFAULT_PER = 6;
    const PER_KEY = 'sh_per_sheet';

    function getPer(){
      const v = parseInt(el('shPerSheet').value, 10);
      return LAYOUTS[v] ? v : DEFAULT_PER;
    }

    // ---- Tùy chỉnh nội dung phiếu (lưu theo trình duyệt) ----
    const OPT_KEY = 'sh_slip_opts';
    // wide = ô dài (họ tên, phòng); các ô còn lại là ô ngắn, có thể xếp 2 ô/dòng
    const FDEF = {
      name:{ full:'Họ và tên',    abbr:'Họ tên' },
      yob: { full:'Năm sinh',     abbr:'NS' },
      kp:  { full:'Khám phòng',   abbr:'KP' },
      cp:  { full:'Chuyển phòng', abbr:'CP' },
      m:   { full:'M',            abbr:'M' },
      t:   { full:'T°',           abbr:'T' },
      ha:  { full:'HA',           abbr:'HA' },
      nt:  { full:'NT',           abbr:'NT' },
      cn:  { full:'Cân nặng',     abbr:'CN', unit:'kg' },
      cc:  { full:'Chiều cao',    abbr:'CC', unit:'cm' }
    };
    const SHORT = new Set(['yob','m','t','ha','nt','cn','cc']);
    // Nhóm ô theo từng kiểu bố cục (ô bị tắt sẽ tự bỏ, ô lẻ ngắn đứng cạnh nhau sẽ gộp thành một dòng)
    const GROUPS = {
      std:[['name'],['yob'],['kp'],['cp'],['m','t'],['ha','nt'],['cn','cc']],
      p5: [['name'],['yob','cn'],['cc'],['kp','cp'],['m','t'],['ha','nt']],
      p6: [['name'],['yob','cn'],['cc'],['kp'],['cp'],['m','t'],['ha','nt']]
    };
    const DEFAULT_OPTS = {
      title:'full',      // full | short | none
      rule:true,         // đường kẻ ngang dưới số phiếu
      abbr:false,        // viết gọn nhãn: NS, KP, CP, M, T, HA, NT, CN, CC
      fields:{ name:1, yob:1, kp:1, cp:1, m:1, t:1, ha:1, nt:1, cn:1, cc:0 }
    };
    let opts = loadOpts();

    function loadOpts(){
      const o = JSON.parse(JSON.stringify(DEFAULT_OPTS));
      try{
        const r = JSON.parse(localStorage.getItem(OPT_KEY) || 'null');
        if(r){
          if(['full','short','none'].includes(r.title)) o.title = r.title;
          if(typeof r.rule === 'boolean') o.rule = r.rule;
          if(typeof r.abbr === 'boolean') o.abbr = r.abbr;
          if(r.fields) Object.keys(o.fields).forEach(k => { if(k in r.fields) o.fields[k] = r.fields[k] ? 1 : 0; });
        }
      }catch(e){}
      return o;
    }
    function saveOpts(){ try{ localStorage.setItem(OPT_KEY, JSON.stringify(opts)); }catch(e){} }

    function fld(key, L){
      const d = FDEF[key];
      let label = opts.abbr ? d.abbr : d.full, cls = '';
      if(d.unit){
        // phiếu rộng + nhãn đầy đủ: ghi đơn vị trong nhãn; còn lại: đơn vị nằm cuối ô nhập
        if(!opts.abbr && L.mode !== 'p6') label += ` (${d.unit})`;
        else cls = ` u u-${d.unit}`;
      }
      return `<div class="sh-field"><span class="sh-label">${label}</span><span class="sh-box${cls}"></span></div>`;
    }

    function rowsFor(L){
      let groups = GROUPS[L.mode].map(g => g.filter(k => opts.fields[k])).filter(g => g.length);
      const merged = [];
      groups.forEach(g => {
        const prev = merged[merged.length - 1];
        if(prev && prev.length === 1 && g.length === 1 && SHORT.has(prev[0]) && SHORT.has(g[0])) prev.push(g[0]);
        else merged.push(g.slice());
      });
      return merged;
    }

    function headHtml(L, numStr){
      const compact = L.head === 'c';
      let name = '';
      if(opts.title === 'full') name = compact ? 'BỆNH VIỆN ĐA KHOA<br>BÌNH DƯƠNG - CƠ SỞ 2' : 'BỆNH VIỆN ĐA KHOA BÌNH DƯƠNG - CƠ SỞ 2';
      else if(opts.title === 'short') name = 'BVĐK BÌNH DƯƠNG CS2';
      const nm = name ? `<span class="sh-hosp-name">${name}</span>` : '';
      const no = `<span class="sh-slip-no">${numStr}</span>`;
      const cls = 'sh-slip-head' + (compact ? ' sh-hc' : '') + (name ? '' : ' sh-nonm');
      return compact ? `<div class="${cls}">${no}${nm}</div>` : `<div class="${cls}">${nm}${no}</div>`;
    }

    function buildSlip(num, L){
      const numStr = String(num).padStart(3,'0');
      const rows = rowsFor(L);
      if(L.mode === 'std'){
        const body = rows.map(g => g.length === 2
          ? `<div class="sh-row2">${g.map(k => fld(k, L)).join('')}</div>`
          : fld(g[0], L)).join('');
        return `<div class="sh-slip">${headHtml(L, numStr)}${body}</div>`;
      }
      const body = rows.map(g => `<div class="sh-rowp">${g.map(k => fld(k, L)).join('')}</div>`).join('');
      return `<div class="sh-slip sh-p">${headHtml(L, numStr)}${body}</div>`;
    }

    function updateEndFromSheets(){
      const start = parseInt(el('shStartInput').value, 10) || 1;
      let sheets = parseInt(el('shSheetsInput').value, 10);
      if(!sheets || sheets < 1) sheets = 1;
      el('shSheetsInput').value = sheets;
      el('shEndInput').value = start + sheets * getPer() - 1;
      render();
    }

    function render(){
      const perSheet = getPer();
      const L = LAYOUTS[perSheet];

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
        `Sẽ tạo phiếu #${String(start).padStart(3,'0')} → #${String(end).padStart(3,'0')}  (${sheetCount} tờ A4, ${perSheet} phiếu/tờ)`;

      const sheetsDiv = el('shSheets');
      sheetsDiv.innerHTML = '';

      let counter = start;
      for(let s=0; s<sheetCount; s++){
        const sheet = document.createElement('div');
        sheet.className = 'sh-sheet sh-a4' + (opts.rule ? '' : ' sh-norule');
        sheet.style.setProperty('--sh-c', L.c);
        sheet.style.setProperty('--sh-r', L.r);
        sheet.style.setProperty('--sh-gx', L.gx);
        sheet.style.setProperty('--sh-gy', L.gy);
        sheet.style.setProperty('--k', L.k);
        let html = '';
        for(let i=0; i<perSheet && counter<=end; i++){
          html += buildSlip(counter, L);
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

    // Khôi phục lựa chọn số phiếu/tờ lần trước
    try {
      const saved = parseInt(localStorage.getItem(PER_KEY), 10);
      if(LAYOUTS[saved]) el('shPerSheet').value = String(saved);
    } catch(e){}

    // ---- Bảng tùy chỉnh: đồng bộ giao diện <-> opts ----
    function syncOptUI(){
      el('shTitle').value = opts.title;
      el('shRule').checked = opts.rule;
      el('shAbbr').checked = opts.abbr;
      document.querySelectorAll('#shFields input[data-f]').forEach(i => { i.checked = !!opts.fields[i.dataset.f]; });
    }
    function readOptUI(){
      opts.title = el('shTitle').value;
      opts.rule = el('shRule').checked;
      opts.abbr = el('shAbbr').checked;
      document.querySelectorAll('#shFields input[data-f]').forEach(i => { opts.fields[i.dataset.f] = i.checked ? 1 : 0; });
      saveOpts();
      render();
    }
    ['shTitle','shRule','shAbbr'].forEach(id => el(id).addEventListener('change', readOptUI));
    document.querySelectorAll('#shFields input[data-f]').forEach(i => i.addEventListener('change', readOptUI));
    el('shOptReset').addEventListener('click', () => {
      opts = JSON.parse(JSON.stringify(DEFAULT_OPTS));
      saveOpts(); syncOptUI(); render();
    });
    syncOptUI();

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
    el('shPerSheet').addEventListener('change', () => {
      try { localStorage.setItem(PER_KEY, String(getPer())); } catch(e){}
      updateEndFromSheets();
    });
    el('shPrintBtn').addEventListener('click', printSinhHieu);

    updateEndFromSheets();
  })();
