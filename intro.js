// Grand Theft Kotlik: menu jako PlayStation 4 -> Start -> intro -> Play (+ celá obrazovka)
// Hra se nespustí, dokud neprojdeš menu i intro: na Play se pošle událost "kotlik:play", na kterou čeká game.js.
(() => {
  const intro = document.getElementById('g-intro'), box = document.querySelector('.game-box');
  if (!intro || !box) return;
  const $ = s => intro.querySelector(s);

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

  // klávesy fungují jen když je herní okno vidět (aby nebrzdily scrollování stránky)
  let inView = false;
  new IntersectionObserver(e => { inView = e[0].isIntersecting && e[0].intersectionRatio >= .5; }, { threshold: [0, .5, 1] }).observe(box);

  /* ---------- stav ---------- */
  let state = 'menu';   // menu -> intro -> done
  let timers = [], loading = false, fast = false;
  const at = (f, ms) => { const t = setTimeout(f, ms); timers.push(t); return t; };
  const show = n => {
    intro.querySelectorAll('.gi-scene').forEach(e => e.classList.toggle('on', e.dataset.s === n));
    intro.classList.toggle('t', n === 'title');
  };

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

  /* ---------- plovoucí tečky na pozadí (jako PS4) ---------- */
  const cvd = $('#gi-dots'), cx = cvd.getContext('2d');
  let W = 960, H = 540, dots = [], rafId = 0;
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
    if (state === 'menu') rafId = requestAnimationFrame(drawDots);
  }
  rafId = requestAnimationFrame(drawDots);

  /* ---------- menu: řada dlaždic, vybraná se zvětší a řada se posune ---------- */
  const row = $('#gi-row'), tiles = [...intro.querySelectorAll('.gi-tile')], toast = $('#gi-toast'), arl = $('#gi-arl'), xmb = $('#gi-xmb');
  let sel = Math.max(0, tiles.findIndex(t => t.classList.contains('sel'))), toastT;
  const STEP = 7.5;   // šířka malé dlaždice + mezera (v em), musí odpovídat style.css
  function select(i) {
    sel = clampI(i);
    tiles.forEach((t, k) => t.classList.toggle('sel', k === sel));
    row.style.transform = 'translateX(' + (-sel * STEP) + 'em)';
    $('#gi-xtitle').textContent = tiles[sel].dataset.title;
    $('#gi-xsub').textContent = tiles[sel].dataset.sub;
    arl.style.opacity = sel > 0 ? 1 : 0;
  }
  const clampI = i => Math.min(tiles.length - 1, Math.max(0, i));
  function say(t) { toast.textContent = t; toast.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove('on'), 2200); }
  const nope = () => say('Tuhle část Kotlik ještě nedodělal.');
  tiles.forEach((t, k) => t.addEventListener('click', () => {
    if (state !== 'menu') return;
    if (k !== sel) { select(k); return; }
    t.dataset.main ? startIntro() : nope();
  }));
  select(sel);

  /* ---------- intro (spustí se až po Startu v menu) ---------- */
  function typeText(el, txt, speed) {
    let i = 0;
    const iv = setInterval(() => { el.textContent = txt.slice(0, ++i); if (i >= txt.length) clearInterval(iv); }, speed);
    timers.push(iv);
  }
  const msgs = ['Načítání rzi…', 'Dolévání nafty (6 %)…', 'Utahování lepicí pásky…', 'Odvzdušňování radiátorů…', 'Hledání parkoviště u KM Prona…'];
  function load() {
    if (loading) return; loading = true;
    const bar = $('.gi-bar i'), txt = $('.gi-load span'); let p = 0;
    const iv = setInterval(() => {
      p = Math.min(100, p + (fast ? 6 : 1 + Math.random() * 2.5));
      bar.style.width = p + '%';
      txt.textContent = msgs[Math.min(msgs.length - 1, Math.floor(p / 20))];
      if (p >= 100) {
        clearInterval(iv);
        setTimeout(() => { $('.gi-load').classList.add('hide'); $('.gi-play').classList.add('on'); }, 250);
      }
    }, 70);
    timers.push(iv);
  }
  function startIntro() {
    if (state !== 'menu' || !tiles[sel].dataset.main) return;
    state = 'intro'; intro.classList.add('run');
    // přiblížení do vybrané dlaždice, pak záblesk a filmové scény
    const r = tiles[sel].getBoundingClientRect(), b = intro.getBoundingClientRect();
    xmb.style.transformOrigin = (r.left + r.width / 2 - b.left) + 'px ' + (r.top + r.height / 2 - b.top) + 'px';
    intro.classList.add('launching');
    at(() => { show('pres'); at(() => typeText($('#gi-type'), 'uvádí…', 140), 900); }, 1000);
    at(() => show('panels'), 1000 + 3600);
    at(() => { show('title'); at(load, 2500); }, 1000 + 3600 + 5000);
  }
  $('#gi-skip').addEventListener('click', () => {
    timers.forEach(t => { clearTimeout(t); clearInterval(t); }); timers = [];
    fast = true; show('title');
    intro.querySelectorAll('.gi-logo small,.gi-logo h4,.gi-logo h5,.gi-ribbon,.gi-load').forEach(e => { e.style.animationDelay = '0s'; });
    load();
  });

  /* ---------- Play: teprve teď se hra probudí ---------- */
  function play(fs) {
    if (state !== 'intro' || !$('.gi-play').classList.contains('on')) return;
    state = 'done';
    if (fs) enterFs();
    intro.classList.add('out');
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
    if (state === 'menu') {
      if (e.code === 'ArrowLeft') { e.preventDefault(); select(sel - 1); }
      else if (e.code === 'ArrowRight') { e.preventDefault(); select(sel + 1); }
      else if (e.code === 'Enter') { e.preventDefault(); tiles[sel].dataset.main ? startIntro() : nope(); }
    } else if (state === 'intro' && e.code === 'Enter') { e.preventDefault(); play(false); }
  });
})();
