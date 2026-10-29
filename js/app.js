(async function(){
let D;
try{ D = await fetch('data/questions.json').then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); }); }
catch(e){
  document.getElementById('main').innerHTML = '<section class="card"><h2>题库加载失败</h2><p>请用本地服务器打开，不要直接双击 index.html：</p><pre>python3 -m http.server 8000</pre><p>然后访问 <a href="http://localhost:8000">http://localhost:8000</a></p></section>';
  return;
}
const Q = D.q, TOP = D.topics, EXP = D.exp;
const byId = {}; Q.forEach((q,i)=>{byId[q.id]=q; q.i=i;});
const N = Q.length, L = 'ABCD';
const BOOK_CLEAR = 2; // 错题本里连续答对几次自动移出
const KEY = 'njq_progress_v1';

// ---------- state ----------
// ans[id] = {c: last choice, ok: 0/1, n: attempts, w: wrong count, s: streak in 错题本, t: last change}
// book[id] = {on: in 错题本, a: added at, t: last change}
// 多设备合并：每道题、每条错题本记录各自比 t，取较新的一边；reset 之前的记录丢弃
function blank(){return {v:2, at:0, reset:0, ans:{}, book:{}, pos:{seq:1, book:0}, lang:'bi', exams:[], view:'seq'};}
function norm(x){
  const o = Object.assign(blank(), x||{});
  for(const k in o.book){ const b=o.book[k]; if(typeof b==='number') o.book[k]={on:true,a:b,t:b}; }
  for(const k in o.ans){ if(o.ans[k].t==null) o.ans[k].t = o.at||0; }
  return o;
}
function mergeInto(L, R){ // 把 R 的作答/错题本/考试记录合并进 L，返回 L 是否有 R 没有的新内容
  let changed=false, ahead=false;
  const reset = Math.max(L.reset||0, R.reset||0);
  if(reset > (L.reset||0)){ L.reset=reset; changed=true; }
  if(reset > (R.reset||0)) ahead=true;
  for(const m of ['ans','book']){
    const ids = new Set([...Object.keys(L[m]), ...Object.keys(R[m])]);
    for(const id of ids){
      const l=L[m][id], r=R[m][id];
      const lt = l && l.t>=reset ? l.t : -1, rt = r && r.t>=reset ? r.t : -1;
      if(rt>lt){ L[m][id]=JSON.parse(JSON.stringify(r)); changed=true; }
      else if(lt<0 && l){ delete L[m][id]; changed=true; }
      if(lt>rt) ahead=true;
    }
  }
  const ex={}; (L.exams||[]).concat(R.exams||[]).filter(x=>x.at>=reset).forEach(x=>ex[x.at]=x);
  const all=Object.values(ex).sort((a,b)=>a.at-b.at).slice(-30);
  if(all.length!==(L.exams||[]).length) changed=true;
  if(all.length!==(R.exams||[]).length) ahead=true;
  L.exams=all;
  return {changed, ahead};
}
let S = blank();
try{ const raw = localStorage.getItem(KEY); if(raw) S = norm(JSON.parse(raw)); }catch(e){}

