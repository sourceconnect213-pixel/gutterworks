// 3D models of the ceiling items (PVC i-Panel + accessories, GI frame), made from the owner's photos.
// Units: mm. Each item is its end profile (centre line of each wall + wall thickness) pushed out along its length.
//   mountCeil(el, key, { fin })                      → card preview: turns slowly by itself
//   mountCeil(el, key, { fin, interactive: true })   → big view: drag any direction, pinch / wheel to zoom
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';

const BASE = new URL('./images/ceiling/', import.meta.url).href;
// finish name (as in the shop) → texture cut from the owner's panel photos. null = plain PVC white.
const FIN_TEX = { 'Golden Oak': 'oak', 'Walnut Brown': 'walnut', 'White Wood': 'whitewood', 'Grey': 'grey',
                  'Black': 'black', 'Light Blue': 'blue', 'White': null };
const PVC = '#ecedea';

// arc helper: points on a circle (cx, cy, r) from angle a0 to a1 (degrees)
const arc = (cx, cy, r, a0, a1, n = 14) => Array.from({ length: n + 1 }, (_, i) => {
  const a = THREE.MathUtils.degToRad(a0 + (a1 - a0) * i / n); return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
});

// The outside face of a wall is on the right of the walking direction.
// deco: which wall parts carry the printed (wood / colour) film on their outside face.
function panelParts(){
  const W = 200, H = 8, c = 1.6, g0 = 2.8, g1 = 5.2, d = 7;      // 200 mm × 8 mm hollow panel, tongue & groove, bevelled joint
  const loop = [
    [0, 0], [W, 0],                                              // back
    [W, g0], [W + d, g0], [W + d, g1], [W, g1],                  // tongue (right side)
    [W, H - c], [W - c, H], [c, H], [0, H - c],                  // printed face with the small bevel at each joint
    [0, g1], [d, g1], [d, g0], [0, g0], [0, 0] ];                // groove (left side)
  const parts = [{ pts: loop, t: 0.8, closed: true, deco: i => i >= 6 && i <= 8 }];
  for (let x = 20; x < W; x += 20) parts.push({ pts: [[x, 0.4], [x, H - 0.4]], t: 0.5, hidden: true });   // inside ribs (no outline: they sit behind the face)
  return { parts, len: 300, texW: 200 };
}

export const CEIL = {
  'ceil-panel': panelParts(),
  // L angle: the wood / colour film is on the room-side leg only, the other leg is plain white PVC (as in the photos)
  'ceil-wall-angle': { parts: [{ pts: [[22, 0], [22, 22], [0, 22]], t: 1.0, deco: i => i === 1 }], len: 110, texW: 22, texL: 220,
    fins: { 'Teak Wood': 'angle-teak', 'Golden Oak': 'angle-teak', 'White Wood': 'angle-whitewood', 'White': null } },
  // H joiner: wide face flange, web, narrower back flange
  'ceil-h-joiner': { parts: [
      { pts: [[35, 0.3], [-35, 0.3]], t: 0.9 },
      { pts: [[0, 0.7], [0, 16]], t: 0.9 },
      { pts: [[19, 14.8], [12, 16.4], [-12, 16.4], [-19, 14.8]], t: 0.9 } ], len: 110 },
  // U end cap: one leg longer than the other
  'ceil-u-trim': { parts: [{ pts: [[0, 28], [0, 0], [10, 0], [10, 20]], t: 0.9 }], len: 110 },
  // edge trim: flat flange with a rounded nose that holds the panel edge
  'ceil-edge-trim': { parts: [{ pts: [[0, 0], [24, 0], ...arc(24, 5, 5, -90, 90).slice(1), [16, 10]], t: 0.9 }], len: 110 },
  // cove / scotia: sloped face + hollow triangle, with a slot for the panel
  'ceil-cove': { parts: [
      { pts: [[0, 0], [26, 24], [38, 22], [55, -6], [20, 0]], t: 0.9 },
      { pts: [[20, 0], [38, 22]], t: 0.9 } ], len: 110 },
  // galvanised steel frame parts
  'ceil-gi-channel': { parts: [{ pts: [[0, 19], [0, 0], [40, 0], [40, 19]], t: 0.5 }], len: 140, gi: true, texW: 80 },
  'ceil-gi-angle':   { parts: [{ pts: [[25, 0], [25, 25], [0, 25]], t: 0.5 }], len: 110, gi: true, texW: 60 },
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
    if (!closed && !part.hidden && i === 0)     quad(3, [...Ia, z0], [...Oa, z0], [...Oa, z1], [...Ia, z1]);
    if (!closed && !part.hidden && i === S - 1) quad(3, [...Ob, z0], [...Ib, z0], [...Ib, z1], [...Ob, z1]);
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
  let deco, body, inside, edge;
  if (def.gi){                                                  // galvanised steel: the same spangled metal on every face
    const tex = loadTex('tex-gi.jpg');
    deco = body = inside = new THREE.MeshStandardMaterial({ map: tex, color: 0xf2f4f6, roughness: 0.42, metalness: 0.55 });
    edge = new THREE.MeshStandardMaterial({ color: 0x9aa3ab, roughness: 0.4, metalness: 0.6 });
  } else {
    deco = new THREE.MeshStandardMaterial({ color: PVC, roughness: 0.55, metalness: 0 });
    body = new THREE.MeshStandardMaterial({ color: PVC, roughness: 0.6, metalness: 0 });
    inside = new THREE.MeshStandardMaterial({ color: 0xdfe0dc, roughness: 0.7, metalness: 0 });
    edge = new THREE.MeshStandardMaterial({ color: 0xd3d4cf, roughness: 0.7, metalness: 0 });
  }
  [deco, body, inside, edge].forEach(m => m.side = THREE.DoubleSide);
  const texCache = {};
  const setFinish = name => {
    if (def.gi) return;
    const k = (def.fins && name in def.fins) ? def.fins[name] : FIN_TEX[name];
    deco.map = k ? (texCache[k] ||= loadTex('tex-' + k + '.jpg')) : null;
    deco.color.set(k ? 0xffffff : PVC); deco.needsUpdate = true;
  };
  setFinish(opts.fin || '');

  const model = new THREE.Group();
  const lineMat = new THREE.LineBasicMaterial({ color: def.gi ? 0x5c656d : 0x8d8f8a, transparent: true, opacity: 0.45 });
  // inside ribs: pushed slightly back in depth, so the face in front always covers them on any phone GPU
  const pushBack = m => { const c = m.clone(); c.polygonOffset = true; c.polygonOffsetFactor = 4; c.polygonOffsetUnits = 16; return c; };
  const ribMats = def.parts.some(p => p.hidden) ? [deco, body, inside, edge].map(pushBack) : null;
  for (const part of def.parts){
    const geo = buildWall(part, len, texW, def.texL || texW * 4, ox, oy);
    const mesh = new THREE.Mesh(geo, part.hidden ? ribMats : [deco, body, inside, edge]);
    if (!part.hidden) mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), lineMat));
    model.add(mesh);
  }
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
      scene.traverse(o => { o.geometry?.dispose?.(); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m?.map?.dispose?.(); m?.dispose?.(); }); });
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    }
  };
}
