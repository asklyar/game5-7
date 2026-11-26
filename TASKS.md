# PokeMath — Requirements & Agent Task List

Audience: local agents (Qwen 27B, 4-bit MLX, in OpenCode / T3 Code). One task = one fresh agent session.
Owner: Andrew. Written 2026-11-26. Based on a review of the repo (index.html, src/, tests/, kanban/, pokemath-requirements.md, STATUS.md).

---

## Decisions log (agent runs — read first)
Append-only. Each entry records what was actually done vs. the plan, so a fresh agent can pick up. Newest at the bottom.

### T01 · Repo hygiene & README — DONE 2026-11-26 (commit 22b4d39, pushed, deployed)
Context: the user had already deleted many non-game files from the working tree *before* this run; per "keep as is", those deletions were honored rather than reversed.
- **6 items T01 listed for `git mv` into `_archive/` were already deleted by the user → kept deleted** (recoverable from git history, not restored): `kanban/`, `create_kanban_tasks.py`, `fix_kanban_tasks.py`, `simple_kanban_generator.py`, `pokemath-requirements.md`, `STATUS.md`.
- **`.claude/` and `.obsidian/` still existed → moved to `_archive/`** (now `_archive/.claude/`, `_archive/.obsidian/`).
- **`autotest.py` was already moved by the user to `tests/autotest.py` → honored as a rename**; it is NOT back at the repo root.
- **`TASKS.md` (this file) is intentionally left untracked** (not committed, not moved) — a future agent editing it can re-decide, but as of T01 it stays out of the repo on purpose.
- **`.gitignore` now ignores** `.DS_Store`, `node_modules/`, `test-results/`, `.obsidian/`. `.DS_Store` was `git rm --cached`.
- **Wrinkle resolved:** `.obsidian/` in `.gitignore` blocked a normal `git add` of the tracked archive copy, so `_archive/.obsidian/*` was force-added (`git add -f`) to keep the archive complete; `.gitignore` only guards *future* Obsidian state.
- **Committed** as `T01: Repo hygiene & README` and **pushed to `origin/main`** (`asklyar/game5-7`).
- **GitHub Pages:** repo is **public**; Pages was enabled via `gh api` (source = `main` / root). Build status `built`, live at `https://asklyar.github.io/game5-7/` (HTTP 200; serves the game `<title>` and `src/js/00-pm.js` 200).
- **Deviations from T01's literal "Done when"** (all caused by the user's "keep as is" choices): `autotest.py` lives in `tests/`, not root; `TASKS.md` is untracked; `.DS_Store` stays on disk but is gitignored.
- **NOT verified by the agent:** a real in-browser render / play-through of the game (substituted an HTTP 200 + title check instead).
- Root now holds: `index.html`, `src/`, `tests/`, `_archive/`, `README.md`, `.gitignore` (+ untracked `TASKS.md`, on-disk `.DS_Store`).

## 0. Executive summary (read first)

**Facts found in the repo**
- The shipped `index.html` is a hand-maintained monolith (inline CSS + ~600 lines inline JS). It is **not** built from `src/`.
- `src/` is a half-finished second copy: `00-core.js` is an older copy of the inline script; `src/css/*` and `ios-adapt.js` are **never loaded**. No `build.py` exists, although the old requirements assume one.
- The PM-18 (iPhone) code is mostly broken: `env(safe-area-top)` is the wrong name, `max-top:` is not CSS, `marginTop='-(n)px'` is invalid, `parseInt` is applied to a CSV string. It never runs in the shipped page.
- Tests are placeholders (`assertTrue(True)`, circular import, hard-coded `/Users/as/...` path). The only real check is `autotest.py` (macOS-only; data integrity of 98 families / 200 stages).
- No viewport-fit, no `dvh`, no focus styles, no reduced-motion, no manifest/favicon/404. Andika font is referenced but never loaded.
- Pokémon artwork is hot-linked from `raw.githubusercontent.com/PokeAPI/sprites` (needs network, emoji fallback exists).
- Kanban board and STATUS.md are out of sync with the code (PM-18 shows "backlog" but is partly committed).

**Recommendation**
1. Do **architecture first** (Phase A): one source of truth, no build step, small files, data separated from logic, real tests. This is what makes a 27B local model reliable — it can only handle small, isolated files.
2. Then **UI/responsive fixes** (Phase B), then the **engine upgrades** that content needs (Phase C), then **content packs** (Phase D), then **engagement** (Phase E).
3. Use the local model for **code**. Generate and review **Ukrainian educational content** (spelling, stress, grade fit) separately — a 27B 4-bit model will make Ukrainian orthography errors. See §4.

**Assumptions (change if wrong)**
- A1: Hosting = GitHub Pages from `main` branch root, project URL (`https://asklyar.github.io/game5-7/`)
- A2: No build step. Classic `<script>` tags, no ES modules, no bundler (works from `file://` and Pages).
- A3: Target browsers: Chrome on MacOS/iOS/Android. JS may use `const/let`, arrow functions, template strings. No frameworks.
- A4: Grade mapping: 5-year-old = "0 клас" (grade 0), 7-year-old = "2 клас" (grade 2). Old save keys `pokemath_l5` → grade 0, `pokemath_l7` → grade 2.
- A5: Content topics follow the Ukrainian primary school (НУШ) themes; exact programme must be checked against what the school actually teaches (ask the teacher / textbooks).

**Risks**
- Pokémon names/artwork are Nintendo/Game Freak IP. Keep the repo non-commercial, keep hot-linking (not copying) images, add a disclaimer in README/footer. A public repo is visible to anyone — consider keeping it private (GitHub Pages on private repos needs a paid plan) — your call.
- Local model quality: tasks that touch >3 files or >200 changed lines will fail. All tasks below are sized to avoid that.
- Ukrainian text generated by the model must be human-reviewed (§4).

---

## 1. Product requirements (carried over + updated)

Carried from `pokemath-requirements.md` (G1–G7), kept as the global rules:

