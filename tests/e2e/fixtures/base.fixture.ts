import { test as base, expect } from '@playwright/test';
import { execSync } from 'child_process';
import path from 'path';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';
import { ExpensesPage } from '../pages/expenses.page';
import { ImportPage } from '../pages/import.page';

// Re-seed the database before tests run
function seedDatabase() {
  const backendDir = path.resolve(__dirname, '../../../backend');
  // Just run the seed — it clears existing data and re-inserts.
  // Avoid rollback+migrate because it drops tables that the running server needs.
  execSync('npx knex seed:run --knexfile src/db/knexfile.ts', {
    cwd: backendDir,
    stdio: 'pipe',
  });
}

export type TestFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  expensesPage: ExpensesPage;
  importPage: ImportPage;
  seedDb: void;
};

export const test = base.extend<TestFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
  expensesPage: async ({ page }, use) => {
    await use(new ExpensesPage(page));
  },
  importPage: async ({ page }, use) => {
    await use(new ImportPage(page));
  },
  seedDb: [
    async ({}, use) => {
      seedDatabase();
      await use();
    },
    { scope: 'test', auto: false },
  ],
});

export { expect };
