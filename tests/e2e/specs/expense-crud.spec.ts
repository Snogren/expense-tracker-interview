import { test, expect } from '../fixtures/base.fixture';

test.describe('Expense CRUD', () => {
  test.beforeEach(async ({ seedDb, loginPage }) => {
    await loginPage.goto();
    await loginPage.loginAsDemoUser();
    await loginPage.expectLoggedIn();
  });

  test('create an expense and verify it appears in the list', async ({ expensesPage }) => {
    await expensesPage.goto();
    await expensesPage.waitForExpenses();

    const description = `Test expense ${Date.now()}`;
    await expensesPage.submitCreateExpense({
      category: 'Food',
      amount: 42.50,
      description,
      date: '2026-01-15',
    });

    await expensesPage.waitForExpenses();
    await expensesPage.expectExpenseVisible(description);
  });

  test('edit an expense and verify changes persist', async ({ expensesPage }) => {
    await expensesPage.goto();
    await expensesPage.waitForExpenses();

    // Create an expense first
    const originalDesc = `Edit me ${Date.now()}`;
    await expensesPage.submitCreateExpense({
      category: 'Food',
      amount: 20.00,
      description: originalDesc,
      date: '2026-01-10',
    });
    await expensesPage.waitForExpenses();

    // Edit it
    await expensesPage.clickEditOnExpense(originalDesc);
    await expect(expensesPage.modalTitle).toContainText('Edit');

    const updatedDesc = `Updated ${Date.now()}`;
    await expensesPage.descriptionInput.fill(updatedDesc);
    await expensesPage.amountInput.fill('99.99');
    await expensesPage.updateButton.click();
    await expect(expensesPage.modal).toBeHidden({ timeout: 5_000 });

    // Verify the updated expense is showing
    await expensesPage.waitForExpenses();
    await expensesPage.expectExpenseVisible(updatedDesc);
    await expensesPage.expectExpenseNotVisible(originalDesc);
  });

  test('delete an expense removes it from the list', async ({ expensesPage }) => {
    await expensesPage.goto();
    await expensesPage.waitForExpenses();

    // Create an expense to delete
    const description = `Delete me ${Date.now()}`;
    await expensesPage.submitCreateExpense({
      category: 'Entertainment',
      amount: 15.00,
      description,
      date: '2026-01-12',
    });
    await expensesPage.waitForExpenses();
    await expensesPage.expectExpenseVisible(description);

    // Delete it
    await expensesPage.clickDeleteOnExpense(description);
    await expensesPage.confirmDelete();

    // Verify it's gone
    await expensesPage.waitForExpenses();
    await expensesPage.expectExpenseNotVisible(description);
  });

  test('search filters expenses by description', async ({ expensesPage }) => {
    await expensesPage.goto();
    await expensesPage.waitForExpenses();

    // Create two distinct expenses
    await expensesPage.submitCreateExpense({
      category: 'Food',
      amount: 10.00,
      description: 'Unique searchable alpha',
      date: '2026-01-14',
    });
    await expensesPage.submitCreateExpense({
      category: 'Transport',
      amount: 20.00,
      description: 'Different beta item',
      date: '2026-01-14',
    });
    await expensesPage.waitForExpenses();

    // Search for the first one
    await expensesPage.search('searchable alpha');
    await expensesPage.expectExpenseVisible('Unique searchable alpha');
    await expensesPage.expectExpenseNotVisible('Different beta item');

    // Clear search
    await expensesPage.search('');
    await expensesPage.waitForExpenses();
    await expensesPage.expectExpenseVisible('Different beta item');
  });

  test('edit modal pre-fills existing expense data', async ({ expensesPage }) => {
    await expensesPage.goto();
    await expensesPage.waitForExpenses();

    // Create a known expense
    await expensesPage.submitCreateExpense({
      category: 'Bills',
      amount: 150.00,
      description: 'Monthly rent payment',
      date: '2026-01-01',
    });
    await expensesPage.waitForExpenses();

    // Open edit modal
    await expensesPage.clickEditOnExpense('Monthly rent payment');

    // Verify form is pre-filled with the existing data
    await expect(expensesPage.descriptionInput).toHaveValue('Monthly rent payment');
    await expect(expensesPage.amountInput).toHaveValue('150');
    await expect(expensesPage.dateInput).toHaveValue('2026-01-01');
  });
});
