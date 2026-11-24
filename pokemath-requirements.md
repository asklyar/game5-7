# Математичні Покемони — Improvement Requirements (Kanban / OpenCode)

**Product:** single-file Ukrainian math + English game for children aged 5 and 7 (`index.html`).
**Spec version:** 1.0 · **Date:** 2026-11-24 · **Source of truth for current behaviour:** `STATUS.md` + `index.html`.

How to use this file: each `PM-xx` section is one self-contained Kanban ticket. An agent must read **§0 Global constraints** and **PM-00 (Foundation)** before any other ticket, then implement only its own ticket.

---

## 0. Global constraints (apply to EVERY ticket)

### 0.1 Product rules
- **G1** All visible UI text is **Ukrainian** (English only for English-task content). Suggested strings below are drafts and need a native-speaker review before release.
- **G2** Text readability rules in `STATUS.md` are mandatory: font `"Andika","Verdana","Tahoma",sans-serif`; ≥22px body; line-height 1.4–1.5; no all-caps for running text (English task prompts/options stay uppercase); left-aligned; short lines.
- **G3** Target users are 5-year-olds (non-readers or early readers) and 7-year-olds. Wrong answers are never punished: no lost progress, no red flashing, no negative sounds, no timers that fail the child.
- **G4** Tap targets ≥ **48×48 px**. Layout must work at **360×640** (phone) up to desktop, with no horizontal scroll.
- **G5** Meaning is never carried by colour alone (always icon or text too). Animations ≤ 3 flashes/second and respect `prefers-reduced-motion`.
- **G6** **No data leaves the device.** No analytics, accounts or new network requests. (Only exceptions: the existing Pokémon artwork URL `ART`, and PM-15 caching it.)
- **G7** Every new behaviour that can annoy (sound, voice, hints) must be switchable in Settings (PM-00) and default to a sensible value stated in the ticket.

### 0.2 Engineering rules
- **E1** Match existing code style: plain ES5-style JavaScript (`var`, `function`), no frameworks, no npm runtime dependencies, no `import`.
- **E2** Do not break existing behaviour. Existing `autotest.py` (≈41 assertions) must stay **PASS**.
- **E3** Never throw on missing capability (`speechSynthesis`, `AudioContext`, `localStorage`, service worker). Feature-detect and degrade silently.
- **E4** `localStorage` keys use the prefix `pokemath_`. Every new key is documented in the "Storage keys" table in `STATUS.md`. Wrap all access in try/catch via `PM.store` (PM-00).
- **E5** Be deterministic under test: use `PM.rnd`, `PM.now()` (PM-00), never call `Math.random()` or `Date.now()` directly in new code.
- **E6** Definition of Done for every ticket:
  1. All acceptance criteria (AC) pass; 2. new automated tests added and green; 3. whole test suite green (`python3 run_tests.py`); 4. `python3 build.py --check` passes (see PM-00); 5. `STATUS.md` updated (feature list, backlog tick, storage keys, last test run); 6. no console errors in headless Chrome; 7. PR description lists what was manually verified and what was **not**.

### 0.3 What the spec author did NOT verify
- `autotest.py` and the first ~580 lines of `index.html` (menu markup, `POKEMON` data, CSS beyond line ~220) were not read in full. Function names below (`newQuestion`, `renderMathQuestion`, `newEnglishQuestion`, `checkAnswer`, `checkEnglish`, `catchPokemon`, `saveGame`, `loadGame`, `startGame(level, mode)`, `applyTheme`, `show(id)`; globals `LEVEL`, `MODE`, `question`, `collection`, `score`, `caught`, `inputStr`) come from the lines that were read. **Agents must open the real code first and adapt**; line numbers are intentionally not used.
- Nothing was run on a real tablet/phone. Voice availability (PM-01) and audio autoplay (PM-04) must be verified on the target device.

---

## 1. Orchestration guide

### 1.1 Dependency graph and waves

| Wave | Tickets | Rule |
|---|---|---|
| 0 | **PM-00** Foundation | Blocks everything. Merge first. |
| 1 (parallel) | PM-01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 15, 16, 17a | Each depends only on PM-00. |
| 2 (parallel) | PM-14 (needs PM-10), PM-17b (needs PM-09), PM-17c | Start after their dependency is merged. |

Soft dependencies (use only if present, feature-detect; never required): PM-03→PM-06 hints; PM-14→PM-12/13; PM-17b→PM-01 voice.

### 1.2 Parallel-safety rules
- One ticket = one branch `feat/pm-XX-slug` in its own git worktree.
- After PM-00, the game is built from `src/` into `index.html` (see PM-00 R1). **Agents edit only `src/`**, never the generated `index.html`. A ticket adds its own files (`src/js/features/<slug>.js`, `src/css/features/<slug>.css`, `tests/test_pm_XX.py`) and only touches shared files where its "Files touched" says so.
- **Merge order within a wave:** smallest effort first (S → M → L); rebase on `main`, rerun the full suite after each merge.
- **Known shared hot-spots** (expect small conflicts): settings toggles, menu cards, `STATUS.md`. Resolve by keeping both sides.
- **Behavioural interactions to respect:** question selection goes through weighters (PM-02, 10, 11, 08 all plug in; see PM-00 R4). Feedback timing: sound (PM-04) plays first, voice (PM-01) starts ≥ 400 ms later.

### 1.3 Prompt template to give OpenCode per ticket
> Implement ticket **PM-XX** from `pokemath-requirements.md`. First read §0 (Global constraints) and PM-00's API. Open `index.html`/`src/`, `autotest.py` and `STATUS.md` to confirm the real code before changing anything. Touch only the files listed in the ticket. Implement every `[M]` requirement; `[S]` only if time allows and mark which you skipped. Add tests, run `python3 run_tests.py` and `python3 build.py --check`, update `STATUS.md`, and finish with a PR description covering: what changed, AC checklist, what you could not verify.

