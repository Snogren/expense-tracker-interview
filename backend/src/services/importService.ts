import db from '../db/knex.js';
import logger from '../logger.js';
import type {
  ImportSession,
  ImportHistory,
  ColumnMapping,
  ParsedRow,
  CsvStructure,
  UploadResult,
  MappingResult,
  ImportResult,
  RowValidationError,
} from '../types/index.js';

// Category aliases for matching
const CATEGORY_ALIASES: Record<string, string[]> = {
  'Food': ['food', 'groceries', 'grocery', 'restaurant', 'dining', 'lunch', 'dinner', 'breakfast', 'meal', 'meals'],
  'Transport': ['transport', 'transportation', 'uber', 'lyft', 'taxi', 'cab', 'gas', 'fuel', 'parking', 'transit', 'bus', 'train'],
  'Entertainment': ['entertainment', 'movies', 'movie', 'netflix', 'spotify', 'games', 'gaming', 'concert', 'show'],
  'Shopping': ['shopping', 'amazon', 'clothes', 'clothing', 'retail', 'store'],
  'Bills': ['bills', 'bill', 'utilities', 'utility', 'electric', 'electricity', 'water', 'internet', 'phone', 'rent', 'mortgage'],
  'Other': ['other', 'misc', 'miscellaneous'],
};

// Date format patterns
const DATE_PATTERNS = [
  { regex: /^\d{4}-\d{2}-\d{2}$/, format: 'YYYY-MM-DD' },
  { regex: /^\d{2}\/\d{2}\/\d{4}$/, format: 'MM/DD/YYYY' },
  { regex: /^\d{2}-\d{2}-\d{4}$/, format: 'DD-MM-YYYY' },
  { regex: /^\d{4}\/\d{2}\/\d{2}$/, format: 'YYYY/MM/DD' },
];

// Detect delimiter from CSV content
function detectDelimiter(content: string): string {
  const firstLine = content.split('\n')[0] || '';
  const delimiters = [',', ';', '\t'];
  let maxCount = 0;
  let detected = ',';

  for (const delimiter of delimiters) {
    const count = (firstLine.match(new RegExp(delimiter === '\t' ? '\\t' : delimiter, 'g')) || []).length;
    if (count > maxCount) {
      maxCount = count;
      detected = delimiter;
    }
  }

  return detected;
}

// Parse CSV line handling quoted fields
function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

// Parse CSV content into lines
function parseCsv(content: string, delimiter: string): string[][] {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  return lines.map(line => parseCsvLine(line, delimiter));
}

// Suggest column mapping based on header names
function suggestMapping(headers: string[]): Partial<ColumnMapping> {
  const mapping: Partial<ColumnMapping> = {};
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());

  // Date column detection
  const dateKeywords = ['date', 'time', 'when', 'day'];
  const dateIndex = lowerHeaders.findIndex(h => dateKeywords.some(k => h.includes(k)));
  if (dateIndex !== -1) mapping.date = headers[dateIndex];

  // Amount column detection
  const amountKeywords = ['amount', 'price', 'cost', 'total', 'value', 'sum'];
  const amountIndex = lowerHeaders.findIndex(h => amountKeywords.some(k => h.includes(k)));
  if (amountIndex !== -1) mapping.amount = headers[amountIndex];

  // Description column detection
  const descKeywords = ['description', 'desc', 'note', 'notes', 'memo', 'item', 'name', 'details'];
  const descIndex = lowerHeaders.findIndex(h => descKeywords.some(k => h.includes(k)));
  if (descIndex !== -1) mapping.description = headers[descIndex];

  // Category column detection
  const catKeywords = ['category', 'type', 'group', 'class'];
  const catIndex = lowerHeaders.findIndex(h => catKeywords.some(k => h.includes(k)));
  if (catIndex !== -1) mapping.category = headers[catIndex];

  return mapping;
}

// Parse date string to YYYY-MM-DD format
function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;

  const trimmed = dateStr.trim();

  for (const { regex, format } of DATE_PATTERNS) {
    if (regex.test(trimmed)) {
      const parts = trimmed.split(/[-\/]/);

      switch (format) {
        case 'YYYY-MM-DD':
          return trimmed;
        case 'MM/DD/YYYY':
          return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
        case 'DD-MM-YYYY':
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        case 'YYYY/MM/DD':
          return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
    }
  }

  // Try to parse as a generic date
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return null;
}

