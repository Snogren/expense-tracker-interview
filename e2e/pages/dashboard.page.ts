import { type Page, type Locator } from '@playwright/test';

export class DashboardPage {
  readonly monthlySpendingAmount: Locator;
  readonly monthlySpendingChange: Locator;
  readonly totalExpensesCount: Locator;
  readonly avgPerExpense: Locator;
  readonly recentExpensesList: Locator;
  readonly editModal: Locator;
  readonly deleteModal: Locator;

  constructor(private page: Page) {
    const cards = page.locator('.bg-white.shadow.rounded-lg');
    const spendingCard = cards.nth(0);
    const totalCard = cards.nth(1);
    const avgCard = cards.nth(2);

    this.monthlySpendingAmount = spendingCard.locator('dd.text-lg');
    this.monthlySpendingChange = spendingCard.locator('dd.flex.items-center.text-sm');
    this.totalExpensesCount = totalCard.locator('dd.text-lg');
    this.avgPerExpense = avgCard.locator('dd.text-lg');
    this.recentExpensesList = page.locator('ul');
    this.editModal = page.getByRole('heading', { name: 'Edit Expense' });
    this.deleteModal = page.getByText('Are you sure you want to delete this expense?');
  }

  editButton(description: string): Locator {
    return this.recentExpensesList.locator('li').filter({ hasText: description }).getByTitle('Edit');
  }

  deleteButton(description: string): Locator {
    return this.recentExpensesList.locator('li').filter({ hasText: description }).getByTitle('Delete');
  }
}
