// Builds the web version of the admin app into /admin (served by GitHub Pages).
const fs = require('fs'), path = require('path');
require('./prepare-web.js');
const www = path.join(__dirname, '..', 'www'), out = path.join(__dirname, '..', '..', 'admin');
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
for (const f of fs.readdirSync(www)) fs.copyFileSync(path.join(www, f), path.join(out, f));
// web-only: use the site's shared config so key changes apply everywhere
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({
  name: 'A.D. Engineering Admin', short_name: 'AD Admin', start_url: './', display: 'standalone',
  background_color: '#ffffff', theme_color: '#05285a',
  icons: [{ src: 'icon-512.png', sizes: '512x512', type: 'image/png' }, { src: 'icon-192.png', sizes: '192x192', type: 'image/png' }]
}, null, 2));
let html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
html = html.replace('<link rel="stylesheet" href="app.css">',
  '<link rel="manifest" href="manifest.json">\n<link rel="icon" href="icon-192.png">\n<link rel="apple-touch-icon" href="icon-192.png">\n<meta name="robots" content="noindex">\n<link rel="stylesheet" href="app.css">');
fs.writeFileSync(path.join(out, 'index.html'), html);
console.log('web admin built →', out);
