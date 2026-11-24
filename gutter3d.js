// 3D model of a gutter, built from the measured cross-section in profiles.js.
// Units: inches.
//   mountGutter(el, key)                         → card preview: turns slowly by itself, not draggable
//   mountGutter(el, key, { interactive: true })  → big view: drag any direction, pinch / wheel to zoom
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';

const LENGTH = 12;   // length of the piece shown (1 ft)
// sheet thickness: 0.47 mm for every item (from profiles.js), converted to inches (model units)
const T = (window.AD_SHEET_MM || 0.47) / 25.4;

// A measurement number: plain text with a white halo (no box), sized to match the
// label boxes used for placement in profiles.js (w × h inches).
function label(text, w, h, color = '#d0161d'){
  const PX = 160;                                   // canvas pixels per inch
  const c = document.createElement('canvas'); c.width = Math.ceil(w * PX); c.height = Math.ceil(h * PX);
  const g = c.getContext('2d');
  g.font = `800 ${Math.round(h * PX * 0.86)}px Inter, Arial, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineJoin = 'round'; g.lineWidth = h * PX * 0.26; g.strokeStyle = 'rgba(255,255,255,.95)';
  g.strokeText(text, c.width / 2, c.height / 2 + 2);
  g.fillStyle = color; g.fillText(text, c.width / 2, c.height / 2 + 2);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(w, h, 1); s.renderOrder = 10;
  return s;
}

// Build the folded sheet as one mesh with three materials (outside paint, inside, cut edges).
// pts: centre line of the sheet; the outside face is on the right of the walking direction.
export function buildSheet(pts, t, len, m){
  const n = pts.length, h = t / 2, z0 = -len / 2, z1 = len / 2;
  const segN = [];                                     // outside normal of each part
  for (let i = 1; i < n; i++){
    const dx = pts[i][0] - pts[i-1][0], dy = pts[i][1] - pts[i-1][1], l = Math.hypot(dx, dy);
    segN.push([dy / l, -dx / l]);
  }
  // offset of each part's two ends: mitred at folds; for a fold that turns back on itself (a hem)
  // the miter would explode, so that joint uses the part's own normal instead
  const offAt = (i, end) => {                          // i = part index, end 0 = start, 1 = end
    const v = end ? i + 1 : i, a = segN[i];
    const other = end ? segN[i + 1] : segN[i - 1];
    if (!other) return [a[0] * h, a[1] * h];
    let mx = a[0] + other[0], my = a[1] + other[1]; const ml = Math.hypot(mx, my);
    if (ml < 1e-6) return [a[0] * h, a[1] * h];
    mx /= ml; my /= ml;
    const d = mx * a[0] + my * a[1];
    if (d < 0.35) return [a[0] * h, a[1] * h];          // very sharp fold: keep it simple
    return [mx * h / d, my * h / d];
  };
  const groups = { outside: [], inside: [], edge: [] };
  const quad = (arr, A, B, C, D) => arr.push(...A, ...B, ...C, ...A, ...C, ...D);
  for (let i = 0; i < n - 1; i++){
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const oa = offAt(i, 0), ob = offAt(i, 1);
    const Oa = [ax + oa[0], ay + oa[1]], Ob = [bx + ob[0], by + ob[1]];
    const Ia = [ax - oa[0], ay - oa[1]], Ib = [bx - ob[0], by - ob[1]];
    quad(groups.outside, [...Oa, z0], [...Ob, z0], [...Ob, z1], [...Oa, z1]);
    quad(groups.inside,  [...Ia, z1], [...Ib, z1], [...Ib, z0], [...Ia, z0]);
    quad(groups.edge,    [...Oa, z1], [...Ob, z1], [...Ib, z1], [...Ia, z1]);   // cut end (front)
    quad(groups.edge,    [...Ia, z0], [...Ib, z0], [...Ob, z0], [...Oa, z0]);   // cut end (back)
    if (i === 0)     quad(groups.edge, [...Ia, z0], [...Oa, z0], [...Oa, z1], [...Ia, z1]);   // sheet edge at the start
    if (i === n - 2) quad(groups.edge, [...Ob, z0], [...Ib, z0], [...Ib, z1], [...Ob, z1]);   // sheet edge at the end
  }
  const geo = new THREE.BufferGeometry();
  const pos = [...groups.outside, ...groups.inside, ...groups.edge];
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const c1 = groups.outside.length / 3, c2 = groups.inside.length / 3, c3 = groups.edge.length / 3;
  geo.addGroup(0, c1, 0); geo.addGroup(c1, c2, 1); geo.addGroup(c1 + c2, c3, 2);
  geo.computeVertexNormals();
  [m.outside, m.inside, m.edge].forEach(x => x.side = THREE.DoubleSide);
  const mesh = new THREE.Mesh(geo, [m.outside, m.inside, m.edge]);
  // fold lines only where the sheet actually bends (and its outline)
  // fold lines: outside face lines in the paint shade, inside face lines in a galvalume grey
  const faceLines = (arr, mat) => {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    const e = new THREE.EdgesGeometry(g, 25); g.dispose();
    mesh.add(new THREE.LineSegments(e, mat));
  };
  faceLines(groups.outside, m.foldMat);
  faceLines(groups.inside, m.insideLineMat);
  return mesh;
}

export function mountGutter(container, profileKey = 'gutter12', opts = {}){
  const interactive = !!opts.interactive;
  const prof = (window.AD_PROFILES || {})[profileKey];
  if (!prof) throw new Error('No profile ' + profileKey);
  const P = prof.points, LO = window.profileLayout(profileKey);
  const xs = P.map(p => p[0]), ys = P.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), maxY = Math.max(...ys);
  const cx = (minX + maxX) / 2, cy = maxY / 2;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 400);
  scene.add(camera);
  // soft light from everywhere + a light that moves with the camera,
  // so whichever side you look at is always clearly lit
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8c2d2, 1.6));
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const head = new THREE.DirectionalLight(0xffffff, 1.9); head.position.set(2, 3, 4); camera.add(head); camera.add(head.target);
  const top = new THREE.DirectionalLight(0xffffff, 0.9); top.position.set(4, 20, 8); scene.add(top);

  // coloured outside (lighter maroon so the shape reads), galvalume inside
  const outside = new THREE.MeshStandardMaterial({ color: opts.color || '#b5482e', roughness: 0.5, metalness: 0.12 });
  const inside  = new THREE.MeshStandardMaterial({ color: 0xe2e7ec, roughness: 0.42, metalness: 0.25 });
  // cut edges of the sheet: same paint colour, a little darker (no white outline)
  const edge    = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5, metalness: 0.12 });
  const foldMat = new THREE.LineBasicMaterial({ transparent: true });
  const insideLineMat = new THREE.LineBasicMaterial({ color: 0x8e979f, transparent: true, opacity: 0.6 });   // galvalume grey, never the paint colour
  const setColor = hex => {
    outside.color.set(hex); edge.color.set(hex).multiplyScalar(0.78);
    foldMat.color.set(hex).multiplyScalar(0.5); foldMat.opacity = 0.55;   // fold lines: darker shade of the same colour, never white
  };
  setColor(opts.color || '#b5482e');

  const model = new THREE.Group();
  const dims = new THREE.Group(); dims.visible = false;
  const zf = LENGTH / 2 + 0.05;
  const lineMat = new THREE.LineBasicMaterial({ color: 0xe31e24, depthTest: false, transparent: true, opacity: .9 });

  // One continuous folded sheet: every part is offset by half the thickness on each side and the
  // folds are mitred, so neighbouring parts meet exactly (no overlaps, gaps or see-through corners).
  model.add(buildSheet(P.map(([x, y]) => [x - cx, y - cy]), T, LENGTH, { outside, inside, edge, foldMat, insideLineMat }));
  // measurement lines (beside each part) and numbers, positioned by profiles.js so they never overlap
  const sideOf = new Map(LO.labels.filter(l => !l.span).map(l => [l.seg, l]));
  LO.segs.forEach((sg, i) => {
    const l = sideOf.get(i), nx = l ? l.nx : sg.uy, ny = l ? l.ny : -sg.ux, o = 0.13;
    const a = new THREE.Vector3(sg.x1 - cx + nx*o, sg.y1 - cy + ny*o, zf), b = new THREE.Vector3(sg.x2 - cx + nx*o, sg.y2 - cy + ny*o, zf);
    dims.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), lineMat));
  });
  for (const l of LO.labels){
    const s = label(l.text, l.w, l.h);
    s.position.set(l.x - cx, l.y - cy, zf + 0.01);
    dims.add(s);
  }
  const yb = -cy - 0.55, xr = maxX - cx + 0.55;
  dims.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(xr, yb, -LENGTH/2), new THREE.Vector3(xr, yb, LENGTH/2)]), lineMat));
  const ll = label('1 ft', 0.62, 0.34, '#0b4ea2'); ll.position.set(xr + 0.45, yb, -1.5); dims.add(ll);
  model.add(dims);
  scene.add(model);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enabled = interactive;
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.enableZoom = interactive;
  controls.rotateSpeed = 0.9;
  controls.minPolarAngle = 0.001; controls.maxPolarAngle = Math.PI - 0.001;   // all the way over the top and underneath
  controls.autoRotate = true; controls.autoRotateSpeed = interactive ? 1.0 : 1.4;
  if (interactive) renderer.domElement.style.touchAction = 'none';
  else renderer.domElement.style.pointerEvents = 'none';                        // card preview: taps go to the card

  // camera distance that fits the model, whatever the container shape
  const HOME_DIR = new THREE.Vector3(1, 0.55, 1).normalize(), FRONT_DIR = new THREE.Vector3(0, 0.07, 1).normalize();   // straight at the cut end
  const R_ALL = Math.hypot(LENGTH / 2, (maxX - minX) / 2, maxY / 2) * 1.02;
  const BB = LO.bbox;                                                   // profile + its labels
  const R_END = Math.hypot(Math.max(cx - BB.minX, BB.maxX - cx), Math.max(cy - BB.minY, BB.maxY - cy));
  const fit = r => {
    const v = THREE.MathUtils.degToRad(camera.fov), h = 2 * Math.atan(Math.tan(v / 2) * camera.aspect);
    return r / Math.sin(Math.min(v, h) / 2);
  };
  const HOME = new THREE.Vector3(), FRONT = new THREE.Vector3();
  let showing = false, anim = null;
  const place = () => {
    HOME.copy(HOME_DIR).multiplyScalar(fit(R_ALL));
    // end-on view: fit the cut end plus its labels (width and height separately) in front of the camera
    const v = THREE.MathUtils.degToRad(camera.fov), th = Math.tan(v / 2), tw = th * camera.aspect;
    const hw = Math.max(cx - BB.minX, BB.maxX - cx, xr + 0.8) + 0.3, hh = Math.max(cy - BB.minY, BB.maxY - cy) + 0.35;
    FRONT.copy(FRONT_DIR).multiplyScalar(Math.max(hw / tw, hh / th) + LENGTH / 2);
    controls.minDistance = fit(R_END) * 0.5; controls.maxDistance = fit(R_ALL) * 2.2;
  };
  controls.target.set(0, 0, 0);
  const flyTo = to => { anim = { from: camera.position.clone(), to, t0: performance.now() }; };   // 'to' stays live: follows size changes

  function resize(){
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    place();
    if (!anim) camera.position.setLength((showing ? FRONT : HOME).length());
  }
  place(); camera.position.copy(HOME);
  const ro = new ResizeObserver(resize); ro.observe(container); resize();

  const stopAuto = () => { controls.autoRotate = false; };
  if (interactive) renderer.domElement.addEventListener('pointerdown', stopAuto);

  let visible = true;
  const io = new IntersectionObserver(es => visible = es[0].isIntersecting); io.observe(container);
  renderer.setAnimationLoop(() => {
    if (!visible) return;
    if (anim){
      const t = Math.min(1, (performance.now() - anim.t0) / 550), e = 1 - Math.pow(1 - t, 3);   // ~½ second on any device
      camera.position.lerpVectors(anim.from, anim.to, e);
      if (t >= 1) anim = null;
    }
    controls.update(); renderer.render(scene, camera);
  });

  return {
    setColor,
    setDims(on){ showing = on; dims.visible = on; controls.autoRotate = !on; flyTo(on ? FRONT : HOME); },
    reset(){ showing = false; dims.visible = false; controls.autoRotate = true; flyTo(HOME); },
    dispose(){
      renderer.setAnimationLoop(null); ro.disconnect(); io.disconnect(); controls.dispose();
      scene.traverse(o => { o.geometry?.dispose?.(); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m?.map?.dispose?.(); m?.dispose?.(); }); });
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    }
  };
}