| ID  | Rule                                                                                                                               |
| --- | ---------------------------------------------------------------------------------------------------------------------------------- |
| G1  | All UI text in Ukrainian (English only for vocabulary being taught).                                                               |
| G2  | Readable: Andika/Verdana/sans-serif, body ≥ 22px, line-height 1.4–1.5, no ALL-CAPS in running text, dark text on cream background. |
| G3  | No punishment: wrong answer never loses progress, no red flashing, no harsh sound, no timers that fail.                            |
| G4  | Tap targets ≥ 48px; works 320×568 → desktop with **no horizontal scroll**.                                                         |
| G5  | Never colour-only meaning; ≤ 3 flashes/s; honour `prefers-reduced-motion`.                                                         |
| G6  | No data leaves the device (no analytics/accounts). Only exception: Pokémon artwork URLs.                                           |
| G7  | Every annoying feature (sound, voice, hints, animations) can be switched off in Settings.                                          |

New/changed in this plan:

| ID | Requirement |
|----|-------------|
| R1 | **No build step.** The repo is directly deployable. `index.html` is a thin shell. (Replaces old decision D3 `build.py`.) |
| R2 | Source of truth = `index.html` + `css/` + `js/`. No generated files committed. |
| R3 | Each JS file ≤ 300 lines, each function ≤ 40 lines, one responsibility per file. |
| R4 | Content (Pokémon, words, questions) lives in **data files** (`js/data/*.js`), separate from logic. |
| R5 | Every subject/topic is a **skill** registered in a registry; adding a skill = adding one file + one `<script>` line. |
| R6 | All UI strings come from `js/strings.js` (`PM.t('key')`). |
| R7 | Saves are versioned and migrated; old saves of the current game are preserved. |
| R8 | Subjects: Math, Ukrainian language, Nature ("Я досліджую світ"), English. Grades 0 and 2. |
| R9 | Pre-readers (grade 0) can play without reading: pictures + voice (🔊) + big buttons. |
| R10 | Sound is synthesised (Web Audio, no files); voice = `speechSynthesis` with graceful fallback. |
| R11 | Works offline after first load (PWA) — last phase, optional. |
| R12 | Automated tests: unit (Node) for logic, Playwright for UI/viewports. |

### Target structure

```
index.html                 thin shell: meta, <div id="app">, script tags
css/  tokens.css base.css layout.css components.css themes.css
js/
  core/    events.js store.js settings.js rng.js strings.js screens.js
  data/    pokemon.js words-en.js ... (data only, no logic)
  skills/  registry.js math-*.js ukr-*.js nature-*.js eng-*.js
  ui/      menu.js game.js keypad.js choices.js tiles.js catalog.js modal.js settings-ui.js
  features/ sound.js speech.js collection.js progress.js hints.js
  app.js   boot only
tests/unit/*.test.js   (node --test)
tests/e2e/*.spec.js    (Playwright)
docs/    ui-audit.md  skills.md
README.md  .nojekyll  404.html  manifest.webmanifest (later)  sw.js (later)
```

### Contracts the agents must follow

```js
// Skill (js/skills/registry.js)
PM.skills.register({
  id: 'math.add20',          // unique, dot-separated
  subject: 'math',           // math | ukr | nature | eng
  grade: 0,                  // 0 or 2
  titleKey: 'skill.math.add20',
  tiers: 3,                  // optional, default 1
  generate(ctx) {            // ctx = { rnd, tier, profile }; rnd() -> [0,1)
    return {
      key: '3+4',            // used by no-repeat
      prompt: { text: '3 + 4 = ?', emoji: null, speak: null },
      input: 'keypad',       // keypad | choice | tiles
      answer: 7,             // string|number|array(for tiles)
      options: null,         // for choice: array of {label, emoji?}, unique, includes answer
      hint: { text: null, dots: [3, 4] }   // optional
    };
  }
});

// Events (js/core/events.js): PM.on(name, fn), PM.emit(name, payload)
//   answer:correct {skill,key}  answer:wrong {skill,key,attempt}  catch:done {pokemonId, evolved}

// Store (js/core/store.js): PM.store.get(key, fallback), set(key, value)   // always try/catch, prefix 'pokemath_'
// Randomness/time: PM.rnd(), PM.now()   // never Math.random()/Date.now() in game logic
// Test params: ?test=1&seed=123&now=1700000000000
```

---

## 2. Rules for every agent (paste at the top of each prompt)

```
You are implementing ONE task in the repo. Rules:
1. Read ONLY the files listed in the task ("Files") plus README.md. Do not explore the repo.
2. Change only the listed files. If you think another file must change, STOP and report it instead.
3. Plain JavaScript, no frameworks, no ES modules, no npm runtime dependencies. Classic <script> tags.
4. Keep files ≤ 300 lines and functions ≤ 40 lines. No new globals except the `PM` namespace.
5. Do not use Math.random()/Date.now() in game logic; use PM.rnd()/PM.now().
6. All user-visible text via PM.t('key'); add the key to js/strings.js.
7. Run the Verify command. Paste its output. If it fails, fix and re-run (max 3 attempts), then report.
8. Never invent Ukrainian words/spelling: use only data given in the task, or mark generated data `reviewed:false`.
9. Finish with: files changed, what you verified, what you did NOT verify.
10. Commit with message "Txx: <title>". Do not push.
```

Task size legend: **S** ≤ 80 changed lines, 1–2 files. **M** ≤ 200 lines, ≤ 3 files. Anything larger must be split before giving to the agent.
Verify commands assume T02 is done: `npm run test:unit`, `npm run test:e2e`, `npm test` (both).

---

# PHASE A — Architecture (do first, in order)

