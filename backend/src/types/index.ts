export interface User {
  id: number;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface Category {
  id: number;
  name: string;
  icon: string;
}

export interface Expense {
  id: number;
  userId: number;
  categoryId: number;
  amount: number;
  description: string;
  date: string;
  createdAt: string;
}

export interface ExpenseWithCategory extends Expense {
  categoryName: string;
  categoryIcon: string;
}

export interface JwtPayload {
  userId: number;
  email: string;
}

export interface AuthenticatedRequest {
  user: JwtPayload;
}

export * from './import';
