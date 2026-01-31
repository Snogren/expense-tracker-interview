import { useState } from 'react';
import { Mail, Sparkles, Check, CheckCircle, SkipForward } from 'lucide-react';
import { useScanEmails } from '../hooks/useReceiptAnalysis';
import { useCreateExpense } from '../hooks/useExpenses';
import { useCategories } from '../hooks/useCategories';
import type { DraftExpense, CreateExpenseData } from '../types';

type Step = 'start' | 'scanning' | 'review' | 'complete';

interface ReviewedExpense extends DraftExpense {
  status: 'pending' | 'accepted' | 'skipped';
  editedData?: CreateExpenseData;
}

export function EmailImport() {
  const [step, setStep] = useState<Step>('start');
  const [draftExpenses, setDraftExpenses] = useState<ReviewedExpense[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);

  const scanEmails = useScanEmails();
  const createExpense = useCreateExpense();
  const { data: categories } = useCategories();

  const currentExpense = draftExpenses[currentIndex];

  const handleStartScan = () => {
    setStep('scanning');
    scanEmails.mutate(undefined, {
      onSuccess: (result) => {
        if (result.draftExpenses.length === 0) {
          setStep('complete');
        } else {
          setDraftExpenses(
            result.draftExpenses.map((e) => ({
              ...e,
              status: 'pending' as const,
              editedData: {
                categoryId: e.categoryId,
                amount: e.amount,
                description: e.description,
                date: e.date,
              },
            }))
          );
          setStep('review');
        }
      },
      onError: () => {
        setStep('start');
      },
    });
  };

  const handleAccept = () => {
    if (!currentExpense?.editedData) return;

    createExpense.mutate(currentExpense.editedData, {
      onSuccess: () => {
        setDraftExpenses((prev) =>
          prev.map((e, i) => (i === currentIndex ? { ...e, status: 'accepted' as const } : e))
        );
        setImportedCount((c) => c + 1);
        moveToNext();
      },
    });
  };

  const handleSkip = () => {
    setDraftExpenses((prev) =>
      prev.map((e, i) => (i === currentIndex ? { ...e, status: 'skipped' as const } : e))
    );
    setSkippedCount((c) => c + 1);
    moveToNext();
  };

  const moveToNext = () => {
    const nextPendingIndex = draftExpenses.findIndex(
      (e, i) => i > currentIndex && e.status === 'pending'
    );

    if (nextPendingIndex !== -1) {
      setCurrentIndex(nextPendingIndex);
    } else {
      // Check if there are any pending before current
      const firstPendingIndex = draftExpenses.findIndex((e) => e.status === 'pending');
      if (firstPendingIndex !== -1 && firstPendingIndex !== currentIndex) {
        setCurrentIndex(firstPendingIndex);
      } else {
        setStep('complete');
      }
    }
  };

  const updateExpenseField = (field: keyof CreateExpenseData, value: string | number) => {
    setDraftExpenses((prev) =>
      prev.map((e, i) =>
        i === currentIndex
          ? { ...e, editedData: { ...e.editedData!, [field]: value } }
          : e
      )
    );
  };

  const handleReset = () => {
    setStep('start');
    setDraftExpenses([]);
    setCurrentIndex(0);
    setImportedCount(0);
    setSkippedCount(0);
    scanEmails.reset();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import from Email</h1>
        <p className="mt-1 text-sm text-gray-500">
          Scan your emails for receipts and order confirmations, then review and import them as expenses.
        </p>
      </div>

      {/* Step: Start */}
      {step === 'start' && (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <Mail className="w-16 h-16 mx-auto text-indigo-500 mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">Scan Your Emails</h2>
          <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
            We'll scan your recent emails to find receipts and order confirmations,
            then use AI to extract expense information.
          </p>
          {scanEmails.isError && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
              Failed to scan emails. Please try again.
            </div>
          )}
          <button
            onClick={handleStartScan}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Start Scanning
          </button>
        </div>
      )}

      {/* Step: Scanning */}
      {step === 'scanning' && (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <div className="animate-pulse">
            <Sparkles className="w-16 h-16 mx-auto text-indigo-500 mb-4" />
          </div>
          <h2 className="text-lg font-medium text-gray-900 mb-2">Scanning Emails...</h2>
          <p className="text-sm text-gray-500">
            Using AI to find and extract receipts from your emails.
          </p>
        </div>
      )}

      {/* Step: Review */}
      {step === 'review' && currentExpense && (
        <div className="space-y-4">
          {/* Progress indicator */}
          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Reviewing expense {currentIndex + 1} of {draftExpenses.length}
              </span>
              <span className="text-sm text-gray-500">
                {importedCount} imported, {skippedCount} skipped
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all"
                style={{
                  width: `${((importedCount + skippedCount) / draftExpenses.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Email info */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-start space-x-3">
              <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">{currentExpense.emailSubject}</p>
                <p className="text-sm text-gray-500">{currentExpense.emailFrom}</p>
              </div>
            </div>
          </div>

          {/* Expense form */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Extracted Expense</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Merchant</label>
                  <p className="mt-1 text-sm text-gray-900 bg-gray-50 rounded-md px-3 py-2">
                    {currentExpense.merchant}
                  </p>
                </div>

                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                    Amount
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      id="amount"
                      step="0.01"
                      value={currentExpense.editedData?.amount || 0}
                      onChange={(e) => updateExpenseField('amount', parseFloat(e.target.value) || 0)}
                      className="block w-full pl-7 pr-3 py-2 rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                    Date
                  </label>
                  <input
                    type="date"
                    id="date"
                    value={currentExpense.editedData?.date || ''}
                    onChange={(e) => updateExpenseField('date', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2"
                  />
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <select
                    id="category"
                    value={currentExpense.editedData?.categoryId || ''}
                    onChange={(e) => updateExpenseField('categoryId', parseInt(e.target.value))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2"
                  >
                    {categories?.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <input
                  type="text"
                  id="description"
                  value={currentExpense.editedData?.description || ''}
                  onChange={(e) => updateExpenseField('description', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border px-3 py-2"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-6 flex justify-between">
              <button
                onClick={handleSkip}
                disabled={createExpense.isPending}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <SkipForward className="w-4 h-4 mr-2" />
                Skip
              </button>
              <button
                onClick={handleAccept}
                disabled={createExpense.isPending}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                {createExpense.isPending ? (
                  'Importing...'
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Accept & Import
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step: Complete */}
      {step === 'complete' && (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-lg font-medium text-gray-900 mb-2">Import Complete!</h2>
          {draftExpenses.length === 0 ? (
            <p className="text-sm text-gray-500 mb-6">
              No receipts were found in your emails.
            </p>
          ) : (
            <p className="text-sm text-gray-500 mb-6">
              {importedCount} expense{importedCount !== 1 ? 's' : ''} imported,
              {' '}{skippedCount} skipped.
            </p>
          )}
          <button
            onClick={handleReset}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Scan Again
          </button>
        </div>
      )}
    </div>
  );
}
