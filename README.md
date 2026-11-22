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
