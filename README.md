# A.D. Engineering — කුමාරගේ පීලි කඩේ

Website for A.D. Engineering (Amano gutters, i-Panel ceilings, iron roofing).

- `index.html` — the whole website (works on phone, tablet and computer)
- `images/` — logo
- `gallery/` — work photos (full size), `gallery/thumbs/` — small versions for fast loading

## Live site

https://sourceconnect213-pixel.github.io/gutterworks/

The site is served by GitHub Pages from the `gh-pages` branch.
After changing anything, update that branch too:

    git push origin HEAD:gh-pages

## Add more photos

Put a new photo in `gallery/` and a smaller copy (about 560px) in `gallery/thumbs/`
with the same name, e.g. `gutter-40.jpg` or `ceiling-52.jpg`, then increase the
`length:` numbers in the `PHOTOS` list near the bottom of `index.html`.

## Admin app (Android) + Supabase

The website reads live content (phone numbers, addresses, hours, figures, shop items,
price list, new photos) from **Supabase**, and the quote form saves customer requests there.
If Supabase is not set up, the website simply shows its built-in content.

- `supabase/setup.sql` — creates the tables, security rules and photo storage
- `config.js` — Supabase URL + anon key used by the website and the app
- `admin-app/` — admin app source (Capacitor). APK: `downloads/ad-engineering-admin.apk`

### One-time setup
1. Create a free project at https://supabase.com
2. **SQL Editor** → New query → paste `supabase/setup.sql` → **Run**
3. **Authentication → Users → Add user** → email `adengineering486@gmail.com` + a password
   (this is the admin login; only emails in the `admins` table can edit)
4. **Project Settings → API** → copy the **Project URL** and the **anon / publishable key**
   into `config.js`

### Rebuild the APK
```
cd admin-app && npm install
export ANDROID_HOME=/path/to/android-sdk
npm run build:apk     # → android/app/build/outputs/apk/release/app-release.apk
```
