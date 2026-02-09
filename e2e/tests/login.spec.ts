import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';

test('login with demo account shows logout button', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await loginPage.goto();
  await loginPage.login('demo@example.com', 'password123');

  await expect(loginPage.logoutButton).toBeVisible();
});

test('login with wrong password shows error', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await loginPage.goto();
  await loginPage.login('demo@example.com', 'wrongpassword');

  await expect(loginPage.errorMessage).toBeVisible();
});

test('login with wrong email shows error', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await loginPage.goto();
  await loginPage.login('nobody@example.com', 'password123');

  await expect(loginPage.errorMessage).toBeVisible();
});