// Parse amount string to number
function parseAmount(amountStr: string): number | null {
  if (!amountStr) return null;

  // Remove currency symbols and whitespace
  const cleaned = amountStr.replace(/[$\u20AC\u00A3\s,]/g, '').trim();

  // Handle negative amounts in parentheses
  const isNegative = cleaned.startsWith('(') && cleaned.endsWith(')');
  const numStr = isNegative ? cleaned.slice(1, -1) : cleaned;

  const num = parseFloat(numStr);
  if (isNaN(num)) return null;

  return isNegative ? -num : num;
}

// Match category name to existing categories
async function matchCategory(categoryStr: string | null): Promise<{ id: number; name: string } | null> {
  if (!categoryStr) return null;

  const categories = await db('categories').select('id', 'name');
  const lowerInput = categoryStr.toLowerCase().trim();

  // Exact match
  const exact = categories.find(c => c.name.toLowerCase() === lowerInput);
  if (exact) return exact;

  // Partial match (contains)
  const partial = categories.find(c => c.name.toLowerCase().includes(lowerInput) || lowerInput.includes(c.name.toLowerCase()));
  if (partial) return partial;

  // Alias match
  for (const [categoryName, aliases] of Object.entries(CATEGORY_ALIASES)) {
    if (aliases.some(alias => lowerInput.includes(alias) || alias.includes(lowerInput))) {
      const matched = categories.find(c => c.name === categoryName);
      if (matched) return matched;
    }
  }

  // Default to "Other" category
  const other = categories.find(c => c.name === 'Other');
  return other || null;
}

// Validate a parsed row
function validateRow(row: Omit<ParsedRow, 'errors'>): RowValidationError[] {
  const errors: RowValidationError[] = [];

  if (!row.date) {
    errors.push({ field: 'date', message: 'Date is required and must be in a valid format' });
  }

  if (row.amount === null || row.amount === undefined) {
    errors.push({ field: 'amount', message: 'Amount is required and must be a number' });
  } else if (row.amount <= 0) {
    errors.push({ field: 'amount', message: 'Amount must be greater than zero' });
  }

  if (!row.description || row.description.trim() === '') {
    errors.push({ field: 'description', message: 'Description is required' });
  }

  return errors;
}

// Get active session for user
export async function getActiveSession(userId: number): Promise<ImportSession | null> {
  const session = await db('import_sessions')
    .where({ userId })
    .whereNotIn('status', ['completed', 'cancelled'])
    .orderBy('createdAt', 'desc')
    .first();

  return session || null;
}

// Get session by ID
export async function getSession(id: number, userId: number): Promise<ImportSession | null> {
  const session = await db('import_sessions')
    .where({ id, userId })
    .first();

  return session || null;
}

// Create new session (cancels any existing active session)
export async function createSession(userId: number): Promise<ImportSession> {
  // Cancel any existing active sessions
  await db('import_sessions')
    .where({ userId })
    .whereNotIn('status', ['completed', 'cancelled'])
    .update({ status: 'cancelled', updatedAt: db.fn.now() });

  const [id] = await db('import_sessions').insert({
    userId,
    status: 'upload',
  });

  logger.info({ userId, sessionId: id }, 'Created new import session');

  const session = await db('import_sessions').where({ id }).first<ImportSession>();
  return session!;
}

// Cancel session
export async function cancelSession(id: number, userId: number): Promise<boolean> {
  const updated = await db('import_sessions')
    .where({ id, userId })
    .whereNotIn('status', ['completed', 'cancelled'])
    .update({ status: 'cancelled', updatedAt: db.fn.now() });

  if (updated > 0) {
    logger.info({ userId, sessionId: id }, 'Cancelled import session');
  }

  return updated > 0;
}

