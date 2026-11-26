// Strings module part 1 — see TASKS.md T13.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..', '..');

function load() {
  const sandbox = {};
  sandbox.window = sandbox;
  vm.runInNewContext(fs.readFileSync(path.join(root, 'js/core/strings.js'), 'utf8'), sandbox);
  return sandbox.PM;
}

test('strings: PM.t returns Ukrainian text and interpolates vars', () => {
  const PM = load();
  assert.strictEqual(PM.t('menu.play'), 'Грати');
  assert.strictEqual(PM.t('game.level', { level: 7, suffix: ' · English' }), 'Рівень 7 · English');
});

test('strings: unknown keys fall back to the key', () => {
  assert.strictEqual(load().t('missing.key'), 'missing.key');
});

test('strings: every data-i18n key in index.html exists', () => {
  const PM = load();
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const keys = new Set();
  const regex = /data-i18n(?:-html)?="([^"]+)"/g;
  let match;
  while ((match = regex.exec(html))) keys.add(match[1]);

  assert.ok(keys.size > 0, 'index.html uses data-i18n');
  for (const key of keys) {
    assert.ok(Object.prototype.hasOwnProperty.call(PM.strings.uk, key), `missing key: ${key}`);
  }
});
