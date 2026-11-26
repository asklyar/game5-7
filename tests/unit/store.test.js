// Versioned storage + migration — see TASKS.md T10.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const file = path.join(__dirname, '..', '..', 'js', 'core', 'store.js');

function fakeLocalStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => (Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null),
    setItem: (key, value) => { data[key] = String(value); },
    removeItem: (key) => { delete data[key]; },
  };
}

function load(ls) {
  const sandbox = { localStorage: ls };
  sandbox.window = sandbox;
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox);
  return sandbox.PM;
}

test('store: get/set/remove roundtrip with defaults', () => {
  const PM = load(fakeLocalStorage());
  assert.strictEqual(PM.store.get('missing', 42), 42);
  PM.store.set('answer', { value: 7 });
  assert.deepEqual(PM.store.get('answer'), { value: 7 });
  PM.store.remove('answer');
  assert.strictEqual(PM.store.get('answer', null), null);
});

test('store: falls back to memory when localStorage throws', () => {
  const throwing = {
    getItem() { throw new Error('denied'); },
    setItem() { throw new Error('denied'); },
    removeItem() { throw new Error('denied'); },
  };
  const PM = load(throwing);
  PM.store.set('x', 1);
  assert.strictEqual(PM.store.get('x'), 1);
  PM.store.remove('x');
  assert.strictEqual(PM.store.get('x', 'gone'), 'gone');
});

test('store: migrates old saves to profiles and keeps old keys', () => {
  const old5 = { collection: { 1: 0 }, score: 3, caught: 3 };
  const old7 = { collection: { 2: 1 }, score: 5, caught: 4 };
  const ls = fakeLocalStorage({
    pokemath_l5: JSON.stringify(old5),
    pokemath_l7: JSON.stringify(old7),
  });
  const PM = load(ls);

  assert.deepEqual(PM.progress.load(0), old5);
  assert.deepEqual(PM.progress.load(2), old7);
  assert.strictEqual(PM.store.get('schema'), 1);
  assert.ok(ls.data.pokemath_l5, 'old l5 key preserved');
  assert.ok(ls.data.pokemath_l7, 'old l7 key preserved');
});

test('store: migration is idempotent', () => {
  const ls = fakeLocalStorage({ pokemath_l5: JSON.stringify({ collection: {}, score: 1, caught: 1 }) });
  const PM = load(ls);
  PM.progress.save(0, { collection: {}, score: 9, caught: 9 });
  assert.strictEqual(PM.store.migrate(), false);
  assert.strictEqual(PM.progress.load(0).score, 9);
});

test('progress: missing profile has a safe shape', () => {
  const PM = load(fakeLocalStorage());
  assert.deepEqual(PM.progress.load(0), { collection: {}, score: 0, caught: 0 });
});
