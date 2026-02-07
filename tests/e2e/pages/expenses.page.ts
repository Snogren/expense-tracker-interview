import { type Page, type Locator, expect } from '@playwright/test';

export class ExpensesPage {
  readonly page: Page;

  // Top-level actions
  readonly addExpenseButton: Locator;
  readonly searchInput: Locator;

  // Date filter presets
  readonly allTimeButton: Locator;
  readonly thisMonthButton: Locator;
  readonly lastMonthButton: Locator;
  readonly last12MonthsButton: Locator;
  readonly customButton: Locator;
  readonly customStartDate: Locator;
  readonly customEndDate: Locator;
  readonly clearDatesButton: Locator;

  // Expense list
  readonly expenseRows: Locator;
  readonly emptyState: Locator;

  // Create/Edit modal
  readonly modal: Locator;
  readonly modalTitle: Locator;
  readonly categorySelect: Locator;
  readonly amountInput: Locator;
  readonly descriptionInput: Locator;
  readonly dateInput: Locator;
  readonly createButton: Locator;
  readonly updateButton: Locator;
  readonly cancelButton: Locator;

  // Delete confirmation modal
  readonly deleteConfirmButton: Locator;
  readonly deleteCancelButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Actions
    this.addExpenseButton = page.getByRole('button', { name: 'Add Expense' });
    this.searchInput = page.getByPlaceholder('Search expenses...');

    // Date filters
    this.allTimeButton = page.getByRole('button', { name: 'All Time' });
    this.thisMonthButton = page.getByRole('button', { name: 'This Month' });
    this.lastMonthButton = page.getByRole('button', { name: 'Last Month' });
    this.last12MonthsButton = page.getByRole('button', { name: 'Last 12 Months' });
    this.customButton = page.getByRole('button', { name: 'Custom' });
    this.customStartDate = page.locator('#startDate');
    this.customEndDate = page.locator('#endDate');
    this.clearDatesButton = page.getByRole('button', { name: 'Clear' });

    // Expense list
    this.expenseRows = page.locator('ul.divide-y > li');
    this.emptyState = page.getByText('No expenses found');

    // Modal form — the Modal component renders: div.fixed.inset-0.z-50 > div > div.fixed (backdrop) + div.relative.bg-white (content)
    // We target the z-50 outer wrapper to avoid strict mode violations from the backdrop also having 'fixed inset-0'
    this.modal = page.locator('.fixed.inset-0.z-50');
    this.modalTitle = this.modal.locator('h3');
    this.categorySelect = page.locator('#category');
    this.amountInput = page.locator('#amount');
    this.descriptionInput = page.locator('#description');
    this.dateInput = page.locator('#date');
    this.createButton = this.modal.getByRole('button', { name: 'Create' });
    this.updateButton = this.modal.getByRole('button', { name: 'Update' });
    this.cancelButton = this.modal.getByRole('button', { name: 'Cancel' });

    // Delete confirmation — appears in a second modal
    this.deleteConfirmButton = page.getByRole('button', { name: 'Delete', exact: true });
    this.deleteCancelButton = page.locator('.fixed.inset-0.z-50').last().getByRole('button', { name: 'Cancel' });
  }

  async goto() {
    await this.page.goto('/expenses');
    await this.page.waitForLoadState('networkidle');
  }

  async waitForExpenses() {
    // Wait for the expense list or empty state to appear
    await expect(
      this.expenseRows.first().or(this.emptyState)
    ).toBeVisible({ timeout: 10_000 });
  }

  // --- CRUD Actions ---

  async openAddExpenseModal() {
    await this.addExpenseButton.click();
    await expect(this.modal).toBeVisible();
  }

  async fillExpenseForm(data: {
    category?: string;
    amount: number;
    description: string;
    date?: string;
  }) {
    if (data.category) {
      await this.categorySelect.selectOption({ label: data.category });
    }
    await this.amountInput.fill(data.amount.toString());
    await this.descriptionInput.fill(data.description);
    if (data.date) {
      await this.dateInput.fill(data.date);
    }
  }

  async submitCreateExpense(data: {
    category?: string;
    amount: number;
    description: string;
    date?: string;
  }) {
    await this.openAddExpenseModal();
    await this.fillExpenseForm(data);
    await this.createButton.click();
    await expect(this.modal).toBeHidden({ timeout: 5_000 });
  }

  async getDateInputValue(): Promise<string> {
    return (await this.dateInput.inputValue()) || '';
  }

  async clickEditOnExpense(description: string) {
    const row = this.expenseRows.filter({ hasText: description });
    await row.getByTitle('Edit').click();
    await expect(this.modal).toBeVisible();
  }

  async clickDeleteOnExpense(description: string) {
    const row = this.expenseRows.filter({ hasText: description });
    await row.getByTitle('Delete').click();
  }

  async confirmDelete() {
    await this.deleteConfirmButton.click();
  }

  async getExpenseDescriptions(): Promise<string[]> {
    const descriptions: string[] = [];
    const count = await this.expenseRows.count();
    for (let i = 0; i < count; i++) {
      const text = await this.expenseRows.nth(i).locator('p.font-medium').textContent();
      if (text) descriptions.push(text);
    }
    return descriptions;
  }

  async getExpenseRowCount(): Promise<number> {
    return this.expenseRows.count();
  }

  async getExpenseDisplayedDate(description: string): Promise<string> {
    const row = this.expenseRows.filter({ hasText: description });
    // Date is inside: "CategoryName · Jan 15, 2026"
    const subtitle = await row.locator('p.text-gray-500').textContent();
    // Extract date portion after the middot
    const parts = subtitle?.split('·') || [];
    return (parts[1] || '').trim();
  }

  async expectExpenseVisible(description: string) {
    await expect(this.expenseRows.filter({ hasText: description })).toBeVisible();
  }

  async expectExpenseNotVisible(description: string) {
    await expect(this.expenseRows.filter({ hasText: description })).toHaveCount(0);
  }

  // --- Filters ---

  async search(query: string) {
    await this.searchInput.fill(query);
    // Debounced — wait for network
    await this.page.waitForTimeout(500);
    await this.page.waitForLoadState('networkidle');
  }

  async filterByDatePreset(preset: 'all' | 'this-month' | 'last-month' | 'last-12-months' | 'custom') {
    const buttons: Record<string, Locator> = {
      'all': this.allTimeButton,
      'this-month': this.thisMonthButton,
      'last-month': this.lastMonthButton,
      'last-12-months': this.last12MonthsButton,
      'custom': this.customButton,
    };
    await buttons[preset].click();
    await this.page.waitForLoadState('networkidle');
  }
}
