/* A.D. Engineering — Admin app */
(() => {
  const saved = JSON.parse(localStorage.getItem('ad-admin-cfg') || 'null');
  const CFG = (window.AD_CONFIG && window.AD_CONFIG.SUPABASE_URL) ? window.AD_CONFIG : (saved || {});
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const show = id => ['login','noconfig','app'].forEach(x => $('#'+x).hidden = x !== id);

  if (!CFG.SUPABASE_URL || !CFG.SUPABASE_KEY || !window.supabase) {
    show('noconfig');
    document.getElementById('cfg-form').onsubmit = e => {
      e.preventDefault();
      const url = document.getElementById('cfg-url').value.trim().replace(/\/+$/,''), key = document.getElementById('cfg-key').value.trim();
      if (!/^https:\/\/.+/.test(url)) { alert('URL එක https:// වලින් පටන් ගන්න ඕන'); return; }
      localStorage.setItem('ad-admin-cfg', JSON.stringify({SUPABASE_URL:url, SUPABASE_KEY:key}));
      location.reload();
    };
    return;
  }
  const sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'ad-admin-auth' }
  });

  // ---------- helpers ----------
  let toastT;
  function toast(msg, bad){ const t=$('#toast'); t.textContent=msg; t.classList.toggle('bad',!!bad); t.classList.add('show'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('show'), 2600); }
  const fail = (e, what='') => { console.error(e); toast((what?what+': ':'') + (e?.message || 'Error'), true); };
  const money = n => 'Rs. ' + Number(n).toLocaleString('en-LK', {maximumFractionDigits:2});
  const ago = iso => {
    const d=new Date(iso), s=(Date.now()-d)/1000;
    if (s<60) return 'දැන්'; if (s<3600) return Math.floor(s/60)+' min'; if (s<86400) return Math.floor(s/3600)+' h';
    return d.toLocaleDateString('en-GB',{day:'numeric',month:'short'}) + ' ' + d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  };
  // "Rs. 2,100.50" → 2100.5 ; empty → null
  const num = s => { const t = String(s||'').replace(/rs\.?/ig,'').replace(/[^\d.]/g,''); return t === '' || isNaN(+t) ? null : +t; };
  const digits = s => String(s||'').replace(/\D/g,'');
  const intl = s => { const d=digits(s); return d.startsWith('94') ? d : '94' + d.replace(/^0/,''); };
  const CAT = {gutter:'වැහිපීලි', ceiling:'සිවිලිම්', roofing:'වහල', other:'වෙනත්'};

  // Resize an image file in the browser → JPEG Blob
  function resize(file, max, q=0.82){
    return new Promise((res, rej) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width*k); c.height = Math.round(img.height*k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(b => b ? res(b) : rej(new Error('Image error')), 'image/jpeg', q);
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Cannot read image')); };
      img.src = url;
    });
  }
  async function upload(blob, folder){
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.jpg`;
    const { error } = await sb.storage.from('photos').upload(path, blob, { contentType:'image/jpeg', cacheControl:'31536000' });
    if (error) throw error;
    return { path, url: sb.storage.from('photos').getPublicUrl(path).data.publicUrl };
  }
  const removeFiles = paths => { paths = paths.filter(Boolean); return paths.length ? sb.storage.from('photos').remove(paths) : null; };

  // ---------- auth ----------
  const setPwVisible = on => {
    $('#l-pass').type = on ? 'text' : 'password';
    $('#pw-show').checked = on; $('#pw-eye').classList.toggle('on', on);
    $('#pw-eye').textContent = on ? '🙈' : '👁';
    $('#pw-eye').setAttribute('aria-label', on ? 'Hide password' : 'Show password');
  };
  $('#pw-eye').onclick = () => setPwVisible($('#l-pass').type === 'password');
  $('#pw-show').onchange = e => setPwVisible(e.target.checked);
  $('#login-form').onsubmit = async e => {
    e.preventDefault();
    const btn = e.target.querySelector('button'); btn.disabled = true; $('#l-err').textContent = '';
    const { error } = await sb.auth.signInWithPassword({ email: $('#l-email').value.trim(), password: $('#l-pass').value });
    btn.disabled = false;
    if (error) { $('#l-err').textContent = 'Login failed: ' + error.message; return; }
    start();
  };
  $('#logout').onclick = async () => { if (!confirm('Logout කරන්නද?')) return; await sb.auth.signOut(); show('login'); };

  async function start(){
    const { data } = await sb.auth.getSession();
    if (!data.session) { show('login'); return; }
    const { data: ok } = await sb.rpc('is_admin');
    if (!ok) { await sb.auth.signOut(); show('login'); $('#l-err').textContent = 'මේ email එකට admin අවසර නැහැ.'; return; }
    show('app'); openTab(current);
  }

  // ---------- tabs ----------
  const TITLES = {requests:'ඉල්ලීම් · Requests', items:'භාණ්ඩ · Items', prices:'මිල ගණන් · Prices', photos:'Photos', settings:'සැකසුම් · Settings'};
  const LOAD = {requests:loadRequests, items:loadItems, prices:loadPrices, photos:loadPhotos, settings:loadSettings};
  let current = 'requests';
  function openTab(t){
    current = t;
    $$('.bottom button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
    $$('.tab').forEach(s => s.hidden = s.id !== 'tab-'+t);
    $('#page-title').textContent = TITLES[t];
    window.scrollTo(0,0);
    LOAD[t]();
  }
  $$('.bottom button').forEach(b => b.onclick = () => openTab(b.dataset.tab));
  $('#refresh').onclick = () => { LOAD[current](); updateBadge(); };

  // ---------- requests ----------
  let reqStatus = 'new';
  $('#req-filter').onclick = e => { const b=e.target.closest('.chip'); if(!b) return; $$('#req-filter .chip').forEach(x=>x.classList.toggle('on',x===b)); reqStatus=b.dataset.s; loadRequests(); };
  async function updateBadge(){
    const { count } = await sb.from('requests').select('id', { count:'exact', head:true }).eq('status','new');
    $('#badge').hidden = !count; $('#badge').textContent = count || ''; $('#cnt-new').textContent = count || '';
  }
  async function loadRequests(){
    const box = $('#req-list'); box.innerHTML = '<div class="loading">Loading…</div>';
    let q = sb.from('requests').select('*').order('created_at', { ascending:false }).limit(200);
    if (reqStatus !== 'all') q = q.eq('status', reqStatus);
    const { data, error } = await q;
    if (error) { box.innerHTML=''; return fail(error, 'Requests'); }
    updateBadge();
    if (!data.length) { box.innerHTML = '<div class="empty"><i>📭</i>ඉල්ලීම් නැහැ</div>'; return; }
    const ST = {new:'New', contacted:'කතා කළා', done:'අවසන්'};
    box.innerHTML = data.map((r,i) => `
      <div class="card req" style="animation-delay:${Math.min(i,10)*30}ms">
        <div class="rh"><div><b>${esc(r.name)}</b> <span class="status ${r.status}">${ST[r.status]}</span></div><span class="when">${ago(r.created_at)}</span></div>
        ${r.service ? `<span class="svc">${esc(r.service)}</span>` : ''}
        <div class="meta">📞 ${esc(r.phone)}${r.location ? ' · 📍 '+esc(r.location) : ''}</div>
        ${r.details ? `<div class="det">${esc(r.details)}</div>` : ''}
        <div class="acts">
          <a class="btn sm primary" href="tel:${esc(r.phone)}">📞 Call</a>
          <a class="btn sm green" href="https://wa.me/${intl(r.phone)}" target="_blank">WhatsApp</a>
          ${r.status!=='contacted' && r.status!=='done' ? `<button class="btn sm ghost" data-st="contacted" data-id="${r.id}">කතා කළා</button>` : ''}
          ${r.status!=='done' ? `<button class="btn sm ghost" data-st="done" data-id="${r.id}">✓ අවසන්</button>` : ''}
          <button class="btn sm danger" data-del="${r.id}">🗑</button>
        </div>
      </div>`).join('');
  }
  $('#req-list').onclick = async e => {
    const st = e.target.closest('[data-st]'), del = e.target.closest('[data-del]');
    if (st) {
      const { error } = await sb.from('requests').update({ status: st.dataset.st }).eq('id', st.dataset.id);
      if (error) return fail(error); toast('✓ Updated'); loadRequests();
    } else if (del) {
      if (!confirm('මේ ඉල්ලීම මකන්නද?')) return;
      const { error } = await sb.from('requests').delete().eq('id', del.dataset.del);
      if (error) return fail(error); toast('Deleted'); loadRequests();
    }
  };

  // ---------- sheet (add/edit form) ----------
  let sheetSave = null, sheetDelete = null;
  function openSheet(title, html, onSave, onDelete){
    $('#sheet-title').textContent = title; $('#sheet-body').innerHTML = html;
    sheetSave = onSave; sheetDelete = onDelete;
    $('#sheet-del').hidden = !onDelete; $('#sheet-bg').hidden = false;
  }
  const closeSheet = () => { $('#sheet-bg').hidden = true; };
  $('#sheet-close').onclick = closeSheet;
  $('#sheet-bg').onclick = e => { if (e.target.id === 'sheet-bg') closeSheet(); };
  $('#sheet').onsubmit = async e => {
    e.preventDefault();
    const btn = e.target.querySelector('[type=submit]'); btn.disabled = true; const old = btn.innerHTML; btn.innerHTML = '<span class="spin"></span>';
    try { await sheetSave(new FormData(e.target)); closeSheet(); toast('✓ Saved'); }
    catch (err) { fail(err, 'Save'); }
    finally { btn.disabled = false; btn.innerHTML = old; }
  };
  $('#sheet-del').onclick = async () => {
    if (!confirm('මකන්නද? · Delete?')) return;
    try { await sheetDelete(); closeSheet(); toast('Deleted'); } catch (err) { fail(err, 'Delete'); }
  };
  $$('.fab').forEach(f => f.onclick = () => f.dataset.new === 'item' ? editItem() : editPrice());

  // ---------- items ----------
  let ITEMS = [];
  async function loadItems(){
    const box = $('#item-list'); box.innerHTML = '<div class="loading">Loading…</div>';
    const { data, error } = await sb.from('products').select('*').order('sort').order('created_at', { ascending:false });
    if (error) { box.innerHTML=''; return fail(error, 'Items'); }
    ITEMS = data;
    box.innerHTML = data.length ? data.map((p,i) => `
      <div class="card item" data-id="${p.id}" style="animation-delay:${Math.min(i,10)*30}ms">
        <div class="th" style="${p.image_url ? `background-image:url('${esc(p.image_url)}')` : ''}">${p.image_url ? '' : '📦'}</div>
        <div class="info"><b>${esc(p.name)}</b>
          <small>${esc(CAT[p.category]||p.category)}${p.unit ? ' · '+esc(p.unit) : ''}</small><br>
          <span class="pr">${p.price!=null ? money(p.price) : 'මිල සඳහා අමතන්න'}</span>
          <span class="tag ${p.in_stock?'':'out'}">${p.in_stock?'තොගයේ ඇත':'තොගය නැත'}</span>
        </div>
      </div>`).join('') : '<div class="empty"><i>📦</i>භාණ්ඩ නැහැ. ＋ ඔබලා එකතු කරන්න.<br><small>තොගයේ ඇති භාණ්ඩ විතරක් website එකේ පෙන්වයි.</small></div>';
  }
  $('#item-list').onclick = e => { const c = e.target.closest('.item'); if (c) editItem(ITEMS.find(x => x.id == c.dataset.id)); };

  function editItem(p = {}){
    const isNew = !p.id;
    openSheet(isNew ? 'අලුත් භාණ්ඩයක්' : 'භාණ්ඩය වෙනස් කරන්න', `
      <div class="img-pick">
        <div class="th" id="it-th" style="${p.image_url ? `background-image:url('${esc(p.image_url)}')` : ''}">${p.image_url ? '' : '📷'}</div>
        <label class="btn ghost">Photo තෝරන්න<input type="file" name="image" accept="image/*" hidden id="it-img"></label>
      </div>
      <label>නම · Name *<input name="name" required value="${esc(p.name)}"></label>
      <label>විස්තරය · Description<textarea name="description" rows="2">${esc(p.description)}</textarea></label>
      <div class="row2">
        <label>මිල (Rs.)<input name="price" inputmode="decimal" placeholder="හිස් = අමතන්න" value="${p.price ?? ''}"></label>
        <label>ඒකකය · Unit<input name="unit" placeholder="per foot" value="${esc(p.unit)}"></label>
      </div>
      <div class="row2">
        <label>වර්ගය<select name="category">${Object.entries(CAT).map(([k,v]) => `<option value="${k}" ${p.category===k?'selected':''}>${v}</option>`).join('')}</select></label>
        <label>පිළිවෙල · Order<input name="sort" inputmode="numeric" value="${p.sort ?? 0}"></label>
      </div>
      <div class="switch">තොගයේ ඇත · In stock (website එකේ පෙන්වන්න)<input type="checkbox" name="in_stock" ${p.in_stock!==false?'checked':''}></div>`,
      async fd => {
        const row = {
          name: fd.get('name').trim(), description: fd.get('description').trim(),
          price: num(fd.get('price')),
          unit: fd.get('unit').trim(), category: fd.get('category'), sort: parseInt(fd.get('sort'),10) || 0,
          in_stock: fd.get('in_stock') === 'on'
        };
        const file = fd.get('image');
        if (file && file.size) { const up = await upload(await resize(file, 1000), 'items'); row.image_url = up.url; }
        const { error } = isNew ? await sb.from('products').insert(row) : await sb.from('products').update(row).eq('id', p.id);
        if (error) throw error;
        if (row.image_url && p.image_url) removeFiles([pathOf(p.image_url)]);
        loadItems();
      },
      isNew ? null : async () => {
        const { error } = await sb.from('products').delete().eq('id', p.id); if (error) throw error;
        if (p.image_url) removeFiles([pathOf(p.image_url)]);
        loadItems();
      });
    $('#it-img').onchange = e => { const f=e.target.files[0]; if(f){ const th=$('#it-th'); th.style.backgroundImage=`url('${URL.createObjectURL(f)}')`; th.textContent=''; } };
  }
  const pathOf = url => { const m = String(url||'').match(/\/object\/public\/photos\/(.+)$/); return m ? decodeURIComponent(m[1]) : null; };

  // ---------- prices ----------
  let PRICES = [];
  async function loadPrices(){
    const box = $('#price-list'); box.innerHTML = '<div class="loading">Loading…</div>';
    const { data, error } = await sb.from('prices').select('*').order('sort').order('created_at');
    if (error) { box.innerHTML=''; return fail(error, 'Prices'); }
    PRICES = data;
    box.innerHTML = data.length ? data.map((x,i) => `
      <div class="card item" data-id="${x.id}" style="animation-delay:${Math.min(i,10)*30}ms">
        <div class="th">🏷️</div>
        <div class="info"><b>${esc(x.title)}</b><small>${esc(x.detail)}</small></div>
        <div style="text-align:right"><span class="pr">${esc(x.price)}</span><br><small style="color:var(--muted)">${esc(x.unit)}</small></div>
      </div>`).join('') : '<div class="empty"><i>🏷️</i>මිල ගණන් නැහැ. ＋ ඔබලා එකතු කරන්න.</div>';
  }
  $('#price-list').onclick = e => { const c = e.target.closest('.item'); if (c) editPrice(PRICES.find(x => x.id == c.dataset.id)); };
  function editPrice(x = {}){
    const isNew = !x.id;
    openSheet(isNew ? 'අලුත් මිලක්' : 'මිල වෙනස් කරන්න', `
      <label>සේවාව / භාණ්ඩය *<input name="title" required value="${esc(x.title)}" placeholder="උදා: අමානෝ වැහිපීලි සවිකිරීම"></label>
      <label>විස්තරය<input name="detail" value="${esc(x.detail)}" placeholder="උදා: 5 inch, colour coated"></label>
      <div class="row2">
        <label>මිල *<input name="price" required value="${esc(x.price)}" placeholder="Rs. 1,450"></label>
        <label>ඒකකය<input name="unit" value="${esc(x.unit)}" placeholder="per foot"></label>
      </div>
      <label>පිළිවෙල · Order<input name="sort" inputmode="numeric" value="${x.sort ?? 0}"></label>`,
      async fd => {
        const row = { title: fd.get('title').trim(), detail: fd.get('detail').trim(), price: fd.get('price').trim(), unit: fd.get('unit').trim(), sort: parseInt(fd.get('sort'),10) || 0 };
        const { error } = isNew ? await sb.from('prices').insert(row) : await sb.from('prices').update(row).eq('id', x.id);
        if (error) throw error; loadPrices();
      },
      isNew ? null : async () => { const { error } = await sb.from('prices').delete().eq('id', x.id); if (error) throw error; loadPrices(); });
  }

  // ---------- photos ----------
  let phCat = 'gutter';
  $('#ph-cat').onclick = e => { const b=e.target.closest('button'); if(!b) return; $$('#ph-cat button').forEach(x=>x.classList.toggle('on',x===b)); phCat=b.dataset.c; };
  $('#ph-input').onchange = async e => {
    const files = [...e.target.files]; e.target.value = '';
    if (!files.length) return;
    const st = $('#ph-status'); let done = 0, bad = 0;
    for (const f of files) {
      st.textContent = `Uploading ${done+bad+1} / ${files.length}…`;
      try {
        const [full, thumb] = await Promise.all([resize(f, 1400), resize(f, 560, .72)]);
        const a = await upload(full, 'gallery'), b = await upload(thumb, 'gallery/thumbs');
        const { error } = await sb.from('photos').insert({ url:a.url, thumb_url:b.url, path:a.path, thumb_path:b.path, category:phCat });
        if (error) throw error; done++;
      } catch (err) { bad++; console.error(err); }
    }
    st.textContent = `✓ ${done} photo${done===1?'':'s'} uploaded` + (bad ? ` · ${bad} failed` : '');
    toast(bad ? `${bad} failed` : '✓ Uploaded', !!bad);
    loadPhotos();
  };
  async function loadPhotos(){
    const box = $('#photo-grid'); box.innerHTML = '<div class="loading" style="grid-column:1/-1">Loading…</div>';
    const { data, error } = await sb.from('photos').select('*').order('created_at', { ascending:false });
    if (error) { box.innerHTML=''; return fail(error, 'Photos'); }
    box.innerHTML = data.length ? data.map(p => `
      <div class="ph ${p.category}"><img src="${esc(p.thumb_url||p.url)}" loading="lazy" alt="">
        <span class="cat">${p.category==='ceiling'?'සිවිලිම':'වැහිපීලි'}</span>
        <button class="del" data-id="${p.id}" data-p="${esc(p.path||'')}" data-t="${esc(p.thumb_path||'')}">✕</button></div>`).join('')
      : '<div class="empty" style="grid-column:1/-1"><i>🖼️</i>App එකෙන් දාපු photos නැහැ.<br><small>(පරණ photos 90 website එකේ තියෙනවා.)</small></div>';
  }
  $('#photo-grid').onclick = async e => {
    const b = e.target.closest('.del'); if (!b) return;
    if (!confirm('මේ photo එක මකන්නද?')) return;
    const { error } = await sb.from('photos').delete().eq('id', b.dataset.id);
    if (error) return fail(error);
    removeFiles([b.dataset.p, b.dataset.t]); toast('Deleted'); loadPhotos();
  };

  // ---------- settings ----------
  async function loadSettings(){
    const { data, error } = await sb.from('settings').select('*').eq('id', 1).maybeSingle();
    if (error) return fail(error, 'Settings');
    const f = $('#set-form');
    Object.entries(data || {}).forEach(([k,v]) => { if (f.elements[k]) f.elements[k].value = v ?? ''; });
  }
  $('#set-form').onsubmit = async e => {
    e.preventDefault();
    const row = { id:1, updated_at: new Date().toISOString() };
    new FormData(e.target).forEach((v,k) => row[k] = String(v).trim());
    if (row.whatsapp) row.whatsapp = intl(row.whatsapp);
    const btn = e.target.querySelector('button'); btn.disabled = true;
    const { error } = await sb.from('settings').upsert(row);
    btn.disabled = false;
    if (error) return fail(error, 'Save'); toast('✓ Saved — website updated'); loadSettings();
  };

  // ---------- go ----------
  sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') show('login'); });
  setInterval(() => { if (!$('#app').hidden) updateBadge(); }, 60000);
  start();
})();
