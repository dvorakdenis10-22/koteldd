// Grand Theft Kotlik: intro + fullscreen (načítá se po game.js)
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
  addEventListener('keydown', e => {
    if (e.code === 'KeyF' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) toggleFs();
    if (e.code === 'Escape' && pseudo) exitFs();
  });

  /* ---------- fotka Oktávky do panelu ---------- */
  const ph = document.querySelector('img[data-photo="oktavka"]'), p4 = $('.p4');
  if (ph && ph.src && p4) p4.style.backgroundImage = `url("${ph.src}")`;

  /* ---------- časová osa ---------- */
  const show = n => {
    intro.querySelectorAll('.gi-scene').forEach(e => e.classList.toggle('on', e.dataset.s === n));
    intro.classList.toggle('t', n === 'title');
  };
  let timers = [], loading = false, fast = false, ended = false;
  const at = (f, ms) => timers.push(setTimeout(f, ms));

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

  at(() => typeText($('#gi-type'), 'uvádí…', 140), 900);
  at(() => show('panels'), 3600);
  at(() => { show('title'); at(load, 2500); }, 3600 + 4200);

  $('#gi-skip').addEventListener('click', () => {
    timers.forEach(t => { clearTimeout(t); clearInterval(t); }); timers = [];
    fast = true; show('title');
    // při přeskočení nečekáme na animace titulku
    intro.querySelectorAll('.gi-logo small,.gi-logo h4,.gi-logo h5,.gi-ribbon,.gi-load').forEach(e => { e.style.animationDelay = '0s'; });
    load();
  });

  /* ---------- Play ---------- */
  function play(fs) {
    if (ended || !$('.gi-play').classList.contains('on')) return;
    ended = true;
    if (fs) enterFs();
    intro.classList.add('out');
    removeEventListener('keydown', onKey);
    setTimeout(() => { const b = document.getElementById('g-start'); if (b) b.focus({ preventScroll: true }); }, 950);
  }
  const onKey = e => { if (e.code === 'Enter') { e.preventDefault(); play(false); } };
  addEventListener('keydown', onKey);
  $('#gi-play').addEventListener('click', () => play(false));
  $('#gi-playfs').addEventListener('click', () => play(true));
})();