### 1.4 Open decisions for the product owner (defaults are used if not answered)

| ID | Decision | Default |
|---|---|---|
| D1 | Migration of the old shared save (`pokemath_l5/l7`) when PM-16 splits subjects | Copy legacy into **Math only**; English starts fresh; legacy key kept untouched as backup |
| D2 | What the catalog shows after PM-16 | Combined view (highest stage per family across Math + English) |
| D3 | Source split + build step (PM-00) vs. staying hand-edited single file | Split + build (needed for safe parallel work); deliverable stays one `index.html` |
| D4 | Parent-gate difficulty (PM-14) | `(a × b) + c` with a∈13–19, b∈3–9, c∈1–9 |

---

## PM-00 · Foundation: modular source, build, hooks, storage, settings, test API

- **Stage:** 0 · **Wave:** 0 · **Depends on:** none · **Effort:** L · **Risk:** medium (touches everything; must be behaviour-neutral)
- **Files new:** `build.py`, `run_tests.py`, `src/…`, `tests/…` · **Files touched:** `index.html` (becomes generated), `autotest.py` (moved/kept working), `STATUS.md`
- **Parallel-safe with:** nothing (blocks all)

**Goal.** Make parallel feature work possible without merge conflicts, and give features stable extension points, without changing what the child sees.

**Requirements**
- **R1 [M] Source split + build.** Move CSS, JS and HTML into `src/` (`src/index.template.html`, `src/css/*.css`, `src/js/00-*.js` core, `src/js/features/*.js`, `src/css/features/*.css`). `build.py` inlines everything (files sorted alphabetically, features after core) into one **self-contained `index.html`** with no new external dependencies. `python3 build.py --check` exits non-zero if `index.html` is stale. Build is deterministic. (See D3.)
- **R2 [M] Behaviour neutral.** After the refactor the existing suite passes unchanged (41 PASS) and the game looks and plays identically.
- **R3 [M] Event bus.** `PM.on(event, fn)`, `PM.off`, `PM.emit(event, payload)`. Events (payloads):
  - `game:start {level, mode}` · `game:end {level, mode}` · `menu:shown {}`
  - `question:shown {question, level, mode, attempt:0}`
  - `answer:wrong {question, attempts, hintUsed}` · `answer:correct {question, attempts, hintUsed}`
  - `catch:done {pokemonId, stage, evolved}`
  - Handler errors are caught and logged; they never break the game.
- **R4 [M] Question pipeline.** Factor the current generators into `genCandidates(level, mode, ctx)` (math: N=8 candidates built with existing rules; English: all words in the bank). `PM.registerWeighter(fn(candidate, ctx) → number ≥ 0)` and `PM.pickQuestion()` choose by the **product** of weights; weight 0 excludes a candidate unless all are 0. With no weighters, distribution ≈ current behaviour. Each question carries a stable `key` (e.g. `"+|7|5"`, `"en|bird"`) and `skill` (filled by PM-10).
- **R5 [M] Hint registry.** `PM.registerHint(mode, fn(question, level) → {type, node|text})` and `PM.getHint(question)`; returns `null` when none registered. No hint UI in this ticket.
- **R6 [M] Award API.** `PM.award(reason)` wraps the existing score/caught increment + `catchPokemon()` and emits events, so new game modes reuse the catch/evolve reward.
- **R7 [M] Mode/screen registry.** `PM.registerMode({id, title, icon, levels:[5,7], mount(containerEl, ctx), unmount()})` adds a card to the matching level column in the menu (below Math and English) and a screen container. Existing Math/English may stay hard-coded.
- **R8 [M] Storage.** `PM.store.get(key, default)`, `set(key, value)`, `remove(key)`: JSON, try/catch, in-memory fallback when `localStorage` is blocked. `PM.store.progressKey(mode, level)` returns the **current** keys (`pokemath_l5` / `pokemath_l7`, same for both modes) so no migration happens here.
- **R9 [M] Settings.** A ⚙ button (menu + game topbar) opens a Settings modal. `PM.settings.registerToggle({key, label, default, group})` lets features add switches; `PM.settings.get(key)`, `set`, and a `settings:changed` event. Persisted in `pokemath_settings`. Day/night toggle stays where it is.
- **R10 [M] Determinism.** `PM.rnd(a,b)` replaces `rnd` (same signature) and is seedable via URL `?test=1&seed=N`. `PM.now()` returns a `Date`, overridable via `?test=1&now=YYYY-MM-DDTHH:MM`.
- **R11 [M] Word bank schema.** Convert `EN_WORDS_5/7` from `[uk, en]` to `{uk, en, emoji:"", theme:""}` and update the English generator, keeping behaviour identical (distractors still compared by `en`).
- **R12 [M] Test API.** With `?test=1` expose `window.PM_TEST` with `scenarios` (named functions run at load) and a `<pre id="pm-test-out">` into which a scenario writes JSON results, so tests work with Chrome headless `--dump-dom` (use `--virtual-time-budget` for timers). Provide helpers: `startGame(level,mode)`, `answerCorrect()`, `answerWrong()`, `state()`.
- **R13 [M] Test runner.** `run_tests.py` runs `autotest.py` plus every `tests/test_pm_*.py`; prints PASS/FAIL counts; non-zero exit on failure.
- **R14 [M] Docs.** `STATUS.md` gets an "Architecture & extension points" section (events, registries, storage keys table, how to add a feature, how to run build/tests).

