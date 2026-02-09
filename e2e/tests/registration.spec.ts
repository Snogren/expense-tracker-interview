import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';

test('new registered user sees no expenses', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const uniqueEmail = `user-${Date.now()}@example.com`;

  await loginPage.goto();
  await loginPage.register(uniqueEmail, 'password123');

  await expect(loginPage.logoutButton).toBeVisible();
  await expect(page.getByText('No expenses found')).toBeVisible();
});

test('register with invalid password shows error', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await loginPage.goto();
  await loginPage.register(`user-${Date.now()}@example.com`, '123');

  await expect(page.getByText('Invalid input')).toBeVisible();
});

test('register with existing email shows error', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await loginPage.goto();
  await loginPage.register('demo@example.com', 'password123');

  await expect(page.getByText('Email already registered')).toBeVisible();
});

test.describe('Unverified', () => {
  test('register with empty email shows validation error', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.register('', 'password123');

    await expect(loginPage.logoutButton).not.toBeVisible();
  });

  test('register with invalid email format shows error', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.register('not-an-email', 'password123');

    await expect(loginPage.logoutButton).not.toBeVisible();
  });

  test('register with empty password shows validation error', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.register(`user-${Date.now()}@example.com`, '');

    await expect(loginPage.logoutButton).not.toBeVisible();
  });

  test('register with exactly 6-character password succeeds', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.register(`user-${Date.now()}@example.com`, '123456');

    await expect(loginPage.logoutButton).toBeVisible();
  });

  test('register then log out and log back in with new credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const email = `user-${Date.now()}@example.com`;
    const password = 'password123';

    await loginPage.goto();
    await loginPage.register(email, password);
    await expect(loginPage.logoutButton).toBeVisible();

    await loginPage.logoutButton.click();
    await expect(loginPage.signInButton).toBeVisible();

    await loginPage.login(email, password);
    await expect(loginPage.logoutButton).toBeVisible();
  });

  test('register with email containing leading/trailing whitespace', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.register(`  user-${Date.now()}@example.com  `, 'password123');

    await expect(loginPage.logoutButton).toBeVisible();
  });

  test('register with very long email address', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const longLocal = 'a'.repeat(200);

    await loginPage.goto();
    await loginPage.register(`${longLocal}@example.com`, 'password123');

    await expect(loginPage.logoutButton).not.toBeVisible();
  });

  test('register with very long password', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.register(`user-${Date.now()}@example.com`, 'p'.repeat(1000));

    await expect(loginPage.logoutButton).toBeVisible();
  });

  test('register and verify dashboard stats show $0.00 spending', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.register(`user-${Date.now()}@example.com`, 'password123');

    await expect(loginPage.logoutButton).toBeVisible();
    await expect(page.locator('dl', { hasText: 'Spending' }).getByText('$0.00')).toBeVisible();
  });

  test('switching between Register and Sign In modes preserves entered email', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const email = `user-${Date.now()}@example.com`;

    await loginPage.goto();
    await loginPage.registerLink.click();
    await loginPage.emailInput.fill(email);

    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(loginPage.emailInput).toHaveValue(email);
  });
});
