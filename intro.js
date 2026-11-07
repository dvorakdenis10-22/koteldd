// Grand Theft Kotlik: menu jako PlayStation 4 -> Start -> EPICKÉ intro -> Play (+ celá obrazovka)
// Hra se nespustí, dokud neprojdeš menu i intro: na Play se pošle událost "kotlik:play", na kterou čeká game.js.
(() => {
  const intro = document.getElementById('g-intro'), box = document.querySelector('.game-box');
  if (!intro || !box) return;
  const $ = s => intro.querySelector(s);

  /* =====================================================================
     ZVUKY: sem vlož cesty ke svým souborům. Prázdný řetězec = syntetický zvuk (WebAudio),
     takže intro hraje i bez jediného souboru.
     ===================================================================== */
  const SND = {
    music: '',     // hudba na pozadí celého intra (loop), např. 'audio/intro-theme.mp3'
    riser: '',     // narůstající napětí (cca 3 s)
    boom: '',      // velký dunivý úder (logo, titulek)
    hit: '',       // menší úder (panely)
    whoosh: '',    // prolet / přechod scén
    engine: '',    // motor / zvýšení otáček
    stinger: '',   // akord při titulku
    tick: '',      // psaní textu
    nav: ''        // pohyb v menu
  };

  /* ---------- fullscreen ---------- */
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
  let pseudo = false;   // záložní režim (iOS Safari neumí fullscreen pro prvky)
  async function enterFs() {
    box.classList.add('pfs');
    try {
      if (box.requestFullscreen) await box.requestFullscreen();
      else if (box.webkitRequestFullscreen) box.webkitRequestFullscreen();
      else { pseudo = true; document.documentElement.style.overflow = 'hidden'; }
    } catch (e) { pseudo = true; document.documentElement.style.overflow = 'hidden'; }
    try { await screen.orientation.lock('landscape'); } catch (e) { }
  }
  function exitFs() {
    if (fsEl()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    pseudo = false; box.classList.remove('pfs'); document.documentElement.style.overflow = '';
    try { screen.orientation.unlock(); } catch (e) { }
  }
  const toggleFs = () => box.classList.contains('pfs') ? exitFs() : enterFs();
  const onFsChange = () => { if (!fsEl() && !pseudo) { box.classList.remove('pfs'); document.documentElement.style.overflow = ''; } };
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);
  document.getElementById('g-fs').addEventListener('click', toggleFs);

  let inView = false;
  new IntersectionObserver(e => { inView = e[0].isIntersecting && e[0].intersectionRatio >= .5; }, { threshold: [0, .5, 1] }).observe(box);

  /* ---------- stav ---------- */
  let state = 'menu';   // menu -> intro -> done
  let timers = [], loading = false, fast = false, muted = false;
  const at = (f, ms) => { const t = setTimeout(f, ms); timers.push(t); return t; };
  const show = n => {
    intro.querySelectorAll('.ge-scene').forEach(e => e.classList.toggle('on', e.dataset.s === n));
    intro.classList.toggle('t', n === 'title');
  };

  /* =====================================================================
     AUDIO ENGINE (WebAudio syntezátor + přehrávání vlastních souborů)
     ===================================================================== */
  let ac = null, master, lp, noiseBuf, bedStop = null, musicEl = null;
  function audio() {
    if (ac) return ac;
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      const comp = ac.createDynamicsCompressor();
      master = ac.createGain(); master.gain.value = muted ? 0 : .85;
      master.connect(comp); comp.connect(ac.destination);
      lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400; lp.connect(master);
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ac = null; }
    if (ac && ac.state === 'suspended') ac.resume();
    return ac;
  }
  function osc(type, f0, f1, dur, vol, delay = 0, out = master, att) {
    const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (att || Math.min(.02, dur / 4)));
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + .05);
  }
  function noise(dur, ft, f0, f1, vol, delay = 0, swell) {
    const t = ac.currentTime + delay, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; s.loop = true; f.type = ft;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (swell || dur * .1));
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + .05);
  }
  const S = {
    boom() { osc('sine', 150, 30, 1.6, 1); noise(1.8, 'lowpass', 2600, 50, .9, 0, .02); },
    hit() { osc('sine', 240, 50, .3, .9); noise(.3, 'bandpass', 2500, 300, .45, 0, .01); },
    whoosh() { noise(1.2, 'bandpass', 250, 5500, .45, 0, .8); },
    riser() { osc('sawtooth', 55, 1100, 3.2, .1, 0, lp, 3); noise(3.2, 'highpass', 300, 8000, .3, 0, 3); },
    tick() { osc('square', 1900, 1600, .05, .05); },
    nav() { osc('sine', 800, 1300, .09, .08); },
    stinger() { [110, 164.8, 220, 277.2, 329.6, 440].forEach((f, i) => osc('sawtooth', f, f, 3.4, .08, i * .04, lp, .03)); },
    engine() {
      const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
      o.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 700;
      o.frequency.setValueAtTime(45, t); o.frequency.exponentialRampToValueAtTime(190, t + 1.1); o.frequency.exponentialRampToValueAtTime(70, t + 1.9);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.35, t + .3); g.gain.exponentialRampToValueAtTime(.0001, t + 2);
      o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t + 2.1);
    }
  };
  function sfx(n) {
    if (muted) return;
    if (SND[n]) { try { const a = new Audio(SND[n]); a.play().catch(() => { }); } catch (e) { } return; }
    if (audio() && S[n]) S[n]();
  }
  function bed() {   // hudba / hluboké pozadí, které se celé intro stupňuje
    if (SND.music) { musicEl = new Audio(SND.music); musicEl.loop = true; musicEl.muted = muted; musicEl.play().catch(() => { }); return; }
    if (!audio()) return;
    const t = ac.currentTime, g = ac.createGain(), f = ac.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.setValueAtTime(100, t); f.frequency.exponentialRampToValueAtTime(1400, t + 12);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.3, t + 6);
    f.connect(g); g.connect(master);
    const os = [55, 55.35, 82.4, 110.5].map(fr => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.connect(f); o.start(t); return o; });
    bedStop = () => { const n = ac.currentTime; g.gain.cancelScheduledValues(n); g.gain.setValueAtTime(Math.max(.0001, g.gain.value), n); g.gain.exponentialRampToValueAtTime(.0001, n + 1.4); os.forEach(o => o.stop(n + 1.5)); };
  }
  function stopBed() {
    if (bedStop) { bedStop(); bedStop = null; }
    if (musicEl) { const m = musicEl; musicEl = null; const iv = setInterval(() => { m.volume = Math.max(0, m.volume - .08); if (m.volume <= 0) { m.pause(); clearInterval(iv); } }, 100); }
  }

  /* =====================================================================
     VIZUÁLNÍ FX: částice (jiskry, žhavé uhlíky), šoková vlna, záblesk, třes kamery
     ===================================================================== */
  const fx = document.createElement('canvas'); fx.className = 'ge-fx'; intro.appendChild(fx);
  const fc = fx.getContext('2d'); let ps = [], fxOn = false, ember = 0;
  const fxSize = () => { fx.width = fx.clientWidth || 960; fx.height = fx.clientHeight || 540; };
  fxSize(); if (window.ResizeObserver) new ResizeObserver(fxSize).observe(fx);
  function burst(px, py, n, hue, spd) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, v = (.3 + Math.random()) * spd;
      ps.push({ x: px * fx.width, y: py * fx.height, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: 1, d: .008 + Math.random() * .02, r: 1 + Math.random() * 2.5, h: hue + Math.random() * 30, g: .06 });
    }
  }
  function fxLoop() {
    if (!fxOn) return;
    fc.clearRect(0, 0, fx.width, fx.height); fc.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 3; k++) if (Math.random() < ember) ps.push({ x: Math.random() * fx.width, y: fx.height + 5, vx: (Math.random() - .5) * .6, vy: -1 - Math.random() * 2, l: 1, d: .004 + Math.random() * .006, r: .8 + Math.random() * 2, h: 20 + Math.random() * 25, g: -.005 });
    ps = ps.filter(p => p.l > 0);
    const sc = fx.width / 960;
    for (const p of ps) {
      p.x += p.vx; p.y += p.vy; p.vy += p.g; p.l -= p.d;
      fc.fillStyle = 'hsla(' + p.h + ',100%,60%,' + Math.max(0, p.l) + ')';
      fc.beginPath(); fc.arc(p.x, p.y, p.r * sc, 0, 6.283); fc.fill();
    }
    requestAnimationFrame(fxLoop);
  }
  const tmp = (cls, css, ms) => { const d = document.createElement('div'); d.className = cls; if (css) d.style.cssText = css; intro.appendChild(d); setTimeout(() => d.remove(), ms); };
  function shake(big) { intro.classList.remove('shk', 'shk2'); void intro.offsetWidth; intro.classList.add(big ? 'shk2' : 'shk'); }
  function impact(x, y, big) {   // záblesk + šoková vlna + třes + jiskry + zvuk
    tmp('ge-bang', '', 900); tmp('ge-ring', 'left:' + x + '%;top:' + y + '%', 1300);
    shake(big); burst(x / 100, y / 100, big ? 170 : 70, big ? 320 : 25, big ? 9 : 6); sfx(big ? 'boom' : 'hit');
  }

  /* ---------- fotky Oktávek z webu se použijí v menu i v intru ---------- */
  const photoUrl = name => {
    const img = document.querySelector('img[data-photo="' + name + '"]');
    const s = img && img.getAttribute('src');
    return s ? 'url("' + s + '")' : null;
  };
  const uO = photoUrl('oktavka'), uW = photoUrl('wolt');
  if (uO) intro.style.setProperty('--o', uO);
  if (uW) intro.style.setProperty('--w', uW);

  /* ---------- hodiny ---------- */
  const clock = $('#gi-clock');
  const tick = () => { const d = new Date(); clock.textContent = d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); };
  tick(); setInterval(tick, 20000);

  /* ---------- plovoucí tečky na pozadí menu (jako PS4) ---------- */
  const cvd = $('#gi-dots'), cx = cvd.getContext('2d');
  let W = 960, H = 540, dots = [];
  const sizeDots = () => { W = cvd.width = cvd.clientWidth || 960; H = cvd.height = cvd.clientHeight || 540; };
  const mkDot = fresh => {
    const y = H * (.3 + Math.pow(Math.random(), .55) * .72);
    return { x: Math.random() * W * (fresh ? 1 : .2) + (fresh ? 0 : -20), y, r: .8 + Math.random() * 3.2, vx: .08 + Math.random() * .22, vy: -.03 - Math.random() * .08,
      a: .25 + Math.random() * .6, p: Math.random() * 6.28, c: Math.random() < .6 ? '120,200,230' : '170,225,245', sq: .55 + Math.random() * .35 };
  };
  sizeDots();
  if (window.ResizeObserver) new ResizeObserver(sizeDots).observe(cvd);
  for (let i = 0; i < 90; i++) dots.push(mkDot(true));
  function drawDots(t) {
    cx.clearRect(0, 0, W, H);
    for (const d of dots) {
      d.x += d.vx; d.y += d.vy;
      if (d.x > W + 10 || d.y < -10) Object.assign(d, mkDot(false));
      const k = d.a * (.6 + .4 * Math.sin(t / 900 + d.p)), s = W / 960;
      cx.fillStyle = 'rgba(' + d.c + ',' + k + ')';
      cx.beginPath(); cx.ellipse(d.x, d.y, d.r * s, d.r * d.sq * s, -.5, 0, 6.283); cx.fill();
    }
    if (state === 'menu') requestAnimationFrame(drawDots);
  }
  requestAnimationFrame(drawDots);

  /* ---------- menu: řada dlaždic, vybraná se zvětší a řada se posune ---------- */
  const row = $('#gi-row'), tiles = [...intro.querySelectorAll('.gi-tile')], toast = $('#gi-toast'), arl = $('#gi-arl'), xmb = $('#gi-xmb');
  let sel = Math.max(0, tiles.findIndex(t => t.classList.contains('sel'))), toastT, ready = false;
  const STEP = 7.5;   // šířka malé dlaždice + mezera (v em), musí odpovídat style.css
  const clampI = i => Math.min(tiles.length - 1, Math.max(0, i));
  function select(i) {
    const prev = sel; sel = clampI(i);
    if (ready && prev !== sel) sfx('nav');
    tiles.forEach((t, k) => t.classList.toggle('sel', k === sel));
    row.style.transform = 'translateX(' + (-sel * STEP) + 'em)';
    $('#gi-xtitle').textContent = tiles[sel].dataset.title;
    $('#gi-xsub').textContent = tiles[sel].dataset.sub;
    arl.style.opacity = sel > 0 ? 1 : 0;
  }
  function say(t) { toast.textContent = t; toast.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove('on'), 2200); }
  const nope = () => say('Tuhle část Kotlik ještě nedodělal.');
  tiles.forEach((t, k) => t.addEventListener('click', () => {
    if (state !== 'menu') return;
    if (k !== sel) { select(k); return; }
    t.dataset.main ? startIntro() : nope();
  }));
  select(sel); ready = true;

  /* =====================================================================
     SCÉNY INTRA: generují se tady (texty si klidně uprav)
     ===================================================================== */
  intro.querySelectorAll('.gi-scene').forEach(e => e.remove());   // smaže STARÉ scény z HTML
  /* CSS intra je přímo tady: styl.css už pro intro nepotřebuješ */
  const st = document.createElement('style'); st.textContent = `
.gi-skip,.ge-snd{font-family:Barlow,sans-serif}
.ge-fx,.ge-grain,.ge-vig{position:absolute;inset:0;width:100%;height:100%;z-index:5;pointer-events:none}
.ge-grain,.ge-vig{display:none}.gi.run .ge-grain,.gi.run .ge-vig{display:block}
.ge-grain{background:var(--noise);opacity:.55;mix-blend-mode:overlay;animation:gegr .4s steps(4) infinite}
@keyframes gegr{25%{background-position:-30px 20px}50%{background-position:40px -10px}75%{background-position:-10px -40px}}
.ge-vig{background:radial-gradient(ellipse at 50% 50%,transparent 55%,rgba(0,0,0,.75))}
.gi::before,.gi::after{content:"";position:absolute;left:0;right:0;height:0;background:#000;z-index:4;transition:height 1s;pointer-events:none}
.gi::before{top:0}.gi::after{bottom:0}
.gi.run::before,.gi.run::after{height:9%}.gi.t::before,.gi.t::after{height:0}
.ge-snd{display:none;position:absolute;top:1em;left:1em;z-index:7;background:rgba(0,0,0,.5);border:1px solid #888;color:#ddd;padding:.3em .7em;border-radius:999px;font-size:1.1em;cursor:pointer}
.gi.run .ge-snd{display:block}.ge-snd:hover{border-color:var(--bulb)}
.ge-bang{position:absolute;inset:0;z-index:6;background:radial-gradient(circle,#fff,#cfe8ff 60%,#fff);pointer-events:none;animation:gebang .7s forwards}
@keyframes gebang{0%{opacity:0}12%{opacity:.95}100%{opacity:0}}
.ge-ring{position:absolute;z-index:5;width:8em;height:8em;margin:-4em 0 0 -4em;border-radius:50%;border:.35em solid #fff;pointer-events:none;box-shadow:0 0 2em .5em rgba(255,255,255,.7),inset 0 0 2em rgba(255,255,255,.6);animation:gering 1.2s cubic-bezier(.1,.7,.3,1) forwards}
@keyframes gering{from{transform:scale(0);opacity:1}to{transform:scale(18);opacity:0}}
.gi.shk .ge-scene{animation:geshk .45s}.gi.shk2 .ge-scene{animation:geshk2 .9s}
@keyframes geshk{0%,100%{transform:none}15%{transform:translate(-1.2%,.8%) rotate(-.4deg)}30%{transform:translate(1%,-1%) rotate(.4deg)}45%{transform:translate(-.8%,-.6%)}60%{transform:translate(.7%,.7%)}80%{transform:translate(-.3%,.3%)}}
@keyframes geshk2{0%{transform:scale(1.06)}12%{transform:translate(-2.4%,1.6%) rotate(-.9deg) scale(1.05)}25%{transform:translate(2%,-2%) rotate(.9deg) scale(1.04)}40%{transform:translate(-1.6%,-1.2%) scale(1.03)}55%{transform:translate(1.2%,1.2%) scale(1.02)}75%{transform:translate(-.5%,.5%) scale(1.01)}100%{transform:none}}
@keyframes gerot{to{transform:rotate(360deg)}}
@keyframes gefade{to{opacity:1}}
@keyframes gein{to{opacity:1;transform:none}}
.ge-scene{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;visibility:hidden;transition:opacity .7s;z-index:2}
.ge-scene.on{opacity:1;visibility:visible}

/* scéna 0: světla auta */
.ge-ign{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 65%,#0b1118,#000 70%)}
.ge-hl{position:absolute;top:52%;width:5em;height:5em;margin:-2.5em 0 0 -2.5em;border-radius:50%;opacity:0;background:radial-gradient(circle,#fff 0 14%,#fff4c4 22%,rgba(255,225,150,.45) 42%,transparent 68%)}
.ge-hl.a{left:36%}.ge-hl.b{left:64%}
.ge-hl::after{content:"";position:absolute;left:-250%;right:-250%;top:50%;height:.18em;background:linear-gradient(90deg,transparent,#8fd3ff,#fff,#8fd3ff,transparent);box-shadow:0 0 1em #6cc}
.ge-scene.on .ge-hl{animation:gehl 2.3s .3s forwards}
@keyframes gehl{0%{opacity:0}8%{opacity:1}12%{opacity:0}18%{opacity:.9}22%{opacity:.1}30%,55%{opacity:1;transform:scale(1)}100%{opacity:1;transform:scale(16)}}

/* scéna 1: KOTLIK GAMES */
.ge-pres{position:relative;text-align:center;overflow:hidden;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 50%,#101820,#000 70%)}
.ge-rays{position:absolute;inset:-50%;pointer-events:none;background:repeating-conic-gradient(rgba(150,200,255,.07) 0 4deg,transparent 4deg 12deg);-webkit-mask:radial-gradient(circle,#000,transparent 55%);mask:radial-gradient(circle,#000,transparent 55%);animation:gerot 30s linear infinite}
.ge-beam{position:absolute;left:0;right:0;top:50%;height:.2em;transform:scaleX(0);opacity:0;pointer-events:none;background:linear-gradient(90deg,transparent,#8fd3ff 30%,#fff 50%,#8fd3ff 70%,transparent);box-shadow:0 0 2em .4em rgba(120,200,255,.6)}
.ge-scene.on .ge-beam{animation:gebeam 2.6s .1s ease-out forwards}
@keyframes gebeam{0%{transform:scaleX(0);opacity:1}50%{transform:scaleX(1);opacity:1}100%{transform:scaleX(1.1) scaleY(0);opacity:0}}
.ge-pres small{position:relative;display:block;font:400 3.4em 'Archivo Black',sans-serif;color:#fff;letter-spacing:.3em;margin-right:-.3em;opacity:0;text-shadow:0 0 .6em rgba(140,200,255,.6)}
.ge-scene.on .ge-pres small{animation:gemega 2.4s .3s cubic-bezier(.2,.8,.3,1) forwards,geglitch 3.2s 3s infinite}
@keyframes gemega{from{opacity:0;letter-spacing:1.1em;filter:blur(14px)}to{opacity:1;letter-spacing:.3em;filter:none}}
@keyframes geglitch{0%,90%,100%{text-shadow:0 0 .6em rgba(140,200,255,.6);transform:none}92%{text-shadow:-.07em 0 #f0f,.07em 0 #0ff;transform:translateX(.04em) skewX(6deg)}95%{text-shadow:.07em 0 #f0f,-.07em 0 #0ff;transform:translateX(-.04em)}}
.ge-pres b{position:relative;display:block;margin-top:.8em;font:400 1.6em 'Archivo Black',sans-serif;color:#8fb3d0;letter-spacing:.3em;min-height:1.2em;opacity:0}
.ge-pres b::after{content:"▌";color:var(--bulb);animation:gecur .7s steps(1) infinite}
.ge-scene.on .ge-pres b{animation:gefade .6s 1.5s forwards}
@keyframes gecur{50%{opacity:0}}

/* scéna 2: panely */
.ge-panels{display:flex;gap:.8em;width:104%;height:80%;transform:skewX(-6deg)}
.ge-p{position:relative;flex:1;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end;padding:1.2em;border:.35em solid #fff;opacity:0;transform:translateY(60%) scale(1.1);box-shadow:0 1em 3em rgba(0,0,0,.7);background-position:center;background-repeat:no-repeat}
.ge-scene.on .ge-p{animation:gepanel .7s cubic-bezier(.2,.9,.3,1) forwards,gekb 6s linear forwards;animation-delay:calc(var(--i)*.55s + .3s)}
.ge-scene.on .ge-p.p3{animation:gepanel .7s cubic-bezier(.2,.9,.3,1) forwards;animation-delay:calc(var(--i)*.55s + .3s)}
.ge-p::before{content:"";position:absolute;inset:0;background:radial-gradient(circle,rgba(0,0,0,.35) 1.2px,transparent 1.6px) 0 0/9px 9px;mix-blend-mode:multiply}
.ge-p::after{content:"";position:absolute;inset:0;background:linear-gradient(transparent 40%,rgba(0,0,0,.8))}
.ge-p span{position:relative;z-index:1;transform:skewX(6deg);font:400 2.6em 'Archivo Black',sans-serif;line-height:1;text-shadow:.07em .07em 0 #000}
.ge-p em{position:relative;z-index:1;transform:skewX(6deg);font:600 1.15em Barlow,sans-serif;font-style:normal;margin-top:.4em;background:#000;padding:.2em .5em;align-self:flex-start}
.ge-p.p1{background-image:linear-gradient(160deg,rgba(224,115,58,.3),rgba(90,30,12,.45)),var(--o);background-size:100% 100%,auto 100%}
.ge-p.p2{background-image:linear-gradient(160deg,rgba(25,167,224,.3),rgba(5,40,63,.45)),var(--w);background-size:100% 100%,auto 100%}
.ge-p.p3{background-image:repeating-linear-gradient(-45deg,#ffd21f 0 22px,#15171a 22px 44px)}
.ge-p.p3 span{color:#ffd21f;background:#000;padding:0 .2em}
.ge-p.p4{background-image:linear-gradient(160deg,rgba(60,60,60,.4),rgba(10,10,10,.6)),var(--o);background-size:100% 100%,auto 100%;background-position:center,85% center}
@keyframes gepanel{to{opacity:1;transform:none}}
@keyframes gekb{from{background-size:100% 100%,auto 100%}to{background-size:100% 100%,auto 135%}}
.ge-speed{position:absolute;inset:-30%;z-index:3;pointer-events:none;background:repeating-conic-gradient(rgba(255,255,255,0) 0 2deg,rgba(255,255,255,.09) 2deg 3deg);-webkit-mask:radial-gradient(circle,transparent 30%,#000 80%);mask:radial-gradient(circle,transparent 30%,#000 80%);animation:gerot 5s linear infinite}
.ge-cap{position:absolute;z-index:4;left:0;right:0;top:50%;transform:translateY(-50%);text-align:center;opacity:0;pointer-events:none}
.ge-cap b{display:inline-block;font:400 4.2em/1.05 'Archivo Black',sans-serif;background:#000;color:#fff;padding:.05em .35em;transform:skewX(-8deg);border-inline:.15em solid var(--hazard)}
.ge-cap b:nth-of-type(2){background:var(--hazard);color:#000;margin-top:.1em}
.ge-scene.on .ge-cap{animation:gecap .5s 3.3s cubic-bezier(.2,1.6,.4,1) forwards}
@keyframes gecap{from{opacity:0;transform:translateY(-50%) scale(3)}to{opacity:1;transform:translateY(-50%)}}

/* scéna 3: titulek */
.ge-bg{position:absolute;inset:0;background:linear-gradient(#240a45 0,#7a1b6b 38%,#ff3d81 60%,#ffb347 78%)}
.ge-stars{position:absolute;inset:0 0 40%;pointer-events:none;animation:getw 3s ease-in-out infinite alternate;background:radial-gradient(1.5px 1.5px at 10% 12%,#fff,transparent),radial-gradient(1.5px 1.5px at 24% 30%,#fff,transparent),radial-gradient(2px 2px at 38% 8%,#fff,transparent),radial-gradient(1.5px 1.5px at 62% 18%,#fff,transparent),radial-gradient(2px 2px at 78% 10%,#fff,transparent),radial-gradient(1.5px 1.5px at 90% 28%,#fff,transparent)}
@keyframes getw{from{opacity:.4}to{opacity:1}}
.ge-sun{position:absolute;left:50%;top:38%;width:36%;aspect-ratio:1;transform:translate(-50%,-30%);border-radius:50%;background:linear-gradient(#fff2a8,#ff9a3c 55%,#ff3d81);box-shadow:0 0 6em 1em rgba(255,120,80,.6);-webkit-mask:linear-gradient(#000 0 55%,transparent 55% 58%,#000 58% 70%,transparent 70% 74%,#000 74% 86%,transparent 86% 91%,#000 91%);mask:linear-gradient(#000 0 55%,transparent 55% 58%,#000 58% 70%,transparent 70% 74%,#000 74% 86%,transparent 86% 91%,#000 91%)}
.ge-hills{position:absolute;left:0;right:0;bottom:36%;width:100%;height:24%}
.ge-grid{position:absolute;left:-50%;right:-50%;bottom:12%;height:26%;transform:perspective(30em) rotateX(62deg);transform-origin:50% 100%;background:linear-gradient(90deg,rgba(255,79,163,.75) 1px,transparent 1px) 0 0/4em 100%,linear-gradient(rgba(255,79,163,.75) 1px,transparent 1px) 0 0/100% 3em,#1a0833;-webkit-mask:linear-gradient(transparent,#000 40%);mask:linear-gradient(transparent,#000 40%)}
.ge-scene.on .ge-grid{animation:gegrid .6s linear infinite}
@keyframes gegrid{to{background-position:0 0,0 3em,0 0}}
.ge-road{position:absolute;left:0;right:0;bottom:0;height:12%;background:#120622;border-top:.3em solid #ff4fa3;overflow:hidden}
.ge-road::after{content:"";position:absolute;left:0;right:-6em;top:46%;height:.4em;background:repeating-linear-gradient(90deg,#ffd21f 0 3em,transparent 3em 6em)}
.ge-scene.on .ge-road::after{animation:geroad .5s linear infinite}
@keyframes geroad{to{transform:translateX(-6em)}}
.ge-car{position:absolute;bottom:4.5%;width:22%;left:-25%;filter:drop-shadow(0 0 .8em #ff4fa3)}
.ge-scene.on .ge-car{animation:gecar 7s cubic-bezier(.4,0,.6,1) 1s infinite}
@keyframes gecar{0%{left:-25%}100%{left:110%}}
.ge-burst{position:absolute;left:50%;top:44%;width:140%;aspect-ratio:1;opacity:0;pointer-events:none;transform:translate(-50%,-50%);background:repeating-conic-gradient(rgba(255,200,230,.22) 0 3deg,transparent 3deg 9deg);-webkit-mask:radial-gradient(circle,#000,transparent 65%);mask:radial-gradient(circle,#000,transparent 65%)}
.ge-scene.on .ge-burst{animation:gefade 1s 1.4s forwards,geburst 40s linear infinite}
@keyframes geburst{from{transform:translate(-50%,-50%) rotate(0)}to{transform:translate(-50%,-50%) rotate(360deg)}}
.ge-logo{position:relative;text-align:center;display:flex;flex-direction:column;align-items:center;transform:translateY(-6%)}
.ge-logo small{font:600 1.2em Barlow,sans-serif;letter-spacing:.5em;color:#ffe3f1;opacity:0}
.ge-logo h4{font:400 3.2em 'Archivo Black',sans-serif;font-style:italic;letter-spacing:.12em;color:#fff;-webkit-text-stroke:.05em #000;text-shadow:.06em .06em 0 #000;opacity:0;transform:translateX(-120%)}
.ge-logo h5{font:400 11em 'Archivo Black',sans-serif;line-height:.9;letter-spacing:-.01em;background:linear-gradient(#fff 0,#ffd0e6 35%,#ff4fa3 60%,#ff9a3c);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(.04em .04em 0 #000) drop-shadow(0 0 .3em rgba(255,79,163,.6));opacity:0;transform:scale(2.4)}
.ge-ribbon{margin-top:.5em;padding:.25em 1.6em;background:var(--hazard);color:#15171a;font:400 1.6em 'Archivo Black',sans-serif;letter-spacing:.18em;transform:skewX(-12deg) scaleX(0)}
.ge-load,.ge-play{margin-top:1.6em;opacity:0}
.ge-scene.on .ge-logo small{animation:gefade 1s .4s forwards}
.ge-scene.on .ge-logo h4{animation:gein .8s .7s cubic-bezier(.2,1,.3,1) forwards}
.ge-scene.on .ge-logo h5{animation:gein .7s 1.3s cubic-bezier(.2,1.4,.4,1) forwards,gepulse 2.4s 2.2s ease-in-out infinite}
@keyframes gepulse{50%{filter:drop-shadow(.04em .04em 0 #000) drop-shadow(0 0 .7em rgba(255,79,163,.95))}}
.ge-scene.on .ge-ribbon{animation:geribbon .5s 2.1s forwards}
@keyframes geribbon{to{transform:skewX(-12deg) scaleX(1)}}
.ge-scene.on .ge-load{animation:gefade .6s 2.5s forwards}
.ge-load span{display:block;font:600 1.15em Barlow,sans-serif;color:#ffe3f1;margin-bottom:.4em}
.ge-bar{width:26em;max-width:80vw;height:.7em;margin:0 auto;background:rgba(0,0,0,.55);border:.12em solid #fff;border-radius:99px;overflow:hidden}
.ge-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#ff4fa3,#ffd21f)}
.ge-load.hide{display:none}
.ge-play{display:none;flex-direction:column;align-items:center;gap:.7em}
.ge-scene.on .ge-play.on{display:flex;opacity:1;animation:gefade .5s forwards}
.ge-play .btn{font-size:1.5em}.ge-play .btn-main{animation:geplay 1.2s infinite}
.ge-play p{font:600 1em Barlow,sans-serif;color:#ffe3f1;opacity:.8}
@keyframes geplay{50%{box-shadow:0 0 0 .6em rgba(255,210,31,.25),0 0 2.5em rgba(255,210,31,.7)}}
.gi.fast .ge-scene.on .ge-logo .k{opacity:1!important;transform:none!important;animation:none!important}
.gi.fast .ge-scene.on .ge-logo .ge-ribbon{transform:skewX(-12deg)!important}
@media (max-width:600px){.ge-bar{width:18em}}
`; document.head.appendChild(st);
  intro.insertAdjacentHTML('beforeend', `
    <button class="ge-snd" id="gi-snd" aria-label="Zvuk zap/vyp">🔊</button>
    <i class="ge-grain"></i><i class="ge-vig"></i>
    <div class="ge-scene" data-s="ign"><div class="ge-ign"><i class="ge-hl a"></i><i class="ge-hl b"></i></div></div>
    <div class="ge-scene" data-s="pres"><div class="ge-pres">
      <i class="ge-rays"></i><i class="ge-beam"></i>
      <small>KOTLIK GAMES</small><b id="gi-type"></b>
    </div></div>
    <div class="ge-scene" data-s="panels">
      <div class="ge-panels">
        <div class="ge-p p1" style="--i:0"><span>ŠPINAVÁ PRÁCE</span><em>Někdo ji dělat musí.</em></div>
        <div class="ge-p p2" style="--i:1"><span>RYCHLÉ DODÁNÍ</span><em>Wolt nečeká.</em></div>
        <div class="ge-p p3" style="--i:2"><span>6 % NAFTY</span><em>Víc nebylo.</em></div>
        <div class="ge-p p4" style="--i:3"><span>BEZ BRZD</span><em>Skoro.</em></div>
      </div>
      <i class="ge-speed"></i>
      <div class="ge-cap"><b>JEDEN KOTLÍK.</b><br><b>ŽÁDNÁ PRAVIDLA.</b></div>
    </div>
    <div class="ge-scene" data-s="title">
      <div class="ge-bg"></div><i class="ge-stars"></i><div class="ge-sun"></div>
      <svg class="ge-hills" viewBox="0 0 960 160" preserveAspectRatio="none"><path d="M0 160V100L80 55 170 105 280 30 390 100 510 45 630 110 750 50 860 105 960 70V160Z" fill="#1a0833"/><path d="M0 160V130L120 95 260 135 420 90 600 140 780 100 960 135V160Z" fill="#0d041c"/></svg>
      <i class="ge-grid"></i><div class="ge-road"></div>
      <svg class="ge-car" viewBox="0 0 220 70"><path d="M8 54 14 38Q20 32 42 30L68 13Q80 7 110 7L150 9Q170 15 182 31L205 37Q214 41 214 54Z" fill="#0b0414" stroke="#ff4fa3" stroke-width="2.5"/><path d="M76 16 106 12 108 30 62 31Z M118 12 148 14 166 30 120 30Z" fill="#ff4fa3" opacity=".35"/><circle cx="52" cy="56" r="13" fill="#0b0414" stroke="#ffd21f" stroke-width="3"/><circle cx="170" cy="56" r="13" fill="#0b0414" stroke="#ffd21f" stroke-width="3"/></svg>
      <i class="ge-burst"></i>
      <div class="ge-logo">
        <small class="k">KOTLIK GAMES UVÁDÍ</small><h4 class="k">GRAND THEFT</h4><h5 class="k">KOTLIK</h5>
        <div class="ge-ribbon k">OKTÁVKA EDITION</div>
        <div class="ge-load k"><span>Načítání…</span><div class="ge-bar"><i></i></div></div>
        <div class="ge-play"><button class="btn btn-main" id="gi-play">▶ Play</button><button class="btn btn-ghost" id="gi-playfs">⛶ Play na celou obrazovku</button><p>nebo stiskni Enter</p></div>
      </div>
    </div>
  `);
  const snd = $('#gi-snd');
  const setMute = () => { snd.textContent = muted ? '🔇' : '🔊'; if (master) master.gain.value = muted ? 0 : .85; if (musicEl) musicEl.muted = muted; };
  snd.addEventListener('click', () => { muted = !muted; setMute(); });

  /* ---------- intro (spustí se až po Startu v menu) ---------- */
  function typeText(el, txt, speed) {
    let i = 0;
    const iv = setInterval(() => { el.textContent = txt.slice(0, ++i); sfx('tick'); if (i >= txt.length) clearInterval(iv); }, speed);
    timers.push(iv);
  }
  const msgs = ['Načítání rzi…', 'Dolévání nafty (6 %)…', 'Utahování lepicí pásky…', 'Odvzdušňování radiátorů…', 'Hledání parkoviště u KM Prona…'];
  function load() {
    if (loading) return; loading = true;
    const bar = $('.ge-bar i'), txt = $('.ge-load span'); let p = 0;
    const iv = setInterval(() => {
      p = Math.min(100, p + (fast ? 6 : 1 + Math.random() * 2.5));
      bar.style.width = p + '%';
      txt.textContent = msgs[Math.min(msgs.length - 1, Math.floor(p / 20))];
      if (p >= 100) {
        clearInterval(iv);
        setTimeout(() => { $('.ge-load').classList.add('hide'); $('.ge-play').classList.add('on'); sfx('hit'); }, 250);
      }
    }, 70);
    timers.push(iv);
  }
  function startIntro() {
    if (state !== 'menu' || !tiles[sel].dataset.main) return;
    state = 'intro'; intro.classList.add('run');
    audio(); setMute(); fxSize(); fxOn = true; ember = .15; requestAnimationFrame(fxLoop);
    // přiblížení do vybrané dlaždice, pak záblesk
    const r = tiles[sel].getBoundingClientRect(), b = intro.getBoundingClientRect();
    xmb.style.transformOrigin = (r.left + r.width / 2 - b.left) + 'px ' + (r.top + r.height / 2 - b.top) + 'px';
    intro.classList.add('launching'); sfx('whoosh');

    const T1 = 1000;                  // 1) temná tma, rozsvítí se světla auta, motor
    at(() => { show('ign'); bed(); sfx('riser'); }, T1);
    at(() => sfx('engine'), T1 + 1000);
    const T2 = T1 + 2600;             // 2) úder, KOTLIK GAMES
    at(() => { show('pres'); impact(50, 50, true); ember = .3; }, T2);
    at(() => sfx('whoosh'), T2 + 300);
    at(() => typeText($('#gi-type'), 'uvádí…', 140), T2 + 1700);
    const T3 = T2 + 4600;             // 3) komiksové panely, každý dopadne s třeskem
    at(() => { show('panels'); sfx('whoosh'); ember = .45; }, T3);
    [0, 1, 2, 3].forEach(i => at(() => impact(13 + i * 25, 55, false), T3 + 750 + i * 550));
    at(() => sfx('riser'), T3 + 1800);
    at(() => impact(50, 50, true), T3 + 3550);    // slogan
    const T4 = T3 + 5000;             // 4) titulek
    at(() => { show('title'); impact(50, 45, true); sfx('stinger'); ember = .7; }, T4);
    at(() => sfx('engine'), T4 + 900);
    at(() => impact(50, 44, true), T4 + 1550);    // dopad loga
    at(() => sfx('whoosh'), T4 + 2100);
    at(load, T4 + 2500);
  }
  $('#gi-skip').addEventListener('click', () => {
    timers.forEach(t => { clearTimeout(t); clearInterval(t); }); timers = [];
    fast = true; intro.classList.add('fast'); show('title');
    if (!bedStop && !musicEl) bed();
    tmp('ge-bang', '', 900); sfx('boom'); ember = .7;
    load();
  });

  /* ---------- Play: teprve teď se hra probudí ---------- */
  function play(fs) {
    if (state !== 'intro' || !$('.ge-play').classList.contains('on')) return;
    state = 'done';
    if (fs) enterFs();
    stopBed(); sfx('engine'); ember = 0;
    intro.classList.add('out');
    setTimeout(() => { fxOn = false; }, 1000);
    window.dispatchEvent(new Event('kotlik:play'));
    setTimeout(() => { const b = document.getElementById('g-start'); if (b) b.focus({ preventScroll: true }); }, 950);
  }
  $('#gi-play').addEventListener('click', () => play(false));
  $('#gi-playfs').addEventListener('click', () => play(true));

  /* ---------- klávesy ---------- */
  addEventListener('keydown', e => {
    if (e.code === 'KeyF' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey && (inView || box.classList.contains('pfs'))) toggleFs();
    if (e.code === 'Escape' && pseudo) exitFs();
    if (state === 'done' || !(inView || box.classList.contains('pfs'))) return;
    if (e.code === 'KeyM' && !e.repeat) { muted = !muted; setMute(); }
    if (state === 'menu') {
      if (e.code === 'ArrowLeft') { e.preventDefault(); select(sel - 1); }
      else if (e.code === 'ArrowRight') { e.preventDefault(); select(sel + 1); }
      else if (e.code === 'Enter') { e.preventDefault(); tiles[sel].dataset.main ? startIntro() : nope(); }
    } else if (state === 'intro' && e.code === 'Enter') { e.preventDefault(); play(false); }
  });
})();
