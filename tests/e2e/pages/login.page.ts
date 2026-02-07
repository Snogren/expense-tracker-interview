import { type Page, type Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;

  // Form elements
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly heading: Locator;
  readonly errorMessage: Locator;
  readonly demoCredentials: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.submitButton = page.locator('button[type="submit"]');
    this.heading = page.getByRole('heading');
    this.errorMessage = page.locator('.bg-red-50 .text-red-700');
    this.demoCredentials = page.getByText('Demo account');
  }

  async goto() {
    await this.page.goto('/');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async loginAsDemoUser() {
    await this.login('demo@example.com', 'password123');
  }

  async switchToRegister() {
    // The toggle button for switching to register mode has text "Register"
    // when currently in login mode
    await this.page.locator('button.font-medium.text-indigo-600', { hasText: 'Register' }).click();
  }

  async switchToLogin() {
    await this.page.locator('button.font-medium.text-indigo-600', { hasText: 'Sign in' }).click();
  }

  async register(email: string, password: string) {
    await this.switchToRegister();
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectLoggedIn() {
    // Should see the app layout nav after login
    await expect(this.page.getByText('ExpenseTracker')).toBeVisible({ timeout: 10_000 });
  }

  async expectOnLoginPage() {
    await expect(this.heading).toContainText(/sign in|create your account/i, { timeout: 5_000 });
  }

  async expectError(text: string | RegExp) {
    await expect(this.errorMessage).toContainText(text);
  }
}
