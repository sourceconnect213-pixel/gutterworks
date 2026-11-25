// 3D models of the ceiling items: H Corner, L Corner, U Corner, Top Molding (PVC, in the Panel Sheet colours),
// GI Channel, GI L Angle (galvanised steel) and Main Tee (2x2 ceiling grid).
// PVC shapes from the supplier's sheet (10 ft lengths; wall thickness 1.33 / 1.25 / 1.06 / 1.21 mm). Widths worked out
// from the sheet's weight per length (rigid PVC ≈ 1.6 g/cm³) and an 8.5 mm slot for the 8 mm panel sheet.
// Units: mm. Each item is its end profile (centre line of each wall + wall thickness) pushed out along its length.
//   mountCeil(el, key, { fin })                      → card preview: turns slowly by itself
//   mountCeil(el, key, { fin, interactive: true })   → big view: drag any direction, pinch / wheel to zoom
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';

const BASE = new URL('./images/ceiling/', import.meta.url).href;
// Panel Sheet colour name (as in the shop) → texture cut from the owner's colour photos
const FIN_TEX = { 'PE+ Teak': 'pe-teak', 'PE+ Brum Teak': 'pe-brum-teak', 'PE+ Kithul': 'pe-kithul', 'PE+ Mahogani': 'pe-mahogani',
                  'PE+ Pine Wood': 'pe-pine', 'Brush White': 'brush-white', 'Fabric White': 'fabric-white' };
const PVC = '#ecedea';
const SLOT = 8.5;                                               // opening that takes the 8 mm panel sheet
const PE = { texW: 25, texL: 160 };                             // one colour photo strip = 25 mm × 160 mm

// shallow curve from A to B, bulging by s to the left of A→B (quadratic curve, n parts)
const bow = ([ax, ay], [bx, by], s, n = 12) => {
  const l = Math.hypot(bx - ax, by - ay), nx = -(by - ay) / l, ny = (bx - ax) / l;
  const cx = (ax + bx) / 2 + nx * 2 * s, cy = (ay + by) / 2 + ny * 2 * s;
  return Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t;
    return [u*u*ax + 2*u*t*cx + t*t*bx, u*u*ay + 2*u*t*cy + t*t*by]; });
};

// The outside face of a wall is on the right of the walking direction. deco: parts that carry the colour film.
// back: a wall that meets another one from behind (pushed back in depth, no outline); buried: end(s) inside another wall.
// mat: 'gi' galvanised steel, 'white' / 'black' painted steel; default = PVC in the chosen colour.
function hCorner(){
  const t = 1.33, yTop = t / 2 + SLOT + t / 2;
  return { parts: [
    { pts: [[-20, 0], [20, 0]], t },                                                    // 40 mm back flange (hidden, white)
    { pts: [[0, 0], [0, yTop]], t, back: true, buried: 'both' },                        // web
    // narrow rounded face: the part seen in the room, the only part in colour
    { pts: [[9.5, yTop - 0.7], [5, yTop - 0.1], [0, yTop], [-5, yTop - 0.1], [-9.5, yTop - 0.7]], t, deco: () => true },
  ], len: 110, rot: 0, ...PE };
}
function lCorner(){
  const t = 1.25, L = 25.4;                                     // 1" legs, colour on both outer faces
  return { parts: [{ pts: [[L, 0], [L, L], [0, L]], t, deco: () => true }], len: 110, rot: 0, ...PE };
}
function uCorner(){
  const t = 1.06, y = t / 2 + SLOT + t / 2;                     // wide back flange (hidden, white) + channel
  return { parts: [{ pts: [[0, 0], [32, 0], [32, y], [18, y]], t, deco: i => i >= 1 }],        // colour: edge + narrow face only
    len: 110, rot: 0, ...PE };
}
function topMolding(){
  // wall on the left (x = 0). The back leg on the wall is taller than the curved face; colour on the curved face only.
  const t = 1.21, S = 22, y = S + t / 2 + SLOT + t / 2, L = 30;
  const face = bow([0, 0], [S, S], 4.5);
  return { parts: [
    { pts: [[L, y], [0, y], [0, 0], ...face.slice(1)], t, deco: i => i >= 2 },              // top leg, wall leg, face
    { pts: [[S, S], [0, S]], t, back: true, buried: 'end' },                                // ceiling leg (floor of the slot)
  ], len: 110, rot: Math.PI / 2, ...PE };
}
function giChannel(){
  const t = 0.5;                                                // U channel as in the photo: wide base, low walls
  return { parts: [{ pts: [[0, 20], [0, 0], [50, 0], [50, 20]], t, mat: 'gi' }], len: 160, rot: 0, texW: 20, texL: 160 };
}
function giAngle(){
  const t = 0.5, L = 25;
  return { parts: [{ pts: [[L, 0], [L, L], [0, L]], t, mat: 'gi' }], len: 160, rot: 0, texW: 20, texL: 160 };
}
function mainTee(){
  // 24 mm white face with the black centre groove, galvanised web with slots and holes, rolled bulb on top
  const t = 0.6, g = 1.5, gd = 1.8, wTop = 26, bH = 32, bW = 1.9;
  return { parts: [
    { pts: [[-12, 0], [-g, 0]], t, mat: 'white' },
    { pts: [[g, 0], [12, 0]], t, mat: 'white' },
    { pts: [[-g, 0], [-g, gd], [g, gd], [g, 0]], t, mat: 'black' },                     // centre groove
    { pts: [[0, gd], [0, wTop]], t: 0.9, mat: 'web', back: true, buried: 'both', texW: wTop - gd, texL: 100 },
    { pts: [[-bW, wTop], [bW, wTop], [bW, bH], [-bW, bH], [-bW, wTop]], t, mat: 'gi', closed: true },   // bulb
  ], len: 170, rot: Math.PI * 0.85, texW: 20, texL: 160 };
}