### T01 · Repo hygiene & README `[P0 · S]`
**Goal:** Clean repo root for GitHub; non-game files out of the way.
**Files:** `.gitignore`, `README.md`; move (git mv) `kanban/`, `.obsidian/`, `.claude/`, `create_kanban_tasks.py`, `fix_kanban_tasks.py`, `simple_kanban_generator.py`, `pokemath-requirements.md`, `STATUS.md` into `_archive/`.
**Steps:** 1) `git rm --cached` every `.DS_Store`; add `.DS_Store`, `node_modules/`, `test-results/`, `.obsidian/` to `.gitignore`. 2) git mv the listed items into `_archive/`. 3) Write `README.md`: what the game is, how to run (`python3 -m http.server 8000` → http://localhost:8000), folder layout (§1 target), disclaimer "Fan-made, non-commercial; Pokémon is © Nintendo/Game Freak/Creatures", how to run tests (placeholder until T02).
**Done when:** repo root contains only `index.html`, `src/` (still), `tests/`, `autotest.py`, `README.md`, `.gitignore`, `_archive/`. `git status` clean after commit; game still opens.
**Verify:** `ls`, `git status`, open index.html in browser (manual).

### T02 · Test harness `[P0 · M]`
**Goal:** `npm test` works on any machine (no hard-coded paths).
**Files:** create `package.json`, `playwright.config.js`, `tests/unit/sanity.test.js`, `tests/e2e/smoke.spec.js`.
**Steps:** 1) `package.json` with devDependencies `@playwright/test`; scripts `test:unit` = `node --test tests/unit`, `test:e2e` = `playwright test`, `test` = both. 2) Playwright config: `webServer: { command: 'python3 -m http.server 4173', url: 'http://localhost:4173' }`, projects: chromium only (desktop 1280×800). 3) Smoke spec: open `/`, fail the test on any `console.error` or `pageerror`, assert page title is non-empty.
**Done when:** `npm install && npx playwright install chromium && npm test` is green.
**Verify:** `npm test`.

### T03 · Baseline e2e of current behaviour `[P0 · M · deps T02]`
**Goal:** Lock the current game behaviour before refactoring.
**Files:** create `tests/e2e/baseline.spec.js` (read `index.html` to find selectors; add `id`/`data-testid` attributes to `index.html` only if missing — attributes only).
**Steps:** Tests: (1) menu shows 4 cards (math/English × 2 levels); (2) start Math level 5, read the question, compute the answer in the test, click keypad digits + OK, expect "Молодець"; (3) wrong answer shows "Спробуй ще"; (4) start English, click the correct option (use the visible word pair data via `page.evaluate` on the `EN_WORDS_5` global), expect catch popup; (5) reload page → collection count persisted in localStorage (`pokemath_l5`).
**Done when:** 5 tests green against the *current* index.html.
**Verify:** `npm run test:e2e`.

### T04 · Extract inline CSS → `css/main.css` `[P0 · S]`
**Files:** `index.html`, create `css/main.css`.
**Steps:** Move the whole inline `<style>` content verbatim into `css/main.css`; replace with `<link rel="stylesheet" href="css/main.css">`. No other change.
**Done when:** page looks identical; baseline tests green. **Verify:** `npm test`.

### T05 · Extract Pokémon data `[P0 · S]`
**Files:** `index.html`, create `js/data/pokemon.js`.
**Steps:** Move the `POKEMON` array and `ART`/`imgUrl` constant verbatim into `js/data/pokemon.js` as `PM.data = PM.data || {}; PM.data.pokemon = [...]; PM.data.artUrl = function(dex){...}`; in `index.html` keep thin aliases (`var POKEMON = PM.data.pokemon;`) so nothing else breaks. Make sure `PM` namespace exists before it (create `window.PM = window.PM || {}` at the top of the file).
**Done when:** 98 families / 200 stages still (port the check into `tests/unit/pokemon-data.test.js`: load the file with `vm`, assert counts, every stage has `name`, `dex` (number), `emoji`, `ability`).
**Verify:** `npm test`.

### T06 · Extract English word banks (and merge) `[P0 · S]`
**Files:** `index.html`, `src/js/00-core.js` (read-only, source of extra words), create `js/data/words-en.js`.
**Steps:** Create `PM.data.words = { grade0: [...], grade2: [...] }` as objects `{id, en, uk, emoji:'', topic:'', reviewed:true}` converted from the `EN_WORDS_5` / `EN_WORDS_7` pairs. Take the **union** of the pairs from `index.html` and `src/js/00-core.js` (the src copy has more `EN_WORDS_5` words). Leave `emoji:''` and `topic:''` blank. Keep thin aliases in `index.html` that rebuild the old pair arrays so the game still works.
**Done when:** no duplicate `id`; unit test asserts unique `en` per grade and non-empty `uk`.
**Verify:** `npm test`.

### T07 · Extract remaining inline JS → `js/game.js` `[P0 · M]`
**Files:** `index.html`, create `js/game.js`; keep existing `src/js/00-pm.js`, `src/js/features/*.js` (loaded as now).
**Steps:** Move the remaining inline `<script>` verbatim into `js/game.js`; load order in `index.html`: data files → `src/js/00-pm.js` → features → `js/game.js`. No logic change. If `game.js` > 300 lines, split by comment-section into `js/ui/catalog.js`, `js/ui/game.js` (pure move).
**Done when:** `index.html` has no inline script/style; baseline green.
**Verify:** `npm test`.

### T08 · Delete dead code & fake tests `[P0 · S]`
**Files (delete):** `src/index.template.html`, `src/_body.fragment.html`, `src/css/00-base.css`, `src/css/00-layout.css`, `src/js/00-core.js`, `src/js/features/ios-adapt.js`, `tests/test_pm_*.py`, `tests/test_sound_events.py`, `tests/devices.json` (move to `tests/e2e/devices.js` as a JS array first), `autotest.py` (its checks are in T05).
**Steps:** Remove the `00-pm.js` code that belongs to PM-18 (`initPM18Adapt`, `applyTouchSettings` incl. the `dblclick` handler on `*`, `detectResponsiveLayout`); keep `PM.on/emit`, `PM.store`, settings modal. Move remaining `src/js/**` into `js/core/` and `js/features/` (git mv) and fix script paths. Delete empty `src/`.
**Done when:** no `src/` folder; no console errors; baseline green.
**Verify:** `npm test`, `grep -R "safe-area-top\|max-top" . --include=*.css --include=*.js` returns nothing.

