// English word banks — see TASKS.md T06.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const file = path.join(__dirname, '..', '..', 'js', 'data', 'words-en.js');

function load() {
  const sandbox = {};
  sandbox.window = sandbox;
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox);
  return sandbox.PM.data.words;
}

const grades = [
  ['grade0', 63],
  ['grade2', 28],
];

for (const [grade, minCount] of grades) {
  test(`${grade}: words are complete and unique`, () => {
    const words = load()[grade];
    assert.ok(words.length >= minCount, `${grade} has at least ${minCount} words`);

    const ids = new Set();
    const english = new Set();
    for (const word of words) {
      assert.ok(word.id, `${grade} word id`);
      assert.ok(!ids.has(word.id), `duplicate id ${word.id}`);
      ids.add(word.id);
      assert.ok(!english.has(word.en), `duplicate en ${word.en}`);
      english.add(word.en);
      assert.strictEqual(typeof word.uk, 'string');
      assert.ok(word.uk.length > 0, `${word.en} has uk translation`);
      assert.strictEqual(typeof word.emoji, 'string');
      assert.strictEqual(typeof word.topic, 'string');
      assert.strictEqual(typeof word.reviewed, 'boolean');
    }
  });
}
