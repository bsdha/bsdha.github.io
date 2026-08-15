/**
 * BSDHA Usage Tracker Worker — bản đầy đủ
 * ============================================================
 * - POST /log?action=xxx              -> tăng bộ đếm "xxx" (theo ngày + tổng)
 * - GET  /stats?key=STATS_KEY         -> bảng HTML thống kê lượt dùng (mới nhất trên cùng)
 * - GET  /stats?key=STATS_KEY&format=json -> JSON thuần (banner trang chủ dùng cái này)
 * - POST /prescriptions               -> lưu 1 đơn thuốc đã ẩn danh (tên -> chữ cái đầu)
 * - GET  /prescriptions?key=RX_KEY    -> xem lại danh sách đơn đã lưu (mới nhất trên cùng)
 * - GET  /news                        -> tin tức y khoa (VnExpress/Tuổi Trẻ + PubMed), cache 30 phút
 *
 * Biến môi trường cần cấu hình trong Cloudflare (Settings -> Variables):
 *   STATS_KEY        - mật khẩu xem /stats (đã có sẵn)
 *   RX_KEY            - mật khẩu MỚI, riêng, để xem lại đơn thuốc ở /prescriptions
 *   RX_WRITE_TOKEN    - chuỗi chống spam ghi, PHẢI khớp với RX_WRITE_TOKEN trong js/analytics.js
 *                        (hiện tại analytics.js đang dùng: 'bsdha-rx-write-2026')
 *
 * KV Namespace binding: "USAGE_KV" (đã có sẵn, dùng chung cho mọi loại dữ liệu ở trên).
 */

const ALLOWED_ACTIONS = new Set([
  "icd_search",
  "sinhhieu_generate",
  "insulin_calc",
  "ldl_calc",
  "egfr_calc",
  "donthuoc_save",
  "pdf2word_convert",
  "pdftools_use",
]);

const ACTION_LABELS = {
  icd_search: "Tra cứu ICD-10",
  sinhhieu_generate: "Tạo phiếu sinh hiệu",
  insulin_calc: "Insulin & Đường huyết",
  ldl_calc: "Tính LDL-C",
  egfr_calc: "Tính eGFR",
  donthuoc_save: "Kê đơn thuốc",
  pdf2word_convert: "Chuyển đổi tài liệu (AI)",
  pdftools_use: "Công cụ PDF",
};

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(data, status, origin, extraHeaders) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(origin),
      ...(extraHeaders || {}),
    },
  });
}

function todayKey() {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Chỉ dùng để HIỂN THỊ: 2026-08-14 -> 14/08/2026 (khóa lưu KV vẫn giữ ISO để sort đúng)
function toDisplayDate(isoDay) {
  if (!isoDay) return "";
  const [yyyy, mm, dd] = isoDay.split("-");
  return `${dd}/${mm}/${yyyy}`;
}

function escHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function incr(kv, key) {
  const current = parseInt((await kv.get(key)) || "0", 10);
  await kv.put(key, String(current + 1));
}

/* ================= /log ================= */

async function handleLog(request, env) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (!action || !ALLOWED_ACTIONS.has(action)) {
    return jsonResponse({ ok: false, error: "invalid action" }, 400, request.headers.get("Origin"));
  }

  const day = todayKey();
  await Promise.all([
    incr(env.USAGE_KV, `total:${action}`),
    incr(env.USAGE_KV, `day:${day}:${action}`),
  ]);

  return jsonResponse({ ok: true }, 200, request.headers.get("Origin"));
}

/* ================= /stats ================= */

