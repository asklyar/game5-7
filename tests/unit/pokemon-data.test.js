// Pokémon data integrity — see TASKS.md T05.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const file = path.join(__dirname, '..', '..', 'js', 'data', 'pokemon.js');

function load() {
  const sandbox = {};
  sandbox.window = sandbox;
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox);
  return sandbox.PM.data;
}

test('pokemon data: 98 families and 200 stages', () => {
  const data = load();
  assert.strictEqual(data.pokemon.length, 98);
  const stages = data.pokemon.reduce((n, p) => n + p.stages.length, 0);
  assert.strictEqual(stages, 200);
});

test('pokemon data: every stage is complete', () => {
  const data = load();
  for (const family of data.pokemon) {
    assert.ok(family.id, 'family id');
    assert.ok(family.emoji, `family ${family.id} emoji`);
    assert.ok(Array.isArray(family.stages) && family.stages.length > 0);
    for (const stage of family.stages) {
      assert.strictEqual(typeof stage.name, 'string');
      assert.ok(stage.name.length > 0, `family ${family.id} stage name`);
      assert.strictEqual(typeof stage.dex, 'number');
      assert.ok(stage.emoji, `${stage.name} emoji`);
      assert.ok(stage.ability, `${stage.name} ability`);
    }
  }
});

test('pokemon data: artwork URL is built from dex', () => {
  const data = load();
  assert.match(data.artUrl(25), /\/25\.png$/);
});
