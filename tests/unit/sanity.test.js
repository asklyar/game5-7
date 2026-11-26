// Unit harness sanity check — see TASKS.md T02.
// Proves `node --test tests/unit` works on any machine (no hard-coded paths).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');

test('unit harness runs', () => {
  assert.strictEqual(typeof test, 'function');
});

test('index.html exists and has a non-empty title', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  assert.ok(match, 'index.html has a <title>');
  assert.ok(match[1].trim().length > 0, 'title is not empty');
});
