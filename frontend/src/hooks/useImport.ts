import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as importApi from '../api/import';
import type { ColumnMapping } from '../types';

export function useActiveSession() {
  return useQuery({
    queryKey: ['import-session'],
    queryFn: importApi.getActiveSession,
    retry: false,
  });
}

export function useImportHistory() {
  return useQuery({
    queryKey: ['import-history'],
    queryFn: importApi.getImportHistory,
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: importApi.createSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-session'] });
    },
  });
}

export function useCancelSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => importApi.cancelSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-session'] });
    },
  });
}

export function useUploadCsv() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ fileName, csvContent }: { fileName: string; csvContent: string }) =>
      importApi.uploadCsv(fileName, csvContent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-session'] });
    },
  });
}

export function useSaveMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, columnMapping }: { sessionId: number; columnMapping: ColumnMapping }) =>
      importApi.saveMapping(sessionId, columnMapping),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-session'] });
    },
  });
}

export function useUpdateRow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      rowIndex,
      updates,
    }: {
      sessionId: number;
      rowIndex: number;
      updates: { date?: string; amount?: number; description?: string; category?: string };
    }) => importApi.updateRow(sessionId, rowIndex, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-session'] });
    },
  });
}

export function useSkipRow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, rowIndex, skip }: { sessionId: number; rowIndex: number; skip: boolean }) =>
      importApi.skipRow(sessionId, rowIndex, skip),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-session'] });
    },
  });
}

export function useConfirmImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: number) => importApi.confirmImport(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-session'] });
      queryClient.invalidateQueries({ queryKey: ['import-history'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-total'] });
    },
  });
}
