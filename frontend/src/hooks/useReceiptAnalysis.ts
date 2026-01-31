import { useMutation } from '@tanstack/react-query';
import * as receiptsApi from '../api/receipts';

export function useAnalyzeReceipt() {
  return useMutation({
    mutationFn: (emailContent: string) => receiptsApi.analyzeEmailReceipt(emailContent),
  });
}

export function useAnalyzePdfReceipt() {
  return useMutation({
    mutationFn: (file: File) => receiptsApi.analyzePdfReceipt(file),
  });
}

export function useScanEmails() {
  return useMutation({
    mutationFn: () => receiptsApi.scanEmails(),
  });
}