function save(){
  S.at = Date.now();
  try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){}
}
// 同一浏览器开了多个标签页时互相合并
window.addEventListener('storage', e=>{
  if(e.key!==KEY || !e.newValue) return;
  let R; try{ R = norm(JSON.parse(e.newValue)); }catch(err){ return; }
  const {changed} = mergeInto(S, R);
  if(!changed) return;
  const ae=document.activeElement;
  if((exam && exam.live) || (ae && ae.matches && ae.matches('input,select'))) renderHeader(); else render();
});
// 换设备：导出一个 JSON 文件，在另一台设备上导入，按题合并
function exportProgress(){
  const blob = new Blob([JSON.stringify(S)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'njq-progress-'+new Date().toISOString().slice(0,10)+'.json';
  a.click(); setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
}
function importProgress(file){
  file.text().then(t=>{
    const R = norm(JSON.parse(t));
    if(!R.ans || !R.book) throw new Error('bad file');
    mergeInto(S, R); save(); render(); toast('已合并导入的进度');
  }).catch(()=>toast('文件格式不对，导入失败'));
}

// ---------- helpers ----------
const $ = s=>document.querySelector(s);
const esc = s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),1600);}
function inBk(id){ const b=S.book[id]; return !!(b && b.on); }
function addBk(id){ if(!inBk(id)){ const t=Date.now(); S.book[id]={on:true,a:t,t}; } }
function rmBk(id){ S.book[id]={on:false,a:0,t:Date.now()}; }
function bookIds(){ return Object.keys(S.book).map(Number).filter(id=>byId[id]&&inBk(id)).sort((a,b)=>S.book[a].a-S.book[b].a||a-b); }
function stats(){
  let done=0, ok=0, no=0;
  for(const q of Q){ const a=S.ans[q.id]; if(a){done++; a.ok?ok++:no++;} }
  return {done, ok, no, book: bookIds().length};
}
function topicName(t){ return TOP[t] ? TOP[t].zh : t; }
function opts(q){ const out=[]; for(let i=0;i<4;i++){ if((q.oe[i]||'').trim()||(q.oz[i]||'').trim()) out.push(i);} return out; }

function record(q, choice, inBookMode){
  const a = S.ans[q.id] || {n:0,w:0,s:0};
  const ok = choice===q.a;
  a.c=choice; a.ok=ok?1:0; a.n=(a.n||0)+1; a.t=Date.now();
  if(!ok){ a.w=(a.w||0)+1; a.s=0; addBk(q.id); }
  else if(inBk(q.id)){ a.s=(a.s||0)+1; if(inBookMode && a.s>=BOOK_CLEAR){ rmBk(q.id); a.s=0; toast('连续答对 '+BOOK_CLEAR+' 次，已移出错题本'); } }
  S.ans[q.id]=a;
  return ok;
}

// ---------- header ----------
function renderHeader(){
  const st = stats();
  const pct = st.done ? Math.round(st.ok/st.done*100) : 0;
  $('#statline').innerHTML =
    `<span>已做 <b>${st.done}</b> / ${N}</span><span>答对 <b>${st.ok}</b></span><span>答错 <b>${st.no}</b></span><span>正确率 <b>${st.done?pct+'%':'–'}</b></span>`;
  $('#bar').innerHTML = `<i style="width:${st.ok/N*100}%;background:var(--ok)"></i><i style="width:${st.no/N*100}%;background:var(--bad)"></i>`;
  $('#nbook').textContent = st.book;
  document.querySelectorAll('.tab').forEach(t=>t.setAttribute('aria-selected', String(t.dataset.v===S.view)));
}
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{ if(exam && exam.live && t.dataset.v!=='exam'){ toast('考试进行中，先交卷或放弃'); return; } S.view=t.dataset.v; save(); render(); window.scrollTo(0,0); });

function applyLang(){ document.body.classList.remove('lang-zh','lang-en'); if(S.lang!=='bi') document.body.classList.add('lang-'+S.lang); }