// Upload CSV and detect structure
export async function uploadCsv(
  userId: number,
  fileName: string,
  csvContent: string
): Promise<UploadResult> {
  // Get or create session
  let session = await getActiveSession(userId);
  if (!session) {
    session = await createSession(userId);
  }

  const delimiter = detectDelimiter(csvContent);
  const rows = parseCsv(csvContent, delimiter);

  if (rows.length < 2) {
    throw new Error('CSV must have at least a header row and one data row');
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);
  const sampleRows = dataRows.slice(0, 5);
  const suggestedMapping = suggestMapping(headers);

  // Update session with file data
  await db('import_sessions')
    .where({ id: session.id })
    .update({
      fileName,
      fileSize: csvContent.length,
      rawCsvData: csvContent,
      status: 'upload',
      updatedAt: db.fn.now(),
    });

  session = await getSession(session.id, userId);

  const structure: CsvStructure = {
    headers,
    delimiter,
    rowCount: dataRows.length,
    sampleRows,
    suggestedMapping,
  };

  logger.info({ userId, sessionId: session!.id, fileName, rowCount: dataRows.length }, 'CSV uploaded');

  return { session: session!, structure };
}

// Save mapping and parse all rows
export async function saveMapping(
  sessionId: number,
  userId: number,
  mapping: ColumnMapping
): Promise<MappingResult> {
  const session = await getSession(sessionId, userId);
  if (!session) {
    throw new Error('Session not found');
  }

  if (!session.rawCsvData) {
    throw new Error('No CSV data in session');
  }

  const delimiter = detectDelimiter(session.rawCsvData);
  const rows = parseCsv(session.rawCsvData, delimiter);
  const headers = rows[0];
  const dataRows = rows.slice(1);

  // Create header index map
  const headerIndex: Record<string, number> = {};
  headers.forEach((h, i) => { headerIndex[h] = i; });

  // Parse and validate each row
  const parsedRows: ParsedRow[] = [];
  let validCount = 0;
  let invalidCount = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const originalData: Record<string, string> = {};
    headers.forEach((h, idx) => { originalData[h] = row[idx] || ''; });

    const dateStr = row[headerIndex[mapping.date]] || '';
    const amountStr = row[headerIndex[mapping.amount]] || '';
    const descStr = row[headerIndex[mapping.description]] || '';
    const catStr = mapping.category ? (row[headerIndex[mapping.category]] || '') : '';

    const date = parseDate(dateStr);
    const amount = parseAmount(amountStr);
    const description = descStr.trim();
    const categoryMatch = await matchCategory(catStr);

    const parsedRow: Omit<ParsedRow, 'errors'> = {
      rowIndex: i,
      originalData,
      date,
      amount,
      description,
      category: categoryMatch?.name || null,
      categoryId: categoryMatch?.id || null,
      skipped: false,
    };

    const errors = validateRow(parsedRow);
    const fullRow: ParsedRow = { ...parsedRow, errors };

    if (errors.length > 0) {
      invalidCount++;
    } else {
      validCount++;
    }

    parsedRows.push(fullRow);
  }

  // Update session
  await db('import_sessions')
    .where({ id: sessionId })
    .update({
      columnMapping: JSON.stringify(mapping),
      parsedRows: JSON.stringify(parsedRows),
      validRowCount: validCount,
      invalidRowCount: invalidCount,
      status: 'preview',
      updatedAt: db.fn.now(),
    });

  const updatedSession = await getSession(sessionId, userId);

  logger.info({ userId, sessionId, validCount, invalidCount }, 'Mapping saved and rows parsed');

  return {
    session: updatedSession!,
    parsedRows,
    validCount,
    invalidCount,
  };
}

// Update a specific row's data
export async function updateRow(
  sessionId: number,
  userId: number,
  rowIndex: number,
  updates: { date?: string; amount?: number; description?: string; category?: string }
): Promise<ParsedRow> {
  const session = await getSession(sessionId, userId);
  if (!session) {
    throw new Error('Session not found');
  }

  if (!session.parsedRows) {
    throw new Error('No parsed rows in session');
  }

  const parsedRows: ParsedRow[] = JSON.parse(session.parsedRows);
  const row = parsedRows.find(r => r.rowIndex === rowIndex);

  if (!row) {
    throw new Error('Row not found');
  }

  // Apply updates
  if (updates.date !== undefined) {
    row.date = parseDate(updates.date);
  }
  if (updates.amount !== undefined) {
    row.amount = updates.amount;
  }
  if (updates.description !== undefined) {
    row.description = updates.description;
  }
  if (updates.category !== undefined) {
    const categoryMatch = await matchCategory(updates.category);
    row.category = categoryMatch?.name || null;
    row.categoryId = categoryMatch?.id || null;
  }

  // Re-validate
  row.errors = validateRow(row);

  // Recalculate counts
  let validCount = 0;
  let invalidCount = 0;
  for (const r of parsedRows) {
    if (r.skipped) continue;
    if (r.errors.length > 0) {
      invalidCount++;
    } else {
      validCount++;
    }
  }

  // Update session
  await db('import_sessions')
    .where({ id: sessionId })
    .update({
      parsedRows: JSON.stringify(parsedRows),
      validRowCount: validCount,
      invalidRowCount: invalidCount,
      updatedAt: db.fn.now(),
    });

  logger.info({ userId, sessionId, rowIndex }, 'Row updated');

  return row;
}

