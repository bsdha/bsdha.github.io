// Trang "Tiện ích Helix": đọc trực tiếp phiên bản (@version) và khối ChangeLog
// nhúng ngay trong file helix/helixfast.user.js để hiển thị lên trang.
// => Mỗi lần upload bản helixfast.user.js mới (có cập nhật số version + thêm
//    dòng ChangeLog), trang này TỰ ĐỘNG nhận diện, không cần sửa index.html.
(function () {
  const SOURCE_PATH = '/helix/helixfast.user.js';

  const versionBadge = document.getElementById('hlxVersionBadge');
  const sourceBtn = document.getElementById('hlxSourceBtn');
  const changelogBox = document.getElementById('hlxChangelogBox');

  if (!versionBadge && !changelogBox) return;

  if (sourceBtn) {
    sourceBtn.href = SOURCE_PATH;
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"]/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
    }[c]));
  }

  function parseVersion(text) {
    const m = text.match(/@version\s+([^\s\r\n]+)/);
    return m ? m[1] : null;
  }

  // Khối ChangeLog dạng:
  // /* ==ChangeLog==
  // 1.5 | 2026-09-14 | Mô tả...
  // 1.4 |  | Mô tả...
  // ==/ChangeLog== */
  function parseChangelog(text) {
    const block = text.match(/==ChangeLog==([\s\S]*?)==\/ChangeLog==/);
    if (!block) return [];
    return block[1]
      .split(/\r?\n/)
      .map((line) => line.replace(/^\*+\s*/, '').trim())
      .filter((line) => line && line.indexOf('|') !== -1)
      .map((line) => {
        const parts = line.split('|').map((p) => p.trim());
        return { version: parts[0] || '', date: parts[1] || '', desc: parts.slice(2).join('|').trim() };
      })
      .filter((entry) => entry.version);
  }

  fetch(SOURCE_PATH + '?v=' + Date.now())
    .then((res) => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    })
    .then((text) => {
      const version = parseVersion(text);
      const entries = parseChangelog(text);

      if (versionBadge) {
        versionBadge.textContent = version ? ('🏷️ Phiên bản ' + version) : '🏷️ Chưa rõ phiên bản';
      }

      if (changelogBox) {
        if (!entries.length) {
          changelogBox.innerHTML = '<div class="hlx-cl-error">Chưa có dữ liệu nhật ký cập nhật.</div>';
          return;
        }
        changelogBox.innerHTML = entries.map((e, i) => (
          '<div class="hlx-cl-item">'
            + '<div class="hlx-cl-top">'
              + '<span class="hlx-cl-ver">v' + escapeHtml(e.version) + '</span>'
              + (e.date ? '<span class="hlx-cl-date">' + escapeHtml(e.date) + '</span>' : '')
              + (i === 0 ? '<span class="hlx-cl-latest">Mới nhất</span>' : '')
            + '</div>'
            + (e.desc ? '<p class="hlx-cl-desc">' + escapeHtml(e.desc) + '</p>' : '')
          + '</div>'
        )).join('');
      }
    })
    .catch(() => {
      if (versionBadge) versionBadge.textContent = '🏷️ Không tải được phiên bản';
      if (changelogBox) changelogBox.innerHTML = '<div class="hlx-cl-error">Không tải được nhật ký cập nhật, vui lòng thử lại sau.</div>';
    });
})();