### T09 · Remove inline `onclick` handlers `[P1 · M]`
**Files:** `index.html`, `js/game.js` (or `js/ui/*.js`).
**Steps:** Replace every `onclick="fn(args)"` in HTML and in innerHTML strings with `data-action="name"` + `data-arg="..."`; add one delegated `document.addEventListener('click', ...)` that maps `data-action` → function in an `ACTIONS` object. Keep keyboard handling.
**Done when:** `grep -n "onclick=" index.html js -r` empty; baseline green.

### T10 · Versioned storage + profiles migration `[P0 · M]`
**Files:** create `js/core/store.js`, `tests/unit/store.test.js`; edit loader lines only.
**Steps:** `PM.store.get/set/remove` with try/catch + in-memory fallback if localStorage throws. `pokemath_schema` = integer. `PM.store.migrate()`: v0→v1 copies `pokemath_l5` → `pokemath_profile_g0`, `pokemath_l7` → `pokemath_profile_g2` (**keeps the old keys untouched**). Document keys in `README.md`. Game reads/writes through new keys via a single function `PM.progress.load(grade)/save(grade, data)`.
**Done when:** unit test with a fake localStorage proves migration and idempotency; existing saves load.
**Verify:** `npm run test:unit`.

### T11 · Settings module `[P1 · S]`
**Files:** create `js/core/settings.js`; edit `js/core/00-pm.js` (settings UI part only).
**Steps:** `PM.settings.get(name)`, `set(name,val)`, defaults `{sound:true, voice:true, theme:'day', animations:true}`, emits `settings:change`. Persist under `pokemath_settings`. Theme toggle and sound use it.
**Done when:** unit test for defaults/persist; toggling sound in UI survives reload.

### T12 · Seeded RNG & clock `[P1 · S]`
**Files:** create `js/core/rng.js`, `tests/unit/rng.test.js`; replace `Math.random`/`Date.now` in `js/game.js`.
**Steps:** `PM.rnd()` (mulberry32; seed from `?seed=` else random), `PM.rndInt(a,b)`, `PM.pick(arr)`, `PM.shuffle(arr)`, `PM.now()` (`?now=` override).
**Done when:** `grep -R "Math.random\|Date.now" js` only matches `rng.js`; test: same seed → same sequence.

### T13 · Strings module, part 1 (menu + game) `[P1 · M]`
**Files:** create `js/core/strings.js`; edit `index.html`, `js/game.js`.
**Steps:** `PM.strings = {uk:{...}}`, `PM.t(key, vars)`. Move all menu and game-screen texts (feedback, buttons, prompts). HTML elements get `data-i18n="key"`; `PM.applyStrings(root)` fills them on boot.
**Done when:** UI text identical; unit test: every `data-i18n` key in index.html exists in strings.js.

### T14 · Strings module, part 2 (catalog, modal, settings, errors) `[P1 · M · deps T13]`
Same as T13 for the remaining screens. **Done when:** `grep -nP "[А-Яа-яІіЇїЄєҐґ]" js/**/*.js index.html` matches only `strings.js` and data files.

### T15 · Skill registry + question runner `[P0 · M · deps T12]`
**Files:** create `js/skills/registry.js`, `tests/unit/registry.test.js`.
**Steps:** Implement `PM.skills.register/get/list(filter)`, `PM.skills.next(skillIds, ctx)` → picks a skill, calls `generate`, validates the contract (§1) and throws a clear error on violation. Include `PM.skills.validate(item)` used by tests.
**Done when:** unit tests: duplicate id rejected; invalid item rejected; `next` deterministic with a seed.

### T16 · Migrate Math (grade 0) to a skill `[P0 · M · deps T15]`
**Files:** create `js/skills/math-add20.js`, `tests/unit/skill-math-add20.test.js`; edit `js/game.js` (question source only).
**Steps:** Reproduce the current level-5 behaviour (+/- inside 0..20, never negative) as skill `math.add20`; `key` = normalised (`a+b` and `b+a` same key); game asks the registry instead of `renderMathQuestion`.
**Done when:** unit test runs 500 seeded questions: answer within 0..20, correct arithmetic, no negatives. Baseline e2e green.

### T17 · Migrate Math (grade 2) to skills `[P0 · M · deps T15]`
Skills `math.addsub60` (tier-less, current behaviour) and `math.times10` (table 1..10). Same tests/rules as T16.

### T18 · Migrate English to a skill `[P0 · M · deps T15, T06]`
**Files:** create `js/skills/eng-vocab.js` + test.
**Steps:** `eng.vocab.g0` / `eng.vocab.g2` using `PM.data.words`, input `choice`, 4 unique options, distractors from the same topic when `topic` is set, otherwise random. Prompt `uk`, options `en` (display uppercase **only** for single words as now).
**Done when:** 500 seeded questions: options unique, include the answer, length 4.

### T19 · Extract collection/reward logic `[P1 · M]`
**Files:** create `js/features/collection.js`, `tests/unit/collection.test.js`; edit `js/game.js`.
**Steps:** Move `catchPokemon` logic split into pure functions: `pickNext(collection, rnd)`, `award(state)` → `{pokemonId, stageIndex, evolved, stars}`, `starsFor(stage)`, `isComplete(collection)`. UI (popup) stays in game.js. Emit `catch:done`.
**Done when:** tests: new catch adds stage 0; repeat evolves; fully evolved never selected; completion detected.

### T20 · Unit tests for all skills (property tests) `[P1 · S · deps T16–T18]`
**Files:** `tests/unit/skills-all.test.js`. For every registered skill run 300 seeded items through `PM.skills.validate`. Fail the build if a skill breaks the contract. (Content skills in Phase D inherit this automatically.)

