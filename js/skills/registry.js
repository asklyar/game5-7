/* ============ SKILL REGISTRY & QUESTION RUNNER (T15) ============
   A "skill" produces one question at a time. See the contract in TASKS.md §1.

   PM.skills.register(skill)  — add a skill (throws on a duplicate id)
   PM.skills.get(id)          — fetch one skill (or undefined)
   PM.skills.list(filter)     — all skills, or filtered by {subject, grade}
   PM.skills.validate(item)   — check a generated item against the contract
   PM.skills.next(ids, ctx)   — pick a skill with the seeded PM.rnd(), call its
                                generate(ctx), validate the item, and return it.

   Adding a skill = add one file that calls PM.skills.register(...) plus one
   <script> line. The runner never invents content; it only picks and validates. */
window.PM = window.PM || {};
(function (P) {
  if (P.skills) return;

  var registry = Object.create(null);

  var INPUTS = { keypad: 1, choice: 1, tiles: 1 };
  var SUBJECTS = { math: 1, ukr: 1, nature: 1, eng: 1 };

  function fail(message) {
    throw new Error('PM.skills: ' + message);
  }

  /* ---- helpers for validate ---- */

  // prompt is what the child sees and hears.
  function validatePrompt(item) {
    var prompt = item.prompt;
    if (prompt == null || typeof prompt !== 'object' || Array.isArray(prompt)) {
      fail('item.prompt must be an object');
    }
    if (typeof prompt.text !== 'string' || prompt.text.length === 0) {
      fail('item.prompt.text must be a non-empty string');
    }
    if (prompt.emoji !== undefined && prompt.emoji !== null && typeof prompt.emoji !== 'string') {
      fail('item.prompt.emoji must be a string or null');
    }
    if (prompt.speak !== undefined && prompt.speak !== null && typeof prompt.speak !== 'string') {
      fail('item.prompt.speak must be a string or null');
    }
  }

  // A 'choice' question must offer a non-empty, unique-labelled set of options
  // that includes the correct answer.
  function validateChoices(item) {
    var options = item.options;
    if (!Array.isArray(options) || options.length === 0) {
      fail("a 'choice' question needs a non-empty options array");
    }
    var seen = Object.create(null);
    var hasAnswer = false;
    for (var i = 0; i < options.length; i++) {
      var opt = options[i];
      if (opt == null || typeof opt !== 'object' || Array.isArray(opt)) {
        fail('choice options must be {label, emoji?} objects');
      }
      if (typeof opt.label !== 'string' || opt.label.length === 0) {
        fail('each choice option needs a non-empty string label');
      }
      if (seen[opt.label]) {
        fail('choice options must be unique, duplicate label: ' + opt.label);
      }
      seen[opt.label] = true;
      if (String(opt.label) === String(item.answer)) hasAnswer = true;
    }
    if (!hasAnswer) {
      fail('choice options must include the correct answer');
    }
  }

  /* ---- validate: structural check of a generated item (TASKS.md §1) ---- */
  function validate(item) {
    if (item == null || typeof item !== 'object' || Array.isArray(item)) {
      fail('generated item must be an object, got ' + typeof item);
    }

    // key — used by the no-repeat window, so it must be a non-empty string.
    if (typeof item.key !== 'string' || item.key.length === 0) {
      fail('item.key must be a non-empty string');
    }

    // prompt — what the child sees and hears.
    validatePrompt(item);

    // input — which UI component answers the question.
    if (!INPUTS[item.input]) {
      fail("item.input must be 'keypad', 'choice' or 'tiles'");
    }

    // answer — the correct answer (number, string, or array for tiles).
    if (item.answer === undefined || item.answer === null) {
      fail('item.answer is required');
    }

    if (item.input === 'choice') validateChoices(item);

    // hint — optional, but must be an object when present.
    if (item.hint !== undefined && item.hint !== null && typeof item.hint !== 'object') {
      fail('item.hint must be an object or null');
    }

    return item;
  }

  /* ---- register / get / list ---- */
  function register(skill) {
    if (skill == null || typeof skill !== 'object' || Array.isArray(skill)) {
      fail('register() needs a skill object');
    }
    if (typeof skill.id !== 'string' || skill.id.length === 0) {
      fail('skill.id must be a non-empty string');
    }
    if (typeof skill.generate !== 'function') {
      fail('skill "' + skill.id + '": generate() must be a function');
    }
    if (Object.prototype.hasOwnProperty.call(registry, skill.id)) {
      fail('duplicate skill id: "' + skill.id + '"');
    }
    if (skill.subject !== undefined && !SUBJECTS[skill.subject]) {
      fail('skill "' + skill.id + '": subject must be math|ukr|nature|eng');
    }
    if (skill.grade !== undefined && skill.grade !== 0 && skill.grade !== 2) {
      fail('skill "' + skill.id + '": grade must be 0 or 2');
    }
    skill.tiers = skill.tiers || 1; // default tier count is 1 (TASKS.md §1)
    registry[skill.id] = skill;
    return skill;
  }

  function get(id) {
    return registry[id];
  }

  function list(filter) {
    var out = [];
    for (var id in registry) {
      if (Object.prototype.hasOwnProperty.call(registry, id)) out.push(registry[id]);
    }
    if (!filter) return out;
    return out.filter(function (s) {
      if (filter.subject && s.subject !== filter.subject) return false;
      if (filter.grade !== undefined && s.grade !== filter.grade) return false;
      return true;
    });
  }

  /* ---- next: pick a skill, generate, validate, return ---- */
  function next(skillIds, ctx) {
    var ids = Array.isArray(skillIds) ? skillIds.slice() : [skillIds];
    var pool = [];
    for (var i = 0; i < ids.length; i++) {
      var s = registry[ids[i]];
      if (!s) fail('next(): unknown skill id "' + ids[i] + '"');
      pool.push(s);
    }
    if (pool.length === 0) fail('next(): no skills to pick from');

    ctx = ctx || {};
    var pickRnd = (typeof ctx.rnd === 'function')
      ? ctx.rnd
      : (typeof P.rnd === 'function' ? P.rnd : Math.random);

    var index = Math.floor(pickRnd() * pool.length);
    if (index < 0 || index >= pool.length) index = 0;

    // Build a fresh context so we never mutate the caller's.
    var genCtx = { rnd: pickRnd, tier: ctx.tier, profile: ctx.profile };
    var item = pool[index].generate(genCtx);
    return validate(item);
  }

  P.skills = {
    register: register,
    get: get,
    list: list,
    next: next,
    validate: validate
  };
})(window.PM);
