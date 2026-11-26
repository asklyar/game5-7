// eng.vocab.g0 and eng.vocab.g2 skills — see TASKS.md T18.
// English vocabulary skills for grade 0 and grade 2.
//
// The skills satisfy the skill contract (TASKS.md section 1).
// We run 500 seeded questions through the runner for both skills
// and check uniqueness, length 4, correct answer inclusion,
// distractor topic matching, and seed determinism.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..', '..');

// Load words-en, rng, registry and the skill, in order, into one shared PM sandbox.
function load(search) {
  const sandbox = { URLSearchParams, location: { search: search || '' }, console };
  sandbox.window = sandbox;
  for (const f of [
    'js/data/words-en.js',
    'js/core/rng.js',
    'js/skills/registry.js',
    'js/skills/eng-vocab.js'
  ]) {
    vm.runInNewContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox);
  }
  return sandbox.PM;
}

test('eng.vocab: registered as grade-0 and grade-2 english skills', () => {
  const PM = load('?seed=1');
  const g0 = PM.skills.get('eng.vocab.g0');
  assert.ok(g0, 'eng.vocab.g0 is registered');
  assert.strictEqual(g0.subject, 'eng');
  assert.strictEqual(g0.grade, 0);

  const g2 = PM.skills.get('eng.vocab.g2');
  assert.ok(g2, 'eng.vocab.g2 is registered');
  assert.strictEqual(g2.subject, 'eng');
  assert.strictEqual(g2.grade, 2);

  assert.strictEqual(PM.skills.list({ subject: 'eng', grade: 0 }).length, 1);
  assert.strictEqual(PM.skills.list({ subject: 'eng', grade: 2 }).length, 1);
});

test('eng.vocab.g0: 500 seeded questions validate, 4 unique options, includes answer', () => {
  const PM = load('?seed=123');

  for (let i = 0; i < 500; i++) {
    const item = PM.skills.next('eng.vocab.g0', { tier: 0 });

    // contract: next() validates, but check again here
    assert.strictEqual(PM.skills.validate(item), item);
    assert.strictEqual(item.input, 'choice');
    assert.strictEqual(typeof item.key, 'string');
    assert.ok(item.key.length > 0, 'key is a non-empty string');
    assert.strictEqual(typeof item.prompt.text, 'string');
    assert.ok(item.prompt.text.length > 0, 'prompt.text is non-empty');

    // 4 options
    assert.ok(Array.isArray(item.options), 'options is an array');
    assert.strictEqual(item.options.length, 4, 'options length is exactly 4');

    // unique options
    const labels = new Set();
    let hasAnswer = false;
    for (const opt of item.options) {
      assert.strictEqual(typeof opt.label, 'string');
      assert.ok(opt.label.length > 0, 'option label is non-empty');
      // Single word displayed uppercase
      if (!opt.label.includes(' ')) {
        assert.strictEqual(opt.label, opt.label.toUpperCase(), 'single word is uppercase');
      }
      assert.ok(!labels.has(opt.label), 'duplicate option label: ' + opt.label);
      labels.add(opt.label);
      if (opt.label === item.answer) hasAnswer = true;
    }

    assert.ok(hasAnswer, 'options must include the answer: ' + item.answer);
  }
});

test('eng.vocab.g2: 500 seeded questions validate, 4 unique options, includes answer', () => {
  const PM = load('?seed=456');

  for (let i = 0; i < 500; i++) {
    const item = PM.skills.next('eng.vocab.g2', { tier: 0 });

    assert.strictEqual(PM.skills.validate(item), item);
    assert.strictEqual(item.input, 'choice');
    assert.strictEqual(typeof item.key, 'string');
    assert.ok(item.key.length > 0, 'key is non-empty');
    assert.strictEqual(typeof item.prompt.text, 'string');
    assert.ok(item.prompt.text.length > 0, 'prompt.text is non-empty');

    assert.strictEqual(item.options.length, 4, 'options length is 4');
    const labels = new Set();
    let hasAnswer = false;
    for (const opt of item.options) {
      assert.ok(!labels.has(opt.label), 'duplicate label: ' + opt.label);
      labels.add(opt.label);
      if (opt.label === item.answer) hasAnswer = true;
    }
    assert.ok(hasAnswer, 'options include answer');
  }
});

test('eng.vocab: distractors prioritize same topic when topic is set', () => {
  const PM = load('?seed=999');
  const mockWords = [
    { id: 'w1', en: 'cat', uk: 'кіт', topic: 'animals', emoji: '', reviewed: true },
    { id: 'w2', en: 'dog', uk: 'пес', topic: 'animals', emoji: '', reviewed: true },
    { id: 'w3', en: 'fox', uk: 'лис', topic: 'animals', emoji: '', reviewed: true },
    { id: 'w4', en: 'bear', uk: 'ведмідь', topic: 'animals', emoji: '', reviewed: true },
    { id: 'w5', en: 'red', uk: 'червоний', topic: 'colors', emoji: '', reviewed: true },
    { id: 'w6', en: 'blue', uk: 'синій', topic: 'colors', emoji: '', reviewed: true },
  ];

  // Test 100 questions with mock words
  for (let i = 0; i < 100; i++) {
    const item = PM.skills.get('eng.vocab.g0').generate({ rnd: PM.rnd, words: mockWords });
    assert.strictEqual(item.options.length, 4);

    // If answer is an animal, all 4 options must be animals (since there are 4 animals)
    const animalLabels = ['BEAR', 'CAT', 'DOG', 'FOX'];
    if (animalLabels.includes(item.answer)) {
      const optionLabels = item.options.map(o => o.label).sort();
      assert.strictEqual(optionLabels.join(','), animalLabels.join(','));
    }
  }
});

test('eng.vocab: same seed gives same sequence, different seed differs', () => {
  function sequence(seed, n) {
    const PM = load('?seed=' + seed);
    const out = [];
    for (let i = 0; i < n; i++) {
      const item = PM.skills.next('eng.vocab.g0', { tier: 0 });
      out.push(item.key + ':' + item.answer + ':' + item.options.map(o => o.label).join(','));
    }
    return out;
  }

  const s1 = sequence(42, 20);
  const s2 = sequence(42, 20);
  const s3 = sequence(999, 20);

  assert.deepStrictEqual(s1, s2, 'same seed produces identical sequence');
  assert.notDeepStrictEqual(s1, s3, 'different seed produces different sequence');
});
