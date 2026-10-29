// Grand Theft Kotlik: výběr hry (jako PlayStation) -> HRÁT -> intro -> Play + fullscreen
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
  const at = (f, ms) => timers.push(setTimeout(f, ms));
  const show = n => {
    intro.querySelectorAll('.gi-scene').forEach(e => e.classList.toggle('on', e.dataset.s === n));
    intro.classList.toggle('t', n === 'title');
  };

  /* ---------- fotka Oktávky do panelu ---------- */
  const ph = document.querySelector('img[data-photo="oktavka"]'), p4 = $('.p4');
  if (ph && ph.src && p4) p4.style.backgroundImage = `url("${ph.src}")`;

  /* ---------- menu jako na PlayStationu ---------- */
  const clock = $('#gi-clock');
  const tick = () => { const d = new Date(); clock.textContent = d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); };
  tick(); setInterval(tick, 20000);

  const tiles = [...intro.querySelectorAll('.gi-tile')], toast = $('#gi-toast');
  let sel = tiles.findIndex(t => t.classList.contains('sel')), toastT;
  function select(i) {
    sel = (i + tiles.length) % tiles.length;
    tiles.forEach((t, k) => t.classList.toggle('sel', k === sel));
    $('#gi-xtitle').textContent = tiles[sel].dataset.title;
    $('#gi-xsub').textContent = tiles[sel].dataset.sub;
    $('#gi-hrat').style.display = tiles[sel].dataset.main ? '' : 'none';
  }
  function say(t) { toast.textContent = t; toast.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove('on'), 2200); }
  tiles.forEach((t, k) => t.addEventListener('click', () => {
    if (k !== sel) { select(k); if (!t.dataset.main) say('Tuhle hru Kotlik ještě nedodělal.'); }
    else if (t.dataset.main) startIntro();
    else say('Tuhle hru Kotlik ještě nedodělal.');
  }));
  $('#gi-hrat').addEventListener('click', startIntro);

  /* ---------- intro (spustí se až po HRÁT) ---------- */
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
  }
  function startIntro() {
    if (state !== 'menu' || !tiles[sel].dataset.main) return;
    state = 'intro'; intro.classList.add('run');
    show('pres');
    at(() => typeText($('#gi-type'), 'uvádí…', 140), 900);
    at(() => show('panels'), 3600);
    at(() => { show('title'); at(load, 2500); }, 3600 + 4200);
  }
  $('#gi-skip').addEventListener('click', () => {
    timers.forEach(t => { clearTimeout(t); clearInterval(t); }); timers = [];
    fast = true; show('title');
    intro.querySelectorAll('.gi-logo small,.gi-logo h4,.gi-logo h5,.gi-ribbon,.gi-load').forEach(e => { e.style.animationDelay = '0s'; });
    load();
  });

  /* ---------- Play ---------- */
  function play(fs) {
    if (state !== 'intro' || !$('.gi-play').classList.contains('on')) return;
    state = 'done';
    if (fs) enterFs();
    intro.classList.add('out');
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
      else if (e.code === 'Enter') { e.preventDefault(); tiles[sel].dataset.main ? startIntro() : say('Tuhle hru Kotlik ještě nedodělal.'); }
    } else if (state === 'intro' && e.code === 'Enter') { e.preventDefault(); play(false); }
  });
})();
