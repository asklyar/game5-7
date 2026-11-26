// Baseline e2e of the current game behaviour — see TASKS.md T03.
// These tests lock what `index.html` does today so later refactors (T04–T09)
// can move code around without changing the child's experience.
const { test, expect } = require('@playwright/test');

// Parse "3 + 4 = ?" / "9 − 2 = ?" / "6 × 7 = ?" and evaluate it.
function solveQuestion(text) {
  const match = text.match(/(\d+)\s*([+−×])\s*(\d+)/);
  if (!match) throw new Error(`Cannot parse question: ${text}`);
  const a = Number(match[1]);
  const b = Number(match[3]);
  switch (match[2]) {
    case '+': return a + b;
    case '−': return a - b;
    case '×': return a * b;
    default: throw new Error(`Unknown operator in: ${text}`);
  }
}

async function startGame(page, mode, level) {
  await page.getByTestId(`start-${mode}-${level}`).click();
  await expect(page.locator('#game')).toBeVisible();
}

async function readQuestion(page) {
  return (await page.locator('#question').textContent()).trim();
}

// Type an answer on the on-screen keypad, then press ✓.
async function enterAnswer(page, value) {
  for (const digit of String(value)) {
    await page.locator('#keypad').getByRole('button', { name: digit, exact: true }).click();
  }
  await page.locator('#keypad .key.check').click();
}

async function answerMath(page, delta = 0) {
  const correct = solveQuestion(await readQuestion(page));
  await enterAnswer(page, correct + delta);
  return correct;
}

test.describe('menu', () => {
  test('shows four cards: math and English for levels 5 and 7', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('#menu')).toBeVisible();
    await expect(page.locator('.level-card')).toHaveCount(4);
    await expect(page.getByTestId('start-math-5')).toBeVisible();
    await expect(page.getByTestId('start-en-5')).toBeVisible();
    await expect(page.getByTestId('start-math-7')).toBeVisible();
    await expect(page.getByTestId('start-en-7')).toBeVisible();
  });
});

test.describe('math', () => {
  test('level 5: correct answer shows praise', async ({ page }) => {
    await page.goto('/');
    await startGame(page, 'math', 5);

    const text = await readQuestion(page);
    expect(text).toMatch(/\d+\s*[+−]\s*\d+\s*=\s*\?/);

    await answerMath(page);

    await expect(page.locator('#feedback')).toHaveText(/Молодець/);
    await expect(page.locator('#overlay')).toHaveClass(/active/);
  });

  test('level 5: wrong answer invites another try', async ({ page }) => {
    await page.goto('/');
    await startGame(page, 'math', 5);

    const correct = solveQuestion(await readQuestion(page));
    await enterAnswer(page, correct + 1);

    await expect(page.locator('#feedback')).toHaveText(/Спробуй ще/);
    await expect(page.locator('#overlay')).not.toHaveClass(/active/);
  });
});

test.describe('english', () => {
  test('level 5: choosing the right translation catches a Pokémon', async ({ page }) => {
    await page.goto('/');
    await startGame(page, 'en', 5);

    const shown = await readQuestion(page);
    const pair = await page.evaluate((word) => {
      return (window.EN_WORDS_5 || []).find(([uk]) => uk.toUpperCase() === word) || null;
    }, shown);
    expect(pair, `"${shown}" exists in EN_WORDS_5`).not.toBeNull();

    const english = pair[1].toUpperCase();
    await page.locator('.en-option', { hasText: new RegExp(`^${english}$`) }).click();

    await expect(page.locator('#feedback')).toHaveText(/Молодець/);
    await expect(page.locator('#overlay')).toHaveClass(/active/);
    await expect(page.locator('#modalName')).not.toBeEmpty();
  });
});

test.describe('persistence', () => {
  test('caught count survives a reload via localStorage', async ({ page }) => {
    await page.goto('/');
    await startGame(page, 'math', 5);
    await answerMath(page);

    await expect(page.locator('#overlay')).toHaveClass(/active/);
    await page.getByRole('button', { name: 'Далі!' }).click();

    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('pokemath_l5')));
    expect(saved, 'pokemath_l5 is written').not.toBeNull();
    expect(saved.caught).toBeGreaterThan(0);
    expect(Object.keys(saved.collection).length).toBeGreaterThan(0);

    await page.reload();
    await startGame(page, 'math', 5);

    await expect(page.locator('#caughtCount')).toHaveText(String(saved.caught));
  });
});
