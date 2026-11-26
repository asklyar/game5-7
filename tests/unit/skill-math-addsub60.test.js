// math.addsub60 skill — see TASKS.md T17.
// Grade 2 addition & subtraction within 0..60, never negative.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..', '..');

function load(search) {
  const sandbox = { URLSearchParams, location: { search: search || '' }, console };
  sandbox.window = sandbox;
  for (const f of ['js/core/rng.js', 'js/skills/registry.js', 'js/skills/math-addsub60.js']) {
    vm.runInNewContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox);
  }
  return sandbox.PM;
}

function parse(text) {
  const m = text.match(/^(\d+)\s*([+\u2212])\s*(\d+)\s*=\s*\?$/);
  assert.ok(m, 'prompt text looks like "a op b = ?": ' + JSON.stringify(text));
  const a = Number(m[1]);
  const b = Number(m[3]);
  const op = m[2];
  const expected = op === '+' ? a + b : a - b;
  return { a, b, op, expected, text };
}

test('math.addsub60: registered as a grade-2 math skill', () => {
  const PM = load('?seed=1');
  const skill = PM.skills.get('math.addsub60');
  assert.ok(skill, 'skill is registered');
  assert.strictEqual(skill.subject, 'math');
  assert.strictEqual(skill.grade, 2);
  assert.strictEqual(PM.skills.list({ subject: 'math', grade: 2 }).length, 1);
});

test('math.addsub60: 500 seeded questions validate, stay in 0..60, correct, no negatives', () => {
  const PM = load('?seed=123');
  let additions = 0;
  let subtractions = 0;

  for (let i = 0; i < 500; i++) {
    const item = PM.skills.next('math.addsub60', { tier: 0 });

    assert.strictEqual(PM.skills.validate(item), item);
    assert.strictEqual(item.input, 'keypad');
    assert.strictEqual(item.options, null);
    assert.strictEqual(typeof item.key, 'string');
    assert.ok(item.key.length > 0, 'key is a non-empty string');

    const q = parse(item.prompt.text);

    assert.strictEqual(item.answer, q.expected, 'answer matches the arithmetic');
    assert.ok(q.a >= 0 && q.a <= 60 && q.b >= 0 && q.b <= 60, 'operands in 0..60: ' + q.text);
    assert.ok(item.answer >= 0 && item.answer <= 60, 'answer in 0..60: ' + q.text + ' -> ' + item.answer);

    if (q.op === '+') {
      assert.ok(q.a + q.b <= 60, 'addition stays within 60: ' + q.text);
      additions++;
    } else {
      assert.ok(q.b <= q.a, 'subtraction never negative: ' + q.text);
      subtractions++;
    }
  }

  assert.ok(additions > 100 && subtractions > 100, 'both add & sub appear: ' + additions + ' / ' + subtractions);
});

test('math.addsub60: addition keys are normalised (a+b === b+a)', () => {
  const PM = load('?seed=1');
  for (let i = 0; i < 300; i++) {
    const item = PM.skills.next('math.addsub60', { tier: 0 });
    const q = parse(item.prompt.text);
    if (q.op === '+') {
      assert.strictEqual(item.key, Math.min(q.a, q.b) + '+' + Math.max(q.a, q.b), 'normalised add key: ' + q.text);
    } else {
      assert.strictEqual(item.key, q.a + '-' + q.b, 'subtraction key is a-b: ' + q.text);
    }
  }
});

test('math.addsub60: same seed gives the same sequence, different seed differs', () => {
  function sequence(seed, n) {
    const PM = load('?seed=' + seed);
    const out = [];
    for (let i = 0; i < n; i++) out.push(PM.skills.next('math.addsub60', { tier: 0 }).prompt.text);
    return out;
  }
  const a = sequence(42, 30);
  const b = sequence(42, 30);
  const c = sequence(7, 30);
  assert.deepStrictEqual(a, b);
  assert.notDeepStrictEqual(a, c);
});