// ---------- question card ----------
// ctx: {mode:'seq'|'book'|'exam', idx, total, revealed, choice}
function langSeg(){
  return `<div class="seg" role="group" aria-label="显示语言">${[['bi','双语'],['zh','中'],['en','EN']].map(([k,t])=>`<button data-lang="${k}" aria-pressed="${S.lang===k}">${t}</button>`).join('')}</div>`;
}
function qCard(q, ctx){
  const a = S.ans[q.id];
  const chips = [];
  q.t.forEach(t=>chips.push(`<span class="chip">${esc(topicName(t))}</span>`));
  if(q.cm) chips.push(`<span class="chip cm">易错</span>`);
  if(inBk(q.id) && ctx.mode!=='exam') chips.push(`<span class="chip inbook">错题本</span>`);
  const img = q.img ? `<img src="data/images/${esc(q.img)}" alt="题目图片">` : '';
  const list = opts(q).map(i=>{
    let cls='opt', mark='';
    if(ctx.revealed){
      if(i===q.a){cls+=' right'; mark='<span class="mark" style="color:var(--ok)">正确答案</span>';}
      else if(i===ctx.choice){cls+=' wrong'; mark='<span class="mark" style="color:var(--bad)">你的选择</span>';}
      else cls+=' dim';
    } else if(i===ctx.choice) cls+=' sel';
    return `<button class="${cls}" data-o="${i}" ${ctx.revealed?'disabled':''}><span class="k">${L[i]}</span><span><div class="o-en">${esc(q.oe[i]||q.oz[i])}</div>${q.oz[i]?`<div class="o-zh">${esc(q.oz[i])}</div>`:''}</span>${mark}</button>`;
  }).join('');
  const prevNote = (ctx.mode==='seq' && a && !ctx.revealed) ? '' : '';
  return `<section class="card" id="qcard">
    <div class="qhead"><span class="qno">第 ${q.id} 题 <small>${ctx.label||''}</small></span>${chips.join('')}<div class="tools">${langSeg()}</div></div>
    <div class="stem ${img?'':'noimg'}">${img}<div class="txt"><div class="en">${esc(q.en||q.zh)}</div>${q.zh?`<div class="zh">${esc(q.zh)}</div>`:''}</div></div>
    <div class="opts">${list}</div>${prevNote}
    <div class="nav">${ctx.navHtml||''}</div>
  </section>`;
}
function expCard(q, choice){
  const ok = choice===q.a;
  const e = q.ek && EXP[q.ek];
  let k='';
  if(e){
    const rows = e.card && e.card.rows ? `<table>${e.card.rows.map(r=>`<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join('')}</table>`:'';
    k = `<div class="kcard">${e.card&&e.card.title?`<div class="kt">${esc(e.card.title)}</div>`:''}<div class="ktxt"><div class="x-zh">${esc(e.zh)}</div>${e.en?`<div class="x-en">${esc(e.en)}</div>`:''}</div>${rows}${e.source_label?`<div class="src">来源：${e.source_url?`<a href="${esc(e.source_url)}" target="_blank" rel="noopener">${esc(e.source_label)}</a>`:esc(e.source_label)}</div>`:''}</div>`;
  }
  const a = S.ans[q.id]||{};
  const hist = a.n ? `<span class="chip">累计作答 ${a.n} 次 · 错 ${a.w||0} 次</span>` : '';
  return `<section class="card exp ${ok?'':'bad'}" id="expcard">
    <div class="verdict ${ok?'ok':'no'}">${ok?'✓ 答对了':'✗ 答错了'}<span>正确答案 <b>${L[q.a]}</b>${ok?'':(choice>=0?`，你选了 ${L[choice]}`:'，这题没作答')}</span>${hist}</div>
    <h3><span class="x-zh">解析</span><span class="x-en">Explanation</span></h3><p class="x-zh">${esc(q.why||'暂无逐题解析。')}</p>${q.why_en?`<p class="x-en">${esc(q.why_en)}</p>`:''}
    ${q.tip?`<div class="tip"><div class="x-zh"><b>记忆：</b>${esc(q.tip)}</div>${q.tip_en?`<div class="x-en"><b>Remember: </b>${esc(q.tip_en)}</div>`:''}</div>`:''}
    ${q.flag?`<div class="flag"><div class="x-zh"><b>题目可能有误：</b>${esc(q.flag)}</div>${q.flag_en?`<div class="x-en"><b>Possible error in this question: </b>${esc(q.flag_en)}</div>`:''}</div>`:''}
    ${k}
  </section>`;
}
function bindCard(onPick){
  document.querySelectorAll('#qcard .opt').forEach(b=>b.onclick=()=>onPick(+b.dataset.o));
  document.querySelectorAll('#qcard [data-lang]').forEach(b=>b.onclick=()=>{S.lang=b.dataset.lang; save(); applyLang(); document.querySelectorAll('#qcard [data-lang]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.lang===S.lang)));});
}

// ---------- 顺序练习 ----------
let seqRedo = false; // 当前题是否点了“重做”
function renderSeq(){
  let id = S.pos.seq; if(!byId[id]) id = Q[0].id;
  const q = byId[id], a = S.ans[id];
  const revealed = !!a && !seqRedo;
  const nextUn = Q.find((x,i)=>i>q.i && !S.ans[x.id]) || Q.find(x=>!S.ans[x.id]);
  const nav = `<button class="btn" id="prev" ${q.i===0?'disabled':''}>← 上一题</button>
    <label class="jump">跳到 <input id="jumpin" type="number" min="1" max="${N}" value="${q.id}" aria-label="题号"> / ${N}</label>
    ${revealed?`<button class="btn ghost" id="redo">重做</button>`:''}
    <button class="btn pri" id="next" ${q.i===N-1?'disabled':''}>下一题 →</button>`;
  $('#main').innerHTML = qCard(q,{mode:'seq', revealed, choice: revealed?a.c:null, navHtml:nav, label: a&&!revealed?'· 重做中':''})
    + (revealed?expCard(q,a.c):'')
    + `<div class="hint">${nextUn&&nextUn.id!==q.id?`<button class="btn ghost" id="gonew">跳到下一道未做的题（第 ${nextUn.id} 题）</button><br>`:''}<kbd>1</kbd>–<kbd>4</kbd> 或 <kbd>A</kbd>–<kbd>D</kbd> 选答 · <kbd>←</kbd> <kbd>→</kbd> 翻题</div>`;
  bindCard(i=>{ if(revealed) return; seqRedo=false; record(q,i,false); save(); render(); scrollExp(); });
  $('#prev').onclick=()=>goSeq(q.i-1);
  $('#next').onclick=()=>goSeq(q.i+1);
  const r=$('#redo'); if(r) r.onclick=()=>{seqRedo=true; render();};
  const g=$('#gonew'); if(g) g.onclick=()=>goSeq(nextUn.i);
  $('#jumpin').onchange=e=>{const v=+e.target.value; if(byId[v]) goSeq(byId[v].i);};
}
function goSeq(i){ if(i<0||i>=N) return; seqRedo=false; S.pos.seq=Q[i].id; save(); render(); window.scrollTo({top:0}); }
function scrollExp(){ const e=$('#expcard'); if(e && e.getBoundingClientRect().top > window.innerHeight-80) e.scrollIntoView({behavior:'smooth',block:'nearest'}); }

// ---------- 错题本 ----------
let bk = {id:null, choice:null}; // 本轮作答状态（错题本每次都重新做）
function renderBook(){
  const ids = bookIds();
  if(!ids.length && !(bk.id && bk.choice!=null)){
    $('#main').innerHTML = `<section class="card empty"><div class="big">0</div><h2>错题本是空的</h2><p>做错的题会自动收进这里。在错题本里连续答对 ${BOOK_CLEAR} 次，这道题会自动移出。</p><button class="btn pri" id="toseq">去顺序练习</button></section>`;
    $('#toseq').onclick=()=>{S.view='seq';save();render();};
    return;
  }
  let pos = Math.min(S.pos.book||0, ids.length-1);
  if(bk.id && ids.indexOf(bk.id)>=0) pos = ids.indexOf(bk.id);
  else if(bk.id && bk.choice!=null){ /* 刚被移出：停在原位置 */ }
  const id = bk.id && (ids.indexOf(bk.id)>=0 || bk.choice!=null) ? bk.id : ids[pos];
  if(id!==bk.id) bk={id, choice:null};
  const q = byId[id], a = S.ans[id]||{};
  const inBook = inBk(id);
  const revealed = bk.choice!=null;
  if(inBook) bk.idx = ids.indexOf(id);
  const shownPos = inBook ? ids.indexOf(id)+1 : Math.max(pos,0)+1;
  const nav = `<button class="btn" id="bprev">← 上一题</button>
    <span class="jump">${shownPos} / ${ids.length}${inBook?'':'（已移出）'}</span>
    <button class="btn pri" id="bnext">下一题 →</button>`;
  $('#main').innerHTML =
    `<div class="bookrow"><div class="sec-h" style="margin:0"><h2>错题本</h2><span class="sub">${ids.length} 道 · 连续答对 ${BOOK_CLEAR} 次自动移出</span></div></div>`
    + qCard(q,{mode:'book', revealed, choice:bk.choice, navHtml:nav, label:`· 错过 ${a.w||0} 次${inBook&&a.s?` · 已连对 ${a.s}/${BOOK_CLEAR}`:''}`})
    + (revealed?expCard(q,bk.choice):'')
    + `<div class="bookrow" style="justify-content:center">${inBook?`<button class="btn ghost" id="bremove">我已掌握，移出错题本</button>`:''}</div>`;
  bindCard(i=>{ if(revealed) return; bk.choice=i; record(q,i,true); save(); render(); scrollExp(); });
  const step=d=>{
    const cur = bookIds();
    if(!cur.length){ bk={id:null,choice:null}; render(); return; }
    let i = cur.indexOf(id);
    if(i<0){ // 当前题刚被移出：下一题就是原位置
      const b = bk.idx||0; i = d>0 ? Math.min(b, cur.length-1) : (b-1+cur.length)%cur.length;
    } else i = (i+d+cur.length)%cur.length;
    S.pos.book=i; bk={id:cur[i], choice:null}; save(); render(); window.scrollTo({top:0});
  };
  $('#bprev').onclick=()=>step(-1); $('#bnext').onclick=()=>step(1);
  const rm=$('#bremove'); if(rm) rm.onclick=()=>{ rmBk(id); if(S.ans[id]){ S.ans[id].s=0; S.ans[id].t=Date.now(); } bk.choice = bk.choice==null? -1 : bk.choice; save(); toast('已移出错题本'); step(1); };
  bookStep = step;
}
let bookStep = null;

// ---------- 模拟考试 ----------
let exam = null; // {ids, cur, picks:{}, start, live, done}
function startExam(){
  const pool = Q.map(q=>q.id);
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  exam = {ids:pool.slice(0,50), cur:0, picks:{}, start:Date.now(), live:true};
  render();
}
let timerInt=null;
function renderExam(){
  clearInterval(timerInt);
  if(!exam){
    const h = (S.exams||[]).slice(-8).reverse();
    $('#main').innerHTML = `<section class="card empty"><div class="big">50 题</div><h2>模拟考试</h2>
      <p>从 567 题里随机抽 50 题，答对 40 题及格（80%），和 NJ MVC 笔试一样。作答时不显示对错，交卷后出分，错题自动进错题本。</p>
      <button class="btn pri" id="estart">开始考试</button>
      ${h.length?`<div class="hist" style="justify-content:center">最近成绩：${h.map(x=>`<span style="color:${x.s>=40?'var(--ok)':'var(--bad)'}">${x.s}/50</span>`).join('')}</div>`:''}</section>`;
    $('#estart').onclick=startExam; return;
  }
  if(exam.live){
    const id = exam.ids[exam.cur], q = byId[id];
    const answered = Object.keys(exam.picks).length;
    const nav = `<button class="btn" id="eprev" ${exam.cur===0?'disabled':''}>← 上一题</button>
      <span class="jump">${exam.cur+1} / 50 · 已答 ${answered}</span>
      ${exam.cur<49?`<button class="btn pri" id="enext">下一题 →</button>`:`<button class="btn pri" id="esubmit">交卷</button>`}`;
    $('#main').innerHTML = `<div class="exam-head"><div class="sec-h" style="margin:0"><h2>模拟考试</h2><span class="sub">第 ${exam.cur+1} 题</span></div><span class="timer" id="etimer"></span></div>`
      + qCard(q,{mode:'exam', revealed:false, choice:exam.picks[id]??null, navHtml:nav, label:''})
      + `<div class="bookrow" style="justify-content:center"><button class="btn" id="esubmit2">交卷（已答 ${answered}/50）</button><button class="btn ghost" id="equit">放弃考试</button></div>`
      + `<section class="card"><div class="grid">${exam.ids.map((x,i)=>`<button class="cell ${exam.picks[x]!=null?'ok':''} ${i===exam.cur?'cur':''}" data-ei="${i}" aria-label="第 ${i+1} 题">${i+1}</button>`).join('')}</div></section>`;
    bindCard(i=>{ exam.picks[id]=i; if(exam.cur<49) exam.cur++; render(); });
    $('#eprev').onclick=()=>{exam.cur--;render();};
    const n=$('#enext'); if(n) n.onclick=()=>{exam.cur++;render();};
    const sub=()=>submitExam();
    const s1=$('#esubmit'); if(s1) s1.onclick=sub; $('#esubmit2').onclick=sub;
    $('#equit').onclick=()=>{ if($('#equit').dataset.c){ exam=null; render(); } else { $('#equit').dataset.c=1; $('#equit').textContent='再点一次确认放弃'; } };
    document.querySelectorAll('[data-ei]').forEach(b=>b.onclick=()=>{exam.cur=+b.dataset.ei;render();});
    const tick=()=>{const s=Math.floor((Date.now()-exam.start)/1000); const el=$('#etimer'); if(el) el.textContent=`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;};
    tick(); timerInt=setInterval(tick,1000);
    return;
  }
  // 结果
  const r = exam.result;
  const wrong = exam.ids.filter(id=>exam.picks[id]!==byId[id].a);
  $('#main').innerHTML = `<section class="card empty"><div class="score ${r.s>=40?'pass':'fail'}">${r.s}<small style="font-size:20px;color:var(--muted)"> / 50</small></div>
    <h2>${r.s>=40?'及格了':'没有及格'}</h2><p>用时 ${Math.round(r.sec/60)} 分钟。${wrong.length?`错的 ${wrong.length} 道已放进错题本，解析在下面。`:'全对！'}</p>
    <button class="btn pri" id="eagain">再考一次</button> ${wrong.length?`<button class="btn" id="etobook">去错题本</button>`:''}</section>`
    + wrong.map(id=>{const q=byId[id]; return qCard(q,{mode:'exam',revealed:true,choice:exam.picks[id]??-1,label:''}).replace('id="qcard"','') + expCard(q, exam.picks[id]??-1).replace('id="expcard"','');}).join('');
  $('#eagain').onclick=startExam;
  const tb=$('#etobook'); if(tb) tb.onclick=()=>{exam=null;S.view='book';bk={id:null,choice:null};save();render();};
}
function submitExam(){
  let s=0;
  exam.ids.forEach(id=>{ const p=exam.picks[id]; const q=byId[id];
    if(p==null){ addBk(id); const a=S.ans[id]||{n:0,w:0,s:0}; a.w=(a.w||0)+1; a.s=0; a.n=(a.n||0)+1; a.ok=0; a.c=-1; a.t=Date.now(); S.ans[id]=a; }
    else if(record(q,p,false)) s++; });
  const sec=Math.round((Date.now()-exam.start)/1000);
  exam.live=false; exam.result={s,sec};
  S.exams=(S.exams||[]).concat([{s,at:Date.now(),sec}]).slice(-30);
  save(); render(); window.scrollTo({top:0});
}

