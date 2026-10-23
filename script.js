const START=100000,FEE=.001;
const AS=[{s:'BTC',n:'Bitcoin',p:67250,v:.0009},{s:'ETH',n:'Ethereum',p:3480,v:.0011},{s:'SOL',n:'Solana',p:172.4,v:.0016},{s:'AAPL',n:'Apple Inc.',p:228.6,v:.0005},{s:'TSLA',n:'Tesla Inc.',p:248.3,v:.0011},{s:'NVDA',n:'NVIDIA Corp.',p:138.2,v:.001},{s:'EUR/USD',n:'Euro / americký dolar',p:1.0842,v:.00022}];
const TF={'5s':5,'15s':15,'1m':60,'5m':300};
const $=id=>document.getElementById(id);
const dec=p=>p<2?5:p<1000?2:2;
const f=(n,d=2)=>n.toLocaleString('cs-CZ',{minimumFractionDigits:d,maximumFractionDigits:d});
const usd=n=>f(n)+' $';
const rn=()=>{let u=0;for(let i=0;i<4;i++)u+=Math.random();return (u-2)*1.7};
let S={cash:START,pos:{},orders:[],hist:[]};
try{const r=localStorage.getItem('parity-v1');if(r)S=JSON.parse(r)}catch(e){}
const save=()=>{try{localStorage.setItem('parity-v1',JSON.stringify(S))}catch(e){}};
let cur='BTC',tf='1m',side='buy',otype='market',tab='pos',mouse=null;
const P={},O={},C={},ticks={};
AS.forEach(a=>{P[a.s]=a.p;O[a.s]=a.p;C[a.s]={};ticks[a.s]={};
  for(const k in TF){const n=TF[k];let p=a.p,arr=[];
    for(let i=0;i<140;i++){const o=p;let h=o,l=o,c=o;for(let j=0;j<4;j++){c*=1+a.v*Math.sqrt(n/4)*rn()*.9;h=Math.max(h,c);l=Math.min(l,c)}p=c;arr.push({o,h,l,c,v:Math.random()*100+20})}
    const k2=a.p/p;arr.forEach(x=>{x.o*=k2;x.h*=k2;x.l*=k2;x.c*=k2});C[a.s][k]=arr;ticks[a.s][k]=0}});
function tick(){AS.forEach(a=>{const old=P[a.s];let p=old*(1+a.v*rn()+(O[a.s]-old)/old*.0005);P[a.s]=p;
  for(const k in TF){const arr=C[a.s][k],c=arr[arr.length-1];c.c=p;c.h=Math.max(c.h,p);c.l=Math.min(c.l,p);c.v+=Math.random()*3;
    if(++ticks[a.s][k]>=TF[k]){ticks[a.s][k]=0;arr.push({o:p,h:p,l:p,c:p,v:1});arr.shift()}}});
  fillLimits();render(true)}
function fillLimits(){const left=[];S.orders.forEach(o=>{const p=P[o.sym];const hit=o.side==='buy'?p<=o.price:p>=o.price;if(hit)exec(o.side,o.sym,o.qty,o.price,'Limitní',true);else left.push(o)});if(left.length!==S.orders.length){S.orders=S.orders.filter(o=>left.includes(o));save()}}
function exec(sd,sym,q,price,type,quiet){const val=q*price,fee=val*FEE;
  if(sd==='buy'){if(val+fee>S.cash+1e-6){if(!quiet)toast('Nedostatek hotovosti');return false}
    S.cash-=val+fee;const p=S.pos[sym]||{q:0,avg:0};p.avg=(p.avg*p.q+val)/(p.q+q);p.q+=q;S.pos[sym]=p}
  else{const p=S.pos[sym];if(!p||p.q<q-1e-9){if(!quiet)toast('Nemáte dost k prodeji');return false}
    S.cash+=val-fee;p.q-=q;if(p.q<1e-9)delete S.pos[sym]}
  S.hist.unshift({t:Date.now(),sym,side:sd,type,q,price,fee});S.hist=S.hist.slice(0,100);save();
  toast((sd==='buy'?'Koupeno ':'Prodáno ')+f(q,4)+' '+sym+' za '+f(price,dec(price)));return true}
