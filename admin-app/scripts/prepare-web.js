// Copies shared files (config, logo, supabase library) into www/ before building.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), www = path.join(root, 'www');
const copy = (from, to) => { fs.copyFileSync(from, path.join(www, to)); console.log('copied', to); };
copy(path.join(root, '..', 'config.js'), 'config.js');
copy(path.join(root, '..', 'images', 'logo-mark.png'), 'logo-mark.png');
copy(require.resolve('@supabase/supabase-js/dist/umd/supabase.js'), 'supabase.js');