**Acceptance criteria**
- **AC1** Given a clean checkout, when `python3 build.py && python3 run_tests.py` runs, then `index.html` is produced and all existing assertions PASS.
- **AC2** Given a registered weighter that returns 0 for one candidate, when 100 questions are picked, then that candidate never appears.
- **AC3** Given `localStorage` throws, when the game runs, then it works for the session and shows no error.
- **AC4** Given `?test=1&seed=7`, when two page loads run the same scenario, then the sequence of questions is identical.
- **AC5** Given a feature file dropped in `src/js/features/` that calls `PM.settings.registerToggle`, when built, then the toggle appears in Settings with no other file edited.

**Out of scope.** Any visible new feature. **Tests.** AC1–AC5 as scenarios.

---

## PM-01 · Read aloud (voice) for questions and feedback

- **Stage:** 1 · **Wave:** 1 · **Depends on:** PM-00 · **Effort:** M · **Risk:** medium (voice availability differs per device)
- **Files new:** `src/js/features/tts.js`, `src/css/features/tts.css`, `tests/test_pm_01.py`

**Goal.** Early readers can hear the task and the English word, so non-reading children can play.

**Requirements**
- **R1 [M]** `PM.speak(text, lang)` using `speechSynthesis`; cancels any speech in progress; picks a voice whose `lang` starts with `uk` for Ukrainian and `en` for English; never throws.
- **R2 [M]** Math: on `question:shown`, speak the problem by converting symbols to words: `+`→"плюс", `−`→"мінус", `×`→"помножити на", `=`→"скільки буде" (e.g. `7 + 5 = ?` → "7 плюс 5, скільки буде?").
- **R3 [M]** English: on `question:shown`, speak the Ukrainian word (lang `uk`); on correct answer speak the English word (lang `en`).
- **R4 [M]** A **🔊** button next to the question repeats the speech (≥ 48 px).
- **R5 [M]** Speak feedback: "Молодець!" on correct, "Спробуй ще!" on wrong, starting ≥ 400 ms after the event (sound goes first, see PM-04).
- **R6 [M]** Setting `voice` (default **on**). If `speechSynthesis` is missing or no voice exists for a language, hide 🔊 for that language and stay silent (no error message to the child).
- **R7 [S]** Speech rate 0.85 for age 5, 0.95 for age 7.
- **R8 [S]** Do not speak while the catch modal is open, except the English word on a correct answer.

**Acceptance criteria**
- **AC1** Given voice on and a Ukrainian voice available, when a math question appears, then `PM.speak` is called once with the converted text.
- **AC2** Given `speechSynthesis` undefined, when a game starts, then no exception and no 🔊 button.
- **AC3** Given voice off in Settings, when a question appears, then nothing is spoken.
- **AC4** Given two questions in quick succession, then the first utterance is cancelled, not queued.

**Tests.** Stub `speechSynthesis` in a scenario; assert call arguments (AC1, AC3, AC4); delete it for AC2.
**Out of scope.** Recorded audio files, speech recognition.

---

## PM-02 · No repeated questions

- **Stage:** 1 · **Wave:** 1 · **Depends on:** PM-00 · **Effort:** S · **Risk:** low
- **Files new:** `src/js/features/no-repeat.js`, `tests/test_pm_02.py`

**Goal.** A child never sees the same (or trivially equivalent) question twice in a row.

**Requirements**
- **R1 [M]** Register a weighter that gives weight 0 to any candidate whose `key` is in the recent window. Window: **math = last 5**, **English = last 2** (English is shorter on purpose so PM-11 can re-ask missed words after ≥ 3 questions).
- **R2 [M]** For `+` and `×`, `a op b` and `b op a` share one key.
- **R3 [M]** If all candidates are excluded (tiny bank), fall back to the least recent. Never loop forever.
- **R4 [M]** History is per mode+level, in memory only, reset on `game:start`.
- **R5 [S]** Wrong attempts do not change history (same question stays until solved).

**Acceptance criteria**
- **AC1** Given seed 1 and 300 math questions at level 5, then no question repeats within any window of 5.
- **AC2** Given 300 English questions at level 7, then no word repeats within any window of 2.
- **AC3** Given `3 + 4` was just asked, then `4 + 3` is not asked within 5 questions.

**Tests.** Seeded scenario recording keys. **Out of scope.** Persisting history.

---

## PM-03 · Soft retry with escalating help

- **Stage:** 1 · **Wave:** 1 · **Depends on:** PM-00 (soft: PM-06) · **Effort:** M · **Risk:** low
- **Files new:** `src/js/features/soft-retry.js`, `src/css/features/soft-retry.css`, `tests/test_pm_03.py` · **Files touched:** answer checking hooks only via events (no edits to `checkAnswer` beyond emitting events if PM-00 did not)

**Goal.** A stuck child gets progressively more help but never the answer handed over.

**Requirements**
- **R1 [M]** Count `attempts` per question (reset on new question); included in `answer:wrong/correct` payloads.
- **R2 [M]** Attempt 1 wrong: current "Спробуй ще! ❌" (unchanged).
- **R3 [M]** Attempt 2 wrong, **math**: show a text hint. `+`: "Почни з {a} і додай {b}"; `−`: "Почни з {a} і відніми {b}"; `×`: "Додавай {a} по колу {b} разів". Never state the result.
- **R4 [M]** English: on each wrong attempt after the first, grey out and disable one **wrong** option, until two options remain. The correct option is never disabled.
- **R5 [M]** Attempt 3+ wrong, math: if a hint provider is registered (PM-06), open it automatically once.
- **R6 [M]** After a wrong math answer, shake the answer box (respect reduced motion) and clear the input after 600 ms so the child can retype.
- **R7 [M]** Hints do not reduce score or block progress. Payload carries `hintUsed:true` once any hint was shown.
- **R8 [S]** Setting `hints` (default on) disables R3–R5.

