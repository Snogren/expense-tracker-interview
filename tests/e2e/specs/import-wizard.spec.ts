import { test, expect } from '../fixtures/base.fixture';

test.describe('CSV Import Wizard', () => {
  test.beforeEach(async ({ seedDb, loginPage }) => {
    await loginPage.goto();
    await loginPage.loginAsDemoUser();
    await loginPage.expectLoggedIn();
  });

  test('full import flow: upload, map, preview, confirm', async ({
    page,
    importPage,
    expensesPage,
  }) => {
    await importPage.goto();
    await importPage.startWizard();

    // Step 1: Upload
    await importPage.uploadCsvFile('valid-expenses.csv');

    // Step 2: Mapping — auto-suggested, just continue
    await importPage.mappingContinueButton.click();
    await expect(page.getByText('Preview Import')).toBeVisible({ timeout: 10_000 });

    // Step 3: Preview — all 5 rows should be valid
    const validCount = await importPage.getValidCount();
    expect(validCount).toBe(5);

    // Step 4: Confirm import
    await importPage.confirmImport();
    const importedCount = await importPage.getImportedCountFromComplete();
    expect(importedCount).toBe(5);

    // Verify expenses appear on the expenses page
    await importPage.clickViewExpenses();
    await page.waitForURL(/\/expenses/);
    await expensesPage.waitForExpenses();

    await expensesPage.expectExpenseVisible('Lunch at Italian place');
    await expensesPage.expectExpenseVisible('Concert tickets');
  });

  test('skipped rows are not imported', async ({ page, importPage }) => {
    await importPage.goto();
    await importPage.startWizard();

    // Upload
    await importPage.uploadCsvFile('valid-expenses.csv');

    // Map and continue
    await importPage.mappingContinueButton.click();
    await expect(page.getByText('Preview Import')).toBeVisible({ timeout: 10_000 });

    // Skip rows 0 and 1
    await importPage.skipRow(0);
    await importPage.skipRow(1);

    // Verify skip counts updated
    const skippedCount = await importPage.getSkippedCount();
    expect(skippedCount).toBe(2);

    const validCount = await importPage.getValidCount();
    expect(validCount).toBe(3);

    // Confirm import
    await importPage.confirmImport();
    const importedCount = await importPage.getImportedCountFromComplete();
    expect(importedCount).toBe(3);
  });

  test('include button re-includes a previously skipped row', async ({
    page,
    importPage,
  }) => {
    await importPage.goto();
    await importPage.startWizard();
    await importPage.uploadCsvFile('valid-expenses.csv');
    await importPage.mappingContinueButton.click();
    await expect(page.getByText('Preview Import')).toBeVisible({ timeout: 10_000 });

    // Skip a row
    await importPage.skipRow(0);
    expect(await importPage.isRowSkipped(0)).toBe(true);
    expect(await importPage.getSkippedCount()).toBe(1);

    // Include it back
    await importPage.includeRow(0);
    expect(await importPage.isRowSkipped(0)).toBe(false);
    expect(await importPage.getSkippedCount()).toBe(0);
  });

  test('going back from preview to mapping preserves skip selections on return', async ({
    page,
    importPage,
  }) => {
    /**
     * BUG DETECTOR: When the user clicks "Back" on the preview step, the wizard
     * goes back to the mapping step. When they click "Continue" again, the backend
     * re-parses all rows with fresh state, losing any skip selections the user made.
     *
     * This test skips rows, goes back, comes forward again, and asserts the
     * skip selections are still intact. If they're lost, the test FAILS.
     */
    await importPage.goto();
    await importPage.startWizard();
    await importPage.uploadCsvFile('valid-expenses.csv');
    await importPage.mappingContinueButton.click();
    await expect(page.getByText('Preview Import')).toBeVisible({ timeout: 10_000 });

    // Skip rows 0 and 2
    await importPage.skipRow(0);
    await importPage.skipRow(2);
    expect(await importPage.getSkippedCount()).toBe(2);
    expect(await importPage.isRowSkipped(0)).toBe(true);
    expect(await importPage.isRowSkipped(2)).toBe(true);

    // Go back to mapping
    await importPage.clickPreviewBack();

    // Go forward to preview again
    await importPage.mappingContinueButton.click();
    await expect(page.getByText('Preview Import')).toBeVisible({ timeout: 10_000 });

    // Skip selections should still be present
    expect(await importPage.getSkippedCount()).toBe(2);
    expect(await importPage.isRowSkipped(0)).toBe(true);
    expect(await importPage.isRowSkipped(2)).toBe(true);
  });

  test('mixed valid/invalid CSV shows correct counts', async ({
    page,
    importPage,
  }) => {
    await importPage.goto();
    await importPage.startWizard();
    await importPage.uploadCsvFile('mixed-valid-invalid.csv');

    // Map and continue
    await importPage.mappingContinueButton.click();
    await expect(page.getByText('Preview Import')).toBeVisible({ timeout: 10_000 });

    // Should have a mix of valid and invalid rows
    const validCount = await importPage.getValidCount();
    const invalidCount = await importPage.invalidCountBadge.textContent();
    const totalRows = await importPage.getPreviewRowCount();

    expect(totalRows).toBe(6);
    expect(validCount).toBeGreaterThan(0);
    expect(parseInt(invalidCount || '0')).toBeGreaterThan(0);
  });

  test('import history records completed import', async ({ page, importPage }) => {
    await importPage.goto();
    await importPage.startWizard();
    await importPage.uploadCsvFile('valid-expenses.csv');
    await importPage.mappingContinueButton.click();
    await expect(page.getByText('Preview Import')).toBeVisible({ timeout: 10_000 });
    await importPage.confirmImport();
    await importPage.clickViewExpenses();

    // Go back to import page
    await page.goto('/import');
    await page.waitForLoadState('networkidle');

    // Import history should show the completed import
    await expect(importPage.importHistorySection).toBeVisible();
    const historyRows = importPage.historyRows;
    const count = await historyRows.count();
    expect(count).toBeGreaterThan(0);

    // The most recent history entry should reference our file
    const firstRowText = await historyRows.first().textContent();
    expect(firstRowText).toContain('valid-expenses.csv');
  });

  test('cancel import returns to import landing page', async ({ page, importPage }) => {
    await importPage.goto();
    await importPage.startWizard();
    await importPage.uploadCsvFile('valid-expenses.csv');

    // Cancel the import
    await importPage.cancelImportButton.click();

    // Should be back on the import landing page
    await expect(importPage.startImportButton).toBeVisible();
  });
});
