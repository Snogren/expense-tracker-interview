import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';

interface MonthlyTotalResponse {
  total: number;
  year: number;
  month: number;
}

interface Expense {
  id: number;
  amount: number;
}

test.describe('Dashboard monthly spending portlet', () => {
  let token: string;
  let currentMonthTotal: number;
  let previousMonthTotal: number;
  let allExpenses: Expense[];

  test.beforeAll(async ({ request }) => {
    const loginResponse = await request.post('/api/auth/login', {
      data: { email: 'demo@example.com', password: 'password123' },
    });
    expect(loginResponse.ok()).toBeTruthy();
    const loginBody = await loginResponse.json();
    token = loginBody.token;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const prevDate = new Date(currentYear, currentMonth - 2, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonth = prevDate.getMonth() + 1;

    const [currentRes, previousRes, expensesRes] = await Promise.all([
      request.get(`/api/expenses/monthly-total?year=${currentYear}&month=${currentMonth}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      request.get(`/api/expenses/monthly-total?year=${prevYear}&month=${prevMonth}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      request.get('/api/expenses', {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    expect(currentRes.ok()).toBeTruthy();
    expect(previousRes.ok()).toBeTruthy();
    expect(expensesRes.ok()).toBeTruthy();

    const currentBody: MonthlyTotalResponse = await currentRes.json();
    const previousBody: MonthlyTotalResponse = await previousRes.json();
    allExpenses = await expensesRes.json();

    currentMonthTotal = currentBody.total;
    previousMonthTotal = previousBody.total;
  });

  test('shows correct current month amount and percent change', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.goto();
    await loginPage.login('demo@example.com', 'password123');

    const expectedAmount = `$${currentMonthTotal.toFixed(2)}`;
    await expect(dashboardPage.monthlySpendingAmount).toHaveText(expectedAmount);

    if (previousMonthTotal > 0) {
      const difference = currentMonthTotal - previousMonthTotal;
      const percentChange = Math.abs((difference / previousMonthTotal) * 100).toFixed(1);
      const expectedChange = `${percentChange}% vs last month`;

      await expect(dashboardPage.monthlySpendingChange).toContainText(expectedChange);
    }
  });

  test('shows correct total expense count', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.goto();
    await loginPage.login('demo@example.com', 'password123');

    await expect(dashboardPage.totalExpensesCount).toHaveText(String(allExpenses.length));
  });

  test('shows correct average per expense across all expenses', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.goto();
    await loginPage.login('demo@example.com', 'password123');

    const sum = allExpenses.reduce((total, e) => total + e.amount, 0);
    const avg = allExpenses.length > 0 ? sum / allExpenses.length : 0;
    const expectedAvg = `$${avg.toFixed(2)}`;

    await expect(dashboardPage.avgPerExpense).toHaveText(expectedAvg);
  });

  test('Unverified - Edit button on recent expense opens the edit modal', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.goto();
    await loginPage.login('demo@example.com', 'password123');

    const firstExpense = dashboardPage.recentExpensesList.locator('li').first();
    const description = await firstExpense.locator('p.text-sm.font-medium').innerText();

    await dashboardPage.editButton(description).click();

    await expect(dashboardPage.editModal).toBeVisible();
  });

  test('Unverified - Delete button on recent expense opens delete confirmation', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.goto();
    await loginPage.login('demo@example.com', 'password123');

    const firstExpense = dashboardPage.recentExpensesList.locator('li').first();
    const description = await firstExpense.locator('p.text-sm.font-medium').innerText();

    await dashboardPage.deleteButton(description).click();

    await expect(dashboardPage.deleteModal).toBeVisible();
  });
});
