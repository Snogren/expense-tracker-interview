import { useState, useCallback } from 'react';
import { Upload, ArrowRight, ArrowLeft, Check, AlertCircle, SkipForward } from 'lucide-react';
import {
  useUploadCsv,
  useSaveMapping,
  useSkipRow,
  useConfirmImport,
} from '../hooks/useImport';
import type { CsvStructure, ColumnMapping, ParsedRow, ImportSession } from '../types';

type WizardStep = 'upload' | 'mapping' | 'preview' | 'complete';

interface ImportWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

const STEPS: { key: WizardStep; label: string }[] = [
  { key: 'upload', label: 'Upload' },
  { key: 'mapping', label: 'Map Columns' },
  { key: 'preview', label: 'Preview' },
  { key: 'complete', label: 'Complete' },
];

export function ImportWizard({ onComplete, onCancel }: ImportWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('upload');
  const [session, setSession] = useState<ImportSession | null>(null);
  const [structure, setStructure] = useState<CsvStructure | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    date: '',
    amount: '',
    description: '',
    category: '',
  });
  const [importResult, setImportResult] = useState<{ importedCount: number; skippedCount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadMutation = useUploadCsv();
  const mappingMutation = useSaveMapping();
  const skipRowMutation = useSkipRow();
  const confirmMutation = useConfirmImport();

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const csvContent = event.target?.result as string;
      try {
        const result = await uploadMutation.mutateAsync({
          fileName: file.name,
          csvContent,
        });
        setSession(result.session);
        setStructure(result.structure);
        if (result.structure.suggestedMapping) {
          setMapping({
            date: result.structure.suggestedMapping.date || '',
            amount: result.structure.suggestedMapping.amount || '',
            description: result.structure.suggestedMapping.description || '',
            category: result.structure.suggestedMapping.category || '',
          });
        }
        setCurrentStep('mapping');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to upload file');
      }
    };
    reader.readAsText(file);
  }, [uploadMutation]);

  const handleMappingSubmit = useCallback(async () => {
    if (!session || !mapping.date || !mapping.amount || !mapping.description) {
      setError('Please map all required fields (date, amount, description)');
      return;
    }

    setError(null);
    try {
      const result = await mappingMutation.mutateAsync({
        sessionId: session.id,
        columnMapping: mapping,
      });
      setSession(result.session);
      setParsedRows(result.parsedRows);
      setCurrentStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save mapping');
    }
  }, [session, mapping, mappingMutation]);

  const handleSkipRow = useCallback(async (rowIndex: number, skip: boolean) => {
    if (!session) return;

    try {
      const result = await skipRowMutation.mutateAsync({
        sessionId: session.id,
        rowIndex,
        skip,
      });
      setParsedRows((prev) =>
        prev.map((row) => (row.rowIndex === rowIndex ? result.row : row))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update row');
    }
  }, [session, skipRowMutation]);

  const handleConfirm = useCallback(async () => {
    if (!session) return;

    setError(null);
    try {
      const result = await confirmMutation.mutateAsync(session.id);
      setImportResult({
        importedCount: result.importedCount,
        skippedCount: result.skippedCount,
      });
      setCurrentStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import expenses');
    }
  }, [session, confirmMutation]);

  const validRows = parsedRows.filter((r) => !r.skipped && r.errors.length === 0);
  const invalidRows = parsedRows.filter((r) => !r.skipped && r.errors.length > 0);
  const skippedRows = parsedRows.filter((r) => r.skipped);

  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step.key} className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  index < currentStepIndex
                    ? 'bg-indigo-600 text-white'
                    : index === currentStepIndex
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {index < currentStepIndex ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span
                className={`ml-2 text-sm font-medium ${
                  index <= currentStepIndex ? 'text-gray-900' : 'text-gray-500'
                }`}
              >
                {step.label}
              </span>
              {index < STEPS.length - 1 && (
                <div className="mx-4 h-0.5 w-12 bg-gray-200" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center text-red-700">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Step Content */}
      <div className="p-6">
        {currentStep === 'upload' && (
          <UploadStep
            onFileSelect={handleFileSelect}
            isLoading={uploadMutation.isPending}
          />
        )}

        {currentStep === 'mapping' && structure && (
          <MappingStep
            structure={structure}
            mapping={mapping}
            onMappingChange={setMapping}
            onSubmit={handleMappingSubmit}
            onBack={() => setCurrentStep('upload')}
            isLoading={mappingMutation.isPending}
          />
        )}

        {currentStep === 'preview' && (
          <PreviewStep
            parsedRows={parsedRows}
            validCount={validRows.length}
            invalidCount={invalidRows.length}
            skippedCount={skippedRows.length}
            onSkipRow={handleSkipRow}
            onConfirm={handleConfirm}
            onBack={() => setCurrentStep('mapping')}
            isLoading={confirmMutation.isPending || skipRowMutation.isPending}
          />
        )}

        {currentStep === 'complete' && importResult && (
          <CompleteStep
            importedCount={importResult.importedCount}
            skippedCount={importResult.skippedCount}
            onDone={onComplete}
          />
        )}
      </div>

      {/* Cancel Button */}
      {currentStep !== 'complete' && (
        <div className="border-t border-gray-200 px-6 py-4">
          <button
            onClick={onCancel}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel Import
          </button>
        </div>
      )}
    </div>
  );
}

// Step 1: Upload
interface UploadStepProps {
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isLoading: boolean;
}

function UploadStep({ onFileSelect, isLoading }: UploadStepProps) {
  return (
    <div className="text-center py-8">
      <Upload className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-4 text-lg font-medium text-gray-900">Upload CSV File</h3>
      <p className="mt-2 text-sm text-gray-500">
        Select a CSV file containing your expenses to import
      </p>
      <div className="mt-6">
        <label className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer disabled:opacity-50">
          {isLoading ? (
            'Processing...'
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Select File
            </>
          )}
          <input
            type="file"
            accept=".csv"
            onChange={onFileSelect}
            disabled={isLoading}
            className="hidden"
          />
        </label>
      </div>
      <p className="mt-4 text-xs text-gray-400">
        Supported formats: CSV with comma, semicolon, or tab delimiter
      </p>
    </div>
  );
}

// Step 2: Mapping
interface MappingStepProps {
  structure: CsvStructure;
  mapping: ColumnMapping;
  onMappingChange: (mapping: ColumnMapping) => void;
  onSubmit: () => void;
  onBack: () => void;
  isLoading: boolean;
}

function MappingStep({
  structure,
  mapping,
  onMappingChange,
  onSubmit,
  onBack,
  isLoading,
}: MappingStepProps) {
  const fields = [
    { key: 'date' as const, label: 'Date', required: true },
    { key: 'amount' as const, label: 'Amount', required: true },
    { key: 'description' as const, label: 'Description', required: true },
    { key: 'category' as const, label: 'Category', required: false },
  ];

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Map CSV Columns</h3>
      <p className="text-sm text-gray-500 mb-6">
        Match your CSV columns to the expense fields. We've suggested mappings based on your
        column names.
      </p>

      {/* Sample Data Preview */}
      <div className="mb-6 overflow-x-auto">
        <p className="text-sm font-medium text-gray-700 mb-2">Sample Data:</p>
        <table className="min-w-full text-sm border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {structure.headers.map((header) => (
                <th key={header} className="px-3 py-2 text-left font-medium text-gray-700 border-b">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {structure.sampleRows.slice(0, 3).map((row, i) => (
              <tr key={i} className="border-b border-gray-100">
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-2 text-gray-600">
                    {cell || <span className="text-gray-300">empty</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mapping Form */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <select
              value={mapping[field.key] || ''}
              onChange={(e) =>
                onMappingChange({ ...mapping, [field.key]: e.target.value })
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
            >
              <option value="">-- Select Column --</option>
              {structure.headers.map((header) => (
                <option key={header} value={header}>
                  {header}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={isLoading || !mapping.date || !mapping.amount || !mapping.description}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {isLoading ? 'Processing...' : 'Continue'}
          {!isLoading && <ArrowRight className="w-4 h-4 ml-2" />}
        </button>
      </div>
    </div>
  );
}

// Step 3: Preview
interface PreviewStepProps {
  parsedRows: ParsedRow[];
  validCount: number;
  invalidCount: number;
  skippedCount: number;
  onSkipRow: (rowIndex: number, skip: boolean) => void;
  onConfirm: () => void;
  onBack: () => void;
  isLoading: boolean;
}

function PreviewStep({
  parsedRows,
  validCount,
  invalidCount,
  skippedCount,
  onSkipRow,
  onConfirm,
  onBack,
  isLoading,
}: PreviewStepProps) {
  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Preview Import</h3>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{validCount}</div>
          <div className="text-sm text-green-700">Valid Rows</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{invalidCount}</div>
          <div className="text-sm text-red-700">Invalid Rows</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-600">{skippedCount}</div>
          <div className="text-sm text-gray-700">Skipped</div>
        </div>
      </div>

      {/* Rows Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
        <div className="max-h-80 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Description
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Category
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {parsedRows.map((row) => (
                <tr
                  key={row.rowIndex}
                  className={
                    row.skipped
                      ? 'bg-gray-50 text-gray-400'
                      : row.errors.length > 0
                      ? 'bg-red-50'
                      : ''
                  }
                >
                  <td className="px-4 py-2">
                    {row.skipped ? (
                      <span className="inline-flex items-center text-xs text-gray-500">
                        <SkipForward className="w-3 h-3 mr-1" /> Skipped
                      </span>
                    ) : row.errors.length > 0 ? (
                      <span className="inline-flex items-center text-xs text-red-600">
                        <AlertCircle className="w-3 h-3 mr-1" /> Error
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-xs text-green-600">
                        <Check className="w-3 h-3 mr-1" /> Valid
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {row.date || <span className="text-red-500">Missing</span>}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {row.amount != null ? (
                      `$${row.amount.toFixed(2)}`
                    ) : (
                      <span className="text-red-500">Missing</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm max-w-xs truncate">
                    {row.description || <span className="text-red-500">Missing</span>}
                  </td>
                  <td className="px-4 py-2 text-sm">{row.category || 'Other'}</td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => onSkipRow(row.rowIndex, !row.skipped)}
                      disabled={isLoading}
                      className="text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                    >
                      {row.skipped ? 'Include' : 'Skip'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Error Details */}
      {invalidCount > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="text-sm font-medium text-red-800 mb-2">Validation Errors:</h4>
          <ul className="text-sm text-red-700 space-y-1">
            {parsedRows
              .filter((r) => !r.skipped && r.errors.length > 0)
              .slice(0, 5)
              .map((row) => (
                <li key={row.rowIndex}>
                  Row {row.rowIndex + 1}: {row.errors.map((e) => e.message).join(', ')}
                </li>
              ))}
            {invalidCount > 5 && (
              <li className="text-red-600">...and {invalidCount - 5} more errors</li>
            )}
          </ul>
          <p className="mt-2 text-xs text-red-600">
            Skip invalid rows or go back to adjust column mapping.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading || validCount === 0}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {isLoading ? (
            'Importing...'
          ) : (
            <>
              Import {validCount} Expenses
              <Check className="w-4 h-4 ml-2" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Step 4: Complete
interface CompleteStepProps {
  importedCount: number;
  skippedCount: number;
  onDone: () => void;
}

function CompleteStep({ importedCount, skippedCount, onDone }: CompleteStepProps) {
  return (
    <div className="text-center py-8">
      <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-green-100">
        <Check className="w-8 h-8 text-green-600" />
      </div>
      <h3 className="mt-4 text-lg font-medium text-gray-900">Import Complete!</h3>
      <p className="mt-2 text-sm text-gray-500">
        Successfully imported <span className="font-semibold">{importedCount}</span> expenses
        {skippedCount > 0 && (
          <span>
            {' '}
            (<span className="text-gray-400">{skippedCount} skipped</span>)
          </span>
        )}
      </p>
      <div className="mt-6">
        <button
          onClick={onDone}
          className="inline-flex items-center px-6 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
        >
          View Expenses
          <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      </div>
    </div>
  );
}
