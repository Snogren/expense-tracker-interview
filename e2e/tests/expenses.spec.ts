import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { ExpensesPage } from '../pages/expenses.page';

test.describe('Unverified', () => {
  test('added expense appears in the list with correct data', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const expensesPage = new ExpensesPage(page);

    const category = 'Entertainment';
    const amount = '42.50';
    const description = `Test expense ${Date.now()}`;
    const date = '2026-01-15';

    await loginPage.goto();
    await loginPage.login('demo@example.com', 'password123');
    await expect(loginPage.logoutButton).toBeVisible();
    await expensesPage.goto();

    await expensesPage.addExpense(category, amount, description, date);
    await expensesPage.searchExpenses(description);

    const row = expensesPage.expenseRow(description);
    await expect(row).toBeVisible();
    await expect(row).toContainText(description);
    await expect(row).toContainText(category);
    await expect(row).toContainText('$42.50');
    await expect(row).toContainText('Jan 15, 2026');
  });
});