### T21 · GitHub Pages readiness `[P1 · S]`
**Files:** create `.nojekyll`, `404.html`, `favicon.svg`; edit `index.html` (head), `README.md`.
**Steps:** Add `<link rel="icon">`, `<meta name="theme-color">`, `<meta name="description">`, `<html lang="uk">`. All asset paths relative (no leading `/`). Add a Playwright test that serves the repo under a sub-path (`/pokemon-math/`) and confirms zero 404s. README: "Settings → Pages → Deploy from branch → main / (root)".
**Done when:** test green, no absolute paths (`grep -n 'href="/\|src="/' index.html` empty).

### T22 · CI workflow `[P2 · S]`
**Files:** `.github/workflows/test.yml`. On push/PR: checkout, setup-node 20, `npm ci`, `npx playwright install --with-deps chromium`, `npm test`. **Done when:** workflow file valid YAML; first run green after you push.

### T23 · Local Andika font `[P2 · S]`
**Prerequisite (you):** download Andika (SIL OFL) `.woff2` regular+bold into `fonts/` and the licence file.
**Steps:** `@font-face` with `font-display: swap`, relative URLs; font stack `"Andika", Verdana, Tahoma, sans-serif`; confirm Cyrillic glyphs render (Playwright: `document.fonts.check('22px Andika')`).

### T24 · Artwork loading strategy `[P2 · S]`
**Files:** `js/features/collection.js` or `js/ui/modal.js`, `css/components.css`.
**Steps:** `loading="lazy"`, `decoding="async"`, explicit width/height (no layout jump), `onerror` → emoji fallback (verify exists), `alt` = Pokémon name. Attribution line in README/footer.
**Done when:** with network blocked (Playwright `route.abort`) the catalog and catch popup still show emoji, no console errors.

---

# PHASE B — UI & responsiveness

Note for the local model: it probably cannot judge screenshots reliably. All checks are **DOM measurements** (overflow, size, contrast). You review the screenshots yourself.

Viewport matrix (`tests/e2e/devices.js`): 320×568, 375×667, 390×844, 430×932, 360×800 (Android), 768×1024, 844×390 (phone landscape), 1280×800 (MacBook Air).

### T25 · UI audit script (no fixes) `[P0 · M]`
**Files:** create `tests/e2e/ui-audit.spec.js`, `tests/e2e/devices.js`, `docs/ui-audit.md` (generated).
**Steps:** For each viewport × screen (menu, math game, English game, catalog, catch popup, settings): (a) `document.documentElement.scrollWidth <= innerWidth` (horizontal scroll), (b) list interactive elements with width or height < 44px, (c) elements whose bounding box leaves the viewport, (d) key controls (keypad OK, options, close buttons) visible without scrolling at ≥ 375×667, (e) console errors, (f) save screenshots to `test-results/ui/`. Write findings table to `docs/ui-audit.md`. Tests that fail are marked `test.fail()` with a reference to the follow-up task so CI stays green.
**Done when:** report exists with a row per finding (viewport, screen, selector, issue).

### T26 · Viewport, dvh, safe areas `[P1 · S]`
**Files:** `index.html` (meta), `css/base.css`.
**Steps:** `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` (zoom stays allowed). Replace `min-height:100vh` by `min-height:100vh; min-height:100dvh`. Body padding with `env(safe-area-inset-top|right|bottom|left)`. Delete leftover wrong names.
**Done when:** `grep -R "100vh" css` only in fallback pairs; audit rows for this issue closed.

### T27 · Design tokens (fluid sizes) `[P1 · S]`
**Files:** create `css/tokens.css`; edit `css/main.css`.
**Steps:** CSS variables: `--space-1..5`, `--font-body: clamp(20px, 2.2vw + 14px, 26px)`, `--font-question: clamp(40px, 8vw, 72px)`, `--tap: 48px`, colours, radius. Replace hard-coded px for font-size/padding/margin in the 10 most used rules. No `!important`.

### T28 · Tap targets ≥ 48px `[P1 · S]`
Fix every row from the audit with "<44px" (`.btn.small`, `.theme-toggle`, `min-height:36px`, settings gear, close buttons). Use `min-width/min-height: var(--tap)`. **Done when:** audit (b) has zero rows.

### T29 · Menu layout `[P1 · S]`
2 columns ≥ 700px, 1 column below; cards stack with ≥ 12px gap; no horizontal scroll at 320px. **Done when:** audit rows for menu closed at all viewports.

### T30 · Game screen in portrait phones `[P1 · M]`
Question, feedback, keypad and score visible **without scrolling** at 375×667 and 320×568: use CSS grid (`grid-template-rows: auto 1fr auto`), keypad keys sized with `clamp()`, hide decorative elements < 600px height. **Done when:** audit (d) green for portrait viewports.

### T31 · Landscape phones & short screens `[P1 · M]`
`@media (max-height: 500px) and (orientation: landscape)`: two columns (question left, keypad/options right), smaller header. **Done when:** audit green at 844×390.

### T32 · Modals & catalog responsive `[P1 · M]`
Modal: `max-height: 90dvh; overflow:auto`, image `width:min(60vw, 220px)`, close button sticky and reachable; catalog grid `repeat(auto-fill, minmax(140px,1fr))`. **Done when:** audit rows for these screens closed.

### T33 · Touch, focus, motion `[P1 · S]`
Remove `user-select:none` on `html,body` (keep on buttons); add `touch-action: manipulation` on buttons; ensure no `dblclick` preventDefault remains; add `:focus-visible` outline (3px, high contrast); hover effects only inside `@media (hover:hover) and (pointer:fine)`; `@media (prefers-reduced-motion: reduce)` disables transitions/animations. Add `aria-live="polite"` on the feedback element and `aria-label` on emoji-only buttons.

