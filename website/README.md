# Mana Battle website

A dependency-free, single-page landing site for Mana Battle, in the spirit of
[Mindustry's site](https://mindustrygame.github.io/). Plain HTML, CSS, and a
tiny progressive-enhancement script — no build step, no framework, no runtime
dependencies.

## Preview locally

From the repository root:

```bash
python3 -m http.server 4173 --directory website
```

Then open <http://127.0.0.1:4173/>.

> Relative URLs are used throughout, so the site works both at a project URL
> (`https://lfarroco.github.io/mana-game/`) and at a custom domain.

## Deploy

The site ships via GitHub Pages from the workflow at
[`.github/workflows/pages.yml`](../.github/workflows/pages.yml):

- push to `main` changing `website/**`, or trigger **Deploy website** manually
  from the Actions tab;
- the workflow uploads `website/` as the Pages artifact and deploys it.

The repository's **Settings → Pages → Build and deployment → Source** must be
set to **GitHub Actions** once. (The workflow cannot change that setting.)

Published URL: <https://lfarroco.github.io/mana-game/>

## Assets

The site reuses the repo's marketing art (`art/`) rather than duplicating
source files:

| Site asset                              | Source                                       |
| --------------------------------------- | -------------------------------------------- |
| `assets/logo.png`                       | `art/steam/logo_solo.png` (transparent logo) |
| `assets/logo.webp`                      | `assets/logo.png` re-encoded (see below)     |
| `assets/icon.png`, `assets/favicon.png` | `art/steam/community_icon.png`               |
| `assets/background.jpg`                 | `art/android/bg.png`                         |
| `assets/og.jpg`                         | `art/steam/header_capsule.png`               |
| `assets/steam-capsule.jpg`              | `art/steam/main_capsule.png`                 |
| `assets/trailer-thumb.jpg`              | YouTube thumbnail for `hZuXwScJUK0`          |
| `assets/screenshot-*.jpg`               | `art/marketing/screenshots/*`                |

Screenshots were resized to 1600px and re-encoded as JPEG (~82 quality) with
macOS `sips`:

```bash
sips -Z 1600 -s format jpeg -s formatOptions 82 \
  art/marketing/screenshots/<shot>.1920x1080.jpg \
  --out website/assets/<name>.jpg
```

The hero logo is served as WebP (66 KB instead of 279 KB) with the PNG as the
fallback in a `<picture>`. Regenerate it after changing `logo.png`:

```bash
cwebp -q 90 -alpha_q 100 website/assets/logo.png -o website/assets/logo.webp
```

## Editing

- `index.html` — copy, sections, metadata, and links.
- `styles.css` — palette, layout, and responsive rules.
- `main.js` — screenshot lightbox, click-to-load trailer, mobile menu, footer
  year.

Store links:

- itch.io: <https://lfarroco.itch.io/mana-battle>
- Steam: <https://store.steampowered.com/app/3757600/Mana_Battle>
- GitHub: <https://github.com/lfarroco/mana-game>
- YouTube: <https://www.youtube.com/@manabattle>
- X: <https://x.com/manabattle_en>

If the itch.io or Steam URLs change, update both the buttons and the
`VideoGame` JSON-LD in `index.html`.
