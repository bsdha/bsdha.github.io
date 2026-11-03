/* Gọi số khám bệnh - BVĐK Bình Dương CS2. Tự chạy khi mở trang /clinic-queue (Shadow DOM, không ảnh hưởng CSS của web).
   Giọng ghi sẵn nằm trong clinic-queue-voice.js (đã mã hóa), chỉ tải khi máy đã kích hoạt. */
(function(){
var BASE=((document.currentScript&&document.currentScript.src)||"").replace(/[^\/]*$/,"");
var ORG="BỆNH VIỆN ĐA KHOA BÌNH DƯƠNG – CƠ SỞ 2",DEPT="Khu khám bệnh";
var CSS="\n#r{--bg:#e8f1f4;--bgimg:none;--ink:#10303a;--mut:#5a7781;--card:#fff;--line:#c6d9df;--acc:#0b7a75;--accink:#fff;--hero:#fff;--herob:#0b7a75;--heros:0 8px 26px rgba(11,122,117,.18);--brk:transparent;--num:#0a4d68;--nums:none;--to:#0b7a75;--tos:none;--lab:#4c6a74;--go:#0b7a75;--gos:0 4px 14px rgba(11,122,117,.35);--laneon:#0b7a75;--lanes:0 0 0 3px rgba(11,122,117,.18);--flash:rgba(11,122,117,.45);--lnum:#0b7a75;--dlg:#fff;--inp:#fff;\n}\n#r[data-skin=\"neon\"]{--bg:#070a1a;--bgimg:radial-gradient(900px 500px at 15% -10%,rgba(34,229,255,.16),transparent 60%),radial-gradient(800px 500px at 100% 10%,rgba(255,62,165,.14),transparent 60%);--ink:#e8ecff;--mut:#8e98c9;--card:rgba(255,255,255,.05);--line:rgba(130,150,255,.28);--acc:#22e5ff;--accink:#050818;--hero:linear-gradient(160deg,#101646,#090c26 70%);--herob:#22e5ff;--heros:0 0 0 4px rgba(34,229,255,.08),0 0 28px rgba(34,229,255,.5),inset 0 0 50px rgba(34,229,255,.14);--brk:#ff3ea5;--num:#fff;--nums:0 0 10px #22e5ff,0 0 30px #22e5ff,0 0 70px rgba(34,229,255,.7);--to:#ff3ea5;--tos:0 0 10px #ff3ea5,0 0 28px rgba(255,62,165,.6);--lab:#b9c4ff;--go:linear-gradient(90deg,#16d9ff,#8a5bff);--gos:0 0 22px rgba(34,229,255,.5);--laneon:#ff3ea5;--lanes:0 0 18px rgba(255,62,165,.55);--flash:rgba(255,62,165,.6);--lnum:#22e5ff;--dlg:#0b1030;--inp:rgba(255,255,255,.07);color-scheme:dark}\n#r[data-skin=\"black\"]{--bg:#000;--ink:#f2f2f2;--mut:#a0a0a0;--card:#121212;--line:#2e2e2e;--acc:#ffd54a;--accink:#000;--hero:#0a0a0a;--herob:#ffd54a;--heros:none;--num:#fff;--to:#ffd54a;--lab:#c4c4c4;--go:#ffd54a;--gos:none;--laneon:#ffd54a;--lanes:0 0 0 2px rgba(255,213,74,.25);--flash:rgba(255,213,74,.5);--lnum:#ffd54a;--dlg:#141414;--inp:#1a1a1a;color-scheme:dark}\n#r[data-skin=\"navy\"]{--bg:#0b1f33;--ink:#e6f1ff;--mut:#8fa9c4;--card:#112b45;--line:#24476b;--acc:#4fc3f7;--accink:#04202f;--hero:#0e263f;--herob:#4fc3f7;--heros:0 8px 26px rgba(0,0,0,.35);--num:#e6f6ff;--to:#7fe0c0;--lab:#9bb7d1;--go:#4fc3f7;--gos:none;--laneon:#4fc3f7;--lanes:0 0 0 3px rgba(79,195,247,.2);--flash:rgba(79,195,247,.45);--lnum:#4fc3f7;--dlg:#0e263f;--inp:#0b2238;color-scheme:dark}\n#r:not([data-skin=\"clinic\"]) .pill.ok{color:#5be3a0}#r:not([data-skin=\"clinic\"]) .pill.bad,#r:not([data-skin=\"clinic\"]) .err{color:#ff8a70}\n.connrow{margin-top:6px}.pill.ok::before{content:\"● \"}.pill.bad::before{content:\"● \"}\n.grp{display:inline-flex;gap:8px;align-items:center}\n#unlock{display:none}#r.closed #unlock{display:inline-block}#r.show #unlock{display:none}\n#r.closed .num{font-size:clamp(70px,16vw,150px);color:var(--mut);text-shadow:none}\nbutton:disabled{opacity:.45;cursor:not-allowed}\n*{box-sizing:border-box}\n#r{margin:0;color:var(--ink);font:500 16px/1.4 system-ui,\"Segoe UI\",Roboto,sans-serif;min-height:60vh;background:var(--bgimg),var(--bg)}\n.wrap{max-width:1140px;margin:0 auto;padding:18px}\nheader{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-bottom:14px}\nheader>div:first-child{margin-right:auto}\nh1{font-size:24px;margin:0;font-weight:800}\n#r[data-skin=\"neon\"] h1{text-shadow:0 0 14px rgba(34,229,255,.7)}\n.sub{color:var(--mut);font-size:13px}\n.clock{font-size:30px;font-weight:800;font-variant-numeric:tabular-nums;color:var(--acc)}\n#r[data-skin=\"neon\"] .clock{text-shadow:0 0 10px #22e5ff,0 0 26px rgba(34,229,255,.6)}\n.tools{display:flex;gap:8px;flex-wrap:wrap;align-items:center;width:100%;justify-content:flex-end}\nbutton,select,input{font:inherit;color:inherit}\n.btn{border:1px solid var(--line);background:var(--card);padding:9px 14px;border-radius:12px;cursor:pointer;font-weight:700}\n.btn:hover{border-color:var(--acc)}\n.btn:focus-visible,select:focus-visible,input:focus-visible{outline:3px solid var(--acc);outline-offset:2px}\nselect,input{background:var(--inp);border:1px solid var(--line);border-radius:12px;padding:10px 12px}\nselect option{background:var(--dlg);color:var(--ink)}\ninput.n{width:96px}\n.grid{display:grid;grid-template-columns:1fr 330px;gap:16px}\n@media(max-width:860px){.grid{grid-template-columns:1fr}}\n.hero{position:relative;border-radius:26px;padding:22px 28px;background:var(--hero);border:3px solid var(--herob);box-shadow:var(--heros)}\n.hero::before,.hero::after{content:\"\";position:absolute;width:46px;height:46px;border:4px solid var(--brk)}\n.hero::before{top:-7px;left:-7px;border-right:0;border-bottom:0;border-radius:26px 0 0 0}\n.hero::after{bottom:-7px;right:-7px;border-left:0;border-top:0;border-radius:0 0 26px 0}\n.hero.flash{animation:flash 1.1s ease-out}\n@keyframes flash{from{box-shadow:0 0 0 8px var(--flash),0 0 60px var(--flash)}}\n.hero .lab{font-size:15px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--lab)}\n.num{font-weight:800;text-align:center;font-size:clamp(100px,23vw,230px);line-height:1.05;letter-spacing:.04em;font-variant-numeric:tabular-nums;color:var(--num);text-shadow:var(--nums);margin:6px 0 10px}\n.num.pulse{animation:pop .55s ease}\n@keyframes pop{0%{transform:scale(.9);opacity:.2}60%{transform:scale(1.04)}100%{transform:none;opacity:1}}\n@media(prefers-reduced-motion:reduce){.num.pulse,.hero.flash{animation:none}}\n.to{text-align:center;font-size:clamp(24px,4.4vw,40px);font-weight:800;color:var(--to);text-shadow:var(--tos);border-top:2px dashed var(--line);padding-top:14px}\n.ctrl{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:16px}\n.go{flex:1 1 230px;background:var(--go);color:var(--accink);border:0;border-radius:16px;padding:19px;font-size:21px;font-weight:800;cursor:pointer;box-shadow:var(--gos)}\n.go:active{transform:translateY(2px)}\n.status{color:var(--mut);font-size:13px;margin-top:10px;min-height:20px}\n.chips{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin-top:8px;font-size:14px}\n.pill{border:1px solid var(--line);background:var(--card);border-radius:20px;padding:4px 12px;font-weight:700}\n.pill.ok{color:#0a8a4a}.pill.bad{color:#d4380d}\n.sk{border:1px solid var(--laneon);background:transparent;border-radius:16px;padding:3px 10px;font-weight:800;cursor:pointer}\n.lanes{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-top:14px}\n.lane{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:12px 14px;opacity:.85}\n.lane.on{opacity:1;border-color:var(--laneon);box-shadow:var(--lanes)}\n.lane b{display:block;font-size:34px;font-variant-numeric:tabular-nums;color:var(--lnum)}\n.lane span{color:var(--mut);font-size:13px}\n.side{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:16px;display:flex;flex-direction:column;max-height:680px}\n.side h2{margin:0 0 8px;font-size:17px;display:flex;justify-content:space-between;align-items:center}\nol{list-style:none;margin:0;padding:0;overflow:auto;flex:1;scrollbar-width:thin}\nli{display:flex;gap:12px;align-items:baseline;padding:10px 6px;border-bottom:1px solid var(--line)}\nli b{font-size:24px;min-width:62px;font-variant-numeric:tabular-nums;color:var(--lnum)}\nli:first-child b{color:var(--to)}\nli span{color:var(--mut);font-size:13px}\n.empty{color:var(--mut);padding:12px 4px}\ndialog{border:2px solid var(--acc);border-radius:20px;background:var(--dlg);color:var(--ink);padding:22px;width:min(380px,92vw)}\ndialog::backdrop{background:rgba(3,10,16,.6)}\ndialog h2{margin:0 0 8px;font-size:18px}dialog p{margin:0 0 10px;color:var(--mut);font-size:14px}\ndialog label{display:block;font-size:13px;color:var(--mut);margin-top:8px}dialog input{width:100%}\n.acts{display:flex;gap:8px;justify-content:flex-end;margin-top:12px}\n.err{color:#d4380d;font-size:13px;min-height:18px}\n.okb{background:var(--acc);color:var(--accink);border:0}\n.br{display:flex;align-items:center;gap:8px;margin:3px 0;font-size:13px}.br span{width:44px;color:var(--mut)}.br em{flex:1;display:block}.br i{display:block;height:10px;border-radius:6px;background:var(--acc);min-width:2px}.br b{width:30px;text-align:right}\n.kv{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 10px}.kv div{flex:1 1 90px;border:1px solid var(--line);border-radius:12px;padding:8px 10px}.kv b{display:block;font-size:22px}\n#sbody{max-height:60vh;overflow:auto}\n#r.show .ctrl,#r.show .tools .hide,#r.show .side h2 button,#r.show .status,#r.show .chips .x{display:none}\n#r.show .grid{grid-template-columns:1fr}#r.show .actrow{display:none}\n\n#r:fullscreen{min-height:100vh;overflow:auto}header{margin-bottom:8px;gap:8px 12px}.hl{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}.connrow{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:4px}.actrow{display:inline-flex;gap:6px;align-items:center}.clock{font-size:28px}.tools select{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:9px 12px;font-weight:700;font-size:16px;cursor:pointer}.tools .btn{font-size:16px}.wrap{padding:14px 18px}.hero{padding:12px 26px 14px;border-radius:24px}.hero .lab{font-size:13px}.num{font-size:clamp(90px,14vw,150px);line-height:1;margin:2px 0 6px}.to{font-size:clamp(24px,3vw,34px);padding-top:8px}.ctrl{margin-top:12px}.ql{flex:0 0 210px;font-size:15px;font-weight:700}.ql select{width:100%;font-size:24px;font-weight:800;padding:14px 12px}.go{font-size:30px;padding:22px 16px;border-radius:20px}.ctrl2{margin-top:10px}.ctrl2 .btn{padding:12px;font-size:18px}.status{margin-top:6px;min-height:18px}.lower{margin-top:12px;padding-top:10px}.grid{align-items:start}.side{max-height:none}kbd{display:inline-block;margin-left:8px;padding:1px 6px;border:1px solid currentColor;border-radius:6px;font:700 11px/16px ui-monospace,Consolas,monospace;opacity:.65;vertical-align:middle}.go kbd{font-size:13px;line-height:20px;opacity:.8}dialog{font-size:17px}dialog select,dialog .btn,dialog input{font-size:17px;min-height:44px}#dlgS{width:min(600px,94vw)}.srow>span:first-child{font-size:16px}#r.show .tools select{display:none}.wrap{max-width:1500px}header{align-items:flex-start}header .tools{width:auto}.grid{grid-template-columns:1fr 390px}.ctrl{display:flex;gap:12px;align-items:stretch;margin-top:16px}.ql{display:flex;flex-direction:column;gap:4px;font-size:13px;color:var(--mut);justify-content:center}.go{flex:1 1 auto;padding:36px 20px;font-size:40px;border-radius:22px;letter-spacing:.02em}.ctrl2{display:flex;gap:10px;margin-top:12px}.ctrl2 .btn{flex:1;padding:14px;font-size:17px}.btn.stop{border-color:#d4380d;color:#d4380d}#r:not([data-skin=\"clinic\"]) .btn.stop{border-color:#ff8a70;color:#ff8a70}.lower{margin-top:18px;padding-top:14px;border-top:1px dashed var(--line)}.lrow{display:flex;flex-wrap:wrap;gap:12px 28px;align-items:center}.tabs{display:inline-flex;gap:6px}.tab{border:1px solid var(--line);background:transparent;border-radius:16px;padding:3px 10px;font-weight:700;font-size:13px;cursor:pointer;color:inherit}.tab.on{background:var(--acc);color:var(--accink);border-color:transparent}.sum{color:var(--mut);font-size:13px;margin:0 0 6px}.hr{align-items:center;gap:10px}.hr b{font-size:24px;min-width:58px}.hr .meta{flex:1;min-width:0}.bd{font-style:normal;font-size:12px;font-weight:700;border-radius:12px;padding:2px 9px;border:1px solid var(--line);color:var(--mut);white-space:nowrap}.hr.now .bd{background:var(--acc);color:var(--accink);border-color:transparent}.hr.skip .bd{color:#d4380d;border-color:#d4380d}\n.hr.now{background:rgba(127,127,127,.14);box-shadow:inset 4px 0 0 var(--acc);border-radius:10px}\n.hr.wait .bd{border-style:dashed}\n.hr.wait b{opacity:.55}\n.hr.done b{opacity:.8}\n.status.live{color:var(--acc);font-weight:700;font-size:15px}#r:not([data-skin=\"clinic\"]) .hr.skip .bd{color:#ff8a70;border-color:#ff8a70}.mini{border:1px solid var(--line);background:transparent;border-radius:10px;padding:4px 10px;font-weight:700;font-size:13px;cursor:pointer;color:inherit}.mini:hover{border-color:var(--acc)}.mini.pri{background:var(--acc);color:var(--accink);border-color:transparent}#dlgS{width:min(540px,94vw)}.srow{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--line)}.srow>span:first-child{color:var(--mut);font-size:14px}.srow select{max-width:62%}@media(max-width:860px){.grid{grid-template-columns:1fr}}@media(max-width:780px){#sbt{display:none}.go{font-size:28px;padding:24px 14px}}#r.show .ctrl,#r.show .ctrl2,#r.show .lower,#r.show #sbt,#r.show #setb,#r.show .tabs,#r.show .mini{display:none}\n.brand,.lh,.pinfo,.pfoot,.skipbox,.h2b{display:none}\n#r.show .brand{display:block}\n#r.show .hl,#r.show .connrow{display:none}\n#r.show .org{font-size:clamp(18px,2.3vw,30px);font-weight:800;letter-spacing:.02em;color:var(--ink);line-height:1.2}\n#r.show .dep{font-size:clamp(14px,1.6vw,20px);color:var(--mut);font-weight:600;margin-top:3px}\n#r.show .tools{opacity:0;transition:opacity .3s}\n#r.show .tools:hover,#r.show .tools:focus-within{opacity:1}\n#r.show .clock{font-size:clamp(28px,3.4vw,46px)}\n#r.show .hero .lab{font-size:clamp(15px,1.7vw,22px)}\n#r.show .pinfo{display:flex;gap:12px;flex-wrap:wrap;margin-top:12px}\n#r.show .pinfo:empty{display:none}\n.pc{flex:1 1 200px;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:10px 18px;display:flex;align-items:baseline;gap:10px}\n.pc span{color:var(--mut);font-size:16px;font-weight:600}\n.pc b{font-size:36px;font-variant-numeric:tabular-nums;color:var(--lnum);font-weight:800}\n#r.show .lower{display:block;margin-top:12px}\n#r.show .lrow,#r.show .chips{display:none}\n#r.show .lh{display:block;font-size:14px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--lab)}\n#r.show .lanes{margin-top:8px}\n#r.show .lane b{font-size:42px}\n#r.show .lane span{font-size:15px}\n#r.show .h2a,#r.show .sum{display:none}\n#r.show .h2b{display:inline}\n#r.show ol{overflow:hidden}\n#r.show .hr.done .bd{display:none}\n#r.show .hr b{font-size:30px}\n#r.show .hr .meta{font-size:15px}\n#r.show .skipbox.on{display:block;margin-top:12px;border:2px solid #d48806;background:rgba(212,136,6,.12);border-radius:14px;padding:10px 14px;color:var(--ink)}\n.skipbox .t{font-weight:700;font-size:15px}\n.skipbox .n{font-size:26px;font-weight:800;letter-spacing:.04em;margin:2px 0}\n.skipbox .m{font-size:14px;color:var(--mut)}\n#r.show .pfoot{display:block;margin-top:14px;text-align:center;color:var(--mut);font-size:clamp(14px,1.5vw,19px);line-height:1.5;border-top:1px solid var(--line);padding-top:10px}\n#r.show .grid{grid-template-columns:1fr 400px;align-items:start}\n@media(max-width:860px){#r.show .grid{grid-template-columns:1fr}}\n#r.show .tools{position:fixed;right:10px;bottom:10px;z-index:5;width:auto}\n#r.show header{justify-content:space-between}\n";
var HTML="<div class=\"wrap\">\n<header id=\"hdr\">\n<div><div class=\"brand\"><div class=\"org\" id=\"org\"></div><div class=\"dep\" id=\"dep\"></div></div><div class=\"hl\"><h1>Gọi số khám bệnh</h1><span class=\"sub\" id=\"date\"></span></div><div class=\"connrow\"><span class=\"pill\" id=\"conn\"></span><span class=\"actrow\"><span class=\"pill\" id=\"actst\" role=\"button\" tabindex=\"0\" style=\"cursor:pointer\"></span> <button type=\"button\" class=\"btn\" id=\"info\" aria-label=\"Chi tiết kích hoạt\" title=\"Chi tiết kích hoạt\" style=\"padding:2px 11px;border-radius:50%;font-weight:800;font-style:italic;min-width:0\">i</button></span></div></div>\n<div class=\"clock\" id=\"clock\" aria-hidden=\"true\"></div>\n<div class=\"tools\">\n<select id=\"size\" aria-label=\"Cỡ hiển thị\" title=\"Cỡ hiển thị (chọn nhanh theo màn hình)\"><option value=\"auto\">Cỡ: Tự động</option><option value=\"small\">Cỡ: Nhỏ</option><option value=\"mid\">Cỡ: Vừa</option><option value=\"big\">Cỡ: Lớn</option><option value=\"xl\">Cỡ: Rất lớn</option></select>\n<button type=\"button\" class=\"btn\" id=\"sbt\" aria-pressed=\"false\">☰ Hiện menu trái<kbd>M</kbd></button>\n<button type=\"button\" class=\"btn\" id=\"show\">Màn hình chờ<kbd>W</kbd></button>\n<button type=\"button\" class=\"btn\" id=\"setb\">⚙ Cài đặt<kbd>C</kbd></button>\n</div>\n</header>\n<div class=\"grid\">\n<main>\n<section class=\"hero\" aria-live=\"polite\">\n<div class=\"lab\">Mời bệnh nhân số</div>\n<div class=\"num\" id=\"num\">---</div>\n<div class=\"to\" id=\"to\">Chưa gọi số nào</div>\n</section>\n<div class=\"pinfo\" id=\"pinfo\"></div>\n<div class=\"ctrl\">\n<label class=\"ql\">Quầy <select id=\"q\"></select></label>\n<button class=\"go\" id=\"next\">Gọi số tiếp theo<kbd>Space</kbd></button>\n</div>\n<div class=\"ctrl2\">\n<button class=\"btn\" id=\"again\">↻ Gọi lại<kbd>R</kbd></button>\n<button class=\"btn\" id=\"skip\">⏭ Bỏ qua<kbd>B</kbd></button>\n<button class=\"btn stop\" id=\"stop\">⏹ Dừng đọc<kbd>S</kbd></button>\n</div>\n<div class=\"status\" id=\"status\">Phím tắt hiện trên từng nút (Space, R, B, S, G, M, W, C).</div>\n<div class=\"lower\">\n<div class=\"lh\">Các quầy đang phục vụ</div>\n<div class=\"lrow\">\n<span class=\"grp\">Gọi số cụ thể <kbd>G</kbd> <input class=\"n\" id=\"spec\" inputmode=\"numeric\" placeholder=\"Số\" aria-label=\"Gọi số cụ thể\"><button class=\"btn\" id=\"callSpec\">Gọi số này</button></span>\n<span class=\"x grp\">Đã phát tới số <input class=\"n\" id=\"iss\" inputmode=\"numeric\" aria-label=\"Số đã phát\"><button class=\"btn\" id=\"issb\">Lưu</button></span>\n</div>\n<div class=\"chips\"><span class=\"pill\" id=\"wait\"></span><button class=\"btn\" id=\"unlock\">Mở khóa tạm bằng PIN</button></div>\n<div class=\"lanes\" id=\"lanes\"></div>\n</div>\n</main>\n<aside class=\"side\">\n<h2><span class=\"h2a\">Lịch sử gọi</span><span class=\"h2b\">Các số vừa được gọi</span> <span class=\"tabs\"><button type=\"button\" class=\"tab on\" id=\"tAll\">Tất cả</button><button type=\"button\" class=\"tab\" id=\"tSkip\">Bỏ qua <b id=\"skn\">0</b></button></span></h2>\n<div class=\"sum\" id=\"hsum\"></div>\n<ol id=\"hist\"></ol>\n<div class=\"skipbox\" id=\"skipbox\"></div>\n</aside>\n</div>\n<footer class=\"pfoot\" id=\"pfoot\"><div>Xin quý khách chú ý số thứ tự và lắng nghe loa gọi số.</div><div>Nếu số của quý khách đã được gọi mà chưa thấy quý khách, vui lòng liên hệ nhân viên.</div></footer>\n</div>\n<dialog id=\"dlg\"><form method=\"dialog\" id=\"f\" style=\"margin:0\">\n<h2 id=\"pt\">Đặt lại danh sách</h2><p id=\"pp\">Nhập PIN để xóa toàn bộ số đã gọi hôm nay (mọi máy đang kết nối đều bị xóa).</p>\n<input id=\"pv\" type=\"password\" inputmode=\"numeric\" autocomplete=\"off\" placeholder=\"PIN\"><div class=\"err\" id=\"err\"></div>\n<div class=\"acts\"><button type=\"button\" class=\"btn\" id=\"cx\">Hủy</button><button class=\"btn okb\" id=\"ok\">Xác nhận</button></div>\n</form></dialog>\n<dialog id=\"dlg2\"><form method=\"dialog\" id=\"f2\" style=\"margin:0\">\n<h2>Trạng thái kích hoạt</h2><div id=\"ibody\"></div>\n<p style=\"font-size:20px;font-weight:800;letter-spacing:.05em;color:var(--ink);margin-bottom:6px\" id=\"midb\"></p><div style=\"margin:0 0 8px\"><button type=\"button\" class=\"btn\" id=\"cpm\">Chép mã máy</button></div>\n<div id=\"actform\"><p>Gửi <b>Mã máy</b> trên cho quản trị viên để nhận mã kích hoạt, rồi nhập vào đây.</p>\n<div style=\"display:flex;gap:6px\"><input id=\"ct\" type=\"password\" autocomplete=\"off\" placeholder=\"XXXX\" maxlength=\"4\" style=\"flex:1;min-width:0;text-transform:uppercase;letter-spacing:.3em;font-weight:800;text-align:center\"><button type=\"button\" class=\"btn\" id=\"ptc\">Dán</button></div><div class=\"err\" id=\"err2\"></div></div>\n<div class=\"acts\"><button type=\"button\" class=\"btn\" id=\"cx2\">Đóng</button><button class=\"btn okb\" id=\"okb2\">Kích hoạt</button></div>\n</form></dialog>\n<dialog id=\"dlg3\"><h2>Thống kê hôm nay</h2><div id=\"sbody\"></div>\n<div class=\"acts\"><button type=\"button\" class=\"btn\" id=\"csv\">Xuất CSV</button><button type=\"button\" class=\"btn okb\" id=\"cx3\">Đóng</button></div></dialog>\n<dialog id=\"dlg4\"><h2>Tắt chế độ nhiều máy?</h2><p>Máy này sẽ chuyển sang chạy đơn, không đồng bộ số với các máy khác. Bật lại sau này không cần nhập mã.</p><div class=\"acts\"><button type=\"button\" class=\"btn\" id=\"cx4\">Hủy</button><button type=\"button\" class=\"btn okb\" id=\"ok4\">Tắt</button></div></dialog>\n<dialog id=\"dlgS\"><h2>Cài đặt</h2><p>Giao diện và giọng đọc được lưu riêng cho từng máy, mỗi máy có thể chọn một giọng khác nhau.</p>\n<div class=\"srow\"><span>Giao diện</span><select id=\"skin\"><option value=\"clinic\">Phòng khám (sáng)</option><option value=\"navy\">Xanh đen</option><option value=\"black\">Đen</option><option value=\"neon\">Neon đêm</option></select></div>\n<div class=\"srow\"><span>Âm thanh</span><span class=\"grp\"><button type=\"button\" class=\"btn\" id=\"voice\">Giọng đọc: Bật</button><button type=\"button\" class=\"btn\" id=\"chime\">Chuông: Bật</button></span></div>\n<div class=\"srow\"><span>Giọng</span><select id=\"vsel\" aria-label=\"Chọn giọng\"></select></div>\n<div class=\"srow\"><span>Tốc độ</span><span class=\"grp\"><select id=\"vspd\"><option value=\"0.9\">Chậm</option><option value=\"1\" selected>Vừa</option><option value=\"1.1\">Nhanh</option></select><button type=\"button\" class=\"btn\" id=\"vtest\">Thử giọng</button></span></div>\n<div class=\"srow\"><span>Nhiều máy</span><button type=\"button\" class=\"btn\" id=\"net\">Nhiều máy: Tắt</button></div>\n<div class=\"err\" id=\"nerr\"></div>\n<div class=\"srow\"><span>Thống kê hôm nay</span><button type=\"button\" class=\"btn\" id=\"stat\">Thống kê</button></div>\n<div class=\"srow\"><span>Xóa danh sách hôm nay</span><button type=\"button\" class=\"btn\" id=\"reset\">Đặt lại</button></div>\n<div class=\"acts\"><button type=\"button\" class=\"btn okb\" id=\"cxS\">Đóng</button></div></dialog>";
function init(shadow,r,page){
function on(){return page.classList.contains("active")}

var KP="goiso_pin",KC="goiso_cfg",KL="goiso_local",QN=5,$=function(i){return shadow.getElementById(i)};
function p2(n){return(n<10?"0":"")+n}
function vn(){var d=new Date(Date.now()+25200000);return{date:p2(d.getUTCDate())+"/"+p2(d.getUTCMonth()+1)+"/"+d.getUTCFullYear(),t:p2(d.getUTCHours())+":"+p2(d.getUTCMinutes())+":"+p2(d.getUTCSeconds())}}
function fresh(d){return{date:d,last:0,cur:null,lanes:{},hist:[],skipped:[],issued:0,seq:0,ver:0}}
function fr(S,d){var f=fresh(d);f.ver=S.ver;f.seq=S.seq;f.aid=S.aid||0;return f}
function aq(S,n,q){S.ann=S.ann||[];S.ann.push({id:S.aid=(S.aid|0)+1,n:n,q:q});if(S.ann.length>40)S.ann.shift()}
function R(S,a,v){if(S.date!==v.date)S=fr(S,v.date);var n;
if(a.type==="next"||a.type==="call"){n=a.type==="next"?S.last+1:(a.n|0);if(n<1||n>9999)return S;var q=a.q|0;if(q<1||q>5)q=1;var e={n:n,q:q,t:v.t};S.cur=e;S.lanes[q]=e;S.hist.push(e);if(S.hist.length>1000)S.hist.shift();if(n>S.last)S.last=n;S.skipped=S.skipped.filter(function(x){return x!==n});aq(S,n,q);e.id=S.aid;S.seq++}
else if(a.type==="recall"){if(S.cur){aq(S,S.cur.n,S.cur.q);S.cur.id=S.aid;for(var z=S.hist.length-1;z>=0;z--)if(S.hist[z].n===S.cur.n){S.hist[z].id=S.aid;break}S.seq++}}
else if(a.type==="skip"){if(S.cur&&S.skipped.indexOf(S.cur.n)<0)S.skipped.push(S.cur.n)}
else if(a.type==="issued"){S.issued=Math.max(0,Math.min(9999,a.n|0))}
else if(a.type==="reset"){S=fr(S,v.date)}
S.ver++;return S}

function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){}return null}
var cfg={};try{cfg=JSON.parse(ls(KC))||{}}catch(e){}
var closed=false,ovr=false,pm="reset",S=null,voiceOn=ls("goiso_von")!=="0",chimeOn=ls("goiso_con")!=="0",lastSeq=0,first=true,histF="all";
try{S=JSON.parse(ls(KL))}catch(e){}
if(!S||S.date!==vn().date||cfg.url)S=fresh(vn().date);
var pad=function(n){return String(n).padStart(3,"0")};
var q=$("q");for(var i=1;i<=QN;i++){var o=document.createElement("option");o.value=i;o.textContent="Quầy số "+i;q.appendChild(o)}
var sq=ls("goiso_q");if(sq)q.value=sq;q.onchange=function(){ls("goiso_q",q.value)};
function setSkin(s){r.setAttribute("data-skin",s);$("skin").value=s;ls("goiso_skin",s)}
setSkin(ls("goiso_skin")||"clinic");$("skin").onchange=function(){setSkin(this.value)};
function render(pulse){
$("date").textContent="Ngày làm việc "+S.date;
var show=r.classList.contains("show"),C=show?heroEntry():S.cur;$("org").textContent=ORG;$("dep").textContent=DEPT+" · "+wday(S.date);
var n=$("num");
r.querySelector(".hero .lab").textContent=closed?"Ngoài giờ gọi số":"Mời bệnh nhân số";
if(closed){n.textContent="NGHỈ";$("to").textContent=reopen();pulse=false}else if(C){n.textContent=pad(C.n);$("to").textContent="Đến quầy số "+C.q}else{n.textContent="---";$("to").textContent="Chưa gọi số nào"}
if(show){var hk2=C?(C.id||C.n)+"@"+(C.at||C.t):"";pulse=!closed&&heroKey!==null&&!!C&&hk2!==heroKey;heroKey=hk2}else heroKey=null;
if(pulse){n.classList.remove("pulse");void n.offsetWidth;n.classList.add("pulse");var hh=r.querySelector(".hero");hh.classList.remove("flash");void hh.offsetWidth;hh.classList.add("flash")}
var LN=S.lanes;if(show){LN={};for(var k0=S.hist.length-1;k0>=0;k0--){var h0=S.hist[k0];if(!LN[h0.q]&&stOf(h0)!=="wait")LN[h0.q]=h0}}
var L=$("lanes");L.innerHTML="";
for(var i=1;i<=QN;i++){var l=LN[i],d=document.createElement("div");d.className="lane"+(C&&C.q==i?" on":"");
d.innerHTML="<span>Quầy "+i+"</span><b>"+(l?pad(l.n):"---")+"</b><span>"+(l?l.t.slice(0,5):"Chưa gọi")+"</span>";L.appendChild(d)}
var H=$("hist");H.innerHTML="";
var seen={},rows=[],cnt={},sk={};
for(var k=S.hist.length-1;k>=0;k--){var h=S.hist[k];cnt[h.n]=(cnt[h.n]||0)+1;if(!seen[h.n]){seen[h.n]=1;rows.push(h)}}
S.skipped.forEach(function(n){sk[n]=1});
$("skn").textContent=S.skipped.length;
$("hsum").textContent=rows.length?"Đã gọi "+rows.length+" số · Bỏ qua "+S.skipped.length:"";
var list=rows.filter(function(h){if(show)return !sk[h.n]&&stOf(h)!=="wait";return histF!=="skip"||sk[h.n]}).slice(0,show?8:100);
if(!list.length)H.innerHTML='<li class="empty">'+(histF==="skip"?"Không có số nào đang bị bỏ qua.":"Chưa có lượt gọi nào hôm nay.")+'</li>';
list.forEach(function(h){var sx=sk[h.n]?"skip":stOf(h),li=document.createElement("li");li.className="hr "+sx;
li.innerHTML="<b>"+pad(h.n)+"</b><span class=\"meta\">Quầy "+h.q+" · "+h.t.slice(0,5)+(!show&&cnt[h.n]>1?" · gọi "+cnt[h.n]+" lần":"")+"</span><em class=\"bd\">"+(sx==="skip"?"Bỏ qua":sx==="now"?"Đang gọi":sx==="wait"?"Chờ gọi":"Đã gọi")+"</em>";
if(sx==="done"||sx==="skip"){var bt=document.createElement("button");bt.type="button";bt.className="mini"+(sx==="skip"?" pri":"");bt.textContent="Gọi lại";bt.disabled=closed;bt.onclick=function(){act({type:"call",n:h.n,q:+q.value})};li.appendChild(bt)}
H.appendChild(li)});
var la=0;S.hist.forEach(function(h){if(h.n>la&&stOf(h)!=="wait")la=h.n});
var pw=(S.issued|0)>la?(S.issued|0)-la:0,pi=$("pinfo");
pi.innerHTML=show&&pw?'<div class="pc"><span>Số tiếp theo</span><b>'+pad(la+1)+'</b></div><div class="pc"><span>Đang chờ khám</span><b>'+pw+'</b><span>bệnh nhân</span></div>':"";
var sb=$("skipbox");
if(show&&S.skipped.length){sb.className="skipbox on";sb.innerHTML='<div class="t">Số chưa có mặt khi được gọi</div><div class="n">'+S.skipped.slice(-8).map(pad).join(" · ")+'</div><div class="m">Vui lòng liên hệ nhân viên để được hỗ trợ.</div>'}else{sb.className="skipbox";sb.innerHTML=""}
var w=Math.max(0,S.issued-S.last);$("wait").textContent=S.issued?"Đang chờ: "+w+" người":"Đang chờ: chưa nhập số đã phát";
lastSeq=S.seq}
function conn(ok){var c=$("conn");c.textContent=!cfg.url?"Máy đơn":ok?"Đã kết nối nhiều máy":"Mất kết nối, đang thử lại";c.className="pill "+(!cfg.url?"":ok?"ok":"bad")}
function api(){return cfg.url.replace(/\/+$/,"")+"/?room="+encodeURIComponent(cfg.room||"main")}
function devId(){var d=ls("goiso_dev3");if(!d||d.length!==4){var al="ABCDEFGHJKMNPQRSTUVWXYZ23456789",a=new Uint8Array(4);(window.crypto||{getRandomValues:function(x){for(var i=0;i<x.length;i++)x[i]=Math.random()*256}}).getRandomValues(a);d="";for(var i=0;i<4;i++)d+=al[a[i]%al.length];ls("goiso_dev3",d)}return d}
function hd(){var h={"content-type":"application/json","x-dev":devId()};if(cfg.token)h["x-token"]=cfg.token;return h}
function done(a){var c=a.type==="next"||a.type==="call"||a.type==="recall";render(c&&a.type!=="recall");
if(c&&S.cur){hearAll(S,true);$("status").textContent="Đã gửi lệnh gọi số "+pad(S.cur.n)+" tại quầy "+S.cur.q+"."}
else if(a.type==="skip")$("status").textContent="Đã bỏ qua số hiện tại. Bấm Gọi số tiếp theo."}
function act(a){
if(closed&&a.type!=="reset")return;
if(cfg.url&&(a.type==="next"||a.type==="call"||a.type==="recall"))a.d=lastBase?Math.round(lastBase*1000/(+$("vspd").value||1))+300:Math.round(6500/(+$("vspd").value||1));
if(!cfg.url){S=R(S,a,vn());ls(KL,JSON.stringify(S));done(a);return}
fetch(api(),{method:"POST",headers:hd(),body:JSON.stringify(a)}).then(function(r){if(r.status===401){$("status").textContent="Mã máy không hợp lệ hoặc đã bị khóa.";setSt("bad");throw 401}if(!r.ok)throw 0;return r.json()}).then(function(s){setOff(s);S=s;conn(true);done(a)}).catch(function(e){if(e===401)return;conn(false);$("status").textContent="Chưa gửi được lên máy chủ, thử lại."})}
function poll(){if(!cfg.url||!on())return;
fetch(api(),{headers:hd()}).then(function(r){if(r.status===401){var c=$("conn");c.textContent="Mã máy không hợp lệ hoặc đã bị khóa";c.className="pill bad";setSt("bad");throw 401}if(!r.ok)throw 0;return r.json()}).then(function(s){conn(true);if(st!=="ok")setSt("ok");setOff(s);
if(first){first=false;S=s;floor=maxId(s);render(false);return}
if(s.ver!==S.ver||s.date!==S.date){var ch=s.seq!==lastSeq;S=s;render(ch);hearAll(s,false)}}).catch(function(e){if(e!==401)conn(false)})}
setInterval(poll,2000);
window.addEventListener("storage",function(e){if(e.key===KL&&!cfg.url){try{S=JSON.parse(e.newValue);render(true)}catch(x){}}});
var VO={},ctx=null,bufs={},srcs=[];
function ac(){if(!ctx){var C=window.AudioContext||window.webkitAudioContext;ctx=new C()}if(ctx.state==="suspended")ctx.resume();return ctx}
function b2ab(b){var s=atob(b),a=new Uint8Array(s.length);for(var i=0;i<s.length;i++)a[i]=s.charCodeAt(i);return a.buffer}
function loadClips(id){if(bufs[id])return bufs[id];var c=ac(),ks=Object.keys(VO[id].c);bufs[id]=Promise.all(ks.map(function(k){return new Promise(function(r,j){c.decodeAudioData(b2ab(VO[id].c[k]),r,j)})})).then(function(a){var o={};ks.forEach(function(k,i){o[k]=a[i]});return o});return bufs[id]}
function fillVoices(){var s=$("vsel"),cur=ls("goiso_voice2")||"";s.innerHTML="";Object.keys(VO).forEach(function(k){var o=document.createElement("option");o.value=k;o.textContent=VO[k].l;s.appendChild(o)});var o=document.createElement("option");o.value="machine";o.textContent="Giọng máy (mặc định)";s.appendChild(o);if(!Object.keys(VO).length){var l=document.createElement("option");l.disabled=true;l.textContent="Giọng ghi sẵn: kích hoạt máy (chữ i góc trên) để mở";s.appendChild(l)}s.value=(cur&&(cur==="machine"||VO[cur]))?cur:(Object.keys(VO)[0]||"machine")}
fillVoices();var ss=ls("goiso_spd");if(ss)$("vspd").value=ss;
$("vsel").onchange=function(){ls("goiso_voice2",this.value);say(123,1)};
$("vspd").onchange=function(){ls("goiso_spd",this.value);say(123,1)};
$("vtest").onclick=function(){say(123,1)};
function hex2u8(x){var a=new Uint8Array(x.length/2);for(var i=0;i<a.length;i++)a[i]=parseInt(x.substr(i*2,2),16);return a}
function loadVoiceFile(){return new Promise(function(res,rej){if(window.GOISO_VOENC)return res(window.GOISO_VOENC);var s=document.createElement("script");s.src=BASE+"clinic-queue-voice.js";s.onload=function(){window.GOISO_VOENC?res(window.GOISO_VOENC):rej()};s.onerror=rej;document.head.appendChild(s)})}
function unlockVoices(k){if(!(window.crypto&&crypto.subtle))return Promise.reject();
return loadVoiceFile().then(function(VE){return crypto.subtle.importKey("raw",hex2u8(k),"AES-GCM",false,["decrypt"]).then(function(key){return Promise.all(Object.keys(VE).map(function(id){var e=VE[id];return crypto.subtle.decrypt({name:"AES-GCM",iv:new Uint8Array(b2ab(e.iv))},key,b2ab(e.d)).then(function(buf){VO[id]={l:e.l,c:JSON.parse(new TextDecoder().decode(buf))}})}))})}).then(function(){bufs={};fillVoices()})}
function tok(){var t=ls("goiso_tok");if(!t&&cfg&&cfg.token){t=cfg.token;ls("goiso_tok",t)}return t||""}
var st=tok()?"ok":"none";
var vk=ls("goiso_vk"),vkP=Promise.resolve();if(vk&&tok())vkP=unlockVoices(vk).catch(function(e){window.__err=String(e)});
function chime(c,t){[[988,0],[740,.42]].forEach(function(x){var o=c.createOscillator(),g=c.createGain(),s=t+x[1];o.type="sine";o.frequency.value=x[0];o.connect(g);g.connect(c.destination);g.gain.setValueAtTime(0,s);g.gain.linearRampToValueAtTime(.35,s+.03);g.gain.exponentialRampToValueAtTime(.001,s+.8);o.start(s);o.stop(s+.85)})}
var mT=0,qT=0,endT=0,vq=[],playing=false,seen={},floor=0,gen=0,off=0,lastBase=0,playingId=0,lastSig="",wasLive=false,heroKey=null;
function annOf(s){if(s&&s.ann&&s.ann.length)return s.ann;return s&&s.cur?[{id:s.seq,n:s.cur.n,q:s.cur.q,at:s.cur.at}]:[]}
function maxId(s){var m=0;annOf(s).forEach(function(a){if(a.id>m)m=a.id});return m}
function hearAll(s,own){var A=annOf(s),sh=r.classList.contains("show"),now=s.now||0,base=Date.now();
A.forEach(function(a,i){if(a.id<=floor||seen[a.id])return;seen[a.id]=1;
if(sh||(own&&i===A.length-1)){var d=a.at&&now?Math.max(0,Math.min(300000,a.at-now)):0;vq.push({id:a.id,n:a.n,q:a.q,t:base+d})}});
pump()}
function after(g){return function(){if(g!==gen)return;playing=false;playingId=0;pump()}}
function pump(){if(playing||!vq.length)return;clearTimeout(qT);var it=vq[0],w=it.t-Date.now();
if(w>50){qT=setTimeout(pump,w);return}
vq.shift();playing=true;playingId=it.id||0;var g=gen,f=after(g);speak(it.n,it.q).then(f,f)}
function halt(){gen++;clearTimeout(qT);clearTimeout(endT);clearTimeout(mT);vq=[];playing=false;playingId=0;srcs.forEach(function(x){try{x.stop()}catch(e){}});srcs=[];if(window.speechSynthesis)speechSynthesis.cancel()}
function speakMachine(n,qq){return new Promise(function(res){
if(!window.speechSynthesis)return res();
var dg=pad(n).split("").map(function(c){return c==="0"?"không":["","một","hai","ba","bốn","năm","sáu","bảy","tám","chín"][+c]}).join(" ");
var u=new SpeechSynthesisUtterance("Mời bệnh nhân số "+dg+", đến quầy số "+qq);
var vs=speechSynthesis.getVoices().filter(function(v){return v.lang.toLowerCase().indexOf("vi")===0});
u.lang="vi-VN";if(vs[0])u.voice=vs[0];
var fin=false,ft=0,end=function(){if(fin)return;fin=true;clearTimeout(ft);res()};
u.onend=end;u.onerror=end;ft=setTimeout(end,20000);
if(chimeOn){chime(ac(),ac().currentTime+.05);mT=setTimeout(function(){speechSynthesis.speak(u)},1000)}else speechSynthesis.speak(u)})}
function speak(n,qq){if(!voiceOn)return Promise.resolve();var id=$("vsel").value;
if(id==="machine"||!VO[id])return speakMachine(n,qq);
return loadClips(id).then(function(B){
var c=ctx,sp=+$("vspd").value||1,t=c.currentTime+.08,t00=t,d=pad(n).split(""),qs=[["moi",.14]];
if(chimeOn){chime(c,t);t+=1}
d.forEach(function(x,i){qs.push([x,i===d.length-1?.16:.05])});qs.push(["den",.07]);qs.push([String(qq),0]);
qs.forEach(function(e){var s=c.createBufferSource();s.buffer=B[e[0]];s.playbackRate.value=sp;s.connect(c.destination);s.start(t);srcs.push(s);s.onended=function(){var k=srcs.indexOf(s);if(k>=0)srcs.splice(k,1)};t+=(B[e[0]].duration+e[1])/sp});
lastBase=(t-t00)*sp;return new Promise(function(res){endT=setTimeout(res,Math.max(0,(t-c.currentTime)*1000)+150)})
}).catch(function(){$("status").textContent="Không phát được âm thanh, thử bấm vào trang rồi gọi lại."})}
function say(n,qq){halt();playing=true;var f=after(gen);speak(n,qq).then(f,f)}
function wday(d){var a=d.split("/"),n=new Date(Date.UTC(+a[2],+a[1]-1,+a[0])).getUTCDay();return["Chủ nhật","Thứ hai","Thứ ba","Thứ tư","Thứ năm","Thứ sáu","Thứ bảy"][n]+", "+d}
function heroEntry(){var lo=Math.max(0,S.hist.length-40),d=null;for(var k=S.hist.length-1;k>=lo;k--){var x=stOf(S.hist[k]);if(x==="now")return S.hist[k];if(x==="done"&&!d)d=S.hist[k]}return d}
function setOff(s){if(s&&s.now)off=s.now-Date.now()}
function stOf(h){var t=Date.now()+off;
if(h.at){var d=h.d||6500;return t<h.at?"wait":t<h.at+d?"now":"done"}
if(h.id){if(h.id===playingId)return"now";for(var i=0;i<vq.length;i++)if(vq[i].id===h.id)return"wait"}
return"done"}
function sigNow(){var g="",n=0;for(var k=S.hist.length-1;k>=0&&n<100;k--,n++)g+=stOf(S.hist[k]).charAt(0);return g}
function liveStatus(){var el=$("status"),nowE=null,w=0,lo=Math.max(0,S.hist.length-40);
for(var k=S.hist.length-1;k>=lo;k--){var x=stOf(S.hist[k]);if(x==="wait")w++;else if(x==="now"&&!nowE)nowE=S.hist[k]}
if(nowE||w){el.classList.add("live");el.textContent=(nowE?"▶ Đang gọi số "+pad(nowE.n)+" · quầy "+nowE.q:"⏳ Sắp gọi")+(w?" · Còn "+w+" số đang chờ gọi":"");wasLive=true}
else if(wasLive){wasLive=false;el.classList.remove("live");el.textContent="✔ Đã gọi xong tất cả các số."}}
$("next").onclick=function(){act({type:"next",q:+q.value})};
$("again").onclick=function(){if(!S.cur){$("status").textContent="Chưa có số nào để gọi lại.";return}act({type:"recall"})};
$("skip").onclick=function(){if(!S.cur){$("status").textContent="Chưa có số nào để bỏ qua.";return}act({type:"skip"})};
$("callSpec").onclick=function(){var v=parseInt($("spec").value,10);if(!v||v<1){$("status").textContent="Nhập số thứ tự lớn hơn 0.";return}$("spec").value="";act({type:"call",n:v,q:+q.value})};
$("spec").onkeydown=function(e){if(e.key==="Enter")$("callSpec").click()};
$("issb").onclick=function(){var v=parseInt($("iss").value,10);if(isNaN(v)||v<0)return;$("iss").value="";act({type:"issued",n:v})};
$("iss").onkeydown=function(e){if(e.key==="Enter")$("issb").click()};
document.addEventListener("keydown",function(e){
var tg=e.composedPath?e.composedPath()[0]:e.target;if(!on()||!tg||tg.tagName==="INPUT"||tg.tagName==="SELECT"||tg.tagName==="TEXTAREA"||shadow.querySelector("dialog[open]")||e.ctrlKey||e.metaKey||e.altKey)return;
var k=e.key,sh=r.classList.contains("show");
if(e.code==="Space"){e.preventDefault();$("next").click()}else if(k==="r"||k==="R"){$("again").click()}else if(k==="s"||k==="S"){$("stop").click()}
else if(k==="w"||k==="W"){$("show").click()}
else if(!sh&&(k==="b"||k==="B")){$("skip").click()}
else if(!sh&&(k==="g"||k==="G")){e.preventDefault();$("spec").focus()}
else if(!sh&&(k==="m"||k==="M")){$("sbt").click()}
else if(!sh&&(k==="c"||k==="C")){$("setb").click()}});
$("voice").onclick=function(){voiceOn=!voiceOn;ls("goiso_von",voiceOn?"1":"0");this.textContent="Giọng đọc: "+(voiceOn?"Bật":"Tắt");if(!voiceOn)halt()};
$("chime").onclick=function(){chimeOn=!chimeOn;ls("goiso_con",chimeOn?"1":"0");this.textContent="Chuông: "+(chimeOn?"Bật":"Tắt")};
$("show").onclick=function(){var on=r.classList.toggle("show");lbl(this,on?"Thoát màn hình chờ":"Màn hình chờ","W");render(false);fitD();if(on)ac();
try{if(on&&r.requestFullscreen)r.requestFullscreen();else if(!on&&document.fullscreenElement)document.exitFullscreen()}catch(e){}};
document.addEventListener("fullscreenchange",function(){if(!document.fullscreenElement&&r.classList.contains("show")){r.classList.remove("show");lbl($("show"),"Màn hình chờ","W");render(false);fitD()}});
$("reset").onclick=function(){$("dlgS").close();pm="reset";$("pt").textContent="Đặt lại danh sách";$("pp").textContent="Nhập PIN để xóa toàn bộ số đã gọi hôm nay (mọi máy đang kết nối đều bị xóa).";$("pv").value="";$("err").textContent="";$("dlg").showModal();$("pv").focus()};
$("cx").onclick=function(){$("dlg").close()};
$("f").onsubmit=function(e){e.preventDefault();if($("pv").value!==(ls(KP)||"1234")){$("err").textContent="PIN chưa đúng, thử lại.";return}$("dlg").close();if(pm==="unlock"){ovr=true;applyClosed();$("status").textContent="Đã mở khóa tạm, đến khi tải lại trang.";return}act({type:"reset"});$("status").textContent="Đã đặt lại danh sách."};
$("unlock").onclick=function(){pm="unlock";$("pt").textContent="Mở khóa ngoài giờ";$("pp").textContent="Nhập PIN để dùng tạm ngoài giờ gọi số (đến khi tải lại trang).";$("pv").value="";$("err").textContent="";$("dlg").showModal();$("pv").focus()};
var NETURL="https://clinic-queue.dhabolero.workers.dev/";
function netBtn(){$("net").textContent="Nhiều máy: "+(cfg.url?"Bật":"Tắt");$("net").style.opacity=(st==="ok"||cfg.url)?"":".5";$("net").title=st==="ok"||cfg.url?"":"Cần kích hoạt máy trước"}
function goLocal(){cfg={};ls(KC,"{}");first=true;try{S=JSON.parse(ls(KL))}catch(x){}if(!S||S.date!==vn().date)S=fresh(vn().date);floor=maxId(S);render(false);conn(true);netBtn()}
function setSt(x){st=x;var p=$("actst");p.textContent="Trạng thái: "+(x==="ok"?"Đã kích hoạt":x==="bad"?"Mã bị khóa/không hợp lệ":"Chưa kích hoạt");p.className="pill"+(x==="ok"?" ok":x==="bad"?" bad":"");netBtn();if($("dlg2").open)renderInfo()}
function renderInfo(){var ok=st==="ok",L="margin:4px 0 10px;padding-left:20px;color:var(--mut);font-size:14px";
$("ibody").innerHTML=ok?"<p><b>Đã kích hoạt.</b> Máy này được dùng:</p><ul style='"+L+"'><li>Giọng đọc ghi sẵn (chọn ở mục Giọng)</li><li>Chạy nhiều máy, đồng bộ số giữa các máy (bật trong Cài đặt)</li></ul>"
:"<p><b>"+(st==="bad"?"Mã kích hoạt đã bị khóa hoặc không còn hiệu lực.":"Máy chưa kích hoạt.")+"</b> Hiện đang giới hạn:</p><ul style='"+L+"'><li>Chỉ dùng giọng đọc mặc định của máy (trình duyệt/Google)</li><li>Chỉ chạy 1 máy đơn, không đồng bộ với máy khác</li></ul><p>Kích hoạt để dùng giọng ghi sẵn và chạy nhiều máy.</p>";
$("midb").textContent="Mã máy: "+devId();$("actform").style.display=ok?"none":"";$("okb2").style.display=ok?"none":""}
function openInfo(m){renderInfo();$("ct").value="";$("err2").textContent=m||"";$("dlg2").showModal();if(st!=="ok")$("ct").focus()}
$("info").onclick=function(){openInfo("")};
$("actst").onclick=function(){openInfo("")};
$("net").onclick=function(){if(cfg.url){$("dlg4").showModal();return}var t=tok();if(!t||st!=="ok"){var m="Cần kích hoạt máy trước: đóng Cài đặt rồi bấm chữ i ở góc trên bên trái.";$("nerr").textContent=m;$("status").textContent=m;return}$("nerr").textContent="";turnOn(t)};
$("cx4").onclick=function(){$("dlg4").close()};
$("ok4").onclick=function(){$("dlg4").close();goLocal()};
$("cx2").onclick=function(){$("dlg2").close()};
function cpText(t,b){var o=b.textContent;function ok(){b.textContent="Đã chép";setTimeout(function(){b.textContent=o},1200)}
function fb(){var x=document.createElement("textarea");x.value=t;document.body.appendChild(x);x.select();try{document.execCommand("copy");ok()}catch(e){}x.remove()}
if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(ok,fb);else fb()}
$("cpm").onclick=function(){cpText(devId(),this)};
$("ptc").onclick=function(){if(navigator.clipboard&&navigator.clipboard.readText)navigator.clipboard.readText().then(function(t){$("ct").value=t.trim();$("ct").focus()}).catch(function(){$("err2").textContent="Trình duyệt chặn dán tự động, hãy bấm vào ô và nhấn Ctrl+V."});else $("err2").textContent="Hãy bấm vào ô và nhấn Ctrl+V để dán."};
function turnOn(t){cfg={url:NETURL,room:"main",token:t};ls(KC,JSON.stringify(cfg));first=true;S=fresh(vn().date);render(false);netBtn();conn(true);poll()}
function activate(t,manual){
return fetch(NETURL+"?vkey=1",{headers:{"x-token":t,"x-dev":devId()}}).then(function(r){
if(r.status===401){if(manual)$("err2").textContent="Mã chưa đúng, đã bị khóa hoặc không dành cho máy này.";else{ls("goiso_vk","");setSt("bad")}return}
ls("goiso_tok",t);if(cfg.url&&cfg.token!==t){cfg.token=t;ls(KC,JSON.stringify(cfg))}
if(st!=="ok")setSt("ok");
if(!r.ok){if(manual)$("status").textContent="Đã kích hoạt, nhưng chưa mở được giọng ghi sẵn (thiếu biến VKEY trên Cloudflare).";return}
return r.json().then(function(j){return vkP.then(function(){if(j.k&&(j.k!==ls("goiso_vk")||!Object.keys(VO).length)){ls("goiso_vk",j.k);return unlockVoices(j.k)}})}).catch(function(){$("status").textContent="Không mở được giọng ghi sẵn."})
}).catch(function(){if(manual)$("err2").textContent="Không kết nối được máy chủ."})}
$("f2").onsubmit=function(e){e.preventDefault();if(st==="ok"){$("dlg2").close();return}var t=$("ct").value.trim().toUpperCase();if(t.length!==4){$("err2").textContent="Nhập đủ 4 ký tự.";return}activate(t,true)};
function sbCss(){if(document.getElementById("cq-nosb-css"))return;var e=document.createElement("style");e.id="cq-nosb-css";e.textContent="html.cq-nosb .sidebar,html.cq-nosb .sidebar-resize-handle{display:none!important}";document.head.appendChild(e)}
var sbOn=false;
function sbApply(on){sbOn=on;document.documentElement.classList.toggle("cq-nosb",!on);lbl($("sbt"),on?"☰ Ẩn menu trái":"☰ Hiện menu trái","M");fitD();$("sbt").setAttribute("aria-pressed",on?"true":"false")}
sbCss();sbApply(false);
$("sbt").onclick=function(){sbApply(!sbOn)};
$("setb").onclick=function(){$("nerr").textContent="";$("dlgS").showModal()};
$("cxS").onclick=function(){$("dlgS").close()};
function stopSay(){halt();$("status").textContent="Đã dừng đọc."}
$("stop").onclick=stopSay;
function setTab(f){histF=f;$("tAll").classList.toggle("on",f==="all");$("tSkip").classList.toggle("on",f==="skip");render(false)}
$("tAll").onclick=function(){setTab("all")};
$("tSkip").onclick=function(){setTab("skip")};
$("voice").textContent="Giọng đọc: "+(voiceOn?"Bật":"Tắt");$("chime").textContent="Chuông: "+(chimeOn?"Bật":"Tắt");
function lbl(el,t,k){el.textContent=t;if(k){var e=document.createElement("kbd");e.textContent=k;el.appendChild(e)}}
var SZ={small:.85,mid:1,big:1.25,xl:1.5},sizeMode=ls("goiso_size")||"auto",fT=0;
if(!(sizeMode==="auto"||SZ[sizeMode]))sizeMode="auto";
$("size").value=sizeMode;
function fit(){var w=r.querySelector(".wrap");if(!w||!on())return;
w.style.zoom="1";var sh=r.classList.contains("show"),z=1,hd=$("hdr").getBoundingClientRect().height;
var sc=document.scrollingElement?document.scrollingElement.scrollTop:0,wr=w.getBoundingClientRect(),top0=Math.max(0,wr.top+sc);
if(!wr.width){return}
if(sizeMode==="auto"){var ref=sh?$("pfoot"):$("status"),H=ref.getBoundingClientRect().bottom-wr.top;
if(H>50){z=(window.innerHeight-top0-10)/H}
z=Math.min(z,r.getBoundingClientRect().width/940);z=Math.max(.7,Math.min(sh?2.8:2,z))}
else z=SZ[sizeMode];
z=Math.round(z*100)/100;w.style.zoom=String(z);
$("hist").parentNode.style.maxHeight=Math.max(260,(window.innerHeight-top0-10)/z-hd-40)+"px"}
function fitD(){cancelAnimationFrame(fT);fT=requestAnimationFrame(fit)}
$("size").onchange=function(){sizeMode=this.value;ls("goiso_size",sizeMode);fit()};
window.addEventListener("resize",fitD);
function stats(){
var H=S.hist,byQ={},byH={},u={};
H.forEach(function(h){byQ[h.q]=(byQ[h.q]||0)+1;var k=h.t.slice(0,2);byH[k]=(byH[k]||0)+1;u[h.n]=1});
var hk=[];for(var i=6;i<=18;i++)hk.push(p2(i));Object.keys(byH).forEach(function(k){if(hk.indexOf(k)<0)hk.push(k)});hk.sort();
function bars(o,ks,f){var m=1;ks.forEach(function(k){m=Math.max(m,o[k]||0)});return ks.map(function(k){var v=o[k]||0;return '<div class="br"><span>'+f(k)+'</span><em><i style="width:'+Math.round(v/m*100)+'%"></i></em><b>'+v+'</b></div>'}).join("")}
var peak="",pm=0;Object.keys(byH).forEach(function(k){if(byH[k]>pm){pm=byH[k];peak=k}});
function sec(t){var a=t.split(":");return a[0]*3600+a[1]*60+(+a[2])}
var avg="";if(H.length>1){var m=(sec(H[H.length-1].t)-sec(H[0].t))/60/(H.length-1);if(m>=0)avg=m.toFixed(1)+" phút"}
$("sbody").innerHTML='<div class="kv"><div><b>'+H.length+'</b>lượt gọi</div><div><b>'+Object.keys(u).length+'</b>số khác nhau</div><div><b>'+S.skipped.length+'</b>đang bỏ qua</div>'+(S.issued?'<div><b>'+Math.max(0,S.issued-S.last)+'</b>đang chờ</div>':'')+'</div>'+
(peak?'<p>Giờ đông nhất: '+peak+'h ('+pm+' lượt). '+(avg?'Trung bình '+avg+' giữa hai lượt gọi.':'')+'</p>':'<p>Chưa có lượt gọi nào hôm nay.</p>')+
'<h2 style="font-size:15px">Theo quầy</h2>'+bars(byQ,["1","2","3","4","5"],function(k){return "Quầy "+k})+
'<h2 style="font-size:15px;margin-top:10px">Theo giờ</h2>'+bars(byH,hk,function(k){return k+"h"})}
$("stat").onclick=function(){$("dlgS").close();stats();$("dlg3").showModal()};
$("cx3").onclick=function(){$("dlg3").close()};
$("csv").onclick=function(){var r=["STT,Số,Quầy,Giờ"];S.hist.forEach(function(h,i){r.push((i+1)+","+pad(h.n)+","+h.q+","+h.t)});
var a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+r.join("\n")],{type:"text/csv"}));a.download="clinic-queue-"+S.date.replace(/\//g,"-")+".csv";document.body.appendChild(a);a.click();a.remove()};
function mins(){var a=vn().t.split(":");return a[0]*60+ +a[1]}
function dow(){return new Date(Date.now()+25200000).getUTCDay()}
function isOpen(){var m=mins(),w=dow();return w>0&&w<6&&((m>=420&&m<690)||(m>=780&&m<990))}
function reopen(){var m=mins(),w=dow();if(w===0||w===6)return"Nghỉ cuối tuần · hẹn gặp lại thứ Hai 07:00";if(w===5&&m>=990)return"Hẹn gặp lại thứ Hai 07:00";return m<420?"Mở lại lúc 07:00":(m>=690&&m<780)?"Mở lại lúc 13:00":"Hẹn gặp lại 07:00 ngày mai"}
function applyClosed(){var c=!isOpen()&&!ovr;if(c===closed)return;closed=c;r.classList.toggle("closed",c);
["next","again","skip","callSpec","issb","spec","iss"].forEach(function(id){$(id).disabled=c});render(false);
$("status").textContent=c?"Ngoài giờ gọi số (thứ Hai đến thứ Sáu: 07:00 đến 11:30 và 13:00 đến 16:30).":"Phím tắt: Space gọi số tiếp theo, R gọi lại, S dừng đọc."}
function tick(){if(!on())return;$("clock").textContent=vn().t;applyClosed()}tick();setInterval(tick,1000);setInterval(function(){if(!on())return;var g=sigNow();if(g!==lastSig){lastSig=g;render(false)}liveStatus()},400);
if(!cfg.url)floor=maxId(S);conn(true);render(false);setSt(st);fitD();if(cfg.url)poll();if(tok())activate(tok(),false);

return{resume:function(g){if(g)sbApply(false);tick();poll();fitD()}};
}
var inst=null,gone=false;
function start(){
var page=document.getElementById("page-clinicqueue");if(!page)return;
var host=document.getElementById("clinic-queue-host");
if(!host){host=document.createElement("div");host.id="clinic-queue-host";page.appendChild(host)}
function chk(){if(!page.classList.contains("active")){gone=true;document.documentElement.classList.remove("cq-nosb");return}
if(inst){inst.resume(gone);gone=false;return}
var sh=host.attachShadow({mode:"open"});
sh.innerHTML='<style>:host{all:initial;display:block}'+CSS+'</style><div id="r" data-skin="clinic">'+HTML+'</div>';
inst=init(sh,sh.getElementById("r"),page)}
new MutationObserver(chk).observe(page,{attributes:true,attributeFilter:["class"]});chk()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