function equity(){let e=S.cash;for(const s in S.pos)e+=S.pos[s].q*P[s];return e}
let tt;function toast(m){const t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),2400)}
const cls=n=>n>=0?'up':'down',sg=n=>(n>=0?'+':'')+f(n);
function render(live){
  const e=equity();$('eq').textContent=usd(e);$('cash').textContent=usd(S.cash);
  const pl=e-START;$('pl').innerHTML=`<span class="${cls(pl)}">${sg(pl)} $ (${sg(pl/START*100)} %)</span>`;
  $('wl').innerHTML=AS.map(a=>{const ch=(P[a.s]/O[a.s]-1)*100;return `<button class="wrow ${a.s===cur?'on':''}" data-s="${a.s}"><b>${a.s}</b><span>${f(P[a.s],dec(P[a.s]))}</span><small>${a.n}</small><small class="${cls(ch)}">${sg(ch)} %</small></button>`}).join('');
  const a=AS.find(x=>x.s===cur),p=P[cur],ch=(p/O[cur]-1)*100;
  $('csym').textContent=cur+' / USD';$('cname').textContent=a.n;
  $('cpx').innerHTML=`<span class="${cls(ch)}">${f(p,dec(p))}</span>`;$('cch').innerHTML=`<span class="${cls(ch)}">${sg(ch)} %</span>`;
  $('qu').textContent=cur==='EUR/USD'?'EUR':cur;
  draw();book();form();table()}
function draw(){const cv=$('cv'),w=cv.clientWidth,h=cv.clientHeight,d=devicePixelRatio||1;
  if(cv.width!==w*d||cv.height!==h*d){cv.width=w*d;cv.height=h*d}
  const x=cv.getContext('2d');x.setTransform(d,0,0,d,0,0);x.clearRect(0,0,w,h);
  const st=getComputedStyle(document.documentElement),up=st.getPropertyValue('--up').trim(),dn=st.getPropertyValue('--down').trim(),gr=st.getPropertyValue('--grid').trim(),mu=st.getPropertyValue('--mute').trim(),tx=st.getPropertyValue('--text').trim(),ac=st.getPropertyValue('--acc').trim();
  const R=64,B=26,T=34,cw=w-R,vh=h-B-T;const cs=C[cur][tf];const n=Math.min(cs.length,Math.floor(cw/9));const v=cs.slice(-n);
  let hi=-1e99,lo=1e99,vm=0;v.forEach(c=>{hi=Math.max(hi,c.h);lo=Math.min(lo,c.l);vm=Math.max(vm,c.v)});const pad=(hi-lo)*.1||hi*.001;hi+=pad;lo-=pad;
  const Y=p=>T+(hi-p)/(hi-lo)*vh*.82,step=cw/n,dc=dec(P[cur]);
  x.font='11px Manrope,sans-serif';x.lineWidth=1;
  for(let i=0;i<=5;i++){const y=T+i*(vh*.82)/5;x.strokeStyle=gr;x.beginPath();x.moveTo(0,y);x.lineTo(cw,y);x.stroke();x.fillStyle=mu;x.textAlign='left';x.fillText(f(hi-(hi-lo)*i/5,dc),cw+8,y+4)}
  for(let i=0;i<7;i++){const xx=i*cw/7;x.strokeStyle=gr;x.beginPath();x.moveTo(xx,T);x.lineTo(xx,h-B);x.stroke()}
  v.forEach((c,i)=>{const xx=i*step+step/2,col=c.c>=c.o?up:dn;x.fillStyle=col;x.strokeStyle=col;
    x.globalAlpha=.25;const vhh=c.v/vm*vh*.16;x.fillRect(xx-step*.35,h-B-vhh,step*.7,vhh);x.globalAlpha=1;
    x.beginPath();x.moveTo(xx,Y(c.h));x.lineTo(xx,Y(c.l));x.stroke();
    const y1=Y(c.o),y2=Y(c.c);x.fillRect(xx-step*.32,Math.min(y1,y2),step*.64,Math.max(1,Math.abs(y1-y2)))});
  const pos=S.pos[cur];if(pos){const y=Y(pos.avg);x.setLineDash([2,4]);x.strokeStyle=ac;x.beginPath();x.moveTo(0,y);x.lineTo(cw,y);x.stroke();x.setLineDash([]);x.fillStyle=ac;x.fillText('Vstup '+f(pos.avg,dc),6,y-5)}
  const lp=P[cur],ly=Y(lp),col=lp>=v[v.length-1].o?up:dn;x.setLineDash([4,3]);x.strokeStyle=col;x.beginPath();x.moveTo(0,ly);x.lineTo(cw,ly);x.stroke();x.setLineDash([]);
  x.fillStyle=col;x.fillRect(cw,ly-10,R,20);x.fillStyle='#fff';x.font='600 11px Manrope,sans-serif';x.fillText(f(lp,dc),cw+6,ly+4);
  let c=v[v.length-1];
  if(mouse&&mouse.x<cw){const i=Math.min(n-1,Math.max(0,Math.floor(mouse.x/step)));c=v[i];x.strokeStyle=mu;x.setLineDash([3,3]);x.beginPath();x.moveTo(mouse.x,T);x.lineTo(mouse.x,h-B);x.moveTo(0,mouse.y);x.lineTo(cw,mouse.y);x.stroke();x.setLineDash([]);
    const pv=hi-(mouse.y-T)/(vh*.82)*(hi-lo);x.fillStyle=tx;x.fillRect(cw,mouse.y-10,R,20);x.fillStyle='#0a1114';x.fillText(f(pv,dc),cw+6,mouse.y+4)}
  $('tip').innerHTML=`<span>O <b style="color:${tx}">${f(c.o,dc)}</b></span><span>H <b style="color:${tx}">${f(c.h,dc)}</b></span><span>L <b style="color:${tx}">${f(c.l,dc)}</b></span><span>C <b style="color:${tx}">${f(c.c,dc)}</b></span>`}
