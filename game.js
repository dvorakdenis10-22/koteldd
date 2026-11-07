// 3D minihra: garáž Kotlika → Vrbčany → kopec → státovka vlevo → odbočka do KM Prona → parkoviště a spánek (three.js)
(() => {
  const cv = document.getElementById('game'); if (!cv) return;
  const $ = id => document.getElementById(id), T = window.THREE;
  // !!! NAHRAĎ TENTO ŘÁDEK ŘÁDKEM "const SLEEP_IMG = ..." ZE SVÉHO STARÉHO game.js (je to ten dlouhý s base64) !!!
  const SLEEP_IMG = <div class="g-optrow"><span>Rozlišení</span><div class="g-skins g-rs"><button data-res="low">720p</button><button data-res="high" class="on">1080p</button><button data-res="ultra">1440p</button></div></div>;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), lerp = (a, b, t) => a + (b - a) * t;
  const sm = (a, b, x) => { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
  function say(title, text, btn, win) {
    $('g-title').textContent = title; $('g-text').innerHTML = text; $('g-start').textContent = btn;
    const o = $('g-ov'); o.classList.remove('hide'); o.classList.toggle('g-win', !!win);
  }
  if (!T) { say('3D se nenačetlo', 'Hra potřebuje internet kvůli knihovně three.js. Obnov stránku.', 'OK'); return; }
  $('g-sleep-img').src = SLEEP_IMG;

  /* ---------- uložená nastavení + rozlišení ---------- */
  let saved = {}; try { saved = JSON.parse(localStorage.getItem('kotlikOpts') || 'null') || {}; } catch (e) { }
  const RES = { low: [1280, 720], high: [1920, 1080], ultra: [2560, 1440] };
  const coarse = window.matchMedia && matchMedia('(pointer:coarse)').matches;
  let resKey = RES[saved.res] ? saved.res : (coarse ? 'low' : 'high');

  /* ---------- svět podle mapy: sever = -Z, východ = +X ---------- */
  const ZB = -609, HP = 30, SX = 340, BX = SX - 17.5, BZ = ZB - 21.5, ZV = ZB - 520;
  const at = (e, n) => [SX + e, ZB - n];   // e = metry na východ od středu benzinky, n = metry na sever od státovky
  const prof = z => HP * sm(ZV + 70, ZV + 450, z);
  const noise = (x, z) => Math.sin(x * .011 + 1.3) * Math.cos(z * .009) * 7 + Math.sin(x * .027 + z * .019) * 3 + Math.sin(z * .041 - x * .013) * 1.6;
  const distPath = (x, z, pts) => { let m = 1e9; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[2] - a[2], t = clamp(((x - a[0]) * dx + (z - a[2]) * dz) / (dx * dx + dz * dz || 1), 0, 1), d = Math.hypot(x - a[0] - dx * t, z - a[2] - dz * t); if (d < m) m = d; } return m; };
  // TRASA: garáž (sever) → ulice na západ → dolů západní ulicí → hlavní ulice na východ → původní silnice k státovce
  // [x, z-relativně-k-ZB]; měřítko druhé mapy odhadnuto ~1,05 m/px. Body klidně upravuj.
  const CP = [
    [85, -962], [85, -946], [83, -940], [76, -936], [62, -935], [30, -936], [-10, -938], [-50, -939], [-80, -938], [-91, -933], [-96, -922],   // garáž + horní ulice
    [-97, -893], [-99, -850], [-99, -809], [-97, -775], [-95, -741], [-92, -708], [-88, -673], [-85, -636], [-82, -599], [-78, -575],         // západní ulice dolů
    [-72, -558], [-62, -542], [-47, -531], [-25, -526], [10, -524], [46, -523], [70, -522], [84, -516], [90, -500],                           // hlavní ulice na východ
    [96, -470], [70, -410], [62, -350], [40, -290], [34, -230], [12, -170], [-2, -110], [-4, -55], [0, -14], [0, 0]                           // původní trasa
  ];
  const curveA = new T.CatmullRomCurve3(CP.map(p => new T.Vector3(p[0], 0, ZB + p[1])), false, 'centripetal'), LA = curveA.getLength(), NA = Math.round(LA / 3), DS = LA / NA;
  const pathA = curveA.getSpacedPoints(NA).map(v => [v.x, prof(v.z), v.z]);
  const pathC = [[0, HP, ZB], [-3, HP, ZB + 35], [-12, HP, ZB + 75]];   // vedlejší silnice na jih
  const pathAt = s => { const f = clamp(s / DS, 0, NA - .001), i = Math.floor(f), t = f - i, a = pathA[i], b = pathA[i + 1], tx = b[0] - a[0], tz = b[2] - a[2], l = Math.hypot(tx, tz) || 1; return { x: a[0] + tx * t, z: a[2] + tz * t, tx: tx / l, tz: tz / l }; };
  const nearestS = (x, z) => { let bi = 0, bd = 1e12; for (let i = 0; i < pathA.length; i++) { const d = (x - pathA[i][0]) ** 2 + (z - pathA[i][2]) ** 2; if (d < bd) { bd = d; bi = i; } } return bi * DS; };
  const S0 = nearestS(90, ZB - 500);   // vzdálenost po trase k hlavní ulici (začátek původní mapy)
  const wB = x => 7 + 3.5 * sm(SX - 190, SX - 155, x) * (1 - sm(SX + 55, SX + 90, x));   // státovka: u benzinky třípruh
  const laneOff = x => 1.75 + (wB(x) - 7) / 2;
  const dRoad = (x, z) => Math.min(distPath(x, z, pathA), Math.hypot(x - clamp(x, -220, 700), z - ZB), distPath(x, z, pathC));
  const dStat = (x, z) => Math.hypot(Math.max(Math.abs(x - SX) - 75, 0), Math.max(Math.abs(z - (ZB - 25)) - 27, 0));
  const H = (x, z) => prof(z) + noise(x, z) * sm(9, 70, dRoad(x, z)) * sm(10, 60, dStat(x, z));
  let seed = 11; const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

  /* ---------- renderer, nálada, obloha s mraky ---------- */
  const renderer = new T.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
  const AN = renderer.capabilities.getMaxAnisotropy();
  renderer.setPixelRatio(1); renderer.setSize(RES[resKey][0], RES[resKey][1], false);
  renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(55, 16 / 9, .1, 1900);
  scene.fog = new T.FogExp2(0xffffff, .0036);
  const hemi = new T.HemisphereLight(0xaec8ff, 0x5a4a30, .62), sun = new T.DirectionalLight(0xffc48a, 3.1), moonL = new T.DirectionalLight(0x6f86d8, 0);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -55, right: 55, top: 55, bottom: -55, near: 1, far: 280 });
  sun.shadow.bias = -.0003; sun.shadow.normalBias = .04; scene.add(hemi, sun, sun.target, moonL);
  const C = (r, g, b) => new T.Color(r, g, b), SUN = new T.Vector3();
  const MOODS = {
    golden: { top: C(.07, .24, .62), bot: C(1, .5, .22), dir: [-.7, .25, .5], si: 3.1, fog: .0036, hemi: .62, exp: 1.05 },
    noon: { top: C(.04, .18, .7), bot: C(.55, .75, 1), dir: [-.3, .85, .3], si: 3.6, fog: .0018, hemi: .85, exp: 1 },
    fog: { top: C(.45, .5, .56), bot: C(.62, .65, .68), dir: [-.5, .35, .4], si: 1.1, fog: .011, hemi: .95, exp: 1.1 }
  };
  let mood = MOODS[saved.mood] ? saved.mood : 'golden', nightV = 0;
  const skyU = { top: { value: new T.Color() }, bot: { value: new T.Color() }, sun: { value: SUN }, moon: { value: new T.Vector3(.3, .55, .4).normalize() }, night: { value: 0 }, time: { value: 0 }, cloud: { value: 1 } };
  const skyMat = new T.ShaderMaterial({
    uniforms: skyU, side: T.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 v;void main(){v=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `#include <tonemapping_pars_fragment>
#include <encodings_pars_fragment>
uniform vec3 top,bot,sun,moon;uniform float night,time,cloud;varying vec3 v;
float hs(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float ns(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hs(i),hs(i+vec2(1.,0.)),f.x),mix(hs(i+vec2(0.,1.)),hs(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<6;i++){s+=a*ns(p);p*=2.03;a*=.5;}return s;}
void main(){float h=clamp(v.y*1.4+.12,0.,1.);vec3 c=mix(bot,top,pow(h,.55));
float s=max(dot(v,sun),0.);c+=vec3(1.,.72,.4)*(pow(s,900.)*4.+pow(s,14.)*.45+pow(s,3.)*.12)*(1.-night);
float m=max(dot(v,moon),0.);c+=vec3(.8,.85,1.)*(pow(m,1500.)*3.+pow(m,40.)*.12)*night;
float st=step(.9975,fract(sin(dot(floor(v*230.),vec3(12.9898,78.233,37.719)))*43758.5453));c+=vec3(st)*night*step(.1,v.y);
if(v.y>.02){vec2 cp=v.xz/(v.y+.18)*1.5+vec2(time*.012,0.);float cl=smoothstep(.5-.12*cloud,.82-.1*cloud,fbm(cp));
float lt=pow(max(dot(normalize(v.xz+1e-4),normalize(sun.xz+1e-4)),0.),2.)*.5+.5;vec3 cc=mix(vec3(.5,.45,.5),vec3(1.,.78,.58),lt)*mix(1.,.12,night);
cc*=1.-.25*smoothstep(.55,.9,fbm(cp*1.7+3.));
c=mix(c,cc,cl*.8*smoothstep(.02,.25,v.y));}
gl_FragColor=vec4(c,1.);
#include <tonemapping_fragment>
#include <encodings_fragment>
}`
  });
  const sky = new T.Mesh(new T.SphereGeometry(950, 32, 20), skyMat); sky.renderOrder = -1; sky.frustumCulled = false; scene.add(sky);
  const nTop = C(0, .002, .02), nBot = C(.004, .008, .03), lit = [], carEnv = [];
  function setNight(n) {
    const m = MOODS[mood]; nightV = n; SUN.set(...m.dir).normalize(); skyU.cloud.value = mood === 'fog' ? 1.6 : 1;
    skyU.night.value = n; skyU.top.value.copy(m.top).lerp(nTop, n); skyU.bot.value.copy(m.bot).lerp(nBot, n); scene.fog.color.copy(skyU.bot.value); scene.fog.density = m.fog * (1 + n * .6);
    sun.intensity = lerp(m.si, 0, n); moonL.intensity = n * .7; hemi.intensity = lerp(m.hemi, .2, n); renderer.toneMappingExposure = lerp(m.exp, 1.3, n);
    lit.forEach(l => { l.m.emissiveIntensity !== undefined ? l.m.emissiveIntensity = l.k * n : l.m.intensity = l.k * n; });
    carEnv.forEach(q => q.envMapIntensity = lerp(1, .12, n));
  }
  setNight(0);
  let envTex = null;
  try { const es = new T.Scene(); es.add(new T.Mesh(new T.SphereGeometry(100, 32, 16), skyMat)); envTex = new T.PMREMGenerator(renderer).fromScene(es).texture; } catch (e) { }
  // dodatečné efekty: bloom, filmový grading, vinětace, FXAA
  let composer = null, finalPass = null, fxPass = null, fxOn = true;
  (() => {
    try {
      if (!(T.EffectComposer && T.RenderPass && T.UnrealBloomPass && T.ShaderPass && T.FXAAShader && renderer.capabilities.isWebGL2)) return;
      const W2 = RES[resKey][0], H2 = RES[resKey][1];
      const rt = new T.WebGLRenderTarget(W2, H2, { type: T.HalfFloatType, format: T.RGBAFormat, minFilter: T.LinearFilter, magFilter: T.LinearFilter });
      const cp = new T.EffectComposer(renderer, rt); cp.setSize(W2, H2); cp.addPass(new T.RenderPass(scene, camera));
      cp.addPass(new T.UnrealBloomPass(new T.Vector2(W2, H2), .55, .7, .86));
      finalPass = new T.ShaderPass({
        uniforms: { tDiffuse: { value: null }, exposure: { value: 1 }, time: { value: 0 }, res: { value: new T.Vector2(W2, H2) } },
        vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader: `varying vec2 vUv;uniform sampler2D tDiffuse;uniform float exposure,time;uniform vec2 res;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){vec2 q0=vUv-.5;float ab=dot(q0,q0)*.0016;
vec3 c=vec3(texture2D(tDiffuse,vUv+q0*ab).r,texture2D(tDiffuse,vUv).g,texture2D(tDiffuse,vUv-q0*ab).b)*exposure*.8;c=aces(c);float l=dot(c,vec3(.299,.587,.114));
c=mix(c,c*vec3(1.07,1.,.9),l);c=mix(vec3(l),c,1.14);c=pow(c,vec3(1./2.2));
vec2 q=vUv-.5;c*=mix(.58,1.,smoothstep(.9,.25,length(q*vec2(1.1,1.3))));
c+=(fract(sin(dot(vUv*res+time,vec2(12.9898,78.233)))*43758.5453)-.5)*.016;gl_FragColor=vec4(c,1.);}`
      }); cp.addPass(finalPass);
      fxPass = new T.ShaderPass(T.FXAAShader); fxPass.material.uniforms.resolution.value.set(1 / W2, 1 / H2); cp.addPass(fxPass);
      composer = cp; renderer.toneMapping = T.NoToneMapping;
    } catch (e) { composer = null; }
  })();
  function setFx(on) { fxOn = on; renderer.toneMapping = on && composer ? T.NoToneMapping : T.ACESFilmicToneMapping; }
  function setRes(k) {
    resKey = k; const w = RES[k][0], h = RES[k][1];
    renderer.setPixelRatio(1); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    const sh = w >= 1920 ? 4096 : 2048; sun.shadow.mapSize.set(sh, sh); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    if (composer) { composer.setSize(w, h); fxPass.material.uniforms.resolution.value.set(1 / w, 1 / h); finalPass.uniforms.res.value.set(w, h); }
  }

  /* ---------- textury ---------- */
  const cvs = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; };
  const tex = (c, rx = 1, ry = 1) => { const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = AN; return t; };
  const label = (lines, w, h, bg, fg, fs = 54) => tex(cvs(w, h, g => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach((s, i) => { g.font = `bold ${i ? fs * .55 : fs}px Arial, sans-serif`; g.fillText(s, w / 2, h * (lines.length === 1 ? .5 : .36 + i * .34)); });
  }));
  const std = o => new T.MeshStandardMaterial(o);
  const board = (t, w, h, emissive) => { const e = std({ color: 0x555a5e, roughness: .6 }), f = emissive ? new T.MeshBasicMaterial({ map: t }) : std({ map: t, roughness: .55 }); const m = new T.Mesh(new T.BoxGeometry(w, h, .1), [e, e, e, e, f, f]); m.castShadow = true; return m; };
  const speckle = (g, w, h, n, lo, hi, a) => { for (let i = 0; i < n; i++) { const v = lo + rnd() * (hi - lo) | 0; g.fillStyle = `rgba(${v},${v},${v + 3},${a})`; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2.5, 1 + rnd() * 2.5); } };
  const roadTex = lanes => tex(cvs(512, 1024, (g, w, h) => {
    g.fillStyle = '#3a3c3f'; g.fillRect(0, 0, w, h); speckle(g, w, h, 30000, 40, 105, .5);
    for (let i = 0; i < 16; i++) { g.fillStyle = `rgba(${rnd() < .5 ? '25,25,27' : '70,72,75'},.28)`; g.fillRect(w * .08 + rnd() * w * .7, rnd() * h, 50 + rnd() * 120, 30 + rnd() * 140); }   // záplaty
    g.fillStyle = 'rgba(0,0,0,.16)'; for (const c of lanes === 2 ? [.25, .75] : [.17, .5, .83]) g.fillRect(w * c - 30, 0, 60, h);   // vyjeté koleje
    for (let i = 0; i < 46; i++) { g.strokeStyle = 'rgba(12,12,12,.45)'; g.lineWidth = 1 + rnd() * 1.4; g.beginPath(); let x = rnd() * w, y = rnd() * h; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (rnd() - .5) * 30; y += rnd() * 36; g.lineTo(x, y); } g.stroke(); }   // praskliny
    g.fillStyle = '#d9d7cd'; g.fillRect(w * .04, 0, 10, h); g.fillRect(w * .96 - 10, 0, 10, h);
    if (lanes === 2) g.fillRect(w / 2 - 6, 0, 12, h * .45); else { g.fillRect(w / 3 - 6, 0, 12, h * .6); g.fillRect(w * 2 / 3 - 6, 0, 12, h * .6); }
    speckle(g, w, h, 5000, 150, 215, .22);   // otěr čar a zrnitost
  }));
  const plainAsph = tex(cvs(512, 512, (g, w, h) => { g.fillStyle = '#4d4f52'; g.fillRect(0, 0, w, h); speckle(g, w, h, 20000, 60, 125, .5); for (let i = 0; i < 20; i++) { g.fillStyle = 'rgba(20,20,22,.2)'; g.fillRect(rnd() * w, rnd() * h, 40 + rnd() * 90, 30 + rnd() * 90); } }), 30, 9);
  const arrowTex = tex(cvs(128, 256, g => { g.strokeStyle = g.fillStyle = '#e9e9e4'; g.lineWidth = 24; g.lineCap = 'butt'; g.beginPath(); g.moveTo(70, 250); g.lineTo(70, 150); g.quadraticCurveTo(70, 100, 40, 96); g.stroke(); g.beginPath(); g.moveTo(10, 98); g.lineTo(52, 66); g.lineTo(52, 130); g.closePath(); g.fill(); }));
  const grassTex = tex(cvs(512, 512, (g, w, h) => { g.fillStyle = '#b4b4b4'; g.fillRect(0, 0, w, h); for (let i = 0; i < 26000; i++) { const v = 110 + rnd() * 130 | 0; g.fillStyle = `rgba(${v},${v},${v},.38)`; g.fillRect(rnd() * w, rnd() * h, 1.5, 3 + rnd() * 2); } for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${rnd() < .5 ? 255 : 90},${rnd() < .5 ? 255 : 90},${rnd() < .5 ? 255 : 90},.05)`; g.beginPath(); g.arc(rnd() * w, rnd() * h, 6 + rnd() * 26, 0, 7); g.fill(); } }), 190, 190);
  const plaster = tex(cvs(256, 256, (g, w, h) => { g.fillStyle = '#d8d4cc'; g.fillRect(0, 0, w, h); for (let i = 0; i < 3500; i++) { const v = 165 + rnd() * 75 | 0; g.fillStyle = `rgba(${v},${v - 4},${v - 12},.35)`; g.fillRect(rnd() * w, rnd() * h, 2, 2); } for (let i = 0; i < 14; i++) { g.fillStyle = 'rgba(90,80,60,.06)'; g.fillRect(rnd() * w, rnd() * h, 6 + rnd() * 14, 30 + rnd() * 70); } }), 2, 2);
  const tiles = tex(cvs(128, 128, (g, w, h) => {
    g.fillStyle = '#9a4a30'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) { const v = rnd() * 40 | 0; g.fillStyle = `rgba(${90 + v},${30 + v / 2},${20},.35)`; g.fillRect(rnd() * w, rnd() * h, 3, 3); }
    g.strokeStyle = 'rgba(40,12,6,.55)'; g.lineWidth = 3;
    for (let y = 0; y < h; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); for (let x = (y / 16 % 2) * 16; x < w; x += 32) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 16); g.stroke(); } }
  }), 6, 3);
  const solar = tex(cvs(256, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#1b2a4d'); gr.addColorStop(1, '#0f1a35'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(150,170,210,.6)'; g.lineWidth = 2; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 32); g.lineTo(w, i * 32); g.stroke(); }
  }), 3, 3);
  const tuftTex = tex(cvs(128, 192, g => {
    for (let i = 0; i < 26; i++) { const x = 16 + rnd() * 96, hgt = 80 + rnd() * 100, l = 70 + rnd() * 70 | 0; g.strokeStyle = `rgb(${l * .55 | 0},${l + 40},${l * .3 | 0})`; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, 192); g.quadraticCurveTo(x + (rnd() - .5) * 20, 192 - hgt / 2, x + (rnd() - .5) * 48, 192 - hgt); g.stroke(); }
  }));
  const winMat = std({ color: 0x1c2a34, roughness: .2, metalness: .4, emissive: 0xffb85c, emissiveIntensity: 0 }); lit.push({ m: winMat, k: 2.4 });
  const lampMat = std({ color: 0xfff6d8, emissive: 0xfff0c0, emissiveIntensity: 0, roughness: .2 }); lit.push({ m: lampMat, k: 3 });

  /* ---------- terén ---------- */
  const tg = new T.PlaneGeometry(1100, 1320, 300, 360); tg.rotateX(-Math.PI / 2); tg.translate(250, 0, -1060);
  const tp = tg.attributes.position, tcol = new Float32Array(tp.count * 3);
  const mixN = (a, b, t) => a + (b - a) * clamp(t, 0, 1);
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i), z = tp.getZ(i); tp.setY(i, H(x, z));
    const n = (Math.sin(x * .05) * Math.cos(z * .043) * .5 + .5) * .7 + sm(430, 520, -z) * .1 + (Math.sin(x * .21 + z * .17) * .5 + .5) * .08;
    const wheat = sm(14, 40, z - ZB) * .9, crop = sm(30, 70, x) * sm(40, 100, ZB - z) * sm(ZB - 380, ZB - 330, z) * .95 + sm(SX + 55, SX + 90, x) * sm(12, 40, ZB - z) * .9;
    let r = mixN(.1, .26, n), g = mixN(.2, .24, n), b = mixN(.05, .07, n);
    r = mixN(r, .4, wheat); g = mixN(g, .3, wheat); b = mixN(b, .08, wheat);
    r = mixN(r, .05, crop); g = mixN(g, .2, crop); b = mixN(b, .03, crop);
    const j = (Math.sin(x * 1.3) * Math.cos(z * 1.1)) * .012; tcol.set([r + j, g + j, b + j * .5], i * 3);
  }
  tg.setAttribute('color', new T.BufferAttribute(tcol, 3)); tg.computeVertexNormals();
  const terrain = new T.Mesh(tg, std({ vertexColors: true, map: grassTex, roughness: 1 })); terrain.receiveShadow = true; scene.add(terrain);

  /* ---------- silnice ---------- */
  function ribbon(pts, W, mat, yo) {
    const pos = [], uv = [], idx = []; let d = 0;
    pts.forEach((p, i) => {
      const w = typeof W === 'function' ? W(p[0]) : W;
      if (i) d += Math.hypot(p[0] - pts[i - 1][0], p[2] - pts[i - 1][2]);
      const q = pts[Math.min(i + 1, pts.length - 1)], o = pts[Math.max(i - 1, 0)]; let tx = q[0] - o[0], tz = q[2] - o[2]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
      pos.push(p[0] - tz * w / 2, p[1] + yo, p[2] + tx * w / 2, p[0] + tz * w / 2, p[1] + yo, p[2] - tx * w / 2); uv.push(0, d / 12, 1, d / 12);
      if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    });
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = new T.Mesh(g, mat); m.receiveShadow = true; scene.add(m); return m;
  }
  const rmat = (map, f) => std({ map, roughness: .93, side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: f, polygonOffsetUnits: f });
  const road2 = rmat(roadTex(2), -2), road3 = rmat(roadTex(3), -4), plainMat = rmat(plainAsph, -3);
  const line = (x0, x1, st0) => { const a = []; for (let x = x0; x <= x1 + .1; x += st0) a.push([x, HP, ZB]); return a; };
  ribbon(pathA, 7, road2, .07);
  ribbon(line(-220, SX - 190, 6), 7, rmat(roadTex(2), -3), .09); ribbon(line(SX - 190, SX + 90, 3), wB, road3, .1); ribbon(line(SX + 90, 700, 6), 7, rmat(roadTex(2), -3), .09);
  ribbon(pathC, 6, plainMat, .08);
  // šipky odbočení vlevo ve středním pruhu před vjezdem
  for (const dx of [18, 42]) { const g0 = new T.PlaneGeometry(1.5, 3.8).rotateX(-Math.PI / 2), m = new T.Mesh(g0, new T.MeshBasicMaterial({ map: arrowTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 })); m.rotation.y = -Math.PI / 2; m.position.set(SX + dx, HP + .12, ZB); scene.add(m); }
  const slipDef = [[[62, 0], [62.5, 6], [59, 12], [52, 17.5], [44, 21.5], [36, 24.5]], [[-62, 0], [-62.5, 6], [-59, 12], [-52, 17.5], [-44, 21.5], [-36, 24.5]]];
  const slips = slipDef.map(d => new T.CatmullRomCurve3(d.map(p => { const w = at(p[0], p[1]); return new T.Vector3(w[0], HP, w[1]); })).getPoints(28).map(v => [v.x, v.y, v.z]));
  slips.forEach(p => ribbon(p, 6.5, plainMat, .07));
  const apron = new T.Mesh(new T.PlaneGeometry(110, 31), plainMat); apron.rotation.x = -Math.PI / 2; { const a = at(-3, 32.5); apron.position.set(a[0], HP + .05, a[1]); } apron.receiveShadow = true; scene.add(apron);
  const onApron = (x, z) => x > SX - 58 && x < SX + 52 && z < ZB - 17 && z > ZB - 48;
  const onB = (x, z) => x > -220 && x < 700 && Math.abs(z - ZB) < wB(x) / 2;
  const roadAt = (x, z) => (z < ZB + 4 && distPath(x, z, pathA) < 3.6) || onB(x, z) || onApron(x, z) || (z > ZB && distPath(x, z, pathC) < 3) || (x > SX + 20 && z < ZB + 3 && distPath(x, z, slips[0]) < 3.4) || (x < SX - 20 && z < ZB + 3 && distPath(x, z, slips[1]) < 3.4);
  const ground = (x, z) => H(x, z) + (onB(x, z) ? .09 : roadAt(x, z) ? .07 : 0);
  // směrové sloupky podél státovky
  { const pm = new T.InstancedMesh(new T.BoxGeometry(.12, 1, .12), std({ color: 0xf0f0f0, roughness: .6 }), 60), dm0 = new T.Object3D(); let k = 0;
    for (let x = 0; x < 700 && k < 60; x += 46) for (const s of [-1, 1]) { if (k >= 60) break; const z = ZB + s * (wB(x) / 2 + 1.6); dm0.position.set(x, HP + .5, z); dm0.updateMatrix(); pm.setMatrixAt(k++, dm0.matrix); }
    pm.count = k; pm.castShadow = true; scene.add(pm); }

  /* ---------- vesnice, garáž, kostel, stromy, tráva ---------- */
  const coneG = new T.ConeGeometry(.7071, 1, 4).rotateY(Math.PI / 4);
  const chimM = std({ color: 0x8a5a45, roughness: 1 }), frameM = std({ color: 0xeeeae0, roughness: .8 });
  function house(x, z, w, d, h, col, roofCol, facing) {
    const g = new T.Group(), y = H(x, z) - .1; g.position.set(x, y, z); g.rotation.y = facing;
    const wall = new T.Mesh(new T.BoxGeometry(w, h + 1.5, d), std({ color: col, map: plaster, roughness: .95 })); wall.position.y = (h - 1.5) / 2; wall.castShadow = wall.receiveShadow = true;
    const roof = new T.Mesh(coneG, std({ color: roofCol, map: tiles, roughness: .8 })); roof.scale.set(w * 1.14, 3.4, d * 1.14); roof.position.y = h + 1.7; roof.castShadow = true;
    const door = new T.Mesh(new T.BoxGeometry(1, 2, .12), std({ color: 0x4a3322, roughness: .8 })); door.position.set(0, 1, d / 2 + .02);
    const chim = new T.Mesh(new T.BoxGeometry(.7, 2.2, .7), chimM); chim.position.set(w * .22, h + 2.3, d * .12); chim.castShadow = true;
    g.add(wall, roof, door, chim);
    for (const sx of [-w * .3, w * .3]) { const fr = new T.Mesh(new T.PlaneGeometry(1.2, 1.4), frameM); fr.position.set(sx, 2.2, d / 2 + .02); g.add(fr); }
    for (const [sx, sz, ry] of [[-w * .3, d / 2 + .03, 0], [w * .3, d / 2 + .03, 0], [-w * .3, -d / 2 - .03, Math.PI], [w * .3, -d / 2 - .03, Math.PI], [w / 2 + .03, 0, Math.PI / 2], [-w / 2 - .03, 0, -Math.PI / 2]]) {
      const wi = new T.Mesh(new T.PlaneGeometry(.95, 1.15), winMat); wi.position.set(sx, 2.2, sz); wi.rotation.y = ry; g.add(wi);
    }
    scene.add(g);
  }
  const walls = [0xe9dcc0, 0xd9c19a, 0xcfd9c4, 0xe3c8c4, 0xd8d4cc], roofs = [0x9a4a30, 0x7d3a2a, 0x5f4538];
  for (let s = 26, i = 0; s < LA - 75; s += 30 + rnd() * 10, i++) for (const side of [-1, 1]) {
    if (rnd() < .18) continue; const p = pathAt(s), off = (10 + rnd() * 4) * side, x = p.x - p.tz * off, z = p.z + p.tx * off;
    if (distPath(x, z, pathA) < Math.abs(off) * .85) continue;   // v zatáčkách by dům ležel na jiné silnici
    house(x, z, 8 + rnd() * 4, 7 + rnd() * 3, 4 + rnd() * 1.5, walls[(i + (side > 0 ? 2 : 0)) % 5], roofs[i % 3], Math.atan2(p.x - x, p.z - z));
  }
  // Kotlikova garáž + dům (tady se začíná)
  const GP = pathAt(0), GX = GP.x - GP.tz * 1.75, GZ = GP.z + GP.tx * 1.75; let garageHide = [];
  (() => {
    const g = new T.Group(); g.position.set(GX, H(GX, GZ) - .05, GZ); g.rotation.y = Math.atan2(GP.tx, GP.tz);
    const wm = std({ color: 0xd8d4cc, map: plaster, roughness: .95 }), rm = std({ color: 0x5b5f63, roughness: .55, metalness: .5 }), fl = std({ color: 0x8c8f92, roughness: .9 });
    const add = (w, h, d, m, x, y, z) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
    add(7.2, .12, 9.4, fl, 0, .06, .6);
    add(.3, 3.2, 8, wm, -3.35, 1.6, 0); add(.3, 3.2, 8, wm, 3.35, 1.6, 0);
    garageHide.push(add(7, 3.2, .3, wm, 0, 1.6, -4), add(7.4, .3, 8.4, rm, 0, 3.35, 0));
    add(7, .55, .3, rm, 0, 2.95, 4);   // schránka s vyvinutou rolovací bránou
    for (let k = 0; k < 4; k++) add(6.6, .06, .05, rm, 0, 3.2 - k * .12, 4.1);
    scene.add(g);
    house(GX + 11, GZ - 1, 10, 8, 4.5, 0xe3c8c4, 0x7d3a2a, 0);
  })();
  (() => {
    const p = pathAt(S0 + 40), x = p.x + p.tz * 26, z = p.z - p.tx * 26, g = new T.Group(); g.position.set(x, H(x, z) - .1, z); g.rotation.y = Math.atan2(p.x - x, p.z - z) + Math.PI / 2;
    const m = std({ color: 0xece4d4, map: plaster, roughness: .95 });
    const nave = new T.Mesh(new T.BoxGeometry(9, 9, 16), m); nave.position.y = 3; const tw = new T.Mesh(new T.BoxGeometry(4.4, 20, 4.4), m); tw.position.set(0, 8.5, 9);
    const sp = new T.Mesh(new T.ConeGeometry(3.2, 8, 4).rotateY(Math.PI / 4), std({ color: 0x4a3f3a, roughness: .7 })); sp.position.set(0, 22.5, 9);
    const rf = new T.Mesh(coneG, std({ color: 0x7d3a2a, map: tiles })); rf.scale.set(10, 4.5, 17); rf.position.set(0, 9.7, 0);
    const cr = new T.Mesh(new T.BoxGeometry(.25, 2.4, .25), std({ color: 0x222222 })); cr.position.set(0, 28, 9); const cr2 = new T.Mesh(new T.BoxGeometry(1.4, .25, .25), cr.material); cr2.position.set(0, 28.4, 9);
    [nave, tw, sp, rf, cr, cr2].forEach(o => { o.castShadow = true; g.add(o); }); scene.add(g);
  })();
  // ploty podél vesnických ulic
  { const fm = new T.InstancedMesh(new T.BoxGeometry(3, .9, .1), std({ color: 0xcfc6b0, roughness: .9 }), 900), fd = new T.Object3D(); let k = 0;
    for (let s = 30; s < LA - 140 && k < 900; s += 3.1) { const p = pathAt(s); for (const side of [-1, 1]) {
      if (rnd() < .22) continue; const off = 4.9 * side, x = p.x - p.tz * off, z = p.z + p.tx * off; if (distPath(x, z, pathA) < 4.5) continue;
      fd.position.set(x, H(x, z) + .45, z); fd.rotation.set(0, Math.atan2(-p.tz, p.tx), 0); fd.updateMatrix(); fm.setMatrixAt(k++, fd.matrix); } }
    fm.count = k; fm.castShadow = true; scene.add(fm); }
  // pouliční lampy (v noci svítí)
  { const pg = new T.InstancedMesh(new T.CylinderGeometry(.07, .09, 6, 8), std({ color: 0x555a5e, metalness: .7, roughness: .5 }), 60), hg = new T.InstancedMesh(new T.BoxGeometry(1.1, .16, .4), lampMat, 60), ld = new T.Object3D(); let k = 0, sd = 1;
    for (let s = 40; s < LA - 110 && k < 60; s += 46) { const p = pathAt(s), off = 4.1 * sd, x = p.x - p.tz * off, z = p.z + p.tx * off; sd = -sd; if (distPath(x, z, pathA) < 3.9) continue;
      ld.position.set(x, H(x, z) + 3, z); ld.rotation.set(0, 0, 0); ld.updateMatrix(); pg.setMatrixAt(k, ld.matrix);
      ld.position.set(x - p.tz * .5 * -sd, H(x, z) + 6.05, z + p.tx * .5 * -sd); ld.rotation.set(0, Math.atan2(-p.tz, p.tx), 0); ld.updateMatrix(); hg.setMatrixAt(k++, ld.matrix); }
    pg.count = hg.count = k; pg.castShadow = true; scene.add(pg, hg); }
  const trunkG = new T.CylinderGeometry(.25, .42, 4, 7).translate(0, 2, 0), crownG = new T.IcosahedronGeometry(1, 2), pineG = new T.ConeGeometry(1.7, 5, 10).translate(0, 3.5, 0), pineG2 = new T.ConeGeometry(1.2, 4, 10).translate(0, 6.6, 0);
  const NT = 1100, trunks = new T.InstancedMesh(trunkG, std({ color: 0x4a3626, roughness: 1 }), NT), c1 = new T.InstancedMesh(crownG, std({ roughness: .95 }), NT), c2 = new T.InstancedMesh(crownG, std({ roughness: .95 }), NT), c3 = new T.InstancedMesh(crownG, std({ roughness: .95 }), NT),
    pines = new T.InstancedMesh(pineG, std({ roughness: .95 }), NT), pines2 = new T.InstancedMesh(pineG2, std({ roughness: .95 }), NT);
  const dm = new T.Object3D(), tc = new T.Color(); let ti = 0, pi2 = 0;
  for (let k = 0; k < 24000 && ti + pi2 < NT; k++) {
    const x = -290 + rnd() * 1080, z = -1700 + rnd() * 1290, dr = dRoad(x, z);
    if (dr < (z < ZB - 60 ? 22 : 13) || dStat(x, z) < 12 || (x > SX + 55 && x < SX + 85 && z > ZB - 40 && z < ZB + 5)) continue;
    if (Math.hypot(x - GX, z - GZ) < 30) continue;
    const forest = x < 10 && z < ZB - 40 ? .5 : 0;
    if (Math.sin(x * .03) * Math.cos(z * .025) + rnd() * .8 + forest < .1) continue;
    const y = H(x, z), s = .8 + rnd() * .9;
    if (rnd() < .35) {
      dm.position.set(x, y, z); dm.rotation.set(0, rnd() * 6, 0); dm.scale.set(s, s * (1 + rnd() * .4), s); dm.updateMatrix(); pines.setMatrixAt(pi2, dm.matrix); pines2.setMatrixAt(pi2, dm.matrix);
      tc.setRGB(.03 + rnd() * .04, .1 + rnd() * .06, .04 + rnd() * .03); pines.setColorAt(pi2, tc); tc.multiplyScalar(1.15); pines2.setColorAt(pi2, tc); pi2++;
    } else {
      dm.position.set(x, y, z); dm.rotation.set(0, rnd() * 6, 0); dm.scale.set(s, s, s); dm.updateMatrix(); trunks.setMatrixAt(ti, dm.matrix);
      const ox = (rnd() - .5) * 1.4 * s, oz = (rnd() - .5) * 1.4 * s;
      dm.position.set(x, y + 4.6 * s, z); dm.scale.set(3.2 * s, 2.8 * s, 3.2 * s); dm.updateMatrix(); c1.setMatrixAt(ti, dm.matrix);
      dm.position.set(x, y + 7 * s, z); dm.scale.set(2.2 * s, 2.2 * s, 2.2 * s); dm.updateMatrix(); c2.setMatrixAt(ti, dm.matrix);
      dm.position.set(x + ox, y + 5.6 * s, z + oz); dm.scale.set(2.3 * s, 2 * s, 2.3 * s); dm.updateMatrix(); c3.setMatrixAt(ti, dm.matrix);
      tc.setRGB(.05 + rnd() * .08, .15 + rnd() * .1, .03 + rnd() * .04); c1.setColorAt(ti, tc); tc.multiplyScalar(1.12); c2.setColorAt(ti, tc); c3.setColorAt(ti, tc); ti++;
    }
  }
  [trunks, c1, c2, c3].forEach(m => { m.count = ti; m.castShadow = true; scene.add(m); }); pines.count = pines2.count = pi2; pines.castShadow = pines2.castShadow = true; scene.add(pines, pines2);
  const NG = 14000, tuftG = new T.PlaneGeometry(.7, .9).translate(0, .45, 0), tuftM = std({ map: tuftTex, alphaTest: .45, side: T.DoubleSide, roughness: 1 });
  const tu1 = new T.InstancedMesh(tuftG, tuftM, NG), tu2 = new T.InstancedMesh(tuftG, tuftM, NG); let gi = 0;
  for (let k = 0; k < 50000 && gi < NG; k++) {
    let x, z;
    if (rnd() < .6) { const p = pathAt(rnd() * LA), off = (rnd() < .5 ? -1 : 1) * (4.5 + rnd() * 10); x = p.x - p.tz * off; z = p.z + p.tx * off; } else { x = -200 + 900 * rnd(); z = ZB + (rnd() < .5 ? -1 : 1) * (6 + rnd() * 11); }
    if (onApron(x, z) || onB(x, z) || distPath(x, z, slips[0]) < 5 || distPath(x, z, slips[1]) < 5 || distPath(x, z, pathA) < 3.8) continue;
    const y = H(x, z), s = .7 + rnd() * .8, a = rnd() * 3; tc.setRGB(.7 + rnd() * .5, .8 + rnd() * .4, .6 + rnd() * .3);
    dm.position.set(x, y - .02, z); dm.rotation.set(0, a, 0); dm.scale.set(s, s, s); dm.updateMatrix(); tu1.setMatrixAt(gi, dm.matrix); tu1.setColorAt(gi, tc);
    dm.rotation.set(0, a + Math.PI / 2, 0); dm.updateMatrix(); tu2.setMatrixAt(gi, dm.matrix); tu2.setColorAt(gi, tc); gi++;
  }
  tu1.count = tu2.count = gi; scene.add(tu1, tu2);
  const bushM = std({ color: 0x1f4a22, roughness: 1 });
  for (let k = 0; k < 4; k++) for (let j = 0; j < 8; j++) { const b = new T.Mesh(crownG, bushM); b.scale.set(3, 2.4, 3); b.position.set(-12 + j * 3.6, HP + 1, ZB + 28 + (j % 2) * 2 + k * .01); b.castShadow = true; scene.add(b); }

  /* ---------- cedule, sloupy, billboard ---------- */
  function signPost(t, x, z, ry, w, h, yTop) {
    const y = H(x, z), b = board(t, w, h); b.position.set(x, y + yTop, z); b.rotation.y = ry;
    const p = new T.Mesh(new T.CylinderGeometry(.06, .06, yTop, 8), std({ color: 0x777c80, metalness: .8, roughness: .4 })); p.position.set(x, y + yTop / 2, z); p.castShadow = true; scene.add(b, p);
  }
  { const p = pathAt(S0 + 6); signPost(label(['VRBČANY'], 512, 160, '#f4f4f4', '#111', 80), p.x - p.tz * 5.5 + 0, p.z + p.tx * 5.5, Math.atan2(-p.tx, -p.tz) + Math.PI, 2.6, .8, 2.4); }
  { const p = pathAt(LA - 75); signPost(label(['KM PRONA', '← státovka'], 512, 256, '#1b4fa3', '#fff', 78), p.x - p.tz * 5.8, p.z + p.tx * 5.8, Math.atan2(-p.tx, -p.tz) + Math.PI, 3.4, 1.7, 3.2); }
  signPost(label(['KM PRONA', '→ 150 m'], 512, 256, '#1b4fa3', '#fff', 78), SX - 150, ZB + 9, -Math.PI / 2, 3.4, 1.7, 3.2);
  const bb = board(label(['KOTLIK', 'kotle • záchody • elektro'], 1024, 400, '#ffd21f', '#17262a', 170), 10, 3.9);
  bb.position.set(100, HP + 6, ZB + 12); bb.rotation.y = -Math.PI / 2; scene.add(bb);
  [-5.5, 5.5].forEach(o => { const p = new T.Mesh(new T.CylinderGeometry(.15, .15, 6, 8), std({ color: 0x555555 })); p.position.set(100 + .1, HP + 3, ZB + 12 + o); scene.add(p); });
  const wires = [], poleM = std({ color: 0x4a3a2c, roughness: 1 });
  for (let x = 20; x < 650; x += 50) {
    const p = new T.Mesh(new T.CylinderGeometry(.13, .17, 9, 7), poleM); p.position.set(x, HP + 4.5, ZB + 9); p.castShadow = true; scene.add(p);
    const a = new T.Mesh(new T.BoxGeometry(.2, .2, 3), poleM); a.position.set(x, HP + 8.6, ZB + 9); scene.add(a);
    for (const o of [-1.3, 0, 1.3]) for (let s = 0; s < 8; s++) {
      const f = k => { const t = k / 8; return [x + 50 * t, HP + 8.5 - Math.sin(Math.PI * t) * 1.3, ZB + 9 + o]; };
      wires.push(...f(s), ...f(s + 1));
    }
  }
  const wg = new T.BufferGeometry(); wg.setAttribute('position', new T.Float32BufferAttribute(wires, 3)); scene.add(new T.LineSegments(wg, new T.LineBasicMaterial({ color: 0x0a0a0a })));

  /* ---------- benzinka KM Prona (podle leteckého snímku) ---------- */
  const white = std({ color: 0xe9edf2, roughness: .6 }), blue = std({ color: 0x1c3f86, roughness: .5, metalness: .2 }), glow = std({ color: 0xfff1d0, emissive: 0xffe2a8, emissiveIntensity: 0 }); lit.push({ m: glow, k: 1.5 });
  const put = (m, e, n, y) => { const w = at(e, n); m.position.set(w[0], HP + y, w[1]); m.castShadow = true; scene.add(m); return m; };
  const box = (w, h, d, mat, e, n, y) => put(new T.Mesh(new T.BoxGeometry(w, h, d), mat), e, n, y);
  const wall = std({ color: 0xaeb8c0, roughness: .85 }); box(16.5, 4.6, 11, wall, -3.7, 33.5, 2.3); box(16.8, .3, 11.3, std({ color: 0x4b5258, roughness: .9 }), -3.7, 33.5, 4.75);
  for (const [w, d, e, n] of [[17.4, .5, -3.7, 28], [17.4, .5, -3.7, 39], [.5, 11.5, 5, 33.5], [.5, 11.5, -12.4, 33.5]]) box(w, .7, d, blue, e, n, 4.9);
  const shopWin = new T.Mesh(new T.PlaneGeometry(12, 2.2), winMat); put(shopWin, -3.7, 27.9, 2.3); shopWin.castShadow = false;
  const shopSign = board(label(['KM PRONA'], 1024, 160, '#1c3f86', '#fff', 110), 9, 1.4); put(shopSign, -3.7, 27.8, 4.1);
  box(9, 3.4, 6, std({ color: 0x6b7a8c, roughness: .8 }), -30.5, 30, 1.7); box(9.4, .3, 6.4, std({ color: 0x3c4a60 }), -30.5, 30, 3.5);
  function canopy(e, n, w, d) {
    box(w, .6, d, white, e, n, 5.6);
    const sp = new T.Mesh(new T.PlaneGeometry(w - 1, d - 1), std({ map: solar, roughness: .25, metalness: .6, envMap: envTex })); sp.rotation.x = -Math.PI / 2; put(sp, e, n, 5.92); sp.castShadow = false;
    const un = new T.Mesh(new T.PlaneGeometry(w - .6, d - .6), glow); un.rotation.x = Math.PI / 2; put(un, e, n, 5.28); un.castShadow = false;
    for (const [px, pz] of [[-w / 2 + .5, -d / 2 + .5], [w / 2 - .5, -d / 2 + .5], [-w / 2 + .5, d / 2 - .5], [w / 2 - .5, d / 2 - .5]]) box(.5, 5.4, .5, white, e + px, n + pz, 2.7);
    for (const px of [-w / 4, w / 4]) {
      box(2, .3, 6, std({ color: 0xaaaaa4 }), e + px, n, .15); box(.9, 2.2, .8, std({ color: 0xd8372b, roughness: .4 }), e + px, n, 1.3);
      const sc = new T.Mesh(new T.PlaneGeometry(.55, .5), winMat); put(sc, e + px, n - .41, 1.8); sc.castShadow = false;
    }
    const L = new T.PointLight(0xffd9a0, 0, 42, 1.6); const wp = at(e, n); L.position.set(wp[0], HP + 5, wp[1]); scene.add(L); lit.push({ m: L, k: 5 });
  }
  canopy(17, 38, 10, 10); canopy(16, 27, 9, 9);
  put(board(label(['KM PRONA'], 1024, 160, '#1c3f86', '#fff', 110), 8, 1), 16, 22.4, 5.4).castShadow = false;
  box(.35, 12, .35, white, -50, 12, 6); { const ps = board(label(['KM PRONA', 'Nafta 36,90'], 512, 320, '#1c3f86', '#ffd21f', 100), 3.4, 2.1, true); put(ps, -50, 12, 11.5); }
  box(.08, 2.4, .08, white, -19.5, 19, 1.2); put(board(label(['P'], 256, 256, '#1b4fa3', '#fff', 200), .9, .9), -19.5, 19, 2.55);
  const lineM = new T.MeshBasicMaterial({ color: 0xf2f2f2 });
  for (const e of [-24, -20.5, -19, -16, -14.5, -11.5, -10.5, -7.5]) { const l = new T.Mesh(new T.BoxGeometry(.1, .02, 5.2), lineM); put(l, e, 21.5, .09); l.castShadow = false; }
  const bayG = new T.Group(); { const w = at(-17.5, 21.5); bayG.position.set(w[0], HP + .11, w[1]); } scene.add(bayG);
  const bayPl = new T.Mesh(new T.PlaneGeometry(3, 5.2), new T.MeshBasicMaterial({ color: 0x6ff09a, transparent: true, opacity: .3, depthWrite: false })); bayPl.rotation.x = -Math.PI / 2; bayG.add(bayPl);
  for (const [e, n, s] of [[-32, 14, 1.5], [-28, 15.5, 1.3], [-9, 15, 1.4], [-4, 16.5, 1.6], [-22, 12.5, 1.2], [30, 13, 1.5]]) { const b = new T.Mesh(crownG, bushM); b.scale.set(s, s * .9, s); put(b, e, n, s * .8); }
  for (const e of [-45, -20, 5, 30, 45]) { box(.2, 8, .2, std({ color: 0x777c80 }), e, 18.5, 4); const h = box(1.2, .25, .5, lampMat, e, 18.5, 8.1); h.castShadow = false; }
  (() => {
    const g = new T.Group(); const w = at(68, 12); g.position.set(w[0], HP, w[1]); g.rotation.y = .6;
    const cab = new T.Mesh(new T.BoxGeometry(2.4, 2.8, 2.2), std({ color: 0x244d96, roughness: .5 })); cab.position.set(0, 1.9, 0);
    const tr = new T.Mesh(new T.BoxGeometry(2.5, 2.4, 11), std({ color: 0x9a7b4f, roughness: .9 })); tr.position.set(0, 1.9, 6.8);
    [cab, tr].forEach(o => { o.castShadow = true; g.add(o); }); scene.add(g);
  })();

  /* ---------- auto: Škoda Octavia I Combi v reálných rozměrech (4,51 × 1,73 × 1,43 m, rozvor 2,51 m) ---------- */
  // model: délka = osa X (předek +X), výška = Y, šířka = Z (pravá strana +Z); celý model se otočí, aby předek mířil do -Z
  const baseBody = new T.MeshPhysicalMaterial({ color: 0xbfc4c8, metalness: .85, roughness: .3, clearcoat: 1, clearcoatRoughness: .1, envMap: envTex });
  const glassMat = new T.MeshPhysicalMaterial({ color: 0x07090b, metalness: .9, roughness: .05, envMap: envTex });
  const rimMat = new T.MeshStandardMaterial({ color: 0xc9ced2, metalness: 1, roughness: .25, envMap: envTex });
  const chrome = new T.MeshStandardMaterial({ color: 0xe4e8eb, metalness: 1, roughness: .15, envMap: envTex }); carEnv.push(baseBody, glassMat, rimMat, chrome);
  const trim = std({ color: 0x25282b, roughness: .65, metalness: .2 }), black = std({ color: 0x090a0b, roughness: .75 }), tireM = std({ color: 0x131415, roughness: .9 });
  const smoothGeo = g0 => {
    const p = g0.attributes.position, map = new Map(), pos = [], idx = [];
    for (let i = 0; i < p.count; i++) {
      const k = Math.round(p.getX(i) * 2000) + ',' + Math.round(p.getY(i) * 2000) + ',' + Math.round(p.getZ(i) * 2000); let j = map.get(k);
      if (j === undefined) { j = pos.length / 3; map.set(k, j); pos.push(p.getX(i), p.getY(i), p.getZ(i)); } idx.push(j);
    }
    const o = new T.BufferGeometry(); o.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); o.setIndex(idx); o.computeVertexNormals(); return o;
  };
  const GEO = {};
  (() => {
    const mk = (pts, depth, bevel, arcs) => {
      const s = new T.Shape(); arcs ? arcs(s) : pts.forEach((p, i) => i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])); s.closePath();
      const g0 = new T.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * .8, bevelSegments: 4, curveSegments: 32 });
      g0.translate(0, 0, -depth / 2); const p = g0.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); let z = p.getZ(i); z *= 1 - (x > 0 ? .3 : .16) * Math.pow(sm(.4, 1, Math.abs(x) / 2.3), 1.4); z *= 1 - .1 * sm(1, 1.46, y); p.setZ(i, z); }
      return smoothGeo(g0);
    };
    GEO.body = mk(null, 1.5, .1, s => { s.moveTo(-2.22, .3); s.absarc(-1.25, .3, .42, Math.PI, 0, true); s.absarc(1.25, .3, .42, Math.PI, 0, true); [[2.22, .3], [2.255, .5], [2.25, .66], [2.17, .8], [1.5, .9], [.95, .96], [.62, 1], [-2.2, 1], [-2.25, .8]].forEach(p => s.lineTo(p[0], p[1])); });
    GEO.cabin = mk([[-2.15, 1], [.62, 1], [.02, 1.43], [-1.98, 1.46]], 1.5, .04);
    GEO.glass = [[[-.15, 1.06], [.5, 1.06], [.06, 1.37], [-.15, 1.37]], [[-1.05, 1.06], [-.3, 1.06], [-.3, 1.38], [-1.05, 1.4]], [[-2, 1.06], [-1.2, 1.06], [-1.2, 1.41], [-1.88, 1.41]]].map(p => mk(p, 1.64, 0));
    const pl = (w, h, nx, ny, mx, my) => { const g0 = new T.PlaneGeometry(w, h); g0.rotateY(Math.PI / 2); g0.rotateZ(Math.atan2(ny, nx)); g0.translate(mx + nx * .012, my + ny * .012, 0); return g0; };
    GEO.ws = pl(1.3, .746, .577, .817, .32, 1.215); GEO.rw = pl(1.3, .49, -.939, .347, -2.065, 1.23);
    GEO.tire = new T.LatheGeometry([[.2, -.11], [.29, -.11], [.325, -.08], [.335, 0], [.325, .08], [.29, .11], [.2, .11]].map(p => new T.Vector2(p[0], p[1])), 40).rotateX(Math.PI / 2);
    GEO.rim = new T.CylinderGeometry(.21, .21, .2, 32).rotateX(Math.PI / 2); GEO.disc = new T.CylinderGeometry(.17, .17, .02, 32).rotateX(Math.PI / 2); GEO.hub = new T.CylinderGeometry(.05, .05, .02, 18).rotateX(Math.PI / 2);
    GEO.spoke = new T.BoxGeometry(.4, .055, .03); GEO.hs = new T.CylinderGeometry(.43, .43, 1.3, 24).rotateX(Math.PI / 2);
  })();
  const plateM = new T.MeshStandardMaterial({ map: tex(cvs(256, 56, (g0, w, h) => { g0.fillStyle = '#f2f2ee'; g0.fillRect(0, 0, w, h); g0.fillStyle = '#1b4fa3'; g0.fillRect(0, 0, 22, h); g0.fillStyle = '#111'; g0.font = 'bold 40px Arial'; g0.textAlign = 'center'; g0.fillText('KOTEL', w / 2 + 10, 42); })), roughness: .4 });
  const rustTex = tex(cvs(256, 256, g0 => { for (let i = 0; i < 140; i++) { const x = 128 + (rnd() - .5) * 180, y = 128 + (rnd() - .5) * 180, r = 3 + rnd() * 18; g0.fillStyle = `rgba(${120 + rnd() * 50 | 0},${50 + rnd() * 30 | 0},18,${.35 + rnd() * .5})`; g0.beginPath(); g0.arc(x, y, r, 0, 7); g0.fill(); } }));
  const rustM = new T.MeshStandardMaterial({ map: rustTex, transparent: true, roughness: 1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const woltT = new T.MeshStandardMaterial({ map: tex(cvs(256, 80, (g0, w, h) => { g0.fillStyle = '#19a7e0'; g0.fillRect(0, 0, w, h); g0.fillStyle = '#fff'; g0.font = 'italic bold 58px Arial'; g0.textAlign = 'center'; g0.fillText('Wolt', w / 2, 60); })), roughness: .5 }), woltP = std({ color: 0x19a7e0, roughness: .5 });

  function buildCar(color, o = {}) {
    const car = new T.Group(), rig = new T.Group(), model = new T.Group(), detail = o.detail !== false;
    model.rotation.y = Math.PI / 2; rig.add(model); car.add(rig); scene.add(car);
    const bodyMat = baseBody.clone(); bodyMat.color.set(color); carEnv.push(bodyMat);
    const mesh = (g0, mat) => { const m = new T.Mesh(g0, mat); m.castShadow = true; model.add(m); return m; };
    const bx = (w, h, d, x, y, z, mat = trim) => { const m = mesh(new T.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; };
    mesh(GEO.body, bodyMat); mesh(GEO.cabin, bodyMat); GEO.glass.forEach(g0 => mesh(g0, glassMat)); mesh(GEO.ws, glassMat).castShadow = false; mesh(GEO.rw, glassMat).castShadow = false;
    bx(3.7, .12, 1.78, -.05, .42, 0); bx(3.4, .07, 1.74, -.1, .66, 0); bx(.1, .14, .95, 2.24, .4, 0, black); bx(.12, .16, 1.15, -2.3, .42, 0); bx(.06, .18, .62, 2.3, .7, 0, black);
    const tail = std({ color: 0xa01610, emissive: 0xff1a0e, emissiveIntensity: .35, roughness: .3 }), indL = std({ color: 0xff9a1a, emissive: 0xff7a00, emissiveIntensity: 0, roughness: .3 }), indR = indL.clone();
    for (const s of [-1, 1]) {
      const hl = bx(.1, .22, .34, 2.2, .84, s * .46, lampMat); hl.rotation.y = -s * .45;
      bx(.07, .07, .16, 2.24, .67, s * .62, s < 0 ? indL : indR).rotation.y = -s * .6;
      bx(.09, .34, .26, -2.29, .93, s * .6, tail).rotation.y = s * .2; bx(.08, .09, .24, -2.3, .72, s * .6, s < 0 ? indL : indR).rotation.y = s * .2;
      if (detail) { bx(.06, .09, .16, -2.3, .46, s * .66, std({ color: 0xb01c14, roughness: .3 })); bx(.06, .08, .12, 2.25, .4, s * .56, lampMat); }
      bx(2.3, .05, .06, -.85, 1.5, s * .62);
      const mi = mesh(new T.SphereGeometry(.1, 14, 10), bodyMat); mi.scale.set(.8, .9, 1.25); mi.position.set(.55, 1.13, s * .98);
      if (detail) {
        bx(.08, .05, .08, .15, 1.47, s * .62); bx(.08, .05, .08, -1.8, 1.47, s * .62); bx(.16, .035, .03, -.05, .98, s * .858, chrome); bx(.16, .035, .03, -.95, .98, s * .858, chrome);
        for (const dx of [.55, -.45, -1.4]) bx(.012, .62, .012, dx, .83, s * .852, black);
        bx(2.6, .018, .018, -.8, 1.06, s * .83, chrome);   // chromový lem oken
      }
    }
    if (detail) {
      bx(.05, .22, .7, 2.28, .7, 0, chrome); bx(.04, .22, .64, 2.31, .7, 0, black);
      bx(.03, .025, .85, 2.29, .45, 0, chrome); bx(.03, .025, .85, 2.29, .37, 0, chrome);   // chromové lamely v dolním nasávání
      const b1 = mesh(new T.CylinderGeometry(.055, .055, .03, 24).rotateZ(Math.PI / 2), chrome); b1.position.set(2.33, .8, 0);
      const b2 = mesh(new T.CylinderGeometry(.04, .04, .035, 24).rotateZ(Math.PI / 2), std({ color: 0x1c7a3a, roughness: .4 })); b2.position.set(2.335, .8, 0);
      bx(.34, .05, 1.22, -2.03, 1.5, 0, bodyMat); bx(.03, .03, .9, -2.2, 1.49, 0, tail); bx(.02, .02, .34, -2.11, 1.1, .12, black);
      bx(.02, .02, .62, .58, 1.02, .28, black).rotation.y = .1; bx(.02, .02, .55, .58, 1.02, -.3, black).rotation.y = -.1;   // stěrače
      bx(.04, .16, .64, -2.33, .6, 0, black);
      const ant = mesh(new T.CylinderGeometry(.008, .01, .55, 6), black); ant.position.set(-1.55, 1.75, .45); ant.rotation.z = .45;
      const hook = mesh(new T.CylinderGeometry(.03, .03, .3, 8).rotateZ(Math.PI / 2), black); hook.position.set(-2.45, .36, .12); const ball = mesh(new T.SphereGeometry(.055, 12, 8), black); ball.position.set(-2.62, .36, .12);
      const ex = mesh(new T.CylinderGeometry(.045, .045, .14, 14).rotateZ(Math.PI / 2), chrome); ex.position.set(-2.36, .33, -.48);
    }
    const pr = new T.Mesh(new T.PlaneGeometry(.56, .12), plateM); pr.rotation.y = -Math.PI / 2; pr.position.set(-2.345, .6, 0); model.add(pr);
    const pf = new T.Mesh(new T.PlaneGeometry(.56, .12), plateM); pf.rotation.y = Math.PI / 2; pf.position.set(2.34, .46, 0); model.add(pf);
    if (o.rust !== false) [[-2.352, .66, -.36, -Math.PI / 2, .6], [-2.352, .5, .4, -Math.PI / 2, .5], [-1.5, .55, .862, 0, .5], [-1.5, .55, -.862, Math.PI, .5], [1.6, .5, .862, 0, .35], [-.3, .45, -.862, Math.PI, .4]].forEach(([x, y, z, ry, s]) => { const m = new T.Mesh(new T.PlaneGeometry(s, s), rustM); m.position.set(x, y, z); m.rotation.y = ry; model.add(m); });
    const woltBox = new T.Mesh(new T.BoxGeometry(.55, .32, 1.05), [woltT, woltT, woltP, woltP, woltP, woltP]); woltBox.position.set(-.7, 1.67, 0); woltBox.castShadow = true; woltBox.visible = !!o.wolt; model.add(woltBox);
    const wheels = [];
    for (const [wx, wz] of [[1.25, .8], [1.25, -.8], [-1.25, .8], [-1.25, -.8]]) {
      const w = new T.Group(), s = Math.sign(wz); w.position.set(wx, .32, wz); w.rotation.order = 'YZX'; model.add(w);
      const tire = new T.Mesh(GEO.tire, tireM); tire.castShadow = true; w.add(tire, new T.Mesh(GEO.rim, std({ color: 0x2a2c2e, metalness: .6, roughness: .4 })));
      if (detail) {
        const disc = new T.Mesh(GEO.disc, std({ color: 0x555a5e, metalness: .9, roughness: .5 })); disc.position.z = -s * .05; const hub = new T.Mesh(GEO.hub, chrome); hub.position.z = s * .105; w.add(disc, hub);
        for (let k = 0; k < 5; k++) { const sp = new T.Mesh(GEO.spoke, rimMat); sp.rotation.z = k * Math.PI / 5; sp.position.z = s * .09; w.add(sp); }
      }
      wheels.push({ g: w, front: wx > 0 });
      const hs = new T.Mesh(GEO.hs, black); hs.position.set(wx, .32, 0); hs.scale.set(.96, .96, 1); model.add(hs);
    }
    return { car, rig, model, bodyMat, tail, indL, indR, wheels, woltBox };
  }
  const P = buildCar(0xbfc4c8), car = P.car, rig = P.rig, wheels = P.wheels, tail = P.tail, indL = P.indL, indR = P.indR;
  // světlomety (v mlze a v noci)
  const hlights = [-.58, .58].map(s => { const l = new T.SpotLight(0xfff0d0, 0, 75, .55, .6, 1.4), t = new T.Object3D(); l.position.set(s, .85, -2.2); t.position.set(s * .8, .3, -26); car.add(l, t); l.target = t; return l; });
  function applySkin(s) { const w = s === 'wolt'; P.bodyMat.color.set(w ? 0x1fa6e4 : 0xbfc4c8); P.bodyMat.metalness = w ? .55 : .85; P.woltBox.visible = w; }
  function pose(c, x, z, psi) {
    const fx = -Math.sin(psi), fz = -Math.cos(psi), hF = ground(x + fx * 2.3, z + fz * 2.3), hR = ground(x - fx * 2.3, z - fz * 2.3), hL = ground(x + fz * .9, z - fx * .9), hRt = ground(x - fz * .9, z + fx * .9);
    c.car.position.set(x, (hF + hR) / 2, z); c.car.rotation.set(Math.atan((hF - hR) / 4.6), psi, -Math.atan((hL - hRt) / 1.8), 'YXZ');
  }
  const circ = (x, z, psi) => [-1.5, 0, 1.5].map(o => [x - Math.sin(psi) * o, z - Math.cos(psi) * o]);
  const hit = (a, b) => { for (const p of a) for (const q of b) { const dx = p[0] - q[0], dz = p[1] - q[1]; if (dx * dx + dz * dz < 3.6) return [dx, dz]; } return null; };
  const parked = [[-22, 0xe9e9e9], [-13, 0xb8bcc0], [-9, 0x7a1f1f]].map(([e, col]) => { const c = buildCar(col, { detail: false, rust: false }), w = at(e, 21.5); pose(c, w[0], w[1], 0); return { circ: circ(w[0], w[1], 0) }; });
  const npcs = [[0xb02a2a, 'A'], [0x2d4f9e, 'B'], [0xe6e6e6, 'A'], [0x2a2d30, 'B'], [0x19a7e0, 'B', true], [0x4b7a4b, 'A']].map(([col, lane, w]) => {
    const n = { c: buildCar(col, { detail: false, rust: false, wolt: w }), lane, on: false, x: 0, z: 0, psi: 0, v: 0, wh: 0, s: 0 }; n.c.car.visible = false; return n;
  });

  /* ---------- kouř a rez ---------- */
  const puffTex = tex(cvs(64, 64, g => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }));
  const puffs = []; for (let i = 0; i < 30; i++) { const s = new T.Sprite(new T.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0 })); s.userData = { life: 0, vy: 0 }; scene.add(s); puffs.push(s); }
  let pi = 0; const tmpV = new T.Vector3();
  function puff(rust) {
    const s = puffs[pi++ % puffs.length]; P.model.localToWorld(tmpV.set(-2.45, .35, -.48)); s.position.copy(tmpV);
    s.material.color.set(rust ? 0x9a4a22 : 0x77797c); s.userData.life = 1; s.userData.vy = rust ? -.4 : .9; s.scale.setScalar(.3);
  }

  /* ---------- stav hry ---------- */
  const keys = { gas: 0, brake: 0, left: 0, right: 0, tap: 0 }; let st, skin = saved.skin === 'wolt' ? 'wolt' : 'classic', last = 0, vis = true, camMode = 0, frame = 0;
  const look = new T.Vector3(), cpos = new T.Vector3(); let camInit = false;
  function reset() {
    const p = pathAt(0), r = [-p.tz, p.tx];
    st = { mode: 'idle', x: p.x + r[0] * 1.75, z: p.z + r[1] * 1.75, psi: Math.atan2(-p.tx, -p.tz), v: 0, s: 0, fuel: 6, time: 0, t: 0, blink: false, blinkOn: false, sig: false, penalty: 0, steer: 0, delta: 0, revT: 0, sleep: 0, wheel: 0, rust: false, tip: '', tipT: 0, sleepT: 0, done: 0, B: false, bumpT: 0, tA: 3, tB: 2, wrong: false };
    npcs.forEach(n => { n.on = false; n.c.car.visible = false; });
    setNight(0); $('g-sleep').classList.remove('on'); camInit = false; applySkin(skin);
  }
  function end(title, text) { st.mode = 'over'; st.v = 0; say(title, text, 'Zkusit znovu'); }
  function tip(s, t) { st.tip = s; st.tipT = t; }
  function spawn(lane) {
    const n = npcs.find(q => !q.on && q.lane === lane); if (!n) return;
    n.on = true; n.v = 15 + Math.random() * 7; n.wh = 0;
    if (lane === 'A') n.s = Math.min(st.s + 240, LA - 12); else { n.x = Math.min((st.B ? st.x : 60) + 260, 690); n.psi = Math.PI / 2; }
    n.c.car.visible = true;
  }

  function update(dt) {
    st.t += dt; skyU.time.value = st.t; if (st.tipT > 0) st.tipT -= dt; if (st.bumpT > 0) st.bumpT -= dt;
    const fx = -Math.sin(st.psi), fz = -Math.cos(st.psi);
    const slope = (ground(st.x + fx * 2.3, st.z + fz * 2.3) - ground(st.x - fx * 2.3, st.z - fz * 2.3)) / 4.6;
    if (st.mode === 'drive') {
      st.time += dt; const gas = keys.gas;
      if (keys.tap) { st.blink = !st.blink; keys.tap = 0; }
      if (st.fuel > 0) { st.fuel = Math.max(0, st.fuel - dt * gas * .22); if (st.fuel === 0) { st.rust = true; tip('Došla nafta! Oktávka jede na rez.', 4); } }
      const off = !roadAt(st.x, st.z), sg = Math.sign(st.v);
      let a = gas * (st.fuel > 0 ? 7.5 : 3.9) - .27 * st.v - .6 * sg - slope * 20 - (off ? .5 * st.v + .8 * sg : 0);
      if (keys.brake) { if (st.v > .3) { a -= 13; st.revT = 0; } else { st.revT += dt; if (st.revT > .4) a -= 3.2; else { st.v = 0; a = 0; } } } else st.revT = 0;
      if (gas && st.v <= 0 && a < 0 && st.v > -.2) a = 0;
      if (!gas && !keys.brake && Math.abs(st.v) < .4) { st.v = 0; a = 0; }
      st.v = clamp(st.v + a * dt, -4, 40);
      const want = (keys.left ? 1 : 0) - (keys.right ? 1 : 0); st.steer += (want - st.steer) * Math.min(1, dt * 7);
      st.delta = st.steer * .5 / (1 + Math.abs(st.v) / 9);
      st.psi += st.v * Math.tan(st.delta) / 2.5 * dt; st.x += fx * st.v * dt; st.z += fz * st.v * dt; st.wheel += st.v * dt / .32;
      if (gas && Math.random() < dt * 14) puff(false); else if (st.rust && st.v > .5 && Math.random() < dt * 8) puff(true);
      if (!st.B) {
        st.s = nearestS(st.x, st.z);
        if (!st.sig && st.s > LA - 60) { st.sig = true; if (st.blink) tip('Blinkr zapnutý, výborně.', 2.5); else { st.penalty += 5; tip('Bez blinkru! +5 s trestných.', 3); } }
        if (st.x > 14 && Math.abs(st.z - ZB) < 6) { st.B = true; st.blink = false; tip('Odbočeno na státovku. KM Prona je vlevo před tebou.', 4); }
        else if (st.x < -14 && Math.abs(st.z - ZB) < 6) end('Špatným směrem', 'KM Prona je na východě. Na státovku odboč doleva.');
        else if (st.z > ZB + 30 && Math.abs(st.x) < 20) end('Minul jsi odbočku', 'Jedeš po vedlejší silnici. Na křižovatce zatoč doleva na státovku.');
      } else {
        if (Math.abs(st.x - BX) < 1.1 && Math.abs(st.z - BZ) < 2 && Math.abs(Math.cos(st.psi)) > .9 && Math.abs(st.v) < 1.2) { st.mode = 'sleep'; st.v = 0; st.tipT = 0; }
        else if (st.x > SX + 110 && onB(st.x, st.z)) end('Minul jsi benzinku', 'KM Prona zůstala za tebou. Odbočka je vlevo ze středního pruhu.');
        else if (st.x < -30) end('Špatným směrem', 'Jedeš zpátky. KM Prona je na východě.');
        if (!st.wrong && st.x < SX - 20 && distPath(st.x, st.z, slips[1]) < 3.4 && fz < -.4) { st.wrong = true; st.penalty += 5; tip('To je výjezd! Vjezd je z východní strany. +5 s.', 3.5); }
      }
      if ((dRoad(st.x, st.z) > 45 && dStat(st.x, st.z) > 3) || st.z > ZB + 90) end('Sjel jsi z cesty', 'Oktávka ráda jezdí po silnici. Zkus to znovu a drž se asfaltu.');
      const me = circ(st.x, st.z, st.psi);
      for (const p of parked) { const h = hit(me, p.circ); if (h) { const l = Math.hypot(h[0], h[1]) || 1, push = 1.95 - l; st.x += h[0] / l * push; st.z += h[1] / l * push; st.v = 0; if (st.bumpT <= 0) { st.penalty += 3; st.bumpT = 1.5; tip('Šrám o zaparkované auto! +3 s.', 2.5); } } }
    } else if (st.mode === 'sleep') {
      st.sleep = Math.min(1, st.sleep + dt / 4); st.sleepT += dt; st.v = 0; setNight(sm(0, 1, st.sleep)); $('g-sleep').classList.toggle('on', st.sleep > .4);
      if (st.sleepT > 8 && !st.done) {
        st.done = 1; const j = ['Kotlik chrápe jako kotel v únoru.', 'Ráno ho čeká výměna sifonu a rozvaděč.', 'Oktávka tiká, chladne a drží pohromadě jen z cti.', 'Po probuzení si objedná Wolt sám sobě.'];
        const tt = st.time + st.penalty;
        say('Kotlik se vyspal', `Cesta z garáže: ${tt.toFixed(0)} s${st.penalty ? ` (z toho ${st.penalty} s trestných)` : ''}. ${st.rust ? 'Dojel jsi na rez.' : 'Dojel jsi na poslední kapky nafty.'}<br>${j[Math.floor(Math.random() * j.length)]}`, 'Jet znovu', true);
      }
    }
    // provoz
    if (st.mode === 'drive' || st.mode === 'sleep') {
      st.tA -= dt; st.tB -= dt;
      if (st.tA <= 0) { st.tA = 5 + Math.random() * 6; if (!st.B && st.s < LA - 40) spawn('A'); }
      if (st.tB <= 0) { st.tB = 3.5 + Math.random() * 4; if (st.s > LA - 260 || st.B) spawn('B'); }
    }
    for (const n of npcs) if (n.on) {
      n.wh += n.v * dt / .32;
      if (n.lane === 'A') { n.s -= n.v * dt; const p = pathAt(n.s); n.x = p.x + p.tz * 1.75; n.z = p.z - p.tx * 1.75; n.psi = Math.atan2(p.tx, p.tz); }
      else { n.x -= n.v * dt; n.z = ZB - laneOff(n.x); }
      pose(n.c, n.x, n.z, n.psi); n.c.wheels.forEach(w => w.g.rotation.z = -n.wh);
      if ((n.lane === 'A' && n.s < Math.max(25, st.s - 90)) || (n.lane === 'B' && n.x < (st.B ? st.x - 90 : -70))) { n.on = false; n.c.car.visible = false; continue; }
      if (st.mode === 'drive' && hit(circ(st.x, st.z, st.psi), circ(n.x, n.z, n.psi))) end('Bouračka!', 'Do cesty ti vjelo protijedoucí auto. Před odbočením vlevo dej přednost a drž se v pruhu.');
    }
    for (const s of puffs) if (s.userData.life > 0) { s.userData.life -= dt * .6; s.position.y += s.userData.vy * dt; s.scale.addScalar(dt * 1.6); s.material.opacity = Math.max(0, s.userData.life) * .5; }
    // hráčovo auto
    const bob = st.v > 1 ? Math.sin(st.wheel * 1.3) * (st.rust ? .02 : .008) : 0;
    pose(P, st.x, st.z, st.psi); car.rotation.x -= keys.brake && st.v > 2 ? .012 : 0; car.updateMatrixWorld(true);
    rig.position.y = bob; rig.rotation.z = -st.steer * st.v * .0035;
    wheels.forEach(w => { w.g.rotation.z = -st.wheel; w.g.rotation.y = w.front ? st.delta : 0; });
    tail.emissiveIntensity = keys.brake && st.v > .5 ? 2.6 : .35;
    const on = st.blink && Math.floor(st.t * 3) % 2 === 0; st.blinkOn = on;
    indL.emissiveIntensity = indR.emissiveIntensity = on ? 3 : 0;
    const hon = (mood === 'fog' || nightV > .25) ? 1 : 0; hlights.forEach(l => l.intensity = hon * (mood === 'fog' ? 5 : 7));
    // střecha a zadní stěna garáže se skryjí, dokud je kamera za autem
    const inG = Math.hypot(st.x - GX, st.z - GZ) < 7.5 && st.mode !== 'idle'; garageHide.forEach(o => o.visible = !inG);
    // kamera
    const cy = car.position.y, f = new T.Vector3(fx, 0, fz), want = new T.Vector3(), tgt = new T.Vector3();
    let kk = 1 - Math.exp(-dt * (st.mode === 'sleep' ? 1.2 : 5));
    if (st.mode === 'idle') { const sw = Math.sin(st.t * .35) * 3.5; want.set(st.x + f.x * 8.5 - f.z * sw, cy + 2 + Math.sin(st.t * .2) * .4, st.z + f.z * 8.5 + f.x * sw); tgt.set(st.x, cy + 1, st.z); }
    else if (st.mode === 'sleep') { want.set(st.x - 4 + Math.sin(st.t * .2) * 2, cy + 2.4, st.z + 10); tgt.set(st.x + 2, cy + 2.6, st.z - 8); }
    else if (camMode === 1 && st.mode === 'drive') { P.model.localToWorld(want.set(1.15, 1.2, 0)); tgt.set(want.x + f.x * 25, want.y + f.y - .6 + car.rotation.x * 25, want.z + f.z * 25); kk = 1; }
    else {
      const d = 7.2 + Math.max(0, st.v) * .05; want.set(st.x - f.x * d, cy + 3 + st.v * .02, st.z - f.z * d); tgt.set(st.x + f.x * 12, cy + 1.4, st.z + f.z * 12);
      if (st.rust && st.v > 1) { want.x += (Math.random() - .5) * .04; want.y += (Math.random() - .5) * .04; }
    }
    if (!camInit) { cpos.copy(want); look.copy(tgt); camInit = true; }
    cpos.lerp(want, kk); look.lerp(tgt, kk); camera.position.copy(cpos); camera.lookAt(look);
    camera.fov = (camMode === 1 ? 62 : 52) + Math.min(Math.abs(st.v), 28) * .35; camera.updateProjectionMatrix();
    sun.target.position.copy(car.position); sun.position.copy(car.position).addScaledVector(SUN, 90);
    moonL.position.copy(car.position).add(skyU.moon.value.clone().multiplyScalar(90)); moonL.target.position.copy(car.position); moonL.target.updateMatrixWorld();
    sky.position.copy(camera.position);
    hud(); if (++frame % 3 === 0) drawMap();
  }

  /* ---------- HUD a minimapa ---------- */
  const hSpd = $('h-spd'), hFuel = $('h-fuel'), hFuelT = $('h-fuelt'), hProg = $('h-prog'), hTip = $('h-tip'), hBlink = $('h-blink');
  const mm = $('g-map'), mc = mm && mm.getContext && mm.getContext('2d'), MS = .34;
  function drawMap() {   // mapa se otáčí podle auta: tvůj směr jízdy je vždy nahoru
    if (!mc) return; mc.save(); mc.clearRect(0, 0, 160, 180); mc.fillStyle = 'rgba(16,18,20,.8)'; mc.fillRect(0, 0, 160, 180); mc.beginPath(); mc.rect(0, 0, 160, 180); mc.clip();
    mc.translate(80, 128); mc.rotate(st.psi); mc.scale(MS, MS); mc.translate(-st.x, -st.z);
    mc.lineJoin = 'round'; mc.lineWidth = 9; mc.strokeStyle = '#8c9298';
    mc.beginPath(); pathA.forEach((p, i) => i ? mc.lineTo(p[0], p[2]) : mc.moveTo(p[0], p[2])); mc.stroke();
    mc.beginPath(); mc.moveTo(-60, ZB); mc.lineTo(520, ZB); mc.moveTo(0, ZB); mc.lineTo(-12, ZB + 75); mc.stroke();
    mc.fillStyle = '#3d6fb8'; mc.fillRect(SX - 58, ZB - 48, 110, 31); mc.fillStyle = '#6ff09a'; mc.fillRect(BX - 5, BZ - 5, 10, 10);
    mc.fillStyle = '#e8574a'; npcs.forEach(n => { if (n.on) mc.fillRect(n.x - 4, n.z - 4, 8, 8); });
    mc.restore();
    mc.fillStyle = '#ffd21f'; mc.beginPath(); mc.moveTo(80, 118); mc.lineTo(86, 135); mc.lineTo(74, 135); mc.closePath(); mc.fill();
  }
  function hud() {
    hSpd.textContent = Math.round(Math.abs(st.v) * 3.6); hFuel.style.width = (st.fuel > 0 ? st.fuel / 6 * 100 : 100) + '%'; hFuel.classList.toggle('rust', st.fuel <= 0);
    hFuelT.textContent = st.fuel > 0 ? `Nafta ${st.fuel.toFixed(1)} %` : 'Nafta 0 %, jedeš na rez'; hBlink.classList.toggle('on', st.blink);
    const p = !st.B ? clamp(st.s / LA, 0, 1) * .5 : .5 + clamp((st.x - 14) / (SX + 62 - 14), 0, 1) * .5; hProg.style.left = p * 100 + '%';
    let s = '';
    if (st.mode === 'drive') {
      if (st.tipT > 0) s = st.tip;
      else if (st.time < 6) s = 'Vyjeď z garáže: W plyn, S brzda a zpátečka, A/D zatáčení, mezerník blinkr, C kamera';
      else if (!st.B && st.s > S0 - 40 && st.s < S0 + 20 && st.time < 40) s = 'Hlavní ulice ve Vrbčanech. Pokračuj dolů z vesnice.';
      else if (!st.B && st.s > LA - 230 && st.s < LA - 60 && !st.blink) s = 'Křižovatka. Zpomal (S), zapni blinkr (mezerník) a zatoč vlevo (A) na státovku.';
      else if (st.B && st.x > SX - 190 && st.x < SX + 80 && st.z > ZB - 8) s = 'KM Prona vlevo. Zařaď se do prostředního pruhu, dej přednost protijedoucím a odboč vlevo vjezdem.';
      else if (st.B && onApron(st.x, st.z)) s = 'Zajeď do zeleného pole u značky P. Zpátečka: drž S.';
    }
    hTip.textContent = s; hTip.classList.toggle('on', !!s);
  }

  /* ---------- ovládání: WASD + mezerník ---------- */
  const map = { KeyW: 'gas', ArrowUp: 'gas', KeyS: 'brake', ArrowDown: 'brake', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' };
  addEventListener('keydown', e => {
    if (st.mode !== 'drive') return;
    if (map[e.code]) { keys[map[e.code]] = 1; e.preventDefault(); }
    if (e.code === 'Space') { if (!e.repeat) keys.tap = 1; e.preventDefault(); }
    if (e.code === 'KeyC' && !e.repeat) camMode = 1 - camMode;
  });
  addEventListener('keyup', e => { if (map[e.code]) keys[map[e.code]] = 0; });
  document.querySelectorAll('.g-pad button').forEach(b => {
    const k = b.dataset.k;
    b.addEventListener('pointerdown', e => { e.preventDefault(); keys[k] = 1; });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => b.addEventListener(t, () => { if (k !== 'tap') keys[k] = 0; }));
  });
  // volby v úvodní nabídce: auto, čas, rozlišení, efekty; vzhled tlačítek se vždy překreslí ze stavu
  const bFx = $('g-fx');
  function refreshOpts() {
    document.querySelectorAll('.g-sk button').forEach(b => b.classList.toggle('on', b.dataset.skin === skin));
    document.querySelectorAll('.g-mo button').forEach(b => b.classList.toggle('on', b.dataset.mood === mood));
    document.querySelectorAll('.g-rs button').forEach(b => b.classList.toggle('on', b.dataset.res === resKey));
    if (bFx) { bFx.textContent = 'Efekty: ' + (composer ? (fxOn ? 'zap' : 'vyp') : 'nedostupné'); bFx.classList.toggle('on', !!composer && fxOn); }
    try { localStorage.setItem('kotlikOpts', JSON.stringify({ skin, mood, fx: fxOn, res: resKey })); } catch (e) { }
  }
  $('g-ov').addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('button'); if (!b) return;
    if (b.dataset.skin) { skin = b.dataset.skin; applySkin(skin); }
    else if (b.dataset.mood) { mood = b.dataset.mood; setNight(0); }
    else if (b.dataset.res) { setRes(b.dataset.res); }
    else if (b.id === 'g-fx') { if (composer) setFx(!fxOn); }
    else return;
    refreshOpts();
  });
  if (composer) setFx(saved.fx !== false);
  setRes(resKey); setNight(0); refreshOpts();
  $('g-start').addEventListener('click', () => { reset(); st.mode = 'drive'; $('g-ov').classList.add('hide'); $('g-start').blur(); });
  new IntersectionObserver(e => vis = e[0].isIntersecting).observe(cv);

  function loop(ts) {
    const dt = clamp((ts - last) / 1000 || 0, 0, .05); last = ts;
    if (vis) {
      update(dt);
      if (fxOn && composer) { finalPass.uniforms.exposure.value = renderer.toneMappingExposure; finalPass.uniforms.time.value = st.t % 10; composer.render(); }
      else renderer.render(scene, camera);
    }
    requestAnimationFrame(loop);
  }
  reset(); requestAnimationFrame(loop);
})();
