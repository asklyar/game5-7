# Математичні Покемони — Reference Guide

A single-file Ukrainian math game for children. The whole game (menu, gameplay,
keypad, catalog, catch popup) lives in **`index.html`**. Tests live in
**`autotest.py`**.

_Last updated: 2026-11-23._

---

## What it is

Kids solve problems to **catch and evolve Pokémon**. There are two kinds of
tasks: **math** (arithmetic) and **English** (translate a word). Each correct
answer catches a Pokémon and evolves it toward its strongest form. Progress is
saved in the browser and can be reviewed in a **catalog** that shows every
evolution chain.

---

## Features

### User experience
- Entire interface in **Ukrainian**.
- Large, child-friendly fonts and a bright, colorful theme.
- Big on-screen **numeric keypad** with `⌫` (delete), `C` (clear), `✓` (check).
- Keypad digits are laid out in **standard calculator order**
  (`7‑8‑9` / `4‑5‑6` / `1‑2‑3` / `0`).
- **Desktop keyboard** also works: `0–9` type, `Backspace` deletes,
  `Enter` checks, `Esc` clears.
- Pokémon shown as **official artwork images**, falling back to an emoji if an
  image fails to load.

### Game levels

The **menu is two columns**: left = **5 років · 0 клас**, right = **7 років ·
2 клас**. Each column has a **Math** card and an **English** card, so children
can pick either subject at their age level.

- **Math — 5 years** — addition and subtraction, results 0–20.
- **Math — 7 years** — addition/subtraction up to 60, and multiplication table up to 10.
- **Wrong answer** → "Спробуй ще! ❌"; the child stays on the same problem and
  retries (no progress).
- **Correct answer** → "Молодець! ✅"; a Pokémon is caught and/or evolved.

### English tasks (multiple choice)
- The **same catch-and-evolve logic** as math: a correct answer catches a
  Pokémon and evolves it.
- A **Ukrainian word** is shown **in UPPERCASE** (e.g. `ПТАШКА`); the child
  picks the correct **English translation** from **4 option buttons**, also shown
  in **UPPERCASE** (e.g. `BIRD`).
- **5 years** word bank: animals, colors, numbers 1–10 (`EN_WORDS_5`).
- **7 years** word bank: food, seasons, times, actions, more animals
  (`EN_WORDS_7`).
- In English mode the numeric keypad and answer box are **hidden** and replaced
  by the 4-choice option grid; desktop keyboard input is disabled.
- **Uppercase rule:** every task prompt and every answer is displayed in
  uppercase letters.

### Pokémon, evolution & stars
- A Pokémon has several **evolution stages**; the higher the stage, the more
  stars it earns.
- **Stars:** 1★ for the first stage, +1★ per evolution, **capped at 5★**.
- A Pokémon that has reached its **strongest form can no longer be caught**.
- When nothing left can evolve, a **"Колекцію завершено!"** trophy screen shows.
- The **catch popup** displays the image, name, stars, **ability**, and an
  evolution note ("Новий покемон!" or "⭐ Еволюція! X → Y").

### Catalog
- A grid of **one card per family**, showing image/emoji, name, stars, ability,
  and the next (or "strongest") form.
- Each card has a **"▶ Еволюції"** button that expands the **full evolution
  chain** — every stage with image, name, stars, ability, and a done/locked state.
- Cards are styled by state: locked (not found), caught, or fully evolved.

### Saved progress
- Progress is stored in `localStorage` under `pokemath_l5` and `pokemath_l7`.
- Each level saves its own **collection, score, and caught count**.
- **Math and English share the same storage per level** (e.g. both Math-5 and
  English-5 use `pokemath_l5`), so a Pokémon caught in one subject already
  counts for the other.
- Progress is saved after **every catch** and **restored** when a level starts.

---

## Text readability (always apply) / Читабельність тексту (завжди дотримуватися)

Rules for **all** running text in this game for children aged **5–7**. These are
mandatory, not optional.

- **Font family (шрифт):** `"Andika"`, with fallbacks `"Verdana"`, then
  `"Tahoma"`, then `sans-serif` — e.g.
  `font-family: "Andika", "Verdana", "Tahoma", sans-serif;`.
- **Font size / кегль:** for **5–6 year olds** the optimum is **18–24 pt**
  (≈ **22–28 px** on screen); for **7 year olds** **14–18 pt**. A larger font
  measurably speeds up reading tasks.
