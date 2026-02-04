import { apiRequest, ApiError } from './client';
import type { ReceiptAnalysisResult } from '../types';

export async function analyzeEmailReceipt(emailContent: string): Promise<ReceiptAnalysisResult> {
  return apiRequest<ReceiptAnalysisResult>('/receipts/analyze', {
    method: 'POST',
    body: JSON.stringify({ emailContent }),
  });
}

export async function analyzePdfReceipt(file: File): Promise<ReceiptAnalysisResult> {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  formData.append('pdf', file);

  const response = await fetch('/api/receipts/analyze-pdf', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new ApiError(error.error || 'Request failed', response.status, error.details);
  }

  return response.json();
}
