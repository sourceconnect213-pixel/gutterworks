// 3D boxed fixings: the owner's box (every side from his photos) with the nails / screws / bolts lying in front of it.
// Units: mm. Fasteners are built to their real sizes (1" and 1½" concrete nails, 1½" self-drilling screws with
// bonded washers, 3/16" × 1½" roofing bolts with square nuts) in bright zinc.
//   mountPack(el, key)                        → card preview: turns slowly by itself
//   mountPack(el, key, { interactive: true }) → big view: drag any direction, pinch / wheel to zoom
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';

const BASE = new URL('./images/packs/', import.meta.url).href;
const IN = 25.4;

// box: L (front, along x) × H × D; faces = photo files (or a colour); item = what lies in front
export const PACKS = {
  'pack-cn1':  { box: { L: 110, H: 61, D: 61, front: 'n1-front', back: 'n1-front', left: 'n1-left', right: 'n1-right', top: 'n1-top', bottom: '#8f9294' },
                 item: 'nail', len: 1 * IN, d: 3.4, head: 7.0, count: 13 },
  'pack-cn15': { box: { L: 112, H: 62, D: 62, front: 'n2-front', back: 'n2-front', left: 'n2-left', right: 'n2-right', top: 'n2-top', bottom: '#8d8a86' },
                 item: 'nail', len: 1.5 * IN, d: 3.9, head: 7.6, count: 13 },
  'pack-ws15': { box: { L: 126, H: 66, D: 96, front: 's1-front', back: 's1-front', left: 's1-left', right: 's1-right', top: 's1-top', bottom: '#1d2c86' },
                 item: 'screw', len: 1.5 * IN, count: 10 },
  'pack-nb':   { box: { L: 90, H: 51, D: 55, front: 'b1-front', back: 'b1-back', left: 'b1-end', right: 'b1-end', top: 'b1-top', bottom: '#a57a45' },
                 item: 'bolt', len: 1.5 * IN, count: 10 },
};
export const hasPack = key => !!PACKS[key];

// small repeatable random numbers, so every visitor sees the same pile
const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// ---------- fastener parts (axis = +y, tip at y = 0) ----------
const lathe = (pts, seg = 28) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
// a thread: a small round wire wound along the shank
function thread(r, pitch, y0, y1, wire){
  const turns = (y1 - y0) / pitch, n = Math.max(24, Math.round(turns * 18));
  const curve = new (class extends THREE.Curve { getPoint(t, v = new THREE.Vector3()){
    const a = t * turns * Math.PI * 2, y = y0 + t * (y1 - y0);
    return v.set(Math.cos(a) * r, y, Math.sin(a) * r);
  } })();
  return new THREE.TubeGeometry(curve, n, wire, 6, false);
}

function nail(def, M){
  const L = def.len, r = def.d / 2, R = def.head / 2, ht = 1.3, tip = def.d * 1.5;
  const g = new THREE.Group();
  g.add(new THREE.Mesh(lathe([[0, 0], [r * 0.18, tip * 0.15], [r, tip], [r, L - ht - 0.9], [r * 1.18, L - ht - 0.2], [R, L - ht], [R, L - 0.35], [R - 0.35, L], [0, L]]), M.zinc));
  return { g, R, r, L };
}

function screw(def, M){
  const L = def.len, core = 2.0, major = 2.75, hexR = 4.6, flR = 5.3;
  const g = new THREE.Group();
  // drill point + shank
  g.add(new THREE.Mesh(lathe([[0, 0], [0.9, 1.4], [core, 4.2], [core, L - 0.5], [0, L - 0.5]]), M.zinc));
  g.add(new THREE.Mesh(thread(core + 0.3, 1.8, 4.4, L - 6.0, 0.48), M.zinc));
  // bonded washer: zinc dome cup + black EPDM ring, then the flanged hex head
  g.add(new THREE.Mesh(lathe([[core, L - 3.6], [6.6, L - 3.6], [6.9, L - 3.2], [6.9, L - 2.5], [core, L - 2.5]]), M.rubber));
  g.add(new THREE.Mesh(lathe([[7.0, L - 2.55], [7.0, L - 2.2], [5.6, L - 1.35], [core + 0.2, L - 0.95], [core, L - 1.5], [5.4, L - 1.9], [6.8, L - 2.55]]), M.zinc));
  g.add(new THREE.Mesh(lathe([[0, L - 1.0], [flR, L - 1.0], [flR, L - 0.2], [hexR * 0.98, L], [0, L]]), M.zinc));
  const hex = new THREE.Mesh(new THREE.CylinderGeometry(hexR, hexR, 4.2, 6), M.zinc); hex.position.y = L + 2.1; g.add(hex);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(hexR * 0.9, hexR, 0.5, 6), M.zinc); top.position.y = L + 4.45; g.add(top);
  return { g, R: 7.2, r: major, L: L + 4.7 };
}