// Skip or unskip a row
export async function skipRow(
  sessionId: number,
  userId: number,
  rowIndex: number,
  skip: boolean
): Promise<ParsedRow> {
  const session = await getSession(sessionId, userId);
  if (!session) {
    throw new Error('Session not found');
  }

  if (!session.parsedRows) {
    throw new Error('No parsed rows in session');
  }

  const parsedRows: ParsedRow[] = JSON.parse(session.parsedRows);
  const row = parsedRows.find(r => r.rowIndex === rowIndex);

  if (!row) {
    throw new Error('Row not found');
  }

  row.skipped = skip;

  // Recalculate counts
  let validCount = 0;
  let invalidCount = 0;
  let skippedCount = 0;
  for (const r of parsedRows) {
    if (r.skipped) {
      skippedCount++;
      continue;
    }
    if (r.errors.length > 0) {
      invalidCount++;
    } else {
      validCount++;
    }
  }

  // Update session
  await db('import_sessions')
    .where({ id: sessionId })
    .update({
      parsedRows: JSON.stringify(parsedRows),
      validRowCount: validCount,
      invalidRowCount: invalidCount,
      skippedRowCount: skippedCount,
      updatedAt: db.fn.now(),
    });

  logger.info({ userId, sessionId, rowIndex, skip }, 'Row skip status updated');

  return row;
}

// Confirm and execute import
export async function confirmImport(sessionId: number, userId: number): Promise<ImportResult> {
  const session = await getSession(sessionId, userId);
  if (!session) {
    throw new Error('Session not found');
  }

  if (session.status !== 'preview') {
    throw new Error('Session is not in preview status');
  }

  if (!session.parsedRows) {
    throw new Error('No parsed rows in session');
  }

  const parsedRows: ParsedRow[] = JSON.parse(session.parsedRows);
  const rowsToImport = parsedRows.filter(r => !r.skipped && r.errors.length === 0);

  if (rowsToImport.length === 0) {
    throw new Error('No valid rows to import');
  }

  // Get default category for rows without category
  const defaultCategory = await db('categories').where({ name: 'Other' }).first();
  const defaultCategoryId = defaultCategory?.id || 1;

  let importedCount = 0;
  const skippedCount = parsedRows.length - rowsToImport.length;

  // Use transaction for atomicity
  await db.transaction(async (trx) => {
    for (const row of rowsToImport) {
      await trx('expenses').insert({
        userId,
        categoryId: row.categoryId || defaultCategoryId,
        amount: row.amount,
        description: row.description,
        date: row.date,
      });
      importedCount++;
    }

    // Update session status
    await trx('import_sessions')
      .where({ id: sessionId })
      .update({
        status: 'completed',
        importedExpenseCount: importedCount,
        updatedAt: db.fn.now(),
      });

    // Create history record
    await trx('import_history').insert({
      userId,
      sessionId,
      fileName: session.fileName || 'unknown.csv',
      totalRows: parsedRows.length,
      importedRows: importedCount,
      skippedRows: skippedCount,
    });
  });

  logger.info({ userId, sessionId, importedCount, skippedCount }, 'Import completed');

  const history = await db('import_history')
    .where({ sessionId })
    .first<ImportHistory>();

  return {
    importedCount,
    skippedCount,
    history: history!,
  };
}

// List import history
export async function listImportHistory(userId: number): Promise<ImportHistory[]> {
  return db('import_history')
    .where({ userId })
    .orderBy('createdAt', 'desc');
}

// Get parsed rows from session
export async function getParsedRows(sessionId: number, userId: number): Promise<ParsedRow[]> {
  const session = await getSession(sessionId, userId);
  if (!session || !session.parsedRows) {
    return [];
  }
  return JSON.parse(session.parsedRows);
}
