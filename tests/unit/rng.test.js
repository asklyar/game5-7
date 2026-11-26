// Seeded RNG and clock — see TASKS.md T12.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const file = path.join(__dirname, '..', '..', 'js', 'core', 'rng.js');

function load(search) {
  const sandbox = {
    URLSearchParams,
    location: { search },
  };
  sandbox.window = sandbox;
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox);
  return sandbox.PM;
}

function sequence(PM, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(PM.rnd());
  return out;
}

test('rng: same seed gives the same sequence', () => {
  assert.deepStrictEqual(sequence(load('?seed=123'), 10), sequence(load('?seed=123'), 10));
});

test('rng: different seeds differ', () => {
  assert.notDeepStrictEqual(sequence(load('?seed=1'), 5), sequence(load('?seed=2'), 5));
});

test('rng: sequence stays in [0, 1)', () => {
  for (const value of sequence(load('?seed=42'), 500)) {
    assert.ok(value >= 0 && value < 1, String(value));
  }
});

test('rng: rndInt is inclusive and stays in range', () => {
  const PM = load('?seed=7');
  const seen = new Set();
  for (let i = 0; i < 500; i++) {
    const value = PM.rndInt(3, 5);
    assert.ok(value >= 3 && value <= 5, String(value));
    seen.add(value);
  }
  assert.deepStrictEqual([...seen].sort(), [3, 4, 5]);
});

test('rng: pick and shuffle are deterministic and keep items', () => {
  const list = ['a', 'b', 'c', 'd', 'e'];
  const first = load('?seed=99');
  const second = load('?seed=99');
  assert.strictEqual(first.pick(list), second.pick(list));

  const shuffled = first.shuffle(list);
  assert.deepStrictEqual(shuffled.slice().sort(), list.slice().sort());
  assert.deepStrictEqual(shuffled, second.shuffle(list));
  assert.deepStrictEqual(list, ['a', 'b', 'c', 'd', 'e'], 'input not mutated');
});

test('rng: now override comes from ?now=', () => {
  assert.strictEqual(load('?now=1700000000000').now(), 1700000000000);
  assert.ok(Math.abs(load('').now() - Date.now()) < 1000);
});
