/* Gọi số khám bệnh - BVĐK Bình Dương CS2. Tự chạy khi mở trang /clinic-queue (Shadow DOM, không ảnh hưởng CSS của web).
   Giọng ghi sẵn nằm trong clinic-queue-voice.js (đã mã hóa), chỉ tải khi máy đã kích hoạt. */
(function(){
var BASE=((document.currentScript&&document.currentScript.src)||"").replace(/[^\/]*$/,"");
var CSS="\n#r{--bg:#e8f1f4;--bgimg:none;--ink:#10303a;--mut:#5a7781;--card:#fff;--line:#c6d9df;--acc:#0b7a75;--accink:#fff;--hero:#fff;--herob:#0b7a75;--heros:0 8px 26px rgba(11,122,117,.18);--brk:transparent;--num:#0a4d68;--nums:none;--to:#0b7a75;--tos:none;--lab:#4c6a74;--go:#0b7a75;--gos:0 4px 14px rgba(11,122,117,.35);--laneon:#0b7a75;--lanes:0 0 0 3px rgba(11,122,117,.18);--flash:rgba(11,122,117,.45);--lnum:#0b7a75;--dlg:#fff;--inp:#fff;\n}\n#r[data-skin=\"neon\"]{--bg:#070a1a;--bgimg:radial-gradient(900px 500px at 15% -10%,rgba(34,229,255,.16),transparent 60%),radial-gradient(800px 500px at 100% 10%,rgba(255,62,165,.14),transparent 60%);--ink:#e8ecff;--mut:#8e98c9;--card:rgba(255,255,255,.05);--line:rgba(130,150,255,.28);--acc:#22e5ff;--accink:#050818;--hero:linear-gradient(160deg,#101646,#090c26 70%);--herob:#22e5ff;--heros:0 0 0 4px rgba(34,229,255,.08),0 0 28px rgba(34,229,255,.5),inset 0 0 50px rgba(34,229,255,.14);--brk:#ff3ea5;--num:#fff;--nums:0 0 10px #22e5ff,0 0 30px #22e5ff,0 0 70px rgba(34,229,255,.7);--to:#ff3ea5;--tos:0 0 10px #ff3ea5,0 0 28px rgba(255,62,165,.6);--lab:#b9c4ff;--go:linear-gradient(90deg,#16d9ff,#8a5bff);--gos:0 0 22px rgba(34,229,255,.5);--laneon:#ff3ea5;--lanes:0 0 18px rgba(255,62,165,.55);--flash:rgba(255,62,165,.6);--lnum:#22e5ff;--dlg:#0b1030;--inp:rgba(255,255,255,.07);color-scheme:dark}\n#r[data-skin=\"black\"]{--bg:#000;--ink:#f2f2f2;--mut:#a0a0a0;--card:#121212;--line:#2e2e2e;--acc:#ffd54a;--accink:#000;--hero:#0a0a0a;--herob:#ffd54a;--heros:none;--num:#fff;--to:#ffd54a;--lab:#c4c4c4;--go:#ffd54a;--gos:none;--laneon:#ffd54a;--lanes:0 0 0 2px rgba(255,213,74,.25);--flash:rgba(255,213,74,.5);--lnum:#ffd54a;--dlg:#141414;--inp:#1a1a1a;color-scheme:dark}\n#r[data-skin=\"navy\"]{--bg:#0b1f33;--ink:#e6f1ff;--mut:#8fa9c4;--card:#112b45;--line:#24476b;--acc:#4fc3f7;--accink:#04202f;--hero:#0e263f;--herob:#4fc3f7;--heros:0 8px 26px rgba(0,0,0,.35);--num:#e6f6ff;--to:#7fe0c0;--lab:#9bb7d1;--go:#4fc3f7;--gos:none;--laneon:#4fc3f7;--lanes:0 0 0 3px rgba(79,195,247,.2);--flash:rgba(79,195,247,.45);--lnum:#4fc3f7;--dlg:#0e263f;--inp:#0b2238;color-scheme:dark}\n#r:not([data-skin=\"clinic\"]) .pill.ok{color:#5be3a0}#r:not([data-skin=\"clinic\"]) .pill.bad,#r:not([data-skin=\"clinic\"]) .err{color:#ff8a70}\n.connrow{margin-top:6px}.pill.ok::before{content:\"● \"}.pill.bad::before{content:\"● \"}\n.grp{display:inline-flex;gap:8px;align-items:center}\n#unlock{display:none}#r.closed #unlock{display:inline-block}#r.show #unlock{display:none}\n#r.closed .num{font-size:clamp(70px,16vw,150px);color:var(--mut);text-shadow:none}\nbutton:disabled{opacity:.45;cursor:not-allowed}\n*{box-sizing:border-box}\n#r{margin:0;color:var(--ink);font:500 16px/1.4 system-ui,\"Segoe UI\",Roboto,sans-serif;min-height:60vh;background:var(--bgimg),var(--bg)}\n.wrap{max-width:1140px;margin:0 auto;padding:18px}\nheader{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-bottom:14px}\nheader>div:first-child{margin-right:auto}\nh1{font-size:24px;margin:0;font-weight:800}\n#r[data-skin=\"neon\"] h1{text-shadow:0 0 14px rgba(34,229,255,.7)}\n.sub{color:var(--mut);font-size:13px}\n.clock{font-size:30px;font-weight:800;font-variant-numeric:tabular-nums;color:var(--acc)}\n#r[data-skin=\"neon\"] .clock{text-shadow:0 0 10px #22e5ff,0 0 26px rgba(34,229,255,.6)}\n.tools{display:flex;gap:8px;flex-wrap:wrap;align-items:center;width:100%;justify-content:flex-end}\nbutton,select,input{font:inherit;color:inherit}\n.btn{border:1px solid var(--line);background:var(--card);padding:9px 14px;border-radius:12px;cursor:pointer;font-weight:700}\n.btn:hover{border-color:var(--acc)}\n.btn:focus-visible,select:focus-visible,input:focus-visible{outline:3px solid var(--acc);outline-offset:2px}\nselect,input{background:var(--inp);border:1px solid var(--line);border-radius:12px;padding:10px 12px}\nselect option{background:var(--dlg);color:var(--ink)}\ninput.n{width:96px}\n.grid{display:grid;grid-template-columns:1fr 330px;gap:16px}\n@media(max-width:860px){.grid{grid-template-columns:1fr}}\n.hero{position:relative;border-radius:26px;padding:22px 28px;background:var(--hero);border:3px solid var(--herob);box-shadow:var(--heros)}\n.hero::before,.hero::after{content:\"\";position:absolute;width:46px;height:46px;border:4px solid var(--brk)}\n.hero::before{top:-7px;left:-7px;border-right:0;border-bottom:0;border-radius:26px 0 0 0}\n.hero::after{bottom:-7px;right:-7px;border-left:0;border-top:0;border-radius:0 0 26px 0}\n.hero.flash{animation:flash 1.1s ease-out}\n@keyframes flash{from{box-shadow:0 0 0 8px var(--flash),0 0 60px var(--flash)}}\n.hero .lab{font-size:15px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--lab)}\n.num{font-weight:800;text-align:center;font-size:clamp(100px,23vw,230px);line-height:1.05;letter-spacing:.04em;font-variant-numeric:tabular-nums;color:var(--num);text-shadow:var(--nums);margin:6px 0 10px}\n.num.pulse{animation:pop .55s ease}\n@keyframes pop{0%{transform:scale(.9);opacity:.2}60%{transform:scale(1.04)}100%{transform:none;opacity:1}}\n@media(prefers-reduced-motion:reduce){.num.pulse,.hero.flash{animation:none}}\n.to{text-align:center;font-size:clamp(24px,4.4vw,40px);font-weight:800;color:var(--to);text-shadow:var(--tos);border-top:2px dashed var(--line);padding-top:14px}\n.ctrl{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:16px}\n.go{flex:1 1 230px;background:var(--go);color:var(--accink);border:0;border-radius:16px;padding:19px;font-size:21px;font-weight:800;cursor:pointer;box-shadow:var(--gos)}\n.go:active{transform:translateY(2px)}\n.status{color:var(--mut);font-size:13px;margin-top:10px;min-height:20px}\n.chips{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin-top:8px;font-size:14px}\n.pill{border:1px solid var(--line);background:var(--card);border-radius:20px;padding:4px 12px;font-weight:700}\n.pill.ok{color:#0a8a4a}.pill.bad{color:#d4380d}\n.sk{border:1px solid var(--laneon);background:transparent;border-radius:16px;padding:3px 10px;font-weight:800;cursor:pointer}\n.lanes{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-top:14px}\n.lane{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:12px 14px;opacity:.85}\n.lane.on{opacity:1;border-color:var(--laneon);box-shadow:var(--lanes)}\n.lane b{display:block;font-size:34px;font-variant-numeric:tabular-nums;color:var(--lnum)}\n.lane span{color:var(--mut);font-size:13px}\n.side{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:16px;display:flex;flex-direction:column;max-height:680px}\n.side h2{margin:0 0 8px;font-size:17px;display:flex;justify-content:space-between;align-items:center}\nol{list-style:none;margin:0;padding:0;overflow:auto;flex:1;scrollbar-width:thin}\nli{display:flex;gap:12px;align-items:baseline;padding:10px 6px;border-bottom:1px solid var(--line)}\nli b{font-size:24px;min-width:62px;font-variant-numeric:tabular-nums;color:var(--lnum)}\nli:first-child b{color:var(--to)}\nli span{color:var(--mut);font-size:13px}\n.empty{color:var(--mut);padding:12px 4px}\ndialog{border:2px solid var(--acc);border-radius:20px;background:var(--dlg);color:var(--ink);padding:22px;width:min(380px,92vw)}\ndialog::backdrop{background:rgba(3,10,16,.6)}\ndialog h2{margin:0 0 8px;font-size:18px}dialog p{margin:0 0 10px;color:var(--mut);font-size:14px}\ndialog label{display:block;font-size:13px;color:var(--mut);margin-top:8px}dialog input{width:100%}\n.acts{display:flex;gap:8px;justify-content:flex-end;margin-top:12px}\n.err{color:#d4380d;font-size:13px;min-height:18px}\n.okb{background:var(--acc);color:var(--accink);border:0}\n.br{display:flex;align-items:center;gap:8px;margin:3px 0;font-size:13px}.br span{width:44px;color:var(--mut)}.br em{flex:1;display:block}.br i{display:block;height:10px;border-radius:6px;background:var(--acc);min-width:2px}.br b{width:30px;text-align:right}\n.kv{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 10px}.kv div{flex:1 1 90px;border:1px solid var(--line);border-radius:12px;padding:8px 10px}.kv b{display:block;font-size:22px}\n#sbody{max-height:60vh;overflow:auto}\n#r.show .ctrl,#r.show .tools .hide,#r.show .side h2 button,#r.show .status,#r.show .chips .x{display:none}\n#r.show .grid{grid-template-columns:1fr}\n\n#r:fullscreen{min-height:100vh;overflow:auto}";
var HTML="<div class=\"wrap\">\n<header>\n<div><h1>Gọi số khám bệnh</h1><div class=\"sub\" id=\"date\"></div><div class=\"connrow\"><span class=\"pill\" id=\"conn\"></span></div></div>\n<div class=\"clock\" id=\"clock\" aria-hidden=\"true\"></div>\n<div class=\"tools\">\n<span class=\"sub hide\">Giao diện:</span><select class=\"hide\" id=\"skin\"><option value=\"clinic\">Phòng khám (sáng)</option><option value=\"navy\">Xanh đen</option><option value=\"black\">Đen</option><option value=\"neon\">Neon đêm</option></select>\n<button class=\"btn hide\" id=\"voice\">Giọng đọc: Bật</button>\n<button class=\"btn hide\" id=\"chime\">Chuông: Bật</button>\n<span class=\"sub hide\">Giọng:</span><select class=\"hide\" id=\"vsel\" aria-label=\"Chọn giọng\"></select>\n<span class=\"sub hide\">Tốc độ:</span><select class=\"hide\" id=\"vspd\"><option value=\"0.9\">Chậm</option><option value=\"1\" selected>Vừa</option><option value=\"1.1\">Nhanh</option></select>\n<button class=\"btn hide\" id=\"vtest\">Thử giọng</button>\n<button class=\"btn hide\" id=\"stat\">Thống kê</button>\n<button class=\"btn hide\" id=\"net\">Nhiều máy: Tắt</button>\n<button class=\"btn\" id=\"show\">Màn hình chờ</button>\n</div>\n</header>\n<div class=\"grid\">\n<main>\n<section class=\"hero\" aria-live=\"polite\">\n<div class=\"lab\">Mời bệnh nhân số</div>\n<div class=\"num\" id=\"num\">---</div>\n<div class=\"to\" id=\"to\">Chưa gọi số nào</div>\n</section>\n<div class=\"ctrl\">\n<label>Quầy <select id=\"q\"></select></label>\n<button class=\"go\" id=\"next\">Gọi số tiếp theo</button>\n<button class=\"btn\" id=\"again\">Gọi lại</button>\n<button class=\"btn\" id=\"skip\">Bỏ qua</button>\n<span class=\"grp\"><input class=\"n\" id=\"spec\" inputmode=\"numeric\" placeholder=\"Số\" aria-label=\"Gọi số cụ thể\"><button class=\"btn\" id=\"callSpec\">Gọi số này</button></span>\n</div>\n<div class=\"status\" id=\"status\">Phím tắt: Space gọi số tiếp theo, R gọi lại.</div>\n<div class=\"chips\">\n<span class=\"pill\" id=\"wait\"></span>\n<span class=\"x grp\" style=\"flex-wrap:wrap\">Đã phát tới số <input class=\"n\" id=\"iss\" inputmode=\"numeric\" aria-label=\"Số đã phát\"> <button class=\"btn\" id=\"issb\">Lưu</button></span>\n<span class=\"sub x\" id=\"mid\"></span><button class=\"btn\" id=\"unlock\">Mở khóa tạm bằng PIN</button>\n</div>\n<div class=\"chips\" id=\"skl\"></div>\n<div class=\"lanes\" id=\"lanes\"></div>\n</main>\n<aside class=\"side\">\n<h2>Lịch sử gọi <button class=\"btn\" id=\"reset\">Đặt lại</button></h2>\n<ol id=\"hist\"></ol>\n</aside>\n</div>\n</div>\n<dialog id=\"dlg\"><form method=\"dialog\" id=\"f\" style=\"margin:0\">\n<h2 id=\"pt\">Đặt lại danh sách</h2><p id=\"pp\">Nhập PIN để xóa toàn bộ số đã gọi hôm nay (mọi máy đang kết nối đều bị xóa).</p>\n<input id=\"pv\" type=\"password\" inputmode=\"numeric\" autocomplete=\"off\" placeholder=\"PIN\"><div class=\"err\" id=\"err\"></div>\n<div class=\"acts\"><button type=\"button\" class=\"btn\" id=\"cx\">Hủy</button><button class=\"btn okb\" id=\"ok\">Xác nhận</button></div>\n</form></dialog>\n<dialog id=\"dlg2\"><form method=\"dialog\" id=\"f2\" style=\"margin:0\">\n<h2>Kích hoạt máy này</h2><p>Gửi <b>Mã máy</b> bên dưới cho quản trị viên để nhận mã kích hoạt, rồi nhập vào đây.</p><p style=\"font-size:20px;font-weight:800;letter-spacing:.05em;color:var(--ink)\" id=\"midb\"></p><div style=\"margin:0 0 8px\"><button type=\"button\" class=\"btn\" id=\"cpm\">Chép mã máy</button></div>\n<div style=\"display:flex;gap:6px\"><input id=\"ct\" type=\"password\" autocomplete=\"off\" placeholder=\"XXXX\" maxlength=\"4\" style=\"flex:1;min-width:0;text-transform:uppercase;letter-spacing:.3em;font-weight:800;text-align:center\"><button type=\"button\" class=\"btn\" id=\"ptc\">Dán</button></div><div class=\"err\" id=\"err2\"></div>\n<div class=\"acts\"><button type=\"button\" class=\"btn\" id=\"cx2\">Hủy</button><button class=\"btn okb\">Bật</button></div>\n</form></dialog>\n<dialog id=\"dlg3\"><h2>Thống kê hôm nay</h2><div id=\"sbody\"></div>\n<div class=\"acts\"><button type=\"button\" class=\"btn\" id=\"csv\">Xuất CSV</button><button type=\"button\" class=\"btn okb\" id=\"cx3\">Đóng</button></div></dialog>\n<dialog id=\"dlg4\"><h2>Tắt chế độ nhiều máy?</h2><p>Máy này sẽ chuyển sang chạy đơn, không đồng bộ số với các máy khác. Bật lại sau này không cần nhập mã.</p><div class=\"acts\"><button type=\"button\" class=\"btn\" id=\"cx4\">Hủy</button><button type=\"button\" class=\"btn okb\" id=\"ok4\">Tắt</button></div></dialog>";
function init(shadow,r,page){
function on(){return page.classList.contains("active")}

var KP="goiso_pin",KC="goiso_cfg",KL="goiso_local",QN=5,$=function(i){return shadow.getElementById(i)};
function p2(n){return(n<10?"0":"")+n}
function vn(){var d=new Date(Date.now()+25200000);return{date:p2(d.getUTCDate())+"/"+p2(d.getUTCMonth()+1)+"/"+d.getUTCFullYear(),t:p2(d.getUTCHours())+":"+p2(d.getUTCMinutes())+":"+p2(d.getUTCSeconds())}}
function fresh(d){return{date:d,last:0,cur:null,lanes:{},hist:[],skipped:[],issued:0,seq:0,ver:0}}
function fr(S,d){var f=fresh(d);f.ver=S.ver;f.seq=S.seq;return f}
function R(S,a,v){if(S.date!==v.date)S=fr(S,v.date);var n;
if(a.type==="next"||a.type==="call"){n=a.type==="next"?S.last+1:(a.n|0);if(n<1||n>9999)return S;var q=a.q|0;if(q<1||q>5)q=1;var e={n:n,q:q,t:v.t};S.cur=e;S.lanes[q]=e;S.hist.push(e);if(S.hist.length>1000)S.hist.shift();if(n>S.last)S.last=n;S.skipped=S.skipped.filter(function(x){return x!==n});S.seq++}
else if(a.type==="recall"){if(S.cur)S.seq++}
else if(a.type==="skip"){if(S.cur&&S.skipped.indexOf(S.cur.n)<0)S.skipped.push(S.cur.n)}
else if(a.type==="issued"){S.issued=Math.max(0,Math.min(9999,a.n|0))}
else if(a.type==="reset"){S=fr(S,v.date)}
S.ver++;return S}

function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){}return null}
var cfg={};try{cfg=JSON.parse(ls(KC))||{}}catch(e){}
var closed=false,ovr=false,pm="reset",S=null,voiceOn=true,chimeOn=true,lastSeq=0,first=true;
try{S=JSON.parse(ls(KL))}catch(e){}
if(!S||S.date!==vn().date||cfg.url)S=fresh(vn().date);
var pad=function(n){return String(n).padStart(3,"0")};
var q=$("q");for(var i=1;i<=QN;i++){var o=document.createElement("option");o.value=i;o.textContent="Quầy số "+i;q.appendChild(o)}
var sq=ls("goiso_q");if(sq)q.value=sq;q.onchange=function(){ls("goiso_q",q.value)};
function setSkin(s){r.setAttribute("data-skin",s);$("skin").value=s;ls("goiso_skin",s)}
setSkin(ls("goiso_skin")||"clinic");$("skin").onchange=function(){setSkin(this.value)};
function render(pulse){
$("date").textContent="Ngày làm việc "+S.date;
var n=$("num");
r.querySelector(".hero .lab").textContent=closed?"Ngoài giờ gọi số":"Mời bệnh nhân số";
if(closed){n.textContent="NGHỈ";$("to").textContent=reopen();pulse=false}else if(S.cur){n.textContent=pad(S.cur.n);$("to").textContent="Đến quầy số "+S.cur.q}else{n.textContent="---";$("to").textContent="Chưa gọi số nào"}
if(pulse){n.classList.remove("pulse");void n.offsetWidth;n.classList.add("pulse");var hh=r.querySelector(".hero");hh.classList.remove("flash");void hh.offsetWidth;hh.classList.add("flash")}
var L=$("lanes");L.innerHTML="";
for(var i=1;i<=QN;i++){var l=S.lanes[i],d=document.createElement("div");d.className="lane"+(S.cur&&S.cur.q==i?" on":"");
d.innerHTML="<span>Quầy "+i+"</span><b>"+(l?pad(l.n):"---")+"</b><span>"+(l?l.t.slice(0,5):"Chưa gọi")+"</span>";L.appendChild(d)}
var H=$("hist");H.innerHTML="";
if(!S.hist.length){H.innerHTML='<li class="empty">Chưa có lượt gọi nào hôm nay.</li>'}
S.hist.slice(-100).reverse().forEach(function(h){var li=document.createElement("li");li.innerHTML="<b>"+pad(h.n)+"</b><span>Quầy số "+h.q+" · "+h.t+"</span>";H.appendChild(li)});
var w=Math.max(0,S.issued-S.last);$("wait").textContent=S.issued?"Đang chờ: "+w+" người":"Đang chờ: chưa nhập số đã phát";
var K=$("skl");K.innerHTML="";
if(S.skipped.length){var t=document.createElement("span");t.className="x";t.textContent="Đã bỏ qua (bấm để gọi lại):";K.appendChild(t);
S.skipped.forEach(function(n){var b=document.createElement("button");b.className="sk x";b.textContent=pad(n);b.onclick=function(){act({type:"call",n:n,q:+q.value})};K.appendChild(b)})}
lastSeq=S.seq}
function conn(ok){var c=$("conn");c.textContent=!cfg.url?"Máy đơn":ok?"Đã kết nối nhiều máy":"Mất kết nối, đang thử lại";c.className="pill "+(!cfg.url?"":ok?"ok":"bad")}
function api(){return cfg.url.replace(/\/+$/,"")+"/?room="+encodeURIComponent(cfg.room||"main")}
function devId(){var d=ls("goiso_dev3");if(!d||d.length!==4){var al="ABCDEFGHJKMNPQRSTUVWXYZ23456789",a=new Uint8Array(4);(window.crypto||{getRandomValues:function(x){for(var i=0;i<x.length;i++)x[i]=Math.random()*256}}).getRandomValues(a);d="";for(var i=0;i<4;i++)d+=al[a[i]%al.length];ls("goiso_dev3",d)}return d}
function hd(){var h={"content-type":"application/json","x-dev":devId()};if(cfg.token)h["x-token"]=cfg.token;return h}
function done(a){var c=a.type==="next"||a.type==="call"||a.type==="recall";render(c&&a.type!=="recall");
if(c&&S.cur){say(S.cur.n,S.cur.q);$("status").textContent="Đã gọi số "+pad(S.cur.n)+" tại quầy "+S.cur.q+"."}
else if(a.type==="skip")$("status").textContent="Đã bỏ qua số hiện tại. Bấm Gọi số tiếp theo."}
function act(a){
if(closed&&a.type!=="reset")return;
if(!cfg.url){S=R(S,a,vn());ls(KL,JSON.stringify(S));done(a);return}
fetch(api(),{method:"POST",headers:hd(),body:JSON.stringify(a)}).then(function(r){if(r.status===401){$("status").textContent="Mã máy không hợp lệ hoặc đã bị khóa.";throw 401}if(!r.ok)throw 0;return r.json()}).then(function(s){S=s;conn(true);done(a)}).catch(function(e){if(e===401)return;conn(false);$("status").textContent="Chưa gửi được lên máy chủ, thử lại."})}
function poll(){if(!cfg.url||!on())return;
fetch(api(),{headers:hd()}).then(function(r){if(r.status===401){var c=$("conn");c.textContent="Mã máy không hợp lệ hoặc đã bị khóa";c.className="pill bad";throw 401}if(!r.ok)throw 0;return r.json()}).then(function(s){conn(true);
if(first){first=false;S=s;render(false);return}
if(s.ver!==S.ver||s.date!==S.date){var ch=s.seq!==lastSeq,disp=r.classList.contains("show");S=s;render(ch);if(ch&&disp&&s.cur)say(s.cur.n,s.cur.q)}}).catch(function(e){if(e!==401)conn(false)})}
setInterval(poll,2000);
window.addEventListener("storage",function(e){if(e.key===KL&&!cfg.url){try{S=JSON.parse(e.newValue);render(true)}catch(x){}}});
var VO={},ctx=null,bufs={},srcs=[];
function ac(){if(!ctx){var C=window.AudioContext||window.webkitAudioContext;ctx=new C()}if(ctx.state==="suspended")ctx.resume();return ctx}
function b2ab(b){var s=atob(b),a=new Uint8Array(s.length);for(var i=0;i<s.length;i++)a[i]=s.charCodeAt(i);return a.buffer}
function loadClips(id){if(bufs[id])return bufs[id];var c=ac(),ks=Object.keys(VO[id].c);bufs[id]=Promise.all(ks.map(function(k){return new Promise(function(r,j){c.decodeAudioData(b2ab(VO[id].c[k]),r,j)})})).then(function(a){var o={};ks.forEach(function(k,i){o[k]=a[i]});return o});return bufs[id]}
function fillVoices(){var s=$("vsel"),cur=ls("goiso_voice2")||"";s.innerHTML="";Object.keys(VO).forEach(function(k){var o=document.createElement("option");o.value=k;o.textContent=VO[k].l;s.appendChild(o)});var o=document.createElement("option");o.value="machine";o.textContent="Giọng máy (mặc định)";s.appendChild(o);if(!Object.keys(VO).length){var l=document.createElement("option");l.disabled=true;l.textContent="Giọng ghi sẵn: bật Nhiều máy và nhập mã để mở";s.appendChild(l)}s.value=(cur&&(cur==="machine"||VO[cur]))?cur:(Object.keys(VO)[0]||"machine")}
fillVoices();var ss=ls("goiso_spd");if(ss)$("vspd").value=ss;
$("vsel").onchange=function(){ls("goiso_voice2",this.value);say(123,1)};
$("vspd").onchange=function(){ls("goiso_spd",this.value);say(123,1)};
$("vtest").onclick=function(){say(123,1)};
function hex2u8(x){var a=new Uint8Array(x.length/2);for(var i=0;i<a.length;i++)a[i]=parseInt(x.substr(i*2,2),16);return a}
function loadVoiceFile(){return new Promise(function(res,rej){if(window.GOISO_VOENC)return res(window.GOISO_VOENC);var s=document.createElement("script");s.src=BASE+"clinic-queue-voice.js";s.onload=function(){window.GOISO_VOENC?res(window.GOISO_VOENC):rej()};s.onerror=rej;document.head.appendChild(s)})}
function unlockVoices(k){if(!(window.crypto&&crypto.subtle))return Promise.reject();
return loadVoiceFile().then(function(VE){return crypto.subtle.importKey("raw",hex2u8(k),"AES-GCM",false,["decrypt"]).then(function(key){return Promise.all(Object.keys(VE).map(function(id){var e=VE[id];return crypto.subtle.decrypt({name:"AES-GCM",iv:new Uint8Array(b2ab(e.iv))},key,b2ab(e.d)).then(function(buf){VO[id]={l:e.l,c:JSON.parse(new TextDecoder().decode(buf))}})}))})}).then(function(){bufs={};fillVoices()})}
function fetchKey(){if(!cfg.url)return Promise.resolve();
return fetch(NETURL+"?vkey=1",{headers:{"x-token":cfg.token||"","x-dev":devId()}}).then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(j){if(!j.k)throw 0;ls("goiso_vk",j.k);return unlockVoices(j.k)})}
var vk=ls("goiso_vk");if(vk)unlockVoices(vk).catch(function(e){window.__err=String(e)});
function chime(c,t){[[988,0],[740,.42]].forEach(function(x){var o=c.createOscillator(),g=c.createGain(),s=t+x[1];o.type="sine";o.frequency.value=x[0];o.connect(g);g.connect(c.destination);g.gain.setValueAtTime(0,s);g.gain.linearRampToValueAtTime(.35,s+.03);g.gain.exponentialRampToValueAtTime(.001,s+.8);o.start(s);o.stop(s+.85)})}
function sayMachine(n,qq){
if(!window.speechSynthesis)return;
var dg=pad(n).split("").map(function(c){return c==="0"?"không":["","một","hai","ba","bốn","năm","sáu","bảy","tám","chín"][+c]}).join(" ");
var u=new SpeechSynthesisUtterance("Mời bệnh nhân số "+dg+", đến quầy số "+qq);
var vs=speechSynthesis.getVoices().filter(function(v){return v.lang.toLowerCase().indexOf("vi")===0});
u.lang="vi-VN";if(vs[0])u.voice=vs[0];speechSynthesis.cancel();
if(chimeOn){chime(ac(),ac().currentTime+.05);setTimeout(function(){speechSynthesis.speak(u)},1000)}else speechSynthesis.speak(u)}
function say(n,qq){
if(!voiceOn)return;var id=$("vsel").value;
if(id==="machine"||!VO[id]){sayMachine(n,qq);return}
loadClips(id).then(function(B){
srcs.forEach(function(s){try{s.stop()}catch(e){}});srcs=[];
var c=ctx,r=+$("vspd").value,t=c.currentTime+.08,d=pad(n).split(""),qs=[["moi",.14]];
if(chimeOn){chime(c,t);t+=1}
d.forEach(function(x,i){qs.push([x,i===d.length-1?.16:.05])});qs.push(["den",.07]);qs.push([String(qq),0]);
qs.forEach(function(e){var s=c.createBufferSource();s.buffer=B[e[0]];s.playbackRate.value=r;s.connect(c.destination);s.start(t);srcs.push(s);t+=(B[e[0]].duration+e[1])/r})
}).catch(function(){$("status").textContent="Không phát được âm thanh, thử bấm vào trang rồi gọi lại."})}
$("next").onclick=function(){act({type:"next",q:+q.value})};
$("again").onclick=function(){if(!S.cur){$("status").textContent="Chưa có số nào để gọi lại.";return}act({type:"recall"})};
$("skip").onclick=function(){if(!S.cur){$("status").textContent="Chưa có số nào để bỏ qua.";return}act({type:"skip"})};
$("callSpec").onclick=function(){var v=parseInt($("spec").value,10);if(!v||v<1){$("status").textContent="Nhập số thứ tự lớn hơn 0.";return}$("spec").value="";act({type:"call",n:v,q:+q.value})};
$("spec").onkeydown=function(e){if(e.key==="Enter")$("callSpec").click()};
$("issb").onclick=function(){var v=parseInt($("iss").value,10);if(isNaN(v)||v<0)return;$("iss").value="";act({type:"issued",n:v})};
$("iss").onkeydown=function(e){if(e.key==="Enter")$("issb").click()};
document.addEventListener("keydown",function(e){
var tg=e.composedPath?e.composedPath()[0]:e.target;if(!on()||!tg||tg.tagName==="INPUT"||tg.tagName==="SELECT"||tg.tagName==="TEXTAREA"||shadow.querySelector("dialog[open]"))return;
if(e.code==="Space"){e.preventDefault();$("next").click()}else if(e.key==="r"||e.key==="R"){$("again").click()}});
$("voice").onclick=function(){voiceOn=!voiceOn;this.textContent="Giọng đọc: "+(voiceOn?"Bật":"Tắt");if(!voiceOn&&window.speechSynthesis)speechSynthesis.cancel()};
$("chime").onclick=function(){chimeOn=!chimeOn;this.textContent="Chuông: "+(chimeOn?"Bật":"Tắt")};
$("show").onclick=function(){var on=r.classList.toggle("show");this.textContent=on?"Thoát màn hình chờ":"Màn hình chờ";if(on)ac();
try{if(on&&r.requestFullscreen)r.requestFullscreen();else if(!on&&document.fullscreenElement)document.exitFullscreen()}catch(e){}};
document.addEventListener("fullscreenchange",function(){if(!document.fullscreenElement&&r.classList.contains("show")){r.classList.remove("show");$("show").textContent="Màn hình chờ"}});
$("reset").onclick=function(){pm="reset";$("pt").textContent="Đặt lại danh sách";$("pp").textContent="Nhập PIN để xóa toàn bộ số đã gọi hôm nay (mọi máy đang kết nối đều bị xóa).";$("pv").value="";$("err").textContent="";$("dlg").showModal();$("pv").focus()};
$("cx").onclick=function(){$("dlg").close()};
$("f").onsubmit=function(e){e.preventDefault();if($("pv").value!==(ls(KP)||"1234")){$("err").textContent="PIN chưa đúng, thử lại.";return}$("dlg").close();if(pm==="unlock"){ovr=true;applyClosed();$("status").textContent="Đã mở khóa tạm, đến khi tải lại trang.";return}act({type:"reset"});$("status").textContent="Đã đặt lại danh sách."};
$("unlock").onclick=function(){pm="unlock";$("pt").textContent="Mở khóa ngoài giờ";$("pp").textContent="Nhập PIN để dùng tạm ngoài giờ gọi số (đến khi tải lại trang).";$("pv").value="";$("err").textContent="";$("dlg").showModal();$("pv").focus()};
var NETURL="https://clinic-queue.dhabolero.workers.dev/";
function netBtn(){$("net").textContent="Nhiều máy: "+(cfg.url?"Bật":"Tắt")}
function goLocal(){cfg={};ls(KC,"{}");first=true;try{S=JSON.parse(ls(KL))}catch(x){}if(!S||S.date!==vn().date)S=fresh(vn().date);render(false);conn(true);netBtn()}
function askCode(m){$("midb").textContent="Mã máy: "+devId();$("ct").value="";$("err2").textContent=m||"";$("dlg2").showModal();$("ct").focus()}
try{if(cfg&&cfg.token&&!ls("goiso_tok"))ls("goiso_tok",cfg.token)}catch(x){}
$("net").onclick=function(){if(cfg.url){$("dlg4").showModal();return}var t=ls("goiso_tok");if(t){enableNet(t,true);return}askCode("")};
$("cx4").onclick=function(){$("dlg4").close()};
$("ok4").onclick=function(){$("dlg4").close();goLocal()};
$("cx2").onclick=function(){$("dlg2").close()};
function cpText(t,b){var o=b.textContent;function ok(){b.textContent="Đã chép";setTimeout(function(){b.textContent=o},1200)}
function fb(){var x=document.createElement("textarea");x.value=t;document.body.appendChild(x);x.select();try{document.execCommand("copy");ok()}catch(e){}x.remove()}
if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(ok,fb);else fb()}
$("cpm").onclick=function(){cpText(devId(),this)};
$("ptc").onclick=function(){if(navigator.clipboard&&navigator.clipboard.readText)navigator.clipboard.readText().then(function(t){$("ct").value=t.trim();$("ct").focus()}).catch(function(){$("err2").textContent="Trình duyệt chặn dán tự động, hãy bấm vào ô và nhấn Ctrl+V."});else $("err2").textContent="Hãy bấm vào ô và nhấn Ctrl+V để dán."};
function enableNet(t,saved){
fetch(NETURL+"?room=main",{headers:{"x-token":t,"x-dev":devId()}}).then(function(r){if(r.status===401){if(saved){ls("goiso_tok","");askCode("Mã kích hoạt cũ không còn hiệu lực, nhập mã mới.")}else $("err2").textContent="Mã chưa đúng, đã bị khóa hoặc không dành cho máy này.";return}if(!r.ok)throw 0;
cfg={url:NETURL,room:"main",token:t};ls(KC,JSON.stringify(cfg));ls("goiso_tok",t);$("dlg2").close();first=true;S=fresh(vn().date);render(false);netBtn();conn(true);poll();fetchKey().catch(function(){$("status").textContent="Chưa mở được giọng ghi sẵn, kiểm tra biến VKEY trên Cloudflare."})}).catch(function(){if(saved)$("status").textContent="Không kết nối được máy chủ.";else $("err2").textContent="Không kết nối được máy chủ."})}
$("f2").onsubmit=function(e){e.preventDefault();var t=$("ct").value.trim().toUpperCase();if(t.length!==4){$("err2").textContent="Nhập đủ 4 ký tự.";return}enableNet(t,false)};
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
$("stat").onclick=function(){stats();$("dlg3").showModal()};
$("cx3").onclick=function(){$("dlg3").close()};
$("csv").onclick=function(){var r=["STT,Số,Quầy,Giờ"];S.hist.forEach(function(h,i){r.push((i+1)+","+pad(h.n)+","+h.q+","+h.t)});
var a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+r.join("\n")],{type:"text/csv"}));a.download="clinic-queue-"+S.date.replace(/\//g,"-")+".csv";document.body.appendChild(a);a.click();a.remove()};
function mins(){var a=vn().t.split(":");return a[0]*60+ +a[1]}
function dow(){return new Date(Date.now()+25200000).getUTCDay()}
function isOpen(){var m=mins(),w=dow();return w>0&&w<6&&((m>=420&&m<690)||(m>=780&&m<990))}
function reopen(){var m=mins(),w=dow();if(w===0||w===6)return"Nghỉ cuối tuần · hẹn gặp lại thứ Hai 07:00";if(w===5&&m>=990)return"Hẹn gặp lại thứ Hai 07:00";return m<420?"Mở lại lúc 07:00":(m>=690&&m<780)?"Mở lại lúc 13:00":"Hẹn gặp lại 07:00 ngày mai"}
function applyClosed(){var c=!isOpen()&&!ovr;if(c===closed)return;closed=c;r.classList.toggle("closed",c);
["next","again","skip","callSpec","issb","spec","iss"].forEach(function(id){$(id).disabled=c});render(false);
$("status").textContent=c?"Ngoài giờ gọi số (thứ Hai đến thứ Sáu: 07:00 đến 11:30 và 13:00 đến 16:30).":"Phím tắt: Space gọi số tiếp theo, R gọi lại."}
function tick(){if(!on())return;$("clock").textContent=vn().t;applyClosed()}tick();setInterval(tick,1000);
conn(true);render(false);$("mid").textContent="Mã máy: "+devId();netBtn();if(cfg.url){poll();if(!vk)fetchKey().catch(function(){})}

return{resume:function(){tick();poll()}};
}
var inst=null;
function start(){
var page=document.getElementById("page-clinicqueue");if(!page)return;
var host=document.getElementById("clinic-queue-host");
if(!host){host=document.createElement("div");host.id="clinic-queue-host";page.appendChild(host)}
function chk(){if(!page.classList.contains("active"))return;
if(inst){inst.resume();return}
var sh=host.attachShadow({mode:"open"});
sh.innerHTML='<style>:host{all:initial;display:block}'+CSS+'</style><div id="r" data-skin="clinic">'+HTML+'</div>';
inst=init(sh,sh.getElementById("r"),page)}
new MutationObserver(chk).observe(page,{attributes:true,attributeFilter:["class"]});chk()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
