// 3D minihra: garáž Kotlika → Vrbčany → kopec → státovka vlevo → odbočka do KM Prona → parkoviště a spánek (three.js)
(() => {
  const cv = document.getElementById('game'); if (!cv) return;
  const $ = id => document.getElementById(id), T = window.THREE;
  // Fotka spícího Kotlika: buď sem vlož "data:image/...;base64,...", nebo dej soubor kotlik-spi.jpg (nebo .png/.webp) vedle index.html.
  // Když fotka není, v autě spí 3D Kotlik, takže na konci hry je vždy co vidět.
  const SLEEP_IMG = "";
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v)), lerp = (a, b, t) => a + (b - a) * t;
  const sm = (a, b, x) => { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
  function say(title, text, btn, win) {
    $('g-title').textContent = title; $('g-text').innerHTML = text; $('g-start').textContent = btn;
    const o = $('g-ov'); o.classList.remove('hide'); o.classList.toggle('g-win', !!win);
  }
  if (!T) { say('3D se nenačetlo', 'Hra potřebuje internet kvůli knihovně three.js. Obnov stránku.', 'OK'); return; }

  /* ---------- fotka spícího Kotlika (volitelná, v plném rozlišení) ---------- */
  const sleepBox = $('g-sleep'), sleepImg = $('g-sleep-img'); let photoOK = false;
  sleepImg.style.cssText = 'display:none;width:100%;height:auto;filter:none;image-rendering:auto;border-radius:12px;box-shadow:0 14px 40px rgba(0,0,0,.7)';
  sleepBox.style.width = 'min(62%,640px)'; sleepBox.style.display = 'none';
  const photoLoaded = () => { photoOK = true; sleepImg.style.display = 'block'; };
  function tryPhoto(list) {
    if (!list.length) return;
    const im = new Image();
    im.onload = () => { sleepImg.src = list[0]; photoLoaded(); };
    im.onerror = () => tryPhoto(list.slice(1));
    im.src = list[0];
  }
  if (SLEEP_IMG) { sleepImg.onload = photoLoaded; sleepImg.src = SLEEP_IMG; }
  else tryPhoto(['kotlik-spi.jpg', 'kotlik-spi.jpeg', 'kotlik-spi.png', 'kotlik-spi.webp', 'img/kotlik-spi.jpg', 'img/kotlik-spi.png', 'img/kotlik-spi.webp']);

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
    golden: { top: C(.05, .22, .8), bot: C(.62, .76, .98), dir: [-.7, .35, .5], si: 3.0, fog: .0026, hemi: .8, exp: 1.1 },
    noon: { top: C(.04, .2, .85), bot: C(.55, .75, 1), dir: [-.3, .85, .3], si: 3.6, fog: .0016, hemi: .95, exp: 1.1 },
    fog: { top: C(.45, .5, .56), bot: C(.62, .65, .68), dir: [-.5, .35, .4], si: 1.1, fog: .011, hemi: .95, exp: 1.1 }
  };
  let mood = MOODS[saved.mood] ? saved.mood : 'golden', nightV = 0;
  const skyU = { top: { value: new T.Color() }, bot: { value: new T.Color() }, sun: { value: SUN }, moon: { value: new T.Vector3(.3, .55, .4).normalize() }, night: { value: 0 }, time: { value: 0 }, cloud: { value: 1 } };
  const skyMat = new T.ShaderMaterial({
    uniforms: skyU, side: T.BackSide, depthWrite: false, depthTest: false, fog: false,
    vertexShader: 'varying vec3 v;void main(){v=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `#include <tonemapping_pars_fragment>
#include <encodings_pars_fragment>
uniform vec3 top,bot,sun,moon;
uniform float night,time,cloud;
varying vec3 v;
float hsh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float nz(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hsh(i),hsh(i+vec2(1.0,0.0)),f.x),mix(hsh(i+vec2(0.0,1.0)),hsh(i+vec2(1.0,1.0)),f.x),f.y);}
float fb(vec2 p){float a=0.5;float s=0.0;for(int i=0;i<5;i++){s+=a*nz(p);p=p*2.03+vec2(1.7,9.2);a*=0.5;}return s;}
float cloudAt(vec2 p){return smoothstep(0.42-0.1*cloud,0.78-0.1*cloud,fb(p));}
void main(){
  vec3 dir=normalize(v);
  float y=dir.y;
  float h=clamp(y*1.4+0.12,0.0,1.0);
  vec3 col=mix(bot,top,pow(h,0.55));
  float sd=max(dot(dir,normalize(sun)),0.0);
  float haze=exp(-max(y,0.0)*5.0);
  col=mix(col,bot*1.1+vec3(0.05,0.035,0.02),haze*0.55);
  col+=vec3(1.0,0.6,0.3)*pow(sd,6.0)*haze*0.55*(1.0-night);
  col+=vec3(1.0,0.72,0.4)*(pow(sd,900.0)*4.0+pow(sd,14.0)*0.45+pow(sd,3.0)*0.12)*(1.0-night);
  float md=max(dot(dir,normalize(moon)),0.0);
  col+=vec3(0.8,0.85,1.0)*(pow(md,1500.0)*3.0+pow(md,40.0)*0.12)*night;
  float star=step(0.9975,fract(sin(dot(floor(dir*230.0),vec3(12.9898,78.233,37.719)))*43758.5453));
  col+=vec3(star)*night*step(0.1,y);
  if(y>0.02){
    vec2 cp=dir.xz/(y+0.18)*1.5+vec2(time*0.012,0.0);
    float d1=cloudAt(cp);
    vec2 toSun=normalize(sun.xz+vec2(0.0001))*0.07;
    float d2=cloudAt(cp+toSun);
    float lighting=clamp(0.62+(d1-d2)*3.2,0.0,1.0);
    vec3 cc=mix(vec3(0.5,0.56,0.7),vec3(1.0,0.97,0.92),lighting);
    cc=mix(cc,vec3(1.0,0.74,0.5),pow(sd,4.0)*0.65);
    cc*=mix(1.0,0.1,night);
    col=mix(col,cc,d1*0.9*smoothstep(0.02,0.25,y));
    vec2 cp2=dir.xz/(y+0.35)*vec2(0.6,2.2)+vec2(time*0.004,3.0);
    float ci=smoothstep(0.48,0.92,fb(cp2*2.0))*0.35*smoothstep(0.1,0.5,y)*(1.0-d1);
    col=mix(col,vec3(0.97,0.95,0.94)*mix(1.0,0.1,night),ci);
  }
  gl_FragColor=vec4(max(col,vec3(0.0)),1.0);
#include <tonemapping_fragment>
#include <encodings_fragment>
}`
  });
  const sky = new T.Mesh(new T.SphereGeometry(950, 32, 20), skyMat); sky.renderOrder = -1; sky.frustumCulled = false; scene.add(sky);
  const nTop = C(0, .002, .02), nBot = C(.004, .008, .03), lit = [], carEnv = [];
  function setNight(n) {
    const m = MOODS[mood]; nightV = n; SUN.set(...m.dir).normalize(); skyU.cloud.value = mood === 'fog' ? 1.6 : 1;
    skyU.night.value = n; skyU.top.value.copy(m.top).lerp(nTop, n); skyU.bot.value.copy(m.bot).lerp(nBot, n); (scene.background = scene.background || new T.Color()).copy(skyU.bot.value); scene.fog.color.copy(skyU.bot.value); scene.fog.density = m.fog * (1 + n * .6);
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
vec3 c=vec3(texture2D(tDiffuse,vUv+q0*ab).r,texture2D(tDiffuse,vUv).g,texture2D(tDiffuse,vUv-q0*ab).b)*exposure*.95;c=aces(c);float l=dot(c,vec3(.299,.587,.114));
c=mix(c,c*vec3(1.07,1.,.9),l);c=mix(vec3(l),c,1.14);c=pow(c,vec3(1./2.2));
vec2 q=vUv-.5;c*=mix(.72,1.,smoothstep(.9,.25,length(q*vec2(1.1,1.3))));
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

  /* ---------- vítr (tráva a koruny stromů se jemně kývají) ---------- */
  const windU = { value: 0 };
  function addWind(mat, body, key) {
    mat.onBeforeCompile = sh => {
      sh.uniforms.uTime = windU;
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvec3 ip=vec3(0.);\n#ifdef USE_INSTANCING\nip=instanceMatrix[3].xyz;\n#endif\n' + body);
    };
    mat.customProgramCacheKey = () => key;
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
  // štěrkové krajnice podél silnic
  const gravelTex = tex(cvs(256, 256, (g, w, h) => {
    g.fillStyle = '#7a7466'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) { const v = 90 + rnd() * 100 | 0; g.fillStyle = `rgba(${v},${v - 6},${v - 18},.8)`; g.beginPath(); g.arc(rnd() * w, rnd() * h, .6 + rnd() * 1.8, 0, 7); g.fill(); }
    for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(60,80,30,.18)'; g.beginPath(); g.arc(rnd() * w, rnd() * h, 6 + rnd() * 18, 0, 7); g.fill(); }
  }), 1, 1);
  const arrowTex = tex(cvs(128, 256, g => { g.strokeStyle = g.fillStyle = '#e9e9e4'; g.lineWidth = 24; g.lineCap = 'butt'; g.beginPath(); g.moveTo(70, 250); g.lineTo(70, 150); g.quadraticCurveTo(70, 100, 40, 96); g.stroke(); g.beginPath(); g.moveTo(10, 98); g.lineTo(52, 66); g.lineTo(52, 130); g.closePath(); g.fill(); }));
  const grassTex = tex(cvs(512, 512, (g, w, h) => {
    g.fillStyle = '#e4e4e4'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) { const v = 205 + rnd() * 50 | 0; g.fillStyle = `rgba(${v},${v},${v},.12)`; g.beginPath(); g.arc(rnd() * w, rnd() * h, 14 + rnd() * 50, 0, 7); g.fill(); }
    for (let i = 0; i < 42000; i++) { const v = 150 + rnd() * 105 | 0; g.fillStyle = `rgba(${v},${v},${v},.36)`; g.fillRect(rnd() * w, rnd() * h, 1.2, 3 + rnd() * 4); }
    for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${rnd() < .5 ? 255 : 90},${rnd() < .5 ? 255 : 90},${rnd() < .5 ? 255 : 90},.05)`; g.beginPath(); g.arc(rnd() * w, rnd() * h, 6 + rnd() * 26, 0, 7); g.fill(); }
  }), 190, 190);
  // omítka domů: světlá základna (barvu dává instance), dešťové šmouhy, vlhkost u země
  const plaster = tex(cvs(256, 256, (g, w, h) => {
    g.fillStyle = '#f2efe8'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 6000; i++) { const v = 190 + rnd() * 60 | 0; g.fillStyle = `rgba(${v},${v - 3},${v - 10},.28)`; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2); }
    for (let i = 0; i < 22; i++) { const gr = g.createLinearGradient(0, 0, 0, 1); g.fillStyle = `rgba(80,72,58,${.03 + rnd() * .05})`; g.fillRect(rnd() * w, rnd() * h * .5, 2 + rnd() * 5, 40 + rnd() * 160); }
    for (let i = 0; i < 12; i++) { g.fillStyle = 'rgba(120,110,90,.05)'; g.beginPath(); g.arc(rnd() * w, rnd() * h, 10 + rnd() * 30, 0, 7); g.fill(); }
  }), 1, 1);
  // pálená taška: řady s posunem, každá taška trochu jinak vybarvená, stín pod hranou
  const tiles = tex(cvs(128, 128, (g, w, h) => {
    g.fillStyle = '#5a2a1c'; g.fillRect(0, 0, w, h);
    const rh = 16, tw = 21;
    for (let r = 0; r < h / rh; r++) for (let c = -1; c < w / tw + 1; c++) {
      const x = c * tw + (r % 2) * tw / 2, y = r * rh, k = rnd() * .22 - .11;
      const gr = g.createLinearGradient(0, y, 0, y + rh);
      gr.addColorStop(0, `rgb(${(214 + k * 90) | 0},${(128 + k * 70) | 0},${(98 + k * 60) | 0})`); gr.addColorStop(.75, `rgb(${(178 + k * 80) | 0},${(88 + k * 60) | 0},${(62 + k * 50) | 0})`); gr.addColorStop(1, '#3e1b11');
      g.fillStyle = gr; g.fillRect(x + 1, y, tw - 2, rh - 1);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + tw - 3, y, 2, rh);
      if (rnd() < .12) { g.fillStyle = 'rgba(70,95,50,.25)'; g.fillRect(x + 2, y + 2, tw - 5, rh - 5); }
    }
  }), 1, 1);
  const solar = tex(cvs(256, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#1b2a4d'); gr.addColorStop(1, '#0f1a35'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(150,170,210,.6)'; g.lineWidth = 2; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 32); g.lineTo(w, i * 32); g.stroke(); }
  }), 3, 3);
  // tráva: stébla s přechodem od tmavého kořene ke světlé špičce
  const tuftTex = tex(cvs(128, 192, g => {
    for (let i = 0; i < 70; i++) {
      const x = 14 + rnd() * 100, hgt = 70 + rnd() * 115, l = 60 + rnd() * 80 | 0, bend = (rnd() - .5) * 56, wd = 2.5 + rnd() * 3;
      const gr = g.createLinearGradient(0, 192, 0, 192 - hgt); gr.addColorStop(0, `rgb(${l * .25 | 0},${l * .55 + 20 | 0},${l * .15 | 0})`); gr.addColorStop(1, `rgb(${l * .75 + 40 | 0},${l + 95 | 0},${l * .35 | 0})`);
      g.fillStyle = gr; g.beginPath(); g.moveTo(x - wd, 192); g.quadraticCurveTo(x + bend * .2, 192 - hgt * .55, x + bend, 192 - hgt); g.quadraticCurveTo(x + bend * .2 + wd, 192 - hgt * .55, x + wd, 192); g.fill();
    }
  }));
  const flowTex = tex(cvs(64, 128, g => {
    g.strokeStyle = '#4a7a34'; g.lineWidth = 3; g.beginPath(); g.moveTo(32, 128); g.quadraticCurveTo(30, 90, 32, 52); g.stroke();
    g.fillStyle = '#4a7a34'; g.beginPath(); g.ellipse(24, 100, 9, 4, -.6, 0, 7); g.fill();
    g.fillStyle = '#fff'; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.beginPath(); g.ellipse(32 + Math.cos(a) * 11, 34 + Math.sin(a) * 11, 8, 5, a, 0, 7); g.fill(); }
    g.fillStyle = '#e8b520'; g.beginPath(); g.arc(32, 34, 6, 0, 7); g.fill();
  }));
  // okna: tmavé sklo s odrazem oblohy, bílý kříž; v noci svítí teplým světlem a záclonami
  const winTex = tex(cvs(128, 160, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#6b8fb0'); gr.addColorStop(.45, '#1f3248'); gr.addColorStop(1, '#0d1824'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(w * .55, 0); g.lineTo(0, h * .6); g.fill();
    g.fillStyle = '#f4f2ea'; g.fillRect(0, 0, w, 7); g.fillRect(0, h - 7, w, 7); g.fillRect(0, 0, 7, h); g.fillRect(w - 7, 0, 7, h); g.fillRect(w / 2 - 3, 0, 6, h); g.fillRect(0, h * .45, w, 6);
  }));
  const winEmit = tex(cvs(128, 160, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffcf80'); gr.addColorStop(1, '#ff9a3c'); g.fillStyle = gr; g.fillRect(8, 8, w - 16, h - 16);
    g.fillStyle = 'rgba(255,240,210,.55)'; g.fillRect(8, 8, 26, h - 16); g.fillRect(w - 34, 8, 26, h - 16);
    g.fillStyle = '#000'; g.fillRect(w / 2 - 3, 0, 6, h); g.fillRect(0, h * .45, w, 6);
  }));
  const winMat = std({ color: 0xffffff, map: winTex, roughness: .15, metalness: .35, envMap: envTex, envMapIntensity: .9, emissive: 0xffffff, emissiveMap: winEmit, emissiveIntensity: 0 }); lit.push({ m: winMat, k: 2.2 });
  const lampMat = std({ color: 0xfff6d8, emissive: 0xfff0c0, emissiveIntensity: 0, roughness: .2 }); lit.push({ m: lampMat, k: 3 });
  // materiály domů (barvu stěn a střech dává každá instance)
  const wallMat = std({ map: plaster, vertexColors: true, roughness: .95 });
  const roofMat = std({ map: tiles, vertexColors: true, roughness: .78, side: T.DoubleSide });

  /* ---------- pomocné: geometrie a slučování ---------- */
  const dm = new T.Object3D(), tc = new T.Color();
  const paint = (g, c) => { const n = g.attributes.position.count, a = new Float32Array(n * 3), col = new T.Color(c); for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; } g.setAttribute('color', new T.BufferAttribute(a, 3)); return g; };
  const boxG = (w, h, d, x, y, z, col) => {   // box s UV podle metrů (omítka se neroztahuje)
    const g = new T.BoxGeometry(w, h, d), uv = g.attributes.uv, sc = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * sc[f][0] / 3, uv.getY(k) * sc[f][1] / 3); }
    g.translate(x, y, z); return paint(g, col);
  };
  const polyG = (pts, uvs, col) => { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pts.flat(), 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uvs.flat(), 2)); g.computeVertexNormals(); return paint(g, col); };
  const planeG = (w, h, x, y, z, ry) => { const g = new T.PlaneGeometry(w, h); g.translate(x, y, z); g.rotateY(ry); return g; };
  const mergeGeos = list => {
    const Pp = [], Nn = [], Uu = [], Cc = [];
    list.forEach(g0 => {
      const g = g0.index ? g0.toNonIndexed() : g0, p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv, c = g.attributes.color;
      for (let i = 0; i < p.count; i++) { Pp.push(p.getX(i), p.getY(i), p.getZ(i)); Nn.push(n.getX(i), n.getY(i), n.getZ(i)); Uu.push(u ? u.getX(i) : 0, u ? u.getY(i) : 0); Cc.push(c ? c.getX(i) : 1, c ? c.getY(i) : 1, c ? c.getZ(i) : 1); }
    });
    const o = new T.BufferGeometry(); o.setAttribute('position', new T.Float32BufferAttribute(Pp, 3)); o.setAttribute('normal', new T.Float32BufferAttribute(Nn, 3)); o.setAttribute('uv', new T.Float32BufferAttribute(Uu, 2)); o.setAttribute('color', new T.Float32BufferAttribute(Cc, 3)); return o;
  };
  const crossG = (w, h) => { const l = []; for (let i = 0; i < 3; i++) l.push(new T.PlaneGeometry(w, h).translate(0, h / 2, 0).rotateY(i * Math.PI / 3)); return mergeGeos(l); };
  const addAll = (arr, gs, dx = 0, dy = 0, dz = 0, ry = 0) => gs.forEach(g => { if (ry) g.rotateY(ry); g.translate(dx, dy, dz); arr.push(g); });

  /* ---------- terén ---------- */
  const tg = new T.PlaneGeometry(1100, 1320, 300, 360); tg.rotateX(-Math.PI / 2); tg.translate(250, 0, -1060);
  const tp = tg.attributes.position, tcol = new Float32Array(tp.count * 3);
  const mixN = (a, b, t) => a + (b - a) * clamp(t, 0, 1);
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i), z = tp.getZ(i); tp.setY(i, H(x, z));
    const n = (Math.sin(x * .05) * Math.cos(z * .043) * .5 + .5) * .7 + sm(430, 520, -z) * .1 + (Math.sin(x * .21 + z * .17) * .5 + .5) * .08;
    const wheat = sm(14, 40, z - ZB) * .9, crop = sm(30, 70, x) * sm(40, 100, ZB - z) * sm(ZB - 380, ZB - 330, z) * .95 + sm(SX + 55, SX + 90, x) * sm(12, 40, ZB - z) * .9;
    let r = mixN(.08, .16, n), g = mixN(.3, .42, n), b = mixN(.03, .06, n);
    const pt = Math.sin(x * .013 + z * .007) * Math.sin(z * .017 - x * .005) * .5 + .5;   // velké louky: sušší a svěží pruhy
    r += (pt - .5) * .07; g += (pt - .5) * .06;
    r = mixN(r, .55, wheat); g = mixN(g, .42, wheat); b = mixN(b, .1, wheat);
    r = mixN(r, .07, crop); g = mixN(g, .32, crop); b = mixN(b, .04, crop);
    const row = crop > .5 ? Math.sin(x * 1.7) * .018 : 0;   // náznak brázd na polích
    const j = (Math.sin(x * 1.3) * Math.cos(z * 1.1)) * .012 + row; tcol.set([r + j, g + j, b + j * .5], i * 3);
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
  const road2 = rmat(roadTex(2), -2), road3 = rmat(roadTex(3), -4), plainMat = rmat(plainAsph, -3), shoulderMat = rmat(gravelTex, -1);
  const line = (x0, x1, st0) => { const a = []; for (let x = x0; x <= x1 + .1; x += st0) a.push([x, HP, ZB]); return a; };
  ribbon(pathA, 9.8, shoulderMat, .05);                                   // štěrková krajnice vesnické silnice
  ribbon(line(-220, 700, 6), x => wB(x) + 2.8, shoulderMat, .06);         // krajnice státovky
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
    pm.count = k; pm.castShadow = true; pm.frustumCulled = false; scene.add(pm); }

  /* ---------- domy: šest typů se sedlovou střechou, okny s rámy a parapety, dveřmi, komínem ---------- */
  const coneG = new T.ConeGeometry(.7071, 1, 4).rotateY(Math.PI / 4);
  // sedlová střecha s převisem: vrací tašky + štíty
  function gableGeo(w, d, h, rh, ov) {
    const x0 = -w / 2 - ov, x1 = w / 2 + ov, zf = d / 2 + ov, zb = -d / 2 - ov, sl = rh / (d / 2), ye = h - ov * sl, yr = h + rh, Lx = (x1 - x0) / 1.7, Ls = Math.hypot(zf, yr - ye) / 1.1;
    const A = [x0, ye, zf], B = [x1, ye, zf], Cc = [x1, yr, 0], D = [x0, yr, 0], A2 = [x1, ye, zb], B2 = [x0, ye, zb], C2 = [x0, yr, 0], D2 = [x1, yr, 0];
    const uvq = [[0, 0], [Lx, 0], [Lx, Ls], [0, 0], [Lx, Ls], [0, Ls]];
    const roof = [polyG([A, B, Cc, A, Cc, D], uvq, 0xffffff), polyG([A2, B2, C2, A2, C2, D2], uvq, 0xffffff), boxG(w + 2 * ov + .1, .14, .22, 0, yr + .02, 0, 0x8a5848)];
    const gab = [];
    for (const sx of [1, -1]) { const xs = sx * w / 2, a = [xs, h, d / 2], b = [xs, h, -d / 2], c = [xs, yr, 0]; gab.push(polyG(sx > 0 ? [a, b, c] : [b, a, c], [[0, 0], [d / 3, 0], [d / 6, rh / 3]], 0xffffff)); }
    return { roof, gab };
  }
  const HT = [
    { w: 8.6, d: 7, h: 3.7, rh: 2.6, fl: 1, shut: false, annex: false },
    { w: 10.5, d: 8, h: 4, rh: 3, fl: 1, shut: true, annex: false },
    { w: 9, d: 8, h: 6.4, rh: 3.4, fl: 2, shut: true, annex: false },
    { w: 12.5, d: 7.2, h: 3.8, rh: 2.6, fl: 1, shut: false, annex: false },
    { w: 9.5, d: 7.6, h: 3.9, rh: 2.8, fl: 1, shut: true, annex: true },
    { w: 11, d: 9, h: 6.2, rh: 3.8, fl: 2, shut: false, annex: true }
  ];
  function houseGeos(t) {
    const { w, d, h, rh, fl, shut, annex } = t, wall = [], roof = [], glass = [], gt = gableGeo(w, d, h, rh, .55);
    roof.push(...gt.roof); wall.push(...gt.gab);
    wall.push(boxG(w, h + 1.5, d, 0, (h - 1.5) / 2, 0, 0xffffff), boxG(w + .14, 1.1, d + .14, 0, .35, 0, 0x9a9690));   // stěna + sokl
    wall.push(boxG(.7, rh * .7 + .9, .7, w * .24, h + rh * .65 + .45, -.5, 0xa8624a), boxG(.9, .1, .9, w * .24, h + rh + .95, -.5, 0x55504e));   // komín
    const shCol = [0x56704a, 0x6a4a32, 0x3f5a78][Math.floor(w * 3) % 3];
    function win(lx, ly, dist, ry, ww = .95, hh = 1.2, sh = false) {
      const ps = [boxG(ww + .2, hh + .2, .08, lx, ly, dist + .02, 0xf4f2ea), boxG(ww + .38, .07, .22, lx, ly - hh / 2 - .13, dist + .08, 0xcfc8ba)];
      if (sh) { ps.push(boxG(.4, hh + .1, .05, lx - ww / 2 - .32, ly, dist + .05, shCol), boxG(.4, hh + .1, .05, lx + ww / 2 + .32, ly, dist + .05, shCol)); }
      ps.forEach(g => { if (ry) g.rotateY(ry); wall.push(g); });
      const gl = planeG(ww, hh, lx, ly, dist + .07, ry); glass.push(gl);
    }
    const fx = w > 12 ? [-.38, -.19, .19, .38].map(k => k * w) : [-.3 * w, .3 * w];
    for (let f = 0; f < fl; f++) {
      const yy = 1.75 + f * 3.1;
      (f ? fx.concat(0) : fx).forEach(lx => win(lx, yy, d / 2, 0, .95, 1.2, shut));
      [.3 * w, -.3 * w].forEach(lx => win(lx, yy, -d / 2, Math.PI, .95, 1.2, false));
      for (const sx of [1, -1]) (d > 7.5 ? [-d * .22, d * .22] : [0]).forEach(lz => win(lz, yy, w / 2, sx * Math.PI / 2, .95, 1.2, false));
    }
    if (fl === 1) for (const sx of [1, -1]) win(0, h + rh * .3, w / 2, sx * Math.PI / 2, .6, .7, false);   // okénko ve štítu
    // dveře: rám, křídlo, schod, stříška
    const door = [boxG(1.3, 2.3, .1, 0, 1.15, d / 2 + .02, 0xf4f2ea), boxG(1, 2.12, .06, 0, 1.06, d / 2 + .06, 0x5b3a26), boxG(.06, .06, .05, .32, 1.05, d / 2 + .1, 0xd8c070), boxG(1.9, .22, .7, 0, .05, d / 2 + .34, 0x9c9a94), boxG(1.9, .1, 1, 0, 2.62, d / 2 + .46, 0x5a3a2e), boxG(.08, .35, .08, -.8, 2.42, d / 2 + .85, 0xe9e5d8), boxG(.08, .35, .08, .8, 2.42, d / 2 + .85, 0xe9e5d8)];
    door.forEach(g => wall.push(g));
    if (annex) {
      const aw = w * .42, ah = h * .72, ad = d * .8, ar = rh * .6, ax = w / 2 + aw / 2 - .1, az = -d * .05, ag = gableGeo(aw, ad, ah, ar, .4);
      wall.push(boxG(aw, ah + 1.5, ad, ax, (ah - 1.5) / 2, az, 0xf0ece2), boxG(aw * .72, ah * .82, .08, ax, ah * .41, az + ad / 2 + .03, 0x6a6e73));
      [...ag.roof, ...ag.gab].forEach((g, i) => { g.translate(ax, 0, az); (i < 3 ? roof : wall).push(g); });
    }
    return { wall: mergeGeos(wall), roof: mergeGeos(roof), glass: mergeGeos(glass) };
  }
  const houseQ = HT.map(() => []);
  function house(x, z, w, d, h, col, roofCol, facing) {   // jen zařadí dům; vykreslí se najednou přes InstancedMesh
    const t = clamp(Math.floor((w - 8) * 1.5), 0, 5);
    houseQ[t].push({ x, y: H(x, z) - .12, z, f: facing, col, rc: roofCol, s: .94 + ((Math.abs(Math.sin(x * 12.9 + z * 7.3)) * 43758.5) % 1) * .14 });
  }
  function buildHouses() {
    houseQ.forEach((arr, ti) => {
      if (!arr.length) return;
      const gg = houseGeos(HT[ti]), n = arr.length;
      const mk = (geo, mat, cast) => { const m = new T.InstancedMesh(geo, mat, n); m.castShadow = cast; m.receiveShadow = true; m.frustumCulled = false; scene.add(m); return m; };
      const mw = mk(gg.wall, wallMat, true), mr = mk(gg.roof, roofMat, true), mg = mk(gg.glass, winMat, false);
      arr.forEach((q, i) => {
        dm.position.set(q.x, q.y, q.z); dm.rotation.set(0, q.f, 0); dm.scale.setScalar(q.s); dm.updateMatrix();
        mw.setMatrixAt(i, dm.matrix); mr.setMatrixAt(i, dm.matrix); mg.setMatrixAt(i, dm.matrix);
        tc.setHex(q.col); mw.setColorAt(i, tc); tc.setHex(q.rc); mr.setColorAt(i, tc);
      });
      [mw, mr, mg].forEach(m => m.instanceMatrix.needsUpdate = true); mw.instanceColor.needsUpdate = mr.instanceColor.needsUpdate = true;
    });
  }
  const walls = [0xf2e4c4, 0xe6cfa6, 0xd5e0c8, 0xedcdc6, 0xe8e4da, 0xf0d9a8], roofs = [0xffffff, 0xd9bcb0, 0x8b7f7c];
  for (let s = 26, i = 0; s < LA - 75; s += 30 + rnd() * 10, i++) for (const side of [-1, 1]) {
    if (rnd() < .18) continue; const p = pathAt(s), off = (10 + rnd() * 4) * side, x = p.x - p.tz * off, z = p.z + p.tx * off;
    if (distPath(x, z, pathA) < Math.abs(off) * .85) continue;   // v zatáčkách by dům ležel na jiné silnici
    house(x, z, 8 + rnd() * 4, 7 + rnd() * 3, 4 + rnd() * 1.5, walls[(i + (side > 0 ? 2 : 0)) % 6], roofs[i % 3], Math.atan2(p.x - x, p.z - z));
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
    house(GX + 11, GZ - 1, 10, 8, 4.5, 0xedcdc6, 0xd9bcb0, 0);
  })();
  // kostel: nave se sedlovou střechou, štíty, vysoká okna, věž s jehlancem a křížem
  (() => {
    const p = pathAt(S0 + 40), x = p.x + p.tz * 26, z = p.z - p.tx * 26, g = new T.Group(); g.position.set(x, H(x, z) - .1, z); g.rotation.y = Math.atan2(p.x - x, p.z - z) + Math.PI / 2;
    const m = std({ color: 0xf0e8d8, map: plaster, roughness: .95 }), plinthM = std({ color: 0x8a867e, roughness: 1 });
    const nave = new T.Mesh(new T.BoxGeometry(9, 9, 16), m); nave.position.y = 3; const tw = new T.Mesh(new T.BoxGeometry(4.4, 20, 4.4), m); tw.position.set(0, 8.5, 9);
    const sp = new T.Mesh(new T.ConeGeometry(3.2, 8, 4).rotateY(Math.PI / 4), std({ color: 0x4a3f3a, roughness: .7 })); sp.position.set(0, 22.5, 9);
    const cr = new T.Mesh(new T.BoxGeometry(.25, 2.4, .25), std({ color: 0x222222 })); cr.position.set(0, 28, 9); const cr2 = new T.Mesh(new T.BoxGeometry(1.4, .25, .25), cr.material); cr2.position.set(0, 28.4, 9);
    const base = new T.Mesh(new T.BoxGeometry(9.3, 1.2, 16.3), plinthM); base.position.set(0, .1, 0);
    const gr = gableGeo(16.4, 9, 7.5, 4.3, .6); const rg = mergeGeos(gr.roof).rotateY(Math.PI / 2), gb = mergeGeos(gr.gab).rotateY(Math.PI / 2);
    const rf = new T.Mesh(rg, roofMat); rf.material = roofMat; const gbm = new T.Mesh(gb, m);
    const rfI = new T.Mesh(rg, std({ map: tiles, vertexColors: true, color: 0xd9bcb0, roughness: .8, side: T.DoubleSide }));
    [nave, tw, sp, rfI, cr, cr2, gbm, base].forEach(o => { o.castShadow = true; g.add(o); });
    for (const sx of [1, -1]) for (const zz of [-5, 0, 5]) { const w1 = new T.Mesh(new T.PlaneGeometry(1.3, 3.4), winMat); w1.position.set(sx * 4.52, 3.6, zz); w1.rotation.y = sx * Math.PI / 2; g.add(w1); }
    const tw1 = new T.Mesh(new T.PlaneGeometry(1.1, 2.6), winMat); tw1.position.set(0, 13.5, 9 + 2.21); g.add(tw1);
    scene.add(g);
  })();
  // ploty podél vesnických ulic
  { const fm = new T.InstancedMesh(new T.BoxGeometry(3, .9, .1), std({ color: 0xcfc6b0, roughness: .9 }), 900), fd = new T.Object3D(); let k = 0;
    for (let s = 30; s < LA - 140 && k < 900; s += 3.1) { const p = pathAt(s); for (const side of [-1, 1]) {
      if (rnd() < .22) continue; const off = 4.9 * side, x = p.x - p.tz * off, z = p.z + p.tx * off; if (distPath(x, z, pathA) < 4.5) continue;
      fd.position.set(x, H(x, z) + .45, z); fd.rotation.set(0, Math.atan2(-p.tz, p.tx), 0); fd.updateMatrix(); fm.setMatrixAt(k++, fd.matrix); } }
    fm.count = k; fm.castShadow = true; fm.frustumCulled = false; scene.add(fm); }
  // pouliční lampy (v noci svítí)
  { const pg = new T.InstancedMesh(new T.CylinderGeometry(.07, .09, 6, 8), std({ color: 0x555a5e, metalness: .7, roughness: .5 }), 60), hg = new T.InstancedMesh(new T.BoxGeometry(1.1, .16, .4), lampMat, 60), ld = new T.Object3D(); let k = 0, sd = 1;
    for (let s = 40; s < LA - 110 && k < 60; s += 46) { const p = pathAt(s), off = 4.1 * sd, x = p.x - p.tz * off, z = p.z + p.tx * off; sd = -sd; if (distPath(x, z, pathA) < 3.9) continue;
      ld.position.set(x, H(x, z) + 3, z); ld.rotation.set(0, 0, 0); ld.updateMatrix(); pg.setMatrixAt(k, ld.matrix);
      ld.position.set(x - p.tz * .5 * -sd, H(x, z) + 6.05, z + p.tx * .5 * -sd); ld.rotation.set(0, Math.atan2(-p.tz, p.tx), 0); ld.updateMatrix(); hg.setMatrixAt(k++, ld.matrix); }
    pg.count = hg.count = k; pg.castShadow = true; pg.frustumCulled = hg.frustumCulled = false; scene.add(pg, hg); }

  /* ---------- stromy: hrbolaté koruny, barevný přechod, kmen s větvemi (dub, buk, borovice, bříza) ---------- */
  const crownG = new T.IcosahedronGeometry(1, 2);   // používají keře u benzinky
  const hash3 = (x, y, z) => { const q = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return q - Math.floor(q); };
  const vnoise = (x, y, z) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi,
      u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf), l = (a, b2, t) => a + (b2 - a) * t;
    return l(l(l(hash3(xi, yi, zi), hash3(xi + 1, yi, zi), u), l(hash3(xi, yi + 1, zi), hash3(xi + 1, yi + 1, zi), u), v),
      l(l(hash3(xi, yi, zi + 1), hash3(xi + 1, yi, zi + 1), u), l(hash3(xi, yi + 1, zi + 1), hash3(xi + 1, yi + 1, zi + 1), u), v), w);
  };
  const weld = g0 => {
    const p = g0.attributes.position, map = new Map(), pos = [], idx = [];
    for (let i = 0; i < p.count; i++) {
      const k = Math.round(p.getX(i) * 1000) + ',' + Math.round(p.getY(i) * 1000) + ',' + Math.round(p.getZ(i) * 1000); let j = map.get(k);
      if (j === undefined) { j = pos.length / 3; map.set(k, j); pos.push(p.getX(i), p.getY(i), p.getZ(i)); } idx.push(j);
    }
    return { pos, idx };
  };
  const mix3 = (a, b2, t) => [a[0] + (b2[0] - a[0]) * t, a[1] + (b2[1] - a[1]) * t, a[2] + (b2[2] - a[2]) * t];
  const mkPart = (V, Cl, Ix) => (g0, colFn) => {
    const base = V.length / 3, p = g0.attributes.position, ix = g0.index;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), c = colFn(x, y, z); V.push(x, y, z); Cl.push(c[0], c[1], c[2]); }
    for (let i = 0; i < ix.count; i++) Ix.push(base + ix.getX(i));
  };
  const finishTree = (V, Cl, Ix) => {
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(V, 3)); g.setAttribute('color', new T.Float32BufferAttribute(Cl, 3));
    g.setIndex(Ix); g.computeVertexNormals(); return g;
  };
  const barkCol = (x, y, z) => { const n = .7 + .5 * vnoise(x * 9, y * 3, z * 9) + .25 * vnoise(x * 30, y * 8, z * 30); return [.17 * n, .105 * n, .06 * n]; };
  const birchBark = (x, y, z) => { const n = vnoise(x * 16, y * 5, z * 16), b = (n > .64 ? .1 : .8) + .06; return [b, b * .98, b * .93]; };
  function makeOak(blobs, trunkH, seedv, dark, light, bark = barkCol, branchC = [.15, .095, .055], tr0 = .15, tr1 = .34) {
    const V = [], Cl = [], Ix = [], part = mkPart(V, Cl, Ix);
    let lo = 1e9, hi = -1e9; blobs.forEach(b2 => { lo = Math.min(lo, b2[1] - b2[4]); hi = Math.max(hi, b2[1] + b2[4]); });
    const tr = new T.CylinderGeometry(tr0, tr1, trunkH, 8, 4).translate(0, trunkH / 2, 0), tpos = tr.attributes.position;
    for (let i = 0; i < tpos.count; i++) { const f = 1 + Math.max(0, 1 - tpos.getY(i) / .6) * .7; tpos.setX(i, tpos.getX(i) * f); tpos.setZ(i, tpos.getZ(i) * f); }
    part(tr, bark);
    blobs.slice(1, 4).forEach(b2 => {   // větve vedoucí do koruny
      const d = new T.Vector3(b2[0] * .8, b2[1] - trunkH * .7, b2[2] * .8), len = d.length(); d.normalize();
      const g0 = new T.CylinderGeometry(.04, .1, len, 5).translate(0, len / 2, 0);
      g0.applyMatrix4(new T.Matrix4().compose(new T.Vector3(0, trunkH * .7, 0), new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d), new T.Vector3(1, 1, 1)));
      part(g0, () => branchC);
    });
    blobs.forEach((b2, bi) => {
      const g0 = weld(new T.IcosahedronGeometry(1, 2)), base = V.length / 3, sd = seedv + bi * 3.7;
      for (let i = 0; i < g0.pos.length; i += 3) {
        let x = g0.pos[i], y = g0.pos[i + 1], z = g0.pos[i + 2]; const l = Math.hypot(x, y, z); x /= l; y /= l; z /= l;
        const n1 = vnoise(x * 1.8 + sd, y * 1.8 + sd * .7, z * 1.8 + sd * 1.3), n2 = vnoise(x * 5 + sd, y * 5 - sd, z * 5), n3 = vnoise(x * 4.2 - sd, y * 4.2 + sd * .3, z * 4.2 + sd);
        const r = .72 + .42 * n1 + .16 * n2 + .08 * n3, wy = b2[1] + y * b2[4] * r;
        V.push(b2[0] + x * b2[3] * r, wy, b2[2] + z * b2[5] * r);
        const t = clamp((wy - lo) / (hi - lo) * .85 + (n2 - .5) * .5 + (n1 - .5) * .25 + (n3 - .5) * .3 + y * .1, 0, 1), c = mix3(dark, light, t);
        Cl.push(c[0], c[1], c[2]);
      }
      g0.idx.forEach(j => Ix.push(base + j));
    });
    return finishTree(V, Cl, Ix);
  }
  function makePine(seedv) {
    const V = [], Cl = [], Ix = [], part = mkPart(V, Cl, Ix), dark = [.015, .075, .035], light = [.07, .27, .1];
    part(new T.CylinderGeometry(.14, .28, 3, 7).translate(0, 1.5, 0), barkCol);
    [[2.3, 2.6, 1.5], [1.95, 2.4, 2.9], [1.6, 2.2, 4.2], [1.25, 2.0, 5.4], [.85, 1.8, 6.5]].forEach(([r, h, y0], k) => {
      const g0 = new T.ConeGeometry(r, h, 11, 2).translate(0, y0 + h / 2, 0), p = g0.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i), yy = p.getY(i);
        if (Math.hypot(x, z) > .01) { const f = .82 + .36 * vnoise(x * 2.5 + k * 5 + seedv, yy * 2, z * 2.5); p.setX(i, x * f); p.setZ(i, z * f); }
      }
      part(g0, (x, y, z) => { const tt = (y - y0) / h, n = vnoise(x * 3 + seedv, y * 3, z * 3); return mix3(dark, light, clamp(.12 + .4 * tt + (y0 - 1.5) / 6.5 * .35 + (n - .5) * .4, 0, 1)); });
    });
    return finishTree(V, Cl, Ix);
  }
  const NT = 1200, treeMat = std({ vertexColors: true, roughness: .92 });
  addWind(treeMat, 'float hh=max(position.y-2.5,0.);float wv=sin(uTime*1.1+ip.x*.2+ip.z*.17);transformed.x+=wv*hh*hh*.006;transformed.z+=wv*.5*hh*hh*.004;', 'treeWind');
  const oakDark = [.035, .14, .03], oakLight = [.17, .44, .07];
  const oakA = makeOak([[0, 6.2, 0, 2.9, 2.4, 2.9], [1.6, 5.2, .6, 2.1, 1.8, 2.1], [-1.5, 5.4, -.7, 2.2, 1.9, 2.2], [.4, 4.7, -1.6, 1.9, 1.6, 1.9], [-.2, 7.6, .3, 1.9, 1.6, 1.9], [.7, 5.0, 1.7, 1.8, 1.5, 1.8]], 3.6, 1.3, oakDark, oakLight);
  const oakB = makeOak([[0, 6.8, 0, 2.2, 3.0, 2.2], [1.1, 5.2, .3, 1.7, 1.9, 1.7], [-1.0, 5.6, -.4, 1.8, 2.0, 1.8], [0, 8.6, 0, 1.4, 1.7, 1.4], [.2, 4.3, -.9, 1.5, 1.4, 1.5]], 3.2, 7.7, [.03, .13, .04], [.14, .4, .09]);
  const birch = makeOak([[0, 7.2, 0, 1.5, 2.8, 1.5], [.5, 5.6, .2, 1.2, 1.7, 1.2], [-.5, 6.2, -.3, 1.2, 1.9, 1.2], [.1, 8.9, 0, .95, 1.3, .95]], 4.4, 4.2, [.06, .22, .05], [.28, .55, .14], birchBark, [.7, .68, .64], .08, .17);
  const pineGeo = makePine(3.1);
  const mkInst = g0 => { const m = new T.InstancedMesh(g0, treeMat, NT); m.castShadow = true; m.count = 0; m.frustumCulled = false; scene.add(m); return m; };
  const treeM = [mkInst(oakA), mkInst(oakB), mkInst(pineGeo), mkInst(birch)], treeN = [0, 0, 0, 0];
  for (let k = 0; k < 26000 && treeN[0] + treeN[1] + treeN[2] + treeN[3] < NT; k++) {
    const x = -290 + rnd() * 1080, z = -1700 + rnd() * 1290, dr = dRoad(x, z);
    if (dr < (z < ZB - 60 ? 22 : 13) || dStat(x, z) < 12 || (x > SX + 55 && x < SX + 85 && z > ZB - 40 && z < ZB + 5)) continue;
    if (Math.hypot(x - GX, z - GZ) < 30) continue;
    const forest = x < 10 && z < ZB - 40 ? .5 : 0;
    if (Math.sin(x * .03) * Math.cos(z * .025) + rnd() * .8 + forest < .1) continue;
    const y = H(x, z), s = .8 + rnd() * .9, rk = rnd(), kind = rk < .28 ? 2 : rk < .42 ? 3 : rk < .71 ? 0 : 1, n = treeN[kind]++;
    dm.position.set(x, y - .1, z); dm.rotation.set((rnd() - .5) * .08, rnd() * 6.28, (rnd() - .5) * .08);
    dm.scale.set(s * (.9 + rnd() * .25), s * (kind === 2 ? 1 + rnd() * .4 : kind === 3 ? 1 + rnd() * .3 : .9 + rnd() * .35), s * (.9 + rnd() * .25)); dm.updateMatrix();
    treeM[kind].setMatrixAt(n, dm.matrix);
    const au = (kind === 0 || kind === 1 || kind === 3) && rnd() < .08;   // občas podzimní strom
    tc.setRGB(au ? 1.9 : .85 + rnd() * .4, au ? 1.0 : .88 + rnd() * .3, au ? .5 : .85 + rnd() * .3); treeM[kind].setColorAt(n, tc);
  }
  treeM.forEach((m, i) => { m.count = treeN[i]; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; });

  /* ---------- tráva a luční kvítí (kývají se ve větru) ---------- */
  const NG = 24000, tuftG = crossG(.8, .9), tuftM = std({ map: tuftTex, alphaTest: .45, side: T.DoubleSide, roughness: 1 });
  addWind(tuftM, 'float wv=sin(uTime*1.6+ip.x*.35+ip.z*.27)+.5*sin(uTime*2.9+ip.x*.8);transformed.x+=wv*position.y*position.y*.1;transformed.z+=wv*position.y*position.y*.06;', 'tuftWind');
  const tu1 = new T.InstancedMesh(tuftG, tuftM, NG); let gi = 0;
  const notRoad = (x, z) => !(onApron(x, z) || onB(x, z) || distPath(x, z, slips[0]) < 5 || distPath(x, z, slips[1]) < 5 || distPath(x, z, pathA) < 3.8);
  const scatter = () => {
    const r = rnd();
    if (r < .55) { const p = pathAt(rnd() * LA), off = (rnd() < .5 ? -1 : 1) * (4.5 + rnd() * 12); return [p.x - p.tz * off, p.z + p.tx * off]; }
    if (r < .85) return [-200 + 900 * rnd(), ZB + (rnd() < .5 ? -1 : 1) * (6 + rnd() * 14)];
    return [-150 + 800 * rnd(), ZB - 20 - 420 * rnd()];
  };
  for (let k = 0; k < 90000 && gi < NG; k++) {
    const [x, z] = scatter(); if (!notRoad(x, z) || dStat(x, z) < 2) continue;
    const y = H(x, z), s = .7 + rnd() * .9; tc.setRGB(.7 + rnd() * .5, .8 + rnd() * .4, .6 + rnd() * .3);
    dm.position.set(x, y - .02, z); dm.rotation.set(0, rnd() * 3, 0); dm.scale.set(s, s * (.8 + rnd() * .5), s); dm.updateMatrix(); tu1.setMatrixAt(gi, dm.matrix); tu1.setColorAt(gi, tc); gi++;
  }
  tu1.count = gi; tu1.frustumCulled = false; scene.add(tu1);
  { const NF = 7000, fl1 = new T.InstancedMesh(crossG(.28, .55), std({ map: flowTex, alphaTest: .5, side: T.DoubleSide, roughness: 1 }), NF); let f = 0;
    const pal = [[1, 1, 1], [1, .85, .2], [1, .55, .72], [.72, .55, 1], [1, .2, .15], [.95, .95, .7]];
    addWind(fl1.material, 'float wv=sin(uTime*1.9+ip.x*.5+ip.z*.4);transformed.x+=wv*position.y*position.y*.18;', 'flowWind');
    for (let k = 0; k < 40000 && f < NF; k++) {
      const [x, z] = scatter(); if (!notRoad(x, z) || dStat(x, z) < 2 || Math.sin(x * .05 + z * .03) < -.1) continue;
      const c = pal[Math.floor(rnd() * pal.length)], s = .7 + rnd() * .7; tc.setRGB(c[0], c[1], c[2]);
      dm.position.set(x, H(x, z) - .02, z); dm.rotation.set(0, rnd() * 3, 0); dm.scale.set(s, s, s); dm.updateMatrix(); fl1.setMatrixAt(f, dm.matrix); fl1.setColorAt(f, tc); f++;
    }
    fl1.count = f; fl1.frustumCulled = false; scene.add(fl1); }
  buildHouses();
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
  const shopWin = new T.Mesh(new T.PlaneGeometry(12, 2.2), std({ color: 0x1c2a34, roughness: .2, metalness: .4, emissive: 0xffb85c, emissiveIntensity: 0 })); lit.push({ m: shopWin.material, k: 2.4 }); put(shopWin, -3.7, 27.9, 2.3); shopWin.castShadow = false;
  const shopSign = board(label(['KM PRONA'], 1024, 160, '#1c3f86', '#fff', 110), 9, 1.4); put(shopSign, -3.7, 27.8, 4.1);
  box(9, 3.4, 6, std({ color: 0x6b7a8c, roughness: .8 }), -30.5, 30, 1.7); box(9.4, .3, 6.4, std({ color: 0x3c4a60 }), -30.5, 30, 3.5);
  function canopy(e, n, w, d) {
    box(w, .6, d, white, e, n, 5.6);
    const sp = new T.Mesh(new T.PlaneGeometry(w - 1, d - 1), std({ map: solar, roughness: .25, metalness: .6, envMap: envTex })); sp.rotation.x = -Math.PI / 2; put(sp, e, n, 5.92); sp.castShadow = false;
    const un = new T.Mesh(new T.PlaneGeometry(w - .6, d - .6), glow); un.rotation.x = Math.PI / 2; put(un, e, n, 5.28); un.castShadow = false;
    for (const [px, pz] of [[-w / 2 + .5, -d / 2 + .5], [w / 2 - .5, -d / 2 + .5], [-w / 2 + .5, d / 2 - .5], [w / 2 - .5, d / 2 - .5]]) box(.5, 5.4, .5, white, e + px, n + pz, 2.7);
    for (const px of [-w / 4, w / 4]) {
      box(2, .3, 6, std({ color: 0xaaaaa4 }), e + px, n, .15); box(.9, 2.2, .8, std({ color: 0xd8372b, roughness: .4 }), e + px, n, 1.3);
      const sc = new T.Mesh(new T.PlaneGeometry(.55, .5), std({ color: 0x1c2a34, emissive: 0xffb85c, emissiveIntensity: 0 })); lit.push({ m: sc.material, k: 2.4 }); put(sc, e + px, n - .41, 1.8); sc.castShadow = false;
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
    const gm = o.interior ? glassMat.clone() : glassMat; if (o.interior) carEnv.push(gm);
    const mesh = (g0, mat) => { const m = new T.Mesh(g0, mat); m.castShadow = true; model.add(m); return m; };
    const bx = (w, h, d, x, y, z, mat = trim) => { const m = mesh(new T.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; };
    mesh(GEO.body, bodyMat); const cabinM = mesh(GEO.cabin, bodyMat); GEO.glass.forEach(g0 => mesh(g0, gm)); mesh(GEO.ws, gm).castShadow = false; mesh(GEO.rw, gm).castShadow = false;
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

    /* --- interiér a spící Kotlik (jen hráčovo auto; zobrazí se až při spaní, kdy se sundá střecha a sklo zprůhlední) --- */
    let sleepSet = null, dome = null, headRef = null;
    if (o.interior) {
      sleepSet = new T.Group(); sleepSet.visible = false; model.add(sleepSet);
      const sm2 = (c, r = .8) => std({ color: c, roughness: r }), B = (w, h, d) => new T.BoxGeometry(w, h, d);
      const add = (g0, mat, x, y, z, rx = 0, ry = 0, rz = 0, par = sleepSet) => { const m = new T.Mesh(g0, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; par.add(m); return m; };
      const dark = sm2(0x1c1d20), seatM = sm2(0x2b2d31, .9), skin = sm2(0xe3b393, .55), jacket = sm2(0x2f4f80, .85), pants = sm2(0x2a2d34), cap = sm2(0xd9892b, .9), cuff = sm2(0xb36f1c, .9);
      add(B(2.5, .012, 1.6), dark, -.85, 1.006, 0);                    // tmavá podlaha kabiny (zakrývá lakovaný plech)
      add(B(.28, .12, 1.5), dark, .5, 1.06, 0);                        // palubní deska
      add(B(.5, .14, .5), seatM, .3, 1.06, -.45); add(B(.1, .75, .5), seatM, .02, .86, -.45, 0, 0, .4);   // sedadlo řidiče
      add(B(.5, .14, .5), seatM, .3, 1.06, .45); add(B(.1, .75, .5), seatM, .02, .86, .45, 0, 0, .25);    // spolujezdec
      add(B(.55, .14, 1.4), seatM, -.9, 1.06, 0); add(B(.12, .6, 1.4), seatM, -1.2, 1.28, 0, 0, 0, .15);  // zadní lavice
      add(new T.TorusGeometry(.17, .022, 8, 24), dark, .4, 1.13, -.45, 0, Math.PI / 2, -.5);               // volant
      add(B(.24, .66, .46), jacket, .1, .84, -.45, 0, 0, .4);                                              // trup, opřený v sedadle
      add(B(.55, .16, .34), pants, .53, 1.12, -.45);                                                       // stehna
      add(B(.1, .42, .12), jacket, .06, .92, -.73, 0, 0, .4); add(B(.1, .42, .12), jacket, .06, .92, -.17, 0, 0, .4);   // paže
      add(B(.36, .11, .15), jacket, .24, 1.05, -.45, 0, 0, .3);                                            // zkřížené předloktí
      add(B(.09, .08, .09), skin, .36, 1.07, -.55); add(B(.09, .08, .09), skin, .36, 1.07, -.35);          // ruce
      const head = new T.Group(); head.position.set(-.02, 1.22, -.45); head.rotation.set(.15, 0, .3); sleepSet.add(head); headRef = head;
      const hd = add(new T.SphereGeometry(1, 20, 16), skin, 0, 0, 0, 0, 0, 0, head); hd.scale.set(.115, .135, .105);
      add(new T.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI * .55), cap, 0, .035, 0, 0, 0, 0, head).scale.set(.128, .125, .118);   // čepice
      add(new T.CylinderGeometry(.128, .128, .05, 18), cuff, 0, .045, 0, 0, 0, 0, head).scale.set(1, 1, .93);
      for (const s of [-1, 1]) { add(B(.01, .012, .04), dark, .106, .0, s * .04, 0, 0, 0, head); add(B(.012, .01, .05), sm2(0x3a2a1c), .108, .035, s * .04, 0, 0, 0, head); add(new T.SphereGeometry(.028, 8, 8), skin, 0, -.01, s * .108, 0, 0, 0, head); }   // zavřené oči, obočí, uši
      add(new T.SphereGeometry(.024, 8, 8), skin, .112, -.025, 0, 0, 0, 0, head); add(B(.01, .02, .05), sm2(0x5a2a2a), .1, -.065, 0, 0, 0, 0, head);   // nos, pootevřená pusa
      add(B(.012, .06, .1), sm2(0x9c7a64, 1), .098, -.085, 0, 0, 0, 0, head);                                // strniště
      // střecha, sloupky: kabina se při spaní schová a sklo zprůhlední, takže je dovnitř vidět
      add(B(2.0, .05, 1.56), bodyMat, -.98, 1.445, 0);
      for (const s of [-1, 1]) { add(B(.05, .76, .06), bodyMat, .32, 1.215, s * .74, 0, 0, .949); add(B(.1, .4, .1), bodyMat, -.225, 1.22, s * .78); add(B(.1, .4, .1), bodyMat, -1.125, 1.22, s * .78); }
      dome = new T.PointLight(0xffe0b0, 0, 4.5, 1.6); dome.position.set(-.4, 1.3, 0); model.add(dome); lit.push({ m: dome, k: 2.4 });
    }
    return { car, rig, model, bodyMat, tail, indL, indR, wheels, woltBox, cabinM, sleepSet, gm, dome, headRef };
  }
  const P = buildCar(0xbfc4c8, { interior: true }), car = P.car, rig = P.rig, wheels = P.wheels, tail = P.tail, indL = P.indL, indR = P.indR;
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

  /* ---------- kouř, rez a "Z" nad spícím Kotlikem ---------- */
  const puffTex = tex(cvs(64, 64, g => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }));
  const puffs = []; for (let i = 0; i < 30; i++) { const s = new T.Sprite(new T.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0 })); s.userData = { life: 0, vy: 0 }; scene.add(s); puffs.push(s); }
  let pi = 0; const tmpV = new T.Vector3();
  function puff(rust) {
    const s = puffs[pi++ % puffs.length]; P.model.localToWorld(tmpV.set(-2.45, .35, -.48)); s.position.copy(tmpV);
    s.material.color.set(rust ? 0x9a4a22 : 0x77797c); s.userData.life = 1; s.userData.vy = rust ? -.4 : .9; s.scale.setScalar(.3);
  }
  const zTex = tex(cvs(64, 64, g => { g.font = 'bold 54px Arial Black, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 7; g.strokeStyle = '#0b1a1f'; g.strokeText('Z', 32, 34); g.fillStyle = '#fff'; g.fillText('Z', 32, 34); }));
  const zzz = [0, 1, 2].map(() => { const s = new T.Sprite(new T.SpriteMaterial({ map: zTex, transparent: true, depthWrite: false, opacity: 0, fog: false })); scene.add(s); return s; });

  /* ---------- stav hry ---------- */
  const FUEL = 100;   // normální nádrž v %
  const keys = { gas: 0, brake: 0, left: 0, right: 0, tap: 0 }; let st, skin = saved.skin === 'wolt' ? 'wolt' : 'classic', last = 0, vis = true, camMode = 0, frame = 0, lastSl = false;
  const look = new T.Vector3(), cpos = new T.Vector3(); let camInit = false;
  function reset() {
    const p = pathAt(0), r = [-p.tz, p.tx];
    st = { mode: 'idle', x: p.x + r[0] * 1.75, z: p.z + r[1] * 1.75, psi: Math.atan2(-p.tx, -p.tz), v: 0, s: 0, fuel: FUEL, time: 0, t: 0, blink: false, blinkOn: false, sig: false, penalty: 0, steer: 0, delta: 0, revT: 0, sleep: 0, wheel: 0, rust: false, tip: '', tipT: 0, sleepT: 0, done: 0, B: false, bumpT: 0, tA: 3, tB: 2, wrong: false };
    npcs.forEach(n => { n.on = false; n.c.car.visible = false; });
    setNight(0); sleepBox.classList.remove('on'); camInit = false; applySkin(skin);
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
    st.t += dt; skyU.time.value = st.t; windU.value = st.t; if (st.tipT > 0) st.tipT -= dt; if (st.bumpT > 0) st.bumpT -= dt;
    const fx = -Math.sin(st.psi), fz = -Math.cos(st.psi);
    const slope = (ground(st.x + fx * 2.3, st.z + fz * 2.3) - ground(st.x - fx * 2.3, st.z - fz * 2.3)) / 4.6;
    if (st.mode === 'drive') {
      st.time += dt; const gas = keys.gas;
      if (keys.tap) { st.blink = !st.blink; keys.tap = 0; }
      if (st.fuel > 0) { st.fuel = Math.max(0, st.fuel - dt * gas * .35); if (st.fuel === 0) { st.rust = true; tip('Došla nafta! Oktávka jede na rez.', 4); } }
      const off = !roadAt(st.x, st.z), sg = Math.sign(st.v);
      let a = gas * (st.fuel > 0 ? 7.5 : 5.2) - .27 * st.v - .6 * sg - slope * 20 - (off ? .5 * st.v + .8 * sg : 0);
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
      st.sleep = Math.min(1, st.sleep + dt / 4); st.sleepT += dt; st.v = 0; setNight(sm(0, 1, st.sleep));
      if (photoOK) { sleepBox.style.display = ''; sleepBox.classList.toggle('on', st.sleep > .4); }
      if (st.sleepT > 8 && !st.done) {
        st.done = 1; const j = ['Kotlik chrápe jako kotel v únoru.', 'Ráno ho čeká výměna sifonu a rozvaděč.', 'Oktávka tiká, chladne a drží pohromadě jen z cti.', 'Po probuzení si objedná Wolt sám sobě.'];
        const tt = st.time + st.penalty;
        say('Kotlik se vyspal', `Cesta z garáže: ${tt.toFixed(0)} s${st.penalty ? ` (z toho ${st.penalty} s trestných)` : ''}. ${st.rust ? 'Dojel jsi na rez.' : 'Zbylo ti ' + Math.round(st.fuel) + ' % nafty.'}<br>${j[Math.floor(Math.random() * j.length)]}`, 'Jet znovu', true);
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
    // při spaní se sundá střecha, sklo zprůhlední a uvnitř je vidět spícího Kotlika
    const sl = st.mode === 'sleep' && st.sleep > .05;
    if (sl !== lastSl) { lastSl = sl; P.sleepSet.visible = sl; P.cabinM.visible = !sl; P.gm.transparent = sl; P.gm.depthWrite = !sl; P.gm.needsUpdate = true; }
    P.gm.opacity = sl ? lerp(1, .2, clamp((st.sleep - .05) * 2, 0, 1)) : 1; P.gm.metalness = sl ? .35 : .9;
    if (P.headRef) P.headRef.rotation.x = .15 + Math.sin(st.t * 1.6) * .02;   // dýchání
    zzz.forEach((s, i) => {
      if (!sl) { s.material.opacity = 0; return; }
      const ph = (st.t * .3 + i / 3) % 1; P.model.localToWorld(tmpV.set(.1 + ph * .15, 1.55 + ph * .8, -.55 - ph * .2)); s.position.copy(tmpV);
      s.scale.setScalar(.12 + ph * .26); s.material.opacity = Math.sin(Math.PI * ph) * .95 * clamp((st.sleep - .3) * 3, 0, 1);
    });
    // střecha a zadní stěna garáže se skryjí, dokud je kamera za autem
    const inG = Math.hypot(st.x - GX, st.z - GZ) < 7.5 && st.mode !== 'idle'; garageHide.forEach(o => o.visible = !inG);
    // kamera
    const cy = car.position.y, f = new T.Vector3(fx, 0, fz), want = new T.Vector3(), tgt = new T.Vector3();
    let kk = 1 - Math.exp(-dt * (st.mode === 'sleep' ? 1.4 : 5));
    if (st.mode === 'idle') { const sw = Math.sin(st.t * .35) * 3.5; want.set(st.x + f.x * 8.5 - f.z * sw, cy + 2 + Math.sin(st.t * .2) * .4, st.z + f.z * 8.5 + f.x * sw); tgt.set(st.x, cy + 1, st.z); }
    else if (st.mode === 'sleep') {   // pomalý průjezd kamery vlevo vpředu před autem: obličej spícího Kotlika
      const sw = Math.sin(st.t * .2); P.model.localToWorld(want.set(2.3 + sw * .35, 1.7, -2.4 + sw * .35)); P.model.localToWorld(tgt.set(-.05, 1.22, -.45));
    }
    else if (camMode === 1 && st.mode === 'drive') { P.model.localToWorld(want.set(1.15, 1.2, 0)); tgt.set(want.x + f.x * 25, want.y + f.y - .6 + car.rotation.x * 25, want.z + f.z * 25); kk = 1; }
    else {
      const d = 7.2 + Math.max(0, st.v) * .05; want.set(st.x - f.x * d, cy + 3 + st.v * .02, st.z - f.z * d); tgt.set(st.x + f.x * 12, cy + 1.4, st.z + f.z * 12);
      if (st.rust && st.v > 1) { want.x += (Math.random() - .5) * .04; want.y += (Math.random() - .5) * .04; }
    }
    if (!camInit) { cpos.copy(want); look.copy(tgt); camInit = true; }
    cpos.lerp(want, kk); look.lerp(tgt, kk); camera.position.copy(cpos); camera.lookAt(look);
    camera.fov = st.mode === 'sleep' ? lerp(52, 36, sm(0, 1, st.sleep)) : (camMode === 1 ? 62 : 52) + Math.min(Math.abs(st.v), 28) * .35; camera.updateProjectionMatrix();
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
    hSpd.textContent = Math.round(Math.abs(st.v) * 3.6); hFuel.style.width = (st.fuel > 0 ? st.fuel / FUEL * 100 : 100) + '%'; hFuel.classList.toggle('rust', st.fuel <= 0);
    hFuelT.textContent = st.fuel > 0 ? `Nafta ${Math.round(st.fuel)} %` : 'Nafta 0 %, jedeš na rez'; hBlink.classList.toggle('on', st.blink);
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
