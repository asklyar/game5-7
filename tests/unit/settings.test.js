// Settings module — see TASKS.md T11.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..', '..');

function fakeLocalStorage() {
  const data = {};
  return {
    getItem: (key) => (Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null),
    setItem: (key, value) => { data[key] = String(value); },
    removeItem: (key) => { delete data[key]; },
  };
}

function load() {
  const sandbox = { localStorage: fakeLocalStorage() };
  sandbox.window = sandbox;
  sandbox.console = console;
  vm.runInNewContext(fs.readFileSync(path.join(root, 'js/core/store.js'), 'utf8'), sandbox);
  vm.runInNewContext(fs.readFileSync(path.join(root, 'js/core/settings.js'), 'utf8'), sandbox);
  return sandbox.PM;
}

test('settings: defaults', () => {
  const PM = load();
  assert.strictEqual(PM.settings.get('sound'), true);
  assert.strictEqual(PM.settings.get('voice'), true);
  assert.strictEqual(PM.settings.get('theme'), 'day');
  assert.strictEqual(PM.settings.get('animations'), true);
  assert.strictEqual(PM.settings.get('unknown'), undefined);
});

test('settings: persist under pokemath_settings and survive reload', () => {
  const sandbox = { localStorage: fakeLocalStorage() };
  sandbox.window = sandbox;
  sandbox.console = console;
  vm.runInNewContext(fs.readFileSync(path.join(root, 'js/core/store.js'), 'utf8'), sandbox);
  vm.runInNewContext(fs.readFileSync(path.join(root, 'js/core/settings.js'), 'utf8'), sandbox);

  sandbox.PM.settings.set('sound', false);
  assert.strictEqual(sandbox.PM.settings.get('sound'), false);
  assert.ok(sandbox.localStorage.getItem('pokemath_settings').includes('"sound":false'));

  // Load the modules again with the same storage to simulate a reload.
  const again = { localStorage: sandbox.localStorage };
  again.window = again;
  again.console = console;
  vm.runInNewContext(fs.readFileSync(path.join(root, 'js/core/store.js'), 'utf8'), again);
  vm.runInNewContext(fs.readFileSync(path.join(root, 'js/core/settings.js'), 'utf8'), again);
  assert.strictEqual(again.PM.settings.get('sound'), false);
});

test('settings: emits settings:change', () => {
  const PM = load();
  const seen = [];
  PM.emit = (name, payload) => seen.push({ name, payload });
  PM.settings.set('voice', false);
  assert.deepEqual(seen, [{ name: 'settings:change', payload: { key: 'voice', value: false } }]);
});