### T34 · Contrast (WCAG AA) `[P1 · S]`
**Files:** `css/themes.css`, `tests/unit/contrast.test.js`.
**Steps:** Put colour pairs (text/background) for day and night themes in `css/themes.css` variables; write a unit test that parses them and computes the contrast ratio (formula in test) — fail < 4.5 for text, < 3 for large text/borders. Fix `.btn.blue`, `.btn.red` (white on light colours is ≈ 2.5–3:1, estimate — the test will confirm).

### T35 · Re-audit & close-out `[P1 · S]`
Run T25 again, update `docs/ui-audit.md`, remove `test.fail()` markers for fixed items; list remaining items in the report. **Done when:** zero open items or each remaining item has a new task proposal.

**Manual checks you do (30 min, not for the model):** real iPhone Safari (also "Add to Home Screen"), an Android Chrome phone, MacBook Air Safari + Chrome, pinch-zoom works, sound on/off with the iPhone silent switch, rotate device.

---

# PHASE C — Engine upgrades required by content (in order)

### T36 · Subject picker menu `[P1 · M · deps T15]`
**Files:** `js/ui/menu.js`, `index.html`, `css/components.css`, `js/core/strings.js`.
**Steps:** Menu = profile (grade 0 / grade 2, big avatar icons) → subject tiles generated from `PM.skills.list()` grouped by subject (icons: 🔢 Math, 🔤 Ukrainian, 🌿 Nature, 🇬🇧 English) → starts game with the skills of that subject+grade. Tiles for subjects without skills are not shown.
**Done when:** baseline flows still work via the new menu (update the e2e selectors).

### T37 · Progress & tiers (simplified PM-08/10) `[P1 · M]`
**Files:** create `js/features/progress.js`, `tests/unit/progress.test.js`.
**Steps:** Per skill store `{tier, history:[last 10 first-try results]}` in the profile. Rule: ≥ 8/10 first-try correct → tier+1 (max `tiers`); 20% of questions come from tier−1 (review). `PM.progress.record(skillId, firstTry)`, `PM.progress.tierFor(skillId)`. Pass `tier` in `ctx`.
**Done when:** unit tests for promotion, cap, persistence.

### T38 · No-repeat + weak-skill weighting `[P1 · S · deps T37]`
Add to `PM.skills.next`: keep last 5 `key`s (2 for choice-type), never repeat; skills with lower first-try rate get higher weight (weights 1 + (1 − rate)). Seeded unit tests.

### T39 · Input components: choices & tiles `[P0 · M]`
**Files:** `js/ui/choices.js`, `js/ui/tiles.js`, `css/components.css`.
**Steps:** `choices`: renders 2–4 big buttons (emoji + optional text), calls `onAnswer(value)`. `tiles`: shows shuffled letter/word tiles, child taps them in order into slots, `onAnswer(array)`. Wrong choice → button greys out softly (no red). Used for grade 0 math, letters, sentences.
**Done when:** Playwright test drives both components on a test page `?test=components`.

### T40 · Hints component (gentle retry) `[P1 · S]`
After the 2nd wrong try show `hint.dots` as emoji rows / `hint.text`; never reveal the answer; button 💡 always visible for grade 0. Setting `hints` on/off.

### T41 · Voice (speechSynthesis) `[P1 · M]`
**Files:** `js/features/speech.js`, `js/ui/game.js` (🔊 button only).
**Steps:** `PM.speech.say(text, lang)` (`uk-UA` / `en-US`), picks an installed voice matching the language prefix, rate 0.85 (grade 0) / 0.95 (grade 2); no-ops if unsupported; setting `voice`. 🔊 button replays `prompt.speak || prompt.text`. English questions speak the English word on show.
**Fact to verify yourself:** whether a Ukrainian voice is installed on the MacBook and the iPhones (Settings → Accessibility → Spoken Content). If not, the feature must degrade silently.

### T42 · Wire sound to events `[P2 · S]`
Make sure `sound.js` reacts only to bus events (`answer:correct/wrong`, `catch:done`, UI tap), respects `PM.settings`, and unlocks the AudioContext on first gesture. Remove direct calls from game code.

---

# PHASE D — Content packs (each = ONE agent run)

**Content task template (use for every row below):**
```
Task: Add skill <id>. Files to create: js/skills/<file>.js, js/data/<data>.js (if data needed),
tests/unit/skill-<id>.test.js. Add <script> tags to index.html and keys to js/strings.js.
Follow the Skill contract (§1). Input type: <type>. Generator rule: <rule>.
Data: use ONLY the data provided below / in the data file; do not invent words.
Done when: node test runs 300 seeded items through PM.skills.validate; e2e: skill appears in menu tile <subject>/<grade>
and one correct answer triggers a catch. Run: npm test.
```
Rule for data-heavy skills: the **data file is produced by a separate content step (§4)**, then the code task consumes it. Code tasks must not author Ukrainian words.

### D-Math (grade 0 — age 5)
| ID | Skill id | Input | Generator rule | Tiers |
|----|----------|-------|----------------|-------|
| C01 | `math0.count` | choice | Show 1–10 emoji of one kind, choose the number (3 distractors within ±2). Tier 2: up to 20. | 2 |
| C02 | `math0.compare` | choice | Two groups of emoji or two numbers: "Де більше?"/"Де менше?" (pick group); tier 2 adds `<`/`>`/`=` signs. | 2 |
| C03 | `math0.neighbors` | choice | Number before / after / between within 0..20. | 2 |
| C04 | `math0.addsub10` | choice | +/- within 10 with dot/emoji hint; tier 2 within 20 (reuses `math.add20` with choice input). | 2 |
| C05 | `math0.shapes` | choice | Draw a shape with inline SVG (circle, square, triangle, rectangle), choose the name from data keys. Needs `data/shapes.js` (names supplied by you). | 1 |
| C06 | `math0.pattern` | choice | Continue a pattern of 2–3 emoji (🔴🔵🔴🔵?) with 3 options; tier 2 uses ABB / ABC patterns. | 2 |
| C07 | `math0.order` | tiles | Order 3–5 numbers ascending/descending by tapping. | 2 |

