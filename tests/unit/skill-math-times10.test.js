// math.times10 skill — see TASKS.md T17.
// Grade 2 multiplication table 1..10.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..', '..');

function load(search) {
  const sandbox = { URLSearchParams, location: { search: search || '' }, console };
  sandbox.window = sandbox;
  for (const f of ['js/core/rng.js', 'js/skills/registry.js', 'js/skills/math-times10.js']) {
    vm.runInNewContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox);
  }
  return sandbox.PM;
}

function parse(text) {
  const m = text.match(/^(\d+)\s*\u00D7\s*(\d+)\s*=\s*\?$/);
  assert.ok(m, 'prompt text looks like "a × b = ?": ' + JSON.stringify(text));
  const a = Number(m[1]);
  const b = Number(m[2]);
  const expected = a * b;
  return { a, b, expected, text };
}

test('math.times10: registered as a grade-2 math skill', () => {
  const PM = load('?seed=1');
  const skill = PM.skills.get('math.times10');
  assert.ok(skill, 'skill is registered');
  assert.strictEqual(skill.subject, 'math');
  assert.strictEqual(skill.grade, 2);
  assert.strictEqual(PM.skills.list({ subject: 'math', grade: 2 }).length, 1);
});

test('math.times10: 500 seeded questions validate, stay in 1..100, correct multiplication', () => {
  const PM = load('?seed=456');

  for (let i = 0; i < 500; i++) {
    const item = PM.skills.next('math.times10', { tier: 0 });

    assert.strictEqual(PM.skills.validate(item), item);
    assert.strictEqual(item.input, 'keypad');
    assert.strictEqual(item.options, null);
    assert.strictEqual(typeof item.key, 'string');
    assert.ok(item.key.length > 0, 'key is a non-empty string');

    const q = parse(item.prompt.text);

    assert.strictEqual(item.answer, q.expected, 'answer matches a * b');
    assert.ok(q.a >= 1 && q.a <= 10 && q.b >= 1 && q.b <= 10, 'operands in 1..10: ' + q.text);
    assert.ok(item.answer >= 1 && item.answer <= 100, 'answer in 1..100: ' + q.text + ' -> ' + item.answer);
  }
});

test('math.times10: multiplication keys are normalised (a*b === b*a)', () => {
  const PM = load('?seed=1');
  for (let i = 0; i < 300; i++) {
    const item = PM.skills.next('math.times10', { tier: 0 });
    const q = parse(item.prompt.text);
    assert.strictEqual(item.key, Math.min(q.a, q.b) + '*' + Math.max(q.a, q.b), 'normalised mult key: ' + q.text);
  }
});

test('math.times10: same seed gives the same sequence, different seed differs', () => {
  function sequence(seed, n) {
    const PM = load('?seed=' + seed);
    const out = [];
    for (let i = 0; i < n; i++) out.push(PM.skills.next('math.times10', { tier: 0 }).prompt.text);
    return out;
  }
  const a = sequence(42, 30);
  const b = sequence(42, 30);
  const c = sequence(7, 30);
  assert.deepStrictEqual(a, b);
  assert.notDeepStrictEqual(a, c);
});
