import { apiRequest } from './client';
import type { Expense, CreateExpenseData, UpdateExpenseData, MonthlyTotal } from '../types';

export interface GetExpensesParams {
  search?: string;
  startDate?: string;
  endDate?: string;
}

export async function getExpenses(params?: GetExpensesParams): Promise<Expense[]> {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.append('search', params.search);
  if (params?.startDate) searchParams.append('startDate', params.startDate);
  if (params?.endDate) searchParams.append('endDate', params.endDate);
  const query = searchParams.toString() ? `?${searchParams}` : '';
  return apiRequest<Expense[]>(`/expenses${query}`);
}

export async function getExpense(id: number): Promise<Expense> {
  return apiRequest<Expense>(`/expenses/${id}`);
}

export async function createExpense(data: CreateExpenseData): Promise<Expense> {
  return apiRequest<Expense>('/expenses', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateExpense(id: number, data: UpdateExpenseData): Promise<Expense> {
  return apiRequest<Expense>(`/expenses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteExpense(id: number): Promise<void> {
  return apiRequest<void>(`/expenses/${id}`, {
    method: 'DELETE',
  });
}

export async function getMonthlyTotal(year?: number, month?: number): Promise<MonthlyTotal> {
  const params = new URLSearchParams();
  if (year) params.append('year', year.toString());
  if (month) params.append('month', month.toString());
  const query = params.toString() ? `?${params}` : '';
  return apiRequest<MonthlyTotal>(`/expenses/monthly-total${query}`);
}