**Acceptance criteria**
- **AC1** Given a wrong answer once, then only "Спробуй ще! ❌" shows.
- **AC2** Given two wrong English answers, then exactly one wrong option is disabled and the correct option is enabled.
- **AC3** Given any number of wrong answers, then the numeric result never appears in hint text.
- **AC4** Given a correct answer after hints, then the normal catch flow happens and the payload has `hintUsed:true`.

**Tests.** Scenarios with `answerWrong()`. **Out of scope.** Visual hint (PM-06), adaptive difficulty (PM-10).

---

## PM-04 · Sound effects (synthesised, no audio files)

- **Stage:** 1 · **Wave:** 1 · **Depends on:** PM-00 · **Effort:** S · **Risk:** low
- **Files new:** `src/js/features/sound.js`, `tests/test_pm_04.py`

**Requirements**
- **R1 [M]** `PM.sound.play(name)` for `correct`, `wrong`, `catch`, `evolve`, `tap` using Web Audio oscillators. No audio assets.
- **R2 [M]** `AudioContext` is created lazily on the first user gesture and resumed if suspended.
- **R3 [M]** Master gain ≤ 0.2. Each sound ≤ 600 ms. `wrong` is a **soft, low, short** blip (never a buzzer). `evolve` is a rising arpeggio distinct from `catch`.
- **R4 [M]** Subscribe to `answer:correct`, `answer:wrong`, `catch:done` (play `evolve` if `evolved` else `catch`).
- **R5 [M]** Setting `sound` (default **on**). Absent `AudioContext` → silent, no error.
- **R6 [S]** `tap` on keypad presses, quiet.

**Acceptance criteria**
- **AC1** Given sound off, then no oscillator is created.
- **AC2** Given a correct answer that evolves a Pokémon, then `evolve` plays, not `catch`.
- **AC3** Given no `AudioContext`, then no exception.

**Tests.** Stub `AudioContext` and count `createOscillator`. **Manual:** loudness check on a real tablet. **Out of scope.** Music.

---

## PM-05 · Progress counter and milestones

- **Stage:** 1 · **Wave:** 1 · **Depends on:** PM-00 · **Effort:** S · **Risk:** low
- **Files new:** `src/js/features/progress.js`, `src/css/features/progress.css`, `tests/test_pm_05.py`

**Requirements**
- **R1 [M]** Menu: under each level column show "Спіймано X/{N}" and "Еволюцій Y/{M}" with a progress bar, where N = `POKEMON.length` and M = total evolutions available, **computed from data, not hard-coded** (currently 98 families / 200 stages).
- **R2 [M]** Read saved progress via `PM.store.progressKey(mode, level)` so the display stays right when PM-16 changes keys.
- **R3 [M]** Game topbar shows "Спіймано X/N".
- **R4 [M]** Every 10th correct answer in a session shows a short toast "🎉 10 правильних!" (10, 20, …) that does not block input.
- **R5 [S]** Bar has `role="progressbar"` with `aria-valuenow/max`.

**Acceptance criteria**
- **AC1** Given a saved collection with 3 families caught and 1 evolved, then the menu shows the matching numbers.
- **AC2** Given no saved data, then it shows 0 and no error.
- **AC3** Given 10 correct answers in one session, then exactly one toast appears.

**Tests.** Fixture in `localStorage`, read DOM. **Out of scope.** Rewards other than the toast.

---

## PM-06 · Visual hints for math (dots / icons)

- **Stage:** 2 · **Wave:** 1 · **Depends on:** PM-00 · **Effort:** M · **Risk:** low
- **Files new:** `src/js/features/visual-hint.js`, `src/css/features/visual-hint.css`, `tests/test_pm_06.py`

**Requirements**
- **R1 [M]** Register a math hint provider (`PM.registerHint("math", …)`). Add a **💡 Підказка** button in math mode that opens a bottom sheet; tapping anywhere closes it.
- **R2 [M]** Rendering with DOM/CSS or inline SVG, no images:
  - `+`: two groups of the same icon (random per question from 🍎 🍓 ⭐ 🐟), second group visually distinct (outline or tint).
  - `−`: `a` icons, the last `b` marked crossed-out/faded with ✖.
  - `×`: `b` rows of `a` icons.
- **R3 [M]** Layout for counting: rows of 5 with a gap after 5 (ten-frame style); for more than 20 items use groups of 10; for > 60 items use smaller dots. Must fit 360×640 without scrolling.
- **R4 [M]** The sheet never prints the numeric result. `aria-label` describes the situation ("7 яблук і 5 яблук").
- **R5 [M]** Setting `hints` (default on) hides the button. Sets `hintUsed` on the question.
- **R6 [S]** Level 5 default shows the button as always visible; level 7 shows it after the first wrong answer.

**Acceptance criteria**
- **AC1** Given `7 + 5`, then 7 + 5 icons render in two groups.
- **AC2** Given `12 − 4`, then 12 icons render with exactly 4 marked.
- **AC3** Given `10 × 10`, then 100 dots render without overflowing the viewport.
- **AC4** Given the sheet is open, then no element contains the digits of the result as text.

**Tests.** Count nodes per scenario. **Out of scope.** Animated counting, manipulatives.

---

## PM-07 · Multiple-choice answers for age 5 math

- **Stage:** 2 · **Wave:** 1 · **Depends on:** PM-00 · **Effort:** M · **Risk:** medium (changes the main input for age 5)
- **Files new:** `src/js/features/mc-math.js`, `src/css/features/mc-math.css`, `tests/test_pm_07.py`

