import { test, expect } from '../fixtures/base.fixture';

test.describe('Date Handling', () => {
  test.beforeEach(async ({ seedDb, loginPage }) => {
    await loginPage.goto();
    await loginPage.loginAsDemoUser();
    await loginPage.expectLoggedIn();
  });

  test('default date in expense form matches local today', async ({ page, expensesPage }) => {
    /**
     * BUG DETECTOR: The app uses `new Date().toISOString().split('T')[0]` to compute
     * the default date. In negative UTC offsets during evening hours, toISOString()
     * returns tomorrow's date in UTC, causing the default to be wrong.
     *
     * This test asserts the default equals the user's LOCAL date, which is the
     * correct behavior. If the app has the timezone bug, this test will FAIL.
     */
    await expensesPage.goto();
    await expensesPage.openAddExpenseModal();

    // Get what the browser thinks today is (in local timezone)
    const localToday = await page.evaluate(() => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    });

    const formDate = await expensesPage.getDateInputValue();
    expect(formDate).toBe(localToday);
  });

  test('created expense displays the exact date that was entered', async ({ expensesPage }) => {
    /**
     * BUG DETECTOR: ExpenseList.formatDate() does `new Date(dateString)` on a
     * YYYY-MM-DD string. This is parsed as UTC midnight. When displayed using
     * toLocaleDateString in a negative UTC offset, it shows the PREVIOUS day.
     *
     * This test creates an expense with date 2026-01-15 and asserts the displayed
     * date is "Jan 15, 2026". If there's a timezone display bug, it will show
     * "Jan 14, 2026" and the test will FAIL.
     */
    await expensesPage.goto();
    await expensesPage.waitForExpenses();

    await expensesPage.submitCreateExpense({
      category: 'Food',
      amount: 10.00,
      description: 'Date test expense',
      date: '2026-01-15',
    });
    await expensesPage.waitForExpenses();

    const displayedDate = await expensesPage.getExpenseDisplayedDate('Date test expense');
    expect(displayedDate).toBe('Jan 15, 2026');
  });

  test('"This Month" filter includes expenses from the current month', async ({
    page,
    expensesPage,
  }) => {
    await expensesPage.goto();
    await expensesPage.waitForExpenses();

    // Create an expense dated today
    const todayStr = await page.evaluate(() => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    });

    await expensesPage.submitCreateExpense({
      category: 'Food',
      amount: 5.00,
      description: 'This month filter test',
      date: todayStr,
    });
    await expensesPage.waitForExpenses();

    // Apply "This Month" filter
    await expensesPage.filterByDatePreset('this-month');
    await expensesPage.waitForExpenses();

    await expensesPage.expectExpenseVisible('This month filter test');
  });

  test('"Last Month" filter excludes current month expenses', async ({
    page,
    expensesPage,
  }) => {
    await expensesPage.goto();
    await expensesPage.waitForExpenses();

    // Create an expense for today (current month)
    const todayStr = await page.evaluate(() => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    });

    await expensesPage.submitCreateExpense({
      category: 'Transport',
      amount: 8.00,
      description: 'Current month only expense',
      date: todayStr,
    });
    await expensesPage.waitForExpenses();

    // Apply "Last Month" filter
    await expensesPage.filterByDatePreset('last-month');

    // Current month expense should NOT appear
    await expensesPage.expectExpenseNotVisible('Current month only expense');
  });

  test('custom date range filters correctly', async ({ expensesPage }) => {
    await expensesPage.goto();
    await expensesPage.waitForExpenses();

    // Create expenses in different date ranges
    await expensesPage.submitCreateExpense({
      category: 'Food',
      amount: 10.00,
      description: 'Jan 10 expense',
      date: '2026-01-10',
    });
    await expensesPage.submitCreateExpense({
      category: 'Food',
      amount: 20.00,
      description: 'Jan 20 expense',
      date: '2026-01-20',
    });
    await expensesPage.waitForExpenses();

    // Filter to Jan 1-15 only
    await expensesPage.filterByDatePreset('custom');
    await expensesPage.customStartDate.fill('2026-01-01');
    await expensesPage.customEndDate.fill('2026-01-15');
    await expensesPage.page.waitForLoadState('networkidle');

    await expensesPage.expectExpenseVisible('Jan 10 expense');
    await expensesPage.expectExpenseNotVisible('Jan 20 expense');
  });

  test('expense date persists correctly through edit', async ({ expensesPage }) => {
    await expensesPage.goto();
    await expensesPage.waitForExpenses();

    // Create with a specific date
    await expensesPage.submitCreateExpense({
      category: 'Bills',
      amount: 50.00,
      description: 'Date persistence test',
      date: '2026-02-14',
    });
    await expensesPage.waitForExpenses();

    // Open edit — date should be preserved
    await expensesPage.clickEditOnExpense('Date persistence test');
    const dateInEdit = await expensesPage.getDateInputValue();
    expect(dateInEdit).toBe('2026-02-14');

    // Change the date and save
    await expensesPage.dateInput.fill('2026-03-01');
    await expensesPage.updateButton.click();
    await expect(expensesPage.modal).toBeHidden({ timeout: 5_000 });
    await expensesPage.waitForExpenses();

    // Verify the new date is displayed
    const displayedDate = await expensesPage.getExpenseDisplayedDate('Date persistence test');
    expect(displayedDate).toBe('Mar 1, 2026');
  });
});
