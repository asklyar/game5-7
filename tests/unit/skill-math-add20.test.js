// math.add20 skill — see TASKS.md T16.
// Grade 0 addition & subtraction within 0..20, never negative.
//
// The skill must reproduce the old level-5 behaviour and satisfy the skill
// contract (TASKS.md section 1). We run 500 seeded questions through the runner
// and check every item, plus a determinism check.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..', '..');

// Load rng, registry and the skill, in order, into one shared PM sandbox.
function load(search) {
  const sandbox = { URLSearchParams, location: { search: search || '' }, console };
  sandbox.window = sandbox;
  for (const f of ['js/core/rng.js', 'js/skills/registry.js', 'js/skills/math-add20.js']) {
    vm.runInNewContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox);
  }
  return sandbox.PM;
}

// Parse "3 + 4 = ?" / "9 − 2 = ?" (the minus is U+2212).
function parse(text) {
  const m = text.match(/^(\d+)\s*([+\u2212])\s*(\d+)\s*=\s*\?$/);
  assert.ok(m, 'prompt text looks like "a op b = ?": ' + JSON.stringify(text));
  const a = Number(m[1]);
  const b = Number(m[3]);
  const op = m[2];
  const expected = op === '+' ? a + b : a - b;
  return { a, b, op, expected, text };
}

test('math.add20: registered as a grade-0 math skill', () => {
  const PM = load('?seed=1');
  const skill = PM.skills.get('math.add20');
  assert.ok(skill, 'skill is registered');
  assert.strictEqual(skill.subject, 'math');
  assert.strictEqual(skill.grade, 0);
  assert.strictEqual(PM.skills.list({ subject: 'math', grade: 0 }).length, 1);
});

test('math.add20: 500 seeded questions validate, stay in 0..20, correct, no negatives', () => {
  const PM = load('?seed=123');
  let additions = 0;
  let subtractions = 0;

  for (let i = 0; i < 500; i++) {
    const item = PM.skills.next('math.add20', { tier: 0 });

    // contract: next() validates, but check again here.
    assert.strictEqual(PM.skills.validate(item), item);
    assert.strictEqual(item.input, 'keypad');
    assert.strictEqual(item.options, null);
    assert.strictEqual(typeof item.key, 'string');
    assert.ok(item.key.length > 0, 'key is a non-empty string');

    const q = parse(item.prompt.text);

    // correct arithmetic
    assert.strictEqual(item.answer, q.expected, 'answer matches the arithmetic');

    // operands inside 0..20
    assert.ok(q.a >= 0 && q.a <= 20 && q.b >= 0 && q.b <= 20, 'operands in 0..20: ' + q.text);

    // no negative result, and the result is within 0..20
    assert.ok(item.answer >= 0 && item.answer <= 20, 'answer in 0..20: ' + q.text + ' -> ' + item.answer);

    if (q.op === '+') {
      assert.ok(q.a + q.b <= 20, 'addition stays within 20: ' + q.text);
      additions++;
    } else {
      assert.ok(q.b <= q.a, 'subtraction never negative: ' + q.text);
      subtractions++;
    }
  }

  // both operations appear roughly half of the time
  assert.ok(additions > 100 && subtractions > 100, 'both add & sub appear: ' + additions + ' / ' + subtractions);
});

test('math.add20: addition keys are normalised (a+b === b+a)', () => {
  const PM = load('?seed=1');
  for (let i = 0; i < 300; i++) {
    const item = PM.skills.next('math.add20', { tier: 0 });
    const q = parse(item.prompt.text);
    if (q.op === '+') {
      assert.strictEqual(item.key, Math.min(q.a, q.b) + '+' + Math.max(q.a, q.b), 'normalised add key: ' + q.text);
    } else {
      assert.strictEqual(item.key, q.a + '-' + q.b, 'subtraction key is a-b: ' + q.text);
    }
  }
});

test('math.add20: same seed gives the same sequence, different seed differs', () => {
  function sequence(seed, n) {
    const PM = load('?seed=' + seed);
    const out = [];
    for (let i = 0; i < n; i++) out.push(PM.skills.next('math.add20', { tier: 0 }).prompt.text);
    return out;
  }
  const a = sequence(42, 30);
  const b = sequence(42, 30);
  const c = sequence(7, 30);
  assert.deepStrictEqual(a, b);
  assert.notDeepStrictEqual(a, c);
});