**Requirements**
- **R1 [M]** At **level 5 math**, replace the keypad with **4 large answer buttons**, reusing the English option grid style. Level 7 unchanged.
- **R2 [M]** Options: the correct answer plus 3 distinct distractors, all within 0–20, chosen from plausible errors (correct ±1, ±2; the other operation's result when valid; digit swap when both ≤ 20). Never duplicates, never negative. Position of the correct option is uniformly random.
- **R3 [M]** Wrong tap: the tapped button greys out and is disabled; the question stays (PM-03 hints still work).
- **R4 [M]** Correct tap: same flow as today (`score++`, `caught++`, `catchPokemon`).
- **R5 [M]** Setting "Відповідь для 5 років: Кнопки / Клавіатура" (default **Кнопки**); choosing Клавіатура restores the keypad.
- **R6 [S]** Desktop keys 1–4 select options.

**Acceptance criteria**
- **AC1** Given level 5 math, then 4 distinct options appear and exactly one equals the correct answer.
- **AC2** Given 1000 generated questions, then no option is outside 0–20 or duplicated.
- **AC3** Given setting = Клавіатура, then the keypad is shown and the buttons are hidden.
- **AC4** Given level 7, then the keypad is shown regardless of the setting.

**Tests.** Seeded generation test + DOM check. **Out of scope.** Level 7 multiple choice.

---

## PM-08 · Difficulty ramp-up (tiers) for age 7 math

- **Stage:** 2 · **Wave:** 1 · **Depends on:** PM-00 · **Effort:** M · **Risk:** medium (replaces random mix)
- **Files new:** `src/js/features/math-tiers.js`, `src/css/features/math-tiers.css`, `tests/test_pm_08.py`

**Requirements**
- **R1 [M]** Define tiers in a config table `MATH_TIERS = {7:[…], 5:[…]}`. Level 7: **T1** +/− within 20 · **T2** +/− within 60 · **T3** × tables {2,5,10} · **T4** adds {3,4} · **T5** adds {6,7,8,9}, mixed with all operations.
- **R2 [M]** Candidate generation honours the current tier. 20% of questions come from earlier tiers (review).
- **R3 [M]** **Advance** when the last 10 answers in the tier include ≥ 8 correct on the first attempt (minimum 10 answered). Show a toast "Новий рівень! 🎉" and the tier number "Рівень 3/5" in the topbar.
- **R4 [S]** **Step back** one tier (never below T1) when the last 10 contain ≤ 3 first-try correct; show a neutral message "Потренуємось ще 🙂".
- **R5 [M]** Persist the tier in `pokemath_tier_l7`. A new player starts at T1.
- **R6 [S]** Menu picker to start at any unlocked tier. Level 5 tiers (≤10 then ≤20) are config-ready but shipping them is optional.
- **R7 [M]** Existing level 7 rules still hold at T5 (+/− up to 60, × up to 10).

**Acceptance criteria**
- **AC1** Given a new player, then every question is +/− with results ≤ 20.
- **AC2** Given 10 first-try-correct answers at T1, then the tier becomes T2 and the toast appears.
- **AC3** Given T3, then multiplication questions only use factors from {2,5,10} (except the 20% review).
- **AC4** Given a page reload, then the tier is restored.

**Tests.** Scenario with `answerCorrect()` ×10. **Out of scope.** Division, word problems.

---

## PM-09 · Pictures with English words

- **Stage:** 2 · **Wave:** 1 · **Depends on:** PM-00 (R11 schema) · **Effort:** S · **Risk:** low
- **Files new:** `src/js/features/en-pictures.js`, `src/css/features/en-pictures.css`, `tests/test_pm_09.py` · **Files touched:** word banks (data fill-in only)

**Requirements**
- **R1 [M]** Fill `emoji` for **every word in both banks** (currently 26 + 28). Use an unambiguous emoji per word (colours → coloured circle; numbers → keycap emoji; seasons/times → clear symbol). List any word without a good emoji in the PR description; at most 10% may stay empty.
- **R2 [M]** In English mode, show the emoji large (≥ 64 px) above the Ukrainian word. The 4 English options stay text only (no emoji on options, to avoid giving the answer away).
- **R3 [M]** Fonts: add a colour-emoji fallback stack (`"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji"`).
- **R4 [M]** Words with empty emoji render as today without a blank gap.
- **R5 [S]** Setting "Картинка біля слова" (default on).

**Acceptance criteria**
- **AC1** Given any English question, then the emoji is shown when the word has one.
- **AC2** Given the validation script, then ≥ 90% of words have an emoji and no two different words share the same emoji within one bank.
- **AC3** Given setting off, then the emoji is hidden.

**Tests.** Data validation + DOM check. **Out of scope.** New words (PM-17a), voice (PM-01).

---

## PM-10 · Per-skill tracking and adaptive weighting

- **Stage:** 3 · **Wave:** 1 · **Depends on:** PM-00 · **Effort:** M · **Risk:** medium
- **Files new:** `src/js/features/skills.js`, `tests/test_pm_10.py`

**Requirements**
- **R1 [M]** `skillOf(question)`: math → `add_20`, `sub_20`, `add_60`, `sub_60`, `mul_<table>` (table = the smaller factor); English → `en:<theme>` (word-level data kept separately under the word key).
- **R2 [M]** On `answer:correct/wrong` update per-skill stats: `attempts`, `firstTryCorrect`, `lastSeen`, and a ring buffer of the last 10 first-try outcomes. Hint-assisted answers count as not first-try-correct.
- **R3 [M]** Persist in `pokemath_skills_l5` / `pokemath_skills_l7`; size must stay small (≤ 20 KB).
- **R4 [M]** Weighter: if any skill has ≥ 5 attempts and recent first-try accuracy < 70%, draw **~60%** of questions from the weakest skills and **~40%** mixed; otherwise uniform. Never starve a skill completely.
- **R5 [M]** `PM.skills.report()` returns `[{skill, attempts, accuracy, trend, needsAttention}]` for PM-14. `needsAttention` = accuracy < 60% with ≥ 10 attempts.
- **R6 [M]** No visible UI in this ticket.

**Acceptance criteria**
- **AC1** Given one skill at 30% accuracy over ≥ 5 attempts and others at 90%, when 1000 questions are drawn with a seed, then 55–65% come from the weak skill.
- **AC2** Given no stats, then selection is uniform.
- **AC3** Given a reload, then stats persist.

**Tests.** Seeded statistical test. **Out of scope.** UI (PM-14), spaced repetition (PM-11).

---

## PM-11 · Spaced repetition for English words

- **Stage:** 3 · **Wave:** 1 · **Depends on:** PM-00 · **Effort:** M · **Risk:** medium (interacts with PM-02/10)
- **Files new:** `src/js/features/srs.js`, `tests/test_pm_11.py`

**Requirements**
- **R1 [M]** Leitner boxes per word, stored in `pokemath_srs_l5` / `pokemath_srs_l7`: new or missed → box 1; each first-try correct moves up one box (max 3).
- **R2 [M]** Re-ask schedule: a missed word returns after **3–4 questions**; box 2 after ~8 questions; box 3 after ≥ 1 calendar day (use `PM.now()`).
- **R3 [M]** Weighter: due words get ×5 weight. It must coexist with PM-02 (English window = 2) and PM-10.
- **R4 [S]** At the start of an English session up to 3 due words are asked first.
- **R5 [M]** A hint-assisted correct answer does not promote a word.

**Acceptance criteria**
- **AC1** Given a word answered wrong at question n, then it appears again at n+3 or n+4 (no repeat before n+3).
- **AC2** Given a word in box 3 answered correctly today, then it is not due until the next calendar day.
- **AC3** Given a reload, then boxes persist.

**Tests.** Seeded scenario with `PM.now()` override. **Out of scope.** Math repetition.

---

## PM-12 · Short rounds with a finish screen

- **Stage:** 3 · **Wave:** 1 · **Depends on:** PM-00 · **Effort:** M · **Risk:** low
- **Files new:** `src/js/features/rounds.js`, `src/css/features/rounds.css`, `tests/test_pm_12.py`

**Requirements**
- **R1 [M]** A round = 10 questions. Topbar shows "3/10".
- **R2 [M]** After the 10th question and after its catch popup is closed, show a finish screen: ⭐ rating by first-try accuracy (≥ 90% → 3★, ≥ 60% → 2★, else 1★), text "З першої спроби: 8/10", buttons **«Ще раунд ▶»** and **«У меню»**.
- **R3 [M]** Catches/progress are still saved after every answer. Leaving mid-round loses nothing and shows no penalty.
- **R4 [M]** Persist the last 30 rounds in `pokemath_rounds_l5` / `_l7`: `{ts, mode, firstTry, total, seconds}`. `PM.rounds.list()` for other features.
- **R5 [S]** Setting round length 5 / 10 / 15 (default 10).
- **R6 [M]** Positive wording only, even at 1★ ("Гарна робота!").

**Acceptance criteria**
- **AC1** Given 10 correct first-try answers, then 3★ and "10/10".
- **AC2** Given the child exits at question 4, then progress is saved and no summary appears.
- **AC3** Given "Ще раунд", then the counter resets to 0/10.

**Tests.** Scenarios. **Out of scope.** Leaderboards, timers.

---

## PM-13 · Daily streak

- **Stage:** 3 · **Wave:** 1 · **Depends on:** PM-00 · **Effort:** S · **Risk:** low
- **Files new:** `src/js/features/streak.js`, `src/css/features/streak.css`, `tests/test_pm_13.py`

**Requirements**
- **R1 [M]** A day counts when ≥ **5 correct answers** are given (constant, easy to change). Uses the **local calendar date** from `PM.now()`.
- **R2 [M]** Streak = consecutive counted days. Menu shows "🔥 3" and "Сьогодні: 3/5".
- **R3 [M]** A missed day resets the streak to 0 with a **neutral** message ("Почнемо нову серію!"). No guilt wording.
- **R4 [M]** Robust to DST changes and clock moved backwards (never reduces a stored streak or best).
- **R5 [M]** Persist `pokemath_streak`: `{lastDay, count, best, todayDay, todayCorrect}`.
- **R6 [S]** One free miss per 7 days ("Бережемо серію ❄️").
- **R7 [M]** Flame animation once when today's goal is reached; reduced-motion safe.

**Acceptance criteria**
- **AC1** Given 5 correct answers on day 1 and day 2, then streak = 2.
- **AC2** Given a skipped day, then streak = 0 on the next play.
- **AC3** Given 4 correct answers only, then the day does not count.
- **AC4** Given the clock set back by one day, then the stored streak does not decrease.

**Tests.** `PM.now()` overrides. **Out of scope.** Notifications.

---

## PM-14 · Parent corner (progress report)

- **Stage:** 4 · **Wave:** 2 · **Depends on:** PM-10 (soft: PM-12, PM-13) · **Effort:** M · **Risk:** low
- **Files new:** `src/js/features/parent.js`, `src/css/features/parent.css`, `tests/test_pm_14.py`

**Requirements**
- **R1 [M]** A small 👨‍👩‍👧 button in the menu opens an **adult gate**: a generated question `(a × b) + c` with a∈13–19, b∈3–9, c∈1–9 (see D4). Wrong → closes, no hint.
- **R2 [M]** Report from `PM.skills.report()`: per skill attempts, first-try accuracy, trend (last 10 vs previous 10), and a "Потребує уваги" flag when `needsAttention`. Plain language, no jargon.
- **R3 [S]** If present: rounds in the last 7 days and approximate play time (PM-12), streak/best (PM-13). Feature-detect; hide missing parts.
- **R4 [M]** "Скинути прогрес" per level, only after passing the gate again and a second confirmation naming what will be deleted. Settings and theme are kept.
- **R5 [S]** "Копіювати звіт" copies a text summary to the clipboard.
- **R6 [M]** The report works with no data (friendly empty state).

**Acceptance criteria**
- **AC1** Given a wrong gate answer, then the report is not shown.
- **AC2** Given a skill at 40% over 12 attempts, then it is flagged.
- **AC3** Given a reset confirmed for level 5, then level 5 keys are removed and level 7 keys are untouched.
- **AC4** Given PM-12/13 not installed, then no error and those blocks are absent.

**Tests.** Fixture data. **Out of scope.** Cloud sync, multiple child profiles.

---

## PM-15 · Offline-first (installable PWA)

- **Stage:** 4 · **Wave:** 1 · **Depends on:** PM-00 · **Effort:** L · **Risk:** medium (service worker pitfalls)
- **Files new:** `src/sw.js`, `src/manifest.webmanifest`, `src/icons/*`, `src/js/features/pwa.js`, `tests/test_pm_15.py` · **Files touched:** `build.py` (emit extra files, inject cache version)

**Requirements**
- **R1 [M]** **Intentional exception to "single file":** the deploy output is `index.html` + `sw.js` + `manifest.webmanifest` + icons (192/512 px; generate programmatically in the repo). Document it.
- **R2 [M]** Manifest: Ukrainian name, `display: standalone`, theme/background colours, `lang: uk`.
- **R3 [M]** Service worker precaches the app shell. Pokémon artwork (`ART`) is cached at runtime, **cache-first**, with a size limit (≤ 300 entries, oldest evicted).
- **R4 [M]** Cache version = hash of `index.html`, set by `build.py`. New versions install in the background and activate on the **next launch** (never reload mid-game).
- **R5 [M]** Register only when `serviceWorker` is supported and the origin is https or localhost. Under `file://` do nothing, no errors.
- **R6 [S]** Menu option "Завантажити всі картинки для офлайн" with a progress bar. **Before building it, measure and report the total download size**; do not assume it.
- **R7 [M]** Offline run still works: missing artwork falls back to emoji (existing behaviour).
- **R8 [M]** Document deployment (e.g. static hosting or `python3 -m http.server`) and known risk: browsers may clear site storage after long inactivity (notably Safari); verify on the target device and document the findings.

**Acceptance criteria**
- **AC1** Given the app served on localhost and loaded once, when the network is cut, then the game starts and plays.
- **AC2** Given `file://`, then the game works and registers nothing.
- **AC3** Given a rebuilt `index.html`, then the cache version changes.
- **AC4** Given the artwork cache at its limit, then older entries are evicted.

**Tests.** Unit-test the cache/eviction logic; manual checklist for offline behaviour. **Out of scope.** Push notifications, app-store packaging.

---

## PM-16 · Separate progress for Math and English

- **Stage:** 4 · **Wave:** 1 · **Depends on:** PM-00 · **Effort:** M · **Risk:** high (data migration; children's saved progress)
- **Files new:** `src/js/features/split-progress.js`, `tests/test_pm_16.py` · **Files touched:** `PM.store.progressKey`, catalog

**Requirements**
- **R1 [M]** New keys `pokemath_math_l5`, `pokemath_math_l7`, `pokemath_en_l5`, `pokemath_en_l7`. `PM.store.progressKey(mode, level)` returns them.
- **R2 [M]** One-time, **idempotent** migration per level (see D1): if the legacy key exists and the new keys do not, copy legacy into **Math only**; English starts empty. Never delete or modify legacy keys. Record `pokemath_migrated_v1`.
- **R3 [M]** Catalog shows a combined view (highest stage per family across both subjects), labelled clearly (see D2). `[S]` tabs Математика / English / Разом.
- **R4 [M]** The "can no longer be caught" and "collection complete" rules apply **per subject**.
- **R5 [M]** PM-05 counters and any reader of progress use `progressKey` only.
- **R6 [M]** Corrupt JSON in any key must not crash the game (start that subject fresh, keep the broken value untouched).

**Acceptance criteria**
- **AC1** Given only legacy `pokemath_l5` data, when the game loads, then Math level 5 shows the legacy collection and English level 5 is empty; the legacy key is unchanged.
- **AC2** Given migration already done, when the game reloads, then nothing is copied again.
- **AC3** Given a catch in English, then the Math collection is unchanged.
- **AC4** Given corrupt JSON, then the game starts without an error.

**Tests.** Fixture-based migration tests (including idempotency and corruption). **Out of scope.** Moving data between devices.

---

## PM-17a · More English word themes

- **Stage:** 4 · **Wave:** 1 · **Depends on:** PM-00 (schema) · **Effort:** M · **Risk:** low (content quality)
- **Files new:** `src/js/features/words-extra.js` (or data files), `tests/test_pm_17a.py`

**Requirements**
- **R1 [M]** Add themes with 8–10 words each: **age 5** → family, body parts, house; **age 7** → weather, clothes, school things, transport. Target banks: ≥ 60 words (age 5), ≥ 80 words (age 7).
- **R2 [M]** Each word has `uk`, `en`, `emoji`, `theme`. Prefer short, concrete words for age 5 (≤ 6 letters).
- **R3 [M]** `en` must be **unique within a bank** (the distractor logic compares by `en`). Avoid ambiguous or multi-meaning pairs. Follow the spelling convention already used.
- **R4 [M]** Validation script `tests/validate_words.py`: unique `en`; non-empty fields; `en` only letters/spaces/hyphen; length ≤ 14; emoji present for ≥ 90%.
- **R5 [S]** "Тема" picker in the English card (Усі / each theme), default Усі.
- **R6 [M]** Ukrainian and English entries must be reviewed by a human before release; list the new words in the PR.

**Acceptance criteria**
- **AC1** Given the validator, then it passes for both banks.
- **AC2** Given any English question, then 4 distinct options appear.
- **AC3** Given a theme selected, then only that theme's words are asked.

**Out of scope.** Audio recordings, phrases/sentences.

---

## PM-17b · Mini-game: memory pairs (picture ↔ English word)

- **Stage:** 4 · **Wave:** 2 · **Depends on:** PM-09 (emoji data) · **Effort:** M · **Risk:** low
- **Files new:** `src/js/features/game-memory.js`, `src/css/features/game-memory.css`, `tests/test_pm_17b.py`

**Requirements**
- **R1 [M]** Register a mode "🧩 Знайди пару" for both levels via `PM.registerMode`.
- **R2 [M]** Board: age 5 → 8 cards (4 pairs); age 7 → 12 cards (6 pairs). Pairs = emoji card + English word card (uppercase). Words drawn from the existing bank (only words with emoji).
- **R3 [M]** Tap flips a card; two flipped cards: match → stay revealed; mismatch → flip back after 1 s. No timer, no move limit, no penalty. Taps are ignored while two are flipping.
- **R4 [M]** Completing a board calls `PM.award("memory")` once (one catch/evolve per board) and offers "Ще раз" / "У меню".
- **R5 [S]** If PM-01 exists, speak the English word on flip.
- **R6 [M]** Card tap targets ≥ 48 px; board fits 360×640.
- **R7 [M]** Uses seeded `PM.rnd` for the layout.

**Acceptance criteria**
- **AC1** Given age 5, then 8 cards and 4 distinct pairs.
- **AC2** Given a mismatch, then both cards flip back and no score is lost.
- **AC3** Given all pairs matched, then exactly one award is granted.

**Out of scope.** Multiplayer, timers.

---

## PM-17c · Mini-game: number line

- **Stage:** 4 · **Wave:** 2 · **Depends on:** PM-00 · **Effort:** M · **Risk:** medium (touch precision)
- **Files new:** `src/js/features/game-numberline.js`, `src/css/features/game-numberline.css`, `tests/test_pm_17c.py`

**Requirements**
- **R1 [M]** Register "📏 Числова пряма" for both levels via `PM.registerMode`. A round = 10 tasks; completing it calls `PM.award("numberline")` once.
- **R2 [M]** Task A "Де число N?": tap a position on the line. Task B "Яке це число?": a marked point; choose from 4 numbers.
- **R3 [M]** **Age 5:** numbers 0–20 shown as two stacked rows (0–10 and 11–20), every tick labelled or numbered, tick spacing ≥ 28 px; Task A needs the **exact** number (tap snaps to the nearest tick).
- **R4 [M]** **Age 7:** line 0–100 with ticks every 10; Task A is an **estimate**: correct within ±3, and the exact value tapped is shown afterwards. Task B uses 4 options spaced ≥ 5 apart.
- **R5 [M]** Inline SVG, responsive, no horizontal scroll at 360 px.
- **R6 [M]** Wrong tap: gentle feedback and a visual guide (the correct tick pulses once after the second miss); never blocks progress.
- **R7 [S]** Voice reads the task if PM-01 is present.

**Acceptance criteria**
- **AC1** Given age 5 and the target 13, then tapping exactly tick 13 is correct and tick 12 or 14 is wrong.
- **AC2** Given age 7 and the target 47, then taps on 44–50 are correct and 43 or 51 are wrong.
- **AC3** Given 10 solved tasks, then exactly one award is granted.
- **AC4** Given Task B, then 4 distinct options appear and one is correct.

**Out of scope.** Fractions, negative numbers.

---

## Appendix A · Storage keys (existing + planned)

| Key | Owner | Content |
|---|---|---|
| `pokemath_l5`, `pokemath_l7` | existing | collection, score, caught (legacy after PM-16) |
| `pokemath_theme` | existing | `"day"` / `"night"` |
| `pokemath_settings` | PM-00 | JSON of toggles |
| `pokemath_tier_l7` | PM-08 | current math tier |
| `pokemath_skills_l5/l7` | PM-10 | per-skill stats |
| `pokemath_srs_l5/l7` | PM-11 | Leitner boxes |
| `pokemath_rounds_l5/l7` | PM-12 | last 30 rounds |
| `pokemath_streak` | PM-13 | streak data |
| `pokemath_math_l5/l7`, `pokemath_en_l5/l7`, `pokemath_migrated_v1` | PM-16 | split progress |

## Appendix B · Quick ticket index

| ID | Title | Effort | Depends on |
|---|---|---|---|
| PM-00 | Foundation | L | none |
| PM-01 | Read aloud | M | 00 |
| PM-02 | No repeats | S | 00 |
| PM-03 | Soft retry + help | M | 00 |
| PM-04 | Sound effects | S | 00 |
| PM-05 | Progress counter | S | 00 |
| PM-06 | Visual hints | M | 00 |
| PM-07 | Multiple-choice math (age 5) | M | 00 |
| PM-08 | Difficulty tiers (age 7) | M | 00 |
| PM-09 | Pictures with English words | S | 00 |
| PM-10 | Per-skill tracking | M | 00 |
| PM-11 | Spaced repetition | M | 00 |
| PM-12 | Rounds + finish screen | M | 00 |
| PM-13 | Daily streak | S | 00 |
| PM-14 | Parent corner | M | 10 |
| PM-15 | Offline PWA | L | 00 |
| PM-16 | Separate Math/English progress | M | 00 |
| PM-17a | More word themes | M | 00 |
| PM-17b | Memory-pairs mini-game | M | 09 |
| PM-17c | Number-line mini-game | M | 00 |
