    (function () {
      const sangEl = document.getElementById('insSang');
      const truaEl = document.getElementById('insTrua');
      const chieuEl = document.getElementById('insChieu');
      const soNgayEl = document.getElementById('insSoNgay');
      const penSizeEl = document.getElementById('insPenSize');
      const dailyEl = document.getElementById('insDailyDose');
      const monthEl = document.getElementById('insPensPerMonth');
      const breakdownEl = document.getElementById('insBreakdown');

      function num(el) {
        const v = parseFloat(el.value);
        return isNaN(v) || v < 0 ? 0 : v;
      }

      function calc() {
        const sang = num(sangEl), trua = num(truaEl), chieu = num(chieuEl);
        const penSize = parseFloat(penSizeEl.value) > 0 ? parseFloat(penSizeEl.value) : 300;
        const soNgay = parseFloat(soNgayEl.value) > 0 ? parseFloat(soNgayEl.value) : 30;
        const daily = sang + trua + chieu;
        const totalUI = daily * soNgay;
        const pens = daily > 0 ? Math.ceil(totalUI / penSize) : 0;

        const exactPens = daily > 0 ? totalUI / penSize : 0;
        const exactPensStr = (Math.round(exactPens * 100) / 100).toString();

        const soNgayStr = (soNgay % 1 === 0 ? soNgay : soNgay.toFixed(1));

        dailyEl.textContent = (daily % 1 === 0 ? daily : daily.toFixed(1));
        monthEl.textContent = 'Cần cấp cho BN: ' + pens + ' bút/' + soNgayStr + ' ngày';
        breakdownEl.textContent = daily > 0
          ? 'Số bút lẻ theo liều thực tế: ' + exactPensStr + ' bút/' + soNgayStr + ' ngày'
          : '';

        if (daily > 0) logUsage('insulin_calc');
      }

      [sangEl, truaEl, chieuEl, soNgayEl, penSizeEl].forEach(el => el.addEventListener('input', calc));

      // Enter ở ô Sáng -> Trưa -> Chiều -> Số ngày cấp bút
      sangEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); truaEl.focus(); } });
      truaEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); chieuEl.focus(); } });
      chieuEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); soNgayEl.focus(); } });
      soNgayEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); soNgayEl.blur(); calc(); } });

      calc();
    })();
