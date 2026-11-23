// Cross-section drawings with measurements, shown on item cards (📏 මිනුම්).
// Units: inches. Points walk along the sheet; each segment has its measured length label.
// Outside of the gutter is on the right-hand side of the walking direction.
(() => {
const PROFILES = {
  // 12" gutter — from the hand-drawn measurement sketch (girth = 12")
  gutter12: {
    title: '12" වැහිපීලි හරස්කඩ',
    points: [
      [-1.25, 4.25], [-1.5, 4.25],   // ¼ top fold
      [-1.5, 3.5],                   // ¾
      [-1.0, 3.5],                   // ½ step
      [-1.0, 2.0],                   // 1½
      [-0.5, 2.0],                   // ½ step
      [-0.5, 0.5],                   // 1½
      [0, 0.5],                      // ½ step
      [0, 0],                        // ½
      [3, 0],                        // 3  (bottom)
      [3, 2.75],                     // 2¾ (plain side)
      [2.75, 2.75]                   // ¼ top fold
    ],
    labels: ['¼', '¾', '½', '1½', '½', '1½', '½', '½', '3', '2¾', '¼'],
    inside: [6]          // label these segments on the inside so they don't overlap
  }
};

const fmt = n => {
  const w = Math.floor(n + 1e-9), f = Math.round((n - w) * 4);
  const fr = ['', '¼', '½', '¾'][f] || '';
  return (w ? w : '') + fr || '0';
};

function profileSVG(key){
  const P = PROFILES[key]; if (!P) return '';
  const pts = P.points;
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), maxY = Math.max(...ys);
  const S = 46, pad = 34;                       // px per inch, padding for labels
  const W = (maxX - minX) * S + pad * 2, H = maxY * S + pad * 2 + 18;
  const X = x => (x - minX) * S + pad, Y = y => (maxY - y) * S + pad;
  let girth = 0, segs = '', labs = '';
  for (let i = 1; i < pts.length; i++){
    const [x1, y1] = pts[i-1], [x2, y2] = pts[i];
    const len = Math.hypot(x2 - x1, y2 - y1); girth += len;
    const k = (P.inside || []).includes(i-1) ? -1 : 1;
    const nx = k * (y2 - y1) / len, ny = -k * (x2 - x1) / len;      // outside normal (or inside)
    const mx = (X(x1) + X(x2)) / 2 + nx * 15, my = (Y(y1) + Y(y2)) / 2 - ny * 15 + 4;
    labs += `<text x="${mx.toFixed(1)}" y="${my.toFixed(1)}">${P.labels[i-1] ?? fmt(len)}</text>`;
  }
  const path = pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(' ');
  const w = maxX - minX, h = maxY;
  return `
  <svg class="prof-svg" viewBox="0 0 ${W.toFixed(0)} ${H.toFixed(0)}" role="img" aria-label="${P.title}">
    <path d="${path}" class="prof-in"/>
    <path d="${path}" class="prof-line"/>
    ${labs}
    <text class="prof-note" x="${(W/2).toFixed(0)}" y="${(H - 6).toFixed(0)}">තහඩුව ${fmt(girth)}" · පළල ${fmt(w)}" · උස ${fmt(h)}" (අඟල්)</text>
  </svg>`;
}
window.AD_PROFILES = PROFILES; window.profileSVG = profileSVG;
})();