function bolt(def, M, rnd){
  const L = def.len, r = 4.76 / 2, R = 5.4, h = 3.0, sw = 1.15, sd = 1.5;
  const g = new THREE.Group();
  g.add(new THREE.Mesh(lathe([[0, 0], [r * 0.85, 0], [r * 0.95, 0.5], [r * 0.92, L], [0, L]]), M.zinc));
  g.add(new THREE.Mesh(thread(r * 0.93, 1.06, 0.6, L - 1.0, 0.3), M.zinc));
  // mushroom (truss) head with a real slot: solid below the slot, two halves above it
  const dome = t => [R * Math.cos(t * Math.PI / 2) ** 0.55, h * Math.sin(t * Math.PI / 2)];
  const prof = Array.from({ length: 13 }, (_, i) => dome(i / 12));
  const cut = h - sd, below = [[0, 0], [R, 0], ...prof.filter(([, y]) => y > 0 && y < cut)], rc = R * Math.cos(Math.asin(cut / h)) ** 0.55;
  const base = new THREE.Mesh(lathe([...below, [rc, cut], [0, cut]]), M.zinc); base.position.y = L; g.add(base);
  const upper = [[rc, cut], ...prof.filter(([, y]) => y > cut), [0, h]];
  for (const s of [1, -1]){
    const half = new THREE.Mesh(new THREE.LatheGeometry(upper.map(([x, y]) => new THREE.Vector2(x, y)), 14, s > 0 ? 0 : Math.PI, Math.PI), M.zinc);
    const shape = new THREE.Shape(); shape.moveTo(-rc, cut); upper.forEach(([x, y]) => shape.lineTo(x, y)); [...upper].reverse().forEach(([x, y]) => shape.lineTo(-x, y));
    const cap = new THREE.Mesh(new THREE.ShapeGeometry(shape), M.zinc); cap.rotation.y = Math.PI / 2;   // flat side of the half (slot wall)
    const hg = new THREE.Group(); hg.add(half, cap); hg.position.set(s * sw / 2, L, 0); g.add(hg);
  }
  const slotBottom = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.05, rc * 2), M.dark); slotBottom.position.y = L + cut; g.add(slotBottom);
  // square nut part way along, as in the photos
  const nut = new THREE.Mesh(new THREE.BoxGeometry(9.0, 3.2, 9.0), M.nut);
  nut.position.y = 3 + rnd() * (L * 0.55); nut.rotation.y = rnd() * Math.PI / 2; g.add(nut);
  return { g, R: Math.max(R, 6.4), r: 6.4, L: L + h };
}

