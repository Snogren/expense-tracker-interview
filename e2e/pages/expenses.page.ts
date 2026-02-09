import { type Page, type Locator } from '@playwright/test';

export class ExpensesPage {
  readonly addExpenseButton: Locator;
  readonly categorySelect: Locator;
  readonly amountInput: Locator;
  readonly descriptionInput: Locator;
  readonly dateInput: Locator;
  readonly createButton: Locator;
  readonly searchInput: Locator;
  readonly expenseList: Locator;

  constructor(private page: Page) {
    this.addExpenseButton = page.getByRole('button', { name: 'Add Expense' });
    this.categorySelect = page.getByLabel('Category');
    this.amountInput = page.getByLabel('Amount');
    this.descriptionInput = page.getByLabel('Description');
    this.dateInput = page.getByLabel('Date');
    this.createButton = page.getByRole('button', { name: 'Create' });
    this.searchInput = page.getByPlaceholder('Search expenses...');
    this.expenseList = page.locator('ul');
    this.editModal = page.getByRole('heading', { name: 'Edit Expense' });
    this.deleteModal = page.getByText('Are you sure you want to delete this expense?');
  }

  async goto() {
    await this.page.goto('/expenses');
  }

  async addExpense(category: string, amount: string, description: string, date: string) {
    await this.addExpenseButton.click();
    await this.categorySelect.selectOption({ label: category });
    await this.amountInput.fill(amount);
    await this.descriptionInput.fill(description);
    await this.dateInput.fill(date);
    await this.createButton.click();
  }

  readonly editModal: Locator;
  readonly deleteModal: Locator;

  async searchExpenses(query: string) {
    await this.searchInput.fill(query);
  }

  expenseRow(description: string): Locator {
    return this.expenseList.locator('li').filter({ hasText: description });
  }

  editButton(description: string): Locator {
    return this.expenseRow(description).getByTitle('Edit');
  }

  deleteButton(description: string): Locator {
    return this.expenseRow(description).getByTitle('Delete');
  }
}