export const CEIL = {
  'ceil-h-joiner': hCorner(),
  'ceil-wall-angle': lCorner(),
  'ceil-u-trim': uCorner(),
  'ceil-cove': topMolding(),
  'ceil-gi-channel': giChannel(),
  'ceil-gi-angle': giAngle(),
  'ceil-main-tee': mainTee(),
};
export const hasCeil = key => !!CEIL[key];

// One wall (open or closed loop) as a mesh: groups 0 printed outside, 1 plain outside, 2 inside, 3 cut edges.
function buildWall(part, len, texW, texL, ox, oy){
  const pts = part.pts.map(([x, y]) => [x - ox, y - oy]), closed = !!part.closed;
  if (closed) pts.pop();                                        // last point repeats the first
  const n = pts.length, S = closed ? n : n - 1, h = part.t / 2, z0 = -len / 2, z1 = len / 2;
  const P = i => pts[(i + n) % n];
  const segN = [];
  for (let i = 0; i < S; i++){
    const [ax, ay] = P(i), [bx, by] = P(i + 1), l = Math.hypot(bx - ax, by - ay);
    segN.push([(by - ay) / l, -(bx - ax) / l]);
  }
  const offAt = (i, end) => {                                   // mitred offset at a joint
    const a = segN[i], j = end ? i + 1 : i - 1;
    const other = closed ? segN[(j + S) % S] : segN[j];
    if (!other) return [a[0] * h, a[1] * h];
    let mx = a[0] + other[0], my = a[1] + other[1]; const ml = Math.hypot(mx, my);
    if (ml < 1e-6) return [a[0] * h, a[1] * h];
    mx /= ml; my /= ml; const d = mx * a[0] + my * a[1];
    if (d < 0.35) return [a[0] * h, a[1] * h];
    return [mx * h / d, my * h / d];
  };
  const G = [[], [], [], []], U = [[], [], [], []];
  const quad = (g, A, B, C, D, ua = 0, ub = 0) => {           // uv: u across the profile, v along the length
    G[g].push(...A, ...B, ...C, ...A, ...C, ...D);
    const v = z => (z + len / 2) / texL;                     // texL: length of photo the texture covers (no repeat seam)
    const uv = (p, u) => [u, v(p[2])];
    const us = [ua, ub, ub, ua];
    [[A, us[0]], [B, us[1]], [C, us[2]], [A, us[0]], [C, us[2]], [D, us[3]]].forEach(([p, u]) => U[g].push(...uv(p, u)));
  };
  // the printed film starts at u = 0 on the first printed part, so one clean width of the photo covers the face
  let s = 0;
  for (let i = 0; i < S && !(part.deco && part.deco(i)); i++){ const [ax, ay] = P(i), [bx, by] = P(i + 1); s -= Math.hypot(bx - ax, by - ay); }
  if (!part.deco || !segN.some((_, i) => part.deco(i))) s = 0;
  for (let i = 0; i < S; i++){
    const [ax, ay] = P(i), [bx, by] = P(i + 1), l = Math.hypot(bx - ax, by - ay);
    const oa = offAt(i, 0), ob = offAt(i, 1);
    const Oa = [ax + oa[0], ay + oa[1]], Ob = [bx + ob[0], by + ob[1]];
    const Ia = [ax - oa[0], ay - oa[1]], Ib = [bx - ob[0], by - ob[1]];
    const u0 = s / texW, u1 = (s + l) / texW; s += l;
    quad(part.deco && part.deco(i) ? 0 : 1, [...Oa, z0], [...Ob, z0], [...Ob, z1], [...Oa, z1], u0, u1);
    quad(2, [...Ia, z1], [...Ib, z1], [...Ib, z0], [...Ia, z0], u0, u1);
    quad(3, [...Oa, z1], [...Ob, z1], [...Ib, z1], [...Ia, z1]);
    quad(3, [...Ia, z0], [...Ib, z0], [...Ob, z0], [...Oa, z0]);
    if (!closed && !['start', 'both'].includes(part.buried) && i === 0)     quad(3, [...Ia, z0], [...Oa, z0], [...Oa, z1], [...Ia, z1]);
    if (!closed && !['end', 'both'].includes(part.buried) && i === S - 1) quad(3, [...Ob, z0], [...Ib, z0], [...Ib, z1], [...Ob, z1]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(G.flat(), 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(U.flat(), 2));
  let at = 0; G.forEach((g, k) => { geo.addGroup(at, g.length / 3, k); at += g.length / 3; });
  geo.computeVertexNormals();
  return geo;
}

export function mountCeil(container, key, opts = {}){
  const def = CEIL[key]; if (!def) throw new Error('No ceiling model ' + key);
  const interactive = !!opts.interactive, len = def.len, texW = def.texW || 100;
  const all = def.parts.flatMap(p => p.pts), xs = all.map(p => p[0]), ys = all.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const ox = (minX + maxX) / 2, oy = (minY + maxY) / 2;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;          // keeps the photo colours true (wood, black, grey)
  renderer.toneMappingExposure = 0.95;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 5, 4000);
  scene.add(camera);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8c2d2, 1.5));
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const head = new THREE.DirectionalLight(0xffffff, 1.7); head.position.set(2, 3, 4); camera.add(head); camera.add(head.target);
  const top = new THREE.DirectionalLight(0xffffff, 0.8); top.position.set(4, 20, 8); scene.add(top);

  const loader = new THREE.TextureLoader();
  const loadTex = file => {
    const t = loader.load(BASE + file);
    t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t;
  };
  const deco = new THREE.MeshStandardMaterial({ color: PVC, roughness: 0.55, metalness: 0 });
  const body = new THREE.MeshStandardMaterial({ color: PVC, roughness: 0.6, metalness: 0 });
  const inside = new THREE.MeshStandardMaterial({ color: 0xdfe0dc, roughness: 0.7, metalness: 0 });
  const edge = new THREE.MeshStandardMaterial({ color: 0xd3d4cf, roughness: 0.7, metalness: 0 });
  const texCache = {};
  const setFinish = name => {
    const k = FIN_TEX[name];
    deco.map = k ? (texCache[k] ||= loadTex('tex-' + k + '.jpg')) : null;
    deco.color.set(k ? 0xffffff : PVC); deco.needsUpdate = true;
  };
  setFinish(opts.fin || '');
  // steel: galvanised (photo texture), painted white, black groove
  const used = new Set(def.parts.map(p => p.mat || 'pvc'));
  const sets = { pvc: [deco, body, inside, edge] };
  if (used.has('gi') || used.has('web')){
    const gi = new THREE.MeshStandardMaterial({ map: loadTex('tex-gi.jpg'), color: 0xffffff, roughness: 0.45, metalness: 0.12 });
    const giEdge = new THREE.MeshStandardMaterial({ color: 0x9aa3ab, roughness: 0.4, metalness: 0.6 });
    sets.gi = [gi, gi, gi, giEdge];
    if (used.has('web')){                                       // web: same steel with its row of slots and round holes
      const c = document.createElement('canvas'); c.width = 64; c.height = 256;
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 256); g.fillStyle = '#000';
      for (let k = 0; k < 4; k++) g.fillRect(40, k * 64 + 18, 9, 28);                     // slots near the top
      g.beginPath(); g.arc(22, 128, 7, 0, Math.PI * 2); g.fill();                         // round hole
      const alpha = new THREE.CanvasTexture(c); alpha.wrapS = alpha.wrapT = THREE.RepeatWrapping;
      const wm = gi.clone(); wm.map = loadTex('tex-gi.jpg'); wm.map.repeat.set(1.2, 0.6); wm.alphaMap = alpha; wm.alphaTest = 0.5;
      sets.web = [wm, wm, wm, giEdge];
    }
  }
  if (used.has('white')){ const w = new THREE.MeshStandardMaterial({ color: 0xf6f7f5, roughness: 0.35, metalness: 0.1 }); sets.white = [w, w, w, w]; }
  if (used.has('black')){ const k = new THREE.MeshStandardMaterial({ color: 0x18191b, roughness: 0.5, metalness: 0.1 }); sets.black = [k, k, k, k]; }
  Object.values(sets).flat().forEach(m => m.side = THREE.DoubleSide);

  const model = new THREE.Group();
  const lineMat = new THREE.LineBasicMaterial({ color: 0x8d8f8a, transparent: true, opacity: 0.45 });
  // walls that meet another wall from behind: pushed slightly back in depth, so the wall in front always covers
  // them on any phone GPU (no show-through lines)
  const pushBack = m => { const c = m.clone(); c.polygonOffset = true; c.polygonOffsetFactor = 4; c.polygonOffsetUnits = 16; return c; };
  for (const part of def.parts){
    const geo = buildWall(part, len, part.texW || texW, part.texL || def.texL || texW * 4, ox, oy);
    const set = sets[part.mat || 'pvc'];
    const mesh = new THREE.Mesh(geo, part.back ? set.map(pushBack) : set);
    if (!part.back && part.mat !== 'black') mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), lineMat));
    model.add(mesh);
  }
  model.rotation.z = def.rot || 0;                              // printed face towards the viewer
  scene.add(model);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enabled = interactive;
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.enablePan = false; controls.enableZoom = interactive; controls.rotateSpeed = 0.9;
  controls.minPolarAngle = 0.001; controls.maxPolarAngle = Math.PI - 0.001;
  controls.autoRotate = true; controls.autoRotateSpeed = interactive ? 1.0 : 1.4;
  if (interactive) renderer.domElement.style.touchAction = 'none';
  else renderer.domElement.style.pointerEvents = 'none';

  const HOME_DIR = new THREE.Vector3(1, 0.62, 1).normalize();
  const R = Math.hypot(len / 2, (maxX - minX) / 2, (maxY - minY) / 2) * 1.04;
  const fit = r => {
    const v = THREE.MathUtils.degToRad(camera.fov), h = 2 * Math.atan(Math.tan(v / 2) * camera.aspect);
    return r / Math.sin(Math.min(v, h) / 2);
  };
  const HOME = new THREE.Vector3();
  let anim = null;
  const place = () => { HOME.copy(HOME_DIR).multiplyScalar(fit(R)); controls.minDistance = fit(R) * 0.25; controls.maxDistance = fit(R) * 2.2; };
  const flyTo = to => { anim = { from: camera.position.clone(), to, t0: performance.now() }; };
  function resize(){
    const w = container.clientWidth, h = container.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    place(); if (!anim) camera.position.setLength(HOME.length());
  }
  place(); camera.position.copy(HOME);
  const ro = new ResizeObserver(resize); ro.observe(container); resize();
  if (interactive) renderer.domElement.addEventListener('pointerdown', () => { controls.autoRotate = false; });

  let visible = true;
  const io = new IntersectionObserver(es => visible = es[0].isIntersecting); io.observe(container);
  renderer.setAnimationLoop(() => {
    if (!visible) return;
    if (anim){
      const t = Math.min(1, (performance.now() - anim.t0) / 550), e = 1 - Math.pow(1 - t, 3);
      camera.position.lerpVectors(anim.from, anim.to, e); if (t >= 1) anim = null;
    }
    controls.update(); renderer.render(scene, camera);
  });

  return {
    setFinish, setColor(){}, setDims(){},
    reset(){ controls.autoRotate = true; flyTo(HOME); },
    dispose(){
      renderer.setAnimationLoop(null); ro.disconnect(); io.disconnect(); controls.dispose();
      Object.values(texCache).forEach(t => t.dispose());
      scene.traverse(o => { o.geometry?.dispose?.(); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m?.map?.dispose?.(); m?.alphaMap?.dispose?.(); m?.dispose?.(); }); });
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    }
  };
}