async function collectStats(env, fromParam, toParam) {
  const totals = {};
  for (const action of ALLOWED_ACTIONS) {
    totals[action] = parseInt((await env.USAGE_KV.get(`total:${action}`)) || "0", 10);
  }

  const daySet = new Set();
  let cursor;
  do {
    const page = await env.USAGE_KV.list({ prefix: "day:", cursor });
    for (const { name } of page.keys) {
      const parts = name.split(":");
      const day = parts[1];
      const action = parts.slice(2).join(":");
      if (!ALLOWED_ACTIONS.has(action)) continue;
      daySet.add(day);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  const allDaysDesc = [...daySet].sort().reverse(); // mới nhất lên trên
  const filteredDays = allDaysDesc.filter(
    (d) => (!fromParam || d >= fromParam) && (!toParam || d <= toParam)
  );

  const daily = {};
  for (const day of filteredDays) {
    daily[day] = {};
    for (const action of ALLOWED_ACTIONS) {
      daily[day][action] = parseInt((await env.USAGE_KV.get(`day:${day}:${action}`)) || "0", 10);
    }
  }

  return { totals, filteredDays, daily };
}

async function handleStatsJson(env, fromParam, toParam, origin) {
  const { totals, filteredDays, daily } = await collectStats(env, fromParam, toParam);

  const days = filteredDays.map((isoDay) => ({
    date: isoDay,
    dateDisplay: toDisplayDate(isoDay),
    counts: daily[isoDay],
  }));

  return jsonResponse(
    {
      updated: new Date().toISOString(),
      totals,
      today: days[0] ? days[0].counts : null,
      todayDate: days[0] ? days[0].dateDisplay : null,
      days,
    },
    200,
    origin,
    { "Cache-Control": "public, max-age=300" }
  );
}

async function handleStatsHtml(env, fromParam, toParam, key) {
  const { totals, filteredDays, daily } = await collectStats(env, fromParam, toParam);

  const rangeLabel = filteredDays.length
    ? `từ ${toDisplayDate(filteredDays[filteredDays.length - 1])} đến ${toDisplayDate(filteredDays[0])} (${filteredDays.length} ngày có dữ liệu, mới nhất trên cùng)`
    : "chưa có dữ liệu";

  const html = `<!DOCTYPE html>
<html lang="vi"><head><meta charset="UTF-8"><title>Thống kê sử dụng BSDHA</title>
<style>
  body{font-family:Arial,sans-serif;background:#f4f1ea;padding:24px;color:#1c2b2f;}
  h1{font-size:20px;}
  .sub{font-size:13px;color:#5a6b68;margin:-8px 0 16px 0;}
  table{border-collapse:collapse;background:#fff;margin-bottom:24px;width:100%;max-width:900px;}
  th,td{border:1px solid #ccc;padding:6px 10px;font-size:13px;text-align:right;}
  th{background:#2f6f5e;color:#fff;}
  td:first-child, th:first-child{text-align:left;}
  form.filter{margin-bottom:16px;font-size:13px;}
  form.filter input{padding:4px 8px;border:1px solid #ccc;border-radius:4px;}
  form.filter button{padding:5px 12px;border:1px solid #2f6f5e;background:#2f6f5e;color:#fff;border-radius:4px;cursor:pointer;}
  .json-link{font-size:12.5px;}
</style></head><body>
  <h1>📊 Thống kê sử dụng — Tổng cộng (toàn bộ thời gian)</h1>
  <table>
    <tr><th>Chức năng</th><th>Tổng số lượt</th></tr>
    ${[...ALLOWED_ACTIONS].map((k) => `<tr><td>${ACTION_LABELS[k] || k}</td><td>${totals[k]}</td></tr>`).join("")}
  </table>

  <h1>📅 Chi tiết theo ngày (mới nhất trên cùng)</h1>
  <div class="sub">Hiển thị ${rangeLabel}</div>
  <form class="filter" method="get">
    <input type="hidden" name="key" value="${escHtml(key)}">
    Từ ngày: <input type="date" name="from" value="${escHtml(fromParam || "")}">
    Đến ngày: <input type="date" name="to" value="${escHtml(toParam || "")}">
    <button type="submit">Lọc</button>
    ${(fromParam || toParam) ? `<a href="?key=${encodeURIComponent(key)}" style="margin-left:8px;">Xem tất cả</a>` : ""}
  </form>
  <table>
    <tr><th>Ngày</th>${[...ALLOWED_ACTIONS].map((a) => `<th>${ACTION_LABELS[a] || a}</th>`).join("")}</tr>
    ${filteredDays.map((day) => `<tr><td>${toDisplayDate(day)}</td>${[...ALLOWED_ACTIONS].map((a) => `<td>${daily[day][a]}</td>`).join("")}</tr>`).join("")}
  </table>

  <p class="json-link">🔗 JSON (dùng cho banner/script khác):
    <a href="?key=${encodeURIComponent(key)}&format=json">?key=${encodeURIComponent(key)}&format=json</a>
    &nbsp;|&nbsp; <a href="/prescriptions?key=${encodeURIComponent(key)}">Xem đơn thuốc đã lưu →</a>
    (dùng RX_KEY riêng, không phải key này)
  </p>
</body></html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=UTF-8" } });
}

async function handleStats(request, env) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  if (!env.STATS_KEY || key !== env.STATS_KEY) {
    return new Response("Không có quyền xem thống kê.", { status: 401 });
  }

  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const format = url.searchParams.get("format");

  if (format === "json") {
    return handleStatsJson(env, fromParam, toParam, request.headers.get("Origin"));
  }
  return handleStatsHtml(env, fromParam, toParam, key);
}

/* ================= /prescriptions ================= */
// Lưu ý: đơn thuốc đã được ẩn danh 1 phần TRƯỚC KHI gửi lên đây (xem maskPatientName
// trong js/analytics.js) — tên bệnh nhân chỉ còn là chữ cái đầu, không có địa chỉ/SĐT.
// RX_WRITE_TOKEN chỉ để chặn spam ghi rác, KHÔNG phải cơ chế bảo mật thật sự.

function rxRecordKey(isoTimestamp, randomSuffix) {
  // Tiền tố "rx:" + timestamp ISO đảo được để list() trả theo thời gian ghi
  return `rx:${isoTimestamp}:${randomSuffix}`;
}

async function handlePrescriptionWrite(request, env) {
  const origin = request.headers.get("Origin");

  if (!env.RX_WRITE_TOKEN) {
    return jsonResponse({ ok: false, error: "server chưa cấu hình RX_WRITE_TOKEN" }, 500, origin);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ ok: false, error: "body không hợp lệ" }, 400, origin);
  }

  if (!body || body.token !== env.RX_WRITE_TOKEN) {
    return jsonResponse({ ok: false, error: "sai token" }, 403, origin);
  }

  const now = new Date();
  const record = {
    saved_at: now.toISOString(),
    doctor: String(body.doctor || "").slice(0, 120),
    patient_initials: String(body.patient_initials || "").slice(0, 20),
    rx_date: String(body.rx_date || "").slice(0, 20),
    age: Number.isFinite(body.age) ? body.age : null,
    sex: String(body.sex || "").slice(0, 10),
    diagnosis: String(body.diagnosis || "").slice(0, 300),
    drugs: Array.isArray(body.drugs)
      ? body.drugs.slice(0, 40).map((d) => ({
          brand: String(d && d.brand || "").slice(0, 120),
          generic: String(d && d.generic || "").slice(0, 120),
          days: d && d.days != null ? d.days : null,
          qty: d && d.qty != null ? d.qty : null,
        }))
      : [],
  };

  const randomSuffix = crypto.randomUUID().slice(0, 8);
  const key = rxRecordKey(now.toISOString(), randomSuffix);
  await env.USAGE_KV.put(key, JSON.stringify(record));

  return jsonResponse({ ok: true }, 200, origin);
}

async function collectPrescriptions(env, limit) {
  const keys = [];
  let cursor;
  do {
    const page = await env.USAGE_KV.list({ prefix: "rx:", cursor });
    for (const k of page.keys) keys.push(k.name);
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  // Tên khóa chứa timestamp ISO ở giữa -> sort chuỗi tăng dần rồi đảo là ra mới nhất trước
  keys.sort().reverse();
  const limited = keys.slice(0, limit || 300);

  const records = [];
  for (const key of limited) {
    const raw = await env.USAGE_KV.get(key);
    if (!raw) continue;
    try {
      records.push({ key, ...JSON.parse(raw) });
    } catch (e) { /* bỏ qua bản ghi lỗi */ }
  }
  return records;
}

async function handlePrescriptionRead(request, env) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  if (!env.RX_KEY || key !== env.RX_KEY) {
    return new Response("Không có quyền xem đơn thuốc.", { status: 401 });
  }

  const records = await collectPrescriptions(env, 300);

  const rows = records.map((r) => {
    const savedLocal = r.saved_at ? new Date(r.saved_at) : null;
    const savedDisplay = savedLocal
      ? `${String(savedLocal.getUTCDate()).padStart(2, "0")}/${String(savedLocal.getUTCMonth() + 1).padStart(2, "0")}/${savedLocal.getUTCFullYear()} ${String(savedLocal.getUTCHours()).padStart(2, "0")}:${String(savedLocal.getUTCMinutes()).padStart(2, "0")}`
      : "";
    const drugsStr = (r.drugs || [])
      .map((d) => `${d.brand}${d.generic ? " (" + d.generic + ")" : ""}${d.qty ? " — " + d.qty : ""}`)
      .join("<br>");
    return `<tr>
      <td>${escHtml(savedDisplay)}</td>
      <td>${escHtml(r.doctor)}</td>
      <td>${escHtml(r.patient_initials)}</td>
      <td>${escHtml(r.age)}</td>
      <td>${escHtml(r.sex)}</td>
      <td>${escHtml(r.diagnosis)}</td>
      <td style="text-align:left;">${drugsStr}</td>
    </tr>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="vi"><head><meta charset="UTF-8"><title>Đơn thuốc đã lưu — BSDHA</title>
<style>
  body{font-family:Arial,sans-serif;background:#f4f1ea;padding:24px;color:#1c2b2f;}
  h1{font-size:20px;}
  .sub{font-size:13px;color:#5a6b68;margin:-8px 0 16px 0;}
  table{border-collapse:collapse;background:#fff;width:100%;font-size:12.5px;}
  th,td{border:1px solid #ccc;padding:6px 8px;text-align:right;vertical-align:top;}
  th{background:#2f6f5e;color:#fff;}
  td:first-child, th:first-child, td:nth-child(2), th:nth-child(2),
  td:nth-child(3), th:nth-child(3), td:nth-child(6), th:nth-child(6),
  td:last-child, th:last-child { text-align:left; }
</style></head><body>
  <h1>💊 Đơn thuốc đã lưu (mới nhất trên cùng)</h1>
  <div class="sub">${records.length} bản ghi — chỉ hiển thị tên viết tắt bệnh nhân, không có địa chỉ/SĐT.</div>
  <table>
    <tr><th>Thời gian lưu</th><th>Bác sĩ</th><th>BN (viết tắt)</th><th>Tuổi</th><th>Giới</th><th>Chẩn đoán</th><th>Thuốc</th></tr>
    ${rows || `<tr><td colspan="7">Chưa có dữ liệu.</td></tr>`}
  </table>
</body></html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=UTF-8" } });
}

async function handlePrescriptions(request, env) {
  if (request.method === "POST") return handlePrescriptionWrite(request, env);
  if (request.method === "GET") return handlePrescriptionRead(request, env);
  return new Response("Method not allowed", { status: 405 });
}

/* ================= /news ================= */

const NEWS_SOURCES = [
  { name: "VnExpress Sức khỏe", url: "https://vnexpress.net/rss/suc-khoe.rss" },
  { name: "Tuổi Trẻ Sức khỏe", url: "https://tuoitre.vn/rss/suc-khoe.rss" },
];
const PUBMED_QUERY = "diabetes OR hypertension OR chronic kidney disease";

async function fetchRssItems(source, limit) {
  try {
    const res = await fetch(source.url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BSDHA-NewsBot/1.0)" },
      cf: { cacheTtl: 1800, cacheEverything: true },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const items = [];
    const blocks = xml.split("<item>").slice(1);
    for (const block of blocks.slice(0, limit || 5)) {
      const title = (block.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "";
      const link = (block.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || "";
      const clean = title.replace(/<!\[CDATA\[|\]\]>/g, "").trim();
      if (clean) items.push({ type: "news", source: source.name, title: clean, url: link.trim() });
    }
    return items;
  } catch (e) {
    return [];
  }
}

async function fetchPubmedItems(limit) {
  try {
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=${limit || 5}&sort=pub+date&term=${encodeURIComponent(PUBMED_QUERY)}`;
    const searchRes = await fetch(searchUrl, { cf: { cacheTtl: 1800, cacheEverything: true } });
    const searchJson = await searchRes.json();
    const ids = (searchJson && searchJson.esearchresult && searchJson.esearchresult.idlist) || [];
    if (!ids.length) return [];

    const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(",")}`;
    const summaryRes = await fetch(summaryUrl, { cf: { cacheTtl: 1800, cacheEverything: true } });
    const summaryJson = await summaryRes.json();

    return ids.map((id) => {
      const doc = summaryJson && summaryJson.result && summaryJson.result[id];
      if (!doc) return null;
      return {
        type: "pubmed",
        source: "PubMed",
        title: (doc.title || "").replace(/<[^>]+>/g, "").trim(),
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
      };
    }).filter(Boolean);
  } catch (e) {
    return [];
  }
}

async function handleNews(request, env, ctx) {
  const cache = caches.default;
  const cacheKey = new Request(request.url, request);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const [rssResults, pubmedItems] = await Promise.all([
    Promise.all(NEWS_SOURCES.map((s) => fetchRssItems(s, 5))),
    fetchPubmedItems(5),
  ]);

  const items = [...rssResults.flat(), ...pubmedItems];

  const response = jsonResponse(
    { updated: new Date().toISOString(), items },
    200,
    request.headers.get("Origin"),
    { "Cache-Control": "public, max-age=1800" }
  );

  if (ctx && ctx.waitUntil) ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

/* ================= router ================= */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(request.headers.get("Origin")) });
    }

    if (url.pathname === "/log" && request.method === "POST") {
      return handleLog(request, env);
    }

    if (url.pathname === "/stats" && request.method === "GET") {
      return handleStats(request, env);
    }

    if (url.pathname === "/prescriptions") {
      return handlePrescriptions(request, env);
    }

    if (url.pathname === "/news" && request.method === "GET") {
      return handleNews(request, env, ctx);
    }

    return new Response("Not found", { status: 404 });
  },
};
