(() => {
  // rok v patičce
  document.getElementById('year').textContent = new Date().getFullYear();

  // mobilní menu
  const burger = document.querySelector('.burger');
  const nav = document.querySelector('.top nav');
  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
  });
  nav.addEventListener('click', e => {
    if (e.target.tagName === 'A') { nav.classList.remove('open'); burger.setAttribute('aria-expanded', false); }
  });

  // rotující stav Kotlika
  const statuses = [
    'Právě opravuje kotel', 'Právě vyměňuje splachovač', 'Právě tahá kabel',
    'Právě rozváží Wolt', 'Právě tankuje do Oktávky (spíš dolévá rez)', 'Právě pod kotlem'
  ];
  const st = document.getElementById('status-text');
  let si = 0;
  setInterval(() => { si = (si + 1) % statuses.length; st.textContent = statuses[si]; }, 3500);

  // manometr
  const ticks = document.getElementById('ticks');
  const NS = 'http://www.w3.org/2000/svg';
  for (let i = 0; i <= 22; i++) {
    const a = (-110 + i * 10) * Math.PI / 180;
    const long = i % 2 === 0;
    const r1 = 70, r2 = long ? 58 : 63;
    const l = document.createElementNS(NS, 'line');
    l.setAttribute('x1', 100 + Math.sin(a) * r1); l.setAttribute('y1', 100 - Math.cos(a) * r1);
    l.setAttribute('x2', 100 + Math.sin(a) * r2); l.setAttribute('y2', 100 - Math.cos(a) * r2);
    ticks.appendChild(l);
  }
  const needle = document.getElementById('needle');
  const note = document.getElementById('gauge-note');
  const btn = document.getElementById('gauge-btn');
  const moods = [
    [-100, 'Studená voda. Kotel spí.'],
    [-60, 'Tlak nízký. Dolít a vzdychnout.'],
    [0, 'Tlak v pořádku. Zatím.'],
    [60, 'Tlak roste. Kotlik by to nedělal.'],
    [105, 'Pozor! Pojistný ventil je ve stavu pohotovosti.']
  ];
  const setNeedle = deg => needle.style.transform = `rotate(${deg}deg)`;
  let mi = 2;
  setTimeout(() => setNeedle(0), 400);     // jednorázový nájezd ručičky po načtení
  btn.addEventListener('click', () => {
    mi = (mi + 1) % moods.length;
    setNeedle(moods[mi][0]); note.textContent = moods[mi][1];
    if (mi === 4) { needle.animate([{translate:'0'},{translate:'3px 0'},{translate:'-3px 0'},{translate:'0'}], {duration:120, iterations:6}); }
  });

  // obrázky: když chybí fotka, ukáže se zástupný obrázek
  document.querySelectorAll('img[data-ph]').forEach(img => {
    const fallback = () => {
      const t = img.dataset.ph;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#D3DCDE"/>
        <g fill="none" stroke="#0E3B43" stroke-width="5" stroke-linejoin="round"><path d="M60 190l25-60h170l45 60"/><path d="M40 190h320v40H40z"/></g>
        <circle cx="110" cy="235" r="25" fill="#B4512B" stroke="#0E3B43" stroke-width="5"/><circle cx="290" cy="235" r="25" fill="#B4512B" stroke="#0E3B43" stroke-width="5"/>
        <text x="200" y="90" font-family="Arial" font-weight="bold" font-size="20" fill="#0E3B43" text-anchor="middle">${t}</text>
        <text x="200" y="115" font-family="Arial" font-size="14" fill="#51666B" text-anchor="middle">nahraj do složky img/</text></svg>`;
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    };
    img.addEventListener('error', fallback, { once: true });
    if (img.complete && img.naturalWidth === 0) fallback();
  });

  // rezometr: načítá se při scrollu
  const meter = document.getElementById('meter');
  const run = () => {
    meter.querySelectorAll('.bar').forEach(bar => {
      const val = +bar.dataset.val, fill = bar.querySelector('i'), out = bar.querySelector('b');
      fill.style.width = val + '%';
      const t0 = performance.now(), dur = 1800;
      const tick = t => {
        const p = Math.min((t - t0) / dur, 1);
        out.textContent = Math.round(val * (1 - Math.pow(1 - p, 3))) + ' %';
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  };
  new IntersectionObserver((en, ob) => {
    if (en[0].isIntersecting) { run(); ob.disconnect(); }
  }, { threshold: .4 }).observe(meter);

  // hlášky
  const quotes = [
    '„Kotel ti spravím za hodinu, svíčkovou ti dovezu za dvacet minut.“',
    '„Oktávka má víc rzi než nafty, ale zatím ještě nikdy nezůstala stát. Aspoň ne dvakrát za sebou.“',
    '„Na Woltu mám pět hvězdiček. Na kotlech taky, jen mi nikdo nedal možnost to ohodnotit.“',
    '„Jestli se vám v Oktávce zdá, že auto jede po vodě, je to proto, že ne všechno, co teče, je potrubí.“',
    '„Záchod i jídlo dovezu až k vám. Jen ne ve stejném autě. Většinou.“',
    '„STK mi napsala, že rez není barva karoserie. Já jim řekl, že je to patina.“'
  ];
  const q = document.getElementById('quote');
  let qi = 0;
  document.getElementById('quote-btn').addEventListener('click', () => {
    qi = (qi + 1) % quotes.length; q.textContent = quotes[qi];
  });
})();
