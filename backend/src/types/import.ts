export type ImportSessionStatus = 'upload' | 'mapping' | 'preview' | 'completed' | 'cancelled';

export interface ImportSession {
  id: number;
  userId: number;
  status: ImportSessionStatus;
  fileName: string | null;
  fileSize: number | null;
  rawCsvData: string | null;
  columnMapping: string | null; // JSON string
  parsedRows: string | null; // JSON string
  validRowCount: number;
  invalidRowCount: number;
  skippedRowCount: number;
  importedExpenseCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ImportHistory {
  id: number;
  userId: number;
  sessionId: number;
  fileName: string;
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  createdAt: string;
}

export interface ColumnMapping {
  date: string;
  amount: string;
  description: string;
  category?: string;
}

export interface RowValidationError {
  field: string;
  message: string;
}

export interface ParsedRow {
  rowIndex: number;
  originalData: Record<string, string>;
  date: string | null;
  amount: number | null;
  description: string | null;
  category: string | null;
  categoryId: number | null;
  errors: RowValidationError[];
  skipped: boolean;
}

export interface CsvStructure {
  headers: string[];
  delimiter: string;
  rowCount: number;
  sampleRows: string[][];
  suggestedMapping: Partial<ColumnMapping>;
}

export interface UploadResult {
  session: ImportSession;
  structure: CsvStructure;
}

export interface MappingResult {
  session: ImportSession;
  parsedRows: ParsedRow[];
  validCount: number;
  invalidCount: number;
}

export interface ImportResult {
  importedCount: number;
  skippedCount: number;
  history: ImportHistory;
}
