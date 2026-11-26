// Ukrainian UI text must live in strings.js or data files — see TASKS.md T14.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');
const cyrillic = /[А-Яа-яІіЇїЄєҐґ]/;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name.endsWith('.js') ? [full] : [];
  });
}

test('no hard-coded Ukrainian text outside strings/data', () => {
  const files = [path.join(root, 'index.html')];
  for (const file of walk(path.join(root, 'js'))) {
    const rel = path.relative(root, file).replace(/\\/g, '/');
    if (rel === 'js/core/strings.js' || rel.startsWith('js/data/')) continue;
    files.push(file);
  }

  const offenders = [];
  for (const file of files) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, index) => {
      if (cyrillic.test(line)) offenders.push(`${path.relative(root, file)}:${index + 1}`);
    });
  }
  assert.deepStrictEqual(offenders, []);
});
