// 12" box gutter — interactive 3D model (three.js)
// Units: inches. The profile is scaled so the flat sheet width (girth) is exactly 12".
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';

const GIRTH = 12;          // sheet width in inches
const LENGTH = 24;         // length of the piece shown (2 ft)
const T = 0.09;            // sheet thickness (exaggerated slightly so it is visible)

// Cross-section traced from the end-view photo (x = across, y = up):
// plain wall with a small inward fold at the top → flat bottom →
// stepped wall that climbs outward in 4 rises / 3 steps → small outward fold at the top.
const RAW = [
  [0.30, 2.27], [0, 2.55],                 // inward fold on the plain wall
  [0, 0],                                  // plain wall
  [3.0, 0],                                // flat bottom
  [3.0, 0.80], [3.48, 0.80],               // step 1
  [3.48, 1.93], [3.96, 1.93],              // step 2
  [3.96, 3.06], [4.45, 3.06],              // step 3
  [4.45, 4.20],                            // top of the stepped wall
  [4.75, 3.92]                             // outward fold at the top
];

function scaledProfile(){
  let g = 0;
  for (let i = 1; i < RAW.length; i++) g += Math.hypot(RAW[i][0]-RAW[i-1][0], RAW[i][1]-RAW[i-1][1]);
  const k = GIRTH / g;
  return RAW.map(([x,y]) => [x*k, y*k]);
}

function label(text, color='#05285a'){
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(255,255,255,.92)'; g.strokeStyle = color; g.lineWidth = 6;
  g.beginPath(); g.roundRect(6, 14, 500, 100, 30); g.fill(); g.stroke();
  g.fillStyle = color; g.font = 'bold 56px Inter, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 256, 66);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  s.scale.set(4.4, 1.1, 1); s.renderOrder = 10;
  return s;
}

function dimLine(a, b, color=0xe31e24){
  const g = new THREE.BufferGeometry().setFromPoints([a, b]);
  const line = new THREE.Line(g, new THREE.LineBasicMaterial({ color, depthTest: false }));
  line.renderOrder = 9;
  return line;
}

export function mountGutter(container){
  const P = scaledProfile();
  const xs = P.map(p => p[0]), ys = P.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), maxY = Math.max(...ys);
  const width = maxX - minX, height = maxY;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 500);

  // lights
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a98b0, 1.4));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(14, 22, 18); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20 });
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0xbfd4ff, 0.8); rim.position.set(-15, 8, -12); scene.add(rim);

  // materials: coloured outside (maroon, like the photos), galvalume inside
  const outside = new THREE.MeshStandardMaterial({ color: 0x9b3640, roughness: 0.42, metalness: 0.35 });
  const inside  = new THREE.MeshStandardMaterial({ color: 0xc9d1d8, roughness: 0.35, metalness: 0.6 });
  const edge    = new THREE.MeshStandardMaterial({ color: 0xb9c1c8, roughness: 0.4, metalness: 0.6 });

  const gutter = new THREE.Group();
  for (let i = 1; i < P.length; i++){
    const [x1,y1] = P[i-1], [x2,y2] = P[i];
    const len = Math.hypot(x2-x1, y2-y1), ang = Math.atan2(y2-y1, x2-x1);
    // BoxGeometry face order: +x, -x, +y, -y, +z, -z ; local +y = left of travel = inside
    const geo = new THREE.BoxGeometry(len + T*0.6, T, LENGTH);
    const m = new THREE.Mesh(geo, [edge, edge, inside, outside, edge, edge]);
    m.position.set((x1+x2)/2, (y1+y2)/2, 0); m.rotation.z = ang;
    m.castShadow = m.receiveShadow = true;
    gutter.add(m);
  }
  gutter.position.x = -(minX + maxX) / 2;
  gutter.position.y = -height / 2;
  scene.add(gutter);

  // soft floor shadow
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.18 }));
  floor.rotation.x = -Math.PI/2; floor.position.y = -height/2 - 0.02; floor.receiveShadow = true;
  scene.add(floor);

  // dimension marks at the front end
  const dims = new THREE.Group();
  const zf = LENGTH/2 + 0.6, y0 = -height/2, x0 = -width/2, x1 = width/2;
  dims.add(dimLine(new THREE.Vector3(x0, y0 - 0.7, zf), new THREE.Vector3(x1, y0 - 0.7, zf)));
  const wl = label(`${width.toFixed(1)}"`); wl.position.set(0, y0 - 1.7, zf); dims.add(wl);
  dims.add(dimLine(new THREE.Vector3(x1 + 0.8, y0, zf), new THREE.Vector3(x1 + 0.8, y0 + height, zf)));
  const hl = label(`${height.toFixed(1)}"`); hl.position.set(x1 + 3.3, 0, zf); dims.add(hl);
  dims.add(dimLine(new THREE.Vector3(x1 + 0.8, y0 - 0.7, -LENGTH/2), new THREE.Vector3(x1 + 0.8, y0 - 0.7, LENGTH/2)));
  const ll = label(`${(LENGTH/12).toFixed(0)} ft`); ll.position.set(x1 + 3.2, y0 - 0.7, -3); dims.add(ll);
  const gl = label(`12" sheet`, '#e31e24'); gl.position.set(0, height/2 + 1.6, zf); dims.add(gl);
  scene.add(dims);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = 10; controls.maxDistance = 70; controls.enablePan = false;
  controls.autoRotate = true; controls.autoRotateSpeed = 1.6;

  const HOME0 = new THREE.Vector3(22, 10.5, 21), END0 = new THREE.Vector3(0, 0.2, 31);
  const HOME = HOME0.clone(), END = END0.clone();
  camera.position.copy(HOME); controls.target.set(0, -0.8, 0);

  // smooth camera moves
  let anim = null;
  function flyTo(pos){ anim = { from: camera.position.clone(), to: pos.clone(), t: 0 }; }

  function resize(){
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.fov = 35;
    camera.updateProjectionMatrix();
    // narrow screens: move the camera back so the whole gutter fits
    const f = Math.max(1, 1.25 / Math.max(0.6, w / h));
    const was = camera.position.length() / HOME.length();
    HOME.copy(HOME0).multiplyScalar(f); END.copy(END0).multiplyScalar(f);
    if (!anim) camera.position.setLength(HOME.length() * (isFinite(was) && was > 0 ? was : 1));
  }
  new ResizeObserver(resize).observe(container); resize();

  const stopAuto = () => { controls.autoRotate = false; container.dispatchEvent(new CustomEvent('gutter:auto', { detail: false })); };
  renderer.domElement.addEventListener('pointerdown', stopAuto);

  let visible = true;
  new IntersectionObserver(es => visible = es[0].isIntersecting).observe(container);
  renderer.setAnimationLoop(() => {
    if (!visible) return;
    if (anim){
      anim.t = Math.min(1, anim.t + 0.035); const e = 1 - Math.pow(1 - anim.t, 3);
      camera.position.lerpVectors(anim.from, anim.to, e);
      if (anim.t >= 1) anim = null;
    }
    controls.update(); renderer.render(scene, camera);
  });

  return {
    width, height, girth: GIRTH,
    toggleRotate(){ controls.autoRotate = !controls.autoRotate; return controls.autoRotate; },
    endView(){ stopAuto(); flyTo(END); },
    reset(){ flyTo(HOME); controls.autoRotate = true; },
    toggleDims(){ dims.visible = !dims.visible; return dims.visible; }
  };
}
