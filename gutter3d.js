// Item-card 3D model of a gutter, built from the measured cross-section in profiles.js.
// Units: inches. Drag sideways to turn it; 📏 shows / hides the measurements.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';

const LENGTH = 12;   // length of the piece shown (1 ft)
const T = 0.07;      // sheet thickness (slightly exaggerated so it reads)

function label(text, color = '#e31e24', w = 0.95){
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(255,255,255,.95)'; g.strokeStyle = color; g.lineWidth = 8;
  g.beginPath(); g.roundRect(8, 12, 240, 104, 44); g.fill(); g.stroke();
  g.fillStyle = color; g.font = 'bold 84px Inter, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 128, 68);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(w, w / 2, 1); s.renderOrder = 10;
  return s;
}

export function mountGutter(container, profileKey = 'gutter12'){
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
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 300);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8794ab, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 2.3); sun.position.set(10, 18, 14); scene.add(sun);
  const rim = new THREE.DirectionalLight(0xc8d8ff, 0.9); rim.position.set(-12, 6, -10); scene.add(rim);

  // maroon outside, galvalume inside — as in the product photos
  const outside = new THREE.MeshStandardMaterial({ color: 0x9b3640, roughness: 0.42, metalness: 0.35 });
  const inside  = new THREE.MeshStandardMaterial({ color: 0xc9d1d8, roughness: 0.35, metalness: 0.6 });
  const edge    = new THREE.MeshStandardMaterial({ color: 0xb4bcc4, roughness: 0.4, metalness: 0.6 });

  const model = new THREE.Group();
  const dims = new THREE.Group(); dims.visible = false;
  const zf = LENGTH / 2 + 0.05;                       // front end of the piece
  const lineMat = new THREE.LineBasicMaterial({ color: 0xe31e24, depthTest: false, transparent: true, opacity: .9 });

  for (let i = 1; i < P.length; i++){
    const [x1, y1] = P[i-1], [x2, y2] = P[i];
    const len = Math.hypot(x2 - x1, y2 - y1), ang = Math.atan2(y2 - y1, x2 - x1);
    // BoxGeometry faces: +x, -x, +y, -y, +z, -z ; local +y = left of travel = inside
    const m = new THREE.Mesh(new THREE.BoxGeometry(len + T * 0.7, T, LENGTH), [edge, edge, inside, outside, edge, edge]);
    m.position.set((x1 + x2) / 2 - cx, (y1 + y2) / 2 - cy, 0); m.rotation.z = ang;
    model.add(m);

    // measurement for this segment, at the front end, on the outside (or inside if asked)
    // short flat steps get their label on the inside so they don't collide with the tall parts
    const flat = Math.abs(y2 - y1) < 1e-6, short = len < 1;
    const endFold = i === 1 || i === P.length - 1;      // the ¼ folds at the two top edges
    const k = flat && short && !endFold ? -1 : 1;
    const nx = k * (y2 - y1) / len, ny = -k * (x2 - x1) / len;
    const off = flat ? 0.38 : 0.55;
    const a = new THREE.Vector3(x1 - cx + nx * 0.16, y1 - cy + ny * 0.16, zf), b = new THREE.Vector3(x2 - cx + nx * 0.16, y2 - cy + ny * 0.16, zf);
    dims.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), lineMat));
    const s = label(L[i-1] || len.toFixed(2));
    s.position.set((x1 + x2) / 2 - cx + nx * off, (y1 + y2) / 2 - cy + ny * off, zf);
    dims.add(s);
  }
  // length mark along the bottom
  const yb = -cy - 0.55, xr = maxX - cx + 0.55;
  dims.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(xr, yb, -LENGTH/2), new THREE.Vector3(xr, yb, LENGTH/2)]), lineMat));
  const ll = label('1 ft', '#0b4ea2', 1.3); ll.position.set(xr + 0.7, yb, -1.5); dims.add(ll);
  model.add(dims);
  scene.add(model);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.enablePan = false; controls.enableZoom = false; controls.minDistance = 1; controls.maxDistance = 200;
  controls.minPolarAngle = 0.35; controls.maxPolarAngle = 1.75;
  controls.autoRotate = true; controls.autoRotateSpeed = 1.2;

  // camera distance that fits the model in the card, whatever its shape
  const HOME_DIR = new THREE.Vector3(1, 0.55, 1).normalize(), FRONT_DIR = new THREE.Vector3(0.12, 0.08, 1).normalize();
  const R_ALL = Math.hypot(LENGTH / 2, (maxX - minX) / 2, maxY / 2) * 1.02;      // whole piece
  const R_END = Math.hypot((maxX - minX) / 2 + 0.9, maxY / 2 + 0.55);            // cut end + labels
  const fit = r => {
    const v = THREE.MathUtils.degToRad(camera.fov), h = 2 * Math.atan(Math.tan(v / 2) * camera.aspect);
    return r / Math.sin(Math.min(v, h) / 2);
  };
  const HOME = new THREE.Vector3(), FRONT = new THREE.Vector3();
  let showing = false;
  const place = () => { HOME.copy(HOME_DIR).multiplyScalar(fit(R_ALL)); FRONT.copy(FRONT_DIR).multiplyScalar(fit(R_END) * 0.92 + LENGTH / 2); };
  controls.target.set(0, 0, 0);
  let anim = null;
  const flyTo = to => { anim = { from: camera.position.clone(), to: to.clone(), t: 0 }; };

  function resize(){
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    place();
    if (!anim) camera.position.setLength((showing ? FRONT : HOME).length());
  }
  place(); camera.position.copy(HOME);
  const ro = new ResizeObserver(resize); ro.observe(container); resize();

  renderer.domElement.addEventListener('pointerdown', () => { controls.autoRotate = false; });

  let visible = true;
  const io = new IntersectionObserver(es => visible = es[0].isIntersecting); io.observe(container);
  renderer.setAnimationLoop(() => {
    if (!visible) return;
    if (anim){
      anim.t = Math.min(1, anim.t + 0.04); const e = 1 - Math.pow(1 - anim.t, 3);
      camera.position.lerpVectors(anim.from, anim.to, e);
      if (anim.t >= 1) anim = null;
    }
    controls.update(); renderer.render(scene, camera);
  });

  return {
    // show measurements: turn to face the cut end so the labels read clearly
    setDims(on){ showing = on; dims.visible = on; controls.autoRotate = !on; flyTo(on ? FRONT : HOME); },
    dispose(){
      renderer.setAnimationLoop(null); ro.disconnect(); io.disconnect(); controls.dispose();
      scene.traverse(o => { o.geometry?.dispose?.(); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m?.map?.dispose?.(); m?.dispose?.(); }); });
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    }
  };
}
