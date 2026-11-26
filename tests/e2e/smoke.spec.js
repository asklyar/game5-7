// Smoke test — see TASKS.md T02.
// Loads the game, fails on any page error or console.error, checks the title.
const { test, expect } = require('@playwright/test');

test('page loads without console errors', async ({ page }) => {
  const errors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`console.error: ${msg.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    errors.push(`pageerror: ${error.message}`);
  });

  const response = await page.goto('/');
  expect(response, 'navigation response').not.toBeNull();
  expect(response.ok(), `HTTP status ${response && response.status()}`).toBe(true);

  await expect(page).toHaveTitle(/./);

  expect(errors, errors.join('\n')).toEqual([]);
});