function book(){const p=P[cur],dc=dec(p),sp=p*.0002,rows=(s)=>Array.from({length:8},(_,i)=>{const pr=p+s*sp*(i+1),q=Math.random()*(cur==='BTC'?2:cur==='EUR/USD'?90000:60)+.1;return {pr,q,w:Math.random()*100}});
  const asks=rows(1).reverse(),bids=rows(-1);
  const h=(r,c)=>r.map(x=>`<div class="ol"><span class="${c}">${f(x.pr,dc)}</span><span>${f(x.q,cur==='EUR/USD'?0:3)}</span><span>${f(x.pr*x.q,0)}</span><i style="width:${x.w}%;background:var(--${c})"></i></div>`).join('');
  $('asks').innerHTML=h(asks,'down');$('bids').innerHTML=h(bids,'up');
  const ch=(p/O[cur]-1)*100;$('mid').innerHTML=`<span class="${cls(ch)}">${f(p,dc)}</span>`}
function price(){return otype==='limit'&&+$('lim').value>0?+$('lim').value:P[cur]}
function form(){const q=+$('qty').value||0,pr=price(),v=q*pr,fe=v*FEE;
  $('avail').textContent=side==='buy'?usd(S.cash):f(S.pos[cur]?S.pos[cur].q:0,4)+' '+cur;
  $('fee').textContent=usd(fe);$('tot').textContent=usd(side==='buy'?v+fe:v-fe);
  const g=$('go');g.className='go '+side;g.textContent=(side==='buy'?'Koupit ':'Prodat ')+cur}
