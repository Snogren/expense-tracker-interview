import { test, expect } from '../fixtures/base.fixture';

test.describe('Edge Cases', () => {
  test.beforeEach(async ({ seedDb, loginPage }) => {
    await loginPage.goto();
    await loginPage.loginAsDemoUser();
    await loginPage.expectLoggedIn();
  });

  test.describe('Validation', () => {
    test('cannot create expense with zero amount', async ({ expensesPage }) => {
      await expensesPage.goto();
      await expensesPage.openAddExpenseModal();

      await expensesPage.fillExpenseForm({
        amount: 0,
        description: 'Zero amount test',
        date: '2026-01-15',
      });
      await expensesPage.createButton.click();

      // Should show validation error, modal should remain open
      await expect(expensesPage.modal).toBeVisible();
      await expect(expensesPage.page.getByText('Amount must be greater than 0')).toBeVisible();
    });

    test('cannot create expense with empty description', async ({ expensesPage }) => {
      await expensesPage.goto();
      await expensesPage.openAddExpenseModal();

      await expensesPage.fillExpenseForm({
        amount: 25.00,
        description: '',
        date: '2026-01-15',
      });
      await expensesPage.createButton.click();

      await expect(expensesPage.modal).toBeVisible();
      await expect(expensesPage.page.getByText('Description is required')).toBeVisible();
    });

    test('cannot register with password shorter than 6 characters', async ({
      page,
      loginPage,
    }) => {
      await loginPage.goto();
      await loginPage.register('short@test.com', '12345');
      await loginPage.expectError(/password|short|6|character/i);
    });
  });

  test.describe('Empty States', () => {
    test('new user sees empty expense list', async ({
      page,
      loginPage,
      dashboardPage,
      expensesPage,
    }) => {
      // Register a fresh user with no expenses
      await loginPage.goto();
      await dashboardPage.logout();
      await loginPage.register(`empty_${Date.now()}@test.com`, 'password123');
      await loginPage.expectLoggedIn();

      await page.goto('/expenses');
      await expensesPage.waitForExpenses();
      await expect(expensesPage.emptyState).toBeVisible();
    });

    test('new user sees zero values on dashboard', async ({
      page,
      loginPage,
      dashboardPage,
    }) => {
      await loginPage.goto();
      await dashboardPage.logout();
      await loginPage.register(`empty_dash_${Date.now()}@test.com`, 'password123');
      await loginPage.expectLoggedIn();

      await dashboardPage.goto();
      await dashboardPage.waitForData();

      const total = await dashboardPage.getTotalExpensesCount();
      expect(total.trim()).toBe('0');

      const avg = await dashboardPage.getAvgPerExpense();
      expect(avg.trim()).toBe('$0.00');
    });
  });

  test.describe('Special Characters', () => {
    test('expense with special characters in description', async ({ expensesPage }) => {
      await expensesPage.goto();
      await expensesPage.waitForExpenses();

      const specialDesc = 'Café "Le Petit" — $5 off & más';
      await expensesPage.submitCreateExpense({
        category: 'Food',
        amount: 35.00,
        description: specialDesc,
        date: '2026-01-15',
      });
      await expensesPage.waitForExpenses();
      await expensesPage.expectExpenseVisible(specialDesc);
    });

    test('search with special characters returns correct results', async ({
      expensesPage,
    }) => {
      await expensesPage.goto();
      await expensesPage.waitForExpenses();

      await expensesPage.submitCreateExpense({
        category: 'Food',
        amount: 10.00,
        description: 'Piñata supplies for party',
        date: '2026-01-15',
      });
      await expensesPage.waitForExpenses();

      await expensesPage.search('Piñata');
      await expensesPage.expectExpenseVisible('Piñata supplies for party');
    });
  });

  test.describe('Navigation', () => {
    test('nav links navigate to correct pages', async ({ page }) => {
      // Dashboard
      await page.getByRole('link', { name: 'Dashboard' }).click();
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

      // Expenses
      await page.getByRole('link', { name: 'Expenses' }).click();
      await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible();

      // Import
      await page.getByRole('link', { name: 'Import' }).click();
      await expect(page.getByRole('heading', { name: 'Import Expenses' })).toBeVisible();
    });

    test('unknown route redirects to dashboard', async ({ page }) => {
      await page.goto('/nonexistent-page');
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    });
  });
});