- **Line spacing / інтерліньяж:** increased to **1.4–1.5** (≈ **140–150%** of the
  font size) so children don't lose their place between rows.
- **NO ALL-CAPS for running/continuous text:** solid uppercase reads much slower
  because words lose their unique silhouette (ascenders/descenders like
  `б, д, р, у, ф`). **Documented exception:** English multiple-choice options and
  English task prompts are intentionally uppercase by design.
- **Short lines, left-aligned:** optimal line length for beginners is **35–50
  characters** (≈ **6–9 words**), with **no full justification** (to avoid
  "rivers"/gaps between words).
- **Contrast:** dark-gray or black text on a light-cream/white background; an
  overly bright white screen background can cause eye fatigue.

---

## Data model

The Pokémon list is a JavaScript array `POKEMON` inside `index.html`.

- **98 families**, **200 evolution stages** total.
- Each family:
  ```
  { id: "1".."98", emoji, stages: [ { name, dex, emoji, ability }, ... ] }
  ```
- `dex` is the Pokedex number used to load the official artwork image;
  every stage has a `name`, `dex`, `emoji`, and `ability`.

---

## Testing

- Tests run with Chrome headless (`--dump-dom`) driven by `python3` (no Node.js).
- The harness `autotest.py` checks the rendered game (~41 assertions).
- **Last run: 41 PASS / 0 FAIL.**

Run the tests:
```
python3 /Users/as/pokemon-math/autotest.py
```

---

## Files

| File | Role |
|---|---|
| `index.html` | The entire game (single file). |
| `autotest.py` | Chrome-headless test harness. |
| `STATUS.md` | This reference guide. |

---

0. Global constraints (apply to EVERY ticket for development)
0.1 Product rules
G1 All visible UI text is Ukrainian (English only for English-task content). Suggested strings below are drafts and need a native-speaker review before release.
G2 Text readability rules in STATUS.md are mandatory: font "Andika","Verdana","Tahoma",sans-serif; ≥22px body; line-height 1.4–1.5; no all-caps for running text (English task prompts/options stay uppercase); left-aligned; short lines.
G3 Target users are 5-year-olds (non-readers or early readers) and 7-year-olds. Wrong answers are never punished: no lost progress, no red flashing, no negative sounds, no timers that fail the child.
G4 Tap targets ≥ 48×48 px. Layout must work at 360×640 (phone) up to desktop, with no horizontal scroll.
G5 Meaning is never carried by colour alone (always icon or text too). Animations ≤ 3 flashes/second and respect prefers-reduced-motion.
G6 No data leaves the device. No analytics, accounts or new network requests. (Only exceptions: the existing Pokémon artwork URL ART, and PM-15 caching it.)
G7 Every new behaviour that can annoy (sound, voice, hints) must be switchable in Settings (PM-00) and default to a sensible value stated in the ticket.
0.2 Engineering rules
E1 Match existing code style: plain ES5-style JavaScript (var, function), no frameworks, no npm runtime dependencies, no import.
E2 Do not break existing behaviour. Existing autotest.py (≈41 assertions) must stay PASS.
E3 Never throw on missing capability (speechSynthesis, AudioContext, localStorage, service worker). Feature-detect and degrade silently.
E4 localStorage keys use the prefix pokemath_. Every new key is documented in the "Storage keys" table in STATUS.md. Wrap all access in try/catch via PM.store (PM-00).
E5 Be deterministic under test: use PM.rnd, PM.now() (PM-00), never call Math.random() or Date.now() directly in new code.
E6 Definition of Done for every ticket:
All acceptance criteria (AC) pass; 2. new automated tests added and green; 3. whole test suite green (python3 run_tests.py); 4. python3 build.py --check passes (see PM-00); 5. STATUS.md updated (feature list, backlog tick, storage keys, last test run); 6. no console errors in headless Chrome; 7. PR description lists what was manually verified and what was not.
0.3 What the spec author did NOT verify
autotest.py and the first ~580 lines of index.html (menu markup, POKEMON data, CSS beyond line ~220) were not read in full. Function names below (newQuestion, renderMathQuestion, newEnglishQuestion, checkAnswer, checkEnglish, catchPokemon, saveGame, loadGame, startGame(level, mode), applyTheme, show(id); globals LEVEL, MODE, question, collection, score, caught, inputStr) come from the lines that were read. Agents must open the real code first and adapt; line numbers are intentionally not used.
Nothing was run on a real tablet/phone. Voice availability (PM-01) and audio autoplay (PM-04) must be verified on the target device.