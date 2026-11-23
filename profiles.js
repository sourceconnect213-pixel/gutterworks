// Gutter cross-sections from the owner's measurement sketches (units: inches).
// Each design is a list of moves along the sheet, starting at the tip of the back
// (left) top fold:  'L','R','U','D' = left/right/up/down, or [dx,dy] for a slope.
// The label IS the length ('2¾' → 2.75), so a number is written only once.
// Used by the 2D drawing (profileSVG) and the 3D model (gutter3d.js).
(() => {
const FR = { '': 0, '¼': .25, '½': .5, '¾': .75 };
const num = s => { const m = String(s).match(/^(\d*)([¼½¾]?)$/); if (!m) throw new Error('bad length ' + s); return (+m[1] || 0) + FR[m[2]]; };
const DIRS = { L: [-1, 0], R: [1, 0], U: [0, 1], D: [0, -1] };

// moves: [dir, '2¾']  or  [dir, number, null]  (unlabelled part, e.g. a kink)
function build(def){
  let x = 0, y = 0; const pts = [[0, 0]], labels = [];
  for (const [d, len, lab] of def.moves){
    const L = typeof len === 'number' ? len : num(len);
    let [dx, dy] = Array.isArray(d) ? d : DIRS[d];
    const m = Math.hypot(dx, dy); dx /= m; dy /= m;
    x += dx * L; y += dy * L; pts.push([x, y]);
    labels.push(lab === undefined ? len : lab);
  }
  const minX = Math.min(...pts.map(p => p[0])), minY = Math.min(...pts.map(p => p[1]));
  return { ...def, points: pts.map(([a, b]) => [a - minX, b - minY]), labels };
}

const PROFILES = {
  gutter12: build({ title: '12" Step Gutter', sheet: 12, moves: [
    ['L','¼'], ['D','¾'], ['R','½'], ['D','1½'], ['R','½'], ['D','1½'], ['R','½'], ['D','½'],
    ['R','3'], ['U','2¾'], ['L','¼'] ] }),
  box12: build({ title: '12" Box Gutter', sheet: 12, moves: [
    ['L','¼'], ['D', 2, null], [[1,-1], 0.2121, null], [[-0.25,-0.4], 0.4717, null], ['D', 1.8162, null],
    ['R','3½'], ['U','3½'], ['L','¼'] ],
    spans: [{ from: 1, to: 4, text: '4½' }] }),          // the back wall is 4½ in total, with a small kink
  g18a: build({ title: '18" Gutter · මෝස්තර 1', sheet: 18, moves: [
    ['L','¼'], ['D','¾'], ['R','¾'], ['D','2¾'], ['R','¾'], ['D','½'], ['R','¼'], ['D','2'], ['R','½'], ['D','½'],
    ['R','4¼'], ['U','4'], ['L','¾'] ] }),
  g18b: build({ title: '18" Gutter · මෝස්තර 2', sheet: 18, moves: [
    ['L','¼'], ['D','1'], ['R','¾'], ['D','2½'], ['R','1'], ['D','3½'],
    ['R','4½'], ['U','4'], ['L','½'] ] }),
  g18c: build({ title: '18" Gutter · මෝස්තර 3', sheet: 18, moves: [
    ['L','¼'], ['D','¾'], ['R','½'], ['D','¾'], ['R','½'], ['D','4½'], ['R','¾'], ['D','¾'],
    ['R','4½'], ['U','4¼'], ['L','½'] ] }),
  g18d: build({ title: '18" Gutter · මෝස්තර 4', sheet: 18, moves: [
    ['L','½'], ['D','4'], ['R','¾'], ['D','¾'], ['R','½'], ['D','¾'], ['R','¾'], ['D','½'],
    ['R','4½'], ['U','4¼'], ['L','¾'] ] }),
  g18e: build({ title: '18" Gutter · මෝස්තර 5', sheet: 18, moves: [
    ['L','¼'], ['D','½'], ['R','½'], ['D','½'], ['R','½'], ['D','1¾'], [[-0.38,-0.92],'½'], ['D','2¼'], [[1,-1],'1½'],
    ['R','4½'], ['U','4'], ['L','¾'] ] }),
};

const fmt = n => {
  const w = Math.floor(n + 1e-9), f = Math.round((n - w) * 4);
  if (f === 4) return String(w + 1);
  return (w ? String(w) : '') + ['', '¼', '½', '¾'][f] || '0';
};

// ---------- label placement (shared by 2D and 3D) ----------
// Label box size in inches. Each label sits beside its own part, on the outside of
// the gutter; short flat steps are labelled on the inside. Then labels are pushed
// out step by step until none touches the sheet or another label.
const LH0 = 0.34, CW0 = 0.2, PADW0 = 0.1, GAP = 0.1;
// bigger gutters get bigger numbers, so they read the same size on screen
const scaleOf = P => { const xs = P.points.map(p => p[0]), ys = P.points.map(p => p[1]);
  return Math.max(1, Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 4.5); };

function layout(key){
  const P = PROFILES[key]; if (!P) return null;
  const k0 = scaleOf(P), LH = LH0 * k0, boxW = t => String(t).length * CW0 * k0 + PADW0 * k0;
  const pts = P.points, segs = [];
  for (let i = 1; i < pts.length; i++){
    const [x1, y1] = pts[i-1], [x2, y2] = pts[i], len = Math.hypot(x2-x1, y2-y1);
    segs.push({ x1, y1, x2, y2, len, ux: (x2-x1)/len, uy: (y2-y1)/len });
  }
  const items = [];
  segs.forEach((s, i) => {
    const text = P.labels[i]; if (!text) return;
    const flat = Math.abs(s.uy) < 1e-6, endFold = i === 0 || i === segs.length - 1;
    const k = flat && s.len < 1 && !endFold ? -1 : 1;
    items.push({ text, mx: (s.x1+s.x2)/2, my: (s.y1+s.y2)/2, nx: k*s.uy, ny: -k*s.ux, ux: s.ux, uy: s.uy, seg: i });
  });
  (P.spans || []).forEach(sp => {
    const a = pts[sp.from], b = pts[sp.to + 1], s = segs[sp.from];
    items.push({ text: sp.text, mx: (a[0]+b[0])/2, my: (a[1]+b[1])/2, nx: s.uy, ny: -s.ux, ux: s.ux, uy: s.uy, seg: sp.from, span: sp });
  });

  const segHits = (cx, cy, w, h, skip) => segs.some((s, i) => {
    if (skip && skip.includes(i)) return false;
    for (let t = 0; t <= 1.0001; t += 0.05){
      const px = s.x1 + (s.x2-s.x1)*t, py = s.y1 + (s.y2-s.y1)*t;
      if (Math.abs(px - cx) < w/2 + 0.05 && Math.abs(py - cy) < h/2 + 0.05) return true;
    }
    return false;
  });
  const placed = [];
  const boxHits = (cx, cy, w, h) => placed.some(o => Math.abs(o.x - cx) < (o.w + w)/2 + 0.04 && Math.abs(o.y - cy) < (o.h + h)/2 + 0.04);

  for (const it of items){
    const w = boxW(it.text), h = LH;
    // distance from the line to the box edge, along the normal
    // try spots from closest to furthest: preferred side first, then the other side, sliding a little along the part
    const cands = [];
    for (const side of [1, -1]){
      const nx = it.nx * side, ny = it.ny * side;
      const base = Math.abs(nx) * w/2 + Math.abs(ny) * h/2 + GAP;
      for (let extra = 0; extra <= 1.6; extra += 0.05)
        for (const sl of [0, 0.12, -0.12, 0.25, -0.25])
          cands.push({ cost: extra + Math.abs(sl) * 0.6 + (side < 0 ? 0.18 : 0) + (it.span && side < 0 ? 9 : 0),
                       x: it.mx + nx*(base+extra) + it.ux*sl*k0, y: it.my + ny*(base+extra) + it.uy*sl*k0, nx, ny });
    }
    cands.sort((p, q) => p.cost - q.cost);
    let best = cands.find(c => !segHits(c.x, c.y, w, h) && !boxHits(c.x, c.y, w, h)) || cands[cands.length - 1];
    it.nx = best.nx; it.ny = best.ny;
    placed.push({ text: it.text, x: best.x, y: best.y, w, h, seg: it.seg, nx: it.nx, ny: it.ny, span: it.span });
  }

  const xs = pts.map(p => p[0]).concat(placed.flatMap(l => [l.x - l.w/2, l.x + l.w/2]));
  const ys = pts.map(p => p[1]).concat(placed.flatMap(l => [l.y - l.h/2, l.y + l.h/2]));
  let girth = 0; segs.forEach(s => girth += s.len);
  const pxs = pts.map(p => p[0]), pys = pts.map(p => p[1]);
  return {
    pts, segs, labels: placed, girth, scale: k0,
    width: Math.max(...pxs) - Math.min(...pxs), height: Math.max(...pys) - Math.min(...pys),
    bbox: { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }
  };
}

function profileSVG(key){
  const P = PROFILES[key], Lo = layout(key); if (!Lo) return '';
  const S = 46, pad = 10, note = 26 * Lo.scale;
  const { minX, maxX, minY, maxY } = Lo.bbox;
  const W = (maxX - minX) * S + pad*2, H = (maxY - minY) * S + pad*2 + note;
  const X = x => (x - minX) * S + pad, Y = y => (maxY - y) * S + pad;
  const path = Lo.pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(' ');
  const fs = 14 * Lo.scale;
  const labs = Lo.labels.map(l => `<text x="${X(l.x).toFixed(1)}" y="${(Y(l.y) + fs * 0.36).toFixed(1)}" style="font-size:${fs.toFixed(1)}px">${l.text}</text>`).join('');
  return `
  <svg class="prof-svg" viewBox="0 0 ${W.toFixed(0)} ${H.toFixed(0)}" role="img" aria-label="${P.title} — මිනුම්">
    <path d="${path}" class="prof-in"/>
    <path d="${path}" class="prof-line"/>
    ${labs}
    <text class="prof-note" style="font-size:${(11 * Lo.scale).toFixed(1)}px" x="${(W/2).toFixed(0)}" y="${(H - 8).toFixed(0)}">තහඩුව ${fmt(Lo.girth)}" · පළල ${fmt(Lo.width)}" · උස ${fmt(Lo.height)}" (අඟල්)</text>
  </svg>`;
}

window.AD_PROFILES = PROFILES; window.profileSVG = profileSVG; window.profileLayout = layout; window.fmtInch = fmt;
})();
