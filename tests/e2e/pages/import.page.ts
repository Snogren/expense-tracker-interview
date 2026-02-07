import { type Page, type Locator, expect } from '@playwright/test';
import path from 'path';

export class ImportPage {
  readonly page: Page;

  // Landing page
  readonly startImportButton: Locator;
  readonly importHistorySection: Locator;
  readonly historyRows: Locator;

  // Wizard progress
  readonly wizardContainer: Locator;
  readonly cancelImportButton: Locator;

  // Step 1: Upload
  readonly fileInput: Locator;

  // Step 2: Mapping
  readonly mappingDateSelect: Locator;
  readonly mappingAmountSelect: Locator;
  readonly mappingDescriptionSelect: Locator;
  readonly mappingCategorySelect: Locator;
  readonly mappingContinueButton: Locator;
  readonly mappingBackButton: Locator;

  // Step 3: Preview
  readonly previewRows: Locator;
  readonly validCountBadge: Locator;
  readonly invalidCountBadge: Locator;
  readonly skippedCountBadge: Locator;
  readonly previewBackButton: Locator;
  readonly importConfirmButton: Locator;

  // Step 4: Complete
  readonly completeHeading: Locator;
  readonly viewExpensesButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Landing
    this.startImportButton = page.getByRole('button', { name: 'Start Import' });
    this.importHistorySection = page.getByRole('heading', { name: 'Import History' });
    this.historyRows = page.locator('table tbody tr');

    // Wizard
    this.wizardContainer = page.locator('.shadow-lg');
    this.cancelImportButton = page.getByRole('button', { name: 'Cancel Import' });

    // Upload
    this.fileInput = page.locator('input[type="file"]');

    // Mapping
    this.mappingDateSelect = page.locator('select').nth(0);
    this.mappingAmountSelect = page.locator('select').nth(1);
    this.mappingDescriptionSelect = page.locator('select').nth(2);
    this.mappingCategorySelect = page.locator('select').nth(3);
    this.mappingContinueButton = page.getByRole('button', { name: 'Continue' });
    this.mappingBackButton = page.getByRole('button', { name: 'Back' });

    // Preview
    this.previewRows = page.locator('table tbody tr');
    this.validCountBadge = page.locator('.bg-green-50 .font-bold');
    this.invalidCountBadge = page.locator('.bg-red-50 .font-bold');
    this.skippedCountBadge = page.locator('.bg-gray-50 .font-bold');
    this.previewBackButton = page.getByRole('button', { name: 'Back' });
    this.importConfirmButton = page.getByRole('button', { name: /Import \d+ Expenses/i });

    // Complete
    this.completeHeading = page.getByText('Import Complete!');
    this.viewExpensesButton = page.getByRole('button', { name: 'View Expenses' });
  }

  async goto() {
    await this.page.goto('/import');
    await this.page.waitForLoadState('networkidle');
  }

  async startWizard() {
    await this.startImportButton.click();
  }

  async uploadCsvFile(fileName: string) {
    const filePath = path.resolve(__dirname, '../fixtures/csv', fileName);
    await this.fileInput.setInputFiles(filePath);
    // Wait for processing to complete and move to mapping step
    await expect(this.mappingContinueButton).toBeVisible({ timeout: 10_000 });
  }

  async configureMappingAndContinue(mapping: {
    date?: string;
    amount?: string;
    description?: string;
    category?: string;
  }) {
    // The mapping selects are in a specific order: Date, Amount, Description, Category
    // We need to find them by their labels
    if (mapping.date) {
      const dateSelect = this.page.locator('label:has-text("Date") + select, label:has-text("Date") ~ select').first();
      // Fallback: use the grid container
      const dateFieldContainer = this.page.locator('div').filter({ has: this.page.locator('label', { hasText: 'Date' }) }).first();
      await dateFieldContainer.locator('select').selectOption(mapping.date);
    }
    if (mapping.amount) {
      const amountFieldContainer = this.page.locator('div').filter({ has: this.page.locator('label', { hasText: 'Amount' }) }).first();
      await amountFieldContainer.locator('select').selectOption(mapping.amount);
    }
    if (mapping.description) {
      const descFieldContainer = this.page.locator('div').filter({ has: this.page.locator('label', { hasText: 'Description' }) }).first();
      await descFieldContainer.locator('select').selectOption(mapping.description);
    }
    if (mapping.category) {
      const catFieldContainer = this.page.locator('div').filter({ has: this.page.locator('label', { hasText: 'Category' }) }).first();
      await catFieldContainer.locator('select').selectOption(mapping.category);
    }

    await this.mappingContinueButton.click();
    // Wait for preview step
    await expect(this.page.getByText('Preview Import')).toBeVisible({ timeout: 10_000 });
  }

  async getPreviewRowCount(): Promise<number> {
    return this.previewRows.count();
  }

  async getValidCount(): Promise<number> {
    const text = await this.validCountBadge.textContent();
    return parseInt(text || '0', 10);
  }

  async getSkippedCount(): Promise<number> {
    const text = await this.skippedCountBadge.textContent();
    return parseInt(text || '0', 10);
  }

  async skipRow(rowIndex: number) {
    const row = this.previewRows.nth(rowIndex);
    await row.getByRole('button', { name: 'Skip' }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async includeRow(rowIndex: number) {
    const row = this.previewRows.nth(rowIndex);
    await row.getByRole('button', { name: 'Include' }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async isRowSkipped(rowIndex: number): Promise<boolean> {
    const row = this.previewRows.nth(rowIndex);
    const statusText = await row.locator('td').first().textContent();
    return statusText?.includes('Skipped') ?? false;
  }

  async clickPreviewBack() {
    await this.previewBackButton.click();
    // Should go back to mapping step
    await expect(this.mappingContinueButton).toBeVisible({ timeout: 5_000 });
  }

  async confirmImport() {
    await this.importConfirmButton.click();
    await expect(this.completeHeading).toBeVisible({ timeout: 10_000 });
  }

  async clickViewExpenses() {
    await this.viewExpensesButton.click();
  }

  async getImportedCountFromComplete(): Promise<number> {
    // "Successfully imported 5 expenses"
    const text = await this.page.locator('p', { hasText: 'Successfully imported' }).textContent();
    const match = text?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }
}
