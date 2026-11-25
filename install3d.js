// "සවිවන ආකාරය" — how a rain gutter and down pipe are installed at the eave of a sloping roof.
// Interactive 3D cross-section with a 7-step assembly animation and rainwater flow.
// Units: inches.  x = outward from the building, y = up, z = along the eave (cut plane at z = 0).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { buildSheet } from './gutter3d.js';

// ---------- dimensions (realistic, in inches) ----------
const DEG = Math.PI / 180;
const SLOPE = 22 * DEG, TN = Math.tan(SLOPE), CS = Math.cos(SLOPE), SN = Math.sin(SLOPE);
const RAFTER_D = 4, RAFTER_W = 2;          // 2" × 4" rafter
const RD = RAFTER_D / CS;                  // vertical depth of the rafter at its plumb-cut end
const PUR = 2;                             // 2" × 2" purlin (reeper)
const FAS_T = 1, FAS_TOP = 0;                     // 1" thick fascia board on the rafter ends, top level with the rafter tops (height set by the valance board)
const LEN = 80;                            // length of eave shown
const WALL_X = -24, WALL_T = 9;            // 24" eave overhang, 9" brick wall
const GROUND = -84;
const T = (window.AD_SHEET_MM || 0.47) / 25.4;     // 0.47 mm gutter / pipe sheet
const BT = 0.08;                           // bracket strap thickness (≈2 mm)
const BW = 1.0;                            // bracket strap width
const AMP = 0.6, PITCH = 3;                // roof sheet corrugation
const PIPE = 4;                            // 4" × 4" down pipe
const OUTLET_Z = -LEN + 3;                 // outlet + down pipe at the very end of the gutter, next to the stop end
const RAFTER_Z = [0, -24, -48, -72, -78];  // front faces of the rafters (24" centres) + the end rafter the eave finishes on
const BRACKET_Z = RAFTER_Z.slice(0, 4).map(z => z - RAFTER_W / 2);   // brackets at 24" (≈600 mm); the outlet sits beyond the last one

const rafterTop = x => -TN * x;
const sheetUnder = x => -TN * x + PUR / CS;            // underside of the roof sheet (on the purlins)

// ---------- materials ----------
function hatchTexture(bg, line){
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, 64, 64);
  g.strokeStyle = line; g.lineWidth = 3;
  for (let i = -64; i < 128; i += 16){ g.beginPath(); g.moveTo(i, 64); g.lineTo(i + 64, 0); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  t.repeat.set(0.5, 0.5); return t;
}
const M = {
  timber: new THREE.MeshStandardMaterial({ color: 0xc89a62, roughness: 0.85 }),
  timberCut: new THREE.MeshStandardMaterial({ map: hatchTexture('#ecd2a2', '#b98448'), roughness: 0.9 }),
  wall: new THREE.MeshStandardMaterial({ color: 0xf1ebe1, roughness: 0.95 }),
  wallCut: new THREE.MeshStandardMaterial({ map: hatchTexture('#e8c7b5', '#b8735a'), roughness: 0.95 }),
  paint: new THREE.MeshStandardMaterial({ color: 0xa9504f, roughness: 0.5, metalness: 0.12, side: THREE.DoubleSide }),
  paintEdge: new THREE.MeshStandardMaterial({ color: 0x844040, roughness: 0.5 }),
  galv: new THREE.MeshStandardMaterial({ color: 0xd9dee3, roughness: 0.42, metalness: 0.25, side: THREE.DoubleSide }),
  steel: new THREE.MeshStandardMaterial({ color: 0x8e979f, roughness: 0.35, metalness: 0.65, side: THREE.DoubleSide }),
  screw: new THREE.MeshStandardMaterial({ color: 0xc3c9cf, roughness: 0.25, metalness: 0.85 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x2b2f33, roughness: 0.9 }),
  ground: new THREE.MeshStandardMaterial({ color: 0xeef0f1, roughness: 1 }),
  concrete: new THREE.MeshStandardMaterial({ color: 0xc9cdd1, roughness: 0.95 }),
  water: new THREE.MeshBasicMaterial({ color: 0x1e88e5 }),
  arrow: new THREE.MeshBasicMaterial({ color: 0x1565c0, transparent: true, opacity: 0.9, depthTest: false }),
};
const lineDark = new THREE.LineBasicMaterial({ color: 0x5c3b3b, transparent: true, opacity: 0.55 });
const lineGrey = new THREE.LineBasicMaterial({ color: 0x8e979f, transparent: true, opacity: 0.6 });
const lineSteel = new THREE.LineBasicMaterial({ color: 0x5f666c, transparent: true, opacity: 0.7 });

// polygon in x-y, extruded back from zFront. Only the front face (the section cut at z = 0) gets the
// hatched `cap`; the far end is a real board end, so it is covered in the plain `side` material.
const plainEnd = new Map();
function prism(points, depth, zFront, cap, side){
  const s = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
  const m = new THREE.Mesh(g, [cap, side]); m.position.z = zFront - depth;
  if (cap !== side){
    if (!plainEnd.has(side)) plainEnd.set(side, side.clone()), plainEnd.get(side).side = THREE.DoubleSide;
    const back = new THREE.Mesh(new THREE.ShapeGeometry(s), plainEnd.get(side)); back.position.z = -0.01; m.add(back);
  }
  return m;
}
function box(sx, sy, sz, mat){ return new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat); }

// offset a polyline to its right-hand (outside) side by d, mitred at the corners
function offsetPath(pts, d){
  const n = pts.length, N = [];
  for (let i = 1; i < n; i++){ const dx = pts[i][0] - pts[i-1][0], dy = pts[i][1] - pts[i-1][1], l = Math.hypot(dx, dy); N.push([dy / l, -dx / l]); }
  return pts.map((p, i) => {
    const a = N[Math.min(i, N.length - 1)], b = N[Math.max(i - 1, 0)];
    let mx = a[0] + b[0], my = a[1] + b[1]; const ml = Math.hypot(mx, my); mx /= ml; my /= ml;
    const k = d / Math.max(0.35, mx * a[0] + my * a[1]);
    return [p[0] + mx * k, p[1] + my * k];
  });
}