### D-Math (grade 2 — age 7)
| ID | Skill id | Input | Generator rule | Tiers |
|----|----------|-------|----------------|-------|
| C08 | `math2.addsub100` | keypad | Add/sub within 100; T1 no carrying, T2 with carrying/borrowing, T3 mixed. Result 0..100. | 3 |
| C09 | `math2.times` | keypad | Table of 2,3,4,5 (T1), + 6–9 (T2), mixed with review (T3). Extends `math.times10`. | 3 |
| C10 | `math2.divide` | keypad | Division as the inverse of the table (e.g. 12 ÷ 3), result integer ≤ 10. | 2 |
| C11 | `math2.missing` | keypad | `□ + 7 = 15`, `□ − 4 = 9`, `□ × 3 = 12`; numbers ≤ 100. | 2 |
| C12 | `math2.compareexpr` | choice | Pick `<`, `>`, `=` for two expressions (e.g. 7+8 ○ 20−4). | 2 |
| C13 | `math2.clock` | choice | Inline-SVG analog clock: full hours (T1), half hours (T2), quarters (T3). Options in "3:30" format. | 3 |
| C14 | `math2.money` | keypad | Coins/notes of the hryvnia drawn as emoji/labels (coin set supplied by you: 1, 2, 5, 10, 20, 50, 100 ₴) — sum ≤ 100. | 2 |
| C15 | `math2.units` | choice | Compare/convert см–дм–м with whole numbers (1 дм = 10 см, 1 м = 100 см), choose the correct. | 2 |
| C16 | `math2.words` | keypad | Word problems from templates (data file with 20+ templates with slots `{a}`, `{b}`, `{name}`, `{item}`); answers ≤ 100. **Templates must be reviewed (§4).** | 2 |
| C17 | `math2.evenodd` | choice | Even/odd (парне/непарне), next/previous number, tens and ones digit questions. | 2 |

### D-Ukrainian language (data from §4 required)
| ID | Skill id | Grade | Input | Generator rule | Data needed |
|----|----------|-------|-------|----------------|-------------|
| C18 | `ukr0.letter` | 0 | choice | Show a letter (upper+lower) → choose the picture whose word starts with it. | 33 letters; ≥ 60 words with emoji, first letter. |
| C19 | `ukr0.firstsound` | 0 | choice | Voice says the word (🔊) → choose the first letter among 3. | same words |
| C20 | `ukr0.vowelcons` | 0 | choice | "Голосна чи приголосна?" for a letter. | letter sets |
| C21 | `ukr0.syllables` | 0 | choice | Picture of a word → how many syllables (1–4)? | words with syllable counts |
| C22 | `ukr0.missingletter` | 0 | choice | Picture + word with one missing letter → choose letter. | word list |
| C23 | `ukr0.case` | 0 | choice | Match uppercase to lowercase. | none (letter table) |
| C24 | `ukr2.syllables` | 2 | tiles | Split a word into syllables by tapping tiles; or choose the number. | words with syllable splits |
| C25 | `ukr2.stress` | 2 | choice | Choose the stressed vowel (наголос) in a word. | **words with verified stress** |
| C26 | `ukr2.spelling` | 2 | choice | Missing letter in words with e/и, і/и, apostrophe, ь, ЖИ/ШИ, ЧА/ЩА (one rule per tier). | **verified word list per rule** |
| C27 | `ukr2.wordtype` | 2 | choice | Noun / verb / adjective by question word (хто? що? що робить? який?). | classified words |
| C28 | `ukr2.antonyms` | 2 | choice | Choose the opposite word (antonyms), tier 2 synonyms. | verified pairs |
| C29 | `ukr2.sentence` | 2 | tiles | Build a sentence from shuffled words; capital letter + final punctuation. | verified sentences |

### D-Nature ("Я досліджую світ")
| ID | Skill id | Grade | Input | Generator rule | Data |
|----|----------|-------|-------|----------------|------|
| C30 | `nat0.animals` | 0 | choice | Domestic vs wild; who lives where (ліс/ферма/море/небо). | ≥ 40 animals with emoji, group, habitat |
| C31 | `nat0.seasons` | 0 | choice | Season by picture/weather/clothes; sequence of seasons; parts of the day. | facts list |
| C32 | `nat0.fruitveg` | 0 | choice | Fruit or vegetable; colour of a fruit. | items list |
| C33 | `nat0.body` | 0 | choice | Body parts and senses ("Чим ми бачимо?"). | facts list |
| C34 | `nat2.animalgroups` | 2 | choice | Mammal / bird / fish / insect / amphibian / reptile. | verified animals |
| C35 | `nat2.plants` | 2 | choice | Plant parts (корінь, стебло, лист, квітка, плід), what plants need. | facts |
| C36 | `nat2.foodchain` | 2 | tiles | Order a simple food chain (grass → rabbit → fox). | chains |
| C37 | `nat2.water` | 2 | choice | States of water; water cycle order. | facts |
| C38 | `nat2.calendar` | 2 | choice | Months, days of the week, "what comes after…". | none |
| C39 | `nat2.ukraine` | 2 | choice | Capital, Dnipro, Carpathians, Black Sea, national symbols. | **verified facts** |
| C40 | `nat2.safety` | 2 | choice | Traffic light, crossing the street, fire/emergency numbers (verify numbers). | verified facts |

**Pokémon hook (Phase E):** map Pokémon types to nature topics (water type ↔ water/sea animals, grass ↔ plants, bird ↔ birds). Correct nature answers have a higher chance to catch a matching type. Data: a `type` field per Pokémon family (task E6).