export function mountPack(container, key, opts = {}){
  const def = PACKS[key]; if (!def) throw new Error('No pack ' + key);
  const interactive = !!opts.interactive, B = def.box;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environment = env; pmrem.dispose();
  const camera = new THREE.PerspectiveCamera(30, 1, 5, 3000); scene.add(camera);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8dde6, 0.7));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(-90, 220, 160); sun.castShadow = true;
  sun.shadow.mapSize.set(interactive ? 2048 : 1024, interactive ? 2048 : 1024);
  Object.assign(sun.shadow.camera, { left: -150, right: 150, top: 150, bottom: -150, near: 10, far: 600 });
  sun.shadow.radius = 4; sun.shadow.bias = -0.0005; scene.add(sun);
  const head = new THREE.DirectionalLight(0xffffff, 0.6); head.position.set(1, 2, 3); camera.add(head); camera.add(head.target);

  // ---------- materials ----------
  const loader = new THREE.TextureLoader(), texs = [];
  const face = f => {
    if (f.startsWith('#')) return new THREE.MeshStandardMaterial({ color: f, roughness: 0.9 });
    const t = loader.load(BASE + f + '.jpg'); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); texs.push(t);
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.82, metalness: 0 });
  };
  const M = {
    zinc: new THREE.MeshStandardMaterial({ color: 0xb9c2cc, metalness: 1, roughness: 0.3, envMapIntensity: 1.0, side: THREE.DoubleSide }),   // bright zinc plating
    nut: new THREE.MeshStandardMaterial({ color: 0xb0b8c1, metalness: 1, roughness: 0.38 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x1c1d20, metalness: 0, roughness: 0.75 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x3a3f45, metalness: 0.6, roughness: 0.5 }),
  };

  // ---------- the box (order: right, left, top, bottom, front, back) ----------
  const box = new THREE.Mesh(new THREE.BoxGeometry(B.L, B.H, B.D),
    [B.right, B.left, B.top, B.bottom, B.front, B.back].map(face));
  box.position.set(0, B.H / 2, -B.D / 2 - 4); box.castShadow = box.receiveShadow = true;
  const world = new THREE.Group(); world.add(box);

  // ---------- the pile in front: lying flat, no two overlapping ----------
  const rnd = rng(key.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 2147483647 || 1);
  const make = def.item === 'nail' ? () => nail(def, M) : def.item === 'screw' ? () => screw(def, M) : () => bolt(def, M, rnd);
  const placed = [];                                             // { a, b, w } footprints as line segments on the floor
  const segDist = (p, q, r, s) => {                              // distance between two floor segments
    const d = (a, b, c) => { const ab = [b[0] - a[0], b[1] - a[1]], t = Math.max(0, Math.min(1, ((c[0] - a[0]) * ab[0] + (c[1] - a[1]) * ab[1]) / (ab[0] ** 2 + ab[1] ** 2 || 1)));
      return Math.hypot(a[0] + ab[0] * t - c[0], a[1] + ab[1] * t - c[1]); };
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    if (cr(p, q, r) * cr(p, q, s) < 0 && cr(r, s, p) * cr(r, s, q) < 0) return 0;      // the two shanks cross
    return Math.min(d(p, q, r), d(p, q, s), d(r, s, p), d(r, s, q));
  };
  const zone = { x0: -B.L * 0.55, x1: B.L * 0.55, z0: 6, z1: 6 + Math.max(40, B.L * 0.42) };
  for (let i = 0, tries = 0; i < def.count && tries < 900; tries++){
    const f = make(), len = f.L;
    const yaw = rnd() * Math.PI * 2, cx = zone.x0 + rnd() * (zone.x1 - zone.x0), cz = zone.z0 + rnd() * (zone.z1 - zone.z0);
    const dx = Math.cos(yaw) * len / 2, dz = Math.sin(yaw) * len / 2, a = [cx - dx, cz - dz], b = [cx + dx, cz + dz];
    if (Math.min(a[1], b[1]) < 3) continue;                          // keep clear of the box
    if (placed.some(p => segDist(a, b, p.a, p.b) < (f.R + p.w) * 0.95)) continue;
    // lie it down: shank axis horizontal, tilted so the head rim and the tip both touch the floor
    const tilt = Math.atan2(f.R - f.r, len * 0.9);
    const lay = new THREE.Group(); f.g.rotation.z = -Math.PI / 2 + tilt; f.g.position.x = -len / 2; lay.add(f.g);
    lay.rotation.y = -yaw; lay.position.set(cx, 0, cz);
    lay.rotation.x = (rnd() - 0.5) * 0.05;
    world.add(lay); lay.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(lay); lay.position.y -= bb.min.y;
    lay.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    placed.push({ a, b, w: f.R }); i++;
  }
  // floor that only shows the soft shadows (the card's own background stays)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.ShadowMaterial({ opacity: 0.22 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; world.add(floor);
  // centre everything (box + pile) on the turning point
  const all = new THREE.Box3().setFromObject(box); placed.length && world.children.forEach(o => o !== floor && all.expandByObject(o));
  const c = all.getCenter(new THREE.Vector3()); world.position.set(-c.x, 0, -c.z);
  scene.add(world);

  // ---------- camera + turning ----------
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enabled = interactive; controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.enablePan = false; controls.enableZoom = interactive; controls.rotateSpeed = 0.9;
  controls.minPolarAngle = 0.05; controls.maxPolarAngle = Math.PI / 2 - 0.02;   // stays above the floor
  controls.autoRotate = true; controls.autoRotateSpeed = interactive ? 0.9 : 1.2;
  if (interactive) renderer.domElement.style.touchAction = 'none'; else renderer.domElement.style.pointerEvents = 'none';
  const size = all.getSize(new THREE.Vector3()), R = Math.hypot(size.x, size.y, size.z) / 2 * 1.02;
  controls.target.set(0, size.y * 0.32, 0);
  const DIR = new THREE.Vector3(0.38, 0.62, 1).normalize();
  const fit = () => { const v = THREE.MathUtils.degToRad(camera.fov), hh = 2 * Math.atan(Math.tan(v / 2) * camera.aspect); return R / Math.sin(Math.min(v, hh) / 2); };
  const HOME = new THREE.Vector3(); let anim = null;
  const place = () => { HOME.copy(DIR).multiplyScalar(fit()).add(controls.target); controls.minDistance = fit() * 0.3; controls.maxDistance = fit() * 2; };
  function resize(){
    const w = container.clientWidth, h = container.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); place();
    if (!anim){ const off = camera.position.clone().sub(controls.target); if (off.lengthSq() < 1e-6) off.copy(DIR); camera.position.copy(controls.target).add(off.setLength(HOME.distanceTo(controls.target))); }
  }
  place(); camera.position.copy(HOME);
  const ro = new ResizeObserver(resize); ro.observe(container); resize();
  if (interactive) renderer.domElement.addEventListener('pointerdown', () => { controls.autoRotate = false; });
  let visible = true;
  const io = new IntersectionObserver(es => visible = es[0].isIntersecting); io.observe(container);
  renderer.setAnimationLoop(() => {
    if (!visible) return;
    if (anim){ const t = Math.min(1, (performance.now() - anim.t0) / 550), e = 1 - Math.pow(1 - t, 3); camera.position.lerpVectors(anim.from, anim.to, e); if (t >= 1) anim = null; }
    controls.update(); renderer.render(scene, camera);
  });
  return {
    setColor(){}, setDims(){}, setFinish(){},
    reset(){ controls.autoRotate = true; anim = { from: camera.position.clone(), to: HOME.clone(), t0: performance.now() }; },
    dispose(){
      renderer.setAnimationLoop(null); ro.disconnect(); io.disconnect(); controls.dispose();
      texs.forEach(t => t.dispose()); env.dispose();
      scene.traverse(o => { o.geometry?.dispose?.(); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m?.dispose?.()); });
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    }
  };
}
