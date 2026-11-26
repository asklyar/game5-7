// Skill registry & question runner — see TASKS.md T15.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..', '..');

// The runner picks skills with the seeded PM.rnd(), so load rng.js first.
function load(search) {
  const sandbox = {
    URLSearchParams,
    location: { search: search || '' },
    console,
  };
  sandbox.window = sandbox;
  vm.runInNewContext(fs.readFileSync(path.join(root, 'js/core/rng.js'), 'utf8'), sandbox);
  vm.runInNewContext(fs.readFileSync(path.join(root, 'js/skills/registry.js'), 'utf8'), sandbox);
  return sandbox.PM;
}

// A skill whose generate() is fixed (does not consume the RNG), so a sequence of
// next() calls depends on nothing but the seed and the skill pool.
function fixedSkill(id, key, answer) {
  return {
    id,
    subject: 'math',
    grade: 0,
    generate() {
      return {
        key,
        prompt: { text: key + ' = ?' },
        input: 'keypad',
        answer,
        options: null,
      };
    },
  };
}

test('registry: register, get and list', () => {
  const PM = load('?seed=1');
  PM.skills.register(fixedSkill('math.add20', '3+4', 7));
  PM.skills.register(fixedSkill('math.sub10', '9-3', 6));

  assert.strictEqual(PM.skills.get('math.add20').id, 'math.add20');
  assert.strictEqual(PM.skills.get('nope'), undefined);
  assert.strictEqual(PM.skills.list().length, 2);
  assert.strictEqual(PM.skills.list({ grade: 0 }).length, 2);
  assert.strictEqual(PM.skills.list({ grade: 2 }).length, 0);
});

test('registry: a duplicate id is rejected', () => {
  const PM = load('?seed=1');
  PM.skills.register(fixedSkill('math.add20', '3+4', 7));
  assert.throws(
    () => PM.skills.register(fixedSkill('math.add20', '1+1', 2)),
    /duplicate/i
  );
});

test('registry: an invalid generated item is rejected', () => {
  const PM = load('?seed=1');

  // missing key
  assert.throws(
    () => PM.skills.validate({ prompt: { text: 'x' }, input: 'keypad', answer: 1 }),
    /key/
  );
  // unknown input type
  assert.throws(
    () => PM.skills.validate({ key: 'a', prompt: { text: 'x' }, input: 'dice', answer: 1 }),
    /input/
  );
  // missing answer
  assert.throws(
    () => PM.skills.validate({ key: 'a', prompt: { text: 'x' }, input: 'keypad', answer: null }),
    /answer/
  );
  // choice options that do not include the answer
  assert.throws(
    () =>
      PM.skills.validate({
        key: 'a',
        prompt: { text: 'x' },
        input: 'choice',
        answer: 'cat',
        options: [{ label: 'dog' }, { label: 'bird' }],
      }),
    /answer/
  );
  // duplicate option labels
  assert.throws(
    () =>
      PM.skills.validate({
        key: 'a',
        prompt: { text: 'x' },
        input: 'choice',
        answer: 'cat',
        options: [{ label: 'cat' }, { label: 'cat' }],
      }),
    /unique/i
  );

  // a well-formed item passes and is returned unchanged
  const good = { key: '3+4', prompt: { text: '3 + 4 = ?' }, input: 'keypad', answer: 7 };
  assert.strictEqual(PM.skills.validate(good), good);
});

// Run 30 next() calls over the same pool of three fixed skills. The only source
// of randomness is the seed, so equal seeds must give an equal sequence and
// different seeds must (almost certainly) differ.
function sequenceForSeed(seed) {
  const PM = load('?seed=' + seed);
  PM.skills.register(fixedSkill('a', 'a', 1));
  PM.skills.register(fixedSkill('b', 'b', 2));
  PM.skills.register(fixedSkill('c', 'c', 3));
  const keys = [];
  for (let i = 0; i < 30; i++) keys.push(PM.skills.next(['a', 'b', 'c']).key);
  return keys;
}

test('registry: next() is deterministic with a seed', () => {
  assert.deepStrictEqual(sequenceForSeed(42), sequenceForSeed(42));
  assert.notDeepStrictEqual(sequenceForSeed(42), sequenceForSeed(7));
});

test('registry: next() returns the generated item and validates it', () => {
  const PM = load('?seed=7');
  PM.skills.register(fixedSkill('math.add20', '3+4', 7));
  const item = PM.skills.next(['math.add20']);
  assert.strictEqual(item.key, '3+4');
  assert.strictEqual(item.answer, 7);
});

test('registry: next() rejects an unknown skill id', () => {
  const PM = load('?seed=1');
  PM.skills.register(fixedSkill('a', 'a', 1));
  assert.throws(() => PM.skills.next(['a', 'ghost']), /unknown skill/i);
});

test('registry: next() throws when a skill breaks the contract', () => {
  const PM = load('?seed=1');
  PM.skills.register({
    id: 'broken',
    generate() {
      return { key: '', prompt: { text: '' }, input: 'keypad' };
    },
  });
  assert.throws(() => PM.skills.next(['broken']), /key/);
});
