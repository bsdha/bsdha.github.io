(function () {
  const input = document.getElementById('toolSearchInput');
  const wrap = document.getElementById('toolSearchWrap');
  const clearBtn = document.getElementById('toolSearchClear');
  const emptyEl = document.getElementById('toolSearchEmpty');

  if (!input) return;

  function normalize(str) {
    return String(str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .trim();
  }

  // Xây sẵn danh sách công cụ có thể tìm (đọc 1 lần từ DOM, không phụ thuộc HIS/mạng)
  const cards = Array.prototype.slice.call(document.querySelectorAll('#page-home .hcard')).map((el) => {
    const title = el.querySelector('h2') ? el.querySelector('h2').textContent : '';
    const desc = el.querySelector('p') ? el.querySelector('p').textContent : '';
    const kw = el.getAttribute('data-kw') || '';
    return {
      el,
      haystack: normalize(title + ' ' + desc + ' ' + kw),
    };
  });

  function applyFilter() {
    const raw = input.value || '';
    wrap.classList.toggle('has-value', raw.length > 0);
    const q = normalize(raw);

    if (!q) {
      cards.forEach((c) => c.el.classList.remove('ts-hidden'));
      document.querySelectorAll('#page-home .hgrid').forEach((g) => g.classList.remove('ts-hidden'));
      document.querySelectorAll('#page-home .home-group-title').forEach((g) => g.classList.remove('ts-hidden'));
      emptyEl.classList.remove('show');
      return;
    }

    // Cho phép nhiều từ khóa cách nhau bởi khoảng trắng, tất cả đều phải khớp (AND)
    const terms = q.split(/\s+/).filter(Boolean);
    let anyVisible = false;

    cards.forEach((c) => {
      const match = terms.every((t) => c.haystack.indexOf(t) !== -1);
      c.el.classList.toggle('ts-hidden', !match);
      if (match) anyVisible = true;
    });

    // Ẩn cả grid + tiêu đề nhóm nếu không còn thẻ nào hiển thị trong nhóm đó
    document.querySelectorAll('#page-home .hgrid').forEach((grid) => {
      const visibleInGrid = Array.prototype.slice.call(grid.querySelectorAll('.hcard')).some((el) => !el.classList.contains('ts-hidden'));
      grid.classList.toggle('ts-hidden', !visibleInGrid);
      const titleEl = grid.previousElementSibling;
      if (titleEl && titleEl.classList && titleEl.classList.contains('home-group-title')) {
        titleEl.classList.toggle('ts-hidden', !visibleInGrid);
      }
    });

    emptyEl.classList.toggle('show', !anyVisible);
  }

  input.addEventListener('input', applyFilter);

  clearBtn.addEventListener('click', () => {
    input.value = '';
    applyFilter();
    input.focus();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      input.value = '';
      applyFilter();
      input.blur();
    }
  });
})();
