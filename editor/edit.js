// A.D. Engineering — edit the live website in place (loaded only as index.html?edit=1, normally inside /editor/).
// Tap any text → it becomes editable → ✓ (or tap elsewhere / Enter) saves it for every visitor.
// Tap a photo → 📷 change it. Contact details save to the same settings the admin app uses; item names and
// descriptions save to the item itself. Saving needs an admin login (the database refuses anyone else).
(() => {
  'use strict';
  const CFG = window.AD_CONFIG || {}, URL0 = String(CFG.SUPABASE_URL || '').replace(/\/$/, ''), KEY = CFG.SUPABASE_KEY;
  const ED = window.AD_ED;
  if (!ED || !URL0) return;

  // ---------- login token: from the editor page around us, else the admin login saved in this browser ----------
  async function token(){
    try { if (window.parent !== window && window.parent.AD_EDITOR) { const t = await window.parent.AD_EDITOR.token(); if (t) return t; } } catch {}
    try { const s = JSON.parse(localStorage.getItem('ad-admin-auth') || 'null'); const t = s?.access_token || s?.currentSession?.access_token;
      if (t && (!s.expires_at || s.expires_at * 1000 > Date.now())) return t; } catch {}
    return null;
  }
  const rest = async (path, opts = {}) => {
    const t = await token(); if (!t) throw new Error('Login කරලා නැහැ · Not logged in');
    const r = await fetch(URL0 + '/rest/v1/' + path, { ...opts, headers: { apikey: KEY, Authorization: 'Bearer ' + t,
      'Content-Type': 'application/json', Prefer: 'return=minimal', ...(opts.headers || {}) } });
    if (!r.ok) throw new Error((await r.text()).slice(0, 160) || r.status);
    return r;
  };
  const tell = (msg, kind = 'ok') => {
    try { window.parent !== window && window.parent.AD_EDITOR?.status(msg, kind); } catch {}
    toast(msg, kind);
  };

  // ---------- look ----------
  const css = document.createElement('style');
  css.textContent = `
    body.ad-edit [data-ek], body.ad-edit [data-s], body.ad-edit [data-pf]{outline:1.5px dashed rgba(11,78,162,.45);outline-offset:2px;cursor:text;border-radius:3px;box-shadow:0 0 0 3.5px rgba(255,255,255,.35)}
    body.ad-edit [data-ek]:hover, body.ad-edit [data-s]:hover, body.ad-edit [data-pf]:hover{outline:2px solid #0b4ea2;background:rgba(11,78,162,.06)}
    body.ad-edit [data-ei]{outline:2px dashed rgba(227,30,36,.55);outline-offset:-2px;cursor:pointer}
    body.ad-edit .ad-editing{outline:2.5px solid #e31e24 !important;background:#fff8d6 !important;color:#111 !important;-webkit-text-fill-color:#111;min-width:2ch;display:inline-block}
    body.ad-edit .iv-desc[data-pf]:empty::before{content:'විස්තරයක් ලියන්න · Add a description';color:#98a2b3}
    .ad-bar{position:fixed;z-index:2147483000;display:flex;gap:6px;background:#05285a;padding:6px;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.3);font:600 14px/1 Inter,'Noto Sans Sinhala',sans-serif}
    .ad-bar button{border:0;border-radius:8px;padding:10px 12px;min-height:40px;font:inherit;cursor:pointer;color:#fff;background:#1a5fc0;white-space:nowrap}
    .ad-bar .ok{background:#16a34a}.ad-bar .no{background:#475467}.ad-bar .orig{background:#b42318}
    .ad-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:2147483001;background:#16a34a;color:#fff;padding:12px 18px;border-radius:12px;
      font:700 15px/1.3 Inter,'Noto Sans Sinhala',sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.25);max-width:92vw;text-align:center}
    .ad-toast.err{background:#b42318}
    .ad-toast{pointer-events:none}
    .ad-bar[hidden], .ad-toast[hidden], .ad-note[hidden]{display:none !important}
    .ad-note{position:fixed;inset:auto 12px 12px 12px;z-index:2147483001;background:#b42318;color:#fff;padding:14px;border-radius:12px;font:700 15px/1.4 Inter,'Noto Sans Sinhala',sans-serif;text-align:center}
    .ad-note a{color:#fff}`;
  document.head.appendChild(css);
  let tt;
  function toast(msg, kind){
    let el = document.querySelector('.ad-toast'); if (!el){ el = document.createElement('div'); el.className = 'ad-toast'; document.body.appendChild(el); }
    el.textContent = msg; el.classList.toggle('err', kind === 'err'); el.hidden = false;
    clearTimeout(tt); tt = setTimeout(() => el.hidden = true, kind === 'err' ? 6000 : 2200);
  }

  // ---------- floating buttons next to what is being edited ----------
  const bar = document.createElement('div'); bar.className = 'ad-bar'; bar.hidden = true; document.body.appendChild(bar);
  bar.addEventListener('mousedown', e => e.preventDefault());           // keep the text focused while pressing a button
  function showBar(el, buttons){
    bar.innerHTML = ''; buttons.forEach(([label, cls, fn]) => { const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.textContent = label;
      b.onclick = e => { e.preventDefault(); e.stopPropagation(); fn(); }; bar.appendChild(b); });
    bar.hidden = false; placeBar(el);
  }
  function placeBar(el){
    if (bar.hidden || !el) return;
    const r = el.getBoundingClientRect(), bw = bar.offsetWidth, bh = bar.offsetHeight;
    let top = r.top - bh - 8; if (top < 8) top = Math.min(r.bottom + 8, innerHeight - bh - 8);
    bar.style.top = top + 'px'; bar.style.left = Math.max(8, Math.min(r.left, innerWidth - bw - 8)) + 'px';
  }
  addEventListener('scroll', () => placeBar(cur?.el), true); addEventListener('resize', () => placeBar(cur?.el));

  // ---------- text ----------
  let cur = null;                                                        // { el, before }
  const plain = el => el.textContent.replace(/\s+/g, ' ').trim();
  function begin(el){
    if (cur?.el === el) return;
    if (cur) finish(true);
    cur = { el, before: el.innerHTML };
    el.contentEditable = 'true';                                         // Enter = save, Shift+Enter = new line
    el.classList.add('ad-editing'); el.spellcheck = false; el.focus();
    const sel = getSelection(), rg = document.createRange(); rg.selectNodeContents(el); rg.collapse(false); sel.removeAllRanges(); sel.addRange(rg);
    const btns = [['✓ Save', 'ok', () => finish(true)], ['✕', 'no', () => finish(false)]];
    if (el.dataset.ek) btns.push(['↺ මුල් එක', 'orig', () => original(el)]);
    showBar(el, btns);
  }
  function stop(el){ el.contentEditable = 'false'; el.removeAttribute('contenteditable'); el.classList.remove('ad-editing'); bar.hidden = true; }
  async function finish(save){
    if (!cur) return; const { el, before } = cur; cur = null; stop(el);
    if (!save){ el.innerHTML = before; return; }
    const html = ED.clean(el.innerHTML);
    if (html === ED.clean(before)) return;                               // nothing changed
    if (el.dataset.s) return saveSetting(el, before);
    if (el.dataset.pf) return saveProduct(el, before);
    if (!plain(el)){ el.innerHTML = before; return tell('හිස් කරන්න බැහැ — ↺ මුල් එක ඔබන්න · Text cannot be empty', 'err'); }
    el.innerHTML = html; ED.syncCount(el);
    try {
      if (html === ED.clean(ED.original(el))) await rest('site_texts?key=eq.' + encodeURIComponent(el.dataset.ek), { method: 'DELETE' });
      else await rest('site_texts?on_conflict=key', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ key: el.dataset.ek, value: html, updated_at: new Date().toISOString() }) });
      tell('✓ Save වුණා — site එකේ වෙනස් වුණා');
    } catch (err){ el.innerHTML = before; tell('Save වුණේ නැහැ: ' + err.message, 'err'); }
  }
  async function original(el){
    if (cur?.el === el){ cur = null; stop(el); }
    if (el.dataset.ei) bar.hidden = true;
    try { await rest((el.dataset.ei ? 'site_texts?key=eq.' + encodeURIComponent(el.dataset.ei) : 'site_texts?key=eq.' + encodeURIComponent(el.dataset.ek)), { method: 'DELETE' });
      ED.reset(el); if (el.dataset.ek) ED.syncCount(el); tell('↺ මුල් එක දැම්මා'); }
    catch (err){ tell('වුණේ නැහැ: ' + err.message, 'err'); }
  }

  // contact details, counters → settings (same as the admin app's Settings page)
  async function saveSetting(el, before){
    const col = el.dataset.s; let val = plain(el);
    if (['years', 'projects', 'warranty'].includes(col)){ val = val.replace(/\D/g, ''); if (!val){ el.innerHTML = before; return tell('අංකයක් දාන්න · Enter a number', 'err'); } }
    if (!val){ el.innerHTML = before; return tell('හිස් කරන්න බැහැ · Cannot be empty', 'err'); }
    try {
      await rest('settings?id=eq.1', { method: 'PATCH', body: JSON.stringify({ [col]: val, updated_at: new Date().toISOString() }) });
      if (col === 'phone_orders' || col === 'phone_owner'){
        const a = el.closest('a[href^="tel:"]'), old = a && a.getAttribute('href');
        if (old) document.querySelectorAll(`a[href="${old}"]`).forEach(x => { x.href = telHref(val); x.querySelectorAll('[data-s]').forEach(b => b.textContent = val); if (x.dataset.s) x.textContent = val; });
      } else if (el.dataset.count != null){ el.dataset.count = val; el.textContent = val + (el.dataset.suffix || ''); }
      else {
        el.textContent = val;
        if (col === 'email') el.href = 'mailto:' + val;
        if (col === 'shop_main' || col === 'shop_branch') el.href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(val);
      }
      tell('✓ Save වුණා (සැකසුම්) — site එකේ වෙනස් වුණා');
    } catch (err){ el.innerHTML = before; tell('Save වුණේ නැහැ: ' + err.message, 'err'); }
  }
  // item name / description (item view)
  async function saveProduct(el, before){
    const p = PRODUCTS.find(x => x.id == openId); if (!p){ el.innerHTML = before; return; }
    const f = el.dataset.pf, val = el.innerText.replace(/\n{3,}/g, '\n\n').trim();
    if (f === 'name' && !val){ el.innerHTML = before; return tell('නම හිස් කරන්න බැහැ · Name cannot be empty', 'err'); }
    try {
      await rest('products?id=eq.' + encodeURIComponent(p.id), { method: 'PATCH', body: JSON.stringify({ [f]: val }) });
      p[f] = val; el.textContent = val;
      if (f === 'name') document.querySelectorAll(`.prod[data-item="${p.id}"] h3`).forEach(h => h.textContent = val);
      tell('✓ Save වුණා — භාණ්ඩය වෙනස් වුණා');
    } catch (err){ el.innerHTML = before; tell('Save වුණේ නැහැ: ' + err.message, 'err'); }
  }

  // ---------- photos ----------
  const pick = document.createElement('input'); pick.type = 'file'; pick.accept = 'image/*'; pick.hidden = true; document.body.appendChild(pick);
  let imgEl = null;
  function beginImg(el){
    if (cur) finish(true);
    imgEl = el;
    showBar(el, [['📷 පින්තූරය මාරු කරන්න', '', () => pick.click()], ['↺ මුල් එක', 'orig', () => original(el)], ['✕', 'no', () => { bar.hidden = true; imgEl = null; }]]);
  }
  const resize = (file, max = 1600) => new Promise((ok, bad) => {
    const im = new Image(); im.onload = () => {
      const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas');
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      c.toBlob(b => b ? ok(b) : bad(new Error('image')), 'image/jpeg', 0.86); URL.revokeObjectURL(im.src);
    }; im.onerror = () => bad(new Error('පින්තූරය කියවන්න බැහැ · Cannot read the photo')); im.src = URL.createObjectURL(file);
  });
  pick.onchange = async () => {
    const file = pick.files[0], el = imgEl; pick.value = ''; bar.hidden = true; if (!file || !el) return;
    try {
      tell('Upload වෙනවා… · Uploading…');
      const blob = await resize(file), t = await token(); if (!t) throw new Error('Login කරලා නැහැ');
      const path = 'site/' + el.dataset.ei.replace(/[^a-z0-9]+/gi, '-') + '-' + Date.now() + '.jpg';
      const r = await fetch(URL0 + '/storage/v1/object/photos/' + path, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + t, 'Content-Type': 'image/jpeg', 'x-upsert': 'true' }, body: blob });
      if (!r.ok) throw new Error((await r.text()).slice(0, 160));
      const url = URL0 + '/storage/v1/object/public/photos/' + path;
      await rest('site_texts?on_conflict=key', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ key: el.dataset.ei, value: url, updated_at: new Date().toISOString() }) });
      ED.setImg(el, url); tell('✓ පින්තූරය මාරු වුණා');
    } catch (err){ tell('පින්තූරය මාරු වුණේ නැහැ: ' + err.message, 'err'); }
  };

  // ---------- taps: on something editable → edit it (links / buttons there do nothing); anywhere else → normal ----------
  function enable(){
  document.addEventListener('click', e => {
    if (bar.contains(e.target) || e.target === pick) return;          // the photo picker's own click is not a tap elsewhere
    const el = e.target.closest('[data-ek],[data-s],[data-pf],[data-ei]');
    if (!el){ if (cur) finish(true); if (imgEl && !bar.hidden){ bar.hidden = true; imgEl = null; } return; }
    e.preventDefault(); e.stopPropagation();
    if (el.dataset.ei) beginImg(el); else begin(el);
  }, true);
  document.addEventListener('keydown', e => {
    if (!cur) return;
    if (e.key === 'Escape'){ e.preventDefault(); finish(false); }
    else if (e.key === 'Enter' && !e.shiftKey && cur.el.dataset.pf !== 'description'){ e.preventDefault(); finish(true); }
  }, true);
  document.addEventListener('focusout', e => { if (cur && e.target === cur.el) setTimeout(() => { if (cur && document.activeElement !== cur.el) finish(true); }, 120); }, true);
  // paste: plain text only
  document.addEventListener('paste', e => { if (!cur) return; e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain')); }, true);
  }

  // ---------- start ----------
  (async () => {
    if (!(await token())){
      const n = document.createElement('div'); n.className = 'ad-note';
      n.innerHTML = 'Edit කරන්න පළමුව login වෙන්න · <a href="editor/">Login → /editor/</a>'; document.body.appendChild(n); return;
    }
    enable(); document.body.classList.add('ad-edit');
    try { window.parent !== window && window.parent.AD_EDITOR?.ready(); } catch {}
  })();
})();
