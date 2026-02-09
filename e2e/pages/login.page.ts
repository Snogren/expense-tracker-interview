import { type Page, type Locator } from '@playwright/test';

export class LoginPage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly registerLink: Locator;
  readonly registerButton: Locator;
  readonly logoutButton: Locator;
  readonly errorMessage: Locator;

  constructor(private page: Page) {
    this.emailInput = page.getByPlaceholder('Email address');
    this.passwordInput = page.getByPlaceholder('Password');
    this.signInButton = page.getByRole('button', { name: 'Sign in' });
    this.registerLink = page.getByRole('button', { name: 'Register' });
    this.registerButton = page.getByRole('button', { name: 'Register' });
    this.logoutButton = page.getByRole('button', { name: 'Logout' });
    this.errorMessage = page.getByText('Invalid email or password');
  }

  async goto() {
    await this.page.goto('/');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }

  async register(email: string, password: string) {
    await this.registerLink.click();
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.registerButton.click();
  }
}