function table(){const el=$('tbl');
  $('tabs').innerHTML=[['pos','Otevřené pozice ('+Object.keys(S.pos).length+')'],['ord','Čekající příkazy ('+S.orders.length+')'],['his','Historie']].map(([k,t])=>`<button class="${tab===k?'on':''}" data-t="${k}">${t}</button>`).join('');
  let h='';
  if(tab==='pos'){const k=Object.keys(S.pos);h=k.length?`<table><tr><th>Trh</th><th>Množství</th><th>Vstupní cena</th><th>Aktuální cena</th><th>Hodnota</th><th>Zisk / ztráta</th><th></th></tr>${k.map(s=>{const p=S.pos[s],v=p.q*P[s],pl=v-p.q*p.avg;return `<tr><td><b>${s}</b></td><td>${f(p.q,4)}</td><td>${f(p.avg,dec(p.avg))}</td><td>${f(P[s],dec(P[s]))}</td><td>${usd(v)}</td><td class="${cls(pl)}">${sg(pl)} $ (${sg(pl/(p.q*p.avg)*100)} %)</td><td><button class="xbtn" data-close="${s}">Zavřít</button></td></tr>`}).join('')}</table>`:'<div class="empty">Zatím nemáte žádnou pozici. Zadejte množství vpravo a klikněte na Koupit.</div>'}
  if(tab==='ord')h=S.orders.length?`<table><tr><th>Trh</th><th>Strana</th><th>Množství</th><th>Limitní cena</th><th></th></tr>${S.orders.map((o,i)=>`<tr><td><b>${o.sym}</b></td><td class="${o.side==='buy'?'up':'down'}">${o.side==='buy'?'Nákup':'Prodej'}</td><td>${f(o.qty,4)}</td><td>${f(o.price,dec(o.price))}</td><td><button class="xbtn" data-cancel="${i}">Zrušit</button></td></tr>`).join('')}</table>`:'<div class="empty">Žádné čekající příkazy.</div>';
  if(tab==='his')h=S.hist.length?`<table><tr><th>Čas</th><th>Trh</th><th>Strana</th><th>Typ</th><th>Množství</th><th>Cena</th><th>Poplatek</th></tr>${S.hist.map(o=>`<tr><td>${new Date(o.t).toLocaleTimeString('cs-CZ')}</td><td><b>${o.sym}</b></td><td class="${o.side==='buy'?'up':'down'}">${o.side==='buy'?'Nákup':'Prodej'}</td><td>${o.type}</td><td>${f(o.q,4)}</td><td>${f(o.price,dec(o.price))}</td><td>${usd(o.fee)}</td></tr>`).join('')}</table>`:'<div class="empty">Historie obchodů je prázdná.</div>';
  if(el.dataset.k!==h){el.dataset.k=h;el.innerHTML=h}}
$('tfs').innerHTML=Object.keys(TF).map(k=>`<button data-f="${k}" class="${k===tf?'on':''}">${k}</button>`).join('');
document.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;
  if(t.dataset.s&&t.classList.contains('wrow')){cur=t.dataset.s;$('qty').value='';$('lim').value='';render()}
  else if(t.dataset.f){tf=t.dataset.f;document.querySelectorAll('#tfs button').forEach(b=>b.classList.toggle('on',b===t));draw()}
  else if(t.closest('.sw')){side=t.dataset.s;document.querySelectorAll('.sw button').forEach(b=>b.classList.toggle('on',b===t));form()}
  else if(t.closest('.otype')){otype=t.dataset.t;document.querySelectorAll('.otype button').forEach(b=>b.classList.toggle('on',b===t));$('limwrap').hidden=otype!=='limit';if(otype==='limit'&&!$('lim').value)$('lim').value=P[cur].toFixed(dec(P[cur]));form()}
  else if(t.dataset.p){const pc=+t.dataset.p/100,pr=price();let q=side==='buy'?S.cash*pc/(pr*(1+FEE)):(S.pos[cur]?S.pos[cur].q*pc:0);$('qty').value=q?+q.toFixed(6):'';form()}
  else if(t.id==='go'){const q=+$('qty').value;if(!(q>0))return toast('Zadejte množství');
    if(otype==='market')exec(side,cur,q,P[cur],'Tržní');else{const pr=+$('lim').value;if(!(pr>0))return toast('Zadejte limitní cenu');S.orders.push({sym:cur,side,qty:q,price:pr});save();toast('Limitní příkaz zadán');tab='ord'}
    $('qty').value='';render()}
  else if(t.dataset.close){const s=t.dataset.close;exec('sell',s,S.pos[s].q,P[s],'Tržní');render()}
  else if(t.dataset.cancel){S.orders.splice(+t.dataset.cancel,1);save();render()}
  else if(t.closest('#tabs')){tab=t.dataset.t;table()}
  else if(t.id==='reset'){if(confirm('Smazat všechny obchody a vrátit se na '+usd(START)+'?')){S={cash:START,pos:{},orders:[],hist:[]};save();render();toast('Účet obnoven')}}
  else if(t.id==='theme'){const r=document.documentElement,dark=getComputedStyle(r).colorScheme==='dark';r.dataset.theme=dark?'light':'dark';draw()}});
['qty','lim'].forEach(i=>$(i).addEventListener('input',form));
const cv=$('cv');cv.addEventListener('mousemove',e=>{const r=cv.getBoundingClientRect();mouse={x:e.clientX-r.left,y:e.clientY-r.top};draw()});
cv.addEventListener('mouseleave',()=>{mouse=null;draw()});
addEventListener('resize',draw);
render();setInterval(tick,1000);
