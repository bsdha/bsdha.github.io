    (function () {
      const sangEl = document.getElementById('insSang');
      const truaEl = document.getElementById('insTrua');
      const chieuEl = document.getElementById('insChieu');
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
        const daily = sang + trua + chieu;
        const monthlyUI = daily * 30;
        const pens = daily > 0 ? Math.ceil(monthlyUI / penSize) : 0;

        const exactPens = daily > 0 ? monthlyUI / penSize : 0;
        const exactPensStr = (Math.round(exactPens * 100) / 100).toString();

        dailyEl.textContent = (daily % 1 === 0 ? daily : daily.toFixed(1));
        monthEl.textContent = 'Cần cấp cho BN: ' + pens + ' bút/tháng';
        breakdownEl.textContent = daily > 0
          ? 'Số bút lẻ theo liều thực tế: ' + exactPensStr + ' bút/tháng'
          : '';

        if (daily > 0) logUsage('insulin_calc');
      }

      [sangEl, truaEl, chieuEl, penSizeEl].forEach(el => el.addEventListener('input', calc));

      // Enter ở ô Sáng -> Trưa -> Chiều
      sangEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); truaEl.focus(); } });
      truaEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); chieuEl.focus(); } });
      chieuEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); chieuEl.blur(); calc(); } });

      calc();
    })();
