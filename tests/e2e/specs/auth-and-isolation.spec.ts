import { test, expect } from '../fixtures/base.fixture';

test.describe('Auth & User Data Isolation', () => {
  test.beforeEach(async ({ seedDb }) => {
    // DB is freshly seeded before each test in this suite
  });

  test('login with valid demo credentials', async ({ loginPage, dashboardPage }) => {
    await loginPage.goto();
    await loginPage.loginAsDemoUser();
    await loginPage.expectLoggedIn();
  });

  test('login with invalid credentials shows error', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.login('wrong@example.com', 'wrongpassword');
    await loginPage.expectError(/invalid/i);
  });

  test('register a new user', async ({ loginPage }) => {
    const uniqueEmail = `newuser_${Date.now()}@test.com`;
    await loginPage.goto();
    await loginPage.register(uniqueEmail, 'testpass123');
    await loginPage.expectLoggedIn();
  });

  test('register with duplicate email shows error', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.register('demo@example.com', 'anotherpassword');
    await loginPage.expectError(/already|exists/i);
  });

  test('logout returns to login page', async ({ loginPage, dashboardPage }) => {
    await loginPage.goto();
    await loginPage.loginAsDemoUser();
    await loginPage.expectLoggedIn();
    await dashboardPage.logout();
    await loginPage.expectOnLoginPage();
  });

  test('user only sees their own expenses', async ({
    page,
    loginPage,
    expensesPage,
    dashboardPage,
  }) => {
    // TODO: use variables for all this data entry instead of hardcoding, to avoid test flakiness and make it more maintainable
    // i.e. "userAEmail" and "userAExpenseDescription"

    // Register User A and create a unique expense
    await loginPage.goto();
    const userAEmail = `usera_${Date.now()}@test.com`;
    await loginPage.register(userAEmail, 'password123');
    await loginPage.expectLoggedIn();

    // Navigate to expenses and create expense unique to User A
    await page.goto('/expenses');
    await expensesPage.waitForExpenses();
    await expensesPage.submitCreateExpense({
      category: 'Food',
      amount: 77.77,
      description: 'User A special dinner',
      date: '2026-01-20',
    });
    await expensesPage.waitForExpenses();
    await expensesPage.expectExpenseVisible('User A special dinner');

    // Logout
    await dashboardPage.logout();
    await loginPage.expectOnLoginPage();

    // Register User B
    const userBEmail = `userb_${Date.now()}@test.com`;
    await loginPage.register(userBEmail, 'password123');
    await loginPage.expectLoggedIn();

    // Navigate to expenses — User B should NOT see User A's expense
    await page.goto('/expenses');
    await expensesPage.waitForExpenses();
    await expensesPage.expectExpenseNotVisible('User A special dinner');

    // Create User B's own expense
    await expensesPage.submitCreateExpense({
      category: 'Transport',
      amount: 33.33,
      description: 'User B taxi ride',
      date: '2026-01-21',
    });
    await expensesPage.waitForExpenses();
    await expensesPage.expectExpenseVisible('User B taxi ride');

    // Logout and log back in as User A
    await dashboardPage.logout();
    await loginPage.expectOnLoginPage();
    await loginPage.login(userAEmail, 'password123');
    await loginPage.expectLoggedIn();

    // User A should see their expense but NOT User B's
    await page.goto('/expenses');
    await expensesPage.waitForExpenses();
    await expensesPage.expectExpenseVisible('User A special dinner');
    await expensesPage.expectExpenseNotVisible('User B taxi ride');
  });
});
