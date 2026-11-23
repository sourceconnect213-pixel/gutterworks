// 3D model of a gutter, built from the measured cross-section in profiles.js.
// Units: inches.
//   mountGutter(el, key)                         → card preview: turns slowly by itself, not draggable
//   mountGutter(el, key, { interactive: true })  → big view: drag any direction, pinch / wheel to zoom
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';

const LENGTH = 12;   // length of the piece shown (1 ft)
const T = 0.07;      // sheet thickness (slightly exaggerated so it reads)

function label(text, color = '#e31e24', w = 0.95){
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(255,255,255,.96)'; g.strokeStyle = color; g.lineWidth = 8;
  g.beginPath(); g.roundRect(8, 12, 240, 104, 44); g.fill(); g.stroke();
  g.fillStyle = color; g.font = 'bold 84px Inter, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 128, 68);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(w, w / 2, 1); s.renderOrder = 10;
  return s;
}

export function mountGutter(container, profileKey = 'gutter12', opts = {}){
  const interactive = !!opts.interactive;
  const prof = (window.AD_PROFILES || {})[profileKey];
  if (!prof) throw new Error('No profile ' + profileKey);
  const P = prof.points, L = prof.labels || [];
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
  const outside = new THREE.MeshStandardMaterial({ color: 0xc4505b, roughness: 0.5, metalness: 0.12 });
  const inside  = new THREE.MeshStandardMaterial({ color: 0xe2e7ec, roughness: 0.42, metalness: 0.25 });
  const edge    = new THREE.MeshStandardMaterial({ color: 0xcfd5db, roughness: 0.45, metalness: 0.25 });
  const foldMat = new THREE.LineBasicMaterial({ color: 0x5a1a20, transparent: true, opacity: 0.55 });

  const model = new THREE.Group();
  const dims = new THREE.Group(); dims.visible = false;
  const zf = LENGTH / 2 + 0.05;
  const lineMat = new THREE.LineBasicMaterial({ color: 0xe31e24, depthTest: false, transparent: true, opacity: .9 });

  for (let i = 1; i < P.length; i++){
    const [x1, y1] = P[i-1], [x2, y2] = P[i];
    const len = Math.hypot(x2 - x1, y2 - y1), ang = Math.atan2(y2 - y1, x2 - x1);
    // BoxGeometry faces: +x, -x, +y, -y, +z, -z ; local +y = left of travel = inside
    const geo = new THREE.BoxGeometry(len + T * 0.7, T, LENGTH);
    const m = new THREE.Mesh(geo, [edge, edge, inside, outside, edge, edge]);
    m.position.set((x1 + x2) / 2 - cx, (y1 + y2) / 2 - cy, 0); m.rotation.z = ang;
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), foldMat));   // crisp fold lines
    model.add(m);

    // measurement label for this segment at the front end
    const flat = Math.abs(y2 - y1) < 1e-6, short = len < 1;
    const endFold = i === 1 || i === P.length - 1;
    const k = flat && short && !endFold ? -1 : 1;
    const nx = k * (y2 - y1) / len, ny = -k * (x2 - x1) / len;
    const off = flat ? 0.38 : (short ? 0.66 : 0.55);
    const slide = k < 0 ? 0.2 : 0;                       // inside step labels sit toward the next riser
    const ux = (x2 - x1) / len * slide, uy = (y2 - y1) / len * slide;
    const a = new THREE.Vector3(x1 - cx + nx * 0.16, y1 - cy + ny * 0.16, zf), b = new THREE.Vector3(x2 - cx + nx * 0.16, y2 - cy + ny * 0.16, zf);
    dims.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), lineMat));
    const s = label(L[i-1] || len.toFixed(2));
    s.position.set((x1 + x2) / 2 - cx + nx * off + ux, (y1 + y2) / 2 - cy + ny * off + uy, zf);
    dims.add(s);
  }
  const yb = -cy - 0.55, xr = maxX - cx + 0.55;
  dims.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(xr, yb, -LENGTH/2), new THREE.Vector3(xr, yb, LENGTH/2)]), lineMat));
  const ll = label('1 ft', '#0b4ea2', 1.3); ll.position.set(xr + 0.7, yb, -1.5); dims.add(ll);
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
  const R_END = Math.hypot((maxX - minX) / 2 + 0.9, maxY / 2 + 0.55);
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
    const hw = (maxX - minX) / 2 + 1.6, hh = maxY / 2 + 1.05;
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
    setDims(on){ showing = on; dims.visible = on; controls.autoRotate = !on; flyTo(on ? FRONT : HOME); },
    reset(){ showing = false; dims.visible = false; controls.autoRotate = true; flyTo(HOME); },
    dispose(){
      renderer.setAnimationLoop(null); ro.disconnect(); io.disconnect(); controls.dispose();
      scene.traverse(o => { o.geometry?.dispose?.(); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m?.map?.dispose?.(); m?.dispose?.(); }); });
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    }
  };
}
