# Математичні Покемони

A Pokémon-themed learning game for young Ukrainian children (grades 0 and 2,
ages ~5–7). Kids answer questions in **Math**, **Ukrainian language**,
**Nature** ("Я досліджую світ") and **English**; every correct answer helps
"catch" a Pokémon, so progress feels like a game, not a test.

Design rules (see `TASKS.md`, G1–G7): all UI text in Ukrainian, big tap
targets, no punishment for wrong answers, no timers that fail, everything
annoying (sound / voice / hints / animations) can be switched off, and nothing
leaves the device.

## Run it locally

There is **no build step** — open the static files directly. From the repo root:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000> in a browser.

The game also works from `file://` and from GitHub Pages (deploy `main`,
root). Pokémon artwork is hot-linked, so an internet connection is needed to
see the sprites (emoji fallback is used otherwise).

## Folder layout

Current layout (the game is being refactored toward the target structure in
Phase A, tasks T04–T08):

```
index.html            single page: markup + inline CSS + inline JS (being split out)
src/                  half-finished second copy of the app (kept until T08)
tests/                Python checks + (later) Node/Playwright tests
_archive/             old project-management files, kept for reference
.gitignore
README.md
```

Target layout after Phase A (`index.html` becomes a thin shell; logic and data
move into small files, no build step):

```
index.html                 thin shell: meta, <div id="app">, <script> tags
css/  tokens base layout components themes
js/
  core/    events store settings rng strings screens
  data/    pokemon words-en ... (data only, no logic)
  skills/  registry math-* ukr-* nature-* eng-*
  ui/      menu game keypad choices tiles catalog modal settings-ui
  features/ sound speech collection progress hints
  app.js   boot only
tests/unit/*.test.js   (node --test)
tests/e2e/*.spec.js    (Playwright)
```

## Running tests

One-time setup:

```sh
npm install
npx playwright install chromium
```

Then run everything (Node unit tests + Playwright smoke tests):

```sh
npm test
```

Individual suites:

```sh
npm run test:unit    # node --test tests/unit
npm run test:e2e     # Playwright, chromium, serves the repo on port 4173
```

The unit suite is plain `node:test` (Node 18+). Playwright starts
`python3 -m http.server 4173` automatically when running the e2e tests.

## Disclaimer

Fan-made, non-commercial educational project. Pokémon is © Nintendo /
Game Freak / Creatures. Pokémon artwork is hot-linked, not copied.
