import { type Page, type Locator, expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;

  // Nav
  readonly dashboardLink: Locator;
  readonly expensesLink: Locator;
  readonly importLink: Locator;
  readonly logoutButton: Locator;

  // Stat cards
  readonly monthlySpendingCard: Locator;
  readonly totalExpensesCard: Locator;
  readonly avgPerExpenseCard: Locator;

  // Recent expenses section
  readonly recentExpensesHeading: Locator;
  readonly expenseRows: Locator;

  constructor(page: Page) {
    this.page = page;

    // Nav
    this.dashboardLink = page.getByRole('link', { name: 'Dashboard' });
    this.expensesLink = page.getByRole('link', { name: 'Expenses' });
    this.importLink = page.getByRole('link', { name: 'Import' });
    this.logoutButton = page.getByRole('button', { name: 'Logout' });

    // Stat cards — locate by their label text
    this.monthlySpendingCard = page.locator('dt', { hasText: 'Spending' }).locator('..');
    this.totalExpensesCard = page.locator('dt', { hasText: 'Total Expenses' }).locator('..');
    this.avgPerExpenseCard = page.locator('dt', { hasText: 'Avg per Expense' }).locator('..');

    // Recent expenses
    this.recentExpensesHeading = page.getByRole('heading', { name: 'Recent Expenses' });
    this.expenseRows = page.locator('ul.divide-y > li');
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async waitForData() {
    // Wait until stats are loaded (no "..." loading indicator)
    await expect(this.page.getByText('Dashboard')).toBeVisible();
    await this.page.waitForFunction(() => {
      return !document.body.textContent?.includes('...');
    }, { timeout: 10_000 });
  }

  async getMonthlySpending(): Promise<string> {
    const card = this.monthlySpendingCard;
    const valueEl = card.locator('dd').first();
    return (await valueEl.textContent()) || '';
  }

  async getTotalExpensesCount(): Promise<string> {
    const card = this.totalExpensesCard;
    const valueEl = card.locator('dd').first();
    return (await valueEl.textContent()) || '';
  }

  async getAvgPerExpense(): Promise<string> {
    const card = this.avgPerExpenseCard;
    const valueEl = card.locator('dd').first();
    return (await valueEl.textContent()) || '';
  }

  getRecentExpenseRow(index: number): Locator {
    return this.expenseRows.nth(index);
  }

  async clickEditOnExpense(index: number) {
    const row = this.getRecentExpenseRow(index);
    await row.getByTitle('Edit').click();
  }

  async clickDeleteOnExpense(index: number) {
    const row = this.getRecentExpenseRow(index);
    await row.getByTitle('Delete').click();
  }

  async getRecentExpenseDescriptions(): Promise<string[]> {
    const descriptions: string[] = [];
    const count = await this.expenseRows.count();
    for (let i = 0; i < count; i++) {
      const text = await this.expenseRows.nth(i).locator('p.font-medium').textContent();
      if (text) descriptions.push(text);
    }
    return descriptions;
  }

  async logout() {
    await this.logoutButton.click();
  }
}
