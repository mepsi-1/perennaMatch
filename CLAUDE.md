# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

PerennaMatch is a static HTML5 app (vanilla JS ES modules, no build step, no dependencies, no backend) for rating perennials Tinder-style. When a user rejects a plant, they pick one or more reasons. The UI, data and docs are in Finnish. It is deployed to GitHub Pages from the repo root.

## Commands

```sh
python -m http.server 8000         # serve locally (ES modules don't work over file://)
node tools/fetch-images.mjs        # regenerate data/plants.json (Node 18+, needs network)
node tools/fetch-images.mjs --force  # refetch every image, not only new or changed plants
node tools/fetch-municipalities.mjs  # regenerate data/municipalities.json (Wikidata + data/municipality-zones.json)
```

There is no test suite, linter or bundler.

## Architecture

**Data pipeline**
- Edit only `data/plants-source.json`.
- `tools/fetch-images.mjs` merges an `image` object (`url`, `artist`, `license`, `licenseUrl`, `source`, `sourceName`) into each plant and writes `data/plants.json`. Never edit that file by hand.
- Image lookup order: `imageOverride` (a Commons filename), then Wikidata P18 via SPARQL on `P225`, then Commons search, then iNaturalist.
- The script accepts only CC0, PD, CC BY and CC BY-SA images; NC and ND licenses are rejected because the app relies on attribution alone.
- Plants that already have an image are reused unless `sci`/`imageOverride` changed or `--force` is given.
- The app only hotlinks image URLs and makes no API calls at runtime.
- Automatic image picks can be the wrong species: Wikidata's image for *Hosta sieboldiana* was a *Hosta fortunei* file. Always check new images visually.

**Runtime modules (`js/`)**
- `app.js` loads `plants.json`, builds a shuffled queue of unseen plants and swaps views (`swipe`/`list`/`favs`, toggled with the `hidden` attribute). It also drives the rejection-reason bottom sheet, undo (the button, Backspace or Ctrl+Z puts the previous plant back on top of the deck) and the "Aloita alusta" button in the favourites view (`reset()` after a warning confirm wipes all stored data and returns to onboarding). The `list` view lists every plant with its image attribution (it replaced the separate credits page); tapping a row in it or in `favs` puts that plant on top of the deck with `putOnTop()`, even if it is hidden by the zone or garden filter.
- `swipe.js` `attachSwipe(card, onSwipe)` handles pointer-event dragging and returns a `fling(dir)` function. Buttons and arrow keys call the same function.
- `reasons.js` builds each plant's rejection reasons:
  - Rules are applied to `height`/`light`/`moisture`/`zoneMax`/`care`/`spreads`, then the generic reasons are appended.
  - A plant can tweak its list with `reasons: { add: [...], remove: [...] }`. An `add` entry is either a `REASONS` id or a custom `{id, label}`.
  - Use the same custom ids across plants so the statistics aggregate.
- `zone.js` drives the onboarding view, which sets the user's growing zone in one of three ways: geolocation picks the nearest municipality centroid locally (coordinates are never stored or sent), the user searches for a municipality by Finnish or Swedish name, or the user picks I–VIII directly. The municipality's zone (`data/municipalities.json`, generated from the hand-edited `data/municipality-zones.json`) is only a suggestion the user can change. `app.js` **hides** plants whose `zoneMax` is below the chosen zone. A `null` zone (only in old profiles that used the removed skip button) shows all plants.
- `garden.js` is the second onboarding step: the user picks one or more garden types (parveke/pieni/iso/mokki), and a plant is shown if it fits at least one of them (`fitsProfile()`). When `minGarden` is missing it is derived: perennials default to `pieni` (so they are hidden on a balcony), trees with `height[0] >= 1000` default to `iso`, and shrubs/climbers (`pensas`/`koynnos`) with `height[1] > 500` default to `iso`. The profile is `{ zone, municipality, method, suggestedZone, gardens: [] }`. An empty array means the user skipped the step. Old profiles store a single `garden` string, and `gardensOf()` normalizes them. A profile with neither key sends the user to that step on load. The zone is asked only once. For the balcony option the zone filter is one zone stricter, capped at VIII (`effectiveZone()`), because plants in pots overwinter worse.
- `stats.js` is the **only** module that touches storage (localStorage key `perenna.v1`). `totals` are cumulative; they are kept for a future collector and not shown. The favourites view reads `votes` (latest vote per plant). `undoLast()` reverts a vote from an in-memory stack, which `reset()` and `clearUndo()` (called when the queue is rebuilt) empty. A future remote collector (e.g. Supabase) should plug into `recordVote()` without changes elsewhere.
- `card.js` renders the card DOM through the `el()` helper and handles image attribution. Every image must show artist and license.

**Plant schema rules** (full spec and data-collection workflow: `docs/TIEDONKERUU.md`)
- `id` is the scientific name in kebab-case. It must never change, because stored votes reference it.
- `light` and `moisture` are arrays of Finnish enum values.
- `zoneMax` is the northernmost Finnish hardiness zone, I–VIII stored as 1–8.
- `care` is one of `helppo`, `keskitaso`, `vaativa`.

## Conventions

- Keep the app dependency- and build-free so GitHub Pages can serve the repo root as-is.
- Theming uses CSS custom properties on `:root`, with dark mode set in `prefers-color-scheme`. The layout is mobile-first and the main column is capped at 560px.
- The visual style is a herbarium: each card is a herbarium sheet with a taped photo and a typewritten collection label, and votes are rubber stamps. Fonts (EB Garamond, Courier Prime, both OFL) are self-hosted in `fonts/`. Never load fonts or other assets from Google Fonts or other CDNs, because the app promises to send nothing anywhere.
- GitHub Pages caches files for 10 minutes. Whenever anything in `css/` or `js/` changes, bump the `?v=N` number in `index.html` (stylesheet link, `app.js` script and every import map entry): `sed -i 's/?v=[0-9]*/?v=N/g' index.html`. A new module must also be added to the import map. Data files are fetched with `cache: 'no-cache'` and need no version.
- `sw.js` (service worker, registered in `app.js`) serves same-origin files network-first with a cache fallback, so updates show immediately and the app works offline. It serves hotlinked images cache-first, so each image is downloaded only once. Bump its cache names only when a stored format must be discarded.
- After every change, commit and push to `main` (`git add` the changed files, `git commit`, `git push`). Pushing to `main` publishes the site to https://mepsi-1.github.io/perennaMatch/ within about a minute. Write commit messages in Finnish.