### D-English
| ID | Skill id | Grade | Input | Generator rule | Data |
|----|----------|-------|-------|----------------|------|
| C41 | `eng0.listen` | 0 | choice | Voice says the English word → tap the matching emoji (3 options). | words with emoji (T-words step) |
| C42 | `eng0.colors` / `eng0.numbers` | 0 | choice | Colour patches / numbers 1–10 → English word. | lists |
| C43 | `eng0.greetings` | 0 | choice | Hello/Goodbye/Thank you/Please → situation emoji. | phrases (verified) |
| C44 | `eng2.spell` | 2 | tiles | Emoji + scrambled letters → build the word. | words with emoji |
| C45 | `eng2.reverse` | 2 | choice | English → Ukrainian choice (reverse direction). | existing words |
| C46 | `eng2.sentence` | 2 | choice | "I have a ___" / "This is a ___" with emoji; 3 options. | templates (verified) |
| C47 | `eng2.days` | 2 | choice | Days, months, family members, school items. | lists |
| C48 | `eng2.opposites` | 2 | choice | big/small, hot/cold, open/close … | pairs |

**Word-bank expansion (code task, no new language):** `E0 · words+emoji` — fill `emoji` and `topic` for all existing words using a map provided by you (validator script `tests/unit/words.test.js`: every word has emoji, unique ids, grade 0 ≥ 60 words, grade 2 ≥ 80 words, as in the old PM-17a).

---

# PHASE E — Engagement (Pokémon theme, ordered by value / effort)

| ID | Feature | What it is | Size |
|----|---------|------------|------|
| E1 | **Pokéball catch animation** | On a correct answer a Pokéball (CSS-only) wobbles 3× and the Pokémon appears; skipped when animations off/reduced motion. | S |
| E2 | **Rounds of 10 + stars** | 10 questions → result screen with 1–3 stars (first-try count), only positive wording. Reward: a bonus catch at 3 stars. (old PM-12) | M |
| E3 | **Daily streak** | 5 correct per day keeps the streak; neutral message on a miss; no loss of Pokémon. (old PM-13) | S |
| E4 | **Trainer badges** | A badge per subject for 20/50/100 correct answers; "trainer card" screen. | M |
| E5 | **Rarity & shiny** | Rare Pokémon need a higher tier; 1-in-20 "shiny" variant (CSS hue filter) — collectable. | S |
| E6 | **Pokémon types** | Add `type` to each family (data task, you verify) → type filter in the catalog; hook to nature skills. | M |
| E7 | **Regions map** | World map screen: 4 regions = 4 subjects; each region shows its catch progress. | M |
| E8 | **Team of 3** | Child picks 3 favourite Pokémon shown on the main screen and cheering after correct answers. | S |
| E9 | **Mini-game: memory pairs** | 8 or 12 cards (letters/numbers/English word ↔ emoji), a catch on completion. (old PM-17b) | M |
| E10 | **Mini-game: number line** | Drag a Pokémon to the right place on 0–20 (grade 0) / estimate on 0–100 (grade 2). (old PM-17c) | M |
| E11 | **Sibling mode** | Profiles for two kids with their own avatars and collections + a shared "family Pokédex" total. (Old spec had this out of scope — your decision.) | M |
| E12 | **Parent corner** | Adult gate (e.g. `(a×b)+c`), per-skill accuracy table, reset per profile, toggles for voice/hints. (old PM-14) | M |
| E13 | **PWA / offline** | `manifest.webmanifest`, icons, `sw.js` caching app shell + artwork on first view; "Add to Home Screen" works. (old PM-15) | M |

Notes: E1–E3 first (cheap, highest delight); E11 only if you want two separate collections — the current design already separates by grade, which is effectively two profiles. Child safety: no timers that punish (G3), no chat, no external links.

---

## 3. Execution order & dependencies

1. **A:** T01 → T02 → T03 → T04 → T05 → T06 → T07 → T08 → T09 → T10 → T11 → T12 → T13 → T14 → T15 → T16 → T17 → T18 → T19 → T20 → T21 → T22 → T23 → T24 (T22–T24 can run in parallel with B).
2. **B:** T25 → T26 → T27 → T28 → T29 → T30 → T31 → T32 → T33 → T34 → T35.
3. **C:** T36 → T37 → T38 → T39 → T40 → T41 → T42.
4. **D:** after T20 + T36 + T39: math first (C01–C17, no Ukrainian text risk), then English (C41–C48), then Ukrainian/Nature after §4 data exists.
5. **E:** E1 → E2 → E3 → E4 → E5 → E8 → E9 … by your taste.

Mapping from the old plan: PM-00 → T10–T15; PM-01 → T41; PM-02 → T38; PM-03/06 → T40; PM-04 → T42; PM-05 → E2/E4; PM-07 → T39 + C04; PM-08/10/11 → T37/T38 (SRS for English later); PM-09/17a → E0 word task; PM-12/13 → E2/E3; PM-14 → E12; PM-15 → E13; PM-16 → T10 (split by grade; math/English combined catalog already shared); PM-17b/c → E9/E10; PM-18 → Phase B.

## 4. Educational content — how to get it right

- The local 27B model should write **code and tests**, not authoritative Ukrainian language content. Typical failure modes: wrong stress, wrong е/и, invented words, wrong ь/апостроф.
- Recommended flow: (1) a content step produces `js/data/*.js` files with `reviewed:false`; (2) you (or the teacher) review quickly; (3) set `reviewed:true`; (4) a unit test blocks release if any data item is `reviewed:false`. I can draft the content banks for you in this chat or in a separate session and you review them.
- Before building grade-specific skills, check the actual school programme/textbooks for the current term so the game practises what is being taught (programme details differ between schools and years — I have not verified the current curriculum).
- English skills for grade 0 should be audio-first (🔊) because pre-readers cannot read the Ukrainian prompt.

## 5. Decisions needed from you (defaults in brackets)

1. Drop `build.py` and go no-build (**yes**).
2. JS style: modern syntax without modules (**yes**) vs strict ES5 as the old spec (no).
3. Repo public or private (**private if the Pages plan allows; otherwise public with the disclaimer**).
4. Two-kid profiles (E11) now or later (**later**).
5. Who produces and reviews the Ukrainian content banks (**Claude drafts, you review**).
6. Keep hot-linked artwork (**yes, plus offline caching in E13**) vs bundling images (not recommended: licensing + size).
