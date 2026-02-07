import { test, expect } from '../fixtures/base.fixture';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ seedDb, loginPage }) => {
    await loginPage.goto();
    await loginPage.loginAsDemoUser();
    await loginPage.expectLoggedIn();
  });

  test('stat cards display non-zero values with seeded data', async ({ dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.waitForData();

    const monthlySpending = await dashboardPage.getMonthlySpending();
    const totalExpenses = await dashboardPage.getTotalExpensesCount();
    const avgPerExpense = await dashboardPage.getAvgPerExpense();

    // With seeded data, these should have real values
    expect(monthlySpending).toMatch(/\$\d+/);
    expect(totalExpenses).toMatch(/\d+/);
    expect(avgPerExpense).toMatch(/\$\d+/);
  });

  test('recent expenses section shows at most 5 expenses', async ({ dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.waitForData();

    const count = await dashboardPage.expenseRows.count();
    // Seed creates 15 expenses, dashboard should show at most 5
    expect(count).toBeLessThanOrEqual(5);
    expect(count).toBeGreaterThan(0);
  });

  test('delete button on dashboard recent expenses removes the expense', async ({
    page,
    dashboardPage,
    expensesPage,
  }) => {
    /**
     * BUG DETECTOR: Dashboard passes `onDelete={() => {}}` (a no-op) to ExpenseList.
     * The delete button renders and is clickable, but nothing happens.
     *
     * This test clicks delete on a recent expense, confirms the deletion dialog,
     * and expects the expense to be removed. If the handler is a no-op, the
     * delete confirmation modal will never appear and the test will FAIL.
     */
    await dashboardPage.goto();
    await dashboardPage.waitForData();

    // Get the first expense description before deletion
    const descriptions = await dashboardPage.getRecentExpenseDescriptions();
    expect(descriptions.length).toBeGreaterThan(0);
    const targetDescription = descriptions[0];

    // Click delete on the first expense
    await dashboardPage.clickDeleteOnExpense(0);

    // Expect delete confirmation modal to appear
    const deleteModal = page.locator('[class*="fixed inset-0"]');
    await expect(deleteModal).toBeVisible({ timeout: 3_000 });

    // Confirm delete
    await page.getByRole('button', { name: 'Delete', exact: true }).click();

    // The expense should be removed
    await page.waitForLoadState('networkidle');
    const updatedDescriptions = await dashboardPage.getRecentExpenseDescriptions();
    expect(updatedDescriptions).not.toContain(targetDescription);
  });

  test('edit button on dashboard opens edit modal for the correct expense', async ({
    page,
    dashboardPage,
  }) => {
    /**
     * BUG DETECTOR: Dashboard's onEditExpense navigates to `/expenses?edit={id}`,
     * but the Expenses page never reads the `edit` query parameter.
     *
     * This test clicks edit on a recent expense and expects an edit modal to appear
     * with the expense's data pre-filled. If the query param is ignored, no modal
     * opens and the test will FAIL.
     */
    await dashboardPage.goto();
    await dashboardPage.waitForData();

    const descriptions = await dashboardPage.getRecentExpenseDescriptions();
    expect(descriptions.length).toBeGreaterThan(0);
    const targetDescription = descriptions[0];

    // Click edit on the first expense
    await dashboardPage.clickEditOnExpense(0);

    // Expect to be on the expenses page with an edit modal open
    await page.waitForURL(/\/expenses/);

    // The edit modal should be visible with the expense data pre-filled
    const editModal = page.locator('[class*="fixed inset-0"]');
    await expect(editModal).toBeVisible({ timeout: 3_000 });

    // The description input should contain the expense's description
    const descriptionInput = page.locator('#description');
    await expect(descriptionInput).toHaveValue(targetDescription);
  });

  test('total expenses count reflects actual number of expenses', async ({
    page,
    dashboardPage,
    expensesPage,
  }) => {
    /**
     * BUG DETECTOR: Dashboard computes totalExpenses from `expenses.length`, but
     * the backend defaults to limit=50. If a user has >50 expenses, the count
     * displayed is capped at 50.
     *
     * This test verifies the dashboard count matches the actual expense count
     * on the expenses page. With seeded data (15 expenses) this should pass,
     * but documents the pattern for catching the bug.
     */
    await dashboardPage.goto();
    await dashboardPage.waitForData();

    const dashboardCount = await dashboardPage.getTotalExpensesCount();

    // Navigate to expenses page and count actual expenses
    await page.goto('/expenses');
    await expensesPage.waitForExpenses();
    const actualCount = await expensesPage.getExpenseRowCount();

    expect(dashboardCount.trim()).toBe(actualCount.toString());
  });

  test('monthly spending matches sum of current month expenses', async ({
    page,
    dashboardPage,
    expensesPage,
  }) => {
    await dashboardPage.goto();
    await dashboardPage.waitForData();

    const monthlySpendingText = await dashboardPage.getMonthlySpending();
    const monthlySpendingValue = parseFloat(monthlySpendingText.replace('$', ''));

    // Go to expenses, filter to This Month, and sum up the amounts
    await page.goto('/expenses');
    await expensesPage.waitForExpenses();
    await expensesPage.filterByDatePreset('this-month');
    await expensesPage.waitForExpenses();

    // Sum up amounts displayed in the expense list
    const rows = expensesPage.expenseRows;
    const count = await rows.count();
    let sum = 0;
    for (let i = 0; i < count; i++) {
      const amountText = await rows.nth(i).locator('.font-semibold').textContent();
      const amount = parseFloat(amountText?.replace('$', '') || '0');
      sum += amount;
    }

    // Allow small floating point difference
    expect(Math.abs(monthlySpendingValue - sum)).toBeLessThan(0.02);
  });
});