// ---------- 进度总览 ----------
let mapF = {q:'', t:'', st:''};
function cellState(id){ const a=S.ans[id]; if(!a) return ''; if(inBk(id)) return a.ok?'fixed':'no'; return a.ok?'ok':'no'; }
function renderMap(){
  const st = stats();
  const tl = Object.keys(TOP).filter(t=>Q.some(q=>q.t.includes(t)));
  const trows = tl.map(t=>{ const qs=Q.filter(q=>q.t.includes(t)); let ok=0,no=0; qs.forEach(q=>{const a=S.ans[q.id]; if(a) a.ok?ok++:no++;});
    return {t, n:qs.length, ok, no}; }).sort((a,b)=>b.n-a.n);
  const ex = (S.exams||[]).slice(-10).reverse();
  $('#main').innerHTML = `<section class="card">
      <div class="sec-h"><h2>567 题进度</h2><span class="sub">点格子直接跳到那道题</span></div>
      <div class="legend"><span><i style="background:var(--cell-new)"></i>未做</span><span><i style="background:var(--ok)"></i>答对</span><span><i style="background:var(--bad)"></i>答错（在错题本）</span><span><i style="background:var(--ok-soft);box-shadow:inset 0 0 0 1.5px var(--bad)"></i>错题本中、最近答对</span></div>
      <div class="filters">
        <input id="fq" type="search" placeholder="搜题目或选项（中/英）" value="${esc(mapF.q)}" aria-label="搜索题目">
        <select id="ft" aria-label="按分类"><option value="">全部分类</option>${trows.map(r=>`<option value="${r.t}" ${mapF.t===r.t?'selected':''}>${esc(topicName(r.t))}（${r.n}）</option>`).join('')}</select>
        <select id="fs" aria-label="按状态"><option value="">全部状态</option><option value="new" ${mapF.st==='new'?'selected':''}>未做</option><option value="ok" ${mapF.st==='ok'?'selected':''}>答对</option><option value="no" ${mapF.st==='no'?'selected':''}>在错题本</option><option value="img" ${mapF.st==='img'?'selected':''}>带图片</option><option value="cm" ${mapF.st==='cm'?'selected':''}>易错题</option><option value="flag" ${mapF.st==='flag'?'selected':''}>题目可能有误</option></select>
      </div>
      <div class="grid" id="mgrid">${Q.map(q=>`<button class="cell ${cellState(q.id)} ${q.id===S.pos.seq?'cur':''}" data-id="${q.id}" aria-label="第 ${q.id} 题">${q.id}</button>`).join('')}</div>
      <div class="results" id="mres"></div>
    </section>
    <section class="card"><div class="sec-h"><h2>分类掌握情况</h2><span class="sub">点分类筛选上面的格子</span></div>
      <div class="topics">${trows.map(r=>`<button class="trow" data-t="${r.t}"><span>${esc(topicName(r.t))} <span style="color:var(--muted)">${r.n}</span></span><span class="tb"><i style="width:${r.ok/r.n*100}%;background:var(--ok)"></i><i style="width:${r.no/r.n*100}%;background:var(--bad)"></i></span><span class="tp">${r.ok+r.no?Math.round(r.ok/(r.ok+r.no)*100)+'%':'–'}</span></button>`).join('')}</div>
    </section>
    <section class="card"><div class="sec-h"><h2>模拟考试记录</h2></div>${ex.length?`<div class="hist">${ex.map(x=>`<span style="color:${x.s>=40?'var(--ok)':'var(--bad)'}">${x.s}/50 · ${new Date(x.at).toLocaleDateString('zh-CN',{month:'numeric',day:'numeric'})}</span>`).join('')}</div>`:'<p style="color:var(--muted);margin:0">还没考过。</p>'}</section>
    <section class="card"><div class="sec-h"><h2>备份与换设备</h2><span class="sub">导出进度文件，在另一台设备上导入后按题合并</span></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="exp">导出进度</button><label class="btn" style="cursor:pointer">导入进度<input type="file" id="imp" accept="application/json,.json" hidden></label></div></section>
    <section class="card"><div class="sec-h"><h2>重置</h2><span class="sub">清空所有作答记录和错题本</span></div><button class="btn" id="reset">重置全部进度</button></section>`;
  const apply=()=>{
    const qq=mapF.q.trim().toLowerCase(); let shown=[];
    Q.forEach(q=>{ const el=document.querySelector(`#mgrid [data-id="${q.id}"]`); let ok=true;
      if(mapF.t && !q.t.includes(mapF.t)) ok=false;
      const cs=cellState(q.id);
      if(mapF.st==='new' && S.ans[q.id]) ok=false;
      if(mapF.st==='ok' && cs!=='ok') ok=false;
      if(mapF.st==='no' && !inBk(q.id)) ok=false;
      if(mapF.st==='img' && !q.img) ok=false;
      if(mapF.st==='cm' && !q.cm) ok=false;
      if(mapF.st==='flag' && !q.flag) ok=false;
      if(qq && !(q.en+' '+q.zh+' '+q.oe.join(' ')+' '+q.oz.join(' ')+' '+q.id).toLowerCase().includes(qq)) ok=false;
      el.classList.toggle('hide',!ok); if(ok) shown.push(q); });
    const res=$('#mres');
    if(qq || mapF.st==='flag'){ res.innerHTML = shown.slice(0,40).map(q=>`<button class="res" data-id="${q.id}"><span class="rn">${q.id}</span><span class="rt">${esc(q.en||q.zh)}${q.zh&&q.en?` <span style="color:var(--muted)">${esc(q.zh)}</span>`:''}<div class="ra">答案 ${L[q.a]}：${esc(q.oe[q.a]||q.oz[q.a])}</div></span></button>`).join('') + (shown.length>40?`<p class="hint">还有 ${shown.length-40} 条，换个关键词缩小范围</p>`:'') + (!shown.length?'<p class="hint">没有匹配的题</p>':''); res.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>jumpTo(+b.dataset.id)); }
    else res.innerHTML='';
  };
  apply();
  $('#fq').oninput=e=>{mapF.q=e.target.value;apply();};
  $('#ft').onchange=e=>{mapF.t=e.target.value;apply();};
  $('#fs').onchange=e=>{mapF.st=e.target.value;apply();};
  document.querySelectorAll('#mgrid [data-id]').forEach(b=>b.onclick=()=>jumpTo(+b.dataset.id));
  document.querySelectorAll('.trow').forEach(b=>b.onclick=()=>{mapF.t=b.dataset.t;$('#ft').value=mapF.t;apply();$('#mgrid').scrollIntoView({behavior:'smooth',block:'start'});});
  $('#exp').onclick=exportProgress;
  $('#imp').onchange=e=>{ const f=e.target.files[0]; if(f) importProgress(f); e.target.value=''; };
  $('#reset').onclick=()=>{ const b=$('#reset'); if(!b.dataset.c){b.dataset.c=1;b.textContent='确定清空？再点一次';return;} S=Object.assign(blank(),{lang:S.lang, reset:Date.now()}); save(); toast('进度已清空'); render(); };
}
function jumpTo(id){ S.view='seq'; S.pos.seq=id; seqRedo=false; save(); render(); window.scrollTo({top:0}); }

// ---------- router ----------
function render(){
  renderHeader();
  if(S.view==='book') renderBook();
  else if(S.view==='exam') renderExam();
  else if(S.view==='map') renderMap();
  else renderSeq();
}
document.addEventListener('keydown',e=>{
  if(e.target.matches('input,select,textarea')||e.metaKey||e.ctrlKey||e.altKey) return;
  const k=e.key.toLowerCase();
  const idx = {'1':0,'2':1,'3':2,'4':3,'a':0,'b':1,'c':2,'d':3}[k];
  if(idx!=null){ const b=document.querySelector(`#qcard .opt[data-o="${idx}"]:not(:disabled)`); if(b){b.click(); e.preventDefault();} return; }
  if(k==='arrowright'||k==='enter'){ const b=$('#next')||$('#bnext')||$('#enext'); if(b&&!b.disabled){b.click();e.preventDefault();} }
  if(k==='arrowleft'){ const b=$('#prev')||$('#bprev')||$('#eprev'); if(b&&!b.disabled){b.click();e.preventDefault();} }
});
applyLang(); render();
})();
