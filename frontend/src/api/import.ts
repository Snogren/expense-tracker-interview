import { apiRequest } from './client';
import type {
  ImportSession,
  ImportHistory,
  ColumnMapping,
  ParsedRow,
  UploadResult,
  MappingResult,
  ImportResult,
} from '../types';

export interface ActiveSessionResponse {
  session: ImportSession;
  parsedRows: ParsedRow[] | null;
}

export async function getActiveSession(): Promise<ActiveSessionResponse> {
  return apiRequest<ActiveSessionResponse>('/import/session');
}

export async function createSession(): Promise<{ session: ImportSession }> {
  return apiRequest<{ session: ImportSession }>('/import/session', {
    method: 'POST',
  });
}

export async function cancelSession(id: number): Promise<void> {
  return apiRequest<void>(`/import/session/${id}`, {
    method: 'DELETE',
  });
}

export async function uploadCsv(fileName: string, csvContent: string): Promise<UploadResult> {
  return apiRequest<UploadResult>('/import/upload', {
    method: 'POST',
    body: JSON.stringify({ fileName, csvContent }),
  });
}

export async function saveMapping(sessionId: number, columnMapping: ColumnMapping): Promise<MappingResult> {
  return apiRequest<MappingResult>(`/import/session/${sessionId}/mapping`, {
    method: 'POST',
    body: JSON.stringify({ columnMapping }),
  });
}

export async function updateRow(
  sessionId: number,
  rowIndex: number,
  updates: { date?: string; amount?: number; description?: string; category?: string }
): Promise<{ row: ParsedRow }> {
  return apiRequest<{ row: ParsedRow }>(`/import/session/${sessionId}/row`, {
    method: 'PATCH',
    body: JSON.stringify({ rowIndex, updates }),
  });
}

export async function skipRow(
  sessionId: number,
  rowIndex: number,
  skip: boolean
): Promise<{ row: ParsedRow }> {
  return apiRequest<{ row: ParsedRow }>(`/import/session/${sessionId}/skip`, {
    method: 'POST',
    body: JSON.stringify({ rowIndex, skip }),
  });
}

export async function confirmImport(sessionId: number): Promise<ImportResult> {
  return apiRequest<ImportResult>(`/import/session/${sessionId}/confirm`, {
    method: 'POST',
  });
}

export async function getImportHistory(): Promise<ImportHistory[]> {
  return apiRequest<ImportHistory[]>('/import/history');
}