function arrowMesh(a, b){
  const dir = b.clone().sub(a), len = dir.length(), head = Math.min(1.1, len * 0.4);
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, len - head, 10), M.arrow.clone());
  shaft.position.y = (len - head) / 2;
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.5, head, 16), shaft.material);
  cone.position.y = len - head / 2;
  g.add(shaft, cone); g.position.copy(a);
  g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  shaft.renderOrder = cone.renderOrder = 5;
  g.userData.mat = shaft.material;
  return g;
}

// =====================================================================
// gutter profiles that can be shown, and which side of each goes against the fascia
export const GUTTERS = ['gutter12', 'box12', 'g18a', 'g18b', 'g18c', 'g18d', 'g18e'];
export const VALANCES = ['val12d', 'val12a', 'val12b', 'val12c', 'val9a', 'val9b'];
const BACK_ON_LEFT = { box12: true };      // box gutter: its taller (kinked) left wall is the back wall; others: plain right wall to the fascia

export function mountInstall(stage, ui, opts = {}){
  const GKEY = GUTTERS.includes(opts.gutter) ? opts.gutter : 'gutter12';
  const VKEY = VALANCES.includes(opts.valance) ? opts.valance : (opts.valance === 'none' ? null : 'val12d');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  renderer.setClearColor(0xffffff, 1);
  stage.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 2000);
  scene.add(camera);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xbfc6cf, 1.5));
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const head = new THREE.DirectionalLight(0xffffff, 1.6); head.position.set(2, 3, 4); camera.add(head); camera.add(head.target);
  const sun = new THREE.DirectionalLight(0xffffff, 0.9); sun.position.set(20, 60, 30); scene.add(sun);

  const anim = [];          // { obj, step, delay, dur, from, spin }
  const add = (obj, step, delay = 0, from = new THREE.Vector3(), dur = 0.75, spin = 0) => {
    obj.userData.base = obj.position.clone(); scene.add(obj);
    anim.push({ obj, step, delay, dur, from, spin });
    return obj;
  };

  // ---------- 1. wall + rafters ----------
  const yRb = x => rafterTop(x) - RD;
  const wall = prism([[WALL_X - WALL_T, GROUND], [WALL_X, GROUND], [WALL_X, yRb(WALL_X)], [WALL_X - WALL_T, yRb(WALL_X - WALL_T)]], LEN, 0, M.wallCut, M.wall);
  add(wall, 0, 0, new THREE.Vector3(0, -20, 0));
  const ground = box(140, 1, LEN + 30, M.ground); ground.position.set(-20, GROUND - 0.5, -LEN / 2); scene.add(ground);
  const rafters = RAFTER_Z.map((zf, i) => {
    // only the rafter at the cut plane (z = 0) shows the hatched section face
    const r = prism([[-62, rafterTop(-62)], [0, 0], [0, -RD], [-62, rafterTop(-62) - RD]], RAFTER_W, zf, i === 0 ? M.timberCut : M.timber, M.timber);
    return add(r, 0, 0.15 + i * 0.12, new THREE.Vector3(0, 26, 0));
  });

  // ---------- 2. fascia board + metal valance board (sizes taken from the chosen items) ----------
  // valance: painted face outward, ribs rest on the timber, bottom return + lip wrap under the fascia,
  // top hem over the fascia top. The timber fascia height is set so the valance fits it exactly.
  let FAS_BOT = -8, VAL_FACE = FAS_T;
  let vpts = null;
  if (VKEY){
    const VP = window.AD_PROFILES[VKEY].points, vMaxX = Math.max(...VP.map(p => p[0]));
    const mid = VP.slice(3, -1), vRib = mid.length ? vMaxX - Math.min(...mid.map(p => p[0])) : 0;
    const lip = VP[0][1] - VP[1][1], faceTop = VP[VP.length - 2][1] - VP[1][1];
    FAS_BOT = -(faceTop - lip);                             // fascia bottom sits on the lip, top level with the face top
    const VAL_X = FAS_T + vRib + T / 2;
    const VAL_Y0 = FAS_BOT - lip - T / 2;
    vpts = VP.map(([x, y]) => [x - vMaxX + VAL_X, y - VP[1][1] + VAL_Y0]);
    VAL_FACE = VAL_X + T / 2;
  }
  const fascia = prism([[0, FAS_BOT], [FAS_T, FAS_BOT], [FAS_T, FAS_TOP], [0, FAS_TOP]], LEN, 0, M.timberCut, M.timber);
  add(fascia, 1, 0, new THREE.Vector3(18, 0, 0));
  if (vpts){
    const valance = buildSheet(vpts, T, LEN, { outside: M.paint, inside: M.galv, edge: M.paintEdge, foldMat: lineDark, insideLineMat: lineGrey });
    valance.position.z = -LEN / 2;
    add(valance, 1, 0.45, new THREE.Vector3(14, 0, 0), 0.6);
  }

  // ---------- gutter geometry: the chosen item's measured profile ----------
  const prof = window.AD_PROFILES[GKEY].points;
  const pMaxX = Math.max(...prof.map(p => p[0]));
  // order the points so the walk starts at the back (fascia side) top fold and the outside stays on the right
  const oriented = BACK_ON_LEFT[GKEY] ? prof.map(p => p.slice()) : prof.map(([x, y]) => [pMaxX - x, y]).reverse();
  const oMinX = Math.min(...oriented.map(p => p[0])), oMinY = Math.min(...oriented.map(p => p[1]));
  const backTop0 = oriented[1][1];                          // top of the back wall
  const gx = VAL_FACE + T / 2;                             // back wall straight against the valance board (or fascia)
  const gy = -0.1 - (backTop0 - oMinY);                     // back top just below the fascia top; gy = gutter bottom
  const gpts = oriented.map(([x, y]) => [x - oMinX + gx, y - oMinY + gy]);
  const bottomXs = gpts.filter(p => Math.abs(p[1] - gy) < 1e-6).map(p => p[0]);
  const BL = Math.min(...bottomXs), BR = Math.max(...bottomXs), BW_ = BR - BL;
  const OX = (BL + BR) / 2;                                // outlet centre (middle of the flat bottom)
  const FRONT_X = Math.max(...gpts.map(p => p[0]));
  const backTop = gpts[1][1];
  const SHEET_EDGE_X = gx + 1.75;                          // roof sheet edge ≈1¾" into the gutter

  // ---------- 3. gutter (against the fascia) + stop end + outlet opening ----------
  const gutterMats = { outside: M.paint, inside: M.galv, edge: M.paintEdge, foldMat: lineDark, insideLineMat: lineGrey };
  const gutter = new THREE.Group();
  const gmesh = buildSheet(gpts, T, LEN, gutterMats); gmesh.position.z = -LEN / 2; gutter.add(gmesh);
  const stop = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(gpts.map(([x, y]) => new THREE.Vector2(x, y)))), M.paint);
  stop.position.z = -LEN + 0.02; gutter.add(stop);
  // outlet nozzle: sized to fit the gutter's flat bottom (never wider than 3")
  const NOZ = Math.min(3, BW_ - 0.5);
  const hole = box(NOZ - 0.1, 0.02, NOZ - 0.1, M.dark); hole.position.set(OX, gy + 0.03, OUTLET_Z); gutter.add(hole);
  add(gutter, 2, 0, new THREE.Vector3(0, 22, 0), 0.9);

  // ---------- 4. internal brackets + fixing screws ----------
  // Z-shaped galvanised flat bar with a stiffening rib (as in the owner's photos), hidden inside the gutter:
  // tab bent DOWN the back wall, screwed through it into the fascia; ribbed bar straight across the top of
  // the gutter; foot bent UP the inside of the front wall, riveted to it. Water flows freely underneath.
  const IBT = 0.12, IBW = 1.0;                             // ≈3 mm × 25 mm flat bar
  const n = gpts.length;
  const tx = gx + T / 2 + IBT / 2;                       // tab line on the back wall
  const frontTop = Math.max(...gpts.filter(p => p[0] > OX).map(p => p[1]));
  const frontSegAt = y => {                              // non-flat front-side segment crossing height y
    for (let i = 1; i < n; i++){
      const [x1, y1] = gpts[i - 1], [x2, y2] = gpts[i];
      if (Math.min(x1, x2) <= OX || Math.abs(y2 - y1) < 1e-6) continue;
      if (Math.min(y1, y2) <= y && Math.max(y1, y2) >= y) return { x1, y1, x2, y2 };
    }
    return null;
  };
  // bar height: below the back wall's top fold, and low enough that the foot fits up the front wall
  let yb = Math.min(backTop - 0.45, frontTop - 1.1), fseg = null;
  for (let tries = 0; tries < 8; tries++){
    fseg = frontSegAt(yb);
    const hi = fseg ? Math.max(fseg.y1, fseg.y2) : yb;
    if (fseg && hi - yb >= 0.7) break;                    // room for the foot above the bar
    const lo = fseg ? Math.min(fseg.y1, fseg.y2) : yb;
    if (fseg && hi - lo >= 0.85){ yb = hi - 0.8; break; }  // long enough part: lower the bar within it
    yb = lo - 0.05;                                        // otherwise use the next part of the front wall down
  }
  const fl = Math.hypot(fseg.x2 - fseg.x1, fseg.y2 - fseg.y1);
  const fu = [(fseg.x2 - fseg.x1) / fl, (fseg.y2 - fseg.y1) / fl];            // along the front wall
  const fin = [-fu[1], fu[0]];                                                 // toward the inside of the gutter
  const fk = (yb - fseg.y1) / (fseg.y2 - fseg.y1), off = T / 2 + IBT / 2;
  const fBot = [fseg.x1 + (fseg.x2 - fseg.x1) * fk + fin[0] * off, yb];       // where the bar meets the front wall
  const up = fu[1] > 0 ? fu : [-fu[0], -fu[1]];                                // up along the front wall
  const footLen = Math.min(0.9, (Math.max(fseg.y1, fseg.y2) - yb) / Math.abs(up[1]) - 0.05);
  const fTop = [fBot[0] + up[0] * footLen, fBot[1] + up[1] * footLen];         // top of the foot
  const bpath = [
    [tx, yb - 0.95],                                       // bottom of the tab (bent down the back wall)
    [tx, yb],                                              // tab meets the bar
    fBot,                                                  // ribbed bar across the top of the gutter
    fTop,                                                  // foot bent up the front wall
  ];
  const steelMats = { outside: M.steel, inside: M.steel, edge: M.steel, foldMat: lineSteel, insideLineMat: lineSteel };
  const UP = new THREE.Vector3(0, 1, 0);
  function makeScrew(len){                                 // hex washer-head screw (or a short rivet), head at +y
    const s = new THREE.Group(), inner = new THREE.Group(); s.add(inner);
    const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.05, len, 10), M.screw); shank.position.y = -len / 2;
    const washer = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.05, 20), M.screw); washer.position.y = 0.025;
    const hex = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.14, 6), M.screw); hex.position.y = 0.12;
    inner.add(shank, washer, hex); s.userData.inner = inner; return s;
  }
  const screwAt = []; let boltAt = null;
  function makeBolt(){                                     // local +y points into the gutter; head at y < 0 (outside)
    const s = new THREE.Group(), inner = new THREE.Group(); s.add(inner);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.paint);
    head.scale.y = 0.45;                                   // low mushroom (truss) head, painted like the gutter
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.06), M.paintEdge); slot.position.y = -0.13;
    const len = T + IBT + 0.13 + 0.3;                      // wall + bar + nut + a little thread showing
    const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, len, 10), M.screw); shank.position.y = len / 2;
    const nut = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.13, 0.36), M.screw); nut.position.y = T + IBT + 0.065;
    inner.add(head, slot, shank, nut); s.userData.inner = inner; return s;
  }
  BRACKET_Z.forEach((zc, i) => {
    const b = buildSheet(bpath, IBT, IBW, steelMats); b.position.z = zc;
    { // stiffening rib pressed along the middle of the bar (top face)
      const ax = tx + 0.25, bx = fBot[0] - 0.25, L = bx - ax;
      const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, L, 8), M.steel);
      rib.rotation.z = Math.PI / 2; rib.position.set((ax + bx) / 2, yb + IBT / 2, 0);   // half sunk into the bar
      b.add(rib);
    }
    add(b, 3, i * 0.1, new THREE.Vector3(0, 9, 0));
    const spots = [
      { p: [tx + IBT / 2, yb - 0.5], axis: new THREE.Vector3(1, 0, 0), len: 1.3 },   // through the tab + gutter wall into the fascia
    ];
    spots.forEach(({ p, axis, len }, j) => {
      const s = makeScrew(len); s.position.set(p[0], p[1], zc); s.quaternion.setFromUnitVectors(UP, axis);
      add(s, 3, 0.45 + i * 0.08 + j * 0.08, axis.clone().multiplyScalar(1.6), 0.55, 6 * Math.PI);
      if (i === 0) screwAt.push(new THREE.Vector3(p[0] + 0.15, p[1], zc));
    });
    // front: bolt (owner's photo) — coloured mushroom head on the outside of the front wall, shank through the
    // wall and the bracket foot, square nut tightened on the inside
    {
      const fm = [(fTop[0] + fBot[0]) / 2, (fTop[1] + fBot[1]) / 2];           // foot middle (bar centre line)
      const wallOut = [fm[0] - fin[0] * (off + T / 2), fm[1] - fin[1] * (off + T / 2)];   // outside face of the front wall
      const bolt = makeBolt();
      bolt.position.set(wallOut[0], wallOut[1], zc);
      const ax = new THREE.Vector3(fin[0], fin[1], 0);
      bolt.quaternion.setFromUnitVectors(UP, ax);
      add(bolt, 3, 0.62 + i * 0.08, ax.clone().multiplyScalar(-1.6), 0.55, 6 * Math.PI);
      if (i === 0) boltAt = new THREE.Vector3(wallOut[0] - fin[0] * 0.25, wallOut[1] - fin[1] * 0.25, zc);
    }
  });

  // ---------- 5. purlins + roof covering ----------
  const u = [-CS, SN], nrm = [SN, CS];
  [1.2, 24, 48].forEach((s, i) => {
    const B = [-s * CS, s * SN];
    const pts = [B, [B[0] + u[0] * PUR, B[1] + u[1] * PUR], [B[0] + u[0] * PUR + nrm[0] * PUR, B[1] + u[1] * PUR + nrm[1] * PUR], [B[0] + nrm[0] * PUR, B[1] + nrm[1] * PUR]];
    add(prism(pts, LEN, 0, M.timberCut, M.timber), 4, i * 0.1, new THREE.Vector3(0, 14, 0), 0.6);
  });
  const roof = new THREE.Group();
  {
    const sTop = 62 / CS, sEdge = -(SHEET_EDGE_X - SN * PUR) / CS;      // along-slope range of the sheet
    const NZ = Math.round(LEN / PITCH * 10), NS = 6, pos = [], idx = [];
    for (let j = 0; j <= NS; j++){
      const s = sEdge + (sTop - sEdge) * j / NS, bx = -s * CS, by = s * SN;
      for (let i = 0; i <= NZ; i++){
        const z = -LEN * i / NZ, h = PUR + 0.03 + AMP * (0.5 - 0.5 * Math.cos(2 * Math.PI * z / PITCH));
        pos.push(bx + nrm[0] * h, by + nrm[1] * h, z);
      }
    }
    for (let j = 0; j < NS; j++) for (let i = 0; i < NZ; i++){
      const a = j * (NZ + 1) + i, b = a + 1, c = a + NZ + 1, e = c + 1;
      idx.push(a, c, b, b, c, e);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    // the triangles face downward, so the painted (upper) face is the back side
    const top = new THREE.Mesh(g, M.paint.clone()); top.material.side = THREE.BackSide;
    const under = new THREE.Mesh(g, M.galv.clone()); under.material.side = THREE.FrontSide;
    roof.add(top, under);
  }
  add(roof, 4, 0.35, new THREE.Vector3(-30 * CS, 30 * SN, 0), 0.9);

  // ---------- 6. outlet, down pipe (with 45° bends), pipe clips, drain ----------
  const XW = WALL_X + PIPE / 2 + 1.25;                  // pipe centre beside the wall
  // The pipe hangs in front of the valance board / fascia (never through it): its back face sits just
  // in front of the face, and the 45° bend back toward the wall starts below the valance's bottom edge.
  const FACE_BOTTOM = vpts ? Math.min(...vpts.map(p => p[1])) - T / 2 : FAS_BOT;
  const PX = Math.max(OX, VAL_FACE + PIPE / 2 + 0.15);       // pipe centre line
  const P2Y = Math.min(gy - 6, FACE_BOTTOM - 1.6);           // bend: inner corner ≥ 0.75" below the face bottom
  const P1 = new THREE.Vector3(PX, gy - T / 2 - 0.02, OUTLET_Z), P2 = new THREE.Vector3(PX, P2Y, OUTLET_Z);
  const P3 = new THREE.Vector3(XW, P2.y - (PX - XW), OUTLET_Z), P4 = new THREE.Vector3(XW, GROUND + 8, OUTLET_Z);
  const P5 = new THREE.Vector3(XW + 4.5, GROUND + 3.5, OUTLET_Z);
  const outlet = new THREE.Group();
  const nh = NOZ / 2;
  [[0, nh], [0, -nh], [nh, 0], [-nh, 0]].forEach(([dx, dz]) => {
    const w = box(dx ? 0.05 : NOZ, 3, dz ? 0.05 : NOZ, M.paint); w.position.set(OX + dx, gy - 1.5, OUTLET_Z + dz); outlet.add(w);
  });
  add(outlet, 5, 0, new THREE.Vector3(0, -8, 0), 0.6);
  // one continuous square pipe with mitred bends (all bends lie in the x-y plane)
  {
    const path = [P1, P2, P3, P4, P5].map(v => [v.x, v.y]), w = PIPE / 2, z0 = OUTLET_Z - w, z1 = OUTLET_Z + w;
    const N = []; for (let i = 1; i < path.length; i++){ const dx = path[i][0] - path[i-1][0], dy = path[i][1] - path[i-1][1], l = Math.hypot(dx, dy); N.push([dy / l, -dx / l]); }
    const off = path.map((p, i) => {
      const a = N[Math.min(i, N.length - 1)], b = N[Math.max(i - 1, 0)];
      let mx = a[0] + b[0], my = a[1] + b[1]; const ml = Math.hypot(mx, my); mx /= ml; my /= ml;
      const k = w / (mx * a[0] + my * a[1]);
      return { R: [p[0] + mx * k, p[1] + my * k], L: [p[0] - mx * k, p[1] - my * k] };
    });
    const pos = [], q = (A, B, C, D) => pos.push(...A, ...B, ...C, ...A, ...C, ...D);
    for (let i = 0; i < path.length - 1; i++){
      const a = off[i], b = off[i + 1];
      q([...a.R, z0], [...b.R, z0], [...b.R, z1], [...a.R, z1]);      // outer side
      q([...a.L, z1], [...b.L, z1], [...b.L, z0], [...a.L, z0]);      // inner side
      q([...a.R, z1], [...b.R, z1], [...b.L, z1], [...a.L, z1]);      // front
      q([...a.L, z0], [...b.L, z0], [...b.R, z0], [...a.R, z0]);      // back
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
    const tube = new THREE.Mesh(g, M.paint);
    tube.add(new THREE.LineSegments(new THREE.EdgesGeometry(g, 20), lineDark));   // pipe corners + the mitre seams at each bend
    add(tube, 5, 0.12, new THREE.Vector3(0, -14, 0), 0.7);
  }
  const clipYs = [-34, -64], clipAt = [];
  clipYs.forEach((y, i) => {
    const c = new THREE.Group(), s = PIPE / 2 + BT;
    [[0, s], [0, -s], [s, 0]].forEach(([dx, dz]) => { const b = box(dx ? BT : PIPE + 2 * BT, 0.9, dz ? BT : PIPE + 2 * BT, M.steel); b.position.set(dx, 0, dz); c.add(b); });
    const tab = box(BT, 0.9, PIPE + 3, M.steel); tab.position.set(WALL_X - XW + BT / 2, 0, 0);          // plate screwed to the wall c.add(tab);
    const back = box(XW - WALL_X - PIPE / 2, 0.9, BT, M.steel);
    [-1, 1].forEach(k => { const bb = back.clone(); bb.position.set(-(PIPE / 2) - (XW - WALL_X - PIPE / 2) / 2, 0, k * s); c.add(bb); });
    [-1, 1].forEach(k => { const sc = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.14, 6), M.screw); sc.rotation.z = Math.PI / 2; sc.position.set(WALL_X - XW + 0.12, 0, k * (PIPE / 2 + 1)); c.add(sc); });
    c.position.set(XW, y, OUTLET_Z);
    add(c, 5, 0.6 + i * 0.1, new THREE.Vector3(6, 0, 0), 0.5);
    clipAt.push(new THREE.Vector3(XW + PIPE / 2 + 0.1, y, OUTLET_Z + PIPE / 2));
  });
  const drain = new THREE.Group();
  { const L = 14, W = 8;
    [[0, -W / 2], [0, W / 2]].forEach(([, z]) => { const s = box(L, 3, 1, M.concrete); s.position.set(0, -1.5, z); drain.add(s); });
    const b = box(L, 0.6, W, M.concrete); b.position.set(0, -2.7, 0); drain.add(b);
    drain.position.set(P5.x + 6, GROUND, OUTLET_Z); }
  add(drain, 5, 0.7, new THREE.Vector3(0, -6, 0), 0.5);

  // ---------- 7. rainwater: arrows + drops + rain ----------
  const water = new THREE.Group(); water.visible = false; scene.add(water);
  const onRoof = (x, z, lift) => new THREE.Vector3(x + nrm[0] * lift, sheetUnder(x) + nrm[1] * lift, z);   // a point lifted off the sheet
  const arrows = [];
  const A = (a, b) => { const m = arrowMesh(a, b); water.add(m); arrows.push(m); };
  const zA = -6;
  [[-34, -24], [-20, -10], [-6, 1.2]].forEach(([x1, x2]) => A(onRoof(x1, zA, AMP + 1.4), onRoof(x2, zA, AMP + 1.4)));
  A(new THREE.Vector3(SHEET_EDGE_X + 0.4, sheetUnder(SHEET_EDGE_X) + 0.9, zA), new THREE.Vector3(OX + 0.3, gy + 1.0, zA));
  [[-8, -22], [-28, -42], [-48, -62]].forEach(([z1, z2]) => A(new THREE.Vector3(OX, gy + 0.9, z1), new THREE.Vector3(OX, gy + 0.9, z2)));   // along the gutter to the outlet at the end
  const pz = OUTLET_Z + PIPE / 2 + 1.6;
  A(new THREE.Vector3(PX + 3, gy - 1, pz), new THREE.Vector3(PX + 3, P2.y - 1, pz));
  A(new THREE.Vector3(P2.x - 3, P2.y - 3.5, pz), new THREE.Vector3(P3.x + 5, P3.y + 1.5, pz));
  A(new THREE.Vector3(XW + 4, -40, pz), new THREE.Vector3(XW + 4, -56, pz));
  A(new THREE.Vector3(P5.x + 1, P5.y + 1, pz - 1.6), new THREE.Vector3(P5.x + 6, GROUND + 0.6, pz - 1.6));

  // drops follow the real path: roof → over the sheet edge → into the gutter → along to the outlet → down the pipe → drain
  const DROPS = 70, drops = new THREE.InstancedMesh(new THREE.SphereGeometry(0.28, 10, 8), M.water, DROPS);
  drops.instanceMatrix.setUsage(THREE.DynamicDrawUsage); water.add(drops);
  const paths = [];
  for (let i = 0; i < DROPS; i++){
    const x0 = -50 + Math.random() * 44, z = -2 - Math.random() * 70, lx = SHEET_EDGE_X + 0.3 + Math.random() * 1.0;
    const pts = [onRoof(x0, z, AMP + 0.25), onRoof(SHEET_EDGE_X, z, AMP + 0.25),
      new THREE.Vector3(SHEET_EDGE_X + 0.4, gy + 1.6, z), new THREE.Vector3(lx, gy + 0.3, z),
      new THREE.Vector3(OX, gy + 0.3, OUTLET_Z), P1.clone(), P2, P3, P4, P5, new THREE.Vector3(P5.x + 6, GROUND - 1.4, OUTLET_Z)];
    const cum = [0]; for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + pts[k].distanceTo(pts[k - 1]));
    paths.push({ pts, cum, t0: Math.random() });
  }
  const RAIN = 60, rainPos = new Float32Array(RAIN * 6);
  const rain = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(rainPos, 3)),
    new THREE.LineBasicMaterial({ color: 0x64b5f6, transparent: true, opacity: 0.7 }));
  const rainSeed = Array.from({ length: RAIN }, () => [-50 + Math.random() * 52, Math.random(), -2 - Math.random() * 72]);
  water.add(rain);

  // ---------- labels (Sinhala + English) ----------
  const LABELS = [
    { k: 'roof', views: {section:'L',full:'L'},    si: 'වහල ආවරණය', en: 'Roof covering', step: 4, at: onRoof(-14, -1.5, AMP + 0.1) },
    { k: 'purlin', views: {section:'L'},  si: 'රීප්ප', en: 'Purlin', step: 4, at: new THREE.Vector3(-28 * CS - 1, 28 * SN + 1.2, 0) },
    { k: 'rafter', views: {section:'L'},  si: 'පරාලය', en: 'Rafter', step: 0, at: new THREE.Vector3(-12, rafterTop(-12) - RD / 2, 0) },
    { k: 'wall', views: {section:'L',full:'L'},    si: 'බිත්තිය', en: 'Wall', step: 0, at: new THREE.Vector3(WALL_X - WALL_T / 2, -4, 0) },
    { k: 'valance', views: VKEY ? {section:'R',full:'L'} : {}, si: 'වඩිම්බු ආවරණය', en: 'Valance board', step: 1.3, at: new THREE.Vector3(VAL_FACE, -6.6, -0.5) },
    { k: 'fascia', views: {section:'R',full:'L'},  si: 'වඩිම්බුව', en: 'Fascia board', step: 1, at: new THREE.Vector3(FAS_T / 2, -4.5, 0) },
    { k: 'screw', views: {section:'R'},   si: 'සවි කිරීමේ ඉස්කුරුප්පු', en: 'Fixing screws', step: 3, at: screwAt[0] },
    { k: 'bolt', views: {section:'R'}, si: 'ඇණය සහ මුරිච්චිය', en: 'Bolt & square nut', step: 3, at: boltAt },
    { k: 'bracket', views: {section:'R'}, si: 'වැහිපීලි ආධාරකය', en: 'Gutter bracket', step: 3, at: new THREE.Vector3((bpath[1][0] + bpath[2][0]) / 2 + 0.1, (bpath[1][1] + bpath[2][1]) / 2, BRACKET_Z[0] + 0.5) },
    { k: 'gutter', views: {section:'R',full:'L'},  si: 'වැහිපීල්ල', en: 'Rain gutter', step: 2, at: new THREE.Vector3(FRONT_X - 0.6, gy + 2.2, -4) },
    { k: 'outlet', views: {full:'R'},  si: 'පිටවුම', en: 'Outlet', step: 5, at: new THREE.Vector3(OX + NOZ / 2, gy - 0.5, OUTLET_Z + NOZ / 2) },
    { k: 'pipe', views: {full:'R'},    si: 'ඩවුන් පයිප්ප', en: 'Down pipe', step: 5, at: new THREE.Vector3(XW + PIPE / 2, -48, OUTLET_Z + PIPE / 2) },
    { k: 'clip', views: {full:'R'},    si: 'පයිප්ප ක්ලිප්', en: 'Pipe clip', step: 5, at: clipAt[0] },
    { k: 'flow', views: {section:'L',full:'L'},    si: 'වැසි ජලය ගලන දිශාව', en: 'Rainwater flow', step: 6, at: onRoof(-15, zA, AMP + 1.4) },
  ];
  const labelBox = ui.labels, svg = ui.lines;
  LABELS.forEach((L, i) => {
    L.n = i + 1;
    L.el = document.createElement('div'); L.el.className = 'il il-' + L.k; L.el.hidden = true;
    L.el.innerHTML = `<i>${L.n}</i><span><b>${L.si}</b><em>${L.en}</em></span>`;
    labelBox.appendChild(L.el);
  });
  ui.legend.innerHTML = LABELS.map(L => `<li data-k="${L.k}"><i>${L.n}</i><b>${L.si}</b> <em>${L.en}</em></li>`).join('');

  // ---------- timeline ----------
  const STEP = 2.4, NSTEPS = 7;
  const END = NSTEPS * STEP;
  let t = Math.min(END, Math.max(0, opts.t ?? 0)), playing = opts.playing ?? true, stopAt = END, lastNow = performance.now();
  let labelsOn = opts.labels ?? true, arrowsOn = opts.arrows ?? true;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce){ t = stopAt; playing = false; }
  const ease = p => p < 0 ? 0 : p > 1 ? 1 : 1 - Math.pow(1 - p, 3);
  function applyTimeline(){
    for (const a of anim){
      const start = a.step * STEP + a.delay * STEP, p = (t - start) / (a.dur * STEP);
      a.obj.visible = p > 0;
      const e = ease(p);
      a.obj.position.copy(a.obj.userData.base).addScaledVector(a.from, 1 - e);
      if (a.spin && a.obj.userData.inner) a.obj.userData.inner.rotation.y = (1 - e) * a.spin;   // screw turning in
    }
    water.visible = t >= 6 * STEP;
    arrows.forEach(a => a.visible = arrowsOn);
    ui.onTime && ui.onTime(t / END, playing);
    const cur = Math.min(NSTEPS - 1, Math.floor(t / STEP + 1e-6));
    ui.onStep && ui.onStep(cur, playing);
    return cur;
  }

  // ---------- camera ----------
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08; controls.enablePan = true; controls.screenSpacePanning = true;   // slide the view sideways along the eave
  controls.minDistance = 20; controls.maxDistance = 400;
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  renderer.domElement.style.touchAction = 'pan-y';
  const VIEWS = {
    section: { box: new THREE.Box3(new THREE.Vector3(-12, -7, -3), new THREE.Vector3(7, 7.5, 0)), dir: new THREE.Vector3(0.32, 0.16, 1) },
    full:    { box: new THREE.Box3(new THREE.Vector3(-34, GROUND, -LEN), new THREE.Vector3(10, 16, 0)), dir: new THREE.Vector3(1.05, 0.42, 1.2) },
  };
  let view = 'section', userCam = false;
  const goal = { pos: new THREE.Vector3(), tgt: new THREE.Vector3() };
  function frame(name){
    const v = VIEWS[name], c = v.box.getCenter(new THREE.Vector3()), r = v.box.getSize(new THREE.Vector3()).length() / 2;
    const wide = stage.clientWidth >= 720, aspect = camera.aspect * (wide ? 0.56 : 1);
    const vf = camera.fov * DEG, hf = 2 * Math.atan(Math.tan(vf / 2) * aspect);
    const dist = r / Math.sin(Math.min(vf, hf) / 2) * (name === 'section' ? 0.92 : 0.8);
    goal.tgt.copy(c); goal.pos.copy(c).addScaledVector(v.dir.clone().normalize(), dist);
  }
  function setView(name, jump){ view = name; userCam = false; frame(name); if (jump){ camera.position.copy(goal.pos); controls.target.copy(goal.tgt); } ui.onView && ui.onView(name); }
  const stopAuto = () => { userCam = true; };
  renderer.domElement.addEventListener('pointerdown', stopAuto);
  renderer.domElement.addEventListener('wheel', stopAuto, { passive: true });

  function resize(){
    const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); frame(view);
    if (!userCam){ camera.position.copy(goal.pos); controls.target.copy(goal.tgt); }
  }
  const ro = new ResizeObserver(resize); ro.observe(stage);

  // ---------- label layout: side columns with leader lines (wide) or numbered markers + key (narrow) ----------
  const v3 = new THREE.Vector3();
  function layoutLabels(cur){
    const W = stage.clientWidth, H = stage.clientHeight, wide = W >= 720;
    labelBox.style.display = svg.style.display = labelsOn ? '' : 'none';
    if (!labelsOn){ for (const L of LABELS){ L.li = L.li || ui.legend.querySelector(`[data-k="${L.k}"]`); L.li.classList.toggle('off', t < (L.step + 0.55) * STEP || !L.views[view]); } return; }
    stage.classList.toggle('inst-wide', wide);
    const items = [];
    for (const L of LABELS){
      const on = t >= (L.step + 0.55) * STEP && !!L.views[view];
      L.li = L.li || ui.legend.querySelector(`[data-k="${L.k}"]`);
      L.li.classList.toggle('off', !on);
      if (!on){ L.el.hidden = true; continue; }
      v3.copy(L.at).project(camera);
      if (v3.z > 1 || Math.abs(v3.x) > 0.98 || Math.abs(v3.y) > 0.96){ L.el.hidden = true; continue; }
      items.push({ L, x: (v3.x + 1) / 2 * W, y: (1 - v3.y) / 2 * H });
    }
    let lines = '';
    if (wide){
      for (const side of ['L', 'R']){
        const col = items.filter(i => i.L.views[view] === side).sort((a, b) => a.y - b.y);
        col.forEach(i => { i.L.el.hidden = false; i.L.el.className = 'il il-' + i.L.k + ' il-side il-' + side; });
        const hs = col.map(i => i.L.el.offsetHeight), gap = 8;
        const tops = []; let y = 10;
        col.forEach((i, k) => { const top = Math.max(i.y - hs[k] / 2, y); tops.push(top); y = top + hs[k] + gap; });
        let over = (tops.length ? tops[tops.length - 1] + hs[hs.length - 1] : 0) - (H - 10);
        for (let k = tops.length - 1; k >= 0 && over > 0; k--){
          const room = k ? tops[k] - (tops[k - 1] + hs[k - 1] + gap) : tops[k] - 10;
          const mv = Math.min(over, Math.max(0, room)); for (let m = k; m < tops.length; m++) tops[m] -= mv; over -= mv;
        }
        col.forEach((i, k) => {
          const el = i.L.el, w = el.offsetWidth, top = tops[k];
          el.style.top = top + 'px'; el.style.left = side === 'L' ? '10px' : (W - 10 - w) + 'px';
          const lx = side === 'L' ? 10 + w : W - 10 - w, ly = top + hs[k] / 2;
          lines += `<path d="M${lx} ${ly} L${(lx + i.x) / 2} ${ly} L${i.x} ${i.y}"/><circle cx="${i.x}" cy="${i.y}" r="3.5"/>`;
        });
      }
    } else {
      const R = 13; items.sort((a, b) => a.y - b.y);
      const placed = [];
      for (const i of items){
        let x = i.x, y = i.y;
        const out = (x, y) => x < R + 2 || x > W - R - 2 || y < R + 2 || y > H - R - 2;
        const hit = (x, y) => out(x, y) || placed.some(p => Math.abs(p.x - x) < 2 * R + 3 && Math.abs(p.y - y) < 2 * R + 3);
        if (hit(x, y)){                                  // nudge to the nearest free spot (right, left, down, up)
          let best = null;
          for (let r = 6; r <= 90 && !best; r += 6)
            for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]])
              if (!best && !hit(x + dx * r, y + dy * r)) best = [x + dx * r, y + dy * r];
          if (best) [x, y] = best;
          x = Math.min(W - R - 2, Math.max(R + 2, x)); y = Math.min(H - R - 2, Math.max(R + 2, y));
        }
        placed.push({ x, y });
        const el = i.L.el; el.hidden = false; el.className = 'il il-' + i.L.k + ' il-dot';
        el.style.left = (x - R) + 'px'; el.style.top = (y - R) + 'px';
      }
    }
    svg.innerHTML = lines;
  }

  // ---------- loop ----------
  let visible = true;
  // on screen? measured directly (an observer can miss the change when the page jumps)
  let visCheck = 0;
  const onScreen = () => { const r = stage.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
  const io = { disconnect(){} };
  const m4 = new THREE.Matrix4(), pv = new THREE.Vector3();
  setView('section', true);
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.05, Math.max(0, (now - lastNow) / 1000)); lastNow = now;
    if (visCheck++ % 10 === 0) visible = onScreen();
    if (!visible){ lastNow = performance.now(); return; }
    if (playing){ t = Math.min(stopAt, t + dt); if (t >= stopAt) playing = false; }
    const cur = applyTimeline();
    if (!userCam){
      const want = cur >= 5 ? 'full' : 'section';
      if (want !== view && !ui.locked) { view = want; frame(view); ui.onView && ui.onView(view); }
      const k = 1 - Math.pow(0.02, dt);              // frame-rate independent ease (~1 s to settle)
      camera.position.lerp(goal.pos, k); controls.target.lerp(goal.tgt, k);
    }
    if (water.visible){
      const T0 = now / 1000;
      arrows.forEach((a, i) => { a.userData.mat.opacity = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(T0 * 4 - i * 0.7)); });
      if (!reduce){
        paths.forEach((P, i) => {
          const total = P.cum[P.cum.length - 1], s = ((T0 * 22 + P.t0 * total) % total);
          let k = 1; while (k < P.cum.length - 1 && P.cum[k] < s) k++;
          const f = (s - P.cum[k - 1]) / Math.max(1e-6, P.cum[k] - P.cum[k - 1]);
          pv.copy(P.pts[k - 1]).lerp(P.pts[k], f);
          drops.setMatrixAt(i, m4.makeTranslation(pv.x, pv.y, pv.z));
        });
        drops.instanceMatrix.needsUpdate = true;
        rainSeed.forEach(([x, ph, z], i) => {
          const top = sheetUnder(x) + 30, bot = sheetUnder(x) + AMP + 2.2, y = top - ((T0 * 0.9 + ph) % 1) * (top - bot);
          rainPos.set([x, y, z, x + 0.15, y + 2.2, z], i * 6);
        });
        rain.geometry.attributes.position.needsUpdate = true;
      } else { drops.visible = false; rain.visible = false; }
    }
    controls.update(); renderer.render(scene, camera);
    layoutLabels(cur);
    stage.dataset.view = view;                       // current view (also used by the page / tests)
  });

  if (opts.view) setView(opts.view, true);
  return {
    play(){ if (t >= END - 1e-3) t = 0; stopAt = END; playing = true; ui.locked = false; },
    pause(){ playing = false; },
    replay(){ t = 0; stopAt = END; playing = true; userCam = false; ui.locked = false; },
    toggle(){ playing ? this.pause() : this.play(); return playing; },
    goStep(k){ t = k * STEP; stopAt = (k + 1) * STEP; playing = true; userCam = false; ui.locked = false; },
    seek(f){ t = Math.min(END, Math.max(0, f * END)); playing = false; stopAt = END; },   // scrub like a video
    setView(name){ ui.locked = true; setView(name); },
    setLabels(on){ labelsOn = on; },
    setArrows(on){ arrowsOn = on; },
    state(){ return { t, playing, view, labels: labelsOn, arrows: arrowsOn }; },
    _debugCam(px, py, pz, tx, ty, tz){ userCam = true; camera.position.set(px, py, pz); controls.target.set(tx, ty, tz); },
    geometry(){ return { P1Y: P1.y, yb, fTop, fBot, PX, P2Y, FACE_BOTTOM, NOZ, OX,  gutter: GKEY, valance: VKEY, FAS_BOT, VAL_FACE, gx, gy, backTop, BL, BR, FRONT_X, SHEET_EDGE_X, sheetY: sheetUnder(SHEET_EDGE_X), bpath, vpts, gpts }; },
    get playing(){ return playing; },
    dispose(){
      renderer.setAnimationLoop(null); ro.disconnect(); controls.dispose();
      scene.traverse(o => { o.geometry?.dispose?.(); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m && !Object.values(M).includes(m) && m.dispose?.()); });
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
      labelBox.innerHTML = ''; svg.innerHTML = ''; ui.legend.innerHTML = '';
    }
  };
}
